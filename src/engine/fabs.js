// Fabricator capability presets and the rule check used by the "Fab check"
// blocks. Every value below was read on the fabricator's own page on the
// access date given; rules a fabricator does not publish are left out (the
// check then reports "not published" instead of guessing).
//
// Conventions
// - Lengths in mm. Hole sizes are the finished / designed hole as drawn in the
//   CAD data; annular ring = (pad − hole) / 2 on that hole.
// - traceSpace rows apply up to `oz` of copper (finished weight). `two` is the
//   value for 1–2 layer boards where a fab lists it separately.
// - holeCopper: clearance from a hole edge to unconnected copper on inner
//   layers (antipad / plane clearance).

const IN = 0.0254; // mm per mil

export const FABS = [
  {
    id: 'jlc',
    name: 'JLCPCB',
    service: 'Standard PCB',
    url: 'https://jlcpcb.com/capabilities/pcb-capabilities',
    accessed: '2026-11-25',
    traceSpace: [
      // "1 oz: 0.10/0.10 mm (2-layer), 0.09/0.09 mm (multilayer)";
      // "2 oz: 0.16/0.16 mm (2-layer), 0.15/0.15 mm (multilayer)".
      // Inner layers are not listed separately: the multilayer values are used.
      { oz: 1, two: [0.10, 0.10], outer: [0.09, 0.09], inner: [0.09, 0.09] },
      { oz: 2, two: [0.16, 0.16], outer: [0.15, 0.15], inner: [0.15, 0.15] },
    ],
    minHoleMm: 0.15, // mechanical drill 0.15–6.3 mm (2-layer and multilayer)
    // Via: "min via hole/diameter 0.15/0.25 mm" → 0.05 mm ring.
    // PTH (1 oz): absolute minimum 0.18 mm (2-layer), 0.15 mm (multilayer);
    // recommended 0.25 / 0.20 mm; 2 oz needs ≥ 0.254 mm.
    ring: { via: 0.05, pth: 0.15, pthTwo: 0.18 },
    holeCopper: { via: 0.2, pth: 0.3 }, // inner-layer via hole / PTH hole to copper
    thicknessMm: [0.4, 0.6, 0.8, 1.0, 1.2, 1.6, 2.0],
    tol: { pct: 10, absMm: 0.1, belowMm: 1.0 }, // ±10 % (≥ 1.0 mm), ±0.1 mm below
  },
  {
    id: 'pcbway',
    name: 'PCBWay',
    service: 'Standard PCB',
    url: 'https://www.pcbway.com/capabilities.html',
    accessed: '2026-11-25',
    traceSpace: [
      // Standard PCB: "Min manufacturable trace/spacing 4 mil (0.1 mm)".
      { oz: 1, outer: [0.1, 0.1], inner: [0.1, 0.1] },
      // Heavier copper is only given in the Advanced PCB table ("normal
      // process", values before compensation, mil): 2 oz outer 7/8, inner
      // 6/8; 3 oz outer 10/12, inner 8/11.
      { oz: 2, outer: [7 * IN, 8 * IN], inner: [6 * IN, 8 * IN] },
      { oz: 3, outer: [10 * IN, 12 * IN], inner: [8 * IN, 11 * IN] },
    ],
    minHoleMm: 0.15, // "Min drill size is 0.15mm" (below 0.2 mm at extra cost)
    ring: { via: 0.15, pth: 0.15 }, // "Min width for Annular Ring is 0.15mm (6mil)"
    // Advanced PCB "inner isolation ring", normal process: 4L ≥ 7 mil,
    // 6L ≥ 8 mil, 8L ≥ 9 mil, ≥ 10L ≥ 10 mil.
    holeCopperByLayers: [[4, 7 * IN], [6, 8 * IN], [8, 9 * IN], [99, 10 * IN]],
    thicknessMm: [0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.6, 2.0, 2.4, 2.6, 2.8, 3.0, 3.2],
    tol: { pct: 10, absMm: 0.1, belowMm: 1.0 },
  },
  {
    id: 'eurocircuits',
    name: 'Eurocircuits',
    service: 'PCB proto · class 6C', // pattern class 6, drill class C
    url: 'https://www.eurocircuits.com/pcb-design-guidelines/classification/',
    url2: 'https://www.eurocircuits.com/pcb-proto-service-default-values/',
    accessed: '2026-11-25',
    traceSpace: [
      // Pattern class 6: track and gap 0.150 mm outer and inner. Heavier base
      // copper needs more (classification table "min pattern values"):
      // 70 µm 0.200 mm, 105 µm 0.250 mm.
      { oz: 1, outer: [0.15, 0.15], inner: [0.15, 0.15] },
      { oz: 2, outer: [0.2, 0.2], inner: [0.2, 0.2] },
      { oz: 3, outer: [0.25, 0.25], inner: [0.25, 0.25] },
    ],
    minHoleMm: 0.25, // drill class C: min finished PTH 0.25 mm (tool 0.35 mm)
    // PCB proto: pad = finished hole + 0.350 mm (OAR/IAR 0.125 mm from the
    // tool, tool = finished hole + 0.10 mm) → 0.175 mm on the finished hole.
    ring: { via: 0.175, pth: 0.175 },
    // IPI 0.200 mm from the tool edge = 0.25 mm from the finished hole edge.
    holeCopper: { via: 0.25, pth: 0.25 },
    thicknessMm: [1.55], // PCB proto default; other thicknesses in other services
    layers: [2, 4], // PCB proto: 2 or 4 layers
    tol: { pct: 10 },
  },
  {
    id: 'generic',
    name: 'IPC-2221 Level B / typical',
    service: 'IPC-2221B §9.1 Table 9-1 + JLCPCB / PCBWay / Eurocircuits',
    // Limits every fabricator above accepts (the larger of their minimums;
    // tests/cases/stackup.js checks this), with the IPC-2221B Level B land:
    // D = hole + 2·0.05 + 0.25 mm → ring (D − hole)/2 = 0.175 mm.
    url: null,
    accessed: '2026-11-25',
    traceSpace: [
      { oz: 1, outer: [0.15, 0.15], inner: [0.15, 0.15] },
      { oz: 2, outer: [0.2, 8 * IN], inner: [0.2, 8 * IN] },
      { oz: 3, outer: [10 * IN, 12 * IN], inner: [0.25, 11 * IN] },
    ],
    minHoleMm: 0.25,
    ring: { via: 0.175, pth: 0.18 },
    holeCopper: { via: 10 * IN, pth: 0.3 },
    thicknessMm: [0.4, 0.6, 0.8, 1.0, 1.2, 1.6, 2.0], // offered by both JLCPCB and PCBWay
    tol: { pct: 10, absMm: 0.1, belowMm: 1.0 },
  },
];

