import { loadCurrent, bjtSwitch, mosfetSwitch, HOT_FACTOR } from '../engine/transistor.js';
import { heroes, rows, block, steps, messages, invalid } from '../ui/calculator.js';
import { tx } from '../ui/math.js';
import { fmt, si, siHtml, esc } from '../ui/format.js';
import { svg, twoTerm, wire, node, ground, terminal, arrow, text, npn, mosfet, block as icBlock } from '../ui/svg.js';
import { t, locale } from '../i18n.js';

const strings = {
  tr: {
    sw_dev: 'Anahtar',
    sw_bjt: 'NPN BJT',
    sw_mos: 'N-kanal MOSFET',
    sw_load: 'Yük türü',
    sw_loadRes: 'Dirençsel / LED',
    sw_loadInd: 'Endüktif (röle, motor)',
    sw_loadInfo: 'Röle bobini, motor, solenoid ve bobinler endüktiftir: anahtar kesime geçtiğinde akım aniden kesilemez ve yüksek bir gerilim darbesi oluşur. Bu yüklere ters paralel bir serbest geçiş (flyback) diyodu gerekir.',
    sw_ldm: 'Yük verisi',
    sw_ldmI: 'Akım',
    sw_ldmR: 'Direnç',
    sw_loadTitle: 'Yük ve sürme',
    sw_vs: 'Yük besleme gerilimi Vs',
    sw_il: 'Yük akımı',
    sw_rl: 'Yük direnci RL',
    sw_rlInfo: 'Röle için bobin direnci, LED için seri direnç dahil eşdeğer direnç. Akım, anahtar üzerindeki düşüm çıkarılarak hesaplanır.',
    sw_vdrv: 'Sürme gerilimi (GPIO yüksek seviye)',
    sw_vdrvInfo: 'Mikrodenetleyici pininin yüksek seviye çıkış gerilimi; genellikle besleme gerilimine eşittir (1,8 / 3,3 / 5 V).',
    sw_bjtTitle: 'BJT verileri',
    sw_hfe: 'Akım kazancı hFE (en küçük)',
    sw_hfeInfo: 'Veri sayfasındaki en küçük hFE değeri, kullandığınız kollektör akımında. Tipik değil, en küçük değeri alın; hFE sıcaklık ve akımla değişir.',
    sw_betaF: 'Zorlanmış β (Ic / Ib)',
    sw_betaFInfo: 'Doyma için baz akımı hFE’nin gerektirdiğinden çok daha büyük seçilir. Veri sayfaları Vce(sat) değerini genellikle Ic/Ib = 10’da verir; 10–20 arası güvenli bir seçimdir.',
    sw_vbe: 'Baz–emetör gerilimi Vbe(sat)',
    sw_vce: 'Kollektör–emetör doyma gerilimi Vce(sat)',
    sw_rbe: 'Baz–emetör direnci Rbe',
    sw_rbeInfo: 'Baz ile emetör arasındaki direnç (ör. 10–100 kΩ), sürücü yüksek empedanslıyken (reset sırasında) transistörü kesimde tutar ve kapanmayı hızlandırır. Bir miktar baz akımını üzerine çeker; hesapta dikkate alınır.',
    sw_series: 'E-serisi',
    sw_mosTitle: 'MOSFET verileri',
    sw_rds: 'Rds(on) (veri sayfası)',
    sw_vgss: 'Rds(on)’un verildiği Vgs',
    sw_vgssInfo: 'Veri sayfası Rds(on) değerini belirli Vgs değerlerinde garanti eder (ör. 10 V, 4,5 V, 2,5 V). Sürme geriliminiz bu değerin altındaysa Rds(on) garanti edilmez.',
    sw_vth: 'Eşik gerilimi Vgs(th) (en büyük)',
    sw_vthInfo: 'Vgs(th), MOSFET’in yalnızca iletmeye başladığı (ör. 250 µA) gerilimdir; tam iletim için çok daha yüksek Vgs gerekir. Veri sayfasındaki en büyük değeri girin.',
    sw_qg: 'Toplam gate yükü Qg',
    sw_qgInfo: 'Gate yükü eğrisinden, kullandığınız sürme gerilimindeki toplam yük.',
    sw_vpl: 'Miller platosu gerilimi',
    sw_vplInfo: 'Gate yükü eğrisindeki yatay bölümün gerilimi. Anahtarlama bu platoda olur; sürücü bu gerilimin üstüne çıkamazsa MOSFET tam iletime geçmez.',
    sw_rg: 'Gate direnci Rg',
    sw_rgInfo: 'Sürücü ile gate arasındaki seri direnç; çınlamayı ve EMI’yi azaltır, anahtarlamayı yavaşlatır. Tipik 10–100 Ω.',
    sw_idrv: 'Sürücü akım kapasitesi',
    sw_idrvInfo: 'Mikrodenetleyici pinleri tipik olarak 5–25 mA, gate sürücü entegreleri 0,5–4 A verebilir.',
    sw_rpd: 'Gate–source çekme direnci Rgs',
    sw_rpdInfo: 'Gate ile source arasındaki direnç; sürücü yüksek empedanslıyken (açılış, reset) gate’i boşaltır ve MOSFET’i kesimde tutar. 10–100 kΩ tipiktir.',
    sw_fsw: 'PWM frekansı',
    sw_fswInfo: 'Yalnızca anahtar PWM ile sürülüyorsa girin; gate sürme gücü ve anahtarlama süresinin periyoda oranı hesaplanır.',
    sw_rb: 'Baz direnci Rb',
    sw_exact: 'hesaplanan {r}',
    sw_ib: 'Baz akımı Ib',
    sw_ibSub: 'β = Ic / Ib = {b}',
    sw_ploss: 'Transistör kaybı',
    sw_detailsTitle: 'Ayrıntılar',
    sw_ic: 'Kollektör akımı Ic',
    sw_ibTarget: 'Gereken baz akımı Ic / β_zorlanmış',
    sw_rbExact: 'Rb (hesaplanan)',
    sw_rbStd: 'Rb (standart, aşağı yuvarlanmış)',
    sw_iDrive: 'Sürücü pinin verdiği akım',
    sw_iRbe: 'Rbe’den akan akım',
    sw_beta: 'Gerçek zorlanmış β / hFE(min)',
    sw_stepBeta: 'Gerçek zorlanmış β',
    sw_pC: 'Kollektör kaybı Vce(sat) · Ic',
    sw_pB: 'Baz kaybı Vbe · Ib',
    sw_pRb: 'Rb güç kaybı',
    sw_vload: 'Yük üzerindeki gerilim',
    sw_pcond: 'İletim kaybı',
    sw_pcondSub: 'sıcakta ≈ {p}',
    sw_ton: 'Açılma süresi (yaklaşık)',
    sw_tonSub: 'Ig = {i}',
    sw_vds: 'Drain–source düşümü',
    sw_id: 'Drain akımı Id',
    sw_vgs: 'Gate–source gerilimi (statik)',
    sw_pHot: 'İletim kaybı, Tj ≈ 100–125 °C (×{k})',
    sw_ig: 'Plato sırasında gate akımı',
    sw_igPeak: 'Tepe gate akımı',
    sw_limited: 'Akımı sınırlayan',
    sw_limRg: 'Rg',
    sw_limDrv: 'sürücü',
    sw_iPd: 'Rgs’den akan sürekli akım',
    sw_pGate: 'Gate sürme gücü Qg · Vdrive · f',
    sw_iGate: 'Ortalama gate akımı Qg · f',
    sw_tonShare: 'Açılma süresinin periyoda oranı',
    sw_indTitle: 'Endüktif yük: serbest geçiş diyodu',
    sw_dI: 'Diyot akımı (en az)',
    sw_dV: 'Diyot ters gerilimi (en az)',
    sw_vPeak: 'Kesimde anahtar üzerindeki gerilim',
    sw_indNote: 'Diyot yüke ters paralel bağlanır: katot Vs tarafına, anot anahtar tarafına. Kesimde bobin akımı diyot üzerinden döner ve anahtar gerilimi Vs + ~0,7 V’ta kalır. Diyot bobin akımını yavaş söndürür; rölenin daha hızlı bırakması gerekiyorsa diyoda seri bir zener ekleyin (anahtar bu durumda Vs + Vz’ye dayanmalıdır).',
    sw_noteBjt: 'Doymuş anahtar tasarımında baz akımı, hFE(min)’in gerektirdiğinden birkaç kat büyük seçilir (zorlanmış β ≈ 10–20). Rb aşağı yuvarlanır; böylece baz akımı en az hedef kadar olur. Vbe(sat) ve Vce(sat) veri sayfasında Ic/Ib = 10 koşulunda verilir.',
    sw_noteMos: 'Açılma süresi kaba bir tahmindir: sürücü Qg yükünü, Miller platosu sırasında akan akımla doldurur. İletim kaybı Rds(on)’un 25 °C değeriyle ve sıcak jonksiyon için ×1,5 ile verilir. Anahtarlama kayıpları ve jonksiyon sıcaklığı için MOSFET kayıpları hesaplayıcısını kullanın.',
    warn_sw_noSat: 'Zorlanmış β ({b}) hFE(min) değerinin ({h}) üstünde: transistör doymaz, aktif bölgede kalır ve ısınır. Rb’yi küçültün ya da daha yüksek kazançlı bir transistör (veya MOSFET) seçin.',
    warn_sw_weakSat: 'Zorlanmış β ({b}), hFE(min)’in yarısından büyük; sıcaklık ve parça farklılıklarında doyma payı az. β_zorlanmış ≈ 10–20 hedefleyin.',
    warn_sw_pinCurrent: 'Sürücü pin {i} vermek zorunda; mikrodenetleyici pinleri çoğunlukla 4–20 mA ile sınırlıdır. Veri sayfasını kontrol edin ya da bir MOSFET veya Darlington kullanın.',
    warn_sw_bjtHot: 'Transistör kaybı {p}; SOT-23 kılıf tipik olarak 0,25–0,35 W taşıyabilir. Daha büyük bir kılıf ya da MOSFET düşünün.',
    warn_sw_bjtHighI: 'Yarım amperin üstündeki akımlarda BJT büyük baz akımı ister; bu akımda bir MOSFET genellikle daha iyi bir anahtardır.',
    warn_sw_vgsLow: 'Gate gerilimi ({vgs}), Rds(on)’un garanti edildiği {spec} değerinin altında: MOSFET tam iletime geçmeyebilir ve ısınabilir. Daha düşük Vgs’de tanımlı (logic-level) bir MOSFET ya da bir gate sürücüsü kullanın.',
    warn_sw_belowVth: 'Gate gerilimi, Vgs(th)’nin en büyük değerine eşit ya da altında: MOSFET bazı parçalarda hiç iletmeyebilir.',
    warn_sw_plateau: 'Sürme gerilimi Miller platosunun üstüne çıkmıyor; MOSFET tam olarak açılamaz.',
    warn_sw_vgsMax: 'Sürme gerilimi {v}: birçok logic-level MOSFET gate–source arasında yalnızca ±12 V (bazıları ±8 V) kaldırır. Veri sayfasındaki Vgs(max) değerini kontrol edin.',
    warn_sw_mosHot: 'İletim kaybı sıcak durumda {p}; küçük kılıflar (SOT-23) yaklaşık 0,3–0,5 W taşır. Daha düşük Rds(on) ya da daha büyük kılıf seçin, termal hesabı yapın.',
    warn_sw_noPd: 'Gate–source çekme direnci yok: açılışta ya da reset sırasında pin yüksek empedanslıyken gate yüzer ve MOSFET kendiliğinden iletebilir. 10–100 kΩ ekleyin.',
    warn_sw_slowPwm: 'Açılma süresi PWM periyodunun {pct} kadarı: anahtarlama kayıpları önemli olur. Daha güçlü bir gate sürücüsü kullanın ya da frekansı düşürün.',
    err_sw_driveLow: 'Sürme gerilimi Vbe(sat) değerinden büyük olmalı.',
    err_sw_noLoad: 'Yük akımı sıfırdan büyük olmalı (Vs, anahtar düşümünden büyük olmalı).',
    sw_dgBjt: 'Düşük taraf NPN anahtar: GPIO çıkışı, baz direnci, yük ve canlı akım değerleri',
    sw_dgMos: 'Düşük taraf N-MOSFET anahtar: GPIO çıkışı, gate direnci, gate çekme direnci, yük ve canlı değerler',
    sw_dgLoad: 'Yük',
  },
  en: {
    sw_dev: 'Switch',
    sw_bjt: 'NPN BJT',
    sw_mos: 'N-channel MOSFET',
    sw_load: 'Load type',
    sw_loadRes: 'Resistive / LED',
    sw_loadInd: 'Inductive (relay, motor)',
    sw_loadInfo: 'Relay coils, motors, solenoids and inductors are inductive: when the switch turns off the current cannot stop instantly and a high voltage spike appears. These loads need a flyback diode across them.',
    sw_ldm: 'Load given as',
    sw_ldmI: 'Current',
    sw_ldmR: 'Resistance',
    sw_loadTitle: 'Load and drive',
    sw_vs: 'Load supply voltage Vs',
    sw_il: 'Load current',
    sw_rl: 'Load resistance RL',
    sw_rlInfo: 'Coil resistance for a relay, or the equivalent resistance of an LED string with its resistor. The current is calculated after subtracting the switch drop.',
    sw_vdrv: 'Drive voltage (GPIO high level)',
    sw_vdrvInfo: 'High-level output voltage of the microcontroller pin; usually equal to its supply (1.8 / 3.3 / 5 V).',
    sw_bjtTitle: 'BJT data',
    sw_hfe: 'Current gain hFE (minimum)',
    sw_hfeInfo: 'Minimum hFE from the datasheet at your collector current. Use the minimum, not the typical value; hFE varies with temperature and current.',
    sw_betaF: 'Forced β (Ic / Ib)',
    sw_betaFInfo: 'For saturation the base current is made much larger than hFE would require. Datasheets usually specify Vce(sat) at Ic/Ib = 10; 10–20 is a safe choice.',
    sw_vbe: 'Base–emitter voltage Vbe(sat)',
    sw_vce: 'Collector–emitter saturation voltage Vce(sat)',
    sw_rbe: 'Base–emitter resistor Rbe',
    sw_rbeInfo: 'A resistor from base to emitter (e.g. 10–100 kΩ) keeps the transistor off while the driver is high-impedance (during reset) and speeds up turn-off. It takes some of the base current; the calculation includes it.',
    sw_series: 'E-series',
    sw_mosTitle: 'MOSFET data',
    sw_rds: 'Rds(on) (datasheet)',
    sw_vgss: 'Vgs at which Rds(on) is specified',
    sw_vgssInfo: 'The datasheet guarantees Rds(on) at specific Vgs values (e.g. 10 V, 4.5 V, 2.5 V). If your drive voltage is below that value, Rds(on) is not guaranteed.',
    sw_vth: 'Threshold voltage Vgs(th) (maximum)',
    sw_vthInfo: 'Vgs(th) is where the MOSFET only starts to conduct (e.g. 250 µA); full conduction needs a much higher Vgs. Enter the datasheet maximum.',
    sw_qg: 'Total gate charge Qg',
    sw_qgInfo: 'Total charge from the gate-charge curve at your drive voltage.',
    sw_vpl: 'Miller plateau voltage',
    sw_vplInfo: 'The voltage of the flat part of the gate-charge curve. Switching happens on this plateau; if the driver cannot rise above it, the MOSFET never turns fully on.',
    sw_rg: 'Gate resistor Rg',
    sw_rgInfo: 'Series resistor between driver and gate; it reduces ringing and EMI and slows switching. Typically 10–100 Ω.',
    sw_idrv: 'Driver current capability',
    sw_idrvInfo: 'Microcontroller pins typically deliver 5–25 mA, gate-driver ICs 0.5–4 A.',
    sw_rpd: 'Gate–source pull-down Rgs',
    sw_rpdInfo: 'Resistor from gate to source; it discharges the gate while the driver is high-impedance (power-up, reset) and keeps the MOSFET off. 10–100 kΩ is typical.',
    sw_fsw: 'PWM frequency',
    sw_fswInfo: 'Enter only if the switch is PWM driven; the gate-drive power and the switching time as a share of the period are calculated.',
    sw_rb: 'Base resistor Rb',
    sw_exact: 'calculated {r}',
    sw_ib: 'Base current Ib',
    sw_ibSub: 'β = Ic / Ib = {b}',
    sw_ploss: 'Transistor loss',
    sw_detailsTitle: 'Details',
    sw_ic: 'Collector current Ic',
    sw_ibTarget: 'Required base current Ic / β_forced',
    sw_rbExact: 'Rb (calculated)',
    sw_rbStd: 'Rb (standard, rounded down)',
    sw_iDrive: 'Current from the drive pin',
    sw_iRbe: 'Current through Rbe',
    sw_beta: 'Actual forced β / hFE(min)',
    sw_stepBeta: 'Actual forced β',
    sw_pC: 'Collector loss Vce(sat) · Ic',
    sw_pB: 'Base loss Vbe · Ib',
    sw_pRb: 'Rb dissipation',
    sw_vload: 'Voltage across the load',
    sw_pcond: 'Conduction loss',
    sw_pcondSub: 'hot ≈ {p}',
    sw_ton: 'Turn-on time (approx.)',
    sw_tonSub: 'Ig = {i}',
    sw_vds: 'Drain–source drop',
    sw_id: 'Drain current Id',
    sw_vgs: 'Gate–source voltage (static)',
    sw_pHot: 'Conduction loss at Tj ≈ 100–125 °C (×{k})',
    sw_ig: 'Gate current on the plateau',
    sw_igPeak: 'Peak gate current',
    sw_limited: 'Limited by',
    sw_limRg: 'Rg',
    sw_limDrv: 'driver',
    sw_iPd: 'Steady current through Rgs',
    sw_pGate: 'Gate-drive power Qg · Vdrive · f',
    sw_iGate: 'Average gate current Qg · f',
    sw_tonShare: 'Turn-on time as share of the period',
    sw_indTitle: 'Inductive load: flyback diode',
    sw_dI: 'Diode current (minimum)',
    sw_dV: 'Diode reverse voltage (minimum)',
    sw_vPeak: 'Switch voltage at turn-off',
    sw_indNote: 'The diode goes across the load, reverse biased: cathode to Vs, anode to the switch. At turn-off the coil current circulates through the diode and the switch voltage stays at Vs + ~0.7 V. A plain diode makes the current decay slowly; if a relay must release faster, add a zener in series with the diode (the switch must then withstand Vs + Vz).',
    sw_noteBjt: 'A saturated switch uses a base current several times larger than hFE(min) requires (forced β ≈ 10–20). Rb is rounded down so the base current is at least the target. Datasheets give Vbe(sat) and Vce(sat) at Ic/Ib = 10.',
    sw_noteMos: 'The turn-on time is a rough estimate: the driver supplies Qg with the current that flows during the Miller plateau. Conduction loss uses the 25 °C Rds(on) and ×1.5 for a hot junction. Use the MOSFET losses calculator for switching losses and junction temperature.',
    warn_sw_noSat: 'The forced β ({b}) is above hFE(min) ({h}): the transistor does not saturate, stays in the active region and heats up. Reduce Rb or choose a higher-gain transistor (or a MOSFET).',
    warn_sw_weakSat: 'The forced β ({b}) is more than half of hFE(min); little saturation margin over temperature and part spread. Aim for β_forced ≈ 10–20.',
    warn_sw_pinCurrent: 'The drive pin must supply {i}; microcontroller pins are usually limited to 4–20 mA. Check the datasheet, or use a MOSFET or a Darlington.',
    warn_sw_bjtHot: 'Transistor loss is {p}; a SOT-23 package typically handles 0.25–0.35 W. Consider a larger package or a MOSFET.',
    warn_sw_bjtHighI: 'Above half an ampere a BJT needs a large base current; a MOSFET is usually the better switch here.',
    warn_sw_vgsLow: 'The gate voltage ({vgs}) is below the {spec} at which Rds(on) is guaranteed: the MOSFET may not turn fully on and may overheat. Use a MOSFET specified at a lower Vgs (logic level) or a gate driver.',
    warn_sw_belowVth: 'The gate voltage is at or below the maximum Vgs(th): some parts may not conduct at all.',
    warn_sw_plateau: 'The drive voltage does not rise above the Miller plateau; the MOSFET cannot turn fully on.',
    warn_sw_vgsMax: 'The drive voltage is {v}: many logic-level MOSFETs tolerate only ±12 V (some ±8 V) gate to source. Check Vgs(max) in the datasheet.',
    warn_sw_mosHot: 'Hot conduction loss is {p}; small packages (SOT-23) handle about 0.3–0.5 W. Choose a lower Rds(on) or a larger package and check the thermal design.',
    warn_sw_noPd: 'No gate–source pull-down: at power-up or reset, while the pin is high-impedance, the gate floats and the MOSFET may turn on by itself. Add 10–100 kΩ.',
    warn_sw_slowPwm: 'The turn-on time is {pct} of the PWM period: switching losses become significant. Use a stronger gate driver or a lower frequency.',
    err_sw_driveLow: 'The drive voltage must be greater than Vbe(sat).',
    err_sw_noLoad: 'The load current must be greater than zero (Vs must exceed the switch drop).',
    sw_dgBjt: 'Low-side NPN switch: GPIO output, base resistor, load and live current values',
    sw_dgMos: 'Low-side N-MOSFET switch: GPIO output, gate resistor, gate pull-down, load and live values',
    sw_dgLoad: 'Load',
  },
};

