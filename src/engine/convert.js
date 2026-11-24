// Unit conversions for the converter page: length, copper weight,
// temperature, RF power / voltage, dB ratios and AWG wire gauges.

// ---------------------------------------------------------------------------
// Length
// ---------------------------------------------------------------------------

/** Metres per unit (1 in = 25.4 mm exactly, 1 mil = 0.001 in). */
export const LENGTH_M = { mm: 1e-3, mil: 2.54e-5, in: 0.0254, um: 1e-6, cm: 1e-2, m: 1 };

/**
 * Convert a length to every supported unit.
 * @param {number} value
 * @param {keyof LENGTH_M} unit
 * @returns {Record<string, number>} keyed like LENGTH_M
 */
export function convertLength(value, unit) {
  const m = value * LENGTH_M[unit];
  return Object.fromEntries(Object.entries(LENGTH_M).map(([k, f]) => [k, m / f]));
}

// ---------------------------------------------------------------------------
// Copper weight
// ---------------------------------------------------------------------------

/** Nominal rolled/ED copper thickness for 1 oz/ft² (µm). */
export const UM_PER_OZ = 34.79;
/** Thickness IPC-2221 uses for 1 oz/ft² (mil). */
export const IPC_MIL_PER_OZ = 1.378;
/** 1 oz/ft² as areal mass: 28.349523 g / 0.09290304 m². */
export const GSM_PER_OZ = 28.349523125 / 0.09290304;

/**
 * Copper weight ↔ thickness.
 * @param {number} value
 * @param {'oz'|'um'|'mil'|'mm'} unit
 * @returns {{oz:number, um:number, mil:number, mm:number, gsm:number, ipcMil:number, ipcUm:number}}
 */
export function convertCopper(value, unit) {
  let um;
  switch (unit) {
    case 'oz': um = value * UM_PER_OZ; break;
    case 'mil': um = value * 25.4; break;
    case 'mm': um = value * 1000; break;
    default: um = value;
  }
  const oz = um / UM_PER_OZ;
  return {
    oz,
    um,
    mil: um / 25.4,
    mm: um / 1000,
    gsm: oz * GSM_PER_OZ,
    ipcMil: oz * IPC_MIL_PER_OZ,
    ipcUm: oz * IPC_MIL_PER_OZ * 25.4,
  };
}

// ---------------------------------------------------------------------------
// Temperature
// ---------------------------------------------------------------------------

/**
 * Absolute temperature in °C, °F and K.
 * @param {number} value
 * @param {'C'|'F'|'K'} unit
 * @returns {{ok:boolean, C:number, F:number, K:number}} ok=false below absolute zero
 */
export function convertTemperature(value, unit) {
  let c;
  if (unit === 'F') c = ((value - 32) * 5) / 9;
  else if (unit === 'K') c = value - 273.15;
  else c = value;
  const k = c + 273.15;
  return { ok: k >= -1e-9, C: c, F: (c * 9) / 5 + 32, K: k };
}

// ---------------------------------------------------------------------------
// RF power
// ---------------------------------------------------------------------------

/** Input units accepted by convertRfPower(). */
export const RF_UNITS = ['dBm', 'dBW', 'W', 'mW', 'Vrms', 'Vpp', 'dBµV'];

/**
 * Power ↔ level ↔ voltage of a sine wave in an impedance Z.
 * @param {number} value
 * @param {string} unit one of RF_UNITS
 * @param {number} z impedance (Ω)
 * @returns {{ok:boolean, W:number, dBm:number, dBW:number, vrms:number, vpk:number,
 *   vpp:number, dBuV:number, dBmV:number, irms:number}}
 */
