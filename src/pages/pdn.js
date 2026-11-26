import { targetImpedance, sweepBank, bulkCapacitance, planeCapacitance, srf, bankZ, capZ } from '../engine/power.js';
import { heroes, rows, block, steps, checks } from '../ui/calculator.js';
import { tx } from '../ui/math.js';
import { fmt, si, siHtml, esc } from '../ui/format.js';
import { logLogChart } from '../ui/chart.js';
import { t } from '../i18n.js';

const strings = {
  tr: {
    pd_target: 'Hedef empedans',
    pd_vdd: 'Besleme gerilimi',
    pd_ripple: 'İzin verilen dalgalanma',
    pd_rippleInfo: 'Besleme toleransının PDN gürültüsüne ayrılan kısmı (ör. ±%5 toleransın %3’ü). Veri sayfasındaki çekirdek gerilim toleransına bakın.',
    pd_imax: 'En yüksek akım',
    pd_step: 'Anlık akım değişimi',
    pd_stepInfo: 'En kötü yük basamağının en yüksek akıma oranı. Bilinmiyorsa %50 yaygın bir varsayımdır.',
    pd_freg: 'Regülatör bant genişliği',
    pd_fregInfo: 'Regülatör çevriminin etkili olduğu üst frekans. Bunun üstünde akım kondansatörlerden gelir; bulk kapasite buradan hesaplanır.',
    pd_fmax: 'PDN üst frekansı',
    pd_fmaxInfo: 'Kart seviyesindeki dekuplajın etkili olduğu üst sınır. Bunun üstünde paket ve kalıp içi kapasite devreye girer (tipik 50–200 MHz).',
    pd_group: 'Kondansatör grubu {n}',
    pd_c: 'Kapasite',
    pd_esr: 'ESR',
    pd_esl: 'ESL (montaj dahil)',
    pd_eslInfo: 'Paket ESL’i + via ve pad montaj endüktansı. 0402 için toplam 0,4–0,8 nH, 0603 için 0,6–1 nH tipiktir.',
    pd_n: 'Adet',
    sectionPlane: 'Güç/toprak düzlem kapasitesi',
    pd_planeArea: 'Örtüşen düzlem alanı',
    pd_planeGap: 'Düzlemler arası dielektrik',
    pd_planeEr: 'εr',
    pd_bulk: 'Gereken bulk kapasite',
    pd_dv: 'İzin verilen gerilim değişimi ΔV',
    pd_di: 'Akım basamağı ΔI',
    pd_srf: 'Grup {n} öz rezonansı',
    pd_planeC: 'Düzlem kapasitesi',
    pd_band: 'Hedefi sağlayan bant',
    pd_none: 'Yok',
    pd_worst: 'Bant içi en kötü tepe',
    pd_zmax: 'f_reg – f_max arası en yüksek |Z|',
    pd_checks: 'Kontroller',
    pd_okBand: '|Z| ≤ Z_hedef: f_reg – f_max',
    pd_okBulk: 'Toplam kapasite ≥ gereken bulk',
    pd_chart: 'Kondansatör bankası empedansı',
    pd_legendZ: '|Z| banka',
    pd_legendT: 'Z hedef',
    pd_zAt: '{f} frekansında grup {n} empedansı',
    pd_scanNote: 'Banka empedansı f_reg ile f_max arasında logaritmik aralıklı 201 frekansta hesaplanır; adımlar |Z| değerinin en yüksek çıktığı frekansı gösterir.',
    pd_note: 'Frekans alanı PDN yöntemi: regülatör bant genişliğinden PDN üst frekansına kadar |Z| hedef empedansın altında kalmalıdır. Her kondansatör seri R-L-C olarak modellenir; düzlem kapasitesi idealdir. Paralel farklı değerler arasında anti-rezonans tepeleri oluşur; değerleri yaymak ve ESL’i düşürmek (kısa, çoklu via) tepeleri bastırır.',
  },
  en: {
    pd_target: 'Target impedance',
    pd_vdd: 'Supply voltage',
    pd_ripple: 'Allowed ripple',
    pd_rippleInfo: 'Share of the supply tolerance allotted to PDN noise (e.g. 3 % of a ±5 % tolerance). Check the core-voltage tolerance in the datasheet.',
    pd_imax: 'Maximum current',
    pd_step: 'Transient current step',
    pd_stepInfo: 'Worst load step as a fraction of maximum current. 50 % is a common assumption when unknown.',
    pd_freg: 'Regulator bandwidth',
    pd_fregInfo: 'Upper frequency where the regulator loop is effective. Above it the current comes from capacitors; bulk capacitance is sized here.',
    pd_fmax: 'PDN upper frequency',
    pd_fmaxInfo: 'Upper limit where board-level decoupling is effective. Above it package and on-die capacitance take over (typically 50–200 MHz).',
    pd_group: 'Capacitor group {n}',
    pd_c: 'Capacitance',
    pd_esr: 'ESR',
    pd_esl: 'ESL (incl. mounting)',
    pd_eslInfo: 'Package ESL plus via and pad mounting inductance. 0.4–0.8 nH total is typical for 0402, 0.6–1 nH for 0603.',
    pd_n: 'Count',
    sectionPlane: 'Power/ground plane capacitance',
    pd_planeArea: 'Overlapping plane area',
    pd_planeGap: 'Plane-to-plane dielectric',
    pd_planeEr: 'εr',
    pd_bulk: 'Required bulk capacitance',
    pd_dv: 'Allowed voltage deviation ΔV',
    pd_di: 'Current step ΔI',
    pd_srf: 'Group {n} self-resonance',
    pd_planeC: 'Plane capacitance',
    pd_band: 'Band meeting the target',
    pd_none: 'None',
    pd_worst: 'Worst in-band peak',
    pd_zmax: 'Highest |Z| between f_reg and f_max',
    pd_checks: 'Checks',
    pd_okBand: '|Z| ≤ Z_target from f_reg to f_max',
    pd_okBulk: 'Total capacitance ≥ required bulk',
    pd_chart: 'Capacitor bank impedance',
    pd_legendZ: '|Z| bank',
    pd_legendT: 'Z target',
    pd_zAt: 'Group {n} impedance at {f}',
    pd_scanNote: 'The bank impedance is evaluated at 201 logarithmically spaced frequencies from f_reg to f_max; the steps show the frequency where |Z| is highest.',
    pd_note: 'Frequency-domain PDN method: |Z| must stay below the target impedance from the regulator bandwidth up to the PDN upper frequency. Each capacitor is a series R-L-C; the plane capacitance is ideal. Anti-resonance peaks form between different parallel values; spreading values and lowering ESL (short, multiple vias) suppresses them.',
  },
};

