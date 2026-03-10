'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleCancel = async () => {
    if (!confirm('예약을 취소하시겠습니까?')) return
    setLoading(true)

    const { error } = await supabase.rpc('cancel_booking', { p_booking_id: bookingId })
    if (error) {
      alert(error.message)
    }

    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={handleCancel}
      disabled={loading}
      className="btn-danger text-xs px-3 py-1.5 flex-shrink-0 disabled:opacity-50"
    >
      {loading ? '취소 중...' : '취소'}
    </button>
  )
}