const isDev = (d) => (v) => v.dev === d;
const val = (x, unit) => (Number.isFinite(x) && x > 0 ? si(x, unit, 3) : '?');
const pct = (x) => new Intl.NumberFormat(locale(), { style: 'percent', maximumSignificantDigits: 2 }).format(x);
const SCALE = { mA: 1e-3, A: 1, mohm: 1e-3, ohm: 1, kHz: 1e3, Hz: 1 };
const num = (x, u) => x * (SCALE[u] ?? 1);
/** Forward voltage assumed for the flyback diode (V). */
const V_F = 0.7;
// Values as they appear inside the calculation steps.
const qV = (x) => tx(si(x, 'V'));
const qA = (x) => tx(si(x, 'A'));
const qR = (x) => tx(si(x, 'Ω'));
const qW = (x) => tx(si(x, 'W'));

// ---------------------------------------------------------------------------
// Diagram
// ---------------------------------------------------------------------------

function diagram(v, u, r) {
  const bjt = v.dev === 'bjt';
  const ind = v.load === 'ind';
  const xs = 330; // switch / load column
  const yLoadTop = 22;
  const yC = 96; // collector / drain
  const yB = 122; // base / gate
  let b = terminal(xs, yLoadTop - 4, `Vs = ${val(v.vs, 'V')}`, 'top', 'val');
  const loadVal = v.ldm === 'r' ? val(v.rl, 'Ω') : val(num(v.il, u.il), 'A');
  if (ind) {
    b += twoTerm('L', xs, yLoadTop, xs, yC, { name: t('sw_dgLoad'), value: loadVal, flip: true })
      + node(xs, yLoadTop + 8) + node(xs, yC - 6)
      + wire([xs, yLoadTop + 8], [384, yLoadTop + 8]) + wire([xs, yC - 6], [384, yC - 6])
      + twoTerm('D', 384, yC - 6, 384, yLoadTop + 8, { name: 'D1' });
  } else {
    b += twoTerm('R', xs, yLoadTop, xs, yC, { name: t('sw_dgLoad'), value: loadVal });
  }
  b += (bjt ? npn(xs - 12, yB) : mosfet(xs - 12, yB))
    + wire([xs, yB + 26], [xs, 172]) + ground(xs, 172)
    + icBlock(18, yB - 20, 58, 40, 'MCU', 'GPIO')
    + text(47, yB - 28, val(v.vdrv, 'V'), { cls: 'val' })
    + wire([76, yB], [112, yB])
    + twoTerm('R', 112, yB, 196, yB, { name: bjt ? 'Rb' : 'Rg', value: bjt ? val(r?.rb, 'Ω') : val(v.rg, 'Ω') })
    + wire([196, yB], [xs - 30, yB]);
  const rDown = bjt ? v.rbe : v.rpd;
  if (rDown > 0) {
    b += node(246, yB) + twoTerm('R', 246, yB, 246, 172, { name: bjt ? 'Rbe' : 'Rgs', value: val(rDown, 'Ω'), flip: true }) + ground(246, 172);
  }
  // Currents and switch values
  const iLoad = bjt ? r?.ic : r?.id;
  b += arrow(xs + 18, yB - 18, xs + 18, yB + 16, { cls: 'flow', headCls: 'arrow flow' })
    + text(xs + 26, yB + 2, `${bjt ? 'Ic' : 'Id'} = ${val(iLoad, 'A')}`, { cls: 'val', anchor: 'start' })
    + text(xs + 26, yB + 36, bjt ? `Vce = ${val(v.vce, 'V')}` : `Rds = ${val(num(v.rds, u.rds), 'Ω')}`, { cls: 'lbl', anchor: 'start' });
  if (bjt) {
    b += arrow(204, yB - 10, 234, yB - 10, { cls: 'flow', headCls: 'arrow flow' })
      + text(219, yB - 16, `Ib = ${val(r?.ibStd, 'A')}`, { cls: 'val' });
  } else {
    b += text(282, yB - 30, `Vgs = ${val(r?.vgs, 'V')}`, { cls: 'val', anchor: 'end' });
  }
  const summary = !r ? ''
    : bjt ? `β = Ic / Ib = ${fmt(r.betaStd, 3)} · P = ${si(r.pTotal, 'W', 3)}`
      : `t_on ≈ ${Number.isFinite(r.tOn) ? si(r.tOn, 's', 2) : '∞'} · P = ${si(r.pCond, 'W', 3)}`;
  if (summary) b += text(200, 208, summary, { cls: 'title' });
  return svg(440, 216, b, t(bjt ? 'sw_dgBjt' : 'sw_dgMos'), { wide: true });
}

