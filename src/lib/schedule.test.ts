import { describe, expect, it } from 'vitest'
import { booksForDay, parseSchedule, subjectsForLesson } from './schedule'
import type { Book } from '../types'

describe('school schedule', () => {
  it('parses Russian and Belarusian weekday headings', () => {
    const result = parseSchedule('Понедельник\n1. Математика\n2. Русский язык\nАўторак:\n1. Фізіка', 7)
    expect(result.days.monday).toEqual(['Математика', 'Русский язык'])
    expect(result.days.tuesday).toEqual(['Фізіка'])
  })

  it('matches lesson aliases to catalog subjects', () => {
    expect(subjectsForLesson('Алгебра')).toEqual(['Математика'])
    expect(subjectsForLesson('Беларуская мова')).toEqual(['Белорусский язык'])
    expect(subjectsForLesson('Физкультура')).toEqual([])
  })

  it('returns only books for the selected grade and day', () => {
    const schedule = parseSchedule('Понедельник\nАлгебра', 7)
    const books = [
      { id: '7', title: 'Алгебра', author: '', grade: 7, subject: 'Математика', color: '#000', accent: '#000' },
      { id: '8', title: 'Алгебра', author: '', grade: 8, subject: 'Математика', color: '#000', accent: '#000' },
    ] satisfies Book[]
    expect(booksForDay(schedule, 'monday', books).map((book) => book.id)).toEqual(['7'])
  })
})
