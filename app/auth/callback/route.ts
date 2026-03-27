import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  const cookieHeader = request.headers.get('cookie') ?? ''
  const match = cookieHeader.match(/auth_redirect=([^;]+)/)
  const next = match ? decodeURIComponent(match[1]) : '/book'
  const safeNext = next.startsWith('/') ? next : '/book'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const response = NextResponse.redirect(`${origin}${safeNext}`)
      response.cookies.set('auth_redirect', '', { maxAge: 0, path: '/' })
      return response
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
