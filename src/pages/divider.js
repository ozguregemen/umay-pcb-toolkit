import { dividerAnalyse, dividerDesign, feedbackDivider, dividerTolerance, feedbackTolerance } from '../engine/circuit.js';
import { TOLERANCE } from '../engine/eseries.js';
import { heroes, rows, block, formulaBlock, messages, invalid } from '../ui/calculator.js';
import { fmt, si, siHtml, esc } from '../ui/format.js';
import { svg, twoTerm, wire, node, ground, terminal, arrow, text, block as icBlock } from '../ui/svg.js';
import { t, locale } from '../i18n.js';

const strings = {
  tr: {
    dv_modeAnalyse: 'Çözümle',
    dv_modeDesign: 'Hedef gerilim',
    dv_modeFb: 'Regülatör geri beslemesi',
    dv_vin: 'Giriş gerilimi Vin',
    dv_r1: 'R1 (üst, Vin → çıkış)',
    dv_r2: 'R2 (alt, çıkış → GND)',
    dv_rl: 'Yük direnci RL',
    dv_rlInfo: 'Çıkışa bağlı yük (ör. ADC ya da op-amp girişi, başka bir devre). Boş bırakılırsa yalnızca yüksüz çıkış hesaplanır.',
    dv_vout: 'Hedef çıkış gerilimi',
    dv_series: 'E-serisi',
    dv_rTotal: 'Yaklaşık toplam direnç R1 + R2',
    dv_rTotalInfo: 'Toplam direnç bölücü akımını ve çıkış direncini belirler. Arama, toplamı bu değerin 0,5–2 katı olan çiftlerle sınırlıdır.',
    dv_vref: 'Referans gerilimi Vref (VFB)',
    dv_dgDiv: 'Gerilim bölücü devresi',
    dv_dgFb: 'Ayarlı regülatör geri besleme bölücüsü',
    dv_dgReg: 'Regülatör',
    dv_tolTitle: 'Tolerans analizi',
    dv_rtol: 'Direnç toleransı',
    dv_rtolInfo: 'Her iki direncin toleransı. Seri: E24 genellikle ±%5 veya ±%1, E96 ±%1, hassas dirençler ±%0,1.',
    dv_vtolIn: 'Giriş gerilimi toleransı',
    dv_vtolRef: 'Referans gerilimi toleransı',
    dv_tolRange: 'Çıkış aralığı (en kötü durum)',
    dv_tolWc: 'En kötü durum sapması',
    dv_tolRss: 'İstatistiksel sapma (RSS)',
    dv_tolNote: 'En kötü durum, tüm parçaların aynı anda en olumsuz uçta olduğunu varsayar. RSS, bağımsız hataların karesel toplamıdır ve üretimdeki gerçek dağılıma daha yakındır. Sıcaklık katsayısı ve yaşlanma dahil değildir.',
    dv_vrefInfo: 'Regülatör veri sayfasında verilen geri besleme (FB) pini gerilimi.',
    dv_r2fb: 'R2 (FB → GND)',
    dv_r2fbInfo: 'R1 çıkış ile FB pini arasına, R2 FB ile toprak arasına bağlanır. Pek çok regülatör 10–100 kΩ aralığında R2 önerir; veri sayfasını kontrol edin.',
    dv_voutOpen: 'Çıkış (yüksüz)',
    dv_voutLoaded: 'Çıkış (yüklü)',
    dv_loadError: 'Yükün etkisi',
    dv_ratio: 'Bölme oranı Vout/Vin',
    dv_current: 'Bölücü akımı',
    dv_iLoad: 'Yük akımı',
    dv_pR1: 'R1 güç kaybı',
    dv_pR2: 'R2 güç kaybı',
    dv_rth: 'Çıkış direnci (Thévenin, R1 ∥ R2)',
    dv_r1Exact: 'R1 (tam değer)',
    dv_r2Exact: 'R2 (tam değer)',
    dv_r1Std: 'R1',
    dv_r2Std: 'R2',
    dv_voutStd: 'Elde edilen çıkış',
    dv_error: 'Hata',
    dv_sum: 'Toplam R1 + R2',
    dv_target: 'hedef',
    dv_details: 'Ayrıntılar',
    dv_exactTitle: 'Tam değerler',
    dv_stdTitle: 'En iyi {series} çifti',
    dv_r1Nearest: 'R1 ({series}, R2 sabit)',
    dv_fbExact: 'R1 (tam değer)',
    dv_pairTitle: 'R2 de bir dekad içinde değişebilirse ({series})',
    dv_iFb: 'Geri besleme akımı Vref / R2',
    dv_tolerance: 'Seri toleransı',
    dv_noteAnalyse: 'RL, R2’ye paralel bağlanır. Thévenin direnci, çıkışın bağlandığı yüke (ör. ADC örnekleme kondansatörüne) gösterdiği kaynak direncidir.',
    dv_noteDesign: 'Arama, toplamı hedefin 0,5–2 katı olan tüm standart R1/R2 çiftlerini dener ve oran hatası en küçük olanı seçer; eşitlikte toplamı hedefe en yakın çift seçilir. Direnç toleransı hesaba katılmaz.',
    dv_noteFb: 'Vout = Vref · (1 + R1/R2). FB pini giriş akımı ihmal edilmiştir; sonuç direnç toleransını ve Vref doğruluğunu içermez.',
    warn_dv_loading: 'Yük çıkışı {pct} değiştiriyor. Daha düşük değerli dirençler kullanın ya da çıkışı bir tamponla (op-amp) sürün.',
    warn_dv_power: 'Dirençlerden biri {p} harcıyor; 0603 kılıf tipik olarak 0,1 W taşır. Güç sınıfını kontrol edin.',
    warn_dv_lowFbCurrent: 'Geri besleme akımı 1 µA’in altında: FB pini kaçak akımı ve gürültü çıkışı kaydırabilir. Veri sayfasındaki R2 önerisine bakın.',
    err_dv_voutRange: 'Hedef çıkış 0 ile Vin arasında olmalı.',
    err_dv_noPair: 'Bu aralıkta uygun bir direnç çifti bulunamadı.',
    err_dv_voutBelowVref: 'Çıkış gerilimi Vref’ten büyük olmalı.',
  },
  en: {
    dv_modeAnalyse: 'Analyse',
    dv_modeDesign: 'Target voltage',
    dv_modeFb: 'Regulator feedback',
    dv_vin: 'Input voltage Vin',
    dv_r1: 'R1 (top, Vin → output)',
    dv_r2: 'R2 (bottom, output → GND)',
    dv_rl: 'Load resistance RL',
    dv_rlInfo: 'Load connected to the output (e.g. an ADC or op-amp input, another circuit). Leave empty for the unloaded output only.',
    dv_vout: 'Target output voltage',
    dv_series: 'E-series',
    dv_rTotal: 'Approximate total resistance R1 + R2',
    dv_rTotalInfo: 'The total sets the divider current and the output resistance. The search is limited to pairs whose sum is 0.5–2× this value.',
    dv_vref: 'Reference voltage Vref (VFB)',
    dv_dgDiv: 'Voltage divider circuit',
    dv_dgFb: 'Adjustable regulator feedback divider',
    dv_dgReg: 'Regulator',
    dv_tolTitle: 'Tolerance analysis',
    dv_rtol: 'Resistor tolerance',
    dv_rtolInfo: 'Tolerance of both resistors. Typically E24 ±5 % or ±1 %, E96 ±1 %, precision parts ±0.1 %.',
    dv_vtolIn: 'Input voltage tolerance',
    dv_vtolRef: 'Reference voltage tolerance',
    dv_tolRange: 'Output range (worst case)',
    dv_tolWc: 'Worst-case deviation',
    dv_tolRss: 'Statistical deviation (RSS)',
    dv_tolNote: 'Worst case assumes every part sits at its least favourable extreme at once. RSS is the root-sum-square of independent errors and is closer to the real spread in production. Temperature coefficient and ageing are not included.',
    dv_vrefInfo: 'Feedback (FB) pin voltage given in the regulator datasheet.',
    dv_r2fb: 'R2 (FB → GND)',
    dv_r2fbInfo: 'R1 goes from the output to the FB pin, R2 from FB to ground. Many regulators recommend R2 in the 10–100 kΩ range; check the datasheet.',
    dv_voutOpen: 'Output (unloaded)',
    dv_voutLoaded: 'Output (loaded)',
    dv_loadError: 'Loading error',
    dv_ratio: 'Division ratio Vout/Vin',
    dv_current: 'Divider current',
    dv_iLoad: 'Load current',
    dv_pR1: 'R1 dissipation',
    dv_pR2: 'R2 dissipation',
    dv_rth: 'Output resistance (Thévenin, R1 ∥ R2)',
    dv_r1Exact: 'R1 (exact)',
    dv_r2Exact: 'R2 (exact)',
    dv_r1Std: 'R1',
    dv_r2Std: 'R2',
    dv_voutStd: 'Resulting output',
    dv_error: 'Error',
    dv_sum: 'Total R1 + R2',
    dv_target: 'target',
    dv_details: 'Details',
    dv_exactTitle: 'Exact values',
    dv_stdTitle: 'Best {series} pair',
    dv_r1Nearest: 'R1 ({series}, R2 fixed)',
    dv_fbExact: 'R1 (exact)',
    dv_pairTitle: 'If R2 may also vary within one decade ({series})',
    dv_iFb: 'Feedback current Vref / R2',
    dv_tolerance: 'Series tolerance',
    dv_noteAnalyse: 'RL is in parallel with R2. The Thévenin resistance is the source resistance the output presents to its load (e.g. an ADC sampling capacitor).',
    dv_noteDesign: 'The search tries every standard R1/R2 pair whose sum is 0.5–2× the target and keeps the smallest ratio error; ties go to the sum closest to the target. Resistor tolerance is not included.',
    dv_noteFb: 'Vout = Vref · (1 + R1/R2). FB pin input current is neglected; the result does not include resistor tolerance or Vref accuracy.',
    warn_dv_loading: 'The load shifts the output by {pct}. Use lower resistor values or buffer the output (op-amp).',
    warn_dv_power: 'A resistor dissipates {p}; a typical 0603 part is rated 0.1 W. Check the power rating.',
    warn_dv_lowFbCurrent: 'Feedback current is below 1 µA: FB pin leakage and noise can shift the output. Check the datasheet’s R2 recommendation.',
    err_dv_voutRange: 'Target output must be between 0 and Vin.',
    err_dv_noPair: 'No suitable resistor pair was found in this range.',
    err_dv_voutBelowVref: 'Output voltage must be greater than Vref.',
  },
};

