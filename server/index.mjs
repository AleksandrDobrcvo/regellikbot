import express from 'express'
import { WebSocketServer } from 'ws'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { createServer } from 'http'
import crypto from 'crypto'
import { MongoClient } from 'mongodb'
import nodemailer from 'nodemailer'

const __dirname = dirname(fileURLToPath(import.meta.url))
const statePath = join(__dirname, 'state', 'app-state.json')
const distPath = join(__dirname, '..', 'dist')
const indexHtmlPath = join(distPath, 'index.html')
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
const ADMIN_TELEGRAM_IDS = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(e => e.trim()).filter(Boolean)
const TELEGRAM_AUTH_STRICT = process.env.TELEGRAM_AUTH_STRICT === 'true'
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*'
const MONGODB_URI = process.env.MONGODB_URI || ''
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'regellik'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
const MAX_SESSIONS_PER_USER = 5
const ALLOWED_EMAIL_DOMAINS = ['gmail.com','mail.ru','yandex.ru','yahoo.com','outlook.com','hotmail.com','icloud.com','protonmail.com','mail.com','inbox.ru','bk.ru','list.ru','ya.ru','rambler.ru','ukr.net','i.ua','wp.pl','o2.pl','onet.pl','interia.pl','tut.by','zoho.com','aol.com','live.com']

// SMTP settings for email verification codes
const SMTP_HOST = process.env.SMTP_HOST || ''
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10)
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER

// In-memory store for verification codes: email -> { code, expiresAt, attempts, name, mode }
const emailVerificationCodes = new Map()

// Cleanup expired codes every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of emailVerificationCodes) {
    if (now > entry.expiresAt) emailVerificationCodes.delete(key)
  }
}, 5 * 60 * 1000)

function createEmailTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,         // true для 465 (SSL), false для 587 (STARTTLS)
    requireTLS: SMTP_PORT === 587,     // принудительный STARTTLS для Gmail/587
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { rejectUnauthorized: true }, // проверяем сертификат (безопасность)
  })
}

async function sendVerificationEmail(toEmail, code) {
  const transporter = createEmailTransporter()
  if (!transporter) {
    // Dev mode: log code to console
    console.log(`[DEV] Verification code for ${toEmail}: ${code}`)
    return
  }
  await transporter.sendMail({
    from: `"Regellik" <${SMTP_FROM}>`,
    to: toEmail,
    subject: `${code} — код подтверждения Regellik`,
    text: `Твой код подтверждения: ${code}\n\nКод действует 10 минут. Не передавай его никому.\n\n— Команда Regellik`,
    html: `<div style="font-family:monospace;background:#0a0a0a;color:#f0f0f0;padding:32px;border-radius:12px;max-width:480px">
      <h2 style="margin:0 0 24px;color:#fff;font-size:20px">&gt;] Regellik</h2>
      <p style="color:#999;margin:0 0 16px">Твой код подтверждения:</p>
      <div style="font-size:42px;font-weight:800;letter-spacing:12px;color:#fff;margin:0 0 24px;padding:20px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:8px;text-align:center">${code}</div>
      <p style="color:#666;font-size:13px;margin:0">Код действует 10 минут. Не передавай его никому.</p>
    </div>`,
  })
}

// MongoDB state – set after connectMongo()
let mongoCol = null

// --- Haversine distance (meters) ---
const _toRad = (deg) => (deg * Math.PI) / 180
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const dLat = _toRad(lat2 - lat1)
  const dLon = _toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(_toRad(lat1)) * Math.cos(_toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const MAX_VISIBLE_DISTANCE = 50000 // 50 km

function isWithinRange(viewer, other) {
  if (!Number.isFinite(viewer?.latitude) || !Number.isFinite(viewer?.longitude)) return true // no geo = show all
  if (!Number.isFinite(other?.latitude) || !Number.isFinite(other?.longitude)) return false // other has no geo = hide
  return haversineDistance(viewer.latitude, viewer.longitude, other.latitude, other.longitude) <= MAX_VISIBLE_DISTANCE
}

// --- Simple in-memory rate limiter ---
const rateLimitStore = new Map()
function rateLimit(key, maxAttempts = 8, windowMs = 60000) {
  const now = Date.now()
  let entry = rateLimitStore.get(key)
  if (!entry || now - entry.start > windowMs) {
    entry = { count: 1, start: now }
    rateLimitStore.set(key, entry)
    return true
  }
  entry.count += 1
  if (entry.count > maxAttempts) {
    return false
  }
  return true
}
// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore) {
    if (now - entry.start > 120000) rateLimitStore.delete(key)
  }
}, 120000)

const defaultPreferences = {
  showCity: true,
  allowInbox: true,
  neonProfile: true,
  emailAlerts: false,
  telegramAutoAuth: true,
}

const defaultSiteSettings = {
  telegramAuthEnabled: true,
  emailAuthEnabled: true,
  geoRequiredForSend: true,
  registrationsOpen: true,
  maintenanceMode: false,
  onlineCounterVisible: true,
  publicFeedVisible: true,
  inboxEnabled: true,
  devBadgeVisible: true,
  profileEditEnabled: true,
  // Economy settings
  messageCost: 0.1,          // ⚡ cost per sent message
  messageEarn: 0.05,         // ⚡ earned when receiving a message
  topUpOptions: [10, 50, 100, 250, 500, 1000], // predefined top-up amounts
}

const MAX_POST_IMAGE_SIZE = 768 * 1024

const knownCoordinates = {
  'Алматы|Казахстан': { latitude: 43.238949, longitude: 76.889709 },
  'Ташкент|Узбекистан': { latitude: 41.299496, longitude: 69.240074 },
  'Казань|Россия': { latitude: 55.796127, longitude: 49.106414 },
  'Самарканд|Узбекистан': { latitude: 39.654167, longitude: 66.959724 },
  'Бельско-Бяла|Польша': { latitude: 49.822376, longitude: 19.058384 },
}

function getKnownCoordinates(city, country) {
  const key = `${String(city || '').trim()}|${String(country || '').trim()}`
  return knownCoordinates[key] || null
}

function applyCoordinates(target, cityKey = 'city', countryKey = 'country', latitudeKey = 'latitude', longitudeKey = 'longitude') {
  const latitude = Number(target[latitudeKey])
  const longitude = Number(target[longitudeKey])

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    target[latitudeKey] = latitude
    target[longitudeKey] = longitude
    return target
  }

  const fallback = getKnownCoordinates(target[cityKey], target[countryKey])
  target[latitudeKey] = fallback?.latitude ?? null
  target[longitudeKey] = fallback?.longitude ?? null
  return target
}

function generateNumericId(state) {
  const maxId = state.users.reduce((max, u) => {
    const num = Number(u.numericId) || 0
    return num > max ? num : max
  }, 0)
  return maxId + 1
}

function generateReferralCode() {
  return crypto.randomBytes(4).toString('hex')
}

function createSeedUser(data) {
  return applyCoordinates({
    role: 'user',
    status: 'active',
    isVisible: true,
    bio: 'Профиль активен.',
    tagline: 'на связи',
    badges: [],
    preferences: { ...defaultPreferences },
    powers: 0,
    powerLog: [],
    stats: { sent: 0, received: 0, opened: 0, referrals: 0 },
    joinedAt: new Date().toISOString(),
    telegramMeta: null,
    ban: null, // { type: 'global'|'chat', reason: string, until: ISO|null, createdAt: ISO, adminId: string }
    passwordHash: null,
    passwordSalt: null,
    latitude: null,
    longitude: null,
    numericId: null,
    referralCode: generateReferralCode(),
    referredBy: null,
    telegramId: null,
    ...data,
  })
}

const defaultState = {
  siteSettings: { ...defaultSiteSettings },
  conversations: [],
  chatMessages: [],
  users: [
    createSeedUser({
      id: 'seed-regellik',
      numericId: 1,
      provider: 'telegram',
      providerId: '1001',
      name: 'Regellik',
      handle: '@regellik',
      avatarUrl: null,
      email: null,
      city: 'Алматы',
      country: 'Казахстан',
      geoAllowed: true,
      role: 'admin',
      bio: 'Главный профиль проекта. Следит за системой, балансом и настройками.',
      tagline: 'owner mode',
      badges: ['ADMIN', 'CORE'],
      preferences: { ...defaultPreferences, emailAlerts: true },
      powers: 3400,
      stats: { sent: 18, received: 41, opened: 3, referrals: 9 },
      telegramId: '1001',
      telegramMeta: { username: 'regellik', isLinked: true },
    }),
    createSeedUser({
      id: 'seed-mila',
      numericId: 2,
      provider: 'email',
      providerId: 'mila@example.com',
      name: 'Mila',
      handle: '@mila',
      avatarUrl: null,
      email: 'mila@example.com',
      city: 'Ташкент',
      country: 'Узбекистан',
      geoAllowed: true,
      bio: 'Любит живой диалог без пустого шума.',
      tagline: 'тонкий флирт',
      badges: ['TOP'],
      powers: 620,
      stats: { sent: 12, received: 29, opened: 5, referrals: 4 },
    }),
    createSeedUser({
      id: 'seed-sara',
      numericId: 3,
      provider: 'email',
      providerId: 'sara@example.com',
      name: 'Sara',
      handle: '@sara',
      avatarUrl: null,
      email: 'sara@example.com',
      city: 'Казань',
      country: 'Россия',
      geoAllowed: true,
      bio: 'Сначала наблюдает, потом отвечает.',
      tagline: 'city signals',
      badges: ['LIVE'],
      powers: 480,
      stats: { sent: 14, received: 33, opened: 4, referrals: 6 },
    }),
  ],
  sessions: [],
  publicMessages: [
    {
      id: 'pub-1',
      authorId: 'seed-mila',
      authorName: 'Mila',
      authorHandle: '@mila',
      city: 'Ташкент',
      country: 'Узбекистан',
      text: 'Профили уже готовы, можно писать анонимки.',
      createdAt: new Date(Date.now() - 18 * 60000).toISOString(),
    },
    {
      id: 'pub-2',
      authorId: 'seed-sara',
      authorName: 'Sara',
      authorHandle: '@sara',
      city: 'Казань',
      country: 'Россия',
      text: 'В ленте видно только имя и город, остальное скрыто.',
      createdAt: new Date(Date.now() - 42 * 60000).toISOString(),
    },
  ],
  inboxMessages: [
    {
      id: 'inbox-1',
      recipientId: 'seed-regellik',
      senderLabel: '>]Regellik',
      senderHandle: '@regellik',
      senderCity: 'Самарканд',
      senderCountry: 'Узбекистан',
      text: 'Система сообщений уже активна.',
      createdAt: new Date(Date.now() - 32 * 60000).toISOString(),
    },
  ],
  auditLog: [
    {
      id: crypto.randomUUID(),
      action: 'system.seeded',
      actorId: 'seed-regellik',
      targetId: null,
      details: 'Инициализировано стартовое состояние проекта.',
      createdAt: new Date().toISOString(),
    },
  ],
  posts: [
    {
      id: 'post-seed-1',
      authorId: 'seed-mila',
      authorName: 'Mila',
      authorHandle: '@mila',
      authorAvatarUrl: null,
      text: 'Привет, Regellik! Это первая запись в ленте — делитесь мыслями и получайте энергию ⚡',
      imageUrl: null,
      imageUrls: [],
      createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      boosts: 7,
      boostedBy: [],
      comments: [],
    },
    {
      id: 'post-seed-2',
      authorId: 'seed-sara',
      authorName: 'Sara',
      authorHandle: '@sara',
      authorAvatarUrl: null,
      text: 'Пишите публично — за каждый буст вы получаете энергию. Чем полезнее пост, тем больше наград.',
      imageUrl: null,
      imageUrls: [],
      createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
      boosts: 3,
      boostedBy: [],
      comments: [
        {
          id: 'cmt-seed-1',
          authorId: 'seed-mila',
          authorName: 'Mila',
          authorHandle: '@mila',
          text: 'Отлично! Буду следить за лентой.',
          createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
        },
      ],
    },
  ],
  follows: [],
  reports: [],
}

