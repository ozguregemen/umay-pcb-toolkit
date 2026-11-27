// Power path voltage drop: the DC resistance, voltage drop and loss of every
// element a supply current passes through on its way from the source to the
// load (and, when the return elements are listed too, back again).
//
// Element models (steady state, one copper temperature T for the whole path):
//   trace   R = ρ(T)·L / (w·t)                       rectangular conductor
//   plane   R = ρ(T)/t · L/W                         sheet resistance × squares;
//                                                    the current is assumed to
//                                                    spread over the full width
//   via     R = ρ(T)·L / (n·π·(ro² − ri²))           n barrels in parallel
//   fixed   R as given                               contact, fuse, ferrite DCR,
//                                                    MOSFET RDS(on), sense resistor
//   wire    R = ρ(T)·L / A                           A from the AWG gauge or given
// Every element carries the whole path current I:  ΔV = I·R,  P = I²·R.
// Totals: R = ΣR,  ΔV = I·R,  P = I²·R,  V(load) = V(source) − ΔV.
//
// Reused physics: copper.js (ρ(T) = ρ20·[1 + α·(T − 20 °C)]), via.js (barrel
// resistance and the IPC-2221 current capacity of a via), trace-width.js
// (IPC-2152 temperature rise of a trace, IPC-2221 rise for comparison),
// convert.js (AWG diameter and cross-section, ASTM B258).
//
// Checks: total drop against a budget (% of the supply), IPC-2152 temperature
// rise of a trace at the path current, current per via against its IPC-2221
// capacity, current against the rating of a fixed element.
//
// Not modelled: current crowding where a trace meets a via or a pad, uneven
// current sharing between parallel vias, contact resistance changing with wear
// and temperature, self-heating fed back into the resistivity, AC effects
// (skin effect, inductance, peak currents of a pulsed load).

import { copperResistivity } from './copper.js';
import { calculateVia } from './via.js';
import { calculateTraceWidth, ipc2221RiseC } from './trace-width.js';
import { awgWire, AWG_MIN, AWG_MAX } from './convert.js';
import { MM_PER_MIL } from './units.js';

export const ELEMENT_TYPES = ['trace', 'plane', 'via', 'fixed', 'wire'];

export const LIMITS = {
  maxElements: 20,
  budgetPct: 3, // default drop budget, % of the supply voltage
  riseNoteC: 10, // milder note above this IPC-2152 temperature rise of a trace
  riseWarnC: 20, // warning above this rise
  viaRiseC: 10, // temperature rise the IPC-2221 via capacity is worked out for
  tempMinC: -60, // range in which the linear ρ(T) model is used
  tempMaxC: 200,
  awgMin: AWG_MIN,
  awgMax: AWG_MAX,
};

const UM_PER_MIL = 25.4;
const fin = Number.isFinite;
const pos = (x) => fin(x) && x > 0;

/**
 * Resistance (Ω) of a straight copper conductor with a rectangular
 * cross-section (a trace): R = ρ(T)·L / (w·t).
 */
export function traceResistanceOhm(lengthMm, widthMm, thicknessUm, tempC = 20) {
  return (copperResistivity(tempC) * lengthMm * 1e-3) / (widthMm * 1e-3 * thicknessUm * 1e-6);
}

/** Sheet resistance (Ω per square) of a copper layer: Rs = ρ(T) / t. */
export function sheetResistanceOhm(thicknessUm, tempC = 20) {
  return copperResistivity(tempC) / (thicknessUm * 1e-6);
}

/** Resistance (Ω) of a copper wire of cross-section A: R = ρ(T)·L / A. */
export function wireResistanceOhm(lengthM, areaMm2, tempC = 20) {
  return (copperResistivity(tempC) * lengthM) / (areaMm2 * 1e-6);
}

/**
 * One element at the path current. Returns { fields } with the names of the
 * invalid inputs, or { result } with the resistance and the type's details.
 */
