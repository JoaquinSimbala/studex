/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'studex': {
          50: 'rgb(249, 248, 242)',   // var(--studex-50)
          100: 'rgb(242, 239, 229)',  // var(--studex-100)
          200: 'rgb(228, 220, 201)',  // var(--studex-200)
          300: 'rgb(208, 196, 168)',  // var(--studex-300)
          400: 'rgb(176, 164, 130)',  // var(--studex-400)
          500: 'rgb(120, 129, 96)',   // var(--studex-500)
          600: 'rgb(99, 107, 78)',    // var(--studex-600) - VERDE CORRECTO
          700: 'rgb(78, 84, 61)',     // var(--studex-700) - VERDE OSCURO CORRECTO
          800: 'rgb(58, 63, 45)',     // var(--studex-800)
          900: 'rgb(38, 42, 30)',     // var(--studex-900)
          950: 'rgb(28, 32, 22)'      // Más oscuro
        },
        'studex-navbar': {
          DEFAULT: 'rgb(45, 55, 40)', // var(--studex-navbar)
          light: 'rgb(52, 64, 46)'    // var(--studex-navbar-light)
        },
        'studex-accent': {
          DEFAULT: '#b88662', // Marrón cálido
          50: '#faf7f4',
          100: '#f4ede4',
          200: '#e8d5c4',
          300: '#d9b89e',
          400: '#c89574',
          500: '#b88662',
          600: '#a67350',
          700: '#8a5c42',
          800: '#6f4a37',
          900: '#5a3d30'
        }
      },
      fontFamily: {
        'sans': ['Inter', 'ui-sans-serif', 'system-ui'],
        'display': ['Space Grotesk', 'ui-sans-serif', 'system-ui'],
        'heading': ['Poppins', 'ui-sans-serif', 'system-ui']
      },
      borderRadius: {
        'studex': '0.75rem',
      },
      boxShadow: {
        'studex-sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'studex-md': '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        'studex-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1)',
        'studex-xl': '0 20px 25px -5px rgb(0 0 0 / 0.1)',
      },
      spacing: {
        '18': '4.5rem',  // 72px para h-18
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography')
  ],
}