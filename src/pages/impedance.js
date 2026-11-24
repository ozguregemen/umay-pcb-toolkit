import { calculateImpedance, solveWidth, isDiff, isStripType } from '../engine/impedance.js';
import { toMm, fromMm, thicknessToMil, MM_PER_MIL } from '../engine/units.js';
import { hero, rows, block, formulaBlock, messages, invalid, checks } from '../ui/calculator.js';
import { fmt, fixed, esc } from '../ui/format.js';
import { t } from '../i18n.js';
import { isImperial } from '../prefs.js';

const strings = {
  tr: {
    im_modeAnalyze: 'Geometri → empedans',
    im_modeSynth: 'Hedef empedans → genişlik',
    im_structure: 'Yapı',
    im_structureInfo: 'Microstrip: dış katmanda, altında referans düzlem. Gömülü microstrip: üstü prepreg/lehim maskesi gibi bir dielektrikle örtülü. Stripline: iki düzlem arasında. CPWG: aynı katmanda yan topraklar + alt düzlem (RF).',
    st_microstrip: 'Microstrip',
    st_embedded: 'Gömülü microstrip',
    st_stripline: 'Stripline (simetrik)',
    st_asymStripline: 'Asimetrik stripline',
    st_cpwg: 'Topraklı eş düzlemli dalga kılavuzu (CPWG)',
    st_diffMicrostrip: 'Diferansiyel microstrip',
    st_diffStripline: 'Diferansiyel stripline',
    st_coax: 'Koaksiyel kablo',
    st_twowire: 'İki telli hat / bükümlü çift',
    im_d: 'İç iletken çapı (d)',
    im_D: 'Dış iletkenin iç çapı (D)',
    im_dWire: 'Tel çapı (d)',
    im_spacing2: 'Teller arası merkez mesafesi (s)',
    im_tol: 'Empedans toleransı',
    im_tolInfo: 'Üretici genellikle kontrollü empedansı ±%10 ile garanti eder (sıkı süreçte ±%5–7). Hedef girildiğinde sonuç bu aralıkta mı diye kontrol edilir; sentez modunda bu aralığı veren genişlik penceresi gösterilir.',
    im_rough: 'Bakır yüzey pürüzlülüğü (Rq)',
    im_roughInfo: 'RMS pürüzlülük. Yaklaşık değerler: çok düşük profilli (HVLP) folyo < 0,5 µm, standart elektrodepozit folyo 1–2 µm. Pürüzlülük, deri kalınlığı onunla karşılaştırılabilir olduğunda iletken kaybını en fazla 2 katına çıkarır (Hammerstad modeli).',
    im_lc: 'Birim uzunluk L ve C',
    im_wWindow: 'Toleransı sağlayan genişlik aralığı',
    im_checkTarget: 'Hedef {t} Ω ± %{tol}',
    im_kRough: 'Pürüzlülük kayıp çarpanı',
    im_target: 'Hedef empedans',
    im_targetDiff: 'Hedef diferansiyel empedans',
    im_w: 'İz genişliği (w)',
    im_t: 'İz kalınlığı (t)',
    im_h: 'Dielektrik yüksekliği (h)',
    im_b: 'Düzlemler arası mesafe (b)',
    im_h1: 'Alt dielektrik (h1)',
    im_h2: 'Üst dielektrik (h2)',
    im_c: 'İz üstü dielektrik (c)',
    im_cInfo: 'İzin üst yüzeyinden gömülü dielektriğin üst yüzeyine kadar olan kalınlık (ör. prepreg veya kalın maske).',
    im_sPair: 'Çiftler arası boşluk (s)',
    im_sGap: 'Yan toprağa boşluk (s)',
    im_er: 'Dielektrik sabiti (εr)',
    im_erInfo: 'Üreticinin tasarım Dk değerini çalışma frekansında kullanın. FR-4 için 1 GHz civarında tipik 4,0–4,5; cam/reçine oranına göre değişir.',
    sectionLoss: 'Kayıp ve gecikme',
    im_f: 'Frekans',
    im_tanD: 'Kayıp tanjantı (tan δ)',
    im_len: 'Hat uzunluğu',
    im_width: 'Gereken iz genişliği',
    im_z0: 'Karakteristik empedans Z₀',
    im_zdiff: 'Diferansiyel empedans Zdiff',
    im_zodd: 'Tek mod empedansı Zodd',
    im_erEff: 'Etkin dielektrik sabiti εeff',
    im_ipc: 'IPC-2141 yaklaşımı (karşılaştırma)',
    im_delay: 'Yayılma gecikmesi',
    im_vel: 'Yayılma hızı',
    im_totalDelay: 'Toplam gecikme',
    im_lossD: 'Dielektrik kaybı',
    im_lossC: 'İletken kaybı (pürüzsüz bakır)',
    im_lossT: 'Toplam kayıp',
    im_lossLen: 'Hat boyunca kayıp',
    im_skin: 'Deri kalınlığı',
    im_note: 'Microstrip: Hammerstad–Jensen (kalınlık düzeltmeli, t = 0 için ~%0,2). Stripline: Wheeler 1978 (~%0,5). Asimetrik stripline: iki simetrik stripline’ın paralel birleşimi. Gömülü microstrip: IPC-2141’in üstel davranışı, c = 0’da microstrip’e eşit olacak şekilde bağlanmıştır. CPWG: konformal dönüşüm, sıfır kalınlık. Diferansiyel: National AN-905 kenar kuplajlı yaklaşımları (deneysel, ±%10). İletken kaybı pürüzlülüğü içermez; gerçek kayıp daha yüksektir.',
    err_width: 'İz genişliği sıfırdan büyük olmalı.',
    err_thickness: 'Kalınlık sıfırdan büyük olmalı.',
    err_height: 'Dielektrik yüksekliği sıfırdan büyük olmalı.',
    err_height2: 'Üst dielektrik sıfırdan büyük olmalı.',
    err_cover: 'Üst dielektrik negatif olamaz.',
    err_er: 'Dielektrik sabiti en az 1 olmalı.',
    err_spacing: 'Boşluk sıfırdan büyük olmalı.',
    err_striplineThickness: 'Stripline için iz kalınlığı düzlemler arası mesafeden küçük olmalı.',
    err_geometry: 'Bu geometri için empedans hesaplanamadı.',
    err_noSolution: 'Bu hedef empedans bu geometriyle elde edilemiyor; dielektrik yüksekliğini veya hedefi değiştirin.',
    warn_hjRange: 'w/h oranı Hammerstad–Jensen geçerlilik aralığının (0,01–100) dışında.',
    warn_wheelerRange: 'Çok geniş iz: Wheeler denkleminin doğruluğu azalır.',
    warn_diffApprox: 'Diferansiyel yaklaşım s/h = 0,2–3 (stripline için s/b = 0,2–1,5) aralığında geçerlidir; sıkı kuplajda alan çözücü kullanın.',
    warn_cpwgThickness: 'CPWG formülü iz kalınlığını ihmal eder; kalın bakırda gerçek empedans biraz daha düşüktür.',
    warn_embeddedCover: 'Kalın üst dielektrikte gömülü microstrip stripline’a yaklaşır; asimetrik stripline’ı da değerlendirin.',
    warn_noTanD: 'tan δ girilmedi; dielektrik kaybı sıfır kabul edildi.',
    warn_skinThick: 'Deri kalınlığı bakır kalınlığından büyük; bu frekansta iletken kaybı yaklaşımı iyimserdir.',
    im_ifLink: 'USB, PCIe, DDR, Ethernet… için hedef empedans ve eşleme kuralları: Arayüz tasarım kuralları',
  },
  en: {
    im_modeAnalyze: 'Geometry → impedance',
    im_modeSynth: 'Target impedance → width',
    im_structure: 'Structure',
    im_structureInfo: 'Microstrip: outer layer over a reference plane. Embedded microstrip: covered by a dielectric (prepreg, thick mask). Stripline: between two planes. CPWG: side grounds on the same layer plus a plane below (RF).',
    st_microstrip: 'Microstrip',
    st_embedded: 'Embedded microstrip',
    st_stripline: 'Stripline (symmetric)',
    st_asymStripline: 'Asymmetric stripline',
    st_cpwg: 'Grounded coplanar waveguide (CPWG)',
    st_diffMicrostrip: 'Differential microstrip',
    st_diffStripline: 'Differential stripline',
    st_coax: 'Coaxial cable',
    st_twowire: 'Two-wire line / twisted pair',
    im_d: 'Inner conductor diameter (d)',
    im_D: 'Outer conductor inner diameter (D)',
    im_dWire: 'Wire diameter (d)',
    im_spacing2: 'Centre-to-centre wire spacing (s)',
    im_tol: 'Impedance tolerance',
    im_tolInfo: 'Fabricators usually guarantee controlled impedance to ±10 % (±5–7 % on tight processes). With a target, the result is checked against this window; in synthesis mode the width window that achieves it is shown.',
    im_rough: 'Copper surface roughness (Rq)',
    im_roughInfo: 'RMS roughness. Approximate values: hyper-very-low-profile (HVLP) foil < 0.5 µm, standard electrodeposited foil 1–2 µm. Roughness raises conductor loss by up to 2× once the skin depth becomes comparable (Hammerstad model).',
    im_lc: 'Per-unit-length L and C',
    im_wWindow: 'Width range within tolerance',
    im_checkTarget: 'Target {t} Ω ± {tol} %',
    im_kRough: 'Roughness loss factor',
    im_target: 'Target impedance',
    im_targetDiff: 'Target differential impedance',
    im_w: 'Trace width (w)',
    im_t: 'Trace thickness (t)',
    im_h: 'Dielectric height (h)',
    im_b: 'Plane-to-plane spacing (b)',
    im_h1: 'Lower dielectric (h1)',
    im_h2: 'Upper dielectric (h2)',
    im_c: 'Dielectric above trace (c)',
    im_cInfo: 'Thickness from the top of the trace to the top of the covering dielectric (e.g. prepreg or a thick mask).',
    im_sPair: 'Pair gap (s)',
    im_sGap: 'Gap to side ground (s)',
    im_er: 'Dielectric constant (εr)',
    im_erInfo: 'Use the fabricator’s design Dk at the operating frequency. FR-4 is typically 4.0–4.5 around 1 GHz, depending on glass/resin ratio.',
    sectionLoss: 'Loss and delay',
    im_f: 'Frequency',
    im_tanD: 'Loss tangent (tan δ)',
    im_len: 'Line length',
    im_width: 'Required trace width',
    im_z0: 'Characteristic impedance Z₀',
    im_zdiff: 'Differential impedance Zdiff',
    im_zodd: 'Odd-mode impedance Zodd',
    im_erEff: 'Effective dielectric constant εeff',
    im_ipc: 'IPC-2141 approximation (comparison)',
    im_delay: 'Propagation delay',
    im_vel: 'Propagation velocity',
    im_totalDelay: 'Total delay',
    im_lossD: 'Dielectric loss',
    im_lossC: 'Conductor loss (smooth copper)',
    im_lossT: 'Total loss',
    im_lossLen: 'Loss over the line',
    im_skin: 'Skin depth',
    im_note: 'Microstrip: Hammerstad–Jensen with thickness correction (~0.2 % for t = 0). Stripline: Wheeler 1978 (~0.5 %). Asymmetric stripline: parallel combination of two symmetric striplines. Embedded microstrip: the IPC-2141 exponential, anchored so that c = 0 equals microstrip. CPWG: conformal mapping, zero thickness. Differential: National AN-905 edge-coupled approximations (empirical, ±10 %). Conductor loss excludes roughness; real loss is higher.',
    err_width: 'Trace width must be greater than zero.',
    err_thickness: 'Thickness must be greater than zero.',
    err_height: 'Dielectric height must be greater than zero.',
    err_height2: 'Upper dielectric must be greater than zero.',
    err_cover: 'Upper dielectric cannot be negative.',
    err_er: 'Dielectric constant must be at least 1.',
    err_spacing: 'Gap must be greater than zero.',
    err_striplineThickness: 'For stripline, trace thickness must be smaller than the plane spacing.',
    err_geometry: 'Impedance could not be computed for this geometry.',
    err_noSolution: 'This target impedance is not reachable with this geometry; change the dielectric height or the target.',
    warn_hjRange: 'w/h is outside the Hammerstad–Jensen range (0.01–100).',
    warn_wheelerRange: 'Very wide trace: Wheeler’s equation loses accuracy.',
    warn_diffApprox: 'The differential approximation is valid for s/h = 0.2–3 (stripline s/b = 0.2–1.5); use a field solver for tight coupling.',
    warn_cpwgThickness: 'The CPWG formula ignores trace thickness; with thick copper the real impedance is slightly lower.',
    warn_embeddedCover: 'With a thick cover, embedded microstrip approaches stripline; also check asymmetric stripline.',
    warn_noTanD: 'No tan δ given; dielectric loss assumed zero.',
    warn_skinThick: 'Skin depth exceeds the copper thickness; the conductor-loss estimate is optimistic at this frequency.',
    im_ifLink: 'Target impedance and matching rules for USB, PCIe, DDR, Ethernet…: Interface design rules',
  },
};

