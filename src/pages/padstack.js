import { calculatePadstack, FAB_ALLOWANCE_MM, LEAD_CLEARANCE_MM, MIN_RING_MM } from '../engine/padstack.js';
import { toMm, fromMm } from '../engine/units.js';
import { heroes, rows, block, steps, messages, invalid, checks } from '../ui/calculator.js';
import { tx } from '../ui/math.js';
import { fmt, fixed, esc } from '../ui/format.js';
import { t } from '../i18n.js';
import { isImperial } from '../prefs.js';
import { svg, rect, circle, path, ring as annulus, text, dimH, arrow } from '../ui/svg.js';
import { fabCheck } from '../ui/fabcheck.js';

const strings = {
  tr: {
    ps_kind: 'Delik tipi',
    ps_via: 'Via / kaplamalı delik',
    ps_round: 'Yuvarlak bacak',
    ps_rect: 'Dikdörtgen bacak',
    ps_hole: 'Bitmiş delik çapı (nominal)',
    ps_lead: 'En büyük bacak çapı',
    ps_leadInfo: 'Veri sayfasındaki maksimum bacak çapını kullanın (nominal değil).',
    ps_leadW: 'Bacak genişliği',
    ps_leadT: 'Bacak kalınlığı',
    ps_tol: 'Bitmiş delik toleransı (±)',
    ps_tolInfo: 'Kaplamalı delikler için tipik ±0,075–0,1 mm. Üreticinizin kabiliyet tablosuna bakın.',
    ps_level: 'Üretilebilirlik seviyesi',
    ps_levelInfo: 'IPC-2221: Seviye A genel tasarım (en kolay üretim), B orta, C yüksek hassasiyet. Seviye büyüdükçe üretim payı küçülür ve maliyet artar.',
    ps_levelA: 'A — genel',
    ps_levelB: 'B — orta',
    ps_levelC: 'C — yüksek',
    ps_board: 'Kart kalınlığı',
    ps_drillAllow: 'Matkap payı (bitmiş deliğe göre)',
    ps_drillAllowInfo: 'Kaplama delik çapını küçülttüğü için üretici daha büyük matkap kullanır; tipik +0,1 mm (bileşen deliği) veya +0,05 mm (via).',
    sectionCheck: 'Tasarımdaki padi kontrol et',
    ps_pad: 'Pad çapı',
    ps_landExt: 'Min. pad çapı (dış katman)',
    ps_landInt: 'Min. pad çapı (iç katman)',
    ps_holeNom: 'Bitmiş delik (nominal)',
    ps_holeRange: 'Bitmiş delik (min – max)',
    ps_drill: 'Tahmini matkap çapı',
    ps_leadEq: 'Eşdeğer bacak çapı',
    ps_fab: 'Üretim payı (c)',
    ps_ar: 'En-boy oranı (kart / matkap)',
    ps_checks: 'Halka kontrolleri',
    ps_ringNom: 'Nominal halka',
    ps_ringWorst: 'En kötü durum halkası',
    ps_c2221e: 'IPC-2221 dış halka ≥ 0,050 mm',
    ps_c2221i: 'IPC-2221 iç halka ≥ 0,025 mm',
    ps_c3e: 'IPC-6012 Sınıf 3 dış ≥ 0,050 mm',
    ps_c3i: 'IPC-6012 Sınıf 3 iç ≥ 0,025 mm',
    ps_cBreak: 'Kırılma yok (Sınıf 1–2 için güvenli)',
    ps_note: 'Pad çapı = a + 2b + c: a dış katmanda en büyük bitmiş delik, iç katmanda en büyük matkap deliği; b en küçük halka; c delik konumu ve aşındırma toleranslarını karşılayan üretim payıdır. IPC-6012’ye göre Sınıf 1 180°, Sınıf 2 90° delik kırılmasına (breakout) izin verir (Sınıf 2 iç katmanda yalnızca damla/fillet varsa); Sınıf 3 ölçülen en küçük halkayı şart koşar. Kırılmaya izin verilen tasarımlarda IPC-2221 damla (teardrop) kullanılmasını ister. Dikdörtgen bacakta köşegen kullanılır.',
    ps_oz: 'Pad bakır ağırlığı',
    ps_ozInfo: 'IPC-2221: 1 oz’un üzerindeki her oz için üretim payına 0,05 mm eklenir (kalın bakır daha fazla yan aşınır).',
    ps_ringWorstInt: 'En kötü durum halkası (iç, matkaba göre)',
    ps_aExt: 'En büyük bitmiş delik (a, dış katman)',
    ps_aInt: 'En büyük matkap deliği (a, iç katman)',
    ps_kLead: 'Seviyenin bacak–delik boşluğu (IPC-2222 Tablo 9-3)',
    ps_cLevel: 'Seviyenin üretim payı (IPC-2221 Tablo 9-1)',
    err_lead: 'Bacak boyutları sıfırdan büyük olmalı.',
    err_hole: 'Delik çapı sıfırdan büyük olmalı.',
    warn_aspectHigh: 'En-boy oranı 10:1’in üzerinde; kaplama güvenilirliği için üreticinize danışın.',
    warn_holeLoose: 'En büyük delik IPC-2222 sınırını aşıyor (en küçük bacak + 0,7 mm; Seviye C’de 0,6 mm); lehim dolumu zayıflayabilir.',
    warn_padSmallerThanHole: 'Pad, en büyük delikten küçük veya eşit.',
    ps_dgAria: 'Padin ölçekli üstten görünüşü: pad çapı, bitmiş delik toleransı, matkap deliği, delikteki bacak ve c/2 kadar kaymış en büyük delikle kalan en kötü durum halkası; altta D = a + 2b + c zinciri',
    ps_dgScale: 'ölçekli · üstten görünüş · dış katman',
    ps_dgPad: 'pad',
    ps_dgMinPad: 'min. pad',
    ps_dgMaxHole: 'en büyük delik',
    ps_dgMinRing: 'min. halka',
    ps_dgAllow: 'üretim payı',
    ps_dgTol: 'delik toleransı',
    ps_dgDrill: 'matkap',
    ps_dgWorst: 'en kötü halka',
    ps_dgLead: 'bacak',
    ps_dgClear: 'çap boşluğu',
  },
  en: {
    ps_kind: 'Hole type',
    ps_via: 'Via / plated hole',
    ps_round: 'Round lead',
    ps_rect: 'Rectangular lead',
    ps_hole: 'Finished hole diameter (nominal)',
    ps_lead: 'Maximum lead diameter',
    ps_leadInfo: 'Use the maximum lead diameter from the datasheet, not the nominal.',
    ps_leadW: 'Lead width',
    ps_leadT: 'Lead thickness',
    ps_tol: 'Finished hole tolerance (±)',
    ps_tolInfo: 'Typically ±0.075–0.1 mm for plated holes. Check your fabricator’s capability sheet.',
    ps_level: 'Producibility level',
    ps_levelInfo: 'IPC-2221: Level A general design (easiest to build), B moderate, C high precision. Higher levels shrink the fabrication allowance and raise cost.',
    ps_levelA: 'A — general',
    ps_levelB: 'B — moderate',
    ps_levelC: 'C — high',
    ps_board: 'Board thickness',
    ps_drillAllow: 'Drill allowance (vs finished hole)',
    ps_drillAllowInfo: 'Plating shrinks the hole, so the fabricator drills larger; typically +0.1 mm (component holes) or +0.05 mm (vias).',
    sectionCheck: 'Check the pad in your design',
    ps_pad: 'Pad diameter',
    ps_landExt: 'Min. pad diameter (external)',
    ps_landInt: 'Min. pad diameter (internal)',
    ps_holeNom: 'Finished hole (nominal)',
    ps_holeRange: 'Finished hole (min – max)',
    ps_drill: 'Estimated drill diameter',
    ps_leadEq: 'Equivalent lead diameter',
    ps_fab: 'Fabrication allowance (c)',
    ps_ar: 'Aspect ratio (board / drill)',
    ps_checks: 'Annular ring checks',
    ps_ringNom: 'Nominal ring',
    ps_ringWorst: 'Worst-case ring',
    ps_c2221e: 'IPC-2221 external ring ≥ 0.050 mm',
    ps_c2221i: 'IPC-2221 internal ring ≥ 0.025 mm',
    ps_c3e: 'IPC-6012 Class 3 external ≥ 0.050 mm',
    ps_c3i: 'IPC-6012 Class 3 internal ≥ 0.025 mm',
    ps_cBreak: 'No breakout (safe for Class 1–2)',
    ps_note: 'Land diameter = a + 2b + c: a is the largest finished hole on external layers and the largest drilled hole on internal layers; b the minimum annular ring; c the fabrication allowance covering drill position and etch tolerances. Per IPC-6012, Class 1 accepts 180° and Class 2 90° hole breakout (Class 2 internal only with teardrops/fillets); Class 3 requires a measured minimum ring. Where breakout is allowed, IPC-2221 asks for teardrops. For rectangular leads the diagonal is used.',
    ps_oz: 'Pad copper weight',
    ps_ozInfo: 'IPC-2221: add 0.05 mm to the fabrication allowance for each oz above 1 oz (thick copper undercuts more).',
    ps_ringWorstInt: 'Worst-case ring (internal, to drilled hole)',
    ps_aExt: 'Largest finished hole (a, external)',
    ps_aInt: 'Largest drilled hole (a, internal)',
    ps_kLead: 'Lead-to-hole clearance of the level (IPC-2222 Table 9-3)',
    ps_cLevel: 'Fabrication allowance of the level (IPC-2221 Table 9-1)',
    err_lead: 'Lead dimensions must be greater than zero.',
    err_hole: 'Hole diameter must be greater than zero.',
    warn_aspectHigh: 'Aspect ratio above 10:1; consult your fabricator about plating reliability.',
    warn_holeLoose: 'The largest hole exceeds the IPC-2222 limit (minimum lead + 0.7 mm; 0.6 mm at Level C); solder fill may suffer.',
    warn_padSmallerThanHole: 'Pad is smaller than or equal to the largest hole.',
    ps_dgAria: 'Pad top view to scale: pad diameter, finished-hole tolerance, drilled hole, the lead in the hole and the worst-case ring left when the largest hole shifts by c/2; below, the chain D = a + 2b + c',
    ps_dgScale: 'to scale · top view · external layer',
    ps_dgPad: 'pad',
    ps_dgMinPad: 'min. pad',
    ps_dgMaxHole: 'largest hole',
    ps_dgMinRing: 'min. ring',
    ps_dgAllow: 'fab. allowance',
    ps_dgTol: 'hole tolerance',
    ps_dgDrill: 'drill',
    ps_dgWorst: 'worst ring',
    ps_dgLead: 'lead',
    ps_dgClear: 'clearance (dia.)',
  },
};

