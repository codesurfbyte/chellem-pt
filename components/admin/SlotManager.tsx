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
  cn,
} from '@/lib/utils'
import type { TimeSlot, Booking } from '@/lib/types'
import { parseISO, isSameDay, format, addHours, startOfDay } from 'date-fns'

const TIME_OPTIONS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00',
]

type SlotWithBookings = TimeSlot & {
  bookings: Array<Booking & { profiles: { name: string | null; phone: string | null } | null }>
}

export default function SlotManager() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart())
  const [slots, setSlots] = useState<SlotWithBookings[]>([])
  const [loading, setLoading] = useState(true)

  // 벌크 생성 상태
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [selectedTimes, setSelectedTimes] = useState<string[]>([])
  const [capacity, setCapacity] = useState(1)
  const [creating, setCreating] = useState(false)

  const supabase = createClient()
  const weekDays = getWeekDays(weekStart)

  const fetchSlots = useCallback(async () => {
    setLoading(true)
    const weekEnd = toISODateString(nextWeek(weekStart))
    const weekStartStr = toISODateString(weekStart)

    const { data } = await supabase
      .from('time_slots')
      .select(`*, bookings(*, profiles(name, phone))`)
      .gte('week_start', weekStartStr)
      .lt('week_start', weekEnd)
      .order('slot_time', { ascending: true })

    setSlots(
      (data ?? []).map((s) => ({
        ...s,
        bookings: (s.bookings ?? []).filter(
          (b: Booking) => b.status === 'confirmed'
        ),
      }))
    )
    setLoading(false)
  }, [weekStart])

  useEffect(() => {
    fetchSlots()
  }, [fetchSlots])

  const handleBulkCreate = async () => {
    if (selectedDays.length === 0 || selectedTimes.length === 0) return
    setCreating(true)

    const newSlots = selectedDays.flatMap((dayIndex) =>
      selectedTimes.map((time) => {
        const day = weekDays[dayIndex]
        const [h, m] = time.split(':').map(Number)
        const slotTime = new Date(day)
        slotTime.setHours(h, m, 0, 0)

        return {
          slot_time: slotTime.toISOString(),
          max_capacity: capacity,
          week_start: toISODateString(weekStart),
        }
      })
    )

    await supabase.from('time_slots').insert(newSlots)
    setCreating(false)
    setBulkMode(false)
    setSelectedDays([])
    setSelectedTimes([])
    await fetchSlots()
  }

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('이 슬롯을 삭제하시겠습니까? 관련 예약도 모두 삭제됩니다.')) return
    await supabase.from('time_slots').delete().eq('id', slotId)
    await fetchSlots()
  }

  const toggleDay = (i: number) =>
    setSelectedDays((prev) =>
      prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i]
    )

  const toggleTime = (t: string) =>
    setSelectedTimes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    )

  const slotsByDay = weekDays.map((day) => ({
    day,
    slots: slots.filter((s) => isSameDay(parseISO(s.slot_time), day)),
  }))

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart(prevWeek(weekStart))}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#1E1E1E] transition-all"
          >
            ←
          </button>
          <span className="text-white text-sm font-medium">
            {formatWeekRange(weekStart)}
          </span>
          <button
            onClick={() => setWeekStart(nextWeek(weekStart))}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#1E1E1E] transition-all"
          >
            →
          </button>
        </div>
        <button
          onClick={() => setBulkMode(!bulkMode)}
          className={cn('btn-primary text-xs px-4 py-2', bulkMode && 'bg-gray-700 text-white hover:bg-gray-600')}
        >
          {bulkMode ? '취소' : '+ 슬롯 일괄 생성'}
        </button>
      </div>

      {/* 벌크 생성 패널 */}
      {bulkMode && (
        <div className="card-elevated p-5 space-y-5">
          <h3 className="font-medium text-white text-sm">슬롯 일괄 생성</h3>

          {/* 요일 선택 */}
          <div>
            <label className="label">요일 선택</label>
            <div className="flex flex-wrap gap-2">
              {['월', '화', '수', '목', '금', '토'].map((day, i) => (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  className={cn(
                    'w-10 h-10 rounded-lg text-sm font-medium transition-all',
                    selectedDays.includes(i)
                      ? 'bg-[#C8FF00] text-black'
                      : 'bg-[#1E1E1E] text-gray-400 hover:text-white border border-[#2A2A2A]'
                  )}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* 시간 선택 */}
          <div>
            <label className="label">시간 선택</label>
            <div className="flex flex-wrap gap-2">
              {TIME_OPTIONS.map((time) => (
                <button
                  key={time}
                  onClick={() => toggleTime(time)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    selectedTimes.includes(time)
                      ? 'bg-[#C8FF00] text-black'
                      : 'bg-[#1E1E1E] text-gray-400 hover:text-white border border-[#2A2A2A]'
                  )}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* 정원 */}
          <div className="flex items-end gap-4">
            <div>
              <label className="label">정원 (명)</label>
              <input
                type="number"
                min={1}
                max={10}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="input w-24"
              />
            </div>
            <div className="text-xs text-gray-500 pb-3">
              총 {selectedDays.length * selectedTimes.length}개 슬롯 생성 예정
            </div>
          </div>

          <button
            onClick={handleBulkCreate}
            disabled={creating || selectedDays.length === 0 || selectedTimes.length === 0}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {creating ? '생성 중...' : `${selectedDays.length * selectedTimes.length}개 슬롯 생성`}
          </button>
        </div>
      )}

      {/* 슬롯 목록 */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse h-20" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {slotsByDay.map(({ day, slots: daySlots }) => (
            <div key={day.toISOString()} className="card overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#1E1E1E] bg-[#0F0F0F] flex items-center justify-between">
                <span className="text-sm font-medium text-white">
                  {formatDate(day)}
                </span>
                <span className="text-xs text-gray-600">
                  {daySlots.length}개 슬롯
                </span>
              </div>

              {daySlots.length === 0 ? (
                <div className="px-4 py-4 text-xs text-gray-700 text-center">
                  슬롯 없음
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {daySlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-[#161616] border border-[#222222] gap-3"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="font-display font-semibold text-white text-lg w-14 flex-shrink-0">
                          {formatTime(slot.slot_time)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-gray-400">
                              {slot.bookings.length}/{slot.max_capacity}명
                            </span>
                            {slot.bookings.length > 0 && (
                              <span className="text-xs text-gray-600 truncate">
                                {slot.bookings
                                  .map((b) => b.profiles?.name ?? '이름없음')
                                  .join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="text-gray-600 hover:text-red-400 transition-colors text-lg flex-shrink-0"
                        title="삭제"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
