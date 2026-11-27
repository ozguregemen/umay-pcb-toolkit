// Power path voltage drop. A custom page (not mountCalculator) because the
// number of path elements varies. It keeps the calculator conventions: the
// whole path lives in the URL (shareable link, saved calculations), copy link /
// copy summary / print / reset, live results and a live drawing.
//
// URL format (every part optional; no parameter at all = the default example):
//   ex=<id>                              one of the examples (board, motor, usb)
//   p=<V>_<A>_<°C>_<budget %>            supply voltage, load current, copper temperature, drop budget
//   e=<type>_<side>_<fields…>_<name>     one per element, in the order of the path
//        type   t trace | p plane | v via | f fixed resistance | w wire
//        side   0 = feed, 1 = return path
//        t      length mm, width mm, copper thickness, its unit (oz | um), layer (ext | int)
//        p      length mm, width mm, copper thickness, its unit (oz | um)
//        v      drill mm, plating µm, barrel length mm, number in parallel
//        f      resistance mΩ, current rating A (empty = none)
//        w      length m, size, its unit (awg | mm2)
// The name comes last, so it may contain "_"; empty = not given.

import { analyzePowerPath, ELEMENT_TYPES, LIMITS } from '../engine/dcdrop.js';
import { UM_PER_OZ } from '../engine/units.js';
import { awgWire, awgName, nearestAwg } from '../engine/convert.js';
import { heroes, block, steps, parseNumber } from '../ui/calculator.js';
import { fmt, si, siHtml, esc } from '../ui/format.js';
import { tx } from '../ui/math.js';
import { t } from '../i18n.js';
import { icon } from '../ui/icons.js';
import { addZoomButtons } from '../ui/zoom.js';
import { svg, rect, text, path, poly, ring } from '../ui/svg.js';

