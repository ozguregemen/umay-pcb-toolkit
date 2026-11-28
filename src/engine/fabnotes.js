// Fabrication notes for a rigid printed board: the numbered block that goes on
// the fabrication drawing or into the order, built from the designer's answers,
// and a list of points that look inconsistent or are still open.
//
// Pure functions: no DOM and no app i18n. The note templates live here in both
// languages, because the language of the notes is the fabricator's, not the
// reader's. Standards are named only by their designation; nothing is quoted
// from them, and no number in the notes is presented as coming from a standard.

export const LANGS = ['en', 'tr'];
export const COPPER_UM = [18, 35, 70, 105];
/** Nominal copper thickness (µm) → the weight it is ordered by (oz/ft²). */
export const COPPER_OZ = { 18: 0.5, 35: 1, 70: 2, 105: 3 };
export const MATERIALS = ['std', 'mid', 'high', 'other'];
/** FR-4 grades by their minimum glass-transition temperature (°C), as commonly offered. */
export const TG_C = { std: 130, mid: 150, high: 170 };
export const FINISHES = ['hasl', 'enig', 'imag', 'imsn', 'osp', 'enepig'];
export const SIDES = ['both', 'top', 'bottom', 'none'];
export const MASK_COLOURS = ['green', 'mgreen', 'black', 'mblack', 'blue', 'red', 'white'];
export const LEGEND_COLOURS = ['white', 'black', 'yellow'];
export const VIAS = ['open', 'tent', 'plug', 'fill'];
export const STACKUPS = ['fab', 'drawing'];
export const KINDS = ['se', 'diff'];
export const DELIVERIES = ['single', 'fab', 'drawn'];
export const SEPARATIONS = ['tabs', 'vscore'];
export const MARKINGS = ['legend', 'copper', 'none'];
export const DATA_FORMATS = ['gerber', 'odb', 'ipc2581'];
export const LAYERS_MAX = 32;
export const MAX_ROWS = 3;

/** Accepted range of every number that is written into a note: [lowest, highest]. */
export const RANGES = {
  thicknessMm: [0.1, 10],
  thicknessTolPct: [1, 50],
  minHoleMm: [0.05, 10],
  pthTolMm: [0.005, 1],
  npthTolMm: [0.005, 1],
  minTraceMm: [0.01, 10],
  minSpaceMm: [0.01, 10],
  impedanceAdjustPct: [1, 50],
  outlineTolMm: [0.01, 5],
  bowTwistPct: [0.1, 5],
  // one impedance row
  ohms: [1, 1000],
  tolPct: [1, 50],
  widthMm: [0.01, 10],
  gapMm: [0.01, 10],
};

/** Longest free text that is taken over into a note, in characters. */
export const TEXT_MAX = { name: 60, rev: 40, materialText: 60, layer: 40, ref: 40 };

/**
 * Thresholds of the check list. Every one is a rule of thumb for a typical
 * fabricator — none is a limit from a standard — and the page labels it so.
 */
export const RULES = {
  // Smallest trace width and spacing a fabricator typically accepts for a copper thickness (µm → mm).
  featureMmByCopperUm: { 18: 0.075, 35: 0.1, 70: 0.2, 105: 0.25 },
  // Below this trace/space a board usually carries fine-pitch parts, for which HASL is too uneven.
  haslFeatureMm: 0.15,
  // Board thickness / smallest finished hole that is typically plated without special agreement.
  aspectMax: 8,
  // Thinnest board that is plausible: per copper layer, and for any board.
  thicknessPerLayerMm: 0.1,
  thicknessMinMm: 0.2,
  // The usual thickness tolerance; a tighter one has to be asked for.
  thicknessTolPct: 10,
};

export const DEFAULTS = Object.freeze({
  lang: 'en',
  name: '',
  rev: '',
  layers: 4,
  thicknessMm: 1.6,
  thicknessTolPct: 10,
  ipcClass: 2,
  stackup: 'fab',
  material: 'std',
  materialText: '',
  halogenFree: false,
  ul94v0: true,
  outerCuUm: 35,
  innerCuUm: 35,
  finish: 'enig',
  hardGold: false,
  maskSides: 'both',
  maskColour: 'green',
  legendSides: 'both',
  legendColour: 'white',
  minHoleMm: 0.3,
  pthTolMm: 0.075,
  npthTolMm: 0.05,
  via: 'tent',
  viaInPad: false,
  minTraceMm: 0.15,
  minSpaceMm: 0.15,
  impedance: Object.freeze([]),
  impedanceAdjustPct: 10,
  delivery: 'single',
  separation: 'tabs',
  outlineTolMm: 0.1,
  xouts: false,
  etest: true,
  bowTwistPct: 0.75,
  marking: 'legend',
  rohs: true,
  vacuumPack: true,
  dataFormat: 'gerber',
});

