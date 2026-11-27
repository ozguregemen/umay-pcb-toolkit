// Power path voltage drop: engine (src/engine/dcdrop.js) and page
// (src/pages/dcdrop.js). Reference values are worked out by hand in the
// comments from
//   ρ(T) = 1.724e-8 Ω·m · [1 + 0.00393·(T − 20 °C)]      (engine/copper.js)
//   trace  R = ρ·L/(w·t)          plane  R = ρ/t · L/W
//   via    R = ρ·L/(n·π·(ro² − ri²))                      wire  R = ρ·L/A
//   ΔV = I·R,  P = I²·R,  V(load) = V(source) − ΔV
// (IPC-2152 for the temperature rise of a trace, IPC-2221B for the capacity
// of a via, ASTM B258 for the AWG diameters.)

import { near, eq, ok } from '../assert.js';
import {
  analyzePowerPath, traceResistanceOhm, sheetResistanceOhm, wireResistanceOhm, ELEMENT_TYPES, LIMITS,
} from '../../src/engine/dcdrop.js';
import { copperResistivity } from '../../src/engine/copper.js';
import { ipc2152AreaMil2 } from '../../src/engine/trace-width.js';
import { registerStrings, setLang, getLang } from '../../src/i18n.js';
import { stepsTrace } from '../../src/ui/calculator.js';
import { evaluate, agrees } from './arith.js';
import page, {
  drawPath, formHtml, fromParams, toQuery, toPath, defaultState, exampleState, EXAMPLES, summary,
} from '../../src/pages/dcdrop.js';

registerStrings(page.strings);

const codes = (r) => r.warnings.map((w) => w.code).sort().join();
const errs = (r) => r.errors.map((e) => (e.field ? `${e.code}:${e.index}:${e.field}` : e.index !== undefined ? `${e.code}:${e.index}` : e.code)).join();

/** One element alone on a 12 V path. */
const one = (el, currentA = 1, tempC = 60) => analyzePowerPath({ supplyV: 12, currentA, tempC, elements: [el] });

/** 5 V, 2 A, 25 °C: contact 10 mΩ → fuse 35 mΩ → trace 30 × 1 mm → 2 vias → trace 20 × 1 mm (35 µm copper). */
const mixed = (extra = {}) => analyzePowerPath({
  supplyV: 5, currentA: 2, tempC: 25, budgetPct: 3,
  elements: [
    { name: 'J1', type: 'fixed', resistanceOhm: 0.010 },
    { name: 'F1', type: 'fixed', resistanceOhm: 0.035 },
    { name: 'T1', type: 'trace', lengthMm: 30, widthMm: 1, thicknessUm: 35 },
    { name: 'V1', type: 'via', drillMm: 0.3, platingUm: 25, lengthMm: 1.6, count: 2 },
    { name: 'T2', type: 'trace', lengthMm: 20, widthMm: 1, thicknessUm: 35, ret: true },
  ],
  ...extra,
});

function inBothLanguages(fn) {
  const before = getLang();
  try {
    for (const l of ['tr', 'en']) { setLang(l); fn(l); }
  } finally {
    setLang(before);
  }
}

// ---------------------------------------------------------------------------
// Helpers for the drawing tests
// ---------------------------------------------------------------------------

const NUM = /^-?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i;
const ARGS = { m: 2, l: 2, t: 2, q: 4, a: 7, h: 1, v: 1, z: 0 };
const GEO = /\s(x|y|x1|x2|y1|y2|cx|cy|r|rx|ry|width|height|d|points|viewBox|transform|style)="([^"]*)"/g;
/** Every geometry attribute of an SVG string, in order. */
const geometry = (s) => [...s.matchAll(GEO)].map(([, k, v]) => `${k}=${v}`);

function svgProblems(s) {
  const bad = [];
  if (!s.startsWith('<svg') || !s.endsWith('</svg>')) bad.push('not an svg');
  if (/NaN|undefined|Infinity/.test(s)) bad.push('NaN/undefined/Infinity');
  for (const [, k, v] of s.matchAll(GEO)) {
    if (k === 'd') {
      if (!/^[MLHVZqta\d.,\s-]+$/.test(v)) bad.push(`d="${v}"`);
      // Every command carries a whole number of argument groups; a decimal comma adds a stray number.
      for (const [, cmd, args] of v.matchAll(/([MLHVZqta])([^MLHVZqta]*)/g)) {
        const n = (args.match(/-?(\d+\.?\d*|\.\d+)/g) ?? []).length;
        const want = ARGS[cmd.toLowerCase()];
        if (want === 0 ? n !== 0 : n === 0 || n % want !== 0) bad.push(`d: ${cmd}${args}`);
      }
    } else if (k === 'points') {
      if (v.split(' ').some((p) => !/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(p))) bad.push(`points="${v}"`);
    } else if (k === 'viewBox') {
      const p = v.split(' ');
      if (p.length !== 4 || !p.every((x) => NUM.test(x))) bad.push(`viewBox="${v}"`);
    } else if (k === 'style') {
      if (/\d,\d/.test(v)) bad.push(`style="${v}"`);
    } else if (k === 'transform') {
      const m = v.match(/^rotate\(([^)]*)\)$/);
      if (!m || m[1].split(' ').length !== 3 || !m[1].split(' ').every((x) => NUM.test(x))) bad.push(`transform="${v}"`);
    } else if (!NUM.test(v)) bad.push(`${k}="${v}"`);
  }
  return bad;
}

const viewBox = (s) => s.match(/viewBox="0 0 (\S+) (\S+)"/).slice(1).map(Number);
const stairs = (s) => s.match(/<polyline class="wave" points="([^"]*)"/)[1].split(' ').map((p) => p.split(',').map(Number));
const count = (s, re) => (s.match(re) ?? []).length;

/** Page states for the drawing tests: n elements of every type, some on the return path, long names. */
function pathOf(n) {
  const kinds = [
    (k) => ({ name: `J${k + 1}`, type: 'fixed', ret: false, r: 7.5 + k, imax: 6.5 }),
    (k) => ({ name: `L${k + 1} güç izi, uzun ad`, type: 'trace', ret: false, len: 22.5 + k, w: 1.25, th: 1, thu: 'oz', layer: k % 2 ? 'int' : 'ext' }),
    (k) => ({ name: '', type: 'via', ret: false, drill: 0.35, plat: 22.5, board: 1.55, n: 3 }),
    (k) => ({ name: `GND ${k + 1}`, type: 'plane', ret: true, len: 37.5, w: 12.5, th: 52.5, thu: 'um' }),
    (k) => ({ name: 'W'.repeat(24), type: 'wire', ret: true, wlen: 0.35, size: k % 2 ? 0.75 : 20, su: k % 2 ? 'mm2' : 'awg' }),
  ];
  return { v: 12.5, i: 2.75, t: 37.5, b: 2.5, els: Array.from({ length: n }, (_, k) => kinds[k % kinds.length](k)) };
}

/** Steps recorded while the result of a state is rendered. */
function recordedSteps(st) {
  const seen = [];
  stepsTrace.record = (items) => seen.push(...items);
  try { page.render(page.compute(st), st); } finally { stepsTrace.record = null; }
  return seen;
}

