// Start-up check of a Pierce crystal oscillator, after ST application note
// AN2867 ("Oscillator design guide for STM8AF/AL/S, STM32 MCUs and MPUs").
//
//   g_m,crit    = 4·ESR·(2π·F)²·(C0 + CL)²        critical transconductance
//   gain margin = g_m / g_m,crit                   must be at least 5 (AN2867)
//   or, when the datasheet gives the maximum critical transconductance instead:
//   g_m,crit ≤ G_m,crit,max                        ratio G_m,crit,max / g_m,crit ≥ 1
//   ESR_max     = g_m / (margin·4·(2π·F)²·(C0 + CL)²)
//   With a series resistor R_ext at the oscillator output the same condition
//   holds with ESR + R_ext in place of ESR.
//   Starting value for R_ext: the reactance of the output-side capacitor,
//     R_ext ≈ 1 / (2π·F·CL2),  with CL1 = CL2 = 2·(CL − Cs) for equal capacitors
//   Drive level from the voltage measured across CL1 (oscillator input side):
//     C_tot = CL1 + Cs/2 + C_probe,  V_rms = V_pp / (2·√2)
//     I_rms = 2π·F·V_rms·C_tot,      DL = ESR·I_rms² = ESR·(π·F·C_tot·V_pp)² / 2
//
// The condition goes back to E. A. Vittoz, M. G. R. Degrauwe & S. Bitz,
// "High-performance crystal oscillator circuits: theory and application",
// IEEE J. Solid-State Circuits 23 (1988).
// Pure functions, SI units (Hz, Ω, F, A/V, V, W); no DOM, no i18n.

/** Gain margin AN2867 asks for. */
export const GAIN_MARGIN_MIN = 5;
/** Typical stray capacitance of pins and traces (F), used when none is given. */
export const STRAY_TYPICAL_F = 5e-12;

export const SOURCES = ['gm', 'gcrit'];

const finite = (...xs) => xs.every((x) => typeof x === 'number' && Number.isFinite(x));

/** (2π·F)²·(C0 + CL)²: what multiplies 4·ESR in the critical transconductance (1/Ω², i.e. S/Ω). */
const loadFactor = (fHz, c0F, clF) => (2 * Math.PI * fHz) ** 2 * (c0F + clF) ** 2;

/** Critical transconductance (A/V) of a crystal with series resistance `esr` (ESR, or ESR + R_ext). */
export const gmCritical = ({ fHz, esr, c0F, clF }) => 4 * esr * loadFactor(fHz, c0F, clF);

/** Largest series resistance (Ω) at which `g` (A/V) still is `margin` times the critical transconductance. */
export const esrLimit = ({ fHz, c0F, clF, g, margin = GAIN_MARGIN_MIN }) => g / (margin * 4 * loadFactor(fHz, c0F, clF));

/** Two equal load capacitors for a load CL with the stray capacitance Cs across the crystal (F); ≤ 0 when Cs ≥ CL. */
export const equalLoadCap = (clF, csF) => 2 * (clF - csF);

/** Starting value for the series resistor (Ω): the reactance of the output-side capacitor. */
export const rextStart = (fHz, cl2F) => 1 / (2 * Math.PI * fHz * cl2F);

/**
 * Drive level from the peak-to-peak voltage measured across CL1.
 * @returns {{cTotF:number, vRms:number, iRms:number, dlW:number}}
 */
export function driveLevel({ fHz, esr, vpp, cl1F, csF = 0, cProbeF = 0 }) {
  const cTotF = cl1F + csF / 2 + cProbeF;
  const vRms = vpp / (2 * Math.SQRT2);
  const iRms = 2 * Math.PI * fHz * vRms * cTotF;
  return { cTotF, vRms, iRms, dlW: esr * iRms ** 2 };
}

/** True when every number in a (nested) result is finite; null marks "not applicable". */
function allFinite(x) {
  if (typeof x === 'number') return Number.isFinite(x);
  if (x && typeof x === 'object') return Object.values(x).every(allFinite);
  return true;
}