const LEN = ['mm', 'mil', 'um'];
const isRound = (v) => v.st === 'coax' || v.st === 'twowire';
const hLabel = (v) => ({ stripline: 'im_b', diffStripline: 'im_b', asymStripline: 'im_h1', coax: 'im_D', twowire: 'im_spacing2' }[v.st] ?? 'im_h');
const wLabel = (v) => ({ coax: 'im_d', twowire: 'im_dWire' }[v.st] ?? 'im_w');
const showS = (v) => isDiff(v.st) || v.st === 'cpwg';
// Example geometry loaded when the user picks a structure (mm, εr).
const EXAMPLES = {
  microstrip: { w: 0.3, h: 0.2, er: 4.3 },
  embedded: { w: 0.3, h: 0.2, c: 0.1, er: 4.3 },
  stripline: { w: 0.15, h: 0.5, er: 4.3 },
  asymStripline: { w: 0.15, h: 0.2, h2: 0.3, er: 4.3 },
  cpwg: { w: 0.5, s: 0.2, h: 0.4, er: 4.3 },
  diffMicrostrip: { w: 0.2, s: 0.2, h: 0.2, er: 4.3 },
  diffStripline: { w: 0.12, s: 0.2, h: 0.5, er: 4.3 },
  coax: { w: 0.9, h: 2.95, er: 2.25 },
  twowire: { w: 0.5, h: 1.5, er: 1 },
};
// Common interface targets (check the interface specification and your fabricator;
// sources and per-vendor values: Interface design rules page, src/engine/interfaces.js).
const TARGETS = [
  { label: 'RF 50 Ω', value: 50 }, { label: 'Video 75 Ω', value: 75 }, { label: 'PCIe Gen3+ 85 Ω', value: 85 },
  { label: 'USB 90 Ω', value: 90 }, { label: 'Ethernet / LVDS / HDMI 100 Ω', value: 100 },
  { label: 'DDR4/DDR5 40 Ω', value: 40 }, { label: 'CAN / RS-485 120 Ω', value: 120 },
];

