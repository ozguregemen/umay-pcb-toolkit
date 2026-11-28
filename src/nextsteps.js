// Which calculator a result is usually taken to next.
//
// NEXT[toolId] = [{ to, why, q }]
//   to   id of the follow-up tool
//   why  i18n key: one short line saying what the follow-up answers
//   q    (r, v, u) => { fieldKey: value, fieldKey_u: unit } for the follow-up
//        page, built from this page's result r, values v and units u.
//        Return null to leave the link out for this result; leave q out to
//        open the follow-up with its own defaults. Lengths are passed in mm
//        and other quantities in a unit the target field offers, so a link
//        does not depend on the units chosen here.
//
// tests/cases/nextsteps.js opens every link for every option of its page and
// checks the keys, units and values against the target page.

import { toMm, currentToA } from './engine/units.js';

const finite = (...xs) => xs.every((x) => typeof x === 'number' && Number.isFinite(x));
/** A length in mm, or undefined when it is not given. */
const mm = (value, unit) => (finite(value) ? toMm(value, unit) : undefined);
/** A current in A, or undefined when it is not given. */
const amp = (value, unit) => (finite(value) ? currentToA(value, unit) : undefined);

export const NEXT = {
  trace: [
    // The same conductor under a short circuit: copper in mm, thickness in the unit both pages know.
    { to: 'fusing', why: 'next_trace_fusing', q: (r, v, u) => ({
      k: 'trace',
      w: finite(r.widthMm) ? r.widthMm : mm(v.W, u.W), w_u: 'mm',
      ...(u.t === 'mm' ? { t: v.t * 1000, t_u: 'um' } : { t: v.t, t_u: u.t }),
    }) },
    { to: 'via', why: 'next_trace_via', q: (r) => (finite(r.currentA) ? { I: r.currentA, I_u: 'A' } : {}) },
    { to: 'dcdrop', why: 'next_trace_dcdrop' },
  ],
  via: [
    { to: 'fusing', why: 'next_via_fusing', q: (r, v, u) => ({ k: 'via', d: mm(v.d, u.d), d_u: 'mm', p: v.p, p_u: u.p }) },
    { to: 'trace', why: 'next_via_trace', q: (r, v, u) => ({ mode: 'width', I: amp(v.I, u.I), I_u: finite(v.I) ? 'A' : undefined }) },
  ],
  impedance: [
    // A single-ended line can be terminated with the page's own Z0 and delay.
    { to: 'termination', why: 'next_impedance_termination',
      q: (r) => (finite(r.z0, r.delayPsPerMm) && !r.zdiff ? { z0: r.z0, tpd: r.delayPsPerMm, tpd_u: 'psmm' } : null) },
    { to: 'crosstalk', why: 'next_impedance_crosstalk', q: (r, v, u) => {
      const st = { microstrip: 'micro', embedded: 'micro', stripline: 'strip', asymStripline: 'strip' }[r.structure];
      return st ? { st, w: mm(v.w, u.w), w_u: 'mm', h: mm(v.h, u.h), h_u: 'mm' } : null;
    } },
    { to: 'stackup', why: 'next_impedance_stackup' },
  ],
  signal: [
    { to: 'termination', why: 'next_signal_termination',
      q: (r, v, u) => ({ tr: v.tr, tr_u: u.tr, len: mm(v.L, u.L), len_u: finite(v.L) ? 'mm' : undefined }) },
  ],
  dcdc: [
    // The switch blocks the input (buck) or the output (boost) and carries the inductor current for D.
    { to: 'mosfet', why: 'next_dcdc_mosfet', q: (r, v, u) => (finite(r.duty, r.iL) ? {
      v: r.topology === 'boost' ? v.vout : v.vin, i: r.iL, im: 'duty', d: r.duty * 100, f: v.f, f_u: u.f,
    } : null) },
    { to: 'pdn', why: 'next_dcdc_pdn', q: (r, v) => ({ V: v.vout, I: v.iout }) },
    { to: 'snubber', why: 'next_dcdc_snubber', q: (r, v, u) => ({ v: r.topology === 'boost' ? v.vout : v.vin, f: v.f, f_u: u.f }) },
  ],
  mosfet: [
    { to: 'snubber', why: 'next_dcdc_snubber', q: (r, v, u) => ({ v: v.v, f: v.f, f_u: u.f }) },
  ],
  thermal: [
    { to: 'thermalvia', why: 'next_thermal_thermalvia', q: (r, v) => (finite(r.powerW) ? { P: r.powerW, ta: v.ta, tj: v.tj } : null) },
  ],
  inrush: [
    // Hot-plug into a capacitor: an exponential pulse of V/R with the time constant R·C.
    { to: 'protection', why: 'next_inrush_protection', q: (r, v) => (v.mode === 'plug' && finite(r.iPeakR, r.tau) ? {
      mode: 'fuse', shape: 'exp', ip: r.iPeakR, tp: r.tau * 1e6, tp_u: 'us', vckt: v.sup === 'dc' ? v.v : undefined,
    } : null) },
  ],
  protection: [
    // The copper must outlast the fuse: time to fuse at the fault current.
    { to: 'fusing', why: 'next_protection_fusing',
      q: (r) => ((r.mode === 'fuse' || r.mode === 'ptc') && finite(r.iFault) ? { k: 'trace', m: 'time', I: r.iFault, I_u: 'A' } : null) },
  ],
  crystal: [
    { to: 'xtalgm', why: 'next_crystal_xtalgm', q: (r, v, u) => ({ cl: v.cl, cs: v.cs, c0: finite(v.c0) ? v.c0 : undefined, f: v.f, f_u: u.f }) },
  ],
  xtalgm: [
    { to: 'crystal', why: 'next_xtalgm_crystal', q: (r, v, u) => ({ mode: 'caps', cl: v.cl, cs: v.cs, f: v.f, f_u: u.f }) },
  ],
  antenna: [
    { to: 'matching', why: 'next_antenna_matching', q: (r, v, u) => ({ f: v.f, f_u: u.f }) },
    { to: 'linkbudget', why: 'next_antenna_linkbudget', q: (r, v, u) => ({ f: v.f, f_u: u.f }) },
  ],
  linkbudget: [
    { to: 'antenna', why: 'next_linkbudget_antenna', q: (r, v, u) => ({ f: v.f, f_u: u.f }) },
  ],
  ntc: [
    { to: 'adc', why: 'next_sensor_adc', q: (r, v) => ({ bits: v.bits, vref: v.vref }) },
  ],
  shunt: [
    { to: 'adc', why: 'next_sensor_adc', q: (r, v) => ({ bits: v.bits, vref: v.vfs }) },
  ],
  holdup: [
    // The capacitor that holds the rail up is also what the supply has to charge at plug-in.
    { to: 'inrush', why: 'next_holdup_inrush', q: (r, v) => {
      const c = v.solve === 'time' ? v.c : r.cStdF;
      return finite(c) ? { mode: 'plug', sup: 'dc', v: v.v1, c } : null;
    } },
  ],
};
