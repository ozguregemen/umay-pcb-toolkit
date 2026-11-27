// Thermal via array under an exposed pad and the copper area that sheds the
// heat to the air: a one-dimensional chain of thermal resistances from the
// junction to the ambient. An estimate, not a simulation.
//
//   θ_via  = h / (k_Cu·A_b + k_f·A_f)                  one via: barrel (+ fill) along the board thickness h
//   θ_vias = θ_via / N                                 N vias in parallel
//   θ_FR4  = h / (k_FR4·(A_pad − N·π·r_o²))            laminate under the pad, in parallel with the vias
//   θ_PB   = θ_vias ∥ θ_FR4                            pad → copper on the far side
//   θ_CA   = 1 / (h_c·(A_pad + n·η·(A_Cu − A_pad)))    that copper → air
//   T_j    = T_a + P·(θ_JC + θ_PB + θ_CA)
//
// A_b = π·(r_o² − r_i²) barrel, A_f = π·r_i² fill, r_i = finished hole / 2,
// r_o = r_i + plating (the drilled radius). n = number of cooled faces.
//
// η is the efficiency of the copper area as a cooling fin. The area is
// replaced by a disc of the same area around a pad of the same area: an
// annular fin of uniform thickness t with base radius r_b, outer radius r_e
// and an insulated edge. With m = √(n·h_c / (k_Cu·t)), x_b = m·r_b, x_e = m·r_e:
//
//   η = 2·x_b/(x_e² − x_b²) · [K1(x_b)·I1(x_e) − I1(x_b)·K1(x_e)]
//                           / [I0(x_b)·K1(x_e) + K0(x_b)·I1(x_e)]
//
// (Bergman, Lavine, Incropera, DeWitt, Fundamentals of Heat and Mass Transfer,
// extended surfaces: annular fin of rectangular profile, adiabatic tip; there
// m = √(2h/kt) for a fin cooled on both faces.) The copper under the pad is
// at the base temperature and counts once: its other face is under the part.
//
// Schmidt's tanh approximation (ASHRAE Handbook — Fundamentals) is kept for
// comparison only: it agrees with the exact solution within 3 % while
// η ≥ 0.5, but it overestimates η for large, thin planes (by up to about 7 %
// for η = 0.4–0.5, 16 % for 0.3–0.4, 31 % for 0.2–0.3 and more below; scan
// over r_e/r_b = 1.05–40, x_b = 0.005–3), which is where a PCB plane often is.

import { K_THERMAL } from './copper.js';

/** Through-plane thermal conductivity of FR-4 laminate, typical (W/m·K). */
export const K_FR4_THROUGH = 0.3;
/** Thermal conductivity of SAC305 lead-free solder, typical (W/m·K). */
export const K_SOLDER_SAC305 = 58;

// ---------------------------------------------------------------------------
// Modified Bessel functions of integer order, exponentially scaled so that
// large arguments neither overflow nor underflow.
// ---------------------------------------------------------------------------

/**
 * e^(−x)·I_n(x), n = 0, 1, 2 …, x ≥ 0.
 * Up to x = 20 by the ascending series I_n(x) = Σ (x/2)^(2k+n) / (k!·(k+n)!)
 * (all terms positive, no cancellation); above by the trapezoid rule on
 * I_n(x) = (1/π)·∫₀^π e^(x·cos θ)·cos(nθ) dθ, which converges geometrically
 * for a periodic integrand (Abramowitz & Stegun 9.6.10, 9.6.19).
 */
export function besselIe(n, x) {
  if (!(x >= 0) || !Number.isInteger(n) || n < 0) return NaN;
  if (x <= 20) {
    let term = 1;
    for (let k = 1; k <= n; k++) term *= x / 2 / k; // (x/2)^n / n!
    let sum = term;
    const q = (x * x) / 4;
    for (let k = 1; k < 500; k++) {
      term *= q / (k * (k + n));
      sum += term;
      if (term < sum * 1e-17) break;
    }
    return sum * Math.exp(-x);
  }
  const steps = Math.ceil(5 * Math.sqrt(x)) + 12;
  let sum = 0.5 * (1 + Math.exp(-2 * x) * (n % 2 ? -1 : 1)); // θ = 0 and θ = π
  for (let i = 1; i < steps; i++) {
    const th = (i * Math.PI) / steps;
    const s = Math.sin(th / 2);
    sum += Math.exp(-2 * x * s * s) * Math.cos(n * th); // 1 − cos θ = 2·sin²(θ/2)
  }
  return sum / steps;
}

