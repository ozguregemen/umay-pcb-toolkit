// Hold-up capacitor: how much capacitance keeps a load running for a given
// time after the supply is lost, or how long a given capacitor lasts.
// SI units throughout.
//
//   Constant power (a switching converter behind the capacitor), P_in = P/η:
//     energy balance  ½·C·(V1² − V2²) = P_in·t
//     C = 2·P_in·t / (V1² − V2²)        t = C·(V1² − V2²) / (2·P_in)
//   Constant current (a linear regulator or a direct load):
//     C·dV/dt = −I  →  C = I·t / (V1 − V2)        t = C·(V1 − V2) / I
//
// ESR. The terminal voltage u is lower than the internal voltage v of the
// capacitor by i·ESR. The load stops when the terminal voltage reaches V2, so
// the internal voltage is only used down to
//     V2eff = V2 + I_end·ESR,   I_end = P_in/V2 (constant power) or I.
//   Constant current: the same line with V2eff in place of V2 (exact).
//   Constant power: i = P_in/u and u = v − i·ESR give u = (v + √(v² − 4·P_in·ESR))/2,
//   and C·dv/dt = −P_in/u integrates to
//     t = C·K / (2·P_in),   K = V1·Vt1 − V2eff·V2 − 2·P_in·ESR·ln(Vt1/V2)
//   with Vt1 = (V1 + √(V1² − 4·P_in·ESR))/2, the terminal voltage right after
//   the supply is lost. K takes the place of V1² − V2² and includes the heat
//   lost in the ESR during the discharge; with ESR = 0 it is V1² − V2².
//   A constant-power load can only be supplied while v ≥ 2·√(P_in·ESR); the
//   cut-off at V2 comes first when V2² > P_in·ESR, which is required here.
//
// Tolerance and ageing: the capacitance that is certain to be there is
// k·C_nom ("lowest capacitance in % of nominal"). The nominal value to buy is
// C/k rounded up to the next E6 value; a given capacitor is derated by k first.

import { bracketStandard } from './eseries.js';

/** Bulk capacitors are picked from E6 (10, 15, 22, 33, 47, 68): the values every range stocks. */
export const CAP_SERIES = 'E6';
/** Below this usable share of the stored energy the capacitor is used badly. */
export const SHARE_LOW = 0.2;
/** Above this hold-up time leakage and quiescent currents are worth a look (s). */
export const LONG_S = 10;
export const SOLVES = ['cap', 'time'];
export const LOADS = ['power', 'current'];
const CURVE_STEPS = 24;

const finite = (...xs) => xs.every((x) => typeof x === 'number' && Number.isFinite(x));
const pos = (x) => finite(x) && x > 0;

/**
 * Capacitor with ESR feeding a constant power P_in between V1 and the cut-off V2.
 * Valid for V2² > P_in·ESR and V2eff < V1.
 * @returns seconds of hold-up per farad, and the points along the way.
 */
export function powerDischarge({ pInW, v1, v2, esrOhm = 0 }) {
  const pr = pInW * esrOhm;
  const iEndA = pInW / v2;
  const v2Eff = v2 + iEndA * esrOhm; // internal voltage when the terminals reach V2
  const vStartV = (v1 + Math.sqrt(v1 * v1 - 4 * pr)) / 2; // terminal voltage right after the supply is lost
  const iStartA = pInW / vStartV;
  const kV2 = v1 * vStartV - v2Eff * v2 - 2 * pr * Math.log(vStartV / v2);
  return { iEndA, iStartA, v2Eff, vStartV, esrStepV: iStartA * esrOhm, esrEndV: iEndA * esrOhm, kV2, sPerFarad: kV2 / (2 * pInW) };
}

/** Capacitor with ESR feeding a constant current between V1 and the cut-off V2. */
export function currentDischarge({ currentA, v1, v2, esrOhm = 0 }) {
  const drop = currentA * esrOhm;
  const v2Eff = v2 + drop;
  return { iEndA: currentA, iStartA: currentA, v2Eff, vStartV: v1 - drop, esrStepV: drop, esrEndV: drop, dV: v1 - v2Eff, sPerFarad: (v1 - v2Eff) / currentA };
}

/** Terminal voltage against time for a capacitance cF: [[t, V], …] from just after the loss to the cut-off. */
function dischargeCurve({ power, pInW, v1, v2, esrOhm, d, cF }) {
  const tEnd = cF * d.sPerFarad;
  if (!power) return [[0, d.vStartV], [tEnd, v2]]; // a straight line
  const pr = pInW * esrOhm;
  const pts = [[0, d.vStartV]];
  for (let i = 1; i < CURVE_STEPS; i++) {
    const v = v1 + ((d.v2Eff - v1) * i) / CURVE_STEPS; // internal voltage
    const u = (v + Math.sqrt(Math.max(0, v * v - 4 * pr))) / 2; // terminal voltage
    const t = (cF * (v1 * d.vStartV - v * u - 2 * pr * Math.log(d.vStartV / u))) / (2 * pInW);
    pts.push([Math.min(Math.max(t, 0), tEnd), u]);
  }
  pts.push([tEnd, v2]);
  return pts;
}

/** True when every number in a (nested) result is finite; null marks "not applicable". */
function allFinite(x) {
  if (typeof x === 'number') return Number.isFinite(x);
  if (x && typeof x === 'object') return Object.values(x).every(allFinite);
  return true;
}

