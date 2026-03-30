import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { SlotWithMeta, Booking } from '@/lib/types'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const weekStartISO = searchParams.get('weekStart')
  const weekEndISO = searchParams.get('weekEnd')

  if (!weekStartISO || !weekEndISO) {
    return NextResponse.json({ error: 'weekStart and weekEnd required' }, { status: 400 })
  }

  const { data: slotsData } = await supabase
    .from('time_slots')
    .select('*')
    .gte('slot_time', weekStartISO)
    .lt('slot_time', weekEndISO)
    .order('slot_time', { ascending: true })

  if (!slotsData) {
    return NextResponse.json({ slots: [], remainingSessions: 0, policy: { bookingHours: 5, cancelHours: 5 } })
  }

  const slotIds = slotsData.map((s) => s.id)

  type SlotCountRow = { slot_id: string }

  const [{ data: allBookings }, { data: myBookings }, { data: profile }, { data: policyData }] = await Promise.all([
    supabase.from('bookings').select('slot_id').in('slot_id', slotIds).eq('status', 'confirmed'),
    supabase.from('bookings').select('*').in('slot_id', slotIds).eq('member_id', user.id).eq('status', 'confirmed'),
    supabase.from('profiles').select('remaining_sessions').eq('id', user.id).single(),
    supabase.from('booking_policies').select('booking_hours, cancel_hours').eq('id', 1).single(),
  ])

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

  return NextResponse.json({
    slots,
    remainingSessions: profile?.remaining_sessions ?? 0,
    policy: {
      bookingHours: policyData?.booking_hours ?? 5,
      cancelHours: policyData?.cancel_hours ?? 5,
    },
  })
}
