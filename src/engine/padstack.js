// Plated-hole land (pad) sizing and annular-ring checks.
//
// IPC-2221 §9.1.1:  minimum land = a + 2b + c
//   a = maximum finished hole (external layers) / maximum drilled hole (internal)
//   b = minimum annular ring, Table 9-2 (external 0.050 mm, internal 0.025 mm)
//   c = fabrication allowance, Table 9-1 (A 0.4 / B 0.25 / C 0.2 mm),
//       + 0.05 mm per oz of copper above 1 oz
// IPC-2222 Table 9-3: min hole = max lead + 0.25/0.20/0.15 mm (A/B/C),
//   max hole = min lead + 0.7/0.7/0.6 mm.
// IPC-6012: annular-ring acceptance per class (Class 2 internal breakout only
//   with teardrops/fillets).

export const LEVELS = ['A', 'B', 'C'];

/** IPC-2221B Table 9-1 — minimum fabrication allowance (mm). */
export const FAB_ALLOWANCE_MM = { A: 0.4, B: 0.25, C: 0.2 };

/** IPC-2221B — minimum annular ring for design (mm). */
export const MIN_RING_MM = { external: 0.05, internal: 0.025 };

/** IPC-2222 Table 9-3 — min hole = max lead + clearance (mm). */
export const LEAD_CLEARANCE_MM = { A: 0.25, B: 0.2, C: 0.15 };
/** IPC-2222 Table 9-3 — max hole = min lead + this (mm). */
export const LEAD_MAX_GAP_MM = { A: 0.7, B: 0.7, C: 0.6 };

/**
 * IPC-6012 annular-ring acceptance (as-built). `breakoutDeg` = hole breakout
 * allowed (with the conductor junction rules of the standard); `minMm` =
 * minimum measured ring when no breakout is allowed.
 */
export const IPC6012_RING = {
  1: { external: { breakoutDeg: 180 }, internal: { breakoutDeg: 180 } },
  2: { external: { breakoutDeg: 90 }, internal: { breakoutDeg: 90 } },
  3: { external: { minMm: 0.05 }, internal: { minMm: 0.025 } },
};

/** Equivalent round diameter of a rectangular lead (its diagonal). */
export const rectLeadDiameter = (w, t) => Math.hypot(w, t);

/**
 * @param {object} p
 * @param {'via'|'round'|'rect'} p.kind
 * @param {number} [p.holeMm]       finished hole (via / user-defined), mm
 * @param {number} [p.leadMm]       max lead diameter (round), mm
 * @param {number} [p.leadW] [p.leadT] rectangular lead, mm
 * @param {number} p.tolMm          finished-hole tolerance (±), mm
 * @param {'A'|'B'|'C'} p.level
 * @param {number} [p.padMm]        designed pad diameter to check, mm
 * @param {number} [p.drillAllowMm] drill oversize vs finished hole, mm
 * @param {number} [p.boardMm]      board thickness for aspect ratio
 */
export function calculatePadstack(p) {
  const errors = [];
  const level = LEVELS.includes(p.level) ? p.level : 'B';
  const tol = p.tolMm >= 0 ? p.tolMm : 0;

  let minHole;
  let leadDia = null;
  if (p.kind === 'round' || p.kind === 'rect') {
    leadDia = p.kind === 'rect' ? rectLeadDiameter(p.leadW, p.leadT) : p.leadMm;
    if (!(leadDia > 0)) errors.push('lead');
    minHole = leadDia + LEAD_CLEARANCE_MM[level];
  } else {
    if (!(p.holeMm > 0)) errors.push('hole');
    minHole = p.holeMm - tol;
  }
  if (errors.length) return { ok: false, errors };

  // Nominal finished hole: for components, the minimum hole must respect the
  // clearance, so nominal = min + tolerance.
  const nominalHole = p.kind === 'via' ? p.holeMm : minHole + tol;
  const maxHole = nominalHole + tol; // "a" on external layers: largest finished hole
  const drillAllow = p.drillAllowMm >= 0 ? p.drillAllowMm : 0.1;
  const drill = nominalHole + drillAllow;
  const maxDrill = maxHole + drillAllow; // "a" on internal layers: largest drilled hole
  // Table 9-1 allowance, + 0.05 mm per oz of copper above 1 oz.
  const heavy = p.copperOz > 1 ? 0.05 * (p.copperOz - 1) : 0;
  const c = FAB_ALLOWANCE_MM[level] + heavy;
  const landExt = maxHole + 2 * MIN_RING_MM.external + c;
  const landInt = maxDrill + 2 * MIN_RING_MM.internal + c;

  const res = {
    ok: true,
    level,
    leadDia,
    nominalHole,
    minHole: nominalHole - tol,
    maxHole,
    drill,
    fabAllowance: c,
    landExt,
    landInt,
    warnings: [],
  };

  if (p.boardMm > 0) {
    res.aspectRatio = p.boardMm / drill;
    if (res.aspectRatio > 10) res.warnings.push('aspectHigh');
  }
  if (p.kind !== 'via' && leadDia !== null && maxHole - leadDia > LEAD_MAX_GAP_MM[level]) res.warnings.push('holeLoose');

  if (p.padMm > 0) {
    // Worst case: biggest hole, full fabrication allowance consumed.
    // External ring is measured to the finished hole, internal to the drilled hole.
    const nominalRing = (p.padMm - nominalHole) / 2;
    const worstRing = (p.padMm - maxHole - c) / 2;
    const worstRingInt = (p.padMm - maxDrill - c) / 2;
    res.check = {
      padMm: p.padMm,
      nominalRing,
      worstRing,
      worstRingInt,
      ipc2221Ext: worstRing >= MIN_RING_MM.external - 1e-9,
      ipc2221Int: worstRingInt >= MIN_RING_MM.internal - 1e-9,
      // Class 3 has a measured minimum; classes 1–2 tolerate breakout, so a
      // non-negative worst-case ring keeps the hole inside the land.
      class3Ext: worstRing >= IPC6012_RING[3].external.minMm - 1e-9,
      class3Int: worstRingInt >= IPC6012_RING[3].internal.minMm - 1e-9,
      noBreakout: Math.min(worstRing, worstRingInt) >= 0,
    };
    if (p.padMm <= maxHole) res.warnings.push('padSmallerThanHole');
  }
  return res;
}
