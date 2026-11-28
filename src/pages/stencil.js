import { stencil, AR_MIN, ASPECT_MIN, COMMON_FOILS_MM, PASTE_TYPES } from '../engine/stencil.js';
import { toMm, lengthUnits, MM_PER_MIL } from '../engine/units.js';
import { heroes, rows, block, steps, messages, invalid, checks } from '../ui/calculator.js';
import { tx } from '../ui/math.js';
import { fmt, esc } from '../ui/format.js';
import { t, locale } from '../i18n.js';
import { isImperial } from '../prefs.js';
import { svg, rect, circle, path, text, dimH, dimV } from '../ui/svg.js';

const strings = {
  tr: {
    st_shape: 'Açıklık şekli',
    st_shRect: 'Dikdörtgen',
    st_shCircle: 'Daire',
    st_ex: 'Örnek',
    st_exHint: 'Örnekler tipik açıklık ölçüleridir, kütüphane verisi değildir; kendi footprint’inizin ve stencil üreticinizin değerlerini girin.',
    st_exNone: 'Örnek seçin…',
    st_ex0402: '0402 çip padi (0,45 × 0,55 mm)',
    st_exQfn: '0,5 mm adımlı QFN bacağı (0,25 × 0,80 mm)',
    st_exBga05: '0,5 mm adımlı BGA (0,30 mm daire)',
    st_exBga04: '0,4 mm adımlı BGA (0,25 mm daire)',
    st_ex0201: '0201 çip padi (0,25 × 0,30 mm)',
    st_secAp: 'Açıklık ve folyo',
    st_l: 'Açıklık uzunluğu (L)',
    st_w: 'Açıklık genişliği (W)',
    st_d: 'Açıklık çapı (D)',
    st_t: 'Stencil (folyo) kalınlığı (T)',
    st_tInfo: 'Stencil folyosunun kalınlığı. Kademeli stencil dışında bütün kartta aynıdır; bu yüzden kalınlığı karttaki en küçük açıklık belirler. Kalın folyo daha çok pasta basar, ama küçük açıklıklar pastayı bırakmaz.',
    st_p08: '0,08 mm',
    st_p10: '0,10 mm',
    st_p12: '0,12 mm',
    st_p15: '0,15 mm',
    st_secLim: 'Sınırlar',
    st_armin: 'En küçük alan oranı (ARmin)',
    st_asmin: 'En küçük en-boy oranı (ASmin)',
    st_limNote: 'Varsayılan değerler, IPC-7525’in lazer kesim stenciller için verdiği yaygın kılavuz değerleridir (alan oranı ≥ 0,66, en-boy oranı ≥ 1,5). Elektroform ve nano kaplamalı stenciller, üreticilerine göre biraz daha düşük alan oranlarında da pastayı bırakır; böyle bir stencil için üreticinizin verdiği değeri girin.',
    st_secPad: 'Pad ve pasta',
    st_pl: 'Bakır pad uzunluğu',
    st_pw: 'Bakır pad genişliği',
    st_pd: 'Bakır pad çapı',
    st_padHint: 'Girilirse açıklık alanı pad alanıyla karşılaştırılır (açıklık küçültme oranı).',
    st_paste: 'Lehim pastası tipi',
    st_pasteHint: 'Pratik kural: açıklığın en küçük boyutuna en büyük lehim taneciklerinden en az beşi sığmalıdır. Tanecik boyutları, IPC J-STD-005 tipleri için yaygın olarak verilen tipik üst değerlerdir.',
    st_pNone: 'Kontrol etme',
    st_pT3: 'Tip 3 (en büyük tanecik tipik 45 µm)',
    st_pT4: 'Tip 4 (en büyük tanecik tipik 38 µm)',
    st_pT5: 'Tip 5 (en büyük tanecik tipik 25 µm)',

    st_ar: 'Alan oranı (AR)',
    st_as: 'En-boy oranı (AS)',
    st_subOk: 'sınır ≥ {lim} · uygun',
    st_subLow: 'sınır ≥ {lim} · düşük',
    ok_st_pass: 'Açıklık iki sınırı da sağlıyor: alan oranı {ar} ≥ {arMin}, en-boy oranı {as} ≥ {asMin}. Bu folyo kalınlığında pastanın açıklıktan ayrılması beklenir.',
    err_st_arLow: 'Alan oranı {ar}, {lim} sınırının altında: pastanın bir kısmı açıklıkta kalır. Daha ince bir folyo (en çok {tmax}), daha büyük bir açıklık ya da bu bölgesi inceltilmiş kademeli stencil kullanın.',
    err_st_asLow: 'En-boy oranı {as}, {lim} sınırının altında: açıklık bu folyo kalınlığı için fazla dar. Daha ince bir folyo (en çok {tmax}) ya da daha geniş bir açıklık kullanın.',
    warn_st_noFoil: 'Yaygın folyo kalınlıklarının hiçbiri bu açıklıkta iki sınırı birlikte sağlamıyor: en ince yaygın folyo {min}, bu açıklık için en çok {tmax} olmalı. Açıklığı büyütün ya da stencil üreticinizle elektroform, nano kaplamalı veya kademeli stencil seçeneklerini görüşün.',
    warn_st_balls: 'Açıklığın en küçük boyutuna en büyük taneciklerden {n} tanesi sığıyor; en az {min} olmalı. {type} pasta bu açıklık için iri taneli: daha ince taneli bir tip seçin ya da en küçük boyutu en az {need} yapın.',
    warn_st_overprint: 'Açıklık pad’den büyük (açıklık alanı / pad alanı = {p}): pasta lehim maskesinin üzerine de basılır. Bilerek yapılan bir taşırma (overprint) değilse açıklığı küçültün.',
    warn_st_padOne: 'Pad alanı için pad uzunluğu ve genişliği birlikte girilmelidir; pad karşılaştırması yapılmadı.',
    err_st_positive: 'Açıklık ölçüleri, folyo kalınlığı ve sınırlar sıfırdan büyük birer sayı olmalı.',
    err_st_range: 'Bu değerlerle sonuç sayı aralığının dışına çıkıyor; girdileri kontrol edin.',

    st_area: 'Açıklık alanı A',
    st_wall: 'Duvar alanı Aw',
    st_vol: 'Pasta hacmi (açıklığın hacmi) V',
    st_tMax: 'İki sınırı sağlayan en kalın folyo Tmax',
    st_byAr: 'alan oranı belirliyor',
    st_byAs: 'en-boy oranı belirliyor',
    st_foil: 'Bunu aşmayan en kalın yaygın folyo',
    st_foilNone: 'yaygın folyoların hiçbiri uygun değil',
    st_minAp: 'Bu kalınlıkta en küçük daire çapı ya da kare kenarı',
    st_padArea: 'Pad alanı Apad',
    st_cover: 'Açıklık alanı / pad alanı',
    st_reduce: 'küçültme {p}',
    st_enlarge: 'büyütme {p}',
    st_ballsRow: 'En küçük boyuta sığan tanecik sayısı',
    st_ballsSub: '{type}, tipik en büyük tanecik {d} · en az {min}',
    st_typeN: 'Tip {n}',
    st_blkFoils: 'Aynı açıklık, yaygın folyo kalınlıklarında',
    st_foilRow: 'AR = {ar} · AS = {as} · V = {v}',
    st_volNote: 'Pasta hacmi açıklığın geometrik hacmidir (A·T); pad’e aktarılan hacim bundan azdır ve pastaya, stencil teknolojisine, baskı ayarlarına bağlıdır. Stencil kalınlığını karttaki en küçük açıklık belirler: bu hesabı en küçük açıklık için yapın.',

    st_sSwap: 'Kenarlar',
    st_stepSwap: 'Girilen genişlik uzunluktan büyük: kısa kenar W, uzun kenar L alınır.',
    st_sCheck: 'Sınırlarla karşılaştırma',
    st_stepVol: 'Açıklığın geometrik hacmi; pad’e aktarılan pasta bundan azdır. 1 mm³ = 1 µl = 1000 nl.',
    st_tAr: 'Alan oranı sınırına göre en kalın folyo',
    st_tAs: 'En-boy oranı sınırına göre en kalın folyo',
    st_sFoil: 'Bunu aşmayan en kalın yaygın folyo',
    st_stepFoil: 'Yaygın folyo kalınlıkları: 0,08 · 0,10 · 0,12 · 0,127 · 0,15 · 0,20 mm.',
    st_stepNoFoil: 'En ince yaygın folyo bile (0,08 mm) bu değerden kalın.',
    st_stepMinAp: 'Daire ve karede alan oranı D / (4·T) olur; bu kalınlıkta sınırı sağlayan en küçük çap ya da kenar buradan bulunur.',
    st_stepMinApAs: 'Girilen sınırlarla daire ve karede en-boy oranı (D / T) belirleyicidir.',
    st_sCover: 'Açıklık alanının pad alanına oranı',
    st_stepBalls: 'Pratik kural: en küçük boyuta en büyük taneciklerden en az 5 tanesi sığmalıdır.',
    st_whL: 'Açıklığın uzun kenarı',
    st_whW: 'Açıklığın kısa kenarı (genişlik)',
    st_whLp: 'Pad’in uzun kenarı',
    st_whWp: 'Pad’in kısa kenarı',
    st_whDp: 'Pad çapı',
    st_whDmax: 'Pastanın tipik en büyük tanecik çapı',
    st_note: 'Alan oranı, stencil kalkarken pastayı pad üzerinde tutan alanın (A), onu açıklıkta tutan duvar alanına (Aw) oranıdır. Sınırlar kılavuz değerlerdir, kesin eşik değildir: pastanın ayrılması duvar pürüzlülüğüne, stencil teknolojisine, pasta tipine ve baskı ayarlarına da bağlıdır. Köşe yuvarlatmaları hesaba katılmaz (alanı biraz azaltır). Son açıklık ölçülerini ve folyo kalınlığını stencil üreticinizle birlikte doğrulayın.',

    st_dgAria: 'Solda açıklığın üstten görünümü; sağda folyonun, açıklıktaki pastanın ve pad’in kesiti, duvar alanı ve açıklık alanı işaretli',
    st_dgTop: 'üstten görünüm',
    st_dgSection: 'kesit',
    st_dgWall: 'duvar alanı',
    st_dgOpen: 'açıklık alanı (pad yüzeyinde)',
    st_dgFoil: 'folyo',
    st_dgPaste: 'pasta',
    st_dgPad: 'pad',
  },
  en: {
    st_shape: 'Aperture shape',
    st_shRect: 'Rectangle',
    st_shCircle: 'Circle',
    st_ex: 'Example',
    st_exHint: 'The examples are typical aperture sizes, not library data; enter the values of your own footprint and stencil maker.',
    st_exNone: 'Pick an example…',
    st_ex0402: '0402 chip pad (0.45 × 0.55 mm)',
    st_exQfn: '0.5 mm pitch QFN lead (0.25 × 0.80 mm)',
    st_exBga05: '0.5 mm pitch BGA (0.30 mm round)',
    st_exBga04: '0.4 mm pitch BGA (0.25 mm round)',
    st_ex0201: '0201 chip pad (0.25 × 0.30 mm)',
    st_secAp: 'Aperture and foil',
    st_l: 'Aperture length (L)',
    st_w: 'Aperture width (W)',
    st_d: 'Aperture diameter (D)',
    st_t: 'Stencil (foil) thickness (T)',
    st_tInfo: 'Thickness of the stencil foil. Except for a stepped stencil it is the same for the whole board, so the smallest aperture on the board decides it. A thicker foil prints more paste, but small apertures no longer release it.',
    st_p08: '0.08 mm',
    st_p10: '0.10 mm',
    st_p12: '0.12 mm',
    st_p15: '0.15 mm',
    st_secLim: 'Limits',
    st_armin: 'Minimum area ratio (ARmin)',
    st_asmin: 'Minimum aspect ratio (ASmin)',
    st_limNote: 'The defaults are the common guideline values of IPC-7525 for laser-cut stencils (area ratio ≥ 0.66, aspect ratio ≥ 1.5). Electroformed and nano-coated stencils release paste at somewhat lower area ratios according to their makers; for such a stencil enter the value your stencil maker gives.',
    st_secPad: 'Pad and paste',
    st_pl: 'Copper pad length',
    st_pw: 'Copper pad width',
    st_pd: 'Copper pad diameter',
    st_padHint: 'When given, the aperture area is compared with the pad area (aperture reduction).',
    st_paste: 'Solder paste type',
    st_pasteHint: 'Rule of thumb: the smallest aperture dimension should span at least five of the largest solder particles. The particle sizes are the typical upper sizes commonly listed for the IPC J-STD-005 types.',
    st_pNone: 'No check',
    st_pT3: 'Type 3 (largest particle typically 45 µm)',
    st_pT4: 'Type 4 (largest particle typically 38 µm)',
    st_pT5: 'Type 5 (largest particle typically 25 µm)',

    st_ar: 'Area ratio (AR)',
    st_as: 'Aspect ratio (AS)',
    st_subOk: 'limit ≥ {lim} · pass',
    st_subLow: 'limit ≥ {lim} · too low',
    ok_st_pass: 'The aperture meets both limits: area ratio {ar} ≥ {arMin}, aspect ratio {as} ≥ {asMin}. With this foil thickness the paste can be expected to release from the aperture.',
    err_st_arLow: 'The area ratio {ar} is below the limit of {lim}: part of the paste stays in the aperture. Use a thinner foil (at most {tmax}), a larger aperture, or a stepped stencil that is thinner in this area.',
    err_st_asLow: 'The aspect ratio {as} is below the limit of {lim}: the aperture is too narrow for this foil thickness. Use a thinner foil (at most {tmax}) or a wider aperture.',
    warn_st_noFoil: 'None of the common foil thicknesses meets both limits with this aperture: the thinnest common foil is {min}, and this aperture needs {tmax} or less. Enlarge the aperture, or discuss an electroformed, nano-coated or stepped stencil with your stencil maker.',
    warn_st_balls: 'Only {n} of the largest particles fit across the smallest aperture dimension; there should be at least {min}. {type} paste is too coarse for this aperture: choose a finer type or make the smallest dimension at least {need}.',
    warn_st_overprint: 'The aperture is larger than the pad (aperture area / pad area = {p}): paste is printed onto the solder mask as well. Unless this overprint is intended, reduce the aperture.',
    warn_st_padOne: 'The pad area needs both the pad length and the pad width; the pad comparison was skipped.',
    err_st_positive: 'Aperture dimensions, foil thickness and limits must be numbers greater than zero.',
    err_st_range: 'With these values the result leaves the number range; check the inputs.',

    st_area: 'Aperture area A',
    st_wall: 'Wall area Aw',
    st_vol: 'Paste volume (volume of the aperture) V',
    st_tMax: 'Thickest foil that meets both limits Tmax',
    st_byAr: 'set by the area ratio',
    st_byAs: 'set by the aspect ratio',
    st_foil: 'Thickest common foil not above it',
    st_foilNone: 'none of the common foils',
    st_minAp: 'Smallest round diameter or square side at this thickness',
    st_padArea: 'Pad area Apad',
    st_cover: 'Aperture area / pad area',
    st_reduce: 'reduction {p}',
    st_enlarge: 'enlargement {p}',
    st_ballsRow: 'Particles across the smallest dimension',
    st_ballsSub: '{type}, largest particle typically {d} · at least {min}',
    st_typeN: 'Type {n}',
    st_blkFoils: 'The same aperture in the common foil thicknesses',
    st_foilRow: 'AR = {ar} · AS = {as} · V = {v}',
    st_volNote: 'The paste volume is the geometric volume of the aperture (A·T); the volume that reaches the pad is lower and depends on the paste, the stencil technology and the printer set-up. The smallest aperture on the board decides the stencil thickness: run this calculation for the smallest aperture.',

    st_sSwap: 'Sides',
    st_stepSwap: 'The width entered is larger than the length: the shorter side is taken as W, the longer one as L.',
    st_sCheck: 'Comparison with the limits',
    st_stepVol: 'The geometric volume of the aperture; the paste that reaches the pad is less. 1 mm³ = 1 µl = 1000 nl.',
    st_tAr: 'Thickest foil by the area ratio limit',
    st_tAs: 'Thickest foil by the aspect ratio limit',
    st_sFoil: 'Thickest common foil not above it',
    st_stepFoil: 'Common foil thicknesses: 0.08 · 0.10 · 0.12 · 0.127 · 0.15 · 0.20 mm.',
    st_stepNoFoil: 'Even the thinnest common foil (0.08 mm) is thicker than this.',
    st_stepMinAp: 'For a circle and a square the area ratio is D / (4·T); this gives the smallest diameter or side that meets the limit at this thickness.',
    st_stepMinApAs: 'With the limits entered, the aspect ratio (D / T) decides for a circle and a square.',
    st_sCover: 'Aperture area against pad area',
    st_stepBalls: 'Rule of thumb: at least 5 of the largest particles should fit across the smallest dimension.',
    st_whL: 'Longer side of the aperture',
    st_whW: 'Shorter side of the aperture (width)',
    st_whLp: 'Longer side of the pad',
    st_whWp: 'Shorter side of the pad',
    st_whDp: 'Pad diameter',
    st_whDmax: 'Typical largest particle diameter of the paste',
    st_note: 'The area ratio compares the area that holds the paste on the pad when the stencil lifts off (A) with the wall area that holds it in the aperture (Aw). The limits are guideline values, not sharp thresholds: paste release also depends on the wall roughness, the stencil technology, the paste type and the printer set-up. Corner radii are not modelled (they reduce the area slightly). Confirm the final aperture sizes and the foil thickness with your stencil maker.',

    st_dgAria: 'Left: top view of the aperture. Right: cross-section of the foil, the paste in the aperture and the pad, with the wall area and the aperture area marked',
    st_dgTop: 'top view',
    st_dgSection: 'cross-section',
    st_dgWall: 'wall area',
    st_dgOpen: 'aperture area (on the pad)',
    st_dgFoil: 'foil',
    st_dgPaste: 'paste',
    st_dgPad: 'pad',
  },
};

