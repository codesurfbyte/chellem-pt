import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#018786',
          dark: '#016A6A',
          soft: '#E3F4F4',
          faint: '#F2FAFA',
        },
        ink: '#222222',
        slate: '#6B6B6B',
        canvas: '#FFFFFF',
        surface: '#FFFFFF',
        sand: '#F7F7F7',
        mist: '#E7E7E7',
      },
    },
  },
  plugins: [],
}
export default config
