import { crosstalk, nextLengthFactor } from '../engine/signal.js';
import { toMm, fromMm } from '../engine/units.js';
import { hero, rows, block, steps, checks } from '../ui/calculator.js';
import { tx } from '../ui/math.js';
import { fmt, fixed, si, esc } from '../ui/format.js';
import { t } from '../i18n.js';
import { isImperial } from '../prefs.js';
import { svg, rect, path, text, dimH, dimV } from '../ui/svg.js';

const strings = {
  tr: {
    xt_structure: 'Yapı',
    xt_micro: 'Microstrip',
    xt_strip: 'Stripline',
    xt_gap: 'İzler arası boşluk (kenardan kenara)',
    xt_w: 'İz genişliği',
    xt_h: 'Referans düzleme yükseklik (H)',
    xt_hInfo: 'İz ile en yakın referans düzlemi arasındaki dielektrik kalınlığı.',
    xt_h1: 'Alt düzleme yükseklik (Ha)',
    xt_h2: 'Üst düzleme yükseklik (Hb)',
    xt_kMode: 'Kuplaj katsayısı K',
    xt_kWorst: 'En kötü durum (K = 1)',
    xt_kLen: 'Uzunluk ve kenardan',
    xt_kManual: 'Elle',
    xt_kInfo: 'Yakın uç karışma, kuplajlı uzunluğun gidiş-dönüş gecikmesi yükselme süresine ulaştığında doyar. Daha kısa paralel bölümlerde K < 1 olur.',
    xt_k: 'K',
    xt_len: 'Paralel (kuplajlı) uzunluk',
    xt_tr: 'Yükselme süresi',
    xt_er: 'Etkin dielektrik sabiti (εeff)',
    xt_swing: 'Saldırgan sinyal genliği',
    xt_target: 'Hedef karışma',
    xt_result: 'Yakın uç karışma (NEXT) tahmini',
    xt_db: 'Desibel olarak',
    xt_D: 'Merkezden merkeze mesafe (D)',
    xt_H: 'Etkin yükseklik (H)',
    xt_dh: 'D / H',
    xt_kUsed: 'Kullanılan K',
    xt_noise: 'Kurban hattaki gürültü',
    xt_required: 'Hedef için gereken boşluk',
    xt_rules: 'Kural kontrolleri',
    xt_3w: '3W kuralı (merkezden merkeze ≥ 3w)',
    xt_target_ok: 'Hedef karışmanın altında',
    xt_note: 'H. Johnson: karışma ≈ K / (1 + (D/H)²), D merkezden merkeze mesafe, H düzleme yükseklik; iz genişliği ve kalınlığı formülde yer almaz. D. Brooks’a göre stripline’da H = Ha·Hb/(Ha+Hb) ve K = min(1, 2·L·t_pd / tr). Bu bir üst sınır tahminidir; kesin değer için alan çözücü veya SI simülasyonu kullanın. Mesafeyi iki katına çıkarmak karışmayı yaklaşık dörtte birine indirir; düzleme yaklaşmak da aynı etkiyi verir.',
    xt_dgAria: 'Saldırgan ve kurban izlerin kesiti: s, w, D ve H ölçüleri ile kuplaj alan çizgileri',
    xt_dgAggr: 'saldırgan',
    xt_dgVictim: 'kurban',
  },
  en: {
    xt_structure: 'Structure',
    xt_micro: 'Microstrip',
    xt_strip: 'Stripline',
    xt_gap: 'Gap between traces (edge to edge)',
    xt_w: 'Trace width',
    xt_h: 'Height above reference plane (H)',
    xt_hInfo: 'Dielectric thickness between the trace and its nearest reference plane.',
    xt_h1: 'Height to lower plane (Ha)',
    xt_h2: 'Height to upper plane (Hb)',
    xt_kMode: 'Coupling coefficient K',
    xt_kWorst: 'Worst case (K = 1)',
    xt_kLen: 'From length & edge',
    xt_kManual: 'Manual',
    xt_kInfo: 'Near-end crosstalk saturates once the coupled length’s round-trip delay reaches the rise time. Shorter parallel runs have K < 1.',
    xt_k: 'K',
    xt_len: 'Parallel (coupled) length',
    xt_tr: 'Rise time',
    xt_er: 'Effective dielectric constant (εeff)',
    xt_swing: 'Aggressor signal swing',
    xt_target: 'Target crosstalk',
    xt_result: 'Near-end crosstalk (NEXT) estimate',
    xt_db: 'In decibels',
    xt_D: 'Centre-to-centre distance (D)',
    xt_H: 'Effective height (H)',
    xt_dh: 'D / H',
    xt_kUsed: 'K used',
    xt_noise: 'Noise on the victim',
    xt_required: 'Gap needed for the target',
    xt_rules: 'Rule checks',
    xt_3w: '3W rule (centre-to-centre ≥ 3w)',
    xt_target_ok: 'Below the target crosstalk',
    xt_note: 'H. Johnson: crosstalk ≈ K / (1 + (D/H)²), with D the centre-to-centre distance and H the height above the plane; trace width and thickness do not appear. Per D. Brooks, for stripline H = Ha·Hb/(Ha+Hb) and K = min(1, 2·L·t_pd / tr). This is an upper-bound estimate; use a field solver or SI simulation for exact values. Doubling the spacing cuts crosstalk to about a quarter; moving closer to the plane does the same.',
    xt_dgAria: 'Cross-section of the aggressor and victim traces with the s, w, D and H dimensions and coupling field lines',
    xt_dgAggr: 'aggressor',
    xt_dgVictim: 'victim',
  },
};

