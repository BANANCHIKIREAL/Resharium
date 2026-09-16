import { createHash } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const userAgent = 'Resharium catalog updater/1.0 (+https://github.com/BANANCHIKIREAL/Resharium)'

function decode(value = '') {
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

async function html(url) {
  const response = await fetch(url, { headers: { 'user-agent': userAgent } })
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
  return response.text()
}

function idFor(prefix, url) {
  return `${prefix}-${createHash('sha1').update(url).digest('hex').slice(0, 16)}`
}

const kazakhstanSubject = (title) => {
  const rules = [
    [/^Казахский язык и литература/i, 'Казахский язык и литература'],
    [/^Русский язык и литература/i, 'Русский язык и литература'],
    [/^Казахская литература/i, 'Казахская литература'],
    [/^Русская литература/i, 'Русская литература'],
    [/^История Казахстана/i, 'История Казахстана'],
    [/^Всемирная история/i, 'Всемирная история'],
    [/^Английский язык/i, 'Английский язык'],
    [/^Казахский язык/i, 'Казахский язык'],
    [/^Русский язык/i, 'Русский язык'],
    [/^Естествознание/i, 'Естествознание'],
    [/^Информатика/i, 'Информатика'],
    [/^Самопознание/i, 'Самопознание'],
    [/^Основы права/i, 'Основы права'],
    [/^(?:Математика|Алгебра|Геометрия)/i, 'Математика'],
    [/^Биология/i, 'Биология'],
    [/^География/i, 'География'],
    [/^Физика/i, 'Физика'],
    [/^Химия/i, 'Химия'],
  ]
  return rules.find(([pattern]) => pattern.test(title))?.[1]
}

const russianSubjects = {
  math: ['Математика', 'Математика'],
  algebra: ['Алгебра', 'Математика'],
  geometry: ['Геометрия', 'Математика'],
  russian: ['Русский язык', 'Русский язык'],
  chtenie: ['Литературное чтение', 'Литературное чтение'],
  english: ['Английский язык', 'Английский язык'],
  okruzhaushiy_mir: ['Окружающий мир', 'Окружающий мир'],
  fizika: ['Физика', 'Физика'],
  chemistry: ['Химия', 'Химия'],
  history: ['История', 'История'],
  biologia: ['Биология', 'Биология'],
  geography: ['География', 'География'],
  informatika: ['Информатика', 'Информатика'],
  obshestvo: ['Обществознание', 'Обществознание'],
  literatura: ['Литература', 'Русская литература'],
}

async function fetchKazakhstan() {
  const books = []
  for (let grade = 2; grade <= 4; grade += 1) {
    const pageUrl = `https://5baga.com/matematika-${grade}-class/`
    const page = await html(pageUrl)
    const cards = page.match(/<a[^>]+class="book"[\s\S]*?<\/a>/gi) || []
    for (const card of cards) {
      const href = card.match(/href="([^"]+)"/i)?.[1]
      const cover = card.match(/<img[^>]+src="([^"]+)"[^>]+class="cover"/i)?.[1]
      const title = decode(card.match(/class="book-title">([\s\S]*?)<\/p>/i)?.[1])
      const author = decode(card.match(/class="authors">[\s\S]*?<b>Авторы?:<\/b>([\s\S]*?)<\/span>/i)?.[1])
      const year = Number(decode(card.match(/class="year">([\s\S]*?)<\/span>/i)?.[1]).match(/(?:19|20)\d{2}/)?.[0]) || undefined
      if (!href || !title) continue
      const sourceUrl = new URL(href, pageUrl).href
      books.push({
        id: idFor('5baga', sourceUrl),
        title,
        author: author || 'Автор не указан',
        grade,
        subject: 'Математика',
        country: 'KZ',
        ...(year ? { year } : {}),
        ...(cover ? { coverUrl: new URL(cover, pageUrl).href } : {}),
        sourceUrl,
        sourceName: '5BAGA',
      })
    }
  }
  for (let grade = 5; grade <= 11; grade += 1) {
    const pageUrl = `https://otvetkz.com/${grade}-class/`
    const page = await html(pageUrl)
    const cards = page.match(/<a class="book-item"[\s\S]*?<\/a>/gi) || []
    for (const card of cards) {
      const href = card.match(/href="([^"]+)"/i)?.[1]
      const cover = card.match(/<img[^>]+src="([^"]+)"[^>]+class="cover"/i)?.[1]
      const title = decode(card.match(/<h3>([\s\S]*?)<\/h3>/i)?.[1])
      const author = decode(card.match(/<b>Авторы?:<\/b>([\s\S]*?)<\/span>/i)?.[1])
      const year = Number(decode(card.match(/<b>Год:<\/b>([\s\S]*?)<\/span>/i)?.[1]).match(/(?:19|20)\d{2}/)?.[0]) || undefined
      if (!href || !title) continue
      const subject = kazakhstanSubject(title)
      if (!subject) throw new Error(`Не удалось определить предмет Казахстана: ${grade} класс — ${title}`)
      const sourceUrl = new URL(href, pageUrl).href
      books.push({
        id: idFor('otvetkz', sourceUrl),
        title,
        author: author || 'Автор не указан',
        grade,
        subject,
        country: 'KZ',
        ...(year ? { year } : {}),
        ...(cover ? { coverUrl: new URL(cover, pageUrl).href } : {}),
        sourceUrl,
        sourceName: 'OTVETKZ',
      })
    }
  }
  return books
}

