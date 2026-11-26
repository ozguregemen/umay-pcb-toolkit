// Power tree and power budget. A custom page (not mountCalculator) because the
// number of regulators and loads varies. It keeps the calculator conventions:
// the whole tree lives in the URL (shareable link, saved calculations), copy
// link / copy summary / print / reset, live results and a live drawing.
//
// URL format (every part optional; no parameter at all = the default example):
//   ex=<id>                                    one of the examples (usb, 12v, liion)
//   s=<vnom>_<vmin>_<vmax>_<ta>_<name>          source: V, V, V, °C
//   r=<parent>_<type>_<vout>_<p1>_<p2>_<imax>_<theta>_<name>     one per regulator
//        parent  0 = source, n = the n-th regulator (1-based, in URL order)
//        type    ldo | buck | boost | bb | sw
//        p1, p2  ldo: Iq (µA), dropout (V) · buck/boost/bb: efficiency (%), Iq (µA) · sw: R (mΩ), –
//        imax    rated output current (mA), theta: θJA (°C/W)
//   l=<rail>_<ityp>_<imax>_<name>               one per load: rail as parent, mA, mA
// The name comes last, so it may contain "_"; empty = not given.

import { analyzePowerTree, SOURCE, REG_TYPES, LIMITS } from '../engine/powertree.js';
import { heroes, block, steps, parseNumber } from '../ui/calculator.js';
import { fmt, fixed, si, siHtml, esc } from '../ui/format.js';
import { tx } from '../ui/math.js';
import { t } from '../i18n.js';
import { icon } from '../ui/icons.js';
import { addZoomButtons } from '../ui/zoom.js';
import { svg, rect, text, arrow, path } from '../ui/svg.js';

