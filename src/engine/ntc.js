// NTC thermistor models and the series-resistor divider.
// Beta model: R(T) = R25 · exp(B · (1/T − 1/T25)) (manufacturer B-value form).
// Steinhart–Hart: 1/T = A + B·ln R + C·(ln R)³ (Steinhart & Hart, Deep-Sea
// Research 15, 1968), with the three-point fit and the closed-form inverse.
// Temperatures in kelvin inside the engine; resistances in Ω.

import { adcCode } from './adc.js';

export const K0 = 273.15;

/** Beta model: resistance at T (K). */
export const betaR = (tK, r25, b, t25K = 298.15) => r25 * Math.exp(b * (1 / tK - 1 / t25K));

/** Beta model inverse: temperature (K) at resistance R. */
export const betaT = (r, r25, b, t25K = 298.15) => 1 / (1 / t25K + Math.log(r / r25) / b);

/** Steinhart–Hart: temperature (K) at resistance R. */
export function shT(r, { a, b, c }) {
  const l = Math.log(r);
  return 1 / (a + b * l + c * l * l * l);
}

/**
 * Steinhart–Hart inverse: resistance at T (K). Solves c·x³ + b·x + (a − 1/T) = 0
 * for x = ln R. The closed form (Cardano) loses precision when c is tiny, so
 * Newton's method is used from the c = 0 (Beta) solution; for b, c > 0 the
 * cubic is monotonic and converges in a few steps.
 */
export function shR(tK, { a, b, c }) {
  const y = 1 / tK - a;
  let x = y / b;
  for (let i = 0; i < 60; i++) {
    const dx = (c * x * x * x + b * x - y) / (3 * c * x * x + b);
    x -= dx;
    if (!Number.isFinite(x) || Math.abs(dx) < 1e-13 * Math.max(1, Math.abs(x))) break;
  }
  return Math.exp(x);
}

/**
 * Steinhart–Hart coefficients through three (T, R) points (T in K).
 * L = ln R, Y = 1/T, γ2 = (Y2 − Y1)/(L2 − L1), γ3 = (Y3 − Y1)/(L3 − L1),
 * C = (γ3 − γ2) / ((L3 − L2)·(L1 + L2 + L3)), B = γ2 − C·(L1² + L1·L2 + L2²),
 * A = Y1 − (B + C·L1²)·L1.
 * @returns {{a:number, b:number, c:number} | null}
 */
export function shFit([t1, r1], [t2, r2], [t3, r3]) {
  const [l1, l2, l3] = [r1, r2, r3].map(Math.log);
  const [y1, y2, y3] = [t1, t2, t3].map((t) => 1 / t);
  if (l1 === l2 || l1 === l3 || l2 === l3) return null;
  const g2 = (y2 - y1) / (l2 - l1);
  const g3 = (y3 - y1) / (l3 - l1);
  const c = (g3 - g2) / ((l3 - l2) * (l1 + l2 + l3));
  const b = g2 - c * (l1 * l1 + l1 * l2 + l2 * l2);
  const a = y1 - (b + c * l1 * l1) * l1;
  return [a, b, c].every(Number.isFinite) ? { a, b, c } : null;
}

/** Equivalent B-value between two temperatures (K): B = ln(R1/R2) / (1/T1 − 1/T2). */
export const betaBetween = (t1, r1, t2, r2) => Math.log(r1 / r2) / (1 / t1 - 1 / t2);

/** Series resistor for the largest output swing between R(Tlow) and R(Thigh): Rs = √(R_L · R_H). */
export const bestSeries = (rLow, rHigh) => Math.sqrt(rLow * rHigh);

/**
 * Divider output. top: NTC from Vref to the output, Rs to ground (Vout rises
 * with temperature); otherwise Rs on top and the NTC to ground.
 */
export const dividerOut = (r, rs, vref, top) => (top ? (vref * rs) / (rs + r) : (vref * r) / (rs + r));

/**
 * Operating point of the divider at one temperature.
 * @param {{rOf:(tK:number)=>number, tK:number, rs:number, vref:number, top:boolean, bits:number, delta:number}} p
 *   delta = dissipation constant (W/K)
 */
export function ntcPoint({ rOf, tK, rs, vref, top, bits, delta }) {
  const r = rOf(tK);
  const vout = dividerOut(r, rs, vref, top);
  const h = 0.01;
  const slope = (dividerOut(rOf(tK + h), rs, vref, top) - dividerOut(rOf(tK - h), rs, vref, top)) / (2 * h);
  // Ratiometric: the ADC reference is the divider supply.
  const { code, lsb } = adcCode(vout, { bits, vref });
  const i = vref / (rs + r);
  const p = i * i * r;
  return {
    r,
    vout,
    slope, // V/K
    code,
    lsb,
    degPerLsb: lsb / Math.abs(slope),
    i,
    p,
    selfHeat: p / delta,
  };
}

/** Largest NTC dissipation over [tLow, tHigh]: maximum Vref²/(4·Rs) where R(T) = Rs, else at an end. */
export function maxDissipation(rLow, rHigh, rs, vref) {
  const pOf = (r) => (vref * vref * r) / (rs + r) ** 2;
  const lo = Math.min(rLow, rHigh);
  const hi = Math.max(rLow, rHigh);
  if (rs >= lo && rs <= hi) return pOf(rs);
  return Math.max(pOf(rLow), pOf(rHigh));
}
