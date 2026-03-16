'use client'

import Link from 'next/link'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const redirectUrl = searchParams.get('redirect') ?? '/book'
  const safeRedirectUrl = redirectUrl.startsWith('/') ? redirectUrl : '/book'
  const authError = searchParams.get('error')
  const resetSuccess = searchParams.get('reset') === 'success'

  useEffect(() => {
    // 이미 로그인된 경우 리다이렉트
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace(safeRedirectUrl)
    })
  }, [safeRedirectUrl, router, supabase])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setLoading(true)
    setError('')

    let authError = null

    if (isSignUp) {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { name: name.trim() || undefined },
        },
      })
      authError = signUpError
      if (!signUpError) {
        alert('회원가입 성공! 바로 로그인됩니다.')
        window.location.href = safeRedirectUrl
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      authError = signInError
      if (!signInError) {
        await supabase.auth.getSession()
        window.location.href = safeRedirectUrl
      }
    }

    setLoading(false)

    if (authError) {
      // 에러 메시지 한글화 등
      if (authError.message.includes('Invalid login credentials')) {
        setError('이메일이나 비밀번호가 맞지 않습니다.')
      } else if (authError.message.includes('User already registered')) {
        setError('이미 가입된 계정입니다. 로그인을 선택해주세요.')
      } else {
        setError(authError.message)
      }
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="card p-8 max-w-sm w-full space-y-6">
        <div>
          <span className="text-xs font-semibold tracking-[0.14em] text-brand uppercase">
            {isSignUp ? 'Join Us' : 'Welcome'}
          </span>
          <h1 className="font-display text-3xl font-bold text-ink mt-2 tracking-wide">
            {isSignUp ? '회원가입' : '로그인'}
          </h1>
          <p className="text-slate text-sm mt-1">
            {isSignUp ? '새 계정을 만드세요' : '다시 오신 것을 환영합니다'}
          </p>
        </div>

        {authError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
            인증에 실패했습니다. 다시 시도해주세요.
          </div>
        )}
        {resetSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-emerald-700 text-sm">
            비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="label">이름 (선택)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                className="input"
              />
            </div>
          )}

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

          <div>
            <label className="label">비밀번호 *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="******"
              required
              className="input"
            />
            {!isSignUp && (
              <div className="mt-2 text-right">
                <Link
                  href="/forgot-password"
                  className="text-xs text-slate hover:text-ink transition-colors"
                >
                  비밀번호를 잊으셨나요?
                </Link>
              </div>
            )}
          </div>

          {error && (
            <p className="text-red-600 text-xs">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                처리 중...
              </span>
            ) : (
              isSignUp ? '회원가입' : '로그인'
            )}
          </button>
        </form>

        <div className="pt-2 text-center text-sm">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError('')
            }}
            className="text-slate hover:text-ink transition-colors"
          >
            {isSignUp ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
