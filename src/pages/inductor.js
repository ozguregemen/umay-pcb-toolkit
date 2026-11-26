import { planarInductor, coilTuning, SHAPES } from '../engine/inductor.js';
import { toMm } from '../engine/units.js';
import { heroes, rows, block, steps, messages, invalid } from '../ui/calculator.js';
import { tx } from '../ui/math.js';
import { fmt, fixed, si, siHtml, esc } from '../ui/format.js';
import { svg, rect, circle, text, dimH, twoTerm, wire, node, block as icBlock } from '../ui/svg.js';
import { t } from '../i18n.js';

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
    pi_kp: 'Şeklin çevre / çap oranı (kare 4 · altıgen 2√3 · sekizgen 8·tan(π/8) · daire π)',
    pi_coef: 'Şekle bağlı katsayılar (Mohan ve ark.)',
    pi_rhoCu: 'Bakırın özdirenci (25 °C)',
    pi_note: 'Mohan ve arkadaşlarının (1999) ifadeleri, ölçümlerle tipik olarak %2–3 içinde uyumludur. Spiralin altındaki/üstündeki bakır düzlemler (girdap akımları) endüktansı belirgin biçimde düşürür; spiralin altında düzlem bırakmayın. İç uçtan dışarı çıkış için bir köprü (via + alt katman) gerekir.',
    pi_tuneTitle: 'Rezonans ayarı (NFC / RFID / kablosuz güç)',
    pi_f: 'Hedef rezonans frekansı',
    pi_fInfo: '125 kHz: LF RFID · 6,78 MHz: AirFuel kablosuz güç · 13,56 MHz: NFC, ISO 14443 / 15693. Boş bırakılırsa rezonans hesabı yapılmaz.',
    pi_cp: 'Parazitik + IC giriş kapasitesi',
    pi_cpInfo: 'Bobinin kendi sarımlar arası kapasitesi, IC giriş kapasitesi ve bağlantı yollarının toplamı. Bilinmiyorsa birkaç pF ile başlayın; ölçümle düzeltin.',
    pi_qt: 'Hedef kalite faktörü (Q)',
    pi_qtInfo: 'NFC okuyucularında veri bant genişliği için Q genellikle 20–35 aralığında tutulur. Bobinin Q’su bundan yüksekse seri sönümleme direnci eklenir. Boş bırakılırsa sönümleme hesaplanmaz.',
    pi_xl: 'Reaktans X_L = ωL',
    pi_cTotal: 'Rezonans için toplam kapasite',
    pi_cExt: 'Eklenecek ayar kapasitörü C',
    pi_delta: 'Deri kalınlığı δ',
    pi_rac: 'AC direnç (deri etkisi, yaklaşık)',
    pi_qCoil: 'Bobinin kendi Q’su',
    pi_rDamp: 'Seri sönümleme direnci Rq',
    pi_bw: 'Bant genişliği f0/Q',
    pi_tuneNote: 'Bobin, paralel bir kapasitörle hedef frekansta rezonansa getirilir: C = C_toplam − C_par. Bobinin Q’su hedeften yüksekse seri direnç Q’yu düşürür ve bant genişliğini açar; diferansiyel antende bu direnç iki bacağa eşit bölünür. Sarımlar arası yakınlık etkisi dahil değildir; gerçek AC direnç 1,5–3 kat yüksek olabilir. Kesin ayar LCR ölçer veya VNA ile yapılır; yakındaki metal ve pil endüktansı düşürür.',
    pi_antLink: 'UHF ve 2,4 GHz gibi yayılım yapan antenler için:',
    pi_dgSpiral: 'Spiral bobin üstten görünüş (ölçekli)',
    pi_dgBridge: 'köprü (alt katman)',
    pi_dgTune: 'Rezonans ayar devresi',
    err_turns: 'Sarım sayısı en az 1 olmalı.',
    err_width: 'Genişlik sıfırdan büyük olmalı.',
    err_space: 'Boşluk sıfırdan büyük olmalı.',
    err_outer: 'Dış çap sıfırdan büyük olmalı.',
    err_tooManyTurns: 'Bu dış çapa bu kadar sarım sığmıyor (iç çap ≤ 0).',
    warn_fillLow: 'Doluluk oranı çok düşük; formüllerin doğruluğu azalır.',
    warn_innerSmall: 'İç çap çok küçük; içteki sarımlar endüktansa az katkı yapar ve direnci artırır.',
    warn_cParTooBig: 'Parazitik kapasite, rezonans için gereken toplam kapasiteden büyük: bobin bu frekansa ayarlanamaz. Sarım sayısını veya çapı azaltın.',
    warn_qBelowTarget: 'Bobinin kendi Q’su hedefin altında; sönümleme direnci gerekmez, bant genişliğini bobinin Q’su belirler.',
    warn_lfCoil: 'Bu düşük frekansta gereken endüktans (yüzlerce µH) PCB spiralle zor elde edilir ve ayar kapasitörü çok büyür. Tel sarımlı bobin düşünün.',
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
    pi_kp: 'Perimeter / diameter of the shape (square 4 · hexagon 2√3 · octagon 8·tan(π/8) · circle π)',
    pi_coef: 'Shape-dependent coefficients (Mohan et al.)',
    pi_rhoCu: 'Resistivity of copper (25 °C)',
    pi_note: 'The expressions by Mohan et al. (1999) typically agree with measurements within 2–3 %. Copper planes above or below the spiral (eddy currents) lower the inductance markedly; keep planes away from under the spiral. Bringing out the inner end needs a bridge (via + other layer).',
    pi_tuneTitle: 'Resonant tuning (NFC / RFID / wireless power)',
    pi_f: 'Target resonant frequency',
    pi_fInfo: '125 kHz: LF RFID · 6.78 MHz: AirFuel wireless power · 13.56 MHz: NFC, ISO 14443 / 15693. Leave empty to skip the resonance calculation.',
    pi_cp: 'Parasitic + IC input capacitance',
    pi_cpInfo: 'Sum of the coil’s inter-winding capacitance, the IC input capacitance and the routing. If unknown, start with a few pF and correct it by measurement.',
    pi_qt: 'Target quality factor (Q)',
    pi_qtInfo: 'NFC readers usually keep Q around 20–35 for the data bandwidth. If the coil’s own Q is higher, a series damping resistor is added. Leave empty to skip damping.',
    pi_xl: 'Reactance X_L = ωL',
    pi_cTotal: 'Total capacitance for resonance',
    pi_cExt: 'Tuning capacitor to add C',
    pi_delta: 'Skin depth δ',
    pi_rac: 'AC resistance (skin effect, approx.)',
    pi_qCoil: 'Coil’s own Q',
    pi_rDamp: 'Series damping resistor Rq',
    pi_bw: 'Bandwidth f0/Q',
    pi_tuneNote: 'The coil is brought to resonance at the target frequency with a parallel capacitor: C = C_total − C_par. If the coil’s Q is above the target, a series resistor lowers Q and widens the bandwidth; in a differential antenna it is split equally between both legs. Proximity effect between turns is not included; the real AC resistance can be 1.5–3× higher. Final tuning is done with an LCR meter or VNA; nearby metal and batteries lower the inductance.',
    pi_antLink: 'For radiating antennas such as UHF and 2.4 GHz:',
    pi_dgSpiral: 'Spiral coil top view (to scale)',
    pi_dgBridge: 'bridge (other layer)',
    pi_dgTune: 'Resonant tuning circuit',
    err_turns: 'Turns must be at least 1.',
    err_width: 'Width must be greater than zero.',
    err_space: 'Spacing must be greater than zero.',
    err_outer: 'Outer diameter must be greater than zero.',
    err_tooManyTurns: 'This many turns do not fit in this outer diameter (inner diameter ≤ 0).',
    warn_fillLow: 'Very low fill ratio; the formulas lose accuracy.',
    warn_innerSmall: 'Very small inner diameter; inner turns add little inductance but more resistance.',
    warn_cParTooBig: 'The parasitic capacitance is larger than the total needed for resonance: the coil cannot be tuned to this frequency. Reduce turns or diameter.',
    warn_qBelowTarget: 'The coil’s own Q is below the target; no damping resistor is needed and the coil’s Q sets the bandwidth.',
    warn_lfCoil: 'At this low frequency the required inductance (hundreds of µH) is hard to reach with a PCB spiral and the tuning capacitor becomes very large. Consider a wire-wound coil.',
  },
};

