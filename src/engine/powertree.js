// Power tree and power budget: a DC supply tree (source → regulators → loads)
// solved for every regulator and for the source.
//
// Regulator models (steady state, one number per parameter):
//   ldo                      Iin = Iout + Iq
//                            Ploss = (Vin − Vout)·Iout + Vin·Iq
//   buck, boost, buckboost   Pin = Pout/η + Vin·Iq,  Iin = Pin/Vin,  Ploss = Pin − Pout
//   switch                   load switch, ferrite bead or a direct connection:
//                            Vout = Vin − I·R,  Iin = Iout,  Ploss = I²·R
//   junction temperature     Tj = Ta + Ploss·θJA
//
// Loads are current sinks. Currents add up from the leaves to the source,
// voltages follow from the source down. Three operating points are solved:
//   typ   nominal source voltage, typical load currents
//   lo    minimum source voltage, maximum load currents
//   hi    maximum source voltage, maximum load currents
// The worst case of a regulator is the point where it suffers most: an LDO
// dissipates most at the highest input voltage (hi), a switching regulator
// draws the most input current at the lowest (lo), a series resistance carries
// the most current there too (lo).
//
// Sources: Erickson & Maksimović, Fundamentals of Power Electronics, 3rd ed.,
// ch. 3 (losses and efficiency: Pin = Pout/η); Horowitz & Hill, The Art of
// Electronics, 3rd ed., ch. 9 (linear regulator dissipation and dropout,
// thermal resistance Tj = Ta + P·θJA).
//
// Not modelled: efficiency as a function of load (light-load efficiency of a
// switcher is much lower), start-up and inrush, cable/connector/trace drops,
// an LDO inside its dropout region (the output is assumed to be regulated).

/** `parent` of a regulator / `rail` of a load that hangs directly on the source. */
export const SOURCE = 'src';

export const REG_TYPES = ['ldo', 'buck', 'boost', 'buckboost', 'switch'];

export const LIMITS = {
  maxRegs: 12,
  maxLoads: 30,
  tjNoteC: 100, // milder note above this junction temperature
  tjMaxC: 125, // warning above this junction temperature
  ratedNote: 0.8, // note above this share of the rated output current
  ldoThetaW: 1, // an LDO dissipating more than this needs a θJA to be checked
};

// The fixed-point iteration converges with the ratio (drop across a series
// resistance) / (voltage behind it); 1000 passes cover drops up to ≈ 49 % of
// the input, beyond that the operating point is reported as collapsed.
const MAX_ITER = 1000;
const fin = Number.isFinite;
const opt = (x) => (fin(x) ? x : 0); // optional parameter: missing → 0
const isSwitcher = (type) => type === 'buck' || type === 'boost' || type === 'buckboost';

/**
 * One regulator at one operating point.
 * @param {object} reg { type, voutV, eff (0–1], iqA?, rSeriesOhm? }
 * @param {number} vinV  input voltage (V)
 * @param {number} ioutA output current (A)
 * @returns {{ vinV, voutV, ioutA, iinA, pinW, poutW, lossW, eff }}
 *   An LDO cannot deliver more than its input: its output is min(Vout, Vin).
 */
export function regulatorPoint(reg, vinV, ioutA) {
  const iqA = opt(reg.iqA);
  let voutV;
  let iinA;
  if (reg.type === 'ldo') {
    voutV = Math.min(reg.voutV, vinV);
    iinA = ioutA + iqA;
  } else if (reg.type === 'switch') {
    voutV = vinV - ioutA * opt(reg.rSeriesOhm);
    iinA = ioutA;
  } else {
    voutV = reg.voutV;
    iinA = (voutV * ioutA) / (reg.eff * vinV) + iqA;
  }
  const pinW = vinV * iinA;
  const poutW = voutV * ioutA;
  return { vinV, voutV, ioutA, iinA, pinW, poutW, lossW: pinW - poutW, eff: pinW > 0 ? poutW / pinW : NaN };
}

