// I²C-bus pull-up resistor sizing after NXP UM10204 (Rev. 7.0, 2021):
// §7.1 pull-up sizing, Table 9 (SDA/SCL DC characteristics) and Table 10
// (timing). SI units throughout (V, A, Ω, F, s).

import { valuesBetween } from './eseries.js';

/** Speed modes: SCL clock, maximum rise time tr, minimum sink current IOL at VOL = 0.4 V, maximum bus capacitance Cb. */
export const I2C_MODES = {
  sm: { fScl: 100e3, trMax: 1000e-9, iol: 3e-3, cbMax: 400e-12 },
  fm: { fScl: 400e3, trMax: 300e-9, iol: 3e-3, cbMax: 400e-12 },
  fmp: { fScl: 1e6, trMax: 120e-9, iol: 20e-3, cbMax: 550e-12 },
};

/** Rise time 0.3·VDD → 0.7·VDD of an RC edge: t = ln(0.7/0.3) · R · C ≈ 0.8473 · R · C (UM10204 §7.1). */
export const RISE_K = Math.log(0.7 / 0.3);

/** Maximum input leakage per I/O pin (UM10204 Table 9, Ii). */
export const LEAK_MAX = 10e-6;

/** Default margin: the recommended value keeps the rise time at ≤ 80 % of the limit. */
export const RISE_MARGIN = 0.8;

/**
 * Bus capacitance per line from its parts.
 * @param {{devices:number, pinC:number, length:number, cPerLength:number, extra?:number}} p
 *   devices on the bus, capacitance per pin (F), trace/cable length (m),
 *   capacitance per metre (F/m), other capacitance (F)
 */
export function busCapacitance({ devices, pinC, length, cPerLength, extra = 0 }) {
  const pins = devices * pinC;
  const wiring = length * cPerLength;
  const other = Number.isFinite(extra) && extra > 0 ? extra : 0;
  return { cb: pins + wiring + other, pins, wiring, other };
}

/**
 * LOW-level output limits from UM10204 Table 9: VOL1 = 0.4 V at 3 mA (20 mA in
 * Fm+) for VDD > 2 V; VOL2 = 0.2·VDD at 2 mA for VDD ≤ 2 V (Fast-mode and Fm+
 * only; not specified for Standard-mode).
 */
export function lowLevel(vdd, mode) {
  if (vdd <= 2) return { vol: 0.2 * vdd, iol: 2e-3, lowVdd: true };
  return { vol: 0.4, iol: I2C_MODES[mode].iol, lowVdd: false };
}

export const riseTime = (r, cb) => RISE_K * r * cb;

/**
 * Pull-up window and a recommended standard value.
 * @param {{vdd:number, mode:'sm'|'fm'|'fmp', cb:number, devices?:number, leak?:number,
 *   series?:string, margin?:number}} p  leak = input leakage per device (A), optional
 */
export function i2cPullup({ vdd, mode, cb, devices = 1, leak, series = 'E24', margin = RISE_MARGIN }) {
  const m = I2C_MODES[mode];
  const { vol, iol, lowVdd } = lowLevel(vdd, mode);
  const rpMin = (vdd - vol) / iol;
  const rpMaxRise = m.trMax / (RISE_K * cb);
  // HIGH-level noise margin VnH = 0.2·VDD above VIH = 0.7·VDD: the leakage of
  // all inputs may drop at most 0.1·VDD across Rp.
  const hasLeak = Number.isFinite(leak) && leak > 0;
  const iLeak = hasLeak ? devices * leak : 0;
  const rpMaxLeak = hasLeak ? (0.1 * vdd) / iLeak : Infinity;
  const rpMax = Math.min(rpMaxRise, rpMaxLeak);
  const windowOk = rpMin <= rpMax;

  // Largest standard value that keeps tr at ≤ margin × limit (lower supply
  // current); otherwise any standard value inside the window.
  let rec = null;
  let tight = false;
  if (windowOk) {
    const roomy = valuesBetween(rpMin, rpMax * margin, series);
    if (roomy.length) rec = roomy[roomy.length - 1];
    else {
      const any = valuesBetween(rpMin, rpMax, series);
      if (any.length) { rec = any[any.length - 1]; tight = true; }
    }
  }
  const at = (r) => (r > 0 ? {
    r,
    tr: riseTime(r, cb),
    iSink: (vdd - vol) / r,
    pLow: (vdd * vdd) / r,
    vHigh: vdd - iLeak * r,
  } : null);
  return {
    ...m, cb, vol, iol, lowVdd, rpMin, rpMaxRise, rpMaxLeak, rpMax, windowOk, iLeak,
    margin, rpTarget: rpMax * margin, // upper limit that leaves the rise-time margin
    cbOver: cb > m.cbMax, rec: rec && at(rec), tight, check: at,
  };
}
