import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f5ff",
          100: "#e6ebff",
          400: "#7c8cff",
          500: "#5b6cff",
          600: "#4451e0",
          700: "#333dbd",
        },
      },
    },
  },
  plugins: [],
};

export default config;