const LEN = ['mm', 'mil'];
const SIDES = { square: 4, hexagonal: 6, octagonal: 8, circular: 48 };

// SVG numbers must not go through locale formatting (TR uses a decimal comma).
const c = (x) => Math.round(x * 100) / 100;

const lenTxt = (mmVal, unit) => (unit === 'mil' ? `${fmt(mmVal / 0.0254, 3)} mil` : `${fmt(mmVal, 3)} mm`);

/**
 * Centre line of the spiral in mm (y up). Each side lies on a line at a given
 * distance (apothem) from the centre; polygons step inward by one pitch once
 * per turn (Manhattan style), the circle shrinks continuously.
 */
function spiralPoints(shape, n, w, s, dOut) {
  const N = SIDES[shape] ?? 4;
  const pitch = w + s;
  const a0 = dOut / 2 - w / 2;
  const cont = shape === 'circular';
  const total = Math.max(1, Math.round(n * N));
  const apo = (k) => (k < 0 ? a0 : a0 - pitch * (cont ? k / N : Math.floor(k / N)));
  const phi = (k) => Math.PI - (k * 2 * Math.PI) / N;
  const meet = (k) => {
    const c1 = Math.cos(phi(k)); const s1 = Math.sin(phi(k)); const a1 = apo(k);
    const c2 = Math.cos(phi(k + 1)); const s2 = Math.sin(phi(k + 1)); const a2 = apo(k + 1);
    const det = c1 * s2 - s1 * c2;
    return [(a1 * s2 - s1 * a2) / det, (c1 * a2 - a1 * c2) / det];
  };
  const pts = [];
  for (let k = -1; k < total; k++) pts.push(meet(k));
  return pts;
}