/** Every case each check can report; `ok` and the cases named in OK_CASES pass, the others warn. */
export const CHECK_CASES = {
  imp: ['ok', 'warn'],
  stackup: ['none', 'drawing', 'approval'],
  class: ['ok', 'warn'],
  thin: ['ok', 'warn'],
  thicknessTol: ['ok', 'warn'],
  aspect: ['ok', 'warn'],
  copper: ['ok', 'warn'],
  hasl: ['ok', 'warn'],
  viaInPad: ['match', 'noNeed', 'open'],
  viaMask: ['ok', 'warn'],
  marking: ['ok', 'warn'],
  etest: ['ok', 'warn'],
};
const OK_CASES = ['ok', 'drawing', 'approval', 'match'];

// ---------------------------------------------------------------------------
// Note templates. One requirement per note; {name} marks a value.
// ---------------------------------------------------------------------------

const TEXT = {
  en: {
    title: 'FABRICATION NOTES',
    rev: 'REV {rev}',
    class: 'Fabricate in accordance with IPC-6012, Class {c}.',
    accept: 'Acceptance criteria: IPC-A-600, Class {c}.',
    layers: 'Number of copper layers: {n}.',
    layers1: 'Number of copper layers: 1 (single-sided board).',
    layers2: 'Number of copper layers: 2 (double-sided board).',
    stackFab: "Stack-up: fabricator's standard symmetrical build for the finished thickness and the copper thicknesses stated in these notes.",
    stackDrawing: 'Stack-up: in accordance with the stack-up drawing supplied with the data.',
    matFr4: 'Base material: {hf}FR-4 laminate{pp} in accordance with IPC-4101, glass transition temperature Tg {tg} °C min.',
    hf: 'halogen-free ',
    pp: ' and prepreg',
    matOther: 'Base material: {text}. No substitute without written approval.',
    ul: 'Flammability rating of the base material: UL 94 V-0.',
    thickness: 'Finished board thickness: {t} mm ±{tol} %.',
    cuOuter: 'Finished copper thickness, outer layers: {um} µm ({oz} oz/ft²) nominal, including plating.',
    cuSingle: 'Copper thickness: {um} µm ({oz} oz/ft²) nominal.',
    cuInner: 'Copper thickness, inner layers: {um} µm ({oz} oz/ft²) nominal.',
    finish: 'Surface finish: {f} on all exposed copper.',
    finishGold: 'Surface finish: {f} on all exposed copper except the edge-connector fingers.',
    fin: {
      hasl: 'lead-free hot air solder levelling (HASL)',
      enig: 'electroless nickel / immersion gold (ENIG) in accordance with IPC-4552',
      imag: 'immersion silver in accordance with IPC-4553',
      imsn: 'immersion tin in accordance with IPC-4554',
      osp: 'organic solderability preservative (OSP)',
      enepig: 'electroless nickel / electroless palladium / immersion gold (ENEPIG) in accordance with IPC-4556',
    },
    gold: 'Edge-connector fingers: electrolytic hard gold over nickel; plating thicknesses in accordance with IPC-6012, Class {c}.',
    mask: 'Solder mask: liquid photoimageable (LPI) in accordance with IPC-SM-840; colour {colour}; {sides}.',
    maskNone: 'Solder mask: none.',
    legend: 'Legend (silkscreen): non-conductive ink; colour {colour}; {sides}.',
    legendNone: 'Legend (silkscreen): none.',
    legendPads: 'No legend ink on pads or other solderable surfaces; clip the legend where it overlaps them.',
    colour: {
      green: 'green', mgreen: 'matte green', black: 'black', mblack: 'matte black', blue: 'blue', red: 'red', white: 'white', yellow: 'yellow',
    },
    sides: { both: 'both sides', top: 'top side only', bottom: 'bottom side only' },
    onSides: { both: 'on both sides', top: 'on the top side', bottom: 'on the bottom side' },
    holes: 'Hole diameters in the drill data are finished diameters.',
    holeTol: 'Hole diameter tolerance: plated holes ±{p} mm; non-plated holes ±{np} mm.',
    holeTolNp: 'Hole diameter tolerance: ±{np} mm (all holes are non-plated).',
    viaOpen: 'Vias: left open, without tenting or plugging; solder mask openings as in the data.',
    viaOpenBare: 'Vias: left open, without plugging or filling.',
    viaTent: 'Vias: tented with solder mask {sides}, as defined in the solder mask data. Reference: IPC-4761.',
    viaPlug: 'Vias: plugged and covered with solder mask {sides}. Reference: IPC-4761.',
    viaFill: 'Vias: filled with non-conductive material, planarised and capped with plated copper. Reference: IPC-4761.',
    viaFillPad: 'Vias: filled with non-conductive material, planarised and capped with plated copper, as required for the vias in pads. Reference: IPC-4761.',
    minimums: 'Design minimums, for information: trace width {w} mm; spacing {s} mm; finished hole diameter {h} mm.',
    impSe: 'Controlled impedance, layer {layer}: single-ended {z} Ω ±{tol} %; trace width {w} mm as drawn; reference layer(s) {ref}.',
    impDiff: 'Controlled impedance, layer {layer}: differential {z} Ω ±{tol} %; trace width {w} mm and gap {g} mm as drawn; reference layer(s) {ref}.',
    impAdjust: 'The fabricator may adjust the width and gap of the controlled impedance traces by up to ±{a} % to meet the targets; larger changes require written approval.',
    impApprove: 'Submit the stack-up with materials, dielectric thicknesses, final trace widths and calculated impedances for approval before production.',
    impCoupon: 'Verify the controlled impedances by TDR measurement on test coupons; supply the test report with each delivery and the coupons on request.',
    outline: 'Board outline and cut-out tolerance: ±{t} mm.',
    dlvSingle: 'Delivery form: single boards.',
    dlvFab: 'Delivery form: panels; panelisation by the fabricator. Submit the panel drawing for approval before production.',
    dlvDrawn: 'Delivery form: panels as defined in the supplied data. No change to the panel layout without written approval.',
    sepTabs: 'Board separation within the panel: routed, with break-off tabs.',
    sepVscore: 'Board separation within the panel: V-score.',
    xoutYes: 'X-outs (defective boards in a panel) are permitted if clearly and permanently marked.',
    xoutNo: 'X-outs are not permitted: every panel shall contain good boards only.',
    etest: 'Electrical test: 100 % of the boards, for opens and shorts, against the netlist of the supplied data, in accordance with IPC-9252.',
    etestNo: 'Electrical test: not required.',
    bow: 'Bow and twist: {b} % max.',
    markLegend: "Fabricator's mark and date code: permitted in legend ink, in a free area clear of pads and other markings.",
    markCopper: "Fabricator's mark and date code: permitted in copper on an outer layer, in a free area clear of all conductors and markings.",
    markNone: "Fabricator's mark and date code: not permitted on the board.",
    rohs: 'The finished boards shall comply with the RoHS Directive 2011/65/EU as amended.',
    pack: 'Packing: vacuum-sealed with desiccant; handling, packaging and storage in accordance with IPC-1601.',
    data: 'Fabrication data supplied: {fmt}.',
    fmt: { gerber: 'Gerber X2 with Excellon drill files', odb: 'ODB++', ipc2581: 'IPC-2581' },
    dataChange: 'Do not change the supplied data without written approval, except for the adjustments permitted by these notes and process compensation that does not change the finished features.',
    revisions: 'Referenced standards apply in the revision in effect on the date of the order.',
    discrepancy: 'Report any discrepancy between these notes, the data and the order before production; do not resolve it by assumption.',
  },
  tr: {
    title: 'ÜRETİM NOTLARI',
    rev: 'REV {rev}',
    class: 'Kart, IPC-6012 Sınıf {c} gereklerine uygun olarak üretilecektir.',
    accept: 'Kabul ölçütleri: IPC-A-600, Sınıf {c}.',
    layers: 'Bakır katman sayısı: {n}.',
    layers1: 'Bakır katman sayısı: 1 (tek yüzlü kart).',
    layers2: 'Bakır katman sayısı: 2 (çift yüzlü kart).',
    stackFab: 'Katman dizilimi: bu notlarda verilen bitmiş kart kalınlığına ve bakır kalınlıklarına uygun, üreticinin standart simetrik dizilimi.',
    stackDrawing: 'Katman dizilimi: üretim verisiyle birlikte verilen katman dizilimi çizimine uygun olacaktır.',
    matFr4: "Taban malzemesi: IPC-4101'e uygun {hf}FR-4 laminat{pp}; camsı geçiş sıcaklığı Tg en az {tg} °C.",
    hf: 'halojensiz ',
    pp: ' ve prepreg',
    matOther: 'Taban malzemesi: {text}. Yazılı onay olmadan başka malzeme kullanılmayacaktır.',
    ul: 'Taban malzemesinin yanmazlık sınıfı: UL 94 V-0.',
    thickness: 'Bitmiş kart kalınlığı: {t} mm ±%{tol}.',
    cuOuter: 'Dış katmanlarda bitmiş bakır kalınlığı: nominal {um} µm ({oz} oz/ft²), kaplama dahil.',
    cuSingle: 'Bakır kalınlığı: nominal {um} µm ({oz} oz/ft²).',
    cuInner: 'İç katmanlarda bakır kalınlığı: nominal {um} µm ({oz} oz/ft²).',
    finish: 'Yüzey kaplaması: açıkta kalan bütün bakır yüzeylerde {f}.',
    finishGold: 'Yüzey kaplaması: kenar konnektörü parmakları dışında, açıkta kalan bütün bakır yüzeylerde {f}.',
    fin: {
      hasl: 'kurşunsuz HASL (sıcak hava ile lehim tesviyesi)',
      enig: "IPC-4552'ye uygun ENIG (akımsız nikel / daldırma altın)",
      imag: "IPC-4553'e uygun daldırma gümüş",
      imsn: "IPC-4554'e uygun daldırma kalay",
      osp: 'OSP (organik lehimlenebilirlik koruyucu)',
      enepig: "IPC-4556'ya uygun ENEPIG (akımsız nikel / akımsız paladyum / daldırma altın)",
    },
    gold: 'Kenar konnektörü parmakları: nikel üzerine elektrolitik sert altın; kaplama kalınlıkları IPC-6012 Sınıf {c} gereklerine uygun olacaktır.',
    mask: "Lehim maskesi: IPC-SM-840'a uygun LPI (ışığa duyarlı sıvı) maske; renk {colour}; {sides}.",
    maskNone: 'Lehim maskesi: uygulanmayacaktır.',
    legend: 'Serigrafi: iletken olmayan mürekkep; renk {colour}; {sides}.',
    legendNone: 'Serigrafi: uygulanmayacaktır.',
    legendPads: 'Padlerin ve lehimlenecek diğer yüzeylerin üzerinde serigrafi mürekkebi bulunmayacaktır; çakışan yerlerde serigrafi kırpılacaktır.',
    colour: {
      green: 'yeşil', mgreen: 'mat yeşil', black: 'siyah', mblack: 'mat siyah', blue: 'mavi', red: 'kırmızı', white: 'beyaz', yellow: 'sarı',
    },
    sides: { both: 'iki yüzde', top: 'yalnızca üst yüzde', bottom: 'yalnızca alt yüzde' },
    onSides: { both: 'iki yüzde', top: 'üst yüzde', bottom: 'alt yüzde' },
    holes: 'Delik verisindeki çaplar bitmiş delik çaplarıdır.',
    holeTol: 'Delik çapı toleransı: kaplamalı deliklerde ±{p} mm; kaplamasız deliklerde ±{np} mm.',
    holeTolNp: 'Delik çapı toleransı: ±{np} mm (bütün delikler kaplamasızdır).',
    viaOpen: 'Vialar: açık bırakılacak, maske ile kapatılmayacak ve tıkanmayacaktır; lehim maskesi açıklıkları verideki gibi olacaktır.',
    viaOpenBare: 'Vialar: açık bırakılacak; tıkanmayacak ve doldurulmayacaktır.',
    viaTent: 'Vialar: lehim maskesi verisinde tanımlandığı gibi {sides} lehim maskesi ile kapatılacaktır (tenting). Referans: IPC-4761.',
    viaPlug: 'Vialar: tıkanacak ve {sides} lehim maskesi ile örtülecektir. Referans: IPC-4761.',
    viaFill: 'Vialar: iletken olmayan dolgu malzemesiyle doldurulacak, yüzeyi düzlenecek ve bakır kaplama ile kapatılacaktır. Referans: IPC-4761.',
    viaFillPad: 'Vialar: pad içi vialar bunu gerektirdiğinden, iletken olmayan dolgu malzemesiyle doldurulacak, yüzeyi düzlenecek ve bakır kaplama ile kapatılacaktır. Referans: IPC-4761.',
    minimums: 'Tasarımdaki en küçük değerler (bilgi için): iz genişliği {w} mm; iz aralığı {s} mm; bitmiş delik çapı {h} mm.',
    impSe: 'Kontrollü empedans, {layer} katmanı: tek uçlu {z} Ω ±%{tol}; çizimdeki iz genişliği {w} mm; referans katman(lar) {ref}.',
    impDiff: 'Kontrollü empedans, {layer} katmanı: diferansiyel {z} Ω ±%{tol}; çizimdeki iz genişliği {w} mm, iz aralığı {g} mm; referans katman(lar) {ref}.',
    impAdjust: 'Üretici, hedef değerleri sağlamak için kontrollü empedans izlerinin genişliğini ve aralığını en çok ±%{a} değiştirebilir; daha büyük değişiklikler için yazılı onay alınacaktır.',
    impApprove: 'Katman dizilimi; malzemeler, dielektrik kalınlıkları, son iz genişlikleri ve hesaplanan empedanslarla birlikte üretimden önce onaya sunulacaktır.',
    impCoupon: 'Kontrollü empedanslar test kuponlarında TDR ölçümüyle doğrulanacak; test raporu her sevkiyatla birlikte, kuponlar ise istendiğinde teslim edilecektir.',
    outline: 'Kart dış hattının ve iç kesimlerin toleransı: ±{t} mm.',
    dlvSingle: 'Teslim şekli: tekil kart (panelsiz).',
    dlvFab: 'Teslim şekli: panel; panelleme üretici tarafından yapılacak, panel çizimi üretimden önce onaya sunulacaktır.',
    dlvDrawn: 'Teslim şekli: üretim verisinde tanımlanan panel. Panel düzeni yazılı onay olmadan değiştirilmeyecektir.',
    sepTabs: 'Paneldeki kartların ayrılması: freze ile, kırılabilir köprüler bırakılarak.',
    sepVscore: 'Paneldeki kartların ayrılması: V-kesim.',
    xoutYes: 'Paneldeki hatalı kartlar (X-out), açık ve kalıcı biçimde işaretlenmeleri koşuluyla kabul edilir.',
    xoutNo: 'Panelde hatalı kart (X-out) kabul edilmez: her paneldeki bütün kartlar sağlam olacaktır.',
    etest: "Elektriksel test: kartların %100'ü, üretim verisindeki netliste göre açık devre ve kısa devre bakımından IPC-9252'ye uygun olarak test edilecektir.",
    etestNo: 'Elektriksel test: istenmemektedir.',
    bow: 'Eğilme ve burulma: en çok %{b}.',
    markLegend: 'Üretici işareti ve tarih kodu: serigrafi mürekkebiyle, padlerden ve diğer işaretlerden uzak boş bir alana konabilir.',
    markCopper: 'Üretici işareti ve tarih kodu: dış katmanda bakır olarak, bütün iletkenlerden ve işaretlerden uzak boş bir alana konabilir.',
    markNone: 'Kartın üzerine üretici işareti veya tarih kodu konmayacaktır.',
    rohs: "Bitmiş kartlar, değişiklikleriyle birlikte 2011/65/AB sayılı RoHS Direktifi'ne uygun olacaktır.",
    pack: "Paketleme: nem alıcı ile birlikte vakumlu paket; taşıma, paketleme ve depolama IPC-1601'e uygun olacaktır.",
    data: 'Verilen üretim verisi: {fmt}.',
    fmt: { gerber: 'Excellon delik dosyalarıyla birlikte Gerber X2', odb: 'ODB++', ipc2581: 'IPC-2581' },
    dataChange: 'Üretim verisi yazılı onay olmadan değiştirilmeyecektir; bu notların izin verdiği ayarlamalar ile bitmiş ölçüleri değiştirmeyen proses telafileri bunun dışındadır.',
    revisions: 'Anılan standartların sipariş tarihinde yürürlükte olan revizyonları geçerlidir.',
    discrepancy: 'Bu notlar, üretim verisi ve sipariş arasındaki her uyuşmazlık üretimden önce bildirilecek; varsayımla çözülmeyecektir.',
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

/** Fill {name} markers in one pass: a value is never scanned again, so user text cannot inject a marker. */
const fill = (template, vars) => template.replace(/\{(\w+)\}/g, (m, k) => (own(vars, k) ? String(vars[k]) : m));

// Invisible format characters by code point: soft hyphen, Arabic letter mark,
// Mongolian vowel separator, zero-width and direction marks, word joiner and the
// invisible operators, byte-order mark, interlinear annotation marks.
const INVISIBLE = [[0xAD, 0xAD], [0x61C, 0x61C], [0x180E, 0x180E], [0x200B, 0x200F], [0x202A, 0x202E], [0x2060, 0x206F], [0xFEFF, 0xFEFF], [0xFFF9, 0xFFFB]];
const invisible = (c) => INVISIBLE.some(([lo, hi]) => c >= lo && c <= hi);

/**
 * Free text made safe for one line of a note: control characters, line breaks,
 * invisible format characters and runs of blanks become one space, lone
 * surrogates are dropped (they cannot be encoded for the download link), and
 * the result is cut to `max` characters. Anything that is not text gives ''.
 */
export function cleanText(value, max = 60) {
  let s = value;
  if (typeof s === 'number' && Number.isFinite(s)) s = String(s);
  if (typeof s !== 'string') return '';
  const limit = Number.isFinite(max) && max > 0 ? Math.floor(max) : 0;
  let out = '';
  let count = 0;
  let gap = false;
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (ch.length === 1 && c >= 0xD800 && c <= 0xDFFF) continue;
    if (c <= 0x20 || (c >= 0x7F && c <= 0xA0) || invisible(c) || /\s/.test(ch)) {
      gap = out !== '';
      continue;
    }
    if (count + (gap ? 2 : 1) > limit) break;
    if (gap) { out += ' '; count++; gap = false; }
    out += ch;
    count++;
  }
  return out;
}

/** Number as written in a note: at most four decimals, no exponent, decimal comma in Turkish. */
function num(x, lang) {
  const s = String(Number(x.toFixed(4)));
  return lang === 'tr' ? s.replace('.', ',') : s;
}

const inRange = (x, key) => typeof x === 'number' && x >= RANGES[key][0] && x <= RANGES[key][1];

const ASCII = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', Ç: 'C', Ğ: 'G', İ: 'I', Ö: 'O', Ş: 'S', Ü: 'U' };
const slug = (s) => s.replace(/[çğıöşüÇĞİÖŞÜ]/g, (c) => ASCII[c]).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

/** File name for the download: plain ASCII, built from the board name and revision when given. */
export function notesFileName(lang, name = '', rev = '') {
  const base = lang === 'tr' ? 'uretim-notlari' : 'fab-notes';
  const n = slug(cleanText(name, TEXT_MAX.name));
  const r = slug(cleanText(rev, TEXT_MAX.rev));
  return `${[n, r && `rev-${r}`, base].filter(Boolean).join('_')}.txt`;
}

/** The notes as a `data:` URL for a download link; every character outside A–Z a–z 0–9 - _ . ~ is percent-encoded. */
export function notesDataUrl(text) {
  let body = '';
  try {
    body = encodeURIComponent(typeof text === 'string' ? text : '').replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  } catch { /* a lone surrogate cannot be encoded: an empty file rather than an exception */ }
  return `data:text/plain;charset=utf-8,${body}`;
}

/** One impedance row as entered → the cleaned row and the list of what is missing for a complete requirement. */
function readRow(row) {
  const src = row !== null && typeof row === 'object' ? row : {};
  const r = {};
  for (const k of ['layer', 'kind', 'ohms', 'tolPct', 'widthMm', 'gapMm', 'ref']) {
    try { r[k] = src[k]; } catch { r[k] = undefined; }
  }
  const kind = KINDS.includes(r.kind) ? r.kind : null;
  const layer = cleanText(r.layer, TEXT_MAX.layer);
  const ref = cleanText(r.ref, TEXT_MAX.ref);
  const missing = [];
  if (!layer) missing.push('layer');
  if (!kind) missing.push('kind');
  if (!inRange(r.ohms, 'ohms')) missing.push('ohms');
  if (!inRange(r.tolPct, 'tolPct')) missing.push('tol');
  if (!inRange(r.widthMm, 'widthMm')) missing.push('width');
  if (kind === 'diff' && !inRange(r.gapMm, 'gapMm')) missing.push('gap');
  if (!ref) missing.push('ref');
  return { kind, layer, ref, ohms: r.ohms, tolPct: r.tolPct, widthMm: r.widthMm, gapMm: r.gapMm, missing };
}

const failed = (lang, errors, invalid) => ({
  ok: false, errors: [...errors], invalid, lang, title: '', notes: [], text: '', checks: [], summary: null,
});

// ---------------------------------------------------------------------------
// The notes
// ---------------------------------------------------------------------------

/**
 * Fabrication notes from the options (see DEFAULTS; an option left out, or
 * null, takes its default).
 *
 * Returns { ok, lang, title, notes: [{ id, text }], text, checks: [{ id,
 * status: 'ok' | 'warn', vars }], summary }. `text` is the whole block: the
 * title line and the numbered notes, one per line. Invalid input gives
 * { ok: false, errors: [message key, …], invalid: [option name, …] } with an
 * empty block; nothing throws.
 *
 * Options that do not apply are not looked at: inner copper, stack-up and via
 * protection on boards without them, the panel options for single boards,
 * colours of a mask or legend that is not there, the gap of a single-ended row.
 * An incomplete impedance row is left out of the notes and reported in `checks`.
 */
export function fabNotes(options) {
  const src = options !== null && typeof options === 'object' ? options : {};
  const o = {};
  for (const k of Object.keys(DEFAULTS)) {
    let val;
    try { val = src[k]; } catch { val = undefined; }
    o[k] = val ?? DEFAULTS[k];
  }

  const errors = new Set();
  const invalid = [];
  const bad = (key, error) => { errors.add(error); invalid.push(key); };
  const pick = (key, list) => { if (!list.includes(o[key])) bad(key, 'fn_option'); return o[key]; };
  const flag = (key) => { if (typeof o[key] !== 'boolean') bad(key, 'fn_option'); return o[key] === true; };
  const need = (key) => { if (!inRange(o[key], key)) bad(key, 'fn_number'); return o[key]; };

  const lang = LANGS.includes(o.lang) ? o.lang : 'en';
  pick('lang', LANGS);

  const layers = o.layers;
  const layersOk = Number.isInteger(layers) && layers >= 1 && layers <= LAYERS_MAX;
  if (!layersOk) bad('layers', 'fn_layers');
  const plated = layersOk && layers >= 2; // plated holes and vias exist
  const multi = layersOk && layers > 2; // inner layers and a stack-up exist

  const cls = pick('ipcClass', [1, 2, 3]);
  const thicknessMm = need('thicknessMm');
  const thicknessTolPct = need('thicknessTolPct');
  const stackup = pick('stackup', STACKUPS);

  const material = pick('material', MATERIALS);
  const materialText = cleanText(o.materialText, TEXT_MAX.materialText).replace(/[\s.]+$/, '');
  if (material === 'other' && !materialText) bad('materialText', 'fn_material');
  const halogenFree = flag('halogenFree');
  const ul94v0 = flag('ul94v0');

  const outerCuUm = pick('outerCuUm', COPPER_UM);
  const innerCuUm = pick('innerCuUm', COPPER_UM);
  const finish = pick('finish', FINISHES);
  const hardGold = flag('hardGold');

  const maskSides = pick('maskSides', SIDES);
  const maskColour = pick('maskColour', MASK_COLOURS);
  const legendSides = pick('legendSides', SIDES);
  const legendColour = pick('legendColour', LEGEND_COLOURS);

  const minHoleMm = need('minHoleMm');
  const npthTolMm = need('npthTolMm');
  const pthTolMm = plated ? need('pthTolMm') : null;
  const via = pick('via', VIAS);
  const viaInPad = flag('viaInPad');
  const minTraceMm = need('minTraceMm');
  const minSpaceMm = need('minSpaceMm');

  let asked = [];
  if (Array.isArray(o.impedance)) asked = Array.from(o.impedance.slice(0, MAX_ROWS), readRow);
  else bad('impedance', 'fn_option');
  const rows = asked.filter((r) => r.missing.length === 0);
  const adjustPct = asked.length ? need('impedanceAdjustPct') : null;

  const delivery = pick('delivery', DELIVERIES);
  const separation = pick('separation', SEPARATIONS);
  const xouts = flag('xouts');
  const outlineTolMm = need('outlineTolMm');

  const etest = flag('etest');
  const bowTwistPct = need('bowTwistPct');
  const marking = pick('marking', MARKINGS);
  const rohs = flag('rohs');
  const vacuumPack = flag('vacuumPack');
  const dataFormat = pick('dataFormat', DATA_FORMATS);

  if (errors.size) return failed(lang, errors, invalid);

  const T = TEXT[lang];
  const n = (x) => num(x, lang);
  const notes = [];
  const standards = [];
  const add = (id, key, vars = {}, std = []) => {
    notes.push({ id, text: fill(T[key], vars) });
    for (const s of std) if (!standards.includes(s)) standards.push(s);
  };

  // Tenting and covering need solder mask on the board.
  const viaShown = plated ? ((via === 'tent' || via === 'plug') && maskSides === 'none' ? 'open' : via) : null;

  add('class', 'class', { c: cls }, ['IPC-6012']);
  add('accept', 'accept', { c: cls }, ['IPC-A-600']);
  add('layers', layers === 1 ? 'layers1' : layers === 2 ? 'layers2' : 'layers', { n: layers });
  if (multi) add('stackup', stackup === 'drawing' ? 'stackDrawing' : 'stackFab');
  if (material === 'other') add('material', 'matOther', { text: materialText });
  else add('material', 'matFr4', { hf: halogenFree ? T.hf : '', pp: multi ? T.pp : '', tg: TG_C[material] }, ['IPC-4101']);
  if (ul94v0) add('flammability', 'ul', {}, ['UL 94']);
  add('thickness', 'thickness', { t: n(thicknessMm), tol: n(thicknessTolPct) });
  add('cuOuter', layers === 1 ? 'cuSingle' : 'cuOuter', { um: outerCuUm, oz: n(COPPER_OZ[outerCuUm]) });
  if (multi) add('cuInner', 'cuInner', { um: innerCuUm, oz: n(COPPER_OZ[innerCuUm]) });
  const finishStd = { enig: 'IPC-4552', imag: 'IPC-4553', imsn: 'IPC-4554', enepig: 'IPC-4556' }[finish];
  add('finish', hardGold ? 'finishGold' : 'finish', { f: T.fin[finish] }, finishStd ? [finishStd] : []);
  if (hardGold) add('gold', 'gold', { c: cls }, ['IPC-6012']);
  if (maskSides === 'none') add('mask', 'maskNone');
  else add('mask', 'mask', { colour: T.colour[maskColour], sides: T.sides[maskSides] }, ['IPC-SM-840']);
  if (legendSides === 'none') add('legend', 'legendNone');
  else {
    add('legend', 'legend', { colour: T.colour[legendColour], sides: T.sides[legendSides] });
    add('legendPads', 'legendPads');
  }
  add('holes', 'holes');
  if (plated) add('holeTol', 'holeTol', { p: n(pthTolMm), np: n(npthTolMm) });
  else add('holeTol', 'holeTolNp', { np: n(npthTolMm) });
  if (viaShown === 'open') add('via', maskSides === 'none' ? 'viaOpenBare' : 'viaOpen');
  else if (viaShown === 'tent') add('via', 'viaTent', { sides: T.onSides[maskSides] }, ['IPC-4761']);
  else if (viaShown === 'plug') add('via', 'viaPlug', { sides: T.onSides[maskSides] }, ['IPC-4761']);
  else if (viaShown === 'fill') add('via', viaInPad ? 'viaFillPad' : 'viaFill', {}, ['IPC-4761']);
  add('minimums', 'minimums', { w: n(minTraceMm), s: n(minSpaceMm), h: n(minHoleMm) });
  rows.forEach((r, i) => {
    add(`imp${i + 1}`, r.kind === 'diff' ? 'impDiff' : 'impSe', {
      layer: r.layer, z: n(r.ohms), tol: n(r.tolPct), w: n(r.widthMm), g: r.kind === 'diff' ? n(r.gapMm) : '', ref: r.ref,
    });
  });
  if (rows.length) {
    add('impAdjust', 'impAdjust', { a: n(adjustPct) });
    add('impApprove', 'impApprove');
    add('impCoupon', 'impCoupon');
  }
  add('outline', 'outline', { t: n(outlineTolMm) });
  const panel = delivery !== 'single';
  add('delivery', delivery === 'fab' ? 'dlvFab' : delivery === 'drawn' ? 'dlvDrawn' : 'dlvSingle');
  if (panel) {
    add('separation', separation === 'vscore' ? 'sepVscore' : 'sepTabs');
    add('xouts', xouts ? 'xoutYes' : 'xoutNo');
  }
  if (etest) add('etest', 'etest', {}, ['IPC-9252']);
  else add('etest', 'etestNo');
  add('bow', 'bow', { b: n(bowTwistPct) });
  add('marking', marking === 'copper' ? 'markCopper' : marking === 'none' ? 'markNone' : 'markLegend');
  if (rohs) add('rohs', 'rohs', {}, ['2011/65/EU']);
  if (vacuumPack) add('packing', 'pack', {}, ['IPC-1601']);
  add('data', 'data', { fmt: T.fmt[dataFormat] }, dataFormat === 'ipc2581' ? ['IPC-2581'] : []);
  add('dataChange', 'dataChange');
  add('revisions', 'revisions');
  add('discrepancy', 'discrepancy');

  const name = cleanText(o.name, TEXT_MAX.name);
  const rev = cleanText(o.rev, TEXT_MAX.rev);
  const revText = rev ? fill(T.rev, { rev }) : '';
  const tail = [name, revText].filter(Boolean).join(', ');
  const title = tail ? `${T.title} - ${tail}` : T.title;
  const text = [title, ...notes.map((note, i) => `${i + 1}. ${note.text}`)].join('\n');

  // ---- Things to settle before sending ----
  const checks = [];
  const check = (id, kase, vars = {}) => checks.push({ id, status: OK_CASES.includes(kase) ? 'ok' : 'warn', vars: { case: kase, ...vars } });

  if (asked.length) {
    const open = asked.map((r, i) => ({ row: i + 1, missing: r.missing })).filter((r) => r.missing.length);
    check('imp', open.length ? 'warn' : 'ok', { asked: asked.length, complete: rows.length, rows: open });
  }
  if (multi) check('stackup', stackup === 'drawing' ? 'drawing' : rows.length ? 'approval' : 'none', { layers });
  check('class', cls === 3 ? 'warn' : 'ok', { c: cls });
  const thinMm = Math.max(RULES.thicknessMinMm, Number((RULES.thicknessPerLayerMm * layers).toFixed(6)));
  check('thin', thicknessMm < thinMm ? 'warn' : 'ok', { thicknessMm, limitMm: thinMm, layers });
  check('thicknessTol', thicknessTolPct < RULES.thicknessTolPct ? 'warn' : 'ok', { tolPct: thicknessTolPct, usualPct: RULES.thicknessTolPct });
  if (plated) {
    const ratio = thicknessMm / minHoleMm;
    check('aspect', ratio > RULES.aspectMax * (1 + 1e-9) ? 'warn' : 'ok', { ratio, limit: RULES.aspectMax, thicknessMm, holeMm: minHoleMm });
  }
  const copperUm = multi ? Math.max(outerCuUm, innerCuUm) : outerCuUm;
  const featureMm = Math.min(minTraceMm, minSpaceMm);
  const featureLimitMm = RULES.featureMmByCopperUm[copperUm];
  check('copper', featureMm < featureLimitMm ? 'warn' : 'ok', { copperUm, limitMm: featureLimitMm, featureMm });
  if (finish === 'hasl') check('hasl', featureMm < RULES.haslFeatureMm ? 'warn' : 'ok', { featureMm, limitMm: RULES.haslFeatureMm });
  if (plated && (via === 'fill' || viaInPad)) check('viaInPad', via === 'fill' ? (viaInPad ? 'match' : 'noNeed') : 'open', { via });
  if (plated && (via === 'tent' || via === 'plug')) check('viaMask', maskSides === 'none' ? 'warn' : 'ok', { via, maskSides });
  if (marking === 'legend') check('marking', legendSides === 'none' ? 'warn' : 'ok');
  check('etest', etest ? 'ok' : 'warn', { dataFormat });

  return {
    ok: true,
    lang,
    title,
    notes,
    text,
    checks,
    summary: {
      count: notes.length,
      layers,
      thicknessMm,
      finish,
      warnings: checks.filter((c) => c.status === 'warn').length,
      impedanceAsked: asked.length,
      impedanceRows: rows.length,
      standards,
      fileName: notesFileName(lang, name, rev),
    },
  };
}