/**
 * e^(x)·K_ν(x), x > 0, by the trapezoid rule on
 * K_ν(x) = ∫₀^∞ e^(−x·cosh t)·cosh(νt) dt (Abramowitz & Stegun 9.6.24).
 * The integrand is analytic and decays doubly exponentially, so the rule
 * converges geometrically; the step shrinks with 1/√x to resolve the peak.
 */
export function besselKe(nu, x) {
  if (!(x > 0)) return x === 0 ? Infinity : NaN;
  const h = Math.min(0.25, 0.5 / Math.sqrt(x));
  let sum = 0.5; // t = 0
  for (let i = 1; i < 200000; i++) {
    const t = i * h;
    const s = Math.sinh(t / 2);
    const f = Math.exp(-2 * x * s * s) * Math.cosh(nu * t); // cosh t − 1 = 2·sinh²(t/2)
    sum += f;
    if (f < sum * 1e-17) break;
  }
  return sum * h;
}

/** I_n(x); overflows to Infinity above x ≈ 710. */
export const besselI = (n, x) => besselIe(n, x) * Math.exp(x);
/** K_ν(x); underflows to 0 above x ≈ 740. */
export const besselK = (nu, x) => besselKe(nu, x) * Math.exp(-x);

// ---------------------------------------------------------------------------
// Fin efficiency of the copper area
// ---------------------------------------------------------------------------

/**
 * Exact efficiency of an annular fin of uniform thickness with an insulated
 * outer edge. xb = m·r_b, xe = m·r_e (both dimensionless, xe > xb > 0).
 * Evaluated with the scaled functions: dividing numerator and denominator by
 * I1(xe) leaves the tip term K1(xe)/I1(xe), which decays like e^(−2·xe).
 */
export function annularFinEfficiency(xb, xe) {
  if (!(xb > 0) || !(xe > xb)) return 1;
  const tip = (besselKe(1, xe) / besselIe(1, xe)) * Math.exp(-2 * (xe - xb));
  const num = besselKe(1, xb) - besselIe(1, xb) * tip;
  const den = besselKe(0, xb) + besselIe(0, xb) * tip;
  return Math.min(1, ((2 * xb) / (xe * xe - xb * xb)) * (num / den));
}

/**
 * Schmidt's approximation for the same fin (ASHRAE Handbook — Fundamentals):
 * η ≈ tanh(x_b·φ)/(x_b·φ), φ = (ρ − 1)·(1 + 0.35·ln ρ), ρ = r_e/r_b.
 * For comparison only: within 3 % of the exact value for η ≥ 0.5, optimistic below.
 */
export function schmidtFinEfficiency(xb, xe) {
  if (!(xb > 0) || !(xe > xb)) return 1;
  const rho = xe / xb;
  const x = xb * (rho - 1) * (1 + 0.35 * Math.log(rho));
  return x < 1e-8 ? 1 : Math.tanh(x) / x;
}

/**
 * Copper area → air.
 * @param {object} p
 * @param {number} p.padAreaMm2     area of the heat source (pad) on this copper (mm²)
 * @param {number} p.copperAreaMm2  whole copper area, the part under the pad included (mm²)
 * @param {number} p.copperUm       copper thickness (µm); sum of the planes tied together
 * @param {number} p.sides          cooled faces, 1 or 2
 * @param {number} p.hWm2K          heat-transfer coefficient, convection + radiation (W/m²·K)
 */
export function copperToAmbient({ padAreaMm2, copperAreaMm2, copperUm, sides, hWm2K }) {
  const aPad = padAreaMm2 * 1e-6;
  const aCu = copperAreaMm2 * 1e-6;
  const aFin = aCu - aPad;
  const rb = Math.sqrt(aPad / Math.PI);
  const re = Math.sqrt(aCu / Math.PI);
  const m = Math.sqrt((sides * hWm2K) / (K_THERMAL * copperUm * 1e-6));
  const xb = m * rb;
  const xe = m * re;
  const eta = annularFinEfficiency(xb, xe);
  // An unbounded plane: η·A_fin → 2π·r_b·K1(x_b) / (m·K0(x_b)); more area cannot go below this.
  const reachM2 = ((2 * Math.PI * rb) / m) * (besselKe(1, xb) / besselKe(0, xb));
  return {
    rbMm: rb * 1e3,
    reMm: re * 1e3,
    mPerM: m,
    xb,
    xe,
    eta,
    etaSchmidt: schmidtFinEfficiency(xb, xe),
    finAreaMm2: aFin * 1e6,
    thetaKW: 1 / (hWm2K * (aPad + sides * eta * aFin)),
    thetaIsothermalKW: 1 / (hWm2K * (aPad + sides * aFin)),
    thetaUnboundedKW: 1 / (hWm2K * (aPad + sides * reachM2)),
    // Values the page shows in the efficiency step (unscaled).
    bessel: {
      i0b: besselI(0, xb), i1b: besselI(1, xb), k0b: besselK(0, xb), k1b: besselK(1, xb),
      i1e: besselI(1, xe), k1e: besselK(1, xe),
    },
  };
}

