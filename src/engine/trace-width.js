// Trace width (current capacity) engine.
//
// - IPC-2221 : classic chart-fit formula  I = k · ΔT^0.44 · A^0.725
// - IPC-2152 : correction-factor model on top of the same base curve
//              (airflow, altitude, conformal coating, pulsed current,
//              copper thickness, nearby copper plane), followed by a
//              PCB-class safety margin.
//
// Ported from the original C# / Avalonia implementation
// (Models/TraceWidthIpc2221.cs, TraceWidthIpc2152.cs, Ipc2152Factors.cs).

import { clamp, interp1d, interp2d } from './math.js';
import { MIL_PER_OZ, MM_PER_MIL, M_PER_MIL } from './units.js';
import { copperResistivity } from './copper.js';

export const K_EXTERNAL = 0.048;
export const K_INTERNAL = 0.024;
export const EXP_DT = 0.44;
export const EXP_AREA = 0.725;

/** Cross-section area (mil²) that carries `currentA` at a rise of `deltaTC` (IPC-2221). */
export function ipc2221AreaMil2(currentA, deltaTC, isExternal) {
  const k = isExternal ? K_EXTERNAL : K_INTERNAL;
  return Math.pow(currentA / (k * Math.pow(deltaTC, EXP_DT)), 1 / EXP_AREA);
}

/** Current (A) carried by a cross-section of `areaMil2` at a rise of `deltaTC` (IPC-2221). */
export function ipc2221CurrentA(areaMil2, deltaTC, isExternal) {
  const k = isExternal ? K_EXTERNAL : K_INTERNAL;
  return k * Math.pow(deltaTC, EXP_DT) * Math.pow(areaMil2, EXP_AREA);
}

export function ipc2221WidthMil(currentA, deltaTC, thicknessMil, isExternal) {
  return ipc2221AreaMil2(currentA, deltaTC, isExternal) / thicknessMil;
}

// ---------------------------------------------------------------------------
// IPC-2152 correction factors ("capacity multipliers": >1 means the trace can
// carry more current, so a narrower trace is needed).
// ---------------------------------------------------------------------------

export const AIRFLOW = {
  still: 1.0,
  low: 1.25, // < 1 m/s
  medium: 1.5, // 1–3 m/s
  high: 1.9, // ≥ 5 m/s
};

export const COATING = {
  none: 1.0,
  thin: 0.925, // 25–50 µm
  standard: 0.875, // 50–100 µm
  thick: 0.8, // > 100 µm
};

export function airflowFactor(isExternal, airflow) {
  const ext = AIRFLOW[airflow] ?? 1.0;
  // Internal layers: minimal benefit (< ~5 %).
  return isExternal ? ext : 1 + 0.05 * (ext - 1);
}

/** F = 1 − h / 15000, floored at 0.2. */
export function altitudeFactor(altitudeM) {
  return clamp(1 - Math.max(0, altitudeM) / 15000, 0.2, 1.0);
}

export function coatingFactor(coating) {
  return COATING[coating] ?? 1.0;
}

const THK_OZ = [0.5, 1, 2, 3, 4, 6, 10];
const THK_EXT = [0.7, 1.0, 1.45, 1.8, 2.1, 2.6, 3.4];
const THK_INT = [0.65, 1.0, 1.5, 1.9, 2.25, 2.85, 3.8];
export const THICKNESS_TABLE_RANGE_OZ = [THK_OZ[0], THK_OZ[THK_OZ.length - 1]];

/** Empirical capacity multiplier vs 1 oz copper. */
export function thicknessEmpiricalFactor(isExternal, copperOz) {
  const oz = clamp(copperOz, THK_OZ[0], THK_OZ[THK_OZ.length - 1]);
  return interp1d(oz, THK_OZ, isExternal ? THK_EXT : THK_INT);
}

/** The base formula already scales with t^0.725; correct it to the empirical curve. */
export function thicknessCorrectionRatio(isExternal, copperOz) {
  const oz = Math.max(0.01, copperOz);
  return thicknessEmpiricalFactor(isExternal, oz) / Math.pow(oz, EXP_AREA);
}

