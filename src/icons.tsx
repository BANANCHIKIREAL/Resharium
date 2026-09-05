import { MorphIcon, type IconInput } from 'morphicons/react'
import {
  ArrowLeft, ArrowRight, ArrowUp, Atom, BadgeCheck, Book, BookMarked,
  BookOpen, BookOpenCheck, Bookmark, BookmarkCheck, Calculator, CaseSensitive,
  Check, ChevronDown, ChevronUp, CircleCheck, CircleUserRound, ClipboardCheck,
  CloudOff, CloudSync, Code, Dna, DraftingCompass, Download, ExternalLink,
  FlaskConical, Folder, FolderCheck, FolderOpen, FolderPlus, FolderHeart, Globe,
  Grid2x2, Grid3x3, House, Info, Languages, Landmark, LayoutDashboard,
  LibraryBig, Link, ListChecks, LoaderCircle, LockKeyhole, LogIn, LogOut,
  MailCheck, MessageCircle, Mic, Music, Palette, Pencil, Plus, RefreshCw,
  RotateCcw, Satellite, Save, ScrollText, Search, SearchX, Shield, ShieldCheck,
  ShieldPlus, SpellCheck, Stethoscope, Theater, Trash2, Trees, Type,
  UserRound, UserRoundCog, UsersRound, Wrench, X, Zap, CircleAlert,
} from 'lucide'

// Lucide icon data, as used by morphicons.com. Named imports keep the bundle small.
export const iconData = {
  abc: CaseSensitive, account_balance: Landmark, account_circle: CircleUserRound,
  add: Plus, add_link: Link, apps: Grid3x3, architecture: DraftingCompass,
  arrow_back: ArrowLeft, arrow_forward: ArrowRight, arrow_upward: ArrowUp,
  auto_stories: BookOpen, bolt: Zap, book_2: BookMarked, bookmark: Bookmark,
  calculate: Calculator, chat: MessageCircle, check: Check, check_circle: CircleCheck,
  close: X, cloud_off: CloudOff, cloud_sync: CloudSync, code: Code,
  construction: Wrench, create_new_folder: FolderPlus, delete: Trash2,
  download: Download, expand_more: ChevronDown, expand_less: ChevronUp,
  experiment: FlaskConical, fact_check: ClipboardCheck, folder: Folder,
  folder_special: FolderHeart, genetics: Dna, groups: UsersRound,
  health_and_safety: ShieldPlus, history_edu: ScrollText, import_contacts: BookOpen,
  info: Info, language: Globe, link: Link, local_library: LibraryBig, lock: LockKeyhole,
  login: LogIn, logout: LogOut, manage_accounts: UserRoundCog, mark_email_read: MailCheck,
  match_case: CaseSensitive, medical_services: Stethoscope, menu_book: BookOpen,
  music_note: Music, nature_people: Trees, open_in_new: ExternalLink, orbit: Atom,
  palette: Palette, person: UserRound, person_outline: CircleUserRound,
  planet: Satellite, progress_activity: LoaderCircle, public: Globe,
  record_voice_over: Mic, refresh: RefreshCw, report: CircleAlert,
  restart_alt: RotateCcw, save: Save, search: Search, search_off: SearchX,
  shield: Shield, space_dashboard: LayoutDashboard, spellcheck: SpellCheck,
  stylus: Pencil, system_update: Download, text_fields: Type,
  theater_comedy: Theater, translate: Languages, verified: BadgeCheck,
} satisfies Record<string, IconInput>

export type IconName = keyof typeof iconData

const selectedIcons: Partial<Record<IconName, IconInput>> = {
  bookmark: BookmarkCheck,
  space_dashboard: House,
  local_library: BookOpenCheck,
  folder_special: FolderOpen,
  folder: FolderCheck,
  fact_check: ListChecks,
  apps: Grid2x2,
  shield: ShieldCheck,
  auto_stories: Book,
}

export function Icon({ name, filled = false }: { name: IconName; filled?: boolean }) {
  const icon = (filled && selectedIcons[name]) || iconData[name]
  return <span className={`ui-icon${filled ? ' filled' : ''}`} data-icon={name} aria-hidden="true">
    <MorphIcon icon={icon} size="1em" strokeWidth={1.8} spring="smooth" reducedMotion="user" focusable="false" />
  </span>
}
