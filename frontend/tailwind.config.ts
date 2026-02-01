import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"] ,
  theme: {
    extend: {
      colors: {
        canvas: "#f7f5f0",
        ink: "#1d1f21",
        slate: "#6b6f76",
        card: "#ffffff",
        border: "#e4e0d8",
        accent: "#4b5563"
      },
      fontFamily: {
        serif: ["'Source Serif 4'", "ui-serif", "serif"],
        sans: ["'Inter'", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
