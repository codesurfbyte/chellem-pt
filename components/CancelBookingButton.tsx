'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { parseISO, subHours } from 'date-fns'

type CancelBookingButtonProps = {
  bookingId: string
  slotTime: string
  cancelHours: number
}

export default function CancelBookingButton({
  bookingId,
  slotTime,
  cancelHours,
}: CancelBookingButtonProps) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const cancelCutoffTime = useMemo(() => {
    return subHours(parseISO(slotTime), cancelHours).getTime()
  }, [slotTime, cancelHours])
  const isCancelClosed = Date.now() > cancelCutoffTime

  const handleCancel = async () => {
    if (Date.now() > cancelCutoffTime) {
      alert('취소 가능 시간이 지났습니다.')
      return
    }
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
      disabled={loading || isCancelClosed}
      className="btn-danger text-xs px-3 py-1.5 flex-shrink-0 disabled:opacity-50"
      title={isCancelClosed ? '취소 가능 시간이 지났습니다.' : undefined}
    >
      {loading ? '취소 중...' : isCancelClosed ? '취소 불가' : '취소'}
    </button>
  )
}
