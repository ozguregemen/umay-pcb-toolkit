import { RISE_K, busCapacitance, i2cPullup } from '../engine/i2c.js';
import { TOLERANCE } from '../engine/eseries.js';
import { heroes, rows, block, formulaBlock, messages, checks } from '../ui/calculator.js';
import { fmt, si, siHtml, esc } from '../ui/format.js';
import { svg, twoTerm, wire, node, ground, terminal, text, rect, path, dimH, axes, wave, circle } from '../ui/svg.js';
import { t, locale } from '../i18n.js';

const strings = {
  tr: {
    ic_mode: 'Hız modu',
    ic_sm: 'Standard (100 kHz)',
    ic_fm: 'Fast (400 kHz)',
    ic_fmp: 'Fast-mode Plus (1 MHz)',
    ic_modeInfo: 'UM10204’e göre her modun en büyük yükselme süresi ve en küçük akım çekme (sink) kapasitesi farklıdır: Standard 1000 ns / 3 mA, Fast 300 ns / 3 mA, Fast-mode Plus 120 ns / 20 mA. Hattaki tüm cihazlar seçilen modu desteklemelidir.',
    ic_vdd: 'Besleme gerilimi VDD',
    ic_capMethod: 'Hat kapasitansı',
    ic_capEst: 'Tahmin et',
    ic_capDirect: 'Doğrudan gir',
    ic_devices: 'Hattaki cihaz sayısı',
    ic_devicesInfo: 'Denetleyici (MCU) dahil, SDA ve SCL hatlarına bağlı tüm entegreler. Her cihaz hatta bir pin kapasitansı ve bir kaçak akım ekler.',
    ic_pinC: 'Pin kapasitansı (cihaz başına)',
    ic_pinCInfo: 'UM10204 her I/O pini için en çok 10 pF’a izin verir; veri sayfalarında genellikle 3–10 pF yazar. Emin değilseniz 10 pF kullanın.',
    ic_len: 'İz / kablo uzunluğu',
    ic_cpl: 'Birim uzunluk kapasitansı',
    ic_cplInfo: 'Toprak düzlemi üzerindeki ince bir PCB izi yaklaşık 0,5–1,5 pF/cm, bükümlü çift kablo yaklaşık 0,5 pF/cm (50 pF/m), yassı kablo 0,4–0,6 pF/cm’dir.',
    ic_cx: 'Diğer kapasitanslar',
    ic_cxInfo: 'Konnektörler, ESD koruma diyotları, seviye dönüştürücüler ve test probları. Bir ESD diyotu tek başına 1–15 pF ekleyebilir.',
    ic_cb: 'Hat kapasitansı Cb',
    ic_cbInfo: 'Bir hattın (SDA ya da SCL) toprağa göre toplam kapasitansı: pinler, iz/kablo ve konnektörler. Ölçmek için yükselme süresini osiloskopla ölçüp Cb = tr / (0,8473·Rp) kullanabilirsiniz.',
    ic_advanced: 'Seçenekler',
    ic_series: 'E-serisi',
    ic_leak: 'Cihaz başına giriş kaçak akımı',
    ic_leakInfo: 'UM10204 her pin için en çok ±10 µA’e izin verir; modern CMOS entegrelerde tipik değer 1 µA’in altındadır. Girilirse yüksek seviyedeki 0,2·VDD gürültü payı için Rp üst sınırı da hesaba katılır.',
    ic_rpu: 'Kendi pull-up değeriniz',
    ic_rpuInfo: 'Kullanmayı düşündüğünüz direnci girin: yükselme süresi ve çekme akımı kontrol edilir, eğri bu değerle çizilir.',
    ic_rec: 'Önerilen pull-up',
    ic_recSub: 'tr = {tr} · sınır {lim}',
    ic_none: 'yok',
    ic_window: 'İzin verilen aralık',
    ic_windowSub: 'Rp(min) … Rp(max)',
    ic_windowEmpty: 'Rp(min) > Rp(max)',
    ic_busTitle: 'Hat kapasitansı',
    ic_cbPins: 'Pinler ({n} × {c})',
    ic_cbWiring: 'İz / kablo',
    ic_cbOther: 'Diğer',
    ic_cbTotal: 'Toplam Cb (hat başına)',
    ic_cbMax: 'Bu modda en çok Cb',
    ic_limitsTitle: 'Sınırlar (UM10204)',
    ic_vol: 'Düşük seviye çıkış gerilimi VOL',
    ic_iol: 'Garanti edilen çekme akımı IOL',
    ic_trMax: 'En büyük yükselme süresi tr',
    ic_rpMin: 'Rp(min) — akım çekme sınırı',
    ic_rpMaxRise: 'Rp(max) — yükselme süresi sınırı',
    ic_rpMaxLeak: 'Rp(max) — kaçak akım sınırı',
    ic_withRec: 'Önerilen değerle',
    ic_tr: 'Yükselme süresi (0,3 → 0,7·VDD)',
    ic_trPct: 'Sınırın yüzdesi',
    ic_iSink: 'Hat düşükken akım',
    ic_pLow: 'Hat düşükken dirençteki güç',
    ic_vHigh: 'Kaçak akımla yüksek seviye',
    ic_userTitle: 'Sizin değeriniz',
    ic_chkMin: 'Çekme akımı ≤ IOL',
    ic_chkMax: 'Yükselme süresi ≤ tr(max)',
    ic_chkLeak: 'Yüksek seviye ≥ 0,9·VDD (kaçak akımla)',
    ic_note: 'Rp(min), sürücü pin IOL akımını çekerken çıkışın VOL’ün altında kalması içindir; Rp(max), RC yükselmesinin 0,3·VDD’den 0,7·VDD’ye sınır süre içinde tamamlanması içindir. Öneri, aralığın içinde olup yükselme süresini sınırın en çok %80’inde tutan en büyük standart değerdir: büyük değer daha az akım, küçük değer daha hızlı kenar demektir. Kapasitans tahmini kabadır; prototipte yükselme süresini osiloskopla ölçün.',
    warn_ic_cbOver: 'Cb = {cb}, bu modda izin verilen {max} değerini aşıyor. Hattı kısaltın, cihaz sayısını azaltın ya da bir I²C tamponu (buffer) kullanın.',
    warn_ic_tight: 'Yükselme süresini sınırın %80’inde tutan standart değer yok; önerilen değer aralıkta ama kenar sınıra yakın.',
    warn_ic_lowVddSm: 'UM10204, VDD ≤ 2 V için düşük seviye değerini (VOL2 = 0,2·VDD, 2 mA) yalnızca Fast-mode ve Fast-mode Plus’ta tanımlar. Standard-mode cihazların veri sayfalarını kontrol edin.',
    warn_ic_userLow: 'Seçtiğiniz direnç Rp(min)’in altında: sürücü {i} çekmek zorunda kalır, düşük seviye VOL sınırını aşabilir.',
    warn_ic_userHigh: 'Seçtiğiniz direnç Rp(max)’ın üstünde: kenar çok yavaş, hat bu hızda güvenilir çalışmaz.',
    warn_ic_vddHigh: 'VDD 5,5 V’un üstünde; I²C cihazlarının çoğu en çok 5,5 V’a dayanır. Veri sayfasını kontrol edin.',
    err_ic_empty: 'Bu hız ve kapasitans için uygun pull-up yok: Rp(min) = {min}, Rp(max) = {max}. Daha düşük bir hız modu seçin, hat kapasitansını azaltın (daha kısa hat, daha az cihaz), hattı bir tampon ya da çoklayıcı ile bölün veya aktif (akım kaynaklı) pull-up kullanın.',
    ic_dgBus: 'I²C hattı: VDD’ye bağlı pull-up dirençleri, SCL ve SDA hatları, hattaki cihazlar ve hat başına toplam kapasitans Cb',
    ic_dgRise: 'Hat geriliminin yükselişi: 0,3·VDD’den 0,7·VDD’ye geçiş süresi tr ve izin verilen en büyük değer',
    ic_dgPerLine: 'hat başına',
  },
  en: {
    ic_mode: 'Speed mode',
    ic_sm: 'Standard (100 kHz)',
    ic_fm: 'Fast (400 kHz)',
    ic_fmp: 'Fast-mode Plus (1 MHz)',
    ic_modeInfo: 'UM10204 gives each mode its own maximum rise time and minimum sink current: Standard 1000 ns / 3 mA, Fast 300 ns / 3 mA, Fast-mode Plus 120 ns / 20 mA. Every device on the bus must support the chosen mode.',
    ic_vdd: 'Supply voltage VDD',
    ic_capMethod: 'Bus capacitance',
    ic_capEst: 'Estimate',
    ic_capDirect: 'Enter directly',
    ic_devices: 'Devices on the bus',
    ic_devicesInfo: 'All ICs on SDA and SCL, including the controller (MCU). Each device adds one pin capacitance and one leakage current to each line.',
    ic_pinC: 'Pin capacitance (per device)',
    ic_pinCInfo: 'UM10204 allows at most 10 pF per I/O pin; datasheets usually state 3–10 pF. Use 10 pF if unsure.',
    ic_len: 'Trace / cable length',
    ic_cpl: 'Capacitance per length',
    ic_cplInfo: 'A thin PCB trace over a ground plane is about 0.5–1.5 pF/cm, twisted-pair cable about 0.5 pF/cm (50 pF/m), ribbon cable 0.4–0.6 pF/cm.',
    ic_cx: 'Other capacitance',
    ic_cxInfo: 'Connectors, ESD protection diodes, level shifters and test probes. One ESD diode alone can add 1–15 pF.',
    ic_cb: 'Bus capacitance Cb',
    ic_cbInfo: 'Total capacitance of one line (SDA or SCL) to ground: pins, trace/cable and connectors. To measure it, scope the rise time and use Cb = tr / (0.8473·Rp).',
    ic_advanced: 'Options',
    ic_series: 'E-series',
    ic_leak: 'Input leakage per device',
    ic_leakInfo: 'UM10204 allows up to ±10 µA per pin; modern CMOS parts are typically below 1 µA. When entered, the upper Rp limit for the 0.2·VDD HIGH-level noise margin is included.',
    ic_rpu: 'Your pull-up value',
    ic_rpuInfo: 'Enter the resistor you plan to use: its rise time and sink current are checked and the curve is drawn with it.',
    ic_rec: 'Recommended pull-up',
    ic_recSub: 'tr = {tr} · limit {lim}',
    ic_none: 'none',
    ic_window: 'Allowed range',
    ic_windowSub: 'Rp(min) … Rp(max)',
    ic_windowEmpty: 'Rp(min) > Rp(max)',
    ic_busTitle: 'Bus capacitance',
    ic_cbPins: 'Pins ({n} × {c})',
    ic_cbWiring: 'Trace / cable',
    ic_cbOther: 'Other',
    ic_cbTotal: 'Total Cb (per line)',
    ic_cbMax: 'Maximum Cb for this mode',
    ic_limitsTitle: 'Limits (UM10204)',
    ic_vol: 'LOW-level output voltage VOL',
    ic_iol: 'Guaranteed sink current IOL',
    ic_trMax: 'Maximum rise time tr',
    ic_rpMin: 'Rp(min) — sink current limit',
    ic_rpMaxRise: 'Rp(max) — rise time limit',
    ic_rpMaxLeak: 'Rp(max) — leakage limit',
    ic_withRec: 'With the recommended value',
    ic_tr: 'Rise time (0.3 → 0.7·VDD)',
    ic_trPct: 'Share of the limit',
    ic_iSink: 'Current while the line is low',
    ic_pLow: 'Resistor power while low',
    ic_vHigh: 'HIGH level with leakage',
    ic_userTitle: 'Your value',
    ic_chkMin: 'Sink current ≤ IOL',
    ic_chkMax: 'Rise time ≤ tr(max)',
    ic_chkLeak: 'HIGH level ≥ 0.9·VDD (with leakage)',
    ic_note: 'Rp(min) keeps the output below VOL while the driver sinks IOL; Rp(max) lets the RC edge rise from 0.3·VDD to 0.7·VDD within the limit. The recommendation is the largest standard value inside the range that keeps the rise time at no more than 80 % of the limit: a larger value means less current, a smaller one a faster edge. The capacitance estimate is rough; measure the rise time on the prototype.',
    warn_ic_cbOver: 'Cb = {cb} exceeds the {max} allowed in this mode. Shorten the bus, reduce the device count or use an I²C buffer.',
    warn_ic_tight: 'No standard value keeps the rise time at 80 % of the limit; the recommended value is inside the range but the edge is close to the limit.',
    warn_ic_lowVddSm: 'For VDD ≤ 2 V, UM10204 defines the LOW level (VOL2 = 0.2·VDD at 2 mA) only for Fast-mode and Fast-mode Plus. Check the datasheets of Standard-mode devices.',
    warn_ic_userLow: 'Your resistor is below Rp(min): the driver must sink {i} and the LOW level may exceed VOL.',
    warn_ic_userHigh: 'Your resistor is above Rp(max): the edge is too slow for reliable operation at this speed.',
    warn_ic_vddHigh: 'VDD is above 5.5 V; most I²C devices tolerate at most 5.5 V. Check the datasheet.',
    err_ic_empty: 'No pull-up fits this speed and capacitance: Rp(min) = {min}, Rp(max) = {max}. Choose a slower mode, reduce the bus capacitance (shorter bus, fewer devices), split the bus with a buffer or multiplexer, or use an active (current-source) pull-up.',
    ic_dgBus: 'I²C bus: pull-up resistors to VDD, SCL and SDA lines, the devices on the bus and the total capacitance Cb of each line',
    ic_dgRise: 'Line voltage rising: the time tr from 0.3·VDD to 0.7·VDD and the maximum allowed value',
    ic_dgPerLine: 'per line',
  },
};