const LEN = ['mm', 'mil'];
const L = (mm, d = 3) => (isImperial() ? `${fixed(fromMm(mm, 'mil'), 1)} mil` : `${fixed(mm, d)} mm`);
const Lh = (mm) => (isImperial()
  ? `${fixed(fromMm(mm, 'mil'), 1)} <span class="u">mil</span>`
  : `${fixed(mm, 3)} <span class="u">mm</span>`);

const r2 = (x) => Math.round(x * 100) / 100;

/**
 * Calculation steps in the order of the engine: hole size (from the lead for
 * component holes), the largest holes a, the allowance c, the two minimum
 * lands and, when a pad is given, its worst-case rings.
 */
function worked(r, v, u) {
  // The engine works in mm and the terms add up exactly there, so the steps use mm
  // (to the nanometre); imperial readers also get the results in mil.
  const q = (mm) => tx(`${fmt(Number(mm.toFixed(6)), 12)} mm`.replace('-', '−'));
  const out = (mm) => q(mm) + (isImperial() ? ` = ${tx(`${fmt(fromMm(mm, 'mil'), 4)} mil`.replace('-', '−'))}` : '');
  const mm = (k) => toMm(v[k], u[k]);
  const lead = v.k !== 'via';
  const rect = v.k === 'rect';
  const heavy = v.oz > 1;
  const lv = tx(r.level);
  const tol = q(mm('tol'));
  const c = q(r.fabAllowance);
  const a = q(r.maxHole);
  const aInt = q(r.maxDrill);
  const pad = r.check;
  return steps([
    rect && { label: 'ps_leadEq', sym: 'd_{lead} = \\sqrt{w^{2} + t^{2}}',
      num: `\\sqrt{{(${q(mm('lw'))})}^{2} + {(${q(mm('lt'))})}^{2}}`, res: q(r.leadDia) },
    lead && { label: 'ps_holeNom', sym: `d_{nom} = d_{lead} + k_{${lv}} + Δ`,
      num: `${q(r.leadDia)} + ${q(LEAD_CLEARANCE_MM[r.level])} + ${tol}`, res: out(r.nominalHole) },
    { label: 'ps_aExt', sym: 'a_{ext} = d_{nom} + Δ', num: `${q(r.nominalHole)} + ${tol}`, res: a },
    heavy
      ? { label: 'ps_fab', sym: `c = c_{${lv}} + ${q(0.05)} \\cdot (W − 1)`,
        num: `${q(FAB_ALLOWANCE_MM[r.level])} + ${q(0.05)} \\cdot (${fmt(v.oz, 4)} − 1)`, res: c }
      : { label: 'ps_fab', sym: `c = c_{${lv}}`, res: c },
    { label: 'ps_landExt', sym: 'D_{ext} = a_{ext} + 2 b_{ext} + c', num: `${a} + 2 \\cdot ${q(MIN_RING_MM.external)} + ${c}`, res: out(r.landExt) },
    { label: 'ps_aInt', sym: 'a_{int} = a_{ext} + Δ_{drill}', num: `${a} + ${q(mm('da'))}`, res: aInt },
    { label: 'ps_landInt', sym: 'D_{int} = a_{int} + 2 b_{int} + c', num: `${aInt} + 2 \\cdot ${q(MIN_RING_MM.internal)} + ${c}`, res: out(r.landInt) },
    pad && { label: 'ps_ringWorst', sym: 'r_{ext} = \\frac{D − a_{ext} − c}{2}', num: `\\frac{${q(pad.padMm)} − ${a} − ${c}}{2}`, res: out(pad.worstRing) },
    pad && { label: 'ps_ringWorstInt', sym: 'r_{int} = \\frac{D − a_{int} − c}{2}', num: `\\frac{${q(pad.padMm)} − ${aInt} − ${c}}{2}`, res: out(pad.worstRingInt) },
  ], {
    note: 'ps_note',
    where: [
      v.k === 'via' && ['d_{nom}', 'ps_hole', 'h'],
      v.k === 'round' && ['d_{lead}', 'ps_lead', 'ld'],
      rect && ['w', 'ps_leadW', 'lw'], rect && ['t', 'ps_leadT', 'lt'],
      lead && [`k_{${lv}}`, 'ps_kLead', 'lv'],
      ['Δ', 'ps_tol', 'tol'], ['Δ_{drill}', 'ps_drillAllow', 'da'],
      [`c_{${lv}}`, 'ps_cLevel', 'lv'], heavy && ['W', 'ps_oz', 'oz'],
      ['b_{ext}', 'ps_c2221e'], ['b_{int}', 'ps_c2221i'],
      pad && ['D', 'ps_pad', 'pad'],
    ],
    refs: ['IPC-2221 §9.1, Tables 9-1/9-2', 'IPC-2222 Table 9-3', 'IPC-6012 §3.4.2'],
  });
}