// ---------------------------------------------------------------------------

function renderBjt(r, v, worked) {
  return heroes([
    ['sw_rb', siHtml(r.rb, 'Ω'), `${esc(v.ser)} · ${esc(t('sw_exact', { r: si(r.rbExact, 'Ω', 3) }))}`],
    ['sw_ib', siHtml(r.ibStd, 'A'), esc(t('sw_ibSub', { b: fmt(r.betaStd, 3) }))],
    ['sw_ploss', siHtml(r.pTotal, 'W'), 'Vce·Ic + Vbe·Ib'],
  ])
    + messages('warn', r.warnings, r.vars)
    + worked
    + block('sw_detailsTitle', rows([
      ['sw_ic', si(r.ic, 'A')],
      ['sw_ibTarget', si(r.ib, 'A')],
      ['sw_rbExact', si(r.rbExact, 'Ω')],
      ['sw_rbStd', si(r.rb, 'Ω'), true],
      ['sw_iDrive', si(r.iDrive, 'A')],
      r.iRbe > 0 && ['sw_iRbe', si(r.iRbe, 'A')],
      ['sw_beta', `${fmt(r.betaStd, 3)} / ${fmt(r.hfe, 3)}`],
      ['sw_pC', si(r.pC, 'W')],
      ['sw_pB', si(r.pB, 'W')],
      ['sw_pRb', si(r.pRb, 'W')],
      ['sw_vload', si(v.vs - v.vce, 'V')],
    ]));
}

