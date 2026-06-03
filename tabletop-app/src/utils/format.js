/**
 * Tiny formatting helpers.
 */

export const money = (n) => {
  const num = Number(n) || 0;
  return `$${num.toFixed(2)}`;
};

export const moneyDelta = (n) => {
  const num = Number(n) || 0;
  if (num === 0) return '+ $0.00';
  if (num > 0) return `+ ${money(num)}`;
  return `– ${money(Math.abs(num))}`;
};

export const pluralize = (n, singular, plural) =>
  `${n} ${n === 1 ? singular : plural || singular + 's'}`;

export const timeShort = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};
