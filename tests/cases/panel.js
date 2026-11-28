// Panel yield (src/engine/panel.js, src/pages/panel.js).
// Expected values are worked out by hand in the comments.

import { near, eq, ok } from '../assert.js';
import { panel, fitAlong, withTolerance, RAILS, ORIENTS, SEPS, NEAR_FRAC, MAX_COUNT } from '../../src/engine/panel.js';
import { registerStrings, setLang, getLang } from '../../src/i18n.js';
import { stepsTrace, parseNumber } from '../../src/ui/calculator.js';
import { evaluate, agrees } from './arith.js';
import page, { MAX_DRAWN } from '../../src/pages/panel.js';

registerStrings(page.strings);

// The hand check of the brief: panel 250 × 200 mm, 5 mm rails top and bottom,
// board 50 × 35 mm, routed with a 2 mm gap (board-to-rail gap = the gap).
const base = { boardWMm: 50, boardHMm: 35, panelWMm: 250, panelHMm: 200, rails: 'tb', railMm: 5, gapMm: 2, orient: 'best', sep: 'routed' };
const calc = (o = {}) => panel({ ...base, ...o });
const grid = (f) => `${f.nx}x${f.ny}=${f.count}`;

/** True when no number anywhere in the result is NaN or infinite. */
function finiteAll(x) {
  if (typeof x === 'number') return Number.isFinite(x);
  if (x && typeof x === 'object') return Object.values(x).every(finiteAll);
  return true;
}

// ---- Page helpers: field values as the form would hold them ----
const fields = page.sections.flatMap((s) => s.fields);
function inputs(set = {}) {
  const v = {};
  const u = {};
  for (const f of fields) {
    const val = set[f.key] ?? f.default;
    const raw = val === undefined || val === null ? '' : String(val);
    v[f.key] = f.type === 'number' ? parseNumber(raw, f.si) : raw;
    if (f.type === 'number') u[f.key] = set[`${f.key}_u`] ?? f.unit ?? f.units?.[0];
  }
  return { v, u };
}
/** Render one set of inputs: result, HTML, the recorded steps and the diagram. */
function show(set) {
  const { v, u } = inputs(set);
  const r = page.compute(v, u);
  const seen = [];
  stepsTrace.record = (items) => seen.push(...items);
  let html;
  try { html = page.render(r, v, u); } finally { stepsTrace.record = null; }
  return { r, html, steps: seen, svg: page.diagram(v, u, r.ok === false ? undefined : r) };
}
function inBothLanguages(fn) {
  const before = getLang();
  try {
    for (const l of ['tr', 'en']) { setLang(l); fn(l); }
  } finally {
    setLang(before);
  }
}
/** Problems of a diagram: a missing number, a comma in geometry, a shape of negative size or outside the drawing. */
function svgProblems(svgText) {
  const bad = [];
  if (/NaN|undefined|Infinity/.test(svgText)) bad.push('NaN/undefined/Infinity');
  const [, , , W, H] = svgText.match(/viewBox="(\S+) (\S+) (\S+) (\S+)"/).map(Number);
  if (!(W > 0 && H > 0)) bad.push('viewBox');
  for (const [, tag, attrs] of svgText.matchAll(/<(rect|circle|text)\b([^>]*)>/g)) {
    const a = Object.fromEntries([...attrs.matchAll(/\s(x|y|cx|cy|r|width|height)="([^"]*)"/g)].map(([, k, val]) => [k, val]));
    for (const [k, val] of Object.entries(a)) if (!/^-?\d+(\.\d+)?$/.test(val)) bad.push(`${tag} ${k}="${val}"`);
    if (tag === 'rect') {
      const [x, y, w, h] = [a.x, a.y, a.width, a.height].map(Number);
      if (w < 0 || h < 0 || x < 0 || y < 0 || x + w > W + 0.5 || y + h > H + 0.5) bad.push(`rect ${x},${y} ${w}×${h}`);
    }
    if (tag === 'text' && !(Number(a.x) >= 0 && Number(a.x) <= W && Number(a.y) >= 0 && Number(a.y) <= H)) bad.push(`text at ${a.x},${a.y}`);
  }
  for (const [, val] of svgText.matchAll(/\s(?:d|points)="([^"]*)"/g)) {
    const nums = (val.match(/-?\d+(\.\d+)?(e[-+]?\d+)?/gi) ?? []).map(Number);
    if (nums.some((x) => x < -0.5 || x > Math.max(W, H) + 0.5)) bad.push(`path outside the drawing: ${val.slice(0, 40)}`);
    if (/\d,\d+,\d/.test(val.replace(/[A-Za-z]/g, ' '))) bad.push(`comma in ${val.slice(0, 40)}`);
  }
  return bad;
}
const geometryCount = (svgText) => [...svgText.matchAll(/\s(?:d|points|transform|x|y|cx|cy|r|width|height)="([^"]*)"/g)]
  .reduce((n, [, val]) => n + (val.match(/-?(\d+\.?\d*|\.\d+)/g) ?? []).length, 0);
/** The board rectangles of a drawing (without the swatch of the legend): [[x, y, w, h], …]. */
const boardRects = (svgText) => [...svgText.matchAll(/<rect class="zone-ok" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)]
  .map((m) => m.slice(1).map(Number)).slice(0, -1);