// --- In-memory state cache (loaded from MongoDB or file on start) ---
let cachedState = null

async function connectMongo() {
  if (!MONGODB_URI) return
  // Retry up to 3 times
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const client = new MongoClient(MONGODB_URI, {
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
        socketTimeoutMS: 30000,
        retryWrites: true,
        retryReads: true,
      })
      await client.connect()
      // Verify connection with a ping
      await client.db('admin').command({ ping: 1 })
      const db = client.db(MONGODB_DB_NAME)
      mongoCol = db.collection('appstate')
      console.log(`MongoDB connected (attempt ${attempt})`)
      return
    } catch (err) {
      console.error(`MongoDB connection attempt ${attempt}/3 failed:`, err.message)
      if (attempt < 3) {
        // Wait before retry: 2s, 4s
        await new Promise(resolve => setTimeout(resolve, attempt * 2000))
      }
    }
  }
  console.error('MongoDB connection failed after 3 attempts, falling back to file')
  mongoCol = null
}

function ensureStateFile() {
  if (!existsSync(statePath)) {
    mkdirSync(dirname(statePath), { recursive: true })
    writeFileSync(statePath, JSON.stringify(defaultState, null, 2), 'utf8')
  }
}

function normalizeState(state) {
  state.siteSettings = { ...defaultSiteSettings, ...(state.siteSettings || {}) }
  state.auditLog = Array.isArray(state.auditLog) ? state.auditLog : []
  state.users = Array.isArray(state.users)
    ? state.users.map((user) => {
        const nextUser = {
          ...createSeedUser({}),
          ...user,
          preferences: { ...defaultPreferences, ...(user.preferences || {}) },
          badges: Array.isArray(user.badges) ? user.badges : [],
          powerLog: Array.isArray(user.powerLog) ? user.powerLog.slice(0, 120) : [],
        }

        if (nextUser.id === 'seed-regellik' && !user.role) {
          nextUser.role = 'admin'
          nextUser.badges = nextUser.badges.length ? nextUser.badges : ['ADMIN', 'CORE']
          nextUser.bio = user.bio || 'Главный профиль проекта. Следит за системой, балансом и настройками.'
          nextUser.tagline = user.tagline || 'owner mode'
        }

        if (!nextUser.numericId) {
          const maxId = state.users.reduce((max, u) => Math.max(max, Number(u.numericId) || 0), 0)
          nextUser.numericId = maxId + 1
        }

        if (!nextUser.referralCode) {
          nextUser.referralCode = generateReferralCode()
        }

        if (ADMIN_EMAILS.length && nextUser.email && ADMIN_EMAILS.includes(nextUser.email.toLowerCase())) {
          nextUser.role = 'admin'
          if (!nextUser.badges.includes('ADMIN')) nextUser.badges.unshift('ADMIN')
        }
        if (ADMIN_TELEGRAM_IDS.length && nextUser.telegramId && ADMIN_TELEGRAM_IDS.includes(String(nextUser.telegramId))) {
          nextUser.role = 'admin'
          if (!nextUser.badges.includes('ADMIN')) nextUser.badges.unshift('ADMIN')
        }

        return applyCoordinates(nextUser)
      })
    : []
  state.publicMessages = Array.isArray(state.publicMessages)
    ? state.publicMessages.map((item) => applyCoordinates({ ...item }))
    : []
  state.inboxMessages = Array.isArray(state.inboxMessages)
    ? state.inboxMessages.map((item) => applyCoordinates({ ...item }, 'senderCity', 'senderCountry', 'senderLatitude', 'senderLongitude'))
    : []
  state.conversations = Array.isArray(state.conversations) ? state.conversations : []
  state.chatMessages = Array.isArray(state.chatMessages) ? state.chatMessages : []
  state.sessions = Array.isArray(state.sessions) ? state.sessions : []
  state.follows = Array.isArray(state.follows) ? state.follows : []
  state.reports = Array.isArray(state.reports) ? state.reports : []
  state.posts = Array.isArray(state.posts) ? state.posts.map(p => ({
    ...p,
    imageUrl: typeof p.imageUrl === 'string' ? p.imageUrl : null,
    imageUrls: normalizePostImages(p),
    boostedBy: Array.isArray(p.boostedBy) ? p.boostedBy : [],
    comments: Array.isArray(p.comments) ? p.comments : [],
  })) : []
  return state
}

async function loadStateFromMongo() {
  if (!mongoCol) return null
  try {
    const doc = await mongoCol.findOne({ _id: 'state' })
    if (doc) {
      delete doc._id
      return doc
    }
  } catch (err) {
    console.error('MongoDB read error:', err.message)
  }
  return null
}

async function saveStateToMongo(state) {
  if (!mongoCol) return
  try {
    const doc = { ...state, _id: 'state' }
    await mongoCol.replaceOne({ _id: 'state' }, doc, { upsert: true })
  } catch (err) {
    console.error('MongoDB write error:', err.message)
  }
}

async function initState() {
  // Try MongoDB first
  const mongoState = await loadStateFromMongo()
  if (mongoState) {
    cachedState = normalizeState(mongoState)
    console.log('State loaded from MongoDB')
    return
  }

  // Fall back to file
  ensureStateFile()
  const raw = JSON.parse(readFileSync(statePath, 'utf8'))
  cachedState = normalizeState(raw)

  // If mongo is available, seed it with the file state
  if (mongoCol) {
    await saveStateToMongo(cachedState)
    console.log('State seeded to MongoDB from file')
  }
}

function readState() {
  if (!cachedState) {
    // Fallback: sync read from file (only before initState completes)
    ensureStateFile()
    cachedState = normalizeState(JSON.parse(readFileSync(statePath, 'utf8')))
  }
  return cachedState
}

function saveState(state) {
  cachedState = state
  // Always write to file as local backup
  try {
    writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8')
  } catch { /* ignore file write errors on ephemeral disk */ }
  // Write to MongoDB async (fire-and-forget)
  if (mongoCol) {
    saveStateToMongo(state).catch(err => console.error('MongoDB save error:', err.message))
  }
}

function createToken() {
  return crypto.randomUUID()
}

function createWelcomeConversation(state, userId) {
  const regellikId = 'seed-regellik'
  const convoId = createToken()
  state.conversations.push({
    id: convoId,
    participants: [regellikId, userId],
    isSystem: true,
    createdAt: new Date().toISOString(),
  })
  state.chatMessages.push({
    id: createToken(),
    conversationId: convoId,
    senderId: regellikId,
    text: 'Добро пожаловать в Regellik! 👋\n\nЗдесь ты можешь отправлять анонимные сообщения, общаться с людьми рядом и зарабатывать бонусы за рефералов.\n\nЕсли есть вопросы — пиши сюда, мы ответим.',
    createdAt: new Date().toISOString(),
  })
  return convoId
}

function getConversationsForUser(state, userId) {
  return state.conversations
    .filter(c => c.participants.includes(userId) && !(Array.isArray(c.hiddenBy) && c.hiddenBy.includes(userId)))
    .map(c => {
      const messages = state.chatMessages
        .filter(m => m.conversationId === c.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      const lastMsg = messages[0] || null
      const otherId = c.participants.find(p => p !== userId)
      const otherUser = state.users.find(u => u.id === otherId)
      const unread = messages.filter(m => m.senderId !== userId && !m.readAt).length
      return {
        id: c.id,
        isSystem: c.isSystem || false,
        createdAt: c.createdAt,
        lastMessage: lastMsg ? { text: lastMsg.text, senderId: lastMsg.senderId, createdAt: lastMsg.createdAt } : null,
        unreadCount: unread,
        otherUser: otherUser ? { id: otherUser.id, name: otherUser.name, handle: otherUser.handle, avatarUrl: otherUser.avatarUrl } : null,
      }
    })
    .sort((a, b) => {
      const aTime = a.lastMessage?.createdAt || a.createdAt
      const bTime = b.lastMessage?.createdAt || b.createdAt
      return bTime.localeCompare(aTime)
    })
}

function createPasswordHash(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return { salt, hash }
}

function verifyPassword(password, salt, expectedHash) {
  if (!password || !salt || !expectedHash) {
    return false
  }

  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'))
}

function validateTelegramInitData(initData) {
  if (!initData || !TELEGRAM_BOT_TOKEN) {
    return false
  }

  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) {
    return false
  }

  const pairs = []
  for (const [key, value] of params.entries()) {
    if (key !== 'hash') {
      pairs.push(`${key}=${value}`)
    }
  }

  pairs.sort()
  const dataCheckString = pairs.join('\n')
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(TELEGRAM_BOT_TOKEN).digest()
  const computed = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')
  return computed === hash
}

function validateTelegramWidgetData(data) {
  if (!data || !TELEGRAM_BOT_TOKEN) {
    return false
  }

  const hash = data.hash
  if (!hash) {
    return false
  }

  const authDate = Number(data.auth_date)
  if (!authDate || (Date.now() / 1000 - authDate) > 86400) {
    return false
  }

  const pairs = Object.keys(data)
    .filter((key) => key !== 'hash')
    .sort()
    .map((key) => `${key}=${data[key]}`)

  const dataCheckString = pairs.join('\n')
  const secretKey = crypto.createHash('sha256').update(TELEGRAM_BOT_TOKEN).digest()
  const computed = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')
  return computed === hash
}

function normalizeHandle(value, fallback = 'regellik') {
  const base = String(value || fallback)
    .toLowerCase()
    .replace(/[^a-zа-яё0-9_]+/gi, '')
    .slice(0, 18)

  return `@${base || fallback}`
}

function ensureUniqueHandle(state, desiredHandle, currentUserId = null) {
  const normalized = normalizeHandle(desiredHandle)
  let candidate = normalized
  let index = 1

  while (state.users.some((item) => item.handle === candidate && item.id !== currentUserId)) {
    candidate = `${normalized}${index}`
    index += 1
  }

  return candidate
}

function pushPowerLog(user, type, delta, description, meta) {
  if (!Array.isArray(user.powerLog)) user.powerLog = []
  user.powerLog.unshift({
    id: createToken(),
    type,
    delta: Math.round(delta * 100) / 100,
    description,
    meta: meta || null,
    balanceAfter: Math.round((user.powers) * 100) / 100,
    createdAt: new Date().toISOString(),
  })
  user.powerLog = user.powerLog.slice(0, 120)
}

function pushAudit(state, action, actorId, targetId, details) {
  state.auditLog.unshift({
    id: createToken(),
    action,
    actorId,
    targetId,
    details,
    createdAt: new Date().toISOString(),
  })
  state.auditLog = state.auditLog.slice(0, 60)
}

function validateImageDataUrl(image, maxBytes = MAX_POST_IMAGE_SIZE) {
  if (!image) return null
  if (typeof image !== 'string') {
    return 'Некорректное изображение'
  }
  if (!/^data:image\/(png|jpeg|webp|gif);base64,/.test(image)) {
    return 'Допускается PNG, JPEG, WebP или GIF'
  }
  const base64Part = image.slice(image.indexOf(',') + 1)
  const sizeBytes = Math.ceil(base64Part.length * 3 / 4)
  if (sizeBytes > maxBytes) {
    return `Изображение слишком большое (макс. ${Math.round(maxBytes / 1024)} КБ)`
  }
  return null
}

function normalizePostImages(post) {
  if (Array.isArray(post.imageUrls)) {
    return post.imageUrls.filter((item) => typeof item === 'string')
  }
  if (typeof post.imageUrl === 'string' && post.imageUrl) {
    return [post.imageUrl]
  }
  return []
}

function validateImageList(images, maxImages = 6) {
  if (!images) return { error: null, imageUrls: [] }
  if (!Array.isArray(images)) {
    const error = validateImageDataUrl(images, MAX_POST_IMAGE_SIZE)
    return { error, imageUrls: images ? [images] : [] }
  }
  if (images.length > maxImages) {
    return { error: `Максимум ${maxImages} фото в одной публикации`, imageUrls: [] }
  }
  for (const image of images) {
    const error = validateImageDataUrl(image, MAX_POST_IMAGE_SIZE)
    if (error) {
      return { error, imageUrls: [] }
    }
  }
  return { error: null, imageUrls: images }
}