const tolPct = (s) => `±${new Intl.NumberFormat(locale(), { style: 'percent', maximumFractionDigits: 1 }).format(TOLERANCE[s].pct / 100)}`;
const SERIES_OPTS = ['E12', 'E24', 'E96'].map((s) => ({ value: s, raw: true, get label() { return `${s} (${tolPct(s)})`; } }));
const pct = (x) => new Intl.NumberFormat(locale(), { style: 'percent', maximumFractionDigits: 0 }).format(x);
const val = (x, unit) => (Number.isFinite(x) && x > 0 ? si(x, unit, 3) : '?');
const isEst = (v) => v.cm === 'est';
const LEN_M = { cm: 0.01, m: 1 };

// ---------------------------------------------------------------------------
// Diagrams
// ---------------------------------------------------------------------------

/** Pull-ups, SCL/SDA lines, up to four device boxes and the lumped Cb. */
function busDiagram(v, r) {
  const rp = r ? (r.user?.r ?? r.rec?.r) : NaN;
  const yScl = 90;
  const ySda = 118;
  const yRail = 26;
  const n = Number.isInteger(v.n) && v.n >= 1 ? v.n : 1;
  let b = terminal(40, yRail, `VDD = ${val(v.vdd, 'V')}`, 'top', 'val')
    + wire([43, yRail], [104, yRail]) + node(70, yRail) + node(104, yRail)
    + twoTerm('R', 70, yRail, 70, yScl, { name: 'Rp', value: val(rp, 'Ω'), flip: true })
    + twoTerm('R', 104, yRail, 104, ySda)
    + text(117, 58, 'Rp', { cls: 'name', anchor: 'start' }) + text(117, 72, val(rp, 'Ω'), { cls: 'val', anchor: 'start' })
    + node(70, yScl) + node(104, ySda)
    + wire([70, yScl], [420, yScl]) + wire([104, ySda], [420, ySda])
    + text(420, yScl - 6, 'SCL', { cls: 'name', anchor: 'end' })
    + text(420, ySda - 6, 'SDA', { cls: 'name', anchor: 'end' });
  // Devices: MCU plus up to three ICs (… for longer buses).
  const labels = n <= 4
    ? Array.from({ length: n }, (_, i) => (i === 0 ? 'MCU' : `IC${i}`))
    : ['MCU', 'IC1', '⋯', `IC${n - 1}`];
  labels.forEach((s, i) => {
    const x = 140 + i * 54;
    if (s === '⋯') { b += text(x + 22, 159, s, { cls: 'name' }); return; }
    b += wire([x + 14, yScl], [x + 14, 142]) + node(x + 14, yScl)
      + wire([x + 30, ySda], [x + 30, 142]) + node(x + 30, ySda)
      + rect(x, 142, 44, 26, 'comp', ' rx="3"') + text(x + 22, 159, s, { cls: 'name' });
  });
  b += node(410, ySda)
    + twoTerm('C', 410, ySda, 410, 162, { name: 'Cb', value: val(r?.cb, 'F'), flip: true, dashed: true })
    + ground(410, 162)
    + text(410, 192, t('ic_dgPerLine'), { cls: 'lbl' });
  return svg(440, 198, b, t('ic_dgBus'), { wide: true });
}

