// MOSFET losses, RC snubber, inrush, battery life and EMC helpers.
// Expected values are worked out by hand in the comments.

import { near, eq, ok } from '../assert.js';
import { alphaFromRatio, rdsAt, gateTiming, mosfetLosses } from '../../src/engine/mosfet.js';
import { parasitics, snubberDesign, stepResponse } from '../../src/engine/snubber.js';
import { rlcStep, hotPlug, softStart, gateRamp, ntcLimiter } from '../../src/engine/inrush.js';
import { averageCurrent, batteryLife } from '../../src/engine/battery.js';
import { fMax, stitching, slot, lcFilter, lcGain, optimumDamping } from '../../src/engine/emc.js';

const TAU = 2 * Math.PI;

// Simple-method MOSFET case shared by two tests.
const simple = {
  v: 48, i: 10, irms: 10 * Math.SQRT1_2, fsw: 1e5, rds25: 0.01, alphaPct: 0,
  sw: 'time', tr: 20e-9, tf: 20e-9, qg: 30e-9, vdrv: 10,
  coss: 400e-12, qrr: 50e-9, tdead: 20e-9, vsd: 0.9, theta: 40, ta: 40, tjMax: 125,
};

export const cases = [
  ['mosfet: Rds(on) temperature model, 1.5× at 125 °C ↔ α = 0.406 %/K', () => {
    // α = 100·(1.5^(1/100) − 1) = 100·(e^(0.0040546) − 1) = 0.40629 %/K
    near(alphaFromRatio(1.5), 0.40629, 1e-4);
    near(rdsAt(0.01, 125, alphaFromRatio(1.5)), 0.015, 1e-9);
    near(rdsAt(0.01, 25, 0.7), 0.01, 1e-12);
    near(rdsAt(0.01, 75, 0.5), 0.01 * 1.005 ** 50, 1e-12); // Graovac form (1 + α/100)^(Tj − 25)
  }],

  ['mosfet: switching intervals from gate charge (SLUP169)', () => {
    const g = gateTiming({ qgs: 8e-9, qgd: 10e-9, vpl: 4.5, vth: 3, vdrv: 10, drive: 'res', rSrc: 2, rSink: 1, rgExt: 3.3, rgInt: 1 });
    near(g.qgs2, 2.6667e-9, 1e-4); // 8 nC·(4.5 − 3)/4.5
    near(g.tri, 2.688e-9, 1e-3); // Ron = 6.3 Ω, IG2 = (10 − 3.75)/6.3 → 2.6667·6.3/6.25 ns
    near(g.tfv, 11.4545e-9, 1e-4); // IG3 = 5.5/6.3 A → 10 nC·6.3/5.5
    near(g.trv, 11.7778e-9, 1e-4); // Roff = 5.3 Ω, IG = 4.5/5.3 A → 10·5.3/4.5
    near(g.tfi, 3.7689e-9, 1e-4); // IG2 = 3.75/5.3 A → 2.6667·5.3/3.75
    const c = gateTiming({ qgs: 8e-9, qgd: 10e-9, vpl: 4.5, vth: 3, vdrv: 10, drive: 'cur', iSrc: 1, iSink: 2 });
    near(c.tfv, 10e-9, 1e-12); // 10 nC / 1 A
    near(c.trv, 5e-9, 1e-12); // 10 nC / 2 A
    eq(gateTiming({ qgs: 8e-9, qgd: 1e-8, vpl: 4.5, vth: 5, vdrv: 10 }).error, 'mf_vth');
    eq(gateTiming({ qgs: 8e-9, qgd: 1e-8, vpl: 4.5, vth: 3, vdrv: 4 }).error, 'mf_vdrv');
  }],

  ['mosfet: loss budget, simple ½·V·I·(tr+tf)·fsw method', () => {
    const r = mosfetLosses(simple);
    near(r.parts.cond, 0.5, 1e-9); // Irms² = 50 A², ·10 mΩ (α = 0)
    near(r.psw, 0.96, 1e-9); // ½·48·10·40 ns·100 kHz
    near(r.parts.coss, 0.04608, 1e-9); // ½·400 pF·48²·100 kHz
    near(r.parts.qrr, 0.24, 1e-9); // 50 nC·48 V·100 kHz
    near(r.parts.dead, 0.036, 1e-9); // 0.9 V·10 A·2·20 ns·100 kHz
    near(r.gateTotal, 0.03, 1e-9); // 30 nC·10 V·100 kHz, all in the driver here
    eq(r.parts.gate, 0);
    near(r.total, 1.78208, 1e-9);
    near(r.tj, 111.2832, 1e-6); // 40 + 1.78208·40
    near(r.margin, 125 - 111.2832, 1e-6);
  }],

  ['mosfet: Tj and Rds(on) iterate to a consistent point; runaway is detected', () => {
    // Other losses 1 W (½·2 nF·100²·100 kHz), Irms²·Rds25 = 25·0.02 = 0.5 W, θ = 40, Ta = 25,
    // Rds ×1.5 at 125 °C: Tj = 25 + 40·(1 + 0.5·1.5^((Tj − 25)/100)) → 91.153 °C by hand iteration.
    const p = { v: 100, i: 1, irms: 5, fsw: 1e5, rds25: 0.02, alphaPct: alphaFromRatio(1.5), sw: 'time', tr: 0, tf: 0,
      qg: 0, vdrv: 10, coss: 2e-9, theta: 40, ta: 25, tjMax: 150 };
    const r = mosfetLosses(p);
    near(r.parts.coss, 1, 1e-9);
    near(r.tj, 91.153, 1e-4);
    near(r.tj, 25 + r.total * 40, 1e-9);
    near(r.rds, rdsAt(0.02, r.tj, p.alphaPct), 1e-9);
    const hot = mosfetLosses({ ...p, theta: 1000 });
    ok(hot.runaway && hot.warnings.includes('mf_runaway'), 'runaway');
  }],

  ['mosfet: gate-drive loss share inside the FET (Rg,int)', () => {
    const r = mosfetLosses({ ...simple, sw: 'qg',
      gate: { qgs: 8e-9, qgd: 10e-9, vpl: 4.5, vth: 3, vdrv: 10, drive: 'res', rSrc: 2, rSink: 1, rgExt: 3.3, rgInt: 1 } });
    // ½·0.03 W·(1/6.3 + 1/5.3) = 0.015·(0.15873 + 0.18868) = 5.2112 mW
    near(r.parts.gate, 5.2112e-3, 1e-4);
    near(r.gateDriver, 0.03 - 5.2112e-3, 1e-4);
    // E_on = ½·48·10·(2.688 + 11.4545) ns = 3.3942 µJ
    near(r.eOn, 3.3942e-6, 1e-3);
  }],

  ['snubber: parasitics from two ringing frequencies (Nexperia AN11160 example)', () => {
    // f1 = 31.25 MHz, f2 = 22.2 MHz, Cadd = 3200 pF: x² = 976.5625/492.84 = 1.98150,
    // Cpar = 3200 pF/0.98150 = 3260.3 pF (AN11160 rounds x to 1.41 and gets 3239 pF),
    // Lpar = 1/((2π·31.25 MHz)²·3260.3 pF) = 7.956 nH (AN11160: 8.0 nH).
    const p = parasitics({ f1: 31.25e6, f2: 22.2e6, cAdd: 3200e-12 });
    near(p.cPar, 3260.3e-12, 1e-4);
    near(p.lPar, 7.956e-9, 1e-3);
    // The same L must follow from f2 with Cpar + Cadd.
    near(1 / ((TAU * 22.2e6) ** 2 * (p.cPar + 3200e-12)), p.lPar, 1e-9);
    eq(parasitics({ f1: 1e6, f2: 2e6, cAdd: 1e-9 }).error, 'sn_f2');
  }],

  ['snubber: Todd SEM-900 example (2 µH, 330 pF, 1000 pF, 400 V, 100 kHz → 16 W)', () => {
    const r = snubberDesign({ lPar: 2e-6, cPar: 330e-12, zeta: 0.5, kC: 1000 / 330, v: 400, fsw: 1e5, iOff: 1 });
    near(r.z0, 77.850, 1e-4); // √(2 µH/330 pF) = √6060.6 (Todd: 78 Ω)
    near(r.f0, 6.19505e6, 1e-4); // 1/(2π·√(6.6e-16)) (Todd: 6.2 MHz)
    near(r.r, r.z0, 1e-12); // ζ = 0.5 → R = Z0
    near(r.cs, 1000e-12, 1e-12);
    near(r.p, 16, 1e-9); // 1 nF·400²·100 kHz
    near(r.vSpike, 77.850, 1e-4); // 1 A·Z0 (Todd: 78 V)
  }],

  ['snubber: critical damping R = Z0/2 and the AN11160 minimum Cs = 2·Cpar', () => {
    // AN11160: L = 8.0 nH, C = 3239 pF, ζ = 1 → R = ½·√(8/3.239) = 0.7858 Ω (AN11160: 0.78 Ω)
    const r = snubberDesign({ lPar: 8e-9, cPar: 3239e-12, zeta: 1, kC: 3 });
    near(r.r, 0.78580, 1e-4);
    // Cs,min = 1/(2π·R·f0) with R = Z0/2 equals 2·Cpar
    near(r.csMin, 2 * 3239e-12, 1e-9);
    eq(r.p, undefined);
  }],

  ['snubber: step response overshoot, with and without the snubber', () => {
    // Series-damped LC step, ζ = 0.04: peak = 1 + e^(−ζπ/√(1 − ζ²)) = 1 + e^(−0.12577) = 1.88182
    const bare = stepResponse({ l: 1, cp: 1, tEnd: TAU, n: 2000, zetaBare: 0.04 });
    near(Math.max(...bare.map(([, x]) => x)), 1.88182, 2e-4);
    const snub = stepResponse({ l: 1, cp: 1, r: 1, cs: 3, tEnd: 60, n: 600 });
    ok(Math.max(...snub.map(([, x]) => x)) < 1.6, 'snubber lowers the overshoot');
    near(snub[snub.length - 1][1], 1, 0.05);
  }],

  ['inrush: hot plug into 100 µF through 0.1 Ω', () => {
    const r = hotPlug({ v: 12, c: 100e-6, rSrc: 0.05, esr: 0.03, rTrace: 0.02 });
    near(r.iPeak, 120, 1e-9); // 12 V / 0.1 Ω
    near(r.energy, 7.2e-3, 1e-9); // ½·100 µF·12²
    near(r.tau, 10e-6, 1e-9);
    eq(hotPlug({ v: 12, c: 1e-6 }).ok, false);
  }],

  ['inrush: series RLC step, underdamped (ζ = 0.5)', () => {
    // R = 0.1 Ω, L = 1 µH, C = 100 µF: α = 5e4, ω0 = 1e5, ζ = 0.5, ωd = 86 602.5 rad/s
    // t_pk = (π/3)/ωd = 12.092 µs, I_pk = 12/(ωd·L)·e^(−0.6046)·sin(π/3) = 65.555 A
    // V_max = 12·(1 + e^(−απ/ωd)) = 12·(1 + 0.163034) = 13.956 V
    const r = rlcStep({ v: 12, r: 0.1, l: 1e-6, c: 100e-6 });
    eq(r.type, 'under');
    near(r.tPeak, 12.092e-6, 1e-4);
    near(r.iPeak, 65.555, 1e-4);
    near(r.vMax, 13.9564, 1e-4);
    near(r.vc(1), 12, 1e-6);
    // The analytic peak is the maximum of i(t)
    let m = 0;
    for (let k = 0; k <= 4000; k++) m = Math.max(m, r.i((k / 4000) * 50e-6));
    near(m, r.iPeak, 1e-5);
  }],

  ['inrush: series RLC step, critically and overdamped', () => {
    // Critical: R = 0.2 Ω (α = ω0 = 1e5): I_pk = 2V/(R·e) = 24/(0.2·2.71828) = 44.146 A
    const c = rlcStep({ v: 12, r: 0.2, l: 1e-6, c: 100e-6 });
    eq(c.type, 'critical');
    near(c.iPeak, 44.1455, 1e-4);
    // Over: R = 1 Ω: s1 = −10 102.05, s2 = −989 897.9, t_pk = ln(s2/s1)/(s1 − s2) = 4.6794 µs,
    // I_pk = 12/(L·(s1 − s2))·(e^(s1·t) − e^(s2·t)) = 12.24745·(0.953828 − 0.009734) = 11.5628 A
    const o = rlcStep({ v: 12, r: 1, l: 1e-6, c: 100e-6 });
    eq(o.type, 'over');
    near(o.tPeak, 4.6794e-6, 1e-4);
    near(o.iPeak, 11.5628, 1e-4);
    near(o.vc(0), 0, 1e-9);
  }],

  ['inrush: soft-start ramp current and pass-element energy', () => {
    // 12 V in 5 ms into 100 µF: dV/dt = 2400 V/s, I_C = 0.24 A; + 1 A resistive load
    // E = ½·C·V² + V·I_load·t/6 = 7.2 mJ + 10 mJ = 17.2 mJ, P_avg = 3.44 W, P_pk = 12·0.24 = 2.88 W
    const r = softStart({ v: 12, c: 100e-6, tRamp: 5e-3, iLoad: 1 });
    near(r.iCap, 0.24, 1e-12);
    near(r.iPeak, 1.24, 1e-12);
    near(r.energyFet, 0.0172, 1e-9);
    near(r.pAvg, 3.44, 1e-9);
    near(r.pPeak, 2.88, 1e-12);
    // Check the energy formula by integrating (V − v)·(I_C + I_load·v/V) numerically.
    let e = 0;
    const N = 20000;
    for (let k = 0; k < N; k++) {
      const vv = (12 * (k + 0.5)) / N;
      e += (12 - vv) * (0.24 + vv / 12) * (5e-3 / N);
    }
    near(e, r.energyFet, 1e-6);
  }],

  ['inrush: gate-capacitor ramp (TPS2490 dV/dt control)', () => {
    // dV/dt = 20 µA / (47 nF + 0.5 nF) = 421.05 V/s; 48 V → 0.114 s; I = 470 µF·421.05 = 0.19789 A
    const r = gateRamp({ v: 48, c: 470e-6, iGate: 20e-6, cGate: 47e-9, cgd: 0.5e-9, iTarget: 0.5 });
    near(r.slew, 421.053, 1e-5);
    near(r.tRamp, 0.114, 1e-9);
    near(r.iCap, 0.197895, 1e-5);
    // C_G for 0.5 A: 20 µA·470 µF/0.5 A − 0.5 nF = 18.3 nF
    near(r.cGateFor, 18.3e-9, 1e-9);
  }],

  ['inrush: NTC limiter for 230 V AC, 220 µF, 20 A', () => {
    // V_pk = 230·√2 = 325.27 V; R25,min = 325.27/20 − 0.6 = 15.663 Ω; E = ½·220 µF·105 800 V² = 11.638 J
    const r = ntcLimiter({ vPk: 230 * Math.SQRT2, c: 220e-6, iTarget: 20, rSrc: 0.5, esr: 0.1, r25: 22, iSs: 2, rHot: 0.3 });
    near(r.r25Min, 15.6635, 1e-4);
    near(r.energy, 11.638, 1e-9);
    near(r.iPeak, 14.3925, 1e-4); // 325.27 / 22.6
    near(r.pSs, 1.2, 1e-12);
    ok(ntcLimiter({ vPk: 12, c: 1e-4, iTarget: 200, rSrc: 0.1 }).warnings.includes('iz_ntcNotNeeded'), 'not needed');
  }],

  ['battery: average current of a sleep / active / radio profile', () => {
    // 2 µA sleep, 5 mA for 20 ms every 10 s, 15 mA for 3 ms every 60 s:
    // D_act = 0.002, D_ev = 5e-5 → 2 µA·0.99795 + 10 µA + 0.75 µA = 12.7459 µA
    const a = averageCurrent({ iSleep: 2e-6, iAct: 5e-3, tAct: 0.02, period: 10, iBurst: 15e-3, tBurst: 3e-3, burstPeriod: 60 });
    near(a.iAvg, 12.7459e-6, 1e-5);
    near(a.parts.act, 10e-6, 1e-12);
    near(a.iPeak, 15e-3, 1e-12);
    eq(averageCurrent({ iSleep: 1e-6, iAct: 1e-3, tAct: 2, period: 1 }).ok, false);
  }],

  ['battery: life with derating and self-discharge', () => {
    near(batteryLife({ capacityAh: 1, iAvg: 1e-3 }).hours, 1000, 1e-12);
    // CR2032 225 mAh, 85 % usable, 1 %/year: I_self = 0.225·0.01/8766 h = 0.25667 µA
    // life = 0.19125 Ah / (12.7459 + 0.25667) µA = 14 708.6 h = 1.6779 years
    const r = batteryLife({ capacityAh: 0.225, usable: 0.85, tempFactor: 1, selfPerYear: 0.01, iAvg: 12.7459e-6 });
    near(r.iSelf, 0.25667e-6, 1e-4);
    near(r.hours, 14708.6, 1e-4);
    near(r.years, 1.67792, 1e-4);
  }],

  ['emc: stitching-via pitch λ/20 for a 1 ns edge in FR-4', () => {
    // f = 0.35/1 ns = 350 MHz; λ = c/(f·√4.3) = 299 792 458/(3.5e8·2.07364) = 0.41306 m; λ/20 = 20.653 mm
    const f = fMax({ mode: 'tr', tr: 1e-9 });
    near(f, 350e6, 1e-12);
    const s = stitching({ fHz: f, er: 4.3, divisor: 20, edgeM: 0.1 });
    near(s.lambda, 0.413065, 1e-5);
    near(s.pitch, 0.0206533, 1e-5);
    eq(s.count, 6); // ⌈100/20.65⌉ + 1
    near(fMax({ mode: 'clk', fClk: 100e6, harmonic: 5 }), 500e6, 1e-12);
  }],

  ['emc: slot resonance and rough shielding 20·log10(λ/2L)', () => {
    // L = 50 mm in air: f_res = c/0.1 m = 2.998 GHz; at 300 MHz λ = 0.99931 m → SE = 20·log10(9.9931) = 19.994 dB
    const r = slot({ lengthM: 0.05, erEff: 1, fHz: 300e6, targetDb: 20 });
    near(r.fRes, 2.99792458e9, 1e-12);
    near(r.se, 19.994, 1e-4);
    near(r.lMax, 0.0499654, 1e-5); // λ/(2·10)
    ok(slot({ lengthM: 0.05, fHz: 4e9 }).se < 0, 'above resonance');
  }],

  ['emc: LC filter f0, Z0, Q, peaking and attenuation', () => {
    // L = 1 µH, C = 10 µF, Rs = 50 mΩ, no load: f0 = 50.329 kHz, Z0 = 0.31623 Ω, Q = Z0/Rs = 6.3246
    // peak = Q/√(1 − 1/(4Q²)) = 6.3444 (16.05 dB); at 1 MHz |1 − ω²LC + jωRsC| = |−393.784 + j3.1416| → 51.905 dB
    const r = lcFilter({ l: 1e-6, c: 10e-6, rs: 0.05, fx: 1e6 });
    near(r.f0, 50329.2, 1e-5);
    near(r.z0, 0.316228, 1e-5);
    near(r.q, 6.32456, 1e-5);
    near(r.peak, 6.34442, 1e-5);
    near(r.attDb, 51.905, 1e-4);
    ok(r.warnings.includes('em_peaking'), 'peaking warning');
    // With a 10 Ω load: Q = √(1e-11·1.005)/(1e-7 + 5e-7) = 5.2836
    near(lcFilter({ l: 1e-6, c: 10e-6, rs: 0.05, rl: 10 }).q, 5.28362, 1e-5);
    near(lcGain(1, { l: 1e-6, c: 10e-6, rs: 0.05, rl: 10 }), 1, 1e-6); // normalised to the DC gain
  }],

  ['emc: numeric peak search and Rd–Cd damping (Erickson n = 4)', () => {
    // A negligible damping branch must reproduce the analytic peak through the numeric search.
    const r = lcFilter({ l: 1e-6, c: 10e-6, rs: 0.05, rd: 1e12, cd: 1e-18 });
    near(r.peak, 6.34442, 1e-4);
    // n = 4: Rd = Z0·√(6·16/(2·16·8)) = 0.61237·Z0, peak |Zo| = Z0·√12/4 = 0.86603·Z0
    const o = optimumDamping(1, 4);
    near(o.rd, 0.612372, 1e-6);
    near(o.zPeak, 0.866025, 1e-6);
    const d = lcFilter({ l: 1e-6, c: 10e-6, rs: 0.05, rd: 0.612372 * 0.316228, cd: 40e-6, fx: 1e6 });
    ok(d.peakDb < 6 && d.peakDb < r.peakDb - 8, `damped peak ${d.peakDb} dB`);
    ok(Math.abs(d.attDb - d.attBareDb) < 3, 'damping keeps the high-frequency attenuation');
  }],
];
