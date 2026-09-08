import type { Book, ScheduleDayId, SchoolSchedule, Subject } from '../types'

export const SCHEDULE_DAYS: Array<{ id: ScheduleDayId; label: string; short: string }> = [
  { id: 'monday', label: 'Понедельник', short: 'Пн' },
  { id: 'tuesday', label: 'Вторник', short: 'Вт' },
  { id: 'wednesday', label: 'Среда', short: 'Ср' },
  { id: 'thursday', label: 'Четверг', short: 'Чт' },
  { id: 'friday', label: 'Пятница', short: 'Пт' },
  { id: 'saturday', label: 'Суббота', short: 'Сб' },
]

const dayAliases: Record<ScheduleDayId, RegExp> = {
  monday: /^(понедельник|панядзелак)(?=\s|:|$)/i,
  tuesday: /^(вторник|аўторак|ауторак)(?=\s|:|$)/i,
  wednesday: /^(среда|серада)(?=\s|:|$)/i,
  thursday: /^(четверг|чацвер)(?=\s|:|$)/i,
  friday: /^(пятница|пятніца)(?=\s|:|$)/i,
  saturday: /^(суббота|субота)(?=\s|:|$)/i,
}

const lessonAliases: Array<[RegExp, Subject[]]> = [
  [/(алгебр|геометр|математ)/i, ['Математика']],
  [/(русск.*литератур|рус.*лит)/i, ['Русская литература']],
  [/(русск.*язык|рус.*яз)/i, ['Русский язык']],
  [/(белорус.*литератур|беларус.*літаратур|бел.*лит)/i, ['Белорусская литература']],
  [/(белорус.*язык|беларус.*мова|бел.*яз)/i, ['Белорусский язык']],
  [/(літаратурнае чытанне)/i, ['Літаратурнае чытанне']],
  [/(литературное чтение)/i, ['Литературное чтение']],
  [/(английск|англ\.?\s*яз)/i, ['Английский язык']],
  [/(немецк)/i, ['Немецкий язык']],
  [/(французск)/i, ['Французский язык']],
  [/(испанск)/i, ['Испанский язык']],
  [/(китайск)/i, ['Китайский язык']],
  [/(человек и мир|чалавек і свет)/i, ['Человек и мир']],
  [/(физик|фізік)/i, ['Физика']],
  [/(астроном)/i, ['Астрономия']],
  [/(хими)/i, ['Химия']],
  [/(истори.*беларус|гісторы.*беларус)/i, ['История Беларуси']],
  [/(всемирн.*истори|сусветн.*гісторы)/i, ['Всемирная история']],
  [/(обществовед|грамадазнаў)/i, ['Обществоведение']],
  [/(биолог|біялог)/i, ['Биология']],
  [/(географ|геаграф)/i, ['География']],
  [/(информат|інфармат)/i, ['Информатика']],
  [/(изобразитель|изо\b|выяўленч)/i, ['Изобразительное искусство']],
  [/(искусств|мастацтв)/i, ['Искусство']],
  [/(музык|музык)/i, ['Музыка']],
  [/(трудов|працоўн.*навуч)/i, ['Трудовое обучение']],
  [/(обж|безопасност.*жизн)/i, ['ОБЖ']],
  [/(черчен|чарчэн)/i, ['Черчение']],
  [/(допризыв|дапрызыў)/i, ['Допризывная подготовка']],
  [/(медицинск.*подготов|медыцынск.*падрых)/i, ['Медицинская подготовка']],
]

export function emptyScheduleDays(): Record<ScheduleDayId, string[]> {
  return { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [] }
}

function cleanLesson(line: string) {
  return line
    .replace(/^\s*(?:урок\s*)?\d{1,2}\s*[).:\-–—]?\s*/i, '')
    .replace(/^\s*\d{1,2}[:.]\d{2}\s*[-–—]\s*\d{1,2}[:.]\d{2}\s*/i, '')
    .replace(/[|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseSchedule(rawText: string, grade: number): SchoolSchedule {
  const days = emptyScheduleDays()
  let activeDay: ScheduleDayId | null = null
  const normalized = rawText.replace(/\r/g, '').replace(/([А-ЯЁІЎ][а-яёіў]+)\s*:/g, '\n$1:\n')

  for (const rawLine of normalized.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue
    const matchedDay = SCHEDULE_DAYS.find(({ id }) => dayAliases[id].test(line))
    if (matchedDay) {
      activeDay = matchedDay.id
      const remainder = line.replace(dayAliases[activeDay], '').replace(/^\s*[:\-–—]\s*/, '')
      if (remainder) days[activeDay].push(...remainder.split(/[;,]/).map(cleanLesson).filter(Boolean))
      continue
    }
    if (!activeDay) continue
    const pieces = line.includes(';') ? line.split(';') : [line]
    days[activeDay].push(...pieces.map(cleanLesson).filter((lesson) => lesson.length > 1))
  }

  return { grade, days, rawText, updatedAt: new Date().toISOString() }
}

export function subjectsForLesson(lesson: string): Subject[] {
  return lessonAliases.find(([pattern]) => pattern.test(lesson))?.[1] || []
}

export function booksForDay(schedule: SchoolSchedule, day: ScheduleDayId, books: Book[]) {
  const subjects = new Set(schedule.days[day].flatMap(subjectsForLesson))
  return books.filter((book) => book.grade === schedule.grade && subjects.has(book.subject))
}

export function currentScheduleDay(): ScheduleDayId {
  const day = new Date().getDay()
  return SCHEDULE_DAYS[Math.min(Math.max(day - 1, 0), 5)].id
}

export function isValidSchedule(value: unknown): value is SchoolSchedule {
  if (!value || typeof value !== 'object') return false
  const stored = value as Partial<SchoolSchedule>
  return Number.isInteger(stored.grade) && Boolean(stored.days) && SCHEDULE_DAYS.every(({ id }) => Array.isArray(stored.days?.[id]))
}
