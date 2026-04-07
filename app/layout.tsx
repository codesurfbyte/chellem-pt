import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Providers from '@/components/Providers'
import NavBar from '@/components/NavBar'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://chellem-pt.vercel.app'),
  title: 'Chellem PT - 예약 센터',
  description: 'Chellem PT - 트레이닝 예약 시스템',
  openGraph: {
    title: 'Chellem PT - 예약 센터',
    description: 'Chellem PT - 트레이닝 시간을 간편하게 예약하세요',
    images: [
      {
        url: '/chellem_logo.png',
        width: 1024,
        height: 1024,
        alt: 'Chellem PT Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Chellem PT - 예약 센터',
    description: 'Chellem PT - 트레이닝 시간을 간편하게 예약하세요',
    images: ['/chellem_logo.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className={inter.variable}>
      <body className="min-h-screen font-body text-ink bg-page">
        <Providers>
          <NavBar />
          <main className="max-w-5xl mx-auto px-6 py-10">{children}</main>
          <footer className="border-t border-mist mt-16">
            <div className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between">
              <span className="text-xs text-slate">© {new Date().getFullYear()} Chellem PT</span>
              <span className="text-xs text-slate">트레이닝 예약 시스템</span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  )
}
