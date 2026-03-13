'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, parseISO, isToday, subHours } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn, getKstDayRange, getKstWeekRange } from '@/lib/utils'
import { useRouter } from 'next/navigation'

type BookingRow = {
  id: string
  status: string
  attendance_status: 'pending' | 'attended' | 'no_show'
  attendance_checked_at: string | null
  attendance_checked_by: string | null
  created_at: string
  slot_id: string
  profiles: {
    id: string
    name: string | null
    phone: string | null
    remaining_sessions: number
  }[] | { id: string; name: string | null; phone: string | null; remaining_sessions: number } | null
}

type GroupedSlot = {
  slot_time: string
  slot_id: string
  bookings: BookingRow[]
}

export default function BookingOverview() {
  const router = useRouter()
  const [view, setView] = useState<'today' | 'week'>('today')
  const [slots, setSlots] = useState<GroupedSlot[]>([])
  const [slotCount, setSlotCount] = useState(0)
  const [bookingCount, setBookingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [attendanceUpdatingId, setAttendanceUpdatingId] = useState<string | null>(null)
  const [adminId, setAdminId] = useState<string | null>(null)
  const [policy, setPolicy] = useState({ bookingHours: 5, cancelHours: 5 })
  const supabase = createClient()

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    const now = new Date()
    const range = view === 'today' ? getKstDayRange(now) : getKstWeekRange(now)
    const from = range.start.toISOString()
    const to = range.end.toISOString()

    const { data: slotsData, error: slotsError } = await supabase
      .from('time_slots')
      .select('id, slot_time')
      .gte('slot_time', from)
      .lte('slot_time', to)
      .order('slot_time', { ascending: true })

    if (slotsError) {
      console.error('booking overview fetch error', slotsError)
      setSlots([])
      setSlotCount(0)
      setBookingCount(0)
      setLoading(false)
      return
    }

    const slotMap = new Map<string, GroupedSlot>()
    const slotsList = (slotsData ?? []) as Array<{ id: string; slot_time: string }>
    const slotIds = slotsList.map((slot) => slot.id)

    slotsList.forEach((slot) => {
      slotMap.set(slot.id, {
        slot_id: slot.id,
        slot_time: slot.slot_time,
        bookings: [],
      })
    })

    let bookingRows: BookingRow[] = []
    if (slotIds.length > 0) {
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(
          `
          id, status, attendance_status, attendance_checked_at, attendance_checked_by, created_at,
          slot_id,
          profiles:profiles!bookings_member_id_fkey ( id, name, phone, remaining_sessions )
        `
        )
        .eq('status', 'confirmed')
        .in('slot_id', slotIds)

      if (bookingsError) {
        console.error('booking overview fetch error', bookingsError)
        setSlots([])
        setSlotCount(0)
        setBookingCount(0)
        setLoading(false)
        return
      }

      bookingRows = (bookingsData ?? []) as BookingRow[]
      bookingRows.forEach((b) => {
        const key = b.slot_id
        const target = slotMap.get(key)
        if (!target) return
        target.bookings.push(b)
      })
    }

    // slot_time 오름차순 정렬
    const groupedSlots = Array.from(slotMap.values())
      .filter((slot) => slot.bookings.length > 0)
      .sort((a, b) => new Date(a.slot_time).getTime() - new Date(b.slot_time).getTime())

    setSlots(groupedSlots)
    setSlotCount(slotsList.length)
    setBookingCount(bookingRows.length)
    setLoading(false)
  }, [view, supabase])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAdminId(data.user?.id ?? null)
    })
  }, [supabase])

  useEffect(() => {
    supabase
      .from('booking_policies')
      .select('booking_hours, cancel_hours')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        if (!data) return
        setPolicy({
          bookingHours: data.booking_hours ?? 5,
          cancelHours: data.cancel_hours ?? 5,
        })
      })
  }, [supabase])

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('이 예약을 취소하시겠습니까?')) return
    setCancellingId(bookingId)
    const { error } = await supabase.rpc('cancel_booking', { p_booking_id: bookingId })
    if (error) {
      alert(error.message)
      setCancellingId(null)
      return
    }
    setCancellingId(null)
    await fetchBookings()
    router.refresh()
  }

  const handleAttendance = async (
    bookingId: string,
    status: 'pending' | 'attended' | 'no_show'
  ) => {
    setAttendanceUpdatingId(bookingId)
    const { error } = await supabase
      .from('bookings')
      .update({
        attendance_status: status,
        attendance_checked_at: new Date().toISOString(),
        attendance_checked_by: adminId,
      })
      .eq('id', bookingId)

    if (error) {
      alert(error.message)
      setAttendanceUpdatingId(null)
      return
    }

    await fetchBookings()
    setAttendanceUpdatingId(null)
  }

  const totalBookings = bookingCount
  const now = new Date()

  return (
    <div className="space-y-5">
      {/* 뷰 토글 */}
      <div className="flex items-center gap-2">
        {(['today', 'week'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              view === v
                ? 'bg-brand text-white'
                : 'bg-surface text-slate border border-mist hover:text-ink'
            )}
          >
            {v === 'today' ? '오늘' : '이번 주'}
          </button>
        ))}
        <span className="text-slate text-xs ml-2">
          {format(new Date(), view === 'today' ? 'M월 d일 (EEE)' : 'M월 d일 주', { locale: ko })}
        </span>
      </div>

      {/* 요약 */}
      {!loading && (
        <div className="flex gap-4">
          <div className="card px-4 py-3 flex items-center gap-3">
            <span className="text-2xl font-display font-bold text-brand">
              {slotCount}
            </span>
            <span className="text-slate text-xs">PT 슬롯</span>
          </div>
          <div className="card px-4 py-3 flex items-center gap-3">
            <span className="text-2xl font-display font-bold text-brand">
              {totalBookings}
            </span>
            <span className="text-slate text-xs">총 예약 인원</span>
          </div>
        </div>
      )}

      {/* 슬롯별 목록 */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse h-24" />
          ))}
        </div>
      ) : slots.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-slate text-sm">
            {view === 'today' ? '오늘 예약된 PT가 없습니다' : '이번 주 예약된 PT가 없습니다'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {slots.map((slot) => {
            const slotDate = parseISO(slot.slot_time)
            const todaySlot = isToday(slotDate)
            const cancelCutoff = subHours(slotDate, policy.cancelHours)
            const isCancelClosed = now.getTime() > cancelCutoff.getTime()

            return (
              <div
                key={slot.slot_id}
                className={cn(
                  'card overflow-hidden',
                  todaySlot && view === 'week' && 'border-brand/30'
                )}
              >
                {/* 슬롯 헤더 */}
                <div className="px-4 py-3 bg-sand border-b border-mist flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* 시간 */}
                    <span className="font-display font-bold text-ink text-xl tracking-wide">
                      {format(slotDate, 'HH:mm')}
                    </span>
                    {/* 날짜 (주간 뷰에서만) */}
                    {view === 'week' && (
                      <span className="text-slate text-sm">
                        {format(slotDate, 'M/d (EEE)', { locale: ko })}
                      </span>
                    )}
                    {todaySlot && view === 'week' && (
                      <span className="text-[10px] font-semibold text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-full">
                        오늘
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate">
                    {slot.bookings.length}명 예약
                  </span>
                </div>

                {/* 예약자 목록 */}
                <div className="divide-y divide-mist">
                  {slot.bookings.map((booking, idx) => {
                    const profile = Array.isArray(booking.profiles)
                      ? booking.profiles[0] ?? null
                      : booking.profiles ?? null
                    return (
                      <div
                        key={booking.id}
                        className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-sand transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {/* 순번 */}
                          <span className="w-5 h-5 rounded-full bg-sand text-slate text-[10px] flex items-center justify-center font-medium flex-shrink-0">
                            {idx + 1}
                          </span>
                          {/* 이름/아바타 */}
                          <div className="w-8 h-8 rounded-lg bg-sand flex items-center justify-center flex-shrink-0">
                            <span className="text-slate font-medium text-sm">
                              {(profile?.name ?? '?')[0]}
                            </span>
                          </div>
                          <div>
                            <p className="text-ink text-sm font-medium">
                              {profile?.name ?? '이름 없음'}
                            </p>
                            {profile?.phone && (
                              <p className="text-slate text-xs mt-0.5">
                                {profile.phone}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right space-y-1">
                            <div className="flex items-center gap-1 justify-end">
                              <button
                                onClick={() => handleAttendance(booking.id, 'attended')}
                                disabled={attendanceUpdatingId === booking.id}
                                className={cn(
                                  'text-[10px] px-2 py-1 rounded-full border transition-colors',
                                  booking.attendance_status === 'attended'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : 'border-mist text-slate hover:text-emerald-700 hover:border-emerald-200'
                                )}
                              >
                                출석
                              </button>
                              <button
                                onClick={() => handleAttendance(booking.id, 'no_show')}
                                disabled={attendanceUpdatingId === booking.id}
                                className={cn(
                                  'text-[10px] px-2 py-1 rounded-full border transition-colors',
                                  booking.attendance_status === 'no_show'
                                    ? 'border-red-200 bg-red-50 text-red-600'
                                    : 'border-mist text-slate hover:text-red-600 hover:border-red-200'
                                )}
                              >
                                노쇼
                              </button>
                            </div>
                          </div>
                          {/* 잔여 횟수 */}
                          <div className="text-right">
                            <span
                              className={cn(
                                'text-xs font-medium',
                                (profile?.remaining_sessions ?? 0) <= 2
                                  ? 'text-red-500'
                                  : 'text-slate'
                              )}
                            >
                              잔여 {profile?.remaining_sessions ?? 0}회
                            </span>
                            {(profile?.remaining_sessions ?? 0) <= 2 && (
                              <p className="text-red-500 text-[10px]">충전 필요</p>
                            )}
                          </div>
                          {/* 관리자 취소 버튼 */}
                          <button
                            onClick={() => handleCancelBooking(booking.id)}
                            disabled={cancellingId === booking.id || isCancelClosed}
                            className="text-slate hover:text-red-500 transition-colors text-lg disabled:opacity-50"
                            title={
                              isCancelClosed
                                ? '취소 가능 시간이 지났습니다.'
                                : '예약 취소'
                            }
                          >
                            {cancellingId === booking.id
                              ? '…'
                              : isCancelClosed
                                ? '—'
                                : '×'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
