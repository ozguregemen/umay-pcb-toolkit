import { signalBasics } from '../engine/signal.js';
import { toMm } from '../engine/units.js';
import { heroes, rows, block, formulaBlock, messages } from '../ui/calculator.js';
import { fmt, si, siHtml } from '../ui/format.js';
import { t } from '../i18n.js';
import { isImperial } from '../prefs.js';

const strings = {
  tr: {
    sg_tr: 'Yükselme süresi (tr)',
    sg_trInfo: 'Sürücünün veri sayfasındaki kenar süresi; saat frekansı değil. Hızlı bir sürücü düşük frekanslı bir sinyalde bile yüksek frekans içeriği üretir.',
    sg_edge: 'Kenar tanımı',
    sg_er: 'Etkin dielektrik sabiti (εeff)',
    sg_erInfo: 'Stripline için εr; microstrip için empedans hesaplayıcısının verdiği εeff (FR-4 microstrip ≈ 3,0–3,4).',
    sg_len: 'İz uzunluğu',
    sg_f: 'Frekans (dalga boyu / deri kalınlığı)',
    sg_fInfo: 'Boş bırakılırsa diz frekansı kullanılır.',
    sectionSkew: 'Uzunluk eşleme (skew)',
    sg_mismatch: 'Uzunluk farkı (ΔL)',
    sg_budget: 'Skew bütçesi',
    sg_bw: 'Bant genişliği (−3 dB)',
    sg_knee: 'Diz frekansı',
    sg_delay: 'Gecikme',
    sg_speed: 'Yayılma hızı',
    sg_riseLen: 'Kenar uzunluğu (tr · v)',
    sg_lumped: 'Toplu eleman sınırı (l_r / 6)',
    sg_reflect: 'Yansıma kritik uzunluğu (l_r / 2)',
    sg_traceDelay: 'İz gecikmesi',
    sg_regime: 'Değerlendirme',
    sg_lumpedOk: 'Toplu eleman gibi davranır; sonlandırma genellikle gerekmez.',
    sg_transition: 'Geçiş bölgesi: çınlama olabilir, sonlandırmayı değerlendirin.',
    sg_tline: 'İletim hattı: kontrollü empedans ve sonlandırma gerekir.',
    sg_lambda: 'Dalga boyu λ',
    sg_lambda10: 'λ / 10',
    sg_lambdaFrac: 'İz uzunluğu / λ',
    sg_skin: 'Bakırda deri kalınlığı',
    sg_skew: 'Skew (ΔL · t_pd)',
    sg_allowed: 'İzin verilen uzunluk farkı',
    sg_note: 'Tek kutuplu yaklaşım: BW = 0,35 / tr(10–90), diz frekansı 0,5 / tr (H. Johnson). Uzunluk l_r/6’dan kısaysa iz toplu eleman sayılabilir; gidiş-dönüş gecikmesi tr’den uzunsa (l > l_r/2) yansımalar kenarı bozar.',
  },
  en: {
    sg_tr: 'Rise time (tr)',
    sg_trInfo: 'The driver’s edge time from the datasheet, not the clock frequency. A fast driver creates high-frequency content even on a slow signal.',
    sg_edge: 'Edge definition',
    sg_er: 'Effective dielectric constant (εeff)',
    sg_erInfo: 'εr for stripline; for microstrip use εeff from the impedance calculator (FR-4 microstrip ≈ 3.0–3.4).',
    sg_len: 'Trace length',
    sg_f: 'Frequency (wavelength / skin depth)',
    sg_fInfo: 'Leave empty to use the knee frequency.',
    sectionSkew: 'Length matching (skew)',
    sg_mismatch: 'Length mismatch (ΔL)',
    sg_budget: 'Skew budget',
    sg_bw: 'Bandwidth (−3 dB)',
    sg_knee: 'Knee frequency',
    sg_delay: 'Delay',
    sg_speed: 'Propagation velocity',
    sg_riseLen: 'Edge length (tr · v)',
    sg_lumped: 'Lumped limit (l_r / 6)',
    sg_reflect: 'Reflection critical length (l_r / 2)',
    sg_traceDelay: 'Trace delay',
    sg_regime: 'Assessment',
    sg_lumpedOk: 'Behaves as a lumped element; termination is usually unnecessary.',
    sg_transition: 'Transition region: ringing is possible, consider termination.',
    sg_tline: 'Transmission line: controlled impedance and termination required.',
    sg_lambda: 'Wavelength λ',
    sg_lambda10: 'λ / 10',
    sg_lambdaFrac: 'Trace length / λ',
    sg_skin: 'Skin depth in copper',
    sg_skew: 'Skew (ΔL · t_pd)',
    sg_allowed: 'Allowed length mismatch',
    sg_note: 'Single-pole approximation: BW = 0.35 / tr(10–90), knee frequency 0.5 / tr (H. Johnson). A trace shorter than l_r/6 can be treated as lumped; when the round trip exceeds tr (l > l_r/2), reflections distort the edge.',
  },
};

const lenStr = (m) => {
  const mm = m * 1000;
  return isImperial() ? `${fmt(mm / 0.0254 / 1000, 4)} in · ${fmt(mm, 4)} mm` : `${fmt(mm, 4)} mm · ${fmt(mm / 25.4, 3)} in`;
};

