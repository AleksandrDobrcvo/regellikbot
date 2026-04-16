export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  photo_url?: string
}

export interface TelegramWebApp {
  initData: string
  initDataUnsafe: {
    query_id?: string
    user?: TelegramUser
    auth_date?: string
    hash?: string
  }
  version: string
  platform: string
  colorScheme: 'light' | 'dark'
  themeParams: {
    bg_color?: string
    text_color?: string
    hint_color?: string
    link_color?: string
    button_color?: string
    button_text_color?: string
  }
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
  headerColor: string
  backgroundColor: string
  
  ready(): void
  expand(): void
  close(): void
  
  MainButton: {
    text: string
    color: string
    textColor: string
    isVisible: boolean
    isActive: boolean
    
    setText(text: string): void
    onClick(callback: () => void): void
    offClick(callback: () => void): void
    show(): void
    hide(): void
    enable(): void
    disable(): void
    showProgress(leaveActive?: boolean): void
    hideProgress(): void
  }
  
  BackButton: {
    isVisible: boolean
    onClick(callback: () => void): void
    offClick(callback: () => void): void
    show(): void
    hide(): void
  }
  
  Haptic: {
    impactOccurred(style: 'light' | 'medium' | 'heavy'): void
    notificationOccurred(type: 'error' | 'success' | 'warning'): void
    selectionChanged(): void
  }
  
  showAlert(message: string, callback?: () => void): void
  showConfirm(message: string, callback?: (confirmed: boolean) => void): void
  showPopup(params: {
    title?: string
    message: string
    buttons?: Array<{
      id?: string
      text: string
      type?: 'default' | 'destructive' | 'cancel'
    }>
  }, callback?: (buttonId: string) => void): void
  
  openLink(url: string, options?: { try_instant_view?: boolean }): void
  openTelegramLink(url: string): void
  openInvoice(url: string, callback?: (status: string) => void): void
  
  sendData(data: string): void
  
  requestContact(callback?: (contact: string) => void): void
  requestWriteAccess(callback?: (granted: boolean) => void): void
  
  switchInlineQuery(query: string, chat_types?: string[]): void
}

declare global {
  interface Window {
    Telegram: {
      WebApp: TelegramWebApp
    }
  }
}
