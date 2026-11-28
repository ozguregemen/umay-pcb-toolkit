import { holdup } from '../engine/holdup.js';
import { heroes, rows, block, steps, messages, invalid } from '../ui/calculator.js';
import { tx } from '../ui/math.js';
import { fmt, si, esc } from '../ui/format.js';
import { t, locale } from '../i18n.js';
import { svg, rect, path, text, poly, circle, axes, dimH } from '../ui/svg.js';

const strings = {
  tr: {
    hu_solve: 'Hesaplanacak değer',
    hu_sCap: 'Kapasite',
    hu_sTime: 'Hold-up süresi',
    hu_solveInfo: 'Kapasite: istenen hold-up süresi için gereken kondansatör. Hold-up süresi: eldeki kondansatörün yükü ne kadar ayakta tuttuğu.',
    hu_ex: 'Örnek',
    hu_exInfo: 'Bir örnek seçildiğinde ilgili alanlar örnek değerlerle doldurulur; sonra istediğiniz alanı değiştirebilirsiniz.',
    hu_exNone: 'Örnek seçin…',
    hu_ex12: '12 V bara: 10 ms boyunca 5 W',
    hu_exMcu: '5 V’tan LDO ile beslenen 3,3 V MCU, flash’a kayıt: 50 ms boyunca 20 mA',
    hu_ex24: '24 V: 20 ms boyunca 10 W',
    hu_exSc: '5 V, 1 F süperkapasitör, 0,5 W: ne kadar dayanır?',
    hu_secLoad: 'Yük',
    hu_load: 'Yük tipi',
    hu_lPower: 'Sabit güç',
    hu_lCurrent: 'Sabit akım',
    hu_loadInfo: 'Sabit güç: kondansatörün arkasında anahtarlamalı bir dönüştürücü vardır; giriş gerilimi düştükçe daha çok akım çeker. Sabit akım: doğrusal regülatör (LDO) ya da doğrudan bağlı bir yük; akım gerilimden bağımsızdır.',
    hu_p: 'Yük gücü (P)',
    hu_pInfo: 'Dönüştürücünün çıkışında, hold-up süresince çekilen güç. Kayıt ya da kapanma sırasında gereksiz yükleri kapatmak bu gücü ve gereken kapasiteyi azaltır.',
    hu_eff: 'Dönüştürücü verimi (η)',
    hu_effInfo: 'Dönüştürücünün bu yükteki verimi; V1 ile V2 arasında sabit alınır. Verim giriş gerilimiyle biraz değişir: aralıktaki en düşük değeri girin.',
    hu_i: 'Yük akımı (I)',
    hu_secCap: 'Kondansatör ve gerilimler',
    hu_v1: 'Besleme kesildiğinde kondansatör gerilimi (V1)',
    hu_v1Info: 'Beslemenin kesildiği anda kondansatörün üzerindeki gerilim. En kötü durum için beslemenin en düşük değerini alın; kondansatör bir diyotun ya da anahtarın arkasındaysa onun gerilim düşümünü çıkarın.',
    hu_v2: 'Yükün çalıştığı en düşük gerilim (V2)',
    hu_v2Info: 'Yükün hâlâ çalıştığı en düşük kondansatör gerilimi: dönüştürücünün en düşük giriş gerilimi (düşük gerilim kilidi, UVLO) ya da doğrusal regülatörde çıkış gerilimi + düşüm gerilimi (dropout).',
    hu_t: 'Hold-up süresi (t)',
    hu_c: 'Kapasite, nominal (Cnom)',
    hu_cHint: 'SI önekleri kullanılabilir: 470u, 2200u; önek olmadan farad (0.47).',
    hu_cmin: 'En düşük kapasite, nominalin yüzdesi (kC)',
    hu_cminInfo: 'Kondansatörün ömrü boyunca ve en kötü koşulda kalan kapasitesinin nominal değere oranı: başlangıç toleransı (alüminyum elektrolitiklerde çoğunlukla ±%20), yaşlanma, soğukta kapasite kaybı ve seramiklerde DC öngerilim etkisi. %80 yalnızca −%20 toleransı karşılar.',
    hu_esr: 'Eşdeğer seri direnç (ESR)',
    hu_esrInfo: 'Kondansatörün seri direnci; bağlantı dirençlerini de ekleyebilirsiniz. Alüminyum elektrolitiklerde soğukta belirgin biçimde artar: en düşük çalışma sıcaklığındaki değeri girin. Boş bırakılırsa 0 alınır.',

    hu_cReq: 'Gereken kapasite (en az) C',
    hu_subFor: '{t} hold-up süresi için',
    hu_cStd: 'Alınacak nominal değer',
    hu_subNom: '≥ {c} (en düşük kapasite {k}) · {es}',
    hu_cNomReq: 'Hesaplanan nominal kapasite C / kC',
    hu_tStd: 'Seçilen kondansatörle hold-up süresi (en düşük kapasite)',
    hu_nominal: 'nominal kapasiteyle {x}',
    hu_tMin: 'Hold-up süresi (en düşük kapasite)',
    hu_tNom: 'Hold-up süresi (nominal kapasite)',
    hu_subC: 'C = {c}',
    hu_cMin: 'En düşük kapasite Cmin',
    hu_pIn: 'Dönüştürücünün giriş gücü Pin',
    hu_iEnd: 'Boşalmanın sonundaki akım (en büyük) Iend',
    hu_iStart: 'Boşalmanın başındaki akım Istart',
    hu_v2Eff: 'Kullanılabilen en düşük iç gerilim V2,eff',
    hu_vStart: 'Besleme kesildiği anda uç gerilimi Vt1',
    hu_esrStep: 'ESR üzerindeki ilk gerilim basamağı ΔV1',
    hu_k: 'ESR kaybını içeren V² terimi K',
    hu_eStored: 'V1’de depolanan enerji E1',
    hu_eTaken: 'Kullanılabilir enerji (V1 → V2,eff)',
    hu_eTaken0: 'Kullanılabilir enerji (V1 → V2)',
    hu_share: 'Kullanılabilir enerjinin depolanan enerjiye oranı',
    hu_eEsr: 'ESR’de ısıya dönüşen enerji',
    hu_eLoad: 'Yüke aktarılan enerji P·t',
    hu_energyNote: 'Enerji değerleri ve grafik, hesaptaki en düşük kapasite (C = {c}) içindir.',
    warn_hu_shareLow: 'Depolanan enerjinin yalnızca {p} kadarı kullanılabiliyor: kondansatör kötü değerlendiriliyor. V1’i yükseltin ya da daha düşük giriş gerilimine kadar çalışan bir dönüştürücüyle V2’yi düşürün.',
    warn_hu_long: 'Hold-up süresi uzun ({t}): kondansatörün kaçak akımı ve kendi kendine boşalması ile dönüştürücünün boştaki akımı yüke göre ihmal edilemeyebilir. Bunları yüke ekleyin.',
    err_hu_positive: 'Güç, akım, gerilim, süre ve kapasite sıfırdan büyük; ESR sıfır ya da pozitif bir sayı olmalı.',
    err_hu_eff: 'Verim %0’dan büyük, en çok %100 olmalı.',
    err_hu_frac: 'En düşük kapasite, nominal değerin %0’ından büyük ve en çok %100’ü olmalı.',
    err_hu_v2: 'V2, V1’den küçük olmalı: kondansatör yalnızca V1’den V2’ye boşalırken enerji verir.',
    err_hu_esrHigh: 'ESR bu güç için fazla yüksek: boşalmanın sonunda ESR üzerindeki gerilim düşümü V2’ye ulaşıyor ve dönüştürücünün girişi V2’ye varmadan çöküyor. ESR, V2² / Pin değerinin altında olmalı.',
    err_hu_nothing: 'Kullanılabilir enerji yok: ESR üzerindeki gerilim düşümü yüzünden uç gerilimi daha baştan V2’ye iniyor (V2,eff ≥ V1). ESR’yi düşürün, V1’i yükseltin ya da V2’yi düşürün.',
    err_hu_range: 'Bu değerlerle sonuç sayı aralığının dışına çıkıyor; girdileri kontrol edin.',

    hu_sStd: 'Bir üst standart değer',
    hu_stepIEnd: 'Sabit güçte akım, gerilim düştükçe artar ve en büyük değerine V2’de ulaşır. Kondansatör, bağlantılar ve dönüştürücünün girişi bu akımı taşımalıdır.',
    hu_stepV2Eff: 'Yük, uç gerilimi V2’ye indiğinde durur. O anda kondansatörün iç gerilimi ESR üzerindeki düşüm kadar daha yüksektir: bunun altındaki enerji kullanılamaz.',
    hu_stepVStart: 'Uç gerilimi u ile iç gerilim v arasında u = v − (Pin / u)·RESR bağıntısı vardır; kararlı kökü budur.',
    hu_stepK: 'K, enerji dengesinde V1² − V2² teriminin yerini alır ve boşalma sırasında ESR’de ısıya dönüşen enerjiyi de içerir; RESR = 0 için V1² − V2² olur.',
    hu_stepStd: 'E6 serisi: 10 · 15 · 22 · 33 · 47 · 68. Büyük gövdeli kondansatörlerde her zaman bulunan değerler.',
    hu_stepCmin: 'Tolerans ve yaşlanma sonrasında kesin olarak var olan kapasite.',
    hu_note: 'Türetme. Sabit güç: dönüştürücü, kondansatör gerilimi ne olursa olsun Pin = P / η çeker; kondansatörün V1’den V2’ye inerken verdiği enerji Pin·t’ye eşittir: ½·C·(V1² − V2²) = Pin·t. Sabit akım: C·dV/dt = −I olduğundan gerilim doğrusal düşer: C·(V1 − V2) = I·t. ESR girildiğinde V2’nin yerini V2,eff, sabit güçte V1² − V2² teriminin yerini K alır (adımlarda gösterilir). Varsayımlar: verim ve yük hold-up süresince sabittir, kapasite gerilimle değişmez (2. sınıf seramiklerde değişir: çalışma gerilimindeki kapasiteyi kullanın), besleme bu sürede hiç akım vermez. Beslemenin kesildiğini algılayan devrenin gecikmesini ve işin tamamlanması için gereken süreyi t’ye ekleyin.',
    hu_ref: 'Enerjinin korunumu ve kondansatör denklemi i = C·dv/dt (türetme nottadır)',

    hu_dgAria: 'Kondansatör uç geriliminin zamana göre grafiği: besleme kesilince V1’den başlar, hold-up süresi sonunda V2’ye iner',
    hu_dgTitle: 'kondansatör uç gerilimi',
    hu_dgLoss: 'besleme kesilir',
    hu_dgStop: 'yük durur',
  },
  en: {
    hu_solve: 'Solve for',
    hu_sCap: 'Capacitance',
    hu_sTime: 'Hold-up time',
    hu_solveInfo: 'Capacitance: the capacitor needed for a wanted hold-up time. Hold-up time: how long a given capacitor keeps the load running.',
    hu_ex: 'Example',
    hu_exInfo: 'Picking an example fills the fields it concerns with example values; change any of them afterwards.',
    hu_exNone: 'Pick an example…',
    hu_ex12: '12 V bus: 5 W for 10 ms',
    hu_exMcu: '3.3 V MCU behind an LDO from 5 V, saving to flash: 20 mA for 50 ms',
    hu_ex24: '24 V: 10 W for 20 ms',
    hu_exSc: '5 V, 1 F supercapacitor, 0.5 W: how long?',
    hu_secLoad: 'Load',
    hu_load: 'Load type',
    hu_lPower: 'Constant power',
    hu_lCurrent: 'Constant current',
    hu_loadInfo: 'Constant power: a switching converter sits behind the capacitor; it draws more current as its input voltage falls. Constant current: a linear regulator (LDO) or a load connected directly; the current does not depend on the voltage.',
    hu_p: 'Load power (P)',
    hu_pInfo: 'Power drawn at the converter output during the hold-up time. Switching off loads that are not needed while saving or shutting down lowers this power and the capacitance required.',
    hu_eff: 'Converter efficiency (η)',
    hu_effInfo: 'Efficiency of the converter at this load, taken as constant between V1 and V2. It changes a little with the input voltage: enter the lowest value in that range.',
    hu_i: 'Load current (I)',
    hu_secCap: 'Capacitor and voltages',
    hu_v1: 'Capacitor voltage when the supply is lost (V1)',
    hu_v1Info: 'The voltage on the capacitor at the moment the supply disappears. For the worst case take the lowest supply voltage; if the capacitor sits behind a diode or a switch, subtract its voltage drop.',
    hu_v2: 'Lowest voltage at which the load still works (V2)',
    hu_v2Info: 'The lowest capacitor voltage at which the load still works: the minimum input voltage of the converter (undervoltage lockout, UVLO), or output voltage + dropout voltage of a linear regulator.',
    hu_t: 'Hold-up time (t)',
    hu_c: 'Capacitance, nominal (Cnom)',
    hu_cHint: 'SI prefixes allowed: 470u, 2200u; without a prefix the value is in farads (0.47).',
    hu_cmin: 'Lowest capacitance, % of nominal (kC)',
    hu_cminInfo: 'The capacitance left over the life of the capacitor and in the worst condition, as a share of the nominal value: initial tolerance (mostly ±20 % for aluminium electrolytics), ageing, loss of capacitance in the cold and, for ceramics, DC bias. 80 % covers a −20 % tolerance only.',
    hu_esr: 'Equivalent series resistance (ESR)',
    hu_esrInfo: 'Series resistance of the capacitor; connection resistance can be added to it. For aluminium electrolytics it rises markedly in the cold: enter the value at the lowest operating temperature. Left empty, it is taken as 0.',

    hu_cReq: 'Capacitance required (minimum) C',
    hu_subFor: 'for {t} of hold-up',
    hu_cStd: 'Nominal value to buy',
    hu_subNom: '≥ {c} (lowest capacitance {k}) · {es}',
    hu_cNomReq: 'Nominal capacitance calculated C / kC',
    hu_tStd: 'Hold-up time with the chosen capacitor (lowest capacitance)',
    hu_nominal: '{x} at nominal capacitance',
    hu_tMin: 'Hold-up time (lowest capacitance)',
    hu_tNom: 'Hold-up time (nominal capacitance)',
    hu_subC: 'C = {c}',
    hu_cMin: 'Lowest capacitance Cmin',
    hu_pIn: 'Converter input power Pin',
    hu_iEnd: 'Current at the end of the discharge (peak) Iend',
    hu_iStart: 'Current at the start of the discharge Istart',
    hu_v2Eff: 'Lowest usable internal voltage V2,eff',
    hu_vStart: 'Terminal voltage right after the supply is lost Vt1',
    hu_esrStep: 'Initial voltage step across the ESR ΔV1',
    hu_k: 'V² term including the ESR loss K',
    hu_eStored: 'Energy stored at V1 E1',
    hu_eTaken: 'Usable energy (V1 → V2,eff)',
    hu_eTaken0: 'Usable energy (V1 → V2)',
    hu_share: 'Usable energy as a share of the stored energy',
    hu_eEsr: 'Energy lost as heat in the ESR',
    hu_eLoad: 'Energy delivered to the load P·t',
    hu_energyNote: 'The energy values and the plot are for the lowest capacitance in the calculation (C = {c}).',
    warn_hu_shareLow: 'Only {p} of the stored energy is used; the capacitor is used badly. Raise V1, or lower V2 with a converter that works down to a lower input voltage.',
    warn_hu_long: 'The hold-up time is long ({t}): the leakage current and self-discharge of the capacitor and the quiescent current of the converter may no longer be negligible against the load. Add them to the load.',
    err_hu_positive: 'Power, current, voltage, time and capacitance must be greater than zero; the ESR must be zero or a positive number.',
    err_hu_eff: 'The efficiency must be above 0 % and at most 100 %.',
    err_hu_frac: 'The lowest capacitance must be above 0 % and at most 100 % of the nominal value.',
    err_hu_v2: 'V2 must be below V1: the capacitor only delivers energy while it discharges from V1 to V2.',
    err_hu_esrHigh: 'The ESR is too high for this power: at the end of the discharge the drop across the ESR reaches V2, and the converter input collapses before it gets to V2. The ESR must be below V2² / Pin.',
    err_hu_nothing: 'No usable energy: because of the drop across the ESR the terminal voltage is at V2 from the start (V2,eff ≥ V1). Lower the ESR, raise V1 or lower V2.',
    err_hu_range: 'With these values the result leaves the number range; check the inputs.',

    hu_sStd: 'Next standard value up',
    hu_stepIEnd: 'With constant power the current rises as the voltage falls and peaks at V2. The capacitor, the connections and the converter input must carry it.',
    hu_stepV2Eff: 'The load stops when the terminal voltage reaches V2. At that moment the internal voltage of the capacitor is higher by the drop across the ESR: the energy below it cannot be used.',
    hu_stepVStart: 'Terminal voltage u and internal voltage v are related by u = v − (Pin / u)·RESR; this is its stable root.',
    hu_stepK: 'K takes the place of V1² − V2² in the energy balance and includes the energy that turns into heat in the ESR during the discharge; for RESR = 0 it is V1² − V2².',
    hu_stepStd: 'E6 series: 10 · 15 · 22 · 33 · 47 · 68. The values that are always available in bulk capacitors.',
    hu_stepCmin: 'The capacitance that is certain to be there after tolerance and ageing.',
    hu_note: 'Derivation. Constant power: the converter draws Pin = P / η whatever the capacitor voltage, and the energy the capacitor gives up between V1 and V2 equals Pin·t: ½·C·(V1² − V2²) = Pin·t. Constant current: C·dV/dt = −I, so the voltage falls in a straight line: C·(V1 − V2) = I·t. When an ESR is entered, V2,eff takes the place of V2 and, for constant power, K takes the place of V1² − V2² (shown in the steps). Assumptions: efficiency and load are constant during the hold-up time, the capacitance does not change with voltage (it does for class 2 ceramics: use the capacitance at the working voltage), and the supply delivers no current during that time. Add the delay of the circuit that detects the loss of the supply, and the time the task needs to finish, to t.',
    hu_ref: 'Conservation of energy and the capacitor equation i = C·dv/dt (derivation in the note)',

    hu_dgAria: 'Plot of the capacitor terminal voltage against time: it starts at V1 when the supply is lost and reaches V2 at the end of the hold-up time',
    hu_dgTitle: 'capacitor terminal voltage',
    hu_dgLoss: 'supply lost',
    hu_dgStop: 'load stops',
  },
};

