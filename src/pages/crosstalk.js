import { crosstalk, nextLengthFactor } from '../engine/signal.js';
import { toMm, fromMm } from '../engine/units.js';
import { hero, rows, block, formulaBlock, checks } from '../ui/calculator.js';
import { fmt, fixed, si, esc } from '../ui/format.js';
import { t } from '../i18n.js';
import { isImperial } from '../prefs.js';

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
  },
};

const LEN = ['mm', 'mil', 'um'];
const len = (mm) => (isImperial() ? `${fixed(fromMm(mm, 'mil'), 2)} mil` : `${fixed(mm, 3)} mm`);
const isStrip = (v) => v.st === 'strip';

export default {
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

  render(r) {
    const main = hero('xt_result', `${fixed(r.fraction * 100, 2)} <span class="u">%</span>`, `${fixed(r.db, 1)} dB`);
    const meets = r.targetPct > 0 ? r.fraction * 100 <= r.targetPct : null;
    return main
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
      ]))
      + formulaBlock([
        'D = s + w;   stripline: H = Ha·Hb / (Ha + Hb)',
        'X_NEXT ≈ K / (1 + (D/H)²),   K = min(1, 2·L·√εeff / (c·tr))',
        'D_req = H · √(K / X_target − 1)',
      ], 'xt_note', ['H. Johnson & M. Graham, High-Speed Digital Design (1993), p. 192', 'D. Brooks, “Crosstalk Part 2”, Printed Circuit Design (1997)']);
  },
};
