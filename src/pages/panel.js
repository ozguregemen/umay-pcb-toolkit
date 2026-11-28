import { panel, withTolerance, RAILS } from '../engine/panel.js';
import { toMm, lengthUnits } from '../engine/units.js';
import { heroes, rows, block, steps, messages, invalid } from '../ui/calculator.js';
import { tx } from '../ui/math.js';
import { fmt, esc } from '../ui/format.js';
import { t, locale } from '../i18n.js';
import { svg, rect, path, text, dimH, dimV } from '../ui/svg.js';

const strings = {
  tr: {
    pn_ex: 'Örnek',
    pn_exInfo: 'Bir örnek seçildiğinde kart, panel, ray ve aralık alanları örnek değerlerle doldurulur; sonra istediğiniz alanı değiştirebilirsiniz. Sipariş adedi ve verim olduğu gibi kalır.',
    pn_exNone: 'Örnek seçin…',
    pn_ex1: '50 × 35 mm kart, 250 × 200 mm panel, freze 2 mm, üstte ve altta ray',
    pn_ex2: '100 × 80 mm kart, 250 × 200 mm panel, V-kesim, üstte ve altta ray',
    pn_ex3: 'Eurocard 100 × 160 mm, 457 × 610 mm üretim paneli, freze 2 mm, dört kenarda 10 mm pay',
    pn_ex4: '20 × 15 mm modül, 100 × 100 mm panel, V-kesim, dört kenarda ray',
    pn_secBoard: 'Kart',
    pn_bw: 'Kart genişliği (w)',
    pn_bh: 'Kart yüksekliği (h)',
    pn_bInfo: 'Kartın dış ölçüleri, çizildiği yönde. Dikdörtgen olmayan kartta kartı içine alan en küçük dikdörtgeni girin.',
    pn_secPanel: 'Panel',
    pn_pp: 'Panel ölçüsü örneği (tipik)',
    pn_ppHint: 'Tipik ölçülerdir; hangi panel ölçülerinin kabul edildiğini PCB üreticinize ve dizgi firmanıza sorun.',
    pn_ppNone: 'Ölçü seçin…',
    pn_pp100: '100 × 100 mm',
    pn_ppEuro: '160 × 100 mm (Eurocard)',
    pn_pp250: '250 × 200 mm',
    pn_ppProd: '457 × 610 mm (18 × 24 inç üretim paneli)',
    pn_pw: 'Panel genişliği (W)',
    pn_ph: 'Panel yüksekliği (H)',
    pn_pInfo: 'Teslim panelinin (dizgi hattına giren panelin) ya da üretim panelinin dış ölçüsü. Üretim panelinde üreticinin kenarlarda bıraktığı işlem payını ray olarak girin.',
    pn_rails: 'Raylar (kenar şeritleri)',
    pn_railsInfo: 'Ray, panelin kenarında kart bulunmayan şerittir: dizgi hattının konveyörü paneli buradan tutar; fiducial’lar ve takım delikleri de buraya konur.',
    pn_rNone: 'Yok',
    pn_rTb: 'Üst ve alt',
    pn_rLr: 'Sol ve sağ',
    pn_rAll: 'Dört kenar',
    pn_rw: 'Ray genişliği (r)',
    pn_secLay: 'Yerleşim',
    pn_sep: 'Kartların ayrılması',
    pn_sepInfo: 'V-kesim: kartlar bitişik dizilir (aralık 0) ve kesim çizgisi paneli bir kenardan öbürüne boydan boya geçer. Freze: kartların arasından freze ucu geçer, kartlar panele köprülerle tutunur; aralık en az freze ucunun çapı kadardır (tipik 2 mm, üreticinize sorun). Seçim yalnızca aralığın örnek değerini değiştirir; aralığı ayrıca düzenleyebilirsiniz.',
    pn_sepV: 'V-kesim',
    pn_sepR: 'Freze (köprülü)',
    pn_g: 'Kartlar arası aralık (g)',
    pn_e: 'Kart ile ray arası aralık (e)',
    pn_eHint: 'Boş bırakılırsa kartlar arası aralık kullanılır. Yalnızca ray bulunan kenarlarda uygulanır.',
    pn_rot: 'Kart yönü',
    pn_rotInfo: 'Bütün kartlar aynı yönde dizilir. “İkisinden iyisi” daha çok kart sığan yönü seçer; eşitlikte kart çizildiği gibi kalır.',
    pn_rotAsis: 'Çizildiği gibi (0°)',
    pn_rot90: '90° döndürülmüş',
    pn_rotBest: 'İkisinden iyisi',
    pn_secOrder: 'Sipariş',
    pn_qty: 'Sipariş adedi (kart)',
    pn_yld: 'Beklenen verim (y)',
    pn_yldHint: 'Üretim ve dizgiden sağlam çıkması beklenen kartların oranı. Boş bırakılırsa %100 alınır.',

    pn_count: 'Paneldeki kart sayısı',
    pn_subLay: '{o} · {nx} sütun × {ny} satır',
    pn_o0: '0° (çizildiği gibi)',
    pn_o90: '90° döndürülmüş',
    pn_used: 'Kullanılan alan',
    pn_subWaste: 'fire {p}',
    pn_r0: '0° yerleşimde kart sayısı',
    pn_r90: '90° yerleşimde kart sayısı',
    pn_grid: '{n} ({nx} × {ny})',
    pn_usable: 'Kullanılabilir alan (raylar düşülmüş)',
    pn_span: 'Kartlara kalan açıklık (kart–ray aralığı düşülmüş)',
    pn_array: 'Kart dizisinin dış ölçüsü',
    pn_waste: 'Fire (kart olmayan alan)',
    pn_areas: 'Kart alanı / panel alanı',
    pn_leftX: 'Yatayda artan şerit',
    pn_leftY: 'Düşeyde artan şerit',
    pn_moreX: 'Bir sütun daha için',
    pn_moreY: 'Bir satır daha için',
    pn_moreVal: 'kart {dim} en çok {b} olmalı ({d} küçülmeli)',
    pn_moreGap: 'ya da aralık en çok {g} olmalı',
    pn_moreNo: 'bu panelde olanaksız',
    pn_dimW: 'genişliği',
    pn_dimH: 'yüksekliği',
    pn_panels: 'Gereken panel sayısı',
    pn_panelsSub: '{q} kart için',
    pn_boards: 'Bu panellerdeki toplam kart',
    pn_good: 'Beklenen sağlam kart',
    pn_spare: 'Siparişten artan kart (beklenen)',
    pn_spareAll: '{a} · bütün kartlar sağlam çıkarsa {b}',
    pn_orderNone: 'Panele kart sığmadığı için panel sayısı hesaplanamaz.',
    err_pn_noFit: 'Kart bu yönde panele sığmıyor: panelde 0 kart. Kartlara kalan açıklık {s}, kart {b}.',
    err_pn_noFitAny: 'Kart iki yönde de panele sığmıyor: panelde 0 kart. Kartlara kalan açıklık {s}, kart {b}.',
    warn_pn_otherBetter: 'Öbür yönde ({o}) panele {n} kart sığıyor; seçilen yönde {m}.',
    warn_pn_noRail: 'Ray yok: kartlar panel kenarına kadar gelebilir. Dizgi hattının konveyörü paneli karşılıklı iki kenarından tutar ve orada bileşensiz bir şerit ister (tipik kılavuz değer 3–5 mm; dizgi firmanıza sorun). Ray ekleyin ya da kartın o iki kenarında bu boşluğu bırakın.',
    warn_pn_routedZero: 'Freze seçili ama kartlar arası aralık 0: freze ucunun geçmesi için ucun çapı kadar aralık gerekir (tipik 2 mm, üreticinize sorun). Bitişik dizilim için V-kesimi seçin.',
    warn_pn_moreCol: 'Bir sütun daha sığmasına az kaldı: kart {dim} {d} küçülürse ({a} → {b}) panele {n} kart sığar.',
    warn_pn_moreRow: 'Bir satır daha sığmasına az kaldı: kart {dim} {d} küçülürse ({a} → {b}) panele {n} kart sığar.',
    err_pn_positive: 'Kart ve panel ölçüleri sıfırdan büyük; aralıklar ve ray genişliği sıfır ya da pozitif birer sayı olmalı.',
    err_pn_rails: 'Raylar panelin tamamını kaplıyor: raylar düşüldükten sonra kullanılabilir alan kalmıyor.',
    err_pn_qty: 'Sipariş adedi sıfırdan büyük bir tam sayı olmalı.',
    err_pn_yield: 'Verim %0’dan büyük, en çok %100 olmalı.',
    err_pn_range: 'Bu değerlerle sonuç sayı aralığının dışına çıkıyor; girdileri kontrol edin.',

    pn_sUw: 'Kullanılabilir genişlik (raylar düşülmüş)',
    pn_sUh: 'Kullanılabilir yükseklik (raylar düşülmüş)',
    pn_sSx: 'Kartlara kalan açıklık, yatay',
    pn_sSy: 'Kartlara kalan açıklık, düşey',
    pn_stepNoRailX: 'Sol ve sağ kenarda ray yok: bu yönde panelin tamamı kullanılır, kart–ray aralığı uygulanmaz.',
    pn_stepNoRailY: 'Üst ve alt kenarda ray yok: bu yönde panelin tamamı kullanılır, kart–ray aralığı uygulanmaz.',
    pn_sQx0: '0°: sütun sayısı, aşağı yuvarlamadan önce',
    pn_sQy0: '0°: satır sayısı, aşağı yuvarlamadan önce',
    pn_sQx90: '90°: sütun sayısı, aşağı yuvarlamadan önce',
    pn_sQy90: '90°: satır sayısı, aşağı yuvarlamadan önce',
    pn_stepFloor: '⌊ ⌋ aşağı yuvarlar: yalnızca tam kartlar sayılır (sonuç negatifse 0). Bir açıklığa n kart ve n − 1 aralık sığmalıdır: n·b + (n − 1)·g ≤ S, yani n ≤ (S + g) / (b + g).',
    pn_stepTurn: '90° yerleşimde kartın yüksekliği yatayda, genişliği düşeyde kalır.',
    pn_sPick: 'Seçilen yön',
    pn_stepPick: 'Daha çok kart sığan yön seçilir; eşitlikte kart çizildiği gibi (0°) kalır.',
    pn_sMoreX: 'Bir sütun daha için en büyük kart ölçüsü (yatayda)',
    pn_sMoreY: 'Bir satır daha için en büyük kart ölçüsü (düşeyde)',
    pn_sPanelsQ: 'Panel sayısı, yukarı yuvarlamadan önce',
    pn_stepCeil: '⌈ ⌉ yukarı yuvarlar: panel yalnızca tam sayıda sipariş edilir.',
    pn_whNx: 'Seçilen yöndeki sütun sayısı, ⌊qx⌋',
    pn_whNy: 'Seçilen yöndeki satır sayısı, ⌊qy⌋',
    pn_note: 'Bütün kartlar aynı yönde dizilir: 90° seçeneğinde dizinin tamamı döner. Yönlerin karıştırıldığı (bazı kartların döndürüldüğü) yerleşimler aranmaz; böyle bir yerleşim bazen daha çok kart sığdırır. Kart, dış ölçüleriyle bir dikdörtgen sayılır ve dizi kendi açıklığında ortalanır. Fiducial’lar, takım delikleri, test kuponları ve köprülerin yeri hesaba katılmaz; üretim panelinde üreticinin kenarlarda bıraktığı işlem payını ray olarak girin. Panel ölçüleri, ray genişliği ve aralıklar üreticiye ve dizgi hattına göre değişir: son yerleşimi üreticiniz ve dizgi firmanızla doğrulayın.',
    pn_ref: 'Geometri: bir açıklığa n kart ve n − 1 aralık sığmalıdır (türetme adımlardadır)',

    pn_dgAria: 'Panelin ölçekli üstten görünümü: raylar, seçilen yönde dizilmiş kartlar, aralıklar ve panel ölçüleri',
    pn_dgTitle: '{n} kart · {o} · {nx} × {ny}',
    pn_dgGeneric: 'panel yerleşimi',
    pn_dgNoFit: 'kart sığmıyor',
    pn_dgBoard: 'kart',
    pn_dgRail: 'ray',
    pn_dgFree: 'boş alan',
    pn_dgUsed: 'kullanılan alan {p}',
    pn_dgCapped: '{n} kart tek tek çizilmedi (en çok {max} kart çizilir):',
    pn_dgCapped2: 'dolu alan kart dizisinin tamamını gösterir.',
  },
  en: {
    pn_ex: 'Example',
    pn_exInfo: 'Picking an example fills the board, panel, rail and gap fields with example values; change any of them afterwards. Order quantity and yield stay as they are.',
    pn_exNone: 'Pick an example…',
    pn_ex1: '50 × 35 mm board, 250 × 200 mm panel, routed 2 mm, rails top and bottom',
    pn_ex2: '100 × 80 mm board, 250 × 200 mm panel, V-score, rails top and bottom',
    pn_ex3: 'Eurocard 100 × 160 mm, 457 × 610 mm production panel, routed 2 mm, 10 mm border on all four edges',
    pn_ex4: '20 × 15 mm module, 100 × 100 mm panel, V-score, rails on all four edges',
    pn_secBoard: 'Board',
    pn_bw: 'Board width (w)',
    pn_bh: 'Board height (h)',
    pn_bInfo: 'Outer dimensions of the board as it is drawn. For a board that is not a rectangle, enter the smallest rectangle that contains it.',
    pn_secPanel: 'Panel',
    pn_pp: 'Panel size example (typical)',
    pn_ppHint: 'Typical sizes; ask your fabricator and your assembler which panel sizes they accept.',
    pn_ppNone: 'Pick a size…',
    pn_pp100: '100 × 100 mm',
    pn_ppEuro: '160 × 100 mm (Eurocard)',
    pn_pp250: '250 × 200 mm',
    pn_ppProd: '457 × 610 mm (18 × 24 in production panel)',
    pn_pw: 'Panel width (W)',
    pn_ph: 'Panel height (H)',
    pn_pInfo: 'Outer size of the delivery panel (the panel that enters the assembly line) or of the production panel. On a production panel enter the border the fabricator keeps at the edges as rails.',
    pn_rails: 'Rails (edge strips)',
    pn_railsInfo: 'A rail is a strip without boards along a panel edge: the conveyor of the assembly line holds the panel there, and fiducials and tooling holes go there as well.',
    pn_rNone: 'None',
    pn_rTb: 'Top and bottom',
    pn_rLr: 'Left and right',
    pn_rAll: 'All four',
    pn_rw: 'Rail width (r)',
    pn_secLay: 'Layout',
    pn_sep: 'Board separation',
    pn_sepInfo: 'V-score: the boards touch (gap 0) and the score line runs straight across the panel from edge to edge. Routed: a router bit passes between the boards, which stay attached by tabs; the gap is at least the bit diameter (typically 2 mm, ask your fabricator). The choice only changes the example value of the gap; the gap can be edited on its own.',
    pn_sepV: 'V-score',
    pn_sepR: 'Routed (tabs)',
    pn_g: 'Gap between boards (g)',
    pn_e: 'Gap between boards and rails (e)',
    pn_eHint: 'Left empty, the gap between boards is used. It applies only on edges that have a rail.',
    pn_rot: 'Board orientation',
    pn_rotInfo: 'All boards have the same orientation. “Best of the two” picks the orientation that holds more boards; in a tie the board stays as drawn.',
    pn_rotAsis: 'As drawn (0°)',
    pn_rot90: 'Rotated 90°',
    pn_rotBest: 'Best of the two',
    pn_secOrder: 'Order',
    pn_qty: 'Order quantity (boards)',
    pn_yld: 'Expected yield (y)',
    pn_yldHint: 'Share of the boards expected to come out of fabrication and assembly good. Left empty, 100 % is used.',

    pn_count: 'Boards per panel',
    pn_subLay: '{o} · {nx} columns × {ny} rows',
    pn_o0: '0° (as drawn)',
    pn_o90: 'rotated 90°',
    pn_used: 'Used area',
    pn_subWaste: 'waste {p}',
    pn_r0: 'Boards at 0°',
    pn_r90: 'Boards at 90°',
    pn_grid: '{n} ({nx} × {ny})',
    pn_usable: 'Usable area (panel minus rails)',
    pn_span: 'Span left for the boards (minus the board-to-rail gap)',
    pn_array: 'Outer size of the board array',
    pn_waste: 'Waste (area without boards)',
    pn_areas: 'Board area / panel area',
    pn_leftX: 'Leftover strip, horizontal',
    pn_leftY: 'Leftover strip, vertical',
    pn_moreX: 'For one more column',
    pn_moreY: 'For one more row',
    pn_moreVal: 'board {dim} at most {b} ({d} smaller)',
    pn_moreGap: 'or a gap of at most {g}',
    pn_moreNo: 'not possible on this panel',
    pn_dimW: 'width',
    pn_dimH: 'height',
    pn_panels: 'Panels needed',
    pn_panelsSub: 'for {q} boards',
    pn_boards: 'Boards on these panels',
    pn_good: 'Good boards expected',
    pn_spare: 'Boards beyond the order (expected)',
    pn_spareAll: '{a} · {b} if every board is good',
    pn_orderNone: 'No board fits the panel, so the number of panels cannot be calculated.',
    err_pn_noFit: 'The board does not fit the panel in this orientation: 0 boards per panel. The span left for the boards is {s}, the board is {b}.',
    err_pn_noFitAny: 'The board does not fit the panel in either orientation: 0 boards per panel. The span left for the boards is {s}, the board is {b}.',
    warn_pn_otherBetter: 'The other orientation ({o}) holds {n} boards per panel; the chosen one holds {m}.',
    warn_pn_noRail: 'No rails: the boards may reach the panel edge. The conveyor of an assembly line holds the panel by two opposite edges and needs a strip without components there (typical guidance 3–5 mm; ask your assembler). Add rails, or keep that clearance on those two edges of the board.',
    warn_pn_routedZero: 'Routing is selected but the gap between boards is 0: a router bit needs a gap of its own diameter (typically 2 mm, ask your fabricator). For boards that touch, choose V-score.',
    warn_pn_moreCol: 'One more column almost fits: with the board {dim} {d} smaller ({a} → {b}) the panel holds {n} boards.',
    warn_pn_moreRow: 'One more row almost fits: with the board {dim} {d} smaller ({a} → {b}) the panel holds {n} boards.',
    err_pn_positive: 'Board and panel dimensions must be greater than zero; gaps and the rail width must be zero or positive numbers.',
    err_pn_rails: 'The rails cover the whole panel: no usable area is left after subtracting them.',
    err_pn_qty: 'The order quantity must be a whole number greater than zero.',
    err_pn_yield: 'The yield must be above 0 % and at most 100 %.',
    err_pn_range: 'With these values the result leaves the number range; check the inputs.',

    pn_sUw: 'Usable width (panel minus rails)',
    pn_sUh: 'Usable height (panel minus rails)',
    pn_sSx: 'Span left for the boards, horizontal',
    pn_sSy: 'Span left for the boards, vertical',
    pn_stepNoRailX: 'No rail on the left and right edges: the whole panel is used in this direction and no board-to-rail gap applies.',
    pn_stepNoRailY: 'No rail on the top and bottom edges: the whole panel is used in this direction and no board-to-rail gap applies.',
    pn_sQx0: '0°: columns before rounding down',
    pn_sQy0: '0°: rows before rounding down',
    pn_sQx90: '90°: columns before rounding down',
    pn_sQy90: '90°: rows before rounding down',
    pn_stepFloor: '⌊ ⌋ rounds down: only whole boards count (0 if the result is negative). n boards and n − 1 gaps must fit in a span: n·b + (n − 1)·g ≤ S, that is n ≤ (S + g) / (b + g).',
    pn_stepTurn: 'At 90° the board height lies along the horizontal direction and its width along the vertical one.',
    pn_sPick: 'Orientation chosen',
    pn_stepPick: 'The orientation that holds more boards is chosen; in a tie the board stays as drawn (0°).',
    pn_sMoreX: 'Largest board dimension for one more column (horizontal)',
    pn_sMoreY: 'Largest board dimension for one more row (vertical)',
    pn_sPanelsQ: 'Panels before rounding up',
    pn_stepCeil: '⌈ ⌉ rounds up: panels are ordered in whole numbers only.',
    pn_whNx: 'Columns in the chosen orientation, ⌊qx⌋',
    pn_whNy: 'Rows in the chosen orientation, ⌊qy⌋',
    pn_note: 'All boards have the same orientation: with the 90° option the whole array is turned. Layouts that mix orientations (some boards turned) are not searched; such a layout sometimes holds more boards. The board is taken as the rectangle of its outer dimensions, and the array is centred in its span. Fiducials, tooling holes, test coupons and the position of the tabs are not considered; on a production panel enter the border the fabricator keeps at the edges as rails. Panel sizes, rail width and gaps depend on the fabricator and the assembly line: confirm the final layout with your fabricator and your assembler.',
    pn_ref: 'Geometry: n boards and n − 1 gaps must fit in a span (derivation in the steps)',

    pn_dgAria: 'Top view of the panel to proportion: rails, the boards in the chosen orientation, the gaps and the panel dimensions',
    pn_dgTitle: '{n} boards · {o} · {nx} × {ny}',
    pn_dgGeneric: 'panel layout',
    pn_dgNoFit: 'the board does not fit',
    pn_dgBoard: 'board',
    pn_dgRail: 'rail',
    pn_dgFree: 'free area',
    pn_dgUsed: 'used area {p}',
    pn_dgCapped: '{n} boards are not drawn one by one (at most {max} are drawn):',
    pn_dgCapped2: 'the filled area stands for the whole array.',
  },
};

