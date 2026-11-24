// Circuit tools, part 2: I²C pull-up, transistor switch, op amp and
// Sallen-Key filters, NTC thermistor, current-sense shunt and ADC resolution.
// Reference values are worked out by hand in the comments next to each assertion.

import { near, eq, ok } from '../assert.js';
import { RISE_K, busCapacitance, lowLevel, i2cPullup, riseTime } from '../../src/engine/i2c.js';
import { loadCurrent, bjtSwitch, mosfetSwitch } from '../../src/engine/transistor.js';
import {
  stageGain, ratioFor, bestRatioPair, closedLoop, chebyshevQ, RESPONSES, cutoffRatio,
  sallenKeyLowPass, sallenKeyHighPass, sallenKeyMag, stageMag,
} from '../../src/engine/opamp.js';
import { K0, betaR, betaT, shT, shR, shFit, betaBetween, bestSeries, ntcPoint, maxDissipation } from '../../src/engine/ntc.js';
import { shuntBelow, derateFactor, shuntRating, shuntDesign } from '../../src/engine/shunt.js';
import { adcBasics, enobFromSinad, averaging, adcCode } from '../../src/engine/adc.js';
import i2cPage from '../../src/pages/i2c.js';
import switchPage from '../../src/pages/switch.js';
import opampPage from '../../src/pages/opamp.js';
import ntcPage from '../../src/pages/ntc.js';
import shuntPage from '../../src/pages/shunt.js';
import adcPage from '../../src/pages/adc.js';

/** Default values and units of a page, with overrides (as the form would pass them). */
function pageInputs(page, over = {}) {
  const v = {};
  const u = {};
  for (const f of page.sections.flatMap((s) => s.fields)) {
    if (f.type === 'number') {
      const raw = String(over[f.key] ?? f.default ?? '');
      const m = raw.match(/^([\d.eE+-]+)([pnumkM]?)$/);
      const SI = { p: 1e-12, n: 1e-9, u: 1e-6, m: 1e-3, k: 1e3, M: 1e6 };
      v[f.key] = raw === '' ? NaN : m ? Number(m[1]) * (m[2] ? SI[m[2]] : 1) : NaN;
      u[f.key] = f.unit ?? f.units?.[0];
    } else v[f.key] = String(over[f.key] ?? f.default);
  }
  return [v, u];
}
const run = (page, over) => { const [v, u] = pageInputs(page, over); return page.compute(v, u); };

const I = 1e-3; // mA

