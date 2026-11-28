// RF link budget: the Friis transmission equation in dB form, with an optional
// log-distance path-loss model and an estimate of the receiver sensitivity.
//
//   λ      = c / f
//   FSPL   = 20·log10(4π·d / λ)                 free-space path loss (dB)
//          = 32.44 + 20·log10(f / MHz) + 20·log10(d / km)
//   PL     = FSPL(d)                            free space, or
//          = FSPL(d0) + 10·n·log10(d / d0)      log-distance, d0 = 1 m
//   EIRP   = P_tx + G_tx − L_tx                 (dBm)
//   P_rx   = EIRP − PL − L_x + G_rx − L_rx      (dBm)
//   S      = −174 dBm/Hz + 10·log10(B / Hz) + NF + SNR_min   (when estimated)
//   M      = P_rx − S                           link margin (dB)
//   range  = d·10^((M − M_target) / (10·n))     n = 2 in free space;
//            M_target = required fade margin, or 0
//   r_F    = ½·√(λ·d)                           first Fresnel zone radius at mid-path
//
// Sources: H. T. Friis, "A Note on a Simple Transmission Formula", Proc. IRE 34
// (1946); log-distance model: T. S. Rappaport, Wireless Communications.
// Pure functions, SI units and dB quantities; no DOM, no i18n.

/** Speed of light in vacuum (m/s). */
export const C0 = 299792458;
/** Boltzmann constant (J/K) and the reference temperature of noise figures (K). */
export const BOLTZMANN = 1.380649e-23;
export const T0 = 290;
/**
 * Thermal noise density k·T0 in dBm/Hz. The exact value is
 * 10·log10(1.380649e-23 · 290 / 1 mW) = −173.98 dBm/Hz; the customary −174 is used.
 */
export const NOISE_DBM_HZ = -174;
/** Reference distance of the log-distance model (m). */
export const REF_DISTANCE_M = 1;
/** Rule of thumb: this share of the first Fresnel zone radius should be clear of obstacles. */
export const FRESNEL_CLEARANCE = 0.6;

export const MODELS = ['free', 'logd'];
export const SENS_MODES = ['direct', 'est'];

const finite = (...xs) => xs.every((x) => typeof x === 'number' && Number.isFinite(x));

/** Wavelength in vacuum (m). */
export const wavelength = (fHz) => C0 / fHz;

/** Free-space path loss (dB) between isotropic antennas. */
export const fsplDb = (fHz, dM) => 20 * Math.log10((4 * Math.PI * dM * fHz) / C0);

/**
 * Path loss (dB) of the chosen model.
 * @param {object} p
 * @param {number} p.fHz
 * @param {number} p.dM
 * @param {'free'|'logd'} [p.model]
 * @param {number} [p.n] path-loss exponent of the log-distance model
 */
export function pathLossDb({ fHz, dM, model = 'free', n = 2 }) {
  if (model === 'logd') return fsplDb(fHz, REF_DISTANCE_M) + 10 * n * Math.log10(dM / REF_DISTANCE_M);
  return fsplDb(fHz, dM);
}

/**
 * Receiver sensitivity estimated from bandwidth, noise figure and required SNR.
 * @returns {{ktbDbm:number, floorDbm:number, sDbm:number}} thermal noise in B, noise floor (with NF), sensitivity
 */
export function sensitivityDbm({ bHz, nfDb, snrDb }) {
  const ktbDbm = NOISE_DBM_HZ + 10 * Math.log10(bHz);
  const floorDbm = ktbDbm + nfDb;
  return { ktbDbm, floorDbm, sDbm: floorDbm + snrDb };
}

/** Radius of the first Fresnel zone at the middle of the path (m). */
export const fresnelRadius = (lambdaM, dM) => 0.5 * Math.sqrt(lambdaM * dM);

/** Distance at which a margin that is `spareDb` larger than wanted at `dM` is used up. */
export const rangeFor = (dM, spareDb, n) => dM * 10 ** (spareDb / (10 * n));

const dbmToW = (dbm) => 1e-3 * 10 ** (dbm / 10);

/** True when every number in the result is finite; null marks "not applicable". */
function allFinite(x) {
  if (typeof x === 'number') return Number.isFinite(x);
  if (x && typeof x === 'object') return Object.values(x).every(allFinite);
  return true;
}

