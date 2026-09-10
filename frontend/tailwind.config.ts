import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        ink: {
          DEFAULT: "#18202a",
          50: "#f6f8fa",
          100: "#eaeef2",
          200: "#d1dbe3",
          300: "#a9bccb",
          400: "#7b97ae",
          500: "#577793",
          600: "#415f79",
          700: "#344c62",
          800: "#27394b",
          900: "#18202a",
          950: "#0e141b",
        },
        mist: {
          DEFAULT: "#f5f7f8",
          subtle: "#eef2f4",
          card: "#ffffff",
        },
        field: {
          DEFAULT: "#e8efe9",
          light: "#f2f7f3",
          dark: "#d2e2d5",
        },
        leaf: {
          DEFAULT: "#2f6f4e",
          light: "#418f67",
          dark: "#1e4c34",
          soft: "#eaf3ee",
          50: "#f2f8f4",
          100: "#e1efe6",
          500: "#2f6f4e",
          600: "#24583d",
          700: "#1c432f",
        },
        flood: {
          DEFAULT: "#28758a",
          light: "#399ab5",
          dark: "#1b5161",
          soft: "#ebf6f9",
          50: "#f0f8fa",
          100: "#dbf0f5",
          500: "#28758a",
          600: "#1e5b6c",
          700: "#174451",
        },
        alert: {
          DEFAULT: "#b45309",
          soft: "#fef3c7",
          border: "#f59e0b",
        },
        danger: {
          DEFAULT: "#b91c1c",
          soft: "#fee2e2",
          border: "#ef4444",
        },
        ops: {
          bg: "#0f172a",
          card: "#1e293b",
          border: "#334155",
          accent: "#38bdf8",
        },
      },
      boxShadow: {
        subtle: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)",
        card: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)",
        "card-hover": "0 10px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04)",
        glow: "0 0 20px rgba(47, 111, 78, 0.25)",
        "ops-glow": "0 0 20px rgba(56, 189, 248, 0.2)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.25s ease-out forwards",
        "slide-up": "slideUp 0.3s ease-out forwards",
        "badge-pulse": "badgePulse 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        badgePulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