/**
 * Live cross-section (roughly to scale; very thin layers are drawn at a
 * minimum size). Dashed field lines from the aggressor reach the victim
 * (coupling) and the plane (return path): a closer plane or a wider spacing
 * keeps more of the field away from the victim.
 */
function diagram(v, u, r) {
  const strip = isStrip(v);
  const mmOf = (k) => (Number.isFinite(v[k]) && v[k] > 0 ? toMm(v[k], u[k]) : NaN);
  const dims = { w: mmOf('w'), s: mmOf('s'), ha: mmOf('h'), hb: strip ? mmOf('h2') : 1 };
  const ok = Object.values(dims).every(Number.isFinite);
  const w = ok ? dims.w : 0.2;
  const s = ok ? dims.s : 0.2;
  const ha = ok ? dims.ha : 0.1;
  const hb = strip ? (ok ? dims.hb : 0.2) : 0;
  const lenS = (mm) => (Number.isFinite(mm)
    ? (isImperial() ? `${fmt(fromMm(mm, 'mil'), 3)} mil` : `${fmt(mm, 3)} mm`)
    : '?');
  const k = Math.min(190 / (2 * w + s), 52 / Math.max(ha, hb));
  const wp = Math.max(18, w * k);
  const sp = Math.max(12, s * k);
  const hap = Math.max(22, ha * k);
  const hbp = strip ? Math.max(22, hb * k) : 0;
  const aL = 220 - (2 * wp + sp) / 2;
  const aR = aL + wp;
  const vL = aR + sp;
  const vR = vL + wp;
  const aC = (aL + aR) / 2;
  const vC = (vL + vR) / 2;
  const pTh = 6;
  const tTop = strip ? 56 + hbp : 56;
  const tBot = tTop + 8;
  const tMid = tTop + 4;
  const lp = tBot + hap; // lower plane top
  let b = '';
  // Layers
  if (strip) b += rect(30, 56, 380, lp - 56, 'diel') + rect(30, 50, 380, pTh, 'cu');
  else b += rect(30, tBot, 380, hap, 'diel');
  b += rect(30, lp, 380, pTh, 'cu');
  // Field lines: to the victim (coupling) and to the plane(s) (return path).
  b += path(`M${aR - 3},${tTop}Q${(aR + vL) / 2},${tTop - 16} ${vL + 3},${tTop}`, 'wave2')
    + path(`M${aR},${tMid}H${vL}`, 'wave2')
    + path(`M${aR - 3},${tBot}Q${(aR + vL) / 2},${tBot + hap * 0.9} ${vL + 3},${tBot}`, 'wave2')
    + path(`M${aL + wp * 0.3},${tBot}V${lp}M${aL + wp * 0.7},${tBot}V${lp}`, 'ext');
  if (strip) b += path(`M${aL + wp * 0.3},${tTop}V56M${aL + wp * 0.7},${tTop}V56`, 'ext');
  // Traces
  b += rect(aL, tTop, wp, 8, 'cu') + rect(vL, tTop, wp, 8, 'cu')
    + text(aL - 16, tMid + 4, t('xt_dgAggr'), { anchor: 'end' })
    + text(vR + 10, tMid + 4, t('xt_dgVictim'), { anchor: 'start' })
    + text(vR + 10, tMid + 20, `NEXT ≈ ${r ? `${fixed(r.fraction * 100, 2)} %` : '?'}`, { cls: 'val', anchor: 'start' });
  // Dimensions
  b += path(`M${aC},${tTop}V18M${vC},${tTop}V18`, 'ext')
    + dimH(aC, vC, 18, `D = ${lenS(r?.D)}`, { cls: 'val' })
    + dimH(aR, vL, 40, `s = ${lenS(dims.s)}`, { cls: 'val', extFrom: tTop })
    + dimH(vL, vR, 40, '', { extFrom: tTop })
    + text(Math.max(vR + 6, (aR + vL) / 2 + 42), 44, `w = ${lenS(dims.w)}`, { cls: 'val', anchor: 'start' });
  if (strip) {
    b += dimV(tBot, lp, aL - 10, `Ha = ${lenS(dims.ha)}`, { left: true, cls: 'val' })
      + dimV(56, tTop, aL - 10, `Hb = ${lenS(dims.hb)}`, { left: true, cls: 'val' });
  } else {
    b += dimV(tBot, lp, aL - 10, `H = ${lenS(dims.ha)}`, { left: true, cls: 'val' });
  }
  const foot = r
    ? `${strip ? `H = Ha·Hb/(Ha+Hb) = ${lenS(r.H)}  ·  ` : ''}D/H = ${fmt(r.dOverH, 3)}  ·  K = ${fmt(r.k, 3)}`
    : '';
  if (foot) b += text(220, lp + pTh + 22, foot, { cls: 'title' });
  // Fixed height per structure; the drawing is centred vertically in it.
  const H = strip ? 206 : 156;
  const dy = Math.max(0, (H - (lp + pTh + 28)) / 2);
  return svg(440, H, `<g transform="translate(0,${Math.round(dy)})">${b}</g>`, t('xt_dgAria'), { wide: true });
}