const FARAD = 'farad'; // 'F' would render as °F
const P_MUL = { W: 1, mW: 1e-3 };
const I_MUL = { mA: 1e-3, A: 1, uA: 1e-6 };
const T_MUL = { ms: 1e-3, s: 1, us: 1e-6 };
const R_MUL = { mohm: 1e-3, ohm: 1 };

// Display. Capacitors are quoted in µF up to tens of thousands, then in farads;
// times of a second and more stay in seconds.
const volt = (x, sig = 4) => `${fmt(x, sig)} V`;
const capT = (x, sig = 4) => (x >= 0.1 ? `${fmt(x, sig)} F` : x >= 0.99995e-6 ? `${fmt(x * 1e6, sig)} µF` : si(x, 'F', sig));
const timeT = (x, sig = 4) => (x >= 1 ? `${fmt(x, sig)} s` : si(x, 's', sig));
const pctT = (x) => new Intl.NumberFormat(locale(), { style: 'percent', maximumFractionDigits: 1, useGrouping: false }).format(x);
/** "1500 µF" → number and unit for a headline value. */
function unitHtml(s) {
  const i = s.lastIndexOf(' ');
  return i < 0 ? esc(s) : `${esc(s.slice(0, i))} <span class="u">${esc(s.slice(i + 1))}</span>`;
}

