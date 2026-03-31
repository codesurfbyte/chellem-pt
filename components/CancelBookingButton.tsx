'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { parseISO, subHours } from 'date-fns'
import { useCancelBooking } from '@/lib/hooks/query-hooks'

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
  const router = useRouter()
  const cancelMutation = useCancelBooking()

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

    try {
      await cancelMutation.mutateAsync(bookingId)
      router.refresh()
    } catch (e: any) {
      alert(e.message)
    }
  }

  return (
    <button
      onClick={handleCancel}
      disabled={cancelMutation.isPending || isCancelClosed}
      className="btn-danger text-xs px-3 py-1.5 flex-shrink-0 disabled:opacity-50"
      title={isCancelClosed ? '취소 가능 시간이 지났습니다.' : undefined}
    >
      {cancelMutation.isPending ? '취소 중...' : isCancelClosed ? '취소 불가' : '취소'}
    </button>
  )
}
