// Cable voltage drop (src/engine/cable.js, src/pages/cable.js).
// Expected values are worked out by hand in the comments.

import { near, eq, ok } from '../assert.js';
import {
  cable, resistivity, nextMetric, nextAwg,
  MATERIALS, METRIC_MM2, AWG_SIZES, DENSITY_FLAG, T_MIN, T_MAX, SOLVES, CIRCUITS, SIZE_BY,
} from '../../src/engine/cable.js';
import { RHO_20, ALPHA } from '../../src/engine/copper.js';
import { awgWire, awgName, RHO_CU_20 } from '../../src/engine/convert.js';
import { registerStrings, setLang, getLang } from '../../src/i18n.js';
import { stepsTrace, parseNumber } from '../../src/ui/calculator.js';
import { evaluate, agrees } from './arith.js';
import page from '../../src/pages/cable.js';

registerStrings(page.strings);

// The hand check of the brief: copper at 20 °C, 2 × 5 m, 1.5 mm², 10 A from 24 V, 3 % allowed.
const base = { solve: 'drop', currentA: 10, supplyV: 24, lengthM: 5, circuit: 'loop', by: 'area', areaMm2: 1.5, parallel: 1, material: 'cu', tempC: 20, allowedPct: 3 };
const calc = (o = {}) => cable({ ...base, ...o });
const size = (o = {}) => cable({ ...base, solve: 'size', ...o });

/** True when no number anywhere in the result is NaN or infinite. */
function finiteAll(x) {
  if (typeof x === 'number') return Number.isFinite(x);
  if (x && typeof x === 'object') return Object.values(x).every(finiteAll);
  return true;
}

// ---- Page helpers: field values as the form would hold them ----
const fields = page.sections.flatMap((s) => s.fields);
function inputs(set = {}) {
  const v = {};
  const u = {};
  for (const f of fields) {
    const val = set[f.key] ?? f.default;
    const raw = val === undefined || val === null ? '' : String(val);
    v[f.key] = f.type === 'number' ? parseNumber(raw, f.si) : raw;
    if (f.type === 'number') u[f.key] = set[`${f.key}_u`] ?? f.unit ?? f.units?.[0];
  }
  return { v, u };
}
/** Render one set of inputs: result, HTML, the recorded steps and the diagram. */
function show(set) {
  const { v, u } = inputs(set);
  const r = page.compute(v, u);
  const seen = [];
  stepsTrace.record = (items) => seen.push(...items);
  let html;
  try { html = page.render(r, v, u); } finally { stepsTrace.record = null; }
  return { r, html, steps: seen, svg: page.diagram(v, u, r.ok === false ? undefined : r) };
}
function inBothLanguages(fn) {
  const before = getLang();
  try {
    for (const l of ['tr', 'en']) { setLang(l); fn(l); }
  } finally {
    setLang(before);
  }
}
/** Problems of a diagram: a missing number, a comma in geometry, a shape of negative size or outside the drawing. */
function svgProblems(svgText) {
  const bad = [];
  if (/NaN|undefined|Infinity/.test(svgText)) bad.push('NaN/undefined/Infinity');
  const [, , , W, H] = svgText.match(/viewBox="(\S+) (\S+) (\S+) (\S+)"/).map(Number);
  for (const [, tag, attrs] of svgText.matchAll(/<(rect|text)\b([^>]*)>/g)) {
    const a = Object.fromEntries([...attrs.matchAll(/\s(x|y|width|height)="([^"]*)"/g)].map(([, k, val]) => [k, val]));
    for (const [k, val] of Object.entries(a)) if (!/^-?\d+(\.\d+)?$/.test(val)) bad.push(`${tag} ${k}="${val}"`);
    if (tag === 'text' && !(Number(a.x) >= 0 && Number(a.x) <= W && Number(a.y) >= 0 && Number(a.y) <= H)) bad.push(`text at ${a.x},${a.y}`);
  }
  for (const [, val] of svgText.matchAll(/\s(?:d|points)="([^"]*)"/g)) {
    if (/\d,\d+,\d/.test(val.replace(/[A-Za-z]/g, ' '))) bad.push(`comma in ${val.slice(0, 40)}`);
  }
  return bad;
}
const geometryCount = (svgText) => [...svgText.matchAll(/\s(?:d|points|transform|x|y|cx|cy|r|width|height)="([^"]*)"/g)]
  .reduce((n, [, val]) => n + (val.match(/-?(\d+\.?\d*|\.\d+)/g) ?? []).length, 0);

