import { cable, MATERIALS, METRIC_MM2, AWG_SIZES, DENSITY_FLAG, T_MIN, T_MAX } from '../engine/cable.js';
import { awgName } from '../engine/convert.js';
import { heroes, rows, block, steps, messages, invalid } from '../ui/calculator.js';
import { tx } from '../ui/math.js';
import { fmt, si, esc } from '../ui/format.js';
import { t, locale } from '../i18n.js';
import { svg, rect, path, text, wire, arrow, twoTerm, dimH } from '../ui/svg.js';

const strings = {
  tr: {
    cab_solve: 'Hesaplanacak değer',
    cab_sDrop: 'Gerilim düşümü',
    cab_sSize: 'En küçük kesit',
    cab_solveInfo: 'Gerilim düşümü: verilen iletkenin düşümü ve kaybı. En küçük kesit: izin verilen düşümü aşmayan en küçük iletken kesiti ve bir üst standart ölçü.',
    cab_ex: 'Örnek',
    cab_exInfo: 'Bir örnek seçildiğinde bütün alanlar örnek değerlerle doldurulur; sonra istediğiniz alanı değiştirebilirsiniz.',
    cab_exNone: 'Örnek seçin…',
    cab_ex24: '24 V, 10 A, 2 × 5 m, 1,5 mm² bakır',
    cab_ex12: '12 V, 3 A, 2 × 3 m, AWG 18',
    cab_ex5: '5 V, 2 A, 2 × 1,5 m, AWG 24 (ince kablo)',
    cab_exAl: '48 V, 40 A, 2 × 20 m, 25 mm² alüminyum, 60 °C',
    cab_exSize: '24 V, 10 A, 2 × 5 m: %3 düşüm için hangi kesit?',
    cab_secLoad: 'Kaynak ve yük',
    cab_i: 'Akım (I)',
    cab_v: 'Besleme gerilimi (V)',
    cab_vInfo: 'Kablonun kaynak tarafındaki gerilim. Düşümün yüzdesi ve yükteki gerilim buna göre hesaplanır.',
    cab_secCable: 'Kablo',
    cab_len: 'Kablo uzunluğu, tek yön (L)',
    cab_circ: 'Devre',
    cab_cLoop: 'Gidiş-dönüş aynı kabloda',
    cab_cSingle: 'Tek iletken',
    cab_circInfo: 'Gidiş-dönüş: akım kablonun iki iletkeninden geçer (gidiş ve dönüş); akım yolunun uzunluğu 2 × L olur. Tek iletken: yalnızca bir iletken hesaba katılır; dönüş başka bir yoldan (şasi, ortak dönüş iletkeni) sağlanır ve onun direnci ayrıca eklenmelidir.',
    cab_by: 'İletken ölçüsü',
    cab_byArea: 'Kesit (mm²)',
    cab_byAwg: 'AWG',
    cab_a: 'İletken kesiti (A)',
    cab_pa05: '0,5 mm²',
    cab_pa075: '0,75 mm²',
    cab_pa15: '1,5 mm²',
    cab_pa25: '2,5 mm²',
    cab_pa4: '4 mm²',
    cab_awg: 'AWG numarası (g)',
    cab_awgHint: 'Kesit AWG tanımından hesaplanır (som yuvarlak tel); çok telli iletkenin kesiti üreticiye göre biraz farklı olabilir.',
    cab_n: 'Kutup başına paralel iletken sayısı (n)',
    cab_nInfo: 'Aynı akımı paylaşan, aynı kesitte paralel iletkenlerin sayısı. Gidiş-dönüşte her iki kutup için de aynı sayı alınır.',
    cab_mat: 'İletken malzemesi',
    cab_mCu: 'Bakır',
    cab_mAl: 'Alüminyum',
    cab_matInfo: 'Kullanılan sabitler (20 °C): bakır ρ = 1,724·10⁻⁸ Ω·m, α = 0,00393 /K (tavlanmış bakır); alüminyum ρ = 2,82·10⁻⁸ Ω·m, α = 0,0039 /K (yaygın el kitabı değerleri). Kesin değer için kablonun veri sayfasındaki direnç değerini kullanın.',
    cab_t: 'İletken sıcaklığı (T)',
    cab_tHint: 'Yük altındaki kablo ortamdan sıcaktır; en kötü durum için kablonun izin verilen çalışma sıcaklığını girin.',
    cab_secLimit: 'Sınır',
    cab_pct: 'İzin verilen gerilim düşümü (p)',
    cab_pctInfo: 'Besleme geriliminin yüzdesi olarak. Sınırı yükün çalıştığı en düşük gerilim ya da uyguladığınız standart belirler.',

    cab_drop: 'Gerilim düşümü ΔV',
    cab_dropPct: 'Gerilim düşümü, besleme geriliminin yüzdesi',
    cab_subOk: '{p} · sınır {lim} · uygun',
    cab_subOver: '{p} · sınır {lim} · aşıldı',
    cab_subWith: '{p} · {a} ile',
    cab_loss: 'Kabloda kaybolan güç P',
    cab_subLoss: 'R = {r} · yükte {v}',
    cab_std: 'Bir üst standart kesit',
    cab_subMin: 'en az {a} · AWG karşılığı: {g}',
    cab_stdAwg: 'Bir üst AWG ölçüsü',
    cab_stdRow: '{a} → ΔV = {d} ({p})',
    cab_stdNone: 'yok: {a} değerinden büyük kesit gerekir',
    cab_vLoad: 'Yükteki gerilim VL',
    cab_lossPct: 'Kayıp, yüke aktarılan gücün yüzdesi',
    cab_pLoad: 'Yüke aktarılan güç',
    cab_r: 'Kablo direnci R',
    cab_rLoop: '{r} (gidiş + dönüş)',
    cab_cond: 'İletken',
    cab_condEach: 'kutup başına {n} × {a}',
    cab_j: 'Akım yoğunluğu J',
    cab_path: 'Akım yolunun uzunluğu l',
    cab_rho: 'Özdirenç ρ(T)',
    cab_rhoAt: '{r} ({t} sıcaklıkta)',
    cab_allowedV: 'İzin verilen düşüm ΔVmax',
    cab_aMin: 'Sınır için en küçük kesit, iletken başına Amin',
    cab_jNote: 'Akım yoğunluğu bilgi içindir. Kablonun taşıyabileceği akım bu araçla belirlenmez: yalıtıma, kabloların demetlenmesine, döşeme biçimine ve ortam sıcaklığına bağlıdır; kablonun veri sayfasından ya da uyguladığınız tesisat standardından alınır.',
    ok_cab_within: 'Gerilim düşümü {d}; izin verilen {lim} sınırının içinde.',
    err_cab_over: 'Gerilim düşümü {d}; izin verilen {lim} sınırının üzerinde. Bu sınır için iletken başına en az {a} kesit gerekir (bir üst standart ölçü: {s}).',
    err_cab_aboveSupply: 'Hesaplanan gerilim düşümü ({d}) besleme geriliminden ({v}) büyük: bu akım bu kablodan bu gerilimle geçirilemez ve model burada geçerli değildir. Kesiti büyütün, kabloyu kısaltın ya da akımı düşürün.',
    warn_cab_density: 'Akım yoğunluğu yüksek: {j} (kaba bir işaret olarak {lim} üzeri). Bu bir akım taşıma sınırı değildir; izin verilen akım için kablonun veri sayfasına ya da uyguladığınız tesisat standardına bakın.',
    warn_cab_noStd: 'Gereken kesit ({a}) listedeki en büyük standart kesitten ({max}) büyük. Kutup başına paralel iletken sayısını artırın, kabloyu kısaltın ya da bara kullanın.',
    err_cab_positive: 'Akım, gerilim, uzunluk ve kesit sıfırdan büyük; paralel iletken sayısı en az 1 olan bir tam sayı olmalı.',
    err_cab_awg: 'AWG numarası −3 (4/0) ile 40 arasında bir tam sayı olmalı.',
    err_cab_temp: 'İletken sıcaklığı −100 °C ile 300 °C arasında olmalı.',
    err_cab_pct: 'İzin verilen gerilim düşümü %0’dan büyük, en çok %100 olmalı.',
    err_cab_range: 'Bu değerlerle sonuç sayı aralığının dışına çıkıyor; girdileri kontrol edin.',

    cab_stepLoop: 'Akım iki iletkenden geçer: gidiş ve dönüş.',
    cab_stepSingle: 'Yalnızca bir iletken hesaba katılır; dönüş yolunun direnci ayrıca eklenmelidir.',
    cab_stepRhoCu: 'Bakır: ρ20 = 0,01724 Ω·mm²/m (1,724·10⁻⁸ Ω·m), α = 0,00393 /K.',
    cab_stepRhoAl: 'Alüminyum: ρ20 = 0,0282 Ω·mm²/m (2,82·10⁻⁸ Ω·m), α = 0,0039 /K (yaygın el kitabı değerleri).',
    cab_sAwgD: 'AWG’den tel çapı',
    cab_stepAwg: 'AWG tanımı: 36 numara 0,127 mm (0,005 inç), 4/0 numara 11,684 mm (0,46 inç); aradaki 39 adım eşit oranlıdır.',
    cab_sAwgA: 'İletken kesiti',
    cab_stepJ: 'Bilgi içindir; izin verilen akım kablonun veri sayfasından ya da tesisat standardından alınır.',
    cab_stepStd: 'Standart kesitler (mm²): 0,05 · 0,08 · 0,14 · 0,25 · 0,34 · 0,5 · 0,75 · 1 · 1,5 · 2,5 · 4 · 6 · 10 · 16 · 25 · 35 · 50 · 70 · 95 · 120.',
    cab_sStdDrop: 'Bu standart kesitle gerilim düşümü',
    cab_sAwgDrop: 'Bu AWG ölçüsüyle gerilim düşümü',
    cab_whRho: 'Malzemenin 20 °C’deki özdirenci',
    cab_whAlpha: 'Özdirencin sıcaklık katsayısı (20 °C)',
    cab_note: 'Model doğru akım içindir: iletkenin direnci 20 °C’deki özdirençten ve doğrusal sıcaklık katsayısından hesaplanır. Alternatif akımda kablonun reaktansı ve yükün güç katsayısı da düşümü etkiler, kalın iletkenlerde deri etkisi direnci artırır; bunlar hesaba katılmaz. Klemens, konnektör, sigorta ve bağlantı dirençleri dahil değildir (bunlar için “Güç yolu gerilim düşümü” aracını kullanın). Çok telli iletkenlerde ve AWG ölçülerinde gerçek kesit üreticiye göre biraz değişir: kesin sonuç için kablonun veri sayfasındaki direnç değerini (Ω/km) kullanın.',
    cab_ref: 'R = ρ·l/A ve ΔV = I·R (Ohm yasası); alüminyum sabitleri yaygın el kitabı değerleridir',

    cab_dgAria: 'Kaynak, kablo ve yük: kablo uzunluğu, iletken, kablo direnci, iki uçtaki gerilim ve gerilim düşümü işaretli',
    cab_dgSource: 'kaynak',
    cab_dgLoad: 'yük',
    cab_dgCable: 'kablo',
    cab_dgBoth: '(gidiş + dönüş)',
    cab_dgReturn: 'dönüş başka yoldan (hesaba katılmaz)',
  },
  en: {
    cab_solve: 'Solve for',
    cab_sDrop: 'Voltage drop',
    cab_sSize: 'Smallest cross-section',
    cab_solveInfo: 'Voltage drop: drop and loss of a given conductor. Smallest cross-section: the smallest conductor that stays within the allowed drop, and the next standard size up.',
    cab_ex: 'Example',
    cab_exInfo: 'Picking an example fills all fields with example values; change any of them afterwards.',
    cab_exNone: 'Pick an example…',
    cab_ex24: '24 V, 10 A, 2 × 5 m, 1.5 mm² copper',
    cab_ex12: '12 V, 3 A, 2 × 3 m, AWG 18',
    cab_ex5: '5 V, 2 A, 2 × 1.5 m, AWG 24 (a thin cable)',
    cab_exAl: '48 V, 40 A, 2 × 20 m, 25 mm² aluminium, 60 °C',
    cab_exSize: '24 V, 10 A, 2 × 5 m: which cross-section for a 3 % drop?',
    cab_secLoad: 'Source and load',
    cab_i: 'Current (I)',
    cab_v: 'Supply voltage (V)',
    cab_vInfo: 'The voltage at the source end of the cable. The drop in percent and the voltage at the load refer to it.',
    cab_secCable: 'Cable',
    cab_len: 'Cable length, one way (L)',
    cab_circ: 'Circuit',
    cab_cLoop: 'Out and back in the same cable',
    cab_cSingle: 'One conductor only',
    cab_circInfo: 'Out and back: the current flows through two conductors of the cable (out and return), so the current path is 2 × L long. One conductor only: just one conductor is counted; the return takes another path (chassis, a common return conductor), whose resistance must be added separately.',
    cab_by: 'Conductor size',
    cab_byArea: 'Cross-section (mm²)',
    cab_byAwg: 'AWG',
    cab_a: 'Conductor cross-section (A)',
    cab_pa05: '0.5 mm²',
    cab_pa075: '0.75 mm²',
    cab_pa15: '1.5 mm²',
    cab_pa25: '2.5 mm²',
    cab_pa4: '4 mm²',
    cab_awg: 'AWG number (g)',
    cab_awgHint: 'The cross-section follows from the AWG definition (solid round wire); a stranded conductor may differ slightly between makers.',
    cab_n: 'Parallel conductors per pole (n)',
    cab_nInfo: 'Number of conductors of the same cross-section that share the current. With out and back, the same number is taken for both poles.',
    cab_mat: 'Conductor material',
    cab_mCu: 'Copper',
    cab_mAl: 'Aluminium',
    cab_matInfo: 'Constants used (20 °C): copper ρ = 1.724·10⁻⁸ Ω·m, α = 0.00393 /K (annealed copper); aluminium ρ = 2.82·10⁻⁸ Ω·m, α = 0.0039 /K (common handbook values). For an exact figure use the resistance given in the cable’s datasheet.',
    cab_t: 'Conductor temperature (T)',
    cab_tHint: 'A loaded cable runs warmer than ambient; for the worst case enter the rated operating temperature of the cable.',
    cab_secLimit: 'Limit',
    cab_pct: 'Allowed voltage drop (p)',
    cab_pctInfo: 'In percent of the supply voltage. The limit comes from the lowest voltage the load works at, or from the standard you apply.',

    cab_drop: 'Voltage drop ΔV',
    cab_dropPct: 'Voltage drop in percent of the supply voltage',
    cab_subOk: '{p} · limit {lim} · within',
    cab_subOver: '{p} · limit {lim} · exceeded',
    cab_subWith: '{p} · with {a}',
    cab_loss: 'Power lost in the cable P',
    cab_subLoss: 'R = {r} · {v} at the load',
    cab_std: 'Next standard cross-section',
    cab_subMin: 'at least {a} · in AWG: {g}',
    cab_stdAwg: 'Next AWG size',
    cab_stdRow: '{a} → ΔV = {d} ({p})',
    cab_stdNone: 'none: more than {a} is needed',
    cab_vLoad: 'Voltage at the load VL',
    cab_lossPct: 'Loss in percent of the power delivered to the load',
    cab_pLoad: 'Power delivered to the load',
    cab_r: 'Cable resistance R',
    cab_rLoop: '{r} (out + return)',
    cab_cond: 'Conductor',
    cab_condEach: '{n} × {a} per pole',
    cab_j: 'Current density J',
    cab_path: 'Length of the current path l',
    cab_rho: 'Resistivity ρ(T)',
    cab_rhoAt: '{r} (at {t})',
    cab_allowedV: 'Allowed drop ΔVmax',
    cab_aMin: 'Smallest cross-section for the limit, per conductor Amin',
    cab_jNote: 'The current density is given for information. The current a cable may carry is not determined here: it depends on the insulation, on bundling, on how the cable is installed and on the ambient temperature, and is given by the cable’s datasheet or by the installation standard you apply.',
    ok_cab_within: 'The voltage drop is {d}, within the allowed {lim}.',
    err_cab_over: 'The voltage drop is {d}, above the allowed {lim}. This limit needs at least {a} per conductor (next standard size: {s}).',
    err_cab_aboveSupply: 'The calculated voltage drop ({d}) exceeds the supply voltage ({v}): this current cannot flow through this cable from this supply, and the model no longer applies. Use a larger cross-section, a shorter cable or a lower current.',
    warn_cab_density: 'The current density is high: {j} (flagged above about {lim} as a rough indication). This is not a rating; for the allowable current see the cable’s datasheet or the installation standard you apply.',
    warn_cab_noStd: 'The cross-section required ({a}) is above the largest standard size in the list ({max}). Use more conductors in parallel per pole, a shorter cable or a busbar.',
    err_cab_positive: 'Current, voltage, length and cross-section must be greater than zero; the number of parallel conductors must be a whole number of at least 1.',
    err_cab_awg: 'The AWG number must be a whole number from −3 (4/0) to 40.',
    err_cab_temp: 'The conductor temperature must be between −100 °C and 300 °C.',
    err_cab_pct: 'The allowed voltage drop must be above 0 % and at most 100 %.',
    err_cab_range: 'With these values the result leaves the number range; check the inputs.',

    cab_stepLoop: 'The current flows through two conductors: out and return.',
    cab_stepSingle: 'Only one conductor is counted; the resistance of the return path must be added separately.',
    cab_stepRhoCu: 'Copper: ρ20 = 0.01724 Ω·mm²/m (1.724·10⁻⁸ Ω·m), α = 0.00393 /K.',
    cab_stepRhoAl: 'Aluminium: ρ20 = 0.0282 Ω·mm²/m (2.82·10⁻⁸ Ω·m), α = 0.0039 /K (common handbook values).',
    cab_sAwgD: 'Wire diameter from the AWG number',
    cab_stepAwg: 'AWG definition: number 36 is 0.127 mm (0.005 in), number 4/0 is 11.684 mm (0.46 in); the 39 steps between them have equal ratios.',
    cab_sAwgA: 'Conductor cross-section',
    cab_stepJ: 'For information; the allowable current comes from the cable’s datasheet or the installation standard.',
    cab_stepStd: 'Standard cross-sections (mm²): 0.05 · 0.08 · 0.14 · 0.25 · 0.34 · 0.5 · 0.75 · 1 · 1.5 · 2.5 · 4 · 6 · 10 · 16 · 25 · 35 · 50 · 70 · 95 · 120.',
    cab_sStdDrop: 'Voltage drop with this standard cross-section',
    cab_sAwgDrop: 'Voltage drop with this AWG size',
    cab_whRho: 'Resistivity of the material at 20 °C',
    cab_whAlpha: 'Temperature coefficient of the resistivity (20 °C)',
    cab_note: 'The model is for direct current: the conductor resistance is calculated from the resistivity at 20 °C and a linear temperature coefficient. With alternating current the reactance of the cable and the power factor of the load also affect the drop, and in thick conductors the skin effect raises the resistance; these are not modelled. Terminals, connectors, fuses and joints are not included (use the “Power path voltage drop” tool for those). The real cross-section of stranded conductors and AWG sizes varies a little between makers: for an exact result use the resistance in the cable’s datasheet (Ω/km).',
    cab_ref: 'R = ρ·l/A and ΔV = I·R (Ohm’s law); the aluminium constants are common handbook values',

    cab_dgAria: 'Source, cable and load, with the cable length, the conductor, the cable resistance, the voltage at both ends and the voltage drop marked',
    cab_dgSource: 'source',
    cab_dgLoad: 'load',
    cab_dgCable: 'cable',
    cab_dgBoth: '(out + return)',
    cab_dgReturn: 'return by another path (not counted)',
  },
};

