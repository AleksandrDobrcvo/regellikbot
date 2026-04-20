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
  Users,
  Wallet,
  X,
  Zap,
  MoreHorizontal,
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
  authorRole?: string
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
  maintenanceTitle: string
  maintenanceMessage: string
  onlineCounterVisible: boolean
  publicFeedVisible: boolean
  inboxEnabled: boolean
  devBadgeVisible: boolean
  profileEditEnabled: boolean
  messageCost: number
  messageEarn: number
  topUpOptions: number[]
  adminPermBan: boolean
  adminPermGrantRoles: boolean
  adminPermTopUp: boolean
  adminPermEditProfiles: boolean
}

type AdminManagedUser = SessionUser & {
  providerId: string
  isVisible: boolean
  lastSeen: string | null
  isOnline: boolean
  currentActivity: string | null
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
  priority?: string
  contact?: string | null
  status: ReportStatus
  resolvedBy?: string
  resolvedByName?: string
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

type TxType = 'message_sent' | 'message_received' | 'topup' | 'deduct' | 'boost_received' | 'boost_removed' | 'referral' | 'post_created'

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
  isDev?: boolean
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
  maintenanceTitle: 'Технические работы',
  maintenanceMessage: 'Сервер временно недоступен. Скоро вернёмся!',
  onlineCounterVisible: true,
  publicFeedVisible: true,
  inboxEnabled: true,
  devBadgeVisible: true,
  profileEditEnabled: true,
  messageCost: 0.1,
  messageEarn: 0.05,
  topUpOptions: [10, 50, 100, 250, 500, 1000],
  adminPermBan: true,
  adminPermGrantRoles: true,
  adminPermTopUp: true,
  adminPermEditProfiles: true,
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
  const [isDev, setIsDev] = useState(false)
  const [onlineUsersForDev, setOnlineUsersForDev] = useState<{id:string;name:string;handle:string;avatarUrl:string|null;currentActivity:string|null}[]>([])
  const [activeTab, setActiveTab] = useState<TabId>('feed')
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('regellik_lang') as Lang) || 'uz')
  const t = translations[lang]
  const switchLang = (l: Lang) => {
    setLang(l)
    localStorage.setItem('regellik_lang', l)
    // Sync to server so notifications use the right language
    if (sessionToken) {
      void apiRequest(`/api/bootstrap?token=${encodeURIComponent(sessionToken)}&lang=${l}`)
    }
  }
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
  const [profileEditOpen, setProfileEditOpen] = useState(false)
  const [profileOpenPost, setProfileOpenPost] = useState<Post | null>(null)
  const [postMenuId, setPostMenuId] = useState<string | null>(null)
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
  const [trendsView, setTrendsView] = useState<'grid' | 'feed'>('feed')
  const [gridSelectedPost, setGridSelectedPost] = useState<Post | null>(null)
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
  const [newPostSheetOpen, setNewPostSheetOpen] = useState(false)
  const [isCreatingPost, setIsCreatingPost] = useState(false)
  const [postConfirmOpen, setPostConfirmOpen] = useState(false)
  const [expandedPostComments, setExpandedPostComments] = useState<Set<string>>(new Set())
  const [closingCommentPosts, setClosingCommentPosts] = useState<Set<string>>(new Set())
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({})

  // Transactions / Power log
  const [powerLog, setPowerLog] = useState<Transaction[]>([])
  const [txLoading, setTxLoading] = useState(false)

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
  type AdminSectionId = 'none' | 'economy' | 'site' | 'roles' | 'topup' | 'users' | 'bans' | 'audit' | 'broadcast' | 'badges' | 'reports' | 'support' | 'dev'
  const [adminSection, setAdminSection] = useState<AdminSectionId>('none')
  const [adminBadgeTab, setAdminBadgeTab] = useState<'catalog' | 'custom'>('catalog')
  const [customBadgeIcon, setCustomBadgeIcon] = useState('◆')
  const [customBadgeLabel, setCustomBadgeLabel] = useState('')
  const [customBadgeCss, setCustomBadgeCss] = useState('badge-vip')

  // Support tickets
  type SupportTicket = {
    conversationId: string
    userId: string
    userName: string
    userHandle: string
    userAvatar: string | null
    createdAt: string
    lastMessageAt: string
    messages: { id: string; senderId: string; text: string; createdAt: string }[]
  }
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([])
  const [supportLoading, setSupportLoading] = useState(false)
  const [supportReplyText, setSupportReplyText] = useState('')
  const [supportActiveTicket, setSupportActiveTicket] = useState<string | null>(null)
  const [supportReplying, setSupportReplying] = useState(false)

  // Profile viewer (for admins)
  const [viewedProfile, setViewedProfile] = useState<ProfileViewData | null>(null)
  const [profileViewTab, setProfileViewTab] = useState<PublicProfileTab>('posts')
  const [isProfileActionLoading, setIsProfileActionLoading] = useState(false)
  const [reportProfileOpen, setReportProfileOpen] = useState(false)
  const [reportReason, setReportReason] = useState<string>(t.reportCustom)
  const [reportText, setReportText] = useState('')
  const [reportPostId, setReportPostId] = useState<string>('')
  const [reportPriority, setReportPriority] = useState('medium')
  const [reportContact, setReportContact] = useState('')
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)
  const [reportImage, setReportImage] = useState<string | null>(null)
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

  // Support 24/7
  const [supportOpen, setSupportOpen] = useState(false)
  const [supportCategory, setSupportCategory] = useState('technical')
  const [supportMessage, setSupportMessage] = useState('')
  const [isSendingSupport, setIsSendingSupport] = useState(false)
  const [supportSent, setSupportSent] = useState(false)
  const [closingModal, setClosingModal] = useState<string | null>(null)

  // Toast notifications
  type ToastItem = { id: number; message: string; tone: ToastTone }
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const toastCounter = useRef(0)

  const closeModalAnimated = (modalId: string, onDone: () => void) => {
    setClosingModal(modalId)
    setTimeout(() => { setClosingModal(null); onDone() }, 220)
  }

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
      // Report activity to server
      if (wsRef.current?.readyState === 1) {
        wsRef.current.send(JSON.stringify({ type: 'activity', tab: newTab }))
      }
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

  const systemUnread = useMemo(() => conversations.filter(c => c.isSystem).reduce((sum, c) => sum + c.unreadCount, 0), [conversations])
  const chatUnread = useMemo(() => conversations.filter(c => !c.isSystem).reduce((sum, c) => sum + c.unreadCount, 0), [conversations])

  const showToast = (message: string, tone: ToastTone) => {
    try { navigator.vibrate?.(80) } catch { /* ignore */ }
    const id = ++toastCounter.current
    setToasts(prev => [...prev, { id, message, tone }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }

  const dismissToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  const deleteOwnPost = async (postId: string) => {
    if (!sessionToken) return
    try {
      await apiRequest(`/api/posts/${postId}`, { method: 'DELETE' }, sessionToken)
      setPosts(prev => prev.filter(p => p.id !== postId))
      setPostMenuId(null)
      showToast(lang === 'uz' ? 'Post o\'chirildi' : 'Пост удалён', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.error, 'error')
    }
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
    if (data.isDev !== undefined) setIsDev(data.isDev)
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
        const langQ = lang ? `&lang=${lang}` : ''
        const query = sessionToken ? `/api/bootstrap?token=${encodeURIComponent(sessionToken)}${langQ}` : `/api/bootstrap?lang=${lang}`
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

        // Deep-link: open profile from URL path /@handle (handled via separate useEffect)
        if (!cancelled) {
          const pathMatch = window.location.pathname.match(/^\/@([\w.]+)$/)
          if (pathMatch) {
            const handleSlug = pathMatch[1]
            // Small delay to ensure component is fully mounted
            setTimeout(() => {
              const clean = handleSlug
              void apiRequest<ProfileViewData>(`/api/users/by-handle/${encodeURIComponent(clean)}/public`, {}, sessionToken || undefined)
                .then(profileData => {
                  setViewedProfile(profileData)
                  setProfileViewTab('posts')
                  setReportPostId('')
                  switchTab('profile-view')
                })
                .catch(() => {})
            }, 100)
          }
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
  const wsReconnectTimer = useRef<number | null>(null)

  useEffect(() => {
    if (!sessionToken) return

    function connectWs() {
      const socket = new WebSocket(resolveWsUrl())
      wsRef.current = socket

      socket.addEventListener('open', () => {
        socket.send(JSON.stringify({ type: 'auth', token: sessionToken }))
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
            setConversations(payload.conversations)

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

      socket.addEventListener('close', () => {
        wsRef.current = null
        wsReconnectTimer.current = window.setTimeout(connectWs, 3000)
      })
    }

    connectWs()

    // Poll conversations every 30s as fallback
    const pollId = window.setInterval(async () => {
      try {
        const data = await apiRequest<{ conversations: ConversationPreview[] }>('/api/conversations', undefined, sessionToken)
        setConversations(data.conversations)
      } catch { /* ignore */ }
    }, 30000)

    return () => {
      wsRef.current?.close()
      wsRef.current = null
      if (wsReconnectTimer.current) window.clearTimeout(wsReconnectTimer.current)
      window.clearInterval(pollId)
    }
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

  const submitSupport = async () => {
    if (!supportMessage.trim() || !sessionToken) return
    setIsSendingSupport(true)
    const catLabels: Record<string, string> = {
      technical: t.supportCatTech,
      account: t.supportCatAccount,
      payment: t.supportCatPayment,
      other: t.supportCatOther,
    }
    const catLabel = catLabels[supportCategory] || supportCategory
    const formattedMsg = `[${catLabel}]\n\n${supportMessage.trim()}`
    try {
      const data = await apiRequest<{ conversationId: string }>('/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ recipientId: 'support' }),
      }, sessionToken)
      await apiRequest(`/api/conversations/${data.conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text: formattedMsg }),
      }, sessionToken)
      setSupportSent(true)
      setTimeout(() => {
        setSupportOpen(false)
        setSupportSent(false)
        setSupportMessage('')
        setSupportCategory('technical')
      }, 2500)
    } catch {
      showToast(t.error, 'error')
    } finally {
      setIsSendingSupport(false)
    }
  }

  // Load admin reports
  const loadAdminReports = async () => {
    if (!sessionToken) return
    try {
      const data = await apiRequest<{ reports: UserReport[] }>('/api/admin/reports', undefined, sessionToken)
      setReports(data.reports)
    } catch { /* ignore */ }
  }

  // Load admin support tickets
  const loadSupportTickets = async () => {
    if (!sessionToken) return
    setSupportLoading(true)
    try {
      const data = await apiRequest<{ tickets: SupportTicket[] }>('/api/admin/support', undefined, sessionToken)
      setSupportTickets(data.tickets)
    } catch { /* ignore */ } finally {
      setSupportLoading(false)
    }
  }

  const loadDevOnlineUsers = async () => {
    if (!sessionToken) return
    try {
      const data = await apiRequest<{ onlineUsers: {id:string;name:string;handle:string;avatarUrl:string|null;currentActivity:string|null}[] }>('/api/admin/online', undefined, sessionToken)
      setOnlineUsersForDev(data.onlineUsers)
    } catch { /* ignore */ }
  }

  // Admin reply to support ticket
  const replySupportTicket = async (conversationId: string) => {
    if (!supportReplyText.trim() || !sessionToken) return
    setSupportReplying(true)
    try {
      await apiRequest(`/api/admin/support/${conversationId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ text: supportReplyText.trim() }),
      }, sessionToken)
      setSupportReplyText('')
      await loadSupportTickets()
      showToast('Ответ отправлен', 'success')
    } catch {
      showToast('Ошибка отправки', 'error')
    } finally {
      setSupportReplying(false)
    }
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

    // Only 1 photo allowed
    const file = files[0]
    if (!file.type.match(/^image\/(png|jpeg|webp|gif)$/)) {
      showToast(t.photoFormat, 'error')
      event.target.value = ''
      return
    }
    if (file.size > 768 * 1024) {
      showToast(t.photoSize, 'error')
      event.target.value = ''
      return
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    setNewPostImages([dataUrl])
    event.target.value = ''
  }

  const createPost = async () => {
    if (!viewer || !sessionToken || !newPostImages.length) return
    if (viewer.powers < 25) {
      showToast(t.postNotEnoughEnergy, 'error')
      return
    }
    setIsCreatingPost(true)
    try {
      const data = await apiRequest<{ post: Post; newPowers?: number }>('/api/posts', {
        method: 'POST',
        body: JSON.stringify({ text: newPostText.trim(), imageUrls: newPostImages }),
      }, sessionToken)
      setPosts(prev => [data.post, ...prev])
      setNewPostText('')
      setNewPostImages([])
      setNewPostSheetOpen(false)
      if (typeof data.newPowers === 'number') {
        setViewer(v => v ? { ...v, powers: data.newPowers! } : v)
      }
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
    try {
      const data = await apiRequest<ProfileViewData>(`/api/users/${userId}/public`, {}, sessionToken || undefined)
      setViewedProfile(data)
      setProfileViewTab('posts')
      setReportPostId('')
      // Update browser URL to /@handle for shareability
      const handle = data.user.handle.replace(/^@/, '')
      window.history.pushState({}, '', `/@${handle}`)
      // Track recently viewed (only when logged in)
      if (viewer) {
        const entry = { id: data.user.id, name: data.user.name, handle: data.user.handle, avatarUrl: data.user.avatarUrl || null }
        setRecentlyViewedUsers(prev => {
          const updated = [entry, ...prev.filter(u => u.id !== data.user.id)].slice(0, 20)
          localStorage.setItem('rvu', JSON.stringify(updated))
          return updated
        })
      }
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
    window.history.pushState({}, '', '/')
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
    if (!sessionToken) return
    const category = reportReason === t.reportCustom ? '' : reportReason
    if (!category && !reportText.trim()) {
      showToast(t.reportReasonHint, 'error')
      return
    }
    setIsSubmittingReport(true)
    try {
      const targetId = viewedProfile ? viewedProfile.user.id : 'general'
      await apiRequest(`/api/users/${targetId}/report`, {
        method: 'POST',
        body: JSON.stringify({ category, text: reportText.trim(), postId: reportPostId || undefined, priority: reportPriority, contact: reportContact.trim() || undefined, image: reportImage || undefined }),
      }, sessionToken)
      setReportProfileOpen(false)
      setReportReason(t.reportCustom)
      setReportText('')
      setReportPostId('')
      setReportPriority('medium')
      setReportContact('')
      setReportImage(null)
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
    if (expandedPostComments.has(postId)) {
      setClosingCommentPosts(prev => new Set(prev).add(postId))
      setTimeout(() => {
        setExpandedPostComments(prev => { const n = new Set(prev); n.delete(postId); return n })
        setClosingCommentPosts(prev => { const n = new Set(prev); n.delete(postId); return n })
      }, 220)
    } else {
      setExpandedPostComments(prev => new Set(prev).add(postId))
    }
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
    return <div className="loading-screen"><div className="loading-spinner" /></div>
  }

  return (
    <div className={isSignedIn ? 'app-shell has-header' : 'app-shell'}>

      {/* ===== MAINTENANCE SCREEN ===== */}
      {siteSettings.maintenanceMode && !isAdmin && !isDev && (
        <div className="maintenance-screen">
          <div className="mnt-bg-rings">
            <div className="mnt-ring r1" />
            <div className="mnt-ring r2" />
            <div className="mnt-ring r3" />
          </div>
          <div className="mnt-content">
            <div className="mnt-icon-wrap">
              <div className="mnt-icon-glow" />
              <img src="/tg-icons/settings.webp" className="mnt-icon" alt="" />
            </div>
            <h1 className="mnt-title">{siteSettings.maintenanceTitle || 'Технические работы'}</h1>
            <p className="mnt-message">{siteSettings.maintenanceMessage || 'Сервер временно недоступен. Скоро вернёмся!'}</p>
            <div className="mnt-progress-bar"><div className="mnt-progress-fill" /></div>
            <div className="mnt-dots">
              <span /><span /><span />
            </div>
          </div>
        </div>
      )}
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
      <div className="ambient ambient-d" />
      <div className="ambient ambient-e" />
      <div className="ambient-particles">
        <div className="ambient-particle" style={{ left: '10%', top: '20%', '--size': '3px', '--o': '0.18', '--dur': '14s', '--delay': '0s', '--tx1': '40px', '--ty1': '-60px', '--tx2': '-30px', '--ty2': '-120px', '--tx3': '20px', '--ty3': '-30px' } as React.CSSProperties} />
        <div className="ambient-particle" style={{ left: '70%', top: '15%', '--size': '2px', '--o': '0.12', '--dur': '18s', '--delay': '2s', '--tx1': '-50px', '--ty1': '-40px', '--tx2': '20px', '--ty2': '-90px', '--tx3': '-10px', '--ty3': '-50px' } as React.CSSProperties} />
        <div className="ambient-particle" style={{ left: '30%', top: '60%', '--size': '4px', '--o': '0.10', '--dur': '16s', '--delay': '4s', '--tx1': '30px', '--ty1': '-80px', '--tx2': '-40px', '--ty2': '-140px', '--tx3': '15px', '--ty3': '-60px' } as React.CSSProperties} />
        <div className="ambient-particle" style={{ left: '85%', top: '45%', '--size': '2px', '--o': '0.14', '--dur': '20s', '--delay': '1s', '--tx1': '-20px', '--ty1': '-50px', '--tx2': '30px', '--ty2': '-100px', '--tx3': '-25px', '--ty3': '-40px' } as React.CSSProperties} />
        <div className="ambient-particle" style={{ left: '50%', top: '80%', '--size': '3px', '--o': '0.16', '--dur': '12s', '--delay': '3s', '--tx1': '50px', '--ty1': '-70px', '--tx2': '-20px', '--ty2': '-130px', '--tx3': '10px', '--ty3': '-45px' } as React.CSSProperties} />
        <div className="ambient-particle" style={{ left: '15%', top: '75%', '--size': '2px', '--o': '0.10', '--dur': '22s', '--delay': '5s', '--tx1': '-30px', '--ty1': '-55px', '--tx2': '40px', '--ty2': '-110px', '--tx3': '-15px', '--ty3': '-35px' } as React.CSSProperties} />
        <div className="ambient-particle" style={{ left: '60%', top: '35%', '--size': '3px', '--o': '0.13', '--dur': '15s', '--delay': '2s', '--tx1': '25px', '--ty1': '-65px', '--tx2': '-35px', '--ty2': '-95px', '--tx3': '20px', '--ty3': '-50px' } as React.CSSProperties} />
        <div className="ambient-particle" style={{ left: '90%', top: '70%', '--size': '2px', '--o': '0.11', '--dur': '19s', '--delay': '6s', '--tx1': '-45px', '--ty1': '-45px', '--tx2': '15px', '--ty2': '-85px', '--tx3': '-20px', '--ty3': '-55px' } as React.CSSProperties} />
      </div>
      <div className="ambient-ring" style={{ left: '20%', top: '30%', width: '180px', height: '180px', '--dur': '10s', '--delay': '0s' } as React.CSSProperties} />
      <div className="ambient-ring" style={{ right: '15%', top: '55%', width: '140px', height: '140px', '--dur': '14s', '--delay': '3s' } as React.CSSProperties} />
      <div className="ambient-ring" style={{ left: '50%', bottom: '20%', width: '200px', height: '200px', '--dur': '12s', '--delay': '6s' } as React.CSSProperties} />

      {/* Toast notifications — compact top bar style */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast-popup ${toast.tone}`} onClick={() => dismissToast(toast.id)}>
            <div className="toast-popup-icon">
              {toast.tone === 'success'
                ? <img src="/tg-icons/check.webp" className="tg-icon-sm" alt="" />
                : toast.tone === 'error'
                ? <img src="/tg-icons/close.webp" className="tg-icon-sm" alt="" />
                : <img src="/tg-icons/question.webp" className="tg-icon-sm" alt="" />}
            </div>
            <div className="toast-popup-body">
              <div className="toast-popup-msg">{toast.message}</div>
            </div>
            <button className="toast-popup-close" onClick={(e) => { e.stopPropagation(); dismissToast(toast.id) }}>
              <X size={12} />
            </button>
            <div className="toast-popup-progress" />
          </div>
        ))}
      </div>

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
                activeTab === 'chats' ? t.tabChats :
                activeTab === 'trends' ? t.tabTrends :
                activeTab === 'radar' ? t.tabRadar :
                activeTab === 'transactions' ? t.hamyon :
                activeTab === 'settings' ? t.tabSettings :
                activeTab === 'admin' ? t.tabAdmin :
                activeTab === 'profile' || activeTab === 'profile-view' ? t.tabProfile :
                'Regellik'
              }
            </span>
          </div>
          <div className="header-right">
            <button className="header-bell-btn" onClick={() => { setNotifOpen(true); void loadNotifications(); }}>
              <Bell size={17} />
              {systemUnread > 0 && <span className="header-badge">{systemUnread}</span>}
            </button>
          </div>
        </div>

        {menuOpen && createPortal(
          <>
            <div className={`corner-menu-backdrop${menuExiting ? ' menu-exiting' : ''}`} onClick={closeMenu} />
            <nav className={`corner-menu-dropdown${menuExiting ? ' menu-exiting' : ''}`}>
              <div className="corner-menu-particles" aria-hidden="true">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="corner-menu-particle"
                    style={{
                      left: `${8 + (i * 8) % 84}%`,
                      top: `${10 + (i * 17) % 80}%`,
                      '--dur': `${6 + (i * 1.3) % 8}s`,
                      '--delay': `${(i * 0.7) % 4}s`,
                      '--tx': `${-15 + (i * 5) % 30}px`,
                      '--ty': `${-20 + (i * 6) % 40}px`,
                      width: i % 3 === 0 ? '3px' : '2px',
                      height: i % 3 === 0 ? '3px' : '2px',
                    } as React.CSSProperties}
                  />
                ))}
              </div>
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
                    <button style={{'--i': 0} as React.CSSProperties} className={activeTab === 'profile' ? 'corner-menu-item active' : 'corner-menu-item'} onClick={() => switchTab('profile', closeMenu)}>
                      <img src="/tg-icons/user.webp" className="tg-icon" alt="" /> {t.tabProfile}
                    </button>
                    <button style={{'--i': 1} as React.CSSProperties} className={activeTab === 'chats' ? 'corner-menu-item active' : 'corner-menu-item'} onClick={() => switchTab('chats', closeMenu)}>
                      <img src="/tg-icons/chat.webp" className="tg-icon" alt="" /> {t.chatlar}
                      {chatUnread > 0 && <span className="menu-badge">{chatUnread}</span>}
                    </button>
                    <button style={{'--i': 2} as React.CSSProperties} className={activeTab === 'trends' ? 'corner-menu-item active' : 'corner-menu-item'} onClick={() => switchTab('trends', closeMenu)}>
                      <img src="/tg-icons/hash.webp" className="tg-icon" alt="" /> {t.global}
                    </button>
                    <button style={{'--i': 3} as React.CSSProperties} className={activeTab === 'radar' ? 'corner-menu-item active' : 'corner-menu-item'} onClick={() => switchTab('radar', () => { closeMenu(); void loadRadar() })}>
                      <img src="/tg-icons/users.webp" className="tg-icon" alt="" /> {t.kontaktlar}
                    </button>
                    <button style={{'--i': 4} as React.CSSProperties} className={activeTab === 'transactions' ? 'corner-menu-item active' : 'corner-menu-item'} onClick={() => switchTab('transactions', closeMenu)}>
                      <img src="/tg-icons/wallet.webp" className="tg-icon" alt="" /> {t.hamyon}
                    </button>
                    <button style={{'--i': 5} as React.CSSProperties} className={activeTab === 'settings' ? 'corner-menu-item active' : 'corner-menu-item'} onClick={() => switchTab('settings', closeMenu)}>
                      <img src="/tg-icons/settings.webp" className="tg-icon" alt="" /> {t.sozlamalar}
                    </button>
                    {isAdmin && (
                      <button style={{'--i': 6} as React.CSSProperties} className={activeTab === 'admin' ? 'corner-menu-item active' : 'corner-menu-item'} onClick={() => switchTab('admin', closeMenu)}>
                        <img src="/tg-icons/tools.webp" className="tg-icon" alt="" /> {t.tabAdmin}
                      </button>
                    )}
                    <div className="corner-menu-divider" />
                    <button style={{'--i': 7} as React.CSSProperties} className="corner-menu-item muted-item" onClick={() => { closeMenu(); openReportForPost() }}>
                      <img src="/tg-icons/alert.webp" className="tg-icon" alt="" /> {t.shikoyat}
                    </button>
                    <button style={{'--i': 8} as React.CSSProperties} className="corner-menu-item muted-item" onClick={() => { closeMenu(); setSupportOpen(true) }}>
                      <img src="/tg-icons/shield.webp" className="tg-icon" alt="" /> {t.support}
                    </button>
                    <div className="corner-menu-divider" />
                    <button style={{'--i': 9} as React.CSSProperties} className="corner-menu-item danger-item" onClick={() => { closeMenu(); void signOut() }}>
                      <img src="/tg-icons/door.webp" className="tg-icon" alt="" /> {t.exit}
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


            {/* --- ЧАТЫ (мессенджер) --- */}
            {activeTab === 'chats' && !openConvoId && !composeOpen && (
              <section className="chats-screen page-transition">
                {/* Поиск + радар */}
                <div className="chats-search-bar-wrap">
                  <div className="chats-search-row">
                    <Search size={14} />
                    <input
                      className="chats-search-input"
                      value={chatSearch}
                      onChange={e => setChatSearch(e.target.value)}
                      placeholder={t.search}
                    />
                    {chatSearch && (
                      <button className="chats-search-clear" onClick={() => setChatSearch('')}>
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  <button className="chats-radar-inline-btn" onClick={() => switchTab('radar', () => void loadRadar())} title={t.nearbyTitle}>
                    <Radar size={16} />
                  </button>
                  <button className="chats-contacts-inline-btn" onClick={() => setComposeOpen(true)} title={t.contactsTitle}>
                    <Users size={16} />
                  </button>
                </div>

                {conversations.length === 0 && (
                  <div className="chats-empty">
                    <MessageCircle size={40} />
                    <p>{t.noChats}</p>
                    <span>{t.noChatsHint}</span>
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
                  <h2 className="chats-title">{t.kontaktlar}</h2>
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
                  <input value={composeSearch} onChange={e => setComposeSearch(e.target.value)} placeholder={t.searchContacts} autoFocus />
                </div>

                {filteredKontaktlar.length === 0 && (
                  <div className="chats-empty" style={{marginTop: '24px'}}>
                    <Users size={36} />
                    <p>{t.noContactsYet}</p>
                    <span>{t.noContactsHint}</span>
                  </div>
                )}

                {contactUsers.length > 0 && !composeSearch && (
                  <div className="compose-section-label">{t.kontaktlar}</div>
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
                  <div className="chat-header-user" onClick={() => { if (chatOtherUser && !isSystemChat) void openUserProfile(chatOtherUser.id) }}>
                    {chatOtherUser?.avatarUrl ? (
                      <img className="chat-header-avatar" src={chatOtherUser.avatarUrl} alt="" />
                    ) : (
                      <div className={isSystemChat ? 'chat-header-avatar-placeholder system' : 'chat-header-avatar-placeholder'}>
                        {isSystemChat ? <img src="/tg-icons/settings.webp" className="tg-icon" alt="" /> : chatOtherUser?.name?.[0] || '?'}
                      </div>
                    )}
                    <div>
                      <strong>{isSystemChat ? 'Regellik' : chatOtherUser?.name || t.chatlar}</strong>
                      <small>{isSystemChat ? t.systemChat : (chatOtherUser?.handle?.startsWith('@') ? chatOtherUser.handle : `@${chatOtherUser?.handle || ''}`)}</small>
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
                    const prevMsg = chatMessages[idx - 1]
                    const nextMsg = chatMessages[idx + 1]
                    const isFirstInGroup = !prevMsg || prevMsg.senderId !== msg.senderId || (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 120000)
                    const isLastInGroup = !nextMsg || nextMsg.senderId !== msg.senderId || (new Date(nextMsg.createdAt).getTime() - new Date(msg.createdAt).getTime() > 120000)
                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div className="chat-date-divider">
                            <span>{new Date(msg.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</span>
                          </div>
                        )}
                        <div className={`chat-bubble ${isMine ? 'mine' : 'theirs'}${isSystem ? ' system' : ''}${isFirstInGroup ? ' first' : ''}${isLastInGroup ? ' last' : ''}`}>
                          {isSystem && isFirstInGroup && <span className="chat-bubble-sender">Regellik</span>}
                          <p>{msg.text}</p>
                          {isLastInGroup && <small className="chat-bubble-time">{frt(msg.createdAt)}</small>}
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

                {/* Composer trigger */}
                <div className="trends-composer-trigger">
                  <button className="trends-compose-cta" onClick={() => setNewPostSheetOpen(true)}>
                    <div className="compose-cta-icon"><Plus size={22} /></div>
                    <div className="compose-cta-text">
                      <strong>{lang === 'uz' ? 'Nashr qo\'shish' : 'Создать публикацию'}</strong>
                      <span>{lang === 'uz' ? 'Fotosurat va tavsif' : 'Фото + описание'}</span>
                    </div>
                  </button>
                </div>

                {/* Feed */}
                {trendsView === 'grid' ? (
                  <>
                    {sortedPosts.filter(p => p.imageUrls?.length || p.imageUrl).length === 0 && (
                      <div className="trends-empty">
                        <Flame size={40} />
                        <p>{t.feedEmpty}</p>
                        <span>{t.feedEmptyHint}</span>
                      </div>
                    )}
                    <div className="tk-photo-grid" style={{padding: '0 2px'}}>
                      {sortedPosts.filter(p => p.imageUrls?.length || p.imageUrl).map((post, idx) => {
                        const imgs = post.imageUrls?.length ? post.imageUrls : [post.imageUrl]
                        const thumb = imgs.filter(Boolean)[0] as string
                        const isFirst = idx === 0
                        return (
                          <button
                            key={post.id}
                            className={`tk-grid-cell${isFirst ? ' tk-grid-cell--featured' : ''}`}
                            onClick={() => setGridSelectedPost(post)}
                          >
                            <img src={thumb} alt="" className="tk-grid-img" loading="lazy" />
                            {trendsSort === 'top' && idx < 3 && (
                              <span className="trends-grid-rank">#{idx + 1}</span>
                            )}
                            {(imgs.filter(Boolean).length > 1) && (
                              <span className="tk-grid-multi"><Copy size={12} /></span>
                            )}
                            <div className="tk-grid-overlay">
                              <span><Zap size={13} fill="currentColor" />{post.boosts}</span>
                              <span><MessageSquare size={13} />{post.commentsCount || post.comments.length}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>

                    {/* Post detail sheet */}
                    {gridSelectedPost && (
                      <div className="pk-post-layer">
                        <div className="pk-post-backdrop" onClick={() => setGridSelectedPost(null)} />
                        <div className="pk-post-sheet">
                          <div className="pk-post-images">
                            {(gridSelectedPost.imageUrls?.length ? gridSelectedPost.imageUrls : [gridSelectedPost.imageUrl]).filter(Boolean).map((img, i) => (
                              <img key={i} src={img!} alt="" className="pk-post-img" onClick={() => openImageLightbox((gridSelectedPost.imageUrls?.length ? gridSelectedPost.imageUrls : [gridSelectedPost.imageUrl]).filter(Boolean) as string[], i)} />
                            ))}
                          </div>
                          <div className="pk-post-body">
                            <div className="pk-post-author">
                              <div className="pk-post-avatar" style={{cursor:'pointer'}} onClick={() => { setGridSelectedPost(null); void openUserProfile(gridSelectedPost.authorId) }}>
                                {gridSelectedPost.authorAvatarUrl
                                  ? <img src={gridSelectedPost.authorAvatarUrl} alt="" />
                                  : <span>{gridSelectedPost.authorName[0]}</span>}
                              </div>
                              <div>
                                <strong className="clickable-author" onClick={() => { setGridSelectedPost(null); void openUserProfile(gridSelectedPost.authorId) }}>{gridSelectedPost.authorName}</strong>
                                <span>{gridSelectedPost.authorHandle} · {frt(gridSelectedPost.createdAt)}</span>
                              </div>
                            </div>
                            {gridSelectedPost.text && <p className="pk-post-caption">{gridSelectedPost.text}</p>}
                            <div className="pk-post-stats">
                              <button className={`pk-stat-btn${gridSelectedPost.boostedByViewer ? ' active' : ''}`} onClick={() => { void boostPost(gridSelectedPost.id); setGridSelectedPost(prev => prev ? {...prev, boostedByViewer: !prev.boostedByViewer, boosts: prev.boosts + (prev.boostedByViewer ? -1 : 1)} : null) }}>
                                <Zap size={17} fill={gridSelectedPost.boostedByViewer ? 'currentColor' : 'none'} />
                                <span>{gridSelectedPost.boosts}</span>
                              </button>
                              <button className="pk-stat-btn" onClick={() => togglePostComments(gridSelectedPost.id)}>
                                <MessageSquare size={17} />
                                <span>{gridSelectedPost.commentsCount || gridSelectedPost.comments.length}</span>
                              </button>
                            </div>
                            {(expandedPostComments.has(gridSelectedPost.id) || closingCommentPosts.has(gridSelectedPost.id)) && (
                              <div className={`thr-comments pk-comments${closingCommentPosts.has(gridSelectedPost.id) ? ' closing' : ''}`}>
                                {gridSelectedPost.comments.map(cmt => (
                                  <div key={cmt.id} className="thr-comment">
                                    <div className="thr-comment-head">
                                      <strong className="clickable-author" onClick={() => { setGridSelectedPost(null); void openUserProfile(cmt.authorId) }}>{cmt.authorName}</strong>
                                      <span>{cmt.authorHandle}</span>
                                      <small>{frt(cmt.createdAt)}</small>
                                    </div>
                                    <p>{cmt.text}</p>
                                  </div>
                                ))}
                                <div className="thr-comment-input">
                                  <input
                                    value={commentTexts[gridSelectedPost.id] || ''}
                                    onChange={e => setCommentTexts(prev => ({...prev, [gridSelectedPost.id]: e.target.value}))}
                                    placeholder={t.commentPlaceholder}
                                    maxLength={300}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void addComment(gridSelectedPost.id) } }}
                                  />
                                  <button className="thr-comment-send" onClick={() => void addComment(gridSelectedPost.id)} disabled={!commentTexts[gridSelectedPost.id]?.trim()}>
                                    <Send size={14} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          <button className="pk-post-close" onClick={() => setGridSelectedPost(null)}><X size={18} /></button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                <div className="threads-feed profile-threads-feed">
                  {sortedPosts.length === 0 && (
                    <div className="trends-empty">
                      <Flame size={40} />
                      <p>{t.feedEmpty}</p>
                      <span>{t.feedEmptyHint}</span>
                    </div>
                  )}
                  {sortedPosts.map((post, idx) => (
                    <article key={post.id} className="thr-post">
                      <div className="thr-left">
                        <div className="thr-avatar" onClick={() => void openUserProfile(post.authorId)}>
                          {post.authorAvatarUrl
                            ? <img src={post.authorAvatarUrl} alt="" />
                            : <span>{post.authorName[0]}</span>
                          }
                        </div>
                        <div className="thr-line" />
                      </div>
                      <div className="thr-right">
                        <div className="thr-header">
                          <strong className="thr-author clickable-author" onClick={() => void openUserProfile(post.authorId)}>
                            {post.authorName}
                          </strong>
                          {post.authorBadges?.includes('VERIFIED') && <span className="verified-check"><BadgeCheck size={14} /></span>}
                          {post.authorRole === 'admin' && <span className="dev-tag">dev</span>}
                          <span className="thr-time">{frt(post.createdAt)}</span>
                          {trendsSort === 'top' && idx < 3 && (
                            <span className={`thr-rank rank-${idx + 1}`}>#{idx + 1}</span>
                          )}
                        </div>

                        {post.text && <p className="thr-text">{post.text}</p>}

                        {(post.imageUrls?.length || post.imageUrl) && (
                          <div className={`thr-images${(post.imageUrls?.length || 0) > 1 ? ' multi' : ''}`}>
                            {(post.imageUrls?.length ? post.imageUrls : [post.imageUrl]).filter(Boolean).map((image, index) => (
                              <img
                                key={`${post.id}-${index}`}
                                src={image!}
                                alt={t.publication}
                                className="thr-img"
                                onClick={() => openImageLightbox((post.imageUrls?.length ? post.imageUrls : [post.imageUrl]).filter(Boolean) as string[], index)}
                              />
                            ))}
                            {(post.imageUrls?.length || 0) > 1 && (
                              <span className="thr-img-count">{post.imageUrls!.length}</span>
                            )}
                          </div>
                        )}

                        <div className="thr-actions">
                          <div className="boost-btn-wrap">
                            <button
                              className={`thr-action-btn${post.boostedByViewer ? ' active energy' : ''}`}
                              onClick={() => void boostPost(post.id)}
                              title={post.boostedByViewer ? t.boostRemove : t.boostAction}
                            >
                              <Zap size={18} fill={post.boostedByViewer ? 'currentColor' : 'none'} />
                              {post.boosts > 0 && <span>{post.boosts}</span>}
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
                            className={`thr-action-btn${expandedPostComments.has(post.id) ? ' active' : ''}`}
                            onClick={() => togglePostComments(post.id)}
                          >
                            <MessageSquare size={18} />
                            {(post.commentsCount || post.comments.length) > 0 && <span>{post.commentsCount || post.comments.length}</span>}
                          </button>
                          <button
                            className={`thr-action-btn${post.repostedByViewer ? ' active repost' : ''}${post.authorId === viewer?.id ? ' disabled' : ''}`}
                            onClick={() => post.authorId !== viewer?.id && void repostPost(post.id)}
                            title={post.repostedByViewer ? t.repostRemove : t.repostAction}
                          >
                            <RefreshCw size={17} />
                            {(post.reposts || 0) > 0 && <span>{post.reposts}</span>}
                          </button>
                          <button className="thr-action-btn" onClick={() => { void navigator.clipboard?.writeText(`${window.location.origin}?post=${post.id}`); showToast(t.linkCopied || 'Link copied', 'success') }}>
                            <Send size={17} />
                          </button>
                          {isAdmin && (
                            <button className="thr-action-btn danger" onClick={() => void adminDeletePost(post.id)}>
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>

                        {(expandedPostComments.has(post.id) || closingCommentPosts.has(post.id)) && (
                          <div className={`thr-comments${closingCommentPosts.has(post.id) ? ' closing' : ''}`}>
                            {post.comments.map(cmt => (
                              <div key={cmt.id} className="thr-comment">
                                <div className="thr-comment-head">
                                  <strong className="clickable-author" onClick={() => void openUserProfile(cmt.authorId)}>{cmt.authorName}</strong>
                                  <span>{cmt.authorHandle}</span>
                                  <small>{frt(cmt.createdAt)}</small>
                                </div>
                                <p>{cmt.text}</p>
                              </div>
                            ))}
                            <div className="thr-comment-input">
                              <input
                                value={commentTexts[post.id] || ''}
                                onChange={(e) => setCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                                placeholder={t.commentPlaceholder}
                                maxLength={300}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void addComment(post.id) } }}
                              />
                              <button
                                className="thr-comment-send"
                                onClick={() => void addComment(post.id)}
                                disabled={!commentTexts[post.id]?.trim()}
                              >
                                <Send size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
                )} {/* end trendsView feed */}
              </section>
            )}

            {/* --- ПРОФИЛЬ --- */}
            {activeTab === 'profile' && viewer && (
              <section className="tk-profile-screen page-transition">

                {/* ── TikTok-style profile header ── */}
                <div className="tk-profile-header">
                  <div className="tk-avatar-wrap">
                    {viewer.avatarUrl
                      ? <img src={viewer.avatarUrl} alt={viewer.name} className="tk-avatar-img" />
                      : <span className="tk-avatar-letter">{viewer.name[0]}</span>}
                  </div>
                  <div className="tk-profile-name">
                    {viewer.name}
                    {viewer.badges.includes('VERIFIED') && <span className="verified-check"><BadgeCheck size={15} /></span>}
                    {viewer.role === 'admin' && <span className="dev-tag">dev</span>}
                  </div>
                  <div className="tk-profile-handle">{viewer.handle}</div>

                  {/* Stats row */}
                  <div className="tk-profile-stats">
                    <div className="tk-stat"><strong>{viewer.postCount}</strong><span>{t.postsCount}</span></div>
                    <div className="tk-stat"><strong>{viewer.followerCount}</strong><span>{t.followers}</span></div>
                    <div className="tk-stat"><strong>{viewer.followingCount}</strong><span>{t.following}</span></div>
                    <div className="tk-stat"><strong>{viewer.powers}</strong><span>{t.energyLabel}</span></div>
                  </div>

                  {/* Action buttons */}
                  <div className="tk-profile-actions">
                    <button className="tk-edit-btn" onClick={() => setProfileEditOpen(true)}>
                      {lang === 'uz' ? 'Profilni tahrirlash' : 'Редактировать профиль'}
                    </button>
                    <button className="tk-share-btn tk-new-post-btn" title={lang === 'uz' ? "Nashr qo'shish" : 'Новая публикация'} onClick={() => setNewPostSheetOpen(true)}>
                      <Plus size={18} />
                    </button>
                    <button className="tk-share-btn" title={lang === 'uz' ? 'Ulashish' : 'Поделиться'} onClick={() => {
                      const handle = viewer.handle.replace(/^@/, '')
                      const shareUrl = `${window.location.origin}/@${handle}`
                      const shareText = lang === 'uz' ? `Mening profilim: ${viewer.name}` : `Мой профиль: ${viewer.name}`
                      if (navigator.share) {
                        void navigator.share({ title: viewer.name, text: shareText, url: shareUrl })
                      } else {
                        void navigator.clipboard?.writeText(shareUrl)
                        showToast(t.linkCopied || (lang === 'uz' ? 'Havola nusxalandi' : 'Ссылка скопирована'), 'success')
                      }
                    }}>
                      <Send size={16} />
                    </button>
                  </div>

                  {isAdmin && <div className="profile-meta-chips tk-meta-chips"><span className="profile-meta-chip admin"><ShieldCheck size={11} />Admin</span></div>}
                </div>

                {/* ── Publications grid ── */}
                <div className="tk-profile-posts">
                  <div className="tk-posts-header">
                    <span className="eyebrow">{t.publications}</span>
                    <span className="profile-posts-counter">{ownPosts.filter(p => p.imageUrls?.length || p.imageUrl).length}</span>
                  </div>
                  {ownPosts.filter(p => p.imageUrls?.length || p.imageUrl).length === 0 ? (
                    <div className="profile-posts-empty">
                      <Camera size={28} />
                      <p>{t.noPosts}</p>
                      <span>{lang === 'uz' ? 'Rasmli post qo\'shing' : 'Добавьте первое фото'}</span>
                    </div>
                  ) : (
                    <div className="tk-photo-grid">
                      {ownPosts.filter(p => p.imageUrls?.length || p.imageUrl).map((post, idx) => {
                        const imgs = post.imageUrls?.length ? post.imageUrls : [post.imageUrl]
                        const thumb = imgs.filter(Boolean)[0] as string
                        const isFirst = idx === 0
                        return (
                          <button
                            key={post.id}
                            className={`tk-grid-cell${isFirst ? ' tk-grid-cell--featured' : ''}`}
                            onClick={() => setProfileOpenPost(post)}
                          >
                            <img src={thumb} alt="" className="tk-grid-img" loading="lazy" />
                            {(imgs.filter(Boolean).length > 1) && (
                              <span className="tk-grid-multi"><Copy size={12} /></span>
                            )}
                            <div className="tk-grid-overlay">
                              <span><Zap size={13} fill="currentColor" />{post.boosts}</span>
                              <span><MessageSquare size={13} />{post.commentsCount || post.comments.length}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

              </section>
            )}

            {/* ── Profile Post Detail Modal ── */}
            {profileOpenPost && viewer && (
              <div className="pk-post-layer">
                <div className="pk-post-backdrop" onClick={() => setProfileOpenPost(null)} />
                <div className="pk-post-sheet">
                  {/* Images */}
                  <div className="pk-post-images">
                    {(profileOpenPost.imageUrls?.length ? profileOpenPost.imageUrls : [profileOpenPost.imageUrl]).filter(Boolean).map((img, i) => (
                      <img key={i} src={img!} alt="" className="pk-post-img" />
                    ))}
                  </div>
                  {/* Caption + actions */}
                  <div className="pk-post-body">
                    <div className="pk-post-author">
                      <div className="pk-post-avatar">
                        {viewer.avatarUrl ? <img src={viewer.avatarUrl} alt="" /> : <span>{viewer.name[0]}</span>}
                      </div>
                      <div>
                        <strong>{viewer.name}</strong>
                        <span>{frt(profileOpenPost.createdAt)}</span>
                      </div>
                      {/* Options menu */}
                      <div className="post-options-wrap" style={{marginLeft: 'auto'}}>
                        <button className="post-options-btn" onClick={() => setPostMenuId(postMenuId === profileOpenPost.id ? null : profileOpenPost.id)}>
                          <MoreHorizontal size={16} />
                        </button>
                        {postMenuId === profileOpenPost.id && (
                          <>
                            <div className="post-options-backdrop" onClick={() => setPostMenuId(null)} />
                            <div className="post-options-menu" style={{right: 0}}>
                              <button onClick={() => {
                                void navigator.clipboard?.writeText(`${window.location.origin}?post=${profileOpenPost.id}`)
                                showToast(t.linkCopied || 'Link copied', 'success')
                                setPostMenuId(null)
                              }}>
                                <img src="/tg-icons/link.webp" className="tg-icon-sm" alt="" />
                                {lang === 'uz' ? 'Havolani nusxa olish' : 'Скопировать ссылку'}
                              </button>
                              <button onClick={() => void repostPost(profileOpenPost.id).then(() => setPostMenuId(null))}>
                                <img src="/tg-icons/trending.webp" className="tg-icon-sm" alt="" />
                                {t.repostAction}
                              </button>
                              <button className="danger" onClick={() => { void deleteOwnPost(profileOpenPost.id); setProfileOpenPost(null) }}>
                                <img src="/tg-icons/trash.webp" className="tg-icon-sm" alt="" />
                                {lang === 'uz' ? 'O\'chirish' : 'Удалить'}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    {profileOpenPost.text && <p className="pk-post-caption">{profileOpenPost.text}</p>}
                    <div className="pk-post-stats">
                      <button className={`pk-stat-btn${profileOpenPost.boostedByViewer ? ' active' : ''}`} onClick={() => { void boostPost(profileOpenPost.id); setProfileOpenPost(prev => prev ? {...prev, boostedByViewer: !prev.boostedByViewer, boosts: prev.boosts + (prev.boostedByViewer ? -1 : 1)} : null) }}>
                        <Zap size={17} fill={profileOpenPost.boostedByViewer ? 'currentColor' : 'none'} />
                        <span>{profileOpenPost.boosts}</span>
                      </button>
                      <button className="pk-stat-btn" onClick={() => togglePostComments(profileOpenPost.id)}>
                        <MessageSquare size={17} />
                        <span>{profileOpenPost.commentsCount || profileOpenPost.comments.length}</span>
                      </button>
                    </div>
                    {/* Comments inline */}
                    {(expandedPostComments.has(profileOpenPost.id) || closingCommentPosts.has(profileOpenPost.id)) && (
                      <div className={`thr-comments pk-comments${closingCommentPosts.has(profileOpenPost.id) ? ' closing' : ''}`}>
                        {profileOpenPost.comments.map(cmt => (
                          <div key={cmt.id} className="thr-comment">
                            <div className="thr-comment-head">
                              <strong>{cmt.authorName}</strong>
                              <span>{cmt.authorHandle}</span>
                              <small>{frt(cmt.createdAt)}</small>
                            </div>
                            <p>{cmt.text}</p>
                          </div>
                        ))}
                        <div className="thr-comment-input">
                          <input
                            value={commentTexts[profileOpenPost.id] || ''}
                            onChange={e => setCommentTexts(prev => ({...prev, [profileOpenPost.id]: e.target.value}))}
                            placeholder={t.commentPlaceholder}
                            maxLength={300}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void addComment(profileOpenPost.id) } }}
                          />
                          <button className="thr-comment-send" onClick={() => void addComment(profileOpenPost.id)} disabled={!commentTexts[profileOpenPost.id]?.trim()}>
                            <Send size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <button className="pk-post-close" onClick={() => setProfileOpenPost(null)}><X size={18} /></button>
                </div>
              </div>
            )}

            {/* ── Edit Profile Modal ── */}
            {profileEditOpen && viewer && (
              <div className="profile-edit-layer">
                <div className="profile-edit-backdrop" onClick={() => setProfileEditOpen(false)} />
                <div className="profile-edit-sheet">
                  <div className="profile-edit-head">
                    <span>{lang === 'uz' ? 'Profilni tahrirlash' : 'Редактировать профиль'}</span>
                    <button className="sheet-close-btn" onClick={() => setProfileEditOpen(false)}><X size={18} /></button>
                  </div>

                  {/* Avatar */}
                  <div className="profile-edit-avatar-row">
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
                  </div>

                  {/* Fields */}
                  <div className="profile-edit-fields">
                    <label className="profile-edit-label">{t.name}</label>
                    <input
                      className="profile-edit-input"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder={t.name}
                      disabled={!siteSettings.profileEditEnabled}
                    />

                    <label className="profile-edit-label">Handle</label>
                    <div className="hero-handle-row">
                      <input
                        className="profile-edit-input"
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

                    <label className="profile-edit-label">{t.taglinePlaceholder}</label>
                    <input
                      className="profile-edit-input"
                      value={profileTagline}
                      onChange={(e) => setProfileTagline(e.target.value)}
                      placeholder={t.taglinePlaceholder}
                      maxLength={72}
                      disabled={!siteSettings.profileEditEnabled}
                    />

                    <label className="profile-edit-label">Bio</label>
                    <textarea
                      className="profile-edit-textarea"
                      value={profileBio}
                      onChange={(e) => setProfileBio(e.target.value)}
                      placeholder={t.bioPlaceholder}
                      rows={3}
                      disabled={!siteSettings.profileEditEnabled}
                    />
                  </div>

                  {/* Save/Cancel */}
                  <div className="profile-edit-actions">
                    <button className="primary-btn" onClick={() => { void saveProfile(); setProfileEditOpen(false) }} disabled={isSavingProfile}>
                      <Save size={14} /> {isSavingProfile ? '...' : t.save}
                    </button>
                    <button className="secondary-btn" onClick={() => {
                      setProfileName(viewer.name)
                      setProfileHandle(viewer.handle)
                      setProfileBio(viewer.bio || '')
                      setProfileTagline(viewer.tagline || '')
                      setProfileEditOpen(false)
                    }}>
                      {t.cancel}
                    </button>
                  </div>
                </div>
              </div>
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

                  {/* O'tkazish — energy transfer */}
                  <button className="transfer-cta-btn" onClick={() => { setTransferOpen(o => !o); setTransferResult(null) }}>
                    <Send size={17} style={{transform: 'rotate(-45deg)'}} />
                    {transferOpen ? t.transferClose : t.transfer}
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
                              <small>{t.transferFeeLabel}: {transferResult.fee} <Zap size={11}/></small>
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
                            <span><img src="/tg-icons/clock.webp" className="tg-icon-inline" alt="" /> {t.transferCooldown}</span>
                            <span><img src="/tg-icons/calendar.webp" className="tg-icon-inline" alt="" /> {t.transferAge}</span>
                            <span><img src="/tg-icons/lock.webp" className="tg-icon-inline" alt="" /> {t.transferFee}</span>
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
                                <span>{t.transferCommission}: {Math.max(1, Math.floor(Number(transferAmount) * 0.05))} <Zap size={11}/></span>
                                <span>{t.transferTotal}: {Number(transferAmount) + Math.max(1, Math.floor(Number(transferAmount) * 0.05))} <Zap size={11}/></span>
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
                          post_created: t.txPostCreated,
                        }
                        const txIcon: Record<TxType, React.ReactNode> = {
                          message_sent: <Send size={14} />,
                          message_received: <MessageCircle size={14} />,
                          topup: <Plus size={14} />,
                          deduct: <Minus size={14} />,
                          boost_received: <Zap size={14} />,
                          boost_removed: <Zap size={14} />,
                          referral: <Users size={14} />,
                          post_created: <Flame size={14} />,
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
                  <h2>{t.settings}</h2>
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
                      <strong>{viewer.preferences.showCity !== false ? viewerLocation : '—'}</strong>
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
                      <ArrowLeft size={18} /> {t.adminBack}
                    </button>
                  ) : (
                    <h2 className="admin-top-title"><ShieldCheck size={20} /> {t.adminPanel}</h2>
                  )}
                </div>

                {/* Show nav grid + stats only when no section is open */}
                {adminSection === 'none' && (<>
                {/* Quick stats row */}
                <div className="admin-quick-stats">
                  <div className="admin-qs-item">
                    <Users size={14} />
                    <strong>{adminUsers.length}</strong>
                    <span>{t.adminTotal}</span>
                  </div>
                  <div className="admin-qs-item online">
                    <span className="online-dot" />
                    <strong>{onlineCount}</strong>
                    <span>{t.adminOnline}</span>
                  </div>
                  <div className="admin-qs-item">
                    <Zap size={14} />
                    <strong>{adminUsers.reduce((s, u) => s + u.powers, 0).toFixed(0)}</strong>
                    <span>PWR</span>
                  </div>
                  <div className="admin-qs-item">
                    <Ban size={14} />
                    <strong>{adminUsers.filter(u => u.ban).length}</strong>
                    <span>{t.adminBanned}</span>
                  </div>
                </div>

                {/* Section buttons grid */}
                <div className="admin-nav-grid">
                  {([
                    { id: 'economy' as const, icon: <DollarSign size={18} />, label: t.adminEconomy, desc: t.adminEconomyDesc, perm: true },
                    { id: 'roles' as const, icon: <ShieldCheck size={18} />, label: t.adminRoles, desc: t.adminRolesDesc, perm: isDev || siteSettings.adminPermGrantRoles },
                    { id: 'topup' as const, icon: <Zap size={18} />, label: t.adminTopup, desc: t.adminTopupDesc, perm: isDev || siteSettings.adminPermTopUp },
                    { id: 'users' as const, icon: <Users size={18} />, label: t.adminUsers, desc: t.adminUsersDesc, perm: true },
                    { id: 'reports' as const, icon: <Ban size={18} />, label: t.adminReports, desc: t.adminReportsDesc, perm: true },
                    { id: 'support' as const, icon: <MessageCircle size={18} />, label: t.adminSupport, desc: t.adminSupportDesc, perm: true },
                    { id: 'bans' as const, icon: <Ban size={18} />, label: t.adminBans, desc: t.adminBansDesc, perm: isDev || siteSettings.adminPermBan },
                    { id: 'badges' as const, icon: <BadgeCheck size={18} />, label: t.adminBadges, desc: t.adminBadgesDesc, perm: true },
                    { id: 'audit' as const, icon: <Search size={18} />, label: t.adminAudit, desc: t.adminAuditDesc, perm: true },
                    { id: 'broadcast' as const, icon: <Send size={18} />, label: t.adminBroadcast, desc: t.adminBroadcastDesc, perm: true },
                  ] as const).filter(sec => sec.perm).map(sec => (
                    <button
                      key={sec.id}
                      className="admin-nav-btn"
                      onClick={() => { setAdminSection(sec.id); if (sec.id === 'support') void loadSupportTickets(); if (sec.id === 'reports') void loadAdminReports() }}
                    >
                      <div className="admin-nav-icon">{sec.icon}</div>
                      <div className="admin-nav-text">
                        <strong>{sec.label}</strong>
                        <span>{sec.desc}</span>
                      </div>
                    </button>
                  ))}
                  {isDev && (
                    <button className="admin-nav-btn dev-nav-btn" onClick={() => { setAdminSection('dev'); void loadDevOnlineUsers() }}>
                      <div className="admin-nav-icon"><Monitor size={18} /></div>
                      <div className="admin-nav-text">
                        <strong>DEV</strong>
                        <span>{lang === 'uz' ? 'Chuqur sozlamalar' : 'Глубокие настройки'}</span>
                      </div>
                    </button>
                  )}
                </div>
                </>)}

                {/* === Expandable sections === */}

                {/* Economy */}
                {adminSection === 'economy' && (
                  <form className="admin-section-view" onSubmit={saveSiteSettings}>
                    <div className="admin-section-head">
                      <DollarSign size={18} /> {t.adminEconomy}
                      <button className="primary-btn compact-btn" type="submit" disabled={isSavingSite}>
                        <Save size={14} /> {isSavingSite ? '...' : t.adminSave}
                      </button>
                    </div>
                    <div className="field-grid-2">
                      <label className="input-block">
                        <span>{t.adminMsgCost}</span>
                        <input type="number" step="0.01" min="0" value={siteSettings.messageCost} onChange={e => setSiteSettings(s => ({ ...s, messageCost: Number(e.target.value) || 0 }))} />
                      </label>
                      <label className="input-block">
                        <span>{t.adminMsgEarn}</span>
                        <input type="number" step="0.01" min="0" value={siteSettings.messageEarn} onChange={e => setSiteSettings(s => ({ ...s, messageEarn: Number(e.target.value) || 0 }))} />
                      </label>
                    </div>
                    <label className="input-block">
                      <span>{t.adminTopupAmounts}</span>
                      <input value={(siteSettings.topUpOptions || []).join(', ')} onChange={e => setSiteSettings(s => ({ ...s, topUpOptions: e.target.value.split(',').map(v => Number(v.trim())).filter(v => v > 0) }))} />
                    </label>
                  </form>
                )}

                {/* Site settings */}
                {adminSection === 'site' && (
                  <form className="admin-section-view" onSubmit={saveSiteSettings}>
                    <div className="admin-section-head">
                      <Settings2 size={18} /> {t.adminSiteSettings}
                      <button className="primary-btn compact-btn" type="submit" disabled={isSavingSite}>
                        <Save size={14} /> {isSavingSite ? '...' : t.adminSave}
                      </button>
                    </div>
                    <div className="toggle-grid admin-toggle-grid">
                      {([
                        { key: 'telegramAuthEnabled' as const, icon: <ShieldCheck size={16} />, label: 'TG auth' },
                        { key: 'emailAuthEnabled' as const, icon: <Mail size={16} />, label: 'Email' },
                        { key: 'geoRequiredForSend' as const, icon: <MapPin size={16} />, label: 'Geo req' },
                        { key: 'registrationsOpen' as const, icon: <Users size={16} />, label: t.adminRegistration },
                        { key: 'maintenanceMode' as const, icon: <Settings2 size={16} />, label: t.adminMaintenance, danger: true },
                        { key: 'onlineCounterVisible' as const, icon: <Zap size={16} />, label: t.adminOnlineLabel },
                        { key: 'publicFeedVisible' as const, icon: <MessageCircle size={16} />, label: t.adminFeed },
                        { key: 'inboxEnabled' as const, icon: <Mail size={16} />, label: t.adminInbox },
                        { key: 'devBadgeVisible' as const, icon: <BadgeCheck size={16} />, label: 'DEV badge' },
                        { key: 'profileEditEnabled' as const, icon: <User size={16} />, label: t.adminEditing },
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
                  <form className="admin-section-view grant-role-view" onSubmit={grantAdmin}>
                    <div className="grant-role-hero">
                      <div className="grant-role-icon-wrap">
                        <ShieldCheck size={28} />
                      </div>
                      <h2 className="grant-role-title">{t.adminGrantRole}</h2>
                      <p className="grant-role-hint">{lang === 'uz' ? 'Foydalanuvchiga admin roli berish uchun ID, handle yoki emailni kiriting' : 'Введите ID, handle или email пользователя для выдачи роли'}</p>
                    </div>
                    <div className="grant-role-field-wrap">
                      <label className="grant-role-field-label">{t.adminIdHandleEmail}</label>
                      <div className="grant-role-input-row">
                        <input
                          className="grant-role-input"
                          value={grantIdentifier}
                          onChange={e => setGrantIdentifier(e.target.value)}
                          placeholder={lang === 'uz' ? '@user, email yoki ID' : '@user, email или ID'}
                          autoComplete="off"
                        />
                      </div>
                    </div>
                    <button className="grant-role-submit-btn" type="submit" disabled={isGrantingAdmin || !grantIdentifier.trim()}>
                      <ShieldCheck size={16} />
                      {isGrantingAdmin ? (lang === 'uz' ? '...' : '...') : t.adminGrant}
                    </button>
                  </form>
                )}

                {/* Top-up */}
                {adminSection === 'topup' && (
                  <div className="admin-section-view">
                    <div className="admin-section-head">
                      <Zap size={18} /> {t.adminTopupUser}
                    </div>
                    <label className="input-block">
                      <span>{t.adminUserId}</span>
                      <input value={adminTopUpUserId} onChange={e => setAdminTopUpUserId(e.target.value)} placeholder="id пользователя" />
                    </label>
                    <div className="field-grid-2">
                      <label className="input-block">
                        <span>{t.adminAmount}</span>
                        <input type="number" step="0.01" value={adminTopUpAmount} onChange={e => setAdminTopUpAmount(e.target.value)} placeholder="+100 / -50" />
                      </label>
                      <label className="input-block">
                        <span>{t.adminReason}</span>
                        <input value={adminTopUpReason} onChange={e => setAdminTopUpReason(e.target.value)} placeholder={t.adminOptional} />
                      </label>
                    </div>
                    <button className="primary-btn wide" type="button" onClick={() => {
                      setAdminConfirmAction({
                        label: `${Number(adminTopUpAmount) > 0 ? '+' : ''}${adminTopUpAmount} пользователю ${adminTopUpUserId}`,
                        action: () => { void adminTopUp(); setAdminConfirmAction(null) }
                      })
                    }} disabled={!adminTopUpUserId || !adminTopUpAmount}>
                      <DollarSign size={16} /> {t.adminCredit}
                    </button>
                  </div>
                )}

                {/* Users */}
                {adminSection === 'users' && !adminDraft && (
                  <div className="admin-section-view">
                    <div className="admin-section-head">
                      <Users size={18} /> {t.adminUsers} ({adminUsers.length})
                    </div>

                    {/* Search */}
                    <div className="admin-search-row">
                      <div className="admin-search-input-wrap">
                        <Hash size={15} />
                        <input
                          value={adminSearchQ}
                          onChange={e => setAdminSearchQ(e.target.value)}
                          placeholder={t.adminSearchPlaceholderFull}
                          onKeyDown={e => { if (e.key === 'Enter') void adminSearchUsers() }}
                        />
                      </div>
                      <button className="primary-btn compact-btn" onClick={() => void adminSearchUsers()} disabled={adminSearching}>
                        <Search size={14} /> {adminSearching ? '...' : t.adminSearch}
                      </button>
                    </div>
                    {adminSearchResults.length > 0 && (
                      <div className="admin-search-results">
                        {adminSearchResults.map(u => (
                          <button key={u.id} className={selectedAdminUserId === u.id ? 'admin-user-card active' : 'admin-user-card'} onClick={() => {
                            setSelectedAdminUserId(u.id)
                            setAdminDraft({ ...u, badgesText: u.badges.join(', ') })
                          }}>
                            <div className="auc-avatar-wrap">
                              {u.avatarUrl
                                ? <img className="auc-avatar-img" src={u.avatarUrl} alt="" />
                                : <span className="auc-avatar-letter">{u.name[0]}</span>}
                              <span className={`auc-online-dot${u.isOnline ? ' online' : ''}`} />
                            </div>
                            <div className="auc-body">
                              <div className="auc-name-row">
                                <strong className="auc-name">{u.name}</strong>
                                <span className={`admin-role-pill ${u.role}`}>{u.role}</span>
                                {u.ban && <span className="admin-ban-pill"><Ban size={9} /></span>}
                              </div>
                              <span className="auc-handle">{u.handle.startsWith('@') ? u.handle : '@' + u.handle}</span>
                              <div className="auc-footer">
                                <span className="auc-lastseen">{u.isOnline ? 'онлайн' : u.lastSeen ? `был(а) ${formatRelativeTime(u.lastSeen, 'ru')} назад` : 'не заходил(а)'}</span>
                                <span className="auc-energy"><Zap size={11} /> {u.powers}</span>
                              </div>
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
                          className={`admin-user-card${selectedAdminUserId === item.id ? ' active' : ''}${item.ban ? ' banned' : ''}`}
                          onClick={() => {
                            setSelectedAdminUserId(item.id)
                            setAdminDraft({
                              ...item,
                              badgesText: item.badges.join(', '),
                            })
                          }}
                        >
                          <div className="auc-avatar-wrap">
                            {item.avatarUrl
                              ? <img className="auc-avatar-img" src={item.avatarUrl} alt="" />
                              : <span className="auc-avatar-letter">{item.name[0]}</span>}
                            <span className={`auc-online-dot${item.isOnline ? ' online' : ''}`} />
                          </div>
                          <div className="auc-body">
                            <div className="auc-name-row">
                              <strong className="auc-name">{item.name}</strong>
                              <span className={`admin-role-pill ${item.role}`}>{item.role}</span>
                              {item.ban && <span className="admin-ban-pill"><Ban size={9} /></span>}
                              {item.status === 'suspended' && <span className="admin-status-pill suspended"><Snowflake size={9} /></span>}
                            </div>
                            <span className="auc-handle">{item.handle.startsWith('@') ? item.handle : '@' + item.handle}</span>
                            <div className="auc-footer">
                              <span className="auc-lastseen">{item.isOnline ? 'онлайн' : item.lastSeen ? `был(а) ${formatRelativeTime(item.lastSeen, 'ru')} назад` : 'не заходил(а)'}</span>
                              <span className="auc-energy"><Zap size={11} /> {item.powers}</span>
                            </div>
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
                      <ArrowLeft size={16} /> {t.adminToList}
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
                          <span className="admin-editor-handle">{adminDraft.handle.startsWith('@') ? adminDraft.handle : '@' + adminDraft.handle}</span>
                        </div>
                        <button className="primary-btn compact-btn admin-editor-save" type="button" onClick={() => {
                          setAdminConfirmAction({
                            label: `${t.adminSaveChanges} ${adminDraft.name}`,
                            action: () => {
                              const form = document.querySelector<HTMLFormElement>('.admin-user-editor')
                              if (form) form.requestSubmit()
                              setAdminConfirmAction(null)
                            }
                          })
                        }} disabled={isSavingAdminUser || (!isDev && !siteSettings.adminPermEditProfiles)}>
                          <Save size={14} /> {isSavingAdminUser ? '...' : (!isDev && !siteSettings.adminPermEditProfiles) ? (lang === 'uz' ? 'Huquq yo\'q' : 'Нет прав') : t.adminSave}
                        </button>
                      </div>

                      <div className="admin-editor-id-row">
                        <span className="admin-editor-id">ID: {adminDraft.id}</span>
                        <button type="button" className="ghost-icon" onClick={() => {
                          void navigator.clipboard.writeText(adminDraft.id)
                          showToast(t.adminIdCopied, 'success')
                        }}><Copy size={12} /></button>
                      </div>

                      {/* Live activity — visible to admins */}
                      <div className="admin-user-live-card">
                        <div className="admin-live-dot-wrap">
                          <span className={`admin-live-dot${adminDraft.isOnline ? ' online' : ''}`} />
                        </div>
                        <div className="admin-live-info">
                          <span className="admin-live-status">{adminDraft.isOnline ? (lang === 'uz' ? 'Onlayn' : 'Онлайн') : (adminDraft.lastSeen ? `${lang === 'uz' ? 'Oxirgi faollik' : 'Был'}: ${formatRelativeTime(adminDraft.lastSeen, lang)}` : (lang === 'uz' ? 'Hech qachon' : 'Никогда'))}</span>
                          {adminDraft.isOnline && adminDraft.currentActivity && (
                            <span className="admin-live-tab">
                              {lang === 'uz' ? 'Hozir: ' : 'Сейчас: '}
                              <strong>{adminDraft.currentActivity}</strong>
                            </span>
                          )}
                        </div>
                        <div className="admin-live-views">
                          <Eye size={12} />
                          <span>{adminDraft.profileViews ?? 0}</span>
                        </div>
                      </div>

                        <div className="field-grid-3">
                          <label className="input-block">
                            <span>{t.adminName}</span>
                            <input value={adminDraft.name} onChange={e => setAdminDraft(c => c ? { ...c, name: e.target.value } : c)} />
                          </label>
                          <label className="input-block">
                            <span>{t.adminHandle}</span>
                            <input value={adminDraft.handle} onChange={e => setAdminDraft(c => c ? { ...c, handle: e.target.value } : c)} />
                          </label>
                          <label className="input-block">
                            <span>{t.adminBalance}</span>
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
                            <span>{t.adminCity}</span>
                            <input value={adminDraft.city || ''} onChange={e => setAdminDraft(c => c ? { ...c, city: e.target.value } : c)} />
                          </label>
                          <label className="input-block">
                            <span>{t.adminCountry}</span>
                            <input value={adminDraft.country || ''} onChange={e => setAdminDraft(c => c ? { ...c, country: e.target.value } : c)} />
                          </label>
                        </div>

                        <div className="field-grid-2">
                          <label className="input-block">
                            <span>{t.adminRole}</span>
                            <select value={adminDraft.role} onChange={e => setAdminDraft(c => c ? { ...c, role: e.target.value as UserRole } : c)}>
                              <option value="user">user</option>
                              <option value="admin">admin</option>
                            </select>
                          </label>
                          <label className="input-block">
                            <span>{t.adminStatus}</span>
                            <select value={adminDraft.status} onChange={e => setAdminDraft(c => c ? { ...c, status: e.target.value as UserStatus } : c)}>
                              <option value="active">active</option>
                              <option value="suspended">suspended</option>
                            </select>
                          </label>
                        </div>

                        <label className="input-block">
                          <span>{t.adminTagline}</span>
                          <input value={adminDraft.tagline} onChange={e => setAdminDraft(c => c ? { ...c, tagline: e.target.value } : c)} />
                        </label>

                        <label className="input-block">
                          <span>{t.adminBio}</span>
                          <textarea value={adminDraft.bio} onChange={e => setAdminDraft(c => c ? { ...c, bio: e.target.value } : c)} />
                        </label>

                        <div className="input-block">
                          <span>{t.adminBadgesLabel}</span>

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
                              {t.adminCatalog}
                            </button>
                            <button type="button" className={`badge-editor-tab${adminBadgeTab === 'custom' ? ' active' : ''}`} onClick={() => setAdminBadgeTab('custom')}>
                              {t.adminCreate}
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
                                    title={active ? `${t.adminRemove} ${def.label}` : `${t.adminAdd} ${def.label}`}
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
                                <BadgeChip id={`CUSTOM|${customBadgeIcon}|${customBadgeLabel || t.adminTextFallback}|${customBadgeCss}`} />
                              </div>
                              <div className="field-grid-2">
                                <label className="input-block compact">
                                  <span>{t.adminIcon}</span>
                                  <input
                                    value={customBadgeIcon}
                                    onChange={e => setCustomBadgeIcon(e.target.value)}
                                    placeholder="◆"
                                    maxLength={4}
                                  />
                                </label>
                                <label className="input-block compact">
                                  <span>{t.adminText}</span>
                                  <input
                                    value={customBadgeLabel}
                                    onChange={e => setCustomBadgeLabel(e.target.value)}
                                    placeholder={t.adminMyBadge}
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
                                  title={t.adminNoAnim}
                                >
                                  <span className="profile-badge-chip badge-default"><span className="badge-icon">—</span><span className="badge-label">{t.adminNoAnim}</span></span>
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
                                <Plus size={14} /> {t.adminAdd}
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="toggle-grid admin-toggle-grid">
                          <button className={adminDraft.isVisible ? 'toggle-card active' : 'toggle-card danger'} type="button" onClick={() => setAdminDraft(c => c ? { ...c, isVisible: !c.isVisible } : c)}>
                            {adminDraft.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                            <span>{t.adminVisibility}</span>
                          </button>
                          <button className={adminDraft.geoAllowed ? 'toggle-card active' : 'toggle-card danger'} type="button" onClick={() => setAdminDraft(c => c ? { ...c, geoAllowed: !c.geoAllowed } : c)}>
                            <MapPin size={16} />
                            <span>{t.adminGeo}</span>
                          </button>
                          <button className={adminDraft.preferences.allowInbox ? 'toggle-card active' : 'toggle-card'} type="button" onClick={() => toggleAdminPref('allowInbox')}>
                            <MessageCircle size={16} />
                            <span>{t.adminInbox}</span>
                          </button>
                          <button className={adminDraft.preferences.showCity ? 'toggle-card active' : 'toggle-card'} type="button" onClick={() => toggleAdminPref('showCity')}>
                            <MapPin size={16} />
                            <span>{t.adminCity}</span>
                          </button>
                          <button className={adminDraft.preferences.neonProfile ? 'toggle-card active' : 'toggle-card'} type="button" onClick={() => toggleAdminPref('neonProfile')}>
                            <Sparkles size={16} />
                            <span>{t.adminNeon}</span>
                          </button>
                          <button className={adminDraft.preferences.emailAlerts ? 'toggle-card active' : 'toggle-card'} type="button" onClick={() => toggleAdminPref('emailAlerts')}>
                            <Bell size={16} />
                            <span>Email alerts</span>
                          </button>
                        </div>

                        {/* Inline ban/freeze controls in editor */}
                        {(isDev || siteSettings.adminPermBan) && (
                        <div className="admin-editor-actions">
                          {adminDraft.ban ? (
                            <button type="button" className="secondary-btn wide" onClick={() => void adminUnban(adminDraft.id)}>
                              <Ban size={14} /> {t.adminRemoveBan} ({adminDraft.ban.type})
                            </button>
                          ) : (
                            <button type="button" className="secondary-btn danger wide" onClick={() => {
                              setBanUserId(adminDraft.id)
                              setAdminSection('bans')
                            }}>
                              <Ban size={14} /> {t.adminBanUser}
                            </button>
                          )}
                          {adminDraft.status === 'suspended' ? (
                            <button type="button" className="secondary-btn wide" onClick={() => void adminFreeze(adminDraft.id, false)}>
                              <Snowflake size={14} /> {t.adminUnfreeze}
                            </button>
                          ) : (
                            <button type="button" className="secondary-btn danger wide" onClick={() => {
                              setAdminConfirmAction({
                                label: `${t.adminFreezeConfirm} ${adminDraft.name}?`,
                                action: () => { void adminFreeze(adminDraft.id, true); setAdminConfirmAction(null) }
                              })
                            }}>
                              <Snowflake size={14} /> {t.adminFreeze}
                            </button>
                          )}
                        </div>
                        )}
                      </form>
                  </div>
                )}

                {/* Badges / Prefixes */}
                {adminSection === 'badges' && (
                  <div className="admin-section-view">
                    <div className="admin-section-head">
                      <BadgeCheck size={18} /> {t.adminBadgeCatalog}
                    </div>
                    <p className="admin-badges-desc">
                      {t.adminBadgeCatalogDesc}
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
                      {t.adminQuickGrant}
                    </div>
                    <div className="admin-quick-badge-form">
                      <label className="input-block">
                        <span>{t.adminUserIdHandle}</span>
                        <input
                          id="quick-badge-user"
                          placeholder="@handle или user ID"
                        />
                      </label>
                      <label className="input-block">
                        <span>{t.adminChooseBadge}</span>
                        <div className="admin-badge-picker">
                          {BADGE_CATALOG.map(def => (
                            <button
                              key={def.id}
                              type="button"
                              className="admin-badge-pick-btn"
                              title={def.label}
                              onClick={() => {
                                const userInput = (document.getElementById('quick-badge-user') as HTMLInputElement)?.value?.trim()
                                if (!userInput) { showToast(t.adminEnterIdHandle, 'error'); return }
                                // Find user from list
                                const found = adminUsers.find(u =>
                                  u.id === userInput || u.handle === userInput || u.handle === '@' + userInput
                                )
                                if (!found) { showToast(t.adminUserNotFound, 'error'); return }
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
                                  showToast(has ? `${t.adminBadgeRemoved}: ${def.label}` : `${t.adminBadgeAdded}: ${def.label}`, 'info')
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
                      <Ban size={18} /> {t.adminReportsTitle}
                      <button className="secondary-btn compact-btn" style={{marginLeft:'auto'}} onClick={() => void loadAdminReports()}>
                        <RefreshCw size={14} />
                      </button>
                    </div>

                    {/* Filter tabs */}
                    <div className="report-filter-tabs">
                      {(['all', 'open', 'resolved', 'dismissed'] as const).map(f => (
                        <button key={f} className={`report-filter-tab ${f === 'all' ? 'active' : ''}`}
                          onClick={e => {
                            e.currentTarget.parentElement?.querySelectorAll('.report-filter-tab').forEach(b => b.classList.remove('active'))
                            e.currentTarget.classList.add('active')
                            e.currentTarget.parentElement?.parentElement?.querySelectorAll('.report-card').forEach(c => {
                              const el = c as HTMLElement
                              if (f === 'all') { el.style.display = '' }
                              else { el.style.display = el.classList.contains(`status-${f}`) ? '' : 'none' }
                            })
                          }}>
                          {f === 'all' ? t.adminFilterAll : f === 'open' ? t.adminFilterOpen : f === 'resolved' ? t.adminFilterResolved : t.adminFilterDismissed}
                          <span className="report-filter-count">
                            {f === 'all' ? reports.length : reports.filter(r => r.status === f).length}
                          </span>
                        </button>
                      ))}
                    </div>

                    {reports.length === 0 ? (
                      <div className="chats-empty" style={{ padding: '20px' }}>
                        <p>{t.adminNoReports}</p>
                        <span>{t.adminNoReportsHint}</span>
                      </div>
                    ) : (
                      <div className="reports-list">
                        {reports.map(report => (
                          <article key={report.id} className={`report-card status-${report.status}`}>
                            <div className="report-card-header">
                              <div className="report-card-target" style={report.targetUserId ? {cursor:'pointer'} : {}} onClick={report.targetUserId ? () => void openUserProfile(report.targetUserId!) : undefined}>
                                <div className="report-card-avatar">{report.targetUserName?.[0]?.toUpperCase() || '?'}</div>
                                <div className="report-card-info">
                                  <strong>{report.targetUserName}</strong>
                                  <span>{report.targetUserHandle}</span>
                                </div>
                              </div>
                              <div className="report-card-badges">
                                {report.priority && report.priority !== 'medium' && (
                                  <span className={`report-priority-badge ${report.priority}`}>
                                    {report.priority === 'low' ? t.adminPriorityLow : report.priority === 'high' ? t.adminPriorityHigh : report.priority === 'critical' ? t.adminPriorityCritical : t.adminPriorityMedium}
                                  </span>
                                )}
                                <span className={`report-status-pill ${report.status}`}>
                                  {report.status === 'open' ? t.adminStatusOpen : report.status === 'resolved' ? t.adminStatusResolved : t.adminStatusDismissed}
                                </span>
                              </div>
                            </div>

                            <div className="report-card-category">
                              <span className="report-cat-label">{report.category}</span>
                              <span className="report-card-date">{frt(report.createdAt)}</span>
                            </div>

                            {report.text && <p className="report-card-text">{report.text}</p>}

                            {report.contact && (
                              <div className="report-card-contact">
                                <small>{t.adminContact}</small> {report.contact}
                              </div>
                            )}

                            <div className="report-card-reporter">
                              <small>{t.adminSentBy}</small> {report.reporterName} ({report.reporterHandle})
                            </div>

                            {report.resolvedByName && (
                              <div className="report-card-resolver">
                                <small>{t.adminResolvedBy}</small> {report.resolvedByName}
                              </div>
                            )}

                            {report.relatedPosts && report.relatedPosts.length > 0 && (
                              <div className="report-related-posts">
                                <small className="report-posts-label">{t.adminRelatedPosts}</small>
                                {report.relatedPosts.map(post => (
                                  <div key={post.id} className="report-related-post">
                                    <div className="report-related-post-body">
                                      <strong>{frt(post.createdAt)}</strong>
                                      <p>{post.text}</p>
                                    </div>
                                    <button className="secondary-btn compact-btn danger" onClick={() => void adminDeletePost(post.id)}>
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {report.status === 'open' && (
                              <div className="report-card-actions">
                                {report.targetUserId && (
                                  <button className="secondary-btn compact-btn" onClick={() => void openUserProfile(report.targetUserId!)}>
                                    <User size={14} /> {t.adminProfile}
                                  </button>
                                )}
                                <button className="primary-btn compact-btn" onClick={() => void updateReportStatus(report.id, 'resolved')}>
                                  <BadgeCheck size={14} /> {t.adminResolved}
                                </button>
                                <button className="secondary-btn compact-btn danger" onClick={() => void updateReportStatus(report.id, 'dismissed')}>
                                  <X size={14} /> {t.adminDismiss}
                                </button>
                              </div>
                            )}
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Support Tickets */}
                {adminSection === 'support' && (
                  <div className="admin-section-view">
                    <div className="admin-section-head">
                      <MessageCircle size={18} /> {t.adminSupportTitle}
                      <button className="secondary-btn compact-btn" style={{marginLeft:'auto'}} onClick={() => void loadSupportTickets()}>
                        <RefreshCw size={14} />
                      </button>
                    </div>

                    {supportLoading ? (
                      <div className="chats-empty" style={{ padding: '20px' }}><p>{t.adminLoadingDots}</p></div>
                    ) : supportTickets.length === 0 ? (
                      <div className="chats-empty" style={{ padding: '20px' }}>
                        <p>{t.adminNoTickets}</p>
                        <span>{t.adminNoTicketsHint}</span>
                      </div>
                    ) : (
                      <div className="support-tickets-list">
                        {supportTickets.map(ticket => (
                          <div key={ticket.conversationId} className="support-ticket-card">
                            <div className="support-ticket-header" onClick={() => setSupportActiveTicket(supportActiveTicket === ticket.conversationId ? null : ticket.conversationId)}>
                              <div className="support-ticket-user">
                                {ticket.userAvatar ? (
                                  <img src={ticket.userAvatar} alt="" className="support-ticket-avatar" />
                                ) : (
                                  <div className="support-ticket-avatar-fallback">{ticket.userName?.[0]?.toUpperCase() || '?'}</div>
                                )}
                                <div className="support-ticket-info">
                                  <strong>{ticket.userName}</strong>
                                  <span>{ticket.userHandle}</span>
                                </div>
                              </div>
                              <div className="support-ticket-meta">
                                <span>{frt(ticket.lastMessageAt)}</span>
                                <ChevronDown size={16} style={{ transform: supportActiveTicket === ticket.conversationId ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                              </div>
                            </div>

                            {supportActiveTicket === ticket.conversationId && (
                              <div className="support-ticket-body">
                                <div className="support-ticket-messages">
                                  {ticket.messages.map(msg => (
                                    <div key={msg.id} className={`support-msg ${msg.senderId === 'seed-regellik' ? 'admin-msg' : 'user-msg'}`}>
                                      <p>{msg.text}</p>
                                      <small>{frt(msg.createdAt)}</small>
                                    </div>
                                  ))}
                                </div>
                                <div className="support-reply-bar">
                                  <input
                                    value={supportReplyText}
                                    onChange={e => setSupportReplyText(e.target.value)}
                                    placeholder={t.adminReplyPlaceholder}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void replySupportTicket(ticket.conversationId) } }}
                                  />
                                  <button
                                    className="primary-btn compact-btn"
                                    disabled={!supportReplyText.trim() || supportReplying}
                                    onClick={() => void replySupportTicket(ticket.conversationId)}
                                  >
                                    <Send size={14} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Bans */}
                {adminSection === 'bans' && (
                  <div className="admin-section-view">
                    <div className="admin-section-head">
                      <Ban size={18} /> {t.adminBanManage}
                    </div>

                    {/* Issue ban form */}
                    <div className="admin-ban-form">
                      <label className="input-block">
                        <span>User ID</span>
                        <input value={banUserId} onChange={e => setBanUserId(e.target.value)} placeholder="id пользователя" />
                      </label>
                      <div className="field-grid-2">
                        <label className="input-block">
                          <span>{t.adminBanType}</span>
                          <select value={banType} onChange={e => setBanType(e.target.value as BanType)}>
                            <option value="global">{t.adminBanGlobal}</option>
                            <option value="chat">{t.adminBanChat}</option>
                          </select>
                        </label>
                        <label className="input-block">
                          <span>{t.adminBanDuration}</span>
                          <input type="number" min="0" value={banDuration} onChange={e => setBanDuration(e.target.value)} placeholder={t.adminEmptyForeverHint} />
                        </label>
                      </div>
                      <label className="input-block">
                        <span>{t.adminReason}</span>
                        <input value={banReason} onChange={e => setBanReason(e.target.value)} placeholder={t.adminBanReason} />
                      </label>
                      <div className="admin-ban-presets">
                        <button type="button" className="secondary-btn compact-btn" onClick={() => setBanDuration('30')}><Timer size={12} /> 30 {t.adminMin}</button>
                        <button type="button" className="secondary-btn compact-btn" onClick={() => setBanDuration('60')}><Timer size={12} /> 1 {t.adminHour}</button>
                        <button type="button" className="secondary-btn compact-btn" onClick={() => setBanDuration('1440')}><Timer size={12} /> 1 {t.adminDay}</button>
                        <button type="button" className="secondary-btn compact-btn" onClick={() => setBanDuration('10080')}><Timer size={12} /> 7 {t.adminDays}</button>
                        <button type="button" className="secondary-btn compact-btn danger" onClick={() => setBanDuration('')}><Ban size={12} /> {t.adminForever}</button>
                      </div>
                      <button className="primary-btn wide" onClick={() => {
                        setAdminConfirmAction({
                          label: `${t.adminBanConfirm} ${banUserId} (${banType}, ${banDuration ? banDuration + ` ${t.adminMin}` : t.adminForever})`,
                          action: () => { void adminBan(); setAdminConfirmAction(null) }
                        })
                      }} disabled={!banUserId || isBanning}>
                        <Ban size={16} /> {isBanning ? t.adminBanning : t.adminBanIssue}
                      </button>
                    </div>

                    {/* Active bans list */}
                    <div className="admin-bans-list">
                      <div className="admin-section-subhead" style={{marginTop: 12}}>
                        {t.adminActiveBans}
                      </div>
                      {adminUsers.filter(u => u.ban).length === 0 && (
                        <div className="chats-empty" style={{padding: '16px'}}><p>{t.adminNoActiveBans}</p></div>
                      )}
                      {adminUsers.filter(u => u.ban).map(u => (
                        <div key={u.id} className="admin-ban-item">
                          <div className="admin-ban-info">
                            <strong>{u.name}</strong>
                            <span className="admin-ban-handle">{u.handle}</span>
                            <span className={`admin-ban-type ${u.ban!.type}`}>{u.ban!.type === 'global' ? `◉ ${t.adminGlobalBan}` : `◎ ${t.adminChatBan}`}</span>
                            <span className="admin-ban-reason">{u.ban!.reason}</span>
                            {u.ban!.until && <span className="admin-ban-until"><Timer size={11} /> до {new Date(u.ban!.until).toLocaleString('ru')}</span>}
                          </div>
                          <button className="secondary-btn compact-btn" onClick={() => void adminUnban(u.id)}>{t.adminUnban}</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audit log */}
                {adminSection === 'audit' && (
                  <div className="admin-section-view">
                    <div className="admin-section-head">
                      <Search size={18} /> {t.adminAuditTitle}
                    </div>
                    <div className="audit-list">
                      {auditLog.slice(0, 50).map(item => (
                        <div key={item.id} className="audit-item">
                          <strong>{item.action}</strong>
                          <span>{item.details}</span>
                          <small>{frt(item.createdAt)}</small>
                        </div>
                      ))}
                      {auditLog.length === 0 && <div className="chats-empty" style={{padding: '20px'}}><p>{t.adminAuditEmpty}</p></div>}
                    </div>
                  </div>
                )}

                {/* Broadcast */}
                {adminSection === 'broadcast' && (
                  <div className="admin-section-view">
                    <div className="admin-section-head">
                      <Send size={18} /> {t.adminBroadcastTitle}
                    </div>

                    <div className="broadcast-mode-tabs">
                      <button className={broadcastMode === 'all' ? 'broadcast-mode-tab active' : 'broadcast-mode-tab'} onClick={() => setBroadcastMode('all')}>{t.adminBroadcastAll}</button>
                      <button className={broadcastMode === 'selected' ? 'broadcast-mode-tab active' : 'broadcast-mode-tab'} onClick={() => setBroadcastMode('selected')}>{t.adminBroadcastSelected}</button>
                    </div>

                    {broadcastMode === 'selected' && (
                      <div className="broadcast-select-block">
                        <div className="broadcast-search-row">
                          <Search size={14} />
                          <input
                            value={broadcastSearchQ}
                            onChange={e => setBroadcastSearchQ(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void searchBroadcastUsers() } }}
                            placeholder={t.adminSearchPlaceholder}
                          />
                          <button className="secondary-btn compact-btn" onClick={() => void searchBroadcastUsers()} disabled={broadcastSearching}>
                            {broadcastSearching ? '...' : t.adminSearch}
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
                            <span className="broadcast-selected-label">{t.adminBroadcastSelectedCount}: {broadcastSelectedUsers.length}</span>
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
                        ? t.adminBroadcastDescAll
                        : `${t.adminBroadcastDescSel} (${broadcastSelectedUsers.length})`}
                    </p>
                    <div className="broadcast-input-row">
                      <textarea
                        className="broadcast-input"
                        value={broadcastText}
                        onChange={e => setBroadcastText(e.target.value)}
                        placeholder={t.adminBroadcastPlaceholder}
                        rows={2}
                      />
                      <button className="primary-btn compact-btn" onClick={() => void sendBroadcast()} disabled={isBroadcasting || !broadcastText.trim()}>
                        <Send size={14} /> {isBroadcasting ? '...' : t.adminBroadcastSend}
                      </button>
                    </div>
                  </div>
                )}

                {/* DEV — only for developer */}
                {adminSection === 'dev' && isDev && (
                  <div className="admin-section-view dev-section-view">
                    <div className="dev-section-head">
                      <div className="dev-section-title-wrap">
                        <Monitor size={20} />
                        <div>
                          <h2>DEV Console</h2>
                          <span>{lang === 'uz' ? 'Chuqur sozlamalar' : 'Глубокие настройки проекта'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Maintenance block */}
                    <div className="dev-card">
                      <div className="dev-card-head">
                        <Settings2 size={15} />
                        <strong>{lang === 'uz' ? 'Texnik ishlar' : 'Технические работы'}</strong>
                        <button
                          className={`dev-toggle-pill${siteSettings.maintenanceMode ? ' active danger' : ''}`}
                          onClick={() => {
                            const next = !siteSettings.maintenanceMode
                            setSiteSettings(s => ({ ...s, maintenanceMode: next }))
                            void apiRequest('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings: { ...siteSettings, maintenanceMode: next } }) }, sessionToken!)
                              .then(() => showToast(next ? (lang === 'uz' ? 'Texnik ishlar yoqildi' : 'Режим тех. работ включён') : (lang === 'uz' ? 'O\'chirildi' : 'Режим выключен'), next ? 'error' : 'success'))
                          }}
                        >
                          {siteSettings.maintenanceMode ? (lang === 'uz' ? 'YOQILGAN' : 'ВКЛЮЧЁН') : (lang === 'uz' ? 'O\'chiq' : 'Выкл')}
                        </button>
                      </div>
                      <label className="input-block compact">
                        <span>{lang === 'uz' ? 'Sarlavha' : 'Заголовок'}</span>
                        <input
                          value={siteSettings.maintenanceTitle ?? ''}
                          onChange={e => setSiteSettings(s => ({ ...s, maintenanceTitle: e.target.value }))}
                          placeholder="Технические работы"
                        />
                      </label>
                      <label className="input-block compact">
                        <span>{lang === 'uz' ? 'Xabar' : 'Сообщение'}</span>
                        <textarea
                          rows={2}
                          value={siteSettings.maintenanceMessage ?? ''}
                          onChange={e => setSiteSettings(s => ({ ...s, maintenanceMessage: e.target.value }))}
                          placeholder="Сервер временно недоступен. Скоро вернёмся!"
                          style={{ resize: 'none', fontFamily: 'inherit', fontSize: '13px' }}
                        />
                      </label>
                      <button className="primary-btn compact-btn" style={{ alignSelf: 'flex-start' }} onClick={() => {
                        void apiRequest('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings: siteSettings }) }, sessionToken!)
                          .then(() => showToast(lang === 'uz' ? 'Saqlandi' : 'Сохранено', 'success'))
                      }}>
                        <Save size={13} /> {lang === 'uz' ? 'Saqlash' : 'Сохранить'}
                      </button>
                    </div>

                    {/* Toggles */}
                    <div className="dev-card">
                      <div className="dev-card-head">
                        <Zap size={15} />
                        <strong>{lang === 'uz' ? 'Tezkor tugmalar' : 'Быстрые тумблеры'}</strong>
                      </div>
                      <div className="dev-toggle-grid">
                        {([
                          { key: 'telegramAuthEnabled' as const, label: 'TG Auth' },
                          { key: 'emailAuthEnabled' as const, label: 'Email Auth' },
                          { key: 'registrationsOpen' as const, label: lang === 'uz' ? 'Reg.' : 'Рег-ция' },
                          { key: 'geoRequiredForSend' as const, label: 'Geo Req' },
                          { key: 'onlineCounterVisible' as const, label: 'Online' },
                          { key: 'publicFeedVisible' as const, label: 'Feed' },
                          { key: 'inboxEnabled' as const, label: 'Inbox' },
                          { key: 'devBadgeVisible' as const, label: 'DEV badge' },
                          { key: 'profileEditEnabled' as const, label: lang === 'uz' ? 'Tahrir' : 'Редакт.' },
                        ] as const).map(item => (
                          <button
                            key={item.key}
                            className={`dev-toggle-chip${siteSettings[item.key] ? ' active' : ''}`}
                            onClick={() => {
                              const next = !siteSettings[item.key]
                              const updated = { ...siteSettings, [item.key]: next }
                              setSiteSettings(updated)
                              void apiRequest('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings: updated }) }, sessionToken!)
                                .then(() => showToast('OK', 'success'))
                            }}
                          >
                            <span className="dev-chip-dot" />
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Admin permissions */}
                    <div className="dev-card">
                      <div className="dev-card-head">
                        <ShieldCheck size={15} />
                        <strong>{lang === 'uz' ? 'Admin huquqlari' : 'Права администраторов'}</strong>
                      </div>
                      <div className="dev-toggle-grid">
                        {([
                          { key: 'adminPermBan' as const, label: lang === 'uz' ? 'Ban / Freeze' : 'Бан / Фриз' },
                          { key: 'adminPermGrantRoles' as const, label: lang === 'uz' ? 'Rol berish' : 'Выдавать роли' },
                          { key: 'adminPermTopUp' as const, label: lang === 'uz' ? 'Balans' : 'Баланс' },
                          { key: 'adminPermEditProfiles' as const, label: lang === 'uz' ? 'Profilni tahrirlash' : 'Редакт. профили' },
                        ] as const).map(item => (
                          <button
                            key={item.key}
                            className={`dev-toggle-chip${siteSettings[item.key] ? ' active' : ''}`}
                            onClick={() => {
                              const next = !siteSettings[item.key]
                              const updated = { ...siteSettings, [item.key]: next }
                              setSiteSettings(updated)
                              void apiRequest('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings: updated }) }, sessionToken!)
                                .then(() => showToast('OK', 'success'))
                            }}
                          >
                            <span className="dev-chip-dot" />
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Online users activity */}
                    <div className="dev-card">
                      <div className="dev-card-head">
                        <Users size={15} />
                        <strong>{lang === 'uz' ? 'Hozir onlayn' : 'Сейчас онлайн'} — {onlineCount}</strong>
                        <button
                          className="dev-toggle-chip"
                          style={{ marginLeft: 'auto', fontSize: '11px', padding: '3px 8px' }}
                          onClick={() => void loadDevOnlineUsers()}
                        >↻ {lang === 'uz' ? 'Yangilash' : 'Обновить'}</button>
                      </div>
                      <div className="dev-activity-list">
                        {onlineUsersForDev.length === 0 && (
                          <span className="dev-empty">{lang === 'uz' ? 'Hech kim yo\'q' : 'Никого нет'}</span>
                        )}
                        {onlineUsersForDev.map(u => (
                          <div key={u.id} className="dev-activity-row">
                            <div className="dev-act-avatar">
                              {u.avatarUrl ? <img src={u.avatarUrl} alt="" /> : <span>{u.name[0]}</span>}
                              <span className="dev-act-dot" />
                            </div>
                            <div className="dev-act-info">
                              <span className="dev-act-name">{u.name}</span>
                              <span className="dev-act-tab">{u.currentActivity ?? '—'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
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
                        <h3>{t.adminConfirmTitle}</h3>
                        <p>{adminConfirmAction.label}</p>
                        <div className="admin-confirm-btns">
                          <button className="secondary-btn" onClick={() => setAdminConfirmAction(null)}>{t.cancel}</button>
                          <button className="primary-btn" onClick={adminConfirmAction.action}>{t.adminConfirmBtn}</button>
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
                      {viewedProfile.user.badges?.includes('VERIFIED') && <span className="verified-check"><BadgeCheck size={14} /></span>}
                    </div>
                    <span className="cpf-handle">{viewedProfile.user.handle}</span>
                    {viewedProfile.user.tagline && <span className="cpf-tagline">{viewedProfile.user.tagline}</span>}
                    <div className="cpf-stats-row">
                      <span><strong>{viewedProfile.user.postCount}</strong> {t.profilePostsCount}</span>
                      <span><strong>{viewedProfile.user.followerCount}</strong> {t.profileFollowersCount}</span>
                      <span><strong>{viewedProfile.user.followingCount}</strong> {t.profileFollowingCount}</span>
                    </div>
                  </div>
                </div>

                {viewedProfile.user.bio && <p className="cpf-bio">{viewedProfile.user.bio}</p>}

                {/* Actions row */}
                {viewer?.id !== viewedProfile.user.id && (
                  <div className="cpf-actions">
                    <button className="cpf-btn primary" onClick={() => void toggleFollowViewedProfile()} disabled={isProfileActionLoading}>
                      <Users size={14} /> {isProfileActionLoading ? '...' : viewedProfile.isFollowing ? t.profileUnfollow : t.profileFollow}
                    </button>
                    <button className="cpf-btn" onClick={() => {
                      setViewedProfile(null)
                      setActiveTab('chats')
                      void startConversation(viewedProfile.user.id)
                    }}>
                      <MessageCircle size={14} /> {t.profileMessage}
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
                    <div className="profile-posts-empty compact"><p>{t.profileNoPosts}</p></div>
                  ) : (
                    <div className="threads-feed profile-threads-feed">
                      {viewedProfile.posts.map(post => (
                        <article key={post.id} className="thr-post">
                          <div className="thr-left">
                            <div className="thr-avatar">
                              {viewedProfile.user.avatarUrl
                                ? <img src={viewedProfile.user.avatarUrl} alt="" />
                                : <span>{(viewedProfile.user.name || '?')[0]}</span>
                              }
                            </div>
                            <div className="thr-line" />
                          </div>
                          <div className="thr-right">
                            <div className="thr-header">
                              <strong className="thr-author">{viewedProfile.user.name}</strong>
                              <span className="thr-time">{frt(post.createdAt)}</span>
                            </div>
                            {post.text && <p className="thr-text">{post.text}</p>}
                            {(post.imageUrls?.length || post.imageUrl) && (
                              <div className={`thr-images${(post.imageUrls?.length || 0) > 1 ? ' multi' : ''}`}>
                                {(post.imageUrls?.length ? post.imageUrls : [post.imageUrl]).filter(Boolean).map((img, i) => (
                                  <img key={i} src={img!} alt="" className="thr-img" onClick={() => openImageLightbox((post.imageUrls?.length ? post.imageUrls : [post.imageUrl]).filter(Boolean) as string[], i)} />
                                ))}
                              </div>
                            )}
                            <div className="thr-actions">
                              <button
                                className={`thr-action-btn${post.boostedByViewer ? ' active energy' : ''}`}
                                onClick={() => void boostPost(post.id)}
                              >
                                <Zap size={18} fill={post.boostedByViewer ? 'currentColor' : 'none'} />
                                {post.boosts > 0 && <span>{post.boosts}</span>}
                              </button>
                              <button
                                className={`thr-action-btn${expandedPostComments.has(post.id) ? ' active' : ''}`}
                                onClick={() => togglePostComments(post.id)}
                              >
                                <MessageSquare size={18} />
                                {(post.commentsCount || post.comments.length) > 0 && <span>{post.commentsCount || post.comments.length}</span>}
                              </button>
                              <button className={`thr-action-btn${post.repostedByViewer ? ' active repost' : ''}${post.authorId === viewer?.id ? ' disabled' : ''}`} onClick={() => post.authorId !== viewer?.id && void repostPost(post.id)}>
                                <RefreshCw size={17} />
                                {(post.reposts || 0) > 0 && <span>{post.reposts}</span>}
                              </button>
                              <button className="thr-action-btn" onClick={() => { void navigator.clipboard?.writeText(`${window.location.origin}?post=${post.id}`); showToast(t.linkCopied || 'Link copied', 'success') }}>
                                <Send size={17} />
                              </button>
                            </div>
                            {(expandedPostComments.has(post.id) || closingCommentPosts.has(post.id)) && (
                              <div className={`thr-comments${closingCommentPosts.has(post.id) ? ' closing' : ''}`}>
                                {post.comments.map(cmt => (
                                  <div key={cmt.id} className="thr-comment">
                                    <div className="thr-comment-head">
                                      <strong className="clickable-author" onClick={() => void openUserProfile(cmt.authorId)}>{cmt.authorName}</strong>
                                      <span>{cmt.authorHandle}</span>
                                      <small>{frt(cmt.createdAt)}</small>
                                    </div>
                                    <p>{cmt.text}</p>
                                  </div>
                                ))}
                                <div className="thr-comment-input">
                                  <input
                                    value={commentTexts[post.id] || ''}
                                    onChange={e => setCommentTexts(prev => ({...prev, [post.id]: e.target.value}))}
                                    placeholder={t.commentPlaceholder}
                                    maxLength={300}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void addComment(post.id) } }}
                                  />
                                  <button className="thr-comment-send" onClick={() => void addComment(post.id)} disabled={!commentTexts[post.id]?.trim()}>
                                    <Send size={14} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )
                )}

                {profileViewTab === 'info' && (
                  <div className="cpf-info-grid">
                    {viewedProfile.user.city && <div className="cpf-info-row"><MapPin size={13}/><span>{viewedProfile.user.city}</span></div>}
                    <div className="cpf-info-row"><Zap size={13}/><span>{viewedProfile.user.powers ?? 0} {t.profileEnergyInfo}</span></div>
                    <div className="cpf-info-row"><Eye size={13}/><span>{viewedProfile.user.profileViews || 0} {t.profileViews}</span></div>
                    <div className="cpf-info-row"><User size={13}/><span>{t.profileSince} {formatDate(viewedProfile.user.joinedAt)}</span></div>
                    {viewedProfile.user.bio && <div className="cpf-info-row bio"><span>{viewedProfile.user.bio}</span></div>}
                  </div>
                )}
              </article>
            </section>
          </main>
        </>
      )}

      {/* Post publish confirmation */}
      {postConfirmOpen && (
        <div className="center-modal-wrap">
          <div className="center-modal-backdrop" onClick={() => setPostConfirmOpen(false)} />
          <div className="center-modal-box" style={{maxWidth: 340, textAlign: 'center'}}>
            <p style={{fontSize: 15, margin: '8px 0 18px', color: 'var(--text)'}}>
              {t.postConfirmQuestion}
            </p>
            <div className="center-modal-actions" style={{justifyContent: 'center'}}>
              <button className="secondary-btn" onClick={() => setPostConfirmOpen(false)}>{t.postConfirmNo || "Yo'q"}</button>
              <button className="primary-btn" onClick={() => { setPostConfirmOpen(false); void createPost() }}>{t.postConfirmYes || 'Ha'}</button>
            </div>
          </div>
        </div>
      )}

      {/* New post compose sheet */}
      {newPostSheetOpen && viewer && (
        <div className="compose-sheet-layer">
          <div className="compose-sheet-backdrop" onClick={() => { if (!isCreatingPost) { setNewPostSheetOpen(false); setNewPostText(''); setNewPostImages([]) } }} />
          <div className="compose-sheet">
            <div className="compose-sheet-handle" />
            <div className="compose-sheet-head">
              <span>{lang === 'uz' ? 'Nashr qo\'shish' : 'Новая публикация'}</span>
              <button className="sheet-close-btn" onClick={() => { setNewPostSheetOpen(false); setNewPostText(''); setNewPostImages([]) }}><X size={18} /></button>
            </div>

            {/* Photo upload area */}
            {newPostImages.length === 0 ? (
              <label className="compose-photo-drop">
                <Camera size={32} />
                <strong>{lang === 'uz' ? 'Fotosurat yuklash' : 'Загрузить фото'}</strong>
                <span>{lang === 'uz' ? 'PNG, JPG, WEBP — maks. 768 KB' : 'PNG, JPG, WEBP — макс. 768 КБ'}</span>
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handlePostImageUpload} hidden />
              </label>
            ) : (
              <div className="compose-photo-preview">
                <img src={newPostImages[0]} alt="" />
                <button className="compose-photo-remove" onClick={() => setNewPostImages([])}><X size={16} /></button>
              </div>
            )}

            {/* Caption */}
            <textarea
              className="compose-caption-input"
              value={newPostText}
              onChange={e => setNewPostText(e.target.value)}
              placeholder={lang === 'uz' ? 'Tavsif yozing...' : 'Добавьте описание...'}
              rows={4}
              maxLength={500}
            />
            <span className={newPostText.length > 450 ? 'compose-char-count warn' : 'compose-char-count'}>
              {newPostText.length}/500
            </span>

            <button
              className="primary-btn compose-publish-btn"
              onClick={() => {
                if (!viewer) return
                if (viewer.powers < 25) { showToast(t.postNotEnoughEnergyShort, 'error'); return }
                if (!newPostImages.length) { showToast(lang === 'uz' ? 'Fotosurat tanlang' : 'Выберите фото', 'error'); return }
                void createPost()
              }}
              disabled={isCreatingPost || !newPostImages.length}
            >
              {isCreatingPost ? '...' : <><Send size={15} /> {lang === 'uz' ? 'Nashr qilish' : 'Опубликовать'}</>}
            </button>
          </div>
        </div>
      )}

      {reportProfileOpen && (
        <div className={`center-modal-wrap${closingModal === 'report' ? ' closing' : ''}`}>
          <div className="center-modal-backdrop" onClick={() => closeModalAnimated('report', () => setReportProfileOpen(false))} />
          <div className="center-modal-box report-center-box">
            <div className="center-modal-glow report-glow" />
            <div className="report-modal-header">
              <div className="report-modal-icon-wrap">
                <img src="/tg-icons/warning.webp" className="tg-icon-lg" alt="" />
              </div>
              <div>
                <h2>{t.reportTitle}</h2>
                <p className="report-modal-target">
                  {viewedProfile
                    ? <>{viewedProfile.user.name} <span>{viewedProfile.user.handle}</span></>
                    : <>{t.reportGeneralTarget}</>
                  }
                </p>
              </div>
              <button className="center-modal-close" onClick={() => closeModalAnimated('report', () => setReportProfileOpen(false))}><X size={18} /></button>
            </div>

            {viewedProfile && viewedProfile.posts.length > 0 && (
              <label className="input-block">
                <span className="report-label">{t.reportTarget}</span>
                <select className="report-select" value={reportPostId} onChange={(e) => setReportPostId(e.target.value)}>
                  <option value="">{t.reportFullProfile}</option>
                  {viewedProfile.posts.map((post) => (
                    <option key={post.id} value={post.id}>
                      {post.text.slice(0, 72) || t.publication}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="report-label">{t.reportTarget}</div>
            <div className="report-reasons-grid-v2">
              {[
                { id: 'spam', icon: '/tg-icons/megaphone.webp', label: t.reportSpam },
                { id: 'fake', icon: '/tg-icons/alert.webp', label: t.reportFake },
                { id: 'abuse', icon: '/tg-icons/fire.webp', label: t.reportAbuse },
                { id: 'adult', icon: '/tg-icons/lock.webp', label: t.reportAdult },
                { id: 'fraud', icon: '/tg-icons/close.webp', label: t.reportFraud },
                { id: 'custom', icon: '/tg-icons/doc.webp', label: t.reportCustom },
              ].map(r => (
                <button
                  key={r.id}
                  className={reportReason === r.label ? 'report-reason-btn-v2 active' : 'report-reason-btn-v2'}
                  onClick={() => setReportReason(r.label)}
                >
                  <img src={r.icon} className="tg-icon-cat" alt="" />
                  <span>{r.label}</span>
                </button>
              ))}
            </div>

            <label className="input-block">
              <span className="report-label">{t.reportComment}</span>
              <textarea
                className="report-textarea"
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder={reportReason === t.reportCustom ? t.reportDetailHint : t.reportDetailOptional}
                maxLength={500}
                rows={3}
              />
            </label>

            <label className="input-block">
              <span className="report-label">{t.reportContactInfo}</span>
              <input
                className="report-contact-input"
                value={reportContact}
                onChange={(e) => setReportContact(e.target.value)}
                placeholder={t.reportContactHint}
                maxLength={100}
              />
            </label>

            <label className="input-block">
              <span className="report-label">{t.reportPhoto || 'Skrinshot'}</span>
              <div className="report-photo-upload">
                {reportImage ? (
                  <div className="report-photo-preview">
                    <img src={reportImage} alt="" />
                    <button className="report-photo-remove" onClick={() => setReportImage(null)}><X size={10} /></button>
                  </div>
                ) : (
                  <label className="report-photo-btn">
                    <Camera size={14} />
                    <span>{t.reportAttachPhoto || 'Fayl biriktirish'}</span>
                    <input type="file" accept="image/*" hidden onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      if (file.size > 512 * 1024) { showToast('Max 512KB', 'error'); return }
                      const reader = new FileReader()
                      reader.onload = () => setReportImage(reader.result as string)
                      reader.readAsDataURL(file)
                      e.target.value = ''
                    }} />
                  </label>
                )}
              </div>
            </label>

            <div className="center-modal-actions">
              <button className="secondary-btn" onClick={() => closeModalAnimated('report', () => setReportProfileOpen(false))}>{t.cancel}</button>
              <button className="primary-btn report-send-btn" onClick={() => void submitProfileReport()} disabled={isSubmittingReport}>
                <Send size={14} /> {isSubmittingReport ? '...' : t.reportSendBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === SUPPORT 24/7 MODAL === */}
      {supportOpen && (
        <div className={`center-modal-wrap${closingModal === 'support' ? ' closing' : ''}`}>
          <div className="center-modal-backdrop" onClick={() => { if (!isSendingSupport) closeModalAnimated('support', () => { setSupportOpen(false); setSupportSent(false); setSupportMessage('') }) }} />
          <div className="center-modal-box support-center-box">
            <div className="center-modal-glow support-glow" />
            {supportSent ? (
              <div className="support-sent-state">
                <div className="support-sent-anim">
                  <div className="support-sent-ring" />
                  <div className="support-sent-ring r2" />
                  <img src="/tg-icons/check.webp" className="tg-icon-lg" alt="" />
                </div>
                <h3>{t.supportSentTitle}</h3>
                <p>{t.supportSentDesc}</p>
                <button className="primary-btn" onClick={() => {
                  closeModalAnimated('support', () => {
                    setSupportOpen(false)
                    setSupportSent(false)
                    setSupportMessage('')
                    setActiveTab('chats')
                  })
                }}>
                  {t.supportGoChat}
                </button>
              </div>
            ) : (
              <>
                <div className="support-modal-header">
                  <div className="support-modal-brand">
                    <div className="support-brand-icon"><img src="/tg-icons/shield.webp" className="tg-icon-lg" alt="" /></div>
                    <div>
                      <h2>{t.supportTitle}</h2>
                      <span className="support-online-badge"><span className="online-dot" />{t.supportSubtitle}</span>
                    </div>
                  </div>
                  <button className="center-modal-close" onClick={() => closeModalAnimated('support', () => { setSupportOpen(false); setSupportMessage('') })}><X size={20} /></button>
                </div>

                <div className="support-response-hint">
                  <img src="/tg-icons/clock.webp" className="tg-icon-sm" alt="" />
                  <span>{t.supportResponse}</span>
                </div>

                <div className="support-form-body">
                  <label className="support-label">{t.supportCategory}</label>
                  <div className="support-categories">
                    {[
                      { id: 'technical', icon: '/tg-icons/settings.webp', label: t.supportCatTech },
                      { id: 'account', icon: '/tg-icons/user.webp', label: t.supportCatAccount },
                      { id: 'payment', icon: '/tg-icons/card.webp', label: t.supportCatPayment },
                      { id: 'other', icon: '/tg-icons/chat.webp', label: t.supportCatOther },
                    ].map(cat => (
                      <button
                        key={cat.id}
                        className={supportCategory === cat.id ? 'support-cat-btn active' : 'support-cat-btn'}
                        onClick={() => setSupportCategory(cat.id)}
                      >
                        <img src={cat.icon} className="tg-icon-cat" alt="" />
                        <span>{cat.label}</span>
                      </button>
                    ))}
                  </div>

                  <label className="support-label">{t.supportMessage}</label>
                  <textarea
                    className="support-textarea"
                    value={supportMessage}
                    onChange={e => setSupportMessage(e.target.value)}
                    placeholder={t.supportMsgPlaceholder}
                    rows={5}
                    maxLength={2000}
                  />
                  <div className="support-char-counter">{supportMessage.length}/2000</div>
                </div>

                <div className="center-modal-actions">
                  <button className="secondary-btn" onClick={() => closeModalAnimated('support', () => { setSupportOpen(false); setSupportMessage('') })}>{t.supportCancel}</button>
                  <button
                    className="primary-btn support-send-btn"
                    onClick={() => void submitSupport()}
                    disabled={isSendingSupport || !supportMessage.trim()}
                  >
                    {isSendingSupport ? <><RefreshCw size={14} className="spin" /> ...</> : <><Send size={14} /> {t.supportSend}</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
