import express from 'express'
import { WebSocketServer } from 'ws'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { createServer } from 'http'
import crypto from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const statePath = join(__dirname, 'state', 'app-state.json')
const distPath = join(__dirname, '..', 'dist')
const indexHtmlPath = join(distPath, 'index.html')
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const ADMIN_BOOTSTRAP_CODE = process.env.ADMIN_BOOTSTRAP_CODE || 'change-me-admin-code'
const TELEGRAM_AUTH_STRICT = process.env.TELEGRAM_AUTH_STRICT !== 'false'
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*'

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
}

function createSeedUser(data) {
  return {
    role: 'user',
    status: 'active',
    isVisible: true,
    bio: 'Профиль активен.',
    tagline: 'на связи',
    badges: [],
    preferences: { ...defaultPreferences },
    powers: 0,
    stats: { sent: 0, received: 0, opened: 0, referrals: 0 },
    joinedAt: new Date().toISOString(),
    telegramMeta: null,
    passwordHash: null,
    passwordSalt: null,
    ...data,
  }
}

const defaultState = {
  siteSettings: { ...defaultSiteSettings },
  users: [
    createSeedUser({
      id: 'seed-regellik',
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
      telegramMeta: { username: 'regellik', isLinked: true },
    }),
    createSeedUser({
      id: 'seed-mila',
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
}

function ensureStateFile() {
  if (!existsSync(statePath)) {
    mkdirSync(dirname(statePath), { recursive: true })
    writeFileSync(statePath, JSON.stringify(defaultState, null, 2), 'utf8')
  }
}

function readState() {
  ensureStateFile()
  const state = JSON.parse(readFileSync(statePath, 'utf8'))
  state.siteSettings = { ...defaultSiteSettings, ...(state.siteSettings || {}) }
  state.auditLog = Array.isArray(state.auditLog) ? state.auditLog : []
  state.users = Array.isArray(state.users)
    ? state.users.map((user) => {
        const nextUser = {
          ...createSeedUser({}),
          ...user,
          preferences: { ...defaultPreferences, ...(user.preferences || {}) },
          badges: Array.isArray(user.badges) ? user.badges : [],
        }

        if (nextUser.id === 'seed-regellik' && !user.role) {
          nextUser.role = 'admin'
          nextUser.badges = nextUser.badges.length ? nextUser.badges : ['ADMIN', 'CORE']
          nextUser.bio = user.bio || 'Главный профиль проекта. Следит за системой, балансом и настройками.'
          nextUser.tagline = user.tagline || 'owner mode'
        }

        return nextUser
      })
    : []
  return state
}

function saveState(state) {
  writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8')
}

function createToken() {
  return crypto.randomUUID()
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

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    handle: user.handle,
    provider: user.provider,
    avatarUrl: user.avatarUrl,
    email: user.email,
    city: user.city,
    country: user.country,
    geoAllowed: user.geoAllowed,
    powers: user.powers,
    role: user.role,
    status: user.status,
    bio: user.bio,
    tagline: user.tagline,
    badges: user.badges,
    joinedAt: user.joinedAt,
    telegramLinked: Boolean(user.telegramMeta?.isLinked),
    preferences: user.preferences,
    stats: user.stats,
  }
}

function publicUserForAdmin(user) {
  return {
    ...publicUser(user),
    providerId: user.providerId,
    isVisible: user.isVisible,
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

function adminUserItem(user) {
  return publicUserForAdmin(user)
}

function resolveSession(state, token) {
  const session = state.sessions.find((item) => item.token === token)
  if (!session) {
    return null
  }

  return state.users.find((item) => item.id === session.userId) || null
}

function adminData(state) {
  return {
    users: [...state.users].map(adminUserItem).sort((left, right) => right.joinedAt.localeCompare(left.joinedAt)),
    auditLog: state.auditLog.slice(0, 18),
  }
}

function bootstrapPayload(state, viewer) {
  const visibleUsers = state.users.filter((item) => item.isVisible && item.status === 'active')

  return {
    viewer: viewer ? publicUser(viewer) : null,
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
    directory: visibleUsers.map(directoryItem),
    adminData: viewer?.role === 'admin' ? adminData(state) : null,
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

app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.json({ ok: true })
})

app.get('/api/bootstrap', (request, response) => {
  const state = readState()
  const token = String(request.query.token || '')
  const viewer = token ? resolveSession(state, token) : null
  response.json(bootstrapPayload(state, viewer))
})

app.post('/api/auth/email', (request, response) => {
  const state = readState()
  const { name, email, password, location } = request.body || {}

  if (!state.siteSettings.emailAuthEnabled) {
    response.status(403).json({ error: 'Вход по email отключён' })
    return
  }

  if (!email || !password) {
    response.status(400).json({ error: 'Почта и пароль обязательны' })
    return
  }

  let user = state.users.find((item) => item.email?.toLowerCase() === String(email).trim().toLowerCase())
  if (!canSignIn(state, user)) {
    response.status(403).json({ error: 'Сейчас вход ограничен настройками сайта' })
    return
  }

  if (!user) {
    if (!name) {
      response.status(400).json({ error: 'Для нового аккаунта укажи имя' })
      return
    }

    if (String(password).length < 6) {
      response.status(400).json({ error: 'Пароль должен быть не короче 6 символов' })
      return
    }

    const passwordData = createPasswordHash(String(password))
    user = createSeedUser({
      id: createToken(),
      provider: 'email',
      providerId: String(email).trim().toLowerCase(),
      name: String(name).trim(),
      handle: ensureUniqueHandle(state, name),
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(String(name).trim())}&background=0d2316&color=bfff3a&bold=true`,
      email: String(email).trim().toLowerCase(),
      city: location?.city || null,
      country: location?.country || null,
      geoAllowed: Boolean(location?.city),
      bio: 'Новый email-профиль.',
      tagline: 'fresh profile',
      badges: ['NEW'],
      passwordHash: passwordData.hash,
      passwordSalt: passwordData.salt,
    })
    state.users.push(user)
    pushAudit(state, 'auth.email.register', user.id, user.id, 'Создан новый email-пользователь.')
  } else if (!verifyPassword(String(password), user.passwordSalt, user.passwordHash)) {
    response.status(403).json({ error: 'Неверная почта или пароль' })
    return
  }

  const token = createToken()
  state.sessions = state.sessions.filter((item) => item.userId !== user.id)
  state.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() })
  saveState(state)
  response.json({ token, viewer: publicUser(user) })
})

app.post('/api/auth/telegram', (request, response) => {
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

  if (TELEGRAM_BOT_TOKEN && !validateTelegramInitData(payload.initData || '')) {
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
    state.users.push(user)
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

  const token = createToken()
  state.sessions = state.sessions.filter((item) => item.userId !== user.id)
  state.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() })
  saveState(state)
  response.json({ token, viewer: publicUser(user) })
})

app.post('/api/auth/telegram-widget', (request, response) => {
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

  if (TELEGRAM_BOT_TOKEN && !validateTelegramWidgetData(payload)) {
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

  const token = createToken()
  state.sessions = state.sessions.filter((item) => item.userId !== user.id)
  state.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() })
  saveState(state)
  response.json({ token, viewer: publicUser(user) })
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

app.post('/api/admin/bootstrap', (request, response) => {
  const state = readState()
  const viewer = requireUser(request, response, state)
  if (!viewer) {
    return
  }

  const accessCode = String(request.body?.accessCode || '')
  if (!accessCode) {
    response.status(400).json({ error: 'Укажи admin code' })
    return
  }

  if (accessCode !== ADMIN_BOOTSTRAP_CODE) {
    response.status(403).json({ error: 'Неверный admin code' })
    return
  }

  viewer.role = 'admin'
  if (!viewer.badges.includes('ADMIN')) {
    viewer.badges.unshift('ADMIN')
  }
  pushAudit(state, 'admin.bootstrap.self', viewer.id, viewer.id, 'Пользователь получил admin по bootstrap code.')
  saveState(state)
  response.json(bootstrapPayload(state, viewer))
})

app.post('/api/location', (request, response) => {
  const state = readState()
  const viewer = requireUser(request, response, state)
  if (!viewer) {
    return
  }

  viewer.city = request.body?.city || viewer.city
  viewer.country = request.body?.country || viewer.country
  viewer.geoAllowed = Boolean(viewer.city)
  pushAudit(state, 'profile.location', viewer.id, viewer.id, 'Обновлена геолокация профиля.')
  saveState(state)
  response.json({ viewer: publicUser(viewer) })
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
    text,
    createdAt: now,
  })

  viewer.stats.sent += 1
  recipient.stats.received += 1
  pushAudit(state, 'message.sent', viewer.id, recipient.id, 'Отправлена анонимка.')
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
  if ('geoAllowed' in payload) {
    target.geoAllowed = Boolean(payload.geoAllowed)
  }
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
    target.badges = payload.badges.filter(Boolean).slice(0, 8)
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
  saveState(state)
  response.json(bootstrapPayload(state, viewer))
})

app.post('/api/session/logout', (request, response) => {
  const token = getBearerToken(request)
  const state = readState()
  state.sessions = state.sessions.filter((item) => item.token !== token)
  saveState(state)
  response.json({ ok: true })
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

wss.on('connection', (socket) => {
  socket.send(JSON.stringify({ type: 'online', count: wss.clients.size }))
  broadcastOnline()
  socket.on('close', () => {
    broadcastOnline()
  })
})

const port = Number(process.env.PORT || process.env.API_PORT || 8787)
server.listen(port, () => {
  console.log(`Regellik backend listening on ${port}`)
})