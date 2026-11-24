import { ledResistor } from '../engine/circuit.js';
import { TOLERANCE } from '../engine/eseries.js';
import { heroes, rows, block, formulaBlock, messages } from '../ui/calculator.js';
import { fmt, si, siHtml, esc } from '../ui/format.js';
import { svg, twoTerm, wire, node, ground, arrow, dimH, text } from '../ui/svg.js';
import { t, locale } from '../i18n.js';

const strings = {
  tr: {
    led_vs: 'Besleme gerilimi Vs',
    led_vf: 'LED ileri gerilimi Vf',
    led_vfInfo: 'Tipik değerler; gerçek Vf akıma, sıcaklığa ve üreticiye göre değişir. Modern InGaN yeşil, mavi ve beyaz LED’ler 2,8–3,4 V civarındadır. Veri sayfasındaki değeri esas alın.',
    led_red: 'Kırmızı 2,0 V',
    led_yellow: 'Sarı 2,1 V',
    led_green: 'Yeşil 2,2 V',
    led_blue: 'Mavi 3,0 V',
    led_white: 'Beyaz 3,1 V',
    led_ir: 'IR 1,3 V',
    led_if: 'LED akımı If',
    led_n: 'Seri bağlı LED sayısı',
    led_series: 'E-serisi',
    led_rRec: 'Önerilen direnç',
    led_rRecSub: '≥ R, akım hedefi aşmaz',
    led_iRec: 'Gerçek akım',
    led_rExact: 'Hesaplanan direnç',
    led_rNearest: 'En yakın standart değer',
    led_iNearest: 'En yakın değerle akım',
    led_drop: 'Direnç üzerindeki gerilim',
    led_pR: 'Direnç güç kaybı',
    led_rating: 'Önerilen direnç gücü (2× pay)',
    led_ratingNone: '2 W üstü',
    led_pLed: 'LED başına güç',
    led_pLeds: 'LED’lerin toplam gücü',
    led_pSupply: 'Kaynaktan çekilen güç',
    led_eff: 'Verim N·Vf / Vs',
    led_resistorTitle: 'Direnç',
    led_powerTitle: 'Güç',
    led_note: 'Önerilen değer, hesaplanan dirence eşit ya da ondan büyük ilk standart değerdir; böylece akım hedefi aşmaz. Güç sınıfı, harcanan gücün iki katını karşılayan ilk değerdir (1/16, 1/10, 1/8, 1/4, 1/2, 1, 2 W). Vf sabit kabul edilir.',
    warn_led_lowHeadroom: 'Direnç üzerinde yalnızca {v} kalıyor: akım, Vf toleransı ve sıcaklıkla belirgin biçimde değişir. Daha yüksek bir besleme ya da sabit akımlı sürücü düşünün.',
    warn_led_highCurrent: '{i}, tipik gösterge LED’lerinin 20–30 mA sınırının üzerinde; LED veri sayfasındaki en yüksek akımı kontrol edin.',
    warn_led_power: 'Direnç kaybı 1 W’ı aşıyor (2× payla 2 W’tan büyük güç sınıfı gerekir). Güç direnci kullanın, kaybı birkaç dirence bölün ya da anahtarlamalı LED sürücüsü düşünün.',
    warn_led_lowEff: 'Gücün yarısından fazlası dirençte ısıya dönüşüyor. Aynı beslemeye daha fazla LED’i seri bağlamak ya da anahtarlamalı sürücü kullanmak verimi artırır.',
    err_led_headroom: 'Besleme gerilimi LED’lerin toplam ileri geriliminden (N·Vf = {v}) büyük olmalı.',
    led_dg: 'LED devresi: Vs beslemesi, seri direnç ve seri bağlı LED’ler; gerilim düşümleri ve akım',
    led_dgNoHeadroom: 'Vs ≤ N·Vf: direnç için gerilim kalmıyor',
  },
  en: {
    led_vs: 'Supply voltage Vs',
    led_vf: 'LED forward voltage Vf',
    led_vfInfo: 'Typical values; the actual Vf depends on current, temperature and manufacturer. Modern InGaN green, blue and white LEDs are around 2.8–3.4 V. Use the datasheet value.',
    led_red: 'Red 2.0 V',
    led_yellow: 'Yellow 2.1 V',
    led_green: 'Green 2.2 V',
    led_blue: 'Blue 3.0 V',
    led_white: 'White 3.1 V',
    led_ir: 'IR 1.3 V',
    led_if: 'LED current If',
    led_n: 'LEDs in series',
    led_series: 'E-series',
    led_rRec: 'Recommended resistor',
    led_rRecSub: '≥ R, current stays at or below target',
    led_iRec: 'Actual current',
    led_rExact: 'Calculated resistance',
    led_rNearest: 'Nearest standard value',
    led_iNearest: 'Current with nearest value',
    led_drop: 'Voltage across resistor',
    led_pR: 'Resistor dissipation',
    led_rating: 'Recommended resistor rating (2× margin)',
    led_ratingNone: 'above 2 W',
    led_pLed: 'Power per LED',
    led_pLeds: 'Total LED power',
    led_pSupply: 'Power from supply',
    led_eff: 'Efficiency N·Vf / Vs',
    led_resistorTitle: 'Resistor',
    led_powerTitle: 'Power',
    led_note: 'The recommended value is the first standard value equal to or above the calculated resistance, so the current does not exceed the target. The power rating is the first one covering twice the dissipation (1/16, 1/10, 1/8, 1/4, 1/2, 1, 2 W). Vf is treated as constant.',
    warn_led_lowHeadroom: 'Only {v} is left across the resistor: the current will vary noticeably with Vf tolerance and temperature. Consider a higher supply or a constant-current driver.',
    warn_led_highCurrent: '{i} is above the 20–30 mA limit of typical indicator LEDs; check the maximum current in the LED datasheet.',
    warn_led_power: 'Resistor dissipation exceeds 1 W (a rating above 2 W is needed with 2× margin). Use a power resistor, split the loss across several resistors or consider a switching LED driver.',
    warn_led_lowEff: 'More than half of the power is turned into heat in the resistor. More LEDs in series on the same supply, or a switching driver, improves efficiency.',
    err_led_headroom: 'The supply voltage must exceed the total LED forward voltage (N·Vf = {v}).',
    led_dg: 'LED circuit: supply Vs, series resistor and LEDs in series with their voltage drops and the current',
    led_dgNoHeadroom: 'Vs ≤ N·Vf: no voltage is left for the resistor',
  },
};

