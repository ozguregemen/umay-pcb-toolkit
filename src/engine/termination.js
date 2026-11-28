// Termination of a fast single-ended signal, and the setup/hold budget of one
// synchronous link. First-order models: a lossless line of impedance Z0, a
// linear driver (an ideal step source behind R_out) and a receiver that draws
// no current.
//
//   Line       t_d = l·t_pd,  l_crit = t_r / (6·t_pd)
//              rule of thumb: the trace is a transmission line when t_d > t_r/6
//   Series     R_s = Z0 − R_out (never below 0)
//              Γ_s = (R_out + R_s − Z0) / (R_out + R_s + Z0)
//              V_1 = V_DD·Z0 / (R_out + R_s + Z0), open far end: 2·V_1
//   Parallel   R_t = Z0 from the end of the line to V_TT (0 V = ground)
//              V = (V_drv·R_t + V_TT·R_out) / (R_t + R_out),  V_drv = V_DD or 0
//   Thévenin   R_1 = Z0·V_DD/V_TT to V_DD,  R_2 = Z0·V_DD/(V_DD − V_TT) to ground
//              R_th = R_1 ∥ R_2,  V_th = V_DD·R_2/(R_1 + R_2)
//              V = (V_drv·R_th + V_th·R_out) / (R_th + R_out)
//   AC         R_t = Z0 in series with C to ground
//              rule of thumb: C ≥ 3·(2·t_d)/Z0, so that R_t·C spans several round trips
//              square wave 0…V_DD of frequency f, 50 % duty, in steady state:
//              P = C·V_DD²·f·tanh(T/(4·τ)),  τ = (R_t + R_out)·C,  T = 1/f
//   Timing     setup = N·T + Δclk − t_co,max − t_data − t_su − t_unc
//              hold  = (1 − N)·T + t_co,min + t_data − Δclk − t_h − t_unc
//              N = 1: captured by the next same clock edge; N = 0.5: by the
//              opposite edge half a period later. Δclk = clock arrival at the
//              receiver minus at the driver.
//
// The power of the AC termination follows from the steady state of an RC
// branch behind a square wave: with a = e^(−T/(2·τ)) the capacitor swings
// between V_DD·a/(1 + a) and V_DD/(1 + a); each period the source delivers the
// charge C·V_DD·(1 − a)/(1 + a) at V_DD, and all of that energy ends in the
// resistors: (1 − a)/(1 + a) = tanh(T/(4·τ)).

import { nearestStandard, bracketStandard, SERIES } from './eseries.js';
import { signalBasics } from './signal.js';

/** Rule of thumb (Johnson & Graham): lumped while the one-way delay is below t_r / 6. */
export const LUMPED_DIVISOR = 6;
/** Rule of thumb for AC termination: R_t·C ≈ Z0·C at least this many round-trip delays. */
export const AC_TAU_FACTOR = 3;
/** Capacitors are picked from E12; E24/E96 capacitor values are rarely stocked. */
export const CAP_SERIES = 'E12';

export const MODES = ['series', 'parallel', 'thevenin', 'ac', 'timing'];

/** Propagation delay per length (s/m) for an effective dielectric constant, from the signal engine. */
export const propagationDelay = (erEff) => signalBasics({ trS: 1e-9, edge: '10-90', erEff }).tpd;
/** Typical FR-4 values (s/m): outer-layer microstrip (εeff ≈ 3.3) and stripline (εr ≈ 4.3). */
export const TPD_MICROSTRIP = propagationDelay(3.3);
export const TPD_STRIPLINE = propagationDelay(4.3);

const finite = (...xs) => xs.every((x) => typeof x === 'number' && Number.isFinite(x));
const seriesName = (name) => (SERIES.includes(name) ? name : 'E24');
/** Γ of a resistance against Z0; rounding noise around a perfect match is removed. */
function reflection(r, z0) {
  const g = (r - z0) / (r + z0);
  return Math.abs(g) < 1e-12 ? 0 : g;
}

/**
 * One-way delay of the trace and the "does it need termination" rule of thumb.
 * @param {object} p
 * @param {number} p.lengthM   trace length (m)
 * @param {number} p.tpdSPerM  propagation delay per length (s/m)
 * @param {number} p.trS       rise time of the driver (s)
 */
