// Basic circuit calculations: Ohm's law, voltage dividers, LED series
// resistors and RC / RL / LC time and frequency relations. SI units throughout
// (V, A, Ω, W, F, H, Hz, s).

import { nearestStandard, bracketStandard, valuesBetween } from './eseries.js';

const TWO_PI = 2 * Math.PI;

// ---------------------------------------------------------------------------
// Ohm's law
// ---------------------------------------------------------------------------

/** Known-value pairs accepted by ohmsLaw(). */
export const OHM_PAIRS = ['VI', 'VR', 'IR', 'PV', 'PI', 'PR'];

/**
 * Solve V, I, R and P from any two of them.
 * @param {'VI'|'VR'|'IR'|'PV'|'PI'|'PR'} pair which two values are known
 * @param {{V?:number, I?:number, R?:number, P?:number}} k known values (> 0)
 * @returns {{V:number, I:number, R:number, P:number}}
 */
export function ohmsLaw(pair, k) {
  const { V, I, R, P } = k;
  switch (pair) {
    case 'VI': return { V, I, R: V / I, P: V * I };
    case 'VR': return { V, I: V / R, R, P: (V * V) / R };
    case 'IR': return { V: I * R, I, R, P: I * I * R };
    case 'PV': return { V, I: P / V, R: (V * V) / P, P };
    case 'PI': return { V: P / I, I, R: P / (I * I), P };
    case 'PR': return { V: Math.sqrt(P * R), I: Math.sqrt(P / R), R, P };
    default: throw new Error(`Unknown pair: ${pair}`);
  }
}

/** Common resistor power ratings (W). */
export const POWER_RATINGS_W = [1 / 16, 1 / 10, 1 / 8, 1 / 4, 1 / 2, 1, 2];

/**
 * Smallest standard power rating that covers `margin` × the dissipation.
 * @param {number} powerW dissipation (W)
 * @param {number} [margin=2]
 * @returns {number|null} rating in W, or null when above 2 W
 */
export function powerRating(powerW, margin = 2) {
  return POWER_RATINGS_W.find((w) => w >= powerW * margin * (1 - 1e-9)) ?? null;
}

// ---------------------------------------------------------------------------
// Voltage dividers
// ---------------------------------------------------------------------------

const par = (a, b) => (a * b) / (a + b);

/**
 * Analyse a resistive divider: R1 from Vin to the output, R2 from the output
 * to ground, optional load RL across R2.
 * @param {{vin:number, r1:number, r2:number, rl?:number}} p
 * @returns {{voutOpen:number, vout:number, loaded:boolean, loadErrorPct:number,
 *   iDivider:number, iR1:number, iR2:number, iLoad:number, pR1:number, pR2:number,
 *   rth:number, ratio:number}}
 */
export function dividerAnalyse({ vin, r1, r2, rl }) {
  const voutOpen = (vin * r2) / (r1 + r2);
  const loaded = rl > 0;
  const rBottom = loaded ? par(r2, rl) : r2;
  const vout = (vin * rBottom) / (r1 + rBottom);
  const iR1 = (vin - vout) / r1;
  const iR2 = vout / r2;
  return {
    voutOpen,
    vout,
    loaded,
    loadErrorPct: ((vout - voutOpen) / voutOpen) * 100,
    iDivider: vin / (r1 + r2),
    iR1,
    iR2,
    iLoad: loaded ? vout / rl : 0,
    pR1: iR1 * iR1 * r1,
    pR2: (vout * vout) / r2,
    rth: par(r1, r2),
    ratio: voutOpen / vin,
  };
}

/**
 * Best standard-value pair for a divider ratio Vout/Vin = R2 / (R1 + R2).
 * Brute force over all pairs whose sum lies in [spanLo, spanHi] × totalTarget.
 * Ties on error are broken by the sum closest to the target total.
 * @param {number} ratio Vout/Vin, 0 < ratio < 1
 * @param {number} totalTarget approximate R1 + R2 (Ω)
 * @param {string} series E-series name
 * @param {number} [spanLo=0.5]
 * @param {number} [spanHi=2]
 * @returns {{r1:number, r2:number, ratio:number, errorPct:number, sum:number} | null}
 */
