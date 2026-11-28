// Hold-up capacitor (src/engine/holdup.js, src/pages/holdup.js).
// Expected values are worked out by hand in the comments. Independent check:
// the closed form for a constant-power load behind a capacitor with ESR is
// compared with a time-domain simulation of the discharge.

import { near, eq, ok } from '../assert.js';
import { holdup, powerDischarge, currentDischarge, CAP_SERIES, SHARE_LOW, LONG_S, SOLVES, LOADS } from '../../src/engine/holdup.js';
import { registerStrings, setLang, getLang } from '../../src/i18n.js';
import { stepsTrace, parseNumber } from '../../src/ui/calculator.js';
import { evaluate, agrees } from './arith.js';
import page from '../../src/pages/holdup.js';

registerStrings(page.strings);

// The hand check of the brief: 5 W behind a 90 % converter for 10 ms, 12 V down to 6 V, lowest capacitance 80 %.
const bus = { solve: 'cap', load: 'power', powerW: 5, efficiency: 0.9, v1: 12, v2: 6, timeS: 0.01, capMin: 0.8 };
// A 3.3 V rail behind an LDO from 5 V: 20 mA for 50 ms, down to 3.6 V.
const ldo = { solve: 'cap', load: 'current', currentA: 0.02, v1: 5, v2: 3.6, timeS: 0.05, capMin: 0.8 };
const P_IN = 5 / 0.9;
const run = (o = {}) => holdup({ ...bus, ...o });
const lin = (o = {}) => holdup({ ...ldo, ...o });
const err = (r) => (r.ok ? 'ok' : r.errors.join());
const uF = (x) => x * 1e6;
const ms = (x) => x * 1e3;

/** True when no number anywhere in the result is NaN or infinite. */
function finiteAll(x) {
  if (typeof x === 'number') return Number.isFinite(x);
  if (x && typeof x === 'object') return Object.values(x).every(finiteAll);
  return true;
}

/**
 * Independent reference: the capacitor (internal voltage v, series resistance)
 * is discharged step by step (midpoint rule) by a constant power or a constant
 * current drawn at its terminals, until the terminal voltage reaches V2.
 * Returns the time that takes.
 */
function simulate({ pIn, current, v1, v2, esr, c }) {
  const terminal = (v) => (current !== undefined ? v - current * esr : (v + Math.sqrt(Math.max(0, v * v - 4 * pIn * esr))) / 2);
  const draw = (v) => (current !== undefined ? current : pIn / terminal(v));
  const rough = current !== undefined ? (c * (v1 - v2)) / current : (c * (v1 * v1 - v2 * v2)) / (2 * pIn);
  const dt = rough / 20000;
  let v = v1;
  let time = 0;
  for (let n = 0; n < 100000; n++) {
    const mid = v - (draw(v) / c) * (dt / 2);
    const next = v - (draw(mid) / c) * dt;
    const a = terminal(v);
    const b = terminal(next);
    if (b <= v2) return time + (dt * (a - v2)) / (a - b); // the cut-off lies inside this step
    v = next;
    time += dt;
  }
  return NaN;
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
  for (const [, tag, attrs] of svgText.matchAll(/<(rect|circle|text)\b([^>]*)>/g)) {
    const a = Object.fromEntries([...attrs.matchAll(/\s(x|y|cx|cy|r|width|height)="([^"]*)"/g)].map(([, k, val]) => [k, val]));
    for (const [k, val] of Object.entries(a)) if (!/^-?\d+(\.\d+)?$/.test(val)) bad.push(`${tag} ${k}="${val}"`);
    if (tag === 'rect') {
      const [x, y, w, h] = [a.x, a.y, a.width, a.height].map(Number);
      if (w < 0 || h < 0 || x < 0 || y < 0 || x + w > W + 0.5 || y + h > H + 0.5) bad.push(`rect ${x},${y} ${w}×${h}`);
    }
    if ((tag === 'circle' || tag === 'text') && !(Number(a.cx ?? a.x) >= 0 && Number(a.cx ?? a.x) <= W && Number(a.cy ?? a.y) >= 0 && Number(a.cy ?? a.y) <= H)) bad.push(`${tag} outside the drawing`);
  }
  for (const [, val] of svgText.matchAll(/\s(?:d|points)="([^"]*)"/g)) {
    const nums = (val.match(/-?\d+(\.\d+)?(e[-+]?\d+)?/gi) ?? []).map(Number);
    if (nums.some((x) => x < -0.5 || x > Math.max(W, H) + 0.5)) bad.push(`path outside the drawing: ${val.slice(0, 40)}`);
    if (/\d,\d+,\d/.test(val.replace(/[A-Za-z]/g, ' '))) bad.push(`comma in ${val.slice(0, 40)}`);
  }
  return bad;
}
const geometryCount = (svgText) => [...svgText.matchAll(/\s(?:d|points|transform|x|y|cx|cy|r|width|height)="([^"]*)"/g)]
  .reduce((n, [, val]) => n + (val.match(/-?(\d+\.?\d*|\.\d+)/g) ?? []).length, 0);
