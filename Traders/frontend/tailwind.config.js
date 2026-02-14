/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0F4C75',
        accent: '#3282B8',
        background: '#F7F9FC',
        success: '#2ECC71',
        danger: '#E74C3C',
      }
    },
  },
  plugins: [],
}
