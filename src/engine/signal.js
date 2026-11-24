// Signal-integrity rules of thumb with their physical basis.

const C0 = 299792458; // m/s
const MU0 = 4e-7 * Math.PI;
const RHO_CU = 1.724e-8;

/** Knee/bandwidth constants for the edge definition. */
export const EDGE = {
  '10-90': { bw: 0.35, knee: 0.5 }, // single-pole: BW = 0.35/tr
  // Same single pole, 20–80 % edge: tr(20–80) = ln4·τ = 0.631·tr(10–90)
  '20-80': { bw: 0.35 * 0.631, knee: 0.5 * 0.631 },
};

/**
 * @param {object} p
 * @param {number} p.trS        rise time (s)
 * @param {'10-90'|'20-80'} p.edge
 * @param {number} p.erEff      effective dielectric constant
 * @param {number} [p.lengthM]  trace length (m)
 * @param {number} [p.fHz]      frequency for wavelength / skin depth (default: knee)
 * @param {number} [p.mismatchM] length mismatch (m) → skew
 * @param {number} [p.skewBudgetS] skew budget (s) → allowed mismatch
 */
export function signalBasics(p) {
  const e = EDGE[p.edge] ?? EDGE['10-90'];
  const bwHz = e.bw / p.trS;
  const kneeHz = e.knee / p.trS;
  const v = C0 / Math.sqrt(p.erEff); // m/s
  const tpd = 1 / v; // s/m
  const riseLenM = p.trS * v; // spatial length of the edge
  const lumpedM = riseLenM / 6; // Johnson: lumped if length < l_r/6
  const reflectM = riseLenM / 2; // round trip shorter than tr
  const fHz = p.fHz > 0 ? p.fHz : kneeHz;
  const lambdaM = v / fHz;
  const skinM = Math.sqrt(RHO_CU / (Math.PI * fHz * MU0));

  const r = { bwHz, kneeHz, v, tpd, riseLenM, lumpedM, reflectM, fHz, lambdaM, skinM };
  if (p.lengthM > 0) {
    r.delayS = p.lengthM * tpd;
    r.ratio = p.lengthM / riseLenM;
    r.regime = p.lengthM < lumpedM ? 'lumped' : p.lengthM < reflectM ? 'transition' : 'tline';
    r.lambdaFrac = p.lengthM / lambdaM;
  }
  if (p.mismatchM > 0) r.skewS = p.mismatchM * tpd;
  if (p.skewBudgetS > 0) r.allowedMismatchM = p.skewBudgetS / tpd;
  return r;
}

/**
 * Length factor for backward (near-end) crosstalk: it saturates once the
 * coupled length's round-trip delay reaches the rise time (D. Brooks).
 */
export const nextLengthFactor = (lengthM, erEff, trS) => Math.min(1, (2 * lengthM * Math.sqrt(erEff)) / C0 / trS);

/**
 * Near-end crosstalk estimate (H. Johnson): X ≈ K / (1 + (D/H)²), with D the
 * centre-to-centre spacing and H the height above the reference plane. K ≤ 1
 * depends on rise time and coupled length; K = 1 gives an upper bound.
 */
export function crosstalk({ spacingMm, widthMm, heightMm, height2Mm, k = 1, swingV, targetPct }) {
  const D = spacingMm + widthMm;
  // Stripline (D. Brooks): H = Ha·Hb / (Ha + Hb), parallel combination of the plane heights.
  const H = height2Mm > 0 ? (heightMm * height2Mm) / (heightMm + height2Mm) : heightMm;
  const x = k / (1 + (D / H) ** 2);
  const r = {
    D,
    H,
    k,
    fraction: x,
    db: 20 * Math.log10(x),
    threeW: D >= 3 * widthMm,
    dOverH: D / H,
  };
  if (swingV > 0) r.noiseV = x * swingV;
  if (targetPct > 0 && targetPct / 100 < k) {
    const Dreq = H * Math.sqrt(k / (targetPct / 100) - 1);
    r.requiredGapMm = Math.max(0, Dreq - widthMm);
  }
  return r;
}
