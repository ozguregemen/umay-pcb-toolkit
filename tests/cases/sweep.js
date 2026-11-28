// Parameter plots (src/ui/sweep.js) and the line chart behind them
// (src/ui/chart.js): the sampler and its ranges, the model that keeps the
// reader's choices, every page's `plot` declaration at its default inputs and
// in each mode, and the SVG in Turkish and English. Geometry must hold plain
// JS numbers only — a Turkish decimal comma in a coordinate breaks the drawing.

import { ok, eq, near } from '../assert.js';
import { TOOLS } from '../../src/registry.js';
import { registerStrings, setLang, getLang, dictionaries, t } from '../../src/i18n.js';
import { parseNumber } from '../../src/ui/calculator.js';
import { si, esc } from '../../src/ui/format.js';
import { lineChart, logLogChart } from '../../src/ui/chart.js';
import {
  SAMPLES, sampleRange, defaultRange, accepts, sweep, readOutput, plotInputs, plotOutputs,
  formatOutput, formatInput, newPlotSel, setPlotChoice, plotModel, plotControlsHtml, plotOutHtml,
  plotSentence, plotBody, plotBlock, plotStrings,
} from '../../src/ui/sweep.js';

// A page that fails to load is reported by diagrams.js ("every module loads").
const loaded = await Promise.allSettled(TOOLS.map((tool) => tool.load()));
const pages = loaded.filter((r) => r.status === 'fulfilled').map((r) => r.value.default);
for (const p of pages) if (p.strings) registerStrings(p.strings);
const plotPages = pages.filter((p) => p.plot);

// The pages the feature was introduced on; a `plot` must not go missing from them.
const EXPECTED = ['trace', 'via', 'fusing', 'impedance', 'crosstalk', 'termination', 'dcdc', 'thermal', 'thermalvia', 'mosfet',
  'divider', 'rc', 'led', 'ntc', 'shunt', 'i2c', 'holdup', 'linkbudget', 'stencil', 'xtalgm'];

const fin = Number.isFinite;
const fieldsOf = (page) => page.sections.flatMap((s) => s.fields);
const report = (problems) => ok(problems.length === 0, `\n${[...new Set(problems)].slice(0, 20).join('\n')}`);

function inBothLanguages(fn) {
  const before = getLang();
  try {
    for (const l of ['tr', 'en']) { setLang(l); fn(l); }
  } finally {
    setLang(before);
  }
}

/** Default inputs, plus one variant per option of every choice/select (with its `set` values). */
function variants(page) {
  const raw = {};
  const units = {};
  for (const f of fieldsOf(page)) {
    raw[f.key] = f.default === undefined || f.default === null ? '' : String(f.default);
    if (f.type === 'number') units[f.key] = f.unit ?? f.units?.[0];
  }
  const list = [{ raw, units, label: 'defaults' }];
  for (const f of fieldsOf(page)) {
    for (const o of f.options ?? []) {
      const r2 = { ...raw, [f.key]: String(o.value) };
      const u2 = { ...units };
      for (const [k, val] of Object.entries(o.set ?? {})) {
        r2[k] = String(val);
        const ff = fieldsOf(page).find((x) => x.key === k);
        if (ff?.type === 'number' && ff.units) u2[k] = ff.units.includes(o.set[`${k}_u`]) ? o.set[`${k}_u`] : ff.unit ?? ff.units[0];
      }
      list.push({ raw: r2, units: u2, label: `${f.key}=${o.value}` });
    }
  }
  return list.map((x) => {
    const v = {};
    for (const f of fieldsOf(page)) v[f.key] = f.type === 'number' ? parseNumber(x.raw[f.key], f.si) : x.raw[f.key];
    return { v, units: x.units, label: x.label };
  });
}

const modelOf = (ctx, x, y) => {
  const sel = newPlotSel();
  sel.x = x;
  sel.y = y;
  return plotModel({ ...ctx, sel, parse: parseNumber });
};

// The sweeps of every page are computed once and shared by the page tests:
// at the defaults every input × output, in the other modes every output
// against the first input (modes that offer the same lists are not repeated).
let swept;
/** The same page with compute remembered per set of inputs: the outputs of one sweep share its results. */
function remembering(page) {
  const cache = new Map();
  return {
    ...page,
    compute(v, units) {
      const key = JSON.stringify([v, units]);
      if (!cache.has(key)) cache.set(key, page.compute(v, units));
      return cache.get(key);
    },
  };
}
function sweeps() {
  if (swept) return swept;
  swept = { models: [], problems: [], dead: [] };
  for (const page of plotPages.map(remembering)) {
    const seen = new Set();
    const live = new Set();
    for (const { v, units, label } of variants(page)) {
      const where = `${page.id}[${label}]`;
      let res;
      try { res = page.compute(v, units); } catch (e) { swept.problems.push(`${where}: compute threw ${e.message}`); continue; }
      if (!res || res.ok === false) continue; // an option that needs other inputs first
      const ctx = { page, v, units, res };
      const ins = plotInputs(page, v);
      const outs = plotOutputs(page, res, v, units);
      for (const o of outs) live.add(o.key);
      if (!ins.length || !outs.length) { swept.problems.push(`${where}: nothing to plot (${ins.length} inputs, ${outs.length} outputs)`); continue; }
      const sig = `${ins.map((f) => f.key)}|${outs.map((o) => o.key)}`;
      const isDefault = label === 'defaults';
      if (!isDefault && seen.has(sig)) continue;
      seen.add(sig);
      for (const o of outs) {
        for (const f of isDefault ? ins : ins.slice(0, 1)) {
          try {
            swept.models.push({ id: page.id, where: `${where} ${o.key}/${f.key}`, isDefault, ctx, f, o, m: modelOf(ctx, f.key, o.key) });
          } catch (e) {
            swept.problems.push(`${where} ${o.key}/${f.key}: threw ${e.message}`);
          }
        }
      }
    }
    for (const o of page.plot.y) if (!live.has(o.key)) swept.dead.push(`${page.id}: output "${o.key}" exists in no mode`);
  }
  return swept;
}

