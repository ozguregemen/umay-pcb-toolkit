// Protection part selection: the parts between the outside world and the
// circuit, checked against the numbers of their datasheets. Plain arithmetic
// on datasheet values: a cross-check, not a qualification. The real behaviour
// comes from the curves of the part and from testing.
//
// TVS / ESD diode — a straight line through the breakdown voltage and one
// datasheet clamp point (I_PP, V_C):
//   R_dyn   = (V_C − V_BR) / I_PP
//   V_cl(I) = V_BR + R_dyn·I
// ESD, IEC 61000-4-2 contact discharge. The generator (150 pF / 330 Ω) is
// specified by its current waveform: first peak 3.75 A per kV, 2 A per kV at
// 30 ns, 1 A per kV at 60 ns, rise time 0.8 ns (8 kV: 30 A, 16 A, 8 A).
//   ΔV_L ≈ L·I_pk / t_r        overshoot of the TVS connection inductance (estimate)
// Surge, IEC 61000-4-5 combination wave (1.2/50 µs open-circuit voltage,
// 8/20 µs short-circuit current) behind its source impedance Z_s: 2 Ω (power,
// line to line), 12 Ω (power, line to earth), 42 Ω (unshielded unsymmetrical
// data and signal lines). V_OC = Z_s·I + V_BR + R_dyn·I gives
//   I_pk = (V_OC − V_BR) / (Z_s + R_dyn)
// Shunt capacitance C on a line matched to Z_0 at both ends: C sees Z_0 ∥ Z_0,
//   f_−3dB = 1 / (2π·(Z_0/2)·C) = 1 / (π·Z_0·C)
//
// Fuse (selection rule and pulse factors as in the Littelfuse "Fuseology"
// selection guide):
//   I_n,min = I_op / (k_d·K_t)       k_d steady-state derating, K_t temperature re-rating
//   pulse I²t: rectangle I_p²·t, triangle or sawtooth I_p²·t/3, half sine
//   I_p²·t/2, exponential decay I_p²·τ/2
//   I²t_req = I²t_pulse / F_p        F_p pulse factor for the number of pulses
//
// Resettable fuse (polymer PTC):
//   I_hold(T) = I_hold·k_T, I_trip(T) = I_trip·k_T
//   V_drop = I_op·R_1max, P = I_op²·R_1max, I_tripped ≈ P_d / V
//
// Reverse-polarity protection, series Schottky against a P-channel MOSFET in
// the positive line (drain at the input, source at the load, gate to ground
// through R_G, zener from gate to source):
//   diode   P = V_F·I               MOSFET  P = I²·R_DS(on)
//   T_j = T_a + P·R_θJA             |V_GS| = min(V_in, V_Z)      I_Z = (V_in − V_Z) / R_G

/** IEC 61000-4-2 contact discharge: current per kV of test level (A/kV) and rise time (s). */
export const ESD_PEAK_A_PER_KV = 3.75;
export const ESD_30NS_A_PER_KV = 2;
export const ESD_60NS_A_PER_KV = 1;
export const ESD_RISE_S = 0.8e-9;

/** IEC 61000-4-5 source impedances (Ω): generator 2 Ω, plus 10 Ω or 40 Ω in the coupling network. */
export const SURGE_SOURCE_OHM = [2, 12, 42];

/** ∫i²dt of one pulse = k·I_p²·t (t: duration; for 'exp' the time constant). */
export const PULSE_SHAPE_K = { rect: 1, tri: 1 / 3, sine: 1 / 2, exp: 1 / 2 };

/**
 * Share of the nominal melting I²t one pulse may use, by the number of pulses
 * over the life of the product. Typical manufacturer guidance (Littelfuse
 * "Fuseology"); the datasheet of the fuse may give its own curve.
 */
export const PULSE_FACTOR = { 100000: 0.22, 10000: 0.29, 1000: 0.38, 100: 0.48 };

/** Rule of thumb: the fault current should be at least this many times the fuse rating. */
export const FUSE_OPEN_RATIO = 2;

