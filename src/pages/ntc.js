import { K0, betaR, shR, shFit, betaBetween, bestSeries, dividerOut, ntcPoint, maxDissipation } from '../engine/ntc.js';
import { nearestStandard } from '../engine/eseries.js';
import { heroes, rows, block, formulaBlock, messages, invalid } from '../ui/calculator.js';
import { fmt, si, siHtml, esc } from '../ui/format.js';
import { svg, twoTerm, wire, node, ground, terminal, text, path, axes, wave, circle, block as icBlock } from '../ui/svg.js';
import { t, getLang } from '../i18n.js';

const strings = {
  tr: {
    nt_model: 'Model',
    nt_beta: 'Beta (B değeri)',
    nt_sh: 'Steinhart–Hart',
    nt_fit: 'Üç noktadan uydur',
    nt_modelInfo: 'Beta modeli veri sayfasındaki R25 ve B değeriyle çalışır; referans sıcaklıklardan uzaklaştıkça hata birkaç °C’ye çıkabilir. Steinhart–Hart üç katsayıyla geniş aralıkta ±0,1 °C civarında doğrudur; katsayıları üreticinin R–T tablosundan üç nokta seçerek bulabilirsiniz.',
    nt_modelTitle: 'Termistör',
    nt_r25: 'Referans direnci R25',
    nt_b: 'B değeri',
    nt_bInfo: 'Veri sayfasında B25/50 ya da B25/85 olarak verilir (ör. 3380, 3435, 3950 K). Hangi sıcaklık çiftinde verildiğine dikkat edin.',
    nt_t25: 'Referans sıcaklığı',
    nt_shA: 'A katsayısı',
    nt_shB: 'B katsayısı',
    nt_shC: 'C katsayısı',
    nt_shInfo: '1/T = A + B·ln R + C·(ln R)³, T kelvin, R ohm. Bilimsel gösterim kullanabilirsiniz (ör. 1.129148e-3).',
    nt_t1: 'Sıcaklık T1',
    nt_r1: 'Direnç R(T1)',
    nt_t2: 'Sıcaklık T2',
    nt_r2: 'Direnç R(T2)',
    nt_t3: 'Sıcaklık T3',
    nt_r3: 'Direnç R(T3)',
    nt_fitInfo: 'Üreticinin R–T tablosundan, kullanım aralığının iki ucundan ve ortasından birer nokta seçin.',
    nt_divTitle: 'Bölücü ve ADC',
    nt_place: 'NTC konumu',
    nt_top: 'Üstte (Vout sıcaklıkla artar)',
    nt_bottom: 'Altta (Vout sıcaklıkla azalır)',
    nt_vref: 'Bölücü beslemesi = ADC referansı',
    nt_vrefInfo: 'Bölücü ADC referansıyla aynı gerilimden beslenirse (oransal ölçüm) besleme gerilimindeki değişim sonucu etkilemez. Hesap bu bağlantıyı varsayar.',
    nt_rs: 'Seri direnç Rs',
    nt_rsInfo: 'Boş bırakılırsa aralıkta en büyük çıkış salınımını veren Rs = √(R(Tmin)·R(Tmax)) önerilir ve standart değere yuvarlanır.',
    nt_bits: 'ADC çözünürlüğü',
    nt_rangeTitle: 'Sıcaklık aralığı',
    nt_tlo: 'En düşük sıcaklık',
    nt_thi: 'En yüksek sıcaklık',
    nt_tx: 'Değerlendirme sıcaklığı',
    nt_delta: 'Isıl dağılma sabiti δ',
    nt_deltaInfo: 'Termistörün 1 °C ısınması için gereken güç (veri sayfası, durgun hava). SMD 0402/0603 termistörler tipik olarak 1 mW/K, epoksi damla tipler 1,5–2 mW/K. Karta lehimli parçada değer daha yüksektir.',
    nt_advanced: 'Seçenekler',
    nt_series: 'Rs için E-serisi',
    nt_rAt: 'Direnç R({t})',
    nt_voutAt: 'Çıkış gerilimi',
    nt_codeSub: 'ADC kodu {c}',
    nt_res: 'Sıcaklık çözünürlüğü',
    nt_resSub: '{s} duyarlılık',
    nt_divider: 'Bölücü',
    nt_rsOpt: 'En iyi Rs = √(R(Tmin)·R(Tmax))',
    nt_rsStd: 'Önerilen Rs ({s})',
    nt_rsUsed: 'Kullanılan Rs',
    nt_rLo: 'R(Tmin)',
    nt_rHi: 'R(Tmax)',
    nt_vLo: 'Vout(Tmin)',
    nt_vHi: 'Vout(Tmax)',
    nt_span: 'Aralıktaki çıkış salınımı',
    nt_sens: 'Duyarlılık dVout/dT',
    nt_adcTitle: 'ADC',
    nt_lsb: '1 LSB',
    nt_code: 'Kod',
    nt_resAt: 'Çözünürlük ({t})',
    nt_heatTitle: 'Öz ısınma',
    nt_i: 'Bölücü akımı',
    nt_p: 'NTC gücü',
    nt_dT: 'Öz ısınma ΔT = P / δ',
    nt_pMax: 'Aralıktaki en büyük NTC gücü',
    nt_dTMax: 'En büyük öz ısınma',
    nt_modelRows: 'Model katsayıları',
    nt_bEq: 'Eşdeğer B (Tmin–Tmax)',
    nt_note: 'ADC kodu ideal dönüştürücü içindir (geçişler ½ LSB’de). Çözünürlük, eğrinin o sıcaklıktaki eğimidir; doğruluk ayrıca termistör toleransına (R25 ve B), Rs toleransına ve ADC hatalarına bağlıdır. Öz ısınma, ölçülen sıcaklığı her zaman yukarı kaydırır; kesintili ölçümde bölücüyü yalnızca okurken beslemek gücü azaltır.',
    warn_nt_outside: 'Değerlendirme sıcaklığı seçilen aralığın dışında.',
    warn_nt_selfHeat: 'Öz ısınma {dT}: ölçüm bu kadar yüksek okunur. Rs’yi büyütün, daha düşük besleme kullanın ya da bölücüyü yalnızca ölçüm sırasında besleyin.',
    warn_nt_coarse: 'Aralığın ucunda ({t}) çözünürlük {r}: eğri orada çok yatık. Aralığı daraltın, Rs’yi o uca göre seçin ya da daha yüksek çözünürlüklü ADC kullanın.',
    warn_nt_betaRange: 'Beta modeli 100 °C’den geniş aralıklarda birkaç °C hata yapabilir; bu aralık için Steinhart–Hart modelini kullanın.',
    warn_nt_rsFar: 'Seçtiğiniz Rs en iyi değerden ({opt}) çok farklı; çıkış salınımı ve çözünürlük azalır.',
    err_nt_range: 'En yüksek sıcaklık en düşük sıcaklıktan büyük olmalı.',
    err_nt_tAbs: 'Sıcaklıklar −273,15 °C’nin üstünde olmalı.',
    err_nt_fitBad: 'Bu üç noktadan geçerli bir Steinhart–Hart eğrisi çıkmıyor: sıcaklıklar farklı olmalı ve direnç sıcaklıkla azalmalı.',
    err_nt_model: 'Model bu aralıkta geçerli bir NTC eğrisi vermiyor (direnç sıcaklıkla azalmalı). Katsayıları kontrol edin.',
    nt_dgDiv: 'NTC bölücü: Vref beslemesi, NTC ve seri direnç Rs, çıkışı ölçen ADC (referansı aynı Vref)',
    nt_dgCurve: 'Çıkış geriliminin sıcaklıkla değişimi; kesik çizgi uç noktalar arasındaki doğru (doğrusallık karşılaştırması)',
    nt_dgRatio: 'oransal: ADC referansı = Vref',
  },
  en: {
    nt_model: 'Model',
    nt_beta: 'Beta (B value)',
    nt_sh: 'Steinhart–Hart',
    nt_fit: 'Fit from three points',
    nt_modelInfo: 'The Beta model uses the datasheet R25 and B value; away from the reference temperatures its error can reach a few °C. Steinhart–Hart is accurate to about ±0.1 °C over a wide range with three coefficients, which you can fit from three points of the manufacturer’s R–T table.',
    nt_modelTitle: 'Thermistor',
    nt_r25: 'Reference resistance R25',
    nt_b: 'B value',
    nt_bInfo: 'Given in the datasheet as B25/50 or B25/85 (e.g. 3380, 3435, 3950 K). Note which temperature pair it refers to.',
    nt_t25: 'Reference temperature',
    nt_shA: 'Coefficient A',
    nt_shB: 'Coefficient B',
    nt_shC: 'Coefficient C',
    nt_shInfo: '1/T = A + B·ln R + C·(ln R)³ with T in kelvin and R in ohms. Scientific notation is accepted (e.g. 1.129148e-3).',
    nt_t1: 'Temperature T1',
    nt_r1: 'Resistance R(T1)',
    nt_t2: 'Temperature T2',
    nt_r2: 'Resistance R(T2)',
    nt_t3: 'Temperature T3',
    nt_r3: 'Resistance R(T3)',
    nt_fitInfo: 'Pick one point at each end and one in the middle of your range from the manufacturer’s R–T table.',
    nt_divTitle: 'Divider and ADC',
    nt_place: 'NTC position',
    nt_top: 'Top (Vout rises with temperature)',
    nt_bottom: 'Bottom (Vout falls with temperature)',
    nt_vref: 'Divider supply = ADC reference',
    nt_vrefInfo: 'When the divider is fed from the ADC reference (ratiometric measurement), supply variations do not affect the result. The calculation assumes this connection.',
    nt_rs: 'Series resistor Rs',
    nt_rsInfo: 'Leave empty to use Rs = √(R(Tmin)·R(Tmax)), which gives the largest output swing over the range, rounded to a standard value.',
    nt_bits: 'ADC resolution',
    nt_rangeTitle: 'Temperature range',
    nt_tlo: 'Lowest temperature',
    nt_thi: 'Highest temperature',
    nt_tx: 'Evaluation temperature',
    nt_delta: 'Dissipation constant δ',
    nt_deltaInfo: 'Power that heats the thermistor by 1 °C (datasheet, still air). SMD 0402/0603 thermistors are typically 1 mW/K, epoxy beads 1.5–2 mW/K. Soldered to a board the value is higher.',
    nt_advanced: 'Options',
    nt_series: 'E-series for Rs',
    nt_rAt: 'Resistance R({t})',
    nt_voutAt: 'Output voltage',
    nt_codeSub: 'ADC code {c}',
    nt_res: 'Temperature resolution',
    nt_resSub: '{s} sensitivity',
    nt_divider: 'Divider',
    nt_rsOpt: 'Best Rs = √(R(Tmin)·R(Tmax))',
    nt_rsStd: 'Suggested Rs ({s})',
    nt_rsUsed: 'Rs used',
    nt_rLo: 'R(Tmin)',
    nt_rHi: 'R(Tmax)',
    nt_vLo: 'Vout(Tmin)',
    nt_vHi: 'Vout(Tmax)',
    nt_span: 'Output swing over the range',
    nt_sens: 'Sensitivity dVout/dT',
    nt_adcTitle: 'ADC',
    nt_lsb: '1 LSB',
    nt_code: 'Code',
    nt_resAt: 'Resolution ({t})',
    nt_heatTitle: 'Self-heating',
    nt_i: 'Divider current',
    nt_p: 'NTC power',
    nt_dT: 'Self-heating ΔT = P / δ',
    nt_pMax: 'Largest NTC power in the range',
    nt_dTMax: 'Largest self-heating',
    nt_modelRows: 'Model coefficients',
    nt_bEq: 'Equivalent B (Tmin–Tmax)',
    nt_note: 'The ADC code is for an ideal converter (transitions at ½ LSB). Resolution is the slope of the curve at that temperature; accuracy also depends on the thermistor tolerance (R25 and B), the Rs tolerance and ADC errors. Self-heating always makes the reading high; in intermittent measurements, powering the divider only while reading reduces it.',
    warn_nt_outside: 'The evaluation temperature is outside the chosen range.',
    warn_nt_selfHeat: 'Self-heating is {dT}: the reading will be that much high. Increase Rs, use a lower supply or power the divider only while measuring.',
    warn_nt_coarse: 'At the end of the range ({t}) the resolution is {r}: the curve is very flat there. Narrow the range, choose Rs for that end or use a higher-resolution ADC.',
    warn_nt_betaRange: 'Over ranges wider than 100 °C the Beta model can be off by a few °C; use the Steinhart–Hart model for this range.',
    warn_nt_rsFar: 'Your Rs is far from the best value ({opt}); output swing and resolution are reduced.',
    err_nt_range: 'The highest temperature must be greater than the lowest.',
    err_nt_tAbs: 'Temperatures must be above −273.15 °C.',
    err_nt_fitBad: 'These three points do not give a valid Steinhart–Hart curve: the temperatures must differ and the resistance must fall with temperature.',
    err_nt_model: 'The model gives no valid NTC curve over this range (resistance must fall with temperature). Check the coefficients.',
    nt_dgDiv: 'NTC divider: Vref supply, NTC and series resistor Rs, and the ADC that reads the output (with the same Vref as reference)',
    nt_dgCurve: 'Output voltage versus temperature; the dashed line joins the end points (linearity comparison)',
    nt_dgRatio: 'ratiometric: ADC reference = Vref',
  },
};

