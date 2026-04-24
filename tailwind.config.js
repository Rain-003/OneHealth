/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./resources/**/*.blade.php",
    "./resources/**/*.js",
    "./resources/**/*.vue",
    "./resources/**/*.tsx",
    "./resources/**/*.ts",
  ],
theme: {
    extend: {
      colors: {
        oh: {
          teal: "#0F8A99",
          tealDark: "#0B6F7A",
          tealLight: "#E6F6F8",
          navy: "#203D7A",
        }
      },
      boxShadow: {
        oh: "0 10px 25px rgba(0,0,0,.08)",
      }
    },
  },
  plugins: [],
}