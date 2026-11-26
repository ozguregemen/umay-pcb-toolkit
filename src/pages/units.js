import {
  convertLength, convertCopper, convertTemperature, convertRfPower, convertDb, RF_UNITS, LENGTH_M,
  awgWire, nearestAwg, awgName, AWG_MIN, AWG_MAX, UM_PER_OZ, IPC_MIL_PER_OZ, GSM_PER_OZ, RHO_CU_20,
} from '../engine/convert.js';
import { hero, heroes, rows, steps, messages, invalid } from '../ui/calculator.js';
import { tx } from '../ui/math.js';
import { fmt, fixed, si, siHtml, esc } from '../ui/format.js';
import { t, locale } from '../i18n.js';

const strings = {
  tr: {
    un_mLen: 'Uzunluk',
    un_mCu: 'Bakır ağırlığı',
    un_mTemp: 'Sıcaklık',
    un_mRf: 'RF güç',
    un_mDb: 'dB oranı',
    un_len: 'Uzunluk',
    un_cu: 'Bakır ağırlığı ya da kalınlığı',
    un_temp: 'Sıcaklık',
    un_rf: 'Güç ya da seviye',
    un_rfHint: 'Sinüs işaret varsayılır (Vpp = 2√2 · Vrms)',
    un_z: 'Empedans',
    un_db: 'Değer',
    un_dbHint: 'Güç oranı için 10·log₁₀, gerilim oranı için 20·log₁₀',
    un_awg: 'AWG numarası ya da tel ölçüsü',
    un_awgHint: '1/0 = 0, 2/0 = −1, 3/0 = −2, 4/0 = −3; mm, inç, mil = çap, mm² = kesit',
    un_lmm: 'Milimetre',
    un_lmil: 'Mil (thou, 0,001 inç)',
    un_lin: 'İnç',
    un_lum: 'Mikrometre',
    un_lcm: 'Santimetre',
    un_lm: 'Metre',
    un_cuOz: 'Ağırlık',
    un_cuUm: 'Kalınlık (µm)',
    un_cuMil: 'Kalınlık (mil)',
    un_cuMm: 'Kalınlık (mm)',
    un_cuGsm: 'Birim alan kütlesi',
    un_cuIpc: 'IPC-2221 kalınlığı (1 oz = 1,378 mil)',
    un_tC: 'Celsius',
    un_tF: 'Fahrenheit',
    un_tK: 'Kelvin',
    un_rfDbm: 'Seviye (1 mW’a göre)',
    un_rfDbw: 'Seviye (1 W’a göre)',
    un_rfVrms: 'Gerilim (RMS)',
    un_rfVpk: 'Gerilim (tepe)',
    un_rfVpp: 'Gerilim (tepeden tepeye)',
    un_rfDbuv: 'Gerilim seviyesi (1 µV’a göre)',
    un_rfDbmv: 'Gerilim seviyesi (1 mV’a göre)',
    un_rfIrms: 'Akım (RMS)',
    un_dbDb: 'Desibel',
    un_dbPower: 'Güç oranı P₂/P₁',
    un_dbVoltage: 'Gerilim oranı V₂/V₁',
    un_dbPowerPct: 'Güç oranı (yüzde)',
    un_dbVoltagePct: 'Gerilim oranı (yüzde)',
    un_awgGauge: 'AWG',
    un_awgNearest: 'En yakın AWG',
    un_awgExact: 'Kesirli AWG',
    un_awgInput: 'Girilen çap',
    un_awgD: 'Çap',
    un_awgArea: 'Kesit alanı',
    un_awgRm: 'Direnç (20 °C)',
    un_awgRkm: 'Direnç (20 °C, km başına)',
    un_awgRkft: 'Direnç (20 °C, 1000 ft başına)',
    un_noteLen: '1 inç = 25,4 mm (tanım gereği tam), 1 mil = 0,001 inç = 25,4 µm.',
    un_noteCu: 'oz/ft² aslında birim alan kütlesidir (1 oz/ft² = 305,15 g/m²); kalınlık bakır yoğunluğuna bağlıdır. Burada nominal 1 oz = 34,79 µm kullanılır; IPC-2221 hesapları 1 oz = 1,378 mil (35,0 µm) alır. Kaplama ve işlemlerden sonra gerçek kalınlık farklı olabilir.',
    un_noteTemp: 'Mutlak sıcaklık dönüşümüdür. Sıcaklık farklarında 1 K = 1 °C = 1,8 °F.',
    un_noteRf: 'Değerler sinüs işaret ve girilen empedansa uyumlu yük içindir. 50 Ω’da 0 dBm = 223,6 mV RMS ≈ 107 dBµV.',
    un_noteDb: 'dB, güç oranı için 10·log₁₀(P₂/P₁); gerilim (genlik) oranı için aynı empedansta 20·log₁₀(V₂/V₁) olarak tanımlanır.',
    un_noteAwg: 'Çap ASTM B258 formülünden hesaplanır. Direnç 20 °C’deki tavlanmış bakır (ρ = 1,724·10⁻⁸ Ω·m, IEC 60028) ve tek telli iletken içindir; örgülü kablolarda çap ve direnç biraz daha büyüktür.',
    un_stepAwgNear: 'Kesirli değerin altındaki ve üstündeki tam numaralardan çapı girilen çapa en yakın olan seçilir (4/0 – 40 aralığında).',
    warn_un_awgClamped: 'Bu ölçü AWG 4/0 – 40 aralığının dışında; aralığın en yakın ucu gösteriliyor.',
    err_un_absZero: 'Sıcaklık mutlak sıfırın (−273,15 °C) altında olamaz.',
    err_un_positive: 'Bu birimde değer sıfırdan büyük olmalı.',
    err_un_awgRange: 'AWG numarası −3 (4/0) ile 40 arasında bir tam sayı olmalı.',
  },
  en: {
    un_mLen: 'Length',
    un_mCu: 'Copper weight',
    un_mTemp: 'Temperature',
    un_mRf: 'RF power',
    un_mDb: 'dB ratio',
    un_len: 'Length',
    un_cu: 'Copper weight or thickness',
    un_temp: 'Temperature',
    un_rf: 'Power or level',
    un_rfHint: 'Assumes a sine wave (Vpp = 2√2 · Vrms)',
    un_z: 'Impedance',
    un_db: 'Value',
    un_dbHint: '10·log₁₀ for power ratios, 20·log₁₀ for voltage ratios',
    un_awg: 'AWG number or wire size',
    un_awgHint: '1/0 = 0, 2/0 = −1, 3/0 = −2, 4/0 = −3; mm, in, mil = diameter, mm² = cross-section',
    un_lmm: 'Millimetre',
    un_lmil: 'Mil (thou, 0.001 in)',
    un_lin: 'Inch',
    un_lum: 'Micrometre',
    un_lcm: 'Centimetre',
    un_lm: 'Metre',
    un_cuOz: 'Weight',
    un_cuUm: 'Thickness (µm)',
    un_cuMil: 'Thickness (mil)',
    un_cuMm: 'Thickness (mm)',
    un_cuGsm: 'Areal mass',
    un_cuIpc: 'IPC-2221 thickness (1 oz = 1.378 mil)',
    un_tC: 'Celsius',
    un_tF: 'Fahrenheit',
    un_tK: 'Kelvin',
    un_rfDbm: 'Level (re 1 mW)',
    un_rfDbw: 'Level (re 1 W)',
    un_rfVrms: 'Voltage (RMS)',
    un_rfVpk: 'Voltage (peak)',
    un_rfVpp: 'Voltage (peak-to-peak)',
    un_rfDbuv: 'Voltage level (re 1 µV)',
    un_rfDbmv: 'Voltage level (re 1 mV)',
    un_rfIrms: 'Current (RMS)',
    un_dbDb: 'Decibels',
    un_dbPower: 'Power ratio P₂/P₁',
    un_dbVoltage: 'Voltage ratio V₂/V₁',
    un_dbPowerPct: 'Power ratio (percent)',
    un_dbVoltagePct: 'Voltage ratio (percent)',
    un_awgGauge: 'AWG',
    un_awgNearest: 'Nearest AWG',
    un_awgExact: 'Fractional AWG',
    un_awgInput: 'Diameter entered',
    un_awgD: 'Diameter',
    un_awgArea: 'Cross-section',
    un_awgRm: 'Resistance (20 °C)',
    un_awgRkm: 'Resistance (20 °C, per km)',
    un_awgRkft: 'Resistance (20 °C, per 1000 ft)',
    un_noteLen: '1 in = 25.4 mm (exact by definition), 1 mil = 0.001 in = 25.4 µm.',
    un_noteCu: 'oz/ft² is really an areal mass (1 oz/ft² = 305.15 g/m²); the thickness depends on copper density. The nominal 1 oz = 34.79 µm is used here; IPC-2221 calculations take 1 oz = 1.378 mil (35.0 µm). Actual thickness after plating and processing may differ.',
    un_noteTemp: 'Absolute temperature conversion. For temperature differences 1 K = 1 °C = 1.8 °F.',
    un_noteRf: 'Values assume a sine wave into a load matched to the impedance entered. At 50 Ω, 0 dBm = 223.6 mV RMS ≈ 107 dBµV.',
    un_noteDb: 'dB is 10·log₁₀(P₂/P₁) for a power ratio and 20·log₁₀(V₂/V₁) for a voltage (amplitude) ratio at equal impedance.',
    un_noteAwg: 'Diameter from the ASTM B258 formula. Resistance is for solid annealed copper at 20 °C (ρ = 1.724·10⁻⁸ Ω·m, IEC 60028); stranded wire has a slightly larger diameter and resistance.',
    un_stepAwgNear: 'Of the whole gauges just below and just above the fractional value, the one whose diameter is closest to the entered diameter is taken (within 4/0 – 40).',
    warn_un_awgClamped: 'This size is outside AWG 4/0 – 40; the nearest end of the range is shown.',
    err_un_absZero: 'Temperature cannot be below absolute zero (−273.15 °C).',
    err_un_positive: 'In this unit the value must be greater than zero.',
    err_un_awgRange: 'The AWG number must be a whole number from −3 (4/0) to 40.',
  },
};