function renderMos(r, v, u, worked) {
  const ton = Number.isFinite(r.tOn) ? siHtml(r.tOn, 's') : '∞';
  return heroes([
    ['sw_pcond', siHtml(r.pCond, 'W'), esc(t('sw_pcondSub', { p: si(r.pCondHot, 'W', 3) }))],
    ['sw_ton', ton, esc(t('sw_tonSub', { i: si(r.ig, 'A', 3) }))],
    ['sw_vds', siHtml(r.vds, 'V')],
  ])
    + messages('warn', r.warnings, r.vars)
    + worked
    + block('sw_detailsTitle', rows([
      ['sw_id', si(r.id, 'A')],
      ['sw_vgs', `${si(r.vgs, 'V', 3)} (${esc(t('sw_vgss'))}: ${si(v.vgss, 'V', 3)})`],
      ['sw_rds', si(num(v.rds, u.rds), 'Ω')],
      ['sw_pcond', si(r.pCond, 'W')],
      [t('sw_pHot', { k: fmt(HOT_FACTOR) }), si(r.pCondHot, 'W'), false, true],
      ['sw_igPeak', si(r.igPeak, 'A', 3)],
      ['sw_ig', si(r.ig, 'A', 3)],
      ['sw_limited', esc(t(r.limitedBy === 'rg' ? 'sw_limRg' : 'sw_limDrv'))],
      ['sw_ton', Number.isFinite(r.tOn) ? si(r.tOn, 's', 3) : '∞', true],
      r.iPd > 0 && ['sw_iPd', si(r.iPd, 'A', 3)],
      Number.isFinite(r.pGate) && ['sw_pGate', si(r.pGate, 'W', 3)],
      Number.isFinite(r.iGateAvg) && ['sw_iGate', si(r.iGateAvg, 'A', 3)],
      Number.isFinite(r.dutyOfPeriod) && ['sw_tonShare', pct(r.dutyOfPeriod)],
    ]));
}

