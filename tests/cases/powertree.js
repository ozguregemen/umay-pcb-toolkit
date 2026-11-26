// Power tree and power budget: engine (src/engine/powertree.js) and page
// (src/pages/powertree.js). Reference values are worked out by hand in the
// comments from the regulator models:
//   LDO        Iin = Iout + Iq,            Ploss = (Vin − Vout)·Iout + Vin·Iq
//   switcher   Pin = Pout/η + Vin·Iq,      Iin = Pin/Vin,  Ploss = Pin − Pout
//   switch     Vout = Vin − I·R,           Ploss = I²·R
//   Tj = Ta + Ploss·θJA
// (Erickson & Maksimović, Fundamentals of Power Electronics, ch. 3;
//  Horowitz & Hill, The Art of Electronics, ch. 9.)

import { near, eq, ok } from '../assert.js';
import { analyzePowerTree, regulatorPoint, junctionC, SOURCE, REG_TYPES, LIMITS } from '../../src/engine/powertree.js';
import { registerStrings, setLang, getLang } from '../../src/i18n.js';
import { parseNumber } from '../../src/ui/calculator.js';
import page, {
  drawTree, formHtml, fromParams, toQuery, toTree, defaultState, exampleState, EXAMPLES, relatedLinks, summary,
} from '../../src/pages/powertree.js';
import thermalPage from '../../src/pages/thermal.js';
import dcdcPage from '../../src/pages/dcdc.js';
import batteryPage from '../../src/pages/battery.js';

registerStrings(page.strings);

const codes = (r) => r.warnings.map((w) => w.code).sort().join();
const errs = (r) => r.errors.map((e) => e.code).sort().join();
const reg = (r, id) => r.regs.find((g) => g.id === id);

/** 12 V (10 … 15 V) → 5 V buck, 90 %, Iq 1 mA → 3.3 V LDO, Iq 2 mA; a load on every rail. */
const twoLevel = () => ({
  source: { name: 'IN', vNomV: 12, vMinV: 10, vMaxV: 15, ambientC: 25 },
  regs: [
    { id: 'buck', name: 'BUCK', parent: SOURCE, type: 'buck', voutV: 5, eff: 0.9, iqA: 0.001, iRatedA: 1, thetaJA: 40 },
    { id: 'ldo', name: 'LDO', parent: 'buck', type: 'ldo', voutV: 3.3, iqA: 0.002, dropoutV: 0.3, iRatedA: 0.5, thetaJA: 100 },
  ],
  loads: [
    { name: 'MCU', rail: 'ldo', iTypA: 0.1, iMaxA: 0.2 },
    { name: 'LED', rail: 'buck', iTypA: 0.098, iMaxA: 0.298 },
    { name: 'FAN', rail: SOURCE, iTypA: 0.05, iMaxA: 0.1 },
  ],
});

/** 5 V (4.5 … 5.5 V) → 3.3 V LDO with one load of 0.3 A typical, 0.5 A maximum. */
const usbLdo = (regExtra = {}, src = {}) => ({
  source: { vNomV: 5, vMinV: 4.5, vMaxV: 5.5, ambientC: 25, ...src },
  regs: [{ id: 'u1', parent: SOURCE, type: 'ldo', voutV: 3.3, ...regExtra }],
  loads: [{ rail: 'u1', iTypA: 0.3, iMaxA: 0.5 }],
});

// ---------------------------------------------------------------------------
// Helpers for the drawing tests
// ---------------------------------------------------------------------------

const NUM = /^-?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i;
const ARGS = { m: 2, l: 2, h: 1, v: 1, z: 0 };
const GEO = /\s(x|y|x1|x2|y1|y2|cx|cy|r|rx|ry|width|height|d|points|viewBox|transform|style)="([^"]*)"/g;
/** Every geometry attribute of an SVG string, in order. */
const geometry = (s) => [...s.matchAll(GEO)].map(([, k, v]) => `${k}=${v}`);

function svgProblems(s) {
  const bad = [];
  if (!s.startsWith('<svg') || !s.endsWith('</svg>')) bad.push('not an svg');
  if (/NaN|undefined|Infinity/.test(s)) bad.push('NaN/undefined/Infinity');
  for (const [, k, v] of s.matchAll(GEO)) {
    if (k === 'd') {
      if (!/^[MLHVZ\d.,\s-]+$/.test(v)) bad.push(`d="${v}"`);
      for (const [, cmd, args] of v.matchAll(/([MLHVZ])([^MLHVZ]*)/g)) {
        const n = (args.match(/-?(\d+\.?\d*|\.\d+)/g) ?? []).length;
        const want = ARGS[cmd.toLowerCase()];
        if (want === 0 ? n !== 0 : n === 0 || n % want !== 0) bad.push(`d: ${cmd}${args}`);
      }
    } else if (k === 'viewBox') {
      const p = v.split(' ');
      if (p.length !== 4 || !p.every((x) => NUM.test(x))) bad.push(`viewBox="${v}"`);
    } else if (k === 'style') {
      if (/\d,\d/.test(v)) bad.push(`style="${v}"`);
    } else if (!NUM.test(v)) bad.push(`${k}="${v}"`);
  }
  return bad;
}

/** Rectangles of an SVG string as numbers. */
const rects = (s) => [...s.matchAll(/<rect class="([^"]*)" x="([^"]*)" y="([^"]*)" width="([^"]*)" height="([^"]*)"/g)]
  .map(([, cls, x, y, w, h]) => ({ cls, x: Number(x), y: Number(y), w: Number(w), h: Number(h) }));
const viewBox = (s) => s.match(/viewBox="0 0 (\S+) (\S+)"/).slice(1).map(Number);

function inBothLanguages(fn) {
  const before = getLang();
  try {
    for (const l of ['tr', 'en']) { setLang(l); fn(l); }
  } finally {
    setLang(before);
  }
}

/** Page states for the drawing tests. */
const mk = {
  reg: (o) => ({ name: '', parent: -1, type: 'ldo', vout: 3.3, eff: 90, iq: NaN, vdo: NaN, r: NaN, imax: NaN, theta: NaN, ...o }),
  load: (o) => ({ name: '', rail: -1, ityp: 0, imax: NaN, ...o }),
};

/** 12 regulators, three levels, every type, 22 loads. */
function wideTree() {
  const regs = [
    mk.reg({ name: 'U1', type: 'buck', vout: 5, eff: 91.5, iq: 120, imax: 3000, theta: 42.5 }),
    mk.reg({ name: 'U2', parent: 0, type: 'ldo', vout: 3.3, iq: 55, vdo: 0.25, imax: 600, theta: 100 }),
    mk.reg({ name: 'U3', parent: 0, type: 'ldo', vout: 1.8, iq: 50, vdo: 0.3 }),
    mk.reg({ name: 'U4', parent: 0, type: 'ldo', vout: 2.5, iq: 45 }),
    mk.reg({ name: 'U5', parent: 0, type: 'buck', vout: 1.2, eff: 87.5, iq: 30 }),
    mk.reg({ name: 'U6', parent: 0, type: 'switch', r: 85 }),
    mk.reg({ name: 'U7', type: 'boost', vout: 24, eff: 88 }),
    mk.reg({ name: 'U8', type: 'switch', r: 22.5 }),
    mk.reg({ name: 'U9', parent: 7, type: 'buck', vout: 3.3, eff: 92 }),
    mk.reg({ name: 'U10', parent: 8, type: 'ldo', vout: 1.1, iq: 20 }),
    mk.reg({ name: 'U11', type: 'buckboost', vout: 12, eff: 85 }),
    mk.reg({ name: 'U12', parent: 10, type: 'ldo', vout: 9, iq: 500 }),
  ];
  const loads = [];
  for (let i = 0; i < 22; i++) loads.push(mk.load({ name: `L${i + 1}`, rail: (i % 13) - 1, ityp: 12.5 + 7.25 * i, imax: 30.5 + 9.75 * i }));
  return { src: { name: '12V5', vnom: 12.5, vmin: 11.4, vmax: 13.6, ta: 37.5 }, regs, loads };
}

/** 12 regulators in one chain (every regulator feeds the next) with a load on each. */
function deepTree() {
  const regs = [];
  for (let i = 0; i < 12; i++) regs.push(mk.reg({ name: `S${i + 1}`, parent: i - 1, type: i % 2 ? 'ldo' : 'buck', vout: 47.5 - 3.75 * i, eff: 93.5, iq: 25 }));
  const loads = regs.map((_, i) => mk.load({ name: `L${i + 1}`, rail: i, ityp: 1.25 * (i + 1), imax: 2.75 * (i + 1) }));
  return { src: { name: '54V', vnom: 54, vmin: 51.5, vmax: 56.5, ta: 25 }, regs, loads };
}

