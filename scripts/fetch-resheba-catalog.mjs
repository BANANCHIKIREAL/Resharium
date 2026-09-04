import { createHash } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const origin = 'https://resheba.top'

function decode(value) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/\s+/g, ' ')
    .trim()
}

function subjectFor(title) {
  const value = title.toLocaleLowerCase('ru-BY')
  const rules = [
    [/всемирн.*истор|сусветн.*гістор/, 'Всемирная история'],
    [/истори.*беларус|гісторы.*беларус/, 'История Беларуси'],
    [/истори|гістор/, 'Всемирная история'],
    [/русск.*литератур/, 'Русская литература'],
    [/белорусск.*литератур|беларус.*літаратур/, 'Белорусская литература'],
    [/літаратурн.*чытан/, 'Літаратурнае чытанне'],
    [/литературн.*чтен/, 'Литературное чтение'],
    [/навучанн.*грамац/, 'Навучанне грамаце'],
    [/обучен.*грамот/, 'Обучение грамоте'],
    [/белорусск.*язык|беларус.*мова|бел\.\s*яз/, 'Белорусский язык'],
    [/русск.*язык|рус\.\s*яз/, 'Русский язык'],
    [/английск.*язык|англ\.\s*яз|english|activity book/, 'Английский язык'],
    [/немецк.*язык|нем\.\s*яз|deutsch/, 'Немецкий язык'],
    [/французск.*язык|fran[cç]ais/, 'Французский язык'],
    [/испанск.*язык|espa[nñ]ol/, 'Испанский язык'],
    [/китайск.*язык/, 'Китайский язык'],
    [/человек.*мир|чалавек.*свет/, 'Человек и мир'],
    [/алгебр|геометр|математ/, 'Математика'],
    [/физик/, 'Физика'],
    [/астроном/, 'Астрономия'],
    [/хими|хімі/, 'Химия'],
    [/обществовед|грамадазнаў/, 'Обществоведение'],
    [/биолог|біялог/, 'Биология'],
    [/географ|геаграф/, 'География'],
    [/информат|інфармат/, 'Информатика'],
    [/изобразительн.*искусств|выяўленч.*мастацтв/, 'Изобразительное искусство'],
    [/искусств|мастацтв/, 'Искусство'],
    [/музык|музык/, 'Музыка'],
    [/трудов.*обуч|працоўн.*навуч/, 'Трудовое обучение'],
    [/обж|безопасност.*жизн/, 'ОБЖ'],
    [/черчен|чарчэн/, 'Черчение'],
    [/допризыв|дапрызыў/, 'Допризывная подготовка'],
    [/медицинск.*подготов|медыцынск.*падрыхт/, 'Медицинская подготовка'],
  ]
  return rules.find(([pattern]) => pattern.test(value))?.[1]
}

function field(card, className) {
  return decode(card.match(new RegExp(`<[^>]+class=["'][^"']*${className}[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'i'))?.[1] || '')
}

const books = []
// На Resheba.top сейчас опубликованы страницы каталогов со 2 по 11 класс.
for (let grade = 2; grade <= 11; grade += 1) {
  const pageUrl = `${origin}/gdz/${grade}-klass`
  const response = await fetch(pageUrl, { headers: { 'user-agent': 'Resharium catalog updater/1.0 (+https://github.com/BANANCHIKIREAL/Resharium)' } })
  if (!response.ok) throw new Error(`${pageUrl}: HTTP ${response.status}`)
  const html = await response.text()
  const cards = html.match(/<a[^>]+class="card__link card__inner"[\s\S]*?<\/a>/gi) || []

  for (const card of cards) {
    const href = card.match(/<a[^>]+class="card__link card__inner"[^>]+href="([^"]+)"/i)?.[1]
    const cover = card.match(/<img[^>]+class="card__poster"[^>]+src="([^"]+)"/i)?.[1]
    const title = field(card, 'card__title')
    if (!href || !title) continue
    const subject = subjectFor(title)
    if (!subject) throw new Error(`Не удалось определить предмет: ${grade} класс — ${title}`)
    const author = field(card, 'card__authors')
    const yearText = field(card, 'card__year')
    const year = Number(yearText.match(/(?:19|20)\d{2}/)?.[0]) || undefined
    const sourceUrl = new URL(href, origin).href
    books.push({
      id: `resheba-${createHash('sha1').update(sourceUrl).digest('hex').slice(0, 16)}`,
      title,
      author: author || 'Автор не указан',
      grade,
      subject,
      ...(year ? { year } : {}),
      ...(cover ? { coverUrl: new URL(cover, origin).href } : {}),
      sourceUrl,
      sourceName: 'Решёба',
    })
  }
}

const unique = [...new Map(books.map((book) => [book.sourceUrl, book])).values()]
if (!unique.length) throw new Error('Каталог пуст: структура сайта могла измениться')

const output = resolve('src/catalog.generated.json')
await writeFile(output, `${JSON.stringify(unique, null, 2)}\n`, 'utf8')
const perGrade = Object.fromEntries(Array.from({ length: 11 }, (_, index) => {
  const grade = index + 1
  return [grade, unique.filter((book) => book.grade === grade).length]
}))
console.log(`Сохранено ${unique.length} учебников: ${output}`)
console.log(perGrade)
