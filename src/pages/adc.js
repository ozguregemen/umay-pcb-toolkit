import { adcBasics, enobFromSinad, averaging, adcCode } from '../engine/adc.js';
import { heroes, rows, block, formulaBlock, messages, invalid } from '../ui/calculator.js';
import { fmt, si, siHtml, esc } from '../ui/format.js';
import { svg, text, path, axes, wave, circle, dimH, dimV } from '../ui/svg.js';
import { t, locale } from '../i18n.js';

const strings = {
  tr: {
    ad_convTitle: 'Dönüştürücü',
    ad_bits: 'Çözünürlük N',
    ad_vref: 'Referans gerilimi Vref',
    ad_range: 'Giriş aralığı',
    ad_uni: 'Tek kutuplu 0 … Vref',
    ad_bi: 'Çift kutuplu ±Vref',
    ad_rangeInfo: 'Çift kutuplu (bipolar) dönüştürücüde tam ölçek aralığı 2·Vref’tir ve kodlar ikiye tümleyen biçimindedir. Bazı ADC’ler ±Vref/2 kullanır; veri sayfasına bakın.',
    ad_dynTitle: 'Dinamik performans',
    ad_sinad: 'Ölçülen SINAD',
    ad_sinadInfo: 'Veri sayfasındaki sinyal / (gürültü + bozulma) oranı, tam ölçeğe yakın sinüs girişte. ENOB bundan hesaplanır.',
    ad_avg: 'Ortalaması alınan örnek sayısı M',
    ad_avgInfo: 'M örneğin ortalaması beyaz gürültüyü √M kat azaltır: her 4 kat örnek 1 bit kazandırır. Bunun için girişte en az ~1 LSB gürültü (dither) olmalıdır; veri hızı M kat düşer.',
    ad_scaleTitle: 'Giriş ölçekleme',
    ad_scale: 'Ölçülen büyüklük',
    ad_none: 'Doğrudan gerilim',
    ad_div: 'Bölücü ile gerilim',
    ad_gain: 'Algılayıcı + kazanç',
    ad_vmax: 'Ölçülecek en büyük gerilim',
    ad_r1: 'Üst direnç R1',
    ad_r2: 'Alt direnç R2 (ADC tarafı)',
    ad_sens: 'Algılayıcı duyarlılığı',
    ad_sensInfo: 'Birim başına algılayıcı çıkışı, ör. LM35 için 10 mV/°C, ACS712-5A için 185 mV/A.',
    ad_qu: 'Birim',
    ad_g: 'Yükselteç kazancı',
    ad_xTitle: 'Örnek değer',
    ad_xin: 'ADC girişindeki gerilim',
    ad_xdiv: 'Ölçülen gerilim',
    ad_xq: 'Ölçülen büyüklük',
    ad_lsb: '1 LSB',
    ad_lsbSub: '{n} kod · tam ölçek {fs}',
    ad_snr: 'İdeal SNR',
    ad_snrSub: '6,02·N + 1,76 dB',
    ad_enob: 'ENOB (etkin bit sayısı)',
    ad_enobSub: 'SINAD {s}',
    ad_resQ: 'Ölçülen büyüklüğün çözünürlüğü',
    ad_qn: 'Nicemleme gürültüsü (rms)',
    ad_qnSub: 'LSB / √12',
    ad_fsr: 'Tam ölçek aralığı FSR',
    ad_codes: 'Kod sayısı 2^N',
    ad_codeRange: 'Kod aralığı',
    ad_qErr: 'Nicemleme hatası',
    ad_dr: 'Dinamik aralık 20·log(2^N)',
    ad_enobLsb: 'Gürültü dahil etkin LSB',
    ad_lost: 'SINAD ile kaybolan bit',
    ad_avgTitle: 'Ortalama alma',
    ad_extra: 'Kazanılan bit ½·log2(M)',
    ad_nEff: 'Etkin çözünürlük',
    ad_snrAvg: 'Ortalama ile SNR',
    ad_lsbAvg: 'Ortalama ile etkin LSB',
    ad_k: 'Ölçekleme k (ADC gerilimi / ölçülen)',
    ad_fsQ: 'Ölçülebilen tam ölçek',
    ad_vAdcMax: 'En büyük gerilimde ADC girişi',
    ad_use: 'Kullanılan ADC aralığı',
    ad_rth: 'Kaynak empedansı R1 ∥ R2',
    ad_iDiv: 'Bölücü akımı (en büyük gerilimde)',
    ad_vAdc: 'ADC giriş gerilimi',
    ad_code: 'Çıkış kodu',
    ad_back: 'Koddan geri hesaplanan değer',
    ad_err: 'Nicemleme hatası',
    ad_note: 'İdeal ADC’de kod geçişleri ½ LSB’de olur; bu yüzden nicemleme hatası ±½ LSB’dir ve gürültüsü LSB/√12’dir. Gerçek dönüştürücüde ofset, kazanç hatası, INL/DNL, referans gürültüsü ve girişteki gürültü eklenir; dinamik performansı SINAD/ENOB gösterir.',
    warn_ad_sinadHigh: 'Girilen SINAD, N bit için ideal SNR’den ({snr}) büyük; değeri kontrol edin.',
    warn_ad_divClip: 'En büyük gerilimde ADC girişi {v}, tam ölçeği aşıyor: R2’yi küçültün ya da R1’i büyütün.',
    warn_ad_lowUse: 'ADC aralığının yalnızca {p} kullanılıyor; çözünürlük boşa gidiyor. Bölücü oranını artırın.',
    warn_ad_srcZ: 'Kaynak empedansı {r}: SAR ADC örnekleme kondansatörü yeterince dolmayabilir. Örnekleme süresini uzatın, ADC pinine 10–100 nF kondansatör ekleyin ya da bir tampon kullanın.',
    warn_ad_xClip: 'Örnek değer ADC aralığının dışında; kod tam ölçekte sınırlanır.',
    warn_ad_dither: 'Ortalama alma ancak girişte en az ~1 LSB gürültü varsa çözünürlük kazandırır; sabit bir DC girişte tüm örnekler aynı kodu verir.',
    warn_ad_biDiv: 'Çift kutuplu aralıkta direnç bölücü negatif gerilimi ölçemez; bölücüyle birlikte bir ofset (orta nokta) gerekir.',
    ad_dg: 'ADC aktarım eğrisi: kod basamakları, 1 LSB adımı, ideal doğru ve ±½ LSB nicemleme hatası',
    ad_dgIll: '{n} bitlik gösterim · {b} bit = {c} kod',
    ad_dgErr: 'hata',
    ad_dgCode: 'kod',
  },
  en: {
    ad_convTitle: 'Converter',
    ad_bits: 'Resolution N',
    ad_vref: 'Reference voltage Vref',
    ad_range: 'Input range',
    ad_uni: 'Unipolar 0 … Vref',
    ad_bi: 'Bipolar ±Vref',
    ad_rangeInfo: 'A bipolar converter has a full-scale range of 2·Vref and two’s-complement codes. Some ADCs use ±Vref/2; check the datasheet.',
    ad_dynTitle: 'Dynamic performance',
    ad_sinad: 'Measured SINAD',
    ad_sinadInfo: 'Signal to (noise + distortion) ratio from the datasheet, for a near full-scale sine input. ENOB is calculated from it.',
    ad_avg: 'Number of samples averaged M',
    ad_avgInfo: 'Averaging M samples reduces white noise by √M: every 4× samples gives 1 bit. This needs at least ~1 LSB of noise (dither) at the input; the data rate drops by M.',
    ad_scaleTitle: 'Input scaling',
    ad_scale: 'Measured quantity',
    ad_none: 'Voltage directly',
    ad_div: 'Voltage via divider',
    ad_gain: 'Sensor + gain',
    ad_vmax: 'Largest voltage to measure',
    ad_r1: 'Top resistor R1',
    ad_r2: 'Bottom resistor R2 (ADC side)',
    ad_sens: 'Sensor sensitivity',
    ad_sensInfo: 'Sensor output per unit, e.g. 10 mV/°C for an LM35, 185 mV/A for an ACS712-5A.',
    ad_qu: 'Unit',
    ad_g: 'Amplifier gain',
    ad_xTitle: 'Example value',
    ad_xin: 'Voltage at the ADC input',
    ad_xdiv: 'Measured voltage',
    ad_xq: 'Measured quantity',
    ad_lsb: '1 LSB',
    ad_lsbSub: '{n} codes · full scale {fs}',
    ad_snr: 'Ideal SNR',
    ad_snrSub: '6.02·N + 1.76 dB',
    ad_enob: 'ENOB (effective bits)',
    ad_enobSub: 'SINAD {s}',
    ad_resQ: 'Resolution of the quantity',
    ad_qn: 'Quantisation noise (rms)',
    ad_qnSub: 'LSB / √12',
    ad_fsr: 'Full-scale range FSR',
    ad_codes: 'Number of codes 2^N',
    ad_codeRange: 'Code range',
    ad_qErr: 'Quantisation error',
    ad_dr: 'Dynamic range 20·log(2^N)',
    ad_enobLsb: 'Effective LSB including noise',
    ad_lost: 'Bits lost to SINAD',
    ad_avgTitle: 'Averaging',
    ad_extra: 'Bits gained ½·log2(M)',
    ad_nEff: 'Effective resolution',
    ad_snrAvg: 'SNR with averaging',
    ad_lsbAvg: 'Effective LSB with averaging',
    ad_k: 'Scaling k (ADC voltage / measured)',
    ad_fsQ: 'Measurable full scale',
    ad_vAdcMax: 'ADC input at the largest voltage',
    ad_use: 'ADC range used',
    ad_rth: 'Source impedance R1 ∥ R2',
    ad_iDiv: 'Divider current (at the largest voltage)',
    ad_vAdc: 'ADC input voltage',
    ad_code: 'Output code',
    ad_back: 'Value reconstructed from the code',
    ad_err: 'Quantisation error',
    ad_note: 'An ideal ADC has its code transitions at ½ LSB, so the quantisation error is ±½ LSB and its noise is LSB/√12. A real converter adds offset, gain error, INL/DNL, reference noise and input noise; SINAD/ENOB describe the dynamic performance.',
    warn_ad_sinadHigh: 'The SINAD entered is above the ideal SNR for N bits ({snr}); check the value.',
    warn_ad_divClip: 'At the largest voltage the ADC input is {v}, beyond full scale: reduce R2 or increase R1.',
    warn_ad_lowUse: 'Only {p} of the ADC range is used; resolution is wasted. Increase the divider ratio.',
    warn_ad_srcZ: 'Source impedance is {r}: a SAR ADC sampling capacitor may not charge fully. Lengthen the sampling time, add 10–100 nF at the ADC pin or use a buffer.',
    warn_ad_xClip: 'The example value is outside the ADC range; the code is clamped at full scale.',
    warn_ad_dither: 'Averaging only adds resolution when there is at least ~1 LSB of noise at the input; with a steady DC input every sample gives the same code.',
    warn_ad_biDiv: 'With a bipolar range, a plain resistor divider cannot measure negative voltages correctly without an offset (mid-point) network.',
    ad_dg: 'ADC transfer function: code steps, the 1 LSB step, the ideal line and the ±½ LSB quantisation error',
    ad_dgIll: '{n}-bit illustration · {b} bit = {c} codes',
    ad_dgErr: 'error',
    ad_dgCode: 'code',
  },
};