export function bestDividerPair(ratio, totalTarget, series, spanLo = 0.5, spanHi = 2) {
  if (!(ratio > 0 && ratio < 1) || !(totalTarget > 0)) return null;
  const lo = totalTarget * spanLo;
  const hi = totalTarget * spanHi;
  const r1s = valuesBetween((lo * (1 - ratio)) / 1.25, hi * (1 - ratio) * 1.25, series);
  const r2s = valuesBetween((lo * ratio) / 1.25, hi * ratio * 1.25, series);
  let best = null;
  for (const r1 of r1s) {
    for (const r2 of r2s) {
      const sum = r1 + r2;
      if (sum < lo * (1 - 1e-12) || sum > hi * (1 + 1e-12)) continue;
      const k = r2 / sum;
      const err = Math.abs(k - ratio) / ratio;
      const tie = Math.abs(Math.log(sum / totalTarget));
      if (!best || err < best.err - 1e-12 || (err <= best.err + 1e-12 && tie < best.tie)) {
        best = { r1, r2, k, err, tie, sum };
      }
    }
  }
  return best && { r1: best.r1, r2: best.r2, ratio: best.k, errorPct: ((best.k - ratio) / ratio) * 100, sum: best.sum };
}

/**
 * Divider design for a target output: exact resistors for the given total and
 * the best E-series pair.
 * @param {{vin:number, vout:number, rTotal:number, series:string}} p
 */
export function dividerDesign({ vin, vout, rTotal, series }) {
  if (!(vout > 0 && vout < vin)) return { ok: false, errors: ['dv_voutRange'] };
  const ratio = vout / vin;
  const r2Exact = rTotal * ratio;
  const r1Exact = rTotal - r2Exact;
  const pair = bestDividerPair(ratio, rTotal, series);
  if (!pair) return { ok: false, errors: ['dv_noPair'] };
  const voutStd = vin * pair.ratio;
  return {
    ok: true,
    ratio,
    r1Exact,
    r2Exact,
    pair,
    voutStd,
    errorPct: ((voutStd - vout) / vout) * 100,
    current: vin / pair.sum,
    rth: par(pair.r1, pair.r2),
    pR1: (vin - voutStd) ** 2 / pair.r1,
    pR2: voutStd ** 2 / pair.r2,
  };
}

/**
 * Adjustable-regulator feedback divider: Vout = Vref · (1 + R1/R2), R1 from
 * Vout to FB, R2 from FB to ground.
 * @param {{vref:number, vout:number, r2:number, series:string}} p
 * @returns {{ok:boolean, errors?:string[], r1Exact:number, r1:number, vout:number,
 *   errorPct:number, pair:{r1:number, r2:number, vout:number, errorPct:number}, iFb:number}}
 */
export function feedbackDivider({ vref, vout, r2, series }) {
  if (!(vout > vref)) return { ok: false, errors: ['dv_voutBelowVref'] };
  const outOf = (a, b) => vref * (1 + a / b);
  const r1Exact = r2 * (vout / vref - 1);
  const pick = (r2v) => {
    const { below, above } = bracketStandard((r2v * (vout / vref - 1)), series);
    const eb = Math.abs(outOf(below, r2v) - vout);
    const ea = Math.abs(outOf(above, r2v) - vout);
    return eb <= ea ? below : above;
  };
  const r1 = pick(r2);
  const voutStd = outOf(r1, r2);

  // Let R2 move to any standard value within one decade centred on the given R2.
  let pair = null;
  for (const r2c of valuesBetween(r2 / Math.sqrt(10), r2 * Math.sqrt(10), series)) {
    const r1c = pick(r2c);
    const vo = outOf(r1c, r2c);
    const err = Math.abs(vo - vout);
    const tie = Math.abs(Math.log(r2c / r2));
    if (!pair || err < pair.err - 1e-12 || (err <= pair.err + 1e-12 && tie < pair.tie)) {
      pair = { r1: r1c, r2: r2c, vout: vo, err, tie };
    }
  }
  return {
    ok: true,
    r1Exact,
    r1,
    vout: voutStd,
    errorPct: ((voutStd - vout) / vout) * 100,
    pair: pair && { r1: pair.r1, r2: pair.r2, vout: pair.vout, errorPct: ((pair.vout - vout) / vout) * 100 },
    iFb: vref / r2,
  };
}