const LEN = ['mm', 'in', 'mil'];

// Display
const mmT = (x, sig = 4) => `${fmt(x, sig)} mm`;
const sizeT = (a, b, sig = 4) => `${fmt(a, sig)} × ${fmt(b, sig)} mm`;
const int = (x) => fmt(x, 12); // whole numbers are never rounded to four digits
const pctT = (x) => new Intl.NumberFormat(locale(), { style: 'percent', maximumFractionDigits: 1, useGrouping: false }).format(x);
// A largest dimension is rounded down and a smallest reduction up (to 0.01 mm), so that the value shown really fits.
const downT = (x) => mmT(Math.floor(x * 100 + 1e-7) / 100, 7);
const upT = (x) => mmT(Math.ceil(x * 100 - 1e-7) / 100, 7);
const angle = (fit) => (fit.rotated ? '90°' : '0°');

// ---------------------------------------------------------------------------
// Diagram: the panel to proportion, with rails and boards
// ---------------------------------------------------------------------------

const clamp = (x, lo, hi) => (x > hi ? hi : x >= lo ? x : lo);
const n1 = (x) => Math.round(x * 10) / 10;
/** More boards than this are drawn as one block, with a note in the caption. */
export const MAX_DRAWN = 400;

/** Without a result: a small panel with the rails and the separation chosen, labelled with symbols. */
const sketch = (v) => panel({
  boardWMm: 68, boardHMm: 50, panelWMm: 250, panelHMm: 180,
  rails: RAILS.includes(v.rails) ? v.rails : 'tb', railMm: 12, gapMm: v.sep === 'vscore' ? 0 : 7, sep: v.sep, orient: 'asis',
});

