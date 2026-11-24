import { near, ok } from '../assert.js';
import {
  targetImpedance, bulkCapacitance, srf, bankZ, sweepBank, planeCapacitance, ldoPower, junction,
} from '../../src/engine/power.js';

export const cases = [
  ['pdn: target impedance 1.0 V, 3 %, 5 A, 50 % step = 12 mΩ', () => {
    near(targetImpedance({ vdd: 1, ripplePct: 3, iMax: 5, stepPct: 50 }).zTarget, 0.012, 1e-12);
  }],

  ['pdn: bulk capacitance at 100 kHz for 12 mΩ = 132.6 µF', () => {
    near(bulkCapacitance(0.012, 1e5), 132.629e-6, 1e-4); // 1/(2π·1e5·0.012)
  }],

  ['pdn: capacitor self-resonance and bank impedance', () => {
    const cap = { c: 100e-9, esr: 0.02, esl: 0.6e-9 };
    near(srf(cap), 20.547e6, 1e-3); // 1/(2π√(6e-17))
    near(bankZ(srf(cap), [{ ...cap, n: 1 }]), 0.02, 1e-6); // |Z| = ESR at SRF
    near(bankZ(1e6, [{ ...cap, n: 4 }]), bankZ(1e6, [{ ...cap, n: 1 }]) / 4, 1e-9);
  }],

  ['pdn: sweep finds a compliant band', () => {
    const groups = [{ c: 22e-6, esr: 0.005, esl: 1.5e-9, n: 4 }, { c: 100e-9, esr: 0.02, esl: 0.6e-9, n: 10 }];
    const s = sweepBank(groups, { zTarget: 0.05 });
    ok(s.band && s.band[0] < s.band[1], 'band exists');
  }],

  ['pdn: plane capacitance 100 cm², 0.1 mm, εr 4.3 = 3.81 nF', () => {
    near(planeCapacitance(10000, 0.1, 4.3), 3.807e-9, 1e-3);
  }],

  ['thermal: LDO dissipation and junction temperature', () => {
    near(ldoPower({ vin: 5, vout: 3.3, iout: 0.5, iq: 0.001 }), 0.855, 1e-12);
    const r = junction({ powerW: 1.5, ambientC: 40, thetaJA: 50, tjMaxC: 125 });
    near(r.tj, 115, 1e-12);
    near(r.margin, 10, 1e-12);
    near(r.maxPower, 1.7, 1e-12);
    const h = junction({ powerW: 10, ambientC: 40, thetaJC: 2, thetaCS: 0.5, thetaSA: 5, tjMaxC: 125 });
    near(h.tj, 115, 1e-12);
    near(h.requiredThetaSA, 6, 1e-12); // (125−40)/10 − 2 − 0.5
  }],
];