/** Series tolerance as a locale percentage (±5% / ±%5). */
const tolPct = (s) => `±${new Intl.NumberFormat(locale(), { style: 'percent', maximumFractionDigits: 1 }).format(TOLERANCE[s].pct / 100)}`;
// Getter: the option label follows the current language when the form renders.
const SERIES_OPTS = ['E12', 'E24', 'E48', 'E96'].map((s) => ({ value: s, raw: true, get label() { return `${s} (${tolPct(s)})`; } }));
const isMode = (m) => (v) => v.mode === m;

/** Signed percentage in the current locale (e.g. +1.23% / +%1,23). */
const pct = (x) => new Intl.NumberFormat(locale(), { style: 'percent', signDisplay: 'exceptZero', maximumSignificantDigits: 3 })
  .format(Math.abs(x) < 1e-9 ? 0 : x / 100);
const ohm = (x) => si(x, 'Ω');

function powerWarning(warnings, vars, ...p) {
  const max = Math.max(...p);
  if (max > 0.1) {
    warnings.push('dv_power');
    vars.dv_power = { p: si(max, 'W', 3) };
  }
}

function renderAnalyse(r) {
  const warnings = [];
  const vars = {};
  if (r.loaded && Math.abs(r.loadErrorPct) > 1) {
    warnings.push('dv_loading');
    vars.dv_loading = { pct: pct(r.loadErrorPct) };
  }
  powerWarning(warnings, vars, r.pR1, r.pR2);
  return heroes([
    ['dv_voutOpen', siHtml(r.voutOpen, 'V'), `${esc(t('dv_ratio'))}: ${fmt(r.ratio, 4)}`],
    r.loaded && ['dv_voutLoaded', siHtml(r.vout, 'V'), `${esc(t('dv_loadError'))}: ${pct(r.loadErrorPct)}`],
  ])
    + messages('warn', warnings, vars)
    + block('dv_details', rows([
      ['dv_current', si(r.iDivider, 'A')],
      r.loaded && ['dv_iLoad', si(r.iLoad, 'A')],
      ['dv_pR1', si(r.pR1, 'W')],
      ['dv_pR2', si(r.pR2, 'W')],
      ['dv_rth', ohm(r.rth)],
    ]))
    + formulaBlock([
      'Vout = Vin · R2 / (R1 + R2)',
      'with load:  R2′ = R2 ∥ RL = R2 · RL / (R2 + RL),  Vout = Vin · R2′ / (R1 + R2′)',
      'I = Vin / (R1 + R2),   P_R1 = (Vin − Vout)² / R1,   P_R2 = Vout² / R2',
      'R_th = R1 ∥ R2 = R1 · R2 / (R1 + R2)',
    ], 'dv_noteAnalyse', ['Horowitz & Hill, The Art of Electronics, 3rd ed., ch. 1 (dividers, Thévenin equivalent)']);
}

