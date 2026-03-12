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
    <div className={cn(sticky ? 'sticky top-4 z-20' : undefined, className)}>
      <div className="card px-4 py-3 flex items-center justify-between gap-3 bg-sand/70 border border-mist">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-brand" />
          <p className="text-sm text-ink font-medium">{message}</p>
        </div>
        <span className="text-xs text-slate">정책 안내</span>
      </div>
    </div>
  )
}
