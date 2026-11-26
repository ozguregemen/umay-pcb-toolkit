import { decode, encode, decodeSmd, encodeSmd, HEX, DIGIT, MULTIPLIER, TOLERANCE, TEMPCO } from '../engine/colorcode.js';
import { nearestStandard, decadeValues } from '../engine/eseries.js';

const E96 = decadeValues('E96').map((x) => Math.round(x * 100));
import { hero, rows, block, steps, invalid } from '../ui/calculator.js';
import { tx } from '../ui/math.js';
import { fmt, si, siHtml, esc } from '../ui/format.js';
import { t } from '../i18n.js';

const NAMES = {
  tr: { black: 'Siyah', brown: 'Kahverengi', red: 'Kırmızı', orange: 'Turuncu', yellow: 'Sarı', green: 'Yeşil', blue: 'Mavi', violet: 'Mor', grey: 'Gri', white: 'Beyaz', gold: 'Altın', silver: 'Gümüş', none: 'Yok' },
  en: { black: 'Black', brown: 'Brown', red: 'Red', orange: 'Orange', yellow: 'Yellow', green: 'Green', blue: 'Blue', violet: 'Violet', grey: 'Grey', white: 'White', gold: 'Gold', silver: 'Silver', none: 'None' },
};

const strings = {
  tr: {
    cc_mode: 'Yön',
    cc_decode: 'Renkler → değer',
    cc_encode: 'Değer → renkler',
    cc_bands: 'Bant sayısı',
    cc_d1: '1. bant (rakam)',
    cc_d2: '2. bant (rakam)',
    cc_d3: '3. bant (rakam)',
    cc_m: 'Çarpan',
    cc_tol: 'Tolerans',
    cc_tc: 'Sıcaklık katsayısı',
    cc_value: 'Direnç değeri',
    cc_result: 'Direnç',
    cc_range: 'Tolerans aralığı',
    cc_tempco: 'Sıcaklık katsayısı',
    cc_e24: 'En yakın E24 değeri',
    cc_e96: 'En yakın E96 değeri',
    cc_smd: 'SMD kodu → değer',
    cc_code: 'SMD direnç üzerindeki kod',
    cc_codeHint: 'Örnek: 472, 4R7, 1002, 01C, R047',
    cc_smd3: 'SMD 3 haneli kod',
    cc_smd4: 'SMD 4 haneli kod',
    cc_smdEia: 'EIA-96 kodu',
    cc_jumper: '0 Ω köprü (jumper)',
    cc_kind_3: '3 haneli kod (genellikle ±%5)',
    cc_kind_4: '4 haneli kod (genellikle ±%1)',
    cc_kind_eia96: 'EIA-96 kodu (±%1, E96 değeri)',
    err_smd: 'Kod tanınmadı. 3 veya 4 rakam, R ondalık noktası ya da EIA-96 biçimi (2 rakam + harf) girin.',
    cc_notExact: 'Bu değer seçilen bant sayısıyla tam gösterilemiyor; en yakın gösterilebilir değer kullanıldı.',
    cc_read: 'Okuma yönü',
    cc_readInfo: 'Tolerans bandı (genellikle altın/gümüş/kahverengi) diğerlerinden biraz uzakta durur ve sağda olmalıdır. Okumaya karşı uçtan başlayın.',
    cc_note: 'IEC 60062:2016. 4 bantlı dirençte iki anlamlı rakam, 5–6 bantlıda üç anlamlı rakam vardır. Gri tolerans bandı eski tablolarda ±%0,05, IEC 60062:2016’da ±%0,01’dir.',
    cc_stepBands: 'Bant değerleri',
    cc_stepLetters: 'Kod değerleri',
    cc_stepSmdR: 'R harfi ondalık ayırıcının yerini gösterir; değer doğrudan ohm olarak okunur.',
    cc_whDigits: 'Baştaki rakamlar (anlamlı rakamlar)',
    cc_whExp: 'Son rakam (10’un kuvveti)',
    cc_whEiaIdx: 'E96 serisinde k. sıradaki değer (01 = 100 … 96 = 976)',
    cc_whEiaMult: 'Harfin gösterdiği çarpan',
    err_value: 'Değer sıfırdan büyük olmalı.',
    err_range: 'Değer renk kodu aralığının dışında.',
    err_digit: 'Rakam bantları altın/gümüş olamaz.',
    err_multiplier: 'Geçersiz çarpan.',
    err_tolerance: 'Geçersiz tolerans rengi.',
    ...Object.fromEntries(Object.entries(NAMES.tr).map(([k, v]) => [`col_${k}`, v])),
  },
  en: {
    cc_mode: 'Direction',
    cc_decode: 'Colours → value',
    cc_encode: 'Value → colours',
    cc_bands: 'Number of bands',
    cc_d1: '1st band (digit)',
    cc_d2: '2nd band (digit)',
    cc_d3: '3rd band (digit)',
    cc_m: 'Multiplier',
    cc_tol: 'Tolerance',
    cc_tc: 'Temperature coefficient',
    cc_value: 'Resistance',
    cc_result: 'Resistance',
    cc_range: 'Tolerance range',
    cc_tempco: 'Temperature coefficient',
    cc_e24: 'Nearest E24 value',
    cc_e96: 'Nearest E96 value',
    cc_smd: 'SMD code → value',
    cc_code: 'Code printed on the SMD resistor',
    cc_codeHint: 'Example: 472, 4R7, 1002, 01C, R047',
    cc_smd3: 'SMD 3-digit code',
    cc_smd4: 'SMD 4-digit code',
    cc_smdEia: 'EIA-96 code',
    cc_jumper: '0 Ω jumper',
    cc_kind_3: '3-digit code (usually ±5 %)',
    cc_kind_4: '4-digit code (usually ±1 %)',
    cc_kind_eia96: 'EIA-96 code (±1 %, E96 value)',
    err_smd: 'Code not recognised. Enter 3 or 4 digits, R as a decimal point, or EIA-96 (2 digits + letter).',
    cc_notExact: 'This value cannot be shown exactly with this many bands; the nearest representable value is used.',
    cc_read: 'Reading direction',
    cc_readInfo: 'The tolerance band (usually gold/silver/brown) sits slightly apart and goes on the right. Start reading from the other end.',
    cc_note: 'IEC 60062:2016. 4-band resistors carry two significant digits, 5–6-band resistors three. The grey tolerance band is ±0.05 % in older charts and ±0.01 % in IEC 60062:2016.',
    cc_stepBands: 'Band values',
    cc_stepLetters: 'Code values',
    cc_stepSmdR: 'The letter R marks the decimal point; the value is read directly in ohms.',
    cc_whDigits: 'Leading digits (significant figures)',
    cc_whExp: 'Last digit (power of ten)',
    cc_whEiaIdx: 'Value at position k of the E96 series (01 = 100 … 96 = 976)',
    cc_whEiaMult: 'Multiplier given by the letter',
    err_value: 'Value must be greater than zero.',
    err_range: 'Value is outside the colour-code range.',
    err_digit: 'Digit bands cannot be gold/silver.',
    err_multiplier: 'Invalid multiplier.',
    err_tolerance: 'Invalid tolerance colour.',
    ...Object.fromEntries(Object.entries(NAMES.en).map(([k, v]) => [`col_${k}`, v])),
  },
};

