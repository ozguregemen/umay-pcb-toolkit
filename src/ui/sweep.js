// Parameter plots: how one output of a calculator changes while one numeric
// input runs over a range ("how sensitive is my result to this input?").
//
// A page opts in with
//
//   plot: {
//     // outputs that can go on the y axis
//     y: [{ key: 'dt', label: 'i18nKey', unit: '°C', get: (r, v, units) => r.deltaTC }, …],
//     // optional: field keys allowed on the x axis, in order of preference;
//     // default: every number field that is visible for the current values
//     x: ['W', 'I'],
//   }
//
// `unit` decides how axis values are written:
//   - an SI unit symbol from SI_UNITS below ('V', 'A', 'Ω', 'W', 'F', 'H', 'Hz',
//     's', 'm', …) is written with an SI prefix by si(): 4,7 kΩ, 250 µF;
//   - any other string ('°C', 'dB', '%', 'mm', '°C/W', '' for a plain ratio) is
//     written after the plain number by fmt(): 21,5 °C;
//   - `si: true | false` on the output overrides that choice;
//   - `unit` may be a function returning the string (an output that follows
//     the reader's mm / mil preference).
// `get` returns the value in that unit, or anything non-finite (NaN, null,
// undefined) when the result does not have this output in the current mode;
// such an output is left out of the y list.
//
// Everything up to plotModel() is pure and runs in Node: each sample point is
// the page's own compute(v, units) with one value replaced. The rest builds the
// markup as strings; ui/calculator.js owns the DOM and the events.

import { t, registerStrings } from '../i18n.js';
import { esc, fmt, si, unitLabel } from './format.js';
import { lineChart } from './chart.js';
import { icon } from './icons.js';

const strings = {
  tr: {
    plot_title: 'Grafik: sonuç bir girdiyle nasıl değişir?',
    plot_x: 'Değiştirilen girdi (yatay eksen)',
    plot_y: 'Gösterilen sonuç (düşey eksen)',
    plot_from: 'Başlangıç',
    plot_to: 'Bitiş',
    plot_caption: '{y} – {x} grafiği',
    plot_range: '{x} {from} ile {to} arasında değişirken: {y} en küçük {min} ({xmin} için), en büyük {max} ({xmax} için).',
    plot_flat: '{x} {from} ile {to} arasında değişirken: {y} değişmez ({min}).',
    plot_gaps: '{total} noktanın {n} tanesinde geçerli sonuç yok; eğri oralarda kesilir.',
    plot_outside: 'Şimdiki değer ({now}) bu aralığın dışında olduğu için işaretlenmedi.',
    plot_errNumber: 'Aralığın iki ucuna da geçerli bir sayı girin.',
    plot_errOrder: 'Başlangıç değeri bitiş değerinden küçük olmalı.',
    plot_errField: 'Bu girdi için aralık geçersiz. {msg}',
    plot_few: 'Bu aralıkta eğri çizmeye yetecek geçerli sonuç yok (en az iki nokta gerekir). Aralığı değiştirin ya da başka bir girdi seçin.',
    plot_none: 'Bu ayarlarla grafiği çizilebilecek bir girdi ya da sonuç yok.',
  },
  en: {
    plot_title: 'Plot: how the result changes with one input',
    plot_x: 'Input to vary (x axis)',
    plot_y: 'Output to show (y axis)',
    plot_from: 'From',
    plot_to: 'To',
    plot_caption: '{y} against {x}',
    plot_range: '{x} from {from} to {to}: {y} is smallest at {xmin} ({min}) and largest at {xmax} ({max}).',
    plot_flat: '{x} from {from} to {to}: {y} does not change ({min}).',
    plot_gaps: '{n} of the {total} points have no valid result; the curve is broken there.',
    plot_outside: 'The current value ({now}) lies outside this range, so it is not marked.',
    plot_errNumber: 'Enter a valid number for both ends of the range.',
    plot_errOrder: '“From” must be smaller than “To”.',
    plot_errField: 'The range is not valid for this input. {msg}',
    plot_few: 'There are not enough valid results in this range to draw a curve (at least two points are needed). Change the range or pick another input.',
    plot_none: 'Nothing can be plotted with these settings.',
  },
};
registerStrings(strings);
export { strings as plotStrings };

/** Number of sample points of a sweep (the current value is added as one more). */
export const SAMPLES = 60;
const LOG_X_RATIO = 50; // to / from at which the samples are spaced logarithmically
const LOG_Y_RATIO = 100; // largest / smallest output above which the y axis is logarithmic

// Unit symbols that take an SI prefix on an axis; see the note at the top.
const SI_UNITS = new Set(['V', 'A', 'Ω', 'W', 'F', 'H', 'Hz', 's', 'm', 'J', 'C', 'S', 'A/V', 'Wh', 'Ah']);

