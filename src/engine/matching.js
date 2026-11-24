// Lumped-element impedance matching: L, π and T networks between a source
// Zs = Rs + jXs and a load ZL = RL + jXL at one frequency.
//
// Method — C. Bowick, RF Circuit Design, 2nd ed., ch. 4 (Impedance matching):
//   L network  Q = √(R_high/R_low − 1),  X_series = Q·R_low,  X_shunt = R_high/Q
//              (series element on the low-R side, shunt element on the high-R side)
//   π network  two back-to-back L networks through a virtual resistance
//              R_v = R_H/(Q² + 1), smaller than both terminations
//   T network  R_v = R_small·(Q² + 1), larger than both terminations
//   Q must exceed the L-network Q of the same terminations (Q_min).
// Complex terminations: Bowick absorbs a termination's reactance into the
// adjacent element or resonates it out. The same idea is written here as the
// closed-form L-network solution (D. M. Pozar, Microwave Engineering, 4th ed.,
// §5.1) generalised to a complex source: the network must present the
// conjugate Zt = Zs* at its input (maximum power transfer). Shunt elements see
// the parallel-equivalent resistance |Z|²/R of a termination, series elements
// its series resistance.
//
// Every design is verified by analysis: Zin is computed back from ZL through
// the ladder (zinOf) and compared with Zs* through the power-wave reflection
// coefficient Γ = (Zin − Zs*)/(Zin + Zs) (K. Kurokawa, IEEE T-MTT 13(2), 1965),
// which reduces to the usual Γ for a real source.
//
// Element convention: series parts carry a reactance X (Ω), shunt parts a
// susceptance B (S). X > 0 or B < 0 → inductor; X < 0 or B > 0 → capacitor.

import { nearestStandard } from './eseries.js';
import { fromGammaMag } from './rf.js';

const TAU = 2 * Math.PI;

// ---------------------------------------------------------------------------
// Complex arithmetic (just what the ladder analysis needs)
// ---------------------------------------------------------------------------