function renderDesign(r, v) {
  const warnings = [];
  const vars = {};
  powerWarning(warnings, vars, r.pR1, r.pR2);
  const series = esc(v.ser);
  return heroes([
    ['dv_r1Std', siHtml(r.pair.r1, 'Ω'), series],
    ['dv_r2Std', siHtml(r.pair.r2, 'Ω'), series],
    ['dv_voutStd', siHtml(r.voutStd, 'V'), `${esc(t('dv_error'))}: ${pct(r.errorPct)}`],
  ])
    + messages('warn', warnings, vars)
    + block(t('dv_stdTitle', { series: v.ser }), rows([
      ['dv_sum', ohm(r.pair.sum)],
      ['dv_ratio', `${fmt(r.pair.ratio, 5)} · ${esc(t('dv_target'))} ${fmt(r.ratio, 5)}`],
      ['dv_current', si(r.current, 'A')],
      ['dv_pR1', si(r.pR1, 'W')],
      ['dv_pR2', si(r.pR2, 'W')],
      ['dv_rth', ohm(r.rth)],
      ['dv_tolerance', tolPct(v.ser)],
    ]), true)
    + block('dv_exactTitle', rows([
      ['dv_r1Exact', ohm(r.r1Exact)],
      ['dv_r2Exact', ohm(r.r2Exact)],
    ]))
    + formulaBlock([
      'R2 = R_total · Vout / Vin,   R1 = R_total − R2',
      'best pair:  min | R2 / (R1 + R2) − Vout / Vin |',
      '            over E-series R1, R2 with 0.5 · R_total ≤ R1 + R2 ≤ 2 · R_total',
    ], 'dv_noteDesign', ['IEC 60063:2015 (E-series)']);
}