const FORMULAS = {
  microstrip: ['u = w/h,  Z01(u) = η0/2π · ln( f(u)/u + √(1 + (2/u)²) )',
    'εe(u) = (εr+1)/2 + (εr−1)/2 · (1 + 10/u)^(−a·b)',
    'Z0 = Z01(ur) / √εe(ur)        (Hammerstad–Jensen, t → Δu)'],
  stripline: ['Z0 = 30/√εr · ln{ 1 + (4/π)(b−t)/W′ · [ (8/π)(b−t)/W′ + √(((8/π)(b−t)/W′)² + 6.27) ] }',
    'W′ = w + ΔW(t, b)              (Wheeler 1978)'],
  asymStripline: ['Z0 ≈ 2·Zs(2h1+t)·Zs(2h2+t) / (Zs(2h1+t) + Zs(2h2+t))', 'Zs = Wheeler symmetric stripline'],
  embedded: ['εeff(c) = εr − (εr − εeff,ms)·e^(−1.55·c/h)    (IPC-2141 decay, anchored at c = 0)', 'Z0 = Z0,ms · √(εeff,ms / εeff(c))'],
  cpwg: ['k = w/(w+2s),  k1 = tanh(πw/4h) / tanh(π(w+2s)/4h)',
    'εeff = (1 + εr·K(k′)K(k1)/(K(k)K(k1′))) / (1 + K(k′)K(k1)/(K(k)K(k1′)))',
    'Z0 = 60π/√εeff · 1 / ( K(k)/K(k′) + K(k1)/K(k1′) )'],
  diffMicrostrip: ['Z0 : Hammerstad–Jensen microstrip', 'Zdiff = 2·Z0·(1 − 0.48·e^(−0.96·s/h))'],
  diffStripline: ['Z0 : Wheeler stripline', 'Zdiff = 2·Z0·(1 − 0.374·e^(−2.9·s/b))'],
  coax: ['Z0 = 60/√εr · ln(D/d)'],
  twowire: ['Z0 = 120/√εr · acosh(s/d)'],
};
const COMMON = [
  't_pd = √εeff / c,   L′ = Z0·√εeff / c,   C′ = √εeff / (c·Z0)',
  'α_d = k0·εr(εeff−1)·tanδ / (2√εeff(εr−1))  [Np/m]',
  'α_c = R′/(2·Z0),  Rs = √(π f µ0 ρ),  K_rough = 1 + (2/π)·atan(1.4·(Δ/δ)²)',
];