export const cx = (re, im = 0) => ({ re, im });
export const cabs = (z) => Math.hypot(z.re, z.im);
export function cinv(z) {
  const d = z.re * z.re + z.im * z.im;
  return cx(z.re / d, -z.im / d);
}
function cdiv(a, b) {
  const d = b.re * b.re + b.im * b.im;
  return cx((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
}

/** Power-wave reflection coefficient Γ = (Zin − Zs*)/(Zin + Zs). */
export function gammaOf(zin, zs) {
  return cdiv(cx(zin.re - zs.re, zin.im + zs.im), cx(zin.re + zs.re, zin.im + zs.im));
}

// ---------------------------------------------------------------------------
// Parts and ladder analysis
// ---------------------------------------------------------------------------

/**
 * One part from its reactance (series, Ω) or susceptance (shunt, S) at ω.
 * |react| ≤ eps means "no part" (a short for series, an open for shunt).
 */
function part(pos, role, react, w, eps) {
  if (!(Math.abs(react) > eps)) return { pos, role, kind: null, value: 0, react: 0 };
  const inductive = pos === 'series' ? react > 0 : react < 0;
  let value;
  if (pos === 'series') value = inductive ? react / w : -1 / (w * react);
  else value = inductive ? -1 / (w * react) : react / w;
  return { pos, role, kind: inductive ? 'L' : 'C', value, react };
}

/** Series reactance X or shunt susceptance B of a part at ω (0 when absent). */
export function reactAt(p, w) {
  if (!p.kind) return 0;
  if (p.pos === 'series') return p.kind === 'L' ? w * p.value : -1 / (w * p.value);
  return p.kind === 'C' ? w * p.value : -1 / (w * p.value);
}

/**
 * Walk from the load towards the source. parts are ordered source → load.
 * Returns one step per present part: { part, react, from, to } (impedances).
 */
export function stepsOf(parts, zl, w) {
  const steps = [];
  let z = zl;
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    if (!p.kind) continue;
    const react = reactAt(p, w);
    let next;
    if (p.pos === 'series') next = cx(z.re, z.im + react);
    else {
      const y = cinv(z);
      next = cinv(cx(y.re, y.im + react));
    }
    steps.push({ part: p, react, from: z, to: next });
    z = next;
  }
  return steps;
}

/** Impedance looking into the network (source side) terminated by zl. */
export function zinOf(parts, zl, w) {
  const s = stepsOf(parts, zl, w);
  return s.length ? s[s.length - 1].to : zl;
}

// ---------------------------------------------------------------------------
// Designs
// ---------------------------------------------------------------------------

function terms(zs, zl) {
  const zs2 = zs.re * zs.re + zs.im * zs.im;
  const zl2 = zl.re * zl.re + zl.im * zl.im;
  const rref = (zs.re + zl.re) / 2;
  return {
    rs: zs.re, xs: zs.im, rl: zl.re, xl: zl.im,
    gt: zs.re / zs2, bt: zs.im / zs2, // Yt = 1/Zs* = (Rs + jXs)/|Zs|²
    gl: zl.re / zl2, bl: -zl.im / zl2, // YL = 1/ZL
    rps: zs2 / zs.re, rpl: zl2 / zl.re, // parallel-equivalent resistances
    epsX: 1e-9 * rref, epsB: 1e-9 / rref,
  };
}

/** √x, with tiny negative round-off (relative to `scale`) taken as 0; NaN if really negative. */
function sqrtNonNeg(x, scale) {
  if (x < 0 && x > -1e-9 * scale) return 0;
  return x < 0 ? NaN : Math.sqrt(x);
}

function classify(parts) {
  const on = parts.filter((p) => p.kind);
  if (!on.length) return 'none';
  if (on.length === 1) return 'single';
  const ser = on.filter((p) => p.pos === 'series').map((p) => p.kind);
  const sh = on.filter((p) => p.pos === 'shunt').map((p) => p.kind);
  if (ser.every((k) => k === 'L') && sh.every((k) => k === 'C')) return 'lp';
  if (ser.every((k) => k === 'C') && sh.every((k) => k === 'L')) return 'hp';
  return 'mixed';
}

const keyOf = (parts) => parts.filter((p) => p.kind).map((p) => `${p.pos}${p.kind}${p.value.toPrecision(8)}`).join('|');

/**
 * All L-network solutions (up to four), ordered: shunt across the load first,
 * then shunt across the source; within each, the "+" (low-pass-like) sign first.
 * Each: { orient, q (node Q), parts: [source-side part, load-side part], type }.
 */
export function lSolutions(zs, zl, w) {
  const T = terms(zs, zl);
  const out = [];
  // Shunt across the load, series next to the source. Re{1/(YL + jB)} = Rs
  // ⇒ (BL + B)² = GL/Rs − GL², needs Rs ≤ |ZL|²/RL.  Q = |BL + B|/GL = √(RpL/Rs − 1).
  const kb = sqrtNonNeg(T.gl / T.rs - T.gl * T.gl, T.gl * T.gl);
  if (Number.isFinite(kb)) {
    for (const s of kb > 0 ? [1, -1] : [1]) {
      const btot = s * kb;
      const z1 = cinv(cx(T.gl, btot));
      out.push({
        orient: 'shuntLoad', q: Math.abs(btot) / T.gl,
        parts: [part('series', 'series', -T.xs - z1.im, w, T.epsX), part('shunt', 'shuntLoad', btot - T.bl, w, T.epsB)],
      });
    }
  }
  // Series next to the load, shunt across the source. Re{1/(ZL + jX)} = Gt
  // ⇒ (XL + X)² = RL/Gt − RL², needs RL ≤ |Zs|²/Rs.  Q = |XL + X|/RL = √(Rps/RL − 1).
  const ka = sqrtNonNeg(T.rl / T.gt - T.rl * T.rl, T.rl * T.rl);
  if (Number.isFinite(ka)) {
    for (const s of ka > 0 ? [1, -1] : [1]) {
      const xtot = s * ka;
      const y1 = cinv(cx(T.rl, xtot));
      out.push({
        orient: 'shuntSrc', q: Math.abs(xtot) / T.rl,
        parts: [part('shunt', 'shuntSrc', T.bt - y1.im, w, T.epsB), part('series', 'series', xtot - T.xl, w, T.epsX)],
      });
    }
  }
  // A double root or a single-part network can appear in both orientations.
  const seen = new Set();
  return out.filter((d) => {
    const k = keyOf(d.parts);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).map((d) => ({ ...d, type: classify(d.parts) }));
}

/** Number of distinct L solutions (0 for invalid terminations). */
export function lSolutionCount(zs, zl) {
  if (!(zs.re > 0) || !(zl.re > 0) || !Number.isFinite(zs.im) || !Number.isFinite(zl.im)) return 0;
  return lSolutions(zs, zl, 1).length;
}

/**
 * π network (shunt – series – shunt) with loaded Q (Bowick): R_H and R_low are
 * the parallel-equivalent resistances of the terminations, R_v = R_H/(Q² + 1).
 * variant 'lp': series L, shunt C (for resistive ends); 'hp': series C, shunt L.
 */
export function piNetwork(zs, zl, w, q, variant = 'lp') {
  const T = terms(zs, zl);
  const rh = Math.max(T.rps, T.rpl);
  const rlow = Math.min(T.rps, T.rpl);
  const qMin = Math.sqrt(Math.max(0, rh / rlow - 1));
  if (!(q >= qMin * (1 - 1e-9))) return { ok: false, errors: ['mtQMin'], qMin };
  const rv = Math.min(rh / (q * q + 1), rlow);
  const s = variant === 'hp' ? -1 : 1;
  // Load half: shunt across ZL, then series, ends on the real R_v.
  //   (BL + B2)² = GL/Rv − GL²,  X2 = −Im{1/(GL + j(BL + B2))} = (BL + B2)·Rv/GL
  const k2 = Math.sqrt(Math.max(0, T.gl / rv - T.gl * T.gl));
  const btot2 = s * k2;
  const x2 = (btot2 * rv) / T.gl;
  // Source half: series from R_v, then shunt across the source, ends on Zs*.
  //   X1² = Rv·Rps − Rv²,  B1 = Bt − Im{1/(Rv + jX1)} = Bt + X1/(Rv·Rps)
  const k1 = Math.sqrt(Math.max(0, rv * T.rps - rv * rv));
  const x1 = s * k1;
  const b1 = T.bt + x1 / (rv * rv + k1 * k1);
  const parts = [
    part('shunt', 'shuntSrc', b1, w, T.epsB),
    part('series', 'series', x1 + x2, w, T.epsX),
    part('shunt', 'shuntLoad', btot2 - T.bl, w, T.epsB),
  ];
  return { ok: true, q, qMin, rv, parts, type: classify(parts) };
}

/**
 * T network (series – shunt – series) with loaded Q (Bowick): R_small and
 * R_large are the series resistances of the terminations, R_v = R_small·(Q² + 1).
 */
export function tNetwork(zs, zl, w, q, variant = 'lp') {
  const T = terms(zs, zl);
  const rsmall = Math.min(T.rs, T.rl);
  const rlarge = Math.max(T.rs, T.rl);
  const qMin = Math.sqrt(Math.max(0, rlarge / rsmall - 1));
  if (!(q >= qMin * (1 - 1e-9))) return { ok: false, errors: ['mtQMin'], qMin };
  const rv = Math.max(rsmall * (q * q + 1), rlarge);
  const gv = 1 / rv;
  const s = variant === 'hp' ? -1 : 1;
  // Load half: series next to ZL, then shunt, ends on the real conductance 1/R_v.
  //   (XL + X2)² = RL·Rv − RL²,  B2 = −Im{1/(RL + j(XL + X2))} = (XL + X2)/(RL·Rv)
  const k2 = Math.sqrt(Math.max(0, T.rl * rv - T.rl * T.rl));
  const xtot2 = s * k2;
  const b2 = xtot2 / (T.rl * rv);
  // Source half: shunt from 1/R_v, then series next to the source, ends on Zs*.
  //   B1² = Gv/Rs − Gv²,  X1 = −Xs − Im{1/(Gv + jB1)} = −Xs + B1·Rs·Rv
  const k1 = Math.sqrt(Math.max(0, gv / T.rs - gv * gv));
  const b1 = s * k1;
  const x1 = -T.xs + b1 * T.rs * rv;
  const parts = [
    part('series', 'seriesSrc', x1, w, T.epsX),
    part('shunt', 'shuntMid', b1 + b2, w, T.epsB),
    part('series', 'seriesLoad', xtot2 - T.xl, w, T.epsX),
  ];
  return { ok: true, q, qMin, rv, parts, type: classify(parts) };
}

// ---------------------------------------------------------------------------
// Frequency sweep (bandwidth)
// ---------------------------------------------------------------------------

/**
 * Termination at f when its reactance at f0 is modelled as a fixed L (X > 0)
 * or C (X < 0) in series with a constant R.
 */
function termAt(z, f, f0) {
  if (z.im === 0) return z;
  return cx(z.re, z.im > 0 ? (z.im * f) / f0 : (z.im * f0) / f);
}

/** |Γ|² of the network at f (parts fixed, terminations modelled as in termAt). */
export function reflectionAt(parts, zs, zl, f0, f) {
  const zin = zinOf(parts, termAt(zl, f, f0), TAU * f);
  const g = gammaOf(zin, termAt(zs, f, f0));
  return g.re * g.re + g.im * g.im;
}

/**
 * Band edges around f0 where |Γ|² first exceeds 0.5 (−3 dB, half the
 * available power reflected) and 1/9 (VSWR = 2). Geometric walk in 0.2 %
 * steps out to f0/120 … 120·f0, then bisection. null = no edge in that range.
 */
export function bandEdges(parts, zs, zl, f0) {
  const g2 = (f) => reflectionAt(parts, zs, zl, f0, f);
  const g0 = g2(f0);
  const step = 1.002;
  const n = Math.ceil(Math.log(120) / Math.log(step));
  const edges = (lim) => {
    if (!(g0 <= lim)) return { lo: null, hi: null };
    const find = (dir) => {
      let a = f0;
      for (let i = 0; i < n; i++) {
        const b = dir > 0 ? a * step : a / step;
        if (g2(b) > lim) {
          let ok = a;
          let bad = b;
          for (let k = 0; k < 40; k++) {
            const m = Math.sqrt(ok * bad);
            if (g2(m) > lim) bad = m; else ok = m;
          }
          return Math.sqrt(ok * bad);
        }
        a = b;
      }
      return null;
    };
    return { lo: find(-1), hi: find(1) };
  };
  return { bw3: edges(0.5), bw2: edges(1 / 9), fMin: f0 / 120, fMax: f0 * 120 };
}

// ---------------------------------------------------------------------------
// Complete design for the calculator page
// ---------------------------------------------------------------------------

/** Designators source → load: L1, L2 … and C1, C2 … */
function nameParts(parts) {
  const n = { L: 0, C: 0 };
  return parts.map((p) => (p.kind ? { ...p, name: `${p.kind}${++n[p.kind]}` } : { ...p, name: '' }));
}

/**
 * @param {object} p { fHz, zs, zl ({re, im}), topology 'L'|'pi'|'T', q, variant 'lp'|'hp',
 *                     sol (1-based L solution), series 'exact'|'E12'|'E24' }
 */
export function matchNetwork({ fHz, zs, zl, topology = 'L', q = 3, variant = 'lp', sol = 1, series = 'exact' }) {
  if (!(fHz > 0) || !(zs.re > 0) || !(zl.re > 0) || !Number.isFinite(zs.im) || !Number.isFinite(zl.im)) {
    return { ok: false, errors: ['mtInputs'] };
  }
  const w = TAU * fHz;
  const before = fromGammaMag(cabs(gammaOf(zl, zs)));
  const warnings = [];
  let design;
  let solutions = null;
  let pick = 1;
  if (topology === 'pi' || topology === 'T') {
    design = (topology === 'pi' ? piNetwork : tNetwork)(zs, zl, w, q, variant);
    if (!design.ok) return { ok: false, errors: design.errors, qMin: design.qMin, before };
  } else {
    solutions = lSolutions(zs, zl, w).map((d) => ({ ...d, parts: nameParts(d.parts) }));
    pick = sol >= 1 && sol <= solutions.length ? sol : 1;
    if (pick !== sol) warnings.push('mtSol');
    design = solutions[pick - 1];
  }
  const parts = nameParts(design.parts);
  const zin = zinOf(parts, zl, w);
  const after = fromGammaMag(cabs(gammaOf(zin, zs)));

  // Standard values: nearest E-series value per part, match recomputed.
  let stdParts = null;
  let zinStd = null;
  let afterStd = null;
  if (series && series !== 'exact') {
    stdParts = parts.map((p) => {
      if (!p.kind) return p;
      const value = nearestStandard(p.value, series).nearest;
      const q2 = { ...p, value, exact: p.value, errorPct: ((value - p.value) / p.value) * 100 };
      return { ...q2, react: reactAt(q2, w) };
    });
    zinStd = zinOf(stdParts, zl, w);
    afterStd = fromGammaMag(cabs(gammaOf(zinStd, zs)));
  }

  const bw = bandEdges(parts, zs, zl, fHz);
  const on = parts.filter((p) => p.kind);
  if (on.some((p) => p.kind === 'L' && p.value < 1e-9)) warnings.push('mtTinyL');
  if (on.some((p) => p.kind === 'C' && p.value < 0.5e-12)) warnings.push('mtTinyC');
  if (design.q > 10) warnings.push('mtHighQ');
  if (afterStd && afterStd.returnLossDb < 15) warnings.push('mtStd');
  if (fHz > 3e9) warnings.push('mtHighF');

  return {
    ok: true,
    topology: topology === 'pi' || topology === 'T' ? topology : 'L',
    fHz, w, zs, zl,
    target: cx(zs.re, -zs.im),
    parts, stdParts, series: stdParts ? series : 'exact',
    type: design.type,
    q: design.q,
    qMin: design.qMin ?? null,
    rv: design.rv ?? null,
    orient: design.orient ?? null,
    solutions, pick,
    zin, zinStd,
    before, after, afterStd,
    bw,
    matched: before.gamma < 1e-6,
    warnings,
  };
}
