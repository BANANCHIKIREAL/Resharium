import type { Book, SolutionLink, Subject } from './types'
import catalog from './catalog.generated.json'
import type { IconName } from './icons'

export const subjects: Array<{ name: Subject; icon: IconName; color: string }> = [
  { name: 'Математика', icon: 'calculate', color: '#9c78ff' },
  { name: 'Русский язык', icon: 'spellcheck', color: '#ff6d9e' },
  { name: 'Русская литература', icon: 'import_contacts', color: '#db82ff' },
  { name: 'Белорусский язык', icon: 'language', color: '#f16464' },
  { name: 'Белорусская литература', icon: 'book_2', color: '#df6eb8' },
  { name: 'Литературное чтение', icon: 'local_library', color: '#cb75e8' },
  { name: 'Літаратурнае чытанне', icon: 'menu_book', color: '#e56ca4' },
  { name: 'Навучанне грамаце', icon: 'text_fields', color: '#fa7070' },
  { name: 'Обучение грамоте', icon: 'match_case', color: '#ff8c74' },
  { name: 'Английский язык', icon: 'translate', color: '#4bd6ff' },
  { name: 'Немецкий язык', icon: 'abc', color: '#ffca55' },
  { name: 'Французский язык', icon: 'record_voice_over', color: '#6eb7ff' },
  { name: 'Испанский язык', icon: 'chat', color: '#ff9860' },
  { name: 'Китайский язык', icon: 'stylus', color: '#ff6666' },
  { name: 'Человек и мир', icon: 'nature_people', color: '#68dda1' },
  { name: 'Физика', icon: 'orbit', color: '#54e3a5' },
  { name: 'Астрономия', icon: 'planet', color: '#8b9cff' },
  { name: 'Химия', icon: 'experiment', color: '#ffc75f' },
  { name: 'История Беларуси', icon: 'account_balance', color: '#ff8f6b' },
  { name: 'Всемирная история', icon: 'history_edu', color: '#e98061' },
  { name: 'Обществоведение', icon: 'groups', color: '#ffac66' },
  { name: 'Биология', icon: 'genetics', color: '#6de08c' },
  { name: 'География', icon: 'public', color: '#59bfff' },
  { name: 'Информатика', icon: 'code', color: '#7f96ff' },
  { name: 'Изобразительное искусство', icon: 'palette', color: '#ff73a8' },
  { name: 'Искусство', icon: 'theater_comedy', color: '#ce7bff' },
  { name: 'Музыка', icon: 'music_note', color: '#a987ff' },
  { name: 'Трудовое обучение', icon: 'construction', color: '#e6a362' },
  { name: 'ОБЖ', icon: 'health_and_safety', color: '#ef8c62' },
  { name: 'Черчение', icon: 'architecture', color: '#75c8e8' },
  { name: 'Допризывная подготовка', icon: 'shield', color: '#77b986' },
  { name: 'Медицинская подготовка', icon: 'medical_services', color: '#ff788a' },
]

const palettes = [
  ['#7049e8', '#b49cff'], ['#ce4678', '#ff9fbd'], ['#1889ba', '#75ddff'],
  ['#18896c', '#72edc2'], ['#4958d8', '#92a0ff'], ['#b98219', '#ffd27d'],
  ['#ad553a', '#ffa78b'], ['#a74178', '#f38abe'], ['#2e7c9b', '#74d7ee'],
  ['#47733c', '#8de77f'], ['#7656af', '#bea0ed'], ['#336aaa', '#75abef'],
  ['#a84444', '#ff8c8c'], ['#3a7770', '#79ddd1'], ['#826c2d', '#e9cb70'],
  ['#4f5b98', '#9ba7ed'], ['#8d4b73', '#e395c3'],
]

// These Resheba files were verified as blurred placeholders (or unavailable),
// so the app renders its crisp generated cover instead.
const unusableCoverBookIds = new Set([
  'resheba-d566d34cd9a7b840',
  'resheba-34022205d4b63f2d',
  'resheba-1c0dec8aeea72323',
  'resheba-c7f7ec4ebd889036',
  'resheba-26dff861921400c8',
  'resheba-e9fadc61450eaacc',
  'resheba-02d4016e4d8cbec7',
  'resheba-0697e85613b507b3',
  'resheba-db1ce42c43f60d68',
  'resheba-effddf27b5680918',
  'resheba-42057df58b92d34f',
  'resheba-cd43807d98931590',
  'resheba-295aabe8162f4788',
  'resheba-e3fd891d35dfc20d',
  'resheba-9cad232eaaa89c51',
  'resheba-3264524c9030b0b3',
  'resheba-2343d87a28db1a48',
  'resheba-298059b00a13d387',
  'resheba-758c9082d39201ed',
  'resheba-a2edcf7d4dce3500',
  'resheba-eb5e29a6c1473998',
  'resheba-1d1d4d34d011cf91',
  'resheba-c1457010646256c0',
  'resheba-303990404c435976',
  'resheba-ae7181fde00330bc',
  'resheba-b0f21360f5e9678b',
  'resheba-ebd5970c39282c54',
  'resheba-393ea97691d65399',
  'resheba-1c6589bafe3b5eae',
  'resheba-0c5b29d8936cfb33',
  'resheba-99dcc8c7a03cc5e0',
  'resheba-215d6731c7c5f06e',
  'resheba-19d88a6b74748927',
  'resheba-d5f4e32751cc8647',
  'resheba-27240dc3d45895b1',
  'resheba-460d25eaefa15b39',
  'resheba-a5531b755fce0bb8',
  'resheba-24f0a307c8866a43',
])

