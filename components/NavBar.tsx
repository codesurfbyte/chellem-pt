'use client'

import Link from 'next/link'
import Image from 'next/image'
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
    ...(user ? [{ href: '/my', label: '내 예약' }] : []),
    ...(isAdmin ? [{ href: '/admin', label: '관리자' }] : []),
  ]

  return (
    <nav className="sticky top-0 z-50 bg-surface border-b border-mist">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-20 h-20">
            <Image
              src="/coachly-logo.png"
              alt="Coachly"
              fill
              sizes="120px"
              className="object-contain"
              priority
            />
          </div>
          <div className="leading-tight">
            <span className="block font-display text-lg text-ink tracking-wide">
              Chellem PT
            </span>
            <span className="block text-xs tracking-wide text-slate">
              예약 센터
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-all duration-150',
                mounted && pathname === link.href
                  ? 'bg-brand/10 text-brand'
                  : 'text-slate hover:text-ink hover:bg-brand/10'
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
              <span className="text-xs text-slate truncate max-w-[160px]">
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                className="text-xs text-slate hover:text-ink transition-colors"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <Link href="/login" className="btn-primary text-sm px-5 py-2.5">
              로그인
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden p-2 text-slate hover:text-ink"
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
        <div className="md:hidden border-t border-mist bg-surface px-4 py-3 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                'block px-4 py-2.5 rounded-md text-sm font-medium transition-all',
                mounted && pathname === link.href
                  ? 'bg-brand/10 text-brand'
                  : 'text-slate hover:text-ink hover:bg-brand/10'
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-mist">
            {user ? (
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-xs text-slate truncate">{user.email}</span>
                <button
                  onClick={handleLogout}
                  className="text-xs text-red-600 hover:text-red-500"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 text-sm font-medium text-brand"
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