export const cases = [
  // -------------------------------------------------------------------------
  // Engine
  // -------------------------------------------------------------------------

  ['dcdrop: copper resistivity and the three resistance formulas', () => {
    // ρ(60 °C) = 1.724e-8 · (1 + 0.00393·40) = 1.724e-8 · 1.1572 = 1.9950128e-8 Ω·m
    near(copperResistivity(60), 1.9950128e-8, 1e-9);
    // ρ(25 °C) = 1.724e-8 · (1 + 0.00393·5) = 1.724e-8 · 1.01965 = 1.7578766e-8 Ω·m
    near(copperResistivity(25), 1.7578766e-8, 1e-9);
    // Trace 50 mm × 0.5 mm × 35 µm at 60 °C: 1.9950128e-8 · 0.05 / (0.5e-3 · 35e-6) = 9.975064e-10 / 1.75e-8 = 0.05700037 Ω
    near(traceResistanceOhm(50, 0.5, 35, 60), 0.05700037, 1e-6);
    // … at the default 20 °C, 1 m × 1 mm × 35 µm: 1.724e-8 / 3.5e-8 = 0.4925714 Ω
    near(traceResistanceOhm(1000, 1, 35), 0.4925714, 1e-6);
    // Sheet resistance of 70 µm at 60 °C: 1.9950128e-8 / 70e-6 = 2.850018e-4 Ω per square
    near(sheetResistanceOhm(70, 60), 2.850018e-4, 1e-6);
    // Wire 2 m of 0.5 mm² at 20 °C: 1.724e-8 · 2 / 0.5e-6 = 0.06896 Ω
    near(wireResistanceOhm(2, 0.5, 20), 0.06896, 1e-9);
    eq(ELEMENT_TYPES.join(), 'trace,plane,via,fixed,wire');
  }],

  ['dcdrop: a trace: resistance, drop, loss, current density and the IPC-2152 rise', () => {
    // 50 mm × 0.5 mm × 35 µm at 60 °C and 1 A: R = 0.05700037 Ω (above), ΔV = 57.00 mV, P = 57.00 mW.
    const r = one({ name: 'T', type: 'trace', lengthMm: 50, widthMm: 0.5, thicknessUm: 35 });
    ok(r.ok, 'ok');
    const e = r.elements[0];
    near(e.resistanceOhm, 0.05700037, 1e-6);
    near(e.dropV, 0.05700037, 1e-6);
    near(e.lossW, 0.05700037, 1e-6);
    // Cross-section 0.5 mm · 0.035 mm = 0.0175 mm² → J = 1 / 0.0175 = 57.14 A/mm²
    near(e.areaMm2, 0.0175, 1e-9);
    near(e.currentDensityAmm2, 57.142857, 1e-6);
    // IPC-2152 at 1 A: A = (117.555·ΔT^−0.913 + 1.15) · M_Cu with I^x = 1 and M_Cu(1 oz, 1 A) = 0.9128.
    // A = 19.68504 mil · 1.377953 mil = 27.12505 mil² → ΔT^−0.913 = (27.12505/0.9128 − 1.15)/117.555 = 0.2430038
    // → ΔT = e^(1.414678/0.913) = e^1.549483 = 4.709 °C
    near(e.riseC, 4.709, 1e-3);
    ok(e.riseFitOk, 'inside the range of the fit');
    // Putting the rise back into the chart formula gives the cross-section again.
    near(ipc2152AreaMil2(1, e.riseC, { copperOz: 35 / 25.4 / 1.378 }).area, 27.12505, 1e-5);
    // IPC-2221 for comparison: ΔT = (I/(k·A^0.725))^(1/0.44); A^0.725 = e^(0.725·3.300458) = 10.94444.
    // External, k = 0.048: (1/0.525333)^2.272727 = 1.903554^2.272727 = 4.319 °C
    eq(e.layer, 'external');
    near(e.riseIpc2221C, 4.319, 1e-3);
    // Internal, k = 0.024: 3.807108^2.272727 = 20.87 °C; the IPC-2152 rise does not depend on the layer.
    const inner = one({ type: 'trace', lengthMm: 50, widthMm: 0.5, thicknessUm: 35, layer: 'internal' }).elements[0];
    eq(inner.layer, 'internal');
    near(inner.riseIpc2221C, 20.87, 1e-3);
    eq(inner.riseC, e.riseC);
    eq(inner.resistanceOhm, e.resistanceOhm);
    // The whole path is this one element.
    near(r.totals.resistanceOhm, e.resistanceOhm, 1e-12);
    eq(e.sharePct, 100);
    eq(r.totals.maxIndex, 0);
    eq(e.name, 'T');
    near(r.resistivityOhmM, 1.9950128e-8, 1e-9);
  }],

  ['dcdrop: a plane is sheet resistance times the number of squares', () => {
    // 40 mm long, 20 mm wide, 70 µm at 60 °C: Rs = 2.850018e-4 Ω/□, 40/20 = 2 squares → R = 5.700037e-4 Ω
    const e = one({ type: 'plane', lengthMm: 40, widthMm: 20, thicknessUm: 70 }).elements[0];
    near(e.sheetOhm, 2.850018e-4, 1e-6);
    eq(e.squares, 2);
    near(e.resistanceOhm, 5.700037e-4, 1e-6);
    // J = 1 A / (20 mm · 0.07 mm) = 0.7142857 A/mm²
    near(e.currentDensityAmm2, 0.7142857, 1e-6);
    // The same strip as a trace has the same resistance: ρ·L/(w·t) = ρ/t · L/W.
    near(traceResistanceOhm(40, 20, 70, 60), e.resistanceOhm, 1e-12);
    // Twice as wide = half the squares = half the resistance.
    near(one({ type: 'plane', lengthMm: 40, widthMm: 40, thicknessUm: 70 }).elements[0].resistanceOhm, 2.850018e-4, 1e-6);
  }],

  ['dcdrop: vias in parallel: barrel resistance and current per via against IPC-2221', () => {
    // Drill 0.3 mm, plating 25 µm: ri = 0.15 mm, ro = 0.175 mm, A = π·(0.030625 − 0.0225) = π·0.008125 = 0.02552544 mm²
    // One via, 1.6 mm long at 60 °C: 1.9950128e-8 · 1.6e-3 / 2.552544e-8 = 3.192020e-11 / 2.552544e-8 = 1.250525e-3 Ω
    // Four in parallel: 3.126313e-4 Ω. At 2 A: 0.5 A per via.
    const e = one({ type: 'via', drillMm: 0.3, platingUm: 25, lengthMm: 1.6, count: 4 }, 2).elements[0];
    near(e.areaMm2, 0.02552544, 1e-6);
    near(e.perViaOhm, 1.250525e-3, 1e-6);
    near(e.resistanceOhm, 3.126313e-4, 1e-6);
    eq(e.perViaA, 0.5);
    // Capacity at ΔT = 10 °C, IPC-2221 external: A = 0.02552544 mm² / 6.4516e-4 = 39.56451 mil²
    // I = 0.048 · 10^0.44 · 39.56451^0.725 = 0.048 · 2.754229 · 14.38955 = 1.9023 A
    near(e.capacityA, 1.9023, 1e-4);
    near(e.loadPct, 26.283, 1e-3); // 0.5 / 1.9023
    eq(e.neededCount, 2); // 2 A / 1.9023 A → 2 vias
    // ΔV = 2 A · 3.126313e-4 Ω = 0.6252626 mV, P = 4 · 3.126313e-4 = 1.250525 mW
    near(e.dropV, 6.252626e-4, 1e-6);
    near(e.lossW, 1.250525e-3, 1e-6);
    // Without a count it is one via.
    const single = one({ type: 'via', drillMm: 0.3, platingUm: 25, lengthMm: 1.6 }, 2).elements[0];
    eq(single.count, 1);
    near(single.resistanceOhm, 1.250525e-3, 1e-6);
    eq(LIMITS.viaRiseC, 10);
  }],

  ['dcdrop: a fixed resistance and a wire by AWG or by cross-section', () => {
    // 35 mΩ at 2 A: ΔV = 70 mV, P = 4 · 0.035 = 0.14 W; 2 A of a 3 A rating = 66.67 %
    const f = one({ type: 'fixed', resistanceOhm: 0.035, ratedA: 3 }, 2).elements[0];
    eq(f.resistanceOhm, 0.035);
    near(f.dropV, 0.07, 1e-12);
    near(f.lossW, 0.14, 1e-12);
    near(f.loadPct, 66.6667, 1e-5);
    // Without a rating there is nothing to compare with; a 0 Ω link is allowed.
    const bare = one({ type: 'fixed', resistanceOhm: 0 }, 2);
    ok(Number.isNaN(bare.elements[0].ratedA) && Number.isNaN(bare.elements[0].loadPct), 'no rating');
    eq(bare.totals.maxIndex, null, 'no drop, no largest element');
    eq(bare.elements[0].sharePct, 0);
    // AWG 18: d = 0.127 mm · 92^(18/39) = 0.127 · e^(0.4615385·4.5217886) = 0.127 · 8.060530 = 1.0236873 mm
    // A = π/4 · 1.0236873² = 0.8230468 mm². 0.5 m at 60 °C: 1.9950128e-8 · 0.5 / 0.8230468e-6 = 0.01211968 Ω
    const w = one({ type: 'wire', lengthM: 0.5, awg: 18 }).elements[0];
    near(w.diameterMm, 1.0236873, 1e-6);
    near(w.areaMm2, 0.8230468, 1e-6);
    near(w.resistanceOhm, 0.01211968, 1e-6);
    eq(w.awg, 18);
    near(w.currentDensityAmm2, 1.214998, 1e-6); // 1 A / 0.8230468 mm²
    // 2 m of 0.5 mm² at 20 °C: 0.06896 Ω (above); a round conductor of that area: d = 2·√(0.5/π) = 0.7978846 mm
    const a = one({ type: 'wire', lengthM: 2, areaMm2: 0.5 }, 1, 20).elements[0];
    near(a.resistanceOhm, 0.06896, 1e-9);
    near(a.diameterMm, 0.7978846, 1e-6);
    ok(Number.isNaN(a.awg), 'given by area');
    // A warmer wire has more resistance: ×1.1572 from 20 °C to 60 °C.
    near(one({ type: 'wire', lengthM: 2, areaMm2: 0.5 }).elements[0].resistanceOhm, 0.06896 * 1.1572, 1e-9);
  }],

  ['dcdrop: a mixed path: totals, shares, feed and return, the largest drop', () => {
    const r = mixed();
    ok(r.ok, 'ok');
    // At 25 °C (ρ = 1.7578766e-8 Ω·m):
    //   J1 0.010 Ω, F1 0.035 Ω
    //   T1 30 × 1 mm × 35 µm: 1.7578766e-8 · 0.03 / 3.5e-8 = 0.01506751 Ω
    //   V1 one via 1.7578766e-8 · 1.6e-3 / 2.552544e-8 = 1.101882e-3 Ω, two in parallel 5.509410e-4 Ω
    //   T2 20 × 1 mm: 0.01004501 Ω
    const R = r.elements.map((e) => e.resistanceOhm);
    near(R[2], 0.01506751, 1e-6);
    near(R[3], 5.509410e-4, 1e-6);
    near(R[4], 0.01004501, 1e-6);
    // Sum: 0.010 + 0.035 + 0.01506751 + 0.00055094 + 0.01004501 = 0.07066346 Ω
    const T = r.totals;
    near(T.resistanceOhm, 0.07066346, 1e-6);
    // ΔV = 2 A · 0.07066346 Ω = 0.1413269 V = 2.826539 % of 5 V; P = 4 · 0.07066346 = 0.2826539 W
    near(T.dropV, 0.1413269, 1e-6);
    near(T.dropPct, 2.826539, 1e-6);
    near(T.lossW, 0.2826539, 1e-6);
    // V(load) = 5 − 0.1413269 = 4.8586731 V; P(source) = 10 W, P(load) = 4.8586731 · 2 = 9.7173461 W
    near(T.loadV, 4.8586731, 1e-7);
    eq(T.sourceW, 10);
    near(T.loadW, 9.7173461, 1e-7);
    near(T.sourceW - T.loadW, T.lossW, 1e-9, 'power balance');
    // Budget 3 % of 5 V = 0.15 V: not exceeded.
    near(T.budgetV, 0.15, 1e-12);
    eq(codes(r), '');
    // Shares of the drop: 0.010/0.07066346 = 14.1516 %, 49.5305 %, 21.3229 %, 0.7797 %, 14.2153 %.
    const share = r.elements.map((e) => e.sharePct);
    near(share[0], 14.1516, 1e-5);
    near(share[1], 49.5305, 1e-5);
    near(share[2], 21.3229, 1e-5);
    near(share[3], 0.7797, 1e-4);
    near(share[4], 14.2153, 1e-5);
    near(share.reduce((a, x) => a + x, 0), 100, 1e-9);
    eq(T.maxIndex, 1, 'the fuse drops most');
    // T2 is on the return path: 2 A · 0.01004501 Ω = 20.09 mV there, the rest (121.24 mV) on the way out.
    ok(T.hasReturn, 'has a return element');
    near(T.returnDropV, 0.02009002, 1e-6);
    near(T.feedDropV, 0.1212369, 1e-6);
    near(T.feedDropV + T.returnDropV, T.dropV, 1e-12);
    eq(r.elements.map((e) => `${e.index}${e.name}${e.ret ? 'r' : ''}`).join(), '0J1,1F1,2T1,3V1,4T2r');
    // Every drop is I·R, and they add up to the total.
    for (const e of r.elements) near(e.dropV, 2 * e.resistanceOhm, 1e-12);
    near(r.elements.reduce((a, e) => a + e.dropV, 0), T.dropV, 1e-12);
    near(r.elements.reduce((a, e) => a + e.lossW, 0), T.lossW, 1e-12);
    // Defaults: 25 °C and a 3 % budget when nothing is given.
    const d = analyzePowerPath({ supplyV: 5, currentA: 2, elements: [{ type: 'fixed', resistanceOhm: 0.01 }] });
    eq(d.tempC, 25);
    eq(d.budgetPct, 3);
    eq(LIMITS.budgetPct, 3);
  }],

  ['dcdrop: every warning is raised by its own cause', () => {
    // Budget: the mixed path drops 2.8265 %. A 3 % budget holds, 2.5 % (0.125 V) does not.
    let r = mixed({ budgetPct: 2.5 });
    eq(codes(r), 'budget');
    near(r.warnings[0].dropPct, 2.826539, 1e-6);
    near(r.warnings[0].budgetV, 0.125, 1e-12);
    eq(r.warnings[0].maxIndex, 1);
    eq(codes(mixed({ budgetPct: 2.9 })), '');

    // Trace 1 mm × 35 µm = 39.37008 mil · 1.377953 mil = 54.2501 mil².
    const trace = (currentA, thicknessUm = 35) => analyzePowerPath({ supplyV: 12, currentA, elements: [{ type: 'trace', lengthMm: 10, widthMm: 1, thicknessUm }] });
    // 2 A: at ΔT = 10 °C the chart asks for (117.555·10^−0.913 + 1.15)·2^1.814 = 15.513·3.516 = 54.5 mil², times
    // M_Cu = 0.9128 − 0.0318·ln 2 = 0.8908 → 48.6 mil² < 54.25 → the rise is below 10 °C: no message.
    r = trace(2);
    eq(codes(r), '');
    ok(r.elements[0].riseC > 8 && r.elements[0].riseC < 10, `rise ${r.elements[0].riseC}`);
    // 2.5 A: ΔT = 10 °C needs 15.513·2.5^1.814 = 81.8 mil² · 0.8837 = 72.3 mil² > 54.25 (hotter than 10 °C);
    // ΔT = 20 °C needs 8.778·2.5^1.7668 = 44.3 mil² · 0.8837 = 39.2 mil² < 54.25 (cooler than 20 °C) → the note.
    r = trace(2.5);
    eq(codes(r), 'riseNote');
    ok(r.warnings[0].riseC > 10 && r.warnings[0].riseC < 20, `rise ${r.warnings[0].riseC}`);
    near(ipc2152AreaMil2(2.5, r.warnings[0].riseC, { copperOz: 35 / 25.4 / 1.378 }).area, 54.2501, 1e-5);
    eq(r.warnings[0].index, 0);
    eq(r.elements[0].flags.join(), 'riseNote');
    // 4 A: ΔT = 20 °C needs 8.778·4^1.7668 = 101.6 mil² · 0.8687 = 88.3 mil² > 54.25 → above 20 °C: the warning.
    r = trace(4);
    eq(codes(r), 'riseHigh');
    ok(r.warnings[0].riseC > 20, `rise ${r.warnings[0].riseC}`);
    near(ipc2152AreaMil2(4, r.warnings[0].riseC, { copperOz: 35 / 25.4 / 1.378 }).area, 54.2501, 1e-5);
    eq(r.warnings[0].currentA, 4);
    // 10 µm copper (0.29 oz) is thinner than the 0.5–3 oz the fit covers: the rise is flagged as indicative.
    r = trace(2, 10);
    eq(codes(r), 'riseHigh,riseRange');
    ok(!r.elements[0].riseFitOk, 'outside the fit');
    eq(LIMITS.riseNoteC, 10);
    eq(LIMITS.riseWarnC, 20);

    // Via: one 0.3 mm via carries 1.9023 A (above). 2 A through one is too much, through two it is fine.
    const via = (count) => analyzePowerPath({ supplyV: 5, currentA: 2, elements: [{ type: 'via', drillMm: 0.3, platingUm: 25, lengthMm: 1.6, count }] });
    r = via(1);
    eq(codes(r), 'viaOver');
    eq(r.warnings[0].perViaA, 2);
    near(r.warnings[0].capacityA, 1.9023, 1e-4);
    eq(r.warnings[0].neededCount, 2);
    eq(codes(via(2)), '');

    // Fixed element: 2 A against a rating of 1.5 A; exactly at the rating is not above it.
    const fixed = (ratedA) => analyzePowerPath({ supplyV: 5, currentA: 2, elements: [{ type: 'fixed', resistanceOhm: 0.02, ratedA }] });
    r = fixed(1.5);
    eq(codes(r), 'fixedOver');
    eq(r.warnings[0].ratedA, 1.5);
    eq(r.warnings[0].currentA, 2);
    eq(codes(fixed(2)), '');
    eq(codes(fixed(undefined)), '');

    // Several at once keep their order: the budget first, then the elements along the path.
    r = analyzePowerPath({
      supplyV: 3.3, currentA: 4, budgetPct: 1,
      elements: [
        { type: 'fixed', resistanceOhm: 0.02, ratedA: 3 },
        { type: 'via', drillMm: 0.3, platingUm: 25, lengthMm: 1.6 },
        { type: 'trace', lengthMm: 10, widthMm: 1, thicknessUm: 35 },
      ],
    });
    eq(r.warnings.map((w) => `${w.code}:${w.index ?? '-'}`).join(), 'budget:-,fixedOver:0,viaOver:1,riseHigh:2');
  }],

  ['dcdrop: invalid input is reported per element and field, without a result', () => {
    const path = (elements, extra = {}) => analyzePowerPath({ supplyV: 5, currentA: 2, elements, ...extra });
    // Zero width, missing length.
    let r = path([{ type: 'trace', lengthMm: 10, widthMm: 0, thicknessUm: 35 }]);
    ok(!r.ok && r.totals === undefined, 'no result');
    eq(errs(r), 'field:0:widthMm');
    eq(errs(path([{ type: 'trace', widthMm: 1, thicknessUm: 35 }])), 'field:0:lengthMm');
    eq(errs(path([{ type: 'fixed', resistanceOhm: 0.01 }, { type: 'plane', lengthMm: NaN, widthMm: -2, thicknessUm: 0 }])), 'field:1:lengthMm,field:1:widthMm,field:1:thicknessUm');
    // Via: geometry and a whole number of vias.
    eq(errs(path([{ type: 'via', drillMm: 0, platingUm: 25, lengthMm: 1.6 }])), 'field:0:drillMm');
    eq(errs(path([{ type: 'via', drillMm: 0.3, platingUm: NaN, lengthMm: 1.6, count: 0 }])), 'field:0:platingUm,field:0:count');
    eq(errs(path([{ type: 'via', drillMm: 0.3, platingUm: 25, lengthMm: 1.6, count: 2.5 }])), 'field:0:count');
    // Fixed: no negative resistance, a rating must be positive when given.
    eq(errs(path([{ type: 'fixed', resistanceOhm: -0.01 }])), 'field:0:resistanceOhm');
    eq(errs(path([{ type: 'fixed' }])), 'field:0:resistanceOhm');
    eq(errs(path([{ type: 'fixed', resistanceOhm: 0.01, ratedA: 0 }])), 'field:0:ratedA');
    // Wire: a gauge within −3 … 40, or an area.
    eq(errs(path([{ type: 'wire', lengthM: 1, awg: 41 }])), 'field:0:awg');
    eq(errs(path([{ type: 'wire', lengthM: 1, awg: -4 }])), 'field:0:awg');
    eq(errs(path([{ type: 'wire', lengthM: 1, awg: NaN }])), 'field:0:awg');
    eq(errs(path([{ type: 'wire', lengthM: 1 }])), 'field:0:areaMm2');
    eq(errs(path([{ type: 'wire', lengthM: 0, areaMm2: 0 }])), 'field:0:lengthM,field:0:areaMm2');
    ok(path([{ type: 'wire', lengthM: 1, awg: -3 }]).ok && path([{ type: 'wire', lengthM: 0.01, awg: 40 }]).ok, 'the ends of the range');
    // Unknown type, a hole in the list.
    eq(errs(path([{ type: 'magic' }, null])), 'type:0,type:1');
    // Path settings.
    eq(errs(path([], { supplyV: 0 })), 'supply');
    eq(errs(path([], { currentA: 0 })), 'current');
    eq(errs(path([], { currentA: -1 })), 'current');
    eq(errs(path([], { tempC: NaN })), 'temp');
    eq(errs(path([], { tempC: 300 })), 'temp');
    eq(errs(path([], { tempC: -80 })), 'temp');
    eq(errs(path([], { budgetPct: 0 })), 'budget');
    eq(errs(path([], { budgetPct: 150 })), 'budget');
    eq(errs(path(Array.from({ length: 21 }, () => ({ type: 'fixed', resistanceOhm: 0.001 })))), 'count');
    ok(path(Array.from({ length: 20 }, () => ({ type: 'fixed', resistanceOhm: 0.001 }))).ok, '20 elements are allowed');
    eq(LIMITS.maxElements, 20);
    // More drop than there is voltage: 2 A · 3 Ω = 6 V on a 5 V supply (and exactly 5 V with 2.5 Ω).
    r = path([{ type: 'fixed', resistanceOhm: 0.1 }, { type: 'fixed', resistanceOhm: 2.9 }]);
    eq(errs(r), 'collapse');
    near(r.errors[0].dropV, 6, 1e-12);
    eq(r.errors[0].supplyV, 5);
    eq(r.errors[0].maxIndex, 1);
    eq(r.errors[0].maxResistanceOhm, 2.9);
    eq(errs(path([{ type: 'fixed', resistanceOhm: 2.5 }])), 'collapse');
    ok(path([{ type: 'fixed', resistanceOhm: 2.4 }]).ok, '4.8 V of drop still leaves 0.2 V');
    // Garbage in, no exception out.
    for (const junk of [undefined, null, {}, 42, 'x', { elements: 'x' }, { supplyV: 5, currentA: 2, elements: [7, 'a', undefined] }]) {
      ok(analyzePowerPath(junk).ok === false, 'rejected');
    }
    eq(errs(analyzePowerPath({ supplyV: 1e308, currentA: 1e308, elements: [{ type: 'fixed', resistanceOhm: 1e-300 }] })), 'range');
  }],

  ['dcdrop: an empty path drops nothing', () => {
    const r = analyzePowerPath({ supplyV: 5, currentA: 2, elements: [] });
    ok(r.ok, 'valid');
    eq(r.elements.length, 0);
    eq(r.totals.resistanceOhm, 0);
    eq(r.totals.dropV, 0);
    eq(r.totals.dropPct, 0);
    eq(r.totals.lossW, 0);
    eq(r.totals.loadV, 5);
    eq(r.totals.loadW, 10);
    eq(r.totals.maxIndex, null);
    ok(!r.totals.hasReturn, 'no return');
    eq(r.warnings.length, 0);
    near(r.totals.budgetV, 0.15, 1e-12);
    ok(analyzePowerPath({ supplyV: 5, currentA: 2 }).ok, 'no list at all is an empty path');
  }],

  // -------------------------------------------------------------------------
  // Page
  // -------------------------------------------------------------------------

  ['dcdrop page: loads without a DOM; the examples compute', () => {
    eq(page.id, 'dcdrop');
    ok(typeof page.mount === 'function' && Array.isArray(page.sections) && page.sections.length === 0, 'custom-mount page');
    for (const l of ['tr', 'en']) ok(Object.keys(page.strings[l]).length > 100, `${l} strings`);
    eq(Object.keys(page.strings.tr).sort().join(), Object.keys(page.strings.en).sort().join(), 'same keys in TR and EN');
    for (const l of ['tr', 'en']) for (const [k, v] of Object.entries(page.strings[l])) ok(typeof v === 'string' && v.length > 0, `${l}: ${k}`);
    eq(Object.keys(EXAMPLES).join(), 'board,motor,usb');
    for (const id of Object.keys(EXAMPLES)) {
      const r = page.compute(exampleState(id));
      ok(r.ok, `${id}: ${JSON.stringify(r.errors)}`);
      ok(r.totals.dropV > 0 && r.totals.loadV > 0 && r.totals.loadV < r.supplyV, `${id} plausible`);
    }
    // Default: 5 V, 2 A, 25 °C. J1 10 mΩ, F1 35 mΩ, trace 30 × 1 mm 1 oz, two vias, trace 20 × 1 mm 1 oz.
    // 1 oz = 1.378 mil = 35.0012 µm: T1 = 1.7578766e-8 · 0.03 / (1e-3 · 35.0012e-6) = 0.01506700 Ω, T2 = 0.01004467 Ω
    // Sum: 0.010 + 0.035 + 0.01506700 + 0.00055094 + 0.01004467 = 0.07066260 Ω → 141.33 mV = 2.8265 % → 4.85867 V
    const r = page.compute();
    eq(r.elements.length, 5);
    near(r.elements[2].thicknessUm, 35.0012, 1e-9);
    near(r.elements[2].resistanceOhm, 0.01506700, 1e-6);
    near(r.totals.resistanceOhm, 0.07066260, 1e-6);
    near(r.totals.dropV, 0.1413252, 1e-6);
    near(r.totals.loadV, 4.8586748, 1e-7);
    eq(r.totals.maxIndex, 1);
    eq(codes(r), '', 'the default example is inside its budget and raises nothing');
    // Motor feed: 12 V, 5 A with the cable back, the shunt and the ground plane on the return path.
    // AWG 18, 0.5 m at 25 °C: 1.7578766e-8 · 0.5 / 0.8230468e-6 = 0.01067908 Ω each way.
    const m = page.compute(exampleState('motor'));
    near(m.elements[3].resistanceOhm, 0.01067908, 1e-6);
    eq(m.elements.filter((e) => e.ret).length, 3);
    ok(m.totals.hasReturn && m.totals.returnDropV > 0.1 && m.totals.feedDropV > 0.15, 'feed and return');
    eq(codes(m), '');
    // USB cable + board: the 1 m AWG 24 cable alone blows the 3 % budget, and 0.8 mm is thin for 3 A.
    const u = page.compute(exampleState('usb'));
    eq(codes(u), 'budget,riseHigh');
    eq(u.totals.maxIndex, 0, 'the cable dominates');
  }],

  ['dcdrop page: every warning and error has a complete text in both languages', () => {
    const keys = Object.keys(page.strings.en);
    for (const code of ['budget', 'riseHigh', 'riseNote', 'riseRange', 'viaOver', 'fixedOver']) ok(keys.includes(`warn_vd_${code}`), code);
    for (const code of ['supply', 'current', 'temp', 'budget', 'count', 'type', 'field', 'fieldCount', 'fieldAwg', 'fieldRes', 'collapse', 'range']) ok(keys.includes(`err_vd_${code}`), code);
    // A path that raises all six warnings at once.
    const st = {
      v: 3.3, i: 4, t: 25, b: 1,
      els: [
        { name: 'F1', type: 'fixed', ret: false, r: 20, imax: 3 },
        { name: 'V1', type: 'via', ret: false, drill: 0.3, plat: 25, board: 1.6, n: 1 },
        { name: 'T1', type: 'trace', ret: false, len: 10, w: 1, th: 1, thu: 'oz', layer: 'ext' },
        { name: 'T2', type: 'trace', ret: false, len: 10, w: 2, th: 1, thu: 'oz', layer: 'int' },
        { name: 'T3', type: 'trace', ret: true, len: 10, w: 3, th: 10, thu: 'um', layer: 'ext' },
      ],
    };
    const r = page.compute(st);
    eq(codes(r), 'budget,fixedOver,riseHigh,riseHigh,riseNote,riseRange,viaOver');
    inBothLanguages((lang) => {
      const html = page.render(r, st);
      const msgs = html.match(/<ul class="msg warn">.*?<\/ul>/s)[0];
      eq(count(msgs, /<li>/g), 7, `${lang}: seven messages`);
      ok(!/\{\w+\}|warn_vd_|undefined|NaN/.test(msgs), `${lang}: ${msgs.match(/.{0,40}(\{\w+\}|warn_vd_|undefined|NaN).{0,20}/)?.[0]}`);
      for (const name of ['F1', 'V1', 'T1', 'T2', 'T3']) ok(msgs.includes(`${name}:`), `${lang}: ${name} is named`);
    });
    // Errors: every kind, written out, naming the element.
    const broken = [
      [{ ...st, v: 0, i: 0, t: 500, b: 0 }, 4],
      [{ ...st, els: [{ name: 'X1', type: 'trace', ret: false, len: NaN, w: 0, th: 1, thu: 'oz', layer: 'ext' }] }, 2],
      [{ ...st, els: [{ name: 'X1', type: 'via', ret: false, drill: 0.3, plat: 25, board: NaN, n: 1.5 }] }, 2],
      [{ ...st, els: [{ name: 'X1', type: 'fixed', ret: false, r: -1, imax: NaN }, { name: '', type: 'wire', ret: false, wlen: 1, size: 99, su: 'awg' }] }, 2],
      [{ ...st, els: [{ name: 'X1', type: 'fixed', ret: false, r: 5000, imax: NaN }] }, 1],
      [{ ...st, els: [{ name: 'X1', type: 'nope', ret: false }] }, 1],
    ];
    inBothLanguages((lang) => {
      for (const [bad, n] of broken) {
        const res = page.compute(bad);
        ok(!res.ok, 'invalid');
        const html = page.render(res, bad);
        ok(html.includes('class="msg error"'), `${lang}: error list`);
        eq(count(html, /<li>/g), n, `${lang}: ${n} messages for ${errs(res)}`);
        ok(!/\{\w+\}|err_vd_|vd_\w+|undefined|NaN/.test(html.replace(/<[^>]*>/g, ' ')), `${lang}: ${html.replace(/<[^>]*>/g, ' ')}`);
        eq(page.diagram(bad, {}, undefined), '', 'nothing is drawn for an invalid path');
        ok(typeof summary(bad, res, '#') === 'string', 'summary of an invalid path');
      }
    });
    const before = getLang();
    setLang('en');
    try {
      const html = page.render(page.compute(broken[2][0]), broken[2][0]);
      ok(html.includes('X1: enter a number greater than zero for “Barrel length”.'), html);
      ok(html.includes('X1: the number of vias in parallel must be a whole number, 1 or more.'), html);
      // The collapse message gives the numbers and the culprit: 4 A · 5 Ω = 20 V on 3.3 V.
      const fall = page.render(page.compute(broken[4][0]), broken[4][0]);
      ok(fall.includes('The total drop (20 V) reaches or exceeds the supply voltage (3.3 V)') && fall.includes('in X1 (5 Ω)'), fall);
      // An element without a name is called by its type and position.
      ok(page.render(page.compute(broken[3][0]), broken[3][0]).includes('Wire 2: the AWG number'), 'fallback name');
    } finally {
      setLang(before);
    }
  }],

  ['dcdrop page: in every calculation step the numbers give the result shown', () => {
    const long = pathOf(12);
    const states = { board: defaultState, motor: () => exampleState('motor'), usb: () => exampleState('usb'), 'all types': () => pathOf(5), '12 elements': () => long };
    inBothLanguages((lang) => {
      for (const [name, make] of Object.entries(states)) {
        const st = make();
        const seen = recordedSteps(st);
        const where = `${lang} · ${name}`;
        ok(page.compute(st).ok, where);
        const wrong = [];
        let checked = 0;
        for (const s of seen) {
          ok(typeof s.sym === 'string' && s.sym.length > 0 && typeof s.res === 'string', `${where}: a step without formula or result`);
          if (!s.num) continue;
          const calc = evaluate(s.num); // throws when a step cannot be evaluated: none may be skipped here
          const shown = evaluate(s.res);
          checked++;
          // Same units on both sides, so no power of ten is forgiven: 1 % covers the rounding of the values shown.
          if (!agrees(calc, shown) || !(Math.abs(calc / shown - 1) < 0.01)) wrong.push(`${s.labelRaw ?? s.label}: ${s.num} → ${calc}, shown ${s.res}`);
        }
        ok(wrong.length === 0, `\n${where}\n${wrong.join('\n')}`);
        // One drop per element, one resistance per element that is not a fixed one, five totals
        // (the sum of more than eight resistances is not written out).
        const n = st.els.length;
        const fixed = st.els.filter((e) => e.type === 'fixed').length;
        eq(seen.length, 2 * n - fixed + 5, `${where}: number of steps`);
        eq(checked, 2 * n - fixed + (n >= 2 && n <= 8 ? 5 : 4), `${where}: evaluated steps`);
      }
    });
    // The steps of the default example, written out (English).
    const before = getLang();
    setLang('en');
    try {
      const html = page.render(page.compute(), defaultState());
      const plain = [...html.matchAll(/data-plain="([^"]*)"/g)].map((m) => m[1]);
      const has = (s) => ok(plain.includes(s), `${s}\n${plain.join('\n')}`);
      has('F1 (Fixed) · voltage drop: ΔV = I · R = 2 A · 35 mΩ = 70 mV');
      // 17.58 nΩ·m · 30 mm / (1 mm · 35 µm) = 15.07 mΩ; · 2 A = 30.13 mV
      has('F1 → via (Trace) · resistance: R = (ρ · L)/(w · t) = (17.58 nΩ·m · 30 mm)/(1 mm · 35 µm) = 15.07 mΩ');
      has('F1 → via (Trace) · voltage drop: ΔV = I · R = 2 A · 15.07 mΩ = 30.13 mV');
      has('via (Via) · resistance: R = (ρ · L)/(n · π · (r_o^2 − r_i^2)) = (17.58 nΩ·m · 1.6 mm)/(2 · π · ((0.175 mm)^2 − (0.15 mm)^2)) = 550.9 µΩ');
      has('Total resistance: R_tot = 10 mΩ + 35 mΩ + 15.07 mΩ + 550.9 µΩ + 10.04 mΩ = 70.66 mΩ');
      has('Total voltage drop: ΔV_tot = I · R_tot = 2 A · 70.66 mΩ = 141.3 mV');
      has('Drop as a share of the supply voltage: (ΔV_tot)/V_S = 141.3 mV/5 V = 2.83 %');
      has('Voltage at the load: V_L = V_S − ΔV_tot = 5 V − 141.3 mV = 4.859 V');
      has('Total loss: P_tot = I^2 · R_tot = (2 A)^2 · 70.66 mΩ = 282.7 mW');
      // Path order: the steps of an element come before those of the next one, the totals last.
      const at = (s) => plain.findIndex((x) => x.startsWith(s));
      ok(at('J1 (Fixed)') < at('F1 (Fixed)') && at('F1 (Fixed)') < at('F1 → via') && at('via → U1') < at('Total resistance'), 'order of the steps');
      // A plane and a wire in the motor example.
      const motor = page.render(page.compute(exampleState('motor')), exampleState('motor'));
      ok(motor.includes('data-plain="GND (Plane) · resistance: R = ρ/t · L/w = 17.58 nΩ·m/70 µm · 40 mm/20 mm = 502.2 µΩ"'), 'plane step');
      ok(motor.includes('data-plain="Cable (+) (Wire) · resistance: R = (ρ · L)/A = (17.58 nΩ·m · 500 mm)/0.823 mm² = 10.68 mΩ"'), 'wire step');
    } finally {
      setLang(before);
    }
  }],

  ['dcdrop page: the drawing is clean SVG with identical geometry in TR and EN (1, 5, 20 elements)', () => {
    const paths = { '1 element': pathOf(1), '5 elements': pathOf(5), '20 elements': pathOf(20), 'default': defaultState(), 'usb': exampleState('usb') };
    const geo = new Map();
    const size = new Map();
    const problems = [];
    inBothLanguages((lang) => {
      for (const [name, st] of Object.entries(paths)) {
        const r = page.compute(st);
        ok(r.ok, `${name}: ${JSON.stringify(r.errors)}`);
        const out = drawPath(r);
        const n = st.els.length;
        for (const b of svgProblems(out)) problems.push(`${lang} · ${name}: ${b}`);
        const g = geometry(out).join('|');
        if (geo.has(name) && geo.get(name) !== g) problems.push(`${name}: geometry differs between TR and EN`);
        geo.set(name, g);
        // The labels do follow the language: a decimal comma in Turkish only.
        ok(/>[^<]*\d,\d[^<]*</.test(out) === (lang === 'tr'), `${lang} · ${name}: decimal separator of the labels`);
        const [w, h] = viewBox(out);
        size.set(name, [w, h]);
        // The staircase: two points per element plus the two ends, never rising, from the supply to the load voltage.
        const pts = stairs(out);
        eq(pts.length, 2 * n + 2, `${name}: points of the staircase`);
        for (let k = 1; k < pts.length; k++) ok(pts[k][0] >= pts[k - 1][0] && pts[k][1] >= pts[k - 1][1], `${name}: the staircase goes right and down`);
        eq(pts[0][1], 36, `${name}: starts at the top of the plot`);
        ok(pts[pts.length - 1][1] <= 186 && pts[pts.length - 1][1] > 36, `${name}: ends inside the plot`);
        // Equal column widths: the steps are evenly spaced (coordinates are written with one decimal).
        const xs = pts.filter((_, k) => k % 2 === 1 && k < pts.length - 1).map((p) => p[0]);
        for (let k = 2; k < xs.length; k++) ok(Math.abs((xs[k] - xs[k - 1]) - (xs[1] - xs[0])) <= 0.11, `${name}: column ${k}`);
        // One highlighted column, the budget line, one symbol per element (plus the legend).
        eq(count(out, /<rect class="zone"/g), 1, `${name}: highlighted element`);
        eq(count(out, /<path class="wave2"/g), 1, `${name}: budget line`);
        const types = new Set(st.els.map((e) => e.type));
        eq(count(out, /class="cu"|class="comp"|class="wire"/g), n + types.size, `${name}: symbols`);
        // Names: flat up to five elements, rotated beyond that; every label inside the drawing.
        eq(count(out, /transform="rotate\(-45 /g), n > 5 ? n : 0, `${name}: rotated names`);
        for (const [, tx, ty] of out.matchAll(/<text[^>]* x="([^"]*)" y="([^"]*)"/g)) {
          ok(Number(tx) >= 0 && Number(tx) <= w && Number(ty) > 0 && Number(ty) < h, `${name}: text at ${tx},${ty} in ${w}×${h}`);
        }
        // Return elements are bracketed and named as such.
        const word = lang === 'tr' ? 'dönüş' : 'return';
        eq(out.includes(`>${word}</text>`), st.els.some((e) => e.ret), `${name}: return bracket`);
      }
    });
    ok(problems.length === 0, `\n${[...new Set(problems)].slice(0, 12).join('\n')}`);
    // The width is the same up to eleven elements and grows beyond; rotated names need more height.
    eq(size.get('1 element')[0], size.get('5 elements')[0]);
    ok(size.get('20 elements')[0] > size.get('5 elements')[0] + 150, `width ${size.get('20 elements')[0]}`);
    ok(size.get('20 elements')[0] <= 720, 'still fits a page');
    ok(size.get('20 elements')[1] > size.get('5 elements')[1], 'height for rotated names');
    // Long names are cut, never the geometry: 24 × "W" does not appear in full in a narrow column.
    ok(!drawPath(page.compute(pathOf(20))).includes('W'.repeat(24)), 'clipped label');
    // The largest drop of the USB example is the first element; an overloaded trace is marked in the label colour.
    const before = getLang();
    setLang('en');
    try {
      const usb = drawPath(page.compute(exampleState('usb')));
      ok(usb.includes('<rect class="zone" x="58"'), 'first column highlighted');
      ok(/<text class="badt"[^>]*>VBUS → U1<\/text>/.test(usb), 'trace above 20 °C');
      ok(/<text class="badt"[^>]*>budget 4\.85 V<\/text>/.test(usb), 'budget exceeded');
      const board = drawPath(page.compute());
      ok(/<text class="lbl"[^>]*>budget 4\.85 V<\/text>/.test(board) && board.includes('>4.859 V</text>') && board.includes('>5 V</text>'), 'voltages of the default example');
      ok(board.includes('>−70 mV</text>') && board.includes('>F1</text>'), 'drop and name of the fuse');
    } finally {
      setLang(before);
    }
    // No result, no drawing; an empty path still draws (flat line, no highlight).
    eq(drawPath(undefined), '');
    eq(drawPath({ ok: false, errors: [] }), '');
    const empty = drawPath(analyzePowerPath({ supplyV: 5, currentA: 2, elements: [] }));
    eq(svgProblems(empty).join(), '');
    eq(count(empty, /<rect class="zone"/g), 0);
    eq(stairs(empty).length, 2);
    // The page object gives the default drawing to the shared diagram test.
    ok(page.diagram(undefined, {}, undefined).startsWith('<svg'), 'default drawing');
    // The checker itself notices a decimal comma.
    ok(svgProblems('<svg viewBox="0 0 10 10"><rect class="a" x="1,5" y="2" width="3" height="4"/></svg>').length > 0, 'rect');
    ok(svgProblems('<svg viewBox="0 0 10 10"><path class="a" d="M1,5,2V3"/></svg>').length > 0, 'path');
    ok(svgProblems('<svg viewBox="0 0 10 10"><polyline class="a" points="1,5,2 3,4"/></svg>').length > 0, 'points');
    ok(svgProblems('<svg viewBox="0 0 10 10"><text style="font-size:1,5px" x="1" y="2">a</text></svg>').length > 0, 'style');
    ok(svgProblems('<svg viewBox="0 0 10 10"><text x="1" y="2" transform="rotate(-45 1,5 2)">a</text></svg>').length > 0, 'transform');
    ok(svgProblems('<svg viewBox="0 0 10 10"><path class="a" d="M1.5,2V3"/><text x="1.5" y="2" transform="rotate(-45 1.5 2)">a</text></svg>').length === 0, 'clean');
  }],

  ['dcdrop page: the path survives the URL round trip', () => {
    inBothLanguages((lang) => {
      eq(toQuery(defaultState()), '', `${lang}: the default example needs no parameters`);
      eq(toQuery(exampleState('motor')), 'ex=motor', lang);
      eq(toQuery(fromParams(new URLSearchParams('ex=usb'))), 'ex=usb', lang);
      eq(toQuery(fromParams(new URLSearchParams(''))), '', lang);
    });
    const st = pathOf(10);
    st.els[0] = { name: 'J1_VBUS & co=1', type: 'fixed', ret: false, r: 0, imax: NaN };
    st.els[1].name = 'Çıkış izi → U3';
    st.els[2].name = 'a_b_c';
    const q = toQuery(st);
    const back = fromParams(new URLSearchParams(q));
    eq(toQuery(back), q, 'stable');
    eq(back.v, 12.5);
    eq(back.i, 2.75);
    eq(back.t, 37.5);
    eq(back.b, 2.5);
    eq(back.els.length, 10);
    eq(back.els[0].name, 'J1_VBUS & co=1');
    eq(back.els[0].r, 0, 'a 0 mΩ link stays 0');
    ok(Number.isNaN(back.els[0].imax), 'an empty rating stays empty');
    eq(JSON.stringify(back.els[1]), JSON.stringify({ name: 'Çıkış izi → U3', type: 'trace', ret: false, len: 23.5, w: 1.25, th: 1, thu: 'oz', layer: 'int' }));
    eq(JSON.stringify(back.els[2]), JSON.stringify({ name: 'a_b_c', type: 'via', ret: false, drill: 0.35, plat: 22.5, board: 1.55, n: 3 }));
    eq(JSON.stringify(back.els[3]), JSON.stringify({ name: 'GND 4', type: 'plane', ret: true, len: 37.5, w: 12.5, th: 52.5, thu: 'um' }));
    eq(JSON.stringify(back.els[4]), JSON.stringify({ name: 'W'.repeat(24), type: 'wire', ret: true, wlen: 0.35, size: 20, su: 'awg' }));
    eq(back.els[5].imax, 6.5);
    eq(JSON.stringify(back.els[9]), JSON.stringify({ name: 'W'.repeat(24), type: 'wire', ret: true, wlen: 0.35, size: 0.75, su: 'mm2' }));
    // Same analysis before and after.
    near(page.compute(back).totals.dropV, page.compute(st).totals.dropV, 1e-12);
    // Engine input: units of the engine, only the values of the type.
    const p = toPath(back);
    eq(p.supplyV, 12.5);
    eq(p.budgetPct, 2.5);
    eq(JSON.stringify(p.elements[0]), JSON.stringify({ name: 'J1_VBUS & co=1', type: 'fixed', ret: false, resistanceOhm: 0, ratedA: NaN }));
    near(p.elements[5].resistanceOhm, 0.0125, 1e-12); // 12.5 mΩ
    near(p.elements[1].thicknessUm, 35.0012, 1e-9); // 1 oz = 1.378 mil · 25.4
    eq(p.elements[1].layer, 'internal');
    eq(p.elements[3].thicknessUm, 52.5);
    eq(p.elements[2].lengthMm, 1.55);
    eq(p.elements[2].count, 3);
    eq(p.elements[4].awg, 20);
    ok(p.elements[4].areaMm2 === undefined && p.elements[9].awg === undefined, 'a wire is given one way');
    eq(p.elements[9].areaMm2, 0.75);
    eq(p.elements[9].lengthM, 0.35);
    // An unnamed element is called by its type and position.
    ok(/ 3$/.test(toPath(pathOf(5)).elements[2].name), toPath(pathOf(5)).elements[2].name);
    // The largest path with plain names keeps to the characters a lesson link accepts and fits a saved calculation.
    const big = pathOf(20);
    big.els.forEach((e, k) => { e.name = `E${k + 1}`; });
    const bq = toQuery(big);
    ok(/^[\w.%=&-]*$/.test(bq), bq);
    ok(bq.length < 2000, `query of ${bq.length} characters`);
    eq(fromParams(new URLSearchParams(bq)).els.length, 20);
  }],

  ['dcdrop page: the URL is restored defensively', () => {
    const P = (q) => fromParams(new URLSearchParams(q));
    // Nothing usable: the default example, never an exception.
    for (const junk of [null, undefined, {}, 'e=1', 42]) eq(toQuery(fromParams(junk)), '', 'not URL parameters → default');
    eq(toQuery(P('ex=nope')), '');
    eq(toQuery(P('foo=bar&x')), '');
    // Bad path settings fall back: 5 V, 2 A, 25 °C, 3 %.
    let st = P('p=abc_-1_900_0&e=f_0_10__R');
    eq(`${st.v},${st.i},${st.t},${st.b}`, '5,2,25,3');
    st = P('p=3,3_0,5_-40_150&e=f_0_10__R');
    eq(`${st.v},${st.i},${st.t},${st.b}`, '3.3,0.5,-40,3', 'comma decimals are read; a budget above 100 % is not');
    // Elements alone keep the default settings; settings alone get one element.
    st = P('e=t_1_12_0.4_2_oz_int_GND izi');
    eq(`${st.v},${st.i},${st.t},${st.b}`, '5,2,25,3');
    eq(JSON.stringify(st.els), JSON.stringify([{ name: 'GND izi', type: 'trace', ret: true, len: 12, w: 0.4, th: 2, thu: 'oz', layer: 'int' }]));
    st = P('p=12_3_25_5');
    eq(st.els.length, 1);
    eq(st.els[0].type, 'trace');
    ok(page.compute(st).ok, 'computes');
    // Bad element values fall back to those of a new element of that type.
    st = P('e=t_x_-5_abc_0_furlong_up_T&e=p_1_0_0_70_um_P&e=v_0_0_x_-1_2.5_V&e=f_0_-3_-1_F&e=w_0_0_99_awg_W&e=w_0_2_-1_mm2_&e=zz_0_&e=');
    eq(JSON.stringify(st.els[0]), JSON.stringify({ name: 'T', type: 'trace', ret: false, len: 20, w: 1, th: 1, thu: 'oz', layer: 'ext' }));
    eq(JSON.stringify(st.els[1]), JSON.stringify({ name: 'P', type: 'plane', ret: true, len: 20, w: 10, th: 70, thu: 'um' }));
    eq(JSON.stringify(st.els[2]), JSON.stringify({ name: 'V', type: 'via', ret: false, drill: 0.3, plat: 25, board: 1.6, n: 1 }));
    eq(st.els[3].r, 10);
    ok(Number.isNaN(st.els[3].imax), 'a bad rating is empty');
    eq(JSON.stringify(st.els[4]), JSON.stringify({ name: 'W', type: 'wire', ret: false, wlen: 1, size: 22, su: 'awg' }));
    eq(JSON.stringify(st.els[5]), JSON.stringify({ name: '', type: 'wire', ret: false, wlen: 2, size: 0.5, su: 'mm2' }));
    eq(st.els[6].type, 'trace', 'unknown type');
    eq(st.els.length, 8);
    ok(page.compute(st).ok, 'still a valid path');
    // Too many rows are cut to the limit; long names and control characters are cleaned.
    st = P(`${'e=f_0_1__x&'.repeat(40)}e=f_0_1__${'y'.repeat(100)}`);
    eq(st.els.length, 20);
    eq(P(`e=f_0_1__${'y'.repeat(100)}`).els[0].name, 'y'.repeat(24));
    eq(P('e=f_0_1__a%00b%1Fc%7F').els[0].name, 'abc');
    eq(P('e=f_0_1__%20%20padded%20').els[0].name, 'padded');
    // Inherited property names are not element types.
    eq(P('e=constructor_0_1').els[0].type, 'trace');
    eq(P('e=__proto___0_1').els[0].type, 'trace');
    // Cut off in the middle, absurd magnitudes: no exception anywhere, in either language.
    for (const q of ['p=5_2_25_3&e=f_0_10__J%2', 'p=1e308_1e308_25_3&e=f_0_1e300', 'e=w_0_1e-300_40_awg', 'e=t_0_1e9_1e-9_1e-9_um_ext', 'p=&e=_&e=__&e=___', 'e=v_0_1e-9_1e9_1e9_1e15', 'p=5_1e-12_25_1e-12&e=f_0_0']) {
      st = P(q);
      const res = page.compute(st);
      inBothLanguages((lang) => {
        const html = page.render(res, st);
        ok(typeof html === 'string' && html.length > 0, `${lang}: ${q}`);
        const dg = page.diagram(st, {}, res.ok ? res : undefined);
        ok(typeof dg === 'string' && (dg === '' || svgProblems(dg).length === 0), `${lang}: drawing of ${q}: ${dg && svgProblems(dg).join()}`);
        ok(typeof summary(st, res, 'x') === 'string' && typeof formHtml(st) === 'string', `${lang}: summary and form of ${q}`);
        eq(toQuery(fromParams(new URLSearchParams(toQuery(st)))), toQuery(st), `${lang}: stable ${q}`);
      });
    }
  }],

  ['dcdrop page: the result renders in TR and EN in the agreed order, with table, note and sources', () => {
    inBothLanguages((lang) => {
      for (const st of [defaultState(), exampleState('motor'), exampleState('usb'), pathOf(1), pathOf(20)]) {
        const r = page.compute(st);
        const html = page.render(r, st);
        const where = `${lang} (${st.els.length} elements)`;
        const plain = html.replace(/<[^>]*>/g, ' ');
        ok(!/NaN|undefined|Infinity|\bvd_\w+|tool_|\{\w+\}/.test(plain), `${where}: ${plain.match(/.{0,30}(NaN|undefined|Infinity|vd_\w+|tool_|\{\w+\}).{0,30}/)?.[0]}`);
        eq(count(html, /<math>/g), count(html, /<\/math>/g), `${where}: balanced <math>`);
        ok(!/<mi>(frac|sqrt|text|cdot|times)<\/mi>/.test(html), `${where}: unparsed formula command`);
        ok(!/<m(i|n|text)>[^<]*(NaN|undefined|Infinity|—)[^<]*</.test(html), `${where}: a step without its value`);
        // Order on the page: headline values, warnings, (drawing, added by mount), steps, table, sources.
        const at = ['class="heroes"', 'class="block steps"', 'class="table-scroll"', 'class="refs"'].map((s) => html.indexOf(s));
        ok(at.every((x, k) => x >= 0 && (k === 0 || x > at[k - 1])), `${where}: order ${at}`);
        if (r.warnings.length) ok(html.indexOf('class="msg warn"') > at[0] && html.indexOf('class="msg warn"') < at[1], `${where}: warnings after the values`);
        eq(count(html, /<div class="hero">/g), 4, `${where}: four headline values`);
        // One table row per element, the largest drop highlighted, a total row.
        const table = html.match(/<table class="grid">.*?<\/table>/s)[0];
        eq(count(table, /<tr/g), st.els.length + 2, `${where}: rows`);
        eq(count(table, /<tr class="on-row">/g), 1, `${where}: highlighted row`);
        ok(table.includes('<tfoot>') && table.includes('100 %'), `${where}: total row`);
      }
    });
    const before = getLang();
    setLang('en');
    try {
      const st = exampleState('usb');
      const r = page.compute(st);
      const html = page.render(r, st);
      // 3 A through 226.9 mΩ: 680.7 mV = 13.6 % of 5 V, 4.319 V at the load, 9 · 0.2269 = 2.042 W.
      const hero = (label) => html.match(new RegExp(`<div class="hero-label">${label}</div>.*?<div class="hero-value">(.*?)</div>.*?<div class="hero-sub">(.*?)</div>`, 's')).slice(1).map((s) => s.replace(/<[^>]*>/g, ''));
      eq(hero('Total voltage drop').join(' | '), '680.7 mV | 13.6 % of the supply · budget 3 % (150 mV)');
      eq(hero('Voltage at the load').join(' | '), '4.319 V | from 5 V at 3 A · feed −390.8 mV · return −289.8 mV');
      eq(hero('Total loss').join(' | '), '2.042 W | total resistance 226.9 mΩ · 12.96 W reaches the load');
      eq(hero('Largest drop').join(' | '), '257.6 mV | Cable VBUS · 37.8 % of the total drop');
      ok(html.includes('VBUS → U1: IPC-2152 temperature rise ≈ 25.7 °C at 3 A, above 20 °C.'), 'riseHigh text');
      ok(html.includes('The total drop is 680.7 mV, 13.6 % of the supply, above the budget of 3 % (150 mV). The largest share is in Cable VBUS (37.8 %).'), 'budget text');
      // Table: the check column of a trace, a plane, a fixed element and a wire.
      ok(html.includes('ΔT ≈ 25.7 °C (IPC-2152)') && html.includes('IPC-2221, external: 24.2 °C') && html.includes('J = 107 A/mm²'), 'trace check');
      ok(html.includes('502 µΩ/□ × 1.5 squares') && html.includes('3 A of 4 A rated (75 %)') && html.includes('AWG 24 · ⌀ 0.511 mm · 0.205 mm²'), 'other checks');
      ok(html.includes('1 A per via · capacity 1.9 A (53 %)') === false && page.render(page.compute(), defaultState()).includes('1 A per via · capacity 1.9 A (53 %)'), 'via check of the default example');
      // The note says what is left out; the sources are the standards the engines use.
      for (const s of ['current crowding', 'uneven current sharing', 'wear and temperature', 'AC effects', 'spread over the full width']) ok(html.includes(s), `note: ${s}`);
      for (const s of ['IPC-2152 (2009), Standard for Determining Current Carrying Capacity in Printed Board Design', 'IPC-2221B (2012), Generic Standard on Printed Board Design', 'ASTM B258']) ok(html.includes(s), `source: ${s}`);
      // The form explains the plane assumption and the return path; the default state is one of the examples.
      const form = formHtml(st);
      ok(form.includes('spread evenly over the full width') && form.includes('mark them “Return”'), 'form note');
      eq(count(form, /data-ex="/g), 3, 'example chips');
      eq(count(form, /data-add="/g), 5, 'one add button per type');
      eq(count(form, /data-del="/g), 7, 'one remove button per element');
      ok(form.includes('7 / 20'), 'counter');
      ok(!form.includes('aria-invalid'), 'nothing invalid in an example');
      // Empty and bad values are marked in the form as soon as it is drawn; an empty rating is fine.
      const bad = exampleState('usb');
      bad.v = NaN;
      bad.els[0].wlen = NaN;
      bad.els[0].size = 99;
      bad.els[1].imax = NaN;
      eq(count(formHtml(bad), /aria-invalid="true"/g), 3, 'marked fields');
      // The text summary carries inputs and results.
      const text = summary(st, r, 'https://example.test/#/dcdrop?ex=usb');
      for (const s of ['Power path voltage drop', 'Supply voltage: 5 V · Load current: 3 A · Copper temperature: 25 °C · Drop budget: 3 %',
        '4. VBUS → U1 [Trace]: 15 mm × 0.8 mm · 1 oz · External', '7. Cable GND [Wire, Return]: AWG 24 · 1 m',
        'Total voltage drop: 680.7 mV (13.6 %; Drop budget 3 % = 150 mV)', 'Voltage at the load: 4.319 V (feed −390.8 mV · return −289.8 mV)',
        'Largest drop: Cable VBUS, 257.6 mV (37.8 %)', '2. J1 VBUS: Resistance 10 mΩ · Drop 30 mV · Loss 90 mW · Share 4.41 % · 3 A of 5 A rated (60 %)']) ok(text.includes(s), `${s}\n${text}`);
    } finally {
      setLang(before);
    }
  }],

  ['dcdrop page: names typed by the user are escaped everywhere', () => {
    const evil = '<img src=x onerror=a()>'; // 23 characters
    const st = {
      v: 5, i: 3, t: 25, b: 1,
      els: [
        { name: evil, type: 'trace', ret: false, len: 30, w: 0.5, th: 1, thu: 'oz', layer: 'ext' },
        { name: 'a" onfocus="x()', type: 'fixed', ret: false, r: 20, imax: 1 },
        { name: 'R&D <b>"q"</b>', type: 'via', ret: true, drill: 0.3, plat: 25, board: 1.6, n: 1 },
        { name: '$&{pct}\\frac{1}{2}', type: 'fixed', ret: false, r: 50, imax: 2 },
        { name: "'</text><script>", type: 'wire', ret: true, wlen: 1, size: 24, su: 'awg' },
      ],
    };
    const back = fromParams(new URLSearchParams(toQuery(st)));
    eq(back.els.map((e) => e.name).join('|'), st.els.map((e) => e.name).join('|'), 'the names themselves are kept');
    const r = page.compute(back);
    ok(r.ok && r.warnings.length >= 5, 'warnings carry the names');
    inBothLanguages((lang) => {
      const broken = { ...back, els: back.els.map((e, k) => (k === 0 ? { ...e, w: 0 } : e)) };
      const out = [page.render(r, back), drawPath(r), page.render(page.compute(broken), broken), formHtml(back)];
      for (const html of out) {
        ok(!/<img|<script|<b>|onfocus="x|<\/text><script/.test(html), `${lang}: markup from a name got through`);
        // No attribute is closed early by a quote from a name.
        ok(!/="[^"]*"q"/.test(html), `${lang}: a quote from a name ends an attribute`);
      }
      // Shown as text: in the warnings, the steps, the table and the headline values.
      ok(out[0].includes('&lt;img src=x onerror=a()&gt;:'), `${lang}: warning names the trace`);
      ok(out[0].includes('R&amp;D &lt;b&gt;&quot;q&quot;&lt;/b&gt;'), `${lang}: <, " and & of a name`);
      ok(out[0].includes('data-plain="&lt;img src=x onerror=a()&gt; ('), `${lang}: step label`);
      ok(out[0].includes('a&quot; onfocus=&quot;x()'), `${lang}: quotes`);
      // "$&" and "{pct}" inside a name are not expanded by the message templates (it is the largest drop and over its rating).
      eq(count(out[0], /\$&amp;\{pct\}/g) >= 4, true, `${lang}: name with $& and a placeholder: ${count(out[0], /\$&amp;\{pct\}/g)}`);
      // The drawing: text nodes only, still clean SVG. Flat labels of five columns hold nine characters.
      ok(out[1].includes('>&lt;img src…</text>') && out[1].includes('>R&amp;D &lt;b&gt;&quot;…</text>'), `${lang}: clipped and escaped labels`);
      ok(svgProblems(out[1]).length === 0, `${lang}: ${svgProblems(out[1]).join()}`);
      // The error list of a broken path names the element.
      ok(out[2].includes('class="msg error"') && out[2].includes('&lt;img src=x onerror=a()&gt;:'), `${lang}: error text names the element`);
      // In the form the names are attribute values.
      ok(out[3].includes('value="&lt;img src=x onerror=a()&gt;"') && out[3].includes('value="a&quot; onfocus=&quot;x()"'), `${lang}: form values`);
      ok(out[3].includes('value="R&amp;D &lt;b&gt;&quot;q&quot;&lt;/b&gt;"'), `${lang}: form value with &, < and "`);
      ok(summary(back, r, '#').includes(`1. ${evil} [`) && summary(back, r, '#').includes('$&{pct}\\frac{1}{2}'), `${lang}: the plain-text summary keeps the names as typed`);
    });
    // Longer than 24 characters is cut on the way in.
    eq(fromParams(new URLSearchParams(`e=f_0_1__${'<'.repeat(60)}`)).els[0].name.length, 24);
  }],
];