async function fetchRussia() {
  const books = []
  for (let grade = 3; grade <= 11; grade += 1) {
    const pageUrl = `https://reshak.ru/tag/${grade}klass.html`
    const page = await html(pageUrl)
    const cards = page.match(/<article class="main_gdz-div"[\s\S]*?<\/article>/gi) || []
    for (const card of cards) {
      const sourceKey = card.match(/data-subject="([^"]+)"/i)?.[1]
      const subjectInfo = sourceKey ? russianSubjects[sourceKey] : undefined
      const href = card.match(/<a[^>]+href="([^"]+)"/i)?.[1]
      const cover = card.match(/<img[^>]+class="tagImg"[^>]+src="([^"]+)"/i)?.[1]
      const label = decode(card.match(/class="subjectName">([\s\S]*?)<\/p>/i)?.[1])
      const author = decode(card.match(/class="author">([\s\S]*?)<\/div>/i)?.[1])
      const year = Number(decode(card.match(/class="bookYear"[\s\S]*?<\/div>/i)?.[0]).match(/(?:19|20)\d{2}/)?.[0]) || undefined
      if (!href || !label || !subjectInfo) continue
      const sourceUrl = new URL(href, pageUrl).href
      books.push({
        id: idFor('reshak', sourceUrl),
        title: `${subjectInfo[0]} ${grade} класс · ${label}`,
        author: author || label,
        grade,
        subject: subjectInfo[1],
        country: 'RU',
        ...(year ? { year } : {}),
        ...(cover ? { coverUrl: new URL(cover, pageUrl).href } : {}),
        sourceUrl,
        sourceName: 'Reshak.ru',
      })
    }
  }
  return books
}

const books = [...await fetchKazakhstan(), ...await fetchRussia()]
const unique = [...new Map(books.map((book) => [book.sourceUrl, book])).values()]
if (!unique.length) throw new Error('Каталоги стран пусты: структура сайтов могла измениться')

const output = resolve('src/catalog.countries.generated.json')
await writeFile(output, `${JSON.stringify(unique, null, 2)}\n`, 'utf8')
console.log(`Сохранено ${unique.length} учебников: ${output}`)
console.log(Object.fromEntries(['KZ', 'RU'].map((country) => [country, unique.filter((book) => book.country === country).length])))
