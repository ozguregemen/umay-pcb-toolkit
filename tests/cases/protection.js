// Protection part selection (src/engine/protection.js): TVS / ESD diode, fuse,
// resettable fuse (PTC) and reverse-polarity protection. The expected values
// are worked out by hand in the comments.

import { near, eq, ok } from '../assert.js';
import {
  ESD_RISE_S, SURGE_SOURCE_OHM, PULSE_SHAPE_K, PULSE_FACTOR, FUSE_OPEN_RATIO,
  esdCurrents, shuntCapCorner, tvsCheck, pulseI2t, fuseCheck, ptcCheck, reversePolarity,
} from '../../src/engine/protection.js';

// A 12 V line behind a 15 V TVS; datasheet point 24.4 V at 16.4 A; the IC pin stands 40 V.
const tvs = { vLine: 12, vAbs: 40, vRwm: 15, vBr: 16.7, vC: 24.4, iPp: 16.4 };
const esd = { ...tvs, event: 'esd', esdKv: 8, lNh: 2 };
// A 24 V input behind a large TVS: 55 V at 500 A (8/20 µs); the regulator stands 60 V.
const surge = { vLine: 24, vAbs: 60, vRwm: 26, vBr: 28.9, vC: 55, iPp: 500, event: 'surge', vOc: 1000, zS: 2 };
// 5 V / 2 A behind a 3 A fuse; the input capacitors charge with a 20 A peak and τ = 0.5 ms.
const fuse = {
  iOp: 2, derate: 0.75, kT: 1, iN: 3, i2tMelt: 1.5, vRated: 32, iBreak: 50, vCircuit: 5, iFault: 20,
  shape: 'exp', iPulse: 20, tPulse: 0.5e-3, pulseFactor: PULSE_FACTOR[100000],
};
// The same circuit behind a 2.6 A / 5 A polymer PTC.
const ptc = { iOp: 2, kTemp: 1, iHold: 2.6, iTrip: 5, vMax: 6, iMax: 100, vCircuit: 5, iFault: 20, r1Max: 0.047, pD: 0.8 };
// 12 V / 2 A: a 0.45 V Schottky against a 20 mΩ P-MOSFET.
const rev = {
  vIn: 12, iLoad: 2, vF: 0.45, thetaDiode: 60, rDsOn: 0.02, vGsRds: 10, vGsTh: 3, vGsMax: 20, thetaFet: 50,
  ambientC: 25, tjMaxC: 125,
};