export const fabById = (id) => FABS.find((f) => f.id === id) ?? null;

const SLACK = 1e-6;
const OZ_SLACK = 0.06; // 1 oz plated outer copper (≈ 35–48 µm) still counts as 1 oz

/** Copper µm → oz (1 oz/ft² ≈ 35 µm). */
export const umToOz = (um) => um / 35;

/** Min trace/space for a copper weight and layer position, or null if the fab publishes none. */
export function traceSpaceRule(fab, { oz = 1, inner = false, layers } = {}) {
  const row = fab.traceSpace.find((r) => oz <= r.oz + OZ_SLACK);
  if (!row) return null;
  // Unknown layer count on an outer layer → the (stricter) 1–2 layer value.
  const pair = inner ? row.inner : row.two && !(layers > 2) ? row.two : row.outer;
  return { trace: pair[0], space: pair[1], oz: row.oz };
}

/** Annular-ring minimum (mm) for a via or a plated through hole. */
export function ringRule(fab, kind = 'via', layers) {
  if (kind === 'via') return fab.ring.via;
  return fab.ring.pthTwo !== undefined && !(layers > 2) ? fab.ring.pthTwo : fab.ring.pth;
}

/** Inner-layer hole-to-copper clearance (mm). */
export function holeCopperRule(fab, kind = 'via', layers = 4) {
  if (fab.holeCopperByLayers) return fab.holeCopperByLayers.find(([n]) => layers <= n)[1];
  return fab.holeCopper?.[kind] ?? null;
}

