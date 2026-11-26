// Current-sense shunt sizing: value from the full-scale sense voltage, power
// and rating with temperature derating, resolution through an amplifier and an
// ADC, and an error budget (tolerance, TCR, amplifier gain error and offset,
// quantisation). SI units throughout (A, V, Ω, W, K).

/** Common shunt values per decade (metal-strip / thick-film current-sense parts). */
export const SHUNT_MANTISSAS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5];

/** Common current-sense resistor power ratings (W). */
export const SHUNT_RATINGS_W = [0.1, 0.125, 0.25, 0.5, 1, 2, 3, 5];

/** Typical derating: full power up to 70 °C, linear to zero at 170 °C (e.g. Vishay WSL series). */
export const DERATE = { full: 70, zero: 170 };

export const derateFactor = (tAmb) => {
  if (!Number.isFinite(tAmb) || tAmb <= DERATE.full) return 1;
  return Math.max(0, (DERATE.zero - tAmb) / (DERATE.zero - DERATE.full));
};

const clean = (x) => Number(x.toPrecision(12));

/** Largest common shunt value ≤ r (keeps the full-scale voltage within range). */
export function shuntBelow(r) {
  if (!(r > 0)) return NaN;
  let e = Math.floor(Math.log10(r));
  let best = NaN;
  for (const de of [-1, 0]) {
    for (const m of SHUNT_MANTISSAS) {
      const v = clean(m * 10 ** (e + de));
      if (v <= r * (1 + 1e-9) && !(v <= best)) best = v;
    }
  }
  if (!Number.isFinite(best)) { e -= 1; best = clean(SHUNT_MANTISSAS[SHUNT_MANTISSAS.length - 1] * 10 ** e); }
  return best;
}

/** Default margin of the suggested rating: the part is loaded to at most half of its derated rating. */
export const RATING_MARGIN = 2;

/**
 * Smallest rating that keeps the dissipation at ≤ 1/margin of the derated rating.
 * @returns {number|null} rating (W) or null when above the list
 */
export function shuntRating(p, tAmb, margin = RATING_MARGIN) {
  const k = derateFactor(tAmb);
  if (!(k > 0)) return null;
  return SHUNT_RATINGS_W.find((w) => w * k >= p * margin * (1 - 1e-9)) ?? null;
}

/**
 * Error contributions (% of reading) at current i.
 * @param {{i:number, r:number, tolPct:number, tcrPpm:number, dT:number, gainErrPct?:number,
 *   vos?:number, lsbCurrent:number}} p vos = amplifier input offset (V)
 */
export function errorBudget({ i, r, tolPct, tcrPpm, dT, gainErrPct, vos, lsbCurrent }) {
  const parts = {
    tol: tolPct,
    tcr: (tcrPpm * dT) / 1e4,
    gain: Number.isFinite(gainErrPct) ? gainErrPct : 0,
    offset: Number.isFinite(vos) ? (Math.abs(vos) / (i * r)) * 100 : 0,
    quant: Number.isFinite(lsbCurrent) ? (lsbCurrent / 2 / i) * 100 : 0,
  };
  const vals = Object.values(parts);
  return {
    ...parts,
    wc: vals.reduce((s, x) => s + Math.abs(x), 0),
    rss: Math.sqrt(vals.reduce((s, x) => s + x * x, 0)),
  };
}

/**
 * Complete design.
 * @param {{imax:number, sizing:'vs'|'adc', vsFs?:number, vfs:number, gain:number, use?:number,
 *   bits:number, rUser?:number, vbus:number, tAmb?:number, tolPct:number, tcrPpm:number, dT:number,
 *   gainErrPct?:number, vos?:number}} p use = fraction of the ADC range used at imax (adc sizing)
 */
export function shuntDesign(p) {
  const { imax, sizing, vsFs, vfs, gain, use = 0.9, bits, rUser, vbus, tAmb } = p;
  const rExact = sizing === 'adc' ? (vfs * use) / (gain * imax) : vsFs / imax;
  const rStd = shuntBelow(rExact);
  const r = Number.isFinite(rUser) && rUser > 0 ? rUser : rStd;
  const vSense = imax * r;
  const vAmp = gain * vSense;
  const codes = 2 ** bits;
  const lsbV = vfs / codes;
  const lsbCurrent = lsbV / (gain * r);
  const pw = imax * imax * r;
  const at = (i) => errorBudget({ ...p, i, r, lsbCurrent });
  return {
    rExact,
    rStd,
    r,
    userR: r !== rStd,
    vSense,
    vAmp,
    usePct: (vAmp / vfs) * 100,
    clip: vAmp > vfs * (1 + 1e-9),
    iFs: vfs / (gain * r),
    code: Math.min(codes - 1, Math.round(vAmp / lsbV)),
    lsbV,
    lsbCurrent,
    p: pw,
    derate: derateFactor(tAmb),
    rating: shuntRating(pw, tAmb),
    // Smallest rating that satisfies the margin at this ambient (Infinity when fully derated); for the calculation steps.
    ratingMin: (pw * RATING_MARGIN) / derateFactor(tAmb),
    dropPct: Number.isFinite(vbus) && vbus > 0 ? (vSense / vbus) * 100 : NaN,
    errFull: at(imax),
    errLow: at(imax / 10),
  };
}
