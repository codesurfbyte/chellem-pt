import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminTabs from '@/components/admin/AdminTabs'

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirect=/admin')
  if (user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    redirect('/')
  }

  // 이번 주 요약 통계
  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay() + 1)
  weekStart.setHours(0, 0, 0, 0)

  const [{ count: slotCount }, { count: bookingCount }, { count: memberCount }] =
    await Promise.all([
      supabase
        .from('time_slots')
        .select('*', { count: 'exact', head: true })
        .gte('slot_time', weekStart.toISOString()),
      supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'confirmed')
        .gte('created_at', weekStart.toISOString()),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
    ])

  return (
    <div className="space-y-8">
      <div>
        <span className="text-xs font-semibold tracking-[0.2em] text-[#C8FF00] uppercase">
          Admin
        </span>
        <h1 className="font-display text-4xl font-bold text-white mt-2 tracking-wide">
          관리자 대시보드
        </h1>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '이번주 슬롯', value: slotCount ?? 0 },
          { label: '이번주 예약', value: bookingCount ?? 0 },
          { label: '전체 회원', value: memberCount ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="card p-4 text-center">
            <p className="font-display font-bold text-3xl text-[#C8FF00]">
              {value}
            </p>
            <p className="text-gray-500 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* 탭 패널 */}
      <AdminTabs />
    </div>
  )
}
