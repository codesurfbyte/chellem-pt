import {
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  parseISO,
  addWeeks,
  subWeeks,
  startOfDay,
  differenceInCalendarDays,
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz'

export const DAYS_KO = ['월', '화', '수', '목', '금', '토']
export const DAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const TIME_ZONE = 'Asia/Seoul'

/** 주의 월요일 기준 시작일 반환 */
export function getWeekStart(date: Date = new Date()): Date {
  const zoned = toZonedTime(date, TIME_ZONE)
  const start = startOfWeek(zoned, { weekStartsOn: 1 })
  return fromZonedTime(start, TIME_ZONE)
}

/** 주의 날짜 배열 (월~토) */
export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 6 }, (_, i) => addDays(weekStart, i))
}

export function formatDate(date: Date | string): string {
  return formatInTimeZone(date, TIME_ZONE, 'M/d (EEE)', { locale: ko })
}

export function formatTime(dateStr: string): string {
  return formatInTimeZone(dateStr, TIME_ZONE, 'HH:mm')
}

export function formatWeekRange(weekStart: Date): string {
  const zonedStart = toZonedTime(weekStart, TIME_ZONE)
  const end = endOfWeek(zonedStart, { weekStartsOn: 1 })
  return `${formatInTimeZone(zonedStart, TIME_ZONE, 'yyyy년 M월 d일')} ~ ${formatInTimeZone(
    end,
    TIME_ZONE,
    'M월 d일'
  )}`
}

export function nextWeek(weekStart: Date): Date {
  return addWeeks(weekStart, 1)
}

export function prevWeek(weekStart: Date): Date {
  return subWeeks(weekStart, 1)
}

export function toISODateString(date: Date): string {
  return formatInTimeZone(date, TIME_ZONE, 'yyyy-MM-dd')
}

export function toKstDateKey(date: Date | string): string {
  return formatInTimeZone(date, TIME_ZONE, 'yyyy-MM-dd')
}

export function isSameDayKST(a: Date | string, b: Date | string): boolean {
  return toKstDateKey(a) === toKstDateKey(b)
}

export function buildSlotTimeKST(day: Date, time: string): Date {
  const dayKey = toKstDateKey(day)
  return fromZonedTime(`${dayKey}T${time}:00`, TIME_ZONE)
}

export function getKstDayIndex(weekStart: Date, date: Date | string): number {
  const base = startOfDay(toZonedTime(weekStart, TIME_ZONE))
  const targetDate = typeof date === 'string' ? parseISO(date) : date
  const target = startOfDay(toZonedTime(targetDate, TIME_ZONE))
  return differenceInCalendarDays(target, base)
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
