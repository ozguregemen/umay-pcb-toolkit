// Controlled-impedance approximations (IPC-2141 closed-form equations).
// All geometry in the same length unit (the UI normalises to mm).
//
//  microstrip           Z0 = 87/√(εr+1.41) · ln(5.98h / (0.8w + t))
//  stripline (sym.)     Z0 = 60/√εr · ln(4b / (0.67π(0.8w + t)))   b = plane-to-plane
//  diff. microstrip     Zdiff = 2·Z0 · (1 − 0.48·e^(−0.96 s/h))
//  diff. stripline      Zdiff = 2·Z0 · (1 − 0.347·e^(−2.9 s/b))
//
// Propagation delay (ps/in): microstrip 85·√(0.475εr + 0.67), stripline 85·√εr

export const STRUCTURES = ['microstrip', 'stripline', 'diffMicrostrip', 'diffStripline'];

const PS_PER_IN_BASE = 85;

export function microstripZ0(w, t, h, er) {
  return (87 / Math.sqrt(er + 1.41)) * Math.log((5.98 * h) / (0.8 * w + t));
}

export function striplineZ0(w, t, b, er) {
  return (60 / Math.sqrt(er)) * Math.log((4 * b) / (0.67 * Math.PI * (0.8 * w + t)));
}

/**
 * @param {object} p
 * @param {'microstrip'|'stripline'|'diffMicrostrip'|'diffStripline'} p.structure
 * @param {number} p.w   trace width
 * @param {number} p.t   trace thickness
 * @param {number} p.h   dielectric height (microstrip: trace→plane, stripline: plane→plane)
 * @param {number} p.er  relative permittivity
 * @param {number} [p.s] edge-to-edge spacing (differential only)
 */
export function calculateImpedance(p) {
  const { structure, w, t, h, er } = p;
  const isDiff = structure === 'diffMicrostrip' || structure === 'diffStripline';
  const isStrip = structure === 'stripline' || structure === 'diffStripline';

  const errors = [];
  if (!(w > 0)) errors.push('width');
  if (!(t > 0)) errors.push('thickness');
  if (!(h > 0)) errors.push('height');
  if (!(er >= 1)) errors.push('er');
  if (isDiff && !(p.s > 0)) errors.push('spacing');
  if (isStrip && h > 0 && t > 0 && t >= h) errors.push('striplineThickness');
  if (errors.length) return { ok: false, errors };

  const z0 = isStrip ? striplineZ0(w, t, h, er) : microstripZ0(w, t, h, er);
  if (!(z0 > 0)) return { ok: false, errors: ['geometry'] };

  const warnings = [];
  if (isStrip) {
    if (w / (h - t) >= 0.35) warnings.push('striplineWidthRange');
    if (t / h >= 0.25) warnings.push('striplineThicknessRange');
  } else {
    const ratio = w / h;
    if (ratio < 0.1 || ratio > 2.0) warnings.push('microstripRatioRange');
    if (er > 15) warnings.push('microstripErRange');
  }

  let zdiff = null;
  if (isDiff) {
    zdiff = isStrip
      ? 2 * z0 * (1 - 0.347 * Math.exp((-2.9 * p.s) / h))
      : 2 * z0 * (1 - 0.48 * Math.exp((-0.96 * p.s) / h));
  }

  const erEff = isStrip ? er : 0.475 * er + 0.67;
  const delayPsPerIn = PS_PER_IN_BASE * Math.sqrt(erEff);

  return {
    ok: true,
    structure,
    z0,
    zdiff,
    erEff,
    delayPsPerIn,
    delayPsPerMm: delayPsPerIn / 25.4,
    warnings,
  };
}