export function lineCheck({ lengthM, tpdSPerM, trS }) {
  const tdS = lengthM * tpdSPerM;
  const limitS = trS / LUMPED_DIVISOR;
  return {
    lengthM,
    tpdSPerM,
    trS,
    tdS,
    roundTripS: 2 * tdS,
    limitS,
    critLenM: trS / (LUMPED_DIVISOR * tpdSPerM),
    ratio: tdS / trS,
    needed: tdS > limitS,
  };
}

/**
 * Series (source) termination of a point-to-point net.
 * @param {object} p
 * @param {number} p.z0       line impedance (Ω)
 * @param {number} p.rout     driver output resistance (Ω)
 * @param {number} p.vdd      driver swing (V)
 * @param {string} [p.series] E-series of the resistor
 */
export function seriesTermination({ z0, rout, vdd, series = 'E24' }) {
  const rsExact = z0 - rout;
  const fits = rsExact > 0; // otherwise the driver alone is already at or above Z0
  const rs = fits ? nearestStandard(rsExact, seriesName(series)).nearest : 0;
  const rSource = rout + rs;
  const v1 = (vdd * z0) / (rSource + z0); // step launched into the line
  const vEnd = 2 * v1; // open far end: Γ = +1
  return {
    rsExact,
    fits,
    rs,
    rSource,
    gammaS: reflection(rSource, z0),
    v1,
    vEnd,
    vEndRatio: vEnd / vdd,
  };
}

/**
 * Parallel (end) termination: R_t = Z0 from the far end to V_TT (0 = ground).
 * @param {object} p
 * @param {number} p.z0, p.rout, p.vdd
 * @param {number} [p.vtt]    termination voltage (V), 0 … V_DD
 * @param {number} [p.duty]   fraction of the time at the high level, 0 … 1
 * @param {string} [p.series]
 */
export function parallelTermination({ z0, rout, vdd, vtt = 0, duty = 0.5, series = 'E24' }) {
  const rt = nearestStandard(z0, seriesName(series)).nearest;
  const sum = rt + rout;
  const vHigh = (vdd * rt + vtt * rout) / sum;
  const vLow = (vtt * rout) / sum;
  const iHigh = (vdd - vtt) / sum; // sourced by the driver
  const iLow = vtt / sum; // sunk by the driver
  const pHigh = (vHigh - vtt) ** 2 / rt;
  const pLow = (vtt - vLow) ** 2 / rt;
  return {
    rt,
    gammaL: reflection(rt, z0),
    vtt,
    duty,
    vHigh,
    vLow,
    iHigh,
    iLow,
    iDrive: Math.max(iHigh, iLow),
    pHigh,
    pLow,
    pRt: duty * pHigh + (1 - duty) * pLow,
  };
}

/**
 * Thévenin (split) termination: R_1 to V_DD and R_2 to ground at the far end.
 * @param {object} p
 * @param {number} p.z0, p.rout, p.vdd
 * @param {number} [p.vBias]  wanted bias voltage of the network (V), default V_DD/2
 * @param {number} [p.duty]
 * @param {string} [p.series]
 */
export function theveninTermination({ z0, rout, vdd, vBias = vdd / 2, duty = 0.5, series = 'E24' }) {
  const name = seriesName(series);
  const r1Exact = (z0 * vdd) / vBias;
  const r2Exact = (z0 * vdd) / (vdd - vBias);
  const r1 = nearestStandard(r1Exact, name).nearest;
  const r2 = nearestStandard(r2Exact, name).nearest;
  const rth = (r1 * r2) / (r1 + r2);
  const vth = (vdd * r2) / (r1 + r2);
  const sum = rth + rout;
  const vHigh = (vdd * rth + vth * rout) / sum;
  const vLow = (vth * rout) / sum;
  const iHigh = (vdd - vth) / sum; // sourced by the driver
  const iLow = vth / sum; // sunk by the driver
  const pHigh = (vdd - vHigh) ** 2 / r1 + vHigh ** 2 / r2;
  const pLow = (vdd - vLow) ** 2 / r1 + vLow ** 2 / r2;
  return {
    vBias,
    r1Exact,
    r2Exact,
    r1,
    r2,
    rth,
    vth,
    gammaL: reflection(rth, z0),
    pIdle: vdd ** 2 / (r1 + r2), // driver in high impedance
    duty,
    vHigh,
    vLow,
    iHigh,
    iLow,
    iDrive: Math.max(iHigh, iLow),
    pHigh,
    pLow,
    pAvg: duty * pHigh + (1 - duty) * pLow,
  };
}