const GROUP_DEFAULTS = [
  { c: 22, cu: 'uF', esr: 5, esl: 1.5, n: 2 },
  { c: 1, cu: 'uF', esr: 10, esl: 0.8, n: 4 },
  { c: 100, cu: 'nF', esr: 20, esl: 0.6, n: 8 },
];
const C_MUL = { uF: 1e-6, nF: 1e-9, pF: 1e-12 };

const groupSection = (g, i) => ({
  title: `pd_group${i + 1}`,
  collapsible: true,
  fields: [
    { key: `c${i}`, type: 'number', label: 'pd_c', default: g.c, units: ['uF', 'nF', 'pF'], unit: g.cu },
    { key: `r${i}`, type: 'number', label: 'pd_esr', default: g.esr, units: ['mohm'] },
    { key: `l${i}`, type: 'number', label: 'pd_esl', default: g.esl, units: ['nH'], info: i === 0 ? 'pd_eslInfo' : undefined },
    { key: `n${i}`, type: 'number', label: 'pd_n', default: g.n, valid: 'nonneg', integer: true },
  ],
});

for (const l of ['tr', 'en']) {
  for (let i = 1; i <= 3; i++) strings[l][`pd_group${i}`] = strings[l].pd_group.replace('{n}', i);
}

/**
 * Calculation steps: the target impedance and the bulk capacitance, then the
 * bank impedance at the frequency where it is highest between f_reg and f_max
 * (found by the scan in compute()), built from each group's complex impedance.
 */
