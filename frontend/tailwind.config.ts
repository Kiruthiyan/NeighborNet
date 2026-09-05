import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#18202a",
        mist: "#f5f7f8",
        field: "#e8efe9",
        leaf: "#2f6f4e",
        flood: "#28758a",
        alert: "#b45309",
        danger: "#b91c1c"
      }
    }
  },
  plugins: []
};

export default config;
