import { effectiveLoad, equalLoadCaps, pullingPpm, ppmToHz, driftSeconds } from '../engine/passives.js';
import { nearestStandard } from '../engine/eseries.js';
import { heroes, rows, block, formulaBlock, messages, invalid } from '../ui/calculator.js';
import { fmt, fixed, si, siHtml } from '../ui/format.js';

const strings = {
  tr: {
    xc_mode: 'Hesap',
    xc_caps: 'Yük kondansatörü seç',
    xc_check: 'Mevcut kondansatörleri kontrol et',
    xc_ppm: 'PPM ↔ Hz',
    xc_cl: 'Kristalin yük kapasitesi (CL)',
    xc_clInfo: 'Kristal veri sayfasında “load capacitance” olarak verilir (ör. 8, 12,5, 18 pF). Kristal bu yükle anma frekansında salınır.',
    xc_cs: 'Parazitik kapasite (Cstray)',
    xc_csInfo: 'Pad, iz ve mikrodenetleyici pin kapasitesi toplamı. Bilinmiyorsa 2–5 pF varsayılır; iz kısa tutulursa küçülür.',
    xc_c1: 'C1',
    xc_c2: 'C2',
    sectionPull: 'Frekans çekmesi (isteğe bağlı)',
    xc_cm: 'Hareketli kapasite (C1m / Cm)',
    xc_c0: 'Paralel kapasite (C0)',
    xc_f: 'Nominal frekans',
    xc_tol: 'Frekans hatası',
    xc_capEach: 'C1 = C2',
    xc_capStd: 'En yakın standart (E12)',
    xc_clEff: 'Etkin yük kapasitesi',
    xc_clErr: 'Hedeften sapma',
    xc_pull: 'Tahmini frekans çekmesi',
    xc_df: 'Frekans sapması',
    xc_driftDay: 'Günlük saat kayması',
    xc_driftMonth: 'Aylık saat kayması',
    xc_driftYear: 'Yıllık saat kayması',
    xc_note: 'Pierce osilatöründe iki kondansatör kristale seri görünür: CL = C1·C2/(C1+C2) + Cstray. Yaygın hata, C1 ve C2’yi doğrudan CL değerinde seçmektir; bu frekansı aşağı çeker. Frekans çekmesi için Cm ve C0 kristal veri sayfasından alınır.',
    warn_clTooLow: 'CL, parazitik kapasiteden küçük veya eşit; bu kristal bu kart için uygun olmayabilir.',
    err_ldo: '',
  },
  en: {
    xc_mode: 'Calculation',
    xc_caps: 'Choose load capacitors',
    xc_check: 'Check existing capacitors',
    xc_ppm: 'PPM ↔ Hz',
    xc_cl: 'Crystal load capacitance (CL)',
    xc_clInfo: 'Given in the crystal datasheet as “load capacitance” (e.g. 8, 12.5, 18 pF). The crystal oscillates at its nominal frequency with this load.',
    xc_cs: 'Stray capacitance (Cstray)',
    xc_csInfo: 'Sum of pad, trace and microcontroller pin capacitance. Assume 2–5 pF if unknown; short traces keep it low.',
    xc_c1: 'C1',
    xc_c2: 'C2',
    sectionPull: 'Frequency pulling (optional)',
    xc_cm: 'Motional capacitance (C1m / Cm)',
    xc_c0: 'Shunt capacitance (C0)',
    xc_f: 'Nominal frequency',
    xc_tol: 'Frequency error',
    xc_capEach: 'C1 = C2',
    xc_capStd: 'Nearest standard (E12)',
    xc_clEff: 'Effective load capacitance',
    xc_clErr: 'Deviation from target',
    xc_pull: 'Estimated frequency pulling',
    xc_df: 'Frequency deviation',
    xc_driftDay: 'Clock drift per day',
    xc_driftMonth: 'Clock drift per month',
    xc_driftYear: 'Clock drift per year',
    xc_note: 'In a Pierce oscillator the two capacitors appear in series across the crystal: CL = C1·C2/(C1+C2) + Cstray. A common mistake is to fit C1 and C2 equal to CL, which pulls the frequency low. For pulling, take Cm and C0 from the crystal datasheet.',
    warn_clTooLow: 'CL is not larger than the stray capacitance; this crystal may not suit this board.',
    err_ldo: '',
  },
};

const isMode = (m) => (v) => v.mode === m;
const pF = (x) => x * 1e-12;

