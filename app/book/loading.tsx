export default function BookingLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* 헤더 */}
      <div>
        <div className="h-3 w-16 bg-brand/20 rounded mb-3" />
        <div className="h-9 w-32 bg-mist rounded" />
        <div className="h-3 w-48 bg-mist rounded mt-2" />
      </div>

      {/* 주간 네비게이션 */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-20 bg-mist rounded-md" />
        <div className="h-5 w-36 bg-mist rounded" />
        <div className="h-8 w-20 bg-mist rounded-md" />
      </div>

      {/* 잔여 횟수 */}
      <div className="h-10 w-40 bg-mist rounded-md" />

      {/* 요일 그리드 (7일) */}
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-8 bg-mist rounded-md" />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="card p-3 space-y-2">
                <div className="h-4 w-12 bg-mist rounded" />
                <div className="h-3 w-8 bg-mist rounded" />
                <div className="h-7 bg-mist rounded-md mt-1" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