const opt = (list, suffix = () => '') => list.map((c) => ({ value: c, label: `col_${c}`, suffix: suffix(c) }));
const digits = opt(Object.keys(DIGIT));
const mults = Object.keys(MULTIPLIER).map((c) => ({ value: c, label: `col_${c}` }));
const tols = Object.keys(TOLERANCE).map((c) => ({ value: c, label: `col_${c}` }));
const tcs = Object.keys(TEMPCO).map((c) => ({ value: c, label: `col_${c}` }));
const isDec = (v) => v.mode === 'decode';

function resistor(bands) {
  const n = bands.length;
  const xs = n === 4 ? [118, 150, 182, 252] : n === 5 ? [110, 140, 170, 200, 252] : [104, 130, 156, 182, 230, 262];
  return `<svg class="diagram" viewBox="0 0 380 90" role="img" aria-label="${esc(bands.map((b) => t(`col_${b}`)).join(', '))}">
    <path d="M10 45h70M300 45h70" stroke="var(--faint)" stroke-width="5" stroke-linecap="round"/>
    <rect x="80" y="18" width="220" height="54" rx="22" fill="#d9c49a" stroke="var(--border-strong)"/>
    ${bands.map((b, i) => (b === 'none' ? '' : `<rect x="${xs[i]}" y="18" width="16" height="54" fill="${HEX[b]}" stroke="rgb(0 0 0 / .25)"/>`)).join('')}
  </svg>`;
}

/** A power of ten in the formula notation: 100 → 10^{2}, 0.1 → 10^{−1}. */
function pow10(x) {
  const e = Math.round(Math.log10(x));
  return `10^{${e < 0 ? `−${-e}` : e}}`;
}

const REFS = ['IEC 60062:2016', 'EIA-96 marking code'];

/**
 * The decoding rule as steps. Colour bands: what each band stands for, digits
 * times multiplier, then the tolerance limits (when encoding, the value is
 * split first and the colours follow). SMD codes: the rule that matched.
 */