/** RC rise from 0 to VDD with the 0.3/0.7 thresholds, tr and the mode's limit. */
function riseDiagram(v, r) {
  const x0 = 70;
  const y0 = 150;
  const w = 340;
  const h = 118;
  const rp = r ? (r.user?.r ?? r.rec?.r ?? r.rpMin) : NaN;
  const ok = r && rp > 0 && r.cb > 0;
  const tau = ok ? rp * r.cb : 1;
  const trMax = ok ? r.trMax : 1.2;
  const t30 = tau * Math.log(1 / 0.7);
  const t70 = tau * Math.log(1 / 0.3);
  const span = Math.max(t70 * 1.35, (t30 + trMax) * 1.12);
  const X = (s) => x0 + (s / span) * w;
  const Y = (p) => y0 - p * h;
  const pts = [];
  for (let i = 0; i <= 80; i++) {
    const s = (i / 80) * span;
    pts.push([X(s), Y(1 - Math.exp(-s / tau))]);
  }
  const tr = t70 - t30;
  const over = ok && tr > trMax;
  const xMax = X(t30 + trMax);
  const f3 = fmt(0.3);
  const q = (n) => Math.round(n * 10) / 10;
  const f7 = fmt(0.7);
  return svg(440, 202,
    axes(x0, y0, w + 8, h + 8, { xLabel: 't' })
    + path(`M${x0},${Y(1)}H${x0 + w}`, 'ext') + path(`M${x0},${Y(0.7)}H${x0 + w}`, 'ext') + path(`M${x0},${Y(0.3)}H${x0 + w}`, 'ext')
    + text(x0 - 6, Y(1) + 4, 'VDD', { cls: 'lbl', anchor: 'end' })
    + text(x0 - 6, Y(0.7) + 4, `${f7}·VDD`, { cls: 'lbl', anchor: 'end' })
    + text(x0 - 6, Y(0.3) + 4, `${f3}·VDD`, { cls: 'lbl', anchor: 'end' })
    + wave(pts)
    + circle(X(t30), Y(0.3), 2.8, 'node') + circle(X(t70), Y(0.7), 2.8, 'node')
    + path(`M${q(X(t30))},${q(Y(0.3))}V196M${q(X(t70))},${q(Y(0.7))}V176M${q(xMax)},${y0}V196`, 'ext')
    + dimH(X(t30), X(t70), 172, `tr = ${ok ? si(tr, 's', 3) : '?'}`, { cls: over ? 'badt' : 'val' })
    + dimH(X(t30), xMax, 194, `tr(max) = ${ok ? si(trMax, 's', 3) : '?'}`, { cls: 'lbl' })
    + text(x0 + w - 4, Y(0.5) + 18, `τ = Rp · Cb = ${ok ? si(tau, 's', 3) : '?'}`, { cls: 'sym', anchor: 'end' }),
    t('ic_dgRise'), { wide: true });
}