const LEN = ['mm', 'um', 'mil'];

// Display
const n = (x, sig = 4) => fmt(x, sig);
const mmT = (x, sig = 4) => `${fmt(x, sig)} mm`;
const milT = (x, sig = 3) => `${fmt(x / MM_PER_MIL, sig)} mil`;
const both = (x) => (isImperial() ? `${milT(x, 4)} · ${mmT(x)}` : `${mmT(x)} · ${milT(x)}`);
const short = (x) => (isImperial() ? milT(x) : mmT(x, 3));
const pctT = (x) => new Intl.NumberFormat(locale(), { style: 'percent', maximumFractionDigits: 1, useGrouping: false }).format(x);
const volT = (mm3, nl) => `${n(mm3)} mm³ · ${n(nl)} nl`;

// ---------------------------------------------------------------------------
// Diagram: top view of the aperture and a cross-section through the foil
// ---------------------------------------------------------------------------

const clamp = (x, lo, hi) => (x > hi ? hi : x >= lo ? x : lo);
const n1 = (x) => Math.round(x * 10) / 10;

function diagram(v, u, r) {
  const live = !!r;
  const circ = (live ? r.shape : v.shape) === 'circle';
  const cls = live ? 'val' : 'sym';
  const lbl = (sym, mm) => (live ? `${sym} = ${short(mm)}` : sym);
  const fill = live ? (r.pass ? 'zone-ok' : 'zone-bad') : 'zone';

  // ---- Top view, to proportion; very long or very small shapes are clamped. ----
  const cx = 76;
  const cy = 80;
  const MAXX = 88;
  const MAXY = 76;
  const MINPX = 12;
  let aw = circ ? 56 : MAXX;
  let ah = circ ? 56 : 28;
  let pw = 0;
  let ph = 0;
  if (live) {
    const ax = circ ? r.diameterMm : r.lengthMm;
    const ay = circ ? r.diameterMm : r.widthMm;
    const px = r.pad ? (circ ? r.pad.diameterMm : r.pad.lengthMm) : 0;
    const py = r.pad ? (circ ? r.pad.diameterMm : r.pad.widthMm) : 0;
    const s = Math.min(MAXX / Math.max(ax, px), MAXY / Math.max(ay, py));
    aw = clamp(ax * s, MINPX, MAXX);
    ah = circ ? aw : clamp(ay * s, MINPX, MAXY);
    if (r.pad) {
      pw = clamp(px * s, MINPX, MAXX);
      ph = circ ? pw : clamp(py * s, MINPX, MAXY);
    }
  }
  let b = text(110, 14, t('st_dgTop'), { cls: 'title' }) + rect(8, 22, 204, 130, 'soft');
  if (circ) {
    b += circle(cx, cy, aw / 2, fill) + (pw ? circle(cx, cy, pw / 2, 'dim') : '')
      + dimH(cx - aw / 2, cx + aw / 2, cy + ah / 2 + 14, lbl('D', r?.diameterMm), { below: true, extFrom: cy, cls });
  } else {
    b += rect(cx - aw / 2, cy - ah / 2, aw, ah, fill) + (pw ? rect(cx - pw / 2, cy - ph / 2, pw, ph, 'dim') : '')
      + dimH(cx - aw / 2, cx + aw / 2, cy + ah / 2 + 14, lbl('L', r?.lengthMm), { below: true, extFrom: cy + ah / 2 + 2, cls })
      + dimV(cy - ah / 2, cy + ah / 2, cx + aw / 2 + 12, lbl('W', r?.widthMm), { extFrom: cx + aw / 2 + 2, cls });
  }
  if (pw) b += text(cx - pw / 2, cy - ph / 2 - 5, t('st_dgPad'), { anchor: 'start' });
  b += text(8, 170, live ? `V = A · T = ${n(r.volumeMm3, 3)} mm³ = ${n(r.volumeNl, 3)} nl` : 'V = A · T', { cls, anchor: 'start' });
  if (live && r.pad) b += text(8, 188, `A / Apad = ${pctT(r.pad.coverage)}`, { cls, anchor: 'start' });

  // ---- Cross-section through the smallest dimension: foil on the pad, paste in the aperture. ----
  const x0 = 226;
  const x1 = 410;
  const sx = 318;
  const yT = 62; // top of the foil
  const TP = 36; // foil thickness in the drawing
  const yP = yT + TP; // pad surface
  const wA = live ? clamp(TP * r.aspectRatio, 18, 132) : 76;
  const xl = n1(sx - wA / 2);
  const xr = n1(sx + wA / 2);
  const wPad = live && r.pad ? clamp((wA * r.pad.minDimMm) / r.minDimMm, 14, 172) : Math.min(wA + 14, 172);
  const maskL = Math.max(0, sx - wPad / 2 - 5 - x0);
  b += text(sx, 14, t('st_dgSection'), { cls: 'title' })
    + rect(x0, yP + 8, x1 - x0, 22, 'diel')
    + rect(x0, yP, maskL, 8, 'mask') + rect(x1 - maskL, yP, maskL, 8, 'mask')
    + rect(sx - wPad / 2, yP, wPad, 8, 'cu')
    + rect(x0, yT, xl - x0, TP, 'soft') + rect(xr, yT, x1 - xr, TP, 'soft')
    + rect(xl, yT, xr - xl, TP, fill)
    + path(`M${xl},${yT}V${yP}M${xr},${yT}V${yP}`, 'wave')
    + path(`M${xl},${yP}H${xr}`, 'rad')
    + text(sx, yP + 23, t('st_dgPad'));
  if (xl - x0 >= 40) b += text((x0 + xl) / 2, yT + 22, t('st_dgFoil'));
  if (xr - xl >= 44) b += text(sx, yT + 22, t('st_dgPaste'));
  b += dimH(xl, xr, yT - 16, lbl(circ ? 'D' : 'W', r?.minDimMm), { extFrom: yT - 2, cls })
    + dimV(yT, yP, 418, '', { extFrom: x1 + 2 })
    + text(424, yT + 15, 'T', { cls: 'sym', anchor: 'start' })
    + (live ? text(424, yT + 29, short(r.thicknessMm), { cls: 'val', anchor: 'start' }) : '');

  // Legend and the two ratios.
  const yl = 146;
  const ratio = (name, def, value, limit, ok) => (live ? `${name} = ${def} = ${n(value, 3)} ${ok ? '≥' : '<'} ${n(limit, 3)}` : `${name} = ${def}`);
  const state = (ok) => (live ? (ok ? 'okt' : 'badt') : 'lbl');
  b += path(`M${x0},${yl - 4}H${x0 + 18}`, 'wave') + text(x0 + 24, yl, `Aw · ${t('st_dgWall')}`, { anchor: 'start' })
    + path(`M${x0},${yl + 12}H${x0 + 18}`, 'rad') + text(x0 + 24, yl + 16, `A · ${t('st_dgOpen')}`, { anchor: 'start' })
    + text(x0, yl + 36, ratio('AR', 'A / Aw', r?.areaRatio, r?.arMin, r?.arPass), { cls: state(r?.arPass), anchor: 'start' })
    + text(x0, yl + 52, ratio('AS', `${circ ? 'D' : 'W'} / T`, r?.aspectRatio, r?.aspectMin, r?.aspectPass), { cls: state(r?.aspectPass), anchor: 'start' });
  return svg(480, 206, b, t('st_dgAria'), { wide: true });
}