const DB_UNITS = ['dB', 'P₂/P₁', 'V₂/V₁'];
const DB_KIND = { dB: 'dB', 'P₂/P₁': 'pr', 'V₂/V₁': 'vr' };
const LEN_ROWS = [['mm', 'un_lmm', 'mm'], ['mil', 'un_lmil', 'mil'], ['in', 'un_lin', 'in'], ['um', 'un_lum', 'µm'], ['cm', 'un_lcm', 'cm'], ['m', 'un_lm', 'm']];
const isMode = (m) => (v) => v.mode === m;
const num = (x, unit, sig = 6) => `${fmt(x, sig)} ${unit}`;
const numHtml = (x, unit, sig = 6) => `${fmt(x, sig)} <span class="u">${esc(unit)}</span>`;
const pctOf = (x) => new Intl.NumberFormat(locale(), { style: 'percent', maximumSignificantDigits: 5 }).format(x);

function diameterMm(value, unit) {
  switch (unit) {
    case 'in': return value * 25.4;
    case 'mil': return value * 0.0254;
    case 'mm2': return value > 0 ? Math.sqrt((4 * value) / Math.PI) : NaN;
    default: return value;
  }
}

// Values as they appear inside the calculation steps.
const q = (x, unit, sig = 6) => tx(num(x, unit, sig));
const LEN_UNIT = Object.fromEntries(LEN_ROWS.map(([k, , unit]) => [k, unit]));
const LEN_LABEL = Object.fromEntries(LEN_ROWS.map(([k, label]) => [k, label]));
/** The two conversions shown as steps for each input unit; the first is the headline value. */
const LEN_STEPS = { mm: ['mil', 'in'], mil: ['mm', 'um'], in: ['mm', 'mil'], um: ['mm', 'mil'], cm: ['mm', 'in'], m: ['mm', 'in'] };