export const cases = [
  // ------------------------------------------------------------------ I²C
  ['I²C: rise constant ln(0.7/0.3) = 0.8473 (UM10204 §7.1)', () => {
    // t(0.3) = 0.3566749·RC, t(0.7) = 1.2039729·RC → 0.8472980·RC
    near(RISE_K, 0.847298, 1e-6);
    near(riseTime(1e3, 100e-12), 84.7298e-9, 1e-6);
  }],
  ['I²C: VOL / IOL per UM10204 Table 9', () => {
    // VDD > 2 V: VOL1 = 0.4 V at 3 mA (20 mA Fm+); VDD ≤ 2 V: VOL2 = 0.2·VDD at 2 mA
    let l = lowLevel(3.3, 'fm');
    near(l.vol, 0.4); near(l.iol, 3e-3);
    l = lowLevel(3.3, 'fmp');
    near(l.iol, 20e-3);
    l = lowLevel(1.8, 'fm');
    near(l.vol, 0.36); near(l.iol, 2e-3); ok(l.lowVdd, 'low VDD');
  }],
  ['I²C: Rp(min) = (VDD − VOL)/IOL', () => {
    // Fast 3.3 V: 2.9 V / 3 mA = 966.7 Ω; Fm+ 3.3 V: 2.9 / 20 mA = 145 Ω; Fast 1.8 V: 1.44 / 2 mA = 720 Ω
    near(i2cPullup({ vdd: 3.3, mode: 'fm', cb: 100e-12 }).rpMin, 966.667, 1e-5);
    near(i2cPullup({ vdd: 3.3, mode: 'fmp', cb: 100e-12 }).rpMin, 145, 1e-6);
    near(i2cPullup({ vdd: 1.8, mode: 'fm', cb: 100e-12 }).rpMin, 720, 1e-6);
  }],
  ['I²C: Rp(max) = tr/(0.8473·Cb) and the recommended E24 value', () => {
    // Fast, 100 pF: 300 ns / (0.847298 · 100 pF) = 3540.7 Ω
    const r = i2cPullup({ vdd: 3.3, mode: 'fm', cb: 100e-12, series: 'E24' });
    near(r.rpMaxRise, 3540.66, 1e-4);
    ok(r.windowOk, 'window');
    // Largest E24 ≤ 0.8 · 3540.7 = 2832.5 → 2.7 kΩ; tr = 0.847298 · 2700 · 100 pF = 228.77 ns
    eq(r.rec.r, 2700);
    near(r.rec.tr, 228.77e-9, 1e-4);
    near(r.rec.iSink, 2.9 / 2700, 1e-9);
    ok(!r.tight, 'not tight');
    // Standard, 400 pF: 1 µs / (0.847298 · 400 pF) = 2950.6 Ω
    near(i2cPullup({ vdd: 5, mode: 'sm', cb: 400e-12 }).rpMax, 2950.55, 1e-4);
  }],
  ['I²C: empty window and tight margin', () => {
    // Fast, 1 nF: Rp(max) = 300 ns / 0.847298 nF = 354.1 Ω < Rp(min) 966.7 Ω; Cb > 400 pF
    const r = i2cPullup({ vdd: 3.3, mode: 'fm', cb: 1e-9 });
    ok(!r.windowOk, 'window empty'); eq(r.rec, null); ok(r.cbOver, 'Cb over 400 pF');
    // Fast, 322 pF: Rp(max) = 1099.6 Ω; 0.8× = 879.7 < 966.7, so only 1.0 kΩ fits (tight)
    const s = i2cPullup({ vdd: 3.3, mode: 'fm', cb: 322e-12, series: 'E24' });
    near(s.rpMax, 1099.6, 1e-4); eq(s.rec.r, 1000); ok(s.tight, 'tight');
  }],
  ['I²C: leakage limit Rp ≤ 0.1·VDD / (n·Ii)', () => {
    // 3.3 V, 5 devices × 10 µA = 50 µA → 0.33 V / 50 µA = 6.6 kΩ (below the 11.8 kΩ rise limit at 100 pF, Sm)
    const r = i2cPullup({ vdd: 3.3, mode: 'sm', cb: 100e-12, devices: 5, leak: 10e-6 });
    near(r.rpMaxLeak, 6600, 1e-9);
    near(r.rpMaxRise, 11802.2, 1e-4);
    near(r.rpMax, 6600, 1e-9);
  }],
  ['I²C: bus capacitance from devices, wiring and extras', () => {
    // 4 × 10 pF + 0.2 m × 100 pF/m + 10 pF = 40 + 20 + 10 = 70 pF
    const c = busCapacitance({ devices: 4, pinC: 10e-12, length: 0.2, cPerLength: 100e-12, extra: 10e-12 });
    near(c.cb, 70e-12, 1e-9); near(c.pins, 40e-12, 1e-9); near(c.wiring, 20e-12, 1e-9);
  }],
  ['I²C page: defaults (Fast, 3.3 V, 70 pF) → 3.9 kΩ', () => {
    // Rp(max) = 300 ns / (0.847298 · 70 pF) = 5058.1 Ω; 0.8× = 4046.5 → largest E24 = 3.9 kΩ
    const r = run(i2cPage);
    near(r.cb, 70e-12, 1e-9); near(r.rpMax, 5058.1, 1e-4); eq(r.rec.r, 3900);
    // Your own 1.5 kΩ: inside the window, no warnings about it
    const u = run(i2cPage, { rpu: '1.5k' });
    eq(u.user.r, 1500); ok(!u.warnings.includes('ic_userLow') && !u.warnings.includes('ic_userHigh'), 'user ok');
  }],

  // ------------------------------------------------------------------ Transistor switch
  ['Switch: load current from resistance', () => {
    // BJT: (12 − 0.2) / 120 = 98.33 mA; MOSFET: 12 / (120 + 0.05) = 99.958 mA
    near(loadCurrent({ mode: 'r', rl: 120, vs: 12, drop: 0.2 }), 0.0983333, 1e-6);
    near(loadCurrent({ mode: 'r', rl: 120, vs: 12, rOn: 0.05 }), 0.0999584, 1e-6);
    near(loadCurrent({ mode: 'i', i: 0.05, vs: 12 }), 0.05, 1e-12);
  }],
  ['Switch: BJT base resistor with forced β = 10', () => {
    // Ib = 100 mA / 10 = 10 mA; Rb = (3.3 − 0.8) / 10 mA = 250 Ω → E24 below: 240 Ω
    // I = 2.5 / 240 = 10.417 mA, β = 0.1 / 0.010417 = 9.6; P = 0.2·0.1 + 0.8·0.010417 = 28.33 mW
    const r = bjtSwitch({ ic: 0.1, vdrive: 3.3, vbe: 0.8, vce: 0.2, hfe: 100, betaF: 10, series: 'E24' });
    near(r.rbExact, 250, 1e-9); eq(r.rb, 240);
    near(r.ibStd, 10.41667e-3, 1e-5); near(r.betaStd, 9.6, 1e-6);
    near(r.pTotal, 0.0283333, 1e-5);
  }],
  ['Switch: BJT with base–emitter resistor', () => {
    // I_Rbe = 0.8 / 10 k = 80 µA; Rb = 2.5 / (10 mA + 80 µA) = 248.0 Ω → 240 Ω; Ib = 10.417 − 0.08 = 10.337 mA
    const r = bjtSwitch({ ic: 0.1, vdrive: 3.3, vbe: 0.8, vce: 0.2, hfe: 100, betaF: 10, rbe: 10e3, series: 'E24' });
    near(r.rbExact, 248.016, 1e-5); eq(r.rb, 240); near(r.ibStd, 10.33667e-3, 1e-5);
    const bad = bjtSwitch({ ic: 0.1, vdrive: 0.7, vbe: 0.8, vce: 0.2, hfe: 100, betaF: 10 });
    ok(!bad.ok && bad.errors[0] === 'sw_driveLow', 'drive below Vbe');
  }],
  ['Switch: MOSFET conduction loss and gate-charge turn-on time', () => {
    // P = 0.1² · 0.05 = 0.5 mW (×1.5 hot = 0.75 mW); Vds = 5 mV
    // Ig = min(20 mA, (3.3 − 2) / 100 Ω = 13 mA) → t = 6 nC / 13 mA = 461.5 ns
    // Vgs = 3.3 · 100 k / 100.1 k = 3.2967 V; Rgs current 3.3 / 100.1 k = 32.97 µA
    // 20 kHz: Pg = 6 nC · 3.3 V · 20 kHz = 396 µW, Ig,avg = 120 µA, t_on/T = 461.5 ns · 20 kHz = 0.923 %
    const r = mosfetSwitch({ id: 0.1, vdrive: 3.3, rds: 0.05, vgsSpec: 2.5, vth: 1.5, qg: 6e-9, vpl: 2, rg: 100, idrv: 20e-3, rpd: 100e3, fsw: 20e3 });
    near(r.pCond, 0.5e-3, 1e-9); near(r.pCondHot, 0.75e-3, 1e-9); near(r.vds, 5e-3, 1e-9);
    near(r.ig, 13e-3, 1e-9); eq(r.limitedBy, 'rg'); near(r.tOn, 461.538e-9, 1e-5);
    near(r.vgs, 3.296703, 1e-6); ok(r.vgsOk, 'Vgs ≥ spec');
    near(r.iPd, 32.967e-6, 1e-4);
    near(r.pGate, 396e-6, 1e-6); near(r.iGateAvg, 120e-6, 1e-6); near(r.dutyOfPeriod, 0.00923077, 1e-5);
  }],
  ['Switch: MOSFET drive checks', () => {
    const base = { id: 0.1, rds: 0.05, vth: 1.5, qg: 6e-9, vpl: 2, rg: 100, idrv: 20e-3 };
    // 3.3 V drive on a part rated at 4.5 V: Rds(on) not guaranteed
    ok(!mosfetSwitch({ ...base, vdrive: 3.3, vgsSpec: 4.5 }).vgsOk, 'Vgs below spec');
    // Drive below the 3.5 V plateau: never fully on
    const p = mosfetSwitch({ ...base, vdrive: 3.3, vgsSpec: 2.5, vpl: 3.5 });
    ok(!p.plateauOk && p.tOn === Infinity, 'plateau');
    // No Rg: the driver current sets Ig = 20 mA → 6 nC / 20 mA = 300 ns
    const d = mosfetSwitch({ ...base, rg: 0, vdrive: 5, vgsSpec: 4.5 });
    near(d.tOn, 300e-9, 1e-9); eq(d.limitedBy, 'driver');
  }],
  ['Switch page: defaults (BJT, 50 mA, 3.3 V) → Rb 470 Ω', () => {
    // Ib = 50 mA / 10 = 5 mA; Rb = 2.5 V / 5 mA = 500 Ω → E24 below 470 Ω
    const r = run(switchPage);
    eq(r.rb, 470); ok(r.warnings.length === 0, `no warnings: ${r.warnings}`);
    const m = run(switchPage, { dev: 'mos' });
    near(m.id, 0.05, 1e-12); near(m.pCond, 0.05 * 0.05 * 0.05, 1e-9);
  }],

  // ------------------------------------------------------------------ Op amp
  ['Op amp: gain, noise gain and ratio', () => {
    let g = stageGain('inv', 100e3, 10e3); near(g.gain, -10); near(g.noiseGain, 11);
    g = stageGain('noninv', 100e3, 10e3); near(g.gain, 11); near(g.noiseGain, 11);
    g = stageGain('diff', 100e3, 10e3); near(g.gain, 10); near(g.noiseGain, 11);
    near(ratioFor('noninv', 11), 10); near(ratioFor('inv', 10), 10);
  }],
  ['Op amp: closed-loop bandwidth, swing and slew', () => {
    // BW = 1 MHz / 11 = 90.909 kHz; out = 11 · (0.05…0.3) = 0.55…3.3 V within 0.1…4.9 V
    const c = closedLoop({ gain: 11, noiseGain: 11, gbw: 1e6, vinLo: 0.05, vinHi: 0.3, vPos: 5, vNeg: 0, headroom: 0.1, slew: 0.5e6, fSig: 90909.09 });
    near(c.bw, 90909.09, 1e-6); near(c.outLo, 0.55, 1e-9); near(c.outHi, 3.3, 1e-9);
    ok(!c.clipLo && !c.clipHi, 'no clip');
    // FPBW = 0.5 V/µs / (2π · 1.375 V) = 57.874 kHz
    near(c.fpbw, 57874.3, 1e-5);
    // At f = BW the single-pole gain is 1/√2: −29.29 %
    near(c.gainErrPct, -29.2893, 1e-4);
    // Inverting −10 on a 0…5 V supply with 0…0.2 V in → −2…0 V: clips at the bottom
    const i = closedLoop({ gain: -10, noiseGain: 11, gbw: 1e6, vinLo: 0, vinHi: 0.2, vPos: 5, vNeg: 0, headroom: 0.1 });
    ok(i.clipLo, 'clips below V− + headroom');
  }],
  ['Op amp: best E-series resistor pair', () => {
    // k = 2.2, base 10 k, E12: 22 k / 10 k exactly
    let p = bestRatioPair(2.2, 10e3, 'E12');
    eq(p.rf, 22e3); eq(p.rb, 10e3); near(p.errorPct, 0, 1e-9);
    // Non-inverting G = 4.7 → k = 3.7, E24, Rb in 3.16 k…31.6 k: best is 100 k / 27 k = 3.7037 (+0.10 %)
    p = bestRatioPair(3.7, 10e3, 'E24');
    eq(p.rf, 100e3); eq(p.rb, 27e3); near(p.errorPct, 0.1001, 1e-3);
  }],
  ['Op amp: closed-loop magnitude with a single-pole op amp', () => {
    // G = 11 at f = GBW/11: |H| = 11 / |1 + 11/A| ≈ 11/√2 = 7.778
    near(stageMag(1e6 / 11, { gain: 11, noiseGain: 11 }, 1e6), 7.7782, 1e-3);
    near(stageMag(10, { gain: 11, noiseGain: 11 }, 1e6), 11, 1e-3);
  }],
  ['Filters: section Q and −3 dB ratio match the Op Amps for Everyone tables', () => {
    // Butterworth 1/√2, Bessel 1/√3; Chebyshev 0.5 dB / 1 dB second order: Q = 0.8637 / 0.9565
    near(RESPONSES.butter, 0.707107, 1e-6); near(RESPONSES.bessel, 0.577350, 1e-6);
    near(chebyshevQ(0.5), 0.86372, 1e-4); near(chebyshevQ(1), 0.95651, 1e-4);
    // x² = fc²/f0² equals the tabulated b1: Bessel 0.6180, Cheb 0.5 dB 1.3827, Cheb 1 dB 1.5515; Butterworth 1
    near(cutoffRatio(RESPONSES.butter), 1, 1e-9);
    near(cutoffRatio(RESPONSES.bessel) ** 2, 0.6180, 1e-3);
    near(cutoffRatio(RESPONSES.cheb05) ** 2, 1.3827, 1e-3);
    near(cutoffRatio(RESPONSES.cheb1) ** 2, 1.5515, 1e-3);
  }],
  ['Filters: Sallen-Key low-pass 1 kHz Butterworth, C2 = 10 nF', () => {
    // C1 ≥ 4Q²·C2 = 20 nF → 22 nF (E12). a = 1/(ω0·Q·C2) = 22508, b = 1/(ω0²·C1·C2) = 1.1514e8
    // R1,2 = (a ± √(a² − 4b))/2 = 14.65 k, 7.861 k. Of 13/15 k × 7.5/8.2 k, 15 k / 7.5 k is closest:
    // f0 = 1/(2π·√(15k·7.5k·22n·10n)) = 1011.66 Hz, Q = √(…)/(10n·22.5k) = 0.69921, fc = f0·0.98870 = 1000.2 Hz
    const d = sallenKeyLowPass({ fc: 1000, q: RESPONSES.butter, c2: 10e-9, capSeries: 'E12', resSeries: 'E24' });
    near(d.c1, 22e-9, 1e-9);
    near(d.r1Exact, 14647, 1e-3); near(d.r2Exact, 7860.8, 1e-3);
    eq(d.r1, 15e3); eq(d.r2, 7.5e3);
    near(d.f0, 1011.66, 1e-4); near(d.q, 0.69921, 1e-4); near(d.fc, 1000.2, 1e-3);
    // Ideal op amp: |H(fc)| = 1/√2 and |H| → 1 at low frequency
    near(sallenKeyMag(d.fc, d, Infinity), Math.SQRT1_2, 1e-6);
    near(sallenKeyMag(1, d, 1e6), 1, 1e-3);
  }],
  ['Filters: Sallen-Key high-pass 1 kHz Butterworth, C = 10 nF', () => {
    // R1 = 1/(2Q·ω0·C) = 11.254 k, R2 = 2Q/(ω0·C) = 22.508 k → 11 k / 22 k (keeps Q = 0.7071)
    // f0 = 1/(2π·10n·√(11k·22k)) = 1023.09 Hz
    const d = sallenKeyHighPass({ fc: 1000, q: RESPONSES.butter, c: 10e-9, resSeries: 'E24' });
    near(d.r1Exact, 11253.95, 1e-5); near(d.r2Exact, 22507.9, 1e-5);
    eq(d.r1, 11e3); eq(d.r2, 22e3);
    near(d.f0, 1023.09, 1e-4); near(d.q, Math.SQRT1_2, 1e-6); near(d.fc, 1023.09, 1e-4);
    near(sallenKeyMag(d.fc, d, Infinity), Math.SQRT1_2, 1e-6);
    near(sallenKeyMag(100 * d.fc, d, Infinity), 1, 1e-3);
  }],
  ['Op-amp page: defaults (non-inverting 100 k / 10 k) and filter mode', () => {
    const r = run(opampPage);
    near(r.gain, 11); near(r.bw, 90909.09, 1e-6); eq(r.warnings.length, 0);
    const f = run(opampPage, { circ: 'sklp' });
    eq(f.d.r1, 15e3); eq(f.d.r2, 7.5e3);
    const g = run(opampPage, { circ: 'noninv', calc: 'des', g: 1 });
    ok(!g.ok && g.errors[0] === 'oa_gainLow', 'G = 1 needs a follower');
  }],

  // ------------------------------------------------------------------ NTC
  ['NTC: Beta model and inverse', () => {
    // 10 k, B 3950 at 50 °C: exp(3950 · (1/323.15 − 1/298.15)) = exp(−1.024938) = 0.358818 → 3588.2 Ω
    near(betaR(323.15, 1e4, 3950), 3588.2, 1e-4);
    near(betaT(3588.18, 1e4, 3950), 323.15, 1e-5);
    // 0 °C: exp(1.212555) = 3.36184 → 33.618 kΩ; 100 °C: exp(−2.662810) = 0.069749 → 697.49 Ω
    near(betaR(273.15, 1e4, 3950), 33618.4, 1e-4);
    near(betaR(373.15, 1e4, 3950), 697.49, 1e-4);
  }],
  ['NTC: Steinhart–Hart (classic 10 k coefficients)', () => {
    const c = { a: 1.129148e-3, b: 2.34125e-4, c: 8.76741e-8 };
    // ln 10 k = 9.21034: A + B·L + C·L³ = 1.129148e-3 + 2.156370e-3 + 6.8502e-5 = 3.354020e-3 → 298.150 K
    near(shT(1e4, c), 298.15, 1e-5);
    near(shR(298.15, c), 1e4, 2e-4);
    // Round trip at 85 °C
    near(shT(shR(358.15, c), c), 358.15, 1e-9);
  }],
  ['NTC: three-point Steinhart–Hart fit', () => {
    const c = { a: 1.129148e-3, b: 2.34125e-4, c: 8.76741e-8 };
    const pts = [273.15, 298.15, 358.15].map((tK) => [tK, shR(tK, c)]);
    const f = shFit(...pts);
    near(f.a, c.a, 1e-6); near(f.b, c.b, 1e-6); near(f.c, c.c, 1e-4);
    // Points from a pure Beta curve give C ≈ 0 and B = 1/3950
    const g = shFit(...[273.15, 298.15, 373.15].map((tK) => [tK, betaR(tK, 1e4, 3950)]));
    near(g.b, 1 / 3950, 1e-6); ok(Math.abs(g.c) < 1e-12, 'C ≈ 0');
    near(shR(323.15, g), 3588.2, 1e-4);
    eq(shFit([273, 1e4], [273, 1e4], [300, 5e3]), null);
  }],
  ['NTC: divider, resolution and self-heating at 25 °C', () => {
    // Rs = √(33618.4 · 697.49) = 4842.4 Ω for 0…100 °C
    near(bestSeries(33618.4, 697.49), 4842.4, 1e-4);
    near(betaBetween(273.15, 33618.4, 373.15, 697.49), 3950, 1e-4);
    // NTC on top, Rs = R = 10 k, 3.3 V: Vout = 1.65 V, code round(1.65 / 805.66 µV) = 2048
    // dR/dT = −B·R/T² = −444.35 Ω/K → dV/dT = 3.3·10k/(20k)² · 444.35 = 36.66 mV/K → 805.66 µV / 36.66 mV = 0.02198 °C/LSB
    // P = (3.3/20k)² · 10k = 272.25 µW → ΔT = 0.272 K at δ = 1 mW/K
    const p = ntcPoint({ rOf: (tK) => betaR(tK, 1e4, 3950), tK: 298.15, rs: 1e4, vref: 3.3, top: true, bits: 12, delta: 1e-3 });
    near(p.vout, 1.65, 1e-9); eq(p.code, 2048);
    near(p.slope, 0.036659, 1e-4); near(p.degPerLsb, 0.021977, 1e-4);
    near(p.p, 272.25e-6, 1e-6); near(p.selfHeat, 0.27225, 1e-6);
    // Largest power where R = Rs: Vref² / (4·Rs)
    near(maxDissipation(33618.4, 697.49, 1e4, 3.3), 272.25e-6, 1e-6);
    near(K0, 273.15, 1e-12);
  }],
  ['NTC page: defaults (10 k / 3950, 0…100 °C) suggest Rs = 4.7 kΩ', () => {
    // √(33.618 k · 697.5) = 4842 Ω → nearest E24 4.7 kΩ
    const r = run(ntcPage);
    near(r.rsOpt, 4842.4, 1e-4); eq(r.rs, 4700);
    near(r.pt.r, 1e4, 1e-9);
    const bad = run(ntcPage, { tlo: 50, thi: 20 });
    ok(!bad.ok && bad.errors[0] === 'nt_range', 'range check');
    ok(run(ntcPage, { model: 'fit' }).ok, 'fit defaults');
    ok(run(ntcPage, { model: 'sh' }).ok, 'S-H defaults');
  }],

  // ------------------------------------------------------------------ Shunt
  ['Shunt: common values, derating and rating', () => {
    eq(shuntBelow(0.01), 0.01); eq(shuntBelow(0.0099), 0.0075); eq(shuntBelow(0.0123), 0.01);
    eq(shuntBelow(0.024), 0.02); eq(shuntBelow(0.0026), 0.0025); eq(shuntBelow(0.00049), 0.0004);
    near(derateFactor(70), 1); near(derateFactor(120), 0.5); near(derateFactor(170), 0, 1e-12);
    // 0.25 W with 2× margin at 25 °C → 0.5 W; at 120 °C (×0.5) → 1 W
    eq(shuntRating(0.25, 25), 0.5); eq(shuntRating(0.25, 120), 1); eq(shuntRating(0.25, 175), null);
  }],
  ['Shunt: 5 A, 50 mV, G = 50, 12-bit 3.3 V', () => {
    // R = 50 mV / 5 A = 10 mΩ; P = 25 · 0.01 = 0.25 W; Vamp = 50 · 50 mV = 2.5 V (75.8 % of 3.3 V)
    // I_LSB = 3.3 / (4096 · 50 · 0.01) = 1.6113 mA; I_FS = 3.3 / 0.5 = 6.6 A; code = round(2.5 / 805.66 µV) = 3103
    const p = { imax: 5, sizing: 'vs', vsFs: 0.05, vfs: 3.3, gain: 50, bits: 12, vbus: 12, tAmb: 25, tolPct: 1, tcrPpm: 50, dT: 40, gainErrPct: 0.5, vos: 100e-6 };
    const r = shuntDesign(p);
    near(r.r, 0.01, 1e-12); near(r.p, 0.25, 1e-9); eq(r.rating, 0.5);
    near(r.vAmp, 2.5, 1e-9); near(r.usePct, 75.7576, 1e-5);
    near(r.lsbCurrent, 1.611328e-3, 1e-6); near(r.iFs, 6.6, 1e-9); eq(r.code, 3103);
    near(r.dropPct, 0.416667, 1e-5);
    // Errors at 5 A: tol 1, TCR 50 ppm·40 K = 0.2, gain 0.5, offset 100 µV / 50 mV = 0.2, ½ LSB = 0.0161 %
    // worst case 1.9161 %, RSS √(1 + 0.04 + 0.25 + 0.04 + 0.00026) = 1.1534 %
    near(r.errFull.tcr, 0.2, 1e-9); near(r.errFull.offset, 0.2, 1e-9); near(r.errFull.quant, 0.0161133, 1e-5);
    near(r.errFull.wc, 1.916113, 1e-6); near(r.errFull.rss, 1.153369, 1e-5);
    // At 0.5 A the offset is 2 % and ½ LSB 0.161 %: worst case 3.8611 %, RSS 2.3056 %
    near(r.errLow.wc, 3.861133, 1e-6); near(r.errLow.rss, 2.305638, 1e-5);
  }],
  ['Shunt: sized from the ADC range, user override', () => {
    // R = 3.3 · 0.9 / (50 · 5) = 11.88 mΩ → common value below: 10 mΩ
    const p = { imax: 5, sizing: 'adc', vfs: 3.3, gain: 50, use: 0.9, bits: 12, vbus: 12, tolPct: 1, tcrPpm: 50, dT: 40 };
    const r = shuntDesign(p);
    near(r.rExact, 0.01188, 1e-9); near(r.r, 0.01, 1e-12); ok(!r.userR, 'standard');
    const o = shuntDesign({ ...p, rUser: 0.005 });
    near(o.r, 0.005, 1e-12); ok(o.userR, 'override');
  }],
  ['Shunt page: defaults → 10 mΩ; very small shunts are flagged', () => {
    const r = run(shuntPage);
    near(r.r, 0.01, 1e-12);
    // 500 A at 50 mV → 0.1 mΩ: below 0.5 mΩ, pad and solder resistance matter
    const m = run(shuntPage, { imax: 500 });
    near(m.r, 1e-4, 1e-9); ok(m.warnings.includes('shn_tiny'), 'tiny shunt');
  }],

  // ------------------------------------------------------------------ ADC
  ['ADC: LSB, quantisation noise and ideal SNR', () => {
    // 12 bit, 3.3 V: LSB = 3.3/4096 = 805.66 µV; noise = LSB/√12 = 232.58 µV; SNR = 6.02·12 + 1.76 = 74.00 dB
    const a = adcBasics({ bits: 12, vref: 3.3 });
    near(a.lsb, 805.664e-6, 1e-6); near(a.qNoise, 232.575e-6, 1e-5); near(a.snr, 74.0, 1e-9);
    eq(a.codeMin, 0); eq(a.codeMax, 4095);
    // 16 bit bipolar ±2.5 V: FSR 5 V, LSB 76.294 µV, codes −32768…32767
    const b = adcBasics({ bits: 16, vref: 2.5, bipolar: true });
    near(b.fsr, 5); near(b.lsb, 76.2939e-6, 1e-5); eq(b.codeMin, -32768); eq(b.codeMax, 32767);
  }],
  ['ADC: ENOB from SINAD and averaging gain', () => {
    // (70 − 1.76) / 6.02 = 11.336 bit
    near(enobFromSinad(70), 11.33555, 1e-5);
    // 16 samples: +12.04 dB, +2 bits
    const g = averaging(16);
    near(g.snrGain, 12.0412, 1e-5); near(g.extraBits, 2, 1e-12);
  }],
  ['ADC: ideal codes with ½ LSB transitions', () => {
    const p = { bits: 12, vref: 3.3 };
    // 1 V / 805.66 µV = 1241.2 → 1241; error = 1 − 1241 · 805.66 µV = +171 µV
    const c = adcCode(1, p);
    eq(c.code, 1241); near(c.err, 171.0e-6, 1e-3);
    const lsb = 3.3 / 4096;
    eq(adcCode(0.4 * lsb, p).code, 0); eq(adcCode(0.6 * lsb, p).code, 1);
    const top = adcCode(3.3, p); eq(top.code, 4095); ok(top.clipped, 'clipped at FS');
    eq(adcCode(-2.5, { bits: 16, vref: 2.5, bipolar: true }).code, -32768);
    ok(adcCode(2.5, { bits: 16, vref: 2.5, bipolar: true }).clipped, 'bipolar +FS clips');
  }],
  ['ADC page: divider scaling 24 V with 100 k / 12 k', () => {
    // k = 12/112 = 0.107143; 24 V → 2.5714 V (77.9 % of 3.3 V); resolution 805.66 µV / k = 7.5195 mV
    // R1 ∥ R2 = 10.714 kΩ (> 10 kΩ → source impedance warning); 12 V → 1.2857 V → code 1596
    const r = run(adcPage, { scale: 'div' });
    near(r.k, 0.1071429, 1e-6); near(r.vAdcMax, 2.571429, 1e-6); near(r.resQ, 7.51953e-3, 1e-5);
    near(r.rth, 10714.29, 1e-6); ok(r.warnings.includes('ad_srcZ'), 'source impedance');
    eq(r.x.code, 1596);
    // Sensor: 10 mV/°C, G = 1 → 0.0806 °C per LSB; 25 °C → 250 mV → code round(310.3) = 310
    const s = run(adcPage, { scale: 'gain' });
    near(s.resQ, 0.0805664, 1e-5); eq(s.x.code, 310);
  }],
];
