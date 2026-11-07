/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cf: {
          bg: '#0B1120',
          secondary: '#111827',
          card: '#172033',
          cardHover: '#1E293B',
          border: '#273449',
          accent: '#6366F1',
          accentHover: '#4F46E5',
          secondaryAccent: '#38BDF8',
          text: '#F8FAFC',
          muted: '#94A3B8',
          success: '#10B981',
          danger: '#EF4444',
          warning: '#F59E0B'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['Fira Code', 'JetBrains Mono', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}
