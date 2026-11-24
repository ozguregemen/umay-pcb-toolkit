import { shuntDesign, DERATE } from '../engine/shunt.js';
import { heroes, rows, block, formulaBlock, messages, invalid } from '../ui/calculator.js';
import { fmt, si, siHtml, esc } from '../ui/format.js';
import { svg, twoTerm, wire, node, ground, text, rect, path, arrow, circle, opamp, block as icBlock, bar } from '../ui/svg.js';
import { t, locale } from '../i18n.js';

const strings = {
  tr: {
    shn_sizing: 'Şönt değerini belirleyen',
    shn_byVs: 'Tam ölçek şönt gerilimi',
    shn_byAdc: 'ADC aralığı ve kazanç',
    shn_sizingInfo: 'Şönt gerilimi seçimi bir dengedir: büyük gerilim ofset hatasını küçültür ama güç kaybını ve yükteki gerilim düşümünü artırır. Tipik tam ölçek 50–100 mV’tur. Ölçüm entegresinin giriş aralığı belliyse (ör. INA226 için 81,92 mV) onu girin.',
    shn_place: 'Yerleşim',
    shn_low: 'Düşük taraf (GND tarafı)',
    shn_high: 'Yüksek taraf (besleme tarafı)',
    shn_placeInfo: 'Düşük tarafta ölçüm basittir (ortak mod ≈ 0 V) ama yükün toprağı şönt gerilimi kadar kayar ve toprağa kısa devre algılanamaz. Yüksek tarafta yük toprakta kalır, ancak yükseltecin ortak mod aralığı besleme gerilimini kapsamalıdır.',
    shn_inTitle: 'Akım ve ölçüm zinciri',
    shn_imax: 'En büyük akım Imax',
    shn_vsfs: 'Imax’taki şönt gerilimi',
    shn_vfs: 'ADC tam ölçeği (Vref)',
    shn_gain: 'Yükselteç kazancı G',
    shn_gainInfo: 'Akım ölçüm yükseltecinin kazancı (ör. INA180/INA240 sürümleri 20, 50, 100, 200 V/V). Yükselteç yoksa 1 girin.',
    shn_use: 'Imax’ta kullanılacak ADC aralığı',
    shn_useInfo: 'Aşırı akım, tolerans ve geçici durumlar için pay bırakın; %80–90 tipiktir.',
    shn_bits: 'ADC çözünürlüğü',
    shn_vbus: 'Besleme (bus) gerilimi',
    shn_vbusInfo: 'Şöntteki gerilim düşümünün beslemeye oranı için; yüksek tarafta yükseltecin ortak mod gerilimi de budur.',
    shn_shuntTitle: 'Şönt direnci',
    shn_rUser: 'Seçtiğiniz şönt değeri',
    shn_rUserInfo: 'Boş bırakılırsa hesaplanan değerin altındaki ilk yaygın şönt değeri kullanılır (1–1,5–2–2,5–3–4–5–6–7,5 × 10ⁿ).',
    shn_tol: 'Tolerans',
    shn_tcr: 'Sıcaklık katsayısı TCR',
    shn_tcrInfo: 'Metal şerit şöntler 15–75 ppm/K, kalın film akım ölçüm dirençleri 75–200 ppm/K tipiktir. Bakır izle yapılan şönt ≈ 3900 ppm/K’dir.',
    shn_dT: 'Sıcaklık değişimi ΔT',
    shn_dTInfo: 'Kalibrasyon sıcaklığına göre şöntün sıcaklık değişimi: kendi ısınması + ortam değişimi.',
    shn_tamb: 'Ortam sıcaklığı (güç azaltma)',
    shn_tambInfo: 'Tipik şönt dirençleri 70 °C’ye kadar tam güç taşır, 170 °C’de sıfıra iner (doğrusal). Kendi parçanızın veri sayfasındaki eğriyi kontrol edin.',
    shn_ampTitle: 'Yükselteç hataları',
    shn_vos: 'Giriş ofset gerilimi Vos',
    shn_vosInfo: 'Veri sayfasındaki en büyük değer; ör. INA180 ±150 µV, INA240 ±25 µV, sıfır kaymalı (zero-drift) yükselteçler ±10 µV civarı.',
    shn_ge: 'Kazanç hatası',
    shn_r: 'Şönt direnci',
    shn_rSub: 'hesaplanan {r}',
    shn_rUserSub: 'sizin değeriniz · hesaplanan {r}',
    shn_p: 'Imax’ta güç',
    shn_pSub: 'önerilen güç sınıfı {w}',
    shn_noRating: '5 W üstü',
    shn_lsb: 'Akım çözünürlüğü (1 LSB)',
    shn_lsbSub: 'tam ölçek {i}',
    shn_chainTitle: 'Ölçüm zinciri',
    shn_vSense: 'Imax’ta şönt gerilimi',
    shn_vAmp: 'Imax’ta yükselteç çıkışı',
    shn_usePct: 'Kullanılan ADC aralığı',
    shn_code: 'Imax’ta ADC kodu',
    shn_iFs: 'Ölçülebilen en büyük akım (ADC tam ölçek)',
    shn_drop: 'Beslemeye göre gerilim düşümü',
    shn_powerTitle: 'Güç',
    shn_pw: 'Imax²·R',
    shn_derate: 'Güç azaltma katsayısı ({t})',
    shn_rating: 'Önerilen güç sınıfı (2× pay)',
    shn_errTitle: 'Hata bütçesi (okunan değerin yüzdesi)',
    shn_errCol: 'Akım',
    shn_eTol: 'Tolerans',
    shn_eTcr: 'TCR × ΔT',
    shn_eGain: 'Yükselteç kazanç hatası',
    shn_eOff: 'Ofset Vos / (I·R)',
    shn_eQ: 'Nicemleme ±½ LSB',
    shn_eWc: 'En kötü durum (toplam)',
    shn_eRss: 'İstatistiksel (RSS)',
    shn_kelvin: 'Kelvin (4 telli) bağlantı: ölçüm izlerini şönt pedlerinin iç kenarından ayrı bir çift olarak çıkarın ve yükseltece yan yana götürün. Akım taşıyan bakırın ve lehimin direnci (1 mΩ civarı olabilir) bu sayede ölçüme girmez. Mümkünse dört uçlu şönt kullanın ve yükseltecin girişine küçük bir RC filtre ekleyin.',
    shn_note: 'Şönt değeri, hesaplanan değerin altındaki ilk yaygın değere yuvarlanır; böylece Imax’ta tam ölçek aşılmaz. Ofset hatası küçük akımlarda büyür; bu yüzden tablo Imax/10’daki hatayı da gösterir. Şönt ısındıkça direnci TCR ile değişir.',
    warn_shn_clip: 'Imax’ta yükselteç çıkışı ({v}) ADC tam ölçeğini aşıyor: büyük akımlarda okuma doyar. Kazancı ya da şönt değerini düşürün.',
    warn_shn_lowUse: 'Imax’ta ADC aralığının yalnızca {p} kullanılıyor: çözünürlük boşa gidiyor. Kazancı artırın.',
    warn_shn_power: 'Şöntte {p} harcanıyor: büyük kılıf (2512 veya daha büyük), geniş bakır alan ve termal tasarım gerekir; şönt gerilimini düşürmeyi düşünün.',
    warn_shn_noRating: 'Bu güç ve ortam sıcaklığı için listedeki dirençler yetmiyor (5 W üstü). Şönt gerilimini düşürün ya da güç şöntü kullanın.',
    warn_shn_offset: 'Imax’ta bile ofset hatası {e}; şönt gerilimi yükseltecin ofsetine göre küçük. Daha büyük şönt gerilimi ya da düşük ofsetli (zero-drift) yükselteç seçin.',
    warn_shn_drop: 'Şönt beslemenin {p} kadarını düşürüyor; yük daha düşük gerilim görür.',
    warn_shn_tiny: 'Şönt 0,5 mΩ’un altında: pedlerin ve lehimin direnci şönt ile karşılaştırılabilir. Dört uçlu (Kelvin) bir şönt kullanın.',
    warn_shn_gndShift: 'Düşük taraf şönt, yükün toprağını Imax’ta {v} kaldırıyor; yük başka devrelerle haberleşiyorsa bu kayma sorun olabilir.',
    warn_shn_highCm: 'Yüksek taraf ölçüm: yükseltecin ortak mod aralığı {v} beslemeyi kapsamalıdır (ör. INA180: 26 V’a kadar, INA240: 80 V’a kadar).',
    shn_dg: 'Şönt yerleşimi: besleme, yük ve şönt, Kelvin ölçüm izleriyle bağlanmış akım ölçüm yükselteci ve ADC',
    shn_dgPcb: 'PCB’de Kelvin bağlantısı: akım kalın bakırdan akar, ölçüm izleri pedlerin iç kenarından ayrı bir çift olarak çıkar',
    shn_dgLoad: 'Yük',
    shn_dgKelvin: 'Kelvin',
    shn_dgToAmp: 'yükseltece',
    shn_dgCurrent: 'akım',
  },
  en: {
    shn_sizing: 'Shunt value set by',
    shn_byVs: 'Full-scale sense voltage',
    shn_byAdc: 'ADC range and gain',
    shn_sizingInfo: 'Choosing the sense voltage is a trade-off: a larger voltage reduces the offset error but increases the power loss and the drop seen by the load. 50–100 mV full scale is typical. If the monitor IC has a fixed input range (e.g. 81.92 mV for the INA226), enter that.',
    shn_place: 'Placement',
    shn_low: 'Low side (ground side)',
    shn_high: 'High side (supply side)',
    shn_placeInfo: 'Low-side sensing is simple (common mode ≈ 0 V) but lifts the load ground by the shunt voltage and cannot detect a short to ground. High-side sensing keeps the load grounded, but the amplifier common-mode range must include the supply voltage.',
    shn_inTitle: 'Current and signal chain',
    shn_imax: 'Maximum current Imax',
    shn_vsfs: 'Shunt voltage at Imax',
    shn_vfs: 'ADC full scale (Vref)',
    shn_gain: 'Amplifier gain G',
    shn_gainInfo: 'Gain of the current-sense amplifier (e.g. INA180/INA240 variants: 20, 50, 100, 200 V/V). Enter 1 without an amplifier.',
    shn_use: 'ADC range used at Imax',
    shn_useInfo: 'Leave margin for overcurrent, tolerance and transients; 80–90 % is typical.',
    shn_bits: 'ADC resolution',
    shn_vbus: 'Supply (bus) voltage',
    shn_vbusInfo: 'Used for the shunt drop relative to the supply; for high-side sensing this is also the amplifier common-mode voltage.',
    shn_shuntTitle: 'Shunt resistor',
    shn_rUser: 'Your shunt value',
    shn_rUserInfo: 'Leave empty to use the first common shunt value below the calculated one (1–1.5–2–2.5–3–4–5–6–7.5 × 10ⁿ).',
    shn_tol: 'Tolerance',
    shn_tcr: 'Temperature coefficient TCR',
    shn_tcrInfo: 'Metal-strip shunts are typically 15–75 ppm/K, thick-film current-sense resistors 75–200 ppm/K. A copper-trace shunt is ≈ 3900 ppm/K.',
    shn_dT: 'Temperature change ΔT',
    shn_dTInfo: 'Change of the shunt temperature from calibration: self-heating plus ambient change.',
    shn_tamb: 'Ambient temperature (derating)',
    shn_tambInfo: 'Typical shunt resistors carry full power up to 70 °C, falling linearly to zero at 170 °C. Check the curve in your part’s datasheet.',
    shn_ampTitle: 'Amplifier errors',
    shn_vos: 'Input offset voltage Vos',
    shn_vosInfo: 'Datasheet maximum; e.g. INA180 ±150 µV, INA240 ±25 µV, zero-drift amplifiers around ±10 µV.',
    shn_ge: 'Gain error',
    shn_r: 'Shunt resistor',
    shn_rSub: 'calculated {r}',
    shn_rUserSub: 'your value · calculated {r}',
    shn_p: 'Power at Imax',
    shn_pSub: 'suggested rating {w}',
    shn_noRating: 'above 5 W',
    shn_lsb: 'Current resolution (1 LSB)',
    shn_lsbSub: 'full scale {i}',
    shn_chainTitle: 'Signal chain',
    shn_vSense: 'Shunt voltage at Imax',
    shn_vAmp: 'Amplifier output at Imax',
    shn_usePct: 'ADC range used',
    shn_code: 'ADC code at Imax',
    shn_iFs: 'Largest measurable current (ADC full scale)',
    shn_drop: 'Drop relative to the supply',
    shn_powerTitle: 'Power',
    shn_pw: 'Imax²·R',
    shn_derate: 'Derating factor ({t})',
    shn_rating: 'Suggested power rating (2× margin)',
    shn_errTitle: 'Error budget (percent of reading)',
    shn_errCol: 'Current',
    shn_eTol: 'Tolerance',
    shn_eTcr: 'TCR × ΔT',
    shn_eGain: 'Amplifier gain error',
    shn_eOff: 'Offset Vos / (I·R)',
    shn_eQ: 'Quantisation ±½ LSB',
    shn_eWc: 'Worst case (sum)',
    shn_eRss: 'Statistical (RSS)',
    shn_kelvin: 'Kelvin (4-wire) connection: take the sense traces from the inner edge of the shunt pads as a separate pair and route them side by side to the amplifier. That keeps the resistance of the current-carrying copper and solder (which can be around 1 mΩ) out of the measurement. Prefer a four-terminal shunt and add a small RC filter at the amplifier input.',
    shn_note: 'The shunt is rounded down to the first common value below the calculated one, so full scale is not exceeded at Imax. Offset error grows at small currents, which is why the table also shows the error at Imax/10. As the shunt heats up, its resistance changes by the TCR.',
    warn_shn_clip: 'At Imax the amplifier output ({v}) exceeds the ADC full scale: readings saturate at high current. Reduce the gain or the shunt value.',
    warn_shn_lowUse: 'Only {p} of the ADC range is used at Imax: resolution is wasted. Increase the gain.',
    warn_shn_power: 'The shunt dissipates {p}: it needs a large package (2512 or bigger), generous copper and thermal design; consider a lower sense voltage.',
    warn_shn_noRating: 'No listed rating covers this power at this ambient temperature (above 5 W). Lower the sense voltage or use a power shunt.',
    warn_shn_offset: 'Even at Imax the offset error is {e}; the sense voltage is small compared with the amplifier offset. Use a larger sense voltage or a low-offset (zero-drift) amplifier.',
    warn_shn_drop: 'The shunt drops {p} of the supply; the load sees a lower voltage.',
    warn_shn_tiny: 'The shunt is below 0.5 mΩ: pad and solder resistance are comparable to it. Use a four-terminal (Kelvin) shunt.',
    warn_shn_gndShift: 'The low-side shunt lifts the load ground by {v} at Imax; this shift can matter if the load communicates with other circuits.',
    warn_shn_highCm: 'High-side sensing: the amplifier common-mode range must include the {v} supply (e.g. INA180 up to 26 V, INA240 up to 80 V).',
    shn_dg: 'Shunt placement: supply, load and shunt, with the current-sense amplifier on Kelvin sense traces and the ADC',
    shn_dgPcb: 'Kelvin connection on the PCB: current flows in the wide copper, the sense traces leave the inner pad edges as a separate pair',
    shn_dgLoad: 'Load',
    shn_dgKelvin: 'Kelvin',
    shn_dgToAmp: 'to amplifier',
    shn_dgCurrent: 'current',
  },
};

