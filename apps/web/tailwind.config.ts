import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        bangla: ['var(--font-bangla)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          DEFAULT: '#0b1f33',
          50: '#eef2f6',
          100: '#d7e0e9',
          400: '#4d6a84',
          600: '#243d54',
          700: '#182b3d',
          800: '#0f1f2e',
          900: '#0b1f33',
          950: '#071626',
        },
        brand: {
          50: '#e9f7f0',
          100: '#c9edda',
          200: '#98dcb6',
          300: '#63c890',
          400: '#37b072',
          500: '#1f9a5c',
          600: '#177d49',
          700: '#146540',
          800: '#124f34',
          900: '#0f412c',
        },
        sun: {
          50: '#fef8e8',
          100: '#fceec2',
          300: '#f6cf5f',
          400: '#f0b62f',
          500: '#e59d17',
          600: '#c17c10',
        },
        clay: {
          50: '#fbf3ee',
          200: '#f0d6c4',
          400: '#d99a6c',
          500: '#c67c48',
          600: '#a5613689',
        },
        paper: '#f7f7f2',

        // ---- NIR prototype design system (nir.css) — used by shared chrome + homepage ----
        navy: '#13243F',
        'navy-2': '#1B3B6F',
        'navy-line': '#2A4066',
        mist: '#F2F6F4',
        'mist-2': '#E9F0EC',
        greenline: '#DBE4DF',
        nirgreen: '#00A86B',
        'nirgreen-deep': '#007A4E',
        'nirgreen-dark': '#005C3B',
        amber: '#F7B733',
        'amber-deep': '#8A5B00',
        flagred: '#F42A41',
        slate: '#4E5F7A',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(11,31,51,0.04), 0 8px 24px rgba(11,31,51,0.06)',
        card: '0 1px 3px rgba(11,31,51,0.06), 0 2px 8px rgba(11,31,51,0.05)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'drift': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        'dash': {
          to: { strokeDashoffset: '0' },
        },
        'flow': {
          to: { strokeDashoffset: '-640' },
        },
        'live-pulse': {
          from: { transform: 'scale(.6)', opacity: '.7' },
          to: { transform: 'scale(1.5)', opacity: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out both',
        'drift': 'drift 6s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        'dash': 'dash 1.8s ease-out forwards',
        'flow': 'flow 26s linear infinite',
        'live-pulse': 'live-pulse 2s ease-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
