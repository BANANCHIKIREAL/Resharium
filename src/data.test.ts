import { describe, expect, it } from 'vitest'
import { books, providerBookSearchUrl, providerIconFor, providerSearchesFor, solutionIconFor } from './data'

function section(grade: number, subject: string) {
  const book = books.find((item) => item.grade === grade && item.subject === subject)
  if (!book) throw new Error(`Missing section: ${grade} ${subject}`)
  return book
}

describe('verified provider availability', () => {
  it('offers Resheba for chemistry in grade 7', () => {
    expect(providerSearchesFor(section(7, 'Химия')).some((item) => item.domain === 'resheba.top')).toBe(true)
  })

  it('keeps providers separated by the selected country', () => {
    const chemistry = section(7, 'Химия')
    expect(providerSearchesFor(chemistry, 'BY').map((item) => item.domain)).toContain('resheba.top')
    expect(providerSearchesFor(chemistry, 'KZ').map((item) => item.domain)).toEqual(expect.arrayContaining(['otvetkz.com', 'gdzznaniya.net']))
    expect(providerSearchesFor(chemistry, 'RU').map((item) => item.domain)).toContain('gdz.ru')
    expect(providerSearchesFor(chemistry, 'KZ').some((item) => item.country === 'BY')).toBe(false)
  })

  it('offers the expanded verified source set for country textbooks', () => {
    const kazakhstanPrimary = books.find((item) => item.country === 'KZ' && item.grade === 3 && item.subject === 'Математика')
    const russiaSecondary = books.find((item) => item.country === 'RU' && item.grade === 7 && item.subject === 'Математика')
    if (!kazakhstanPrimary || !russiaSecondary) throw new Error('Missing country textbook fixtures')
    expect(providerSearchesFor(kazakhstanPrimary, 'KZ').map((item) => item.domain)).toContain('5baga.com')
    expect(providerSearchesFor(russiaSecondary, 'RU').map((item) => item.domain)).toEqual(expect.arrayContaining(['gdz.ru', 'reshutka.ru', 'reshak.ru', 'vsegdz.ru', 'gdz1.com', 'gdzj.ru']))
  })

  it('does not claim a labor-training GDZ exists', () => {
    expect(books.some((item) => item.grade === 7 && item.subject === 'Трудовое обучение')).toBe(false)
  })

  it('does not list the textbook-only Padruchnik catalog as a GDZ provider', () => {
    expect(providerSearchesFor(section(7, 'Химия')).some((item) => item.domain === 'padruchnik.com')).toBe(false)
  })

  it('contains the complete current Resheba catalog snapshot', () => {
    expect(books.filter((item) => item.country === 'BY')).toHaveLength(153)
    expect(books.filter((item) => item.country === 'BY' && item.grade === 7)).toHaveLength(22)
    expect(section(7, 'Химия').sourceUrl).toMatch(/^https:\/\/resheba\.top\//)
  })

  it('keeps separate textbook catalogs for every supported country', () => {
    expect(books.filter((item) => item.country === 'KZ')).toHaveLength(200)
    expect(books.filter((item) => item.country === 'RU')).toHaveLength(506)
    expect(books.find((item) => item.country === 'KZ' && item.grade === 7)?.sourceUrl).toMatch(/^https:\/\/otvetkz\.com\//)
    expect(books.find((item) => item.country === 'RU' && item.grade === 7)?.sourceUrl).toMatch(/^https:\/\/reshak\.ru\//)
  })

  it('keeps genuine covers and uses a verified sharper copy when available', () => {
    expect(books.find((item) => item.id === 'resheba-460d25eaefa15b39')?.coverUrl).toBe('https://resheba.top/_pu/2/36771776.jpg')
    expect(books.find((item) => item.id === 'resheba-3264524c9030b0b3')?.coverUrl).toBe('https://gdz.by/media/english_07/demchenko-rt23/covers/cover2.webp')
    expect(books.find((item) => item.id === 'resheba-24f0a307c8866a43')?.coverUrl).toBeUndefined()
    expect(books.find((item) => item.id === 'resheba-1c15ec57ae4cd5d8')?.coverUrl).toBe('https://resheba.top/_pu/0/57330604.jpg')
  })

  it('has a real favicon for every automatic provider', () => {
    for (const item of providerSearchesFor(section(7, 'Химия'))) {
      expect(providerIconFor(item.provider)).toMatch(/assets\/providers\/.+\.png$/)
    }
  })

  it('builds a concise catalog search for every alternative provider', () => {
    const book = section(7, 'Химия')
    for (const provider of providerSearchesFor(book)) {
      const url = new URL(providerBookSearchUrl(book, provider.domain))
      const query = url.searchParams.get('q') || ''
      expect(query).toContain(`site:${provider.domain}`)
      expect(query).toContain(book.subject)
      expect(query).toContain('7 класс')
      expect(query).not.toContain(book.author)
      expect(query).not.toBe(`site:${provider.domain}`)
    }
  })

  it('does not duplicate the class or author from a verbose book title', () => {
    const book = books.find((item) => item.country === 'BY' && item.title.includes('Математика 2 класс Чеботаревская'))
    if (!book) throw new Error('Missing verbose title fixture')
    const query = new URL(providerBookSearchUrl(book, 'gdz.by')).searchParams.get('q') || ''
    expect(query).toBe('site:gdz.by Математика 2 класс ГДЗ')
    expect(query).not.toContain('Чеботаревская')
    expect(query.match(/2 класс/g)).toHaveLength(1)
  })

  it('does not search Kazakhstan providers by a Belarusian textbook author', () => {
    const book = section(7, 'Химия')
    const url = new URL(providerBookSearchUrl(book, 'otvetkz.com'))
    const query = url.searchParams.get('q') || ''
    expect(query).toContain('Химия')
    expect(query).toContain('7 класс')
    expect(query).not.toContain(book.author)
  })

  it('uses the source favicon for a custom solution', () => {
    expect(solutionIconFor('Другое', 'https://example.com/path/to/answer')).toBe('https://example.com/favicon.ico')
  })
})
