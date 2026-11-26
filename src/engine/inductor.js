// Planar spiral inductors — S. S. Mohan et al., "Simple accurate expressions
// for planar spiral inductances", IEEE JSSC 34(10), 1999.
//
//   d_avg = (d_out + d_in)/2,  ρ = (d_out − d_in)/(d_out + d_in)   (fill ratio)
//   Modified Wheeler:  L = K1·µ0·n²·d_avg / (1 + K2·ρ)
//   Current sheet:     L = µ0·n²·d_avg·c1/2 · [ln(c2/ρ) + c3·ρ + c4·ρ²]

import { copperResistivity } from './copper.js';

const MU0 = 4e-7 * Math.PI;

export const SHAPES = ['square', 'hexagonal', 'octagonal', 'circular'];

const WHEELER = {
  square: [2.34, 2.75],
  hexagonal: [2.33, 3.82],
  octagonal: [2.25, 3.55],
};
const SHEET = {
  square: [1.27, 2.07, 0.18, 0.13],
  hexagonal: [1.09, 2.23, 0.0, 0.17],
  octagonal: [1.07, 2.29, 0.0, 0.19],
  circular: [1.0, 2.46, 0.0, 0.2],
};
// Perimeter / diameter for the turn-length estimate.
const PERIMETER = { square: 4, hexagonal: 6 / Math.sqrt(3), octagonal: 8 * Math.tan(Math.PI / 8), circular: Math.PI };

/**
 * @param {object} p  lengths in mm: { shape, turns, widthMm, spaceMm, outerMm, thicknessUm?, tempC? }
 */
export function planarInductor(p) {
  const { shape, turns: n, widthMm: w, spaceMm: s, outerMm: dOut } = p;
  const errors = [];
  if (!(n >= 1)) errors.push('turns');
  if (!(w > 0)) errors.push('width');
  if (!(s > 0)) errors.push('space');
  if (!(dOut > 0)) errors.push('outer');
  if (errors.length) return { ok: false, errors };
  const dIn = dOut - 2 * n * w - 2 * (n - 1) * s;
  if (!(dIn > 0)) return { ok: false, errors: ['tooManyTurns'] };

  const dAvg = ((dOut + dIn) / 2) / 1000; // m
  const rho = (dOut - dIn) / (dOut + dIn);
  const [c1, c2, c3, c4] = SHEET[shape];
  const lSheet = ((MU0 * n * n * dAvg * c1) / 2) * (Math.log(c2 / rho) + c3 * rho + c4 * rho * rho);
  const wh = WHEELER[shape];
  const lWheeler = wh ? (wh[0] * MU0 * n * n * dAvg) / (1 + wh[1] * rho) : null;

  const lengthM = n * PERIMETER[shape] * dAvg;
  const tUm = p.thicknessUm > 0 ? p.thicknessUm : 35;
  const rhoCu = copperResistivity(Number.isFinite(p.tempC) ? p.tempC : 25);
  const rDc = (rhoCu * lengthM) / ((w / 1000) * (tUm * 1e-6));

  const warnings = [];
  if (rho < 0.1) warnings.push('fillLow');
  if (dIn < 0.2 * dOut) warnings.push('innerSmall');

  return {
    ok: true,
    dInMm: dIn,
    dAvgMm: dAvg * 1000,
    fill: rho,
    lSheet,
    lWheeler,
    lengthMm: lengthM * 1000,
    rDc,
    warnings,
    // Values the formulas above were evaluated with (for the calculation steps).
    coef: { c1, c2, c3, c4, k1: wh ? wh[0] : null, k2: wh ? wh[1] : null, perimeter: PERIMETER[shape] },
    resistivity: rhoCu,
    thicknessUm: tUm,
  };
}

/**
 * Resonant tuning of a coil (NFC / RFID / wireless power).
 *   C_total = 1 / ((2πf)²·L),   C_ext = C_total − C_par
 *   δ = √(ρ / (π·f·µ0)),   R_ac ≈ R_dc · (t/δ) / (1 − e^(−t/δ))   (Yue & Wong)
 *   Q_coil = ωL / R_ac,   R_damp = ωL / Q_target − R_ac
 * Proximity effect between turns is not included (real R_ac is often 1.5–3× higher).
 * @param {object} p  { L (H), rDc (Ω), thicknessUm, fHz, cParF?, qTarget?, tempC? }
 */
export function coilTuning({ L, rDc, thicknessUm = 35, fHz, cParF = 0, qTarget, tempC = 25 }) {
  if (!(L > 0) || !(fHz > 0) || !(rDc > 0)) return null;
  const w = 2 * Math.PI * fHz;
  const xl = w * L;
  const cTotal = 1 / (w * w * L);
  const cExt = cTotal - (cParF > 0 ? cParF : 0);
  const rhoCu = copperResistivity(tempC);
  const delta = Math.sqrt(rhoCu / (Math.PI * fHz * MU0));
  const t = (thicknessUm > 0 ? thicknessUm : 35) * 1e-6;
  const rAc = (rDc * (t / delta)) / (1 - Math.exp(-t / delta));
  const qCoil = xl / rAc;
  const rDamp = qTarget > 0 ? xl / qTarget - rAc : NaN;
  const qEff = rDamp > 0 ? qTarget : qCoil;
  const warnings = [];
  if (!(cExt > 0)) warnings.push('cParTooBig');
  if (qTarget > 0 && !(rDamp > 0)) warnings.push('qBelowTarget');
  if (fHz < 1e6 && cExt > 10e-9) warnings.push('lfCoil');
  return {
    xl, cTotal, cExt, deltaUm: delta * 1e6, rAc, qCoil, rDamp, qEff, bw: fHz / qEff, warnings,
    // Values used above (for the calculation steps).
    resistivity: rhoCu, thicknessUm: thicknessUm > 0 ? thicknessUm : 35,
  };
}
