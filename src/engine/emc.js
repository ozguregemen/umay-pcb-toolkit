// EMC rules of thumb.
//
// Stitching vias: pitch ≤ λ/20 (λ/10 at most) at the highest frequency of
// interest, λ measured in the dielectric (M. K. Armstrong, "PCB design
// techniques for lowest-cost EMC compliance", IEE Electronics &
// Communication Engineering Journal 11(4), 1999; H. W. Ott,
// Electromagnetic Compatibility Engineering, Wiley 2009).
// Highest frequency from an edge: 0.35/tr (single pole, H. Johnson).
// Slot / aperture: half-wave resonance f = c/(2·L·√εeff); single-aperture
// shielding SE ≈ 20·log10(λ/(2L)) (Ott, ch. 6) — a rough upper estimate.
// LC low-pass (inductor or ferrite bead + capacitor): second-order transfer
// with source and load resistance; peaking and damping per Analog Devices
// AN-1368 "Ferrite Bead Demystified"; optimum parallel Rd–Cd damping per
// R. W. Erickson, D. Maksimović, Fundamentals of Power Electronics, §10.4.1.

export const C0 = 299792458; // m/s
const TAU = 2 * Math.PI;

/** Highest frequency of interest. mode 'tr' (0.35/tr), 'clk' (N-th harmonic) or 'f'. */
export function fMax({ mode, tr, fClk, harmonic, f }) {
  if (mode === 'tr') return 0.35 / tr;
  if (mode === 'clk') return fClk * harmonic;
  return f;
}

/** Wavelength in a dielectric of relative permittivity er. */
export const wavelength = (fHz, er = 1) => C0 / (fHz * Math.sqrt(er));

/** Stitching-via pitch for λ/divisor; count along an optional edge length (m). */
export function stitching({ fHz, er, divisor = 20, edgeM }) {
  const lambda = wavelength(fHz, er);
  const pitch = lambda / divisor;
  const r = { lambda, pitch, l10: lambda / 10, l20: lambda / 20 };
  if (edgeM > 0) r.count = Math.ceil(edgeM / pitch) + 1;
  return r;
}

/** Slot of length lengthM (m): resonance, rough shielding at fHz, longest slot for targetDb. */
export function slot({ lengthM, erEff = 1, fHz, targetDb }) {
  const fRes = C0 / (2 * lengthM * Math.sqrt(erEff));
  const lambda = wavelength(fHz, erEff);
  const r = { fRes, lambda, se: 20 * Math.log10(lambda / (2 * lengthM)), ratio: lengthM / lambda };
  if (targetDb > 0) r.lMax = lambda / (2 * 10 ** (targetDb / 20));
  return r;
}

// Complex helpers [re, im]
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const div = ([a, b], [c, d]) => { const n = c * c + d * d; return [(a * c + b * d) / n, (b * c - a * d) / n]; };
const inv = (z) => div([1, 0], z);
const mag = (z) => Math.hypot(z[0], z[1]);

/**
 * |Vout/Vin| of the L-section low-pass: source resistance rs (with the
 * inductor DCR) → L → node with C, optional damping branch Rd + Cd, and an
 * optional load rl (NaN/0 = open). Normalised to the DC gain rl/(rs + rl).
 */
export function lcGain(f, { l, c, rs = 0, rl, rd, cd }) {
  const w = TAU * f;
  let y = [0, w * c];
  if (rd > 0 && cd > 0) y = add(y, inv([rd, -1 / (w * cd)]));
  const load = rl > 0;
  if (load) y = add(y, [1 / rl, 0]);
  const zsh = inv(y);
  const h = div(zsh, add([rs, w * l], zsh));
  const dc = load ? rl / (rs + rl) : 1;
  return mag(h) / dc;
}

/** Erickson §10.4.1: optimum Rd for a parallel Rd–Cd branch with n = Cd/C. */
export const optimumDamping = (z0, n) => ({
  rd: z0 * Math.sqrt(((2 + n) * (4 + 3 * n)) / (2 * n * n * (4 + n))),
  zPeak: (z0 * Math.sqrt(2 * (2 + n))) / n, // peak output impedance
});