export default {
  id: 'signal',
  strings,
  sections: [
    {
      title: 'sectionInputs',
      fields: [
        { key: 'tr', type: 'number', label: 'sg_tr', default: 1, units: ['ns', 'ps'], info: 'sg_trInfo',
          presets: [{ label: '100 ps', value: 100, unit: 'ps' }, { label: '500 ps', value: 500, unit: 'ps' }, { label: '1 ns', value: 1, unit: 'ns' }, { label: '5 ns', value: 5, unit: 'ns' }] },
        { key: 'edge', type: 'choice', label: 'sg_edge', default: '10-90',
          options: [{ value: '10-90', label: '10–90 %', raw: true }, { value: '20-80', label: '20–80 %', raw: true }] },
        { key: 'er', type: 'number', label: 'sg_er', default: 3.3, min: 1, info: 'sg_erInfo',
          presets: [{ label: 'µstrip 3.3', value: 3.3 }, { label: 'stripline 4.3', value: 4.3 }, { label: 'RO4350B 3.66', value: 3.66 }, { label: 'air 1', value: 1 }] },
        { key: 'L', type: 'number', label: 'sg_len', default: 100, optional: true, units: ['mm', 'cm', 'in', 'mil'] },
        { key: 'f', type: 'number', label: 'sg_f', default: '', optional: true, units: ['MHz', 'GHz', 'kHz'], info: 'sg_fInfo' },
      ],
    },
    {
      title: 'sectionSkew',
      collapsible: true,
      optional: true,
      fields: [
        { key: 'dL', type: 'number', label: 'sg_mismatch', default: '', optional: true, units: ['mm', 'mil', 'in'], pref: 'length' },
        { key: 'sk', type: 'number', label: 'sg_budget', default: '', optional: true, units: ['ps', 'ns'] },
      ],
    },
  ],

  compute(v, u) {
    const trS = v.tr * (u.tr === 'ps' ? 1e-12 : 1e-9);
    const fMul = { kHz: 1e3, MHz: 1e6, GHz: 1e9 }[u.f];
    return signalBasics({
      trS,
      edge: v.edge,
      erEff: v.er,
      lengthM: Number.isFinite(v.L) ? toMm(v.L, u.L) / 1000 : 0,
      fHz: Number.isFinite(v.f) ? v.f * fMul : 0,
      mismatchM: Number.isFinite(v.dL) ? toMm(v.dL, u.dL) / 1000 : 0,
      skewBudgetS: Number.isFinite(v.sk) ? v.sk * (u.sk === 'ps' ? 1e-12 : 1e-9) : 0,
    });
  },

  render(r) {
    const main = heroes([
      ['sg_bw', siHtml(r.bwHz, 'Hz')],
      ['sg_knee', siHtml(r.kneeHz, 'Hz')],
    ]);
    const regime = r.regime
      ? messages(r.regime === 'lumped' ? 'ok' : 'warn', [`sgRegime_${r.regime}`])
      : '';
    return main + regime
      + block('results', rows([
        ['sg_speed', `${fmt(r.v / 299792458 * 100, 3)} % c · ${fmt(r.tpd * 1e9, 4)} ps/mm`],
        ['sg_riseLen', lenStr(r.riseLenM)],
        ['sg_lumped', lenStr(r.lumpedM)],
        ['sg_reflect', lenStr(r.reflectM)],
        r.delayS !== undefined && ['sg_traceDelay', si(r.delayS, 's')],
      ]))
      + block('sg_lambda', rows([
        ['frequency', si(r.fHz, 'Hz')],
        ['sg_lambda', lenStr(r.lambdaM)],
        ['λ / 2', lenStr(r.lambdaM / 2), false, true],
        ['λ / 4', lenStr(r.lambdaM / 4), false, true],
        ['sg_lambda10', lenStr(r.lambdaM / 10)],
        ['λ / 20', lenStr(r.lambdaM / 20), false, true],
        r.lambdaFrac !== undefined && ['sg_lambdaFrac', fmt(r.lambdaFrac, 3)],
        ['sg_skin', `${fmt(r.skinM * 1e6, 3)} µm`],
      ]))
      + (r.skewS !== undefined || r.allowedMismatchM !== undefined
        ? block('sectionSkew', rows([
          r.skewS !== undefined && ['sg_skew', si(r.skewS, 's')],
          r.allowedMismatchM !== undefined && ['sg_allowed', lenStr(r.allowedMismatchM)],
        ]))
        : '')
      + formulaBlock([
        'BW = 0.35 / tr(10–90)        f_knee = 0.5 / tr(10–90)',
        'v = c / √εeff,  t_pd = 1/v,  l_r = tr · v',
        'lumped if l < l_r/6,  reflections matter if l > l_r/2',
        'λ = v / f,   δ = √(ρ / (π f µ0))',
        'skew = ΔL · t_pd',
      ], 'sg_note', ['H. Johnson & M. Graham, High-Speed Digital Design (1993)', 'E. Bogatin, Signal and Power Integrity — Simplified']);
  },
};

// Message keys used with messages('ok'|'warn', …)
Object.assign(strings.tr, {
  ok_sgRegime_lumped: strings.tr.sg_lumpedOk,
  warn_sgRegime_transition: strings.tr.sg_transition,
  warn_sgRegime_tline: strings.tr.sg_tline,
});
Object.assign(strings.en, {
  ok_sgRegime_lumped: strings.en.sg_lumpedOk,
  warn_sgRegime_transition: strings.en.sg_transition,
  warn_sgRegime_tline: strings.en.sg_tline,
});
