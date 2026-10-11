/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./admin.html", "./assets/js/**/*.js"],
  theme: {
    extend: {
      colors: {
        // German Minimalist Palette
        // (already in Tailwind: slate, emerald, amber, blue, zinc)
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      keyframes: {
        pulse_slow: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "pulse-slow": "pulse_slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