function draw(d, live) {
  const X0 = 44;
  const Y0 = 40;
  const MAXW = 300;
  const MAXH = 190;
  const MINPX = 30;
  const W = d.panelWMm;
  const H = d.panelHMm;
  // To proportion; a very long panel is clamped so that both sides stay visible.
  const s = Math.min(MAXW / W, MAXH / H);
  const pw = clamp(W * s, MINPX, MAXW);
  const ph = clamp(H * s, MINPX, MAXH);
  const sx = pw / W;
  const sy = ph / H;
  const x0 = X0 + (MAXW - pw) / 2;
  const y0 = Y0;
  const px = (mm) => clamp(mm * sx, 0, pw);
  const py = (mm) => clamp(mm * sy, 0, ph);
  const fit = d.fit;
  const cls = live ? 'val' : 'sym';

  let b = rect(x0, y0, pw, ph, 'soft');
  // Rails
  const { rail } = d;
  if (rail.top > 0) b += rect(x0, y0, pw, py(rail.top), 'diel');
  if (rail.bottom > 0) b += rect(x0, y0 + ph - py(rail.bottom), pw, py(rail.bottom), 'diel');
  if (rail.left > 0) b += rect(x0, y0, px(rail.left), ph, 'diel');
  if (rail.right > 0) b += rect(x0 + pw - px(rail.right), y0, px(rail.right), ph, 'diel');

  // Boards
  const capped = fit.count > MAX_DRAWN;
  const bw = px(fit.boardXMm);
  const bh = py(fit.boardYMm);
  const ox = x0 + px(fit.originXMm);
  const oy = y0 + py(fit.originYMm);
  const pitchX = (fit.boardXMm + d.gapMm) * sx;
  const pitchY = (fit.boardYMm + d.gapMm) * sy;
  if (capped) {
    b += rect(ox, oy, px(fit.arrayWMm), py(fit.arrayHMm), 'zone-ok');
  } else {
    for (let j = 0; j < fit.ny; j++) {
      for (let i = 0; i < fit.nx; i++) b += rect(ox + i * pitchX, oy + j * pitchY, bw, bh, 'zone-ok');
    }
    // V-score: the score lines run across the whole panel.
    if (d.sep === 'vscore' && d.gapMm === 0 && fit.count > 0) {
      let cut = '';
      for (let i = 0; i <= fit.nx; i++) cut += `M${n1(ox + i * pitchX)},${n1(y0)}V${n1(y0 + ph)}`;
      for (let j = 0; j <= fit.ny; j++) cut += `M${n1(x0)},${n1(oy + j * pitchY)}H${n1(x0 + pw)}`;
      b += path(cut, 'dim');
    }
  }
  if (fit.count === 0) {
    b += text(x0 + pw / 2, y0 + ph / 2 + 4, t('pn_dgNoFit'), { cls: 'badt' });
  } else if ((capped ? px(fit.arrayWMm) : bw) >= 62 && (capped ? py(fit.arrayHMm) : bh) >= 16) {
    // Size of one board, written into the first one (or the count into the block).
    const label = capped ? int(fit.count) : live ? `${fmt(fit.boardXMm, 3)} × ${fmt(fit.boardYMm, 3)}` : (fit.rotated ? 'h × w' : 'w × h');
    b += text(ox + (capped ? px(fit.arrayWMm) : bw) / 2, oy + (capped ? py(fit.arrayHMm) : bh) / 2 + 4, label, { cls });
  }

  // Captions and dimensions
  const title = live
    ? t('pn_dgTitle', { n: int(fit.count), o: angle(fit), nx: int(fit.nx), ny: int(fit.ny) })
    : t('pn_dgGeneric');
  b += text(X0, 14, title, { cls: live ? 'val' : 'title', anchor: 'start' });
  if (live) {
    const parts = [`w × h = ${sizeT(d.boardWMm, d.boardHMm, 3)}`, `g = ${mmT(d.gapMm, 3)}`];
    if (d.railMm > 0) parts.push(`r = ${mmT(d.railMm, 3)}`, `e = ${mmT(d.edgeMm, 3)}`);
    b += text(X0, 29, parts.join(' · '), { anchor: 'start' });
  }
  b += dimH(x0, x0 + pw, y0 + ph + 14, live ? `W = ${mmT(W)}` : 'W', { below: true, extFrom: y0 + ph + 2, cls })
    + dimV(y0, y0 + ph, x0 + pw + 14, live ? `H = ${mmT(H)}` : 'H', { extFrom: x0 + pw + 2, cls });
  // Legend
  const yl = y0 + ph + 48;
  const keys = [['zone-ok', 'pn_dgBoard'], d.railMm > 0 && ['diel', 'pn_dgRail'], ['soft', 'pn_dgFree']].filter(Boolean);
  keys.forEach(([c, label], i) => {
    b += rect(X0 + i * 78, yl - 9, 11, 10, c) + text(X0 + i * 78 + 16, yl, t(label), { anchor: 'start' });
  });
  if (live) b += text(X0 + 250, yl, t('pn_dgUsed', { p: pctT(d.usedFrac) }), { cls: 'val', anchor: 'start' });
  let height = yl + 12;
  if (capped) {
    b += text(X0, yl + 18, t('pn_dgCapped', { n: int(fit.count), max: int(MAX_DRAWN) }), { anchor: 'start' })
      + text(X0, yl + 32, t('pn_dgCapped2'), { anchor: 'start' });
    height += 32;
  }
  const out = svg(480, Math.round(height), b, t('pn_dgAria'), { wide: true });
  return /NaN|Infinity|undefined/.test(out) ? null : out;
}

