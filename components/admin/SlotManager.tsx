'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
  buildSlotTimeKST,
  cn,
} from '@/lib/utils'
import type { TimeSlot, Booking } from '@/lib/types'
import { parseISO } from 'date-fns'
import { computeWeekChanges } from '@/lib/slotPlanner'

const TIME_OPTIONS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00',
]

type SlotWithBookings = TimeSlot & {
  bookings: Array<Booking & { profiles: { name: string | null; phone: string | null } | null }>
}

export default function SlotManager() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart())
  const [slots, setSlots] = useState<SlotWithBookings[]>([])
  const [loading, setLoading] = useState(true)

  const emptyWeekTimes = useCallback(
    () =>
      Array.from({ length: 7 }, (_, i) => i).reduce<Record<number, string[]>>(
        (acc, idx) => {
          acc[idx] = []
          return acc
        },
        {}
      ),
    []
  )

  const [weekEditorOpen, setWeekEditorOpen] = useState(true)
  const [weeklyTimes, setWeeklyTimes] = useState<Record<number, string[]>>(
    () => emptyWeekTimes()
  )
  const [capacity, setCapacity] = useState(1)
  const [addingWeek, setAddingWeek] = useState(false)

  const supabase = createClient()
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart])

  const fetchSlots = useCallback(async () => {
    setLoading(true)
    const weekEnd = nextWeek(weekStart)
    const weekStartAt = weekStart

    const { data, error } = await supabase
      .from('time_slots')
      .select(`*, bookings(*, profiles!bookings_member_id_fkey(name, phone))`)
      .gte('slot_time', weekStartAt.toISOString())
      .lt('slot_time', weekEnd.toISOString())
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

  const computeWeeklyTimesFromSlots = useCallback(
    (baseWeekStart: Date, baseSlots: SlotWithBookings[]) => {
      const weekSlots = baseSlots
      const next = emptyWeekTimes()

      weekSlots.forEach((slot) => {
        const slotDate = parseISO(slot.slot_time)
        const dayIndex = getKstDayIndex(baseWeekStart, slotDate)
        if (dayIndex < 0 || dayIndex >= weekDays.length) return
        const time = formatTime(slot.slot_time)
        const list = new Set(next[dayIndex] ?? [])
        list.add(time)
        next[dayIndex] = Array.from(list).sort()
      })

      return next
    },
    [emptyWeekTimes, weekDays]
  )

  useEffect(() => {
    if (!weekEditorOpen) {
      setWeeklyTimes(emptyWeekTimes())
      return
    }
    setWeeklyTimes(computeWeeklyTimesFromSlots(weekStart, slots))
  }, [weekStart, slots, weekEditorOpen, emptyWeekTimes, computeWeeklyTimesFromSlots])

  const selectedWeekSlots = useMemo(() => {
    return weekDays.flatMap((day, dayIndex) =>
      (weeklyTimes[dayIndex] ?? []).map((time) =>
        buildSlotTimeKST(day, time)
      )
    )
  }, [weekDays, weeklyTimes])

  const toggleWeeklyTime = (dayIndex: number, time: string) => {
    setWeeklyTimes((prev) => {
      const next = { ...prev }
      const current = new Set(next[dayIndex] ?? [])
      if (current.has(time)) {
        current.delete(time)
      } else {
        current.add(time)
      }
      next[dayIndex] = Array.from(current).sort()
      return next
    })
  }

  const handleSaveWeekSlots = async () => {
    setAddingWeek(true)

    const baseWeekStart = weekStart
    const targetSlots = slots

    const selectedTimes = selectedWeekSlots.map((t) => t.toISOString())
    const selectedTimeSet = new Set(selectedTimes)

    const { deletableSlotIds, insertTimes } = computeWeekChanges({
      selectedTimes,
      existingSlots: targetSlots.map((s) => ({
        id: s.id,
        slot_time: s.slot_time,
        bookingsCount: s.bookings.length,
      })),
    }) as { deletableSlotIds: string[]; insertTimes: string[]; bookedTimeSet: Set<string> }

    const bookedToRemove = targetSlots
      .filter((s) => s.bookings.length > 0)
      .filter((s) => !selectedTimeSet.has(new Date(s.slot_time).toISOString()))

    let deletableIds = [...deletableSlotIds]
    if (bookedToRemove.length > 0) {
      const confirmRemove = confirm(
        `예약된 슬롯 ${bookedToRemove.length}개가 포함되어 있습니다. ` +
        '해당 슬롯을 삭제하고 예약을 취소하시겠습니까?'
      )
      if (!confirmRemove) {
        setWeeklyTimes((prev) => {
          const next = { ...prev }
          bookedToRemove.forEach((slot) => {
            const slotDate = parseISO(slot.slot_time)
            const dayIndex = getKstDayIndex(weekStart, slotDate)
            if (dayIndex < 0 || dayIndex >= weekDays.length) return
            const time = formatTime(slot.slot_time)
            const list = new Set(next[dayIndex] ?? [])
            list.add(time)
            next[dayIndex] = Array.from(list).sort()
          })
          return next
        })
        setAddingWeek(false)
        return
      }
      deletableIds = Array.from(
        new Set([...deletableIds, ...bookedToRemove.map((s) => s.id)])
      )
    }

    if (targetSlots.length === 0 && insertTimes.length === 0) {
      alert('추가할 슬롯이 없습니다.')
      setAddingWeek(false)
      return
    }

    if (targetSlots.length > 0 && deletableIds.length === 0 && insertTimes.length === 0) {
      alert('변경할 내용이 없습니다.')
      setAddingWeek(false)
      return
    }

    if (deletableIds.length > 0) {
      const { error } = await supabase
        .from('time_slots')
        .delete()
        .in('id', deletableIds)
      if (error) {
        alert(`슬롯 삭제 실패: ${error.message}`)
        setAddingWeek(false)
        return
      }
    }

    if (insertTimes.length > 0) {
      const { error } = await supabase.from('time_slots').insert(
        insertTimes.map((t: string) => {
          const slotDate = parseISO(t)
          return {
            slot_time: t,
            max_capacity: capacity,
            week_start: toISODateString(getWeekStart(slotDate)),
          }
        })
      )
      if (error) {
        alert(`슬롯 추가 실패: ${error.message}`)
        setAddingWeek(false)
        return
      }
    }

    if (selectedTimes.length > 0) {
      const rangeStart = baseWeekStart
      const rangeEnd = nextWeek(baseWeekStart)
      const { error } = await supabase
        .from('time_slots')
        .update({ max_capacity: capacity })
        .gte('slot_time', rangeStart.toISOString())
        .lt('slot_time', rangeEnd.toISOString())
      if (error) {
        alert(`정원 업데이트 실패: ${error.message}`)
        setAddingWeek(false)
        return
      }
    }

    setAddingWeek(false)
    setWeeklyTimes(emptyWeekTimes())
    await fetchSlots()
  }

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('이 슬롯을 삭제하시겠습니까? 관련 예약도 모두 삭제됩니다.')) return
    await supabase.from('time_slots').delete().eq('id', slotId)
    await fetchSlots()
  }

  const slotsByDay = weekDays.map((day, dayIndex) => ({
    day,
    slots: slots.filter(
      (s) => getKstDayIndex(weekStart, parseISO(s.slot_time)) === dayIndex
    ),
  }))

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart(prevWeek(weekStart))}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate hover:text-ink hover:bg-brand/10 transition-all"
          >
            ←
          </button>
          <span className="text-ink text-sm font-medium">
            {formatWeekRange(weekStart)}
          </span>
          <button
            onClick={() => setWeekStart(nextWeek(weekStart))}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate hover:text-ink hover:bg-brand/10 transition-all"
          >
            →
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setWeekEditorOpen(!weekEditorOpen)
              if (!weekEditorOpen) {
                setWeeklyTimes(computeWeeklyTimesFromSlots(weekStart, slots))
              }
            }}
            className={cn('btn-primary text-xs px-4 py-2', weekEditorOpen && 'bg-slate text-white hover:bg-slate/90')}
          >
            {weekEditorOpen ? '주간 시간 편집 닫기' : '주간 시간 편집'}
          </button>
        </div>
      </div>

      {/* 주간 추가 패널 */}
      {weekEditorOpen && (
        <div className="card-elevated p-5 space-y-5">
          <h3 className="font-medium text-ink text-sm">
            주간 시간 편집
          </h3>

          <div className="space-y-3">
            {weekDays.map((day, dayIndex) => (
              <div key={day.toISOString()} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ink">
                    {formatDate(day)}
                  </span>
                  <button
                    onClick={() =>
                      setWeeklyTimes((prev) => ({ ...prev, [dayIndex]: [] }))
                    }
                    className="text-xs text-slate hover:text-ink transition-colors"
                  >
                    초기화
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {TIME_OPTIONS.map((time) => {
                    const selected = (weeklyTimes[dayIndex] ?? []).includes(time)
                    return (
                      <button
                        key={time}
                        onClick={() => toggleWeeklyTime(dayIndex, time)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                          selected
                            ? 'bg-brand text-white'
                            : 'bg-surface text-slate hover:text-ink border border-mist'
                        )}
                      >
                        {time}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

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
            <div className="text-xs text-slate pb-3">
              선택된 슬롯 ${selectedWeekSlots.length}개로 업데이트 예정
            </div>
          </div>

          <button
            onClick={handleSaveWeekSlots}
            disabled={addingWeek}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {addingWeek
              ? '처리 중...'
              : `${selectedWeekSlots.length}개 슬롯 저장`}
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
              <div className="px-4 py-2.5 border-b border-mist bg-sand flex items-center justify-between">
                <span className="text-sm font-medium text-ink">
                  {formatDate(day)}
                </span>
                <span className="text-xs text-slate">
                  {daySlots.length}개 슬롯
                </span>
              </div>

              {daySlots.length === 0 ? (
                <div className="px-4 py-4 text-xs text-slate text-center">
                  슬롯 없음
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {daySlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-surface border border-mist gap-3"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="font-display font-semibold text-ink text-lg w-14 flex-shrink-0">
                          {formatTime(slot.slot_time)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-slate">
                              {slot.bookings.length}/{slot.max_capacity}명
                            </span>
                            {slot.bookings.length > 0 && (
                              <span className="text-xs text-slate/70 truncate">
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
                        className="text-slate hover:text-red-500 transition-colors text-lg"
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
