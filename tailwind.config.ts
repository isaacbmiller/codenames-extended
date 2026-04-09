import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        paper: "#f4eddc",
        ink: "#2b2924",
        redTeam: "#c74d43",
        blueTeam: "#2f5f8c",
        neutral: "#ddcfab",
        assassin: "#292622",
        surface: "#fff9ea"
      },
      boxShadow: {
        card: "0 10px 30px rgba(59, 43, 24, 0.15)",
        inset: "inset 0 1px 0 rgba(255, 255, 255, 0.65)"
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"]
      }
    }
  },
  plugins: []
};

export default config;