/**
 * Copper area that gives a required θ_CA (solved numerically: η depends on the area).
 * status: 'ok' (areaMm2, eta), 'padOnly' (copper the size of the pad is enough),
 * 'limit' (not reachable with any area at this thickness and h_c).
 */
export function copperAreaForTheta({ thetaKW, padAreaMm2, copperUm, sides, hWm2K }) {
  const at = (copperAreaMm2) => copperToAmbient({ padAreaMm2, copperAreaMm2, copperUm, sides, hWm2K });
  const thetaPadKW = 1 / (hWm2K * padAreaMm2 * 1e-6);
  if (thetaKW >= thetaPadKW) return { status: 'padOnly', areaMm2: padAreaMm2, eta: 1 };
  const far = at(padAreaMm2 * 2);
  if (!(thetaKW > far.thetaUnboundedKW)) return { status: 'limit', thetaUnboundedKW: far.thetaUnboundedKW };
  let lo = padAreaMm2;
  let hi = padAreaMm2 * 2;
  for (let i = 0; at(hi).thetaKW > thetaKW; i++) {
    if (i > 200) return { status: 'limit', thetaUnboundedKW: far.thetaUnboundedKW };
    lo = hi;
    hi *= 2;
  }
  for (let i = 0; i < 200 && hi / lo - 1 > 1e-12; i++) {
    const mid = Math.sqrt(lo * hi);
    if (at(mid).thetaKW > thetaKW) lo = mid; else hi = mid;
  }
  const areaMm2 = Math.sqrt(lo * hi);
  return { status: 'ok', areaMm2, eta: at(areaMm2).eta };
}

/**
 * Mean convection coefficient of a flat plate in parallel laminar flow (W/m²·K):
 * Nu = 0.664·Re^½·Pr^⅓ (Bergman, Lavine, Incropera, DeWitt, external flow),
 * with air at 300 K: ν = 15.89e-6 m²/s, k = 0.0263 W/m·K, Pr = 0.707.
 * Convection only. Used for the forced-air presets of h_c: a 50 mm long
 * surface gives 17 W/m²·K at 1 m/s and 30 W/m²·K at 3 m/s. Valid for Re < 5e5.
 */
export function laminarPlateH(velocityMs, lengthM) {
  const re = (velocityMs * lengthM) / 15.89e-6;
  return (0.664 * Math.sqrt(re) * Math.cbrt(0.707) * 0.0263) / lengthM;
}

// ---------------------------------------------------------------------------
// Via array
// ---------------------------------------------------------------------------

/**
 * Conduction along one via.
 * @param {object} p
 * @param {number} p.drillMm     finished hole diameter (mm)
 * @param {number} p.platingUm   barrel plating thickness (µm)
 * @param {number} p.lengthMm    via length = board thickness (mm)
 * @param {number} [p.kFillWmK]  conductivity of the fill (W/m·K); 0 or absent: open via
 */
export function viaTheta({ drillMm, platingUm, lengthMm, kFillWmK = 0 }) {
  const ri = (drillMm / 2) * 1e-3;
  const ro = ri + platingUm * 1e-6;
  const L = lengthMm * 1e-3;
  const barrel = Math.PI * (ro * ro - ri * ri);
  const fill = Math.PI * ri * ri;
  const filled = kFillWmK > 0;
  return {
    riMm: ri * 1e3,
    roMm: ro * 1e3,
    barrelAreaMm2: barrel * 1e6,
    fillAreaMm2: fill * 1e6,
    holeAreaMm2: Math.PI * ro * ro * 1e6,
    thetaBarrelKW: L / (K_THERMAL * barrel),
    thetaFillKW: filled ? L / (kFillWmK * fill) : Infinity,
    thetaKW: L / (K_THERMAL * barrel + (filled ? kFillWmK * fill : 0)),
  };
}

