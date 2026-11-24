// Minimum electrical conductor spacing — IPC-2221B, Table 6-1.
// Voltage = DC or AC-peak voltage between the two conductors.

export const CATEGORIES = ['B1', 'B2', 'B3', 'B4', 'A5', 'A6', 'A7'];

// Upper bound of each voltage band (V) and spacing per category (mm),
// column order: B1, B2, B3, B4, A5, A6, A7.
const TABLE = [
  [15, [0.05, 0.1, 0.1, 0.05, 0.13, 0.13, 0.13]],
  [30, [0.05, 0.1, 0.1, 0.05, 0.13, 0.25, 0.13]],
  [50, [0.1, 0.6, 0.6, 0.13, 0.13, 0.4, 0.13]],
  [100, [0.1, 0.6, 1.5, 0.13, 0.13, 0.5, 0.13]],
  [150, [0.2, 0.6, 3.2, 0.4, 0.4, 0.8, 0.4]],
  [170, [0.2, 1.25, 3.2, 0.4, 0.4, 0.8, 0.4]],
  [250, [0.2, 1.25, 6.4, 0.4, 0.4, 0.8, 0.4]],
  [300, [0.2, 1.25, 12.5, 0.4, 0.4, 0.8, 0.8]],
  [500, [0.25, 2.5, 12.5, 0.8, 0.8, 1.5, 0.8]],
];

// Above 500 V: mm per volt over 500 V, added to the 301–500 V row
// (IPC-2221 §6.3; e.g. B1 at 600 V = 0.25 + 100 × 0.0025 = 0.50 mm).
const PER_VOLT_OVER_500 = [0.0025, 0.005, 0.025, 0.00305, 0.00305, 0.00305, 0.00305];
const AT_500 = TABLE[TABLE.length - 1][1];

export const BANDS = TABLE.map(([to, valuesMm], i) => ({
  from: i === 0 ? 0 : TABLE[i - 1][0],
  to,
  valuesMm,
}));
export const PER_VOLT = PER_VOLT_OVER_500;

function idxOf(category) {
  const idx = CATEGORIES.indexOf(category);
  if (idx < 0) throw new Error(`Unknown category: ${category}`);
  return idx;
}

/**
 * Minimum spacing in mm. Voltages between the integer limits of the printed
 * bands (e.g. 15.5 V) belong to the next band up (conservative reading).
 */
export function minimumSpacingMm(voltage, category) {
  const idx = idxOf(category);
  const v = Math.abs(voltage);
  if (!(v > 0)) return 0;
  // Above 500 V: the 301–500 V value plus the per-volt coefficient for each volt over 500.
  if (v > 500) return AT_500[idx] + PER_VOLT_OVER_500[idx] * (v - 500);
  for (const [to, values] of TABLE) if (v <= to) return values[idx];
  return AT_500[idx];
}

/** Highest voltage (V) allowed for a given spacing (mm); 0 if below the first row. */
export function maxVoltageForSpacing(spacingMm, category) {
  const idx = idxOf(category);
  if (!(spacingMm > 0)) return 0;
  if (spacingMm > AT_500[idx]) return 500 + (spacingMm - AT_500[idx]) / PER_VOLT_OVER_500[idx];
  let vmax = 0;
  for (const [to, values] of TABLE) if (values[idx] <= spacingMm + 1e-12) vmax = to;
  return vmax;
}

/** Index of the table row used for `voltage` (−1 above 500 V or ≤ 0). */
export function bandIndex(voltage) {
  const v = Math.abs(voltage);
  if (!(v > 0) || v > 500) return -1;
  return TABLE.findIndex(([to]) => v <= to);
}
