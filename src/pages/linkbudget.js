import { linkBudget, C0 } from '../engine/linkbudget.js';
import { heroes, rows, block, steps, messages, invalid } from '../ui/calculator.js';
import { tx } from '../ui/math.js';
import { fmt, si, esc } from '../ui/format.js';
import { t, locale } from '../i18n.js';
import { svg, path, text, arrow, poly, dimV } from '../ui/svg.js';

const strings = {
  tr: {
    lb_ex: 'Örnek',
    lb_exInfo: 'Bir örnek seçildiğinde bütün alanlar örnek değerlerle doldurulur; sonra istediğiniz alanı değiştirebilirsiniz. Değerler tipiktir: kendi modülünüzün ve anteninizin veri sayfasındaki değerleri girin.',
    lb_exNone: 'Örnek seçin…',
    lb_exBle: 'BLE 2,44 GHz, 0 dBm, bina içinde 10 m',
    lb_exLora: 'LoRa 868 MHz, 14 dBm, 2 km',
    lb_exWifi: 'Wi-Fi 2,44 GHz, duvar arkasında 20 m',
    lb_secLink: 'Bağlantı',
    lb_f: 'Frekans (f)',
    lb_d: 'Mesafe (d)',
    lb_secTx: 'Verici',
    lb_ptx: 'Verici gücü (Ptx)',
    lb_ptxInfo: 'Vericinin çıkışındaki iletilen güç. 0 dBm = 1 mW, 10 dBm = 10 mW, 20 dBm = 100 mW. İzin verilen ışıma gücü banda ve bölgeye göre değişir; kendi bölgenizin kurallarına bakın.',
    lb_gtx: 'Verici anten kazancı (Gtx)',
    lb_gInfo: 'İzotropik antene göre kazanç (dBi). Yarım dalga dipol 2,15 dBi’dir; küçük çip ve PCB antenlerde değer çoğunlukla 0 dBi dolayında ya da altındadır (tipik). Veri sayfasındaki tepe kazancını değil, karşı antenin bulunduğu yöndeki kazancı kullanın.',
    lb_ltx: 'Verici tarafı kaybı (Ltx)',
    lb_lossHint: 'Kablo, uyumlandırma devresi ve konnektör kayıplarının toplamı.',
    lb_grx: 'Alıcı anten kazancı (Grx)',
    lb_lrx: 'Alıcı tarafı kaybı (Lrx)',
    lb_secPath: 'Yol',
    lb_model: 'Yol kaybı modeli',
    lb_mFree: 'Serbest uzay',
    lb_mLogd: 'Log-mesafe (üs n)',
    lb_modelInfo: 'Serbest uzay: iki anten arasında engelsiz görüş hattı (Friis denklemi). Log-mesafe: 1 m referans mesafesindeki serbest uzay kaybının üzerine kayıp 10·n·log₁₀(d / 1 m) kadar artar; n üssü ortama göre seçilir.',
    lb_n: 'Yol kaybı üssü (n)',
    lb_nHint: 'Tipik değerler: serbest uzayda 2; bina içinde ya da engelli ortamda yaklaşık 2,5–4, yoğun engelde daha büyük.',
    lb_lx: 'Yol üzerindeki ek kayıp (Lx)',
    lb_lxHint: 'Duvar, insan gövdesi, kutu gibi engellerin kaybı.',
    lb_secRx: 'Alıcı',
    lb_sens: 'Alıcı duyarlılığı',
    lb_sDirect: 'Değeri gir',
    lb_sEst: 'Kestir (B, NF, SNR)',
    lb_sensInfo: 'Veri sayfasındaki duyarlılık belirli bir veri hızı, modülasyon ve hata oranı için verilir; kullandığınız çalışma kipine ait değeri girin. Kestirim: S = −174 dBm/Hz + 10·log₁₀(B) + NF + SNR. −174 dBm/Hz, 290 K sıcaklıktaki ısıl gürültü yoğunluğudur (kT).',
    lb_s: 'Duyarlılık (S)',
    lb_b: 'Bant genişliği (B)',
    lb_nf: 'Gürültü sayısı (NF)',
    lb_snr: 'Gereken SNR',
    lb_snrHint: 'Modülasyona ve hedeflenen hata oranına bağlıdır; yayılı spektrumda (ör. LoRa) negatif olabilir.',
    lb_mreq: 'Gereken sönümlenme payı (Mreq)',
    lb_mreqHint: 'Sönümlenmeye (fading) ve toleranslara karşı bırakılan pay; hareketli ya da bina içi bağlantılarda daha büyük seçilir. Bir tasarım tercihidir.',

    lb_margin: 'Bağlantı payı',
    lb_prx: 'Alınan güç',
    lb_over: 'gereken {req} değerinin {x} üzerinde',
    lb_under: 'gereken {req} değerinin {x} altında',
    ok_lb_pass: 'Bağlantı payı ({m}), gereken sönümlenme payını ({req}) karşılıyor.',
    warn_lb_low: 'Alınan güç duyarlılığın {m} üzerinde, ama pay gereken sönümlenme payının ({req}) altında: bağlantı kurulur, sönümlenmeye karşı payı yetersiz kalır. Gereken payla menzil {dmax}.',
    err_lb_fail: 'Alınan güç ({prx}) alıcı duyarlılığının ({s}) altında: bu mesafede bağlantı kurulamaz. Sıfır payla menzil {d0}.',
    warn_lb_nearField: 'Mesafe ({d}) dalga boyundan ({lambda}) kısa: antenler birbirinin yakın alanındadır ve yol kaybı formülü burada geçerli değildir. Büyük antenlerde uzak alan ayrıca 2·D²/λ mesafesinden sonra başlar (D: antenin en büyük boyutu).',
    warn_lb_belowRef: 'Mesafe 1 m referans mesafesinin altında: log-mesafe modeli referans mesafesinden sonrası için tanımlıdır. Bu kadar kısa mesafede serbest uzay modelini kullanın.',
    err_lb_positive: 'Frekans, mesafe, bant genişliği ve yol kaybı üssü sıfırdan büyük, diğer alanlar geçerli birer sayı olmalı.',
    err_lb_nonneg: 'Kayıplar, gürültü sayısı ve gereken sönümlenme payı negatif olamaz.',
    err_lb_range: 'Bu değerlerle sonuç sayı aralığının dışına çıkıyor; girdileri kontrol edin.',

    lb_rLambda: 'Dalga boyu λ',
    lb_rFspl: 'Serbest uzay yol kaybı (FSPL)',
    lb_rFspl0: '1 m referans mesafesinde serbest uzay kaybı',
    lb_rPl: 'Yol kaybı (log-mesafe modeli)',
    lb_rPlN: 'n = {n}; aynı mesafede serbest uzay {fspl}',
    lb_rEirp: 'EIRP (eşdeğer izotropik ışıma gücü)',
    lb_rSens: 'Alıcı duyarlılığı S',
    lb_given: 'girilen değer',
    lb_est: 'kestirim',
    lb_rFloor: 'Gürültü tabanı (kTB + NF)',
    lb_rFloorSub: 'kTB = {ktb}',
    lb_rNeed: 'Gereken pay için alınması gereken güç (S + Mreq)',
    lb_rSpare: 'Gereken paya göre fark (M − Mreq)',
    lb_rDmax: 'Gereken payla menzil',
    lb_rDzero: 'Sıfır payla menzil',
    lb_rFresnel: 'Birinci Fresnel bölgesi yarıçapı (yolun ortasında)',
    lb_rClear: 'Engelsiz kalması gereken bölüm (%60, pratik kural)',
    lb_sSpare: 'Gereken paya göre fark',
    lb_sFloor: 'Gürültü tabanı',
    lb_sSens: 'Duyarlılık kestirimi',
    lb_d0: 'Referans mesafesi, 1 m',
    lb_c: 'Işık hızı',
    lb_stepNoise: '−174 dBm/Hz, 290 K sıcaklıktaki ısıl gürültü yoğunluğudur: 10·log₁₀(k·T / 1 mW) = −173,98 dBm/Hz.',
    lb_stepRange: 'Yol kaybı mesafeyle 10·n·log₁₀(d) kadar arttığından, payın her 10·n dB’lik fazlası menzili on katına çıkarır (serbest uzayda n = 2). Öteki kayıplar değişmez sayılır.',
    lb_stepZero: 'Bu mesafede alınan güç duyarlılığa eşittir; sönümlenmeye karşı pay kalmaz.',
    lb_stepFresnel: 'Pratik kural: bu yarıçapın en az %60’ı engelsiz kalmalıdır; kalmazsa serbest uzay kaybına kırınım kaybı eklenir.',
    lb_note: 'Hesap, antenlerin birbirinin uzak alanında ve polarizasyonlarının uyumlu olduğunu varsayar. Serbest uzay modeli yansımasız, engelsiz görüş hattı içindir; verdiği menzil bir üst sınırdır. Gerçek bağlantıda yerden ve duvarlardan yansımalar (çok yollu yayılım), Fresnel bölgesine giren engeller, anten yakınındaki gövde ve kutu ile uzun mesafede ufuk menzili kısaltır. Yol kaybı üssü, ek kayıplar ve sönümlenme payı tipik değerlerdir; kritik bağlantıları sahada ölçerek doğrulayın.',
    lb_refNoise: 'Isıl gürültü yoğunluğu k·T, T = 290 K: −174 dBm/Hz',
    lb_dgAria: 'Seviye diyagramı: verici gücü, EIRP, yol kaybından sonraki seviye ve alınan güç dBm ekseninde basamaklar halinde; duyarlılık çizgisi ve bağlantı payı. Üstte iki anten ve aralarındaki mesafe.',
  },
  en: {
    lb_ex: 'Example',
    lb_exInfo: 'Picking an example fills every field with example values; change any of them afterwards. The values are typical ones: enter those from the datasheets of your own module and antenna.',
    lb_exNone: 'Pick an example…',
    lb_exBle: 'BLE 2.44 GHz, 0 dBm, 10 m indoor',
    lb_exLora: 'LoRa 868 MHz, 14 dBm, 2 km',
    lb_exWifi: 'Wi-Fi 2.44 GHz, 20 m through a wall',
    lb_secLink: 'Link',
    lb_f: 'Frequency (f)',
    lb_d: 'Distance (d)',
    lb_secTx: 'Transmitter',
    lb_ptx: 'Transmit power (Ptx)',
    lb_ptxInfo: 'Conducted power at the transmitter output. 0 dBm = 1 mW, 10 dBm = 10 mW, 20 dBm = 100 mW. The permitted radiated power depends on the band and the region; check the rules that apply to you.',
    lb_gtx: 'Transmit antenna gain (Gtx)',
    lb_gInfo: 'Gain over an isotropic antenna (dBi). A half-wave dipole has 2.15 dBi; small chip and PCB antennas are mostly around 0 dBi or below (typical). Use the gain in the direction of the other antenna, not the peak gain of the datasheet.',
    lb_ltx: 'Transmit-side loss (Ltx)',
    lb_lossHint: 'Sum of cable, matching-network and connector losses.',
    lb_grx: 'Receive antenna gain (Grx)',
    lb_lrx: 'Receive-side loss (Lrx)',
    lb_secPath: 'Path',
    lb_model: 'Path-loss model',
    lb_mFree: 'Free space',
    lb_mLogd: 'Log-distance (exponent n)',
    lb_modelInfo: 'Free space: an unobstructed line of sight between the two antennas (Friis equation). Log-distance: on top of the free-space loss at the 1 m reference distance the loss grows by 10·n·log₁₀(d / 1 m); the exponent n is chosen for the environment.',
    lb_n: 'Path-loss exponent (n)',
    lb_nHint: 'Typical values: 2 in free space; about 2.5–4 indoors or with obstructions, larger in dense clutter.',
    lb_lx: 'Extra loss on the path (Lx)',
    lb_lxHint: 'Loss of obstacles such as walls, a body or the enclosure.',
    lb_secRx: 'Receiver',
    lb_sens: 'Receiver sensitivity',
    lb_sDirect: 'Enter the value',
    lb_sEst: 'Estimate (B, NF, SNR)',
    lb_sensInfo: 'A datasheet sensitivity holds for one data rate, modulation and error rate; enter the value of the mode you use. Estimate: S = −174 dBm/Hz + 10·log₁₀(B) + NF + SNR. −174 dBm/Hz is the thermal noise density at 290 K (kT).',
    lb_s: 'Sensitivity (S)',
    lb_b: 'Bandwidth (B)',
    lb_nf: 'Noise figure (NF)',
    lb_snr: 'Required SNR',
    lb_snrHint: 'Depends on the modulation and the target error rate; can be negative with spread spectrum (e.g. LoRa).',
    lb_mreq: 'Required fade margin (Mreq)',
    lb_mreqHint: 'A margin against fading and tolerances; larger for mobile or indoor links. A design choice.',

    lb_margin: 'Link margin',
    lb_prx: 'Received power',
    lb_over: '{x} above the required {req}',
    lb_under: '{x} below the required {req}',
    ok_lb_pass: 'The link margin ({m}) meets the required fade margin ({req}).',
    warn_lb_low: 'The received power is {m} above the sensitivity, but the margin is below the required fade margin ({req}): the link closes with too little reserve against fading. The range at the required margin is {dmax}.',
    err_lb_fail: 'The received power ({prx}) is below the receiver sensitivity ({s}): no link at this distance. The range at zero margin is {d0}.',
    warn_lb_nearField: 'The distance ({d}) is shorter than one wavelength ({lambda}): the antennas are in each other’s near field, where the path-loss formula does not apply. With large antennas the far field also begins only beyond 2·D²/λ (D: the largest dimension of the antenna).',
    warn_lb_belowRef: 'The distance is below the 1 m reference distance: the log-distance model is defined beyond the reference distance. For such short distances use the free-space model.',
    err_lb_positive: 'Frequency, distance, bandwidth and path-loss exponent must be greater than zero, and every other field a valid number.',
    err_lb_nonneg: 'Losses, the noise figure and the required fade margin cannot be negative.',
    err_lb_range: 'With these values the result leaves the number range; check the inputs.',

    lb_rLambda: 'Wavelength λ',
    lb_rFspl: 'Free-space path loss (FSPL)',
    lb_rFspl0: 'Free-space loss at the 1 m reference distance',
    lb_rPl: 'Path loss (log-distance model)',
    lb_rPlN: 'n = {n}; free space at the same distance {fspl}',
    lb_rEirp: 'EIRP (equivalent isotropically radiated power)',
    lb_rSens: 'Receiver sensitivity S',
    lb_given: 'entered value',
    lb_est: 'estimated',
    lb_rFloor: 'Noise floor (kTB + NF)',
    lb_rFloorSub: 'kTB = {ktb}',
    lb_rNeed: 'Received power needed for the required margin (S + Mreq)',
    lb_rSpare: 'Margin against the requirement (M − Mreq)',
    lb_rDmax: 'Range at the required margin',
    lb_rDzero: 'Range at zero margin',
    lb_rFresnel: 'First Fresnel zone radius (mid-path)',
    lb_rClear: 'Part to keep clear of obstacles (60 %, rule of thumb)',
    lb_sSpare: 'Margin against the requirement',
    lb_sFloor: 'Noise floor',
    lb_sSens: 'Sensitivity estimate',
    lb_d0: 'Reference distance, 1 m',
    lb_c: 'Speed of light',
    lb_stepNoise: '−174 dBm/Hz is the thermal noise density at 290 K: 10·log₁₀(k·T / 1 mW) = −173.98 dBm/Hz.',
    lb_stepRange: 'The path loss grows by 10·n·log₁₀(d), so every 10·n dB of spare margin multiplies the range by ten (n = 2 in free space). The other losses are taken as unchanged.',
    lb_stepZero: 'At this distance the received power equals the sensitivity; nothing is left against fading.',
    lb_stepFresnel: 'Rule of thumb: at least 60 % of this radius should stay clear of obstacles; otherwise diffraction loss adds to the free-space loss.',
    lb_note: 'The calculation assumes that the antennas are in each other’s far field and that their polarisations match. The free-space model is for an unobstructed line of sight without reflections; the range it gives is an upper bound. On a real link reflections from the ground and from walls (multipath), obstacles inside the Fresnel zone, a body or an enclosure close to the antenna and, over long distances, the horizon shorten the range. The path-loss exponent, the extra losses and the fade margin are typical values; verify critical links by measuring in the field.',
    lb_refNoise: 'Thermal noise density k·T at T = 290 K: −174 dBm/Hz',
    lb_dgAria: 'Level diagram: transmit power, EIRP, the level after the path loss and the received power as steps on a dBm axis, with the sensitivity line and the link margin. Above it the two antennas and the distance between them.',
  },
};

