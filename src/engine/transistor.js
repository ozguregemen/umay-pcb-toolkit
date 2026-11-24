// Low-side transistor switches: an NPN BJT driven into saturation with a
// forced beta, and an N-channel MOSFET with gate-charge based turn-on time.
// SI units throughout (V, A, Ω, W, C, s, Hz).

import { bracketStandard } from './eseries.js';

/**
 * Load current of a low-side switch: given directly, or from the load
 * resistance and the voltage left after the switch drop.
 * @param {{mode:'i'|'r', i?:number, rl?:number, vs:number, drop?:number, rOn?:number}} p
 *   drop: fixed switch voltage (BJT Vce(sat)); rOn: switch resistance (MOSFET Rds(on))
 */
export function loadCurrent({ mode, i, rl, vs, drop = 0, rOn = 0 }) {
  if (mode !== 'r') return i;
  return (vs - drop) / (rl + rOn);
}

/**
 * NPN low-side switch in saturation.
 * Ib = Ic / β_forced, Rb = (Vdrive − Vbe(sat)) / (Ib + Vbe/Rbe), rounded down
 * to a standard value so the base current is at least the target.
 * @param {{ic:number, vdrive:number, vbe:number, vce:number, hfe:number, betaF:number,
 *   rbe?:number, series?:string}} p
 */
export function bjtSwitch({ ic, vdrive, vbe, vce, hfe, betaF, rbe, series = 'E24' }) {
  if (!(vdrive > vbe)) return { ok: false, errors: ['sw_driveLow'] };
  if (!(ic > 0)) return { ok: false, errors: ['sw_noLoad'] };
  const hasRbe = Number.isFinite(rbe) && rbe > 0;
  const iRbe = hasRbe ? vbe / rbe : 0;
  const ib = ic / betaF;
  const rbExact = (vdrive - vbe) / (ib + iRbe);
  const rb = bracketStandard(rbExact, series).below;
  const iDrive = (vdrive - vbe) / rb;
  const ibStd = iDrive - iRbe;
  return {
    ok: true,
    ic,
    ib,
    iRbe,
    rbExact,
    rb,
    iDrive,
    ibStd,
    betaStd: ic / ibStd,
    hfe,
    pC: vce * ic,
    pB: vbe * ibStd,
    pTotal: vce * ic + vbe * ibStd,
    pRb: iDrive * iDrive * rb,
  };
}

/**
 * N-channel low-side MOSFET switch.
 * Conduction: P = I² · Rds(on). Turn-on: the driver charges Qg with
 * Ig = min(I_driver, (Vdrive − Vplateau) / Rg), t ≈ Qg / Ig.
 * @param {{id:number, vdrive:number, rds:number, vgsSpec:number, vth:number, qg:number,
 *   vpl:number, rg?:number, idrv:number, rpd?:number, fsw?:number}} p
 */
export function mosfetSwitch({ id, vdrive, rds, vgsSpec, vth, qg, vpl, rg, idrv, rpd, fsw }) {
  if (!(id > 0)) return { ok: false, errors: ['sw_noLoad'] };
  const hasRg = Number.isFinite(rg) && rg > 0;
  const hasRpd = Number.isFinite(rpd) && rpd > 0;
  // Static gate voltage: the pull-down divides the drive through Rg.
  const vgs = hasRpd && hasRg ? (vdrive * rpd) / (rpd + rg) : vdrive;
  const overPlateau = vdrive - vpl;
  const iRg = hasRg ? overPlateau / rg : Infinity;
  const ig = Math.min(idrv, iRg);
  const tOn = overPlateau > 0 ? qg / ig : Infinity;
  const hasF = Number.isFinite(fsw) && fsw > 0;
  return {
    ok: true,
    id,
    vgs,
    vgsOk: vgs >= vgsSpec * (1 - 1e-9),
    belowVth: vgs <= vth,
    plateauOk: overPlateau > 0,
    limitedBy: iRg < idrv ? 'rg' : 'driver',
    pCond: id * id * rds,
    pCondHot: id * id * rds * HOT_FACTOR,
    vds: id * rds,
    igPeak: hasRg ? Math.min(idrv, vdrive / rg) : idrv,
    ig,
    tOn,
    iPd: hasRpd ? vdrive / (rpd + (hasRg ? rg : 0)) : 0,
    pGate: hasF ? qg * vdrive * fsw : NaN,
    iGateAvg: hasF ? qg * fsw : NaN,
    dutyOfPeriod: hasF ? tOn * fsw : NaN,
  };
}

/** Typical Rds(on) rise from 25 °C to Tj ≈ 100–125 °C (datasheet normalised Rds(on) curves: ×1.4…1.7). */
export const HOT_FACTOR = 1.5;
