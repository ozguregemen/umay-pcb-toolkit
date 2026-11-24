// Layer stack-up analysis: finished thickness, symmetry, reference planes and
// the controlled impedance of every signal layer (models from impedance.js).
//
// Model (foil construction, as the fabricators below publish it)
//   copper layers L1…Ln top → bottom; n − 1 dielectrics, dielectric j lies
//   between layers j and j + 1 (0-based). Outer dielectrics are prepreg, then
//   core and prepreg alternate; a 2-layer board is one core.
//   Total = Σ copper + Σ dielectric (pressed thicknesses as listed by the fab;
//   outer copper is the finished value incl. plating; solder mask and surface
//   finish are not included).
//   Trace → plane distance = Σ dielectrics + Σ copper of the layers in between
//   (an intermediate signal layer is mostly etched away and filled with resin).
//   εr of a structure = thickness-weighted mean of the dielectrics it spans.
// Structures
//   outer layer, plane on the inside        → microstrip (h)
//   inner layer, planes on both sides       → stripline (h1 ≈ h2, within 2 %)
//                                             or asymmetric stripline
//   inner layer, plane on one side only     → embedded microstrip (h, cover c
//                                             up to the board surface)
//   no plane                                → impedance not controlled
// Differential pairs: AN-905 edge-coupled approximations (microstrip formula
// for microstrip / embedded, stripline formula with b = h1 + h2 + t).

import { microstrip, asymStripline, embeddedMicrostrip, diffMicrostripZ, diffStriplineZ } from './impedance.js';

export const LAYER_COUNTS = [2, 4, 6, 8, 10];
export const ROLES = ['signal', 'gnd', 'power', 'mixed'];
export const ROLE_CODE = { signal: 'S', gnd: 'G', power: 'P', mixed: 'M' };
const CODE_ROLE = { S: 'signal', G: 'gnd', P: 'power', M: 'mixed' };
export const isPlane = (r) => r === 'gnd' || r === 'power';
export const isSignal = (r) => r === 'signal' || r === 'mixed';

/** Default roles: SIG/GND/PWR/SIG, SIG/GND/SIG/PWR/GND/SIG … (no adjacent signal layers up to 8). */
export const DEFAULT_ROLES = { 2: 'SG', 4: 'SGPS', 6: 'SGSPGS', 8: 'SGSGPSGS', 10: 'SGSSGPSSGS' };
export const rolesFromCode = (code) => [...code].map((c) => CODE_ROLE[c] ?? 'signal');
export const rolesToCode = (roles) => roles.map((r) => ROLE_CODE[r] ?? 'S').join('');

/** Foil construction: prepreg outside, then core/prepreg alternating; 2 layers = one core. */
export const dielKind = (n, j) => (n === 2 || j % 2 === 1 ? 'core' : 'prepreg');

// ---------------------------------------------------------------------------
// Presets. cu = copper per layer (µm), d = [thickness mm, εr, glass style]
// per dielectric, top → bottom.
// ---------------------------------------------------------------------------

const JLC_SRC = { url: 'https://jlcpcb.com/impedance', accessed: '2026-11-25' };
const PCBWAY_SRC = { url: 'https://www.pcbway.com/multi-layer-laminated-structure.html', accessed: '2026-11-25' };
// JLCPCB dielectric table: 7628 4.4, 3313 4.1, 2116 4.16, 1080 3.91, core 4.6.
// Copper: outer 0.035 mm (1 oz finished), inner 0.0152 mm (0.5 oz).
const J = { 7628: 4.4, 3313: 4.1, 2116: 4.16, 1080: 3.91, core: 4.6 };
const jlc4 = (pp, ppMm, coreMm) => ({
  cu: [35, 15.2, 15.2, 35],
  d: [[ppMm, J[pp], pp], [coreMm, J.core, ''], [ppMm, J[pp], pp]],
});
const jlc6 = ([p1, h1], core, [p2, h2]) => ({
  cu: [35, 15.2, 15.2, 15.2, 15.2, 35],
  d: [[h1, J[p1], p1], [core, J.core, ''], [h2, J[p2], p2], [core, J.core, ''], [h1, J[p1], p1]],
});
const GEN = 4.3; // generic FR-4 near 1 GHz (same default as the impedance page)
const gen = (cu, d) => ({ cu, d: d.map((h) => [h, GEN, '']) });