/** Flyback step shared by both switches: the diode clamps the switch node one forward drop above Vs. */
const flybackStep = (v) => v.load === 'ind' && {
  label: 'sw_vPeak', sym: 'V_{sw} \\approx V_{s} + V_{F}', num: `${qV(v.vs)} + ${qV(V_F)}`, res: tx(si(v.vs + V_F, 'V', 3)),
};

/** Steps of the saturated NPN switch, in the order bjtSwitch() works. */
function workedBjt(r, v) {
  const hasRbe = r.iRbe > 0;
  const byR = v.ldm === 'r';
  const drive = `${qV(v.vdrv)} − ${qV(v.vbe)}`;
  return steps([
    byR && { label: 'sw_ic', sym: 'I_{C} = \\frac{V_{s} − V_{CE}}{R_{L}}', num: `\\frac{${qV(v.vs)} − ${qV(v.vce)}}{${qR(v.rl)}}`, res: qA(r.ic) },
    { label: 'sw_ibTarget', sym: 'I_{B,req} = \\frac{I_{C}}{β_{f}}', num: `\\frac{${qA(r.ic)}}{${tx(fmt(v.betaF))}}`, res: qA(r.ib) },
    { label: 'sw_rbExact', sym: hasRbe ? 'R_{b} = \\frac{V_{drv} − V_{BE}}{I_{B,req} + \\frac{V_{BE}}{R_{BE}}}' : 'R_{b} = \\frac{V_{drv} − V_{BE}}{I_{B,req}}',
      num: `\\frac{${drive}}{${qA(r.ib)}${hasRbe ? ` + \\frac{${qV(v.vbe)}}{${qR(v.rbe)}}` : ''}}`, res: qR(r.rbExact) },
    { label: 'sw_rbStd', sym: 'R_{b}', res: qR(r.rb) },
    { label: 'sw_ib', sym: hasRbe ? 'I_{B} = \\frac{V_{drv} − V_{BE}}{R_{b}} − \\frac{V_{BE}}{R_{BE}}' : 'I_{B} = \\frac{V_{drv} − V_{BE}}{R_{b}}',
      num: `\\frac{${drive}}{${qR(r.rb)}}${hasRbe ? ` − \\frac{${qV(v.vbe)}}{${qR(v.rbe)}}` : ''}`, res: qA(r.ibStd) },
    { label: 'sw_stepBeta', sym: 'β = \\frac{I_{C}}{I_{B}}', num: `\\frac{${qA(r.ic)}}{${qA(r.ibStd)}}`, res: tx(fmt(r.betaStd, 4)) },
    { label: 'sw_ploss', sym: 'P = V_{CE} \\cdot I_{C} + V_{BE} \\cdot I_{B}',
      num: `${qV(v.vce)} \\cdot ${qA(r.ic)} + ${qV(v.vbe)} \\cdot ${qA(r.ibStd)}`, res: qW(r.pTotal) },
    flybackStep(v),
  ], {
    note: 'sw_noteBjt',
    where: [(byR || v.load === 'ind') && ['V_{s}', 'sw_vs', 'vs'], byR && ['R_{L}', 'sw_rl', 'rl'], !byR && ['I_{C}', 'sw_il', 'il'],
      ['β_{f}', 'sw_betaF', 'betaF'], ['V_{drv}', 'sw_vdrv', 'vdrv'], ['V_{BE}', 'sw_vbe', 'vbe'], ['V_{CE}', 'sw_vce', 'vce'],
      hasRbe && ['R_{BE}', 'sw_rbe', 'rbe']],
    refs: ['Horowitz & Hill, The Art of Electronics, 3rd ed., ch. 2 (transistor switch) and ch. 1 (inductive loads, diode protection)', 'Small-signal BJT datasheets (Vce(sat), Vbe(sat) at Ic/Ib = 10)', 'IEC 60063:2015 (E-series)'],
  });
}

