import { describe, expect, it } from 'vitest'
import { addRecentVisit, normalizeRecentVisits, RECENT_VISITS_LIMIT } from './recent'

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
})