function getFollowCounts(state, userId) {
  let followerCount = 0
  let followingCount = 0
  for (const item of state.follows) {
    if (item.followingId === userId) followerCount += 1
    if (item.followerId === userId) followingCount += 1
  }
  return {
    followerCount,
    followingCount,
    postCount: state.posts.filter(post => post.authorId === userId).length,
  }
}

function isFollowingUser(state, followerId, followingId) {
  return state.follows.some(item => item.followerId === followerId && item.followingId === followingId)
}

function decoratePost(state, post, viewer) {
  const author = state.users.find(u => u.id === post.authorId)
  const imageUrls = normalizePostImages(post)
  return {
    ...post,
    imageUrl: imageUrls[0] || null,
    imageUrls,
    authorBadges: author ? (author.badges || []) : [],
    boostedByViewer: viewer ? post.boostedBy.includes(viewer.id) : false,
    commentsCount: Array.isArray(post.comments) ? post.comments.length : 0,
  }
}

function getUserPosts(state, userId, viewer) {
  return state.posts
    .filter(post => post.authorId === userId)
    .map(post => decoratePost(state, post, viewer))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
}

function notifyAdminsAboutReport(state, report, reporter, target) {
  const admins = state.users.filter(user => user.role === 'admin' && user.id !== reporter.id)
  for (const admin of admins) {
    sendSystemNotification(
      state,
      admin.id,
      `Новая жалоба на ${target.name} (${target.handle}). Категория: ${report.category}. От: ${reporter.name}.`
    )
  }
}

/** Send a system notification to a user via the Regellik system chat */
function sendSystemNotification(state, userId, text) {
  const regellikId = 'seed-regellik'
  if (userId === regellikId) return
  let convo = state.conversations.find(c =>
    c.isSystem && c.participants.includes(regellikId) && c.participants.includes(userId)
  )
  if (!convo) {
    convo = { id: createToken(), participants: [regellikId, userId], isSystem: true, createdAt: new Date().toISOString() }
    state.conversations.push(convo)
  }
  const msg = {
    id: createToken(),
    conversationId: convo.id,
    senderId: regellikId,
    text,
    createdAt: new Date().toISOString(),
  }
  state.chatMessages.push(msg)
  sendToUser(userId, {
    type: 'new_message',
    conversationId: convo.id,
    message: { id: msg.id, text: msg.text, senderId: regellikId, senderName: 'Regellik', createdAt: msg.createdAt },
    conversations: getConversationsForUser(state, userId),
  })
}

function publicUser(user, state = readState()) {
  const social = getFollowCounts(state, user.id)
  return {
    id: user.id,
    numericId: user.numericId,
    name: user.name,
    handle: user.handle,
    provider: user.provider,
    avatarUrl: user.avatarUrl,
    email: user.email,
    city: user.city,
    country: user.country,
    latitude: user.latitude,
    longitude: user.longitude,
    geoAllowed: user.geoAllowed,
    powers: user.powers,
    role: user.role,
    status: user.status,
    bio: user.bio,
    tagline: user.tagline,
    badges: user.badges,
    joinedAt: user.joinedAt,
    telegramLinked: Boolean(user.telegramMeta?.isLinked),
    telegramId: user.telegramId || null,
    preferences: user.preferences,
    stats: user.stats,
    referralCode: user.referralCode,
    referredBy: user.referredBy,
    ban: user.ban || null,
    powerLog: Array.isArray(user.powerLog) ? user.powerLog.slice(0, 50) : [],
    profileViews: user.profileViews || 0,
    followerCount: social.followerCount,
    followingCount: social.followingCount,
    postCount: social.postCount,
  }
}

function publicUserForAdmin(user, state = readState()) {
  return {
    ...publicUser(user, state),
    providerId: user.providerId,
    isVisible: user.isVisible,
    ban: user.ban || null,
  }
}

function directoryItem(user) {
  return {
    id: user.id,
    name: user.name,
    handle: user.handle,
    avatarUrl: user.avatarUrl,
    city: user.city || 'Город',
    country: user.country || 'Локация',
    latitude: user.latitude,
    longitude: user.longitude,
    tagline: user.tagline,
    badges: user.badges,
    role: user.role,
    status: user.status,
    stats: {
      received: user.stats.received,
      replyRate: Math.min(100, 36 + user.stats.received),
      streak: 2 + user.stats.referrals,
    },
  }
}

function adminUserItem(user, state = readState()) {
  return publicUserForAdmin(user, state)
}

function resolveSession(state, token) {
  const session = state.sessions.find((item) => item.token === token)
  if (!session) {
    return null
  }

  // Check session TTL
  if (session.createdAt) {
    const age = Date.now() - new Date(session.createdAt).getTime()
    if (age > SESSION_TTL_MS) {
      state.sessions = state.sessions.filter((item) => item.token !== token)
      return null
    }
    // Auto-extend session on each use (rolling window)
    if (age > 24 * 60 * 60 * 1000) {
      session.createdAt = new Date().toISOString()
    }
  }

  return state.users.find((item) => item.id === session.userId) || null
}

function createSessionForUser(state, userId, userAgent = '') {
  const token = createToken()
  // Remove expired sessions for this user, keep up to MAX_SESSIONS_PER_USER - 1
  const now = Date.now()
  const userSessions = state.sessions
    .filter(s => s.userId === userId)
    .filter(s => !s.createdAt || (now - new Date(s.createdAt).getTime()) < SESSION_TTL_MS)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))

  const keepTokens = new Set(userSessions.slice(0, MAX_SESSIONS_PER_USER - 1).map(s => s.token))
  state.sessions = state.sessions.filter(s => s.userId !== userId || keepTokens.has(s.token))
  state.sessions.push({ token, userId, createdAt: new Date().toISOString(), userAgent: String(userAgent || '').slice(0, 300) })
  return token
}

function adminData(state) {
  return {
    users: [...state.users].map((user) => adminUserItem(user, state)).sort((left, right) => right.joinedAt.localeCompare(left.joinedAt)),
    auditLog: state.auditLog.slice(0, 18),
    reports: [...state.reports]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 50)
      .map((report) => ({
        ...report,
        relatedPosts: getUserPosts(state, report.targetUserId, null).slice(0, 3),
      })),
  }
}

function bootstrapPayload(state, viewer) {
  const visibleUsers = state.users.filter((item) => item.isVisible && item.status === 'active')

  // Filter directory by 50km distance (if viewer has geo)
  const nearbyUsers = viewer
    ? visibleUsers.filter((u) => u.id === viewer.id || isWithinRange(viewer, u))
    : visibleUsers

  return {
    viewer: viewer ? publicUser(viewer, state) : null,
    siteSettings: state.siteSettings,
    publicFeed: state.siteSettings.publicFeedVisible
      ? [...state.publicMessages].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 14)
      : [],
    inbox: viewer && state.siteSettings.inboxEnabled
      ? state.inboxMessages
          .filter((item) => item.recipientId === viewer.id)
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
          .slice(0, 12)
      : [],
    directory: nearbyUsers.map(directoryItem),
    conversations: viewer ? getConversationsForUser(state, viewer.id) : [],
    adminData: viewer?.role === 'admin' ? adminData(state) : null,
    posts: state.posts
      .map(p => decoratePost(state, p, viewer))
      .sort((a, b) => b.boosts - a.boosts || b.createdAt.localeCompare(a.createdAt))
      .slice(0, 30),
  }
}

function getBearerToken(request) {
  return String(request.headers.authorization || '').replace('Bearer ', '')
}

function requireUser(request, response, state) {
  const viewer = resolveSession(state, getBearerToken(request))
  if (!viewer) {
    response.status(401).json({ error: 'Сессия не найдена' })
    return null
  }

  if (viewer.status !== 'active') {
    response.status(403).json({ error: 'Аккаунт отключён администратором' })
    return null
  }

  // Check global ban
  if (viewer.ban) {
    if (viewer.ban.until && new Date(viewer.ban.until) < new Date()) {
      viewer.ban = null // expired
      saveState(state)
    } else if (viewer.ban.type === 'global') {
      const msg = viewer.ban.until
        ? `Вы заблокированы до ${new Date(viewer.ban.until).toLocaleString('ru')}. Причина: ${viewer.ban.reason || 'не указана'}`
        : `Вы заблокированы навсегда. Причина: ${viewer.ban.reason || 'не указана'}`
      response.status(403).json({ error: msg })
      return null
    }
  }

  return viewer
}

function requireAdmin(request, response, state) {
  const viewer = requireUser(request, response, state)
  if (!viewer) {
    return null
  }

  if (viewer.role !== 'admin') {
    response.status(403).json({ error: 'Нужны права администратора' })
    return null
  }

  return viewer
}

function canSignIn(state, existingUser) {
  if (existingUser?.role === 'admin') {
    return true
  }

  if (state.siteSettings.maintenanceMode) {
    return false
  }

  if (existingUser) {
    return existingUser.status === 'active'
  }

  return state.siteSettings.registrationsOpen
}

const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

app.use((request, response, next) => {
  const requestOrigin = request.headers.origin

  if (CORS_ORIGIN === '*') {
    response.setHeader('Access-Control-Allow-Origin', requestOrigin || '*')
  } else if (requestOrigin) {
    const allowedOrigins = CORS_ORIGIN.split(',').map((item) => item.trim())
    if (allowedOrigins.includes(requestOrigin)) {
      response.setHeader('Access-Control-Allow-Origin', requestOrigin)
    }
  }

  response.setHeader('Vary', 'Origin')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')

  if (request.method === 'OPTIONS') {
    response.status(204).end()
    return
  }

  next()
})

app.use(express.json({ limit: '512kb' }))

app.get('/api/health', (_request, response) => {
  response.json({ ok: true })
})

app.get('/api/bootstrap', (request, response) => {
  const state = readState()
  const token = String(request.query.token || '')
  const viewer = token ? resolveSession(state, token) : null
  response.json(bootstrapPayload(state, viewer))
})

app.post('/api/auth/send-code', async (request, response) => {
  const clientIp = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.socket.remoteAddress || 'unknown'
  if (!rateLimit(`sendcode:${clientIp}`, 5, 60000)) {
    response.status(429).json({ error: 'Слишком много запросов. Подожди минуту.' })
    return
  }

  const state = readState()
  const { email, name, mode } = request.body || {}

  if (!state.siteSettings.emailAuthEnabled) {
    response.status(403).json({ error: 'Вход по email отключён' })
    return
  }

  if (!email) {
    response.status(400).json({ error: 'Email обязателен' })
    return
  }

  const emailNorm = String(email).trim().toLowerCase()

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
    response.status(400).json({ error: 'Некорректный формат email' })
    return
  }

  const emailDomain = emailNorm.split('@')[1]
  if (!ALLOWED_EMAIL_DOMAINS.includes(emailDomain)) {
    response.status(400).json({ error: `Домен @${emailDomain} не поддерживается. Используй Gmail, Mail.ru, Yandex, Outlook и т.д.` })
    return
  }

  if (mode === 'register') {
    if (!state.siteSettings.registrationsOpen) {
      response.status(403).json({ error: 'Регистрация временно закрыта' })
      return
    }
    if (!name || !String(name).trim()) {
      response.status(400).json({ error: 'Укажи имя для регистрации' })
      return
    }
    const existing = state.users.find(u => u.email?.toLowerCase() === emailNorm)
    if (existing) {
      response.status(409).json({ error: 'Аккаунт с этой почтой уже существует. Войди через вход.' })
      return
    }
  } else {
    const existing = state.users.find(u => u.email?.toLowerCase() === emailNorm)
    if (!existing) {
      response.status(404).json({ error: 'Аккаунт не найден. Зарегистрируйся.' })
      return
    }
    if (!canSignIn(state, existing)) {
      response.status(403).json({ error: 'Вход ограничен настройками сайта' })
      return
    }
  }

  // Rate-limit per email: max 3 codes in 10 minutes
  const existingEntry = emailVerificationCodes.get(emailNorm)
  if (existingEntry && Date.now() < existingEntry.expiresAt && existingEntry.sendCount >= 3) {
    response.status(429).json({ error: 'Слишком много кодов отправлено. Подожди 10 минут.' })
    return
  }

  const code = String(Math.floor(100000 + Math.random() * 900000))
  const sendCount = (existingEntry && Date.now() < existingEntry.expiresAt ? existingEntry.sendCount : 0) + 1

  emailVerificationCodes.set(emailNorm, {
    code,
    expiresAt: Date.now() + 10 * 60 * 1000,
    attempts: 0,
    name: name ? String(name).trim().slice(0, 40) : undefined,
    mode: mode || 'login',
    sendCount,
  })

  try {
    await sendVerificationEmail(emailNorm, code)
  } catch (err) {
    console.error('Email send error:', err.message)
    response.status(500).json({ error: 'Не удалось отправить письмо. Проверь почту или попробуй позже.' })
    return
  }

  response.json({ ok: true, hint: SMTP_HOST ? undefined : `[DEV] код: ${code}` })
})