const strings = {
  tr: {
    pt_intro: 'Kartınızın besleme ağacını tanımlayın: giriş kaynağı, regülatörler ve yükler. Her regülatörün ve kaynağın akımı, gücü, kaybı ve verimi tipik ve en kötü durum için hesaplanır; sık yapılan hatalar uyarı olarak gösterilir.',
    pt_examples: 'Örnekle başlayın:',
    pt_ex_usb: 'USB 5 V → 3,3 V LDO',
    pt_ex_12v: '12 V → 5 V buck → 3,3 V LDO + 1,8 V LDO',
    pt_ex_liion: 'Li-ion 3,0–4,2 V → 3,3 V buck-boost',
    pt_exAdapter: '12 V adaptör',
    pt_exSensors: 'Sensörler',
    pt_exLeds: 'LED’ler',
    pt_exCore: 'FPGA çekirdeği',
    pt_exFan: 'Fan',
    pt_exDisplay: 'Ekran',
    pt_exRadio: 'BLE radyo',
    pt_secSource: 'Giriş kaynağı',
    pt_name: 'Ad',
    pt_vnom: 'Nominal gerilim',
    pt_vmin: 'En düşük gerilim',
    pt_vmax: 'En yüksek gerilim',
    pt_ta: 'Ortam sıcaklığı',
    pt_srcHint: 'En düşük ve en yüksek gerilim boş bırakılırsa nominal değer kullanılır. En kötü durum bu aralıkta hesaplanır.',
    pt_secRegs: 'Regülatörler',
    pt_secLoads: 'Yükler',
    pt_addReg: 'Regülatör ekle',
    pt_addLoad: 'Yük ekle',
    pt_delReg: 'Regülatörü sil: {name}',
    pt_delLoad: 'Yükü sil: {name}',
    pt_noRegs: 'Regülatör yok; yükler doğrudan kaynağa bağlanır.',
    pt_noLoads: 'Henüz yük yok.',
    pt_type: 'Tür',
    pt_t_ldo: 'LDO',
    pt_t_buck: 'Buck',
    pt_t_boost: 'Boost',
    pt_t_buckboost: 'Buck-boost',
    pt_t_switch: 'Anahtar / doğrudan',
    pt_ts_switch: 'Anahtar',
    pt_parent: 'Besleyen hat',
    pt_vout: 'Çıkış gerilimi',
    pt_iq: 'Iq (sükûnet)',
    pt_vdo: 'Düşüm (dropout)',
    pt_eff: 'Verim η',
    pt_rser: 'Seri direnç',
    pt_irated: 'Anma akımı',
    pt_theta: 'θJA',
    pt_colLoad: 'Yük',
    pt_colRail: 'Hat',
    pt_colTyp: 'Tipik mA',
    pt_colMax: 'Maks mA',
    pt_aField: '{name}: {field}',
    pt_aRegName: 'Regülatör {n}: ad',
    pt_aLoadName: 'Yük {n}: ad',
    pt_aLoadRail: 'bağlı olduğu hat',
    pt_aLoadTyp: 'tipik akım (mA)',
    pt_aLoadMax: 'en yüksek akım (mA)',
    pt_formNote: 'Akımlar mA, Iq µA, seri direnç mΩ olarak girilir. Anma akımı ve θJA isteğe bağlıdır; girilirse yüklenme ve bağlantı sıcaklığı kontrol edilir. Yükün “Maks” alanı boşsa tipik akım kullanılır. “Anahtar / doğrudan”: yük anahtarı, ferrit boncuk ya da doğrudan bağlantı; çıkışı girişten I·R kadar düşüktür.',
    pt_source: 'Kaynak',
    pt_load: 'Yük',
    pt_hIsrc: 'Kaynak akımı (tipik)',
    pt_hIworst: 'Kaynak akımı (en kötü)',
    pt_hLoss: 'Toplam kayıp (tipik)',
    pt_hEff: 'Toplam verim (tipik)',
    pt_subTyp: '{v} girişte · {p}',
    pt_subWorst: '{v} girişte · güç en çok {p}',
    pt_subLoss: 'en kötü durumda {p}',
    pt_subEff: 'yük gücü {load} · en kötü durumda {e}',
    pt_dgAria: 'Güç ağacı: sol üstte kaynak, altında regülatör blokları ve yükler; oklarda tipik akım, her regülatörün yanında kaybı ve verimi; kaybı en büyük regülatör vurgulanır',
    pt_dgCaption: 'Tipik akımlar ve kayıplar · en büyük kayıp vurgulu',
    pt_dgLoss: 'kayıp',
    pt_dgWorst: 'en kötü',
    pt_stIout: 'çıkış akımı',
    pt_stIin: 'giriş akımı',
    pt_stVout: 'çıkış gerilimi',
    pt_stLoss: 'kayıp',
    pt_stSrcI: 'Kaynak akımı',
    pt_stSrcP: 'Kaynak gücü',
    pt_stTotLoss: 'Toplam kayıp',
    pt_stEff: 'Toplam verim',
    pt_wIout: 'hattan çekilen akım (yükler ve alt regülatörlerin giriş akımları)',
    pt_wIq: 'sükûnet akımı',
    pt_wEta: 'verim',
    pt_wR: 'seri direnç',
    pt_wSrc: 'kaynak gerilimi',
    pt_wPload: 'yüklerin toplam gücü',
    pt_note: 'Adımlar tipik durum içindir ve hesap sırasıyla, yüklerden kaynağa doğru yazılmıştır. Modelin kapsamadıkları: verim tek bir sayı alınır, oysa yüke bağlıdır (anahtarlamalı regülatörün hafif yükteki verimi çok daha düşüktür); açılış ve ani akım (inrush) yoktur; kablo, konnektör ve iz üzerindeki gerilim düşümü yoktur. Yükler sabit akım çeker ve LDO’nun regülasyonda kaldığı varsayılır. Tj = Ta + P·θJA kaba bir tahmindir: θJA kartın bakır alanına ve hava akışına bağlıdır.',
    pt_tblTitle: 'Regülatörler: tipik ve en kötü durum',
    pt_cTyp: 'Tipik',
    pt_cWorst: 'En kötü',
    pt_qLoss: 'Kayıp',
    pt_qLoadFrac: 'Yüklenme',
    pt_qV: 'Gerilim',
    pt_qI: 'Akım',
    pt_qP: 'Güç',
    pt_qPload: 'Yük gücü',
    pt_qLossTot: 'Toplam kayıp',
    pt_qEff: 'Verim',
    pt_worstNote: 'En kötü durum: bütün yükler en yüksek akımında; LDO en yüksek giriş geriliminde (en büyük kayıp), anahtarlamalı regülatör ve anahtar en düşük giriş geriliminde (en büyük giriş akımı). Yüklenme, çıkış akımının anma akımına oranıdır. Kaynak tablosundaki en kötü değerler, giriş geriliminin iki ucundaki sonuçlardan büyük olanıdır (verimde küçük olanı).',
    pt_linksTitle: 'İlgili hesaplayıcılarda aç',
    pt_lnkThermal: '{name}: bağlantı sıcaklığı',
    pt_lnkThermalSub: 'LDO, en kötü durum: {vin} → {vout}, {i}',
    pt_lnkDcdc: '{name}: bobin ve kondansatör hesabı',
    pt_lnkDcdcSub: '{top}: {vin} → {vout}, {i}, verim {e}',
    pt_lnkBattery: 'Pil ömrü',
    pt_lnkBatterySub: 'tipik kaynak akımı {i} ile',
    pt_sources: 'Kaynaklar',
    pt_sumFrom: '← {p}',
    pt_sumMax: 'en çok {i}',
    pt_sumRated: 'anma {i}',
    err_pt_source: 'Kaynağın nominal gerilimi sıfırdan büyük olmalı.',
    err_pt_sourceRange: 'Kaynak gerilimleri 0 < en düşük ≤ nominal ≤ en yüksek sırasında olmalı.',
    err_pt_ambient: 'Ortam sıcaklığı için geçerli bir sayı girin.',
    err_pt_cycle: 'Döngü: {names} birbirini besliyor. Bunlardan birinin “Besleyen hat” seçimini değiştirin.',
    err_pt_parent: '{name}: besleyen hat bulunamadı.',
    err_pt_rail: '{name}: bağlı olduğu hat bulunamadı.',
    err_pt_duplicate: 'Aynı kimliğe sahip iki regülatör var.',
    err_pt_type: '{name}: bilinmeyen regülatör türü.',
    err_pt_vout: '{name}: çıkış gerilimi sıfırdan büyük olmalı.',
    err_pt_eff: '{name}: verim %0’dan büyük ve en çok %100 olmalı.',
    err_pt_negative: '{name}: Iq, düşüm gerilimi ve seri direnç negatif olamaz; anma akımı ve θJA sıfırdan büyük olmalı.',
    err_pt_load: '{name}: tipik akım sıfır ya da daha büyük bir sayı olmalı.',
    err_pt_loadMax: '{name}: en yüksek akım tipik akımdan küçük olamaz.',
    err_pt_collapse: '{name}: seri direnç bu yük için çok büyük, çıkış gerilimi çöküyor. Direnci ya da arkasındaki yükü azaltın.',
    err_pt_range: 'Değerler hesaplanamayacak kadar büyük ya da küçük.',
    warn_pt_dropout: '{name}: en düşük girişte ({vin}) giriş–çıkış farkı {h}, düşüm gerilimi ise {vdo}. Çıkış {vout} değerinde tutulamaz (regülasyon bozulur). Girişi yükseltin, düşüm gerilimi daha küçük bir LDO seçin ya da çıkış gerilimini düşürün.',
    warn_pt_buckRange: '{name}: buck dönüştürücünün çıkışı ({vout}) en düşük giriş geriliminden ({vin}) küçük olmalı; bu girişte çıkış regüle edilemez. Buck-boost kullanın ya da giriş aralığını daraltın.',
    warn_pt_boostRange: '{name}: boost dönüştürücünün çıkışı ({vout}) en yüksek giriş geriliminden ({vin}) büyük olmalı; giriş çıkışı aşınca gerilim doğrudan çıkışa geçer. Buck-boost kullanın.',
    warn_pt_overRated: '{name}: en kötü durumda çıkış akımı {i}, anma akımını ({rated}) aşıyor (%{pct}). Daha yüksek akımlı bir parça seçin ya da yükün bir kısmını başka bir hatta taşıyın.',
    warn_pt_nearRated: '{name}: en kötü durumda çıkış akımı {i}, anma akımının ({rated}) %{pct} kadarı. %80’in üstünde pay azdır; sıcaklıkla akım sınırının düşmesini ve geçici yükleri kontrol edin.',
    warn_pt_tjOver: '{name}: en kötü durumda bağlantı sıcaklığı {tj} ({p} kayıp × θJA {theta} + ortam {ta}); 125 °C sınırının üstünde. Kaybı azaltın (anahtarlamalı regülatör, daha düşük giriş gerilimi) ya da ısıl direnci düşürün (daha geniş bakır alanı, daha büyük kılıf).',
    warn_pt_tjHigh: '{name}: en kötü durumda bağlantı sıcaklığı {tj} ({p} kayıp × θJA {theta} + ortam {ta}); 100 °C’nin üstünde. Çalışır ama pay azdır: θJA değerinin kendi kartınız için geçerli olduğunu doğrulayın.',
    warn_pt_noLoad: '{name} hattına ({v}) yük ya da regülatör bağlı değil. Bir yük unutulmuş olabilir; hat kullanılmıyorsa regülatörü silin.',
    warn_pt_ldoNoTheta: '{name}: LDO en kötü durumda {p} harcıyor ve θJA girilmemiş. 1 W’ın üstündeki kayıp küçük kılıfları (SOT-23, SOT-223) aşırı ısıtır; θJA girerek bağlantı sıcaklığını kontrol edin.',
  },
  en: {
    pt_intro: 'Describe the supply tree of your board: the input source, the regulators and the loads. Current, power, loss and efficiency are worked out for every regulator and for the source, typical and worst case, with warnings for the usual mistakes.',
    pt_examples: 'Start from an example:',
    pt_ex_usb: 'USB 5 V → 3.3 V LDO',
    pt_ex_12v: '12 V → 5 V buck → 3.3 V LDO + 1.8 V LDO',
    pt_ex_liion: 'Li-ion 3.0–4.2 V → 3.3 V buck-boost',
    pt_exAdapter: '12 V adapter',
    pt_exSensors: 'Sensors',
    pt_exLeds: 'LEDs',
    pt_exCore: 'FPGA core',
    pt_exFan: 'Fan',
    pt_exDisplay: 'Display',
    pt_exRadio: 'BLE radio',
    pt_secSource: 'Input source',
    pt_name: 'Name',
    pt_vnom: 'Nominal voltage',
    pt_vmin: 'Minimum voltage',
    pt_vmax: 'Maximum voltage',
    pt_ta: 'Ambient temperature',
    pt_srcHint: 'Leave minimum and maximum empty to use the nominal voltage. The worst case is worked out over this range.',
    pt_secRegs: 'Regulators',
    pt_secLoads: 'Loads',
    pt_addReg: 'Add regulator',
    pt_addLoad: 'Add load',
    pt_delReg: 'Remove regulator: {name}',
    pt_delLoad: 'Remove load: {name}',
    pt_noRegs: 'No regulators; loads connect straight to the source.',
    pt_noLoads: 'No loads yet.',
    pt_type: 'Type',
    pt_t_ldo: 'LDO',
    pt_t_buck: 'Buck',
    pt_t_boost: 'Boost',
    pt_t_buckboost: 'Buck-boost',
    pt_t_switch: 'Switch / direct',
    pt_ts_switch: 'Switch',
    pt_parent: 'Fed from',
    pt_vout: 'Output voltage',
    pt_iq: 'Iq (quiescent)',
    pt_vdo: 'Dropout',
    pt_eff: 'Efficiency η',
    pt_rser: 'Series resistance',
    pt_irated: 'Rated current',
    pt_theta: 'θJA',
    pt_colLoad: 'Load',
    pt_colRail: 'Rail',
    pt_colTyp: 'Typ mA',
    pt_colMax: 'Max mA',
    pt_aField: '{name}: {field}',
    pt_aRegName: 'Regulator {n}: name',
    pt_aLoadName: 'Load {n}: name',
    pt_aLoadRail: 'rail it is connected to',
    pt_aLoadTyp: 'typical current (mA)',
    pt_aLoadMax: 'maximum current (mA)',
    pt_formNote: 'Currents are in mA, Iq in µA, series resistance in mΩ. Rated current and θJA are optional; when given, loading and junction temperature are checked. An empty “Max” field of a load means the typical current. “Switch / direct”: a load switch, a ferrite bead or a direct connection; its output is I·R below its input.',
    pt_source: 'Source',
    pt_load: 'Load',
    pt_hIsrc: 'Source current (typ.)',
    pt_hIworst: 'Source current (worst)',
    pt_hLoss: 'Total loss (typ.)',
    pt_hEff: 'Efficiency (typ.)',
    pt_subTyp: 'at {v} input · {p}',
    pt_subWorst: 'at {v} input · power up to {p}',
    pt_subLoss: 'worst case {p}',
    pt_subEff: 'load power {load} · worst case {e}',
    pt_dgAria: 'Power tree: the source at the top left, regulator blocks and loads below it; typical current on the arrows, loss and efficiency next to every regulator; the regulator with the largest loss is highlighted',
    pt_dgCaption: 'Typical currents and losses · largest loss highlighted',
    pt_dgLoss: 'loss',
    pt_dgWorst: 'worst case',
    pt_stIout: 'output current',
    pt_stIin: 'input current',
    pt_stVout: 'output voltage',
    pt_stLoss: 'loss',
    pt_stSrcI: 'Source current',
    pt_stSrcP: 'Source power',
    pt_stTotLoss: 'Total loss',
    pt_stEff: 'Overall efficiency',
    pt_wIout: 'current drawn from the rail (loads and the input currents of the regulators it feeds)',
    pt_wIq: 'quiescent current',
    pt_wEta: 'efficiency',
    pt_wR: 'series resistance',
    pt_wSrc: 'source voltage',
    pt_wPload: 'total power of the loads',
    pt_note: 'The steps are for the typical case, in the order of the calculation: from the loads towards the source. Not included in the model: efficiency is taken as one number although it depends on the load (the light-load efficiency of a switching regulator is much lower); no start-up or inrush current; no voltage drop in cables, connectors and traces. Loads draw a constant current and an LDO is assumed to stay in regulation. Tj = Ta + P·θJA is a rough estimate: θJA depends on the copper area of the board and on airflow.',
    pt_tblTitle: 'Regulators: typical and worst case',
    pt_cTyp: 'Typical',
    pt_cWorst: 'Worst case',
    pt_qLoss: 'Loss',
    pt_qLoadFrac: 'Loading',
    pt_qV: 'Voltage',
    pt_qI: 'Current',
    pt_qP: 'Power',
    pt_qPload: 'Load power',
    pt_qLossTot: 'Total loss',
    pt_qEff: 'Efficiency',
    pt_worstNote: 'Worst case: every load at its maximum current; an LDO at the highest input voltage (largest loss), a switching regulator or a switch at the lowest input voltage (largest input current). Loading is the output current as a share of the rated current. In the source table the worst-case values are the larger of the results at the two ends of the input-voltage range (for the efficiency, the lower).',
    pt_linksTitle: 'Open in related calculators',
    pt_lnkThermal: '{name}: junction temperature',
    pt_lnkThermalSub: 'LDO, worst case: {vin} → {vout}, {i}',
    pt_lnkDcdc: '{name}: inductor and capacitor sizing',
    pt_lnkDcdcSub: '{top}: {vin} → {vout}, {i}, efficiency {e}',
    pt_lnkBattery: 'Battery life',
    pt_lnkBatterySub: 'at the typical source current of {i}',
    pt_sources: 'Sources',
    pt_sumFrom: '← {p}',
    pt_sumMax: 'max {i}',
    pt_sumRated: 'rated {i}',
    err_pt_source: 'The nominal source voltage must be greater than zero.',
    err_pt_sourceRange: 'The source voltages must satisfy 0 < minimum ≤ nominal ≤ maximum.',
    err_pt_ambient: 'Enter a valid number for the ambient temperature.',
    err_pt_cycle: 'Loop: {names} feed each other. Change the “Fed from” choice of one of them.',
    err_pt_parent: '{name}: the rail that feeds it does not exist.',
    err_pt_rail: '{name}: the rail it is connected to does not exist.',
    err_pt_duplicate: 'Two regulators share the same id.',
    err_pt_type: '{name}: unknown regulator type.',
    err_pt_vout: '{name}: the output voltage must be greater than zero.',
    err_pt_eff: '{name}: the efficiency must be above 0 % and at most 100 %.',
    err_pt_negative: '{name}: Iq, dropout and series resistance cannot be negative; rated current and θJA must be greater than zero.',
    err_pt_load: '{name}: the typical current must be a number, zero or greater.',
    err_pt_loadMax: '{name}: the maximum current cannot be below the typical current.',
    err_pt_collapse: '{name}: the series resistance is too large for this load, the output voltage collapses. Reduce the resistance or the load behind it.',
    err_pt_range: 'The values are too large or too small to calculate.',
    warn_pt_dropout: '{name}: at the minimum input ({vin}) the input-to-output headroom is {h}, but the dropout voltage is {vdo}. The output cannot be held at {vout} (it falls out of regulation). Raise the input, choose an LDO with a lower dropout or lower the output voltage.',
    warn_pt_buckRange: '{name}: the output of a buck converter ({vout}) must be below the minimum input voltage ({vin}); it cannot regulate at that input. Use a buck-boost or narrow the input range.',
    warn_pt_boostRange: '{name}: the output of a boost converter ({vout}) must be above the maximum input voltage ({vin}); once the input exceeds it, the input passes straight through to the output. Use a buck-boost.',
    warn_pt_overRated: '{name}: the worst-case output current of {i} exceeds the rated current of {rated} ({pct} %). Choose a part with a higher rating or move some of the load to another rail.',
    warn_pt_nearRated: '{name}: the worst-case output current of {i} is {pct} % of the rated {rated}. Above 80 % little margin is left; check thermal derating of the current limit and load transients.',
    warn_pt_tjOver: '{name}: worst-case junction temperature {tj} ({p} loss × θJA {theta} + ambient {ta}), above the 125 °C limit. Reduce the loss (switching regulator, lower input voltage) or the thermal resistance (more copper area, a larger package).',
    warn_pt_tjHigh: '{name}: worst-case junction temperature {tj} ({p} loss × θJA {theta} + ambient {ta}), above 100 °C. It works, but with little margin: check that the θJA value holds for your own board.',
    warn_pt_noLoad: 'Nothing is connected to the {name} rail ({v}): no load and no regulator. A load may be missing; remove the regulator if the rail is unused.',
    warn_pt_ldoNoTheta: '{name}: the LDO dissipates {p} in the worst case and no θJA is given. More than 1 W overheats small packages (SOT-23, SOT-223); enter θJA to check the junction temperature.',
  },
};

