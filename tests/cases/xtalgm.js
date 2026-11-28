// Crystal oscillator gain margin (src/engine/xtalgm.js, src/pages/xtalgm.js).
// Expected values are worked out by hand in the comments; the 8 MHz crystal is
// the worked example of ST AN2867. Independent checks: the limits (largest ESR,
// largest series resistor) by running the check again at the limit, and the
// drive level against the closed form ESR·(π·F·C_tot·V_pp)²/2.

import { near, eq, ok } from '../assert.js';
import {
  xtalGm, gmCritical, esrLimit, equalLoadCap, rextStart, driveLevel, GAIN_MARGIN_MIN, STRAY_TYPICAL_F, SOURCES,
} from '../../src/engine/xtalgm.js';
import { registerStrings, setLang, getLang } from '../../src/i18n.js';
import { stepsTrace, parseNumber } from '../../src/ui/calculator.js';
import { evaluate, agrees } from './arith.js';
import page from '../../src/pages/xtalgm.js';

registerStrings(page.strings);

const pF = 1e-12;
// AN2867: 8 MHz, ESR 80 Ω, C0 7 pF, CL 10 pF on an oscillator with gm = 25 mA/V.
const hse = { fHz: 8e6, esr: 80, c0F: 7 * pF, clF: 10 * pF, source: 'gm', gm: 25e-3, marginReq: 5, csF: 5 * pF };
// A 32.768 kHz watch crystal: ESR 70 kΩ, C0 1 pF, CL 7 pF, against Gm,crit,max = 1.7 µA/V.
const lse = { fHz: 32768, esr: 70e3, c0F: 1 * pF, clF: 7 * pF, source: 'gcrit', gmCritMax: 1.7e-6, csF: 3 * pF };
const run = (o = {}) => xtalGm({ ...hse, ...o });
const err = (r) => (r.ok ? 'ok' : r.errors.join());

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
/** Problems of a diagram: a missing number, a comma in geometry, anything outside the drawing. */
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
    if (tag === 'text' && !(Number(a.x) >= 0 && Number(a.x) <= W && Number(a.y) >= 8 && Number(a.y) <= H)) bad.push(`text at ${a.x},${a.y}`);
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
  ['xtalgm: critical transconductance of the AN2867 example and of a watch crystal', () => {
    eq(GAIN_MARGIN_MIN, 5);
    eq(STRAY_TYPICAL_F, 5e-12);
    eq(SOURCES.join(), 'gm,gcrit');
    // 8 MHz: (2π·8·10⁶)² = (5.026548·10⁷)² = 2.526619·10¹⁵; (17 pF)² = 2.89·10⁻²²
    // product 7.301929·10⁻⁷; · 4 · 80 Ω = 2.336617·10⁻⁴ A/V = 0.2337 mA/V
    near(gmCritical({ fHz: 8e6, esr: 80, c0F: 7 * pF, clF: 10 * pF }), 0.2336617e-3, 1e-6);
    // 32.768 kHz: (2π·32768)² = (205887.4)² = 4.238963·10¹⁰; (8 pF)² = 6.4·10⁻²³
    // product 2.712936·10⁻¹²; · 4 · 70 000 Ω = 7.59622·10⁻⁷ A/V = 0.76 µA/V
    near(gmCritical({ fHz: 32768, esr: 70e3, c0F: 1 * pF, clF: 7 * pF }), 0.759622e-6, 1e-6);
    // Proportional to ESR, to F² and to (C0 + CL)².
    const g = gmCritical({ fHz: 8e6, esr: 80, c0F: 7 * pF, clF: 10 * pF });
    near(gmCritical({ fHz: 8e6, esr: 160, c0F: 7 * pF, clF: 10 * pF }), 2 * g, 1e-12);
    near(gmCritical({ fHz: 16e6, esr: 80, c0F: 7 * pF, clF: 10 * pF }), 4 * g, 1e-12);
    near(gmCritical({ fHz: 8e6, esr: 80, c0F: 14 * pF, clF: 20 * pF }), 4 * g, 1e-12);
    // Only the sum C0 + CL counts.
    near(gmCritical({ fHz: 8e6, esr: 80, c0F: 0, clF: 17 * pF }), g, 1e-12);
  }],

  ['xtalgm: gain margin of the AN2867 example', () => {
    // gain margin = 25 mA/V / 0.2337 mA/V = 107
    const r = run();
    eq(r.ok, true);
    eq(r.source, 'gm');
    near(r.gmCrit, 0.2336617e-3, 1e-6);
    near(r.gainMargin, 106.99, 1e-4);
    eq(r.need, 5);
    eq(r.pass, true);
    near(r.cSumF, 17 * pF, 1e-12);
    near(r.omega, 5.026548e7, 1e-6);
    eq(r.gRef, 25e-3);
    eq(r.rext, null);
    eq(r.drive, null);
    eq(r.dlMaxW, null);
    eq(r.warnings.length, 0);
    // A weak oscillator: 1 mA/V / 0.2337 mA/V = 4.28 < 5.
    const weak = run({ gm: 1e-3 });
    near(weak.gainMargin, 4.2797, 1e-4);
    eq(weak.pass, false);
    eq(weak.warnings.join(), 'xg_low');
    // A lower required margin lets it pass; the default requirement is 5.
    eq(run({ gm: 1e-3, marginReq: 4 }).pass, true);
    eq(xtalGm({ fHz: 8e6, esr: 80, c0F: 7 * pF, clF: 10 * pF, gm: 1e-3 }).need, 5);
    // Exactly five times the critical value passes, a little less does not.
    eq(run({ gm: 5 * r.gmCrit }).pass, true);
    eq(run({ gm: 4.999 * r.gmCrit }).pass, false);
  }],

  ['xtalgm: largest ESR and largest series resistor that keep the margin', () => {
    // ESR_max = 25 mA/V / (5 · 4 · 7.301929·10⁻⁷) = 0.025 / 1.4603858·10⁻⁵ = 1711.9 Ω (= 80 Ω · 106.99 / 5)
    const r = run();
    near(r.esrMax, 1711.87, 1e-5);
    near(r.esrMax, (80 * r.gainMargin) / 5, 1e-12);
    near(esrLimit({ fHz: 8e6, c0F: 7 * pF, clF: 10 * pF, g: 25e-3, margin: 5 }), r.esrMax, 1e-12);
    // Room for a series resistor: 1711.9 − 80 = 1631.9 Ω
    near(r.rextMax, 1631.87, 1e-5);
    // At the limit the margin is the required one.
    near(run({ esr: r.esrMax }).gainMargin, 5, 1e-12);
    near(run({ rext: r.rextMax }).rext.gainMargin, 5, 1e-12);
    // A crystal that fails has no room for a series resistor at all.
    const weak = run({ gm: 1e-3 }); // ESR_max = 80 · 4.2797 / 5 = 68.5 Ω < 80 Ω
    near(weak.esrMax, 68.475, 1e-4);
    eq(weak.rextMax, null);
    // A larger required margin lowers the limit in proportion.
    near(run({ marginReq: 10 }).esrMax, r.esrMax / 2, 1e-12);
  }],

  ['xtalgm: datasheet gives the maximum critical transconductance', () => {
    // g_m,crit = 0.7596 µA/V against G_m,crit,max = 1.7 µA/V: ratio 1.7 / 0.759622 = 2.238 ≥ 1
    const r = xtalGm(lse);
    eq(r.source, 'gcrit');
    near(r.gmCrit, 0.759622e-6, 1e-6);
    near(r.gainMargin, 2.23796, 1e-5);
    eq(r.need, 1);
    eq(r.pass, true);
    // ESR at which g_m,crit reaches the maximum: 70 kΩ · 2.238 = 156.66 kΩ
    near(r.esrMax, 156657, 1e-5);
    near(xtalGm({ ...lse, esr: r.esrMax }).gainMargin, 1, 1e-12);
    // The required gain margin of the other mode is not applied, whatever it is.
    eq(xtalGm({ ...lse, marginReq: 5 }).need, 1);
    eq(xtalGm({ ...lse, marginReq: NaN, gm: NaN }).ok, true);
    // A weaker drive setting: 0.5 µA/V / 0.7596 µA/V = 0.658 → not met.
    const weak = xtalGm({ ...lse, gmCritMax: 0.5e-6 });
    near(weak.gainMargin, 0.65822, 1e-4);
    eq(weak.pass, false);
    ok(weak.warnings.includes('xg_low'), weak.warnings.join());
    // In the gm mode the same numbers need five times more.
    eq(xtalGm({ ...lse, source: 'gm', gm: 1.7e-6 }).pass, false);
    eq(xtalGm({ ...lse, source: 'gm', gm: 1.7e-6 }).need, 5);
  }],

  ['xtalgm: series resistor adds to the ESR', () => {
    // R_ext = 1 kΩ: g_m,crit = 0.2336617 mA/V · 1080/80 = 3.15443 mA/V; margin 25 / 3.15443 = 7.925
    const r = run({ rext: 1000 });
    eq(r.rext.r, 1000);
    eq(r.rext.esrTotal, 1080);
    near(r.rext.gmCrit, 3.154433e-3, 1e-6);
    near(r.rext.gainMargin, 7.92535, 1e-5);
    eq(r.rext.pass, true);
    eq(r.warnings.length, 0);
    // The crystal alone is unchanged.
    near(r.gainMargin, 106.99, 1e-4);
    near(r.rext.gmCrit, gmCritical({ fHz: 8e6, esr: 1080, c0F: 7 * pF, clF: 10 * pF }), 1e-12);
    // R_ext = 2 kΩ: 0.2336617 · 2080/80 = 6.07520 mA/V; margin 4.115 < 5 → the margin is lost
    const big = run({ rext: 2000 });
    near(big.rext.gmCrit, 6.075204e-3, 1e-6);
    near(big.rext.gainMargin, 4.11509, 1e-5);
    eq(big.rext.pass, false);
    eq(big.pass, true);
    eq(big.warnings.join(), 'xg_rextLost');
    // No resistor: 0 or left out.
    eq(run({ rext: 0 }).rext, null);
    eq(run({ rext: undefined }).rext, null);
    // When the crystal alone already fails, the series resistor is not what lost the margin.
    const weak = run({ gm: 1e-3, rext: 100 });
    ok(weak.warnings.includes('xg_low') && !weak.warnings.includes('xg_rextLost'), weak.warnings.join());
    eq(weak.rext.pass, false);
  }],

  ['xtalgm: starting value for the series resistor', () => {
    // CL1 = CL2 = 2 · (10 pF − 5 pF) = 10 pF; R_ext ≈ 1 / (2π · 8 MHz · 10 pF) = 1 / 5.026548·10⁻⁴ S = 1989.4 Ω
    const r = run();
    near(r.loadCapF, 10 * pF, 1e-12);
    near(equalLoadCap(10 * pF, 5 * pF), 10 * pF, 1e-12);
    near(r.suggest.r, 1989.44, 1e-5);
    near(rextStart(8e6, 10 * pF), 1989.44, 1e-5);
    // With it: g_m,crit = 0.2336617 mA/V · 2069.44/80 = 6.04436 mA/V; margin 25 / 6.04436 = 4.136, below 5:
    // the starting value is more than this oscillator allows (at most 1631.9 Ω).
    near(r.suggest.esrTotal, 2069.44, 1e-5);
    near(r.suggest.gmCrit, 6.04436e-3, 1e-5);
    near(r.suggest.gainMargin, 4.13609, 1e-5);
    eq(r.suggest.pass, false);
    ok(r.suggest.r > r.rextMax, 'above the largest series resistor allowed');
    eq(r.warnings.length, 0, 'a suggestion is not a warning');
    // Larger capacitors, smaller resistor: CL = 20 pF → 30 pF → 663.1 Ω
    const big = run({ clF: 20 * pF });
    near(big.loadCapF, 30 * pF, 1e-12);
    near(big.suggest.r, 663.146, 1e-5);
    // The stray capacitance defaults to the typical 5 pF.
    near(xtalGm({ fHz: 8e6, esr: 80, c0F: 7 * pF, clF: 10 * pF, gm: 25e-3 }).loadCapF, 10 * pF, 1e-12);
    // 32.768 kHz, CL 7 pF, Cs 3 pF: 8 pF → 1 / (205887.4 · 8 pF) = 607.1 kΩ, far more than the oscillator allows.
    const w = xtalGm(lse);
    near(w.loadCapF, 8 * pF, 1e-12);
    near(w.suggest.r, 607128, 1e-5);
    eq(w.suggest.pass, false);
  }],

  ['xtalgm: stray capacitance at or above the load capacitance', () => {
    // 2 · (10 pF − 10 pF) = 0 and 2 · (10 pF − 12 pF) < 0: no capacitor value, no starting resistor.
    for (const cs of [10, 12, 100]) {
      const r = run({ csF: cs * pF });
      eq(r.ok, true, `Cs = ${cs} pF`);
      eq(r.loadCapF, null);
      eq(r.suggest, null);
      ok(r.warnings.includes('xg_strayHigh'), r.warnings.join());
      // The start-up check itself does not depend on the stray capacitance.
      near(r.gainMargin, 106.99, 1e-4);
      // The drive level then needs CL1; with it the estimate works.
      eq(run({ csF: cs * pF, vpp: 1 }).drive, null);
      ok(run({ csF: cs * pF, vpp: 1, cl1F: 10 * pF }).drive.dlW > 0, 'drive level with an entered CL1');
    }
    eq(run({ csF: 9.9 * pF }).warnings.length, 0);
    near(run({ csF: 0 }).loadCapF, 20 * pF, 1e-12);
  }],

  ['xtalgm: drive level from the measured voltage', () => {
    // CL1 = 10 pF, Cs = 5 pF, probe 1 pF: C_tot = 10 + 2.5 + 1 = 13.5 pF
    // V_rms = 1.5 V / (2·√2) = 0.530330 V
    // I_rms = 2π · 8 MHz · 0.530330 V · 13.5 pF = 5.026548·10⁷ · 7.159456·10⁻¹² = 359.87 µA
    // DL = 80 Ω · (359.87 µA)² = 80 · 1.295099·10⁻⁷ = 10.36 µW; 10.36 % of 100 µW
    const r = run({ vpp: 1.5, cProbeF: 1 * pF, dlMaxW: 100e-6 });
    const d = r.drive;
    near(d.cTotF, 13.5 * pF, 1e-12);
    near(d.vRms, 0.530330, 1e-6);
    near(d.iRms, 359.875e-6, 1e-5);
    near(d.dlW, 10.3608e-6, 1e-5);
    near(d.ratio, 0.103608, 1e-5);
    eq(d.over, false);
    eq(d.cl1Given, false);
    eq(r.warnings.length, 0);
    // The closed form of AN2867: DL = ESR · (π · F · C_tot · V_pp)² / 2
    near(d.dlW, (80 * (Math.PI * 8e6 * 13.5 * pF * 1.5) ** 2) / 2, 1e-12);
    near(driveLevel({ fHz: 8e6, esr: 80, vpp: 1.5, cl1F: 10 * pF, csF: 5 * pF, cProbeF: 1 * pF }).dlW, d.dlW, 1e-12);
    // The series resistor is not part of the drive level: it is the power in the crystal.
    near(run({ vpp: 1.5, cProbeF: 1 * pF, rext: 1000 }).drive.dlW, d.dlW, 1e-12);
    // 5 V across CL1: (5/1.5)² times more = 115.1 µW > 100 µW → overdriven
    const hot = run({ vpp: 5, cProbeF: 1 * pF, dlMaxW: 100e-6 });
    near(hot.drive.dlW, 115.120e-6, 1e-5);
    eq(hot.drive.over, true);
    ok(hot.warnings.includes('xg_overdrive'), hot.warnings.join());
    // Without a limit there is nothing to compare with.
    const free = run({ vpp: 5 });
    eq(free.drive.ratio, null);
    eq(free.drive.over, false);
    eq(free.drive.cProbeF, 0);
    near(free.drive.cTotF, 12.5 * pF, 1e-12);
    // An entered CL1 replaces 2·(CL − Cs): 18 pF + 2.5 pF = 20.5 pF.
    const own = run({ vpp: 1.5, cl1F: 18 * pF });
    near(own.drive.cTotF, 20.5 * pF, 1e-12);
    eq(own.drive.cl1Given, true);
    // No measurement, no estimate, even with a limit entered.
    eq(run({ dlMaxW: 100e-6 }).drive, null);
    // Watch crystal: CL1 = 8 pF, Cs = 3 pF → 9.5 pF; 0.5 V: I_rms = 205887.4 · 0.176777 V · 9.5 pF = 345.76 nA
    // DL = 70 kΩ · (345.76 nA)² = 8.369 nW, 1.67 % of 0.5 µW
    const w = xtalGm({ ...lse, vpp: 0.5, dlMaxW: 0.5e-6 });
    near(w.drive.iRms, 345.763e-9, 1e-5);
    near(w.drive.dlW, 8.3686e-9, 1e-4);
    near(w.drive.ratio, 0.016737, 1e-4);
  }],

  ['xtalgm: invalid input is reported, not calculated', () => {
    eq(err(xtalGm(undefined)), 'xg_positive');
    eq(err(xtalGm({})), 'xg_positive');
    for (const o of [{ fHz: 0 }, { fHz: -8e6 }, { fHz: NaN }, { esr: 0 }, { esr: -80 }, { esr: Infinity }, { clF: 0 }, { clF: -1e-12 }, { c0F: -1e-12 }, { c0F: NaN },
      { gm: 0 }, { gm: -1 }, { gm: NaN }, { gm: undefined }, { csF: -1e-12 }, { csF: NaN }, { marginReq: NaN }]) {
      eq(err(run(o)), 'xg_positive', JSON.stringify(o));
    }
    for (const o of [{ gmCritMax: 0 }, { gmCritMax: NaN }, { gmCritMax: undefined }]) eq(err(xtalGm({ ...lse, ...o })), 'xg_positive', JSON.stringify(o));
    // Optional values: left out is fine, a wrong number is not.
    for (const o of [{ rext: -1 }, { rext: NaN }, { vpp: 0 }, { vpp: -1 }, { vpp: NaN }, { cl1F: 0 }, { cl1F: -1e-12 }, { cProbeF: -1e-12 }, { dlMaxW: 0 }, { dlMaxW: -1 }, { dlMaxW: Infinity }]) {
      eq(err(run(o)), 'xg_positive', JSON.stringify(o));
    }
    eq(run({ rext: undefined, vpp: undefined, cl1F: undefined, cProbeF: undefined, dlMaxW: undefined }).ok, true);
    eq(run({ rext: null, vpp: null, cl1F: null, cProbeF: null, dlMaxW: null }).ok, true);
    eq(run({ c0F: 0, cProbeF: 0, csF: 0 }).ok, true, 'zero capacitances are allowed');
    // A required margin below 1 makes no sense: the oscillator would not oscillate.
    eq(err(run({ marginReq: 0.5 })), 'xg_margin');
    eq(err(run({ marginReq: 0 })), 'xg_margin');
    eq(err(run({ marginReq: -5 })), 'xg_margin');
    eq(run({ marginReq: 1 }).ok, true);
    // An unknown source falls back to gm.
    eq(run({ source: 'x' }).source, 'gm');
    // Numbers that overflow or vanish are an error as well.
    eq(err(run({ fHz: 1e200 })), 'xg_range');
    eq(err(run({ fHz: 1e-200 })), 'xg_range');
  }],

  ['xtalgm: absurd numbers never give NaN or Infinity', () => {
    const odd = [0, -1, 1e-300, 5e-324, 1e-30, 1e30, 1e300, NaN, Infinity, -Infinity, undefined];
    const keys = ['fHz', 'esr', 'c0F', 'clF', 'gm', 'gmCritMax', 'marginReq', 'rext', 'csF', 'vpp', 'cl1F', 'cProbeF', 'dlMaxW'];
    let good = 0;
    for (const source of SOURCES) {
      const start = { ...hse, gmCritMax: 1.5e-3, source, rext: 330, vpp: 1.5, cl1F: 10 * pF, cProbeF: 1 * pF, dlMaxW: 100e-6 };
      for (const k of keys) {
        for (const x of odd) {
          const r = xtalGm({ ...start, [k]: x });
          const where = `${source} ${k} = ${x}`;
          if (r.ok) {
            good++;
            ok(finiteAll(r), `${where}: a number is not finite`);
          } else {
            ok(Array.isArray(r.errors) && r.errors.length > 0 && r.errors.every((e) => typeof e === 'string'), `${where}: no error key`);
          }
        }
      }
    }
    ok(good > 60, `some of the odd values are still valid inputs (${good})`);
  }],

  ['xtalgm page: every source, example and option renders steps whose numbers give the result', () => {
    const ex = Object.fromEntries(fields.find((f) => f.key === 'ex').options.map((o) => [o.value, o.set]));
    const sets = [
      {}, { src: 'gcrit' }, ex.hse, ex.lse, ex.dl, { rext: 1000 }, { rext: 2, rext_u: 'kohm' }, { gm: 1 }, { gm: 1, rext: 100 },
      { f: 32.768, f_u: 'kHz', esr: 70, esr_u: 'kohm', c0: 1, cl: 7, gm: 8.5, gm_u: 'uAV', cs: 3 }, { ...ex.lse, vpp: 500, vpp_u: 'mV', dlmax: 0.5 },
      { vpp: 1.5 }, { vpp: 5, dlmax: 100, cp: 1 }, { vpp: 1.5, cl1: 18, cp: 2.2, dlmax: 500 }, { cs: 12 }, { cs: 12, vpp: 2, cl1: 10 }, { cs: 0 }, { c0: 0 },
      { esr: 1711 }, { esr: 1712 }, { esr: 1700, rext: 5 }, { mreq: 10 }, { mreq: 1 }, { f: 25, esr: 40, c0: 3, cl: 8, gm: 10, rext: 220, vpp: 800, vpp_u: 'mV', dlmax: 200 },
      { src: 'gcrit', gcm: 0.2 }, { src: 'gcrit', gcm: 300, gcm_u: 'uAV', rext: 470 },
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
        if (steps.length < 3) problems.push(`${where}: only ${steps.length} steps`);
        for (const s of steps) {
          if (!s.num || !s.res) { problems.push(`${where}: step without numbers (${s.label})`); continue; }
          let calc;
          let shown;
          try { calc = evaluate(s.num); shown = evaluate(s.res); } catch (e) { problems.push(`${where}: ${s.label} cannot be evaluated (${e.message})`); continue; }
          checked++;
          // Tighter than the general check: 0.5 %, and no power of ten apart.
          if (!agrees(calc, shown, 0.005) || (shown !== 0 && Math.abs(calc / shown - 1) > 0.005)) problems.push(`${where}: ${s.label}: ${s.num} → ${calc}, shown ${s.res}`);
        }
      }
    });
    ok(problems.length === 0, `\n${[...new Set(problems)].slice(0, 12).join('\n')}`);
    ok(checked > 300, `expected the steps to be evaluated, got ${checked}`);
  }],

  ['xtalgm page: headline values, verdicts, units and the examples', () => {
    const before = getLang();
    setLang('en');
    try {
      // Defaults are the AN2867 example: gain margin 107, g_m,crit 0.2337 mA/V.
      const d = show({});
      near(d.r.gainMargin, 106.99, 1e-4);
      ok(/hero-value">107</.test(d.html) && d.html.includes('0.2337 <span class="u">mA/V</span>'), 'gain margin and g_m,crit as heroes');
      ok(d.html.includes('class="msg ok"') && !d.html.includes('class="msg error"') && !d.html.includes('class="msg warn"'), 'pass');
      ok(d.html.includes('1.712 kΩ') && d.html.includes('1.632 kΩ') && d.html.includes('1.989 kΩ'), 'largest ESR, largest and starting series resistor');
      ok(d.html.includes('4.136 — below the required 5'), 'the starting value costs the margin, and the table says so');
      // Too little gain: an error with the largest ESR; never a warning about the series resistor.
      const weak = show({ gm: 1, rext: 100 });
      ok(weak.html.includes('class="msg error"') && weak.html.includes('68.5 Ω') && !weak.html.includes('class="msg warn"'), 'gain too low');
      // Margin lost by the series resistor: an error that names the limit, and no "condition met".
      const lost = show({ rext: 2, rext_u: 'kohm' });
      ok(!lost.html.includes('class="msg ok"') && lost.html.includes('class="msg error"'), 'margin lost by Rext is an error');
      ok(lost.html.includes('from 107 to 4.12') && lost.html.includes('at most 1.63 kΩ'), 'it names both margins and the limit');
      // A series resistor that keeps the margin: the verdict quotes the margin with it (25 / 3.154 = 7.93).
      const kept = show({ rext: 1000 });
      ok(kept.html.includes('class="msg ok"') && kept.html.includes('The gain margin (7.93)') && !kept.html.includes('class="msg error"'), 'verdict with Rext');
      // Units: 32.768 kHz, 70 kΩ and 8.5 µA/V.
      const w = show({ f: 32.768, f_u: 'kHz', esr: 70, esr_u: 'kohm', c0: 1, cl: 7, gm: 8.5, gm_u: 'uAV' });
      near(w.r.gmCrit, 0.759622e-6, 1e-6);
      near(w.r.gainMargin, 11.1898, 1e-4); // 8.5 / 0.759622
      ok(w.html.includes('0.7596 <span class="u">µA/V</span>'), 'a small transconductance is shown in µA/V');
      near(show({ f: 8000, f_u: 'kHz' }).r.gmCrit, 0.2336617e-3, 1e-6);
      near(show({ f: 8e6, f_u: 'Hz' }).r.gmCrit, 0.2336617e-3, 1e-6);
      near(show({ vpp: 1500, vpp_u: 'mV', cp: 1 }).r.drive.dlW, 10.3608e-6, 1e-5);
      // Empty optional fields mean "not given"; the fields of the other source are ignored.
      const none = show({});
      eq(none.r.rext, null);
      eq(none.r.drive, null);
      eq(none.r.dlMaxW, null);
      eq(show({ gcm: '', src: 'gm' }).r.ok, true);
      eq(show({ gm: '', mreq: '', src: 'gcrit' }).r.ok, true);
      // Overdriven crystal: a warning.
      const hot = show({ vpp: 5, dlmax: 100, cp: 1 });
      ok(hot.html.includes('class="msg warn"') && hot.html.includes('overdriven'), 'overdrive warning');
      // Stray capacitance above the load capacitance: said in a message, and no starting value is shown.
      const stray = show({ cs: 12 });
      ok(stray.html.includes('class="msg warn"') && stray.html.includes('gives no capacitor value') && !stray.html.includes('Starting value'), 'stray above load');
      // Engine errors reach the page as messages, with the generic drawing.
      const wrong = show({ mreq: 0.5 });
      eq(wrong.r.ok, false);
      ok(wrong.html.includes('class="msg error"') && wrong.svg.includes('<svg'), 'error message and drawing');
      // The examples.
      const ex = Object.fromEntries(fields.find((f) => f.key === 'ex').options.map((o) => [o.value, o.set]));
      near(show(ex.hse).r.gainMargin, 106.99, 1e-4);
      near(show(ex.lse).r.gmCrit, 0.759622e-6, 1e-6);
      near(show(ex.lse).r.gainMargin, 2.23796, 1e-5);
      eq(show(ex.lse).r.source, 'gcrit');
      near(show(ex.dl).r.rext.gainMargin, 7.92535, 1e-5);
      near(show(ex.dl).r.drive.dlW, 10.3608e-6, 1e-5);
      for (const k of ['hse', 'lse', 'dl']) {
        eq(show(ex[k]).r.pass, true, k);
        eq(show(ex[k]).r.warnings.length, 0, k);
        // `<key>_u` entries name the unit of a value; they are not fields.
        eq(Object.keys(ex[k]).filter((x) => !x.endsWith('_u')).sort().join(), fields.map((f) => f.key).filter((x) => x !== 'ex').sort().join(), `${k} sets every field`);
      }
    } finally {
      setLang(before);
    }
  }],

  ['xtalgm page: the diagram stays clean for every option and for failing or extreme inputs', () => {
    const sets = [
      {}, { src: 'gcrit' }, { ex: 'lse' }, { rext: 1000 }, { rext: 2, rext_u: 'kohm' }, { gm: 1 }, { vpp: 1.5 }, { vpp: 5, dlmax: 100, cp: 1 }, { vpp: 1.5, cl1: 18, dlmax: 500 },
      { cs: 12 }, { cs: 12, vpp: 2 }, { cs: 0, c0: 0 }, { f: 1e-9, f_u: 'Hz', gm: 1e-12 }, { f: 1e6 }, { esr: 1e-9 }, { esr: 1e9, esr_u: 'kohm' }, { cl: 1e-6 }, { cl: 1e9 },
      { gm: 1e-9, gm_u: 'uAV' }, { gm: 1e12 }, { rext: 1e12 }, { vpp: 1e6 }, { vpp: 1e-9, vpp_u: 'mV', dlmax: 1e-9 }, { mreq: 1e6 },
      { f: 0.032768, esr: 70000, c0: 1, cl: 7, src: 'gcrit', gcm: 0.0017, cs: 3, rext: 47, rext_u: 'kohm', vpp: 0.5, dlmax: 0.5 },
      // Invalid input: the drawing falls back to symbols.
      { f: 0 }, { esr: -1 }, { cl: 0 }, { gm: 0 }, { mreq: 0.5 }, { src: 'gcrit', gcm: 0 }, { f: 1e200 },
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
        // The series resistor is dashed exactly when none is used.
        const dashed = /class="comp dash"/.test(out.svg);
        const used = out.r.ok && !!out.r.rext;
        if (dashed === used) problems.push(`${lang} ${id}: series resistor ${used ? 'used but dashed' : 'unused but solid'}`);
      }
    });
    ok(problems.length === 0, `\n${[...new Set(problems)].slice(0, 12).join('\n')}`);
    // Live values are in the drawing.
    const before = getLang();
    setLang('en');
    try {
      const { svg } = show({ rext: 1000, vpp: 1.5, cp: 1, dlmax: 100 });
      for (const s of ['F = 8 MHz', 'ESR = 80 Ω', 'C0 = 7 pF · CL = 10 pF', 'Cs = 5 pF', 'gm = 25 mA/V', '1 kΩ', '10 pF', 'gm,crit = 0.2337 mA/V · Gain margin = 107',
        'Rext: gm,crit = 3.154 mA/V · Gain margin = 7.93', 'DL = 10.4 µW · DLmax = 100 µW']) ok(svg.includes(s), `diagram shows "${s}"`);
    } finally {
      setLang(before);
    }
  }],

  ['xtalgm page: Turkish and English strings match, and every key the page uses exists', () => {
    const tr = Object.keys(page.strings.tr);
    const en = new Set(Object.keys(page.strings.en));
    eq(tr.filter((k) => !en.has(k)).join(), '', 'only in tr');
    eq([...en].filter((k) => !tr.includes(k)).join(), '', 'only in en');
    ok(tr.every((k) => page.strings.tr[k] && page.strings.en[k]), 'no empty string');
    ok(tr.every((k) => /^(xg_|ok_xg_|warn_xg_|err_xg_)/.test(k)), 'all keys carry the xg_ prefix, so no other page is overwritten');
    // Every message key the engine can return has a text.
    for (const k of ['xg_positive', 'xg_margin', 'xg_range', 'xg_low', 'xg_lowCrit', 'xg_rextLost']) ok(en.has(`err_${k}`), `err_${k}`);
    for (const k of ['xg_overdrive', 'xg_strayHigh']) ok(en.has(`warn_${k}`), `warn_${k}`);
    // Field keys are unique and short (they become URL parameters); option values are lowercase ASCII.
    eq(new Set(fields.map((f) => f.key)).size, fields.length, 'unique keys');
    ok(fields.every((f) => /^[a-z0-9]{1,6}$/.test(f.key)), 'short keys');
    ok(fields.every((f) => (f.options ?? []).every((o) => /^[a-z0-9]+$/.test(String(o.value)))), 'option values');
    eq(page.id, 'xtalgm');
    // No untranslated key shows up in a rendered result, a warning or the drawing.
    inBothLanguages((lang) => {
      for (const set of [{}, { src: 'gcrit' }, { src: 'gcrit', gcm: 0.1 }, { gm: 1 }, { rext: 2000 }, { rext: 1000, vpp: 5, dlmax: 100 }, { vpp: 1 }, { cs: 12 }, { mreq: 0.5 }, { f: 1e200 }, { gm: 0 }]) {
        const { html, svg } = show(set);
        ok(!/\b(ok_|warn_|err_)?xg_[A-Za-z0-9]+/.test(`${html} ${svg}`.replace(/data-hl="[^"]*"/g, '')), `${lang} ${JSON.stringify(set)}: an untranslated key is shown`);
      }
    });
  }],
];
