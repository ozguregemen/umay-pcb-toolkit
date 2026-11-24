// Fusing (melting) current of copper conductors.
//
// Onderdonk (adiabatic, short pulses — no heat lost to the board):
//   I = A · √( log10(1 + (Tm − Ta)/(234 + Ta)) / (33 · t) )
//   A in circular mils, t in seconds, Tm = 1083 °C (copper melting point)
// Preece (steady state, wire in free air):
//   I = k · d^1.5,  k = 10244 for copper, d in inches
// A rectangular trace is mapped to the round wire of equal cross-section.

export const T_MELT_CU = 1083;
export const PREECE_K_CU = 10244;
const CMIL_PER_MM2 = 1973.525; // 1 mm² = 1973.5 circular mils

export const mm2ToCmil = (mm2) => mm2 * CMIL_PER_MM2;

/** Onderdonk fusing current (A) for area (mm²), duration (s), ambient (°C). */
export function onderdonkCurrent(areaMm2, seconds, ambientC = 25) {
  const k = Math.log10(1 + (T_MELT_CU - ambientC) / (234 + ambientC));
  return mm2ToCmil(areaMm2) * Math.sqrt(k / (33 * seconds));
}

/** Onderdonk time to fuse (s) at current I. */
export function onderdonkTime(areaMm2, currentA, ambientC = 25) {
  const k = Math.log10(1 + (T_MELT_CU - ambientC) / (234 + ambientC));
  const A = mm2ToCmil(areaMm2);
  return (k * A * A) / (33 * currentA * currentA);
}

/** Preece fusing current (A) for the round wire with the same area (mm²). */
export function preeceCurrent(areaMm2) {
  const dIn = Math.sqrt((4 * areaMm2) / Math.PI) / 25.4;
  return PREECE_K_CU * dIn ** 1.5;
}

/**
 * @param {object} p  { areaMm2, seconds?, currentA?, ambientC? }
 */
export function calculateFusing(p) {
  if (!(p.areaMm2 > 0)) return { ok: false, errors: ['area'] };
  const ambientC = Number.isFinite(p.ambientC) ? p.ambientC : 25;
  const res = {
    ok: true,
    areaMm2: p.areaMm2,
    areaCmil: mm2ToCmil(p.areaMm2),
    equivDiameterMm: Math.sqrt((4 * p.areaMm2) / Math.PI),
    preeceA: preeceCurrent(p.areaMm2),
    warnings: [],
  };
  if (p.seconds > 0) {
    res.onderdonkA = onderdonkCurrent(p.areaMm2, p.seconds, ambientC);
    if (p.seconds > 10) res.warnings.push('onderdonkLong');
  }
  if (p.currentA > 0) res.timeS = onderdonkTime(p.areaMm2, p.currentA, ambientC);
  // I²t (A²s) to melt — useful for fuse coordination.
  res.i2t = (Math.log10(1 + (T_MELT_CU - ambientC) / (234 + ambientC)) * res.areaCmil ** 2) / 33;
  return res;
}