const DUTY = [0.1, 0.2, 0.3, 0.5, 0.7, 0.9, 1.0];
const FREQ = [1, 10, 100, 1000];
const DUTY_TABLE = [
  [3.0, 3.0, 3.0, 2.8],
  [2.2, 2.2, 2.1, 2.0],
  [1.8, 1.8, 1.7, 1.6],
  [1.4, 1.4, 1.3, 1.3],
  [1.2, 1.2, 1.1, 1.1],
  [1.05, 1.05, 1.05, 1.0],
  [1.0, 1.0, 1.0, 1.0],
];
export const DUTY_RANGE = [0.1, 1.0];
export const FREQ_RANGE_HZ = [1, 1000];

/** Pulsed-current multiplier. dutyCycle is a fraction (1 = continuous). */
export function dutyCycleFactor(dutyCycle, frequencyHz) {
  const d = clamp(dutyCycle, 0.1, 1.0);
  if (d >= 0.999) return 1.0;
  return interp2d(d, frequencyHz, DUTY, FREQ, DUTY_TABLE);
}

const PLANE_AREA = [0, 25, 100, 400]; // mm²
const PLANE_WIDTH = [0.5, 1, 2, 3, 5]; // mm
// Current with plane ÷ current without plane (1 oz, internal, 10 °C).
const PLANE_TABLE = [
  [1.0, 0.9 / 0.8, 1.0 / 0.8, 1.1 / 0.8],
  [1.0, 1.6 / 1.4, 1.8 / 1.4, 2.0 / 1.4],
  [1.0, 2.8 / 2.4, 3.2 / 2.4, 3.5 / 2.4],
  [1.0, 3.9 / 3.3, 4.5 / 3.3, 5.0 / 3.3],
  [1.0, 6.0 / 5.0, 7.0 / 5.0, 7.8 / 5.0],
];
export const PLANE_AREA_RANGE_MM2 = [0, 400];

export function planeFactor(isExternal, planeAreaMm2, widthMm) {
  if (!(planeAreaMm2 > 0)) return 1.0;
  const f = interp2d(widthMm, planeAreaMm2, PLANE_WIDTH, PLANE_AREA, PLANE_TABLE);
  // External layers get a smaller share of the plane benefit.
  return isExternal ? 1 + 0.7 * (f - 1) : f;
}

export const CLASS_MARGIN = { 1: 1.2, 2: 1.3, 3: 1.5 };
export const CLASS_MIN_WIDTH_MIL = { 1: 5, 2: 4, 3: 4 };

const DEFAULT_ENV = {
  airflow: 'still',
  altitudeM: 0,
  coating: 'none',
  dutyCycle: 1,
  frequencyHz: 1,
  planeAreaMm2: 0,
};

/**
 * IPC-2152 width (mil) before class margin.
 * Iterates because the plane factor depends on the width itself.
 */
export function ipc2152WidthMil(currentA, deltaTC, copperOz, isExternal, env = {}) {
  const e = { ...DEFAULT_ENV, ...env };
  const tMil = Math.max(0.01, copperOz) * MIL_PER_OZ;
  const dT = Math.max(0.1, deltaTC);
  const base = (i) => ipc2221AreaMil2(i, dT, isExternal) / tMil;

  const factors = {
    airflow: airflowFactor(isExternal, e.airflow),
    altitude: altitudeFactor(e.altitudeM),
    coating: coatingFactor(e.coating),
    duty: dutyCycleFactor(e.dutyCycle, e.frequencyHz),
    thickness: thicknessCorrectionRatio(isExternal, copperOz),
    plane: 1,
  };
  const nonPlane =
    factors.airflow * factors.altitude * factors.coating * factors.duty * factors.thickness;

  let widthMil = base(currentA);
  for (let iter = 0; iter < 8; iter++) {
    factors.plane = planeFactor(isExternal, e.planeAreaMm2, widthMil * MM_PER_MIL);
    const total = Math.max(1e-9, nonPlane * factors.plane);
    const next = base(currentA / total);
    const done = Math.abs(next - widthMil) < 1e-6;
    widthMil = next;
    if (done) break;
  }
  factors.total = nonPlane * factors.plane;
  return { widthMil, factors };
}

