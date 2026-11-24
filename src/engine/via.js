// Plated through-hole via: DC resistance, losses, thermal resistance,
// IPC-2221-based current capacity, and high-frequency parasitics.

import { copperResistivity, K_THERMAL } from './copper.js';
import { ipc2221CurrentA } from './trace-width.js';

const MIL2_PER_M2 = 1 / (2.54e-5) ** 2;
const MM_PER_IN = 25.4;

/** Via inductance (nH), H. Johnson: L = 5.08·h·[ln(4h/d) + 1], h and d in inches. */
export function viaInductanceNh(lengthMm, drillMm) {
  const h = lengthMm / MM_PER_IN;
  const d = drillMm / MM_PER_IN;
  return 5.08 * h * (Math.log((4 * h) / d) + 1);
}

/** Via pad capacitance (pF), H. Johnson: C = 1.41·εr·T·D1/(D2 − D1), inches. */
export function viaCapacitancePf(lengthMm, padMm, antipadMm, er) {
  const T = lengthMm / MM_PER_IN;
  const D1 = padMm / MM_PER_IN;
  const D2 = antipadMm / MM_PER_IN;
  return (1.41 * er * T * D1) / (D2 - D1);
}

/**
 * @param {object} p
 * @param {number} p.drillMm      finished hole diameter (mm)
 * @param {number} p.lengthMm     via length / board thickness (mm)
 * @param {number} p.platingUm    barrel plating thickness (µm)
 * @param {number} [p.count]      number of identical vias in parallel
 * @param {number} [p.currentA]   total DC current (A)
 * @param {number} [p.tempC]      conductor temperature for resistance (°C), default 20
 * @param {number} [p.deltaTC]    temperature rise for the capacity estimate (°C), default 10
 * @param {number} [p.padMm]      pad diameter (mm) — parasitics
 * @param {number} [p.antipadMm]  plane clearance (antipad) diameter (mm) — parasitics
 * @param {number} [p.er]         dielectric constant — parasitics
 * @param {number} [p.z0]         line impedance for the step-response estimate (Ω)
 */
export function calculateVia(p) {
  const errors = [];
  if (!(p.drillMm > 0)) errors.push('drill');
  if (!(p.lengthMm > 0)) errors.push('length');
  if (!(p.platingUm > 0)) errors.push('plating');
  if (p.currentA !== undefined && !(p.currentA >= 0)) errors.push('current');
  if (p.padMm > 0 && p.antipadMm > 0 && !(p.antipadMm > p.padMm)) errors.push('antipad');
  if (errors.length) return { ok: false, errors };

  const n = Math.max(1, Math.round(p.count || 1));
  const tempC = Number.isFinite(p.tempC) ? p.tempC : 20;
  const rIn = p.drillMm / 2 / 1000;
  const rOut = rIn + p.platingUm * 1e-6;
  const L = p.lengthMm / 1000;
  const areaM2 = Math.PI * (rOut * rOut - rIn * rIn);

  const rho = copperResistivity(tempC);
  const r1 = (rho * L) / areaM2;
  const currentA = p.currentA ?? 0;
  const perVia = currentA / n;
  const deltaTC = p.deltaTC > 0 ? p.deltaTC : 10;
  const cap1 = ipc2221CurrentA(areaM2 * MIL2_PER_M2, deltaTC, true);

  const warnings = [];
  const aspectRatio = p.lengthMm / p.drillMm;
  if (aspectRatio > 10) warnings.push('aspectRatioHigh');
  else if (aspectRatio > 8) warnings.push('aspectRatioElevated');
  if (p.platingUm < 20) warnings.push('platingThin');
  if (currentA > 0 && perVia > cap1) warnings.push('overCapacity');

  const res = {
    ok: true,
    count: n,
    aspectRatio,
    areaMm2: areaM2 * 1e6,
    areaMil2: areaM2 * MIL2_PER_M2,
    resistivity: rho,
    resistanceOhm: r1,
    totalResistanceOhm: r1 / n,
    voltageDropV: currentA * (r1 / n),
    powerLossW: currentA * currentA * (r1 / n),
    perViaA: perVia,
    thermalResistanceKW: L / (K_THERMAL * areaM2),
    totalThermalKW: L / (K_THERMAL * areaM2) / n,
    deltaTC,
    capacityA: cap1,
    totalCapacityA: cap1 * n,
    viasForCurrent: currentA > 0 ? Math.ceil(currentA / cap1) : null,
    warnings,
    parasitics: null,
  };

  res.inductanceNh = viaInductanceNh(p.lengthMm, p.drillMm);
  if (p.padMm > 0 && p.antipadMm > p.padMm && p.er >= 1) {
    const cPf = viaCapacitancePf(p.lengthMm, p.padMm, p.antipadMm, p.er);
    const z0 = p.z0 > 0 ? p.z0 : 50;
    res.parasitics = {
      capacitancePf: cPf,
      impedanceOhm: Math.sqrt((res.inductanceNh * 1e-9) / (cPf * 1e-12)),
      riseDegradationPs: 2.2 * cPf * (z0 / 2), // ps (pF·Ω = ps)
      resonanceHz: 1 / (2 * Math.PI * Math.sqrt(res.inductanceNh * 1e-9 * cPf * 1e-12)),
      z0,
    };
  }
  // Unused via stub (barrel beyond the last connected layer) resonates at a quarter wavelength.
  if (p.stubMm > 0 && p.er >= 1) {
    res.stub = { lengthMm: p.stubMm, quarterWaveHz: 299792458 / (4 * (p.stubMm / 1000) * Math.sqrt(p.er)) };
  }
  return res;
}
