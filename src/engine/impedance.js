// Controlled-impedance transmission lines. All lengths in the same unit (mm).
//
//  microstrip      Hammerstad & Jensen (1980), finite thickness   (~0.2 % for t = 0)
//  stripline       Wheeler (1978), finite thickness                (~0.5 %)
//  asym. stripline parallel combination of two symmetric striplines (~few %)
//  embedded µstrip air microstrip / √εr' with εr' = εr(1 − e^(−1.55·H1/h)) (IPC-2141)
//  CPWG            conformal mapping, zero thickness (Wadell / Simons)
//  differential    edge-coupled approximations (National AN-905, ±10 %)
//
// IPC-2141 single-line formulas are also returned for comparison.

const ETA0 = 376.730313668; // Ω
const C0 = 299792458; // m/s
const MU0 = 4e-7 * Math.PI;

export const STRUCTURES = ['microstrip', 'embedded', 'stripline', 'asymStripline', 'cpwg', 'diffMicrostrip', 'diffStripline'];
export const isDiff = (s) => s === 'diffMicrostrip' || s === 'diffStripline';
export const isStripType = (s) => s === 'stripline' || s === 'asymStripline' || s === 'diffStripline';

// ---------- math ----------
/** Complete elliptic integral of the first kind K(k) via the AGM. */
export function ellipK(k) {
  let a = 1;
  let b = Math.sqrt(1 - k * k);
  for (let i = 0; i < 40 && Math.abs(a - b) > 1e-15 * a; i++) {
    const an = (a + b) / 2;
    b = Math.sqrt(a * b);
    a = an;
  }
  return Math.PI / (2 * a);
}
const kRatio = (k) => ellipK(k) / ellipK(Math.sqrt(1 - k * k)); // K(k)/K(k')

// ---------- microstrip (Hammerstad–Jensen) ----------
function hjZ01(u) {
  const f = 6 + (2 * Math.PI - 6) * Math.exp(-Math.pow(30.666 / u, 0.7528));
  return (ETA0 / (2 * Math.PI)) * Math.log(f / u + Math.sqrt(1 + (2 / u) ** 2));
}
function hjEeff(u, er) {
  const a = 1 + Math.log((u ** 4 + (u / 52) ** 2) / (u ** 4 + 0.432)) / 49 + Math.log(1 + (u / 18.1) ** 3) / 18.7;
  const b = 0.564 * Math.pow((er - 0.9) / (er + 3), 0.053);
  return (er + 1) / 2 + ((er - 1) / 2) * Math.pow(1 + 10 / u, -a * b);
}

/** Microstrip Z0 and εeff (w, t, h same unit). */
export function microstrip(w, t, h, er) {
  const u = w / h;
  let u1 = u;
  let ur = u;
  if (t > 0) {
    const T = t / h;
    const coth = 1 / Math.tanh(Math.sqrt(6.517 * u));
    const du1 = (T / Math.PI) * Math.log(1 + (4 * Math.E) / (T * coth * coth));
    const dur = 0.5 * (1 + 1 / Math.cosh(Math.sqrt(er - 1))) * du1;
    u1 = u + du1;
    ur = u + dur;
  }
  const ee = hjEeff(ur, er);
  const z0 = hjZ01(ur) / Math.sqrt(ee);
  const erEff = ee * (hjZ01(u1) / hjZ01(ur)) ** 2;
  return { z0, erEff };
}

// ---------- stripline (Wheeler 1978) ----------
/** Symmetric stripline, b = plane-to-plane spacing. */
export function stripline(w, t, b, er) {
  const x = t / b;
  let dW = 0;
  if (x > 0) {
    const m = 2 / (1 + (2 / 3) * (x / (1 - x)));
    dW = (b - t) * (x / (Math.PI * (1 - x)))
      * (1 - 0.5 * Math.log((x / (2 - x)) ** 2 + Math.pow((0.0796 * x) / (w / b + 1.1 * x), m)));
  }
  const r = (b - t) / (w + dW); // (b − t)/W'
  const A = (8 / Math.PI) * r;
  const z0 = (30 / Math.sqrt(er)) * Math.log(1 + (4 / Math.PI) * r * (A + Math.sqrt(A * A + 6.27)));
  return { z0, erEff: er };
}

/** Offset stripline: h1/h2 = dielectric between trace and each plane. */
export function asymStripline(w, t, h1, h2, er) {
  const z1 = stripline(w, t, 2 * h1 + t, er).z0;
  const z2 = stripline(w, t, 2 * h2 + t, er).z0;
  return { z0: (2 * z1 * z2) / (z1 + z2), erEff: er };
}

