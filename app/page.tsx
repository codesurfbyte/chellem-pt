import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import type { Notice, BookingPolicy } from '@/lib/types'
import { parseISO } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { ko } from 'date-fns/locale'
import QrImage from '@/components/QrImage'

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

async function getPolicy(): Promise<{ bookingHours: number; cancelHours: number }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('booking_policies')
    .select('booking_hours, cancel_hours')
    .maybeSingle()
  if (error) console.error('booking_policies fetch error:', error)
  return {
    bookingHours: (data as BookingPolicy | null)?.booking_hours ?? 5,
    cancelHours: (data as BookingPolicy | null)?.cancel_hours ?? 5,
  }
}

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const [notices, policy] = await Promise.all([getNotices(), getPolicy()])
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
    <div className="space-y-10">

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative left-1/2 right-1/2 -mx-[50vw] -mt-10 w-screen overflow-hidden bg-ink">
        <div className="absolute inset-0">
          <Image
            src="/coach.JPG"
            alt="Chellem PT 메인 비주얼"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center opacity-40"
          />
          {/* Stripe-style subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A2540]/60 via-[#0A2540]/70 to-[#0A2540]/90" />
        </div>

        <div className="relative mx-auto flex min-h-[56vh] max-w-7xl items-center px-6 py-12 lg:py-16">
          <div className="grid w-full gap-10 lg:grid-cols-[1fr_320px] lg:gap-12 items-end">

            {/* Left: headline + CTA */}
            <div>
              <p className="eyebrow mb-3 text-[#00D4FF]">PT 예약 센터</p>
              <h1 className="font-display text-5xl font-bold text-white leading-[1.08] tracking-[-0.03em] lg:text-[52px]">
                루틴을 바꾸는
                <br />
                PT 예약 경험
              </h1>
              <p className="mt-4 text-base text-white/70 max-w-md leading-relaxed">
                수업 시작 {policy.bookingHours}시간 전까지 예약과 취소를 자유롭게 관리하세요.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/book"
                  className="btn-primary text-sm px-5 py-2.5"
                >
                  예약 시작하기
                </Link>
                <Link
                  href="/my"
                  className="inline-flex items-center justify-center px-5 py-2.5
                             border border-white/20 text-white text-sm font-medium
                             rounded-md hover:bg-white/10 transition-colors duration-150"
                >
                  내 예약 확인
                </Link>
              </div>
            </div>

            {/* Right: upcoming booking card */}
            <aside className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 text-white">
              <p className="text-xs font-semibold text-white/50 uppercase tracking-[0.08em] mb-3">
                주간 PT 예약
              </p>

              {nextBookingTime ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-white/10 bg-white/6 p-4">
                    <p className="text-xs text-white/50 mb-1">
                      {profileName ? `${profileName}님의 다음 PT` : '다음 예정 PT'}
                    </p>
                    <p className="text-2xl font-bold tracking-[-0.02em]">
                      {formatInTimeZone(parseISO(nextBookingTime), TIME_ZONE, 'M월 d일 HH:mm', { locale: ko })}
                    </p>
                    <p className="text-sm text-white/60 mt-1">
                      {formatInTimeZone(parseISO(nextBookingTime), TIME_ZONE, 'EEEE', { locale: ko })} 예약 확정
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-md border border-white/10 bg-white/6 px-2.5 py-1.5 text-xs text-white/80">
                      예정 {upcomingBookings.length}건
                    </span>
                    {remainingBookingCount > 0 && (
                      <span className="rounded-md border border-white/10 bg-white/6 px-2.5 py-1.5 text-xs text-white/80">
                        추가 {remainingBookingCount}건
                      </span>
                    )}
                    <span className="rounded-md border border-white/10 bg-white/6 px-2.5 py-1.5 text-xs text-white/80">
                      {policy.cancelHours}시간 전 변경 가능
                    </span>
                  </div>
                </div>
              ) : user ? (
                <div className="space-y-3">
                  <p className="text-sm text-white/65 leading-relaxed">
                    아직 예정된 PT가 없습니다. 이번 주 시간표를 확인하고 예약해보세요.
                  </p>
                  <span className="inline-block rounded-md border border-white/10 bg-white/6 px-2.5 py-1.5 text-xs text-white/80">
                    {policy.bookingHours}시간 전까지 예약 가능
                  </span>
                </div>
              ) : (
                <p className="text-sm text-white/65 leading-relaxed">
                  로그인 후 예약 현황을 확인하고 주간 시간표를 바로 예약할 수 있습니다.
                </p>
              )}
            </aside>

          </div>
        </div>
      </section>

      {/* ── Main content ──────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_288px]">

        {/* Notices */}
        <section className="space-y-4">
          {/* Section header — Stripe-style */}
          <div className="flex items-center justify-between pb-3 border-b border-mist">
            <h2 className="text-base font-semibold text-ink">공지사항</h2>
            <span className="text-xs text-slate">{notices.length}건</span>
          </div>

          {notices.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-sm text-slate">등록된 공지사항이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notices.map((notice) => (
                <div
                  key={notice.id}
                  className={`card p-4 transition-shadow hover:shadow-card-hover ${
                    notice.is_pinned
                      ? 'border-l-2 border-l-brand bg-brand-soft/30'
                      : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {notice.is_pinned && (
                      <svg
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                      </svg>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-ink">
                          {notice.title}
                        </h3>
                        {notice.is_pinned && (
                          <span className="badge-pinned">고정</span>
                        )}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-body">
                        {notice.content}
                      </p>
                      <p className="mt-2.5 text-xs text-slate">
                        {formatInTimeZone(parseISO(notice.created_at), TIME_ZONE, 'yyyy.MM.dd', { locale: ko })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Quick book card — Stripe billing-plan card style */}
          <div className="card overflow-hidden">
            {/* Card header band */}
            <div className="bg-page border-b border-mist px-4 py-2.5">
              <p className="text-xs font-semibold text-slate uppercase tracking-[0.07em]">
                빠른 예약
              </p>
            </div>

            <div className="p-5 text-center space-y-4">
              <div>
                <p className="text-base font-semibold text-ink">
                  지금 바로 예약하세요
                </p>
                <p className="mt-1 text-sm text-slate">
                  매주 새로운 시간표 업데이트
                </p>
              </div>

              <div className="flex flex-col items-center gap-2">
                <span className="text-xs text-slate">QR로 접속하기</span>
                <QrImage src={qrUrl} alt="chellem-pt QR 코드" />
                <span className="text-xs text-slate/70">
                  chellem-pt.vercel.app
                </span>
              </div>

              <Link href="/book" className="btn-primary w-full justify-center">
                시간표 보기 →
              </Link>
            </div>
          </div>

          {/* Policy info card */}
          <div className="card p-4 space-y-2">
            <p className="text-xs font-semibold text-slate uppercase tracking-[0.07em]">
              이용 안내
            </p>
            <ul className="space-y-2 text-sm text-body">
              {[
                `예약은 수업 시작 ${policy.bookingHours}시간 전까지`,
                `취소는 수업 시작 ${policy.cancelHours}시간 전까지`,
                '잔여 횟수 소진 시 예약 불가',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-bold">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

    </div>
  )
}