function renderLength(r, v) {
  const top = r.unit === 'mm' ? ['un_lmil', 'mil', r.vals.mil] : ['un_lmm', 'mm', r.vals.mm];
  // The engine goes through metres: value · (metres per input unit) / (metres per target unit).
  const from = LEN_UNIT[r.unit];
  const metres = (k) => tx(`${fmt(LENGTH_M[k], 6)} m`);
  const one = (k) => tx(`1 ${LEN_UNIT[k]}`);
  const toM = r.unit === 'm' ? '' : ` \\cdot \\frac{${metres(r.unit)}}{${one(r.unit)}}`;
  const worked = steps(LEN_STEPS[r.unit].map((k) => ({
    label: LEN_LABEL[k],
    sym: `ℓ_{${LEN_UNIT[k]}} = ℓ_{${from}}${toM} \\cdot \\frac{${one(k)}}{${metres(k)}}`,
    num: `${q(v.len, from)}${toM} \\cdot \\frac{${one(k)}}{${metres(k)}}`,
    res: q(r.vals[k], LEN_UNIT[k]),
  })), { note: 'un_noteLen', refs: ['NIST SP 811 (2008), Appendix B'], where: [[`ℓ_{${from}}`, 'un_len', 'len']] });
  return hero(top[0], numHtml(top[2], top[1]))
    + worked
    + rows(LEN_ROWS.map(([k, label, unit]) => [label, num(r.vals[k], unit)]));
}

