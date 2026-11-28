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

// ---------------------------------------------------------------------------
// Line chart with a linear or logarithmic scale per axis.
// ---------------------------------------------------------------------------

/** A coordinate as it is written into the SVG: a plain number, one decimal. */
const px1 = (x) => String(Math.round(x * 10) / 10);

/** Tick values on "nice" steps (1, 2, 5 × 10ⁿ) inside [lo, hi]. */
function linTicks(lo, hi, target) {
  const span = hi - lo;
  if (!(span > 0) || !Number.isFinite(span)) return [lo];
  const mag = 10 ** Math.floor(Math.log10(span / target));
  const step = [1, 2, 5, 10].map((k) => k * mag).find((s) => span / s <= target) ?? 10 * mag;
  const first = Math.ceil(lo / step - 1e-9);
  const out = [];
  for (let k = 0; k <= 2 * target; k++) { // bounded: a span far below the values' precision must not loop
    const x = (first + k) * step;
    if (x > hi + step * 1e-9) break;
    out.push(Number(x.toPrecision(12)));
  }
  return out;
}

/** Two ends that differ by rounding noise only count as one value. */
const same = (a, b) => Math.abs(b - a) <= 1e-9 * Math.max(Math.abs(a), Math.abs(b));

/** Tick values of a logarithmic axis: 1-2-5 steps over a short span, decades over a long one. */
function logTicks(lo, hi, target) {
  const inside = (x) => x >= lo * (1 - 1e-9) && x <= hi * (1 + 1e-9);
  const fine = [];
  const dec = [];
  for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++) {
    for (const k of [1, 2, 5]) {
      const x = k * Number(`1e${e}`);
      if (!inside(x)) continue;
      fine.push(x);
      if (k === 1) dec.push(x);
    }
  }
  if (!fine.length) return [lo, hi]; // less than one 1-2-5 step: label the ends
  if (fine.length <= target) return fine;
  if (dec.length <= target) return dec;
  const every = Math.ceil(dec.length / target);
  return dec.filter((_, i) => i % every === 0);
}

/** Estimated width of a tick label in the chart's own units (12 px sans-serif). */
const textW = (s) => String(s).length * 6.4;

/**
 * Line chart of one series, with an optional operating-point marker.
 *
 * All geometry is written with plain JS numbers; the formatters only produce
 * label text (a Turkish decimal comma in a coordinate would break the SVG).
 *
 * @param {object} o
 * @param {Array<[number, number]>} o.series   [x, y] in ascending x; a non-finite y is a gap in the line
 * @param {boolean} [o.xLog]                  logarithmic x axis (points with x ≤ 0 are left out)
 * @param {boolean} [o.yLog]                  logarithmic y axis (falls back to linear unless every y > 0)
 * @param {[number, number]} [o.xRange]       ends of the x axis; default: the extent of the series
 * @param {(n: number) => string} [o.xFmt]    tick-label text of the x axis
 * @param {(n: number) => string} [o.yFmt]    tick-label text of the y axis
 * @param {{x: number, y: number, label?: string}} [o.marker]  operating point (drawn when inside the axes)
 * @param {number} [o.hline]                  horizontal reference line
 * @param {string} o.label                    accessible name
 * @param {string} [o.describedBy]            id of the element holding the text alternative
 * @returns {string} SVG markup, or '' when there is no point to draw
 */