/**
 * Pad → far-side copper: n vias in parallel with the laminate left under the pad.
 * count = 0 gives the laminate alone.
 */
export function padToCopper({ padAreaMm2, lengthMm, kBoardWmK, count, thetaViaKW, holeAreaMm2 }) {
  const laminateAreaMm2 = padAreaMm2 - count * holeAreaMm2;
  const thetaLaminateKW = laminateAreaMm2 > 0 ? (lengthMm * 1e-3) / (kBoardWmK * laminateAreaMm2 * 1e-6) : Infinity;
  const thetaViasKW = count > 0 ? thetaViaKW / count : Infinity;
  return { laminateAreaMm2, thetaLaminateKW, thetaViasKW, thetaKW: 1 / (1 / thetaViasKW + 1 / thetaLaminateKW) };
}

/**
 * How many vias fit on the pad: rows and columns at the given pitch, the
 * outermost holes still completely on the pad (no allowance for registration).
 * holeMm is the drilled diameter (finished hole + 2 × plating).
 */
export function viasThatFit({ padWMm, padLMm, pitchMm, holeMm }) {
  const along = (side) => (side >= holeMm ? Math.floor((side - holeMm) / pitchMm + 1e-9) + 1 : 0);
  const nx = along(padWMm);
  const ny = along(padLMm);
  return { nx, ny, count: nx * ny };
}

// ---------------------------------------------------------------------------
// The whole chain
// ---------------------------------------------------------------------------

/**
 * @param {object} p
 * @param {number} p.powerW          power dissipated in the part (W)
 * @param {number} p.thetaJcKW       junction → exposed pad, from the datasheet (°C/W)
 * @param {number} p.ambientC        ambient temperature (°C)
 * @param {number} p.tjMaxC          allowed junction temperature (°C)
 * @param {number} p.padWMm          exposed pad width (mm)
 * @param {number} p.padLMm          exposed pad length (mm)
 * @param {number} p.boardMm         board thickness = via length (mm)
 * @param {number} p.count           number of vias under the pad (0 allowed)
 * @param {number} p.drillMm         finished hole diameter (mm)
 * @param {number} p.platingUm       barrel plating (µm)
 * @param {number} p.pitchMm         via pitch (mm), for the fit check only
 * @param {number} [p.kFillWmK]      conductivity of the via fill (W/m·K); 0 or absent: open vias
 * @param {number} p.kBoardWmK       through-plane conductivity of the laminate (W/m·K)
 * @param {number} p.copperAreaMm2   copper area on the far side, the part under the pad included (mm²)
 * @param {number} p.copperUm        its thickness (µm)
 * @param {number} p.sides           cooled faces of that area, 1 or 2
 * @param {number} p.hWm2K           heat-transfer coefficient (W/m²·K)
 */
