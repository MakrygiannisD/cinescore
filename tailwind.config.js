/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:       '#09090e',
        surface:  '#111118',
        surface2: '#1a1a24',
        border:   '#222232',
        muted:    '#6464a0',
        imdb:     '#f5c518',
        rt:       '#fa320a',
        accent:   '#6366f1',
        accent2:  '#818cf8',
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
      },
      animation: {
        fadeUp:     'fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer:    'shimmer 1.4s infinite linear',
        perfectPop: 'perfectPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        scaleIn:    'scaleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        fillBar:    'fillBar 0.7s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
}
