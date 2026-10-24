/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#b9dffe',
          300: '#7cc2fd',
          400: '#36a2fa',
          500: '#0c85eb',
          600: '#0067c9',
          700: '#0052a3',
          800: '#044686',
          900: '#0a3b6f',
          950: '#07254a',
        },
        navy: {
          800: '#0f172a',
          900: '#0a0f1d',
          950: '#050811',
        },
        teal: {
          500: '#0d9488',
          600: '#0f766e',
        }
      },
    },
  },
  plugins: [],
}