const I_MUL = { A: 1, mA: 1e-3 };
const L_MUL = { m: 1, cm: 0.01, mm: 0.001, ft: 0.3048 };

// AWG numbers as option values (lowercase ASCII for the URL): 1/0 … 4/0 are 0, 00, 000, 0000.
const awgValue = (n) => (n > 0 ? String(n) : '0'.repeat(1 - n));
const awgOf = (value) => (/^0+$/.test(String(value)) ? 1 - String(value).length : Number(value));

// Display. Voltages stay in volts down to 0.1 V, below that they take an SI prefix.
const voltT = (x, sig = 4) => (Math.abs(x) >= 0.1 ? `${fmt(x, sig)} V` : si(x, 'V', sig));
const areaT = (x, sig = 4) => `${fmt(x, sig)} mm²`;
const rhoT = (x, sig = 4) => `${fmt(x * 1e6, sig)} Ω·mm²/m`;
const densT = (x, sig = 3) => `${fmt(x, sig)} A/mm²`;
const pctT = (x) => new Intl.NumberFormat(locale(), { style: 'percent', maximumFractionDigits: 2, useGrouping: false }).format(x);
/** "1.5 mm²", "AWG 18 (0.823 mm²)". */
const sizeT = (w) => (w.by === 'awg' ? `AWG ${w.name} (${areaT(w.areaMm2)})` : areaT(w.areaMm2));
/** "1.149 V" → number and unit for a headline value. */
function unitHtml(s) {
  const i = s.lastIndexOf(' ');
  return i < 0 ? esc(s) : `${esc(s.slice(0, i))} <span class="u">${esc(s.slice(i + 1))}</span>`;
}

