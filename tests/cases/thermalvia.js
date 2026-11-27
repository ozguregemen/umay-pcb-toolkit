// Thermal via array and copper area (src/engine/thermalvia.js).
// Expected values are worked out by hand in the comments. Bessel function
// values are the standard tabulated ones (Abramowitz & Stegun, Handbook of
// Mathematical Functions, ch. 9); the fin efficiency is also checked against
// an independent finite-difference solution of the fin equation.

import { near, eq, ok } from '../assert.js';
import {
  besselI, besselK, besselIe, besselKe, annularFinEfficiency, schmidtFinEfficiency,
  copperToAmbient, copperAreaForTheta, laminarPlateH, viaTheta, padToCopper, viasThatFit, thermalVia,
} from '../../src/engine/thermalvia.js';
import { calculateVia } from '../../src/engine/via.js';

// A 5 × 5 mm pad with nine 0.3 mm vias in a 1.6 mm board, 20 cm² of 1 oz copper cooled on both faces.
const base = {
  powerW: 1, thetaJcKW: 3, ambientC: 40, tjMaxC: 125,
  padWMm: 5, padLMm: 5, boardMm: 1.6, count: 9, drillMm: 0.3, platingUm: 25, pitchMm: 1.2, kBoardWmK: 0.3,
  copperAreaMm2: 2000, copperUm: 35, sides: 2, hWm2K: 10,
};

// Round numbers for the fin: pad area 10π mm² → r_b = √10 mm, copper 1000π mm² → r_e = 10·√10 mm,
// m = √(2·9.5 / (380·50e-6)) = √1000 = 31.6228 1/m → x_b = m·r_b = 0.1, x_e = 1.
const round = { padAreaMm2: 10 * Math.PI, copperAreaMm2: 1000 * Math.PI, copperUm: 50, sides: 2, hWm2K: 9.5 };

/**
 * Independent reference: finite differences for (x·θ′)′ = x·θ on [xb, xe] with
 * θ(xb) = 1 and θ′(xe) = 0; the efficiency is the area-weighted mean of θ.
 */
function finEfficiencyFD(xb, xe, n = 4000) {
  const h = (xe - xb) / n;
  const a = new Float64Array(n + 1);
  const b = new Float64Array(n + 1);
  const c = new Float64Array(n + 1);
  const d = new Float64Array(n + 1);
  b[0] = 1;
  d[0] = 1;
  for (let i = 1; i < n; i++) {
    const x = xb + i * h;
    a[i] = (x - h / 2) / (h * h);
    c[i] = (x + h / 2) / (h * h);
    b[i] = -(a[i] + c[i]) - x;
  }
  a[n] = (xe - h / 2) / h; // half cell at the insulated edge
  b[n] = -a[n] - ((xe - h / 4) * h) / 2;
  for (let i = 1; i <= n; i++) {
    const w = a[i] / b[i - 1];
    b[i] -= w * c[i - 1];
    d[i] -= w * d[i - 1];
  }
  const th = new Float64Array(n + 1);
  th[n] = d[n] / b[n];
  for (let i = n - 1; i >= 0; i--) th[i] = (d[i] - c[i] * th[i + 1]) / b[i];
  let s = 0;
  for (let i = 0; i <= n; i++) s += (i === 0 || i === n ? 0.5 : 1) * (xb + i * h) * th[i];
  return (s * h) / ((xe * xe - xb * xb) / 2);
}

