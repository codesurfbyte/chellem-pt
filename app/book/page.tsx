import dynamic from 'next/dynamic'

const WeeklyCalendar = dynamic(() => import('@/components/WeeklyCalendar'), {
  ssr: false,
  loading: () => (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="card p-4 animate-pulse">
          <div className="h-4 bg-sand rounded w-20 mb-3" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[...Array(3)].map((_, j) => (
              <div key={j} className="h-16 bg-sand rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
})

export default function BookPage() {
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

      <WeeklyCalendar />
    </div>
  )
}