const pos = (x) => typeof x === 'number' && Number.isFinite(x) && x > 0;
const nonneg = (x) => typeof x === 'number' && Number.isFinite(x) && x >= 0;
const fail = (...errors) => ({ ok: false, errors });
// a ≤ b with a little room for rounding, so a value exactly on its limit passes.
const le = (a, b) => a <= b + 1e-9 * Math.max(Math.abs(a), Math.abs(b));
const worst = (checks) => Object.values(checks);
const allFinite = (...xs) => xs.every((x) => Number.isFinite(x));

/** Current of an IEC 61000-4-2 contact discharge at a test level in kV. */
export function esdCurrents(kv) {
  return {
    iPeak: ESD_PEAK_A_PER_KV * kv,
    i30: ESD_30NS_A_PER_KV * kv,
    i60: ESD_60NS_A_PER_KV * kv,
    riseS: ESD_RISE_S,
  };
}

/** −3 dB corner (Hz) of a shunt capacitance (F) on a line matched to z0 (Ω) at both ends. */
export const shuntCapCorner = (z0, c) => 1 / (Math.PI * z0 * c);

/**
 * TVS or ESD diode against one event.
 * @param {object} p
 * @param {number} p.vLine   highest normal line voltage (V)
 * @param {number} p.vAbs    absolute-maximum voltage of the protected pin (V)
 * @param {number} p.vRwm    stand-off voltage (V)
 * @param {number} p.vBr     breakdown voltage (V)
 * @param {number} p.vC      clamp voltage at iPp (V)
 * @param {number} p.iPp     peak pulse current of that datasheet point (A)
 * @param {'esd'|'surge'|'custom'} p.event
 * @param {number} [p.esdKv]        esd: contact-discharge test level (kV)
 * @param {number} [p.esdRatingKv]  esd, optional: contact rating of the TVS itself (kV)
 * @param {number} [p.lNh]          esd, optional: inductance of the TVS connection (nH)
 * @param {number} [p.vOc]          surge: open-circuit voltage (V)
 * @param {number} [p.zS]           surge: source impedance (Ω)
 * @param {number} [p.iPk]          custom: peak current through the TVS (A)
 * @param {number} [p.cPf]          optional: TVS capacitance (pF)
 * @param {number} [p.z0]           line impedance for the capacitance check (Ω)
 * @param {number} [p.bwHz]         optional: signal bandwidth to compare the corner with (Hz)
 *
 * checks: id → 'ok' | 'warn' | 'bad' (only the ones that apply):
 *   rwm (V_RWM ≥ V_line), clamp (V_cl at the peak ≤ V_abs), clamp30 (esd: at 30 ns),
 *   ipp (peak current ≤ I_PP; a rating check for a surge, a warning for a custom current),
 *   esdr (esd: rating of the TVS ≥ test level), cap (corner ≥ bandwidth, a warning).
 */
