import { SERIES, TOLERANCE, decadeValues, nearestStandard, bestSeriesPair, bestParallelPair } from '../engine/eseries.js';
import { heroes, rows, block, formulaBlock, messages } from '../ui/calculator.js';
import { fixed, si, siHtml, esc } from '../ui/format.js';
import { t, locale } from '../i18n.js';
import { svg, rect, path, text, arrow } from '../ui/svg.js';

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
    es_dgAria: 'Bir dekadın log ölçekli sayı doğrusu: serinin standart değerleri çentik olarak, hedef değer ok ile, alttaki ve üstteki en yakın değerler ve bunların tolerans bantları',
    es_dgScale: 'log ölçek · bir dekad',
    es_dgTarget: 'hedef',
    es_dgBand: 'tolerans bandı',
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
    es_dgAria: 'Log-scale number line of one decade: the standard values of the series as ticks, the target as an arrow, the nearest values below and above and their tolerance bands',
    es_dgScale: 'log scale · one decade',
    es_dgTarget: 'target',
    es_dgBand: 'tolerance band',
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
const r1 = (x) => Math.round(x * 10) / 10;

/**
 * Live number line of one decade on a log scale (where E-series values are
 * evenly spaced): every standard value as a tick, the target, the nearest
 * values below/above and the tolerance band of each.
 */
function diagram(v, u, r) {
  const series = v.ser;
  const vals = decadeValues(series);
  const tol = TOLERANCE[series].pct / 100;
  const XL = 48; const XR = 392; const AY = 132;
  const X = (m) => XL + Math.log10(m) * (XR - XL);
  const tolLabel = `${TOLERANCE[series].over ? '> ' : ''}${tolPct(series)}`;
  let b = '';
  let decTxt = '1 – 10';
  if (r) {
    const dec = 10 ** Math.floor(Math.log10(v.x) + 1e-12);
    decTxt = `${si(dec, 'Ω', 3)} – ${si(dec * 10, 'Ω', 3)}`;
    const mt = v.x / dec; const mb = r.below / dec; const ma = r.above / dec;
    const nearB = r.nearest === r.below;
    // Tolerance bands (overlap shows darker).
    const band = (m) => {
      const x1 = Math.max(XL, X(m * (1 - tol))); const x2 = Math.min(XR, X(m * (1 + tol)));
      return rect(x1, AY - 18, Math.max(x2 - x1, 1), 18, 'zone') + rect(x1, AY - 18, Math.max(x2 - x1, 1), 18, 'dimline');
    };
    b += band(mb) + (r.exact ? '' : band(ma));
    b += path(`M${r1(X(mb))},${AY - 26}V${AY + 6}`, nearB ? 'wire hi' : 'wire');
    if (!r.exact) b += path(`M${r1(X(ma))},${AY - 26}V${AY + 6}`, nearB ? 'wire' : 'wire hi');
    // Target marker.
    const xt = X(mt);
    b += arrow(xt, AY - 64, xt, AY - 2, { cls: 'flow', headCls: 'arrow flow' });
    const tl = `${t('es_dgTarget')} ${si(v.x, 'Ω', 4)}`;
    const tw = tl.length * 6.6;
    b += text(Math.min(436 - tw / 2, Math.max(4 + tw / 2, xt)), AY - 70, tl, { cls: 'val' });
    // Values and errors: below on the left of its tick, above on the right.
    const errB = pct(((r.below - v.x) / v.x) * 100);
    const errA = pct(((r.above - v.x) / v.x) * 100);
    const vb = si(r.below, 'Ω', 3); const va = si(r.above, 'Ω', 3);
    if (r.exact) {
      b += text(X(mb) + 5, AY - 44, vb, { cls: 'val', anchor: 'start' }) + text(X(mb) + 5, AY - 30, errB, { cls: 'okt', anchor: 'start' });
    } else {
      const wB = Math.max(vb.length, errB.length) * 6.6;
      const wA = Math.max(va.length, errA.length) * 6.6;
      let xB = X(mb) - 5; let aB = 'end';
      let xA = X(ma) + 5; let aA = 'start';
      if (xB - wB < 2) { xB = 2; aB = 'start'; xA = Math.max(xA, 2 + wB + 10); }
      if (xA + wA > 438) { xA = 438; aA = 'end'; xB = Math.min(xB, 438 - wA - 10); }
      b += text(xB, AY - 44, vb, { cls: nearB ? 'val' : 'name', anchor: aB }) + text(xB, AY - 30, errB, { cls: 'lbl', anchor: aB })
        + text(xA, AY - 44, va, { cls: nearB ? 'name' : 'val', anchor: aA }) + text(xA, AY - 30, errA, { cls: 'lbl', anchor: aA });
    }
  }
  // Axis, a tick per standard value, labels.
  b += path(`M${XL},${AY}H${XR}`, 'axis')
    + path(`${vals.map((m) => `M${r1(X(m))},${AY - 5}V${AY + 5}`).join('')}M${XR},${AY - 5}V${AY + 5}`, 'axis');
  if (vals.length <= 24) {
    vals.concat(10).forEach((m, i) => {
      b += text(X(m), AY + 17 + (vals.length > 12 && i % 2 ? 12 : 0), m === 10 ? '10' : fixed(m, 1), { cls: 'lbl' });
    });
  } else {
    for (let m = 1; m <= 10; m++) b += text(X(m), AY + 17, String(m), { cls: 'lbl' });
  }
  b += rect(XL, 174, 14, 10, 'zone') + rect(XL, 174, 14, 10, 'dimline') + text(XL + 20, 183, `${tolLabel} ${t('es_dgBand')}`, { cls: 'lbl', anchor: 'start' });
  b += text(8, 16, `${series} · ${decTxt}`, { cls: 'title', anchor: 'start' })
    + text(432, 16, t('es_dgScale'), { cls: 'title', anchor: 'end' });
  return svg(440, 192, b, t('es_dgAria'), { wide: true });
}

export default {
  diagram,
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