const F_MUL = { MHz: 1e6, GHz: 1e9 };
const D_MUL = { m: 1, km: 1e3 };
const B_MUL = { kHz: 1e3, Hz: 1, MHz: 1e6 };

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

// A real minus sign, and never "−0".
const pos0 = (x) => (x === 0 ? 0 : x);
const minus = (s) => String(s).replace(/-/g, '−');
const nv = (x, sig = 4) => minus(fmt(pos0(x), sig));
const sv = (x, unit, sig = 4) => minus(si(pos0(x), unit, sig));

const dbFormats = new Map();
const rounded = (x, dec) => Number(x.toFixed(dec));
/** dB number with at most `dec` decimals: 46.8, −73.22, 0. */
function dbNum(x, dec = 1) {
  if (!Number.isFinite(x)) return '—';
  const key = `${locale()}${dec}`;
  if (!dbFormats.has(key)) dbFormats.set(key, new Intl.NumberFormat(locale(), { useGrouping: false, maximumFractionDigits: dec }));
  return minus(dbFormats.get(key).format(pos0(rounded(x, dec))));
}
const dbTxt = (x, unit = 'dB', dec = 1) => `${dbNum(x, dec)} ${unit}`;

/** Length in km, m or mm, whichever reads best: 69.04 km, 9.292 m, 0.1229 m, 51.69 mm. */
function distTxt(m, sig = 4) {
  if (!Number.isFinite(m)) return '—';
  const a = Math.abs(m);
  if (a >= 1000) return `${nv(m / 1000, sig)} km`;
  if (a >= 0.1 || a === 0) return `${nv(m, sig)} m`;
  return sv(m, 'm', sig);
}

