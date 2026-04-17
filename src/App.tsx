import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BadgeCheck,
  Bell,
  ChevronRight,
  Eye,
  EyeOff,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Save,
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
  preferences: UserPreferences
  stats: UserStats
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

type BootstrapResponse = {
  viewer: SessionUser | null
  publicFeed: FeedMessage[]
  inbox: InboxMessage[]
  directory: DirectoryProfile[]
  siteSettings: SiteSettings
  adminData: AdminData | null
}

type AuthResponse = {
  token: string
  viewer: SessionUser
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

function trimTickerText(value: string, maxLength = 88) {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength).trimEnd()}…`
}

function isFiniteCoordinate(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function calculateDistanceKm(
  from: { latitude: number; longitude: number } | null,
  to: { latitude: number | null; longitude: number | null },
) {
  if (!from || !isFiniteCoordinate(to.latitude) || !isFiniteCoordinate(to.longitude)) {
    return null
  }

  const earthRadiusKm = 6371
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180
  const fromLat = (from.latitude * Math.PI) / 180
  const toLat = (to.latitude * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusKm * c
}

function formatDistanceKm(distanceKm: number | null) {
  if (distanceKm === null) {
    return 'нет гео'
  }

  if (distanceKm < 1) {
    return '<1 км'
  }

  return `${Math.round(distanceKm).toLocaleString('ru-RU')} км`
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
  const [menuOpen, setMenuOpen] = useState(false)
  const [emailName, setEmailName] = useState('')
  const [emailValue, setEmailValue] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [messageText, setMessageText] = useState('')
  const [selectedRecipient, setSelectedRecipient] = useState('')
  const [locationState, setLocationState] = useState<LocationState>('idle')
  const [locationLabel, setLocationLabel] = useState('Гео не включено')
  const [resolvedLocation, setResolvedLocation] = useState<ResolvedLocation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingSite, setIsSavingSite] = useState(false)
  const [isSavingAdminUser, setIsSavingAdminUser] = useState(false)
  const [isGrantingAdmin, setIsGrantingAdmin] = useState(false)
  const [isActivatingAdmin, setIsActivatingAdmin] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [profileName, setProfileName] = useState('')
  const [profileHandle, setProfileHandle] = useState('@regellik')
  const [profileTagline, setProfileTagline] = useState('')
  const [profileBio, setProfileBio] = useState('')
  const [adminAccessCode, setAdminAccessCode] = useState('')
  const [selectedAdminUserId, setSelectedAdminUserId] = useState('')
  const [adminDraft, setAdminDraft] = useState<AdminDraft | null>(null)
  const [grantIdentifier, setGrantIdentifier] = useState('')
  const [telegramAuthTried, setTelegramAuthTried] = useState(false)

  useEffect(() => {
    if (authOpen) {
      setMenuOpen(false)
    }
  }, [authOpen])

  const isSignedIn = Boolean(viewer)
  const isAdmin = viewer?.role === 'admin'
  const sortedDirectory = useMemo(() => [...directory].sort((left, right) => right.stats.received - left.stats.received), [directory])
  const messages24h = useMemo(() => {
    const oneDayAgo = Date.now() - 86400000
    return publicFeed.filter((item) => new Date(item.createdAt).getTime() > oneDayAgo).length
  }, [publicFeed])
  const tickerFeed = useMemo(() => publicFeed.slice(0, 8), [publicFeed])
  const marqueeFeed = useMemo(() => (tickerFeed.length > 0 ? [...tickerFeed, ...tickerFeed] : []), [tickerFeed])
  const referenceLocation = useMemo(() => {
    if (viewer && isFiniteCoordinate(viewer.latitude) && isFiniteCoordinate(viewer.longitude)) {
      return { latitude: viewer.latitude, longitude: viewer.longitude }
    }

    if (resolvedLocation) {
      return { latitude: resolvedLocation.latitude, longitude: resolvedLocation.longitude }
    }

    return null
  }, [resolvedLocation, viewer])
  const viewerLocation = useMemo(() => {
    if (viewer?.city) {
      return `${viewer.city}${viewer.country ? `, ${viewer.country}` : ''}`
    }

    return locationState === 'granted' ? locationLabel : 'Гео не включено'
  }, [locationLabel, locationState, viewer?.city, viewer?.country])
  const selectedAdminUser = useMemo(() => adminUsers.find((item) => item.id === selectedAdminUserId) || null, [adminUsers, selectedAdminUserId])

  const getDistanceLabel = useCallback((latitude: number | null, longitude: number | null) => {
    return formatDistanceKm(calculateDistanceKm(referenceLocation, { latitude, longitude }))
  }, [referenceLocation])

  const showToast = (message: string, tone: ToastTone) => {
    setToast({ message, tone })
  }

  const applyBootstrap = (data: BootstrapResponse) => {
    setViewer(data.viewer)
    setPublicFeed(data.publicFeed)
    setInbox(data.inbox)
    setDirectory(data.directory)
    setSiteSettings(data.siteSettings)
    setAdminUsers(data.adminData?.users ?? [])
    setAuditLog(data.adminData?.auditLog ?? [])
  }

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

    try {
      const data = await apiRequest<AuthResponse>('/api/auth/email', {
        method: 'POST',
        body: JSON.stringify({
          name: emailName.trim(),
          email: emailValue.trim(),
          password: emailPassword,
          location: resolvedLocation,
        }),
      })
      await completeAuth(data)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Вход не выполнен', 'error')
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
    setAdminUsers([])
    setAuditLog([])
    setActiveTab('feed')
    showToast('Сессия завершена', 'info')
  }

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!sessionToken || !viewer) {
      showToast('Сначала войди в аккаунт', 'info')
      return
    }

    if (!selectedRecipient) {
      showToast('Сначала выбери профиль', 'info')
      return
    }

    if (!messageText.trim()) {
      showToast('Напиши сообщение', 'info')
      return
    }

    if (siteSettings.geoRequiredForSend && (!viewer.geoAllowed || !viewer.city)) {
      showToast('Без гео отправка закрыта', 'error')
      return
    }

    setIsSending(true)
    try {
      const data = await apiRequest<BootstrapResponse>('/api/messages/send', {
        method: 'POST',
        body: JSON.stringify({ recipientId: selectedRecipient, text: messageText.trim() }),
      }, sessionToken)
      applyBootstrap(data)
      setMessageText('')
      showToast('Анонимка отправлена', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось отправить', 'error')
    } finally {
      setIsSending(false)
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

  const activateOwnAdminAccess = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!sessionToken || !adminAccessCode.trim()) {
      showToast('Введи admin code', 'info')
      return
    }

    setIsActivatingAdmin(true)
    try {
      const data = await apiRequest<BootstrapResponse>('/api/admin/bootstrap', {
        method: 'POST',
        body: JSON.stringify({ accessCode: adminAccessCode.trim() }),
      }, sessionToken)
      applyBootstrap(data)
      setAdminAccessCode('')
      setActiveTab('admin')
      showToast('Admin доступ активирован', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось активировать admin', 'error')
    } finally {
      setIsActivatingAdmin(false)
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
    <div className="app-shell">
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
                <span className="eyebrow">🔐 Вход</span>
                <h2>Войди или создай аккаунт</h2>
              </div>
              <button className="ghost-icon" onClick={() => setAuthOpen(false)}>
                ×
              </button>
            </div>

            <div className="auth-stack">
              {webApp?.initDataUnsafe?.user && (
                <button className="auth-card telegram-card" onClick={() => void signInTelegram(false)} disabled={!siteSettings.telegramAuthEnabled}>
                  <div>
                    <div className="auth-title">📲 Войти через Telegram</div>
                    <div className="auth-note">Ты в Telegram — нажми и войдёшь моментально</div>
                  </div>
                  <ChevronRight size={18} />
                </button>
              )}

              {/* Telegram Login Widget — для браузера (не внутри Telegram) */}
              {!webApp?.initDataUnsafe?.user && siteSettings.telegramAuthEnabled && (
                <div className="auth-card telegram-widget-card">
                  <div className="auth-title">📲 Войти через Telegram</div>
                  <div className="auth-note">Нажми кнопку ниже — откроется Telegram для подтверждения</div>
                  <div className="telegram-widget-mount" ref={widgetContainerRef} />
                </div>
              )}

              <form className="email-card" onSubmit={signInEmail}>
                <div className="auth-title">✉️ Email</div>
                <div className="auth-note">Новая почта — создастся аккаунт. Существующая — введи пароль.</div>
                <div className="form-grid">
                  <input value={emailName} onChange={(event) => setEmailName(event.target.value)} placeholder="Имя (для нового аккаунта)" />
                  <input value={emailValue} onChange={(event) => setEmailValue(event.target.value)} placeholder="Email" type="email" required />
                </div>
                <input value={emailPassword} onChange={(event) => setEmailPassword(event.target.value)} placeholder="Пароль" type="password" required />
                <button className="primary-btn wide" type="submit" disabled={!siteSettings.emailAuthEnabled}>
                  <Mail size={16} />
                  Войти / создать аккаунт
                </button>
              </form>
            </div>
          </section>
        </div>
      )}

      {/* Плавающая кнопка-меню в углу */}
      <div className={authOpen ? 'corner-menu hidden' : 'corner-menu'}>
        <button className="corner-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
          <span className="corner-menu-label">{isSignedIn ? 'Меню' : 'Зайти'}</span>
        </button>

        {menuOpen && (
          <>
            <div className="corner-menu-backdrop" onClick={() => setMenuOpen(false)} />
            <nav className="corner-menu-dropdown">
              <div className="corner-menu-header">
                <div className="brand-mark">&gt;]</div>
                <div>
                  <div className="brand-name">Regellik</div>
                  <div className="brand-sub">анонимки • профили • транзакции</div>
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
      </div>

      {tickerFeed.length > 0 && (
        <section className="anon-ticker-shell" aria-label="Последние анонимки">
          <div className="anon-ticker-head">
            <div className="anon-ticker-kicker">
              <Sparkles size={16} />
              <span>live tape</span>
            </div>
            <strong>Последние анонимки</strong>
          </div>

          <div className="anon-ticker-track">
            <div className="anon-ticker-runner">
              {marqueeFeed.map((item, index) => (
                <article key={`${item.id}-${index}`} className="anon-ticker-card">
                  <div className="anon-ticker-meta">
                    <span className="anon-ticker-author">{item.authorHandle}</span>
                    <span className="anon-ticker-dot" aria-hidden="true" />
                    <span className="anon-ticker-city">
                      <MapPin size={12} />
                      {getDistanceLabel(item.latitude, item.longitude)}
                    </span>
                    <span className="anon-ticker-dot" aria-hidden="true" />
                    <span>{formatRelativeTime(item.createdAt)}</span>
                  </div>
                  <p>{trimTickerText(item.text)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* --- ГЛАВНАЯ (для всех, без табов пока не залогинен) --- */}
      {!isSignedIn && activeTab === 'feed' && (
        <main className="main-layout">
          <section className="hero-panel landing-hero">
            <div className="hero-copy">
              <h1>Кто онлайн?</h1>
              <div className="landing-stats-row">
                <article className="hero-stat-card accent-green">
                  <span>⚡ онлайн</span>
                  <strong>{siteSettings.onlineCounterVisible ? onlineCount : '—'}</strong>
                  <small>сейчас</small>
                </article>
                <article className="hero-stat-card accent-orange">
                  <span>💬 анонимки</span>
                  <strong>{messages24h}</strong>
                  <small>за 24 часа</small>
                </article>
              </div>

              <p>Отправляй анонимки, получай ответы, зарабатывай на рефералах. Вход через Email — пару секунд.</p>

              <button className="primary-btn wide" onClick={() => setAuthOpen(true)}>
                🔽 Зайти в Регель
              </button>
            </div>
          </section>

          {publicFeed.length > 0 && (
            <section className="panel-card feed-panel">
              <div className="panel-head">
                <div>
                  <span className="eyebrow">🌐 лента</span>
                  <h2>Последние анонимки</h2>
                </div>
              </div>
              <div className="feed-list">
                {publicFeed.slice(0, 5).map((item) => (
                  <article key={item.id} className="feed-card">
                    <div className="feed-card-head">
                      <div>
                        <strong>{item.authorName}</strong>
                        <span>{item.authorHandle}</span>
                      </div>
                      <div className="city-pill">
                        <MapPin size={14} />
                        <span>{getDistanceLabel(item.latitude, item.longitude)}</span>
                      </div>
                    </div>
                    <p>{item.text}</p>
                    <small>{formatRelativeTime(item.createdAt)}</small>
                  </article>
                ))}
              </div>
            </section>
          )}

          <footer className="app-footer">
            <span>Regellik © 2024</span>
            <span>•</span>
            <span>Нормы и Согласие</span>
            <span>•</span>
            <span>Обратная связь</span>
            <span>•</span>
            <span>О Нас</span>
          </footer>
        </main>
      )}

      {/* --- ОСНОВНОЙ КОНТЕНТ (залогинен) --- */}
      {isSignedIn && (
        <>
          <main className="main-layout">
            {/* --- ЧАТЫ --- */}
            {activeTab === 'chats' && (
              <section className="content-grid">
                <div className="content-main">
                  <div className="landing-stats-row">
                    <article className="hero-stat-card accent-green">
                      <span>⚡ онлайн</span>
                      <strong>{siteSettings.onlineCounterVisible ? onlineCount : '—'}</strong>
                      <small>сейчас</small>
                    </article>
                    <article className="hero-stat-card accent-orange">
                      <span>💬 анонимки</span>
                      <strong>{messages24h}</strong>
                      <small>за 24 часа</small>
                    </article>
                  </div>

                  <section className="panel-card directory-panel">
                    <div className="panel-head">
                      <div>
                        <span className="eyebrow">👥 кому писать</span>
                        <h2>Профили</h2>
                      </div>
                      <div className="head-chip">
                        <Users size={15} />
                        <span>{sortedDirectory.length}</span>
                      </div>
                    </div>

                    <div className="directory-grid">
                      {sortedDirectory.map((item) => (
                        <button
                          key={item.id}
                          className={selectedRecipient === item.id ? 'directory-card selected' : 'directory-card'}
                          onClick={() => setSelectedRecipient(item.id)}
                        >
                          <div className="directory-avatar">
                            {item.avatarUrl ? <img src={item.avatarUrl} alt={item.name} /> : <span>{item.name[0]}</span>}
                          </div>
                          <div className="directory-copy">
                            <strong>{item.name}</strong>
                            <span>{item.handle}</span>
                            <small>{getDistanceLabel(item.latitude, item.longitude)} от тебя</small>
                            <small>{item.tagline}</small>
                            <div className="badge-row">
                              {item.badges.slice(0, 3).map((badge) => (
                                <span key={badge} className="mini-badge">{badge}</span>
                              ))}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="panel-card compose-panel">
                    <div className="panel-head">
                      <div>
                        <span className="eyebrow">✍️ анонимка</span>
                        <h2>Отправка</h2>
                      </div>
                      <div className={viewer?.geoAllowed ? 'status-chip success' : 'status-chip danger'}>
                        <MapPin size={14} />
                        <span>{siteSettings.geoRequiredForSend ? (viewer?.geoAllowed ? 'гео вкл' : 'гео выкл') : 'гео не требуется'}</span>
                      </div>
                    </div>

                    <form className="compose-form" onSubmit={sendMessage}>
                      <textarea value={messageText} onChange={(event) => setMessageText(event.target.value)} placeholder="Напиши анонимное сообщение" />
                      <button className="primary-btn wide" type="submit" disabled={isSending || (siteSettings.geoRequiredForSend && !viewer?.geoAllowed)}>
                        <Send size={16} />
                        {isSending ? '⏳ Отправка...' : '🚀 Отправить'}
                      </button>
                    </form>
                  </section>

                  <section className="panel-card feed-panel">
                    <div className="panel-head">
                      <div>
                        <span className="eyebrow">🌐 лента</span>
                        <h2>Публично</h2>
                      </div>
                    </div>
                    <div className="feed-list">
                      {publicFeed.map((item) => (
                        <article key={item.id} className="feed-card">
                          <div className="feed-card-head">
                            <div>
                              <strong>{item.authorName}</strong>
                              <span>{item.authorHandle}</span>
                            </div>
                            <div className="city-pill">
                              <MapPin size={14} />
                              <span>{getDistanceLabel(item.latitude, item.longitude)}</span>
                            </div>
                          </div>
                          <p>{item.text}</p>
                          <small>{formatRelativeTime(item.createdAt)}</small>
                        </article>
                      ))}
                    </div>
                  </section>
                </div>

                <aside className="content-side">
                  <section className="panel-card inbox-panel">
                    <div className="panel-head">
                      <div>
                        <span className="eyebrow">📥 входящие</span>
                        <h2>Личные</h2>
                      </div>
                    </div>
                    <div className="inbox-list">
                      {inbox.map((item) => (
                        <article key={item.id} className="inbox-card">
                          <div className="inbox-head">
                            <div>
                              <strong>{item.senderLabel}</strong>
                              <span>{item.senderHandle}</span>
                            </div>
                            <div className="geo-mini">
                              <MapPin size={13} />
                              <span>{getDistanceLabel(item.senderLatitude, item.senderLongitude)}</span>
                            </div>
                          </div>
                          <p>{item.text}</p>
                          <small>{getDistanceLabel(item.senderLatitude, item.senderLongitude)} • {formatRelativeTime(item.createdAt)}</small>
                        </article>
                      ))}
                    </div>
                  </section>
                </aside>
              </section>
            )}

            {/* --- ПРОФИЛЬ --- */}
            {activeTab === 'profile' && viewer && (
              <section className="profile-screen deep-profile-screen">
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
                    Приглашай друзей — получай бонусы к лимитам. Каждый реферал = +5 отправок и +5 получений в сутки.
                  </p>
                  <div className="referral-stats">
                    <div className="referral-stat">
                      <Users size={20} />
                      <strong>{viewer.stats.referrals}</strong>
                      <span>приглашённых</span>
                    </div>
                    <div className="referral-stat">
                      <Zap size={20} />
                      <strong>+{viewer.stats.referrals * 5}</strong>
                      <span>бонус лимитов</span>
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
                    <span>мой id</span>
                    <strong>{viewer.id}</strong>
                  </div>
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

                {!isAdmin && (
                  <form className="panel-card admin-bootstrap-card" onSubmit={activateOwnAdminAccess}>
                    <div className="panel-head">
                      <div>
                        <span className="eyebrow">🛡️ вход в админку</span>
                        <h2>Активировать admin</h2>
                      </div>
                    </div>
                    <p className="hero-card-copy">
                      Введи admin code, который задан на сервере.
                    </p>
                    <label className="input-block">
                      <span>Admin code</span>
                      <input value={adminAccessCode} onChange={(event) => setAdminAccessCode(event.target.value)} placeholder="admin code" type="password" />
                    </label>
                    <button className="primary-btn wide" type="submit" disabled={isActivatingAdmin}>
                      <ShieldCheck size={16} />
                      {isActivatingAdmin ? 'Проверяю...' : 'Получить admin'}
                    </button>
                  </form>
                )}

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
              <section className="transactions-screen">
                <article className="panel-card">
                  <div className="panel-head">
                    <div>
                      <span className="eyebrow">💰 транзакции</span>
                      <h2>Баланс и операции</h2>
                    </div>
                  </div>
                  <div className="landing-stats-row">
                    <article className="hero-stat-card accent-green">
                      <span>⚡ баланс</span>
                      <strong>{viewer?.powers ?? 0}</strong>
                      <small>powers</small>
                    </article>
                    <article className="hero-stat-card accent-orange">
                      <span>🔗 рефералы</span>
                      <strong>{viewer?.stats.referrals ?? 0}</strong>
                      <small>приглашённых</small>
                    </article>
                  </div>
                  <div className="limits-note" style={{ marginTop: '16px' }}>
                    <span>💡 Regellik+ (premium) — увеличенные лимиты, приоритетная доставка анонимок, эксклюзивные бейджи. Скоро.</span>
                  </div>
                </article>
              </section>
            )}

            {/* --- АДМИНКА --- */}
            {activeTab === 'admin' && isAdmin && (
              <section className="admin-screen">
                <div className="admin-grid">
                  <div className="admin-left-column">
                    <form className="panel-card admin-settings-card" onSubmit={saveSiteSettings}>
                      <div className="panel-head">
                        <div>
                          <span className="eyebrow">⚙️ сайт</span>
                          <h2>Настройки</h2>
                        </div>
                        <button className="primary-btn" type="submit" disabled={isSavingSite}>
                          <Save size={16} />
                          {isSavingSite ? 'Сохраняю...' : 'Сохранить'}
                        </button>
                      </div>

                      <div className="toggle-grid admin-toggle-grid">
                        <button className={siteSettings.telegramAuthEnabled ? 'toggle-card active' : 'toggle-card'} type="button" onClick={() => toggleSiteSetting('telegramAuthEnabled')}>
                          <ShieldCheck size={16} />
                          <span>Telegram auth</span>
                        </button>
                        <button className={siteSettings.emailAuthEnabled ? 'toggle-card active' : 'toggle-card'} type="button" onClick={() => toggleSiteSetting('emailAuthEnabled')}>
                          <Mail size={16} />
                          <span>Email auth</span>
                        </button>
                        <button className={siteSettings.geoRequiredForSend ? 'toggle-card active' : 'toggle-card'} type="button" onClick={() => toggleSiteSetting('geoRequiredForSend')}>
                          <MapPin size={16} />
                          <span>Geo required</span>
                        </button>
                        <button className={siteSettings.registrationsOpen ? 'toggle-card active' : 'toggle-card'} type="button" onClick={() => toggleSiteSetting('registrationsOpen')}>
                          <Users size={16} />
                          <span>Регистрация</span>
                        </button>
                        <button className={siteSettings.maintenanceMode ? 'toggle-card active danger' : 'toggle-card'} type="button" onClick={() => toggleSiteSetting('maintenanceMode')}>
                          <Settings2 size={16} />
                          <span>Maintenance</span>
                        </button>
                        <button className={siteSettings.onlineCounterVisible ? 'toggle-card active' : 'toggle-card'} type="button" onClick={() => toggleSiteSetting('onlineCounterVisible')}>
                          <Zap size={16} />
                          <span>Online counter</span>
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

                    <form className="panel-card admin-grant-card" onSubmit={grantAdmin}>
                      <div className="panel-head">
                        <div>
                          <span className="eyebrow">🛡️ выдача админки</span>
                          <h2>Роль admin</h2>
                        </div>
                      </div>
                      <label className="input-block">
                        <span>id, handle или email</span>
                        <input value={grantIdentifier} onChange={(event) => setGrantIdentifier(event.target.value)} placeholder="@user или email@example.com" />
                      </label>
                      <button className="primary-btn wide" type="submit" disabled={isGrantingAdmin}>
                        <ShieldCheck size={16} />
                        {isGrantingAdmin ? 'Выдаю...' : 'Выдать admin'}
                      </button>
                    </form>

                    <article className="panel-card audit-card">
                      <div className="panel-head">
                        <div>
                          <span className="eyebrow">📜 журнал</span>
                          <h2>Audit log</h2>
                        </div>
                      </div>
                      <div className="audit-list">
                        {auditLog.map((item) => (
                          <div key={item.id} className="audit-item">
                            <strong>{item.action}</strong>
                            <span>{item.details}</span>
                            <small>{formatRelativeTime(item.createdAt)}</small>
                          </div>
                        ))}
                      </div>
                    </article>
                  </div>

                  <div className="admin-right-column">
                    <article className="panel-card admin-users-card">
                      <div className="panel-head">
                        <div>
                          <span className="eyebrow">👥 пользователи</span>
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
                            <div>
                              <strong>{item.name}</strong>
                              <span>{item.handle}</span>
                            </div>
                            <div className="admin-user-meta">
                              <span>{item.role}</span>
                              <span>{item.status}</span>
                              <span>{item.powers}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </article>

                    {adminDraft && (
                      <form className="panel-card admin-editor-card" onSubmit={saveAdminUser}>
                        <div className="panel-head">
                          <div>
                            <span className="eyebrow">🛠️ редактор</span>
                            <h2>{adminDraft.name}</h2>
                          </div>
                          <button className="primary-btn" type="submit" disabled={isSavingAdminUser}>
                            <Save size={16} />
                            {isSavingAdminUser ? 'Сохраняю...' : 'Сохранить'}
                          </button>
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
                            <span>Баланс</span>
                            <input type="number" value={adminDraft.powers} onChange={(event) => setAdminDraft((current) => (current ? { ...current, powers: Number(event.target.value) || 0 } : current))} />
                          </label>
                        </div>

                        <div className="quick-actions-row">
                          <button className="secondary-btn" type="button" onClick={() => adjustAdminPowers(-100)}>-100</button>
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