function worked(r) {
  const ohm = tx(si(r.ohms, 'Ω'));
  if (r.mode === 'smd') {
    const d = r.smd;
    if (d.rule === 'eia96') {
      return steps([
        { label: 'cc_stepLetters', sym: `${tx(d.index)} \\to ${d.value}, \\quad ${tx(d.letter)} \\to ${pow10(d.mult)}` },
        { label: 'cc_result', sym: 'R = E96_{k} \\cdot m', num: `${d.value} \\cdot ${pow10(d.mult)}`, res: ohm },
      ], { note: 'cc_note', refs: REFS, where: [['E96_{k}', 'cc_whEiaIdx', 'code'], ['m', 'cc_whEiaMult', 'code']] });
    }
    if (d.rule === 'point') {
      return steps([
        { label: 'cc_result', sym: `${tx(d.code)} \\to ${tx(`${fmt(r.ohms, 6)} Ω`)}`, note: 'cc_stepSmdR' },
      ], { note: 'cc_note', refs: REFS });
    }
    return steps([
      { label: 'cc_result', sym: 'R = d \\cdot 10^{n}', num: `${d.digits} \\cdot 10^{${d.exp}}`, res: ohm },
    ], { note: 'cc_note', refs: REFS, where: [['d', 'cc_whDigits', 'code'], ['n', 'cc_whExp', 'code']] });
  }
  const enc = r.mode === 'encode';
  const n = r.digits.length;
  const cols = r.colors;
  const name = (c) => tx(t(`col_${c}`));
  const tol = tx(`${fmt(r.tolPct)} %`);
  // Band colour ↔ what it stands for, in reading order.
  const pairs = [
    ...r.digits.map((d, i) => [name(cols[i]), String(d)]),
    [name(cols[n]), pow10(r.mult)],
    [name(cols[n + 1]), tx(`±${fmt(r.tolPct)} %`)],
    r.tempco !== undefined && [name(cols[n + 2]), tx(`${r.tempco} ppm/K`)],
  ].filter(Boolean);
  const bands = { label: 'cc_stepBands', sym: pairs.map(([c, x]) => (enc ? `${x} \\to ${c}` : `${c} \\to ${x}`)).join(', \\quad ') };
  const value = {
    label: enc ? 'cc_value' : 'cc_result',
    sym: n === 2 ? 'R = (10 \\cdot d_{1} + d_{2}) \\cdot m' : 'R = (100 \\cdot d_{1} + 10 \\cdot d_{2} + d_{3}) \\cdot m',
    num: `(${n === 2 ? `10 \\cdot ${r.digits[0]} + ${r.digits[1]}` : `100 \\cdot ${r.digits[0]} + 10 \\cdot ${r.digits[1]} + ${r.digits[2]}`}) \\cdot ${pow10(r.mult)}`,
    res: ohm,
  };
  return steps([
    ...(enc ? [value, bands] : [bands, value]),
    { label: 'cc_range', sym: 'R_{min} = R \\cdot (1 − tol)', num: `${ohm} \\cdot (1 − ${tol})`, res: tx(si(r.min, 'Ω')) },
    { label: 'cc_range', sym: 'R_{max} = R \\cdot (1 + tol)', num: `${ohm} \\cdot (1 + ${tol})`, res: tx(si(r.max, 'Ω')) },
  ], {
    note: 'cc_note',
    refs: REFS,
    where: [enc && ['R', 'cc_value', 'val'], ['d_{1}', 'cc_d1', !enc && 'd1'], ['d_{2}', 'cc_d2', !enc && 'd2'], n === 3 && ['d_{3}', 'cc_d3', !enc && 'd3'],
      ['m', 'cc_m', !enc && 'm'], ['tol', 'cc_tol', 'tol']],
  });
}