// ---------------------------------------------------------------------------
// Diagram: source, cable (out and back, or one conductor) and load
// ---------------------------------------------------------------------------

function diagram(v, u, r) {
  const live = !!r;
  const w = live ? r.wire : null;
  const loop = (live ? r.circuit : v.circ) !== 'single';
  const cls = live ? 'val' : 'sym';
  const xs = 46; // source
  const xl = 434; // load
  const yT = 58; // out conductor
  const yB = 154; // return conductor
  const xa = 126; // the cable runs from xa to xb
  const xb = 354;
  const xm = (xa + xb) / 2;
  const material = live ? (r.material === 'al' ? 'Al' : 'Cu') : '';

  let b = text(16, 16, t(loop ? 'cab_cLoop' : 'cab_cSingle'), { cls: 'title', anchor: 'start' })
    + twoTerm('V', xs, yT, xs, yB, { name: t('cab_dgSource'), value: live ? voltT(r.supplyV) : 'V', valueCls: cls })
    + twoTerm('R', xl, yT, xl, yB, { name: t('cab_dgLoad'), value: live ? (w && !w.aboveSupply ? voltT(w.loadV) : '—') : 'V − ΔV', valueCls: cls, flip: true })
    + wire([xs, yT], [xa, yT]) + wire([xb, yT], [xl, yT])
    + rect(xa, yT - 4, xb - xa, 8, 'cu');
  if (loop) {
    b += wire([xs, yB], [xa, yB]) + wire([xb, yB], [xl, yB]) + rect(xa, yB - 4, xb - xa, 8, 'cu');
  } else {
    b += path(`M${xs},${yB}H${xl}`, 'wire dash') + text(xm, yB - 8, t('cab_dgReturn'));
  }
  // Current
  b += arrow(xs + 16, yT - 12, xs + 46, yT - 12, { cls: 'flow', headCls: 'arrow flow' })
    + text(xs + 31, yT - 19, live ? `I = ${si(r.currentA, 'A')}` : 'I', { cls });
  // The cable: conductor, resistance, drop and loss
  const line = (i, s, c = cls) => text(xm, yT + 24 + i * 17, s, { cls: c });
  if (!live) {
    b += line(0, t('cab_dgCable'), 'lbl') + line(1, 'R = ρ · l / (n · A)') + line(2, 'ΔV = I · R') + line(3, 'P = I² · R');
  } else if (w) {
    b += line(0, `${r.parallel > 1 ? `${fmt(r.parallel, 12)} × ` : ''}${sizeT(w)} ${material}`, 'name')
      + line(1, `R = ${si(w.resistanceOhm, 'Ω')}${loop ? ` ${t('cab_dgBoth')}` : ''}`)
      + line(2, `ΔV = ${voltT(w.dropV)} (${pctT(w.dropFrac)})`, w.withinBudget ? 'okt' : 'badt')
      + line(3, `P = ${si(w.lossW, 'W')}`);
  } else {
    b += line(0, `A ≥ ${areaT(r.minAreaMm2)} ${material}`, 'name') + line(1, `ΔV ≤ ${voltT(r.allowedV)} (${pctT(r.allowedFrac)})`);
  }
  b += dimH(xa, xb, yB + 22, live ? `L = ${si(r.lengthM, 'm')}` : 'L', { below: true, extFrom: yB + 6, cls });
  return svg(480, 200, b, t('cab_dgAria'), { wide: true });
}

