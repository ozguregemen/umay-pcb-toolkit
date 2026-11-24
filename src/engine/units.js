// Unit conversions. Every calculator normalises its inputs with these.

export const MM_PER_MIL = 0.0254;
export const M_PER_MIL = 2.54e-5;
export const MIL_PER_MM = 1 / MM_PER_MIL;
/** 1 oz/ft² copper ≈ 34.79 µm ≈ 1.378 mil (value used by IPC-2221). */
export const MIL_PER_OZ = 1.378;
export const UM_PER_OZ = MIL_PER_OZ * 25.4;

const LENGTH_TO_MM = { mm: 1, mil: MM_PER_MIL, um: 1e-3, cm: 10, m: 1000, in: 25.4 };

export const lengthUnits = Object.keys(LENGTH_TO_MM);

export function toMm(value, unit) {
  const f = LENGTH_TO_MM[unit];
  if (f === undefined) throw new Error(`Unknown length unit: ${unit}`);
  return value * f;
}

export function fromMm(valueMm, unit) {
  const f = LENGTH_TO_MM[unit];
  if (f === undefined) throw new Error(`Unknown length unit: ${unit}`);
  return valueMm / f;
}

/** Copper thickness → mil. Accepts oz, um, mil, mm. */
export function thicknessToMil(value, unit) {
  if (unit === 'oz') return value * MIL_PER_OZ;
  return toMm(value, unit) * MIL_PER_MM;
}

export function currentToA(value, unit) {
  switch (unit) {
    case 'mA': return value * 1e-3;
    case 'uA': return value * 1e-6;
    default: return value;
  }
}

/** Temperature *difference* → °C (K and °C are equal steps). */
export function riseToC(value, unit) {
  return unit === 'F' ? (value * 5) / 9 : value;
}

/** Absolute temperature → °C. */
export function tempToC(value, unit) {
  switch (unit) {
    case 'K': return value - 273.15;
    case 'F': return ((value - 32) * 5) / 9;
    default: return value;
  }
}
