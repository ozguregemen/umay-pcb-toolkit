import { mosfetLosses, alphaFromRatio } from '../engine/mosfet.js';
import { heroes, rows, block, steps, messages, invalid, checks } from '../ui/calculator.js';
import { tx } from '../ui/math.js';
import { fmt, fixed, si, siHtml, esc } from '../ui/format.js';
import { svg, text, rect, polygon, axes, wave, dimH } from '../ui/svg.js';
import { t } from '../i18n.js';

const strings = {
  tr: {
    mf_secOp: 'Çalışma noktası',
    mf_v: 'Kapalıyken drain–source gerilimi Vds',
    mf_vInfo: 'Anahtar kapalıyken üzerindeki gerilim: buck’ta Vin, boost’ta Vout. Kapanmadaki gerilim aşımı (spike) bu hesaba dahil değildir.',
    mf_i: 'Anahtarlanan drain akımı Id',
    mf_iInfo: 'Açılma ve kapanma anındaki akım. Bobin akımı dalgalıysa açılmada vadi, kapanmada tepe değeri daha doğrudur; ortalama akım iyi bir başlangıçtır.',
    mf_irmsMode: 'RMS akım',
    mf_fromDuty: 'İletim oranından',
    mf_direct: 'Doğrudan gir',
    mf_duty: 'İletim oranı D',
    mf_dutyInfo: 'MOSFET’in periyodun ne kadarında iletimde olduğu. Düz tepeli akım varsayılır: Irms = Id·√D (dalgalanma ihmal edilir).',
    mf_irms: 'Drain RMS akımı',
    mf_fsw: 'Anahtarlama frekansı',
    mf_secCond: 'İletim kaybı',
    mf_rds: 'Rds(on), 25 °C',
    mf_rdsInfo: 'Veri sayfasında sürdüğünüz Vgs için verilen değer (ör. Vgs = 10 V). Kötü durum için tipik değil en büyük değeri kullanın.',
    mf_tcMode: 'Sıcaklık etkisi',
    mf_byRatio: '125 °C oranı',
    mf_byAlpha: 'Katsayı α',
    mf_ratio: 'Rds(on)(125 °C) / Rds(on)(25 °C)',
    mf_ratioInfo: 'Veri sayfasındaki normalize Rds(on)–Tj eğrisinden okunur. Düşük gerilimli silisyum MOSFET’lerde tipik 1,4–1,7; yüksek gerilimli parçalarda 2 ve üzeri.',
    mf_alpha: 'Sıcaklık katsayısı α',
    mf_alphaInfo: 'Rds(on)(Tj) = Rds(on)(25 °C)·(1 + α/100)^(Tj − 25). α = 0,4 %/K, 125 °C’de yaklaşık 1,5 kat demektir.',
    mf_secSw: 'Anahtarlama ve gate sürme',
    mf_swMode: 'Anahtarlama kaybı yöntemi',
    mf_byQg: 'Gate yükünden',
    mf_byTime: 'Geçiş sürelerinden',
    mf_vdrv: 'Gate sürme gerilimi',
    mf_qg: 'Toplam gate yükü Qg',
    mf_qgInfo: 'Veri sayfasında sürme geriliminize yakın Vgs ve benzer Vds koşulundaki değer. Gate sürme gücünü verir.',
    mf_qgs: 'Gate–source yükü Qgs',
    mf_qgsInfo: 'Gate yük eğrisinde Miller platosunun başına kadar olan yük. Akımın yükseldiği kısım (Qgs2) Qgs·(Vplato − Vth)/Vplato olarak tahmin edilir.',
    mf_qgd: 'Gate–drain (Miller) yükü Qgd',
    mf_qgdInfo: 'Plato boyunca verilen yük; drain gerilimi bu sürede değişir. Qgd gerilimle arttığı için veri sayfası koşulu sizin Vds’nize yakın olmalı.',
    mf_vpl: 'Miller plato gerilimi',
    mf_vplInfo: 'Gate yük eğrisindeki düz bölümün gerilimi; yük akımı arttıkça biraz yükselir.',
    mf_vth: 'Eşik gerilimi Vth',
    mf_drive: 'Sürücü modeli',
    mf_drvRes: 'Direnç',
    mf_drvCur: 'Sabit akım',
    mf_rsrc: 'Sürücü çıkış direnci (açma)',
    mf_rsrcInfo: 'Sürücü veri sayfasındaki çıkış direnci (ör. ROH). Tepe akım değeri yerine bunu kullanın: plato sırasında akım (Vdrv − Vplato)/R ile sınırlıdır.',
    mf_rsink: 'Sürücü çıkış direnci (kapama)',
    mf_rgx: 'Harici gate direnci',
    mf_rgi: 'MOSFET iç gate direnci',
    mf_rgiInfo: 'Veri sayfasında Rg veya RG(int). Gate sürme gücünün bu dirence düşen payı MOSFET’in içinde harcanır.',
    mf_isrc: 'Sürücü kaynak akımı (açma)',
    mf_isrcInfo: 'Plato gerilimi civarında sürücünün verebildiği akım; veri sayfasındaki tepe akımdan genellikle düşüktür.',
    mf_isink: 'Sürücü yutma akımı (kapama)',
    mf_tr: 'Açılma geçiş süresi',
    mf_trInfo: 'Akımın yükselip gerilimin düştüğü toplam süre (ölçülen ya da tahmini). Veri sayfasındaki tr/tf dirençli yükle ölçülür; endüktif yükte genellikle daha uzundur.',
    mf_tf: 'Kapanma geçiş süresi',
    mf_secOther: 'Çıkış kapasitesi ve diyot',
    mf_coss: 'Çıkış kapasitesi Coss',
    mf_cossInfo: 'Varsa enerji eşdeğeri Co(er) ya da Qoss/Vds kullanın. Coss gerilimle azalır; düşük gerilimde verilen değer kaybı büyük gösterir.',
    mf_qrr: 'Ters toparlanma yükü Qrr',
    mf_qrrInfo: 'Bu MOSFET açılırken akımı devralan diyotun (yarım köprüde karşı MOSFET’in gövde diyotu) Qrr değeri; kayıp büyük ölçüde bu MOSFET’te oluşur. Schottky diyotta veya diyot yoksa 0 girin.',
    mf_tdead: 'Ölü zaman (her kenar)',
    mf_tdeadInfo: 'Yalnızca bu MOSFET’in gövde diyotu ölü zamanlarda iletiyorsa girin (ör. senkron buck’ın alt FET’i); periyotta iki ölü zaman sayılır. Üst (kontrol) FET için 0.',
    mf_vsd: 'Gövde diyotu gerilimi VSD',
    mf_secTh: 'Isıl yol',
    mf_path: 'Isıl yol',
    mf_ja: 'θJA (kart üzerinde)',
    mf_jc: 'θJC + soğutucu',
    mf_thetaJA: 'θJA',
    mf_thetaJAInfo: 'Veri sayfasındaki θJA, JEDEC test kartı içindir; kendi bakır alanınız ve hava akışınızla belirgin şekilde farklı olabilir.',
    mf_thetaJC: 'θJC (jonksiyon–kılıf)',
    mf_thetaCA: 'θCA (kılıf–ortam: arayüz + soğutucu)',
    mf_ta: 'Ortam sıcaklığı',
    mf_tjmax: 'İzin verilen en yüksek Tj',
    mf_tjmaxInfo: 'Mutlak sınır yerine tasarım sınırı kullanın: 150 °C veya 175 °C sınırlı parçalar için genellikle 125 °C.',
    mf_total: 'MOSFET toplam kaybı',
    mf_tj: 'Jonksiyon sıcaklığı Tj',
    mf_breakdown: 'Kayıp dağılımı',
    mf_pCond: 'İletim',
    mf_pOn: 'Açılma anahtarlaması',
    mf_pOff: 'Kapanma anahtarlaması',
    mf_pCoss: 'Coss boşalması',
    mf_pQrr: 'Ters toparlanma (Qrr)',
    mf_pDead: 'Gövde diyotu (ölü zaman)',
    mf_pGate: 'Gate sürme (MOSFET içindeki pay)',
    mf_rdsHot: 'Tj’deki Rds(on)',
    mf_irmsUsed: 'Kullanılan RMS akım',
    mf_times: 'Geçişler',
    mf_tri: 'Açılma: akım yükselmesi t_ri',
    mf_tfv: 'Açılma: gerilim düşmesi t_fv',
    mf_trv: 'Kapanma: gerilim yükselmesi t_rv',
    mf_tfi: 'Kapanma: akım düşmesi t_fi',
    mf_ig: 'Plato sırasında gate akımı (açma / kapama)',
    mf_qgs2: 'Tahmini Qgs2 (Vth → plato)',
    mf_eon: 'Açılma enerjisi Eon',
    mf_eoff: 'Kapanma enerjisi Eoff',
    mf_gateTot: 'Toplam gate sürme gücü Qg·Vdrv·fsw',
    mf_gateDrv: 'Sürücüde ve harici dirençte harcanan',
    mf_margin: 'Sıcaklık payı',
    mf_tjOk: 'Tj ≤ Tj,max',
    mf_checks: 'Kontroller',
    mf_advice: 'Değerlendirme',
    mf_hintSw: 'Anahtarlama kayıpları baskın: daha güçlü sürücü veya daha küçük gate direnci, daha düşük frekans ya da Qgd’si daha küçük bir MOSFET deneyin.',
    mf_hintCond: 'İletim kaybı baskın: daha düşük Rds(on)’lu bir MOSFET veya paralel MOSFET düşünün; bu durumda artan gate yükü daha az önemlidir.',
    mf_hintBal: 'İletim ve anahtarlama kayıpları dengeli; bu frekans için seçim makul görünüyor.',
    warn_mf_tjHigh: 'Tj izin verilen sınırı aşıyor: daha iyi soğutma, daha düşük kayıplı bir MOSFET veya daha düşük frekans gerekir.',
    warn_mf_runaway: 'Isıl kaçak: Rds(on) sıcaklıkla artarken bu ısıl dirençle kararlı bir çalışma noktası yok. Soğutmayı iyileştirin.',
    warn_mf_drvLow: 'Sürme gerilimi Miller platosuna çok yakın: gate akımı küçük, geçişler yavaş. Rds(on) değerinin bu Vgs için verildiğini de kontrol edin.',
    err_mf_vth: 'Eşik gerilimi sıfırdan büyük ve plato geriliminden küçük olmalı.',
    err_mf_vdrv: 'Sürme gerilimi Miller plato geriliminden büyük olmalı.',
    err_mf_rgate: 'Gate yolundaki toplam direnç sıfırdan büyük olmalı.',
    mf_rOn: 'Açmada gate yolu direnci',
    mf_rOff: 'Kapamada gate yolu direnci',
    mf_iterNote: 'Rds(on) Tj’ye, Tj de toplam kayba bağlıdır; bu yüzden ikisi, Tj değişmeyene kadar yinelemeyle (iterasyon) birlikte çözülür. Adımlar kayıpları bu son Tj değerinde gösterir; toplam kayıp son adımda yerine konunca aynı Tj elde edilir.',
    mf_note: 'Doğrusal yaklaşımla sert anahtarlama (kenetlenmiş endüktif yük) tahmini. Kaynak endüktansı ve kapasitelerin gerilime bağlılığı geçişleri değiştirir; sonuç, gerçek değerden onlarca yüzde sapabilen bir başlangıç tahminidir. Yalnızca Rds(on) Tj ile güncellenir; anahtarlama kayıplarının sıcaklıkla değişimi ihmal edilir. Gate sürme gücünün çoğu sürücüde ve harici dirençte harcanır, Tj hesabına yalnızca iç gate direncindeki pay girer.',
    mf_dgAria: 'MOSFET açılma ve kapanma dalga şekilleri, gerilim ile akımın örtüştüğü kayıp alanları ve kayıp dağılımı çubuğu',
    mf_dgStretch: 'geçişler büyütülmüş, ölçekli değil',
    mf_dgOff: 'kapalı',
    mf_dgOn: 'iletimde',
    mf_lgCond: 'İletim',
    mf_lgOn: 'Açılma',
    mf_lgOff: 'Kapanma',
    mf_lgDead: 'Ölü zaman',
    mf_lgGate: 'Gate',
  },
  en: {
    mf_secOp: 'Operating point',
    mf_v: 'Off-state drain–source voltage Vds',
    mf_vInfo: 'The voltage across the switch while it is off: Vin for a buck, Vout for a boost. The turn-off voltage spike is not included.',
    mf_i: 'Switched drain current Id',
    mf_iInfo: 'The current at turn-on and turn-off. With inductor ripple the valley (turn-on) and peak (turn-off) are more accurate; the average current is a good start.',
    mf_irmsMode: 'RMS current',
    mf_fromDuty: 'From duty cycle',
    mf_direct: 'Enter directly',
    mf_duty: 'Conduction duty D',
    mf_dutyInfo: 'The fraction of the period the MOSFET conducts. A flat-top current is assumed: Irms = Id·√D (ripple ignored).',
    mf_irms: 'Drain RMS current',
    mf_fsw: 'Switching frequency',
    mf_secCond: 'Conduction loss',
    mf_rds: 'Rds(on) at 25 °C',
    mf_rdsInfo: 'The datasheet value for your gate voltage (e.g. Vgs = 10 V). For a worst case use the maximum, not the typical value.',
    mf_tcMode: 'Temperature effect',
    mf_byRatio: 'Ratio at 125 °C',
    mf_byAlpha: 'Coefficient α',
    mf_ratio: 'Rds(on)(125 °C) / Rds(on)(25 °C)',
    mf_ratioInfo: 'Read from the normalised Rds(on)–Tj curve in the datasheet. Typically 1.4–1.7 for low-voltage silicon MOSFETs, 2 or more for high-voltage parts.',
    mf_alpha: 'Temperature coefficient α',
    mf_alphaInfo: 'Rds(on)(Tj) = Rds(on)(25 °C)·(1 + α/100)^(Tj − 25). α = 0.4 %/K means about 1.5× at 125 °C.',
    mf_secSw: 'Switching and gate drive',
    mf_swMode: 'Switching-loss method',
    mf_byQg: 'From gate charge',
    mf_byTime: 'From transition times',
    mf_vdrv: 'Gate drive voltage',
    mf_qg: 'Total gate charge Qg',
    mf_qgInfo: 'Datasheet value at a Vgs close to your drive voltage and a similar Vds. It sets the gate-drive power.',
    mf_qgs: 'Gate–source charge Qgs',
    mf_qgsInfo: 'Charge up to the start of the Miller plateau on the gate-charge curve. The part during which the current rises (Qgs2) is estimated as Qgs·(Vplateau − Vth)/Vplateau.',
    mf_qgd: 'Gate–drain (Miller) charge Qgd',
    mf_qgdInfo: 'Charge delivered along the plateau, while the drain voltage swings. Qgd grows with voltage, so the datasheet condition should be close to your Vds.',
    mf_vpl: 'Miller plateau voltage',
    mf_vplInfo: 'The flat part of the gate-charge curve; it rises slightly with load current.',
    mf_vth: 'Threshold voltage Vth',
    mf_drive: 'Driver model',
    mf_drvRes: 'Resistance',
    mf_drvCur: 'Constant current',
    mf_rsrc: 'Driver output resistance (turn-on)',
    mf_rsrcInfo: 'The driver’s output resistance from its datasheet (e.g. ROH). Use it rather than the peak current: during the plateau the current is limited to (Vdrv − Vplateau)/R.',
    mf_rsink: 'Driver output resistance (turn-off)',
    mf_rgx: 'External gate resistor',
    mf_rgi: 'MOSFET internal gate resistance',
    mf_rgiInfo: 'Rg or RG(int) in the datasheet. The share of the gate-drive power lost in it is dissipated inside the MOSFET.',
    mf_isrc: 'Driver source current (turn-on)',
    mf_isrcInfo: 'The current the driver delivers near the plateau voltage; usually lower than the datasheet peak current.',
    mf_isink: 'Driver sink current (turn-off)',
    mf_tr: 'Turn-on transition time',
    mf_trInfo: 'Total time for the current to rise and the voltage to fall (measured or estimated). Datasheet tr/tf are measured with a resistive load; with an inductive load they are usually longer.',
    mf_tf: 'Turn-off transition time',
    mf_secOther: 'Output capacitance and diode',
    mf_coss: 'Output capacitance Coss',
    mf_cossInfo: 'Use the energy-related Co(er) or Qoss/Vds when given. Coss falls with voltage, so a low-voltage value overstates the loss.',
    mf_qrr: 'Reverse-recovery charge Qrr',
    mf_qrrInfo: 'Qrr of the diode that hands the current over when this MOSFET turns on (in a half bridge, the other MOSFET’s body diode); the loss lands mostly in this MOSFET. Enter 0 for a Schottky or no diode.',
    mf_tdead: 'Dead time (each edge)',
    mf_tdeadInfo: 'Only if this MOSFET’s own body diode conducts during dead time (e.g. the low-side FET of a synchronous buck); two dead times per period are counted. 0 for the high-side (control) FET.',
    mf_vsd: 'Body-diode voltage VSD',
    mf_secTh: 'Thermal path',
    mf_path: 'Thermal path',
    mf_ja: 'θJA (on the board)',
    mf_jc: 'θJC + heatsink',
    mf_thetaJA: 'θJA',
    mf_thetaJAInfo: 'Datasheet θJA refers to the JEDEC test board; with your copper area and airflow it can differ a lot.',
    mf_thetaJC: 'θJC (junction–case)',
    mf_thetaCA: 'θCA (case–ambient: interface + heatsink)',
    mf_ta: 'Ambient temperature',
    mf_tjmax: 'Maximum allowed Tj',
    mf_tjmaxInfo: 'Use a design limit, not the absolute maximum: usually 125 °C for parts rated 150 °C or 175 °C.',
    mf_total: 'Total MOSFET loss',
    mf_tj: 'Junction temperature Tj',
    mf_breakdown: 'Loss breakdown',
    mf_pCond: 'Conduction',
    mf_pOn: 'Turn-on switching',
    mf_pOff: 'Turn-off switching',
    mf_pCoss: 'Coss discharge',
    mf_pQrr: 'Reverse recovery (Qrr)',
    mf_pDead: 'Body diode (dead time)',
    mf_pGate: 'Gate drive (share inside the MOSFET)',
    mf_rdsHot: 'Rds(on) at Tj',
    mf_irmsUsed: 'RMS current used',
    mf_times: 'Transitions',
    mf_tri: 'Turn-on: current rise t_ri',
    mf_tfv: 'Turn-on: voltage fall t_fv',
    mf_trv: 'Turn-off: voltage rise t_rv',
    mf_tfi: 'Turn-off: current fall t_fi',
    mf_ig: 'Gate current on the plateau (on / off)',
    mf_qgs2: 'Estimated Qgs2 (Vth → plateau)',
    mf_eon: 'Turn-on energy Eon',
    mf_eoff: 'Turn-off energy Eoff',
    mf_gateTot: 'Total gate-drive power Qg·Vdrv·fsw',
    mf_gateDrv: 'Dissipated in the driver and external resistor',
    mf_margin: 'Temperature margin',
    mf_tjOk: 'Tj ≤ Tj,max',
    mf_checks: 'Checks',
    mf_advice: 'Assessment',
    mf_hintSw: 'Switching losses dominate: try a stronger driver or a smaller gate resistor, a lower frequency, or a MOSFET with less Qgd.',
    mf_hintCond: 'Conduction loss dominates: consider a MOSFET with lower Rds(on) or MOSFETs in parallel; the extra gate charge matters less here.',
    mf_hintBal: 'Conduction and switching losses are balanced; the part looks reasonable for this frequency.',
    warn_mf_tjHigh: 'Tj exceeds the allowed limit: better cooling, a lower-loss MOSFET or a lower frequency is needed.',
    warn_mf_runaway: 'Thermal runaway: with Rds(on) rising with temperature there is no stable operating point at this thermal resistance. Improve the cooling.',
    warn_mf_drvLow: 'The drive voltage is close to the Miller plateau: little gate current and slow transitions. Also check that Rds(on) is specified at this Vgs.',
    err_mf_vth: 'The threshold voltage must be above zero and below the plateau voltage.',
    err_mf_vdrv: 'The drive voltage must be above the Miller plateau voltage.',
    err_mf_rgate: 'The total resistance in the gate path must be above zero.',
    mf_rOn: 'Gate-path resistance at turn-on',
    mf_rOff: 'Gate-path resistance at turn-off',
    mf_iterNote: 'Rds(on) depends on Tj and Tj on the total loss, so the two are solved together by iteration until Tj stops changing. The steps show the losses at that final Tj; putting the total loss into the last step returns the same Tj.',
    mf_note: 'Linear-approximation estimate for hard switching (clamped inductive load). Source inductance and voltage-dependent capacitances change the transitions, so treat the result as a starting estimate that can be off by tens of percent. Only Rds(on) is updated with Tj; the temperature dependence of switching losses is ignored. Most of the gate-drive power is dissipated in the driver and external resistor; only the share in the internal gate resistance enters Tj.',
    mf_dgAria: 'MOSFET turn-on and turn-off waveforms with the voltage–current overlap (loss) areas shaded, and a loss breakdown bar',
    mf_dgStretch: 'transitions stretched, not to scale',
    mf_dgOff: 'off',
    mf_dgOn: 'on',
    mf_lgCond: 'Conduction',
    mf_lgOn: 'Turn-on',
    mf_lgOff: 'Turn-off',
    mf_lgDead: 'Dead time',
    mf_lgGate: 'Gate',
  },
};