export function tvsCheck(p) {
  if (![p.vLine, p.vAbs, p.vRwm, p.vBr, p.vC, p.iPp].every(pos)) return fail('pr_positive');
  const eventOk = p.event === 'esd' ? pos(p.esdKv)
    : p.event === 'surge' ? pos(p.vOc) && pos(p.zS)
      : p.event === 'custom' ? pos(p.iPk) : false;
  if (!eventOk) return fail('pr_positive');
  if (!(p.vC > p.vBr)) return fail('pr_vcLow');

  const rDyn = (p.vC - p.vBr) / p.iPp;
  const clampAt = (i) => p.vBr + rDyn * i;
  const checks = {};
  const warnings = [];
  const r = {
    ok: true, mode: 'tvs', event: p.event,
    vLine: p.vLine, vAbs: p.vAbs, vRwm: p.vRwm, vBr: p.vBr, vC: p.vC, iPp: p.iPp,
    rDyn,
  };

  if (p.event === 'esd') {
    const w = esdCurrents(p.esdKv);
    const lNh = pos(p.lNh) ? p.lNh : 0;
    Object.assign(r, {
      esdKv: p.esdKv, iPk: w.iPeak, i30: w.i30, i60: w.i60, riseS: w.riseS,
      vClamp: clampAt(w.iPeak), vClamp30: clampAt(w.i30), vClamp60: clampAt(w.i60),
      lNh, dvL: (lNh * 1e-9 * w.iPeak) / w.riseS,
    });
    r.vFirst = r.vClamp + r.dvL; // at the line during the rise, with the inductive overshoot
    r.margin30 = p.vAbs - r.vClamp30;
    checks.clamp30 = le(r.vClamp30, p.vAbs) ? 'ok' : 'bad';
    if (pos(p.esdRatingKv)) {
      r.esdRatingKv = p.esdRatingKv;
      checks.esdr = le(p.esdKv, p.esdRatingKv) ? 'ok' : 'bad';
    }
  } else if (p.event === 'surge') {
    const conducts = p.vOc > p.vBr;
    const iPk = conducts ? (p.vOc - p.vBr) / (p.zS + rDyn) : 0;
    Object.assign(r, {
      vOc: p.vOc, zS: p.zS, conducts, iPk,
      iShort: p.vOc / p.zS, // generator into a short circuit, for comparison
      // Below V_BR the TVS stays off and the line sees the open-circuit voltage.
      vClamp: conducts ? clampAt(iPk) : p.vOc,
    });
    r.pPk = r.vClamp * iPk;
    r.ippUse = iPk / p.iPp;
    checks.ipp = le(iPk, p.iPp) ? 'ok' : 'bad';
  } else {
    Object.assign(r, { iPk: p.iPk, vClamp: clampAt(p.iPk) });
    r.pPk = r.vClamp * p.iPk;
    r.ippUse = p.iPk / p.iPp;
    // Only a rating check when the waveform is the one of the rating: a warning here.
    checks.ipp = le(p.iPk, p.iPp) ? 'ok' : 'warn';
  }

  r.margin = p.vAbs - r.vClamp;
  checks.clamp = le(r.vClamp, p.vAbs) ? 'ok' : 'bad';
  r.rwmMargin = p.vRwm - p.vLine;
  checks.rwm = le(p.vLine, p.vRwm) ? 'ok' : 'bad';
  if (!(p.vBr > p.vRwm)) warnings.push('pr_vbrLow'); // a datasheet never has V_BR ≤ V_RWM

  r.cap = null;
  if (pos(p.cPf) && pos(p.z0)) {
    const fcHz = shuntCapCorner(p.z0, p.cPf * 1e-12);
    r.cap = { cPf: p.cPf, z0: p.z0, fcHz, bwHz: null, ratio: null };
    if (pos(p.bwHz)) {
      r.cap.bwHz = p.bwHz;
      r.cap.ratio = fcHz / p.bwHz;
      checks.cap = le(p.bwHz, fcHz) ? 'ok' : 'warn';
    }
  }

  if (!allFinite(rDyn, r.iPk, r.vClamp, r.margin, r.rwmMargin, r.vFirst ?? 0, r.pPk ?? 0, r.cap?.fcHz ?? 0, r.cap?.ratio ?? 0)) return fail('pr_range');
  r.checks = checks;
  r.warnings = warnings;
  r.clampOk = checks.clamp === 'ok' && (checks.clamp30 ?? 'ok') === 'ok';
  r.pass = !worst(checks).includes('bad');
  return r;
}

/** ∫i²dt (A²s) of one pulse: peak iPeak (A), duration t (s; time constant for 'exp'). */
export function pulseI2t(shape, iPeak, t) {
  return Object.hasOwn(PULSE_SHAPE_K, shape) ? PULSE_SHAPE_K[shape] * iPeak * iPeak * t : NaN;
}

/** Fault current: entered directly, or the circuit voltage over the loop resistance. */
function faultCurrent(p) {
  if (p.faultFromR) return pos(p.rLoop) && pos(p.vCircuit) ? p.vCircuit / p.rLoop : NaN;
  return p.iFault;
}

