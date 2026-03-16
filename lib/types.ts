export type Profile = {
  id: string
  name: string | null
  phone: string | null
  remaining_sessions: number
  is_admin: boolean
  created_at: string
  last_active_at?: string | null
  admin_note?: string | null
  coach_feedback?: string | null
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
  attendance_status?: 'pending' | 'attended' | 'no_show'
  attendance_checked_at?: string | null
  attendance_checked_by?: string | null
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

export type BookingPolicy = {
  id: number
  booking_hours: number
  cancel_hours: number
  updated_at: string
}
