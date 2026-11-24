import { near, eq, ok } from '../assert.js';
import { minimumSpacingMm, maxVoltageForSpacing, bandIndex } from '../../src/engine/spacing.js';
import { thicknessToMil, tempToC, riseToC, currentToA, toMm } from '../../src/engine/units.js';
import { calculateVia, viaInductanceNh, viaCapacitancePf } from '../../src/engine/via.js';
import {
  ipc2221WidthMil, ipc2221CurrentA, ipc2221RiseC, ipc2152BaseAreaMil2, copperModifier, boardModifier,
  planeModifier, calculateTraceWidth,
} from '../../src/engine/trace-width.js';
import { calculatePadstack } from '../../src/engine/padstack.js';
import { onderdonkCurrent, onderdonkTime, preeceCurrent, calculateFusing } from '../../src/engine/fusing.js';

export const cases = [
  ['trace IPC-2221: 1 A, 10 °C, 1 oz external ≈ 11.83 mil', () => {
    near(ipc2221WidthMil(1, 10, 1.378, true), 11.825, 1e-3);
    // NBS free-air data point (Jouppi): 36 mil² carries ≈ 0.89 A at 10 °C on the internal curve
    near(ipc2221CurrentA(36, 10, false), 0.887, 2e-3);
    near(ipc2221RiseC(1, 16.2948, true), 10, 1e-3);
  }],

  ['trace IPC-2152: baseline fit 10 A / 20 °C ≈ 513 mil²', () => {
    near(ipc2152BaseAreaMil2(10, 20), 513.0, 1e-3);
    near(copperModifier(1, 10), 0.8396, 1e-3); // −0.0318·ln10 + 0.9128
    near(copperModifier(3, 10), 1, 1e-12);
    near(boardModifier(70), 1, 2e-3); // baseline board 0.070"
    near(planeModifier(100), 0.7154, 1e-4);
    eq(planeModifier(500), 1);
  }],

  ['trace: width → current → rise round trips (both standards)', () => {
    for (const standard of ['ipc2152', 'ipc2221']) {
      const base = { standard, isExternal: true, thicknessMil: 1.378, boardMm: 1.6, planeMm: 0.2 };
      const w = calculateTraceWidth({ ...base, mode: 'width', currentA: 3, deltaTC: 20 });
      const i = calculateTraceWidth({ ...base, mode: 'current', widthMil: w.widthMil, deltaTC: 20 });
      const r = calculateTraceWidth({ ...base, mode: 'rise', widthMil: w.widthMil, currentA: 3 });
      near(i.currentA, 3, 1e-6, standard);
      near(r.deltaTC, 20, 1e-6, standard);
    }
  }],

  ['trace: plane and margin behave physically', () => {
    const base = { standard: 'ipc2152', mode: 'width', currentA: 5, deltaTC: 10, thicknessMil: 1.378, boardMm: 1.6 };
    const noPlane = calculateTraceWidth(base).widthMil;
    ok(calculateTraceWidth({ ...base, planeMm: 0.2 }).widthMil < noPlane, 'plane narrows the trace');
    near(calculateTraceWidth({ ...base, marginPct: 20 }).widthMil, calculateTraceWidth({ ...base, currentA: 6 }).widthMil, 1e-12);
    const minW = calculateTraceWidth({ ...base, currentA: 0.01, minWidthMil: 4 });
    eq(minW.widthMil, 4);
    ok(minW.warnings.includes('minWidthApplied'), 'min width warning');
    // IPC-2152 needs far less width than IPC-2221 internal at moderate current
    ok(calculateTraceWidth(base).compare.ipc2221Int > noPlane, 'IPC-2221 internal is more conservative');
  }],

  ['trace: etch factor, plating and AC resistance', () => {
    const base = { standard: 'ipc2221', mode: 'width', isExternal: true, currentA: 1, deltaTC: 10, thicknessMil: 1.378 };
    // 1:1 etch adds the full thickness to the drawn width (trapezoid area = t·(W − t))
    near(calculateTraceWidth({ ...base, etch: '1:1' }).widthMil, 11.825 + 1.378, 1e-3);
    near(calculateTraceWidth({ ...base, etch: '2:1' }).widthMil, 11.825 + 0.689, 1e-3);
    // Plating adds thickness: same area over 1.378 + 0.787 mil
    near(calculateTraceWidth({ ...base, platingMil: 20 / 25.4 }).widthMil, 16.2948 / (1.378 + 20 / 25.4), 1e-3);
    const r = calculateTraceWidth({ ...base, lengthM: 0.1, fHz: 1e3 });
    near(r.dc.acFactor, 1.0082, 1e-3); // δ ≫ t → ≈ 1 + t/(2δ) (δ ≈ 2.1 mm at 1 kHz)
    const hf = calculateTraceWidth({ ...base, lengthM: 0.1, fHz: 1e9 });
    ok(hf.dc.acFactor > 15 && hf.dc.acFactor < 19, `HF factor ${hf.dc.acFactor}`); // ≈ t/δ
    near(calculateTraceWidth(base).currentDensity, 1 / (16.2948 * 6.4516e-4), 1e-3);
  }],

  ['via: stub quarter-wave resonance', () => {
    // 1 mm stub in εr 4 → c / (4 · 0.001 · 2) = 37.47 GHz
    const r = calculateVia({ drillMm: 0.3, lengthMm: 1.6, platingUm: 25, stubMm: 1, er: 4 });
    near(r.stub.quarterWaveHz, 37.474e9, 1e-4);
  }],

  ['trace: DC analysis at ambient + ΔT', () => {
    const r = calculateTraceWidth({
      standard: 'ipc2221', mode: 'width', isExternal: true, currentA: 1, deltaTC: 10,
      thicknessMil: 1.378, ambientC: 25, lengthM: 0.05,
    });
    near(r.dc.conductorC, 35, 1e-12);
    near(r.dc.resistanceOhm, 0.086828, 2e-3);
  }],

  ['padstack: IPC-2221 land = a + 2b + c', () => {
    // Via 0.3 mm ±0.075, level B: a = 0.375; ext = 0.375 + 0.1 + 0.25 = 0.725 mm
    const v = calculatePadstack({ kind: 'via', holeMm: 0.3, tolMm: 0.075, level: 'B', drillAllowMm: 0.1 });
    near(v.landExt, 0.725, 1e-12);
    // Internal uses the drilled hole: a = 0.375 + 0.1, b = 0.025 → 0.475 + 0.05 + 0.25
    near(v.landInt, 0.775, 1e-12);
    // IPC-2222 example: 1.0 mm lead, level B → min hole 1.2 mm
    const c = calculatePadstack({ kind: 'round', leadMm: 1.0, tolMm: 0.05, level: 'B', padMm: 2.0 });
    near(c.minHole, 1.2, 1e-12);
    ok(c.check.class3Ext, 'class 3 ok with 2.0 mm pad');
  }],

  ['padstack: heavy copper adds 0.05 mm per oz above 1', () => {
    const a = calculatePadstack({ kind: 'via', holeMm: 0.3, tolMm: 0, level: 'B', copperOz: 1 });
    const b = calculatePadstack({ kind: 'via', holeMm: 0.3, tolMm: 0, level: 'B', copperOz: 3 });
    near(b.landExt - a.landExt, 0.1, 1e-12);
  }],

  ['via: 0.3 mm drill, 1.6 mm, 25 µm — DC', () => {
    // A = π(0.175² − 0.15²) mm² = 0.025525 mm²; R = 1.724e-8 · 1.6e-3 / 2.5525e-8 = 1.0806 mΩ
    const r = calculateVia({ drillMm: 0.3, lengthMm: 1.6, platingUm: 25, currentA: 1 });
    ok(r.ok, 'ok');
    near(r.aspectRatio, 5.3333, 1e-4);
    near(r.resistanceOhm, 1.08065e-3, 1e-4);
    near(r.thermalResistanceKW, 164.95, 1e-3); // L/(380·A)
    near(r.capacityA, 1.902, 2e-3); // 0.048 · 10^0.44 · 39.56^0.725
  }],

  ['via: parallel vias divide R and R_th, multiply capacity', () => {
    const one = calculateVia({ drillMm: 0.3, lengthMm: 1.6, platingUm: 25, currentA: 4 });
    const four = calculateVia({ drillMm: 0.3, lengthMm: 1.6, platingUm: 25, currentA: 4, count: 4 });
    near(four.totalResistanceOhm, one.resistanceOhm / 4, 1e-12);
    near(four.totalCapacityA, one.capacityA * 4, 1e-12);
    eq(one.viasForCurrent, 3);
    ok(one.warnings.includes('overCapacity') && !four.warnings.includes('overCapacity'), 'capacity warning');
  }],

  ['via: H. Johnson parasitic examples (1.2 nH, 0.5 pF)', () => {
    // L: h = 0.063", d = 0.016" → 5.08·0.063·(ln(15.75)+1) = 1.20 nH
    near(viaInductanceNh(0.063 * 25.4, 0.016 * 25.4), 1.2026, 1e-3);
    // C: T = 0.063", D1 = 0.028", D2 = 0.050", εr = 4.4 → 1.41·4.4·0.063·0.028/0.022 = 0.497 pF
    near(viaCapacitancePf(0.063 * 25.4, 0.028 * 25.4, 0.05 * 25.4, 4.4), 0.49745, 1e-3);
  }],

  ['fusing: Onderdonk and Preece for 10 mil × 1 oz', () => {
    // A = 13.78 mil² = 0.0088903 mm² = 17.545 cmil; k = log10(1 + 1058/259) = 0.70629
    const a = 13.78 * 6.4516e-4;
    near(onderdonkCurrent(a, 1, 25), 2.5669, 1e-3); // 17.545 · √(0.70629/33)
    near(onderdonkTime(a, 2.5669, 25), 1, 1e-3);
    near(preeceCurrent(a), 2.7768, 1e-3); // 10244 · (4.1887e-3 in)^1.5
    near(calculateFusing({ areaMm2: a }).i2t, 6.589, 1e-3);
  }],

  ['units: conversions', () => {
    near(thicknessToMil(1, 'oz'), 1.378);
    near(thicknessToMil(35, 'um'), 1.37795);
    near(thicknessToMil(0.0254, 'mm'), 1);
    near(tempToC(77, 'F'), 25);
    near(tempToC(300, 'K'), 26.85);
    near(riseToC(18, 'F'), 10);
    near(currentToA(500, 'mA'), 0.5);
    near(toMm(100, 'mil'), 2.54);
  }],

  ['spacing: IPC-2221 Table 6-1', () => {
    eq(minimumSpacingMm(230, 'B2'), 1.25);
    eq(minimumSpacingMm(15, 'B2'), 0.1);
    eq(minimumSpacingMm(15.5, 'B2'), 0.1);
    eq(minimumSpacingMm(30.5, 'B2'), 0.6);
    eq(minimumSpacingMm(20, 'A6'), 0.25);
    eq(minimumSpacingMm(500, 'B2'), 2.5);
    // > 500 V: d(301–500 V) + c·(V − 500)
    near(minimumSpacingMm(600, 'B1'), 0.5, 1e-12); // 0.25 + 100·0.0025 (IPC-2221 §6.3 example)
    near(minimumSpacingMm(600, 'B2'), 3.0, 1e-12); // 2.5 + 100·0.005
    near(minimumSpacingMm(1000, 'A6'), 3.025, 1e-12); // 1.5 + 500·0.00305
    near(minimumSpacingMm(1000, 'B3'), 25, 1e-12);
    eq(bandIndex(170), 5);
    eq(bandIndex(600), -1);
  }],

  ['spacing: inverse (spacing → max voltage)', () => {
    eq(maxVoltageForSpacing(0.6, 'B2'), 150);
    eq(maxVoltageForSpacing(1.25, 'B2'), 300);
    near(maxVoltageForSpacing(3, 'B2'), 600, 1e-12);
    near(maxVoltageForSpacing(0.5, 'B1'), 600, 1e-12);
    eq(maxVoltageForSpacing(0.05, 'B2'), 0);
    // Round trip: the spacing for the returned voltage never exceeds the given one.
    for (const cat of ['B1', 'B3', 'A6', 'A7']) {
      for (const d of [0.1, 0.4, 0.8, 1.5, 5]) {
        const vmax = maxVoltageForSpacing(d, cat);
        if (vmax > 0) ok(minimumSpacingMm(vmax, cat) <= d + 1e-9, `${cat} ${d}`);
      }
    }
  }],
];
