// Stencil area ratio (src/engine/stencil.js, src/pages/stencil.js).
// Expected values are worked out by hand in the comments.

import { near, eq, ok } from '../assert.js';
import {
  stencil, apertureGeometry, releaseRatios, thickestFoil, commonFoil,
  AR_MIN, ASPECT_MIN, COMMON_FOILS_MM, PASTE_TYPES, BALLS_MIN, SHAPES,
} from '../../src/engine/stencil.js';
import { registerStrings, setLang, getLang } from '../../src/i18n.js';
import { stepsTrace, parseNumber } from '../../src/ui/calculator.js';
import { evaluate, agrees } from './arith.js';
import page from '../../src/pages/stencil.js';

registerStrings(page.strings);

// The QFN lead of the brief: 0.25 × 0.80 mm in a 0.12 mm foil; and a 0.30 mm round BGA aperture.
const lead = { shape: 'rect', lengthMm: 0.8, widthMm: 0.25, thicknessMm: 0.12 };
const ball = { shape: 'circle', diameterMm: 0.3, thicknessMm: 0.12 };
const rect = (o = {}) => stencil({ ...lead, ...o });
const round = (o = {}) => stencil({ ...ball, ...o });

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
  for (const [, tag, attrs] of svgText.matchAll(/<(rect|circle|text)\b([^>]*)>/g)) {
    const a = Object.fromEntries([...attrs.matchAll(/\s(x|y|cx|cy|r|width|height)="([^"]*)"/g)].map(([, k, val]) => [k, val]));
    for (const [k, val] of Object.entries(a)) if (!/^-?\d+(\.\d+)?$/.test(val)) bad.push(`${tag} ${k}="${val}"`);
    if (tag === 'rect') {
      const [x, y, w, h] = [a.x, a.y, a.width, a.height].map(Number);
      if (w < 0 || h < 0 || x < 0 || y < 0 || x + w > W + 0.5 || y + h > H + 0.5) bad.push(`rect ${x},${y} ${w}×${h}`);
    }
    if (tag === 'circle') {
      const [x, y, rad] = [a.cx, a.cy, a.r].map(Number);
      if (rad < 0 || x - rad < 0 || y - rad < 0 || x + rad > W || y + rad > H) bad.push(`circle ${x},${y} r ${rad}`);
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

export const cases = [
  ['stencil: round 0.30 mm aperture fails in a 0.12 mm foil and passes in 0.10 mm', () => {
    // A = π·0.3²/4 = 0.0706858 mm²; A_w = π·0.3·0.12 = 0.1130973 mm²; AR = D/(4·T) = 0.30/0.48 = 0.625 < 0.66
    // AS = 0.30/0.12 = 2.5 ≥ 1.5
    const r = round();
    eq(r.ok, true);
    near(r.areaMm2, 0.0706858, 1e-5);
    near(r.perimeterMm, 0.9424778, 1e-5);
    near(r.wallAreaMm2, 0.1130973, 1e-5);
    near(r.areaRatio, 0.625, 1e-12);
    near(r.aspectRatio, 2.5, 1e-12);
    eq(r.arPass, false);
    eq(r.aspectPass, true);
    eq(r.pass, false);
    eq(r.verdict, 'ar');
    // 0.10 mm: AR = 0.30/0.40 = 0.75, AS = 3
    const thin = round({ thicknessMm: 0.1 });
    near(thin.areaRatio, 0.75, 1e-12);
    near(thin.aspectRatio, 3, 1e-12);
    eq(thin.pass, true);
    eq(thin.verdict, 'pass');
    // The thinner foil prints 0.10/0.12 = 83.3 % of the paste: 17 % less.
    near(thin.volumeMm3 / r.volumeMm3, 0.833333, 1e-5);
    // The defaults are the guideline values of IPC-7525.
    eq(AR_MIN, 0.66);
    eq(ASPECT_MIN, 1.5);
    eq(r.arMin, 0.66);
    eq(r.aspectMin, 1.5);
    eq(SHAPES.join(), 'rect,circle');
  }],

  ['stencil: rectangle 0.25 × 0.80 mm in a 0.12 mm foil', () => {
    // A = 0.2 mm²; A_w = 2·(0.80 + 0.25)·0.12 = 2·1.05·0.12 = 0.252 mm²
    // AR = 0.2/0.252 = 0.793651; AS = 0.25/0.12 = 2.083333
    const r = rect();
    near(r.areaMm2, 0.2, 1e-12);
    near(r.perimeterMm, 2.1, 1e-12);
    near(r.wallAreaMm2, 0.252, 1e-12);
    near(r.areaRatio, 0.793651, 1e-5);
    near(r.aspectRatio, 2.083333, 1e-5);
    eq(r.minDimMm, 0.25);
    eq(r.pass, true);
    eq(r.verdict, 'pass');
    eq(r.warnings.length, 0);
    eq(r.pad, null);
    eq(r.balls, null);
    // The pieces are public as well.
    const g = apertureGeometry(lead);
    near(releaseRatios({ ...g, thicknessMm: 0.12 }).areaRatio, 0.793651, 1e-5);
  }],

  ['stencil: a rectangle entered with W > L is turned, the smaller side is the width', () => {
    const a = rect();
    const b = rect({ lengthMm: 0.25, widthMm: 0.8 });
    eq(a.swapped, false);
    eq(b.swapped, true);
    eq(b.lengthMm, 0.8);
    eq(b.widthMm, 0.25);
    eq(b.minDimMm, 0.25);
    near(b.areaRatio, a.areaRatio, 1e-12);
    near(b.aspectRatio, a.aspectRatio, 1e-12, 'the aspect ratio uses the smaller side');
    near(b.tMaxMm, a.tMaxMm, 1e-12);
    // A square is not turned.
    eq(rect({ lengthMm: 0.3, widthMm: 0.3 }).swapped, false);
  }],

  ['stencil: a square has the area ratio of the circle of the same width, and 4/π of its paste', () => {
    // Square of side s: AR = s²/(4·s·T) = s/(4·T), the same as D/(4·T).
    const sq = rect({ lengthMm: 0.3, widthMm: 0.3 });
    const c = round();
    near(sq.areaRatio, 0.625, 1e-12);
    near(sq.areaRatio, c.areaRatio, 1e-12);
    near(sq.aspectRatio, c.aspectRatio, 1e-12);
    // Area 0.09 mm² against 0.0706858 mm²: 4/π = 1.27324 times the volume.
    near(sq.volumeMm3 / c.volumeMm3, 4 / Math.PI, 1e-12);
    // A long slot tends to AR = W/(2·T): 0.25 mm × 100 mm → 0.25·100/(2·100.25·0.12) = 1.03907; the limit is 1.04167.
    near(rect({ lengthMm: 100 }).areaRatio, 1.039069, 1e-5);
    ok(rect({ lengthMm: 1e6 }).areaRatio < 0.25 / 0.24, 'below W/(2·T)');
    near(rect({ lengthMm: 1e6 }).areaRatio, 0.25 / 0.24, 1e-5);
  }],

  ['stencil: paste volume is the volume of the aperture, in mm³ and nl', () => {
    // 0.2 mm² · 0.12 mm = 0.024 mm³ = 0.024 µl = 24 nl
    const r = rect();
    near(r.volumeMm3, 0.024, 1e-12);
    near(r.volumeNl, 24, 1e-12);
    // Round: 0.0706858 mm² · 0.12 mm = 0.00848230 mm³ = 8.4823 nl
    const c = round();
    near(c.volumeMm3, 0.0084823, 1e-5);
    near(c.volumeNl, 8.4823, 1e-5);
    // 1 × 1 mm in a 1 mm foil is one microlitre.
    eq(stencil({ shape: 'rect', lengthMm: 1, widthMm: 1, thicknessMm: 1 }).volumeNl, 1000);
  }],

  ['stencil: thickest foil that meets both limits', () => {
    // Round 0.30 mm: T_AR = D/(4·AR_min) = 0.30/2.64 = 0.113636 mm; T_AS = 0.30/1.5 = 0.2 mm → 0.113636 mm (area ratio)
    const c = round();
    near(c.tArMm, 0.113636, 1e-5);
    near(c.tAspectMm, 0.2, 1e-12);
    near(c.tMaxMm, 0.113636, 1e-5);
    eq(c.tMaxBy, 'ar');
    eq(c.foilMm, 0.1);
    // Rectangle: T_AR = 0.2/(0.66·2.1) = 0.2/1.386 = 0.144300 mm; T_AS = 0.25/1.5 = 0.166667 mm → 0.1443 mm
    const r = rect();
    near(r.tArMm, 0.144300, 1e-5);
    near(r.tAspectMm, 0.166667, 1e-5);
    near(r.tMaxMm, 0.144300, 1e-5);
    eq(r.tMaxBy, 'ar');
    eq(r.foilMm, 0.127);
    // T_max does not depend on the foil entered, and at T_max the deciding ratio sits on its limit.
    near(rect({ thicknessMm: 0.3 }).tMaxMm, r.tMaxMm, 1e-12);
    near(rect({ thicknessMm: r.tMaxMm }).areaRatio, 0.66, 1e-12);
    eq(rect({ thicknessMm: r.tMaxMm }).pass, true, 'exactly on the limit passes');
    eq(rect({ thicknessMm: r.tMaxMm * 1.001 }).pass, false);
    near(thickestFoil(apertureGeometry(ball)).tMaxMm, c.tMaxMm, 1e-12);
  }],

  ['stencil: the aspect ratio decides only for long slots (L > 7.33·W)', () => {
    // T_AR < T_AS ⟺ L/(L + W) < 2·0.66/1.5 = 0.88 ⟺ L < 7.3333·W.
    // Slot 0.2 × 5 mm: T_AR = 1/(0.66·10.4) = 1/6.864 = 0.145688 mm; T_AS = 0.2/1.5 = 0.133333 mm → aspect ratio
    const s = stencil({ shape: 'rect', lengthMm: 5, widthMm: 0.2, thicknessMm: 0.12 });
    near(s.tArMm, 0.145688, 1e-5);
    near(s.tAspectMm, 0.133333, 1e-5);
    near(s.tMaxMm, 0.133333, 1e-5);
    eq(s.tMaxBy, 'aspect');
    eq(s.foilMm, 0.127);
    // The same slot in a 0.14 mm foil: AR = 1/(10.4·0.14) = 0.686813 passes, AS = 0.2/0.14 = 1.428571 fails.
    const t = stencil({ shape: 'rect', lengthMm: 5, widthMm: 0.2, thicknessMm: 0.14 });
    near(t.areaRatio, 0.686813, 1e-5);
    near(t.aspectRatio, 1.428571, 1e-5);
    eq(t.verdict, 'aspect');
    eq(t.pass, false);
    // On the boundary L = 7.3333·W both limits give the same foil: 0.3 × 2.2 mm → 0.66/(0.66·5) = 0.2 mm = 0.3/1.5.
    const edge = stencil({ shape: 'rect', lengthMm: 2.2, widthMm: 0.3, thicknessMm: 0.12 });
    near(edge.tArMm, 0.2, 1e-12);
    near(edge.tAspectMm, 0.2, 1e-12);
    // Both ratios too low: round 0.15 mm in 0.12 mm → AR = 0.3125, AS = 1.25.
    const both = round({ diameterMm: 0.15 });
    near(both.areaRatio, 0.3125, 1e-12);
    near(both.aspectRatio, 1.25, 1e-12);
    eq(both.verdict, 'both');
  }],

  ['stencil: largest common foil, and none when even 0.08 mm is too thick', () => {
    eq(COMMON_FOILS_MM.join(), '0.08,0.1,0.12,0.127,0.15,0.2');
    eq(commonFoil(0.1443), 0.127);
    eq(commonFoil(0.5), 0.2);
    eq(commonFoil(0.1), 0.1, 'a foil equal to the limit is allowed');
    eq(commonFoil(0.0999), 0.08);
    eq(commonFoil(0.0799), null);
    // Round 0.20 mm: T_max = 0.20/2.64 = 0.075758 mm < 0.08 mm → no common foil.
    const small = round({ diameterMm: 0.2 });
    near(small.tMaxMm, 0.0757576, 1e-5);
    eq(small.foilMm, null);
    ok(small.warnings.includes('st_noFoil'), 'warning');
    ok(small.foils.every((f) => !f.pass), 'no row of the table passes');
    // Round 0.2112 mm = 4·0.66·0.08: exactly the 0.08 mm foil, despite rounding in the division.
    const edge = round({ diameterMm: 0.2112, thicknessMm: 0.08 });
    near(edge.tMaxMm, 0.08, 1e-12);
    eq(edge.foilMm, 0.08);
    eq(edge.pass, true);
    ok(!edge.warnings.includes('st_noFoil'), 'no warning');
    // 0.4 mm pitch BGA, 0.25 mm round: T_max = 0.25/2.64 = 0.094697 mm → 0.08 mm.
    eq(round({ diameterMm: 0.25 }).foilMm, 0.08);
  }],

  ['stencil: the same aperture in every common foil', () => {
    // 0.25 × 0.80 mm: AR = 0.2/(2.1·T) → 1.190476, 0.952381, 0.793651, 0.749906, 0.634921, 0.476190
    const f = rect().foils;
    eq(f.length, 6);
    const want = [1.190476, 0.952381, 0.793651, 0.749906, 0.634921, 0.476190];
    f.forEach((row, i) => {
      eq(row.tMm, COMMON_FOILS_MM[i]);
      near(row.areaRatio, want[i], 1e-5, `AR at ${row.tMm} mm`);
      near(row.aspectRatio, 0.25 / row.tMm, 1e-12);
      near(row.volumeNl, 200 * row.tMm, 1e-12, 'nl = 1000·A·T');
    });
    eq(f.map((row) => (row.pass ? 1 : 0)).join(''), '111100', 'passes up to 0.127 mm');
    // The last passing row is the foil that is reported.
    eq(f.filter((row) => row.pass).pop().tMm, rect().foilMm);
    // 0.2 mm foil: AS = 1.25 < 1.5 as well.
    near(f[5].aspectRatio, 1.25, 1e-12);
  }],

  ['stencil: smallest round or square aperture at a thickness', () => {
    // D_min = 4·AR_min·T: 0.12 mm → 0.3168 mm; 0.10 mm → 0.264 mm; 0.08 mm → 0.2112 mm
    near(rect().minApertureMm, 0.3168, 1e-12);
    near(round({ thicknessMm: 0.1 }).minApertureMm, 0.264, 1e-12);
    near(round({ thicknessMm: 0.08 }).minApertureMm, 0.2112, 1e-12);
    eq(rect().minApertureBy, 'ar');
    // A round aperture of that size sits exactly on the limit; AS = 4·0.66 = 2.64.
    const on = round({ diameterMm: 0.3168 });
    near(on.areaRatio, 0.66, 1e-12);
    near(on.aspectRatio, 2.64, 1e-12);
    eq(on.pass, true);
    eq(round({ diameterMm: 0.316 }).pass, false);
  }],

  ['stencil: other limits (electroformed stencil, a stricter house rule)', () => {
    // AR_min = 0.5: round 0.30 mm in 0.12 mm passes (0.625); T_AR = 0.30/2 = 0.15 mm → foil 0.15 mm.
    const e = round({ arMin: 0.5 });
    eq(e.pass, true);
    near(e.tMaxMm, 0.15, 1e-12);
    eq(e.foilMm, 0.15);
    near(e.minApertureMm, 0.24, 1e-12);
    // AR_min = 0.8: the rectangle (0.7937) fails.
    eq(rect({ arMin: 0.8 }).verdict, 'ar');
    // AR_min = 0.3 with AS_min = 1.5: for a circle the aspect ratio decides, D_min = 1.5·T = 0.18 mm.
    const a = round({ arMin: 0.3, diameterMm: 0.17 });
    eq(a.minApertureBy, 'aspect');
    near(a.minApertureMm, 0.18, 1e-12);
    near(a.areaRatio, 0.354167, 1e-5);
    near(a.aspectRatio, 1.416667, 1e-5);
    eq(a.verdict, 'aspect');
    // 4·AR_min = AS_min: both give the same size; the area ratio is named.
    eq(round({ arMin: 0.375 }).minApertureBy, 'ar');
  }],

  ['stencil: aperture area against the copper pad', () => {
    // 0.25 × 0.80 mm on a 0.30 × 0.85 mm pad: 0.2/0.255 = 78.431 %, reduction 21.569 %
    const r = rect({ padLengthMm: 0.85, padWidthMm: 0.3 });
    near(r.pad.areaMm2, 0.255, 1e-12);
    near(r.pad.coverage, 0.784314, 1e-5);
    near(r.pad.reduction, 0.215686, 1e-5);
    eq(r.warnings.length, 0);
    // The pad is turned like the aperture.
    const turned = rect({ padLengthMm: 0.3, padWidthMm: 0.85 });
    eq(turned.pad.swapped, true);
    near(turned.pad.coverage, r.pad.coverage, 1e-12);
    // Round 0.28 mm on a 0.30 mm pad: (0.28/0.30)² = 87.111 %
    near(round({ diameterMm: 0.28, padDiameterMm: 0.3 }).pad.coverage, 0.871111, 1e-5);
    // 1:1 is not an overprint; 0.30 mm on a 0.25 mm pad is: (0.30/0.25)² = 1.44.
    eq(round({ padDiameterMm: 0.3 }).warnings.includes('st_overprint'), false);
    const over = round({ padDiameterMm: 0.25 });
    near(over.pad.coverage, 1.44, 1e-12);
    near(over.pad.enlargement, 0.44, 1e-12);
    ok(over.warnings.includes('st_overprint'), 'overprint');
    // One side of a rectangular pad only: no comparison, and a note.
    const half = rect({ padLengthMm: 0.85 });
    eq(half.pad, null);
    ok(half.warnings.includes('st_padOne'), 'one side only');
    // The pad of the other shape is ignored.
    eq(rect({ padDiameterMm: 0.3 }).pad, null);
    eq(round({ padLengthMm: 0.85, padWidthMm: 0.3 }).pad, null);
    eq(rect({ padDiameterMm: 0.3 }).warnings.length, 0);
  }],

  ['stencil: five of the largest particles across the smallest dimension', () => {
    eq(BALLS_MIN, 5);
    eq(`${PASTE_TYPES.t3.maxUm}/${PASTE_TYPES.t4.maxUm}/${PASTE_TYPES.t5.maxUm}`, '45/38/25');
    // W = 0.25 mm: Type 3 250/45 = 5.5556, Type 4 250/38 = 6.5789, Type 5 250/25 = 10
    near(rect({ paste: 't3' }).balls.across, 5.555556, 1e-5);
    near(rect({ paste: 't4' }).balls.across, 6.578947, 1e-5);
    near(rect({ paste: 't5' }).balls.across, 10, 1e-12);
    eq(rect({ paste: 't3' }).balls.pass, true);
    eq(rect({ paste: 't4' }).balls.type, 4);
    // Round 0.20 mm with Type 3: 200/45 = 4.444 < 5; it needs 5·45 µm = 0.225 mm. Type 4: 200/38 = 5.263.
    const coarse = round({ diameterMm: 0.2, paste: 't3' });
    near(coarse.balls.across, 4.444444, 1e-5);
    eq(coarse.balls.pass, false);
    near(coarse.balls.minDimMm, 0.225, 1e-12);
    ok(coarse.warnings.includes('st_balls'), 'warning');
    eq(round({ diameterMm: 0.2, paste: 't4' }).balls.pass, true);
    // Exactly five: 0.19 mm with Type 4.
    eq(round({ diameterMm: 0.19, paste: 't4' }).balls.pass, true);
    // No type, or an unknown one: no check.
    eq(rect({ paste: 'none' }).balls, null);
    eq(rect({ paste: 't9' }).balls, null);
    eq(rect({ paste: 'toString' }).balls, null);
  }],

  ['stencil: invalid input is reported, not calculated', () => {
    const err = (r) => (r.ok ? 'ok' : r.errors.join());
    eq(err(stencil(undefined)), 'st_positive');
    eq(err(stencil({ ...lead, shape: 'star' })), 'st_positive');
    for (const o of [{ lengthMm: 0 }, { widthMm: -0.25 }, { lengthMm: NaN }, { widthMm: undefined }, { thicknessMm: 0 }, { thicknessMm: -0.1 },
      { thicknessMm: Infinity }, { arMin: 0 }, { arMin: -1 }, { aspectMin: 0 }, { aspectMin: NaN }, { lengthMm: '0.8' }]) {
      eq(err(rect(o)), 'st_positive', JSON.stringify(o));
    }
    for (const o of [{ diameterMm: 0 }, { diameterMm: -1 }, { diameterMm: undefined }, { diameterMm: NaN }]) eq(err(round(o)), 'st_positive', JSON.stringify(o));
    // The dimensions of the other shape are not looked at.
    eq(round({ lengthMm: -1, widthMm: NaN }).ok, true);
    eq(rect({ diameterMm: 0 }).ok, true);
    // A pad that is given must be positive; an empty one (undefined, null, NaN) is "not given".
    eq(err(rect({ padLengthMm: 0.85, padWidthMm: 0 })), 'st_positive');
    eq(err(round({ padDiameterMm: -0.3 })), 'st_positive');
    eq(rect({ padLengthMm: NaN, padWidthMm: null }).pad, null);
    // Numbers that overflow or vanish are an error as well.
    eq(err(rect({ lengthMm: 1e300, widthMm: 1e300 })), 'st_range');
    eq(err(round({ diameterMm: 1e-300, thicknessMm: 1e-300 })), 'st_range');
  }],

  ['stencil: absurd numbers never give NaN or Infinity', () => {
    const odd = [0, -1, 1e-300, 5e-324, 1e-30, 1e-9, 1e9, 1e30, 1e300, NaN, Infinity, -Infinity, undefined, null];
    const keys = ['lengthMm', 'widthMm', 'diameterMm', 'thicknessMm', 'arMin', 'aspectMin', 'padLengthMm', 'padWidthMm', 'padDiameterMm'];
    let good = 0;
    for (const shape of SHAPES) {
      for (const paste of ['none', 't3', 't5']) {
        const start = { ...lead, ...ball, shape, paste, padLengthMm: 0.85, padWidthMm: 0.3, padDiameterMm: 0.3 };
        for (const k of keys) {
          for (const x of odd) {
            const r = stencil({ ...start, [k]: x });
            const where = `${shape}/${paste} ${k} = ${x}`;
            if (r.ok) {
              good++;
              ok(finiteAll(r), `${where}: a number is not finite`);
              ok(r.areaRatio > 0 && r.aspectRatio > 0 && r.tMaxMm > 0, `${where}: a ratio is not positive`);
            } else {
              ok(Array.isArray(r.errors) && r.errors.length > 0 && r.errors.every((e) => typeof e === 'string'), `${where}: no error key`);
            }
          }
        }
      }
    }
    ok(good > 100, `some of the odd values are still valid inputs (${good})`);
  }],

  ['stencil page: every shape, example and paste type renders steps whose numbers give the result', () => {
    const sets = [
      {}, { shape: 'circle' }, { shape: 'circle', t: 0.1 }, { l: 0.25, w: 0.8 }, { l: 5, w: 0.2 }, { l: 5, w: 0.2, t: 0.14 },
      { pl: 0.85, pw: 0.3 }, { pl: 0.3, pw: 0.85, paste: 't4' }, { shape: 'circle', pd: 0.25, paste: 't3' }, { shape: 'circle', d: 0.2, paste: 't3' },
      { shape: 'circle', d: 0.17, armin: 0.3 }, { armin: 0.5, asmin: 2 }, { l: 31.5, l_u: 'mil', w: 10, w_u: 'mil', t: 5, t_u: 'mil' },
      { l: 800, l_u: 'um', w: 250, w_u: 'um', t: 127, t_u: 'um', paste: 't5' }, { shape: 'circle', d: 12, d_u: 'mil', t: 100, t_u: 'um', pd: 11, pd_u: 'mil' },
      { l: 20, w: 12, t: 3 }, { shape: 'circle', d: 0.05, t: 0.03 },
      ...fields.find((f) => f.key === 'ex').options.filter((o) => o.set).map((o) => o.set),
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
        if (steps.length < 11) problems.push(`${where}: only ${steps.length} steps`);
        for (const s of steps) {
          if (!s.num || !s.res) continue;
          let calc;
          let shown;
          try { calc = evaluate(s.num); shown = evaluate(s.res); } catch { continue; } // min(…) is not evaluated
          checked++;
          // Tighter than the general check: 0.5 %, and no power of ten apart.
          if (!agrees(calc, shown, 0.005) || (shown !== 0 && Math.abs(calc / shown - 1) > 0.005)) problems.push(`${where}: ${s.num} → ${calc}, shown ${s.res}`);
        }
      }
    });
    ok(problems.length === 0, `\n${[...new Set(problems)].slice(0, 12).join('\n')}`);
    ok(checked > 350, `expected the steps to be evaluated, got ${checked}`);
  }],

  ['stencil page: headline values, messages, units and examples', () => {
    const before = getLang();
    setLang('en');
    try {
      // Defaults: the QFN lead passes.
      const d = show();
      near(d.r.areaRatio, 0.793651, 1e-5);
      ok(/hero-value">0\.794</.test(d.html) && /hero-value">2\.08</.test(d.html), 'area ratio and aspect ratio as heroes');
      ok(d.html.includes('class="msg ok"') && !d.html.includes('class="msg error"'), 'pass message');
      ok(d.html.includes('24 nl') && d.html.includes('0.127 mm'), 'volume and the common foil');
      // The round BGA aperture fails: the message names the three ways out.
      const c = show({ shape: 'circle' });
      ok(/hero-value">0\.625</.test(c.html), 'hero 0.625');
      ok(c.html.includes('class="msg error"') && c.html.includes('stepped stencil') && c.html.includes('thinner foil'), 'area ratio message');
      ok(!c.html.includes('class="msg ok"'), 'no pass message');
      // A slot that fails on the aspect ratio only.
      const s = show({ l: 5, w: 0.2, t: 0.14 });
      ok(s.html.includes('The aspect ratio') && !s.html.includes('The area ratio 0'), 'aspect ratio message only');
      // No common foil.
      const tiny = show({ shape: 'circle', d: 0.2 });
      ok(tiny.html.includes('none of the common foils') && tiny.html.includes('class="msg warn"'), 'no common foil');
      // Units: 12 mil in a 5 mil foil is 0.3048 mm in 0.127 mm → AR = 12/20 = 0.6; µm work as well.
      near(show({ shape: 'circle', d: 12, d_u: 'mil', t: 5, t_u: 'mil' }).r.areaRatio, 0.6, 1e-9);
      near(show({ shape: 'circle', d: 300, d_u: 'um', t: 100, t_u: 'um' }).r.areaRatio, 0.75, 1e-9);
      near(show({ t: 120, t_u: 'um' }).r.thicknessMm, 0.12, 1e-12);
      // Pad and paste are optional: empty fields give no rows, filled ones do.
      ok(!d.html.includes('pad area') && !d.html.includes('Particles across'), 'no optional rows by default');
      const p = show({ pl: 0.85, pw: 0.3, paste: 't4' });
      near(p.r.pad.coverage, 0.784314, 1e-5);
      ok(p.html.includes('78.4%') && p.html.includes('Type 4'), 'coverage and paste type');
      ok(show({ pl: 0.85 }).html.includes('both the pad length and the pad width'), 'one pad side only');
      ok(show({ shape: 'circle', pd: 0.25 }).html.includes('printed onto the solder mask'), 'overprint');
      ok(show({ shape: 'circle', d: 0.2, paste: 't3' }).html.includes('too coarse'), 'five-particle warning');
      // Engine errors reach the page as messages, with the generic drawing.
      const wrong = show({ armin: 0 });
      eq(wrong.r.ok, false);
      ok(wrong.html.includes('class="msg error"') && wrong.svg.includes('<svg'), 'error message and drawing');
      // The examples set the aperture and clear the pad; foil, limits and paste stay.
      const ex = Object.fromEntries(fields.find((f) => f.key === 'ex').options.map((o) => [o.value, o.set]));
      eq(Object.keys(ex).join(), 'none,c0402,qfn,bga05,bga04,c0201');
      eq(show(ex.c0402).r.foilMm, 0.15);
      eq(show(ex.qfn).r.foilMm, 0.127);
      eq(show(ex.bga05).r.foilMm, 0.1);
      eq(show(ex.bga04).r.foilMm, 0.08);
      eq(show(ex.c0201).r.foilMm, 0.1);
      near(show(ex.bga05).r.areaRatio, 0.625, 1e-12);
      // 0201: 0.25 × 0.30 mm → 0.075/(2·0.55·0.12) = 0.568182
      near(show(ex.c0201).r.areaRatio, 0.568182, 1e-5);
      for (const [k, set] of Object.entries(ex)) {
        if (!set) continue;
        eq(`${set.pl}${set.pw}${set.pd}`, '', `${k} clears the pad`);
        ok(!('t' in set) && !('armin' in set) && !('paste' in set), `${k} leaves foil, limits and paste alone`);
      }
      // The foil presets are common foils, and the defaults of the limits are the engine's.
      const foil = fields.find((f) => f.key === 't');
      ok(foil.presets.every((x) => COMMON_FOILS_MM.includes(x.value) && x.unit === 'mm'), 'presets');
      eq(foil.presets.map((x) => x.value).join(), '0.08,0.1,0.12,0.15');
      eq(inputs().v.armin, AR_MIN);
      eq(inputs().v.asmin, ASPECT_MIN);
    } finally {
      setLang(before);
    }
  }],

  ['stencil page: diagrams stay clean for every shape and for failing, extreme or invalid inputs', () => {
    const sets = [
      {}, { shape: 'circle' }, { shape: 'circle', t: 0.1 }, { l: 0.25, w: 0.8 }, { l: 5, w: 0.2 }, { pl: 0.85, pw: 0.3 }, { pl: 0.3, pw: 0.85 },
      { pl: 9, pw: 9 }, { pl: 0.01, pw: 0.01 }, { shape: 'circle', pd: 0.25 }, { shape: 'circle', pd: 30 }, { shape: 'circle', pd: 0.001 },
      { l: 1e6, w: 1e-6 }, { l: 1e-6, w: 1e6 }, { l: 1e-9, w: 1e-9 }, { t: 1e3 }, { t: 1e-6 }, { shape: 'circle', d: 1e-9 }, { shape: 'circle', d: 1e9 },
      { shape: 'circle', d: 0.3, t: 50 }, { armin: 1e-9, asmin: 1e9 }, { l: 1e150, w: 1e-150, pl: 1e-150, pw: 1e150 }, { paste: 't5', l: 0.05, w: 0.05 },
      // Invalid input: the drawing falls back to symbols.
      { l: 0 }, { w: -1 }, { t: 0 }, { shape: 'circle', d: 0 }, { shape: 'circle', d: '' }, { armin: 0 }, { l: '', w: '', t: '' }, { l: 1e300, w: 1e300 }, { pl: -1, pw: 2 },
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
        // The paste is drawn green when the aperture passes and red when it does not.
        if (out.r.ok && out.svg.includes('zone-bad') === out.r.pass) problems.push(`${lang} ${id}: colour does not follow the verdict`);
        if (!out.r.ok && /zone-(ok|bad)/.test(out.svg)) problems.push(`${lang} ${id}: a verdict colour without a result`);
      }
    });
    ok(problems.length === 0, `\n${[...new Set(problems)].slice(0, 12).join('\n')}`);
    // The section is to proportion: twice the aspect ratio is twice the aperture width (within the clamps).
    const width = (set) => Number(show(set).svg.match(/<rect class="zone-(?:ok|bad)" x="[\d.]+" y="62" width="([\d.]+)"/)[1]);
    near(width({ shape: 'circle', d: 0.36, t: 0.12 }), 2 * width({ shape: 'circle', d: 0.18, t: 0.12 }), 1e-9);
  }],

  ['stencil page: Turkish and English strings match, and every key the page uses exists', () => {
    const tr = Object.keys(page.strings.tr);
    const en = new Set(Object.keys(page.strings.en));
    eq(tr.filter((k) => !en.has(k)).join(), '', 'only in tr');
    eq([...en].filter((k) => !tr.includes(k)).join(), '', 'only in en');
    ok(tr.every((k) => page.strings.tr[k] && page.strings.en[k]), 'no empty string');
    ok(tr.every((k) => /^(st_|ok_st_|warn_st_|err_st_)/.test(k)), 'all keys carry the st_ prefix, so no other page is overwritten');
    // Every message key the engine can return has a text.
    for (const k of ['st_positive', 'st_range']) ok(en.has(`err_${k}`), `err_${k}`);
    for (const k of ['st_noFoil', 'st_balls', 'st_overprint', 'st_padOne']) ok(en.has(`warn_${k}`), `warn_${k}`);
    for (const k of Object.keys(PASTE_TYPES)) ok(en.has(`st_pT${PASTE_TYPES[k].type}`), `paste option ${k}`);
    // Labels, hints, notes and preset labels of the form.
    for (const s of page.sections) {
      ok(!s.note || en.has(s.note), `note ${s.note}`);
      for (const f of s.fields) {
        for (const k of [f.label, f.hint, f.info, ...(f.options ?? []).map((o) => o.label), ...(f.presets ?? []).map((x) => x.label)]) {
          ok(k === undefined || en.has(k), `${f.key}: ${k}`);
        }
      }
    }
    // Field keys are unique and short (they become URL parameters); option values are lowercase ASCII.
    eq(new Set(fields.map((f) => f.key)).size, fields.length, 'unique keys');
    ok(fields.every((f) => /^[a-z]{1,6}$/.test(f.key)), 'short keys');
    ok(fields.every((f) => (f.options ?? []).every((o) => /^[a-z0-9]+$/.test(o.value))), 'option values');
    // No untranslated key shows up in a rendered result or drawing (a key would appear as st_… text).
    inBothLanguages((lang) => {
      for (const set of [{}, { shape: 'circle', d: 0.2, paste: 't3', pd: 0.15 }, { l: 0.2, w: 5, t: 0.14, pl: 1, pw: 9, paste: 't5' }, { pl: 1 }, { t: 0 }]) {
        const { html, svg } = show(set);
        const shown = `${html} ${svg}`.replace(/data-hl="[^"]*"/g, '');
        ok(!/\b(ok_|warn_|err_)?st_[A-Za-z0-9]+/.test(shown), `${lang} ${JSON.stringify(set)}: an untranslated key is shown`);
      }
    });
  }],
];