function renderCopper(r, v) {
  const c = r.vals;
  const top = r.unit === 'oz' ? hero('un_cuUm', numHtml(c.um, 'µm', 4), `${fmt(c.mil, 4)} mil`) : hero('un_cuOz', numHtml(c.oz, 'oz/ft²', 4));
  // Everything goes through the thickness in µm, as in convertCopper().
  const w = q(c.oz, 'oz', 5);
  const um = q(c.um, 'µm', 5);
  // Conversion factors written as "this much per that much", so the units cancel visibly.
  const per = (a, b) => `\\frac{${tx(a)}}{${tx(b)}}`;
  const umPerOz = per(`${fmt(UM_PER_OZ)} µm`, '1 oz');
  const ozPerUm = per('1 oz', `${fmt(UM_PER_OZ)} µm`);
  const umPerMil = per(`${fmt(25.4)} µm`, '1 mil');
  const milPerUm = per('1 mil', `${fmt(25.4)} µm`);
  const umPerMm = per('1000 µm', '1 mm');
  const ipcPerOz = per(`${fmt(IPC_MIL_PER_OZ)} mil`, '1 oz');
  const gsmPerOz = per(`${fmt(GSM_PER_OZ, 5)} g/m²`, '1 oz');
  const input = { oz: 'w', um: 't', mil: 't_{mil}', mm: 't_{mm}' }[r.unit];
  const worked = steps([
    r.unit === 'oz' && { label: 'un_cuUm', sym: `t = w \\cdot ${umPerOz}`, num: `${w} \\cdot ${umPerOz}`, res: um },
    r.unit === 'oz' && { label: 'un_cuMil', sym: `t_{mil} = t \\cdot ${milPerUm}`, num: `${um} \\cdot ${milPerUm}`, res: q(c.mil, 'mil', 5) },
    r.unit === 'mil' && { label: 'un_cuUm', sym: `t = t_{mil} \\cdot ${umPerMil}`, num: `${q(v.cu, 'mil')} \\cdot ${umPerMil}`, res: um },
    r.unit === 'mm' && { label: 'un_cuUm', sym: `t = t_{mm} \\cdot ${umPerMm}`, num: `${q(v.cu, 'mm')} \\cdot ${umPerMm}`, res: um },
    r.unit !== 'oz' && { label: 'un_cuOz', sym: `w = t \\cdot ${ozPerUm}`, num: `${um} \\cdot ${ozPerUm}`, res: w },
    { label: 'un_cuIpc', sym: `t_{IPC} = w \\cdot ${ipcPerOz}`, num: `${w} \\cdot ${ipcPerOz}`, res: q(c.ipcMil, 'mil', 5) },
    { label: 'un_cuGsm', sym: `m_{A} = w \\cdot ${gsmPerOz}`, num: `${w} \\cdot ${gsmPerOz}`, res: q(c.gsm, 'g/m²', 5) },
  ], { note: 'un_noteCu', refs: ['IPC-2221B (1 oz/ft² = 1.378 mil)'], where: [[input, 'un_cu', 'cu']] });
  return top
    + worked
    + rows([
      ['un_cuOz', num(c.oz, 'oz/ft²', 5)],
      ['un_cuUm', num(c.um, 'µm', 5)],
      ['un_cuMil', num(c.mil, 'mil', 5)],
      ['un_cuMm', num(c.mm, 'mm', 5)],
      ['un_cuGsm', num(c.gsm, 'g/m²', 5)],
      ['un_cuIpc', `${fmt(c.ipcMil, 5)} mil · ${fmt(c.ipcUm, 5)} µm`],
    ]);
}