export function thermalVia(p) {
  const errors = [];
  const positive = [p.powerW, p.padWMm, p.padLMm, p.boardMm, p.drillMm, p.platingUm, p.pitchMm, p.kBoardWmK, p.copperAreaMm2, p.copperUm, p.hWm2K];
  if (!positive.every((x) => x > 0 && Number.isFinite(x)) || !(p.thetaJcKW >= 0) || !Number.isFinite(p.thetaJcKW)
    || !Number.isInteger(p.count) || p.count < 0 || (p.sides !== 1 && p.sides !== 2)
    || !Number.isFinite(p.ambientC) || !Number.isFinite(p.tjMaxC) || (p.kFillWmK !== undefined && !(p.kFillWmK >= 0))) {
    return { ok: false, errors: ['tv_positive'] };
  }
  const padAreaMm2 = p.padWMm * p.padLMm;
  const via = viaTheta({ drillMm: p.drillMm, platingUm: p.platingUm, lengthMm: p.boardMm, kFillWmK: p.kFillWmK });
  const holeMm = 2 * via.roMm;
  if (!(p.pitchMm > holeMm * (1 + 1e-9))) errors.push('tv_pitch'); // holes must not touch
  if (!(p.count * via.holeAreaMm2 < padAreaMm2)) errors.push('tv_holes');
  if (!(p.copperAreaMm2 > padAreaMm2)) errors.push('tv_copperSmall');
  if (!(p.tjMaxC > p.ambientC)) errors.push('tv_tjMax');
  if (errors.length) return { ok: false, errors };

  const through = (count) => padToCopper({ padAreaMm2, lengthMm: p.boardMm, kBoardWmK: p.kBoardWmK, count, thetaViaKW: via.thetaKW, holeAreaMm2: via.holeAreaMm2 });
  const pb = through(p.count);
  const fit = viasThatFit({ padWMm: p.padWMm, padLMm: p.padLMm, pitchMm: p.pitchMm, holeMm });
  const cuIn = { padAreaMm2, copperUm: p.copperUm, sides: p.sides, hWm2K: p.hWm2K };
  const fin = copperToAmbient({ ...cuIn, copperAreaMm2: p.copperAreaMm2 });

  const thetaJcKW = p.thetaJcKW;
  const thetaPbKW = pb.thetaKW;
  const thetaCaKW = fin.thetaKW;
  const thetaJaKW = thetaJcKW + thetaPbKW + thetaCaKW;
  const budgetKW = (p.tjMaxC - p.ambientC) / p.powerW; // largest θ_JA that keeps T_j at T_j,max
  const tjC = p.ambientC + p.powerW * thetaJaKW;
  const share = { jc: thetaJcKW / thetaJaKW, pb: thetaPbKW / thetaJaKW, ca: thetaCaKW / thetaJaKW };
  const dominant = share.ca >= share.pb && share.ca >= share.jc ? 'ca' : share.pb >= share.jc ? 'pb' : 'jc';

  // Copper area that would put T_j exactly at T_j,max.
  const thetaCaNeedKW = budgetKW - thetaJcKW - thetaPbKW;
  const need = thetaCaNeedKW > 0
    ? { thetaCaKW: thetaCaNeedKW, ...copperAreaForTheta({ ...cuIn, thetaKW: thetaCaNeedKW }) }
    : { thetaCaKW: thetaCaNeedKW, status: 'chain' };

  const warnings = [];
  if (tjC > p.tjMaxC) warnings.push('tv_tjHigh');
  if (p.count > fit.count) warnings.push('tv_noFit');
  if (fin.eta < 0.5) warnings.push('tv_etaLow');
  if (share[dominant] > 0.7) warnings.push({ ca: 'tv_domCopper', pb: 'tv_domVia', jc: 'tv_domJc' }[dominant]);
  if (p.count > 0 && p.platingUm < 20) warnings.push('tv_platingThin');

  const thetaNoViaKW = through(0).thetaKW;
  const fuller = fit.count > p.count && fit.count * via.holeAreaMm2 < padAreaMm2 ? through(fit.count).thetaKW : null;
  return {
    ok: true,
    count: p.count,
    sides: p.sides,
    filled: p.kFillWmK > 0,
    // Inputs the page shows again in the steps and the drawing.
    padWMm: p.padWMm,
    padLMm: p.padLMm,
    boardMm: p.boardMm,
    drillMm: p.drillMm,
    kFillWmK: p.kFillWmK > 0 ? p.kFillWmK : 0,
    kBoardWmK: p.kBoardWmK,
    copperAreaMm2: p.copperAreaMm2,
    copperUm: p.copperUm,
    hWm2K: p.hWm2K,
    powerW: p.powerW,
    ambientC: p.ambientC,
    tjMaxC: p.tjMaxC,
    padAreaMm2,
    holeMm,
    via,
    laminateAreaMm2: pb.laminateAreaMm2,
    thetaViasKW: pb.thetaViasKW,
    thetaLaminateKW: pb.thetaLaminateKW,
    thetaPbKW,
    thetaNoViaKW,
    tjNoViaC: p.ambientC + p.powerW * (thetaJcKW + thetaNoViaKW + thetaCaKW),
    fit,
    thetaPbFitKW: fuller,
    tjFitC: fuller === null ? null : p.ambientC + p.powerW * (thetaJcKW + fuller + thetaCaKW),
    fin,
    thetaCaKW,
    thetaJcKW,
    thetaPadAmbientKW: thetaPbKW + thetaCaKW,
    thetaJaKW,
    share,
    dominant,
    tjC,
    tPadC: tjC - p.powerW * thetaJcKW,
    tCopperC: p.ambientC + p.powerW * thetaCaKW,
    marginC: p.tjMaxC - tjC,
    maxPowerW: (p.tjMaxC - p.ambientC) / thetaJaKW,
    need,
    warnings,
  };
}