// ---------------------------------------------------------------------------
// Calculation steps
// ---------------------------------------------------------------------------

const REFS = [
  'IEC 60028 (resistivity of annealed copper)',
  'ASTM B258 (AWG wire diameters)',
];

// Intermediate values carry five digits and are written the same way wherever they are used again.
const q = (x, unit, sig = 5) => tx(si(x, unit, sig));
const vq = (x, sig = 5) => tx(voltT(x, sig));
const aq = (x) => tx(areaT(x, 5));
const rq = (x) => tx(rhoT(x, 5));
const pq = (x) => tx(`${fmt(x * 100, 5)} %`);
const nq = (x) => tx(fmt(x, 12));
const cq = (x) => tx(`${fmt(x, 6).replace('-', '−')} °C`); // a real minus sign for temperatures below zero
const mmq = (x) => tx(`${fmt(x, 5)} mm`);
const sq = (s) => `{(${s})}^{2}`;

function cableSteps(r) {
  const w = r.wire;
  const size = r.solve === 'size';
  const L = q(r.lengthM, 'm', 6);
  const l = q(r.pathM, 'm', 6);
  const I = q(r.currentA, 'A', 6);
  const V = vq(r.supplyV, 6);
  const rho = rq(r.rhoT);
  const n = nq(r.parallel);
  const dVmax = vq(r.allowedV);
  // Drop of a conductor size straight from the inputs (for the standard sizes).
  const dropOf = (label, name, c) => ({
    label, sym: `ΔV_{${name}} = \\frac{ρ_T \\cdot l \\cdot I}{n \\cdot A_{${name}}}`,
    num: `\\frac{${rho} \\cdot ${l} \\cdot ${I}}{${n} \\cdot ${aq(c.areaMm2)}}`, res: vq(c.dropV),
  });

  const path = r.circuit === 'loop'
    ? { label: 'cab_path', sym: 'l = 2 \\cdot L', num: `2 \\cdot ${L}`, res: l, note: 'cab_stepLoop' }
    : { label: 'cab_path', sym: 'l = L', res: l, note: 'cab_stepSingle' };
  const resistivity = {
    label: 'cab_rho', sym: `ρ_T = ρ_{20} \\cdot (1 + α \\cdot (T − ${cq(20)}))`,
    num: `${rq(r.rho20)} \\cdot (1 + ${tx(`${fmt(r.alpha)} /K`)} \\cdot (${cq(r.tempC)} − ${cq(20)}))`, res: rho,
    note: r.material === 'al' ? 'cab_stepRhoAl' : 'cab_stepRhoCu',
  };
  // The conductor given as an AWG number: diameter and cross-section from the definition.
  const fromAwg = !size && w.by === 'awg' ? [
    { label: 'cab_sAwgD', sym: `d = ${mmq(0.127)} \\cdot 92^{\\frac{36 − g}{39}}`,
      num: `${mmq(0.127)} \\cdot 92^{\\frac{36 ${w.awg < 0 ? '+' : '−'} ${nq(Math.abs(w.awg))}}{39}}`, res: mmq(w.diameterMm), note: 'cab_stepAwg' },
    { label: 'cab_sAwgA', sym: 'A = \\frac{π \\cdot d^{2}}{4}', num: `\\frac{π \\cdot ${sq(mmq(w.diameterMm))}}{4}`, res: aq(w.areaMm2) },
  ] : [];
  // Resistance, drop and loss of the conductor in use.
  const conductor = w ? (() => {
    const A = aq(w.areaMm2);
    const R = q(w.resistanceOhm, 'Ω');
    const dV = vq(w.dropV);
    const P = q(w.lossW, 'W');
    return [
      { label: 'cab_r', sym: 'R = \\frac{ρ_T \\cdot l}{n \\cdot A}', num: `\\frac{${rho} \\cdot ${l}}{${n} \\cdot ${A}}`, res: R },
      { label: 'cab_drop', sym: 'ΔV = I \\cdot R', num: `${I} \\cdot ${R}`, res: dV },
      { label: 'cab_dropPct', sym: '\\frac{ΔV}{V}', num: `\\frac{${dV}}{${V}}`, res: pq(w.dropFrac) },
      !w.aboveSupply && { label: 'cab_vLoad', sym: 'V_L = V − ΔV', num: `${V} − ${dV}`, res: vq(w.loadV) },
      { label: 'cab_loss', sym: 'P = I^{2} \\cdot R', num: `${sq(I)} \\cdot ${R}`, res: P },
      !w.aboveSupply && { label: 'cab_lossPct', sym: '\\frac{P}{V_L \\cdot I}', num: `\\frac{${P}}{${vq(w.loadV)} \\cdot ${I}}`, res: pq(w.lossFrac) },
      { label: 'cab_j', sym: 'J = \\frac{I}{n \\cdot A}', num: `\\frac{${I}}{${n} \\cdot ${A}}`, res: tx(densT(w.densityAmm2, 4)), note: 'cab_stepJ' },
    ];
  })() : [];
  // The smallest cross-section for the allowed drop and the standard sizes at or above it.
  // When sizing, the standard size is the conductor A of the steps that follow.
  const std = size ? 'A' : 'A_{std}';
  const sizing = [
    { label: 'cab_allowedV', sym: 'ΔV_{max} = p \\cdot V', num: `${pq(r.allowedFrac)} \\cdot ${V}`, res: dVmax },
    { label: 'cab_aMin', sym: 'A_{min} = \\frac{ρ_T \\cdot l \\cdot I}{n \\cdot ΔV_{max}}', num: `\\frac{${rho} \\cdot ${l} \\cdot ${I}}{${n} \\cdot ${dVmax}}`, res: aq(r.minAreaMm2) },
    r.metric
      ? { label: 'cab_std', sym: `${std} \\ge A_{min} \\to ${std} = ${aq(r.metric.areaMm2)}`, note: 'cab_stepStd' }
      : { label: 'cab_std', sym: `A_{min} > ${aq(METRIC_MM2[METRIC_MM2.length - 1])}`, note: 'cab_stepStd' },
    !size && r.metric && dropOf('cab_sStdDrop', 'std', r.metric),
    r.gauge && { label: 'cab_stdAwg', sym: `A_{AWG} \\ge A_{min} \\to ${tx(`AWG ${r.gauge.name}`)}, \\quad A_{AWG} = ${aq(r.gauge.areaMm2)}` },
    r.gauge && dropOf('cab_sAwgDrop', 'AWG', r.gauge),
  ];

  // Sizing: the requirement first, then the standard size found; otherwise the conductor first.
  const items = size
    ? [path, resistivity, ...sizing.slice(0, 3), ...conductor, ...sizing.slice(3)]
    : [path, ...fromAwg, resistivity, ...conductor, ...sizing];
  return steps(items, {
    note: 'cab_note',
    refs: [...REFS, t('cab_ref')],
    where: [
      ['L', 'cab_len', 'len'],
      ['I', 'cab_i', 'i'],
      ['V', 'cab_v', 'v'],
      !size && (w.by === 'awg' ? ['g', 'cab_awg', 'awg'] : ['A', 'cab_a', 'a']),
      size && w && ['A', 'cab_std'],
      ['n', 'cab_n', 'n'],
      ['T', 'cab_t', 't'],
      ['ρ_{20}', 'cab_whRho', 'mat'],
      ['α', 'cab_whAlpha', 'mat'],
      ['p', 'cab_pct', 'pct'],
    ],
  });
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

const note = (key) => `<p class="note">${esc(t(key))}</p>`;
const DASH = '—';

function render(r) {
  if (!r.ok) return invalid(r.errors);
  const w = r.wire;
  const size = r.solve === 'size';
  const lim = pctT(r.allowedFrac);
  const largest = areaT(METRIC_MM2[METRIC_MM2.length - 1]);
  const largestAwg = `AWG ${awgName(AWG_SIZES[AWG_SIZES.length - 1])}`;
  /** A standard size with the drop it gives: "2.5 mm² → ΔV = 0.69 V (2.87 %)". */
  const stdT = (c, none) => (c
    ? t('cab_stdRow', { a: sizeT(c), d: voltT(c.dropV), p: pctT(c.dropFrac) })
    : t('cab_stdNone', { a: none }));
  const nextStd = r.metric ? `${areaT(r.metric.areaMm2)}${r.gauge ? `, AWG ${r.gauge.name}` : ''}` : t('cab_stdNone', { a: largest });

  const dropHero = (sub) => ['cab_drop', w ? unitHtml(voltT(w.dropV)) : DASH, w ? esc(sub) : ''];
  const head = size
    ? heroes([
      ['cab_std', r.metric ? unitHtml(areaT(r.metric.areaMm2)) : DASH, esc(t('cab_subMin', { a: areaT(r.minAreaMm2), g: r.gauge ? `AWG ${r.gauge.name}` : DASH }))],
      dropHero(w ? t('cab_subWith', { p: pctT(w.dropFrac), a: areaT(w.areaMm2) }) : ''),
    ])
    : heroes([
      dropHero(t(w.withinBudget ? 'cab_subOk' : 'cab_subOver', { p: pctT(w.dropFrac), lim })),
      ['cab_loss', unitHtml(si(w.lossW, 'W')), esc(t('cab_subLoss', { r: si(w.resistanceOhm, 'Ω'), v: w.aboveSupply ? DASH : voltT(w.loadV) }))],
    ]);

  const has = (k) => r.warnings.includes(k);
  const verdict = !w ? ''
    : has('cab_aboveSupply') ? messages('error', ['cab_aboveSupply'], { cab_aboveSupply: { d: voltT(w.dropV), v: voltT(r.supplyV) } })
      : has('cab_over') ? messages('error', ['cab_over'], { cab_over: { d: `${voltT(w.dropV)} (${pctT(w.dropFrac)})`, lim, a: areaT(r.minAreaMm2), s: nextStd } })
        : messages('ok', ['cab_within'], { cab_within: { d: `${voltT(w.dropV)} (${pctT(w.dropFrac)})`, lim } });
  const warn = messages('warn', r.warnings.filter((k) => k === 'cab_density' || k === 'cab_noStd'), {
    cab_density: w ? { j: densT(w.densityAmm2), lim: densT(DENSITY_FLAG) } : {},
    cab_noStd: { a: areaT(r.minAreaMm2), max: largest },
  });

  const conductor = w && (r.parallel > 1 ? t('cab_condEach', { n: fmt(r.parallel, 12), a: sizeT(w) }) : sizeT(w));
  const wireRows = w ? [
    ['cab_drop', esc(`${voltT(w.dropV)} · ${pctT(w.dropFrac)}`), true],
    ['cab_vLoad', esc(w.aboveSupply ? DASH : voltT(w.loadV))],
    ['cab_loss', esc(si(w.lossW, 'W')), true],
    ['cab_lossPct', esc(w.aboveSupply ? DASH : pctT(w.lossFrac))],
    ['cab_pLoad', esc(w.aboveSupply ? DASH : si(w.loadW, 'W'))],
    ['cab_r', esc(r.circuit === 'loop' ? t('cab_rLoop', { r: si(w.resistanceOhm, 'Ω') }) : si(w.resistanceOhm, 'Ω'))],
    ['cab_cond', esc(`${conductor} · ${t(r.material === 'al' ? 'cab_mAl' : 'cab_mCu')}`)],
    ['cab_j', esc(densT(w.densityAmm2))],
  ] : [];
  const sizeRows = [
    ['cab_allowedV', esc(`${voltT(r.allowedV)} · ${lim}`)],
    ['cab_aMin', esc(areaT(r.minAreaMm2)), size],
    ['cab_std', esc(stdT(r.metric, largest)), size],
    ['cab_stdAwg', esc(stdT(r.gauge, largestAwg))],
  ];
  const common = [
    ['cab_path', esc(si(r.pathM, 'm'))],
    ['cab_rho', esc(t('cab_rhoAt', { r: rhoT(r.rhoT), t: `${fmt(r.tempC).replace('-', '−')} °C` }))],
  ];
  return head + verdict + warn
    + cableSteps(r)
    + block('results', rows(size ? [...sizeRows, ...wireRows, ...common] : [...wireRows, ...common, ...sizeRows]) + note('cab_jNote'));
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const isDrop = (v) => v.solve !== 'size';
const byArea = (v) => isDrop(v) && v.by !== 'awg';
const byAwg = (v) => isDrop(v) && v.by === 'awg';

// Examples: every field is set, so an example does not depend on what was entered before.
const all = (o) => ({ solve: 'drop', circ: 'loop', by: 'area', a: 1.5, awg: '18', n: 1, mat: 'cu', t: 20, ...o });
const EXAMPLES = {
  e24: all({ i: 10, v: 24, len: 5, a: 1.5, pct: 3 }),
  e12: all({ i: 3, v: 12, len: 3, by: 'awg', awg: '18', pct: 5 }),
  e5: all({ i: 2, v: 5, len: 1.5, by: 'awg', awg: '24', pct: 5 }),
  al: all({ i: 40, v: 48, len: 20, a: 25, mat: 'al', t: 60, pct: 5 }),
  size: all({ solve: 'size', i: 10, v: 24, len: 5, pct: 3 }),
};

export default {
  id: 'cable',
  strings,
  // Parameter plot (ui/sweep.js): results that can be drawn against one input.
  plot: {
    x: ['len', 'i', 'a', 't'],
    y: [
      { key: 'dv', label: 'cab_drop', unit: 'V', get: (r) => r.wire?.dropV },
      { key: 'dp', label: 'cab_dropPct', unit: '%', get: (r) => (r.wire ? r.wire.dropFrac * 100 : NaN) },
      { key: 'loss', label: 'cab_loss', unit: 'W', get: (r) => r.wire?.lossW },
      { key: 'amin', label: 'cab_aMin', unit: 'mm²', get: (r) => r.minAreaMm2 },
    ],
  },
  diagram,
  render,
  sections: [
    {
      title: 'sectionSetup',
      fields: [
        { key: 'solve', type: 'choice', label: 'cab_solve', default: 'drop', info: 'cab_solveInfo',
          options: [{ value: 'drop', label: 'cab_sDrop' }, { value: 'size', label: 'cab_sSize' }] },
        { key: 'ex', type: 'select', label: 'cab_ex', default: 'none', info: 'cab_exInfo',
          options: [
            { value: 'none', label: 'cab_exNone' },
            { value: 'e24', label: 'cab_ex24', set: EXAMPLES.e24 },
            { value: 'e12', label: 'cab_ex12', set: EXAMPLES.e12 },
            { value: 'e5', label: 'cab_ex5', set: EXAMPLES.e5 },
            { value: 'al', label: 'cab_exAl', set: EXAMPLES.al },
            { value: 'size', label: 'cab_exSize', set: EXAMPLES.size },
          ] },
      ],
    },
    {
      title: 'cab_secLoad',
      fields: [
        { key: 'i', type: 'number', label: 'cab_i', default: 10, units: ['A', 'mA'] },
        { key: 'v', type: 'number', label: 'cab_v', default: 24, units: ['V'], info: 'cab_vInfo',
          presets: [5, 12, 24, 48].map((x) => ({ label: `${x} V`, value: x })) },
      ],
    },
    {
      title: 'cab_secCable',
      fields: [
        { key: 'len', type: 'number', label: 'cab_len', default: 5, units: ['m', 'cm', 'mm', 'ft'] },
        { key: 'circ', type: 'choice', label: 'cab_circ', default: 'loop', info: 'cab_circInfo',
          options: [{ value: 'loop', label: 'cab_cLoop' }, { value: 'single', label: 'cab_cSingle' }] },
        { key: 'by', type: 'choice', label: 'cab_by', default: 'area', show: isDrop,
          options: [{ value: 'area', label: 'cab_byArea' }, { value: 'awg', label: 'cab_byAwg' }] },
        { key: 'a', type: 'number', label: 'cab_a', default: 1.5, units: ['mm2'], show: byArea,
          presets: [['cab_pa05', 0.5], ['cab_pa075', 0.75], ['cab_pa15', 1.5], ['cab_pa25', 2.5], ['cab_pa4', 4]].map(([label, value]) => ({ label, value, raw: false })) },
        { key: 'awg', type: 'select', label: 'cab_awg', default: '18', hint: 'cab_awgHint', show: byAwg,
          options: AWG_SIZES.map((g) => ({ value: awgValue(g), label: `AWG ${awgName(g)}`, raw: true })) },
        { key: 'n', type: 'number', label: 'cab_n', default: 1, integer: true, info: 'cab_nInfo' },
        { key: 'mat', type: 'choice', label: 'cab_mat', default: 'cu', info: 'cab_matInfo',
          options: Object.keys(MATERIALS).map((k) => ({ value: k, label: k === 'al' ? 'cab_mAl' : 'cab_mCu' })) },
        { key: 't', type: 'number', label: 'cab_t', default: 20, units: ['C'], valid: 'any', min: T_MIN, max: T_MAX, hint: 'cab_tHint' },
      ],
    },
    {
      title: 'cab_secLimit',
      fields: [
        { key: 'pct', type: 'number', label: 'cab_pct', default: 5, units: ['pct'], max: 100, info: 'cab_pctInfo' },
      ],
    },
  ],

  compute(v, u) {
    return cable({
      solve: v.solve,
      currentA: v.i * (I_MUL[u.i] ?? NaN),
      supplyV: v.v,
      lengthM: v.len * (L_MUL[u.len] ?? NaN),
      circuit: v.circ,
      by: v.by,
      areaMm2: v.a,
      awg: awgOf(v.awg),
      parallel: v.n,
      material: v.mat,
      tempC: v.t,
      allowedPct: v.pct,
    });
  },
};