/** Series tolerance as a locale percentage (±5% / ±%5). */
const tolPct = (s) => `±${new Intl.NumberFormat(locale(), { style: 'percent', maximumFractionDigits: 1 }).format(TOLERANCE[s].pct / 100)}`;
// Getter: the option label follows the current language when the form renders.
const SERIES_OPTS = ['E12', 'E24', 'E96'].map((s) => ({ value: s, raw: true, get label() { return `${s} (${tolPct(s)})`; } }));
const VF_PRESETS = [['led_red', 2.0], ['led_yellow', 2.1], ['led_green', 2.2], ['led_blue', 3.0], ['led_white', 3.1], ['led_ir', 1.3]];

const pctOf = (x) => new Intl.NumberFormat(locale(), { style: 'percent', maximumSignificantDigits: 3 }).format(x);
const ratingLabel = (w) => {
  if (w === null) return esc(t('led_ratingNone'));
  return w < 1 ? `1/${Math.round(1 / w)} W` : `${fmt(w)} W`;
};

const val = (x, unit) => (Number.isFinite(x) && x > 0 ? si(x, unit, 3) : '?');

/**
 * Live schematic: Vs → R → N LEDs → GND. Dimension brackets show how the supply
 * splits into VR and N·Vf; the resistor shows the recommended standard value.
 * More than three LEDs are drawn as LED, LED, …, LED.
 */
function diagram(v, u, r) {
  const n = Number.isInteger(v.n) && v.n >= 1 ? v.n : 1;
  const vLeds = n * v.vf;
  const xs = 56; // source
  const xc = 398; // right-hand return wire
  const yt = 58;
  const yb = 168;
  const ra = 84; // resistor span
  const rb = 152;
  // LED string: up to three LEDs, otherwise LED, LED, ⋯, LED.
  const items = n <= 3 ? Array(n).fill('led') : ['led', 'led', 'dots', 'led'];
  const step = 46;
  const s0 = 274 - (items.length * step) / 2;
  const s1 = s0 + items.length * step;
  let body = twoTerm('V', xs, yt, xs, yb, { name: 'Vs', value: val(v.vs, 'V'), flip: true })
    + wire([xs, yt], [ra, yt])
    + twoTerm('R', ra, yt, rb, yt, { hi: true })
    + text((ra + rb) / 2, yt - 40, `R (${v.ser})`, { cls: 'name' })
    + text((ra + rb) / 2, yt - 26, val(r?.rRec, 'Ω'), { cls: 'val' })
    + wire([rb, yt], [s0, yt]);
  items.forEach((kind, i) => {
    const a = s0 + i * step;
    const c = a + step / 2;
    body += kind === 'led'
      ? twoTerm('LED', a, yt, a + step, yt)
      : wire([a, yt], [c - 12, yt]) + wire([c + 12, yt], [a + step, yt]) + text(c, yt + 4, '⋯', { cls: 'name' });
  });
  // Above the string: count and the per-LED Vf (the bracket below shows N·Vf).
  body += (n > 1
    ? text((s0 + s1) / 2, yt - 40, `${n} × LED`, { cls: 'name' }) + text((s0 + s1) / 2, yt - 26, `Vf = ${val(v.vf, 'V')}`, { cls: 'val' })
    : text((s0 + s1) / 2, yt - 26, 'LED', { cls: 'name' }))
    + wire([s1, yt], [xc, yt], [xc, yb], [xs, yb])
    + node(226, yb) + ground(226, yb)
    // Voltage drops
    + dimH(ra, rb, yt + 30, `VR = ${val(r?.drop, 'V')}`, { below: true, extFrom: yt + 9, cls: 'val' })
    + dimH(s0 + 6, s1 - 6, yt + 30, `${n > 1 ? 'N·Vf' : 'Vf'} = ${val(vLeds, 'V')}`, { below: true, extFrom: yt + 9, cls: 'val' })
    // Current
    + arrow(xc - 16, yt + 50, xc - 16, yt + 92, { cls: 'flow', headCls: 'arrow flow' })
    + text(xc - 24, yt + 76, `I = ${val(r?.iRec, 'A')}`, { cls: 'val', anchor: 'end' });
  if (r) body += text(220, yb + 38, `Vs = VR + N·Vf:  ${val(v.vs, 'V')} = ${val(r.drop, 'V')} + ${val(vLeds, 'V')}`, { cls: 'title' });
  else if (v.vs > 0 && vLeds >= v.vs) body += text(220, yb + 38, t('led_dgNoHeadroom'), { cls: 'badt' });
  return svg(440, yb + 46, body, t('led_dg'), { wide: true });
}