const isModel = (m) => (v) => v.model === m;
const val = (x, unit) => (Number.isFinite(x) && x > 0 ? si(x, unit, 3) : '?');
const degC = (x) => `${fmt(x, 4)} °C`;
const tField = (key, label, def, show, extra = {}) => ({ key, type: 'number', label, default: def, units: ['C'], valid: 'any', show, ...extra });
const rField = (key, label, def, show, extra = {}) => ({ key, type: 'number', label, default: def, units: ['ohm'], si: true, show, ...extra });
const cField = (key, label, def) => ({ key, type: 'number', label, default: def, valid: 'any', show: isModel('sh'), info: 'nt_shInfo' });

/** R(T) function for the chosen model, or an error key. */
function modelOf(v) {
  if (v.model === 'beta') return { rOf: (tK) => betaR(tK, v.r25, v.b, v.t25 + K0) };
  const coeffs = v.model === 'sh'
    ? { a: v.sha, b: v.shb, c: v.shc }
    : shFit([v.t1 + K0, v.r1], [v.t2 + K0, v.r2], [v.t3 + K0, v.r3]);
  if (!coeffs) return { error: 'nt_fitBad' };
  return { rOf: (tK) => shR(tK, coeffs), coeffs };
}

// ---------------------------------------------------------------------------
// Diagrams
// ---------------------------------------------------------------------------