function solveElement(el, ctx) {
  const { currentA, tempC } = ctx;
  const fields = [];
  const need = (field, okay) => { if (!okay) fields.push(field); };

  switch (el.type) {
    case 'trace': {
      need('lengthMm', pos(el.lengthMm));
      need('widthMm', pos(el.widthMm));
      need('thicknessUm', pos(el.thicknessUm));
      if (fields.length) return { fields };
      const layer = el.layer === 'internal' ? 'internal' : 'external';
      const areaMm2 = el.widthMm * el.thicknessUm * 1e-3;
      // IPC-2152 baseline chart with the copper-thickness modifier; no board or
      // plane modifier (1.78 mm board, no plane near the trace).
      const ipc = calculateTraceWidth({
        standard: 'ipc2152', mode: 'rise', currentA,
        widthMil: el.widthMm / MM_PER_MIL, thicknessMil: el.thicknessUm / UM_PER_MIL,
      });
      const riseC = ipc.ok ? ipc.deltaTC : NaN;
      return {
        result: {
          resistanceOhm: traceResistanceOhm(el.lengthMm, el.widthMm, el.thicknessUm, tempC),
          lengthMm: el.lengthMm, widthMm: el.widthMm, thicknessUm: el.thicknessUm, layer,
          areaMm2,
          currentDensityAmm2: currentA / areaMm2,
          riseC,
          // The fit is checked for ≤ 26 A and 0.5–3 oz copper; outside that the rise is indicative only.
          riseFitOk: ipc.ok && !ipc.warnings.some((w) => w === 'ipc2152CurrentRange' || w === 'ipc2152CopperRange'),
          // The classic chart for the same cross-section; this is what the layer changes.
          riseIpc2221C: ipc.ok ? ipc2221RiseC(currentA, ipc.areaMil2, layer === 'external') : NaN,
        },
      };
    }
    case 'plane': {
      need('lengthMm', pos(el.lengthMm));
      need('widthMm', pos(el.widthMm));
      need('thicknessUm', pos(el.thicknessUm));
      if (fields.length) return { fields };
      const sheetOhm = sheetResistanceOhm(el.thicknessUm, tempC);
      const squares = el.lengthMm / el.widthMm;
      const areaMm2 = el.widthMm * el.thicknessUm * 1e-3;
      return {
        result: {
          resistanceOhm: sheetOhm * squares,
          lengthMm: el.lengthMm, widthMm: el.widthMm, thicknessUm: el.thicknessUm,
          sheetOhm, squares, areaMm2,
          currentDensityAmm2: currentA / areaMm2,
        },
      };
    }
    case 'via': {
      const count = el.count === undefined || el.count === null ? 1 : el.count;
      need('drillMm', pos(el.drillMm));
      need('platingUm', pos(el.platingUm));
      need('lengthMm', pos(el.lengthMm));
      need('count', Number.isInteger(count) && count >= 1);
      if (fields.length) return { fields };
      const v = calculateVia({
        drillMm: el.drillMm, lengthMm: el.lengthMm, platingUm: el.platingUm, count,
        currentA, tempC, deltaTC: LIMITS.viaRiseC,
      });
      if (!v.ok) return { fields: ['drillMm'] };
      return {
        result: {
          resistanceOhm: v.totalResistanceOhm,
          drillMm: el.drillMm, platingUm: el.platingUm, lengthMm: el.lengthMm, count,
          perViaOhm: v.resistanceOhm,
          areaMm2: v.areaMm2, // barrel cross-section of one via
          perViaA: v.perViaA,
          capacityA: v.capacityA, // per via, IPC-2221 external curve at LIMITS.viaRiseC
          loadPct: (v.perViaA / v.capacityA) * 100,
          neededCount: v.viasForCurrent,
        },
      };
    }
    case 'fixed': {
      const rated = el.ratedA === undefined || el.ratedA === null || Number.isNaN(el.ratedA) ? NaN : el.ratedA;
      need('resistanceOhm', fin(el.resistanceOhm) && el.resistanceOhm >= 0);
      need('ratedA', Number.isNaN(rated) || pos(rated));
      if (fields.length) return { fields };
      return {
        result: {
          resistanceOhm: el.resistanceOhm,
          ratedA: rated,
          loadPct: fin(rated) ? (currentA / rated) * 100 : NaN,
        },
      };
    }
    case 'wire': {
      const byGauge = el.awg !== undefined && el.awg !== null;
      need('lengthM', pos(el.lengthM));
      if (byGauge) need('awg', fin(el.awg) && el.awg >= AWG_MIN && el.awg <= AWG_MAX);
      else need('areaMm2', pos(el.areaMm2));
      if (fields.length) return { fields };
      const gauge = byGauge ? awgWire(el.awg) : null;
      const areaMm2 = gauge ? gauge.areaMm2 : el.areaMm2;
      return {
        result: {
          resistanceOhm: wireResistanceOhm(el.lengthM, areaMm2, tempC),
          lengthM: el.lengthM,
          awg: byGauge ? el.awg : NaN,
          areaMm2,
          diameterMm: gauge ? gauge.dMm : 2 * Math.sqrt(areaMm2 / Math.PI), // of a solid round conductor
          currentDensityAmm2: currentA / areaMm2,
        },
      };
    }
    default:
      return { unknown: true };
  }
}