function renderTemperature(r) {
  const top = r.unit === 'C' ? ['un_tF', '°F', r.F] : ['un_tC', '°C', r.C];
  const C = q(r.C, '°C');
  const F = q(r.F, '°F');
  const K = q(r.K, 'K');
  const zero = fmt(273.15, 5);
  const toF = { label: 'un_tF', sym: 'T_{F} = T_{C} \\cdot \\frac{9}{5} + 32', num: `${C} \\cdot \\frac{9}{5} + 32`, res: F };
  const toK = { label: 'un_tK', sym: `T_{K} = T_{C} + ${zero}`, num: `${C} + ${zero}`, res: K };
  // The engine converts the input to °C first and derives the other two from it.
  const list = r.unit === 'C' ? [toF, toK]
    : r.unit === 'F' ? [{ label: 'un_tC', sym: 'T_{C} = (T_{F} − 32) \\cdot \\frac{5}{9}', num: `(${F} − 32) \\cdot \\frac{5}{9}`, res: C }, toK]
      : [{ label: 'un_tC', sym: `T_{C} = T_{K} − ${zero}`, num: `${K} − ${zero}`, res: C }, toF];
  return hero(top[0], numHtml(top[2], top[1]))
    + steps(list, { note: 'un_noteTemp', refs: ['NIST SP 811 (2008)'], where: [[`T_{${r.unit}}`, 'un_temp', 'temp']] })
    + rows([['un_tC', num(r.C, '°C')], ['un_tF', num(r.F, '°F')], ['un_tK', num(r.K, 'K')]]);
}

function renderRf(r, v) {
  const top = r.unit === 'dBm'
    ? hero('power', siHtml(r.W, 'W', 5), `${si(r.vrms, 'V', 5)} RMS · ${fmt(v.z)} Ω`)
    : hero('un_rfDbm', numHtml(r.dBm, 'dBm', 5), `${fmt(v.z)} Ω`);
  // The engine turns the input into power first; every other value follows from P and Z.
  const P = tx(si(r.W, 'W', 5));
  const Z = tx(si(v.z, 'Ω', 5));
  const Vrms = tx(si(r.vrms, 'V', 5));
  const L = tx(fmt(v.rf, 6));
  const mW = tx('1 mW');
  const uV = tx('1 µV');
  const toPower = {
    dBm: { sym: `P = ${mW} \\cdot 10^{L / 10}`, num: `${mW} \\cdot 10^{\\frac{${L}}{10}}` },
    dBW: { sym: `P = ${tx('1 W')} \\cdot 10^{L / 10}`, num: `${tx('1 W')} \\cdot 10^{\\frac{${L}}{10}}` },
    Vrms: { sym: 'P = \\frac{V_{rms}^{2}}{Z}', num: `\\frac{{(${tx(si(v.rf, 'V', 6))})}^{2}}{${Z}}` },
    Vpp: { sym: 'P = \\frac{(V_{pp} / (2 \\sqrt{2}))^{2}}{Z}', num: `\\frac{{(\\frac{${tx(si(v.rf, 'V', 6))}}{2 \\sqrt{2}})}^{2}}{${Z}}` },
    'dBµV': { sym: `P = \\frac{(${uV} \\cdot 10^{L / 20})^{2}}{Z}`, num: `\\frac{{(${uV} \\cdot 10^{\\frac{${L}}{20}})}^{2}}{${Z}}` },
  }[r.unit];
  const input = { dBm: 'L', dBW: 'L', 'dBµV': 'L', W: 'P', mW: 'P', Vrms: 'V_{rms}', Vpp: 'V_{pp}' }[r.unit];
  const worked = steps([
    toPower && { label: 'power', ...toPower, res: P },
    r.unit !== 'dBm' && { label: 'un_rfDbm', sym: `L_{dBm} = 10 \\cdot \\log_{10}(\\frac{P}{${mW}})`, num: `10 \\cdot \\log_{10}(\\frac{${P}}{${mW}})`, res: tx(`${fmt(r.dBm, 5)} dBm`) },
    r.unit !== 'Vrms' && { label: 'un_rfVrms', sym: 'V_{rms} = \\sqrt{P \\cdot Z}', num: `\\sqrt{${P} \\cdot ${Z}}`, res: Vrms },
    r.unit !== 'Vpp' && { label: 'un_rfVpp', sym: 'V_{pp} = 2 \\sqrt{2} \\cdot V_{rms}', num: `2 \\sqrt{2} \\cdot ${Vrms}`, res: tx(si(r.vpp, 'V', 5)) },
    r.unit !== 'dBµV' && { label: 'un_rfDbuv', sym: `L_{dBµV} = 20 \\cdot \\log_{10}(\\frac{V_{rms}}{${uV}})`, num: `20 \\cdot \\log_{10}(\\frac{${Vrms}}{${uV}})`, res: tx(`${fmt(r.dBuV, 5)} dBµV`) },
  ], { note: 'un_noteRf', refs: ['IEC 60027-3 (logarithmic quantities)'], where: [[input, 'un_rf', 'rf'], ['Z', 'un_z', 'z']] });
  return top
    + worked
    + rows([
      ['un_rfDbm', `${fixed(r.dBm, 2)} dBm`],
      ['un_rfDbw', `${fixed(r.dBW, 2)} dBW`],
      ['power', si(r.W, 'W', 5)],
      ['un_rfVrms', si(r.vrms, 'V', 5)],
      ['un_rfVpk', si(r.vpk, 'V', 5)],
      ['un_rfVpp', si(r.vpp, 'V', 5)],
      ['un_rfDbuv', `${fixed(r.dBuV, 2)} dBµV`],
      ['un_rfDbmv', `${fixed(r.dBmV, 2)} dBmV`],
      ['un_rfIrms', si(r.irms, 'A', 5)],
    ]);
}