function dividerDiagram(v, r) {
  const top = v.place === 'top';
  const x = 150;
  const yRail = 26;
  const yMid = 90;
  const ntcLabel = { name: 'NTC', value: r ? `R(${fmt(v.tx, 3)} °C) = ${si(r.pt.r, 'Ω', 3)}` : '?' };
  const rsLabel = { name: 'Rs', value: val(r?.rs, 'Ω') };
  const b = terminal(50, yRail, `Vref = ${val(v.vref, 'V')}`, 'top', 'val')
    + wire([53, yRail], [318, yRail], [318, 66]) + node(x, yRail)
    + twoTerm(top ? 'NTC' : 'R', x, yRail, x, yMid, top ? ntcLabel : rsLabel)
    + node(x, yMid)
    + twoTerm(top ? 'R' : 'NTC', x, yMid, x, 156, top ? rsLabel : ntcLabel)
    + ground(x, 156)
    + wire([x, yMid], [282, yMid])
    + icBlock(282, 66, 72, 46, 'ADC', `${Number.isInteger(v.bits) ? v.bits : '?'} bit`)
    + text(234, yMid + 16, `Vout = ${val(r?.pt.vout, 'V')}`, { cls: 'val' })
    + text(318, 132, r ? `${t('nt_code')} ${r.pt.code}` : '', { cls: 'val' })
    + text(236, 18, t('nt_dgRatio'), { cls: 'lbl' });
  return svg(440, 176, b, t('nt_dgDiv'), { wide: true });
}

