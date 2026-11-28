// Termination and timing budget (src/engine/termination.js, src/pages/termination.js).
// Expected values are worked out by hand in the comments. Independent checks:
// the Thévenin levels against the node equation of the three resistors, the
// power of the AC termination against a time-domain simulation of the RC
// branch, and the margins against the event times of the timing diagram.

import { near, eq, ok } from '../assert.js';
import {
  termination, lineCheck, seriesTermination, parallelTermination, theveninTermination, acTermination, timingBudget,
  propagationDelay, TPD_MICROSTRIP, TPD_STRIPLINE, LUMPED_DIVISOR, AC_TAU_FACTOR, CAP_SERIES, MODES,
} from '../../src/engine/termination.js';
import { registerStrings, setLang, getLang } from '../../src/i18n.js';
import { stepsTrace, parseNumber } from '../../src/ui/calculator.js';
import { evaluate, agrees } from './arith.js';
import page from '../../src/pages/termination.js';

registerStrings(page.strings);

const TPD = 6.06e-9; // s/m = 6.06 ps/mm, FR-4 microstrip
// 100 mm of 50 Ω trace behind a 20 Ω driver, 3.3 V, 1 ns edges: t_d = 100 mm · 6.06 ps/mm = 606 ps.
const base = { lengthM: 0.1, tpdSPerM: TPD, z0: 50, rout: 20, vdd: 3.3, trS: 1e-9, series: 'E24' };
const limits = { iMaxA: 0.024, vih: 2.0, vil: 0.8 };
// 50 MHz link (T = 20 ns), t_co = 1 … 8 ns, t_su = 3 ns, t_h = 0.5 ns, t_unc = 0.2 ns, 100 mm of data trace (0.606 ns).
const link = {
  mode: 'timing', lengthM: 0.1, tpdSPerM: TPD, fHz: 50e6, tcoMaxS: 8e-9, tcoMinS: 1e-9, tsuS: 3e-9, thS: 0.5e-9, tuncS: 0.2e-9,
  n: 1, clocking: 'common', skewS: 0,
};
const ns = (x) => x * 1e9;
const run = (mode, o = {}) => termination({ ...base, ...limits, mode, ...o });
const timing = (o = {}) => termination({ ...link, ...o });

/** True when no number anywhere in the result is NaN or infinite. */
function finiteAll(x) {
  if (typeof x === 'number') return Number.isFinite(x);
  if (x && typeof x === 'object') return Object.values(x).every(finiteAll);
  return true;
}

/**
 * Independent reference for the AC termination: the RC branch behind a square
 * wave 0 … V_DD, integrated in time (midpoint rule) until it repeats; returns
 * the average power in the resistance.
 */
