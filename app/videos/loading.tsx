export default function VideosLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* 헤더 */}
      <div>
        <div className="h-3 w-16 bg-brand/20 rounded mb-3" />
        <div className="h-9 w-28 bg-mist rounded" />
        <div className="h-3 w-52 bg-mist rounded mt-2" />
      </div>

      {/* 비디오 카드 목록 */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="h-5 w-48 bg-mist rounded" />
                <div className="h-3 w-full bg-mist rounded" />
                <div className="h-3 w-2/3 bg-mist rounded" />
              </div>
              <div className="h-6 w-16 bg-mist rounded-badge flex-shrink-0" />
            </div>
            <div className="aspect-video bg-mist rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}