// ---------------------------------------------------------------------------
// State. Values are kept in the units of the form: V, %, µA (Iq), mΩ, mA,
// °C/W, °C. `parent` / `rail`: −1 = the source, otherwise a regulator index.
// NaN = empty.
// ---------------------------------------------------------------------------

const NAME_MAX = 24;
const TYPE_CODE = { ldo: 'ldo', buck: 'buck', boost: 'boost', buckboost: 'bb', switch: 'sw' };
const CODE_TYPE = Object.fromEntries(Object.entries(TYPE_CODE).map(([k, v]) => [v, k]));
const isSwitcher = (type) => type === 'buck' || type === 'boost' || type === 'buckboost';
const fin = Number.isFinite;

const mkSrc = (o = {}) => ({ name: '', vnom: 5, vmin: NaN, vmax: NaN, ta: 25, ...o });
const mkReg = (o = {}) => ({ name: '', parent: -1, type: 'ldo', vout: 3.3, eff: 90, iq: NaN, vdo: NaN, r: NaN, imax: NaN, theta: NaN, ...o });
const mkLoad = (o = {}) => ({ name: '', rail: -1, ityp: 0, imax: NaN, ...o });

/** Example trees. Built on demand because a few names are translated. */
export const EXAMPLES = {
  usb: () => ({
    src: mkSrc({ name: 'USB VBUS', vnom: 5, vmin: 4.5, vmax: 5.25 }),
    regs: [mkReg({ name: 'U1', type: 'ldo', vout: 3.3, iq: 55, vdo: 0.25, imax: 600, theta: 100 })],
    loads: [
      mkLoad({ name: 'MCU', rail: 0, ityp: 45, imax: 80 }),
      mkLoad({ name: 'Wi-Fi', rail: 0, ityp: 60, imax: 180 }),
      mkLoad({ name: t('pt_exSensors'), rail: 0, ityp: 5, imax: 10 }),
    ],
  }),
  '12v': () => ({
    src: mkSrc({ name: t('pt_exAdapter'), vnom: 12, vmin: 10.8, vmax: 13.2 }),
    regs: [
      mkReg({ name: 'U1', type: 'buck', vout: 5, eff: 90, iq: 100, imax: 2000, theta: 45 }),
      mkReg({ name: 'U2', parent: 0, type: 'ldo', vout: 3.3, iq: 60, vdo: 0.3, imax: 1000, theta: 60 }),
      mkReg({ name: 'U3', parent: 0, type: 'ldo', vout: 1.8, iq: 50, vdo: 0.3, imax: 300, theta: 110 }),
    ],
    loads: [
      mkLoad({ name: 'MCU', rail: 1, ityp: 60, imax: 120 }),
      mkLoad({ name: 'Wi-Fi', rail: 1, ityp: 80, imax: 280 }),
      mkLoad({ name: t('pt_exSensors'), rail: 1, ityp: 10, imax: 20 }),
      mkLoad({ name: t('pt_exCore'), rail: 2, ityp: 120, imax: 220 }),
      mkLoad({ name: t('pt_exLeds'), rail: 0, ityp: 40, imax: 100 }),
      mkLoad({ name: t('pt_exFan'), rail: -1, ityp: 80, imax: 150 }),
    ],
  }),
  liion: () => ({
    src: mkSrc({ name: 'Li-ion', vnom: 3.7, vmin: 3.0, vmax: 4.2 }),
    regs: [mkReg({ name: 'U1', type: 'buckboost', vout: 3.3, eff: 90, iq: 30, imax: 1000 })],
    loads: [
      mkLoad({ name: 'MCU', rail: 0, ityp: 8, imax: 25 }),
      mkLoad({ name: t('pt_exRadio'), rail: 0, ityp: 6, imax: 15 }),
      mkLoad({ name: t('pt_exDisplay'), rail: 0, ityp: 12, imax: 40 }),
      mkLoad({ name: t('pt_exSensors'), rail: 0, ityp: 1, imax: 3 }),
    ],
  }),
};
const EXAMPLE_IDS = Object.keys(EXAMPLES);
const DEFAULT_EXAMPLE = '12v';

export const exampleState = (id) => (Object.hasOwn(EXAMPLES, id) ? EXAMPLES[id] : EXAMPLES[DEFAULT_EXAMPLE])();
export const defaultState = () => exampleState(DEFAULT_EXAMPLE);

/** Printable text of at most NAME_MAX characters (names are typed by the user). */
const cleanName = (s) => [...String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, '')].slice(0, NAME_MAX).join('');
const num = (x) => (fin(x) ? String(Number(x.toPrecision(6))) : '');

const regP1 = (r) => (r.type === 'ldo' ? r.iq : r.type === 'switch' ? r.r : r.eff);
const regP2 = (r) => (r.type === 'ldo' ? r.vdo : r.type === 'switch' ? NaN : r.iq);

function serialize(st) {
  const q = new URLSearchParams();
  const s = st.src;
  q.set('s', [num(s.vnom), num(s.vmin), num(s.vmax), num(s.ta), s.name].join('_'));
  for (const r of st.regs) {
    q.append('r', [r.parent + 1, TYPE_CODE[r.type], r.type === 'switch' ? '' : num(r.vout), num(regP1(r)), num(regP2(r)), num(r.imax), num(r.theta), r.name].join('_'));
  }
  for (const l of st.loads) q.append('l', [l.rail + 1, num(l.ityp), num(l.imax), l.name].join('_'));
  return q.toString();
}

/** Query string of a state: empty for the default example, ex=… for the other examples. */
export function toQuery(st) {
  const full = serialize(st);
  for (const id of EXAMPLE_IDS) {
    if (serialize(exampleState(id)) === full) return id === DEFAULT_EXAMPLE ? '' : `ex=${id}`;
  }
  return full;
}

/** Split "a_b_c_name with _" into `n` leading fields and the rest (the name). */
function fields(value, n) {
  const parts = String(value ?? '').split('_');
  return [...Array.from({ length: n }, (_, i) => parts[i] ?? ''), parts.slice(n).join('_')];
}

