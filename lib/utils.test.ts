import { describe, it, expect } from 'vitest'
import {
  getWeekStart,
  getKstDayRange,
  getKstWeekRange,
  getKstMonthRange,
  getWeekDays,
  formatDate,
  formatTime,
  formatWeekRange,
  nextWeek,
  prevWeek,
  toISODateString,
  toKstDateKey,
  isSameDayKST,
  buildSlotTimeKST,
  getKstDayIndex,
  cn,
} from './utils'
import { parseISO } from 'date-fns'

describe('utils.ts', () => {
  const mockDate = new Date('2024-03-20T10:00:00Z') // A Wednesday

  describe('getWeekStart', () => {
    it('returns the Monday of the week in KST', () => {
      const start = getWeekStart(mockDate)
      // 2024-03-20 10:00 UTC is 2024-03-20 19:00 KST (Wednesday)
      // The Monday of that week is 2024-03-18
      expect(toKstDateKey(start)).toBe('2024-03-18')
    })
  })

  describe('getKstDayRange', () => {
    it('returns start and end of the day in KST', () => {
      const { start, end } = getKstDayRange(mockDate)
      expect(formatTime(start.toISOString())).toBe('00:00')
      expect(formatTime(end.toISOString())).toBe('23:59')
      expect(toKstDateKey(start)).toBe('2024-03-20')
      expect(toKstDateKey(end)).toBe('2024-03-20')
    })
  })

  describe('getKstWeekRange', () => {
    it('returns start (Monday) and end (Sunday) of the week', () => {
      const { start, end } = getKstWeekRange(mockDate)
      expect(toKstDateKey(start)).toBe('2024-03-18')
      expect(toKstDateKey(end)).toBe('2024-03-24')
    })
  })

  describe('getKstMonthRange', () => {
    it('returns start and end of the month', () => {
      const { start, end } = getKstMonthRange(mockDate)
      expect(toKstDateKey(start)).toBe('2024-03-01')
      expect(toKstDateKey(end)).toBe('2024-03-31')
    })
  })

  describe('getWeekDays', () => {
    it('returns 7 days starting from the given week start', () => {
      const weekStart = getWeekStart(mockDate)
      const days = getWeekDays(weekStart)
      expect(days).toHaveLength(7)
      expect(toKstDateKey(days[0])).toBe('2024-03-18')
      expect(toKstDateKey(days[6])).toBe('2024-03-24')
    })
  })

  describe('formatting functions', () => {
    it('formatDate formats date to M/d (EEE)', () => {
      expect(formatDate(mockDate)).toBe('3/20 (수)')
    })

    it('formatTime formats date to HH:mm', () => {
      expect(formatTime(mockDate.toISOString())).toBe('19:00')
    })

    it('formatWeekRange formats week range correctly', () => {
      const weekStart = getWeekStart(mockDate)
      expect(formatWeekRange(weekStart)).toBe('2024년 3월 18일 ~ 3월 24일')
    })
  })

  describe('navigation functions', () => {
    it('nextWeek adds one week', () => {
      const next = nextWeek(mockDate)
      expect(toKstDateKey(next)).toBe('2024-03-27')
    })

    it('prevWeek subtracts one week', () => {
      const prev = prevWeek(mockDate)
      expect(toKstDateKey(prev)).toBe('2024-03-13')
    })
  })

  describe('date key functions', () => {
    it('toISODateString returns yyyy-MM-dd', () => {
      expect(toISODateString(mockDate)).toBe('2024-03-20')
    })

    it('toKstDateKey returns yyyy-MM-dd', () => {
      expect(toKstDateKey(mockDate)).toBe('2024-03-20')
    })

    it('isSameDayKST returns true for same day in KST', () => {
      const dateA = new Date('2024-03-20T10:00:00Z') // 19:00 KST
      const dateB = new Date('2024-03-20T14:00:00Z') // 23:00 KST
      expect(isSameDayKST(dateA, dateB)).toBe(true)
    })
  })

  describe('buildSlotTimeKST', () => {
    it('builds a date object from day and time string', () => {
      const day = new Date('2024-03-20T10:00:00Z')
      const time = '09:00'
      const slot = buildSlotTimeKST(day, time)
      expect(formatTime(slot.toISOString())).toBe('09:00')
      expect(toKstDateKey(slot)).toBe('2024-03-20')
    })
  })

  describe('getKstDayIndex', () => {
    it('returns the day index (0-indexed) relative to week start', () => {
      const weekStart = getWeekStart(mockDate) // 2024-03-18 (Monday)
      expect(getKstDayIndex(weekStart, '2024-03-18')).toBe(0)
      expect(getKstDayIndex(weekStart, '2024-03-20')).toBe(2)
      expect(getKstDayIndex(weekStart, '2024-03-24')).toBe(6)
    })
  })

  describe('cn', () => {
    it('merges class names correctly', () => {
      expect(cn('a', 'b')).toBe('a b')
      expect(cn('a', false && 'b', 'c')).toBe('a c')
      expect(cn('a', undefined, null, 'd')).toBe('a d')
    })
  })
})