/** Junction temperature (°C) from the ambient, the dissipation and θJA (°C/W). */
export const junctionC = (ambientC, lossW, thetaJA) => ambientC + lossW * thetaJA;

// ---------------------------------------------------------------------------
// Validation and tree structure
// ---------------------------------------------------------------------------

function prepare(tree) {
  const source = tree?.source ?? {};
  const regsIn = Array.isArray(tree?.regs) ? tree.regs : [];
  const loadsIn = Array.isArray(tree?.loads) ? tree.loads : [];
  const errors = [];

  const vNomV = source.vNomV;
  const vMinV = fin(source.vMinV) ? source.vMinV : vNomV;
  const vMaxV = fin(source.vMaxV) ? source.vMaxV : vNomV;
  const ambientC = source.ambientC;
  if (!(vNomV > 0) || !fin(vNomV)) errors.push({ code: 'source' });
  else if (!(vMinV > 0) || vMinV > vNomV || vMaxV < vNomV || !fin(vMaxV)) errors.push({ code: 'sourceRange' });
  if (!fin(ambientC)) errors.push({ code: 'ambient' });

  const regs = regsIn.map((r, i) => ({ ...r, id: r?.id ?? `r${i}`, name: r?.name ?? '' }));
  const index = new Map();
  regs.forEach((r, i) => {
    if (index.has(r.id) || r.id === SOURCE) errors.push({ code: 'duplicate', id: r.id });
    else index.set(r.id, i);
  });

  regs.forEach((r) => {
    if (!REG_TYPES.includes(r.type)) { errors.push({ code: 'type', id: r.id }); return; }
    if (r.type !== 'switch' && !(r.voutV > 0 && fin(r.voutV))) errors.push({ code: 'vout', id: r.id });
    if (isSwitcher(r.type) && !(r.eff > 0 && r.eff <= 1)) errors.push({ code: 'eff', id: r.id });
    const negative = [r.iqA, r.dropoutV, r.rSeriesOhm].some((x) => fin(x) && x < 0)
      || [r.iRatedA, r.thetaJA].some((x) => fin(x) && x <= 0);
    if (negative) errors.push({ code: 'negative', id: r.id });
  });

  // Parents: every regulator hangs on the source or on another regulator.
  const parentIdx = regs.map((r) => {
    if (r.parent === SOURCE || r.parent === undefined || r.parent === null) return -1;
    if (index.has(r.parent)) return index.get(r.parent);
    errors.push({ code: 'parent', id: r.id });
    return -2;
  });
  // A regulator is on a loop when following the parents leads back to it.
  const loop = [];
  regs.forEach((r, i) => {
    let k = parentIdx[i];
    for (let step = 0; step < regs.length && k >= 0; step++) {
      if (k === i) { loop.push(r.id); break; }
      k = parentIdx[k];
    }
  });
  if (loop.length) errors.push({ code: 'cycle', ids: loop });

  const loads = loadsIn.map((l, i) => {
    const iTypA = l?.iTypA;
    const iMaxA = fin(l?.iMaxA) ? l.iMaxA : iTypA;
    let railIdx = -1;
    if (!(l?.rail === SOURCE || l?.rail === undefined || l?.rail === null)) {
      if (index.has(l.rail)) railIdx = index.get(l.rail);
      else errors.push({ code: 'rail', index: i });
    }
    if (!(iTypA >= 0) || !fin(iTypA)) errors.push({ code: 'load', index: i });
    else if (iMaxA < iTypA) errors.push({ code: 'loadMax', index: i });
    return { name: l?.name ?? '', rail: railIdx < 0 ? SOURCE : regs[railIdx].id, railIdx, iTypA, iMaxA };
  });

  if (errors.length) return { errors };

  // Children and loads per node; `order` lists the regulators parents first
  // (depth-first from the source, in the order they were given).
  const children = regs.map(() => []);
  const top = [];
  regs.forEach((r, i) => (parentIdx[i] < 0 ? top : children[parentIdx[i]]).push(i));
  const loadIdx = regs.map(() => []);
  const srcLoads = [];
  loads.forEach((l, i) => (l.railIdx < 0 ? srcLoads : loadIdx[l.railIdx]).push(i));
  const order = [];
  const depth = regs.map(() => 0);
  const stack = top.map((i) => [i, 1]).reverse();
  while (stack.length) {
    const [i, d] = stack.pop();
    order.push(i);
    depth[i] = d;
    for (let j = children[i].length - 1; j >= 0; j--) stack.push([children[i][j], d + 1]);
  }

  return {
    errors,
    source: { name: source.name ?? '', vNomV, vMinV, vMaxV, ambientC },
    regs, loads, parentIdx, children, top, loadIdx, srcLoads, order, depth,
  };
}

