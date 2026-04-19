import type { FormEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  Bell,
  Camera,
  Copy,
  Dices,
  DollarSign,
  Eye,
  EyeOff,
  Flame,
  Hash,
  LayoutGrid,
  List,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  MessageSquare,
  Minus,
  Monitor,
  Plus,
  Radar,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Smartphone,
  Snowflake,
  Sparkles,
  Timer,
  Trash2,
  TrendingUp,
  User,
  UserCog,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react'
import './App.css'
import { translations } from './i18n'
import type { Lang } from './i18n'

type TabId = 'feed' | 'home' | 'chats' | 'profile' | 'transactions' | 'admin' | 'radar' | 'settings' | 'trends' | 'profile-view'
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
  profileViews?: number
  followerCount: number
  followingCount: number
  postCount: number
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

type PostComment = {
  id: string
  authorId: string
  authorName: string
  authorHandle: string
  text: string
  createdAt: string
}

type Post = {
  id: string
  authorId: string
  authorName: string
  authorHandle: string
  authorAvatarUrl: string | null
  authorBadges?: string[]
  text: string
  imageUrl?: string | null
  imageUrls?: string[]
  createdAt: string
  boosts: number
  boostedByViewer: boolean
  reposts: number
  repostedByViewer: boolean
  commentsCount: number
  comments: PostComment[]
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
  reports: UserReport[]
}

type ReportStatus = 'open' | 'resolved' | 'dismissed'

type UserReport = {
  id: string
  reporterId: string
  reporterName: string
  reporterHandle: string
  targetUserId: string
  targetUserName: string
  targetUserHandle: string
  postId?: string | null
  postPreview?: string | null
  category: string
  text: string
  status: ReportStatus
  createdAt: string
  updatedAt: string
  relatedPosts?: Post[]
}

type PublicProfileUser = {
  id: string
  name: string
  handle: string
  bio: string
  tagline: string
  avatarUrl: string | null
  badges: string[]
  powers: number
  city: string | null
  country: string | null
  joinedAt: string
  profileViews: number
  followerCount: number
  followingCount: number
  postCount: number
}

type ProfileViewData = {
  user: PublicProfileUser
  posts: Post[]
  isFollowing: boolean
}

type PublicProfileTab = 'posts' | 'info'

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

type TxType = 'message_sent' | 'message_received' | 'topup' | 'deduct' | 'boost_received' | 'boost_removed' | 'referral'

type Transaction = {
  id: string
  type: TxType
  delta: number
  description: string
  balanceAfter: number
  meta: Record<string, string> | null
  createdAt: string
}

// ======= BADGE / PREFIX SYSTEM =======
type BadgeDef = {
  id: string         // e.g. 'ADMIN', 'VIP', 'GHOST', etc.
  label: string      // displayed text
  cssClass: string   // CSS class for animation style
  icon: string       // emoji prefix
}

const BADGE_CATALOG: BadgeDef[] = [
  { id: 'ADMIN',   label: 'Admin',   cssClass: 'badge-admin',   icon: '⚙' },
  { id: 'CORE',    label: 'Core',    cssClass: 'badge-core',    icon: '◈' },
  { id: 'VIP',     label: 'VIP',     cssClass: 'badge-vip',     icon: '♛' },
  { id: 'TOP',     label: 'Top',     cssClass: 'badge-top',     icon: '▲' },
  { id: 'LIVE',    label: 'Live',    cssClass: 'badge-live',    icon: '●' },
  { id: 'NEW',     label: 'New',     cssClass: 'badge-new',     icon: '✦' },
  { id: 'GHOST',   label: 'Ghost',   cssClass: 'badge-ghost',   icon: '◌' },
  { id: 'LEGEND',  label: 'Legend',  cssClass: 'badge-legend',  icon: '★' },
  { id: 'HACKER',  label: 'Hacker',  cssClass: 'badge-hacker',  icon: '⌨' },
  { id: 'NEON',    label: 'Neon',    cssClass: 'badge-neon',    icon: '◉' },
  { id: 'ROYAL',   label: 'Royal',   cssClass: 'badge-royal',   icon: '♜' },
  { id: 'SHADOW',  label: 'Shadow',  cssClass: 'badge-shadow',  icon: '▪' },
  { id: 'FIRE',    label: 'Fire',    cssClass: 'badge-fire',    icon: '◆' },
  { id: 'ICE',     label: 'Ice',     cssClass: 'badge-ice',     icon: '❄' },
  { id: 'VERIFIED',label: 'Verified',cssClass: 'badge-verified',icon: '✓' },
]

function getBadgeDef(id: string): BadgeDef {
  if (id.startsWith('CUSTOM|')) {
    const parts = id.split('|')
    return { id, icon: parts[1] ?? '◦', label: parts[2] ?? id, cssClass: parts[3] ?? 'badge-default' }
  }
  return BADGE_CATALOG.find(b => b.id === id) ?? { id, label: id, cssClass: 'badge-default', icon: '◦' }
}

type BootstrapResponse = {
  viewer: SessionUser | null
  publicFeed: FeedMessage[]
  inbox: InboxMessage[]
  directory: DirectoryProfile[]
  conversations: ConversationPreview[]
  siteSettings: SiteSettings
  adminData: AdminData | null
  posts?: Post[]
  powerLog?: Transaction[]
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

function formatRelativeTime(value: string, lang: 'uz' | 'ru' = 'uz') {
  const then = new Date(value).getTime()
  const diffMinutes = Math.max(0, Math.floor((Date.now() - then) / 60000))

  if (diffMinutes < 1) {
    return lang === 'ru' ? 'только что' : 'hozirgina'
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} ${lang === 'ru' ? 'мин' : 'daq'}`
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
  if (type === 'system') return '>]'
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
    const payload = await response.json().catch(() => ({ error: 'Error' }))
    throw new Error(payload.error || 'Error')
  }

  return (await response.json()) as T
}

function BadgeChip({ id }: { id: string }) {
  const def = getBadgeDef(id)
  return (
    <span className={`profile-badge-chip ${def.cssClass}`}>
      <span className="badge-icon">{def.icon}</span>
      <span className="badge-label">{def.label}</span>
    </span>
  )
}

function App() {
  const [sessionToken, setSessionToken] = useState('')
  const [viewer, setViewer] = useState<SessionUser | null>(null)
  const [publicFeed, setPublicFeed] = useState<FeedMessage[]>([])
  const [inbox, setInbox] = useState<InboxMessage[]>([])
  const [_directory, setDirectory] = useState<DirectoryProfile[]>([])
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS)
  const [adminUsers, setAdminUsers] = useState<AdminManagedUser[]>([])
  const [auditLog, setAuditLog] = useState<AuditLogItem[]>([])
  const [reports, setReports] = useState<UserReport[]>([])
  const [onlineCount, setOnlineCount] = useState(0)
  const [activeTab, setActiveTab] = useState<TabId>('feed')
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('regellik_lang') as Lang) || 'uz')
  const t = translations[lang]
  const switchLang = (l: Lang) => { setLang(l); localStorage.setItem('regellik_lang', l) }
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
  const [locationLabel, setLocationLabel] = useState('')
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
  const [txSubTab, setTxSubTab] = useState<'balance' | 'history'>('balance')
  const [profileTagline, setProfileTagline] = useState('')
  const [profileBio, setProfileBio] = useState('')
  const [adminDraft, setAdminDraft] = useState<AdminDraft | null>(null)
  const [selectedAdminUserId, setSelectedAdminUserId] = useState<string | null>('')
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
  const [chatSearch, setChatSearch] = useState('')

  // Radar state
  const [radarUsers, setRadarUsers] = useState<RadarUser[]>([])
  const [isRadarLoading, setIsRadarLoading] = useState(false)

  // Trends / Posts state
  const [posts, setPosts] = useState<Post[]>([])
  const [trendsSort, setTrendsSort] = useState<'top' | 'new'>('top')
  const [trendsView, setTrendsView] = useState<'grid' | 'feed'>('grid')
  const [gridSelectedPost, setGridSelectedPost] = useState<Post | null>(null)
  const [selectedOwnPost, setSelectedOwnPost] = useState<Post | null>(null)
  // Auth password
  const [authMethod, setAuthMethod] = useState<'password' | 'code'>('password')
  const [regLangStep, setRegLangStep] = useState(false)
  const [authPassword, setAuthPassword] = useState('')
  const [authConfirmPassword, setAuthConfirmPassword] = useState('')
  const [authPasswordVisible, setAuthPasswordVisible] = useState(false)
  const [isAuthingPassword, setIsAuthingPassword] = useState(false)
  // Transfer
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferHandle, setTransferHandle] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferLoading, setTransferLoading] = useState(false)
  const [transferResult, setTransferResult] = useState<{ok: boolean; name?: string; handle?: string; amount?: number; fee?: number; error?: string} | null>(null)
  const [newPostText, setNewPostText] = useState('')
  const [newPostImages, setNewPostImages] = useState<string[]>([])
  const [isCreatingPost, setIsCreatingPost] = useState(false)
  const [expandedPostComments, setExpandedPostComments] = useState<Set<string>>(new Set())
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({})

  // Transactions / Power log
  const [powerLog, setPowerLog] = useState<Transaction[]>([])
  const [txLoading, setTxLoading] = useState(false)

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
  type AdminSectionId = 'none' | 'economy' | 'site' | 'roles' | 'topup' | 'users' | 'bans' | 'audit' | 'broadcast' | 'badges' | 'reports'
  const [adminSection, setAdminSection] = useState<AdminSectionId>('none')
  const [adminBadgeTab, setAdminBadgeTab] = useState<'catalog' | 'custom'>('catalog')
  const [customBadgeIcon, setCustomBadgeIcon] = useState('◆')
  const [customBadgeLabel, setCustomBadgeLabel] = useState('')
  const [customBadgeCss, setCustomBadgeCss] = useState('badge-vip')

  // Profile viewer (for admins)
  const [viewedProfile, setViewedProfile] = useState<ProfileViewData | null>(null)
  const [profileViewTab, setProfileViewTab] = useState<PublicProfileTab>('posts')
  const [isProfileActionLoading, setIsProfileActionLoading] = useState(false)
  const [reportProfileOpen, setReportProfileOpen] = useState(false)
  const [reportReason, setReportReason] = useState<string>(t.reportCustom)
  const [reportText, setReportText] = useState('')
  const [reportPostId, setReportPostId] = useState<string>('')
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // Recently viewed contacts
  const [recentlyViewedUsers, setRecentlyViewedUsers] = useState<{id: string, name: string, handle: string, avatarUrl: string | null}[]>(() => {
    try { return JSON.parse(localStorage.getItem('rvu') || '[]') as {id: string, name: string, handle: string, avatarUrl: string | null}[] } catch { return [] }
  })

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
    if (newTab !== 'chats') {
      setChatSearch('')
    }
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
      showToast(t.chatDeleted, 'success')
    } catch {
      showToast(t.chatDeleteError, 'error')
    } finally {
      setDeletingConvoId(null)
    }
  }

  const deleteAvatar = async () => {
    if (!sessionToken || !viewer) return
    try {
      await apiRequest<{ ok: boolean }>('/api/profile/avatar', { method: 'DELETE' }, sessionToken)
      setViewer({ ...viewer, avatarUrl: null })
      showToast(t.avatarDeleted, 'success')
    } catch {
      showToast(t.avatarDeleteError, 'error')
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
  const frt = (value: string) => formatRelativeTime(value, lang)
  const viewerLocation = useMemo(() => {
    if (viewer?.city) {
      return `${viewer.city}${viewer.country ? `, ${viewer.country}` : ''}`
    }
    return locationState === 'granted' ? (locationLabel || t.geoActivated) : t.geoNotEnabled
  }, [locationLabel, locationState, viewer?.city, viewer?.country, lang, t])
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
    setProfileHandle(value)
    checkHandleAvailability(value)
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
    setReports(data.adminData?.reports ?? [])
    if (data.posts) setPosts(data.posts)
    if (data.powerLog) setPowerLog(data.powerLog)
  }

  // Header auto-hide on scroll — smooth, no flicker
  const scrollAccum = useRef(0)
  useEffect(() => {
    let ticking = false
    const THRESHOLD = 30 // px of consistent scroll before toggling
    const handleScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const currentY = window.scrollY
        const delta = currentY - lastScrollY.current
        lastScrollY.current = currentY
        ticking = false
        // At very top — always show
        if (currentY <= 20) {
          scrollAccum.current = 0
          setHeaderHidden(false)
          return
        }
        // Accumulate scroll direction; reset if direction changes
        if ((delta > 0 && scrollAccum.current < 0) || (delta < 0 && scrollAccum.current > 0)) {
          scrollAccum.current = 0
        }
        scrollAccum.current += delta
        if (scrollAccum.current > THRESHOLD) {
          setHeaderHidden(true)
          scrollAccum.current = 0
        } else if (scrollAccum.current < -THRESHOLD) {
          setHeaderHidden(false)
          scrollAccum.current = 0
        }
      })
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

        if (data.viewer && (activeTab === 'feed' || activeTab === 'home')) {
          setActiveTab('chats')
        }

        if (!data.viewer && sessionToken) {
          window.localStorage.removeItem(SESSION_KEY)
          setSessionToken('')
          showToast(t.sessionExpired, 'error')
        }
      } catch (error) {
        if (!cancelled) {
          showToast(error instanceof Error ? error.message : t.loadError, 'error')
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
          const senderName = payload.message.senderName || t.someone
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
    if (!selectedAdminUser) {
      setAdminDraft(null)
    }
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
      showToast(error instanceof Error ? error.message : t.geoUpdateError, 'error')
    }
  }

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationState('denied')
      setLocationLabel(t.geoUnavailable)
      showToast(t.geoDeviceError, 'error')
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
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.state || t.cityFallback
          const country = data.address?.country || t.locationFallback
          const nextLocation = {
            city,
            country,
            latitude: coords.latitude,
            longitude: coords.longitude,
          }

          setResolvedLocation(nextLocation)
          setLocationState('granted')
          setLocationLabel(`${city}, ${country}`)
          showToast(`${t.geoActivated}: ${city}`, 'success')
          if (sessionToken) {
            await syncLocation(nextLocation)
          }
        } catch {
          setLocationState('granted')
          setLocationLabel(t.geoActivated)
          showToast(t.geoActivated, 'success')
        }
      },
      () => {
        setLocationState('denied')
        setLocationLabel(t.geoRequired)
        showToast(t.geoRequired, 'error')
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
    showToast(`${t.loginSuccess} ${data.viewer.name}`, 'success')

    if (resolvedLocation && !data.viewer.geoAllowed && !geoUserDisabled.current) {
      await syncLocation(resolvedLocation)
    }
  }

  const sendEmailCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!emailValue.trim()) {
      showToast(t.emailHint, 'info')
      return
    }
    if (authMode === 'register' && !emailName.trim()) {
      showToast(t.nameHint, 'info')
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
      showToast(result.hint || t.codeSentMail, 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.codeSendError, 'error')
    } finally {
      setIsSendingCode(false)
    }
  }

  const signInEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!emailCode.trim()) {
      showToast(t.enterCodeHint, 'info')
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
        showToast(t.accountCreated, 'success')
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.authError, 'error')
    }
  }

  const loginWithPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailValue.trim() || !authPassword) return
    setIsAuthingPassword(true)
    try {
      const data = await apiRequest<AuthResponse>('/api/auth/password', {
        method: 'POST',
        body: JSON.stringify({ mode: 'login', email: emailValue.trim(), password: authPassword }),
      })
      await completeAuth(data)
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.loginError, 'error')
    } finally {
      setIsAuthingPassword(false)
    }
  }

  const registerWithPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailName.trim() || !emailValue.trim() || !authPassword) return
    if (authPassword.length < 8) { showToast(t.passwordMin, 'info'); return }
    if (authPassword !== authConfirmPassword) { showToast(t.passwordMismatch, 'info'); return }
    setIsAuthingPassword(true)
    try {
      const data = await apiRequest<AuthResponse>('/api/auth/password', {
        method: 'POST',
        body: JSON.stringify({ mode: 'register', email: emailValue.trim(), name: emailName.trim(), password: authPassword }),
      })
      await completeAuth(data)
      showToast(t.accountCreated, 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.registerError, 'error')
    } finally {
      setIsAuthingPassword(false)
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
    setReports([])
    setViewedProfile(null)
    setReportProfileOpen(false)
    setReportPostId('')
    setLightboxOpen(false)
    setActiveTab('feed')
    showToast(t.sessionTerminated, 'info')
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
      showToast(t.sessionTerminated, 'success')
      void loadSessions()
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.error, 'error')
    }
  }

  function parseUserAgent(ua: string) {
    if (!ua) return t.unknownDevice
    const isMobile = /mobile|android|iphone|ipad/i.test(ua)
    const isTelegram = /telegram/i.test(ua)
    let browser: string = t.browserFallback
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
      showToast(error instanceof Error ? error.message : t.chatLoadError, 'error')
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
      showToast(error instanceof Error ? error.message : t.sendError, 'error')
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
      showToast(error instanceof Error ? error.message : t.chatCreateError, 'error')
    }
  }

  const loadRadar = async () => {
    if (!sessionToken) return
    setIsRadarLoading(true)
    try {
      const data = await apiRequest<{ users: RadarUser[] }>('/api/radar', undefined, sessionToken)
      setRadarUsers(data.users)
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.radarError, 'error')
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
      showToast(t.notifError, 'error')
    } finally {
      setNotifLoading(false)
    }
  }

  const sendBroadcast = async () => {
    if (!broadcastText.trim() || !sessionToken) return
    if (broadcastMode === 'selected' && broadcastSelectedUsers.length === 0) {
      showToast(t.selectRecipients, 'info')
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
      showToast(`${t.broadcastSent}: ${data.sent}`, 'success')
      setBroadcastText('')
      setBroadcastSelectedUsers([])
      setBroadcastSearchResults([])
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.broadcastError, 'error')
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
      showToast(t.searchError, 'error')
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
      showToast(t.searchError, 'error')
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
      showToast(`+${adminTopUpAmount}`, 'success')
      setAdminTopUpUserId('')
      setAdminTopUpAmount('')
      setAdminTopUpReason('')
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.error, 'error')
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
      showToast('Ban ✓', 'success')
      setBanUserId('')
      setBanReason('')
      setBanDuration('')
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.error, 'error')
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
      showToast('Unban ✓', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.error, 'error')
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
      showToast(frozen ? 'Frozen ✓' : 'Unfrozen ✓', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.error, 'error')
    }
  }

  const updateProfile = async (event?: FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault()

    if (!viewer || !sessionToken) {
      showToast(t.loginFirst, 'info')
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
      showToast(t.profileSaved, 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.profileSaveError, 'error')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const saveProfile = () => void updateProfile()

  const loadTransactions = async () => {
    if (!viewer || !sessionToken) return
    setTxLoading(true)
    try {
      const data = await apiRequest<{ powerLog: Transaction[]; powers: number; stats: typeof viewer.stats }>('/api/transactions')
      setPowerLog(data.powerLog)
    } catch {
      // ignore
    } finally {
      setTxLoading(false)
    }
  }

  const handlePostImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    const nextImages: string[] = []
    for (const file of files.slice(0, Math.max(0, 6 - newPostImages.length))) {
      if (!file.type.match(/^image\/(png|jpeg|webp|gif)$/)) {
        showToast(t.photoFormat, 'error')
        continue
      }
      if (file.size > 768 * 1024) {
        showToast(t.photoSize, 'error')
        continue
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      nextImages.push(dataUrl)
    }

    if (nextImages.length > 0) {
      setNewPostImages((current) => [...current, ...nextImages].slice(0, 6))
    }
    event.target.value = ''
  }

  const createPost = async () => {
    if (!viewer || !sessionToken || !newPostText.trim()) return
    setIsCreatingPost(true)
    try {
      const data = await apiRequest<{ post: Post }>('/api/posts', {
        method: 'POST',
        body: JSON.stringify({ text: newPostText.trim(), imageUrls: newPostImages }),
      }, sessionToken)
      setPosts(prev => [data.post, ...prev])
      setNewPostText('')
      setNewPostImages([])
      showToast(t.published, 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.publishError, 'error')
    } finally {
      setIsCreatingPost(false)
    }
  }

  const [boostBursts, setBoostBursts] = useState<{ id: number; postId: string }[]>([])

  const boostPost = async (postId: string) => {
    if (!viewer || !sessionToken) return
    const burstId = Date.now()
    setBoostBursts(prev => [...prev, { id: burstId, postId }])
    setTimeout(() => setBoostBursts(prev => prev.filter(b => b.id !== burstId)), 900)
    try {
      const data = await apiRequest<{ post: Post; viewerPowers?: number }>(`/api/posts/${postId}/boost`, {
        method: 'POST',
      }, sessionToken)
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...data.post } : p))
      if (data.viewerPowers !== undefined) {
        setViewer(prev => prev ? { ...prev, powers: data.viewerPowers! } : prev)
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.error, 'error')
    }
  }

  const adminDeletePost = async (postId: string) => {
    if (!sessionToken) return
    try {
      await apiRequest(`/api/admin/posts/${postId}`, { method: 'DELETE' }, sessionToken)
      setPosts(prev => prev.filter(p => p.id !== postId))
      setReports(prev => prev.map(report => ({
        ...report,
        relatedPosts: report.relatedPosts?.filter(post => post.id !== postId) || [],
      })))
      setViewedProfile(current => current ? { ...current, posts: current.posts.filter(post => post.id !== postId) } : current)
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.error, 'error')
    }
  }

  const repostPost = async (postId: string) => {
    if (!viewer || !sessionToken) return
    try {
      const data = await apiRequest<{ post: Post; reposted: boolean }>(`/api/posts/${postId}/repost`, { method: 'POST' }, sessionToken)
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...data.post } : p))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.error, 'error')
    }
  }

  const doTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionToken || !transferHandle.trim() || !transferAmount) return
    setTransferLoading(true)
    setTransferResult(null)
    try {
      const data = await apiRequest<{ok: boolean; sentAmount: number; fee: number; viewerPowers: number; recipientName: string; recipientHandle: string}>('/api/transfer', {
        method: 'POST',
        body: JSON.stringify({ toHandle: transferHandle.trim(), amount: Number(transferAmount) }),
      }, sessionToken)
      setViewer(prev => prev ? { ...prev, powers: data.viewerPowers } : prev)
      setTransferResult({ ok: true, name: data.recipientName, handle: data.recipientHandle, amount: data.sentAmount, fee: data.fee })
      setTransferHandle('')
      setTransferAmount('')
    } catch (err) {
      setTransferResult({ ok: false, error: err instanceof Error ? err.message : t.error })
    } finally {
      setTransferLoading(false)
    }
  }

  const openUserProfile = async (userId: string) => {
    if (!sessionToken) return
    try {
      const data = await apiRequest<ProfileViewData>(`/api/users/${userId}/public`, {}, sessionToken)
      setViewedProfile(data)
      setProfileViewTab('posts')
      setReportPostId('')
      // Track recently viewed
      const entry = { id: data.user.id, name: data.user.name, handle: data.user.handle, avatarUrl: data.user.avatarUrl || null }
      setRecentlyViewedUsers(prev => {
        const updated = [entry, ...prev.filter(u => u.id !== data.user.id)].slice(0, 20)
        localStorage.setItem('rvu', JSON.stringify(updated))
        return updated
      })
      switchTab('profile-view')
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.error, 'error')
    }
  }

  const closePublicProfile = () => {
    setViewedProfile(null)
    setReportProfileOpen(false)
    setReportPostId('')
    setLightboxOpen(false)
    switchTab('trends')
  }

  const openImageLightbox = (images: string[], index: number) => {
    if (images.length === 0) return
    setLightboxImages(images)
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  const moveLightbox = (direction: 'prev' | 'next') => {
    setLightboxIndex((current) => {
      if (lightboxImages.length === 0) return current
      if (direction === 'prev') {
        return current === 0 ? lightboxImages.length - 1 : current - 1
      }
      return current === lightboxImages.length - 1 ? 0 : current + 1
    })
  }

  const openReportForPost = (postId?: string | null) => {
    setReportPostId(postId || '')
    setReportProfileOpen(true)
  }

  const toggleFollowViewedProfile = async () => {
    if (!sessionToken || !viewedProfile) return
    setIsProfileActionLoading(true)
    try {
      const data = await apiRequest<{ ok: boolean; isFollowing: boolean; followerCount: number; followingCount: number; viewer: SessionUser }>(
        `/api/users/${viewedProfile.user.id}/follow`,
        {
          method: 'POST',
          body: JSON.stringify({ follow: !viewedProfile.isFollowing }),
        },
        sessionToken,
      )
      setViewedProfile(current => current ? {
        ...current,
        isFollowing: data.isFollowing,
        user: {
          ...current.user,
          followerCount: data.followerCount,
          followingCount: data.followingCount,
        },
      } : current)
      setViewer(data.viewer)
      showToast(data.isFollowing ? t.followed : t.unfollowed, 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.followError, 'error')
    } finally {
      setIsProfileActionLoading(false)
    }
  }

  const submitProfileReport = async () => {
    if (!sessionToken || !viewedProfile) return
    const category = reportReason === t.reportCustom ? '' : reportReason
    if (!category && !reportText.trim()) {
      showToast(t.reportReasonHint, 'error')
      return
    }
    setIsSubmittingReport(true)
    try {
      await apiRequest(`/api/users/${viewedProfile.user.id}/report`, {
        method: 'POST',
        body: JSON.stringify({ category, text: reportText.trim(), postId: reportPostId || undefined }),
      }, sessionToken)
      setReportProfileOpen(false)
      setReportReason(t.reportCustom)
      setReportText('')
      setReportPostId('')
      showToast(t.reportSent, 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.reportError, 'error')
    } finally {
      setIsSubmittingReport(false)
    }
  }

  const updateReportStatus = async (reportId: string, status: ReportStatus) => {
    if (!sessionToken) return
    try {
      const data = await apiRequest<{ ok: boolean; reports: UserReport[] }>(`/api/admin/reports/${reportId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      }, sessionToken)
      setReports(data.reports)
      showToast(t.reportSent, 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.reportError, 'error')
    }
  }

  const addComment = async (postId: string) => {
    if (!viewer || !sessionToken) return
    const text = commentTexts[postId]?.trim()
    if (!text) return
    try {
      const data = await apiRequest<{ comment: PostComment; post: Post }>(`/api/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      }, sessionToken)
      setPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, ...data.post, comments: [...p.comments, data.comment] }
          : p
      ))
      setCommentTexts(prev => ({ ...prev, [postId]: '' }))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.error, 'error')
    }
  }

  const togglePostComments = (postId: string) => {
    setExpandedPostComments(prev => {
      const next = new Set(prev)
      if (next.has(postId)) next.delete(postId)
      else next.add(postId)
      return next
    })
  }

  const sortedPosts = useMemo(() => {
    if (trendsSort === 'new') {
      return [...posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    }
    return [...posts].sort((a, b) => b.boosts - a.boosts || b.createdAt.localeCompare(a.createdAt))
  }, [posts, trendsSort])

  const ownPosts = useMemo(() => {
    if (!viewer) return []
    return [...posts].filter(post => post.authorId === viewer.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [posts, viewer])

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !sessionToken) return

    if (!file.type.match(/^image\/(png|jpeg|webp|gif)$/)) {
      showToast(t.photoFormat, 'error')
      return
    }
    if (file.size > 256 * 1024) {
      showToast(t.photoSize, 'error')
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
      showToast(t.avatarUpdated, 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.avatarError, 'error')
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
      showToast(t.settingUpdated, 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.error, 'error')
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
      showToast(t.settingUpdated, 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.error, 'error')
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
      showToast(`${adminDraft.handle} ✓`, 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.error, 'error')
    } finally {
      setIsSavingAdminUser(false)
    }
  }

  const grantAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!grantIdentifier.trim() || !sessionToken) {
      showToast('ID / handle / email?', 'info')
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
      showToast('Admin ✓', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.error, 'error')
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
    return <div className="loading-screen">{t.loading || '...'}</div>
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
          <div className="auth-backdrop" onClick={() => { setAuthOpen(false); setEmailStep('email'); setEmailCode(''); setRegLangStep(false) }} />
          <section className="auth-sheet">
            <div className="sheet-head">
              <div>
                <span className="eyebrow">{authMode === 'register' ? t.register : t.login}</span>
                <h2>{authMode === 'register' ? t.createAccount : t.enterAccount}</h2>
              </div>
              <button className="ghost-icon" onClick={() => { setAuthOpen(false); setEmailStep('email'); setEmailCode(''); setRegLangStep(false) }}>
                ×
              </button>
            </div>

            <div className="auth-mode-tabs">
              <button className={authMode === 'login' ? 'auth-mode-tab active' : 'auth-mode-tab'} onClick={() => { setAuthMode('login'); setEmailStep('email'); setEmailCode(''); setRegLangStep(false) }}>{t.login}</button>
              <button className={authMode === 'register' ? 'auth-mode-tab active' : 'auth-mode-tab'} onClick={() => { setAuthMode('register'); setEmailStep('email'); setEmailCode(''); setRegLangStep(false) }}>{t.register}</button>
            </div>

            {/* Language selection step shown before registration form */}
            {authMode === 'register' && regLangStep === false && (
              <div className="reg-lang-step">
                <div className="reg-lang-title">{t.chooseLanguage}</div>
                <p className="reg-lang-hint">{t.languageHint}</p>
                <div className="reg-lang-btns">
                  <button className={lang === 'uz' ? 'reg-lang-btn active' : 'reg-lang-btn'} onClick={() => { switchLang('uz'); setRegLangStep(true) }}>
                    🇺🇿 {t.languageUz}
                  </button>
                  <button className={lang === 'ru' ? 'reg-lang-btn active' : 'reg-lang-btn'} onClick={() => { switchLang('ru'); setRegLangStep(true) }}>
                    🇷🇺 {t.languageRu}
                  </button>
                </div>
              </div>
            )}

            {/* Method selector — shown after lang step (or for login) */}
            {(authMode === 'login' || regLangStep) && (
            <div className="auth-method-tabs">
              <button className={authMethod === 'password' ? 'auth-method-tab active' : 'auth-method-tab'} onClick={() => setAuthMethod('password')}>
                <ShieldCheck size={13} /> {t.password}
              </button>
              <button className={authMethod === 'code' ? 'auth-method-tab active' : 'auth-method-tab'} onClick={() => setAuthMethod('code')}>
                <Mail size={13} /> Email-{t.sendCode}
              </button>
            </div>
            )}

            {(authMode === 'login' || regLangStep) && (
            <div className="auth-stack">
              {authMethod === 'password' ? (
                authMode === 'login' ? (
                  <form className="email-card" onSubmit={loginWithPassword}>
                    <div className="auth-title"><ShieldCheck size={16} />{t.loginByPassword}</div>
                    <input value={emailValue} onChange={e => setEmailValue(e.target.value)} placeholder={t.email} type="email" required autoComplete="email" />
                    <div className="auth-password-wrap">
                      <input
                        value={authPassword}
                        onChange={e => setAuthPassword(e.target.value)}
                        placeholder={t.password}
                        type={authPasswordVisible ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        minLength={8}
                      />
                      <button type="button" className="auth-eye-btn" onClick={() => setAuthPasswordVisible(v => !v)}>
                        {authPasswordVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    <button className="primary-btn wide" type="submit" disabled={isAuthingPassword || !emailValue.trim() || !authPassword}>
                      {isAuthingPassword ? t.signingIn : t.loginBtn}
                    </button>
                  </form>
                ) : (
                  <form className="email-card" onSubmit={registerWithPassword}>
                    <div className="auth-title"><ShieldCheck size={16} />{t.registerByPassword}</div>
                    <div className="auth-note">{t.passwordMin}</div>
                    <input value={emailName} onChange={e => setEmailName(e.target.value)} placeholder={t.name} required />
                    <input value={emailValue} onChange={e => setEmailValue(e.target.value)} placeholder={t.email} type="email" required autoComplete="email" />
                    <div className="auth-password-wrap">
                      <input
                        value={authPassword}
                        onChange={e => setAuthPassword(e.target.value)}
                        placeholder={t.password}
                        type={authPasswordVisible ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        minLength={8}
                      />
                      <button type="button" className="auth-eye-btn" onClick={() => setAuthPasswordVisible(v => !v)}>
                        {authPasswordVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    <div className="auth-password-wrap">
                      <input
                        value={authConfirmPassword}
                        onChange={e => setAuthConfirmPassword(e.target.value)}
                        placeholder={t.passwordRepeat}
                        type={authPasswordVisible ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                      />
                    </div>
                    {authPassword && authConfirmPassword && authPassword !== authConfirmPassword && (
                      <div className="auth-pass-mismatch">{t.passwordMismatch}</div>
                    )}
                    <button className="primary-btn wide" type="submit" disabled={isAuthingPassword || authPassword !== authConfirmPassword || authPassword.length < 8}>
                      {isAuthingPassword ? t.creating : t.registerBtn}
                    </button>
                  </form>
                )
              ) : emailStep === 'email' ? (
                <form className="email-card" onSubmit={sendEmailCode}>
                  <div className="auth-title">
                    <Mail size={16} />
                    {authMode === 'register' ? t.registerByEmail : t.enterByEmail}
                  </div>
                  <div className="auth-note">
                    {authMode === 'register' ? t.enterNameAndEmail : t.enterEmail}
                  </div>
                  {authMode === 'register' && (
                    <input value={emailName} onChange={(e) => setEmailName(e.target.value)} placeholder={t.name} required />
                  )}
                  <input value={emailValue} onChange={(e) => setEmailValue(e.target.value)} placeholder={t.email} type="email" required />
                  <button className="primary-btn wide" type="submit" disabled={isSendingCode || !siteSettings.emailAuthEnabled}>
                    <Mail size={16} />
                    {isSendingCode ? t.sending : t.sendCode}
                  </button>
                </form>
              ) : (
                <form className="email-card" onSubmit={signInEmail}>
                  <div className="auth-title">
                    <ShieldCheck size={16} />
                    {t.confirm}
                  </div>
                  <div className="auth-note code-sent-note">
                    {t.codeSentTo} <strong>{emailValue}</strong>
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
                    {authMode === 'register' ? t.registerBtn : t.loginBtn}
                  </button>
                  <button type="button" className="auth-switch-btn back-btn" onClick={() => { setEmailStep('email'); setEmailCode('') }}>
                    {t.back}
                  </button>
                </form>
              )}

              <div className="auth-switch">
                {authMode === 'login' ? (
                  <span>{t.noAccount} <button className="auth-switch-btn" onClick={() => { setAuthMode('register'); setEmailStep('email'); setEmailCode(''); setRegLangStep(false) }}>{t.signUp}</button></span>
                ) : (
                  <span>{t.hasAccount} <button className="auth-switch-btn" onClick={() => { setAuthMode('login'); setEmailStep('email'); setEmailCode(''); setRegLangStep(false) }}>{t.signIn}</button></span>
                )}
              </div>
            </div>
            )}
          </section>
        </div>
      )}

      {/* --- ПАНЕЛЬ УВЕДОМЛЕНИЙ --- */}
      {notifOpen && (
        <div className="notif-layer">
          <div className="notif-backdrop" onClick={() => setNotifOpen(false)} />
          <div className="notif-panel">
            <div className="notif-panel-head">
              <h3><Bell size={16} /> {t.notifTitle}</h3>
              <button className="ghost-icon" onClick={() => setNotifOpen(false)}>×</button>
            </div>
            <div className="notif-list">
              {notifLoading && <div className="notif-loading">{t.loading || '...'}</div>}
              {!notifLoading && notifications.length === 0 && (
                <div className="notif-empty">
                  <Bell size={32} />
                  <p>{t.noNotif || '—'}</p>
                </div>
              )}
              {notifications.map(n => (
                <div key={n.id} className={`notif-item notif-${n.type}`}>
                  <span className="notif-icon">{getNotifIcon(n.type)}</span>
                  <div className="notif-body">
                    <strong>{n.title}</strong>
                    <p>{n.text.length > 120 ? n.text.slice(0, 120) + '...' : n.text}</p>
                    <small>{frt(n.createdAt)}</small>
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
            <span className="header-brand" onClick={() => { switchTab('chats'); closeMenu(); }} style={{cursor:'pointer'}}>
              <span className="header-brand-icon">&gt;]</span>{
                activeTab === 'home' ? t.tabHome :
                activeTab === 'chats' ? t.tabChats :
                activeTab === 'trends' ? t.tabTrends :
                activeTab === 'radar' ? t.tabRadar :
                activeTab === 'transactions' ? t.tabTransactions :
                activeTab === 'settings' ? t.tabSettings :
                activeTab === 'admin' ? t.tabAdmin :
                activeTab === 'profile' || activeTab === 'profile-view' ? t.tabProfile :
                'Regellik'
              }
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

        {menuOpen && createPortal(
          <>
            <div className={`corner-menu-backdrop${menuExiting ? ' menu-exiting' : ''}`} onClick={closeMenu} />
            <nav className={`corner-menu-dropdown${menuExiting ? ' menu-exiting' : ''}`}>
              <div className="corner-menu-header">
                <div className="brand-mark">&gt;]</div>
                <div>
                  <div className="brand-name">Regellik</div>
                  <div className="brand-sub">{siteSettings.onlineCounterVisible ? `${onlineCount} ${t.online}` : t.brandSubtitle} {publicFeed.length > 0 ? `• ${publicFeed.length} ${t.posts}` : ''} {inbox.length > 0 ? `• ${inbox.length} ${t.incoming}` : ''}</div>
                </div>
              </div>

              <div className="corner-menu-nav">
                {!isSignedIn && (
                  <button className="corner-menu-item accent-item" onClick={() => { closeMenu(); setAuthOpen(true) }}>
                    {t.enterRegel}
                  </button>
                )}

                {isSignedIn && (
                  <>
                    <button className={activeTab === 'home' ? 'corner-menu-item active' : 'corner-menu-item'} onClick={() => switchTab('home', closeMenu)}>
                      <span className="menu-emoji bw">🖊</span> {t.kabinet}
                    </button>
                    <button className={activeTab === 'chats' ? 'corner-menu-item active' : 'corner-menu-item'} onClick={() => switchTab('chats', closeMenu)}>
                      <span className="menu-emoji bw">💬</span> {t.chatlar}
                      {totalUnread > 0 && <span className="menu-badge">{totalUnread}</span>}
                    </button>
                    <button className={activeTab === 'trends' ? 'corner-menu-item active' : 'corner-menu-item'} onClick={() => switchTab('trends', closeMenu)}>
                      <span className="menu-emoji bw">#️⃣</span> {t.global}
                    </button>
                    <button className={activeTab === 'radar' ? 'corner-menu-item active' : 'corner-menu-item'} onClick={() => switchTab('radar', () => { closeMenu(); void loadRadar() })}>
                      <span className="menu-emoji bw">👤</span> {t.kontaktlar}
                    </button>
                    <button className={activeTab === 'transactions' ? 'corner-menu-item active' : 'corner-menu-item'} onClick={() => switchTab('transactions', closeMenu)}>
                      <span className="menu-emoji bw">👤</span> {t.otkazmalar}
                    </button>
                    <button className={activeTab === 'transactions' ? 'corner-menu-item active' : 'corner-menu-item'} onClick={() => { switchTab('transactions', closeMenu) }}>
                      <span className="menu-emoji bw">⚡️</span> {t.quvvat}
                    </button>
                    <button className={activeTab === 'settings' ? 'corner-menu-item active' : 'corner-menu-item'} onClick={() => switchTab('settings', closeMenu)}>
                      <span className="menu-emoji bw">⚙</span> {t.sozlamalar}
                    </button>
                    {isAdmin && (
                      <button className={activeTab === 'admin' ? 'corner-menu-item active' : 'corner-menu-item'} onClick={() => switchTab('admin', closeMenu)}>
                        <UserCog size={16} /> {t.tabAdmin}
                      </button>
                    )}
                    <div className="corner-menu-divider" />
                    <button className="corner-menu-item muted-item" onClick={() => { closeMenu(); openReportForPost() }}>
                      <span className="menu-emoji bw">❗️</span> {t.shikoyat}
                    </button>
                    <button className="corner-menu-item muted-item" onClick={() => { closeMenu(); void startConversation('support') }}>
                      <span className="menu-emoji bw">😀</span> {t.support}
                    </button>
                    <div className="corner-menu-divider" />
                    <button className="corner-menu-item danger-item" onClick={() => { closeMenu(); void signOut() }}>
                      <LogOut size={16} /> {t.exit}
                    </button>
                  </>
                )}
              </div>

              <div className="corner-menu-footer-mini">
                <span>&gt;]Regellik · © 2026</span>
              </div>
            </nav>
          </>,
          document.body
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

            <h1 className="welcome-heading">{t.welcome}</h1>
            <p className="welcome-sub">{t.brandSubtitle}</p>

            <button className="landing-cta" onClick={() => setAuthOpen(true)}>
              {t.enterRegel}
            </button>
          </section>

          <div className="landing-marquee">
            <div className="landing-marquee-track">
              <span>{t.marquee1}</span>
              <span>•</span>
              <span>{t.marquee2}</span>
              <span>•</span>
              <span>{t.marquee3}</span>
              <span>•</span>
              <span>{t.marquee1}</span>
              <span>•</span>
              <span>{t.marquee2}</span>
              <span>•</span>
              <span>{t.marquee3}</span>
            </div>
          </div>

          <footer className="app-footer">
            <span>&gt;]Regellik 2026</span>
            <span>{t.footerRules}</span>
            <span>{t.footerAbout}</span>
            <span>FAQ</span>
            <span>{t.footerContact}</span>
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

                <p className="home-greeting">{t.hello}, <strong>{viewer.name}</strong></p>

                <div className="home-stats-row">
                  <div className="home-stat">
                    <strong>{viewer.powers.toFixed(1)}</strong>
                    <span>POWERS</span>
                  </div>
                  <div className="home-stat">
                    <strong>{conversations.length}</strong>
                    <span>{t.tabChats}</span>
                  </div>
                  <div className="home-stat">
                    <strong>{totalUnread}</strong>
                    <span>{t.incoming}</span>
                  </div>
                </div>

                <div className="home-nav-grid">
                  <button className="home-nav-btn" onClick={() => switchTab('chats')}>
                    <MessageCircle size={24} />
                    <strong>Chatlar</strong>
                    <span>Xabarlar</span>
                  </button>
                  <button className="home-nav-btn" onClick={() => switchTab('trends')}>
                    <Flame size={24} />
                    <strong>Global</strong>
                    <span>Ommaviy postlar</span>
                  </button>
                  <button className="home-nav-btn" onClick={() => switchTab('profile')}>
                    <User size={24} />
                    <strong>Profil</strong>
                    <span>Sozlash</span>
                  </button>
                  <button className="home-nav-btn" onClick={() => switchTab('transactions')}>
                    <Wallet size={24} />
                    <strong>Balans</strong>
                    <span>O'tkazmalar</span>
                  </button>
                </div>
              </section>
            )}

            {/* --- ЧАТЫ (мессенджер) --- */}
            {activeTab === 'chats' && !openConvoId && !composeOpen && (
              <section className="chats-screen page-transition">
                {/* Поиск + радар */}
                <div className="chats-search-row">
                  <Search size={14} />
                  <input
                    className="chats-search-input"
                    value={chatSearch}
                    onChange={e => setChatSearch(e.target.value)}
                    placeholder="Izlash..."
                  />
                  {chatSearch && (
                    <button className="chats-search-clear" onClick={() => setChatSearch('')}>
                      <X size={13} />
                    </button>
                  )}
                  <button className="chats-radar-inline-btn" onClick={() => switchTab('radar', () => void loadRadar())} title="Atrofimda kim?">
                    <Radar size={16} />
                  </button>
                  <button className="chats-contacts-inline-btn" onClick={() => setComposeOpen(true)} title="Kontaktlar">
                    <Users size={16} />
                  </button>
                </div>

                {conversations.length === 0 && (
                  <div className="chats-empty">
                    <MessageCircle size={40} />
                    <p>{t.noChats}</p>
                    <span>«Kontaktlar» tugmasini bosib chat boshlang</span>
                  </div>
                )}

                <div className="conversation-list">
                  {conversations
                    .filter(convo => {
                      if (!chatSearch) return true
                      const q = chatSearch.toLowerCase()
                      const name = convo.isSystem ? 'regellik' : (convo.otherUser?.name || '').toLowerCase()
                      const handle = convo.isSystem ? '' : (convo.otherUser?.handle || '').toLowerCase()
                      return name.includes(q) || handle.includes(q)
                    })
                    .map((convo) => (
                    <div key={convo.id} className={`conversation-item-wrap${deletingConvoId === convo.id ? ' deleting' : ''}`}>
                      <button className={`conversation-item${convo.unreadCount > 0 ? ' has-unread' : ''}`} onClick={() => openConversation(convo.id)}>
                        <div className="convo-avatar">
                          {convo.isSystem ? (
                            <span className="convo-avatar-system">R</span>
                          ) : convo.otherUser?.avatarUrl ? (
                            <img src={convo.otherUser.avatarUrl} alt="" />
                          ) : (
                            <span>{convo.otherUser?.name?.[0] || '?'}</span>
                          )}
                        </div>
                        <div className="convo-body">
                          <div className="convo-top">
                            <strong>{convo.isSystem ? 'Regellik' : convo.otherUser?.name || t.user}</strong>
                            <small>{convo.lastMessage ? frt(convo.lastMessage.createdAt) : ''}</small>
                          </div>
                          <div className="convo-bottom">
                            <span className="convo-preview">{convo.lastMessage?.text || t.noMessages}</span>
                            {convo.unreadCount > 0 && <span className="convo-unread">{convo.unreadCount}</span>}
                          </div>
                        </div>
                      </button>
                      {deletingConvoId === convo.id ? (
                        <div className="convo-delete-confirm">
                          <span>{t.deleteChat}?</span>
                          <button className="convo-del-yes" onClick={() => void deleteConversation(convo.id)}>{t.yes || 'OK'}</button>
                          <button className="convo-del-no" onClick={() => setDeletingConvoId(null)}>{t.cancel}</button>
                        </div>
                      ) : (
                        <button className="convo-delete-btn" onClick={() => setDeletingConvoId(convo.id)} title={t.deleteChat}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* --- KONTAKTLAR (sobiq compose) --- */}
            {activeTab === 'chats' && !openConvoId && composeOpen && (() => {
              const contactIds = new Set(conversations.filter(c => !c.isSystem).map(c => c.otherUser?.id).filter(Boolean))
              const contactUsers = conversations
                .filter(c => !c.isSystem && c.otherUser)
                .map(c => c.otherUser!)
              const recentNotInContacts = recentlyViewedUsers.filter(u => !contactIds.has(u.id) && u.id !== viewer?.id)
              const allKontaktlar = [
                ...contactUsers,
                ...recentNotInContacts.map(u => ({ id: u.id, name: u.name, handle: u.handle, avatarUrl: u.avatarUrl, stats: { sent: 0, received: 0, boosts: 0 } }))
              ]
              const filteredKontaktlar = composeSearch
                ? allKontaktlar.filter(u =>
                    u.name.toLowerCase().includes(composeSearch.toLowerCase()) ||
                    u.handle.toLowerCase().includes(composeSearch.toLowerCase())
                  )
                : allKontaktlar
              return (
              <section className={`chats-screen compose-screen page-transition${composeExiting ? ' compose-page-exit' : ''}`}>
                <div className="chats-header-row">
                  <button className="compose-back-btn" onClick={closeCompose}>
                    <ArrowLeft size={20} />
                  </button>
                  <h2 className="chats-title">Kontaktlar</h2>
                </div>

                {/* Invite button */}
                <button className="kontaktlar-share-btn" style={{marginBottom: '12px'}} onClick={() => {
                  const shareText = 'Regellikka qo\'shiling — anonim xabarlar, profil va ko\'proq!'
                  const shareUrl = 'https://t.me/regellikbot'
                  const tgShareUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`
                  const tg = (window as { Telegram?: { WebApp?: { openTelegramLink?: (url: string) => void } } }).Telegram?.WebApp
                  if (tg?.openTelegramLink) tg.openTelegramLink(tgShareUrl)
                  else window.open(tgShareUrl, '_blank')
                }}>
                  <Send size={16} />
                  Do'stlarni taklif qilish
                </button>

                <div className="compose-search-row">
                  <Search size={16} />
                  <input value={composeSearch} onChange={e => setComposeSearch(e.target.value)} placeholder="Kontaktlarni qidirish..." autoFocus />
                </div>

                {filteredKontaktlar.length === 0 && (
                  <div className="chats-empty" style={{marginTop: '24px'}}>
                    <Users size={36} />
                    <p>Kontaktlar yo'q</p>
                    <span>Chat boshlaganingizda kontaktlar shu yerda ko'rinadi</span>
                  </div>
                )}

                {contactUsers.length > 0 && !composeSearch && (
                  <div className="compose-section-label">Kontaktlar</div>
                )}
                <div className="compose-user-list">
                  {(composeSearch ? filteredKontaktlar : contactUsers).map(u => (
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

                {recentNotInContacts.length > 0 && !composeSearch && (
                  <>
                    <div className="compose-section-label">So'nggi ko'rilganlar</div>
                    <div className="compose-user-list">
                      {recentNotInContacts.map(u => (
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
                  </>
                )}
              </section>
              )
            })()}

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
                      <strong>{isSystemChat ? '>]Regellik' : chatOtherUser?.name || t.chatlar}</strong>
                      <small>{isSystemChat ? t.systemChat : chatOtherUser?.handle || ''}</small>
                    </div>
                  </div>
                  {isSystemChat && <span className="chat-system-badge">SYSTEM</span>}
                </div>

                <div className="chat-messages-area">
                  {isChatLoading && <div className="chat-loading">{t.loading || '...'}</div>}
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
                        <div className={`chat-bubble ${isMine ? 'mine' : 'theirs'}${isSystem ? ' system' : ''}`} style={isMine ? {marginLeft:'auto'} : {marginRight:'auto'}}>
                          {isSystem && <span className="chat-bubble-sender">{'Regellik'}</span>}
                          <p>{msg.text}</p>
                          <small>{frt(msg.createdAt)}</small>
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
                    placeholder={t.messagePlaceholder}
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
                    <h2>{t.radarTitle}</h2>
                  </div>
                  <button className="secondary-btn" onClick={() => void loadRadar()} disabled={isRadarLoading}>
                    {isRadarLoading ? '...' : t.refresh}
                  </button>
                </div>
                <p className="radar-desc">{t.radarDesc}</p>

                {radarUsers.length === 0 && !isRadarLoading && (
                  <div className="chats-empty">
                    <Radar size={40} />
                    <p>{t.radarEmpty}</p>
                    <span>{t.radarEmptyHint}</span>
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

            {/* --- ПУЛЬС --- */}
            {activeTab === 'trends' && viewer && (
              <section className="trends-screen page-transition">
                <div className="trends-header">
                  <div className="trends-header-left">
                    <Flame size={20} className="trends-header-icon" />
                    <h2>Global</h2>
                  </div>
                  <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                    <div className="trends-sort-tabs">
                      <button
                        className={trendsSort === 'top' ? 'trends-sort-btn active' : 'trends-sort-btn'}
                        onClick={() => setTrendsSort('top')}
                      >
                        <TrendingUp size={14} /> {t.sortTop}
                      </button>
                      <button
                        className={trendsSort === 'new' ? 'trends-sort-btn active' : 'trends-sort-btn'}
                        onClick={() => setTrendsSort('new')}
                      >
                        <Zap size={14} /> {t.sortNew}
                      </button>
                    </div>
                    <div className="trends-view-toggle">
                      <button className={trendsView === 'grid' ? 'trends-view-btn active' : 'trends-view-btn'} onClick={() => setTrendsView('grid')}>
                        <LayoutGrid size={15} />
                      </button>
                      <button className={trendsView === 'feed' ? 'trends-view-btn active' : 'trends-view-btn'} onClick={() => setTrendsView('feed')}>
                        <List size={15} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Composer */}
                <div className="trends-composer">
                  <div className="trends-composer-avatar">
                    {viewer.avatarUrl
                      ? <img src={viewer.avatarUrl} alt="" />
                      : <span>{viewer.name[0]}</span>
                    }
                  </div>
                  <div className="trends-composer-body">
                    <textarea
                      className="trends-composer-input"
                      value={newPostText}
                      onChange={(e) => setNewPostText(e.target.value)}
                      placeholder={t.sharePlaceholder}
                      rows={3}
                      maxLength={500}
                    />
                    {newPostImages.length > 0 && (
                      <div className="post-image-preview-grid">
                        {newPostImages.map((image, index) => (
                          <div key={`${image.slice(0, 24)}-${index}`} className="post-image-preview-wrap multi">
                            <img src={image} alt={t.publication} className="post-image-preview" />
                            <button className="post-image-remove-btn" type="button" onClick={() => setNewPostImages((current) => current.filter((_, imageIndex) => imageIndex !== index))}>
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="trends-composer-footer">
                      <label className="secondary-btn compact-btn post-upload-btn">
                        <Camera size={14} />
                        {t.photo} {newPostImages.length > 0 ? `${newPostImages.length}/6` : ''}
                        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handlePostImageUpload} hidden multiple />
                      </label>
                      <span className={newPostText.length > 450 ? 'trends-char-counter warn' : 'trends-char-counter'}>
                        {newPostText.length}/500
                      </span>
                      <button
                        className="primary-btn compact-btn"
                        onClick={() => void createPost()}
                        disabled={isCreatingPost || !newPostText.trim()}
                      >
                        <Send size={14} />
                        {isCreatingPost ? '...' : t.publish}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Feed */}
                {trendsView === 'grid' ? (
                  <>
                    {/* Instagram-style grid */}
                    {sortedPosts.length === 0 && (
                      <div className="trends-empty">
                        <Flame size={40} />
                        <p>{t.feedEmpty}</p>
                        <span>{t.feedEmptyHint}</span>
                      </div>
                    )}
                    <div className="trends-grid">
                      {sortedPosts.map((post, idx) => {
                        const thumb = post.imageUrls?.[0] || post.imageUrl || null
                        return (
                          <button key={post.id} className={`trends-grid-cell${thumb ? ' has-image' : ' text-only'}`} onClick={() => setGridSelectedPost(post)}>
                            {thumb ? (
                              <img src={thumb} alt="" className="trends-grid-img" />
                            ) : (
                              <div className="trends-grid-text-tile">
                                <div className="trends-grid-text-author">{post.authorName}</div>
                                <p>{post.text.slice(0, 120)}</p>
                                <div className="trends-grid-text-footer">
                                  <span><Zap size={10} /> {post.boosts}</span>
                                  <span><MessageSquare size={10} /> {post.commentsCount || post.comments.length}</span>
                                </div>
                              </div>
                            )}
                            {thumb && trendsSort === 'top' && idx < 3 && (
                              <span className="trends-grid-rank">#{idx + 1}</span>
                            )}
                            {thumb && (
                              <div className="trends-grid-overlay">
                                <Zap size={12} /> <span>{post.boosts}</span>
                                <MessageSquare size={12} style={{marginLeft: '8px'}} /> <span>{post.commentsCount || post.comments.length}</span>
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>

                    {/* Post modal */}
                    {gridSelectedPost && (
                      <div className="trends-post-modal-backdrop" onClick={() => setGridSelectedPost(null)}>
                        <div className="trends-post-modal" onClick={e => e.stopPropagation()}>
                          <button className="trends-post-modal-close" onClick={() => setGridSelectedPost(null)}><X size={18} /></button>
                          <div className="trends-post-modal-header">
                            <div className="trends-post-avatar">
                              {gridSelectedPost.authorAvatarUrl
                                ? <img src={gridSelectedPost.authorAvatarUrl} alt="" />
                                : <span>{gridSelectedPost.authorName[0]}</span>}
                            </div>
                            <div className="trends-post-meta">
                              <strong className="clickable-author" onClick={() => { setGridSelectedPost(null); void openUserProfile(gridSelectedPost.authorId) }}>{gridSelectedPost.authorName}</strong>
                              <span>{gridSelectedPost.authorHandle}</span>
                            </div>
                            <small className="trends-post-time">{frt(gridSelectedPost.createdAt)}</small>
                          </div>
                          {(gridSelectedPost.imageUrls?.length || gridSelectedPost.imageUrl) && (
                            <div className={`trends-post-image-wrap${(gridSelectedPost.imageUrls?.length || 0) > 1 ? ' multi' : ''}`}>
                              {(gridSelectedPost.imageUrls?.length ? gridSelectedPost.imageUrls : [gridSelectedPost.imageUrl]).filter(Boolean).map((img, i) => (
                                <img key={i} src={img!} alt="" className="trends-post-image" onClick={() => openImageLightbox((gridSelectedPost.imageUrls?.length ? gridSelectedPost.imageUrls : [gridSelectedPost.imageUrl]).filter(Boolean) as string[], i)} />
                              ))}
                            </div>
                          )}
                          <p className="trends-post-modal-text">{gridSelectedPost.text}</p>
                          <div className="trends-post-actions">
                            <div className="boost-btn-wrap">
                              <button
                                className={`trends-boost-btn${gridSelectedPost.boostedByViewer ? ' boosted' : ''}`}
                                onClick={() => { void boostPost(gridSelectedPost.id); setGridSelectedPost(prev => prev ? {...prev, boostedByViewer: !prev.boostedByViewer, boosts: prev.boosts + (prev.boostedByViewer ? -1 : 1)} : null) }}
                              >
                                <Zap size={16} />
                                <span>{gridSelectedPost.boosts}</span>
                              </button>
                            </div>
                            <button
                              className={expandedPostComments.has(gridSelectedPost.id) ? 'trends-comment-toggle active' : 'trends-comment-toggle'}
                              onClick={() => togglePostComments(gridSelectedPost.id)}
                            >
                              <MessageSquare size={16} />
                              <span>{gridSelectedPost.commentsCount || gridSelectedPost.comments.length}</span>
                            </button>
                          </div>
                          {expandedPostComments.has(gridSelectedPost.id) && (
                            <div className="trends-comments-section">
                              {gridSelectedPost.comments.map(cmt => (
                                <div key={cmt.id} className="trends-comment-item">
                                  <div className="trends-comment-author">
                                    <strong>{cmt.authorName}</strong>
                                    <span>{cmt.authorHandle}</span>
                                    <small>{frt(cmt.createdAt)}</small>
                                  </div>
                                  <p>{cmt.text}</p>
                                </div>
                              ))}
                              <div className="trends-comment-input-row">
                                <input
                                  value={commentTexts[gridSelectedPost.id] || ''}
                                  onChange={e => setCommentTexts(prev => ({...prev, [gridSelectedPost.id]: e.target.value}))}
                                  placeholder={t.commentPlaceholder}
                                  maxLength={300}
                                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void addComment(gridSelectedPost.id) } }}
                                />
                                <button className="trends-send-comment-btn" onClick={() => void addComment(gridSelectedPost.id)} disabled={!commentTexts[gridSelectedPost.id]?.trim()}>
                                  <Send size={14} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                <div className="trends-feed">
                  {sortedPosts.length === 0 && (
                    <div className="trends-empty">
                      <Flame size={40} />
                      <p>{t.feedEmpty}</p>
                      <span>{t.feedEmptyHint}</span>
                    </div>
                  )}
                  {sortedPosts.map((post, idx) => (
                    <article key={post.id} className="trends-post-card">
                      <div className="trends-post-header">
                        <div className="trends-post-avatar">
                          {post.authorAvatarUrl
                            ? <img src={post.authorAvatarUrl} alt="" />
                            : <span>{post.authorName[0]}</span>
                          }
                        </div>
                        <div className="trends-post-meta">
                          <div className="trends-post-name-row">
                            <strong
                                className="clickable-author"
                                onClick={() => void openUserProfile(post.authorId)}
                            >{post.authorName}</strong>
                            {post.authorBadges && post.authorBadges.slice(0,2).map(b => <BadgeChip key={b} id={b} />)}
                          </div>
                          <span>{post.authorHandle}</span>
                        </div>
                        <small className="trends-post-time">{frt(post.createdAt)}</small>
                        {trendsSort === 'top' && idx < 3 && (
                          <div className={`trends-rank rank-${idx + 1}`}>#{idx + 1}</div>
                        )}
                      </div>

                      <p className="trends-post-text">{post.text}</p>
                      {(post.imageUrls?.length || post.imageUrl) && (
                        <div className={`trends-post-image-wrap${(post.imageUrls?.length || 0) > 1 ? ' multi' : ''}`}>
                          {(post.imageUrls?.length ? post.imageUrls : [post.imageUrl]).filter(Boolean).map((image, index) => (
                            <img
                              key={`${post.id}-${index}`}
                              src={image!}
                              alt={t.publication}
                              className="trends-post-image"
                              onClick={() => openImageLightbox((post.imageUrls?.length ? post.imageUrls : [post.imageUrl]).filter(Boolean) as string[], index)}
                            />
                          ))}
                        </div>
                      )}

                      <div className="trends-post-actions">
                        <div className="boost-btn-wrap">
                          <button
                            className={`trends-boost-btn${post.boostedByViewer ? ' boosted' : ''}`}
                            onClick={() => void boostPost(post.id)}
                            title={post.boostedByViewer ? t.boostRemove : t.boostAction}
                          >
                            <Zap size={16} />
                            <span>{post.boosts}</span>
                          </button>
                          {boostBursts.filter(b => b.postId === post.id).map(b => (
                            <div key={b.id} className="boost-burst">
                              <div className="boost-ring" />
                              <div className="boost-ring boost-ring-2" />
                              {([0,1,2,3,4,5,6,7] as const).map(i => (
                                <div key={i} className="bsp" style={{ '--ba': `${i * 45}deg` } as React.CSSProperties} />
                              ))}
                            </div>
                          ))}
                        </div>
                        <button
                          className={expandedPostComments.has(post.id) ? 'trends-comment-toggle active' : 'trends-comment-toggle'}
                          onClick={() => togglePostComments(post.id)}
                        >
                          <MessageSquare size={16} />
                          <span>{post.commentsCount || post.comments.length}</span>
                        </button>
                        <button
                          className={`trends-repost-btn${post.repostedByViewer ? ' reposted' : ''}${post.authorId === viewer?.id ? ' disabled' : ''}`}
                          onClick={() => post.authorId !== viewer?.id && void repostPost(post.id)}
                          title={post.repostedByViewer ? t.repostRemove : t.repostAction}
                        >
                          <RefreshCw size={15} />
                          <span>{post.reposts || 0}</span>
                        </button>
                        {isAdmin && (
                          <button className="post-admin-delete-btn" onClick={() => void adminDeletePost(post.id)}>
                            <Trash2 size={14} /> {t.deleteAction}
                          </button>
                        )}
                      </div>

                      {expandedPostComments.has(post.id) && (
                        <div className="trends-comments-section">
                          {post.comments.map(cmt => (
                            <div key={cmt.id} className="trends-comment-item">
                              <div className="trends-comment-author">
                                <strong>{cmt.authorName}</strong>
                                <span>{cmt.authorHandle}</span>
                                <small>{frt(cmt.createdAt)}</small>
                              </div>
                              <p>{cmt.text}</p>
                            </div>
                          ))}
                          <div className="trends-comment-input-row">
                            <input
                              value={commentTexts[post.id] || ''}
                              onChange={(e) => setCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                              placeholder={t.commentPlaceholder}
                              maxLength={300}
                              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void addComment(post.id) } }}
                            />
                            <button
                              className="trends-send-comment-btn"
                              onClick={() => void addComment(post.id)}
                              disabled={!commentTexts[post.id]?.trim()}
                            >
                              <Send size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
                )} {/* end trendsView feed */}
              </section>
            )}

            {/* --- ПРОФИЛЬ --- */}
            {activeTab === 'profile' && viewer && (
              <section className="profile-screen deep-profile-screen page-transition">
                {/* Герой — аватар + inline-редактирование */}
                <article className="panel-card profile-hero compact-hero">
                  <div className="profile-hero-main">
                    <div className="profile-avatar-large avatar-upload-wrap">
                      {viewer.avatarUrl ? <img src={viewer.avatarUrl} alt={viewer.name} /> : <span>{viewer.name[0]}</span>}
                      <label className="avatar-upload-overlay" title={t.uploadAvatar}>
                        <Camera size={20} />
                        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleAvatarUpload} hidden disabled={isUploadingAvatar} />
                      </label>
                      {viewer.avatarUrl && (
                        <button className="avatar-delete-btn" type="button" onClick={() => void deleteAvatar()} title={t.deleteAvatar}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <div className="profile-hero-edit">
                      <div className="profile-name-badges-row">
                        <input
                          className="hero-name-input"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          placeholder={t.name}
                          disabled={!siteSettings.profileEditEnabled}
                        />
                        {viewer.badges.length > 0 && (
                          <div className="profile-badges-inline">
                            {viewer.badges.map(b => <BadgeChip key={b} id={b} />)}
                          </div>
                        )}
                      </div>
                      <div className="hero-handle-row">
                        <input
                          className="hero-handle-input"
                          value={profileHandle}
                          onChange={(e) => changeHandle(e.target.value)}
                          placeholder="@handle"
                          disabled={!siteSettings.profileEditEnabled}
                        />
                        <button type="button" className="handle-dice-btn hero-dice" onClick={randomHandle} title={t.randomNick}>
                          <Dices size={14} />
                        </button>
                      </div>
                      {handleStatus !== 'idle' && (
                        <div className={`handle-status ${handleStatus}`}>
                      {handleStatus === 'checking' && t.checkingHandle}
                          {handleStatus === 'available' && t.handleAvailable}
                          {handleStatus === 'taken' && t.handleTaken}
                        </div>
                      )}
                      <input
                        className="hero-tagline-input"
                        value={profileTagline}
                        onChange={(e) => setProfileTagline(e.target.value)}
                        placeholder={t.taglinePlaceholder}
                        maxLength={72}
                        disabled={!siteSettings.profileEditEnabled}
                      />
                    </div>
                  </div>

                  <textarea
                    className="hero-bio-input"
                    value={profileBio}
                    onChange={(e) => setProfileBio(e.target.value)}
                    placeholder={t.bioPlaceholder}
                    rows={2}
                    disabled={!siteSettings.profileEditEnabled}
                  />

                  {(profileName !== viewer.name || profileHandle !== viewer.handle || profileBio !== (viewer.bio || '') || profileTagline !== (viewer.tagline || '')) && siteSettings.profileEditEnabled && (
                    <div className="hero-save-row">
                      <button className="primary-btn compact-btn" onClick={saveProfile} disabled={isSavingProfile}>
                        <Save size={14} />
                        {isSavingProfile ? '...' : t.save}
                      </button>
                      <button className="secondary-btn compact-btn" type="button" onClick={() => {
                        setProfileName(viewer.name)
                        setProfileHandle(viewer.handle)
                        setProfileBio(viewer.bio || '')
                        setProfileTagline(viewer.tagline || '')
                      }}>
                        {t.cancel}
                      </button>
                    </div>
                  )}

                  {/* Compact meta chips row */}
                  <div className="profile-meta-chips">
                    <span className="profile-meta-chip"><Hash size={11} />#{viewer.numericId || '—'}</span>
                    {viewer.telegramId && <span className="profile-meta-chip tg"><Smartphone size={11} />{viewer.telegramId}</span>}
                    {isAdmin && <span className="profile-meta-chip admin"><ShieldCheck size={11} />Admin</span>}
                    <span className="profile-meta-chip">
                      {viewer.preferences.showContact !== false ? (viewer.email || 'Telegram') : '—'}
                      <button className="profile-meta-eye" type="button" onClick={() => void updatePreference('showContact' as keyof UserPreferences, viewer.preferences.showContact === false)}>
                        {viewer.preferences.showContact !== false ? <Eye size={10} /> : <EyeOff size={10} />}
                      </button>
                    </span>
                    <span className="profile-meta-chip muted"><MapPin size={11} />{viewer?.city || (locationState === 'granted' && locationLabel) ? viewerLocation : '—'}</span>
                    <span className="profile-meta-chip muted">{formatDate(viewer.joinedAt)}</span>
                  </div>

                  <div className="profile-quick-stats four-col">
                    <div><strong>{viewer.postCount}</strong><span>{t.postsCount}</span></div>
                    <div><strong>{viewer.followerCount}</strong><span>{t.followers}</span></div>
                    <div><strong>{viewer.followingCount}</strong><span>{t.following}</span></div>
                    <div><strong>{viewer.powers}</strong><span>{t.energyLabel}</span></div>
                  </div>
                </article>

                {/* Геолокация */}
                <article className="panel-card geo-settings-card">
                  <div className="geo-settings-row">
                    <div className="geo-settings-left">
                      <MapPin size={18} />
                      <div>
                        <strong>{t.geolocation}</strong>
                        <span className="geo-settings-label">{viewerLocation}</span>
                      </div>
                    </div>
                    <div className="geo-settings-actions">
                      {locationState !== 'granted' ? (
                        <button className="secondary-btn compact-btn" onClick={requestLocation}>
                          {t.enable}
                        </button>
                      ) : (
                        <span className="geo-granted-badge">{t.geoEnabled}</span>
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
                            showToast(newGeoAllowed ? t.geoShown : t.geoHiddenMsg, 'success')
                          } catch {
                            showToast(t.settingError, 'error')
                          }
                        }}
                      >
                        {viewer.geoAllowed ? <Eye size={14} /> : <EyeOff size={14} />}
                        <span>{viewer.geoAllowed ? t.geoShow : t.geoHide}</span>
                      </button>
                    </div>
                  </div>
                </article>

                <article className="panel-card profile-publications-card">
                  <div className="panel-head">
                    <div>
                      <span className="eyebrow"># {t.tabProfile}</span>
                      <h2>{t.publications}</h2>
                    </div>
                    <span className="profile-posts-counter">{ownPosts.length}</span>
                  </div>
                  {ownPosts.length === 0 ? (
                    <div className="profile-posts-empty">
                      <Flame size={26} />
                      <p>{t.noPosts}</p>
                      <span>{t.noPostsHint}</span>
                    </div>
                  ) : (
                    <div className="profile-ig-grid">
                      {ownPosts.map(post => {
                        const thumb = post.imageUrls?.[0] || post.imageUrl || null
                        return (
                          <button key={post.id} className={`profile-ig-cell${thumb ? '' : ' text-only'}`} onClick={() => setSelectedOwnPost(post)}>
                            {thumb ? (
                              <img src={thumb} alt="" className="profile-ig-thumb" />
                            ) : (
                              <div className="profile-ig-text">
                                <p>{post.text.slice(0, 80)}</p>
                              </div>
                            )}
                            <div className="profile-ig-overlay">
                              <Zap size={11} /><span>{post.boosts}</span>
                              <MessageSquare size={11} style={{marginLeft:'6px'}} /><span>{post.commentsCount || post.comments.length}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </article>

                {/* Own post modal */}
                {selectedOwnPost && (
                  <div className="trends-post-modal-backdrop" onClick={() => setSelectedOwnPost(null)}>
                    <div className="trends-post-modal" onClick={e => e.stopPropagation()}>
                      <button className="trends-post-modal-close" onClick={() => setSelectedOwnPost(null)}><X size={18} /></button>
                      <div className="trends-post-modal-header">
                        <div className="trends-post-avatar">
                          {viewer.avatarUrl ? <img src={viewer.avatarUrl} alt="" /> : <span>{viewer.name[0]}</span>}
                        </div>
                        <div className="trends-post-meta">
                          <strong>{viewer.name}</strong>
                          <span>{viewer.handle}</span>
                        </div>
                        <small className="trends-post-time">{frt(selectedOwnPost.createdAt)}</small>
                      </div>
                      {(selectedOwnPost.imageUrls?.length || selectedOwnPost.imageUrl) && (
                        <div className={`trends-post-image-wrap${(selectedOwnPost.imageUrls?.length || 0) > 1 ? ' multi' : ''}`}>
                          {(selectedOwnPost.imageUrls?.length ? selectedOwnPost.imageUrls : [selectedOwnPost.imageUrl]).filter(Boolean).map((img, i) => (
                            <img key={i} src={img!} alt="" className="trends-post-image" onClick={() => openImageLightbox((selectedOwnPost.imageUrls?.length ? selectedOwnPost.imageUrls : [selectedOwnPost.imageUrl]).filter(Boolean) as string[], i)} />
                          ))}
                        </div>
                      )}
                      <p className="trends-post-modal-text">{selectedOwnPost.text}</p>
                      <div className="trends-post-actions">
                        <button
                          className={`trends-boost-btn${selectedOwnPost.boostedByViewer ? ' boosted' : ''}`}
                          onClick={() => { void boostPost(selectedOwnPost.id); setSelectedOwnPost(prev => prev ? {...prev, boostedByViewer: !prev.boostedByViewer, boosts: prev.boosts + (prev.boostedByViewer ? -1 : 1)} : null) }}
                        >
                          <Zap size={16} /><span>{selectedOwnPost.boosts}</span>
                        </button>
                        <button
                          className={expandedPostComments.has(selectedOwnPost.id) ? 'trends-comment-toggle active' : 'trends-comment-toggle'}
                          onClick={() => togglePostComments(selectedOwnPost.id)}
                        >
                          <MessageSquare size={16} /><span>{selectedOwnPost.commentsCount || selectedOwnPost.comments.length}</span>
                        </button>
                        <button className="trends-repost-btn disabled" title={t.ownPost}>
                          <RefreshCw size={15} /><span>{selectedOwnPost.reposts || 0}</span>
                        </button>
                        {isAdmin && (
                          <button className="post-admin-delete-btn" onClick={() => { void adminDeletePost(selectedOwnPost.id); setSelectedOwnPost(null) }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      {expandedPostComments.has(selectedOwnPost.id) && (
                        <div className="trends-comments-section">
                          {selectedOwnPost.comments.map(cmt => (
                            <div key={cmt.id} className="trends-comment-item">
                              <div className="trends-comment-author">
                                <strong>{cmt.authorName}</strong><span>{cmt.authorHandle}</span>
                                <small>{frt(cmt.createdAt)}</small>
                              </div>
                              <p>{cmt.text}</p>
                            </div>
                          ))}
                          <div className="trends-comment-input-row">
                            <input
                              value={commentTexts[selectedOwnPost.id] || ''}
                              onChange={e => setCommentTexts(prev => ({...prev, [selectedOwnPost.id]: e.target.value}))}
                              placeholder="Kommentariy..."
                              maxLength={300}
                              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void addComment(selectedOwnPost.id) } }}
                            />
                            <button className="trends-send-comment-btn" onClick={() => void addComment(selectedOwnPost.id)} disabled={!commentTexts[selectedOwnPost.id]?.trim()}>
                              <Send size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* --- ТРАНЗАКЦИИ --- */}
            {activeTab === 'transactions' && (
              <section className="transactions-screen page-transition">

                {/* Подвкладки */}
                <div className="tx-subtabs">
                  <button
                    className={`tx-subtab-btn${txSubTab === 'balance' ? ' active' : ''}`}
                    onClick={() => setTxSubTab('balance')}
                  >
                    <Wallet size={14} />
                    {t.balance}
                  </button>
                  <button
                    className={`tx-subtab-btn${txSubTab === 'history' ? ' active' : ''}`}
                    onClick={() => { setTxSubTab('history'); void loadTransactions() }}
                  >
                    <RefreshCw size={14} />
                    {t.history}
                  </button>
                </div>

                {/* === ПОДВКЛАДКА: БАЛАНС === */}
                {txSubTab === 'balance' && (<>

                {/* Баланс */}
                <article className="panel-card">
                  <div className="panel-head">
                    <div>
                      <span className="eyebrow"># {t.balance}</span>
                      <h2>{t.energy}</h2>
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
                        <strong>−{siteSettings.messageCost}</strong>
                        <span>{t.msgSendCost}</span>
                      </div>
                    </div>
                    <div className="economy-info-item">
                      <MessageCircle size={16} />
                      <div>
                        <strong>+{siteSettings.messageEarn}</strong>
                        <span>{t.msgReceiveEarn}</span>
                      </div>
                    </div>
                  </div>

                  <button className="topup-cta-btn" onClick={() => setTopUpOpen(!topUpOpen)}>
                    {topUpOpen ? <X size={18} /> : <Plus size={18} />}
                    {topUpOpen ? t.transferClose : 'To\'ldirish'}
                  </button>

                  {topUpOpen && (
                    <div className="topup-inline">
                      <p className="topup-desc">{t.topupChoose}</p>
                      <div className="topup-options-grid">
                        {(siteSettings.topUpOptions || [10, 50, 100, 250, 500, 1000]).map(amount => (
                          <button key={amount} className="topup-option-btn" onClick={() => {
                            showToast(`${t.topupSoon} ${amount}`, 'info')
                            setTopUpOpen(false)
                          }}>
                            <Zap size={16} />
                            <span>{amount}</span>
                          </button>
                        ))}
                      </div>
                      <div className="topup-note">
                        <span>{t.topupNote}</span>
                      </div>
                    </div>
                  )}

                  {/* O'tkazish — energy transfer */}
                  <button className="transfer-cta-btn" onClick={() => { setTransferOpen(o => !o); setTransferResult(null) }}>
                    <Send size={17} style={{transform: 'rotate(-45deg)'}} />
                    {transferOpen ? t.transferClose : `${t.transfer} ⚡`}
                  </button>

                  {transferOpen && (
                    <div className="transfer-panel">
                      {transferResult ? (
                        transferResult.ok ? (
                          <div className="transfer-success">
                            <div className="transfer-success-anim">
                              <div className="transfer-zap-ring" />
                              <div className="transfer-zap-ring r2" />
                              <div className="transfer-zap-ring r3" />
                              <Zap size={36} className="transfer-zap-icon" />
                            </div>
                            <div className="transfer-success-text">
                              <strong>{t.transferSuccess}</strong>
                              <p>{transferResult.amount} <Zap size={13}/> → {transferResult.name} <span className="transfer-handle">{transferResult.handle}</span></p>
                              <small>{t.transferFeeLabel}: {transferResult.fee} ⚡</small>
                            </div>
                            <button className="transfer-again-btn" onClick={() => setTransferResult(null)}>{t.transferAgain}</button>
                          </div>
                        ) : (
                          <div className="transfer-error">
                            <div className="transfer-error-anim">
                              <div className="transfer-error-cross">
                                <span /><span />
                              </div>
                            </div>
                            <p className="transfer-error-msg">{transferResult.error}</p>
                            <button className="transfer-again-btn" onClick={() => setTransferResult(null)}>{t.transferRetry}</button>
                          </div>
                        )
                      ) : (
                        <form className="transfer-form" onSubmit={doTransfer}>
                          <div className="transfer-form-header">
                            <Zap size={18} className="transfer-header-icon" />
                            <div>
                              <strong>{t.transferTitle}</strong>
                              <small>{t.transferHint}</small>
                            </div>
                          </div>
                          <div className="transfer-conditions">
                            <span>{t.transferCooldown}</span>
                            <span>{t.transferAge}</span>
                            <span>{t.transferFee}</span>
                          </div>
                          <input
                            className="transfer-input"
                            value={transferHandle}
                            onChange={e => setTransferHandle(e.target.value)}
                            placeholder={t.transferRecipient}
                            required
                          />
                          <div className="transfer-amount-wrap">
                            <input
                              className="transfer-input transfer-amount"
                              type="number"
                              min={10}
                              max={500}
                              value={transferAmount}
                              onChange={e => setTransferAmount(e.target.value)}
                              placeholder={t.transferAmount}
                              required
                            />
                            {transferAmount && Number(transferAmount) >= 10 && (
                              <div className="transfer-fee-hint">
                                <span>{t.transferCommission}: {Math.max(1, Math.floor(Number(transferAmount) * 0.05))} ⚡</span>
                                <span>{t.transferTotal}: {Number(transferAmount) + Math.max(1, Math.floor(Number(transferAmount) * 0.05))} ⚡</span>
                              </div>
                            )}
                          </div>
                          <button className="transfer-submit-btn" type="submit" disabled={transferLoading}>
                            {transferLoading ? (
                              <><RefreshCw size={16} className="spin" /> {t.transferSending}</>
                            ) : (
                              <><Send size={16} style={{transform:'rotate(-45deg)'}} /> {t.transferSend}</>
                            )}
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </article>

                </>)}

                {/* === ПОДВКЛАДКА: ИСТОРИЯ === */}
                {txSubTab === 'history' && (
                <article className="panel-card">
                  <div className="panel-head">
                    <div>
                      <span className="eyebrow"># {t.history}</span>
                      <h2>{t.history}</h2>
                    </div>
                    <button className="tx-refresh-btn" onClick={() => void loadTransactions()} disabled={txLoading}>
                      {txLoading ? '...' : <RefreshCw size={15} />}
                    </button>
                  </div>

                  {powerLog.length === 0 ? (
                    <div className="tx-empty">
                      <Zap size={28} />
                      <p>{t.noTx || '—'}</p>
                    </div>
                  ) : (
                    <div className="tx-list">
                      {powerLog.map(tx => {
                        const isPositive = tx.delta > 0
                        const txLabel: Record<TxType, string> = {
                          message_sent: t.txMsgSent,
                          message_received: t.txMsgReceived,
                          topup: t.txTopup,
                          deduct: t.txDeduct,
                          boost_received: t.txBoostReceived,
                          boost_removed: t.txBoostRemoved,
                          referral: t.txReferral,
                        }
                        const txIcon: Record<TxType, React.ReactNode> = {
                          message_sent: <Send size={14} />,
                          message_received: <MessageCircle size={14} />,
                          topup: <Plus size={14} />,
                          deduct: <Minus size={14} />,
                          boost_received: <Zap size={14} />,
                          boost_removed: <Zap size={14} />,
                          referral: <Users size={14} />,
                        }
                        return (
                          <div key={tx.id} className={`tx-item${isPositive ? ' tx-positive' : ' tx-negative'}`}>
                            <div className={`tx-icon${isPositive ? ' tx-icon-in' : ' tx-icon-out'}`}>
                              {txIcon[tx.type]}
                            </div>
                            <div className="tx-info">
                              <strong>{txLabel[tx.type] || tx.description}</strong>
                              <span>{tx.description !== txLabel[tx.type] ? tx.description : frt(tx.createdAt)}</span>
                              <small>{frt(tx.createdAt)}</small>
                            </div>
                            <div className="tx-amount">
                              <span className={isPositive ? 'tx-plus' : 'tx-minus'}>
                                {isPositive ? '+' : ''}{tx.delta}
                              </span>
                              <small className="tx-balance-after">{tx.balanceAfter}</small>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </article>
                )}

              </section>
            )}

            {/* --- НАСТРОЙКИ --- */}
            {activeTab === 'settings' && viewer && (
              <section className="settings-screen page-transition">
                <div className="settings-header">
                  <Settings2 size={20} />
                  <h2>Sozlamalar</h2>
                </div>

                {/* Сеанс */}
                <article className="panel-card settings-card">
                  <div className="panel-head compact-head">
                    <span className="eyebrow"># {t.session}</span>
                  </div>
                  <div className="settings-info-rows">
                    <div className="meta-row">
                      <span>{t.loginVia}</span>
                      <strong>Email</strong>
                    </div>
                    <div className="meta-row">
                      <span>{t.telegramLinked}</span>
                      <strong>{viewer.telegramLinked ? t.yes : t.no}</strong>
                    </div>
                  </div>
                  <button className="secondary-btn danger wide settings-logout-btn" onClick={() => void signOut()}>
                    <LogOut size={16} />
                    {t.logout}
                  </button>
                </article>

                {/* Активные сессии */}
                <article className="panel-card settings-card">
                  <div className="panel-head compact-head">
                    <span className="eyebrow"># {t.activeSessions}</span>
                  </div>
                  {userSessions.length === 0 && !sessionsLoading && (
                    <button className="secondary-btn wide" onClick={() => void loadSessions()}>
                      {t.loadSessions}
                    </button>
                  )}
                  {sessionsLoading && <p style={{ color: 'var(--muted)', fontSize: '13px', textAlign: 'center' }}>{t.loading}</p>}
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
                            <span className="session-current-badge">{t.current}</span>
                          ) : (
                            <button className="session-kill-btn" onClick={() => void killSession(s.id)}>{t.terminate}</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {userSessions.length > 0 && (
                    <button className="secondary-btn wide" style={{ marginTop: '8px' }} onClick={() => void loadSessions()}>
                      {t.refresh}
                    </button>
                  )}
                </article>

                {/* Геолокация */}
                <article className="panel-card settings-card">
                  <div className="panel-head compact-head">
                    <span className="eyebrow"># {t.geolocation}</span>
                  </div>
                  <div className="settings-info-rows">
                    <div className="meta-row">
                      <span>{t.currentGeo}</span>
                      <strong>{viewerLocation}</strong>
                    </div>
                    <div className="meta-row">
                      <span>{t.permission}</span>
                      <strong>{locationState === 'granted' ? t.geoEnabled : locationState === 'denied' ? t.geoDenied : t.geoNotAsked}</strong>
                    </div>
                    <div className="meta-row">
                      <span>{t.geoVisible}</span>
                      <strong>{viewer.geoAllowed ? t.geoShow : t.geoHide}</strong>
                    </div>
                  </div>
                  <div className="settings-actions-row">
                    {locationState !== 'granted' && (
                      <button className="secondary-btn" onClick={requestLocation}>
                        <MapPin size={14} /> {t.enableGeo}
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
                        showToast(viewer.geoAllowed ? t.geoHideProfile : t.geoShowProfile, 'success')
                      } catch {
                        showToast(t.error, 'error')
                      }
                    }}>
                      {viewer.geoAllowed ? <><EyeOff size={14} /> {t.geoHideProfile}</> : <><Eye size={14} /> {t.geoShowProfile}</>}
                    </button>
                  </div>
                </article>

                {/* Privacy */}
                <article className="panel-card settings-card">
                  <div className="panel-head compact-head">
                    <span className="eyebrow"># {t.privacy}</span>
                  </div>
                  <div className="settings-toggle-list">
                    <button className={viewer.preferences.allowInbox ? 'settings-toggle-item active' : 'settings-toggle-item'} onClick={() => void updatePreference('allowInbox', !viewer.preferences.allowInbox)}>
                      <MessageCircle size={16} />
                      <div><strong>{t.allowMessages}</strong><span>{t.allowMessagesDesc}</span></div>
                      <div className={viewer.preferences.allowInbox ? 'toggle-pill on' : 'toggle-pill'} />
                    </button>
                    <button className={viewer.preferences.showCity ? 'settings-toggle-item active' : 'settings-toggle-item'} onClick={() => void updatePreference('showCity', !viewer.preferences.showCity)}>
                      <MapPin size={16} />
                      <div><strong>{t.showCity}</strong><span>{t.showCityDesc}</span></div>
                      <div className={viewer.preferences.showCity ? 'toggle-pill on' : 'toggle-pill'} />
                    </button>
                    <button className={viewer.preferences.neonProfile ? 'settings-toggle-item active' : 'settings-toggle-item'} onClick={() => void updatePreference('neonProfile', !viewer.preferences.neonProfile)}>
                      <Sparkles size={16} />
                      <div><strong>{t.neonProfile}</strong><span>{t.neonProfileDesc}</span></div>
                      <div className={viewer.preferences.neonProfile ? 'toggle-pill on' : 'toggle-pill'} />
                    </button>
                  </div>
                </article>

                {/* Language switcher */}
                <article className="panel-card settings-card">
                  <div className="panel-head compact-head">
                    <span className="eyebrow"># {t.language}</span>
                  </div>
                  <div className="settings-lang-row">
                    <button className={lang === 'uz' ? 'settings-lang-btn active' : 'settings-lang-btn'} onClick={() => switchLang('uz')}>
                      🇺🇿 {t.languageUz}
                    </button>
                    <button className={lang === 'ru' ? 'settings-lang-btn active' : 'settings-lang-btn'} onClick={() => switchLang('ru')}>
                      🇷🇺 {t.languageRu}
                    </button>
                  </div>
                </article>

              </section>
            )}

            {/* --- АДМИНКА --- */}
            {activeTab === 'admin' && isAdmin && (
              <section className="admin-screen page-transition">

                {/* Admin header */}
                <div className="admin-top-bar">
                  {adminSection !== 'none' ? (
                    <button className="admin-back-btn" onClick={() => { setAdminSection('none'); setAdminDraft(null); setSelectedAdminUserId(null) }}>
                      <ArrowLeft size={18} /> Назад
                    </button>
                  ) : (
                    <h2 className="admin-top-title"><ShieldCheck size={20} /> Панель</h2>
                  )}
                </div>

                {/* Show nav grid + stats only when no section is open */}
                {adminSection === 'none' && (<>
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
                    <span>PWR</span>
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
                    { id: 'reports' as const, icon: <Ban size={18} />, label: 'Жалобы', desc: 'Репорты на пользователей' },
                    { id: 'bans' as const, icon: <Ban size={18} />, label: 'Баны', desc: 'Блокировки' },
                    { id: 'badges' as const, icon: <BadgeCheck size={18} />, label: 'Префиксы', desc: 'Каталог и выдача' },
                    { id: 'audit' as const, icon: <Search size={18} />, label: 'Журнал', desc: 'Audit log' },
                    { id: 'broadcast' as const, icon: <Send size={18} />, label: 'Рассылка', desc: 'Системное сообщение' },
                  ]).map(sec => (
                    <button
                      key={sec.id}
                      className="admin-nav-btn"
                      onClick={() => setAdminSection(sec.id)}
                    >
                      <div className="admin-nav-icon">{sec.icon}</div>
                      <div className="admin-nav-text">
                        <strong>{sec.label}</strong>
                        <span>{sec.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
                </>)}

                {/* === Expandable sections === */}

                {/* Economy */}
                {adminSection === 'economy' && (
                  <form className="admin-section-view" onSubmit={saveSiteSettings}>
                    <div className="admin-section-head">
                      <DollarSign size={18} /> Экономика
                      <button className="primary-btn compact-btn" type="submit" disabled={isSavingSite}>
                        <Save size={14} /> {isSavingSite ? '...' : 'Сохранить'}
                      </button>
                    </div>
                    <div className="field-grid-2">
                      <label className="input-block">
                        <span>Стоимость сообщения</span>
                        <input type="number" step="0.01" min="0" value={siteSettings.messageCost} onChange={e => setSiteSettings(s => ({ ...s, messageCost: Number(e.target.value) || 0 }))} />
                      </label>
                      <label className="input-block">
                        <span>Заработок за сообщение</span>
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
                  <form className="admin-section-view" onSubmit={saveSiteSettings}>
                    <div className="admin-section-head">
                      <Settings2 size={18} /> Настройки сайта
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
                  <form className="admin-section-view" onSubmit={grantAdmin}>
                    <div className="admin-section-head">
                      <ShieldCheck size={18} /> Выдача роли admin
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
                  <div className="admin-section-view">
                    <div className="admin-section-head">
                      <Zap size={18} /> Top-up пользователю
                    </div>
                    <label className="input-block">
                      <span>User ID</span>
                      <input value={adminTopUpUserId} onChange={e => setAdminTopUpUserId(e.target.value)} placeholder="id пользователя" />
                    </label>
                    <div className="field-grid-2">
                      <label className="input-block">
                        <span>Сумма</span>
                        <input type="number" step="0.01" value={adminTopUpAmount} onChange={e => setAdminTopUpAmount(e.target.value)} placeholder="+100 или -50" />
                      </label>
                      <label className="input-block">
                        <span>Причина</span>
                        <input value={adminTopUpReason} onChange={e => setAdminTopUpReason(e.target.value)} placeholder="опционально" />
                      </label>
                    </div>
                    <button className="primary-btn wide" type="button" onClick={() => {
                      setAdminConfirmAction({
                        label: `${Number(adminTopUpAmount) > 0 ? '+' : ''}${adminTopUpAmount} пользователю ${adminTopUpUserId}`,
                        action: () => { void adminTopUp(); setAdminConfirmAction(null) }
                      })
                    }} disabled={!adminTopUpUserId || !adminTopUpAmount}>
                      <DollarSign size={16} /> Начислить
                    </button>
                  </div>
                )}

                {/* Users */}
                {adminSection === 'users' && !adminDraft && (
                  <div className="admin-section-view">
                    <div className="admin-section-head">
                      <Users size={18} /> Пользователи ({adminUsers.length})
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
                          <button key={u.id} className={selectedAdminUserId === u.id ? 'admin-search-result-item active' : 'admin-search-result-item'} onClick={() => {
                            setSelectedAdminUserId(u.id)
                            setAdminDraft({ ...u, badgesText: u.badges.join(', ') })
                          }}>
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
                          onClick={() => {
                            setSelectedAdminUserId(item.id)
                            setAdminDraft({
                              ...item,
                              badgesText: item.badges.join(', '),
                            })
                          }}
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
                  </div>
                )}

                {/* User editor — full page */}
                {adminSection === 'users' && adminDraft && (
                  <div className="admin-section-view admin-user-editor-view">
                    <button className="admin-back-btn" onClick={() => { setAdminDraft(null); setSelectedAdminUserId(null) }}>
                      <ArrowLeft size={16} /> К списку
                    </button>

                    <form className="admin-user-editor" onSubmit={saveAdminUser}>
                      <div className="admin-editor-user-head">
                        <div className="admin-editor-avatar">
                          {adminDraft.avatarUrl
                            ? <img src={adminDraft.avatarUrl} alt="" />
                            : <span>{adminDraft.name[0]}</span>}
                        </div>
                        <div>
                          <h3>{adminDraft.name}</h3>
                          <span className="admin-editor-handle">@{adminDraft.handle}</span>
                        </div>
                        <button className="primary-btn compact-btn admin-editor-save" type="button" onClick={() => {
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
                            <span>Баланс</span>
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

                        <div className="input-block">
                          <span>Префиксы / бейджи</span>

                          {/* Active badges */}
                          {adminDraft.badges.length > 0 && (
                            <div className="admin-active-badges">
                              {adminDraft.badges.map(bid => (
                                <div key={bid} className="admin-active-badge-row">
                                  <BadgeChip id={bid} />
                                  <button
                                    type="button"
                                    className="admin-badge-remove-btn"
                                    onClick={() => setAdminDraft(c => c ? { ...c, badges: c.badges.filter(x => x !== bid), badgesText: c.badges.filter(x => x !== bid).join(', ') } : c)}
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Tabs */}
                          <div className="badge-editor-tabs">
                            <button type="button" className={`badge-editor-tab${adminBadgeTab === 'catalog' ? ' active' : ''}`} onClick={() => setAdminBadgeTab('catalog')}>
                              Каталог
                            </button>
                            <button type="button" className={`badge-editor-tab${adminBadgeTab === 'custom' ? ' active' : ''}`} onClick={() => setAdminBadgeTab('custom')}>
                              Создать
                            </button>
                          </div>

                          {/* Catalog picker */}
                          {adminBadgeTab === 'catalog' && (
                            <div className="admin-badge-picker">
                              {BADGE_CATALOG.map(def => {
                                const active = adminDraft.badges.includes(def.id)
                                return (
                                  <button
                                    key={def.id}
                                    type="button"
                                    className={`admin-badge-pick-btn${active ? ' active' : ''}`}
                                    onClick={() => setAdminDraft(c => {
                                      if (!c) return c
                                      const next = active
                                        ? c.badges.filter(x => x !== def.id)
                                        : [...c.badges, def.id]
                                      return { ...c, badges: next, badgesText: next.join(', ') }
                                    })}
                                    title={active ? `Убрать ${def.label}` : `Добавить ${def.label}`}
                                  >
                                    <BadgeChip id={def.id} />
                                  </button>
                                )
                              })}
                            </div>
                          )}

                          {/* Custom badge builder */}
                          {adminBadgeTab === 'custom' && (
                            <div className="custom-badge-builder">
                              <div className="custom-badge-preview-row">
                                <BadgeChip id={`CUSTOM|${customBadgeIcon}|${customBadgeLabel || 'текст'}|${customBadgeCss}`} />
                              </div>
                              <div className="field-grid-2">
                                <label className="input-block compact">
                                  <span>Иконка</span>
                                  <input
                                    value={customBadgeIcon}
                                    onChange={e => setCustomBadgeIcon(e.target.value)}
                                    placeholder="◆"
                                    maxLength={4}
                                  />
                                </label>
                                <label className="input-block compact">
                                  <span>Текст</span>
                                  <input
                                    value={customBadgeLabel}
                                    onChange={e => setCustomBadgeLabel(e.target.value)}
                                    placeholder="Мой бейдж"
                                    maxLength={20}
                                  />
                                </label>
                              </div>
                              <div className="custom-badge-style-grid">
                                {BADGE_CATALOG.map(d => (
                                  <button
                                    key={d.id}
                                    type="button"
                                    className={`custom-badge-style-btn${customBadgeCss === d.cssClass ? ' active' : ''}`}
                                    onClick={() => setCustomBadgeCss(d.cssClass)}
                                    title={d.label}
                                  >
                                    <BadgeChip id={d.id} />
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  className={`custom-badge-style-btn${customBadgeCss === 'badge-default' ? ' active' : ''}`}
                                  onClick={() => setCustomBadgeCss('badge-default')}
                                  title="Без анимации"
                                >
                                  <span className="profile-badge-chip badge-default"><span className="badge-icon">—</span><span className="badge-label">Без</span></span>
                                </button>
                              </div>
                              <button
                                type="button"
                                className="primary-btn compact-btn wide"
                                disabled={!customBadgeLabel.trim()}
                                onClick={() => {
                                  const bid = `CUSTOM|${customBadgeIcon || '◆'}|${customBadgeLabel.trim()}|${customBadgeCss}`
                                  setAdminDraft(c => {
                                    if (!c) return c
                                    const next = [...c.badges, bid]
                                    return { ...c, badges: next, badgesText: next.join(', ') }
                                  })
                                  setCustomBadgeLabel('')
                                }}
                              >
                                <Plus size={14} /> Добавить
                              </button>
                            </div>
                          )}
                        </div>

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
                  </div>
                )}

                {/* Badges / Prefixes */}
                {adminSection === 'badges' && (
                  <div className="admin-section-view">
                    <div className="admin-section-head">
                      <BadgeCheck size={18} /> Каталог префиксов
                    </div>
                    <p className="admin-badges-desc">
                      Все доступные префиксы. Для выдачи откройте пользователя в разделе «Пользователи» и используйте вкладку «Создать» в редакторе префиксов.
                    </p>
                    <div className="admin-badges-catalog-grid">
                      {BADGE_CATALOG.map(def => (
                        <div key={def.id} className="admin-badges-catalog-item">
                          <BadgeChip id={def.id} />
                          <div className="admin-badges-catalog-meta">
                            <span className="admin-badges-catalog-id">{def.id}</span>
                            <span className="admin-badges-catalog-css">{def.cssClass}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="admin-section-subhead" style={{marginTop: 8}}>
                      Быстрая выдача/отзыв
                    </div>
                    <div className="admin-quick-badge-form">
                      <label className="input-block">
                        <span>ID или handle пользователя</span>
                        <input
                          id="quick-badge-user"
                          placeholder="@handle или user ID"
                        />
                      </label>
                      <label className="input-block">
                        <span>Выбери префикс</span>
                        <div className="admin-badge-picker">
                          {BADGE_CATALOG.map(def => (
                            <button
                              key={def.id}
                              type="button"
                              className="admin-badge-pick-btn"
                              title={def.label}
                              onClick={() => {
                                const userInput = (document.getElementById('quick-badge-user') as HTMLInputElement)?.value?.trim()
                                if (!userInput) { showToast('Введи ID или handle', 'error'); return }
                                // Find user from list
                                const found = adminUsers.find(u =>
                                  u.id === userInput || u.handle === userInput || u.handle === '@' + userInput
                                )
                                if (!found) { showToast('Пользователь не найден в загруженном списке', 'error'); return }
                                const has = found.badges?.includes(def.id)
                                // Patch via user editor
                                const newBadges = has
                                  ? (found.badges ?? []).filter(b => b !== def.id)
                                  : [...(found.badges ?? []), def.id]
                                // We'll simulate selecting user and saving
                                setSelectedAdminUserId(found.id)
                                setTimeout(() => {
                                  setAdminDraft(c => c ? { ...c, badges: newBadges, badgesText: newBadges.join(', ') } : c)
                                  setAdminSection('users')
                                  showToast(has ? `Префикс ${def.label} убран` : `Префикс ${def.label} добавлен — не забудь сохранить!`, 'info')
                                }, 100)
                              }}
                            >
                              <BadgeChip id={def.id} />
                            </button>
                          ))}
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Bans */}
                {adminSection === 'reports' && (
                  <div className="admin-section-view">
                    <div className="admin-section-head">
                      <Ban size={18} /> Жалобы на пользователей
                    </div>
                    {reports.length === 0 ? (
                      <div className="chats-empty" style={{ padding: '20px' }}>
                        <p>Жалоб пока нет</p>
                        <span>Новые обращения пользователей появятся здесь.</span>
                      </div>
                    ) : (
                      <div className="reports-list">
                        {reports.map(report => (
                          <article key={report.id} className={`report-card status-${report.status}`}>
                            <div className="report-card-head">
                              <div>
                                <strong>{report.targetUserName}</strong>
                                <span>{report.targetUserHandle}</span>
                              </div>
                              <span className={`report-status-pill ${report.status}`}>{report.status}</span>
                            </div>
                            <div className="report-card-meta">
                              <span>Категория: {report.category}</span>
                              <span>Отправил: {report.reporterName} ({report.reporterHandle})</span>
                              <span>{frt(report.createdAt)}</span>
                            </div>
                            {report.text && <p className="report-card-text">{report.text}</p>}
                            {report.relatedPosts && report.relatedPosts.length > 0 && (
                              <div className="report-related-posts">
                                {report.relatedPosts.map(post => (
                                  <div key={post.id} className="report-related-post">
                                    <div className="report-related-post-body">
                                      <strong>{frt(post.createdAt)}</strong>
                                      <p>{post.text}</p>
                                    </div>
                                    <button className="secondary-btn compact-btn danger" onClick={() => void adminDeletePost(post.id)}>
                                      <Trash2 size={14} /> Удалить пост
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="report-card-actions">
                              <button className="secondary-btn compact-btn" onClick={() => void openUserProfile(report.targetUserId)}>
                                <User size={14} /> Профиль
                              </button>
                              <button className="secondary-btn compact-btn" onClick={() => void updateReportStatus(report.id, 'resolved')}>
                                <BadgeCheck size={14} /> Решено
                              </button>
                              <button className="secondary-btn compact-btn danger" onClick={() => void updateReportStatus(report.id, 'dismissed')}>
                                <X size={14} /> Отклонить
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Bans */}
                {adminSection === 'bans' && (
                  <div className="admin-section-view">
                    <div className="admin-section-head">
                      <Ban size={18} /> Управление банами
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
                      <div className="admin-section-subhead" style={{marginTop: 12}}>
                        Активные баны
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
                  <div className="admin-section-view">
                    <div className="admin-section-head">
                      <Search size={18} /> Журнал — Audit log
                    </div>
                    <div className="audit-list">
                      {auditLog.slice(0, 50).map(item => (
                        <div key={item.id} className="audit-item">
                          <strong>{item.action}</strong>
                          <span>{item.details}</span>
                          <small>{frt(item.createdAt)}</small>
                        </div>
                      ))}
                      {auditLog.length === 0 && <div className="chats-empty" style={{padding: '20px'}}><p>Лог пуст</p></div>}
                    </div>
                  </div>
                )}

                {/* Broadcast */}
                {adminSection === 'broadcast' && (
                  <div className="admin-section-view">
                    <div className="admin-section-head">
                      <Send size={18} /> Системное сообщение
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
                          <button className="secondary-btn" onClick={() => setAdminConfirmAction(null)}>{t.cancel}</button>
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

      {lightboxOpen && lightboxImages.length > 0 && (
        <div className="photo-lightbox" onClick={() => setLightboxOpen(false)}>
          <button className="photo-lightbox-close" onClick={() => setLightboxOpen(false)}>
            <X size={20} />
          </button>
          <button className="photo-lightbox-nav prev" onClick={(e) => { e.stopPropagation(); moveLightbox('prev') }}>
            <ArrowLeft size={18} />
          </button>
          <div className="photo-lightbox-stage" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxImages[lightboxIndex]} alt="Просмотр фото" className="photo-lightbox-image" />
            <div className="photo-lightbox-dots">
              {lightboxImages.map((_, index) => (
                <button key={index} className={lightboxIndex === index ? 'photo-lightbox-dot active' : 'photo-lightbox-dot'} onClick={() => setLightboxIndex(index)} />
              ))}
            </div>
          </div>
          <button className="photo-lightbox-nav next" onClick={(e) => { e.stopPropagation(); moveLightbox('next') }}>
            <ArrowLeft size={18} />
          </button>
        </div>
      )}

      {activeTab === 'profile-view' && viewedProfile && (
        <>
          <main className={`main-layout${pageExiting ? ' page-exiting' : ''}`}>
            <section className="public-profile-screen page-transition">
              <div className="public-profile-topbar">
                <button className="compose-back-btn" onClick={closePublicProfile}>
                  <ArrowLeft size={20} />
                </button>
                <div className="public-profile-topbar-copy">
                  <strong>{viewedProfile.user.name}</strong>
                  <span>{viewedProfile.user.handle}</span>
                </div>
              </div>

              <article className="panel-card public-profile-card compact-profile-card">
                {/* Compact header: avatar + name + stats inline */}
                <div className="cpf-header">
                  <div className="cpf-avatar">
                    {viewedProfile.user.avatarUrl
                      ? <img src={viewedProfile.user.avatarUrl} alt="" />
                      : <span>{(viewedProfile.user.name || '?')[0]}</span>
                    }
                  </div>
                  <div className="cpf-meta">
                    <div className="cpf-name-row">
                      <strong>{viewedProfile.user.name}</strong>
                      {viewedProfile.user.badges && viewedProfile.user.badges.length > 0 && viewedProfile.user.badges.slice(0,3).map((b: string) => <BadgeChip key={b} id={b} />)}
                    </div>
                    <span className="cpf-handle">{viewedProfile.user.handle}</span>
                    {viewedProfile.user.tagline && <span className="cpf-tagline">{viewedProfile.user.tagline}</span>}
                    <div className="cpf-stats-row">
                      <span><strong>{viewedProfile.user.postCount}</strong> постов</span>
                      <span><strong>{viewedProfile.user.followerCount}</strong> подписчиков</span>
                      <span><strong>{viewedProfile.user.followingCount}</strong> подписок</span>
                    </div>
                  </div>
                </div>

                {viewedProfile.user.bio && <p className="cpf-bio">{viewedProfile.user.bio}</p>}

                {/* Actions row */}
                {viewer?.id !== viewedProfile.user.id && (
                  <div className="cpf-actions">
                    <button className="cpf-btn primary" onClick={() => void toggleFollowViewedProfile()} disabled={isProfileActionLoading}>
                      <Users size={14} /> {isProfileActionLoading ? '...' : viewedProfile.isFollowing ? 'Otpisatsya' : 'Obunachi'}
                    </button>
                    <button className="cpf-btn" onClick={() => {
                      setViewedProfile(null)
                      setActiveTab('chats')
                      void startConversation(viewedProfile.user.id)
                    }}>
                      <MessageCircle size={14} /> Yozish
                    </button>
                    <button className="cpf-btn danger" onClick={() => openReportForPost()}>
                      <Ban size={14} />
                    </button>
                  </div>
                )}

                {/* Tabs */}
                <div className="cpf-tabs">
                  <button className={profileViewTab === 'posts' ? 'cpf-tab active' : 'cpf-tab'} onClick={() => setProfileViewTab('posts')}>
                    <Flame size={14} /> {viewedProfile.posts.length}
                  </button>
                  <button className={profileViewTab === 'info' ? 'cpf-tab active' : 'cpf-tab'} onClick={() => setProfileViewTab('info')}>
                    Info
                  </button>
                </div>

                {profileViewTab === 'posts' && (
                  viewedProfile.posts.length === 0 ? (
                    <div className="profile-posts-empty compact"><p>Hali post yo'q</p></div>
                  ) : (
                    <div className="profile-ig-grid cpf-posts-grid">
                      {viewedProfile.posts.map(post => {
                        const thumb = post.imageUrls?.[0] || post.imageUrl || null
                        return (
                          <button key={post.id} className={`profile-ig-cell${thumb ? '' : ' text-only'}`}
                            onClick={() => openImageLightbox(thumb ? (post.imageUrls?.length ? post.imageUrls : [post.imageUrl]).filter(Boolean) as string[] : [], 0)}>
                            {thumb ? (
                              <img src={thumb} alt="" className="profile-ig-thumb" />
                            ) : (
                              <div className="profile-ig-text"><p>{post.text.slice(0, 80)}</p></div>
                            )}
                            <div className="profile-ig-overlay">
                              <Zap size={11}/><span>{post.boosts}</span>
                              <MessageSquare size={11} style={{marginLeft:'6px'}}/><span>{post.commentsCount || post.comments.length}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )
                )}

                {profileViewTab === 'info' && (
                  <div className="cpf-info-grid">
                    {viewedProfile.user.city && <div className="cpf-info-row"><MapPin size={13}/><span>{viewedProfile.user.city}</span></div>}
                    <div className="cpf-info-row"><Zap size={13}/><span>{viewedProfile.user.powers ?? 0} энергии</span></div>
                    <div className="cpf-info-row"><Eye size={13}/><span>{viewedProfile.user.profileViews || 0} просмотров</span></div>
                    <div className="cpf-info-row"><User size={13}/><span>С нами с {formatDate(viewedProfile.user.joinedAt)}</span></div>
                    {viewedProfile.user.bio && <div className="cpf-info-row bio"><span>{viewedProfile.user.bio}</span></div>}
                  </div>
                )}
              </article>
            </section>
          </main>
        </>
      )}

      {reportProfileOpen && viewedProfile && (
        <div className="compose-modal">
          <div className="compose-modal-backdrop" onClick={() => setReportProfileOpen(false)} />
          <div className="compose-modal-sheet report-modal-sheet">
            <div className="sheet-head">
              <h2>Жалоба</h2>
              <p>{viewedProfile.user.name} {viewedProfile.user.handle}</p>
            </div>
            {viewedProfile.posts.length > 0 && (
              <label className="input-block">
                <span>На что жалоба</span>
                <select value={reportPostId} onChange={(e) => setReportPostId(e.target.value)}>
                  <option value="">На профиль целиком</option>
                  {viewedProfile.posts.map((post) => (
                    <option key={post.id} value={post.id}>
                      {post.text.slice(0, 72) || 'Публикация без текста'}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {reportPostId && (
              <div className="report-selected-post">
                <strong>Выбрана публикация</strong>
                <p>{viewedProfile.posts.find((post) => post.id === reportPostId)?.text || 'Публикация'}</p>
              </div>
            )}
            <div className="report-reasons-grid">
              {['Спам', 'Фейк', 'Оскорбления', '18+', 'Мошенничество', 'Своё'].map(reason => (
                <button
                  key={reason}
                  className={reportReason === reason ? 'report-reason-btn active' : 'report-reason-btn'}
                  onClick={() => setReportReason(reason)}
                >
                  {reason}
                </button>
              ))}
            </div>
            <label className="input-block">
              <span>Комментарий</span>
              <textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder={reportReason === 'Своё' ? 'Опиши причину подробно' : 'Можно добавить детали'}
                maxLength={500}
              />
            </label>
            <div className="report-modal-actions">
              <button className="secondary-btn" onClick={() => setReportProfileOpen(false)}>{t.cancel}</button>
              <button className="primary-btn" onClick={() => void submitProfileReport()} disabled={isSubmittingReport}>
                <Send size={14} /> {isSubmittingReport ? '...' : 'Отправить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
