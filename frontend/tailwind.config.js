/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary':   '#0f1117',
        'bg-secondary': '#1a1b23',
        'bg-tertiary':  '#24252e',
        'bg-hover':     '#2d2e3a',
        'accent':       '#c8a84e',
        'accent-light': '#dbc06e',
        'accent-dark':  '#a68a2e',
        'border-col':   '#2d2e3a',
        'user-msg':     '#1e3a5f',
        'txt-primary':  '#e8e8ed',
        'txt-secondary':'#9ca3af',
        'txt-muted':    '#6b7280',
      },
      fontFamily: {
        arabic: ['"Noto Kufi Arabic"', '"Noto Naskh Arabic"', 'sans-serif'],
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        blink: {
          '0%, 60%, 100%': { transform: 'translateY(0)',   opacity: '0.4' },
          '30%':            { transform: 'translateY(-6px)', opacity: '1'   },
        },
      },
      animation: {
        fadeUp: 'fadeUp 0.3s ease',
        blink:  'blink 1.2s infinite',
        blink2: 'blink 1.2s infinite 0.2s',
        blink3: 'blink 1.2s infinite 0.4s',
      },
    },
  },
  plugins: [],
};
