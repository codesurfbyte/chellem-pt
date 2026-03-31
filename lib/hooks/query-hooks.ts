import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { nextWeek } from '@/lib/utils'
import type { TimeSlot, Booking, SlotWithMeta } from '@/lib/types'
import { getKstDayRange, getKstWeekRange } from '@/lib/utils'

const supabase = createClient()

export const QUERY_KEYS = {
  slots: (weekStart: string) => ['slots', weekStart] as const,
  userSlots: (weekStart: string) => ['userSlots', weekStart] as const,
  bookings: (view: 'today' | 'week') => ['bookings', view] as const,
  policy: ['policy'] as const,
}

// 0. 정책 조회 훅
export function useBookingPolicy() {
  return useQuery({
    queryKey: QUERY_KEYS.policy,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_policies')
        .select('booking_hours, cancel_hours')
        .eq('id', 1)
        .single()
      
      if (error) throw error
      return {
        bookingHours: data.booking_hours ?? 5,
        cancelHours: data.cancel_hours ?? 5,
      }
    },
  })
}

// 1. 슬롯 조회 훅
export function useSlots(weekStart: Date) {
  const weekStartISO = weekStart.toISOString()
  const weekEndISO = nextWeek(weekStart).toISOString()

  return useQuery({
    queryKey: QUERY_KEYS.slots(weekStartISO),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_slots')
        .select(`*, bookings(*, profiles!bookings_member_id_fkey(name, phone))`)
        .gte('slot_time', weekStartISO)
        .lt('slot_time', weekEndISO)
        .order('slot_time', { ascending: true })

      if (error) throw error
      
      return (data ?? []).map((s) => ({
        ...s,
        bookings: (s.bookings ?? []).filter(
          (b: Booking) => b.status === 'confirmed'
        ),
      }))
    },
  })
}

// 2. 예약 현황 조회 훅 (관리자용)
export function useBookings(view: 'today' | 'week') {
  return useQuery({
    queryKey: QUERY_KEYS.bookings(view),
    queryFn: async () => {
      const now = new Date()
      const range = view === 'today' ? getKstDayRange(now) : getKstWeekRange(now)
      const from = range.start.toISOString()
      const to = range.end.toISOString()

      // 먼저 슬롯 정보 가져오기
      const { data: slotsData, error: slotsError } = await supabase
        .from('time_slots')
        .select('id, slot_time')
        .gte('slot_time', from)
        .lte('slot_time', to)
        .order('slot_time', { ascending: true })

      if (slotsError) throw slotsError

      const slotIds = slotsData.map((s) => s.id)
      if (slotIds.length === 0) return []

      // 해당 슬롯들의 예약 정보 가져오기
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id, status, attendance_status, attendance_checked_at, attendance_checked_by, created_at,
          slot_id,
          profiles:profiles!bookings_member_id_fkey ( id, name, phone, remaining_sessions )
        `)
        .eq('status', 'confirmed')
        .in('slot_id', slotIds)

      if (bookingsError) throw bookingsError

      // 데이터 가공 (슬롯별 그룹화)
      const result = slotsData.map(slot => ({
        slot_id: slot.id,
        slot_time: slot.slot_time,
        bookings: bookingsData.filter(b => b.slot_id === slot.id)
      })).filter(s => s.bookings.length > 0)

      return result
    },
  })
}

// 3. 유저 슬롯 조회 훅 (WeeklyCalendar용 — /api/slots 경유)
type UserSlotsData = {
  slots: SlotWithMeta[]
  remainingSessions: number
  policy: { bookingHours: number; cancelHours: number }
}

export function useUserSlots(
  weekStart: Date,
  userId: string | null,
  initialData?: UserSlotsData,
) {
  const weekStartISO = weekStart.toISOString()
  const weekEndISO = nextWeek(weekStart).toISOString()

  return useQuery({
    queryKey: QUERY_KEYS.userSlots(weekStartISO),
    queryFn: async (): Promise<UserSlotsData> => {
      const params = new URLSearchParams({ weekStart: weekStartISO, weekEnd: weekEndISO })
      const res = await fetch(`/api/slots?${params}`)
      if (!res.ok) return { slots: [], remainingSessions: 0, policy: { bookingHours: 5, cancelHours: 5 } }
      return res.json()
    },
    enabled: !!userId,
    initialData,
  })
}

// 4. 예약 뮤테이션
export function useBookSlot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (slotId: string) => {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'book', slotId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSlots'] })
    },
  })
}

// 5. 예약 취소 뮤테이션 (유저용 — /api/booking 경유)
export function useCancelSlot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', bookingId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSlots'] })
    },
  })
}

// 6. 예약 취소 뮤테이션 (관리자용 — Supabase 직접)
export function useCancelBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase.rpc('cancel_booking', { p_booking_id: bookingId })
      if (error) throw error
      return bookingId
    },
    onSuccess: () => {
      // 관련된 쿼리 무효화 (데이터 다시 불러오기)
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['slots'] })
    },
  })
}
