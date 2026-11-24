import { calculatePadstack, FAB_ALLOWANCE_MM, LEAD_CLEARANCE_MM, MIN_RING_MM } from '../engine/padstack.js';
import { toMm, fromMm } from '../engine/units.js';
import { heroes, rows, block, formulaBlock, messages, invalid, checks } from '../ui/calculator.js';
import { fmt, fixed, esc } from '../ui/format.js';
import { t } from '../i18n.js';
import { isImperial } from '../prefs.js';

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
    err_lead: 'Bacak boyutları sıfırdan büyük olmalı.',
    err_hole: 'Delik çapı sıfırdan büyük olmalı.',
    warn_aspectHigh: 'En-boy oranı 10:1’in üzerinde; kaplama güvenilirliği için üreticinize danışın.',
    warn_holeLoose: 'En büyük delik IPC-2222 sınırını aşıyor (en küçük bacak + 0,7 mm; Seviye C’de 0,6 mm); lehim dolumu zayıflayabilir.',
    warn_padSmallerThanHole: 'Pad, en büyük delikten küçük veya eşit.',
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
    err_lead: 'Lead dimensions must be greater than zero.',
    err_hole: 'Hole diameter must be greater than zero.',
    warn_aspectHigh: 'Aspect ratio above 10:1; consult your fabricator about plating reliability.',
    warn_holeLoose: 'The largest hole exceeds the IPC-2222 limit (minimum lead + 0.7 mm; 0.6 mm at Level C); solder fill may suffer.',
    warn_padSmallerThanHole: 'Pad is smaller than or equal to the largest hole.',
  },
};

const LEN = ['mm', 'mil'];
const L = (mm, d = 3) => (isImperial() ? `${fixed(fromMm(mm, 'mil'), 1)} mil` : `${fixed(mm, d)} mm`);
const Lh = (mm) => (isImperial()
  ? `${fixed(fromMm(mm, 'mil'), 1)} <span class="u">mil</span>`
  : `${fixed(mm, 3)} <span class="u">mm</span>`);

function diagram() {
  return `
  <svg class="diagram" viewBox="0 0 380 120" role="img" aria-label="pad">
    <circle class="cu" cx="190" cy="60" r="48"/>
    <circle class="hole" cx="190" cy="60" r="26"/>
    <path class="dim" d="M142 60h96"/><text x="200" y="54" class="lbl" text-anchor="start">pad</text>
    <path class="line" d="M216 60h22"/><text x="227" y="74" style="font-size:11px">b</text>
    <path class="dim" d="M164 60h52"/><text x="180" y="74" style="font-size:11px">a</text>
    <text class="lbl" x="300" y="40" text-anchor="start">a + 2b + c</text>
  </svg>`;
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

  render(r) {
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
      + block('results', rows([
        r.leadDia !== null && ['ps_leadEq', L(r.leadDia)],
        ['ps_holeNom', L(r.nominalHole)],
        ['ps_holeRange', `${L(r.minHole)} – ${L(r.maxHole)}`],
        ['ps_drill', L(r.drill)],
        ['ps_fab', L(r.fabAllowance, 2)],
        r.aspectRatio && ['ps_ar', `${fixed(r.aspectRatio, 1)} : 1`],
      ]))
      + chk
      + formulaBlock([
        'Component hole:  d_hole,min = d_lead,max + 0.25 / 0.20 / 0.15 mm   (A / B / C)',
        '                 d_hole,max ≤ d_lead,min + 0.7 / 0.7 / 0.6 mm',
        'Land:            D = a + 2b + c',
        '                 a = max finished hole (ext) · max drilled hole (int)',
        `                 b = ${fmt(MIN_RING_MM.external)} mm (ext) / ${fmt(MIN_RING_MM.internal)} mm (int)`,
        `                 c = ${Object.entries(FAB_ALLOWANCE_MM).map(([k, x]) => `${k} ${fmt(x)}`).join(' · ')} mm  + 0.05 mm/oz above 1 oz`,
        'Worst-case ring: (D − a − c) / 2',
        `Rect. lead:      d = √(w² + t²)     (clearance ${Object.values(LEAD_CLEARANCE_MM).map((x) => fmt(x)).join('/')} mm)`,
      ], 'ps_note', ['IPC-2221 §9.1, Tables 9-1/9-2', 'IPC-2222 Table 9-3', 'IPC-6012 §3.4.2']);
  },
};