// ---------------------------------------------------------------------------
// Diagram: terminal voltage of the capacitor against time
// ---------------------------------------------------------------------------

const clamp = (x, lo, hi) => (x > hi ? hi : x >= lo ? x : lo);
const n1 = (x) => Math.round(x * 10) / 10;

/** Without a result: the shape of the curve, from V1 to V1/2 in one unit of time. */
function nominalCurve(power) {
  if (!power) return [[0, 1], [1, 0.5]];
  const pts = [];
  for (let i = 0; i <= 12; i++) pts.push([i / 12, Math.sqrt(1 - (0.75 * i) / 12)]);
  return pts;
}

function diagram(v, u, r) {
  const live = !!r;
  const power = (live ? r.load : v.load) !== 'current';
  const cls = live ? 'val' : 'sym';
  const x0 = 50;
  const y0 = 174;
  const w = 340;
  const h = 122;
  const xA = x0 + 40; // the supply is lost
  const xB = x0 + w - 44; // the load stops
  const v1 = live ? r.v1 : 1;
  const v2 = live ? r.v2 : 0.5;
  const tEnd = live ? r.tUseS : 1;
  const pts = live ? r.curve : nominalCurve(power);
  const X = (time) => xA + clamp(time / tEnd, 0, 1) * (xB - xA);
  const Y = (volts) => y0 - clamp(volts / (v1 * 1.1), 0, 1) * h;
  const y1 = n1(Y(v1));
  const y2 = n1(Y(v2));
  // The curve is drawn for the lowest capacitance of the calculation.
  const values = live
    ? `C = ${capT(r.cUseF)} · ${power ? `Pin = ${si(r.pInW, 'W')}` : `I = ${si(r.currentA, 'A')}`}${r.esrOhm > 0 ? ` · ESR = ${si(r.esrOhm, 'Ω')}` : ''}`
    : '';
  const b = text(x0, 13, t('hu_dgTitle'), { cls: 'title', anchor: 'start' })
    + (values ? text(x0, 28, values, { cls: 'val', anchor: 'start' }) : '')
    + rect(xA, y1, xB - xA, y2 - y1, 'zone')
    + axes(x0, y0, w, h, { xLabel: 't', yLabel: 'V' })
    + path(`M${x0},${y1}H${x0 + w}M${x0},${y2}H${x0 + w}`, 'ext')
    + path(`M${xA},${y0}V${y1}M${xB},${y0}V${y2}`, 'ext')
    + poly([[x0, y1], [xA, y1], ...pts.map(([time, volts]) => [X(time), Y(volts)])], 'wave')
    + circle(xA, y1, 2.8, 'node') + circle(xB, y2, 2.8, 'node')
    + text(xA, 44, t('hu_dgLoss')) + text(xB, 44, t('hu_dgStop'))
    + text(x0 + w, y1 - 5, live ? `V1 = ${volt(r.v1)}` : 'V1', { cls, anchor: 'end' })
    // V2 goes below its line, or above it when the line is close to the axis.
    + text(x0 + w, y2 > y0 - 18 ? y2 - 5 : y2 + 14, live ? `V2 = ${volt(r.v2)}` : 'V2', { cls, anchor: 'end' })
    + dimH(xA, xB, y0 + 14, live ? `t = ${timeT(r.tUseS)}` : 't', { below: true, cls });
  return svg(440, 208, b, t('hu_dgAria'), { wide: true });
}