const strings = {
  tr: {
    vd_intro: 'Besleme akımının kaynaktan yüke (isterseniz dönüşte de) geçtiği elemanları sırayla girin: iz, bakır alan, via, konnektör teması, sigorta ya da MOSFET, kablo. Her elemanın ve bütün yolun direnci, gerilim düşümü ve kaybı, yüke ulaşan gerilim ve en büyük payı alan eleman hesaplanır; aşırı yüklenen elemanlar uyarı olarak gösterilir.',
    vd_examples: 'Örnekle başlayın:',
    vd_ex_board: '5 V / 2 A: konnektör → sigorta → iz → via → iz',
    vd_ex_motor: '12 V / 5 A motor beslemesi, dönüş yoluyla',
    vd_ex_usb: 'USB kablosu + kart (5 V / 3 A)',
    vd_exCableP: 'Kablo (+)',
    vd_exCableN: 'Kablo (−)',
    vd_exShunt: 'R1 (şönt)',
    vd_exCableVbus: 'Kablo VBUS',
    vd_exCableGnd: 'Kablo GND',
    vd_exGndPlane: 'GND düzlemi',
    vd_secPath: 'Yol ayarları',
    vd_supply: 'Kaynak gerilimi',
    vd_current: 'Yük akımı',
    vd_temp: 'Bakır sıcaklığı',
    vd_budget: 'Düşüm bütçesi',
    vd_pathHint: 'Bütün bakır elemanların (iz, düzlem, via, kablo) direnci bu sıcaklıktaki özdirençle hesaplanır. Bütçe, toplam düşümün üst sınırıdır ve kaynak geriliminin yüzdesi olarak girilir.',
    vd_secEls: 'Yol elemanları (kaynaktan yüke doğru sırayla)',
    vd_name: 'Ad',
    vd_type: 'Tür',
    vd_side: 'Yol',
    vd_sideFeed: 'Gidiş',
    vd_sideRet: 'Dönüş',
    vd_t_trace: 'İz',
    vd_t_plane: 'Düzlem / bakır alan',
    vd_t_via: 'Via',
    vd_t_fixed: 'Sabit direnç',
    vd_t_wire: 'Kablo / tel',
    vd_ts_trace: 'İz',
    vd_ts_plane: 'Düzlem',
    vd_ts_via: 'Via',
    vd_ts_fixed: 'Sabit',
    vd_ts_wire: 'Kablo',
    vd_len: 'Uzunluk',
    vd_width: 'Genişlik',
    vd_cu: 'Bakır kalınlığı',
    vd_layer: 'Katman',
    vd_layerExt: 'Dış',
    vd_layerInt: 'İç',
    vd_drill: 'Delik çapı',
    vd_plating: 'Kaplama',
    vd_barrel: 'Via boyu',
    vd_count: 'Paralel adet',
    vd_res: 'Direnç',
    vd_rating: 'Anma akımı',
    vd_size: 'Kesit',
    vd_add: 'Eleman ekle:',
    vd_del: 'Elemanı sil: {name}',
    vd_aField: 'Eleman {n}: {field}',
    vd_aUnit: 'birim',
    vd_formNote: 'Sıra, akımın yol üzerindeki sırasıdır. Dönüş yolunu (GND izi ya da düzlemi, kablonun eksi teli) hesaba katmak için o elemanları da ekleyin ve “Dönüş” olarak işaretleyin; yükteki gerilim, gidiş ve dönüş düşümlerinin toplamı kadar azalır. Düzlem / bakır alan: akımın bütün genişliğe eşit yayıldığı varsayılır (direnç = levha direnci × kare sayısı, kare sayısı = uzunluk / genişlik); akım dar bir noktadan girip çıkıyorsa gerçek direnç daha büyüktür. Via: gövde direnci; “Via boyu”, akımın geçtiği iki katman arasındaki mesafedir (bilinmiyorsa kart kalınlığı). Sabit direnç: konnektör teması, sigorta, ferrit DCR, MOSFET RDS(on), şönt direnci; anma akımı isteğe bağlıdır. Kablo: AWG numarası ya da mm² kesit ve tek iletkenin uzunluğu.',
    vd_hDrop: 'Toplam gerilim düşümü',
    vd_hLoad: 'Yükteki gerilim',
    vd_hLoss: 'Toplam kayıp',
    vd_hMax: 'En büyük düşüm',
    vd_subDrop: 'kaynağın %{pct} kadarı · bütçe %{budget} ({bv})',
    vd_subLoad: '{v} kaynaktan, {i} akımda',
    vd_subLoadRet: 'gidiş −{f} · dönüş −{r}',
    vd_subLoss: 'toplam direnç {r} · yüke ulaşan güç {p}',
    vd_subMax: '{name} · toplam düşümün %{share} kadarı',
    vd_dgAria: 'Yol boyunca gerilim: soldan sağa yoldaki elemanlar, her elemanda bir gerilim basamağı; kesikli çizgi düşüm bütçesi, en büyük düşümü yapan eleman vurgulu',
    vd_dgCaption: 'Yol boyunca gerilim · en büyük düşüm vurgulu',
    vd_dgSource: 'kaynak',
    vd_dgLoad: 'yük',
    vd_dgBudget: 'bütçe',
    vd_dgReturn: 'dönüş',
    vd_dgEmpty: 'Yolda eleman yok',
    vd_stR: 'direnç',
    vd_stV: 'gerilim düşümü',
    vd_stRtot: 'Toplam direnç',
    vd_stVtot: 'Toplam gerilim düşümü',
    vd_stPct: 'Düşümün kaynak gerilimine oranı',
    vd_stLoad: 'Yükteki gerilim',
    vd_stLoss: 'Toplam kayıp',
    vd_wRho: 'bakırın girilen sıcaklıktaki özdirenci',
    vd_wL: 'uzunluk (via için gövde boyu)',
    vd_wW: 'genişlik',
    vd_wT: 'bakır kalınlığı',
    vd_wN: 'paralel via sayısı',
    vd_wRo: 'via gövdesinin dış yarıçapı (delik yarıçapı + kaplama)',
    vd_wRi: 'via gövdesinin iç yarıçapı (delik yarıçapı)',
    vd_wA: 'telin bakır kesiti',
    vd_wI: 'yük akımı',
    vd_wVs: 'kaynak gerilimi',
    vd_wVl: 'yükteki gerilim',
    vd_note: 'Adımlar yoldaki sırayla yazılmıştır. Bütün bakır için tek bir sıcaklık kullanılır: ρ = ρ20 · [1 + 0,00393 · (T − 20 °C)]; elemanların kendi ısınması dirence geri beslenmez. Modelin kapsamadıkları: via ve pad geçişlerinde akım sıkışması (izin viaya ya da pede bağlandığı yerdeki ek direnç), paralel vialar arasında eşit olmayan akım paylaşımı (kaynağa yakın vialar daha çok akım taşır), temas direncinin aşınma ve sıcaklıkla değişmesi, AC etkiler (deri etkisi, endüktans, darbeli yükün tepe akımı). Düzlemde akımın bütün genişliğe yayıldığı varsayılır. Yük sabit akım çeker.',
    vd_tblTitle: 'Elemanlar',
    vd_cEl: 'Eleman',
    vd_cR: 'Direnç',
    vd_cV: 'Düşüm',
    vd_cP: 'Kayıp',
    vd_cShare: 'Pay',
    vd_cCheck: 'Kontrol',
    vd_total: 'Toplam',
    vd_ckRise: 'ΔT ≈ {dt} (IPC-2152)',
    vd_ck2221: 'IPC-2221, {layer}: {dt}',
    vd_ck2221Ext: 'dış katman',
    vd_ck2221Int: 'iç katman',
    vd_ckJ: 'J = {j} A/mm²',
    vd_ckSheet: '{rs}/□ × {sq} kare',
    vd_ckVia: 'via başına {i} · kapasite {cap} (%{pct})',
    vd_ckRated: '{i} / anma {rated} (%{pct})',
    vd_ckNoRating: 'anma akımı girilmedi',
    vd_ckWire: '⌀ {d} · {a}',
    vd_tblNote: 'Pay: elemanın düşümünün toplam düşüme oranı; en büyük pay vurguludur. ΔT: izin yol akımındaki sıcaklık artışı, IPC-2152 temel grafiğinden (1,78 mm kart, durgun hava, yakında bakır düzlem yok; bakır kalınlığı düzeltmesiyle). IPC-2152 iç ve dış katmanı ayırmaz; katman seçimi yalnızca karşılaştırma için verilen IPC-2221 değerini değiştirir (iç katman eğrisi çok muhafazakârdır). Via kapasitesi: gövde kesitine IPC-2221 dış katman eğrisi uygulanarak 10 °C artış için. J: akım yoğunluğu, bilgi amaçlıdır; bir sınır uygulanmaz.',
    vd_sources: 'Kaynaklar',
    vd_sumEl: '{n}. {name}',
    err_vd_supply: 'Kaynak gerilimi sıfırdan büyük olmalı.',
    err_vd_current: 'Yük akımı sıfırdan büyük olmalı.',
    err_vd_temp: 'Bakır sıcaklığı −60 … 200 °C aralığında olmalı.',
    err_vd_budget: 'Düşüm bütçesi %0’dan büyük ve en çok %100 olmalı.',
    err_vd_count: 'Bir yola en çok 20 eleman girilebilir.',
    err_vd_type: '{name}: bilinmeyen eleman türü.',
    err_vd_field: '{name}: “{field}” için sıfırdan büyük bir sayı girin.',
    err_vd_fieldCount: '{name}: paralel via sayısı 1 ya da daha büyük bir tam sayı olmalı.',
    err_vd_fieldAwg: '{name}: AWG numarası −3 (4/0) ile 40 arasında bir tam sayı olmalı.',
    err_vd_fieldRes: '{name}: direnç sıfır ya da daha büyük bir sayı olmalı.',
    err_vd_collapse: 'Toplam düşüm ({v}) kaynak gerilimine ({vs}) ulaşıyor ya da onu aşıyor: yük bu akımı bu yoldan çekemez. En büyük direnç {name} elemanında ({r}). Değerleri ve birimleri kontrol edin (direnç mΩ, uzunluk mm, kablo m).',
    err_vd_range: 'Değerler hesaplanamayacak kadar büyük ya da küçük.',
    warn_vd_budget: 'Toplam düşüm {v}, kaynağın %{pct} kadarı; %{budget} bütçesini ({bv}) aşıyor. En büyük pay {name} elemanında (%{share}). Önce onu küçültün: daha geniş ya da kısa iz, daha kalın bakır, daha düşük dirençli parça ya da daha kalın kablo.',
    warn_vd_riseHigh: '{name}: {i} akımda IPC-2152 sıcaklık artışı ≈ {dt}; 20 °C’nin üstünde. İzi genişletin ya da daha kalın bakır kullanın.',
    warn_vd_riseNote: '{name}: {i} akımda IPC-2152 sıcaklık artışı ≈ {dt}; 10 °C’nin üstünde. Çoğu tasarımda kabul edilir; yine de iz sıcaklığının (ortam + ΔT) kart malzemesinin ve yakındaki parçaların sınırının altında kaldığını doğrulayın.',
    warn_vd_riseRange: '{name}: IPC-2152 eğri uydurması bu iz için doğrulandığı aralığın dışında (akım en çok ≈ 26 A, bakır 0,5–3 oz). Sıcaklık artışı yalnızca fikir verir.',
    warn_vd_viaOver: '{name}: via başına {i} akım, 10 °C artış için IPC-2221 kapasitesini ({cap}) aşıyor. En az {n} paralel via kullanın ya da deliği büyütün.',
    warn_vd_fixedOver: '{name}: {i} akım, elemanın anma akımını ({rated}) aşıyor. Daha yüksek akımlı bir parça seçin ya da akımı paralel yollara bölün.',
  },
  en: {
    vd_intro: 'List the elements the supply current passes through on its way from the source to the load (and back, if you like): traces, copper pours, vias, connector contacts, a fuse or MOSFET, cable. You get the resistance, voltage drop and loss of every element and of the whole path, the voltage that arrives at the load and the element that dominates; overloaded elements are flagged.',
    vd_examples: 'Start from an example:',
    vd_ex_board: '5 V / 2 A: connector → fuse → trace → vias → trace',
    vd_ex_motor: '12 V / 5 A motor feed with return path',
    vd_ex_usb: 'USB cable + board (5 V / 3 A)',
    vd_exCableP: 'Cable (+)',
    vd_exCableN: 'Cable (−)',
    vd_exShunt: 'R1 (shunt)',
    vd_exCableVbus: 'Cable VBUS',
    vd_exCableGnd: 'Cable GND',
    vd_exGndPlane: 'GND plane',
    vd_secPath: 'Path settings',
    vd_supply: 'Supply voltage',
    vd_current: 'Load current',
    vd_temp: 'Copper temperature',
    vd_budget: 'Drop budget',
    vd_pathHint: 'The resistance of every copper element (trace, plane, via, wire) uses the resistivity at this temperature. The budget is the upper limit for the total drop, as a percentage of the supply voltage.',
    vd_secEls: 'Path elements (in order from the source to the load)',
    vd_name: 'Name',
    vd_type: 'Type',
    vd_side: 'Side',
    vd_sideFeed: 'Feed',
    vd_sideRet: 'Return',
    vd_t_trace: 'Trace',
    vd_t_plane: 'Plane / copper pour',
    vd_t_via: 'Via',
    vd_t_fixed: 'Fixed resistance',
    vd_t_wire: 'Wire / cable',
    vd_ts_trace: 'Trace',
    vd_ts_plane: 'Plane',
    vd_ts_via: 'Via',
    vd_ts_fixed: 'Fixed',
    vd_ts_wire: 'Wire',
    vd_len: 'Length',
    vd_width: 'Width',
    vd_cu: 'Copper thickness',
    vd_layer: 'Layer',
    vd_layerExt: 'External',
    vd_layerInt: 'Internal',
    vd_drill: 'Drill diameter',
    vd_plating: 'Plating',
    vd_barrel: 'Barrel length',
    vd_count: 'In parallel',
    vd_res: 'Resistance',
    vd_rating: 'Current rating',
    vd_size: 'Size',
    vd_add: 'Add an element:',
    vd_del: 'Remove element: {name}',
    vd_aField: 'Element {n}: {field}',
    vd_aUnit: 'unit',
    vd_formNote: 'The order is the order along the current path. To include the return path (a ground trace or plane, the negative wire of a cable), add those elements too and mark them “Return”; the voltage at the load falls by the feed and return drops together. Plane / copper pour: the current is assumed to spread evenly over the full width (resistance = sheet resistance × number of squares, squares = length / width); where the current enters and leaves at a narrow point the real resistance is higher. Via: barrel resistance; “Barrel length” is the distance between the two layers the current uses (the board thickness if unknown). Fixed resistance: a connector contact, fuse, ferrite DCR, MOSFET RDS(on) or sense resistor; the current rating is optional. Wire: AWG number or cross-section in mm², and the length of one conductor.',
    vd_hDrop: 'Total voltage drop',
    vd_hLoad: 'Voltage at the load',
    vd_hLoss: 'Total loss',
    vd_hMax: 'Largest drop',
    vd_subDrop: '{pct} % of the supply · budget {budget} % ({bv})',
    vd_subLoad: 'from {v} at {i}',
    vd_subLoadRet: 'feed −{f} · return −{r}',
    vd_subLoss: 'total resistance {r} · {p} reaches the load',
    vd_subMax: '{name} · {share} % of the total drop',
    vd_dgAria: 'Voltage along the path: the elements from left to right, one voltage step per element; the dashed line is the drop budget, the element with the largest drop is highlighted',
    vd_dgCaption: 'Voltage along the path · largest drop highlighted',
    vd_dgSource: 'source',
    vd_dgLoad: 'load',
    vd_dgBudget: 'budget',
    vd_dgReturn: 'return',
    vd_dgEmpty: 'No elements on the path',
    vd_stR: 'resistance',
    vd_stV: 'voltage drop',
    vd_stRtot: 'Total resistance',
    vd_stVtot: 'Total voltage drop',
    vd_stPct: 'Drop as a share of the supply voltage',
    vd_stLoad: 'Voltage at the load',
    vd_stLoss: 'Total loss',
    vd_wRho: 'resistivity of copper at the temperature entered',
    vd_wL: 'length (for a via: barrel length)',
    vd_wW: 'width',
    vd_wT: 'copper thickness',
    vd_wN: 'number of vias in parallel',
    vd_wRo: 'outer radius of the via barrel (hole radius + plating)',
    vd_wRi: 'inner radius of the via barrel (hole radius)',
    vd_wA: 'copper cross-section of the wire',
    vd_wI: 'load current',
    vd_wVs: 'supply voltage',
    vd_wVl: 'voltage at the load',
    vd_note: 'The steps follow the order of the path. One temperature is used for all copper: ρ = ρ20 · [1 + 0.00393 · (T − 20 °C)]; the self-heating of the elements is not fed back into the resistance. Not included in the model: current crowding at via and pad transitions (the extra resistance where a trace meets a via or a pad), uneven current sharing between parallel vias (those nearest the source carry more), contact resistance changing with wear and temperature, AC effects (skin effect, inductance, the peak current of a pulsed load). In a plane the current is assumed to spread over the full width. The load draws a constant current.',
    vd_tblTitle: 'Elements',
    vd_cEl: 'Element',
    vd_cR: 'Resistance',
    vd_cV: 'Drop',
    vd_cP: 'Loss',
    vd_cShare: 'Share',
    vd_cCheck: 'Check',
    vd_total: 'Total',
    vd_ckRise: 'ΔT ≈ {dt} (IPC-2152)',
    vd_ck2221: 'IPC-2221, {layer}: {dt}',
    vd_ck2221Ext: 'external',
    vd_ck2221Int: 'internal',
    vd_ckJ: 'J = {j} A/mm²',
    vd_ckSheet: '{rs}/□ × {sq} squares',
    vd_ckVia: '{i} per via · capacity {cap} ({pct} %)',
    vd_ckRated: '{i} of {rated} rated ({pct} %)',
    vd_ckNoRating: 'no current rating given',
    vd_ckWire: '⌀ {d} · {a}',
    vd_tblNote: 'Share: the drop of the element as a part of the total drop; the largest is highlighted. ΔT: temperature rise of the trace at the path current from the IPC-2152 baseline chart (1.78 mm board, still air, no copper plane nearby; with the copper-thickness modifier). IPC-2152 does not distinguish internal from external layers; the layer only changes the IPC-2221 figure given for comparison (its internal curve is very conservative). Via capacity: the IPC-2221 external curve applied to the barrel cross-section, for a 10 °C rise. J: current density, for information; no limit is applied.',
    vd_sources: 'Sources',
    vd_sumEl: '{n}. {name}',
    err_vd_supply: 'The supply voltage must be greater than zero.',
    err_vd_current: 'The load current must be greater than zero.',
    err_vd_temp: 'The copper temperature must be within −60 … 200 °C.',
    err_vd_budget: 'The drop budget must be above 0 % and at most 100 %.',
    err_vd_count: 'A path can have at most 20 elements.',
    err_vd_type: '{name}: unknown element type.',
    err_vd_field: '{name}: enter a number greater than zero for “{field}”.',
    err_vd_fieldCount: '{name}: the number of vias in parallel must be a whole number, 1 or more.',
    err_vd_fieldAwg: '{name}: the AWG number must be a whole number from −3 (4/0) to 40.',
    err_vd_fieldRes: '{name}: the resistance must be a number, zero or greater.',
    err_vd_collapse: 'The total drop ({v}) reaches or exceeds the supply voltage ({vs}): the load cannot draw this current through this path. The largest resistance is in {name} ({r}). Check the values and their units (resistance in mΩ, length in mm, wire in m).',
    err_vd_range: 'The values are too large or too small to calculate.',
    warn_vd_budget: 'The total drop is {v}, {pct} % of the supply, above the budget of {budget} % ({bv}). The largest share is in {name} ({share} %). Reduce that first: a wider or shorter trace, thicker copper, a part with a lower resistance or a heavier wire.',
    warn_vd_riseHigh: '{name}: IPC-2152 temperature rise ≈ {dt} at {i}, above 20 °C. Widen the trace or use thicker copper.',
    warn_vd_riseNote: '{name}: IPC-2152 temperature rise ≈ {dt} at {i}, above 10 °C. Acceptable in most designs; still check that the trace temperature (ambient + ΔT) stays below the limit of the board material and of nearby parts.',
    warn_vd_riseRange: '{name}: the IPC-2152 curve fit is outside the range it was checked for (current up to ≈ 26 A, copper 0.5–3 oz). Treat the temperature rise as indicative only.',
    warn_vd_viaOver: '{name}: {i} per via exceeds the IPC-2221 capacity for a 10 °C rise ({cap}). Use at least {n} vias in parallel or a larger hole.',
    warn_vd_fixedOver: '{name}: the current of {i} exceeds the rating of the element ({rated}). Choose a part with a higher rating or split the current over parallel paths.',
  },
};

