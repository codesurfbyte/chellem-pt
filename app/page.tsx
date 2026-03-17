import Link from 'next/link'
import Image from 'next/image'
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
  const qrUrl =
    'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https%3A%2F%2Fchellem-pt.vercel.app%2F'

  return (
    <div className="space-y-12 md:space-y-16">
      <section className="relative left-1/2 right-1/2 -mx-[50vw] -mt-10 w-screen overflow-hidden bg-[#031b1b]">
        <div className="absolute inset-0">
          <Image
            src="/coach.JPG"
            alt="Coachly 메인 비주얼"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,18,18,0.16)_0%,rgba(2,18,18,0.52)_58%,rgba(2,18,18,0.88)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_20%,rgba(1,135,134,0.36),transparent_26%),radial-gradient(circle_at_82%_74%,rgba(255,255,255,0.08),transparent_22%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(118deg,rgba(1,135,134,0.38)_0%,rgba(1,135,134,0.12)_34%,rgba(3,14,14,0.12)_100%)]" />
        </div>

        <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-end px-4 pb-6 pt-10 sm:px-6 md:pb-10 lg:px-8">
          <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
            <div className="max-w-3xl self-end">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-xl">
                <Image
                  src="/coachly-logo.png"
                  alt="Coachly"
                  width={22}
                  height={22}
                  className="rounded-full bg-white object-contain"
                />
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/90">
                  Coachly Premium PT
                </span>
              </div>

              <h1 className="mt-5 font-display text-5xl font-bold leading-[0.95] tracking-[-0.05em] text-white sm:text-6xl lg:text-[88px]">
                루틴을 바꾸는
                <br />
                PT 예약 경험
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-white/82 sm:text-lg">
                배경 이미지를 전면으로 활용해 첫인상을 만들고, 예약과 정책,
                피드백 흐름은 더 심플하게 연결합니다. 모바일과 데스크톱 모두
                강한 무드를 유지하는 방향입니다.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/book"
                  className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#083333] transition-transform duration-150 hover:scale-[0.99]"
                >
                  예약 시작하기
                </Link>
                <Link
                  href="/my"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-xl transition-colors duration-150 hover:bg-white/15"
                >
                  내 예약 확인
                </Link>
              </div>
            </div>

            <aside className="rounded-[28px] border border-white/15 bg-[#091c1c]/45 p-5 text-white shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-6 lg:self-end">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/65">
                Weekly Flow
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
                주간 PT 예약
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/78">
                수업 시작 5시간 전까지 예약과 취소를 관리하고, 트레이너는 주간
                시간표를 빠르게 편집할 수 있습니다.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/8 px-3 py-2 text-xs text-white/90">
                  Weekly Slots
                </span>
                <span className="rounded-full border border-white/10 bg-white/8 px-3 py-2 text-xs text-white/90">
                  Trainer Feedback
                </span>
                <span className="rounded-full border border-white/10 bg-white/8 px-3 py-2 text-xs text-white/90">
                  Policy Banner
                </span>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_320px]">
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-2xl font-semibold text-ink tracking-wide">
              NOTICE
            </h2>
            <span className="text-sm text-slate">공지사항</span>
          </div>

          {notices.length === 0 ? (
            <div className="card p-8 text-center text-sm text-slate">
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
                          className="h-4 w-4 text-brand"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                        </svg>
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-medium text-ink">
                          {notice.title}
                        </h3>
                        {notice.is_pinned && (
                          <span className="badge-available">고정</span>
                        )}
                      </div>
                      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate">
                        {notice.content}
                      </p>
                      <p className="mt-3 text-xs text-slate/70">
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

        <aside className="space-y-4">
          <section className="card-elevated p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
              Booking Policy
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">
              예약 안내
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate">
              예약과 취소는 수업 시작 5시간 전까지 가능합니다. 정책 변경 시
              예약 화면에도 동일하게 반영됩니다.
            </p>
          </section>

          <section className="card-elevated p-8 text-center">
            <p className="font-display text-2xl font-semibold tracking-wide text-ink">
              지금 바로 예약하세요
            </p>
            <p className="mt-2 text-sm text-slate">
              매주 새로운 시간표가 업데이트됩니다
            </p>
            <div className="mt-5 flex flex-col items-center gap-3">
              <span className="text-xs text-slate">QR로 접속하기</span>
              <img
                src={qrUrl}
                alt="chellem-pt 바로가기 QR 코드"
                className="h-40 w-40 rounded-xl border border-mist bg-white"
                loading="lazy"
              />
              <span className="text-[10px] text-slate/70">
                https://chellem-pt.vercel.app/
              </span>
            </div>
            <Link href="/book" className="btn-primary mt-5 inline-flex">
              시간표 보기 →
            </Link>
          </section>
        </aside>
      </div>
    </div>
  )
}