const diagram = (v, u, r) => busDiagram(v, r) + riseDiagram(v, r);

// ---------------------------------------------------------------------------

export default {
  diagram,
  id: 'i2c',
  strings,
  sections: [
    {
      title: 'sectionSetup',
      fields: [
        { key: 'mode', type: 'choice', label: 'ic_mode', default: 'fm', info: 'ic_modeInfo',
          options: [{ value: 'sm', label: 'ic_sm' }, { value: 'fm', label: 'ic_fm' }, { value: 'fmp', label: 'ic_fmp' }] },
        { key: 'vdd', type: 'number', label: 'ic_vdd', default: 3.3, units: ['V'], max: 24,
          presets: [1.8, 3.3, 5].map((x) => ({ label: `${x} V`, value: x })) },
        { key: 'cm', type: 'choice', label: 'ic_capMethod', default: 'est',
          options: [{ value: 'est', label: 'ic_capEst' }, { value: 'dir', label: 'ic_capDirect' }] },
      ],
    },
    {
      title: 'ic_busTitle',
      fields: [
        { key: 'n', type: 'number', label: 'ic_devices', default: 4, integer: true, min: 1, max: 128, info: 'ic_devicesInfo' },
        { key: 'pinc', type: 'number', label: 'ic_pinC', default: 10, units: ['pF'], info: 'ic_pinCInfo', show: isEst },
        { key: 'len', type: 'number', label: 'ic_len', default: 20, units: ['cm', 'm'], valid: 'nonneg', show: isEst },
        { key: 'cpl', type: 'number', label: 'ic_cpl', default: 1, units: ['pF/cm'], info: 'ic_cplInfo', show: isEst,
          presets: [0.5, 1, 1.5].map((x) => ({ label: `${x} pF/cm`, value: x })) },
        { key: 'cx', type: 'number', label: 'ic_cx', default: 10, units: ['pF'], valid: 'nonneg', info: 'ic_cxInfo', show: isEst },
        { key: 'cbd', type: 'number', label: 'ic_cb', default: 100, units: ['pF'], info: 'ic_cbInfo', show: (v) => !isEst(v),
          presets: [50, 100, 200, 400].map((x) => ({ label: `${x} pF`, value: x })) },
      ],
    },
    {
      title: 'ic_advanced',
      collapsible: true,
      fields: [
        { key: 'ser', type: 'select', label: 'ic_series', default: 'E24', options: SERIES_OPTS },
        { key: 'leak', type: 'number', label: 'ic_leak', default: '', units: ['uA'], optional: true, max: 100, info: 'ic_leakInfo' },
        { key: 'rpu', type: 'number', label: 'ic_rpu', default: '', units: ['ohm'], si: true, optional: true, info: 'ic_rpuInfo' },
      ],
    },
  ],

  compute(v, u) {
    const cap = isEst(v)
      ? busCapacitance({
        devices: v.n,
        pinC: v.pinc * 1e-12,
        length: v.len * (LEN_M[u.len] ?? 0.01),
        cPerLength: v.cpl * 1e-10, // pF/cm → F/m
        extra: v.cx * 1e-12,
      })
      : { cb: v.cbd * 1e-12 };
    const r = i2cPullup({ vdd: v.vdd, mode: v.mode, cb: cap.cb, devices: v.n, leak: v.leak * 1e-6, series: v.ser });
    const user = v.rpu > 0 ? r.check(v.rpu) : null;
    const warnings = [];
    const vars = {
      ic_cbOver: { cb: si(cap.cb, 'F', 3), max: si(r.cbMax, 'F', 3) },
      ic_userLow: { i: user ? si(user.iSink, 'A', 3) : '' },
    };
    if (r.cbOver) warnings.push('ic_cbOver');
    if (r.tight) warnings.push('ic_tight');
    if (r.lowVdd && v.mode === 'sm') warnings.push('ic_lowVddSm');
    if (v.vdd > 5.5) warnings.push('ic_vddHigh');
    if (user && user.r < r.rpMin * (1 - 1e-9)) warnings.push('ic_userLow');
    if (user && user.r > r.rpMax * (1 + 1e-9)) warnings.push('ic_userHigh');
    return { ok: true, ...r, cap, user, warnings, vars };
  },

  render(r, v) {
    const rec = r.rec;
    const errVars = { ic_empty: { min: si(r.rpMin, 'Ω', 3), max: si(r.rpMax, 'Ω', 3) } };
    const recHero = rec
      ? ['ic_rec', siHtml(rec.r, 'Ω'), `${esc(v.ser)} · ${esc(t('ic_recSub', { tr: si(rec.tr, 's', 3), lim: si(r.trMax, 's', 3) }))}`]
      : ['ic_rec', `<span class="u">${esc(t('ic_none'))}</span>`, esc(t('ic_windowEmpty'))];
    const range = r.windowOk
      ? `${esc(si(r.rpMin, 'Ω', 3))} … ${esc(si(r.rpMax, 'Ω', 3))}`
      : `<span class="u">${esc(t('ic_none'))}</span>`;
    const cap = r.cap;
    const leakOn = Number.isFinite(r.rpMaxLeak);
    const at = (x) => rows([
      ['Rp', si(x.r, 'Ω', 3), true, true],
      ['ic_tr', `${si(x.tr, 's', 3)} (${pct(x.tr / r.trMax)})`],
      ['ic_iSink', si(x.iSink, 'A', 3)],
      ['ic_pLow', si(x.pLow, 'W', 3)],
      leakOn && ['ic_vHigh', si(x.vHigh, 'V', 3)],
    ]);
    const user = r.user;
    return heroes([recHero, ['ic_window', range, esc(t('ic_windowSub'))]])
      + (r.windowOk ? '' : messages('error', ['ic_empty'], errVars))
      + messages('warn', r.warnings, r.vars)
      + (rec ? block('ic_withRec', at(rec)) : '')
      + (user ? block('ic_userTitle', checks([
        [user.iSink <= r.iol * (1 + 1e-9), esc(t('ic_chkMin')), `${esc(si(user.iSink, 'A', 3))} / ${esc(si(r.iol, 'A', 3))}`],
        [user.tr <= r.trMax * (1 + 1e-9), esc(t('ic_chkMax')), `${esc(si(user.tr, 's', 3))} / ${esc(si(r.trMax, 's', 3))}`],
        leakOn && [user.vHigh >= 0.9 * v.vdd * (1 - 1e-9), esc(t('ic_chkLeak')), esc(si(user.vHigh, 'V', 3))],
      ]) + at(user)) : '')
      + block('ic_limitsTitle', rows([
        ['ic_vol', si(r.vol, 'V', 3)],
        ['ic_iol', si(r.iol, 'A', 3)],
        ['ic_trMax', si(r.trMax, 's', 3)],
        ['ic_rpMin', si(r.rpMin, 'Ω', 4), true],
        ['ic_rpMaxRise', si(r.rpMaxRise, 'Ω', 4), !leakOn || r.rpMaxRise <= r.rpMaxLeak],
        leakOn && ['ic_rpMaxLeak', si(r.rpMaxLeak, 'Ω', 4), r.rpMaxLeak < r.rpMaxRise],
      ]))
      + block('ic_busTitle', rows([
        cap.pins !== undefined && [t('ic_cbPins', { n: v.n, c: si(v.pinc * 1e-12, 'F', 3) }), si(cap.pins, 'F', 3), false, true],
        cap.wiring !== undefined && ['ic_cbWiring', si(cap.wiring, 'F', 3)],
        cap.other > 0 && ['ic_cbOther', si(cap.other, 'F', 3)],
        ['ic_cbTotal', si(cap.cb, 'F', 3), true],
        ['ic_cbMax', si(r.cbMax, 'F', 3)],
      ]))
      + formulaBlock([
        'Rp(min) = (VDD − VOL) / IOL',
        '          VDD > 2 V: VOL = 0.4 V, IOL = 3 mA (Sm, Fm) / 20 mA (Fm+)',
        '          VDD ≤ 2 V: VOL = 0.2 · VDD, IOL = 2 mA',
        `Rp(max) = tr / (0.8473 · Cb),   0.8473 = ln(0.7 / 0.3) = ${RISE_K.toFixed(4)}`,
        '          tr(max) = 1000 ns (Sm) / 300 ns (Fm) / 120 ns (Fm+)',
        'Rp(max) ≤ 0.1 · VDD / (n · Ii)   (VnH = 0.2 · VDD above VIH = 0.7 · VDD)',
        'Cb = n · Ci + C′ · ℓ + C_other',
      ], 'ic_note', ['NXP UM10204 Rev. 7.0 (2021), §7.1, Tables 9–10', 'TI SLVA689 (I²C bus pull-up resistor calculation)', 'IEC 60063:2015 (E-series)']);
  },
};