// ---------------------------------------------------------------------------
// State. Values are kept in the units of the form: V, A, °C, % for the path;
// per element mm (trace, plane, via), oz or µm (copper), µm (plating), mΩ and
// A (fixed), m and AWG or mm² (wire). NaN = empty.
// ---------------------------------------------------------------------------

const NAME_MAX = 24;
const TYPE_CODE = { trace: 't', plane: 'p', via: 'v', fixed: 'f', wire: 'w' };
const CODE_TYPE = Object.fromEntries(Object.entries(TYPE_CODE).map(([k, v]) => [v, k]));
const fin = Number.isFinite;

/** Fields of every element type with the values of a newly added element. */
const TYPE_DEFAULTS = {
  trace: { len: 20, w: 1, th: 1, thu: 'oz', layer: 'ext' },
  plane: { len: 20, w: 10, th: 1, thu: 'oz' },
  via: { drill: 0.3, plat: 25, board: 1.6, n: 1 },
  fixed: { r: 10, imax: NaN },
  wire: { wlen: 1, size: 22, su: 'awg' },
};
const PATH_DEFAULTS = { v: 5, i: 2, t: 25, b: LIMITS.budgetPct };

const mkEl = (type, o = {}) => ({ name: '', type, ret: false, ...TYPE_DEFAULTS[type], ...o });
const mkState = (o = {}) => ({ ...PATH_DEFAULTS, els: [], ...o });

/** Example paths. Built on demand because a few names are translated. */
export const EXAMPLES = {
  board: () => mkState({
    v: 5, i: 2,
    els: [
      mkEl('fixed', { name: 'J1', r: 10, imax: 3 }),
      mkEl('fixed', { name: 'F1', r: 35, imax: 3 }),
      mkEl('trace', { name: 'F1 → via', len: 30, w: 1 }),
      mkEl('via', { name: 'via', n: 2 }),
      mkEl('trace', { name: 'via → U1', len: 20, w: 1 }),
    ],
  }),
  motor: () => mkState({
    v: 12, i: 5,
    els: [
      mkEl('fixed', { name: 'J1', r: 5, imax: 10 }),
      mkEl('fixed', { name: 'Q1 RDS(on)', r: 12, imax: 20 }),
      mkEl('trace', { name: 'Q1 → J2', len: 40, w: 3, th: 2 }),
      mkEl('wire', { name: t('vd_exCableP'), wlen: 0.5, size: 18 }),
      mkEl('wire', { name: t('vd_exCableN'), ret: true, wlen: 0.5, size: 18 }),
      mkEl('fixed', { name: t('vd_exShunt'), ret: true, r: 10, imax: 10 }),
      mkEl('plane', { name: 'GND', ret: true, len: 40, w: 20, th: 2 }),
    ],
  }),
  usb: () => mkState({
    v: 5, i: 3,
    els: [
      mkEl('wire', { name: t('vd_exCableVbus'), wlen: 1, size: 24 }),
      mkEl('fixed', { name: 'J1 VBUS', r: 10, imax: 5 }),
      mkEl('fixed', { name: 'FB1', r: 25, imax: 4 }),
      mkEl('trace', { name: 'VBUS → U1', len: 15, w: 0.8 }),
      mkEl('plane', { name: t('vd_exGndPlane'), ret: true, len: 15, w: 10 }),
      mkEl('fixed', { name: 'J1 GND', ret: true, r: 10, imax: 5 }),
      mkEl('wire', { name: t('vd_exCableGnd'), ret: true, wlen: 1, size: 24 }),
    ],
  }),
};
const EXAMPLE_IDS = Object.keys(EXAMPLES);
const DEFAULT_EXAMPLE = 'board';

export const exampleState = (id) => (Object.hasOwn(EXAMPLES, id) ? EXAMPLES[id] : EXAMPLES[DEFAULT_EXAMPLE])();
export const defaultState = () => exampleState(DEFAULT_EXAMPLE);

/** Printable text of at most NAME_MAX characters (names are typed by the user). */
const cleanName = (s) => [...String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, '')].slice(0, NAME_MAX).join('');
const num = (x) => (fin(x) ? String(Number(x.toPrecision(6))) : '');

