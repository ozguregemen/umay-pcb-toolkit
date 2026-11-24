import { SERIES, TOLERANCE, decadeValues, nearestStandard, bestSeriesPair, bestParallelPair } from '../engine/eseries.js';
import { heroes, rows, block, formulaBlock, messages } from '../ui/calculator.js';
import { fixed, si, siHtml, esc } from '../ui/format.js';
import { t, locale } from '../i18n.js';

const strings = {
  tr: {
    es_target: 'Hedef değer',
    es_series: 'Seri',
    es_seriesInfo: 'E-serileri direnç ve kondansatör değerleri için kullanılır. Seri sıklaştıkça (E48, E96, E192) daha dar toleranslı parçalar gerekir.',
    es_nearest: 'En yakın değer',
    es_below: 'Alttaki değer',
    es_above: 'Üstteki değer',
    es_tolerance: 'Serinin toleransı',
    es_tolOver: '±%20’den geniş',
    es_combosTitle: 'İki dirençli kombinasyonlar ({series})',
    es_seriesPair: 'Seri bağlı',
    es_parallelPair: 'Paralel bağlı',
    es_result: 'sonuç',
    es_none: 'bulunamadı',
    es_decadeTitle: '{series} değerleri (bir dekad)',
    es_note: 'Kombinasyonlar aynı seriden seçilir ve iki değerin oranı en fazla 100 ile sınırlıdır. Eşit hatada değerleri birbirine daha yakın olan çift tercih edilir. Kombinasyon hatasına parçaların kendi toleransı ayrıca eklenir.',
    ok_es_exact: 'Hedef, {series} serisinde standart bir değer.',
  },
  en: {
    es_target: 'Target value',
    es_series: 'Series',
    es_seriesInfo: 'E-series are used for resistor and capacitor values. Denser series (E48, E96, E192) call for tighter-tolerance parts.',
    es_nearest: 'Closest value',
    es_below: 'Nearest below',
    es_above: 'Nearest above',
    es_tolerance: 'Series tolerance',
    es_tolOver: 'wider than ±20%',
    es_combosTitle: 'Two-resistor combinations ({series})',
    es_seriesPair: 'In series',
    es_parallelPair: 'In parallel',
    es_result: 'result',
    es_none: 'none found',
    es_decadeTitle: '{series} values (one decade)',
    es_note: 'Combinations use the same series and are limited to a value ratio of 100. On equal error the pair with closer values wins. The parts’ own tolerance adds to the combination error.',
    ok_es_exact: 'The target is a standard {series} value.',
  },
};

const pct = (x) => new Intl.NumberFormat(locale(), { style: 'percent', signDisplay: 'exceptZero', maximumSignificantDigits: 3 })
  .format(Math.abs(x) < 1e-9 ? 0 : x / 100);
const ohm = (x) => si(x, 'Ω');

/** Series tolerance as a locale percentage (±5% / ±%5). */
const tolPct = (s) => `±${new Intl.NumberFormat(locale(), { style: 'percent', maximumFractionDigits: 1 }).format(TOLERANCE[s].pct / 100)}`;
const tolText = (s) => (TOLERANCE[s].over ? t('es_tolOver') : tolPct(s));

function comboRow(label, pair, op) {
  if (!pair) return [label, esc(t('es_none'))];
  return [label, `${ohm(pair.a)} ${op} ${ohm(pair.b)}<br><small>${esc(t('es_result'))}: ${si(pair.value, 'Ω', 5)} (${pct(pair.errorPct)})</small>`];
}

/** One decade of the series as a 12-column grid, marking the bracketing values. */
function decadeTable(series, marks) {
  const vals = decadeValues(series);
  const digits = vals.length >= 48 ? 2 : 1;
  const cols = Math.min(12, vals.length);
  const body = [];
  for (let i = 0; i < vals.length; i += cols) {
    body.push(`<tr>${vals.slice(i, i + cols).map((m) => {
      const cls = Math.abs(m - marks.nearest) < 1e-9 ? 'hit' : marks.others.some((x) => Math.abs(m - x) < 1e-9) ? 'on-col' : '';
      return `<td${cls ? ` class="${cls}"` : ''}>${fixed(m, digits)}</td>`;
    }).join('')}</tr>`);
  }
  return `<div class="table-scroll"><table class="grid"><tbody>${body.join('')}</tbody></table></div>`;
}

const mantissa = (x) => x / 10 ** Math.floor(Math.log10(x) + 1e-12);

export default {
  id: 'eseries',
  strings,
  sections: [
    {
      title: 'sectionInputs',
      fields: [
        { key: 'x', type: 'number', label: 'es_target', default: '5k', units: ['ohm'], si: true },
        { key: 'ser', type: 'select', label: 'es_series', default: 'E12', info: 'es_seriesInfo',
          // Getter: the option label follows the current language when the form renders.
          options: SERIES.map((s) => ({ value: s, raw: true, get label() { return `${s} (${TOLERANCE[s].over ? '>' : ''}${tolPct(s)})`; } })) },
      ],
    },
  ],

  compute(v) {
    const near = nearestStandard(v.x, v.ser);
    return {
      ...near,
      exact: near.below === near.above,
      seriesPair: bestSeriesPair(v.x, v.ser),
      parallelPair: bestParallelPair(v.x, v.ser),
    };
  },

  render(r, v) {
    const series = v.ser;
    return heroes([
      ['es_nearest', siHtml(r.nearest, 'Ω'), `${pct(r.errorPct)} · ${esc(t('es_tolerance'))}: ${esc(tolText(series))}`],
      ['es_below', siHtml(r.below, 'Ω'), pct(((r.below - v.x) / v.x) * 100)],
      ['es_above', siHtml(r.above, 'Ω'), pct(((r.above - v.x) / v.x) * 100)],
    ])
      + (r.exact ? messages('ok', ['es_exact'], { es_exact: { series } }) : '')
      + block(t('es_combosTitle', { series }), rows([
        comboRow('es_seriesPair', r.seriesPair, '+'),
        comboRow('es_parallelPair', r.parallelPair, '∥'),
      ]), true)
      + block(t('es_decadeTitle', { series }), decadeTable(series, {
        nearest: mantissa(r.nearest),
        others: [mantissa(r.below), mantissa(r.above)],
      }), true)
      + formulaBlock([
        'closest:   min |R_std − R|,  error = (R_std − R) / R',
        'series:    R = Ra + Rb',
        'parallel:  R = Ra · Rb / (Ra + Rb)',
        'search:    all pairs from the series with max(Ra, Rb) / min(Ra, Rb) ≤ 100',
      ], 'es_note', ['IEC 60063:2015 — Preferred number series for resistors and capacitors']);
  },
};
