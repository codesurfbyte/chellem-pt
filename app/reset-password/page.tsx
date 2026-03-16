'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setReady(!!session)
      setCheckingSession(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(!!session)
        setCheckingSession(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!password || !confirmPassword) return

    if (password.length < 8) {
      setError('비밀번호는 8자 이상으로 입력해주세요.')
      return
    }
    if (password !== confirmPassword) {
      setError('비밀번호 확인이 일치하지 않습니다.')
      return
    }

    setLoading(true)
    setError('')

    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setLoading(false)
      setError(updateError.message)
      return
    }

    await supabase.auth.signOut()
    router.replace('/login?reset=success')
  }

  if (checkingSession) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate text-sm">
        인증 상태를 확인하는 중...
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="card p-8 max-w-sm w-full space-y-4">
          <h1 className="font-display text-2xl font-bold text-ink tracking-wide">
            비밀번호 변경
          </h1>
          <p className="text-sm text-slate">
            유효한 재설정 링크로 다시 접속하거나 로그인 후 다시 시도해주세요.
          </p>
          <div className="flex gap-2">
            <Link href="/forgot-password" className="btn-secondary text-xs px-4 py-2">
              재설정 메일 받기
            </Link>
            <Link href="/login" className="btn-primary text-xs px-4 py-2">
              로그인
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="card p-8 max-w-sm w-full space-y-6">
        <div>
          <span className="text-xs font-semibold tracking-[0.14em] text-brand uppercase">
            Password Reset
          </span>
          <h1 className="font-display text-3xl font-bold text-ink mt-2 tracking-wide">
            새 비밀번호 설정
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">새 비밀번호 *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8자 이상 입력"
              required
              className="input"
            />
          </div>

          <div>
            <label className="label">새 비밀번호 확인 *</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="비밀번호를 다시 입력"
              required
              className="input"
            />
          </div>

          {error && <p className="text-red-600 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading || !password || !confirmPassword}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '변경 중...' : '비밀번호 변경'}
          </button>
        </form>
      </div>
    </div>
  )
}