/** The type's own values of an element, in URL order. */
function elFields(e) {
  switch (e.type) {
    case 'trace': return [num(e.len), num(e.w), num(e.th), e.thu, e.layer];
    case 'plane': return [num(e.len), num(e.w), num(e.th), e.thu];
    case 'via': return [num(e.drill), num(e.plat), num(e.board), num(e.n)];
    case 'fixed': return [num(e.r), num(e.imax)];
    default: return [num(e.wlen), num(e.size), e.su];
  }
}
const FIELD_COUNT = { trace: 5, plane: 4, via: 4, fixed: 2, wire: 3 };

function serialize(st) {
  const q = new URLSearchParams();
  q.set('p', [num(st.v), num(st.i), num(st.t), num(st.b)].join('_'));
  for (const e of st.els) q.append('e', [TYPE_CODE[e.type], e.ret ? 1 : 0, ...elFields(e), e.name].join('_'));
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

const validAwg = (x) => Number.isInteger(x) && x >= LIMITS.awgMin && x <= LIMITS.awgMax;

/** State from URL parameters. Never throws: bad or missing values fall back to defaults. */
export function fromParams(params) {
  const p = params && typeof params.getAll === 'function' ? params : new URLSearchParams();
  if (!p.has('p') && !p.has('e')) return exampleState(p.get('ex'));

  const numOf = (s) => (String(s ?? '').trim() === '' ? NaN : parseNumber(s));
  const pos = (s, d) => { const x = numOf(s); return fin(x) && x > 0 ? x : d; };

  const [v, i, tc, b] = String(p.get('p') ?? '').split('_');
  const temp = numOf(tc);
  const budget = numOf(b);
  const st = mkState({
    v: pos(v, PATH_DEFAULTS.v),
    i: pos(i, PATH_DEFAULTS.i),
    t: fin(temp) && temp >= LIMITS.tempMinC && temp <= LIMITS.tempMaxC ? temp : PATH_DEFAULTS.t,
    b: budget > 0 && budget <= 100 ? budget : PATH_DEFAULTS.b,
  });

  st.els = p.getAll('e').slice(0, LIMITS.maxElements).map((raw) => {
    const parts = String(raw ?? '').split('_');
    const type = Object.hasOwn(CODE_TYPE, parts[0]) ? CODE_TYPE[parts[0]] : 'trace';
    const n = FIELD_COUNT[type];
    const f = Array.from({ length: n }, (_, k) => parts[2 + k] ?? '');
    const d = TYPE_DEFAULTS[type];
    const o = { name: cleanName(parts.slice(2 + n).join('_')).trim(), ret: parts[1] === '1' };
    // A thickness without a valid unit cannot be read: both fall back together.
    const copper = () => (f[3] === 'oz' || f[3] === 'um' ? { th: pos(f[2], f[3] === 'oz' ? 1 : 35), thu: f[3] } : { th: d.th, thu: d.thu });
    switch (type) {
      case 'trace': return mkEl(type, { ...o, len: pos(f[0], d.len), w: pos(f[1], d.w), ...copper(), layer: f[4] === 'int' ? 'int' : 'ext' });
      case 'plane': return mkEl(type, { ...o, len: pos(f[0], d.len), w: pos(f[1], d.w), ...copper() });
      case 'via': {
        const count = numOf(f[3]);
        return mkEl(type, { ...o, drill: pos(f[0], d.drill), plat: pos(f[1], d.plat), board: pos(f[2], d.board), n: Number.isInteger(count) && count >= 1 ? count : d.n });
      }
      case 'fixed': {
        const r = numOf(f[0]);
        return mkEl(type, { ...o, r: fin(r) && r >= 0 ? r : d.r, imax: pos(f[1], NaN) });
      }
      default: {
        const size = numOf(f[1]);
        if (f[2] === 'mm2') return mkEl(type, { ...o, wlen: pos(f[0], d.wlen), size: fin(size) && size > 0 ? size : 0.5, su: 'mm2' });
        return mkEl(type, { ...o, wlen: pos(f[0], d.wlen), size: validAwg(size) ? size : d.size, su: 'awg' });
      }
    }
  });
  // A path has at least one element on this page.
  if (!st.els.length) st.els = [mkEl('trace')];
  return st;
}

// ---------------------------------------------------------------------------
// Names and formatting
// ---------------------------------------------------------------------------

const typeName = (type) => t(`vd_t_${type}`);
const typeShort = (type) => t(`vd_ts_${type}`);
const elName = (st, i) => st.els[i].name.trim() || `${typeShort(st.els[i].type)} ${i + 1}`;
/** `$` is special in the replacement text of t(); user text must pass through unchanged. */
const lit = (s) => String(s).replace(/\$/g, '$$$$');
const clip = (s, n) => { const a = [...String(s)]; return a.length > n ? `${a.slice(0, n - 1).join('')}…` : a.join(''); };

const V = (x, sig = 4) => si(x, 'V', sig);
const A = (x, sig = 4) => si(x, 'A', sig);
const W = (x, sig = 4) => si(x, 'W', sig);
const OHM = (x, sig = 4) => si(x, 'Ω', sig);
/** A percentage as a number only (the sentence adds the sign where its language puts it). */
const pctNum = (x) => (fin(x) ? fmt(x, 3) : '—');
const pct = (x) => (fin(x) ? `${fmt(x, 3)} %` : '—');
const degC = (x) => (x < 1 ? '< 1 °C' : `${fmt(x, 3)} °C`);
const mmTxt = (x, sig = 4) => `${fmt(x, sig)} mm`;
const umTxt = (x) => `${fmt(x, 4)} µm`;

// ---------------------------------------------------------------------------
// Compute
// ---------------------------------------------------------------------------

/** Copper thickness of a trace or plane in µm (1 oz/ft² = 1.378 mil, the IPC-2221 value). */
const copperUm = (e) => (e.thu === 'oz' ? e.th * UM_PER_OZ : e.th);

/** The engine's input (SI-style units, see engine/dcdrop.js) for a page state. */
export function toPath(st) {
  return {
    supplyV: st.v,
    currentA: st.i,
    tempC: st.t,
    budgetPct: st.b,
    elements: st.els.map((e, i) => {
      const base = { name: elName(st, i), type: e.type, ret: e.ret === true };
      switch (e.type) {
        case 'trace': return { ...base, lengthMm: e.len, widthMm: e.w, thicknessUm: copperUm(e), layer: e.layer === 'int' ? 'internal' : 'external' };
        case 'plane': return { ...base, lengthMm: e.len, widthMm: e.w, thicknessUm: copperUm(e) };
        case 'via': return { ...base, drillMm: e.drill, platingUm: e.plat, lengthMm: e.board, count: e.n };
        case 'fixed': return { ...base, resistanceOhm: e.r * 1e-3, ratedA: e.imax };
        default: return e.su === 'mm2' ? { ...base, lengthM: e.wlen, areaMm2: e.size } : { ...base, lengthM: e.wlen, awg: e.size };
      }
    }),
  };
}

const analyze = (st) => analyzePowerPath(toPath(st));

// ---------------------------------------------------------------------------
// Drawing: the voltage along the path as a staircase. One column per element
// (equal widths), the step of an element in the middle of its column. All
// geometry is computed from the result only (never from label text), so it is
// identical in both languages.
// ---------------------------------------------------------------------------

const DG = { ml: 58, mr: 92, top: 36, plotH: 150, span: 330, colMin: 28, flatW: 62, valueW: 44, legendPitch: 78 };
const r1 = (x) => Math.round(x * 10) / 10;
const BAD_FLAGS = new Set(['riseHigh', 'viaOver', 'fixedOver']);

/** Small symbol of an element type, centred on (cx, cy): 16 wide. */
function symbol(type, cx, cy) {
  switch (type) {
    case 'trace': return rect(cx - 8, cy - 1.5, 16, 3, 'cu');
    case 'plane': return rect(cx - 8, cy - 5, 16, 10, 'cu');
    case 'via': return ring(cx, cy, 6, 2.6, 'cu');
    case 'fixed': return rect(cx - 8, cy - 3.5, 16, 7, 'comp', ' rx="1"');
    default: return path(`M${r1(cx - 8)},${r1(cy)}q4,-7 8,0t8,0`, 'wire');
  }
}

/**
 * SVG of the voltage along the path for a result of analyzePowerPath(): x = the
 * elements in order, y = voltage from the supply down to the load voltage, the
 * budget as a dashed line, the element with the largest drop highlighted.
 * Names are written flat up to five elements and rotated beyond that; the
 * drawing grows wider from twelve elements on.
 */
export function drawPath(r) {
  if (!r?.ok) return '';
  const els = r.elements;
  const n = els.length;
  const T = r.totals;
  const cols = Math.max(n, 1);
  const colW = Math.max(DG.colMin, DG.span / cols);
  const x0 = DG.ml;
  const x1 = x0 + cols * colW;
  const top = DG.top;
  const bottom = top + DG.plotH;
  const flat = colW >= DG.flatW;
  const allValues = colW >= DG.valueW;
  const xc = (i) => x0 + (i + 0.5) * colW;

  // Vertical scale: the supply at the top, the lower of load voltage and budget near the bottom.
  const vTop = r.supplyV;
  const vBudget = r.supplyV - T.budgetV;
  const span = Math.max(vTop - Math.min(T.loadV, vBudget), vTop * 1e-9);
  const yOf = (v) => top + ((vTop - v) / (1.15 * span)) * DG.plotH;

  let b = text(4, 14, t('vd_dgCaption'), { cls: 'title', anchor: 'start' });
  if (T.maxIndex !== null) b += rect(x0 + T.maxIndex * colW, top, colW, DG.plotH, 'zone');

  // Axes with a tick between the columns, the budget line.
  let ticks = '';
  for (let i = 1; i < cols; i++) ticks += `M${r1(x0 + i * colW)},${bottom}V${bottom + 4}`;
  b += path(`M${x0},${top}V${bottom}H${r1(x1)}${ticks}`, 'axis');
  const yBudget = yOf(vBudget);
  b += path(`M${x0},${r1(yBudget)}H${r1(x1)}`, 'wave2');

  // The staircase: level before each element, its step, level after the last one.
  const yIn = [];
  const pts = [[x0, yOf(vTop)]];
  let v = vTop;
  for (const e of els) {
    yIn.push(yOf(v));
    pts.push([xc(e.index), yOf(v)]);
    v -= e.dropV;
    pts.push([xc(e.index), yOf(v)]);
  }
  const yLoad = yOf(T.loadV);
  pts.push([x1, yLoad]);
  b += poly(pts, 'wave');
  if (T.maxIndex !== null) {
    const x = r1(xc(T.maxIndex));
    b += `<path class="wave" style="stroke-width:3.6" d="M${x},${r1(yIn[T.maxIndex])}V${r1(pts[2 * T.maxIndex + 2][1])}"/>`;
  }
  if (!n) b += text((x0 + x1) / 2, top + 64, t('vd_dgEmpty'), { cls: 'lbl' });

  // The drop of every element above its step (only the largest when the columns are narrow).
  for (const e of els) {
    const hot = e.index === T.maxIndex;
    if (!(e.dropV > 0) || !(allValues || hot)) continue;
    b += text(xc(e.index), yIn[e.index] - 5, `−${si(e.dropV, 'V', 3)}`, { cls: hot ? 'val' : 'lbl', size: 10 });
  }

  // Voltages: the supply on the left, load voltage and budget on the right (kept apart).
  b += text(x0 - 6, top + 4, V(vTop), { cls: 'name', anchor: 'end' });
  const gap = 13;
  let yL = yLoad + 4;
  let yB = yBudget + 4;
  if (Math.abs(yL - yB) < gap) {
    const mid = (yL + yB) / 2;
    const loadAbove = T.loadV >= vBudget;
    yL = mid + (loadAbove ? -gap / 2 : gap / 2);
    yB = mid + (loadAbove ? gap / 2 : -gap / 2);
  }
  b += text(x1 + 6, yL, V(T.loadV), { cls: 'val', anchor: 'start' });
  b += text(x1 + 6, yB, `${t('vd_dgBudget')} ${V(vBudget)}`, { cls: T.dropPct > r.budgetPct ? 'badt' : 'lbl', anchor: 'start' });

  // Below the axis: a symbol per element, brackets under the return elements, the names.
  const ySym = bottom + 15;
  b += text(x0 - 6, ySym + 4, t('vd_dgSource'), { cls: 'lbl', anchor: 'end' });
  b += text(x1 + 6, ySym + 4, t('vd_dgLoad'), { cls: 'lbl', anchor: 'start' });
  for (const e of els) b += symbol(e.type, xc(e.index), ySym);
  // (A rotated name ends under its symbol, so it starts a little lower than a flat one needs to.)
  let yName = ySym + (flat ? 24 : 28);
  if (T.hasReturn) {
    const yr = ySym + 14;
    for (let i = 0; i < n; i++) {
      if (!els[i].ret) continue;
      let j = i;
      while (j + 1 < n && els[j + 1].ret) j++;
      const xa = x0 + i * colW + 3;
      const xb = x0 + (j + 1) * colW - 3;
      b += path(`M${r1(xa)},${r1(yr - 3)}V${r1(yr)}H${r1(xb)}V${r1(yr - 3)}`, 'dimline');
      b += text((xa + xb) / 2, yr + 11, t('vd_dgReturn'), { cls: 'lbl', size: 10 });
      i = j;
    }
    yName += flat ? 16 : 20;
  }
  const maxChars = flat ? Math.min(NAME_MAX, Math.floor((colW - 6) / 6.2)) : 13;
  for (const e of els) {
    const cls = e.flags.some((f) => BAD_FLAGS.has(f)) ? 'badt' : e.index === T.maxIndex ? 'val' : 'lbl';
    const label = clip(e.name, maxChars);
    if (flat) b += text(xc(e.index), yName, label, { cls });
    else {
      const x = r1(xc(e.index) + 3);
      const y = r1(yName - 6);
      b += `<text class="${cls}" x="${x}" y="${y}" text-anchor="end" transform="rotate(-45 ${x} ${y})">${esc(label)}</text>`;
    }
  }

  // Legend: the symbols of the types on this path.
  const yLegend = yName + (flat ? 22 : 78);
  ELEMENT_TYPES.filter((type) => els.some((e) => e.type === type)).forEach((type, k) => {
    const x = x0 + k * DG.legendPitch;
    b += symbol(type, x + 8, yLegend - 4) + text(x + 21, yLegend, typeShort(type), { cls: 'lbl', anchor: 'start', size: 10 });
  });
  const height = n ? yLegend + 8 : yName;
  return svg(r1(x1 + DG.mr), r1(height), b, t('vd_dgAria'), { wide: true });
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

function msgList(kind, texts) {
  if (!texts.length) return '';
  return `<ul class="msg ${kind}">${texts.map((s) => `<li>${icon('alert', 16)}<span>${esc(s)}</span></li>`).join('')}</ul>`;
}

const FIELD_LABEL = {
  lengthMm: 'vd_len', widthMm: 'vd_width', thicknessUm: 'vd_cu', drillMm: 'vd_drill', platingUm: 'vd_plating',
  ratedA: 'vd_rating', lengthM: 'vd_len', areaMm2: 'vd_size',
};

/** Messages of a failed analysis (st gives the names and types of the elements). */
function errorTexts(res, st) {
  const el = (index) => st.els[index];
  const nameOf = (index) => lit(el(index) ? elName(st, index) : `#${index + 1}`);
  return res.errors.map((e) => {
    switch (e.code) {
      case 'field': {
        if (e.field === 'count') return t('err_vd_fieldCount', { name: nameOf(e.index) });
        if (e.field === 'awg') return t('err_vd_fieldAwg', { name: nameOf(e.index) });
        if (e.field === 'resistanceOhm') return t('err_vd_fieldRes', { name: nameOf(e.index) });
        const key = e.field === 'lengthMm' && el(e.index)?.type === 'via' ? 'vd_barrel' : FIELD_LABEL[e.field] ?? 'vd_len';
        return t('err_vd_field', { field: t(key), name: nameOf(e.index) });
      }
      case 'type': return t('err_vd_type', { name: nameOf(e.index) });
      case 'collapse': return t('err_vd_collapse', { v: V(e.dropV), vs: V(e.supplyV), r: OHM(e.maxResistanceOhm), name: nameOf(e.maxIndex ?? 0) });
      default: return t(`err_vd_${e.code}`);
    }
  });
}

function errorHtml(res, st) {
  return `<p class="msg-empty">${icon('alert', 18)} ${esc(t('inputsInvalid'))}</p>${msgList('error', errorTexts(res, st))}`;
}

function warningTexts(r) {
  return r.warnings.map((w) => {
    const name = lit(r.elements[w.index]?.name ?? '');
    switch (w.code) {
      case 'budget': {
        const m = r.elements[w.maxIndex];
        return t('warn_vd_budget', { v: V(w.dropV), pct: pctNum(w.dropPct), budget: pctNum(w.budgetPct), bv: V(w.budgetV), share: pctNum(m?.sharePct), name: lit(m?.name ?? '') });
      }
      case 'riseHigh': case 'riseNote': return t(`warn_vd_${w.code}`, { i: A(w.currentA), dt: degC(w.riseC), name });
      case 'riseRange': return t('warn_vd_riseRange', { name });
      case 'viaOver': return t('warn_vd_viaOver', { i: A(w.perViaA, 3), cap: A(w.capacityA, 3), n: String(w.neededCount), name });
      default: return t('warn_vd_fixedOver', { i: A(w.currentA), rated: A(w.ratedA), name });
    }
  });
}

/**
 * The worked calculation in the order of the path: for every element its
 * resistance (not for a fixed one, where it is the input) and its drop, then
 * the totals. Every number comes from the engine result.
 */
function stepsBlock(r) {
  const items = [];
  const used = new Set();
  const I = tx(A(r.currentA));
  const rho = tx(si(r.resistivityOhmM, 'Ω·m'));
  const R = (x) => tx(OHM(x));
  for (const e of r.elements) {
    const label = (key) => `${e.name} (${typeShort(e.type)}) · ${t(key)}`;
    if (e.type === 'trace') {
      for (const s of ['rho', 'L', 'w', 't']) used.add(s);
      items.push({ labelRaw: label('vd_stR'), sym: 'R = \\frac{ρ \\cdot L}{w \\cdot t}',
        num: `\\frac{${rho} \\cdot ${tx(mmTxt(e.lengthMm))}}{${tx(mmTxt(e.widthMm))} \\cdot ${tx(umTxt(e.thicknessUm))}}`, res: R(e.resistanceOhm) });
    } else if (e.type === 'plane') {
      for (const s of ['rho', 'L', 'w', 't']) used.add(s);
      items.push({ labelRaw: label('vd_stR'), sym: 'R = \\frac{ρ}{t} \\cdot \\frac{L}{w}',
        num: `\\frac{${rho}}{${tx(umTxt(e.thicknessUm))}} \\cdot \\frac{${tx(mmTxt(e.lengthMm))}}{${tx(mmTxt(e.widthMm))}}`, res: R(e.resistanceOhm) });
    } else if (e.type === 'via') {
      for (const s of ['rho', 'L', 'r']) used.add(s);
      const many = e.count > 1;
      if (many) used.add('n');
      const ri = e.drillMm / 2;
      const ro = ri + e.platingUm / 1000;
      items.push({ labelRaw: label('vd_stR'), sym: `R = \\frac{ρ \\cdot L}{${many ? 'n \\cdot ' : ''}π \\cdot (r_{o}^{2} − r_{i}^{2})}`,
        num: `\\frac{${rho} \\cdot ${tx(mmTxt(e.lengthMm))}}{${many ? `${e.count} \\cdot ` : ''}π \\cdot ({(${tx(mmTxt(ro, 5))})}^{2} − {(${tx(mmTxt(ri, 5))})}^{2})}`, res: R(e.resistanceOhm) });
    } else if (e.type === 'wire') {
      for (const s of ['rho', 'L', 'A']) used.add(s);
      items.push({ labelRaw: label('vd_stR'), sym: 'R = \\frac{ρ \\cdot L}{A}',
        num: `\\frac{${rho} \\cdot ${tx(si(e.lengthM, 'm'))}}{${tx(`${fmt(e.areaMm2, 4)} mm²`)}}`, res: R(e.resistanceOhm) });
    }
    items.push({ labelRaw: label('vd_stV'), sym: 'ΔV = I \\cdot R', num: `${I} \\cdot ${R(e.resistanceOhm)}`, res: tx(V(e.dropV)) });
  }
  const T = r.totals;
  const n = r.elements.length;
  // The sum is written out while it stays readable.
  const listed = n >= 2 && n <= 8;
  items.push({ label: 'vd_stRtot', sym: listed || n < 2 ? 'R_{tot}' : `R_{tot} = R_{1} + R_{2} + … + R_{${n}}`,
    num: listed ? r.elements.map((e) => R(e.resistanceOhm)).join(' + ') : undefined, res: R(T.resistanceOhm) });
  items.push({ label: 'vd_stVtot', sym: 'ΔV_{tot} = I \\cdot R_{tot}', num: `${I} \\cdot ${R(T.resistanceOhm)}`, res: tx(V(T.dropV)) });
  items.push({ label: 'vd_stPct', sym: '\\frac{ΔV_{tot}}{V_{S}}', num: `\\frac{${tx(V(T.dropV))}}{${tx(V(r.supplyV))}}`, res: tx(pct(T.dropPct)) });
  items.push({ label: 'vd_stLoad', sym: 'V_{L} = V_{S} − ΔV_{tot}', num: `${tx(V(r.supplyV))} − ${tx(V(T.dropV))}`, res: tx(V(T.loadV)) });
  items.push({ label: 'vd_stLoss', sym: 'P_{tot} = I^{2} \\cdot R_{tot}', num: `(${I})^{2} \\cdot ${R(T.resistanceOhm)}`, res: tx(W(T.lossW)) });
  return steps(items, {
    note: 'vd_note',
    where: [
      used.has('rho') && ['ρ', 'vd_wRho'],
      used.has('L') && ['L', 'vd_wL'],
      used.has('w') && ['w', 'vd_wW'],
      used.has('t') && ['t', 'vd_wT'],
      used.has('n') && ['n', 'vd_wN'],
      used.has('r') && ['r_{o}', 'vd_wRo'],
      used.has('r') && ['r_{i}', 'vd_wRi'],
      used.has('A') && ['A', 'vd_wA'],
      ['I', 'vd_wI'],
      ['V_{S}', 'vd_wVs'],
      ['V_{L}', 'vd_wVl'],
    ],
  });
}

/**
 * What is checked or worth knowing about one solved element:
 * [{ text, level: '' | 'note' | 'bad' }] (used by the table and the text summary).
 */
function checkParts(e, r) {
  const density = { text: t('vd_ckJ', { j: fmt(e.currentDensityAmm2, 3) }), level: '' };
  switch (e.type) {
    case 'trace': {
      const level = e.flags.includes('riseHigh') ? 'bad' : e.flags.includes('riseNote') ? 'note' : '';
      const classic = e.riseIpc2221C < 10 ? '< 10 °C' : e.riseIpc2221C > 100 ? '> 100 °C' : degC(e.riseIpc2221C);
      return [
        { text: t('vd_ckRise', { dt: degC(e.riseC) }), level },
        { text: t('vd_ck2221', { layer: t(e.layer === 'internal' ? 'vd_ck2221Int' : 'vd_ck2221Ext'), dt: classic }), level: '' },
        density,
      ];
    }
    case 'plane':
      return [{ text: t('vd_ckSheet', { rs: OHM(e.sheetOhm, 3), sq: fmt(e.squares, 3) }), level: '' }, density];
    case 'via':
      return [{ text: t('vd_ckVia', { i: A(e.perViaA, 3), cap: A(e.capacityA, 3), pct: fmt(e.loadPct, 2) }), level: e.flags.includes('viaOver') ? 'bad' : '' }];
    case 'fixed':
      return fin(e.ratedA)
        ? [{ text: t('vd_ckRated', { i: A(r.currentA), rated: A(e.ratedA), pct: fmt(e.loadPct, 2) }), level: e.flags.includes('fixedOver') ? 'bad' : '' }]
        : [{ text: t('vd_ckNoRating'), level: '' }];
    default:
      return [
        ...(fin(e.awg) ? [{ text: `AWG ${awgName(e.awg)}`, level: '' }] : []),
        { text: t('vd_ckWire', { d: mmTxt(e.diameterMm, 3), a: `${fmt(e.areaMm2, 3)} mm²` }), level: '' },
        density,
      ];
  }
}

const LEVEL_COLOR = { bad: 'var(--err-fg)', note: 'var(--warn-fg)' };

/** All elements in one table: resistance, drop, loss, share of the total drop and the check. */
function elementsTable(r) {
  const T = r.totals;
  const head = ['vd_cR', 'vd_cV', 'vd_cP', 'vd_cShare'].map((k) => `<th scope="col">${esc(t(k))}</th>`).join('');
  const body = r.elements.map((e) => {
    const check = checkParts(e, r).map((p) => (p.level ? `<span style="color:${LEVEL_COLOR[p.level]};font-weight:600">${esc(p.text)}</span>` : esc(p.text))).join(' · ');
    const badge = `${esc(typeShort(e.type))}${e.ret ? ` · ${esc(t('vd_sideRet'))}` : ''}`;
    return `<tr${e.index === T.maxIndex ? ' class="on-row"' : ''}>
      <th scope="row">${e.index + 1}. ${esc(e.name)} <span class="badge">${badge}</span></th>
      <td>${esc(OHM(e.resistanceOhm))}</td><td>${esc(V(e.dropV))}</td><td>${esc(W(e.lossW))}</td><td>${esc(pct(e.sharePct))}</td>
      <td style="text-align:left;white-space:normal;min-width:190px">${check}</td></tr>`;
  }).join('');
  const strong = 'font-weight:700;color:var(--text)';
  const foot = `<tr><th scope="row" style="text-align:left;${strong}">${esc(t('vd_total'))}</th>
    <td style="${strong}">${esc(OHM(T.resistanceOhm))}</td><td style="${strong}">${esc(V(T.dropV))}</td><td style="${strong}">${esc(W(T.lossW))}</td>
    <td style="${strong}">${esc(pct(r.elements.length && T.resistanceOhm > 0 ? 100 : 0))}</td><td></td></tr>`;
  return block('vd_tblTitle', `<div class="table-scroll"><table class="grid">
    <thead><tr><th scope="col" style="text-align:left">${esc(t('vd_cEl'))}</th>${head}<th scope="col" style="text-align:left">${esc(t('vd_cCheck'))}</th></tr></thead>
    <tbody>${body}</tbody><tfoot>${foot}</tfoot></table></div>
    <p class="note">${esc(t('vd_tblNote'))}</p>`);
}

const REFS = [
  'IPC-2152 (2009), Standard for Determining Current Carrying Capacity in Printed Board Design',
  'IPC-2221B (2012), Generic Standard on Printed Board Design, §6.2',
  'ASTM B258 (AWG wire diameters)',
  'IEC 60028 (resistivity of annealed copper)',
];

/** Result card: `top` goes above the drawing, `rest` below it. */
function render(r, st) {
  if (!r.ok) return errorHtml(r, st);
  const T = r.totals;
  const m = T.maxIndex === null ? null : r.elements[T.maxIndex];
  const loadSub = t('vd_subLoad', { v: V(r.supplyV), i: A(r.currentA) })
    + (T.hasReturn ? ` · ${t('vd_subLoadRet', { f: V(T.feedDropV), r: V(T.returnDropV) })}` : '');
  const main = heroes([
    ['vd_hDrop', siHtml(T.dropV, 'V'), esc(t('vd_subDrop', { pct: pctNum(T.dropPct), budget: pctNum(r.budgetPct), bv: V(T.budgetV) }))],
    ['vd_hLoad', siHtml(T.loadV, 'V'), esc(loadSub)],
    ['vd_hLoss', siHtml(T.lossW, 'W'), esc(t('vd_subLoss', { r: OHM(T.resistanceOhm), p: W(T.loadW) }))],
    m && ['vd_hMax', siHtml(m.dropV, 'V'), esc(t('vd_subMax', { share: pctNum(m.sharePct), name: lit(m.name) }))],
  ]);
  return {
    top: main + msgList('warn', warningTexts(r)),
    rest: stepsBlock(r) + elementsTable(r)
      + block('vd_sources', `<p class="refs" style="margin-top:0">${REFS.map(esc).join(' · ')}</p>`),
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
  unit: 'height:34px;min-width:0;padding:0 6px;font-size:12px',
  sel: 'height:34px;padding:0 4px;font-size:14px',
  card: 'border:1px solid var(--border);border-left-width:4px;border-radius:10px;padding:8px 8px 9px 10px;margin-bottom:8px',
  grid: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(104px,1fr));gap:6px',
};
const TEXT_IN = 'type="text" autocomplete="off" spellcheck="false"';

// Validity of one typed value. Empty is fine only for the optional ones.
const RULES = {
  p: { v: 'pos', i: 'pos', t: 'temp', b: 'pct' },
  e: { len: 'pos', w: 'pos', th: 'pos', drill: 'pos', plat: 'pos', board: 'pos', n: 'count', r: 'nonneg', imax: 'optPos', wlen: 'pos', size: 'size' },
};
function invalidValue(rule, textValue, x, el) {
  if (String(textValue).trim() === '') return !rule.startsWith('opt');
  if (!fin(x)) return true;
  switch (rule) {
    case 'pos': case 'optPos': return !(x > 0);
    case 'nonneg': return x < 0;
    case 'temp': return x < LIMITS.tempMinC || x > LIMITS.tempMaxC;
    case 'pct': return !(x > 0 && x <= 100);
    case 'count': return !(Number.isInteger(x) && x >= 1);
    case 'size': return el?.su === 'mm2' ? !(x > 0) : !validAwg(x);
    default: return false;
  }
}
const invalidAttr = (rule, x, el) => (invalidValue(rule, num(x), x, el) ? ' aria-invalid="true"' : '');

/** Compact labelled input of an element card; `unit` is a text or [key, [[value, label], …], current]. */
function mini(key, label, value, unit, aria, extra = '') {
  let unitHtml = '';
  if (Array.isArray(unit)) {
    const [unitKey, options, current] = unit;
    unitHtml = `<select class="unit" data-k="${unitKey}" style="${CSS.unit}" aria-label="${esc(`${aria}, ${t('vd_aUnit')}`)}">${options
      .map(([v, l]) => `<option value="${esc(v)}"${v === current ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  } else if (unit) {
    unitHtml = `<span class="unit unit-static" style="${CSS.unit}">${esc(unit)}</span>`;
  }
  return `<div style="min-width:0"><label for="vd-${key}" style="${CSS.lbl}">${esc(label)}</label>
    <div class="input-group"><input id="vd-${key}" data-k="${key}" ${TEXT_IN} ${extra || 'inputmode="decimal"'} style="${CSS.inp}" value="${esc(value)}" aria-label="${esc(aria)}">${unitHtml}</div></div>`;
}

function miniSelect(key, label, options, current, aria, style = '') {
  return `<div class="field" style="margin:0;min-width:0;${style}"><label for="vd-${key}" style="${CSS.lbl}">${esc(label)}</label>
    <select id="vd-${key}" data-k="${key}" style="${CSS.sel}" aria-label="${esc(aria)}">${options.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(current) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
}

function field(key, label, value, unit, x) {
  return `<div class="field"><div class="label-row"><label for="vd-p-${key}">${esc(t(label))}</label></div>
    <div class="input-group"><input id="vd-p-${key}" data-k="p-${key}" ${TEXT_IN} inputmode="decimal" value="${esc(value)}"${invalidAttr(RULES.p[key], x)}><span class="unit unit-static">${esc(unit)}</span></div></div>`;
}

const CU_UNITS = [['oz', 'oz'], ['um', 'µm']];
const SIZE_UNITS = [['awg', 'AWG'], ['mm2', 'mm²']];

function elCard(st, i) {
  const e = st.els[i];
  const name = elName(st, i);
  const aria = (key) => t('vd_aField', { n: i + 1, field: t(key) });
  const cell = (k, labelKey, unit, extra = '') => mini(`e-${i}-${k}`, t(labelKey), num(e[k]), unit, aria(labelKey),
    `inputmode="decimal"${invalidAttr(RULES.e[k], e[k], e)}${extra}`);
  const copper = () => cell('th', 'vd_cu', [`e-${i}-thu`, CU_UNITS, e.thu]);
  const cells = [];
  if (e.type === 'trace') {
    cells.push(cell('len', 'vd_len', 'mm'), cell('w', 'vd_width', 'mm'), copper(),
      miniSelect(`e-${i}-layer`, t('vd_layer'), [['ext', t('vd_layerExt')], ['int', t('vd_layerInt')]], e.layer, aria('vd_layer')));
  } else if (e.type === 'plane') {
    cells.push(cell('len', 'vd_len', 'mm'), cell('w', 'vd_width', 'mm'), copper());
  } else if (e.type === 'via') {
    cells.push(cell('drill', 'vd_drill', 'mm'), cell('plat', 'vd_plating', 'µm'), cell('board', 'vd_barrel', 'mm'), cell('n', 'vd_count', '×'));
  } else if (e.type === 'fixed') {
    cells.push(cell('r', 'vd_res', 'mΩ'), cell('imax', 'vd_rating', 'A', ' placeholder="—"'));
  } else {
    cells.push(cell('size', 'vd_size', [`e-${i}-su`, SIZE_UNITS, e.su]), cell('wlen', 'vd_len', 'm'));
  }
  cells.push(miniSelect(`e-${i}-ret`, t('vd_side'), [['0', t('vd_sideFeed')], ['1', t('vd_sideRet')]], e.ret ? '1' : '0', aria('vd_side')));
  const del = t('vd_del', { name: lit(name) });
  const only = st.els.length <= 1;
  return `<div style="${CSS.card};border-left-color:var(${e.ret ? '--border-strong' : '--cu'})">
    <div style="display:flex;gap:6px;align-items:flex-end;margin-bottom:6px">
      <div style="flex:1 1 0;min-width:0">${mini(`e-${i}-name`, `${i + 1}. ${t('vd_name')}`, e.name, '', aria('vd_name'), `maxlength="${NAME_MAX}" placeholder="${esc(name)}"`)}</div>
      ${miniSelect(`e-${i}-type`, t('vd_type'), ELEMENT_TYPES.map((x) => [x, typeName(x)]), e.type, aria('vd_type'), 'flex:0 1 128px')}
      <button type="button" class="copy-btn" data-del="${i}" title="${esc(del)}" aria-label="${esc(del)}"${only ? ' disabled style="opacity:.4;cursor:not-allowed"' : ''}>${icon('trash', 16)}</button>
    </div>
    <div style="${CSS.grid}">${cells.join('')}</div>
  </div>`;
}

/** The whole form for a state (exported so the escaping of names can be tested). */
export function formHtml(st) {
  const full = st.els.length >= LIMITS.maxElements;
  const add = ELEMENT_TYPES.map((type) => `<button type="button" class="chip" data-add="${type}"${full ? ' disabled style="opacity:.5;cursor:not-allowed"' : ''}>+ ${esc(typeShort(type))}</button>`).join('');
  return `
    <div class="field" style="margin:14px 0 0"><small class="hint" style="margin:0">${esc(t('vd_examples'))}</small>
      <div class="presets" role="group" aria-label="${esc(t('vd_examples'))}">${EXAMPLE_IDS.map((id) => `<button type="button" class="chip" data-ex="${id}">${esc(t(`vd_ex_${id}`))}</button>`).join('')}</div></div>
    <fieldset class="section"><legend>${esc(t('vd_secPath'))}</legend>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:0 10px">
        ${field('v', 'vd_supply', num(st.v), 'V', st.v)}
        ${field('i', 'vd_current', num(st.i), 'A', st.i)}
        ${field('t', 'vd_temp', num(st.t), '°C', st.t)}
        ${field('b', 'vd_budget', num(st.b), '%', st.b)}
      </div>
      <small class="hint" style="margin-top:0">${esc(t('vd_pathHint'))}</small>
    </fieldset>
    <fieldset class="section"><legend>${esc(t('vd_secEls'))}</legend>
      ${st.els.map((_, i) => elCard(st, i)).join('')}
      <div class="presets" role="group" aria-label="${esc(t('vd_add'))}"><span style="align-self:center;color:var(--muted);font-size:12.5px">${esc(t('vd_add'))}</span>${add}
        <span style="align-self:center;color:var(--faint);font-size:12.5px">${st.els.length} / ${LIMITS.maxElements}</span></div>
      <p class="note">${esc(t('vd_formNote'))}</p>
    </fieldset>`;
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

/** The inputs of one element as text. */
function describe(e) {
  const copper = `${fmt(e.th)} ${e.thu === 'oz' ? 'oz' : 'µm'}`;
  switch (e.type) {
    case 'trace': return `${fmt(e.len)} mm × ${fmt(e.w)} mm · ${copper} · ${t(e.layer === 'int' ? 'vd_layerInt' : 'vd_layerExt')}`;
    case 'plane': return `${fmt(e.len)} mm × ${fmt(e.w)} mm · ${copper}`;
    case 'via': return `${fmt(e.n)} × ⌀ ${fmt(e.drill)} mm · ${t('vd_plating')} ${fmt(e.plat)} µm · ${t('vd_barrel')} ${fmt(e.board)} mm`;
    case 'fixed': return `${fmt(e.r)} mΩ${fin(e.imax) ? ` · ${t('vd_rating')} ${fmt(e.imax)} A` : ''}`;
    default: return `${e.su === 'mm2' ? `${fmt(e.size)} mm²` : `AWG ${validAwg(e.size) ? awgName(e.size) : fmt(e.size)}`} · ${fmt(e.wlen)} m`;
  }
}

/** Plain-text inputs and results for pasting into design notes. */
export function summary(st, r, href = '') {
  const out = [`${t('appName')} — ${t('tool_dcdrop')}`, href, '', `${t('summaryInputs')}:`];
  out.push(`  ${t('vd_supply')}: ${fmt(st.v)} V · ${t('vd_current')}: ${fmt(st.i)} A · ${t('vd_temp')}: ${fmt(st.t)} °C · ${t('vd_budget')}: ${fmt(st.b)} %`);
  st.els.forEach((e, i) => {
    out.push(`  ${t('vd_sumEl', { n: i + 1, name: lit(elName(st, i)) })} [${typeShort(e.type)}${e.ret ? `, ${t('vd_sideRet')}` : ''}]: ${describe(e)}`);
  });
  out.push('', `${t('summaryResults')}:`);
  if (!r?.ok) return out.join('\n');
  const T = r.totals;
  out.push(`  ${t('vd_hDrop')}: ${V(T.dropV)} (${pct(T.dropPct)}; ${t('vd_budget')} ${pct(r.budgetPct)} = ${V(T.budgetV)})`,
    `  ${t('vd_hLoad')}: ${V(T.loadV)}${T.hasReturn ? ` (${t('vd_subLoadRet', { f: V(T.feedDropV), r: V(T.returnDropV) })})` : ''}`,
    `  ${t('vd_hLoss')}: ${W(T.lossW)} (${t('vd_stRtot')} ${OHM(T.resistanceOhm)})`);
  if (T.maxIndex !== null) {
    const m = r.elements[T.maxIndex];
    out.push(`  ${t('vd_hMax')}: ${m.name}, ${V(m.dropV)} (${pct(m.sharePct)})`);
  }
  for (const e of r.elements) {
    out.push(`  ${t('vd_sumEl', { n: e.index + 1, name: lit(e.name) })}: ${t('vd_cR')} ${OHM(e.resistanceOhm)} · ${t('vd_cV')} ${V(e.dropV)} · ${t('vd_cP')} ${W(e.lossW)} · ${t('vd_cShare')} ${pct(e.sharePct)} · ${checkParts(e, r).map((p) => p.text).join(' · ')}`);
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
        <h1>${esc(t('tool_dcdrop'))}</h1>
        <p class="lead">${esc(t('vd_intro'))}</p>
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
      try { dg = `<div class="diagram-wrap">${drawPath(last)}</div>`; } catch (err) { console.error(err); }
      result.innerHTML = parts.top + dg + parts.rest;
      addZoomButtons(result.querySelector('.diagram-wrap'));
    }
    const hero = result.querySelector('.hero');
    peek.querySelector('.peek-label').textContent = hero?.querySelector('.hero-label')?.textContent ?? '';
    peek.querySelector('.peek-value').textContent = hero?.querySelector('.hero-value')?.textContent.replace(/\s+/g, ' ').trim() ?? '—';
    const qs = toQuery(st);
    const hash = `#/dcdrop${qs ? `?${qs}` : ''}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
  };

  const readNumber = (el, obj, key, rule) => {
    const x = parseNumber(el.value);
    obj[key] = fin(x) ? x : NaN;
    el.toggleAttribute('aria-invalid', invalidValue(rule, el.value, x, obj));
  };

  form.addEventListener('input', (ev) => {
    const el = ev.target;
    const [group, a, b] = (el.dataset?.k ?? '').split('-');
    if (group === 'p' && RULES.p[a]) {
      readNumber(el, st, a, RULES.p[a]);
    } else if (group === 'e' && st.els[Number(a)]) {
      const i = Number(a);
      const e = st.els[i];
      if (b === 'name') {
        e.name = cleanName(el.value);
      } else if (b === 'type' && ELEMENT_TYPES.includes(el.value)) {
        st.els[i] = mkEl(el.value, { name: e.name, ret: e.ret });
        drawForm();
        focus(`[data-k="e-${i}-type"]`);
      } else if (b === 'ret') {
        e.ret = el.value === '1';
        drawForm();
        focus(`[data-k="e-${i}-ret"]`);
      } else if (b === 'layer') {
        e.layer = el.value === 'int' ? 'int' : 'ext';
      } else if (b === 'thu' && (el.value === 'oz' || el.value === 'um') && el.value !== e.thu) {
        // The same copper in the other unit (1 oz ≈ 35 µm).
        if (e.th > 0) e.th = Number((el.value === 'um' ? e.th * UM_PER_OZ : e.th / UM_PER_OZ).toPrecision(3));
        e.thu = el.value;
        drawForm();
        focus(`[data-k="e-${i}-thu"]`);
      } else if (b === 'su' && (el.value === 'awg' || el.value === 'mm2') && el.value !== e.su) {
        // The same wire in the other unit: the area of the gauge, or the nearest gauge.
        if (el.value === 'mm2' && validAwg(e.size)) e.size = Number(awgWire(e.size).areaMm2.toPrecision(3));
        else if (el.value === 'awg' && e.size > 0) e.size = nearestAwg(2 * Math.sqrt(e.size / Math.PI)).n;
        e.su = el.value;
        drawForm();
        focus(`[data-k="e-${i}-su"]`);
      } else if (RULES.e[b] && b in TYPE_DEFAULTS[e.type]) {
        readNumber(el, e, b, RULES.e[b]);
      } else {
        return;
      }
    } else {
      return;
    }
    update();
  });

  form.addEventListener('click', (ev) => {
    const ex = ev.target.closest('[data-ex]');
    const add = ev.target.closest('[data-add]');
    const del = ev.target.closest('[data-del]');
    if (ex) {
      st = exampleState(ex.dataset.ex);
      drawForm();
      focus(`[data-ex="${ex.dataset.ex}"]`);
    } else if (add && ELEMENT_TYPES.includes(add.dataset.add) && st.els.length < LIMITS.maxElements) {
      st.els.push(mkEl(add.dataset.add));
      drawForm();
      focus(`[data-k="e-${st.els.length - 1}-name"]`);
    } else if (del && st.els[Number(del.dataset.del)] && st.els.length > 1) {
      const k = Number(del.dataset.del);
      st.els.splice(k, 1);
      drawForm();
      focus(`[data-del="${Math.min(k, st.els.length - 1)}"]`);
    } else {
      return;
    }
    update();
  });
  form.addEventListener('submit', (ev) => ev.preventDefault());

  result.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('[data-copy]');
    if (btn && await copyText(btn.dataset.copy)) {
      btn.classList.add('ok');
      setTimeout(() => btn.classList.remove('ok'), 1200);
    }
  });

  root.querySelector('.page-actions').addEventListener('click', async (ev) => {
    const btn = ev.target.closest('[data-action]');
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
const stateOf = (v) => (Array.isArray(v?.els) ? v : defaultState());

const page = {
  id: 'dcdrop',
  strings,
  sections: [],
  compute: (v) => analyze(stateOf(v)),
  diagram: (v, u, r) => drawPath(r?.elements && r?.totals ? r : analyze(stateOf(v))),
  render: (r, v) => {
    const parts = render(r, stateOf(v));
    return typeof parts === 'string' ? parts : parts.top + parts.rest;
  },
  mount(root, params) { mount(root, params, page); },
};

export default page;
