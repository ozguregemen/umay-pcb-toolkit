import { calculateImpedance, isDiff, isStripType } from '../engine/impedance.js';
import { toMm, fromMm, thicknessToMil, MM_PER_MIL } from '../engine/units.js';
import { hero, rows, block, formulaBlock, messages, invalid } from '../ui/calculator.js';
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
    im_note: 'Microstrip: Hammerstad–Jensen (kalınlık düzeltmeli, t = 0 için ~%0,2). Stripline: Wheeler 1978 (~%0,5). Asimetrik stripline: iki simetrik stripline’ın paralel birleşimi. Gömülü microstrip: IPC-2141 etkin εr. CPWG: konformal dönüşüm, sıfır kalınlık. Diferansiyel: National AN-905 kenar kuplajlı yaklaşımları (deneysel, ±%10). İletken kaybı pürüzlülüğü içermez; gerçek kayıp daha yüksektir.',
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
    im_note: 'Microstrip: Hammerstad–Jensen with thickness correction (~0.2 % for t = 0). Stripline: Wheeler 1978 (~0.5 %). Asymmetric stripline: parallel combination of two symmetric striplines. Embedded microstrip: IPC-2141 effective εr. CPWG: conformal mapping, zero thickness. Differential: National AN-905 edge-coupled approximations (empirical, ±10 %). Conductor loss excludes roughness; real loss is higher.',
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
  },
};

const LEN = ['mm', 'mil', 'um'];
const hLabel = (v) => (v.st === 'stripline' || v.st === 'diffStripline' ? 'im_b' : v.st === 'asymStripline' ? 'im_h1' : 'im_h');
const showS = (v) => isDiff(v.st) || v.st === 'cpwg';

const FORMULAS = {
  microstrip: ['u = w/h,  Z01(u) = η0/2π · ln( f(u)/u + √(1 + (2/u)²) )',
    'εe(u) = (εr+1)/2 + (εr−1)/2 · (1 + 10/u)^(−a·b)',
    'Z0 = Z01(ur) / √εe(ur)        (Hammerstad–Jensen, t → Δu)'],
  stripline: ['Z0 = 30/√εr · ln{ 1 + (4/π)(b−t)/W′ · [ (8/π)(b−t)/W′ + √(((8/π)(b−t)/W′)² + 6.27) ] }',
    'W′ = w + ΔW(t, b)              (Wheeler 1978)'],
  asymStripline: ['Z0 ≈ 2·Zs(2h1+t)·Zs(2h2+t) / (Zs(2h1+t) + Zs(2h2+t))', 'Zs = Wheeler symmetric stripline'],
  embedded: ['εr′ = εr · (1 − e^(−1.55·(h+t+c)/h))', 'Z0 = Z0,air(microstrip) / √εr′'],
  cpwg: ['k = w/(w+2s),  k1 = tanh(πw/4h) / tanh(π(w+2s)/4h)',
    'εeff = (1 + εr·K(k′)K(k1)/(K(k)K(k1′))) / (1 + K(k′)K(k1)/(K(k)K(k1′)))',
    'Z0 = 60π/√εeff · 1 / ( K(k)/K(k′) + K(k1)/K(k1′) )'],
  diffMicrostrip: ['Z0 : Hammerstad–Jensen microstrip', 'Zdiff = 2·Z0·(1 − 0.48·e^(−0.96·s/h))'],
  diffStripline: ['Z0 : Wheeler stripline', 'Zdiff = 2·Z0·(1 − 0.374·e^(−2.9·s/b))'],
};
const COMMON = ['t_pd = √εeff / c', 'α_d = k0·εr(εeff−1)·tanδ / (2√εeff(εr−1))  [Np/m]', 'α_c ≈ Rs / (Z0·w),  Rs = √(π f µ0 ρ)'];

/** Cross-section sketch (not to scale). */
function diagram(v) {
  const st = v.st;
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
          options: ['microstrip', 'embedded', 'stripline', 'asymStripline', 'cpwg', 'diffMicrostrip', 'diffStripline']
            .map((k) => ({ value: k, label: `st_${k}` })) },
        { key: 'Z', type: 'number', label: (v) => (isDiff(v.st) ? 'im_targetDiff' : 'im_target'), default: 50, units: ['ohm'],
          show: (v) => v.mode === 'synth',
          presets: [50, 75, 85, 90, 100].map((x) => ({ label: `${x} Ω`, value: x })) },
      ],
    },
    {
      title: 'sectionInputs',
      fields: [
        { key: 'w', type: 'number', label: 'im_w', default: 0.3, units: LEN, pref: 'length', show: (v) => v.mode !== 'synth' },
        { key: 's', type: 'number', label: (v) => (v.st === 'cpwg' ? 'im_sGap' : 'im_sPair'), default: 0.2, units: LEN, pref: 'length', show: showS },
        { key: 't', type: 'number', label: 'im_t', default: 35, units: ['um', 'oz', 'mil', 'mm'],
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
        { key: 'len', type: 'number', label: 'im_len', default: '', optional: true, units: ['mm', 'cm', 'in', 'mil'] },
      ],
    },
  ],

  diagram: (v) => diagram(v),

  compute(v, u) {
    const mm = (k) => (Number.isFinite(v[k]) ? toMm(v[k], u[k]) : NaN);
    const tMm = Number.isFinite(v.t) ? thicknessToMil(v.t, u.t) * MM_PER_MIL : NaN;
    const fHz = Number.isFinite(v.f) ? v.f * (u.f === 'GHz' ? 1e9 : 1e6) : 0;
    return calculateImpedance({
      structure: v.st, mode: v.mode, target: v.Z,
      w: mm('w'), t: tMm, h: mm('h'), h2: mm('h2'), c: mm('c'), s: mm('s'), er: v.er,
      fHz, tanD: v.tanD, lengthMm: Number.isFinite(v.len) ? toMm(v.len, u.len) : 0,
    });
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
      r.totalDelayPs && ['im_totalDelay', `${fmt(r.totalDelayPs, 4)} ps`],
    ]);
    let loss = '';
    if (r.loss) {
      const L = r.totalDelayPs ? r.totalDelayPs / r.delayPsPerMm : 0;
      loss = block('sectionLoss', rows([
        ['im_lossD', `${fmt(r.loss.dielectricDbPerMm * 25.4, 3)} dB/in · ${fmt(r.loss.dielectricDbPerMm * 1000, 3)} dB/m`],
        ['im_lossC', `${fmt(r.loss.conductorDbPerMm * 25.4, 3)} dB/in · ${fmt(r.loss.conductorDbPerMm * 1000, 3)} dB/m`],
        ['im_lossT', `${fmt(r.loss.totalDbPerMm * 25.4, 3)} dB/in`, true],
        L > 0 && ['im_lossLen', `${fmt(r.loss.totalDbPerMm * L, 3)} dB`],
        ['im_skin', `${fmt(r.loss.skinUm, 3)} µm`],
      ]));
    }
    return main + messages('warn', r.warnings) + block('results', details) + loss
      + formulaBlock([...FORMULAS[r.structure], ...COMMON], 'im_note', [
        'Hammerstad & Jensen, IEEE MTT-S 1980', 'Wheeler, IEEE T-MTT 1978', 'Wadell, Transmission Line Design Handbook', 'IPC-2141A', 'J. Mears, National AN-905 (1996)']);
  },
};
