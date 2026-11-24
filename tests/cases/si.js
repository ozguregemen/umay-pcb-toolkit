import { near, eq, ok } from '../assert.js';
import {
  ellipK, microstrip, stripline, asymStripline, cpwg, embeddedMicrostrip,
  ipc2141Microstrip, ipc2141Stripline, calculateImpedance, solveWidth,
} from '../../src/engine/impedance.js';
import { signalBasics, crosstalk, nextLengthFactor } from '../../src/engine/signal.js';

export const cases = [
  ['impedance: elliptic integral K(k)', () => {
    near(ellipK(0), Math.PI / 2, 1e-12);
    near(ellipK(Math.SQRT1_2), 1.8540746773, 1e-9); // K(m = 0.5)
  }],

  ['impedance: HJ air microstrip w/h = 1 → 126.4 Ω', () => {
    // η0/2π · ln(6 + √5) = 59.9585 · 2.10849 = 126.42
    const r = microstrip(1, 0, 1, 1);
    near(r.z0, 126.42, 1e-3);
    near(r.erEff, 1, 1e-9);
  }],

  ['impedance: HJ microstrip on FR-4 is physical', () => {
    const r = microstrip(0.3, 0.035, 0.18, 4.6);
    ok(r.erEff > 3.0 && r.erEff < 3.9, `εeff ${r.erEff}`);
    ok(r.z0 > 40 && r.z0 < 52, `z0 ${r.z0}`);
    // Thickness lowers impedance.
    ok(microstrip(0.3, 0.07, 0.18, 4.6).z0 < r.z0, 'thicker → lower Z');
  }],

  ['impedance: Wheeler stripline (t = 0) matches Cohn exact within 0.5 %', () => {
    // Cohn: Z0 = 30π/√εr · K(k)/K(k′), k = sech(π w / 2b)
    const exact = (w, b, er) => {
      const k = 1 / Math.cosh((Math.PI * w) / (2 * b));
      return ((30 * Math.PI) / Math.sqrt(er)) * (ellipK(k) / ellipK(Math.sqrt(1 - k * k)));
    };
    for (const wb of [0.2, 0.5, 1, 2]) near(stripline(wb, 0, 1, 1).z0, exact(wb, 1, 1), 5e-3, `w/b=${wb}`);
    near(stripline(0.5, 0, 1, 4).z0, stripline(0.5, 0, 1, 1).z0 / 2, 1e-12);
  }],

  ['impedance: symmetric case of asymmetric stripline', () => {
    near(asymStripline(0.15, 0.035, 0.2, 0.2, 4).z0, stripline(0.15, 0.035, 0.435, 4).z0, 1e-12);
  }],

  ['impedance: CPWG → CPW when the plane is far away', () => {
    // CPW: Z0 = 30π/√εeff · K(k′)/K(k), εeff = (εr+1)/2
    const w = 0.5; const s = 0.2; const er = 4.3;
    const k = w / (w + 2 * s);
    const eeff = (er + 1) / 2;
    const zCpw = ((30 * Math.PI) / Math.sqrt(eeff)) * (ellipK(Math.sqrt(1 - k * k)) / ellipK(k));
    const r = cpwg(w, s, 1e4, er);
    near(r.erEff, eeff, 1e-3);
    near(r.z0, zCpw, 2e-3);
    ok(cpwg(w, s, 0.2, er).z0 < r.z0, 'bottom plane lowers Z');
  }],

  ['impedance: embedded microstrip lies between microstrip and stripline-like εr', () => {
    const r = embeddedMicrostrip(0.3, 0.035, 0.2, 0.1, 4.3);
    ok(r.erEff > microstrip(0.3, 0.035, 0.2, 4.3).erEff && r.erEff < 4.3, `εr′ ${r.erEff}`);
    // Continuity: no cover = plain microstrip; very thick cover → εr
    const ms = microstrip(0.3, 0.035, 0.2, 4.3);
    near(embeddedMicrostrip(0.3, 0.035, 0.2, 0, 4.3).z0, ms.z0, 1e-12);
    near(embeddedMicrostrip(0.3, 0.035, 0.2, 5, 4.3).erEff, 4.3, 1e-6);
  }],

  ['impedance: IPC-2141 comparison formulas unchanged', () => {
    near(ipc2141Microstrip(0.3, 0.035, 0.18, 4.6), 48.428, 1e-3);
    near(ipc2141Stripline(0.15, 0.035, 0.5, 4), 54.397, 1e-3);
  }],

  ['impedance: AN-905 differential constants (0.48 / 0.374)', () => {
    const m = calculateImpedance({ structure: 'diffMicrostrip', w: 0.3, t: 0.035, h: 0.18, er: 4.6, s: 0.2 });
    near(m.zdiff, 2 * m.z0 * (1 - 0.48 * Math.exp((-0.96 * 0.2) / 0.18)), 1e-12);
    const s = calculateImpedance({ structure: 'diffStripline', w: 0.15, t: 0.035, h: 0.5, er: 4, s: 0.2 });
    near(s.zdiff, 2 * s.z0 * (1 - 0.374 * Math.exp((-2.9 * 0.2) / 0.5)), 1e-12);
  }],

  ['impedance: synthesis round-trip', () => {
    for (const structure of ['microstrip', 'stripline', 'cpwg', 'diffMicrostrip', 'diffStripline']) {
      const p = { structure, t: 0.035, h: 0.4, h2: 0.3, c: 0.1, s: 0.2, er: 4.3 };
      const target = structure.startsWith('diff') ? 100 : 50;
      const w = solveWidth(p, target);
      ok(w > 0, `${structure} solvable`);
      const r = calculateImpedance({ ...p, w });
      near(r.zdiff ?? r.z0, target, 1e-6, structure);
    }
  }],

  ['impedance: stripline dielectric loss 1 GHz, εr 4, tanδ 0.02 = 3.64 dB/m', () => {
    // 8.686 · π f √εr tanδ / c = 8.686 · π · 1e9 · 2 · 0.02 / 299792458
    const r = calculateImpedance({ structure: 'stripline', w: 0.15, t: 0.035, h: 0.5, er: 4, fHz: 1e9, tanD: 0.02 });
    near(r.loss.dielectricDbPerMm * 1000, 3.6409, 1e-3);
    near(r.loss.skinUm, 2.0897, 1e-3); // √(ρ/(π f µ0)) at 1 GHz
    near(r.delayPsPerMm, 2 * 3.33564, 1e-4);
  }],

  ['impedance: invalid geometry reported', () => {
    eq(calculateImpedance({ structure: 'stripline', w: 0.1, t: 0.6, h: 0.5, er: 4 }).ok, false);
    eq(calculateImpedance({ structure: 'microstrip', mode: 'synth', target: 5000, t: 0.035, h: 0.2, er: 4 }).ok, false);
  }],

  ['signal: 1 ns edge, εeff 4', () => {
    const r = signalBasics({ trS: 1e-9, edge: '10-90', erEff: 4, lengthM: 0.1 });
    near(r.bwHz, 350e6, 1e-12);
    near(r.kneeHz, 500e6, 1e-12);
    near(r.riseLenM, 0.149896, 1e-5); // 1 ns · c/2
    near(r.lumpedM, 0.149896 / 6, 1e-5);
    eq(r.regime, 'tline'); // 100 mm > l_r/2 = 75 mm
    eq(signalBasics({ trS: 1e-9, erEff: 4, lengthM: 0.05 }).regime, 'transition'); // 25 < 50 < 75 mm
    eq(signalBasics({ trS: 1e-9, erEff: 4, lengthM: 0.02 }).regime, 'lumped');
    near(r.delayS, 0.1 * 2 / 299792458, 1e-9);
  }],

  ['signal: skew and allowed mismatch are inverse', () => {
    const r = signalBasics({ trS: 1e-9, erEff: 3.3, mismatchM: 0.001, skewBudgetS: 5e-12 });
    near(r.skewS, 0.001 * Math.sqrt(3.3) / 299792458, 1e-9);
    near(r.allowedMismatchM * r.tpd, 5e-12, 1e-9);
  }],

  ['crosstalk: Johnson estimate', () => {
    const r = crosstalk({ spacingMm: 0.2, widthMm: 0.2, heightMm: 0.1 });
    near(r.fraction, 1 / 17, 1e-12); // D/H = 4
    eq(r.threeW, false);
    const q = crosstalk({ spacingMm: 0.2, widthMm: 0.2, heightMm: 0.1, targetPct: 2 });
    near(crosstalk({ spacingMm: q.requiredGapMm, widthMm: 0.2, heightMm: 0.1 }).fraction, 0.02, 1e-9);
  }],

  ['crosstalk: stripline effective height and length factor', () => {
    near(crosstalk({ spacingMm: 0.2, widthMm: 0.1, heightMm: 0.1, height2Mm: 0.1 }).H, 0.05, 1e-12);
    // 20 mm at εeff 4 → 2·0.02·2/c = 0.2669 ns round trip vs 1 ns edge
    near(nextLengthFactor(0.02, 4, 1e-9), 0.26685, 1e-4);
    near(nextLengthFactor(1, 4, 1e-9), 1, 1e-12);
  }],
];