const NS = 1e-9;
const freq = (v, u) => v.f * ({ Hz: 1, kHz: 1e3, MHz: 1e6 }[u.f] ?? 1e3);
const ohms = (x, unit) => x * (unit === 'mohm' ? 1e-3 : 1);
const irmsOf = (v) => (v.im === 'rms' ? v.irms : v.i * Math.sqrt(v.d / 100));
const isQg = (v) => v.sw !== 'time';
const isRes = (v) => isQg(v) && v.drive !== 'cur';
const isCur = (v) => isQg(v) && v.drive === 'cur';
const num0 = (x) => (Number.isFinite(x) ? x : 0);

// Loss parts in drawing order with their legend label and fill colour.
const PARTS = [
  ['cond', 'mf_pCond', 'mf_lgCond', 'fill:var(--accent)'],
  ['on', 'mf_pOn', 'mf_lgOn', 'fill:var(--focus)'],
  ['off', 'mf_pOff', 'mf_lgOff', 'fill:var(--focus);fill-opacity:.45'],
  ['coss', 'mf_pCoss', 'Coss', 'fill:var(--ok-fg)'],
  ['qrr', 'mf_pQrr', 'Qrr', 'fill:var(--err-fg)'],
  ['dead', 'mf_pDead', 'mf_lgDead', 'fill:var(--muted)'],
  ['gate', 'mf_pGate', 'mf_lgGate', 'fill:var(--warn-fg)'],
];
const legendLabel = (k) => (k.startsWith('mf_') ? t(k) : k);

