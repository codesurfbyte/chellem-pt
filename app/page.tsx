import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import type { Notice } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { ko } from 'date-fns/locale'

export const revalidate = 60 // 1분마다 갱신

const TIME_ZONE = 'Asia/Seoul'

type UpcomingHomeBooking = {
  id: string
  time_slots: {
    slot_time: string
  } | null
}

type UpcomingHomeBookingRow = {
  id: string
  time_slots:
    | {
        slot_time: string
      }[]
    | {
        slot_time: string
      }
    | null
}

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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const notices = await getNotices()
  const qrUrl =
    'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https%3A%2F%2Fchellem-pt.vercel.app%2F'

  let profileName: string | null = null
  let upcomingBookings: UpcomingHomeBooking[] = []

  if (user) {
    const [{ data: profile }, { data: bookings }] = await Promise.all([
      supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('bookings')
        .select('id, time_slots!inner(slot_time)')
        .eq('member_id', user.id)
        .eq('status', 'confirmed')
        .gte('time_slots.slot_time', new Date().toISOString())
        .order('slot_time', { referencedTable: 'time_slots', ascending: true })
        .limit(3),
    ])

    profileName = profile?.name ?? null
    upcomingBookings = (bookings ?? []).map((booking) => {
      const row = booking as UpcomingHomeBookingRow
      const timeSlot = Array.isArray(row.time_slots)
        ? (row.time_slots[0] ?? null)
        : row.time_slots

      return {
        id: row.id,
        time_slots: timeSlot,
      }
    })
  }

  const nextBooking = upcomingBookings[0]
  const nextBookingTime = nextBooking?.time_slots?.slot_time ?? null
  const remainingBookingCount = Math.max(upcomingBookings.length - 1, 0)

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

        <div className="relative mx-auto flex min-h-[calc(70vh-4rem)] max-w-6xl items-center px-4 pb-6 pt-10 sm:px-6 md:pb-10 lg:px-8">
          <div className="grid w-full gap-[3.5em] lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
            <div className="max-w-3xl">
              <h1 className="mt-5 font-display text-5xl font-bold leading-[1] tracking-[-0.05em] text-white sm:text-6xl lg:text-[88px]">
                루틴을 바꾸는
                <br />
                PT 예약 경험
              </h1>

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
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
                주간 PT 예약
              </h2>
              {nextBookingTime ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-3xl border border-white/12 bg-white/8 p-4">
                    <p className="text-xs font-medium text-white/64">
                      {profileName ? `${profileName}님의 다음 PT` : '다음 예정 PT'}
                    </p>
                    <p className="mt-2 font-display text-3xl font-semibold tracking-tight">
                      {formatInTimeZone(
                        parseISO(nextBookingTime),
                        TIME_ZONE,
                        'M월 d일 HH:mm',
                        { locale: ko }
                      )}
                    </p>
                    <p className="mt-1 text-sm text-white/72">
                      {formatInTimeZone(
                        parseISO(nextBookingTime),
                        TIME_ZONE,
                        'EEEE',
                        { locale: ko }
                      )}{' '}
                      예약 확정
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-white/8 px-3 py-2 text-xs text-white/90">
                      예정 {upcomingBookings.length}건
                    </span>
                    {remainingBookingCount > 0 && (
                      <span className="rounded-full border border-white/10 bg-white/8 px-3 py-2 text-xs text-white/90">
                        추가 예정 {remainingBookingCount}건
                      </span>
                    )}
                    <span className="rounded-full border border-white/10 bg-white/8 px-3 py-2 text-xs text-white/90">
                      5시간 전까지 변경 가능
                    </span>
                  </div>
                </div>
              ) : user ? (
                <div className="mt-4 space-y-4">
                  <p className="text-sm leading-relaxed text-white/78">
                    아직 예정된 PT가 없습니다. <br />이번 주 시간표를 확인하고 원하는
                    시간대를 예약해보세요.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-white/8 px-3 py-2 text-xs text-white/90">
                      5시간 전까지 예약 가능
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <p className="text-sm leading-relaxed text-white/78">
                    수업 시작 5시간 전까지 예약과 취소를 관리하고, 트레이너는
                    주간 시간표를 빠르게 편집할 수 있습니다.
                  </p>
                </div>
              )}
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
                  className={`card p-5 transition-colors hover:border-brand/30 ${notice.is_pinned ? 'border-brand/30 bg-brand/5' : ''
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