/**
 * The link budget.
 * @param {object} p
 * @param {number} p.fHz        frequency (Hz)
 * @param {number} p.dM         distance (m)
 * @param {number} p.ptxDbm     transmit power (dBm)
 * @param {number} [p.gtxDbi]   transmit antenna gain (dBi)
 * @param {number} [p.ltxDb]    transmit-side loss: cable, matching, connector (dB, ≥ 0)
 * @param {number} [p.grxDbi]   receive antenna gain (dBi)
 * @param {number} [p.lrxDb]    receive-side loss (dB, ≥ 0)
 * @param {'free'|'logd'} [p.model]
 * @param {number} [p.n]        path-loss exponent (log-distance only)
 * @param {number} [p.lExtraDb] extra loss on the path: walls, body, enclosure (dB, ≥ 0)
 * @param {'direct'|'est'} [p.sensMode]
 * @param {number} [p.sDbm]     receiver sensitivity (dBm), sensMode 'direct'
 * @param {number} [p.bHz]      bandwidth (Hz), sensMode 'est'
 * @param {number} [p.nfDb]     noise figure (dB, ≥ 0), sensMode 'est'
 * @param {number} [p.snrDb]    required SNR (dB), sensMode 'est'
 * @param {number} [p.mReqDb]   required fade margin (dB, ≥ 0)
 * @returns {{ok: false, errors: string[]} | object} errors and warnings are message keys.
 */
export function linkBudget(p) {
  const fail = (...errors) => ({ ok: false, errors });
  if (!p) return fail('lb_positive');
  const model = p.model === 'logd' ? 'logd' : 'free';
  const sensMode = p.sensMode === 'est' ? 'est' : 'direct';
  const gtxDbi = p.gtxDbi ?? 0;
  const ltxDb = p.ltxDb ?? 0;
  const grxDbi = p.grxDbi ?? 0;
  const lrxDb = p.lrxDb ?? 0;
  const lExtraDb = p.lExtraDb ?? 0;
  const mReqDb = p.mReqDb ?? 10;
  const { fHz, dM, ptxDbm } = p;

  if (!finite(fHz, dM, ptxDbm, gtxDbi, ltxDb, grxDbi, lrxDb, lExtraDb, mReqDb) || !(fHz > 0) || !(dM > 0)) return fail('lb_positive');
  if (model === 'logd' && !(finite(p.n) && p.n > 0)) return fail('lb_positive');
  if (sensMode === 'est' ? !(finite(p.bHz, p.nfDb, p.snrDb) && p.bHz > 0) : !finite(p.sDbm)) return fail('lb_positive');
  if (ltxDb < 0 || lrxDb < 0 || lExtraDb < 0 || mReqDb < 0 || (sensMode === 'est' && p.nfDb < 0)) return fail('lb_nonneg');

  const n = model === 'logd' ? p.n : 2;
  const lambdaM = wavelength(fHz);
  const fspl = fsplDb(fHz, dM);
  const fsplRefDb = fsplDb(fHz, REF_DISTANCE_M);
  const plDb = pathLossDb({ fHz, dM, model, n });
  const pathTotalDb = plDb + lExtraDb;
  const eirpDbm = ptxDbm + gtxDbi - ltxDb;
  const pAntDbm = eirpDbm - pathTotalDb; // level in front of the receive antenna (isotropic)
  const prxDbm = pAntDbm + grxDbi - lrxDb;

  const est = sensMode === 'est' ? sensitivityDbm({ bHz: p.bHz, nfDb: p.nfDb, snrDb: p.snrDb }) : null;
  const sDbm = est ? est.sDbm : p.sDbm;
  const marginDb = prxDbm - sDbm;
  const spareDb = marginDb - mReqDb;
  const verdict = marginDb < 0 ? 'fail' : spareDb < 0 ? 'low' : 'pass';

  const fresnelM = fresnelRadius(lambdaM, dM);
  const nearField = dM < lambdaM;
  const warnings = [];
  if (nearField) warnings.push('lb_nearField');
  if (model === 'logd' && dM < REF_DISTANCE_M) warnings.push('lb_belowRef');

  const r = {
    ok: true,
    model,
    sensMode,
    fHz,
    dM,
    ptxDbm,
    gtxDbi,
    ltxDb,
    grxDbi,
    lrxDb,
    lExtraDb,
    mReqDb,
    n,
    refDistanceM: REF_DISTANCE_M,
    noiseDbmHz: NOISE_DBM_HZ,
    lambdaM,
    fsplDb: fspl,
    fsplRefDb,
    plDb,
    pathTotalDb,
    eirpDbm,
    eirpW: dbmToW(eirpDbm),
    pAntDbm,
    prxDbm,
    prxW: dbmToW(prxDbm),
    bHz: est ? p.bHz : null,
    nfDb: est ? p.nfDb : null,
    snrDb: est ? p.snrDb : null,
    ktbDbm: est ? est.ktbDbm : null,
    floorDbm: est ? est.floorDbm : null,
    sDbm,
    needDbm: sDbm + mReqDb, // the level P_rx has to reach for the required margin
    marginDb,
    spareDb,
    verdict,
    pass: verdict === 'pass',
    dMaxM: rangeFor(dM, spareDb, n),
    dZeroM: rangeFor(dM, marginDb, n),
    fresnelM,
    fresnelClearM: FRESNEL_CLEARANCE * fresnelM,
    fresnelClearance: FRESNEL_CLEARANCE,
    nearField,
    warnings,
  };
  return allFinite(r) ? r : fail('lb_range');
}
