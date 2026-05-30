/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--rgb-background) / <alpha-value>)',
        surface: 'rgb(var(--rgb-surface) / <alpha-value>)',
        'surface-hover': 'rgb(var(--rgb-surface-hover) / <alpha-value>)',
        'surface-elevated': 'rgb(var(--rgb-surface-elevated) / <alpha-value>)',
        border: 'rgb(var(--rgb-border) / <alpha-value>)',
        'border-glow': 'var(--color-border-glow)',
        primary: '#22D3EE',
        'primary-light': 'rgba(34, 211, 238, 0.14)',
        secondary: '#22D3EE',
        'secondary-light': 'rgba(34, 211, 238, 0.14)',
        navy: '#0B1220',
        'navy-deep': '#050A14',
        success: '#00d68f',
        danger: '#ff4757',
        'text-main': 'rgb(var(--rgb-text-main) / <alpha-value>)',
        'text-muted': 'rgb(var(--rgb-text-muted) / <alpha-value>)',
      },
      boxShadow: {
        'glow-primary': 'var(--shadow-glow-primary)',
        'glow-secondary': '0 0 24px rgba(34, 211, 238, 0.25)',
        'glow-sm': 'var(--shadow-glow-sm)',
        'card': 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        'nav': 'var(--shadow-nav)',
      },
      backgroundImage: {
        'grid-fade': 'linear-gradient(rgba(42, 42, 53, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(42, 42, 53, 0.4) 1px, transparent 1px)',
        'gradient-radial': 'radial-gradient(ellipse at center, var(--tw-gradient-stops))',
        'shine': 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.06) 50%, transparent 60%)',
      },
      backgroundSize: {
        'grid': '48px 48px',
      },
      keyframes: {
        scroll: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        tickerScroll: {
          '0%': { transform: 'translate3d(0, 0, 0)' },
          '100%': { transform: 'translate3d(-50%, 0, 0)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.05)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        bounceIn: {
          '0%': { opacity: '0', transform: 'translateY(40px) scale(0.94)' },
          '55%': { opacity: '1', transform: 'translateY(-10px) scale(1.02)' },
          '75%': { transform: 'translateY(5px) scale(0.99)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        gentleFloat: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 0 rgba(212, 144, 10, 0)' },
          '50%': { boxShadow: '0 0 28px rgba(212, 144, 10, 0.18)' },
        },
        borderGlow: {
          '0%, 100%': { borderColor: 'rgba(212, 144, 10, 0.2)' },
          '50%': { borderColor: 'rgba(123, 47, 255, 0.35)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scroll': 'scroll 30s linear infinite',
        'ticker-scroll': 'tickerScroll 48s linear infinite',
        'testimonial-revolve': 'tickerScroll 52s linear infinite',
        'shimmer': 'shimmer 2.5s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
        'gentle-float': 'gentleFloat 5s ease-in-out infinite',
        'bounce-in': 'bounceIn 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'border-glow': 'borderGlow 3s ease-in-out infinite',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '8px',
        md: '10px',
        lg: '12px',
        xl: '14px',
        '2xl': '16px',
        '3xl': '20px',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionDuration: {
        '400': '400ms',
        '500': '500ms',
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar'),
  ],
}
