/**
 * Spacing / radius / type tokens.
 * Most of these have Tailwind equivalents — kept here for non-Tailwind usage.
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  pill: 9999,
};

export const fontSize = {
  caption: 11,
  bodyS: 12,
  bodyM: 13,
  bodyL: 14,
  h4: 16,
  h3: 20,
  h2: 24,
  h1: 32,
  display: 46,
};

// Status mapping helpers
export const ORDER_STATUS = {
  PENDING_PAYMENT: 'pending_payment',
  ACCEPTED: 'accepted',
  PREPARING: 'preparing',
  READY: 'ready',
  DELIVERED: 'delivered',
};
