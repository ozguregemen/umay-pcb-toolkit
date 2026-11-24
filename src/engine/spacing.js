// Minimum electrical conductor spacing — IPC-2221, Table 6-1.
//
// Voltage is the DC or AC-peak voltage between conductors.

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

// Above 500 V: mm per volt.
const PER_VOLT_OVER_500 = [0.0025, 0.005, 0.025, 0.00305, 0.00305, 0.00305, 0.00305];

/** Voltage bands for display: [{ from, to, valuesMm }] */
export const BANDS = TABLE.map(([to, valuesMm], i) => ({
  from: i === 0 ? 0 : TABLE[i - 1][0],
  to,
  valuesMm,
}));
export const PER_VOLT = PER_VOLT_OVER_500;

/**
 * Minimum spacing in mm. Voltages between the integer band limits of the
 * printed table (e.g. 15.5 V) belong to the next band up.
 */
export function minimumSpacingMm(voltage, category) {
  const idx = CATEGORIES.indexOf(category);
  if (idx < 0) throw new Error(`Unknown category: ${category}`);
  const v = Math.abs(voltage);
  if (!(v > 0)) return 0;
  if (v > 500) return PER_VOLT_OVER_500[idx] * v;
  for (const [to, values] of TABLE) {
    if (v <= to) return values[idx];
  }
  return TABLE[TABLE.length - 1][1][idx];
}

/** Index of the table row used for `voltage` (−1 when above 500 V or ≤ 0). */
export function bandIndex(voltage) {
  const v = Math.abs(voltage);
  if (!(v > 0) || v > 500) return -1;
  return TABLE.findIndex(([to]) => v <= to);
}
