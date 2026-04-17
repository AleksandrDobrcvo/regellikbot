import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  ChevronRight,
  Copy,
  DollarSign,
  Eye,
  EyeOff,
  Hash,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  PenSquare,
  Plus,
  Radar,
  Save,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  User,
  UserCog,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react'
import { TelegramWebApp } from './types/telegram'
import './App.css'

type TabId = 'feed' | 'chats' | 'profile' | 'transactions' | 'admin'
type AuthProvider = 'telegram' | 'email'
type LocationState = 'idle' | 'loading' | 'granted' | 'denied'
type ToastTone = 'success' | 'error' | 'info'
type UserRole = 'user' | 'admin'
type UserStatus = 'active' | 'suspended'

type UserPreferences = {
  showCity: boolean
  allowInbox: boolean
  neonProfile: boolean
  emailAlerts: boolean
  telegramAutoAuth: boolean
}

type UserStats = {
  sent: number
  received: number
  opened: number
  referrals: number
}

type SessionUser = {
  id: string
  numericId: number | null
  name: string
  handle: string
  provider: AuthProvider
  avatarUrl: string | null
  email: string | null
  city: string | null
  country: string | null
  latitude: number | null
  longitude: number | null
  geoAllowed: boolean
  powers: number
  role: UserRole
  status: UserStatus
  bio: string
  tagline: string
  badges: string[]
  joinedAt: string
  telegramLinked: boolean
  telegramId: string | null
  preferences: UserPreferences
  stats: UserStats
  referralCode: string | null
  referredBy: string | null
}

type DirectoryProfile = {
  id: string
  name: string
  handle: string
  avatarUrl: string | null
  city: string
  country: string
  latitude: number | null
  longitude: number | null
  tagline: string
  badges: string[]
  role: UserRole
  status: UserStatus
  stats: {
    received: number
    replyRate: number
    streak: number
  }
}

type FeedMessage = {
  id: string
  authorName: string
  authorHandle: string
  city: string
  country: string
  latitude: number | null
  longitude: number | null
  text: string
  createdAt: string
}

type InboxMessage = {
  id: string
  senderLabel: string
  senderHandle: string
  senderCity: string
  senderCountry: string
  senderLatitude: number | null
  senderLongitude: number | null
  text: string
  createdAt: string
}

type SiteSettings = {
  telegramAuthEnabled: boolean
  emailAuthEnabled: boolean
  geoRequiredForSend: boolean
  registrationsOpen: boolean
  maintenanceMode: boolean
  onlineCounterVisible: boolean
  publicFeedVisible: boolean
  inboxEnabled: boolean
  devBadgeVisible: boolean
  profileEditEnabled: boolean
  messageCost: number
  messageEarn: number
  topUpOptions: number[]
}

type AdminManagedUser = SessionUser & {
  providerId: string
  isVisible: boolean
}

type AuditLogItem = {
  id: string
  action: string
  actorId: string | null
  targetId: string | null
  details: string
  createdAt: string
}

type AdminData = {
  users: AdminManagedUser[]
  auditLog: AuditLogItem[]
}

type ConversationPreview = {
  id: string
  isSystem: boolean
  createdAt: string
  lastMessage: { text: string; senderId: string; createdAt: string } | null
  unreadCount: number
  otherUser: { id: string; name: string; handle: string; avatarUrl: string | null } | null
}

type ChatMessage = {
  id: string
  conversationId: string
  senderId: string
  text: string
  createdAt: string
  readAt?: string | null
}

type RadarUser = {
  id: string
  name: string
  handle: string
  avatarUrl: string | null
  city: string | null
  tagline: string
  distance: number
}

type BootstrapResponse = {
  viewer: SessionUser | null
  publicFeed: FeedMessage[]
  inbox: InboxMessage[]
  directory: DirectoryProfile[]
  conversations: ConversationPreview[]
  siteSettings: SiteSettings
  adminData: AdminData | null
}

type AuthResponse = {
  token: string
  viewer: SessionUser
  isNewUser?: boolean
}

type ResolvedLocation = {
  city: string
  country: string
  latitude: number
  longitude: number
}

type ToastState = {
  message: string
  tone: ToastTone
}

type AdminDraft = AdminManagedUser & {
  badgesText: string
}

const SESSION_KEY = 'regellik.session'
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const WS_URL = import.meta.env.VITE_WS_URL || ''
const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'regellik_clonebot'

function resolveApiPath(path: string) {
  if (/^https?:\/\//.test(path)) {
    return path
  }

  return `${API_BASE_URL}${path}`
}

function resolveWsUrl() {
  if (WS_URL) {
    return WS_URL
  }

  if (typeof window === 'undefined') {
    return 'ws://localhost:8787/ws'
  }

  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${window.location.host}/ws`
}

const DEFAULT_SITE_SETTINGS: SiteSettings = {
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
  messageCost: 0.1,
  messageEarn: 0.05,
  topUpOptions: [10, 50, 100, 250, 500, 1000],
}

function formatRelativeTime(value: string) {
  const then = new Date(value).getTime()
  const diffMinutes = Math.max(0, Math.floor((Date.now() - then) / 60000))

  if (diffMinutes < 1) {
    return 'только что'
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} мин`
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours} ч`
  }

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} д`
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getStoredSessionToken() {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.localStorage.getItem(SESSION_KEY) || ''
}

function getToastEmoji(tone: ToastTone) {
  if (tone === 'success') {
    return '✅'
  }

  if (tone === 'error') {
    return '⚠️'
  }

  return '💡'
}

function normalizeHandle(value: string) {
  const cleaned = value.toLowerCase().replace(/[^a-zа-яё0-9_]+/gi, '').slice(0, 18)
  return `@${cleaned || 'regellik'}`
}

async function apiRequest<T>(path: string, init?: RequestInit, token?: string) {
  const response = await fetch(resolveApiPath(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: 'Ошибка запроса' }))
    throw new Error(payload.error || 'Ошибка запроса')
  }

  return (await response.json()) as T
}

