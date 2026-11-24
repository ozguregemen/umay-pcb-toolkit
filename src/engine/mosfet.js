// Power MOSFET losses in a hard-switched (clamped inductive load) stage.
//
// Conduction and Rds(on) temperature model, switching energies and the
// reverse-recovery term follow Infineon "MOSFET Power Losses Calculation
// Using the Data-Sheet Parameters" (D. Graovac, M. Pürschel, A. Kiep, 2006).
// Switching intervals from gate charge and driver current follow L. Balogh,
// "Design and Application Guide for High Speed MOSFET Gate Drive Circuits"
// (TI SLUP169): t2 = Ciss·(Vpl − Vth)/IG2, t3 = Crss·Vds/IG3 — written here
// with the datasheet charges Qgs2 ≈ Ciss·(Vpl − Vth) and Qgd ≈ Crss·Vds.
// Gate, dead-time, Qrr and Coss terms as in TI SLPA009A.

/** Temperature coefficient (%/K) that gives Rds(on)(125 °C) = ratio · Rds(on)(25 °C). */
export const alphaFromRatio = (ratio125) => 100 * (ratio125 ** (1 / 100) - 1);

/** Graovac: Rds(on)(Tj) = Rds(on)(25 °C) · (1 + α/100)^(Tj − 25). */
export const rdsAt = (rds25, tj, alphaPct) => rds25 * (1 + alphaPct / 100) ** (tj - 25);

/**
 * Switching intervals from gate charge.
 * Turn-on:  current rise t_ri = Qgs2 / IG2,  voltage fall t_fv = Qgd / IG3
 * Turn-off: voltage rise t_rv = Qgd / IG3,   current fall t_fi = Qgs2 / IG2
 * Resistive driver (SLUP169): IG2,on = (Vdrv − (Vpl + Vth)/2) / Ron, IG3,on = (Vdrv − Vpl) / Ron,
 * IG3,off = Vpl / Roff, IG2,off = ((Vpl + Vth)/2) / Roff, with R = Rdriver + Rg,ext + Rg,int.
 * Current-source driver: the source / sink current in both intervals.
 * Qgs2 (charge from Vth to the plateau) is estimated as Qgs·(Vpl − Vth)/Vpl.
 */
export function gateTiming({ qgs, qgd, vpl, vth, vdrv, drive = 'res', rSrc, rSink, rgExt = 0, rgInt = 0, iSrc, iSink }) {
  if (!(vth > 0 && vpl > vth)) return { error: 'mf_vth' };
  if (!(vdrv > vpl)) return { error: 'mf_vdrv' };
  const qgs2 = (qgs * (vpl - vth)) / vpl;
  const vMid = (vpl + vth) / 2;
  let ig;
  let rOn = NaN;
  let rOff = NaN;
  if (drive === 'cur') {
    ig = { on2: iSrc, on3: iSrc, off3: iSink, off2: iSink };
  } else {
    rOn = rSrc + rgExt + rgInt;
    rOff = rSink + rgExt + rgInt;
    if (!(rOn > 0 && rOff > 0)) return { error: 'mf_rgate' };
    ig = { on2: (vdrv - vMid) / rOn, on3: (vdrv - vpl) / rOn, off3: vpl / rOff, off2: vMid / rOff };
  }
  return {
    qgs2, ig, rOn, rOff,
    tri: qgs2 / ig.on2,
    tfv: qgd / ig.on3,
    trv: qgd / ig.off3,
    tfi: qgs2 / ig.off2,
  };
}