function renderDb(r, v) {
  const top = r.unit === 'dB'
    ? heroes([['un_dbPower', `${fmt(r.power, 5)} <span class="u">×</span>`], ['un_dbVoltage', `${fmt(r.voltage, 5)} <span class="u">×</span>`]])
    : hero('un_dbDb', numHtml(r.dB, 'dB', 5));
  // The engine turns a ratio into dB first; both ratios then follow from the dB value.
  const L = tx(fmt(r.dB, 5));
  const entered = tx(fmt(v.db, 6));
  const pSym = '\\frac{P_{2}}{P_{1}}';
  const vSym = '\\frac{V_{2}}{V_{1}}';
  // A ratio beyond the number range (hundreds of dB) has no step.
  const toPower = Number.isFinite(r.power) && { label: 'un_dbPower', sym: `${pSym} = 10^{L / 10}`, num: `10^{\\frac{${L}}{10}}`, res: tx(fmt(r.power, 5)) };
  const toVoltage = Number.isFinite(r.voltage) && { label: 'un_dbVoltage', sym: `${vSym} = 10^{L / 20}`, num: `10^{\\frac{${L}}{20}}`, res: tx(fmt(r.voltage, 5)) };
  const dbRes = tx(`${fmt(r.dB, 5)} dB`);
  const list = (r.unit === 'dB' ? [toPower, toVoltage]
    : r.unit === 'P₂/P₁' ? [{ label: 'un_dbDb', sym: `L = 10 \\cdot \\log_{10}(${pSym})`, num: `10 \\cdot \\log_{10}(${entered})`, res: dbRes }, toVoltage]
      : [{ label: 'un_dbDb', sym: `L = 20 \\cdot \\log_{10}(${vSym})`, num: `20 \\cdot \\log_{10}(${entered})`, res: dbRes }, toPower]).filter(Boolean);
  const input = r.unit === 'dB' ? ['L', 'un_dbDb', 'db'] : r.unit === 'P₂/P₁' ? [pSym, 'un_dbPower', 'db'] : [vSym, 'un_dbVoltage', 'db'];
  return top
    + (list.length ? steps(list, { note: 'un_noteDb', refs: ['IEC 60027-3 (logarithmic quantities)'], where: [input] }) : '')
    + rows([
      ['un_dbDb', num(r.dB, 'dB', 5)],
      ['un_dbPower', `${fmt(r.power, 5)} ×`],
      ['un_dbVoltage', `${fmt(r.voltage, 5)} ×`],
      ['un_dbPowerPct', pctOf(r.power)],
      ['un_dbVoltagePct', pctOf(r.voltage)],
    ]);
}

