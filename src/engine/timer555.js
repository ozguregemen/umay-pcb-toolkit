// NE555 timer (bipolar) — datasheet equations.
//   Astable:    t_high = 0.693·(R1 + R2)·C,  t_low = 0.693·R2·C
//               f = 1.44 / ((R1 + 2·R2)·C),  duty = (R1 + R2) / (R1 + 2·R2)
//   Monostable: t = 1.1·R·C

export const LN2 = Math.log(2); // 0.693

export function astable(r1, r2, c) {
  if (!(r1 > 0) || !(r2 > 0) || !(c > 0)) return { ok: false, errors: ['values'] };
  const tHigh = LN2 * (r1 + r2) * c;
  const tLow = LN2 * r2 * c;
  const period = tHigh + tLow;
  return { ok: true, tHigh, tLow, period, f: 1 / period, duty: tHigh / period };
}

/** Resistors for a target frequency and duty (> 50 %) with a chosen C. */
export function astableDesign(f, duty, c) {
  if (!(f > 0) || !(c > 0)) return { ok: false, errors: ['values'] };
  if (!(duty > 0.5 && duty < 1)) return { ok: false, errors: ['duty'] };
  const period = 1 / f;
  const tLow = period * (1 - duty);
  const tHigh = period * duty;
  const r2 = tLow / (LN2 * c);
  const r1 = tHigh / (LN2 * c) - r2;
  // `target`: the timing the resistors were solved for (for the calculation steps).
  return { ok: true, r1, r2, target: { period, tHigh, tLow } };
}

export function monostable(r, c) {
  if (!(r > 0) || !(c > 0)) return { ok: false, errors: ['values'] };
  return { ok: true, t: 1.1 * r * c };
}
