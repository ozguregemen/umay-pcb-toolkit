// Small numeric helpers shared by the calculation engine.

export const clamp = (x, min, max) => (x < min ? min : x > max ? max : x);

export const lerp = (a, b, t) => a + (b - a) * t;

/** Linear interpolation over a sorted table, clamped at both ends. */
export function interp1d(x, xs, ys) {
  if (xs.length !== ys.length || xs.length < 2) throw new Error('Invalid table');
  if (x <= xs[0]) return ys[0];
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
  for (let i = 0; i < xs.length - 1; i++) {
    if (x >= xs[i] && x <= xs[i + 1]) {
      return lerp(ys[i], ys[i + 1], (x - xs[i]) / (xs[i + 1] - xs[i]));
    }
  }
  return ys[ys.length - 1];
}

/**
 * Index of the lower bracket for x in a sorted table (clamped), plus the
 * fractional position t inside that bracket.
 */
export function bracket(x, xs) {
  const v = clamp(x, xs[0], xs[xs.length - 1]);
  let i = 0;
  while (i < xs.length - 2 && v > xs[i + 1]) i++;
  return { i, t: (v - xs[i]) / (xs[i + 1] - xs[i]) };
}

/** Bilinear interpolation on table[row][col] with row axis rs and column axis cs. */
export function interp2d(r, c, rs, cs, table) {
  const { i: ri, t: rt } = bracket(r, rs);
  const { i: ci, t: ct } = bracket(c, cs);
  const a = lerp(table[ri][ci], table[ri][ci + 1], ct);
  const b = lerp(table[ri + 1][ci], table[ri + 1][ci + 1], ct);
  return lerp(a, b, rt);
}

export const isPositive = (x) => Number.isFinite(x) && x > 0;