/**
 * The calculator.
 * @param {object} p
 * @param {number} p.fHz          crystal frequency (Hz)
 * @param {number} p.esr          equivalent series resistance, maximum (Ω)
 * @param {number} p.c0F          shunt capacitance C0 (F)
 * @param {number} p.clF          load capacitance CL the crystal is specified for (F)
 * @param {'gm'|'gcrit'} [p.source] what the MCU datasheet gives: g_m, or G_m,crit,max
 * @param {number} [p.gm]         oscillator transconductance (A/V), source 'gm'
 * @param {number} [p.gmCritMax]  maximum critical transconductance (A/V), source 'gcrit'
 * @param {number} [p.marginReq]  required gain margin (≥ 1, default 5), source 'gm'
 * @param {number} [p.rext]       series resistor at the oscillator output (Ω); 0 or left out: none
 * @param {number} [p.csF]        stray capacitance of pins and traces (F), default 5 pF
 * @param {number} [p.vpp]        peak-to-peak voltage measured across CL1 (V); left out: no drive-level estimate
 * @param {number} [p.cl1F]       capacitor on the oscillator input side (F); left out: 2·(CL − Cs)
 * @param {number} [p.cProbeF]    probe capacitance during the measurement (F)
 * @param {number} [p.dlMaxW]     maximum drive level of the crystal (W)
 * @returns {{ok: false, errors: string[]} | object} errors and warnings are message keys.
 */
export function xtalGm(p) {
  const fail = (...errors) => ({ ok: false, errors });
  if (!p) return fail('xg_positive');
  const source = p.source === 'gcrit' ? 'gcrit' : 'gm';
  const { fHz, esr, c0F, clF } = p;
  const csF = p.csF ?? STRAY_TYPICAL_F;
  if (!finite(fHz, esr, c0F, clF, csF) || !(fHz > 0) || !(esr > 0) || !(clF > 0) || c0F < 0 || csF < 0) return fail('xg_positive');
  const gRef = source === 'gcrit' ? p.gmCritMax : p.gm;
  if (!finite(gRef) || !(gRef > 0)) return fail('xg_positive');
  // With G_m,crit,max the condition is g_m,crit ≤ G_m,crit,max: no further factor.
  const need = source === 'gcrit' ? 1 : p.marginReq ?? GAIN_MARGIN_MIN;
  if (!finite(need)) return fail('xg_positive');
  if (need < 1) return fail('xg_margin');
  // Optional values: left out, or a valid number.
  const opt = (x, zeroOk) => x === undefined || x === null || (finite(x) && (zeroOk ? x >= 0 : x > 0));
  if (!opt(p.rext, true) || !opt(p.vpp) || !opt(p.cl1F) || !opt(p.cProbeF, true) || !opt(p.dlMaxW)) return fail('xg_positive');

  const warnings = [];
  const cSumF = c0F + clF;
  const omega = 2 * Math.PI * fHz;
  /** Critical transconductance and margin with a total series resistance. */
  const check = (rTotal) => {
    const gmCrit = gmCritical({ fHz, esr: rTotal, c0F, clF });
    const gainMargin = gRef / gmCrit;
    return { esrTotal: rTotal, gmCrit, gainMargin, pass: gainMargin >= need };
  };
  const base = check(esr);
  if (!base.pass) warnings.push('xg_low');
  const esrMax = esrLimit({ fHz, c0F, clF, g: gRef, margin: need });
  const rextMax = esrMax > esr ? esrMax - esr : null; // null: no room for a series resistor

  const rext = p.rext > 0 ? { r: p.rext, ...check(esr + p.rext) } : null;
  if (rext && base.pass && !rext.pass) warnings.push('xg_rextLost');

  // Equal load capacitors, and the series resistor AN2867 starts from.
  const cap = equalLoadCap(clF, csF);
  const loadCapF = cap > 0 ? cap : null;
  if (loadCapF === null) warnings.push('xg_strayHigh');
  let suggest = null;
  if (loadCapF !== null) {
    const r = rextStart(fHz, loadCapF);
    suggest = { r, ...check(esr + r) };
  }

  // Drive level from the measurement, when there is one.
  const dlMaxW = p.dlMaxW > 0 ? p.dlMaxW : null;
  const cl1F = p.cl1F > 0 ? p.cl1F : loadCapF;
  let drive = null;
  if (p.vpp > 0 && cl1F !== null) {
    const cProbeF = p.cProbeF > 0 ? p.cProbeF : 0;
    const d = driveLevel({ fHz, esr, vpp: p.vpp, cl1F, csF, cProbeF });
    const over = dlMaxW !== null && d.dlW > dlMaxW;
    drive = { vpp: p.vpp, cl1F, cl1Given: p.cl1F > 0, cProbeF, ...d, ratio: dlMaxW === null ? null : d.dlW / dlMaxW, over };
    if (over) warnings.push('xg_overdrive');
  }

  const r = {
    ok: true,
    source,
    fHz,
    esr,
    c0F,
    clF,
    csF,
    cSumF,
    omega,
    gRef,
    need,
    gmCrit: base.gmCrit,
    gainMargin: base.gainMargin,
    pass: base.pass,
    esrMax,
    rextMax,
    rext,
    loadCapF,
    suggest,
    dlMaxW,
    drive,
    warnings,
  };
  return allFinite(r) ? r : fail('xg_range');
}
