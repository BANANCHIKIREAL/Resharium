import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Session, SupabaseClient, User } from '@supabase/supabase-js'
import { books, demoSolutions, providerSearchesFor } from './data'
import type { Book, BookCollection, SolutionLink, View } from './types'
import { createSupabase, getStoredSettings } from './lib/supabase'
import { AddSolutionModal, AuthModal, BookDrawer, BookGrid, CollectionModal, CollectionsPage, GradePicker, Hero, ModerationPage, ProfilePage, Sidebar, SourceBrowser, SubjectRow, Toast, Topbar, UpdateControl } from './components'

const FAVORITES_KEY = 'resharium.favorites'
const LOCAL_SOLUTIONS_KEY = 'resharium.solutions'
const COLLECTIONS_KEY = 'resharium.collections'

function readJson<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || '') as T } catch { return fallback }
}

function safeHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch { return false }
}

export default function App() {
  const [view, setView] = useState<View>('home')
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState('')
  const [grade, setGrade] = useState(0)
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [favorites, setFavorites] = useState<string[]>(() => readJson(FAVORITES_KEY, []))
  const [collections, setCollections] = useState<BookCollection[]>(() => readJson(COLLECTIONS_KEY, []))
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null)
  const [solutions, setSolutions] = useState<SolutionLink[]>(() => [...demoSolutions, ...readJson<SolutionLink[]>(LOCAL_SOLUTIONS_KEY, [])])
  const [settings] = useState(() => getStoredSettings())
  const [client] = useState<SupabaseClient | null>(() => createSupabase(getStoredSettings()))
  const [user, setUser] = useState<User | null>(null)
  const [googleEnabled, setGoogleEnabled] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [showCollection, setShowCollection] = useState(false)
  const [collectionBook, setCollectionBook] = useState<Book | null>(null)
  const [browserUrl, setBrowserUrl] = useState('')
  const [toast, setToast] = useState('')
  const searchRef = useRef<HTMLInputElement | null>(null)

  const handleAuthCallback = useCallback(async (callbackUrl: string) => {
    if (!client) return
    try {
      const parsed = new URL(callbackUrl)
      const code = parsed.searchParams.get('code')
      if (code) {
        const { error } = await client.auth.exchangeCodeForSession(code)
        if (error) throw error
      } else {
        const fragment = new URLSearchParams(parsed.hash.slice(1))
        const accessToken = fragment.get('access_token')
        const refreshToken = fragment.get('refresh_token')
        if (accessToken && refreshToken) {
          const { error } = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          if (error) throw error
        }
      }
      await window.desktop?.clearPendingAuthUrl()
      setShowAuth(false)
      setToast('Вход выполнен')
    } catch (error) {
      setToast(error instanceof Error ? `Ошибка входа: ${error.message}` : 'Не удалось завершить вход')
    }
  }, [client])

  useEffect(() => {
    if (!client) { setUser(null); return }
    client.auth.getSession().then(({ data }) => setUser(data.session?.user || null))
    const { data: authListener } = client.auth.onAuthStateChange((_event, session: Session | null) => setUser(session?.user || null))
    const unsubscribeDesktop = window.desktop?.onAuthCallback(handleAuthCallback)
    window.desktop?.getPendingAuthUrl().then((url) => { if (url) void handleAuthCallback(url) })
    return () => { authListener.subscription.unsubscribe(); unsubscribeDesktop?.() }
  }, [client, handleAuthCallback])

  useEffect(() => {
    let active = true
    if (!client) { setGoogleEnabled(false); return }
    fetch(`${settings.url}/auth/v1/settings`, { headers: { apikey: settings.publishableKey } })
      .then((response) => response.json())
      .then((authSettings: { external?: { google?: boolean } }) => active && setGoogleEnabled(Boolean(authSettings.external?.google)))
      .catch(() => active && setGoogleEnabled(false))
    return () => { active = false }
  }, [client, settings])

  useEffect(() => {
    let active = true
    if (!client || !user) { setIsAdmin(false); return }
    client.rpc('is_admin').then(({ data, error }) => {
      if (active) setIsAdmin(!error && data === true)
    })
    return () => { active = false }
  }, [client, user])

  useEffect(() => {
    if (!client) return
    let active = true
    client.from('solution_links').select('*').order('created_at', { ascending: false }).then(({ data, error }) => {
      if (active && !error && data) setSolutions([...demoSolutions, ...(data as SolutionLink[])])
    })
    const channel = client.channel('resharium-solutions').on('postgres_changes', { event: '*', schema: 'public', table: 'solution_links' }, () => {
      client.from('solution_links').select('*').order('created_at', { ascending: false }).then(({ data }) => data && setSolutions([...demoSolutions, ...(data as SolutionLink[])]))
    }).subscribe()
    return () => { active = false; client.removeChannel(channel) }
  }, [client])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        document.querySelector<HTMLInputElement>('.global-search input')?.focus()
      }
      if (event.key === 'Escape') { setSelectedBook(null); setShowAdd(false); setShowAuth(false); setShowCollection(false); setBrowserUrl('') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const filteredBooks = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return books.filter((book) => {
      const matchesQuery = !needle || `${book.title} ${book.author} ${book.subject} ${book.grade}`.toLowerCase().includes(needle)
      const matchesSubject = !subject || book.subject === subject
      const matchesGrade = !grade || book.grade === grade
      const matchesFavorite = view !== 'favorites' || favorites.includes(book.id)
      return matchesQuery && matchesSubject && matchesGrade && matchesFavorite
    })
  }, [query, subject, grade, view, favorites])

  const publicSolutions = useMemo(() => solutions.filter((item) => !item.status || item.status === 'approved'), [solutions])

  const sourceCounts = useMemo(() => publicSolutions.reduce<Record<string, number>>((counts, item) => {
    counts[item.book_key] = (counts[item.book_key] || 0) + 1
    return counts
  }, Object.fromEntries(books.map((book) => [book.id, providerSearchesFor(book).length]))), [publicSolutions])

  function toggleFavorite(id: string) {
    setFavorites((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
      return next
    })
  }

  function commitCollections(next: BookCollection[]) {
    localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(next))
    setCollections(next)
  }

  function createCollection(name: string, bookId?: string) {
    const collection: BookCollection = { id: crypto.randomUUID(), name, bookIds: bookId ? [bookId] : [], createdAt: new Date().toISOString() }
    commitCollections([...collections, collection])
    setToast(bookId ? 'Подборка создана, раздел добавлен' : 'Подборка создана')
  }

  function addToCollection(collectionId: string, bookId: string) {
    commitCollections(collections.map((collection) => collection.id === collectionId && !collection.bookIds.includes(bookId) ? { ...collection, bookIds: [...collection.bookIds, bookId] } : collection))
    setToast('Добавлено в подборку')
  }

  function deleteCollection(collectionId: string) {
    commitCollections(collections.filter((collection) => collection.id !== collectionId))
    if (activeCollectionId === collectionId) setActiveCollectionId(null)
    setToast('Подборка удалена')
  }

  async function addSolution(input: Omit<SolutionLink, 'id' | 'created_at'>) {
    if (!safeHttpUrl(input.url)) return 'Нужна корректная ссылка http:// или https://'
    if (!input.task) return 'Не удалось определить выбранный учебник'
    if (client && user) {
      const { error } = await client.from('solution_links').insert({ ...input, created_by: user.id })
      if (error) return `Supabase: ${error.message}`
    } else {
      const created = { ...input, id: crypto.randomUUID(), created_at: new Date().toISOString() }
      const local = readJson<SolutionLink[]>(LOCAL_SOLUTIONS_KEY, [])
      localStorage.setItem(LOCAL_SOLUTIONS_KEY, JSON.stringify([created, ...local]))
      setSolutions((current) => [created, ...current])
    }
    setToast(client && user ? 'Ссылка отправлена администратору на проверку' : 'Ссылка сохранена на этом компьютере')
    return null
  }

  async function moderateSolution(id: string, status: 'approved' | 'rejected', reason: string) {
    if (!client || !user || !isAdmin) return 'Недостаточно прав'
    const { error } = await client.from('solution_links').update({
      status,
      rejection_reason: status === 'rejected' ? reason.trim() : null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    if (error) return error.message
    setSolutions((current) => current.map((item) => item.id === id ? { ...item, status, rejection_reason: status === 'rejected' ? reason.trim() : null, reviewed_by: user.id, reviewed_at: new Date().toISOString() } : item))
    setToast(status === 'approved' ? 'Ссылка одобрена и опубликована' : 'Ссылка отклонена с указанием причины')
    return null
  }

  async function deleteSolution(id: string) {
    if (!window.confirm('Удалить эту ссылку? Восстановить её будет нельзя.')) return
    if (client && user && !id.startsWith('demo-')) {
      const { data, error } = await client.from('solution_links').delete().eq('id', id).select('id')
      if (error) return setToast(`Не удалось удалить ссылку: ${error.message}`)
      if (!data?.length) return setToast('Ссылка не удалена: недостаточно прав')
    } else {
      const local = readJson<SolutionLink[]>(LOCAL_SOLUTIONS_KEY, []).filter((item) => item.id !== id)
      localStorage.setItem(LOCAL_SOLUTIONS_KEY, JSON.stringify(local))
    }
    setSolutions((current) => current.filter((item) => item.id !== id))
    setToast('Ссылка удалена')
  }

  async function googleLogin() {
    if (!client) return 'Сервис аккаунтов временно недоступен'
    if (!googleEnabled) return 'Google-вход пока недоступен'
    try {
      const response = await fetch(`${settings.url}/auth/v1/settings`, {
        headers: { apikey: settings.publishableKey },
      })
      const authSettings = await response.json() as { external?: { google?: boolean } }
      if (!response.ok || !authSettings.external?.google) {
        return 'Google-вход пока недоступен'
      }
    } catch {
      return 'Не удалось проверить настройку Google-входа'
    }
    const redirectTo = window.desktop ? 'resharium://auth/callback' : `${window.location.origin}/auth/callback`
    const { data, error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } })
    if (error) return error.message
    if (data.url) {
      if (window.desktop) await window.desktop.openExternal(data.url)
      else window.location.assign(data.url)
    }
    return null
  }

  async function emailAuth(mode: 'login' | 'signup', email: string, password: string) {
    if (!client) return 'Сначала подключите Supabase'
    const result = mode === 'login' ? await client.auth.signInWithPassword({ email, password }) : await client.auth.signUp({ email, password })
    if (result.error) return result.error.message
    if (mode === 'signup' && !result.data.session) setToast('Проверьте почту для подтверждения')
    else { setToast('Вход выполнен'); setShowAuth(false) }
    return null
  }

  function openLink(url: string) {
    if (!safeHttpUrl(url)) return setToast('Небезопасная ссылка заблокирована')
    if (window.desktop) setBrowserUrl(url)
    else window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function openExternal(url: string) {
    if (!safeHttpUrl(url)) return
    if (window.desktop) await window.desktop.openExternal(url)
    else window.open(url, '_blank', 'noopener,noreferrer')
  }

  const pageTitle = view === 'favorites' ? 'Избранные разделы' : view === 'catalog' ? 'Каталог классов и предметов' : query || subject || grade ? 'Результаты поиска' : 'Популярные разделы'
  const visibleBooks = view === 'home' && !query && !subject && !grade ? filteredBooks.filter((book) => book.popular) : filteredBooks

  return <div className="app-shell">
    <Sidebar view={view} onView={setView} onAdd={() => setShowAdd(true)} user={user} isAdmin={isAdmin} />
    <main className="main-area">
      <Topbar query={query} setQuery={setQuery} onAuth={() => setShowAuth(true)} />
      <div className="page" ref={searchRef as never}>
        {view === 'moderation' && isAdmin ? <ModerationPage solutions={solutions.filter((item) => !item.id.startsWith('demo-'))} books={books} onModerate={moderateSolution} onDelete={(id) => void deleteSolution(id)} onOpenLink={openLink} /> : view === 'profile' ? <ProfilePage user={user} favorites={favorites.length} solutions={solutions.filter((item) => item.created_by === user?.id).length} submitted={solutions.filter((item) => item.created_by === user?.id)} onAuth={() => setShowAuth(true)} onDelete={(id) => void deleteSolution(id)} /> : view === 'collections' ? <CollectionsPage collections={collections} activeId={activeCollectionId} books={books} favorites={favorites} sourceCounts={sourceCounts} onActive={setActiveCollectionId} onCreate={() => { setCollectionBook(null); setShowCollection(true) }} onDelete={deleteCollection} onFavorite={toggleFavorite} onOpen={setSelectedBook} /> : <>
          {view === 'home' && !query && !subject && !grade && <Hero onCatalog={() => setView('catalog')} />}
          <section className="filter-section">
            <div className="filter-head"><div><span className="eyebrow">Быстрый выбор</span><h2>Что разбираем сегодня?</h2></div><GradePicker grade={grade} onSelect={setGrade} /></div>
            <SubjectRow active={subject} onSelect={setSubject} />
          </section>
          <BookGrid books={visibleBooks} favorites={favorites} sourceCounts={sourceCounts} onFavorite={toggleFavorite} onOpen={setSelectedBook} title={pageTitle} />
        </>}
        <footer className="app-footer"><span>Решариум · каталог образовательных ссылок</span><UpdateControl /></footer>
      </div>
    </main>
    {selectedBook && <BookDrawer book={selectedBook} solutions={publicSolutions.filter((item) => item.book_key === selectedBook.id)} onClose={() => setSelectedBook(null)} onAdd={() => setShowAdd(true)} onCollect={() => { setCollectionBook(selectedBook); setShowCollection(true) }} onOpenLink={openLink} />}
    {showAdd && <AddSolutionModal books={books} initialBook={selectedBook} onClose={() => setShowAdd(false)} onSubmit={addSolution} requireAuth={!user} />}
    {showAuth && <AuthModal connected={Boolean(client)} googleEnabled={googleEnabled} user={user} onGoogle={googleLogin} onEmail={emailAuth} onSignOut={() => client?.auth.signOut()} onClose={() => setShowAuth(false)} />}
    {showCollection && <CollectionModal collections={collections} book={collectionBook} onCreate={createCollection} onAdd={addToCollection} onClose={() => setShowCollection(false)} />}
    {browserUrl && <SourceBrowser url={browserUrl} onClose={() => setBrowserUrl('')} onExternal={openExternal} />}
    {toast && <Toast message={toast} onDone={() => setToast('')} />}
  </div>
}
