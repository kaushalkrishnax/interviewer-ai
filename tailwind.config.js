/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#3B82F6",
        },
        secondary: {
          DEFAULT: "#10B981",
        },
        accent: {
          DEFAULT: "",
        },
        "dark-bg": "#0f172a",
        "card-bg": "rgba(15, 23, 42, 0.5)",
        "border-color": "rgba(51, 65, 85, 0.3)",
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "Inter", "system-ui", "sans-serif"],
        heading: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        body: ["var(--font-dm-sans)", "Inter", "system-ui", "sans-serif"],
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
        30: "7.5rem",
      },
      maxWidth: {
        "8xl": "88rem",
        "9xl": "96rem",
      },
      aspectRatio: {
        portrait: "3/4",
        landscape: "4/3",
        ultrawide: "21/9",
      },
      backdropBlur: {
        sm: "4px",
      },
      fontFamily: {
        sans: ["Inter", "DM Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};