export default {
  id: 'crystal',
  strings,
  sections: [
    {
      title: 'sectionSetup',
      fields: [
        { key: 'mode', type: 'choice', label: 'xc_mode', default: 'caps',
          options: [{ value: 'caps', label: 'xc_caps' }, { value: 'check', label: 'xc_check' }, { value: 'ppm', label: 'xc_ppm' }] },
      ],
    },
    {
      title: 'sectionInputs',
      fields: [
        { key: 'cl', type: 'number', label: 'xc_cl', default: 12.5, units: ['pF'], info: 'xc_clInfo', show: (v) => v.mode !== 'ppm',
          presets: [6, 8, 9, 12.5, 18, 20].map((x) => ({ label: `${x} pF`, value: x })) },
        { key: 'cs', type: 'number', label: 'xc_cs', default: 3, units: ['pF'], valid: 'nonneg', info: 'xc_csInfo', show: (v) => v.mode !== 'ppm' },
        { key: 'c1', type: 'number', label: 'xc_c1', default: 18, units: ['pF'], show: isMode('check') },
        { key: 'c2', type: 'number', label: 'xc_c2', default: 18, units: ['pF'], show: isMode('check') },
        { key: 'f', type: 'number', label: 'xc_f', default: 32.768, units: ['kHz', 'MHz', 'Hz'], show: isMode('ppm'),
          presets: [{ label: '32.768 kHz', value: 32.768, unit: 'kHz' }, { label: '8 MHz', value: 8, unit: 'MHz' }, { label: '16 MHz', value: 16, unit: 'MHz' }, { label: '25 MHz', value: 25, unit: 'MHz' }] },
        { key: 'ppm', type: 'number', label: 'xc_tol', default: 20, units: ['ppm'], valid: 'any', show: isMode('ppm'),
          presets: [10, 20, 30, 50].map((x) => ({ label: `±${x} ppm`, value: x })) },
      ],
    },
    {
      title: 'sectionPull',
      collapsible: true,
      optional: true,
      show: (v) => v.mode !== 'ppm',
      fields: [
        { key: 'cm', type: 'number', label: 'xc_cm', default: '', optional: true, units: ['fF'] },
        { key: 'c0', type: 'number', label: 'xc_c0', default: '', optional: true, units: ['pF'] },
      ],
    },
  ],

  compute(v, u) {
    if (v.mode === 'ppm') {
      const fHz = v.f * ({ Hz: 1, kHz: 1e3, MHz: 1e6 }[u.f]);
      return { ok: true, mode: 'ppm', fHz, ppm: v.ppm, df: ppmToHz(fHz, v.ppm) };
    }
    const warnings = v.cl <= v.cs ? ['clTooLow'] : [];
    let c1;
    let c2;
    if (v.mode === 'caps') {
      c1 = equalLoadCaps(v.cl, v.cs);
      c2 = c1;
    } else {
      c1 = v.c1;
      c2 = v.c2;
    }
    const clEff = effectiveLoad(c1, c2, v.cs);
    const std = c1 > 0 ? nearestStandard(c1, 'E12').nearest : NaN;
    const clStd = c1 > 0 ? effectiveLoad(std, std, v.cs) : NaN;
    const clUsed = v.mode === 'caps' ? clStd : clEff;
    let pull = null;
    if (v.cm > 0 && v.c0 > 0) pull = pullingPpm(v.cm * 1e-15, pF(v.c0), pF(v.cl), pF(clUsed));
    return { ok: true, mode: v.mode, c1, c2, std, clEff, clStd, clUsed, cl: v.cl, pull, warnings };
  },

  render(r) {
    if (!r.ok) return invalid(r.errors);
    if (r.mode === 'ppm') {
      const DAY = 86400;
      return heroes([['xc_df', siHtml(r.df, 'Hz')], ['xc_driftDay', siHtml(Math.abs(driftSeconds(r.ppm, DAY)), 's')]])
        + block('results', rows([
          ['xc_driftMonth', si(Math.abs(driftSeconds(r.ppm, 30 * DAY)), 's')],
          ['xc_driftYear', si(Math.abs(driftSeconds(r.ppm, 365 * DAY)), 's')],
        ]))
        + formulaBlock(['Δf = f · ppm / 10⁶', 'drift = ppm / 10⁶ · t'], null);
    }
    const errPct = ((r.clUsed - r.cl) / r.cl) * 100;
    const main = r.mode === 'caps'
      ? heroes([['xc_capEach', `${fmt(r.c1, 4)} <span class="u">pF</span>`], ['xc_capStd', `${fmt(r.std, 3)} <span class="u">pF</span>`]])
      : heroes([['xc_clEff', `${fmt(r.clEff, 4)} <span class="u">pF</span>`]]);
    return main + messages('warn', r.warnings)
      + block('results', rows([
        r.mode === 'caps' && ['xc_clEff', `${fmt(r.clStd, 4)} pF (${'E12'})`],
        ['xc_clErr', `${errPct >= 0 ? '+' : ''}${fixed(errPct, 1)} %`],
        r.pull !== null && ['xc_pull', `${r.pull >= 0 ? '+' : ''}${fmt(r.pull, 3)} ppm`],
      ]))
      + formulaBlock([
        'CL = C1·C2 / (C1 + C2) + Cstray',
        'C1 = C2 = 2·(CL − Cstray)',
        'Δf/f ≈ (Cm/2)·[1/(C0 + CL,actual) − 1/(C0 + CL,spec)]',
      ], 'xc_note', ['ST AN2867 “Oscillator design guide for STM8/STM32”', 'Crystal manufacturer application notes']);
  },
};