export const cases = [
  ['panel: the hand check — 250 × 200 mm panel, rails top and bottom, 50 × 35 mm boards, 2 mm gap', () => {
    const r = calc();
    eq(r.ok, true);
    // Usable area: 250 × (200 − 2·5) = 250 × 190 mm. No rail left and right: no board-to-rail gap there.
    eq(r.usableWMm, 250);
    eq(r.usableHMm, 190);
    eq(r.spanXMm, 250);
    eq(r.spanYMm, 186, '190 − 2·2');
    eq(r.edgeMm, 2, 'the board-to-rail gap defaults to the gap');
    eq(r.edgeGiven, false);
    eq(`${r.edge.left}${r.edge.right}${r.edge.top}${r.edge.bottom}`, '0022');
    eq(`${r.railsX}/${r.railsY}`, 'false/true');
    // 0°: columns ⌊(250 + 2)/(50 + 2)⌋ = ⌊4.846⌋ = 4, rows ⌊(186 + 2)/(35 + 2)⌋ = ⌊5.081⌋ = 5 → 20
    near(r.fits.asis.qx, 252 / 52, 1e-12);
    near(r.fits.asis.qy, 188 / 37, 1e-12);
    eq(grid(r.fits.asis), '4x5=20');
    // 90°: columns ⌊252/37⌋ = ⌊6.811⌋ = 6, rows ⌊188/52⌋ = ⌊3.615⌋ = 3 → 18
    near(r.fits.rot.qx, 6.810811, 1e-6);
    near(r.fits.rot.qy, 3.615385, 1e-6);
    eq(grid(r.fits.rot), '6x3=18');
    eq(r.fits.rot.boardXMm, 35);
    eq(r.fits.rot.boardYMm, 50);
    // Best of the two: 20 boards as drawn. Used area 20 · 1750 / 50 000 = 70 %.
    eq(r.chosen, 'asis');
    eq(r.count, 20);
    eq(r.fit, r.fits.asis);
    eq(r.other, r.fits.rot);
    near(r.usedFrac, 0.7, 1e-12);
    near(r.wasteFrac, 0.3, 1e-12);
    eq(r.boardAreaMm2, 1750);
    eq(r.panelAreaMm2, 50000);
    eq(RAILS.join(), 'none,tb,lr,all');
    eq(ORIENTS.join(), 'asis,rot,best');
    eq(SEPS.join(), 'vscore,routed');
  }],

  ['panel: rails on other edges; the board-to-rail gap applies only where there is a rail', () => {
    // All four: usable 240 × 190, span 236 × 186 → 0°: ⌊238/52⌋ = 4, ⌊188/37⌋ = 5 → 20; 90°: ⌊238/37⌋ = 6, ⌊188/52⌋ = 3 → 18
    const all = calc({ rails: 'all' });
    eq(`${all.usableWMm}x${all.usableHMm}`, '240x190');
    eq(`${all.spanXMm}x${all.spanYMm}`, '236x186');
    eq(grid(all.fits.asis), '4x5=20');
    eq(grid(all.fits.rot), '6x3=18');
    // The array (4·50 + 3·2 = 206 mm wide, 5·35 + 4·2 = 183 mm high) is centred in its span:
    // x = 5 + 2 + (236 − 206)/2 = 22 mm, y = 5 + 2 + (186 − 183)/2 = 8.5 mm
    eq(all.fit.arrayWMm, 206);
    eq(all.fit.arrayHMm, 183);
    near(all.fit.originXMm, 22, 1e-12);
    near(all.fit.originYMm, 8.5, 1e-12);
    // Left and right only: usable 240 × 200, span 236 × 200 → rows ⌊202/37⌋ = 5; 90°: 6 × ⌊202/52⌋ = 6 × 3
    const lr = calc({ rails: 'lr' });
    eq(`${lr.spanXMm}x${lr.spanYMm}`, '236x200');
    eq(grid(lr.fits.asis), '4x5=20');
    eq(grid(lr.fits.rot), '6x3=18');
    eq(`${lr.edge.left}${lr.edge.right}${lr.edge.top}${lr.edge.bottom}`, '2200');
    // No rails: the whole panel, no board-to-rail gap anywhere; rail width and that gap are not looked at.
    const none = calc({ rails: 'none', railMm: -7, edgeMm: -3 });
    eq(none.ok, true);
    eq(`${none.spanXMm}x${none.spanYMm}`, '250x200');
    eq(none.railMm, 0);
    eq(none.edgeMm, 0);
    eq(grid(none.fits.asis), '4x5=20');
    near(none.fit.originXMm, 22, 1e-12, '(250 − 206)/2');
    // A rail of width 0 is no rail: the gap to it does not apply either.
    const zero = calc({ railMm: 0 });
    eq(zero.spanYMm, 200);
    eq(zero.railsY, false);
    eq(zero.edge.top, 0);
    // The default is no rails, best orientation.
    eq(panel({ boardWMm: 50, boardHMm: 35, panelWMm: 250, panelHMm: 200, gapMm: 2 }).rails, 'none');
    eq(panel({ boardWMm: 50, boardHMm: 35, panelWMm: 250, panelHMm: 200, gapMm: 2 }).orient, 'best');
  }],

  ['panel: V-score (gap 0) and the best orientation; a tie keeps the board as drawn', () => {
    // No rails, gap 0: 0°: ⌊250/50⌋ = 5, ⌊200/35⌋ = ⌊5.71⌋ = 5 → 25 (87.5 %); 90°: ⌊250/35⌋ = 7, ⌊200/50⌋ = 4 → 28 (98 %)
    const v = calc({ rails: 'none', gapMm: 0, sep: 'vscore' });
    eq(grid(v.fits.asis), '5x5=25');
    eq(grid(v.fits.rot), '7x4=28');
    eq(v.chosen, 'rot');
    eq(v.count, 28);
    near(v.usedFrac, 0.98, 1e-12);
    // A fixed orientation is kept even when the other one is better, with a note.
    const fixed = calc({ rails: 'none', gapMm: 0, sep: 'vscore', orient: 'asis' });
    eq(fixed.chosen, 'asis');
    eq(fixed.count, 25);
    near(fixed.usedFrac, 0.875, 1e-12);
    ok(fixed.warnings.includes('pn_otherBetter'), 'the other orientation is better');
    eq(calc({ rails: 'none', gapMm: 0, orient: 'rot' }).count, 28);
    ok(!calc({ rails: 'none', gapMm: 0, orient: 'rot' }).warnings.includes('pn_otherBetter'), 'no note for the better one');
    // Eurocard 100 × 160 mm on 457 × 610 mm, 2 mm gap: 0°: ⌊459/102⌋ = 4, ⌊612/162⌋ = 3 → 12; 90°: ⌊459/162⌋ = 2, ⌊612/102⌋ = 6 → 12
    const tie = calc({ boardWMm: 100, boardHMm: 160, panelWMm: 457, panelHMm: 610, rails: 'none' });
    eq(grid(tie.fits.asis), '4x3=12');
    eq(grid(tie.fits.rot), '2x6=12');
    eq(tie.chosen, 'asis', 'a tie keeps the board as drawn');
    near(tie.usedFrac, 192000 / 278770, 1e-12);
    // A square board: both orientations are the same.
    const sq = calc({ boardWMm: 40, boardHMm: 40 });
    eq(sq.fits.asis.count, sq.fits.rot.count);
    eq(sq.chosen, 'asis');
  }],

  ['panel: a board that fits exactly counts, despite floating point', () => {
    // 30.9 / 10.3 = 2.9999999999999996 in floating point; three boards of 10.3 mm fit in 30.9 mm.
    ok(30.9 / 10.3 < 3, 'the quotient is below 3 without a tolerance');
    eq(fitAlong(30.9, 10.3, 0).n, 3);
    eq(fitAlong(30.9, 10.3, 0).leftMm, 0);
    // With a gap: 3·10.3 + 2·2 = 34.9 mm.
    eq(fitAlong(34.9, 10.3, 2).n, 3);
    // 2·49 + 2 = 100 mm; a panel of the size of the board holds one.
    eq(fitAlong(100, 49, 2).n, 2);
    eq(fitAlong(50, 50, 2).n, 1);
    eq(fitAlong(50, 50, 0).q, 1);
    // A real shortfall is not rounded away: 0.01 mm too short is too short.
    eq(fitAlong(30.89, 10.3, 0).n, 2);
    eq(fitAlong(99.99, 50, 0).n, 1);
    eq(fitAlong(49.999, 50, 2).n, 0);
    // The tolerance is 1e-9.
    near(withTolerance(3) - 3, 3e-9, 1e-6);
    near(withTolerance(0.5) - 0.5, 1e-9, 1e-6);
    // The whole panel: 10.3 × 10.3 mm boards on 30.9 × 61.8 mm → 3 × 6 = 18 boards, 100 % used.
    const full = panel({ boardWMm: 10.3, boardHMm: 10.3, panelWMm: 30.9, panelHMm: 61.8, gapMm: 0 });
    eq(full.count, 18);
    near(full.usedFrac, 1, 1e-12);
    eq(full.fit.leftXMm, 0);
    eq(full.fit.leftYMm, 0);
    // Board = panel: one board.
    eq(panel({ boardWMm: 100, boardHMm: 80, panelWMm: 100, panelHMm: 80, gapMm: 2 }).count, 1);
    // Nothing fits in a span of zero or less.
    eq(fitAlong(0, 10, 2).n, 0);
    eq(fitAlong(-5, 10, 2).n, 0);
    eq(fitAlong(-5, 10, 2).leftMm, 0);
    eq(fitAlong(-5, 10, 2).more, null);
  }],

  ['panel: a board-to-rail gap of its own', () => {
    // e = 0: span 250 × 190 → rows ⌊192/37⌋ = ⌊5.19⌋ = 5, leftover 190 − 183 = 7 mm
    const touch = calc({ edgeMm: 0 });
    eq(touch.edgeGiven, true);
    eq(touch.spanYMm, 190);
    eq(grid(touch.fit), '4x5=20');
    near(touch.fit.leftYMm, 7, 1e-12);
    // e = 5: span 250 × 180 → 0°: rows ⌊182/37⌋ = ⌊4.92⌋ = 4 → 16; 90°: 6 × ⌊182/52⌋ = 6 × 3 = 18 → rotated
    const wide = calc({ edgeMm: 5 });
    eq(wide.spanYMm, 180);
    eq(grid(wide.fits.asis), '4x4=16');
    eq(grid(wide.fits.rot), '6x3=18');
    eq(wide.chosen, 'rot');
    near(wide.usedFrac, 0.63, 1e-12, '18 · 1750 / 50 000');
    // A gap that eats the usable height: span 190 − 2·100 < 0 → no board, but no error.
    const eaten = calc({ edgeMm: 100 });
    eq(eaten.ok, true);
    eq(eaten.spanYMm, -10);
    eq(eaten.count, 0);
    ok(eaten.warnings.includes('pn_noFitAny'), 'no fit');
  }],

  ['panel: leftover strips and what one more column or row needs', () => {
    const r = calc();
    // Horizontal: 250 − (4·50 + 3·2) = 44 mm left. Five columns need 5·w + 4·2 ≤ 250 → w ≤ 48.4 mm: 1.6 mm (3.2 %) narrower.
    // With the gap alone: (250 − 5·50)/4 = 0 mm → five columns with a gap of 0.
    near(r.fit.leftXMm, 44, 1e-12);
    near(r.fit.moreX.boardMm, 48.4, 1e-12);
    near(r.fit.moreX.shrinkMm, 1.6, 1e-9);
    near(r.fit.moreX.frac, 0.032, 1e-9);
    eq(r.fit.moreX.gapMm, 0);
    eq(r.fit.moreX.count, 25);
    // Vertical: 186 − (5·35 + 4·2) = 3 mm left. Six rows need h ≤ (186 − 5·2)/6 = 29.333 mm: 5.667 mm (16.2 %) lower; no gap does it.
    near(r.fit.leftYMm, 3, 1e-12);
    near(r.fit.moreY.boardMm, 29.333333, 1e-6);
    near(r.fit.moreY.shrinkMm, 5.666667, 1e-6);
    near(r.fit.moreY.frac, 0.161905, 1e-5);
    eq(r.fit.moreY.gapMm, null);
    eq(r.fit.moreY.count, 24);
    // The hint is given below 10 % of the board dimension: for the column, not for the row.
    eq(NEAR_FRAC, 0.1);
    ok(r.warnings.includes('pn_moreCol') && !r.warnings.includes('pn_moreRow'), 'column hint only');
    // The board made that much narrower really gains the column.
    eq(calc({ boardWMm: 48.4 }).fits.asis.nx, 5);
    eq(calc({ boardWMm: 48.41 }).fits.asis.nx, 4);
    eq(calc({ gapMm: 0, edgeMm: 2 }).fits.asis.nx, 5, 'or with the gap closed');
    // 45 mm wide: ⌊252/47⌋ = 5 columns; a sixth needs (250 − 10)/6 = 40 mm, 5 mm = 11.1 % less → no hint. 44 mm: 4 mm = 9.1 % → hint.
    ok(!calc({ boardWMm: 45 }).warnings.includes('pn_moreCol'), '11.1 %');
    ok(calc({ boardWMm: 44 }).warnings.includes('pn_moreCol'), '9.1 %');
    // A wider panel: (255 − 250)/4 = 1.25 mm gap would give the fifth column.
    near(calc({ panelWMm: 255 }).fit.moreX.gapMm, 1.25, 1e-12);
    // No hint for a column that adds no board (no row fits).
    const noRow = calc({ boardHMm: 300, orient: 'asis' });
    eq(noRow.count, 0);
    ok(!noRow.warnings.includes('pn_moreCol'), 'a column of nothing');
    // The leftover of an exact fit is 0, not rounding noise.
    eq(calc({ boardWMm: 61, panelWMm: 250, gapMm: 2 }).fit.leftXMm, 0, '4·61 + 3·2 = 250');
  }],

  ['panel: panels for an order, with yield', () => {
    // 100 boards at 20 per panel: 5 panels, nothing spare.
    const o = calc({ qty: 100 }).order;
    eq(o.panels, 5);
    eq(o.boards, 100);
    eq(o.spare, 0);
    eq(o.yieldFrac, 1);
    // 101 boards: 6 panels, 120 boards, 19 spare.
    const o2 = calc({ qty: 101 }).order;
    eq(o2.panels, 6);
    eq(o2.boards, 120);
    eq(o2.spare, 19);
    // Yield 95 %: 19 good boards per panel → ⌈100/19⌉ = ⌈5.26⌉ = 6 panels, 120 boards, 114 good expected, 14 beyond the order.
    const y = calc({ qty: 100, yieldFrac: 0.95 }).order;
    near(y.goodPerPanel, 19, 1e-12);
    near(y.panelsExact, 5.263158, 1e-6);
    eq(y.panels, 6);
    eq(y.boards, 120);
    near(y.expectedGood, 114, 1e-12);
    near(y.spare, 14, 1e-9);
    eq(y.spareAllGood, 20);
    // 24 boards per panel at 95 %: 22.8 good → 114 boards are exactly 5 panels, although 114/22.8 = 5.000000000000001.
    const m = { boardWMm: 20, boardHMm: 15, panelWMm: 100, panelHMm: 100, rails: 'all', railMm: 5, gapMm: 0, sep: 'vscore' };
    eq(calc(m).count, 24, 'usable 90 × 90 mm: 4 × 6');
    ok(114 / (24 * 0.95) > 5, 'the quotient is above 5 without a tolerance');
    eq(calc({ ...m, qty: 114, yieldFrac: 0.95 }).order.panels, 5);
    eq(calc({ ...m, qty: 115, yieldFrac: 0.95 }).order.panels, 6);
    // One board is one panel; without a quantity there is no panel count; yield is then not looked at.
    eq(calc({ qty: 1 }).order.panels, 1);
    eq(calc().order, null);
    eq(calc({ yieldFrac: 7 }).ok, true);
    // No board on the panel: no panel count either.
    eq(calc({ boardWMm: 300, boardHMm: 300, qty: 10 }).order, null);
  }],

  ['panel: a board larger than the usable area gives 0 boards with a message', () => {
    // 300 × 35 mm: too wide as drawn (300 > 250) and too high when turned (300 > 186).
    const r = calc({ boardWMm: 300 });
    eq(r.ok, true);
    eq(r.count, 0);
    eq(grid(r.fits.asis), '0x5=0');
    eq(grid(r.fits.rot), '6x0=0');
    eq(r.usedFrac, 0);
    eq(r.wasteFrac, 1);
    eq(r.warnings.join(), 'pn_noFitAny', 'fits in neither orientation');
    eq(calc({ boardWMm: 300, rails: 'none', gapMm: 0 }).warnings.join(), 'pn_noFitAny', 'no other hints for an empty panel');
    // To fit at all it must be 50 mm narrower (250 mm at most).
    near(r.fit.moreX.boardMm, 250, 1e-12);
    near(r.fit.moreX.shrinkMm, 50, 1e-12);
    eq(r.fit.moreX.gapMm, null);
    // 35 × 240 mm: too high as drawn (240 > 186), but 1 × 5 when turned (240 ≤ 250, 5 rows of 35 mm).
    const turned = calc({ boardWMm: 35, boardHMm: 240 });
    eq(grid(turned.fits.asis), '6x0=0');
    eq(grid(turned.fits.rot), '1x5=5');
    eq(turned.chosen, 'rot');
    eq(turned.count, 5);
    const stuck = calc({ boardWMm: 35, boardHMm: 240, orient: 'asis' });
    eq(stuck.count, 0);
    eq(stuck.warnings.join(), 'pn_noFit,pn_otherBetter', 'does not fit, the other orientation does');
  }],

  ['panel: warnings for missing rails and a routed gap of zero', () => {
    eq(calc().warnings.join(), 'pn_moreCol');
    ok(calc({ rails: 'none' }).warnings.includes('pn_noRail'), 'no rails');
    for (const rails of ['tb', 'lr', 'all']) ok(!calc({ rails }).warnings.includes('pn_noRail'), rails);
    ok(calc({ gapMm: 0 }).warnings.includes('pn_routedZero'), 'routed, gap 0');
    ok(!calc({ gapMm: 0, sep: 'vscore' }).warnings.includes('pn_routedZero'), 'V-score, gap 0');
    ok(!calc({ gapMm: 0, sep: undefined }).warnings.includes('pn_routedZero'), 'separation not named');
    eq(calc({ sep: 'laser' }).sep, null, 'an unknown separation is ignored');
    ok(!calc({ gapMm: 0.5 }).warnings.includes('pn_routedZero'), 'a small gap is the reader’s business');
  }],

  ['panel: invalid input is reported, not calculated', () => {
    const err = (r) => (r.ok ? 'ok' : r.errors.join());
    eq(err(panel(undefined)), 'pn_positive');
    eq(err(calc({ rails: 'top' })), 'pn_positive');
    eq(err(calc({ orient: 'both' })), 'pn_positive');
    for (const k of ['boardWMm', 'boardHMm', 'panelWMm', 'panelHMm']) {
      for (const x of [0, -1, NaN, Infinity, undefined, null, '50']) eq(err(calc({ [k]: x })), 'pn_positive', `${k} = ${x}`);
    }
    for (const x of [-1, NaN, Infinity, undefined, null, '2']) eq(err(calc({ gapMm: x })), 'pn_positive', `gap ${x}`);
    for (const x of [-1, NaN, Infinity, undefined, '5']) eq(err(calc({ railMm: x })), 'pn_positive', `rail ${x}`);
    for (const x of [-1, Infinity, '2']) eq(err(calc({ edgeMm: x })), 'pn_positive', `edge ${x}`);
    eq(calc({ edgeMm: NaN }).edgeGiven, false, 'an empty board-to-rail gap is "not given"');
    eq(calc({ gapMm: 0, railMm: 0, edgeMm: 0 }).ok, true, 'zero is allowed for gaps and rails');
    // Rails that leave nothing: 2 · 100 mm on a 200 mm panel.
    eq(err(calc({ railMm: 100 })), 'pn_rails');
    eq(err(calc({ railMm: 150, rails: 'all' })), 'pn_rails');
    eq(calc({ railMm: 99 }).ok, true);
    // Order.
    for (const x of [0, -5, 1.5, Infinity, '100']) eq(err(calc({ qty: x })), 'pn_qty', `qty ${x}`);
    for (const x of [0, -0.1, 1.01, Infinity]) eq(err(calc({ qty: 10, yieldFrac: x })), 'pn_yield', `yield ${x}`);
    eq(calc({ qty: 10, yieldFrac: 1 }).ok, true);
    // More than a billion boards per panel is an input error, as are numbers that overflow.
    eq(MAX_COUNT, 1e9);
    eq(err(calc({ boardWMm: 1e-3, boardHMm: 1e-3, gapMm: 0 })), 'pn_range');
    eq(err(calc({ panelWMm: 1e200, panelHMm: 1e200 })), 'pn_range');
  }],

  ['panel: absurd numbers never give NaN or Infinity', () => {
    const odd = [0, -1, 1e-300, 5e-324, 1e-30, 1e-9, 0.1, 1e9, 1e30, 1e300, NaN, Infinity, -Infinity, undefined, null];
    const keys = ['boardWMm', 'boardHMm', 'panelWMm', 'panelHMm', 'railMm', 'gapMm', 'edgeMm', 'qty', 'yieldFrac'];
    let good = 0;
    for (const rails of RAILS) {
      for (const orient of ORIENTS) {
        const start = { ...base, rails, orient, edgeMm: 1, qty: 100, yieldFrac: 0.9 };
        for (const k of keys) {
          for (const x of odd) {
            const r = panel({ ...start, [k]: x });
            const where = `${rails}/${orient} ${k} = ${x}`;
            if (r.ok) {
              good++;
              ok(finiteAll(r), `${where}: a number is not finite`);
              ok(Number.isInteger(r.count) && r.count >= 0 && r.count === r.fit.nx * r.fit.ny, `${where}: count`);
              ok(r.usedFrac >= 0 && r.usedFrac <= 1 + 1e-9, `${where}: used area ${r.usedFrac}`);
              ok(r.fit.leftXMm >= 0 && r.fit.leftYMm >= 0, `${where}: negative leftover`);
              ok(!r.order || (Number.isInteger(r.order.panels) && r.order.panels >= 1 && r.order.spare >= 0), `${where}: order`);
            } else {
              ok(Array.isArray(r.errors) && r.errors.length > 0 && r.errors.every((e) => typeof e === 'string'), `${where}: no error key`);
            }
          }
        }
      }
    }
    ok(good > 150, `some of the odd values are still valid inputs (${good})`);
  }],

  ['panel page: every option and example renders steps whose numbers give the result', () => {
    const optionSets = fields.flatMap((f) => (f.options ?? []).map((o) => ({ [f.key]: o.value, ...(o.set ?? {}) })));
    const sets = [
      {}, ...optionSets,
      { rails: 'all', e: 0 }, { rails: 'lr', e: 3.5, rot: 'rot' }, { rails: 'none', sep: 'vscore', g: 0, rot: 'asis', qty: 114, yld: 95 },
      { bw: 48.4 }, { bw: 10.3, bh: 10.3, pw: 30.9, ph: 61.8, rails: 'none', g: 0, sep: 'vscore' }, { bw: 300 }, { bw: 35, bh: 240, rot: 'asis' },
      { bw: 2, bw_u: 'in', bh: 1.5, bh_u: 'in', pw: 18, pw_u: 'in', ph: 24, ph_u: 'in', g: 80, g_u: 'mil', rw: 0.4, rw_u: 'in' },
      { qty: '', yld: '' }, { qty: 1 }, { qty: 12345, yld: 97.5 }, { e: 100 }, { bw: 1.27, bh: 2.54, g: 0.3, rails: 'all', rw: 7.5 },
    ];
    const problems = [];
    let checked = 0;
    inBothLanguages((lang) => {
      for (const set of sets) {
        const where = `${lang} ${JSON.stringify(set)}`;
        const { r, html, steps } = show(set);
        if (!r.ok) { problems.push(`${where}: ${r.errors.join()}`); continue; }
        if (/NaN|undefined|Infinity/.test(html.replace(/<[^>]*>/g, ' '))) problems.push(`${where}: NaN/undefined in the result`);
        if (!html.includes('class="block steps"') || !html.includes('class="refs"')) problems.push(`${where}: no steps or sources`);
        if (/<m(i|n|text)>[^<]*(NaN|undefined|Infinity|—)[^<]*</.test(html)) problems.push(`${where}: a missing value in a step`);
        if (steps.length < 6) problems.push(`${where}: only ${steps.length} steps`);
        for (const s of steps) {
          if (!s.num || !s.res) continue;
          let value;
          let shown;
          try { value = evaluate(s.num); shown = evaluate(s.res); } catch { continue; }
          checked++;
          // Tighter than the general check: 0.5 %, and no power of ten apart.
          if (!agrees(value, shown, 0.005) || (shown !== 0 && Math.abs(value / shown - 1) > 0.005)) problems.push(`${where}: ${s.num} → ${value}, shown ${s.res}`);
        }
      }
    });
    ok(problems.length === 0, `\n${[...new Set(problems)].slice(0, 12).join('\n')}`);
    ok(checked > 600, `expected the steps to be evaluated, got ${checked}`);
    // Every step that carries numbers is one the checker can evaluate (the rounding itself is in the symbols).
    const { steps } = show();
    const numbered = steps.filter((s) => s.num && s.res);
    eq(numbered.filter((s) => { try { evaluate(s.num); evaluate(s.res); return false; } catch { return true; } }).length, 0, 'steps the checker skips');
    ok(numbered.length >= 14, `steps with numbers at the defaults: ${numbered.length}`);
  }],

  ['panel page: headline values, messages, units, examples and presets', () => {
    const before = getLang();
    setLang('en');
    try {
      // Defaults: the hand check.
      const d = show();
      eq(d.r.count, 20);
      ok(/hero-value">20</.test(d.html) && /hero-value">70%</.test(d.html), 'boards per panel and used area as heroes');
      ok(d.html.includes('0° (as drawn) · 4 columns × 5 rows'), 'orientation and grid');
      ok(d.html.includes('18 (6 × 3)') && d.html.includes('250 × 190 mm'), 'the other orientation and the usable area');
      ok(d.html.includes('One more column almost fits') && d.html.includes('1.6 mm smaller (50 mm → 48.4 mm)') && d.html.includes('holds 25 boards'), 'column hint');
      ok(d.html.includes('or a gap of at most 0 mm') && d.html.includes('at most 29.33 mm (5.67 mm smaller)'), 'what one more column and row need, rounded to the safe side');
      ok(d.html.includes('5 · for 100 boards'), 'panels for the order');
      ok(!d.html.includes('class="msg error"'), 'no error');
      // The steps name the rounding and show both orientations for "best".
      ok(d.steps.some((s) => s.sym.includes('⌊')) && d.steps.some((s) => s.sym.includes('⌈')), 'floor and ceiling');
      ok(d.steps.some((s) => s.label === 'pn_r0') && d.steps.some((s) => s.label === 'pn_r90') && d.steps.some((s) => s.label === 'pn_sPick'), 'both orientations');
      const fixed = show({ rot: 'rot' });
      ok(fixed.steps.some((s) => s.label === 'pn_r90') && !fixed.steps.some((s) => s.label === 'pn_r0' || s.label === 'pn_sPick'), 'one orientation only');
      eq(fixed.r.count, 18);
      ok(fixed.html.includes('The other orientation (0° (as drawn)) holds 20 boards'), 'the other orientation is better');
      // A quotient is never shown as a whole number it does not count as:
      // 249.998 / 50 = 4.99996 is four columns and is not written as 5; 250 / 50 is 5.
      const resOf = (out, label) => out.steps.find((x) => x.label === label).res;
      const below = show({ pw: 249.998, rails: 'none', g: 0 });
      eq(below.r.fits.asis.nx, 4);
      eq(resOf(below, 'pn_sQx0'), '\\text{4.99996}');
      eq(resOf(show({ rails: 'none', g: 0 }), 'pn_sQx0'), '\\text{5}');
      eq(resOf(d, 'pn_sQx0'), '\\text{4.846}');
      // 100 boards at 20 · 99.992 % good boards per panel: 5.0004 panels are 6 panels, and the step does not say ⌈5⌉.
      const above = show({ yld: 99.992 });
      eq(above.r.order.panels, 6);
      eq(resOf(above, 'pn_sPanelsQ'), '\\text{5.0004}');
      eq(resOf(d, 'pn_sPanelsQ'), '\\text{5}');
      eq(resOf(show({ qty: 101 }), 'pn_sPanelsQ'), '\\text{5.05}');
      // A board that does not fit: 0 boards, an error message, no panel count.
      const big = show({ bw: 300 });
      eq(big.r.count, 0);
      ok(/hero-value">0</.test(big.html) && big.html.includes('class="msg error"') && big.html.includes('does not fit the panel in either orientation'), '0 boards');
      ok(show({ bw: 35, bh: 240, rot: 'asis' }).html.includes('does not fit the panel in this orientation'), '0 boards as drawn');
      ok(big.html.includes('cannot be calculated') && !big.html.includes('Panels needed'), 'no panel count');
      // No rails; routed with a gap of zero.
      ok(show({ rails: 'none' }).html.includes('typical guidance 3–5 mm; ask your assembler'), 'rails missing');
      ok(show({ g: 0 }).html.includes('a router bit needs a gap'), 'routed, gap 0');
      ok(!show({ sep: 'vscore', g: 0 }).html.includes('a router bit needs a gap'), 'V-score, gap 0');
      // Units: 2 × 1.5 in boards on an 18 × 24 in panel, 80 mil gap, 0.4 in rails top and bottom.
      // Span 457.2 × (609.6 − 20.32 − 4.064) = 457.2 × 585.216 mm; pitch 52.832 and 40.132 mm
      // 0°: ⌊459.232/52.832⌋ = 8, ⌊587.248/40.132⌋ = 14 → 112; 90°: ⌊459.232/40.132⌋ = 11, ⌊587.248/52.832⌋ = 11 → 121
      const inch = show({ bw: 2, bw_u: 'in', bh: 1.5, bh_u: 'in', pw: 18, pw_u: 'in', ph: 24, ph_u: 'in', g: 80, g_u: 'mil', rw: 0.4, rw_u: 'in' });
      near(inch.r.panelWMm, 457.2, 1e-12);
      near(inch.r.gapMm, 2.032, 1e-12);
      near(inch.r.spanYMm, 585.216, 1e-9);
      eq(inch.r.fits.asis.count, 112);
      eq(inch.r.fits.rot.count, 121);
      eq(inch.r.chosen, 'rot');
      // Optional fields: an empty board-to-rail gap is the gap, an empty quantity gives no panel count, an empty yield is 100 %.
      eq(show({ e: '' }).r.edgeMm, 2);
      eq(show({ e: 0 }).r.spanYMm, 190);
      eq(show({ qty: '' }).r.order, null);
      ok(!show({ qty: '' }).html.includes('Panels needed'), 'no panel row');
      eq(show({ yld: '' }).r.order.yieldFrac, 1);
      const y = show({ yld: 95 });
      eq(y.r.order.panels, 6);
      ok(y.html.includes('114 (95%)') && y.html.includes('14 · 20 if every board is good'), 'yield rows');
      // Engine errors reach the page as messages, with the generic drawing.
      const wrong = show({ rw: 100 });
      eq(wrong.r.ok, false);
      ok(wrong.html.includes('class="msg error"') && wrong.html.includes('The rails cover the whole panel') && wrong.svg.includes('<svg'), 'error message and drawing');
      eq(show({ g: '' }).r.ok, false, 'the gap is required');
      // Examples: every layout field is set; quantity and yield stay.
      const ex = Object.fromEntries(fields.find((f) => f.key === 'ex').options.map((o) => [o.value, o.set]));
      eq(Object.keys(ex).join(), 'none,e1,e2,e3,e4');
      eq(show(ex.e1).r.count, 20);
      // 100 × 80 mm, V-score, rails top and bottom: 0°: ⌊250/100⌋ · ⌊190/80⌋ = 2 · 2 = 4; 90°: ⌊250/80⌋ · ⌊190/100⌋ = 3 · 1 = 3 → 64 %
      eq(show(ex.e2).r.count, 4);
      near(show(ex.e2).r.usedFrac, 0.64, 1e-12);
      // Eurocard on 457 × 610 mm, 10 mm border, 2 mm gap: span 433 × 586 → 0°: ⌊435/102⌋ · ⌊588/162⌋ = 4 · 3 = 12; 90°: 2 · 5 = 10
      eq(show(ex.e3).r.count, 12);
      eq(show(ex.e3).r.fits.rot.count, 10);
      // 20 × 15 mm on 100 × 100 mm, 5 mm rails all round, V-score: 90 × 90 → 4 · 6 = 24 either way (72 %)
      eq(show(ex.e4).r.count, 24);
      eq(show(ex.e4).r.fits.rot.count, 24);
      near(show(ex.e4).r.usedFrac, 0.72, 1e-12);
      for (const [k, set] of Object.entries(ex)) {
        if (!set) continue;
        eq(Object.keys(set).sort().join(), 'bh,bw,e,g,ph,pw,rails,rot,rw,sep', `${k} sets the whole layout`);
        ok(!show(set).r.warnings.includes('pn_routedZero') && !show(set).r.warnings.includes('pn_noRail'), `${k} is a clean example`);
      }
      // Panel sizes: only the panel changes. 160 × 100 mm: usable 160 × 90, span 160 × 86 → 0°: ⌊162/52⌋ · ⌊88/37⌋ = 3 · 2 = 6
      const pp = Object.fromEntries(fields.find((f) => f.key === 'pp').options.map((o) => [o.value, o.set]));
      eq(Object.keys(pp).join(), 'none,p100,euro,p250,prod');
      eq(show(pp.euro).r.count, 6);
      // 100 × 100 mm: 0°: ⌊102/52⌋ · 2 = 2; 90°: ⌊102/37⌋ · ⌊88/52⌋ = 2 · 1 = 2 → as drawn
      eq(show(pp.p100).r.count, 2);
      eq(show(pp.p100).r.chosen, 'asis');
      eq(show(pp.p250).r.count, 20);
      // 457 × 610 mm: span 457 × 596 → 0°: ⌊459/52⌋ · ⌊598/37⌋ = 8 · 16 = 128; 90°: ⌊459/37⌋ · ⌊598/52⌋ = 12 · 11 = 132
      eq(show(pp.prod).r.count, 132);
      for (const set of Object.values(pp)) if (set) eq(Object.keys(set).join(), 'pw,ph');
      // The separation choice sets the example gap.
      const sep = Object.fromEntries(fields.find((f) => f.key === 'sep').options.map((o) => [o.value, o.set]));
      eq(sep.vscore.g, 0);
      eq(sep.routed.g, 2);
      // The plot offers the outputs of the brief against board size, gap and rail width.
      eq(page.plot.x.join(), 'bw,bh,g,rw');
      eq(page.plot.y.map((o) => o.key).join(), 'n,used,panels');
      eq(page.plot.y[0].get(d.r), 20);
      near(page.plot.y[1].get(d.r), 70, 1e-12);
      eq(page.plot.y[2].get(d.r), 5);
      eq(page.plot.y[2].get(big.r), undefined, 'no panel count without boards');
    } finally {
      setLang(before);
    }
  }],

  ['panel page: the drawing is to proportion, clean in TR and EN, and capped for very many boards', () => {
    const sets = [
      {}, { rails: 'none' }, { rails: 'lr' }, { rails: 'all' }, { rot: 'asis' }, { rot: 'rot' }, { sep: 'vscore', g: 0 }, { sep: 'vscore', g: 0, rails: 'none' },
      { bw: 300 }, { bw: 35, bh: 240, rot: 'asis' }, { e: 100 }, { e: 0 }, { pw: 457, ph: 610 }, { pw: 610, ph: 457 }, { pw: 1000, ph: 20, bw: 10, bh: 10 },
      { pw: 20, ph: 1000, bw: 10, bh: 10, rails: 'lr', rw: 2 }, { bw: 5, bh: 5 }, { bw: 5, bh: 5, sep: 'vscore', g: 0 }, { bw: 1, bh: 1, g: 0.5 }, { bw: 0.02, bh: 0.02, g: 0, rails: 'none' },
      { pw: 1e6, ph: 1e-3, bw: 1e-4, bh: 1e-4 }, { pw: 1e-3, ph: 1e6, bw: 1e-4, bh: 1e-4, rails: 'none' }, { bw: 250, bh: 190, e: 0 }, { rw: 94, e: 0, bh: 12 },
      { pw: 1e150, ph: 1e-150, bw: 1e-150, bh: 1e-150, rails: 'none', g: 0 }, { bw: 123456, bh: 1e-9 }, { qty: '', yld: '' },
      // Invalid input: the drawing falls back to a sketch with symbols.
      { bw: 0 }, { bh: -1 }, { pw: '' }, { ph: 0 }, { g: -1 }, { g: '' }, { rw: 100 }, { rw: '' }, { bw: '', bh: '', pw: '', ph: '' }, { pw: 1e300, ph: 1e300 },
      { bw: 0, rails: 'none', sep: 'vscore' }, { bw: 0, rails: 'all' }, { bw: 0, rails: 'lr' },
    ];
    const problems = [];
    const counts = new Map();
    inBothLanguages((lang) => {
      for (const set of sets) {
        const id = JSON.stringify(set);
        let out;
        try { out = show(set); } catch (e) { problems.push(`${lang} ${id} threw ${e.message}`); continue; }
        if (!out.svg?.includes('<svg')) { problems.push(`${lang} ${id} drew nothing`); continue; }
        for (const p of svgProblems(out.svg)) problems.push(`${lang} ${id}: ${p}`);
        const count = geometryCount(out.svg);
        if (counts.has(id) && counts.get(id) !== count) problems.push(`${id}: geometry differs between TR and EN`);
        counts.set(id, count);
        if (!out.r.ok) continue;
        // One rectangle per board up to the cap; above it one block.
        const drawn = boardRects(out.svg).length;
        const want = out.r.count > MAX_DRAWN ? 1 : out.r.count;
        if (drawn !== want) problems.push(`${lang} ${id}: ${drawn} board rectangles for ${out.r.count} boards`);
      }
    });
    ok(problems.length === 0, `\n${[...new Set(problems)].slice(0, 12).join('\n')}`);
    const before = getLang();
    setLang('en');
    try {
      // To proportion: the 250 × 200 mm panel is drawn 5:4, and a 50 × 35 mm board 10:7 at the same scale.
      const d = show();
      const [, pw, ph] = d.svg.match(/<rect class="soft" x="[\d.]+" y="[\d.]+" width="([\d.]+)" height="([\d.]+)"/).map(Number);
      near(pw / ph, 250 / 200, 0.01);
      const rects = boardRects(d.svg);
      eq(rects.length, 20);
      near(rects[0][2] / pw, 50 / 250, 0.01, 'board width against the panel');
      near(rects[0][3] / ph, 35 / 200, 0.02, 'board height against the panel');
      near((rects[1][0] - rects[0][0]) / pw, 52 / 250, 0.01, 'pitch = board + gap');
      eq(new Set(rects.map((x) => x[0])).size, 4, 'four columns');
      eq(new Set(rects.map((x) => x[1])).size, 5, 'five rows');
      // Rails: two strips top and bottom, 5 mm of 200 mm high.
      const rails = [...d.svg.matchAll(/<rect class="diel" x="[\d.]+" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map((m) => m.slice(1).map(Number)).filter((x) => x[1] > 20);
      eq(rails.length, 2);
      near(rails[0][2] / ph, 5 / 200, 0.06);
      eq(show({ rails: 'all' }).svg.match(/<rect class="diel"/g).length, 5, 'four rails and the legend');
      eq((show({ rails: 'none' }).svg.match(/<rect class="diel"/g) ?? []).length, 0, 'no rails, no legend entry');
      // Rotated boards are drawn rotated.
      const turned = boardRects(show({ rot: 'rot' }).svg);
      eq(turned.length, 18);
      ok(turned[0][2] < turned[0][3], 'higher than wide');
      // Live values and the count in the caption; symbols without a result.
      ok(d.svg.includes('20 boards · 0° · 4 × 5') && d.svg.includes('W = 250 mm') && d.svg.includes('H = 200 mm') && d.svg.includes('used area 70%'), 'caption');
      const bad = show({ bw: 0 });
      ok(bad.svg.includes('>W<') && bad.svg.includes('>H<') && !bad.svg.includes('W = '), 'symbols only');
      ok(show({ bw: 300 }).svg.includes('the board does not fit'), '0 boards');
      // V-score: score lines across the panel; none for routed boards.
      ok(show({ sep: 'vscore', g: 0 }).svg.includes('<path class="dim"') && !d.svg.includes('<path class="dim"'), 'score lines');
      // The cap: 5 × 5 mm boards → ⌊252/7⌋ · ⌊188/7⌋ = 36 · 26 = 936 boards are drawn as one block, and the caption says so.
      const many = show({ bw: 5, bh: 5 });
      eq(many.r.count, 936);
      ok(many.r.count > MAX_DRAWN && MAX_DRAWN >= 200 && MAX_DRAWN <= 500, 'a few hundred');
      eq(boardRects(many.svg).length, 1);
      ok(many.svg.includes('936 boards are not drawn one by one') && !d.svg.includes('not drawn one by one'), 'caption when capped');
      ok(many.svg.length < 6000, 'a short drawing');
      // Just below the cap everything is drawn: 10 × 9.4 mm → ⌊252/12⌋ · ⌊188/11.4⌋ = 21 · 16 = 336.
      const dense = show({ bw: 10, bh: 9.4 });
      eq(dense.r.count, 336);
      eq(boardRects(dense.svg).length, 336);
    } finally {
      setLang(before);
    }
  }],

  ['panel page: Turkish and English strings match, and every key the page uses exists', () => {
    const tr = Object.keys(page.strings.tr);
    const en = new Set(Object.keys(page.strings.en));
    eq(tr.filter((k) => !en.has(k)).join(), '', 'only in tr');
    eq([...en].filter((k) => !tr.includes(k)).join(), '', 'only in en');
    ok(tr.every((k) => page.strings.tr[k] && page.strings.en[k]), 'no empty string');
    ok(tr.every((k) => /^(pn_|ok_pn_|warn_pn_|err_pn_)/.test(k)), 'all keys carry the pn_ prefix, so no other page is overwritten');
    // Every message key the engine can return has a text.
    for (const k of ['pn_positive', 'pn_rails', 'pn_qty', 'pn_yield', 'pn_range', 'pn_noFit', 'pn_noFitAny']) ok(en.has(`err_${k}`), `err_${k}`);
    for (const k of ['pn_otherBetter', 'pn_noRail', 'pn_routedZero', 'pn_moreCol', 'pn_moreRow']) ok(en.has(`warn_${k}`), `warn_${k}`);
    // Labels, hints, notes and option labels of the form.
    for (const s of page.sections) {
      ok(s.title === 'sectionSetup' || en.has(s.title), `section ${s.title}`);
      ok(!s.note || en.has(s.note), `note ${s.note}`);
      for (const f of s.fields) {
        for (const k of [f.label, f.hint, f.info, ...(f.options ?? []).map((o) => o.label)]) ok(k === undefined || en.has(k), `${f.key}: ${k}`);
      }
    }
    // Field keys are unique and short (they become URL parameters); option values are lowercase ASCII.
    eq(new Set(fields.map((f) => f.key)).size, fields.length, 'unique keys');
    eq(fields.map((f) => f.key).join(), 'ex,bw,bh,pp,pw,ph,rails,rw,sep,g,e,rot,qty,yld');
    ok(fields.every((f) => /^[a-z]{1,6}$/.test(f.key)), 'short keys');
    ok(fields.every((f) => (f.options ?? []).every((o) => /^[a-z0-9]+$/.test(o.value))), 'option values');
    // The engine's option lists are the form's.
    eq(fields.find((f) => f.key === 'rails').options.map((o) => o.value).join(), RAILS.join());
    eq(fields.find((f) => f.key === 'rot').options.map((o) => o.value).join(), ORIENTS.join());
    eq(fields.find((f) => f.key === 'sep').options.map((o) => o.value).join(), SEPS.join());
    // No untranslated key and no unfilled placeholder shows up in a rendered result or drawing.
    inBothLanguages((lang) => {
      for (const set of [{}, { rails: 'none', g: 0, rot: 'asis', yld: 90 }, { bw: 300 }, { bw: 35, bh: 240, rot: 'asis' }, { bw: 5, bh: 5, rails: 'lr' }, { bw: 44, bh: 33.5, rails: 'all' }, { rw: 100 }, { qty: 1.5 }, { bw: 0 }]) {
        const { html, svg } = show(set);
        const shown = `${html} ${svg}`.replace(/data-hl="[^"]*"/g, '');
        ok(!/\b(ok_|warn_|err_)?pn_[A-Za-z0-9]+/.test(shown), `${lang} ${JSON.stringify(set)}: an untranslated key is shown`);
        ok(!/\{[a-z]+\}/.test(shown.replace(/<[^>]*>/g, ' ')), `${lang} ${JSON.stringify(set)}: an unfilled placeholder is shown`);
      }
    });
  }],
];
