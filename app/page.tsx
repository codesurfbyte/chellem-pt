import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Notice } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'

export const revalidate = 60 // 1분마다 갱신

async function getNotices(): Promise<Notice[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('notices')
    .select('*')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(10)
  return data ?? []
}

export default async function HomePage() {
  const notices = await getNotices()

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="pt-8 pb-4">
        <div className="space-y-4">
          <div className="inline-block">
            <span className="text-xs font-semibold tracking-[0.2em] text-[#C8FF00] uppercase">
              Personal Training
            </span>
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-bold text-white leading-none tracking-tight">
            TRAIN
            <br />
            <span className="text-[#C8FF00]">SMARTER</span>
          </h1>
          <p className="text-gray-400 text-base md:text-lg max-w-sm leading-relaxed">
            원하는 시간대를 직접 선택하고 <br className="hidden md:block" />
            트레이너와 함께 목표를 이뤄보세요.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 mt-8">
          <Link href="/book" className="btn-primary flex items-center gap-2">
            <span>예약하기</span>
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
          <Link href="/my" className="btn-secondary">
            내 예약 확인
          </Link>
        </div>
      </section>

      {/* 구분선 */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#2A2A2A] to-transparent" />

      {/* 공지사항 */}
      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-2xl font-semibold text-white tracking-wide">
            NOTICE
          </h2>
          <span className="text-gray-600 font-body text-sm">공지사항</span>
        </div>

        {notices.length === 0 ? (
          <div className="card p-8 text-center text-gray-600 text-sm">
            등록된 공지사항이 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {notices.map((notice) => (
              <div
                key={notice.id}
                className={`card p-5 transition-colors hover:border-[#2A2A2A] ${
                  notice.is_pinned ? 'border-[#C8FF00]/20 bg-[#C8FF00]/[0.02]' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {notice.is_pinned && (
                    <span className="mt-0.5 flex-shrink-0">
                      <svg
                        className="w-4 h-4 text-[#C8FF00]"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                      </svg>
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-white text-sm">
                        {notice.title}
                      </h3>
                      {notice.is_pinned && (
                        <span className="badge-available">고정</span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mt-1.5 leading-relaxed whitespace-pre-wrap">
                      {notice.content}
                    </p>
                    <p className="text-gray-600 text-xs mt-3">
                      {format(parseISO(notice.created_at), 'yyyy.MM.dd', {
                        locale: ko,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 하단 CTA */}
      <section className="card-elevated p-8 text-center space-y-4">
        <p className="font-display text-2xl font-semibold text-white tracking-wide">
          지금 바로 예약하세요
        </p>
        <p className="text-gray-500 text-sm">
          매주 새로운 시간표가 업데이트됩니다
        </p>
        <Link href="/book" className="btn-primary inline-flex">
          시간표 보기 →
        </Link>
      </section>
    </div>
  )
}
