'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
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
import type { Booking, SlotWithMeta } from '@/lib/types'
import { parseISO, addMinutes, subHours } from 'date-fns'
import PolicyBanner from '@/components/PolicyBanner'

type WeeklyCalendarProps = {
  serverNow?: string
}

export default function WeeklyCalendar({ serverNow }: WeeklyCalendarProps) {
  type SlotCountRow = { slot_id: string }

  const initialNow = serverNow ? new Date(serverNow) : new Date()
  const [now, setNow] = useState(() => initialNow)
  const [weekStart, setWeekStart] = useState(() => getWeekStart(initialNow))
  const [slots, setSlots] = useState<SlotWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [remainingSessions, setRemainingSessions] = useState<number | null>(null)
  const [policy, setPolicy] = useState({ bookingHours: 5, cancelHours: 5 })
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null)
    })
  }, [])

  useEffect(() => {
    setNow(new Date())
  }, [])

  const fetchProfile = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('profiles')
      .select('remaining_sessions')
      .eq('id', userId)
      .single()
    setRemainingSessions(data?.remaining_sessions ?? 0)
  }, [userId, supabase])

  const fetchPolicy = useCallback(async () => {
    const { data } = await supabase
      .from('booking_policies')
      .select('booking_hours, cancel_hours')
      .eq('id', 1)
      .single()

    if (data) {
      setPolicy({
        bookingHours: data.booking_hours ?? 5,
        cancelHours: data.cancel_hours ?? 5,
      })
    }
  }, [supabase])

  const fetchSlots = useCallback(async (opts?: { keepLoading?: boolean }) => {
    if (!userId) return
    if (opts?.keepLoading) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    const weekEnd = nextWeek(weekStart)
    const weekStartAt = weekStart

    // 슬롯 조회
    const { data: slotsData } = await supabase
      .from('time_slots')
      .select('*')
      .gte('slot_time', weekStartAt.toISOString())
      .lt('slot_time', weekEnd.toISOString())
      .order('slot_time', { ascending: true })

    if (!slotsData) {
      setSlots([])
      setLoading(false)
      return
    }

    // 확정 예약 수 + 내 예약 조회
    const slotIds = slotsData.map((s) => s.id)

    const [{ data: allBookings }, { data: myBookings }] = await Promise.all([
      supabase
        .from('bookings')
        .select('slot_id')
        .in('slot_id', slotIds)
        .eq('status', 'confirmed'),
      supabase
        .from('bookings')
        .select('*')
        .in('slot_id', slotIds)
        .eq('member_id', userId)
        .eq('status', 'confirmed'),
    ])

    const allBookingRows = (allBookings ?? []) as SlotCountRow[]
    const countMap = allBookingRows.reduce<Record<string, number>>(
      (acc, b) => {
        acc[b.slot_id] = (acc[b.slot_id] ?? 0) + 1
        return acc
      },
      {}
    )

    const myBookingRows = (myBookings ?? []) as Booking[]
    const myBookingMap = myBookingRows.reduce<Record<string, Booking>>(
      (acc, b) => {
        if (b) acc[b.slot_id] = b
        return acc
      },
      {}
    )

    const enriched: SlotWithMeta[] = slotsData.map((slot) => ({
      ...slot,
      confirmed_count: countMap[slot.id] ?? 0,
      my_booking: myBookingMap[slot.id] ?? null,
    }))

    setSlots(enriched)
    setLoading(false)
    setRefreshing(false)
    await fetchProfile()
  }, [weekStart, userId, fetchProfile, supabase])

  useEffect(() => {
    fetchSlots()
  }, [fetchSlots])

  useEffect(() => {
    fetchPolicy()
  }, [fetchPolicy])

  const handleBook = async (slotId: string) => {
    if (!userId) return
    if (remainingSessions !== null && remainingSessions <= 0) {
      alert('잔여 횟수가 없습니다. 관리자에게 문의해주세요.')
      return
    }
    setActionLoading(slotId)

    const { error } = await supabase.rpc('book_slot', { p_slot_id: slotId })

    if (error) {
      alert(error.message)
    } else {
      await fetchSlots({ keepLoading: true })
    }
    setActionLoading(null)
  }

  const handleCancel = async (bookingId: string, slotId: string) => {
    setActionLoading(slotId)

    const { error } = await supabase.rpc('cancel_booking', { p_booking_id: bookingId })

    if (error) {
      alert(error.message)
    } else {
      await fetchSlots({ keepLoading: true })
    }
    setActionLoading(null)
  }

  const weekDays = getWeekDays(weekStart)

  // 날짜별 슬롯 그룹핑
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

  return (
    <div className="space-y-6">
      {/* 주 네비게이션 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setWeekStart(prevWeek(weekStart))}
          disabled={isCurrentWeek}
          className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center transition-all',
            isCurrentWeek
              ? 'text-slate/40 cursor-not-allowed'
              : 'text-slate hover:text-ink hover:bg-brand/10'
          )}
        >
          ←
        </button>
        <div className="text-center">
          <p className="text-ink font-medium text-sm">
            {formatWeekRange(weekStart)}
          </p>
          {isCurrentWeek && (
            <span className="text-[10px] text-brand font-medium tracking-wide">
              이번 주
            </span>
          )}
        </div>
        <button
          onClick={() => setWeekStart(nextWeek(weekStart))}
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate hover:text-ink hover:bg-brand/10 transition-all"
        >
          →
        </button>
      </div>

      <PolicyBanner
        bookingHours={policy.bookingHours}
        cancelHours={policy.cancelHours}
        sticky
      />

      {/* 캘린더 */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-sand rounded w-20 mb-3" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-16 bg-sand rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {refreshing && (
            <div className="text-xs text-slate">
              업데이트 중...
            </div>
          )}
          {slotsByDay.map(({ day, slots: daySlots }) => (
            <div key={day.toISOString()} className="card overflow-hidden">
              {/* 날짜 헤더 */}
              <div className="px-4 py-3 border-b border-mist flex items-center justify-between bg-surface/70">
                <span className="font-display font-semibold text-ink tracking-wide text-sm">
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
                  <p className="text-slate text-sm text-center py-2">
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
                      const isActioning = actionLoading === slot.id
                      const isUnavailable = isFull || isPastSlot || isBookingClosed

                      return (
                        <div
                          key={slot.id}
                          className={cn(
                            'rounded-lg p-3 border transition-all duration-150',
                            isMyBooking
                              ? 'bg-sky-100 border-sky-200'
                              : isUnavailable
                                ? 'bg-sand border-mist'
                                : 'bg-surface border-mist hover:border-brand/30'
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className={cn(
                                'font-display font-semibold text-lg tracking-wide',
                                isMyBooking
                                  ? 'text-sky-700'
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
                                onClick={() =>
                                  handleCancel(slot.my_booking!.id, slot.id)
                                }
                                disabled={isActioning || isCancelClosed}
                                className="w-full text-xs py-1.5 rounded-full text-sky-700 
                                           border border-sky-200 hover:bg-sky-100
                                           transition-all disabled:opacity-50"
                              >
                                {isActioning
                                  ? '처리 중...'
                                  : isCancelClosed
                                    ? '취소 불가'
                                    : '예약 취소'}
                              </button>
                            ) : !isUnavailable ? (
                              <button
                                onClick={() => handleBook(slot.id)}
                                disabled={
                                  isActioning ||
                                  remainingSessions === 0 ||
                                  isBookingClosed
                                }
                                className="w-full text-xs py-1.5 rounded-full 
                                           bg-brand/10 text-brand 
                                           border border-brand/20 hover:bg-brand/20
                                           transition-all disabled:opacity-50"
                              >
                                {isActioning
                                  ? '처리 중...'
                                  : remainingSessions === 0
                                    ? '횟수 없음'
                                    : isBookingClosed
                                      ? '마감'
                                      : '예약하기'}
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
      <div className="flex flex-wrap gap-4 text-xs text-slate pt-2">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-brand/60" /> 예약 가능
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sky-400/60" /> 내 예약
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-gray-400" /> 마감/종료
        </span>
      </div>
    </div>
  )
}
