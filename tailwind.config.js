/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:       'rgb(var(--c-bg) / <alpha-value>)',
        surface:  'rgb(var(--c-surface) / <alpha-value>)',
        surface2: 'rgb(var(--c-surface2) / <alpha-value>)',
        border:   'rgb(var(--c-border) / <alpha-value>)',
        muted:    'rgb(var(--c-muted) / <alpha-value>)',
        imdb:     'rgb(var(--c-imdb) / <alpha-value>)',
        rt:       'rgb(var(--c-rt) / <alpha-value>)',
        accent:   'rgb(var(--c-accent) / <alpha-value>)',
        accent2:  'rgb(var(--c-accent2) / <alpha-value>)',
      },
      boxShadow: {
        'accent':      '0 4px 24px rgb(var(--c-accent) / 0.25)',
        'accent-lg':   '0 4px 24px rgb(var(--c-accent) / 0.35)',
        'accent-glow': '0 0 40px rgb(var(--c-accent) / 0.08)',
        'accent-btn':  '0 0 16px rgb(var(--c-accent) / 0.3)',
        'accent-dot':  '0 0 6px rgb(var(--c-accent) / 0.6)',
        'accent-float':'0 4px 20px rgb(var(--c-accent) / 0.5)',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        perfectPop: {
          '0%':   { opacity: '0', transform: 'scale(0.5)' },
          '60%':  { opacity: '1', transform: 'scale(1.15)' },
          '80%':  { transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.75)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        fillBar: {
          '0%':   { transform: 'scaleX(0)', transformOrigin: 'left' },
          '100%': { transform: 'scaleX(1)', transformOrigin: 'left' },
        },
        floatUp: {
          '0%':   { opacity: '1', transform: 'translateY(0) scale(1)' },
          '80%':  { opacity: '1' },
          '100%': { opacity: '0', transform: 'translateY(-160px) scale(1.6)' },
        },
      },
      animation: {
        fadeUp:     'fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer:    'shimmer 1.4s infinite linear',
        perfectPop: 'perfectPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        scaleIn:    'scaleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        fillBar:    'fillBar 0.7s cubic-bezier(0.16, 1, 0.3, 1) both',
        floatUp:    'floatUp 2.5s ease-out forwards',
      },
    },
  },
  plugins: [],
}
