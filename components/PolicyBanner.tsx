import { cn } from '@/lib/utils'

type PolicyBannerProps = {
  bookingHours: number
  cancelHours: number
  sticky?: boolean
  className?: string
}

export default function PolicyBanner({
  bookingHours,
  cancelHours,
  sticky,
  className,
}: PolicyBannerProps) {
  const isSame = bookingHours === cancelHours
  const message = isSame
    ? `예약 및 취소는 수업 시작 ${bookingHours}시간 전까지 가능합니다.`
    : `예약은 ${bookingHours}시간 전까지, 취소는 ${cancelHours}시간 전까지 가능합니다.`

  return (
    <div className={cn(sticky ? 'sticky top-16 z-20' : undefined, className)}>
      <div className="flex items-center gap-3 rounded-lg border border-brand/20 bg-brand-soft px-4 py-3">
        <svg
          className="h-4 w-4 shrink-0 text-brand"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
        </svg>
        <p className="text-sm text-ink">{message}</p>
        <span className="ml-auto text-xs text-slate shrink-0">정책 안내</span>
      </div>
    </div>
  )
}