function spiralDiagram(v, u, r) {
  const n = Math.min(v.n, 60);
  const w = toMm(v.w, u.w);
  const s = toMm(v.s, u.s);
  const d = toMm(v.d, u.d);
  const pts = spiralPoints(v.sh, n, w, s, d);
  const start = pts[0];
  const end = pts[pts.length - 1];
  const ys = pts.map((p) => p[1]);
  const yTop = Math.max(...ys) + w / 2;
  const pad = Math.max(2.2 * w, 0.05 * d);
  const leadY = Math.min(...ys) - w / 2 - Math.max(2 * w, 0.1 * d);
  const hMm = yTop - (leadY - pad / 2);
  const k = Math.min(230 / d, 220 / hMm);
  const left = 24;
  const top = 34;
  const X = (x) => left + (x + d / 2) * k;
  const Y = (y) => top + (yTop - y) * k;
  const sw = Math.max(0.8, w * k);
  const line = (p, cls, extra = '') => `<polyline class="${cls}" style="stroke-width:${c(sw)}"${extra} points="${p.map(([x, y]) => `${c(X(x))},${c(Y(y))}`).join(' ')}"/>`;
  const join = v.sh === 'circular' ? 'round' : 'miter';
  const padPx = pad * k;
  const viaR = Math.max(2.2, sw * 0.9);
  const right = X(d / 2);
  const W = Math.max(330, right + 104);

  let body = line([[start[0], leadY], ...pts], 'cutr', ` stroke-linejoin="${join}"`)
    + line([end, [end[0], leadY]], 'bridge')
    + rect(X(start[0]) - padPx / 2, Y(leadY) - padPx / 2, padPx, padPx, 'cu')
    + rect(X(end[0]) - padPx / 2, Y(leadY) - padPx / 2, padPx, padPx, 'cu')
    + circle(X(end[0]), Y(end[1]), viaR, 'term')
    + circle(X(end[0]), Y(leadY), viaR, 'term')
    + dimH(X(-d / 2), X(d / 2), top - 12, `d_out = ${lenTxt(d, u.d)}`, { cls: 'val', extFrom: Y(yTop) });
  if (r.dInMm * k > 34) body += dimH(X(-r.dInMm / 2), X(r.dInMm / 2), Y(0), `d_in = ${lenTxt(r.dInMm, u.d)}`, { cls: 'val' });
  const ly = Y(leadY) + padPx / 2 + 16;
  body += `<path class="bridge" style="stroke-width:2" d="M${c(left)},${c(ly - 4)}h18"/>`
    + text(left + 24, ly, t('pi_dgBridge'), { cls: 'lbl', anchor: 'start' });
  const tx = right + 16;
  body += text(tx, top + 26, `n = ${fmt(v.n, 3)}`, { cls: 'sym', anchor: 'start' })
    + text(tx, top + 44, `w = ${lenTxt(w, u.w)}`, { cls: 'sym', anchor: 'start' })
    + text(tx, top + 62, `s = ${lenTxt(s, u.s)}`, { cls: 'sym', anchor: 'start' })
    + text(tx, top + 86, `L ≈ ${si(r.lSheet, 'H')}`, { cls: 'val', anchor: 'start' });
  return svg(W, ly + 8, body, t('pi_dgSpiral'), { wide: true });
}