/**
 * Live picture. Top: Vds (solid) and Id (dashed) over one period with the
 * turn-on and turn-off transitions stretched; the shaded triangles are the
 * instantaneous power v·i whose areas are Eon and Eoff. Bottom: the loss
 * budget as a stacked bar with each part's share.
 */
function diagram(v, u, r) {
  const x0 = 44;
  const y0 = 118;
  const amp = 74;
  const xOn = 96;
  const xOff = 266;
  const xEnd = 404;
  // Transition widths: the longer edge gets 66 px, intervals at least 5 px.
  const tm = r ? [r.tri, r.tfv, r.trv, r.tfi] : [1, 4, 4, 1];
  const span = Math.max(tm[0] + tm[1], tm[2] + tm[3]) || 1;
  const [wri, wfv, wrv, wfi] = tm.map((x) => Math.max(5, (66 * x) / span));
  const vOn = 4; // on-state Vds drawn just above zero
  const yV = y0 - amp;
  const vds = [[x0, yV], [xOn + wri, yV], [xOn + wri + wfv, y0 - vOn], [xOff, y0 - vOn], [xOff + wrv, yV], [xEnd, yV]];
  const id = [[x0, y0], [xOn, y0], [xOn + wri, yV + 10], [xOff + wrv, yV + 10], [xOff + wrv + wfi, y0], [xEnd, y0]];
  const peak = y0 - amp + 10;
  let b = polygon([[xOn, y0], [xOn + wri, peak], [xOn + wri + wfv, y0]], 'zone')
    + polygon([[xOff, y0], [xOff + wrv, peak], [xOff + wrv + wfi, y0]], 'zone')
    + axes(x0, y0, xEnd - x0 + 8, amp + 18, { xLabel: 't' })
    + text(x0 - 5, yV + 4, 'Vds', { cls: 'sym', anchor: 'end' })
    + text((xOn + wri + xOff + wrv) / 2, yV + 26, 'Id', { cls: 'sym' })
    + wave(id, 'wave2') + wave(vds)
    + text((xOn + wri + wfv + xOff) / 2, y0 - 12, t('mf_dgOn'), { anchor: 'middle' })
    + text((xOff + wrv + wfi + xEnd) / 2, yV + 30, t('mf_dgOff'), { anchor: 'middle' })
    + text(x0 + 26, yV + 30, t('mf_dgOff'), { anchor: 'middle' });
  const val = (x, unit) => (Number.isFinite(x) ? si(x, unit, 3) : '?');
  b += text(xOn + wri, yV - 9, `Eon ${val(r?.eOn, 'J')}`, { cls: 'val' })
    + text(xOff + wrv, yV - 9, `Eoff ${val(r?.eOff, 'J')}`, { cls: 'val' })
    + dimH(xOn, xOn + wri + wfv, y0 + 14, val(r ? r.tri + r.tfv : NaN, 's'), { below: true, cls: 'val' })
    + dimH(xOff, xOff + wrv + wfi, y0 + 14, val(r ? r.trv + r.tfi : NaN, 's'), { below: true, cls: 'val' })
    + text(xEnd, 14, t('mf_dgStretch'), { anchor: 'end' })
    + rect(x0, 8, 10, 8, 'zone') + text(x0 + 14, 16, 'p = v·i', { anchor: 'start' });

  // Loss breakdown bar
  const yb = 160;
  const W = xEnd - x0;
  const total = r?.total;
  if (r && total > 0 && Number.isFinite(total)) {
    let x = x0;
    const shown = PARTS.filter(([k]) => r.parts[k] > 0);
    for (const [k, , , style] of shown) {
      const w = (W * r.parts[k]) / total;
      b += rect(x, yb, w, 18, 'seg', ` style="${style}"`);
      x += w;
    }
    b += rect(x0, yb, W, 18, 'wire');
    shown.forEach(([k, , lg, style], i) => {
      const cx = x0 + (i % 3) * 122;
      const cy = 198 + Math.floor(i / 3) * 17;
      b += rect(cx, cy - 9, 10, 10, 'seg', ` style="${style}"`)
        + text(cx + 15, cy, `${legendLabel(lg)} ${fixed((100 * r.parts[k]) / total, 1)} %`, { anchor: 'start' });
    });
    b += text(x0, yb - 6, `${t('mf_breakdown')} · ${si(total, 'W', 3)}`, { cls: 'title', anchor: 'start' });
  } else {
    b += rect(x0, yb, W, 18, 'soft') + text(x0, yb - 6, t('mf_breakdown'), { cls: 'title', anchor: 'start' });
  }
  return svg(440, 252, b, t('mf_dgAria'), { wide: true });
}

