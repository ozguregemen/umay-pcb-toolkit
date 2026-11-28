import { xtalGm, GAIN_MARGIN_MIN } from '../engine/xtalgm.js';
import { heroes, rows, block, steps, messages, invalid } from '../ui/calculator.js';
import { tx } from '../ui/math.js';
import { fmt, si, esc } from '../ui/format.js';
import { t, locale } from '../i18n.js';
import { svg, rect, text, wire, node, ground, twoTerm, inverter } from '../ui/svg.js';

const strings = {
  tr: {
    xg_ex: 'Örnek',
    xg_exInfo: 'Bir örnek seçildiğinde bütün alanlar örnek değerlerle doldurulur; sonra istediğiniz alanı değiştirebilirsiniz. 8 MHz örneği ST AN2867’deki sayısal örnektir; 32,768 kHz kristalinin ve ölçümlü örneğin değerleri tipik örnek değerlerdir. Kendi kristalinizin ve mikrodenetleyicinizin veri sayfasındaki değerleri girin.',
    xg_exNone: 'Örnek seçin…',
    xg_exHse: '8 MHz HSE kristali (AN2867 örneği)',
    xg_exLse: '32,768 kHz saat kristali (örnek değerler)',
    xg_exDl: '8 MHz, seri direnç ve sürme seviyesi ölçümü',
    xg_secXtal: 'Kristal',
    xg_f: 'Frekans (F)',
    xg_esr: 'Eşdeğer seri direnç (ESR)',
    xg_esrHint: 'Kristal veri sayfasındaki en büyük değeri girin.',
    xg_c0: 'Şönt kapasite (C0)',
    xg_c0Info: 'Kristalin elektrotları ile kılıfının oluşturduğu statik kapasite; kristal veri sayfasında “shunt capacitance” olarak verilir. En büyük değeri kullanın.',
    xg_cl: 'Yük kapasitesi (CL)',
    xg_clInfo: 'Kristalin anma frekansının tanımlandığı yük kapasitesi; kristal veri sayfasında “load capacitance” olarak verilir. Kondansatörlerin değeri değil, kristalin gördüğü toplam yüktür.',
    xg_dlmax: 'En büyük sürme seviyesi (DLmax)',
    xg_dlmaxHint: 'Kristal veri sayfasındaki sınır (drive level). Boş bırakılırsa karşılaştırma yapılmaz.',
    xg_secOsc: 'Osilatör (mikrodenetleyici)',
    xg_src: 'Veri sayfasında verilen değer',
    xg_srcGm: 'gm',
    xg_srcCrit: 'Gm,crit,max',
    xg_srcInfo: 'Mikrodenetleyici veri sayfası osilatör eviricisinin geçiş iletkenliğini (gm) ya da bunun yerine kristalin sahip olabileceği en büyük kritik geçiş iletkenliğini (Gm,crit,max) verir. İlkinde koşul gm / gm,crit ≥ kazanç payı, ikincisinde gm,crit ≤ Gm,crit,max biçimindedir.',
    xg_gm: 'Osilatör geçiş iletkenliği (gm)',
    xg_gmHint: 'Mikrodenetleyici veri sayfasındaki en küçük değeri girin.',
    xg_gcm: 'En büyük kritik geçiş iletkenliği (Gm,crit,max)',
    xg_gcmHint: 'Koşul gm,crit ≤ Gm,crit,max biçimindedir; ayrıca bir kazanç payı çarpanı uygulanmaz.',
    xg_mreq: 'Gereken kazanç payı',
    xg_mreqHint: 'AN2867 en az 5 ister.',
    xg_secRext: 'Seri direnç ve sürme seviyesi',
    xg_rext: 'Seri direnç (Rext)',
    xg_rextHint: 'Boş: seri direnç yok.',
    xg_cs: 'Parazitik kapasite (Cs)',
    xg_csHint: 'Pin ve iz kapasitesinin toplamı; tipik değer yaklaşık 5 pF.',
    xg_vpp: 'Ölçülen tepeden tepeye gerilim (Vpp)',
    xg_vppInfo: 'Osilatör girişi (XIN) tarafındaki kondansatörün (CL1) üzerinde ölçülen tepeden tepeye gerilim; sürme seviyesi bu ölçümden kestirilir. Düşük kapasiteli bir prob kullanın: sıradan bir prob devreyi yükleyip genliği değiştirir. Boş bırakılırsa sürme seviyesi hesaplanmaz.',
    xg_cl1: 'XIN tarafındaki kondansatör (CL1)',
    xg_cl1Hint: 'Boş: 2·(CL − Cs) alınır.',
    xg_cp: 'Prob kapasitesi (Cprobe)',
    xg_cpHint: 'Ölçümde kullanılan probun kapasitesi; boş bırakılırsa hesaba katılmaz.',

    xg_margin: 'Kazanç payı',
    xg_ratio: 'Gm,crit,max / gm,crit',
    xg_gmcrit: 'Kritik geçiş iletkenliği gm,crit',
    xg_need: 'en az {req} olmalı',
    xg_withRext: 'Rext ile {x}',
    ok_xg_pass: 'Kazanç payı ({m}) gereken değeri ({req}) karşılıyor: başlama koşulu sağlanıyor.',
    ok_xg_passCrit: 'gm,crit = {g}, veri sayfasındaki Gm,crit,max = {max} değerini aşmıyor: başlama koşulu sağlanıyor.',
    err_xg_low: 'Kazanç payı ({m}) gereken değerin ({req}) altında: osilatör güvenilir biçimde başlamayabilir; 1’in altında hiç salınmaz. ESR’si ya da yük kapasitesi daha düşük bir kristal ya da gm’si daha yüksek bir osilatör kipi seçin. Bu osilatörle ESR en çok {esrmax} olabilir.',
    err_xg_lowCrit: 'gm,crit = {g}, veri sayfasındaki Gm,crit,max = {max} değerinin üzerinde: başlama koşulu sağlanmıyor. ESR’si ya da yük kapasitesi daha düşük bir kristal ya da daha güçlü bir osilatör sürme kipi seçin. Bu osilatörle ESR en çok {esrmax} olabilir.',
    err_xg_rextLost: 'Rext = {r} seri direnciyle koşul artık sağlanmıyor: oran {m0} değerinden {m} değerine düşüyor (en az {req} olmalı). Bu kristalle seri direnç en çok {rmax} olabilir.',
    warn_xg_overdrive: 'Sürme seviyesi kestirimi ({dl}) kristalin sınırının ({max}) üzerinde: kristal aşırı sürülüyor. Rext ekleyin ya da büyütün, ya da sürme seviyesi sınırı daha yüksek bir kristal seçin.',
    warn_xg_strayHigh: 'Parazitik kapasite (Cs = {cs}) yük kapasitesinden (CL = {cl}) küçük değil: 2·(CL − Cs) bir kondansatör değeri vermez. Rext için başlangıç değeri hesaplanamaz; sürme seviyesi kestirimi için CL1 değerini girin.',
    err_xg_positive: 'Frekans, ESR, yük kapasitesi ve geçiş iletkenliği sıfırdan büyük; diğer alanlar geçerli, negatif olmayan sayılar olmalı.',
    err_xg_margin: 'Gereken kazanç payı en az 1 olmalı.',
    err_xg_range: 'Bu değerlerle sonuç sayı aralığının dışına çıkıyor; girdileri kontrol edin.',

    xg_sCond: 'Koşul: gm,crit ≤ Gm,crit,max',
    xg_rEsrMax: 'Koşulu sağlayan en büyük ESR',
    xg_rRextMax: 'İzin verilen en büyük seri direnç (ESRmax − ESR)',
    xg_rMarginR: 'Kazanç payı, Rext ile',
    xg_rRatioR: 'Gm,crit,max / gm,crit, Rext ile',
    xg_rCap: 'Eşit yük kondansatörleri CL1 = CL2',
    xg_rRextSug: 'Rext için başlangıç değeri (CL2’nin reaktansı)',
    xg_rMarginS: 'Kazanç payı, bu başlangıç değeriyle',
    xg_rRatioS: 'Gm,crit,max / gm,crit, bu başlangıç değeriyle',
    xg_rCtot: 'Toplam kapasite Ctot',
    xg_rIrms: 'Kristal akımı Irms',
    xg_rDl: 'Sürme seviyesi DL (ölçümden kestirim)',
    xg_rDlRatio: 'Sınıra oranı DL / DLmax',
    xg_none: 'yok (koşul seri dirençsiz de sağlanmıyor)',
    xg_below: '{x} — gereken {req} değerinin altında',
    xg_meets: '{x} — koşul sağlanıyor (en az {req})',
    xg_capOf: 'CL = {cl}, Cs = {cs} için',
    xg_limit: 'sınır {x}',
    xg_noLimit: 'sınır girilmedi',
    xg_stepCrit: 'AN2867: osilatörün salınımı başlatıp sürdürebilmesi için gm, kritik değerin en az 5 katı olmalıdır.',
    xg_stepCond: 'Oran 1 ya da daha büyükse koşul sağlanır.',
    xg_stepRext: 'AN2867’nin başlangıç noktası: Rext, CL2’nin reaktansına eşit alınır. Seri direnç yalnızca ölçülen sürme seviyesi kristalin sınırını aştığında gerekir; değeri, koşulu hâlâ sağlayacak biçimde (en çok ESRmax − ESR) seçin ve sürme seviyesini yeniden ölçerek doğrulayın.',
    xg_stepDl: 'AN2867’deki ölçüm yöntemi: kristalden geçen akım, XIN tarafındaki kondansatörün üzerindeki gerilimden hesaplanır. Vpp sinüs kabul edilir.',
    xg_note: 'Hesap, ST AN2867 uygulama notundaki yöntemi izler; başka üreticiler de aynı koşulu kullanır. Kristalin en büyük ESR ve C0 değerlerini, osilatörün en küçük gm değerini kullanın: koşul en kötü durumda sağlanmalıdır. gm,crit, C0 + CL toplamının karesiyle büyür; bu yüzden yük kapasitesi düşük kristaller daha kolay başlar. Sürme seviyesi bir ölçüme dayanan kestirimdir; kesin sonuç için akım probuyla ya da kristal üreticisinin önerdiği yöntemle ölçün. Yük kondansatörlerinin değeri için “Kristal yük kondansatörü” hesaplayıcısını kullanın.',
    xg_dgAria: 'Pierce osilatörü: mikrodenetleyicinin içindeki evirici ve geri besleme direnci Rf, XIN ile XOUT arasındaki kristal, toprağa bağlı CL1 ve CL2, çıkışta seri direnç Rext (kullanılmıyorsa kesikli); değerlerle',
  },
  en: {
    xg_ex: 'Example',
    xg_exInfo: 'Picking an example fills every field with example values; change any of them afterwards. The 8 MHz example is the worked example of ST AN2867; the values of the 32.768 kHz crystal and of the example with a measurement are typical example values. Enter the values from the datasheets of your own crystal and microcontroller.',
    xg_exNone: 'Pick an example…',
    xg_exHse: '8 MHz HSE crystal (AN2867 example)',
    xg_exLse: '32.768 kHz watch crystal (example values)',
    xg_exDl: '8 MHz, series resistor and drive-level measurement',
    xg_secXtal: 'Crystal',
    xg_f: 'Frequency (F)',
    xg_esr: 'Equivalent series resistance (ESR)',
    xg_esrHint: 'Enter the maximum value of the crystal datasheet.',
    xg_c0: 'Shunt capacitance (C0)',
    xg_c0Info: 'The static capacitance of the crystal electrodes and its package; the crystal datasheet lists it as “shunt capacitance”. Use the maximum value.',
    xg_cl: 'Load capacitance (CL)',
    xg_clInfo: 'The load capacitance at which the nominal frequency of the crystal is specified; the crystal datasheet lists it as “load capacitance”. It is the total load the crystal sees, not the value of the capacitors.',
    xg_dlmax: 'Maximum drive level (DLmax)',
    xg_dlmaxHint: 'The limit in the crystal datasheet (drive level). Leave empty for no comparison.',
    xg_secOsc: 'Oscillator (microcontroller)',
    xg_src: 'Value given in the datasheet',
    xg_srcGm: 'gm',
    xg_srcCrit: 'Gm,crit,max',
    xg_srcInfo: 'The microcontroller datasheet gives the transconductance of the oscillator inverter (gm), or instead the largest critical transconductance the crystal may have (Gm,crit,max). With the first the condition is gm / gm,crit ≥ gain margin, with the second gm,crit ≤ Gm,crit,max.',
    xg_gm: 'Oscillator transconductance (gm)',
    xg_gmHint: 'Enter the minimum value of the microcontroller datasheet.',
    xg_gcm: 'Maximum critical transconductance (Gm,crit,max)',
    xg_gcmHint: 'The condition is gm,crit ≤ Gm,crit,max; no further gain-margin factor is applied.',
    xg_mreq: 'Required gain margin',
    xg_mreqHint: 'AN2867 asks for at least 5.',
    xg_secRext: 'Series resistor and drive level',
    xg_rext: 'Series resistor (Rext)',
    xg_rextHint: 'Empty: no series resistor.',
    xg_cs: 'Stray capacitance (Cs)',
    xg_csHint: 'Pin plus trace capacitance; a typical value is about 5 pF.',
    xg_vpp: 'Measured peak-to-peak voltage (Vpp)',
    xg_vppInfo: 'The peak-to-peak voltage measured across the capacitor on the oscillator input side (CL1, at XIN); the drive level is estimated from it. Use a low-capacitance probe: an ordinary probe loads the circuit and changes the amplitude. Leave empty for no drive-level estimate.',
    xg_cl1: 'Capacitor on the XIN side (CL1)',
    xg_cl1Hint: 'Empty: 2·(CL − Cs) is used.',
    xg_cp: 'Probe capacitance (Cprobe)',
    xg_cpHint: 'Capacitance of the probe used for the measurement; left empty it is not counted.',

    xg_margin: 'Gain margin',
    xg_ratio: 'Gm,crit,max / gm,crit',
    xg_gmcrit: 'Critical transconductance gm,crit',
    xg_need: 'at least {req} is needed',
    xg_withRext: '{x} with Rext',
    ok_xg_pass: 'The gain margin ({m}) meets the required value ({req}): the start-up condition is met.',
    ok_xg_passCrit: 'gm,crit = {g} does not exceed Gm,crit,max = {max} of the datasheet: the start-up condition is met.',
    err_xg_low: 'The gain margin ({m}) is below the required value ({req}): the oscillator may not start reliably, and below 1 it does not oscillate at all. Choose a crystal with a lower ESR or a lower load capacitance, or an oscillator mode with a higher gm. With this oscillator the ESR can be at most {esrmax}.',
    err_xg_lowCrit: 'gm,crit = {g} is above Gm,crit,max = {max} of the datasheet: the start-up condition is not met. Choose a crystal with a lower ESR or a lower load capacitance, or a stronger oscillator drive mode. With this oscillator the ESR can be at most {esrmax}.',
    err_xg_rextLost: 'With the series resistor Rext = {r} the condition is no longer met: the ratio drops from {m0} to {m} (at least {req} is needed). With this crystal the series resistor can be at most {rmax}.',
    warn_xg_overdrive: 'The estimated drive level ({dl}) is above the limit of the crystal ({max}): the crystal is overdriven. Add or raise Rext, or choose a crystal with a higher drive-level rating.',
    warn_xg_strayHigh: 'The stray capacitance (Cs = {cs}) is not smaller than the load capacitance (CL = {cl}): 2·(CL − Cs) gives no capacitor value. No starting value for Rext can be calculated; enter CL1 for the drive-level estimate.',
    err_xg_positive: 'Frequency, ESR, load capacitance and transconductance must be greater than zero; every other field a valid number that is not negative.',
    err_xg_margin: 'The required gain margin must be at least 1.',
    err_xg_range: 'With these values the result leaves the number range; check the inputs.',

    xg_sCond: 'Condition: gm,crit ≤ Gm,crit,max',
    xg_rEsrMax: 'Largest ESR that meets the condition',
    xg_rRextMax: 'Largest series resistor allowed (ESRmax − ESR)',
    xg_rMarginR: 'Gain margin with Rext',
    xg_rRatioR: 'Gm,crit,max / gm,crit with Rext',
    xg_rCap: 'Equal load capacitors CL1 = CL2',
    xg_rRextSug: 'Starting value for Rext (reactance of CL2)',
    xg_rMarginS: 'Gain margin with this starting value',
    xg_rRatioS: 'Gm,crit,max / gm,crit with this starting value',
    xg_rCtot: 'Total capacitance Ctot',
    xg_rIrms: 'Crystal current Irms',
    xg_rDl: 'Drive level DL (estimated from the measurement)',
    xg_rDlRatio: 'Share of the limit DL / DLmax',
    xg_none: 'none (the condition is not met even without a series resistor)',
    xg_below: '{x} — below the required {req}',
    xg_meets: '{x} — condition met (at least {req})',
    xg_capOf: 'for CL = {cl}, Cs = {cs}',
    xg_limit: 'limit {x}',
    xg_noLimit: 'no limit entered',
    xg_stepCrit: 'AN2867: for the oscillation to start and to be sustained, gm must be at least 5 times the critical value.',
    xg_stepCond: 'The condition is met when the ratio is 1 or more.',
    xg_stepRext: 'The starting point of AN2867: Rext is taken equal to the reactance of CL2. A series resistor is needed only when the measured drive level exceeds the limit of the crystal; choose a value that still meets the condition (at most ESRmax − ESR) and confirm it by measuring the drive level again.',
    xg_stepDl: 'The measurement method of AN2867: the current through the crystal is calculated from the voltage across the capacitor on the XIN side. Vpp is taken as a sine wave.',
    xg_note: 'The calculation follows the method of the ST application note AN2867; other vendors use the same condition. Use the maximum ESR and C0 of the crystal and the minimum gm of the oscillator: the condition has to hold in the worst case. gm,crit grows with the square of C0 + CL, which is why crystals with a low load capacitance start more easily. The drive level is an estimate based on one measurement; for a firm result measure with a current probe or by the method the crystal manufacturer recommends. For the value of the load capacitors use the “Crystal load capacitor” calculator.',
    xg_dgAria: 'Pierce oscillator: the inverter with its feedback resistor Rf inside the microcontroller, the crystal between XIN and XOUT, CL1 and CL2 to ground, the series resistor Rext at the output (dashed when not used); with the values',
  },
};