function renderAwg(r, v, u) {
  const w = r.wire;
  const gauge = `AWG ${awgName(w.n)}`;
  const top = r.reverse
    ? hero('un_awgNearest', esc(gauge), `${esc(t('un_awgExact'))}: ${fmt(r.exact, 3)}`)
    : hero('un_awgD', numHtml(w.dMm, 'mm', 4), `${fmt(w.areaMm2, 4)} mm² · ${fmt(w.dMm / 0.0254, 4)} mil`);
  // Forward: diameter, area and resistance of the gauge. Reverse: the entered
  // size as a diameter, the fractional gauge, the nearest whole gauge, then forward.
  const d0 = tx(`${fmt(0.127)} mm`);
  const d = q(w.dMm, 'mm', 4);
  const dX = r.reverse ? q(r.inputMm, 'mm', 4) : '';
  const area = q(w.areaMm2, 'mm²', 4);
  const nTxt = w.n < 0 ? `(−${-w.n})` : String(w.n);
  const unit = u?.awg;
  const perIn = `\\frac{${tx(`${fmt(25.4)} mm`)}}{${tx('1 in')}}`;
  const perMil = `\\frac{${tx(`${fmt(0.0254)} mm`)}}{${tx('1 mil')}}`;
  const worked = steps([
    r.reverse && unit === 'in' && { label: 'un_awgInput', sym: `d_{x} = d_{in} \\cdot ${perIn}`, num: `${q(v.awg, 'in')} \\cdot ${perIn}`, res: dX },
    r.reverse && unit === 'mil' && { label: 'un_awgInput', sym: `d_{x} = d_{mil} \\cdot ${perMil}`, num: `${q(v.awg, 'mil')} \\cdot ${perMil}`, res: dX },
    r.reverse && unit === 'mm2' && { label: 'un_awgInput', sym: 'd_{x} = \\sqrt{\\frac{4 \\cdot A_{x}}{π}}', num: `\\sqrt{\\frac{4 \\cdot ${q(v.awg, 'mm²')}}{π}}`, res: dX },
    r.reverse && { label: 'un_awgExact', sym: `n_{x} = 36 − 39 \\cdot \\frac{\\ln(d_{x} / ${d0})}{\\ln(92)}`,
      num: `36 − 39 \\cdot \\frac{\\ln(\\frac{${dX}}{${d0}})}{\\ln(92)}`, res: tx(fmt(r.exact, 4)) },
    r.reverse && { label: 'un_awgNearest', sym: 'n', res: tx(w.n <= 0 ? `${fmt(w.n)} (${gauge})` : String(w.n)), note: 'un_stepAwgNear' },
    { label: 'un_awgD', sym: `d = ${d0} \\cdot 92^{\\frac{36 − n}{39}}`, num: `${d0} \\cdot 92^{\\frac{36 − ${nTxt}}{39}}`, res: d },
    { label: 'un_awgArea', sym: 'A = \\frac{π \\cdot d^{2}}{4}', num: `\\frac{π \\cdot {(${d})}^{2}}{4}`, res: area },
    { label: 'un_awgRm', sym: 'R′ = \\frac{ρ}{A}', num: `\\frac{${tx(si(RHO_CU_20, 'Ω·m'))}}{${area}}`, res: tx(`${si(w.ohmPerM, 'Ω')}/m`) },
  ], {
    note: 'un_noteAwg',
    refs: ['ASTM B258', 'IEC 60028 (resistivity of annealed copper)'],
    where: [[!r.reverse ? 'n' : { mm2: 'A_{x}', in: 'd_{in}', mil: 'd_{mil}' }[unit] ?? 'd_{x}', 'un_awg', 'awg']],
  });
  return top
    + messages('warn', r.clamped ? ['un_awgClamped'] : [])
    + worked
    + rows([
      ['un_awgGauge', esc(gauge)],
      r.reverse && ['un_awgExact', fmt(r.exact, 4)],
      r.reverse && ['un_awgInput', `${fmt(r.inputMm, 4)} mm`],
      ['un_awgD', `${fmt(w.dMm, 4)} mm · ${fmt(w.dIn, 4)} in · ${fmt(w.dMm / 0.0254, 4)} mil`],
      ['un_awgArea', `${fmt(w.areaMm2, 4)} mm² · ${fmt(w.kcmil, 4)} kcmil`],
      ['un_awgRm', `${si(w.ohmPerM, 'Ω')}/m`],
      ['un_awgRkm', `${fmt(w.ohmPerKm, 4)} Ω/km`],
      ['un_awgRkft', `${fmt(w.ohmPerKft, 4)} Ω/1000 ft`],
    ]);
}

