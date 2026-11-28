// Panel yield: how many rectangular boards fit on a panel, in which
// orientation, how much of the panel they use and how many panels an order
// needs. Lengths in mm. All boards have the same orientation (the whole array
// is turned by 90°); layouts that mix orientations are not searched.
//
//   Usable area        W_u = W − (rails left + right)      H_u = H − (rails top + bottom)
//   Span for boards    S_x = W_u − e (per edge that has a rail)      S_y likewise
//   Along one axis     n boards and n − 1 gaps must fit:  n·b + (n − 1)·g ≤ S
//                      ⟺ n = ⌊(S + g) / (b + g)⌋        (b = board dimension on that axis)
//   Boards per panel   N = n_x · n_y      0°: b_x = w, b_y = h      90°: b_x = h, b_y = w
//   Used area          U = N · w · h / (W · H)             waste = 1 − U
//   Leftover strip     L = S − n·b − (n − 1)·g
//   One more column    largest board  b' = (S − n·g) / (n + 1);   or gap  g' = (S − (n + 1)·b) / n
//   Panels needed      P = ⌈Q / (N · y)⌉                   (Q boards ordered, y expected yield)
//
// The board-to-rail spacing e applies only on an edge that has a rail: without
// a rail the boards may reach the panel edge (the page warns about that).

/** Rail options: none, top and bottom, left and right, all four edges. */
export const RAILS = ['none', 'tb', 'lr', 'all'];
/** Orientation: as drawn (0°), rotated by 90°, or the better of the two. */
export const ORIENTS = ['asis', 'rot', 'best'];
/** Separation between boards (only named in the result; the gap is an input). */
export const SEPS = ['vscore', 'routed'];
/** "One more column fits if the board is x narrower" is reported below this share of the board dimension. */
export const NEAR_FRAC = 0.1;
/** More boards than this on one panel is treated as an input error. */
export const MAX_COUNT = 1e9;

const EPS = 1e-9;
const fin = Number.isFinite;
const pos = (x) => typeof x === 'number' && fin(x) && x > 0;
const nonneg = (x) => typeof x === 'number' && fin(x) && x >= 0;
const given = (x) => x !== undefined && x !== null && !(typeof x === 'number' && Number.isNaN(x));
/** Rounding noise of a difference of lengths of size `scale` is zero. */
const snap = (x, scale) => (Math.abs(x) < EPS * Math.max(1, Math.abs(scale)) ? 0 : x);

/**
 * A quotient with the tolerance used before rounding down or up. A board that
 * fits exactly must count: three boards of 10.3 mm in 30.9 mm give
 * 30.9 / 10.3 = 2.9999999999999996 in floating point, and ⌊…⌋ of that would
 * be 2. The tolerance is 1e-9 (relative above 1), far below any real dimension.
 */
export const withTolerance = (q) => q + EPS * Math.max(1, Math.abs(q));

/**
 * Boards of size b with gap g along a span S.
 * @param {number} spanMm   free length S (mm); may be zero or negative (nothing fits)
 * @param {number} boardMm  board dimension along this axis (mm), > 0
 * @param {number} [gapMm]  gap between neighbouring boards (mm), ≥ 0
 * @returns {{q:number, n:number, usedMm:number, leftMm:number,
 *   more: null | {boardMm:number, shrinkMm:number, frac:number, gapMm:number|null}}}
 *   q = (S + g)/(b + g) before rounding down, n boards, the length they take,
 *   the strip left over, and what one board more would need: the largest board
 *   dimension, how much smaller that is (absolute and as a share of b) and,
 *   when a smaller gap alone would do, that gap. `more` is null when not even
 *   the gaps fit.
 */
