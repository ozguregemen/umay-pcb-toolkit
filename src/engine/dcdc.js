// Switching-regulator power-stage basics (continuous conduction mode).
// Buck: TI SLVA477 "Basic calculation of a buck converter's power stage".
// Boost: TI SLVA372 "Basic calculation of a boost converter's power stage".

/**
 * @param {object} p
 * @param {number} p.vin       input voltage (use the maximum for the buck inductor)
 * @param {number} p.vout
 * @param {number} p.iout
 * @param {number} p.fsw       switching frequency (Hz)
 * @param {number} p.ripple    inductor ripple as a fraction of the reference current (0.2–0.4)
 * @param {number} p.eff       efficiency estimate (0–1)
 * @param {number} p.dvout     allowed output voltage ripple (V)
 */
export function buck({ vin, vout, iout, fsw, ripple, eff, dvout }) {
  if (!(vin > vout)) return { ok: false, errors: ['buckRange'] };
  const duty = vout / (vin * eff);
  const dI = ripple * iout;
  const L = (vout * (vin - vout)) / (dI * fsw * vin);
  const res = {
    ok: true,
    topology: 'buck',
    duty,
    dI,
    L,
    iPeak: iout + dI / 2,
    iL: iout,
    cOutMin: dI / (8 * fsw * dvout),
    esrMax: dvout / dI,
    iCinRms: iout * Math.sqrt(duty * (1 - duty)),
    warnings: [],
  };
  if (duty > 0.9) res.warnings.push('dutyHigh');
  if (duty < 0.1) res.warnings.push('dutyLow');
  return res;
}

export function boost({ vin, vout, iout, fsw, ripple, eff, dvout }) {
  if (!(vout > vin)) return { ok: false, errors: ['boostRange'] };
  const duty = 1 - (vin * eff) / vout;
  const iL = iout / (1 - duty);
  const dI = ripple * iout * (vout / vin);
  const L = (vin * (vout - vin)) / (dI * fsw * vout);
  const res = {
    ok: true,
    topology: 'boost',
    duty,
    dI,
    L,
    iL,
    iPeak: iL + dI / 2,
    cOutMin: (iout * duty) / (fsw * dvout),
    esrMax: dvout / (iL + dI / 2),
    warnings: [],
  };
  if (duty > 0.85) res.warnings.push('dutyHigh');
  return res;
}