/**
 * AC termination: R_t in series with C from the far end to ground.
 * @param {object} p
 * @param {number} p.z0, p.rout, p.vdd
 * @param {number} p.tdS       one-way delay of the line (s)
 * @param {number} p.fHz       frequency of the square wave (Hz), 50 % duty
 * @param {number} [p.cUserF]  capacitor chosen by the user (F); otherwise the suggested value
 * @param {string} [p.series]
 */
export function acTermination({ z0, rout, vdd, tdS, fHz, cUserF, series = 'E24' }) {
  const rt = nearestStandard(z0, seriesName(series)).nearest;
  const cMinF = (AC_TAU_FACTOR * 2 * tdS) / z0;
  const cStdF = bracketStandard(cMinF, CAP_SERIES).above; // rounded up
  const cUser = cUserF > 0;
  const cF = cUser ? cUserF : cStdF;
  const rLoop = rt + rout;
  const periodS = 1 / fHz;
  const tauS = rLoop * cF;
  const x = periodS / (4 * tauS);
  const tanhX = Math.tanh(x);
  const pTotal = cF * vdd ** 2 * fHz * tanhX; // dissipated in R_t and R_out together
  const pRt = (pTotal * rt) / rLoop;
  const pRtDc = (0.5 * vdd ** 2 * rt) / rLoop ** 2; // R_t to ground without the capacitor, 50 % duty
  return {
    rt,
    gammaL: reflection(rt, z0),
    cMinF,
    cStdF,
    cF,
    cUser,
    capSeries: CAP_SERIES,
    tauLineS: rt * cF,
    tauRatio: (rt * cF) / (2 * tdS),
    fHz,
    periodS,
    rLoop,
    tauS,
    x,
    tanhX,
    pTotal,
    pRt,
    pRtDc,
    saving: 1 - pRt / pRtDc,
  };
}

/**
 * Setup and hold margin of one synchronous link.
 * @param {object} p
 * @param {number} p.fHz            clock frequency (Hz)
 * @param {number} p.tcoMaxS        driver clock-to-output, maximum (s)
 * @param {number} p.tcoMinS        driver clock-to-output, minimum (s)
 * @param {number} p.tsuS           receiver setup time (s)
 * @param {number} p.thS            receiver hold time (s)
 * @param {number} p.dataLengthM    data trace length (m)
 * @param {number} p.tpdSPerM       propagation delay per length (s/m)
 * @param {number} [p.tuncS]        clock uncertainty: jitter + skew tolerance (s)
 * @param {number} [p.n]            1: next same edge, 0.5: opposite edge half a period later
 * @param {'common'|'return'} [p.clocking]
 *        common: both devices are clocked from one source, Δclk = skewS;
 *        return: the capturing device generates the clock and the data comes
 *        back from the far device (SPI MISO, any read path), Δclk = −t_clk.
 * @param {number} [p.skewS]        common: clock arrival at the receiver minus at the driver (s)
 * @param {number} [p.clockLengthM] return: clock trace length (m)
 */
