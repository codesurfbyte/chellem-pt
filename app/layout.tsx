import type { Metadata } from 'next'
import './globals.css'
import NavBar from '@/components/NavBar'

export const metadata: Metadata = {
  title: 'Coachly - 예약 센터',
  description: 'Coachly - 트레이닝 예약 시스템',
  openGraph: {
    title: 'Coachly - 예약 센터',
    description: 'Coachly - 트레이닝 시간을 간편하게 예약하세요',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen font-body text-ink">
        <NavBar />
        <main className="max-w-5xl mx-auto px-4 py-10">{children}</main>
        <footer className="text-center text-slate/70 text-xs py-10">
          © {new Date().getFullYear()} Coachly
        </footer>
      </body>
    </html>
  )
}
