import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { parseISO, isPast } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { ko } from 'date-fns/locale'
import CancelBookingButton from '@/components/CancelBookingButton'
import PolicyBanner from '@/components/PolicyBanner'

const TIME_ZONE = 'Asia/Seoul'

function formatKST(dateStr: string, pattern: string) {
  return formatInTimeZone(parseISO(dateStr), TIME_ZONE, pattern, { locale: ko })
}

export default async function MyPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirect=/my')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, time_slots(*)')
    .eq('member_id', user.id)
    .eq('status', 'confirmed')
    .order('created_at', { ascending: false })

  const { data: policy } = await supabase
    .from('booking_policies')
    .select('booking_hours, cancel_hours')
    .eq('id', 1)
    .single()

  const bookingHours = policy?.booking_hours ?? 5
  const cancelHours = policy?.cancel_hours ?? 5

  const upcomingBookings =
    bookings?.filter(
      (b) => b.time_slots && !isPast(parseISO(b.time_slots.slot_time))
    ) ?? []

  const pastBookings =
    bookings?.filter(
      (b) => b.time_slots && isPast(parseISO(b.time_slots.slot_time))
    ) ?? []

  return (
    <div className="space-y-8">
      <div>
        <span className="text-xs font-semibold tracking-[0.14em] text-brand uppercase">
          My Schedule
        </span>
        <h1 className="font-display text-4xl font-bold text-ink mt-2 tracking-wide">
          내 예약
        </h1>
      </div>

      <PolicyBanner
        bookingHours={bookingHours}
        cancelHours={cancelHours}
      />

      {/* 프로필 카드 */}
      <div className="card p-5 flex items-center justify-between">
        <div>
          <p className="text-ink font-medium">
            {profile?.name ?? user.email?.split('@')[0]}
          </p>
          <p className="text-slate text-sm mt-0.5">{user.email}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-display font-bold text-brand">
            {profile?.remaining_sessions ?? 0}
          </p>
          <p className="text-slate text-xs">잔여 횟수</p>
        </div>
      </div>

      <section className="card-elevated p-5 space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand" />
          <h2 className="font-display text-lg font-semibold text-ink tracking-wide">
            코치 피드백
          </h2>
        </div>
        {profile?.coach_feedback ? (
          <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">
            {profile.coach_feedback}
          </p>
        ) : (
          <p className="text-sm text-slate">
            아직 등록된 피드백이 없습니다.
          </p>
        )}
      </section>

      {/* 예정된 예약 */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink tracking-wide flex items-center gap-2">
          예정된 PT
          <span className="badge-available">{upcomingBookings.length}</span>
        </h2>

        {upcomingBookings.length === 0 ? (
          <div className="card p-8 text-center space-y-3">
            <p className="text-slate text-sm">예정된 PT가 없습니다</p>
            <a href="/book" className="btn-primary inline-flex text-sm px-4 py-2">
              예약하러 가기
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingBookings.map((booking) => (
              <div
                key={booking.id}
                className="card p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-brand/10 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-brand font-display font-bold text-lg leading-none">
                      {formatKST(booking.time_slots!.slot_time, 'd')}
                    </span>
                    <span className="text-brand/70 text-[10px]">
                      {formatKST(booking.time_slots!.slot_time, 'EEE')}
                    </span>
                  </div>
                  <div>
                    <p className="text-ink font-medium">
                      {formatKST(
                        booking.time_slots!.slot_time,
                        'yyyy년 M월 d일 HH:mm'
                      )}
                    </p>
                    <p className="text-slate text-xs mt-0.5">
                      예약 확정됨
                    </p>
                  </div>
                </div>
                <CancelBookingButton
                  bookingId={booking.id}
                  slotTime={booking.time_slots!.slot_time}
                  cancelHours={cancelHours}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 지난 예약 */}
      {pastBookings.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-semibold text-slate tracking-wide">
            지난 PT
          </h2>
          <div className="space-y-2">
            {pastBookings.slice(0, 10).map((booking) => (
              <div
                key={booking.id}
                className="card p-4 flex items-center gap-4 opacity-40"
              >
                <div className="w-12 h-12 rounded-lg bg-sand flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-slate font-display font-bold text-lg leading-none">
                    {formatKST(booking.time_slots!.slot_time, 'd')}
                  </span>
                  <span className="text-slate/70 text-[10px]">
                    {formatKST(booking.time_slots!.slot_time, 'EEE')}
                  </span>
                </div>
                <p className="text-slate text-sm">
                  {formatKST(
                    booking.time_slots!.slot_time,
                    'yyyy년 M월 d일 HH:mm'
                  )}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
