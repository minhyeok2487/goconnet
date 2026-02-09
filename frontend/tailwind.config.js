/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'app-bg': '#1e1e1e',
        'sidebar-bg': '#252526',
        'tab-bg': '#2d2d2d',
        'tab-active': '#1e1e1e',
        'border-color': '#3c3c3c',
        'text-primary': '#cccccc',
        'text-secondary': '#858585',
        'accent': '#0078d4',
        'accent-hover': '#1a8cff',
        'hover-bg': '#2a2d2e',
        'status-bar': '#007acc',
      },
    },
  },
  plugins: [],
}
