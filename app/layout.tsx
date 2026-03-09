import type { Metadata } from 'next'
import './globals.css'
import NavBar from '@/components/NavBar'

export const metadata: Metadata = {
  title: 'PT 예약 센터',
  description: '개인 트레이닝 예약 시스템',
  openGraph: {
    title: 'PT 예약 센터',
    description: 'PT 시간을 간편하게 예약하세요',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-[#080808] font-body">
        <NavBar />
        <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
        <footer className="text-center text-gray-700 text-xs py-8">
          © {new Date().getFullYear()} PT 예약 센터
        </footer>
      </body>
    </html>
  )
}
