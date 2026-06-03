/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Hyperglow brand palette (warm tomato hospitality)
        brand: {
          DEFAULT: '#F26B3A',
          dark: '#D4502A',
          light: '#FEE6DC',
        },
        // Surfaces
        surface: '#FAFAF7',
        card: '#FFFFFF',
        ink: {
          900: '#1A1A17', // primary text
          700: '#4D4B44',
          500: '#8A887E',
          300: '#C9C7BD',
        },
        line: {
          DEFAULT: '#E5E3DA',
          subtle: '#F2F1EC',
        },
        // Order / status semantic
        status: {
          accepted: '#3B82C4',
          preparing: '#E8A33B',
          ready: '#2D8A66',
          out: '#D43A3A',
        },
        // Tinted backgrounds for state pills / category circles
        tint: {
          accepted: '#E1ECF6',
          preparing: '#FFF3DC',
          ready: '#E6F2EE',
          out: '#FBE5DF',
          burger: '#FBE5DF',
          pizza: '#FFEAD1',
          pasta: '#F3E2C8',
          coffee: '#EFE0D2',
          icecream: '#E6F2EE',
          drinks: '#E1ECF6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'System'],
        mono: ['JetBrainsMono', 'Menlo', 'Consolas'],
      },
      borderRadius: {
        pill: '9999px',
      },
    },
  },
  plugins: [],
};