function roundDiagram(st) {
  if (st === 'coax') {
    return `<svg class="diagram" viewBox="0 0 380 112" role="img" aria-label="coax">
      <circle cx="190" cy="56" r="48" fill="var(--cu)"/><circle cx="190" cy="56" r="42" class="diel"/>
      <circle cx="190" cy="56" r="11" fill="var(--cu)"/>
      <path class="dim" d="M179 56h22"/><text x="190" y="50">d</text>
      <path class="dim" d="M148 92h84"/><text x="190" y="108">D</text>
    </svg>`;
  }
  return `<svg class="diagram" viewBox="0 0 380 112" role="img" aria-label="two-wire">
    <circle cx="150" cy="56" r="14" fill="var(--cu)"/><circle cx="230" cy="56" r="14" fill="var(--cu)"/>
    <path class="dim" d="M150 86h80"/><text x="190" y="100">s</text>
    <path class="dim" d="M136 34h28"/><text x="150" y="28">d</text>
  </svg>`;
}

/** Cross-section sketch (not to scale). */
function diagram(v) {
  const st = v.st;
  if (st === 'coax' || st === 'twowire') return roundDiagram(st);
  const diff = isDiff(st);
  const planesTwo = isStripType(st);
  const asym = st === 'asymStripline';
  const embedded = st === 'embedded';
  const cpw = st === 'cpwg';
  const top = planesTwo ? 18 : embedded ? 30 : 46;
  const bottom = 98;
  const ty = planesTwo ? (asym ? 66 : 54) : embedded ? 52 : 38; // trace top y
  const th = 8;
  const traces = diff
    ? [[110, 60], [190, 60]]
    : cpw ? [[150, 60]] : [[150, 60]];
  const tr = traces.map(([x, w]) => `<rect class="cu" x="${x}" y="${ty}" width="${w}" height="${th}"/>`).join('');
  const sides = cpw
    ? `<rect class="cu" x="30" y="${ty}" width="90" height="${th}"/><rect class="cu" x="240" y="${ty}" width="110" height="${th}"/>
       <path class="dim" d="M120 ${ty - 5}h30"/><text x="135" y="${ty - 9}">s</text>`
    : '';
  const sDim = diff ? `<path class="dim" d="M170 ${ty - 5}h20"/><text x="180" y="${ty - 9}">s</text>` : '';
  const wx = traces[0][0];
  const diel = `<rect class="diel" x="30" y="${top}" width="320" height="${bottom - top}"/>`;
  const plane2 = planesTwo ? `<rect class="cu" x="30" y="${top - 6}" width="320" height="6"/>` : '';
  const hDim = planesTwo
    ? (asym
      ? `<path class="dim" d="M48 ${ty + th}V${bottom}"/><text x="60" y="${(ty + th + bottom) / 2 + 4}">h1</text>
         <path class="dim" d="M48 ${top}V${ty}"/><text x="60" y="${(top + ty) / 2 + 4}">h2</text>`
      : `<path class="dim" d="M48 ${top}V${bottom}"/><text x="58" y="${(top + bottom) / 2 + 4}">b</text>`)
    : `<path class="dim" d="M48 ${ty + th}V${bottom}"/><text x="58" y="${(ty + th + bottom) / 2 + 4}">h</text>`;
  const cDim = embedded ? `<path class="dim" d="M48 ${top}V${ty}"/><text x="58" y="${(top + ty) / 2 + 4}">c</text>` : '';
  return `
  <svg class="diagram" viewBox="0 0 380 112" role="img" aria-label="${esc(t(`st_${st}`))}">
    ${diel}${plane2}
    <rect class="cu" x="30" y="${bottom}" width="320" height="6"/>
    ${sides}${tr}
    <path class="dim" d="M${wx} ${ty - 5}h60"/><text x="${wx + 30}" y="${ty - 9}">w</text>
    <path class="dim" d="M${wx - 6} ${ty}v${th}"/><text x="${wx - 14}" y="${ty + 8}">t</text>
    ${sDim}${hDim}${cDim}
    <text class="lbl" x="344" y="${bottom - 6}" text-anchor="end">εr</text>
  </svg>`;
}

