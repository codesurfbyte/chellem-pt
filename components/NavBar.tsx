'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { cn } from '@/lib/utils'

export default function NavBar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
        setIsAdmin(true)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setUser(session?.user ?? null)
        setIsAdmin(session?.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL)
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const navLinks = [
    { href: '/', label: '홈' },
    { href: '/book', label: '예약하기' },
    ...(user ? [{ href: '/my', label: '내 예약' }] : []),
    ...(isAdmin ? [{ href: '/admin', label: '관리자' }] : []),
  ]

  return (
    <nav className="sticky top-0 z-50 bg-[#080808]/90 backdrop-blur-md border-b border-[#1A1A1A]">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-[#C8FF00] font-display font-bold text-xl tracking-wider">
            PT
          </span>
          <span className="text-white font-display font-medium text-xl tracking-wide">
            TRAINER
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                pathname === link.href
                  ? 'bg-[#C8FF00]/10 text-[#C8FF00]'
                  : 'text-gray-400 hover:text-white hover:bg-[#1A1A1A]'
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Auth */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 truncate max-w-[140px]">
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <Link href="/login" className="btn-primary text-sm px-4 py-2">
              로그인
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden p-2 text-gray-400 hover:text-white"
        >
          <div className="w-5 space-y-1.5">
            <span
              className={cn(
                'block h-px bg-current transition-all duration-200',
                menuOpen ? 'rotate-45 translate-y-2' : ''
              )}
            />
            <span
              className={cn(
                'block h-px bg-current transition-all duration-200',
                menuOpen ? 'opacity-0' : ''
              )}
            />
            <span
              className={cn(
                'block h-px bg-current transition-all duration-200',
                menuOpen ? '-rotate-45 -translate-y-2' : ''
              )}
            />
          </div>
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-[#1A1A1A] bg-[#0F0F0F] px-4 py-3 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                'block px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                pathname === link.href
                  ? 'bg-[#C8FF00]/10 text-[#C8FF00]'
                  : 'text-gray-400 hover:text-white hover:bg-[#1A1A1A]'
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-[#1A1A1A]">
            {user ? (
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-xs text-gray-500 truncate">{user.email}</span>
                <button
                  onClick={handleLogout}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 text-sm font-medium text-[#C8FF00]"
              >
                로그인 →
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
