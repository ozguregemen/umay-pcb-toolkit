import { near, eq, ok } from '../assert.js';
import { decode, encode, decodeSmd, encodeSmd } from '../../src/engine/colorcode.js';
import { decadeValues } from '../../src/engine/eseries.js';
import { attenuatorValues, analyseAttenuator } from '../../src/engine/attenuator.js';
import { combine, effectiveLoad, equalLoadCaps, pullingPpm, ppmToHz, driftSeconds } from '../../src/engine/passives.js';
import { planarInductor, coilTuning } from '../../src/engine/inductor.js';
import { patchAntenna, monopole } from '../../src/engine/antenna.js';
import { fanout } from '../../src/engine/fanout.js';
import { gammaFromLoad, fromGammaMag, gammaFromVswr, gammaFromReturnLoss } from '../../src/engine/rf.js';
import { buck, boost } from '../../src/engine/dcdc.js';
import { astable, astableDesign, monostable } from '../../src/engine/timer555.js';
import { dividerTolerance, feedbackTolerance } from '../../src/engine/circuit.js';

export const cases = [
  ['colour code: decode and encode', () => {
    const r = decode(['yellow', 'violet', 'red', 'gold']);
    eq(r.ohms, 4700); eq(r.tolPct, 5);
    eq(decode(['brown', 'black', 'black', 'red', 'brown']).ohms, 10000);
    eq(decode(['brown', 'black', 'black', 'red', 'brown', 'red']).tempco, 50);
    eq(encode(4700, 4).bands.join(), 'yellow,violet,red,gold');
    eq(encode(0.47, 4).bands.slice(0, 3).join(), 'yellow,violet,silver');
    eq(encode(4990, 5, 'brown').bands.slice(0, 4).join(), 'yellow,white,white,brown');
    eq(encode(4990, 4).exact, false);
  }],

  ['SMD resistor codes', () => {
    const e96 = decadeValues('E96').map((x) => Math.round(x * 100));
    eq(decodeSmd('472', e96).ohms, 4700);
    eq(decodeSmd('4R7', e96).ohms, 4.7);
    eq(decodeSmd('R047', e96).ohms, 0.047);
    eq(decodeSmd('1002', e96).ohms, 10000);
    eq(decodeSmd('01C', e96).ohms, 10000); // 100 × 100
    eq(decodeSmd('68X', e96).ohms, 49.9); // E96 #68 = 499 × 0.1
    eq(decodeSmd('000', e96).ohms, 0);
    eq(decodeSmd('ABC', e96).ok, false);
    const s = encodeSmd(4700, e96);
    eq(s.three, '472'); eq(s.four, '4701');
    eq(encodeSmd(4.7, e96).three, '4R7');
    eq(encodeSmd(10000, e96).eia96, '01C');
  }],

  ['attenuator: 10 dB / 50 Ω Pi, T and bridged-T', () => {
    const pi = attenuatorValues('pi', 10, 50);
    near(pi.r1, 96.248, 1e-4); near(pi.r2, 71.151, 1e-4);
    const t = attenuatorValues('t', 10, 50);
    near(t.r1, 25.975, 1e-4); near(t.r2, 35.136, 1e-4);
    for (const top of ['pi', 't', 'bt']) {
      const a = analyseAttenuator(top, attenuatorValues(top, 10, 50), 50);
      near(a.insertionLossDb, 10, 1e-9, top);
      near(a.zin, 50, 1e-9, top);
    }
    // Dissipated + delivered power = 1 W for a matched network.
    const a = analyseAttenuator('pi', pi, 50);
    const total = Object.values(a.dissipationPerWatt).reduce((s, x) => s + x, 0);
    near(total + 0.1, 1, 1e-9);
  }],

  ['passives: series/parallel and crystal load', () => {
    const r = combine('R', [10e3, 10e3, 4.7e3]);
    near(r.series, 24.7e3, 1e-12); near(r.parallel, 2422.68, 1e-5);
    const c = combine('C', [1e-6, 1e-6]);
    near(c.series, 0.5e-6, 1e-12); near(c.parallel, 2e-6, 1e-12);
    near(equalLoadCaps(12.5, 3), 19, 1e-12);
    near(effectiveLoad(18, 18, 3), 12, 1e-12);
    near(pullingPpm(5e-15, 1.5e-12, 12.5e-12, 12e-12), 6.614, 1e-3);
    near(ppmToHz(32768, 20), 0.65536, 1e-12);
    near(driftSeconds(20, 86400), 1.728, 1e-12);
  }],

  ['planar inductor: Mohan expressions agree (square, n = 5)', () => {
    const r = planarInductor({ shape: 'square', turns: 5, widthMm: 0.2, spaceMm: 0.2, outerMm: 10 });
    near(r.dInMm, 6.4, 1e-12);
    near(r.lWheeler, 375.9e-9, 2e-3);
    near(r.lSheet, 374.5e-9, 2e-3);
    eq(planarInductor({ shape: 'square', turns: 20, widthMm: 0.2, spaceMm: 0.2, outerMm: 10 }).ok, false);
  }],

  ['fanout: 0.8 mm BGA, 0.4 mm pads, 0.1/0.1 rules', () => {
    const r = fanout({ pitchMm: 0.8, padMm: 0.4, traceMm: 0.1, spaceMm: 0.1, viaPadMm: 0.45 });
    eq(r.traces, 1);
    near(r.maxTrace, 0.2, 1e-12);
    near(r.maxViaPad, 0.8 * Math.SQRT2 - 0.6, 1e-12);
    eq(r.viaFits, true);
  }],

  ['reflection: 75 Ω on 50 Ω', () => {
    const g = gammaFromLoad(50, 75, 0);
    near(g.mag, 0.2, 1e-12);
    const m = fromGammaMag(g.mag);
    near(m.vswr, 1.5, 1e-12); near(m.returnLossDb, 13.979, 1e-4); near(m.mismatchLossDb, 0.1773, 1e-3);
    near(gammaFromVswr(1.5), 0.2, 1e-12);
    near(gammaFromReturnLoss(20), 0.1, 1e-12);
    near(gammaFromLoad(50, 50, 50).mag, 0.4472, 1e-4); // ZL = 50 + j50
  }],

  ['dc-dc: buck 12 → 3.3 V and boost 5 → 12 V (TI SLVA477/372)', () => {
    const b = buck({ vin: 12, vout: 3.3, iout: 2, fsw: 5e5, ripple: 0.3, eff: 0.9, dvout: 0.02 });
    near(b.duty, 0.30556, 1e-4); near(b.L, 7.975e-6, 1e-3); near(b.cOutMin, 7.5e-6, 1e-9); near(b.iPeak, 2.3, 1e-12);
    const s = boost({ vin: 5, vout: 12, iout: 1, fsw: 5e5, ripple: 0.3, eff: 0.9, dvout: 0.05 });
    near(s.duty, 0.625, 1e-12); near(s.L, 8.102e-6, 1e-3); near(s.cOutMin, 25e-6, 1e-9); near(s.iPeak, 3.02667, 1e-5);
    eq(buck({ vin: 3, vout: 5, iout: 1, fsw: 1e6, ripple: 0.3, eff: 0.9, dvout: 0.02 }).ok, false);
  }],

  ['divider tolerance: worst case and RSS', () => {
    // 12 V, 10 k / 4.7 k, 1 %: s = 10/14.7; max = 12·4.747/14.647
    const d = dividerTolerance({ vin: 12, r1: 10e3, r2: 4.7e3, rTolPct: 1 });
    near(d.nom, 3.83673, 1e-5); near(d.max, 3.88913, 1e-5);
    near(d.rssPct, 100 * Math.sqrt(2) * (10 / 14.7) * 0.01, 1e-9);
    // Feedback 0.8 V, 10 k / 10 k, 1 % resistors, 1 % reference
    const f = feedbackTolerance({ vref: 0.8, r1: 10e3, r2: 10e3, rTolPct: 1, vTolPct: 1 });
    near(f.nom, 1.6, 1e-12); near(f.max, 0.808 * (1 + 10.1 / 9.9), 1e-12);
    near(f.rssPct, 1.22474, 1e-5);
  }],

  ['555: astable, design round trip, monostable', () => {
    const a = astable(10e3, 47e3, 10e-9);
    near(a.f, 1387.2, 1e-3); near(a.duty, 57 / 104, 1e-12);
    const d = astableDesign(1000, 0.6, 10e-9);
    near(d.r2, 57708, 1e-3);
    const chk = astable(d.r1, d.r2, 10e-9);
    near(chk.f, 1000, 1e-9); near(chk.duty, 0.6, 1e-9);
    near(monostable(100e3, 10e-9).t, 1.1e-3, 1e-12);
    ok(!astableDesign(1000, 0.4, 1e-8).ok, 'duty < 50 % rejected');
  }],

  ['patch antenna: Balanis example 14.1 (10 GHz, εr 2.2, h 1.588 mm)', () => {
    const p = patchAntenna({ fHz: 10e9, er: 2.2, hMm: 1.588 });
    near(p.wMm, 11.86, 2e-3); near(p.ereff, 1.972, 1e-3);
    near(p.dLMm, 0.81, 5e-3); near(p.lMm, 9.06, 2e-3);
    // h/λ0 = 0.053: just over the thin-substrate limit; PTFE so no loss warning
    ok(p.warnings.includes('patchThick') && !p.warnings.includes('fr4Loss'), 'warnings');
  }],

  ['patch antenna: 2.45 GHz on FR-4 with 50 Ω inset feed', () => {
    const p = patchAntenna({ fHz: 2.45e9, er: 4.4, hMm: 1.6 });
    near(p.wMm, 37.234, 1e-4); near(p.ereff, 4.0809, 1e-4); near(p.lMm, 28.809, 1e-4);
    near(p.rin, 306.80, 1e-4);
    // y0 = (L/π)·acos(√(50/Rin)) — check by substituting back: Rin·cos²(πy0/L) = 50
    near(p.rin * Math.cos((Math.PI * p.insetMm) / p.lMm) ** 2, 50, 1e-9);
    near(p.bwFrac, 0.011189, 1e-3);
    ok(p.warnings.includes('fr4Loss'), 'FR-4 loss warning');
    ok(!patchAntenna({ fHz: 2.45e9, er: 1, hMm: 1.6 }).ok, 'εr ≤ 1 rejected');
  }],

  ['monopole: quarter wave in air and printed', () => {
    const air = monopole({ fHz: 868e6, mode: 'wire' });
    near(air.quarterMm, 299792458 / 868e6 / 4 * 1000, 1e-12);
    near(air.quarterMm, 86.346, 1e-4);
    const pr = monopole({ fHz: 2.45e9, er: 4.3, mode: 'printed' });
    near(pr.eeff, 2.65, 1e-12); near(pr.quarterMm, 18.792, 1e-4); near(pr.quarterAirMm, 30.591, 1e-4);
  }],

  ['coil tuning: 13.56 MHz NFC, skin effect and damping', () => {
    const L = planarInductor({ shape: 'square', turns: 5, widthMm: 0.2, spaceMm: 0.2, outerMm: 10, thicknessUm: 35 });
    const r = coilTuning({ L: L.lSheet, rDc: L.rDc, thicknessUm: 35, fHz: 13.56e6, cParF: 5e-12, qTarget: 30 });
    const w = 2 * Math.PI * 13.56e6;
    near(1 / Math.sqrt(L.lSheet * r.cTotal), w, 1e-12);
    near(r.cExt, r.cTotal - 5e-12, 1e-12);
    near(r.deltaUm, 18.12, 2e-3);
    ok(r.rAc > L.rDc, 'R_ac > R_dc');
    near(r.xl / (r.rAc + r.rDamp), 30, 1e-12);
    near(r.bw, 13.56e6 / 30, 1e-12);
    // Low frequency limit: δ ≫ t ⇒ R_ac → R_dc
    const lo = coilTuning({ L: 1e-6, rDc: 1, thicknessUm: 35, fHz: 10 });
    near(lo.rAc, 1, 1e-3);
    ok(coilTuning({ L: 1e-6, rDc: 1, fHz: 125e3, qTarget: 30 }).warnings.includes('lfCoil'), 'LF warning');
  }],
];
