/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          cyan: '#39CCCC',
          'cyan-dark': '#2db8b8',
          green: '#5EBC67',
          'green-dark': '#4da856',
          navy: '#152232',
          dark: '#0f1923',
          muted: '#f8fafb',
        },
      },
      fontFamily: {
        display: ["'Staatliches'", 'Impact', "'Arial Narrow'", 'sans-serif'],
        body: ["'Fira Sans Extra Condensed'", "'Arial Narrow'", "'Roboto Condensed'", 'system-ui', 'sans-serif'],
      },
      animation: {
        'slide-up': 'slideUp 0.6s ease-out both',
        'fade-in': 'fadeIn 0.4s ease-out both',
        'ping-slow': 'ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      boxShadow: {
        'brand-cyan': '0 8px 32px rgba(57,204,204,0.25)',
        'brand-green': '0 8px 32px rgba(94,188,103,0.25)',
        'glow-cyan': '0 0 24px rgba(57,204,204,0.4)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #39CCCC 0%, #5EBC67 100%)',
        'brand-gradient-dark': 'linear-gradient(135deg, #2db8b8 0%, #4da856 100%)',
      },
    },
  },
  plugins: [],
};
