// Trace current capacity.
//
// IPC-2221 — chart fit of the 1956 NBS data:  I = k · ΔT^0.44 · A^0.725
//   k = 0.048 external, 0.024 internal; A in mil². Charts valid ≤ 35 A,
//   ΔT 10–100 °C, 0.5–3 oz, width ≤ 400 mil.
//
// IPC-2152 — closed-form fit of the baseline ("universal") chart:
//   A = (117.555·ΔT^−0.913 + 1.15) · I^(0.84·ΔT^−0.108 + 1.159)   [mil²]
//   (J. Olson; published by L. Rozenblat, smps.us). Baseline: 0.070" (1.78 mm)
//   polyimide board, 3 oz copper, still air, no copper plane; applies to
//   internal and external conductors alike. Chart modifiers (multiply the
//   area): copper thickness, board thickness, distance to a copper plane —
//   curve fits of the IPC-2152 modifier charts.

import { MIL_PER_OZ, M_PER_MIL, MM_PER_MIL } from './units.js';
import { copperResistivity } from './copper.js';

export const K_EXTERNAL = 0.048;
export const K_INTERNAL = 0.024;
const B = 0.44;
const C = 0.725;

// ---------- IPC-2221 ----------
export function ipc2221AreaMil2(currentA, deltaTC, isExternal) {
  const k = isExternal ? K_EXTERNAL : K_INTERNAL;
  return Math.pow(currentA / (k * Math.pow(deltaTC, B)), 1 / C);
}
export function ipc2221CurrentA(areaMil2, deltaTC, isExternal) {
  const k = isExternal ? K_EXTERNAL : K_INTERNAL;
  return k * Math.pow(deltaTC, B) * Math.pow(areaMil2, C);
}
export function ipc2221RiseC(currentA, areaMil2, isExternal) {
  const k = isExternal ? K_EXTERNAL : K_INTERNAL;
  return Math.pow(currentA / (k * Math.pow(areaMil2, C)), 1 / B);
}
export const ipc2221WidthMil = (currentA, deltaTC, thicknessMil, isExternal) =>
  ipc2221AreaMil2(currentA, deltaTC, isExternal) / thicknessMil;

// ---------- IPC-2152 ----------
/** Baseline chart area (mil²) for current I (A) and rise ΔT (°C). */
export function ipc2152BaseAreaMil2(currentA, deltaTC) {
  return (117.555 * Math.pow(deltaTC, -0.913) + 1.15) * Math.pow(currentA, 0.84 * Math.pow(deltaTC, -0.108) + 1.159);
}

/**
 * Copper-thickness modifier (baseline 3 oz = 1). For the same cross-section,
 * thinner copper (a wider trace) runs cooler. Fits for 1 and 2 oz, linear
 * between, 1-oz curve below 1 oz (conservative), 1.0 at and above 3 oz.
 */
export function copperModifier(copperOz, currentA) {
  const ln = Math.log(Math.max(currentA, 1e-6));
  const m1 = Math.min(1, -0.0318 * ln + 0.9128);
  const m2 = Math.min(1, -0.0185 * ln + 0.9861);
  if (copperOz <= 1) return m1;
  if (copperOz <= 2) return m1 + (m2 - m1) * (copperOz - 1);
  if (copperOz <= 3) return m2 + (1 - m2) * (copperOz - 2);
  return 1;
}

/** Board-thickness modifier (baseline 0.070" = 1): thinner boards spread less heat. */
export const boardModifier = (boardMil) => 25.959 * Math.pow(boardMil, -0.7666);

/** Copper-plane modifier vs distance trace→plane (mil); 1 without a plane. */
export const planeModifier = (distMil) => Math.min(1, 0.0031 * distMil + 0.4054);

export function ipc2152Modifiers({ copperOz, currentA, boardMm, planeMm }) {
  const copper = copperModifier(copperOz, currentA);
  const board = boardMm > 0 ? boardModifier(boardMm / MM_PER_MIL) : 1;
  const plane = planeMm > 0 ? planeModifier(planeMm / MM_PER_MIL) : 1;
  return { copper, board, plane, total: copper * board * plane };
}

/** Adjusted IPC-2152 area (mil²). */
export function ipc2152AreaMil2(currentA, deltaTC, env) {
  const m = ipc2152Modifiers({ ...env, currentA });
  return { area: ipc2152BaseAreaMil2(currentA, deltaTC) * m.total, base: ipc2152BaseAreaMil2(currentA, deltaTC), mods: m };
}

/** Geometric bisection for monotonic f on [lo, hi]; returns x with f(x) = 0. */
function solve(f, lo, hi, increasing) {
  let a = lo;
  let b = hi;
  for (let i = 0; i < 200; i++) {
    const m = Math.sqrt(a * b);
    const v = f(m);
    if ((v > 0) === increasing) b = m; else a = m;
    if (b / a - 1 < 1e-12) break;
  }
  return Math.sqrt(a * b);
}

export function ipc2152CurrentA(areaMil2, deltaTC, env) {
  const f = (i) => ipc2152AreaMil2(i, deltaTC, env).area - areaMil2;
  return solve(f, 1e-6, 1e4, true);
}

export function ipc2152RiseC(currentA, areaMil2, env) {
  const f = (dt) => ipc2152AreaMil2(currentA, dt, env).area - areaMil2;
  return solve(f, 0.01, 1000, false);
}

