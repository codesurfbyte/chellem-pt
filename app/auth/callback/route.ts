import { createServerClient } from '@supabase/ssr'
import type { SetAllCookies } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  const cookieHeader = request.headers.get('cookie') ?? ''
  const match = cookieHeader.match(/auth_redirect=([^;]+)/)
  const next = match ? decodeURIComponent(match[1]) : '/book'
  const safeNext = next.startsWith('/') ? next : '/book'

  if (code) {
    const response = NextResponse.redirect(`${origin}${safeNext}`)
    response.cookies.set('auth_redirect', '', { maxAge: 0, path: '/' })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieHeader.split(';').flatMap((c) => {
              const trimmed = c.trim()
              const eq = trimmed.indexOf('=')
              if (eq < 0) return []
              return [{ name: trimmed.slice(0, eq), value: trimmed.slice(eq + 1) }]
            })
          },
          setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options ?? {})
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const name =
          user.user_metadata?.name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.user_name ||
          user.email?.split('@')[0] ||
          '회원'
        await supabase.from('profiles').upsert(
          { id: user.id, name },
          { onConflict: 'id', ignoreDuplicates: true }
        )
      }
      return response
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
