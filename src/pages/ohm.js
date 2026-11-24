import { ohmsLaw, OHM_PAIRS, powerRating } from '../engine/circuit.js';
import { heroes, rows, block, formulaBlock } from '../ui/calculator.js';
import { si, siHtml, fmt, esc } from '../ui/format.js';
import { svg, twoTerm, wire, arrow, text } from '../ui/svg.js';
import { t } from '../i18n.js';

const strings = {
  tr: {
    ohm_pair: 'Bilinen iki büyüklük',
    ohm_pairInfo: 'Değerini bildiğiniz iki büyüklüğü seçin; diğer ikisi hesaplanır. Tüm alanlarda SI önekleri kullanılabilir (ör. 4k7 Ω, 250m A).',
    ohm_given: 'girilen',
    ohm_calc: 'hesaplanan',
    ohm_conductance: 'İletkenlik G = 1/R',
    ohm_rating: 'Önerilen direnç gücü (2× pay)',
    ohm_ratingNone: '2 W üstü — güç direnci gerekir',
    ohm_details: 'Ayrıntılar',
    ohm_note: 'Hesap DC ya da RMS değerler içindir. Direnç güç sınıfı, harcanan gücün en az iki katını karşılayan ilk standart değerdir (1/16 … 2 W).',
    ohm_dg: 'Ohm yasası devresi: gerilim kaynağı ve direnç; girilen değerler düz, hesaplananlar renkli yazılır',
  },
  en: {
    ohm_pair: 'Two known values',
    ohm_pairInfo: 'Pick the two quantities you know; the other two are calculated. All fields accept SI prefixes (e.g. 4k7 Ω, 250m A).',
    ohm_given: 'given',
    ohm_calc: 'calculated',
    ohm_conductance: 'Conductance G = 1/R',
    ohm_rating: 'Suggested resistor rating (2× margin)',
    ohm_ratingNone: 'above 2 W — use a power resistor',
    ohm_details: 'Details',
    ohm_note: 'Valid for DC or RMS values. The resistor rating is the first standard value covering at least twice the dissipation (1/16 … 2 W).',
    ohm_dg: 'Ohm’s law circuit: voltage source and resistor; given values in plain text, calculated values in colour',
  },
};

const PAIR_LABEL = { VI: 'V · I', VR: 'V · R', IR: 'I · R', PV: 'P · V', PI: 'P · I', PR: 'P · R' };
const has = (q) => (v) => v.pair.includes(q);

const ratingLabel = (w) => {
  if (w === null) return esc(t('ohm_ratingNone'));
  return w < 1 ? `1/${Math.round(1 / w)} W` : `${fmt(w)} W`;
};

const UNIT = { V: 'V', I: 'A', R: 'Ω', P: 'W' };
const val = (x, unit) => (Number.isFinite(x) && x > 0 ? si(x, unit, 3) : '?');

/**
 * Live schematic: source V drives current I through R, which dissipates P.
 * The two given quantities are drawn in plain text, the calculated two in the
 * accent colour, each tagged "given" / "calculated" like the result cards.
 */
function diagram(v, u, r) {
  const given = (q) => v.pair.includes(q);
  const num = (q) => (r ? r[q] : given(q) ? v[q] : NaN);
  const label = (q, x, y, anchor) => {
    const g = given(q);
    return text(x, y, `${q} = ${val(num(q), UNIT[q])}`, { cls: g ? 'name' : 'val', anchor })
      + text(x, y + 14, t(g ? 'ohm_given' : 'ohm_calc'), { cls: 'lbl', anchor });
  };
  const xs = 130; // source
  const xr = 300; // resistor
  const yt = 22;
  const yb = 132;
  const body = twoTerm('V', xs, yt, xs, yb)
    + wire([xs, yt], [xr, yt]) + twoTerm('R', xr, yt, xr, yb) + wire([xs, yb], [xr, yb])
    + arrow(180, yt + 16, 250, yt + 16, { cls: 'flow', headCls: 'arrow flow' })
    + label('V', xs - 24, yt + 51, 'end')
    + label('I', 215, yt + 40, 'middle')
    + label('R', xr + 18, yt + 36, 'start')
    + label('P', xr + 18, yt + 76, 'start')
    + text(160, yb + 32, 'V = I · R', { cls: 'sym' })
    + text(280, yb + 32, 'P = V · I', { cls: 'sym' });
  return svg(440, yb + 42, body, t('ohm_dg'), { wide: true });
}

export default {
  diagram,
  id: 'ohm',
  strings,
  sections: [
    {
      title: 'sectionSetup',
      fields: [
        { key: 'pair', type: 'choice', label: 'ohm_pair', default: 'VI', info: 'ohm_pairInfo',
          options: OHM_PAIRS.map((p) => ({ value: p, label: PAIR_LABEL[p], raw: true })) },
      ],
    },
    {
      title: 'sectionInputs',
      fields: [
        { key: 'V', type: 'number', label: 'voltage', default: 12, units: ['V'], si: true, show: has('V'),
          presets: [3.3, 5, 12, 24, 230].map((x) => ({ label: `${x} V`, value: x })) },
        { key: 'I', type: 'number', label: 'current', default: '10m', units: ['A'], si: true, show: has('I') },
        { key: 'R', type: 'number', label: 'resistance', default: '1k2', units: ['ohm'], si: true, show: has('R') },
        { key: 'P', type: 'number', label: 'power', default: '120m', units: ['W'], si: true, show: has('P') },
      ],
    },
  ],

  compute(v) {
    const r = ohmsLaw(v.pair, v);
    return { ...r, G: 1 / r.R, rating: powerRating(r.P) };
  },

  render(r, v) {
    const sub = (q) => esc(t(v.pair.includes(q) ? 'ohm_given' : 'ohm_calc'));
    return heroes([
      ['voltage', siHtml(r.V, 'V'), sub('V')],
      ['current', siHtml(r.I, 'A'), sub('I')],
      ['resistance', siHtml(r.R, 'Ω'), sub('R')],
      ['power', siHtml(r.P, 'W'), sub('P')],
    ])
      + block('ohm_details', rows([
        ['ohm_conductance', si(r.G, 'S')],
        ['ohm_rating', ratingLabel(r.rating)],
      ]))
      + formulaBlock([
        'V = I · R',
        'I = V / R = P / V = √(P / R)',
        'R = V / I = V² / P = P / I²',
        'P = V · I = I² · R = V² / R',
      ], 'ohm_note', ['Ohm’s law; Joule’s law (P = V · I)', 'Horowitz & Hill, The Art of Electronics, 3rd ed., ch. 1']);
  },
};