const fin = Number.isFinite;
const isVisible = (x, v) => !(x.show && !x.show(v));
const labelOf = (f, v) => t(typeof f.label === 'function' ? f.label(v) : f.label);
const unitOf = (o) => (typeof o.unit === 'function' ? o.unit() : o.unit) ?? '';

/** A value of an output with its unit (label text only — never for geometry). */
export function formatOutput(o, n, sig = 4) {
  const unit = unitOf(o);
  if (o.si ?? SI_UNITS.has(unit)) return si(n, unit, sig).trim();
  return unit ? `${fmt(n, sig)} ${unit}` : fmt(n, sig);
}

/** A value of an input field in the unit chosen for it (label text only). */
export function formatInput(f, unit, n, sig = 4) {
  const u = unit ? unitLabel(unit) : '';
  if (f.si) return si(n, u, sig).trim();
  return u ? `${fmt(n, sig)} ${u}` : fmt(n, sig);
}

/** The number of an output for one result; NaN when the result does not have it. */
export function readOutput(o, r, v, units) {
  try {
    const y = o.get(r, v, units);
    return typeof y === 'number' && fin(y) ? y : NaN;
  } catch {
    return NaN;
  }
}

/** Number fields that can go on the x axis for the current values. */
export function plotInputs(page, v) {
  const allow = page.plot?.x;
  const out = [];
  for (const s of page.sections ?? []) {
    if (!isVisible(s, v)) continue;
    for (const f of s.fields) {
      if (f.type !== 'number' || !isVisible(f, v) || !fin(v[f.key])) continue; // an empty optional field has no operating point
      if (allow && !allow.includes(f.key)) continue;
      out.push(f);
    }
  }
  if (allow) out.sort((a, b) => allow.indexOf(a.key) - allow.indexOf(b.key));
  return out;
}

/** Outputs the current result has (a finite value at the operating point). */
export function plotOutputs(page, res, v, units) {
  return (page.plot?.y ?? []).filter((o) => fin(readOutput(o, res, v, units)));
}

/** The validation rule a value breaks for this field, as a function giving the form's own message, or null. */
function ruleError(f, n) {
  const rule = f.valid ?? 'positive';
  if (rule === 'positive' && !(n > 0)) return () => t('fe_positive');
  if (rule === 'nonneg' && n < 0) return () => t('fe_nonneg');
  if (f.min !== undefined && n < f.min) return () => t('fe_min', { min: fmt(f.min) });
  if (f.max !== undefined && n > f.max) return () => t('fe_max', { max: fmt(f.max) });
  return null;
}

/** Whether the form would accept this value for the field. */
export const accepts = (f, x) => fin(x) && !ruleError(f, x) && (!f.integer || Number.isInteger(x));

const tidy = (x) => Number(x.toPrecision(3));

/**
 * Default range around the current value: a quarter to four times a positive
 * value, half to one and a half times a negative one, and for zero a span up
 * to the field's largest preset (or 10). Kept inside what the field accepts.
 */
export function defaultRange(f, value, unit) {
  const rule = f.valid ?? 'positive';
  let from;
  let to;
  if (value > 0) {
    from = value / 4;
    to = value * 4;
  } else if (value < 0) {
    from = value * 1.5;
    to = value * 0.5;
  } else {
    const presets = (f.presets ?? []).filter((p) => !p.unit || p.unit === unit).map((p) => Number(p.value)).filter(fin);
    to = Math.max(0, ...presets) || 10;
    from = rule === 'any' ? -to : 0;
  }
  if (f.integer) {
    from = Math.floor(from);
    to = Math.ceil(to);
    if (rule === 'positive') from = Math.max(from, 1);
  }
  if (f.min !== undefined) from = Math.max(from, f.min);
  if (f.max !== undefined) to = Math.min(to, f.max);
  return { from: tidy(from), to: tidy(to) };
}

/**
 * Sample positions from `from` to `to` (both included): spaced logarithmically
 * when the range is positive and spans a factor of 50 or more, linearly
 * otherwise. For an integer field the positions are whole numbers.
 * @returns {{xs: number[], log: boolean}}
 */
export function sampleRange(from, to, { n = SAMPLES, integer = false } = {}) {
  const log = from > 0 && to / from >= LOG_X_RATIO;
  let xs = [];
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1);
    xs.push(i === 0 ? from : i === n - 1 ? to : log ? from * (to / from) ** k : from + (to - from) * k);
  }
  if (integer) xs = [...new Set(xs.map(Math.round))].filter((x) => x >= from && x <= to);
  return { xs, log };
}

/**
 * One output along a sweep of one field: [[x, y], …]. Every point is the
 * page's own compute with only that value replaced; where the field would not
 * accept x, compute fails or throws, or the output is not finite, y is NaN
 * (a gap in the curve).
 */
