import { near, eq, ok } from '../assert.js';
import {
  lSolutions, lSolutionCount, piNetwork, tNetwork, matchNetwork, zinOf, gammaOf, reflectionAt, cx, cabs,
} from '../../src/engine/matching.js';

const TAU = 2 * Math.PI;

/** The network must present Zs* at its input: Zin ≈ conj(Zs) and Γ ≈ 0. */
function conjugate(parts, zs, zl, w, label) {
  const zin = zinOf(parts, zl, w);
  const tol = 1e-9 * (zs.re + Math.abs(zs.im));
  ok(Math.abs(zin.re - zs.re) < tol && Math.abs(zin.im + zs.im) < tol, `${label}: Zin = ${zin.re} + j${zin.im}`);
  ok(cabs(gammaOf(zin, zs)) < 1e-9, `${label}: Γ`);
}
const on = (parts) => parts.filter((p) => p.kind);

export const cases = [
  ['matching: Bowick L network, 100 Ω → 1000 Ω at 100 MHz', () => {
    // Q = √(1000/100 − 1) = 3;  X_series = Q·R_low = 300 Ω;  X_shunt = R_high/Q = 333.3 Ω
    // ω = 2π·100 MHz = 6.2832e8 rad/s
    // Low-pass:  L = 300/ω = 477.46 nH,  C = 1/(ω·333.33) = 4.7746 pF
    // High-pass: C = 1/(ω·300) = 5.3052 pF,  L = 333.33/ω = 530.52 nH
    const w = TAU * 100e6;
    const zs = cx(100);
    const zl = cx(1000);
    const sols = lSolutions(zs, zl, w);
    eq(sols.length, 2, 'two solutions');
    const [lp, hp] = sols;
    eq(lp.orient, 'shuntLoad', 'shunt on the high-R (load) side');
    near(lp.q, 3, 1e-9, 'Q');
    eq(lp.type, 'lp'); eq(hp.type, 'hp');
    const [ls, cp] = lp.parts;
    eq(ls.pos, 'series'); eq(ls.kind, 'L'); eq(cp.pos, 'shunt'); eq(cp.kind, 'C');
    near(ls.react, 300, 1e-9, 'X series');
    near(-1 / cp.react, -333.333333, 1e-6, 'X shunt');
    near(ls.value, 477.4648e-9, 1e-6, 'L');
    near(cp.value, 4.774648e-12, 1e-6, 'C');
    near(hp.parts[0].value, 5.305165e-12, 1e-6, 'HP series C');
    near(hp.parts[1].value, 530.5165e-9, 1e-6, 'HP shunt L');
    conjugate(lp.parts, zs, zl, w, 'LP');
    conjugate(hp.parts, zs, zl, w, 'HP');
  }],

  ['matching: complex antenna-like load 12 − j20 Ω → 50 Ω at 2.45 GHz', () => {
    // RL = 12 < Rs = 50: series part next to the load, shunt across the source.
    // (XL + X)² = RL·Rs − RL² = 600 − 144 = 456 → XL + X = ±21.3542 Ω, Q = 21.3542/12 = 1.7795
    // + : X = 21.3542 + 20 = 41.3542 Ω,  B = 21.3542/600 = 0.0355903 S
    // ω = 2π·2.45 GHz = 1.53938e10 → L = 41.3542/ω = 2.68642 nH, C = 0.0355903/ω = 2.31199 pF
    // − : X = −21.3542 + 20 = −1.35416 Ω → C = 1/(ω·1.35416) = 47.972 pF,  L = 1/(ω·0.0355903) = 1.82525 nH
    // Shunt across the load would need Rs ≤ |ZL|²/RL = 544/12 = 45.3 Ω → no.
    const w = TAU * 2.45e9;
    const zs = cx(50);
    const zl = cx(12, -20);
    const sols = lSolutions(zs, zl, w);
    eq(sols.length, 2);
    eq(lSolutionCount(zs, zl), 2);
    const [a, b] = sols;
    eq(a.orient, 'shuntSrc');
    near(a.q, 1.779513, 1e-6, 'Q');
    near(a.parts[1].value, 2.68642e-9, 1e-5, 'L (LP)');
    near(a.parts[0].value, 2.31199e-12, 1e-5, 'C (LP)');
    near(b.parts[1].value, 47.972e-12, 1e-4, 'C (HP)');
    near(b.parts[0].value, 1.82525e-9, 1e-5, 'L (HP)');
    conjugate(a.parts, zs, zl, w, 'sol 1');
    conjugate(b.parts, zs, zl, w, 'sol 2');
    // Before matching: Γ = (12 − j20 − 50)/(62 − j20), |Γ| = √1844/√4244 = 0.659163
    // RL = −20·log10(0.659163) = 3.6201 dB, VSWR = 1.659163/0.340837 = 4.8679
    const r = matchNetwork({ fHz: 2.45e9, zs, zl });
    ok(r.ok, 'ok');
    near(r.before.gamma, 0.659163, 1e-5, '|Γ| before');
    near(r.before.returnLossDb, 3.6201, 1e-4, 'RL before');
    near(r.before.vswr, 4.8679, 1e-4, 'VSWR before');
    ok(r.after.gamma < 1e-9, 'matched after');
  }],

  ['matching: four L solutions (20 + j60 Ω → 50 Ω) and a complex source', () => {
    // RL = 20 ≤ 50 and Rs = 50 ≤ |ZL|²/RL = 4000/20 = 200 → both orientations, 4 solutions.
    const w = TAU * 900e6;
    const zl = cx(20, 60);
    const sols = lSolutions(cx(50), zl, w);
    eq(sols.length, 4);
    sols.forEach((d, i) => conjugate(d.parts, cx(50), zl, w, `sol ${i + 1}`));
    // Complex source (amplifier optimum 30 + j15 Ω) into a 200 − j80 Ω load.
    const zs = cx(30, 15);
    const zl2 = cx(200, -80);
    const s2 = lSolutions(zs, zl2, w);
    ok(s2.length >= 2, 'solutions exist');
    s2.forEach((d, i) => conjugate(d.parts, zs, zl2, w, `complex source sol ${i + 1}`));
  }],

  ['matching: π network round trip (Bowick 100 → 1000 Ω, Q = 15; antenna load; complex source)', () => {
    // Bowick-style: R_v = 1000/(15² + 1) = 4.42478 Ω
    //   load half:   X_p2 = 1000/15 = 66.667 Ω,  X_s2 = 15·R_v = 66.372 Ω
    //   source half: Q1 = √(100/4.42478 − 1) = 4.64758,  X_s1 = Q1·R_v = 20.565 Ω,  X_p1 = 100/Q1 = 21.517 Ω
    //   series total X = 66.372 + 20.565 = 86.937 Ω
    const w = TAU * 100e6;
    const p = piNetwork(cx(100), cx(1000), w, 15, 'lp');
    ok(p.ok, 'ok');
    near(p.rv, 4.424779, 1e-6, 'Rv');
    near(-1 / p.parts[0].react, -21.5166, 1e-4, 'X_p1');
    near(p.parts[1].react, 86.937, 1e-4, 'X series');
    near(-1 / p.parts[2].react, -66.6667, 1e-5, 'X_p2');
    eq(p.type, 'lp');
    conjugate(p.parts, cx(100), cx(1000), w, 'Bowick π');
    // Antenna load 12 − j20 Ω, Q = 3: R_H = 50 (source), R_v = 50/10 = 5 Ω
    //   load half:  GL = 12/544, BL = 20/544, (BL + B2)² = GL/5 − GL² → BL + B2 = 0.0626512
    //               X2 = 0.0626512·5/GL = 14.2010 Ω, B2 = 0.0626512 − 0.0367647 = 0.0258865 S
    //   source half: X1 = √(5·50 − 25) = 15 Ω, B1 = 15/(5·50) = 0.06 S → series X = 29.2010 Ω
    const w2 = TAU * 2.45e9;
    const a = piNetwork(cx(50), cx(12, -20), w2, 3, 'lp');
    near(a.rv, 5, 1e-12, 'Rv');
    near(a.parts[0].react, 0.06, 1e-9, 'B1');
    near(a.parts[1].react, 29.2010, 1e-5, 'X');
    near(a.parts[2].react, 0.0258865, 1e-5, 'B2');
    for (const variant of ['lp', 'hp']) {
      conjugate(piNetwork(cx(50), cx(12, -20), w2, 3, variant).parts, cx(50), cx(12, -20), w2, `π ${variant}`);
      conjugate(piNetwork(cx(30, 15), cx(200, -80), w2, 4, variant).parts, cx(30, 15), cx(200, -80), w2, `π complex ${variant}`);
    }
    eq(piNetwork(cx(50), cx(50), w2, 3, 'hp').type, 'hp');
  }],

  ['matching: T network round trip (antenna load, Q = 3; complex source)', () => {
    // R_v = R_small·(Q² + 1) = 12·10 = 120 Ω
    //   load half:  (XL + X2)² = 12·120 − 144 = 1296 → 36 Ω, X2 = 36 + 20 = 56 Ω, B2 = 36/(12·120) = 0.025 S
    //   source half: B1 = √((1/120)/50 − 1/120²) = 0.00986013 S, X1 = B1·50·120 = 59.1608 Ω
    //   shunt B = 0.0348601 S
    const w = TAU * 2.45e9;
    const d = tNetwork(cx(50), cx(12, -20), w, 3, 'lp');
    ok(d.ok, 'ok');
    near(d.rv, 120, 1e-12, 'Rv');
    near(d.parts[0].react, 59.1608, 1e-5, 'X1');
    near(d.parts[1].react, 0.0348601, 1e-5, 'B');
    near(d.parts[2].react, 56, 1e-9, 'X2');
    eq(d.type, 'lp');
    for (const variant of ['lp', 'hp']) {
      conjugate(tNetwork(cx(50), cx(12, -20), w, 3, variant).parts, cx(50), cx(12, -20), w, `T ${variant}`);
      conjugate(tNetwork(cx(30, 15), cx(200, -80), w, 4, variant).parts, cx(30, 15), cx(200, -80), w, `T complex ${variant}`);
    }
  }],

  ['matching: π/T reject a Q below the minimum', () => {
    // T: Q_min = √(50/12 − 1) = 1.779513;  π: Q_min = √(50/45.333 − 1) = 0.320844
    const w = TAU * 2.45e9;
    const t1 = tNetwork(cx(50), cx(12, -20), w, 1.5);
    eq(t1.ok, false); eq(t1.errors[0], 'mtQMin');
    near(t1.qMin, 1.779513, 1e-6, 'T Q_min');
    const p1 = piNetwork(cx(50), cx(12, -20), w, 0.2);
    eq(p1.ok, false);
    near(p1.qMin, 0.320844, 1e-5, 'π Q_min');
    // Exactly Q_min still works (one half shrinks to a single part).
    const edge = tNetwork(cx(50), cx(12, -20), w, t1.qMin);
    ok(edge.ok, 'Q = Q_min accepted');
    conjugate(edge.parts, cx(50), cx(12, -20), w, 'T at Q_min');
    const r = matchNetwork({ fHz: 2.45e9, zs: cx(50), zl: cx(12, -20), topology: 'T', q: 1.5 });
    eq(r.ok, false); eq(r.errors[0], 'mtQMin');
  }],

  ['matching: E12 rounding recomputes the match', () => {
    // LP solution rounded: L 2.686 → 2.7 nH, C 2.312 → 2.2 pF at 2.45 GHz
    //   X_L = ω·2.7n = 41.5633 Ω → Z1 = 12 + j21.5633, Y1 = 0.0197053 − j0.0354091
    //   B_C = ω·2.2p = 0.0338664 → Y = 0.0197053 − j0.0015428 → Zin = 50.439 + j3.949 Ω
    //   |Γ| = |0.439 + j3.949| / |100.439 + j3.949| = 0.039529 → RL = 28.06 dB
    const r = matchNetwork({ fHz: 2.45e9, zs: cx(50), zl: cx(12, -20), series: 'E12' });
    near(r.stdParts[0].value, 2.2e-12, 1e-12, 'C E12');
    near(r.stdParts[1].value, 2.7e-9, 1e-12, 'L E12');
    near(r.zinStd.re, 50.439, 1e-4, 'Re Zin');
    near(r.zinStd.im, 3.949, 1e-3, 'Im Zin');
    near(r.afterStd.returnLossDb, 28.06, 1e-3, 'RL E12');
  }],

  ['matching: bandwidth sweep (single series L against a series RC load)', () => {
    // Rs = 50, ZL = 50 − j50 at 100 MHz: the L solution is one series L (X = +50 Ω).
    // Circuit = series RLC with R = 100 Ω: X(f) = 50·(f/f0 − f0/f), |Γ|² = X²/(100² + X²).
    //   −3 dB: X = ±100 → u − 1/u = ±2 → u = √2 ± 1 → 41.421 … 241.421 MHz (BW = f0/Q_L, Q_L = 50/100)
    //   VSWR 2: |Γ|² = 1/9 → X = ±35.355 → u = √2, 1/√2 → 70.711 … 141.421 MHz
    const zs = cx(50);
    const zl = cx(50, -50);
    const r = matchNetwork({ fHz: 100e6, zs, zl, sol: 1 });
    eq(on(r.parts).length, 1, 'single part');
    eq(r.solutions.length, 2, 'duplicate removed');
    near(r.bw.bw3.lo, 41.4214e6, 1e-5, '−3 dB low');
    near(r.bw.bw3.hi, 241.4214e6, 1e-5, '−3 dB high');
    near(r.bw.bw2.lo, 70.7107e6, 1e-5, 'VSWR 2 low');
    near(r.bw.bw2.hi, 141.4214e6, 1e-5, 'VSWR 2 high');
    // Higher Q → narrower band (π, antenna load).
    const pa = matchNetwork({ fHz: 2.45e9, zs, zl: cx(12, -20), topology: 'pi', q: 3 });
    const pb = matchNetwork({ fHz: 2.45e9, zs, zl: cx(12, -20), topology: 'pi', q: 10 });
    ok(pb.bw.bw3.hi - pb.bw.bw3.lo < pa.bw.bw3.hi - pa.bw.bw3.lo, 'Q 10 narrower than Q 3');
    near(reflectionAt(pa.parts, zs, cx(12, -20), 2.45e9, pa.bw.bw3.hi), 0.5, 1e-6, 'edge at |Γ|² = 1/2');
  }],

  ['matching: already matched and invalid inputs', () => {
    const r = matchNetwork({ fHz: 1e9, zs: cx(50), zl: cx(50) });
    ok(r.ok && r.matched, 'matched');
    eq(on(r.parts).length, 0, 'no parts');
    eq(matchNetwork({ fHz: 1e9, zs: cx(50), zl: cx(0, 10) }).ok, false);
    eq(lSolutionCount(cx(NaN), cx(10)), 0);
  }],
];
