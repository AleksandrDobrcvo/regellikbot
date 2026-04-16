/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'telegram': {
          'bg': '#ffffff',
          'text': '#000000',
          'link': '#2481cc',
          'button': '#0077ff',
          'button-text': '#ffffff'
        }
      }
    },
  },
  plugins: [],
}
