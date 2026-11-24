import { combine } from '../engine/passives.js';
import { nearestStandard } from '../engine/eseries.js';
import { heroes, rows, block, formulaBlock, invalid } from '../ui/calculator.js';
import { si, siHtml, fmt } from '../ui/format.js';

const strings = {
  tr: {
    cb_kind: 'Bileşen',
    cb_R: 'Direnç',
    cb_C: 'Kondansatör',
    cb_L: 'Bobin',
    cb_v: '{n}. değer',
    cb_series: 'Seri eşdeğer',
    cb_parallel: 'Paralel eşdeğer',
    cb_count: 'Kullanılan değer sayısı',
    cb_e24s: 'Seri eşdeğere en yakın E24',
    cb_e24p: 'Paralel eşdeğere en yakın E24',
    cb_note: 'Direnç ve bobinde seri bağlantı değerleri toplar, paralel bağlantı terslerini toplar; kondansatörde tersidir. Bobinlerde karşılıklı endüktans (kuplaj) ihmal edilir: bobinleri birbirinden uzak veya dik yerleştirin. Paralel eşdeğer her zaman en küçük değerden küçüktür.',
    err_values: 'En az bir değer girin.',
  },
  en: {
    cb_kind: 'Component',
    cb_R: 'Resistor',
    cb_C: 'Capacitor',
    cb_L: 'Inductor',
    cb_v: 'Value {n}',
    cb_series: 'Series equivalent',
    cb_parallel: 'Parallel equivalent',
    cb_count: 'Values used',
    cb_e24s: 'Nearest E24 to the series value',
    cb_e24p: 'Nearest E24 to the parallel value',
    cb_note: 'For resistors and inductors, series adds the values and parallel adds their reciprocals; capacitors are the other way round. Mutual inductance (coupling) between inductors is ignored: place them apart or at right angles. A parallel equivalent is always smaller than the smallest value.',
    err_values: 'Enter at least one value.',
  },
};
const UNIT = { R: 'Ω', C: 'F', L: 'H' };
for (const l of ['tr', 'en']) {
  for (let i = 1; i <= 6; i++) {
    for (const [k, u] of Object.entries(UNIT)) strings[l][`cb_v${i}_${k}`] = `${strings[l].cb_v.replace('{n}', i)} (${u})`;
  }
}
const DEFAULTS = ['10k', '10k', '4k7', '', '', ''];

export default {
  id: 'combine',
  strings,
  sections: [
    {
      title: 'sectionSetup',
      fields: [
        { key: 'k', type: 'choice', label: 'cb_kind', default: 'R',
          options: ['R', 'C', 'L'].map((x) => ({ value: x, label: `cb_${x}` })) },
      ],
    },
    {
      title: 'sectionInputs',
      fields: DEFAULTS.map((d, i) => ({
        key: `v${i + 1}`, type: 'number', label: (v) => `cb_v${i + 1}_${v.k}`, default: d, si: true, optional: i > 0,
        hint: i === 0 ? undefined : false,
      })),
    },
  ],

  compute(v) {
    const values = [1, 2, 3, 4, 5, 6].map((i) => v[`v${i}`]);
    return { ...combine(v.k, values), kind: v.k };
  },

  render(r) {
    if (!r.ok) return invalid(r.errors);
    const u = UNIT[r.kind];
    return heroes([['cb_series', siHtml(r.series, u)], ['cb_parallel', siHtml(r.parallel, u)]])
      + block('results', rows([
        ['cb_count', String(r.n)],
        r.kind === 'R' && ['cb_e24s', si(nearestStandard(r.series, 'E24').nearest, 'Ω')],
        r.kind === 'R' && ['cb_e24p', si(nearestStandard(r.parallel, 'E24').nearest, 'Ω')],
      ]))
      + formulaBlock([
        'R, L:  series = Σ x_i        parallel = 1 / Σ (1/x_i)',
        'C:     series = 1 / Σ (1/C_i)   parallel = Σ C_i',
      ], 'cb_note');
  },
};
