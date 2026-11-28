// Cable voltage drop: resistance, voltage drop and power loss of a cable at
// DC, and the smallest conductor that keeps the drop inside a budget. (With AC
// the reactance of the cable, the power factor of the load and, for thick
// conductors, the skin effect add to this; none of them is modelled.)
//
//   Path length      l = 2·L  (out and back in the same cable)      l = L  (one conductor only)
//   Resistivity      ρ(T) = ρ20 · (1 + α · (T − 20 °C))
//   Resistance       R = ρ(T) · l / (n · A)              n conductors of cross-section A in parallel per pole
//   Voltage drop     ΔV = I · R          at the load  V_L = V − ΔV
//   Power lost       P = I² · R          as a share of the delivered power  P / (V_L · I)
//   Current density  J = I / (n · A)
//   Sizing           A_min = ρ(T) · l · I / (n · ΔV_max),   ΔV_max = p · V
//                    then the next standard cross-section (mm²) and the next AWG size at or above it
//   AWG              d = 0.127 mm · 92^((36 − g)/39),  A = π·d²/4      (ASTM B258; convert.js)
//
// Constants: copper 1.724·10⁻⁸ Ω·m and 0.00393 /K at 20 °C (annealed copper,
// IEC 60028; copper.js). Aluminium 2.82·10⁻⁸ Ω·m and 0.0039 /K, the usual
// handbook values. The allowable current of a cable is NOT calculated here: it
// depends on insulation, bundling and ambient temperature and comes from the
// cable datasheet or the installation standard. The current density is given
// for information, with a rough flag above 10 A/mm².

import { RHO_20, ALPHA } from './copper.js';
import { awgWire, awgName, AWG_MIN, AWG_MAX } from './convert.js';

/** Resistivity at 20 °C (Ω·m) and its temperature coefficient at 20 °C (1/K). */
export const MATERIALS = {
  cu: { rho20: RHO_20, alpha: ALPHA },
  al: { rho20: 2.82e-8, alpha: 0.0039 },
};
/** Standard metric cross-sections (mm²) offered by the sizing. */
export const METRIC_MM2 = [0.05, 0.08, 0.14, 0.25, 0.34, 0.5, 0.75, 1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120];
/** AWG sizes offered, thinnest first: 30 … 2 (even), 1, and 1/0 … 4/0 (0 … −3). */
export const AWG_SIZES = [30, 28, 26, 24, 22, 20, 18, 16, 14, 12, 10, 8, 6, 4, 2, 1, 0, -1, -2, -3];
/** Current density above which a neutral caution is shown (A/mm²): a rough flag, not a rating. */
export const DENSITY_FLAG = 10;
/** Conductor temperatures accepted (°C); the linear ρ(T) is not meant for more. */
export const T_MIN = -100;
export const T_MAX = 300;
export const SOLVES = ['drop', 'size'];
export const CIRCUITS = ['loop', 'single'];
export const SIZE_BY = ['area', 'awg'];

const TOL = 1e-9; // a size that meets the requirement exactly must not fail on rounding noise
const fin = Number.isFinite;
const pos = (x) => typeof x === 'number' && fin(x) && x > 0;
const given = (x) => x !== undefined && x !== null && !(typeof x === 'number' && Number.isNaN(x));

/** ρ(T) = ρ20 · (1 + α · (T − 20 °C)) for 'cu' or 'al' (Ω·m). */
export function resistivity(material, tempC = 20) {
  const m = MATERIALS[material];
  return m.rho20 * (1 + m.alpha * (tempC - 20));
}

/** Smallest standard metric cross-section (mm²) that is at least `areaMm2`; null above the largest. */
export function nextMetric(areaMm2) {
  return METRIC_MM2.find((a) => a >= areaMm2 * (1 - TOL)) ?? null;
}

/** Thinnest AWG size offered whose cross-section is at least `areaMm2`; null above 4/0. */
export function nextAwg(areaMm2) {
  const n = AWG_SIZES.find((g) => awgWire(g).areaMm2 >= areaMm2 * (1 - TOL));
  return n === undefined ? null : n;
}

/** True when every number in a (nested) result is finite; null marks "not applicable". */
function allFinite(x) {
  if (typeof x === 'number') return fin(x);
  if (x && typeof x === 'object') return Object.values(x).every(allFinite);
  return true;
}

/**
 * The calculator.
 * @param {object} p
 * @param {'drop'|'size'} p.solve          drop of a given conductor, or the smallest conductor for a budget
 * @param {number} p.currentA              load current (A)
 * @param {number} p.supplyV               supply voltage at the source (V)
 * @param {number} p.lengthM               cable length one way (m)
 * @param {'loop'|'single'} [p.circuit]    out and back in the same cable (default), or one conductor only
 * @param {'area'|'awg'} [p.by]            how the conductor is given (solve = drop)
 * @param {number} [p.areaMm2]             cross-section of one conductor (mm²)
 * @param {number} [p.awg]                 AWG number, −3 (4/0) … 40
 * @param {number} [p.parallel]            conductors in parallel per pole (default 1)
 * @param {'cu'|'al'} [p.material]         conductor material (default copper)
 * @param {number} [p.tempC]               conductor temperature (°C), default 20
 * @param {number} p.allowedPct            allowed voltage drop in percent of the supply voltage
 * @returns {{ok: false, errors: string[]} | object} errors and warnings are message keys.
 */