export const PRESETS = [
  // Generic examples (not a fabricator's guaranteed build): standard core and
  // prepreg thicknesses close to 1.6 mm, εr 4.3 everywhere.
  { id: 'gen2', n: 2, fab: null, ...gen([35, 35], [1.5]) },
  { id: 'gen4', n: 4, fab: null, ...gen([35, 35, 35, 35], [0.2, 1.0, 0.2]) },
  { id: 'gen6', n: 6, fab: null, ...gen([35, 18, 18, 18, 18, 35], [0.2, 0.4, 0.2, 0.4, 0.2]) },
  { id: 'gen8', n: 8, fab: null, ...gen([35, 18, 18, 18, 18, 18, 18, 35], [0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2]) },
  { id: 'gen10', n: 10, fab: null, ...gen([35, 18, 18, 18, 18, 18, 18, 18, 18, 35], [0.12, 0.2, 0.12, 0.2, 0.12, 0.2, 0.12, 0.2, 0.12]) },
  // JLCPCB standard impedance stack-ups, 1.6 mm (jlcpcb.com/impedance).
  { id: 'JLC04161H-7628', n: 4, fab: 'jlc', src: JLC_SRC, ...jlc4(7628, 0.2104, 1.065) },
  { id: 'JLC04161H-3313', n: 4, fab: 'jlc', src: JLC_SRC, ...jlc4(3313, 0.0994, 1.265) },
  { id: 'JLC04161H-2116', n: 4, fab: 'jlc', src: JLC_SRC, ...jlc4(2116, 0.1164, 1.265) },
  { id: 'JLC04161H-1080', n: 4, fab: 'jlc', src: JLC_SRC, ...jlc4(1080, 0.0764, 1.265) },
  { id: 'JLC06161H-3313', n: 6, fab: 'jlc', src: JLC_SRC, ...jlc6([3313, 0.0994], 0.55, [2116, 0.1088]) },
  { id: 'JLC06161H-7628', n: 6, fab: 'jlc', src: JLC_SRC, ...jlc6([7628, 0.2104], 0.4, [7628, 0.2028]) },
  { id: 'JLC06161H-1080', n: 6, fab: 'jlc', src: JLC_SRC, ...jlc6([1080, 0.0764], 0.55, [7628, 0.2104]) },
  // PCBWay "4-layers PCB Regular" 1.6 mm, 1 oz outer finished / 1 oz inner,
  // 70 % inner residual copper: PP 7628 RC46 % Dk 4.74, 0.1855 mm after
  // lamination; core Dk 4.6, 1.030 mm. PCBWay states 1.51 mm after
  // lamination and 1.61 mm ±10 % finished board thickness.
  { id: 'pcbway4', n: 4, fab: 'pcbway', src: PCBWAY_SRC, finishedMm: 1.61,
    cu: [35, 35, 35, 35], d: [[0.1855, 4.74, '7628'], [1.03, 4.6, ''], [0.1855, 4.74, '7628']] },
];

export const presetById = (id) => PRESETS.find((p) => p.id === id) ?? null;
export const presetsFor = (n) => PRESETS.filter((p) => p.n === n);
export const defaultPreset = (n) => `gen${n}`;