/** Embedded (buried) microstrip; c = dielectric cover above the trace top. */
export function embeddedMicrostrip(w, t, h, c, er) {
  const H1 = h + t + c;
  const erp = er * (1 - Math.exp((-1.55 * H1) / h));
  const erEff = Math.max(1, erp);
  return { z0: microstrip(w, t, h, 1).z0 / Math.sqrt(erEff), erEff };
}

/** Grounded coplanar waveguide (zero thickness): centre w, gap s, height h. */
export function cpwg(w, s, h, er) {
  const k = w / (w + 2 * s);
  const k1 = Math.tanh((Math.PI * w) / (4 * h)) / Math.tanh((Math.PI * (w + 2 * s)) / (4 * h));
  const r = kRatio(k); // K(k)/K(k')
  const r1 = kRatio(k1); // K(k1)/K(k1')
  const q = r1 / r; // K(k')K(k1) / (K(k)K(k1'))
  const erEff = (1 + er * q) / (1 + q);
  const z0 = ((60 * Math.PI) / Math.sqrt(erEff)) / (r + r1);
  return { z0, erEff };
}

// ---------- IPC-2141 comparison formulas ----------
export const ipc2141Microstrip = (w, t, h, er) => (87 / Math.sqrt(er + 1.41)) * Math.log((5.98 * h) / (0.8 * w + t));
export const ipc2141Stripline = (w, t, b, er) => (60 / Math.sqrt(er)) * Math.log((4 * b) / (0.67 * Math.PI * (0.8 * w + t)));

// ---------- differential ----------
export const diffMicrostripZ = (z0, s, h) => 2 * z0 * (1 - 0.48 * Math.exp((-0.96 * s) / h));
// AN-905 (Mears, 1996) uses 0.374; the frequently quoted 0.347 is a transcription error.
export const diffStriplineZ = (z0, s, b) => 2 * z0 * (1 - 0.374 * Math.exp((-2.9 * s) / b));

/** Single-ended line for a structure. p: { structure, w, t, h, h2, c, s, er } */
function line(p) {
  switch (p.structure) {
    case 'microstrip':
    case 'diffMicrostrip':
      return microstrip(p.w, p.t, p.h, p.er);
    case 'stripline':
    case 'diffStripline':
      return stripline(p.w, p.t, p.h, p.er);
    case 'asymStripline':
      return asymStripline(p.w, p.t, p.h, p.h2, p.er);
    case 'embedded':
      return embeddedMicrostrip(p.w, p.t, p.h, p.c, p.er);
    case 'cpwg':
      return cpwg(p.w, p.s, p.h, p.er);
    default:
      throw new Error(`Unknown structure ${p.structure}`);
  }
}

/** Impedance that synthesis targets: Zdiff for pairs, Z0 otherwise. */
function mainZ(p) {
  const { z0 } = line(p);
  if (p.structure === 'diffMicrostrip') return diffMicrostripZ(z0, p.s, p.h);
  if (p.structure === 'diffStripline') return diffStriplineZ(z0, p.s, p.h);
  return z0;
}

/** Width that gives `target` Ω (bisection; Z falls monotonically with w). */
export function solveWidth(p, target) {
  let lo = p.h * 1e-4;
  let hi = p.h * 200;
  const f = (w) => mainZ({ ...p, w }) - target;
  if (!(f(lo) > 0) || !(f(hi) < 0)) return NaN;
  for (let i = 0; i < 200; i++) {
    const mid = Math.sqrt(lo * hi); // geometric bisection: width spans decades
    if (f(mid) > 0) lo = mid; else hi = mid;
    if (hi / lo - 1 < 1e-10) break;
  }
  return Math.sqrt(lo * hi);
}

/**
 * Full calculation.
 * @param {object} p  { structure, w, t, h, h2?, c?, s?, er, tanD?, fHz?, lengthMm?, mode?, target? }
 *   lengths in mm. For stripline h = plane-to-plane spacing b; asymmetric: h, h2 = trace→plane gaps.
 */