export function sweep(page, v, units, f, xs, out) {
  return xs.map((x) => {
    if (!accepts(f, x)) return [x, NaN];
    const vx = { ...v, [f.key]: x };
    try {
      const r = page.compute(vx, units);
      return [x, r && r.ok !== false ? readOutput(out, r, vx, units) : NaN];
    } catch {
      return [x, NaN];
    }
  });
}

/** Text of a number as it goes into a range input (EE suffix for fields that accept 4k7 / 100n). */
function numText(x, f) {
  if (!f.si || x === 0 || !fin(x)) return String(x);
  const abs = Math.abs(x);
  for (const [scale, p] of [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'u'], [1e-9, 'n'], [1e-12, 'p']]) {
    if (abs >= scale * 0.9995) return `${Number((x / scale).toPrecision(4))}${p}`;
  }
  return String(x);
}

/**
 * The reader's choices, kept by the caller for as long as the page is open:
 * x / y are the chosen keys; ranges[fieldKey] = { unit, from, to, edited }
 * holds the text of the two range inputs for each field that was shown.
 */
export const newPlotSel = () => ({ x: null, y: null, at: null, ranges: {} });

/** Store a change of one control ('x' | 'y' | 'from' | 'to'). */
export function setPlotChoice(sel, which, value) {
  if (which === 'x' || which === 'y') sel[which] = value;
  else if ((which === 'from' || which === 'to') && sel.ranges[sel.at]) {
    sel.ranges[sel.at][which] = String(value);
    sel.ranges[sel.at].edited = true;
  }
}

/**
 * Range texts for a field. A range the reader has not edited follows the
 * current value when it leaves the range; one typed in stays until the unit
 * of the field changes (the numbers were meant in the old unit).
 */
function rangeOf(sel, f, now, unit, parse) {
  const fresh = () => {
    const d = defaultRange(f, now, unit);
    return { unit, from: numText(d.from, f), to: numText(d.to, f), edited: false };
  };
  let r = sel.ranges[f.key];
  if (!r || r.unit !== unit) r = fresh();
  else if (!r.edited && !(now >= parse(r.from, f.si) && now <= parse(r.to, f.si))) r = fresh();
  sel.ranges[f.key] = r;
  return r;
}

/**
 * Everything the block shows for the current state.
 * ctx = { page, v, units, res, sel, parse } — v / units / res as the page was
 * last computed, sel from newPlotSel(), parse = parseNumber of ui/calculator.js.
 * Sets `error` ({ key, text() }) instead of the curve when nothing can be drawn.
 *
 * The model holds no translated text: labels, messages and formatted numbers
 * are functions, resolved when the markup is built.
 */
export function plotModel({ page, v, units, res, sel, parse }) {
  const inputs = plotInputs(page, v);
  const outputs = plotOutputs(page, res, v, units);
  const m = {
    inputs: inputs.map((f) => ({ key: f.key, label: () => labelOf(f, v) })),
    outputs: outputs.map((o) => ({ key: o.key, label: () => t(o.label) })),
  };
  const fail = (key, why) => Object.assign(m, { error: { key, text: () => t(key, why ? { msg: why() } : undefined) } });
  if (!inputs.length || !outputs.length) return fail('plot_none');

  const f = inputs.find((x) => x.key === sel.x) ?? inputs[0];
  const out = outputs.find((o) => o.key === sel.y) ?? outputs[0];
  const unit = units?.[f.key];
  const now = v[f.key];
  const range = rangeOf(sel, f, now, unit, parse);
  sel.at = f.key; // the field whose range the two inputs edit
  Object.assign(m, {
    x: f.key,
    y: out.key,
    xLabel: () => labelOf(f, v),
    yLabel: () => t(out.label),
    unitText: unit ? unitLabel(unit) : '',
    si: !!f.si,
    fromText: range.from,
    toText: range.to,
    xFmt: (n, sig) => formatInput(f, unit, n, sig),
    yFmt: (n, sig) => formatOutput(out, n, sig),
  });

  const from = parse(range.from, f.si);
  const to = parse(range.to, f.si);
  if (!fin(from) || !fin(to)) return fail('plot_errNumber');
  if (!(from < to)) return fail('plot_errOrder');
  const bad = ruleError(f, from) ?? ruleError(f, to);
  if (bad) return fail('plot_errField', bad);

  // The current value is sampled too, so the marker sits on the curve.
  const { xs, log } = sampleRange(from, to, { integer: !!f.integer });
  const inside = now >= from && now <= to;
  if (inside && !xs.includes(now)) {
    xs.push(now);
    xs.sort((a, b) => a - b);
  }
  const points = sweep(page, v, units, f, xs, out);
  const valid = points.filter((p) => fin(p[1]));
  const yNow = readOutput(out, res, v, units);
  Object.assign(m, {
    from, to, now, points, valid: valid.length, xLog: log, yLog: false,
    marker: inside && fin(yNow) ? { x: now, y: yNow } : null,
  });
  if (valid.length < 2) return fail('plot_few');

  let lo = valid[0];
  let hi = valid[0];
  for (const p of valid) {
    if (p[1] < lo[1]) lo = p;
    if (p[1] > hi[1]) hi = p;
  }
  // Rounding noise in an output the input does not affect is not a change.
  const flat = hi[1] - lo[1] <= 1e-9 * Math.max(Math.abs(lo[1]), Math.abs(hi[1]));
  return Object.assign(m, { min: lo, max: hi, flat, yLog: lo[1] > 0 && hi[1] / lo[1] > LOG_Y_RATIO });
}