app.post('/api/auth/email', (request, response) => {
  const clientIp = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.socket.remoteAddress || 'unknown'
  if (!rateLimit(`auth:${clientIp}`, 10, 60000)) {
    response.status(429).json({ error: 'Слишком много попыток. Подожди минуту.' })
    return
  }

  const state = readState()
  const { email, code, location, referralCode: refCode } = request.body || {}

  if (!state.siteSettings.emailAuthEnabled) {
    response.status(403).json({ error: 'Вход по email отключён' })
    return
  }

  if (!email || !code) {
    response.status(400).json({ error: 'Email и код подтверждения обязательны' })
    return
  }

  const emailNorm = String(email).trim().toLowerCase()

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
    response.status(400).json({ error: 'Некорректный формат email' })
    return
  }

  // Verify code
  const codeEntry = emailVerificationCodes.get(emailNorm)
  if (!codeEntry) {
    response.status(400).json({ error: 'Сначала запроси код подтверждения' })
    return
  }
  if (Date.now() > codeEntry.expiresAt) {
    emailVerificationCodes.delete(emailNorm)
    response.status(400).json({ error: 'Код истёк. Запроси новый.' })
    return
  }
  codeEntry.attempts += 1
  if (codeEntry.attempts > 5) {
    emailVerificationCodes.delete(emailNorm)
    response.status(429).json({ error: 'Превышено число попыток. Запроси новый код.' })
    return
  }
  if (String(code).trim() !== codeEntry.code) {
    response.status(400).json({ error: `Неверный код. Осталось попыток: ${Math.max(0, 5 - codeEntry.attempts)}` })
    return
  }

  // Code valid — remove it
  emailVerificationCodes.delete(emailNorm)

  const mode = codeEntry.mode
  const name = codeEntry.name
  let user = state.users.find((item) => item.email?.toLowerCase() === emailNorm)

  // === REGISTRATION ===
  if (mode === 'register') {
    if (user) {
      response.status(409).json({ error: 'Аккаунт с этой почтой уже существует. Войди через вход.' })
      return
    }
    if (!state.siteSettings.registrationsOpen) {
      response.status(403).json({ error: 'Регистрация временно закрыта' })
      return
    }
    if (!name) {
      response.status(400).json({ error: 'Имя не найдено — запроси код заново' })
      return
    }

    const numericId = generateNumericId(state)
    user = createSeedUser({
      id: createToken(),
      numericId,
      provider: 'email',
      providerId: emailNorm,
      name,
      handle: ensureUniqueHandle(state, name),
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=111111&color=ffffff&bold=true`,
      email: emailNorm,
      city: location?.city || null,
      country: location?.country || null,
      latitude: Number.isFinite(location?.latitude) ? Number(location.latitude) : null,
      longitude: Number.isFinite(location?.longitude) ? Number(location.longitude) : null,
      geoAllowed: Boolean(location?.city),
      bio: 'Новый профиль.',
      tagline: 'fresh profile',
      badges: ['NEW'],
      passwordHash: null,
      passwordSalt: null,
    })

    if (refCode) {
      const referrer = state.users.find(u => u.referralCode === String(refCode).trim())
      if (referrer && referrer.id !== user.id) {
        user.referredBy = referrer.id
        referrer.stats.referrals += 1
        pushAudit(state, 'referral.applied', user.id, referrer.id, `Реферал от ${referrer.handle}.`)
      }
    }

    if (ADMIN_EMAILS.includes(emailNorm)) {
      user.role = 'admin'
      if (!user.badges.includes('ADMIN')) user.badges.unshift('ADMIN')
    }

    state.users.push(user)
    createWelcomeConversation(state, user.id)
    pushAudit(state, 'auth.email.register', user.id, user.id, 'Регистрация по email с кодом.')

    const token = createSessionForUser(state, user.id, request.headers['user-agent'])
    saveState(state)
    response.json({ token, viewer: publicUser(user, state), isNewUser: true, conversations: getConversationsForUser(state, user.id) })
    return
  }

  // === LOGIN ===
  if (!user) {
    response.status(404).json({ error: 'Аккаунт не найден. Зарегистрируйся.' })
    return
  }

  if (!canSignIn(state, user)) {
    response.status(403).json({ error: 'Вход ограничен настройками сайта' })
    return
  }

  const token = createSessionForUser(state, user.id, request.headers['user-agent'])
  pushAudit(state, 'auth.email.login', user.id, user.id, 'Вход по email с кодом.')
  saveState(state)
  response.json({ token, viewer: publicUser(user, state), isNewUser: false })
})

// Password-based login / register
app.post('/api/auth/password', (request, response) => {
  const clientIp = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.socket.remoteAddress || 'unknown'
  if (!rateLimit(`auth:${clientIp}`, 10, 60000)) {
    response.status(429).json({ error: 'Слишком много попыток. Подожди минуту.' })
    return
  }

  const state = readState()
  const { mode, email, password, name, location: loc } = request.body || {}

  if (!email || !password) {
    response.status(400).json({ error: 'Email и пароль обязательны' })
    return
  }
  if (String(password).length < 8) {
    response.status(400).json({ error: 'Пароль минимум 8 символов' })
    return
  }

  const emailNorm = String(email).trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
    response.status(400).json({ error: 'Некорректный формат email' })
    return
  }

  if (mode === 'register') {
    if (!state.siteSettings.registrationsOpen) {
      response.status(403).json({ error: 'Регистрация временно закрыта' })
      return
    }
    if (!name || !String(name).trim()) {
      response.status(400).json({ error: 'Имя обязательно' })
      return
    }
    const existing = state.users.find(u => u.email?.toLowerCase() === emailNorm)
    if (existing) {
      response.status(409).json({ error: 'Аккаунт с этой почтой уже существует' })
      return
    }
    const { salt, hash } = createPasswordHash(String(password))
    const numericId = generateNumericId(state)
    const cleanName = String(name).trim().slice(0, 40)
    const user = createSeedUser({
      id: createToken(),
      numericId,
      provider: 'email',
      providerId: emailNorm,
      name: cleanName,
      handle: ensureUniqueHandle(state, cleanName),
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=111111&color=ffffff&bold=true`,
      email: emailNorm,
      city: loc?.city || null,
      country: loc?.country || null,
      latitude: Number.isFinite(loc?.latitude) ? Number(loc.latitude) : null,
      longitude: Number.isFinite(loc?.longitude) ? Number(loc.longitude) : null,
      geoAllowed: Boolean(loc?.city),
      bio: 'Новый профиль.',
      tagline: 'fresh profile',
      badges: ['NEW'],
      passwordHash: hash,
      passwordSalt: salt,
    })
    if (ADMIN_EMAILS.includes(emailNorm)) {
      user.role = 'admin'
      if (!user.badges.includes('ADMIN')) user.badges.unshift('ADMIN')
    }
    state.users.push(user)
    createWelcomeConversation(state, user.id)
    pushAudit(state, 'auth.password.register', user.id, user.id, 'Регистрация с паролем.')
    const token = createSessionForUser(state, user.id, request.headers['user-agent'])
    saveState(state)
    response.json({ token, viewer: publicUser(user, state), isNewUser: true, conversations: getConversationsForUser(state, user.id) })
    return
  }

  // Login
  const user = state.users.find(u => u.email?.toLowerCase() === emailNorm)
  if (!user) {
    response.status(404).json({ error: 'Аккаунт не найден' })
    return
  }
  if (!user.passwordHash || !user.passwordSalt) {
    response.status(400).json({ error: 'У этого аккаунта нет пароля. Используй вход по Email-коду.' })
    return
  }
  if (!verifyPassword(String(password), user.passwordSalt, user.passwordHash)) {
    response.status(401).json({ error: 'Неверный пароль' })
    return
  }
  if (!canSignIn(state, user)) {
    response.status(403).json({ error: 'Вход ограничен' })
    return
  }
  const token = createSessionForUser(state, user.id, request.headers['user-agent'])
  pushAudit(state, 'auth.password.login', user.id, user.id, 'Вход по паролю.')
  saveState(state)
  response.json({ token, viewer: publicUser(user, state), isNewUser: false })
})

app.post('/api/auth/telegram', (request, response) => {
  const clientIp = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.socket.remoteAddress || 'unknown'
  if (!rateLimit(`auth:${clientIp}`, 10, 60000)) {
    response.status(429).json({ error: 'Слишком много попыток. Подожди минуту.' })
    return
  }

  const state = readState()
  const payload = request.body || {}
  const telegramPayload = payload.initDataUnsafe?.user || {}
  const telegramId = payload.id || telegramPayload.id
  const firstName = payload.first_name || telegramPayload.first_name
  const lastName = payload.last_name || telegramPayload.last_name
  const username = payload.username || telegramPayload.username
  const photoUrl = payload.photo_url || telegramPayload.photo_url
  const location = payload.location

  if (!state.siteSettings.telegramAuthEnabled) {
    response.status(403).json({ error: 'Telegram-вход отключён' })
    return
  }

  if (TELEGRAM_AUTH_STRICT && !TELEGRAM_BOT_TOKEN) {
    response.status(500).json({ error: 'На сервере не настроен TELEGRAM_BOT_TOKEN' })
    return
  }

  // Only validate initData when strict mode is on
  if (TELEGRAM_AUTH_STRICT && TELEGRAM_BOT_TOKEN && !validateTelegramInitData(payload.initData || '')) {
    response.status(403).json({ error: 'initData Telegram не прошёл проверку' })
    return
  }

  if (!telegramId || !firstName) {
    response.status(400).json({ error: 'Открой приложение через Telegram' })
    return
  }

  let user = state.users.find((item) => item.provider === 'telegram' && item.providerId === String(telegramId))
  if (!canSignIn(state, user)) {
    response.status(403).json({ error: 'Сейчас вход ограничен настройками сайта' })
    return
  }

  if (!user) {
    const numericId = generateNumericId(state)
    user = createSeedUser({
      id: createToken(),
      numericId,
      provider: 'telegram',
      providerId: String(telegramId),
      telegramId: String(telegramId),
      name: [firstName, lastName].filter(Boolean).join(' '),
      handle: ensureUniqueHandle(state, username || firstName),
      avatarUrl: photoUrl || null,
      email: null,
      city: location?.city || null,
      country: location?.country || null,
      latitude: Number.isFinite(location?.latitude) ? Number(location.latitude) : null,
      longitude: Number.isFinite(location?.longitude) ? Number(location.longitude) : null,
      geoAllowed: Boolean(location?.city),
      bio: 'Telegram-профиль подключён через WebApp.',
      tagline: 'webapp connected',
      badges: ['TG'],
      telegramMeta: {
        username: username || null,
        isLinked: true,
        initData: payload.initData || '',
      },
    })

    // Auto-admin from ENV
    if (ADMIN_TELEGRAM_IDS.includes(String(telegramId))) {
      user.role = 'admin'
      if (!user.badges.includes('ADMIN')) user.badges.unshift('ADMIN')
    }

    state.users.push(user)
    createWelcomeConversation(state, user.id)
    pushAudit(state, 'auth.telegram.register', user.id, user.id, 'Создан новый telegram-пользователь.')
  } else {
    user.name = [firstName, lastName].filter(Boolean).join(' ')
    user.handle = username ? ensureUniqueHandle(state, username, user.id) : user.handle
    user.avatarUrl = photoUrl || user.avatarUrl
    user.telegramMeta = {
      username: username || user.telegramMeta?.username || null,
      isLinked: true,
      initData: payload.initData || user.telegramMeta?.initData || '',
    }
  }

  const token = createSessionForUser(state, user.id, request.headers['user-agent'])
  saveState(state)
  response.json({ token, viewer: publicUser(user, state) })
})

