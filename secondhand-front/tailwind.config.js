/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: token('primary-50'),
          100: token('primary-100'),
          200: token('primary-200'),
          400: token('primary-400'),
          500: token('primary-500'),
          600: token('primary-600'),
          700: token('primary-700'),
          900: token('primary-900'),
        },
        accent: {
          DEFAULT: token('accent'),
          soft: token('accent-soft'),
          strong: token('accent-strong'),
        },
        ink: {
          DEFAULT: token('ink'),
          muted: token('ink-muted'),
        },
        line: token('line'),
        canvas: token('canvas'),
        surface: token('surface'),
      },
      fontFamily: {
        sans: ['Poppins', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(15 23 42 / 0.04), 0 4px 16px -4px rgb(15 23 42 / 0.08)',
        lift: '0 2px 4px rgb(15 23 42 / 0.06), 0 16px 32px -12px rgb(15 23 42 / 0.18)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      keyframes: {
        progress: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(250%)' },
        },
      },
      animation: {
        progress: 'progress 1.1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