// ---------------------------------------------------------------------------
// Calculation steps
// ---------------------------------------------------------------------------

const REFS = [
  'IPC-7525, Stencil Design Guidelines',
  'IPC J-STD-005, Requirements for Soldering Pastes',
];

const nq = (x, sig = 4) => tx(n(x, sig));
const mmq = (x) => tx(`${n(x)} mm`);
const mm2q = (x) => tx(`${n(x)} mm²`);
const mm3q = (x) => tx(`${n(x)} mm³`);
const pq = (x) => tx(`${n(x * 100)} %`);
const sq = (s) => `{(${s})}^{2}`;

function stencilSteps(r) {
  const circ = r.shape === 'circle';
  const T = mmq(r.thicknessMm);
  const A = mm2q(r.areaMm2);
  const Aw = mm2q(r.wallAreaMm2);
  const arMin = nq(r.arMin);
  const asMin = nq(r.aspectMin);
  const L = circ ? '' : mmq(r.lengthMm);
  const W = circ ? '' : mmq(r.widthMm);
  const D = circ ? mmq(r.diameterMm) : '';
  const min = circ ? D : W; // the smallest dimension
  const minSym = circ ? 'D' : 'W';
  const cmp = (ok) => (ok ? '\\ge' : '<');
  const pad = r.pad;
  const Ap = pad ? mm2q(pad.areaMm2) : '';
  return steps([
    r.swapped && { label: 'st_sSwap', sym: `L = ${L}, \\quad W = ${W}`, note: 'st_stepSwap' },
    circ
      ? { label: 'st_area', sym: 'A = \\frac{π \\cdot D^{2}}{4}', num: `\\frac{π \\cdot ${sq(D)}}{4}`, res: A }
      : { label: 'st_area', sym: 'A = L \\cdot W', num: `${L} \\cdot ${W}`, res: A },
    circ
      ? { label: 'st_wall', sym: 'A_w = π \\cdot D \\cdot T', num: `π \\cdot ${D} \\cdot ${T}`, res: Aw }
      : { label: 'st_wall', sym: 'A_w = 2 \\cdot (L + W) \\cdot T', num: `2 \\cdot (${L} + ${W}) \\cdot ${T}`, res: Aw },
    { label: 'st_ar', sym: circ ? 'AR = \\frac{A}{A_w} = \\frac{D}{4 \\cdot T}' : 'AR = \\frac{A}{A_w}', num: `\\frac{${A}}{${Aw}}`, res: nq(r.areaRatio) },
    { label: 'st_as', sym: `AS = \\frac{${minSym}}{T}`, num: `\\frac{${min}}{${T}}`, res: nq(r.aspectRatio) },
    { label: 'st_sCheck', sym: `AR = ${nq(r.areaRatio)} ${cmp(r.arPass)} AR_{min} = ${arMin}, \\quad AS = ${nq(r.aspectRatio)} ${cmp(r.aspectPass)} AS_{min} = ${asMin}` },
    { label: 'st_vol', sym: 'V = A \\cdot T', num: `${A} \\cdot ${T}`, res: `${mm3q(r.volumeMm3)} = ${tx(`${n(r.volumeNl)} nl`)}`, note: 'st_stepVol' },
    circ
      ? { label: 'st_tAr', sym: 'T_{AR} = \\frac{D}{4 \\cdot AR_{min}}', num: `\\frac{${D}}{4 \\cdot ${arMin}}`, res: mmq(r.tArMm) }
      : { label: 'st_tAr', sym: 'T_{AR} = \\frac{A}{AR_{min} \\cdot 2 \\cdot (L + W)}', num: `\\frac{${A}}{${arMin} \\cdot 2 \\cdot (${L} + ${W})}`, res: mmq(r.tArMm) },
    { label: 'st_tAs', sym: `T_{AS} = \\frac{${minSym}}{AS_{min}}`, num: `\\frac{${min}}{${asMin}}`, res: mmq(r.tAspectMm) },
    { label: 'st_tMax', sym: 'T_{max} = \\min(T_{AR}, T_{AS})', num: `\\min(${mmq(r.tArMm)}, ${mmq(r.tAspectMm)})`, res: mmq(r.tMaxMm) },
    r.foilMm !== null
      ? { label: 'st_sFoil', sym: `T \\le T_{max} \\to T = ${mmq(r.foilMm)}`, note: 'st_stepFoil' }
      : { label: 'st_sFoil', sym: `T_{max} < ${mmq(COMMON_FOILS_MM[0])}`, note: 'st_stepNoFoil' },
    r.minApertureBy === 'ar'
      ? { label: 'st_minAp', sym: 'D_{min} = 4 \\cdot AR_{min} \\cdot T', num: `4 \\cdot ${arMin} \\cdot ${T}`, res: mmq(r.minApertureMm), note: 'st_stepMinAp' }
      : { label: 'st_minAp', sym: 'D_{min} = AS_{min} \\cdot T', num: `${asMin} \\cdot ${T}`, res: mmq(r.minApertureMm), note: 'st_stepMinApAs' },
    pad && (circ
      ? { label: 'st_padArea', sym: 'A_{pad} = \\frac{π \\cdot D_p^{2}}{4}', num: `\\frac{π \\cdot ${sq(mmq(pad.diameterMm))}}{4}`, res: Ap }
      : { label: 'st_padArea', sym: 'A_{pad} = L_p \\cdot W_p', num: `${mmq(pad.lengthMm)} \\cdot ${mmq(pad.widthMm)}`, res: Ap }),
    pad && { label: 'st_sCover', sym: '\\frac{A}{A_{pad}}', num: `\\frac{${A}}{${Ap}}`, res: pq(pad.coverage) },
    r.balls && { label: 'st_ballsRow', sym: `n = \\frac{${minSym}}{d_{max}}`, num: `\\frac{${min}}{${tx(`${n(r.balls.particleUm)} µm`)}}`, res: nq(r.balls.across), note: 'st_stepBalls' },
  ], {
    note: 'st_note',
    refs: REFS,
    where: [
      ...(circ
        ? [['D', 'st_d', 'd']]
        : [['L', 'st_whL', r.swapped ? 'w' : 'l'], ['W', 'st_whW', r.swapped ? 'l' : 'w']]),
      ['T', 'st_t', 't'],
      ['AR_{min}', 'st_armin', 'armin'],
      ['AS_{min}', 'st_asmin', 'asmin'],
      ...(pad
        ? (circ ? [['D_p', 'st_whDp', 'pd']] : [['L_p', 'st_whLp', pad.swapped ? 'pw' : 'pl'], ['W_p', 'st_whWp', pad.swapped ? 'pl' : 'pw']])
        : []),
      r.balls && ['d_{max}', 'st_whDmax', 'paste'],
    ],
  });
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

const note = (key) => `<p class="note">${esc(t(key))}</p>`;

function render(r) {
  if (!r.ok) return invalid(r.errors);
  const ar = n(r.areaRatio, 3);
  const as = n(r.aspectRatio, 3);
  const arMin = n(r.arMin);
  const asMin = n(r.aspectMin);
  const tmax = short(r.tMaxMm);
  const sub = (ok, lim) => esc(t(ok ? 'st_subOk' : 'st_subLow', { lim }));
  const verdict = r.pass
    ? messages('ok', ['st_pass'], { st_pass: { ar, arMin, as, asMin } })
    : messages('error', [!r.arPass && 'st_arLow', !r.aspectPass && 'st_asLow'].filter(Boolean), {
      st_arLow: { ar, lim: arMin, tmax },
      st_asLow: { as, lim: asMin, tmax },
    });
  const typeName = r.balls ? t('st_typeN', { n: String(r.balls.type) }) : '';
  const warn = messages('warn', r.warnings, {
    st_noFoil: { min: short(COMMON_FOILS_MM[0]), tmax },
    st_balls: r.balls ? { n: n(r.balls.across, 2), min: String(r.balls.min), type: typeName, need: short(r.balls.minDimMm) } : {},
    st_overprint: r.pad ? { p: pctT(r.pad.coverage) } : {},
  });
  return heroes([
    ['st_ar', esc(ar), sub(r.arPass, arMin)],
    ['st_as', esc(as), sub(r.aspectPass, asMin)],
  ])
    + verdict + warn
    + stencilSteps(r)
    + block('results', rows([
      ['st_ar', esc(`${n(r.areaRatio)} · ${t(r.arPass ? 'st_subOk' : 'st_subLow', { lim: arMin })}`), true],
      ['st_as', esc(`${n(r.aspectRatio)} · ${t(r.aspectPass ? 'st_subOk' : 'st_subLow', { lim: asMin })}`), true],
      ['st_area', esc(`${n(r.areaMm2)} mm²`)],
      ['st_wall', esc(`${n(r.wallAreaMm2)} mm²`)],
      ['st_vol', esc(volT(r.volumeMm3, r.volumeNl)), true],
      ['st_tMax', esc(`${both(r.tMaxMm)} · ${t(r.tMaxBy === 'ar' ? 'st_byAr' : 'st_byAs')}`)],
      ['st_foil', esc(r.foilMm === null ? t('st_foilNone') : both(r.foilMm)), true],
      ['st_minAp', esc(both(r.minApertureMm))],
      r.pad && ['st_padArea', esc(`${n(r.pad.areaMm2)} mm²`)],
      r.pad && ['st_cover', esc(`${pctT(r.pad.coverage)} · ${r.pad.coverage > 1
        ? t('st_enlarge', { p: pctT(r.pad.enlargement) })
        : t('st_reduce', { p: pctT(r.pad.reduction) })}`)],
      r.balls && ['st_ballsRow', esc(`${n(r.balls.across, 3)} · ${t('st_ballsSub', { type: typeName, d: `${n(r.balls.particleUm)} µm`, min: String(r.balls.min) })}`)],
    ]) + note('st_volNote'))
    + block('st_blkFoils', checks(r.foils.map((f) => [
      f.pass,
      esc(both(f.tMm)),
      esc(t('st_foilRow', { ar: n(f.areaRatio, 3), as: n(f.aspectRatio, 3), v: `${n(f.volumeNl, 3)} nl` })),
    ])));
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const isRect = (v) => v.shape !== 'circle';
const isCircle = (v) => v.shape === 'circle';
const lenField = (key, label, def, extra = {}) => ({ key, type: 'number', label, default: def, units: LEN, pref: 'length', ...extra });

// Examples set the aperture only: the foil, the limits and the paste stay as entered.
// The pad fields are cleared, because a pad entered before belongs to another aperture.
const NO_PAD = { pl: '', pw: '', pd: '' };
const EXAMPLES = {
  c0402: { shape: 'rect', l: 0.55, w: 0.45, ...NO_PAD },
  qfn: { shape: 'rect', l: 0.8, w: 0.25, ...NO_PAD },
  bga05: { shape: 'circle', d: 0.3, ...NO_PAD },
  bga04: { shape: 'circle', d: 0.25, ...NO_PAD },
  c0201: { shape: 'rect', l: 0.3, w: 0.25, ...NO_PAD },
};

export default {
  id: 'stencil',
  strings,
  diagram,
  render,
  sections: [
    {
      title: 'sectionSetup',
      fields: [
        { key: 'shape', type: 'choice', label: 'st_shape', default: 'rect',
          options: [{ value: 'rect', label: 'st_shRect' }, { value: 'circle', label: 'st_shCircle' }] },
        { key: 'ex', type: 'select', label: 'st_ex', default: 'none', hint: 'st_exHint',
          options: [
            { value: 'none', label: 'st_exNone' },
            { value: 'c0402', label: 'st_ex0402', set: EXAMPLES.c0402 },
            { value: 'qfn', label: 'st_exQfn', set: EXAMPLES.qfn },
            { value: 'bga05', label: 'st_exBga05', set: EXAMPLES.bga05 },
            { value: 'bga04', label: 'st_exBga04', set: EXAMPLES.bga04 },
            { value: 'c0201', label: 'st_ex0201', set: EXAMPLES.c0201 },
          ] },
      ],
    },
    {
      title: 'st_secAp',
      fields: [
        lenField('l', 'st_l', 0.8, { show: isRect }),
        lenField('w', 'st_w', 0.25, { show: isRect }),
        lenField('d', 'st_d', 0.3, { show: isCircle }),
        lenField('t', 'st_t', 0.12, {
          info: 'st_tInfo',
          presets: [
            { label: 'st_p08', value: 0.08, unit: 'mm', raw: false },
            { label: 'st_p10', value: 0.1, unit: 'mm', raw: false },
            { label: 'st_p12', value: 0.12, unit: 'mm', raw: false },
            { label: 'st_p15', value: 0.15, unit: 'mm', raw: false },
          ],
        }),
      ],
    },
    {
      title: 'st_secLim',
      note: 'st_limNote',
      fields: [
        { key: 'armin', type: 'number', label: 'st_armin', default: AR_MIN },
        { key: 'asmin', type: 'number', label: 'st_asmin', default: ASPECT_MIN },
      ],
    },
    {
      title: 'st_secPad',
      optional: true,
      collapsible: true,
      fields: [
        lenField('pl', 'st_pl', '', { optional: true, show: isRect }),
        lenField('pw', 'st_pw', '', { optional: true, show: isRect, hint: 'st_padHint' }),
        lenField('pd', 'st_pd', '', { optional: true, show: isCircle, hint: 'st_padHint' }),
        { key: 'paste', type: 'select', label: 'st_paste', default: 'none', hint: 'st_pasteHint',
          options: [
            { value: 'none', label: 'st_pNone' },
            ...Object.keys(PASTE_TYPES).map((k) => ({ value: k, label: `st_pT${PASTE_TYPES[k].type}` })),
          ] },
      ],
    },
  ],

  compute(v, u) {
    // An optional field left empty is NaN: it is passed on as "not given".
    const mm = (k) => (Number.isFinite(v[k]) && lengthUnits.includes(u[k]) ? toMm(v[k], u[k]) : undefined);
    return stencil({
      shape: v.shape,
      lengthMm: mm('l'),
      widthMm: mm('w'),
      diameterMm: mm('d'),
      thicknessMm: mm('t'),
      arMin: v.armin,
      aspectMin: v.asmin,
      padLengthMm: mm('pl'),
      padWidthMm: mm('pw'),
      padDiameterMm: mm('pd'),
      paste: v.paste,
    });
  },
};