/** Field values of a mountCalculator page for the parameters of a link. */
function linkValues(target, query) {
  const params = new URLSearchParams(query);
  const fieldsOf = target.sections.flatMap((s) => s.fields);
  const problems = [];
  for (const [key, value] of params) {
    const unitOf = key.endsWith('_u') ? fieldsOf.find((f) => f.key === key.slice(0, -2)) : null;
    if (unitOf) { if (!unitOf.units?.includes(value)) problems.push(`unit ${key}=${value}`); continue; }
    const f = fieldsOf.find((x) => x.key === key);
    if (!f) { problems.push(`no field "${key}"`); continue; }
    if (f.options && !f.options.some((o) => String(o.value) === value)) problems.push(`${key}=${value} is not an option`);
    if (f.type === 'number' && value === '' && f.optional) continue;
    if (f.type === 'number' && !Number.isFinite(parseNumber(value, f.si))) problems.push(`${key}=${value} is not a number`);
  }
  const v = {};
  const u = {};
  for (const f of fieldsOf) {
    const raw = params.get(f.key) ?? (f.default === undefined || f.default === null ? '' : String(f.default));
    v[f.key] = f.type === 'number' ? parseNumber(raw, f.si) : raw;
    if (f.type === 'number') u[f.key] = f.units?.includes(params.get(`${f.key}_u`)) ? params.get(`${f.key}_u`) : f.unit ?? f.units?.[0];
  }
  return { v, u, problems };
}