function diagram(v, u, r) {
  return (r && draw(r, true)) || draw(sketch(v), false);
}

// ---------------------------------------------------------------------------
// Calculation steps
// ---------------------------------------------------------------------------

const mmq = (x) => tx(`${fmt(x, 7)} mm`);
const iq = (x) => tx(int(x));
const pq = (x) => tx(`${fmt(x * 100, 6)} %`);
/**
 * A quotient that is rounded to a whole number next (⌊ ⌋ or ⌈ ⌉): three
 * decimals and at least four significant digits, but never rounded onto a
 * whole number it does not count as — 4.99996 is not shown as 5 before ⌊ ⌋,
 * nor 5.00004 as 5 before ⌈ ⌉; such a value keeps the decimals that tell it
 * apart. A value within the engine's tolerance of a whole number is shown as
 * that number, because the engine counts it as that number.
 */
function quot(q) {
  const plain = (x) => tx(x !== 0 && (Math.abs(x) >= 1e9 || Math.abs(x) < 1e-6) ? fmt(x, 4) : fmt(x, 15));
  const whole = Math.round(q);
  if (Math.abs(q - whole) <= withTolerance(q) - q) return plain(whole);
  for (let d = Math.max(3, 3 - Math.floor(Math.log10(Math.abs(q)))); d <= 15; d++) {
    const x = Number(q.toFixed(d));
    if (!Number.isInteger(x)) return plain(x);
  }
  return plain(q);
}
/** A largest dimension, cut off at six significant digits (41.6666 mm, not 41.66667 mm, which would not fit). */
const mmDown = (x) => {
  if (!(x > 0)) return mmq(x);
  const k = 10 ** (5 - Math.floor(Math.log10(x)));
  return tx(`${fmt(Math.floor(x * k * (1 + 1e-12)) / k, 7)} mm`);
};

