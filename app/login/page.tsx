'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const redirectUrl = searchParams.get('redirect') ?? '/book'
  const safeRedirectUrl = redirectUrl.startsWith('/') ? redirectUrl : '/book'
  const authError = searchParams.get('error')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace(safeRedirectUrl)
    })
  }, [safeRedirectUrl, router, supabase])

  const handleKakaoLogin = async () => {
    setLoading(true)
    setError('')

    document.cookie = `auth_redirect=${encodeURIComponent(safeRedirectUrl)};path=/;max-age=300;samesite=lax`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'profile_nickname profile_image',
      },
    })

    if (error) {
      setError('카카오 로그인에 실패했습니다. 다시 시도해주세요.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="card p-8 max-w-sm w-full space-y-6">
        <div>
          <span className="text-xs font-semibold tracking-[0.14em] text-brand uppercase">
            Welcome
          </span>
          <h1 className="font-display text-3xl font-bold text-ink mt-2 tracking-wide">
            로그인
          </h1>
          <p className="text-slate text-sm mt-1">
            카카오 계정으로 간편하게 시작하세요
          </p>
        </div>

        {authError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
            인증에 실패했습니다. 다시 시도해주세요.
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleKakaoLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 rounded-xl py-3 px-4 font-semibold text-[#3C1E1E] disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          style={{ backgroundColor: '#FEE500' }}
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
            <>
              <KakaoIcon />
              카카오로 시작하기
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function KakaoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.707 1.565 5.09 3.938 6.538L4.875 21l4.688-2.438c.79.143 1.604.218 2.437.218 5.523 0 10-3.477 10-7.8S17.523 3 12 3z" />
    </svg>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