export const cases = [
  // -------------------------------------------------------------------------
  // Engine
  // -------------------------------------------------------------------------

  ['powertree: one regulator at one operating point, every type', () => {
    // LDO 5 → 3.3 V, 0.2 A, Iq 50 µA: Iin = 0.20005 A, Pin = 1.00025 W, Pout = 0.66 W,
    // Ploss = 1.7·0.2 + 5·50e-6 = 0.34 + 0.00025 = 0.34025 W, η = 0.66/1.00025 = 0.659835
    const l = regulatorPoint({ type: 'ldo', voutV: 3.3, iqA: 50e-6 }, 5, 0.2);
    near(l.iinA, 0.20005, 1e-12);
    near(l.pinW, 1.00025, 1e-12);
    near(l.lossW, 0.34025, 1e-12);
    near(l.eff, 0.659835, 1e-6);
    // Buck 12 → 5 V, 1 A, η 0.9, no Iq: Pin = 5/0.9 = 5.555556 W, Iin = 0.462963 A, Ploss = 0.555556 W
    const b = regulatorPoint({ type: 'buck', voutV: 5, eff: 0.9 }, 12, 1);
    near(b.pinW, 5.555556, 1e-6);
    near(b.iinA, 0.462963, 1e-6);
    near(b.lossW, 0.555556, 1e-6);
    near(b.eff, 0.9, 1e-12);
    // … with Iq 1 mA: Pin = 5.555556 + 12·0.001 = 5.567556 W
    near(regulatorPoint({ type: 'buck', voutV: 5, eff: 0.9, iqA: 1e-3 }, 12, 1).pinW, 5.567556, 1e-6);
    // Boost 3.7 → 5 V, 0.2 A, η 0.85: Pin = 1/0.85 = 1.176471 W, Iin = 1.176471/3.7 = 0.317965 A
    near(regulatorPoint({ type: 'boost', voutV: 5, eff: 0.85 }, 3.7, 0.2).iinA, 0.317965, 1e-6);
    // Buck-boost 3.0 → 3.3 V, 0.1 A, η 0.9: Iin = 0.33/(0.9·3.0) = 0.33/2.7 = 0.1222222 A
    near(regulatorPoint({ type: 'buckboost', voutV: 3.3, eff: 0.9 }, 3.0, 0.1).iinA, 0.1222222, 1e-6);
    // Switch 5 V, 1 A, 0.1 Ω: Vout = 4.9 V, Ploss = 1²·0.1 = 0.1 W, η = 4.9/5 = 0.98
    const s = regulatorPoint({ type: 'switch', rSeriesOhm: 0.1 }, 5, 1);
    near(s.voutV, 4.9, 1e-12);
    near(s.lossW, 0.1, 1e-12);
    near(s.iinA, 1, 1e-12);
    near(s.eff, 0.98, 1e-12);
    // A direct connection (no resistance) passes everything through.
    const d = regulatorPoint({ type: 'switch' }, 5, 1);
    eq(d.voutV, 5);
    eq(d.lossW, 0);
    // Nothing drawn and no Iq: the efficiency is undefined, not 0/0 → NaN leaking as a number.
    ok(Number.isNaN(regulatorPoint({ type: 'ldo', voutV: 3.3 }, 5, 0).eff), 'no power, no efficiency');
    // Tj = 25 + 0.5 W · 100 °C/W = 75 °C
    eq(junctionC(25, 0.5, 100), 75);
    eq(REG_TYPES.join(), 'ldo,buck,boost,buckboost,switch');
  }],

  ['powertree: 12 V → 5 V buck (90 %) → 3.3 V LDO, typical case', () => {
    const r = analyzePowerTree(twoLevel());
    ok(r.ok, 'ok');
    eq(r.warnings.length, 0, 'no warnings');
    // LDO: Iout = 0.1 A (MCU). Iin = 0.1 + 0.002 = 0.102 A. Pout = 3.3·0.1 = 0.33 W. Pin = 5·0.102 = 0.51 W.
    // Ploss = (5 − 3.3)·0.1 + 5·0.002 = 0.17 + 0.01 = 0.18 W. η = 0.33/0.51 = 0.647059.
    // Loading 0.1/0.5 = 0.2. Tj = 25 + 0.18·100 = 43 °C.
    const l = reg(r, 'ldo').typ;
    near(l.vinV, 5, 1e-12);
    near(l.voutV, 3.3, 1e-12);
    near(l.ioutA, 0.1, 1e-12);
    near(l.poutW, 0.33, 1e-12);
    near(l.iinA, 0.102, 1e-12);
    near(l.pinW, 0.51, 1e-12);
    near(l.lossW, 0.18, 1e-9);
    near(l.eff, 0.647059, 1e-6);
    near(l.loadFrac, 0.2, 1e-12);
    near(l.tjC, 43, 1e-9);
    // Buck: Iout = 0.102 (LDO input) + 0.098 (LED) = 0.2 A. Pout = 1 W.
    // Pin = 1/0.9 + 12·0.001 = 1.111111 + 0.012 = 1.123111 W. Iin = 1.123111/12 = 0.0935926 A.
    // Ploss = 0.123111 W. η = 1/1.123111 = 0.890384. Loading 0.2/1. Tj = 25 + 0.123111·40 = 29.92444 °C.
    const b = reg(r, 'buck').typ;
    near(b.vinV, 12, 1e-12);
    near(b.ioutA, 0.2, 1e-12);
    near(b.poutW, 1, 1e-12);
    near(b.pinW, 1.123111, 1e-6);
    near(b.iinA, 0.0935926, 1e-6);
    near(b.lossW, 0.123111, 1e-6);
    near(b.eff, 0.890384, 1e-6);
    near(b.loadFrac, 0.2, 1e-12);
    near(b.tjC, 29.92444, 1e-6);
    // Source: I = 0.0935926 + 0.05 (FAN) = 0.1435926 A. P = 12·0.1435926 = 1.723111 W.
    // Loads: 3.3·0.1 + 5·0.098 + 12·0.05 = 0.33 + 0.49 + 0.6 = 1.42 W.
    // Loss = 1.723111 − 1.42 = 0.303111 W (= 0.18 + 0.123111). η = 1.42/1.723111 = 0.824091.
    const t = r.totals.typ;
    eq(t.sourceV, 12);
    near(t.sourceA, 0.1435926, 1e-6);
    near(t.sourceW, 1.723111, 1e-6);
    near(t.loadW, 1.42, 1e-12);
    near(t.lossW, 0.303111, 1e-6);
    near(t.eff, 0.824091, 1e-6);
    // The LDO loses more (0.18 W) than the buck (0.123 W).
    eq(r.totals.maxLossId, 'ldo');
    // Structure handed to the drawing.
    eq(r.order.join(), '0,1');
    eq(reg(r, 'ldo').depth, 2);
    eq(reg(r, 'ldo').parent, 'buck');
    eq(r.source.children.join(), '0');
    eq(r.source.loadIdx.join(), '2');
    eq(reg(r, 'buck').children.join(), '1');
    eq(reg(r, 'buck').loadIdx.join(), '1');
    near(r.loads[1].typ.pW, 0.49, 1e-12);
    eq(r.loads[2].typ.vV, 12);
  }],

  ['powertree: the same tree in the worst case (maximum loads, input at 10 V and 15 V)', () => {
    const r = analyzePowerTree(twoLevel());
    // LDO (fed by the regulated 5 V, so both input extremes give the same): Iout = 0.2 A, Iin = 0.202 A,
    // Pin = 1.01 W, Pout = 0.66 W, Ploss = 1.7·0.2 + 5·0.002 = 0.35 W, Tj = 25 + 35 = 60 °C, loading 0.2/0.5 = 0.4.
    const l = reg(r, 'ldo').worst;
    eq(l.at, 'hi', 'an LDO is rated at the highest input');
    near(l.ioutA, 0.2, 1e-12);
    near(l.iinA, 0.202, 1e-12);
    near(l.pinW, 1.01, 1e-12);
    near(l.lossW, 0.35, 1e-9);
    near(l.tjC, 60, 1e-9);
    near(l.loadFrac, 0.4, 1e-12);
    // Buck at the lowest input (10 V): Iout = 0.202 + 0.298 = 0.5 A, Pout = 2.5 W,
    // Pin = 2.5/0.9 + 10·0.001 = 2.777778 + 0.01 = 2.787778 W, Iin = 0.2787778 A, Ploss = 0.287778 W,
    // Tj = 25 + 0.287778·40 = 36.51111 °C, loading 0.5.
    const b = reg(r, 'buck').worst;
    eq(b.at, 'lo', 'a switcher draws most at the lowest input');
    eq(b.vinV, 10);
    near(b.ioutA, 0.5, 1e-12);
    near(b.pinW, 2.787778, 1e-6);
    near(b.iinA, 0.2787778, 1e-6);
    near(b.lossW, 0.287778, 1e-6);
    near(b.tjC, 36.51111, 1e-6);
    near(b.loadFrac, 0.5, 1e-12);
    // … and at the highest (15 V): Pin = 2.777778 + 0.015 = 2.792778 W, Iin = 0.1861852 A.
    near(reg(r, 'buck').hi.iinA, 0.1861852, 1e-6);
    near(reg(r, 'buck').hi.lossW, 0.292778, 1e-6);
    // Source at 10 V: I = 0.2787778 + 0.1 = 0.3787778 A, P = 3.787778 W,
    // loads 0.66 + 5·0.298 + 10·0.1 = 3.15 W, loss 0.637778 W, η = 0.831622.
    const lo = r.totals.lo;
    near(lo.sourceA, 0.3787778, 1e-6);
    near(lo.sourceW, 3.787778, 1e-6);
    near(lo.loadW, 3.15, 1e-12);
    near(lo.lossW, 0.637778, 1e-6);
    near(lo.eff, 0.831622, 1e-6);
    // Source at 15 V: I = 0.1861852 + 0.1 = 0.2861852 A, P = 4.292778 W,
    // loads 0.66 + 1.49 + 15·0.1 = 3.65 W, loss 0.642778 W, η = 0.850265.
    const hi = r.totals.hi;
    near(hi.sourceA, 0.2861852, 1e-6);
    near(hi.sourceW, 4.292778, 1e-6);
    near(hi.loadW, 3.65, 1e-12);
    near(hi.lossW, 0.642778, 1e-6);
    near(hi.eff, 0.850265, 1e-6);
    // Worst case of the source: the larger current (at 10 V), the larger power and loss (at 15 V), the lower η.
    const w = r.totals.worst;
    near(w.sourceA, 0.3787778, 1e-6);
    eq(w.sourceAtV, 10);
    near(w.sourceW, 4.292778, 1e-6);
    near(w.lossW, 0.642778, 1e-6);
    near(w.eff, 0.831622, 1e-6);
    eq(r.totals.maxLossWorstId, 'ldo', '0.35 W against 0.288 W');
  }],

  ['powertree: LDO straight on the source: loss at the maximum, dropout at the minimum input', () => {
    // Typical: 5 V, 0.3 A. Ploss = 1.7·0.3 = 0.51 W, η = 3.3/5 = 0.66.
    // Worst: 5.5 V, 0.5 A. Ploss = 2.2·0.5 = 1.1 W, Pin = 2.75 W.
    const r = analyzePowerTree(usbLdo({ dropoutV: 1.1, thetaJA: 50 }));
    const g = r.regs[0];
    near(g.typ.lossW, 0.51, 1e-9);
    near(g.typ.eff, 0.66, 1e-12);
    eq(g.worst.vinV, 5.5);
    near(g.worst.lossW, 1.1, 1e-9);
    near(g.worst.pinW, 2.75, 1e-12);
    near(g.worst.tjC, 80, 1e-9); // 25 + 1.1·50
    // Headroom at 4.5 V = 1.2 V ≥ dropout 1.1 V: no warning.
    eq(codes(r), '');
    // Source: the current is the same at both extremes (0.5 A), the power is largest at 5.5 V.
    near(r.totals.worst.sourceA, 0.5, 1e-12);
    near(r.totals.worst.sourceW, 2.75, 1e-12);
    near(r.totals.worst.lossW, 1.1, 1e-9);
    near(r.totals.worst.eff, 0.6, 1e-12); // 3.3/5.5
    // Without a range the three operating points coincide in voltage.
    const flat = analyzePowerTree(usbLdo({}, { vMinV: NaN, vMaxV: undefined }));
    eq(flat.source.vMinV, 5);
    eq(flat.source.vMaxV, 5);
    near(flat.regs[0].worst.lossW, 0.85, 1e-9); // 1.7·0.5
  }],

  ['powertree: every warning is raised by its own cause', () => {
    // Dropout: headroom at 4.5 V is 1.2 V, below a dropout of 1.3 V.
    let r = analyzePowerTree(usbLdo({ dropoutV: 1.3, thetaJA: 50 }));
    eq(codes(r), 'dropout');
    near(r.warnings[0].headroomV, 1.2, 1e-12);
    eq(r.warnings[0].vinV, 4.5);
    eq(r.warnings[0].id, 'u1');
    // … also when no dropout voltage is given and the input falls to the output or below it.
    eq(codes(analyzePowerTree(usbLdo({ thetaJA: 50 }, { vMinV: 3.3 }))), 'dropout');
    // An LDO cannot give more than it gets: 3.0 V in → 3.0 V out, no negative loss.
    r = analyzePowerTree(usbLdo({ thetaJA: 50 }, { vNomV: 3, vMinV: 3, vMaxV: 3 }));
    eq(codes(r), 'dropout');
    eq(r.regs[0].typ.voutV, 3);
    near(r.regs[0].typ.lossW, 0, 1e-12);
    near(r.loads[0].typ.vV, 3, 1e-12);

    // LDO above 1 W (1.1 W) with no θJA.
    r = analyzePowerTree(usbLdo());
    eq(codes(r), 'ldoNoTheta');
    near(r.warnings[0].lossW, 1.1, 1e-9);
    // 1.1 W: θJA 50 → 80 °C (fine), 70 → 102 °C (note), 100 → 135 °C (warning).
    eq(codes(analyzePowerTree(usbLdo({ thetaJA: 50 }))), '');
    r = analyzePowerTree(usbLdo({ thetaJA: 70 }));
    eq(codes(r), 'tjHigh');
    near(r.warnings[0].tjC, 102, 1e-9);
    r = analyzePowerTree(usbLdo({ thetaJA: 100 }));
    eq(codes(r), 'tjOver');
    near(r.warnings[0].tjC, 135, 1e-9);

    // Rating: 0.5 A against 0.7 A = 71 % (fine), 0.6 A = 83 % (note), 0.5 A = 100 % (note), 0.4 A (over).
    eq(codes(analyzePowerTree(usbLdo({ thetaJA: 50, iRatedA: 0.7 }))), '');
    r = analyzePowerTree(usbLdo({ thetaJA: 50, iRatedA: 0.6 }));
    eq(codes(r), 'nearRated');
    near(r.warnings[0].frac, 0.8333, 1e-3);
    eq(codes(analyzePowerTree(usbLdo({ thetaJA: 50, iRatedA: 0.5 }))), 'nearRated');
    r = analyzePowerTree(usbLdo({ thetaJA: 50, iRatedA: 0.4 }));
    eq(codes(r), 'overRated');
    near(r.warnings[0].ioutA, 0.5, 1e-12);

    // Buck with the output at or above the minimum input; boost with the output at or below the maximum.
    const liion = (type, voutV) => analyzePowerTree({
      source: { vNomV: 3.7, vMinV: 3.0, vMaxV: 4.2, ambientC: 25 },
      regs: [{ id: 'x', parent: SOURCE, type, voutV, eff: 0.9 }],
      loads: [{ rail: 'x', iTypA: 0.1 }],
    });
    eq(codes(liion('buck', 3.3)), 'buckRange');
    eq(codes(liion('buck', 3.0)), 'buckRange');
    eq(codes(liion('buck', 2.8)), '');
    eq(codes(liion('boost', 4.0)), 'boostRange');
    eq(codes(liion('boost', 4.2)), 'boostRange');
    eq(codes(liion('boost', 5)), '');
    eq(codes(liion('buckboost', 3.3)), '', 'a buck-boost covers the whole range');
    eq(liion('boost', 4.0).warnings[0].vinV, 4.2);
    // Behind a series resistance the boost sees less under load, but the full source voltage without load:
    // 5 V → 0.5 Ω → boost 4.9 V (η 0.9), 0.5 A. Pin = 2.45/0.9 = 2.7222 W, 0.5·I² − 5·I + 2.7222 = 0 → I = 0.5778 A,
    // Vin = 5 − 0.2889 = 4.711 V (below 4.9 V), yet with the load off the input is 5 V ≥ 4.9 V → warning.
    r = analyzePowerTree({
      source: { vNomV: 5, ambientC: 25 },
      regs: [{ id: 'fb', parent: SOURCE, type: 'switch', rSeriesOhm: 0.5 }, { id: 'x', parent: 'fb', type: 'boost', voutV: 4.9, eff: 0.9 }],
      loads: [{ rail: 'x', iTypA: 0.5 }],
    });
    near(reg(r, 'x').hi.vinV, 4.711, 1e-3);
    eq(codes(r), 'boostRange');
    eq(r.warnings[0].vinV, 5);

    // A rail nothing is connected to.
    r = analyzePowerTree({ source: { vNomV: 5, ambientC: 25 }, regs: [{ id: 'a', parent: SOURCE, type: 'ldo', voutV: 3.3 }], loads: [] });
    eq(codes(r), 'noLoad');
    eq(r.warnings[0].id, 'a');
    // A regulator that only feeds another regulator is not "without load"; the unloaded leaf is.
    r = analyzePowerTree({
      source: { vNomV: 12, ambientC: 25 },
      regs: [{ id: 'a', parent: SOURCE, type: 'buck', voutV: 5, eff: 0.9 }, { id: 'b', parent: 'a', type: 'ldo', voutV: 3.3 }],
      loads: [],
    });
    eq(r.warnings.map((w) => `${w.code}:${w.id}`).join(), 'noLoad:b');
    eq(LIMITS.tjMaxC, 125);
    eq(LIMITS.tjNoteC, 100);
    eq(LIMITS.ratedNote, 0.8);
  }],

  ['powertree: switch with a series resistance, alone and in front of a buck', () => {
    // 5 V (4.5 V min) → 0.1 Ω → 1 A typical, 2 A maximum.
    // Typical: Vout = 5 − 0.1 = 4.9 V, Ploss = 1²·0.1 = 0.1 W, load 4.9 W, η = 0.98.
    // Worst (4.5 V, 2 A): Vout = 4.5 − 0.2 = 4.3 V, Ploss = 2²·0.1 = 0.4 W.
    let r = analyzePowerTree({
      source: { vNomV: 5, vMinV: 4.5, ambientC: 25 },
      regs: [{ id: 'sw', parent: SOURCE, type: 'switch', rSeriesOhm: 0.1 }],
      loads: [{ rail: 'sw', iTypA: 1, iMaxA: 2 }],
    });
    ok(r.ok, 'ok');
    near(r.regs[0].typ.voutV, 4.9, 1e-9);
    near(r.regs[0].typ.lossW, 0.1, 1e-9);
    near(r.regs[0].typ.iinA, 1, 1e-12);
    near(r.loads[0].typ.pW, 4.9, 1e-9);
    near(r.totals.typ.eff, 0.98, 1e-9);
    eq(r.regs[0].worst.at, 'lo');
    near(r.regs[0].worst.voutV, 4.3, 1e-9);
    near(r.regs[0].worst.lossW, 0.4, 1e-9);
    // 12 V → 0.5 Ω → 5 V buck (η 0.8) → 1.84 A. Pout = 9.2 W, Pin(buck) = 11.5 W.
    // I·(12 − 0.5·I) = 11.5 → 0.5·I² − 12·I + 11.5 = 0 → I = 1 A (the other root, 23 A, is not reached).
    // Switch: Vout = 11.5 V, Ploss = 0.5 W. Buck: Ploss = 2.3 W. Source 12 W, total loss 2.8 W.
    r = analyzePowerTree({
      source: { vNomV: 12, ambientC: 25 },
      regs: [{ id: 'sw', parent: SOURCE, type: 'switch', rSeriesOhm: 0.5 }, { id: 'b', parent: 'sw', type: 'buck', voutV: 5, eff: 0.8 }],
      loads: [{ rail: 'b', iTypA: 1.84 }],
    });
    ok(r.ok, 'converges');
    near(reg(r, 'sw').typ.ioutA, 1, 1e-9);
    near(reg(r, 'sw').typ.voutV, 11.5, 1e-9);
    near(reg(r, 'sw').typ.lossW, 0.5, 1e-9);
    near(reg(r, 'b').typ.vinV, 11.5, 1e-9);
    near(reg(r, 'b').typ.lossW, 2.3, 1e-9);
    near(r.totals.typ.sourceW, 12, 1e-9);
    near(r.totals.typ.lossW, 2.8, 1e-9);
    // A heavy drop still has a solution and it is found: 12 V → 2.5 Ω → buck 5 V (η 0.7) → 1.96 A.
    // Pin(buck) = 9.8/0.7 = 14 W; 2.5·I² − 12·I + 14 = 0 → I = (12 − 2)/5 = 2 A (the other root is 2.8 A), Vout = 7 V.
    r = analyzePowerTree({
      source: { vNomV: 12, ambientC: 25 },
      regs: [{ id: 'sw', parent: SOURCE, type: 'switch', rSeriesOhm: 2.5 }, { id: 'b', parent: 'sw', type: 'buck', voutV: 5, eff: 0.7 }],
      loads: [{ rail: 'b', iTypA: 1.96 }],
    });
    ok(r.ok, 'converges with a 42 % drop');
    near(reg(r, 'sw').typ.ioutA, 2, 1e-9);
    near(reg(r, 'sw').typ.voutV, 7, 1e-9);
    near(reg(r, 'sw').typ.lossW, 10, 1e-9); // 2²·2.5
    // 10 Ω instead: 10·I² − 12·I + 11.5 = 0 has no real root (144 − 460 < 0) → the voltage collapses.
    r = analyzePowerTree({
      source: { vNomV: 12, ambientC: 25 },
      regs: [{ id: 'sw', parent: SOURCE, type: 'switch', rSeriesOhm: 10 }, { id: 'b', parent: 'sw', type: 'buck', voutV: 5, eff: 0.8 }],
      loads: [{ rail: 'b', iTypA: 1.84 }],
    });
    ok(!r.ok, 'no operating point');
    eq(r.errors[0].code, 'collapse');
    eq(r.errors[0].id, 'sw');
    // A plain resistive drop to zero is caught too: 5 V, 10 Ω, 1 A.
    eq(errs(analyzePowerTree({ source: { vNomV: 5, ambientC: 25 }, regs: [{ id: 'sw', parent: SOURCE, type: 'switch', rSeriesOhm: 10 }], loads: [{ rail: 'sw', iTypA: 1 }] })), 'collapse');
  }],

  ['powertree: a loop, a missing parent or rail and invalid numbers are errors without a result', () => {
    const src = { vNomV: 5, ambientC: 25 };
    const ldo = (id, parent, extra = {}) => ({ id, parent, type: 'ldo', voutV: 3.3, ...extra });
    // a ← b ← a
    let r = analyzePowerTree({ source: src, regs: [ldo('a', 'b'), ldo('b', 'a')], loads: [] });
    ok(!r.ok && r.totals === undefined, 'no result');
    eq(errs(r), 'cycle');
    eq(r.errors[0].ids.join(), 'a,b');
    // A regulator feeding itself, and one hanging below a loop without being part of it.
    r = analyzePowerTree({ source: src, regs: [ldo('a', 'a'), ldo('c', 'a')], loads: [] });
    eq(errs(r), 'cycle');
    eq(r.errors[0].ids.join(), 'a');
    // Three in a ring.
    eq(analyzePowerTree({ source: src, regs: [ldo('a', 'c'), ldo('b', 'a'), ldo('c', 'b')], loads: [] }).errors[0].ids.join(), 'a,b,c');
    // Missing parent, missing rail.
    r = analyzePowerTree({ source: src, regs: [ldo('a', 'nope')], loads: [{ rail: 'gone', iTypA: 0.1 }] });
    eq(errs(r), 'parent,rail');
    eq(r.errors.find((e) => e.code === 'parent').id, 'a');
    eq(r.errors.find((e) => e.code === 'rail').index, 0);
    // Numbers.
    const one = (regExtra, load = { iTypA: 0.1 }, source = src) => errs(analyzePowerTree({ source, regs: [{ id: 'a', parent: SOURCE, type: 'buck', voutV: 3.3, eff: 0.9, ...regExtra }], loads: [{ rail: 'a', ...load }] }));
    eq(one({}), '');
    eq(one({ voutV: 0 }), 'vout');
    eq(one({ voutV: NaN }), 'vout');
    eq(one({ eff: 0 }), 'eff');
    eq(one({ eff: 1.2 }), 'eff');
    eq(one({ eff: undefined }), 'eff');
    eq(one({ iqA: -1e-6 }), 'negative');
    eq(one({ iRatedA: 0 }), 'negative');
    eq(one({ thetaJA: -5 }), 'negative');
    eq(one({ type: 'magic' }), 'type');
    eq(one({}, { iTypA: -0.1 }), 'load');
    eq(one({}, { iTypA: NaN }), 'load');
    eq(one({}, { iTypA: 0.2, iMaxA: 0.1 }), 'loadMax');
    eq(one({}, undefined, { vNomV: 0, ambientC: 25 }), 'source');
    eq(one({}, undefined, { vNomV: 5, vMinV: 6, ambientC: 25 }), 'sourceRange');
    eq(one({}, undefined, { vNomV: 5, vMaxV: 4, ambientC: 25 }), 'sourceRange');
    eq(one({}, undefined, { vNomV: 5 }), 'ambient');
    eq(errs(analyzePowerTree({ source: src, regs: [ldo('a', SOURCE), ldo('a', SOURCE)], loads: [] })), 'duplicate');
    // Garbage in, no exception out.
    for (const junk of [undefined, null, {}, { regs: 'x', loads: 7 }, { source: src, regs: [null], loads: [null] }]) {
      ok(analyzePowerTree(junk).ok === false, 'rejected');
    }
  }],

  ['powertree: an empty tree and loads straight on the source', () => {
    let r = analyzePowerTree({ source: { vNomV: 5, ambientC: 25 }, regs: [], loads: [] });
    ok(r.ok, 'an empty tree is valid');
    eq(r.totals.typ.sourceA, 0);
    eq(r.totals.typ.sourceW, 0);
    eq(r.totals.typ.lossW, 0);
    ok(Number.isNaN(r.totals.typ.eff) && Number.isNaN(r.totals.worst.eff), 'no efficiency without power');
    eq(r.totals.maxLossId, null);
    eq(r.warnings.length, 0);
    eq(r.regs.length + r.loads.length + r.order.length, 0);
    // 5 V (4.5 … 5.5 V) with 0.1 A typical, 0.3 A maximum directly on it: no loss, η = 1.
    r = analyzePowerTree({ source: { vNomV: 5, vMinV: 4.5, vMaxV: 5.5, ambientC: 25 }, regs: [], loads: [{ iTypA: 0.1, iMaxA: 0.3 }] });
    near(r.totals.typ.sourceA, 0.1, 1e-12);
    near(r.totals.typ.sourceW, 0.5, 1e-12);
    eq(r.totals.typ.lossW, 0);
    eq(r.totals.typ.eff, 1);
    near(r.totals.worst.sourceA, 0.3, 1e-12);
    near(r.totals.worst.sourceW, 1.65, 1e-12); // 5.5·0.3
    eq(r.loads[0].rail, SOURCE);
  }],

  ['powertree: power balance and current sums hold on a 12-regulator tree', () => {
    const r = analyzePowerTree(toTree(wideTree()));
    ok(r.ok, JSON.stringify(r.errors));
    eq(r.regs.length, 12);
    eq(r.order.length, 12);
    for (const key of ['typ', 'lo', 'hi']) {
      const t = r.totals[key];
      // Source power = load power + all losses.
      near(t.sourceW, t.loadW + t.lossW, 1e-9, `${key} balance`);
      near(t.loadW, r.loads.reduce((a, l) => a + l[key].pW, 0), 1e-9, `${key} loads`);
      // Source current = inputs of the regulators on it + its own loads.
      const top = r.source.children.reduce((a, k) => a + r.regs[k][key].iinA, 0) + r.source.loadIdx.reduce((a, i) => a + r.loads[i][key].iA, 0);
      near(t.sourceA, top, 1e-9, `${key} source current`);
      for (const g of r.regs) {
        const p = g[key];
        const out = g.children.reduce((a, k) => a + r.regs[k][key].iinA, 0) + g.loadIdx.reduce((a, i) => a + r.loads[i][key].iA, 0);
        near(p.ioutA, out, 1e-9, `${g.name} ${key} Iout`);
        near(p.pinW, p.poutW + p.lossW, 1e-9, `${g.name} ${key} power`);
        ok(p.lossW >= -1e-12, `${g.name} ${key} loss is not negative`);
        // A child sees the output voltage of its parent.
        for (const k of g.children) near(r.regs[k][key].vinV, p.voutV, 1e-9, `${g.name} → ${r.regs[k].name}`);
      }
    }
    // Parents come before children in the calculation order.
    const pos = new Map(r.order.map((k, j) => [r.regs[k].id, j]));
    for (const g of r.regs) ok(g.parent === SOURCE || pos.get(g.parent) < pos.get(g.id), `${g.name} after its parent`);
    // Worst case never draws less than the typical case.
    ok(r.totals.worst.sourceA >= r.totals.typ.sourceA && r.totals.worst.lossW >= r.totals.typ.lossW, 'worst ≥ typical');
  }],

  // -------------------------------------------------------------------------
  // Page
  // -------------------------------------------------------------------------

  ['powertree page: loads without a DOM; the default example computes without errors', () => {
    eq(page.id, 'powertree');
    ok(typeof page.mount === 'function' && Array.isArray(page.sections), 'custom-mount page');
    for (const l of ['tr', 'en']) ok(Object.keys(page.strings[l]).length > 80, `${l} strings`);
    eq(Object.keys(page.strings.tr).sort().join(), Object.keys(page.strings.en).sort().join(), 'same keys in TR and EN');
    for (const id of Object.keys(EXAMPLES)) {
      const r = page.compute(exampleState(id));
      ok(r.ok, `${id}: ${JSON.stringify(r.errors)}`);
      ok(r.totals.typ.sourceA > 0 && r.totals.typ.eff > 0.3 && r.totals.typ.eff < 1, `${id} plausible`);
    }
    // Default: 12 V → U1 buck 5 V → U2 LDO 3.3 V (150 mA) + U3 LDO 1.8 V (120 mA), LEDs 40 mA on 5 V, fan 80 mA on 12 V.
    const r = page.compute();
    // U2: Iin = 0.15 + 60 µA = 0.15006 A, Ploss = 1.7·0.15 + 5·60e-6 = 0.2553 W
    near(reg(r, 'r1').typ.lossW, 0.2553, 1e-9);
    // U3: Iin = 0.12005 A, Ploss = 3.2·0.12 + 5·50e-6 = 0.38425 W → the largest loss
    near(reg(r, 'r2').typ.lossW, 0.38425, 1e-9);
    eq(r.totals.maxLossId, 'r2');
    // U1: Iout = 0.15006 + 0.12005 + 0.04 = 0.31011 A, Pout = 1.55055 W,
    // Pin = 1.55055/0.9 + 12·100e-6 = 1.722833 + 0.0012 = 1.724033 W, Iin = 0.1436694 A
    near(reg(r, 'r0').typ.ioutA, 0.31011, 1e-9);
    near(reg(r, 'r0').typ.pinW, 1.724033, 1e-6);
    // Source: 0.1436694 + 0.08 = 0.2236694 A
    near(r.totals.typ.sourceA, 0.2236694, 1e-6);
    // U3 worst case: 3.2·0.22 + 5·50e-6 = 0.70425 W → Tj = 25 + 0.70425·110 = 102.47 °C → the milder note only.
    near(reg(r, 'r2').worst.tjC, 102.4675, 1e-6);
    eq(codes(r), 'tjHigh');
    eq(codes(page.compute(exampleState('usb'))), '');
    eq(codes(page.compute(exampleState('liion'))), '');
  }],

  ['powertree page: the tree survives the URL round trip', () => {
    inBothLanguages((lang) => {
      eq(toQuery(defaultState()), '', `${lang}: the default example needs no parameters`);
      eq(toQuery(exampleState('usb')), 'ex=usb', lang);
      eq(toQuery(fromParams(new URLSearchParams('ex=liion'))), 'ex=liion', lang);
      eq(toQuery(fromParams(new URLSearchParams(''))), '', lang);
    });
    const st = defaultState();
    st.src = { name: 'VIN_24 & co=1', vnom: 24, vmin: 21.6, vmax: NaN, ta: -20 };
    st.regs[0] = { ...st.regs[0], name: '5V0_BUCK', eff: 92.5, theta: NaN };
    st.regs[1] = { ...st.regs[1], name: 'Çıkış 3V3', vdo: 0.125 };
    st.regs.push({ name: 'FB1', parent: 1, type: 'switch', vout: 3.3, eff: 90, iq: NaN, vdo: NaN, r: 250, imax: 500, theta: NaN });
    st.regs.push({ name: '', parent: -1, type: 'boost', vout: 48, eff: 88, iq: 400, vdo: NaN, r: NaN, imax: NaN, theta: 35 });
    st.loads[0] = { name: 'a_b_c', rail: 3, ityp: 0.005, imax: NaN };
    st.loads.push({ name: '', rail: 4, ityp: 15, imax: 20 });
    const q = toQuery(st);
    const back = fromParams(new URLSearchParams(q));
    eq(toQuery(back), q, 'stable');
    eq(back.src.name, 'VIN_24 & co=1');
    eq(back.src.vnom, 24);
    eq(back.src.vmin, 21.6);
    ok(Number.isNaN(back.src.vmax), 'empty maximum stays empty');
    eq(back.src.ta, -20);
    eq(back.regs.length, 5);
    eq(back.regs[0].name, '5V0_BUCK');
    eq(back.regs[0].type, 'buck');
    eq(back.regs[0].eff, 92.5);
    eq(back.regs[0].iq, 100);
    ok(Number.isNaN(back.regs[0].theta), 'empty θJA stays empty');
    eq(back.regs[1].name, 'Çıkış 3V3');
    eq(back.regs[1].parent, 0);
    eq(back.regs[1].vdo, 0.125);
    eq(back.regs[3].type, 'switch');
    eq(back.regs[3].parent, 1);
    eq(back.regs[3].r, 250);
    eq(back.regs[4].type, 'boost');
    eq(back.regs[4].theta, 35);
    eq(back.loads[0].name, 'a_b_c');
    eq(back.loads[0].rail, 3);
    eq(back.loads[0].ityp, 0.005);
    eq(back.loads[back.loads.length - 1].rail, 4);
    // Same analysis before and after.
    near(page.compute(back).totals.typ.sourceW, page.compute(st).totals.typ.sourceW, 1e-12);
    // Engine input: SI units, ids by position, only the parameters of the type.
    const tree = toTree(back);
    eq(tree.regs[1].parent, 'r0');
    near(tree.regs[1].iqA, 60e-6, 1e-12);
    near(tree.regs[3].rSeriesOhm, 0.25, 1e-12);
    ok(tree.regs[3].voutV === undefined && tree.regs[3].iqA === undefined, 'a switch has no set voltage');
    near(tree.regs[0].eff, 0.925, 1e-12);
    near(tree.loads[0].iTypA, 5e-6, 1e-12);
    eq(tree.loads[0].rail, 'r3');
    eq(tree.source.vNomV, 24);
    // A tree with plain names keeps to the characters a lesson link accepts, and
    // the largest tree with short names fits the 2000 characters kept for a saved calculation.
    const big = wideTree();
    while (big.loads.length < LIMITS.maxLoads) big.loads.push({ name: `L${big.loads.length + 1}`, rail: 3, ityp: 12.5, imax: 20 });
    const bq = toQuery(big);
    ok(/^[\w.%=&-]*$/.test(bq), bq);
    ok(bq.length < 2000, `query of ${bq.length} characters`);
    eq(fromParams(new URLSearchParams(bq)).loads.length, 30);
    // An empty tree is not the default example.
    const none = { src: st.src, regs: [], loads: [] };
    ok(toQuery(none).startsWith('s='), 'the source alone is written');
    eq(fromParams(new URLSearchParams(toQuery(none))).regs.length, 0);
  }],

  ['powertree page: the URL is restored defensively', () => {
    const P = (q) => fromParams(new URLSearchParams(q));
    // Nothing usable: defaults, never an exception.
    for (const junk of [null, undefined, {}, 'r=1', 42]) eq(toQuery(fromParams(junk)), '', 'not URL parameters → default');
    eq(toQuery(P('ex=nope')), '');
    eq(toQuery(P('foo=bar&x')), '');
    // Bad numbers fall back: voltage 5 V, ambient 25 °C, output 3.3 V, efficiency 90 %, load 0 mA; optional ones empty.
    let st = P('s=abc_-1_x_hot_&r=0_buck_-5_200_-3_0_zz_B&r=0_what_0&l=0_-3_zz_L&l=');
    eq(st.src.vnom, 5);
    ok(Number.isNaN(st.src.vmin) && Number.isNaN(st.src.vmax), 'range empty');
    eq(st.src.ta, 25);
    eq(st.regs[0].vout, 3.3);
    eq(st.regs[0].eff, 90);
    ok(Number.isNaN(st.regs[0].iq) && Number.isNaN(st.regs[0].imax) && Number.isNaN(st.regs[0].theta), 'optional values empty');
    eq(st.regs[1].type, 'ldo', 'unknown type');
    eq(st.regs[1].vout, 3.3);
    eq(st.loads[0].ityp, 0);
    ok(Number.isNaN(st.loads[0].imax), 'bad maximum empty');
    eq(st.loads.length, 2);
    ok(page.compute(st).ok, 'still a valid tree');
    // References: out of range or to itself → the source; a comma decimal is read.
    st = P('s=3,7___25_&r=9_ldo_1.8&r=2_ldo_1.2&r=x_ldo_1&l=7_1__a&l=-2_1__b&l=1.5_1__c&l=3_1__d');
    eq(st.src.vnom, 3.7);
    eq(st.regs.map((r) => r.parent).join(), '-1,-1,-1');
    eq(st.loads.map((l) => l.rail).join(), '-1,-1,-1,2');
    // A loop written by hand is kept and reported, not thrown.
    st = P('r=2_ldo_3.3&r=1_ldo_1.8&l=1_10__x');
    const r = page.compute(st);
    eq(errs(r), 'cycle');
    inBothLanguages((lang) => {
      const html = page.render(r, st);
      ok(html.includes('class="msg error"') && !/err_pt_|undefined|NaN/.test(html), `${lang}: ${html}`);
      ok(html.includes('REG1 → REG2'), `${lang}: names the regulators`);
    });
    eq(page.diagram(st, {}, undefined), '', 'nothing is drawn for an invalid tree');
    // Too many rows are cut to the limits; long names and control characters are cleaned.
    const many = `${'r=0_ldo_3.3&'.repeat(40)}${'l=0_1&'.repeat(100)}s=5____${'x'.repeat(100)}%07%0A`;
    st = P(many);
    eq(st.regs.length, LIMITS.maxRegs);
    eq(st.loads.length, LIMITS.maxLoads);
    eq(st.src.name, 'x'.repeat(24));
    eq(P('s=5____a%00b%1Fc%7F').src.name, 'abc');
    // Cut off in the middle of an escape, absurd magnitudes: still no exception anywhere.
    for (const q of ['s=5_4.5_5.25_25_USB%2', 'r=0_sw__1e300&l=1_1e300', 's=1e308____&r=0_boost_1e308_1e-9&l=1_1e30', 'r=0_buck_5_0.0001&l=1_5000', 'l=0_&r=&s=', 'r=_&r=__&r=___&l=_&l=__']) {
      st = P(q);
      const res = page.compute(st);
      inBothLanguages((lang) => {
        const html = page.render(res, st);
        ok(typeof html === 'string' && html.length > 0, `${lang}: ${q}`);
        ok(typeof page.diagram(st, {}, res.ok ? res : undefined) === 'string', `${lang}: drawing of ${q}`);
        ok(typeof summary(st, res, 'x') === 'string', `${lang}: summary of ${q}`);
      });
    }
  }],

  ['powertree page: the tree drawing is clean SVG with identical geometry in TR and EN (1, 3, 12 regulators)', () => {
    const trees = {
      'no regulator': { src: { name: 'BAT', vnom: 3.3, vmin: NaN, vmax: NaN, ta: 25 }, regs: [], loads: [] },
      '1 regulator': exampleState('usb'),
      '3 regulators': exampleState('12v'),
      '12 regulators, wide': wideTree(),
      '12 regulators, chain': deepTree(),
    };
    // The examples carry translated names, so they are built once and drawn in both languages.
    const geo = new Map();
    const size = new Map();
    const problems = [];
    inBothLanguages((lang) => {
      for (const [name, st] of Object.entries(trees)) {
        const r = page.compute(st);
        ok(r.ok, `${name}: ${JSON.stringify(r.errors)}`);
        const out = drawTree(r);
        for (const b of svgProblems(out)) problems.push(`${lang} · ${name}: ${b}`);
        const g = geometry(out).join('|');
        if (geo.has(name) && geo.get(name) !== g) problems.push(`${name}: geometry differs between TR and EN`);
        geo.set(name, g);
        // The labels do follow the language: a decimal comma in Turkish only.
        if (st.regs.length) ok(/>[^<]*\d,\d[^<]*</.test(out) === (lang === 'tr'), `${lang} · ${name}: decimal separator of the labels`);
        // One box per node, all inside the drawing, none overlapping.
        const [w, h] = viewBox(out);
        const boxes = rects(out);
        eq(boxes.length, 1 + st.regs.length + st.loads.length, `${name}: one box per node`);
        for (const b of boxes) ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= w && b.y + b.h <= h, `${name}: box inside ${w}×${h}`);
        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++) {
            const [a, c] = [boxes[i], boxes[j]];
            ok(a.x + a.w <= c.x || c.x + c.w <= a.x || a.y + a.h <= c.y || c.y + c.h <= a.y, `${name}: boxes ${i} and ${j} overlap`);
          }
        }
        // Text stays inside the drawing vertically; exactly one regulator is highlighted when there is a loss.
        for (const [, ty] of out.matchAll(/<text[^>]* y="([^"]*)"/g)) ok(Number(ty) > 0 && Number(ty) < h, `${name}: text at y=${ty}`);
        eq(boxes.filter((b) => b.cls === 'comp hi').length, st.regs.length ? 1 : 0, `${name}: highlighted regulator`);
        ok(w >= 440 && w <= 600, `${name}: width ${w} stays readable`);
        size.set(name, h);
      }
    });
    ok(problems.length === 0, `\n${[...new Set(problems)].slice(0, 12).join('\n')}`);
    // The height grows with the tree, the width does not.
    ok(size.get('1 regulator') < size.get('3 regulators') && size.get('3 regulators') < size.get('12 regulators, wide'), 'height grows');
    // The page object gives the same drawing to the shared diagram test.
    ok(page.diagram(undefined, {}, undefined).startsWith('<svg'), 'default drawing');
    // The checker itself notices a decimal comma.
    ok(svgProblems('<svg viewBox="0 0 10 10"><rect class="a" x="1,5" y="2" width="3" height="4"/></svg>').length > 0, 'rect');
    ok(svgProblems('<svg viewBox="0 0 10 10"><path class="a" d="M1,5,2V3"/></svg>').length > 0, 'path');
    ok(svgProblems('<svg viewBox="0 0 10 10"><text style="font-size:1,5px" x="1" y="2">a</text></svg>').length > 0, 'style');
    ok(svgProblems('<svg viewBox="0 0 10 10"><path class="a" d="M1.5,2V3"/><rect class="a" x="1.5" y="2" width="3" height="4" rx="4"/></svg>').length === 0, 'clean');
  }],

  ['powertree page: result renders in TR and EN with steps, tables, links and sources', () => {
    inBothLanguages((lang) => {
      for (const st of [defaultState(), exampleState('usb'), exampleState('liion'), wideTree(), deepTree(), { src: defaultState().src, regs: [], loads: [] }]) {
        const r = page.compute(st);
        const html = page.render(r, st);
        const where = `${lang} (${st.regs.length} regulators)`;
        const plain = html.replace(/<[^>]*>/g, ' ');
        ok(!/NaN|undefined|Infinity|\bpt_\w+|tool_/.test(plain), `${where}: ${plain.match(/.{0,30}(NaN|undefined|Infinity|pt_\w+|tool_).{0,30}/)?.[0]}`);
        ok(html.includes('class="heroes"') && html.includes('class="block steps"') && html.includes('class="refs"'), `${where}: blocks`);
        eq((html.match(/<math>/g) ?? []).length, (html.match(/<\/math>/g) ?? []).length, `${where}: balanced <math>`);
        ok(!/<mi>(frac|sqrt|text|cdot|times)<\/mi>/.test(html), `${where}: unparsed formula command`);
        ok(!/<m(i|n|text)>[^<]*(NaN|undefined|Infinity|—)[^<]*</.test(html), `${where}: a step without its value`);
        // Order on the page: values, steps, tables, links, sources.
        const at = ['class="heroes"', 'class="block steps"', 'class="table-scroll"', 'class="refs"'].map((s) => html.indexOf(s));
        ok(at.every((x, i) => x >= 0 && (i === 0 || x > at[i - 1])), `${where}: order ${at}`);
        // One table per regulator and one for the source.
        eq((html.match(/<table class="grid">/g) ?? []).length, st.regs.length + 1, `${where}: tables`);
      }
    });
    // Worked steps of the default tree: input current and loss of U3 with the reader's numbers (typical case).
    const before = getLang();
    setLang('en');
    try {
      const html = page.render(page.compute(), defaultState());
      const plainSteps = [...html.matchAll(/data-plain="([^"]*)"/g)].map((m) => m[1]);
      const has = (s) => ok(plainSteps.some((x) => (s instanceof RegExp ? s.test(x) : x === s)), `${s}\n${plainSteps.join('\n')}`);
      // U3: 120 mA + 50 µA = 120.05 mA; (5 − 1.8)·0.12 + 5·50e-6 = 0.384 + 0.00025 = 0.38425 W
      has('U3 (LDO) · input current: I_in = I_out + I_q = 120 mA + 50 µA = 120.05 mA');
      has(/^U3 \(LDO\) · loss: P_loss = \(V_in − V_out\) · I_out \+ V_in · I_q = \(5 V − 1\.8 V\) · 120 mA \+ 5 V · 50 µA = 384\.[23] mW$/);
      // U1: 40 + 150.06 + 120.05 = 310.11 mA; 5·0.31011/(0.9·12) + 100e-6 = 0.143569 + 0.0001 = 0.143669 A
      has('U1 (Buck) · output current: I_out = 40 mA + 150.06 mA + 120.05 mA = 310.11 mA');
      has('U1 (Buck) · input current: I_in = (V_out · I_out)/(η · V_in) + I_q = (5 V · 310.11 mA)/(0.9 · 12 V) + 100 µA = 143.67 mA');
      // Source: 80 + 143.67 = 223.67 mA; 12·0.22367 = 2.684 W; loads 1.871 W → η = 69.7 %
      has('Source current: I_src = 80 mA + 143.67 mA = 223.67 mA');
      has('Source power: P_src = V_src · I_src = 12 V · 223.67 mA = 2.684 W');
      has('Overall efficiency: η = P_load/P_src = 1.871 W/2.684 W = 69.7 %');
      // Bottom-up: U2 and U3 are worked out before U1, the source comes last.
      const idx = (s) => plainSteps.findIndex((x) => x.startsWith(s));
      ok(idx('U3 (LDO)') < idx('U1 (Buck)') && idx('U2 (LDO)') < idx('U1 (Buck)') && idx('U1 (Buck)') < idx('Source current'), 'order of the steps');
      ok(html.includes('Erickson') && html.includes('Horowitz'), 'sources');
      ok(html.includes('light-load') && html.includes('inrush') && html.includes('traces'), 'the note says what is left out');
      // The warning of the default tree names the regulator and its numbers.
      ok(/U3: worst-case junction temperature 102\.5 °C \(704\.[23] mW loss × θJA 110 °C\/W \+ ambient 25\.0 °C\), above 100 °C/.test(html), 'tjHigh text');
      const text = summary(defaultState(), page.compute(), 'https://example.test/#/powertree');
      ok(text.includes('U3 [LDO] ← U1: 1.8 V') && text.includes('MCU ← U2: 60 mA (max 120 mA)') && text.includes('Source current (typ.): 223.7 mA'), text);
    } finally {
      setLang(before);
    }
  }],

  ['powertree page: every warning and error has a text in both languages', () => {
    const keys = Object.keys(page.strings.en);
    for (const code of ['dropout', 'buckRange', 'boostRange', 'overRated', 'nearRated', 'tjOver', 'tjHigh', 'noLoad', 'ldoNoTheta']) ok(keys.includes(`warn_pt_${code}`), code);
    for (const code of ['source', 'sourceRange', 'ambient', 'cycle', 'parent', 'rail', 'duplicate', 'type', 'vout', 'eff', 'negative', 'load', 'loadMax', 'collapse', 'range']) ok(keys.includes(`err_pt_${code}`), code);
    // A tree that raises several warnings at once: every text is complete (no placeholder left).
    const st = {
      src: { name: 'Li-ion', vnom: 3.7, vmin: 3.0, vmax: 4.2, ta: 60 },
      regs: [
        mk.reg({ name: 'A', type: 'ldo', vout: 3.3, vdo: 0.2, imax: 100, theta: 250 }),
        mk.reg({ name: 'B', type: 'buck', vout: 3.3, eff: 90, imax: 250 }),
        mk.reg({ name: 'C', type: 'boost', vout: 4, eff: 90 }),
        mk.reg({ name: 'D', type: 'ldo', vout: 1.2 }),
        mk.reg({ name: 'E', type: 'ldo', vout: 0.8 }),
      ],
      loads: [
        mk.load({ name: 'a', rail: 0, ityp: 100, imax: 300 }),
        mk.load({ name: 'b', rail: 1, ityp: 100, imax: 220 }),
        mk.load({ name: 'c', rail: 2, ityp: 10 }),
        mk.load({ name: 'd', rail: 3, ityp: 100, imax: 400 }),
      ],
    };
    const r = page.compute(st);
    eq(codes(r), 'boostRange,buckRange,dropout,ldoNoTheta,nearRated,noLoad,overRated,tjOver');
    inBothLanguages((lang) => {
      const html = page.render(r, st);
      eq((html.match(/<ul class="msg warn">.*?<\/ul>/s)?.[0].match(/<li>/g) ?? []).length, 8, `${lang}: eight messages`);
      const msgs = html.match(/<ul class="msg warn">.*?<\/ul>/s)[0];
      ok(!/\{\w+\}|warn_pt_|undefined|NaN/.test(msgs), `${lang}: ${msgs.match(/.{0,40}(\{\w+\}|warn_pt_|undefined|NaN).{0,20}/)?.[0]}`);
    });
  }],

  ['powertree page: names typed by the user are escaped everywhere', () => {
    const evil = '<img src=x onerror=a()>'; // 23 characters
    const st = {
      src: { name: evil, vnom: 5, vmin: 4.5, vmax: NaN, ta: 25 },
      regs: [mk.reg({ name: evil, vdo: 2 }), mk.reg({ name: 'a" onfocus="x()', type: 'buck', vout: 9, eff: 90 }), mk.reg({ name: '$&{vin}\\frac{1}{2}', parent: 0 })],
      loads: [mk.load({ name: evil, rail: 0, ityp: 5 }), mk.load({ name: "'</text><script>", rail: 1, ityp: 5 })],
    };
    const back = fromParams(new URLSearchParams(toQuery(st)));
    eq(back.regs[0].name, evil, 'the name itself is kept');
    const r = page.compute(back);
    ok(r.ok && r.warnings.length >= 2, 'warnings carry the names');
    inBothLanguages((lang) => {
      const loop = { ...back, regs: [{ ...back.regs[0], parent: 0 }] }; // feeds itself; the second load has no rail
      const out = [page.render(r, back), drawTree(r), page.render(page.compute(loop), loop), formHtml(back)];
      for (const html of out) {
        ok(!/<img|<script|onfocus="x|<\/text><script/.test(html), `${lang}: markup from a name got through`);
      }
      ok(out[0].includes('&lt;img src=x onerror=a()&gt;'), `${lang}: shown as text`);
      ok(out[2].includes('class="msg error"') && out[2].includes('&lt;img src=x onerror=a()&gt;'), `${lang}: error text names the regulator`);
      // In the form the names are attribute values and option labels.
      ok(out[3].includes('value="&lt;img src=x onerror=a()&gt;"') && out[3].includes('value="a&quot; onfocus=&quot;x()"'), `${lang}: form values`);
      ok(out[3].includes('>&lt;img src=x onerror=a()&gt;</option>'), `${lang}: rail options`);
      ok(summary(back, r, '#').includes(evil), `${lang}: the plain-text summary keeps the name as typed`);
      // "$&" and "{vin}" inside a name are not expanded by the message templates.
      ok(out[0].includes('$&amp;{vin}'), `${lang}: name with $& and a placeholder`);
      ok(svgProblems(out[1]).length === 0, `${lang}: ${svgProblems(out[1]).join()}`);
    });
    // Longer than 24 characters is cut on the way in.
    eq(fromParams(new URLSearchParams(`r=0_ldo_3.3______${'y'.repeat(60)}`)).regs[0].name.length, 24);
  }],

  ['powertree page: links open thermal, DC-DC and battery with their real field keys and the same numbers', () => {
    const st = defaultState();
    st.regs.push(mk.reg({ name: 'U4', type: 'boost', vout: 24, eff: 88 }), mk.reg({ name: 'U5', type: 'buckboost', vout: 12, eff: 85 }), mk.reg({ name: 'U6', type: 'switch', r: 50 }));
    st.loads.push(mk.load({ name: 'x', rail: 3, ityp: 20, imax: 50 }), mk.load({ name: 'y', rail: 4, ityp: 20 }), mk.load({ name: 'z', rail: 5, ityp: 20 }));
    const r = page.compute(st);
    ok(r.ok, 'ok');
    const links = relatedLinks(r);
    // U2, U3 → thermal; U1 (buck), U4 (boost) → dcdc; buck-boost and switch have no page; one battery link.
    eq(links.map((l) => l.tool).join(), 'dcdc,thermal,thermal,dcdc,battery');
    const targets = { thermal: thermalPage, dcdc: dcdcPage, battery: batteryPage };
    const res = links.map((l) => {
      const { v, u, problems } = linkValues(targets[l.tool], l.query);
      ok(problems.length === 0, `${l.tool}?${l.query}: ${problems.join('; ')}`);
      ok(/^[\w.%=&+-]*$/.test(l.query), l.query);
      return targets[l.tool].compute(v, u);
    });
    const [u1, u2, u3, u4] = ['r0', 'r1', 'r2', 'r3'].map((id) => reg(r, id));
    // Thermal page: the same worst-case dissipation and junction temperature.
    near(res[1].powerW, u2.worst.lossW, 1e-3, 'U2 loss');
    near(res[1].tj, u2.worst.tjC, 1e-3, 'U2 Tj');
    near(res[2].powerW, u3.worst.lossW, 1e-3, 'U3 loss');
    near(res[2].tj, u3.worst.tjC, 1e-3, 'U3 Tj');
    // DC-DC page: buck at the highest input (13.2 V), boost at the lowest (10.8 V), worst-case load.
    ok(res[0].ok && res[0].topology === 'buck', 'buck');
    near(res[0].iL, u1.worst.ioutA, 1e-3, 'buck load current');
    near(res[0].duty, 5 / (13.2 * 0.9), 1e-3, 'buck duty at the highest input');
    ok(res[3].ok && res[3].topology === 'boost', 'boost');
    near(res[3].duty, 1 - (10.8 * 0.88) / 24, 1e-3, 'boost duty at the lowest input');
    near(res[3].iL, u4.worst.ioutA / (1 - res[3].duty), 1e-3, 'boost inductor current');
    // Battery page: a constant current equal to the typical source current, no extra event.
    ok(res[4].ok, 'battery');
    near(res[4].iAvg, r.totals.typ.sourceA, 1e-3, 'average current');
    ok(!res[4].hasBurst, 'no extra event');
    // Small currents are passed in µA: 3 V → 20 µA load.
    const tiny = relatedLinks(analyzePowerTree({ source: { vNomV: 3, ambientC: 25 }, regs: [], loads: [{ iTypA: 20e-6 }] }));
    eq(tiny.length, 1);
    eq(new URLSearchParams(tiny[0].query).get('isl_u'), 'uA');
    near(batteryPage.compute(linkValues(batteryPage, tiny[0].query).v, linkValues(batteryPage, tiny[0].query).u).iAvg, 20e-6, 1e-6);
    // Nothing to open for an LDO without load or an invalid tree.
    eq(relatedLinks(analyzePowerTree({ source: { vNomV: 5, ambientC: 25 }, regs: [{ id: 'a', parent: SOURCE, type: 'ldo', voutV: 3.3 }], loads: [] })).length, 0);
    eq(relatedLinks({ ok: false }).length, 0);
    // The links are in the rendered result.
    const html = page.render(r, st);
    for (const l of links) ok(html.includes(`href="#/${l.tool}?${l.query.replace(/&/g, '&amp;')}"`), `${l.tool} link in the page`);
  }],
];