/**
 * Live top view, to scale: pad, finished-hole tolerance band, drilled hole,
 * the lead in the hole, and the worst case — the largest hole shifted by c/2
 * — which leaves the worst-case annular ring (green/red against IPC-2221).
 * The chain below explains the land formula D = a + 2b + c.
 */
function diagram(v, u, r) {
  const cx = 118; const cy = 114; const R = 70;
  const ok = !!r;
  const b = MIN_RING_MM.external;
  const padGiven = !!r?.check;
  const isLead = v.k !== 'via';
  let a; let minH; let nomH; let drill; let c; let landExt; let leadD = null;
  if (ok) {
    ({ maxHole: a, minHole: minH, nominalHole: nomH, drill, fabAllowance: c, landExt } = r);
    leadD = r.leadDia;
  } else {
    nomH = 0.5; minH = 0.4; a = 0.6; drill = 0.65; c = 0.25; landExt = a + 2 * b + c;
    if (isLead) leadD = 0.28;
  }
  const D = padGiven ? r.check.padMm : landExt;
  const ring = (D - a - c) / 2;
  const pass = padGiven ? r.check.ipc2221Ext : null;
  const s = R / Math.max(D / 2, c / 2 + a / 2, drill / 2);
  const Rp = (D / 2) * s;
  const gx = cx + (c / 2) * s;
  const ra = Math.max((a / 2) * s, 3);
  const tone = pass === null ? 'hi' : pass ? 'good' : 'bad';

  // Pad, finished hole, tolerance band (min…max), drilled hole.
  let g = circle(cx, cy, Rp, 'cu') + circle(cx, cy, Math.max((nomH / 2) * s, 2), 'hole');
  const rMin = Math.max((minH / 2) * s, 1);
  const rMax = Math.max((a / 2) * s, rMin + 1.5);
  g += annulus(cx, cy, rMax, rMin, 'zone')
    + circle(cx, cy, rMin, 'dimline') + circle(cx, cy, rMax, 'dimline')
    + circle(cx, cy, Math.max((drill / 2) * s, rMax + 1), 'dim');
  // Component lead inside the hole.
  if (isLead && leadD > 0) {
    if (v.k === 'rect' && ok) {
      const w = toMm(v.lw, u.lw) * s; const h = toMm(v.lt, u.lt) * s;
      g += rect(cx - w / 2, cy - h / 2, w, h, 'soft') + rect(cx - w / 2, cy - h / 2, w, h, 'wire');
    } else g += circle(cx, cy, (leadD / 2) * s, 'soft') + circle(cx, cy, (leadD / 2) * s, 'wire');
  }
  // Worst case: largest hole, moved by c/2 → the thinnest ring.
  g += circle(gx, cy, ra, `wave2 ${tone === 'hi' ? '' : tone}`)
    + path(`M${r2(cx - 4)},${cy}h8M${cx},${cy - 4}v8M${r2(gx - 3)},${cy - 3}l6,6M${r2(gx - 3)},${cy + 3}l6,-6`, 'dimline');
  if (gx - cx >= 12) g += arrow(cx, cy, gx, cy, { cls: 'dimline' }) + text((cx + gx) / 2, cy - 9, 'c/2', { cls: 'sym' });
  g += `<path class="wire ${tone}" style="stroke-width:3" d="M${r2(gx + ra)},${cy}H${r2(cx + Rp)}"/>`;

  // Pad diameter above; chain below: [ring + c][a][ring] = D.
  const Dlbl = ok ? `${padGiven ? 'D' : 'D_min'} = ${L(D)}` : 'D';
  g += dimH(cx - Rp, cx + Rp, cy - Math.max(Rp, ra) - 10, Dlbl, { cls: ok ? 'val' : 'sym', extFrom: cy });
  const yC = cy + Math.max(Rp, ra, (drill / 2) * s) + 12;
  const xs = [cx - Rp, gx - ra, gx + ra, cx + Rp];
  g += path(xs.map((x) => `M${r2(x)},${cy}V${yC + 4}`).join(''), 'ext')
    + path(`M${r2(Math.min(...xs) - 4)},${yC}H${r2(Math.max(...xs) + 4)}`, 'dimline')
    + path(xs.map((x) => `M${r2(x - 3)},${yC + 3}l6,-6`).join(''), 'wire');
  // Segment labels: centred when they fit, else outside; never on top of each other.
  const rs = padGiven ? 'r' : 'b';
  let free = -Infinity;
  [[xs[0], xs[1], `${rs} + c`, 'sym'], [xs[1], xs[2], 'a', 'sym'], [xs[2], xs[3], rs, pass === false ? 'badt' : 'sym']]
    .forEach(([x1, x2, s1, cls], i) => {
      const lo = Math.min(x1, x2); const hi = Math.max(x1, x2); const w = s1.length * 7;
      let x = (lo + hi) / 2 - w / 2;
      if (hi - lo < w + 4) x = i === 0 ? lo - 5 - w : hi + 5;
      x = Math.max(x, free);
      g += text(x, yC + 14, s1, { cls, anchor: 'start' });
      free = x + w + 6;
    });

  // Legend with the live values.
  const x0 = 252;
  let y = 30;
  const val = (mm, d = 3) => (ok ? L(mm, d) : '—');
  const row = (sw, value, desc, vcls = 'val') => {
    const out = sw(y) + text(x0 + 22, y, value, { cls: vcls, anchor: 'start' }) + text(x0 + 92, y, desc, { cls: 'lbl', anchor: 'start' });
    y += 15.5;
    return out;
  };
  const sym = (ch) => (yy) => text(x0 + 6, yy, ch, { cls: 'sym' });
  const box = (cls) => (yy) => rect(x0, yy - 9, 13, 10, cls);
  const ringSw = (cls) => (yy) => circle(x0 + 6.5, yy - 4, 5, cls);
  g += row(box('cu'), val(D), t(padGiven ? 'ps_dgPad' : 'ps_dgMinPad'))
    + row(sym('a'), val(a), t('ps_dgMaxHole'))
    + row(sym('b'), val(b), t('ps_dgMinRing'))
    + row(sym('c'), val(c), t('ps_dgAllow'));
  g += text(x0, y, ok ? `a + 2b + c = ${L(landExt)}` : 'a + 2b + c', { cls: ok ? 'val' : 'sym', anchor: 'start' });
  y += 19;
  g += row((yy) => rect(x0, yy - 9, 13, 10, 'zone') + rect(x0, yy - 9, 13, 10, 'dimline'), ok ? `±${L((a - minH) / 2)}` : '—', t('ps_dgTol'))
    + row(ringSw('dim'), val(drill), t('ps_dgDrill'))
    + row(ringSw(`wave2 ${tone === 'hi' ? '' : tone}`), val(ring), `${t('ps_dgWorst')}${pass === null ? '' : pass ? ' ✓' : ' ✗'}`,
      pass === null ? 'val' : pass ? 'okt' : 'badt');
  if (isLead) {
    g += row(box('soft'), val(leadD), t('ps_dgLead'))
      + row(sym('↔'), ok ? L(minH - leadD) : '—', t('ps_dgClear'));
  }
  g += text(8, 14, t('ps_dgScale'), { cls: 'title', anchor: 'start' });
  return svg(440, 222, g, t('ps_dgAria'), { wide: true });
}

