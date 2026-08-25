/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        midnight: '#0A0F1A',
        gold: '#B8914A',
        chalk: '#F7F5F2',
        cream: '#EDE8E1',
        glacier: '#9BA3A8',
      },
    },
  },
  plugins: [],
};
