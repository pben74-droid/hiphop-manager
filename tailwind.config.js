/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        gold: "#FFD700",
        hipblack: "#0f0f0f"
      },
      boxShadow: {
        gold: "0 0 20px rgba(255,215,0,0.5)"
      }
    },
  },
  plugins: [],
}
