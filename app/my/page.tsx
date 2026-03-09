import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format, parseISO, isPast } from 'date-fns'
import { ko } from 'date-fns/locale'
import CancelBookingButton from '@/components/CancelBookingButton'

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
        <span className="text-xs font-semibold tracking-[0.2em] text-[#C8FF00] uppercase">
          My Schedule
        </span>
        <h1 className="font-display text-4xl font-bold text-white mt-2 tracking-wide">
          내 예약
        </h1>
      </div>

      {/* 프로필 카드 */}
      <div className="card p-5 flex items-center justify-between">
        <div>
          <p className="text-white font-medium">
            {profile?.name ?? user.email?.split('@')[0]}
          </p>
          <p className="text-gray-500 text-sm mt-0.5">{user.email}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-display font-bold text-[#C8FF00]">
            {profile?.remaining_sessions ?? 0}
          </p>
          <p className="text-gray-500 text-xs">잔여 횟수</p>
        </div>
      </div>

      {/* 예정된 예약 */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-white tracking-wide flex items-center gap-2">
          예정된 PT
          <span className="badge-available">{upcomingBookings.length}</span>
        </h2>

        {upcomingBookings.length === 0 ? (
          <div className="card p-8 text-center space-y-3">
            <p className="text-gray-600 text-sm">예정된 PT가 없습니다</p>
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
                  <div className="w-12 h-12 rounded-xl bg-[#C8FF00]/10 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-[#C8FF00] font-display font-bold text-lg leading-none">
                      {format(parseISO(booking.time_slots!.slot_time), 'd')}
                    </span>
                    <span className="text-[#C8FF00]/60 text-[10px]">
                      {format(parseISO(booking.time_slots!.slot_time), 'EEE', {
                        locale: ko,
                      })}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {format(
                        parseISO(booking.time_slots!.slot_time),
                        'yyyy년 M월 d일 HH:mm',
                        { locale: ko }
                      )}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      예약 확정됨
                    </p>
                  </div>
                </div>
                <CancelBookingButton bookingId={booking.id} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 지난 예약 */}
      {pastBookings.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-semibold text-gray-500 tracking-wide">
            지난 PT
          </h2>
          <div className="space-y-2">
            {pastBookings.slice(0, 10).map((booking) => (
              <div
                key={booking.id}
                className="card p-4 flex items-center gap-4 opacity-40"
              >
                <div className="w-12 h-12 rounded-xl bg-[#1A1A1A] flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-gray-500 font-display font-bold text-lg leading-none">
                    {format(parseISO(booking.time_slots!.slot_time), 'd')}
                  </span>
                  <span className="text-gray-700 text-[10px]">
                    {format(parseISO(booking.time_slots!.slot_time), 'EEE', {
                      locale: ko,
                    })}
                  </span>
                </div>
                <p className="text-gray-500 text-sm">
                  {format(
                    parseISO(booking.time_slots!.slot_time),
                    'yyyy년 M월 d일 HH:mm',
                    { locale: ko }
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