function simulateAcPower({ r, c, vdd, f }) {
  const T = 1 / f;
  const steps = 4000;
  const dt = T / steps;
  const tau = r * c;
  let vc = vdd / 2;
  let energy = 0;
  for (let cycle = 0; cycle < 80; cycle++) {
    energy = 0;
    for (let i = 0; i < steps; i++) {
      const vs = i < steps / 2 ? vdd : 0;
      const vm = vc + ((vs - vc) / tau) * (dt / 2);
      energy += ((vs - vm) ** 2 / r) * dt;
      vc += ((vs - vm) / tau) * dt;
    }
  }
  return energy / T;
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
/** Problems of a diagram: a missing number, a comma in geometry, a box of negative size or outside the drawing. */
function svgProblems(full) {
  const bad = [];
  if (/NaN|undefined|Infinity/.test(full)) bad.push('NaN/undefined/Infinity');
  const [, , , W, H] = full.match(/viewBox="(\S+) (\S+) (\S+) (\S+)"/).map(Number);
  // Schematic symbols are drawn around their own origin inside a translated group; only its position counts.
  const svgText = full.replace(/<g transform="translate\(([-\d.]+),([-\d.]+)\)[^"]*">.*?<\/g>/g, (m, x, y) => `<circle cx="${x}" cy="${y}" r="1"/>`);
  for (const [, x, y] of svgText.matchAll(/<circle[^>]*\scx="([^"]*)" cy="([^"]*)"/g)) {
    if (!(Number(x) >= 0 && Number(x) <= W && Number(y) >= 0 && Number(y) <= H)) bad.push(`symbol at ${x},${y}`);
  }
  for (const [, tag, attrs] of svgText.matchAll(/<(rect|circle|text)\b([^>]*)>/g)) {
    const a = Object.fromEntries([...attrs.matchAll(/\s(x|y|cx|cy|r|width|height)="([^"]*)"/g)].map(([, k, val]) => [k, val]));
    for (const [k, val] of Object.entries(a)) if (!/^-?\d+(\.\d+)?$/.test(val)) bad.push(`${tag} ${k}="${val}"`);
    if (tag === 'rect') {
      const [x, y, w, h] = [a.x, a.y, a.width, a.height].map(Number);
      if (a.x !== undefined && (w < 0 || h < 0 || x < 0 || y < 0 || x + w > W + 0.5 || y + h > H + 0.5)) bad.push(`rect ${x},${y} ${w}×${h}`);
    }
  }
  for (const [, val] of svgText.matchAll(/\s(?:d|points)="([^"]*)"/g)) {
    const nums = (val.match(/-?\d+(\.\d+)?(e[-+]?\d+)?/gi) ?? []).map(Number);
    if (nums.some((x) => x < -0.5 || x > Math.max(W, H) + 0.5)) bad.push(`path outside the drawing: ${val.slice(0, 40)}`);
    if (/\d,\d+,\d/.test(val.replace(/[A-Za-z]/g, ' '))) bad.push(`comma in ${val.slice(0, 40)}`);
  }
  return bad;
}
const geometryCount = (svgText) => [...svgText.matchAll(/\s(?:d|points|transform|x|y|width|height)="([^"]*)"/g)]
  .reduce((n, [, val]) => n + (val.match(/-?(\d+\.?\d*|\.\d+)/g) ?? []).length, 0);

export const cases = [
  ['termination: propagation delay comes from the signal engine', () => {
    // t_pd = √εeff / c: √3.3 = 1.816590 → 1.816590 / 299.792458 mm/ns = 6.0595 ps/mm; √4.3 = 2.073644 → 6.9169 ps/mm.
    near(TPD_MICROSTRIP * 1e9, 6.0595, 1e-4);
    near(TPD_STRIPLINE * 1e9, 6.9169, 1e-4);
    // Air: 1 / c = 3.33564 ns/m.
    near(propagationDelay(1) * 1e9, 3.33564, 1e-5);
    eq(LUMPED_DIVISOR, 6);
    eq(AC_TAU_FACTOR, 3);
    eq(MODES.length, 5);
  }],

  ['termination: one-way delay, critical length and the t_r/6 rule of thumb', () => {
    // t_d = 0.1 m · 6.06 ns/m = 606 ps; t_r/6 = 166.67 ps; l_crit = 1 ns / (6 · 6.06 ps/mm) = 27.503 mm
    const l = lineCheck({ lengthM: 0.1, tpdSPerM: TPD, trS: 1e-9 });
    near(l.tdS, 606e-12, 1e-9);
    near(l.roundTripS, 1.212e-9, 1e-9);
    near(l.limitS, 166.667e-12, 1e-5);
    near(l.critLenM, 0.027503, 1e-4);
    near(l.ratio, 0.606, 1e-9);
    eq(l.needed, true);
    // 20 mm: 121.2 ps < 166.7 ps → lumped. 28 mm is just above the critical length, 27 mm just below.
    eq(lineCheck({ lengthM: 0.02, tpdSPerM: TPD, trS: 1e-9 }).needed, false);
    eq(lineCheck({ lengthM: 0.028, tpdSPerM: TPD, trS: 1e-9 }).needed, true);
    eq(lineCheck({ lengthM: 0.027, tpdSPerM: TPD, trS: 1e-9 }).needed, false);
    // A slower edge moves the limit: 5 ns → l_crit = 137.5 mm, so 100 mm needs no termination.
    const slow = run('series', { trS: 5e-9 });
    near(slow.line.critLenM, 0.137514, 1e-4);
    eq(slow.line.needed, false);
    // The same line data is part of every termination mode.
    for (const mode of ['series', 'parallel', 'thevenin', 'ac']) near(run(mode, { fHz: 50e6 }).line.tdS, 606e-12, 1e-9, mode);
  }],

  ['termination: series resistor for a matched source', () => {
    // R_s = 50 − 20 = 30 Ω (an E24 value); Γ_s = 0; V_1 = 3.3·50/100 = 1.65 V; open end 2·1.65 = 3.3 V
    const r = run('series');
    eq(r.ok, true);
    eq(r.rsExact, 30);
    eq(r.rs, 30);
    eq(r.fits, true);
    eq(r.gammaS, 0);
    near(r.v1, 1.65, 1e-12);
    near(r.vEnd, 3.3, 1e-12);
    near(r.vEndRatio, 1, 1e-12);
    eq(r.warnings.length, 0);
    // 17 Ω driver: 33 Ω is an E24 value as well.
    eq(run('series', { rout: 17 }).rs, 33);
    // An ideal driver (R_out = 0): 50 Ω → nearest E24 is 51 Ω; Γ_s = 1/101; V_1 = 3.3·50/101 = 1.63366 V
    const ideal = run('series', { rout: 0 });
    eq(ideal.rs, 51);
    near(ideal.gammaS, 0.00990099, 1e-6);
    near(ideal.v1, 1.63366, 1e-5);
  }],

  ['termination: series resistor rounded to E24 and E96', () => {
    // 22 Ω driver: R_s = 28 Ω. E24 neighbours 27 and 30 → 27 Ω. Source 49 Ω:
    // Γ_s = (49 − 50)/(49 + 50) = −0.010101; V_1 = 3.3·50/99 = 1.66667 V; open end 3.33333 V (1 % over V_DD)
    const e24 = run('series', { rout: 22 });
    eq(e24.rsExact, 28);
    eq(e24.rs, 27);
    eq(e24.rSource, 49);
    near(e24.gammaS, -0.010101, 1e-5);
    near(e24.v1, 1.666667, 1e-6);
    near(e24.vEnd, 3.333333, 1e-6);
    near(e24.vEndRatio, 1.010101, 1e-6);
    // E96 has 28.0 Ω: matched again.
    const e96 = run('series', { rout: 22, series: 'E96' });
    eq(e96.rs, 28);
    eq(e96.gammaS, 0);
    // 20 Ω driver in E96: 30 Ω is not a value, 30.1 Ω is: Γ_s = 0.1/100.1 = 0.000999
    const d = run('series', { series: 'E96' });
    eq(d.rs, 30.1);
    near(d.gammaS, 0.000999, 1e-3);
    // The public function gives the same numbers.
    near(seriesTermination({ z0: 50, rout: 22, vdd: 3.3 }).v1, e24.v1, 1e-12);
  }],

  ['termination: driver at or above Z0 gets no series resistor, never a negative one', () => {
    // R_out = 60 Ω: Z0 − R_out = −10 Ω → R_s = 0. Γ_s = (60 − 50)/(60 + 50) = 0.090909;
    // V_1 = 3.3·50/110 = 1.5 V; the first step at the open end is 3.0 V (90.9 % of V_DD)
    const r = run('series', { rout: 60 });
    eq(r.ok, true);
    eq(r.fits, false);
    eq(r.rs, 0);
    eq(r.rsExact, -10);
    near(r.gammaS, 0.090909, 1e-5);
    near(r.v1, 1.5, 1e-12);
    near(r.vEnd, 3.0, 1e-12);
    near(r.vEndRatio, 0.909091, 1e-6);
    ok(r.warnings.includes('tn_noRs'), 'warning');
    // Exactly Z0: nothing to add, already matched.
    const m = run('series', { rout: 50 });
    eq(m.rs, 0);
    eq(m.gammaS, 0);
    near(m.v1, 1.65, 1e-12);
    for (const rout of [50, 50.0001, 75, 1e6]) ok(run('series', { rout }).rs === 0, `R_out = ${rout}`);
  }],

  ['termination: parallel termination to ground', () => {
    // R_t: 50 Ω → E24 neighbours 47 and 51 → 51 Ω; Γ_L = 1/101 = 0.00990
    // V_H = 3.3·51/(51 + 20) = 168.3/71 = 2.37042 V; V_L = 0
    // I_H = 3.3/71 = 46.479 mA; in R_t at the high level 2.37042²/51 = 110.175 mW; at 50 % duty 55.087 mW
    const r = run('parallel', { vtt: 0, duty: 0.5 });
    eq(r.rt, 51);
    near(r.gammaL, 0.00990099, 1e-6);
    near(r.vHigh, 2.370423, 1e-6);
    eq(r.vLow, 0);
    near(r.iHigh, 0.0464789, 1e-6);
    eq(r.iLow, 0);
    near(r.iDrive, 0.0464789, 1e-6);
    near(r.pHigh, 0.110175, 1e-5);
    eq(r.pLow, 0);
    near(r.pRt, 0.0550873, 1e-5);
    // 46 mA is above the 24 mA limit; 2.37 V is above V_IH = 2.0 V.
    ok(r.warnings.includes('tn_iDrv') && !r.warnings.includes('tn_vih') && !r.warnings.includes('tn_vil'), r.warnings.join());
    // E96: 49.9 Ω, Γ_L = −0.1/99.9 = −0.001001
    const e96 = run('parallel', { series: 'E96' });
    eq(e96.rt, 49.9);
    near(e96.gammaL, -0.001001, 1e-3);
    // Duty: always high doubles the average, never high gives none.
    near(run('parallel', { duty: 1 }).pRt, 0.110175, 1e-5);
    eq(run('parallel', { duty: 0 }).pRt, 0);
  }],

  ['termination: parallel termination to VTT', () => {
    // V_TT = 1.5 V: V_H = (3.3·51 + 1.5·20)/71 = 198.3/71 = 2.79296 V; V_L = 30/71 = 0.42254 V
    // I_H = (3.3 − 1.5)/71 = 25.352 mA (source); I_L = 1.5/71 = 21.127 mA (sink)
    // In R_t: high (2.79296 − 1.5)²/51 = 1.67174/51 = 32.779 mW; low (1.5 − 0.42254)²/51 = 1.16093/51 = 22.763 mW
    // 30 % at the high level: 0.3·32.779 + 0.7·22.763 = 25.768 mW
    const r = run('parallel', { vtt: 1.5, duty: 0.3 });
    near(r.vHigh, 2.792958, 1e-6);
    near(r.vLow, 0.422535, 1e-6);
    near(r.iHigh, 0.0253521, 1e-5);
    near(r.iLow, 0.0211268, 1e-5);
    near(r.pHigh, 0.0327792, 1e-5);
    near(r.pLow, 0.0227634, 1e-5);
    near(r.pRt, 0.0257681, 1e-5);
    // The levels follow from the driver currents as well: V_H = V_DD − I_H·R_out, V_L = I_L·R_out.
    near(3.3 - r.iHigh * 20, r.vHigh, 1e-12);
    near(r.iLow * 20, r.vLow, 1e-12);
    // V_TT = V_DD/2: both states are mirror images; R_t sees ±1.18521 V → 27.544 mW whatever the duty,
    // a quarter of the 110.175 mW of the ground-terminated line at the high level.
    const mid = run('parallel', { vtt: 1.65, duty: 0.2 });
    near(mid.iHigh, mid.iLow, 1e-12);
    near(mid.iHigh, 0.0232394, 1e-5);
    near(mid.pRt, 0.0275436, 1e-5);
    near(mid.pRt, run('parallel', { vtt: 0, duty: 1 }).pRt / 4, 1e-9);
    ok(!mid.warnings.includes('tn_iDrv'), '23.2 mA is within 24 mA');
    near(parallelTermination({ z0: 50, rout: 20, vdd: 3.3, vtt: 1.5, duty: 0.3 }).pRt, r.pRt, 1e-12);
  }],

  ['termination: receiver thresholds and driver current limit', () => {
    // A weak driver, R_out = 50 Ω, to ground: V_H = 3.3·51/101 = 1.66634 V < V_IH = 2.0 V; I_H = 3.3/101 = 32.67 mA
    const weak = run('parallel', { rout: 50 });
    near(weak.vHigh, 1.666337, 1e-6);
    ok(weak.warnings.includes('tn_vih') && weak.warnings.includes('tn_iDrv'), weak.warnings.join());
    // The same driver to V_TT = 1.65 V: V_L = 1.65·50/101 = 0.81683 V > V_IL = 0.8 V; 16.3 mA is fine.
    const mid = run('parallel', { rout: 50, vtt: 1.65 });
    near(mid.vLow, 0.816832, 1e-6);
    near(mid.vHigh, 2.483168, 1e-6);
    eq(mid.warnings.join(), 'tn_vil');
    // Limits that are not given are not checked.
    const none = termination({ ...base, mode: 'parallel', rout: 50 });
    eq(none.warnings.length, 0);
    eq(none.iMaxA, null);
    // A larger limit clears the current warning.
    ok(!run('parallel', { iMaxA: 0.05 }).warnings.includes('tn_iDrv'), '50 mA driver');
  }],

  ['termination: Thévenin network for a bias of VDD/2', () => {
    // R_1 = 50·3.3/1.65 = 100 Ω, R_2 = 50·3.3/(3.3 − 1.65) = 100 Ω; R_th = 50 Ω, V_th = 1.65 V, Γ_L = 0
    // idle 3.3²/200 = 54.45 mW
    // V_H = (3.3·50 + 1.65·20)/70 = 198/70 = 2.82857 V; V_L = 33/70 = 0.47143 V; I_H = I_L = 1.65/70 = 23.571 mA
    // high: (3.3 − 2.82857)²/100 + 2.82857²/100 = 2.222 mW + 80.008 mW = 82.231 mW; low is the mirror image
    const r = run('thevenin');
    eq(r.vBias, 1.65);
    near(r.r1Exact, 100, 1e-12);
    near(r.r2Exact, 100, 1e-12);
    eq(r.r1, 100);
    eq(r.r2, 100);
    near(r.rth, 50, 1e-12);
    near(r.vth, 1.65, 1e-12);
    eq(r.gammaL, 0);
    near(r.pIdle, 0.05445, 1e-9);
    near(r.vHigh, 2.828571, 1e-6);
    near(r.vLow, 0.471429, 1e-6);
    near(r.iHigh, 0.0235714, 1e-5);
    near(r.iLow, 0.0235714, 1e-5);
    near(r.pHigh, 0.0822306, 1e-5);
    near(r.pLow, 0.0822306, 1e-5);
    near(r.pAvg, 0.0822306, 1e-5);
    eq(r.warnings.length, 0, '23.6 mA, 2.83 V and 0.47 V are all within the limits');
  }],

  ['termination: Thévenin network for another bias, against the node equation', () => {
    // V_TT = 1.5 V: R_1 = 50·3.3/1.5 = 110 Ω (E24), R_2 = 50·3.3/1.8 = 91.667 Ω → 91 Ω
    // R_th = 110·91/201 = 49.80100 Ω; V_th = 3.3·91/201 = 1.49403 V; Γ_L = −0.19900/99.80100 = −0.0019940
    // idle 10.89/201 = 54.179 mW
    const r = run('thevenin', { vBias: 1.5 });
    near(r.r1Exact, 110, 1e-12);
    near(r.r2Exact, 91.66667, 1e-6);
    eq(r.r1, 110);
    eq(r.r2, 91);
    near(r.rth, 49.800995, 1e-7);
    near(r.vth, 1.494030, 1e-6);
    near(r.gammaL, -0.0019940, 1e-4);
    near(r.pIdle, 0.0541791, 1e-6);
    // Node equation of the three resistors, without the Thévenin equivalent:
    // V·(1/R_out + 1/R_1 + 1/R_2) = V_drv/R_out + V_DD/R_1
    //   sum of conductances 0.05 + 0.0090909 + 0.0109890 = 0.0700799 S
    //   high: 3.3·(0.05 + 0.0090909) = 0.195 A → 2.78254 V; low: 3.3·0.0090909 = 0.03 A → 0.42808 V
    const g = 1 / 20 + 1 / 110 + 1 / 91;
    near(r.vHigh, (3.3 / 20 + 3.3 / 110) / g, 1e-12);
    near(r.vLow, (3.3 / 110) / g, 1e-12);
    near(r.vHigh, 2.782537, 1e-6);
    near(r.vLow, 0.428083, 1e-6);
    // Driver currents from the levels: (3.3 − 2.782537)/20 = 25.873 mA, 0.428083/20 = 21.404 mA
    near(r.iHigh, (3.3 - r.vHigh) / 20, 1e-12);
    near(r.iLow, r.vLow / 20, 1e-12);
    near(r.iHigh, 0.0258731, 1e-5);
    near(r.iLow, 0.0214041, 1e-5);
    ok(r.warnings.includes('tn_iDrv'), '25.9 mA exceeds 24 mA');
    // Energy balance at the high level: what the supply delivers through R_1 and through the driver,
    // less the loss in R_out, is dissipated in the network.
    near(r.pHigh, 3.3 * ((3.3 - r.vHigh) / 110 + r.iHigh) - r.iHigh ** 2 * 20, 1e-12);
    near(r.pAvg, 0.5 * r.pHigh + 0.5 * r.pLow, 1e-12);
    // E96: R_2 → 90.9 Ω; R_th = 110·90.9/200.9 = 49.77103 Ω; V_th = 3.3·90.9/200.9 = 1.49313 V
    const e96 = run('thevenin', { vBias: 1.5, series: 'E96' });
    eq(e96.r1, 110);
    eq(e96.r2, 90.9);
    near(e96.rth, 49.77103, 1e-6);
    near(e96.vth, 1.493131, 1e-6);
    // The exact values always give R_th = Z0 and V_th = V_TT.
    for (const vb of [0.9, 1.2, 1.65, 2.5]) {
      const x = theveninTermination({ z0: 65, rout: 15, vdd: 3.3, vBias: vb });
      near((x.r1Exact * x.r2Exact) / (x.r1Exact + x.r2Exact), 65, 1e-12, `R_th at ${vb} V`);
      near((3.3 * x.r2Exact) / (x.r1Exact + x.r2Exact), vb, 1e-12, `V_th at ${vb} V`);
    }
  }],

  ['termination: AC termination, the capacitor', () => {
    // C_min = 3·(2·606 ps)/50 Ω = 3636 ps/50 Ω = 72.72 pF → next E12 value 82 pF
    // R_t·C = 51·82 pF = 4.182 ns = 3.4505 round trips of 1.212 ns
    const r = run('ac', { fHz: 50e6 });
    eq(r.rt, 51);
    near(r.gammaL, 0.00990099, 1e-6);
    near(r.cMinF, 72.72e-12, 1e-9);
    near(r.cStdF, 82e-12, 1e-12);
    near(r.cF, 82e-12, 1e-12);
    eq(r.cUser, false);
    eq(r.capSeries, 'E12');
    eq(CAP_SERIES, 'E12');
    near(r.tauLineS, 4.182e-9, 1e-9);
    near(r.tauRatio, 3.450495, 1e-6);
    eq(r.warnings.length, 0);
    // A minimum that is itself an E12 value is kept: t_d = 82 pF·50 Ω/6 = 683.33 ps.
    near(acTermination({ z0: 50, rout: 20, vdd: 3.3, tdS: (82e-12 * 50) / 6, fHz: 50e6 }).cStdF, 82e-12, 1e-12);
    // 150 mm: C_min = 6·909 ps/50 = 109.08 pF → 120 pF.
    near(run('ac', { fHz: 25e6, lengthM: 0.15 }).cF, 120e-12, 1e-12);
    // A capacitor entered by the user replaces the suggestion; below the minimum it is flagged.
    const big = run('ac', { fHz: 50e6, cUserF: 1e-9 });
    near(big.cF, 1e-9, 1e-12);
    eq(big.cUser, true);
    near(big.cStdF, 82e-12, 1e-12, 'the suggestion is still reported');
    eq(big.warnings.length, 0);
    ok(run('ac', { fHz: 50e6, cUserF: 47e-12 }).warnings.includes('tn_cSmall'), '47 pF < 72.72 pF');
  }],

  ['termination: AC termination, average power of a square wave', () => {
    // T = 20 ns; τ = (51 + 20)·82 pF = 5.822 ns; T/(4τ) = 20/23.288 = 0.858811
    // tanh(0.858811) = (e^1.717622 − 1)/(e^1.717622 + 1) = 4.571264/6.571264 = 0.695645
    // P = 82 pF·3.3²·50 MHz·0.695645 = 44.649 mW·0.695645 = 31.060 mW; in R_t 31.060·51/71 = 22.311 mW
    const r = run('ac', { fHz: 50e6 });
    near(r.periodS, 20e-9, 1e-12);
    near(r.tauS, 5.822e-9, 1e-9);
    near(r.x, 0.858811, 1e-6);
    near(r.tanhX, 0.695645, 1e-6);
    near(r.pTotal, 0.0310599, 1e-5);
    near(r.pRt, 0.0223106, 1e-5);
    // Without the capacitor (R_t to ground, 50 % duty): 0.5·3.3²·51/71² = 55.087 mW, the parallel result.
    near(r.pRtDc, 0.0550873, 1e-5);
    near(r.pRtDc, run('parallel', { duty: 0.5 }).pRt, 1e-12);
    // Saving 1 − 22.311/55.087 = 59.50 %; the ratio is tanh(x)/(2x), never above one half.
    near(r.saving, 0.594995, 1e-5);
    near(r.pRt / r.pRtDc, r.tanhX / (2 * r.x), 1e-12);
    // 1 nF: τ = 71 ns, x = 20/284 = 0.0704225, tanh x = x − x³/3 + … = 0.0703063 → P = 0.5445 W·0.0703063 = 38.282 mW
    const big = run('ac', { fHz: 50e6, cUserF: 1e-9 });
    near(big.tanhX, 0.0703063, 1e-5);
    near(big.pTotal, 0.0382818, 1e-5);
    // Limits: a small capacitor charges fully every half period, P → C·V_DD²·f = 1 pF·10.89·50 MHz = 0.5445 mW;
    // a large one stays at V_DD/2, P → V_DD²/(4·(R_t + R_out)) = 10.89/284 = 38.345 mW.
    near(run('ac', { fHz: 50e6, cUserF: 1e-12 }).pTotal, 0.5445e-3, 1e-6);
    near(run('ac', { fHz: 50e6, cUserF: 1e-6 }).pTotal, 0.0383451, 1e-5);
    ok(run('ac', { fHz: 50e6, cUserF: 1e-6 }).saving > 0.4999, 'at most half of the DC power is left');
  }],

  ['termination: AC power against a time-domain simulation of the RC branch', () => {
    for (const [c, f] of [[82e-12, 50e6], [1e-9, 50e6], [120e-12, 25e6], [10e-12, 100e6], [470e-12, 5e6]]) {
      const r = run('ac', { fHz: f, cUserF: c });
      near(r.pTotal, simulateAcPower({ r: 71, c, vdd: 3.3, f }), 1e-4, `C = ${c}, f = ${f}`);
    }
  }],

  ['termination: setup and hold margin with a common clock', () => {
    // T = 20 ns, N = 1, Δclk = 0, t_data = 0.606 ns
    // setup = 20 + 0 − 8 − 0.606 − 3 − 0.2 = 8.194 ns; hold = 0 + 1 + 0.606 − 0 − 0.5 − 0.2 = 0.906 ns
    const r = timing();
    eq(r.ok, true);
    near(ns(r.periodS), 20, 1e-12);
    near(ns(r.tdataS), 0.606, 1e-9);
    eq(r.dclkS, 0);
    near(ns(r.setupS), 8.194, 1e-9);
    near(ns(r.holdS), 0.906, 1e-9);
    eq(r.pass, true);
    eq(r.warnings.length, 0);
    // f_max = 1/(8 + 0.606 + 3 + 0.2) ns = 1/11.806 ns = 84.703 MHz; margin as length 8.194 ns/6.06 ps/mm = 1352.1 mm
    near(r.fMaxHz, 84.7027e6, 1e-5);
    near(r.extraLenM, 1.352145, 1e-6);
    eq(r.lenFactor, 1);
    eq(r.fHoldMaxHz, null);
    // The events of the timing diagram: valid from 8.606 ns to 21.606 ns, needed from 16.8 ns to 20.7 ns.
    const e = r.events;
    near(ns(e.earliestS), 1.606, 1e-9);
    near(ns(e.validS), 8.606, 1e-9);
    near(ns(e.captureS), 20, 1e-12);
    near(ns(e.needFromS), 16.8, 1e-9);
    near(ns(e.needUntilS), 20.7, 1e-9);
    near(ns(e.validEndS), 21.606, 1e-9);
    near(ns(e.nextValidS), 28.606, 1e-9);
    near(e.needFromS - e.validS, r.setupS, 1e-9);
    near(e.validEndS - e.needUntilS, r.holdS, 1e-9);
    // Both margins together are what the valid interval leaves over the required one: 13 − 3.9 = 9.1 ns.
    near(ns(r.validWindowS), 13, 1e-9);
    near(ns(r.needWindowS), 3.9, 1e-9);
    near(r.setupS + r.holdS, r.validWindowS - r.needWindowS, 1e-9);
    // At f_max the setup margin is zero; a data trace longer by the margin uses it up as well.
    ok(Math.abs(timing({ fHz: r.fMaxHz }).setupS) < 1e-18, 'zero at f_max');
    ok(Math.abs(timing({ lengthM: 0.1 + r.extraLenM }).setupS) < 1e-18, 'zero with the extra length');
  }],

  ['termination: clock skew moves margin from hold to setup', () => {
    // Δclk = +1 ns (the clock is late at the receiver): setup 9.194 ns, hold 0.906 − 1 = −0.094 ns
    const late = timing({ skewS: 1e-9 });
    near(ns(late.setupS), 9.194, 1e-9);
    near(ns(late.holdS), -0.094, 1e-6);
    eq(late.pass, false);
    eq(late.warnings.join(), 'tn_holdNeg');
    // f_max = 1/(11.806 − 1) ns = 92.541 MHz
    near(late.fMaxHz, 92.5412e6, 1e-5);
    // With N = 1 the period is not in the hold equation: a slower clock leaves it negative.
    near(timing({ skewS: 1e-9, fHz: 1e6 }).holdS, late.holdS, 1e-9);
    eq(timing({ skewS: 1e-9, fHz: 1e6 }).pass, false);
    // Δclk = −2 ns: setup 6.194 ns, hold 2.906 ns
    const early = timing({ skewS: -2e-9 });
    near(ns(early.setupS), 6.194, 1e-9);
    near(ns(early.holdS), 2.906, 1e-9);
    eq(early.pass, true);
    // Uncertainty comes off both margins.
    const u = timing({ tuncS: 0.5e-9 });
    near(ns(u.setupS), 7.894, 1e-9);
    near(ns(u.holdS), 0.606, 1e-9);
  }],

  ['termination: opposite edge and returned data (SPI read path)', () => {
    // 50 MHz, N = 0.5 → N·T = 10 ns. Clock and data trace 120 mm each: 0.7272 ns; Δclk = −0.7272 ns
    // setup = 10 − 0.7272 − 6 − 0.7272 − 2 − 0.2 = 0.3456 ns
    // hold  = 10 + 0 + 0.7272 + 0.7272 − 1 − 0.2 = 10.2544 ns
    const spi = { lengthM: 0.12, clockLengthM: 0.12, clocking: 'return', n: 0.5, tcoMaxS: 6e-9, tcoMinS: 0, tsuS: 2e-9, thS: 1e-9 };
    const r = timing(spi);
    eq(r.clocking, 'return');
    near(ns(r.tclkS), 0.7272, 1e-9);
    near(ns(r.dclkS), -0.7272, 1e-9);
    near(ns(r.setupS), 0.3456, 1e-9);
    near(ns(r.holdS), 10.2544, 1e-9);
    eq(r.pass, true);
    // f_max = 0.5/(6 + 0.7272 + 2 + 0.2 + 0.7272) ns = 0.5/9.6544 ns = 51.790 MHz
    near(r.fMaxHz, 51.7899e6, 1e-5);
    // Clock and data grow together: 0.3456 ns/(2·6.06 ps/mm) = 28.515 mm; with both traces that much longer the margin is zero.
    eq(r.lenFactor, 2);
    near(r.extraLenM, 0.0285149, 1e-5);
    const longer = timing({ ...spi, lengthM: 0.12 + r.extraLenM, clockLengthM: 0.12 + r.extraLenM });
    ok(Math.abs(longer.setupS) < 1e-18, `zero with both traces longer, got ${longer.setupS}`);
    // Returned data is a common clock with Δclk = −t_clk.
    const same = timing({ ...spi, clocking: 'common', skewS: -0.7272e-9 });
    near(same.setupS, r.setupS, 1e-9);
    near(same.holdS, r.holdS, 1e-9);
    eq(same.lenFactor, 1);
    // The same link captured on the next same edge (N = 1) has 10 ns more setup and 10 ns less hold.
    const full = timing({ ...spi, n: 1 });
    near(ns(full.setupS), 10.3456, 1e-9);
    near(ns(full.holdS), 0.2544, 1e-9);
    near(timingBudget({ fHz: 50e6, tcoMaxS: 6e-9, tcoMinS: 0, tsuS: 2e-9, thS: 1e-9, tuncS: 0.2e-9, n: 0.5,
      dataLengthM: 0.12, clockLengthM: 0.12, tpdSPerM: TPD, clocking: 'return' }).setupS, r.setupS, 1e-12);
  }],

  ['termination: negative setup margin and the frequency that clears it', () => {
    // 100 MHz: T = 10 ns → setup = 10 − 11.806 = −1.806 ns; hold stays 0.906 ns
    const r = timing({ fHz: 100e6 });
    near(ns(r.setupS), -1.806, 1e-6);
    near(ns(r.holdS), 0.906, 1e-9);
    eq(r.pass, false);
    eq(r.warnings.join(), 'tn_setupNeg');
    near(r.fMaxHz, 84.7027e6, 1e-5);
    // As length: the data trace would have to be 1.806 ns/6.06 ps/mm = 298.0 mm shorter than its 100 mm.
    near(r.extraLenM, -0.298020, 1e-5);
    eq(r.lengthFixable, false, 'more than the whole trace');
    // 86 MHz: T = 11.628 ns → setup = −0.178 ns = 29.4 mm of trace, which a 100 mm trace can give up.
    const near86 = timing({ fHz: 86e6 });
    near(ns(near86.setupS), -0.17809, 1e-4);
    near(near86.extraLenM, -0.029388, 1e-4);
    eq(near86.lengthFixable, true);
    eq(timing().lengthFixable, true, 'a positive margin needs no fix');
    // Just below f_max the link passes, just above it fails.
    eq(timing({ fHz: r.fMaxHz * 0.999 }).pass, true);
    eq(timing({ fHz: r.fMaxHz * 1.001 }).pass, false);
    // A clock that arrives late enough at the receiver removes the limit: 8 + 0.606 + 3 + 0.2 − 15 < 0.
    const any = timing({ skewS: 15e-9 });
    eq(any.fMaxHz, null);
    ok(any.setupS > 0 && any.holdS < 0, 'setup is met at any frequency, hold is not');
  }],

  ['termination: negative hold margin with capture on the opposite edge', () => {
    // 200 MHz (T = 5 ns), N = 0.5, Δclk = +3 ns, t_co,min = 0.2 ns, t_h = 1 ns:
    // hold = 2.5 + 0.2 + 0.606 − 3 − 1 − 0.2 = −0.894 ns
    const o = { fHz: 200e6, n: 0.5, skewS: 3e-9, tcoMinS: 0.2e-9, thS: 1e-9 };
    const r = timing(o);
    near(ns(r.holdS), -0.894, 1e-6);
    ok(r.warnings.includes('tn_holdNegHalf') && !r.warnings.includes('tn_holdNeg'), r.warnings.join());
    // Here a slower clock helps: (1 − N)·T must reach 1 + 0.2 + 3 − 0.2 − 0.606 = 3.394 ns → f ≤ 0.5/3.394 ns = 147.32 MHz
    near(ns(r.holdNeedS), 3.394, 1e-9);
    near(r.fHoldMaxHz, 147.3188e6, 1e-5);
    ok(Math.abs(timing({ ...o, fHz: r.fHoldMaxHz }).holdS) < 1e-18, 'zero hold margin at that frequency');
    ok(timing({ ...o, fHz: 100e6 }).holdS > 0, 'positive below it');
    // t_co spread 7.8 ns > T: there is no interval in which the data is valid at all.
    ok(r.validWindowS < 0 && r.events.validEndS < r.events.validS, 'no valid interval');
    ok(r.warnings.includes('tn_setupNeg'), 'and setup fails as well');
  }],

  ['termination: invalid input is reported, not calculated', () => {
    const err = (r) => (r.ok ? 'ok' : r.errors.join());
    eq(err(termination(undefined)), 'tn_positive');
    eq(err(termination({ ...base, mode: 'nothing' })), 'tn_positive');
    for (const o of [{ z0: 0 }, { z0: -50 }, { z0: NaN }, { rout: -1 }, { vdd: 0 }, { trS: 0 }, { lengthM: 0 }, { tpdSPerM: 0 }, { lengthM: Infinity }]) {
      eq(err(run('series', o)), 'tn_positive', JSON.stringify(o));
    }
    eq(run('series', { rout: 0 }).ok, true, 'R_out = 0 is allowed');
    // Parallel: 0 ≤ V_TT ≤ V_DD, 0 ≤ D ≤ 1.
    eq(err(run('parallel', { vtt: 3.4 })), 'tn_vtt');
    eq(err(run('parallel', { vtt: -0.1 })), 'tn_positive');
    eq(err(run('parallel', { duty: 1.2 })), 'tn_positive');
    eq(run('parallel', { vtt: 3.3 }).ok, true, 'V_TT = V_DD: a pull-up');
    // Thévenin: 0 < V_TT < V_DD, otherwise one resistor would be infinite or negative.
    for (const vBias of [0, 3.3, 4, -1]) eq(err(run('thevenin', { vBias })), 'tn_bias', `bias ${vBias}`);
    eq(err(run('thevenin', { vBias: NaN })), 'tn_positive');
    // AC: frequency and, when given, the capacitor.
    eq(err(run('ac', { fHz: 0 })), 'tn_positive');
    eq(err(run('ac', { fHz: 50e6, cUserF: 0 })), 'tn_positive');
    eq(err(run('ac', { fHz: 50e6, cUserF: -1e-9 })), 'tn_positive');
    // Timing.
    eq(err(timing({ fHz: 0 })), 'tn_positive');
    eq(err(timing({ tuncS: -1e-9 })), 'tn_positive');
    eq(err(timing({ n: 0 })), 'tn_positive');
    eq(err(timing({ n: 2 })), 'tn_positive');
    eq(err(timing({ skewS: NaN })), 'tn_positive');
    eq(err(timing({ clocking: 'return', clockLengthM: 0 })), 'tn_positive');
    eq(err(timing({ tcoMinS: 9e-9 })), 'tn_tco');
    eq(err(timing({ tsuS: -1e-9, thS: 0.5e-9 })), 'tn_window');
    eq(timing({ tsuS: -0.5e-9, thS: 0.5e-9 }).ok, true, 'a negative setup time is fine while t_su + t_h ≥ 0');
    eq(timing({ clocking: 'return', clockLengthM: 0.1, skewS: NaN }).ok, true, 'the skew field is not used with returned data');
    // Numbers that overflow are an error as well.
    eq(err(run('ac', { fHz: 50e6, vdd: 1e200 })), 'tn_range');
  }],

  ['termination: absurd numbers never give NaN or Infinity', () => {
    const odd = [0, -1, 1e-300, 5e-324, 1e-30, 1e30, 1e300, NaN, Infinity, -Infinity, undefined];
    const keys = ['lengthM', 'tpdSPerM', 'z0', 'rout', 'vdd', 'trS', 'vtt', 'vBias', 'duty', 'iMaxA', 'vih', 'vil', 'fHz', 'cUserF',
      'tcoMaxS', 'tcoMinS', 'tsuS', 'thS', 'tuncS', 'n', 'skewS', 'clockLengthM'];
    let good = 0;
    for (const mode of MODES) {
      for (const clocking of mode === 'timing' ? ['common', 'return'] : ['common']) {
        const start = { ...base, ...limits, ...link, clockLengthM: 0.1, vtt: 0, duty: 0.5, mode, clocking };
        for (const k of keys) {
          for (const x of odd) {
            const r = termination({ ...start, [k]: x });
            const where = `${mode}/${clocking} ${k} = ${x}`;
            if (r.ok) {
              good++;
              ok(finiteAll(r), `${where}: a number is not finite`);
            } else {
              ok(Array.isArray(r.errors) && r.errors.length > 0 && r.errors.every((e) => typeof e === 'string'), `${where}: no error key`);
            }
          }
        }
      }
    }
    ok(good > 200, `some of the odd values are still valid inputs (${good})`);
  }],

  ['termination page: every mode, edge and clocking renders steps whose numbers give the result', () => {
    const sets = [
      {}, { mode: 'parallel' }, { mode: 'parallel', vtt: 1.5, duty: 30 }, { mode: 'thevenin' }, { mode: 'thevenin', vb: 1.2, es: 'E96' },
      { mode: 'ac' }, { mode: 'ac', c: '1n', f: 10 }, { mode: 'series', rout: 60 }, { mode: 'series', rout: 22, es: 'E96', len: 2, len_u: 'in', tpd: 150, tpd_u: 'psin' },
      { mode: 'timing' }, { mode: 'timing', edge: 'opp' }, { mode: 'timing', clk: 'return' }, { mode: 'timing', edge: 'opp', clk: 'return', clen: 250 },
      { mode: 'timing', skew: -1.5 }, { mode: 'timing', skew: 1 }, { mode: 'timing', f: 100 }, { mode: 'timing', f: 200, edge: 'opp', skew: 3, tcomin: 0.2, th: 1 },
      { mode: 'timing', tsu: -0.3, th: 0.9 }, { mode: 'timing', tcomax: 800, tcomax_u: 'ps', tcomin: 100, tcomin_u: 'ps', f: 0.4, f_u: 'GHz' },
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
        if (steps.length < 6) problems.push(`${where}: only ${steps.length} steps`);
        for (const s of steps) {
          if (!s.num || !s.res) continue;
          let calc;
          let shown;
          try { calc = evaluate(s.num); shown = evaluate(s.res); } catch { continue; } // max(…) is not evaluated
          checked++;
          // Tighter than the general check: 0.5 %, and no power of ten apart.
          if (!agrees(calc, shown, 0.005) || (shown !== 0 && Math.abs(calc / shown - 1) > 0.005)) problems.push(`${where}: ${s.num} → ${calc}, shown ${s.res}`);
        }
      }
    });
    ok(problems.length === 0, `\n${[...new Set(problems)].slice(0, 12).join('\n')}`);
    ok(checked > 250, `expected the steps to be evaluated, got ${checked}`);
  }],

  ['termination page: headline values, the 0 Ω case and inputs in other units', () => {
    const before = getLang();
    setLang('en');
    try {
      // R_out ≥ Z0: "0 Ω" and a note, never a negative resistance.
      const weak = show({ mode: 'series', rout: 60 });
      ok(/hero-value">0 <span class="u">Ω<\/span>/.test(weak.html), 'hero shows 0 Ω');
      ok(!/[−-]10 Ω/.test(weak.html.replace(/<[^>]*>/g, ' ').replace(/50 Ω − 60 Ω/g, '')), 'no negative resistance anywhere');
      ok(weak.html.includes('class="msg warn"'), 'warning');
      // 2 in at 150 ps/in is 50.8 mm at 5.9055 ps/mm: t_d = 300 ps.
      near(show({ len: 2, len_u: 'in', tpd: 150, tpd_u: 'psin' }).r.line.tdS, 300e-12, 1e-9);
      near(show({ len: 10, len_u: 'cm' }).r.line.tdS, 606e-12, 1e-9);
      near(show({ tr: 500, tr_u: 'ps' }).r.line.limitS, 83.333e-12, 1e-5);
      // The default delay per length is the microstrip value of the signal engine, rounded to 6.06 ps/mm.
      eq(inputs().v.tpd, 6.06);
      // Empty bias → V_DD/2; empty capacitor → the suggestion; SI prefixes in the capacitor field.
      eq(show({ mode: 'thevenin', vdd: 5 }).r.vBias, 2.5);
      eq(show({ mode: 'ac' }).r.cUser, false);
      near(show({ mode: 'ac', c: '2n2' }).r.cF, 2.2e-9, 1e-12);
      // Headline values of the timing mode: setup and hold margin.
      const tm = show({ mode: 'timing' });
      ok(tm.html.includes('8.194 <span class="u">ns</span>') && tm.html.includes('0.906 <span class="u">ns</span>'), 'margins as heroes');
      ok(tm.html.includes('class="msg ok"'), 'pass');
      const bad = show({ mode: 'timing', skew: 1 });
      ok(bad.html.includes('class="msg error"') && bad.html.includes('slower clock does not fix it'), 'hold failure with N = 1 says so');
      // Engine errors reach the page as messages, with the generic drawing.
      const wrong = show({ mode: 'thevenin', vb: 5 });
      eq(wrong.r.ok, false);
      ok(wrong.html.includes('class="msg error"') && wrong.svg.includes('<svg'), 'error message and drawing');
      // The examples: each sets its mode and the values the brief names.
      const ex = Object.fromEntries(fields.find((f) => f.key === 'ex').options.map((o) => [o.value, o.set]));
      eq(show(ex.clk).r.rs, 33);
      near(ns(show(ex.spi).r.setupS), 0.3456, 1e-6);
      eq(`${show(ex.thev).r.r1}/${show(ex.thev).r.r2}`, '130/110');
      eq(show(ex.thev).r.warnings.length, 0);
      near(show(ex.ac).r.cF, 120e-12, 1e-12);
    } finally {
      setLang(before);
    }
  }],

  ['termination page: diagrams stay clean for every mode and for failing or extreme inputs', () => {
    const sets = [
      {}, { mode: 'series', rout: 60 }, { mode: 'parallel' }, { mode: 'parallel', vtt: 1.5 }, { mode: 'thevenin' }, { mode: 'ac' }, { mode: 'ac', c: '10u' },
      { mode: 'timing' }, { mode: 'timing', edge: 'opp' }, { mode: 'timing', clk: 'return' }, { mode: 'timing', edge: 'opp', clk: 'return', clen: 2500 },
      { mode: 'timing', skew: 1 }, { mode: 'timing', skew: -30 }, { mode: 'timing', skew: 40 }, { mode: 'timing', f: 100 },
      { mode: 'timing', f: 200, edge: 'opp', skew: 3, tcomin: 0.2, th: 1 }, { mode: 'timing', f: 0.001 }, { mode: 'timing', f: 5, f_u: 'GHz' },
      { mode: 'timing', tcomax: 0, tcomin: 0, tsu: 0, th: 0, tunc: 0 }, { mode: 'timing', tsu: -0.5, th: 0.5, tunc: 0 }, { mode: 'timing', len: 1e6 },
      { mode: 'timing', tcomax: 1e6 }, { len: 1e-9 }, { z0: 1e9, rout: 1e-9 }, { mode: 'ac', f: 1e-6 }, { mode: 'thevenin', vb: 0.001 },
      // Invalid input: the drawing falls back to symbols.
      { mode: 'timing', f: 0 }, { mode: 'timing', edge: 'opp', clk: 'return', clen: 0 }, { z0: 0 }, { mode: 'thevenin', vb: 9 }, { mode: 'ac', f: -1 }, { mode: 'parallel', vtt: 9 },
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
        const n = geometryCount(out.svg);
        if (counts.has(id) && counts.get(id) !== n) problems.push(`${id}: geometry differs between TR and EN`);
        counts.set(id, n);
        // In the timing diagram the red overlap is drawn exactly when a margin is negative.
        if (out.r.ok && out.r.mode === 'timing') {
          const failing = out.r.setupS < 0 || out.r.holdS < 0;
          if (out.svg.includes('zone-bad') !== failing && failing) problems.push(`${lang} ${id}: failing margin is not marked`);
          if (!failing && out.svg.includes('zone-bad')) problems.push(`${lang} ${id}: red mark without a failing margin`);
        }
      }
    });
    ok(problems.length === 0, `\n${[...new Set(problems)].slice(0, 12).join('\n')}`);
  }],

  ['termination page: Turkish and English strings match, and every key the page uses exists', () => {
    const tr = Object.keys(page.strings.tr);
    const en = new Set(Object.keys(page.strings.en));
    eq(tr.filter((k) => !en.has(k)).join(), '', 'only in tr');
    eq([...en].filter((k) => !tr.includes(k)).join(), '', 'only in en');
    ok(tr.every((k) => page.strings.tr[k] && page.strings.en[k]), 'no empty string');
    ok(tr.every((k) => /^(tn_|ok_tn_|warn_tn_|err_tn_)/.test(k)), 'all keys carry the tn_ prefix, so no other page is overwritten');
    // Every message key the engine can return has a text.
    for (const k of ['tn_positive', 'tn_range', 'tn_vtt', 'tn_bias', 'tn_tco', 'tn_window']) ok(en.has(`err_${k}`), `err_${k}`);
    for (const k of ['tn_noRs', 'tn_iDrv', 'tn_vih', 'tn_vil', 'tn_cSmall']) ok(en.has(`warn_${k}`), `warn_${k}`);
    for (const k of ['tn_setupNeg', 'tn_holdNeg', 'tn_holdNegHalf']) ok(en.has(`err_${k}`), `err_${k}`);
    // Field keys are unique and short (they become URL parameters).
    eq(new Set(fields.map((f) => f.key)).size, fields.length, 'unique keys');
    ok(fields.every((f) => f.key.length <= 6), 'short keys');
    // No untranslated key shows up in a rendered result (a key would appear as tn_… text).
    inBothLanguages((lang) => {
      for (const mode of MODES) {
        const { html, svg } = show({ mode, vtt: mode === 'parallel' ? 1 : 0, rout: 80, f: 400, skew: 2 });
        ok(!/\b(ok_|warn_|err_)?tn_[A-Za-z]+/.test(`${html} ${svg}`.replace(/data-hl="[^"]*"/g, '')), `${lang} ${mode}: an untranslated key is shown`);
      }
    });
  }],
];
