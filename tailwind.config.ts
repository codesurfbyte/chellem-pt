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
        display: ['Inter', 'var(--font-display)', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        body: ['Inter', 'var(--font-body)', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        // Stripe-inspired palette
        brand: {
          DEFAULT: '#635BFF',  // Stripe indigo/purple
          dark: '#4F46E5',
          light: '#EEF2FF',
          soft: '#F5F4FF',
          faint: '#FAFAFF',
        },
        ink: '#0A2540',        // Stripe dark — deep navy, not pure black
        body: '#425466',       // body text
        slate: '#697386',      // secondary / muted text
        canvas: '#FFFFFF',
        surface: '#FFFFFF',
        page: '#F6F9FC',       // Stripe's page background (very light blue-gray)
        sand: '#F6F9FC',
        mist: '#E3E8EE',       // Stripe border gray
        'mist-dark': '#C1C9D2',
        accent: '#00D4FF',     // Stripe teal accent (Best value badge, etc.)
        success: '#00A96E',    // green for checkmarks
      },
      boxShadow: {
        card: '0px 2px 5px rgba(0,0,0,0.05), 0px 0px 0px 1px rgba(0,0,0,0.06)',
        'card-hover': '0px 4px 12px rgba(0,0,0,0.08), 0px 0px 0px 1px rgba(0,0,0,0.06)',
        'card-active': '0 0 0 2px #635BFF',
        dropdown: '0px 12px 24px rgba(0,0,0,0.1), 0px 0px 0px 1px rgba(0,0,0,0.06)',
        btn: '0 1px 2px rgba(0,0,0,0.12)',
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        DEFAULT: '8px',
        md: '8px',
        lg: '10px',
        xl: '12px',
        badge: '6px',
        card: '8px',
        pill: '9999px',
      },
      fontSize: {
        // Minimum 12px per spec
        xs: ['12px', { lineHeight: '1.5', letterSpacing: '0.01em' }],
        sm: ['13px', { lineHeight: '1.5' }],
        base: ['14px', { lineHeight: '1.57' }],
        md: ['15px', { lineHeight: '1.5' }],
        lg: ['16px', { lineHeight: '1.5' }],
        xl: ['18px', { lineHeight: '1.4' }],
        '2xl': ['20px', { lineHeight: '1.35' }],
        '3xl': ['24px', { lineHeight: '1.3' }],
        '4xl': ['30px', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        '5xl': ['38px', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
        '6xl': ['52px', { lineHeight: '1.05', letterSpacing: '-0.03em' }],
      },
      spacing: {
        '4.5': '18px',
        '5.5': '22px',
        '13': '52px',
        '15': '60px',
        '18': '72px',
      },
    },
  },
  plugins: [],
}
export default config