export function cable(p) {
  const fail = (...errors) => ({ ok: false, errors });
  if (!p || !SOLVES.includes(p.solve)) return fail('cab_positive');
  const solve = p.solve;
  const circuit = p.circuit ?? 'loop';
  const material = p.material ?? 'cu';
  if (!CIRCUITS.includes(circuit) || !Object.keys(MATERIALS).includes(material)) return fail('cab_positive');
  const { currentA, supplyV, lengthM } = p;
  if (!pos(currentA) || !pos(supplyV) || !pos(lengthM)) return fail('cab_positive');
  const parallel = given(p.parallel) ? p.parallel : 1;
  if (!(pos(parallel) && Number.isInteger(parallel))) return fail('cab_positive');
  const tempC = given(p.tempC) ? p.tempC : 20;
  if (!(typeof tempC === 'number' && tempC >= T_MIN && tempC <= T_MAX)) return fail('cab_temp');
  if (!(pos(p.allowedPct) && p.allowedPct <= 100)) return fail('cab_pct');

  const { rho20, alpha } = MATERIALS[material];
  const rhoT = resistivity(material, tempC);
  const pathFactor = circuit === 'loop' ? 2 : 1;
  const pathM = pathFactor * lengthM;
  const allowedFrac = p.allowedPct / 100;
  const allowedV = allowedFrac * supplyV;

  // One conductor size: resistance of the whole path, drop, loss, density.
  const evaluate = (areaMm2) => {
    const totalAreaMm2 = parallel * areaMm2;
    const resistanceOhm = (rhoT * pathM) / (totalAreaMm2 * 1e-6);
    const dropV = currentA * resistanceOhm;
    const loadV = supplyV - dropV;
    const lossW = currentA * currentA * resistanceOhm;
    const aboveSupply = !(loadV > 0);
    return {
      areaMm2, totalAreaMm2, resistanceOhm,
      dropV, dropFrac: dropV / supplyV, loadV,
      lossW, loadW: aboveSupply ? null : loadV * currentA, lossFrac: aboveSupply ? null : lossW / (loadV * currentA),
      densityAmm2: currentA / totalAreaMm2,
      withinBudget: dropV <= allowedV * (1 + TOL), aboveSupply,
    };
  };

  // Sizing (also shown next to a given conductor): the smallest cross-section
  // per conductor for the allowed drop, and the standard sizes at or above it.
  const minTotalAreaMm2 = ((rhoT * pathM * currentA) / allowedV) * 1e6;
  const minAreaMm2 = minTotalAreaMm2 / parallel;
  const stdMm2 = nextMetric(minAreaMm2);
  const stdAwg = nextAwg(minAreaMm2);
  const metric = stdMm2 === null ? null : { by: 'area', awg: null, name: null, diameterMm: null, ...evaluate(stdMm2) };
  const gaugeOf = (n) => {
    const w = awgWire(n);
    return { by: 'awg', awg: n, name: awgName(n), diameterMm: w.dMm, ...evaluate(w.areaMm2) };
  };
  const gauge = stdAwg === null ? null : gaugeOf(stdAwg);

  // The conductor the headline values are for: the one given, or the standard metric size found.
  let wire;
  if (solve === 'drop') {
    const by = p.by ?? 'area';
    if (!SIZE_BY.includes(by)) return fail('cab_positive');
    if (by === 'awg') {
      if (!(Number.isInteger(p.awg) && p.awg >= AWG_MIN && p.awg <= AWG_MAX)) return fail('cab_awg');
      wire = gaugeOf(p.awg);
    } else {
      if (!pos(p.areaMm2)) return fail('cab_positive');
      wire = { by: 'area', awg: null, name: null, diameterMm: null, ...evaluate(p.areaMm2) };
    }
  } else {
    wire = metric;
  }

  const warnings = [];
  if (solve === 'size' && !metric) warnings.push('cab_noStd');
  if (wire) {
    if (wire.aboveSupply) warnings.push('cab_aboveSupply');
    else if (!wire.withinBudget) warnings.push('cab_over');
    if (wire.densityAmm2 > DENSITY_FLAG) warnings.push('cab_density');
  }

  const r = {
    ok: true,
    solve, circuit, material,
    currentA, supplyV, lengthM, pathFactor, pathM,
    parallel, tempC, rho20, alpha, rhoT,
    allowedFrac, allowedV,
    minAreaMm2, minTotalAreaMm2, metric, gauge,
    wire,
    warnings,
  };
  return allFinite(r) && rhoT > 0 && minAreaMm2 > 0 && (!wire || wire.resistanceOhm > 0) ? r : fail('cab_range');
}
