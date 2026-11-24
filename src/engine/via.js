// Plated through-hole via: DC resistance, losses, thermal resistance and an
// IPC-2221 based current-capacity estimate (barrel treated as an external
// conductor with the same cross-section).

import { copperResistivity, K_THERMAL } from './copper.js';
import { ipc2221CurrentA } from './trace-width.js';

const MIL2_PER_M2 = 1 / (2.54e-5) ** 2;

/**
 * @param {object} p
 * @param {number} p.drillMm      finished hole diameter (mm)
 * @param {number} p.lengthMm     via length / board thickness (mm)
 * @param {number} p.platingUm    plating thickness (µm)
 * @param {number} [p.currentA]   DC current (A)
 * @param {number} [p.tempC]      conductor temperature (°C), default 20
 * @param {number} [p.deltaTC]    allowed temperature rise for the capacity estimate
 */
export function calculateVia(p) {
  const errors = [];
  if (!(p.drillMm > 0)) errors.push('drill');
  if (!(p.lengthMm > 0)) errors.push('length');
  if (!(p.platingUm > 0)) errors.push('plating');
  if (p.currentA !== undefined && !(p.currentA >= 0)) errors.push('current');
  if (errors.length) return { ok: false, errors };

  const tempC = Number.isFinite(p.tempC) ? p.tempC : 20;
  const rIn = p.drillMm / 2 / 1000;
  const rOut = rIn + p.platingUm * 1e-6;
  const L = p.lengthMm / 1000;
  const areaM2 = Math.PI * (rOut * rOut - rIn * rIn);

  const rho = copperResistivity(tempC);
  const resistanceOhm = (rho * L) / areaM2;
  const currentA = p.currentA ?? 0;

  const warnings = [];
  const aspectRatio = p.lengthMm / p.drillMm;
  if (aspectRatio > 10) warnings.push('aspectRatioHigh');
  else if (aspectRatio > 8) warnings.push('aspectRatioElevated');
  if (p.platingUm < 20) warnings.push('platingThin');

  const deltaTC = p.deltaTC > 0 ? p.deltaTC : 10;

  return {
    ok: true,
    aspectRatio,
    areaMm2: areaM2 * 1e6,
    areaMil2: areaM2 * MIL2_PER_M2,
    resistivity: rho,
    resistanceOhm,
    voltageDropV: currentA * resistanceOhm,
    powerLossW: currentA * currentA * resistanceOhm,
    thermalResistanceKW: L / (K_THERMAL * areaM2),
    deltaTC,
    capacityA: ipc2221CurrentA(areaM2 * MIL2_PER_M2, deltaTC, true),
    warnings,
  };
}