/** Thickness tolerance (± mm) a fab applies to a nominal thickness. */
export function thicknessTol(fab, nominalMm) {
  const { pct, absMm, belowMm } = fab.tol;
  return absMm !== undefined && nominalMm < belowMm ? absMm : (nominalMm * pct) / 100;
}

/** Nearest listed thickness and whether `mm` lies inside its tolerance band. */
export function thicknessMatch(fab, mm) {
  let best = fab.thicknessMm[0];
  for (const x of fab.thicknessMm) if (Math.abs(x - mm) < Math.abs(best - mm)) best = x;
  const tol = thicknessTol(fab, best);
  return { nominal: best, tol, ok: Math.abs(mm - best) <= tol + SLACK };
}

/**
 * Compare a geometry with a fab's minimums. Only the fields given are checked.
 * g: { traceMm, spaceMm, oz, inner, layers, holeMm, padMm, holeKind:'via'|'pth',
 *      viaPadMm, holeCopperMm, boardMm }
 * Returns [{ id, ok (true/false, null = no published rule), value, limit, … }].
 */
export function fabChecks(fab, g) {
  const out = [];
  const ge = (value, limit) => value >= limit - SLACK;
  const oz = g.oz ?? 1;
  if (g.traceMm !== undefined || g.spaceMm !== undefined) {
    const r = traceSpaceRule(fab, { oz, inner: !!g.inner, layers: g.layers });
    if (g.traceMm !== undefined) out.push({ id: 'trace', ok: r ? ge(g.traceMm, r.trace) : null, value: g.traceMm, limit: r?.trace, oz, inner: !!g.inner });
    if (g.spaceMm !== undefined) out.push({ id: 'space', ok: r ? ge(g.spaceMm, r.space) : null, value: g.spaceMm, limit: r?.space, oz, inner: !!g.inner });
  }
  if (g.holeMm !== undefined) out.push({ id: 'hole', ok: ge(g.holeMm, fab.minHoleMm), value: g.holeMm, limit: fab.minHoleMm });
  if (g.holeMm !== undefined && g.padMm !== undefined) {
    const lim = ringRule(fab, g.holeKind ?? 'via', g.layers);
    const ring = (g.padMm - g.holeMm) / 2;
    out.push({ id: 'ring', ok: ge(ring, lim), value: ring, limit: lim, kind: g.holeKind ?? 'via' });
  }
  if (g.viaPadMm !== undefined) {
    const lim = fab.minHoleMm + 2 * fab.ring.via;
    out.push({ id: 'viaPad', ok: ge(g.viaPadMm, lim), value: g.viaPadMm, limit: lim });
  }
  if (g.holeCopperMm !== undefined) {
    const lim = holeCopperRule(fab, g.holeKind ?? 'via', g.layers ?? 4);
    out.push({ id: 'holeCu', ok: lim === null ? null : ge(g.holeCopperMm, lim), value: g.holeCopperMm, limit: lim });
  }
  if (g.boardMm !== undefined) {
    const m = thicknessMatch(fab, g.boardMm);
    out.push({ id: 'thickness', ok: m.ok, value: g.boardMm, limit: m.nominal, tol: m.tol });
  }
  if (g.layers !== undefined && fab.layers) {
    out.push({ id: 'layers', ok: fab.layers.includes(g.layers), value: g.layers, limit: Math.max(...fab.layers) });
  }
  return out;
}
