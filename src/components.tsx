import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Book, BookCollection, BookOpenOrigin, SolutionLink, UpdateState, View } from './types'
import { providerIconFor, providerOptionsFor, providerSearchesFor, solutionIconFor, subjects } from './data'
import { profileAvatarUrl } from './avatar'
import { Icon, type IconName } from './icons'
import { checkAndroidUpdate, getAndroidUpdateState, installAndroidUpdate, isNativeAndroid } from './mobile'

function bookCoverStyle(book: Book) {
  return {
    '--book-color': book.color,
    '--book-accent': book.accent,
    '--book-glow': `${book.color}66`,
  } as React.CSSProperties
}

function BookCoverContent({ book, descriptive = false }: { book: Book; descriptive?: boolean }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [book.coverUrl])
  return book.coverUrl && !failed
    ? <img src={book.coverUrl} alt={descriptive ? `Обложка: ${book.title}` : ''} onError={() => setFailed(true)} />
    : <><span className="cover-grade">{book.grade}</span><Icon name="auto_stories" /><small>{book.grade} класс</small><b>{book.title}</b></>
}

function ProviderLogo({ provider, url }: { provider: string; url: string }) {
  const [failed, setFailed] = useState(false)
  const icon = solutionIconFor(provider, url)
  useEffect(() => setFailed(false), [icon])
  return <span className={`provider-logo${icon && !failed ? ' provider-brand' : ''}`}>
    {icon && !failed ? <img src={icon} alt="" onError={() => setFailed(true)} /> : <Icon name="link" />}
  </span>
}

function UserAvatar({ user, className = '' }: { user: User | null; className?: string }) {
  const avatarUrl = profileAvatarUrl(user?.user_metadata)
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => setImageFailed(false), [avatarUrl])

  return <span className={`avatar ${className}${user ? ' signed' : ' guest'}`}>{avatarUrl && !imageFailed ? <img src={avatarUrl} alt="Фото профиля" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} /> : <Icon name={user ? 'person' : 'person_outline'} />}</span>
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <div className="brand-mark"><Icon name="auto_stories" /><span className="brand-spark" /></div>
      {!compact && <div><strong>Решариум</strong><small>Всё получится</small></div>}
    </div>
  )
}

export function Sidebar({ view, onView, onAdd, user, isAdmin }: {
  view: View
  onView: (view: View) => void
  onAdd: () => void
  user: User | null
  isAdmin: boolean
}) {
  const nav: Array<{ id: View; icon: IconName; label: string }> = [
    { id: 'home' as const, icon: 'space_dashboard', label: 'Главная' },
    { id: 'catalog' as const, icon: 'local_library', label: 'Каталог' },
    { id: 'favorites' as const, icon: 'bookmark', label: 'Избранное' },
    { id: 'collections' as const, icon: 'folder_special', label: 'Мои подборки' },
  ]
  if (isAdmin) nav.push({ id: 'moderation', icon: 'fact_check', label: 'Модерация' })
  return (
    <aside className="sidebar">
      <Brand />
      <nav>
        {nav.map((item) => (
          <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => onView(item.id)}>
            <Icon filled={view === item.id} name={item.icon} /><span>{item.label}</span>
          </button>
        ))}
      </nav>
      <button className="add-quick" onClick={onAdd}><Icon name="add" /><span>Добавить решение</span></button>
      <div className="sidebar-bottom">
        <button onClick={() => onView('profile')} className="mini-profile">
          <UserAvatar user={user} />
          <span><b>{user?.user_metadata?.full_name || 'Гостевой профиль'}</b><small>{user?.email || 'Локальный режим'}</small></span>
        </button>
      </div>
    </aside>
  )
}

export function Topbar({ query, setQuery, onAuth }: {
  query: string
  setQuery: (value: string) => void
  onAuth: () => void
}) {
  return (
    <header className="topbar">
      <label className="global-search">
        <Icon name="search" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Учебник, автор, предмет или задание..." />
        <kbd>Ctrl K</kbd>
      </label>
      <button className="icon-btn" onClick={onAuth} title="Аккаунт"><Icon name="account_circle" /></button>
    </header>
  )
}