type CatalogBook = Omit<Book, 'color' | 'accent'>

export function decorateBook(book: CatalogBook, index: number): Book {
  const subjectIndex = subjects.findIndex((item) => item.name === book.subject)
  const palette = palettes[(Math.max(subjectIndex, 0) + book.grade + index) % palettes.length]
  return {
    ...book,
    coverUrl: unusableCoverBookIds.has(book.id) ? undefined : book.coverUrl,
    subject: book.subject as Subject,
    color: palette[0],
    accent: palette[1],
    popular: book.grade === 7 || index < 8,
  }
}

export const books: Book[] = catalog.map((book, index) => decorateBook({ ...book, subject: book.subject as Subject }, index))

export const demoSolutions: SolutionLink[] = []

type Availability = Partial<Record<Subject, number[]>>
type ProviderSearch = { name: string; provider: string; domain: string; region: string; icon: string; availability: Availability }

const providerIcons = {
  'Решёба': new URL('../assets/providers/resheba.png', import.meta.url).href,
  'GDZ.by': new URL('../assets/providers/gdz-by.png', import.meta.url).href,
  'ГДЗ Онлайн Беларусь': new URL('../assets/providers/gdz-online.png', import.meta.url).href,
  'Мегарешеба': new URL('../assets/providers/megaresheba.png', import.meta.url).href,
} as const

const grades = (...values: number[]) => values
const middleAndSenior = grades(7, 8, 9, 10, 11)