// ---------------------------------------------------------------------------
// One operating point
// ---------------------------------------------------------------------------

/**
 * Solve the whole tree for one source voltage and one set of load currents.
 * A series resistance makes its output voltage depend on the current it
 * carries, and a switching regulator behind it draws more current at a lower
 * voltage, so voltages (top-down) and currents (bottom-up) are iterated to a
 * fixed point; without such a pair the second pass already changes nothing.
 */
function solvePoint(m, vSrcV, pick) {
  const n = m.regs.length;
  const vin = new Array(n).fill(vSrcV);
  const vout = new Array(n).fill(0);
  const iout = new Array(n).fill(0);
  const iin = new Array(n).fill(0);
  const loadSum = m.loadIdx.map((list) => list.reduce((a, i) => a + pick(m.loads[i]), 0));
  let failed = -1;
  let converged = n === 0;

  for (let it = 0; it < MAX_ITER && !converged && failed < 0; it++) {
    let delta = 0;
    for (const k of m.order) {
      vin[k] = m.parentIdx[k] < 0 ? vSrcV : vout[m.parentIdx[k]];
      const next = regulatorPoint(m.regs[k], vin[k], iout[k]).voutV;
      delta = Math.max(delta, Math.abs(next - vout[k]));
      vout[k] = next;
      if (!(next > 0)) { failed = k; break; }
    }
    if (failed >= 0) break;
    for (let j = n - 1; j >= 0; j--) {
      const k = m.order[j];
      iout[k] = loadSum[k] + m.children[k].reduce((a, c) => a + iin[c], 0);
      iin[k] = regulatorPoint(m.regs[k], vin[k], iout[k]).iinA;
    }
    converged = it > 0 && delta <= 1e-12 * Math.max(1, vSrcV);
  }
  if (failed < 0 && !converged) {
    // No stable operating point: blame the first series resistance on the way.
    failed = m.order.find((k) => m.regs[k].type === 'switch' && opt(m.regs[k].rSeriesOhm) > 0) ?? m.order[0];
  }
  if (failed >= 0) return { failedIdx: failed };

  const regs = m.regs.map((r, k) => regulatorPoint(r, vin[k], iout[k]));
  const loads = m.loads.map((l) => {
    const vV = l.railIdx < 0 ? vSrcV : regs[l.railIdx].voutV;
    const iA = pick(l);
    return { vV, iA, pW: vV * iA };
  });
  const sourceA = m.top.reduce((a, k) => a + regs[k].iinA, 0) + m.srcLoads.reduce((a, i) => a + loads[i].iA, 0);
  const sourceW = vSrcV * sourceA;
  const loadW = loads.reduce((a, l) => a + l.pW, 0);
  const lossW = regs.reduce((a, r) => a + r.lossW, 0);
  const totals = { sourceV: vSrcV, sourceA, sourceW, loadW, lossW, eff: sourceW > 0 ? loadW / sourceW : NaN };
  const finite = [sourceA, sourceW, loadW, lossW, ...regs.flatMap((r) => [r.voutV, r.iinA, r.pinW])].every(fin);
  return { regs, loads, totals, finite };
}

// ---------------------------------------------------------------------------
// Whole analysis
// ---------------------------------------------------------------------------

