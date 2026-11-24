import { effectiveLoad, equalLoadCaps, pullingPpm, ppmToHz, driftSeconds } from '../engine/passives.js';
import { nearestStandard } from '../engine/eseries.js';
import { heroes, rows, block, formulaBlock, messages, invalid } from '../ui/calculator.js';
import { fmt, fixed, si, siHtml } from '../ui/format.js';
import { svg, twoTerm, wire, node, ground, text, rect, circle, path, dimH, arrow, inverter } from '../ui/svg.js';
import { t } from '../i18n.js';

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
    xc_dgPierce: 'Pierce osilatörü: MCU içindeki evirici ve geri besleme direnci Rf, kristal, C1 ve C2 toprağa; kesikli çizgi parazitik kapasite',
    xc_dgSpec: 'istenen CL = {v}',
    xc_dgPpm: 'Frekans toleransı aralığı ve zamanla biriken saat kayması',
    xc_dgBand: 'Frekans aralığı',
    xc_dgDrift: 'Saat kayması (ölçeksiz)',
    xc_dgDay: '1 gün',
    xc_dgMonth: '30 gün',
    xc_dgYear: '1 yıl',
    xc_dgUs: '{ppm} ppm = her saniyede {us} µs kayma',
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
    xc_dgPierce: 'Pierce oscillator: MCU inverter with feedback resistor Rf, crystal, C1 and C2 to ground; stray capacitance dashed',
    xc_dgSpec: 'required CL = {v}',
    xc_dgPpm: 'Frequency tolerance window and clock drift building up over time',
    xc_dgBand: 'Frequency window',
    xc_dgDrift: 'Clock drift (not to scale)',
    xc_dgDay: '1 day',
    xc_dgMonth: '30 days',
    xc_dgYear: '1 year',
    xc_dgUs: '{ppm} ppm = {us} µs of drift every second',
  },
};

const isMode = (m) => (v) => v.mode === m;
const pF = (x) => x * 1e-12;

// ---------------------------------------------------------------------------
// Live diagrams
// ---------------------------------------------------------------------------

/** pF label ('?' while unknown); zero allowed for Cstray. */
const pf = (x, zeroOk = false) => (Number.isFinite(x) && (x > 0 || (zeroOk && x === 0)) ? `${fmt(x, 3)} pF` : '?');

/** Pierce oscillator with the live C1, C2, Cstray and the CL formula. */
function pierce(v, r) {
  const xi = 130; // XIN column
  const xo = 310; // XOUT column
  const yi = 52; // inverter row
  const yp = 76; // pins (bottom of the MCU box)
  const ys = 98; // Cstray row
  const yx = 124; // crystal row
  const yg = 184; // ground rail
  const caps = v.mode === 'caps';
  const c1 = r ? r.c1 : caps ? NaN : v.c1;
  const c2 = r ? r.c2 : caps ? NaN : v.c2;
  // MCU: inverter XIN → XOUT with the feedback resistor Rf across it
  let b = rect(90, 6, 260, yp - 6, 'soft', ' rx="4"') + text(98, 21, 'MCU', { cls: 'lbl', anchor: 'start' })
    + wire([xi, yp], [xi, yi], [204, yi])
    + inverter(204, yi)
    + wire([234, yi], [xo, yi], [xo, yp])
    + wire([160, yi], [160, 27]) + twoTerm('R', 160, 27, 280, 27) + wire([280, 27], [280, yi])
    + node(160, yi) + node(280, yi)
    + text(182, 22, 'Rf', { cls: 'name' })
    + text(xi + 6, yp - 5, 'XIN', { cls: 'lbl', anchor: 'start' })
    + text(xo - 6, yp - 5, 'XOUT', { cls: 'lbl', anchor: 'end' });
  // Pins down to the crystal, Cstray (dashed) across the pins
  b += wire([xi, yp], [xi, yx]) + wire([xo, yp], [xo, yx])
    + twoTerm('C', xi, ys, xo, ys, { dashed: true })
    + node(xi, ys) + node(xo, ys)
    + text(209, ys - 5, 'Cstray', { cls: 'name', anchor: 'end' })
    + text(231, ys - 5, pf(v.cs, true), { cls: 'val', anchor: 'start' });
  // Crystal
  b += twoTerm('X', xi, yx, xo, yx) + node(xi, yx) + node(xo, yx)
    + text(220, yx + 26, 'Y1', { cls: 'name' })
    + text(220, yx + 40, t('xc_dgSpec', { v: pf(v.cl) }), { cls: 'val' });
  // Load capacitors to ground
  b += twoTerm('C', xi, yx, xi, yg) + twoTerm('C', xo, yx, xo, yg)
    + text(xi - 16, yx + 28, 'C1', { cls: 'name', anchor: 'end' })
    + text(xi - 16, yx + 42, pf(c1), { cls: 'val', anchor: 'end' })
    + text(xo + 16, yx + 28, 'C2', { cls: 'name', anchor: 'start' })
    + text(xo + 16, yx + 42, pf(c2), { cls: 'val', anchor: 'start' });
  if (caps && r?.std > 0) {
    b += text(xi - 16, yx + 56, `E12: ${pf(r.std)}`, { cls: 'lbl', anchor: 'end' })
      + text(xo + 16, yx + 56, `E12: ${pf(r.std)}`, { cls: 'lbl', anchor: 'start' });
  }
  b += wire([xi, yg], [xo, yg]) + node(220, yg) + ground(220, yg);
  // CL formula with the live numbers
  const ser = (c1 * c2) / (c1 + c2);
  const errPct = r ? ((r.clEff - r.cl) / r.cl) * 100 : NaN;
  const dev = r && !caps ? ` (${errPct >= 0 ? '+' : ''}${fixed(errPct, 1)} %)` : '';
  b += text(220, yg + 34, 'CL = C1·C2 / (C1 + C2) + Cstray', { cls: 'title' })
    + text(220, yg + 50, `= ${pf(ser)} + ${pf(v.cs, true)} = ${pf(r?.clEff)}${dev}`, { cls: 'val' });
  return svg(440, yg + 58, b, t('xc_dgPierce'), { wide: true });
}