export function Hero({ onCatalog }: { onCatalog: () => void }) {
  return (
    <section className="hero-card">
      <div className="hero-glow one" /><div className="hero-glow two" />
      <div className="hero-copy">
        <span className="eyebrow"><Icon name="bolt" /> Учиться стало проще</span>
        <h1>Найди решение.<br/><em>Пойми ход мысли.</em></h1>
        <p>Все нужные источники в одном аккуратном каталоге. Выбирай учебник, номер задания и открывай проверенное решение.</p>
        <button className="primary" onClick={onCatalog}>Открыть каталог <Icon name="arrow_forward" /></button>
      </div>
      <div className="hero-art" aria-hidden="true">
        <div className="orbit orbit-a"><span /></div>
        <div className="orbit orbit-b"><span /></div>
        <div className="floating-book book-back"><Icon name="menu_book" /></div>
        <div className="floating-book book-main"><Icon name="auto_stories" /><span className="check"><Icon name="check" /></span></div>
        <div className="math-chip chip-a">π</div><div className="math-chip chip-b">x²</div><div className="math-chip chip-c">∑</div>
      </div>
    </section>
  )
}

export function SubjectRow({ active, onSelect }: { active: string; onSelect: (subject: string) => void }) {
  return (
    <div className="subject-row">
      <button className={!active ? 'active' : ''} onClick={() => onSelect('')}><span className="subject-icon all"><Icon name="apps" /></span><span>Все</span></button>
      {subjects.map((subject) => (
        <button key={subject.name} className={active === subject.name ? 'active' : ''} onClick={() => onSelect(subject.name)}>
          <span className="subject-icon" style={{ '--subject-color': subject.color } as React.CSSProperties}><Icon name={subject.icon} /></span>
          <span>{subject.name}</span>
        </button>
      ))}
    </div>
  )
}

export function GradePicker({ grade, onSelect }: { grade: number; onSelect: (grade: number) => void }) {
  const [open, setOpen] = useState(false)
  const [dropUp, setDropUp] = useState(false)
  const pickerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const choose = (value: number) => {
    onSelect(value)
    setOpen(false)
  }

  const toggle = () => {
    if (!open) {
      const bounds = pickerRef.current?.getBoundingClientRect()
      setDropUp(Boolean(bounds && window.innerHeight - bounds.bottom < 230))
    }
    setOpen((value) => !value)
  }

  return <div className={`grade-picker${open ? ' open' : ''}${dropUp ? ' drop-up' : ''}`} ref={pickerRef}>
    <button type="button" className="grade-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={toggle}>
      <span>Класс</span><b>{grade || 'Все'}</b><Icon name={open ? 'expand_less' : 'expand_more'} />
    </button>
    {open && <div className="grade-menu" role="listbox" aria-label="Выбор класса">
      <button type="button" role="option" aria-selected={!grade} className={!grade ? 'active' : ''} onClick={() => choose(0)}>Все классы</button>
      <div className="grade-grid">{Array.from({ length: 11 }, (_, index) => index + 1).map((value) => <button type="button" role="option" aria-selected={grade === value} className={grade === value ? 'active' : ''} key={value} onClick={() => choose(value)}>{value}</button>)}</div>
    </div>}
  </div>
}

export function BookCard({ book, favorite, sourceCount, onFavorite, onOpen }: {
  book: Book
  favorite: boolean
  sourceCount: number
  onFavorite: () => void
  onOpen: (origin: BookOpenOrigin) => void
}) {
  const coverRef = useRef<HTMLDivElement | null>(null)
  const open = () => {
    const bounds = coverRef.current?.getBoundingClientRect()
    onOpen(bounds
      ? { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height }
      : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 1, height: 1 })
  }
  return (
    <article className="book-card" data-book-id={book.id} role="button" tabIndex={0} aria-label={`Открыть ${book.title}, ${book.grade} класс`} onClick={open} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open() } }}>
      <button className={`bookmark ${favorite ? 'saved' : ''}`} aria-label={favorite ? 'Убрать из избранного' : 'В избранное'} aria-pressed={favorite} onClick={(event) => { event.stopPropagation(); onFavorite() }}>
        <Icon filled={favorite} name="bookmark" />
      </button>
      <div className="book-cover" ref={coverRef} style={bookCoverStyle(book)}>
        <BookCoverContent book={book} />
      </div>
      <div className="book-info">
        <span className="grade-pill">{book.grade} класс</span>
        <h3>{book.title}</h3>
        <p>{book.author}</p>
        <footer><span><Icon name="link" />{sourceCount} {sourceCount === 1 ? 'ссылка' : 'ссылок'}</span><button aria-label={`Открыть ${book.title}`}><Icon name="arrow_forward" /></button></footer>
      </div>
    </article>
  )
}