/**
 * One-time fuse: the smallest rating for the operating current, and a
 * candidate checked against it, the inrush pulse, the circuit voltage and the
 * fault current.
 * @param {object} p
 * @param {number} p.iOp          operating current (A)
 * @param {number} p.derate       steady-state derating as a fraction (0.75 = 75 %)
 * @param {number} p.kT           temperature re-rating factor from the datasheet curve
 * @param {number} p.iN           rated current of the candidate (A)
 * @param {number} p.i2tMelt      its nominal melting I²t (A²s)
 * @param {number} p.vRated       its voltage rating (V)
 * @param {number} p.iBreak       its breaking capacity (A)
 * @param {number} p.vCircuit     circuit voltage (V)
 * @param {boolean} [p.faultFromR] true: fault current = vCircuit / rLoop
 * @param {number} [p.iFault]     available fault current (A)
 * @param {number} [p.rLoop]      source + loop resistance (Ω)
 * @param {string} [p.shape]      pulse shape: rect | tri | sine | exp
 * @param {number} [p.iPulse]     pulse peak (A); 0 or absent: no inrush pulse
 * @param {number} [p.tPulse]     pulse duration, or time constant for 'exp' (s)
 * @param {number} [p.pulses]     pulses over the product life: 100000 | 10000 | 1000 | 100 (PULSE_FACTOR)
 * @param {number} [p.pulseFactor] own share of the melting I²t one pulse may use (0.22 = 22 %); replaces p.pulses
 *
 * checks: rate (I_n ≥ I_n,min), i2t (melting I²t ≥ required; absent without a pulse),
 * volt (rating ≥ circuit voltage), brk (breaking capacity ≥ fault current),
 * opens (fault current ≥ 2·I_n: 'warn' below, 'bad' at or below I_n).
 */
export function fuseCheck(p) {
  if (![p.iOp, p.derate, p.kT, p.iN, p.i2tMelt, p.vRated, p.iBreak, p.vCircuit].every(pos)) return fail('pr_positive');
  if (p.derate > 1) return fail('pr_positive');
  const iFault = faultCurrent(p);
  if (!pos(iFault)) return fail('pr_positive');
  const hasPulse = pos(p.iPulse);
  if (!hasPulse && p.iPulse !== undefined && !nonneg(p.iPulse)) return fail('pr_positive');
  const ownFactor = p.pulseFactor !== undefined && p.pulseFactor !== null;
  const pulses = !ownFactor && Object.hasOwn(PULSE_FACTOR, String(p.pulses)) ? Number(p.pulses) : null;
  const pulseFactor = ownFactor ? p.pulseFactor : pulses ? PULSE_FACTOR[pulses] : NaN;
  if (hasPulse && !(pos(p.tPulse) && pos(pulseFactor) && pulseFactor <= 1 && Object.hasOwn(PULSE_SHAPE_K, p.shape))) return fail('pr_positive');

  const iNMin = p.iOp / (p.derate * p.kT);
  const checks = {};
  const r = {
    ok: true, mode: 'fuse',
    iOp: p.iOp, derate: p.derate, kT: p.kT, iN: p.iN, i2tMelt: p.i2tMelt, vRated: p.vRated, iBreak: p.iBreak,
    vCircuit: p.vCircuit, faultFromR: !!p.faultFromR, rLoop: p.faultFromR ? p.rLoop : null, iFault,
    iNMin,
    load: p.iOp / p.iN, // share of the rating in use …
    loadLimit: p.derate * p.kT, // … and the share allowed
    hasPulse,
    faultRatio: iFault / p.iN,
    openRatio: FUSE_OPEN_RATIO,
  };
  checks.rate = le(iNMin, p.iN) ? 'ok' : 'bad';
  if (hasPulse) {
    r.shape = p.shape;
    r.shapeK = PULSE_SHAPE_K[p.shape];
    r.iPulse = p.iPulse;
    r.tPulse = p.tPulse;
    r.pulses = pulses; // null with an own factor
    r.pulseFactor = pulseFactor;
    r.i2tPulse = pulseI2t(p.shape, p.iPulse, p.tPulse);
    r.i2tReq = r.i2tPulse / pulseFactor;
    r.pulseUse = r.i2tPulse / p.i2tMelt;
    checks.i2t = le(r.i2tReq, p.i2tMelt) ? 'ok' : 'bad';
  }
  checks.volt = le(p.vCircuit, p.vRated) ? 'ok' : 'bad';
  checks.brk = le(iFault, p.iBreak) ? 'ok' : 'bad';
  checks.opens = le(FUSE_OPEN_RATIO * p.iN, iFault) ? 'ok' : iFault > p.iN ? 'warn' : 'bad';

  if (!allFinite(iNMin, r.load, r.faultRatio, r.i2tPulse ?? 0, r.i2tReq ?? 0, r.pulseUse ?? 0)) return fail('pr_range');
  const all = worst(checks);
  r.checks = checks;
  r.total = all.length;
  r.failed = all.filter((s) => s === 'bad').length;
  r.warned = all.filter((s) => s === 'warn').length;
  r.pass = r.failed === 0;
  r.warnings = [];
  return r;
}