export function calculateImpedance(p) {
  const st = p.structure;
  const errors = [];
  if (!(p.t >= 0) || (st !== 'cpwg' && !(p.t > 0))) errors.push('thickness');
  if (!(p.h > 0)) errors.push('height');
  if (!(p.er >= 1)) errors.push('er');
  if ((isDiff(st) || st === 'cpwg') && !(p.s > 0)) errors.push('spacing');
  if (st === 'asymStripline' && !(p.h2 > 0)) errors.push('height2');
  if (st === 'embedded' && !(p.c >= 0)) errors.push('cover');
  if ((st === 'stripline' || st === 'diffStripline') && p.t >= p.h) errors.push('striplineThickness');
  if (errors.length) return { ok: false, errors };

  let w = p.w;
  if (p.mode === 'synth') {
    w = solveWidth(p, p.target);
    if (!(w > 0)) return { ok: false, errors: ['noSolution'] };
  } else if (!(w > 0)) {
    return { ok: false, errors: ['width'] };
  }
  const q = { ...p, w };
  const { z0, erEff } = line(q);
  if (!(z0 > 0) || !Number.isFinite(z0)) return { ok: false, errors: ['geometry'] };

  let zdiff = null;
  let zodd = null;
  if (st === 'diffMicrostrip') zdiff = diffMicrostripZ(z0, p.s, p.h);
  if (st === 'diffStripline') zdiff = diffStriplineZ(z0, p.s, p.h);
  if (zdiff !== null) zodd = zdiff / 2;

  // IPC-2141 comparison (only where an IPC-2141 single-line formula exists)
  let ipc = null;
  if (st === 'microstrip' || st === 'diffMicrostrip') ipc = ipc2141Microstrip(w, p.t, p.h, p.er);
  if (st === 'stripline' || st === 'diffStripline') ipc = ipc2141Stripline(w, p.t, p.h, p.er);
  if (!(ipc > 0)) ipc = null;

  const warnings = [];
  if (st === 'microstrip' || st === 'diffMicrostrip' || st === 'embedded') {
    const u = w / p.h;
    if (u < 0.01 || u > 100) warnings.push('hjRange');
  }
  if (st === 'stripline' || st === 'diffStripline') {
    if ((w + 0) / (p.h - p.t) > 10) warnings.push('wheelerRange');
  }
  // AN-905 validity: microstrip 0.2 ≤ s/h ≤ 3.0, stripline 0.2 ≤ s/b ≤ 1.5
  const sMax = st === 'diffStripline' ? 1.5 : 3;
  if (isDiff(st) && (p.s / p.h < 0.2 || p.s / p.h > sMax)) warnings.push('diffApprox');
  if (st === 'cpwg' && p.t > 0) warnings.push('cpwgThickness');
  if (st === 'embedded' && p.c / p.h > 2) warnings.push('embeddedCover');

  // Delay
  const tpdSperM = Math.sqrt(erEff) / C0;
  const delayPsPerMm = tpdSperM * 1e9; // s/m → ps/mm
  const res = {
    ok: true,
    structure: st,
    w,
    z0,
    zdiff,
    zodd,
    erEff,
    ipc,
    delayPsPerMm,
    delayPsPerIn: delayPsPerMm * 25.4,
    velocityFrac: 1 / Math.sqrt(erEff),
    warnings,
    loss: null,
  };
  if (p.lengthMm > 0) res.totalDelayPs = delayPsPerMm * p.lengthMm;

  // Loss at f (optional)
  if (p.fHz > 0) {
    const rho = 1.724e-8;
    const k0 = (2 * Math.PI * p.fHz) / C0;
    const tanD = p.tanD > 0 ? p.tanD : 0;
    // Dielectric loss (Np/m), Pozar: k0 εr (εeff − 1) tanδ / (2 √εeff (εr − 1)); homogeneous: k0 √εr tanδ / 2
    const homogeneous = isStripType(st) || p.er === 1 || Math.abs(erEff - p.er) < 1e-9;
    const adNp = homogeneous
      ? (k0 * Math.sqrt(p.er) * tanD) / 2
      : (k0 * p.er * (erEff - 1) * tanD) / (2 * Math.sqrt(erEff) * (p.er - 1));
    // Conductor loss, smooth copper, uniform-current approximation: Rs / (Z0 · W_eff)
    const Rs = Math.sqrt((Math.PI * p.fHz * MU0 * rho));
    const wM = (w / 1000) * (isStripType(st) ? 2 : 1);
    const acNp = Rs / (z0 * wM);
    const toDbPerMm = 8.686 / 1000;
    const skinUm = Math.sqrt(rho / (Math.PI * p.fHz * MU0)) * 1e6;
    res.loss = {
      dielectricDbPerMm: adNp * toDbPerMm,
      conductorDbPerMm: acNp * toDbPerMm,
      totalDbPerMm: (adNp + acNp) * toDbPerMm,
      skinUm,
    };
    if (tanD === 0) warnings.push('noTanD');
    if (p.t > 0 && skinUm > p.t * 1000) warnings.push('skinThick');
  }
  return res;
}
