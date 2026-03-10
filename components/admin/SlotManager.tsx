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
  cn,
} from '@/lib/utils'
import type { TimeSlot, Booking } from '@/lib/types'
import { parseISO, isSameDay, addDays } from 'date-fns'
import { computeWeekChanges } from '@/lib/slotPlanner'

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

  const emptyWeekTimes = useCallback(
    () =>
      Array.from({ length: 6 }, (_, i) => i).reduce<Record<number, string[]>>(
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
  const [copyingTarget, setCopyingTarget] = useState<'prev' | 'next' | null>(null)

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

  const computeWeeklyTimesFromSlots = useCallback(
    (baseWeekStart: Date, baseSlots: SlotWithBookings[]) => {
      const baseWeekStartStr = toISODateString(baseWeekStart)
      const weekSlots = baseSlots.filter((s) => s.week_start === baseWeekStartStr)
      const next = emptyWeekTimes()

      weekSlots.forEach((slot) => {
        const slotDate = parseISO(slot.slot_time)
        const dayIndex = weekDays.findIndex((d) => isSameDay(d, slotDate))
        if (dayIndex === -1) return
        const time = slotDate.toTimeString().slice(0, 5)
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
      (weeklyTimes[dayIndex] ?? []).map((time) => {
        const [h, m] = time.split(':').map(Number)
        const slotTime = new Date(day)
        slotTime.setHours(h, m, 0, 0)
        return slotTime
      })
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
    const baseWeekStartStr = toISODateString(baseWeekStart)
    const targetSlots = slots.filter((s) => s.week_start === baseWeekStartStr)

    const selectedTimes = selectedWeekSlots.map((t) => t.toISOString())

    const { deletableSlotIds, insertTimes, bookedTimeSet } = computeWeekChanges({
      selectedTimes,
      existingSlots: targetSlots.map((s) => ({
        id: s.id,
        slot_time: s.slot_time,
        bookingsCount: s.bookings.length,
      })),
    }) as { deletableSlotIds: string[]; insertTimes: string[]; bookedTimeSet: Set<string> }

    if (targetSlots.length === 0 && insertTimes.length === 0) {
      alert('추가할 슬롯이 없습니다.')
      setAddingWeek(false)
      return
    }

    if (targetSlots.length > 0 && deletableSlotIds.length === 0 && insertTimes.length === 0) {
      alert('변경할 내용이 없습니다.')
      setAddingWeek(false)
      return
    }

    if (deletableSlotIds.length > 0) {
      const { error } = await supabase
        .from('time_slots')
        .delete()
        .in('id', deletableSlotIds)
      if (error) {
        alert(`슬롯 삭제 실패: ${error.message}`)
        setAddingWeek(false)
        return
      }
    }

    if (insertTimes.length > 0) {
      const { error } = await supabase.from('time_slots').insert(
        insertTimes.map((t: string) => ({
          slot_time: t,
          max_capacity: capacity,
          week_start: baseWeekStartStr,
        }))
      )
      if (error) {
        alert(`슬롯 추가 실패: ${error.message}`)
        setAddingWeek(false)
        return
      }
    }

    if (selectedTimes.length > 0) {
      const { error } = await supabase
        .from('time_slots')
        .update({ max_capacity: capacity })
        .eq('week_start', baseWeekStartStr)
      if (error) {
        alert(`정원 업데이트 실패: ${error.message}`)
        setAddingWeek(false)
        return
      }
    }

    if (bookedTimeSet.size > 0) {
      const removedBooked = Array.from(bookedTimeSet).filter(
        (t) => !selectedTimes.includes(t)
      )
      if (removedBooked.length > 0) {
        alert('예약이 있는 슬롯은 유지됩니다.')
      }
    }

    setAddingWeek(false)
    setWeeklyTimes(emptyWeekTimes())
    await fetchSlots()
  }

  const handleCopyToWeek = async (direction: 'prev' | 'next') => {
    if (slots.length === 0) {
      alert('복사할 슬롯이 없습니다.')
      return
    }
    const confirmMessage =
      direction === 'next'
        ? '이번 주 슬롯을 다음 주로 복사하시겠습니까?'
        : '이번 주 슬롯을 이전 주로 복사하시겠습니까?'
    if (!confirm(confirmMessage)) return

    setCopyingTarget(direction)

    const targetWeekStart =
      direction === 'next' ? nextWeek(weekStart) : prevWeek(weekStart)
    const targetWeekStartStr = toISODateString(targetWeekStart)

    const { data: targetSlots } = await supabase
      .from('time_slots')
      .select('slot_time')
      .eq('week_start', targetWeekStartStr)

    const targetSlotTimes = new Set((targetSlots ?? []).map((s) => s.slot_time))

    const shiftDays = direction === 'next' ? 7 : -7
    const newSlots = slots.map((slot) => ({
      slot_time: addDays(parseISO(slot.slot_time), shiftDays).toISOString(),
      max_capacity: slot.max_capacity,
      week_start: targetWeekStartStr,
    }))

    const duplicates = newSlots.filter((s) => targetSlotTimes.has(s.slot_time))
    const insertSlots = newSlots.filter((s) => !targetSlotTimes.has(s.slot_time))

    if (duplicates.length > 0) {
      const targetLabel = direction === 'next' ? '다음 주' : '이전 주'
      alert(`${targetLabel}에 이미 존재하는 슬롯 ${duplicates.length}개는 제외합니다.`)
    }

    if (insertSlots.length === 0) {
      alert('복사할 새 슬롯이 없습니다.')
      setCopyingTarget(null)
      return
    }

    await supabase.from('time_slots').insert(insertSlots)
    setCopyingTarget(null)
    await fetchSlots()
  }

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('이 슬롯을 삭제하시겠습니까? 관련 예약도 모두 삭제됩니다.')) return
    await supabase.from('time_slots').delete().eq('id', slotId)
    await fetchSlots()
  }

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
            onClick={() => handleCopyToWeek('prev')}
            disabled={copyingTarget !== null}
            className="btn-secondary text-xs px-4 py-2 disabled:opacity-50"
          >
            {copyingTarget === 'prev' ? '복사 중...' : '이전 주 복사'}
          </button>
          <button
            onClick={() => handleCopyToWeek('next')}
            disabled={copyingTarget !== null}
            className="btn-secondary text-xs px-4 py-2 disabled:opacity-50"
          >
            {copyingTarget === 'next' ? '복사 중...' : '다음 주 복사'}
          </button>
          <button
            onClick={() => {
              setWeekEditorOpen(!weekEditorOpen)
              if (!weekEditorOpen) {
                setWeeklyTimes(computeWeeklyTimesFromSlots(weekStart, slots))
              }
            }}
            className={cn('btn-primary text-xs px-4 py-2', weekEditorOpen && 'bg-slate text-white hover:bg-slate/90')}
          >
            {weekEditorOpen ? '주간 편집 닫기' : '주간 편집'}
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