export function convertRfPower(value, unit, z) {
  let w;
  switch (unit) {
    case 'dBm': w = 1e-3 * 10 ** (value / 10); break;
    case 'dBW': w = 10 ** (value / 10); break;
    case 'W': w = value; break;
    case 'mW': w = value * 1e-3; break;
    case 'Vrms': w = (value * value) / z; break;
    case 'Vpp': w = (value / (2 * Math.SQRT2)) ** 2 / z; break;
    case 'dBµV': w = (1e-6 * 10 ** (value / 20)) ** 2 / z; break;
    default: throw new Error(`Unknown RF unit: ${unit}`);
  }
  const ok = w > 0 && Number.isFinite(w);
  const vrms = Math.sqrt(w * z);
  return {
    ok,
    W: w,
    dBm: 10 * Math.log10(w / 1e-3),
    dBW: 10 * Math.log10(w),
    vrms,
    vpk: vrms * Math.SQRT2,
    vpp: vrms * 2 * Math.SQRT2,
    dBuV: 20 * Math.log10(vrms / 1e-6),
    dBmV: 20 * Math.log10(vrms / 1e-3),
    irms: vrms / z,
  };
}

// ---------------------------------------------------------------------------
// dB ratios
// ---------------------------------------------------------------------------

/**
 * dB ↔ power ratio ↔ voltage (amplitude) ratio.
 * @param {number} value
 * @param {'dB'|'pr'|'vr'} kind dB, power ratio P2/P1 or voltage ratio V2/V1
 * @returns {{ok:boolean, dB:number, power:number, voltage:number}}
 */
export function convertDb(value, kind) {
  let db;
  if (kind === 'pr') db = 10 * Math.log10(value);
  else if (kind === 'vr') db = 20 * Math.log10(value);
  else db = value;
  const ok = Number.isFinite(db) && (kind === 'dB' || value > 0);
  return { ok, dB: db, power: 10 ** (db / 10), voltage: 10 ** (db / 20) };
}

// ---------------------------------------------------------------------------
// AWG
// ---------------------------------------------------------------------------

/** Annealed copper resistivity at 20 °C (IEC 60028), Ω·m. */
export const RHO_CU_20 = 1.724e-8;
/** Supported gauges: 0000 (= −3) … 40. */
export const AWG_MIN = -3;
export const AWG_MAX = 40;

/**
 * Wire diameter for an AWG gauge (ASTM B258): d = 0.127 mm · 92^((36 − n)/39).
 * 0 = 1/0, −1 = 2/0, −2 = 3/0, −3 = 4/0.
 * @param {number} n gauge
 * @returns {number} diameter (mm)
 */
export const awgDiameterMm = (n) => 0.127 * 92 ** ((36 - n) / 39);

/**
 * Fractional gauge for a diameter (inverse of awgDiameterMm).
 * @param {number} dMm diameter (mm)
 */
export const awgFromDiameterMm = (dMm) => 36 - (39 * Math.log(dMm / 0.127)) / Math.log(92);

/** Display name: −3 → '4/0', −1 → '2/0', 0 → '1/0', 12 → '12'. */
export const awgName = (n) => (n <= 0 ? `${1 - n}/0` : String(n));

/**
 * Properties of a solid round copper wire of gauge n.
 * @param {number} n gauge (−3 … 40)
 * @returns {{n:number, dMm:number, dIn:number, areaMm2:number, kcmil:number, ohmPerM:number, ohmPerKm:number, ohmPerKft:number}}
 */
export function awgWire(n) {
  const dMm = awgDiameterMm(n);
  const areaMm2 = (Math.PI * dMm * dMm) / 4;
  const dMil = dMm / 0.0254;
  const ohmPerM = RHO_CU_20 / (areaMm2 * 1e-6);
  return {
    n,
    dMm,
    dIn: dMm / 25.4,
    areaMm2,
    kcmil: (dMil * dMil) / 1000,
    ohmPerM,
    ohmPerKm: ohmPerM * 1000,
    ohmPerKft: ohmPerM * 304.8,
  };
}

/**
 * Nearest whole gauge (by diameter) for a given diameter, clamped to −3 … 40.
 * @param {number} dMm diameter (mm)
 * @returns {{exact:number, n:number, clamped:boolean}}
 */
export function nearestAwg(dMm) {
  const exact = awgFromDiameterMm(dMm);
  const lo = Math.floor(exact);
  const hi = Math.ceil(exact);
  let n = Math.abs(awgDiameterMm(lo) - dMm) <= Math.abs(awgDiameterMm(hi) - dMm) ? lo : hi;
  const clamped = n < AWG_MIN || n > AWG_MAX;
  n = Math.min(AWG_MAX, Math.max(AWG_MIN, n));
  return { exact, n, clamped };
}