// ---------------------------------------------------------------------------
// Calculation steps
// ---------------------------------------------------------------------------

const q = (x, unit, sig = 4) => tx(si(x, unit, sig));
const vq = (x) => tx(volt(x, 6)); // six digits: these voltages are subtracted from each other
const cq = (x) => tx(capT(x));
const tq = (x) => tx(timeT(x));
const pq = (x) => tx(`${fmt(x * 100, 4)} %`);
const sq = (s) => `{(${s})}^{2}`;
const HALF = '\\frac{1}{2}';

function holdupSteps(r) {
  const power = r.load === 'power';
  const cap = r.solve === 'cap';
  const esr = r.esrOhm > 0;
  const V1 = vq(r.v1);
  const V2 = vq(r.v2);
  const V2e = vq(r.v2Eff);
  const Vt1 = vq(r.vStartV);
  const R = q(r.esrOhm, 'Ω', 6);
  const kC = pq(r.capMin);
  const v2Sym = esr ? 'V_{2,eff}' : 'V_2';
  const v2Num = esr ? V2e : V2;
  // Intermediate values carry five digits and are written the same way wherever they are used again.
  const Pin = power ? q(r.pInW, 'W', 5) : '';
  const Iend = q(r.iEndA, 'A', 5);
  const Istart = q(r.iStartA, 'A', 5);
  const I = power ? '' : q(r.currentA, 'A', 6);
  const K = power ? tx(`${fmt(r.kV2, 6)} V²`) : '';
  // What multiplies the capacitance to give the time: the usable V² term over 2·P_in, or ΔV over I.
  const span = power
    ? { sym: esr ? 'K' : 'V_1^{2} − V_2^{2}', num: esr ? K : `${sq(V1)} − ${sq(V2)}`, group: (s) => (esr ? s : `(${s})`) }
    : { sym: `V_1 − ${v2Sym}`, num: `${V1} − ${v2Num}`, group: (s) => `(${s})` };
  const drawSym = power ? '2 \\cdot P_{in}' : 'I';
  const drawNum = power ? `2 \\cdot ${Pin}` : I;
  const timeFor = (label, name, cSym, cNum, res, note) => ({
    label,
    sym: `${name} = \\frac{${cSym} \\cdot ${span.group(span.sym)}}{${drawSym}}`,
    num: `\\frac{${cNum} \\cdot ${span.group(span.num)}}{${drawNum}}`,
    res: tq(res),
    note,
  });

  const lead = power
    ? [
      { label: 'hu_pIn', sym: 'P_{in} = \\frac{P}{η}', num: `\\frac{${q(r.powerW, 'W', 6)}}{${pq(r.efficiency)}}`, res: Pin },
      { label: 'hu_iEnd', sym: 'I_{end} = \\frac{P_{in}}{V_2}', num: `\\frac{${Pin}}{${V2}}`, res: Iend, note: 'hu_stepIEnd' },
      esr && { label: 'hu_v2Eff', sym: 'V_{2,eff} = V_2 + I_{end} \\cdot R_{ESR}', num: `${V2} + ${Iend} \\cdot ${R}`, res: V2e, note: 'hu_stepV2Eff' },
      esr && { label: 'hu_vStart', sym: 'V_{t1} = \\frac{V_1 + \\sqrt{V_1^{2} − 4 \\cdot P_{in} \\cdot R_{ESR}}}{2}',
        num: `\\frac{${V1} + \\sqrt{${sq(V1)} − 4 \\cdot ${Pin} \\cdot ${R}}}{2}`, res: Vt1, note: 'hu_stepVStart' },
      esr && { label: 'hu_iStart', sym: 'I_{start} = \\frac{P_{in}}{V_{t1}}', num: `\\frac{${Pin}}{${Vt1}}`, res: Istart },
      esr && { label: 'hu_esrStep', sym: 'ΔV_1 = I_{start} \\cdot R_{ESR}', num: `${Istart} \\cdot ${R}`, res: q(r.esrStepV, 'V') },
      esr && { label: 'hu_k', sym: 'K = V_1 \\cdot V_{t1} − V_{2,eff} \\cdot V_2 − 2 \\cdot P_{in} \\cdot R_{ESR} \\cdot \\ln\\frac{V_{t1}}{V_2}',
        num: `${V1} \\cdot ${Vt1} − ${V2e} \\cdot ${V2} − 2 \\cdot ${Pin} \\cdot ${R} \\cdot \\ln\\frac{${Vt1}}{${V2}}`, res: K, note: 'hu_stepK' },
    ]
    : [
      esr && { label: 'hu_v2Eff', sym: 'V_{2,eff} = V_2 + I \\cdot R_{ESR}', num: `${V2} + ${I} \\cdot ${R}`, res: V2e, note: 'hu_stepV2Eff' },
      esr && { label: 'hu_esrStep', sym: 'ΔV_1 = I \\cdot R_{ESR}', num: `${I} \\cdot ${R}`, res: q(r.esrStepV, 'V') },
    ];

  const sizing = cap
    ? [
      { label: 'hu_cReq', sym: `C = \\frac{${power ? '2 \\cdot P_{in}' : 'I'} \\cdot t}{${span.sym}}`, num: `\\frac{${drawNum} \\cdot ${tq(r.timeS)}}{${span.num}}`, res: cq(r.cReqF) },
      { label: 'hu_cNomReq', sym: 'C_{nom} \\ge \\frac{C}{k_C}', num: `\\frac{${cq(r.cReqF)}}{${kC}}`, res: cq(r.cNomReqF) },
      { labelRaw: `${t('hu_sStd')} (${r.series})`, sym: `C_{nom} = ${cq(r.cStdF)}`, note: 'hu_stepStd' },
      timeFor('hu_tStd', 't', 'k_C \\cdot C_{nom}', `${kC} \\cdot ${cq(r.cStdF)}`, r.tStdMinS),
    ]
    : [
      { label: 'hu_cMin', sym: 'C_{min} = k_C \\cdot C_{nom}', num: `${kC} \\cdot ${cq(r.capF)}`, res: cq(r.cMinF), note: 'hu_stepCmin' },
      timeFor('hu_tMin', 't', 'C_{min}', cq(r.cMinF), r.tMinS),
      timeFor('hu_tNom', 't_{nom}', 'C_{nom}', cq(r.capF), r.tNomS),
    ];

  return steps([
    ...lead,
    ...sizing,
    { label: 'hu_eStored', sym: `E_1 = ${HALF} \\cdot ${cap ? 'C' : 'C_{min}'} \\cdot V_1^{2}`, num: `${HALF} \\cdot ${cq(r.cUseF)} \\cdot ${sq(V1)}`, res: q(r.eStoredJ, 'J') },
    { label: 'hu_share', sym: `\\frac{ΔE}{E_1} = 1 − (\\frac{${v2Sym}}{V_1})^{2}`, num: `1 − ${sq(`\\frac{${v2Num}}{${V1}}`)}`, res: pq(r.share) },
  ], {
    note: 'hu_note',
    refs: [t('hu_ref')],
    where: [
      ...(power ? [['P', 'hu_p', 'p'], ['η', 'hu_eff', 'eff']] : [['I', 'hu_i', 'i']]),
      ['V_1', 'hu_v1', 'v1'],
      ['V_2', 'hu_v2', 'v2'],
      cap ? ['t', 'hu_t', 't'] : ['C_{nom}', 'hu_c', 'c'],
      ['k_C', 'hu_cmin', 'cmin'],
      esr && ['R_{ESR}', 'hu_esr', 'esr'],
    ],
  });
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

function render(r) {
  if (!r.ok) return invalid(r.errors);
  const power = r.load === 'power';
  const cap = r.solve === 'cap';
  const esr = r.esrOhm > 0;
  const k = pctT(r.capMin);
  const head = cap
    ? heroes([
      ['hu_cReq', unitHtml(capT(r.cReqF)), esc(t('hu_subFor', { t: timeT(r.timeS) }))],
      ['hu_cStd', unitHtml(capT(r.cStdF)), esc(t('hu_subNom', { c: capT(r.cNomReqF), k, es: r.series }))],
    ])
    : heroes([
      ['hu_tMin', unitHtml(timeT(r.tMinS)), esc(`${t('hu_subC', { c: capT(r.cMinF) })} (${k})`)],
      ['hu_tNom', unitHtml(timeT(r.tNomS)), esc(t('hu_subC', { c: capT(r.capF) }))],
    ]);
  const warn = messages('warn', r.warnings, {
    hu_shareLow: { p: pctT(r.share) },
    hu_long: { t: timeT(cap ? r.timeS : r.tNomS, 3) },
  });
  const sizing = cap
    ? [
      ['hu_cReq', esc(capT(r.cReqF)), true],
      ['hu_cNomReq', esc(capT(r.cNomReqF))],
      ['hu_cStd', esc(`${capT(r.cStdF)} (${r.series})`), true],
      ['hu_tStd', esc(`${timeT(r.tStdMinS)} · ${t('hu_nominal', { x: timeT(r.tStdNomS) })}`)],
    ]
    : [
      ['hu_tMin', esc(timeT(r.tMinS)), true],
      ['hu_tNom', esc(timeT(r.tNomS))],
      ['hu_cMin', esc(`${capT(r.cMinF)} (${k})`)],
    ];
  return head + warn
    + holdupSteps(r)
    + block('results', rows([
      ...sizing,
      power && ['hu_pIn', esc(si(r.pInW, 'W'))],
      power && ['hu_iEnd', esc(si(r.iEndA, 'A')), true],
      power && ['hu_iStart', esc(si(r.iStartA, 'A'))],
      esr && ['hu_v2Eff', esc(volt(r.v2Eff))],
      esr && ['hu_vStart', esc(volt(r.vStartV))],
      esr && ['hu_esrStep', esc(si(r.esrStepV, 'V'))],
      ['hu_eStored', esc(si(r.eStoredJ, 'J'))],
      [esr ? 'hu_eTaken' : 'hu_eTaken0', esc(si(r.eTakenJ, 'J'))],
      ['hu_share', esc(pctT(r.share)), true],
      esr && ['hu_eEsr', esc(si(r.eEsrJ, 'J'))],
      power && ['hu_eLoad', esc(si(r.eLoadJ, 'J'))],
    ]) + `<p class="note">${esc(t('hu_energyNote', { c: capT(r.cUseF) }))}</p>`);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const isPower = (v) => v.load !== 'current';
const isCurrent = (v) => v.load === 'current';
const isCap = (v) => v.solve !== 'time';
const isTime = (v) => v.solve === 'time';

// Examples: every field the calculation uses is set, so an example does not depend on what was entered before.
const EXAMPLES = {
  b12: { solve: 'cap', load: 'power', p: 5, eff: 90, v1: 12, v2: 6, t: 10, cmin: 80, esr: '' },
  mcu: { solve: 'cap', load: 'current', i: 20, v1: 5, v2: 3.6, t: 50, cmin: 80, esr: '' },
  b24: { solve: 'cap', load: 'power', p: 10, eff: 90, v1: 24, v2: 18, t: 20, cmin: 80, esr: '' },
  sc: { solve: 'time', load: 'power', p: 0.5, eff: 90, v1: 5, v2: 3, c: 1, cmin: 80, esr: 100 },
};

export default {
  id: 'holdup',
  strings,
  diagram,
  render,
  sections: [
    {
      title: 'sectionSetup',
      fields: [
        { key: 'solve', type: 'choice', label: 'hu_solve', default: 'cap', info: 'hu_solveInfo',
          options: [{ value: 'cap', label: 'hu_sCap' }, { value: 'time', label: 'hu_sTime' }] },
        { key: 'ex', type: 'select', label: 'hu_ex', default: 'none', info: 'hu_exInfo',
          options: [
            { value: 'none', label: 'hu_exNone' },
            { value: 'b12', label: 'hu_ex12', set: EXAMPLES.b12 },
            { value: 'mcu', label: 'hu_exMcu', set: EXAMPLES.mcu },
            { value: 'b24', label: 'hu_ex24', set: EXAMPLES.b24 },
            { value: 'sc', label: 'hu_exSc', set: EXAMPLES.sc },
          ] },
      ],
    },
    {
      title: 'hu_secLoad',
      fields: [
        { key: 'load', type: 'choice', label: 'hu_load', default: 'power', info: 'hu_loadInfo',
          options: [{ value: 'power', label: 'hu_lPower' }, { value: 'current', label: 'hu_lCurrent' }] },
        { key: 'p', type: 'number', label: 'hu_p', default: 5, units: ['W', 'mW'], info: 'hu_pInfo', show: isPower },
        { key: 'eff', type: 'number', label: 'hu_eff', default: 90, units: ['pct'], max: 100, info: 'hu_effInfo', show: isPower },
        { key: 'i', type: 'number', label: 'hu_i', default: 20, units: ['mA', 'A', 'uA'], show: isCurrent },
      ],
    },
    {
      title: 'hu_secCap',
      fields: [
        { key: 'v1', type: 'number', label: 'hu_v1', default: 12, units: ['V'], info: 'hu_v1Info',
          presets: [5, 12, 24, 48].map((x) => ({ label: `${x} V`, value: x })) },
        { key: 'v2', type: 'number', label: 'hu_v2', default: 6, units: ['V'], info: 'hu_v2Info' },
        { key: 't', type: 'number', label: 'hu_t', default: 10, units: ['ms', 's', 'us'], show: isCap,
          presets: [10, 20, 50, 100].map((x) => ({ label: `${x} ms`, value: x, unit: 'ms' })) },
        { key: 'c', type: 'number', label: 'hu_c', default: '1000u', units: [FARAD], si: true, hint: 'hu_cHint', show: isTime },
        { key: 'cmin', type: 'number', label: 'hu_cmin', default: 80, units: ['pct'], max: 100, info: 'hu_cminInfo' },
        { key: 'esr', type: 'number', label: 'hu_esr', default: '', optional: true, valid: 'nonneg', units: ['mohm', 'ohm'], info: 'hu_esrInfo' },
      ],
    },
  ],

  compute(v, u) {
    const esr = v.esr * (R_MUL[u.esr] ?? NaN);
    return holdup({
      solve: v.solve,
      load: v.load,
      powerW: v.p * (P_MUL[u.p] ?? NaN),
      efficiency: v.eff / 100,
      currentA: v.i * (I_MUL[u.i] ?? NaN),
      v1: v.v1,
      v2: v.v2,
      timeS: v.t * (T_MUL[u.t] ?? NaN),
      capF: v.c,
      capMin: v.cmin / 100,
      esrOhm: Number.isFinite(v.esr) ? esr : undefined, // optional field left empty
    });
  },
};

