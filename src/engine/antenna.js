// PCB antennas — starting dimensions. Real antennas are always tuned on the
// finished board (VNA), because ground size, enclosure and nearby parts shift
// the resonance.
//
// Rectangular microstrip patch (C. A. Balanis, Antenna Theory, ch. 14):
//   W     = c / (2 f0) · √(2 / (εr + 1))
//   εreff = (εr + 1)/2 + (εr − 1)/2 · (1 + 12 h / W)^(−1/2)
//   ΔL    = 0.412 h · (εreff + 0.3)(W/h + 0.264) / ((εreff − 0.258)(W/h + 0.8))
//   L     = c / (2 f0 √εreff) − 2 ΔL
//   Rin(edge) ≈ 90 · εr² / (εr − 1) · (L/W)²
//   inset y0  = (L/π) · acos(√(Z0 / Rin))
//   BW (VSWR < 2) ≈ 3.77 · (εr − 1)/εr² · (W/L) · (h/λ0)   (Jackson & Alexopoulos)
//
// Quarter-wave monopole / IFA arm: L = c / (4 f √εeff).

import { solveWidth } from './impedance.js';

const C0 = 299792458;

/**
 * @param {object} p  { fHz, er, hMm, z0?, tUm? }
 */
export function patchAntenna({ fHz, er, hMm, z0 = 50, tUm = 35 }) {
  if (!(fHz > 0) || !(er > 1) || !(hMm > 0)) return { ok: false, errors: ['inputs'] };
  const h = hMm / 1000;
  const lambda0 = C0 / fHz;
  const W = (C0 / (2 * fHz)) * Math.sqrt(2 / (er + 1));
  const ereff = (er + 1) / 2 + ((er - 1) / 2) / Math.sqrt(1 + (12 * h) / W);
  const dL = 0.412 * h * ((ereff + 0.3) * (W / h + 0.264)) / ((ereff - 0.258) * (W / h + 0.8));
  const L = C0 / (2 * fHz * Math.sqrt(ereff)) - 2 * dL;
  const rin = 90 * (er * er / (er - 1)) * (L / W) ** 2;
  const inset = rin > z0 ? (L / Math.PI) * Math.acos(Math.sqrt(z0 / rin)) : 0;
  const bwFrac = 3.77 * ((er - 1) / (er * er)) * (W / L) * (h / lambda0);
  const feedW = solveWidth({ structure: 'microstrip', t: tUm / 1000, h: hMm, er }, z0);
  const warnings = [];
  if (h / lambda0 > 0.05) warnings.push('patchThick');
  if (er > 3.5 && fHz > 1e9) warnings.push('fr4Loss');
  return {
    ok: true,
    lambda0Mm: lambda0 * 1000,
    wMm: W * 1000,
    lMm: L * 1000,
    ereff,
    dLMm: dL * 1000,
    rin,
    insetMm: inset * 1000,
    feedWMm: feedW,
    bwFrac,
    bwHz: bwFrac * fHz,
    groundWMm: W * 1000 + 6 * hMm,
    groundLMm: L * 1000 + 6 * hMm,
    warnings,
  };
}

/**
 * Quarter-wave monopole printed on the board edge (no copper underneath).
 * εeff ≈ (εr + 1)/2 is a starting estimate for a trace with dielectric on one side.
 */
export function monopole({ fHz, er = 4.3, mode = 'printed' }) {
  if (!(fHz > 0)) return { ok: false, errors: ['inputs'] };
  const lambda0 = C0 / fHz;
  const eeff = mode === 'wire' ? 1 : (er + 1) / 2;
  const quarter = lambda0 / (4 * Math.sqrt(eeff));
  return {
    ok: true,
    lambda0Mm: lambda0 * 1000,
    eeff,
    quarterMm: quarter * 1000,
    quarterAirMm: (lambda0 / 4) * 1000,
    halfDipoleMm: (lambda0 / (2 * Math.sqrt(eeff))) * 1000,
    groundMinMm: (lambda0 / 4) * 1000,
  };
}

