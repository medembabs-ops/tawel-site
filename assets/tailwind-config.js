tailwind.config = {
  theme: {
    extend: {
      colors: {
        bordeaux: {
          DEFAULT: '#63010F',
          dark: '#43000A',
          light: '#7A0A1A',
        },
        ink: '#1A1315',
        ivory: '#F6F2EC',
        blush: '#CAAAAA',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['"Montserrat"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      letterSpacing: {
        widest2: '0.28em',
      },
      transitionTimingFunction: {
        ink: 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
    },
  },
};
