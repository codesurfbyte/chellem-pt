export type Profile = {
  id: string
  name: string | null
  phone: string | null
  remaining_sessions: number
  is_admin: boolean
  created_at: string
}

export type TimeSlot = {
  id: string
  slot_time: string
  max_capacity: number
  week_start: string
  created_at: string
}

export type Booking = {
  id: string
  member_id: string
  slot_id: string
  status: 'confirmed' | 'cancelled'
  created_at: string
  profiles?: Profile
  time_slots?: TimeSlot
}

export type Notice = {
  id: string
  title: string
  content: string
  is_pinned: boolean
  created_at: string
}

export type SlotWithMeta = TimeSlot & {
  confirmed_count: number
  my_booking: Booking | null
}