export function BookGrid({ books, favorites, sourceCounts, onFavorite, onOpen, title }: {
  books: Book[]
  favorites: string[]
  sourceCounts: Record<string, number>
  onFavorite: (id: string) => void
  onOpen: (book: Book, origin: BookOpenOrigin) => void
  title: string
}) {
  return (
    <section className="books-section">
      <div className="section-heading"><div><span className="eyebrow">Библиотека</span><h2>{title}</h2></div><span className="result-count">{books.length} разделов</span></div>
      {books.length ? <div className="book-grid">{books.map((book) => <BookCard key={book.id} book={book} favorite={favorites.includes(book.id)} sourceCount={sourceCounts[book.id] || 0} onFavorite={() => onFavorite(book.id)} onOpen={(origin) => onOpen(book, origin)} />)}</div> : <EmptyState title="Здесь пока пусто" text="Измените фильтр или добавьте учебник в избранное." />}
    </section>
  )
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="empty"><span><Icon name="search_off" /></span><h3>{title}</h3><p>{text}</p></div>
}

export function BookDrawer({ book, origin, solutions, onClose, onAdd, onCollect, onOpenLink }: {
  book: Book
  origin?: BookOpenOrigin | null
  solutions: SolutionLink[]
  onClose: () => void
  onAdd: () => void
  onCollect: () => void
  onOpenLink: (url: string) => void
}) {
  const [taskSearch, setTaskSearch] = useState('')
  const coverRef = useRef<HTMLDivElement | null>(null)
  const [morph, setMorph] = useState<({ left: number; top: number; width: number; height: number; x: number; y: number; scaleX: number; scaleY: number }) | null>(null)
  const [morphDone, setMorphDone] = useState(!origin)

  useLayoutEffect(() => {
    const target = coverRef.current
    if (!origin || !target || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMorph(null)
      setMorphDone(true)
      return
    }
    const destination = target.getBoundingClientRect()
    setMorph({
      left: destination.left,
      top: destination.top,
      width: destination.width,
      height: destination.height,
      x: origin.left - destination.left,
      y: origin.top - destination.top,
      scaleX: origin.width / destination.width,
      scaleY: origin.height / destination.height,
    })
    setMorphDone(false)
    const timer = window.setTimeout(() => setMorphDone(true), 470)
    return () => window.clearTimeout(timer)
  }, [book.id, origin])
  const filtered = solutions.filter((item) => item.task.toLowerCase().includes(taskSearch.toLowerCase()))
  const availableProviders = providerSearchesFor(book).filter((provider) => provider.provider !== book.sourceName)
  const sourceUrl = (domain: string) => taskSearch.trim()
    ? `https://www.google.com/search?q=${encodeURIComponent(`site:${domain} ${book.title} ${book.grade} класс ${taskSearch.trim()} решение`)}`
    : `https://${domain}/`
  return (
    <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className={`drawer${origin ? ' has-book-morph' : ''}`}>
        <div className="drawer-head">
          <button className="icon-btn" aria-label="Закрыть учебник" onClick={onClose}><Icon name="close" /></button>
          <span>Карточка учебника</span>
          <div className="drawer-actions"><button className="soft-btn" onClick={onCollect}><Icon name="folder_special" /> В подборку</button><button className="soft-btn" onClick={onAdd}><Icon name="add_link" /> Ссылка</button></div>
        </div>
        <div className="drawer-book">
          <div className={`book-cover large morph-target${morphDone ? ' ready' : ''}`} ref={coverRef} style={bookCoverStyle(book)}><BookCoverContent book={book} descriptive /></div>
          {morph && !morphDone && <div className="book-cover large book-cover-morph" aria-hidden="true" style={{ ...bookCoverStyle(book), '--morph-left': `${morph.left}px`, '--morph-top': `${morph.top}px`, '--morph-width': `${morph.width}px`, '--morph-height': `${morph.height}px`, '--morph-x': `${morph.x}px`, '--morph-y': `${morph.y}px`, '--morph-scale-x': morph.scaleX, '--morph-scale-y': morph.scaleY } as React.CSSProperties}><BookCoverContent book={book} /></div>}
          <div><span className="grade-pill">{book.grade} класс{book.year ? ` · ${book.year}` : ''}</span><h2>{book.title}</h2><p>{book.author}</p><span className="verified"><Icon name="verified" /> Каталог источников</span></div>
        </div>
        <label className="task-search"><Icon name="search" /><input value={taskSearch} onChange={(event) => setTaskSearch(event.target.value)} placeholder="Введите номер задания" /></label>
        <div className="solution-list">
          <div className="list-head"><b>{taskSearch.trim() ? `Источники для «${taskSearch.trim()}»` : 'Все доступные источники'}</b><span>{filtered.length + availableProviders.length + (book.sourceUrl ? 1 : 0)}</span></div>
          {filtered.map((item) => (
            <button className="solution-item" key={item.id} onClick={() => onOpenLink(item.url)}>
              <ProviderLogo provider={item.provider} url={item.url} />
              <span><b>{item.task}</b><small>{item.provider} · {item.note || 'Внешний источник'}</small></span>
              <Icon name="open_in_new" />
            </button>
          ))}
          {book.sourceUrl && <button className="solution-item provider-search" onClick={() => onOpenLink(book.sourceUrl!)}>
            <ProviderLogo provider={book.sourceName || 'Решёба'} url={book.sourceUrl} />
            <span><b>{book.sourceName || 'Источник учебника'} · этот учебник</b><small>{taskSearch.trim() ? `Открыть учебник и найти задание ${taskSearch.trim()}` : 'Открыть страницу учебника'}</small></span>
            <Icon name="open_in_new" />
          </button>}
          {availableProviders.map((provider) => (
            <button className="solution-item provider-search" key={provider.domain} onClick={() => onOpenLink(sourceUrl(provider.domain))}>
              <span className="provider-logo provider-brand"><img src={provider.icon} alt="" /></span>
              <span><b>{provider.name}</b><small>{taskSearch.trim() ? `Найти задание ${taskSearch.trim()} · ${provider.region}` : `Открыть каталог · ${provider.region}`}</small></span>
              <Icon name="open_in_new" />
            </button>
          ))}
          {!filtered.length && !availableProviders.length && !book.sourceUrl && <div className="verified-empty"><Icon name="fact_check" /><span><b>Подтверждённых ГДЗ не найдено</b><small>Для этого предмета и класса ни один проверенный источник пока не заявлен.</small></span></div>}
        </div>
        <div className="source-note"><Icon name="info" /><p>Решариум хранит каталог ссылок. Содержимое решения открывается на сайте-источнике и принадлежит его правообладателю.</p></div>
      </aside>
    </div>
  )
}

