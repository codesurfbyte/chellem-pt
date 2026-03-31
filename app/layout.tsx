import type { Metadata } from 'next'
import './globals.css'
import Providers from '@/components/Providers'
import NavBar from '@/components/NavBar'

export const metadata: Metadata = {
  metadataBase: new URL('https://chellem-pt.vercel.app'),
  title: 'Coachly - 예약 센터',
  description: 'Coachly - 트레이닝 예약 시스템',
  openGraph: {
    title: 'Coachly - 예약 센터',
    description: 'Coachly - 트레이닝 시간을 간편하게 예약하세요',
    images: [
      {
        url: '/coachly-logo.png',
        width: 1024,
        height: 1024,
        alt: 'Coachly Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Coachly - 예약 센터',
    description: 'Coachly - 트레이닝 시간을 간편하게 예약하세요',
    images: ['/coachly-logo.png'],
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
        <Providers>
          <NavBar />
          <main className="max-w-5xl mx-auto px-4 py-10">{children}</main>
          <footer className="text-center text-slate/70 text-xs py-10">
            © {new Date().getFullYear()} Coachly
          </footer>
        </Providers>
      </body>
    </html>
  )
}