function curveDiagram(v, r) {
  const x0 = 64;
  const y0 = 160;
  const w = 340;
  const h = 124;
  // Placeholder curve while inputs are invalid: 10 k / B 3950 with Rs = 10 k.
  const curve = r?.curve ?? Array.from({ length: 41 }, (_, i) => {
    const tc = (i / 40) * 100;
    return [tc, dividerOut(betaR(tc + K0, 1e4, 3950), 1e4, 1, true)];
  });
  const vref = r ? v.vref : 1;
  const tLo = curve[0][0];
  const tHi = curve[curve.length - 1][0];
  const X = (tc) => x0 + ((tc - tLo) / (tHi - tLo)) * w;
  const Y = (vv) => y0 - (vv / vref) * h;
  const q = (n) => Math.round(n * 10) / 10;
  let b = axes(x0, y0, w + 8, h + 10) + text(x0 + w + 14, y0 + 4, '°C', { cls: 'lbl', anchor: 'start' })
    + path(`M${x0},${q(Y(vref))}H${x0 + w}`, 'ext') + path(`M${x0},${q(Y(vref / 2))}H${x0 + w}`, 'ext')
    + text(x0 - 5, Y(vref) + 4, r ? si(vref, 'V', 3) : 'Vref', { cls: 'lbl', anchor: 'end' })
    + text(x0 - 5, Y(vref / 2) + 4, r ? si(vref / 2, 'V', 3) : '½ Vref', { cls: 'lbl', anchor: 'end' })
    + text(x0 - 5, y0 + 4, '0', { cls: 'lbl', anchor: 'end' });
  for (const tc of [tLo, (tLo + tHi) / 2, tHi]) b += text(X(tc), y0 + 15, fmt(tc, 3), { cls: 'lbl' });
  const first = curve[0];
  const last = curve[curve.length - 1];
  b += wave([[X(first[0]), Y(first[1])], [X(last[0]), Y(last[1])]], 'wave2')
    + wave(curve.map(([tc, vv]) => [X(tc), Y(vv)]));
  if (r && v.tx >= tLo && v.tx <= tHi) {
    const px = X(v.tx);
    const py = Y(r.pt.vout);
    // Labels in the empty top corner: top left for a rising curve, top right for a falling one.
    const rising = v.place === 'top';
    const lx = rising ? x0 + 10 : x0 + w - 10;
    const anchor = rising ? 'start' : 'end';
    b += path(`M${q(px)},${q(py)}V${y0}`, 'ext') + circle(px, py, 3.2, 'node')
      + text(lx, Y(vref) + 20, `${fmt(v.tx, 3)} °C → ${si(r.pt.vout, 'V', 3)}`, { cls: 'val', anchor })
      + text(lx, Y(vref) + 34, `${fmt(r.pt.degPerLsb, 2)} °C/LSB`, { cls: 'lbl', anchor });
  }
  b += text(x0 + 4, 20, 'Vout', { cls: 'sym', anchor: 'start' });
  return svg(440, 182, b, t('nt_dgCurve'), { wide: true });
}