/** "46.8 dB" → number and unit for a headline value. */
function unitHtml(s) {
  const i = s.lastIndexOf(' ');
  return i < 0 ? esc(s) : `${esc(s.slice(0, i))} <span class="u">${esc(s.slice(i + 1))}</span>`;
}

// ---------------------------------------------------------------------------
// Diagram: the two antennas with the distance, and the levels on a dBm axis
// ---------------------------------------------------------------------------

const n1 = (x) => Math.round(x * 10) / 10;
// Without a result: a nominal budget that passes, drawn with symbols only.
const NOMINAL = { ptx: 10, eirp: 14, ant: -76, prx: -72, s: -100, need: -90 };

/** Tick spacing giving about five ticks: 1, 2 or 5 times a power of ten. */
function tickStep(span) {
  const raw = span / 5;
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}

function diagram(v, u, r) {
  let L = r ? { ptx: r.ptxDbm, eirp: r.eirpDbm, ant: r.pAntDbm, prx: r.prxDbm, s: r.sDbm, need: r.needDbm } : NOMINAL;
  let lo = Math.min(...Object.values(L));
  let hi = Math.max(...Object.values(L));
  const live = !!r && Number.isFinite(lo) && Number.isFinite(hi) && Number.isFinite(hi - lo);
  if (!live) {
    L = NOMINAL;
    lo = Math.min(...Object.values(L));
    hi = Math.max(...Object.values(L));
  }
  if (!(hi - lo >= 20)) { // levels that lie close together still get a readable axis
    const mid = (hi + lo) / 2;
    lo = mid - 10;
    hi = mid + 10;
  }
  const Y0 = 104; // the highest level
  const Y1 = 196; // the lowest level
  const Y = (x) => Math.min(Y1, Math.max(Y0, Y0 + ((hi - x) / (hi - lo)) * (Y1 - Y0)));
  const logd = live ? r.model === 'logd' : v.model === 'logd';
  const good = live ? r.pass : true;

  // Antennas at both ends, with the distance and the loss of the path.
  const antenna = (x) => path(`M${x},62V18M${x - 9},18L${x},30L${x + 9},18`, 'wire');
  let b = antenna(28) + text(28, 76, 'TX', { cls: 'name' }) + antenna(412) + text(412, 76, 'RX', { cls: 'name' })
    + arrow(46, 30, 394, 30, { cls: 'flow', headCls: 'arrow flow' });
  if (live) {
    const loss = `${logd ? 'PL' : 'FSPL'} = ${dbTxt(r.plDb)}${r.lExtraDb > 0 ? ` · Lx = ${dbTxt(r.lExtraDb)}` : ''}`;
    b += text(220, 22, `d = ${distTxt(r.dM)}`, { cls: 'val' }) + text(220, 47, loss, { cls: 'val' })
      + text(220, 62, `f = ${sv(r.fHz, 'Hz')} · λ = ${distTxt(r.lambdaM)}`);
  } else {
    b += text(220, 22, 'd', { cls: 'sym' }) + text(220, 47, logd ? 'PL' : 'FSPL', { cls: 'name' });
  }

  // dBm axis with a few round ticks.
  b += path(`M50,${Y0 - 8}V${Y1 + 10}`, 'axis') + text(43, Y0 - 12, 'dBm', { anchor: 'end' });
  if (live) {
    const step = tickStep(hi - lo);
    for (let k = Math.ceil(lo / step), guard = 0; k * step <= hi && guard < 12; k++, guard++) {
      const level = Number((k * step).toPrecision(12));
      const y = Y(level);
      b += path(`M46,${n1(y)}H50`, 'axis') + text(43, y + 4, minus(String(level)), { anchor: 'end' });
    }
  }

  // Sensitivity, and the level the required fade margin asks for.
  const ys = Y(L.s);
  const yq = Y(L.need);
  b += path(`M52,${n1(ys)}H424`, 'wave2') + text(60, ys + 13, live ? `S = ${dbTxt(r.sDbm, 'dBm')}` : 'S', { anchor: 'start' });
  if (!live || r.mReqDb > 0) b += path(`M52,${n1(yq)}H424`, 'ext') + text(60, yq - 4, 'S + Mreq', { anchor: 'start' });

  // The levels from left to right: P_tx, EIRP, down the path, P_rx.
  const yp = Y(L.ptx);
  const ye = Y(L.eirp);
  const ya = Y(L.ant);
  const yr = Y(L.prx);
  b += poly([[62, yp], [132, yp], [132, ye], [206, ye], [300, ya], [330, ya], [330, yr], [396, yr]], 'wave');
  const level = (x, y, name, value) => text(x, y - 6, name, { cls: 'name' }) + (live ? text(x, y + 14, value, { cls: 'val' }) : '');
  b += level(97, yp, 'Ptx', live ? dbTxt(r.ptxDbm, 'dBm') : '')
    + level(169, ye, 'EIRP', live ? dbTxt(r.eirpDbm, 'dBm') : '')
    + level(363, yr, 'Prx', live ? dbTxt(r.prxDbm, 'dBm') : '')
    + text(258, (ye + ya) / 2 - 4, live ? dbTxt(-r.pathTotalDb) : '−PL', { cls: live ? 'val' : 'name', anchor: 'start' });

  // The margin: from the received power to the sensitivity.
  b += path(`M396,${n1(yr)}H416`, 'ext') + dimV(yr, ys, 412, 'M', { cls: good ? 'okt' : 'badt' })
    + text(220, 228, live ? `M = Prx − S = ${dbTxt(r.marginDb)} · Mreq = ${dbTxt(r.mReqDb)}` : 'M = Prx − S', { cls: good ? 'okt' : 'badt' });
  return svg(440, 236, b, t('lb_dgAria'), { wide: true });
}