function renderFb(r, v) {
  const warnings = [];
  if (r.iFb < 1e-6) warnings.push('dv_lowFbCurrent');
  const series = v.fser;
  return heroes([
    ['dv_r1Std', siHtml(r.r1, 'Ω'), esc(t('dv_r1Nearest', { series }))],
    ['dv_voutStd', siHtml(r.vout, 'V'), `${esc(t('dv_error'))}: ${pct(r.errorPct)}`],
  ])
    + messages('warn', warnings)
    + block('dv_details', rows([
      ['dv_fbExact', ohm(r.r1Exact)],
      ['dv_r2Std', ohm(v.r2)],
      ['dv_iFb', si(r.iFb, 'A')],
      ['dv_tolerance', tolPct(series)],
    ]))
    + (r.pair ? block(t('dv_pairTitle', { series }), rows([
      ['dv_r1Std', ohm(r.pair.r1)],
      ['dv_r2Std', ohm(r.pair.r2)],
      ['dv_voutStd', `${si(r.pair.vout, 'V', 5)} (${pct(r.pair.errorPct)})`, true],
    ]), true) : '')
    + formulaBlock([
      'Vout = Vref · (1 + R1 / R2)',
      'R1   = R2 · (Vout / Vref − 1)',
      'I_FB = Vref / R2',
    ], 'dv_noteFb', ['Adjustable regulator datasheets (FB divider)', 'IEC 60063:2015 (E-series)']);
}

