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

  it('does not claim a labor-training GDZ exists', () => {
    expect(books.some((item) => item.grade === 7 && item.subject === 'Трудовое обучение')).toBe(false)
  })

  it('does not list the textbook-only Padruchnik catalog as a GDZ provider', () => {
    expect(providerSearchesFor(section(7, 'Химия')).some((item) => item.domain === 'padruchnik.com')).toBe(false)
  })

  it('contains the complete current Resheba catalog snapshot', () => {
    expect(books).toHaveLength(153)
    expect(books.filter((item) => item.grade === 7)).toHaveLength(22)
    expect(section(7, 'Химия').sourceUrl).toMatch(/^https:\/\/resheba\.top\//)
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

  it('builds a textbook-specific search for every alternative provider', () => {
    const book = section(7, 'Химия')
    for (const provider of providerSearchesFor(book)) {
      const url = new URL(providerBookSearchUrl(book, provider.domain))
      const query = url.searchParams.get('q') || ''
      expect(query).toContain(`site:${provider.domain}`)
      expect(query).toContain(book.title)
      expect(query).not.toBe(`site:${provider.domain}`)
    }
  })

  it('uses the source favicon for a custom solution', () => {
    expect(solutionIconFor('Другое', 'https://example.com/path/to/answer')).toBe('https://example.com/favicon.ico')
  })
})