/** The curve of a diagram as [x, y] pairs in drawing units. */
const curveOf = (svgText) => svgText.match(/<polyline class="wave" points="([^"]*)"/)[1].split(' ').map((p) => p.split(',').map(Number));

export const cases = [
  ['holdup: capacitance for 5 W over 10 ms from 12 V down to 6 V', () => {
    // P_in = 5/0.9 = 5.5556 W; C = 2·5.5556·0.01/(144 − 36) = 0.111111/108 = 1028.8 µF
    const r = run();
    eq(r.ok, true);
    near(r.pInW, 5.555556, 1e-6);
    near(uF(r.cReqF), 1028.807, 1e-6);
    // Lowest capacitance 80 % of nominal: 1028.8/0.8 = 1286.0 µF → next E6 value 1500 µF
    near(uF(r.cNomReqF), 1286.008, 1e-6);
    near(uF(r.cStdF), 1500, 1e-12);
    eq(r.series, 'E6');
    eq(CAP_SERIES, 'E6');
    // With 1500 µF: at least 1200 µF → t = 1200 µF·108/(2·5.5556) = 11.664 ms; nominal 14.58 ms
    near(uF(r.cStdMinF), 1200, 1e-12);
    near(ms(r.tStdMinS), 11.664, 1e-9);
    near(ms(r.tStdNomS), 14.58, 1e-9);
    // Peak current at the end 5.5556/6 = 925.93 mA; at the start 5.5556/12 = 462.96 mA
    near(r.iEndA, 0.9259259, 1e-6);
    near(r.iStartA, 0.4629630, 1e-6);
    // No ESR: nothing changes at the terminals.
    eq(r.esrOhm, 0);
    eq(r.v2Eff, 6);
    eq(r.vStartV, 12);
    eq(r.esrStepV, 0);
    near(r.kV2, 108, 1e-12);
    eq(r.warnings.length, 0);
    eq(SOLVES.join(), 'cap,time');
    eq(LOADS.join(), 'power,current');
  }],

  ['holdup: energy stored, usable share and where the energy goes', () => {
    // E1 = ½·1028.8 µF·144 = 74.074 mJ; down to 6 V: ½·1028.8 µF·108 = 55.556 mJ = P_in·t; the load gets 5 W·10 ms = 50 mJ
    const r = run();
    near(r.eStoredJ, 0.0740741, 1e-6);
    near(r.eTakenJ, 0.0555556, 1e-6);
    near(r.eInJ, P_IN * 0.01, 1e-12);
    near(r.eTakenJ, r.eInJ, 1e-12, 'energy balance without ESR');
    eq(r.eEsrJ, 0);
    near(r.eLoadJ, 0.05, 1e-12);
    // Usable share 1 − (6/12)² = 75 %: discharging to half the voltage uses three quarters of the energy.
    near(r.share, 0.75, 1e-12);
    near(r.eTakenJ / r.eStoredJ, r.share, 1e-12);
    // 24 V down to 18 V uses 1 − 0.75² = 43.75 % only.
    near(run({ v1: 24, v2: 18 }).share, 0.4375, 1e-12);
    // The efficiency scales the capacitance: an ideal converter needs 0.9 times as much.
    near(run({ efficiency: 1 }).cReqF, r.cReqF * 0.9, 1e-12);
    near(holdup({ ...bus, efficiency: undefined }).cReqF, r.cReqF * 0.9, 1e-12, 'η defaults to 1 in the engine');
  }],

  ['holdup: hold-up time of a given capacitor, worst case and nominal', () => {
    // 1000 µF nominal, at least 800 µF: t = 800 µF·108/(2·5.5556) = 7.776 ms; nominal 9.72 ms
    const r = run({ solve: 'time', capF: 1000e-6 });
    near(uF(r.cMinF), 800, 1e-12);
    near(ms(r.tMinS), 7.776, 1e-9);
    near(ms(r.tNomS), 9.72, 1e-9);
    near(r.tMinS / r.tNomS, 0.8, 1e-12);
    // The energy values are for the lowest capacitance: ½·800 µF·144 = 57.6 mJ.
    near(r.cUseF, r.cMinF, 1e-12);
    near(r.eStoredJ, 0.0576, 1e-9);
    // Round trip: the capacitance found for 10 ms lasts 10 ms.
    const c = run();
    near(run({ solve: 'time', capF: c.cReqF, capMin: 1 }).tMinS, 0.01, 1e-12);
    near(run({ solve: 'time', capF: c.cStdF }).tMinS, c.tStdMinS, 1e-12);
    // Time is proportional to the capacitance and inversely proportional to the power.
    near(run({ solve: 'time', capF: 2000e-6 }).tMinS, 2 * r.tMinS, 1e-12);
    near(run({ solve: 'time', capF: 1000e-6, powerW: 10 }).tMinS, r.tMinS / 2, 1e-12);
    // The time field is not used when the time is the answer.
    eq(run({ solve: 'time', capF: 1000e-6, timeS: NaN }).ok, true);
  }],

  ['holdup: constant current, the voltage falls in a straight line', () => {
    // C = I·t/(V1 − V2) = 0.02·0.05/1.4 = 714.29 µF; /0.8 = 892.86 µF → E6 1000 µF
    const r = lin();
    near(uF(r.cReqF), 714.2857, 1e-6);
    near(uF(r.cNomReqF), 892.8571, 1e-6);
    near(uF(r.cStdF), 1000, 1e-12);
    // With 1000 µF: 800 µF·1.4 V/20 mA = 56 ms; nominal 70 ms
    near(ms(r.tStdMinS), 56, 1e-9);
    near(ms(r.tStdNomS), 70, 1e-9);
    eq(r.iEndA, 0.02);
    eq(r.iStartA, 0.02);
    near(r.dV, 1.4, 1e-12);
    eq(r.pInW, null);
    eq(r.kV2, null);
    // Share 1 − (3.6/5)² = 48.16 %; E1 = ½·714.29 µF·25 = 8.9286 mJ
    near(r.share, 0.4816, 1e-12);
    near(r.eStoredJ, 0.00892857, 1e-6);
    // Time for 470 µF: 376 µF·1.4/0.02 = 26.32 ms
    near(ms(lin({ solve: 'time', capF: 470e-6 }).tMinS), 26.32, 1e-9);
    // The efficiency is not used.
    near(lin({ efficiency: 0.5 }).cReqF, r.cReqF, 1e-12);
    eq(lin({ efficiency: 7 }).ok, true);
    near(currentDischarge({ currentA: 0.02, v1: 5, v2: 3.6 }).sPerFarad, 70, 1e-12);
  }],

  ['holdup: nominal value is rounded up to E6, never down', () => {
    // 1764 µF/0.8 = 2204.6 µF is just above 2200 µF → 3300 µF
    const r = run({ powerW: 10, v1: 24, v2: 18, timeS: 0.02 });
    near(uF(r.cReqF), 1763.668, 1e-6); // 2·11.1111·0.02/(576 − 324) = 0.444444/252
    near(uF(r.cNomReqF), 2204.586, 1e-6);
    near(uF(r.cStdF), 3300, 1e-12);
    // A value that is itself in the series is kept: 20 mA·56 ms/1.4 V = 800 µF → /0.8 = 1000 µF.
    near(uF(lin({ timeS: 0.056 }).cStdF), 1000, 1e-12);
    near(uF(lin({ timeS: 0.0561 }).cStdF), 1500, 1e-12);
    // Without derating the calculated value is rounded: 1028.8 µF → 1500 µF; 100 % gives C_nom = C.
    const full = run({ capMin: 1 });
    near(full.cNomReqF, full.cReqF, 1e-12);
    near(uF(full.cStdF), 1500, 1e-12);
    // 50 % doubles the nominal value: 2057.6 µF → 2200 µF.
    near(uF(run({ capMin: 0.5 }).cStdF), 2200, 1e-12);
    // The chosen capacitor always meets the time asked for.
    for (const timeS of [1e-4, 0.003, 0.01, 0.047, 0.5, 3]) {
      const x = run({ timeS });
      ok(x.cStdF >= x.cNomReqF && x.tStdMinS >= timeS * (1 - 1e-12), `t = ${timeS}`);
      ok(x.cStdF < x.cNomReqF * 1.5 + 1e-18, `E6 steps are at most 1.5 : 1 (t = ${timeS})`);
    }
  }],

  ['holdup: ESR with a constant current raises the cut-off by I·ESR', () => {
    // 20 mA through 2 Ω: 40 mV. V2eff = 3.64 V, the terminals start at 4.96 V.
    // C = 0.02·0.05/(5 − 3.64) = 735.29 µF
    const r = lin({ esrOhm: 2 });
    near(r.v2Eff, 3.64, 1e-12);
    near(r.vStartV, 4.96, 1e-12);
    near(r.esrStepV, 0.04, 1e-12);
    near(uF(r.cReqF), 735.2941, 1e-6);
    // Heat in the ESR: I²·R·t = 4e-4·2·0.05 = 40 µJ; from the capacitor ½·735.29 µF·(25 − 13.2496) = 4.32 mJ;
    // at the terminals 20 mA·50 ms at an average of (4.96 + 3.6)/2 = 4.28 V → 4.28 mJ.
    near(r.eEsrJ, 40e-6, 1e-9);
    near(r.eTakenJ, 4.32e-3, 1e-9);
    near(r.eInJ, 4.28e-3, 1e-9);
    // Against the simulation.
    near(r.timeS, simulate({ current: 0.02, v1: 5, v2: 3.6, esr: 2, c: r.cReqF }), 1e-6);
    // 70 Ω drops the whole 1.4 V: nothing is left. 69 Ω leaves 20 mV.
    eq(err(lin({ esrOhm: 70 })), 'hu_nothing');
    eq(lin({ esrOhm: 69 }).ok, true);
    near(lin({ esrOhm: 69 }).dV, 0.02, 1e-9);
  }],

  ['holdup: ESR with constant power, worked by hand', () => {
    // 0.1 Ω: I_end = 5.5556/6 = 0.925926 A → V2eff = 6 + 0.0925926 = 6.092593 V
    // Vt1 = (12 + √(144 − 4·5.5556·0.1))/2 = (12 + √141.777778)/2 = (12 + 11.907047)/2 = 11.953524 V
    // I_start = 5.5556/11.953524 = 0.464763 A → first step 46.476 mV
    // K = 12·11.953524 − 6.092593·6 − 2·0.555556·ln(11.953524/6) = 143.442284 − 36.555556 − 1.111111·0.689266 = 106.12088 V²
    // C = 2·5.5556·0.01/106.12088 = 1047.02 µF
    const r = run({ esrOhm: 0.1 });
    near(r.iEndA, 0.925926, 1e-6);
    near(r.v2Eff, 6.092593, 1e-6);
    near(r.vStartV, 11.953524, 1e-7);
    near(r.iStartA, 0.464763, 1e-5);
    near(r.esrStepV, 0.0464763, 1e-5);
    near(r.esrEndV, 0.0925926, 1e-6);
    near(r.kV2, 106.12088, 1e-6);
    near(uF(r.cReqF), 1047.024, 1e-5);
    // The terminal voltage solves u = v − (P_in/u)·ESR at both ends.
    near(r.vStartV, 12 - (P_IN / r.vStartV) * 0.1, 1e-12);
    near(6, r.v2Eff - (P_IN / 6) * 0.1, 1e-12);
    // Energy: what leaves the capacitor is P_in·t plus the heat in the ESR (0.398 mJ of 55.953 mJ).
    near(r.eTakenJ, 0.0559531, 1e-5);
    near(r.eEsrJ, 0.000397575, 1e-4);
    near(r.eTakenJ, r.eInJ + r.eEsrJ, 1e-12);
    // Share 1 − (6.092593/12)² = 74.222 %
    near(r.share, 0.742224, 1e-5);
    // Leaving the ESR heat out (K ≈ V1² − V2eff² = 106.880) would give 1039.6 µF, 0.7 % too little.
    ok(r.kV2 < 144 - r.v2Eff ** 2, 'K is below V1² − V2eff²');
    near((144 - r.v2Eff ** 2) / r.kV2, 1.007156, 1e-5);
    // ESR = 0 gives the plain formula again, and a tiny ESR is continuous with it.
    near(powerDischarge({ pInW: P_IN, v1: 12, v2: 6, esrOhm: 0 }).kV2, 108, 1e-12);
    near(run({ esrOhm: 1e-9 }).cReqF, run().cReqF, 1e-8);
  }],

  ['holdup: ESR with constant power against a time-domain simulation', () => {
    for (const [powerW, v1, v2, esrOhm, capF] of [
      [5, 12, 6, 0, 1e-3], [5, 12, 6, 0.1, 1e-3], [5, 12, 6, 1, 1e-3], [5, 12, 6, 5, 2.2e-3], [0.5, 5, 3, 0.1, 1], [10, 24, 18, 0.5, 3.3e-3],
      [100, 48, 36, 0.05, 0.01], [0.05, 3.3, 1.8, 20, 0.047], [2, 5, 4.6, 0.3, 4.7e-4],
    ]) {
      const r = holdup({ solve: 'time', load: 'power', powerW, efficiency: 0.9, v1, v2, capF, capMin: 1, esrOhm });
      const where = `P = ${powerW} W, ${v1} → ${v2} V, ESR = ${esrOhm} Ω`;
      eq(r.ok, true, where);
      near(r.tNomS, simulate({ pIn: powerW / 0.9, v1, v2, esr: esrOhm, c: capF }), 2e-6, where);
    }
    // 1 Ω: K = 12·11.517648 − 6.925926·6 − 2·5.5556·ln(11.517648/6) = 89.41044 V²: the plain formula would be 17 % optimistic.
    near(run({ esrOhm: 1 }).kV2, 89.41044, 1e-6);
    near(run({ esrOhm: 1 }).vStartV, 11.517648, 1e-7);
  }],

  ['holdup: too much ESR is an error, not a number', () => {
    // The converter input collapses before V2 when V2² ≤ P_in·ESR: 36/5.5556 = 6.48 Ω.
    eq(err(run({ v1: 20, esrOhm: 6.48 })), 'hu_esrHigh');
    eq(err(run({ v1: 20, esrOhm: 7 })), 'hu_esrHigh');
    eq(run({ v1: 20, esrOhm: 6.4 }).ok, true);
    // 9 V down to 6 V: V2eff = 6 + 0.925926·ESR reaches 9 V at 3.24 Ω.
    eq(err(run({ v1: 9, esrOhm: 3.24 })), 'hu_nothing');
    eq(err(run({ v1: 9, esrOhm: 5 })), 'hu_nothing');
    const edge = run({ v1: 9, esrOhm: 3.2 });
    eq(edge.ok, true);
    near(edge.v2Eff, 8.962963, 1e-6);
    ok(edge.warnings.includes('hu_shareLow'), 'almost nothing usable: 1 − (8.963/9)² = 0.8 %');
    // A negative or meaningless ESR.
    eq(err(run({ esrOhm: -0.1 })), 'hu_positive');
    eq(err(run({ esrOhm: NaN })), 'hu_positive');
    eq(run({ esrOhm: undefined }).esrOhm, 0, 'an empty ESR field is zero');
  }],

  ['holdup: warnings for a badly used capacitor and for long times', () => {
    eq(SHARE_LOW, 0.2);
    eq(LONG_S, 10);
    // 5 V down to 4.6 V: 1 − 0.92² = 15.36 % < 20 %
    const low = run({ v1: 5, v2: 4.6 });
    near(low.share, 0.1536, 1e-9);
    eq(low.warnings.join(), 'hu_shareLow');
    // 5 V down to 4.4 V: 22.56 %, no warning.
    eq(run({ v1: 5, v2: 4.4 }).warnings.length, 0);
    // Long times: above 10 s, in either direction of the calculation.
    eq(run({ timeS: 11 }).warnings.join(), 'hu_long');
    eq(run({ timeS: 10 }).warnings.length, 0);
    // 1 F from 5 V to 3 V at 0.5 W: 1 F·16/(2·0.55556) = 14.4 s nominal, 11.52 s at 80 %
    const sc = run({ solve: 'time', capF: 1, powerW: 0.5, v1: 5, v2: 3 });
    near(sc.tNomS, 14.4, 1e-9);
    near(sc.tMinS, 11.52, 1e-9);
    ok(sc.warnings.includes('hu_long'), 'long');
  }],

  ['holdup: the curve the diagram draws', () => {
    // Constant power without ESR: V(t) = √(V1² − 2·P_in·t/C), from 12 V at t = 0 to 6 V at 10 ms.
    const r = run();
    const c = r.curve;
    eq(c.length, 25);
    eq(c[0][0], 0);
    eq(c[0][1], 12);
    near(c[c.length - 1][0], 0.01, 1e-12);
    eq(c[c.length - 1][1], 6);
    for (const [time, volts] of c) near(volts, Math.sqrt(144 - (2 * P_IN * time) / r.cReqF), 1e-9, `t = ${time}`);
    for (let i = 1; i < c.length; i++) ok(c[i][0] > c[i - 1][0] && c[i][1] < c[i - 1][1], `falls monotonically at point ${i}`);
    // At half the time the voltage is √((144 + 36)/2) = 9.4868 V: the curve bends downwards.
    ok(c.some(([time, volts]) => Math.abs(time - 0.005) < 3e-4 && volts > 9.3), 'above the straight line (9 V) at half time');
    // With ESR it starts at the terminal voltage after the first step and still ends at V2.
    const e = run({ esrOhm: 1 });
    near(e.curve[0][1], 11.517648, 1e-7);
    eq(e.curve[e.curve.length - 1][1], 6);
    for (let i = 1; i < e.curve.length; i++) ok(e.curve[i][0] >= e.curve[i - 1][0] && e.curve[i][1] < e.curve[i - 1][1], `ESR curve at point ${i}`);
    // A point in the middle against the simulation: the time to reach that terminal voltage.
    const [tm, um] = e.curve[12];
    near(tm, simulate({ pIn: P_IN, v1: 12, v2: um, esr: 1, c: e.cReqF }), 1e-5);
    // Constant current: a straight line from V1 − I·ESR to V2.
    const l = lin({ esrOhm: 2 });
    eq(l.curve.length, 2);
    eq(`${l.curve[0][0]}/${l.curve[1][1]}`, '0/3.6');
    near(l.curve[0][1], 4.96, 1e-12);
    near(l.curve[1][0], 0.05, 1e-12);
    // When the time is the answer the curve ends at the worst-case time.
    const tm2 = run({ solve: 'time', capF: 1000e-6 });
    near(tm2.curve[tm2.curve.length - 1][0], tm2.tMinS, 1e-12);
  }],

  ['holdup: invalid input is reported, not calculated', () => {
    eq(err(holdup(undefined)), 'hu_positive');
    eq(err(run({ solve: 'energy' })), 'hu_positive');
    eq(err(run({ load: 'resistor' })), 'hu_positive');
    for (const o of [{ powerW: 0 }, { powerW: -5 }, { powerW: NaN }, { v1: 0 }, { v2: 0 }, { v2: -6 }, { v1: Infinity }, { timeS: 0 }, { timeS: -1 }, { timeS: undefined }]) {
      eq(err(run(o)), 'hu_positive', JSON.stringify(o));
    }
    for (const o of [{ currentA: 0 }, { currentA: -0.02 }, { currentA: undefined }]) eq(err(lin(o)), 'hu_positive', JSON.stringify(o));
    for (const capF of [0, -1e-3, NaN, undefined]) eq(err(run({ solve: 'time', capF })), 'hu_positive', `C = ${capF}`);
    // Efficiency 0 … 100 %, lowest capacitance 0 … 100 %, V2 below V1: each with its own message.
    for (const efficiency of [0, -0.1, 1.01, 90, NaN]) eq(err(run({ efficiency })), 'hu_eff', `η = ${efficiency}`);
    eq(run({ efficiency: 1 }).ok, true);
    for (const capMin of [0, -0.2, 1.2, 80, NaN]) eq(err(run({ capMin })), 'hu_frac', `k = ${capMin}`);
    eq(err(run({ v2: 12 })), 'hu_v2');
    eq(err(run({ v2: 15 })), 'hu_v2');
    eq(err(run({ efficiency: 2, capMin: 3, v2: 13 })), 'hu_eff,hu_frac,hu_v2', 'all three at once');
    // Numbers that overflow or vanish are an error as well.
    eq(err(run({ powerW: 1e300, timeS: 1e300 })), 'hu_range');
    eq(err(run({ powerW: 1e-320, timeS: 1e-320, v1: 1e200, v2: 1e-200 })), 'hu_range');
  }],

  ['holdup: absurd numbers never give NaN or Infinity', () => {
    const odd = [0, -1, 1e-300, 5e-324, 1e-30, 1e-9, 1e9, 1e30, 1e300, NaN, Infinity, -Infinity, undefined, null];
    const keys = ['powerW', 'efficiency', 'currentA', 'v1', 'v2', 'timeS', 'capF', 'capMin', 'esrOhm'];
    let good = 0;
    for (const solve of SOLVES) {
      for (const load of LOADS) {
        for (const esrOhm of [0, 0.1]) {
          const start = { ...bus, currentA: 0.02, capF: 1e-3, solve, load, esrOhm };
          for (const k of keys) {
            for (const x of odd) {
              const r = holdup({ ...start, [k]: x });
              const where = `${solve}/${load} ${k} = ${x}`;
              if (r.ok) {
                good++;
                ok(finiteAll(r), `${where}: a number is not finite`);
                // The share may round to exactly 1 (V1 = 1e9 V down to 6 V), never above it.
                ok(r.cUseF > 0 && r.tUseS > 0 && r.share > 0 && r.share <= 1, `${where}: capacitance, time or share out of range`);
                ok(r.curve.every(([time, volts]) => time >= 0 && time <= r.tUseS * (1 + 1e-9) && volts >= r.v2 * (1 - 1e-9) && volts <= r.v1 * (1 + 1e-9)), `${where}: curve outside its window`);
              } else {
                ok(Array.isArray(r.errors) && r.errors.length > 0 && r.errors.every((e) => typeof e === 'string'), `${where}: no error key`);
              }
            }
          }
        }
      }
    }
    ok(good > 150, `some of the odd values are still valid inputs (${good})`);
  }],

  ['holdup page: every mode, load, example and unit renders steps whose numbers give the result', () => {
    const sets = [
      {}, { solve: 'time' }, { load: 'current' }, { solve: 'time', load: 'current' }, { esr: 100 }, { esr: 1, esr_u: 'ohm' }, { solve: 'time', esr: 250 },
      { load: 'current', esr: 5, esr_u: 'ohm' }, { solve: 'time', load: 'current', esr: 500, c: '470u' }, { p: 250, p_u: 'mW', t: 2, t_u: 's' },
      { load: 'current', i: 150, i_u: 'uA', t: 0.5, t_u: 's', v1: 3.3, v2: 1.8 }, { load: 'current', i: 2, i_u: 'A', t: 500, t_u: 'us' },
      { cmin: 100 }, { cmin: 50, eff: 100 }, { v1: 5, v2: 4.6 }, { v1: 48, v2: 36, p: 100, t: 20, esr: 50 }, { solve: 'time', c: '2m2', v1: 24, v2: 18, p: 10 },
      { solve: 'time', c: 0.47, v1: 5.5, v2: 2.5, p: 0.2, esr: 2, esr_u: 'ohm' }, { v1: 9, esr: 3.2, esr_u: 'ohm' }, { t: 11, t_u: 's' },
      ...fields.find((f) => f.key === 'ex').options.filter((o) => o.set).map((o) => o.set),
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
          let calc;
          let shown;
          try { calc = evaluate(s.num); shown = evaluate(s.res); } catch (e) { problems.push(`${where}: cannot evaluate ${s.num} (${e.message})`); continue; }
          checked++;
          // Tighter than the general check: 0.5 %, and no power of ten apart.
          if (!agrees(calc, shown, 0.005) || (shown !== 0 && Math.abs(calc / shown - 1) > 0.005)) problems.push(`${where}: ${s.num} → ${calc}, shown ${s.res}`);
        }
      }
    });
    ok(problems.length === 0, `\n${[...new Set(problems)].slice(0, 12).join('\n')}`);
    ok(checked > 300, `expected the steps to be evaluated, got ${checked}`);
  }],

  ['holdup page: headline values, units, messages and examples', () => {
    const before = getLang();
    setLang('en');
    try {
      // Defaults are the hand check: 1029 µF required, 1500 µF to buy.
      const d = show();
      near(uF(d.r.cReqF), 1028.807, 1e-6);
      ok(d.html.includes('hero-value">1029 <span class="u">µF</span>') && d.html.includes('hero-value">1500 <span class="u">µF</span>'), 'capacitances as heroes');
      ok(d.html.includes('1286 µF') && d.html.includes('E6') && d.html.includes('11.66 ms'), 'nominal value, series and the time with it');
      ok(!d.html.includes('class="msg warn"') && !d.html.includes('class="msg error"'), 'no message');
      // Time for a capacitance: SI input, worst case and nominal as heroes.
      const tm = show({ solve: 'time', c: '2200u' });
      near(tm.r.capF, 2.2e-3, 1e-12);
      near(ms(tm.r.tMinS), 17.1072, 1e-6); // 1760 µF·108/11.1111
      ok(tm.html.includes('hero-value">17.11 <span class="u">ms</span>') && tm.html.includes('hero-value">21.38 <span class="u">ms</span>'), 'times as heroes');
      near(show({ solve: 'time', c: '4m7' }).r.capF, 4.7e-3, 1e-12);
      near(show({ solve: 'time', c: 1 }).r.capF, 1, 1e-12);
      // Units of the fields.
      near(show({ p: 500, p_u: 'mW' }).r.powerW, 0.5, 1e-12);
      near(show({ t: 2, t_u: 's' }).r.timeS, 2, 1e-12);
      near(show({ t: 500, t_u: 'us' }).r.timeS, 5e-4, 1e-12);
      near(show({ load: 'current', i: 150, i_u: 'uA' }).r.currentA, 150e-6, 1e-12);
      near(show({ load: 'current', i: 2, i_u: 'A' }).r.currentA, 2, 1e-12);
      near(show({ esr: 100 }).r.esrOhm, 0.1, 1e-12);
      near(show({ esr: 0.1, esr_u: 'ohm' }).r.esrOhm, 0.1, 1e-12);
      eq(show({ esr: 0 }).r.esrOhm, 0);
      near(show({ eff: 85 }).r.efficiency, 0.85, 1e-12);
      near(show({ cmin: 70 }).r.capMin, 0.7, 1e-12);
      // Large capacitors are shown in farads, small ones in µF.
      ok(show({ t: 20, t_u: 's', p: 2 }).html.includes('<span class="u">F</span>'), 'farads');
      // ESR adds its rows and steps; without it they are absent.
      const withEsr = show({ esr: 100 }).html;
      ok(!d.html.includes('Lowest usable internal voltage') && withEsr.includes('Lowest usable internal voltage'), 'ESR rows');
      ok(d.html.includes('Usable energy (V1 → V2)') && withEsr.includes('Usable energy (V1 → V2,eff)') && withEsr.includes('Energy lost as heat in the ESR'), 'energy rows');
      // Messages.
      ok(show({ v1: 5, v2: 4.6 }).html.includes('used badly'), 'low usable share');
      ok(show({ t: 11, t_u: 's' }).html.includes('leakage current'), 'long hold-up time');
      const bad = show({ v2: 12 });
      eq(bad.r.ok, false);
      ok(bad.html.includes('class="msg error"') && bad.html.includes('V2 must be below V1') && bad.svg.includes('<svg'), 'error message and drawing');
      ok(show({ eff: 0 }).html.includes('efficiency must be above 0'), 'efficiency');
      ok(show({ cmin: 120 }).html.includes('lowest capacitance must be above 0'), 'lowest capacitance');
      ok(show({ esr: 7, esr_u: 'ohm', v1: 20 }).html.includes('ESR is too high'), 'ESR too high');
      ok(show({ esr: 5, esr_u: 'ohm', v1: 9 }).html.includes('No usable energy'), 'nothing usable');
      // The examples.
      const ex = Object.fromEntries(fields.find((f) => f.key === 'ex').options.map((o) => [o.value, o.set]));
      eq(Object.keys(ex).join(), 'none,b12,mcu,b24,sc');
      near(uF(show(ex.b12).r.cStdF), 1500, 1e-12);
      near(uF(show(ex.mcu).r.cStdF), 1000, 1e-12);
      eq(show(ex.mcu).r.load, 'current');
      near(uF(show(ex.b24).r.cStdF), 3300, 1e-12);
      // Supercapacitor: K = 5·4.988864 − 3.018519·3 − 2·0.0555556·ln(4.988864/3) = 15.83225 V²
      // t = 0.8 F·15.83225/(2·0.555556) = 11.399 s; nominal 14.249 s
      const sc = show(ex.sc).r;
      eq(sc.solve, 'time');
      near(sc.kV2, 15.83225, 1e-5);
      near(sc.tMinS, 11.3992, 1e-5);
      near(sc.tNomS, 14.2490, 1e-5);
      ok(sc.warnings.includes('hu_long'), 'the supercapacitor example is a long hold-up');
      for (const set of Object.values(ex)) if (set) ok(['solve', 'load', 'v1', 'v2', 'cmin', 'esr'].every((k) => k in set), 'an example sets every common field');
    } finally {
      setLang(before);
    }
  }],

  ['holdup page: the diagram follows the curve and stays clean for extreme or invalid inputs', () => {
    const sets = [
      {}, { solve: 'time' }, { load: 'current' }, { esr: 100 }, { esr: 6, esr_u: 'ohm' }, { load: 'current', esr: 250, esr_u: 'ohm' }, { v1: 5, v2: 4.99 },
      { v1: 1e6, v2: 1e-6 }, { v1: 1e-3, v2: 1e-6, p: 1e-9 }, { t: 1e-6, t_u: 'us' }, { t: 1e9, t_u: 's' }, { p: 1e9 }, { p: 1e-9, p_u: 'mW' },
      { solve: 'time', c: '1p' }, { solve: 'time', c: 1e6 }, { cmin: 1e-6 }, { eff: 1e-6 }, { load: 'current', i: 1e-9, i_u: 'uA' }, { v1: 12, v2: 11.999999 },
      // Invalid input: the drawing falls back to symbols.
      { v2: 12 }, { v1: 0 }, { p: 0 }, { eff: 0 }, { eff: 150 }, { cmin: 0 }, { t: '' }, { solve: 'time', c: '' }, { solve: 'time', c: 'abc' }, { esr: -1 },
      { esr: 99, esr_u: 'ohm' }, { load: 'current', i: '' }, { p: 1e300, t: 1e300, t_u: 's' },
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
        // The curve never rises and never runs backwards.
        const c = curveOf(out.svg);
        for (let i = 1; i < c.length; i++) if (c[i][0] < c[i - 1][0] || c[i][1] < c[i - 1][1]) problems.push(`${lang} ${id}: the curve is not monotonic at point ${i}`);
      }
    });
    ok(problems.length === 0, `\n${[...new Set(problems)].slice(0, 12).join('\n')}`);
    // Constant power bends downwards, constant current is a straight line: at half the time
    // the first lies above the chord from start to end, the second on it.
    const midGap = (set) => {
      const c = curveOf(show(set).svg).slice(1); // without the lead-in at V1
      const [xa, ya] = c[0];
      const [xb, yb] = c[c.length - 1];
      const xm = (xa + xb) / 2;
      let i = 1;
      while (c[i][0] < xm) i++;
      const y = c[i - 1][1] + ((c[i][1] - c[i - 1][1]) * (xm - c[i - 1][0])) / (c[i][0] - c[i - 1][0]);
      return (ya + yb) / 2 - y; // positive: the curve is above the chord (y grows downwards)
    };
    ok(midGap({}) > 4, `constant power bends downwards (${midGap({})})`);
    ok(Math.abs(midGap({ load: 'current' })) < 0.2, 'constant current is straight');
    // With ESR the curve starts with a step down at the moment the supply is lost.
    const step = curveOf(show({ esr: 1, esr_u: 'ohm' }).svg);
    ok(step[2][0] === step[1][0] && step[2][1] > step[1][1], 'ESR step');
  }],

  ['holdup page: Turkish and English strings match, and every key the page uses exists', () => {
    const tr = Object.keys(page.strings.tr);
    const en = new Set(Object.keys(page.strings.en));
    eq(tr.filter((k) => !en.has(k)).join(), '', 'only in tr');
    eq([...en].filter((k) => !tr.includes(k)).join(), '', 'only in en');
    ok(tr.every((k) => page.strings.tr[k] && page.strings.en[k]), 'no empty string');
    ok(tr.every((k) => /^(hu_|ok_hu_|warn_hu_|err_hu_)/.test(k)), 'all keys carry the hu_ prefix, so no other page is overwritten');
    // Every message key the engine can return has a text.
    for (const k of ['hu_positive', 'hu_eff', 'hu_frac', 'hu_v2', 'hu_esrHigh', 'hu_nothing', 'hu_range']) ok(en.has(`err_${k}`), `err_${k}`);
    for (const k of ['hu_shareLow', 'hu_long']) ok(en.has(`warn_${k}`), `warn_${k}`);
    // Labels, hints and info texts of the form.
    for (const s of page.sections) {
      for (const f of s.fields) {
        for (const k of [f.label, f.hint, f.info, ...(f.options ?? []).map((o) => o.label)]) ok(k === undefined || en.has(k), `${f.key}: ${k}`);
      }
    }
    // Field keys are unique and short (they become URL parameters); option values are lowercase ASCII.
    eq(new Set(fields.map((f) => f.key)).size, fields.length, 'unique keys');
    ok(fields.every((f) => /^[a-z0-9]{1,6}$/.test(f.key)), 'short keys');
    ok(fields.every((f) => (f.options ?? []).every((o) => /^[a-z0-9]+$/.test(o.value))), 'option values');
    // The series named in the step note is the one the engine rounds to.
    ok(page.strings.en.hu_stepStd.includes(CAP_SERIES) && page.strings.tr.hu_stepStd.includes(CAP_SERIES), 'series in the note');
    // No untranslated key shows up in a rendered result or drawing (a key would appear as hu_… text).
    inBothLanguages((lang) => {
      for (const set of [{}, { solve: 'time', esr: 100, t: 20 }, { load: 'current', esr: 2, esr_u: 'ohm', v1: 5, v2: 4.7 }, { t: 30, t_u: 's' }, { v2: 20 }, { eff: 0, cmin: 0 }]) {
        const { html, svg } = show(set);
        const shown = `${html} ${svg}`.replace(/data-hl="[^"]*"/g, '');
        ok(!/\b(ok_|warn_|err_)?hu_[A-Za-z0-9]+/.test(shown), `${lang} ${JSON.stringify(set)}: an untranslated key is shown`);
      }
    });
  }],
];
