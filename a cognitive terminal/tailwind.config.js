/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./index.{js,ts,jsx,tsx}",
    "./App.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./contexts/**/*.{js,ts,jsx,tsx}",
    "./electron/**/*.{js,ts,jsx,tsx,cjs}",
    "./services/**/*.{js,ts,jsx,tsx}", // Assuming services also has components/logic
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
