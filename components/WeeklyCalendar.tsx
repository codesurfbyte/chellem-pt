'use client'

import { useState, useEffect } from 'react'
import {
  getWeekStart,
  getWeekDays,
  formatDate,
  formatTime,
  formatWeekRange,
  nextWeek,
  prevWeek,
  toISODateString,
  getKstDayIndex,
  cn,
} from '@/lib/utils'
import type { SlotWithMeta } from '@/lib/types'
import { parseISO, addMinutes, subHours } from 'date-fns'
import PolicyBanner from '@/components/PolicyBanner'
import { useUserSlots, useBookSlot, useCancelSlot } from '@/lib/hooks/query-hooks'

type WeeklyCalendarProps = {
  serverNow?: string
  initialUserId?: string | null
  initialSlots?: SlotWithMeta[] | null
  initialRemainingSessions?: number | null
  initialPolicy?: { bookingHours: number; cancelHours: number } | null
}

export default function WeeklyCalendar({
  serverNow,
  initialUserId,
  initialSlots,
  initialRemainingSessions,
  initialPolicy,
}: WeeklyCalendarProps) {
  const initialNow = serverNow ? new Date(serverNow) : new Date()
  const [now, setNow] = useState(() => initialNow)
  const [weekStart, setWeekStart] = useState(() => getWeekStart(initialNow))
  const [userId] = useState<string | null>(initialUserId ?? null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    setNow(new Date())
  }, [])

  const defaultPolicy = initialPolicy ?? { bookingHours: 5, cancelHours: 5 }

  const hasInitialData = !!(initialSlots && initialRemainingSessions !== undefined && initialPolicy)
  const initialData = hasInitialData
    ? { slots: initialSlots!, remainingSessions: initialRemainingSessions!, policy: defaultPolicy }
    : undefined

  const { data, isLoading, isFetching } = useUserSlots(weekStart, userId, initialData)

  const slots = data?.slots ?? []
  const remainingSessions = data?.remainingSessions ?? 0
  const policy = data?.policy ?? defaultPolicy

  const bookMutation = useBookSlot()
  const cancelMutation = useCancelSlot()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleBook = async (slotId: string) => {
    if (!userId) return
    if (remainingSessions <= 0) {
      setErrorMessage('잔여 횟수가 없습니다. 관리자에게 문의해주세요.')
      return
    }
    try {
      await bookMutation.mutateAsync(slotId)
      setErrorMessage(null)
    } catch (e: any) {
      setErrorMessage(e.message || '예약 중 오류가 발생했습니다.')
    }
  }

  const handleCancel = async (bookingId: string) => {
    try {
      await cancelMutation.mutateAsync(bookingId)
      setErrorMessage(null)
    } catch (e: any) {
      setErrorMessage(e.message || '취소 중 오류가 발생했습니다.')
    }
  }

  const actionSlotId = bookMutation.isPending
    ? (bookMutation.variables as string)
    : null

  const weekDays = getWeekDays(weekStart)

  const slotsByDay = weekDays.map((day, dayIndex) => ({
    day,
    slots: slots.filter(
      (s) => getKstDayIndex(weekStart, parseISO(s.slot_time)) === dayIndex
    ),
  }))

  const isCurrentWeek =
    toISODateString(weekStart) === toISODateString(getWeekStart(now))
  const isBookableSlot = (slot: SlotWithMeta): boolean => {
    if (slot.my_booking) return false
    if (slot.confirmed_count >= slot.max_capacity) return false
    const slotTime = parseISO(slot.slot_time)
    const bookingCutoff = subHours(slotTime, policy.bookingHours)
    const isPastSlot = now.getTime() > addMinutes(slotTime, 30).getTime()
    return now.getTime() <= bookingCutoff.getTime() && !isPastSlot
  }

  const loading = isLoading && !hasInitialData

  return (
    <div className="space-y-5">
      {errorMessage && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="shrink-0 text-red-400 hover:text-red-600"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
      )}
      {/* 주 네비게이션 */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => setWeekStart(prevWeek(weekStart))}
          disabled={isCurrentWeek}
          className={cn(
            'w-8 h-8 rounded-md flex items-center justify-center text-sm transition-all border',
            isCurrentWeek
              ? 'text-slate/30 cursor-not-allowed border-mist'
              : 'text-slate hover:text-ink hover:bg-page border-mist hover:border-mist-dark'
          )}
        >
          ←
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-ink">
            {formatWeekRange(weekStart)}
          </p>
          {isCurrentWeek && (
            <span className="text-xs text-brand font-medium">
              이번 주
            </span>
          )}
        </div>
        <button
          onClick={() => setWeekStart(nextWeek(weekStart))}
          className="w-8 h-8 rounded-md flex items-center justify-center text-sm text-slate hover:text-ink hover:bg-page border border-mist hover:border-mist-dark transition-all"
        >
          →
        </button>
      </div>

      <PolicyBanner
        bookingHours={policy.bookingHours}
        cancelHours={policy.cancelHours}
        sticky
      />

      {errorMessage && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 flex items-center justify-between gap-3">
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-red-600 shrink-0"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
      )}

      {/* 캘린더 */}
      {loading ? (
        <div className="space-y-2.5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card overflow-hidden animate-pulse">
              <div className="h-10 bg-page border-b border-mist" />
              <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-2">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-[88px] bg-page rounded-md" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {isFetching && !isLoading && (
            <p className="text-xs text-slate">업데이트 중...</p>
          )}
          {slotsByDay.map(({ day, slots: daySlots }) => (
            <div key={day.toISOString()} className="card overflow-hidden">
              {/* 날짜 헤더 — Stripe card header band */}
              <div className="px-4 py-2.5 border-b border-mist bg-page flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">
                  {formatDate(day)}
                </span>
                <span className="text-xs text-slate">
                  {daySlots.length > 0
                    ? `${daySlots.filter(isBookableSlot).length}개 예약 가능`
                    : '슬롯 없음'}
                </span>
              </div>

              {/* 슬롯 목록 */}
              <div className="p-4">
                {daySlots.length === 0 ? (
                  <p className="text-sm text-slate text-center py-3">
                    등록된 시간 슬롯이 없습니다
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {daySlots.map((slot) => {
                      const isMyBooking = !!slot.my_booking
                      const isFull =
                        slot.confirmed_count >= slot.max_capacity && !isMyBooking
                      const slotTime = parseISO(slot.slot_time)
                      const isPastSlot =
                        now.getTime() > addMinutes(slotTime, 30).getTime()
                      const bookingCutoff = subHours(slotTime, policy.bookingHours)
                      const cancelCutoff = subHours(slotTime, policy.cancelHours)
                      const isBookingClosed = now.getTime() > bookingCutoff.getTime()
                      const isCancelClosed = now.getTime() > cancelCutoff.getTime()
                      const isActioning = actionSlotId === slot.id || (cancelMutation.isPending && cancelMutation.variables === slot.my_booking?.id)
                      const isUnavailable = isFull || isPastSlot || isBookingClosed

                      return (
                        <div
                          key={slot.id}
                          className={cn(
                            'rounded-md p-3 border transition-shadow duration-150',
                            isMyBooking
                              ? 'bg-brand-soft border-brand/25'
                              : isUnavailable
                                ? 'bg-page border-mist'
                                : 'bg-surface border-mist hover:shadow-card-hover'
                          )}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span
                              className={cn(
                                'text-lg font-bold tracking-[-0.02em]',
                                isMyBooking
                                  ? 'text-brand'
                                  : isUnavailable
                                    ? 'text-slate'
                                    : 'text-ink'
                              )}
                            >
                              {formatTime(slot.slot_time)}
                            </span>
                            {isMyBooking ? (
                              <span className="badge-booked">예약됨</span>
                            ) : isFull ? (
                              <span className="badge-full">마감</span>
                            ) : isBookingClosed ? (
                              <span className="badge-full">마감</span>
                            ) : isPastSlot ? (
                              <span className="badge-full">종료</span>
                            ) : (
                              <span className="badge-available">가능</span>
                            )}
                          </div>

                          <div className="text-xs text-slate mb-3">
                            {slot.confirmed_count}/{slot.max_capacity}명
                          </div>

                          {!isPastSlot && (
                            isMyBooking ? (
                              <button
                                onClick={() => handleCancel(slot.my_booking!.id)}
                                disabled={isActioning || isCancelClosed}
                                className="w-full text-xs py-1.5 rounded-md
                                           text-brand border border-brand/25
                                           hover:bg-brand-light
                                           transition-all disabled:opacity-40"
                              >
                                {isActioning ? '처리 중...' : isCancelClosed ? '취소 불가' : '예약 취소'}
                              </button>
                            ) : !isUnavailable ? (
                              <button
                                onClick={() => handleBook(slot.id)}
                                disabled={isActioning || remainingSessions === 0 || isBookingClosed}
                                className="w-full text-xs py-1.5 rounded-md
                                           bg-brand text-white font-medium
                                           hover:bg-brand-dark
                                           transition-all disabled:opacity-40"
                              >
                                {isActioning ? '처리 중...' : remainingSessions === 0 ? '횟수 없음' : isBookingClosed ? '마감' : '예약하기'}
                              </button>
                            ) : null
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 범례 */}
      <div className="flex flex-wrap gap-5 text-xs text-slate pt-1 border-t border-mist">
        <span className="flex items-center gap-1.5 pt-3">
          <span className="w-2 h-2 rounded-sm bg-brand" /> 예약 가능
        </span>
        <span className="flex items-center gap-1.5 pt-3">
          <span className="w-2 h-2 rounded-sm bg-brand/30" /> 내 예약
        </span>
        <span className="flex items-center gap-1.5 pt-3">
          <span className="w-2 h-2 rounded-sm bg-mist-dark" /> 마감/종료
        </span>
      </div>
    </div>
  )
}
