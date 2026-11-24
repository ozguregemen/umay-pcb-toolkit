import { combine } from '../engine/passives.js';
import { nearestStandard } from '../engine/eseries.js';
import { heroes, rows, block, formulaBlock, invalid } from '../ui/calculator.js';
import { si, siHtml, fmt } from '../ui/format.js';
import { svg, twoTerm, wire, node, terminal, text } from '../ui/svg.js';
import { t } from '../i18n.js';

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
    cb_dg: 'Girilen değerlerin seri zincir ve paralel merdiven olarak bağlanışı ve eşdeğerleri',
    cb_dgSeries: 'Seri bağlı',
    cb_dgParallel: 'Paralel bağlı',
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
    cb_dg: 'The entered values connected as a series chain and as a parallel ladder, with their equivalents',
    cb_dgSeries: 'In series',
    cb_dgParallel: 'In parallel',
  },
};
const UNIT = { R: 'Ω', C: 'F', L: 'H' };
for (const l of ['tr', 'en']) {
  for (let i = 1; i <= 6; i++) {
    for (const [k, u] of Object.entries(UNIT)) strings[l][`cb_v${i}_${k}`] = `${strings[l].cb_v.replace('{n}', i)} (${u})`;
  }
}
const DEFAULTS = ['10k', '10k', '4k7', '', '', ''];
const val = (x, unit) => (Number.isFinite(x) && x > 0 ? si(x, unit, 3) : '?');

/** "R1 + R2 + R3" (long lists shortened to "R1 + R2 + … + R6"). */
function sumOf(names, f = (s) => s) {
  const parts = names.length > 3 ? [names[0], names[1], '…', names[names.length - 1]] : names;
  return parts.map((s) => (s === '…' ? s : f(s))).join(' + ');
}

/**
 * Live diagram: the entered values (field number kept in the designator)
 * drawn once as a series chain and once as a parallel ladder, with the
 * equivalent of each connection.
 */
function diagram(v, u, r) {
  const k = v.k;
  const unit = UNIT[k];
  let items = [1, 2, 3, 4, 5, 6].map((i) => ({ i, x: v[`v${i}`] })).filter((o) => o.x > 0);
  if (!items.length) items = [{ i: 1, x: NaN }, { i: 2, x: NaN }];
  const n = items.length;
  const names = items.map((o) => `${k}${o.i}`);
  const sum = sumOf(names);
  const recip = n > 1 ? `1 / (${sumOf(names, (s) => `1/${s}`)})` : names[0];
  const eq = `${k}eq`;
  const head = (y, title, formula, x) => text(20, y, t(title), { cls: 'title', anchor: 'start' })
    + text(214, y, formula, { cls: 'lbl' })
    + text(420, y, `${eq} = ${val(x, unit)}`, { cls: 'val', anchor: 'end' });

  // Series chain
  const ys = 52;
  const xa = 34;
  const xb = 406;
  const slot = Math.min(92, (xb - xa - 24) / n);
  const s0 = (xa + xb) / 2 - (slot * n) / 2;
  let body = head(18, 'cb_dgSeries', k === 'C' ? recip : sum, r?.series)
    + terminal(xa, ys) + wire([xa, ys], [s0, ys]);
  items.forEach((o, j) => {
    body += twoTerm(k, s0 + j * slot, ys, s0 + (j + 1) * slot, ys, { name: names[j], value: val(o.x, unit) });
  });
  body += wire([s0 + n * slot, ys], [xb, ys]) + terminal(xb, ys);

  // Parallel ladder
  const yt = 126;
  const yb = 192;
  const p0 = n > 1 ? 80 : 150;
  const sp = n > 1 ? Math.min(90, 290 / (n - 1)) : 0;
  const xl = p0 + (n - 1) * sp;
  body += head(100, 'cb_dgParallel', k === 'C' ? sum : recip, r?.parallel)
    + terminal(xa, yt) + terminal(xa, yb) + wire([xa, yt], [xl, yt]) + wire([xa, yb], [xl, yb]);
  // Tight ladders (5–6 values) put each value under the bottom rail.
  const compact = n > 1 && sp < 72;
  items.forEach((o, j) => {
    const x = p0 + j * sp;
    body += compact
      ? twoTerm(k, x, yt, x, yb, { name: names[j] }) + text(x, yb + 17, val(o.x, unit), { cls: 'val' })
      : twoTerm(k, x, yt, x, yb, { name: names[j], value: val(o.x, unit) });
    if (j < n - 1) body += node(x, yt) + node(x, yb);
  });
  return svg(440, compact ? 214 : 204, body, t('cb_dg'), { wide: true });
}

export default {
  diagram,
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