/** Stack (materials only) from a preset: { cuUm[], diel[{ h, er, kind, glass }] }. */
export function presetStack(p) {
  return {
    cuUm: [...p.cu],
    diel: p.d.map(([h, er, glass], j) => ({ h, er, kind: dielKind(p.n, j), glass })),
  };
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

/** Distance between copper layers a < b and the dielectrics it spans. */
function span(diel, cuMm, a, b) {
  let d = 0;
  let her = 0;
  let h = 0;
  for (let j = a; j < b; j++) {
    d += diel[j].h;
    her += diel[j].h * diel[j].er;
    h += diel[j].h;
  }
  for (let k = a + 1; k < b; k++) d += cuMm[k];
  return { d, her, h };
}

/** Width giving `target` Ω for a monotonically falling Z(w); NaN if out of reach. */
export function solveFor(zOf, target, hRef) {
  let lo = hRef * 1e-4;
  let hi = hRef * 200;
  const f = (w) => zOf(w) - target;
  if (!(f(lo) > 0) || !(f(hi) < 0)) return NaN;
  for (let i = 0; i < 200; i++) {
    const mid = Math.sqrt(lo * hi);
    if (f(mid) > 0) lo = mid; else hi = mid;
    if (hi / lo - 1 < 1e-10) break;
  }
  return Math.sqrt(lo * hi);
}

/**
 * Impedance model of signal layer i. Returns { structure, up, dn, h, h1, h2,
 * c, b, er, t, zOf(w), zdOf(w, s), hRef } or { structure: 'none' }.
 * up/dn = indices of the nearest plane above/below (null if none);
 * h1 = gap to the plane below, h2 = gap to the plane above (impedance-page naming).
 */
export function layerModel(roles, cuUm, diel, i) {
  const n = roles.length;
  const cuMm = cuUm.map((x) => x / 1000);
  let up = null;
  let dn = null;
  for (let k = i - 1; k >= 0; k--) if (isPlane(roles[k])) { up = k; break; }
  for (let k = i + 1; k < n; k++) if (isPlane(roles[k])) { dn = k; break; }
  const t = cuMm[i];
  const base = { up, dn, t };
  if (up === null && dn === null) return { ...base, structure: 'none' };
  if (up !== null && dn !== null) {
    const a = span(diel, cuMm, up, i);
    const b = span(diel, cuMm, i, dn);
    const er = (a.her + b.her) / (a.h + b.h);
    const h1 = b.d;
    const h2 = a.d;
    const sym = Math.abs(h1 - h2) <= 0.02 * Math.max(h1, h2);
    const B = h1 + h2 + t;
    const zOf = (w) => asymStripline(w, t, h1, h2, er).z0;
    return {
      ...base, structure: sym ? 'stripline' : 'asymStripline', h1, h2, b: B, er, hRef: B,
      zOf, zdOf: (w, s) => diffStriplineZ(zOf(w), s, B), sOver: (s) => s / B, sMax: 1.5,
    };
  }
  // One plane: outer layer → microstrip, inner layer → embedded microstrip.
  const below = dn !== null;
  const ref = below ? span(diel, cuMm, i, dn) : span(diel, cuMm, up, i);
  const outer = below ? i === 0 : i === n - 1;
  if (outer) {
    const er = ref.her / ref.h;
    const h = ref.d;
    const zOf = (w) => microstrip(w, t, h, er).z0;
    return {
      ...base, structure: 'microstrip', h, er, hRef: h,
      zOf, zdOf: (w, s) => diffMicrostripZ(zOf(w), s, h), sOver: (s) => s / h, sMax: 3,
    };
  }
  const cov = below ? span(diel, cuMm, 0, i) : span(diel, cuMm, i, n - 1);
  const er = (ref.her + cov.her) / (ref.h + cov.h);
  const h = ref.d;
  const c = cov.d;
  const zOf = (w) => embeddedMicrostrip(w, t, h, c, er).z0;
  return {
    ...base, structure: 'embedded', h, c, er, hRef: h,
    zOf, zdOf: (w, s) => diffMicrostripZ(zOf(w), s, h), sOver: (s) => s / h, sMax: 3,
  };
}

const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-12);

/** Mirror pairs that differ: copper (>10 % and > 1 µm), dielectric h (> 5 %), εr (> 0.1), and copper
 * density balance (a sparse signal layer opposite a plane or a mixed layer with pour). */
export function symmetry(roles, cuUm, diel) {
  const n = roles.length;
  const out = { cu: [], diel: [], er: [], balance: [] };
  for (let i = 0; i < n / 2; i++) {
    const j = n - 1 - i;
    if (i >= j) break;
    if (Math.abs(cuUm[i] - cuUm[j]) > 1 && rel(cuUm[i], cuUm[j]) > 0.1) out.cu.push([i, j]);
    if ((roles[i] === 'signal') !== (roles[j] === 'signal')) out.balance.push([i, j]);
  }
  for (let k = 0; k < (n - 1) / 2; k++) {
    const m = n - 2 - k;
    if (k >= m) break;
    if (rel(diel[k].h, diel[m].h) > 0.05) out.diel.push([k, m]);
    if (Math.abs(diel[k].er - diel[m].er) > 0.1) out.er.push([k, m]);
  }
  out.ok = !out.cu.length && !out.diel.length && !out.er.length;
  return out;
}

