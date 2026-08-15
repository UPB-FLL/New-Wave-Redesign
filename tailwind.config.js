/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          cyan: 'var(--nw-signal-cyan)',
          // Migration-only aliases retained while existing utilities are replaced.
          'cyan-dark': 'var(--nw-tide-blue)',
          'tide-blue': 'var(--nw-tide-blue)',
          green: 'var(--nw-continuity-green)',
          'green-dark': 'var(--nw-continuity-green)',
          navy: 'var(--nw-current-navy)',
          dark: 'var(--nw-deep-current)',
          muted: 'var(--nw-cloud-white)',
        },
        codenest: {
          green: '#5ed29c',
          ink: '#070b0a',
        },
      },
      fontFamily: {
        display: ['var(--nw-font-display)'],
        body: ['var(--nw-font-body)'],
        inter: ['var(--nw-font-body)'],
        jakarta: ['var(--nw-font-display)'],
        technical: ['var(--nw-font-technical)'],
        instrument: ["'Instrument Serif'", 'Georgia', 'serif'],
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
    },
  },
  plugins: [],
};