/**
 * Resettable fuse (polymer PTC).
 * @param {object} p
 * @param {number} p.iOp       operating current (A)
 * @param {number} p.kTemp     thermal derating of the hold current at the ambient temperature, as a fraction
 * @param {number} p.iHold     hold current at 25 °C (A)
 * @param {number} p.iTrip     trip current at 25 °C (A)
 * @param {number} p.vMax      maximum voltage (V)
 * @param {number} p.iMax      maximum fault current (A)
 * @param {number} p.vCircuit  circuit voltage (V)
 * @param {boolean} [p.faultFromR], p.iFault, p.rLoop   as for the fuse
 * @param {number} p.r1Max     maximum resistance after trip or reflow (Ω)
 * @param {number} p.pD        power dissipation in the tripped state (W)
 *
 * checks: hold (I_hold(T) ≥ I_op), trip (fault current > I_trip(T)),
 * imax (fault current ≤ I_max), vmax (circuit voltage ≤ V_max).
 * zone: where the operating current (opZone) and the fault current (faultZone)
 * lie: 'hold' (at or below I_hold(T)), 'band' (may or may not trip), 'trip'.
 */
export function ptcCheck(p) {
  if (![p.iOp, p.kTemp, p.iHold, p.iTrip, p.vMax, p.iMax, p.vCircuit, p.r1Max, p.pD].every(pos)) return fail('pr_positive');
  const iFault = faultCurrent(p);
  if (!pos(iFault)) return fail('pr_positive');
  if (!(p.iTrip > p.iHold)) return fail('pr_tripLow');

  const iHoldT = p.iHold * p.kTemp;
  const iTripT = p.iTrip * p.kTemp;
  const zone = (i) => (le(i, iHoldT) ? 'hold' : i > iTripT ? 'trip' : 'band');
  const vDrop = p.iOp * p.r1Max;
  const r = {
    ok: true, mode: 'ptc',
    iOp: p.iOp, kTemp: p.kTemp, iHold: p.iHold, iTrip: p.iTrip, vMax: p.vMax, iMax: p.iMax,
    vCircuit: p.vCircuit, faultFromR: !!p.faultFromR, rLoop: p.faultFromR ? p.rLoop : null, iFault,
    r1Max: p.r1Max, pD: p.pD,
    iHoldT, iTripT,
    holdUse: p.iOp / iHoldT,
    holdMargin: iHoldT / p.iOp - 1, // > 0: room above the operating current
    tripRatio: iFault / iTripT,
    opZone: zone(p.iOp),
    faultZone: zone(iFault),
    vDrop,
    vDropShare: vDrop / p.vCircuit,
    pLoss: p.iOp * p.iOp * p.r1Max,
    iTripped: p.pD / p.vCircuit,
  };
  const checks = {
    hold: r.opZone === 'hold' ? 'ok' : 'bad',
    trip: r.faultZone === 'trip' ? 'ok' : 'bad',
    imax: le(iFault, p.iMax) ? 'ok' : 'bad',
    vmax: le(p.vCircuit, p.vMax) ? 'ok' : 'bad',
  };
  if (!allFinite(iHoldT, iTripT, r.holdUse, r.tripRatio, vDrop, r.pLoss, r.iTripped)) return fail('pr_range');
  r.checks = checks;
  r.pass = !worst(checks).includes('bad');
  r.warnings = [];
  return r;
}