function worked(r, v) {
  const q = (x, unit) => tx(si(x, unit));
  const pct = (x) => tx(`${fmt(x, 4)} %`);
  const zc = ([re, im]) => `${q(re, 'Ω')} ${im < 0 ? '−' : '+'} j \\cdot ${q(Math.abs(im), 'Ω')}`;
  const f = q(r.fAtMax, 'Hz');
  const plane = r.planeC > 0;
  const act = r.groups.map((g, i) => ({ g, k: i + 1, z: r.zAtMax[i] })).filter((x) => x.z);
  const bank = r.zmax > 0 && Number.isFinite(r.zmax);
  const termsSym = act.map(({ k }) => `\\frac{n_${k}}{Z_${k}}`).concat(plane ? ['j \\cdot 2π f \\cdot C_{plane}'] : []);
  const termsNum = act.map(({ g, z }) => `\\frac{${g.n}}{${zc(z)}}`).concat(plane ? [`j \\cdot 2π \\cdot ${f} \\cdot ${q(r.planeC, 'F')}`] : []);
  return steps([
    { label: 'pd_dv', sym: 'ΔV = V_{DD} \\cdot r', num: `${q(v.V, 'V')} \\cdot ${pct(v.rp)}`, res: q(r.dV, 'V') },
    { label: 'pd_di', sym: 'ΔI = I_{max} \\cdot s', num: `${q(v.I, 'A')} \\cdot ${pct(v.st)}`, res: q(r.dI, 'A') },
    { label: 'pd_target', sym: 'Z_T = \\frac{ΔV}{ΔI}', num: `\\frac{${q(r.dV, 'V')}}{${q(r.dI, 'A')}}`, res: q(r.zTarget, 'Ω') },
    { label: 'pd_bulk', sym: 'C_{bulk} = \\frac{1}{2π \\cdot f_{reg} \\cdot Z_T}', num: `\\frac{1}{2π \\cdot ${q(r.fReg, 'Hz')} \\cdot ${q(r.zTarget, 'Ω')}}`, res: q(r.bulk, 'F') },
    plane && { label: 'pd_planeC', sym: 'C_{plane} = \\frac{ε_0 \\cdot ε_r \\cdot A}{d}',
      num: `\\frac{${tx(`${fmt(8.854, 4)} pF/m`)} \\cdot ${tx(fmt(v.pe, 4))} \\cdot ${tx(`${fmt(v.pa, 4)} mm²`)}}{${tx(`${fmt(v.pg, 4)} mm`)}}`, res: q(r.planeC, 'F') },
    // The note on how the frequency is found goes where the frequency first appears.
    ...(bank ? act.map(({ g, k, z }, i) => ({
      labelRaw: t('pd_zAt', { n: k, f: si(r.fAtMax, 'Hz') }),
      sym: `Z_${k} = ESR_${k} + j \\cdot (2π f \\cdot ESL_${k} − \\frac{1}{2π f \\cdot C_${k}})`,
      num: `${q(g.esr, 'Ω')} + j \\cdot (2π \\cdot ${f} \\cdot ${q(g.esl, 'H')} − \\frac{1}{2π \\cdot ${f} \\cdot ${q(g.c, 'F')}})`,
      res: zc(z),
      note: i === 0 ? 'pd_scanNote' : undefined,
    })) : []),
    bank && { label: 'pd_zmax', sym: `|Z_{bank}| = |\\frac{1}{${termsSym.join(' + ')}}|`, num: `|\\frac{1}{${termsNum.join(' + ')}}|`, res: q(r.zmax, 'Ω'),
      note: act.length ? undefined : 'pd_scanNote' },
  ], {
    note: 'pd_note',
    where: [['V_{DD}', 'pd_vdd', 'V'], ['r', 'pd_ripple', 'rp'], ['I_{max}', 'pd_imax', 'I'], ['s', 'pd_step', 'st'], ['f_{reg}', 'pd_freg', 'fr'],
      ...(bank && act.length ? [['n_i', 'pd_n'], ['C_i', 'pd_c'], ['ESR_i', 'pd_esr'], ['ESL_i', 'pd_esl']] : []),
      plane && ['A', 'pd_planeArea', 'pa'], plane && ['d', 'pd_planeGap', 'pg'], plane && ['ε_r', 'pd_planeEr', 'pe']],
    refs: ['L. Smith et al., “Power distribution system design methodology”, IEEE 1999', 'E. Bogatin, Signal and Power Integrity — Simplified'],
  });
}

