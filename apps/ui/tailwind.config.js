/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0c0b0a",
        sidebar: "#100f0e",
        card: "#161412",
        border: "#252220",
        accent: "#c07b2e",
        "accent-hover": "#d4922d",
      },
    },
  },
  plugins: [],
};
