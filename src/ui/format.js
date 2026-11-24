import { locale } from '../i18n.js';

const cache = new Map();
function nf(opts) {
  const key = locale() + JSON.stringify(opts);
  if (!cache.has(key)) cache.set(key, new Intl.NumberFormat(locale(), opts));
  return cache.get(key);
}

/** Number with `sig` significant digits (no exponent for usual magnitudes). */
export function fmt(n, sig = 4) {
  if (!Number.isFinite(n)) return '—';
  if (n !== 0 && (Math.abs(n) >= 1e7 || Math.abs(n) < 1e-4)) return n.toExponential(sig - 1);
  return nf({ maximumSignificantDigits: sig }).format(n);
}

/** Number with a fixed number of decimals. */
export function fixed(n, decimals = 2) {
  if (!Number.isFinite(n)) return '—';
  return nf({ minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
}

const PREFIXES = [
  [1e3, 'k'],
  [1, ''],
  [1e-3, 'm'],
  [1e-6, 'µ'],
  [1e-9, 'n'],
];

/** Value with an SI prefix so the mantissa stays in [1, 1000). */
export function si(value, unit, sig = 4) {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return `0 ${unit}`;
  const abs = Math.abs(value);
  const [scale, prefix] = PREFIXES.find(([s]) => abs >= s) ?? PREFIXES[PREFIXES.length - 1];
  return `${fmt(value / scale, sig)} ${prefix}${unit}`;
}

const UNIT_LABELS = { uA: 'µA', um: 'µm', C: '°C', F: '°F', K: 'K', pct: '%', mm2: 'mm²', in: 'in' };
export const unitLabel = (u) => UNIT_LABELS[u] ?? u;

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);