export default {
  id: 'units',
  strings,
  sections: [
    {
      title: 'sectionSetup',
      fields: [
        { key: 'mode', type: 'choice', label: 'mode', default: 'len',
          options: [
            { value: 'len', label: 'un_mLen' },
            { value: 'cu', label: 'un_mCu' },
            { value: 'temp', label: 'un_mTemp' },
            { value: 'rf', label: 'un_mRf' },
            { value: 'db', label: 'un_mDb' },
            { value: 'awg', label: 'AWG', raw: true },
          ] },
      ],
    },
    {
      title: 'sectionInputs',
      fields: [
        { key: 'len', type: 'number', label: 'un_len', default: 1, units: ['mm', 'mil', 'in', 'um', 'cm', 'm'], pref: 'length',
          valid: 'nonneg', show: isMode('len') },
        { key: 'cu', type: 'number', label: 'un_cu', default: 1, units: ['oz', 'um', 'mil', 'mm'], valid: 'nonneg', show: isMode('cu'),
          presets: [0.5, 1, 2, 3].map((x) => ({ label: `${x} oz`, value: x, unit: 'oz' })) },
        { key: 'temp', type: 'number', label: 'un_temp', default: 25, units: ['C', 'F', 'K'], valid: 'any', show: isMode('temp') },
        { key: 'rf', type: 'number', label: 'un_rf', default: 0, units: RF_UNITS, valid: 'any', hint: 'un_rfHint', show: isMode('rf'),
          presets: [-30, 0, 10, 20, 30].map((x) => ({ label: `${x < 0 ? '−' : ''}${Math.abs(x)} dBm`, value: x, unit: 'dBm' })) },
        { key: 'z', type: 'number', label: 'un_z', default: 50, units: ['ohm'], si: true, show: isMode('rf'),
          presets: [50, 75, 600].map((x) => ({ label: `${x} Ω`, value: x })) },
        { key: 'db', type: 'number', label: 'un_db', default: 3, units: DB_UNITS, valid: 'any', hint: 'un_dbHint', show: isMode('db'),
          presets: [-20, -10, -6, -3, 3, 6, 10, 20].map((x) => ({ label: `${x > 0 ? '+' : '−'}${Math.abs(x)} dB`, value: x, unit: 'dB' })) },
        { key: 'awg', type: 'number', label: 'un_awg', default: 24, units: ['AWG', 'mm', 'in', 'mil', 'mm2'], valid: 'any',
          hint: 'un_awgHint', show: isMode('awg'),
          presets: [-3, -1, 0, 10, 14, 18, 22, 24, 26, 28, 30].map((n) => ({ label: awgName(n), value: n, unit: 'AWG' })) },
      ],
    },
  ],

  compute(v, u) {
    const fail = (e) => ({ ok: false, errors: [e] });
    switch (v.mode) {
      case 'cu': return { ok: true, mode: 'cu', unit: u.cu, vals: convertCopper(v.cu, u.cu) };
      case 'temp': {
        const r = convertTemperature(v.temp, u.temp);
        return r.ok ? { ...r, mode: 'temp', unit: u.temp } : fail('un_absZero');
      }
      case 'rf': {
        const r = convertRfPower(v.rf, u.rf, v.z);
        return r.ok ? { ...r, mode: 'rf', unit: u.rf } : fail('un_positive');
      }
      case 'db': {
        const r = convertDb(v.db, DB_KIND[u.db]);
        return r.ok ? { ...r, mode: 'db', unit: u.db } : fail('un_positive');
      }
      case 'awg': {
        if (u.awg === 'AWG') {
          if (!Number.isInteger(v.awg) || v.awg < AWG_MIN || v.awg > AWG_MAX) return fail('un_awgRange');
          return { ok: true, mode: 'awg', reverse: false, wire: awgWire(v.awg) };
        }
        const dMm = diameterMm(v.awg, u.awg);
        if (!(dMm > 0)) return fail('un_positive');
        const near = nearestAwg(dMm);
        return { ok: true, mode: 'awg', reverse: true, inputMm: dMm, exact: near.exact, clamped: near.clamped, wire: awgWire(near.n) };
      }
      default: return { ok: true, mode: 'len', unit: u.len, vals: convertLength(v.len, u.len) };
    }
  },

  render(r, v, u) {
    if (!r.ok) return invalid(r.errors);
    switch (r.mode) {
      case 'cu': return renderCopper(r, v);
      case 'temp': return renderTemperature(r);
      case 'rf': return renderRf(r, v);
      case 'db': return renderDb(r, v);
      case 'awg': return renderAwg(r, v, u);
      default: return renderLength(r, v);
    }
  },
};