// ---------- Full calculation ----------
/**
 * @param {object} p
 * @param {'ipc2152'|'ipc2221'} p.standard
 * @param {'width'|'current'|'rise'} p.mode
 * @param {boolean} p.isExternal          (IPC-2221 only)
 * @param {number} p.thicknessMil         copper thickness
 * @param {number} [p.currentA]           modes width / rise
 * @param {number} [p.deltaTC]            modes width / current
 * @param {number} [p.widthMil]           modes current / rise
 * @param {number} [p.marginPct]          current design margin (%)
 * @param {number} [p.minWidthMil]        fabricator minimum width
 * @param {number} [p.boardMm]            IPC-2152 board thickness
 * @param {number} [p.planeMm]            IPC-2152 distance to plane (0/NaN = no plane)
 * @param {number} [p.ambientC]           DC analysis
 * @param {number} [p.lengthM]            DC analysis
 */
export function calculateTraceWidth(p) {
  const mode = p.mode ?? 'width';
  const errors = [];
  if (!(p.thicknessMil > 0)) errors.push('thickness');
  if (mode !== 'current' && !(p.currentA > 0)) errors.push('current');
  if (mode !== 'rise' && !(p.deltaTC > 0)) errors.push('tempRise');
  if (mode !== 'width' && !(p.widthMil > 0)) errors.push('width');
  if (errors.length) return { ok: false, errors };

  const t = p.thicknessMil;
  const copperOz = t / MIL_PER_OZ;
  const margin = 1 + (p.marginPct > 0 ? p.marginPct / 100 : 0);
  const is2152 = p.standard !== 'ipc2221';
  const env = { copperOz, boardMm: p.boardMm, planeMm: p.planeMm };
  const warnings = [];

  const areaFor = (i, dt) => (is2152 ? ipc2152AreaMil2(i, dt, env).area : ipc2221AreaMil2(i, dt, p.isExternal));
  const currentFor = (a, dt) => (is2152 ? ipc2152CurrentA(a, dt, env) : ipc2221CurrentA(a, dt, p.isExternal));
  const riseFor = (i, a) => (is2152 ? ipc2152RiseC(i, a, env) : ipc2221RiseC(i, a, p.isExternal));

  let widthMil;
  let currentA;
  let deltaTC;
  let calcWidthMil = null;
  if (mode === 'width') {
    currentA = p.currentA;
    deltaTC = p.deltaTC;
    calcWidthMil = areaFor(currentA * margin, deltaTC) / t;
    widthMil = calcWidthMil;
    if (p.minWidthMil > 0 && widthMil < p.minWidthMil) {
      widthMil = p.minWidthMil;
      warnings.push('minWidthApplied');
    }
  } else if (mode === 'current') {
    widthMil = p.widthMil;
    deltaTC = p.deltaTC;
    currentA = currentFor(widthMil * t, deltaTC) / margin;
  } else {
    widthMil = p.widthMil;
    currentA = p.currentA;
    deltaTC = riseFor(currentA * margin, widthMil * t);
  }
  const areaMil2 = widthMil * t;

  // Validity ranges
  if (is2152) {
    if (currentA * margin > 26) warnings.push('ipc2152CurrentRange');
    if (deltaTC < 2 || deltaTC > 100) warnings.push('ipc2152TempRange');
    if (copperOz < 0.45 || copperOz > 3.1) warnings.push('ipc2152CopperRange');
    if (p.boardMm > 0 && (p.boardMm < 0.72 || p.boardMm > 2.36)) warnings.push('ipc2152BoardRange');
    if (p.planeMm > 0 && (p.planeMm < 0.14 || p.planeMm > 2.4)) warnings.push('ipc2152PlaneRange');
  } else {
    if (currentA * margin > 35) warnings.push('ipc2221CurrentRange');
    if (deltaTC < 10 || deltaTC > 100) warnings.push('ipc2221TempRange');
    if (copperOz < 0.45 || copperOz > 3.1) warnings.push('ipc2221ThicknessRange');
    if (widthMil > 400) warnings.push('ipc2221WidthRange');
    if ((p.boardMm > 0 && p.boardMm <= 0.8) || t * 25.4 >= 108) warnings.push('ipc2221ExtraDerate');
  }

  const result = {
    ok: true,
    standard: is2152 ? 'ipc2152' : 'ipc2221',
    mode,
    widthMil,
    widthMm: widthMil * MM_PER_MIL,
    calcWidthMil,
    currentA,
    deltaTC,
    areaMil2,
    copperOz,
    margin,
    warnings,
    ipc2152: null,
    compare: null,
    dc: null,
  };

  if (is2152) {
    const r = ipc2152AreaMil2(currentA * margin, deltaTC, env);
    result.ipc2152 = { baseArea: r.base, mods: r.mods };
  }
  // Same current and rise under the other method(s), for comparison.
  result.compare = {
    ipc2152: ipc2152AreaMil2(currentA * margin, deltaTC, env).area / t,
    ipc2221Ext: ipc2221AreaMil2(currentA * margin, deltaTC, true) / t,
    ipc2221Int: ipc2221AreaMil2(currentA * margin, deltaTC, false) / t,
  };

  if (p.lengthM > 0) {
    const ambientC = Number.isFinite(p.ambientC) ? p.ambientC : 25;
    const conductorC = ambientC + deltaTC;
    const rho = copperResistivity(conductorC);
    const area = widthMil * M_PER_MIL * (t * M_PER_MIL);
    const r = (rho * p.lengthM) / area;
    result.dc = {
      conductorC,
      resistanceOhm: r,
      voltageDropV: currentA * r,
      powerLossW: currentA * currentA * r,
    };
  }
  return result;
}
