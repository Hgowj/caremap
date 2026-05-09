import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#e6f7f2",
          100: "#b3e6d5",
          200: "#80d4b8",
          300: "#4dc3a0",
          400: "#26b58e",
          500: "#00A172",  // primary brand green
          600: "#008f64",
          700: "#007a56",
          800: "#006648",
          900: "#004f37",
        },
        // keep teal as alias for backwards compat
        teal: {
          50:  "#e6f7f2",
          100: "#b3e6d5",
          400: "#26b58e",
          500: "#00A172",
          600: "#008f64",
          700: "#007a56",
        },
        sage: {
          50:  "#f4faf7",
          100: "#e0f2eb",
          200: "#c0e5d6",
        },
        coral: {
          400: "#fb7185",
          500: "#f43f5e",
        },
      },
      fontFamily: {
        sans:    ["Inter", "system-ui", "sans-serif"],
        display: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};

export default config;