/**
 * Tailwind config for the Homeschool Hub prototype.
 *
 * Theme values (colors, fonts, durations) are mirrored in src/config/theme.js
 * so JavaScript code that needs them at runtime (e.g. the choropleth color
 * ramp, sparkline stroke) has a single source. Update both files together.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        heritage: '#002D72',
        spirit: '#68ACE5',
        sable: '#31261D',
        gold: '#FF9E1B',
        brick: '#CF4520',
      },
      fontFamily: {
        sans: ['"Work Sans"', 'system-ui', 'sans-serif'],
        slab: ['"Roboto Slab"', 'Georgia', 'serif'],
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
      // Animations. Extending `keyframes` + `animation` is the Tailwind v3
      // native pattern (same approach Tailwind itself uses for `animate-pulse`
      // and `animate-spin`). Used by StateDetailCard to fade content on
      // selection swap so the numerals don't just snap to a new value.
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
      },
    },
  },
  plugins: [],
};