export default {
  id: 'padstack',
  strings,
  sections: [
    {
      title: 'sectionSetup',
      fields: [
        { key: 'k', type: 'choice', label: 'ps_kind', default: 'via',
          options: [{ value: 'via', label: 'ps_via' }, { value: 'round', label: 'ps_round' }, { value: 'rect', label: 'ps_rect' }] },
        { key: 'lv', type: 'choice', label: 'ps_level', default: 'B', info: 'ps_levelInfo',
          options: [{ value: 'A', label: 'ps_levelA' }, { value: 'B', label: 'ps_levelB' }, { value: 'C', label: 'ps_levelC' }] },
      ],
    },
    {
      title: 'sectionInputs',
      fields: [
        { key: 'h', type: 'number', label: 'ps_hole', default: 0.3, units: LEN, pref: 'length', show: (v) => v.k === 'via' },
        { key: 'ld', type: 'number', label: 'ps_lead', default: 0.64, units: LEN, pref: 'length', info: 'ps_leadInfo', show: (v) => v.k === 'round' },
        { key: 'lw', type: 'number', label: 'ps_leadW', default: 0.64, units: LEN, pref: 'length', show: (v) => v.k === 'rect' },
        { key: 'lt', type: 'number', label: 'ps_leadT', default: 0.25, units: LEN, pref: 'length', show: (v) => v.k === 'rect' },
        { key: 'tol', type: 'number', label: 'ps_tol', default: 0.075, units: LEN, valid: 'nonneg', info: 'ps_tolInfo' },
        { key: 'da', type: 'number', label: 'ps_drillAllow', default: 0.1, units: LEN, valid: 'nonneg', info: 'ps_drillAllowInfo' },
        { key: 'oz', type: 'number', label: 'ps_oz', default: 1, units: ['oz'], info: 'ps_ozInfo',
          presets: [0.5, 1, 2, 3].map((x) => ({ label: `${x} oz`, value: x })) },
        { key: 'b', type: 'number', label: 'ps_board', default: 1.6, units: LEN, optional: true },
      ],
    },
    {
      title: 'sectionCheck',
      collapsible: true,
      optional: true,
      fields: [
        { key: 'pad', type: 'number', label: 'ps_pad', default: '', optional: true, units: LEN, pref: 'length' },
      ],
    },
  ],

  diagram,

  compute(v, u) {
    const mm = (k) => (Number.isFinite(v[k]) ? toMm(v[k], u[k]) : NaN);
    return calculatePadstack({
      kind: v.k, level: v.lv, holeMm: mm('h'), leadMm: mm('ld'), leadW: mm('lw'), leadT: mm('lt'),
      tolMm: mm('tol'), drillAllowMm: mm('da'), boardMm: mm('b'), padMm: mm('pad'), copperOz: v.oz,
    });
  },

  render(r, v, u) {
    if (!r.ok) return invalid(r.errors);
    const main = heroes([['ps_landExt', Lh(r.landExt)], ['ps_landInt', Lh(r.landInt)]]);
    const c = r.check;
    const chk = c
      ? block('ps_checks', rows([
        ['ps_ringNom', L(c.nominalRing)],
        ['ps_ringWorst', L(c.worstRing)],
        ['ps_ringWorstInt', L(c.worstRingInt)],
      ]) + checks([
        [c.ipc2221Ext, esc(t('ps_c2221e'))],
        [c.ipc2221Int, esc(t('ps_c2221i'))],
        [c.class3Ext, esc(t('ps_c3e'))],
        [c.class3Int, esc(t('ps_c3i'))],
        [c.noBreakout, esc(t('ps_cBreak'))],
      ]))
      : '';
    return main + messages('warn', r.warnings)
      + worked(r, v, u)
      + block('results', rows([
        r.leadDia !== null && ['ps_leadEq', L(r.leadDia)],
        ['ps_holeNom', L(r.nominalHole)],
        ['ps_holeRange', `${L(r.minHole)} – ${L(r.maxHole)}`],
        ['ps_drill', L(r.drill)],
        ['ps_fab', L(r.fabAllowance, 2)],
        r.aspectRatio && ['ps_ar', `${fixed(r.aspectRatio, 1)} : 1`],
      ]))
      + chk
      // Fab check: nominal finished hole and the designed pad (or the computed minimum land).
      + fabCheck({ holeMm: r.nominalHole, padMm: c ? c.padMm : r.landExt, holeKind: v.k === 'via' ? 'via' : 'pth',
        boardMm: Number.isFinite(v.b) ? toMm(v.b, u.b) : undefined });
  },
};