export default {
  id: 'colorcode',
  strings,
  sections: [
    {
      title: 'sectionSetup',
      fields: [
        { key: 'mode', type: 'choice', label: 'cc_mode', default: 'decode',
          options: [{ value: 'decode', label: 'cc_decode' }, { value: 'encode', label: 'cc_encode' }, { value: 'smd', label: 'cc_smd' }] },
        { key: 'nb', type: 'choice', label: 'cc_bands', default: '4', show: (v) => v.mode !== 'smd',
          options: ['4', '5', '6'].map((x) => ({ value: x, label: x, raw: true })) },
      ],
    },
    {
      title: 'sectionInputs',
      fields: [
        { key: 'code', type: 'text', label: 'cc_code', default: '472', hint: 'cc_codeHint', show: (v) => v.mode === 'smd' },
        { key: 'd1', type: 'select', label: 'cc_d1', default: 'yellow', options: digits, show: isDec, info: 'cc_readInfo' },
        { key: 'd2', type: 'select', label: 'cc_d2', default: 'violet', options: digits, show: isDec },
        { key: 'd3', type: 'select', label: 'cc_d3', default: 'black', options: digits, show: (v) => isDec(v) && v.nb !== '4' },
        { key: 'm', type: 'select', label: 'cc_m', default: 'red', options: mults, show: isDec },
        { key: 'val', type: 'number', label: 'cc_value', default: '4k7', si: true, units: ['ohm'], show: (v) => !isDec(v),
          presets: ['100', '1k', '4k7', '10k', '100k'].map((x) => ({ label: `${x}Ω`, value: x })) },
        { key: 'tol', type: 'select', label: 'cc_tol', default: 'gold', options: tols, show: (v) => v.mode !== 'smd' },
        { key: 'tc', type: 'select', label: 'cc_tc', default: 'brown', options: tcs, show: (v) => v.nb === '6' && v.mode !== 'smd' },
      ],
    },
  ],

  diagram(v) {
    if (v.mode === 'smd') {
      const code = esc(String(v.code).trim().toUpperCase().slice(0, 5));
      return `<svg class="diagram" viewBox="0 0 380 90" role="img" aria-label="${code}">
        <rect x="70" y="20" width="40" height="50" fill="#c8c8c8"/><rect x="270" y="20" width="40" height="50" fill="#c8c8c8"/>
        <rect x="100" y="16" width="180" height="58" rx="3" fill="#1c1c1c"/>
        <text x="190" y="54" style="font:600 26px/1 ui-monospace,monospace;fill:#f0f0f0;font-style:normal">${code}</text></svg>`;
    }
    const n = Number(v.nb);
    let bands;
    if (isDec(v)) bands = [v.d1, v.d2, ...(n > 4 ? [v.d3] : []), v.m, v.tol, ...(n === 6 ? [v.tc] : [])];
    else {
      const e = encode(v.val, n, v.tol, v.tc);
      bands = e.ok ? e.bands : [];
    }
    return bands.length ? resistor(bands) : '';
  },

  compute(v) {
    if (v.mode === 'smd') {
      const d = decodeSmd(v.code, E96);
      if (!d.ok) return d;
      return { ok: true, mode: 'smd', ohms: d.ohms, kind: d.kind, tolPct: null, smd: d };
    }
    const n = Number(v.nb);
    if (isDec(v)) {
      const colors = [v.d1, v.d2, ...(n > 4 ? [v.d3] : []), v.m, v.tol, ...(n === 6 ? [v.tc] : [])];
      return { mode: 'decode', ...decode(colors), colors };
    }
    const e = encode(v.val, n, v.tol, v.tc);
    if (!e.ok) return e;
    return { mode: 'encode', ...decode(e.bands), bands: e.bands, colors: e.bands, exact: e.exact };
  },

  render(r) {
    if (!r.ok) return invalid(r.errors);
    if (r.ohms === 0) return hero('cc_result', `0 <span class="u">Ω</span>`, esc(t('cc_jumper')));
    const e24 = nearestStandard(r.ohms, 'E24');
    const e96 = nearestStandard(r.ohms, 'E96');
    const smd = encodeSmd(r.ohms, E96);
    const bandsText = r.bands ? `<p class="note">${r.bands.map((b) => esc(t(`col_${b}`))).join(' · ')}</p>` : '';
    const sub = r.tolPct !== null ? `±${fmt(r.tolPct)} %` : esc(t(`cc_kind_${r.kind}`));
    return hero('cc_result', siHtml(r.ohms, 'Ω'), sub)
      + bandsText
      + (r.mode === 'encode' && !r.exact ? `<ul class="msg warn"><li>${esc(t('cc_notExact'))}</li></ul>` : '')
      + worked(r)
      + block('results', rows([
        r.tolPct !== null && ['cc_range', `${si(r.min, 'Ω')} – ${si(r.max, 'Ω')}`],
        r.tempco !== undefined && ['cc_tempco', `${r.tempco} ppm/K`],
        ['cc_e24', `${si(e24.nearest, 'Ω')} (${e24.errorPct >= 0 ? '+' : ''}${fmt(e24.errorPct, 3)} %)`],
        ['cc_e96', `${si(e96.nearest, 'Ω')} (${e96.errorPct >= 0 ? '+' : ''}${fmt(e96.errorPct, 3)} %)`],
        smd.three && ['cc_smd3', `<code>${esc(smd.three)}</code>`],
        smd.four && ['cc_smd4', `<code>${esc(smd.four)}</code>`],
        ['cc_smdEia', smd.eia96 ? `<code>${esc(smd.eia96)}</code>` : '—'],
      ]));
  },
};
