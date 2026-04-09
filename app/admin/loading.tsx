export default function AdminLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* 헤더 */}
      <div>
        <div className="h-3 w-16 bg-brand/20 rounded mb-3" />
        <div className="h-9 w-40 bg-mist rounded" />
      </div>

      {/* 통계 카드 3개 */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card p-5 space-y-2">
            <div className="h-3 w-20 bg-mist rounded" />
            <div className="h-8 w-12 bg-mist rounded" />
          </div>
        ))}
      </div>

      {/* 탭 */}
      <div className="flex gap-2 border-b border-mist pb-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 w-20 bg-mist rounded-t-md" />
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-mist" />
              <div className="space-y-1.5">
                <div className="h-4 w-32 bg-mist rounded" />
                <div className="h-3 w-20 bg-mist rounded" />
              </div>
            </div>
            <div className="h-8 w-16 bg-mist rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}