const diagram = (v, u, r) => dividerDiagram(v, r) + curveDiagram(v, r);

// ---------------------------------------------------------------------------

export default {
  diagram,
  id: 'ntc',
  strings,
  sections: [
    {
      title: 'sectionSetup',
      fields: [
        { key: 'model', type: 'choice', label: 'nt_model', default: 'beta', info: 'nt_modelInfo',
          options: [{ value: 'beta', label: 'nt_beta' }, { value: 'sh', label: 'nt_sh' }, { value: 'fit', label: 'nt_fit' }] },
      ],
    },
    {
      title: 'nt_modelTitle',
      fields: [
        rField('r25', 'nt_r25', '10k', isModel('beta'), {
          presets: ['10k', '47k', '100k'].map((x) => ({ label: `${x}Ω`, value: x })) }),
        { key: 'b', type: 'number', label: 'nt_b', default: 3950, units: ['K'], info: 'nt_bInfo', show: isModel('beta'), max: 20000,
          presets: [3380, 3435, 3950, 4250].map((x) => ({ label: `${x} K`, value: x })) },
        tField('t25', 'nt_t25', 25, isModel('beta')),
        cField('sha', 'nt_shA', '1.129148e-3'),
        cField('shb', 'nt_shB', '2.34125e-4'),
        cField('shc', 'nt_shC', '8.76741e-8'),
        tField('t1', 'nt_t1', 0, isModel('fit'), { info: 'nt_fitInfo' }),
        rField('r1', 'nt_r1', '32.65k', isModel('fit')),
        tField('t2', 'nt_t2', 25, isModel('fit')),
        rField('r2', 'nt_r2', '10k', isModel('fit')),
        tField('t3', 'nt_t3', 85, isModel('fit')),
        rField('r3', 'nt_r3', '1.07k', isModel('fit')),
      ],
    },
    {
      title: 'nt_rangeTitle',
      fields: [
        tField('tlo', 'nt_tlo', 0),
        tField('thi', 'nt_thi', 100),
        tField('tx', 'nt_tx', 25),
      ],
    },
    {
      title: 'nt_divTitle',
      fields: [
        { key: 'place', type: 'choice', label: 'nt_place', default: 'top',
          options: [{ value: 'top', label: 'nt_top' }, { value: 'bottom', label: 'nt_bottom' }] },
        { key: 'vref', type: 'number', label: 'nt_vref', default: 3.3, units: ['V'], info: 'nt_vrefInfo', max: 100,
          presets: [1.8, 2.5, 3.3, 5].map((x) => ({ label: `${x} V`, value: x })) },
        rField('rs', 'nt_rs', '', undefined, { optional: true, info: 'nt_rsInfo' }),
        { key: 'bits', type: 'number', label: 'nt_bits', default: 12, units: ['bit'], integer: true, min: 4, max: 24,
          presets: [10, 12, 16].map((x) => ({ label: `${x} bit`, value: x })) },
        { key: 'delta', type: 'number', label: 'nt_delta', default: 1, units: ['mW/K'], info: 'nt_deltaInfo' },
      ],
    },
    {
      title: 'nt_advanced',
      collapsible: true,
      fields: [
        { key: 'ser', type: 'select', label: 'nt_series', default: 'E24', options: ['E12', 'E24', 'E96'].map((s) => ({ value: s, label: s, raw: true })) },
      ],
    },
  ],

  compute(v) {
    const temps = v.model === 'fit' ? [v.tlo, v.thi, v.tx, v.t1, v.t2, v.t3] : [v.tlo, v.thi, v.tx, v.model === 'beta' ? v.t25 : 0];
    if (temps.some((x) => !(x > -K0))) return { ok: false, errors: ['nt_tAbs'] };
    if (!(v.thi > v.tlo)) return { ok: false, errors: ['nt_range'] };
    const m = modelOf(v);
    if (m.error) return { ok: false, errors: [m.error] };
    const tLoK = v.tlo + K0;
    const tHiK = v.thi + K0;
    const rLow = m.rOf(tLoK);
    const rHigh = m.rOf(tHiK);
    // A valid NTC curve: finite, positive and falling over the whole range.
    const probe = Array.from({ length: 11 }, (_, i) => m.rOf(tLoK + ((tHiK - tLoK) * i) / 10));
    if (!probe.every((x) => Number.isFinite(x) && x > 0) || !probe.every((x, i) => i === 0 || x < probe[i - 1])) {
      return { ok: false, errors: [m.coeffs && v.model === 'fit' ? 'nt_fitBad' : 'nt_model'] };
    }
    const top = v.place === 'top';
    const rsOpt = bestSeries(rLow, rHigh);
    const rsStd = nearestStandard(rsOpt, v.ser).nearest;
    const rs = v.rs > 0 ? v.rs : rsStd;
    const delta = v.delta * 1e-3;
    const at = (tc) => ntcPoint({ rOf: m.rOf, tK: tc + K0, rs, vref: v.vref, top, bits: v.bits, delta });
    const pt = at(v.tx);
    const lo = at(v.tlo);
    const hi = at(v.thi);
    const pMax = maxDissipation(rLow, rHigh, rs, v.vref);
    const curve = Array.from({ length: 61 }, (_, i) => {
      const tc = v.tlo + ((v.thi - v.tlo) * i) / 60;
      return [tc, dividerOut(m.rOf(tc + K0), rs, v.vref, top)];
    });
    const warnings = [];
    const worst = lo.degPerLsb > hi.degPerLsb ? { p: lo, t: v.tlo } : { p: hi, t: v.thi };
    const vars = {
      nt_selfHeat: { dT: `${fmt(pt.selfHeat, 2)} °C` },
      nt_coarse: { t: degC(worst.t), r: `${fmt(worst.p.degPerLsb, 2)} °C/LSB` },
      nt_rsFar: { opt: si(rsOpt, 'Ω', 3) },
    };
    if (v.tx < v.tlo || v.tx > v.thi) warnings.push('nt_outside');
    if (pt.selfHeat > 0.2) warnings.push('nt_selfHeat');
    if (worst.p.degPerLsb > 0.5) warnings.push('nt_coarse');
    if (v.model === 'beta' && v.thi - v.tlo > 100) warnings.push('nt_betaRange');
    if (v.rs > 0 && (rs / rsOpt > 3 || rsOpt / rs > 3)) warnings.push('nt_rsFar');
    return {
      ok: true, coeffs: m.coeffs, rLow, rHigh, rsOpt, rsStd, rs, pt, lo, hi, pMax, dTMax: pMax / delta,
      bEq: betaBetween(tLoK, rLow, tHiK, rHigh), curve, warnings, vars,
    };
  },

  render(r, v) {
    if (!r.ok) return invalid(r.errors);
    const pt = r.pt;
    const mvPerC = `${fmt(Math.abs(pt.slope) * 1e3, 3)} mV/°C`;
    const coeff = (x) => (getLang() === 'tr' ? x.toExponential(6).replace('.', ',') : x.toExponential(6));
    return heroes([
      [t('nt_rAt', { t: degC(v.tx) }), siHtml(pt.r, 'Ω')],
      ['nt_voutAt', siHtml(pt.vout, 'V'), esc(t('nt_codeSub', { c: pt.code }))],
      ['nt_res', `${esc(fmt(pt.degPerLsb, 3))} <span class="u">°C/LSB</span>`, esc(t('nt_resSub', { s: mvPerC }))],
    ])
      + messages('warn', r.warnings, r.vars)
      + block('nt_divider', rows([
        ['nt_rsOpt', si(r.rsOpt, 'Ω')],
        [t('nt_rsStd', { s: v.ser }), si(r.rsStd, 'Ω'), false, true],
        ['nt_rsUsed', si(r.rs, 'Ω'), true],
        ['nt_rLo', `${si(r.rLow, 'Ω')} (${degC(v.tlo)})`],
        ['nt_rHi', `${si(r.rHigh, 'Ω')} (${degC(v.thi)})`],
        ['nt_vLo', si(r.lo.vout, 'V')],
        ['nt_vHi', si(r.hi.vout, 'V')],
        ['nt_span', si(Math.abs(r.hi.vout - r.lo.vout), 'V')],
        ['nt_sens', `${mvPerC} (${degC(v.tx)})`],
      ]))
      + block('nt_adcTitle', rows([
        ['nt_lsb', si(pt.lsb, 'V')],
        ['nt_code', `${pt.code} / ${2 ** v.bits - 1}`],
        [t('nt_resAt', { t: degC(v.tlo) }), `${fmt(r.lo.degPerLsb, 3)} °C/LSB`, false, true],
        [t('nt_resAt', { t: degC(v.tx) }), `${fmt(pt.degPerLsb, 3)} °C/LSB`, true, true],
        [t('nt_resAt', { t: degC(v.thi) }), `${fmt(r.hi.degPerLsb, 3)} °C/LSB`, false, true],
      ]))
      + block('nt_heatTitle', rows([
        ['nt_i', si(pt.i, 'A')],
        ['nt_p', si(pt.p, 'W')],
        ['nt_dT', `${fmt(pt.selfHeat, 3)} °C`, true],
        ['nt_pMax', si(r.pMax, 'W')],
        ['nt_dTMax', `${fmt(r.dTMax, 3)} °C`],
      ]))
      + block('nt_modelRows', rows([
        v.model === 'beta' && ['nt_r25', si(v.r25, 'Ω')],
        v.model === 'beta' && ['nt_b', `${Math.round(v.b)} K`],
        r.coeffs && ['A', coeff(r.coeffs.a), false, true],
        r.coeffs && ['B', coeff(r.coeffs.b), false, true],
        r.coeffs && ['C', coeff(r.coeffs.c), false, true],
        ['nt_bEq', `${Math.round(r.bEq)} K`],
      ]))
      + formulaBlock([
        'Beta:            R(T) = R25 · exp(B · (1/T − 1/T25)),   T in K',
        'Steinhart–Hart:  1/T = A + B·ln R + C·(ln R)³',
        '                 R(T) = e^x  with  C·x³ + B·x + A − 1/T = 0  (one real root; Newton iteration)',
        'three-point fit: γ2 = (Y2−Y1)/(L2−L1), γ3 = (Y3−Y1)/(L3−L1),  L = ln R, Y = 1/T',
        '                 C = (γ3−γ2) / ((L3−L2)(L1+L2+L3)),  B = γ2 − C(L1² + L1L2 + L2²),  A = Y1 − (B + C·L1²)·L1',
        'divider:  Vout = Vref · Rs / (Rs + R_NTC)  (NTC on top)  or  Vref · R_NTC / (Rs + R_NTC)',
        'Rs = √(R(Tmin) · R(Tmax))   (largest Vout swing over the range)',
        'resolution = (Vref / 2^N) / |dVout/dT|,   ΔT_self = I² · R_NTC / δ',
      ], 'nt_note', [
        'Steinhart & Hart, Deep-Sea Research 15 (1968) 497–503',
        'TDK/EPCOS, NTC thermistors — general technical information (B value, dissipation constant)',
        'Vishay, NTC thermistors — R/T characteristics and Steinhart–Hart application note',
      ]);
  },
};