app.post('/api/auth/telegram-widget', (request, response) => {
  const clientIp = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.socket.remoteAddress || 'unknown'
  if (!rateLimit(`auth:${clientIp}`, 10, 60000)) {
    response.status(429).json({ error: 'Слишком много попыток. Подожди минуту.' })
    return
  }

  const state = readState()
  const payload = request.body || {}

  if (!state.siteSettings.telegramAuthEnabled) {
    response.status(403).json({ error: 'Telegram-вход отключён' })
    return
  }

  if (TELEGRAM_AUTH_STRICT && !TELEGRAM_BOT_TOKEN) {
    response.status(500).json({ error: 'На сервере не настроен TELEGRAM_BOT_TOKEN' })
    return
  }

  if (TELEGRAM_AUTH_STRICT && TELEGRAM_BOT_TOKEN && !validateTelegramWidgetData(payload)) {
    response.status(403).json({ error: 'Данные Telegram Login Widget не прошли проверку' })
    return
  }

  const telegramId = payload.id
  const firstName = payload.first_name
  const lastName = payload.last_name
  const username = payload.username
  const photoUrl = payload.photo_url
  const location = payload.location

  if (!telegramId || !firstName) {
    response.status(400).json({ error: 'Неверные данные авторизации' })
    return
  }

  let user = state.users.find((item) => item.provider === 'telegram' && item.providerId === String(telegramId))
  if (!canSignIn(state, user)) {
    response.status(403).json({ error: 'Сейчас вход ограничен настройками сайта' })
    return
  }

  if (!user) {
    user = createSeedUser({
      id: createToken(),
      provider: 'telegram',
      providerId: String(telegramId),
      name: [firstName, lastName].filter(Boolean).join(' '),
      handle: ensureUniqueHandle(state, username || firstName),
      avatarUrl: photoUrl || null,
      email: null,
      city: location?.city || null,
      country: location?.country || null,
      latitude: Number.isFinite(location?.latitude) ? Number(location.latitude) : null,
      longitude: Number.isFinite(location?.longitude) ? Number(location.longitude) : null,
      geoAllowed: Boolean(location),
      bio: 'Telegram-профиль через Login Widget.',
      tagline: 'webapp connected',
      badges: ['TG'],
      telegramMeta: {
        username: username || null,
        isLinked: true,
      },
    })
    state.users.push(user)
    createWelcomeConversation(state, user.id)
    pushAudit(state, 'auth.telegram-widget.register', user.id, user.id, 'Создан telegram-пользователь через Login Widget.')
  } else {
    user.name = [firstName, lastName].filter(Boolean).join(' ')
    user.handle = username ? ensureUniqueHandle(state, username, user.id) : user.handle
    user.avatarUrl = photoUrl || user.avatarUrl
    user.telegramMeta = {
      username: username || user.telegramMeta?.username || null,
      isLinked: true,
    }
  }

  const token = createSessionForUser(state, user.id, request.headers['user-agent'])
  saveState(state)
  response.json({ token, viewer: publicUser(user, state) })
})

// Check handle availability
app.get('/api/handle/check', (request, response) => {
  const state = readState()
  const viewer = requireUser(request, response, state)
  if (!viewer) return

  const raw = String(request.query.handle || '').trim()
  if (!raw) {
    response.json({ available: false, normalized: '' })
    return
  }

  const normalized = normalizeHandle(raw)
  const taken = state.users.some(u => u.handle === normalized && u.id !== viewer.id)
  response.json({ available: !taken, normalized })
})

// Generate random handle
app.get('/api/handle/random', (request, response) => {
  const adjectives = ['dark','cold','neon','fast','gray','iron','void','zero','hex','null','mono','raw','low','dry','zen','arc','bit','fog','dusk','ash']
  const nouns = ['wolf','node','byte','core','mind','edge','root','link','grid','cell','code','flux','data','mask','wave','port','rule','base','form','unit']
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const num = Math.floor(Math.random() * 900) + 100
  const handle = `@${adj}${noun}${num}`
  response.json({ handle })
})

app.post('/api/profile/update', (request, response) => {
  const state = readState()
  const viewer = requireUser(request, response, state)
  if (!viewer) {
    return
  }

  if (!state.siteSettings.profileEditEnabled) {
    response.status(403).json({ error: 'Редактирование профиля временно закрыто' })
    return
  }

  const { name, handle, bio, tagline, preferences } = request.body || {}

  if (name) {
    viewer.name = String(name).trim().slice(0, 40)
  }

  if (handle) {
    viewer.handle = ensureUniqueHandle(state, handle, viewer.id)
  }

  if (typeof bio === 'string') {
    viewer.bio = bio.trim().slice(0, 240)
  }

  if (typeof tagline === 'string') {
    viewer.tagline = tagline.trim().slice(0, 72)
  }

  if (preferences && typeof preferences === 'object') {
    viewer.preferences = {
      ...viewer.preferences,
      showCity: Boolean(preferences.showCity),
      allowInbox: Boolean(preferences.allowInbox),
      neonProfile: Boolean(preferences.neonProfile),
      emailAlerts: Boolean(preferences.emailAlerts),
      telegramAutoAuth: Boolean(preferences.telegramAutoAuth),
    }
  }

  pushAudit(state, 'profile.update', viewer.id, viewer.id, 'Пользователь обновил профиль.')
  saveState(state)
  response.json(bootstrapPayload(state, viewer))
})

// Avatar upload (base64 data URL, max 256KB)
app.post('/api/profile/avatar', (request, response) => {
  const state = readState()
  const viewer = requireUser(request, response, state)
  if (!viewer) return

  const { avatar } = request.body || {}
  if (!avatar || typeof avatar !== 'string') {
    response.status(400).json({ error: 'Аватар не указан' })
    return
  }

  // Validate data URL format: data:image/(png|jpeg|webp|gif);base64,...
  const match = avatar.match(/^data:image\/(png|jpeg|webp|gif);base64,/)
  if (!match) {
    response.status(400).json({ error: 'Неверный формат. Допускается PNG, JPEG, WebP, GIF' })
    return
  }

  // Check size: base64 part only, ~256KB max decoded
  const base64Part = avatar.slice(avatar.indexOf(',') + 1)
  const sizeBytes = Math.ceil(base64Part.length * 3 / 4)
  if (sizeBytes > 256 * 1024) {
    response.status(400).json({ error: 'Файл слишком большой (макс. 256 КБ)' })
    return
  }

  viewer.avatarUrl = avatar
  pushAudit(state, 'profile.avatar', viewer.id, viewer.id, 'Пользователь обновил аватар.')
  saveState(state)
  response.json({ ok: true, avatarUrl: viewer.avatarUrl })
})

// Delete avatar
app.delete('/api/profile/avatar', (request, response) => {
  const state = readState()
  const viewer = requireUser(request, response, state)
  if (!viewer) return
  viewer.avatarUrl = null
  pushAudit(state, 'profile.avatar.delete', viewer.id, viewer.id, 'Пользователь удалил аватар.')
  saveState(state)
  response.json({ ok: true })
})

app.post('/api/location', (request, response) => {
  const state = readState()
  const viewer = requireUser(request, response, state)
  if (!viewer) {
    return
  }

  const body = request.body || {}

  // Allow explicit clearing with null
  if (body.city === null) {
    viewer.city = ''
    viewer.country = ''
    viewer.latitude = 0
    viewer.longitude = 0
    viewer.geoAllowed = false
  } else {
    viewer.city = body.city || viewer.city
    viewer.country = body.country || viewer.country
    viewer.latitude = Number.isFinite(body.latitude) ? Number(body.latitude) : viewer.latitude
    viewer.longitude = Number.isFinite(body.longitude) ? Number(body.longitude) : viewer.longitude
    applyCoordinates(viewer)
    viewer.geoAllowed = Boolean(viewer.city)
  }

  pushAudit(state, 'profile.location', viewer.id, viewer.id, 'Обновлена геолокация профиля.')
  saveState(state)
  response.json({ viewer: publicUser(viewer, state) })
})

app.post('/api/messages/send', (request, response) => {
  const state = readState()
  const viewer = requireUser(request, response, state)
  if (!viewer) {
    return
  }

  if (!state.siteSettings.publicFeedVisible) {
    response.status(403).json({ error: 'Лента сейчас отключена' })
    return
  }

  if (state.siteSettings.geoRequiredForSend && (!viewer.geoAllowed || !viewer.city)) {
    response.status(403).json({ error: 'Без гео отправка закрыта' })
    return
  }

  const recipient = state.users.find((item) => item.id === request.body?.recipientId)
  if (!recipient || recipient.status !== 'active') {
    response.status(404).json({ error: 'Профиль не найден' })
    return
  }

  if (!recipient.preferences.allowInbox || !state.siteSettings.inboxEnabled) {
    response.status(403).json({ error: 'Личные сообщения сейчас закрыты' })
    return
  }

  const text = String(request.body?.text || '').trim()
  if (!text) {
    response.status(400).json({ error: 'Текст пустой' })
    return
  }

  const now = new Date().toISOString()
  state.publicMessages.unshift({
    id: createToken(),
    authorId: viewer.id,
    authorName: viewer.name,
    authorHandle: viewer.handle,
    city: viewer.city || 'Город',
    country: viewer.country || 'Локация',
    latitude: viewer.latitude,
    longitude: viewer.longitude,
    text,
    createdAt: now,
  })
  state.inboxMessages.unshift({
    id: createToken(),
    recipientId: recipient.id,
    senderLabel: '>]Regellik',
    senderHandle: '@regellik',
    senderCity: viewer.city || 'Город',
    senderCountry: viewer.country || 'Локация',
    senderLatitude: viewer.latitude,
    senderLongitude: viewer.longitude,
    text,
    createdAt: now,
  })

  viewer.stats.sent += 1
  recipient.stats.received += 1
  pushAudit(state, 'message.sent', viewer.id, recipient.id, 'Отправлена анонимка.')
  sendSystemNotification(state, recipient.id, 'Вам пришла новая анонимная открытка! Проверьте входящие.')
  saveState(state)
  response.json(bootstrapPayload(state, viewer))
})

app.post('/api/admin/settings', (request, response) => {
  const state = readState()
  const viewer = requireAdmin(request, response, state)
  if (!viewer) {
    return
  }

  state.siteSettings = {
    ...state.siteSettings,
    ...(request.body?.settings || {}),
  }
  pushAudit(state, 'admin.settings.update', viewer.id, null, 'Обновлены настройки сайта.')
  saveState(state)
  response.json(bootstrapPayload(state, viewer))
})

