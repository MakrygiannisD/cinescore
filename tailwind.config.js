/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:       '#0d0d0f',
        surface:  '#18181d',
        surface2: '#222228',
        border:   '#2e2e3a',
        muted:    '#7878a0',
        imdb:     '#f5c518',
        rt:       '#fa320a',
        accent:   '#6366f1',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        fadeUp:  'fadeUp 0.3s ease both',
        shimmer: 'shimmer 1.4s infinite linear',
      },
    },
  },
  plugins: [],
}
