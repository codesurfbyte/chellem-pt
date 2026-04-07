'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { cn } from '@/lib/utils'

export default function NavBar() {
  const pathname = usePathname()
  const { user, isAdmin } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = () => {
    window.location.href = '/auth/signout'
  }

  const navLinks = [
    { href: '/', label: '홈' },
    { href: '/book', label: '예약하기' },
    ...(user ? [{ href: '/my', label: '내 예약' }, { href: '/videos', label: '운동영상' }] : []),
    ...(isAdmin ? [{ href: '/admin', label: '관리자' }] : []),
  ]

  return (
    <nav className="sticky top-0 z-50 bg-surface border-b border-mist">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-6">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          {/* 브랜드 아이콘 — Stripe 스타일 라운드 사각형 */}
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-white font-bold text-lg select-none">C</span>
          </div>
          <div className="leading-[1.2]">
            <span className="block font-semibold text-sm text-ink tracking-[-0.01em]">
              Chellem PT
            </span>
            <span className="block text-xs text-slate">
              예약 센터
            </span>
          </div>
        </Link>

        {/* Desktop Nav — center */}
        <div className="hidden md:flex items-center gap-0.5 flex-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-100',
                mounted && pathname === link.href
                  ? 'text-ink bg-page'
                  : 'text-slate hover:text-body hover:bg-page'
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Auth — right */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {user ? (
            <>
              <span className="text-xs text-slate truncate max-w-[180px]">
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link href="/login" className="btn-primary">
              로그인
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="메뉴"
          className="md:hidden p-1.5 text-slate hover:text-ink rounded-md hover:bg-page transition-colors"
        >
          <div className="w-5 space-y-[5px]">
            <span className={cn('block h-[1.5px] bg-current rounded-full transition-all duration-200', menuOpen ? 'rotate-45 translate-y-[6.5px]' : '')} />
            <span className={cn('block h-[1.5px] bg-current rounded-full transition-all duration-200', menuOpen ? 'opacity-0' : '')} />
            <span className={cn('block h-[1.5px] bg-current rounded-full transition-all duration-200', menuOpen ? '-rotate-45 -translate-y-[6.5px]' : '')} />
          </div>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-mist bg-surface px-4 py-3 space-y-0.5">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                'block px-3 py-2 rounded-md text-sm font-medium transition-all',
                mounted && pathname === link.href
                  ? 'text-ink bg-page'
                  : 'text-slate hover:text-body hover:bg-page'
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 mt-2 border-t border-mist">
            {user ? (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs text-slate truncate">{user.email}</span>
                <button
                  onClick={handleLogout}
                  className="text-xs text-red-500 hover:text-red-600 font-medium"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 text-sm font-semibold text-brand"
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
