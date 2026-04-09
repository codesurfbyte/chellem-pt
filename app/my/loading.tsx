export default function MyLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* 헤더 */}
      <div>
        <div className="h-3 w-24 bg-brand/20 rounded mb-3" />
        <div className="h-9 w-28 bg-mist rounded" />
      </div>

      {/* 정책 배너 */}
      <div className="h-12 bg-mist rounded-card" />

      {/* 프로필 카드 */}
      <div className="card p-5 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-24 bg-mist rounded" />
          <div className="h-3 w-36 bg-mist rounded" />
        </div>
        <div className="text-right space-y-1">
          <div className="h-8 w-10 bg-mist rounded ml-auto" />
          <div className="h-3 w-14 bg-mist rounded ml-auto" />
        </div>
      </div>

      {/* 코치 피드백 */}
      <div className="card-elevated p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-mist" />
          <div className="h-4 w-24 bg-mist rounded" />
        </div>
        <div className="h-3 w-full bg-mist rounded" />
        <div className="h-3 w-3/4 bg-mist rounded" />
      </div>

      {/* 예정된 PT */}
      <section className="space-y-4">
        <div className="h-6 w-32 bg-mist rounded" />
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="card p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-mist flex-shrink-0" />
                <div className="space-y-2">
                  <div className="h-4 w-40 bg-mist rounded" />
                  <div className="h-3 w-20 bg-mist rounded" />
                </div>
              </div>
              <div className="h-8 w-20 bg-mist rounded-md" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
