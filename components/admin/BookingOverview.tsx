'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, isToday } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'

type BookingRow = {
  id: string
  status: string
  created_at: string
  time_slots: {
    id: string
    slot_time: string
  } | null
  profiles: {
    id: string
    name: string | null
    phone: string | null
    remaining_sessions: number
  } | null
}

type GroupedSlot = {
  slot_time: string
  slot_id: string
  bookings: BookingRow[]
}

export default function BookingOverview() {
  const [view, setView] = useState<'today' | 'week'>('today')
  const [slots, setSlots] = useState<GroupedSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const supabase = createClient()

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    const now = new Date()

    const from =
      view === 'today'
        ? startOfDay(now).toISOString()
        : startOfWeek(now, { weekStartsOn: 1 }).toISOString()

    const to =
      view === 'today'
        ? endOfDay(now).toISOString()
        : endOfWeek(now, { weekStartsOn: 1 }).toISOString()

    const { data } = await supabase
      .from('bookings')
      .select(`
        id, status, created_at,
        time_slots ( id, slot_time ),
        profiles ( id, name, phone, remaining_sessions )
      `)
      .eq('status', 'confirmed')
      .gte('time_slots.slot_time', from)
      .lte('time_slots.slot_time', to)
      .order('created_at', { ascending: true })

    // slot_time 기준으로 그룹핑
    const map = new Map<string, GroupedSlot>()
      ; (data ?? []).forEach((b: any) => {
        if (!b.time_slots) return
        const key = b.time_slots.id
        if (!map.has(key)) {
          map.set(key, {
            slot_id: key,
            slot_time: b.time_slots.slot_time,
            bookings: [],
          })
        }
        map.get(key)!.bookings.push(b)
      })

    // slot_time 오름차순 정렬
    const sorted = Array.from(map.values()).sort(
      (a, b) => new Date(a.slot_time).getTime() - new Date(b.slot_time).getTime()
    )

    setSlots(sorted)
    setLoading(false)
  }, [view])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('이 예약을 취소하시겠습니까?')) return
    setCancellingId(bookingId)
    await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
    setCancellingId(null)
    await fetchBookings()
  }

  const totalBookings = slots.reduce((acc, s) => acc + s.bookings.length, 0)

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
                ? 'bg-[#C8FF00] text-black'
                : 'bg-[#1A1A1A] text-gray-400 border border-[#2A2A2A] hover:text-white'
            )}
          >
            {v === 'today' ? '오늘' : '이번 주'}
          </button>
        ))}
        <span className="text-gray-600 text-xs ml-2">
          {format(new Date(), view === 'today' ? 'M월 d일 (EEE)' : 'M월 d일 주', { locale: ko })}
        </span>
      </div>

      {/* 요약 */}
      {!loading && (
        <div className="flex gap-4">
          <div className="card px-4 py-3 flex items-center gap-3">
            <span className="text-2xl font-display font-bold text-[#C8FF00]">
              {slots.length}
            </span>
            <span className="text-gray-500 text-xs">PT 슬롯</span>
          </div>
          <div className="card px-4 py-3 flex items-center gap-3">
            <span className="text-2xl font-display font-bold text-[#C8FF00]">
              {totalBookings}
            </span>
            <span className="text-gray-500 text-xs">총 예약 인원</span>
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
          <p className="text-gray-600 text-sm">
            {view === 'today' ? '오늘 예약된 PT가 없습니다' : '이번 주 예약된 PT가 없습니다'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {slots.map((slot) => {
            const slotDate = parseISO(slot.slot_time)
            const todaySlot = isToday(slotDate)

            return (
              <div
                key={slot.slot_id}
                className={cn(
                  'card overflow-hidden',
                  todaySlot && view === 'week' && 'border-[#C8FF00]/15'
                )}
              >
                {/* 슬롯 헤더 */}
                <div className="px-4 py-3 bg-[#0D0D0D] border-b border-[#1A1A1A] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* 시간 */}
                    <span className="font-display font-bold text-white text-xl tracking-wide">
                      {format(slotDate, 'HH:mm')}
                    </span>
                    {/* 날짜 (주간 뷰에서만) */}
                    {view === 'week' && (
                      <span className="text-gray-500 text-sm">
                        {format(slotDate, 'M/d (EEE)', { locale: ko })}
                      </span>
                    )}
                    {todaySlot && view === 'week' && (
                      <span className="text-[10px] font-semibold text-[#C8FF00] bg-[#C8FF00]/10 border border-[#C8FF00]/20 px-2 py-0.5 rounded-full">
                        오늘
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-600">
                    {slot.bookings.length}명 예약
                  </span>
                </div>

                {/* 예약자 목록 */}
                <div className="divide-y divide-[#141414]">
                  {slot.bookings.map((booking, idx) => (
                    <div
                      key={booking.id}
                      className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#0F0F0F] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {/* 순번 */}
                        <span className="w-5 h-5 rounded-full bg-[#1E1E1E] text-gray-600 text-[10px] flex items-center justify-center font-medium flex-shrink-0">
                          {idx + 1}
                        </span>
                        {/* 이름/아바타 */}
                        <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center flex-shrink-0">
                          <span className="text-gray-400 font-medium text-sm">
                            {(booking.profiles?.name ?? '?')[0]}
                          </span>
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">
                            {booking.profiles?.name ?? '이름 없음'}
                          </p>
                          {booking.profiles?.phone && (
                            <p className="text-gray-600 text-xs mt-0.5">
                              {booking.profiles.phone}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        {/* 잔여 횟수 */}
                        <div className="text-right">
                          <span
                            className={cn(
                              'text-xs font-medium',
                              (booking.profiles?.remaining_sessions ?? 0) <= 2
                                ? 'text-red-400'
                                : 'text-gray-500'
                            )}
                          >
                            잔여 {booking.profiles?.remaining_sessions ?? 0}회
                          </span>
                          {(booking.profiles?.remaining_sessions ?? 0) <= 2 && (
                            <p className="text-red-500 text-[10px]">충전 필요</p>
                          )}
                        </div>
                        {/* 관리자 취소 버튼 */}
                        <button
                          onClick={() => handleCancelBooking(booking.id)}
                          disabled={cancellingId === booking.id}
                          className="text-gray-700 hover:text-red-400 transition-colors text-lg disabled:opacity-50"
                          title="예약 취소"
                        >
                          {cancellingId === booking.id ? '…' : '×'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