const KW = ['KW'];

/**
 * Calculation steps in the order of the calculation: the switching intervals,
 * the losses that do not depend on temperature, then the conduction loss at
 * the junction temperature the iteration settled on, the total and Tj itself.
 * On thermal runaway there is no such temperature and those steps are left out.
 */
function worked(r, v, u) {
  const q = (x, unit) => tx(si(x, unit));
  const n = (x, sig = 4) => tx(fmt(x, sig));
  const V = (x) => q(x, 'V');
  const A = (x) => q(x, 'A');
  const R = (x) => q(x, 'Ω');
  const Q = (x) => q(x, 'C');
  const T = (x) => q(x, 's');
  const W = (x) => q(x, 'W');
  const minus = (s) => s.replace(/^-/, '−');
  const tjTxt = minus(fixed(r.tj, 1)); // as in the headline
  const ta = tx(`${minus(fmt(v.ta, 4))} °C`);
  const theta = (x) => tx(`${fmt(x, 4)} °C/W`);
  const half = '\\frac{1}{2}';
  const f = q(freq(v, u), 'Hz');
  const vds = V(v.v);
  const id = A(v.i);
  const p = r.parts;
  const res = r.isQg && r.isRes;
  const cur = r.isQg && !r.isRes;
  const duty = v.im !== 'rms';
  const byRatio = v.tc !== 'alpha';
  const chain = v.path === 'jc';
  const settled = !r.runaway;
  const list = [];

  // Switching intervals
  if (r.isQg) {
    const vpl = V(v.vpl);
    const vth = V(v.vth);
    const vdrv = V(v.vdrv);
    const qgd = Q(v.qgd * NS);
    const qgs2 = Q(r.qgs2);
    const vmid = `\\frac{${vpl} + ${vth}}{2}`;
    list.push({ label: 'mf_qgs2', sym: 'Q_{gs2} = Q_{gs} \\cdot \\frac{V_{pl} − V_{th}}{V_{pl}}', num: `${Q(v.qgs * NS)} \\cdot \\frac{${vpl} − ${vth}}{${vpl}}`, res: qgs2 });
    if (res) {
      const rgx = R(num0(v.rgx));
      const rgi = R(num0(v.rgi));
      list.push(
        { label: 'mf_rOn', sym: 'R_{on} = R_{src} + R_{g,ext} + R_{g,int}', num: `${R(v.rsrc)} + ${rgx} + ${rgi}`, res: R(r.rOn) },
        { label: 'mf_rOff', sym: 'R_{off} = R_{sink} + R_{g,ext} + R_{g,int}', num: `${R(v.rsink)} + ${rgx} + ${rgi}`, res: R(r.rOff) },
        { label: 'mf_tri', sym: 't_{ri} = \\frac{Q_{gs2} \\cdot R_{on}}{V_{drv} − \\frac{V_{pl} + V_{th}}{2}}', num: `\\frac{${qgs2} \\cdot ${R(r.rOn)}}{${vdrv} − ${vmid}}`, res: T(r.tri) },
        { label: 'mf_tfv', sym: 't_{fv} = \\frac{Q_{gd} \\cdot R_{on}}{V_{drv} − V_{pl}}', num: `\\frac{${qgd} \\cdot ${R(r.rOn)}}{${vdrv} − ${vpl}}`, res: T(r.tfv) },
        { label: 'mf_trv', sym: 't_{rv} = \\frac{Q_{gd} \\cdot R_{off}}{V_{pl}}', num: `\\frac{${qgd} \\cdot ${R(r.rOff)}}{${vpl}}`, res: T(r.trv) },
        { label: 'mf_tfi', sym: 't_{fi} = \\frac{Q_{gs2} \\cdot R_{off}}{\\frac{V_{pl} + V_{th}}{2}}', num: `\\frac{${qgs2} \\cdot ${R(r.rOff)}}{${vmid}}`, res: T(r.tfi) },
      );
    } else {
      list.push(
        { label: 'mf_tri', sym: 't_{ri} = \\frac{Q_{gs2}}{I_{src}}', num: `\\frac{${qgs2}}{${A(v.isrc)}}`, res: T(r.tri) },
        { label: 'mf_tfv', sym: 't_{fv} = \\frac{Q_{gd}}{I_{src}}', num: `\\frac{${qgd}}{${A(v.isrc)}}`, res: T(r.tfv) },
        { label: 'mf_trv', sym: 't_{rv} = \\frac{Q_{gd}}{I_{sink}}', num: `\\frac{${qgd}}{${A(v.isink)}}`, res: T(r.trv) },
        { label: 'mf_tfi', sym: 't_{fi} = \\frac{Q_{gs2}}{I_{sink}}', num: `\\frac{${qgs2}}{${A(v.isink)}}`, res: T(r.tfi) },
      );
    }
  } else {
    list.push(
      { label: 'mf_tr', sym: 't_{ri} = t_{fv} = \\frac{t_r}{2}', num: `\\frac{${T(v.tr * NS)}}{2}`, res: T(r.tri) },
      { label: 'mf_tf', sym: 't_{rv} = t_{fi} = \\frac{t_f}{2}', num: `\\frac{${T(v.tf * NS)}}{2}`, res: T(r.trv) },
    );
  }

  // Losses that do not depend on the junction temperature
  list.push(
    { label: 'mf_pOn', sym: `P_{on} = ${half} \\cdot V_{DS} \\cdot I_D \\cdot (t_{ri} + t_{fv}) \\cdot f_{sw}`,
      num: `${half} \\cdot ${vds} \\cdot ${id} \\cdot (${T(r.tri)} + ${T(r.tfv)}) \\cdot ${f}`, res: W(p.on) },
    { label: 'mf_pOff', sym: `P_{off} = ${half} \\cdot V_{DS} \\cdot I_D \\cdot (t_{rv} + t_{fi}) \\cdot f_{sw}`,
      num: `${half} \\cdot ${vds} \\cdot ${id} \\cdot (${T(r.trv)} + ${T(r.tfi)}) \\cdot ${f}`, res: W(p.off) },
    p.coss > 0 && { label: 'mf_pCoss', sym: `P_{Coss} = ${half} \\cdot C_{oss} \\cdot V_{DS}^{2} \\cdot f_{sw}`,
      num: `${half} \\cdot ${q(v.coss * (u.coss === 'nF' ? 1e-9 : 1e-12), 'F')} \\cdot {(${vds})}^{2} \\cdot ${f}`, res: W(p.coss) },
    p.qrr > 0 && { label: 'mf_pQrr', sym: 'P_{Qrr} = Q_{rr} \\cdot V_{DS} \\cdot f_{sw}', num: `${Q(v.qrr * NS)} \\cdot ${vds} \\cdot ${f}`, res: W(p.qrr) },
    p.dead > 0 && { label: 'mf_pDead', sym: 'P_{dead} = V_{SD} \\cdot I_D \\cdot 2 \\cdot t_{dead} \\cdot f_{sw}',
      num: `${V(v.vsd)} \\cdot ${id} \\cdot 2 \\cdot ${T(v.td * NS)} \\cdot ${f}`, res: W(p.dead) },
    p.gate > 0 && { label: 'mf_pGate', sym: `P_{g,FET} = ${half} \\cdot Q_g \\cdot V_{drv} \\cdot f_{sw} \\cdot (\\frac{R_{g,int}}{R_{on}} + \\frac{R_{g,int}}{R_{off}})`,
      num: `${half} \\cdot ${Q(v.qg * NS)} \\cdot ${V(v.vdrv)} \\cdot ${f} \\cdot (\\frac{${R(v.rgi)}}{${R(r.rOn)}} + \\frac{${R(v.rgi)}}{${R(r.rOff)}})`, res: W(p.gate) },
  );

  // Conduction loss at the settled junction temperature, total and Tj
  const sum = [['P_{cond}', p.cond], ['P_{on}', p.on], ['P_{off}', p.off], p.coss > 0 && ['P_{Coss}', p.coss], p.qrr > 0 && ['P_{Qrr}', p.qrr],
    p.dead > 0 && ['P_{dead}', p.dead], p.gate > 0 && ['P_{g,FET}', p.gate]].filter(Boolean);
  list.push(
    settled && duty && { label: 'mf_irms', sym: 'I_{rms} = I_D \\cdot \\sqrt{D}', num: `${id} \\cdot \\sqrt{${tx(`${fmt(v.d, 4)} %`)}}`, res: A(r.irms) },
    settled && byRatio && { label: 'mf_alpha', sym: 'α = 100 \\cdot (k_{125}^{\\frac{1}{100}} − 1)', num: `100 \\cdot ({${n(v.ratio)}}^{\\frac{1}{100}} − 1)`, res: tx(`${fmt(r.alphaPct, 4)} %/K`) },
    settled && { label: 'mf_rdsHot', sym: 'R_{DS(on)}(T_j) = R_{DS(on),25} \\cdot {(1 + \\frac{α}{100})}^{T_j − 25}',
      num: `${R(ohms(v.rds, u.rds))} \\cdot {(1 + \\frac{${n(r.alphaPct)}}{100})}^{${tx(tjTxt)} − 25}`, res: R(r.rds), note: 'mf_iterNote' },
    settled && { label: 'mf_secCond', sym: 'P_{cond} = I_{rms}^{2} \\cdot R_{DS(on)}(T_j)', num: `{(${A(r.irms)})}^{2} \\cdot ${R(r.rds)}`, res: W(p.cond) },
    settled && { label: 'mf_total', sym: `P = ${sum.map(([s]) => s).join(' + ')}`, num: sum.map(([, x]) => W(x)).join(' + '), res: W(r.total) },
    settled && (chain
      ? { label: 'mf_tj', sym: 'T_j = T_a + P \\cdot (θ_{JC} + θ_{CA})', num: `${ta} + ${W(r.total)} \\cdot (${theta(v.jc)} + ${theta(v.ca)})`, res: tx(`${tjTxt} °C`) }
      : { label: 'mf_tj', sym: 'T_j = T_a + P \\cdot θ_{JA}', num: `${ta} + ${W(r.total)} \\cdot ${theta(v.ja)}`, res: tx(`${tjTxt} °C`) }),
  );

  return steps(list, {
    note: 'mf_note',
    where: [
      ['V_{DS}', 'mf_v', 'v'], ['I_D', 'mf_i', 'i'], settled && (duty ? ['D', 'mf_duty', 'd'] : ['I_{rms}', 'mf_irms', 'irms']), ['f_{sw}', 'mf_fsw', 'f'],
      r.isQg && ['Q_{gs}', 'mf_qgs', 'qgs'], r.isQg && ['Q_{gd}', 'mf_qgd', 'qgd'], r.isQg && ['V_{pl}', 'mf_vpl', 'vpl'], r.isQg && ['V_{th}', 'mf_vth', 'vth'],
      res && ['V_{drv}', 'mf_vdrv', 'vdrv'], res && ['R_{src}', 'mf_rsrc', 'rsrc'], res && ['R_{sink}', 'mf_rsink', 'rsink'],
      res && ['R_{g,ext}', 'mf_rgx', 'rgx'], res && ['R_{g,int}', 'mf_rgi', 'rgi'],
      cur && ['I_{src}', 'mf_isrc', 'isrc'], cur && ['I_{sink}', 'mf_isink', 'isink'],
      !r.isQg && ['t_r', 'mf_tr', 'tr'], !r.isQg && ['t_f', 'mf_tf', 'tf'],
      p.coss > 0 && ['C_{oss}', 'mf_coss', 'coss'], p.qrr > 0 && ['Q_{rr}', 'mf_qrr', 'qrr'],
      p.dead > 0 && ['t_{dead}', 'mf_tdead', 'td'], p.dead > 0 && ['V_{SD}', 'mf_vsd', 'vsd'], p.gate > 0 && ['Q_g', 'mf_qg', 'qg'],
      settled && ['R_{DS(on),25}', 'mf_rds', 'rds'], settled && (byRatio ? ['k_{125}', 'mf_ratio', 'ratio'] : ['α', 'mf_alpha', 'alpha']),
      settled && ['T_a', 'mf_ta', 'ta'],
      settled && !chain && ['θ_{JA}', 'mf_thetaJA', 'ja'], settled && chain && ['θ_{JC}', 'mf_thetaJC', 'jc'], settled && chain && ['θ_{CA}', 'mf_thetaCA', 'ca'],
    ],
    refs: [
      'Infineon AN “MOSFET Power Losses Calculation Using the Data-Sheet Parameters” (Graovac, Pürschel, Kiep, 2006)',
      'TI SLUP169 (L. Balogh, gate drive design guide)',
      'TI SLPA009A',
      'Vishay AN608A',
    ],
  });
}