/**
 * @param {object} tree
 * @param {object} tree.source { name?, vNomV, vMinV?, vMaxV?, ambientC }  (min/max default to nominal)
 * @param {object[]} tree.regs  { id?, name?, parent (SOURCE or the id of another regulator), type,
 *   voutV (not for 'switch'), eff (0–1], switching types), iqA?, dropoutV? (ldo),
 *   rSeriesOhm? (switch), iRatedA?, thetaJA? (°C/W) }
 * @param {object[]} tree.loads { name?, rail (SOURCE or a regulator id), iTypA, iMaxA? (default: typical) }
 *
 * @returns {object} { ok: false, errors } with errors = [{ code, id? | index? | ids? }], or
 *   { ok: true, errors: [], warnings: [{ code, id, … }],
 *     source: { name, vNomV, vMinV, vMaxV, ambientC, children, loadIdx },
 *     regs:  [{ id, name, type, parent, depth, children, loadIdx,
 *               voutSetV, eff, iqA, dropoutV, rSeriesOhm, iRatedA, thetaJA (the inputs, optional ones 0 / NaN),
 *               typ, lo, hi, worst (= hi for an LDO, lo otherwise; worst.at says which) }]
 *            each point = { vinV, voutV, ioutA, iinA, pinW, poutW, lossW, eff, loadFrac?, tjC? },
 *     loads: [{ name, rail, iTypA, iMaxA, typ, lo, hi }]  each point = { vV, iA, pW },
 *     order: regulator indices, parents before children,
 *     totals: { typ, lo, hi: { sourceV, sourceA, sourceW, loadW, lossW, eff },
 *               worst: { sourceA, sourceAtV, sourceW, lossW, eff },
 *               maxLossId, maxLossWorstId } }
 */