const isSizing = (s) => (v) => v.sizing === s;
const val = (x, unit) => (Number.isFinite(x) && x > 0 ? si(x, unit, 3) : '?');
const pct = (x, sig = 3) => new Intl.NumberFormat(locale(), { style: 'percent', maximumSignificantDigits: sig }).format(x / 100);
const pm = (x) => `±${pct(Math.abs(x), 2)}`;
const SCALE = { A: 1, mA: 1e-3, mV: 1e-3, V: 1, uV: 1e-6, mohm: 1e-3, ohm: 1 };
const num = (x, u) => x * (SCALE[u] ?? 1);
const ratingLabel = (w) => (w === null ? t('shn_noRating') : w < 1 ? `${fmt(w * 1000, 3)} mW` : `${fmt(w)} W`);

// ---------------------------------------------------------------------------
// Diagrams
// ---------------------------------------------------------------------------

function placementDiagram(v, r) {
  const high = v.place === 'high';
  const yTop = 40;
  const yBot = 150;
  const xs = 34; // supply
  const xl = 400; // load
  const sx1 = 92; // shunt span
  const sx2 = 172;
  const ys = high ? yTop : yBot; // shunt rail
  let b = twoTerm('V', xs, yTop, xs, yBot, { name: 'Vbus', value: val(v.vbus, 'V') })
    + twoTerm('R', xl, yTop, xl, yBot, { name: t('shn_dgLoad'), value: val(r ? v.imaxA : NaN, 'A'), flip: true })
    + wire([xs, ys], [sx1, ys]) + wire([sx2, ys], [xl, ys])
    + wire([xs, high ? yBot : yTop], [xl, high ? yBot : yTop])
    + twoTerm('R', sx1, ys, sx2, ys, { hi: true })
    + text((sx1 + sx2) / 2, high ? ys - 12 : ys + 21, `Rs = ${val(r?.r, 'Ω')}`, { cls: 'val' })
    // System ground at the supply return (low side: on the supply side of the shunt).
    + node(64, yBot) + ground(64, yBot);
  // Current direction on the shunt rail.
  b += high
    ? arrow(196, ys - 9, 236, ys - 9, { cls: 'flow', headCls: 'arrow flow' }) + text(216, ys - 14, 'I', { cls: 'sym' })
    : arrow(236, ys + 9, 196, ys + 9, { cls: 'flow', headCls: 'arrow flow' }) + text(216, ys + 23, 'I', { cls: 'sym' });
  // Kelvin taps from the inner ends of the shunt body to the amplifier; the
  // + input goes to the end the current enters (supply side high, load side low).
  const xA = 118; // left tap
  const xB = 146; // right tap
  const ax = 192; // amplifier
  const ay = 96;
  const xPlus = high ? xA : xB;
  const xMinus = high ? xB : xA;
  const tapY = high ? ys + 6.5 : ys - 6.5;
  b += opamp(ax, ay, { size: 40 })
    + path(`M${xMinus},${tapY}V${ay - 10}H${ax}`, 'flow') + path(`M${xPlus},${tapY}V${ay + 10}H${ax}`, 'flow')
    + circle(xA, tapY, 2.2, 'node') + circle(xB, tapY, 2.2, 'node')
    + text(113, high ? ys + 22 : ys - 14, t('shn_dgKelvin'), { cls: 'lbl', anchor: 'end' })
    + text(ax + 20, ay + 36, `G = ${Number.isFinite(v.gain) ? fmt(v.gain, 4) : '?'}`, { cls: 'val' })
    + wire([ax + 40, ay], [266, ay])
    + icBlock(266, ay - 20, 70, 40, 'ADC', `${Number.isInteger(v.bits) ? v.bits : '?'} bit`)
    + text(301, ay + 36, `${val(r?.vAmp, 'V')} @ Imax`, { cls: 'lbl' });
  return svg(440, 186, b, t('shn_dg'), { wide: true });
}

