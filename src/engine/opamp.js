// Op-amp gain stages and unity-gain Sallen-Key filters.
// Gain stages: ideal closed-loop gain, noise gain and the closed-loop bandwidth
// of a single-pole (GBW) op amp. Filters: second-order Sallen-Key low-pass and
// high-pass with unity gain after TI SLOA024B (Karki, "Analysis of the
// Sallen-Key Architecture"); section Q values for Butterworth, Bessel and
// Chebyshev responses as in TI SLOD006 ("Op Amps for Everyone", active filter
// chapter). SI units throughout (Ω, F, Hz, V).

import { bracketStandard, nearestStandard, valuesBetween } from './eseries.js';

const TWO_PI = 2 * Math.PI;

// ---------------------------------------------------------------------------
// Gain stages
// ---------------------------------------------------------------------------

/**
 * Gain of a resistor-programmed stage.
 * inv:    G = −Rf / Rin,          noise gain 1 + Rf / Rin
 * noninv: G = 1 + Rf / Rg,        noise gain = G
 * diff:   G = R2 / R1 (R3 = R1, R4 = R2), Vout = G · (V2 − V1), noise gain 1 + R2 / R1
 * @param {'inv'|'noninv'|'diff'} kind
 * @param {number} rf feedback resistor (Rf or R2)
 * @param {number} rb other resistor (Rin, Rg or R1)
 */
export function stageGain(kind, rf, rb) {
  const k = rf / rb;
  if (kind === 'inv') return { gain: -k, noiseGain: 1 + k };
  if (kind === 'diff') return { gain: k, noiseGain: 1 + k };
  return { gain: 1 + k, noiseGain: 1 + k };
}

/** Resistor ratio Rf / Rb needed for a gain magnitude. */
export const ratioFor = (kind, g) => (kind === 'noninv' ? g - 1 : g);

/**
 * Best standard-value pair for a resistor ratio k = Rf / Rb with Rb within
 * ±½ decade of `base`. Ties go to the Rb closest to `base`.
 * @returns {{rf:number, rb:number, ratio:number, errorPct:number} | null}
 */
export function bestRatioPair(k, base, series) {
  if (!(k > 0) || !(base > 0)) return null;
  let best = null;
  for (const rb of valuesBetween(base / Math.sqrt(10), base * Math.sqrt(10), series)) {
    const rf = nearestStandard(k * rb, series).nearest;
    const err = Math.abs(rf / rb - k) / k;
    const tie = Math.abs(Math.log(rb / base));
    if (!best || err < best.err - 1e-12 || (err <= best.err + 1e-12 && tie < best.tie)) best = { rf, rb, err, tie };
  }
  // rfExact: the feedback value the ratio asks for with the chosen Rb, before rounding to the series.
  return best && { rf: best.rf, rb: best.rb, ratio: best.rf / best.rb, errorPct: ((best.rf / best.rb - k) / k) * 100, rfExact: k * best.rb };
}

/**
 * Single-pole closed-loop analysis.
 * @param {{gain:number, noiseGain:number, gbw:number, vinLo:number, vinHi:number,
 *   vPos:number, vNeg:number, headroom:number, slew?:number, fSig?:number}} p
 *   slew in V/s; fSig optional signal frequency
 */
export function closedLoop({ gain, noiseGain, gbw, vinLo, vinHi, vPos, vNeg, headroom, slew, fSig }) {
  const bw = gbw / noiseGain;
  const a = gain * vinLo;
  const b = gain * vinHi;
  const outLo = Math.min(a, b);
  const outHi = Math.max(a, b);
  const swingLo = vNeg + headroom;
  const swingHi = vPos - headroom;
  const amp = (outHi - outLo) / 2;
  const hasSr = Number.isFinite(slew) && slew > 0;
  const hasF = Number.isFinite(fSig) && fSig > 0;
  return {
    bw,
    outLo,
    outHi,
    swingLo,
    swingHi,
    clipLo: outLo < swingLo - 1e-12,
    clipHi: outHi > swingHi + 1e-12,
    amp,
    fpbw: hasSr && amp > 0 ? slew / (TWO_PI * amp) : NaN,
    // Magnitude error of a single-pole response at the signal frequency.
    gainErrPct: hasF ? (1 / Math.sqrt(1 + (fSig / bw) ** 2) - 1) * 100 : NaN,
  };
}

// ---------------------------------------------------------------------------
// Second-order sections
// ---------------------------------------------------------------------------

