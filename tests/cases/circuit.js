// Circuit-basics engine tests: E-series, Ohm's law, dividers, LED, RC/RL/LC
// and the unit converter. Reference values are worked out by hand in the
// comments next to each assertion.

import { near, eq, ok } from '../assert.js';
import {
  SERIES, TOLERANCE, decadeValues, nearestStandard, bracketStandard, valuesBetween,
  bestSeriesPair, bestParallelPair,
} from '../../src/engine/eseries.js';
import {
  ohmsLaw, powerRating, dividerAnalyse, dividerDesign, bestDividerPair, feedbackDivider,
  ledResistor, rcCircuit, rlCircuit, lcCircuit, reactance,
} from '../../src/engine/circuit.js';
import {
  convertLength, convertCopper, convertTemperature, convertRfPower, convertDb,
  awgDiameterMm, awgWire, nearestAwg, awgName,
} from '../../src/engine/convert.js';

// Series values as published integers: 2 digits for E3–E24, 3 digits for E48–E192.
const ints = (name) => {
  const k = ['E3', 'E6', 'E12', 'E24'].includes(name) ? 10 : 100;
  return decadeValues(name).map((m) => Math.round(m * k));
};

export const cases = [
  // ---------------------------------------------------------------- E-series
  ['E-series: list lengths E3…E192', () => {
    for (const s of SERIES) eq(decadeValues(s).length, Number(s.slice(1)), s);
  }],
  ['E-series: E24 keeps the historical 2-digit values', () => {
    // IEC 60063: 2.7 3.0 3.3 3.6 3.9 4.3 4.7 5.1 5.6 6.2 6.8 7.5 8.2 9.1 (formula would give 2.6, 2.9, 3.2 …)
    const e24 = ints('E24');
    const tail = [27, 30, 33, 36, 39, 43, 47, 51, 56, 62, 68, 75, 82, 91];
    eq(e24.slice(10).join(), tail.join(), 'E24 tail');
    eq(ints('E12').join(), '10,12,15,18,22,27,33,39,47,56,68,82', 'E12');
    eq(ints('E6').join(), '10,15,22,33,47,68', 'E6');
    eq(ints('E3').join(), '10,22,47', 'E3');
  }],
  ['E-series: E48/E96/E192 match round(100·10^(i/n)), except E192 9.20', () => {
    for (const s of ['E48', 'E96', 'E192']) {
      const n = Number(s.slice(1));
      ints(s).forEach((v, i) => {
        const f = Math.round(100 * 10 ** (i / n));
        // Only deviation in the published tables: E192 index 185 → 920 (formula 919).
        eq(v, s === 'E192' && i === 185 ? 920 : f, `${s}[${i}]`);
      });
    }
    // E96 is every 2nd E192 value, E48 every 2nd E96 value.
    const e48 = ints('E48'); const e96 = ints('E96'); const e192 = ints('E192');
    e96.forEach((v, i) => eq(v, e192[2 * i], `E96[${i}]`));
    e48.forEach((v, i) => eq(v, e96[2 * i], `E48[${i}]`));
  }],
  ['E-series: tolerances', () => {
    eq(TOLERANCE.E6.pct, 20); eq(TOLERANCE.E12.pct, 10); eq(TOLERANCE.E24.pct, 5);
    eq(TOLERANCE.E48.pct, 2); eq(TOLERANCE.E96.pct, 1); eq(TOLERANCE.E192.pct, 0.5);
    ok(TOLERANCE.E3.over, 'E3 is wider than 20 %');
  }],
  ['E-series: nearest 5 kΩ in E12', () => {
    // E12 brackets 4.7 k and 5.6 k; |4700−5000| = 300 < |5600−5000| = 600 → 4.7 k, −300/5000 = −6 %
    const r = nearestStandard(5000, 'E12');
    eq(r.below, 4700); eq(r.above, 5600); eq(r.nearest, 4700);
    near(r.errorPct, -6, 1e-9);
  }],
  ['E-series: exact value and decade wrap', () => {
    const a = nearestStandard(4700, 'E24');
    eq(a.below, 4700); eq(a.above, 4700); near(a.errorPct, 0, 1e-12);
    // 9.5 k in E12: 8.2 k / 10 k; 10000−9500 = 500 < 1300 → 10 k, +500/9500 = +5.263 %
    const b = nearestStandard(9500, 'E12');
    eq(b.below, 8200); eq(b.above, 10000); eq(b.nearest, 10000);
    near(b.errorPct, 5.2632, 1e-4);
    // 12.3 mΩ-scale in E96: 1.21 / 1.24 → 0.0124 is 0.0001 away (+0.813 %)
    const c = nearestStandard(0.0123, 'E96');
    eq(c.below, 0.0121); eq(c.above, 0.0124); eq(c.nearest, 0.0124);
    near(c.errorPct, 0.81301, 1e-4);
    // E192 uses 9.20, not 9.19
    eq(bracketStandard(9.2, 'E192').below, 9.2);
    eq(bracketStandard(9.195, 'E192').above, 9.2);
  }],
  ['E-series: valuesBetween is inclusive and ascending', () => {
    // E6 from 1 k to 10 k: 1.0 1.5 2.2 3.3 4.7 6.8 k and 10 k
    eq(valuesBetween(1000, 10000, 'E6').join(), '1000,1500,2200,3300,4700,6800,10000');
  }],
  ['E-series: best parallel pair 5 kΩ (E12) = 10 k ∥ 10 k', () => {
    // 10 k ∥ 10 k = 10k·10k / 20k = 5 k exactly
    const p = bestParallelPair(5000, 'E12');
    eq(p.a, 10000); eq(p.b, 10000); near(p.value, 5000, 1e-12); near(p.errorPct, 0, 1e-9);
  }],
  ['E-series: best series pair 4.8 kΩ (E24) = 2.4 k + 2.4 k', () => {
    // exact options 2.4k+2.4k, 3.6k+1.2k, 3.3k+1.5k, 4.7k+100 … → tie broken by the smallest value ratio
    const p = bestSeriesPair(4800, 'E24');
    eq(p.a, 2400); eq(p.b, 2400); near(p.errorPct, 0, 1e-9);
  }],
  ['E-series: best series pair 5 kΩ (E12) = 4.7 k + 330', () => {
    // 4.7k+330 = 5030 (+0.6 %) and 4.7k+270 = 4970 (−0.6 %) tie; ratio 14.2 < 17.4 → 330.
    // Nothing closer: 3.9k needs 1.1k (→ 1.0k/1.2k, ±2 %), 3.3k needs 1.7k (→ 1.5k/1.8k) …
    const p = bestSeriesPair(5000, 'E12');
    eq(p.a, 4700); eq(p.b, 330); eq(p.value, 5030); near(p.errorPct, 0.6, 1e-9);
  }],

  // ---------------------------------------------------------------- Ohm's law
  ['Ohm: every pair gives 12 V, 100 mA, 120 Ω, 1.2 W', () => {
    // V·I = 1.2 W, V/I = 120 Ω; √(P·R) = √144 = 12 V; √(P/R) = √0.01 = 0.1 A; V²/P = 144/1.2 = 120 Ω
    const k = { V: 12, I: 0.1, R: 120, P: 1.2 };
    for (const pair of ['VI', 'VR', 'IR', 'PV', 'PI', 'PR']) {
      const r = ohmsLaw(pair, k);
      near(r.V, 12, 1e-9, `${pair} V`); near(r.I, 0.1, 1e-9, `${pair} I`);
      near(r.R, 120, 1e-9, `${pair} R`); near(r.P, 1.2, 1e-9, `${pair} P`);
    }
  }],
  ['Power rating with 2× margin', () => {
    eq(powerRating(0.05), 0.1);      // 2 × 0.05 = 0.1 W → 1/10 W exactly
    eq(powerRating(0.0361), 0.1);    // 72.2 mW → 1/10 W
    eq(powerRating(0.3), 1);         // 0.6 W → next is 1 W
    eq(powerRating(1.2), null);      // 2.4 W > 2 W
  }],

  // ---------------------------------------------------------------- Dividers
  ['Divider: analyse 12 V, 10 k / 4.7 k, RL 10 k', () => {
    // Vout = 12·4.7/14.7 = 3.83673 V; I = 12/14.7k = 816.33 µA; Rth = 10k·4.7k/14.7k = 3197.28 Ω
    const a = dividerAnalyse({ vin: 12, r1: 10e3, r2: 4.7e3 });
    near(a.voutOpen, 3.836735, 1e-6); near(a.iDivider, 816.3265e-6, 1e-6); near(a.rth, 3197.279, 1e-6);
    ok(!a.loaded, 'unloaded');
    // R2′ = 4.7k ∥ 10k = 3197.28 Ω; Vout = 12·3197.28/13197.28 = 2.90722 V (−24.23 %)
    const b = dividerAnalyse({ vin: 12, r1: 10e3, r2: 4.7e3, rl: 10e3 });
    near(b.vout, 2.907216, 1e-6); near(b.loadErrorPct, -24.2268, 1e-5);
    // P_R1 = (12 − 2.90722)² / 10k = 8.268 mW; P_R2 = 2.90722² / 4.7k = 1.798 mW
    near(b.pR1, (12 - 2.907216) ** 2 / 10e3, 1e-5); near(b.pR2, 2.907216 ** 2 / 4.7e3, 1e-5);
  }],
  ['Divider: design 10 V → 5 V, E12, ~20 kΩ', () => {
    // ratio 0.5 → equal resistors; 10k + 10k hits the 20 k total exactly
    const p = bestDividerPair(0.5, 20e3, 'E12');
    eq(p.r1, 10000); eq(p.r2, 10000); near(p.errorPct, 0, 1e-9);
  }],
  ['Divider: design 12 V → 3 V, E24, ~50 kΩ', () => {
    // R1 = 3·R2 exactly for 30k/10k (40k), 33k/11k (44k), 36k/12k (48k), 39k/13k (52k);
    // closest sum to 50 k in log terms: ln(52/50) = 0.0392 < ln(50/48) = 0.0408 → 39 k / 13 k
    const d = dividerDesign({ vin: 12, vout: 3, rTotal: 50e3, series: 'E24' });
    ok(d.ok, 'ok');
    eq(d.pair.r1, 39000); eq(d.pair.r2, 13000); near(d.voutStd, 3, 1e-12);
    near(d.r1Exact, 37500, 1e-12); near(d.r2Exact, 12500, 1e-12); // 50k·0.75 and 50k·0.25
    near(d.current, 12 / 52e3, 1e-9);
    ok(!dividerDesign({ vin: 3, vout: 5, rTotal: 10e3, series: 'E24' }).ok, 'Vout ≥ Vin rejected');
  }],
  ['Divider: regulator feedback 0.8 V → 3.3 V, R2 = 10 k, E24', () => {
    // R1 = 10k·(3.3/0.8 − 1) = 31.25 k; E24 30 k → 0.8·(1+3) = 3.2 V (−3.03 %), 33 k → 3.44 V → 30 k
    const f = feedbackDivider({ vref: 0.8, vout: 3.3, r2: 10e3, series: 'E24' });
    near(f.r1Exact, 31250, 1e-12); eq(f.r1, 30000); near(f.vout, 3.2, 1e-12);
    near(f.errorPct, -3.0303, 1e-4); near(f.iFb, 80e-6, 1e-12);
    // R2 free within 3.16 k … 31.6 k: 75 k / 24 k = 3.125 exactly → 0.8·4.125 = 3.3 V
    eq(f.pair.r1, 75000); eq(f.pair.r2, 24000); near(f.pair.vout, 3.3, 1e-12);
    ok(!feedbackDivider({ vref: 1.25, vout: 1.2, r2: 10e3, series: 'E24' }).ok, 'Vout ≤ Vref rejected');
  }],

  // ---------------------------------------------------------------- LED
  ['LED: 5 V, white 3.1 V, 20 mA, E24', () => {
    // R = (5 − 3.1)/0.02 = 95 Ω → E24 91 / 100; recommended ≥ R = 100 Ω → I = 1.9/100 = 19 mA
    // nearest: |95−91| = 4 < 5 → 91 Ω → 1.9/91 = 20.879 mA
    // P_R = 1.9 · 0.019 = 36.1 mW → 2× = 72.2 mW → 1/10 W; P_LED = 3.1 · 0.019 = 58.9 mW; η = 3.1/5 = 62 %
    const r = ledResistor({ vs: 5, vf: 3.1, current: 0.02, count: 1, series: 'E24' });
    ok(r.ok, 'ok');
    near(r.rExact, 95, 1e-9); eq(r.rRec, 100); eq(r.rNearest, 91);
    near(r.iRec, 0.019, 1e-9); near(r.iNearest, 0.0208791, 1e-5);
    near(r.pR, 0.0361, 1e-9); eq(r.rating, 0.1);
    near(r.pLed, 0.0589, 1e-9); near(r.efficiency, 0.62, 1e-12);
  }],
  ['LED: standard value hit, series string, headroom error', () => {
    // (5 − 2.0)/0.02 = 150 Ω is an E12 value → 20 mA exactly
    const a = ledResistor({ vs: 5, vf: 2.0, current: 0.02, count: 1, series: 'E12' });
    eq(a.rRec, 150); near(a.iRec, 0.02, 1e-12);
    // 3 × 3.0 V on 12 V: (12 − 9)/0.01 = 300 Ω (E24) → total LED power 9 V · 10 mA = 90 mW
    const b = ledResistor({ vs: 12, vf: 3.0, current: 0.01, count: 3, series: 'E24' });
    eq(b.rRec, 300); near(b.pLeds, 0.09, 1e-9); near(b.efficiency, 0.75, 1e-12);
    // 2 × 3.1 = 6.2 V > 5 V
    const c = ledResistor({ vs: 5, vf: 3.1, current: 0.02, count: 2, series: 'E24' });
    ok(!c.ok, 'not ok'); eq(c.errors[0], 'led_headroom');
  }],

  // ---------------------------------------------------------------- RC / RL / LC
  ['RC: 10 kΩ, 100 nF', () => {
    // τ = 1e4 · 1e-7 = 1 ms; fc = 1/(2π · 1 ms) = 159.155 Hz
    const r = rcCircuit(10e3, 100e-9);
    near(r.tau, 1e-3, 1e-12); near(r.fc, 159.15494, 1e-7);
    near(r.rise, 2.1972246e-3, 1e-7);   // ln 9 · τ
    near(r.t90, 2.3025851e-3, 1e-7);    // ln 10 · τ
    near(r.t99, 4.6051702e-3, 1e-7);    // ln 100 · τ
    near(r.t50, 0.6931472e-3, 1e-7);    // ln 2 · τ
  }],
  ['RL: 10 Ω, 100 µH', () => {
    // τ = 100µ/10 = 10 µs; fc = 10/(2π · 100 µH) = 15.9155 kHz
    const r = rlCircuit(10, 100e-6);
    near(r.tau, 10e-6, 1e-12); near(r.fc, 15915.494, 1e-7);
  }],
  ['LC: 10 µH, 100 nF, R = 1 Ω', () => {
    // √(LC) = √1e-12 = 1 µs → f0 = 1/(2π µs) = 159.155 kHz; Z0 = √(1e-5/1e-7) = 10 Ω
    // Q = 10/1 = 10; BW = 159.155k/10 = 15.9155 kHz; ζ = 1/20 = 0.05
    const r = lcCircuit(10e-6, 100e-9, 1);
    near(r.f0, 159154.94, 1e-7); near(r.z0, 10, 1e-12);
    near(r.q, 10, 1e-12); near(r.bw, 15915.494, 1e-7); near(r.zeta, 0.05, 1e-12);
    ok(!('q' in lcCircuit(10e-6, 100e-9, NaN)), 'no Q without R');
  }],
  ['Reactance at 1 MHz: 10 µH and 100 nF', () => {
    // XL = 2π · 1e6 · 1e-5 = 62.832 Ω; XC = 1/(2π · 1e6 · 1e-7) = 1.59155 Ω
    const r = reactance(1e6, 10e-6, 100e-9);
    near(r.xl, 62.831853, 1e-7); near(r.xc, 1.5915494, 1e-7);
    near(r.xSeries, 62.831853 - 1.5915494, 1e-7); near(r.f0, 159154.94, 1e-7);
    ok(Number.isNaN(reactance(1e6, NaN, 100e-9).xl), 'XL omitted');
  }],

  // ---------------------------------------------------------------- Units
  ['Units: length', () => {
    // 1 in = 25.4 mm = 1000 mil = 25 400 µm = 2.54 cm = 0.0254 m
    const a = convertLength(1, 'in');
    near(a.mm, 25.4, 1e-12); near(a.mil, 1000, 1e-12); near(a.um, 25400, 1e-12);
    near(a.cm, 2.54, 1e-12); near(a.m, 0.0254, 1e-12);
    near(convertLength(1, 'mm').mil, 39.370079, 1e-7); // 1/0.0254
  }],
  ['Units: copper weight', () => {
    // 1 oz = 34.79 µm = 34.79/25.4 = 1.36969 mil; IPC-2221 1.378 mil; 28.3495 g / 0.092903 m² = 305.152 g/m²
    const a = convertCopper(1, 'oz');
    near(a.um, 34.79, 1e-12); near(a.mil, 1.369685, 1e-6); near(a.ipcMil, 1.378, 1e-12);
    near(a.gsm, 305.1517, 1e-6);
    near(convertCopper(70, 'um').oz, 2.012072, 1e-6); // 70/34.79
    near(convertCopper(1.4, 'mil').um, 35.56, 1e-12); // 1.4 · 25.4
  }],
  ['Units: temperature', () => {
    const a = convertTemperature(25, 'C');
    near(a.F, 77, 1e-12); near(a.K, 298.15, 1e-12); // 25·9/5 + 32; 25 + 273.15
    near(convertTemperature(-40, 'F').C, -40, 1e-12); // (−40 − 32)·5/9
    near(convertTemperature(0, 'K').C, -273.15, 1e-12);
    ok(!convertTemperature(-1, 'K').ok, 'below absolute zero');
  }],
  ['Units: RF power', () => {
    // 0 dBm = 1 mW; 50 Ω: Vrms = √(1e-3·50) = 223.607 mV, Vpp = 2√2·Vrms = 632.46 mV,
    // dBµV = 20·log10(223607) = 106.99
    const a = convertRfPower(0, 'dBm', 50);
    near(a.W, 1e-3, 1e-12); near(a.vrms, 0.2236068, 1e-6); near(a.vpp, 0.6324555, 1e-6);
    near(a.dBuV, 106.9897, 1e-6); near(a.dBW, -30, 1e-12);
    near(convertRfPower(1, 'W', 50).dBm, 30, 1e-12);
    // 1 Vpp → Vrms = 0.35355 V → P = 0.125/50 = 2.5 mW → 10·log10(2.5) = 3.9794 dBm
    near(convertRfPower(1, 'Vpp', 50).dBm, 3.9794, 1e-5);
    near(convertRfPower(0, 'dBm', 600).vrms, 0.7745967, 1e-6); // √0.6
    near(convertRfPower(106.9897, 'dBµV', 50).dBm, 0, 1e-3);
    ok(!convertRfPower(0, 'W', 50).ok, '0 W has no dB value');
  }],
  ['Units: dB ratios', () => {
    // 3 dB → 10^0.3 = 1.99526 (power), 10^0.15 = 1.41254 (voltage)
    const a = convertDb(3, 'dB');
    near(a.power, 1.9952623, 1e-7); near(a.voltage, 1.4125375, 1e-7);
    near(convertDb(2, 'vr').dB, 6.0205999, 1e-7); // 20·log10 2
    near(convertDb(2, 'vr').power, 4, 1e-12);
    near(convertDb(0.5, 'pr').dB, -3.0103, 1e-5); // 10·log10 0.5
    ok(!convertDb(-1, 'pr').ok, 'negative ratio rejected');
  }],
  ['Units: AWG', () => {
    near(awgDiameterMm(36), 0.127, 1e-12);          // 92^0 = 1
    near(awgDiameterMm(-3), 11.684, 1e-12);         // 4/0: 0.127 · 92 = 11.684 mm (0.46 in)
    // AWG 10: 0.127 · 92^(26/39) = 0.127 · 92^(2/3) = 2.58819 mm; A = 5.26115 mm²;
    // R = 1.724e-8 / 5.26115e-6 = 3.27685 mΩ/m; (101.897 mil)² = 10.383 kcmil
    const w = awgWire(10);
    near(w.dMm, 2.588187, 1e-6); near(w.areaMm2, 5.261155, 1e-6);
    near(w.ohmPerKm, 3.276847, 1e-6); near(w.kcmil, 10.38302, 1e-6);
    near(awgWire(24).ohmPerKm, 84.20834, 1e-6);     // 1.724e-8 / 0.204730e-6 · 1000
    // 1.0 mm → n = 36 − 39·ln(1/0.127)/ln 92 = 18.20 → AWG 18 (1.0237 mm) beats 19 (0.9116 mm)
    const n = nearestAwg(1.0);
    near(n.exact, 18.20192, 1e-6); eq(n.n, 18); ok(!n.clamped, 'not clamped');
    const big = nearestAwg(20);                     // n ≈ −7.64 → clamped to 4/0
    eq(big.n, -3); ok(big.clamped, 'clamped');
    eq(awgName(-3), '4/0'); eq(awgName(-1), '2/0'); eq(awgName(0), '1/0'); eq(awgName(12), '12');
  }],
];