const lenOut = (mm) => (isImperial()
  ? `${fixed(fromMm(mm, 'mil'), 2)} <span class="u">mil</span>`
  : `${fixed(mm, 4)} <span class="u">mm</span>`);
const lenSub = (mm) => (isImperial() ? `${fixed(mm, 4)} mm` : `${fixed(fromMm(mm, 'mil'), 2)} mil`);
const lenMain = (mm) => (isImperial() ? `${fixed(fromMm(mm, 'mil'), 2)} mil` : `${fixed(mm, 4)} mm`);

export default {
  id: 'impedance',
  strings,
  sections: [
    {
      title: 'sectionSetup',
      fields: [
        { key: 'mode', type: 'choice', label: 'mode', default: 'analyze',
          options: [{ value: 'analyze', label: 'im_modeAnalyze' }, { value: 'synth', label: 'im_modeSynth' }] },
        { key: 'st', type: 'select', label: 'im_structure', default: 'microstrip', info: 'im_structureInfo',
          options: Object.entries(EXAMPLES).map(([k, set]) => ({ value: k, label: `st_${k}`, set })) },
        { key: 'Z', type: 'number', label: (v) => (isDiff(v.st) ? 'im_targetDiff' : 'im_target'), default: 50, units: ['ohm'],
          show: (v) => v.mode === 'synth', presets: TARGETS },
        { key: 'tz', type: 'number', label: (v) => (isDiff(v.st) ? 'im_targetDiff' : 'im_target'), default: '', optional: true, units: ['ohm'],
          show: (v) => v.mode !== 'synth', presets: TARGETS },
        { key: 'tol', type: 'number', label: 'im_tol', default: 10, units: ['pct'], max: 50, info: 'im_tolInfo' },
      ],
    },
    {
      title: 'sectionInputs',
      fields: [
        { key: 'w', type: 'number', label: wLabel, default: 0.3, units: LEN, pref: 'length', show: (v) => v.mode !== 'synth' },
        { key: 's', type: 'number', label: (v) => (v.st === 'cpwg' ? 'im_sGap' : 'im_sPair'), default: 0.2, units: LEN, pref: 'length', show: showS },
        { key: 't', type: 'number', label: 'im_t', default: 35, units: ['um', 'oz', 'mil', 'mm'], show: (v) => !isRound(v),
          presets: [{ label: '½ oz', value: 0.5, unit: 'oz' }, { label: '1 oz', value: 1, unit: 'oz' }, { label: '2 oz', value: 2, unit: 'oz' }] },
        { key: 'h', type: 'number', label: hLabel, default: 0.2, units: LEN, pref: 'length' },
        { key: 'h2', type: 'number', label: 'im_h2', default: 0.3, units: LEN, pref: 'length', show: (v) => v.st === 'asymStripline' },
        { key: 'c', type: 'number', label: 'im_c', default: 0.1, units: LEN, pref: 'length', valid: 'nonneg', info: 'im_cInfo', show: (v) => v.st === 'embedded' },
        { key: 'er', type: 'number', label: 'im_er', default: 4.3, info: 'im_erInfo', min: 1,
          presets: [
            { label: 'FR-4 4.3', value: 4.3 }, { label: 'RO4350B 3.66', value: 3.66 },
            { label: 'RO4003C 3.55', value: 3.55 }, { label: 'PTFE 2.2', value: 2.2 }, { label: 'Al₂O₃ 9.8', value: 9.8 }] },
      ],
    },
    {
      title: 'sectionLoss',
      collapsible: true,
      optional: true,
      fields: [
        { key: 'f', type: 'number', label: 'im_f', default: '', optional: true, units: ['GHz', 'MHz'] },
        { key: 'tanD', type: 'number', label: 'im_tanD', default: 0.02, valid: 'nonneg',
          presets: [{ label: 'FR-4 0.02', value: 0.02 }, { label: 'RO4350B 0.0037', value: 0.0037 }, { label: 'RO4003C 0.0027', value: 0.0027 }, { label: 'PTFE 0.0009', value: 0.0009 }] },
        { key: 'rq', type: 'number', label: 'im_rough', default: 0, units: ['um'], valid: 'nonneg', info: 'im_roughInfo',
          presets: [{ label: '0', value: 0 }, { label: '0.5', value: 0.5 }, { label: '1', value: 1 }, { label: '2', value: 2 }] },
        { key: 'len', type: 'number', label: 'im_len', default: '', optional: true, units: ['mm', 'cm', 'in', 'mil'] },
      ],
    },
  ],

  diagram: (v) => diagram(v),

  compute(v, u) {
    const mm = (k) => (Number.isFinite(v[k]) ? toMm(v[k], u[k]) : NaN);
    const tMm = Number.isFinite(v.t) ? thicknessToMil(v.t, u.t) * MM_PER_MIL : NaN;
    const fHz = Number.isFinite(v.f) ? v.f * (u.f === 'GHz' ? 1e9 : 1e6) : 0;
    const p = {
      structure: v.st, mode: v.mode, target: v.Z,
      w: mm('w'), t: isRound(v) ? NaN : tMm, h: mm('h'), h2: mm('h2'), c: mm('c'), s: mm('s'), er: v.er,
      fHz, tanD: v.tanD, roughUm: v.rq, lengthMm: Number.isFinite(v.len) ? toMm(v.len, u.len) : 0,
    };
    const r = calculateImpedance(p);
    if (!r.ok) return r;
    const tol = (v.tol || 0) / 100;
    const target = v.mode === 'synth' ? v.Z : v.tz;
    if (target > 0) {
      const z = r.zdiff ?? r.z0;
      r.check = { target, tol, z, pass: Math.abs(z - target) <= target * tol + 1e-9 };
      if (v.mode === 'synth' && tol > 0) {
        // Width window that keeps Z within ±tol (Z falls as w grows).
        r.wMin = solveWidth(p, target * (1 + tol));
        r.wMax = solveWidth(p, target * (1 - tol));
      }
    }
    return r;
  },

  render(r, v) {
    if (!r.ok) return invalid(r.errors);
    const diff = r.zdiff !== null;
    let main;
    if (v.mode === 'synth') {
      main = hero('im_width', lenOut(r.w), `${lenSub(r.w)} · ${diff ? `Zdiff ${fixed(r.zdiff, 1)} Ω` : `Z₀ ${fixed(r.z0, 1)} Ω`}`);
    } else if (diff) {
      main = hero('im_zdiff', `${fixed(r.zdiff, 1)} <span class="u">Ω</span>`, `Z₀ = ${fixed(r.z0, 1)} Ω · Zodd = ${fixed(r.zodd, 1)} Ω`);
    } else {
      main = hero('im_z0', `${fixed(r.z0, 1)} <span class="u">Ω</span>`, `εeff = ${fmt(r.erEff, 3)}`);
    }
    const ipcDiff = r.ipc ? ` (${r.ipc > r.z0 ? '+' : ''}${fixed(((r.ipc - r.z0) / r.z0) * 100, 1)} %)` : '';
    const details = rows([
      v.mode === 'synth' && diff && ['im_zdiff', `${fixed(r.zdiff, 2)} Ω`],
      ['im_z0', `${fixed(r.z0, 2)} Ω`],
      diff && ['im_zodd', `${fixed(r.zodd, 2)} Ω`],
      ['im_erEff', fmt(r.erEff, 4)],
      r.ipc && ['im_ipc', `${fixed(r.ipc, 2)} Ω${ipcDiff}`],
      ['im_delay', `${fmt(r.delayPsPerMm, 4)} ps/mm · ${fmt(r.delayPsPerIn, 4)} ps/in`],
      ['im_vel', `${fixed(r.velocityFrac * 100, 1)} % c`],
      ['im_lc', `${fmt(r.lNhPerMm, 4)} nH/mm · ${fmt(r.cPfPerMm, 4)} pF/mm`],
      r.wMin > 0 && r.wMax > 0 && ['im_wWindow', `${lenMain(r.wMin)} … ${lenMain(r.wMax)}`],
      r.totalDelayPs && ['im_totalDelay', `${fmt(r.totalDelayPs, 4)} ps`],
    ]);
    const chk = r.check
      ? checks([[r.check.pass, esc(t('im_checkTarget', { t: fmt(r.check.target), tol: fmt(r.check.tol * 100) })),
        `${fixed(r.check.z, 1)} Ω · ${fixed(((r.check.z - r.check.target) / r.check.target) * 100, 1)} %`]])
      : '';
    let loss = '';
    if (r.loss) {
      const L = r.totalDelayPs ? r.totalDelayPs / r.delayPsPerMm : 0;
      loss = block('sectionLoss', rows([
        ['im_lossD', `${fmt(r.loss.dielectricDbPerMm * 25.4, 3)} dB/in · ${fmt(r.loss.dielectricDbPerMm * 1000, 3)} dB/m`],
        ['im_lossC', `${fmt(r.loss.conductorDbPerMm * 25.4, 3)} dB/in · ${fmt(r.loss.conductorDbPerMm * 1000, 3)} dB/m`],
        ['im_lossT', `${fmt(r.loss.totalDbPerMm * 25.4, 3)} dB/in`, true],
        L > 0 && ['im_lossLen', `${fmt(r.loss.totalDbPerMm * L, 3)} dB`],
        ['im_skin', `${fmt(r.loss.skinUm, 3)} µm`],
        r.loss.kRough > 1 && ['im_kRough', `×${fixed(r.loss.kRough, 3)}`],
      ]));
    }
    return main + chk + messages('warn', r.warnings) + block('results', details) + loss
      + `<p class="note"><a href="#/interfaces">${esc(t('im_ifLink'))}</a></p>`
      + formulaBlock([...FORMULAS[r.structure], ...COMMON], 'im_note', [
        'Hammerstad & Jensen, IEEE MTT-S 1980', 'Wheeler, IEEE T-MTT 1978', 'Wadell, Transmission Line Design Handbook', 'IPC-2141A', 'J. Mears, National AN-905 (1996)']);
  },
};
