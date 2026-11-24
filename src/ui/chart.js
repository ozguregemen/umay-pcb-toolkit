// Minimal log-log line chart in SVG (no dependencies).

import { si, esc } from './format.js';

const decades = (lo, hi) => {
  const out = [];
  for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++) out.push(10 ** e);
  return out;
};

/**
 * @param {object} o
 * @param {Array<[number, number]>} o.series   main series [x, y]
 * @param {Array<[number, number]>} [o.series2] optional dashed series
 * @param {number} [o.hline]                  horizontal reference (e.g. Z_target)
 * @param {string} o.xUnit, o.yUnit
 * @param {string} o.label                    accessible description
 */
export function logLogChart(o) {
  const W = 560;
  const H = 260;
  const m = { l: 54, r: 28, t: 10, b: 30 };
  const xs = o.series.map((p) => p[0]);
  const ysAll = [...o.series.map((p) => p[1]), ...(o.series2 ?? []).map((p) => p[1]), ...(o.hline ? [o.hline] : [])]
    .filter((y) => y > 0 && Number.isFinite(y));
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  let y0 = 10 ** Math.floor(Math.log10(Math.min(...ysAll)));
  let y1 = 10 ** Math.ceil(Math.log10(Math.max(...ysAll)));
  if (y1 / y0 > 1e7) y0 = y1 / 1e7;
  if (y0 === y1) { y0 /= 10; y1 *= 10; }
  const px = (x) => m.l + ((Math.log10(x) - Math.log10(x0)) / (Math.log10(x1) - Math.log10(x0))) * (W - m.l - m.r);
  const py = (y) => H - m.b - ((Math.log10(Math.max(y, y0)) - Math.log10(y0)) / (Math.log10(y1) - Math.log10(y0))) * (H - m.t - m.b);
  const path = (s) => s.map(([x, y], i) => `${i ? 'L' : 'M'}${px(x).toFixed(1)},${py(Math.min(Math.max(y, y0), y1)).toFixed(1)}`).join('');

  const gx = decades(x0, x1).filter((x) => x >= x0 && x <= x1);
  const gy = decades(y0, y1).filter((y) => y >= y0 && y <= y1);
  const grid = [
    ...gx.map((x) => `<line class="gridline" x1="${px(x)}" x2="${px(x)}" y1="${m.t}" y2="${H - m.b}"/><text x="${px(x)}" y="${H - 10}" text-anchor="middle">${esc(si(x, o.xUnit, 3))}</text>`),
    ...gy.map((y) => `<line class="gridline" x1="${m.l}" x2="${W - m.r}" y1="${py(y)}" y2="${py(y)}"/><text x="${m.l - 6}" y="${py(y) + 4}" text-anchor="end">${esc(si(y, o.yUnit, 3))}</text>`),
  ].join('');
  return `
  <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label)}">
    ${grid}
    <rect class="axis" x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}" fill="none"/>
    ${o.hline ? `<line class="target" x1="${m.l}" x2="${W - m.r}" y1="${py(o.hline)}" y2="${py(o.hline)}"/>` : ''}
    ${o.series2 ? `<path class="series-2" d="${path(o.series2)}"/>` : ''}
    <path class="series" d="${path(o.series)}"/>
  </svg>`;
}