/** PPM mode: ±Δf window around f, and the clock drift after a day, month and year. */
function ppmDiagram(v, r) {
  const ppm = Math.abs(v.ppm);
  const df = r ? Math.abs(r.df) : NaN;
  const sv = (x, unit, sig = 3) => (Number.isFinite(x) ? si(x, unit, sig) : '?');
  const cx = 220;
  const bw = 80;
  let b = text(40, 18, t('xc_dgBand'), { cls: 'title', anchor: 'start' })
    + rect(cx - bw, 44, 2 * bw, 26, 'zone')
    + path(`M40,70H400`, 'axis')
    + path(`M${cx - bw},40V74M${cx + bw},40V74`, 'dimline')
    + path(`M${cx},40V70`, 'wave')
    + dimH(cx - bw, cx + bw, 34, `±${sv(df, 'Hz')}`, { cls: 'val' })
    + text(cx, 86, `f = ${sv(r?.fHz, 'Hz', 5)}`, { cls: 'val' })
    + text(cx - bw, 86, 'f − Δf', { cls: 'lbl' })
    + text(cx + bw, 86, 'f + Δf', { cls: 'lbl' });
  // Drift timeline (equally spaced marks, not to scale)
  const yt = 160;
  const marks = [[60, 0, '0'], [150, 86400, t('xc_dgDay')], [260, 30 * 86400, t('xc_dgMonth')], [370, 365 * 86400, t('xc_dgYear')]];
  b += text(40, 116, t('xc_dgDrift'), { cls: 'title', anchor: 'start' })
    + arrow(40, yt, 412, yt, { cls: 'axis' });
  for (const [x, sec, label] of marks) {
    const d = Number.isFinite(ppm) ? (ppm / 1e6) * sec : NaN;
    b += path(`M${x},${yt - 5}V${yt + 5}`, 'axis') + circle(x, yt, 3, 'node')
      + text(x, yt + 19, label, { cls: 'lbl' })
      + (sec ? text(x, yt - 11, `±${sv(d, 's')}`, { cls: 'val' }) : '');
  }
  b += text(220, 206, Number.isFinite(ppm) ? t('xc_dgUs', { ppm: fmt(ppm, 3), us: fmt(ppm, 3) }) : '', { cls: 'title' });
  return svg(440, 214, b, t('xc_dgPpm'), { wide: true });
}

const diagram = (v, u, r) => (v.mode === 'ppm' ? ppmDiagram(v, r) : pierce(v, r));

export default {
  diagram,
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