export function AddSolutionModal({ books, initialBook, onClose, onSubmit, requireAuth }: {
  books: Book[]
  initialBook?: Book | null
  onClose: () => void
  onSubmit: (solution: Omit<SolutionLink, 'id' | 'created_at'>) => Promise<string | null>
  requireAuth: boolean
}) {
  const [bookKey, setBookKey] = useState(initialBook?.id || books[0]?.id || '')
  const selectedBook = books.find((book) => book.id === bookKey) || books[0]
  const providerOptions = selectedBook ? providerOptionsFor(selectedBook) : ['Другое']
  const [provider, setProvider] = useState(() => providerOptions[0])
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (!providerOptions.includes(provider)) setProvider(providerOptions[0])
  }, [bookKey, provider, providerOptions])
  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true); setError('')
    const result = await onSubmit({ book_key: bookKey, task: selectedBook?.title || 'Ссылка на решение', provider, url: url.trim(), note: note.trim() })
    setSaving(false)
    if (result) setError(result); else onClose()
  }
  return (
    <Modal title="Добавить ссылку на решение" subtitle={requireAuth ? 'Ссылка сохранится только на этом устройстве' : 'Ссылка появится у подключённых пользователей'} onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        {requireAuth && <div className="warning"><Icon name="save" />Вы работаете без аккаунта — ссылка останется только на этом устройстве. После входа ссылки можно публиковать для всех.</div>}
        <label><span>Учебник</span><select value={bookKey} onChange={(event) => setBookKey(event.target.value)}>{books.map((book) => <option key={book.id} value={book.id}>{book.title} · {book.grade} класс · {book.author}</option>)}</select></label>
        <div className="source-field">
          <span>Источник</span>
          <div className="source-picker" role="radiogroup" aria-label="Источник решения">
            {providerOptions.map((item) => {
              const icon = providerIconFor(item)
              return <button type="button" role="radio" aria-checked={provider === item} className={provider === item ? 'selected' : ''} key={item} onClick={() => setProvider(item)}>{icon ? <img src={icon} alt="" /> : <Icon name="link" />}<span>{item}</span></button>
            })}
          </div>
        </div>
        <label><span>Ссылка на страницу решения</span><input type="url" required value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." /></label>
        <label><span>Комментарий</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Что находится по ссылке" /></label>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions"><button type="button" className="ghost" onClick={onClose}>Отмена</button><button className="primary" disabled={saving}>{saving ? 'Сохраняем…' : requireAuth ? 'Сохранить на устройстве' : 'Опубликовать для всех'}<Icon name={requireAuth ? 'save' : 'arrow_upward'} /></button></div>
      </form>
    </Modal>
  )
}

