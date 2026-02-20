/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0f",
        sidebar: "#0f0f18",
        card: "#14141f",
        border: "#1e1e2e",
        accent: "#6c5ce7",
        "accent-hover": "#7c6ef7",
      },
    },
  },
  plugins: [],
};