/** State from URL parameters. Never throws: bad or missing values fall back to defaults. */
export function fromParams(params) {
  const p = params && typeof params.getAll === 'function' ? params : new URLSearchParams();
  if (!['s', 'r', 'l'].some((k) => p.has(k))) return exampleState(p.get('ex'));

  const numOf = (s) => (String(s).trim() === '' ? NaN : parseNumber(s));
  const pos = (s, d) => { const x = numOf(s); return fin(x) && x > 0 ? x : d; };
  const nonneg = (s, d) => { const x = numOf(s); return fin(x) && x >= 0 ? x : d; };
  const any = (s, d) => { const x = numOf(s); return fin(x) ? x : d; };

  const [vnom, vmin, vmax, ta, sname] = fields(p.get('s'), 4);
  const src = mkSrc({ name: cleanName(sname).trim(), vnom: pos(vnom, 5), vmin: pos(vmin, NaN), vmax: pos(vmax, NaN), ta: any(ta, 25) });

  const rawRegs = p.getAll('r').slice(0, LIMITS.maxRegs);
  const ref = (s, self) => {
    const k = Number(s);
    return Number.isInteger(k) && k >= 1 && k <= rawRegs.length && k - 1 !== self ? k - 1 : -1;
  };
  const regs = rawRegs.map((raw, i) => {
    const [parent, code, vout, p1, p2, imax, theta, name] = fields(raw, 7);
    const type = Object.hasOwn(CODE_TYPE, code) ? CODE_TYPE[code] : 'ldo';
    const r = mkReg({ name: cleanName(name).trim(), parent: ref(parent, i), type, vout: pos(vout, 3.3), imax: pos(imax, NaN), theta: pos(theta, NaN) });
    if (type === 'ldo') { r.iq = nonneg(p1, NaN); r.vdo = nonneg(p2, NaN); }
    else if (type === 'switch') r.r = nonneg(p1, NaN);
    else { const e = numOf(p1); r.eff = e > 0 && e <= 100 ? e : 90; r.iq = nonneg(p2, NaN); }
    return r;
  });
  const loads = p.getAll('l').slice(0, LIMITS.maxLoads).map((raw) => {
    const [rail, ityp, imax, name] = fields(raw, 3);
    return mkLoad({ name: cleanName(name).trim(), rail: ref(rail, -1), ityp: nonneg(ityp, 0), imax: nonneg(imax, NaN) });
  });
  return { src, regs, loads };
}

// ---------------------------------------------------------------------------
// Names and formatting
// ---------------------------------------------------------------------------

const srcName = (st) => st.src.name.trim() || t('pt_source');
const regName = (st, i) => st.regs[i].name.trim() || `REG${i + 1}`;
const loadName = (st, i) => st.loads[i].name.trim() || `${t('pt_load')} ${i + 1}`;
const typeName = (type) => t(`pt_t_${type}`);
const typeShort = (type) => (type === 'switch' ? t('pt_ts_switch') : typeName(type));
/** `$` is special in the replacement text of t(); user text must pass through unchanged. */
const lit = (s) => String(s).replace(/\$/g, '$$$$');
const clip = (s, n) => { const a = [...String(s)]; return a.length > n ? `${a.slice(0, n - 1).join('')}…` : a.join(''); };

const V = (x, sig = 4) => si(x, 'V', sig);
const A = (x, sig = 4) => si(x, 'A', sig);
const W = (x, sig = 4) => si(x, 'W', sig);
const pct = (x, d = 1) => (fin(x) ? `${fixed(x * 100, d)} %` : '—');
const degC = (x) => (fin(x) ? `${fixed(x, 1)} °C` : '—');
const KW = (x) => `${fmt(x, 3)} °C/W`;

// ---------------------------------------------------------------------------
// Compute
// ---------------------------------------------------------------------------

/** The engine's input (SI units, ids r0, r1, …) for a page state. */
export function toTree(st) {
  const id = (k) => (k < 0 ? SOURCE : `r${k}`);
  return {
    source: { name: srcName(st), vNomV: st.src.vnom, vMinV: st.src.vmin, vMaxV: st.src.vmax, ambientC: st.src.ta },
    regs: st.regs.map((r, i) => {
      const o = { id: id(i), name: regName(st, i), parent: id(r.parent), type: r.type, iRatedA: r.imax * 1e-3, thetaJA: r.theta };
      if (r.type === 'switch') o.rSeriesOhm = r.r * 1e-3;
      else {
        o.voutV = r.vout;
        o.iqA = r.iq * 1e-6;
        if (r.type === 'ldo') o.dropoutV = r.vdo; else o.eff = r.eff / 100;
      }
      return o;
    }),
    loads: st.loads.map((l, i) => ({ name: loadName(st, i), rail: id(l.rail), iTypA: l.ityp * 1e-3, iMaxA: l.imax * 1e-3 })),
  };
}

const analyze = (st) => analyzePowerTree(toTree(st));

// ---------------------------------------------------------------------------
// Drawing: an indented tree. Every node has its own row, each level is shifted
// to the right, so the width stays fixed and the height grows with the tree.
// All geometry is computed from the tree only (never from label text), so it
// is identical in both languages.
// ---------------------------------------------------------------------------

const DG = { x0: 10, trunk: 12, bw: 128, bh: 34, lw: 104, lh: 18, note: 100, pitch: 74, minPitch: 18, wMin: 440, wMax: 600, top: 26, rowReg: 46, rowLoad: 26 };
const r1 = (x) => Math.round(x * 10) / 10;

/**
 * SVG of the tree for an analysis result of analyzePowerTree() (typical case):
 * the source, regulators as blocks (name, type, output voltage), loads as
 * leaves, the current on every arrow, loss and efficiency beside every
 * regulator; the regulator with the largest loss is highlighted.
 */
