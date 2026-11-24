// Engine test cases. Shared by the Node runner (engine.test.js, used in CI)
// and the browser runner (tests/index.html). Reference values are computed
// by hand from the published equations / tables.

import {
  ipc2221WidthMil, ipc2152WidthMil, calculateTraceWidth,
  altitudeFactor, dutyCycleFactor, planeFactor, thicknessCorrectionRatio, airflowFactor,
} from '../src/engine/trace-width.js';
import { calculateImpedance, microstripZ0, striplineZ0 } from '../src/engine/impedance.js';
import { minimumSpacingMm, bandIndex } from '../src/engine/spacing.js';
import { calculateVia } from '../src/engine/via.js';
import { thicknessToMil, tempToC, riseToC, currentToA, toMm } from '../src/engine/units.js';

function near(actual, expected, relTol = 1e-3, label = '') {
  const tol = Math.abs(expected) * relTol || relTol;
  if (!(Math.abs(actual - expected) <= tol)) {
    throw new Error(`${label} expected ${expected} ± ${tol}, got ${actual}`);
  }
}
function eq(actual, expected, label = '') {
  if (actual !== expected) throw new Error(`${label} expected ${expected}, got ${actual}`);
}
function ok(cond, label) {
  if (!cond) throw new Error(`assertion failed: ${label}`);
}

