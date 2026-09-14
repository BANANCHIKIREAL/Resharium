import { describe, expect, it } from 'vitest'
import { addRecentVisit, mergeRecentVisits, normalizeRecentVisits, RECENT_VISITS_LIMIT } from './recent'

describe('recent visits', () => {
  it('moves a repeated visit to the beginning instead of duplicating it', () => {
    const first = addRecentVisit([], { kind: 'book', bookId: 'math-7' }, '2026-09-07T10:00:00.000Z')
    const next = addRecentVisit(first, { kind: 'book', bookId: 'math-7' }, '2026-09-07T11:00:00.000Z')
    expect(next).toHaveLength(1)
    expect(next[0].openedAt).toBe('2026-09-07T11:00:00.000Z')
  })

  it('keeps only the newest 30 visits', () => {
    const visits = Array.from({ length: RECENT_VISITS_LIMIT + 5 }, (_, index) => ({
      id: `book:book-${index}:`, kind: 'book' as const, bookId: `book-${index}`, openedAt: new Date(index).toISOString(),
    }))
    const next = addRecentVisit(visits, { kind: 'book', bookId: 'newest' })
    expect(next).toHaveLength(RECENT_VISITS_LIMIT)
    expect(next[0].bookId).toBe('newest')
  })

  it('drops malformed stored data', () => {
    expect(normalizeRecentVisits([{ id: 'bad' }, null, 'text'])).toEqual([])
  })

  it('merges local and remote history and keeps the newest duplicate', () => {
    const local = [{ id: 'book:math-7:', kind: 'book' as const, bookId: 'math-7', openedAt: '2026-09-07T10:00:00.000Z' }]
    const remote = [
      { ...local[0], openedAt: '2026-09-07T12:00:00.000Z' },
      { id: 'book:physics-7:', kind: 'book' as const, bookId: 'physics-7', openedAt: '2026-09-07T11:00:00.000Z' },
    ]
    expect(mergeRecentVisits(local, remote).map((visit) => [visit.bookId, visit.openedAt])).toEqual([
      ['math-7', '2026-09-07T12:00:00.000Z'],
      ['physics-7', '2026-09-07T11:00:00.000Z'],
    ])
  })
})