const LEN = ['mm', 'mil', 'um'];
const len = (mm) => (isImperial() ? `${fixed(fromMm(mm, 'mil'), 2)} mil` : `${fixed(mm, 3)} mm`);
const isStrip = (v) => v.st === 'strip';

/**
 * Calculation steps, in mm like the engine (typed values are exact there,
 * whatever unit they were entered in); the length factor K needs L in mm and
 * t_r in ns to go with c in mm/ns. Intermediate values carry more digits than
 * the results so that the results reproduce by hand.
 */
function worked(r, v, u) {
  const q = (mm) => tx(`${fmt(Number(mm.toFixed(6)), 12)} mm`); // typed lengths and their sums
  const n = (x) => tx(fmt(x, 5));
  const strip = isStrip(v);
  const byLen = v.km === 'len';
  const K = n(r.k);
  const X = n(r.fraction);
  const H = strip ? tx(`${fmt(r.H, 6)} mm`) : q(r.H);
  const ha = toMm(v.h, u.h);
  const hb = strip ? toMm(v.h2, u.h2) : NaN;
  const kFrac = byLen
    ? `\\frac{2 \\cdot ${q(toMm(v.L, u.L))} \\cdot \\sqrt{${n(v.er)}}}{${tx(`${fmt(299.792458, 6)} mm/ns`)} \\cdot ${tx(`${fmt(v.tr * (u.tr === 'ps' ? 1e-3 : 1), 6)} ns`)}}`
    : '';
  const hasReq = r.requiredGapMm !== undefined;
  const clamp = hasReq && r.requiredGapMm === 0; // the target is met even with touching traces
  const reqSym = 'H \\cdot \\sqrt{\\frac{K}{X_{target}} − 1} − w';
  const reqNum = hasReq ? `${H} \\cdot \\sqrt{\\frac{${K}}{${n(r.targetPct / 100)}} − 1} − ${q(r.w)}` : '';
  const reqRes = hasReq ? tx(`${fmt(r.requiredGapMm, 4)} mm`) + (isImperial() ? ` = ${tx(`${fmt(fromMm(r.requiredGapMm, 'mil'), 4)} mil`)}` : '') : '';
  return steps([
    byLen && { label: 'xt_kUsed', sym: 'K = \\min(1, \\frac{2 \\cdot L \\cdot \\sqrt{ε_{eff}}}{c \\cdot t_r})',
      num: r.k < 1 ? kFrac : `\\min(1, ${kFrac})`, res: K },
    { label: 'xt_D', sym: 'D = s + w', num: `${q(toMm(v.s, u.s))} + ${q(r.w)}`, res: q(r.D) },
    strip && { label: 'xt_H', sym: 'H = \\frac{H_a \\cdot H_b}{H_a + H_b}', num: `\\frac{${q(ha)} \\cdot ${q(hb)}}{${q(ha)} + ${q(hb)}}`, res: H },
    { label: 'xt_result', sym: 'X = \\frac{K}{1 + (\\frac{D}{H})^{2}}', num: `\\frac{${K}}{1 + (\\frac{${q(r.D)}}{${H}})^{2}}`,
      res: `${X} = ${tx(`${fixed(r.fraction * 100, 2)} %`)}` },
    { label: 'xt_db', sym: 'X_{dB} = 20 \\cdot \\log_{10}(X)', num: `20 \\cdot \\log_{10}(${X})`, res: tx(`${fmt(r.db, 4).replace('-', '−')} dB`) },
    r.noiseV !== undefined && { label: 'xt_noise', sym: 'V_{noise} = X \\cdot V_{swing}', num: `${X} \\cdot ${tx(si(v.V, 'V'))}`, res: tx(si(r.noiseV, 'V')) },
    hasReq && { label: 'xt_required', sym: `s_{req} = ${clamp ? `\\max(0, ${reqSym})` : reqSym}`,
      num: clamp ? `\\max(0, ${reqNum})` : reqNum, res: reqRes },
  ], {
    note: 'xt_note',
    where: [
      ['s', 'xt_gap', 's'], ['w', 'xt_w', 'w'],
      !strip && ['H', 'xt_h', 'h'], strip && ['H_a', 'xt_h1', 'h'], strip && ['H_b', 'xt_h2', 'h2'],
      v.km === 'worst' && ['K', 'xt_kWorst', 'km'], v.km === 'man' && ['K', 'xt_kMode', 'k'],
      byLen && ['L', 'xt_len', 'L'], byLen && ['t_r', 'xt_tr', 'tr'], byLen && ['ε_{eff}', 'xt_er', 'er'],
      r.noiseV !== undefined && ['V_{swing}', 'xt_swing', 'V'], hasReq && ['X_{target}', 'xt_target', 'tg'],
    ],
    refs: ['H. Johnson & M. Graham, High-Speed Digital Design (1993), p. 192', 'D. Brooks, “Crosstalk Part 2”, Printed Circuit Design (1997)'],
  });
}