/**
 * Q of a second-order Chebyshev (type I) section with the given passband ripple.
 * Poles of order 2: σ = sinh(a)·sin(π/4), ω = cosh(a)·cos(π/4), a = asinh(1/ε)/2,
 * ε = √(10^(ripple/10) − 1);  Q = √(σ² + ω²) / (2σ).
 */
export function chebyshevQ(rippleDb) {
  const eps = Math.sqrt(10 ** (rippleDb / 10) - 1);
  const a = Math.asinh(1 / eps) / 2;
  const s = Math.sinh(a) * Math.SQRT1_2;
  const w = Math.cosh(a) * Math.SQRT1_2;
  return Math.hypot(s, w) / (2 * s);
}

/** Section Q per response type. */
export const RESPONSES = {
  butter: Math.SQRT1_2,
  bessel: 1 / Math.sqrt(3),
  cheb05: chebyshevQ(0.5),
  cheb1: chebyshevQ(1),
};

/**
 * −3 dB frequency of a second-order low-pass relative to its pole frequency f0:
 * |H|² = 1 / ((1 − x²)² + x²/Q²) = ½  →  x² = [(2 − 1/Q²) + √((2 − 1/Q²)² + 4)] / 2.
 * A high-pass has its −3 dB point at f0 / x.
 */
export function cutoffRatio(q) {
  const p = 2 - 1 / (q * q);
  return Math.sqrt((p + Math.sqrt(p * p + 4)) / 2);
}

/** f0 and Q of a unity-gain Sallen-Key low-pass (C1 feedback, C2 to ground). */
export function lpPoles(r1, r2, c1, c2) {
  const rc = Math.sqrt(r1 * r2 * c1 * c2);
  return { f0: 1 / (TWO_PI * rc), q: rc / (c2 * (r1 + r2)) };
}

/** f0 and Q of a unity-gain Sallen-Key high-pass (R1 feedback, R2 to ground). */
export function hpPoles(r1, r2, c1, c2) {
  const rc = Math.sqrt(r1 * r2 * c1 * c2);
  return { f0: 1 / (TWO_PI * rc), q: rc / (r1 * (c1 + c2)) };
}

/**
 * Round R1 and R2 to standard values: of the four bracketing combinations,
 * keep the one with the smallest |ln(f0/f0t)| + |ln(Q/Qt)|.
 */
function roundPair(r1Exact, r2Exact, series, poles, f0t, qt) {
  const a = bracketStandard(r1Exact, series);
  const b = bracketStandard(r2Exact, series);
  let best = null;
  for (const r1 of new Set([a.below, a.above])) {
    for (const r2 of new Set([b.below, b.above])) {
      const p = poles(r1, r2);
      const cost = Math.abs(Math.log(p.f0 / f0t)) + Math.abs(Math.log(p.q / qt));
      if (!best || cost < best.cost - 1e-12) best = { r1, r2, f0: p.f0, q: p.q, cost };
    }
  }
  return best;
}

/**
 * Unity-gain Sallen-Key low-pass design (TI SLOA024B):
 * C1 ≥ 4Q²·C2 (next standard value up), then R1 + R2 = 1 / (ω0·Q·C2) and
 * R1 · R2 = 1 / (ω0²·C1·C2), so R1,2 = (a ± √(a² − 4b)) / 2.
 * @param {{fc:number, q:number, c2:number, capSeries:string, resSeries:string}} p fc = −3 dB target
 */
export function sallenKeyLowPass({ fc, q, c2, capSeries, resSeries }) {
  const x = cutoffRatio(q);
  const f0 = fc / x;
  const w0 = TWO_PI * f0;
  const c1 = bracketStandard(4 * q * q * c2 * (1 - 1e-9), capSeries).above;
  const a = 1 / (w0 * q * c2);
  const b = 1 / (w0 * w0 * c1 * c2);
  const d = Math.sqrt(Math.max(0, a * a - 4 * b));
  const r1Exact = (a + d) / 2;
  const r2Exact = (a - d) / 2;
  const { r1, r2, f0: f0Got, q: qGot } = roundPair(r1Exact, r2Exact, resSeries, (a, b) => lpPoles(a, b, c1, c2), f0, q);
  return {
    kind: 'lp', qTarget: q, f0Target: f0, ratio: x, c1, c2, r1Exact, r2Exact, r1, r2,
    f0: f0Got, q: qGot, fc: f0Got * cutoffRatio(qGot),
    // Intermediate values for the calculation steps: lower limit of C1, R1 + R2, R1 · R2 and fc/f0 of the result.
    c1Min: 4 * q * q * c2, sumR: a, prodR: b, ratioGot: cutoffRatio(qGot),
  };
}