/**
 * Loss budget and junction temperature.
 * @param {object} p
 * @param {number} p.v       drain–source voltage while off (V)
 * @param {number} p.i       drain current switched at turn-on / turn-off (A)
 * @param {number} p.irms    RMS drain current (A)
 * @param {number} p.fsw     switching frequency (Hz)
 * @param {number} p.rds25   Rds(on) at 25 °C (Ω)
 * @param {number} p.alphaPct Rds(on) temperature coefficient (%/K)
 * @param {'qg'|'time'} p.sw switching-loss method
 * @param {object} [p.gate]  gateTiming() parameters (method 'qg')
 * @param {number} [p.tr], [p.tf] transition times (s) for method 'time'
 * @param {number} p.qg      total gate charge (C)
 * @param {number} p.vdrv    gate drive voltage (V)
 * @param {number} [p.coss]  output capacitance (F)
 * @param {number} [p.vsd]   body-diode forward voltage (V)
 * @param {number} [p.tdead] dead time per edge (s); the diode conducts in two dead times per period
 * @param {number} [p.qrr]   reverse-recovery charge of the commutating diode (C)
 * @param {number} p.theta   junction-to-ambient thermal resistance (°C/W)
 * @param {number} p.ta      ambient temperature (°C)
 * @param {number} [p.tjMax] design limit (°C)
 */
export function mosfetLosses(p) {
  let timing;
  if (p.sw === 'qg') {
    timing = gateTiming(p.gate);
    if (timing.error) return { ok: false, errors: [timing.error] };
  } else {
    // Simple form ½·V·I·(tr + tf)·fsw: each edge split into equal current and voltage parts.
    timing = { tri: p.tr / 2, tfv: p.tr / 2, trv: p.tf / 2, tfi: p.tf / 2 };
  }
  const eOn = 0.5 * p.v * p.i * (timing.tri + timing.tfv);
  const eOff = 0.5 * p.v * p.i * (timing.trv + timing.tfi);
  const pOn = eOn * p.fsw;
  const pOff = eOff * p.fsw;
  const pCoss = 0.5 * (p.coss || 0) * p.v ** 2 * p.fsw;
  const pDead = (p.vsd || 0) * p.i * 2 * (p.tdead || 0) * p.fsw;
  const pQrr = (p.qrr || 0) * p.v * p.fsw;
  const gateTotal = p.qg * p.vdrv * p.fsw;
  // SLUP169: each half of Qg·Vdrv·f is shared by the resistances in its path;
  // only Rg,int sits inside the MOSFET package.
  let gateFet = 0;
  if (p.sw === 'qg' && p.gate.drive !== 'cur') {
    gateFet = 0.5 * gateTotal * ((p.gate.rgInt || 0) / timing.rOn + (p.gate.rgInt || 0) / timing.rOff);
  }
  const other = pOn + pOff + pCoss + pDead + pQrr + gateFet;

  // Rds(on) rises with Tj, which depends on the loss: iterate to the fixed point.
  let tj = p.ta;
  let pCond = 0;
  let converged = false;
  let runaway = false;
  for (let k = 0; k < 500; k++) {
    pCond = p.irms ** 2 * rdsAt(p.rds25, tj, p.alphaPct);
    const next = p.ta + (pCond + other) * p.theta;
    if (!Number.isFinite(next) || next > 1000) { runaway = true; break; }
    if (Math.abs(next - tj) < 1e-6) { tj = next; converged = true; break; }
    tj = next;
  }
  if (!converged) runaway = true;
  const total = pCond + other;
  const parts = { cond: pCond, on: pOn, off: pOff, coss: pCoss, dead: pDead, qrr: pQrr, gate: gateFet };
  const r = {
    ok: true,
    ...timing,
    eOn, eOff, parts, total,
    psw: pOn + pOff,
    gateTotal, gateDriver: gateTotal - gateFet,
    rds: rdsAt(p.rds25, tj, p.alphaPct),
    tj: runaway ? Infinity : tj,
    runaway,
    margin: Number.isFinite(p.tjMax) ? p.tjMax - tj : NaN,
    warnings: [],
  };
  if (runaway) r.warnings.push('mf_runaway');
  else if (Number.isFinite(p.tjMax) && tj > p.tjMax) r.warnings.push('mf_tjHigh');
  if (p.sw === 'qg' && p.vdrv < p.gate.vpl + 2) r.warnings.push('mf_drvLow');
  return r;
}
