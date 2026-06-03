/**
 * Hyperglow design tokens — colors
 * Mirror these in tailwind.config.js so they're usable via `className`.
 * Imported directly for places where Tailwind utilities don't reach
 * (e.g. SVG props, StatusBar barStyle, gradients).
 */

export const colors = {
  brand: {
    primary: '#F26B3A',
    dark: '#D4502A',
    light: '#FEE6DC',
  },
  surface: '#FAFAF7',
  card: '#FFFFFF',
  ink: {
    900: '#1A1A17',
    700: '#4D4B44',
    500: '#8A887E',
    300: '#C9C7BD',
  },
  line: {
    DEFAULT: '#E5E3DA',
    subtle: '#F2F1EC',
  },
  status: {
    accepted: '#3B82C4',
    preparing: '#E8A33B',
    ready: '#2D8A66',
    out: '#D43A3A',
  },
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
};