/**
 * Full trace-width calculation used by the UI.
 *
 * @param {object} p
 * @param {'ipc2221'|'ipc2152'} p.standard
 * @param {1|2|3} p.pcbClass
 * @param {boolean} p.isExternal
 * @param {number} p.currentA
 * @param {number} p.deltaTC          temperature rise (°C)
 * @param {number} p.thicknessMil     copper thickness (mil)
 * @param {number} [p.ambientC]       ambient temperature (°C), for DC analysis
 * @param {number} [p.lengthM]        trace length (m), for DC analysis
 * @param {object} [p.env]            IPC-2152 environment
 */
export function calculateTraceWidth(p) {
  const errors = [];
  if (!(p.currentA > 0)) errors.push('current');
  if (!(p.deltaTC > 0)) errors.push('tempRise');
  if (!(p.thicknessMil > 0)) errors.push('thickness');
  if (errors.length) return { ok: false, errors };

  const copperOz = p.thicknessMil / MIL_PER_OZ;
  const pcbClass = CLASS_MIN_WIDTH_MIL[p.pcbClass] ? p.pcbClass : 2;
  const warnings = [];

  let calcWidthMil;
  let factors = null;
  let margin = 1;
  if (p.standard === 'ipc2152') {
    const r = ipc2152WidthMil(p.currentA, p.deltaTC, copperOz, p.isExternal, p.env);
    factors = r.factors;
    margin = CLASS_MARGIN[pcbClass];
    calcWidthMil = r.widthMil;

    const env = { ...DEFAULT_ENV, ...p.env };
    if (copperOz < THICKNESS_TABLE_RANGE_OZ[0] || copperOz > THICKNESS_TABLE_RANGE_OZ[1])
      warnings.push('thicknessOutOfTable');
    if (env.dutyCycle < DUTY_RANGE[0]) warnings.push('dutyOutOfTable');
    if (env.dutyCycle < 1 && (env.frequencyHz < FREQ_RANGE_HZ[0] || env.frequencyHz > FREQ_RANGE_HZ[1]))
      warnings.push('freqOutOfTable');
    if (env.planeAreaMm2 > PLANE_AREA_RANGE_MM2[1]) warnings.push('planeOutOfTable');
  } else {
    calcWidthMil = ipc2221WidthMil(p.currentA, p.deltaTC, p.thicknessMil, p.isExternal);
    // Validity range of the IPC-2221 (ex IPC-D-275) charts.
    const maxI = p.isExternal ? 35 : 17.5;
    if (p.currentA > maxI) warnings.push('ipc2221CurrentRange');
    if (p.deltaTC < 10 || p.deltaTC > 100) warnings.push('ipc2221TempRange');
    if (copperOz < 0.5 || copperOz > 3) warnings.push('ipc2221ThicknessRange');
  }

  const marginWidthMil = calcWidthMil * margin;
  const classMinMil = CLASS_MIN_WIDTH_MIL[pcbClass];
  const widthMil = Math.max(marginWidthMil, classMinMil);
  if (widthMil > marginWidthMil) warnings.push('classMinimumApplied');
  if (p.standard !== 'ipc2152' && widthMil > 400) warnings.push('ipc2221WidthRange');

  const result = {
    ok: true,
    standard: p.standard,
    widthMil,
    widthMm: widthMil * MM_PER_MIL,
    calcWidthMil,
    marginWidthMil,
    margin,
    classMinMil,
    areaMil2: widthMil * p.thicknessMil,
    copperOz,
    factors,
    warnings,
    dc: null,
  };

  if (p.lengthM > 0) {
    const ambientC = Number.isFinite(p.ambientC) ? p.ambientC : 25;
    const conductorC = ambientC + p.deltaTC;
    const rho = copperResistivity(conductorC);
    const area = widthMil * M_PER_MIL * (p.thicknessMil * M_PER_MIL);
    const r = (rho * p.lengthM) / area;
    result.dc = {
      conductorC,
      resistivity: rho,
      resistanceOhm: r,
      voltageDropV: p.currentA * r,
      powerLossW: p.currentA * p.currentA * r,
    };
  }
  return result;
}
