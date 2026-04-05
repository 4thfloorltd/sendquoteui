/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      animation: {
        fade: "fade 1s ease-in forwards",
        slideUp: "slideUp 1s ease-out forwards",
        caretBlink: "caretBlink 1.05s step-end infinite",
        placeholderFadeIn: "placeholderFadeIn 0.35s ease-out forwards",
      },
      keyframes: {
        fade: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        caretBlink: {
          "0%, 49%": { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
        placeholderFadeIn: {
          "0%": { opacity: "0.35" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