export default {
  diagram,
  id: 'crosstalk',
  strings,
  sections: [
    {
      title: 'sectionSetup',
      fields: [
        { key: 'st', type: 'choice', label: 'xt_structure', default: 'micro',
          options: [{ value: 'micro', label: 'xt_micro' }, { value: 'strip', label: 'xt_strip' }] },
      ],
    },
    {
      title: 'sectionInputs',
      fields: [
        { key: 's', type: 'number', label: 'xt_gap', default: 0.2, units: LEN, pref: 'length' },
        { key: 'w', type: 'number', label: 'xt_w', default: 0.2, units: LEN, pref: 'length' },
        { key: 'h', type: 'number', label: (v) => (isStrip(v) ? 'xt_h1' : 'xt_h'), default: 0.1, units: LEN, pref: 'length', info: 'xt_hInfo' },
        { key: 'h2', type: 'number', label: 'xt_h2', default: 0.2, units: LEN, pref: 'length', show: isStrip },
        { key: 'V', type: 'number', label: 'xt_swing', default: 3.3, units: ['V'], optional: true,
          presets: [1.2, 1.8, 3.3, 5].map((x) => ({ label: `${x} V`, value: x })) },
        { key: 'tg', type: 'number', label: 'xt_target', default: 5, units: ['pct'], optional: true, max: 100 },
      ],
    },
    {
      title: 'xt_kMode',
      fields: [
        { key: 'km', type: 'choice', label: 'xt_kMode', default: 'worst', info: 'xt_kInfo',
          options: [{ value: 'worst', label: 'xt_kWorst' }, { value: 'len', label: 'xt_kLen' }, { value: 'man', label: 'xt_kManual' }] },
        { key: 'k', type: 'number', label: 'xt_k', default: 1, max: 1, show: (v) => v.km === 'man' },
        { key: 'L', type: 'number', label: 'xt_len', default: 20, units: ['mm', 'cm', 'in', 'mil'], show: (v) => v.km === 'len' },
        { key: 'tr', type: 'number', label: 'xt_tr', default: 1, units: ['ns', 'ps'], show: (v) => v.km === 'len' },
        { key: 'er', type: 'number', label: 'xt_er', default: 3.3, min: 1, show: (v) => v.km === 'len' },
      ],
    },
  ],

  compute(v, u) {
    let k = 1;
    if (v.km === 'man') k = v.k;
    if (v.km === 'len') k = nextLengthFactor(toMm(v.L, u.L) / 1000, v.er, v.tr * (u.tr === 'ps' ? 1e-12 : 1e-9));
    return {
      ok: true,
      ...crosstalk({
        spacingMm: toMm(v.s, u.s), widthMm: toMm(v.w, u.w), heightMm: toMm(v.h, u.h),
        height2Mm: isStrip(v) ? toMm(v.h2, u.h2) : 0, k, swingV: v.V, targetPct: v.tg,
      }),
      targetPct: v.tg,
      w: toMm(v.w, u.w),
    };
  },

  render(r, v, u) {
    const main = hero('xt_result', `${fixed(r.fraction * 100, 2)} <span class="u">%</span>`, `${fixed(r.db, 1)} dB`);
    const meets = r.targetPct > 0 ? r.fraction * 100 <= r.targetPct : null;
    return main
      + worked(r, v, u)
      + block('results', rows([
        ['xt_D', len(r.D)],
        ['xt_H', len(r.H)],
        ['xt_dh', fmt(r.dOverH, 3)],
        ['xt_kUsed', fmt(r.k, 3)],
        r.noiseV !== undefined && ['xt_noise', si(r.noiseV, 'V')],
        r.requiredGapMm !== undefined && ['xt_required', len(r.requiredGapMm)],
      ]))
      + block('xt_rules', checks([
        [r.threeW, esc(t('xt_3w')), `${fmt(r.D / r.w, 3)} w`],
        meets !== null && [meets, esc(t('xt_target_ok')), `${fixed(r.targetPct, 1)} %`],
      ]));
  },
};