export default {
  id: 'pdn',
  strings,
  sections: [
    {
      title: 'pd_target',
      fields: [
        // Defaults: a 3.3 V / 2 A rail that the default capacitor bank below meets.
        { key: 'V', type: 'number', label: 'pd_vdd', default: 3.3, units: ['V'],
          presets: [0.8, 1.0, 1.2, 1.8, 3.3, 5].map((x) => ({ label: `${x} V`, value: x })) },
        { key: 'rp', type: 'number', label: 'pd_ripple', default: 3, units: ['pct'], max: 100, info: 'pd_rippleInfo' },
        { key: 'I', type: 'number', label: 'pd_imax', default: 2, units: ['A'] },
        { key: 'st', type: 'number', label: 'pd_step', default: 50, units: ['pct'], max: 100, info: 'pd_stepInfo' },
        { key: 'fr', type: 'number', label: 'pd_freg', default: 100, units: ['kHz', 'MHz'], info: 'pd_fregInfo' },
        { key: 'fm', type: 'number', label: 'pd_fmax', default: 100, units: ['MHz', 'GHz'], info: 'pd_fmaxInfo' },
      ],
    },
    ...GROUP_DEFAULTS.map(groupSection),
    {
      title: 'sectionPlane',
      collapsible: true,
      optional: true,
      fields: [
        { key: 'pa', type: 'number', label: 'pd_planeArea', default: 0, units: ['mm2'], valid: 'nonneg' },
        { key: 'pg', type: 'number', label: 'pd_planeGap', default: 0.1, units: ['mm'] },
        { key: 'pe', type: 'number', label: 'pd_planeEr', default: 4.3, min: 1 },
      ],
    },
  ],

  compute(v, u) {
    const tz = targetImpedance({ vdd: v.V, ripplePct: v.rp, iMax: v.I, stepPct: v.st });
    const groups = [0, 1, 2].map((i) => ({
      c: v[`c${i}`] * C_MUL[u[`c${i}`]], esr: v[`r${i}`] * 1e-3, esl: v[`l${i}`] * 1e-9, n: v[`n${i}`],
    }));
    const planeC = v.pa > 0 ? planeCapacitance(v.pa, v.pg, v.pe) : 0;
    const fReg = v.fr * (u.fr === 'MHz' ? 1e6 : 1e3);
    const fMax = v.fm * (u.fm === 'GHz' ? 1e9 : 1e6);
    const sweep = sweepBank(groups, { fMin: Math.min(1e3, fReg / 10), fMax: Math.max(1e9, fMax * 2), planeC, zTarget: tz.zTarget });
    let zmax = 0;
    let fAtMax = fReg;
    for (let i = 0; i <= 200; i++) {
      const f = fReg * (fMax / fReg) ** (i / 200);
      const z = bankZ(f, groups, planeC);
      if (z > zmax) { zmax = z; fAtMax = f; }
    }
    const totalC = groups.reduce((s, g) => s + (g.n > 0 ? g.c * g.n : 0), 0) + planeC;
    // Complex impedance of one capacitor of each populated group at that frequency (for the steps).
    const zAtMax = groups.map((g) => (g.n > 0 && g.c > 0 ? capZ(fAtMax, g) : null));
    return {
      ok: true, ...tz, groups, planeC, fReg, fMax, sweep, zmax, fAtMax, zAtMax, totalC,
      bulk: bulkCapacitance(tz.zTarget, fReg),
    };
  },

  render(r, v) {
    const main = heroes([
      ['pd_target', siHtml(r.zTarget, 'Ω')],
      ['pd_bulk', siHtml(r.bulk, 'F')],
    ]);
    const chart = logLogChart({
      series: r.sweep.points, hline: r.zTarget, xUnit: 'Hz', yUnit: 'Ω', label: t('pd_chart'),
    });
    const legend = `<div class="legend"><span><i></i>${esc(t('pd_legendZ'))}</span><span><i class="t"></i>${esc(t('pd_legendT'))}</span></div>`;
    return main
      + worked(r, v)
      + block('pd_chart', chart + legend)
      + block('pd_checks', checks([
        [r.zmax <= r.zTarget, esc(t('pd_okBand')), `${esc(t('pd_zmax'))}: ${esc(si(r.zmax, 'Ω'))} @ ${esc(si(r.fAtMax, 'Hz'))}`],
        [r.totalC >= r.bulk, esc(t('pd_okBulk')), `${esc(si(r.totalC, 'F'))} / ${esc(si(r.bulk, 'F'))}`],
      ]))
      + block('results', rows([
        ['pd_dv', si(r.dV, 'V')],
        ['pd_di', si(r.dI, 'A')],
        ...r.groups.map((g, i) => g.n > 0 && [t('pd_srf', { n: i + 1 }), si(srf(g), 'Hz'), false, true]),
        r.planeC > 0 && ['pd_planeC', si(r.planeC, 'F')],
        ['pd_band', r.sweep.band ? `${si(r.sweep.band[0], 'Hz')} – ${si(r.sweep.band[1], 'Hz')}` : esc(t('pd_none'))],
        r.sweep.worst && ['pd_worst', `${si(r.sweep.worst[1], 'Ω')} @ ${si(r.sweep.worst[0], 'Hz')}`],
      ]));
  },
};
