/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
            colors: {
        midnight: '#5B4FE9',
        gold: '#8B7FF5',
        chalk: '#F5F3FF',
        cream: '#ECE9FB',
        glacier: '#8D89A8',
      },
    },
  },
  plugins: [],
};
