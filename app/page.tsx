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
            <span className="text-xs font-semibold tracking-[0.14em] text-brand uppercase">
              Coachly Personal Training
            </span>
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold text-ink leading-tight tracking-tight">
            목표에 맞춘
            <br />
            <span className="text-brand">스마트 PT 예약</span>
          </h1>
          <p className="text-slate text-base md:text-lg max-w-md leading-relaxed">
            원하는 시간대를 바로 선택하고,
            <br className="hidden md:block" />
            트레이너와 함께 루틴을 완성하세요.
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
      <div className="h-px bg-gradient-to-r from-transparent via-mist to-transparent" />

      {/* 공지사항 */}
      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-2xl font-semibold text-ink tracking-wide">
            NOTICE
          </h2>
          <span className="text-slate font-body text-sm">공지사항</span>
        </div>

        {notices.length === 0 ? (
          <div className="card p-8 text-center text-slate text-sm">
            등록된 공지사항이 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {notices.map((notice) => (
              <div
                key={notice.id}
                className={`card p-5 transition-colors hover:border-brand/30 ${
                  notice.is_pinned ? 'border-brand/30 bg-brand/5' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {notice.is_pinned && (
                    <span className="mt-0.5 flex-shrink-0">
                      <svg
                        className="w-4 h-4 text-brand"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                      </svg>
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-ink text-sm">
                        {notice.title}
                      </h3>
                      {notice.is_pinned && (
                        <span className="badge-available">고정</span>
                      )}
                    </div>
                    <p className="text-slate text-sm mt-1.5 leading-relaxed whitespace-pre-wrap">
                      {notice.content}
                    </p>
                    <p className="text-slate/70 text-xs mt-3">
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
        <p className="font-display text-2xl font-semibold text-ink tracking-wide">
          지금 바로 예약하세요
        </p>
        <p className="text-slate text-sm">
          매주 새로운 시간표가 업데이트됩니다
        </p>
        <Link href="/book" className="btn-primary inline-flex">
          시간표 보기 →
        </Link>
      </section>
    </div>
  )
}