const L = (k, vars) => esc(t(k, vars));

/** The four controls. Their events are handled in ui/calculator.js through [data-plot]. */
export function plotControlsHtml(m) {
  if (!m.x) return '';
  const opts = (list, on) => list.map((o) => `<option value="${esc(o.key)}"${o.key === on ? ' selected' : ''}>${esc(o.label())}</option>`).join('');
  const end = (which, labelKey, value) => `<label class="plot-ctl"><span>${L(labelKey)}</span><span class="input-group"><input data-plot="${which}" type="text" inputmode="${m.si ? 'text' : 'decimal'}" autocomplete="off" spellcheck="false" value="${esc(value)}">${m.unitText ? `<span class="unit unit-static">${esc(m.unitText)}</span>` : ''}</span></label>`;
  return `<div class="plot-controls">
    <label class="plot-ctl wide"><span>${L('plot_x')}</span><select data-plot="x">${opts(m.inputs, m.x)}</select></label>
    <label class="plot-ctl wide"><span>${L('plot_y')}</span><select data-plot="y">${opts(m.outputs, m.y)}</select></label>
    ${end('from', 'plot_from', m.fromText)}${end('to', 'plot_to', m.toText)}
  </div>`;
}

/** The sentence under the chart; it is also the chart's text alternative. */
export function plotSentence(m) {
  const vars = {
    x: m.xLabel(), y: m.yLabel(), from: m.xFmt(m.from), to: m.xFmt(m.to),
    min: m.yFmt(m.min[1]), max: m.yFmt(m.max[1]), xmin: m.xFmt(m.min[0]), xmax: m.xFmt(m.max[0]),
  };
  const parts = [t(m.flat ? 'plot_flat' : 'plot_range', vars)];
  if (m.valid < m.points.length) parts.push(t('plot_gaps', { n: String(m.points.length - m.valid), total: String(m.points.length) }));
  if (!m.marker) parts.push(t('plot_outside', { now: m.xFmt(m.now) }));
  return parts.join(' ');
}

/** Title line, chart and sentence — or a short message when there is no curve. */
export function plotOutHtml(m) {
  if (m.error) return `<p class="plot-empty">${esc(m.error.text())}</p>`;
  const caption = t('plot_caption', { y: m.yLabel(), x: m.xLabel() });
  const chart = lineChart({
    series: m.points,
    xLog: m.xLog,
    yLog: m.yLog,
    xRange: [m.from, m.to],
    xFmt: m.xFmt,
    yFmt: m.yFmt,
    marker: m.marker ? { ...m.marker, label: `${m.xFmt(m.marker.x)} → ${m.yFmt(m.marker.y)}` } : undefined,
    label: caption,
    describedBy: 'plot-note',
  });
  // The result column is narrow: the chart can be opened larger, like a diagram (ui/zoom.js).
  const zoom = `<button type="button" class="zoom-btn" aria-label="${esc(t('zoomIn'))}: ${esc(caption)}" title="${esc(t('zoomIn'))}">${icon('expand', 16)}</button>`;
  return `<figure class="plot-fig"><figcaption class="plot-cap">${esc(caption)}</figcaption><div class="zoomable">${chart}${zoom}</div>
    <p class="plot-note" id="plot-note">${esc(plotSentence(m))}</p></figure>`;
}

/** The chart area alone: redrawn when a range end or the output changes. */
export function plotOut(ctx) {
  try {
    return plotOutHtml(plotModel(ctx));
  } catch (err) {
    console.error(err);
    return '';
  }
}

/** Controls and chart area: the content of the open block. A failure here never breaks the page. */
export function plotBody(ctx) {
  try {
    const m = plotModel(ctx);
    return `${plotControlsHtml(m)}<div class="plot-out">${plotOutHtml(m)}</div>`;
  } catch (err) {
    console.error(err);
    return '';
  }
}

/** The collapsible block. While it is closed nothing is computed. */
export function plotBlock(ctx, open) {
  return `<details class="block plot"${open ? ' open' : ''}><summary>${L('plot_title')}</summary><div class="plot-body">${open ? plotBody(ctx) : ''}</div></details>`;
}