/** Live schematic: shows the values in use and the resulting output voltage. */
function diagram(v, u, r) {
  const val = (x, unit) => (Number.isFinite(x) && x > 0 ? si(x, unit, 3) : '?');
  if (v.mode === 'fb') {
    const r1 = r?.r1;
    const vout = r?.vout;
    const body = icBlock(40, 40, 110, 110, t('dv_dgReg'), 'VOUT · FB · GND')
      + text(156, 66, 'VOUT', { cls: 'lbl', anchor: 'start' }) + text(156, 116, 'FB', { cls: 'lbl', anchor: 'start' })
      + wire([150, 60], [280, 60]) + node(280, 60)
      + twoTerm('R', 280, 60, 280, 110, { name: 'R1', value: val(r1, 'Ω') })
      + node(280, 110) + wire([150, 110], [280, 110])
      + twoTerm('R', 280, 110, 280, 170, { name: 'R2', value: val(v.r2fb, 'Ω') })
      + ground(280, 170) + wire([95, 150], [95, 170]) + ground(95, 170)
      + wire([280, 60], [380, 60]) + terminal(380, 60, `Vout ≈ ${val(vout, 'V')}`, 'top', 'val')
      + text(215, 128, `Vref = ${val(v.vref, 'V')}`, { cls: 'val' })
      + arrow(250, 116, 250, 160, { cls: 'flow', headCls: 'arrow flow' }) + text(244, 146, 'I_FB', { cls: 'lbl', anchor: 'end' });
    return svg(440, 200, body, t('dv_dgFb'), { wide: true });
  }
  const isDesign = v.mode === 'design';
  const r1 = isDesign ? r?.pair?.r1 : v.r1;
  const r2 = isDesign ? r?.pair?.r2 : v.r2;
  const vout = isDesign ? r?.voutStd : r?.vout;
  const loaded = !isDesign && v.rl > 0;
  const i = isDesign ? r?.current : (loaded ? r?.iR1 : r?.iDivider);
  let body = twoTerm('V', 60, 50, 60, 170, { name: 'Vin', value: val(v.vin, 'V'), flip: true })
    + wire([60, 50], [200, 50])
    + twoTerm('R', 200, 50, 200, 110, { name: 'R1', value: val(r1, 'Ω') })
    + node(200, 110)
    + twoTerm('R', 200, 110, 200, 170, { name: 'R2', value: val(r2, 'Ω') })
    + wire([60, 170], [200, 170]) + ground(130, 170) + node(130, 170)
    + wire([200, 110], [370, 110]) + terminal(370, 110, `Vout = ${val(vout, 'V')}`, 'top', 'val')
    + arrow(178, 62, 178, 98, { cls: 'flow', headCls: 'arrow flow' }) + text(172, 84, `I = ${val(i, 'A')}`, { cls: 'lbl', anchor: 'end' });
  if (loaded) {
    body += node(300, 110) + twoTerm('R', 300, 110, 300, 170, { name: 'RL', value: val(v.rl, 'Ω') }) + wire([200, 170], [300, 170]);
  }
  return svg(440, 200, body, t('dv_dgDiv'), { wide: true });
}

