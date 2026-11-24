// RC snubber across a switch, damping the ringing of the loop inductance with
// the switch-node capacitance.
//
// Parasitic extraction: Nexperia AN11160 "Designing RC snubbers" eq. 1–3 and
// TI SLVUBB4B (Power Stage Designer, RC-snubber calculator) eq. 17–21:
//   x = f1/f2,  Cpar = Cadd/(x² − 1),  Lpar = 1/((2π·f1)²·Cpar)
// Damping: AN11160 eq. 9, ζ = (1/(2R))·√(L/C) → R = Z0/(2ζ); R = Z0 (ζ = 0.5) is
// the classic choice (P. C. Todd, "Snubber Circuits: Theory, Design and
// Application", Unitrode SEM-900, 1993; TI SLVUBB4B).
// Capacitor: Todd: 2–4 × the circuit capacitance; TI SLVUBB4B: 3 × Cpar.
// AN11160 lower bound: snubber corner 1/(2π·R·Cs) = f1.
// Resistor power: Todd: P = C·V²·f (½CV² per charge and per discharge).

const TAU = 2 * Math.PI;

/** Cpar and Lpar from the ringing frequency before (f1) and after (f2) adding Cadd. */
export function parasitics({ f1, f2, cAdd }) {
  if (!(f1 > f2)) return { error: 'sn_f2' };
  const x = f1 / f2;
  const cPar = cAdd / (x * x - 1);
  const lPar = 1 / ((TAU * f1) ** 2 * cPar);
  return { x, cPar, lPar };
}

/**
 * @param {object} p
 * @param {number} p.lPar, p.cPar  loop inductance (H) and node capacitance (F)
 * @param {number} [p.zeta]        damping target (0.5 → R = Z0)
 * @param {number} [p.kC]          Csnub / Cpar
 * @param {number} [p.v]           voltage step across the switch (V)
 * @param {number} [p.fsw]         switching frequency (Hz)
 * @param {number} [p.iOff]        current interrupted at turn-off (A), for the undamped spike estimate
 */
export function snubberDesign({ lPar, cPar, zeta = 0.5, kC = 3, v, fsw, iOff }) {
  const z0 = Math.sqrt(lPar / cPar);
  const f0 = 1 / (TAU * Math.sqrt(lPar * cPar));
  const r = z0 / (2 * zeta);
  const cs = kC * cPar;
  const res = {
    ok: true, lPar, cPar, z0, f0, r, cs,
    csMin: 1 / (TAU * r * f0),
    tau: r * cs,
    fc: 1 / (TAU * r * cs),
    warnings: [],
  };
  if (v > 0) res.energy = cs * v * v; // dissipated per switching period (charge + discharge)
  if (v > 0 && fsw > 0) {
    res.p = cs * v * v * fsw;
    if (3 * res.tau * fsw > 0.1) res.warnings.push('sn_tauLong');
  }
  if (iOff > 0) res.vSpike = iOff * z0; // ½·L·I² = ½·C·ΔV² with no damping
  if (kC < 1) res.warnings.push('sn_kSmall');
  return res;
}

/**
 * Normalised switch-node voltage after a step (0 → 1): the source drives the
 * loop inductance L into Cpar, with the R–Cs snubber in parallel (r = 0 or
 * cs = 0: no snubber). A small series loss gives the bare circuit a finite
 * decay. Returns n + 1 points [t, v] over tEnd (RK4).
 */
export function stepResponse({ l, cp, r = 0, cs = 0, zetaBare = 0.04, tEnd, n = 400 }) {
  const rLoss = 2 * zetaBare * Math.sqrt(l / cp);
  const snub = r > 0 && cs > 0;
  // State: iL, v (node), vs (snubber capacitor).
  const deriv = ([iL, v, vs]) => {
    const iR = snub ? (v - vs) / r : 0;
    return [(1 - v - rLoss * iL) / l, (iL - iR) / cp, snub ? iR / cs : 0];
  };
  const h = tEnd / n;
  // Keep the explicit integration stable for a stiff snubber (small R·Cp).
  const sub = snub ? Math.max(1, Math.ceil((2 * h) / ((r * cp * cs) / (cp + cs)))) : 1;
  const dt = h / sub;
  let y = [0, 0, 0];
  const out = [[0, 0]];
  for (let k = 1; k <= n; k++) {
    for (let s = 0; s < sub; s++) {
      const k1 = deriv(y);
      const k2 = deriv(y.map((x, i) => x + (dt / 2) * k1[i]));
      const k3 = deriv(y.map((x, i) => x + (dt / 2) * k2[i]));
      const k4 = deriv(y.map((x, i) => x + dt * k3[i]));
      y = y.map((x, i) => x + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    }
    out.push([k * h, y[1]]);
  }
  return out;
}
