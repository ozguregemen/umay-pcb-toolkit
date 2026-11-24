// IEC 60063:2015 preferred-number series (E3 … E192) and standard-value search.
//
// The lists are the published tables, not the 10^(i/n) formula: E3–E24 keep the
// historical two-digit values (2.7, 3.0 … 8.2, 9.1) that the formula does not
// reproduce, and E192 uses 9.20 where the formula gives 9.19.

const E3 = [10, 22, 47];
const E6 = [10, 15, 22, 33, 47, 68];
const E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82];
const E24 = [10, 11, 12, 13, 15, 16, 18, 20, 22, 24, 27, 30, 33, 36, 39, 43, 47, 51, 56, 62, 68, 75, 82, 91];
const E48 = [
  100, 105, 110, 115, 121, 127, 133, 140, 147, 154, 162, 169, 178, 187, 196, 205,
  215, 226, 237, 249, 261, 274, 287, 301, 316, 332, 348, 365, 383, 402, 422, 442,
  464, 487, 511, 536, 562, 590, 619, 649, 681, 715, 750, 787, 825, 866, 909, 953,
];
const E96 = [
  100, 102, 105, 107, 110, 113, 115, 118, 121, 124, 127, 130, 133, 137, 140, 143,
  147, 150, 154, 158, 162, 165, 169, 174, 178, 182, 187, 191, 196, 200, 205, 210,
  215, 221, 226, 232, 237, 243, 249, 255, 261, 267, 274, 280, 287, 294, 301, 309,
  316, 324, 332, 340, 348, 357, 365, 374, 383, 392, 402, 412, 422, 432, 442, 453,
  464, 475, 487, 499, 511, 523, 536, 549, 562, 576, 590, 604, 619, 634, 649, 665,
  681, 698, 715, 732, 750, 768, 787, 806, 825, 845, 866, 887, 909, 931, 953, 976,
];
const E192 = [
  100, 101, 102, 104, 105, 106, 107, 109, 110, 111, 113, 114, 115, 117, 118, 120,
  121, 123, 124, 126, 127, 129, 130, 132, 133, 135, 137, 138, 140, 142, 143, 145,
  147, 149, 150, 152, 154, 156, 158, 160, 162, 164, 165, 167, 169, 172, 174, 176,
  178, 180, 182, 184, 187, 189, 191, 193, 196, 198, 200, 203, 205, 208, 210, 213,
  215, 218, 221, 223, 226, 229, 232, 234, 237, 240, 243, 246, 249, 252, 255, 258,
  261, 264, 267, 271, 274, 277, 280, 284, 287, 291, 294, 298, 301, 305, 309, 312,
  316, 320, 324, 328, 332, 336, 340, 344, 348, 352, 357, 361, 365, 370, 374, 379,
  383, 388, 392, 397, 402, 407, 412, 417, 422, 427, 432, 437, 442, 448, 453, 459,
  464, 470, 475, 481, 487, 493, 499, 505, 511, 517, 523, 530, 536, 542, 549, 556,
  562, 569, 576, 583, 590, 597, 604, 612, 619, 626, 634, 642, 649, 657, 665, 673,
  681, 690, 698, 706, 715, 723, 732, 741, 750, 759, 768, 777, 787, 796, 806, 816,
  825, 835, 845, 856, 866, 876, 887, 898, 909, 920, 931, 942, 953, 965, 976, 988,
];

const TABLE = { E3, E6, E12, E24, E48, E96, E192 };

/** Series names in increasing density. */
export const SERIES = Object.keys(TABLE);

/**
 * Tolerance associated with each series (IEC 60063). E3 is defined only as
 * "wider than ±20 %", flagged with `over: true`.
 */
export const TOLERANCE = {
  E3: { pct: 20, over: true },
  E6: { pct: 20 },
  E12: { pct: 10 },
  E24: { pct: 5 },
  E48: { pct: 2 },
  E96: { pct: 1 },
  E192: { pct: 0.5 },
};

const digitsOf = (name) => (TABLE[name][0] >= 100 ? 3 : 2);
const clean = (x) => Number(x.toPrecision(12));

function table(name) {
  const list = TABLE[name];
  if (!list) throw new Error(`Unknown E-series: ${name}`);
  return list;
}

/**
 * Mantissas of one decade in [1, 10), e.g. E6 → [1, 1.5, 2.2, 3.3, 4.7, 6.8].
 * @param {string} name 'E3' … 'E192'
 * @returns {number[]}
 */
export function decadeValues(name) {
  const div = 10 ** (digitsOf(name) - 1);
  return table(name).map((m) => m / div);
}

/** Standard value: list entry `m` scaled into decade `e` (value in [10^e, 10^(e+1))). */
const valueOf = (m, e, d) => clean(m * 10 ** (e - d + 1));