/**
 * Reverse-polarity protection: a series Schottky diode against a P-channel
 * MOSFET in the positive line, at the same load current.
 * @param {object} p
 * @param {number} p.vIn         supply voltage, maximum (V)
 * @param {number} p.iLoad       load current (A)
 * @param {number} p.vF          diode forward voltage at that current (V)
 * @param {number} p.thetaDiode  diode junction-to-ambient thermal resistance (°C/W)
 * @param {number} p.rDsOn       MOSFET R_DS(on) at the available gate drive (Ω)
 * @param {number} p.vGsRds      |V_GS| at which that R_DS(on) is specified (V)
 * @param {number} p.vGsTh       |V_GS(th)|, maximum (V)
 * @param {number} p.vGsMax      |V_GS|, absolute maximum (V)
 * @param {number} p.thetaFet    MOSFET junction-to-ambient thermal resistance (°C/W)
 * @param {number} p.ambientC    ambient temperature (°C)
 * @param {number} p.tjMaxC      allowed junction temperature (°C)
 * @param {boolean} [p.zener]    a zener clamps gate to source
 * @param {number} [p.vZ]        its voltage (V)
 * @param {number} [p.rGate]     resistor from gate to ground (Ω)
 *
 * checks: drive (gate drive ≥ vGsRds: 'ok'; above the threshold only: 'warn',
 * the R_DS(on) value does not apply; at or below the threshold: 'bad'),
 * vgs (|V_GS| = min(V_in, V_Z) ≤ |V_GS|max; without a zener a clamp is then required),
 * tjd, tjm (junction temperatures ≤ tjMaxC).
 */
export function reversePolarity(p) {
  if (![p.vIn, p.iLoad, p.vF, p.thetaDiode, p.rDsOn, p.vGsRds, p.vGsTh, p.vGsMax, p.thetaFet].every(pos)) return fail('pr_positive');
  if (!Number.isFinite(p.ambientC) || !Number.isFinite(p.tjMaxC)) return fail('pr_positive');
  const zener = !!p.zener;
  if (zener && !(pos(p.vZ) && pos(p.rGate))) return fail('pr_positive');
  const pIn = p.vIn * p.iLoad;
  const part = (vDrop) => {
    const loss = vDrop * p.iLoad;
    return { vDrop, p: loss, share: loss / pIn, vOut: p.vIn - vDrop };
  };
  const diode = part(p.vF);
  const fet = part(p.iLoad * p.rDsOn);
  if (!(diode.vOut > 0) || !(fet.vOut > 0)) return fail('pr_dropHigh');
  diode.tj = p.ambientC + diode.p * p.thetaDiode;
  fet.tj = p.ambientC + fet.p * p.thetaFet;

  const zenerActive = zener && p.vIn > p.vZ;
  const vGs = zener ? Math.min(p.vIn, p.vZ) : p.vIn;
  const checks = {
    drive: le(p.vGsRds, vGs) ? 'ok' : vGs > p.vGsTh ? 'warn' : 'bad',
    vgs: le(vGs, p.vGsMax) ? 'ok' : 'bad',
    tjd: le(diode.tj, p.tjMaxC) ? 'ok' : 'bad',
    tjm: le(fet.tj, p.tjMaxC) ? 'ok' : 'bad',
  };
  const r = {
    ok: true, mode: 'rev',
    vIn: p.vIn, iLoad: p.iLoad, vF: p.vF, thetaDiode: p.thetaDiode,
    rDsOn: p.rDsOn, vGsRds: p.vGsRds, vGsTh: p.vGsTh, vGsMax: p.vGsMax, thetaFet: p.thetaFet,
    ambientC: p.ambientC, tjMaxC: p.tjMaxC,
    zener, vZ: zener ? p.vZ : null, rGate: zener ? p.rGate : null,
    pIn, diode, fet,
    vGs,
    zenerActive,
    zenerNeeded: !le(p.vIn, p.vGsMax), // the supply alone would exceed the gate rating
    iZ: zenerActive ? (p.vIn - p.vZ) / p.rGate : 0,
    saved: diode.p - fet.p, // > 0: the MOSFET loses less
    savedShare: (diode.p - fet.p) / diode.p,
  };
  if (!allFinite(pIn, diode.p, diode.tj, fet.p, fet.tj, r.iZ, r.saved)) return fail('pr_range');
  r.checks = checks;
  r.fetOk = !['drive', 'vgs', 'tjm'].some((k) => checks[k] === 'bad');
  r.diodeOk = checks.tjd !== 'bad';
  r.pass = r.fetOk;
  r.warnings = [];
  return r;
}
