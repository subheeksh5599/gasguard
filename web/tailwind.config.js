/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        monad: {
          purple: '#7B3FE4',
          dark:  '#1a1025',
        }
      }
    },
  },
  plugins: [],
}