export function timingBudget({
  fHz, tcoMaxS, tcoMinS, tsuS, thS, dataLengthM, tpdSPerM, tuncS = 0, n = 1, clocking = 'common', skewS = 0, clockLengthM = 0,
}) {
  const back = clocking === 'return';
  const periodS = 1 / fHz;
  const tdataS = dataLengthM * tpdSPerM;
  const tclkS = back ? clockLengthM * tpdSPerM : 0;
  const dclkS = back ? -tclkS : skewS;
  const setupS = n * periodS + dclkS - tcoMaxS - tdataS - tsuS - tuncS;
  const holdS = (1 - n) * periodS + tcoMinS + tdataS - dclkS - thS - tuncS;
  // Zero setup margin: N·T = t_co,max + t_data + t_su + t_unc − Δclk.
  const pathS = tcoMaxS + tdataS + tsuS + tuncS - dclkS;
  const fMaxHz = pathS > 0 ? n / pathS : null; // null: setup holds at any frequency
  // Zero hold margin for N < 1: (1 − N)·T = t_h + t_unc + Δclk − t_co,min − t_data.
  const holdNeedS = thS + tuncS + dclkS - tcoMinS - tdataS;
  const fHoldMaxHz = n < 1 && holdNeedS > 0 ? (1 - n) / holdNeedS : null;
  // With return clocking a longer route lengthens the clock and the data trace alike.
  const lenFactor = back ? 2 : 1;
  const extraLenM = setupS / (lenFactor * tpdSPerM);
  // A negative value asks for shorter traces, which only works while they are longer than the cut.
  const lengthFixable = extraLenM >= 0 || -extraLenM < (back ? Math.min(dataLengthM, clockLengthM) : dataLengthM);
  // Times of the events at the receiver, t = 0 at the launching clock edge at the driver.
  const captureS = n * periodS + dclkS;
  const events = {
    earliestS: tcoMinS + tdataS, // the previous data may change from here
    validS: tcoMaxS + tdataS, // the new data is valid from here …
    validEndS: periodS + tcoMinS + tdataS, // … until the next launch reaches the receiver
    nextValidS: periodS + tcoMaxS + tdataS,
    captureS,
    needFromS: captureS - tsuS - tuncS, // the receiver needs stable data from here …
    needUntilS: captureS + thS + tuncS, // … until here
  };
  return {
    fHz,
    periodS,
    n,
    clocking: back ? 'return' : 'common',
    dataLengthM,
    clockLengthM: back ? clockLengthM : 0,
    tpdSPerM,
    tcoMaxS,
    tcoMinS,
    tsuS,
    thS,
    tuncS,
    tdataS,
    tclkS,
    dclkS,
    setupS,
    holdS,
    pass: setupS >= 0 && holdS >= 0,
    pathS,
    fMaxHz,
    holdNeedS,
    fHoldMaxHz,
    lenFactor,
    extraLenM,
    lengthFixable,
    validWindowS: events.validEndS - events.validS,
    needWindowS: tsuS + thS + 2 * tuncS,
    events,
  };
}

/** True when every number in a (nested) result is finite; null marks "not applicable". */
function allFinite(x) {
  if (typeof x === 'number') return Number.isFinite(x);
  if (x && typeof x === 'object') return Object.values(x).every(allFinite);
  return true;
}

/**
 * The calculator: one mode at a time. Inputs in SI units.
 * @param {object} p
 * @param {'series'|'parallel'|'thevenin'|'ac'|'timing'} p.mode
 * @param {number} p.lengthM   trace length (m): the terminated line, or the data trace (timing)
 * @param {number} p.tpdSPerM  propagation delay per length (s/m)
 * Termination modes: z0 (Ω), rout (Ω), vdd (V), trS (s), series ('E24' | 'E96' …);
 *   parallel: vtt (V), duty (0…1), iMaxA (A), vih (V), vil (V);
 *   thevenin: vBias (V, default V_DD/2), duty, iMaxA, vih, vil;
 *   ac: fHz (Hz), cUserF (F, optional).
 * Timing: fHz, tcoMaxS, tcoMinS, tsuS, thS, tuncS, n (1 | 0.5), clocking ('common' | 'return'),
 *   skewS (common), clockLengthM (return).
 * @returns {{ok: false, errors: string[]} | object} errors and warnings are message keys.
 */