export function Modal({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="overlay modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal"><div className="modal-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-btn" aria-label="Закрыть окно" onClick={onClose}><Icon name="close" /></button></div>{children}</div></div>
}

export function AuthModal({ connected, googleEnabled, user, onGoogle, onEmail, onResend, onSignOut, onClose }: {
  connected: boolean
  googleEnabled: boolean
  user: User | null
  onGoogle: () => Promise<string | null>
  onEmail: (mode: 'login' | 'signup', email: string, password: string) => Promise<string | null>
  onResend: (email: string) => Promise<string | null>
  onSignOut: () => void
  onClose: () => void
}) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmationEmail, setConfirmationEmail] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = window.setInterval(() => setResendCooldown((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [resendCooldown])
  async function run(action: () => Promise<string | null>) { setLoading(true); setError(''); const result = await action(); setLoading(false); if (result) setError(result) }
  async function submitEmail() {
    setLoading(true); setError('')
    const result = await onEmail(mode, email, password)
    setLoading(false)
    if (result) setError(result)
    else if (mode === 'signup') { setConfirmationEmail(email); setResendCooldown(60) }
  }
  async function resend() {
    if (!confirmationEmail || resendCooldown > 0) return
    setLoading(true); setError('')
    const result = await onResend(confirmationEmail)
    setLoading(false)
    if (result) setError(result)
    else setResendCooldown(60)
  }
  if (user) return <Modal title="Аккаунт" subtitle="Синхронизация профиля включена" onClose={onClose}><div className="signed-profile"><UserAvatar user={user} className="big" /><h3>{user.user_metadata?.full_name || 'Пользователь'}</h3><p>{user.email}</p><button className="danger-soft" onClick={() => { onSignOut(); onClose() }}><Icon name="logout" />Выйти из аккаунта</button></div></Modal>
  return <Modal title={mode === 'login' ? 'Добро пожаловать' : 'Создать аккаунт'} subtitle="Сохраняйте профиль и решения на всех устройствах" onClose={onClose}>
    {!connected ? <div className="not-connected"><span><Icon name="cloud_off" /></span><h3>Сервис аккаунтов недоступен</h3><p>Проверьте подключение к интернету и попробуйте ещё раз.</p></div> : <form className="modal-form auth-form" onSubmit={(event) => { event.preventDefault(); void submitEmail() }}>
      <button type="button" className="google-btn" disabled={loading || !googleEnabled} onClick={() => run(onGoogle)}><img className="google-g" src={new URL('../assets/google-g.png', import.meta.url).href} alt="" />Продолжить с Google</button>
      {!googleEnabled && <div className="auth-notice"><Icon name="info" /><span>Вход через Google скоро будет доступен. Пока используйте email.</span></div>}
      <div className="divider"><span>или</span></div>
      <label><span>Email</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label>
      <label><span>Пароль</span><input type="password" minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Не менее 6 символов" /></label>
      {error && <p className="form-error">{error}</p>}
      {confirmationEmail && mode === 'signup' && <div className="confirmation-box"><Icon name="mark_email_read" /><div><b>Письмо отправлено на {confirmationEmail}</b><span>Проверьте папки «Спам» и «Промоакции».</span><button type="button" disabled={loading || resendCooldown > 0} onClick={() => void resend()}>{resendCooldown > 0 ? `Отправить ещё раз через ${resendCooldown} сек.` : 'Отправить письмо ещё раз'}</button></div></div>}
      <button className="primary wide" disabled={loading}>{loading ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}</button>
      <button type="button" className="text-btn" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setConfirmationEmail(''); setError('') }}>{mode === 'login' ? 'Нет аккаунта? Создать' : 'Уже есть аккаунт? Войти'}</button>
    </form>}
  </Modal>
}