function tuneDiagram(r) {
  const T = r.tune;
  const yT = 34;
  const yB = 104;
  const hasR = T.rDamp > 0;
  let body = icBlock(14, 22, 56, 94, 'IC', 'NFC')
    + wire([70, yB], [330, yB])
    + node(150, yT) + node(150, yB)
    + twoTerm('C', 150, yT, 150, yB, { name: 'C', value: T.cExt > 0 ? si(T.cExt, 'F') : '—', hi: true })
    + twoTerm('L', 330, yT, 330, yB, { name: 'L', value: si(r.lSheet, 'H') });
  body += hasR
    ? wire([70, yT], [200, yT]) + twoTerm('R', 200, yT, 270, yT, { name: 'Rq', value: si(T.rDamp, 'Ω') }) + wire([270, yT], [330, yT])
    : wire([70, yT], [330, yT]);
  body += text(240, 126, `f0 = ${si(r.fHz, 'Hz')}`, { cls: 'lbl' });
  return svg(410, 134, body, t('pi_dgTune'), { wide: true });
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
    {
      title: 'pi_tuneTitle',
      optional: true,
      fields: [
        { key: 'ft', type: 'number', label: 'pi_f', default: 13.56, optional: true, units: ['MHz', 'kHz'], info: 'pi_fInfo',
          presets: [{ label: '125 kHz', value: 125, unit: 'kHz' }, { label: '6.78 MHz', value: 6.78, unit: 'MHz' }, { label: '13.56 MHz', value: 13.56, unit: 'MHz' }] },
        { key: 'cp', type: 'number', label: 'pi_cp', default: 5, units: ['pF'], valid: 'nonneg', info: 'pi_cpInfo' },
        { key: 'qt', type: 'number', label: 'pi_qt', default: 30, optional: true, info: 'pi_qtInfo',
          presets: [20, 30, 35].map((x) => ({ label: String(x), value: x })) },
      ],
    },
  ],

  diagram(v, u, r) {
    if (!r) return '';
    return spiralDiagram(v, u, r) + (r.tune ? tuneDiagram(r) : '');
  },

  compute(v, u) {
    const r = planarInductor({
      shape: v.sh, turns: v.n, widthMm: toMm(v.w, u.w), spaceMm: toMm(v.s, u.s), outerMm: toMm(v.d, u.d), thicknessUm: v.t,
    });
    if (r.ok && Number.isFinite(v.ft) && v.ft > 0) {
      r.fHz = v.ft * (u.ft === 'kHz' ? 1e3 : 1e6);
      r.tune = coilTuning({
        L: r.lSheet, rDc: r.rDc, thicknessUm: v.t, fHz: r.fHz,
        cParF: Number.isFinite(v.cp) ? v.cp * 1e-12 : 0,
        qTarget: Number.isFinite(v.qt) ? v.qt : undefined,
      });
    }
    return r;
  },

  render(r, v, u) {
    if (!r.ok) return invalid(r.errors);
    // Calculation steps: lengths in mm (what the engine works in); µ0 = 4π·10⁻⁷ H/m is shown as 1.2566 µH/m.
    const q = (x, unit, sig = 4) => tx(`${fmt(x, sig)} ${unit}`);
    const mm = (x) => q(x, 'mm', 6); // diameters are subtracted from each other: keep their digits
    const ohm = (x) => tx(si(x, 'Ω'));
    const MU0 = q(0.4 * Math.PI, 'µH/m', 5);
    const n = fmt(v.n, 4);
    const w = toMm(v.w, u.w);
    const s = toMm(v.s, u.s);
    const d = toMm(v.d, u.d);
    const k = r.coef;
    const rho = tx(fmt(r.fill, 4));
    let html = heroes([
      ['pi_lSheet', siHtml(r.lSheet, 'H')],
      r.lWheeler && ['pi_lWheeler', siHtml(r.lWheeler, 'H')],
    ])
      + messages('warn', r.warnings)
      + steps([
        { label: 'pi_din', sym: 'd_{in} = d_{out} − 2 \\cdot n \\cdot w − 2 \\cdot (n − 1) \\cdot s',
          num: `${mm(d)} − 2 \\cdot ${n} \\cdot ${mm(w)} − 2 \\cdot (${n} − 1) \\cdot ${mm(s)}`, res: mm(r.dInMm) },
        { label: 'pi_davg', sym: 'd_{avg} = \\frac{d_{out} + d_{in}}{2}', num: `\\frac{${mm(d)} + ${mm(r.dInMm)}}{2}`, res: mm(r.dAvgMm) },
        { label: 'pi_fill', sym: 'ρ = \\frac{d_{out} − d_{in}}{d_{out} + d_{in}}',
          num: `\\frac{${mm(d)} − ${mm(r.dInMm)}}{${mm(d)} + ${mm(r.dInMm)}}`, res: rho },
        { label: 'pi_lSheet', sym: 'L = \\frac{µ_0 \\cdot n^{2} \\cdot d_{avg} \\cdot c_1}{2} \\cdot (\\ln\\frac{c_2}{ρ} + c_3 \\cdot ρ + c_4 \\cdot ρ^{2})',
          num: `\\frac{${MU0} \\cdot {${n}}^{2} \\cdot ${mm(r.dAvgMm)} \\cdot ${fmt(k.c1)}}{2} \\cdot (\\ln\\frac{${fmt(k.c2)}}{${rho}} + ${fmt(k.c3)} \\cdot ${rho} + ${fmt(k.c4)} \\cdot {${rho}}^{2})`,
          res: tx(si(r.lSheet, 'H')) },
        r.lWheeler && { label: 'pi_lWheeler', sym: 'L_W = \\frac{K_1 \\cdot µ_0 \\cdot n^{2} \\cdot d_{avg}}{1 + K_2 \\cdot ρ}',
          num: `\\frac{${fmt(k.k1)} \\cdot ${MU0} \\cdot {${n}}^{2} \\cdot ${mm(r.dAvgMm)}}{1 + ${fmt(k.k2)} \\cdot ${rho}}`, res: tx(si(r.lWheeler, 'H')) },
        { label: 'pi_len', sym: 'l_{tot} = n \\cdot k_p \\cdot d_{avg}', num: `${n} \\cdot ${fmt(k.perimeter, 4)} \\cdot ${mm(r.dAvgMm)}`, res: q(r.lengthMm, 'mm') },
        { label: 'pi_rdc', sym: 'R_{dc} = \\frac{ρ_{Cu} \\cdot l_{tot}}{w \\cdot t}',
          num: `\\frac{${tx(si(r.resistivity, 'Ω·m'))} \\cdot ${q(r.lengthMm, 'mm')}}{${mm(w)} \\cdot ${q(r.thicknessUm, 'µm')}}`, res: ohm(r.rDc) },
      ], { note: 'pi_note', refs: ['S. S. Mohan et al., IEEE JSSC 34(10), 1999'],
        where: [['n', 'pi_n', 'n'], ['w', 'pi_w', 'w'], ['s', 'pi_s', 's'], ['d_{out}', 'pi_dout', 'd'], ['t', 'pi_t', 't'],
          [r.lWheeler ? 'c_i, K_i' : 'c_i', 'pi_coef'], ['k_p', 'pi_kp'], ['ρ_{Cu}', 'pi_rhoCu']] })
      + block('results', rows([
        ['pi_din', `${fixed(r.dInMm, 3)} mm`],
        ['pi_davg', `${fixed(r.dAvgMm, 3)} mm`],
        ['pi_fill', fmt(r.fill, 3)],
        ['pi_len', `${fmt(r.lengthMm, 4)} mm`],
        ['pi_rdc', si(r.rDc, 'Ω')],
      ]));
    const T = r.tune;
    if (T) {
      const f0 = tx(si(r.fHz, 'Hz'));
      const L = tx(si(r.lSheet, 'H'));
      const cPar = v.cp > 0 ? v.cp * 1e-12 : 0;
      const tCu = q(T.thicknessUm, 'µm');
      const delta = q(T.deltaUm, 'µm');
      const damped = T.rDamp > 0;
      html += messages('warn', T.warnings)
        + block('pi_tuneTitle', rows([
          ['pi_cExt', T.cExt > 0 ? si(T.cExt, 'F') : '—', true],
          T.rDamp > 0 && ['pi_rDamp', `${si(T.rDamp, 'Ω')} (2 × ${si(T.rDamp / 2, 'Ω')})`, true],
          ['pi_xl', `${fmt(T.xl, 4)} Ω`],
          ['pi_cTotal', si(T.cTotal, 'F')],
          ['pi_delta', `${fmt(T.deltaUm, 3)} µm`],
          ['pi_rac', si(T.rAc, 'Ω')],
          ['pi_qCoil', fmt(T.qCoil, 3)],
          ['pi_bw', si(T.bw, 'Hz')],
        ]))
        // The tuning values are the strong rows of the table above; their steps follow it.
        + steps([
          { label: 'pi_xl', sym: 'X_L = 2π \\cdot f_0 \\cdot L', num: `2π \\cdot ${f0} \\cdot ${L}`, res: ohm(T.xl) },
          { label: 'pi_cTotal', sym: 'C_{total} = \\frac{1}{(2π \\cdot f_0)^{2} \\cdot L}', num: `\\frac{1}{(2π \\cdot ${f0})^{2} \\cdot ${L}}`, res: tx(si(T.cTotal, 'F')) },
          T.cExt > 0 && { label: 'pi_cExt', sym: 'C = C_{total} − C_{par}', num: `${tx(si(T.cTotal, 'F'))} − ${tx(si(cPar, 'F'))}`, res: tx(si(T.cExt, 'F')) },
          { label: 'pi_delta', sym: 'δ = \\sqrt{\\frac{ρ_{Cu}}{π \\cdot f_0 \\cdot µ_0}}',
            num: `\\sqrt{\\frac{${tx(si(T.resistivity, 'Ω·m'))}}{π \\cdot ${f0} \\cdot ${MU0}}}`, res: delta },
          { label: 'pi_rac', sym: 'R_{ac} = R_{dc} \\cdot \\frac{t / δ}{1 − e^{−t / δ}}',
            num: `${ohm(r.rDc)} \\cdot \\frac{${tCu} / ${delta}}{1 − e^{−${tCu} / ${delta}}}`, res: ohm(T.rAc) },
          { label: 'pi_qCoil', sym: 'Q = \\frac{X_L}{R_{ac}}', num: `\\frac{${ohm(T.xl)}}{${ohm(T.rAc)}}`, res: tx(fmt(T.qCoil, 4)) },
          damped && { label: 'pi_rDamp', sym: 'R_q = \\frac{X_L}{Q_t} − R_{ac}', num: `\\frac{${ohm(T.xl)}}{${fmt(v.qt, 4)}} − ${ohm(T.rAc)}`, res: ohm(T.rDamp) },
          { label: 'pi_bw', sym: damped ? 'BW = \\frac{f_0}{Q_t}' : 'BW = \\frac{f_0}{Q}', num: `\\frac{${f0}}{${fmt(T.qEff, 4)}}`, res: tx(si(T.bw, 'Hz')) },
        ], { note: 'pi_tuneNote', refs: ['C. P. Yue & S. S. Wong, IEEE T-ED 47(3), 2000', 'ST AN2866', 'NXP AN11019'],
          where: [['f_0', 'pi_f', 'ft'], ['L', 'pi_lSheet'], ['C_{par}', 'pi_cp', 'cp'], damped && ['Q_t', 'pi_qt', 'qt'],
            ['t', 'pi_t', 't'], ['R_{dc}', 'pi_rdc'], ['ρ_{Cu}', 'pi_rhoCu']] });
    }
    html += `<p class="note">${esc(t('pi_antLink'))} <a href="#/antenna">${esc(t('tool_antenna'))}</a></p>`;
    return html;
  },
};
