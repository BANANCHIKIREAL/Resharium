import type { RecentVisit } from '../types'

export const RECENT_VISITS_LIMIT = 30

export type NewRecentVisit =
  | { kind: 'book'; bookId: string }
  | { kind: 'solution'; bookId: string; url: string; provider: string; task?: string }

export function recentVisitId(visit: Pick<RecentVisit, 'kind' | 'bookId' | 'url'>) {
  return `${visit.kind}:${visit.bookId}:${visit.url || ''}`
}

export function addRecentVisit(current: RecentVisit[], visit: NewRecentVisit, openedAt = new Date().toISOString()) {
  const id = recentVisitId(visit)
  return [{ ...visit, id, openedAt }, ...current.filter((item) => item.id !== id)].slice(0, RECENT_VISITS_LIMIT)
}

export function normalizeRecentVisits(value: unknown): RecentVisit[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is RecentVisit => {
    if (!item || typeof item !== 'object') return false
    const visit = item as Partial<RecentVisit>
    return typeof visit.id === 'string'
      && (visit.kind === 'book' || visit.kind === 'solution')
      && typeof visit.bookId === 'string'
      && typeof visit.openedAt === 'string'
      && Number.isFinite(Date.parse(visit.openedAt))
      && (visit.kind !== 'solution' || (typeof visit.url === 'string' && typeof visit.provider === 'string'))
  }).slice(0, RECENT_VISITS_LIMIT)
}