const isScale = (s) => (v) => v.scale === s;
const pct = (x) => new Intl.NumberFormat(locale(), { style: 'percent', maximumSignificantDigits: 3 }).format(x);
const intFmt = (n) => new Intl.NumberFormat(locale(), { maximumFractionDigits: 0, useGrouping: false }).format(n);
const dbTxt = (x) => `${fmt(x, 4)} dB`;
/** Value in the measured unit: volts get SI prefixes, other units plain. */
const qty = (x, v, sig = 4) => (v.scale === 'gain' ? `${fmt(x, sig)} ${v.qu || ''}`.trim() : si(x, 'V', sig));

/** Measured-quantity → ADC-voltage factor. */
function scaleK(v) {
  if (v.scale === 'div') return v.r2 / (v.r1 + v.r2);
  if (v.scale === 'gain') return v.sens * 1e-3 * v.g;
  return 1;
}

// ---------------------------------------------------------------------------
// Diagram: ideal transfer function (illustrated with at most 3 bits)
// ---------------------------------------------------------------------------

function diagram(v, u, r) {
  const bits = Number.isInteger(v.bits) && v.bits >= 1 ? v.bits : 3;
  const n = Math.min(bits, 3);
  const codes = 2 ** n;
  const bi = v.range === 'bi';
  const x0 = 76;
  const y0 = 178;
  const w = 320;
  const h = 150;
  const sx = w / codes; // x per LSB
  const sy = h / codes; // y per code
  const X = (k) => x0 + k * sx; // k in LSB from the bottom of the range
  const Y = (c) => y0 - c * sy; // c = code index from the lowest code
  const q = (x) => Math.round(x * 10) / 10;
  // Staircase with transitions at (k − ½) LSB.
  const pts = [[X(0), Y(0)]];
  for (let k = 1; k < codes; k++) pts.push([X(k - 0.5), Y(k - 1)], [X(k - 0.5), Y(k)]);
  pts.push([X(codes), Y(codes - 1)]);
  let b = '';
  for (let c = 0; c < codes; c++) {
    const val = bi ? c - codes / 2 : c;
    const bitsStr = ((val + codes) % codes).toString(2).padStart(n, '0');
    b += path(`M${x0},${q(Y(c))}H${x0 + w}`, 'grid-l') + text(x0 - 6, Y(c) + 4, bitsStr, { cls: 'lbl', anchor: 'end' });
  }
  for (let k = 0; k <= codes; k++) b += path(`M${q(X(k))},${y0}v4`, 'axis');
  b += axes(x0, y0, w + 10, h + 8)
    + wave([[X(0), Y(0)], [X(codes - 1), Y(codes - 1)]], 'wave2')
    + wave(pts);
  // 1 LSB tread and one code step, in the middle of the staircase.
  const m = Math.max(1, Math.floor(codes / 2));
  b += dimH(X(m - 0.5), X(m + 0.5), Y(m) - 12, '')
    + text(X(m - 0.5) - 8, Y(m) - 14, `1 LSB = ${r ? si(r.lsb, 'V', 4) : '?'}`, { cls: 'val', anchor: 'end' })
    + dimV(Y(m - 1), Y(m), X(m - 0.5) + 14, `1 ${t('ad_dgCode')}`, { cls: 'lbl' });
  // Axis labels: range ends.
  const fsLabel = r ? si(v.vref, 'V', 4) : 'Vref';
  if (bi) {
    b += text(X(0), y0 + 16, `−${fsLabel}`, { cls: 'lbl' }) + text(X(codes / 2), y0 + 16, '0', { cls: 'lbl' })
      + text(X(codes), y0 + 16, `+${fsLabel}`, { cls: 'lbl' });
  } else {
    b += text(X(0), y0 + 16, '0', { cls: 'lbl' }) + text(X(codes), y0 + 16, `FS = ${fsLabel}`, { cls: 'lbl' });
  }
  // Example input on the illustrated scale.
  if (r?.x && Number.isFinite(r.x.vAdc)) {
    const frac = Math.min(1, Math.max(0, (r.x.vAdc - r.codeMin * r.lsb) / r.fsr));
    const kx = frac * codes;
    const cIll = Math.min(codes - 1, Math.max(0, Math.round(kx)));
    const px = X(kx);
    b += path(`M${q(px)},${y0}V${q(Y(cIll))}`, 'ext') + circle(px, Y(cIll), 3.2, 'node')
      + text(px + (frac < 0.6 ? 8 : -8), Y(cIll) + (frac < 0.6 ? 16 : -8), `${t('ad_dgCode')} ${intFmt(r.x.code)}`, { cls: 'val', anchor: frac < 0.6 ? 'start' : 'end' });
  }
  // Quantisation error sawtooth (±½ LSB) under the staircase.
  const ey = 222;
  const eh = 12;
  const err = [[X(0), ey]];
  for (let k = 1; k < codes; k++) err.push([X(k - 0.5), ey - eh], [X(k - 0.5), ey + eh]);
  err.push([X(codes - 0.5), ey - eh]); // last code: error keeps rising up to FS − ½ LSB
  b += path(`M${x0},${ey}H${x0 + w}`, 'axis') + path(`M${x0},${ey - eh}H${x0 + w}M${x0},${ey + eh}H${x0 + w}`, 'ext')
    + wave(err, 'wave2')
    + text(x0 - 6, ey - eh + 4, '+½', { cls: 'lbl', anchor: 'end' }) + text(x0 - 6, ey + eh + 4, '−½', { cls: 'lbl', anchor: 'end' })
    + text(x0 + w + 6, ey + 4, t('ad_dgErr'), { cls: 'lbl', anchor: 'start' });
  if (bits > n) b += text(x0 + 4, 14, t('ad_dgIll', { n, b: bits, c: intFmt(2 ** bits) }), { cls: 'title', anchor: 'start' });
  return svg(440, 244, b, t('ad_dg'), { wide: true });
}

