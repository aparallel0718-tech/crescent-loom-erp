/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
                  colors: {
        midnight: '#E8B563',
        gold: '#E8B563',
        chalk: '#0B0B0C',
        cream: '#17161A',
        glacier: '#8C8A94',
      },
    },
  },
  plugins: [],
};
