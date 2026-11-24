// Capacitor inrush current and the ways to limit it.
//
// Hot plug: a voltage step V into the load capacitance C through the series
// resistance (source + wiring + ESR) and, optionally, the cable inductance —
// a series RLC step response. With inductance the capacitor voltage can
// overshoot towards 2·V (Linear Technology AN88, "Ceramic Input Capacitors
// Can Cause Overvoltage Transients", 2001).
// Controlled ramp: I = C·dV/dt (TI SLVA670 "Managing Inrush Current").
// Gate-capacitor ramp of a hot-swap / load-switch MOSFET working as a source
// follower: dV/dt = I_GATE / (C_G + C_GD) (TI TPS2490 datasheet SLVS503, eq. 4–5).
// NTC limiter: R25 ≥ V_pk / I_pk − R_series; the NTC must absorb ≈ ½·C·V²
// (TDK/EPCOS application note "NTC thermistors for inrush current limiting").

/**
 * Series RLC step response from rest: source V, total resistance r, inductance
 * l (0 allowed), capacitance c. Returns the current peak, the capacitor
 * voltage maximum and functions i(t), vc(t).
 */
export function rlcStep({ v, r, l = 0, c }) {
  if (!(l > 0)) {
    const tau = r * c;
    return {
      type: 'rc', tau, iPeak: v / r, tPeak: 0, vMax: v,
      i: (t) => (v / r) * Math.exp(-t / tau),
      vc: (t) => v * (1 - Math.exp(-t / tau)),
    };
  }
  const a = r / (2 * l);
  const w0 = 1 / Math.sqrt(l * c);
  const zeta = a / w0;
  if (zeta < 1 - 1e-9) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    const i = (t) => (v / (wd * l)) * Math.exp(-a * t) * Math.sin(wd * t);
    const tPeak = Math.atan2(wd, a) / wd;
    return {
      type: 'under', zeta, w0, wd, tPeak, iPeak: i(tPeak),
      vMax: v * (1 + Math.exp((-a * Math.PI) / wd)),
      i,
      vc: (t) => v * (1 - Math.exp(-a * t) * (Math.cos(wd * t) + (a / wd) * Math.sin(wd * t))),
    };
  }
  if (zeta <= 1 + 1e-9) {
    const i = (t) => (v / l) * t * Math.exp(-a * t);
    return {
      type: 'critical', zeta: 1, w0, tPeak: 1 / a, iPeak: i(1 / a), vMax: v,
      i,
      vc: (t) => v * (1 - (1 + a * t) * Math.exp(-a * t)),
    };
  }
  const b = Math.sqrt(a * a - w0 * w0);
  const s1 = -a + b;
  const s2 = -a - b;
  const i = (t) => (v / (l * (s1 - s2))) * (Math.exp(s1 * t) - Math.exp(s2 * t));
  const tPeak = Math.log(s2 / s1) / (s1 - s2);
  return {
    type: 'over', zeta, w0, tPeak, iPeak: i(tPeak), vMax: v,
    i,
    vc: (t) => v * (1 + (s2 * Math.exp(s1 * t) - s1 * Math.exp(s2 * t)) / (s1 - s2)),
  };
}

/** Hot plug into an uncharged capacitor. */
export function hotPlug({ v, c, rSrc = 0, esr = 0, rTrace = 0, l = 0 }) {
  const r = rSrc + esr + rTrace;
  if (!(r > 0) && !(l > 0)) return { ok: false, errors: ['iz_rZero'] };
  const s = rlcStep({ v, r, l, c });
  return {
    ok: true, ...s, r,
    iPeakR: r > 0 ? v / r : Infinity, // resistive limit, ignoring the inductance
    energy: 0.5 * c * v * v, // stored in C; the same energy is lost in the resistance
    tau: r * c,
  };
}

/**
 * Linear output ramp 0 → V in tRamp, with an optional resistive load that
 * draws iLoad at V. Energy in a linear pass element (load switch, eFuse,
 * hot-swap FET): ∫(V − v)·i dt = ½·C·V² + V·I_load·t_ramp/6.
 */
export function softStart({ v, c, tRamp, iLoad = 0 }) {
  const slew = v / tRamp;
  const iCap = c * slew;
  const energyFet = 0.5 * c * v * v + (v * iLoad * tRamp) / 6;
  return {
    ok: true, slew, tRamp, iCap,
    iPeak: iCap + iLoad,
    energyFet,
    pAvg: energyFet / tRamp,
    pPeak: v * iCap, // at the start of the ramp: full V across the FET
    energy: 0.5 * c * v * v,
  };
}

/**
 * Gate-capacitor ramp: the MOSFET follows its gate, which a current source
 * I_GATE charges through C_G (plus the FET's own C_GD).
 * iTarget (optional): C_G needed for that inrush current.
 */
export function gateRamp({ v, c, iGate, cGate, cgd = 0, iLoad = 0, iTarget }) {
  const slew = iGate / (cGate + cgd);
  const res = softStart({ v, c, tRamp: v / slew, iLoad });
  if (iTarget > 0) res.cGateFor = (iGate * c) / iTarget - cgd;
  return res;
}

/**
 * NTC inrush limiter. vPk: peak supply voltage (√2·Vrms for a rectified AC
 * input), iTarget: allowed peak current, r25 (optional): the chosen part.
 */
export function ntcLimiter({ vPk, c, iTarget, rSrc = 0, esr = 0, r25, iSs, rHot }) {
  const rSeries = rSrc + esr;
  const r25Min = vPk / iTarget - rSeries;
  const rUse = r25 > 0 ? r25 : Math.max(r25Min, 0);
  const rTot = rUse + rSeries;
  const res = {
    ok: true, rSeries, r25Min, rUse,
    iPeak: rTot > 0 ? vPk / rTot : Infinity,
    iPeakBare: rSeries > 0 ? vPk / rSeries : Infinity,
    energy: 0.5 * c * vPk * vPk,
    tau: rTot * c,
    warnings: [],
  };
  if (iSs > 0 && rHot > 0) res.pSs = iSs * iSs * rHot;
  if (r25Min <= 0) res.warnings.push('iz_ntcNotNeeded');
  else if (r25 > 0 && r25 < r25Min) res.warnings.push('iz_ntcSmall');
  return res;
}