export function termination(p) {
  const fail = (...errors) => ({ ok: false, errors });
  if (!p || !MODES.includes(p.mode)) return fail('tn_positive');
  if (!finite(p.lengthM, p.tpdSPerM) || !(p.lengthM > 0) || !(p.tpdSPerM > 0)) return fail('tn_positive');
  const warnings = [];
  let r;

  if (p.mode === 'timing') {
    const n = p.n ?? 1;
    const back = p.clocking === 'return';
    const tuncS = p.tuncS ?? 0;
    const skewS = p.skewS ?? 0;
    if (!finite(p.fHz, p.tcoMaxS, p.tcoMinS, p.tsuS, p.thS, tuncS, n) || !(p.fHz > 0) || !(tuncS >= 0) || !(n > 0 && n <= 1)) return fail('tn_positive');
    if (back ? !(finite(p.clockLengthM) && p.clockLengthM > 0) : !finite(skewS)) return fail('tn_positive');
    const errors = [];
    if (p.tcoMinS > p.tcoMaxS) errors.push('tn_tco');
    if (p.tsuS + p.thS < 0) errors.push('tn_window'); // the sampling window cannot have a negative width
    if (errors.length) return fail(...errors);
    const b = timingBudget({
      fHz: p.fHz, tcoMaxS: p.tcoMaxS, tcoMinS: p.tcoMinS, tsuS: p.tsuS, thS: p.thS, tuncS, n,
      dataLengthM: p.lengthM, tpdSPerM: p.tpdSPerM,
      clocking: back ? 'return' : 'common', skewS, clockLengthM: back ? p.clockLengthM : 0,
    });
    if (b.setupS < 0) warnings.push('tn_setupNeg');
    // With N = 1 the period is not in the hold equation: a slower clock does not help.
    if (b.holdS < 0) warnings.push(n < 1 ? 'tn_holdNegHalf' : 'tn_holdNeg');
    r = { ok: true, mode: p.mode, ...b, warnings };
    return allFinite(r) ? r : fail('tn_range');
  }

  if (!finite(p.z0, p.rout, p.vdd, p.trS) || !(p.z0 > 0) || !(p.rout >= 0) || !(p.vdd > 0) || !(p.trS > 0)) return fail('tn_positive');
  const series = seriesName(p.series);
  const base = { z0: p.z0, rout: p.rout, vdd: p.vdd, series };
  const line = lineCheck(p);
  const limits = () => {
    // Driver strength and receiver thresholds, when they are given.
    const lim = { iMaxA: p.iMaxA > 0 ? p.iMaxA : null, vih: finite(p.vih) ? p.vih : null, vil: finite(p.vil) ? p.vil : null };
    if (lim.iMaxA !== null && r.iDrive > lim.iMaxA) warnings.push('tn_iDrv');
    if (lim.vih !== null && r.vHigh < lim.vih) warnings.push('tn_vih');
    if (lim.vil !== null && r.vLow > lim.vil) warnings.push('tn_vil');
    return lim;
  };
  const dutyOf = () => (p.duty === undefined ? 0.5 : p.duty);

  if (p.mode === 'series') {
    r = seriesTermination(base);
    if (!r.fits) warnings.push('tn_noRs');
  } else if (p.mode === 'parallel') {
    const vtt = p.vtt ?? 0;
    const duty = dutyOf();
    if (!finite(vtt, duty) || vtt < 0 || duty < 0 || duty > 1) return fail('tn_positive');
    if (vtt > p.vdd) return fail('tn_vtt');
    r = parallelTermination({ ...base, vtt, duty });
    Object.assign(r, limits());
  } else if (p.mode === 'thevenin') {
    const vBias = p.vBias ?? p.vdd / 2;
    const duty = dutyOf();
    if (!finite(vBias, duty) || duty < 0 || duty > 1) return fail('tn_positive');
    if (!(vBias > 0 && vBias < p.vdd)) return fail('tn_bias');
    r = theveninTermination({ ...base, vBias, duty });
    Object.assign(r, limits());
  } else {
    if (!finite(p.fHz) || !(p.fHz > 0)) return fail('tn_positive');
    if (p.cUserF !== undefined && !(finite(p.cUserF) && p.cUserF > 0)) return fail('tn_positive');
    r = acTermination({ ...base, tdS: line.tdS, fHz: p.fHz, cUserF: p.cUserF });
    if (r.cUser && r.cF < r.cMinF) warnings.push('tn_cSmall');
  }
  r = { ok: true, mode: p.mode, ...base, line, ...r, warnings };
  return allFinite(r) ? r : fail('tn_range');
}
