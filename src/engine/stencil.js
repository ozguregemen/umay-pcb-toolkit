// Solder paste stencil: does an aperture release its paste from a foil of a
// given thickness, how much paste does it hold, and what is the thickest foil
// that still works. Lengths in mm.
//
//   Aperture area      A   = L·W            (rectangle)   π·D²/4   (circle)
//   Wall area          A_w = 2·(L + W)·T                  π·D·T
//   Area ratio         AR  = A / A_w = L·W / (2·(L + W)·T)         D / (4·T)
//   Aspect ratio       AS  = smallest aperture dimension / T  (W ≤ L, or D)
//   Volume             V   = A·T   (the aperture, not the paste that reaches the pad)
//   Thickest foil      T_max = min(A / (AR_min·perimeter), W / AS_min)
//   Smallest round or square aperture at a thickness: D = max(4·AR_min, AS_min)·T
//
// When the stencil lifts off, the pad holds the paste over the area A and the
// aperture walls hold it over A_w; the paste stays on the pad only if A is
// large enough against A_w. The guideline values of IPC-7525 for laser-cut
// stencils are AR ≥ 0.66 and AS ≥ 1.5; both are inputs here.
//
// Rule of thumb for the paste: the smallest aperture dimension should span at
// least five of the largest solder particles. The particle sizes below are the
// upper sizes commonly listed for the IPC J-STD-005 powder types.

/** Guideline limits of IPC-7525 for laser-cut stencils. */
export const AR_MIN = 0.66;
export const ASPECT_MIN = 1.5;
/** Common foil thicknesses (mm): 80, 100, 120 µm, 5 mil, 150, 200 µm. */
export const COMMON_FOILS_MM = [0.08, 0.1, 0.12, 0.127, 0.15, 0.2];
/** Typical upper particle size (µm) of the IPC J-STD-005 powder types. */
export const PASTE_TYPES = {
  t3: { type: 3, maxUm: 45 },
  t4: { type: 4, maxUm: 38 },
  t5: { type: 5, maxUm: 25 },
};
/** Rule of thumb: this many of the largest particles across the smallest aperture dimension. */
export const BALLS_MIN = 5;
export const SHAPES = ['rect', 'circle'];

const TOL = 1e-9; // a limit that is met exactly must not fail on rounding noise
const pos = (x) => typeof x === 'number' && Number.isFinite(x) && x > 0;
const given = (x) => x !== undefined && x !== null && !(typeof x === 'number' && Number.isNaN(x));
const meets = (x, limit) => x >= limit * (1 - TOL);

/**
 * Area, wall perimeter and smallest dimension of an aperture (or a pad).
 * A rectangle entered with W > L is turned: the smaller side is the width.
 * @param {object} p
 * @param {'rect'|'circle'} p.shape
 * @param {number} [p.lengthMm], [p.widthMm]  rectangle
 * @param {number} [p.diameterMm]             circle
 */
export function apertureGeometry({ shape, lengthMm, widthMm, diameterMm }) {
  if (shape === 'circle') {
    return {
      shape: 'circle', lengthMm: null, widthMm: null, diameterMm, swapped: false,
      minDimMm: diameterMm, areaMm2: (Math.PI * diameterMm ** 2) / 4, perimeterMm: Math.PI * diameterMm,
    };
  }
  const l = Math.max(lengthMm, widthMm);
  const w = Math.min(lengthMm, widthMm);
  return {
    shape: 'rect', lengthMm: l, widthMm: w, diameterMm: null, swapped: widthMm > lengthMm,
    minDimMm: w, areaMm2: l * w, perimeterMm: 2 * (l + w),
  };
}

/** Wall area, area ratio, aspect ratio and volume of an aperture in a foil of thickness T. */
export function releaseRatios({ areaMm2, perimeterMm, minDimMm, thicknessMm }) {
  const wallAreaMm2 = perimeterMm * thicknessMm;
  return {
    wallAreaMm2,
    areaRatio: areaMm2 / wallAreaMm2,
    aspectRatio: minDimMm / thicknessMm,
    volumeMm3: areaMm2 * thicknessMm,
  };
}

/** Thickest foil that still meets the area ratio limit, the aspect ratio limit, and both. */
export function thickestFoil({ areaMm2, perimeterMm, minDimMm, arMin = AR_MIN, aspectMin = ASPECT_MIN }) {
  const tArMm = areaMm2 / (arMin * perimeterMm);
  const tAspectMm = minDimMm / aspectMin;
  return { tArMm, tAspectMm, tMaxMm: Math.min(tArMm, tAspectMm), tMaxBy: tArMm <= tAspectMm ? 'ar' : 'aspect' };
}

/** Largest common foil thickness that does not exceed tMaxMm; null when even the thinnest is too thick. */
export function commonFoil(tMaxMm) {
  let best = null;
  for (const f of COMMON_FOILS_MM) if (f <= tMaxMm * (1 + TOL)) best = f;
  return best;
}

/** True when every number in a (nested) result is finite; null marks "not applicable". */
function allFinite(x) {
  if (typeof x === 'number') return Number.isFinite(x);
  if (x && typeof x === 'object') return Object.values(x).every(allFinite);
  return true;
}

