/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0E1420",
        panel: "#161F2E",
        edge: "#243146",
        fog: "#8B97A8",
        paper: "#E8EDF4",
        signal: "#FFB224",
        teal: "#3EC5B7",
        danger: "#F07167",
      },
      fontFamily: {
        display: ['"Space Grotesk"', "sans-serif"],
        body: ['"Inter"', "sans-serif"],
        mono: ['"IBM Plex Mono"', "monospace"],
      },
    },
  },
  plugins: [],
};
