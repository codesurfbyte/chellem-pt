'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError('')

    const origin = window.location.origin.replace(/\/$/, '')
    const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()?.replace(/\/$/, '')
    const baseUrl = origin || envUrl || ''

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        // Send recovery link through callback so code exchange happens server-side.
        redirectTo: `${baseUrl}/auth/callback?next=/reset-password`,
      }
    )

    setLoading(false)
    if (resetError) {
      setError(resetError.message)
      return
    }

    setSent(true)
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="card p-8 max-w-sm w-full space-y-6">
        <div>
          <span className="text-xs font-semibold tracking-[0.14em] text-brand uppercase">
            Password Reset
          </span>
          <h1 className="font-display text-3xl font-bold text-ink mt-2 tracking-wide">
            비밀번호 찾기
          </h1>
          <p className="text-slate text-sm mt-1">
            가입한 이메일로 비밀번호 재설정 링크를 보냅니다.
          </p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-emerald-700 text-sm">
              재설정 메일을 보냈습니다. 메일함을 확인해주세요.
            </div>
            <Link href="/login" className="btn-primary w-full inline-flex justify-center">
              로그인으로 돌아가기
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">이메일 *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="input"
              />
            </div>

            {error && <p className="text-red-600 text-xs">{error}</p>}

            <button
              type="submit"
              disabled={loading || !email}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '발송 중...' : '재설정 메일 보내기'}
            </button>

            <Link
              href="/login"
              className="block text-center text-xs text-slate hover:text-ink transition-colors"
            >
              로그인으로 돌아가기
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