/**
 * Standard values bracketing x: largest value ≤ x and smallest value ≥ x
 * (both equal x when x is itself a standard value).
 * @param {number} x positive value
 * @param {string} name series name
 * @returns {{below:number, above:number}}
 */
export function bracketStandard(x, name) {
  if (!(x > 0) || !Number.isFinite(x)) return { below: NaN, above: NaN };
  const list = table(name);
  const d = digitsOf(name);
  let e = Math.floor(Math.log10(x));
  let scaled = clean(x / 10 ** (e - d + 1));
  if (scaled >= 10 ** d) { e += 1; scaled = clean(x / 10 ** (e - d + 1)); }
  if (scaled < 10 ** (d - 1)) { e -= 1; scaled = clean(x / 10 ** (e - d + 1)); }
  let i = list.length - 1;
  while (i > 0 && list[i] > scaled) i--;
  const below = valueOf(list[i], e, d);
  if (list[i] === scaled) return { below, above: below };
  const above = i + 1 < list.length ? valueOf(list[i + 1], e, d) : valueOf(list[0], e + 1, d);
  return { below, above };
}

/**
 * Nearest standard values to a target.
 * @param {number} x target (> 0)
 * @param {string} name series name
 * @returns {{below:number, above:number, nearest:number, errorPct:number}}
 *   nearest = the bracketing value with the smaller absolute (= relative) error.
 */
export function nearestStandard(x, name) {
  const { below, above } = bracketStandard(x, name);
  const nearest = x - below <= above - x ? below : above;
  return { below, above, nearest, errorPct: ((nearest - x) / x) * 100 };
}

/**
 * All standard values in [lo, hi], ascending.
 * @param {number} lo
 * @param {number} hi
 * @param {string} name
 * @returns {number[]}
 */
export function valuesBetween(lo, hi, name) {
  if (!(lo > 0) || !(hi >= lo)) return [];
  const list = table(name);
  const d = digitsOf(name);
  const out = [];
  for (let e = Math.floor(Math.log10(lo)) - 1; e <= Math.floor(Math.log10(hi)); e++) {
    for (const m of list) {
      const v = valueOf(m, e, d);
      if (v >= lo * (1 - 1e-12) && v <= hi * (1 + 1e-12)) out.push(v);
    }
  }
  return out;
}

const relErr = (got, want) => (got - want) / want;
const spread = (a, b) => Math.max(a, b) / Math.min(a, b);

/**
 * Pick the better of two candidates: smaller |error|, then the less extreme
 * value ratio (avoids e.g. 4.7 k + 10 Ω when 2.4 k + 2.4 k is equally good).
 */
function better(cand, best) {
  if (!best) return true;
  const a = Math.abs(cand.err);
  const b = Math.abs(best.err);
  if (a < b - 1e-12) return true;
  if (a > b + 1e-12) return false;
  return cand.tie < best.tie;
}

/**
 * Best two-resistor series combination R_a + R_b ≈ target from one series.
 * Each pair has a value ratio of at most `maxRatio` (default 100: two decades).
 * @param {number} target
 * @param {string} name
 * @param {number} [maxRatio=100]
 * @returns {{a:number, b:number, value:number, errorPct:number} | null} a ≥ b
 */
export function bestSeriesPair(target, name, maxRatio = 100) {
  if (!(target > 0)) return null;
  let best = null;
  for (const a of valuesBetween(target / (maxRatio + 1), target, name)) {
    const rest = target - a;
    if (!(rest > 0)) continue;
    const { below, above } = bracketStandard(rest, name);
    for (const b of [below, above]) {
      if (!(b > 0) || spread(a, b) > maxRatio) continue;
      const value = a + b;
      const cand = { a: Math.max(a, b), b: Math.min(a, b), value, err: relErr(value, target), tie: spread(a, b) };
      if (better(cand, best)) best = cand;
    }
  }
  return best && { a: best.a, b: best.b, value: best.value, errorPct: best.err * 100 };
}

/**
 * Best two-resistor parallel combination R_a ∥ R_b ≈ target from one series.
 * @param {number} target
 * @param {string} name
 * @param {number} [maxRatio=100]
 * @returns {{a:number, b:number, value:number, errorPct:number} | null} a ≤ b
 */
export function bestParallelPair(target, name, maxRatio = 100) {
  if (!(target > 0)) return null;
  let best = null;
  for (const a of valuesBetween(target, target * (maxRatio + 1), name)) {
    if (!(a > target)) continue;
    const ideal = (a * target) / (a - target);
    const { below, above } = bracketStandard(ideal, name);
    for (const b of [below, above]) {
      if (!(b > 0) || spread(a, b) > maxRatio) continue;
      const value = (a * b) / (a + b);
      const cand = { a: Math.min(a, b), b: Math.max(a, b), value, err: relErr(value, target), tie: spread(a, b) };
      if (better(cand, best)) best = cand;
    }
  }
  return best && { a: best.a, b: best.b, value: best.value, errorPct: best.err * 100 };
}