const F_MUL = { MHz: 1e6, kHz: 1e3, Hz: 1 };
const R_MUL = { ohm: 1, kohm: 1e3 };
const G_MUL = { mAV: 1e-3, uAV: 1e-6 };
const V_MUL = { V: 1, mV: 1e-3 };
const GM_UNITS = ['mAV', 'uAV'];

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

const minus = (s) => String(s).replace(/-/g, '−');
const nv = (x, sig = 4) => minus(fmt(x, sig));
const sv = (x, unit, sig = 4) => minus(si(x, unit, sig));
const pfTxt = (xF, sig = 4) => `${nv(xF * 1e12, sig)} pF`;
/** Transconductance as datasheets write it: mA/V from 0.1 mA/V up, µA/V below. */
const gmTxt = (x, sig = 4) => (Number.isFinite(x) && Math.abs(x) < 1e-4 ? `${nv(x * 1e6, sig)} µA/V` : `${nv(x * 1e3, sig)} mA/V`);
/** Percentage inside a formula ("10.36 %"), and as the language writes it in running text (10.4%, %10,4). */
const pctTxt = (x, sig = 4) => `${nv(x * 100, sig)} %`;
const pctShown = (x) => (Number.isFinite(x)
  ? minus(new Intl.NumberFormat(locale(), { style: 'percent', maximumSignificantDigits: 3, useGrouping: false }).format(x)) : '—');