// ---------------------------------------------------------------------------
// LED series resistor
// ---------------------------------------------------------------------------

/**
 * Series resistor for N identical LEDs in series.
 * @param {{vs:number, vf:number, current:number, count?:number, series:string, margin?:number}} p
 *   vs supply (V), vf forward voltage per LED (V), current target (A)
 * @returns {object} ok:false with errors, or the exact, recommended (≥ R, so the
 *   current stays ≤ target) and nearest resistor with resulting currents and powers.
 */
export function ledResistor({ vs, vf, current, count = 1, series, margin = 2 }) {
  const vLeds = count * vf;
  const drop = vs - vLeds;
  if (!(drop > 0)) return { ok: false, errors: ['led_headroom'] };
  const rExact = drop / current;
  const { above, nearest } = nearestStandard(rExact, series);
  const iRec = drop / above;
  const pR = drop * iRec;
  return {
    ok: true,
    drop,
    rExact,
    rRec: above,
    iRec,
    pR,
    rating: powerRating(pR, margin),
    rNearest: nearest,
    iNearest: drop / nearest,
    pNearest: (drop * drop) / nearest,
    pLed: vf * iRec,
    pLeds: vLeds * iRec,
    pSupply: vs * iRec,
    efficiency: vLeds / vs,
  };
}

// ---------------------------------------------------------------------------
// RC / RL / LC
// ---------------------------------------------------------------------------

/** First-order step-response times for a time constant τ. */
function stepTimes(tau) {
  return {
    tau,
    rise: Math.log(9) * tau, // 10 % → 90 %
    t50: Math.LN2 * tau,
    t63: tau,
    t90: Math.LN10 * tau,
    t99: Math.log(100) * tau,
  };
}

/**
 * RC low/high-pass: τ = RC, fc = 1/(2πRC).
 * @param {number} r Ω
 * @param {number} c F
 */
export function rcCircuit(r, c) {
  const tau = r * c;
  return { ...stepTimes(tau), fc: 1 / (TWO_PI * tau), omega: 1 / tau };
}

/**
 * RL: τ = L/R, fc = R/(2πL).
 * @param {number} r Ω
 * @param {number} l H
 */
export function rlCircuit(r, l) {
  const tau = l / r;
  return { ...stepTimes(tau), fc: r / (TWO_PI * l), omega: r / l };
}

/**
 * LC resonance: f0 = 1/(2π√(LC)), Z0 = √(L/C). With a series resistance R:
 * Q = (1/R)·√(L/C), bandwidth = f0/Q, damping ratio ζ = 1/(2Q).
 * @param {number} l H
 * @param {number} c F
 * @param {number} [r] series resistance Ω (optional)
 */
export function lcCircuit(l, c, r) {
  const omega = 1 / Math.sqrt(l * c);
  const z0 = Math.sqrt(l / c);
  const out = { f0: omega / TWO_PI, omega, z0, period: TWO_PI / omega };
  if (r > 0) {
    out.q = z0 / r;
    out.bw = out.f0 / out.q;
    out.zeta = 1 / (2 * out.q);
  }
  return out;
}

/**
 * Reactance at frequency f: XL = 2πfL, XC = 1/(2πfC). Either part may be
 * omitted (NaN) and its outputs are then NaN.
 * @param {number} f Hz
 * @param {number} [l] H
 * @param {number} [c] F
 */
export function reactance(f, l, c) {
  const xl = l > 0 ? TWO_PI * f * l : NaN;
  const xc = c > 0 ? 1 / (TWO_PI * f * c) : NaN;
  return {
    omega: TWO_PI * f,
    xl,
    xc,
    xSeries: xl - xc,
    f0: l > 0 && c > 0 ? 1 / (TWO_PI * Math.sqrt(l * c)) : NaN,
  };
}