/**
 * Unity-gain Sallen-Key high-pass design with equal capacitors C1 = C2 = C:
 * R1 = 1 / (2Q·ω0·C) (feedback), R2 = 2Q / (ω0·C) (to ground).
 * @param {{fc:number, q:number, c:number, resSeries:string}} p
 */
export function sallenKeyHighPass({ fc, q, c, resSeries }) {
  const x = cutoffRatio(q);
  const f0 = fc * x;
  const w0 = TWO_PI * f0;
  const r1Exact = 1 / (2 * q * w0 * c);
  const r2Exact = (2 * q) / (w0 * c);
  const { r1, r2, f0: f0Got, q: qGot } = roundPair(r1Exact, r2Exact, resSeries, (a, b) => hpPoles(a, b, c, c), f0, q);
  return {
    kind: 'hp', qTarget: q, f0Target: f0, ratio: x, c1: c, c2: c, r1Exact, r2Exact, r1, r2,
    f0: f0Got, q: qGot, fc: f0Got / cutoffRatio(qGot),
    ratioGot: cutoffRatio(qGot), // f0/fc of the result, for the calculation steps
  };
}

// ---------------------------------------------------------------------------
// Frequency response (complex arithmetic) with a single-pole op amp
// ---------------------------------------------------------------------------

const cx = (re, im = 0) => ({ re, im });
const add = (a, b) => cx(a.re + b.re, a.im + b.im);
const sub = (a, b) => cx(a.re - b.re, a.im - b.im);
const mul = (a, b) => cx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const div = (a, b) => {
  const d = b.re * b.re + b.im * b.im;
  return cx((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
};
const abs = (a) => Math.hypot(a.re, a.im);

/** Open-loop DC gain used with the GBW model (100 dB). */
export const A0 = 1e5;

/** Open-loop gain A(jω) = A0 / (1 + jω·A0/ωt); infinite GBW → ideal. */
function openLoop(f, gbw) {
  if (!(gbw > 0) || !Number.isFinite(gbw)) return null;
  return div(cx(A0), cx(1, (f * A0) / gbw));
}

/** |A(f)| of the single-pole op-amp model. */
export const openLoopMag = (f, gbw) => abs(openLoop(f, gbw));

/** Closed-loop |H(f)| of a gain stage: ideal gain / (1 + noiseGain / A). */
export function stageMag(f, { gain, noiseGain }, gbw) {
  const a = openLoop(f, gbw);
  if (!a) return Math.abs(gain);
  return abs(div(cx(gain), add(cx(1), div(cx(noiseGain), a))));
}

/**
 * |H(f)| of a unity-gain Sallen-Key section with a follower of gain K = A/(1+A).
 * Nodal analysis at node A (between the input elements) and B (+ input):
 *   LP: (Vin−VA)/R1 = (VA−VB)/R2 + (VA−K·VB)·jωC1,   (VA−VB)/R2 = VB·jωC2
 *   HP: (Vin−VA)·jωC1 = (VA−VB)·jωC2 + (VA−K·VB)/R1, (VA−VB)·jωC2 = VB/R2
 * Vout = K · VB.
 */
export function sallenKeyMag(f, { kind, r1, r2, c1, c2 }, gbw) {
  const w = TWO_PI * f;
  const a = openLoop(f, gbw);
  const k = a ? div(a, add(cx(1), a)) : cx(1);
  // Admittances: y1 = input element, y2 = series element A→B, y3 = feedback A→out, y4 = B→ground.
  const yC = (c) => cx(0, w * c);
  const yR = (r) => cx(1 / r);
  const [y1, y2, y3, y4] = kind === 'hp' ? [yC(c1), yC(c2), yR(r1), yR(r2)] : [yR(r1), yR(r2), yC(c1), yC(c2)];
  // Node B: VA·y2 = VB·(y2 + y4) → VA = VB·(y2 + y4)/y2
  // Node A: Vin·y1 = VA·(y1 + y2 + y3) − VB·(y2 + K·y3)
  const ratioA = div(add(y2, y4), y2);
  const den = sub(mul(ratioA, add(add(y1, y2), y3)), add(y2, mul(k, y3)));
  const vb = div(y1, den); // VB per volt of input
  return abs(mul(k, vb));
}

/** Magnitude in dB. */
export const dB = (m) => 20 * Math.log10(m);
