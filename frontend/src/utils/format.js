const CURRENCY = import.meta.env.VITE_CURRENCY || 'USD';
const LOCALE = import.meta.env.VITE_LOCALE || 'en-US';

const fmt = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY });

export const money = (n) => (typeof n === 'number' && Number.isFinite(n) ? fmt.format(n) : '-');

export const shortDate = (d) =>
  d ? new Date(d).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export const dateTime = (d) =>
  d ? new Date(d).toLocaleString(LOCALE, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

export const conditionLabel = (c) =>
  ({ new: 'New', 'like-new': 'Like new', good: 'Good', acceptable: 'Acceptable' }[c] || c);
