// Impedance tolerance analysis: each expected value is a direct recalculation
// with the moved parameter, so the test does not depend on the analysis code.

import { near, eq, ok } from '../assert.js';
import { microstrip, stripline, diffMicrostripZ, impedanceTolerance } from '../../src/engine/impedance.js';

const MS = { structure: 'microstrip', w: 0.3, t: 0.035, h: 0.2, er: 4.3 };
const z = (w, t, h, er) => microstrip(w, t, h, er).z0;

export const cases = [
  ['tolerance: one parameter alone equals a direct recalculation', () => {
    const a = impedanceTolerance(MS, { h: 10 });
    const nominal = z(0.3, 0.035, 0.2, 4.3);
    near(a.nominal, nominal, 1e-12, 'nominal');
    eq(a.items.length, 1, 'one item');
    const x = a.items[0];
    eq(x.key, 'h', 'key');
    near(x.zLo, z(0.3, 0.035, 0.18, 4.3), 1e-12, 'h − 10 %');
    near(x.zHi, z(0.3, 0.035, 0.22, 4.3), 1e-12, 'h + 10 %');
    ok(x.zLo < nominal && x.zHi > nominal, 'thicker dielectric raises Z');
    near(a.zMin, x.zLo, 1e-12, 'worst case low');
    near(a.zMax, x.zHi, 1e-12, 'worst case high');
    near(a.rssPct, x.halfSpanPct, 1e-12, 'RSS of a single term');
    near(x.halfSpanPct, ((x.zHi - x.zLo) / 2 / nominal) * 100, 1e-12, 'half span');
    near(x.share, 1, 1e-12, 'share');
    eq(a.dominant, 'h', 'dominant');
  }],

  ['tolerance: wider trace, higher εr and thicker copper each lower Z', () => {
    const nominal = z(0.3, 0.035, 0.2, 4.3);
    for (const key of ['w', 'er', 't']) {
      const x = impedanceTolerance(MS, { [key]: 10 }).items[0];
      ok(x.zHi < nominal && x.zLo > nominal, `${key}: +10 % lowers Z (${x.zLo} / ${x.zHi})`);
      ok(x.minusPct < 0 && x.plusPct > 0, `${key}: signed percentages`);
    }
  }],

  ['tolerance: worst case is the exact corner; RSS and shares are consistent', () => {
    const a = impedanceTolerance(MS, { w: 10, h: 10, er: 5, t: 10 });
    // Lowest Z: wide, thick copper, thin dielectric, high εr. Highest Z: the opposite corner.
    near(a.zMin, z(0.33, 0.0385, 0.18, 4.515), 1e-12, 'low corner');
    near(a.zMax, z(0.27, 0.0315, 0.22, 4.085), 1e-12, 'high corner');
    eq(a.items.map((x) => x.key).join(','), 'w,h,er,t', 'order');
    near(a.rssPct, Math.hypot(...a.items.map((x) => x.halfSpanPct)), 1e-12, 'root sum square');
    near(a.items.reduce((s, x) => s + x.share, 0), 1, 1e-12, 'shares add up to 1');
    ok((a.wcPlusPct - a.wcMinusPct) / 2 > a.rssPct, 'worst case is wider than RSS');
    ok(a.rssPct > 5 && a.rssPct < 12, `a ±10 % stack-up gives roughly ±5–12 % (got ${a.rssPct})`);
    eq(a.dominant, a.items.reduce((m, x) => (x.halfSpanPct > m.halfSpanPct ? x : m)).key, 'dominant is the largest');
  }],

  ['tolerance: in a differential pair the gap opens as the trace narrows', () => {
    const P = { structure: 'diffMicrostrip', w: 0.15, s: 0.15, t: 0.035, h: 0.1, er: 4.3 };
    const x = impedanceTolerance(P, { w: 10 }).items[0];
    near(x.zLo, diffMicrostripZ(z(0.135, 0.035, 0.1, 4.3), 0.165, 0.1), 1e-12, 'w − 10 %, s + the same amount');
    near(x.zHi, diffMicrostripZ(z(0.165, 0.035, 0.1, 4.3), 0.135, 0.1), 1e-12, 'w + 10 %, s − the same amount');
  }],

  ['tolerance: stripline varies the plane spacing; offset stripline varies both gaps', () => {
    const S = { structure: 'stripline', w: 0.15, t: 0.035, h: 0.4, er: 4.3 };
    const x = impedanceTolerance(S, { h: 10 }).items[0];
    near(x.zHi, stripline(0.15, 0.035, 0.44, 4.3).z0, 1e-12, 'b + 10 %');
    const A = impedanceTolerance({ structure: 'asymStripline', w: 0.15, t: 0.035, h: 0.2, h2: 0.3, er: 4.3 }, { h: 10 });
    eq(A.items.map((i) => i.key).join(','), 'h,h2', 'both gaps');
  }],

  ['tolerance: nothing to vary gives an empty result; impossible geometry gives null', () => {
    const a = impedanceTolerance(MS, {});
    eq(a.items.length, 0, 'no items');
    eq(a.rssPct, 0, 'no spread');
    near(a.zMin, a.nominal, 1e-12, 'min = nominal');
    eq(a.dominant, null, 'no dominant');
    eq(impedanceTolerance({ structure: 'diffMicrostrip', w: 0.3, s: 0.02, t: 0.035, h: 0.1, er: 4.3 }, { w: 50 }), null, 'gap would close');
    eq(impedanceTolerance({ ...MS, w: NaN }, { h: 10 }), null, 'no nominal');
  }],
];
