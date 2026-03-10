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
import { parseISO, isSameDay, format, addHours, startOfDay, addDays } from 'date-fns'

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
  const [bulkAction, setBulkAction] = useState<'create' | 'update' | 'delete'>('create')
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [selectedTimes, setSelectedTimes] = useState<string[]>([])
  const [capacity, setCapacity] = useState(1)
  const [processing, setProcessing] = useState(false)
  const [copying, setCopying] = useState(false)

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

  const selectedSlotTimes = useMemo(() => {
    if (selectedDays.length === 0 || selectedTimes.length === 0) return []
    return selectedDays.flatMap((dayIndex) =>
      selectedTimes.map((time) => {
        const day = weekDays[dayIndex]
        const [h, m] = time.split(':').map(Number)
        const slotTime = new Date(day)
        slotTime.setHours(h, m, 0, 0)
        return slotTime
      })
    )
  }, [selectedDays, selectedTimes, weekDays])

  const selectedIsoTimes = useMemo(
    () => new Set(selectedSlotTimes.map((t) => t.toISOString())),
    [selectedSlotTimes]
  )

  const matchingSlots = useMemo(
    () => slots.filter((s) => selectedIsoTimes.has(s.slot_time)),
    [slots, selectedIsoTimes]
  )

  const duplicateCount = bulkAction === 'create' ? matchingSlots.length : 0

  const handleBulkAction = async () => {
    if (selectedDays.length === 0 || selectedTimes.length === 0) return
    setProcessing(true)

    if (bulkAction === 'create') {
      const existingSlotTimes = new Set(slots.map((s) => s.slot_time))
      const newSlots = selectedSlotTimes.map((slotTime) => ({
        slot_time: slotTime.toISOString(),
        max_capacity: capacity,
        week_start: toISODateString(weekStart),
      }))

      const duplicates = newSlots.filter((s) => existingSlotTimes.has(s.slot_time))
      const insertSlots = newSlots.filter((s) => !existingSlotTimes.has(s.slot_time))

      if (duplicates.length > 0) {
        alert(`이미 존재하는 슬롯 ${duplicates.length}개는 제외하고 생성합니다.`)
      }

      if (insertSlots.length === 0) {
        alert('생성할 슬롯이 없습니다.')
        setProcessing(false)
        return
      }

      await supabase.from('time_slots').insert(insertSlots)
    }

    if (bulkAction === 'update') {
      if (matchingSlots.length === 0) {
        alert('수정할 슬롯이 없습니다.')
        setProcessing(false)
        return
      }

      await supabase
        .from('time_slots')
        .update({ max_capacity: capacity })
        .in('id', matchingSlots.map((s) => s.id))
    }

    if (bulkAction === 'delete') {
      if (matchingSlots.length === 0) {
        alert('삭제할 슬롯이 없습니다.')
        setProcessing(false)
        return
      }

      if (!confirm('선택된 슬롯을 삭제하시겠습니까? 관련 예약도 모두 삭제됩니다.')) {
        setProcessing(false)
        return
      }

      await supabase.from('time_slots').delete().in('id', matchingSlots.map((s) => s.id))
    }

    setProcessing(false)
    setBulkMode(false)
    setBulkAction('create')
    setSelectedDays([])
    setSelectedTimes([])
    await fetchSlots()
  }

  const handleCopyToNextWeek = async () => {
    if (slots.length === 0) {
      alert('복사할 슬롯이 없습니다.')
      return
    }
    if (!confirm('이번 주 슬롯을 다음 주로 복사하시겠습니까?')) return

    setCopying(true)

    const targetWeekStart = nextWeek(weekStart)
    const targetWeekStartStr = toISODateString(targetWeekStart)

    const { data: targetSlots } = await supabase
      .from('time_slots')
      .select('slot_time')
      .eq('week_start', targetWeekStartStr)

    const targetSlotTimes = new Set((targetSlots ?? []).map((s) => s.slot_time))

    const newSlots = slots.map((slot) => ({
      slot_time: addDays(parseISO(slot.slot_time), 7).toISOString(),
      max_capacity: slot.max_capacity,
      week_start: targetWeekStartStr,
    }))

    const duplicates = newSlots.filter((s) => targetSlotTimes.has(s.slot_time))
    const insertSlots = newSlots.filter((s) => !targetSlotTimes.has(s.slot_time))

    if (duplicates.length > 0) {
      alert(`다음 주에 이미 존재하는 슬롯 ${duplicates.length}개는 제외합니다.`)
    }

    if (insertSlots.length === 0) {
      alert('복사할 새 슬롯이 없습니다.')
      setCopying(false)
      return
    }

    await supabase.from('time_slots').insert(insertSlots)
    setCopying(false)
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
            onClick={handleCopyToNextWeek}
            disabled={copying}
            className="btn-secondary text-xs px-4 py-2 disabled:opacity-50"
          >
            {copying ? '복사 중...' : '다음 주 복사'}
          </button>
          <button
            onClick={() => {
              setBulkMode(!bulkMode)
              if (bulkMode) {
                setBulkAction('create')
                setSelectedDays([])
                setSelectedTimes([])
              }
            }}
            className={cn('btn-primary text-xs px-4 py-2', bulkMode && 'bg-slate text-white hover:bg-slate/90')}
          >
            {bulkMode ? '취소' : '+ 슬롯 일괄 관리'}
          </button>
        </div>
      </div>

      {/* 벌크 생성 패널 */}
      {bulkMode && (
        <div className="card-elevated p-5 space-y-5">
          <h3 className="font-medium text-ink text-sm">슬롯 일괄 관리</h3>

          <div className="flex flex-wrap gap-2">
            {([
              { id: 'create', label: '일괄 생성' },
              { id: 'update', label: '일괄 수정' },
              { id: 'delete', label: '일괄 삭제' },
            ] as const).map((action) => (
              <button
                key={action.id}
                onClick={() => setBulkAction(action.id)}
                className={cn(
                  'px-3 py-2 rounded-md text-xs font-semibold transition-all border',
                  bulkAction === action.id
                    ? 'bg-brand text-white border-brand'
                    : 'bg-surface text-slate border-mist hover:text-ink'
                )}
              >
                {action.label}
              </button>
            ))}
          </div>

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
                      ? 'bg-brand text-white'
                      : 'bg-surface text-slate hover:text-ink border border-mist'
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
                      ? 'bg-brand text-white'
                      : 'bg-surface text-slate hover:text-ink border border-mist'
                  )}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* 정원 */}
          {bulkAction !== 'delete' && (
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
                {bulkAction === 'create' && (
                  <>총 {selectedSlotTimes.length}개 슬롯 생성 예정</>
                )}
                {bulkAction === 'update' && (
                  <>선택된 슬롯 {matchingSlots.length}개에 적용 예정</>
                )}
              </div>
            </div>
          )}

          {bulkAction === 'delete' && (
            <p className="text-xs text-slate">
              선택된 슬롯 {matchingSlots.length}개를 삭제합니다.
            </p>
          )}

          {bulkAction === 'create' && duplicateCount > 0 && (
            <p className="text-xs text-slate">
              이미 존재하는 슬롯 {duplicateCount}개는 생성에서 제외됩니다.
            </p>
          )}

          <button
            onClick={handleBulkAction}
            disabled={processing || selectedDays.length === 0 || selectedTimes.length === 0}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {processing
              ? '처리 중...'
              : bulkAction === 'create'
                ? `${selectedSlotTimes.length}개 슬롯 생성`
                : bulkAction === 'update'
                  ? `${matchingSlots.length}개 슬롯 수정`
                  : `${matchingSlots.length}개 슬롯 삭제`}
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
                        className="text-slate hover:text-red-500 transition-colors text-lg flex-shrink-0"
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