export function ModerationPage({ solutions, books, onModerate, onDelete, onOpenLink }: {
  solutions: SolutionLink[]
  books: Book[]
  onModerate: (id: string, status: 'approved' | 'rejected', reason: string) => Promise<string | null>
  onDelete: (id: string) => void
  onOpenLink: (url: string) => void
}) {
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const pending = solutions.filter((item) => item.status === 'pending')
  const reviewed = solutions.filter((item) => item.status === 'approved' || item.status === 'rejected')
  const bookName = (key: string) => {
    const book = books.find((item) => item.id === key)
    return book ? `${book.title} · ${book.grade} класс` : key
  }
  async function moderate(id: string, status: 'approved' | 'rejected') {
    if (status === 'rejected' && !reason.trim()) { setError('Укажите причину отклонения'); return }
    setBusy(id); setError('')
    const result = await onModerate(id, status, reason)
    setBusy(null)
    if (result) setError(result)
    else { setRejecting(null); setReason('') }
  }
  const card = (item: SolutionLink, history = false) => <article className="moderation-card" key={item.id}>
    <div className="moderation-main">
      <span className={`status-badge ${item.status}`}>{item.status === 'approved' ? 'Одобрено' : item.status === 'rejected' ? 'Отклонено' : 'На проверке'}</span>
      <h3>{bookName(item.book_key)}</h3>
      <p><b>{item.task}</b> · {item.provider}</p>
      {item.note && <small>{item.note}</small>}
      {item.status === 'rejected' && item.rejection_reason && <div className="rejection-reason"><Icon name="report" /><span><b>Причина:</b> {item.rejection_reason}</span></div>}
    </div>
    <div className="moderation-actions">
      <button className="ghost" onClick={() => onOpenLink(item.url)}><Icon name="open_in_new" />Проверить ссылку</button>
      <button className="delete-link-btn" title="Удалить ссылку" aria-label={`Удалить ссылку ${item.task}`} disabled={busy === item.id} onClick={() => onDelete(item.id)}><Icon name="delete" />Удалить</button>
      {!history && <>
        <button className="approve-btn" disabled={busy === item.id} onClick={() => void moderate(item.id, 'approved')}><Icon name="check" />Одобрить</button>
        <button className="reject-btn" disabled={busy === item.id} onClick={() => { setRejecting(item.id); setReason(''); setError('') }}><Icon name="close" />Отклонить</button>
      </>}
    </div>
    {rejecting === item.id && <div className="reject-box"><label><span>Причина отклонения</span><textarea autoFocus maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Например: ссылка ведёт не на тот учебник" /></label><div><button className="ghost" onClick={() => setRejecting(null)}>Отмена</button><button className="reject-btn" onClick={() => void moderate(item.id, 'rejected')}>Отклонить с причиной</button></div>{error && <p className="form-error">{error}</p>}</div>}
  </article>
  return <section className="moderation-page">
    <div className="section-heading"><div><span className="eyebrow">Панель администратора</span><h1>Проверка ссылок</h1><p>Одобряйте только подходящие и безопасные решения. Отклонённая ссылка не станет публичной.</p></div><span className="queue-count">{pending.length} на проверке</span></div>
    {pending.length ? <div className="moderation-list">{pending.map((item) => card(item))}</div> : <EmptyState title="Очередь пуста" text="Новых ссылок для проверки пока нет." />}
    {reviewed.length > 0 && <><div className="history-heading"><h2>История решений</h2><span>{reviewed.length}</span></div><div className="moderation-list reviewed">{reviewed.map((item) => card(item, true))}</div></>}
  </section>
}

export function ProfilePage({ user, favorites, solutions, submitted, onAuth, onDelete }: { user: User | null; favorites: number; solutions: number; submitted: SolutionLink[]; onAuth: () => void; onDelete: (id: string) => void }) {
  const name = user?.user_metadata?.full_name || 'Гостевой профиль'
  return <section className="profile-page"><div className="profile-banner"><UserAvatar user={user} className="profile-avatar" /><div><span className="eyebrow">Мой профиль</span><h1>{name}</h1><p>{user?.email || 'Работаете локально на этом компьютере'}</p></div><button className="soft-btn" onClick={onAuth}><Icon name={user ? 'manage_accounts' : 'login'} />{user ? 'Управление' : 'Войти'}</button></div><div className="stat-grid"><div><Icon name="bookmark" /><b>{favorites}</b><span>В избранном</span></div><div><Icon name="add_link" /><b>{solutions}</b><span>Отправлено ссылок</span></div><div><Icon name="cloud_sync" /><b>{user ? 'On' : 'Off'}</b><span>Синхронизация</span></div></div>{user && submitted.length > 0 && <div className="submitted-links"><div className="history-heading"><h2>Мои ссылки</h2><span>{submitted.length}</span></div>{submitted.map((item) => <article key={item.id}><ProviderLogo provider={item.provider} url={item.url} /><span className={`status-badge ${item.status || 'pending'}`}>{item.status === 'approved' ? 'Одобрено' : item.status === 'rejected' ? 'Отклонено' : 'На проверке'}</span><div className="submitted-link-copy"><b>{item.task} · {item.provider}</b>{item.status === 'rejected' && item.rejection_reason && <small>Причина: {item.rejection_reason}</small>}</div><button className="delete-link-btn compact" title="Удалить ссылку" aria-label={`Удалить ссылку ${item.task}`} onClick={() => onDelete(item.id)}><Icon name="delete" /></button></article>)}</div>}</section>
}

export function UpdateControl() {
  const [state, setState] = useState<UpdateState | null>(null)

  useEffect(() => {
    const desktop = window.desktop
    if (desktop) {
      void desktop.getUpdateState().then(setState)
      return desktop.onUpdateState(setState)
    }
    if (isNativeAndroid) {
      void getAndroidUpdateState().then(setState).then(() => checkAndroidUpdate().then(setState))
    }
  }, [])

  if ((!window.desktop && !isNativeAndroid) || !state) return null
  const busy = state.status === 'checking' || state.status === 'downloading'
  const label = state.status === 'checking' ? 'Проверка…'
    : state.status === 'downloading' ? `Загрузка ${state.progress || 0}%`
      : state.status === 'available' ? `Скачать ${state.availableVersion}`
        : state.status === 'downloaded' ? `Установить ${state.availableVersion}`
        : state.status === 'not-available' ? `Версия ${state.currentVersion} актуальна`
          : state.status === 'error' ? 'Повторить проверку'
            : `Версия ${state.currentVersion}`
  const icon = busy ? 'progress_activity' : state.status === 'downloaded' ? 'restart_alt' : state.status === 'available' ? 'download' : state.status === 'not-available' ? 'check_circle' : 'system_update'

  const activate = () => {
    if (isNativeAndroid) {
      if (state.status === 'available') void installAndroidUpdate()
      else { setState({ ...state, status: 'checking' }); void checkAndroidUpdate().then(setState) }
    } else if (state.status === 'downloaded') void window.desktop?.installUpdate()
    else void window.desktop?.checkForUpdates()
  }

  return <button className={`update-control ${state.status}`} type="button" disabled={busy} title={state.message || 'Проверить обновления'} onClick={activate}><Icon name={icon} />{label}</button>
}

export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => { const timer = setTimeout(onDone, 3200); return () => clearTimeout(timer) }, [onDone])
  return <div className="toast"><Icon name="check_circle" />{message}</div>
}