export function drawTree(r) {
  if (!r?.ok) return '';
  const rows = [{ kind: 'src', depth: 0, parent: -1 }];
  const add = (kind, i, depth, parent) => rows.push({ kind, i, depth, parent }) - 1;
  const walk = (k, depth, parent) => {
    const row = add('reg', k, depth, parent);
    for (const li of r.regs[k].loadIdx) add('load', li, depth + 1, row);
    for (const c of r.regs[k].children) walk(c, depth + 1, row);
  };
  for (const li of r.source.loadIdx) add('load', li, 1, 0);
  for (const k of r.source.children) walk(k, 1, 0);

  // Horizontal: one pitch per level, squeezed when the tree is deep.
  const maxDepth = rows.reduce((a, row) => Math.max(a, row.depth), 1);
  const fixedW = DG.x0 + DG.bw + 8 + DG.note;
  let width = Math.min(DG.wMax, Math.max(DG.wMin, fixedW + maxDepth * DG.pitch));
  let pitch = Math.min(DG.pitch, (width - fixedW) / maxDepth);
  if (pitch < DG.minPitch) { pitch = DG.minPitch; width = fixedW + maxDepth * pitch; }
  // The current is written on the arrow when it is long enough, otherwise above the block.
  const onArrow = pitch - DG.trunk >= 54;
  const extra = onArrow ? 0 : 13;

  // Vertical: one row per node.
  let y = DG.top;
  for (const row of rows) {
    const h = row.kind === 'load' ? DG.rowLoad : DG.rowReg;
    const pad = row.kind === 'src' ? 0 : extra;
    row.x = DG.x0 + row.depth * pitch;
    row.cy = y + pad + h / 2;
    row.half = (row.kind === 'load' ? DG.lh : DG.bh) / 2;
    y += pad + h;
  }
  const height = y + 6;

  const T = r.totals;
  let b = text(4, 14, t('pt_dgCaption'), { cls: 'title', anchor: 'start' });

  // Rails: a trunk down from every parent, an arrow into every child.
  const last = new Map();
  rows.forEach((row) => { if (row.parent >= 0) last.set(row.parent, row.cy); });
  for (const [pi, yEnd] of last) {
    const p = rows[pi];
    b += path(`M${r1(p.x + DG.trunk)},${r1(p.cy + p.half)}V${r1(yEnd)}`, 'wire');
  }
  for (const row of rows) {
    if (row.parent < 0) continue;
    const xt = rows[row.parent].x + DG.trunk;
    const iA = row.kind === 'load' ? r.loads[row.i].typ.iA : r.regs[row.i].typ.iinA;
    b += arrow(xt, row.cy, row.x, row.cy, { cls: 'wire', headCls: 'arrow' });
    b += onArrow
      ? text((xt + row.x - 5) / 2, row.cy - 5, A(iA, 3), { cls: 'val', size: 11 })
      : text(row.x + 2, row.cy - row.half - 4, A(iA, 3), { cls: 'val', anchor: 'start', size: 11 });
  }

  // Nodes.
  for (const row of rows) {
    const { x, cy } = row;
    const xn = x + DG.bw + 8;
    if (row.kind === 'load') {
      const l = r.loads[row.i];
      b += rect(x, cy - DG.lh / 2, DG.lw, DG.lh, 'soft', ' rx="9"')
        + text(x + DG.lw / 2, cy + 4, clip(l.name, 14), { cls: 'name', size: 11 })
        + text(x + DG.lw + 8, cy + 4, W(l.typ.pW, 3), { cls: 'lbl', anchor: 'start' });
      continue;
    }
    if (row.kind === 'src') {
      b += rect(x, cy - DG.bh / 2, DG.bw, DG.bh, 'comp', ' rx="4"')
        + text(x + DG.bw / 2, cy - 3, clip(r.source.name, 15), { cls: 'name' })
        + text(x + DG.bw / 2, cy + 11, V(T.typ.sourceV), { cls: 'lbl' })
        + text(xn, cy - 3, `${A(T.typ.sourceA, 3)} · ${W(T.typ.sourceW, 3)}`, { cls: 'val', anchor: 'start', size: 11 })
        + text(xn, cy + 11, `${t('pt_dgWorst')} ${A(T.worst.sourceA, 3)}`, { cls: 'lbl', anchor: 'start' });
      continue;
    }
    const g = r.regs[row.i];
    const hot = g.id === T.maxLossId;
    b += rect(x, cy - DG.bh / 2, DG.bw, DG.bh, hot ? 'comp hi' : 'comp', ' rx="4"')
      + text(x + DG.bw / 2, cy - 3, clip(g.name, 15), { cls: 'name' })
      + text(x + DG.bw / 2, cy + 11, `${typeShort(g.type)} · ${V(g.typ.voutV, 3)}`, { cls: 'lbl' })
      + text(xn, cy - 3, `${t('pt_dgLoss')} ${W(g.typ.lossW, 3)}`, { cls: hot ? 'val' : 'name', anchor: 'start', size: 11 })
      + text(xn, cy + 11, `η ${pct(g.typ.eff)}`, { cls: 'lbl', anchor: 'start' });
  }
  return svg(r1(width), r1(height), b, t('pt_dgAria'), { wide: true });
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

function msgList(kind, texts) {
  if (!texts.length) return '';
  return `<ul class="msg ${kind}">${texts.map((s) => `<li>${icon('alert', 16)}<span>${esc(s)}</span></li>`).join('')}</ul>`;
}

/** Messages of a failed analysis (st gives the names of the loads). */
function errorTexts(res, st) {
  const reg = (id) => { const k = Number(String(id).slice(1)); return st.regs[k] ? regName(st, k) : String(id); };
  return res.errors.map((e) => {
    if (e.code === 'cycle') return t('err_pt_cycle', { names: lit(e.ids.map(reg).join(' → ')) });
    if (e.index !== undefined) return t(`err_pt_${e.code}`, { name: lit(st.loads[e.index] ? loadName(st, e.index) : e.index) });
    return t(`err_pt_${e.code}`, e.id !== undefined ? { name: lit(reg(e.id)) } : undefined);
  });
}

function errorHtml(res, st) {
  return `<p class="msg-empty">${icon('alert', 18)} ${esc(t('inputsInvalid'))}</p>${msgList('error', errorTexts(res, st))}`;
}

function warningTexts(r) {
  const byId = new Map(r.regs.map((g) => [g.id, g]));
  return r.warnings.map((w) => {
    const name = lit(byId.get(w.id)?.name ?? '');
    const key = `warn_pt_${w.code}`;
    switch (w.code) {
      case 'dropout': return t(key, { vin: V(w.vinV), h: V(w.headroomV), vdo: V(w.dropoutV), vout: V(w.voutV), name });
      case 'buckRange': case 'boostRange': return t(key, { vin: V(w.vinV), vout: V(w.voutV), name });
      case 'overRated': case 'nearRated': return t(key, { i: A(w.ioutA), rated: A(w.iRatedA), pct: fixed(w.frac * 100, 0), name });
      case 'tjOver': case 'tjHigh': return t(key, { tj: degC(w.tjC), p: W(w.lossW), theta: KW(w.thetaJA), ta: degC(w.ambientC), name });
      case 'noLoad': return t(key, { v: V(w.voutV), name });
      default: return t(key, { p: W(w.lossW), name });
    }
  });
}

/**
 * The worked calculation of the typical case, from the loads to the source.
 * Currents carry five digits here, so a small quiescent current still shows
 * in the sum (120 mA + 50 µA = 120.05 mA).
 */
function stepsBlock(r) {
  const items = [];
  const I = (x) => tx(A(x, 5));
  const sum = (terms) => (terms.length >= 2 && terms.length <= 6 ? terms.map(I).join(' + ') : undefined);
  const used = new Set();
  for (let j = r.order.length - 1; j >= 0; j--) {
    const g = r.regs[r.order[j]];
    const p = g.typ;
    const terms = [...g.loadIdx.map((i) => r.loads[i].typ.iA), ...g.children.map((c) => r.regs[c].typ.iinA)];
    const label = (key) => `${g.name} (${typeShort(g.type)}) · ${t(key)}`;
    const vin = tx(V(p.vinV));
    const vout = tx(V(p.voutV));
    const iout = I(p.ioutA);
    const iin = I(p.iinA);
    const iq = I(g.iqA);
    // The quiescent-current term is written only when a value was given.
    const hasIq = g.iqA > 0;
    if (hasIq) used.add('iq');
    if (terms.length >= 2) items.push({ labelRaw: label('pt_stIout'), sym: 'I_{out}', num: sum(terms), res: iout });
    used.add('iout');
    if (g.type === 'ldo') {
      items.push({ labelRaw: label('pt_stIin'), sym: `I_{in} = I_{out}${hasIq ? ' + I_{q}' : ''}`, num: hasIq ? `${iout} + ${iq}` : undefined, res: iin });
      items.push({ labelRaw: label('pt_stLoss'), sym: `P_{loss} = (V_{in} − V_{out}) \\cdot I_{out}${hasIq ? ' + V_{in} \\cdot I_{q}' : ''}`,
        num: `(${vin} − ${vout}) \\cdot ${iout}${hasIq ? ` + ${vin} \\cdot ${iq}` : ''}`, res: tx(W(p.lossW)) });
    } else if (g.type === 'switch') {
      const res = tx(si(g.rSeriesOhm, 'Ω'));
      if (g.rSeriesOhm > 0) {
        used.add('r');
        items.push({ labelRaw: label('pt_stVout'), sym: 'V_{out} = V_{in} − I_{out} \\cdot R', num: `${vin} − ${iout} \\cdot ${res}`, res: vout });
        items.push({ labelRaw: label('pt_stLoss'), sym: 'P_{loss} = I_{out}^{2} \\cdot R', num: `(${iout})^{2} \\cdot ${res}`, res: tx(W(p.lossW)) });
      } else {
        items.push({ labelRaw: label('pt_stIin'), sym: 'I_{in} = I_{out}', res: iout });
      }
    } else {
      used.add('eta');
      items.push({ labelRaw: label('pt_stIin'), sym: `I_{in} = \\frac{V_{out} \\cdot I_{out}}{η \\cdot V_{in}}${hasIq ? ' + I_{q}' : ''}`,
        num: `\\frac{${vout} \\cdot ${iout}}{${tx(fmt(g.eff, 3))} \\cdot ${vin}}${hasIq ? ` + ${iq}` : ''}`, res: iin });
      items.push({ labelRaw: label('pt_stLoss'), sym: 'P_{loss} = V_{in} \\cdot I_{in} − V_{out} \\cdot I_{out}',
        num: `${vin} \\cdot ${iin} − ${vout} \\cdot ${iout}`, res: tx(W(p.lossW)) });
    }
  }
  const T = r.totals.typ;
  const top = [...r.source.loadIdx.map((i) => r.loads[i].typ.iA), ...r.source.children.map((k) => r.regs[k].typ.iinA)];
  items.push({ label: 'pt_stSrcI', sym: 'I_{src}', num: sum(top), res: I(T.sourceA) });
  items.push({ label: 'pt_stSrcP', sym: 'P_{src} = V_{src} \\cdot I_{src}', num: `${tx(V(T.sourceV))} \\cdot ${I(T.sourceA)}`, res: tx(W(T.sourceW)) });
  items.push({ label: 'pt_stTotLoss', sym: 'P_{loss} = P_{src} − P_{load}', num: `${tx(W(T.sourceW))} − ${tx(W(T.loadW))}`, res: tx(W(T.lossW)) });
  if (fin(T.eff)) {
    items.push({ label: 'pt_stEff', sym: 'η = \\frac{P_{load}}{P_{src}}', num: `\\frac{${tx(W(T.loadW))}}{${tx(W(T.sourceW))}}`, res: tx(pct(T.eff)) });
  }
  return steps(items, {
    note: 'pt_note',
    where: [
      used.has('iout') && ['I_{out}', 'pt_wIout'],
      used.has('iq') && ['I_{q}', 'pt_wIq'],
      used.has('eta') && ['η', 'pt_wEta'],
      used.has('r') && ['R', 'pt_wR'],
      ['V_{src}', 'pt_wSrc'],
      ['P_{load}', 'pt_wPload'],
    ],
  });
}

const bad = (s, on) => (on ? `<span style="color:var(--err-fg)">${s}</span>` : s);
const sub = (sym, s) => `${sym}<sub>${s}</sub>`;

/** One small table per regulator (typical / worst case), then the source. */
function detailTables(r) {
  const table = (head, body) => `<div class="table-scroll"><table class="grid">
    <thead><tr><th scope="col" style="text-align:left;white-space:normal">${head}</th><th scope="col">${esc(t('pt_cTyp'))}</th><th scope="col">${esc(t('pt_cWorst'))}</th></tr></thead>
    <tbody>${body.filter(Boolean).map(([label, a, c]) => `<tr><th scope="row">${label}</th><td>${a}</td><td>${c}</td></tr>`).join('')}</tbody></table></div>`;
  const regs = r.order.map((k) => {
    const g = r.regs[k];
    const [a, w] = [g.typ, g.worst];
    const vout = g.type === 'switch' ? '' : ` · ${esc(V(g.voutSetV))}`;
    return table(`${esc(g.name)} <span class="badge">${esc(typeShort(g.type))}${vout}</span>`, [
      [sub('V', 'in'), esc(V(a.vinV)), esc(V(w.vinV))],
      g.type === 'switch' && [sub('V', 'out'), esc(V(a.voutV)), esc(V(w.voutV))],
      [sub('I', 'out'), esc(A(a.ioutA)), esc(A(w.ioutA))],
      [sub('P', 'out'), esc(W(a.poutW)), esc(W(w.poutW))],
      [sub('I', 'in'), esc(A(a.iinA)), esc(A(w.iinA))],
      [sub('P', 'in'), esc(W(a.pinW)), esc(W(w.pinW))],
      [esc(t('pt_qLoss')), esc(W(a.lossW)), esc(W(w.lossW))],
      ['η', esc(pct(a.eff)), esc(pct(w.eff))],
      fin(g.iRatedA) && [esc(`${t('pt_qLoadFrac')} (${A(g.iRatedA)})`), bad(esc(pct(a.loadFrac, 0)), a.loadFrac > 1), bad(esc(pct(w.loadFrac, 0)), w.loadFrac > 1)],
      fin(g.thetaJA) && [sub('T', 'j'), bad(esc(degC(a.tjC)), a.tjC > LIMITS.tjMaxC), bad(esc(degC(w.tjC)), w.tjC > LIMITS.tjMaxC)],
    ]);
  });
  const T = r.totals;
  const range = r.source.vMinV === r.source.vMaxV ? V(r.source.vNomV) : `${fmt(r.source.vMinV, 4)} … ${V(r.source.vMaxV)}`;
  const source = table(`${esc(r.source.name)} <span class="badge">${esc(t('pt_source'))}</span>`, [
    [esc(t('pt_qV')), esc(V(T.typ.sourceV)), esc(range)],
    [esc(t('pt_qI')), esc(A(T.typ.sourceA)), esc(A(T.worst.sourceA))],
    [esc(t('pt_qP')), esc(W(T.typ.sourceW)), esc(W(T.worst.sourceW))],
    [esc(t('pt_qPload')), esc(W(T.typ.loadW)), esc(W(Math.max(T.lo.loadW, T.hi.loadW)))],
    [esc(t('pt_qLossTot')), esc(W(T.typ.lossW)), esc(W(T.worst.lossW))],
    [esc(t('pt_qEff')), esc(pct(T.typ.eff)), esc(pct(T.worst.eff))],
  ]);
  return block('pt_tblTitle', `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr));gap:12px;align-items:start">${regs.join('')}${source}</div>
    <p class="note">${esc(t('pt_worstNote'))}</p>`);
}

const urlNum = (x) => String(Number(x.toPrecision(4)));

/**
 * Links that open other calculators with this tree's numbers:
 * [{ tool, query, icon, title, sub }]. The parameter names are the field keys
 * of those pages (thermal: ps, vin, vout, io, iq [mA], ja, ta · dcdc: top, vin,
 * vout, iout, eff · battery: isl, iact with their units, ib/tb/pb cleared).
 */
export function relatedLinks(r) {
  if (!r?.ok) return [];
  const out = [];
  for (const k of r.order) {
    const g = r.regs[k];
    const w = g.worst;
    const name = lit(g.name);
    if (g.type === 'ldo' && w.ioutA > 0 && w.vinV > g.voutSetV) {
      const q = { ps: 'ldo', vin: urlNum(w.vinV), vout: urlNum(g.voutSetV), io: urlNum(w.ioutA), iq: urlNum(g.iqA * 1e3) };
      if (fin(g.thetaJA)) q.ja = urlNum(g.thetaJA);
      q.ta = urlNum(r.source.ambientC);
      out.push({ tool: 'thermal', query: new URLSearchParams(q).toString(), icon: 'thermo',
        title: t('pt_lnkThermal', { name }), sub: t('pt_lnkThermalSub', { vin: V(w.vinV), vout: V(g.voutSetV), i: A(w.ioutA) }) });
    }
    // The DC-DC page sizes a buck at the highest input and a boost at the lowest.
    const vin = g.type === 'buck' ? g.hi.vinV : g.lo.vinV;
    const fits = g.type === 'buck' ? vin > g.voutSetV : g.type === 'boost' && vin < g.voutSetV;
    if (fits && w.ioutA > 0) {
      const q = { top: g.type, vin: urlNum(vin), vout: urlNum(g.voutSetV), iout: urlNum(w.ioutA), eff: urlNum(g.eff * 100) };
      out.push({ tool: 'dcdc', query: new URLSearchParams(q).toString(), icon: 'dcdc',
        title: t('pt_lnkDcdc', { name }), sub: t('pt_lnkDcdcSub', { top: typeName(g.type), vin: V(vin), vout: V(g.voutSetV), i: A(w.ioutA), e: pct(g.eff, 0) }) });
    }
  }
  const iA = r.totals.typ.sourceA;
  if (iA > 0) {
    // A constant current: sleep and active current are the same, no extra event.
    const [unit, k] = iA >= 1e-3 ? ['mA', 1e3] : ['uA', 1e6];
    const q = { isl: urlNum(iA * k), isl_u: unit, iact: urlNum(iA * k), iact_u: unit, ib: '', tb: '', pb: '' };
    out.push({ tool: 'battery', query: new URLSearchParams(q).toString(), icon: 'battery',
      title: t('pt_lnkBattery'), sub: t('pt_lnkBatterySub', { i: A(iA) }) });
  }
  return out;
}

function linksBlock(r) {
  const links = relatedLinks(r);
  if (!links.length) return '';
  return block('pt_linksTitle', links.map((l) => `<p class="if-open"><a class="btn ghost" href="#/${l.tool}?${esc(l.query)}">${icon(l.icon, 16)}<span>${esc(l.title)}<small>${esc(l.sub)}</small></span></a></p>`).join(''));
}

const REFS = [
  'Erickson & Maksimović, Fundamentals of Power Electronics, 3rd ed. (Springer, 2020), ch. 3: losses and efficiency',
  'Horowitz & Hill, The Art of Electronics, 3rd ed. (Cambridge University Press, 2015), ch. 9: voltage regulation and power conversion',
  'JEDEC JESD51-2A (θJA, natural convection)',
];

/** Result card: `top` goes above the drawing, `rest` below it. */
function render(r, st) {
  if (!r.ok) return errorHtml(r, st);
  const T = r.totals;
  const eff = fin(T.typ.eff) ? `${fixed(T.typ.eff * 100, 1)} <span class="u">%</span>` : '—';
  const main = heroes([
    ['pt_hIsrc', siHtml(T.typ.sourceA, 'A'), esc(t('pt_subTyp', { v: V(T.typ.sourceV), p: W(T.typ.sourceW) }))],
    ['pt_hIworst', siHtml(T.worst.sourceA, 'A'), esc(t('pt_subWorst', { v: V(T.worst.sourceAtV), p: W(T.worst.sourceW) }))],
    ['pt_hLoss', siHtml(T.typ.lossW, 'W'), esc(t('pt_subLoss', { p: W(T.worst.lossW) }))],
    ['pt_hEff', eff, esc(t('pt_subEff', { load: W(T.typ.loadW), e: pct(T.worst.eff) }))],
  ]);
  return {
    top: main + msgList('warn', warningTexts(r)),
    rest: stepsBlock(r) + detailTables(r) + linksBlock(r)
      + block('pt_sources', `<p class="refs" style="margin-top:0">${REFS.map(esc).join(' · ')}</p>`),
  };
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

// The rows are denser than the standard fields, so their sizes are set inline;
// the classes (input-group, unit, field > select, copy-btn, presets, chip) come
// from app.css. Grids use auto-fit, so they reflow on a phone without a media query.
const CSS = {
  lbl: 'display:block;font-size:11.5px;font-weight:560;color:var(--muted);margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis',
  inp: 'height:34px;padding:0 7px;font-size:14px',
  cell: 'height:34px;padding:0 6px;font-size:14px',
  unit: 'height:34px;min-width:0;padding:0 6px;font-size:12px',
  sel: 'height:34px;padding:0 4px;font-size:14px',
  card: 'border:1px solid var(--border);border-left:4px solid var(--cu);border-radius:10px;padding:8px 8px 9px 10px;margin-bottom:8px',
  grid: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(92px,1fr));gap:6px',
  th: 'font:600 11.5px/1.2 system-ui,sans-serif;color:var(--muted);text-align:left;vertical-align:bottom;padding:0 3px 2px',
};
const TEXT_IN = 'type="text" autocomplete="off" spellcheck="false"';

/** Compact labelled input for a regulator card. */
function mini(key, label, value, unit, aria, extra = '') {
  return `<div style="min-width:0"><label for="pt-${key}" style="${CSS.lbl}">${esc(label)}</label>
    <div class="input-group"><input id="pt-${key}" data-k="${key}" ${TEXT_IN} ${extra || 'inputmode="decimal"'} style="${CSS.inp}" value="${esc(value)}" aria-label="${esc(aria)}">${unit ? `<span class="unit unit-static" style="${CSS.unit}">${esc(unit)}</span>` : ''}</div></div>`;
}

function miniSelect(key, label, options, current, aria, style = '') {
  return `<div class="field" style="margin:0;min-width:0;${style}">${label ? `<label for="pt-${key}" style="${CSS.lbl}">${esc(label)}</label>` : ''}
    <select id="pt-${key}" data-k="${key}" style="${CSS.sel}" aria-label="${esc(aria)}">${options.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(current) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
}

function field(key, label, value, unit, { text: isText = false, placeholder = '' } = {}) {
  return `<div class="field"><div class="label-row"><label for="pt-${key}">${esc(t(label))}</label></div>
    <div class="input-group"><input id="pt-${key}" data-k="${key}" ${TEXT_IN} ${isText ? `maxlength="${NAME_MAX}"` : 'inputmode="decimal"'} value="${esc(value)}"${placeholder ? ` placeholder="${esc(placeholder)}"` : ''}>${unit ? `<span class="unit unit-static">${esc(unit)}</span>` : ''}</div></div>`;
}

/** Rails a regulator or load can hang on: the source and every regulator (except `self`). */
const railOptions = (st, self = -1) => [[-1, srcName(st)], ...st.regs.map((_, i) => [i, regName(st, i)]).filter(([i]) => i !== self)];

function regCard(st, i) {
  const r = st.regs[i];
  const name = regName(st, i);
  const aria = (key) => t('pt_aField', { field: lit(t(key)), name: lit(name) });
  const cells = [miniSelect(`r-${i}-parent`, t('pt_parent'), railOptions(st, i), r.parent, aria('pt_parent'))];
  if (r.type !== 'switch') cells.push(mini(`r-${i}-vout`, t('pt_vout'), num(r.vout), 'V', aria('pt_vout')));
  if (r.type === 'ldo') {
    cells.push(mini(`r-${i}-iq`, t('pt_iq'), num(r.iq), 'µA', aria('pt_iq')), mini(`r-${i}-vdo`, t('pt_vdo'), num(r.vdo), 'V', aria('pt_vdo')));
  } else if (r.type === 'switch') {
    cells.push(mini(`r-${i}-r`, t('pt_rser'), num(r.r), 'mΩ', aria('pt_rser')));
  } else {
    cells.push(mini(`r-${i}-eff`, t('pt_eff'), num(r.eff), '%', aria('pt_eff')), mini(`r-${i}-iq`, t('pt_iq'), num(r.iq), 'µA', aria('pt_iq')));
  }
  cells.push(mini(`r-${i}-imax`, t('pt_irated'), num(r.imax), 'mA', aria('pt_irated')), mini(`r-${i}-theta`, t('pt_theta'), num(r.theta), '°C/W', aria('pt_theta')));
  const del = t('pt_delReg', { name: lit(name) });
  return `<div style="${CSS.card}">
    <div style="display:flex;gap:6px;align-items:flex-end;margin-bottom:6px">
      <div style="flex:1 1 0;min-width:0">${mini(`r-${i}-name`, t('pt_name'), r.name, '', t('pt_aRegName', { n: i + 1 }), `maxlength="${NAME_MAX}"`)}</div>
      ${miniSelect(`r-${i}-type`, t('pt_type'), REG_TYPES.map((x) => [x, typeName(x)]), r.type, aria('pt_type'), 'flex:0 1 132px')}
      <button type="button" class="copy-btn" data-del-reg="${i}" title="${esc(del)}" aria-label="${esc(del)}">${icon('trash', 16)}</button>
    </div>
    <div style="${CSS.grid}">${cells.join('')}</div>
  </div>`;
}

function loadRow(st, i) {
  const l = st.loads[i];
  const name = loadName(st, i);
  const aria = (key) => t('pt_aField', { field: lit(t(key)), name: lit(name) });
  const cell = (key, value, label, extra) => `<td style="padding:0 2px"><div class="input-group"><input data-k="${key}" ${TEXT_IN} ${extra} style="${CSS.cell}" value="${esc(value)}" aria-label="${esc(label)}"></div></td>`;
  const del = t('pt_delLoad', { name: lit(name) });
  return `<tr>
    ${cell(`l-${i}-name`, l.name, t('pt_aLoadName', { n: i + 1 }), `maxlength="${NAME_MAX}"`)}
    <td style="padding:0 2px">${miniSelect(`l-${i}-rail`, '', railOptions(st), l.rail, aria('pt_aLoadRail'))}</td>
    ${cell(`l-${i}-ityp`, num(l.ityp), aria('pt_aLoadTyp'), 'inputmode="decimal"')}
    ${cell(`l-${i}-imax`, num(l.imax), aria('pt_aLoadMax'), `inputmode="decimal" placeholder="${esc(num(l.ityp))}"`)}
    <td style="padding:0;text-align:center"><button type="button" class="copy-btn" data-del-load="${i}" title="${esc(del)}" aria-label="${esc(del)}">${icon('x', 15)}</button></td>
  </tr>`;
}

function addButton(kind, labelKey, count, max) {
  const full = count >= max;
  return `<div class="presets"><button type="button" class="btn ghost" data-add="${kind}"${full ? ' disabled style="opacity:.5;cursor:not-allowed"' : ''}>+ ${esc(t(labelKey))}</button>
    <span style="align-self:center;color:var(--faint);font-size:12.5px">${count} / ${max}</span></div>`;
}

/** The whole form for a state (exported so the escaping of names can be tested). */
export function formHtml(st) {
  const s = st.src;
  const loads = st.loads.length
    ? `<div style="overflow-x:auto"><table style="width:100%;table-layout:fixed;border-collapse:separate;border-spacing:0 4px">
        <colgroup><col style="width:31%"><col style="width:25%"><col style="width:17%"><col style="width:17%"><col style="width:10%"></colgroup>
        <thead><tr>${['pt_colLoad', 'pt_colRail', 'pt_colTyp', 'pt_colMax'].map((k) => `<th scope="col" style="${CSS.th}">${esc(t(k))}</th>`).join('')}<th scope="col"><span class="sr">${esc(t('saved_delete'))}</span></th></tr></thead>
        <tbody>${st.loads.map((_, i) => loadRow(st, i)).join('')}</tbody></table></div>`
    : `<p class="note" style="margin:0 0 8px">${esc(t('pt_noLoads'))}</p>`;
  return `
    <div class="field" style="margin:14px 0 0"><small class="hint" style="margin:0">${esc(t('pt_examples'))}</small>
      <div class="presets" role="group" aria-label="${esc(t('pt_examples'))}">${EXAMPLE_IDS.map((id) => `<button type="button" class="chip" data-ex="${id}">${esc(t(`pt_ex_${id}`))}</button>`).join('')}</div></div>
    <fieldset class="section"><legend>${esc(t('pt_secSource'))}</legend>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:0 10px">
        ${field('s-name', 'pt_name', s.name, '', { text: true, placeholder: t('pt_source') })}
        ${field('s-vnom', 'pt_vnom', num(s.vnom), 'V')}
        ${field('s-vmin', 'pt_vmin', num(s.vmin), 'V', { placeholder: num(s.vnom) })}
        ${field('s-vmax', 'pt_vmax', num(s.vmax), 'V', { placeholder: num(s.vnom) })}
        ${field('s-ta', 'pt_ta', num(s.ta), '°C')}
      </div>
      <small class="hint" style="margin-top:0">${esc(t('pt_srcHint'))}</small>
    </fieldset>
    <fieldset class="section"><legend>${esc(t('pt_secRegs'))}</legend>
      ${st.regs.length ? st.regs.map((_, i) => regCard(st, i)).join('') : `<p class="note" style="margin:0 0 8px">${esc(t('pt_noRegs'))}</p>`}
      ${addButton('reg', 'pt_addReg', st.regs.length, LIMITS.maxRegs)}
    </fieldset>
    <fieldset class="section"><legend>${esc(t('pt_secLoads'))}</legend>
      ${loads}
      ${addButton('load', 'pt_addLoad', st.loads.length, LIMITS.maxLoads)}
      <p class="note">${esc(t('pt_formNote'))}</p>
    </fieldset>`;
}

// Validity of one typed value. Empty is fine for the optional ones.
const RULES = {
  src: { vnom: 'pos', vmin: 'optPos', vmax: 'optPos', ta: 'any' },
  reg: { vout: 'pos', eff: 'eff', iq: 'optNonneg', vdo: 'optNonneg', r: 'optNonneg', imax: 'optPos', theta: 'optPos' },
  load: { ityp: 'nonneg', imax: 'optNonneg' },
};
function invalidValue(rule, textValue, x) {
  if (String(textValue).trim() === '') return !rule.startsWith('opt');
  if (!fin(x)) return true;
  switch (rule) {
    case 'pos': case 'optPos': return !(x > 0);
    case 'nonneg': case 'optNonneg': return x < 0;
    case 'eff': return !(x > 0 && x <= 100);
    default: return false;
  }
}

// ---------------------------------------------------------------------------
// Mount
// ---------------------------------------------------------------------------

async function copyText(s) {
  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = s;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* ignore */ }
    ta.remove();
    return ok;
  }
}

/** Plain-text inputs and results for pasting into design notes. */
export function summary(st, r, href = '') {
  const out = [`${t('appName')} — ${t('tool_powertree')}`, href, '', `${t('summaryInputs')}:`];
  const s = st.src;
  const range = fin(s.vmin) || fin(s.vmax) ? ` (${fmt(fin(s.vmin) ? s.vmin : s.vnom)} … ${fmt(fin(s.vmax) ? s.vmax : s.vnom)} V)` : '';
  out.push(`  ${t('pt_source')}: ${srcName(st)} · ${fmt(s.vnom)} V${range} · ${t('pt_ta')} ${fmt(s.ta)} °C`);
  const rail = (k) => (k < 0 || !st.regs[k] ? srcName(st) : regName(st, k));
  st.regs.forEach((g, i) => {
    const parts = [g.type === 'switch' ? '' : `${fmt(g.vout)} V`,
      isSwitcher(g.type) ? `η ${fmt(g.eff)} %` : '',
      g.type !== 'switch' && fin(g.iq) ? `Iq ${fmt(g.iq)} µA` : '',
      g.type === 'ldo' && fin(g.vdo) ? `${t('pt_vdo')} ${fmt(g.vdo)} V` : '',
      g.type === 'switch' && fin(g.r) ? `R ${fmt(g.r)} mΩ` : '',
      fin(g.imax) ? t('pt_sumRated', { i: `${fmt(g.imax)} mA` }) : '',
      fin(g.theta) ? `θJA ${fmt(g.theta)} °C/W` : ''].filter(Boolean);
    out.push(`  ${regName(st, i)} [${typeName(g.type)}] ${t('pt_sumFrom', { p: lit(rail(g.parent)) })}: ${parts.join(' · ')}`);
  });
  st.loads.forEach((l, i) => {
    out.push(`  ${loadName(st, i)} ${t('pt_sumFrom', { p: lit(rail(l.rail)) })}: ${fmt(l.ityp)} mA${fin(l.imax) ? ` (${t('pt_sumMax', { i: `${fmt(l.imax)} mA` })})` : ''}`);
  });
  out.push('', `${t('summaryResults')}:`);
  if (!r?.ok) return out.join('\n');
  const T = r.totals;
  out.push(`  ${t('pt_hIsrc')}: ${A(T.typ.sourceA)} (${V(T.typ.sourceV)}, ${W(T.typ.sourceW)})`,
    `  ${t('pt_hIworst')}: ${A(T.worst.sourceA)} (${V(T.worst.sourceAtV)}; ${W(T.worst.sourceW)})`,
    `  ${t('pt_hLoss')}: ${W(T.typ.lossW)} (${t('pt_dgWorst')}: ${W(T.worst.lossW)})`,
    `  ${t('pt_hEff')}: ${pct(T.typ.eff)} (${t('pt_dgWorst')}: ${pct(T.worst.eff)})`);
  for (const k of r.order) {
    const g = r.regs[k];
    const line = (p) => `Vin ${V(p.vinV)}, Iout ${A(p.ioutA)}, Iin ${A(p.iinA)}, ${t('pt_qLoss')} ${W(p.lossW)}, η ${pct(p.eff)}${fin(p.tjC) ? `, Tj ${degC(p.tjC)}` : ''}`;
    const head = `  ${g.name} [${typeShort(g.type)}]`;
    out.push(`${head} ${t('pt_cTyp')}: ${line(g.typ)}`, `${head} ${t('pt_cWorst')}: ${line(g.worst)}`);
  }
  return out.join('\n');
}

function actionButton(action, iconName, labelKey, titleKey) {
  return `<button type="button" class="btn ghost" data-action="${action}" title="${esc(t(titleKey))}">${icon(iconName, 16)}<span class="btn-label">${esc(t(labelKey))}</span></button>`;
}

function mount(root, params, page) {
  let st = fromParams(params);
  root.innerHTML = `
    <header class="page-head">
      <div class="page-title">
        <h1>${esc(t('tool_powertree'))}</h1>
        <p class="lead">${esc(t('pt_intro'))}</p>
        ${page.related?.length ? `<p class="related">${icon('book', 15)}<span>${esc(t('learn_related'))}</span> ${page.related
          .map((l) => `<a href="#/learn/${l.id}">${esc(l.title)}</a>`).join(' · ')}</p>` : ''}
      </div>
      <div class="page-actions" role="toolbar" aria-label="${esc(t('results'))}">
        ${actionButton('copy-link', 'link', 'copyLink', 'copyLinkTitle')}
        ${actionButton('copy-summary', 'copy', 'copySummary', 'copySummaryTitle')}
        ${actionButton('print', 'print', 'print', 'printTitle')}
        ${actionButton('reset', 'reset', 'reset', 'resetTitle')}
      </div>
    </header>
    <div class="print-meta"></div>
    <div class="calc">
      <form class="card form" novalidate autocomplete="off" aria-label="${esc(t('inputs'))}"></form>
      <section class="card result" id="result" aria-live="polite" aria-label="${esc(t('results'))}"></section>
    </div>
    <a class="peek" href="#result" hidden><span class="peek-label"></span><span class="peek-value"></span>${icon('down', 16)}</a>`;
  const form = root.querySelector('form');
  const result = root.querySelector('.result');
  const peek = root.querySelector('.peek');
  let last = null;

  const drawForm = () => { form.innerHTML = formHtml(st); };
  const focus = (selector) => form.querySelector(selector)?.focus();

  const update = () => {
    last = form.querySelector('[aria-invalid]') ? null : analyze(st);
    if (!last) {
      result.innerHTML = `<p class="msg-empty">${icon('alert', 18)} ${esc(t('inputsInvalid'))}</p>`;
    } else if (!last.ok) {
      result.innerHTML = errorHtml(last, st);
    } else {
      const parts = render(last, st);
      let dg = '';
      try { dg = `<div class="diagram-wrap">${drawTree(last)}</div>`; } catch (err) { console.error(err); }
      result.innerHTML = parts.top + dg + parts.rest;
      addZoomButtons(result.querySelector('.diagram-wrap'));
    }
    const hero = result.querySelector('.hero');
    peek.querySelector('.peek-label').textContent = hero?.querySelector('.hero-label')?.textContent ?? '';
    peek.querySelector('.peek-value').textContent = hero?.querySelector('.hero-value')?.textContent.replace(/\s+/g, ' ').trim() ?? '—';
    const qs = toQuery(st);
    const hash = `#/powertree${qs ? `?${qs}` : ''}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
  };

  /** A regulator was renamed: its name is an option in the rail lists. */
  const relabel = (i) => {
    const name = i < 0 ? srcName(st) : regName(st, i);
    form.querySelectorAll(`select[data-k$="-parent"] option[value="${i}"], select[data-k$="-rail"] option[value="${i}"]`)
      .forEach((o) => { o.textContent = name; });
  };

  const readNumber = (el, obj, key, rule) => {
    const x = parseNumber(el.value);
    obj[key] = fin(x) ? x : NaN;
    el.toggleAttribute('aria-invalid', invalidValue(rule, el.value, x));
  };
  const readRail = (el, self) => {
    const k = Number(el.value);
    return Number.isInteger(k) && k >= 0 && k < st.regs.length && k !== self ? k : -1;
  };

  form.addEventListener('input', (e) => {
    const el = e.target;
    const [group, a, b] = (el.dataset?.k ?? '').split('-');
    if (group === 's') {
      if (a === 'name') { st.src.name = cleanName(el.value); relabel(-1); }
      else if (RULES.src[a]) readNumber(el, st.src, a, RULES.src[a]);
      if (a === 'vnom') for (const k of ['vmin', 'vmax']) form.querySelector(`[data-k="s-${k}"]`).placeholder = num(st.src.vnom);
    } else if (group === 'r' && st.regs[Number(a)]) {
      const i = Number(a);
      const r = st.regs[i];
      if (b === 'name') { r.name = cleanName(el.value); relabel(i); }
      else if (b === 'parent') r.parent = readRail(el, i);
      else if (b === 'type' && REG_TYPES.includes(el.value)) {
        r.type = el.value;
        if (!fin(r.vout)) r.vout = 3.3;
        if (!(r.eff > 0 && r.eff <= 100)) r.eff = 90;
        drawForm();
        focus(`[data-k="r-${i}-type"]`);
      } else if (RULES.reg[b]) readNumber(el, r, b, RULES.reg[b]);
    } else if (group === 'l' && st.loads[Number(a)]) {
      const i = Number(a);
      const l = st.loads[i];
      if (b === 'name') l.name = cleanName(el.value);
      else if (b === 'rail') l.rail = readRail(el, -1);
      else if (RULES.load[b]) readNumber(el, l, b, RULES.load[b]);
      if (b === 'ityp') form.querySelector(`[data-k="l-${i}-imax"]`).placeholder = num(l.ityp);
    } else {
      return;
    }
    update();
  });

  /** Remove regulator k: whatever hung on it moves to the rail that fed it. */
  const removeReg = (k) => {
    const up = st.regs[k].parent;
    const fix = (x) => { const y = x === k ? up : x; return y > k ? y - 1 : y; };
    st.regs.splice(k, 1);
    // (A regulator taken out of a loop could end up feeding itself: back to the source.)
    st.regs.forEach((r, i) => { const p = fix(r.parent); r.parent = p === i ? -1 : p; });
    for (const l of st.loads) l.rail = fix(l.rail);
  };
  /** Put the cursor into the name of a row that was just added, ready to be overwritten. */
  const editName = (key) => {
    const el = form.querySelector(`[data-k="${key}"]`);
    el?.focus();
    el?.select();
  };

  form.addEventListener('click', (e) => {
    const ex = e.target.closest('[data-ex]');
    const add = e.target.closest('[data-add]');
    const delReg = e.target.closest('[data-del-reg]');
    const delLoad = e.target.closest('[data-del-load]');
    if (ex) {
      st = exampleState(ex.dataset.ex);
      drawForm();
      focus(`[data-ex="${ex.dataset.ex}"]`);
    } else if (add?.dataset.add === 'reg' && st.regs.length < LIMITS.maxRegs) {
      const used = new Set(st.regs.map((r) => r.name.trim()));
      let n = st.regs.length + 1;
      while (used.has(`U${n}`)) n++;
      st.regs.push(mkReg({ name: `U${n}`, iq: 50, vdo: 0.3 }));
      drawForm();
      editName(`r-${st.regs.length - 1}-name`);
    } else if (add?.dataset.add === 'load' && st.loads.length < LIMITS.maxLoads) {
      st.loads.push(mkLoad({ name: `${t('pt_load')} ${st.loads.length + 1}`, rail: st.regs.length - 1, ityp: 10 }));
      drawForm();
      editName(`l-${st.loads.length - 1}-name`);
    } else if (delReg && st.regs[Number(delReg.dataset.delReg)]) {
      const k = Number(delReg.dataset.delReg);
      removeReg(k);
      drawForm();
      focus(st.regs.length ? `[data-del-reg="${Math.min(k, st.regs.length - 1)}"]` : '[data-add="reg"]');
    } else if (delLoad && st.loads[Number(delLoad.dataset.delLoad)]) {
      const k = Number(delLoad.dataset.delLoad);
      st.loads.splice(k, 1);
      drawForm();
      focus(st.loads.length ? `[data-del-load="${Math.min(k, st.loads.length - 1)}"]` : '[data-add="load"]');
    } else {
      return;
    }
    update();
  });
  form.addEventListener('submit', (e) => e.preventDefault());

  result.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy]');
    if (btn && await copyText(btn.dataset.copy)) {
      btn.classList.add('ok');
      setTimeout(() => btn.classList.remove('ok'), 1200);
    }
  });

  root.querySelector('.page-actions').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const flash = (key) => {
      const label = btn.querySelector('.btn-label');
      label.textContent = t('copied');
      btn.classList.add('ok');
      setTimeout(() => { label.textContent = t(key); btn.classList.remove('ok'); }, 1400);
    };
    switch (btn.dataset.action) {
      case 'reset':
        st = defaultState();
        drawForm();
        update();
        break;
      case 'copy-link':
        if (await copyText(location.href)) flash('copyLink');
        break;
      case 'copy-summary': {
        const warns = [...result.querySelectorAll('.msg li')].map((el) => `  ! ${el.textContent.trim()}`);
        const worked = [...result.querySelectorAll('.steps li[data-plain]')].map((li) => `  ${li.dataset.plain}`);
        const textOut = summary(st, last, location.href)
          + (warns.length ? `\n\n${t('warnings')}:\n${warns.join('\n')}` : '')
          + (worked.length ? `\n\n${t('steps')}:\n${worked.join('\n')}` : '');
        if (await copyText(textOut)) flash('copySummary');
        break;
      }
      case 'print':
        root.querySelector('.print-meta').textContent = `${t('printedAt')}: ${new Date().toLocaleString()} · ${location.href}`;
        window.print();
        break;
      default:
    }
  });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(([entry]) => {
      peek.hidden = entry.isIntersecting || window.innerWidth > 900;
    }, { threshold: 0.05 });
    io.observe(result);
  }

  drawForm();
  update();
}

// The shared smoke tests call compute / diagram / render with the field values
// of `sections` (none here), so all three fall back to the default example.
const stateOf = (v) => (Array.isArray(v?.regs) && Array.isArray(v?.loads) && v.src ? v : defaultState());

const page = {
  id: 'powertree',
  strings,
  sections: [],
  compute: (v) => analyze(stateOf(v)),
  diagram: (v, u, r) => drawTree(r?.regs && r?.totals ? r : analyze(stateOf(v))),
  render: (r, v) => {
    const parts = render(r, stateOf(v));
    return typeof parts === 'string' ? parts : parts.top + parts.rest;
  },
  mount(root, params) { mount(root, params, page); },
};

export default page;
