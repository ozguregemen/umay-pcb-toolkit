import { planarInductor, SHAPES } from '../engine/inductor.js';
import { toMm } from '../engine/units.js';
import { heroes, rows, block, formulaBlock, messages, invalid } from '../ui/calculator.js';
import { fmt, fixed, si, siHtml } from '../ui/format.js';

const strings = {
  tr: {
    pi_shape: 'Şekil',
    sh_square: 'Kare', sh_hexagonal: 'Altıgen', sh_octagonal: 'Sekizgen', sh_circular: 'Dairesel',
    pi_n: 'Sarım sayısı (n)',
    pi_w: 'İz genişliği (w)',
    pi_s: 'Sarımlar arası boşluk (s)',
    pi_dout: 'Dış çap (d_out)',
    pi_doutInfo: 'Kare için dış kenar uzunluğu, çokgenler için karşılıklı kenarlar arası mesafe.',
    pi_t: 'Bakır kalınlığı',
    pi_lSheet: 'Endüktans (akım tabakası)',
    pi_lWheeler: 'Endüktans (değiştirilmiş Wheeler)',
    pi_din: 'İç çap (d_in)',
    pi_davg: 'Ortalama çap',
    pi_fill: 'Doluluk oranı (ρ)',
    pi_len: 'Toplam iz uzunluğu (yaklaşık)',
    pi_rdc: 'DC direnç (25 °C)',
    pi_note: 'Mohan ve arkadaşlarının (1999) ifadeleri, ölçümlerle tipik olarak %2–3 içinde uyumludur. Spiralin altındaki/üstündeki bakır düzlemler (girdap akımları) endüktansı belirgin biçimde düşürür; spiralin altında düzlem bırakmayın. İç uçtan dışarı çıkış için bir köprü (via + alt katman) gerekir.',
    err_turns: 'Sarım sayısı en az 1 olmalı.',
    err_width: 'Genişlik sıfırdan büyük olmalı.',
    err_space: 'Boşluk sıfırdan büyük olmalı.',
    err_outer: 'Dış çap sıfırdan büyük olmalı.',
    err_tooManyTurns: 'Bu dış çapa bu kadar sarım sığmıyor (iç çap ≤ 0).',
    warn_fillLow: 'Doluluk oranı çok düşük; formüllerin doğruluğu azalır.',
    warn_innerSmall: 'İç çap çok küçük; içteki sarımlar endüktansa az katkı yapar ve direnci artırır.',
  },
  en: {
    pi_shape: 'Shape',
    sh_square: 'Square', sh_hexagonal: 'Hexagonal', sh_octagonal: 'Octagonal', sh_circular: 'Circular',
    pi_n: 'Number of turns (n)',
    pi_w: 'Trace width (w)',
    pi_s: 'Spacing between turns (s)',
    pi_dout: 'Outer diameter (d_out)',
    pi_doutInfo: 'Outer side length for a square; across-flats distance for polygons.',
    pi_t: 'Copper thickness',
    pi_lSheet: 'Inductance (current sheet)',
    pi_lWheeler: 'Inductance (modified Wheeler)',
    pi_din: 'Inner diameter (d_in)',
    pi_davg: 'Average diameter',
    pi_fill: 'Fill ratio (ρ)',
    pi_len: 'Total trace length (approx.)',
    pi_rdc: 'DC resistance (25 °C)',
    pi_note: 'The expressions by Mohan et al. (1999) typically agree with measurements within 2–3 %. Copper planes above or below the spiral (eddy currents) lower the inductance markedly; keep planes away from under the spiral. Bringing out the inner end needs a bridge (via + other layer).',
    err_turns: 'Turns must be at least 1.',
    err_width: 'Width must be greater than zero.',
    err_space: 'Spacing must be greater than zero.',
    err_outer: 'Outer diameter must be greater than zero.',
    err_tooManyTurns: 'This many turns do not fit in this outer diameter (inner diameter ≤ 0).',
    warn_fillLow: 'Very low fill ratio; the formulas lose accuracy.',
    warn_innerSmall: 'Very small inner diameter; inner turns add little inductance but more resistance.',
  },
};

const LEN = ['mm', 'mil'];

function diagram(v) {
  const n = Math.max(1, Math.min(8, Math.round(v.n) || 1));
  const pts = [];
  let x = 40; let y = 20; let size = 120; const step = 120 / (2 * n + 1);
  for (let i = 0; i < n; i++) {
    pts.push([x, y], [x + size, y], [x + size, y + size], [x + step, y + size]);
    x += step; y += step; size -= 2 * step;
    pts.push([x, y]);
  }
  return `<svg class="diagram" viewBox="0 0 200 160" role="img" aria-label="spiral">
    <polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="var(--cu)" stroke-width="5" stroke-linejoin="round"/>
  </svg>`;
}

export default {
  id: 'inductor',
  strings,
  sections: [
    {
      title: 'sectionInputs',
      fields: [
        { key: 'sh', type: 'select', label: 'pi_shape', default: 'square', options: SHAPES.map((s) => ({ value: s, label: `sh_${s}` })) },
        { key: 'n', type: 'number', label: 'pi_n', default: 5, min: 1, step: 1 },
        { key: 'w', type: 'number', label: 'pi_w', default: 0.2, units: LEN, pref: 'length' },
        { key: 's', type: 'number', label: 'pi_s', default: 0.2, units: LEN, pref: 'length' },
        { key: 'd', type: 'number', label: 'pi_dout', default: 10, units: LEN, info: 'pi_doutInfo' },
        { key: 't', type: 'number', label: 'pi_t', default: 35, units: ['um'],
          presets: [{ label: '½ oz', value: 17 }, { label: '1 oz', value: 35 }, { label: '2 oz', value: 70 }] },
      ],
    },
  ],

  diagram,

  compute(v, u) {
    return planarInductor({
      shape: v.sh, turns: v.n, widthMm: toMm(v.w, u.w), spaceMm: toMm(v.s, u.s), outerMm: toMm(v.d, u.d), thicknessUm: v.t,
    });
  },

  render(r) {
    if (!r.ok) return invalid(r.errors);
    return heroes([
      ['pi_lSheet', siHtml(r.lSheet, 'H')],
      r.lWheeler && ['pi_lWheeler', siHtml(r.lWheeler, 'H')],
    ])
      + messages('warn', r.warnings)
      + block('results', rows([
        ['pi_din', `${fixed(r.dInMm, 3)} mm`],
        ['pi_davg', `${fixed(r.dAvgMm, 3)} mm`],
        ['pi_fill', fmt(r.fill, 3)],
        ['pi_len', `${fmt(r.lengthMm, 4)} mm`],
        ['pi_rdc', si(r.rDc, 'Ω')],
      ]))
      + formulaBlock([
        'd_in = d_out − 2·n·w − 2·(n−1)·s',
        'd_avg = (d_out + d_in)/2,   ρ = (d_out − d_in)/(d_out + d_in)',
        'Wheeler:  L = K1·µ0·n²·d_avg / (1 + K2·ρ)',
        'Sheet:    L = µ0·n²·d_avg·c1/2 · [ln(c2/ρ) + c3·ρ + c4·ρ²]',
      ], 'pi_note', ['S. S. Mohan et al., IEEE JSSC 34(10), 1999']);
  },
};