export function CollectionModal({ collections, book, onCreate, onAdd, onClose }: {
  collections: BookCollection[]
  book?: Book | null
  onCreate: (name: string, bookId?: string) => void
  onAdd: (collectionId: string, bookId: string) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  return <Modal title={book ? 'Добавить в подборку' : 'Новая подборка'} subtitle={book ? `${book.title} · ${book.grade} класс` : 'Соберите собственный набор учебников'} onClose={onClose}>
    <div className="collection-modal-body">
      {book && collections.length > 0 && <div className="collection-choices">{collections.map((collection) => {
        const added = collection.bookIds.includes(book.id)
        return <button key={collection.id} disabled={added} onClick={() => { onAdd(collection.id, book.id); onClose() }}><span><Icon name="folder" /></span><span><b>{collection.name}</b><small>{added ? 'Уже добавлено' : `${collection.bookIds.length} разделов`}</small></span><Icon name={added ? 'check' : 'add'} /></button>
      })}</div>}
      <form className="new-collection" onSubmit={(event) => { event.preventDefault(); if (!name.trim()) return; onCreate(name.trim(), book?.id); onClose() }}>
        <label><span>{collections.length ? 'Или создайте новую' : 'Название подборки'}</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={60} placeholder="Например, Мой 7 класс" /></label>
        <button className="primary" disabled={!name.trim()}><Icon name="create_new_folder" />Создать</button>
      </form>
    </div>
  </Modal>
}

export function CollectionsPage({ collections, activeId, books, favorites, sourceCounts, onActive, onCreate, onDelete, onFavorite, onOpen }: {
  collections: BookCollection[]
  activeId: string | null
  books: Book[]
  favorites: string[]
  sourceCounts: Record<string, number>
  onActive: (id: string | null) => void
  onCreate: () => void
  onDelete: (id: string) => void
  onFavorite: (id: string) => void
  onOpen: (book: Book, origin: BookOpenOrigin) => void
}) {
  const active = collections.find((item) => item.id === activeId)
  if (active) {
    const collectionBooks = books.filter((book) => active.bookIds.includes(book.id))
    return <section className="collections-page"><button className="back-link" onClick={() => onActive(null)}><Icon name="arrow_back" />Все подборки</button><BookGrid books={collectionBooks} favorites={favorites} sourceCounts={sourceCounts} onFavorite={onFavorite} onOpen={onOpen} title={active.name} /></section>
  }
  return <section className="collections-page"><div className="collection-heading"><div><span className="eyebrow">Личная библиотека</span><h1>Мои подборки</h1><p>Создавайте свои наборы учебников. После входа они синхронизируются между устройствами.</p></div><button className="primary" onClick={onCreate}><Icon name="create_new_folder" />Новая подборка</button></div>
    {collections.length ? <div className="collection-grid">{collections.map((collection) => <article key={collection.id} onClick={() => onActive(collection.id)}><span className="collection-icon"><Icon name="folder_special" /></span><div><h3>{collection.name}</h3><p>{collection.bookIds.length} разделов</p></div><button title="Удалить" onClick={(event) => { event.stopPropagation(); onDelete(collection.id) }}><Icon name="delete" /></button></article>)}</div> : <EmptyState title="Подборок пока нет" text="Создайте первую подборку и добавляйте в неё нужные разделы из каталога." />}
  </section>
}

const Webview = 'webview' as any

export function SourceBrowser({ url, onClose, onExternal }: { url: string; onClose: () => void; onExternal: (url: string) => void }) {
  const webviewRef = useRef<any>(null)
  const [currentUrl, setCurrentUrl] = useState(url)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const view = webviewRef.current
    if (!view) return
    let finishTimer = window.setTimeout(() => setLoading(false), 15_000)
    const start = () => {
      window.clearTimeout(finishTimer)
      setLoading(true)
      finishTimer = window.setTimeout(() => setLoading(false), 15_000)
    }
    const stop = () => {
      window.clearTimeout(finishTimer)
      setLoading(false)
      setCurrentUrl(view.getURL?.() || url)
    }
    const navigate = (event: { url?: string }) => event.url && setCurrentUrl(event.url)
    view.addEventListener('did-start-loading', start)
    view.addEventListener('did-stop-loading', stop)
    view.addEventListener('did-fail-load', stop)
    view.addEventListener('dom-ready', stop)
    view.addEventListener('did-navigate', navigate)
    view.addEventListener('did-navigate-in-page', navigate)
    return () => {
      window.clearTimeout(finishTimer)
      view.removeEventListener('did-start-loading', start)
      view.removeEventListener('did-stop-loading', stop)
      view.removeEventListener('did-fail-load', stop)
      view.removeEventListener('dom-ready', stop)
      view.removeEventListener('did-navigate', navigate)
      view.removeEventListener('did-navigate-in-page', navigate)
    }
  }, [url])
  return <div className="source-browser">
    <div className="browser-toolbar">
      <button aria-label="Назад" onClick={() => webviewRef.current?.goBack()}><Icon name="arrow_back" /></button>
      <button aria-label="Вперёд" onClick={() => webviewRef.current?.goForward()}><Icon name="arrow_forward" /></button>
      <button aria-label="Обновить страницу" onClick={() => webviewRef.current?.reload()}><Icon name="refresh" /></button>
      <div className={`browser-address ${loading ? 'loading' : ''}`}><Icon name={loading ? 'progress_activity' : 'lock'} /><span>{currentUrl}</span></div>
      <button title="Открыть во внешнем браузере" onClick={() => onExternal(currentUrl)}><Icon name="open_in_new" /></button>
      <button title="Закрыть" onClick={onClose}><Icon name="close" /></button>
    </div>
    <Webview ref={webviewRef} src={url} className="source-webview" partition="persist:resharium-sources" webpreferences="contextIsolation=yes,nodeIntegration=no,sandbox=yes" />
  </div>
}
