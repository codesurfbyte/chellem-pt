'use client'

import { useCallback, useEffect, useState, type ChangeEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { BookingPolicy } from '@/lib/types'

type PolicyForm = {
  bookingHours: number
  cancelHours: number
}

const DEFAULT_POLICY: PolicyForm = {
  bookingHours: 5,
  cancelHours: 5,
}

export default function PolicyManager() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<PolicyForm>(DEFAULT_POLICY)
  const [notice, setNotice] = useState<string | null>(null)

  const fetchPolicy = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('booking_policies')
      .select('id, booking_hours, cancel_hours, updated_at')
      .eq('id', 1)
      .single()

    const policy = data as BookingPolicy | null
    setForm({
      bookingHours: policy?.booking_hours ?? DEFAULT_POLICY.bookingHours,
      cancelHours: policy?.cancel_hours ?? DEFAULT_POLICY.cancelHours,
    })
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchPolicy()
  }, [fetchPolicy])

  const handleChange =
    (key: keyof PolicyForm) => (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = Number(event.target.value)
      setForm((prev) => ({
        ...prev,
        [key]: Number.isFinite(nextValue) ? nextValue : prev[key],
      }))
    }

  const handleSave = async () => {
    setSaving(true)
    setNotice(null)

    const payload = {
      id: 1,
      booking_hours: Math.max(1, Math.floor(form.bookingHours)),
      cancel_hours: Math.max(1, Math.floor(form.cancelHours)),
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('booking_policies')
      .upsert(payload, { onConflict: 'id' })

    if (error) {
      alert(error.message)
      setSaving(false)
      return
    }

    setForm({
      bookingHours: payload.booking_hours,
      cancelHours: payload.cancel_hours,
    })
    setNotice('정책이 저장되었습니다.')
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <div className="card p-5 space-y-4">
        <div>
          <h3 className="text-ink font-display text-lg font-semibold">
            예약/취소 정책
          </h3>
          <p className="text-slate text-sm mt-1">
            설정한 시간(시간 단위)은 즉시 예약/취소 정책에 반영됩니다.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-semibold tracking-[0.14em] text-slate uppercase">
              예약 가능 시간
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={168}
                step={1}
                value={form.bookingHours}
                onChange={handleChange('bookingHours')}
                disabled={loading || saving}
                className="w-full px-3 py-2 rounded-lg border border-mist bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
              <span className="text-sm text-slate">시간 전까지</span>
            </div>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold tracking-[0.14em] text-slate uppercase">
              취소 가능 시간
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={168}
                step={1}
                value={form.cancelHours}
                onChange={handleChange('cancelHours')}
                disabled={loading || saving}
                className="w-full px-3 py-2 rounded-lg border border-mist bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
              <span className="text-sm text-slate">시간 전까지</span>
            </div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate">
            현재 정책: 예약 {form.bookingHours}시간 전, 취소 {form.cancelHours}
            시간 전까지
          </p>
          <button
            onClick={handleSave}
            disabled={loading || saving}
            className={cn(
              'btn-primary text-sm px-4 py-2',
              (loading || saving) && 'opacity-60'
            )}
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      {notice && <p className="text-xs text-brand">{notice}</p>}
    </div>
  )
}