/** Steps of the N-MOSFET switch, in the order mosfetSwitch() works. */
function workedMos(r, v, u) {
  const rds = num(v.rds, u.rds);
  const hasRg = v.rg > 0;
  const hasRpd = v.rpd > 0;
  const hasF = Number.isFinite(r.pGate);
  const byR = v.ldm === 'r';
  const qg = tx(si(v.qg * 1e-9, 'C'));
  return steps([
    byR && { label: 'sw_id', sym: 'I_{D} = \\frac{V_{s}}{R_{L} + R_{DS}}', num: `\\frac{${qV(v.vs)}}{${qR(v.rl)} + ${qR(rds)}}`, res: qA(r.id) },
    { label: 'sw_pcond', sym: 'P = I_{D}^{2} \\cdot R_{DS}', num: `{(${qA(r.id)})}^{2} \\cdot ${qR(rds)}`, res: qW(r.pCond) },
    { labelRaw: t('sw_pHot', { k: fmt(HOT_FACTOR) }), sym: `P_{hot} = ${fmt(HOT_FACTOR)} \\cdot P`, num: `${fmt(HOT_FACTOR)} \\cdot ${qW(r.pCond)}`, res: qW(r.pCondHot) },
    { label: 'sw_vds', sym: 'V_{DS} = I_{D} \\cdot R_{DS}', num: `${qA(r.id)} \\cdot ${qR(rds)}`, res: qV(r.vds) },
    hasRg && hasRpd && { label: 'sw_vgs', sym: 'V_{GS} = V_{drv} \\cdot \\frac{R_{GS}}{R_{GS} + R_{g}}',
      num: `${qV(v.vdrv)} \\cdot \\frac{${qR(v.rpd)}}{${qR(v.rpd)} + ${qR(v.rg)}}`, res: qV(r.vgs) },
    r.plateauOk && (hasRg
      ? { label: 'sw_ig', sym: 'I_{g} = \\min(I_{drv}, \\frac{V_{drv} − V_{pl}}{R_{g}})',
        num: `\\min(${qA(num(v.idrv, u.idrv))}, \\frac{${qV(v.vdrv)} − ${qV(v.vpl)}}{${qR(v.rg)}})`, res: qA(r.ig) }
      : { label: 'sw_ig', sym: 'I_{g} = I_{drv}', res: qA(r.ig) }),
    r.plateauOk && { label: 'sw_ton', sym: 't_{on} \\approx \\frac{Q_{g}}{I_{g}}', num: `\\frac{${qg}}{${qA(r.ig)}}`, res: tx(si(r.tOn, 's')) },
    hasF && { label: 'sw_pGate', sym: 'P_{gate} = Q_{g} \\cdot V_{drv} \\cdot f',
      num: `${qg} \\cdot ${qV(v.vdrv)} \\cdot ${tx(si(num(v.fsw, u.fsw), 'Hz'))}`, res: qW(r.pGate) },
    flybackStep(v),
  ], {
    note: 'sw_noteMos',
    where: [(byR || v.load === 'ind') && ['V_{s}', 'sw_vs', 'vs'], byR && ['R_{L}', 'sw_rl', 'rl'], !byR && ['I_{D}', 'sw_il', 'il'],
      ['R_{DS}', 'sw_rds', 'rds'], ['V_{drv}', 'sw_vdrv', 'vdrv'], hasRg && ['R_{g}', 'sw_rg', 'rg'], hasRg && hasRpd && ['R_{GS}', 'sw_rpd', 'rpd'],
      r.plateauOk && ['I_{drv}', 'sw_idrv', 'idrv'], r.plateauOk && hasRg && ['V_{pl}', 'sw_vpl', 'vpl'], r.plateauOk && ['Q_{g}', 'sw_qg', 'qg'],
      hasF && ['f', 'sw_fsw', 'fsw']],
    refs: ['Vishay AN608A, Power MOSFET Basics: Understanding Gate Charge', 'TI SLUA618, Fundamentals of MOSFET and IGBT Gate Driver Circuits', 'Horowitz & Hill, The Art of Electronics, 3rd ed., ch. 3 (power MOSFET switches)'],
  });
}

