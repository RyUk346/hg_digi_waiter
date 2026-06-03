import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // HyperGlow brand tokens — light theme (admin portal content)
        bg: '#FBF7EE',
        surface: '#FFFFFF',
        surface2: '#F5F1E8',
        surface3: '#EFEADF',
        border: '#E8E2D3',
        borderSoft: '#EFEADF',
        ink: '#1A1715',
        text: '#42392F',
        muted: '#7A7064',
        mutedSoft: '#9C9384',
        // Dark sidebar tokens
        sb: {
          bg: '#1A1715',
          bg2: '#231E1B',
          border: '#2B2622',
          text: '#E8E2D3',
          textMuted: '#A89F92',
          textSoft: '#6E6358',
        },
        // ⚠ TERRACOTTA — reserved for HyperGlow-monetised surfaces only
        terra: '#B8543D',
        terraSoft: '#FAEDE5',
        terraStrong: '#F3E4D0',
        terraFg: '#7A4419',
        // Functional
        olive: '#4A7C3F',
        oliveSoft: '#EAF1E5',
        amber: '#B8843D',
        amberSoft: '#FBEFD6',
        red: '#C13F35',
        rose: '#8A322A',
        blue: '#3D6FB8',
        purple: '#7B5DBA',
      },
      keyframes: {
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-slow': 'pulse-slow 2.4s ease-in-out infinite',
        'fade-in': 'fade-in 240ms ease-out both',
      },
      fontFamily: {
        serif: ['Fraunces', 'Iowan Old Style', 'Georgia', 'Charter', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['Menlo', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '12px',
        lg: '16px',
        xl: '20px',
      },
    },
  },
  plugins: [],
};

export default config;