/** "107" or "0.2337 mA/V" → number and unit for a headline value. */
function unitHtml(s) {
  const i = s.lastIndexOf(' ');
  return i < 0 ? esc(s) : `${esc(s.slice(0, i))} <span class="u">${esc(s.slice(i + 1))}</span>`;
}

// ---------------------------------------------------------------------------
// Diagram: the Pierce oscillator with the values
// ---------------------------------------------------------------------------

function diagram(v, u, r) {
  const live = !!r;
  const xi = 130; // XIN column
  const xo = 310; // XOUT column
  const yi = 46; // inverter row
  const yp = 76; // pins (bottom of the MCU box)
  const yx = 142; // crystal row
  const yg = 204; // ground rail
  const crit = live ? r.source === 'gcrit' : v.src === 'gcrit';
  const gName = crit ? 'Gm,crit,max' : 'gm';

  // MCU: the inverter from XIN to XOUT with the feedback resistor Rf across it.
  let b = rect(90, 6, 260, yp - 6, 'soft', ' rx="4"') + text(98, 21, 'MCU', { anchor: 'start' })
    + wire([xi, yp], [xi, yi], [204, yi]) + inverter(204, yi) + wire([234, yi], [xo, yi], [xo, yp])
    + wire([160, yi], [160, 22]) + twoTerm('R', 160, 22, 280, 22) + wire([280, 22], [280, yi]) + node(160, yi) + node(280, yi)
    + text(182, 17, 'Rf', { cls: 'name' })
    + text(220, 71, live ? `${gName} = ${gmTxt(r.gRef)}` : gName, { cls: live ? 'val' : 'name' })
    + text(xi - 6, yp + 13, 'XIN', { anchor: 'end' }) + text(xo + 6, yp + 13, 'XOUT', { anchor: 'start' });

  // XIN goes straight to the crystal, XOUT through the series resistor.
  const used = live && !!r.rext;
  b += wire([xi, yp], [xi, yx]) + wire([xo, yp], [xo, 84])
    + twoTerm('R', xo, 84, xo, 132, { name: 'Rext', value: used ? sv(r.rext.r, 'Ω', 3) : undefined, hi: used, dashed: !used })
    + wire([xo, 132], [xo, yx]);

  // Crystal with its data.
  b += twoTerm('X', xi, yx, xo, yx) + node(xi, yx) + node(xo, yx)
    + text(220, 100, live ? `F = ${sv(r.fHz, 'Hz', 6)}` : 'F', { cls: live ? 'val' : 'sym' })
    + text(220, 116, live ? `ESR = ${sv(r.esr, 'Ω')}` : 'ESR', { cls: live ? 'val' : 'name' })
    + text(220, 170, live ? `C0 = ${pfTxt(r.c0F)} · CL = ${pfTxt(r.clF)}` : 'C0 · CL', { cls: live ? 'val' : 'name' })
    + text(220, 186, live ? `Cs = ${pfTxt(r.csF)}` : 'Cs');

  // Load capacitors to ground: the entered CL1, otherwise the equal pair 2·(CL − Cs).
  const c1 = live ? r.drive?.cl1F ?? r.loadCapF : null;
  const c2 = live ? r.loadCapF : null;
  b += twoTerm('C', xi, yx, xi, yg) + twoTerm('C', xo, yx, xo, yg)
    + text(xi - 16, 171, 'CL1', { cls: 'name', anchor: 'end' }) + (c1 === null ? '' : text(xi - 16, 185, pfTxt(c1), { cls: 'val', anchor: 'end' }))
    + text(xo + 16, 171, 'CL2', { cls: 'name', anchor: 'start' }) + (c2 === null ? '' : text(xo + 16, 185, pfTxt(c2), { cls: 'val', anchor: 'start' }))
    + wire([xi, yg], [xo, yg]) + node(220, yg) + ground(220, yg);

  // The verdicts under the circuit.
  const lines = [];
  if (live) {
    const name = crit ? 'Gm,crit,max / gm,crit' : t('xg_margin');
    lines.push([`gm,crit = ${gmTxt(r.gmCrit)} · ${name} = ${nv(r.gainMargin, 3)}`, r.pass ? 'okt' : 'badt']);
    if (r.rext) lines.push([`Rext: gm,crit = ${gmTxt(r.rext.gmCrit)} · ${name} = ${nv(r.rext.gainMargin, 3)}`, r.rext.pass ? 'okt' : 'badt']);
    if (r.drive) {
      lines.push(r.dlMaxW === null
        ? [`DL = ${sv(r.drive.dlW, 'W', 3)}`, 'val']
        : [`DL = ${sv(r.drive.dlW, 'W', 3)} · DLmax = ${sv(r.dlMaxW, 'W', 3)}`, r.drive.over ? 'badt' : 'okt']);
    }
  } else {
    lines.push(['gm,crit = 4·ESR·(2π·F)²·(C0 + CL)²', 'title']);
  }
  lines.forEach(([s, cls], i) => { b += text(220, 238 + 16 * i, s, { cls }); });
  return svg(440, 278, b, t('xg_dgAria'), { wide: true });
}