export const cases = [
  ['protection: IEC 61000-4-2 contact discharge currents per test level', () => {
    // 3.75 A/kV at the first peak, 2 A/kV at 30 ns, 1 A/kV at 60 ns, rise time 0.8 ns.
    const l4 = esdCurrents(8);
    near(l4.iPeak, 30, 1e-12);
    near(l4.i30, 16, 1e-12);
    near(l4.i60, 8, 1e-12);
    eq(l4.riseS, 0.8e-9);
    eq(ESD_RISE_S, 0.8e-9);
    // Levels 1 to 3 of the standard: 2, 4 and 6 kV.
    near(esdCurrents(2).iPeak, 7.5, 1e-12);
    near(esdCurrents(4).iPeak, 15, 1e-12);
    near(esdCurrents(6).iPeak, 22.5, 1e-12);
    near(esdCurrents(6).i30, 12, 1e-12);
    near(esdCurrents(2).i60, 2, 1e-12);
  }],

  ['protection: TVS dynamic resistance and clamp voltage under an 8 kV discharge', () => {
    const r = tvsCheck(esd);
    eq(r.ok, true);
    // R_dyn = (24.4 − 16.7) / 16.4 = 7.7 / 16.4 = 0.469512 Ω
    near(r.rDyn, 0.469512, 1e-5);
    near(r.iPk, 30, 1e-12);
    near(r.i30, 16, 1e-12);
    // First peak: 16.7 + 0.469512·30 = 16.7 + 14.08537 = 30.78537 V
    near(r.vClamp, 30.78537, 1e-6);
    // 30 ns: 16.7 + 0.469512·16 = 16.7 + 7.512195 = 24.212195 V; 60 ns: 16.7 + 3.756098 = 20.456098 V
    near(r.vClamp30, 24.212195, 1e-6);
    near(r.vClamp60, 20.456098, 1e-6);
    // Margins to V_abs = 40 V: 9.21463 V at the peak, 15.787805 V at 30 ns.
    near(r.margin, 9.21463, 1e-5);
    near(r.margin30, 15.787805, 1e-6);
    near(r.rwmMargin, 3, 1e-12);
    eq(r.checks.rwm, 'ok');
    eq(r.checks.clamp, 'ok');
    eq(r.checks.clamp30, 'ok');
    eq(r.checks.ipp, undefined, 'the 8/20 µs rating is not compared with an ESD current');
    eq(r.pass, true);
    eq(r.clampOk, true);
    eq(r.warnings.length, 0);
    // The line of the model passes through the datasheet point.
    near(tvsCheck({ ...tvs, event: 'custom', iPk: 16.4 }).vClamp, 24.4, 1e-12);
  }],

  ['protection: overshoot of the TVS connection inductance', () => {
    // ΔV = L·I_pk / t_r = 2 nH · 30 A / 0.8 ns = 75 V; at the line 30.78537 + 75 = 105.78537 V
    const r = tvsCheck(esd);
    near(r.dvL, 75, 1e-9);
    near(r.vFirst, 105.78537, 1e-6);
    eq(r.pass, true, 'the estimate is not part of the verdict');
    // 1 nH at 4 kV: 1e-9 · 15 / 0.8e-9 = 18.75 V
    near(tvsCheck({ ...esd, esdKv: 4, lNh: 1 }).dvL, 18.75, 1e-9);
    // No inductance given, zero or empty: no overshoot, the first peak is the clamp voltage.
    for (const lNh of [0, undefined, NaN, -1]) {
      const z = tvsCheck({ ...esd, lNh });
      eq(z.dvL, 0, `L = ${lNh}`);
      eq(z.lNh, 0);
      near(z.vFirst, z.vClamp, 1e-12);
    }
  }],

  ['protection: a low-voltage data line, clamp above the pin limit', () => {
    // 6 V breakdown, 10 V at 16 A: R_dyn = 4/16 = 0.25 Ω. 8 kV: 6 + 0.25·30 = 13.5 V at the peak, 6 + 0.25·16 = 10 V at 30 ns.
    const r = tvsCheck({ vLine: 3.6, vAbs: 6, vRwm: 5, vBr: 6, vC: 10, iPp: 16, event: 'esd', esdKv: 8, lNh: 2 });
    near(r.rDyn, 0.25, 1e-12);
    near(r.vClamp, 13.5, 1e-12);
    near(r.vClamp30, 10, 1e-12);
    near(r.margin, -7.5, 1e-12);
    near(r.margin30, -4, 1e-12);
    eq(r.checks.clamp, 'bad');
    eq(r.checks.clamp30, 'bad');
    eq(r.checks.rwm, 'ok');
    eq(r.pass, false);
    // Only the first peak above the limit: V_abs = 12 V is between 10 V and 13.5 V.
    const p = tvsCheck({ vLine: 3.6, vAbs: 12, vRwm: 5, vBr: 6, vC: 10, iPp: 16, event: 'esd', esdKv: 8 });
    eq(p.checks.clamp, 'bad');
    eq(p.checks.clamp30, 'ok');
    eq(p.clampOk, false);
    // Exactly on the limit passes: V_abs = 13.5 V.
    eq(tvsCheck({ vLine: 3.6, vAbs: 13.5, vRwm: 5, vBr: 6, vC: 10, iPp: 16, event: 'esd', esdKv: 8 }).checks.clamp, 'ok');
  }],

  ['protection: stand-off voltage and the ESD rating of the TVS', () => {
    // V_RWM below the line voltage: the diode conducts in normal operation.
    const low = tvsCheck({ ...esd, vLine: 18 });
    eq(low.checks.rwm, 'bad');
    near(low.rwmMargin, -3, 1e-12);
    eq(low.pass, false);
    eq(tvsCheck({ ...esd, vLine: 15 }).checks.rwm, 'ok', 'equal is allowed');
    // Rating of the part against the test level, only when it is given.
    eq(tvsCheck(esd).checks.esdr, undefined);
    eq(tvsCheck({ ...esd, esdRatingKv: 30 }).checks.esdr, 'ok');
    eq(tvsCheck({ ...esd, esdRatingKv: 8 }).checks.esdr, 'ok');
    const weak = tvsCheck({ ...esd, esdRatingKv: 4 });
    eq(weak.checks.esdr, 'bad');
    eq(weak.pass, false);
    // A breakdown voltage at or below the stand-off voltage is a typing error: warned, still calculated.
    ok(tvsCheck({ ...esd, vRwm: 16.7 }).warnings.includes('pr_vbrLow'), 'V_BR = V_RWM');
    ok(!tvsCheck(esd).warnings.includes('pr_vbrLow'), 'V_BR above V_RWM');
  }],

  ['protection: surge current through the TVS, 1 kV behind 2 Ω', () => {
    const r = tvsCheck(surge);
    // R_dyn = (55 − 28.9) / 500 = 0.0522 Ω
    near(r.rDyn, 0.0522, 1e-9);
    // I_pk = (1000 − 28.9) / (2 + 0.0522) = 971.1 / 2.0522 = 473.1995 A
    near(r.iPk, 473.1995, 1e-6);
    // V_cl = 28.9 + 0.0522·473.1995 = 53.60101 V; the same from the source side: 1000 − 2·473.1995 = 53.601 V
    near(r.vClamp, 53.60101, 1e-6);
    near(r.vOc - r.zS * r.iPk, r.vClamp, 1e-9, 'Kirchhoff');
    // P_pk = 53.60101 · 473.1995 = 25364 W
    near(r.pPk, 25364, 1e-4);
    // 473.2 A of the 500 A rating: 94.64 %
    near(r.ippUse, 0.946399, 1e-5);
    near(r.iShort, 500, 1e-12);
    near(r.margin, 6.39899, 1e-5);
    eq(r.conducts, true);
    eq(r.checks.clamp, 'ok');
    eq(r.checks.ipp, 'ok');
    eq(r.checks.rwm, 'ok');
    eq(r.checks.clamp30, undefined);
    eq(r.dvL, undefined, 'the overshoot estimate belongs to the ESD rise');
    eq(r.pass, true);
  }],

  ['protection: surge behind 12 Ω and 42 Ω', () => {
    eq(SURGE_SOURCE_OHM.join(), '2,12,42');
    // 12 Ω: 971.1 / 12.0522 = 80.5745 A → 28.9 + 0.0522·80.5745 = 33.10599 V
    const le = tvsCheck({ ...surge, zS: 12 });
    near(le.iPk, 80.5745, 1e-5);
    near(le.vClamp, 33.10599, 1e-6);
    // 42 Ω: 971.1 / 42.0522 = 23.09273 A → 28.9 + 1.20544 = 30.10544 V
    const sig = tvsCheck({ ...surge, zS: 42 });
    near(sig.iPk, 23.09273, 1e-6);
    near(sig.vClamp, 30.10544, 1e-6);
    near(sig.pPk, 30.10544 * 23.09273, 1e-6);
  }],

  ['protection: a small TVS under a surge, and a surge below the breakdown voltage', () => {
    // The 15 V part (0.469512 Ω) at 1 kV / 2 Ω: 983.3 / 2.469512 = 398.1758 A, far above its 16.4 A;
    // V_cl = 16.7 + 0.469512·398.1758 = 203.648 V = 1000 − 2·398.1758
    const r = tvsCheck({ ...tvs, event: 'surge', vOc: 1000, zS: 2 });
    near(r.iPk, 398.1758, 1e-6);
    near(r.vClamp, 203.648, 1e-5);
    near(r.ippUse, 398.1758 / 16.4, 1e-6);
    eq(r.checks.ipp, 'bad');
    eq(r.checks.clamp, 'bad');
    eq(r.pass, false);
    // 20 V open-circuit voltage does not reach V_BR = 28.9 V: no current, the line sees the 20 V.
    const off = tvsCheck({ ...surge, vOc: 20 });
    eq(off.conducts, false);
    eq(off.iPk, 0);
    eq(off.vClamp, 20);
    eq(off.pPk, 0);
    eq(off.checks.ipp, 'ok');
    eq(off.checks.clamp, 'ok');
    // Continuous at V_OC = V_BR.
    eq(tvsCheck({ ...surge, vOc: 28.9 }).vClamp, 28.9);
  }],

  ['protection: clamp voltage at a given peak current', () => {
    // 10 A: 16.7 + 0.469512·10 = 21.39512 V, 213.9512 W, 10/16.4 = 60.98 % of I_PP
    const r = tvsCheck({ ...tvs, event: 'custom', iPk: 10 });
    near(r.vClamp, 21.39512, 1e-6);
    near(r.pPk, 213.9512, 1e-6);
    near(r.ippUse, 0.609756, 1e-5);
    eq(r.checks.ipp, 'ok');
    eq(r.checks.clamp30, undefined);
    // 20 A is beyond the datasheet point: a warning, not a failure (the waveform is not known).
    const far = tvsCheck({ ...tvs, event: 'custom', iPk: 20 });
    near(far.vClamp, 26.09024, 1e-6);
    eq(far.checks.ipp, 'warn');
    eq(far.pass, true);
  }],

  ['protection: capacitance of the TVS on a matched line', () => {
    // f = 1 / (π·Z0·C): 0.5 pF on 45 Ω → 1 / (π·45·0.5e-12) = 1 / 7.068583e-11 = 14.14711 GHz
    near(shuntCapCorner(45, 0.5e-12), 14.14711e9, 1e-6);
    // 3 pF on 50 Ω → 1 / 4.712389e-10 = 2.122066 GHz
    near(shuntCapCorner(50, 3e-12), 2.122066e9, 1e-6);
    // The same corner as an RC low-pass with Z0/2: 1 / (2π·25·3e-12)
    near(shuntCapCorner(50, 3e-12), 1 / (2 * Math.PI * 25 * 3e-12), 1e-12);
    const r = tvsCheck({ ...esd, cPf: 0.5, z0: 45, bwHz: 720e6 });
    near(r.cap.fcHz, 14.14711e9, 1e-6);
    // 14.14711 GHz / 720 MHz = 19.6488
    near(r.cap.ratio, 19.6488, 1e-5);
    eq(r.checks.cap, 'ok');
    // 100 pF on 50 Ω: 63.662 MHz, below a 100 MHz signal: a warning, the protection verdict stays.
    const slow = tvsCheck({ ...esd, cPf: 100, z0: 50, bwHz: 100e6 });
    near(slow.cap.fcHz, 63.662e6, 1e-5);
    eq(slow.checks.cap, 'warn');
    eq(slow.pass, true);
    // Without a bandwidth the corner is shown and nothing is judged; without a capacitance nothing is shown.
    const noBw = tvsCheck({ ...esd, cPf: 3, z0: 50 });
    near(noBw.cap.fcHz, 2.122066e9, 1e-6);
    eq(noBw.cap.ratio, null);
    eq(noBw.checks.cap, undefined);
    eq(tvsCheck(esd).cap, null);
    eq(tvsCheck({ ...esd, cPf: NaN, z0: 50, bwHz: 1e9 }).cap, null);
  }],

  ['protection: TVS input that cannot be calculated', () => {
    // V_C at or below V_BR: no dynamic resistance (a snapback part, or the fields are swapped).
    eq(tvsCheck({ ...esd, vC: 16.7 }).ok, false);
    eq(tvsCheck({ ...esd, vC: 16.7 }).errors[0], 'pr_vcLow');
    eq(tvsCheck({ ...esd, vC: 12 }).errors[0], 'pr_vcLow');
    for (const bad of [{ vBr: 0 }, { vC: -5 }, { iPp: 0 }, { vAbs: NaN }, { vLine: undefined }, { vRwm: Infinity }, { esdKv: 0 }, { event: 'burst' }]) {
      const r = tvsCheck({ ...esd, ...bad });
      eq(r.ok, false, JSON.stringify(bad));
      eq(r.errors[0], 'pr_positive');
    }
    eq(tvsCheck({ ...surge, zS: 0 }).errors[0], 'pr_positive');
    eq(tvsCheck({ ...surge, vOc: -1000 }).errors[0], 'pr_positive');
    eq(tvsCheck({ ...tvs, event: 'custom' }).errors[0], 'pr_positive');
    // Absurd but finite numbers still give finite results.
    const big = tvsCheck({ ...esd, esdKv: 1e6, lNh: 1e6 });
    ok(big.ok && Number.isFinite(big.vFirst), 'finite');
    eq(tvsCheck({ ...esd, vC: 1e308, iPp: 1e-300 }).errors[0], 'pr_range');
  }],

  ['protection: minimum fuse rating', () => {
    const r = fuseCheck(fuse);
    eq(r.ok, true);
    // I_n,min = 2 / (0.75 · 1) = 2.666667 A; the 3 A fuse runs at 2/3 = 66.67 % of its rating (75 % allowed).
    near(r.iNMin, 2.666667, 1e-6);
    near(r.load, 0.666667, 1e-5);
    near(r.loadLimit, 0.75, 1e-12);
    eq(r.checks.rate, 'ok');
    // 1.5 A at a temperature where the curve gives 80 %: 1.5 / (0.75 · 0.8) = 2.5 A
    near(fuseCheck({ ...fuse, iOp: 1.5, kT: 0.8 }).iNMin, 2.5, 1e-12);
    // A fuse specified to carry 100 %: 2 / (1 · 1) = 2 A, and a 2 A fuse passes exactly.
    const iec = fuseCheck({ ...fuse, derate: 1, iN: 2 });
    near(iec.iNMin, 2, 1e-12);
    eq(iec.checks.rate, 'ok');
    // 2.5 A is below 2.667 A.
    const small = fuseCheck({ ...fuse, iN: 2.5 });
    eq(small.checks.rate, 'bad');
    eq(small.pass, false);
  }],

  ['protection: I²t of each pulse shape', () => {
    // I_p = 10 A, t = 2 ms: I_p²·t = 100 · 0.002 = 0.2 A²s
    eq(PULSE_SHAPE_K.rect, 1);
    near(pulseI2t('rect', 10, 2e-3), 0.2, 1e-12);
    near(pulseI2t('tri', 10, 2e-3), 0.2 / 3, 1e-12); // 0.066667 A²s
    near(pulseI2t('sine', 10, 2e-3), 0.1, 1e-12);
    near(pulseI2t('exp', 10, 2e-3), 0.1, 1e-12); // τ = 2 ms
    ok(Number.isNaN(pulseI2t('square', 10, 2e-3)), 'unknown shape');
    // The closed forms against a numerical integral of i(t)².
    const integral = (i, tEnd, n = 20000) => {
      let s = 0;
      for (let k = 0; k < n; k++) { const x = i(((k + 0.5) * tEnd) / n); s += x * x; }
      return (s * tEnd) / n;
    };
    const T = 2e-3;
    near(integral((t) => 10 * (1 - t / T), T), pulseI2t('tri', 10, T), 1e-6, 'sawtooth');
    near(integral((t) => 10 * (1 - Math.abs(2 * t / T - 1)), T), pulseI2t('tri', 10, T), 1e-6, 'triangle');
    near(integral((t) => 10 * Math.sin((Math.PI * t) / T), T), pulseI2t('sine', 10, T), 1e-6, 'half sine');
    near(integral((t) => 10 * Math.exp(-t / T), 40 * T, 400000), pulseI2t('exp', 10, T), 1e-6, 'exponential decay');
    // In the fuse check: 20 A, τ = 0.5 ms → 400 · 0.0005 / 2 = 0.1 A²s
    near(fuseCheck(fuse).i2tPulse, 0.1, 1e-12);
    near(fuseCheck({ ...fuse, shape: 'rect' }).i2tPulse, 0.2, 1e-12);
    near(fuseCheck({ ...fuse, shape: 'tri' }).i2tPulse, 0.2 / 3, 1e-12);
    near(fuseCheck({ ...fuse, shape: 'sine' }).i2tPulse, 0.1, 1e-12);
  }],

  ['protection: melting I²t needed for the number of pulses', () => {
    // 0.1 A²s per pulse. 100 000 pulses, 22 %: 0.1 / 0.22 = 0.454545 A²s; the pulse uses 0.1 / 1.5 = 6.67 % of 1.5 A²s.
    const r = fuseCheck(fuse);
    near(r.i2tReq, 0.454545, 1e-5);
    near(r.pulseUse, 0.066667, 1e-5);
    eq(r.checks.i2t, 'ok');
    // 10 000: 0.1 / 0.29 = 0.344828; 1 000: 0.1 / 0.38 = 0.263158; 100: 0.1 / 0.48 = 0.208333
    eq(PULSE_FACTOR[100000], 0.22);
    near(fuseCheck({ ...fuse, pulseFactor: PULSE_FACTOR[10000] }).i2tReq, 0.344828, 1e-5);
    near(fuseCheck({ ...fuse, pulseFactor: PULSE_FACTOR[1000] }).i2tReq, 0.263158, 1e-5);
    near(fuseCheck({ ...fuse, pulseFactor: PULSE_FACTOR[100] }).i2tReq, 0.208333, 1e-5);
    // The number of pulses selects the factor; an own factor replaces it.
    const byCount = fuseCheck({ ...fuse, pulseFactor: undefined, pulses: 1000 });
    eq(byCount.pulses, 1000);
    eq(byCount.pulseFactor, 0.38);
    near(byCount.i2tReq, 0.263158, 1e-5);
    const own = fuseCheck({ ...fuse, pulseFactor: 0.25, pulses: 1000 });
    eq(own.pulses, null);
    near(own.i2tReq, 0.4, 1e-12); // 0.1 / 0.25
    eq(fuseCheck({ ...fuse, pulseFactor: undefined, pulses: 500 }).errors[0], 'pr_positive', 'no factor for 500 pulses');
    // A fast fuse with 0.4 A²s is below 0.4545 A²s.
    const fast = fuseCheck({ ...fuse, i2tMelt: 0.4 });
    eq(fast.checks.i2t, 'bad');
    eq(fast.pass, false);
    // No inrush pulse: nothing to check.
    for (const iPulse of [0, undefined]) {
      const none = fuseCheck({ ...fuse, iPulse });
      eq(none.ok, true);
      eq(none.hasPulse, false);
      eq(none.checks.i2t, undefined);
      eq(none.total, 4);
    }
  }],

  ['protection: fuse voltage rating, breaking capacity and fault current', () => {
    const r = fuseCheck(fuse);
    // 20 A / 3 A = 6.67 times the rating.
    near(r.faultRatio, 6.666667, 1e-6);
    eq(FUSE_OPEN_RATIO, 2);
    eq(r.checks.volt, 'ok');
    eq(r.checks.brk, 'ok');
    eq(r.checks.opens, 'ok');
    eq(r.total, 5);
    eq(r.failed, 0);
    eq(r.warned, 0);
    eq(r.pass, true);
    // From the loop resistance: 5 V / 0.15 Ω = 33.3333 A → 11.11 times the rating.
    const loop = fuseCheck({ ...fuse, faultFromR: true, rLoop: 0.15, iFault: undefined });
    near(loop.iFault, 33.33333, 1e-6);
    near(loop.faultRatio, 11.11111, 1e-6);
    eq(loop.rLoop, 0.15);
    // 48 V on a 32 V fuse; 60 A against 50 A breaking capacity.
    eq(fuseCheck({ ...fuse, vCircuit: 48 }).checks.volt, 'bad');
    eq(fuseCheck({ ...fuse, iFault: 60 }).checks.brk, 'bad');
    eq(fuseCheck({ ...fuse, iFault: 50 }).checks.brk, 'ok');
    // Fault current against the rating: 6 A = 2 × 3 A passes, 5 A (1.67 ×) is slow, 3 A never opens the fuse.
    eq(fuseCheck({ ...fuse, iFault: 6 }).checks.opens, 'ok');
    const slow = fuseCheck({ ...fuse, iFault: 5 });
    eq(slow.checks.opens, 'warn');
    eq(slow.warned, 1);
    eq(slow.pass, true, 'a warning is not a failure');
    eq(fuseCheck({ ...fuse, iFault: 3 }).checks.opens, 'bad');
    const two = fuseCheck({ ...fuse, iN: 2.5, i2tMelt: 0.4 });
    eq(two.failed, 2);
  }],

  ['protection: fuse input that cannot be calculated', () => {
    for (const bad of [{ iOp: 0 }, { kT: 0 }, { derate: 0 }, { derate: 1.2 }, { iN: -3 }, { i2tMelt: NaN }, { vCircuit: 0 }, { iFault: 0 },
      { iPulse: -1 }, { tPulse: 0 }, { pulseFactor: 0 }, { pulseFactor: 1.5 }, { shape: 'saw' }]) {
      const r = fuseCheck({ ...fuse, ...bad });
      eq(r.ok, false, JSON.stringify(bad));
      eq(r.errors[0], 'pr_positive');
    }
    eq(fuseCheck({ ...fuse, faultFromR: true, rLoop: 0 }).errors[0], 'pr_positive');
    eq(fuseCheck({ ...fuse, iPulse: 1e200 }).errors[0], 'pr_range');
  }],

  ['protection: PTC hold and trip current at temperature', () => {
    const r = ptcCheck(ptc);
    eq(r.ok, true);
    near(r.iHoldT, 2.6, 1e-12);
    near(r.iTripT, 5, 1e-12);
    // 2 A of 2.6 A: 76.92 % in use, 30 % of room; fault 20 A = 4 × I_trip.
    near(r.holdUse, 0.769231, 1e-6);
    near(r.holdMargin, 0.3, 1e-9);
    near(r.tripRatio, 4, 1e-12);
    eq(r.opZone, 'hold');
    eq(r.faultZone, 'trip');
    eq(r.checks.hold, 'ok');
    eq(r.checks.trip, 'ok');
    eq(r.checks.imax, 'ok');
    eq(r.checks.vmax, 'ok');
    eq(r.pass, true);
    // Hot, 60 % of the 25 °C values: 1.56 A hold, 3 A trip. 2 A is now in the band between them.
    const hot = ptcCheck({ ...ptc, kTemp: 0.6 });
    near(hot.iHoldT, 1.56, 1e-12);
    near(hot.iTripT, 3, 1e-12);
    near(hot.holdMargin, -0.22, 1e-9);
    eq(hot.opZone, 'band');
    eq(hot.checks.hold, 'bad');
    eq(hot.pass, false);
    // 35 %: 0.91 A and 1.75 A, the operating current is above the trip current.
    eq(ptcCheck({ ...ptc, kTemp: 0.35 }).opZone, 'trip');
    // Cold, 130 %: 3.38 A and 6.5 A.
    near(ptcCheck({ ...ptc, kTemp: 1.3 }).iTripT, 6.5, 1e-12);
    // Exactly on the hold current is still held.
    eq(ptcCheck({ ...ptc, iOp: 2.6 }).checks.hold, 'ok');
  }],

  ['protection: PTC fault current, voltage and maximum current', () => {
    // A fault of 4 A lies between 2.6 A and 5 A: may or may not trip. 2 A never trips it.
    const band = ptcCheck({ ...ptc, iFault: 4 });
    eq(band.faultZone, 'band');
    eq(band.checks.trip, 'bad');
    near(band.tripRatio, 0.8, 1e-12);
    eq(ptcCheck({ ...ptc, iFault: 2 }).faultZone, 'hold');
    eq(ptcCheck({ ...ptc, iFault: 5 }).checks.trip, 'bad', 'the fault current has to be above I_trip');
    eq(ptcCheck({ ...ptc, iFault: 5.01 }).checks.trip, 'ok');
    // 150 A against I_max = 100 A; 12 V against V_max = 6 V.
    eq(ptcCheck({ ...ptc, iFault: 150 }).checks.imax, 'bad');
    eq(ptcCheck({ ...ptc, iFault: 100 }).checks.imax, 'ok');
    eq(ptcCheck({ ...ptc, vCircuit: 12 }).checks.vmax, 'bad');
    // From the loop resistance: 5 V / 0.1 Ω = 50 A = 10 × I_trip.
    const loop = ptcCheck({ ...ptc, faultFromR: true, rLoop: 0.1, iFault: undefined });
    near(loop.iFault, 50, 1e-12);
    near(loop.tripRatio, 10, 1e-12);
  }],

  ['protection: PTC drop, loss and the current left when tripped', () => {
    const r = ptcCheck(ptc);
    // 2 A · 47 mΩ = 94 mV (1.88 % of 5 V); 2² · 0.047 = 188 mW; tripped: 0.8 W / 5 V = 160 mA
    near(r.vDrop, 0.094, 1e-12);
    near(r.vDropShare, 0.0188, 1e-12);
    near(r.pLoss, 0.188, 1e-12);
    near(r.iTripped, 0.16, 1e-12);
    // At 12 V the same 0.8 W needs 66.67 mA.
    near(ptcCheck({ ...ptc, vCircuit: 12, vMax: 16 }).iTripped, 0.0666667, 1e-6);
    // Input that cannot be calculated.
    eq(ptcCheck({ ...ptc, iTrip: 2.6 }).errors[0], 'pr_tripLow');
    eq(ptcCheck({ ...ptc, iTrip: 2 }).errors[0], 'pr_tripLow');
    for (const bad of [{ iOp: 0 }, { kTemp: 0 }, { iHold: -1 }, { vMax: NaN }, { iMax: 0 }, { r1Max: 0 }, { pD: undefined }, { iFault: 0 }]) {
      eq(ptcCheck({ ...ptc, ...bad }).errors?.[0], 'pr_positive', JSON.stringify(bad));
    }
  }],

  ['protection: reverse polarity, Schottky against P-MOSFET', () => {
    const r = reversePolarity(rev);
    eq(r.ok, true);
    // Input power 12 V · 2 A = 24 W.
    near(r.pIn, 24, 1e-12);
    // Diode: 0.45 V · 2 A = 0.9 W = 3.75 % of 24 W; T_j = 25 + 0.9·60 = 79 °C; 11.55 V at the load.
    near(r.diode.vDrop, 0.45, 1e-12);
    near(r.diode.p, 0.9, 1e-12);
    near(r.diode.share, 0.0375, 1e-12);
    near(r.diode.tj, 79, 1e-12);
    near(r.diode.vOut, 11.55, 1e-12);
    // MOSFET: 2 A · 20 mΩ = 40 mV; 2² · 0.02 = 80 mW = 0.3333 %; T_j = 25 + 0.08·50 = 29 °C; 11.96 V at the load.
    near(r.fet.vDrop, 0.04, 1e-12);
    near(r.fet.p, 0.08, 1e-12);
    near(r.fet.share, 0.00333333, 1e-5);
    near(r.fet.tj, 29, 1e-12);
    near(r.fet.vOut, 11.96, 1e-12);
    // 0.9 − 0.08 = 0.82 W saved, 91.11 % of the diode loss.
    near(r.saved, 0.82, 1e-12);
    near(r.savedShare, 0.911111, 1e-6);
    // Gate: the full 12 V, above the 10 V of the R_DS(on) rating and below the 20 V limit.
    eq(r.vGs, 12);
    eq(r.zener, false);
    eq(r.iZ, 0);
    eq(r.zenerNeeded, false);
    eq(r.checks.drive, 'ok');
    eq(r.checks.vgs, 'ok');
    eq(r.checks.tjd, 'ok');
    eq(r.checks.tjm, 'ok');
    eq(r.fetOk, true);
  }],

  ['protection: gate drive below the threshold and below the R_DS(on) rating', () => {
    // 2.5 V supply, threshold up to 3 V: the MOSFET may not turn on at all.
    const off = reversePolarity({ ...rev, vIn: 2.5 });
    eq(off.vGs, 2.5);
    eq(off.checks.drive, 'bad');
    eq(off.fetOk, false);
    eq(reversePolarity({ ...rev, vIn: 3 }).checks.drive, 'bad', 'at the threshold');
    // 5 V supply: above the threshold, below the 10 V at which 20 mΩ is specified.
    const weak = reversePolarity({ ...rev, vIn: 5 });
    eq(weak.checks.drive, 'warn');
    eq(weak.fetOk, true);
    // A logic-level part specified at 4.5 V is fine at 5 V.
    eq(reversePolarity({ ...rev, vIn: 5, vGsRds: 4.5, vGsTh: 2 }).checks.drive, 'ok');
    eq(reversePolarity({ ...rev, vIn: 10 }).checks.drive, 'ok', 'exactly the rated gate voltage');
  }],

  ['protection: supply above the gate rating, zener clamp and its current', () => {
    // 24 V on a ±20 V gate without a clamp.
    const bare = reversePolarity({ ...rev, vIn: 24 });
    eq(bare.vGs, 24);
    eq(bare.checks.vgs, 'bad');
    eq(bare.zenerNeeded, true);
    eq(bare.fetOk, false);
    // With a 12 V zener and 100 kΩ: |V_GS| = 12 V, I_Z = (24 − 12) / 100 kΩ = 120 µA.
    const z = reversePolarity({ ...rev, vIn: 24, zener: true, vZ: 12, rGate: 100e3 });
    eq(z.vGs, 12);
    eq(z.zenerActive, true);
    near(z.iZ, 120e-6, 1e-12);
    eq(z.checks.vgs, 'ok');
    eq(z.checks.drive, 'ok');
    eq(z.zenerNeeded, true);
    // 24 V · 2 A = 48 W: the diode share is 0.9 / 48 = 1.875 %, the MOSFET 0.08 / 48 = 0.1667 %.
    near(z.diode.share, 0.01875, 1e-12);
    near(z.fet.share, 0.00166667, 1e-5);
    // 60 V, 10 kΩ: (60 − 12) / 10 kΩ = 4.8 mA.
    near(reversePolarity({ ...rev, vIn: 60, zener: true, vZ: 12, rGate: 10e3 }).iZ, 4.8e-3, 1e-12);
    // Below the zener voltage it does not conduct: 9 V supply, the gate sees 9 V (under the 10 V rating).
    const idle = reversePolarity({ ...rev, vIn: 9, zener: true, vZ: 12, rGate: 100e3 });
    eq(idle.vGs, 9);
    eq(idle.zenerActive, false);
    eq(idle.iZ, 0);
    eq(idle.checks.drive, 'warn');
    // A 24 V zener on a 20 V gate does not protect it at 30 V.
    eq(reversePolarity({ ...rev, vIn: 30, zener: true, vZ: 24, rGate: 100e3 }).checks.vgs, 'bad');
    eq(reversePolarity({ ...rev, vIn: 24, zener: true, vZ: 12 }).errors[0], 'pr_positive', 'a zener needs its resistor');
  }],

  ['protection: junction temperatures and a MOSFET that loses more than the diode', () => {
    // 10 A: diode 0.55 V · 10 A = 5.5 W → 25 + 5.5·60 = 355 °C; MOSFET 100 · 0.02 = 2 W → 25 + 2·50 = 125 °C (on the limit).
    const hot = reversePolarity({ ...rev, iLoad: 10, vF: 0.55 });
    near(hot.diode.tj, 355, 1e-12);
    near(hot.fet.tj, 125, 1e-12);
    eq(hot.checks.tjd, 'bad');
    eq(hot.checks.tjm, 'ok');
    eq(hot.diodeOk, false);
    eq(reversePolarity({ ...rev, iLoad: 10, vF: 0.55, tjMaxC: 124 }).checks.tjm, 'bad');
    // Ambient below zero: −20 + 0.9·60 = 34 °C.
    near(reversePolarity({ ...rev, ambientC: -20 }).diode.tj, 34, 1e-12);
    // 0.5 Ω at 2 A: 2 W against 0.9 W in the diode: −1.1 W "saved".
    const worse = reversePolarity({ ...rev, rDsOn: 0.5 });
    near(worse.fet.p, 2, 1e-12);
    near(worse.saved, -1.1, 1e-12);
  }],

  ['protection: reverse-polarity input that cannot be calculated', () => {
    // A drop as large as the supply leaves nothing for the load.
    eq(reversePolarity({ ...rev, vF: 12 }).errors[0], 'pr_dropHigh');
    eq(reversePolarity({ ...rev, rDsOn: 10 }).errors[0], 'pr_dropHigh');
    for (const bad of [{ vIn: 0 }, { iLoad: -2 }, { vF: 0 }, { rDsOn: NaN }, { vGsRds: 0 }, { vGsTh: 0 }, { vGsMax: undefined },
      { thetaDiode: 0 }, { thetaFet: -1 }, { ambientC: NaN }, { tjMaxC: Infinity }]) {
      const r = reversePolarity({ ...rev, ...bad });
      eq(r.ok, false, JSON.stringify(bad));
      eq(r.errors[0], 'pr_positive');
    }
  }],
];
