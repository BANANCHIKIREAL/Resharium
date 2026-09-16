import type { Book, SolutionLink, Subject } from './types'
import catalog from './catalog.generated.json'
import countryCatalog from './catalog.countries.generated.json'
import type { IconName } from './icons'
import type { CountryCode } from './lib/preferences'

export const subjects: Array<{ name: Subject; icon: IconName; color: string }> = [
  { name: 'Математика', icon: 'calculate', color: '#9c78ff' },
  { name: 'Русский язык', icon: 'spellcheck', color: '#ff6d9e' },
  { name: 'Русская литература', icon: 'import_contacts', color: '#db82ff' },
  { name: 'Белорусский язык', icon: 'language', color: '#f16464' },
  { name: 'Белорусская литература', icon: 'book_2', color: '#df6eb8' },
  { name: 'Казахский язык', icon: 'language', color: '#45d4c2' },
  { name: 'Казахская литература', icon: 'book_2', color: '#5ed6a0' },
  { name: 'Казахский язык и литература', icon: 'menu_book', color: '#4fc8a2' },
  { name: 'Русский язык и литература', icon: 'local_library', color: '#e477a8' },
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
  { name: 'Окружающий мир', icon: 'nature_people', color: '#68dda1' },
  { name: 'Естествознание', icon: 'genetics', color: '#5bd49a' },
  { name: 'Физика', icon: 'orbit', color: '#54e3a5' },
  { name: 'Астрономия', icon: 'planet', color: '#8b9cff' },
  { name: 'Химия', icon: 'experiment', color: '#ffc75f' },
  { name: 'История Беларуси', icon: 'account_balance', color: '#ff8f6b' },
  { name: 'История Казахстана', icon: 'account_balance', color: '#57cfbc' },
  { name: 'История', icon: 'history_edu', color: '#f28c62' },
  { name: 'Всемирная история', icon: 'history_edu', color: '#e98061' },
  { name: 'Обществоведение', icon: 'groups', color: '#ffac66' },
  { name: 'Обществознание', icon: 'groups', color: '#ffac66' },
  { name: 'Основы права', icon: 'account_balance', color: '#e9b65f' },
  { name: 'Самопознание', icon: 'groups', color: '#7fd6b6' },
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

// Keep genuine source covers, even when the source only provides a soft thumbnail.
// Use a verified sharper copy for the exact same edition where one is available.
const verifiedCoverOverrides = new Map([
  ['resheba-3264524c9030b0b3', 'https://gdz.by/media/english_07/demchenko-rt23/covers/cover2.webp'],
])

const unavailableCoverBookIds = new Set(['resheba-24f0a307c8866a43'])

type CatalogBook = Omit<Book, 'color' | 'accent' | 'country'> & { country?: CountryCode }

export function decorateBook(book: CatalogBook, index: number): Book {
  const subjectIndex = subjects.findIndex((item) => item.name === book.subject)
  const palette = palettes[(Math.max(subjectIndex, 0) + book.grade + index) % palettes.length]
  return {
    ...book,
    country: book.country || 'BY',
    coverUrl: verifiedCoverOverrides.get(book.id) ?? (unavailableCoverBookIds.has(book.id) ? undefined : book.coverUrl),
    subject: book.subject as Subject,
    color: palette[0],
    accent: palette[1],
    popular: book.grade === 7 || index < 8,
  }
}

const rawCatalog = [
  ...catalog.map((book) => ({ ...book, country: 'BY' as const })),
  ...countryCatalog.map((book) => ({ ...book, country: book.country as CountryCode })),
]

export const books: Book[] = rawCatalog.map((book, index) => decorateBook({ ...book, subject: book.subject as Subject }, index))

export const demoSolutions: SolutionLink[] = []

type Availability = Partial<Record<Subject, number[]>>
export type ProviderSearch = { name: string; provider: string; domain: string; country: CountryCode; region: string; icon: string; availability: Availability }

const providerIcons = {
  'Решёба': new URL('../assets/providers/resheba.png', import.meta.url).href,
  'GDZ.by': new URL('../assets/providers/gdz-by.png', import.meta.url).href,
  'ГДЗ Онлайн Беларусь': new URL('../assets/providers/gdz-online.png', import.meta.url).href,
  'Мегарешеба': new URL('../assets/providers/megaresheba.png', import.meta.url).href,
  'OTVETKZ': 'https://otvetkz.com/favicon.ico',
  'ГДЗ Знания KZ': 'https://gdzznaniya.net/favicon.ico',
  '5BAGA': 'https://5baga.com/favicon.ico',
  'GDZ.ru': 'https://gdz.ru/favicon.ico',
  'РешУтка': 'https://reshutka.ru/favicon.ico',
  'Reshak.ru': 'https://reshak.ru/favicon.ico',
  'ВсеГДЗ': 'https://www.vsegdz.ru/favicon.ico',
  'ГДЗ 1': 'https://gdz1.com/favicon.ico',
  'GDZJ': 'https://gdzj.ru/favicon.ico',
} as const

const grades = (...values: number[]) => values
const middleAndSenior = grades(7, 8, 9, 10, 11)
const allGrades = grades(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11)
const russianCommon: Availability = {
  'Математика': allGrades,
  'Русский язык': allGrades,
  'Русская литература': allGrades,
  'Литературное чтение': grades(1, 2, 3, 4),
  'Английский язык': allGrades,
  'Немецкий язык': allGrades,
  'Французский язык': allGrades,
  'Испанский язык': allGrades,
  'Физика': grades(5, 6, 7, 8, 9, 10, 11),
  'Химия': grades(7, 8, 9, 10, 11),
  'История': grades(5, 6, 7, 8, 9, 10, 11),
  'Всемирная история': grades(5, 6, 7, 8, 9, 10, 11),
  'Обществознание': grades(5, 6, 7, 8, 9, 10, 11),
  'Биология': grades(5, 6, 7, 8, 9, 10, 11),
  'География': grades(5, 6, 7, 8, 9, 10, 11),
  'Информатика': allGrades,
  'Окружающий мир': grades(1, 2, 3, 4),
}

export const providerSearches: ProviderSearch[] = [
  {
    name: 'Решёба · основной', provider: 'Решёба', domain: 'resheba.top', country: 'BY', region: 'Беларусь · подтверждено', icon: providerIcons['Решёба'],
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
    name: 'GDZ.by', provider: 'GDZ.by', domain: 'gdz.by', country: 'BY', region: 'Беларусь · подтверждено', icon: providerIcons['GDZ.by'],
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
    name: 'ГДЗ Онлайн Беларусь', provider: 'ГДЗ Онлайн Беларусь', domain: 'gdz-online.by', country: 'BY', region: 'Беларусь · подтверждено', icon: providerIcons['ГДЗ Онлайн Беларусь'],
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
    name: 'Мегарешеба', provider: 'Мегарешеба', domain: 'megaresheba.com', country: 'BY', region: 'Беларусь · подтверждено', icon: providerIcons['Мегарешеба'],
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
  {
    name: 'OTVETKZ · Казахстан', provider: 'OTVETKZ', domain: 'otvetkz.com', country: 'KZ', region: 'Казахстан · подтверждено', icon: providerIcons.OTVETKZ,
    availability: {
      'Математика': grades(5, 6, 7, 8, 9, 10, 11),
      'Русский язык': grades(5, 6, 7, 8, 9, 11),
      'Русская литература': grades(5, 6, 7, 8, 9, 11),
      'Английский язык': grades(5, 6, 7, 8, 9, 10, 11),
      'Физика': grades(7, 8, 9, 11),
      'Химия': grades(7, 8, 9, 10, 11),
      'Биология': grades(7, 8, 9),
      'Всемирная история': grades(5, 6, 7, 8, 9),
      'География': grades(7, 8, 9),
      'Информатика': grades(5, 6, 7),
    },
  },
  {
    name: 'ГДЗ Знания · Казахстан', provider: 'ГДЗ Знания KZ', domain: 'gdzznaniya.net', country: 'KZ', region: 'Казахстан · подтверждено', icon: providerIcons['ГДЗ Знания KZ'],
    availability: {
      'Математика': grades(5, 6, 7, 8, 9, 10, 11),
      'Русский язык': grades(5, 6, 7, 11),
      'Русская литература': grades(5, 6, 7, 11),
      'Английский язык': grades(5, 6, 7, 10),
      'Физика': grades(7, 8, 9, 10, 11),
      'Химия': grades(7, 8, 9, 10),
      'Биология': grades(7),
      'География': grades(7),
    },
  },
  {
    name: '5BAGA · Казахстан', provider: '5BAGA', domain: '5baga.com', country: 'KZ', region: 'Казахстан · подтверждено', icon: providerIcons['5BAGA'],
    availability: { 'Математика': grades(2, 3, 4) },
  },
  {
    name: 'GDZ.ru · Россия', provider: 'GDZ.ru', domain: 'gdz.ru', country: 'RU', region: 'Россия · подтверждено', icon: providerIcons['GDZ.ru'],
    availability: {
      'Математика': grades(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11),
      'Русский язык': grades(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11),
      'Русская литература': grades(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11),
      'Литературное чтение': grades(1, 2, 3, 4),
      'Английский язык': grades(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11),
      'Немецкий язык': grades(2, 3, 4, 5, 6, 7, 8, 9, 10, 11),
      'Французский язык': grades(2, 3, 4, 5, 6, 7, 8, 9, 10, 11),
      'Испанский язык': grades(2, 3, 4, 5, 6, 7, 8, 9, 10, 11),
      'Китайский язык': grades(5, 6, 7),
      'Физика': grades(5, 6, 7, 8, 9, 10, 11),
      'Химия': grades(7, 8, 9, 10, 11),
      'Биология': grades(5, 6, 7, 8, 9, 10, 11),
      'География': grades(5, 6, 7, 8, 9, 10, 11),
      'Информатика': grades(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11),
      'Искусство': grades(5, 6, 7, 8, 9),
      'Музыка': grades(1, 2, 3, 4, 5, 6, 7),
      'ОБЖ': grades(5, 6, 7, 8, 9, 10, 11),
    },
  },
  {
    name: 'РешУтка · Россия', provider: 'РешУтка', domain: 'reshutka.ru', country: 'RU', region: 'Россия · подтверждено', icon: providerIcons['РешУтка'],
    availability: {
      'Математика': grades(1, 2, 3, 4, 5, 6, 7, 8, 9),
      'Русский язык': grades(1, 2, 3, 4, 5, 6, 7, 8, 9),
      'Русская литература': grades(5, 6, 7, 8),
      'Литературное чтение': grades(1, 2, 3, 4),
      'Английский язык': grades(2, 3, 4, 5, 6, 7, 8, 9),
      'Физика': grades(7),
      'Биология': grades(5, 6, 8, 9),
      'География': grades(8),
      'Обществоведение': grades(6, 7, 8, 9, 10, 11),
    },
  },
  {
    name: 'Reshak.ru · Россия', provider: 'Reshak.ru', domain: 'reshak.ru', country: 'RU', region: 'Россия · подтверждено', icon: providerIcons['Reshak.ru'], availability: russianCommon,
  },
  {
    name: 'ВсеГДЗ · Россия', provider: 'ВсеГДЗ', domain: 'vsegdz.ru', country: 'RU', region: 'Россия · подтверждено', icon: providerIcons['ВсеГДЗ'], availability: russianCommon,
  },
  {
    name: 'ГДЗ 1 · Россия', provider: 'ГДЗ 1', domain: 'gdz1.com', country: 'RU', region: 'Россия · подтверждено', icon: providerIcons['ГДЗ 1'], availability: russianCommon,
  },
  {
    name: 'GDZJ · Россия', provider: 'GDZJ', domain: 'gdzj.ru', country: 'RU', region: 'Россия · подтверждено', icon: providerIcons.GDZJ, availability: russianCommon,
  },
]

export function providerSearchesFor(book: Book, country: CountryCode = 'BY') {
  return providerSearches.filter((provider) => provider.country === country && provider.availability[book.subject]?.includes(book.grade))
}

export function providerOptionsFor(book: Book, country: CountryCode = 'BY') {
  return [...new Set([...providerSearchesFor(book, country).map((item) => item.provider), 'Другое'])]
}

export function providerBookSearchUrl(book: Book, domain: string, task = '') {
  const specificMathSubject = book.title.match(/^(Алгебра|Геометрия)\b/i)?.[1]
  const subject = specificMathSubject || book.subject
  const terms = [`site:${domain}`, subject, `${book.grade} класс`, task ? `${task} решение` : 'ГДЗ'].filter(Boolean)
  return `https://www.google.com/search?q=${encodeURIComponent(terms.join(' '))}`
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