export function fitAlong(spanMm, boardMm, gapMm = 0) {
  const q = (spanMm + gapMm) / (boardMm + gapMm);
  const n = Math.max(0, Math.floor(withTolerance(q)));
  const usedMm = n > 0 ? n * boardMm + (n - 1) * gapMm : 0;
  const leftMm = Math.max(0, snap(Math.max(0, spanMm) - usedMm, spanMm));
  const maxBoardMm = (spanMm - n * gapMm) / (n + 1);
  let more = null;
  if (maxBoardMm > 0) {
    const shrinkMm = boardMm - maxBoardMm;
    const gapNeed = n > 0 ? snap((spanMm - (n + 1) * boardMm) / n, gapMm) : -1;
    more = { boardMm: maxBoardMm, shrinkMm, frac: shrinkMm / boardMm, gapMm: gapNeed >= 0 ? gapNeed : null };
  }
  return { q, n, usedMm, leftMm, more };
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
 * @param {number} p.boardWMm, p.boardHMm   board width and height as drawn (mm)
 * @param {number} p.panelWMm, p.panelHMm   outer size of the panel (mm)
 * @param {'none'|'tb'|'lr'|'all'} [p.rails] edges that carry a rail (default none)
 * @param {number} [p.railMm]               rail width (mm); not looked at without rails
 * @param {number} p.gapMm                  gap between boards (mm), 0 for V-score
 * @param {number} [p.edgeMm]               gap between the boards and a rail (mm); default = gapMm
 * @param {'asis'|'rot'|'best'} [p.orient]  orientation (default best)
 * @param {'vscore'|'routed'} [p.sep]       how the boards are separated (for the warnings only)
 * @param {number} [p.qty]                  boards ordered (whole number); without it no panel count
 * @param {number} [p.yieldFrac]            expected yield 0 … 1 (default 1)
 * @returns {{ok: false, errors: string[]} | object} errors and warnings are message keys.
 */
export function panel(p) {
  const fail = (...errors) => ({ ok: false, errors });
  if (!p) return fail('pn_positive');
  const rails = p.rails ?? 'none';
  const orient = p.orient ?? 'best';
  if (!RAILS.includes(rails) || !ORIENTS.includes(orient)) return fail('pn_positive');
  const sep = SEPS.includes(p.sep) ? p.sep : null;
  const { boardWMm, boardHMm, panelWMm, panelHMm, gapMm } = p;
  if (![boardWMm, boardHMm, panelWMm, panelHMm].every(pos) || !nonneg(gapMm)) return fail('pn_positive');
  // Without rails neither the rail width nor the board-to-rail spacing is looked at.
  const railMm = rails === 'none' ? 0 : p.railMm;
  const edgeGiven = rails !== 'none' && given(p.edgeMm);
  const edgeMm = rails === 'none' ? 0 : edgeGiven ? p.edgeMm : gapMm;
  if (!nonneg(railMm) || !nonneg(edgeMm)) return fail('pn_positive');
  const qtyGiven = given(p.qty);
  const yieldFrac = given(p.yieldFrac) ? p.yieldFrac : 1;
  if (qtyGiven && !(pos(p.qty) && Number.isInteger(p.qty))) return fail('pn_qty');
  if (qtyGiven && !(pos(yieldFrac) && yieldFrac <= 1)) return fail('pn_yield');

  const onX = rails === 'lr' || rails === 'all'; // rails on the left and right edges
  const onY = rails === 'tb' || rails === 'all'; // rails on the top and bottom edges
  const rail = { left: onX ? railMm : 0, right: onX ? railMm : 0, top: onY ? railMm : 0, bottom: onY ? railMm : 0 };
  // The spacing to a rail exists only where there is a rail.
  const edge = {
    left: rail.left > 0 ? edgeMm : 0, right: rail.right > 0 ? edgeMm : 0,
    top: rail.top > 0 ? edgeMm : 0, bottom: rail.bottom > 0 ? edgeMm : 0,
  };
  const usableWMm = panelWMm - rail.left - rail.right;
  const usableHMm = panelHMm - rail.top - rail.bottom;
  if (!(usableWMm > 0 && usableHMm > 0)) return fail('pn_rails');
  const spanXMm = usableWMm - edge.left - edge.right;
  const spanYMm = usableHMm - edge.top - edge.bottom;

  // One orientation for all boards; the array is centred in its span.
  const layout = (rotated) => {
    const boardXMm = rotated ? boardHMm : boardWMm;
    const boardYMm = rotated ? boardWMm : boardHMm;
    const x = fitAlong(spanXMm, boardXMm, gapMm);
    const y = fitAlong(spanYMm, boardYMm, gapMm);
    return {
      rotated, boardXMm, boardYMm,
      qx: x.q, qy: y.q, nx: x.n, ny: y.n, count: x.n * y.n,
      arrayWMm: x.usedMm, arrayHMm: y.usedMm,
      leftXMm: x.leftMm, leftYMm: y.leftMm,
      moreX: x.more && { ...x.more, count: (x.n + 1) * y.n },
      moreY: y.more && { ...y.more, count: x.n * (y.n + 1) },
      originXMm: rail.left + edge.left + x.leftMm / 2,
      originYMm: rail.top + edge.top + y.leftMm / 2,
    };
  };
  const fits = { asis: layout(false), rot: layout(true) };
  // "Best": the orientation with more boards; a tie keeps the board as drawn.
  const chosen = orient === 'best' ? (fits.rot.count > fits.asis.count ? 'rot' : 'asis') : orient;
  const fit = fits[chosen];
  const other = fits[chosen === 'asis' ? 'rot' : 'asis'];
  const count = fit.count;
  if (!(Math.max(fits.asis.count, fits.rot.count) <= MAX_COUNT)) return fail('pn_range');

  const boardAreaMm2 = boardWMm * boardHMm;
  const panelAreaMm2 = panelWMm * panelHMm;
  const usedFrac = (count * boardAreaMm2) / panelAreaMm2;

  // Panels for the order: P = ⌈Q / (N·y)⌉, with the same tolerance as above
  // (57 boards at 12 · 95 % = 11.4 good boards per panel are 5 panels, although
  // 57 / 11.4 = 5.000000000000001 in floating point).
  let order = null;
  if (qtyGiven && count > 0) {
    const goodPerPanel = count * yieldFrac;
    const panelsExact = p.qty / goodPerPanel;
    const panels = Math.max(1, Math.ceil(panelsExact - EPS * Math.max(1, panelsExact)));
    const boards = panels * count;
    const expectedGood = boards * yieldFrac;
    order = {
      qty: p.qty, yieldFrac, goodPerPanel, panelsExact, panels, boards, expectedGood,
      spare: Math.max(0, snap(expectedGood - p.qty, p.qty)), spareAllGood: boards - p.qty,
    };
  }

  const warnings = [];
  // Nothing fits: in this orientation only, or in neither.
  if (count === 0) warnings.push(other.count > 0 ? 'pn_noFit' : 'pn_noFitAny');
  if (orient !== 'best' && other.count > count) warnings.push('pn_otherBetter');
  if (count > 0 && rails === 'none') warnings.push('pn_noRail');
  if (count > 0 && sep === 'routed' && gapMm === 0) warnings.push('pn_routedZero');
  // A column or row more for a slightly smaller board (only worth saying when it adds boards).
  const near = (m) => !!m && m.frac < NEAR_FRAC && m.count > count;
  if (near(fit.moreX)) warnings.push('pn_moreCol');
  if (near(fit.moreY)) warnings.push('pn_moreRow');

  const r = {
    ok: true,
    boardWMm, boardHMm, panelWMm, panelHMm,
    rails, railMm, rail, gapMm, edgeMm, edgeGiven, edge, sep,
    railsX: onX && railMm > 0, railsY: onY && railMm > 0,
    usableWMm, usableHMm, spanXMm, spanYMm,
    orient, chosen, fits, fit, other,
    count,
    boardAreaMm2, panelAreaMm2, usedFrac, wasteFrac: 1 - usedFrac,
    order,
    warnings,
  };
  return allFinite(r) ? r : fail('pn_range');
}
