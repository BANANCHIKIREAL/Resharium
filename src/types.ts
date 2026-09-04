export type Subject = 'Математика' | 'Русский язык' | 'Русская литература' | 'Белорусский язык' | 'Белорусская литература' | 'Литературное чтение' | 'Літаратурнае чытанне' | 'Навучанне грамаце' | 'Обучение грамоте' | 'Английский язык' | 'Немецкий язык' | 'Французский язык' | 'Испанский язык' | 'Китайский язык' | 'Человек и мир' | 'Физика' | 'Астрономия' | 'Химия' | 'История Беларуси' | 'Всемирная история' | 'Обществоведение' | 'Биология' | 'География' | 'Информатика' | 'Изобразительное искусство' | 'Искусство' | 'Музыка' | 'Трудовое обучение' | 'ОБЖ' | 'Черчение' | 'Допризывная подготовка' | 'Медицинская подготовка'

export interface Book {
  id: string
  title: string
  author: string
  grade: number
  subject: Subject
  year?: number
  color: string
  accent: string
  coverUrl?: string
  sourceUrl?: string
  sourceName?: string
  popular?: boolean
}

export interface SolutionLink {
  id: string
  book_key: string
  task: string
  provider: string
  url: string
  note?: string
  created_at: string
  created_by?: string
  status?: 'pending' | 'approved' | 'rejected'
  rejection_reason?: string | null
  reviewed_by?: string | null
  reviewed_at?: string | null
}

export interface SupabaseSettings {
  url: string
  publishableKey: string
}

export interface BookCollection {
  id: string
  name: string
  bookIds: string[]
  createdAt: string
}

export type View = 'home' | 'catalog' | 'favorites' | 'collections' | 'profile' | 'moderation'

export interface UpdateState {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'not-available' | 'error' | 'unsupported'
  currentVersion: string
  availableVersion?: string
  progress?: number
  message?: string
}

declare global {
  interface Window {
    desktop?: {
      openExternal: (url: string) => Promise<void>
      getPendingAuthUrl: () => Promise<string | null>
      clearPendingAuthUrl: () => Promise<void>
      onAuthCallback: (callback: (url: string) => void) => () => void
      getUpdateState: () => Promise<UpdateState>
      checkForUpdates: () => Promise<UpdateState>
      installUpdate: () => Promise<boolean>
      onUpdateState: (callback: (state: UpdateState) => void) => () => void
    }
  }
}