/**
 * The calculator.
 * @param {object} p
 * @param {'rect'|'circle'} p.shape
 * @param {number} [p.lengthMm], [p.widthMm]  rectangular aperture (mm)
 * @param {number} [p.diameterMm]             round aperture (mm)
 * @param {number} p.thicknessMm              foil thickness (mm)
 * @param {number} [p.arMin]                  minimum area ratio (default 0.66)
 * @param {number} [p.aspectMin]              minimum aspect ratio (default 1.5)
 * @param {number} [p.padLengthMm], [p.padWidthMm], [p.padDiameterMm]  copper pad of the same shape (optional)
 * @param {'none'|'t3'|'t4'|'t5'} [p.paste]   solder paste type for the five-particle rule (optional)
 * @returns {{ok: false, errors: string[]} | object} errors and warnings are message keys.
 */
export function stencil(p) {
  const fail = (...errors) => ({ ok: false, errors });
  if (!p || !SHAPES.includes(p.shape)) return fail('st_positive');
  const circle = p.shape === 'circle';
  const arMin = p.arMin ?? AR_MIN;
  const aspectMin = p.aspectMin ?? ASPECT_MIN;
  if (!pos(p.thicknessMm) || !pos(arMin) || !pos(aspectMin)) return fail('st_positive');
  if (circle ? !pos(p.diameterMm) : !(pos(p.lengthMm) && pos(p.widthMm))) return fail('st_positive');

  const warnings = [];
  const geo = apertureGeometry(p);
  const thicknessMm = p.thicknessMm;
  const ratios = releaseRatios({ ...geo, thicknessMm });
  const arPass = meets(ratios.areaRatio, arMin);
  const aspectPass = meets(ratios.aspectRatio, aspectMin);
  const max = thickestFoil({ ...geo, arMin, aspectMin });
  const foilMm = commonFoil(max.tMaxMm);
  if (foilMm === null) warnings.push('st_noFoil');

  // The same aperture in each of the common foils.
  const foils = COMMON_FOILS_MM.map((tMm) => {
    const x = releaseRatios({ ...geo, thicknessMm: tMm });
    return {
      tMm, areaRatio: x.areaRatio, aspectRatio: x.aspectRatio, volumeMm3: x.volumeMm3, volumeNl: x.volumeMm3 * 1000,
      pass: meets(x.areaRatio, arMin) && meets(x.aspectRatio, aspectMin),
    };
  });

  // Round and square apertures have AR = D/(4·T) and AS = D/T.
  const minFactor = Math.max(4 * arMin, aspectMin);

  // Copper pad of the same shape (optional): aperture area against pad area.
  let pad = null;
  const padDims = circle ? [p.padDiameterMm] : [p.padLengthMm, p.padWidthMm];
  const padGiven = padDims.filter(given).length;
  if (padGiven === padDims.length) {
    if (!padDims.every(pos)) return fail('st_positive');
    const g = apertureGeometry({ shape: p.shape, lengthMm: p.padLengthMm, widthMm: p.padWidthMm, diameterMm: p.padDiameterMm });
    const coverage = geo.areaMm2 / g.areaMm2;
    pad = {
      lengthMm: g.lengthMm, widthMm: g.widthMm, diameterMm: g.diameterMm, swapped: g.swapped, minDimMm: g.minDimMm, areaMm2: g.areaMm2,
      coverage, reduction: 1 - coverage, enlargement: coverage - 1,
    };
    if (coverage > 1 + TOL) warnings.push('st_overprint');
  } else if (padGiven > 0) {
    warnings.push('st_padOne'); // one side of a rectangular pad only
  }

  // Five of the largest particles across the smallest dimension (optional).
  let balls = null;
  const powder = Object.keys(PASTE_TYPES).includes(p.paste) ? PASTE_TYPES[p.paste] : null;
  if (powder) {
    const across = (geo.minDimMm * 1000) / powder.maxUm;
    balls = { paste: p.paste, type: powder.type, particleUm: powder.maxUm, across, min: BALLS_MIN, pass: meets(across, BALLS_MIN), minDimMm: (BALLS_MIN * powder.maxUm) / 1000 };
    if (!balls.pass) warnings.push('st_balls');
  }

  const r = {
    ok: true,
    ...geo,
    thicknessMm,
    arMin,
    aspectMin,
    ...ratios,
    volumeNl: ratios.volumeMm3 * 1000, // 1 mm³ = 1 µl = 1000 nl
    arPass,
    aspectPass,
    pass: arPass && aspectPass,
    verdict: arPass && aspectPass ? 'pass' : arPass ? 'aspect' : aspectPass ? 'ar' : 'both',
    ...max,
    foilMm,
    foils,
    minApertureMm: minFactor * thicknessMm,
    minApertureBy: 4 * arMin >= aspectMin ? 'ar' : 'aspect',
    pad,
    balls,
    warnings,
  };
  return allFinite(r) && ratios.areaRatio > 0 && max.tMaxMm > 0 ? r : fail('st_range');
}
