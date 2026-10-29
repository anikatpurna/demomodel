/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0B1220',
        midnight: '#111C32',
        electric: { DEFAULT: '#14B8A6', dark: '#0F8F82', soft: '#CCFBF1' },
        softblue: '#60A5FA',
        mist: '#F3F6FA',
        profit: '#16A34A',
        warn: '#D97706',
        loss: '#DC2626',
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,18,32,0.04), 0 6px 20px rgba(11,18,32,0.06)',
        lift: '0 2px 4px rgba(11,18,32,0.06), 0 12px 28px rgba(11,18,32,0.10)',
      },
    },
  },
  plugins: [],
};