const NUM = /^-?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i;

/** Problems in chart markup: non-numbers, and anything but plain numbers in geometry. */
function svgProblems(html) {
  const bad = [];
  // Icons (the enlarge button) are fixed drawings, not computed geometry.
  const markup = html.replace(/<svg class="icon"[\s\S]*?<\/svg>/g, '');
  if (/NaN|undefined|Infinity/.test(markup)) bad.push('NaN/undefined/Infinity');
  const tags = markup.replace(/>[^<]*</g, '><'); // geometry lives in attributes
  for (const [, name, val] of tags.matchAll(/\s(x|y|x1|x2|y1|y2|cx|cy|r|width|height)="([^"]*)"/g)) {
    if (!NUM.test(val)) bad.push(`${name}="${val}"`);
  }
  for (const [, val] of tags.matchAll(/\sviewBox="([^"]*)"/g)) {
    const parts = val.trim().split(/\s+/);
    if (parts.length !== 4 || !parts.every((x) => NUM.test(x))) bad.push(`viewBox="${val}"`);
  }
  // Only M / L with "x,y" pairs: a decimal comma adds a third number to a pair.
  for (const [, val] of tags.matchAll(/\sd="([^"]*)"/g)) {
    if (!/^(?:[ML]-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?)+$/.test(val)) bad.push(`d="${val.slice(0, 40)}…"`);
  }
  return bad;
}

const geometryNumbers = (markup) => [...markup.matchAll(/\sd="([^"]*)"/g)]
  .reduce((n, [, val]) => n + (val.match(/-?\d+(?:\.\d+)?/g) ?? []).length, 0);

/** The points of the series path, per sub-path: [[[x, y], …], …]. */
const subPaths = (svg) => (svg.match(/class="series" d="([^"]*)"/)?.[1] ?? '').split('M').filter(Boolean)
  .map((s) => s.split('L').map((p) => p.split(',').map(Number)));

// A small page for the unit tests: `a` drives y, `b` (shown in mode b only,
// SI input) drives z, `n` is a bounded whole number, `e` an empty optional field.
let calls = 0;
const fake = {
  id: 'fake',
  sections: [{
    title: 'x',
    fields: [
      { key: 'mode', type: 'choice', label: 'mode', default: 'a', options: [{ value: 'a', label: 'a', raw: true }, { value: 'b', label: 'b', raw: true }] },
      { key: 'a', type: 'number', label: 'plot_from', default: 2, units: ['V', 'mV'] },
      { key: 'b', type: 'number', label: 'plot_to', default: 3, units: ['ohm'], si: true, show: (v) => v.mode === 'b' },
      { key: 'n', type: 'number', label: 'plot_x', default: 4, integer: true, min: 1, max: 10 },
      { key: 'e', type: 'number', label: 'plot_y', default: '', optional: true },
    ],
  }],
  compute(v) {
    calls++;
    return { ok: true, y: v.a * 10 + v.n, z: v.mode === 'b' ? v.b * 2 : null };
  },
  plot: {
    y: [
      { key: 'y', label: 'plot_from', unit: 'V', get: (r) => r.y },
      { key: 'z', label: 'plot_to', unit: 'Ω', get: (r) => r.z },
    ],
  },
};
const fakeCtx = (over = {}, units = { a: 'V', b: 'ohm' }, page = fake) => {
  const v = { mode: 'a', a: 2, b: 3, n: 4, e: NaN, ...over };
  return { page, v, units, res: page.compute(v, units), parse: parseNumber };
};

/** logLogChart as it was before the line chart was added (kept to prove it did not change). */
function legacyLogLogChart(o) {
  const decades = (lo, hi) => {
    const out = [];
    for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++) out.push(10 ** e);
    return out;
  };
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

