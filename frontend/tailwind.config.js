/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F5F7F4',
        ink: '#14201C',
        mute: '#5B6A63',
        line: '#D9E0DA',
        verify: { DEFAULT: '#0A6B4B', soft: '#DDF0E6', dark: '#07503A' },
        auction: { DEFAULT: '#B45F06', soft: '#FBEBD6' },
        alert: { DEFAULT: '#B3261E', soft: '#FBE4E2' },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
