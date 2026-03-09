'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const redirect = searchParams.get('redirect') ?? '/book'
  const authError = searchParams.get('error')

  useEffect(() => {
    // 이미 로그인된 경우 리다이렉트
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace(redirect)
    })
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${redirect}`,
        data: { name: name.trim() || undefined },
      },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="card p-8 max-w-sm w-full text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-[#C8FF00]/10 flex items-center justify-center mx-auto">
            <svg
              className="w-8 h-8 text-[#C8FF00]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-white tracking-wide">
              이메일 확인
            </h2>
            <p className="text-gray-400 text-sm mt-2 leading-relaxed">
              <span className="text-white font-medium">{email}</span>로<br />
              로그인 링크를 전송했습니다.<br />
              이메일을 확인해주세요.
            </p>
          </div>
          <p className="text-gray-600 text-xs">
            스팸 폴더도 확인해보세요
          </p>
          <button
            onClick={() => setSent(false)}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="card p-8 max-w-sm w-full space-y-6">
        <div>
          <span className="text-xs font-semibold tracking-[0.2em] text-[#C8FF00] uppercase">
            Welcome
          </span>
          <h1 className="font-display text-3xl font-bold text-white mt-2 tracking-wide">
            로그인
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            이메일로 로그인 링크를 받으세요
          </p>
        </div>

        {authError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
            인증에 실패했습니다. 다시 시도해주세요.
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
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

          {error && (
            <p className="text-red-400 text-xs">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !email}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                전송 중...
              </span>
            ) : (
              '로그인 링크 받기'
            )}
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs leading-relaxed">
          처음 방문이라면 이메일 입력 후 전송된 링크를 클릭하면<br />
          자동으로 계정이 생성됩니다.
        </p>
      </div>
    </div>
  )
}