export default {
  diagram,
  id: 'mosfet',
  strings,
  sections: [
    {
      title: 'mf_secOp',
      fields: [
        { key: 'v', type: 'number', label: 'mf_v', default: 48, units: ['V'], info: 'mf_vInfo' },
        { key: 'i', type: 'number', label: 'mf_i', default: 10, units: ['A'], info: 'mf_iInfo' },
        { key: 'im', type: 'choice', label: 'mf_irmsMode', default: 'duty',
          options: [{ value: 'duty', label: 'mf_fromDuty' }, { value: 'rms', label: 'mf_direct' }] },
        { key: 'd', type: 'number', label: 'mf_duty', default: 50, units: ['pct'], max: 100, info: 'mf_dutyInfo', show: (v) => v.im !== 'rms' },
        { key: 'irms', type: 'number', label: 'mf_irms', default: 7, units: ['A'], show: (v) => v.im === 'rms' },
        { key: 'f', type: 'number', label: 'mf_fsw', default: 100, units: ['kHz', 'MHz', 'Hz'],
          presets: [{ label: '100 kHz', value: 100, unit: 'kHz' }, { label: '500 kHz', value: 500, unit: 'kHz' }, { label: '2 MHz', value: 2, unit: 'MHz' }] },
      ],
    },
    {
      title: 'mf_secCond',
      fields: [
        { key: 'rds', type: 'number', label: 'mf_rds', default: 10, units: ['mohm', 'ohm'], info: 'mf_rdsInfo' },
        { key: 'tc', type: 'choice', label: 'mf_tcMode', default: 'ratio',
          options: [{ value: 'ratio', label: 'mf_byRatio' }, { value: 'alpha', label: 'mf_byAlpha' }] },
        { key: 'ratio', type: 'number', label: 'mf_ratio', default: 1.5, min: 1, info: 'mf_ratioInfo', show: (v) => v.tc !== 'alpha',
          presets: [1.4, 1.5, 1.7, 2].map((x) => ({ label: `×${x}`, value: x })) },
        { key: 'alpha', type: 'number', label: 'mf_alpha', default: 0.4, units: ['%/K'], valid: 'nonneg', info: 'mf_alphaInfo', show: (v) => v.tc === 'alpha' },
      ],
    },
    {
      title: 'mf_secSw',
      fields: [
        { key: 'sw', type: 'choice', label: 'mf_swMode', default: 'qg',
          options: [{ value: 'qg', label: 'mf_byQg' }, { value: 'time', label: 'mf_byTime' }] },
        { key: 'vdrv', type: 'number', label: 'mf_vdrv', default: 10, units: ['V'],
          presets: [5, 10, 12].map((x) => ({ label: `${x} V`, value: x })) },
        { key: 'qg', type: 'number', label: 'mf_qg', default: 30, units: ['nC'], info: 'mf_qgInfo' },
        { key: 'qgs', type: 'number', label: 'mf_qgs', default: 8, units: ['nC'], info: 'mf_qgsInfo', show: isQg },
        { key: 'qgd', type: 'number', label: 'mf_qgd', default: 10, units: ['nC'], info: 'mf_qgdInfo', show: isQg },
        { key: 'vpl', type: 'number', label: 'mf_vpl', default: 4.5, units: ['V'], info: 'mf_vplInfo', show: isQg },
        { key: 'vth', type: 'number', label: 'mf_vth', default: 3, units: ['V'], show: isQg },
        { key: 'drive', type: 'choice', label: 'mf_drive', default: 'res', show: isQg,
          options: [{ value: 'res', label: 'mf_drvRes' }, { value: 'cur', label: 'mf_drvCur' }] },
        { key: 'rsrc', type: 'number', label: 'mf_rsrc', default: 2, units: ['ohm'], valid: 'nonneg', info: 'mf_rsrcInfo', show: isRes },
        { key: 'rsink', type: 'number', label: 'mf_rsink', default: 1, units: ['ohm'], valid: 'nonneg', show: isRes },
        { key: 'rgx', type: 'number', label: 'mf_rgx', default: 3.3, units: ['ohm'], valid: 'nonneg', show: isRes },
        { key: 'rgi', type: 'number', label: 'mf_rgi', default: 1, units: ['ohm'], valid: 'nonneg', info: 'mf_rgiInfo', show: isRes },
        { key: 'isrc', type: 'number', label: 'mf_isrc', default: 1, units: ['A'], info: 'mf_isrcInfo', show: isCur },
        { key: 'isink', type: 'number', label: 'mf_isink', default: 1.5, units: ['A'], show: isCur },
        { key: 'tr', type: 'number', label: 'mf_tr', default: 15, units: ['ns'], info: 'mf_trInfo', show: (v) => !isQg(v) },
        { key: 'tf', type: 'number', label: 'mf_tf', default: 15, units: ['ns'], show: (v) => !isQg(v) },
      ],
    },
    {
      title: 'mf_secOther',
      fields: [
        { key: 'coss', type: 'number', label: 'mf_coss', default: 400, units: ['pF', 'nF'], valid: 'nonneg', info: 'mf_cossInfo' },
        { key: 'qrr', type: 'number', label: 'mf_qrr', default: 50, units: ['nC'], valid: 'nonneg', info: 'mf_qrrInfo' },
        { key: 'td', type: 'number', label: 'mf_tdead', default: 0, units: ['ns'], valid: 'nonneg', info: 'mf_tdeadInfo' },
        { key: 'vsd', type: 'number', label: 'mf_vsd', default: 0.9, units: ['V'], show: (v) => v.td > 0 },
      ],
    },
    {
      title: 'mf_secTh',
      fields: [
        { key: 'path', type: 'choice', label: 'mf_path', default: 'ja',
          options: [{ value: 'ja', label: 'mf_ja' }, { value: 'jc', label: 'mf_jc' }] },
        { key: 'ja', type: 'number', label: 'mf_thetaJA', default: 40, units: KW, info: 'mf_thetaJAInfo', show: (v) => v.path !== 'jc' },
        { key: 'jc', type: 'number', label: 'mf_thetaJC', default: 1.5, units: KW, show: (v) => v.path === 'jc' },
        { key: 'ca', type: 'number', label: 'mf_thetaCA', default: 10, units: KW, show: (v) => v.path === 'jc' },
        { key: 'ta', type: 'number', label: 'mf_ta', default: 40, units: ['C'], valid: 'any',
          presets: [25, 40, 55, 85].map((x) => ({ label: `${x} °C`, value: x })) },
        { key: 'tjmax', type: 'number', label: 'mf_tjmax', default: 125, units: ['C'], valid: 'any', info: 'mf_tjmaxInfo',
          presets: [125, 150, 175].map((x) => ({ label: `${x} °C`, value: x })) },
      ],
    },
  ],

  compute(v, u) {
    const irms = irmsOf(v);
    const alphaPct = v.tc === 'alpha' ? v.alpha : alphaFromRatio(v.ratio);
    const r = mosfetLosses({
      v: v.v, i: v.i, irms, fsw: freq(v, u),
      rds25: ohms(v.rds, u.rds),
      alphaPct,
      sw: isQg(v) ? 'qg' : 'time',
      gate: {
        qgs: v.qgs * NS, qgd: v.qgd * NS, vpl: v.vpl, vth: v.vth, vdrv: v.vdrv,
        drive: v.drive === 'cur' ? 'cur' : 'res',
        rSrc: v.rsrc, rSink: v.rsink, rgExt: num0(v.rgx), rgInt: num0(v.rgi), iSrc: v.isrc, iSink: v.isink,
      },
      tr: v.tr * NS, tf: v.tf * NS,
      qg: v.qg * NS, vdrv: v.vdrv,
      coss: num0(v.coss) * (u.coss === 'nF' ? 1e-9 : 1e-12),
      qrr: num0(v.qrr) * NS,
      tdead: num0(v.td) * NS, vsd: num0(v.vsd),
      theta: v.path === 'jc' ? v.jc + v.ca : v.ja,
      ta: v.ta, tjMax: v.tjmax,
    });
    if (r.ok) Object.assign(r, { irms, alphaPct, isQg: isQg(v), isRes: isRes(v) });
    return r;
  },

  render(r, v, u) {
    if (!r.ok) return invalid(r.errors);
    const total = r.total;
    const share = (p) => `${si(p, 'W', 3)} · ${fixed((100 * p) / total, 1)} %`;
    const deg = (x) => (Number.isFinite(x) ? `${fixed(x, 1)} °C` : '—');
    const cond = r.parts.cond;
    const advice = r.psw > 2 * cond ? 'mf_hintSw' : cond > 2 * r.psw ? 'mf_hintCond' : 'mf_hintBal';
    return heroes([
      ['mf_total', siHtml(total, 'W', 3)],
      ['mf_tj', r.runaway ? '<span class="u">∞</span>' : `${fixed(r.tj, 1)} <span class="u">°C</span>`],
    ])
      + messages('warn', r.warnings)
      + (r.runaway ? '' : block('mf_checks', checks([[r.margin >= 0, esc(t('mf_tjOk')), `${t('mf_margin')}: ${deg(r.margin)}`]])))
      + worked(r, v, u)
      + block('mf_breakdown', rows(PARTS.map(([k, label]) => (r.parts[k] > 0 || k === 'cond' || k === 'on' || k === 'off') && [label, share(r.parts[k])])
        .concat([['mf_total', si(total, 'W', 4), true]])))
      + block('mf_advice', `<p class="note">${esc(t(advice))}</p>`)
      + block('mf_times', rows([
        ['mf_irmsUsed', si(r.irms, 'A')],
        ['mf_rdsHot', si(r.rds, 'Ω')],
        ['mf_tri', si(r.tri, 's', 3)],
        ['mf_tfv', si(r.tfv, 's', 3)],
        ['mf_trv', si(r.trv, 's', 3)],
        ['mf_tfi', si(r.tfi, 's', 3)],
        r.isQg && ['mf_qgs2', si(r.qgs2, 'C', 3)],
        r.isQg && ['mf_ig', `${si(r.ig.on3, 'A', 3)} / ${si(r.ig.off3, 'A', 3)}`],
        ['mf_eon', si(r.eOn, 'J', 3)],
        ['mf_eoff', si(r.eOff, 'J', 3)],
        ['mf_gateTot', si(r.gateTotal, 'W', 3)],
        ['mf_gateDrv', si(r.gateDriver, 'W', 3)],
      ]));
  },
};

