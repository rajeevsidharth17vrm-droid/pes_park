/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        pitch: {
          950: "#050810",
          900: "#0a0f1e",
          800: "#0f1629",
          700: "#162034",
          600: "#1e2d45",
        },
        surface: {
          DEFAULT: "#111827",
          raised: "#1a2338",
          border: "#1e2d45",
          hover: "#212f48",
        },
        accent: {
          DEFAULT: "#10b981",
          dim:     "#059669",
          glow:    "#34d399",
        },
        gold: {
          DEFAULT: "#f59e0b",
          light:   "#fbbf24",
          dim:     "#d97706",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        glow:      "0 0 20px rgba(16,185,129,0.15)",
        "glow-sm": "0 0 10px rgba(16,185,129,0.10)",
        gold:      "0 0 16px rgba(245,158,11,0.20)",
      },
    },
  },
  plugins: [],
}
