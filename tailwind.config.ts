import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        bush: {
          950: "#0D1712",
          900: "#13211C",
          800: "#1B2E26",
          700: "#3D5247",
        },
        sand: {
          100: "#F8F5EC",
          200: "#F2EDE1",
          300: "#E5DCC4",
        },
        clay: {
          400: "#D9925A",
          500: "#C97C3D",
          600: "#A8602A",
        },
        sage: {
          400: "#9AAB8E",
          500: "#7A8B6F",
          600: "#5E6F54",
        },
        gold: {
          400: "#E8C468",
          500: "#D9AC3F",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      letterSpacing: {
        widest2: "0.2em",
      },
    },
  },
  plugins: [],
};
export default config;
