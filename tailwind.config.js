/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1f2927",
        muted: "#65716d",
        paper: "#f7f9f8",
        mint: "#2f7d73",
        "mint-soft": "#e5f2ef",
        coral: "#d96c52",
        "coral-soft": "#fff0eb",
      },
      boxShadow: {
        soft: "0 18px 50px rgba(31, 41, 39, 0.08)",
      },
    },
  },
  plugins: [],
};