export const MIN_DIEL_MM = 0.065; // IPC-6012F default minimum dielectric (when not specified)
export const DIFF_TARGETS = [90, 100];
export const SE_TARGET = 50;

/**
 * @param {object} s { roles[], cuUm[], diel[{h, er, kind}], wMm, sMm, targetMm, tolPct }
 */
export function analyzeStackup(s) {
  const n = s.roles?.length ?? 0;
  const errors = [];
  if (!LAYER_COUNTS.includes(n)) errors.push('su_layers');
  if (s.cuUm?.length !== n || !s.cuUm.every((x) => x > 0)) errors.push('su_cu');
  if (s.diel?.length !== n - 1 || !s.diel.every((d) => d.h > 0)) errors.push('su_diel');
  if (s.diel?.length === n - 1 && !s.diel.every((d) => d.er >= 1)) errors.push('su_er');
  if (!(s.wMm > 0) || !(s.sMm > 0)) errors.push('su_ws');
  if (!(s.targetMm > 0) || !(s.tolPct >= 0)) errors.push('su_target');
  if (errors.length) return { ok: false, errors };

  const { roles, cuUm, diel, wMm, sMm } = s;
  const cuTotal = cuUm.reduce((a, x) => a + x, 0) / 1000;
  const dielTotal = diel.reduce((a, d) => a + d.h, 0);
  const totalMm = cuTotal + dielTotal;
  const lo = s.targetMm * (1 - s.tolPct / 100);
  const hi = s.targetMm * (1 + s.tolPct / 100);
  const thickness = { totalMm, cuTotal, dielTotal, lo, hi, pass: totalMm >= lo - 1e-9 && totalMm <= hi + 1e-9 };

  const signals = [];
  const noRef = [];
  const noAdj = [];
  const diffRange = [];
  for (let i = 0; i < n; i++) {
    if (!isSignal(roles[i])) continue;
    const m = layerModel(roles, cuUm, diel, i);
    const adjacent = (i > 0 && isPlane(roles[i - 1])) || (i < n - 1 && isPlane(roles[i + 1]));
    const sig = { i, role: roles[i], adjacent, ...m };
    delete sig.zOf;
    delete sig.zdOf;
    delete sig.sOver;
    if (m.structure === 'none') {
      noRef.push(i);
    } else {
      if (!adjacent) noAdj.push(i);
      sig.z0 = m.zOf(wMm);
      sig.zdiff = m.zdOf(wMm, sMm);
      sig.w50 = solveFor(m.zOf, SE_TARGET, m.hRef);
      sig.wd = DIFF_TARGETS.map((zt) => solveFor((w) => m.zdOf(w, sMm), zt, m.hRef));
      const r = m.sOver(sMm);
      if (r < 0.2 || r > m.sMax) diffRange.push(i);
    }
    signals.push(sig);
  }

  const broadside = [];
  for (let i = 0; i < n - 1; i++) if (isSignal(roles[i]) && isSignal(roles[i + 1])) broadside.push([i, i + 1]);
  const sym = symmetry(roles, cuUm, diel);
  const thin = diel.map((d, j) => (d.h < MIN_DIEL_MM - 1e-9 ? j : -1)).filter((j) => j >= 0);
  // Signal layers whose adjacent reference planes are all power planes.
  const pwrRef = signals.filter((x) => {
    const nb = [roles[x.i - 1], roles[x.i + 1]].filter(isPlane);
    return nb.length > 0 && nb.every((r) => r === 'power');
  }).map((x) => x.i);

  return {
    ok: true,
    n,
    thickness,
    signals,
    symmetry: sym,
    broadside,
    noRef,
    noAdj,
    diffRange,
    thin,
    pwrRef,
  };
}