export default {
  diagram,
  id: 'led',
  strings,
  sections: [
    {
      title: 'sectionInputs',
      fields: [
        { key: 'vs', type: 'number', label: 'led_vs', default: 5, units: ['V'],
          presets: [3.3, 5, 9, 12, 24].map((x) => ({ label: `${x} V`, value: x })) },
        { key: 'vf', type: 'number', label: 'led_vf', default: 3.1, units: ['V'], info: 'led_vfInfo',
          presets: VF_PRESETS.map(([label, value]) => ({ label, value, raw: false })) },
        { key: 'if', type: 'number', label: 'led_if', default: 20, units: ['mA'],
          presets: [1, 2, 5, 10, 20].map((x) => ({ label: `${x} mA`, value: x })) },
        { key: 'n', type: 'number', label: 'led_n', default: 1, integer: true, min: 1, max: 100 },
        { key: 'ser', type: 'select', label: 'led_series', default: 'E24', options: SERIES_OPTS },
      ],
    },
  ],

  compute(v) {
    const r = ledResistor({ vs: v.vs, vf: v.vf, current: v.if / 1000, count: v.n, series: v.ser });
    r.vLeds = v.n * v.vf;
    if (!r.ok) return r;
    r.warnings = [];
    if (r.drop < 1) r.warnings.push('led_lowHeadroom');
    if (v.if > 30) r.warnings.push('led_highCurrent');
    if (r.rating === null) r.warnings.push('led_power');
    if (r.efficiency < 0.5 && r.pSupply > 0.5) r.warnings.push('led_lowEff');
    return r;
  },

  render(r, v) {
    if (!r.ok) return messages('error', r.errors, { led_headroom: { v: si(r.vLeds, 'V') } });
    const vars = { led_lowHeadroom: { v: si(r.drop, 'V', 3) }, led_highCurrent: { i: `${fmt(v.if)} mA` } };
    return heroes([
      ['led_rRec', siHtml(r.rRec, 'Ω'), `${esc(v.ser)} · ${esc(t('led_rRecSub'))}`],
      ['led_iRec', siHtml(r.iRec, 'A'), `${esc(t('led_pR'))}: ${si(r.pR, 'W', 3)}`],
    ])
      + messages('warn', r.warnings, vars)
      + block('led_resistorTitle', rows([
        ['led_rExact', si(r.rExact, 'Ω')],
        ['led_rNearest', si(r.rNearest, 'Ω')],
        ['led_iNearest', si(r.iNearest, 'A')],
        ['led_drop', si(r.drop, 'V')],
        ['led_pR', si(r.pR, 'W')],
        ['led_rating', ratingLabel(r.rating), true],
      ]))
      + block('led_powerTitle', rows([
        ['led_pLed', si(r.pLed, 'W')],
        v.n > 1 && ['led_pLeds', si(r.pLeds, 'W')],
        ['led_pSupply', si(r.pSupply, 'W')],
        ['led_eff', pctOf(r.efficiency)],
      ]))
      + formulaBlock([
        'R    = (Vs − N · Vf) / If',
        'I    = (Vs − N · Vf) / R_std',
        'P_R  = (Vs − N · Vf) · I,     rating ≥ 2 · P_R',
        'P_LED = Vf · I,   η = N · Vf / Vs',
      ], 'led_note', ['Ohm’s law', 'IEC 60063:2015 (E-series)']);
  },
};

