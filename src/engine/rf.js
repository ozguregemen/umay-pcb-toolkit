// Reflection / mismatch relations.
//   Γ = (ZL − Z0)/(ZL + Z0),  VSWR = (1 + |Γ|)/(1 − |Γ|),  RL = −20·log10|Γ|
//   Mismatch loss = −10·log10(1 − |Γ|²)

/** Complex Γ for a load ZL = r + jx on a real Z0. */
export function gammaFromLoad(z0, r, x = 0) {
  const nr = r - z0;
  const dr = r + z0;
  const den = dr * dr + x * x;
  const re = (nr * dr + x * x) / den;
  const im = (x * dr - nr * x) / den;
  return { re, im, mag: Math.hypot(re, im), angleDeg: (Math.atan2(im, re) * 180) / Math.PI };
}

/** All mismatch figures from |Γ|. */
export function fromGammaMag(g) {
  const m = Math.min(Math.max(g, 0), 1);
  return {
    gamma: m,
    vswr: m >= 1 ? Infinity : (1 + m) / (1 - m),
    // "+ 0" turns the −0 of a full reflection / perfect match into 0 (shown as "-0.00 dB" otherwise).
    returnLossDb: m === 0 ? Infinity : -20 * Math.log10(m) + 0,
    mismatchLossDb: m >= 1 ? Infinity : -10 * Math.log10(1 - m * m) + 0,
    reflectedPct: m * m * 100,
    transmittedPct: (1 - m * m) * 100,
  };
}

export const gammaFromVswr = (s) => (s - 1) / (s + 1);
export const gammaFromReturnLoss = (rl) => 10 ** (-rl / 20);
