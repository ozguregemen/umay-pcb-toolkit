// Battery life of a duty-cycled load.
//
// Average current is the charge drawn per period divided by the period; life
// is the usable capacity divided by the average current plus an equivalent
// self-discharge current (a linear, first-order model). Typical
// self-discharge rates: Battery University BU-802b; CR2032 under pulsed
// loads: TI SWRA349 "Coin cells and peak current draw".

const HOURS_PER_YEAR = 8766; // 365.25 days

/**
 * @param {object} p   currents in A, times in s
 * @param {number} p.iSleep      current between events
 * @param {number} p.iAct, p.tAct, p.period    active burst repeated every period
 * @param {number} [p.iBurst], [p.tBurst], [p.burstPeriod]  optional extra event (radio TX…)
 * The extra event replaces sleep time; it is assumed not to overlap the active time.
 */
export function averageCurrent({ iSleep, iAct, tAct, period, iBurst = 0, tBurst = 0, burstPeriod = 0 }) {
  const dAct = tAct / period;
  const hasBurst = iBurst > 0 && tBurst > 0 && burstPeriod > 0;
  const dBurst = hasBurst ? tBurst / burstPeriod : 0;
  const dSleep = 1 - dAct - dBurst;
  if (dSleep < 0) return { ok: false, errors: ['bt_overlap'] };
  const parts = { sleep: iSleep * dSleep, act: iAct * dAct, burst: hasBurst ? iBurst * dBurst : 0 };
  const iAvg = parts.sleep + parts.act + parts.burst;
  return { ok: true, iAvg, dAct, dBurst, dSleep, parts, hasBurst, iPeak: Math.max(iSleep, iAct, hasBurst ? iBurst : 0) };
}

/**
 * @param {object} p
 * @param {number} p.capacityAh nominal capacity (Ah)
 * @param {number} p.usable     usable fraction (cut-off voltage, ageing), 0–1
 * @param {number} p.tempFactor capacity factor at the operating temperature, 0–1
 * @param {number} p.selfPerYear self-discharge, fraction of nominal capacity per year
 * @param {number} p.iAvg       average load current (A)
 */
export function batteryLife({ capacityAh, usable = 1, tempFactor = 1, selfPerYear = 0, iAvg }) {
  const usableAh = capacityAh * usable * tempFactor;
  const iSelf = (capacityAh * selfPerYear) / HOURS_PER_YEAR;
  const hours = usableAh / (iAvg + iSelf);
  return {
    usableAh, iSelf, hours,
    hoursNoSelf: usableAh / iAvg,
    days: hours / 24,
    years: hours / HOURS_PER_YEAR,
    selfShare: iSelf / (iAvg + iSelf),
  };
}

export { HOURS_PER_YEAR };