// ---------------------------------------------------------------------------
// Calculation steps
// ---------------------------------------------------------------------------

/**
 * Decimals for a sum of dB terms: two, and more only when the rounded terms
 * would no longer add up to the rounded result (a result close to zero).
 * `terms` are the values with the sign they have in the sum.
 */
function sumDecimals(result, terms) {
  for (let dec = 2; dec < 8; dec++) {
    const shown = rounded(result, dec);
    const sum = terms.reduce((a, x) => a + rounded(x, dec), 0);
    if (Math.abs(sum - shown) <= 0.002 * Math.abs(shown) + 1e-9) return dec;
  }
  return 8;
}
/** Decimals of the margin in the exponent of a range: more for a small path-loss exponent. */
const rangeDecimals = (n) => Math.min(8, Math.max(2, Math.ceil(-Math.log10(0.008 * n))));

const dq = (x, unit, dec = 2) => tx(dbTxt(x, unit, dec));
/** A term after an operator: a negative value goes into parentheses. */
const dp = (x, unit, dec = 2) => (rounded(x, dec) < 0 ? `(${dq(x, unit, dec)})` : dq(x, unit, dec));

function budgetSteps(r) {
  const logd = r.model === 'logd';
  const est = r.sensMode === 'est';
  const lam = tx(distTxt(r.lambdaM, 5));
  const d = tx(distTxt(r.dM, 6));
  const d0 = tx(distTxt(r.refDistanceM));
  const nq = nv(r.n, 4);
  const plSym = logd ? 'PL' : 'FSPL';
  const eDec = sumDecimals(r.eirpDbm, [r.ptxDbm, r.gtxDbi, -r.ltxDb]);
  const pDec = sumDecimals(r.prxDbm, [r.eirpDbm, -r.plDb, -r.lExtraDb, r.grxDbi, -r.lrxDb]);
  const sDec = est ? sumDecimals(r.sDbm, [r.floorDbm, r.snrDb]) : 2;
  const mDec = sumDecimals(r.marginDb, [r.prxDbm, -r.sDbm]);
  const xDec = sumDecimals(r.spareDb, [r.marginDb, -r.mReqDb]);
  const rDec = rangeDecimals(r.n);
  const slope = logd ? `10 \\cdot ${nq}` : '20';
  const clear = nv(r.fresnelClearance, 3);

  return steps([
    { label: 'lb_rLambda', sym: 'λ = \\frac{c}{f}', num: `\\frac{${tx(`${C0} m/s`)}}{${tx(sv(r.fHz, 'Hz', 6))}}`, res: lam },
    !logd && { label: 'lb_rFspl', sym: 'FSPL = 20 \\cdot \\log_{10}(\\frac{4π \\cdot d}{λ})', num: `20 \\cdot \\log_{10}(\\frac{4π \\cdot ${d}}{${lam}})`, res: dq(r.fsplDb, 'dB') },
    logd && { label: 'lb_rFspl0', sym: 'FSPL_0 = 20 \\cdot \\log_{10}(\\frac{4π \\cdot d_0}{λ})', num: `20 \\cdot \\log_{10}(\\frac{4π \\cdot ${d0}}{${lam}})`, res: dq(r.fsplRefDb, 'dB') },
    logd && { label: 'lb_rPl', sym: 'PL = FSPL_0 + 10 \\cdot n \\cdot \\log_{10}(\\frac{d}{d_0})',
      num: `${dq(r.fsplRefDb, 'dB')} + 10 \\cdot ${nq} \\cdot \\log_{10}(\\frac{${d}}{${d0}})`, res: dq(r.plDb, 'dB') },
    { label: 'lb_rEirp', sym: 'EIRP = P_{tx} + G_{tx} − L_{tx}',
      num: `${dq(r.ptxDbm, 'dBm', eDec)} + ${dp(r.gtxDbi, 'dBi', eDec)} − ${dq(r.ltxDb, 'dB', eDec)}`, res: dq(r.eirpDbm, 'dBm', eDec) },
    { label: 'lb_prx', sym: `P_{rx} = EIRP − ${plSym} − L_x + G_{rx} − L_{rx}`,
      num: `${dq(r.eirpDbm, 'dBm', pDec)} − ${dp(r.plDb, 'dB', pDec)} − ${dq(r.lExtraDb, 'dB', pDec)} + ${dp(r.grxDbi, 'dBi', pDec)} − ${dq(r.lrxDb, 'dB', pDec)}`,
      res: dq(r.prxDbm, 'dBm', pDec) },
    est && { label: 'lb_sFloor', sym: `N = ${dq(r.noiseDbmHz, 'dBm/Hz', 0)} + 10 \\cdot \\log_{10}(\\frac{B}{${tx('1 Hz')}}) + NF`,
      num: `${dq(r.noiseDbmHz, 'dBm/Hz', 0)} + 10 \\cdot \\log_{10}(\\frac{${tx(sv(r.bHz, 'Hz', 6))}}{${tx('1 Hz')}}) + ${dq(r.nfDb, 'dB')}`,
      res: dq(r.floorDbm, 'dBm'), note: 'lb_stepNoise' },
    est && { label: 'lb_sSens', sym: 'S = N + SNR_{min}', num: `${dq(r.floorDbm, 'dBm', sDec)} + ${dp(r.snrDb, 'dB', sDec)}`, res: dq(r.sDbm, 'dBm', sDec) },
    { label: 'lb_margin', sym: 'M = P_{rx} − S', num: `${dq(r.prxDbm, 'dBm', mDec)} − ${dp(r.sDbm, 'dBm', mDec)}`, res: dq(r.marginDb, 'dB', mDec) },
    { label: 'lb_sSpare', sym: 'ΔM = M − M_{req}', num: `${dq(r.marginDb, 'dB', xDec)} − ${dq(r.mReqDb, 'dB', xDec)}`, res: dq(r.spareDb, 'dB', xDec) },
    { label: 'lb_rDmax', sym: `d_{max} = d \\cdot 10^{\\frac{M − M_{req}}{${logd ? '10 \\cdot n' : '20'}}}`,
      num: `${d} \\cdot 10^{\\frac{${dq(r.marginDb, 'dB', rDec)} − ${dq(r.mReqDb, 'dB', rDec)}}{${slope}}}`, res: tx(distTxt(r.dMaxM)), note: 'lb_stepRange' },
    { label: 'lb_rDzero', sym: `d_{M=0} = d \\cdot 10^{\\frac{M}{${logd ? '10 \\cdot n' : '20'}}}`,
      num: `${d} \\cdot 10^{\\frac{${dq(r.marginDb, 'dB', rDec)}}{${slope}}}`, res: tx(distTxt(r.dZeroM)), note: 'lb_stepZero' },
    { label: 'lb_rFresnel', sym: 'r_F = \\frac{1}{2} \\cdot \\sqrt{λ \\cdot d}', num: `\\frac{1}{2} \\cdot \\sqrt{${lam} \\cdot ${d}}`, res: tx(distTxt(r.fresnelM)) },
    { label: 'lb_rClear', sym: `${clear} \\cdot r_F`, num: `${clear} \\cdot ${tx(distTxt(r.fresnelM))}`, res: tx(distTxt(r.fresnelClearM)), note: 'lb_stepFresnel' },
  ], {
    note: 'lb_note',
    refs: [
      'H. T. Friis, “A Note on a Simple Transmission Formula”, Proc. IRE 34 (1946)',
      logd && 'T. S. Rappaport, Wireless Communications: Principles and Practice',
      t('lb_refNoise'),
    ].filter(Boolean),
    where: [
      ['c', 'lb_c'], ['f', 'lb_f', 'f'], ['d', 'lb_d', 'd'], logd && ['d_0', 'lb_d0'], logd && ['n', 'lb_n', 'n'],
      ['P_{tx}', 'lb_ptx', 'ptx'], ['G_{tx}', 'lb_gtx', 'gtx'], ['L_{tx}', 'lb_ltx', 'ltx'], ['L_x', 'lb_lx', 'lx'],
      ['G_{rx}', 'lb_grx', 'grx'], ['L_{rx}', 'lb_lrx', 'lrx'],
      est ? ['B', 'lb_b', 'b'] : ['S', 'lb_s', 's'], est && ['NF', 'lb_nf', 'nf'], est && ['SNR_{min}', 'lb_snr', 'snr'],
      ['M_{req}', 'lb_mreq', 'mreq'],
    ],
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const isLogd = (v) => v.model === 'logd';
const isEst = (v) => v.sens === 'est';

// Examples: every field is set, so an example does not depend on what was entered before.
// Distances in m, bandwidths in kHz (the first unit of each field).
const EXAMPLES = {
  ble: { f: 2440, d: 10, ptx: 0, gtx: 0, ltx: 0, grx: 0, lrx: 0, model: 'logd', n: 3, lx: 0, sens: 'direct', s: -95, b: 1000, nf: 6, snr: 10, mreq: 10 },
  lora: { f: 868, d: 2000, ptx: 14, gtx: 2, ltx: 0, grx: 2, lrx: 0, model: 'logd', n: 3, lx: 0, sens: 'est', s: -120, b: 125, nf: 6, snr: -7.5, mreq: 10 },
  wifi: { f: 2440, d: 20, ptx: 15, gtx: 2, ltx: 0, grx: 2, lrx: 0, model: 'free', n: 3, lx: 10, sens: 'est', s: -70, b: 20000, nf: 7, snr: 25, mreq: 10 },
};

export default {
  id: 'linkbudget',
  strings,
  // Parameter plot (ui/sweep.js): results that can be drawn against one input.
  plot: {
    x: ['d', 'f', 'ptx', 'gtx', 'grx', 'n', 'lx', 'ltx', 'lrx', 's', 'b', 'nf', 'snr', 'mreq'],
    y: [
      { key: 'm', label: 'lb_margin', unit: 'dB', get: (r) => r.marginDb },
      { key: 'prx', label: 'lb_prx', unit: 'dBm', get: (r) => r.prxDbm },
      { key: 'fspl', label: 'lb_rFspl', unit: 'dB', get: (r) => (r.model === 'free' ? r.fsplDb : NaN) },
      { key: 'pl', label: 'lb_rPl', unit: 'dB', get: (r) => (r.model === 'logd' ? r.plDb : NaN) },
      { key: 'dmax', label: 'lb_rDmax', unit: 'm', get: (r) => r.dMaxM },
    ],
  },
  diagram,
  sections: [
    {
      title: 'sectionSetup',
      fields: [
        { key: 'ex', type: 'select', label: 'lb_ex', default: 'none', info: 'lb_exInfo',
          options: [
            { value: 'none', label: 'lb_exNone' },
            { value: 'ble', label: 'lb_exBle', set: EXAMPLES.ble },
            { value: 'lora', label: 'lb_exLora', set: EXAMPLES.lora },
            { value: 'wifi', label: 'lb_exWifi', set: EXAMPLES.wifi },
          ] },
      ],
    },
    {
      title: 'lb_secLink',
      fields: [
        { key: 'f', type: 'number', label: 'lb_f', default: 868, units: ['MHz', 'GHz'],
          presets: [433, 868, 915, 2440, 5800].map((x) => ({ label: `${x} MHz`, value: x, unit: 'MHz' })) },
        { key: 'd', type: 'number', label: 'lb_d', default: 1000, units: ['m', 'km'] },
      ],
    },
    {
      title: 'lb_secTx',
      fields: [
        { key: 'ptx', type: 'number', label: 'lb_ptx', default: 14, units: ['dBm'], valid: 'any', info: 'lb_ptxInfo' },
        { key: 'gtx', type: 'number', label: 'lb_gtx', default: 2, units: ['dBi'], valid: 'any', info: 'lb_gInfo' },
        { key: 'ltx', type: 'number', label: 'lb_ltx', default: 0, units: ['dB'], valid: 'nonneg', hint: 'lb_lossHint' },
      ],
    },
    {
      title: 'lb_secPath',
      fields: [
        { key: 'model', type: 'choice', label: 'lb_model', default: 'free', info: 'lb_modelInfo',
          options: [{ value: 'free', label: 'lb_mFree' }, { value: 'logd', label: 'lb_mLogd' }] },
        { key: 'n', type: 'number', label: 'lb_n', default: 3, hint: 'lb_nHint', show: isLogd },
        { key: 'lx', type: 'number', label: 'lb_lx', default: 0, units: ['dB'], valid: 'nonneg', hint: 'lb_lxHint' },
      ],
    },
    {
      title: 'lb_secRx',
      fields: [
        { key: 'grx', type: 'number', label: 'lb_grx', default: 2, units: ['dBi'], valid: 'any', info: 'lb_gInfo' },
        { key: 'lrx', type: 'number', label: 'lb_lrx', default: 0, units: ['dB'], valid: 'nonneg', hint: 'lb_lossHint' },
        { key: 'sens', type: 'choice', label: 'lb_sens', default: 'direct', info: 'lb_sensInfo',
          options: [{ value: 'direct', label: 'lb_sDirect' }, { value: 'est', label: 'lb_sEst' }] },
        { key: 's', type: 'number', label: 'lb_s', default: -120, units: ['dBm'], valid: 'any', show: (v) => !isEst(v) },
        { key: 'b', type: 'number', label: 'lb_b', default: 125, units: ['kHz', 'Hz', 'MHz'], show: isEst },
        { key: 'nf', type: 'number', label: 'lb_nf', default: 6, units: ['dB'], valid: 'nonneg', show: isEst },
        { key: 'snr', type: 'number', label: 'lb_snr', default: 10, units: ['dB'], valid: 'any', hint: 'lb_snrHint', show: isEst },
        { key: 'mreq', type: 'number', label: 'lb_mreq', default: 10, units: ['dB'], valid: 'nonneg', hint: 'lb_mreqHint' },
      ],
    },
  ],

  compute(v, u) {
    return linkBudget({
      fHz: v.f * (F_MUL[u.f] ?? NaN),
      dM: v.d * (D_MUL[u.d] ?? NaN),
      ptxDbm: v.ptx,
      gtxDbi: v.gtx,
      ltxDb: v.ltx,
      grxDbi: v.grx,
      lrxDb: v.lrx,
      model: v.model,
      n: v.n,
      lExtraDb: v.lx,
      sensMode: v.sens,
      sDbm: v.s,
      bHz: v.b * (B_MUL[u.b] ?? NaN),
      nfDb: v.nf,
      snrDb: v.snr,
      mReqDb: v.mreq,
    });
  },

  render(r) {
    if (!r.ok) return invalid(r.errors);
    const logd = r.model === 'logd';
    const est = r.sensMode === 'est';
    const m = dbTxt(r.marginDb);
    const req = dbTxt(r.mReqDb);
    const s = dbTxt(r.sDbm, 'dBm');
    const prx = dbTxt(r.prxDbm, 'dBm');
    const verdict = r.verdict === 'pass' ? messages('ok', ['lb_pass'], { lb_pass: { m, req } })
      : r.verdict === 'low' ? messages('warn', ['lb_low'], { lb_low: { m, req, dmax: distTxt(r.dMaxM, 3) } })
        : messages('error', ['lb_fail'], { lb_fail: { prx, s, d0: distTxt(r.dZeroM, 3) } });
    const against = t(r.spareDb >= 0 ? 'lb_over' : 'lb_under', { x: dbTxt(Math.abs(r.spareDb)), req });
    return heroes([
      ['lb_margin', unitHtml(m), esc(against)],
      ['lb_prx', unitHtml(prx), esc(`${sv(r.prxW, 'W', 3)} · S = ${s}`)],
    ])
      + verdict
      + messages('warn', r.warnings, { lb_nearField: { d: distTxt(r.dM, 3), lambda: distTxt(r.lambdaM, 3) } })
      + budgetSteps(r)
      + block('results', rows([
        ['lb_rLambda', esc(distTxt(r.lambdaM))],
        logd
          ? ['lb_rPl', esc(`${dbTxt(r.plDb, 'dB', 2)} · ${t('lb_rPlN', { n: nv(r.n, 4), fspl: dbTxt(r.fsplDb, 'dB', 2) })}`)]
          : ['lb_rFspl', esc(dbTxt(r.fsplDb, 'dB', 2))],
        ['lb_rEirp', esc(`${dbTxt(r.eirpDbm, 'dBm', 2)} · ${sv(r.eirpW, 'W', 3)}`)],
        ['lb_prx', esc(`${dbTxt(r.prxDbm, 'dBm', 2)} · ${sv(r.prxW, 'W', 3)}`), true],
        ['lb_rSens', esc(`${dbTxt(r.sDbm, 'dBm', 2)} (${t(est ? 'lb_est' : 'lb_given')})`)],
        est && ['lb_rFloor', esc(`${dbTxt(r.floorDbm, 'dBm', 2)} · ${t('lb_rFloorSub', { ktb: dbTxt(r.ktbDbm, 'dBm', 2) })}`)],
        ['lb_rNeed', esc(dbTxt(r.needDbm, 'dBm', 2))],
        ['lb_margin', esc(dbTxt(r.marginDb, 'dB', 2)), true],
        ['lb_rSpare', esc(dbTxt(r.spareDb, 'dB', 2))],
        ['lb_rDmax', esc(distTxt(r.dMaxM)), true],
        ['lb_rDzero', esc(distTxt(r.dZeroM))],
        ['lb_rFresnel', esc(distTxt(r.fresnelM))],
        ['lb_rClear', esc(distTxt(r.fresnelClearM))],
      ]));
  },
};
