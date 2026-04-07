'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { ExerciseVideo } from '@/lib/types'
import { useExerciseVideos } from '@/lib/hooks/query-hooks'

const CATEGORIES = ['전체', '코어', '하체', '상체', '유산소', '스트레칭', '기타']

function getYoutubeVideoId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v')
    if (u.hostname === 'youtu.be') return u.pathname.slice(1)
  } catch {}
  return null
}

function getYoutubeEmbedUrl(url: string): string | null {
  const id = getYoutubeVideoId(url)
  return id ? `https://www.youtube.com/embed/${id}` : null
}

function getYoutubeThumbnailUrl(url: string): string | null {
  const id = getYoutubeVideoId(url)
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
}

function getFirstThumbnail(urls: string[]): string | null {
  for (const url of urls) {
    const thumb = getYoutubeThumbnailUrl(url)
    if (thumb) return thumb
  }
  return null
}

export default function VideoList({ initialData }: { initialData: ExerciseVideo[] }) {
  const [filter, setFilter] = useState('전체')
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data: videos = [] } = useExerciseVideos(initialData)

  const filtered = filter === '전체' ? videos : videos.filter((v) => v.category === filter)

  if (videos.length === 0) {
    return (
      <div className="card p-12 text-center text-sm text-slate">
        등록된 운동 영상이 없습니다
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* 카테고리 필터 — Stripe pill tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`text-sm px-3 py-1 rounded-md border transition-all ${
              filter === c
                ? 'bg-brand text-white border-brand font-medium'
                : 'text-slate border-mist bg-surface hover:border-mist-dark hover:text-body'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* 영상 목록 */}
      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate">
          해당 카테고리의 영상이 없습니다
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((video) => {
            const isOpen = expanded === video.id
            const thumbnail = getFirstThumbnail(video.urls)
            return (
              <div key={video.id} className="card overflow-hidden">
                <button
                  className="w-full text-left p-4 flex items-center gap-4 hover:bg-page transition-colors"
                  onClick={() => setExpanded(isOpen ? null : video.id)}
                >
                  {/* 썸네일 */}
                  <div className="relative w-24 h-16 rounded-md overflow-hidden bg-page flex-shrink-0 border border-mist">
                    {thumbnail ? (
                      <Image
                        src={thumbnail}
                        alt={video.title}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate/40 text-xl">
                        ▶
                      </div>
                    )}
                  </div>

                  {/* 텍스트 */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-md bg-brand-light text-brand font-medium flex-shrink-0">
                        {video.category}
                      </span>
                      <p className="text-sm font-semibold text-ink truncate">{video.title}</p>
                    </div>
                    {video.content && (
                      <p className="text-xs text-slate line-clamp-1">{video.content}</p>
                    )}
                    <p className="text-xs text-slate">영상 {video.urls.length}개</p>
                  </div>

                  <svg
                    className={`w-4 h-4 text-slate flex-shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-4 border-t border-mist pt-4">
                    {video.content && (
                      <p className="text-sm text-body whitespace-pre-wrap">{video.content}</p>
                    )}
                    {video.urls.length > 0 && (
                      <div className="space-y-3">
                        {video.urls.map((url, i) => {
                          const embedUrl = getYoutubeEmbedUrl(url)
                          return embedUrl ? (
                            <div key={i} className="aspect-video rounded-lg overflow-hidden bg-page border border-mist">
                              <iframe
                                src={embedUrl}
                                title={`${video.title} 영상 ${i + 1}`}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          ) : (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-sm text-brand underline underline-offset-2 truncate"
                            >
                              {url}
                            </a>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