export const cases = [
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

  ['IPC-2221: 1 A, 10 °C, 1 oz external ≈ 11.83 mil', () => {
    near(ipc2221WidthMil(1, 10, 1.378, true), 11.825, 1e-3);
  }],

  ['IPC-2221: internal layer needs 2^(1/0.725) more area', () => {
    const ext = ipc2221WidthMil(1, 10, 1.378, true);
    const int = ipc2221WidthMil(1, 10, 1.378, false);
    near(int / ext, Math.pow(2, 1 / 0.725), 1e-9);
  }],

  ['IPC-2152 factors', () => {
    near(altitudeFactor(3000), 0.8, 1e-12);
    near(altitudeFactor(20000), 0.2, 1e-12);
    near(dutyCycleFactor(1, 1), 1, 1e-12);
    near(dutyCycleFactor(0.5, 1), 1.4, 1e-12);
    near(dutyCycleFactor(0.4, 1), 1.6, 1e-12);
    near(dutyCycleFactor(0.1, 1000), 2.8, 1e-12);
    near(planeFactor(false, 100, 1), 1.8 / 1.4, 1e-12);
    near(planeFactor(true, 100, 1), 1 + 0.7 * (1.8 / 1.4 - 1), 1e-12);
    eq(planeFactor(true, 0, 1), 1);
    near(thicknessCorrectionRatio(true, 1), 1, 1e-12);
    near(thicknessCorrectionRatio(true, 2), 1.45 / Math.pow(2, 0.725), 1e-12);
    near(airflowFactor(true, 'medium'), 1.5, 1e-12);
    near(airflowFactor(false, 'medium'), 1.025, 1e-12);
  }],

  ['IPC-2152: neutral environment equals base formula', () => {
    const { widthMil } = ipc2152WidthMil(1, 10, 1, true, {});
    near(widthMil, 11.825, 1e-3);
  }],

  ['IPC-2152: capacity multiplier f shrinks width by f^(1/0.725)', () => {
    const base = ipc2152WidthMil(2, 20, 1, true, {}).widthMil;
    const air = ipc2152WidthMil(2, 20, 1, true, { airflow: 'medium' }).widthMil;
    near(base / air, Math.pow(1.5, 1 / 0.725), 1e-9);
  }],

  ['IPC-2152: plane iteration converges', () => {
    const r = ipc2152WidthMil(3, 10, 1, false, { planeAreaMm2: 400 });
    const fPlane = planeFactor(false, 400, r.widthMil * 0.0254);
    near(r.factors.plane, fPlane, 1e-4);
    ok(r.widthMil < ipc2152WidthMil(3, 10, 1, false, {}).widthMil, 'plane reduces width');
  }],

  ['calculateTraceWidth: class margin and minimum', () => {
    const r = calculateTraceWidth({
      standard: 'ipc2152', pcbClass: 2, isExternal: true,
      currentA: 1, deltaTC: 10, thicknessMil: 1.378,
    });
    ok(r.ok, 'ok');
    near(r.widthMil, 11.825 * 1.3, 1e-3);
    const small = calculateTraceWidth({
      standard: 'ipc2221', pcbClass: 1, isExternal: true,
      currentA: 0.05, deltaTC: 10, thicknessMil: 1.378,
    });
    eq(small.widthMil, 5, 'class 1 minimum');
    ok(small.warnings.includes('classMinimumApplied'), 'warning raised');
  }],

  ['calculateTraceWidth: DC analysis at ambient + ΔT', () => {
    const r = calculateTraceWidth({
      standard: 'ipc2221', pcbClass: 2, isExternal: true,
      currentA: 1, deltaTC: 10, thicknessMil: 1.378, ambientC: 25, lengthM: 0.05,
    });
    near(r.dc.conductorC, 35, 1e-12);
    near(r.dc.resistanceOhm, 0.086828, 2e-3);
    near(r.dc.powerLossW, r.dc.resistanceOhm, 1e-12);
  }],

  ['calculateTraceWidth: invalid input', () => {
    const r = calculateTraceWidth({ standard: 'ipc2221', currentA: 0, deltaTC: 10, thicknessMil: 1 });
    eq(r.ok, false);
    ok(r.errors.includes('current'), 'current error');
  }],

  ['Impedance: microstrip and stripline', () => {
    near(microstripZ0(0.3, 0.035, 0.18, 4.6), 48.428, 1e-3);
    near(striplineZ0(0.15, 0.035, 0.5, 4), 54.397, 1e-3);
  }],

  ['Impedance: differential pairs', () => {
    const r = calculateImpedance({ structure: 'diffMicrostrip', w: 0.3, t: 0.035, h: 0.18, er: 4.6, s: 0.2 });
    near(r.zdiff, 2 * r.z0 * (1 - 0.48 * Math.exp(-0.96 * 0.2 / 0.18)), 1e-12);
    const s = calculateImpedance({ structure: 'diffStripline', w: 0.15, t: 0.035, h: 0.5, er: 4, s: 0.2 });
    near(s.zdiff, 2 * s.z0 * (1 - 0.347 * Math.exp(-2.9 * 0.2 / 0.5)), 1e-12);
    near(s.delayPsPerIn, 170, 1e-12);
  }],

  ['Impedance: impossible geometry is rejected', () => {
    const r = calculateImpedance({ structure: 'microstrip', w: 5, t: 0.035, h: 0.1, er: 4.6 });
    eq(r.ok, false);
  }],

  ['Spacing: IPC-2221 Table 6-1', () => {
    eq(minimumSpacingMm(230, 'B2'), 1.25);
    eq(minimumSpacingMm(15, 'B2'), 0.1);
    eq(minimumSpacingMm(15.5, 'B2'), 0.1);
    eq(minimumSpacingMm(30.5, 'B2'), 0.6);
    eq(minimumSpacingMm(20, 'A6'), 0.25);
    eq(minimumSpacingMm(500, 'B2'), 2.5);
    near(minimumSpacingMm(600, 'B2'), 3.0, 1e-12);
    near(minimumSpacingMm(1000, 'B3'), 25, 1e-12);
    eq(bandIndex(170), 5);
    eq(bandIndex(600), -1);
  }],

  ['Via: 0.3 mm drill, 1.6 mm, 25 µm', () => {
    const r = calculateVia({ drillMm: 0.3, lengthMm: 1.6, platingUm: 25, currentA: 1 });
    ok(r.ok, 'ok');
    near(r.aspectRatio, 5.3333, 1e-4);
    near(r.resistanceOhm, 1.08065e-3, 1e-4);
    near(r.voltageDropV, r.resistanceOhm, 1e-12);
    ok(r.capacityA > 1 && r.capacityA < 5, `capacity plausible (${r.capacityA})`);
  }],
];