app.post('/api/admin/users/update', (request, response) => {
  const state = readState()
  const viewer = requireAdmin(request, response, state)
  if (!viewer) {
    return
  }

  const payload = request.body || {}
  const target = state.users.find((item) => item.id === payload.userId)
  if (!target) {
    response.status(404).json({ error: 'Пользователь не найден' })
    return
  }

  if (payload.name) {
    target.name = String(payload.name).trim().slice(0, 40)
  }
  if (payload.handle) {
    target.handle = ensureUniqueHandle(state, payload.handle, target.id)
  }
  if ('powers' in payload) {
    target.powers = Math.max(0, Number(payload.powers) || 0)
  }
  if (payload.city !== undefined) {
    target.city = payload.city ? String(payload.city).trim() : null
  }
  if (payload.country !== undefined) {
    target.country = payload.country ? String(payload.country).trim() : null
  }
  if ('latitude' in payload) {
    target.latitude = Number.isFinite(payload.latitude) ? Number(payload.latitude) : null
  }
  if ('longitude' in payload) {
    target.longitude = Number.isFinite(payload.longitude) ? Number(payload.longitude) : null
  }
  if ('geoAllowed' in payload) {
    target.geoAllowed = Boolean(payload.geoAllowed)
  }
  applyCoordinates(target)
  if (payload.role === 'admin' || payload.role === 'user') {
    target.role = payload.role
  }
  if (payload.status === 'active' || payload.status === 'suspended') {
    target.status = payload.status
    if (payload.status === 'suspended') {
      state.sessions = state.sessions.filter((item) => item.userId !== target.id)
    }
  }
  if ('isVisible' in payload) {
    target.isVisible = Boolean(payload.isVisible)
  }
  if (typeof payload.bio === 'string') {
    target.bio = payload.bio.trim().slice(0, 240)
  }
  if (typeof payload.tagline === 'string') {
    target.tagline = payload.tagline.trim().slice(0, 72)
  }
  if (Array.isArray(payload.badges)) {
    const oldBadges = [...(target.badges || [])]
    target.badges = payload.badges.filter(Boolean).slice(0, 8)
    const added = target.badges.filter(b => !oldBadges.includes(b))
    const removed = oldBadges.filter(b => !target.badges.includes(b))
    if (added.length) {
      sendSystemNotification(state, target.id, `Yangi prefiks berildi: ${added.join(', ')}. Uni sharaf bilan kiy!`)
    }
    if (removed.length) {
      sendSystemNotification(state, target.id, `◌ Префикс ${removed.join(', ')} был отозван администратором.`)
    }
  }
  if (payload.preferences && typeof payload.preferences === 'object') {
    target.preferences = {
      ...target.preferences,
      showCity: Boolean(payload.preferences.showCity),
      allowInbox: Boolean(payload.preferences.allowInbox),
      neonProfile: Boolean(payload.preferences.neonProfile),
      emailAlerts: Boolean(payload.preferences.emailAlerts),
      telegramAutoAuth: Boolean(payload.preferences.telegramAutoAuth),
    }
  }

  pushAudit(state, 'admin.user.update', viewer.id, target.id, `Обновлён пользователь ${target.handle}.`)

  // Build detailed notification
  const changes = []
  if (payload.name) changes.push(`имя → ${target.name}`)
  if (payload.handle) changes.push(`хэндл → @${target.handle}`)
  if ('powers' in payload) changes.push(`энергия → ${target.powers}`)
  if (payload.city !== undefined) changes.push(`город → ${target.city || '—'}`)
  if (payload.country !== undefined) changes.push(`страна → ${target.country || '—'}`)
  if (payload.role) changes.push(`роль → ${target.role}`)
  if (payload.status) changes.push(`статус → ${target.status}`)
  if ('isVisible' in payload) changes.push(`видимость → ${target.isVisible ? 'вкл' : 'выкл'}`)
  if (typeof payload.bio === 'string') changes.push('био обновлено')
  if (typeof payload.tagline === 'string') changes.push('тэглайн обновлён')
  if (payload.preferences) changes.push('настройки обновлены')

  const detailText = changes.length > 0
    ? `Администратор ${viewer.name} (@${viewer.handle}) обновил ваш профиль: ${changes.join(', ')}.`
    : `Ваш профиль был обновлён администратором ${viewer.name} (@${viewer.handle}).`
  sendSystemNotification(state, target.id, detailText)
  saveState(state)
  response.json(bootstrapPayload(state, viewer))
})

app.post('/api/admin/grant', (request, response) => {
  const state = readState()
  const viewer = requireAdmin(request, response, state)
  if (!viewer) {
    return
  }

  const identifier = String(request.body?.identifier || '').trim().toLowerCase()
  if (!identifier) {
    response.status(400).json({ error: 'Нужен id, email или handle' })
    return
  }

  const target = state.users.find((item) => {
    return item.id === identifier || item.handle.toLowerCase() === identifier || item.email?.toLowerCase() === identifier
  })

  if (!target) {
    response.status(404).json({ error: 'Пользователь для выдачи админки не найден' })
    return
  }

  target.role = 'admin'
  if (!target.badges.includes('ADMIN')) {
    target.badges.unshift('ADMIN')
  }
  pushAudit(state, 'admin.role.grant', viewer.id, target.id, `Выданы права admin пользователю ${target.handle}.`)
  sendSystemNotification(state, target.id, 'Вам выданы права администратора!')
  saveState(state)
  response.json(bootstrapPayload(state, viewer))
})

// Admin: ban/unban user
app.post('/api/admin/ban', (request, response) => {
  const state = readState()
  const viewer = requireAdmin(request, response, state)
  if (!viewer) return

  const { userId, type, reason, duration } = request.body || {}
  const target = state.users.find(u => u.id === userId)
  if (!target) {
    response.status(404).json({ error: 'Пользователь не найден' })
    return
  }
  if (target.role === 'admin') {
    response.status(400).json({ error: 'Нельзя забанить администратора' })
    return
  }

  const banType = type === 'chat' ? 'chat' : 'global'
  const until = duration ? new Date(Date.now() + Number(duration) * 60000).toISOString() : null

  target.ban = {
    type: banType,
    reason: String(reason || '').trim() || 'Не указана',
    until,
    createdAt: new Date().toISOString(),
    adminId: viewer.id,
  }

  // Global ban: kill sessions
  if (banType === 'global') {
    state.sessions = state.sessions.filter(s => s.userId !== target.id)
  }

  const durationText = until ? `на ${duration} мин` : 'навсегда'
  pushAudit(state, `admin.ban.${banType}`, viewer.id, target.id, `${banType === 'global' ? 'Глобальный бан' : 'Бан чата'} ${target.handle} ${durationText}. Причина: ${target.ban.reason}`)
  sendSystemNotification(state, target.id, banType === 'global'
    ? `Ваш аккаунт заблокирован ${durationText}.\nПричина: ${target.ban.reason}`
    : `Чат заблокирован ${durationText}.\nПричина: ${target.ban.reason}`
  )
  saveState(state)
  response.json(bootstrapPayload(state, viewer))
})

// Admin: unban user
app.post('/api/admin/unban', (request, response) => {
  const state = readState()
  const viewer = requireAdmin(request, response, state)
  if (!viewer) return

  const { userId } = request.body || {}
  const target = state.users.find(u => u.id === userId)
  if (!target) {
    response.status(404).json({ error: 'Пользователь не найден' })
    return
  }

  const hadBan = target.ban
  target.ban = null
  pushAudit(state, 'admin.unban', viewer.id, target.id, `Разбан ${target.handle}${hadBan ? ` (был: ${hadBan.type})` : ''}.`)
  sendSystemNotification(state, target.id, 'Ваш аккаунт разблокирован. Добро пожаловать обратно!')
  saveState(state)
  response.json(bootstrapPayload(state, viewer))
})

// Admin: freeze user (set status suspended + kill sessions)
app.post('/api/admin/freeze', (request, response) => {
  const state = readState()
  const viewer = requireAdmin(request, response, state)
  if (!viewer) return

  const { userId, frozen } = request.body || {}
  const target = state.users.find(u => u.id === userId)
  if (!target) {
    response.status(404).json({ error: 'Пользователь не найден' })
    return
  }

  if (frozen) {
    target.status = 'suspended'
    state.sessions = state.sessions.filter(s => s.userId !== target.id)
    pushAudit(state, 'admin.freeze', viewer.id, target.id, `Заморозка аккаунта ${target.handle}.`)
    sendSystemNotification(state, target.id, 'Ваш аккаунт временно заморожен администрацией.')
  } else {
    target.status = 'active'
    pushAudit(state, 'admin.unfreeze', viewer.id, target.id, `Разморозка аккаунта ${target.handle}.`)
    sendSystemNotification(state, target.id, 'Ваш аккаунт разморожен. Добро пожаловать обратно!')
  }

  saveState(state)
  response.json(bootstrapPayload(state, viewer))
})

// Admin: search user by id/handle/email/numericId
app.get('/api/admin/users/search', (request, response) => {
  const state = readState()
  const viewer = requireAdmin(request, response, state)
  if (!viewer) return

  const q = String(request.query.q || '').trim().toLowerCase()
  if (!q) {
    response.json({ users: [] })
    return
  }

  const results = state.users.filter(u => {
    return u.id === q ||
      String(u.numericId) === q ||
      u.handle.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      u.name.toLowerCase().includes(q)
  }).slice(0, 20).map(u => ({
    id: u.id,
    numericId: u.numericId,
    name: u.name,
    handle: u.handle,
    email: u.email || null,
    role: u.role,
    status: u.status,
    powers: u.powers,
    avatarUrl: u.avatarUrl,
    createdAt: u.createdAt,
    stats: u.stats,
    badges: u.badges,
  }))

  response.json({ users: results })
})

// Admin: top-up powers for user
app.post('/api/admin/topup', (request, response) => {
  const state = readState()
  const viewer = requireAdmin(request, response, state)
  if (!viewer) return

  const { userId, amount, reason } = request.body || {}
  const target = state.users.find(u => u.id === userId)
  if (!target) {
    response.status(404).json({ error: 'Пользователь не найден' })
    return
  }

  const numAmount = Number(amount)
  if (!Number.isFinite(numAmount) || numAmount === 0) {
    response.status(400).json({ error: 'Некорректная сумма' })
    return
  }

  const oldPowers = target.powers
  target.powers = Math.round((target.powers + numAmount) * 100) / 100
  if (target.powers < 0) target.powers = 0
  pushPowerLog(target, numAmount > 0 ? 'topup' : 'deduct', numAmount, reason || (numAmount > 0 ? 'Пополнение от администратора' : 'Списание администратором'))

  pushAudit(state, numAmount > 0 ? 'admin.topup' : 'admin.deduct', viewer.id, target.id, `${numAmount > 0 ? '+' : ''}${numAmount}⚡ пользователю ${target.handle} (было ${oldPowers}, стало ${target.powers}). ${reason ? 'Причина: ' + reason : ''}`)
  sendSystemNotification(state, target.id, numAmount > 0
    ? `Ваш баланс пополнен на ${numAmount}⚡\nТекущий баланс: ${target.powers}⚡${reason ? '\nПричина: ' + reason : ''}`
    : `С вашего баланса списано ${Math.abs(numAmount)}⚡\nТекущий баланс: ${target.powers}⚡${reason ? '\nПричина: ' + reason : ''}`
  )
  saveState(state)
  response.json(bootstrapPayload(state, viewer))
})

// Admin broadcast system message to all users or specific users
app.post('/api/admin/broadcast', (request, response) => {
  const state = readState()
  const viewer = requireAdmin(request, response, state)
  if (!viewer) return

  const { text, userIds } = request.body || {}
  if (!text || !String(text).trim()) {
    response.status(400).json({ error: 'Текст сообщения обязателен' })
    return
  }

  const regellikId = 'seed-regellik'
  const messageText = String(text).trim().slice(0, 2000)
  const targetIds = Array.isArray(userIds) && userIds.length > 0 ? userIds : null
  let sent = 0

  for (const user of state.users) {
    if (user.id === regellikId) continue
    if (targetIds && !targetIds.includes(user.id)) continue
    // Find or create system conversation
    let convo = state.conversations.find(c =>
      c.isSystem && c.participants.includes(regellikId) && c.participants.includes(user.id)
    )
    if (!convo) {
      convo = {
        id: createToken(),
        participants: [regellikId, user.id],
        isSystem: true,
        createdAt: new Date().toISOString(),
      }
      state.conversations.push(convo)
    }
    state.chatMessages.push({
      id: createToken(),
      conversationId: convo.id,
      senderId: regellikId,
      text: messageText,
      createdAt: new Date().toISOString(),
    })

    // Real-time WS notification to recipient
    sendToUser(user.id, {
      type: 'new_message',
      conversationId: convo.id,
      message: {
        id: state.chatMessages[state.chatMessages.length - 1].id,
        text: messageText,
        senderId: regellikId,
        senderName: 'Regellik',
        createdAt: state.chatMessages[state.chatMessages.length - 1].createdAt,
      },
      conversations: getConversationsForUser(state, user.id),
    })

    sent++
  }

  pushAudit(state, 'admin.broadcast', viewer.id, null, `Рассылка "${messageText.slice(0, 60)}..."${targetIds ? ` (выборочно ${sent} из ${targetIds.length})` : ` — ${sent} пользователей`}.`)
  saveState(state)
  response.json({ ok: true, sent })
})