export default {
  diagram,
  id: 'divider',
  strings,
  sections: [
    {
      title: 'sectionSetup',
      fields: [
        { key: 'mode', type: 'choice', label: 'mode', default: 'analyse',
          options: [
            { value: 'analyse', label: 'dv_modeAnalyse' },
            { value: 'design', label: 'dv_modeDesign' },
            { value: 'fb', label: 'dv_modeFb' },
          ] },
        { key: 'ser', type: 'select', label: 'dv_series', default: 'E24', options: SERIES_OPTS, show: isMode('design') },
        { key: 'fser', type: 'select', label: 'dv_series', default: 'E96', options: SERIES_OPTS, show: isMode('fb') },
      ],
    },
    {
      title: 'sectionInputs',
      fields: [
        { key: 'vin', type: 'number', label: 'dv_vin', default: 12, units: ['V'], si: true, show: (v) => v.mode !== 'fb',
          presets: [3.3, 5, 12, 24].map((x) => ({ label: `${x} V`, value: x })) },
        { key: 'r1', type: 'number', label: 'dv_r1', default: '10k', units: ['ohm'], si: true, show: isMode('analyse') },
        { key: 'r2', type: 'number', label: 'dv_r2', default: '4k7', units: ['ohm'], si: true, show: isMode('analyse') },
        { key: 'rl', type: 'number', label: 'dv_rl', default: '', units: ['ohm'], si: true, optional: true, info: 'dv_rlInfo',
          show: isMode('analyse') },
        { key: 'vref', type: 'number', label: 'dv_vref', default: 0.8, units: ['V'], si: true, info: 'dv_vrefInfo', show: isMode('fb'),
          presets: ['0.6', '0.8', '1.0', '1.21', '1.25'].map((x) => ({ label: `${x} V`, value: x })) },
        { key: 'vout', type: 'number', label: 'dv_vout', default: 3.3, units: ['V'], si: true, show: (v) => v.mode !== 'analyse',
          presets: [1.2, 1.8, 2.5, 3.3, 5].map((x) => ({ label: `${x} V`, value: x })) },
        { key: 'rt', type: 'number', label: 'dv_rTotal', default: '100k', units: ['ohm'], si: true, info: 'dv_rTotalInfo',
          show: isMode('design') },
        { key: 'r2fb', type: 'number', label: 'dv_r2fb', default: '10k', units: ['ohm'], si: true, info: 'dv_r2fbInfo',
          show: isMode('fb') },
      ],
    },
    {
      title: 'dv_tolTitle',
      show: (v) => v.mode !== 'design',
      fields: [
        { key: 'rtol', type: 'number', label: 'dv_rtol', default: 1, units: ['pct'], valid: 'nonneg', max: 20, info: 'dv_rtolInfo',
          presets: [0.1, 0.5, 1, 5].map((x) => ({ label: `${x} %`, value: x })) },
        { key: 'vtol', type: 'number', label: (v) => (v.mode === 'fb' ? 'dv_vtolRef' : 'dv_vtolIn'), default: 0, units: ['pct'], valid: 'nonneg', max: 20 },
      ],
    },
  ],

  compute(v) {
    if (v.mode === 'design') {
      return { mode: 'design', ...dividerDesign({ vin: v.vin, vout: v.vout, rTotal: v.rt, series: v.ser }) };
    }
    if (v.mode === 'fb') {
      const r = feedbackDivider({ vref: v.vref, vout: v.vout, r2: v.r2fb, series: v.fser });
      if (r.ok) r.tol = feedbackTolerance({ vref: v.vref, r1: r.r1, r2: v.r2fb, rTolPct: v.rtol, vTolPct: v.vtol });
      return { mode: 'fb', ...r };
    }
    const r = dividerAnalyse({ vin: v.vin, r1: v.r1, r2: v.r2, rl: v.rl });
    return { mode: 'analyse', ok: true, ...r, tol: dividerTolerance({ vin: v.vin, r1: v.r1, r2: v.r2, rTolPct: v.rtol, vTolPct: v.vtol }) };
  },

  render(r, v) {
    if (!r.ok) return invalid(r.errors);
    if (r.mode === 'design') return renderDesign(r, v);
    const tol = r.tol && (r.tol.wcPct > 0)
      ? block('dv_tolTitle', rows([
        ['dv_tolRange', `${si(r.tol.min, 'V', 5)} … ${si(r.tol.max, 'V', 5)}`],
        ['dv_tolWc', `±${fmt(r.tol.wcPct, 3)} %`],
        ['dv_tolRss', `±${fmt(r.tol.rssPct, 3)} %`],
      ]) + `<p class="note">${esc(t('dv_tolNote'))}</p>`)
      : '';
    if (r.mode === 'fb') return renderFb(r, { ...v, r2: v.r2fb }) + tol;
    return renderAnalyse(r) + tol;
  },
};