export const cases = [
  ['thermalvia: modified Bessel functions match the tabulated values', () => {
    // Abramowitz & Stegun, ch. 9 tables.
    near(besselI(0, 1), 1.2660658778, 1e-9);
    near(besselI(1, 1), 0.5651591040, 1e-9);
    near(besselK(0, 1), 0.4210244382, 1e-9);
    near(besselK(1, 1), 0.6019072302, 1e-9);
    near(besselI(0, 2), 2.2795853023, 1e-9);
    near(besselI(1, 2), 1.5906368546, 1e-9);
    near(besselK(0, 2), 0.1138938727, 1e-9);
    near(besselK(1, 2), 0.1398658818, 1e-9);
    near(besselK(0, 0.1), 2.4270690, 1e-7);
    near(besselK(1, 0.1), 9.8538448, 1e-7);
    // Wronskian I0·K1 + I1·K0 = 1/x (A&S 9.6.15), across the series/integral switch at x = 20
    // and for arguments where the unscaled functions would overflow.
    for (const x of [1e-6, 0.01, 0.3, 3, 19.99, 20.01, 60, 400, 5000]) {
      near((besselIe(0, x) * besselKe(1, x) + besselIe(1, x) * besselKe(0, x)) * x, 1, 1e-12, `x = ${x}`);
    }
    near(besselIe(1, 20.000001), besselIe(1, 20), 1e-6, 'no jump at the switch');
    eq(besselKe(0, 0), Infinity);
    ok(Number.isNaN(besselIe(0, -1)) && Number.isNaN(besselKe(1, -1)), 'negative argument');
  }],

  ['thermalvia: one via, an array and the fill', () => {
    // r_i = 0.15 mm, r_o = 0.175 mm: A_b = π·(0.175² − 0.15²) = π·0.008125 = 0.0255254 mm²
    // θ_via = 1.6e-3 / (380·2.55254e-8) = 1.6e-3 / 9.69967e-6 = 164.954 °C/W
    const v = viaTheta({ drillMm: 0.3, platingUm: 25, lengthMm: 1.6 });
    near(v.barrelAreaMm2, 0.0255254, 1e-5);
    near(v.thetaKW, 164.954, 1e-5);
    eq(v.thetaFillKW, Infinity);
    // The via page computes the same barrel.
    near(v.thetaKW, calculateVia({ drillMm: 0.3, lengthMm: 1.6, platingUm: 25 }).thermalResistanceKW, 1e-12);
    // Drilled hole (laminate removed): π·0.175² = 0.0962113 mm²
    near(v.holeAreaMm2, 0.0962113, 1e-6);
    // Solder fill, 58 W/m·K: A_f = π·0.15² = 0.0706858 mm² → 58·7.06858e-8 = 4.09978e-6 W·m/K
    // θ_fill = 1.6e-3 / 4.09978e-6 = 390.265; θ_via = 1.6e-3 / (9.69967e-6 + 4.09978e-6) = 115.947 °C/W
    const f = viaTheta({ drillMm: 0.3, platingUm: 25, lengthMm: 1.6, kFillWmK: 58 });
    near(f.fillAreaMm2, 0.0706858, 1e-6);
    near(f.thetaFillKW, 390.265, 1e-5);
    near(f.thetaKW, 115.947, 1e-5);
    near(1 / f.thetaKW, 1 / f.thetaBarrelKW + 1 / f.thetaFillKW, 1e-12, 'barrel ∥ fill');
    // Nine in parallel: 164.954 / 9 = 18.3282 °C/W
    near(thermalVia(base).thetaViasKW, 18.3282, 1e-5);
  }],

  ['thermalvia: vias in parallel with the laminate, and no vias at all', () => {
    const r = thermalVia(base);
    // Laminate left under the pad: 25 − 9·0.0962113 = 24.1341 mm²
    // θ_FR4 = 1.6e-3 / (0.3·24.1341e-6) = 1.6e-3 / 7.24023e-6 = 220.988 °C/W
    near(r.laminateAreaMm2, 24.1341, 1e-5);
    near(r.thetaLaminateKW, 220.988, 1e-5);
    // θ_PB = 1 / (1/18.3282 + 1/220.988) = 1 / (0.0545607 + 0.0045251) = 16.9245 °C/W
    near(r.thetaPbKW, 16.9245, 1e-5);
    // No vias: 1.6e-3 / (0.3·25e-6) = 213.333 °C/W
    near(r.thetaNoViaKW, 213.333, 1e-5);
    const none = thermalVia({ ...base, count: 0 });
    near(none.thetaPbKW, 213.333, 1e-5);
    eq(none.thetaViasKW, Infinity);
    near(none.tjC, r.tjNoViaC, 1e-12, 'the comparison row is the N = 0 result');
    // The pieces are public as well.
    near(padToCopper({ padAreaMm2: 25, lengthMm: 1.6, kBoardWmK: 0.3, count: 9, thetaViaKW: 164.954, holeAreaMm2: 0.0962113 }).thetaKW, 16.9245, 1e-5);
  }],

  ['thermalvia: how many vias fit on the pad', () => {
    // Drilled hole 0.3 + 2·0.025 = 0.35 mm. Along 5 mm at 1.2 mm pitch: ⌊(5 − 0.35)/1.2⌋ + 1 = ⌊3.875⌋ + 1 = 4.
    const r = thermalVia(base);
    near(r.holeMm, 0.35, 1e-12);
    eq(r.fit.nx, 4);
    eq(r.fit.count, 16);
    // 3 × 6 mm pad at 1 mm pitch: ⌊2.65⌋ + 1 = 3 and ⌊5.65⌋ + 1 = 6.
    const f = viasThatFit({ padWMm: 3, padLMm: 6, pitchMm: 1, holeMm: 0.35 });
    eq(f.nx, 3);
    eq(f.ny, 6);
    eq(f.count, 18);
    // Exactly on the limit: (4.35 − 0.35)/1 = 4 → 5 in a row; a pad narrower than the hole takes none.
    eq(viasThatFit({ padWMm: 4.35, padLMm: 0.35, pitchMm: 1, holeMm: 0.35 }).count, 5);
    eq(viasThatFit({ padWMm: 0.3, padLMm: 5, pitchMm: 1.2, holeMm: 0.35 }).count, 0);
    // With all 16: θ_vias = 164.954/16 = 10.3096; laminate 25 − 16·0.0962113 = 23.4606 mm² → 227.332;
    // θ_PB = 1 / (0.0969969 + 0.0043988) = 9.8624 °C/W
    near(r.thetaPbFitKW, 9.8624, 1e-4);
    eq(thermalVia({ ...base, count: 16 }).thetaPbFitKW, null);
  }],

  ['thermalvia: fin efficiency of the copper area, limits', () => {
    // A small or thick plane is isothermal.
    near(annularFinEfficiency(1e-4, 1e-3), 1, 1e-6);
    near(annularFinEfficiency(0.5, 0.5001), 1, 1e-4);
    eq(annularFinEfficiency(0.5, 0.5), 1);
    // η falls as the plane grows and as it gets thinner (larger m).
    ok(annularFinEfficiency(0.1, 2) < annularFinEfficiency(0.1, 1), 'larger plane');
    ok(annularFinEfficiency(0.2, 2) < annularFinEfficiency(0.1, 1), 'thinner copper, same radii');
    // A very large plane: η·(x_e² − x_b²) → 2·x_b·K1(x_b)/K0(x_b) = 2·0.1·9.8538448/2.4270690 = 0.811996
    near(annularFinEfficiency(0.1, 60) * (3600 - 0.01), 0.811996, 1e-6);
    near(annularFinEfficiency(0.1, 5000) * (25e6 - 0.01), 0.811996, 1e-6);
    // θ → 1/(h_c·A) for one face: 2 cm² of 3 mm copper, 1 / (10·2e-4) = 500 °C/W
    const thick = copperToAmbient({ padAreaMm2: 100, copperAreaMm2: 200, copperUm: 3000, sides: 1, hWm2K: 10 });
    near(thick.eta, 1, 1e-3);
    near(thick.thetaKW, 500, 1e-3);
    near(thick.thetaIsothermalKW, 500, 1e-12);
  }],

  ['thermalvia: fin efficiency against the exact solution worked from Bessel tables', () => {
    // η = 2·x_b/(x_e² − x_b²) · [K1(x_b)·I1(x_e) − I1(x_b)·K1(x_e)] / [I0(x_b)·K1(x_e) + K0(x_b)·I1(x_e)]
    // x_b = 0.1, x_e = 1: I0(0.1) = 1.0025016, I1(0.1) = 0.0500625, K0(0.1) = 2.4270690, K1(0.1) = 9.8538448,
    //   I1(1) = 0.5651591, K1(1) = 0.6019072
    //   = 0.2/0.99 · (5.568992 − 0.030133) / (0.603413 + 1.371680) = 0.2020202 · 5.538859/1.975093 = 0.566536
    near(annularFinEfficiency(0.1, 1), 0.566536, 1e-5);
    // x_b = 1, x_e = 2: I0(1) = 1.2660659, I1(1) = 0.5651591, K0(1) = 0.4210244, K1(1) = 0.6019072,
    //   I1(2) = 1.5906369, K1(2) = 0.1398659
    //   = 2/3 · (0.957416 − 0.079046) / (0.177080 + 0.669697) = 0.6666667 · 0.878370/0.846777 = 0.691540
    near(annularFinEfficiency(1, 2), 0.691540, 1e-5);
    // Independent of the Bessel functions: finite differences on the fin equation.
    for (const [xb, xe] of [[0.1, 1], [1, 2], [0.2, 1], [0.05, 1.5], [0.5, 4], [2, 3]]) {
      near(annularFinEfficiency(xb, xe), finEfficiencyFD(xb, xe), 2e-4, `x_b = ${xb}, x_e = ${xe}`);
    }
  }],

  ['thermalvia: Schmidt’s approximation is close for η ≥ 0.5 and optimistic below', () => {
    // φ = (ρ − 1)·(1 + 0.35·ln ρ) = 9·(1 + 0.35·2.302585) = 16.253143; x_b·φ = 1.6253143
    // tanh(1.6253143)/1.6253143 = 0.925391/1.6253143 = 0.569362 (exact 0.566536: +0.5 %)
    near(schmidtFinEfficiency(0.1, 1), 0.569362, 1e-5);
    eq(schmidtFinEfficiency(0.1, 0.1), 1);
    let worst = 0;
    for (let rho = 1.1; rho < 40; rho *= 1.15) {
      for (let xb = 0.005; xb < 3; xb *= 1.2) {
        const exact = annularFinEfficiency(xb, xb * rho);
        if (exact >= 0.5) worst = Math.max(worst, Math.abs(schmidtFinEfficiency(xb, xb * rho) / exact - 1));
      }
    }
    ok(worst < 0.03, `within 3 % for η ≥ 0.5, worst ${worst}`);
    // A large thin plane, x_b = 0.2, x_e = 2: exact 0.261485, Schmidt 0.306710 (+17 %): why the engine uses the exact form.
    near(annularFinEfficiency(0.2, 2), 0.261485, 1e-5);
    ok(schmidtFinEfficiency(0.2, 2) > 1.15 * annularFinEfficiency(0.2, 2), 'optimistic for η < 0.5');
  }],

  ['thermalvia: copper area to air', () => {
    const c = copperToAmbient(round);
    near(c.rbMm, 3.162278, 1e-6); // √10
    near(c.reMm, 31.62278, 1e-6);
    near(c.mPerM, 31.62278, 1e-6); // √(19/0.019)
    near(c.xb, 0.1, 1e-9);
    near(c.xe, 1, 1e-9);
    near(c.eta, 0.566536, 1e-5);
    // Fin area 1000π − 10π = 3110.177 mm²; the pad counts once at the base temperature:
    // θ_CA = 1 / (9.5·(31.416e-6 + 2·0.566536·3110.177e-6)) = 1 / (9.5·3555.471e-6) = 29.606 °C/W
    near(c.thetaKW, 29.606, 1e-4);
    // Isothermal plane: 1 / (9.5·(31.416e-6 + 2·3110.177e-6)) = 1 / (9.5·6251.770e-6) = 16.8373 °C/W
    near(c.thetaIsothermalKW, 16.8373, 1e-5);
    // Unbounded plane: η·A_fin → 2π·r_b·K1(0.1)/(m·K0(0.1)) = 6.283185e-4·4.059977 = 2550.96 mm²
    // θ = 1 / (9.5·(31.416e-6 + 2·2550.96e-6)) = 1 / (9.5·5133.34e-6) = 20.5058 °C/W
    near(c.thetaUnboundedKW, 20.5058, 1e-5);
    near(copperToAmbient({ ...round, copperAreaMm2: 1e9 }).thetaKW, c.thetaUnboundedKW, 1e-6);
    // One face with twice the coefficient has the same m and η; only the pad term differs:
    // 1 / (19·(31.416e-6 + 0.566536·3110.177e-6)) = 1 / (19·1793.443e-6) = 29.3467 °C/W
    const one = copperToAmbient({ ...round, sides: 1, hWm2K: 19 });
    near(one.eta, c.eta, 1e-12);
    near(one.thetaKW, 29.3467, 1e-4);
    // The values shown in the efficiency step are the Bessel functions at x_b and x_e.
    near(c.bessel.k1b, 9.8538448, 1e-7);
    near(c.bessel.i1e, 0.5651591, 1e-7);
  }],

  ['thermalvia: the chain to the junction temperature', () => {
    // Pad 5 × 2π mm (10π mm²), nine vias: θ_vias = 18.3282; laminate 31.4159 − 0.8659 = 30.5500 mm²
    // → 1.6e-3/(0.3·30.5500e-6) = 174.577; θ_PB = 1 / (0.0545607 + 0.0057281) = 16.5868 °C/W
    const r = thermalVia({ ...base, ...round, padWMm: 5, padLMm: 2 * Math.PI, powerW: 1.5, thetaJcKW: 2, ambientC: 25 });
    near(r.padAreaMm2, 31.41593, 1e-6);
    near(r.thetaPbKW, 16.5868, 1e-5);
    near(r.thetaCaKW, 29.606, 1e-4);
    // θ_JA = 2 + 16.5868 + 29.6060 = 48.1928 °C/W; T_j = 25 + 1.5·48.1928 = 97.289 °C
    near(r.thetaJaKW, 48.1928, 1e-5);
    near(r.thetaPadAmbientKW, 46.1928, 1e-5);
    near(r.tjC, 97.289, 1e-5);
    near(r.marginC, 27.711, 1e-4);
    // P_max = (125 − 25)/48.1928 = 2.0750 W
    near(r.maxPowerW, 2.0750, 1e-4);
    // Node temperatures: pad 97.289 − 1.5·2 = 94.289 °C, far-side copper 25 + 1.5·29.606 = 69.409 °C
    near(r.tPadC, 94.289, 1e-5);
    near(r.tCopperC, 69.409, 1e-5);
    near(r.tPadC - r.powerW * r.thetaPbKW, r.tCopperC, 1e-9);
    // Shares 2/48.19 = 4.1 %, 16.59/48.19 = 34.4 %, 29.61/48.19 = 61.4 %: copper → air is the largest.
    near(r.share.jc, 0.0415, 1e-3);
    near(r.share.pb, 0.3442, 1e-3);
    near(r.share.ca, 0.6143, 1e-3);
    eq(r.dominant, 'ca');
    eq(r.warnings.length, 0);
    eq(thermalVia(base).warnings.length, 0, 'the default inputs raise no warning');
  }],

  ['thermalvia: copper area needed for Tj,max (numerical solve, round trip)', () => {
    // The area that gives the θ_CA of the round case is the area of the round case.
    const back = copperAreaForTheta({ ...round, thetaKW: copperToAmbient(round).thetaKW });
    eq(back.status, 'ok');
    near(back.areaMm2, 1000 * Math.PI, 1e-8);
    near(back.eta, 0.566536, 1e-5);
    // In the chain: θ_CA,req = (125 − 40)/1 − 3 − 16.9245 = 65.0755 °C/W, and that area gives T_j = T_j,max.
    const r = thermalVia(base);
    eq(r.need.status, 'ok');
    near(r.need.thetaCaKW, 65.0755, 1e-5);
    ok(r.need.areaMm2 < base.copperAreaMm2, 'less copper than entered is needed while Tj is below the limit');
    near(thermalVia({ ...base, copperAreaMm2: r.need.areaMm2 }).tjC, 125, 1e-8);
    // Copper the size of the pad is enough: 1/(h_c·A_pad) = 1/(9.5·31.416e-6) = 3350.6 °C/W.
    eq(copperAreaForTheta({ ...round, thetaKW: 3400 }).status, 'padOnly');
    // Below the unbounded plane (20.5058 °C/W) no area is enough; just above it a very large one is.
    const no = copperAreaForTheta({ ...round, thetaKW: 20.4 });
    eq(no.status, 'limit');
    near(no.thetaUnboundedKW, 20.5058, 1e-5);
    eq(copperAreaForTheta({ ...round, thetaKW: 20.52 }).status, 'ok');
    // 2 W: the budget 85/2 − 3 − 16.92 = 22.58 °C/W is below the floor of this plane (28.27 °C/W).
    eq(thermalVia({ ...base, powerW: 2 }).need.status, 'limit');
    // No vias: θ_JC + θ_PB = 216.3 °C/W already exceeds the budget of 85 °C/W.
    eq(thermalVia({ ...base, count: 0 }).need.status, 'chain');
  }],

  ['thermalvia: each warning', () => {
    const w = (o) => thermalVia({ ...base, ...o }).warnings;
    ok(w({ powerW: 2 }).includes('tv_tjHigh'), 'Tj above the limit');
    ok(!w({}).includes('tv_tjHigh'), 'not at 1 W');
    ok(w({ count: 25 }).includes('tv_noFit'), '25 vias, 16 fit');
    ok(!w({ count: 16 }).includes('tv_noFit'), '16 fit');
    ok(w({ copperAreaMm2: 10000 }).includes('tv_etaLow'), '100 cm² of 1 oz copper: η = 0.17');
    near(thermalVia({ ...base, copperAreaMm2: 10000 }).fin.eta, 0.1717, 1e-3);
    ok(w({ sides: 1 }).includes('tv_domCopper'), 'one face: copper → air is 77 %');
    ok(w({ count: 0 }).includes('tv_domVia'), 'no vias: the laminate is 83 %');
    ok(w({ thetaJcKW: 200 }).includes('tv_domJc'), 'θJC 200 °C/W');
    ok(w({ platingUm: 18 }).includes('tv_platingThin'), '18 µm plating');
    ok(!w({ platingUm: 20 }).includes('tv_platingThin'), '20 µm is not thin');
  }],

  ['thermalvia: invalid input', () => {
    const e = (o) => thermalVia({ ...base, ...o });
    eq(e({ powerW: 0 }).ok, false);
    eq(e({ powerW: 0 }).errors[0], 'tv_positive');
    eq(e({ count: 2.5 }).errors[0], 'tv_positive');
    eq(e({ count: -1 }).errors[0], 'tv_positive');
    eq(e({ sides: 3 }).errors[0], 'tv_positive');
    eq(e({ thetaJcKW: -1 }).errors[0], 'tv_positive');
    eq(e({ hWm2K: NaN }).errors[0], 'tv_positive');
    eq(e({ thetaJcKW: 0 }).ok, true, 'θJC = 0 is allowed');
    // Pitch must exceed the drilled hole (0.35 mm).
    ok(e({ pitchMm: 0.35 }).errors.includes('tv_pitch'), 'pitch');
    // 300 holes of 0.0962 mm² are more than the 25 mm² pad.
    ok(e({ count: 300 }).errors.includes('tv_holes'), 'holes');
    ok(e({ copperAreaMm2: 25 }).errors.includes('tv_copperSmall'), 'copper not larger than the pad');
    ok(e({ tjMaxC: 40 }).errors.includes('tv_tjMax'), 'limit at the ambient');
  }],

  ['thermalvia: forced-air presets from the laminar flat-plate relation', () => {
    // Air at 300 K: ν = 15.89e-6 m²/s, k = 0.0263 W/m·K, Pr = 0.707 → Pr^⅓ = 0.8909.
    // 1 m/s over 50 mm: Re = 0.05/15.89e-6 = 3146.6, Nu = 0.664·56.095·0.8909 = 33.18, h = 33.18·0.0263/0.05 = 17.45 W/m²·K
    near(laminarPlateH(1, 0.05), 17.45, 1e-3);
    // 3 m/s: ×√3 = 30.23 W/m²·K
    near(laminarPlateH(3, 0.05), 30.23, 1e-3);
    eq(Math.round(laminarPlateH(1, 0.05)), 17);
    eq(Math.round(laminarPlateH(3, 0.05)), 30);
  }],
];
