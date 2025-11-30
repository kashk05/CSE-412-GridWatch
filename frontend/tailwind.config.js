/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

// tailwind.config.js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // use a clean UI font everywhere
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        grid: {
          bg: "#020617",         // app background (near-black blue)
          panel: "#020617",      // big gradient panel bg fallback
          card: "#020617",       // cards base
          accent: "#22d3ee",     // teal accent
        },
      },
      borderRadius: {
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};