/** Top view of a two-pad shunt with wide current copper and the Kelvin pair from the inner pad edges. */
function pcbDiagram() {
  const y = 50;
  const trace = (d) => `<path class="cutr" style="stroke-width:3" d="${d}"/>`;
  return svg(440, 126,
    bar(30, y, 150, y, 26, 'cu') + bar(290, y, 410, y, 26, 'cu')
    + rect(150, y - 18, 40, 36, 'cu') + rect(250, y - 18, 40, 36, 'cu')
    + rect(172, y - 13, 96, 26, 'comp', ' rx="2"') + text(220, y + 4, 'Rs', { cls: 'name' })
    + trace(`M186,${y + 18}V84L206,96V122`) + trace(`M254,${y + 18}V84L234,96V122`)
    + text(246, 116, `↓ ${t('shn_dgToAmp')}`, { cls: 'lbl', anchor: 'start' })
    + text(262, 86, t('shn_dgKelvin'), { cls: 'val', anchor: 'start' })
    + arrow(60, y - 22, 120, y - 22, { cls: 'flow', headCls: 'arrow flow' }) + text(90, y - 28, t('shn_dgCurrent'), { cls: 'lbl' })
    + arrow(320, y - 22, 380, y - 22, { cls: 'flow', headCls: 'arrow flow' }),
    t('shn_dgPcb'), { wide: true });
}