function panelSteps(r) {
  const W = mmq(r.panelWMm);
  const H = mmq(r.panelHMm);
  const w = mmq(r.boardWMm);
  const h = mmq(r.boardHMm);
  const g = mmq(r.gapMm);
  const e = mmq(r.edgeMm);
  const rw = mmq(r.railMm);
  const Wu = mmq(r.usableWMm);
  const Hu = mmq(r.usableHMm);
  const Sx = mmq(r.spanXMm);
  const Sy = mmq(r.spanYMm);
  const { fit } = r;

  // One axis: usable length and the span left for the boards.
  // U, P, S are the symbols (usable length, panel dimension, span); the rest their values.
  const axis = (railed, uLabel, sLabel, [U, uNum], [P, pNum], [S, sNum], noRail) => (railed
    ? [
      { label: uLabel, sym: `${U} = ${P} − 2 \\cdot r`, num: `${pNum} − 2 \\cdot ${rw}`, res: uNum },
      { label: sLabel, sym: `${S} = ${U} − 2 \\cdot e`, num: `${uNum} − 2 \\cdot ${e}`, res: sNum },
    ]
    : [{ label: sLabel, sym: `${S} = ${U} = ${P}`, res: sNum, note: noRail }]);

  // One orientation: columns and rows before rounding down, then their product.
  const orientation = (f) => {
    const k = f.rotated ? '90' : '0';
    const bx = f.rotated ? ['h', h] : ['w', w];
    const by = f.rotated ? ['w', w] : ['h', h];
    return [
      { label: `pn_sQx${k}`, sym: `q_{x${k}} = \\frac{S_x + g}{${bx[0]} + g}`, num: `\\frac{${Sx} + ${g}}{${bx[1]} + ${g}}`, res: quot(f.qx), note: f.rotated ? 'pn_stepTurn' : undefined },
      { label: `pn_sQy${k}`, sym: `q_{y${k}} = \\frac{S_y + g}{${by[0]} + g}`, num: `\\frac{${Sy} + ${g}}{${by[1]} + ${g}}`, res: quot(f.qy) },
      { label: `pn_r${k}`, sym: `N_{${k}} = ⌊q_{x${k}}⌋ \\cdot ⌊q_{y${k}}⌋`, num: `${iq(f.nx)} \\cdot ${iq(f.ny)}`, res: iq(f.count), note: 'pn_stepFloor' },
    ];
  };
  const shown = r.orient === 'best' ? [r.fits.asis, r.fits.rot] : [fit];
  const k = fit.rotated ? '90' : '0';
  const bx = fit.rotated ? ['h', h] : ['w', w]; // the board dimension along the horizontal direction
  const by = fit.rotated ? ['w', w] : ['h', h];
  const N = iq(r.count);
  const o = r.order;

  return steps([
    ...axis(r.railsX, 'pn_sUw', 'pn_sSx', ['W_u', Wu], ['W', W], ['S_x', Sx], 'pn_stepNoRailX'),
    ...axis(r.railsY, 'pn_sUh', 'pn_sSy', ['H_u', Hu], ['H', H], ['S_y', Sy], 'pn_stepNoRailY'),
    ...shown.flatMap(orientation),
    r.orient === 'best' && { label: 'pn_sPick', sym: `N = \\max(N_{0}, N_{90}) = N_{${k}} = ${N}`, note: 'pn_stepPick' },
    { label: 'pn_used', sym: `U = \\frac{N${r.orient === 'best' ? '' : `_{${k}}`} \\cdot w \\cdot h}{W \\cdot H}`, num: `\\frac{${N} \\cdot ${w} \\cdot ${h}}{${W} \\cdot ${H}}`, res: pq(r.usedFrac) },
    fit.nx > 0 && { label: 'pn_leftX', sym: `L_x = S_x − n_x \\cdot ${bx[0]} − (n_x − 1) \\cdot g`, num: `${Sx} − ${iq(fit.nx)} \\cdot ${bx[1]} − ${iq(fit.nx - 1)} \\cdot ${g}`, res: mmq(fit.leftXMm) },
    fit.ny > 0 && { label: 'pn_leftY', sym: `L_y = S_y − n_y \\cdot ${by[0]} − (n_y − 1) \\cdot g`, num: `${Sy} − ${iq(fit.ny)} \\cdot ${by[1]} − ${iq(fit.ny - 1)} \\cdot ${g}`, res: mmq(fit.leftYMm) },
    fit.moreX && { label: 'pn_sMoreX', sym: `${bx[0]}_{max} = \\frac{S_x − n_x \\cdot g}{n_x + 1}`, num: `\\frac{${Sx} − ${iq(fit.nx)} \\cdot ${g}}{${iq(fit.nx)} + 1}`, res: mmDown(fit.moreX.boardMm) },
    fit.moreY && { label: 'pn_sMoreY', sym: `${by[0]}_{max} = \\frac{S_y − n_y \\cdot g}{n_y + 1}`, num: `\\frac{${Sy} − ${iq(fit.ny)} \\cdot ${g}}{${iq(fit.ny)} + 1}`, res: mmDown(fit.moreY.boardMm) },
    o && { label: 'pn_sPanelsQ', sym: 'q_P = \\frac{Q}{N \\cdot y}', num: `\\frac{${iq(o.qty)}}{${N} \\cdot ${pq(o.yieldFrac)}}`, res: quot(o.panelsExact) },
    o && { label: 'pn_panels', sym: 'P = ⌈q_P⌉', res: iq(o.panels), note: 'pn_stepCeil' },
    o && { label: 'pn_boards', sym: 'B = P \\cdot N', num: `${iq(o.panels)} \\cdot ${N}`, res: iq(o.boards) },
    o && o.yieldFrac < 1 && { label: 'pn_good', sym: 'B_{y} = B \\cdot y', num: `${iq(o.boards)} \\cdot ${pq(o.yieldFrac)}`, res: tx(fmt(o.expectedGood, 7)) },
    o && { label: 'pn_spare', sym: `${o.yieldFrac < 1 ? 'B_{y}' : 'B'} − Q`, num: `${tx(fmt(o.expectedGood, 7))} − ${iq(o.qty)}`, res: tx(fmt(o.spare, 7)) },
  ], {
    note: 'pn_note',
    refs: [t('pn_ref')],
    where: [
      ['W', 'pn_pw', 'pw'],
      ['H', 'pn_ph', 'ph'],
      ['w', 'pn_bw', 'bw'],
      ['h', 'pn_bh', 'bh'],
      r.railMm > 0 && ['r', 'pn_rw', 'rw'],
      ['g', 'pn_g', 'g'],
      r.railMm > 0 && ['e', 'pn_e', r.edgeGiven ? 'e' : 'g'],
      ['n_x', 'pn_whNx'],
      ['n_y', 'pn_whNy'],
      o && ['Q', 'pn_qty', 'qty'],
      o && ['y', 'pn_yld', 'yld'],
    ],
  });
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

const note = (key) => `<p class="note">${esc(t(key))}</p>`;
const orientT = (fit) => t(fit.rotated ? 'pn_o90' : 'pn_o0');
const gridT = (f) => t('pn_grid', { n: int(f.count), nx: int(f.nx), ny: int(f.ny) });

/** "board width at most 48.4 mm (1.6 mm smaller) · or a gap of at most 0 mm". */
function moreT(more, dimKey) {
  if (!more) return t('pn_moreNo');
  const board = t('pn_moreVal', { dim: t(dimKey), b: downT(more.boardMm), d: upT(more.shrinkMm) });
  return more.gapMm === null ? board : `${board} · ${t('pn_moreGap', { g: downT(more.gapMm) })}`;
}

function render(r) {
  if (!r.ok) return invalid(r.errors);
  const { fit, other, order: o } = r;
  // The board dimension that lies along the horizontal and the vertical direction.
  const dimX = fit.rotated ? 'pn_dimH' : 'pn_dimW';
  const dimY = fit.rotated ? 'pn_dimW' : 'pn_dimH';
  const moreVars = (m, dimKey, b) => (m ? { dim: t(dimKey), d: upT(m.shrinkMm), a: mmT(b, 7), b: downT(m.boardMm), n: int(m.count) } : {});
  // "Nothing fits" is shown as an error, the hints as warnings.
  const NO_FIT = ['pn_noFit', 'pn_noFitAny'];
  const errors = r.warnings.filter((k) => NO_FIT.includes(k));
  const warns = r.warnings.filter((k) => !NO_FIT.includes(k));
  const noFit = { s: sizeT(r.spanXMm, r.spanYMm), b: sizeT(fit.boardXMm, fit.boardYMm) };
  const msg = messages('error', errors, { pn_noFit: noFit, pn_noFitAny: noFit }) + messages('warn', warns, {
    pn_otherBetter: { o: orientT(other), n: int(other.count), m: int(fit.count) },
    pn_moreCol: moreVars(fit.moreX, dimX, fit.boardXMm),
    pn_moreRow: moreVars(fit.moreY, dimY, fit.boardYMm),
  });
  return heroes([
    ['pn_count', esc(int(r.count)), esc(t('pn_subLay', { o: orientT(fit), nx: int(fit.nx), ny: int(fit.ny) }))],
    ['pn_used', esc(pctT(r.usedFrac)), esc(t('pn_subWaste', { p: pctT(r.wasteFrac) }))],
  ])
    + msg
    + panelSteps(r)
    + block('results', rows([
      ['pn_count', esc(`${int(r.count)} · ${t('pn_subLay', { o: orientT(fit), nx: int(fit.nx), ny: int(fit.ny) })}`), true],
      ['pn_r0', esc(gridT(r.fits.asis))],
      ['pn_r90', esc(gridT(r.fits.rot))],
      ['pn_usable', esc(sizeT(r.usableWMm, r.usableHMm))],
      r.railMm > 0 && ['pn_span', esc(sizeT(r.spanXMm, r.spanYMm))],
      r.count > 0 && ['pn_array', esc(sizeT(fit.arrayWMm, fit.arrayHMm, 6))],
      ['pn_used', esc(pctT(r.usedFrac)), true],
      ['pn_waste', esc(pctT(r.wasteFrac))],
      ['pn_areas', esc(`${fmt(r.boardAreaMm2 / 100)} cm² / ${fmt(r.panelAreaMm2 / 100)} cm²`)],
      ['pn_leftX', esc(mmT(fit.leftXMm))],
      ['pn_leftY', esc(mmT(fit.leftYMm))],
      ['pn_moreX', esc(moreT(fit.moreX, dimX))],
      ['pn_moreY', esc(moreT(fit.moreY, dimY))],
      o && ['pn_panels', esc(`${int(o.panels)} · ${t('pn_panelsSub', { q: int(o.qty) })}`), true],
      o && ['pn_boards', esc(int(o.boards))],
      o && o.yieldFrac < 1 && ['pn_good', esc(`${fmt(o.expectedGood, 7)} (${pctT(o.yieldFrac)})`)],
      o && ['pn_spare', esc(o.yieldFrac < 1 ? t('pn_spareAll', { a: fmt(o.spare, 7), b: int(o.spareAllGood) }) : int(o.spareAllGood))],
    ]) + (r.count === 0 ? note('pn_orderNone') : ''));
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const hasRails = (v) => v.rails !== 'none';
const lenField = (key, label, def, extra = {}) => ({ key, type: 'number', label, default: def, units: LEN, ...extra });

// Examples set every field of the layout, so an example does not depend on
// what was entered before; the order (quantity, yield) is left alone.
const EXAMPLES = {
  e1: { bw: 50, bh: 35, pw: 250, ph: 200, rails: 'tb', rw: 5, sep: 'routed', g: 2, e: '', rot: 'best' },
  e2: { bw: 100, bh: 80, pw: 250, ph: 200, rails: 'tb', rw: 5, sep: 'vscore', g: 0, e: '', rot: 'best' },
  e3: { bw: 100, bh: 160, pw: 457, ph: 610, rails: 'all', rw: 10, sep: 'routed', g: 2, e: '', rot: 'best' },
  e4: { bw: 20, bh: 15, pw: 100, ph: 100, rails: 'all', rw: 5, sep: 'vscore', g: 0, e: '', rot: 'best' },
};

export default {
  id: 'panel',
  strings,
  // Parameter plot (ui/sweep.js): results that can be drawn against one input.
  plot: {
    x: ['bw', 'bh', 'g', 'rw'],
    y: [
      { key: 'n', label: 'pn_count', unit: '', get: (r) => r.count },
      { key: 'used', label: 'pn_used', unit: '%', get: (r) => r.usedFrac * 100 },
      { key: 'panels', label: 'pn_panels', unit: '', get: (r) => r.order?.panels },
    ],
  },
  diagram,
  render,
  sections: [
    {
      title: 'sectionSetup',
      fields: [
        { key: 'ex', type: 'select', label: 'pn_ex', default: 'none', info: 'pn_exInfo',
          options: [
            { value: 'none', label: 'pn_exNone' },
            { value: 'e1', label: 'pn_ex1', set: EXAMPLES.e1 },
            { value: 'e2', label: 'pn_ex2', set: EXAMPLES.e2 },
            { value: 'e3', label: 'pn_ex3', set: EXAMPLES.e3 },
            { value: 'e4', label: 'pn_ex4', set: EXAMPLES.e4 },
          ] },
      ],
    },
    {
      title: 'pn_secBoard',
      fields: [
        lenField('bw', 'pn_bw', 50, { info: 'pn_bInfo' }),
        lenField('bh', 'pn_bh', 35),
      ],
    },
    {
      title: 'pn_secPanel',
      fields: [
        { key: 'pp', type: 'select', label: 'pn_pp', default: 'none', hint: 'pn_ppHint',
          options: [
            { value: 'none', label: 'pn_ppNone' },
            { value: 'p100', label: 'pn_pp100', set: { pw: 100, ph: 100 } },
            { value: 'euro', label: 'pn_ppEuro', set: { pw: 160, ph: 100 } },
            { value: 'p250', label: 'pn_pp250', set: { pw: 250, ph: 200 } },
            { value: 'prod', label: 'pn_ppProd', set: { pw: 457, ph: 610 } },
          ] },
        lenField('pw', 'pn_pw', 250, { info: 'pn_pInfo' }),
        lenField('ph', 'pn_ph', 200),
        { key: 'rails', type: 'choice', label: 'pn_rails', default: 'tb', info: 'pn_railsInfo',
          options: [
            { value: 'none', label: 'pn_rNone' },
            { value: 'tb', label: 'pn_rTb' },
            { value: 'lr', label: 'pn_rLr' },
            { value: 'all', label: 'pn_rAll' },
          ] },
        lenField('rw', 'pn_rw', 5, { valid: 'nonneg', show: hasRails }),
      ],
    },
    {
      title: 'pn_secLay',
      fields: [
        { key: 'sep', type: 'choice', label: 'pn_sep', default: 'routed', info: 'pn_sepInfo',
          options: [
            { value: 'vscore', label: 'pn_sepV', set: { g: 0 } },
            { value: 'routed', label: 'pn_sepR', set: { g: 2 } },
          ] },
        lenField('g', 'pn_g', 2, { valid: 'nonneg' }),
        lenField('e', 'pn_e', '', { valid: 'nonneg', optional: true, hint: 'pn_eHint', show: hasRails }),
        { key: 'rot', type: 'choice', label: 'pn_rot', default: 'best', info: 'pn_rotInfo',
          options: [
            { value: 'asis', label: 'pn_rotAsis' },
            { value: 'rot', label: 'pn_rot90' },
            { value: 'best', label: 'pn_rotBest' },
          ] },
      ],
    },
    {
      title: 'pn_secOrder',
      fields: [
        { key: 'qty', type: 'number', label: 'pn_qty', default: 100, integer: true, optional: true },
        { key: 'yld', type: 'number', label: 'pn_yld', default: 100, units: ['pct'], max: 100, optional: true, hint: 'pn_yldHint' },
      ],
    },
  ],

  compute(v, u) {
    // An optional field left empty is NaN: it is passed on as "not given".
    const mm = (k) => (Number.isFinite(v[k]) && lengthUnits.includes(u[k]) ? toMm(v[k], u[k]) : undefined);
    const num = (x) => (Number.isFinite(x) ? x : undefined);
    return panel({
      boardWMm: mm('bw'),
      boardHMm: mm('bh'),
      panelWMm: mm('pw'),
      panelHMm: mm('ph'),
      rails: v.rails,
      railMm: mm('rw'),
      sep: v.sep,
      gapMm: mm('g'),
      edgeMm: mm('e'),
      orient: v.rot,
      qty: num(v.qty),
      yieldFrac: Number.isFinite(v.yld) ? v.yld / 100 : undefined,
    });
  },
};