// --- Admin delete post ---
app.delete('/api/admin/posts/:postId', (request, response) => {
  const state = readState()
  const viewer = requireAdmin(request, response, state)
  if (!viewer) return

  const { postId } = request.params
  const idx = state.posts.findIndex(p => p.id === postId)
  if (idx === -1) {
    response.status(404).json({ error: 'Пост не найден' })
    return
  }
  const post = state.posts[idx]
  state.posts.splice(idx, 1)
  // Remove comments for this post
  state.chatMessages = (state.chatMessages || []).filter(m => m.conversationId !== postId)
  pushAudit(state, 'admin.deletePost', viewer.id, post.authorId, `Удалён пост "${(post.text || '').slice(0, 60)}..."`)
  saveState(state)
  response.json({ ok: true })
})

// --- Public user profile ---
app.get('/api/users/:userId/public', (request, response) => {
  const state = readState()
  const viewer = requireUser(request, response, state)
  if (!viewer) return

  const target = state.users.find(u => u.id === request.params.userId)
  if (!target) {
    response.status(404).json({ error: 'Пользователь не найден' })
    return
  }
  // Increment profile views if not self
  if (target.id !== viewer.id) {
    target.profileViews = (target.profileViews || 0) + 1
    saveState(state)
  }
  const social = getFollowCounts(state, target.id)
  response.json({
    user: {
      id: target.id,
      name: target.name,
      handle: target.handle,
      bio: target.bio,
      tagline: target.tagline,
      avatarUrl: target.avatarUrl,
      badges: target.badges || [],
      powers: target.powers,
      city: target.city,
      country: target.country,
      joinedAt: target.joinedAt,
      profileViews: target.profileViews || 0,
      followerCount: social.followerCount,
      followingCount: social.followingCount,
      postCount: social.postCount,
    },
    posts: getUserPosts(state, target.id, viewer).slice(0, 24),
    isFollowing: target.id !== viewer.id ? isFollowingUser(state, viewer.id, target.id) : false,
  })
})

app.post('/api/users/:userId/follow', (request, response) => {
  const state = readState()
  const viewer = requireUser(request, response, state)
  if (!viewer) return

  const target = state.users.find(user => user.id === request.params.userId)
  if (!target || target.status !== 'active') {
    response.status(404).json({ error: 'Пользователь не найден' })
    return
  }

  if (target.id === viewer.id) {
    response.status(400).json({ error: 'Нельзя подписаться на себя' })
    return
  }

  const existingIndex = state.follows.findIndex(item => item.followerId === viewer.id && item.followingId === target.id)
  const shouldFollow = request.body?.follow !== false
  let isFollowing = existingIndex !== -1

  if (shouldFollow && existingIndex === -1) {
    state.follows.push({
      id: createToken(),
      followerId: viewer.id,
      followingId: target.id,
      createdAt: new Date().toISOString(),
    })
    isFollowing = true
    pushAudit(state, 'follow.create', viewer.id, target.id, `${viewer.handle} подписался на ${target.handle}.`)
    sendSystemNotification(state, target.id, `${viewer.name} (${viewer.handle}) подписался на ваш профиль.`)
  }

  if (!shouldFollow && existingIndex !== -1) {
    state.follows.splice(existingIndex, 1)
    isFollowing = false
    pushAudit(state, 'follow.remove', viewer.id, target.id, `${viewer.handle} отписался от ${target.handle}.`)
  }

  saveState(state)
  const social = getFollowCounts(state, target.id)
  response.json({
    ok: true,
    isFollowing,
    followerCount: social.followerCount,
    followingCount: social.followingCount,
    viewer: publicUser(viewer, state),
  })
})