export const providerSearches: ProviderSearch[] = [
  {
    name: 'Решёба · основной', provider: 'Решёба', domain: 'resheba.top', region: 'Беларусь · подтверждено', icon: providerIcons['Решёба'],
    availability: {
      'Математика': grades(2, 3, 4, 5, 6, ...middleAndSenior),
      'Русский язык': grades(2, 3, 4, 5, 6, 7, 8, 9, 10, 11),
      'Русская литература': grades(7),
      'Белорусский язык': grades(2, 3, 4, 5, 6, 7, 8, 9, 10, 11),
      'Английский язык': grades(3, 4, 5, 6, 7, 8, 9, 10, 11),
      'Немецкий язык': grades(4, 5, 6, 7, 9),
      'Человек и мир': grades(2, 3, 5),
      'Физика': grades(6, 7, 8, 9, 10, 11),
      'Химия': grades(7, 8, 9, 10, 11),
      'История Беларуси': grades(5, 6, 7, 8),
      'Всемирная история': grades(5, 6, 7, 8),
      'Биология': grades(6, 7, 8, 9),
      'География': grades(6, 7, 8),
    },
  },
  {
    name: 'GDZ.by', provider: 'GDZ.by', domain: 'gdz.by', region: 'Беларусь · подтверждено', icon: providerIcons['GDZ.by'],
    availability: {
      'Математика': grades(1, 2, 3, 4, 5, 6, ...middleAndSenior),
      'Русский язык': grades(2, 3, 4, 5, 6, 7, 8, 9, 10, 11),
      'Русская литература': grades(2, 3, 4, 5, 6, 7, 9, 10, 11),
      'Белорусский язык': grades(2, 3, 4, 5, 6, 7, 8, 9, 10, 11),
      'Белорусская литература': grades(2, 3, 4, 5, 6, 7, 9, 10, 11),
      'Литературное чтение': grades(2, 3, 4),
      'Літаратурнае чытанне': grades(2, 3, 4),
      'Английский язык': grades(3, 4, 5, 6, 7, 8, 9, 10, 11),
      'Немецкий язык': grades(3, 4, 5, 6, 7, 8, 9, 10, 11),
      'Испанский язык': grades(3, 4, 5, 6, 7, 8, 9, 10),
      'Человек и мир': grades(1, 2, 3, 4, 5),
      'Физика': grades(7, 8, 9, 10, 11),
      'Химия': grades(7, 8, 9, 10, 11),
      'История Беларуси': grades(5, 6, 7, 8, 9, 10, 11),
      'Всемирная история': grades(5, 6, 7, 8, 9, 10, 11),
      'Обществоведение': grades(9, 10, 11),
      'Биология': grades(6, 7, 8, 9, 10, 11),
      'География': grades(6, 7, 8, 9, 10, 11),
      'Информатика': grades(6, 7, 8, 9, 10, 11),
      'Искусство': grades(5, 6, 7),
      'ОБЖ': grades(7, 8),
      'Допризывная подготовка': grades(10, 11),
    },
  },
  {
    name: 'ГДЗ Онлайн Беларусь', provider: 'ГДЗ Онлайн Беларусь', domain: 'gdz-online.by', region: 'Беларусь · подтверждено', icon: providerIcons['ГДЗ Онлайн Беларусь'],
    availability: {
      'Математика': grades(2, 3, 4, 5, 6, ...middleAndSenior),
      'Русский язык': grades(2, 3, 4, 5, 6, 7, 8, 9, 10, 11),
      'Русская литература': grades(2, 3, 4, 5, 6, 7, 8, 9, 10, 11),
      'Белорусский язык': grades(2, 3, 4, 5, 6, 7, 8, 9),
      'Белорусская литература': grades(2, 3, 4, 5, 6, 7, 8, 9, 10, 11),
      'Английский язык': grades(3, 4, 6, 7, 8, 9, 10, 11),
      'Немецкий язык': grades(7),
      'Человек и мир': grades(2, 3, 4, 5),
      'Физика': grades(7, 8, 9, 10, 11),
      'Астрономия': grades(11),
      'Химия': grades(7, 8, 9, 10, 11),
      'История Беларуси': grades(5, 6, 7, 8, 9, 10, 11),
      'Всемирная история': grades(5, 6, 7, 8, 9, 10, 11),
      'Обществоведение': grades(9, 10, 11),
      'Биология': grades(6, 7, 8, 9, 10, 11),
      'География': grades(6, 7, 8, 9, 10, 11),
      'Информатика': grades(9, 10, 11),
      'Черчение': grades(10),
    },
  },
  {
    name: 'Мегарешеба', provider: 'Мегарешеба', domain: 'megaresheba.com', region: 'Беларусь · подтверждено', icon: providerIcons['Мегарешеба'],
    availability: {
      'Математика': grades(1, 2, 3, 4, 5, 6, ...middleAndSenior),
      'Русский язык': grades(2, 3, 4, 5, 6, 7, 8, 9, 10, 11),
      'Русская литература': grades(2, 5, 6, 7, 9, 10, 11),
      'Белорусский язык': grades(2, 3, 4, 5, 6, 7, 8, 9, 10, 11),
      'Белорусская литература': grades(2, 5, 6, 7, 9, 10, 11),
      'Английский язык': grades(3, 4, 5, 6, 7, 8, 9, 10, 11),
      'Немецкий язык': grades(3, 4, 5, 6, 7, 8, 9, 10, 11),
      'Французский язык': grades(7, 8, 11),
      'Испанский язык': grades(3, 4, 5, 6, 7, 8, 9, 10, 11),
      'Человек и мир': grades(1, 2, 3, 4, 5),
      'Физика': grades(6, 7, 8, 9, 10, 11),
      'Астрономия': grades(11),
      'Химия': grades(7, 8, 9, 10, 11),
      'История Беларуси': grades(5, 6, 7, 8, 9, 10, 11),
      'Всемирная история': grades(5, 6, 7, 8, 9, 10, 11),
      'Обществоведение': grades(10, 11),
      'Биология': grades(6, 7, 8, 9, 10, 11),
      'География': grades(6, 7, 8, 9, 10, 11),
      'Информатика': grades(6, 7, 8, 9, 10, 11),
      'Черчение': grades(9),
      'Медицинская подготовка': grades(10, 11),
    },
  },
]

export function providerSearchesFor(book: Book) {
  return providerSearches.filter((provider) => provider.availability[book.subject]?.includes(book.grade))
}

export function providerOptionsFor(book: Book) {
  return [...providerSearchesFor(book).map((item) => item.provider), 'Другое']
}

export function providerIconFor(provider: string) {
  return providerIcons[provider as keyof typeof providerIcons]
}

export function solutionIconFor(provider: string, url: string) {
  const knownIcon = providerIconFor(provider)
  if (knownIcon) return knownIcon
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? new URL('/favicon.ico', parsed.origin).href : undefined
  } catch {
    return undefined
  }
}