/**
 * @param {object} path
 * @param {number} path.supplyV          voltage at the source (V)
 * @param {number} path.currentA         load current, the same through every element (A)
 * @param {number} [path.tempC]          temperature of all copper, for the resistivity (°C), default 25
 * @param {number} [path.budgetPct]      allowed total drop, % of the supply, default LIMITS.budgetPct
 * @param {object[]} path.elements       0 … LIMITS.maxElements elements in the order of the path; each
 *   { name?, type, ret? (true = on the return path), … } with, by type:
 *   trace  lengthMm, widthMm, thicknessUm, layer? ('external' | 'internal')
 *   plane  lengthMm (in the direction of the current), widthMm, thicknessUm
 *   via    drillMm (finished hole), platingUm, lengthMm (barrel), count? (in parallel, default 1)
 *   fixed  resistanceOhm, ratedA? (current rating)
 *   wire   lengthM and either awg (−3 = 4/0 … 40) or areaMm2
 *
 * @returns {object} { ok: false, errors, warnings: [] } with
 *   errors = [{ code: 'supply' | 'current' | 'temp' | 'budget' | 'count' | 'range' }
 *           | { code: 'type', index } | { code: 'field', index, field }
 *           | { code: 'collapse', dropV, supplyV, resistanceOhm, maxIndex, maxResistanceOhm }]
 *   ('collapse': the drop reaches the supply voltage, the load cannot draw this current), or
 *   { ok: true, errors: [],
 *     supplyV, currentA, tempC, budgetPct, resistivityOhmM,
 *     elements: [{ index, name, type, ret, resistanceOhm, dropV, lossW, sharePct (of the total drop),
 *                  flags: [warning codes of this element], … the inputs and details of the type:
 *                  trace  areaMm2, currentDensityAmm2, riseC (IPC-2152), riseFitOk, riseIpc2221C
 *                  plane  sheetOhm, squares, areaMm2, currentDensityAmm2
 *                  via    perViaOhm, areaMm2, perViaA, capacityA, loadPct, neededCount
 *                  fixed  ratedA (NaN = none), loadPct
 *                  wire   awg (NaN = given by area), areaMm2, diameterMm, currentDensityAmm2 }],
 *     totals: { resistanceOhm, dropV, dropPct, lossW, loadV, loadW, sourceW,
 *               budgetV, feedDropV, returnDropV, hasReturn, maxIndex (largest drop, null without one) },
 *     warnings: [{ code: 'budget', dropV, dropPct, budgetPct, budgetV, maxIndex }
 *              | { code: 'riseHigh' | 'riseNote', index, riseC, currentA }
 *              | { code: 'riseRange', index }
 *              | { code: 'viaOver', index, perViaA, capacityA, neededCount }
 *              | { code: 'fixedOver', index, currentA, ratedA }] }
 */
