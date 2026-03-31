import { createClient } from '@/lib/supabase/server'
import { getWeekStart, nextWeek } from '@/lib/utils'
import type { SlotWithMeta, Booking } from '@/lib/types'
import WeeklyCalendar from '@/components/WeeklyCalendar'

async function fetchInitialData(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const now = new Date()
  const weekStart = getWeekStart(now)
  const weekEnd = nextWeek(weekStart)

  const { data: slotsData } = await supabase
    .from('time_slots')
    .select('*')
    .gte('slot_time', weekStart.toISOString())
    .lt('slot_time', weekEnd.toISOString())
    .order('slot_time', { ascending: true })

  if (!slotsData) return { slots: [], remainingSessions: 0, policy: { bookingHours: 5, cancelHours: 5 } }

  const slotIds = slotsData.map((s) => s.id)

  const [{ data: allBookings }, { data: myBookings }, { data: profile }, { data: policyData }] = await Promise.all([
    supabase.from('bookings').select('slot_id').in('slot_id', slotIds).eq('status', 'confirmed'),
    supabase.from('bookings').select('*').in('slot_id', slotIds).eq('member_id', userId).eq('status', 'confirmed'),
    supabase.from('profiles').select('remaining_sessions').eq('id', userId).single(),
    supabase.from('booking_policies').select('booking_hours, cancel_hours').eq('id', 1).single(),
  ])

  type SlotCountRow = { slot_id: string }
  const countMap = ((allBookings ?? []) as SlotCountRow[]).reduce<Record<string, number>>((acc, b) => {
    acc[b.slot_id] = (acc[b.slot_id] ?? 0) + 1
    return acc
  }, {})

  const myBookingMap = ((myBookings ?? []) as Booking[]).reduce<Record<string, Booking>>((acc, b) => {
    if (b) acc[b.slot_id] = b
    return acc
  }, {})

  const slots: SlotWithMeta[] = slotsData.map((slot) => ({
    ...slot,
    confirmed_count: countMap[slot.id] ?? 0,
    my_booking: myBookingMap[slot.id] ?? null,
  }))

  return {
    slots,
    remainingSessions: profile?.remaining_sessions ?? 0,
    policy: {
      bookingHours: policyData?.booking_hours ?? 5,
      cancelHours: policyData?.cancel_hours ?? 5,
    },
  }
}

export default async function BookPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const initialData = user ? await fetchInitialData(supabase, user.id) : null

  return (
    <div className="space-y-8">
      <div>
        <span className="text-xs font-semibold tracking-[0.14em] text-brand uppercase">
          Schedule
        </span>
        <h1 className="font-display text-4xl font-bold text-ink mt-2 tracking-wide">
          예약하기
        </h1>
        <p className="text-slate text-sm mt-1">
          원하는 시간대를 선택해 예약하세요
        </p>
      </div>

      <WeeklyCalendar
        initialUserId={user?.id ?? null}
        initialSlots={initialData?.slots ?? null}
        initialRemainingSessions={initialData?.remainingSessions ?? null}
        initialPolicy={initialData?.policy ?? null}
      />
    </div>
  )
}
