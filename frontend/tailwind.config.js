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
        dark: {
          bg: '#0f172a',
          surface: '#1e293b',
          surfaceHover: '#334155',
          border: '#334155',
          text: '#f1f5f9',
          textSecondary: '#cbd5e1',
          primary: '#3b82f6',
          primaryHover: '#2563eb',
          success: '#10b981',
          error: '#ef4444',
          warning: '#f59e0b',
        },
      },
    },
  },
  plugins: [],
}
