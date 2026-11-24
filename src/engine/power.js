// Power delivery and thermal calculations.

/**
 * Target impedance (frequency-domain PDN design):
 *   Z_target = V · ripple / ΔI,   ΔI = transient fraction × I_max
 */
export function targetImpedance({ vdd, ripplePct, iMax, stepPct = 50 }) {
  const dV = vdd * (ripplePct / 100);
  const dI = iMax * (stepPct / 100);
  return { dV, dI, zTarget: dV / dI };
}

/** |Z| of one capacitor modelled as series R-L-C. Returns complex [re, im]. */
export function capZ(f, { c, esr, esl }) {
  const w = 2 * Math.PI * f;
  return [esr, w * esl - 1 / (w * c)];
}

function cdiv([a, b], [c, d]) {
  const den = c * c + d * d;
  return [(a * c + b * d) / den, (b * c - a * d) / den];
}

/**
 * Impedance of a bank: groups of identical capacitors in parallel (plus an
 * optional plane capacitance), each group { c, esr, esl, n }.
 */
export function bankZ(f, groups, planeC = 0) {
  let y = [0, 0]; // admittance
  for (const g of groups) {
    if (!(g.n > 0) || !(g.c > 0)) continue;
    const z = capZ(f, g);
    const yi = cdiv([1, 0], z);
    y = [y[0] + g.n * yi[0], y[1] + g.n * yi[1]];
  }
  if (planeC > 0) y = [y[0], y[1] + 2 * Math.PI * f * planeC];
  const z = cdiv([1, 0], y);
  return Math.hypot(z[0], z[1]);
}

export const srf = ({ c, esl }) => 1 / (2 * Math.PI * Math.sqrt(c * esl));

/** Log-spaced sweep with |Z|, plus the band where |Z| ≤ Z_target. */
export function sweepBank(groups, { fMin = 1e3, fMax = 1e9, points = 240, planeC = 0, zTarget }) {
  const out = [];
  for (let i = 0; i < points; i++) {
    const f = fMin * (fMax / fMin) ** (i / (points - 1));
    out.push([f, bankZ(f, groups, planeC)]);
  }
  let lo = null;
  let hi = null;
  let worst = null;
  if (zTarget > 0) {
    for (const [f, z] of out) {
      if (z <= zTarget) {
        if (lo === null) lo = f;
        hi = f;
      }
    }
    // Worst violation between the first and last compliant points (anti-resonances).
    if (lo !== null) {
      for (const [f, z] of out) if (f >= lo && f <= hi && z > zTarget && (!worst || z > worst[1])) worst = [f, z];
    }
  }
  return { points: out, band: lo !== null ? [lo, hi] : null, worst };
}

/** Bulk capacitance so that |Zc| ≤ Z_target down to f_low (regulator loop crossover). */
export const bulkCapacitance = (zTarget, fLow) => 1 / (2 * Math.PI * fLow * zTarget);

/** Parallel-plate capacitance (F) of a power/ground plane pair. */
export const planeCapacitance = (areaMm2, gapMm, er) => (8.854e-12 * er * (areaMm2 * 1e-6)) / (gapMm * 1e-3);

// ---------------------------------------------------------------------------
// Thermal
// ---------------------------------------------------------------------------

/** Linear regulator dissipation: P = (Vin − Vout)·Iout + Vin·Iq. */
export const ldoPower = ({ vin, vout, iout, iq = 0 }) => (vin - vout) * iout + vin * iq;

/**
 * Junction temperature and limits.
 * Either thetaJA, or the chain thetaJC + thetaCS + thetaSA.
 */
export function junction({ powerW, ambientC, thetaJA, thetaJC, thetaCS = 0, thetaSA, tjMaxC }) {
  const chain = Number.isFinite(thetaJC) && Number.isFinite(thetaSA);
  const thetaTotal = chain ? thetaJC + (thetaCS || 0) + thetaSA : thetaJA;
  const tj = ambientC + powerW * thetaTotal;
  const r = { thetaTotal, tj };
  if (Number.isFinite(tjMaxC)) {
    r.margin = tjMaxC - tj;
    r.maxPower = (tjMaxC - ambientC) / thetaTotal;
    r.maxAmbient = tjMaxC - powerW * thetaTotal;
    if (Number.isFinite(thetaJC)) {
      // Heatsink needed to hold Tj = Tj,max.
      r.requiredThetaSA = (tjMaxC - ambientC) / powerW - thetaJC - (thetaCS || 0);
    }
  }
  return r;
}