function inductiveBlock(r, v) {
  const i = v.dev === 'bjt' ? r.ic : r.id;
  return block('sw_indTitle', rows([
    ['sw_dI', si(i, 'A', 3)],
    ['sw_dV', si(v.vs, 'V', 3)],
    ['sw_vPeak', `≈ ${si(v.vs + V_F, 'V', 3)}`],
  ]) + `<p class="note">${esc(t('sw_indNote'))}</p>`);
}

export default {
  diagram,
  id: 'switch',
  strings,
  sections: [
    {
      title: 'sectionSetup',
      fields: [
        { key: 'dev', type: 'choice', label: 'sw_dev', default: 'bjt',
          options: [{ value: 'bjt', label: 'sw_bjt' }, { value: 'mos', label: 'sw_mos' }] },
        { key: 'load', type: 'choice', label: 'sw_load', default: 'res', info: 'sw_loadInfo',
          options: [{ value: 'res', label: 'sw_loadRes' }, { value: 'ind', label: 'sw_loadInd' }] },
        { key: 'ldm', type: 'choice', label: 'sw_ldm', default: 'i',
          options: [{ value: 'i', label: 'sw_ldmI' }, { value: 'r', label: 'sw_ldmR' }] },
      ],
    },
    {
      title: 'sw_loadTitle',
      fields: [
        { key: 'vs', type: 'number', label: 'sw_vs', default: 12, units: ['V'], max: 1000,
          presets: [5, 12, 24].map((x) => ({ label: `${x} V`, value: x })) },
        { key: 'il', type: 'number', label: 'sw_il', default: 50, units: ['mA', 'A'], show: (v) => v.ldm === 'i' },
        { key: 'rl', type: 'number', label: 'sw_rl', default: 120, units: ['ohm'], si: true, info: 'sw_rlInfo', show: (v) => v.ldm === 'r' },
        { key: 'vdrv', type: 'number', label: 'sw_vdrv', default: 3.3, units: ['V'], info: 'sw_vdrvInfo',
          presets: [1.8, 3.3, 5, 12].map((x) => ({ label: `${x} V`, value: x })) },
      ],
    },
    {
      title: 'sw_bjtTitle',
      show: isDev('bjt'),
      fields: [
        { key: 'hfe', type: 'number', label: 'sw_hfe', default: 100, info: 'sw_hfeInfo', max: 100000 },
        { key: 'betaF', type: 'number', label: 'sw_betaF', default: 10, info: 'sw_betaFInfo', min: 1,
          presets: [10, 20].map((x) => ({ label: String(x), value: x })) },
        { key: 'vbe', type: 'number', label: 'sw_vbe', default: 0.8, units: ['V'], max: 5 },
        { key: 'vce', type: 'number', label: 'sw_vce', default: 0.2, units: ['V'], max: 5 },
        { key: 'rbe', type: 'number', label: 'sw_rbe', default: '', units: ['ohm'], si: true, optional: true, info: 'sw_rbeInfo' },
        { key: 'ser', type: 'select', label: 'sw_series', default: 'E24',
          options: ['E12', 'E24', 'E96'].map((s) => ({ value: s, label: s, raw: true })) },
      ],
    },
    {
      title: 'sw_mosTitle',
      show: isDev('mos'),
      fields: [
        { key: 'rds', type: 'number', label: 'sw_rds', default: 50, units: ['mohm', 'ohm'] },
        { key: 'vgss', type: 'number', label: 'sw_vgss', default: 2.5, units: ['V'], info: 'sw_vgssInfo', max: 30,
          presets: [1.8, 2.5, 4.5, 10].map((x) => ({ label: `${x} V`, value: x })) },
        { key: 'vth', type: 'number', label: 'sw_vth', default: 1.5, units: ['V'], info: 'sw_vthInfo', max: 10 },
        { key: 'qg', type: 'number', label: 'sw_qg', default: 6, units: ['nC'], info: 'sw_qgInfo' },
        { key: 'vpl', type: 'number', label: 'sw_vpl', default: 2, units: ['V'], info: 'sw_vplInfo', max: 15 },
        { key: 'rg', type: 'number', label: 'sw_rg', default: 100, units: ['ohm'], si: true, valid: 'nonneg', info: 'sw_rgInfo' },
        { key: 'idrv', type: 'number', label: 'sw_idrv', default: 20, units: ['mA', 'A'], info: 'sw_idrvInfo' },
        { key: 'rpd', type: 'number', label: 'sw_rpd', default: '100k', units: ['ohm'], si: true, optional: true, info: 'sw_rpdInfo' },
        { key: 'fsw', type: 'number', label: 'sw_fsw', default: '', units: ['kHz', 'Hz'], optional: true, info: 'sw_fswInfo' },
      ],
    },
  ],

  compute(v, u) {
    const iGiven = num(v.il, u.il);
    const warnings = [];
    const vars = {};
    let r;
    if (v.dev === 'bjt') {
      const ic = loadCurrent({ mode: v.ldm, i: iGiven, rl: v.rl, vs: v.vs, drop: v.vce });
      r = bjtSwitch({ ic, vdrive: v.vdrv, vbe: v.vbe, vce: v.vce, hfe: v.hfe, betaF: v.betaF, rbe: v.rbe, series: v.ser });
      if (!r.ok) return r;
      vars.sw_noSat = { b: fmt(r.betaStd, 3), h: fmt(v.hfe, 3) };
      vars.sw_weakSat = vars.sw_noSat;
      vars.sw_pinCurrent = { i: si(r.iDrive, 'A', 3) };
      vars.sw_bjtHot = { p: si(r.pTotal, 'W', 3) };
      if (r.betaStd > v.hfe) warnings.push('sw_noSat');
      else if (r.betaStd > v.hfe / 2) warnings.push('sw_weakSat');
      if (r.iDrive > 10e-3) warnings.push('sw_pinCurrent');
      if (r.pTotal > 0.25) warnings.push('sw_bjtHot');
      if (r.ic > 0.5) warnings.push('sw_bjtHighI');
    } else {
      const rds = num(v.rds, u.rds);
      const id = loadCurrent({ mode: v.ldm, i: iGiven, rl: v.rl, vs: v.vs, rOn: rds });
      r = mosfetSwitch({
        id, vdrive: v.vdrv, rds, vgsSpec: v.vgss, vth: v.vth, qg: v.qg * 1e-9, vpl: v.vpl,
        rg: v.rg, idrv: num(v.idrv, u.idrv), rpd: v.rpd, fsw: num(v.fsw, u.fsw),
      });
      if (!r.ok) return r;
      vars.sw_vgsLow = { vgs: si(r.vgs, 'V', 3), spec: si(v.vgss, 'V', 3) };
      vars.sw_vgsMax = { v: si(v.vdrv, 'V', 3) };
      vars.sw_mosHot = { p: si(r.pCondHot, 'W', 3) };
      vars.sw_slowPwm = { pct: pct(r.dutyOfPeriod) };
      if (r.belowVth) warnings.push('sw_belowVth');
      else if (!r.vgsOk) warnings.push('sw_vgsLow');
      if (!r.plateauOk) warnings.push('sw_plateau');
      if (v.vdrv > 12) warnings.push('sw_vgsMax');
      if (r.pCondHot > 0.5) warnings.push('sw_mosHot');
      if (!(v.rpd > 0)) warnings.push('sw_noPd');
      if (r.dutyOfPeriod > 0.05) warnings.push('sw_slowPwm');
    }
    return { ...r, warnings, vars };
  },

  render(r, v, u) {
    if (!r.ok) return invalid(r.errors);
    const bjt = v.dev === 'bjt';
    const main = bjt ? renderBjt(r, v, workedBjt(r, v)) : renderMos(r, v, u, workedMos(r, v, u));
    return main + (v.load === 'ind' ? inductiveBlock(r, v) : '');
  },
};