export const cases = [
  ['cable: the hand check — copper, 20 °C, 2 × 5 m, 1.5 mm², 10 A from 24 V', () => {
    const r = calc();
    eq(r.ok, true);
    // Path 2 · 5 m = 10 m; R = 1.724e-8 · 10 / 1.5e-6 = 0.114933 Ω
    eq(r.pathFactor, 2);
    eq(r.pathM, 10);
    near(r.rhoT, 1.724e-8, 1e-12);
    near(r.wire.resistanceOhm, 0.114933, 1e-5);
    // ΔV = 10 A · 0.114933 Ω = 1.14933 V = 4.789 % of 24 V; at the load 24 − 1.14933 = 22.8507 V
    near(r.wire.dropV, 1.149333, 1e-6);
    near(r.wire.dropFrac, 0.047889, 1e-5);
    near(r.wire.loadV, 22.850667, 1e-6);
    // P = 10² · 0.114933 = 11.4933 W; delivered 22.8507 V · 10 A = 228.507 W → loss 5.030 % of it
    near(r.wire.lossW, 11.49333, 1e-6);
    near(r.wire.loadW, 228.50667, 1e-6);
    near(r.wire.lossFrac, 0.050298, 1e-4);
    // J = 10 A / 1.5 mm² = 6.667 A/mm²
    near(r.wire.densityAmm2, 6.666667, 1e-6);
    eq(r.wire.areaMm2, 1.5);
    eq(r.wire.by, 'area');
    eq(r.wire.awg, null);
    // 4.79 % is above the 3 % allowed (0.72 V).
    near(r.allowedV, 0.72, 1e-12);
    eq(r.wire.withinBudget, false);
    eq(r.warnings.join(), 'cab_over');
    eq(SOLVES.join(), 'drop,size');
    eq(CIRCUITS.join(), 'loop,single');
    eq(SIZE_BY.join(), 'area,awg');
  }],

  ['cable: one conductor only is half the path; the drop is proportional to length and current', () => {
    // 5 m of one conductor: R = 1.724e-8 · 5 / 1.5e-6 = 0.0574667 Ω → 0.574667 V
    const one = calc({ circuit: 'single' });
    eq(one.pathFactor, 1);
    eq(one.pathM, 5);
    near(one.wire.resistanceOhm, 0.0574667, 1e-5);
    near(one.wire.dropV, 0.574667, 1e-5);
    near(one.wire.dropV, calc().wire.dropV / 2, 1e-12);
    // Twice the length or twice the current: twice the drop; twice the current is four times the loss.
    near(calc({ lengthM: 10 }).wire.dropV, 2 * calc().wire.dropV, 1e-12);
    near(calc({ currentA: 20 }).wire.dropV, 2 * calc().wire.dropV, 1e-12);
    near(calc({ currentA: 20 }).wire.lossW, 4 * calc().wire.lossW, 1e-12);
    // Twice the cross-section: half the drop. The supply voltage does not change the drop in volts.
    near(calc({ areaMm2: 3 }).wire.dropV, calc().wire.dropV / 2, 1e-12);
    near(calc({ supplyV: 48 }).wire.dropV, calc().wire.dropV, 1e-12);
    near(calc({ supplyV: 48 }).wire.dropFrac, calc().wire.dropFrac / 2, 1e-12);
    // The default circuit is out and back.
    const { circuit, ...rest } = base;
    eq(cable(rest).circuit, 'loop');
    ok(circuit === 'loop');
  }],

  ['cable: AWG sizes follow the definition d = 0.127 mm · 92^((36 − g)/39)', () => {
    // AWG 18: d = 0.127 · 92^(18/39) = 1.0237 mm, A = π·d²/4 = 0.8230 mm²
    const r = calc({ by: 'awg', awg: 18 });
    near(r.wire.diameterMm, 1.0237, 1e-4);
    near(r.wire.areaMm2, 0.8230, 2e-4);
    eq(r.wire.awg, 18);
    eq(r.wire.name, '18');
    eq(r.wire.by, 'awg');
    // R = 1.724e-8 · 10 / 0.82303e-6 = 0.20947 Ω → 2.0947 V
    near(r.wire.resistanceOhm, 0.20947, 1e-4);
    near(r.wire.dropV, 2.0947, 1e-4);
    // The app's own AWG function is used (engine/convert.js).
    eq(r.wire.areaMm2, awgWire(18).areaMm2);
    // AWG 36 = 0.127 mm, 4/0 (−3) = 0.127 · 92 = 11.684 mm (107.22 mm²), AWG 10 = 2.588 mm (5.261 mm²), AWG 24 = 0.5106 mm (0.2047 mm²)
    near(calc({ by: 'awg', awg: 36 }).wire.diameterMm, 0.127, 1e-12);
    near(calc({ by: 'awg', awg: -3 }).wire.diameterMm, 11.684, 1e-9);
    near(calc({ by: 'awg', awg: -3 }).wire.areaMm2, 107.22, 1e-4);
    eq(calc({ by: 'awg', awg: -3 }).wire.name, '4/0');
    near(calc({ by: 'awg', awg: 10 }).wire.diameterMm, 2.5882, 1e-4);
    near(calc({ by: 'awg', awg: 10 }).wire.areaMm2, 5.2612, 1e-4);
    near(calc({ by: 'awg', awg: 24 }).wire.areaMm2, 0.20473, 1e-4);
    // Three sizes thicker is twice the cross-section, to within 0.6 %.
    near(awgWire(15).areaMm2 / awgWire(18).areaMm2, 2, 6e-3);
    // The sizes offered: 30 … 2 (even), 1, 1/0 … 4/0, thinnest first.
    eq(AWG_SIZES.join(), '30,28,26,24,22,20,18,16,14,12,10,8,6,4,2,1,0,-1,-2,-3');
    ok(AWG_SIZES.every((g, i) => i === 0 || awgWire(g).areaMm2 > awgWire(AWG_SIZES[i - 1]).areaMm2), 'ascending cross-section');
    eq(AWG_SIZES.map(awgName).slice(-5).join(), '1,1/0,2/0,3/0,4/0');
    // The cross-section entered is not looked at when the size is given as AWG, and the other way round.
    eq(calc({ by: 'awg', awg: 18, areaMm2: -1 }).ok, true);
    eq(calc({ by: 'area', awg: 999 }).ok, true);
  }],

  ['cable: parallel conductors share the current', () => {
    // Two conductors of 1.5 mm² per pole: 3 mm² → R = 0.0574667 Ω, J = 10 / 3 = 3.333 A/mm²
    const two = calc({ parallel: 2 });
    near(two.wire.totalAreaMm2, 3, 1e-12);
    near(two.wire.resistanceOhm, 0.0574667, 1e-5);
    near(two.wire.densityAmm2, 3.333333, 1e-6);
    eq(two.wire.areaMm2, 1.5, 'the size of one conductor');
    // The smallest cross-section per conductor halves: 2.39444 / 2 = 1.19722 mm² → 1.5 mm² each.
    near(two.minAreaMm2, 1.197222, 1e-6);
    near(two.minTotalAreaMm2, 2.394444, 1e-6);
    eq(two.metric.areaMm2, 1.5);
    near(two.metric.dropV, two.wire.dropV, 1e-12);
    eq(calc({ parallel: undefined }).parallel, 1);
  }],

  ['cable: the resistance follows the conductor temperature', () => {
    // The constants are the ones the app already uses for copper.
    eq(MATERIALS.cu.rho20, RHO_20);
    eq(MATERIALS.cu.rho20, RHO_CU_20);
    eq(MATERIALS.cu.rho20, 1.724e-8);
    eq(MATERIALS.cu.alpha, ALPHA);
    eq(MATERIALS.cu.alpha, 0.00393);
    near(resistivity('cu', 20), 1.724e-8, 1e-12);
    near(resistivity('cu'), 1.724e-8, 1e-12);
    // 60 °C: 1 + 0.00393 · 40 = 1.1572 → ρ = 1.99501e-8 Ω·m, R = 0.114933 · 1.1572 = 0.133001 Ω, ΔV = 1.33001 V
    const hot = calc({ tempC: 60 });
    near(hot.rhoT, 1.995013e-8, 1e-6);
    near(hot.wire.resistanceOhm, 0.133001, 1e-5);
    near(hot.wire.dropV, 1.330008, 1e-5);
    // −40 °C: 1 − 0.00393 · 60 = 0.7642
    near(calc({ tempC: -40 }).wire.resistanceOhm / calc().wire.resistanceOhm, 0.7642, 1e-9);
    // 90 °C: 1 + 0.00393 · 70 = 1.2751 → the sizing needs 27.5 % more copper: 2.39444 · 1.2751 = 3.0532 mm² → 4 mm²
    near(size({ tempC: 90 }).minAreaMm2, 3.053156, 1e-5);
    eq(size({ tempC: 90 }).metric.areaMm2, 4);
    eq(calc({ tempC: undefined }).tempC, 20, 'default 20 °C');
    eq(`${T_MIN}/${T_MAX}`, '-100/300');
    eq(calc({ tempC: T_MIN }).ok, true);
    eq(calc({ tempC: T_MAX }).ok, true);
  }],

  ['cable: aluminium', () => {
    eq(MATERIALS.al.rho20, 2.82e-8);
    eq(MATERIALS.al.alpha, 0.0039);
    eq(Object.keys(MATERIALS).join(), 'cu,al');
    // R = 2.82e-8 · 10 / 1.5e-6 = 0.188 Ω → 1.88 V; 2.82 / 1.724 = 1.6357 times copper
    const al = calc({ material: 'al' });
    near(al.wire.resistanceOhm, 0.188, 1e-9);
    near(al.wire.dropV, 1.88, 1e-9);
    near(al.wire.dropV / calc().wire.dropV, 1.635731, 1e-6);
    eq(al.rho20, 2.82e-8);
    eq(al.alpha, 0.0039);
    // 60 °C: 2.82e-8 · (1 + 0.0039 · 40) = 2.82e-8 · 1.156 = 3.25992e-8 Ω·m
    near(calc({ material: 'al', tempC: 60 }).rhoT, 3.25992e-8, 1e-9);
    // 48 V, 40 A, 2 × 20 m, 25 mm² at 60 °C: R = 3.25992e-8 · 40 / 25e-6 = 0.0521587 Ω → 2.08635 V = 4.347 %
    const feed = calc({ material: 'al', tempC: 60, supplyV: 48, currentA: 40, lengthM: 20, areaMm2: 25, allowedPct: 5 });
    near(feed.wire.dropV, 2.086349, 1e-6);
    near(feed.wire.dropFrac, 0.043466, 1e-4);
    eq(feed.wire.withinBudget, true);
    eq(feed.warnings.length, 0);
  }],

  ['cable: sizing — the smallest cross-section and the next standard sizes', () => {
    // 3 % of 24 V = 0.72 V → A_min = 1.724e-8 · 10 · 10 / 0.72 = 2.39444e-6 m² = 2.394 mm² → 2.5 mm²
    const r = size();
    eq(r.solve, 'size');
    near(r.allowedV, 0.72, 1e-12);
    near(r.minAreaMm2, 2.394444, 1e-6);
    eq(r.metric.areaMm2, 2.5);
    // With 2.5 mm²: R = 1.724e-8 · 10 / 2.5e-6 = 0.06896 Ω → 0.6896 V = 2.873 %, 6.896 W, 4 A/mm²
    near(r.metric.resistanceOhm, 0.06896, 1e-9);
    near(r.metric.dropV, 0.6896, 1e-9);
    near(r.metric.dropFrac, 0.028733, 1e-4);
    near(r.metric.lossW, 6.896, 1e-9);
    near(r.metric.densityAmm2, 4, 1e-12);
    eq(r.metric.withinBudget, true);
    // The next AWG size at or above 2.394 mm²: AWG 14 is 2.081 mm² (too small), AWG 12 is 3.309 mm² → 0.5210 V = 2.171 %
    ok(awgWire(14).areaMm2 < r.minAreaMm2 && awgWire(12).areaMm2 > r.minAreaMm2, 'AWG 14 < A_min < AWG 12');
    eq(r.gauge.awg, 12);
    eq(r.gauge.name, '12');
    near(r.gauge.areaMm2, 3.3088, 1e-4);
    near(r.gauge.dropV, 0.52104, 1e-4);
    near(r.gauge.dropFrac, 0.02171, 1e-3);
    // The headline values are those of the standard metric size; nothing to warn about.
    eq(r.wire, r.metric);
    eq(r.warnings.length, 0);
    // The conductor fields are not looked at when sizing.
    eq(size({ areaMm2: -1, awg: 999, by: 'x' }).ok, true);
    // A conductor of exactly A_min sits on the limit, and passes.
    const on = calc({ areaMm2: r.minAreaMm2 });
    near(on.wire.dropV, 0.72, 1e-12);
    eq(on.wire.withinBudget, true);
    // The same sizing is reported next to a given conductor.
    near(calc().minAreaMm2, r.minAreaMm2, 1e-12);
    eq(calc().metric.areaMm2, 2.5);
    eq(calc().gauge.awg, 12);
    // One conductor only: half the path, half the copper: 1.19722 mm² → 1.5 mm², AWG 16 (1.309 mm²).
    const one = size({ circuit: 'single' });
    near(one.minAreaMm2, 1.197222, 1e-6);
    eq(one.metric.areaMm2, 1.5);
    eq(one.gauge.awg, 16);
  }],

  ['cable: standard sizes — the lists, their ends and rounding noise', () => {
    eq(METRIC_MM2.join(), '0.05,0.08,0.14,0.25,0.34,0.5,0.75,1,1.5,2.5,4,6,10,16,25,35,50,70,95,120');
    eq(nextMetric(2.394), 2.5);
    eq(nextMetric(2.5), 2.5, 'a size equal to the requirement is enough');
    eq(nextMetric(2.5 + 1e-12), 2.5, 'rounding noise does not skip a size');
    eq(nextMetric(2.51), 4);
    eq(nextMetric(1e-6), 0.05);
    eq(nextMetric(120), 120);
    eq(nextMetric(120.5), null);
    eq(nextAwg(1e-6), 30);
    eq(nextAwg(0.82), 18);
    eq(nextAwg(awgWire(18).areaMm2), 18);
    eq(nextAwg(0.83), 16);
    eq(nextAwg(50), 0, '1/0 is 53.5 mm²');
    eq(nextAwg(107), -3);
    eq(nextAwg(108), null);
    // Above the lists: 1000 A over 2 × 100 m at 1 % of 12 V → A_min = 1.724e-8 · 200 · 1000 / 0.12 = 28 733 mm²
    const huge = size({ currentA: 1000, lengthM: 100, supplyV: 12, allowedPct: 1 });
    eq(huge.ok, true);
    near(huge.minAreaMm2, 28733.33, 1e-6);
    eq(huge.metric, null);
    eq(huge.gauge, null);
    eq(huge.wire, null);
    eq(huge.warnings.join(), 'cab_noStd');
    // Between 4/0 (107.2 mm²) and 120 mm²: a metric size, no AWG size.
    const big = size({ currentA: 460 });
    near(big.minAreaMm2, 110.1444, 1e-6);
    eq(big.metric.areaMm2, 120);
    eq(big.gauge, null);
    // With a given conductor a requirement above the lists is no warning of its own.
    ok(!calc({ currentA: 1000, lengthM: 100, supplyV: 12, allowedPct: 1 }).warnings.includes('cab_noStd'), 'drop mode');
  }],

  ['cable: verdict against the allowed drop, and a drop above the supply voltage', () => {
    // 4.79 %: above 3 %, within 5 %.
    eq(calc({ allowedPct: 5 }).wire.withinBudget, true);
    eq(calc({ allowedPct: 5 }).warnings.length, 0);
    eq(calc({ allowedPct: 4.78 }).wire.withinBudget, false);
    eq(calc({ allowedPct: 4.79 }).wire.withinBudget, true);
    eq(calc({ allowedPct: 100 }).wire.withinBudget, true);
    // 300 A in the same cable: ΔV = 300 · 0.114933 = 34.48 V > 24 V. The model no longer applies:
    // no voltage at the load, no "loss in percent of the delivered power".
    const over = calc({ currentA: 300 });
    near(over.wire.dropV, 34.48, 1e-9);
    eq(over.wire.aboveSupply, true);
    eq(over.wire.loadW, null);
    eq(over.wire.lossFrac, null);
    ok(over.warnings.includes('cab_aboveSupply') && !over.warnings.includes('cab_over'), 'one message, not two');
    // Exactly the supply voltage is the same case: nothing is left for the load.
    const all = calc({ areaMm2: 1.724e-8 * 10 * 10 / 24 * 1e6 });
    near(all.wire.dropV, 24, 1e-12);
    eq(all.wire.aboveSupply || all.wire.loadV < 1e-9, true);
  }],

  ['cable: current density is given, with a rough flag above 10 A/mm²', () => {
    eq(DENSITY_FLAG, 10);
    // 15 A in 1.5 mm² is exactly 10 A/mm²: not flagged; 15.1 A is.
    near(calc({ currentA: 15 }).wire.densityAmm2, 10, 1e-12);
    ok(!calc({ currentA: 15, allowedPct: 100 }).warnings.includes('cab_density'), '10 A/mm²');
    eq(calc({ currentA: 15.1, allowedPct: 100 }).warnings.join(), 'cab_density');
    // Two conductors in parallel halve it.
    ok(!calc({ currentA: 25, parallel: 2, allowedPct: 100 }).warnings.includes('cab_density'), '8.3 A/mm²');
    // Sizing a short cable for a large current: 100 A over 2 × 0.1 m at 3 % of 24 V → A_min = 0.479 mm² → 0.5 mm² at 200 A/mm².
    const short = size({ currentA: 100, lengthM: 0.1 });
    near(short.minAreaMm2, 0.478889, 1e-5);
    eq(short.metric.areaMm2, 0.5);
    near(short.wire.densityAmm2, 200, 1e-12);
    eq(short.warnings.join(), 'cab_density', 'the drop is fine, the density is flagged');
    // There is no ampacity in the result: no rating, no pass/fail on current.
    ok(!Object.keys(calc().wire).some((k) => /ampac|rating|maxCurrent/i.test(k)), 'no ampacity');
  }],

  ['cable: invalid input is reported, not calculated', () => {
    const err = (r) => (r.ok ? 'ok' : r.errors.join());
    eq(err(cable(undefined)), 'cab_positive');
    eq(err(calc({ solve: 'both' })), 'cab_positive');
    eq(err(calc({ circuit: 'ring' })), 'cab_positive');
    eq(err(calc({ material: 'fe' })), 'cab_positive');
    eq(err(calc({ material: 'toString' })), 'cab_positive');
    eq(err(calc({ by: 'kcmil' })), 'cab_positive');
    for (const k of ['currentA', 'supplyV', 'lengthM', 'areaMm2']) {
      for (const x of [0, -1, NaN, Infinity, undefined, null, '10']) eq(err(calc({ [k]: x })), 'cab_positive', `${k} = ${x}`);
    }
    for (const x of [0, -1, 1.5, Infinity, '2']) eq(err(calc({ parallel: x })), 'cab_positive', `parallel ${x}`);
    for (const x of [-4, 41, 18.5, NaN, undefined, null, '18']) eq(err(calc({ by: 'awg', awg: x })), 'cab_awg', `awg ${x}`);
    eq(calc({ by: 'awg', awg: 40 }).ok, true);
    for (const x of [-101, 301, 1e9, -Infinity, Infinity, '20']) eq(err(calc({ tempC: x })), 'cab_temp', `temp ${x}`);
    for (const x of [0, -1, 100.1, NaN, Infinity, undefined, null, '3']) eq(err(calc({ allowedPct: x })), 'cab_pct', `allowed ${x}`);
    for (const x of [0, -1, 100.1, NaN]) eq(err(size({ allowedPct: x })), 'cab_pct', `sizing, allowed ${x}`);
    // Numbers that overflow or vanish are an error as well.
    eq(err(calc({ currentA: 1e200 })), 'cab_range');
    eq(err(calc({ areaMm2: 5e-324 })), 'cab_range');
    eq(err(size({ currentA: 5e-324 })), 'cab_range');
  }],

  ['cable: absurd numbers never give NaN or Infinity', () => {
    const odd = [0, -1, 1e-300, 5e-324, 1e-30, 1e-9, 0.5, 7, 1e9, 1e30, 1e300, NaN, Infinity, -Infinity, undefined, null];
    const keys = ['currentA', 'supplyV', 'lengthM', 'areaMm2', 'awg', 'parallel', 'tempC', 'allowedPct'];
    let good = 0;
    for (const solve of SOLVES) {
      for (const circuit of CIRCUITS) {
        for (const by of SIZE_BY) {
          for (const material of Object.keys(MATERIALS)) {
            const start = { ...base, solve, circuit, by, material, awg: 18 };
            for (const k of keys) {
              for (const x of odd) {
                const r = cable({ ...start, [k]: x });
                const where = `${solve}/${circuit}/${by}/${material} ${k} = ${x}`;
                if (r.ok) {
                  good++;
                  ok(finiteAll(r), `${where}: a number is not finite`);
                  ok(r.rhoT > 0 && r.minAreaMm2 > 0 && r.pathM > 0, `${where}: not positive`);
                  ok(!r.wire || (r.wire.resistanceOhm > 0 && r.wire.dropV >= 0 && r.wire.densityAmm2 >= 0), `${where}: conductor`);
                  ok(solve === 'drop' ? !!r.wire : r.wire === r.metric, `${where}: the conductor in use`);
                } else {
                  ok(Array.isArray(r.errors) && r.errors.length > 0 && r.errors.every((e) => typeof e === 'string'), `${where}: no error key`);
                }
              }
            }
          }
        }
      }
    }
    ok(good > 400, `some of the odd values are still valid inputs (${good})`);
  }],

  ['cable page: every mode, option and example renders steps whose numbers give the result', () => {
    const optionSets = fields.flatMap((f) => (f.options ?? []).map((o) => ({ [f.key]: o.value, ...(o.set ?? {}) })));
    const sets = [
      {}, ...optionSets,
      ...AWG_SIZES.map((g) => ({ by: 'awg', awg: fields.find((f) => f.key === 'awg').options[AWG_SIZES.indexOf(g)].value })),
      { circ: 'single', by: 'awg', awg: '24', n: 2, mat: 'al', t: 60 }, { t: -40 }, { t: 105, pct: 5 }, { n: 3, a: 0.75 }, { pct: 10 }, { pct: 0.5 },
      { i: 500, i_u: 'mA', a: 0.14, len: 250, len_u: 'cm' }, { len: 10, len_u: 'ft', by: 'awg', awg: '22', i: 2, v: 12 }, { len: 800, len_u: 'mm', i: 30, a: 4 },
      { i: 300 }, { i: 20, a: 0.5, len: 30 }, { v: 230, i: 16, len: 25, a: 2.5, pct: 3, t: 70 }, { v: 3.3, i: 0.02, len: 0.3, a: 0.05 },
      { solve: 'size', n: 2 }, { solve: 'size', circ: 'single', mat: 'al', t: 90, pct: 1 }, { solve: 'size', i: 1000, len: 100, v: 12, pct: 1 }, { solve: 'size', i: 460 },
      { solve: 'size', i: 100, len: 0.1 }, { solve: 'size', i: 0.005, v: 5, len: 0.2 }, { solve: 'size', v: 400, i: 63, len: 80, pct: 2, t: 70 },
    ];
    const problems = [];
    let checked = 0;
    inBothLanguages((lang) => {
      for (const set of sets) {
        const where = `${lang} ${JSON.stringify(set)}`;
        const { r, html, steps } = show(set);
        if (!r.ok) { problems.push(`${where}: ${r.errors.join()}`); continue; }
        if (/NaN|undefined|Infinity/.test(html.replace(/<[^>]*>/g, ' '))) problems.push(`${where}: NaN/undefined in the result`);
        if (!html.includes('class="block steps"') || !html.includes('class="refs"')) problems.push(`${where}: no steps or sources`);
        if (/<m(i|n|text)>[^<]*(NaN|undefined|Infinity|—)[^<]*</.test(html)) problems.push(`${where}: a missing value in a step`);
        if (steps.length < 5) problems.push(`${where}: only ${steps.length} steps`);
        for (const s of steps) {
          if (!s.num || !s.res) continue;
          let value;
          let shown;
          try { value = evaluate(s.num); shown = evaluate(s.res); } catch (e) { problems.push(`${where}: the checker cannot read ${s.num} = ${s.res} (${e.message})`); continue; }
          checked++;
          // Tighter than the general check: 0.5 %, and no power of ten apart.
          if (!agrees(value, shown, 0.005) || (shown !== 0 && Math.abs(value / shown - 1) > 0.005)) problems.push(`${where}: ${s.num} → ${value}, shown ${s.res}`);
        }
      }
    });
    ok(problems.length === 0, `\n${[...new Set(problems)].slice(0, 12).join('\n')}`);
    ok(checked > 1200, `expected the steps to be evaluated, got ${checked}`);
  }],

  ['cable page: headline values, messages, units and examples', () => {
    const before = getLang();
    setLang('en');
    try {
      // The page opens inside its own limit (4.79 % of the 5 % allowed) …
      ok(show().html.includes('class="msg ok"') && !show().html.includes('class="msg error"'), 'the default example passes');
      // … and the hand check with a 3 % limit is above it.
      const d = show({ pct: 3 });
      near(d.r.wire.dropV, 1.149333, 1e-6);
      ok(/hero-value">1\.149 <span class="u">V<\/span>/.test(d.html) && /hero-value">11\.49 <span class="u">W<\/span>/.test(d.html), 'drop and loss as heroes');
      ok(d.html.includes('4.79% · limit 3% · exceeded') && d.html.includes('R = 114.9 mΩ · 22.85 V at the load'), 'hero subtitles');
      ok(d.html.includes('class="msg error"') && d.html.includes('above the allowed 3%') && d.html.includes('at least 2.394 mm² per conductor (next standard size: 2.5 mm², AWG 12)'), 'verdict with the way out');
      ok(d.html.includes('2.5 mm² → ΔV = 0.6896 V (2.87%)') && d.html.includes('AWG 12 (3.309 mm²) → ΔV = 0.521 V (2.17%)'), 'standard sizes with their drop');
      ok(d.html.includes('6.67 A/mm²') && d.html.includes('not determined here') && d.html.includes('datasheet'), 'current density with the neutral note');
      ok(!/ampacity|A max|rated current/i.test(d.html.replace(/<[^>]*>/g, ' ')), 'no ampacity figure');
      ok(d.html.includes('IEC 60028') && d.html.includes('ASTM B258'), 'sources');
      // Within the budget: a positive verdict.
      const fine = show({ pct: 5 });
      ok(fine.html.includes('class="msg ok"') && fine.html.includes('within the allowed 5%') && !fine.html.includes('class="msg error"'), 'within');
      ok(fine.html.includes('4.79% · limit 5% · within'), 'hero subtitle');
      // Sizing: the standard cross-section first, then the drop it gives.
      const s = show({ solve: 'size', pct: 3 });
      ok(/hero-value">2\.5 <span class="u">mm²<\/span>/.test(s.html) && /hero-value">0\.6896 <span class="u">V<\/span>/.test(s.html), 'size and drop as heroes');
      ok(s.html.includes('at least 2.394 mm² · in AWG: AWG 12') && s.html.includes('2.87% · with 2.5 mm²'), 'hero subtitles');
      ok(s.html.includes('class="msg ok"') && !s.html.includes('class="msg error"'), 'the standard size is within the limit');
      ok(s.steps.findIndex((x) => x.label === 'cab_aMin') < s.steps.findIndex((x) => x.label === 'cab_r'), 'the requirement comes before the conductor');
      ok(d.steps.findIndex((x) => x.label === 'cab_aMin') > d.steps.findIndex((x) => x.label === 'cab_r'), 'and after it for a given conductor');
      // Above the standard sizes: no conductor, a warning, dashes instead of numbers.
      const huge = show({ solve: 'size', i: 1000, len: 100, v: 12, pct: 1 });
      eq(huge.r.wire, null);
      ok(huge.html.includes('above the largest standard size in the list (120 mm²)') && huge.html.includes('none: more than 120 mm² is needed') && huge.html.includes('none: more than AWG 4/0 is needed'), 'no standard size');
      ok(/hero-value">—</.test(huge.html), 'dash');
      // A drop above the supply voltage.
      const over = show({ i: 300 });
      ok(over.html.includes('exceeds the supply voltage (24 V)') && over.html.includes('the model no longer applies') && !over.html.includes('above the allowed'), 'model limit');
      ok(over.html.includes('The current density is high: 200 A/mm²') && over.html.includes('This is not a rating'), 'density flag');
      ok(!over.steps.some((x) => x.label === 'cab_vLoad' || x.label === 'cab_lossPct'), 'no voltage at the load');
      // Units: 500 mA, 250 cm, 10 ft, 800 mm.
      near(show({ i: 500, i_u: 'mA' }).r.currentA, 0.5, 1e-12);
      near(show({ len: 250, len_u: 'cm' }).r.lengthM, 2.5, 1e-12);
      near(show({ len: 10, len_u: 'ft' }).r.lengthM, 3.048, 1e-12);
      near(show({ len: 800, len_u: 'mm' }).r.lengthM, 0.8, 1e-12);
      eq(fields.find((f) => f.key === 'len').units.join(), 'm,cm,mm,ft');
      // AWG: the option values are 30 … 1, then 0, 00, 000, 0000 for 1/0 … 4/0.
      const awg = fields.find((f) => f.key === 'awg');
      eq(awg.options.map((o) => o.value).join(), '30,28,26,24,22,20,18,16,14,12,10,8,6,4,2,1,0,00,000,0000');
      eq(awg.options.map((o) => o.label).slice(-6).join(), 'AWG 2,AWG 1,AWG 1/0,AWG 2/0,AWG 3/0,AWG 4/0');
      awg.options.forEach((o, i) => eq(show({ by: 'awg', awg: o.value }).r.wire.awg, AWG_SIZES[i], o.label));
      const g18 = show({ by: 'awg' });
      near(g18.r.wire.areaMm2, 0.8230, 2e-4);
      ok(g18.html.includes('AWG 18 (0.823 mm²)') && g18.steps.some((x) => x.label === 'cab_sAwgD') && g18.steps.some((x) => x.label === 'cab_sAwgA'), 'AWG steps');
      ok(!d.steps.some((x) => x.label === 'cab_sAwgD'), 'no AWG steps for a cross-section');
      eq(show({ by: 'awg', awg: 'x' }).r.ok, false, 'an unknown AWG value');
      // Material, temperature and parallel conductors reach the engine.
      near(show({ mat: 'al' }).r.wire.dropV, 1.88, 1e-9);
      near(show({ t: 60 }).r.wire.dropV, 1.330008, 1e-5);
      near(show({ n: 2 }).r.wire.dropV, 0.574667, 1e-5);
      ok(show({ n: 2 }).html.includes('2 × 1.5 mm² per pole'), 'parallel conductors');
      near(show({ circ: 'single' }).r.wire.dropV, 0.574667, 1e-5);
      // Engine errors reach the page as messages, with the generic drawing.
      const wrong = show({ t: 500 });
      eq(wrong.r.ok, false);
      ok(wrong.html.includes('class="msg error"') && wrong.html.includes('between −100 °C and 300 °C') && wrong.svg.includes('<svg'), 'error message and drawing');
      // Examples: every field is set.
      const ex = Object.fromEntries(fields.find((f) => f.key === 'ex').options.map((o) => [o.value, o.set]));
      eq(Object.keys(ex).join(), 'none,e24,e12,e5,al,size');
      near(show(ex.e24).r.wire.dropV, 1.149333, 1e-6);
      // 12 V, 3 A, 2 × 3 m, AWG 18: R = 1.724e-8 · 6 / 0.82303e-6 = 0.125682 Ω → 0.37705 V = 3.14 % ≤ 5 %
      near(show(ex.e12).r.wire.dropV, 0.37705, 1e-4);
      eq(show(ex.e12).r.wire.withinBudget, true);
      // 5 V, 2 A, 2 × 1.5 m, AWG 24: R = 1.724e-8 · 3 / 0.20473e-6 = 0.25262 Ω → 0.50525 V = 10.1 % > 5 %; needs 0.4138 mm² → 0.5 mm², AWG 20
      const thin = show(ex.e5).r;
      near(thin.wire.dropV, 0.50525, 2e-4);
      eq(thin.warnings.join(), 'cab_over');
      near(thin.minAreaMm2, 0.4138, 1e-4);
      eq(thin.metric.areaMm2, 0.5);
      eq(thin.gauge.awg, 20);
      near(show(ex.al).r.wire.dropV, 2.086349, 1e-6);
      eq(show(ex.al).r.warnings.length, 0);
      eq(show(ex.size).r.metric.areaMm2, 2.5);
      for (const [k, set] of Object.entries(ex)) {
        if (!set) continue;
        eq(Object.keys(set).sort().join(), 'a,awg,by,circ,i,len,mat,n,pct,solve,t,v', `${k} sets every field`);
      }
      // The plot: drop in volts and percent, loss and the smallest cross-section against length, current, cross-section and temperature.
      eq(page.plot.x.join(), 'len,i,a,t');
      eq(page.plot.y.map((o) => o.key).join(), 'dv,dp,loss,amin');
      near(page.plot.y[0].get(d.r), 1.149333, 1e-6);
      near(page.plot.y[1].get(d.r), 4.7889, 1e-4);
      near(page.plot.y[2].get(d.r), 11.49333, 1e-6);
      near(page.plot.y[3].get(d.r), 2.394444, 1e-6);
      ok(!Number.isFinite(page.plot.y[0].get(huge.r) ?? NaN) && !Number.isFinite(page.plot.y[1].get(huge.r)), 'no drop without a conductor');
    } finally {
      setLang(before);
    }
  }],

  ['cable page: diagrams stay clean in TR and EN for every circuit, mode and extreme or invalid input', () => {
    const sets = [
      {}, { circ: 'single' }, { by: 'awg' }, { by: 'awg', awg: '0000', n: 4, circ: 'single' }, { n: 3 }, { mat: 'al', t: 90 }, { pct: 5 }, { i: 300 },
      { solve: 'size' }, { solve: 'size', circ: 'single', n: 2 }, { solve: 'size', i: 1000, len: 100, v: 12, pct: 1 }, { solve: 'size', i: 460 },
      { len: 1e-6 }, { len: 1e9 }, { i: 1e-9 }, { i: 1e6 }, { a: 1e-9 }, { a: 1e9 }, { v: 1e-6 }, { v: 1e9 }, { t: -100 }, { t: 300 }, { n: 1000000 }, { pct: 100 }, { pct: 1e-9 },
      { len: 12345.678, len_u: 'ft', i: 987.654, i_u: 'mA', a: 0.12345, v: 123.456 }, { solve: 'size', pct: 1e-9 }, { solve: 'size', i: 1e-9, len: 1e-6 },
      // Invalid input: the drawing falls back to symbols.
      { i: 0 }, { i: -1 }, { v: '' }, { len: '' }, { a: 0 }, { n: 1.5 }, { n: 0 }, { t: 999 }, { pct: 0 }, { pct: 101 }, { by: 'awg', awg: 'x' }, { i: 1e200 },
      { circ: 'single', len: 0 }, { solve: 'size', pct: '' }, { i: '', v: '', len: '', a: '' },
    ];
    const problems = [];
    const counts = new Map();
    inBothLanguages((lang) => {
      for (const set of sets) {
        const id = JSON.stringify(set);
        let out;
        try { out = show(set); } catch (e) { problems.push(`${lang} ${id} threw ${e.message}`); continue; }
        if (!out.svg?.includes('<svg')) { problems.push(`${lang} ${id} drew nothing`); continue; }
        for (const p of svgProblems(out.svg)) problems.push(`${lang} ${id}: ${p}`);
        const count = geometryCount(out.svg);
        if (counts.has(id) && counts.get(id) !== count) problems.push(`${id}: geometry differs between TR and EN`);
        counts.set(id, count);
        // The drop is written green inside the budget and red outside it; without a result there is no verdict colour.
        const w = out.r.ok ? out.r.wire : null;
        if (w && out.svg.includes('class="badt"') === w.withinBudget) problems.push(`${lang} ${id}: colour does not follow the verdict`);
        if (!w && /class="(okt|badt)"/.test(out.svg)) problems.push(`${lang} ${id}: a verdict colour without a conductor`);
      }
    });
    ok(problems.length === 0, `\n${[...new Set(problems)].slice(0, 12).join('\n')}`);
    const before = getLang();
    setLang('en');
    try {
      // Out and back: two copper conductors; one conductor only: one, and a dashed return that is named as not counted.
      const d = show();
      eq(d.svg.match(/<rect class="cu"/g).length, 2);
      ok(d.svg.includes('Out and back in the same cable') && d.svg.includes('(out + return)') && !d.svg.includes('wire dash'), 'loop');
      const one = show({ circ: 'single' });
      eq(one.svg.match(/<rect class="cu"/g).length, 1);
      ok(one.svg.includes('wire dash') && one.svg.includes('return by another path (not counted)') && !one.svg.includes('(out + return)'), 'single');
      // Length, conductor, resistance, both voltages, the drop and the loss are marked with their values.
      for (const s of ['L = 5 m', 'I = 10 A', '1.5 mm² Cu', 'R = 114.9 mΩ', '>24 V<', '>22.85 V<', 'ΔV = 1.149 V (4.79%)', 'P = 11.49 W', '>source<', '>load<']) {
        ok(d.svg.includes(s), `the drawing shows ${s}`);
      }
      ok(show({ by: 'awg', n: 2, mat: 'al' }).svg.includes('2 × AWG 18 (0.823 mm²) Al'), 'conductor description');
      ok(show({ solve: 'size', pct: 3 }).svg.includes('2.5 mm² Cu') && show({ solve: 'size', pct: 3 }).svg.includes('class="okt"'), 'the standard size when sizing');
      const huge = show({ solve: 'size', i: 1000, len: 100, v: 12, pct: 1 }).svg;
      ok(huge.includes('A ≥ 2.873e+4 mm² Cu') || huge.includes('A ≥ 28730 mm² Cu'), 'the requirement when there is no standard size');
      ok(show({ i: 300 }).svg.includes('>—<'), 'no voltage at the load above the supply voltage');
      // Without a result: symbols only.
      const bad = show({ i: 0 });
      ok(bad.svg.includes('>V<') && bad.svg.includes('>L<') && bad.svg.includes('ΔV = I · R') && !bad.svg.includes(' = 24'), 'symbols');
      ok(show({ i: 0, circ: 'single' }).svg.includes('wire dash'), 'the circuit choice shows without a result too');
    } finally {
      setLang(before);
    }
  }],

  ['cable page: Turkish and English strings match, and every key the page uses exists', () => {
    const tr = Object.keys(page.strings.tr);
    const en = new Set(Object.keys(page.strings.en));
    eq(tr.filter((k) => !en.has(k)).join(), '', 'only in tr');
    eq([...en].filter((k) => !tr.includes(k)).join(), '', 'only in en');
    ok(tr.every((k) => page.strings.tr[k] && page.strings.en[k]), 'no empty string');
    ok(tr.every((k) => /^(cab_|ok_cab_|warn_cab_|err_cab_)/.test(k)), 'all keys carry the cab_ prefix, so no other page is overwritten');
    // Every message key the engine can return has a text.
    for (const k of ['cab_positive', 'cab_awg', 'cab_temp', 'cab_pct', 'cab_range', 'cab_over', 'cab_aboveSupply']) ok(en.has(`err_${k}`), `err_${k}`);
    for (const k of ['cab_density', 'cab_noStd']) ok(en.has(`warn_${k}`), `warn_${k}`);
    ok(en.has('ok_cab_within'), 'ok_cab_within');
    // Labels, hints, notes, option and preset labels of the form.
    for (const s of page.sections) {
      ok(s.title === 'sectionSetup' || en.has(s.title), `section ${s.title}`);
      for (const f of s.fields) {
        const labels = [f.label, f.hint, f.info, ...(f.options ?? []).filter((o) => !o.raw).map((o) => o.label), ...(f.presets ?? []).filter((x) => x.raw === false).map((x) => x.label)];
        for (const k of labels) ok(k === undefined || en.has(k), `${f.key}: ${k}`);
      }
    }
    // Field keys are unique and short (they become URL parameters); option values are lowercase ASCII.
    eq(new Set(fields.map((f) => f.key)).size, fields.length, 'unique keys');
    eq(fields.map((f) => f.key).join(), 'solve,ex,i,v,len,circ,by,a,awg,n,mat,t,pct');
    ok(fields.every((f) => /^[a-z]{1,6}$/.test(f.key)), 'short keys');
    ok(fields.every((f) => (f.options ?? []).every((o) => /^[a-z0-9]+$/.test(o.value))), 'option values');
    // The engine's option lists and limits are the form's.
    eq(fields.find((f) => f.key === 'solve').options.map((o) => o.value).join(), SOLVES.join());
    eq(fields.find((f) => f.key === 'circ').options.map((o) => o.value).join(), CIRCUITS.join());
    eq(fields.find((f) => f.key === 'by').options.map((o) => o.value).join(), SIZE_BY.join());
    eq(fields.find((f) => f.key === 'mat').options.map((o) => o.value).join(), Object.keys(MATERIALS).join());
    eq(`${fields.find((f) => f.key === 't').min}/${fields.find((f) => f.key === 't').max}`, `${T_MIN}/${T_MAX}`);
    ok(fields.find((f) => f.key === 'a').presets.every((x) => METRIC_MM2.includes(x.value)), 'the cross-section presets are standard sizes');
    // The constants written in the texts are the ones the engine uses.
    for (const l of ['tr', 'en']) {
      const sep = l === 'tr' ? ',' : '.';
      const s = page.strings[l];
      ok(s.cab_matInfo.includes(`1${sep}724·10⁻⁸`) && s.cab_matInfo.includes(`0${sep}00393`) && s.cab_matInfo.includes(`2${sep}82·10⁻⁸`) && s.cab_matInfo.includes(`0${sep}0039 `), `${l}: constants in the material note`);
      ok(s.cab_stepRhoCu.includes(`0${sep}01724`) && s.cab_stepRhoAl.includes(`0${sep}0282`), `${l}: constants in the step notes`);
      ok(METRIC_MM2.every((a) => s.cab_stepStd.includes(String(a).replace('.', sep))), `${l}: the list of standard sizes`);
    }
    // No untranslated key and no unfilled placeholder shows up in a rendered result or drawing.
    inBothLanguages((lang) => {
      for (const set of [{}, { pct: 5, by: 'awg', n: 2, mat: 'al', circ: 'single' }, { solve: 'size' }, { solve: 'size', i: 1000, len: 100, v: 12, pct: 1 }, { i: 300 }, { t: 500 }, { by: 'awg', awg: 'x' }, { pct: 0 }, { i: 0 }, { i: 1e200 }]) {
        const { html, svg } = show(set);
        const shown = `${html} ${svg}`.replace(/data-hl="[^"]*"/g, '');
        ok(!/\b(ok_|warn_|err_)?cab_[A-Za-z0-9]+/.test(shown), `${lang} ${JSON.stringify(set)}: an untranslated key is shown`);
        ok(!/\{[a-z]+\}/.test(shown.replace(/<[^>]*>/g, ' ')), `${lang} ${JSON.stringify(set)}: an unfilled placeholder is shown`);
      }
    });
  }],
];