app.post('/api/users/:userId/report', (request, response) => {
  const state = readState()
  const viewer = requireUser(request, response, state)
  if (!viewer) return

  const target = state.users.find(user => user.id === request.params.userId)
  if (!target) {
    response.status(404).json({ error: 'Пользователь не найден' })
    return
  }

  if (target.id === viewer.id) {
    response.status(400).json({ error: 'Нельзя пожаловаться на себя' })
    return
  }

  const category = String(request.body?.category || '').trim().slice(0, 80)
  const text = String(request.body?.text || '').trim().slice(0, 500)
  const postId = String(request.body?.postId || '').trim()
  if (!category && !text) {
    response.status(400).json({ error: 'Укажи причину жалобы' })
    return
  }

  let reportedPost = null
  if (postId) {
    reportedPost = state.posts.find((post) => post.id === postId && post.authorId === target.id)
    if (!reportedPost) {
      response.status(404).json({ error: 'Публикация для жалобы не найдена' })
      return
    }
  }

  const report = {
    id: createToken(),
    reporterId: viewer.id,
    reporterName: viewer.name,
    reporterHandle: viewer.handle,
    targetUserId: target.id,
    targetUserName: target.name,
    targetUserHandle: target.handle,
    postId: reportedPost?.id || null,
    postPreview: reportedPost ? String(reportedPost.text || '').slice(0, 180) : null,
    category: category || 'Другое',
    text,
    status: 'open',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  state.reports.unshift(report)
  state.reports = state.reports.slice(0, 500)
  pushAudit(state, 'report.create', viewer.id, target.id, `Жалоба на ${target.handle}${report.postId ? `, пост ${report.postId}` : ''}. Категория: ${report.category}.`)
  notifyAdminsAboutReport(state, report, viewer, target)
  saveState(state)
  response.json({ ok: true, report })
})

app.post('/api/admin/reports/:reportId/status', (request, response) => {
  const state = readState()
  const viewer = requireAdmin(request, response, state)
  if (!viewer) return

  const report = state.reports.find(item => item.id === request.params.reportId)
  if (!report) {
    response.status(404).json({ error: 'Жалоба не найдена' })
    return
  }

  const status = request.body?.status
  if (!['open', 'resolved', 'dismissed'].includes(status)) {
    response.status(400).json({ error: 'Некорректный статус' })
    return
  }

  report.status = status
  report.updatedAt = new Date().toISOString()
  pushAudit(state, `report.${status}`, viewer.id, report.targetUserId, `Жалоба ${report.id} переведена в статус ${status}.`)
  saveState(state)
  response.json({ ok: true, reports: adminData(state).reports })
})

app.post('/api/session/logout', (request, response) => {
  const token = getBearerToken(request)
  const state = readState()
  state.sessions = state.sessions.filter((item) => item.token !== token)
  saveState(state)
  response.json({ ok: true })
})

// List active sessions for current user
app.get('/api/sessions', (request, response) => {
  const state = readState()
  const viewer = requireUser(request, response, state)
  if (!viewer) return

  const currentToken = getBearerToken(request)
  const now = Date.now()
  const userSessions = state.sessions
    .filter(s => s.userId === viewer.id)
    .filter(s => !s.createdAt || (now - new Date(s.createdAt).getTime()) < SESSION_TTL_MS)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .map(s => ({
      id: s.token.slice(0, 8),
      isCurrent: s.token === currentToken,
      createdAt: s.createdAt || null,
      userAgent: s.userAgent || '',
    }))

  response.json({ sessions: userSessions })
})

// Kill a specific session by its short id
app.post('/api/sessions/kill', (request, response) => {
  const state = readState()
  const viewer = requireUser(request, response, state)
  if (!viewer) return

  const { sessionId } = request.body || {}
  if (!sessionId || typeof sessionId !== 'string') {
    response.status(400).json({ error: 'Не указан ID сессии' })
    return
  }

  const currentToken = getBearerToken(request)
  const target = state.sessions.find(s => s.userId === viewer.id && s.token.startsWith(sessionId))
  if (!target) {
    response.status(404).json({ error: 'Сессия не найдена' })
    return
  }
  if (target.token === currentToken) {
    response.status(400).json({ error: 'Нельзя завершить текущую сессию. Используй «Выйти»' })
    return
  }

  state.sessions = state.sessions.filter(s => s.token !== target.token)
  saveState(state)
  response.json({ ok: true })
})

// Notifications for user
app.get('/api/notifications', (request, response) => {
  const state = readState()
  const viewer = requireUser(request, response, state)
  if (!viewer) return

  const notifications = []

  // System chat messages as notifications
  const regellikId = 'seed-regellik'
  const systemConvos = state.conversations.filter(c =>
    c.isSystem && c.participants.includes(viewer.id)
  )
  for (const convo of systemConvos) {
    const msgs = state.chatMessages.filter(m =>
      m.conversationId === convo.id && m.senderId !== viewer.id
    )
    for (const m of msgs) {
      notifications.push({
        id: m.id,
        type: 'system',
        title: 'Regellik',
        text: m.text,
        createdAt: m.createdAt,
      })
    }
  }

  // Inbox messages
  const inboxMsgs = state.inboxMessages.filter(m => m.recipientId === viewer.id)
  for (const m of inboxMsgs) {
    notifications.push({
      id: m.id,
      type: 'inbox',
      title: m.senderLabel || 'Аноним',
      text: m.text,
      createdAt: m.createdAt,
    })
  }

  // Chat messages from other users (recent, last 20)
  const userConvos = state.conversations.filter(c => c.participants.includes(viewer.id) && !c.isSystem)
  for (const convo of userConvos) {
    const otherUserId = convo.participants.find(p => p !== viewer.id)
    const otherUser = state.users.find(u => u.id === otherUserId)
    const msgs = state.chatMessages
      .filter(m => m.conversationId === convo.id && m.senderId !== viewer.id)
      .slice(-5)
    for (const m of msgs) {
      notifications.push({
        id: m.id,
        type: 'message',
        title: otherUser?.name || 'Пользователь',
        text: m.text,
        createdAt: m.createdAt,
      })
    }
  }

  // Sort by date desc, limit 50
  notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  response.json({ notifications: notifications.slice(0, 50) })
})

// === CONVERSATIONS API ===

app.post('/api/conversations', (request, response) => {
  const state = readState()
  const viewer = requireUser(request, response, state)
  if (!viewer) return

  // Chat ban check on conversation creation
  if (viewer.ban) {
    if (viewer.ban.until && new Date(viewer.ban.until) < new Date()) {
      viewer.ban = null
      saveState(state)
    } else if (viewer.ban.type === 'chat' || viewer.ban.type === 'global') {
      response.status(403).json({ error: 'Вы не можете создавать чаты — ваш аккаунт заблокирован' })
      return
    }
  }

  const { recipientId } = request.body || {}
  if (!recipientId) {
    response.status(400).json({ error: 'Укажи получателя' })
    return
  }

  const recipient = state.users.find(u => u.id === recipientId)
  if (!recipient || recipient.status !== 'active') {
    response.status(404).json({ error: 'Пользователь не найден' })
    return
  }

  // 50km distance check
  if (!isWithinRange(viewer, recipient)) {
    response.status(403).json({ error: 'Пользователь слишком далеко (>50 км)' })
    return
  }

  // Check if conversation already exists
  const existing = state.conversations.find(c =>
    c.participants.includes(viewer.id) && c.participants.includes(recipientId)
  )
  if (existing) {
    response.json({ conversationId: existing.id })
    return
  }

  const convoId = createToken()
  state.conversations.push({
    id: convoId,
    participants: [viewer.id, recipientId],
    isSystem: false,
    createdAt: new Date().toISOString(),
  })
  sendSystemNotification(state, recipientId, `${viewer.name} (@${viewer.handle}) начал с вами чат.`)
  saveState(state)
  response.json({ conversationId: convoId })
})

// Delete conversation (soft-delete: removes from participant's view by adding to hiddenBy array)
app.delete('/api/conversations/:id', (request, response) => {
  const state = readState()
  const viewer = requireUser(request, response, state)
  if (!viewer) return

  const convo = state.conversations.find(c => c.id === request.params.id)
  if (!convo || !convo.participants.includes(viewer.id)) {
    response.status(404).json({ error: 'Чат не найден' })
    return
  }

  if (!Array.isArray(convo.hiddenBy)) convo.hiddenBy = []
  if (!convo.hiddenBy.includes(viewer.id)) {
    convo.hiddenBy.push(viewer.id)
  }

  saveState(state)
  response.json({ ok: true, conversations: getConversationsForUser(state, viewer.id) })
})

app.get('/api/conversations/:id/messages', (request, response) => {
  const state = readState()
  const viewer = requireUser(request, response, state)
  if (!viewer) return

  const convo = state.conversations.find(c => c.id === request.params.id)
  if (!convo || !convo.participants.includes(viewer.id)) {
    response.status(404).json({ error: 'Чат не найден' })
    return
  }

  // Mark messages as read
  state.chatMessages
    .filter(m => m.conversationId === convo.id && m.senderId !== viewer.id && !m.readAt)
    .forEach(m => { m.readAt = new Date().toISOString() })
  saveState(state)

  const messages = state.chatMessages
    .filter(m => m.conversationId === convo.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  const otherId = convo.participants.find(p => p !== viewer.id)
  const otherUser = state.users.find(u => u.id === otherId)

  response.json({
    messages,
    otherUser: otherUser ? { id: otherUser.id, name: otherUser.name, handle: otherUser.handle, avatarUrl: otherUser.avatarUrl } : null,
    isSystem: convo.isSystem || false,
  })
})

app.post('/api/conversations/:id/messages', (request, response) => {
  const state = readState()
  const viewer = requireUser(request, response, state)
  if (!viewer) return

  // Chat ban check
  if (viewer.ban && viewer.ban.type === 'chat') {
    if (viewer.ban.until && new Date(viewer.ban.until) < new Date()) {
      viewer.ban = null
      saveState(state)
    } else {
      const msg = viewer.ban.until
        ? `Чат заблокирован до ${new Date(viewer.ban.until).toLocaleString('ru')}. Причина: ${viewer.ban.reason || 'не указана'}`
        : `Чат заблокирован. Причина: ${viewer.ban.reason || 'не указана'}`
      response.status(403).json({ error: msg })
      return
    }
  }

  const convo = state.conversations.find(c => c.id === request.params.id)
  if (!convo || !convo.participants.includes(viewer.id)) {
    response.status(404).json({ error: 'Чат не найден' })
    return
  }

  const text = String(request.body?.text || '').trim()
  if (!text) {
    response.status(400).json({ error: 'Текст пустой' })
    return
  }

  // Economy: charge sender
  const messageCost = Number(state.siteSettings.messageCost ?? 0.1)
  if (messageCost > 0 && viewer.powers < messageCost) {
    response.status(402).json({ error: `Недостаточно ⚡ (нужно ${messageCost})` })
    return
  }

  const msg = {
    id: createToken(),
    conversationId: convo.id,
    senderId: viewer.id,
    text: text.slice(0, 2000),
    createdAt: new Date().toISOString(),
  }
  state.chatMessages.push(msg)
  viewer.stats.sent += 1

  // Economy: deduct from sender
  if (messageCost > 0) {
    viewer.powers = Math.round((viewer.powers - messageCost) * 100) / 100
    pushPowerLog(viewer, 'message_sent', -messageCost, 'Отправка сообщения')
  }

  const recipientId = convo.participants.find(p => p !== viewer.id)
  const recipient = state.users.find(u => u.id === recipientId)
  if (recipient) {
    recipient.stats.received += 1
    // Economy: reward recipient
    const messageEarn = Number(state.siteSettings.messageEarn ?? 0.05)
    if (messageEarn > 0) {
      recipient.powers = Math.round((recipient.powers + messageEarn) * 100) / 100
      pushPowerLog(recipient, 'message_received', +messageEarn, 'Получено сообщение')
    }
  }

  saveState(state)

  // Real-time notification to recipient
  if (recipientId) {
    sendToUser(recipientId, {
      type: 'new_message',
      conversationId: convo.id,
      message: {
        id: msg.id,
        text: msg.text,
        senderId: msg.senderId,
        senderName: viewer.name,
        createdAt: msg.createdAt,
      },
      conversations: getConversationsForUser(state, recipientId),
    })
  }

  // Return updated viewer so client can refresh powers
  const updatedViewer = state.users.find(u => u.id === viewer.id)
  response.json({ message: msg, conversations: getConversationsForUser(state, viewer.id), viewerPowers: updatedViewer?.powers ?? viewer.powers })
})

// === POSTS / TRENDS API ===

app.get('/api/posts', (request, response) => {
  const state = readState()
  const viewer = requireUser(request, response, state)
  if (!viewer) return

  const sort = String(request.query?.sort || 'top')
  const mapped = state.posts.map(p => decoratePost(state, p, viewer))
  if (sort === 'new') {
    mapped.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  } else {
    mapped.sort((a, b) => b.boosts - a.boosts || b.createdAt.localeCompare(a.createdAt))
  }
  response.json({ posts: mapped.slice(0, 50) })
})

app.post('/api/posts', (request, response) => {
  const state = readState()
  const viewer = requireUser(request, response, state)
  if (!viewer) return

  const text = String(request.body?.text || '').trim()
  const imagesPayload = request.body?.imageUrls ?? request.body?.imageUrl ?? []
  if (!text || text.length > 500) {
    response.status(400).json({ error: 'Текст должен быть от 1 до 500 символов' })
    return
  }
  const { error: imageError, imageUrls } = validateImageList(imagesPayload)
  if (imageError) {
    response.status(400).json({ error: imageError })
    return
  }

  const post = {
    id: `post-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
    authorId: viewer.id,
    authorName: viewer.name,
    authorHandle: viewer.handle,
    authorAvatarUrl: viewer.avatarUrl || null,
    text,
    imageUrl: imageUrls[0] || null,
    imageUrls,
    createdAt: new Date().toISOString(),
    boosts: 0,
    boostedBy: [],
    comments: [],
  }

  state.posts.unshift(post)
  if (state.posts.length > 200) state.posts = state.posts.slice(0, 200)
  saveState(state)

  response.json({ post: { ...post, boostedByViewer: false, commentsCount: 0 } })
})

app.post('/api/posts/:id/boost', (request, response) => {
  const state = readState()
  const viewer = requireUser(request, response, state)
  if (!viewer) return

  const post = state.posts.find(p => p.id === request.params.id)
  if (!post) {
    response.status(404).json({ error: 'Пост не найден' })
    return
  }

  if (post.boostedBy.includes(viewer.id)) {
    post.boostedBy = post.boostedBy.filter(id => id !== viewer.id)
    post.boosts = Math.max(0, post.boosts - 1)
    const author = state.users.find(u => u.id === post.authorId)
    if (author && author.id !== viewer.id) {
      author.powers = Math.max(0, Math.round((author.powers - 1) * 100) / 100)
      pushPowerLog(author, 'boost_removed', -1, 'Буст отозван', { postId: post.id })
    }
  } else {
    post.boostedBy.push(viewer.id)
    post.boosts++
    const author = state.users.find(u => u.id === post.authorId)
    if (author && author.id !== viewer.id) {
      author.powers = Math.round((author.powers + 1) * 100) / 100
      pushPowerLog(author, 'boost_received', +1, 'Буст за публикацию', { postId: post.id })
    }
  }

  saveState(state)
  const updatedViewer2 = state.users.find(u => u.id === viewer.id)
  response.json({
    post: { ...post, boostedByViewer: post.boostedBy.includes(viewer.id), commentsCount: post.comments.length },
    viewerPowers: updatedViewer2?.powers ?? viewer.powers,
  })
})

app.post('/api/posts/:id/comments', (request, response) => {
  const state = readState()
  const viewer = requireUser(request, response, state)
  if (!viewer) return

  const post = state.posts.find(p => p.id === request.params.id)
  if (!post) {
    response.status(404).json({ error: 'Пост не найден' })
    return
  }

  const text = String(request.body?.text || '').trim()
  if (!text || text.length > 300) {
    response.status(400).json({ error: 'Комментарий должен быть от 1 до 300 символов' })
    return
  }

  const comment = {
    id: `cmt-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
    authorId: viewer.id,
    authorName: viewer.name,
    authorHandle: viewer.handle,
    text,
    createdAt: new Date().toISOString(),
  }

  post.comments.push(comment)
  saveState(state)

  response.json({
    comment,
    post: { ...post, boostedByViewer: post.boostedBy.includes(viewer.id), commentsCount: post.comments.length },
  })
})

// === TRANSACTIONS / POWER LOG ===

app.get('/api/transactions', (request, response) => {
  const state = readState()
  const viewer = requireUser(request, response, state)
  if (!viewer) return
  response.json({
    powerLog: Array.isArray(viewer.powerLog) ? viewer.powerLog.slice(0, 80) : [],
    powers: viewer.powers,
    stats: viewer.stats,
  })
})

// === RADAR API ===

app.get('/api/radar', (request, response) => {
  const state = readState()
  const viewer = requireUser(request, response, state)
  if (!viewer) return

  if (!Number.isFinite(viewer.latitude) || !Number.isFinite(viewer.longitude)) {
    response.status(400).json({ error: 'Включи геолокацию для радара' })
    return
  }

  const nearby = state.users
    .filter(u => u.id !== viewer.id && u.isVisible && u.status === 'active' && Number.isFinite(u.latitude) && Number.isFinite(u.longitude))
    .map(u => ({
      id: u.id,
      name: u.name,
      handle: u.handle,
      avatarUrl: u.avatarUrl,
      city: u.city,
      tagline: u.tagline,
      distance: haversineDistance(viewer.latitude, viewer.longitude, u.latitude, u.longitude),
    }))
    .filter(u => u.distance <= MAX_VISIBLE_DISTANCE)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 30)

  response.json({ users: nearby })
})

if (existsSync(indexHtmlPath)) {
  app.use(express.static(distPath))

  app.get('*', (request, response, next) => {
    if (request.path.startsWith('/api') || request.path === '/ws') {
      next()
      return
    }

    response.sendFile(indexHtmlPath)
  })
}

function broadcastOnline() {
  const payload = JSON.stringify({ type: 'online', count: wss.clients.size })
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(payload)
    }
  }
}

/** Send a message to a specific user by their userId */
function sendToUser(userId, data) {
  const payload = JSON.stringify(data)
  for (const client of wss.clients) {
    if (client.readyState === 1 && client._userId === userId) {
      client.send(payload)
    }
  }
}

wss.on('connection', (socket) => {
  socket.send(JSON.stringify({ type: 'online', count: wss.clients.size }))
  broadcastOnline()

  socket.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw)
      if (msg.type === 'auth' && typeof msg.token === 'string') {
        const state = readState()
        const sess = state.sessions?.find(s => s.token === msg.token)
        if (sess) {
          socket._userId = sess.userId
        }
      }
    } catch { /* ignore */ }
  })

  socket.on('close', () => {
    broadcastOnline()
  })
})

const port = Number(process.env.PORT || process.env.API_PORT || 8787)

async function start() {
  await connectMongo()
  await initState()
  server.listen(port, () => {
    console.log(`Regellik backend listening on ${port}${mongoCol ? ' (MongoDB)' : ' (file-only)'}`)
  })
}

start().catch(err => {
  console.error('Startup failed:', err)
  process.exit(1)
})