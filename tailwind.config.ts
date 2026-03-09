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
        display: ['var(--font-oswald)', 'sans-serif'],
        body: ['var(--font-dm-sans)', 'sans-serif'],
      },
      colors: {
        accent: '#C8FF00',
        dark: {
          900: '#080808',
          800: '#0F0F0F',
          700: '#161616',
          600: '#1E1E1E',
          500: '#2A2A2A',
          400: '#3A3A3A',
        },
      },
    },
  },
  plugins: [],
}
export default config
