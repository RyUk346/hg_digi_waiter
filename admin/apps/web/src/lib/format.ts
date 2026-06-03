export const gbp = (pence: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(pence / 100);

export const gbp2 = (pence: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);

export const pct = (n: number, digits = 0) =>
  `${(n * 100).toFixed(digits)}%`;

export const num = (n: number) => new Intl.NumberFormat('en-GB').format(n);

export const shortDate = (d: Date) =>
  new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(d);