// ---------------------------------------------------------------------------

export default {
  diagram,
  id: 'adc',
  strings,
  sections: [
    {
      title: 'ad_convTitle',
      fields: [
        { key: 'bits', type: 'number', label: 'ad_bits', default: 12, units: ['bit'], integer: true, min: 1, max: 32,
          presets: [8, 10, 12, 16, 24].map((x) => ({ label: `${x} bit`, value: x })) },
        { key: 'vref', type: 'number', label: 'ad_vref', default: 3.3, units: ['V'], max: 100,
          presets: [1.2, 2.048, 2.5, 3.3, 4.096, 5].map((x) => ({ label: `${x} V`, value: x })) },
        { key: 'range', type: 'choice', label: 'ad_range', default: 'uni', info: 'ad_rangeInfo',
          options: [{ value: 'uni', label: 'ad_uni' }, { value: 'bi', label: 'ad_bi' }] },
      ],
    },
    {
      title: 'ad_dynTitle',
      optional: true,
      fields: [
        { key: 'sinad', type: 'number', label: 'ad_sinad', default: '', units: ['dB'], optional: true, max: 200, info: 'ad_sinadInfo' },
        { key: 'avg', type: 'number', label: 'ad_avg', default: '', integer: true, min: 1, max: 1e6, optional: true, info: 'ad_avgInfo',
          presets: [4, 16, 64, 256].map((x) => ({ label: String(x), value: x })) },
      ],
    },
    {
      title: 'ad_scaleTitle',
      fields: [
        { key: 'scale', type: 'choice', label: 'ad_scale', default: 'none',
          options: [{ value: 'none', label: 'ad_none' }, { value: 'div', label: 'ad_div' }, { value: 'gain', label: 'ad_gain' }] },
        { key: 'vmax', type: 'number', label: 'ad_vmax', default: 24, units: ['V'], show: isScale('div') },
        { key: 'r1', type: 'number', label: 'ad_r1', default: '100k', units: ['ohm'], si: true, show: isScale('div') },
        { key: 'r2', type: 'number', label: 'ad_r2', default: '12k', units: ['ohm'], si: true, show: isScale('div') },
        { key: 'sens', type: 'number', label: 'ad_sens', default: 10, units: ['mV'], info: 'ad_sensInfo', show: isScale('gain') },
        { key: 'qu', type: 'text', label: 'ad_qu', default: '°C', show: isScale('gain') },
        { key: 'g', type: 'number', label: 'ad_g', default: 1, units: ['V/V'], show: isScale('gain') },
      ],
    },
    {
      title: 'ad_xTitle',
      optional: true,
      fields: [
        { key: 'xin', type: 'number', label: 'ad_xin', default: 1, units: ['V'], valid: 'any', optional: true, show: isScale('none') },
        { key: 'xdiv', type: 'number', label: 'ad_xdiv', default: 12, units: ['V'], valid: 'any', optional: true, show: isScale('div') },
        { key: 'xq', type: 'number', label: 'ad_xq', default: 25, valid: 'any', optional: true, show: isScale('gain') },
      ],
    },
  ],

  compute(v) {
    const bipolar = v.range === 'bi';
    const p = { bits: v.bits, vref: v.vref, bipolar };
    const base = adcBasics(p);
    const k = scaleK(v);
    const r = { ok: true, ...base, k, bipolar, warnings: [], vars: {} };
    r.vars.ad_sinadHigh = { snr: dbTxt(base.snr) };
    if (Number.isFinite(v.sinad)) {
      r.enob = enobFromSinad(v.sinad);
      r.enobLsb = base.fsr / 2 ** r.enob;
      if (v.sinad > base.snr + 0.01) r.warnings.push('ad_sinadHigh');
    }
    if (v.avg > 1) {
      r.avg = averaging(v.avg);
      r.nEff = (Number.isFinite(r.enob) ? r.enob : v.bits) + r.avg.extraBits;
      r.lsbAvg = base.fsr / 2 ** r.nEff;
      r.warnings.push('ad_dither');
    }
    if (v.scale !== 'none') {
      r.resQ = base.lsb / k;
      r.fsQ = v.vref / k;
    }
    if (v.scale === 'div') {
      r.vAdcMax = v.vmax * k;
      r.use = r.vAdcMax / v.vref;
      r.rth = (v.r1 * v.r2) / (v.r1 + v.r2);
      r.iDiv = v.vmax / (v.r1 + v.r2);
      r.vars.ad_divClip = { v: si(r.vAdcMax, 'V', 3) };
      r.vars.ad_lowUse = { p: pct(r.use) };
      r.vars.ad_srcZ = { r: si(r.rth, 'Ω', 3) };
      if (r.vAdcMax > v.vref * (1 + 1e-9)) r.warnings.push('ad_divClip');
      else if (r.use < 0.5) r.warnings.push('ad_lowUse');
      if (r.rth > 10e3) r.warnings.push('ad_srcZ');
      if (bipolar) r.warnings.push('ad_biDiv');
    }
    const x = { none: v.xin, div: v.xdiv, gain: v.xq }[v.scale];
    if (Number.isFinite(x)) {
      const vAdc = x * k;
      const c = adcCode(vAdc, p);
      r.x = { value: x, vAdc, code: c.code, clipped: c.clipped, err: c.err, back: (c.code * base.lsb) / k };
      if (c.clipped) r.warnings.push('ad_xClip');
    }
    return r;
  },

  render(r, v) {
    if (!r.ok) return invalid(r.errors);
    const third = Number.isFinite(r.enob)
      ? ['ad_enob', `${esc(fmt(r.enob, 3))} <span class="u">bit</span>`, esc(t('ad_enobSub', { s: dbTxt(v.sinad) }))]
      : v.scale !== 'none'
        ? ['ad_resQ', esc(qty(r.resQ, v, 4)), '']
        : ['ad_qn', siHtml(r.qNoise, 'V'), esc(t('ad_qnSub'))];
    const hex = (c) => (c < 0 ? '' : ` (0x${c.toString(16).toUpperCase()})`);
    return heroes([
      ['ad_lsb', siHtml(r.lsb, 'V'), esc(t('ad_lsbSub', { n: intFmt(r.codes), fs: si(r.fsr, 'V', 4) }))],
      ['ad_snr', `${esc(fmt(r.snr, 4))} <span class="u">dB</span>`, esc(t('ad_snrSub'))],
      third,
    ])
      + messages('warn', r.warnings, r.vars)
      + block('ad_convTitle', rows([
        ['ad_fsr', si(r.fsr, 'V')],
        ['ad_codes', intFmt(r.codes)],
        ['ad_codeRange', `${intFmt(r.codeMin)} … ${intFmt(r.codeMax)}`],
        ['ad_lsb', si(r.lsb, 'V'), true],
        ['ad_qErr', `±${si(r.lsb / 2, 'V', 4)}`],
        ['ad_qn', si(r.qNoise, 'V')],
        ['ad_snr', dbTxt(r.snr)],
        ['ad_dr', dbTxt(20 * Math.log10(r.codes))],
      ]))
      + (Number.isFinite(r.enob) ? block('ad_dynTitle', rows([
        ['ad_sinad', dbTxt(v.sinad)],
        ['ad_enob', `${fmt(r.enob, 3)} bit`, true],
        ['ad_lost', `${fmt(v.bits - r.enob, 3)} bit`],
        ['ad_enobLsb', si(r.enobLsb, 'V')],
      ])) : '')
      + (r.avg ? block('ad_avgTitle', rows([
        ['ad_avg', intFmt(v.avg)],
        ['ad_extra', `+${fmt(r.avg.extraBits, 3)} bit`],
        ['ad_nEff', `${fmt(r.nEff, 3)} bit`, true],
        ['ad_snrAvg', dbTxt((Number.isFinite(r.enob) ? v.sinad : r.snr) + r.avg.snrGain)],
        ['ad_lsbAvg', si(r.lsbAvg, 'V')],
      ])) : '')
      + (v.scale !== 'none' ? block('ad_scaleTitle', rows([
        ['ad_k', fmt(r.k, 4)],
        ['ad_fsQ', r.bipolar ? `±${qty(r.fsQ, v)}` : qty(r.fsQ, v)],
        ['ad_resQ', qty(r.resQ, v), true],
        v.scale === 'div' && ['ad_vAdcMax', si(r.vAdcMax, 'V')],
        v.scale === 'div' && ['ad_use', pct(r.use)],
        v.scale === 'div' && ['ad_rth', si(r.rth, 'Ω')],
        v.scale === 'div' && ['ad_iDiv', si(r.iDiv, 'A')],
      ])) : '')
      + (r.x ? block('ad_xTitle', rows([
        v.scale !== 'none' && ['ad_vAdc', si(r.x.vAdc, 'V', 5)],
        ['ad_code', `${intFmt(r.x.code)}${hex(r.x.code)}`, true],
        ['ad_back', qty(r.x.back, v, 5)],
        ['ad_err', si(r.x.err, 'V', 3)],
      ])) : '')
      + formulaBlock([
        'FSR = Vref (unipolar) or 2·Vref (bipolar),   LSB = FSR / 2^N',
        'code = round(Vin / LSB)   (ideal: transitions at ½ LSB, error ±½ LSB)',
        'quantisation noise = LSB / √12,   SNR_ideal = 6.02·N + 1.76 dB',
        'ENOB = (SINAD − 1.76 dB) / 6.02 dB',
        'averaging M samples: SNR + 10·log10(M),   N + ½·log2(M) bits',
        'scaling: divider k = R2 / (R1 + R2);  sensor k = S · G;  resolution = LSB / k',
      ], 'ad_note', [
        'Analog Devices MT-001 (SNR = 6.02N + 1.76 dB), MT-229 (quantisation noise), MT-003 (SINAD, ENOB)',
        'Kester, Data Conversion Handbook (ADI, 2005), ch. 2',
        'Silicon Labs AN118, Improving ADC Resolution by Oversampling and Averaging',
      ]);
  },
};