function App() {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null)
  const [sessionToken, setSessionToken] = useState('')
  const [viewer, setViewer] = useState<SessionUser | null>(null)
  const [publicFeed, setPublicFeed] = useState<FeedMessage[]>([])
  const [inbox, setInbox] = useState<InboxMessage[]>([])
  const [directory, setDirectory] = useState<DirectoryProfile[]>([])
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS)
  const [adminUsers, setAdminUsers] = useState<AdminManagedUser[]>([])
  const [auditLog, setAuditLog] = useState<AuditLogItem[]>([])
  const [onlineCount, setOnlineCount] = useState(0)
  const [activeTab, setActiveTab] = useState<TabId>('feed')
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [menuOpen, setMenuOpen] = useState(false)
  const [introDone, setIntroDone] = useState(false)
  const [emailName, setEmailName] = useState('')
  const [emailValue, setEmailValue] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [locationState, setLocationState] = useState<LocationState>('idle')
  const [locationLabel, setLocationLabel] = useState('Гео не включено')
  const [resolvedLocation, setResolvedLocation] = useState<ResolvedLocation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingSite, setIsSavingSite] = useState(false)
  const [isSavingAdminUser, setIsSavingAdminUser] = useState(false)
  const [isGrantingAdmin, setIsGrantingAdmin] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [profileName, setProfileName] = useState('')
  const [profileHandle, setProfileHandle] = useState('@regellik')
  const [profileTagline, setProfileTagline] = useState('')
  const [profileBio, setProfileBio] = useState('')
  const [adminDraft, setAdminDraft] = useState<AdminDraft | null>(null)
  const [selectedAdminUserId, setSelectedAdminUserId] = useState('')
  const [grantIdentifier, setGrantIdentifier] = useState('')
  const [telegramAuthTried, setTelegramAuthTried] = useState(false)

  // Messenger state
  const [conversations, setConversations] = useState<ConversationPreview[]>([])
  const [openConvoId, setOpenConvoId] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatText, setChatText] = useState('')
  const [chatOtherUser, setChatOtherUser] = useState<ConversationPreview['otherUser']>(null)
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeSearch, setComposeSearch] = useState('')

  // Radar state
  const [radarUsers, setRadarUsers] = useState<RadarUser[]>([])
  const [isRadarLoading, setIsRadarLoading] = useState(false)

  // Top-up modal
  const [topUpOpen, setTopUpOpen] = useState(false)

  // Admin search
  const [adminSearchQ, setAdminSearchQ] = useState('')
  const [adminSearchResults, setAdminSearchResults] = useState<AdminManagedUser[]>([])
  const [adminSearching, setAdminSearching] = useState(false)
  const [adminTopUpUserId, setAdminTopUpUserId] = useState('')
  const [adminTopUpAmount, setAdminTopUpAmount] = useState('')
  const [adminTopUpReason, setAdminTopUpReason] = useState('')
  const [adminConfirmAction, setAdminConfirmAction] = useState<{ label: string; action: () => void } | null>(null)

  // Header auto-hide
  const [headerHidden, setHeaderHidden] = useState(false)
  const lastScrollY = useRef(0)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (authOpen) {
      setMenuOpen(false)
    }
  }, [authOpen])

  const isSignedIn = Boolean(viewer)
  const isAdmin = viewer?.role === 'admin'
  const sortedDirectory = useMemo(() => [...directory].sort((left, right) => right.stats.received - left.stats.received), [directory])
  const viewerLocation = useMemo(() => {
    if (viewer?.city) {
      return `${viewer.city}${viewer.country ? `, ${viewer.country}` : ''}`
    }

    return locationState === 'granted' ? locationLabel : 'Гео не включено'
  }, [locationLabel, locationState, viewer?.city, viewer?.country])
  const selectedAdminUser = useMemo(() => adminUsers.find((item) => item.id === selectedAdminUserId) || null, [adminUsers, selectedAdminUserId])

  const totalUnread = useMemo(() => conversations.reduce((sum, c) => sum + c.unreadCount, 0), [conversations])

  const showToast = (message: string, tone: ToastTone) => {
    setToast({ message, tone })
  }

  const applyBootstrap = (data: BootstrapResponse) => {
    setViewer(data.viewer)
    setPublicFeed(data.publicFeed)
    setInbox(data.inbox)
    setDirectory(data.directory)
    setConversations(data.conversations || [])
    setSiteSettings(data.siteSettings)
    setAdminUsers(data.adminData?.users ?? [])
    setAuditLog(data.adminData?.auditLog ?? [])
  }

  // Header auto-hide on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY
      if (currentY > lastScrollY.current && currentY > 60) {
        setHeaderHidden(true)
      } else {
        setHeaderHidden(false)
      }
      lastScrollY.current = currentY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setSessionToken(getStoredSessionToken())
  }, [])

  useEffect(() => {
    let mounted = true

    const initTelegram = () => {
      if (!mounted) {
        return
      }

      const telegram = window.Telegram?.WebApp
      if (!telegram) {
        return
      }

      telegram.ready()
      telegram.expand()
      setWebApp(telegram)
    }

    if (window.Telegram?.WebApp) {
      initTelegram()
      return () => {
        mounted = false
      }
    }

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-web-app.js'
    script.onload = initTelegram
    document.head.appendChild(script)

    return () => {
      mounted = false
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  useEffect(() => {
    if (locationState === 'idle') {
      requestLocation()
    }
  }, [locationState])

  useEffect(() => {
    let cancelled = false

    const loadBootstrap = async () => {
      try {
        const query = sessionToken ? `/api/bootstrap?token=${encodeURIComponent(sessionToken)}` : '/api/bootstrap'
        const data = await apiRequest<BootstrapResponse>(query)
        if (cancelled) {
          return
        }

        applyBootstrap(data)

        if (!data.viewer && sessionToken) {
          window.localStorage.removeItem(SESSION_KEY)
          setSessionToken('')
        }
      } catch (error) {
        if (!cancelled) {
          showToast(error instanceof Error ? error.message : 'Не удалось загрузить данные', 'error')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadBootstrap()

    return () => {
      cancelled = true
    }
  }, [sessionToken])

  useEffect(() => {
    const socket = new WebSocket(resolveWsUrl())

    socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data) as { type: string; count?: number }
        if (payload.type === 'online') {
          setOnlineCount(payload.count ?? 0)
        }
      } catch {
        // ignore malformed payloads
      }
    })

    return () => socket.close()
  }, [])

  useEffect(() => {
    if (!toast) {
      return undefined
    }

    const timeout = window.setTimeout(() => setToast(null), 2800)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    if (!viewer || resolvedLocation === null || viewer.geoAllowed) {
      return
    }

    void syncLocation(resolvedLocation)
  }, [resolvedLocation, viewer])

  useEffect(() => {
    if (!viewer) {
      return
    }

    setProfileName(viewer.name)
    setProfileHandle(viewer.handle)
    setProfileTagline(viewer.tagline)
    setProfileBio(viewer.bio)
  }, [viewer])

  useEffect(() => {
    if (!selectedAdminUserId && adminUsers.length > 0) {
      setSelectedAdminUserId(adminUsers[0].id)
    }
  }, [adminUsers, selectedAdminUserId])

  useEffect(() => {
    if (!selectedAdminUser) {
      setAdminDraft(null)
      return
    }

    setAdminDraft({
      ...selectedAdminUser,
      badgesText: selectedAdminUser.badges.join(', '),
    })
  }, [selectedAdminUser])

  useEffect(() => {
    if (!siteSettings.telegramAuthEnabled || telegramAuthTried || viewer || sessionToken) {
      return
    }

    if (!webApp?.initDataUnsafe?.user) {
      return
    }

    setTelegramAuthTried(true)
    void signInTelegram(true)
  }, [siteSettings.telegramAuthEnabled, telegramAuthTried, viewer, sessionToken, webApp])

  const syncLocation = async (location: ResolvedLocation) => {
    if (!sessionToken) {
      return
    }

    try {
      const data = await apiRequest<{ viewer: SessionUser }>('/api/location', {
        method: 'POST',
        body: JSON.stringify(location),
      }, sessionToken)
      setViewer((current) => (current ? { ...current, ...data.viewer } : data.viewer))
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось обновить гео', 'error')
    }
  }

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationState('denied')
      setLocationLabel('Гео недоступно')
      showToast('Геолокация недоступна на этом устройстве', 'error')
      return
    }

    setLocationState('loading')
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=jsonv2&accept-language=ru`,
          )
          const data = await response.json()
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.state || 'Город'
          const country = data.address?.country || 'Локация'
          const nextLocation = {
            city,
            country,
            latitude: coords.latitude,
            longitude: coords.longitude,
          }

          setResolvedLocation(nextLocation)
          setLocationState('granted')
          setLocationLabel(`${city}, ${country}`)
          showToast(`Гео включено: ${city}`, 'success')
          if (sessionToken) {
            await syncLocation(nextLocation)
          }
        } catch {
          setLocationState('granted')
          setLocationLabel('Гео включено')
          showToast('Гео включено', 'success')
        }
      },
      () => {
        setLocationState('denied')
        setLocationLabel('Без гео отправка закрыта')
        showToast('Без гео отправка закрыта', 'error')
      },
      { enableHighAccuracy: true, timeout: 12000 },
    )
  }

  const completeAuth = async (data: AuthResponse) => {
    window.localStorage.setItem(SESSION_KEY, data.token)
    setSessionToken(data.token)
    setViewer(data.viewer)
    setAuthOpen(false)
    setActiveTab('chats')
    setEmailName('')
    setEmailValue('')
    setEmailPassword('')
    showToast(`Вход выполнен: ${data.viewer.name}`, 'success')

    if (resolvedLocation && !data.viewer.geoAllowed) {
      await syncLocation(resolvedLocation)
    }
  }

  const widgetContainerRef = useRef<HTMLDivElement>(null)
  const widgetLoadedRef = useRef(false)

  const signInTelegramWidget = useCallback(async (widgetData: Record<string, unknown>) => {
    try {
      const data = await apiRequest<AuthResponse>('/api/auth/telegram-widget', {
        method: 'POST',
        body: JSON.stringify({ ...widgetData, location: resolvedLocation }),
      })
      await completeAuth(data)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Вход через Telegram не выполнен', 'error')
    }
  }, [resolvedLocation])

  // Mount Telegram Login Widget when auth modal opens (for browser users)
  useEffect(() => {
    if (!authOpen || !siteSettings.telegramAuthEnabled) return
    // Skip widget if inside Telegram WebApp
    if (webApp?.initDataUnsafe?.user) return
    if (!widgetContainerRef.current) return
    if (widgetLoadedRef.current) return

    widgetLoadedRef.current = true
    const container = widgetContainerRef.current

    // Global callback for the widget
    ;(window as any).onTelegramWidgetAuth = (user: Record<string, unknown>) => {
      void signInTelegramWidget(user)
    }

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', TELEGRAM_BOT_USERNAME)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '14')
    script.setAttribute('data-onauth', 'onTelegramWidgetAuth(user)')
    script.setAttribute('data-request-access', 'write')
    container.innerHTML = ''
    container.appendChild(script)

    return () => {
      widgetLoadedRef.current = false
      delete (window as any).onTelegramWidgetAuth
    }
  }, [authOpen, siteSettings.telegramAuthEnabled, webApp, signInTelegramWidget])

  const signInTelegram = async (silent = false) => {
    const telegramUser = webApp?.initDataUnsafe?.user
    if (!telegramUser) {
      if (!silent) {
        showToast('Открой приложение через Telegram для этого входа', 'info')
      }
      return
    }

    try {
      const data = await apiRequest<AuthResponse>('/api/auth/telegram', {
        method: 'POST',
        body: JSON.stringify({
          id: telegramUser.id,
          first_name: telegramUser.first_name,
          last_name: telegramUser.last_name,
          username: telegramUser.username,
          photo_url: telegramUser.photo_url,
          initData: webApp?.initData || '',
          initDataUnsafe: webApp?.initDataUnsafe,
          location: resolvedLocation,
        }),
      })
      await completeAuth(data)
    } catch (error) {
      if (!silent) {
        showToast(error instanceof Error ? error.message : 'Вход не выполнен', 'error')
      }
    }
  }

  const signInEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!emailValue.trim() || !emailPassword.trim()) {
      showToast('Заполни почту и пароль', 'info')
      return
    }

    if (authMode === 'register' && !emailName.trim()) {
      showToast('Укажи имя для регистрации', 'info')
      return
    }

    if (authMode === 'register' && emailPassword.trim().length < 6) {
      showToast('Пароль минимум 6 символов', 'info')
      return
    }

    try {
      const data = await apiRequest<AuthResponse>('/api/auth/email', {
        method: 'POST',
        body: JSON.stringify({
          name: emailName.trim(),
          email: emailValue.trim(),
          password: emailPassword,
          location: resolvedLocation,
          mode: authMode,
        }),
      })
      await completeAuth(data)
      if (data.isNewUser) {
        showToast('Аккаунт создан! Добро пожаловать', 'success')
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Ошибка авторизации', 'error')
    }
  }

  const signOut = async () => {
    try {
      if (sessionToken) {
        await apiRequest('/api/session/logout', { method: 'POST' }, sessionToken)
      }
    } catch {
      // ignore logout failure
    }

    window.localStorage.removeItem(SESSION_KEY)
    setSessionToken('')
    setViewer(null)
    setInbox([])
    setConversations([])
    setOpenConvoId(null)
    setChatMessages([])
    setAdminUsers([])
    setAuditLog([])
    setActiveTab('feed')
    showToast('Сессия завершена', 'info')
  }

  // === MESSENGER FUNCTIONS ===

  const openConversation = async (convoId: string) => {
    setOpenConvoId(convoId)
    setIsChatLoading(true)
    setChatMessages([])
    try {
      const data = await apiRequest<{ messages: ChatMessage[]; otherUser: ConversationPreview['otherUser']; isSystem: boolean }>(
        `/api/conversations/${convoId}/messages`, undefined, sessionToken
      )
      setChatMessages(data.messages)
      setChatOtherUser(data.otherUser)
      // Update unread count locally
      setConversations(prev => prev.map(c => c.id === convoId ? { ...c, unreadCount: 0 } : c))
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось загрузить чат', 'error')
      setOpenConvoId(null)
    } finally {
      setIsChatLoading(false)
    }
  }

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages])

  const sendChatMessage = async () => {
    if (!chatText.trim() || !openConvoId || !sessionToken) return
    const text = chatText.trim()
    setChatText('')
    try {
      const data = await apiRequest<{ message: ChatMessage; conversations: ConversationPreview[]; viewerPowers: number }>(
        `/api/conversations/${openConvoId}/messages`,
        { method: 'POST', body: JSON.stringify({ text }) },
        sessionToken
      )
      setChatMessages(prev => [...prev, data.message])
      setConversations(data.conversations)
      // Update viewer powers from economy
      if (typeof data.viewerPowers === 'number') {
        setViewer(prev => prev ? { ...prev, powers: data.viewerPowers } : prev)
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось отправить', 'error')
      setChatText(text)
    }
  }

  const startConversation = async (recipientId: string) => {
    try {
      const data = await apiRequest<{ conversationId: string }>('/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ recipientId }),
      }, sessionToken)
      setComposeOpen(false)
      setComposeSearch('')
      await openConversation(data.conversationId)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось создать чат', 'error')
    }
  }

  const loadRadar = async () => {
    if (!sessionToken) return
    setIsRadarLoading(true)
    try {
      const data = await apiRequest<{ users: RadarUser[] }>('/api/radar', undefined, sessionToken)
      setRadarUsers(data.users)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Радар недоступен', 'error')
    } finally {
      setIsRadarLoading(false)
    }
  }

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} м`
    return `${(meters / 1000).toFixed(1)} км`
  }

  // Admin search users
  const adminSearchUsers = async () => {
    if (!adminSearchQ.trim() || !sessionToken) return
    setAdminSearching(true)
    try {
      const data = await apiRequest<{ users: AdminManagedUser[] }>(`/api/admin/users/search?q=${encodeURIComponent(adminSearchQ.trim())}`, undefined, sessionToken)
      setAdminSearchResults(data.users)
    } catch {
      showToast('Ошибка поиска', 'error')
    } finally {
      setAdminSearching(false)
    }
  }

  // Admin top-up user
  const adminTopUp = async () => {
    if (!adminTopUpUserId || !adminTopUpAmount || !sessionToken) return
    try {
      const data = await apiRequest<BootstrapResponse>('/api/admin/topup', {
        method: 'POST',
        body: JSON.stringify({ userId: adminTopUpUserId, amount: Number(adminTopUpAmount), reason: adminTopUpReason }),
      }, sessionToken)
      applyBootstrap(data)
      showToast(`Баланс обновлён: ${adminTopUpAmount > '0' ? '+' : ''}${adminTopUpAmount}⚡`, 'success')
      setAdminTopUpUserId('')
      setAdminTopUpAmount('')
      setAdminTopUpReason('')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Ошибка', 'error')
    }
  }

  const updateProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!viewer || !sessionToken) {
      showToast('Сначала войди в аккаунт', 'info')
      return
    }

    setIsSavingProfile(true)
    try {
      const data = await apiRequest<BootstrapResponse>('/api/profile/update', {
        method: 'POST',
        body: JSON.stringify({
          name: profileName.trim(),
          handle: normalizeHandle(profileHandle),
          tagline: profileTagline.trim(),
          bio: profileBio.trim(),
        }),
      }, sessionToken)
      applyBootstrap(data)
      showToast('Профиль сохранён', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось сохранить профиль', 'error')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const saveSiteSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!isAdmin || !sessionToken) {
      return
    }

    setIsSavingSite(true)
    try {
      const data = await apiRequest<BootstrapResponse>('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify({ settings: siteSettings }),
      }, sessionToken)
      applyBootstrap(data)
      showToast('Настройки сайта сохранены', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось обновить настройки', 'error')
    } finally {
      setIsSavingSite(false)
    }
  }

  const saveAdminUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!adminDraft || !sessionToken) {
      return
    }

    setIsSavingAdminUser(true)
    try {
      const data = await apiRequest<BootstrapResponse>('/api/admin/users/update', {
        method: 'POST',
        body: JSON.stringify({
          userId: adminDraft.id,
          name: adminDraft.name,
          handle: normalizeHandle(adminDraft.handle),
          powers: adminDraft.powers,
          city: adminDraft.city,
          country: adminDraft.country,
          geoAllowed: adminDraft.geoAllowed,
          role: adminDraft.role,
          status: adminDraft.status,
          isVisible: adminDraft.isVisible,
          bio: adminDraft.bio,
          tagline: adminDraft.tagline,
          badges: adminDraft.badgesText.split(',').map((item) => item.trim()).filter(Boolean),
          preferences: adminDraft.preferences,
        }),
      }, sessionToken)
      applyBootstrap(data)
      showToast(`Пользователь ${adminDraft.handle} обновлён`, 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось обновить пользователя', 'error')
    } finally {
      setIsSavingAdminUser(false)
    }
  }

  const grantAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!grantIdentifier.trim() || !sessionToken) {
      showToast('Укажи id, handle или email', 'info')
      return
    }

    setIsGrantingAdmin(true)
    try {
      const data = await apiRequest<BootstrapResponse>('/api/admin/grant', {
        method: 'POST',
        body: JSON.stringify({ identifier: grantIdentifier.trim() }),
      }, sessionToken)
      applyBootstrap(data)
      setGrantIdentifier('')
      showToast('Админка выдана', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось выдать админку', 'error')
    } finally {
      setIsGrantingAdmin(false)
    }
  }

  const toggleSiteSetting = (key: keyof SiteSettings) => {
    setSiteSettings((current) => ({ ...current, [key]: !current[key] }))
  }

  const toggleAdminPref = (key: keyof UserPreferences) => {
    setAdminDraft((current) => (current ? { ...current, preferences: { ...current.preferences, [key]: !current.preferences[key] } } : current))
  }

  const adjustAdminPowers = (delta: number) => {
    setAdminDraft((current) => (current ? { ...current, powers: Math.max(0, current.powers + delta) } : current))
  }

  if (isLoading) {
    return <div className="loading-screen">Загрузка…</div>
  }

  return (
    <div className={isSignedIn ? 'app-shell has-header' : 'app-shell'}>
      {!introDone && createPortal(
        <div className="intro-overlay" onAnimationEnd={(e) => { if (e.animationName === 'introFadeOut') setIntroDone(true); }}>
          <div className="intro-logo">
            <span className="intro-bracket">&gt;]</span>
            <span className="intro-name">Regellik</span>
          </div>
          <div className="intro-line" />
        </div>,
        document.body
      )}
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <div className="ambient ambient-c" />

      {toast && (
        <div className={`toast-box ${toast.tone}`}>
          <div className="toast-icon" aria-hidden="true">
            {getToastEmoji(toast.tone)}
          </div>
          <div className="toast-content">
            <div className="toast-label">уведомление</div>
            <div className="toast-message">{toast.message}</div>
          </div>
          <div className="toast-progress" aria-hidden="true" />
        </div>
      )}

      {authOpen && (
        <div className="auth-layer">
          <div className="auth-backdrop" onClick={() => setAuthOpen(false)} />
          <section className="auth-sheet">
            <div className="sheet-head">
              <div>
                <span className="eyebrow">{authMode === 'register' ? '📝 Регистрация' : '🔐 Вход'}</span>
                <h2>{authMode === 'register' ? 'Создать аккаунт' : 'Войти в аккаунт'}</h2>
              </div>
              <button className="ghost-icon" onClick={() => setAuthOpen(false)}>
                ×
              </button>
            </div>

            <div className="auth-mode-tabs">
              <button className={authMode === 'login' ? 'auth-mode-tab active' : 'auth-mode-tab'} onClick={() => setAuthMode('login')}>Вход</button>
              <button className={authMode === 'register' ? 'auth-mode-tab active' : 'auth-mode-tab'} onClick={() => setAuthMode('register')}>Регистрация</button>
            </div>

            <div className="auth-stack">
              {webApp?.initDataUnsafe?.user && (
                <button className="auth-card telegram-card" onClick={() => void signInTelegram(false)} disabled={!siteSettings.telegramAuthEnabled}>
                  <div>
                    <div className="auth-title">Войти через Telegram</div>
                    <div className="auth-note">Ты в Telegram — нажми и войдёшь моментально</div>
                  </div>
                  <ChevronRight size={18} />
                </button>
              )}

              {!webApp?.initDataUnsafe?.user && siteSettings.telegramAuthEnabled && (
                <div className="auth-card telegram-widget-card">
                  <div className="auth-title">Войти через Telegram</div>
                  <div className="auth-note">Нажми кнопку ниже — откроется Telegram для подтверждения</div>
                  <div className="telegram-widget-mount" ref={widgetContainerRef} />
                </div>
              )}

              <form className="email-card" onSubmit={signInEmail}>
                <div className="auth-title">{authMode === 'register' ? 'Регистрация по Email' : 'Вход по Email'}</div>
                {authMode === 'register' && (
                  <div className="auth-note">Заполни все поля для создания аккаунта</div>
                )}
                {authMode === 'login' && (
                  <div className="auth-note">Введи email и пароль от существующего аккаунта</div>
                )}

                {authMode === 'register' && (
                  <input value={emailName} onChange={(event) => setEmailName(event.target.value)} placeholder="Имя" required />
                )}
                <input value={emailValue} onChange={(event) => setEmailValue(event.target.value)} placeholder="Email" type="email" required />
                <input value={emailPassword} onChange={(event) => setEmailPassword(event.target.value)} placeholder={authMode === 'register' ? 'Пароль (мин. 6 символов)' : 'Пароль'} type="password" required />

                <button className="primary-btn wide" type="submit" disabled={!siteSettings.emailAuthEnabled}>
                  <Mail size={16} />
                  {authMode === 'register' ? 'Создать аккаунт' : 'Войти'}
                </button>
              </form>

              <div className="auth-switch">
                {authMode === 'login' ? (
                  <span>Нет аккаунта? <button className="auth-switch-btn" onClick={() => setAuthMode('register')}>Зарегистрируйся</button></span>
                ) : (
                  <span>Уже есть аккаунт? <button className="auth-switch-btn" onClick={() => setAuthMode('login')}>Войди</button></span>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Верхняя панель — только для залогиненных */}
      {isSignedIn && (
      <header className={`top-header-bar${authOpen || headerHidden ? ' hidden' : ''}`}>
        <div className="header-row-main">
          <div className="header-left">
            <button className="header-hamburger" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span className="header-brand" onClick={() => { setActiveTab('chats'); setOpenConvoId(null); setMenuOpen(false); }} style={{cursor:'pointer'}}>
              <span className="header-brand-icon">&gt;]</span>Regellik
            </span>
          </div>
          <div className="header-right">
            <div className="header-powers" onClick={() => { setActiveTab('transactions'); setMenuOpen(false); }} style={{cursor:'pointer'}}>
              <Zap size={14} />
              <span>{viewer?.powers ?? 0}</span>
            </div>
            <button className="header-bell-btn" onClick={() => { setActiveTab('chats'); setOpenConvoId(null); setMenuOpen(false); }}>
              <Bell size={17} />
              {totalUnread > 0 && <span className="header-badge">{totalUnread}</span>}
            </button>
            <button className="header-profile-btn" onClick={() => { setActiveTab('profile'); setMenuOpen(false); }}>
              <User size={16} />
            </button>
          </div>
        </div>

        {menuOpen && (
          <>
            <div className="corner-menu-backdrop" onClick={() => setMenuOpen(false)} />
            <nav className="corner-menu-dropdown">
              <div className="corner-menu-header">
                <div className="brand-mark">&gt;]</div>
                <div>
                  <div className="brand-name">Regellik</div>
                  <div className="brand-sub">{siteSettings.onlineCounterVisible ? `${onlineCount} онлайн` : 'анонимки • профили'} {publicFeed.length > 0 ? `• ${publicFeed.length} постов` : ''} {inbox.length > 0 ? `• ${inbox.length} входящих` : ''}</div>
                </div>
              </div>

              {!isSignedIn && (
                <button className="corner-menu-item accent-item" onClick={() => { setMenuOpen(false); setAuthOpen(true) }}>
                  🔽 Зайти в Регель
                </button>
              )}

              {isSignedIn && (
                <>
                  <button className={activeTab === 'chats' ? 'corner-menu-item active' : 'corner-menu-item'} onClick={() => { setActiveTab('chats'); setMenuOpen(false) }}>
                    <MessageCircle size={16} /> Чаты
                  </button>
                  <button className={activeTab === 'profile' ? 'corner-menu-item active' : 'corner-menu-item'} onClick={() => { setActiveTab('profile'); setMenuOpen(false) }}>
                    <User size={16} /> Профиль
                  </button>
                  <button className={activeTab === 'transactions' ? 'corner-menu-item active' : 'corner-menu-item'} onClick={() => { setActiveTab('transactions'); setMenuOpen(false) }}>
                    <Wallet size={16} /> Транзакции
                  </button>
                  {isAdmin && (
                    <button className={activeTab === 'admin' ? 'corner-menu-item active' : 'corner-menu-item'} onClick={() => { setActiveTab('admin'); setMenuOpen(false) }}>
                      <UserCog size={16} /> Админка
                    </button>
                  )}
                  <div className="corner-menu-divider" />
                  <button className="corner-menu-item danger-item" onClick={() => { setMenuOpen(false); void signOut() }}>
                    <LogOut size={16} /> Выйти
                  </button>
                </>
              )}
            </nav>
          </>
        )}
      </header>
      )}

      {/* --- ГЛАВНАЯ (для всех, без табов пока не залогинен) --- */}
      {!isSignedIn && activeTab === 'feed' && (
        <main className="landing-page">
          <section className="landing-center">
            <div className="landing-logo">
              <div className="landing-logo-icon">&gt;]</div>
              <div className="landing-logo-text">Regellik</div>
            </div>

            <h1 className="welcome-heading">добро пожаловать</h1>
            <p className="welcome-sub">анонимки • профили • транзакции</p>

            <button className="landing-cta" onClick={() => setAuthOpen(true)}>
              Зайти в Регель
            </button>
          </section>

          <div className="landing-marquee">
            <div className="landing-marquee-track">
              <span>здесь качели публичных анонимных</span>
              <span>•</span>
              <span>отправляй анонимки — получай ответы</span>
              <span>•</span>
              <span>зарабатывай на рефералах</span>
              <span>•</span>
              <span>здесь качели публичных анонимных</span>
              <span>•</span>
              <span>отправляй анонимки — получай ответы</span>
              <span>•</span>
              <span>зарабатывай на рефералах</span>
            </div>
          </div>

          <footer className="app-footer">
            <span>&gt;]Regellik 2026</span>
            <span>Нормативы</span>
            <span>О нас</span>
            <span>FAQ</span>
            <span>Связаться</span>
          </footer>
        </main>
      )}

      {/* --- ОСНОВНОЙ КОНТЕНТ (залогинен) --- */}
      {isSignedIn && (
        <>
          <main className="main-layout">
            {/* --- ЧАТЫ (мессенджер) --- */}
            {activeTab === 'chats' && !openConvoId && (
              <section className="chats-screen page-transition">
                <div className="chats-header-row">
                  <h2 className="chats-title">Чаты</h2>
                  <div className="chats-header-actions">
                    <button className="chats-radar-btn" onClick={() => { setActiveTab('feed'); void loadRadar(); }} title="Радар">
                      <Radar size={18} />
                    </button>
                  </div>
                </div>

                {conversations.length === 0 && (
                  <div className="chats-empty">
                    <MessageCircle size={40} />
                    <p>Пока нет чатов</p>
                    <span>Нажми кнопку ✏️ чтобы начать разговор</span>
                  </div>
                )}

                <div className="conversation-list">
                  {conversations.map((convo) => (
                    <button key={convo.id} className="conversation-item" onClick={() => openConversation(convo.id)}>
                      <div className="convo-avatar">
                        {convo.isSystem ? (
                          <span className="convo-avatar-system">&gt;]</span>
                        ) : convo.otherUser?.avatarUrl ? (
                          <img src={convo.otherUser.avatarUrl} alt="" />
                        ) : (
                          <span>{convo.otherUser?.name?.[0] || '?'}</span>
                        )}
                      </div>
                      <div className="convo-body">
                        <div className="convo-top">
                          <strong>{convo.isSystem ? '>]Regellik' : convo.otherUser?.name || 'Пользователь'}</strong>
                          <small>{convo.lastMessage ? formatRelativeTime(convo.lastMessage.createdAt) : ''}</small>
                        </div>
                        <div className="convo-bottom">
                          <span className="convo-preview">{convo.lastMessage?.text || 'Нет сообщений'}</span>
                          {convo.unreadCount > 0 && <span className="convo-unread">{convo.unreadCount}</span>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Compose FAB */}
                <button className="compose-fab" onClick={() => setComposeOpen(true)}>
                  <PenSquare size={22} />
                </button>

                {/* Compose modal */}
                {composeOpen && (
                  <div className="compose-modal">
                    <div className="compose-modal-backdrop" onClick={() => { setComposeOpen(false); setComposeSearch(''); }} />
                    <div className="compose-modal-sheet">
                      <div className="compose-modal-head">
                        <h3>Новый чат</h3>
                        <button className="ghost-icon" onClick={() => { setComposeOpen(false); setComposeSearch(''); }}>×</button>
                      </div>
                      <div className="compose-search-row">
                        <Search size={16} />
                        <input value={composeSearch} onChange={e => setComposeSearch(e.target.value)} placeholder="Поиск по имени или handle..." autoFocus />
                      </div>
                      <div className="compose-user-list">
                        {sortedDirectory
                          .filter(u => u.id !== viewer?.id && (
                            u.name.toLowerCase().includes(composeSearch.toLowerCase()) ||
                            u.handle.toLowerCase().includes(composeSearch.toLowerCase())
                          ))
                          .map(u => (
                            <button key={u.id} className="compose-user-item" onClick={() => void startConversation(u.id)}>
                              <div className="compose-user-avatar">
                                {u.avatarUrl ? <img src={u.avatarUrl} alt="" /> : <span>{u.name[0]}</span>}
                              </div>
                              <div>
                                <strong>{u.name}</strong>
                                <span>{u.handle}</span>
                              </div>
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* --- ОТКРЫТЫЙ ЧАТ --- */}
            {activeTab === 'chats' && openConvoId && (
              <section className="chat-window page-transition">
                <div className="chat-window-header">
                  <button className="chat-back-btn" onClick={() => setOpenConvoId(null)}>
                    <ArrowLeft size={20} />
                  </button>
                  <div className="chat-header-user">
                    {chatOtherUser?.avatarUrl ? (
                      <img className="chat-header-avatar" src={chatOtherUser.avatarUrl} alt="" />
                    ) : (
                      <div className="chat-header-avatar-placeholder">
                        {conversations.find(c => c.id === openConvoId)?.isSystem ? '>]' : chatOtherUser?.name?.[0] || '?'}
                      </div>
                    )}
                    <div>
                      <strong>{conversations.find(c => c.id === openConvoId)?.isSystem ? '>]Regellik' : chatOtherUser?.name || 'Чат'}</strong>
                      <small>{chatOtherUser?.handle || ''}</small>
                    </div>
                  </div>
                </div>

                <div className="chat-messages-area">
                  {isChatLoading && <div className="chat-loading">Загрузка...</div>}
                  {chatMessages.map(msg => (
                    <div key={msg.id} className={msg.senderId === viewer?.id ? 'chat-bubble mine' : 'chat-bubble theirs'}>
                      <p>{msg.text}</p>
                      <small>{formatRelativeTime(msg.createdAt)}</small>
                    </div>
                  ))}
                  <div ref={chatBottomRef} />
                </div>

                <div className="chat-input-bar">
                  <input
                    value={chatText}
                    onChange={e => setChatText(e.target.value)}
                    placeholder="Сообщение..."
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendChatMessage(); } }}
                  />
                  <button className="chat-send-btn" onClick={() => void sendChatMessage()} disabled={!chatText.trim()}>
                    <Send size={18} />
                  </button>
                </div>
              </section>
            )}

            {/* --- РАДАР --- */}
            {activeTab === 'feed' && (
              <section className="radar-screen page-transition">
                <div className="radar-header">
                  <button className="chat-back-btn" onClick={() => setActiveTab('chats')}>
                    <ArrowLeft size={20} />
                  </button>
                  <h2>Радар</h2>
                  <button className="secondary-btn" onClick={() => void loadRadar()} disabled={isRadarLoading}>
                    {isRadarLoading ? '...' : 'Обновить'}
                  </button>
                </div>
                <p className="radar-desc">Люди рядом с тобой (до 50 км)</p>

                {radarUsers.length === 0 && !isRadarLoading && (
                  <div className="chats-empty">
                    <Radar size={40} />
                    <p>Никого не найдено рядом</p>
                    <span>Убедись что геолокация включена</span>
                  </div>
                )}

                <div className="radar-list">
                  {radarUsers.map(u => (
                    <button key={u.id} className="radar-user-card" onClick={() => void startConversation(u.id)}>
                      <div className="radar-user-avatar">
                        {u.avatarUrl ? <img src={u.avatarUrl} alt="" /> : <span>{u.name[0]}</span>}
                      </div>
                      <div className="radar-user-info">
                        <strong>{u.name}</strong>
                        <span>{u.handle}</span>
                        {u.tagline && <span className="radar-tagline">{u.tagline}</span>}
                      </div>
                      <div className="radar-distance">
                        <MapPin size={14} />
                        <span>{formatDistance(u.distance)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* --- ПРОФИЛЬ --- */}
            {activeTab === 'profile' && viewer && (
              <section className="profile-screen deep-profile-screen page-transition">
                <article className="panel-card profile-hero">
                  <div className="profile-hero-main">
                    <div className="profile-avatar-large">
                      {viewer.avatarUrl ? <img src={viewer.avatarUrl} alt={viewer.name} /> : <span>{viewer.name[0]}</span>}
                    </div>
                    <div>
                      <span className="eyebrow">👤 аккаунт</span>
                      <h2>{viewer.name}</h2>
                      <div className="profile-subline">
                        <span>{viewer.handle}</span>
                        <span className="dot-separator" />
                        <span>{viewer.provider === 'telegram' ? 'Telegram' : 'Email'}</span>
                        <span className="dot-separator" />
                        <span>{viewer.role === 'admin' ? 'admin' : 'user'}</span>
                      </div>
                      <div className="geo-row strong-row">
                        <MapPin size={14} />
                        <span>{viewerLocation}</span>
                      </div>
                    </div>
                  </div>
                </article>

                {/* Суточные лимиты */}
                <article className="panel-card limits-card">
                  <div className="panel-head">
                    <div>
                      <span className="eyebrow">📊 суточные лимиты</span>
                      <h2>Regellik+ <span className="premium-badge">premium</span></h2>
                    </div>
                  </div>
                  <div className="limits-grid">
                    <div className="limit-row">
                      <div className="limit-label">
                        <Send size={16} />
                        <span>Отправка</span>
                      </div>
                      <div className="limit-bar">
                        <div className="limit-fill" style={{ width: `${Math.min(100, (viewer.stats.sent / 50) * 100)}%` }} />
                      </div>
                      <strong>{viewer.stats.sent}/50</strong>
                    </div>
                    <div className="limit-row">
                      <div className="limit-label">
                        <Mail size={16} />
                        <span>Получение</span>
                      </div>
                      <div className="limit-bar">
                        <div className="limit-fill blue-fill" style={{ width: `${Math.min(100, (viewer.stats.received / 50) * 100)}%` }} />
                      </div>
                      <strong>{viewer.stats.received}/50</strong>
                    </div>
                  </div>
                  <div className="limits-note">
                    <span>💡 Бесплатная версия: 1 отправка и 1 получение в сутки. Если получатель не оплатил вовремя — анонимка не доставляется.</span>
                  </div>
                </article>

                {/* Статистика */}
                <div className="profile-stats-grid">
                  <article className="profile-stat-box green-box">
                    <span>отправлено</span>
                    <strong>{viewer.stats.sent}</strong>
                  </article>
                  <article className="profile-stat-box blue-box">
                    <span>получено</span>
                    <strong>{viewer.stats.received}</strong>
                  </article>
                  <article className="profile-stat-box orange-box">
                    <span>открыто</span>
                    <strong>{viewer.stats.opened}</strong>
                  </article>
                  <article className="profile-stat-box lime-box">
                    <span>рефералы</span>
                    <strong>{viewer.stats.referrals}</strong>
                  </article>
                </div>

                {/* Рефералы */}
                <article className="panel-card referral-card">
                  <div className="panel-head">
                    <div>
                      <span className="eyebrow">🔗 рефералы</span>
                      <h2>Пригласи друзей</h2>
                    </div>
                  </div>
                  <p className="hero-card-copy">
                    Приглашай друзей по ссылке. Реферальная программа без денежных бонусов — только статистика.
                  </p>
                  {viewer.referralCode && (
                    <div className="referral-link-block">
                      <span className="referral-link-label">Твоя реферальная ссылка:</span>
                      <div className="referral-link-row">
                        <code className="referral-link-code">{`${window.location.origin}?ref=${viewer.referralCode}`}</code>
                        <button className="referral-copy-btn" type="button" onClick={() => {
                          void navigator.clipboard.writeText(`${window.location.origin}?ref=${viewer.referralCode}`)
                          showToast('Ссылка скопирована!', 'success')
                        }}>
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="referral-stats">
                    <div className="referral-stat">
                      <Users size={20} />
                      <strong>{viewer.stats.referrals}</strong>
                      <span>приглашённых</span>
                    </div>
                  </div>
                </article>

                {/* Редактирование профиля */}
                <form className="panel-card profile-editor-card" onSubmit={updateProfile}>
                  <div className="panel-head">
                    <div>
                      <span className="eyebrow">📝 редактирование</span>
                      <h2>Профиль</h2>
                    </div>
                    <button className="primary-btn" type="submit" disabled={isSavingProfile || !siteSettings.profileEditEnabled}>
                      <Save size={16} />
                      {isSavingProfile ? 'Сохранение...' : 'Сохранить'}
                    </button>
                  </div>

                  <div className="field-grid-2">
                    <label className="input-block">
                      <span>Имя</span>
                      <input value={profileName} onChange={(event) => setProfileName(event.target.value)} />
                    </label>
                    <label className="input-block">
                      <span>Handle</span>
                      <input value={profileHandle} onChange={(event) => setProfileHandle(normalizeHandle(event.target.value))} />
                    </label>
                  </div>

                  <label className="input-block">
                    <span>Короткая строка</span>
                    <input value={profileTagline} onChange={(event) => setProfileTagline(event.target.value)} />
                  </label>

                  <label className="input-block">
                    <span>О себе</span>
                    <textarea value={profileBio} onChange={(event) => setProfileBio(event.target.value)} />
                  </label>
                </form>

                {/* Инфо */}
                <article className="panel-card profile-meta-card">
                  <div className="meta-row">
                    <span>ID профиля</span>
                    <strong>#{viewer.numericId || '—'}</strong>
                  </div>
                  {viewer.telegramId && (
                    <div className="meta-row">
                      <span>Telegram ID</span>
                      <strong>{viewer.telegramId}</strong>
                    </div>
                  )}
                  <div className="meta-row">
                    <span>статус</span>
                    <strong>{viewer.status}</strong>
                  </div>
                  <div className="meta-row">
                    <span>контакт</span>
                    <strong>{viewer.email || 'Telegram'}</strong>
                  </div>
                  <div className="meta-row">
                    <span>дата регистрации</span>
                    <strong>{formatDate(viewer.joinedAt)}</strong>
                  </div>
                  <div className="meta-row">
                    <span>бейджи</span>
                    <strong>{viewer.badges.length ? viewer.badges.join(', ') : 'пока нет'}</strong>
                  </div>
                </article>

                <footer className="app-footer">
                  <span>Нормы и Согласие</span>
                  <span>•</span>
                  <span>Обратная связь</span>
                  <span>•</span>
                  <span>О Нас</span>
                </footer>
              </section>
            )}

            {/* --- ТРАНЗАКЦИИ --- */}
            {activeTab === 'transactions' && (
              <section className="transactions-screen page-transition">
                <article className="panel-card">
                  <div className="panel-head">
                    <div>
                      <span className="eyebrow">💰 баланс</span>
                      <h2>Энергия ⚡</h2>
                    </div>
                  </div>
                  <div className="balance-hero">
                    <div className="balance-hero-amount">
                      <Zap size={28} />
                      <span>{viewer?.powers ?? 0}</span>
                    </div>
                    <small>powers</small>
                  </div>

                  <div className="economy-info-grid">
                    <div className="economy-info-item">
                      <Send size={16} />
                      <div>
                        <strong>−{siteSettings.messageCost}⚡</strong>
                        <span>за отправку сообщения</span>
                      </div>
                    </div>
                    <div className="economy-info-item">
                      <MessageCircle size={16} />
                      <div>
                        <strong>+{siteSettings.messageEarn}⚡</strong>
                        <span>за полученное сообщение</span>
                      </div>
                    </div>
                  </div>

                  <button className="topup-cta-btn" onClick={() => setTopUpOpen(true)}>
                    <Plus size={18} />
                    Пополнить баланс
                  </button>
                </article>

                <article className="panel-card">
                  <div className="panel-head">
                    <div>
                      <span className="eyebrow">📊 статистика</span>
                      <h2>Активность</h2>
                    </div>
                  </div>
                  <div className="stats-mini-grid">
                    <div className="stats-mini-item">
                      <strong>{viewer?.stats.sent ?? 0}</strong>
                      <span>отправлено</span>
                    </div>
                    <div className="stats-mini-item">
                      <strong>{viewer?.stats.received ?? 0}</strong>
                      <span>получено</span>
                    </div>
                    <div className="stats-mini-item">
                      <strong>{viewer?.stats.referrals ?? 0}</strong>
                      <span>рефералов</span>
                    </div>
                  </div>
                </article>

                {/* Top-up modal */}
                {topUpOpen && (
                  <div className="compose-modal">
                    <div className="compose-modal-backdrop" onClick={() => setTopUpOpen(false)} />
                    <div className="compose-modal-sheet topup-sheet">
                      <div className="compose-modal-head">
                        <h3>Пополнить баланс</h3>
                        <button className="ghost-icon" onClick={() => setTopUpOpen(false)}>×</button>
                      </div>
                      <p className="topup-desc">Выбери сумму пополнения ⚡</p>
                      <div className="topup-options-grid">
                        {(siteSettings.topUpOptions || [10, 50, 100, 250, 500, 1000]).map(amount => (
                          <button key={amount} className="topup-option-btn" onClick={() => {
                            showToast(`Пополнение на ${amount}⚡ — скоро будет доступно!`, 'info')
                            setTopUpOpen(false)
                          }}>
                            <Zap size={16} />
                            <span>{amount}</span>
                          </button>
                        ))}
                      </div>
                      <div className="topup-note">
                        <span>💡 Оплата скоро станет доступна. Следи за обновлениями!</span>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* --- АДМИНКА --- */}
            {activeTab === 'admin' && isAdmin && (
              <section className="admin-screen page-transition">

                {/* Admin header */}
                <div className="admin-top-bar">
                  <h2 className="admin-top-title"><ShieldCheck size={20} /> Панель администратора</h2>
                </div>

                {/* Quick search */}
                <article className="panel-card admin-search-card">
                  <div className="panel-head">
                    <div>
                      <span className="eyebrow">🔍 поиск</span>
                      <h2>Найти пользователя</h2>
                    </div>
                  </div>
                  <div className="admin-search-row">
                    <div className="admin-search-input-wrap">
                      <Hash size={15} />
                      <input
                        value={adminSearchQ}
                        onChange={e => setAdminSearchQ(e.target.value)}
                        placeholder="ID, handle, email, имя..."
                        onKeyDown={e => { if (e.key === 'Enter') void adminSearchUsers() }}
                      />
                    </div>
                    <button className="primary-btn" onClick={() => void adminSearchUsers()} disabled={adminSearching}>
                      <Search size={16} />
                      {adminSearching ? '...' : 'Найти'}
                    </button>
                  </div>
                  {adminSearchResults.length > 0 && (
                    <div className="admin-search-results">
                      {adminSearchResults.map(u => (
                        <button key={u.id} className={selectedAdminUserId === u.id ? 'admin-search-result-item active' : 'admin-search-result-item'} onClick={() => setSelectedAdminUserId(u.id)}>
                          <div className="admin-sr-left">
                            <strong>{u.name}</strong>
                            <span>{u.handle}</span>
                          </div>
                          <div className="admin-sr-right">
                            <span className={`admin-sr-badge ${u.role}`}>{u.role}</span>
                            <span className="admin-sr-powers"><Zap size={12} /> {u.powers}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </article>

                <div className="admin-grid">
                  <div className="admin-left-column">

                    {/* Economy settings */}
                    <form className="panel-card admin-economy-card" onSubmit={saveSiteSettings}>
                      <div className="panel-head">
                        <div>
                          <span className="eyebrow">💰 экономика</span>
                          <h2>Настройки экономики</h2>
                        </div>
                        <button className="primary-btn" type="submit" disabled={isSavingSite}>
                          <Save size={16} />
                          {isSavingSite ? '...' : 'Сохранить'}
                        </button>
                      </div>
                      <div className="field-grid-2">
                        <label className="input-block">
                          <span>Стоимость сообщения ⚡</span>
                          <input type="number" step="0.01" min="0" value={siteSettings.messageCost} onChange={e => setSiteSettings(s => ({ ...s, messageCost: Number(e.target.value) || 0 }))} />
                        </label>
                        <label className="input-block">
                          <span>Заработок за сообщение ⚡</span>
                          <input type="number" step="0.01" min="0" value={siteSettings.messageEarn} onChange={e => setSiteSettings(s => ({ ...s, messageEarn: Number(e.target.value) || 0 }))} />
                        </label>
                      </div>
                      <label className="input-block">
                        <span>Суммы пополнения (через запятую)</span>
                        <input value={(siteSettings.topUpOptions || []).join(', ')} onChange={e => setSiteSettings(s => ({ ...s, topUpOptions: e.target.value.split(',').map(v => Number(v.trim())).filter(v => v > 0) }))} />
                      </label>
                    </form>

                    {/* Site settings */}
                    <form className="panel-card admin-settings-card" onSubmit={saveSiteSettings}>
                      <div className="panel-head">
                        <div>
                          <span className="eyebrow">⚙️ сайт</span>
                          <h2>Настройки</h2>
                        </div>
                        <button className="primary-btn" type="submit" disabled={isSavingSite}>
                          <Save size={16} />
                          {isSavingSite ? '...' : 'Сохранить'}
                        </button>
                      </div>
                      <div className="toggle-grid admin-toggle-grid">
                        <button className={siteSettings.telegramAuthEnabled ? 'toggle-card active' : 'toggle-card'} type="button" onClick={() => toggleSiteSetting('telegramAuthEnabled')}>
                          <ShieldCheck size={16} />
                          <span>TG auth</span>
                        </button>
                        <button className={siteSettings.emailAuthEnabled ? 'toggle-card active' : 'toggle-card'} type="button" onClick={() => toggleSiteSetting('emailAuthEnabled')}>
                          <Mail size={16} />
                          <span>Email</span>
                        </button>
                        <button className={siteSettings.geoRequiredForSend ? 'toggle-card active' : 'toggle-card'} type="button" onClick={() => toggleSiteSetting('geoRequiredForSend')}>
                          <MapPin size={16} />
                          <span>Geo req</span>
                        </button>
                        <button className={siteSettings.registrationsOpen ? 'toggle-card active' : 'toggle-card'} type="button" onClick={() => toggleSiteSetting('registrationsOpen')}>
                          <Users size={16} />
                          <span>Регистрация</span>
                        </button>
                        <button className={siteSettings.maintenanceMode ? 'toggle-card active danger' : 'toggle-card'} type="button" onClick={() => toggleSiteSetting('maintenanceMode')}>
                          <Settings2 size={16} />
                          <span>Тех. работы</span>
                        </button>
                        <button className={siteSettings.onlineCounterVisible ? 'toggle-card active' : 'toggle-card'} type="button" onClick={() => toggleSiteSetting('onlineCounterVisible')}>
                          <Zap size={16} />
                          <span>Онлайн</span>
                        </button>
                        <button className={siteSettings.publicFeedVisible ? 'toggle-card active' : 'toggle-card'} type="button" onClick={() => toggleSiteSetting('publicFeedVisible')}>
                          <MessageCircle size={16} />
                          <span>Лента</span>
                        </button>
                        <button className={siteSettings.inboxEnabled ? 'toggle-card active' : 'toggle-card'} type="button" onClick={() => toggleSiteSetting('inboxEnabled')}>
                          <Mail size={16} />
                          <span>Личка</span>
                        </button>
                        <button className={siteSettings.devBadgeVisible ? 'toggle-card active' : 'toggle-card'} type="button" onClick={() => toggleSiteSetting('devBadgeVisible')}>
                          <BadgeCheck size={16} />
                          <span>DEV badge</span>
                        </button>
                        <button className={siteSettings.profileEditEnabled ? 'toggle-card active' : 'toggle-card'} type="button" onClick={() => toggleSiteSetting('profileEditEnabled')}>
                          <User size={16} />
                          <span>Редактирование</span>
                        </button>
                      </div>
                    </form>

                    {/* Grant admin */}
                    <form className="panel-card admin-grant-card" onSubmit={grantAdmin}>
                      <div className="panel-head">
                        <div>
                          <span className="eyebrow">🛡️ выдача</span>
                          <h2>Роль admin</h2>
                        </div>
                      </div>
                      <label className="input-block">
                        <span>ID, handle или email</span>
                        <input value={grantIdentifier} onChange={(event) => setGrantIdentifier(event.target.value)} placeholder="@user или email" />
                      </label>
                      <button className="primary-btn wide" type="submit" disabled={isGrantingAdmin} onClick={() => setAdminConfirmAction(null)}>
                        <ShieldCheck size={16} />
                        {isGrantingAdmin ? 'Выдаю...' : 'Выдать admin'}
                      </button>
                    </form>

                    {/* Admin top-up */}
                    <article className="panel-card admin-topup-card">
                      <div className="panel-head">
                        <div>
                          <span className="eyebrow">⚡ начисление</span>
                          <h2>Top-up пользователю</h2>
                        </div>
                      </div>
                      <label className="input-block">
                        <span>User ID</span>
                        <input value={adminTopUpUserId} onChange={e => setAdminTopUpUserId(e.target.value)} placeholder="id пользователя" />
                      </label>
                      <div className="field-grid-2">
                        <label className="input-block">
                          <span>Сумма ⚡</span>
                          <input type="number" step="0.01" value={adminTopUpAmount} onChange={e => setAdminTopUpAmount(e.target.value)} placeholder="+100 или -50" />
                        </label>
                        <label className="input-block">
                          <span>Причина</span>
                          <input value={adminTopUpReason} onChange={e => setAdminTopUpReason(e.target.value)} placeholder="опционально" />
                        </label>
                      </div>
                      <button className="primary-btn wide" type="button" onClick={() => {
                        setAdminConfirmAction({
                          label: `${Number(adminTopUpAmount) > 0 ? '+' : ''}${adminTopUpAmount}⚡ пользователю ${adminTopUpUserId}`,
                          action: () => { void adminTopUp(); setAdminConfirmAction(null) }
                        })
                      }} disabled={!adminTopUpUserId || !adminTopUpAmount}>
                        <DollarSign size={16} />
                        Начислить
                      </button>
                    </article>

                    {/* Audit log */}
                    <article className="panel-card audit-card">
                      <div className="panel-head">
                        <div>
                          <span className="eyebrow">📜 журнал</span>
                          <h2>Audit log</h2>
                        </div>
                      </div>
                      <div className="audit-list">
                        {auditLog.slice(0, 30).map((item) => (
                          <div key={item.id} className="audit-item">
                            <strong>{item.action}</strong>
                            <span>{item.details}</span>
                            <small>{formatRelativeTime(item.createdAt)}</small>
                          </div>
                        ))}
                        {auditLog.length === 0 && <div className="chats-empty" style={{padding: '20px'}}><p>Лог пуст</p></div>}
                      </div>
                    </article>
                  </div>

                  <div className="admin-right-column">
                    {/* Users list */}
                    <article className="panel-card admin-users-card">
                      <div className="panel-head">
                        <div>
                          <span className="eyebrow">👥 пользователи ({adminUsers.length})</span>
                          <h2>Управление</h2>
                        </div>
                      </div>
                      <div className="admin-user-list">
                        {adminUsers.map((item) => (
                          <button
                            key={item.id}
                            className={selectedAdminUserId === item.id ? 'admin-user-item active' : 'admin-user-item'}
                            onClick={() => setSelectedAdminUserId(item.id)}
                          >
                            <div className="admin-user-left">
                              <strong>{item.name}</strong>
                              <span className="admin-user-handle">{item.handle}</span>
                            </div>
                            <div className="admin-user-meta">
                              <span className={`admin-role-pill ${item.role}`}>{item.role}</span>
                              <span className={`admin-status-pill ${item.status}`}>{item.status}</span>
                              <span className="admin-powers-pill"><Zap size={11} /> {item.powers}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </article>

                    {/* User editor */}
                    {adminDraft && (
                      <form className="panel-card admin-editor-card" onSubmit={saveAdminUser}>
                        <div className="panel-head">
                          <div>
                            <span className="eyebrow">🛠️ редактор</span>
                            <h2>{adminDraft.name}</h2>
                          </div>
                          <button className="primary-btn" type="button" onClick={() => {
                            setAdminConfirmAction({
                              label: `Сохранить изменения для ${adminDraft.name}`,
                              action: () => {
                                const form = document.querySelector<HTMLFormElement>('.admin-editor-card')
                                if (form) form.requestSubmit()
                                setAdminConfirmAction(null)
                              }
                            })
                          }} disabled={isSavingAdminUser}>
                            <Save size={16} />
                            {isSavingAdminUser ? '...' : 'Сохранить'}
                          </button>
                        </div>

                        <div className="admin-editor-id-row">
                          <span className="admin-editor-id">ID: {adminDraft.id}</span>
                          <button type="button" className="ghost-icon" onClick={() => {
                            void navigator.clipboard.writeText(adminDraft.id)
                            showToast('ID скопирован', 'success')
                          }}><Copy size={12} /></button>
                        </div>

                        <div className="field-grid-3">
                          <label className="input-block">
                            <span>Имя</span>
                            <input value={adminDraft.name} onChange={(event) => setAdminDraft((current) => (current ? { ...current, name: event.target.value } : current))} />
                          </label>
                          <label className="input-block">
                            <span>Handle</span>
                            <input value={adminDraft.handle} onChange={(event) => setAdminDraft((current) => (current ? { ...current, handle: event.target.value } : current))} />
                          </label>
                          <label className="input-block">
                            <span>Баланс ⚡</span>
                            <input type="number" value={adminDraft.powers} onChange={(event) => setAdminDraft((current) => (current ? { ...current, powers: Number(event.target.value) || 0 } : current))} />
                          </label>
                        </div>

                        <div className="quick-actions-row">
                          <button className="secondary-btn danger" type="button" onClick={() => adjustAdminPowers(-100)}>−100</button>
                          <button className="secondary-btn danger" type="button" onClick={() => adjustAdminPowers(-10)}>−10</button>
                          <button className="secondary-btn" type="button" onClick={() => adjustAdminPowers(10)}>+10</button>
                          <button className="secondary-btn" type="button" onClick={() => adjustAdminPowers(100)}>+100</button>
                          <button className="secondary-btn" type="button" onClick={() => adjustAdminPowers(500)}>+500</button>
                        </div>

                        <div className="field-grid-2">
                          <label className="input-block">
                            <span>Город</span>
                            <input value={adminDraft.city || ''} onChange={(event) => setAdminDraft((current) => (current ? { ...current, city: event.target.value } : current))} />
                          </label>
                          <label className="input-block">
                            <span>Страна</span>
                            <input value={adminDraft.country || ''} onChange={(event) => setAdminDraft((current) => (current ? { ...current, country: event.target.value } : current))} />
                          </label>
                        </div>

                        <div className="field-grid-2">
                          <label className="input-block">
                            <span>Роль</span>
                            <select value={adminDraft.role} onChange={(event) => setAdminDraft((current) => (current ? { ...current, role: event.target.value as UserRole } : current))}>
                              <option value="user">user</option>
                              <option value="admin">admin</option>
                            </select>
                          </label>
                          <label className="input-block">
                            <span>Статус</span>
                            <select value={adminDraft.status} onChange={(event) => setAdminDraft((current) => (current ? { ...current, status: event.target.value as UserStatus } : current))}>
                              <option value="active">active</option>
                              <option value="suspended">suspended</option>
                            </select>
                          </label>
                        </div>

                        <label className="input-block">
                          <span>Tagline</span>
                          <input value={adminDraft.tagline} onChange={(event) => setAdminDraft((current) => (current ? { ...current, tagline: event.target.value } : current))} />
                        </label>

                        <label className="input-block">
                          <span>Bio</span>
                          <textarea value={adminDraft.bio} onChange={(event) => setAdminDraft((current) => (current ? { ...current, bio: event.target.value } : current))} />
                        </label>

                        <label className="input-block">
                          <span>Бейджи</span>
                          <input value={adminDraft.badgesText} onChange={(event) => setAdminDraft((current) => (current ? { ...current, badgesText: event.target.value } : current))} />
                        </label>

                        <div className="toggle-grid admin-toggle-grid">
                          <button className={adminDraft.isVisible ? 'toggle-card active' : 'toggle-card danger'} type="button" onClick={() => setAdminDraft((current) => (current ? { ...current, isVisible: !current.isVisible } : current))}>
                            {adminDraft.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                            <span>Видимость</span>
                          </button>
                          <button className={adminDraft.geoAllowed ? 'toggle-card active' : 'toggle-card danger'} type="button" onClick={() => setAdminDraft((current) => (current ? { ...current, geoAllowed: !current.geoAllowed } : current))}>
                            <MapPin size={16} />
                            <span>Гео</span>
                          </button>
                          <button className={adminDraft.preferences.allowInbox ? 'toggle-card active' : 'toggle-card'} type="button" onClick={() => toggleAdminPref('allowInbox')}>
                            <MessageCircle size={16} />
                            <span>Личка</span>
                          </button>
                          <button className={adminDraft.preferences.showCity ? 'toggle-card active' : 'toggle-card'} type="button" onClick={() => toggleAdminPref('showCity')}>
                            <MapPin size={16} />
                            <span>Город</span>
                          </button>
                          <button className={adminDraft.preferences.neonProfile ? 'toggle-card active' : 'toggle-card'} type="button" onClick={() => toggleAdminPref('neonProfile')}>
                            <Sparkles size={16} />
                            <span>Неон</span>
                          </button>
                          <button className={adminDraft.preferences.emailAlerts ? 'toggle-card active' : 'toggle-card'} type="button" onClick={() => toggleAdminPref('emailAlerts')}>
                            <Bell size={16} />
                            <span>Email alerts</span>
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>

                {/* Confirmation modal */}
                {adminConfirmAction && (
                  <div className="compose-modal">
                    <div className="compose-modal-backdrop" onClick={() => setAdminConfirmAction(null)} />
                    <div className="compose-modal-sheet admin-confirm-sheet">
                      <div className="admin-confirm-content">
                        <div className="admin-confirm-icon">⚠️</div>
                        <h3>Подтвердить действие?</h3>
                        <p>{adminConfirmAction.label}</p>
                        <div className="admin-confirm-btns">
                          <button className="secondary-btn" onClick={() => setAdminConfirmAction(null)}>Отмена</button>
                          <button className="primary-btn" onClick={adminConfirmAction.action}>Подтвердить</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}
          </main>
        </>
      )}

      {siteSettings.devBadgeVisible && (
        <a className="dev-float" href="https://t.me/PALMARON" target="_blank" rel="noreferrer">
          <span className="dev-dot" />
          <span>DEV TG @PALMARON</span>
        </a>
      )}
    </div>
  )
}

export default App
