import {
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  parseISO,
  addWeeks,
  subWeeks,
} from 'date-fns'
import { ko } from 'date-fns/locale'

export const DAYS_KO = ['월', '화', '수', '목', '금', '토']
export const DAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** 주의 월요일 기준 시작일 반환 */
export function getWeekStart(date: Date = new Date()): Date {
  return startOfWeek(date, { weekStartsOn: 1 })
}

/** 주의 날짜 배열 (월~토) */
export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 6 }, (_, i) => addDays(weekStart, i))
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'M/d (EEE)', { locale: ko })
}

export function formatTime(dateStr: string): string {
  return format(parseISO(dateStr), 'HH:mm')
}

export function formatWeekRange(weekStart: Date): string {
  const end = endOfWeek(weekStart, { weekStartsOn: 1 })
  return `${format(weekStart, 'yyyy년 M월 d일')} ~ ${format(end, 'M월 d일')}`
}

export function nextWeek(weekStart: Date): Date {
  return addWeeks(weekStart, 1)
}

export function prevWeek(weekStart: Date): Date {
  return subWeeks(weekStart, 1)
}

export function toISODateString(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