export function analyzePowerPath(path) {
  const supplyV = path?.supplyV;
  const currentA = path?.currentA;
  const tempC = path?.tempC === undefined || path?.tempC === null ? 25 : path.tempC;
  const budgetPct = path?.budgetPct === undefined || path?.budgetPct === null ? LIMITS.budgetPct : path.budgetPct;
  const list = Array.isArray(path?.elements) ? path.elements : [];
  const fail = (errors) => ({ ok: false, errors, warnings: [] });

  const errors = [];
  if (!pos(supplyV)) errors.push({ code: 'supply' });
  if (!pos(currentA)) errors.push({ code: 'current' });
  if (!fin(tempC) || tempC < LIMITS.tempMinC || tempC > LIMITS.tempMaxC) errors.push({ code: 'temp' });
  if (!pos(budgetPct) || budgetPct > 100) errors.push({ code: 'budget' });
  if (list.length > LIMITS.maxElements) errors.push({ code: 'count' });
  if (errors.length) return fail(errors);

  const ctx = { currentA, tempC };
  const elements = [];
  list.forEach((raw, index) => {
    const el = raw ?? {};
    const solved = ELEMENT_TYPES.includes(el.type) ? solveElement(el, ctx) : { unknown: true };
    if (solved.unknown) { errors.push({ code: 'type', index }); return; }
    if (solved.fields) { for (const field of solved.fields) errors.push({ code: 'field', index, field }); return; }
    const r = solved.result;
    elements.push({
      index,
      name: String(el.name ?? ''),
      type: el.type,
      ret: el.ret === true,
      ...r,
      dropV: currentA * r.resistanceOhm,
      lossW: currentA * currentA * r.resistanceOhm,
      sharePct: 0,
      flags: [],
    });
  });
  if (errors.length) return fail(errors);

  const resistanceOhm = elements.reduce((a, e) => a + e.resistanceOhm, 0);
  const dropV = currentA * resistanceOhm;
  const lossW = currentA * currentA * resistanceOhm;
  const sourceW = supplyV * currentA;
  if (![resistanceOhm, dropV, lossW, sourceW].every(fin)) return fail([{ code: 'range' }]);

  let maxIndex = null;
  for (const e of elements) {
    if (e.resistanceOhm > 0 && (maxIndex === null || e.resistanceOhm > elements[maxIndex].resistanceOhm)) maxIndex = e.index;
    e.sharePct = resistanceOhm > 0 ? (e.resistanceOhm / resistanceOhm) * 100 : 0;
  }
  // A load that draws this current cannot be fed through more drop than there is voltage.
  if (dropV >= supplyV) {
    return fail([{ code: 'collapse', dropV, supplyV, resistanceOhm, maxIndex, maxResistanceOhm: elements[maxIndex].resistanceOhm }]);
  }

  const returnDropV = elements.reduce((a, e) => a + (e.ret ? e.dropV : 0), 0);
  const dropPct = (dropV / supplyV) * 100;
  const budgetV = (supplyV * budgetPct) / 100;
  const loadV = supplyV - dropV;

  const warnings = [];
  const warn = (e, w) => { warnings.push({ ...w, index: e.index }); e.flags.push(w.code); };
  if (dropPct > budgetPct) warnings.push({ code: 'budget', dropV, dropPct, budgetPct, budgetV, maxIndex });
  for (const e of elements) {
    if (e.type === 'trace') {
      if (e.riseC > LIMITS.riseWarnC) warn(e, { code: 'riseHigh', riseC: e.riseC, currentA });
      else if (e.riseC > LIMITS.riseNoteC) warn(e, { code: 'riseNote', riseC: e.riseC, currentA });
      if (!e.riseFitOk) warn(e, { code: 'riseRange' });
    } else if (e.type === 'via') {
      if (e.perViaA > e.capacityA) warn(e, { code: 'viaOver', perViaA: e.perViaA, capacityA: e.capacityA, neededCount: e.neededCount });
    } else if (e.type === 'fixed') {
      if (currentA > e.ratedA) warn(e, { code: 'fixedOver', currentA, ratedA: e.ratedA });
    }
  }

  return {
    ok: true,
    errors: [],
    warnings,
    supplyV, currentA, tempC, budgetPct,
    resistivityOhmM: copperResistivity(tempC),
    elements,
    totals: {
      resistanceOhm, dropV, dropPct, lossW,
      loadV,
      loadW: loadV * currentA,
      sourceW,
      budgetV,
      feedDropV: dropV - returnDropV,
      returnDropV,
      hasReturn: elements.some((e) => e.ret),
      maxIndex,
    },
  };
}