export function lineChart(o) {
  // Small on purpose: the chart sits in the narrow result column, and a smaller
  // viewBox keeps its 12-unit labels readable there.
  const W = 320;
  const H = 224;
  const fin = Number.isFinite;
  const xFmt = o.xFmt ?? String;
  const yFmt = o.yFmt ?? String;
  const xLog = !!o.xLog;
  const pts = (o.series ?? []).filter((p) => fin(p[0]) && (!xLog || p[0] > 0));
  const good = pts.filter((p) => fin(p[1]));
  if (!good.length) return '';
  const yLog = !!o.yLog && good.every((p) => p[1] > 0);
  const hline = fin(o.hline) && (!yLog || o.hline > 0) ? o.hline : null;
  const mk = o.marker && fin(o.marker.x) && fin(o.marker.y) && (!xLog || o.marker.x > 0) && (!yLog || o.marker.y > 0) ? o.marker : null;

  // Axis ends: x is the requested range, y the extent of the data with a little air.
  let [x0, x1] = o.xRange?.every(fin) && o.xRange[1] > o.xRange[0] && (!xLog || o.xRange[0] > 0)
    ? o.xRange
    : [Math.min(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[0]))];
  if (same(x0, x1)) [x0, x1] = xLog ? [x0 / 2, x1 * 2] : [x0 - (Math.abs(x0) * 0.1 || 1), x1 + (Math.abs(x1) * 0.1 || 1)];
  const ys = [...good.map((p) => p[1]), ...(mk ? [mk.y] : []), ...(hline === null ? [] : [hline])];
  let y0 = Math.min(...ys);
  let y1 = Math.max(...ys);
  const flat = same(y0, y1); // a constant output: the line goes through the middle
  if (yLog) {
    const pad = flat ? 0.3 : (Math.log10(y1) - Math.log10(y0)) * 0.06;
    y0 = 10 ** (Math.log10(y0) - pad);
    y1 = 10 ** (Math.log10(y1) + pad);
  } else {
    const pad = flat ? Math.abs(y1) * 0.1 || 1 : (y1 - y0) * 0.08;
    y0 -= pad;
    y1 += pad;
  }

  const yTicks = (yLog ? logTicks(y0, y1, 6) : linTicks(y0, y1, 5)).map((v) => [v, yFmt(v)]);
  const m = { l: Math.min(110, Math.max(40, Math.ceil(Math.max(0, ...yTicks.map((tk) => textW(tk[1]))) + 12))), r: 18, t: 14, b: 30 };
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;
  const fx = xLog ? Math.log10 : (v) => v;
  const fy = yLog ? Math.log10 : (v) => v;
  const X = (v) => m.l + ((fx(v) - fx(x0)) / (fx(x1) - fx(x0))) * pw;
  const Y = (v) => m.t + ph - ((fy(v) - fy(y0)) / (fy(y1) - fy(y0))) * ph;

  // Fewer x ticks when their labels would run into each other.
  let xTicks = [];
  for (const target of [5, 4, 3, 2]) {
    xTicks = (xLog ? logTicks(x0, x1, target + 1) : linTicks(x0, x1, target)).map((v) => [v, xFmt(v)]);
    if (xTicks.length < 2 || Math.max(...xTicks.map((tk) => textW(tk[1]))) + 10 <= pw / xTicks.length) break;
  }

  const grid = [
    ...xTicks.map(([v, s]) => {
      const gx = X(v);
      const anchor = gx > W - m.r - 24 ? 'end' : gx < m.l + 8 ? 'start' : 'middle';
      return `<line class="gridline" x1="${px1(gx)}" x2="${px1(gx)}" y1="${m.t}" y2="${H - m.b}"/><text x="${px1(gx)}" y="${H - 10}" text-anchor="${anchor}">${esc(s)}</text>`;
    }),
    ...yTicks.map(([v, s]) => `<line class="gridline" x1="${m.l}" x2="${W - m.r}" y1="${px1(Y(v))}" y2="${px1(Y(v))}"/><text x="${m.l - 6}" y="${px1(Y(v) + 4)}" text-anchor="end">${esc(s)}</text>`),
  ].join('');

  // Runs of valid points become sub-paths; a point with no valid neighbour is drawn as a dot.
  const inX = (v) => v >= x0 && v <= x1;
  let d = '';
  let dots = '';
  let run = [];
  const flush = () => {
    if (run.length === 1) dots += `<circle class="dot" cx="${px1(X(run[0][0]))}" cy="${px1(Y(run[0][1]))}" r="2.5"/>`;
    else if (run.length > 1) d += run.map(([x, y], i) => `${i ? 'L' : 'M'}${px1(X(x))},${px1(Y(y))}`).join('');
    run = [];
  };
  for (const p of pts) {
    if (fin(p[1]) && inX(p[0])) run.push(p); else flush();
  }
  flush();

  let marker = '';
  if (mk && inX(mk.x)) {
    const cx = X(mk.x);
    const cy = Y(mk.y);
    const right = cx > m.l + pw / 2;
    const below = cy < m.t + 24;
    marker = `<line class="guide" x1="${px1(cx)}" x2="${px1(cx)}" y1="${px1(cy)}" y2="${H - m.b}"/><line class="guide" x1="${m.l}" x2="${px1(cx)}" y1="${px1(cy)}" y2="${px1(cy)}"/>
    <circle class="marker" cx="${px1(cx)}" cy="${px1(cy)}" r="4.5"/>${mk.label
    ? `<text class="marker-label" x="${px1(right ? cx - 9 : cx + 9)}" y="${px1(below ? cy + 18 : cy - 9)}" text-anchor="${right ? 'end' : 'start'}">${esc(mk.label)}</text>` : ''}`;
  }

  return `
  <svg class="chart line-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label)}"${o.describedBy ? ` aria-describedby="${esc(o.describedBy)}"` : ''}>
    ${grid}
    <rect class="axis" x="${m.l}" y="${m.t}" width="${pw}" height="${ph}" fill="none"/>
    ${hline === null ? '' : `<line class="target" x1="${m.l}" x2="${W - m.r}" y1="${px1(Y(hline))}" y2="${px1(Y(hline))}"/>`}
    ${d ? `<path class="series" d="${d}"/>` : ''}${dots}
    ${marker}
  </svg>`;
}
