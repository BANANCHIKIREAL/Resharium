import { describe, expect, it } from 'vitest'
import { books, providerIconFor, providerOptionsFor, providerSearchesFor, solutionIconFor } from './data'

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
    expect(providerSearchesFor(section(7, 'Трудовое обучение'))).toEqual([])
    expect(providerOptionsFor(section(7, 'Трудовое обучение'))).toEqual(['Другое'])
  })

  it('does not list the textbook-only Padruchnik catalog as a GDZ provider', () => {
    expect(providerSearchesFor(section(7, 'Химия')).some((item) => item.domain === 'padruchnik.com')).toBe(false)
  })

  it('offers the verified GDZ.by source for grade 7 life safety', () => {
    expect(providerSearchesFor(section(7, 'ОБЖ')).map((item) => item.domain)).toEqual(['gdz.by'])
  })

  it('has a real favicon for every automatic provider', () => {
    for (const item of providerSearchesFor(section(7, 'Химия'))) {
      expect(providerIconFor(item.provider)).toMatch(/assets\/providers\/.+\.png$/)
    }
  })

  it('uses the source favicon for a custom solution', () => {
    expect(solutionIconFor('Другое', 'https://example.com/path/to/answer')).toBe('https://example.com/favicon.ico')
  })
})