/**
 * The calculator.
 * @param {object} p
 * @param {'cap'|'time'} p.solve       capacitance for a time, or time for a capacitance
 * @param {'power'|'current'} p.load   constant power (converter) or constant current
 * @param {number} [p.powerW]          load power at the converter output (W), constant power
 * @param {number} [p.efficiency]      converter efficiency, 0 < η ≤ 1 (default 1)
 * @param {number} [p.currentA]        load current (A), constant current
 * @param {number} p.v1                capacitor voltage when the supply is lost (V)
 * @param {number} p.v2                lowest voltage at which the load still works (V)
 * @param {number} [p.timeS]           hold-up time wanted (s), solve = 'cap'
 * @param {number} [p.capF]            nominal capacitance (F), solve = 'time'
 * @param {number} [p.capMin]          lowest capacitance as a fraction of nominal, 0 < k ≤ 1 (default 0.8)
 * @param {number} [p.esrOhm]          equivalent series resistance (Ω), default 0
 * @returns {{ok: false, errors: string[]} | object} errors and warnings are message keys.
 */
export function holdup(p) {
  const fail = (...errors) => ({ ok: false, errors });
  if (!p || !SOLVES.includes(p.solve) || !LOADS.includes(p.load)) return fail('hu_positive');
  const power = p.load === 'power';
  const cap = p.solve === 'cap';
  const esrOhm = p.esrOhm ?? 0;
  const capMin = p.capMin ?? 0.8;
  const efficiency = p.efficiency ?? 1;
  const { v1, v2 } = p;
  if (!pos(v1) || !pos(v2) || !finite(esrOhm) || esrOhm < 0) return fail('hu_positive');
  if (power ? !pos(p.powerW) : !pos(p.currentA)) return fail('hu_positive');
  if (cap ? !pos(p.timeS) : !pos(p.capF)) return fail('hu_positive');
  const errors = [];
  if (power && !(finite(efficiency) && efficiency > 0 && efficiency <= 1)) errors.push('hu_eff');
  if (!(finite(capMin) && capMin > 0 && capMin <= 1)) errors.push('hu_frac');
  if (!(v2 < v1)) errors.push('hu_v2');
  if (errors.length) return fail(...errors);

  const pInW = power ? p.powerW / efficiency : null;
  // With more ESR than V2²/P_in the converter input collapses before it reaches V2.
  if (power && esrOhm > 0 && !(v2 * v2 > pInW * esrOhm)) return fail('hu_esrHigh');
  const d = power ? powerDischarge({ pInW, v1, v2, esrOhm }) : currentDischarge({ currentA: p.currentA, v1, v2, esrOhm });
  if (d.v2Eff >= v1) return fail('hu_nothing');
  if (!(d.sPerFarad > 0 && Number.isFinite(d.sPerFarad))) return fail('hu_range');

  const warnings = [];
  let sized;
  let cUseF; // the capacitance that is certain to be there: the numbers below are for it
  let tUseS;
  if (cap) {
    const cReqF = p.timeS / d.sPerFarad;
    const cNomReqF = cReqF / capMin;
    const cStdF = bracketStandard(cNomReqF, CAP_SERIES).above; // rounded up
    const cStdMinF = cStdF * capMin;
    sized = { timeS: p.timeS, cReqF, cNomReqF, cStdF, cStdMinF, tStdMinS: cStdMinF * d.sPerFarad, tStdNomS: cStdF * d.sPerFarad, series: CAP_SERIES };
    cUseF = cReqF;
    tUseS = p.timeS;
  } else {
    const cMinF = p.capF * capMin;
    sized = { capF: p.capF, cMinF, tMinS: cMinF * d.sPerFarad, tNomS: p.capF * d.sPerFarad };
    cUseF = cMinF;
    tUseS = sized.tMinS;
  }

  // Energy, for the capacitance cUseF.
  const eStoredJ = 0.5 * cUseF * v1 * v1;
  const eTakenJ = 0.5 * cUseF * (v1 * v1 - d.v2Eff * d.v2Eff);
  const share = 1 - (d.v2Eff / v1) ** 2;
  let eEsrJ;
  let eInJ; // delivered at the capacitor terminals
  if (power) {
    eInJ = pInW * tUseS;
    eEsrJ = esrOhm > 0 ? Math.max(0, eTakenJ - eInJ) : 0;
  } else {
    eEsrJ = p.currentA ** 2 * esrOhm * tUseS;
    eInJ = eTakenJ - eEsrJ;
  }
  if (share < SHARE_LOW) warnings.push('hu_shareLow');
  if ((cap ? p.timeS : sized.tNomS) > LONG_S) warnings.push('hu_long');

  const r = {
    ok: true,
    solve: p.solve,
    load: p.load,
    v1,
    v2,
    esrOhm,
    capMin,
    powerW: power ? p.powerW : null,
    efficiency: power ? efficiency : null,
    pInW,
    currentA: power ? null : p.currentA,
    iEndA: d.iEndA,
    iStartA: d.iStartA,
    v2Eff: d.v2Eff,
    vStartV: d.vStartV,
    esrStepV: d.esrStepV,
    esrEndV: d.esrEndV,
    kV2: power ? d.kV2 : null,
    dV: power ? null : d.dV,
    sPerFarad: d.sPerFarad,
    ...sized,
    cUseF,
    tUseS,
    eStoredJ,
    eTakenJ,
    eInJ,
    eEsrJ,
    eLoadJ: power ? p.powerW * tUseS : null,
    share,
    curve: dischargeCurve({ power, pInW, v1, v2, esrOhm, d, cF: cUseF }),
    warnings,
  };
  return allFinite(r) && cUseF > 0 && tUseS > 0 ? r : fail('hu_range');
}
