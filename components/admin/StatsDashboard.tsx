'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, getKstMonthRange, getKstWeekRange, TIME_ZONE } from '@/lib/utils'
import { formatInTimeZone } from 'date-fns-tz'
import { ko } from 'date-fns/locale'

type BookingRow = {
  id: string
  status: 'confirmed' | 'cancelled'
  attendance_status: 'pending' | 'attended' | 'no_show'
  time_slots:
    | {
        slot_time: string
      }
    | {
        slot_time: string
      }[]
    | null
  profiles:
    | {
        id: string
        name: string | null
      }
    | {
        id: string
        name: string | null
      }[]
    | null
}

type Metric = {
  label: string
  value: string
  detail: string
}

type PeakRow = {
  label: string
  count: number
}

type MemberRow = {
  id: string
  name: string
  count: number
}

export default function StatsDashboard() {
  const supabase = createClient()
  const [view, setView] = useState<'week' | 'month'>('week')
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [slotCount, setSlotCount] = useState(0)
  const [bookingCount, setBookingCount] = useState(0)
  const [peakTimes, setPeakTimes] = useState<PeakRow[]>([])
  const [memberUsage, setMemberUsage] = useState<MemberRow[]>([])
  const [memberAverage, setMemberAverage] = useState(0)

  const range = useMemo(() => {
    const now = new Date()
    return view === 'week' ? getKstWeekRange(now) : getKstMonthRange(now)
  }, [view])

  const rangeLabel = useMemo(() => {
    if (view === 'week') {
      return `${formatInTimeZone(range.start, TIME_ZONE, 'M월 d일', {
        locale: ko,
      })} ~ ${formatInTimeZone(range.end, TIME_ZONE, 'M월 d일', { locale: ko })}`
    }

    return formatInTimeZone(range.start, TIME_ZONE, 'yyyy년 M월', { locale: ko })
  }, [range, view])

  const fetchStats = useCallback(async () => {
    setLoading(true)
    const from = range.start.toISOString()
    const to = range.end.toISOString()

    const { count: slotTotal, error: slotError } = await supabase
      .from('time_slots')
      .select('*', { count: 'exact', head: true })
      .gte('slot_time', from)
      .lte('slot_time', to)

    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select(
        `
        id,
        status,
        attendance_status,
        time_slots!inner(slot_time),
        profiles:profiles!bookings_member_id_fkey ( id, name )
      `
      )
      .gte('time_slots.slot_time', from)
      .lte('time_slots.slot_time', to)

    if (slotError || bookingsError) {
      console.error('stats fetch error', slotError ?? bookingsError)
      setMetrics([])
      setSlotCount(0)
      setBookingCount(0)
      setPeakTimes([])
      setMemberUsage([])
      setMemberAverage(0)
      setLoading(false)
      return
    }

    const slotTotalCount = slotTotal ?? 0
    const rows = (bookingsData ?? []) as BookingRow[]

    const confirmedRows = rows.filter((row) => row.status === 'confirmed')
    const cancelledRows = rows.filter((row) => row.status === 'cancelled')
    const attendedRows = confirmedRows.filter(
      (row) => row.attendance_status === 'attended'
    )
    const noShowRows = confirmedRows.filter(
      (row) => row.attendance_status === 'no_show'
    )

    const totalBookingRequests = confirmedRows.length + cancelledRows.length
    const attendanceBase = attendedRows.length + noShowRows.length

    const bookingRate =
      slotTotalCount > 0 ? confirmedRows.length / slotTotalCount : 0
    const cancelRate =
      totalBookingRequests > 0 ? cancelledRows.length / totalBookingRequests : 0
    const attendanceRate =
      attendanceBase > 0 ? attendedRows.length / attendanceBase : 0
    const noShowRate =
      attendanceBase > 0 ? noShowRows.length / attendanceBase : 0

    const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`

    const nextMetrics: Metric[] = [
      {
        label: '예약률',
        value: formatPercent(bookingRate),
        detail: `${confirmedRows.length}건 / ${slotTotalCount}슬롯`,
      },
      {
        label: '취소율',
        value: formatPercent(cancelRate),
        detail: `${cancelledRows.length}건 / ${totalBookingRequests}건`,
      },
      {
        label: '노쇼율',
        value: formatPercent(noShowRate),
        detail: `${noShowRows.length}건 / ${attendanceBase}건`,
      },
      {
        label: '출석률',
        value: formatPercent(attendanceRate),
        detail: `${attendedRows.length}건 / ${attendanceBase}건`,
      },
    ]

    const peakMap = new Map<string, number>()
    confirmedRows.forEach((row) => {
      const slotTime = Array.isArray(row.time_slots)
        ? row.time_slots[0]?.slot_time
        : row.time_slots?.slot_time
      if (!slotTime) return
      const label = formatInTimeZone(slotTime, TIME_ZONE, 'EEE HH:00', {
        locale: ko,
      })
      peakMap.set(label, (peakMap.get(label) ?? 0) + 1)
    })

    const nextPeakTimes = Array.from(peakMap.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    const memberMap = new Map<string, MemberRow>()
    confirmedRows.forEach((row) => {
      const profile = Array.isArray(row.profiles)
        ? row.profiles[0]
        : row.profiles
      if (!profile) return
      const name = profile.name ?? '이름 없음'
      const next = memberMap.get(profile.id)
      if (next) {
        next.count += 1
      } else {
        memberMap.set(profile.id, { id: profile.id, name, count: 1 })
      }
    })

    const nextMembers = Array.from(memberMap.values()).sort(
      (a, b) => b.count - a.count
    )

    const average =
      nextMembers.length > 0
        ? confirmedRows.length / nextMembers.length
        : 0

    setMetrics(nextMetrics)
    setSlotCount(slotTotalCount)
    setBookingCount(confirmedRows.length)
    setPeakTimes(nextPeakTimes)
    setMemberUsage(nextMembers.slice(0, 6))
    setMemberAverage(average)
    setLoading(false)
  }, [range, supabase])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {(['week', 'month'] as const).map((option) => (
            <button
              key={option}
              onClick={() => setView(option)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                view === option
                  ? 'bg-brand text-white'
                  : 'bg-surface text-slate border border-mist hover:text-ink'
              )}
            >
              {option === 'week' ? '주간' : '월간'}
            </button>
          ))}
        </div>
        <div className="text-xs text-slate">{rangeLabel}</div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="card p-4">
            <div className="text-xs text-slate">{metric.label}</div>
            <div className="text-2xl font-display font-bold text-brand mt-1">
              {metric.value}
            </div>
            <div className="text-[11px] text-slate mt-1">{metric.detail}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">피크 타임 분석</p>
              <p className="text-xs text-slate mt-1">예약이 몰리는 시간대</p>
            </div>
            <span className="text-[10px] text-slate">
              총 예약 {bookingCount}건
            </span>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-8 bg-sand rounded-lg animate-pulse" />
              ))}
            </div>
          ) : peakTimes.length === 0 ? (
            <div className="text-xs text-slate">피크 타임 데이터가 없습니다.</div>
          ) : (
            <div className="space-y-2">
              {peakTimes.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between bg-sand px-3 py-2 rounded-lg"
                >
                  <span className="text-sm text-ink">{row.label}</span>
                  <span className="text-xs text-slate">{row.count}건</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">회원별 이용 패턴</p>
              <p className="text-xs text-slate mt-1">
                기간 내 예약 횟수 상위 회원
              </p>
            </div>
            <span className="text-[10px] text-slate">
              평균 {memberAverage.toFixed(1)}회
            </span>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-8 bg-sand rounded-lg animate-pulse" />
              ))}
            </div>
          ) : memberUsage.length === 0 ? (
            <div className="text-xs text-slate">회원 데이터가 없습니다.</div>
          ) : (
            <div className="space-y-2">
              {memberUsage.map((row, idx) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between bg-sand px-3 py-2 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate w-4">{idx + 1}</span>
                    <span className="text-sm text-ink">{row.name}</span>
                  </div>
                  <span className="text-xs text-slate">{row.count}회</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate">
        <span>총 슬롯 {slotCount}개</span>
        <span>확정 예약 {bookingCount}건</span>
        <span>노쇼율/출석률은 출석 처리된 예약만 기준으로 계산됩니다.</span>
      </div>
    </div>
  )
}
