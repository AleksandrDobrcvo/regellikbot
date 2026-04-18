import type { FormEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  Bell,
  Camera,
  ChevronDown,
  Copy,
  Dices,
  DollarSign,
  Eye,
  EyeOff,
  Hash,
  Home,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Monitor,
  PenSquare,
  Plus,
  Radar,
  Save,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Smartphone,
  Snowflake,
  Sparkles,
  Timer,
  User,
  UserCog,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react'
import './App.css'

type TabId = 'feed' | 'home' | 'chats' | 'profile' | 'transactions' | 'admin' | 'radar' | 'settings'
type AuthProvider = 'email'
type LocationState = 'idle' | 'loading' | 'granted' | 'denied'
type ToastTone = 'success' | 'error' | 'info'
type UserRole = 'user' | 'admin'
type UserStatus = 'active' | 'suspended'
type BanType = 'global' | 'chat'

type BanInfo = {
  type: BanType
  reason: string
  until: string | null
  createdAt: string
  adminId: string
}

type UserPreferences = {
  showCity: boolean
  allowInbox: boolean
  neonProfile: boolean
  emailAlerts: boolean
  telegramAutoAuth: boolean
  showContact?: boolean
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
  ban: BanInfo | null
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

type NotificationItem = {
  id: string
  type: 'system' | 'inbox' | 'message'
  title: string
  text: string
  createdAt: string
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

type AdminDraft = AdminManagedUser & {
  badgesText: string
}

const SESSION_KEY = 'regellik.session'
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const WS_URL = import.meta.env.VITE_WS_URL || ''

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

function getNotifIcon(type: NotificationItem['type']) {
  if (type === 'system') return '🤖'
  if (type === 'inbox') return '→'
  return '←'
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
  const [emailStep, setEmailStep] = useState<'email' | 'code'>('email')
  const [emailCode, setEmailCode] = useState('')
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [locationState, setLocationState] = useState<LocationState>('idle')
  const [locationLabel, setLocationLabel] = useState('Гео не включено')
  const [resolvedLocation, setResolvedLocation] = useState<ResolvedLocation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isSavingSite, setIsSavingSite] = useState(false)
  const [isSavingAdminUser, setIsSavingAdminUser] = useState(false)
  const [isGrantingAdmin, setIsGrantingAdmin] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profileHandle, setProfileHandle] = useState('@regellik')
  const [handleStatus, setHandleStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const handleCheckTimer = useRef<number | null>(null)
  const [profileTagline, setProfileTagline] = useState('')
  const [profileBio, setProfileBio] = useState('')
  const [adminDraft, setAdminDraft] = useState<AdminDraft | null>(null)
  const [selectedAdminUserId, setSelectedAdminUserId] = useState('')
  const [grantIdentifier, setGrantIdentifier] = useState('')

  // Messenger state
  const [conversations, setConversations] = useState<ConversationPreview[]>([])
  const [openConvoId, setOpenConvoId] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatText, setChatText] = useState('')
  const [chatOtherUser, setChatOtherUser] = useState<ConversationPreview['otherUser']>(null)
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeSearch, setComposeSearch] = useState('')
  const [deletingConvoId, setDeletingConvoId] = useState<string | null>(null)

  // Radar state
  const [radarUsers, setRadarUsers] = useState<RadarUser[]>([])
  const [isRadarLoading, setIsRadarLoading] = useState(false)

  // Top-up modal
  const [topUpOpen, setTopUpOpen] = useState(false)

  // Notifications panel
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [notifLoading, setNotifLoading] = useState(false)

  // Admin broadcast
  const [broadcastText, setBroadcastText] = useState('')
  const [isBroadcasting, setIsBroadcasting] = useState(false)
  const [broadcastMode, setBroadcastMode] = useState<'all' | 'selected'>('all')
  const [broadcastSearchQ, setBroadcastSearchQ] = useState('')
  const [broadcastSearchResults, setBroadcastSearchResults] = useState<AdminManagedUser[]>([])
  const [broadcastSelectedUsers, setBroadcastSelectedUsers] = useState<AdminManagedUser[]>([])
  const [broadcastSearching, setBroadcastSearching] = useState(false)

  // Admin search
  const [adminSearchQ, setAdminSearchQ] = useState('')
  const [adminSearchResults, setAdminSearchResults] = useState<AdminManagedUser[]>([])
  const [adminSearching, setAdminSearching] = useState(false)
  const [adminTopUpUserId, setAdminTopUpUserId] = useState('')
  const [adminTopUpAmount, setAdminTopUpAmount] = useState('')
  const [adminTopUpReason, setAdminTopUpReason] = useState('')
  const [adminConfirmAction, setAdminConfirmAction] = useState<{ label: string; action: () => void } | null>(null)

  // Admin section navigation
  type AdminSectionId = 'none' | 'economy' | 'site' | 'roles' | 'topup' | 'users' | 'bans' | 'audit' | 'broadcast'
  const [adminSection, setAdminSection] = useState<AdminSectionId>('none')

  // Ban management
  const [banUserId, setBanUserId] = useState('')
  const [banType, setBanType] = useState<BanType>('global')
  const [banDuration, setBanDuration] = useState('')
  const [banReason, setBanReason] = useState('')
  const [isBanning, setIsBanning] = useState(false)

  // Sessions
  type SessionInfo = { id: string; isCurrent: boolean; createdAt: string | null; userAgent: string }
  const [userSessions, setUserSessions] = useState<SessionInfo[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)

  // Animation state for page transitions
  const [pageExiting, setPageExiting] = useState(false)
  const [composeExiting, setComposeExiting] = useState(false)
  const [menuExiting, setMenuExiting] = useState(false)

  const switchTab = (newTab: TabId, cb?: () => void) => {
    if (newTab === activeTab && !openConvoId) return
    setPageExiting(true)
    setTimeout(() => {
      setPageExiting(false)
      setActiveTab(newTab)
      setOpenConvoId(null)
      cb?.()
    }, 250)
  }

  const closeCompose = () => {
    setComposeExiting(true)
    setTimeout(() => { setComposeExiting(false); setComposeOpen(false); setComposeSearch('') }, 250)
  }

  const deleteConversation = async (convoId: string) => {
    if (!sessionToken) return
    try {
      const data = await apiRequest<{ ok: boolean; conversations: ConversationPreview[] }>(`/api/conversations/${convoId}`, { method: 'DELETE' }, sessionToken)
      setConversations(data.conversations)
      showToast('Чат удалён', 'success')
    } catch {
      showToast('Не удалось удалить чат', 'error')
    } finally {
      setDeletingConvoId(null)
    }
  }

  const deleteAvatar = async () => {
    if (!sessionToken || !viewer) return
    try {
      await apiRequest<{ ok: boolean }>('/api/profile/avatar', { method: 'DELETE' }, sessionToken)
      setViewer({ ...viewer, avatarUrl: null })
      showToast('Аватар удалён', 'success')
    } catch {
      showToast('Не удалось удалить аватар', 'error')
    }
  }

  const closeMenu = () => {
    setMenuExiting(true)
    setTimeout(() => { setMenuExiting(false); setMenuOpen(false) }, 200)
  }

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

  const showToast = (_message: string, _tone: ToastTone) => {
    try { navigator.vibrate?.(80) } catch { /* ignore */ }
  }

  const checkHandleAvailability = (handle: string) => {
    if (handleCheckTimer.current) window.clearTimeout(handleCheckTimer.current)
    const normalized = normalizeHandle(handle)
    if (normalized === viewer?.handle) { setHandleStatus('idle'); return }
    if (normalized.length < 3) { setHandleStatus('idle'); return }
    setHandleStatus('checking')
    handleCheckTimer.current = window.setTimeout(async () => {
      try {
        const data = await apiRequest<{ available: boolean }>(`/api/handle/check?handle=${encodeURIComponent(normalized)}`, undefined, sessionToken)
        setHandleStatus(data.available ? 'available' : 'taken')
      } catch { setHandleStatus('idle') }
    }, 400)
  }

  const changeHandle = (value: string) => {
    const h = normalizeHandle(value)
    setProfileHandle(h)
    checkHandleAvailability(h)
  }

  const randomHandle = async () => {
    try {
      const data = await apiRequest<{ handle: string }>('/api/handle/random', undefined, sessionToken)
      setProfileHandle(data.handle)
      checkHandleAvailability(data.handle)
    } catch { /* ignore */ }
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

  // Track if user explicitly disabled geo (don't auto-re-enable)
  const geoUserDisabled = useRef(false)

  useEffect(() => {
    if (locationState === 'idle' && !geoUserDisabled.current) {
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

        if (data.viewer && activeTab === 'feed') {
          setActiveTab('chats')
        }

        if (!data.viewer && sessionToken) {
          window.localStorage.removeItem(SESSION_KEY)
          setSessionToken('')
          showToast('Сессия истекла — войди заново', 'error')
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

  // WebSocket ref for real-time messages
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const socket = new WebSocket(resolveWsUrl())
    wsRef.current = socket

    socket.addEventListener('open', () => {
      // Authenticate so server knows who we are
      if (sessionToken) {
        socket.send(JSON.stringify({ type: 'auth', token: sessionToken }))
      }
    })

    socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          type: string;
          count?: number;
          conversationId?: string;
          message?: { id: string; text: string; senderId: string; senderName: string; createdAt: string };
          conversations?: ConversationPreview[];
        }

        if (payload.type === 'online') {
          setOnlineCount(payload.count ?? 0)
        }

        if (payload.type === 'new_message' && payload.message && payload.conversations) {
          // Update conversations list (already sorted by server, newest first)
          setConversations(payload.conversations)

          // If we're currently viewing this chat, add the message
          if (payload.conversationId) {
            setOpenConvoId(prev => {
              if (prev === payload.conversationId) {
                setChatMessages(msgs => {
                  if (msgs.some(m => m.id === payload.message!.id)) return msgs
                  return [...msgs, {
                    id: payload.message!.id,
                    conversationId: payload.conversationId!,
                    senderId: payload.message!.senderId,
                    text: payload.message!.text,
                    createdAt: payload.message!.createdAt,
                  }]
                })
              }
              return prev
            })
          }

          // Show toast notification if not viewing this chat
          const senderName = payload.message.senderName || 'Кто-то'
          const preview = payload.message.text.length > 40
            ? payload.message.text.slice(0, 40) + '...'
            : payload.message.text
          showToast(`${senderName}: ${preview}`, 'info')
        }
      } catch {
        // ignore malformed payloads
      }
    })

    return () => { socket.close(); wsRef.current = null }
  }, [sessionToken])

  useEffect(() => {
    if (!viewer || resolvedLocation === null || viewer.geoAllowed || geoUserDisabled.current) {
      return
    }

    void syncLocation(resolvedLocation)
  }, [resolvedLocation, viewer])

  // Auto-load radar when tab is opened
  useEffect(() => {
    if (activeTab === 'radar' && radarUsers.length === 0 && !isRadarLoading && sessionToken) {
      void loadRadar()
    }
  }, [activeTab])

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
    setEmailCode('')
    setEmailStep('email')
    showToast(`Вход выполнен: ${data.viewer.name}`, 'success')

    if (resolvedLocation && !data.viewer.geoAllowed && !geoUserDisabled.current) {
      await syncLocation(resolvedLocation)
    }
  }

  const sendEmailCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!emailValue.trim()) {
      showToast('Укажи email', 'info')
      return
    }
    if (authMode === 'register' && !emailName.trim()) {
      showToast('Укажи имя для регистрации', 'info')
      return
    }

    setIsSendingCode(true)
    try {
      const result = await apiRequest<{ ok: boolean; hint?: string }>('/api/auth/send-code', {
        method: 'POST',
        body: JSON.stringify({
          email: emailValue.trim(),
          name: emailName.trim() || undefined,
          mode: authMode,
        }),
      })
      setEmailStep('code')
      showToast(result.hint || 'Код отправлен на почту', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось отправить код', 'error')
    } finally {
      setIsSendingCode(false)
    }
  }

  const signInEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!emailCode.trim()) {
      showToast('Введи код подтверждения', 'info')
      return
    }

    try {
      const data = await apiRequest<AuthResponse>('/api/auth/email', {
        method: 'POST',
        body: JSON.stringify({
          email: emailValue.trim(),
          code: emailCode.trim(),
          location: resolvedLocation,
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

  const loadSessions = async () => {
    if (!sessionToken) return
    setSessionsLoading(true)
    try {
      const data = await apiRequest<{ sessions: SessionInfo[] }>('/api/sessions', undefined, sessionToken)
      setUserSessions(data.sessions)
    } catch { /* ignore */ }
    setSessionsLoading(false)
  }

  const killSession = async (sid: string) => {
    try {
      await apiRequest('/api/sessions/kill', { method: 'POST', body: JSON.stringify({ sessionId: sid }) }, sessionToken)
      showToast('Сессия завершена', 'success')
      void loadSessions()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка', 'error')
    }
  }

  function parseUserAgent(ua: string) {
    if (!ua) return 'Неизвестное устройство'
    const isMobile = /mobile|android|iphone|ipad/i.test(ua)
    const isTelegram = /telegram/i.test(ua)
    let browser = 'Браузер'
    if (/firefox/i.test(ua)) browser = 'Firefox'
    else if (/edg/i.test(ua)) browser = 'Edge'
    else if (/chrome/i.test(ua)) browser = 'Chrome'
    else if (/safari/i.test(ua)) browser = 'Safari'
    let os = ''
    if (/windows/i.test(ua)) os = 'Windows'
    else if (/mac/i.test(ua)) os = 'macOS'
    else if (/android/i.test(ua)) os = 'Android'
    else if (/iphone|ipad/i.test(ua)) os = 'iOS'
    else if (/linux/i.test(ua)) os = 'Linux'
    const prefix = isTelegram ? 'Telegram • ' : ''
    return `${prefix}${browser}${os ? ' • ' + os : ''}${isMobile ? '' : ''}`
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

  const loadNotifications = async () => {
    if (!sessionToken) return
    setNotifLoading(true)
    try {
      const data = await apiRequest<{ notifications: NotificationItem[] }>('/api/notifications', undefined, sessionToken)
      setNotifications(data.notifications)
    } catch {
      showToast('Не удалось загрузить уведомления', 'error')
    } finally {
      setNotifLoading(false)
    }
  }

  const sendBroadcast = async () => {
    if (!broadcastText.trim() || !sessionToken) return
    if (broadcastMode === 'selected' && broadcastSelectedUsers.length === 0) {
      showToast('Выберите получателей', 'info')
      return
    }
    setIsBroadcasting(true)
    try {
      const body: { text: string; userIds?: string[] } = { text: broadcastText.trim() }
      if (broadcastMode === 'selected') {
        body.userIds = broadcastSelectedUsers.map(u => u.id)
      }
      const data = await apiRequest<{ ok: boolean; sent: number }>('/api/admin/broadcast', {
        method: 'POST',
        body: JSON.stringify(body),
      }, sessionToken)
      showToast(`Рассылка отправлена: ${data.sent} пользователей`, 'success')
      setBroadcastText('')
      setBroadcastSelectedUsers([])
      setBroadcastSearchResults([])
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Ошибка рассылки', 'error')
    } finally {
      setIsBroadcasting(false)
    }
  }

  // Broadcast search users
  const searchBroadcastUsers = async () => {
    if (!broadcastSearchQ.trim() || !sessionToken) return
    setBroadcastSearching(true)
    try {
      const data = await apiRequest<{ users: AdminManagedUser[] }>(`/api/admin/users/search?q=${encodeURIComponent(broadcastSearchQ.trim())}`, undefined, sessionToken)
      setBroadcastSearchResults(data.users)
    } catch {
      showToast('Ошибка поиска', 'error')
    } finally {
      setBroadcastSearching(false)
    }
  }

  const toggleBroadcastUser = (user: AdminManagedUser) => {
    setBroadcastSelectedUsers(prev =>
      prev.some(u => u.id === user.id)
        ? prev.filter(u => u.id !== user.id)
        : [...prev, user]
    )
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

  // Admin ban user
  const adminBan = async () => {
    if (!banUserId || !sessionToken) return
    setIsBanning(true)
    try {
      const data = await apiRequest<BootstrapResponse>('/api/admin/ban', {
        method: 'POST',
        body: JSON.stringify({ userId: banUserId, type: banType, reason: banReason, duration: banDuration ? Number(banDuration) : undefined }),
      }, sessionToken)
      applyBootstrap(data)
      showToast('Бан выдан', 'success')
      setBanUserId('')
      setBanReason('')
      setBanDuration('')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Ошибка бана', 'error')
    } finally {
      setIsBanning(false)
    }
  }

  // Admin unban user
  const adminUnban = async (userId: string) => {
    if (!sessionToken) return
    try {
      const data = await apiRequest<BootstrapResponse>('/api/admin/unban', {
        method: 'POST',
        body: JSON.stringify({ userId }),
      }, sessionToken)
      applyBootstrap(data)
      showToast('Бан снят', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Ошибка', 'error')
    }
  }

  // Admin freeze/unfreeze user
  const adminFreeze = async (userId: string, frozen: boolean) => {
    if (!sessionToken) return
    try {
      const data = await apiRequest<BootstrapResponse>('/api/admin/freeze', {
        method: 'POST',
        body: JSON.stringify({ userId, frozen }),
      }, sessionToken)
      applyBootstrap(data)
      showToast(frozen ? 'Аккаунт заморожен' : 'Аккаунт разморожен', 'success')
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

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !sessionToken) return

    if (!file.type.match(/^image\/(png|jpeg|webp|gif)$/)) {
      showToast('Допускается PNG, JPEG, WebP или GIF', 'error')
      return
    }
    if (file.size > 256 * 1024) {
      showToast('Файл слишком большой (макс. 256 КБ)', 'error')
      return
    }

    setIsUploadingAvatar(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const result = await apiRequest<{ ok: boolean; avatarUrl: string }>('/api/profile/avatar', {
        method: 'POST',
        body: JSON.stringify({ avatar: dataUrl }),
      }, sessionToken)

      if (result.avatarUrl && viewer) {
        setViewer({ ...viewer, avatarUrl: result.avatarUrl })
      }
      showToast('Аватар обновлён', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось загрузить аватар', 'error')
    } finally {
      setIsUploadingAvatar(false)
      event.target.value = ''
    }
  }

  const updatePreference = async (key: keyof UserPreferences, value: boolean) => {
    if (!viewer || !sessionToken) return
    try {
      const data = await apiRequest<BootstrapResponse>('/api/profile/update', {
        method: 'POST',
        body: JSON.stringify({ preferences: { ...viewer.preferences, [key]: value } }),
      }, sessionToken)
      applyBootstrap(data)
      showToast('Настройка обновлена', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Ошибка', 'error')
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



      {authOpen && (
        <div className="auth-layer">
          <div className="auth-backdrop" onClick={() => { setAuthOpen(false); setEmailStep('email'); setEmailCode('') }} />
          <section className="auth-sheet">
            <div className="sheet-head">
              <div>
                <span className="eyebrow">{authMode === 'register' ? 'Регистрация' : 'Вход'}</span>
                <h2>{authMode === 'register' ? 'Создать аккаунт' : 'Войти в аккаунт'}</h2>
              </div>
              <button className="ghost-icon" onClick={() => { setAuthOpen(false); setEmailStep('email'); setEmailCode('') }}>
                ×
              </button>
            </div>

            <div className="auth-mode-tabs">
              <button className={authMode === 'login' ? 'auth-mode-tab active' : 'auth-mode-tab'} onClick={() => { setAuthMode('login'); setEmailStep('email'); setEmailCode('') }}>Вход</button>
              <button className={authMode === 'register' ? 'auth-mode-tab active' : 'auth-mode-tab'} onClick={() => { setAuthMode('register'); setEmailStep('email'); setEmailCode('') }}>Регистрация</button>
            </div>

            <div className="auth-stack">
              {emailStep === 'email' ? (
                <form className="email-card" onSubmit={sendEmailCode}>
                  <div className="auth-title">
                    <Mail size={16} />
                    {authMode === 'register' ? 'Регистрация по Email' : 'Вход по Email'}
                  </div>
                  <div className="auth-note">
                    {authMode === 'register'
                      ? 'Укажи имя и email — пришлём код подтверждения'
                      : 'Введи email — пришлём 6-значный код для входа'}
                  </div>
                  {authMode === 'register' && (
                    <input value={emailName} onChange={(e) => setEmailName(e.target.value)} placeholder="Имя" required />
                  )}
                  <input value={emailValue} onChange={(e) => setEmailValue(e.target.value)} placeholder="Email" type="email" required />
                  <button className="primary-btn wide" type="submit" disabled={isSendingCode || !siteSettings.emailAuthEnabled}>
                    <Mail size={16} />
                    {isSendingCode ? 'Отправляем...' : 'Получить код'}
                  </button>
                </form>
              ) : (
                <form className="email-card" onSubmit={signInEmail}>
                  <div className="auth-title">
                    <ShieldCheck size={16} />
                    Подтверждение
                  </div>
                  <div className="auth-note code-sent-note">
                    Код отправлен на <strong>{emailValue}</strong>
                  </div>
                  <input
                    className="code-input"
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    autoFocus
                  />
                  <button className="primary-btn wide" type="submit" disabled={emailCode.length < 6}>
                    <ShieldCheck size={16} />
                    {authMode === 'register' ? 'Создать аккаунт' : 'Войти'}
                  </button>
                  <button type="button" className="auth-switch-btn back-btn" onClick={() => { setEmailStep('email'); setEmailCode('') }}>
                    ← Назад
                  </button>
                </form>
              )}

              <div className="auth-switch">
                {authMode === 'login' ? (
                  <span>Нет аккаунта? <button className="auth-switch-btn" onClick={() => { setAuthMode('register'); setEmailStep('email'); setEmailCode('') }}>Зарегистрируйся</button></span>
                ) : (
                  <span>Уже есть аккаунт? <button className="auth-switch-btn" onClick={() => { setAuthMode('login'); setEmailStep('email'); setEmailCode('') }}>Войди</button></span>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* --- ПАНЕЛЬ УВЕДОМЛЕНИЙ --- */}
      {notifOpen && (
        <div className="notif-layer">
          <div className="notif-backdrop" onClick={() => setNotifOpen(false)} />
          <div className="notif-panel">
            <div className="notif-panel-head">
              <h3><Bell size={16} /> Уведомления</h3>
              <button className="ghost-icon" onClick={() => setNotifOpen(false)}>×</button>
            </div>
            <div className="notif-list">
              {notifLoading && <div className="notif-loading">Загрузка...</div>}
              {!notifLoading && notifications.length === 0 && (
                <div className="notif-empty">
                  <Bell size={32} />
                  <p>Нет уведомлений</p>
                </div>
              )}
              {notifications.map(n => (
                <div key={n.id} className={`notif-item notif-${n.type}`}>
                  <span className="notif-icon">{getNotifIcon(n.type)}</span>
                  <div className="notif-body">
                    <strong>{n.title}</strong>
                    <p>{n.text.length > 120 ? n.text.slice(0, 120) + '...' : n.text}</p>
                    <small>{formatRelativeTime(n.createdAt)}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
            <span className="header-brand" onClick={() => { switchTab('home'); closeMenu(); }} style={{cursor:'pointer'}}>
              <span className="header-brand-icon">&gt;]</span>Regellik
            </span>
          </div>
          <div className="header-right">
            {siteSettings.onlineCounterVisible && (
              <div className="header-online-badge">
                <span className="online-dot" />
                <span>{onlineCount}</span>
              </div>
            )}
            <div className="header-powers" onClick={() => { switchTab('transactions'); closeMenu(); }} style={{cursor:'pointer'}}>
              <Zap size={14} />
              <span>{viewer?.powers ?? 0}</span>
            </div>
            <button className="header-bell-btn" onClick={() => { setNotifOpen(true); void loadNotifications(); }}>
              <Bell size={17} />
              {totalUnread > 0 && <span className="header-badge">{totalUnread}</span>}
            </button>
            <button className="header-profile-btn" onClick={() => { switchTab('profile'); closeMenu(); }}>
              <User size={16} />
            </button>
          </div>
        </div>

        {menuOpen && (
          <>
            <div className={`corner-menu-backdrop${menuExiting ? ' menu-exiting' : ''}`} onClick={closeMenu} />
            <nav className={`corner-menu-dropdown${menuExiting ? ' menu-exiting' : ''}`}>
              <div className="corner-menu-header">
                <div className="brand-mark">&gt;]</div>
                <div>
                  <div className="brand-name">Regellik</div>
                  <div className="brand-sub">{siteSettings.onlineCounterVisible ? `${onlineCount} онлайн` : 'анонимки • профили'} {publicFeed.length > 0 ? `• ${publicFeed.length} постов` : ''} {inbox.length > 0 ? `• ${inbox.length} входящих` : ''}</div>
                </div>
              </div>

              {!isSignedIn && (
                <button className="corner-menu-item accent-item" onClick={() => { closeMenu(); setAuthOpen(true) }}>
                  🔽 Зайти в Регель
                </button>
              )}

              {isSignedIn && (
                <>
                  <button className={activeTab === 'home' ? 'corner-menu-item active' : 'corner-menu-item'} onClick={() => switchTab('home', closeMenu)}>
                    <Home size={16} /> Главная
                  </button>
                  <button className={activeTab === 'chats' ? 'corner-menu-item active' : 'corner-menu-item'} onClick={() => switchTab('chats', closeMenu)}>
                    <MessageCircle size={16} /> Чаты
                  </button>
                  <button className="corner-menu-item" onClick={() => { switchTab('chats', () => { closeMenu(); setComposeOpen(true) }) }}>
                    <PenSquare size={16} /> Написать
                  </button>
                  <button className={activeTab === 'radar' ? 'corner-menu-item active' : 'corner-menu-item'} onClick={() => switchTab('radar', () => { void loadRadar(); closeMenu() })}>
                    <Radar size={16} /> Радар
                  </button>
                  <button className={activeTab === 'profile' ? 'corner-menu-item active' : 'corner-menu-item'} onClick={() => switchTab('profile', closeMenu)}>
                    <User size={16} /> Профиль
                  </button>
                  <button className={activeTab === 'transactions' ? 'corner-menu-item active' : 'corner-menu-item'} onClick={() => switchTab('transactions', closeMenu)}>
                    <Wallet size={16} /> Транзакции
                  </button>
                  <button className={activeTab === 'settings' ? 'corner-menu-item active' : 'corner-menu-item'} onClick={() => switchTab('settings', closeMenu)}>
                    <Settings2 size={16} /> Настройки
                  </button>
                  {isAdmin && (
                    <button className={activeTab === 'admin' ? 'corner-menu-item active' : 'corner-menu-item'} onClick={() => switchTab('admin', closeMenu)}>
                      <UserCog size={16} /> Админка
                    </button>
                  )}
                  <div className="corner-menu-divider" />
                  <button className="corner-menu-item danger-item" onClick={() => { closeMenu(); void signOut() }}>
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
          <main className={`main-layout${pageExiting ? ' page-exiting' : ''}`}>
            {/* --- ГЛАВНАЯ (home) --- */}
            {activeTab === 'home' && viewer && (
              <section className="home-screen page-transition">
                <div className="home-logo">
                  <div className="home-logo-icon">&gt;]</div>
                  <div className="home-logo-text">Regellik</div>
                </div>

                <p className="home-greeting">Привет, <strong>{viewer.name}</strong></p>

                <div className="home-stats-row">
                  <div className="home-stat">
                    <strong>{viewer.powers.toFixed(1)}</strong>
                    <span>⚡ Powers</span>
                  </div>
                  <div className="home-stat">
                    <strong>{conversations.length}</strong>
                    <span>Чатов</span>
                  </div>
                  <div className="home-stat">
                    <strong>{totalUnread}</strong>
                    <span>Новых</span>
                  </div>
                </div>

                <div className="home-nav-grid">
                  <button className="home-nav-btn" onClick={() => switchTab('chats')}>
                    <MessageCircle size={24} />
                    <strong>Чаты</strong>
                    <span>Сообщения</span>
                  </button>
                  <button className="home-nav-btn" onClick={() => switchTab('radar', () => void loadRadar())}>
                    <Radar size={24} />
                    <strong>Радар</strong>
                    <span>Люди рядом</span>
                  </button>
                  <button className="home-nav-btn" onClick={() => switchTab('profile')}>
                    <User size={24} />
                    <strong>Профиль</strong>
                    <span>Настройка</span>
                  </button>
                  <button className="home-nav-btn" onClick={() => switchTab('transactions')}>
                    <Wallet size={24} />
                    <strong>Баланс</strong>
                    <span>Транзакции</span>
                  </button>
                </div>
              </section>
            )}

            {/* --- ЧАТЫ (мессенджер) --- */}
            {activeTab === 'chats' && !openConvoId && !composeOpen && (
              <section className="chats-screen page-transition">
                <div className="chats-header-row">
                  <h2 className="chats-title">Чаты</h2>
                  <div className="chats-header-actions">
                    {isAdmin && (
                      <button className="chats-admin-btn" onClick={() => switchTab('admin', () => setAdminSection('broadcast'))} title="Рассылка">
                        <ShieldCheck size={14} />
                        <span>Рассылка</span>
                      </button>
                    )}
                    <button className="chats-radar-btn" onClick={() => switchTab('radar', () => void loadRadar())} title="Радар">
                      <Radar size={16} />
                      <span>Радар</span>
                    </button>
                    <button className="compose-fab-inline" onClick={() => setComposeOpen(true)} title="Написать">
                      <PenSquare size={16} />
                      <span>Написать</span>
                    </button>
                  </div>
                </div>

                {conversations.length === 0 && (
                  <div className="chats-empty">
                    <MessageCircle size={40} />
                    <p>Пока нет чатов</p>
                    <span>Нажми «Написать» чтобы начать разговор</span>
                  </div>
                )}

                <div className="conversation-list">
                  {conversations.map((convo) => (
                    <div key={convo.id} className={`conversation-item-wrap${deletingConvoId === convo.id ? ' deleting' : ''}`}>
                      <button className={`conversation-item${convo.unreadCount > 0 ? ' has-unread' : ''}`} onClick={() => openConversation(convo.id)}>
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
                      {deletingConvoId === convo.id ? (
                        <div className="convo-delete-confirm">
                          <span>Удалить?</span>
                          <button className="convo-del-yes" onClick={() => void deleteConversation(convo.id)}>Да</button>
                          <button className="convo-del-no" onClick={() => setDeletingConvoId(null)}>Нет</button>
                        </div>
                      ) : (
                        <button className="convo-delete-btn" onClick={() => setDeletingConvoId(convo.id)} title="Удалить чат">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* --- COMPOSE (новый чат — заменяет экран чатов) --- */}
            {activeTab === 'chats' && !openConvoId && composeOpen && (
              <section className={`chats-screen compose-screen page-transition${composeExiting ? ' compose-page-exit' : ''}`}>
                <div className="chats-header-row">
                  <button className="compose-back-btn" onClick={closeCompose}>
                    <ArrowLeft size={20} />
                  </button>
                  <h2 className="chats-title">Новый чат</h2>
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
              </section>
            )}

            {/* --- ОТКРЫТЫЙ ЧАТ --- */}
            {activeTab === 'chats' && openConvoId && (() => {
              const currentConvo = conversations.find(c => c.id === openConvoId)
              const isSystemChat = currentConvo?.isSystem || false
              return (
              <section className="chat-window page-transition">
                <div className="chat-window-header">
                  <button className="chat-back-btn" onClick={() => setOpenConvoId(null)}>
                    <ArrowLeft size={20} />
                  </button>
                  <div className="chat-header-user">
                    {chatOtherUser?.avatarUrl ? (
                      <img className="chat-header-avatar" src={chatOtherUser.avatarUrl} alt="" />
                    ) : (
                      <div className={isSystemChat ? 'chat-header-avatar-placeholder system' : 'chat-header-avatar-placeholder'}>
                        {isSystemChat ? '>]' : chatOtherUser?.name?.[0] || '?'}
                      </div>
                    )}
                    <div>
                      <strong>{isSystemChat ? '>]Regellik' : chatOtherUser?.name || 'Чат'}</strong>
                      <small>{isSystemChat ? 'системный чат' : chatOtherUser?.handle || ''}</small>
                    </div>
                  </div>
                  {isSystemChat && <span className="chat-system-badge">SYSTEM</span>}
                </div>

                <div className="chat-messages-area">
                  {isChatLoading && <div className="chat-loading">Загрузка...</div>}
                  {chatMessages.map((msg, idx) => {
                    const isMine = msg.senderId === viewer?.id
                    const isSystem = !isMine && isSystemChat
                    const showDate = idx === 0 || new Date(msg.createdAt).toDateString() !== new Date(chatMessages[idx - 1].createdAt).toDateString()
                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div className="chat-date-divider">
                            <span>{new Date(msg.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</span>
                          </div>
                        )}
                        <div className={`chat-bubble ${isMine ? 'mine' : 'theirs'}${isSystem ? ' system' : ''}`}>
                          {isSystem && <span className="chat-bubble-sender">{'>]Regellik'}</span>}
                          <p>{msg.text}</p>
                          <small>{formatRelativeTime(msg.createdAt)}</small>
                        </div>
                      </div>
                    )
                  })}
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
              )
            })()}

            {/* --- РАДАР --- */}
            {activeTab === 'radar' && (
              <section className="radar-screen page-transition">
                <div className="radar-header">
                  <div className="radar-header-left">
                    <Radar size={20} className="radar-header-icon" />
                    <h2>Радар</h2>
                  </div>
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
                {/* Компактная карточка профиля */}
                <article className="panel-card profile-hero compact-hero">
                  <div className="profile-hero-main">
                    <div className="profile-avatar-large avatar-upload-wrap">
                      {viewer.avatarUrl ? <img src={viewer.avatarUrl} alt={viewer.name} /> : <span>{viewer.name[0]}</span>}
                      <label className="avatar-upload-overlay" title="Загрузить аватар">
                        <Camera size={20} />
                        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleAvatarUpload} hidden disabled={isUploadingAvatar} />
                      </label>
                      {viewer.avatarUrl && (
                        <button className="avatar-delete-btn" type="button" onClick={() => void deleteAvatar()} title="Удалить аватар">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <div className="profile-hero-info">
                      <h2>{viewer.name}</h2>
                      <div className="profile-subline">
                        <span>{viewer.handle}</span>
                      </div>
                    </div>
                  </div>
                  <div className="profile-quick-stats">
                    <div><strong>{viewer.stats.sent}</strong><span>отправлено</span></div>
                    <div><strong>{viewer.stats.received}</strong><span>получено</span></div>
                    <div><strong>{viewer.powers}</strong><span>энергия</span></div>
                  </div>
                </article>

                {/* Геолокация */}
                <article className="panel-card geo-settings-card">
                  <div className="geo-settings-row">
                    <div className="geo-settings-left">
                      <MapPin size={18} />
                      <div>
                        <strong>Геолокация</strong>
                        <span className="geo-settings-label">{viewerLocation}</span>
                      </div>
                    </div>
                    <div className="geo-settings-actions">
                      {locationState !== 'granted' ? (
                        <button className="secondary-btn compact-btn" onClick={requestLocation}>
                          Включить
                        </button>
                      ) : (
                        <span className="geo-granted-badge">Включено</span>
                      )}
                      <button
                        className={viewer.geoAllowed ? 'toggle-mini active' : 'toggle-mini'}
                        onClick={async () => {
                          const newGeoAllowed = !viewer.geoAllowed
                          if (!newGeoAllowed) {
                            geoUserDisabled.current = true
                          } else {
                            geoUserDisabled.current = false
                          }
                          try {
                            const data = await apiRequest<{ viewer: SessionUser }>('/api/location', {
                              method: 'POST',
                              body: JSON.stringify(newGeoAllowed ? {
                                city: viewer.city || resolvedLocation?.city,
                                country: viewer.country || resolvedLocation?.country,
                                latitude: viewer.latitude || resolvedLocation?.latitude,
                                longitude: viewer.longitude || resolvedLocation?.longitude,
                              } : {
                                city: null,
                              }),
                            }, sessionToken)
                            setViewer(prev => prev ? { ...prev, ...data.viewer } : prev)
                            showToast(newGeoAllowed ? 'Геолокация показана' : 'Геолокация скрыта', 'success')
                          } catch {
                            showToast('Не удалось изменить настройку', 'error')
                          }
                        }}
                      >
                        {viewer.geoAllowed ? <Eye size={14} /> : <EyeOff size={14} />}
                        <span>{viewer.geoAllowed ? 'Видно' : 'Скрыто'}</span>
                      </button>
                    </div>
                  </div>
                </article>

                {/* Редактирование профиля */}
                <form className="panel-card profile-editor-card compact-editor" onSubmit={updateProfile}>
                  <div className="panel-head compact-head">
                    <span className="eyebrow"># редактирование</span>
                    <button className="primary-btn compact-btn" type="submit" disabled={isSavingProfile || !siteSettings.profileEditEnabled}>
                      <Save size={14} />
                      {isSavingProfile ? '...' : 'Сохранить'}
                    </button>
                  </div>
                  <div className="field-grid-2">
                    <label className="input-block">
                      <span>Имя</span>
                      <input value={profileName} onChange={(event) => setProfileName(event.target.value)} />
                    </label>
                    <div className="input-block handle-block">
                      <span>Юзернейм</span>
                      <div className="handle-row">
                        <input value={profileHandle} onChange={(event) => changeHandle(event.target.value)} />
                        <button type="button" className="handle-dice-btn" onClick={randomHandle} title="Случайный ник">
                          <Dices size={16} />
                        </button>
                      </div>
                      <div className={`handle-status ${handleStatus}`}>
                        {handleStatus === 'checking' && '● проверяю...'}
                        {handleStatus === 'available' && '● свободен'}
                        {handleStatus === 'taken' && '● занят'}
                      </div>
                    </div>
                  </div>
                  <label className="input-block">
                    <span>О себе</span>
                    <textarea value={profileBio} onChange={(event) => setProfileBio(event.target.value)} rows={2} />
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
                  {isAdmin && (
                    <div className="meta-row">
                      <span>Роль</span>
                      <strong className="meta-admin-badge">Администратор</strong>
                    </div>
                  )}
                  <div className="meta-row">
                    <span>Контакт</span>
                    <div className="meta-row-actions">
                      {viewer.preferences.showContact !== false && <strong>{viewer.email || 'Telegram'}</strong>}
                      <button
                        className={viewer.preferences.showContact !== false ? 'toggle-mini active' : 'toggle-mini'}
                        type="button"
                        onClick={() => void updatePreference('showContact' as keyof UserPreferences, viewer.preferences.showContact === false)}
                      >
                        {viewer.preferences.showContact !== false ? <Eye size={14} /> : <EyeOff size={14} />}
                        <span>{viewer.preferences.showContact !== false ? 'Видно' : 'Скрыто'}</span>
                      </button>
                    </div>
                  </div>
                  <div className="meta-row">
                    <span>Дата регистрации</span>
                    <strong>{formatDate(viewer.joinedAt)}</strong>
                  </div>
                </article>
              </section>
            )}

            {/* --- ТРАНЗАКЦИИ --- */}
            {activeTab === 'transactions' && (
              <section className="transactions-screen page-transition">
                <article className="panel-card">
                  <div className="panel-head">
                    <div>
                      <span className="eyebrow"># баланс</span>
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

                  <button className="topup-cta-btn" onClick={() => setTopUpOpen(!topUpOpen)}>
                    {topUpOpen ? <X size={18} /> : <Plus size={18} />}
                    {topUpOpen ? 'Скрыть' : 'Пополнить баланс'}
                  </button>

                  {/* Inline top-up options */}
                  {topUpOpen && (
                    <div className="topup-inline">
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
                        <span># Оплата скоро станет доступна. Следи за обновлениями!</span>
                      </div>
                    </div>
                  )}
                </article>

                <article className="panel-card">
                  <div className="panel-head">
                    <div>
                      <span className="eyebrow"># статистика</span>
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
              </section>
            )}

            {/* --- НАСТРОЙКИ --- */}
            {activeTab === 'settings' && viewer && (
              <section className="settings-screen page-transition">
                <div className="settings-header">
                  <Settings2 size={20} />
                  <h2>Настройки</h2>
                </div>

                {/* Сеанс */}
                <article className="panel-card settings-card">
                  <div className="panel-head compact-head">
                    <span className="eyebrow">🔐 сеанс</span>
                  </div>
                  <div className="settings-info-rows">
                    <div className="meta-row">
                      <span>Вход через</span>
                      <strong>Email</strong>
                    </div>
                    <div className="meta-row">
                      <span>Telegram привязан</span>
                      <strong>{viewer.telegramLinked ? 'Да' : 'Нет'}</strong>
                    </div>
                    <div className="meta-row">
                      <span>Статус</span>
                      <strong>{viewer.status === 'active' ? '● Активен' : '○ Заблокирован'}</strong>
                    </div>
                  </div>
                  <button className="secondary-btn danger wide settings-logout-btn" onClick={() => void signOut()}>
                    <LogOut size={16} />
                    Выйти из аккаунта
                  </button>
                </article>

                {/* Активные сессии */}
                <article className="panel-card settings-card">
                  <div className="panel-head compact-head">
                    <span className="eyebrow">📱 активные сессии</span>
                  </div>
                  {userSessions.length === 0 && !sessionsLoading && (
                    <button className="secondary-btn wide" onClick={() => void loadSessions()}>
                      Загрузить сессии
                    </button>
                  )}
                  {sessionsLoading && <p style={{ color: 'var(--muted)', fontSize: '13px', textAlign: 'center' }}>Загрузка...</p>}
                  {userSessions.length > 0 && (
                    <div className="sessions-list">
                      {userSessions.map(s => (
                        <div key={s.id} className={`session-item${s.isCurrent ? ' current' : ''}`}>
                          <div className="session-icon">
                            {/mobile|android|iphone|ipad/i.test(s.userAgent) ? <Smartphone size={18} /> : <Monitor size={18} />}
                          </div>
                          <div className="session-info">
                            <strong>{parseUserAgent(s.userAgent)}</strong>
                            <span>{s.createdAt ? new Date(s.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                          </div>
                          {s.isCurrent ? (
                            <span className="session-current-badge">текущая</span>
                          ) : (
                            <button className="session-kill-btn" onClick={() => void killSession(s.id)}>Завершить</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {userSessions.length > 0 && (
                    <button className="secondary-btn wide" style={{ marginTop: '8px' }} onClick={() => void loadSessions()}>
                      Обновить
                    </button>
                  )}
                </article>

                {/* Геолокация */}
                <article className="panel-card settings-card">
                  <div className="panel-head compact-head">
                    <span className="eyebrow">📍 геолокация</span>
                  </div>
                  <div className="settings-info-rows">
                    <div className="meta-row">
                      <span>Текущее гео</span>
                      <strong>{viewerLocation}</strong>
                    </div>
                    <div className="meta-row">
                      <span>Разрешение</span>
                      <strong>{locationState === 'granted' ? '✅ Включено' : locationState === 'denied' ? '❌ Отклонено' : '⏳ Не запрашивалось'}</strong>
                    </div>
                    <div className="meta-row">
                      <span>Видимость в профиле</span>
                      <strong>{viewer.geoAllowed ? '👁 Видно' : '🔒 Скрыто'}</strong>
                    </div>
                  </div>
                  <div className="settings-actions-row">
                    {locationState !== 'granted' && (
                      <button className="secondary-btn" onClick={requestLocation}>
                        <MapPin size={14} /> Включить гео
                      </button>
                    )}
                    <button className={viewer.geoAllowed ? 'secondary-btn' : 'secondary-btn danger'} onClick={async () => {
                      try {
                        await apiRequest('/api/location', {
                          method: 'POST',
                          body: JSON.stringify({
                            city: viewer.geoAllowed ? null : viewer.city,
                            country: viewer.geoAllowed ? null : viewer.country,
                            latitude: viewer.geoAllowed ? null : viewer.latitude,
                            longitude: viewer.geoAllowed ? null : viewer.longitude,
                          }),
                        }, sessionToken)
                        setViewer(prev => prev ? { ...prev, geoAllowed: !prev.geoAllowed } : prev)
                        showToast(viewer.geoAllowed ? 'Гео скрыто из профиля' : 'Гео показывается в профиле', 'success')
                      } catch {
                        showToast('Не удалось изменить настройку', 'error')
                      }
                    }}>
                      {viewer.geoAllowed ? <><EyeOff size={14} /> Скрыть гео</> : <><Eye size={14} /> Показать гео</>}
                    </button>
                  </div>
                </article>

                {/* Уведомления / Приватность */}
                <article className="panel-card settings-card">
                  <div className="panel-head compact-head">
                    <span className="eyebrow"># приватность</span>
                  </div>
                  <div className="settings-toggle-list">
                    <button className={viewer.preferences.allowInbox ? 'settings-toggle-item active' : 'settings-toggle-item'} onClick={() => void updatePreference('allowInbox', !viewer.preferences.allowInbox)}>
                      <MessageCircle size={16} />
                      <div><strong>Личные сообщения</strong><span>Разрешить другим писать тебе</span></div>
                      <div className={viewer.preferences.allowInbox ? 'toggle-pill on' : 'toggle-pill'} />
                    </button>
                    <button className={viewer.preferences.showCity ? 'settings-toggle-item active' : 'settings-toggle-item'} onClick={() => void updatePreference('showCity', !viewer.preferences.showCity)}>
                      <MapPin size={16} />
                      <div><strong>Показывать город</strong><span>В профиле и ленте</span></div>
                      <div className={viewer.preferences.showCity ? 'toggle-pill on' : 'toggle-pill'} />
                    </button>
                    <button className={viewer.preferences.neonProfile ? 'settings-toggle-item active' : 'settings-toggle-item'} onClick={() => void updatePreference('neonProfile', !viewer.preferences.neonProfile)}>
                      <Sparkles size={16} />
                      <div><strong>Неоновый профиль</strong><span>Яркая подсветка аватара</span></div>
                      <div className={viewer.preferences.neonProfile ? 'toggle-pill on' : 'toggle-pill'} />
                    </button>
                  </div>
                </article>

                {/* Информация */}
                <article className="panel-card settings-card">
                  <div className="panel-head compact-head">
                    <span className="eyebrow"># информация</span>
                  </div>
                  <div className="settings-info-rows">
                    <div className="meta-row">
                      <span>Версия</span>
                      <strong>Regellik 1.0</strong>
                    </div>
                    <div className="meta-row">
                      <span>Онлайн сейчас</span>
                      <strong>{onlineCount}</strong>
                    </div>
                    <div className="meta-row">
                      <span>Пользователей</span>
                      <strong>{directory.length}</strong>
                    </div>
                  </div>
                </article>
              </section>
            )}

            {/* --- АДМИНКА --- */}
            {activeTab === 'admin' && isAdmin && (
              <section className="admin-screen page-transition">

                {/* Admin header */}
                <div className="admin-top-bar">
                  <h2 className="admin-top-title"><ShieldCheck size={20} /> Панель администратора</h2>
                </div>

                {/* Quick stats row */}
                <div className="admin-quick-stats">
                  <div className="admin-qs-item">
                    <Users size={14} />
                    <strong>{adminUsers.length}</strong>
                    <span>всего</span>
                  </div>
                  <div className="admin-qs-item online">
                    <span className="online-dot" />
                    <strong>{onlineCount}</strong>
                    <span>онлайн</span>
                  </div>
                  <div className="admin-qs-item">
                    <Zap size={14} />
                    <strong>{adminUsers.reduce((s, u) => s + u.powers, 0).toFixed(0)}</strong>
                    <span>⚡</span>
                  </div>
                  <div className="admin-qs-item">
                    <Ban size={14} />
                    <strong>{adminUsers.filter(u => u.ban).length}</strong>
                    <span>бан</span>
                  </div>
                </div>

                {/* Section buttons grid */}
                <div className="admin-nav-grid">
                  {([
                    { id: 'economy' as const, icon: <DollarSign size={18} />, label: 'Экономика', desc: 'Стоимость и заработок' },
                    { id: 'site' as const, icon: <Settings2 size={18} />, label: 'Настройки', desc: 'Тумблеры сайта' },
                    { id: 'roles' as const, icon: <ShieldCheck size={18} />, label: 'Роли', desc: 'Выдача прав' },
                    { id: 'topup' as const, icon: <Zap size={18} />, label: 'Начисление', desc: 'Top-up баланса' },
                    { id: 'users' as const, icon: <Users size={18} />, label: 'Пользователи', desc: 'Управление' },
                    { id: 'bans' as const, icon: <Ban size={18} />, label: 'Баны', desc: 'Блокировки' },
                    { id: 'audit' as const, icon: <Search size={18} />, label: 'Журнал', desc: 'Audit log' },
                    { id: 'broadcast' as const, icon: <Send size={18} />, label: 'Рассылка', desc: 'Системное сообщение' },
                  ]).map(sec => (
                    <button
                      key={sec.id}
                      className={`admin-nav-btn${adminSection === sec.id ? ' active' : ''}`}
                      onClick={() => setAdminSection(adminSection === sec.id ? 'none' : sec.id)}
                    >
                      <div className="admin-nav-icon">{sec.icon}</div>
                      <div className="admin-nav-text">
                        <strong>{sec.label}</strong>
                        <span>{sec.desc}</span>
                      </div>
                      <ChevronDown size={16} className={`admin-nav-chevron${adminSection === sec.id ? ' open' : ''}`} />
                    </button>
                  ))}
                </div>

                {/* === Expandable sections === */}

                {/* Economy */}
                {adminSection === 'economy' && (
                  <form className="admin-expand-panel" onSubmit={saveSiteSettings}>
                    <div className="admin-expand-head">
                      <span># Настройки экономики</span>
                      <button className="primary-btn compact-btn" type="submit" disabled={isSavingSite}>
                        <Save size={14} /> {isSavingSite ? '...' : 'Сохранить'}
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
                )}

                {/* Site settings */}
                {adminSection === 'site' && (
                  <form className="admin-expand-panel" onSubmit={saveSiteSettings}>
                    <div className="admin-expand-head">
                      <span># Настройки сайта</span>
                      <button className="primary-btn compact-btn" type="submit" disabled={isSavingSite}>
                        <Save size={14} /> {isSavingSite ? '...' : 'Сохранить'}
                      </button>
                    </div>
                    <div className="toggle-grid admin-toggle-grid">
                      {([
                        { key: 'telegramAuthEnabled' as const, icon: <ShieldCheck size={16} />, label: 'TG auth' },
                        { key: 'emailAuthEnabled' as const, icon: <Mail size={16} />, label: 'Email' },
                        { key: 'geoRequiredForSend' as const, icon: <MapPin size={16} />, label: 'Geo req' },
                        { key: 'registrationsOpen' as const, icon: <Users size={16} />, label: 'Регистрация' },
                        { key: 'maintenanceMode' as const, icon: <Settings2 size={16} />, label: 'Тех. работы', danger: true },
                        { key: 'onlineCounterVisible' as const, icon: <Zap size={16} />, label: 'Онлайн' },
                        { key: 'publicFeedVisible' as const, icon: <MessageCircle size={16} />, label: 'Лента' },
                        { key: 'inboxEnabled' as const, icon: <Mail size={16} />, label: 'Личка' },
                        { key: 'devBadgeVisible' as const, icon: <BadgeCheck size={16} />, label: 'DEV badge' },
                        { key: 'profileEditEnabled' as const, icon: <User size={16} />, label: 'Редактирование' },
                      ] as const).map(t => (
                        <button key={t.key} className={siteSettings[t.key] ? `toggle-card active${'danger' in t && t.danger ? ' danger' : ''}` : 'toggle-card'} type="button" onClick={() => toggleSiteSetting(t.key)}>
                          {t.icon}
                          <span>{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </form>
                )}

                {/* Roles */}
                {adminSection === 'roles' && (
                  <form className="admin-expand-panel" onSubmit={grantAdmin}>
                    <div className="admin-expand-head">
                      <span># Выдача роли admin</span>
                    </div>
                    <label className="input-block">
                      <span>ID, handle или email</span>
                      <input value={grantIdentifier} onChange={e => setGrantIdentifier(e.target.value)} placeholder="@user или email" />
                    </label>
                    <button className="primary-btn wide" type="submit" disabled={isGrantingAdmin}>
                      <ShieldCheck size={16} />
                      {isGrantingAdmin ? 'Выдаю...' : 'Выдать admin'}
                    </button>
                  </form>
                )}

                {/* Top-up */}
                {adminSection === 'topup' && (
                  <div className="admin-expand-panel">
                    <div className="admin-expand-head">
                      <span>⚡ Top-up пользователю</span>
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
                      <DollarSign size={16} /> Начислить
                    </button>
                  </div>
                )}

                {/* Users */}
                {adminSection === 'users' && (
                  <div className="admin-expand-panel admin-users-section">
                    <div className="admin-expand-head">
                      <span>👥 Пользователи ({adminUsers.length})</span>
                    </div>

                    {/* Search */}
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
                      <button className="primary-btn compact-btn" onClick={() => void adminSearchUsers()} disabled={adminSearching}>
                        <Search size={14} /> {adminSearching ? '...' : 'Найти'}
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

                    {/* User list */}
                    <div className="admin-user-list">
                      {adminUsers.map(item => (
                        <button
                          key={item.id}
                          className={`admin-user-item${selectedAdminUserId === item.id ? ' active' : ''}${item.ban ? ' banned' : ''}`}
                          onClick={() => setSelectedAdminUserId(item.id)}
                        >
                          <div className="admin-user-left">
                            <strong>{item.name}</strong>
                            <span className="admin-user-handle">{item.handle}</span>
                          </div>
                          <div className="admin-user-meta">
                            <span className={`admin-role-pill ${item.role}`}>{item.role}</span>
                            {item.ban && <span className="admin-ban-pill"><Ban size={10} /> {item.ban.type}</span>}
                            {item.status === 'suspended' && <span className="admin-status-pill suspended"><Snowflake size={10} /></span>}
                            <span className="admin-powers-pill"><Zap size={11} /> {item.powers}</span>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* User editor */}
                    {adminDraft && (
                      <form className="admin-user-editor" onSubmit={saveAdminUser}>
                        <div className="admin-expand-head">
                          <span># {adminDraft.name}</span>
                          <button className="primary-btn compact-btn" type="button" onClick={() => {
                            setAdminConfirmAction({
                              label: `Сохранить изменения для ${adminDraft.name}`,
                              action: () => {
                                const form = document.querySelector<HTMLFormElement>('.admin-user-editor')
                                if (form) form.requestSubmit()
                                setAdminConfirmAction(null)
                              }
                            })
                          }} disabled={isSavingAdminUser}>
                            <Save size={14} /> {isSavingAdminUser ? '...' : 'Сохранить'}
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
                            <input value={adminDraft.name} onChange={e => setAdminDraft(c => c ? { ...c, name: e.target.value } : c)} />
                          </label>
                          <label className="input-block">
                            <span>Handle</span>
                            <input value={adminDraft.handle} onChange={e => setAdminDraft(c => c ? { ...c, handle: e.target.value } : c)} />
                          </label>
                          <label className="input-block">
                            <span>Баланс ⚡</span>
                            <input type="number" value={adminDraft.powers} onChange={e => setAdminDraft(c => c ? { ...c, powers: Number(e.target.value) || 0 } : c)} />
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
                            <input value={adminDraft.city || ''} onChange={e => setAdminDraft(c => c ? { ...c, city: e.target.value } : c)} />
                          </label>
                          <label className="input-block">
                            <span>Страна</span>
                            <input value={adminDraft.country || ''} onChange={e => setAdminDraft(c => c ? { ...c, country: e.target.value } : c)} />
                          </label>
                        </div>

                        <div className="field-grid-2">
                          <label className="input-block">
                            <span>Роль</span>
                            <select value={adminDraft.role} onChange={e => setAdminDraft(c => c ? { ...c, role: e.target.value as UserRole } : c)}>
                              <option value="user">user</option>
                              <option value="admin">admin</option>
                            </select>
                          </label>
                          <label className="input-block">
                            <span>Статус</span>
                            <select value={adminDraft.status} onChange={e => setAdminDraft(c => c ? { ...c, status: e.target.value as UserStatus } : c)}>
                              <option value="active">active</option>
                              <option value="suspended">suspended</option>
                            </select>
                          </label>
                        </div>

                        <label className="input-block">
                          <span>Tagline</span>
                          <input value={adminDraft.tagline} onChange={e => setAdminDraft(c => c ? { ...c, tagline: e.target.value } : c)} />
                        </label>

                        <label className="input-block">
                          <span>Bio</span>
                          <textarea value={adminDraft.bio} onChange={e => setAdminDraft(c => c ? { ...c, bio: e.target.value } : c)} />
                        </label>

                        <label className="input-block">
                          <span>Бейджи</span>
                          <input value={adminDraft.badgesText} onChange={e => setAdminDraft(c => c ? { ...c, badgesText: e.target.value } : c)} />
                        </label>

                        <div className="toggle-grid admin-toggle-grid">
                          <button className={adminDraft.isVisible ? 'toggle-card active' : 'toggle-card danger'} type="button" onClick={() => setAdminDraft(c => c ? { ...c, isVisible: !c.isVisible } : c)}>
                            {adminDraft.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                            <span>Видимость</span>
                          </button>
                          <button className={adminDraft.geoAllowed ? 'toggle-card active' : 'toggle-card danger'} type="button" onClick={() => setAdminDraft(c => c ? { ...c, geoAllowed: !c.geoAllowed } : c)}>
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

                        {/* Inline ban/freeze controls in editor */}
                        <div className="admin-editor-actions">
                          {adminDraft.ban ? (
                            <button type="button" className="secondary-btn wide" onClick={() => void adminUnban(adminDraft.id)}>
                              <Ban size={14} /> Снять бан ({adminDraft.ban.type})
                            </button>
                          ) : (
                            <button type="button" className="secondary-btn danger wide" onClick={() => {
                              setBanUserId(adminDraft.id)
                              setAdminSection('bans')
                            }}>
                              <Ban size={14} /> Забанить
                            </button>
                          )}
                          {adminDraft.status === 'suspended' ? (
                            <button type="button" className="secondary-btn wide" onClick={() => void adminFreeze(adminDraft.id, false)}>
                              <Snowflake size={14} /> Разморозить
                            </button>
                          ) : (
                            <button type="button" className="secondary-btn danger wide" onClick={() => {
                              setAdminConfirmAction({
                                label: `Заморозить аккаунт ${adminDraft.name}?`,
                                action: () => { void adminFreeze(adminDraft.id, true); setAdminConfirmAction(null) }
                              })
                            }}>
                              <Snowflake size={14} /> Заморозить
                            </button>
                          )}
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* Bans */}
                {adminSection === 'bans' && (
                  <div className="admin-expand-panel">
                    <div className="admin-expand-head">
                      <span>🚫 Управление банами</span>
                    </div>

                    {/* Issue ban form */}
                    <div className="admin-ban-form">
                      <label className="input-block">
                        <span>User ID</span>
                        <input value={banUserId} onChange={e => setBanUserId(e.target.value)} placeholder="id пользователя" />
                      </label>
                      <div className="field-grid-2">
                        <label className="input-block">
                          <span>Тип бана</span>
                          <select value={banType} onChange={e => setBanType(e.target.value as BanType)}>
                            <option value="global">Глобальный</option>
                            <option value="chat">Бан чата</option>
                          </select>
                        </label>
                        <label className="input-block">
                          <span>Длительность (мин)</span>
                          <input type="number" min="0" value={banDuration} onChange={e => setBanDuration(e.target.value)} placeholder="пусто = навсегда" />
                        </label>
                      </div>
                      <label className="input-block">
                        <span>Причина</span>
                        <input value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="Причина блокировки" />
                      </label>
                      <div className="admin-ban-presets">
                        <button type="button" className="secondary-btn compact-btn" onClick={() => setBanDuration('30')}><Timer size={12} /> 30 мин</button>
                        <button type="button" className="secondary-btn compact-btn" onClick={() => setBanDuration('60')}><Timer size={12} /> 1 час</button>
                        <button type="button" className="secondary-btn compact-btn" onClick={() => setBanDuration('1440')}><Timer size={12} /> 1 день</button>
                        <button type="button" className="secondary-btn compact-btn" onClick={() => setBanDuration('10080')}><Timer size={12} /> 7 дней</button>
                        <button type="button" className="secondary-btn compact-btn danger" onClick={() => setBanDuration('')}><Ban size={12} /> Навсегда</button>
                      </div>
                      <button className="primary-btn wide" onClick={() => {
                        setAdminConfirmAction({
                          label: `Забанить ${banUserId} (${banType}, ${banDuration ? banDuration + ' мин' : 'навсегда'})`,
                          action: () => { void adminBan(); setAdminConfirmAction(null) }
                        })
                      }} disabled={!banUserId || isBanning}>
                        <Ban size={16} /> {isBanning ? 'Баню...' : 'Выдать бан'}
                      </button>
                    </div>

                    {/* Active bans list */}
                    <div className="admin-bans-list">
                      <div className="admin-expand-head" style={{marginTop: 12}}>
                        <span>Активные баны</span>
                      </div>
                      {adminUsers.filter(u => u.ban).length === 0 && (
                        <div className="chats-empty" style={{padding: '16px'}}><p>Нет активных банов</p></div>
                      )}
                      {adminUsers.filter(u => u.ban).map(u => (
                        <div key={u.id} className="admin-ban-item">
                          <div className="admin-ban-info">
                            <strong>{u.name}</strong>
                            <span className="admin-ban-handle">{u.handle}</span>
                            <span className={`admin-ban-type ${u.ban!.type}`}>{u.ban!.type === 'global' ? '◉ Глобальный' : '◎ Чат'}</span>
                            <span className="admin-ban-reason">{u.ban!.reason}</span>
                            {u.ban!.until && <span className="admin-ban-until"><Timer size={11} /> до {new Date(u.ban!.until).toLocaleString('ru')}</span>}
                          </div>
                          <button className="secondary-btn compact-btn" onClick={() => void adminUnban(u.id)}>Разбан</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audit log */}
                {adminSection === 'audit' && (
                  <div className="admin-expand-panel">
                    <div className="admin-expand-head">
                      <span>📜 Журнал — Audit log</span>
                    </div>
                    <div className="audit-list">
                      {auditLog.slice(0, 50).map(item => (
                        <div key={item.id} className="audit-item">
                          <strong>{item.action}</strong>
                          <span>{item.details}</span>
                          <small>{formatRelativeTime(item.createdAt)}</small>
                        </div>
                      ))}
                      {auditLog.length === 0 && <div className="chats-empty" style={{padding: '20px'}}><p>Лог пуст</p></div>}
                    </div>
                  </div>
                )}

                {/* Broadcast */}
                {adminSection === 'broadcast' && (
                  <div className="admin-expand-panel">
                    <div className="admin-expand-head">
                      <span>📢 Системное сообщение</span>
                    </div>

                    <div className="broadcast-mode-tabs">
                      <button className={broadcastMode === 'all' ? 'broadcast-mode-tab active' : 'broadcast-mode-tab'} onClick={() => setBroadcastMode('all')}>Всем</button>
                      <button className={broadcastMode === 'selected' ? 'broadcast-mode-tab active' : 'broadcast-mode-tab'} onClick={() => setBroadcastMode('selected')}>Выбранным</button>
                    </div>

                    {broadcastMode === 'selected' && (
                      <div className="broadcast-select-block">
                        <div className="broadcast-search-row">
                          <Search size={14} />
                          <input
                            value={broadcastSearchQ}
                            onChange={e => setBroadcastSearchQ(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void searchBroadcastUsers() } }}
                            placeholder="Поиск по имени, handle, email..."
                          />
                          <button className="secondary-btn compact-btn" onClick={() => void searchBroadcastUsers()} disabled={broadcastSearching}>
                            {broadcastSearching ? '...' : 'Найти'}
                          </button>
                        </div>

                        {broadcastSearchResults.length > 0 && (
                          <div className="broadcast-search-results">
                            {broadcastSearchResults.map(u => (
                              <button
                                key={u.id}
                                className={`broadcast-user-item${broadcastSelectedUsers.some(s => s.id === u.id) ? ' selected' : ''}`}
                                onClick={() => toggleBroadcastUser(u)}
                              >
                                <span className="broadcast-user-check">{broadcastSelectedUsers.some(s => s.id === u.id) ? '●' : '○'}</span>
                                <strong>{u.name}</strong>
                                <span>{u.handle}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {broadcastSelectedUsers.length > 0 && (
                          <div className="broadcast-selected-tags">
                            <span className="broadcast-selected-label">Выбрано: {broadcastSelectedUsers.length}</span>
                            {broadcastSelectedUsers.map(u => (
                              <span key={u.id} className="broadcast-tag">
                                {u.name}
                                <button onClick={() => toggleBroadcastUser(u)}>×</button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <p className="broadcast-desc">
                      {broadcastMode === 'all'
                        ? `Отправить от имени >]Regellik всем пользователям`
                        : `Отправить от имени >]Regellik выбранным (${broadcastSelectedUsers.length})`}
                    </p>
                    <div className="broadcast-input-row">
                      <textarea
                        className="broadcast-input"
                        value={broadcastText}
                        onChange={e => setBroadcastText(e.target.value)}
                        placeholder="Текст рассылки..."
                        rows={2}
                      />
                      <button className="primary-btn compact-btn" onClick={() => void sendBroadcast()} disabled={isBroadcasting || !broadcastText.trim()}>
                        <Send size={14} /> {isBroadcasting ? '...' : 'Отправить'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Confirmation modal */}
                {adminConfirmAction && (
                  <div className="compose-modal">
                    <div className="compose-modal-backdrop" onClick={() => setAdminConfirmAction(null)} />
                    <div className="compose-modal-sheet admin-confirm-sheet">
                      <div className="admin-confirm-content">
                        <div className="admin-confirm-icon">!</div>
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