// ---------------------------------------------------------------------------
// Calculation steps
// ---------------------------------------------------------------------------

const REFS = [
  'ST AN2867, “Oscillator design guide for STM8AF/AL/S, STM32 MCUs and MPUs”',
  'E. A. Vittoz, M. G. R. Degrauwe & S. Bitz, “High-performance crystal oscillator circuits: theory and application”, IEEE J. Solid-State Circuits 23 (1988)',
];

const sq = (s) => `{(${s})}^{2}`;
// A difference of two close values: enough digits of them are shown for the numbers in the step to give the result.
const closeSig = (a, b) => (a === b ? 4 : Math.min(12, Math.max(4, 4 + Math.ceil(-Math.log10(Math.abs(a / b - 1))))));

function gmSteps(r) {
  const crit = r.source === 'gcrit';
  const F = tx(sv(r.fHz, 'Hz', 6));
  const esr = tx(sv(r.esr, 'Ω', 5));
  const c0 = tx(pfTxt(r.c0F, 5));
  const cl = tx(pfTxt(r.clF, 5));
  const cs = tx(pfTxt(r.csF, 5));
  const g = tx(gmTxt(r.gRef, 5));
  const gSym = crit ? 'G_{m,crit,max}' : 'g_m';
  const need = nv(r.need, 4);
  // (2π·F)²·(C0 + CL)², in symbols and with the numbers.
  const loadSym = `${sq('2π \\cdot F')} \\cdot ${sq('C_0 + C_L')}`;
  const loadNum = `${sq(`2π \\cdot ${F}`)} \\cdot ${sq(`${c0} + ${cl}`)}`;
  /** Margin with a series resistor (the one entered, or the starting value). */
  const withR = (label, rSym, x, sig) => ({
    label,
    sym: `${crit ? '' : 'M_g = '}\\frac{${gSym}}{4 \\cdot (ESR + ${rSym}) \\cdot ${loadSym}}`,
    num: `\\frac{${g}}{4 \\cdot (${esr} + ${tx(sv(x.r, 'Ω', sig))}) \\cdot ${loadNum}}`,
    res: tx(nv(x.gainMargin, 4)),
  });
  const d = r.drive;
  const probe = !!d && d.cProbeF > 0;
  const limSig = closeSig(r.esrMax, r.esr);

  return steps([
    { label: 'xg_gmcrit', sym: `g_{m,crit} = 4 \\cdot ESR \\cdot ${loadSym}`, num: `4 \\cdot ${esr} \\cdot ${loadNum}`, res: tx(gmTxt(r.gmCrit)) },
    crit
      ? { label: 'xg_sCond', sym: '\\frac{G_{m,crit,max}}{g_{m,crit}}', num: `\\frac{${g}}{${tx(gmTxt(r.gmCrit))}}`, res: tx(nv(r.gainMargin, 4)), note: 'xg_stepCond' }
      : { label: 'xg_margin', sym: 'M_g = \\frac{g_m}{g_{m,crit}}', num: `\\frac{${g}}{${tx(gmTxt(r.gmCrit))}}`, res: tx(nv(r.gainMargin, 4)), note: 'xg_stepCrit' },
    { label: 'xg_rEsrMax', sym: `ESR_{max} = \\frac{${gSym}}{${crit ? '' : 'M_{req} \\cdot '}4 \\cdot ${loadSym}}`,
      num: `\\frac{${g}}{${crit ? '' : `${need} \\cdot `}4 \\cdot ${loadNum}}`, res: tx(sv(r.esrMax, 'Ω')) },
    r.rextMax !== null && { label: 'xg_rRextMax', sym: 'R_{ext,max} = ESR_{max} − ESR',
      num: `${tx(sv(r.esrMax, 'Ω', limSig))} − ${tx(sv(r.esr, 'Ω', limSig))}`, res: tx(sv(r.rextMax, 'Ω')) },
    r.rext && withR(crit ? 'xg_rRatioR' : 'xg_rMarginR', 'R_{ext}', r.rext, 5),
    r.loadCapF !== null && { label: 'xg_rCap', sym: 'C_{L1} = C_{L2} = 2 \\cdot (C_L − C_s)', num: `2 \\cdot (${cl} − ${cs})`, res: tx(pfTxt(r.loadCapF)) },
    r.suggest && { label: 'xg_rRextSug', sym: 'R_{ext,0} \\approx \\frac{1}{2π \\cdot F \\cdot C_{L2}}',
      num: `\\frac{1}{2π \\cdot ${F} \\cdot ${tx(pfTxt(r.loadCapF, 5))}}`, res: tx(sv(r.suggest.r, 'Ω')), note: 'xg_stepRext' },
    r.suggest && withR(crit ? 'xg_rRatioS' : 'xg_rMarginS', 'R_{ext,0}', r.suggest, 4),
    d && { label: 'xg_rCtot', sym: `C_{tot} = C_{L1} + \\frac{C_s}{2}${probe ? ' + C_{probe}' : ''}`,
      num: `${tx(pfTxt(d.cl1F, 5))} + \\frac{${cs}}{2}${probe ? ` + ${tx(pfTxt(d.cProbeF, 5))}` : ''}`, res: tx(pfTxt(d.cTotF, 5)) },
    d && { label: 'xg_rIrms', sym: 'I_{rms} = 2π \\cdot F \\cdot \\frac{V_{pp}}{2 \\sqrt{2}} \\cdot C_{tot}',
      num: `2π \\cdot ${F} \\cdot \\frac{${tx(sv(d.vpp, 'V', 5))}}{2 \\sqrt{2}} \\cdot ${tx(pfTxt(d.cTotF, 5))}`, res: tx(sv(d.iRms, 'A', 5)), note: 'xg_stepDl' },
    d && { label: 'xg_rDl', sym: 'DL = ESR \\cdot I_{rms}^{2}', num: `${esr} \\cdot ${sq(tx(sv(d.iRms, 'A', 5)))}`, res: tx(sv(d.dlW, 'W')) },
    d && d.ratio !== null && { label: 'xg_rDlRatio', sym: '\\frac{DL}{DL_{max}}', num: `\\frac{${tx(sv(d.dlW, 'W'))}}{${tx(sv(r.dlMaxW, 'W', 5))}}`, res: tx(pctTxt(d.ratio, 4)) },
  ], {
    note: 'xg_note',
    refs: REFS,
    where: [
      ['F', 'xg_f', 'f'], ['ESR', 'xg_esr', 'esr'], ['C_0', 'xg_c0', 'c0'], ['C_L', 'xg_cl', 'cl'],
      crit ? ['G_{m,crit,max}', 'xg_gcm', 'gcm'] : ['g_m', 'xg_gm', 'gm'], !crit && ['M_{req}', 'xg_mreq', 'mreq'],
      r.rext && ['R_{ext}', 'xg_rext', 'rext'], ['C_s', 'xg_cs', 'cs'],
      d && ['V_{pp}', 'xg_vpp', 'vpp'], d && ['C_{L1}', 'xg_cl1', 'cl1'], probe && ['C_{probe}', 'xg_cp', 'cp'],
      d && d.ratio !== null && ['DL_{max}', 'xg_dlmax', 'dlmax'],
    ],
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const isCrit = (v) => v.src === 'gcrit';
const isGm = (v) => !isCrit(v);

// Examples: every field is set, so an example does not depend on what was entered before.
// Values are in the first unit of each field (MHz, Ω, pF, mA/V, µW, V) unless a `<key>_u` entry names another.
const EXAMPLES = {
  // The worked example of AN2867: g_m,crit = 0.2337 mA/V, gain margin 107.
  hse: { f: 8, esr: 80, c0: 7, cl: 10, dlmax: '', src: 'gm', gm: 25, gcm: 1.5, mreq: GAIN_MARGIN_MIN, rext: '', cs: 5, vpp: '', cl1: '', cp: '' },
  // 32.768 kHz, 70 kΩ, against a maximum critical transconductance of 1.7 µA/V.
  lse: { f: 32.768, f_u: 'kHz', esr: 70, esr_u: 'kohm', c0: 1, cl: 7, dlmax: '', src: 'gcrit', gm: 25, gcm: 1.7, gcm_u: 'uAV', mreq: GAIN_MARGIN_MIN, rext: '', cs: 3, vpp: '', cl1: '', cp: '' },
  // The 8 MHz crystal with 1 kΩ in series and 1.5 V measured across CL1 with a 1 pF probe.
  dl: { f: 8, esr: 80, c0: 7, cl: 10, dlmax: 100, src: 'gm', gm: 25, gcm: 1.5, mreq: GAIN_MARGIN_MIN, rext: 1000, cs: 5, vpp: 1.5, cl1: '', cp: 1 },
};

export default {
  id: 'xtalgm',
  strings,
  diagram,
  sections: [
    {
      title: 'sectionSetup',
      fields: [
        { key: 'ex', type: 'select', label: 'xg_ex', default: 'none', info: 'xg_exInfo',
          options: [
            { value: 'none', label: 'xg_exNone' },
            { value: 'hse', label: 'xg_exHse', set: EXAMPLES.hse },
            { value: 'lse', label: 'xg_exLse', set: EXAMPLES.lse },
            { value: 'dl', label: 'xg_exDl', set: EXAMPLES.dl },
          ] },
      ],
    },
    {
      title: 'xg_secXtal',
      fields: [
        { key: 'f', type: 'number', label: 'xg_f', default: 8, units: ['MHz', 'kHz', 'Hz'],
          presets: [{ label: '32.768 kHz', value: 32.768, unit: 'kHz' }, ...[8, 12, 16, 25].map((x) => ({ label: `${x} MHz`, value: x, unit: 'MHz' }))] },
        { key: 'esr', type: 'number', label: 'xg_esr', default: 80, units: ['ohm', 'kohm'], hint: 'xg_esrHint' },
        { key: 'c0', type: 'number', label: 'xg_c0', default: 7, units: ['pF'], valid: 'nonneg', info: 'xg_c0Info' },
        { key: 'cl', type: 'number', label: 'xg_cl', default: 10, units: ['pF'], info: 'xg_clInfo',
          presets: [6, 8, 10, 12.5, 18, 20].map((x) => ({ label: `${x} pF`, value: x })) },
        { key: 'dlmax', type: 'number', label: 'xg_dlmax', default: '', optional: true, units: ['uW'], hint: 'xg_dlmaxHint' },
      ],
    },
    {
      title: 'xg_secOsc',
      fields: [
        { key: 'src', type: 'choice', label: 'xg_src', default: 'gm', info: 'xg_srcInfo',
          options: [{ value: 'gm', label: 'xg_srcGm' }, { value: 'gcrit', label: 'xg_srcCrit' }] },
        { key: 'gm', type: 'number', label: 'xg_gm', default: 25, units: GM_UNITS, hint: 'xg_gmHint', show: isGm },
        { key: 'gcm', type: 'number', label: 'xg_gcm', default: 1.5, units: GM_UNITS, hint: 'xg_gcmHint', show: isCrit },
        { key: 'mreq', type: 'number', label: 'xg_mreq', default: GAIN_MARGIN_MIN, min: 1, hint: 'xg_mreqHint', show: isGm },
      ],
    },
    {
      title: 'xg_secRext',
      fields: [
        { key: 'rext', type: 'number', label: 'xg_rext', default: '', optional: true, units: ['ohm', 'kohm'], valid: 'nonneg', hint: 'xg_rextHint' },
        { key: 'cs', type: 'number', label: 'xg_cs', default: 5, units: ['pF'], valid: 'nonneg', hint: 'xg_csHint' },
        { key: 'vpp', type: 'number', label: 'xg_vpp', default: '', optional: true, units: ['V', 'mV'], info: 'xg_vppInfo' },
        { key: 'cl1', type: 'number', label: 'xg_cl1', default: '', optional: true, units: ['pF'], hint: 'xg_cl1Hint' },
        { key: 'cp', type: 'number', label: 'xg_cp', default: '', optional: true, units: ['pF'], valid: 'nonneg', hint: 'xg_cpHint' },
      ],
    },
  ],

  compute(v, u) {
    const given = (x) => (Number.isFinite(x) ? x : undefined); // optional field left empty
    return xtalGm({
      fHz: v.f * (F_MUL[u.f] ?? NaN),
      esr: v.esr * (R_MUL[u.esr] ?? NaN),
      c0F: v.c0 * 1e-12,
      clF: v.cl * 1e-12,
      source: v.src,
      gm: v.gm * (G_MUL[u.gm] ?? NaN),
      gmCritMax: v.gcm * (G_MUL[u.gcm] ?? NaN),
      marginReq: v.mreq,
      rext: given(v.rext * (R_MUL[u.rext] ?? NaN)),
      csF: v.cs * 1e-12,
      vpp: given(v.vpp * (V_MUL[u.vpp] ?? NaN)),
      cl1F: given(v.cl1 * 1e-12),
      cProbeF: given(v.cp * 1e-12),
      dlMaxW: given(v.dlmax * 1e-6),
    });
  },

  render(r) {
    if (!r.ok) return invalid(r.errors);
    const crit = r.source === 'gcrit';
    const m = nv(r.gainMargin, 4);
    const req = nv(r.need, 4);
    const ohm = (x) => sv(x, 'Ω');
    const esrmax = sv(r.esrMax, 'Ω', 3);
    // The verdict is about the circuit as entered: with the series resistor when there is one.
    const eff = r.rext ?? r;
    const lost = r.warnings.includes('xg_rextLost');
    const gVars = (x) => ({ g: gmTxt(x.gmCrit, 3), max: gmTxt(r.gRef, 3), esrmax });
    const verdict = !r.pass
      ? messages('error', [crit ? 'xg_lowCrit' : 'xg_low'], { xg_low: { m: nv(r.gainMargin, 3), req, esrmax }, xg_lowCrit: gVars(r) })
      : lost
        ? messages('error', ['xg_rextLost'], {
          xg_rextLost: { r: sv(r.rext.r, 'Ω', 3), m0: nv(r.gainMargin, 3), m: nv(r.rext.gainMargin, 3), req, rmax: sv(r.rextMax ?? 0, 'Ω', 3) },
        })
        : messages('ok', [crit ? 'xg_passCrit' : 'xg_pass'], { xg_pass: { m: nv(eff.gainMargin, 3), req }, xg_passCrit: gVars(eff) });
    const warns = messages('warn', r.warnings.filter((w) => w !== 'xg_low' && w !== 'xg_rextLost'), {
      xg_overdrive: { dl: sv(r.drive?.dlW ?? NaN, 'W', 3), max: sv(r.dlMaxW ?? NaN, 'W', 3) },
      xg_strayHigh: { cs: pfTxt(r.csF, 3), cl: pfTxt(r.clF, 3) },
    });
    /** "7.925 — condition met (at least 5)" for a margin with a series resistor. */
    const judged = (x) => esc(t(x.pass ? 'xg_meets' : 'xg_below', { x: nv(x.gainMargin, 4), req }));
    const d = r.drive;
    return heroes([
      [crit ? 'xg_ratio' : 'xg_margin', unitHtml(m), esc(`${t('xg_need', { req })}${r.rext ? ` · ${t('xg_withRext', { x: nv(r.rext.gainMargin, 3) })}` : ''}`)],
      ['xg_gmcrit', unitHtml(gmTxt(r.gmCrit)), esc(`ESR = ${ohm(r.esr)} · C0 + CL = ${pfTxt(r.cSumF)}`)],
    ])
      + verdict + warns
      + gmSteps(r)
      + block('results', rows([
        ['xg_gmcrit', esc(gmTxt(r.gmCrit)), true],
        [crit ? 'xg_ratio' : 'xg_margin', judged(r), true],
        ['xg_rEsrMax', esc(ohm(r.esrMax))],
        ['xg_rRextMax', esc(r.rextMax === null ? t('xg_none') : ohm(r.rextMax))],
        r.rext && [crit ? 'xg_rRatioR' : 'xg_rMarginR', `${esc(`Rext = ${ohm(r.rext.r)} · gm,crit = ${gmTxt(r.rext.gmCrit)}`)} · ${judged(r.rext)}`, true],
        r.loadCapF !== null && ['xg_rCap', esc(`${pfTxt(r.loadCapF)} (${t('xg_capOf', { cl: pfTxt(r.clF), cs: pfTxt(r.csF) })})`)],
        r.suggest && ['xg_rRextSug', esc(ohm(r.suggest.r))],
        r.suggest && [crit ? 'xg_rRatioS' : 'xg_rMarginS', judged(r.suggest)],
        d && ['xg_rCtot', esc(pfTxt(d.cTotF))],
        d && ['xg_rIrms', esc(sv(d.iRms, 'A'))],
        d && ['xg_rDl', esc(`${sv(d.dlW, 'W')} · ${d.ratio === null ? t('xg_noLimit') : `${pctShown(d.ratio)} · ${t('xg_limit', { x: sv(r.dlMaxW, 'W') })}`}`), true],
      ]));
  },
};