export function analyzePowerTree(tree) {
  const m = prepare(tree);
  if (m.errors.length) return { ok: false, errors: m.errors, warnings: [] };

  const { source } = m;
  const points = {
    typ: solvePoint(m, source.vNomV, (l) => l.iTypA),
    lo: solvePoint(m, source.vMinV, (l) => l.iMaxA),
    hi: solvePoint(m, source.vMaxV, (l) => l.iMaxA),
  };
  for (const p of Object.values(points)) {
    if (p.failedIdx !== undefined) return { ok: false, errors: [{ code: 'collapse', id: m.regs[p.failedIdx].id }], warnings: [] };
  }
  if (!Object.values(points).every((p) => p.finite)) return { ok: false, errors: [{ code: 'range' }], warnings: [] };

  const warnings = [];
  const regs = m.regs.map((r, k) => {
    const decorate = (p) => {
      const out = { ...p };
      if (fin(r.iRatedA)) out.loadFrac = p.ioutA / r.iRatedA;
      if (fin(r.thetaJA)) out.tjC = junctionC(source.ambientC, p.lossW, r.thetaJA);
      return out;
    };
    const typ = decorate(points.typ.regs[k]);
    const lo = decorate(points.lo.regs[k]);
    const hi = decorate(points.hi.regs[k]);
    const at = r.type === 'ldo' ? 'hi' : 'lo';
    return {
      id: r.id, name: r.name, type: r.type, parent: m.parentIdx[k] < 0 ? SOURCE : m.regs[m.parentIdx[k]].id,
      depth: m.depth[k], children: m.children[k], loadIdx: m.loadIdx[k],
      voutSetV: r.type === 'switch' ? NaN : r.voutV,
      eff: isSwitcher(r.type) ? r.eff : NaN,
      iqA: r.type === 'switch' ? 0 : opt(r.iqA),
      dropoutV: r.type === 'ldo' ? opt(r.dropoutV) : NaN,
      rSeriesOhm: r.type === 'switch' ? opt(r.rSeriesOhm) : NaN,
      iRatedA: fin(r.iRatedA) ? r.iRatedA : NaN,
      thetaJA: fin(r.thetaJA) ? r.thetaJA : NaN,
      typ, lo, hi, worst: { ...(at === 'hi' ? hi : lo), at },
    };
  });

  // Highest input a regulator can see: the source at its maximum and nothing
  // dropped in the series resistances in front of it (no load). The `hi` point
  // is lower than that behind a loaded switch or ferrite bead.
  const vinCeil = new Array(m.regs.length);
  const voutCeil = new Array(m.regs.length);
  for (const k of m.order) {
    vinCeil[k] = m.parentIdx[k] < 0 ? source.vMaxV : voutCeil[m.parentIdx[k]];
    voutCeil[k] = regulatorPoint(m.regs[k], vinCeil[k], 0).voutV;
  }

  for (const k of m.order) {
    const r = m.regs[k];
    const res = regs[k];
    const w = res.worst;
    if (r.type === 'ldo') {
      const headroomV = res.lo.vinV - r.voutV;
      const dropoutV = opt(r.dropoutV);
      if (headroomV < dropoutV || headroomV <= 0) warnings.push({ code: 'dropout', id: r.id, vinV: res.lo.vinV, voutV: r.voutV, headroomV, dropoutV });
    }
    if (r.type === 'buck' && r.voutV >= res.lo.vinV) warnings.push({ code: 'buckRange', id: r.id, vinV: res.lo.vinV, voutV: r.voutV });
    if (r.type === 'boost' && r.voutV <= vinCeil[k]) warnings.push({ code: 'boostRange', id: r.id, vinV: vinCeil[k], voutV: r.voutV });
    if (fin(r.iRatedA)) {
      const info = { id: r.id, ioutA: w.ioutA, iRatedA: r.iRatedA, frac: w.loadFrac };
      if (w.ioutA > r.iRatedA) warnings.push({ code: 'overRated', ...info });
      else if (w.loadFrac > LIMITS.ratedNote) warnings.push({ code: 'nearRated', ...info });
    }
    if (fin(r.thetaJA)) {
      const info = { id: r.id, tjC: w.tjC, lossW: w.lossW, thetaJA: r.thetaJA, ambientC: source.ambientC };
      if (w.tjC > LIMITS.tjMaxC) warnings.push({ code: 'tjOver', ...info });
      else if (w.tjC > LIMITS.tjNoteC) warnings.push({ code: 'tjHigh', ...info });
    } else if (r.type === 'ldo' && w.lossW > LIMITS.ldoThetaW) {
      warnings.push({ code: 'ldoNoTheta', id: r.id, lossW: w.lossW });
    }
    if (!m.children[k].length && !m.loadIdx[k].length) warnings.push({ code: 'noLoad', id: r.id, voutV: res.typ.voutV });
  }

  const loads = m.loads.map((l, i) => ({
    name: l.name, rail: l.rail, iTypA: l.iTypA, iMaxA: l.iMaxA,
    typ: points.typ.loads[i], lo: points.lo.loads[i], hi: points.hi.loads[i],
  }));

  const { typ, lo, hi } = { typ: points.typ.totals, lo: points.lo.totals, hi: points.hi.totals };
  const fromHi = hi.sourceA > lo.sourceA;
  const effs = [lo.eff, hi.eff].filter(fin);
  const maxBy = (key) => {
    let best = null;
    for (const k of m.order) if (regs[k][key].lossW > 0 && (best === null || regs[k][key].lossW > regs[best][key].lossW)) best = k;
    return best === null ? null : regs[best].id;
  };

  return {
    ok: true,
    errors: [],
    warnings,
    source: { ...source, children: m.top, loadIdx: m.srcLoads },
    regs,
    loads,
    order: m.order,
    totals: {
      typ, lo, hi,
      worst: {
        sourceA: fromHi ? hi.sourceA : lo.sourceA,
        sourceAtV: fromHi ? hi.sourceV : lo.sourceV,
        sourceW: Math.max(lo.sourceW, hi.sourceW),
        lossW: Math.max(lo.lossW, hi.lossW),
        eff: effs.length ? Math.min(...effs) : NaN,
      },
      maxLossId: maxBy('typ'),
      maxLossWorstId: maxBy('worst'),
    },
  };
}
