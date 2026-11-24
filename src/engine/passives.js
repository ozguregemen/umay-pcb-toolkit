// Passive-component helpers: series/parallel combinations, crystal load
// capacitance, ppm conversions.

/**
 * Series and parallel equivalents. For R and L, series adds values; for C,
 * parallel adds values.
 * @param {'R'|'L'|'C'} kind
 * @param {number[]} values  positive values (empty/NaN entries ignored)
 */
export function combine(kind, values) {
  const v = values.filter((x) => x > 0);
  if (!v.length) return { ok: false, errors: ['values'] };
  const sum = v.reduce((a, b) => a + b, 0);
  const recip = 1 / v.reduce((a, b) => a + 1 / b, 0);
  const series = kind === 'C' ? recip : sum;
  const parallel = kind === 'C' ? sum : recip;
  return { ok: true, n: v.length, series, parallel, min: Math.min(...v), max: Math.max(...v) };
}

/**
 * Crystal load capacitance: CL = C1·C2/(C1 + C2) + Cstray.
 * For equal capacitors: C1 = C2 = 2·(CL − Cstray).
 */
export const effectiveLoad = (c1, c2, cStray) => (c1 * c2) / (c1 + c2) + cStray;
export const equalLoadCaps = (cl, cStray) => 2 * (cl - cStray);

/**
 * Frequency pulling (ppm) when the actual load differs from the specified one.
 *   Δf/f ≈ (Cm/2)·[1/(C0 + CL_actual) − 1/(C0 + CL_spec)]
 * Cm = motional capacitance, C0 = shunt capacitance.
 */
export function pullingPpm(cm, c0, clSpec, clActual) {
  return (cm / 2) * (1 / (c0 + clActual) - 1 / (c0 + clSpec)) * 1e6;
}

export const ppmToHz = (fHz, ppm) => (fHz * ppm) / 1e6;
export const hzToPpm = (fHz, dfHz) => (dfHz / fHz) * 1e6;
/** Clock drift (s) over a period (s) for a given ppm error. */
export const driftSeconds = (ppm, periodS) => (ppm / 1e6) * periodS;