/** Largest gain (normalised to DC) and its frequency, by a log sweep and refinement. */
function peak(p, f0) {
  let best = [f0, lcGain(f0, p)];
  const lo = Math.log10(f0 / 100);
  const hi = Math.log10(f0 * 100);
  const N = 400;
  let k0 = 0;
  for (let k = 0; k <= N; k++) {
    const f = 10 ** (lo + ((hi - lo) * k) / N);
    const g = lcGain(f, p);
    if (g > best[1]) { best = [f, g]; k0 = k; }
  }
  // Golden-section refinement around the best sample.
  let a = lo + ((hi - lo) * Math.max(0, k0 - 1)) / N;
  let b = lo + ((hi - lo) * Math.min(N, k0 + 1)) / N;
  const gr = (Math.sqrt(5) - 1) / 2;
  for (let i = 0; i < 60; i++) {
    const x1 = b - gr * (b - a);
    const x2 = a + gr * (b - a);
    if (lcGain(10 ** x1, p) > lcGain(10 ** x2, p)) b = x2; else a = x1;
  }
  const fp = 10 ** ((a + b) / 2);
  const gp = lcGain(fp, p);
  return gp > best[1] ? [fp, gp] : best;
}

/**
 * @param {object} p
 * @param {number} p.l, p.c   inductance (H), capacitance (F)
 * @param {number} [p.rs]     source resistance incl. inductor/bead DCR (Ω)
 * @param {number} [p.rl]     load resistance (Ω), empty = open
 * @param {number} [p.rd], [p.cd] damping branch across C
 * @param {number} [p.fx]     frequency to evaluate (Hz)
 */
export function lcFilter(p) {
  const { l, c } = p;
  const rs = p.rs > 0 ? p.rs : 0;
  const rl = p.rl > 0 ? p.rl : NaN;
  const f0 = 1 / (TAU * Math.sqrt(l * c));
  const z0 = Math.sqrt(l / c);
  // H(s) = 1 / (LC·s² + (L/RL + Rs·C)·s + 1 + Rs/RL)
  const g = rl > 0 ? 1 + rs / rl : 1;
  const b1 = (rl > 0 ? l / rl : 0) + rs * c;
  const q = b1 > 0 ? Math.sqrt(l * c * g) / b1 : Infinity;
  const base = { l, c, rs, rl };
  const damped = p.rd > 0 && p.cd > 0;
  const net = damped ? { ...base, rd: p.rd, cd: p.cd } : base;
  const r = {
    ok: true, f0, z0, q, damped,
    fRes: f0 * Math.sqrt(g), // resonance including the Rs/RL divider
    suggest: { cd: 4 * c, ...optimumDamping(z0, 4) },
  };
  // Bare network: analytic peak for a second-order low-pass.
  r.peakBare = Number.isFinite(q) ? (q > Math.SQRT1_2 ? q / Math.sqrt(1 - 1 / (4 * q * q)) : 1) : Infinity;
  if (damped) {
    const [fp, gp] = peak(net, f0);
    r.peak = Math.max(1, gp);
    r.peakF = fp;
  } else {
    r.peak = r.peakBare;
    r.peakF = Number.isFinite(q) && q > Math.SQRT1_2 ? r.fRes * Math.sqrt(1 - 1 / (2 * q * q)) : NaN;
  }
  r.peakDb = 20 * Math.log10(r.peak);
  if (p.fx > 0) {
    r.fx = p.fx;
    r.gainX = lcGain(p.fx, net);
    r.attDb = -20 * Math.log10(r.gainX);
    r.attBareDb = -20 * Math.log10(lcGain(p.fx, base));
  }
  r.net = net;
  r.base = base;
  r.warnings = [];
  if (r.peakDb > 6) r.warnings.push('em_peaking');
  return r;
}