const diagram = (v, u, r) => placementDiagram({ ...v, imaxA: num(v.imax, u.imax) }, r) + pcbDiagram();

// ---------------------------------------------------------------------------

export default {
  diagram,
  id: 'shunt',
  strings,
  sections: [
    {
      title: 'sectionSetup',
      fields: [
        { key: 'sizing', type: 'choice', label: 'shn_sizing', default: 'vs', info: 'shn_sizingInfo',
          options: [{ value: 'vs', label: 'shn_byVs' }, { value: 'adc', label: 'shn_byAdc' }] },
        { key: 'place', type: 'choice', label: 'shn_place', default: 'low', info: 'shn_placeInfo',
          options: [{ value: 'low', label: 'shn_low' }, { value: 'high', label: 'shn_high' }] },
      ],
    },
    {
      title: 'shn_inTitle',
      fields: [
        { key: 'imax', type: 'number', label: 'shn_imax', default: 5, units: ['A', 'mA'],
          presets: [0.5, 1, 5, 10, 20].map((x) => ({ label: `${x} A`, value: x, unit: 'A' })) },
        { key: 'vsfs', type: 'number', label: 'shn_vsfs', default: 50, units: ['mV'], show: isSizing('vs'), max: 10000,
          presets: [['50 mV', 50], ['75 mV', 75], ['81.92 mV', 81.92], ['100 mV', 100]].map(([label, value]) => ({ label, value })) },
        { key: 'gain', type: 'number', label: 'shn_gain', default: 50, units: ['V/V'], info: 'shn_gainInfo', max: 10000,
          presets: [1, 20, 50, 100, 200].map((x) => ({ label: String(x), value: x })) },
        { key: 'vfs', type: 'number', label: 'shn_vfs', default: 3.3, units: ['V'], max: 100,
          presets: [1.2, 2.5, 3.3, 5].map((x) => ({ label: `${x} V`, value: x })) },
        { key: 'use', type: 'number', label: 'shn_use', default: 90, units: ['pct'], min: 1, max: 100, info: 'shn_useInfo', show: isSizing('adc') },
        { key: 'bits', type: 'number', label: 'shn_bits', default: 12, units: ['bit'], integer: true, min: 4, max: 32,
          presets: [10, 12, 16].map((x) => ({ label: `${x} bit`, value: x })) },
        { key: 'vbus', type: 'number', label: 'shn_vbus', default: 12, units: ['V'], info: 'shn_vbusInfo' },
      ],
    },
    {
      title: 'shn_shuntTitle',
      fields: [
        { key: 'rsel', type: 'number', label: 'shn_rUser', default: '', units: ['mohm', 'ohm'], optional: true, si: true, info: 'shn_rUserInfo' },
        { key: 'tol', type: 'number', label: 'shn_tol', default: 1, units: ['pct'], valid: 'nonneg', max: 20,
          presets: [0.1, 0.5, 1].map((x) => ({ label: `${x} %`, value: x })) },
        { key: 'tcr', type: 'number', label: 'shn_tcr', default: 50, units: ['ppm/K'], valid: 'nonneg', info: 'shn_tcrInfo',
          presets: [15, 50, 100, 200].map((x) => ({ label: `${x} ppm/K`, value: x })) },
        { key: 'dT', type: 'number', label: 'shn_dT', default: 40, units: ['K'], valid: 'nonneg', info: 'shn_dTInfo' },
        { key: 'tamb', type: 'number', label: 'shn_tamb', default: 25, units: ['C'], valid: 'any', info: 'shn_tambInfo' },
      ],
    },
    {
      title: 'shn_ampTitle',
      fields: [
        { key: 'vos', type: 'number', label: 'shn_vos', default: 100, units: ['µV'], valid: 'nonneg', optional: true, info: 'shn_vosInfo' },
        { key: 'ge', type: 'number', label: 'shn_ge', default: 0.5, units: ['pct'], valid: 'nonneg', optional: true },
      ],
    },
  ],

  compute(v, u) {
    const imax = num(v.imax, u.imax);
    const r = shuntDesign({
      imax,
      sizing: v.sizing,
      vsFs: v.vsfs * 1e-3,
      vfs: v.vfs,
      gain: v.gain,
      use: v.use / 100,
      bits: v.bits,
      rUser: num(v.rsel, u.rsel),
      vbus: v.vbus,
      tAmb: v.tamb,
      tolPct: v.tol,
      tcrPpm: v.tcr,
      dT: v.dT,
      gainErrPct: v.ge,
      vos: v.vos * 1e-6,
    });
    const warnings = [];
    const vars = {
      shn_clip: { v: si(r.vAmp, 'V', 3) },
      shn_lowUse: { p: pct(r.usePct, 2) },
      shn_power: { p: si(r.p, 'W', 3) },
      shn_offset: { e: pm(r.errFull.offset) },
      shn_drop: { p: pct(r.dropPct, 2) },
      shn_gndShift: { v: si(r.vSense, 'V', 3) },
      shn_highCm: { v: si(v.vbus, 'V', 3) },
    };
    if (r.clip) warnings.push('shn_clip');
    else if (r.usePct < 50) warnings.push('shn_lowUse');
    if (r.rating === null) warnings.push('shn_noRating');
    else if (r.p > 1) warnings.push('shn_power');
    if (r.errFull.offset > 1) warnings.push('shn_offset');
    if (r.dropPct > 1) warnings.push('shn_drop');
    if (r.r < 0.5e-3) warnings.push('shn_tiny');
    if (v.place === 'low' && r.vSense > 0.1) warnings.push('shn_gndShift');
    if (v.place === 'high') warnings.push('shn_highCm');
    return { ok: true, ...r, imax, warnings, vars };
  },

  render(r, v) {
    if (!r.ok) return invalid(r.errors);
    const e = (k) => `${pm(r.errFull[k])} · ${pm(r.errLow[k])}`;
    return heroes([
      ['shn_r', siHtml(r.r, 'Ω'), esc(t(r.userR ? 'shn_rUserSub' : 'shn_rSub', { r: si(r.rExact, 'Ω', 3) }))],
      ['shn_p', siHtml(r.p, 'W'), esc(t('shn_pSub', { w: ratingLabel(r.rating) }))],
      ['shn_lsb', siHtml(r.lsbCurrent, 'A'), esc(t('shn_lsbSub', { i: si(r.iFs, 'A', 3) }))],
    ])
      + messages('warn', r.warnings, r.vars)
      + block('shn_chainTitle', rows([
        ['shn_vSense', si(r.vSense, 'V')],
        ['shn_vAmp', si(r.vAmp, 'V')],
        ['shn_usePct', pct(r.usePct)],
        ['shn_code', `${r.code} / ${2 ** v.bits - 1}`],
        ['shn_iFs', si(r.iFs, 'A')],
        Number.isFinite(r.dropPct) && ['shn_drop', pct(r.dropPct)],
      ]))
      + block('shn_powerTitle', rows([
        ['shn_pw', si(r.p, 'W')],
        [t('shn_derate', { t: `${fmt(v.tamb)} °C` }), fmt(r.derate, 3), false, true],
        ['shn_rating', esc(ratingLabel(r.rating)), true],
      ]))
      + block('shn_errTitle', rows([
        ['shn_errCol', `${si(r.imax, 'A', 3)} · ${si(r.imax / 10, 'A', 3)}`, true],
        ['shn_eTol', e('tol')],
        ['shn_eTcr', e('tcr')],
        r.errFull.gain > 0 && ['shn_eGain', e('gain')],
        r.errFull.offset > 0 && ['shn_eOff', e('offset')],
        ['shn_eQ', e('quant')],
        ['shn_eWc', e('wc'), true],
        ['shn_eRss', e('rss'), true],
      ]))
      + `<p class="note">${esc(t('shn_kelvin'))}</p>`
      + formulaBlock([
        v.sizing === 'adc' ? 'R = Vref · k / (G · Imax),   k = share of the ADC range used' : 'R = V_sense,FS / Imax',
        '→ first common shunt value ≤ R  (1, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5 × 10ⁿ)',
        'P = Imax² · R,   rating ≥ 2 · P / k_derate,   k_derate = 1 (≤ 70 °C) … 0 (170 °C)',
        'I_LSB = Vref / (2^N · G · R),   I_FS = Vref / (G · R)',
        'errors (% of reading): tol,  TCR · ΔT,  gain error,  Vos / (I · R),  ½ I_LSB / I',
        'worst case = Σ|e_i|,   RSS = √(Σ e_i²)',
      ], 'shn_note', [
        'Ohm’s and Joule’s laws',
        'Vishay Dale WSL series datasheet (power derating, TCR, 4-terminal Kelvin layout)',
        'TI INA180 / INA240 datasheets (current-sense amplifier gain error, offset, common-mode range)',
        `Derating model: 100 % ≤ ${DERATE.full} °C, 0 % at ${DERATE.zero} °C`,
      ]);
  },
};