export const cases = [
  // ---- sampler -----------------------------------------------------------
  ['sweep: samples are linear over a narrow range, logarithmic from a factor of 50', () => {
    const lin = sampleRange(1, 10);
    eq(lin.xs.length, SAMPLES, 'count');
    eq(lin.log, false, 'linear');
    eq(lin.xs[0], 1, 'first');
    eq(lin.xs[SAMPLES - 1], 10, 'last');
    near(lin.xs[1] - lin.xs[0], 9 / (SAMPLES - 1), 1e-9, 'step');
    near(lin.xs[30] - lin.xs[29], lin.xs[1] - lin.xs[0], 1e-9, 'equal steps');

    const log = sampleRange(0.2, 10);
    eq(log.log, true, 'factor 50 is logarithmic');
    eq(log.xs[0], 0.2, 'first');
    eq(log.xs[SAMPLES - 1], 10, 'last');
    near(log.xs[1] / log.xs[0], 50 ** (1 / (SAMPLES - 1)), 1e-9, 'ratio');
    near(log.xs[40] / log.xs[39], log.xs[1] / log.xs[0], 1e-9, 'equal ratios');
    ok(log.xs.every((x, i) => i === 0 || x > log.xs[i - 1]), 'ascending');

    eq(sampleRange(0.2, 9.9).log, false, 'just under a factor of 50');
    eq(sampleRange(0, 1000).log, false, 'from zero');
    eq(sampleRange(-5, 500).log, false, 'from a negative value');
    eq(sampleRange(-100, -1).log, false, 'negative range');
    near(sampleRange(-100, -1).xs[1], -100 + 99 / (SAMPLES - 1), 1e-9, 'negative range is linear');
    eq(sampleRange(1, 2, { n: 5 }).xs.join(' '), '1 1.25 1.5 1.75 2', 'n');
  }],

  ['sweep: an integer input is sampled at whole numbers only', () => {
    eq(sampleRange(1, 4, { integer: true }).xs.join(' '), '1 2 3 4', '1…4');
    const wide = sampleRange(2, 500, { integer: true }).xs;
    ok(wide.every(Number.isInteger), 'whole numbers');
    eq(new Set(wide).size, wide.length, 'no duplicates');
    eq(wide[0], 2, 'first');
    eq(wide[wide.length - 1], 500, 'last');
    eq(sampleRange(1.4, 3.6, { integer: true }).xs.join(' '), '2 3', 'stays inside the range');
  }],

  ['sweep: the default range is a quarter to four times the value, inside the field limits', () => {
    const same = (r, from, to, label) => { eq(r.from, from, `${label} from`); eq(r.to, to, `${label} to`); };
    same(defaultRange({}, 2), 0.5, 8, 'positive');
    same(defaultRange({ valid: 'any' }, 25), 6.25, 100, 'positive, any sign allowed');
    same(defaultRange({ max: 100 }, 90), 22.5, 100, 'clamped to max');
    same(defaultRange({ min: 1 }, 1.5), 1, 6, 'clamped to min');
    same(defaultRange({ min: 4, max: 24, integer: true }, 12), 4, 24, 'both limits');
    same(defaultRange({ integer: true, min: 1 }, 1), 1, 4, 'integer');
    same(defaultRange({ integer: true, valid: 'nonneg' }, 9), 2, 36, 'integer rounds outwards');
    same(defaultRange({ integer: true }, 2), 1, 8, 'a positive integer starts at 1');
    same(defaultRange({}, 4700), 1180, 18800, 'three significant digits');
  }],

  ['sweep: the default range around zero and negative values', () => {
    const same = (r, from, to, label) => { eq(r.from, from, `${label} from`); eq(r.to, to, `${label} to`); };
    same(defaultRange({ valid: 'nonneg' }, 0), 0, 10, 'zero');
    same(defaultRange({ valid: 'any' }, 0), -10, 10, 'zero, any sign allowed');
    same(defaultRange({ valid: 'nonneg', presets: [{ value: 0 }, { value: 20 }, { value: 25 }] }, 0, 'um'), 0, 25, 'zero: up to the largest preset');
    same(defaultRange({ valid: 'nonneg', presets: [{ value: 30, unit: 'mil' }, { value: 5, unit: 'um' }] }, 0, 'um'), 0, 5, 'presets of another unit are ignored');
    same(defaultRange({ valid: 'nonneg', max: 4 }, 0), 0, 4, 'zero: clamped to max');
    same(defaultRange({ valid: 'any' }, -40), -60, -20, 'negative');
    same(defaultRange({ valid: 'any', min: -50 }, -40), -50, -20, 'negative, clamped to min');
    for (const [f, value] of [[{}, 2], [{ valid: 'any' }, -120], [{ valid: 'nonneg' }, 0], [{ valid: 'any' }, 0], [{ max: 100 }, 100]]) {
      const r = defaultRange(f, value);
      ok(r.from < r.to && value >= r.from && value <= r.to, `the value ${value} lies inside ${r.from}…${r.to}`);
      ok(accepts(f, r.from === 0 && !f.valid ? r.to : r.from) && accepts(f, r.to), `the field accepts ${r.from}…${r.to}`);
    }
  }],

  ['sweep: an invalid point is a gap in the curve, never an error', () => {
    const seen = [];
    const page = {
      compute(v) {
        seen.push({ ...v });
        if (v.a === 3) return { ok: false, errors: ['x'] };
        if (v.a === 4) throw new Error('engine failed');
        if (v.a === 5) return null;
        return { ok: true, y: v.a === 6 ? Infinity : v.a * v.b, none: null, text: '7' };
      },
    };
    const v = { a: 1, b: 10 };
    const f = { key: 'a', type: 'number' };
    const out = { key: 'y', get: (r) => r.y };
    const pts = sweep(page, v, {}, f, [1, 2, 3, 4, 5, 6, 7, -1, 0, NaN], out);
    eq(pts.map((p) => (fin(p[1]) ? p[1] : 'gap')).join(' '), '10 20 gap gap gap gap 70 gap gap gap', 'values and gaps');
    eq(pts.map((p) => String(p[0])).join(' '), '1 2 3 4 5 6 7 -1 0 NaN', 'x is kept');
    eq(v.a, 1, 'the inputs are not modified');
    ok(seen.every((x) => x.b === 10), 'only the swept value is replaced');
    eq(seen.length, 7, 'values the field does not accept never reach compute');
    // null, undefined, text and a throwing getter are gaps too (null must not become 0).
    for (const get of [(r) => r.none, (r) => r.missing, (r) => r.text, (r) => r.a.b.c]) {
      ok(Number.isNaN(sweep(page, v, {}, f, [2], { get })[0][1]), 'not a number → gap');
      ok(Number.isNaN(readOutput({ get }, { none: null, text: '7' })), 'readOutput');
    }
  }],

  ['sweep: only values the form accepts are computed', () => {
    ok(accepts({}, 1) && !accepts({}, 0) && !accepts({}, -1), 'positive by default');
    ok(accepts({ valid: 'nonneg' }, 0) && !accepts({ valid: 'nonneg' }, -0.1), 'nonneg');
    ok(accepts({ valid: 'any' }, -5), 'any');
    ok(accepts({ min: 1, max: 10 }, 1) && accepts({ min: 1, max: 10 }, 10) && !accepts({ min: 1, max: 10 }, 0.5) && !accepts({ min: 1, max: 10 }, 11), 'min / max');
    ok(accepts({ integer: true }, 3) && !accepts({ integer: true }, 3.5), 'integer');
    ok(!accepts({ valid: 'any' }, NaN) && !accepts({ valid: 'any' }, Infinity), 'finite');
  }],

  ['sweep: axis values carry the right unit in TR and EN', () => {
    inBothLanguages((lang) => {
      const c = lang === 'tr' ? ',' : '.';
      eq(formatOutput({ unit: 'Ω' }, 4700), `4${c}7 kΩ`, 'SI unit takes a prefix');
      eq(formatOutput({ unit: 'F' }, 2.5e-7), '250 nF', 'SI unit, small');
      eq(formatOutput({ unit: 'A/V' }, 0.0015), `1${c}5 mA/V`, 'A/V');
      eq(formatOutput({ unit: '°C' }, 21.5), `21${c}5 °C`, 'fixed unit');
      eq(formatOutput({ unit: '%' }, 0.5), `0${c}5 %`, 'percent');
      eq(formatOutput({ unit: 'dBm' }, -73.22), `-73${c}22 dBm`, 'negative');
      eq(formatOutput({ unit: 'mm' }, 0.0005), `0${c}0005 mm`, 'a fixed unit is never rescaled');
      eq(formatOutput({ unit: '' }, 2.083), `2${c}083`, 'no unit');
      eq(formatOutput({ unit: 'A²s', si: true }, 6383), `6${c}383 kA²s`, 'si: true');
      eq(formatOutput({ unit: 'm', si: false }, 1500), '1500 m', 'si: false');
      eq(formatOutput({ unit: () => 'mil' }, 12.5), `12${c}5 mil`, 'unit as a function');
      eq(formatInput({ si: true }, 'farad', 1e-7), '100 nF', 'SI input field');
      eq(formatInput({ si: true }, 'ohm', 4700), `4${c}7 kΩ`, 'SI input field, Ω');
      eq(formatInput({}, 'pct', 90), '90 %', 'field unit label');
      eq(formatInput({}, 'C', -40), '-40 °C', 'temperature');
      eq(formatInput({}, undefined, 3), '3', 'field without a unit');
    });
  }],

  // ---- model -------------------------------------------------------------
  ['sweep model: inputs, outputs, default range and the marker on the curve', () => {
    const sel = newPlotSel();
    const ctx = { ...fakeCtx(), sel };
    const m = plotModel(ctx);
    eq(m.inputs.map((x) => x.key).join(' '), 'a n', 'visible number fields with a value');
    eq(m.outputs.map((x) => x.key).join(' '), 'y', 'outputs the result has');
    eq(m.x, 'a', 'first input');
    eq(m.y, 'y', 'first output');
    eq(`${m.fromText} ${m.toText}`, '0.5 8', 'range texts');
    eq(m.unitText, 'V', 'unit');
    eq(m.error, undefined, 'no error');
    eq(m.points.length, SAMPLES + 1, 'samples plus the current value');
    eq(m.valid, SAMPLES + 1, 'all valid');
    eq(m.xLog || m.yLog, false, 'linear axes');
    eq(m.marker.x, 2, 'marker x');
    eq(m.marker.y, 24, 'marker y');
    eq(m.points.find((p) => p[0] === 2)[1], 24, 'the marker is a point of the curve');
    ok(m.points.every((p, i) => i === 0 || p[0] > m.points[i - 1][0]), 'ascending x');
    eq(m.min.join(' '), '0.5 9', 'smallest');
    eq(m.max.join(' '), '8 84', 'largest');
    eq(m.flat, false, 'not flat');
    // Explicit x list: order of preference, hidden fields left out.
    const listed = { ...fake, plot: { ...fake.plot, x: ['n', 'b', 'a', 'nope'] } };
    eq(plotInputs(listed, ctx.v).map((f) => f.key).join(' '), 'n a', 'x list');
    eq(plotInputs(listed, { ...ctx.v, mode: 'b' }).map((f) => f.key).join(' '), 'n b a', 'x list with b visible');
  }],

  ['sweep model: the range follows the value until it is edited; choices survive', () => {
    const sel = newPlotSel();
    const model = (over, units) => plotModel({ ...fakeCtx(over, units), sel });
    model();
    eq(`${model({ a: 3 }).fromText} ${sel.ranges.a.to}`, '0.5 8', 'a value inside the range leaves it alone');
    const far = model({ a: 100 });
    eq(`${far.fromText} ${far.toText}`, '25 400', 'an unedited range follows the value');
    setPlotChoice(sel, 'from', '1');
    setPlotChoice(sel, 'to', '1000');
    const wide = model({ a: 100 });
    eq(`${wide.from} ${wide.to}`, '1 1000', 'typed range');
    eq(wide.xLog, true, 'logarithmic x');
    eq(wide.yLog, true, 'logarithmic y: positive and more than two decades');
    near(wide.points[1][0] / wide.points[0][0], 1000 ** (1 / (SAMPLES - 1)), 1e-9, 'log spacing');
    const out = model({ a: 5000 });
    eq(`${out.fromText} ${out.toText}`, '1 1000', 'an edited range stays');
    eq(out.marker, null, 'no marker outside the range');
    eq(out.points.length, SAMPLES, 'the outside value is not sampled');
    inBothLanguages(() => ok(plotSentence(out).includes(t('plot_outside', { now: out.xFmt(5000) })), 'says the value is outside'));
    setPlotChoice(sel, 'from', '0,5');
    eq(model({ a: 100 }).from, 0.5, 'decimal comma');
    const mv = model({ a: 100 }, { a: 'mV', b: 'ohm' });
    eq(`${mv.fromText} ${mv.toText} ${mv.unitText}`, '25 400 mV', 'another unit starts a new range');

    // Another input and output: kept while they exist, falling back while they do not.
    setPlotChoice(sel, 'x', 'b');
    setPlotChoice(sel, 'y', 'z');
    const a = model();
    eq(`${a.x} ${a.y}`, 'a y', 'falls back while b / z do not exist');
    const b = model({ mode: 'b' });
    eq(`${b.x} ${b.y}`, 'b z', 'chosen input and output');
    eq(`${b.fromText} ${b.toText} ${b.si}`, '750m 12 true', 'SI input: range written with a suffix');
    eq(`${b.from} ${b.to}`, '0.75 12', 'and read back');
    eq(b.marker.y, 6, 'marker');
    setPlotChoice(sel, 'x', 'n');
    const n = model({ mode: 'b' });
    eq(n.points.map((p) => p[0]).join(' '), '1 2 3 4 5 6 7 8 9 10', 'integer input inside min…max');
    eq(n.flat, true, 'z does not depend on n');
    inBothLanguages(() => ok(plotSentence(n).startsWith(t('plot_flat', { x: n.xLabel(), y: n.yLabel(), from: '1', to: '10', min: '6 Ω' })), 'flat sentence'));
  }],

  ['sweep model: a bad range or too few points gives a message, not a chart', () => {
    const sel = newPlotSel();
    const model = () => plotModel({ ...fakeCtx(), sel });
    const withRange = (from, to) => { model(); setPlotChoice(sel, 'from', from); setPlotChoice(sel, 'to', to); return model(); };
    eq(withRange('abc', '8').error.key, 'plot_errNumber', 'not a number');
    eq(withRange('', '8').error.key, 'plot_errNumber', 'empty');
    eq(withRange('10', '5').error.key, 'plot_errOrder', 'reversed');
    eq(withRange('5', '5').error.key, 'plot_errOrder', 'empty range');
    const zero = withRange('0', '5');
    eq(zero.error.key, 'plot_errField', 'outside what the field accepts');
    inBothLanguages(() => {
      ok(zero.error.text().includes(t('fe_positive')), 'gives the form’s own reason');
      const html = plotOutHtml(zero);
      ok(html.includes('plot-empty') && !html.includes('<svg'), 'message instead of a chart');
      ok(plotControlsHtml(zero).includes('value="0"'), 'the controls keep what was typed');
    });
    sel.x = 'n';
    eq(withRange('1', '50').error.key, 'plot_errField', 'above max');
    eq(withRange('1', '10').error, undefined, 'a valid range clears the message');

    // Fewer than two valid points.
    const lonely = { ...fake, compute: (v) => (v.a === 2 ? { ok: true, y: 1 } : { ok: false }) };
    const few = plotModel({ ...fakeCtx({}, undefined, lonely), sel: newPlotSel() });
    eq(few.valid, 1, 'one valid point');
    eq(few.error.key, 'plot_few', 'too few points');
    // No output in this mode, or no input to vary.
    const none = plotModel({ ...fakeCtx({}, undefined, { ...fake, plot: { y: [{ key: 'q', label: 'plot_to', unit: 'V', get: (r) => r.z }] } }), sel: newPlotSel() });
    eq(none.error.key, 'plot_none', 'no output');
    eq(plotControlsHtml(none), '', 'no controls');
    eq(plotModel({ ...fakeCtx({}, undefined, { ...fake, plot: { ...fake.plot, x: ['b'] } }), sel: newPlotSel() }).error.key, 'plot_none', 'no input');
    inBothLanguages(() => ok(plotOutHtml(none).includes(esc(t('plot_none'))), 'message'));
  }],

  ['sweep block: closed computes nothing; open holds controls, chart and text alternative', () => {
    const ctx = { ...fakeCtx(), sel: newPlotSel() };
    calls = 0;
    const closed = plotBlock(ctx, false);
    eq(calls, 0, 'nothing is computed while the block is closed');
    ok(/^<details class="block plot"><summary>/.test(closed) && closed.includes('<div class="plot-body"></div>'), 'closed markup');
    inBothLanguages(() => {
      const open = plotBlock(ctx, true);
      ok(open.startsWith('<details class="block plot" open>') && open.includes(esc(t('plot_title'))), 'open, titled');
      for (const which of ['x', 'y', 'from', 'to']) eq(open.split(`data-plot="${which}"`).length, 2, `one ${which} control`);
      ok(/<select data-plot="x">.*<option value="a" selected>/.test(open), 'x select');
      ok(open.includes('<div class="plot-out"><figure class="plot-fig">'), 'chart area');
      ok(open.includes(`role="img" aria-label="${esc(t('plot_caption', { y: t('plot_from'), x: t('plot_from') }))}" aria-describedby="plot-note"`), 'accessible name');
      ok(open.includes(`<p class="plot-note" id="plot-note">${esc(plotSentence(plotModel(ctx)))}</p>`), 'sentence under the chart');
      // The page's text summary reads these classes from the result; the block must not add to them.
      ok(!/class="(hero|heroes|kv|msg|steps|next-steps)[ "]/.test(open), 'no result classes');
      eq(svgProblems(open).join('; '), '', 'clean');
    });
    calls = 0;
    plotBody(ctx);
    eq(calls, SAMPLES + 1, 'one compute per point');
  }],

  ['sweep block: hostile label text is escaped', () => {
    // An unknown key is shown as it is, so these reach the markup as label text.
    const evil = {
      ...fake,
      sections: [{ title: 'x', fields: [{ key: 'a', type: 'number', label: () => '<img src=x onerror=alert(1)>', default: 2, units: ['"><u>'] }] }],
      plot: { y: [{ key: 'y', label: '"><script>alert(2)</script>', unit: '<b>&', get: (r) => r.y }] },
    };
    const ctx = { page: evil, v: { a: 2, n: 0 }, units: { a: '"><u>' }, res: evil.compute({ a: 2, n: 0 }), sel: newPlotSel(), parse: parseNumber };
    setPlotChoice(ctx.sel, 'x', 'a');
    plotModel(ctx);
    setPlotChoice(ctx.sel, 'to', '9"><i>');
    inBothLanguages(() => {
      // What was typed into a range end comes back in the input's value.
      const block = plotBlock(ctx, true);
      const chart = plotOutHtml(plotModel({ ...ctx, sel: newPlotSel() }));
      for (const html of [block, chart]) {
        ok(!/<(img|script|b|u|i)[\s>]/.test(html), 'no injected element');
        ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'), 'escaped input label');
      }
      ok(block.includes('value="9&quot;&gt;&lt;i&gt;"') && block.includes('&quot;&gt;&lt;u&gt;</span>'), 'escaped range text and unit');
      ok(block.includes('&quot;&gt;&lt;script&gt;alert(2)&lt;/script&gt;</option>'), 'escaped output label');
      ok(chart.includes('<svg') && chart.includes('&lt;b&gt;&amp;</text>'), 'escaped output unit on the axis');
    });
  }],

  // ---- pages -------------------------------------------------------------
  ['sweep pages: declarations are complete and their labels resolve in TR and EN', () => {
    const problems = [];
    const byId = new Map(pages.map((p) => [p.id, p]));
    for (const id of EXPECTED) if (byId.has(id) && !byId.get(id).plot) problems.push(`${id}: no plot declaration`);
    ok(plotPages.length >= 16, `expected ≥ 16 pages with a plot, got ${plotPages.length}`);
    for (const l of ['tr', 'en']) {
      for (const k of Object.keys(plotStrings.tr)) if (!plotStrings[l][k] || !k.startsWith('plot_')) problems.push(`${l}: ${k}`);
      for (const k of Object.keys(plotStrings.en)) if (!(k in plotStrings.tr)) problems.push(`only in en: ${k}`);
    }
    for (const page of plotPages) {
      const { y, x } = page.plot;
      if (!Array.isArray(y) || y.length < 2) problems.push(`${page.id}: needs at least two outputs`);
      const keys = new Set();
      for (const o of y ?? []) {
        if (!o.key || keys.has(o.key)) problems.push(`${page.id}: output key "${o.key}" missing or repeated`);
        keys.add(o.key);
        if (typeof o.get !== 'function') problems.push(`${page.id}.${o.key}: get`);
        if (typeof (typeof o.unit === 'function' ? o.unit() : o.unit) !== 'string') problems.push(`${page.id}.${o.key}: unit`);
        for (const l of ['tr', 'en']) {
          const text = dictionaries[l][o.label];
          if (!text) problems.push(`${page.id}.${o.key}: ${l} label "${o.label}"`);
          else if (/[{}]/.test(text)) problems.push(`${page.id}.${o.key}: label "${o.label}" has a placeholder`);
        }
      }
      const numbers = new Set(fieldsOf(page).filter((f) => f.type === 'number').map((f) => f.key));
      for (const k of x ?? []) if (!numbers.has(k)) problems.push(`${page.id}: x "${k}" is not a number field`);
      if (x && new Set(x).size !== x.length) problems.push(`${page.id}: x has a repeated key`);
      for (const f of fieldsOf(page)) {
        if (f.type !== 'number' || (x && !x.includes(f.key))) continue;
        for (const l of ['tr', 'en']) {
          // A label function is checked through the model below; a plain key must exist.
          if (typeof f.label === 'string' && !dictionaries[l][f.label]) problems.push(`${page.id}.${f.key}: ${l} label "${f.label}"`);
        }
      }
    }
    report(problems);
  }],

  ['sweep pages: every input × output has a finite operating point at the defaults', () => {
    const problems = [];
    for (const page of plotPages) {
      const [{ v, units }] = variants(page);
      const res = page.compute(v, units);
      if (!res || res.ok === false) { problems.push(`${page.id}: the default result is not valid`); continue; }
      const ins = plotInputs(page, v);
      const outs = plotOutputs(page, res, v, units);
      if (ins.length < 2) problems.push(`${page.id}: ${ins.length} input(s) to vary`);
      if (outs.length < 2) problems.push(`${page.id}: ${outs.length} output(s) at the defaults`);
      for (const o of outs) {
        const now = readOutput(o, res, v, units);
        for (const f of ins) {
          const [[, y]] = sweep(page, v, units, f, [v[f.key]], o);
          if (!fin(y)) problems.push(`${page.id} ${o.key}/${f.key}: no value at the operating point`);
          else if (Math.abs(y - now) > 1e-9 * Math.abs(now)) problems.push(`${page.id} ${o.key}/${f.key}: ${y} at the operating point, result has ${now}`);
          const r = defaultRange(f, v[f.key], units[f.key]);
          if (!(r.from < r.to && accepts({ ...f, integer: false }, r.from) && accepts({ ...f, integer: false }, r.to))) problems.push(`${page.id} ${f.key}: default range ${r.from}…${r.to}`);
        }
      }
    }
    report(problems);
  }],

  ['sweep pages: the default range gives a curve for every output, in every mode', () => {
    const { models, problems, dead } = sweeps();
    const out = [...problems, ...dead];
    ok(models.length > 400, `expected > 400 sweeps, got ${models.length}`);
    const best = new Map(); // page + output → most valid points over the inputs (defaults)
    for (const { id, where, isDefault, f, o, ctx, m } of models) {
      if (m.x !== f.key || m.y !== o.key) out.push(`${where}: model chose ${m.y}/${m.x}`);
      if (m.error && m.error.key !== 'plot_few') out.push(`${where}: ${m.error.key}`);
      if (!m.error) {
        if (!m.marker) out.push(`${where}: the current value is outside its default range`);
        else if (m.points.find((p) => p[0] === m.marker.x)?.[1] !== m.marker.y) out.push(`${where}: the marker is not on the curve`);
        if (m.points.length < 2 || m.points.length > SAMPLES + 1) out.push(`${where}: ${m.points.length} points`);
        if (ctx.v[f.key] !== m.now) out.push(`${where}: now`);
      }
      if (isDefault) best.set(`${id} ${o.key}`, Math.max(best.get(`${id} ${o.key}`) ?? 0, m.valid ?? 0));
    }
    for (const [key, n] of best) if (n < 20) out.push(`${key}: at most ${n} valid points over all inputs`);
    for (const page of plotPages) if (![...best.keys()].some((k) => k.startsWith(`${page.id} `))) out.push(`${page.id}: no sweep at the defaults`);
    report(out);
  }],

  ['sweep pages: charts are clean SVG in TR and EN', () => {
    // The checker itself: a decimal comma in a path or an attribute is caught.
    ok(svgProblems('<svg viewBox="0 0 10 10"><path class="series" d="M12,5,30L3,4"/></svg>').length > 0, 'comma in a path');
    ok(svgProblems('<svg viewBox="0 0 10 10"><circle cx="1,5" cy="2" r="3"/></svg>').length > 0, 'comma in an attribute');
    ok(svgProblems('<svg viewBox="0 0 10 10"><line x1="NaN" x2="1" y1="2" y2="3"/></svg>').length > 0, 'NaN');
    eq(svgProblems('<svg viewBox="0 0 10 10"><path d="M1,2.5L3,-4"/><text x="1" y="2.5">0,5 mm</text></svg>').join('; '), '', 'clean markup passes, commas in text are fine');
    const { models } = sweeps();
    const problems = [];
    const counts = new Map();
    let drawn = 0;
    inBothLanguages((lang) => {
      for (const { where, m } of models) {
        let html;
        try { html = plotControlsHtml(m) + plotOutHtml(m); } catch (e) { problems.push(`${lang}:${where} threw ${e.message}`); continue; }
        for (const b of svgProblems(html)) problems.push(`${lang}:${where}: ${b}`);
        const text = html.replace(/<[^>]*>/g, ' ');
        if (/plot_\w+|\{\w+\}/.test(text)) problems.push(`${lang}:${where}: raw key or placeholder in "${text.match(/\S*(?:plot_\w+|\{\w+\})\S*/)[0]}"`);
        if (m.error) { if (html.includes('<svg')) problems.push(`${lang}:${where}: chart drawn with ${m.error.key}`); continue; }
        drawn++;
        if (!html.includes('<path class="series"') && !html.includes('class="dot"')) problems.push(`${lang}:${where}: no curve`);
        if (!html.includes('class="marker"')) problems.push(`${lang}:${where}: no marker`);
        if ((html.match(/<text /g) ?? []).length < 5) problems.push(`${lang}:${where}: fewer than four tick labels`);
        if (!html.includes(esc(m.xLabel())) || !html.includes(esc(m.yLabel()))) problems.push(`${lang}:${where}: labels missing`);
        const n = geometryNumbers(html);
        if (counts.has(where) && counts.get(where) !== n) problems.push(`${where}: geometry differs between TR and EN`);
        counts.set(where, n);
      }
    });
    ok(drawn > 800, `expected > 800 charts, drew ${drawn}`);
    report(problems);
  }],

  ['sweep pages: a wide range typed by the reader draws on logarithmic axes', () => {
    const problems = [];
    let logX = 0;
    for (const page of plotPages) {
      const [{ v, units }] = variants(page);
      const ctx = { page, v, units, res: page.compute(v, units), parse: parseNumber };
      const f = plotInputs(page, v).find((x) => v[x.key] > 0 && !x.integer && x.max === undefined && x.min === undefined);
      if (!f) continue;
      const sel = newPlotSel();
      sel.x = f.key;
      plotModel({ ...ctx, sel });
      setPlotChoice(sel, 'from', String(v[f.key] / 100));
      setPlotChoice(sel, 'to', String(v[f.key] * 100));
      const m = plotModel({ ...ctx, sel });
      if (!m.xLog) problems.push(`${page.id}/${f.key}: not logarithmic`);
      if (m.error) continue; // too few valid points that far out is fine
      logX++;
      inBothLanguages((lang) => { for (const b of svgProblems(plotOutHtml(m))) problems.push(`${lang}:${page.id}/${f.key}: ${b}`); });
    }
    ok(logX >= 12, `expected ≥ 12 pages with a logarithmic sweep, got ${logX}`);
    report(problems);
  }],

  // ---- line chart ----------------------------------------------------------
  ['lineChart: linear axes, tick labels, marker and reference line', () => {
    const series = [[0, 1], [1, 2], [2, 4], [3, 8], [4, 16]];
    const svg = lineChart({ series, xFmt: (n) => `${String(n).replace('.', ',')} V`, yFmt: (n) => `${n} A`, marker: { x: 2, y: 4, label: '2 V → 4 A' }, hline: 10, label: 'Akım – Gerilim', describedBy: 'note' });
    eq(svgProblems(svg).join('; '), '', 'clean');
    ok(svg.includes('class="chart line-chart"') && svg.includes('role="img" aria-label="Akım – Gerilim" aria-describedby="note"'), 'root');
    const [pts] = subPaths(svg);
    eq(subPaths(svg).length, 1, 'one line');
    eq(pts.length, 5, 'five points');
    near(pts[1][0] - pts[0][0], pts[4][0] - pts[3][0], 0.02, 'x is linear');
    ok(pts[3][1] - pts[4][1] > 7.5 * (pts[0][1] - pts[1][1]), 'y is linear (8 against 1)');
    ok(pts.every((p, i) => i === 0 || (p[0] > pts[i - 1][0] && p[1] < pts[i - 1][1])), 'rises to the right');
    const mk = svg.match(/class="marker" cx="([\d.]+)" cy="([\d.]+)"/);
    eq(`${mk[1]},${mk[2]}`, pts[2].join(','), 'marker on the third point');
    ok(svg.includes('>2 V → 4 A</text>'), 'marker label');
    ok((svg.match(/class="guide"/g) ?? []).length === 2, 'guides to both axes');
    ok(svg.includes('class="target"'), 'reference line');
    ok(svg.includes('>0 V</text>') && svg.includes('>4 V</text>') && svg.includes('>10 A</text>'), 'tick labels from the formatters');
    ok((svg.match(/<text /g) ?? []).length >= 7, 'a few ticks on each axis');
    // A decimal comma in a label never reaches the geometry.
    eq(svgProblems(lineChart({ series: [[0.25, 0.5], [0.75, 1.5]], xFmt: (n) => String(n).replace('.', ','), yFmt: (n) => String(n).replace('.', ','), label: 'x' })).join('; '), '', 'comma labels');
    // Marker outside the x range, or not finite: left out.
    ok(!lineChart({ series, marker: { x: 9, y: 4 }, label: 'x' }).includes('class="marker"'), 'marker outside');
    ok(!lineChart({ series, marker: { x: 2, y: NaN }, label: 'x' }).includes('class="marker"'), 'marker without a value');
    ok(!lineChart({ series, label: 'x' }).includes('class="target"'), 'no reference line unless asked');
  }],

  ['lineChart: logarithmic axes', () => {
    const series = [[1, 1], [10, 100], [100, 10000], [1000, 1000000]];
    const svg = lineChart({ series, xLog: true, yLog: true, xFmt: (n) => `${n} Hz`, yFmt: (n) => `${n} Ω`, label: 'log' });
    eq(svgProblems(svg).join('; '), '', 'clean');
    const [pts] = subPaths(svg);
    near(pts[1][0] - pts[0][0], pts[3][0] - pts[2][0], 0.02, 'decades are equally wide');
    near(pts[0][1] - pts[1][1], pts[2][1] - pts[3][1], 0.02, 'and equally high');
    ok(svg.includes('>1 Hz</text>') && svg.includes('>1000 Hz</text>') && svg.includes('>100 Ω</text>'), 'decade ticks');
    // Only x logarithmic.
    const semi = subPaths(lineChart({ series: [[1, 0], [10, 5], [100, 10]], xLog: true, label: 'semi' }))[0];
    near(semi[1][0] - semi[0][0], semi[2][0] - semi[1][0], 0.02, 'semi-log x');
    near(semi[0][1] - semi[1][1], semi[1][1] - semi[2][1], 0.02, 'linear y');
    // A logarithmic y axis needs positive values: otherwise it is drawn linear.
    const mixed = lineChart({ series: [[1, -5], [2, 0], [3, 5]], yLog: true, label: 'mixed' });
    eq(svgProblems(mixed).join('; '), '', 'non-positive y');
    eq(subPaths(mixed)[0].length, 3, 'all three points drawn');
    // Points a logarithmic x axis cannot show are left out.
    eq(subPaths(lineChart({ series: [[-1, 1], [0, 2], [1, 3], [10, 4]], xLog: true, label: 'x' }))[0].length, 2, 'x ≤ 0 left out');
    // A short logarithmic span still gets ticks.
    ok((lineChart({ series: [[3, 1], [4, 2]], xLog: true, label: 'x' }).match(/<text /g) ?? []).length >= 4, 'ticks on a short span');
  }],

  ['lineChart: a gap, a single point, a flat line and nothing to draw', () => {
    const gap = lineChart({ series: [[0, 1], [1, 2], [2, NaN], [3, 3], [4, 4], [5, Infinity], [6, 5], [7, null], [8, 6], [9, 7]], label: 'gap' });
    eq(svgProblems(gap).join('; '), '', 'clean');
    eq(subPaths(gap).map((s) => s.length).join(' '), '2 2 2', 'three pieces');
    eq((gap.match(/class="dot"/g) ?? []).length, 1, 'a point between two gaps is drawn as a dot');
    const one = lineChart({ series: [[5, 7]], xFmt: String, yFmt: String, label: 'one' });
    eq(svgProblems(one).join('; '), '', 'single point');
    ok(one.includes('class="dot"') && !one.includes('class="series"'), 'single point is a dot');
    eq(svgProblems(lineChart({ series: [[5, 0]], label: 'zero' })).join('; '), '', 'single point at zero');
    eq(svgProblems(lineChart({ series: [[5, 7]], xLog: true, yLog: true, label: 'one, log' })).join('; '), '', 'single point, log axes');
    const flat = lineChart({ series: [[0, 3], [1, 3], [2, 3 + 1e-15]], label: 'flat' });
    eq(svgProblems(flat).join('; '), '', 'flat line');
    const [fl] = subPaths(flat);
    ok(Math.abs(fl[0][1] - fl[2][1]) < 0.11 && fl[0][1] > 60 && fl[0][1] < 200, 'a flat line runs through the middle');
    eq(svgProblems(lineChart({ series: [[1e20, 1], [1e20 + 1e5, 2]], label: 'huge' })).join('; '), '', 'x values with no room between them');
    eq(lineChart({ series: [], label: 'empty' }), '', 'no points');
    eq(lineChart({ series: [[1, NaN], [2, NaN]], label: 'nan' }), '', 'no valid point');
    // An x range wider than the data, and data outside the range.
    const ranged = lineChart({ series: [[-5, 1], [0, 1], [5, 2], [10, 3], [50, 9]], xRange: [0, 20], label: 'range' });
    eq(subPaths(ranged)[0].length, 3, 'points outside the range are cut');
    eq(svgProblems(ranged).join('; '), '', 'ranged');
  }],

  ['lineChart: hostile label text is escaped', () => {
    const svg = lineChart({
      series: [[0, 1], [1, 2]],
      xFmt: (n) => `${n}<b>&"x"`,
      yFmt: (n) => `${n}</text><script>alert(1)</script>`,
      marker: { x: 1, y: 2, label: '<img src=x onerror=alert(2)>' },
      label: '"><script>alert(3)</script>',
      describedBy: '" onload="alert(4)',
    });
    ok(!/<(script|img|b)[\s>]/.test(svg), 'no injected element');
    ok(!/\sonload="alert/.test(svg), 'no injected attribute');
    ok(svg.includes('&lt;img src=x onerror=alert(2)&gt;') && svg.includes('aria-label="&quot;&gt;&lt;script&gt;'), 'escaped');
    eq(svgProblems(svg.replace(/aria-(label|describedby)="[^"]*"/g, '')).join('; '), '', 'geometry untouched');
  }],

  ['logLogChart: the PDN impedance chart is unchanged', () => {
    const page = pages.find((p) => p.id === 'pdn');
    ok(page, 'pdn page loaded');
    const [{ v, units }] = variants(page);
    const r = page.compute(v, units);
    ok(r.sweep?.points?.length > 20 && r.zTarget > 0, 'pdn sweep');
    inBothLanguages((lang) => {
      const o = { series: r.sweep.points, hline: r.zTarget, xUnit: 'Hz', yUnit: 'Ω', label: t('pd_chart') };
      const svg = logLogChart(o);
      eq(svg, legacyLogLogChart(o), `${lang}: same markup as before`);
      ok(page.render(r, v, units).includes(svg), `${lang}: the page shows this chart`);
      ok(svg.includes('class="chart"') && !svg.includes('line-chart'), 'its own class');
      // With a second series and without a reference line, too.
      const two = { series: [[10, 1], [1000, 0.01], [100000, 5]], series2: [[10, 2], [1000, 0.5], [100000, 1]], xUnit: 'Hz', yUnit: 'Ω', label: 'x' };
      eq(logLogChart(two), legacyLogLogChart(two), `${lang}: two series`);
    });
  }],
];
