import { locale } from '../i18n.js';

const cache = new Map();
// No thousands separators: "3.950" (Turkish for 3950) and "3,950" (English)
// are each read as 3.95 by readers used to the other convention.
function nf(opts) {
  const key = locale() + JSON.stringify(opts);
  if (!cache.has(key)) cache.set(key, new Intl.NumberFormat(locale(), { useGrouping: false, ...opts }));
  return cache.get(key);
}

/** Number with `sig` significant digits (exponent only for extreme magnitudes). */
export function fmt(n, sig = 4) {
  if (!Number.isFinite(n)) return '—';
  if (n !== 0 && (Math.abs(n) >= 1e9 || Math.abs(n) < 1e-6)) return n.toExponential(sig - 1);
  return nf({ maximumSignificantDigits: sig }).format(n);
}

/** Number with a fixed number of decimals. */
export function fixed(n, decimals = 2) {
  if (!Number.isFinite(n)) return '—';
  return nf({ minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
}

const PREFIXES = [
  [1e9, 'G'],
  [1e6, 'M'],
  [1e3, 'k'],
  [1, ''],
  [1e-3, 'm'],
  [1e-6, 'µ'],
  [1e-9, 'n'],
  [1e-12, 'p'],
  [1e-15, 'f'],
];

/** Value with an SI prefix so the mantissa stays in [1, 1000). */
export function si(value, unit, sig = 4) {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return `0 ${unit}`;
  const abs = Math.abs(value);
  const [scale, prefix] = PREFIXES.find(([s]) => abs >= s * 0.99995) ?? PREFIXES[PREFIXES.length - 1];
  return `${fmt(value / scale, sig)} ${prefix}${unit}`;
}

/** Same as si() but with the unit wrapped for the hero display. */
export function siHtml(value, unit, sig = 4) {
  const s = si(value, unit, sig);
  const i = s.lastIndexOf(' ');
  return i < 0 ? esc(s) : `${esc(s.slice(0, i))} <span class="u">${esc(s.slice(i + 1))}</span>`;
}

const UNIT_LABELS = {
  uA: 'µA', um: 'µm', C: '°C', F: '°F', K: 'K', pct: '%', mm2: 'mm²', in: 'in',
  ohm: 'Ω', ps: 'ps', ns: 'ns', us: 'µs', GHz: 'GHz', MHz: 'MHz', kHz: 'kHz', Hz: 'Hz',
  KW: '°C/W', s: 's', ms: 'ms', nH: 'nH', uH: 'µH', mH: 'mH', pF: 'pF', nF: 'nF', uF: 'µF',
  mohm: 'mΩ', kohm: 'kΩ', Mohm: 'MΩ', mV: 'mV', V: 'V', mW: 'mW', W: 'W', mA: 'mA', A: 'A',
  WmK: 'W/m·K', Wm2K: 'W/m²·K', cm2: 'cm²', in2: 'in²', dBm: 'dBm', psin: 'ps/in', psmm: 'ps/mm', farad: 'F', henry: 'H',
};
export const unitLabel = (u) => UNIT_LABELS[u] ?? u;

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);
