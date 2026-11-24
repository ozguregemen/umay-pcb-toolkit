import { calculateTraceWidth } from '../engine/trace-width.js';
import { thicknessToMil, currentToA, riseToC, tempToC, toMm, MM_PER_MIL } from '../engine/units.js';
import { hero, rows, block, formulaBlock, messages, invalid } from '../ui/calculator.js';
import { fmt, fixed, si, esc } from '../ui/format.js';
import { t } from '../i18n.js';
import { isImperial } from '../prefs.js';
import { svg, rect, circle, path, poly, text, dimH, dimV, arrow } from '../ui/svg.js';
import { fabCheck } from '../ui/fabcheck.js';

const strings = {
  tr: {
    tw_modeWidth: 'Genişlik',
    tw_modeCurrent: 'Akım kapasitesi',
    tw_modeRise: 'Sıcaklık artışı',
    tw_std: 'Standart',
    tw_stdInfo: 'IPC-2152 (2009) yeni ve daha gerçekçi ölçümlere dayanır; IPC-2221 grafikleri 1956 tarihli NBS verisidir ve iç katmanlar için aşırı muhafazakârdır. Yeni tasarımlarda IPC-2152 önerilir.',
    tw_layerInfo: 'Yalnızca IPC-2221 için: iç katman k = 0,024 (dış katmanın yarısı). IPC-2152 temel grafiği iç ve dış katmana birlikte uygulanır.',
    tw_I: 'Akım',
    tw_dT: 'İzin verilen sıcaklık artışı',
    tw_dTInfo: 'İz sıcaklığının ortamın üzerine çıkmasına izin verilen miktar. Genel tasarımda 10–20 °C yaygındır; iz sıcaklığı (ortam + ΔT) malzemenin çalışma sıcaklığının (MOT/RTI) altında kalmalıdır.',
    tw_W: 'İz genişliği',
    tw_t: 'Bakır kalınlığı',
    tw_tInfo: 'Dış katmanda kaplama sonrası gerçek kalınlık daha büyüktür (ör. 1 oz folyo + kaplama ≈ 48 µm). Muhafazakâr sonuç için folyo kalınlığını kullanın.',
    tw_margin: 'Akım tasarım payı',
    tw_marginInfo: 'Hesap bu oranda fazla akım için yapılır (ör. %20 → 1,2 × I). Yük belirsizliği, üretim toleransı (IPC-6012 genişlikte %20’ye kadar kusura izin verir) ve yaşlanma için pay bırakır.',
    tw_minW: 'Üreticinin minimum iz genişliği',
    sectionIpc2152: 'IPC-2152 düzeltmeleri',
    tw_board: 'Kart kalınlığı',
    tw_boardInfo: 'İnce kartlar ısıyı daha az yayar ve daha geniş iz gerektirir. Temel grafik 1,78 mm (0,070") karta göredir.',
    tw_plane: 'Yakında bakır düzlem',
    tw_planeNo: 'Yok (muhafazakâr)',
    tw_planeYes: 'Var',
    tw_planeInfo: 'İzin altında veya üstünde katı bir bakır düzlem ısıyı yayar ve sıcaklık artışını belirgin biçimde azaltır. Düzlem izin altında, tüm uzunluk boyunca ve yeterince geniş olmalıdır.',
    tw_planeDist: 'İz ile düzlem arası mesafe',
    tw_width: 'Gereken iz genişliği',
    tw_current: 'İzin verilen akım',
    tw_rise: 'Sıcaklık artışı',
    tw_calcWidth: 'Hesaplanan genişlik',
    tw_area: 'Kesit alanı',
    tw_oz: 'Eşdeğer bakır ağırlığı',
    tw_designCurrent: 'Hesaba esas akım',
    tw_baseArea: 'Temel grafik alanı (3 oz, 1,78 mm, düzlemsiz)',
    tw_modCopper: 'Bakır kalınlığı düzeltmesi',
    tw_modBoard: 'Kart kalınlığı düzeltmesi',
    tw_modPlane: 'Düzlem düzeltmesi',
    tw_modTotal: 'Toplam düzeltme',
    tw_compare: 'Aynı akım ve ΔT için karşılaştırma',
    tw_cmp2152: 'IPC-2152 (bu ayarlarla)',
    tw_cmp2221e: 'IPC-2221 dış katman',
    tw_cmp2221i: 'IPC-2221 iç katman',
    tw_resistance: 'Direnç',
    tw_dcHint: 'DC analiz, ortam + ΔT sıcaklığındaki bakır özdirenciyle yapılır.',
    tw_note2152: 'IPC-2152 temel grafiğinin kapalı form uydurması (J. Olson, smps.us) ve düzeltme grafiklerinin eğri uydurmaları kullanılır; grafik okuma doğruluğu ±%10 mertebesindedir. Grafikler durgun hava içindir; zorlamalı hava ek soğutma sağlar ama standartta sayısallaştırılmamıştır. 25 mm’den yakın paralel izler birbirini ısıtır: birlikte değerlendirin.',
    tw_note2221: 'IPC-2221 grafikleri %10 düşürülmüş değerlerdir; 0,8 mm ve daha ince kartlarda veya ≥ 108 µm bakırda ayrıca %15 düşürme önerilir. İç katman eğrisi aslında serbest hava verisidir ve iç katmanlar için aşırı muhafazakârdır.',
    err_current: 'Akım sıfırdan büyük olmalı.',
    err_tempRise: 'Sıcaklık artışı sıfırdan büyük olmalı.',
    err_thickness: 'Kalınlık sıfırdan büyük olmalı.',
    err_width: 'Genişlik sıfırdan büyük olmalı.',
    err_etchWidth: 'Genişlik, aşındırma kaybından büyük olmalı.',
    tw_plating: 'Kaplama kalınlığı (dış katman)',
    tw_platingInfo: 'Dış katmanda folyonun üzerine kaplanan bakır (tipik 20–25 µm). İç katmanlar için 0 bırakın; muhafazakâr sonuç için de 0 kullanılabilir.',
    tw_etch: 'Aşındırma faktörü',
    tw_etchInfo: 'Aşındırma izin kenarlarını da yer; kesit dikdörtgen değil yamuktur. 2:1, her kenarda kalınlığın yarısı kadar, 1:1 kalınlık kadar kayıp demektir. Kalın bakırda etkisi büyüktür.',
    tw_etchNone: 'Yok (dikdörtgen kesit)',
    tw_undercut: 'Aşındırma kaybı (kenar başına)',
    tw_density: 'Akım yoğunluğu',
    tw_freq: 'Frekans (AC direnç için)',
    tw_freqInfo: 'Girilirse deri kalınlığı ve yaklaşık AC direnç hesaplanır. Düzlem üzerindeki izde akım düzleme bakan yüzeyde toplanır.',
    tw_skin: 'Deri kalınlığı',
    tw_rac: 'AC direnç (yaklaşık)',
    warn_minWidthApplied: 'Hesaplanan genişlik üreticinin minimumunun altında; minimum genişlik kullanıldı.',
    warn_ipc2152CurrentRange: 'Akım IPC-2152 eğri uydurmasının doğrulandığı aralığın (≈ 26 A) üzerinde.',
    warn_ipc2152TempRange: 'IPC-2152 uydurması 2–100 °C sıcaklık artışı içindir.',
    warn_ipc2152CopperRange: 'Bakır kalınlığı düzeltmesi 0,5–3 oz için tanımlı; en yakın uç değer kullanıldı.',
    warn_ipc2152BoardRange: 'Kart kalınlığı düzeltmesi 0,72–2,36 mm için tanımlı.',
    warn_ipc2152PlaneRange: 'Düzlem düzeltmesi 0,14–2,4 mm mesafe için tanımlı.',
    warn_ipc2221CurrentRange: 'Akım IPC-2221 grafiklerinin kapsamını (35 A) aşıyor.',
    warn_ipc2221TempRange: 'IPC-2221 grafikleri 10–100 °C sıcaklık artışı için geçerlidir.',
    warn_ipc2221ThicknessRange: 'IPC-2221 grafikleri 0,5–3 oz bakır için geçerlidir.',
    warn_ipc2221WidthRange: 'Genişlik IPC-2221 grafiklerinin kapsamını (400 mil) aşıyor.',
    warn_ipc2221ExtraDerate: 'IPC-2221: 0,8 mm ve daha ince kartta veya ≥ 108 µm bakırda akımı ayrıca %15 düşürün.',
    tw_dgAria: 'İz kesiti: genişlik W (aşındırmayla yamuk), bakır kalınlığı t ve kaplama, dielektrik, varsa d mesafesindeki düzlem ve ısının düzleme ya da karta yayılışı; akım I ve sıcaklık artışı ΔT',
    tw_dgScale: 'kesit ölçekli',
    tw_dgScaleExag: 'ölçekli · t büyütülmüş',
    tw_dgNoScale: 'ölçeksiz',
    tw_dgHeatPlane: 'ısı düzleme geçip yayılır',
    tw_dgHeatBoard: 'ısı karta yayılır',
    tw_dgHeatInt: 'ısı laminata yayılır',
    tw_dgPlane: 'düzlem',
    tw_dgBoard: 'kart',
    tw_dgExt: 'dış katman',
    tw_dgInt: 'iç katman',
    tw_dgEtch: 'aşındırma',
    tw_dgPlate: 'kaplama',
  },
  en: {
    tw_modeWidth: 'Width',
    tw_modeCurrent: 'Current capacity',
    tw_modeRise: 'Temperature rise',
    tw_std: 'Standard',
    tw_stdInfo: 'IPC-2152 (2009) is based on newer, more realistic measurements; the IPC-2221 charts are 1956 NBS data and very conservative for internal layers. IPC-2152 is recommended for new designs.',
    tw_layerInfo: 'IPC-2221 only: internal k = 0.024 (half of external). The IPC-2152 baseline chart applies to internal and external conductors alike.',
    tw_I: 'Current',
    tw_dT: 'Allowed temperature rise',
    tw_dTInfo: 'How far the trace may heat above ambient. 10–20 °C is common for general design; trace temperature (ambient + ΔT) must stay below the material’s operating limit (MOT/RTI).',
    tw_W: 'Trace width',
    tw_t: 'Copper thickness',
    tw_tInfo: 'On outer layers the finished thickness is larger after plating (e.g. 1 oz foil + plating ≈ 48 µm). Use the foil thickness for a conservative result.',
    tw_margin: 'Current design margin',
    tw_marginInfo: 'The calculation uses this much extra current (e.g. 20 % → 1.2 × I). Covers load uncertainty, fabrication tolerance (IPC-6012 accepts up to 20 % width defects) and ageing.',
    tw_minW: 'Fabricator minimum trace width',
    sectionIpc2152: 'IPC-2152 modifiers',
    tw_board: 'Board thickness',
    tw_boardInfo: 'Thin boards spread less heat and need wider traces. The baseline chart is for a 1.78 mm (0.070") board.',
    tw_plane: 'Nearby copper plane',
    tw_planeNo: 'None (conservative)',
    tw_planeYes: 'Present',
    tw_planeInfo: 'A solid copper plane above or below the trace spreads heat and markedly lowers the rise. The plane must run under the whole trace and be reasonably large.',
    tw_planeDist: 'Distance trace to plane',
    tw_width: 'Required trace width',
    tw_current: 'Allowed current',
    tw_rise: 'Temperature rise',
    tw_calcWidth: 'Calculated width',
    tw_area: 'Cross-section area',
    tw_oz: 'Equivalent copper weight',
    tw_designCurrent: 'Design current used',
    tw_baseArea: 'Baseline chart area (3 oz, 1.78 mm, no plane)',
    tw_modCopper: 'Copper thickness modifier',
    tw_modBoard: 'Board thickness modifier',
    tw_modPlane: 'Plane modifier',
    tw_modTotal: 'Total modifier',
    tw_compare: 'Comparison for the same current and ΔT',
    tw_cmp2152: 'IPC-2152 (these settings)',
    tw_cmp2221e: 'IPC-2221 external',
    tw_cmp2221i: 'IPC-2221 internal',
    tw_resistance: 'Resistance',
    tw_dcHint: 'DC analysis uses copper resistivity at ambient + ΔT.',
    tw_note2152: 'Uses a closed-form fit of the IPC-2152 baseline chart (J. Olson, smps.us) and curve fits of the modifier charts; chart-reading accuracy is about ±10 %. The charts are for still air; forced air cools further but is not quantified in the standard. Parallel traces closer than 25 mm heat each other: evaluate them together.',
    tw_note2221: 'The IPC-2221 charts are already derated by 10 %; a further 15 % is advised for boards 0.8 mm or thinner or copper ≥ 108 µm. The internal curve is actually free-air data and very conservative for internal layers.',
    err_current: 'Current must be greater than zero.',
    err_tempRise: 'Temperature rise must be greater than zero.',
    err_thickness: 'Thickness must be greater than zero.',
    err_width: 'Width must be greater than zero.',
    err_etchWidth: 'Width must be larger than the etch loss.',
    tw_plating: 'Plating thickness (outer layer)',
    tw_platingInfo: 'Copper plated on top of the foil on outer layers (typically 20–25 µm). Leave 0 for inner layers; 0 is also the conservative choice.',
    tw_etch: 'Etch factor',
    tw_etchInfo: 'Etching also eats the trace sides, so the cross-section is a trapezoid, not a rectangle. 2:1 means half the thickness lost per side, 1:1 the full thickness. It matters most with heavy copper.',
    tw_etchNone: 'None (rectangular section)',
    tw_undercut: 'Etch loss (per side)',
    tw_density: 'Current density',
    tw_freq: 'Frequency (for AC resistance)',
    tw_freqInfo: 'When given, skin depth and an approximate AC resistance are computed. On a trace over a plane the current gathers on the surface facing the plane.',
    tw_skin: 'Skin depth',
    tw_rac: 'AC resistance (approx.)',
    warn_minWidthApplied: 'The calculated width is below the fabricator minimum; the minimum is used.',
    warn_ipc2152CurrentRange: 'Current is above the range the IPC-2152 fit was checked for (≈ 26 A).',
    warn_ipc2152TempRange: 'The IPC-2152 fit covers 2–100 °C temperature rise.',
    warn_ipc2152CopperRange: 'The copper modifier is defined for 0.5–3 oz; the nearest end value is used.',
    warn_ipc2152BoardRange: 'The board-thickness modifier is defined for 0.72–2.36 mm.',
    warn_ipc2152PlaneRange: 'The plane modifier is defined for 0.14–2.4 mm distance.',
    warn_ipc2221CurrentRange: 'Current exceeds the IPC-2221 chart range (35 A).',
    warn_ipc2221TempRange: 'IPC-2221 charts are valid for 10–100 °C temperature rise.',
    warn_ipc2221ThicknessRange: 'IPC-2221 charts are valid for 0.5–3 oz copper.',
    warn_ipc2221WidthRange: 'Width exceeds the IPC-2221 chart range (400 mil).',
    warn_ipc2221ExtraDerate: 'IPC-2221: derate current a further 15 % for boards 0.8 mm or thinner or copper ≥ 108 µm.',
    tw_dgAria: 'Trace cross-section: width W (a trapezoid when etched), copper thickness t and plating, the dielectric, the optional plane at distance d and where the heat spreads; current I and temperature rise ΔT',
    tw_dgScale: 'cross-section to scale',
    tw_dgScaleExag: 'to scale · t exaggerated',
    tw_dgNoScale: 'not to scale',
    tw_dgHeatPlane: 'heat spreads in the plane',
    tw_dgHeatBoard: 'heat spreads into the board',
    tw_dgHeatInt: 'heat spreads into the laminate',
    tw_dgPlane: 'plane',
    tw_dgBoard: 'board',
    tw_dgExt: 'external layer',
    tw_dgInt: 'internal layer',
    tw_dgEtch: 'etch',
    tw_dgPlate: 'plating',
  },
};

const is2152 = (v) => v.std === 'ipc2152';
const W = (mil, d = 3) => (isImperial() ? `${fixed(mil, 2)} mil` : `${fixed(mil * MM_PER_MIL, d)} mm`);
const Wh = (mil) => (isImperial()
  ? `${fixed(mil, 2)} <span class="u">mil</span>`
  : `${fixed(mil * MM_PER_MIL, 3)} <span class="u">mm</span>`);
const Wsub = (mil) => (isImperial() ? `${fixed(mil * MM_PER_MIL, 3)} mm` : `${fixed(mil, 2)} mil`);

const lenTxt = (mm) => (isImperial() ? `${fmt(mm / MM_PER_MIL, 3)} mil` : `${fmt(mm, 3)} mm`);

/** Spread label baselines at least `gap` apart (order kept) inside [lo, hi]; sets `ty`. */
function spread(items, gap, lo, hi) {
  const s = [...items].sort((a, b) => a.y - b.y);
  s.forEach((it, i) => { it.ty = Math.max(it.y, i ? s[i - 1].ty + gap : lo); });
  for (let i = s.length - 1; i >= 0; i--) {
    const cap = i === s.length - 1 ? hi : s[i + 1].ty - gap;
    if (s[i].ty > cap) s[i].ty = cap;
  }
  return s;
}

/**
 * Live cross-section: the trace (etched trapezoid, foil + plating) on the
 * dielectric, the optional plane at distance d and where the heat goes. W, t
 * and d share one scale; the drawn width grows with the real width on a log
 * scale so wider traces look wider.
 */
function diagram(v, u, r) {
  const ok = !!r;
  const two = is2152(v);
  const plane = two && v.pl === 'yes';
  const internal = !two && v.layer === 'int';
  const mmOf = (k, def) => (Number.isFinite(v[k]) && v[k] > 0 ? toMm(v[k], u[k]) : def);
  const Wmm = ok ? r.widthMm : mmOf('W', 0.5);
  const tMm = ok ? r.totalThicknessMil * MM_PER_MIL : 0.035;
  const platMm = ok && v.plt > 0 ? Math.min(v.plt / 1000, tMm) : 0;
  const uMm = ok ? r.undercutMil * MM_PER_MIL : 0;
  const dMm = mmOf('pd', 0.2);
  const hMm = two ? mmOf('bt', NaN) : NaN;

  const cx = 210; const surf = 100; const BL = 16; const BR = 424; const yBreak = 186;
  let Wpx = Math.min(210, Math.max(36, 55 + 85 * Math.log10(Wmm / 0.1)));
  // A deep plane shrinks the whole section (W too) so d still fits to scale.
  if (plane && (dMm * Wpx) / Wmm > 58) Wpx = Math.max(30, (58 * Wmm) / dMm);
  const s = Wpx / Wmm;
  let scaled = true;
  let tpx = tMm * s;
  const exag = tpx < 3;
  if (tpx > 44) { tpx = 44; scaled = false; } else if (tpx < 3) tpx = 3;
  const upx = Math.min(tMm > 0 ? (uMm / tMm) * tpx : 0, Wpx / 2 - 3);
  const platePx = tMm > 0 ? (platMm / tMm) * tpx : 0;
  let dpx = dMm * s;
  if (plane && (dpx < 10 || dpx > 58.5)) { dpx = Math.max(10, Math.min(58, dpx)); scaled = false; }
  // The board must hold the plane (and stay visible).
  let hpx = Number.isFinite(hMm) ? hMm * s : Infinity;
  const hMin = plane ? dpx + 14 : 24;
  if (hpx < hMin) { hpx = hMin; scaled = false; }
  const yT = surf - tpx;
  const xl = cx - Wpx / 2;
  const xr = cx + Wpx / 2;
  const planeY = surf + dpx;

  // Board (with a break line when it continues below), plane, trace.
  let b = '';
  if (surf + hpx > yBreak) {
    const zz = [];
    for (let x = BR, i = 0; x > BL; x -= 12, i++) zz.push([x, yBreak + (i % 2 ? 3 : -3)]);
    zz.push([BL, yBreak]);
    b += poly([[BL, surf], [BR, surf], ...zz], 'diel') + poly(zz, 'dimline');
  } else b += rect(BL, surf, BR - BL, hpx, 'diel');
  if (internal) b += rect(BL, yT - 18, BR - BL, surf - yT + 18, 'diel');
  if (plane) b += rect(BL, planeY, BR - BL, 5, 'cu');
  b += poly([[xl, surf], [xr, surf], [xr - upx, yT], [xl + upx, yT]], 'cu');
  if (platePx > 0.8) {
    const ins = upx * ((tpx - platePx) / tpx);
    b += path(`M${Math.round((xl + ins) * 10) / 10},${Math.round((yT + platePx) * 10) / 10}H${Math.round((xr - ins) * 10) / 10}`, 'dim');
  }
  if (tpx >= 12 && Wpx >= 30) b += circle(cx, surf - tpx / 2, 4.5, 'term') + circle(cx, surf - tpx / 2, 1.6, 'node');

  // Heat: into the plane and along it, or fanning into the board.
  const flow = { cls: 'flow', headCls: 'arrow flow' };
  if (plane) {
    if (dpx >= 18) [-1, 0, 1].forEach((k) => { b += arrow(cx + (k * Wpx) / 3, surf + 3, cx + (k * Wpx) / 3, planeY - 3, flow); });
    b += arrow(xl - 2, planeY + 2.5, Math.max(BL + 8, xl - 70), planeY + 2.5, flow)
      + arrow(xr + 2, planeY + 2.5, Math.min(BR - 8, xr + 70), planeY + 2.5, flow)
      + text(BL + 6, planeY + 18, t('tw_dgHeatPlane'), { cls: 'lbl', anchor: 'start' });
  } else {
    [-1, 0, 1].forEach((k) => { b += arrow(cx + (k * Wpx) / 3, surf + 3, cx + k * (Wpx / 3 + 26), surf + 40, flow); });
    b += text(cx, surf + 56, t(internal ? 'tw_dgHeatInt' : 'tw_dgHeatBoard'), { cls: 'lbl' });
  }

  // Dimensions: W above (drawn width = trapezoid base), t and d on the right.
  const yW = (internal ? yT - 18 : yT) - 10;
  b += dimH(xl, xr, yW, ok ? `W = ${lenTxt(Wmm)}` : 'W', { cls: ok ? 'val' : 'sym', extFrom: surf });
  if (upx > 0.5) b += text(xl - 6, surf - 3, `${t('tw_dgEtch')} ${v.etch}`, { cls: 'lbl', anchor: 'end' });
  const xT = xr + 10;
  b += dimV(yT, surf, xT, '', { extFrom: xr });
  const um = (mm) => (isImperial() ? fmt(mm / MM_PER_MIL, 3) : fmt(mm * 1000, 3));
  const unit = isImperial() ? 'mil' : 'µm';
  const items = [{ y: (yT + surf) / 2 + 4, s: ok ? `t = ${um(tMm - platMm)} ${unit}` : 't', cls: ok ? 'val' : 'sym' }];
  if (platMm > 0) {
    const pl = `+ ${um(platMm)} ${unit}`;
    const plw = `${pl} ${t('tw_dgPlate')}`;
    items.push({ y: (yT + surf) / 2 + 18, s: plw.length * 6.7 < 436 - xT - 7 ? plw : pl, cls: 'val' });
  }
  if (plane) {
    b += dimV(surf, planeY, xT, '', { extFrom: xr });
    const dOk = Number.isFinite(v.pd) && v.pd > 0;
    items.push({ y: (surf + planeY) / 2 + 4, s: dOk ? `d = ${lenTxt(dMm)}` : 'd', cls: dOk ? 'val' : 'sym' });
  }
  // Labels that would sit on the plane move below it.
  let floor = -Infinity;
  for (const it of spread(items, 14, 24, yBreak - 4)) {
    let y = Math.max(it.ty, floor);
    if (plane && y + 3 > planeY - 1 && y - 11 < planeY + 6) y = planeY + 18;
    b += text(xT + 7, y, it.s, { cls: it.cls, anchor: 'start' });
    floor = y + 14;
  }
  if (plane) b += text(BL + 6, planeY - 4, t('tw_dgPlane'), { cls: 'lbl', anchor: 'start' });

  // Current and temperature rise (inputs and results).
  if (ok) {
    b += text(14, 20, `I = ${si(r.currentA, 'A', 3)}`, { cls: 'val', anchor: 'start' })
      + text(14, 36, `ΔT = ${fmt(r.deltaTC, 3)} °C`, { cls: 'val', anchor: 'start' });
    if (r.margin > 1) b += text(14, 51, `${t('tw_designCurrent')}: ×${fmt(r.margin, 3)}`, { cls: 'lbl', anchor: 'start' });
  }
  const info = two ? (Number.isFinite(hMm) ? `${t('tw_dgBoard')} ${lenTxt(hMm)}` : '') : t(internal ? 'tw_dgInt' : 'tw_dgExt');
  b += text(BL, 206, info, { cls: 'lbl', anchor: 'start' });
  b += text(BR, 206, t(!scaled ? 'tw_dgNoScale' : exag ? 'tw_dgScaleExag' : 'tw_dgScale'), { cls: 'title', anchor: 'end' });
  return svg(440, 212, b, t('tw_dgAria'), { wide: true });
}

export default {
  id: 'trace',
  strings,
  sections: [
    {
      title: 'sectionSetup',
      fields: [
        { key: 'std', type: 'choice', label: 'tw_std', default: 'ipc2152', info: 'tw_stdInfo',
          options: [{ value: 'ipc2152', label: 'IPC-2152', raw: true }, { value: 'ipc2221', label: 'IPC-2221', raw: true }] },
        { key: 'mode', type: 'choice', label: 'mode', default: 'width',
          options: [{ value: 'width', label: 'tw_modeWidth' }, { value: 'current', label: 'tw_modeCurrent' }, { value: 'rise', label: 'tw_modeRise' }] },
        { key: 'layer', type: 'choice', label: 'layer', default: 'ext', info: 'tw_layerInfo', show: (v) => !is2152(v),
          options: [{ value: 'ext', label: 'external' }, { value: 'int', label: 'internal' }] },
      ],
    },
    {
      title: 'sectionInputs',
      fields: [
        { key: 'I', type: 'number', label: 'tw_I', default: 2, units: ['A', 'mA'], show: (v) => v.mode !== 'current' },
        { key: 'dT', type: 'number', label: 'tw_dT', default: 10, units: ['C', 'K', 'F'], info: 'tw_dTInfo', show: (v) => v.mode !== 'rise',
          presets: [10, 20, 30, 45].map((x) => ({ label: `${x} °C`, value: x, unit: 'C' })) },
        { key: 'W', type: 'number', label: 'tw_W', default: 0.5, units: ['mm', 'mil'], pref: 'length', show: (v) => v.mode !== 'width' },
        { key: 't', type: 'number', label: 'tw_t', default: 1, units: ['oz', 'um', 'mil', 'mm'], info: 'tw_tInfo',
          presets: [{ label: '½ oz', value: 0.5, unit: 'oz' }, { label: '1 oz', value: 1, unit: 'oz' }, { label: '2 oz', value: 2, unit: 'oz' }, { label: '3 oz', value: 3, unit: 'oz' }] },
        { key: 'plt', type: 'number', label: 'tw_plating', default: 0, units: ['um'], valid: 'nonneg', info: 'tw_platingInfo',
          presets: [0, 20, 25].map((x) => ({ label: `${x} µm`, value: x })) },
        { key: 'etch', type: 'select', label: 'tw_etch', default: 'none', info: 'tw_etchInfo',
          options: [{ value: 'none', label: 'tw_etchNone' }, { value: '2:1', label: '2:1', raw: true }, { value: '1:1', label: '1:1', raw: true }] },
        { key: 'mg', type: 'number', label: 'tw_margin', default: 0, units: ['pct'], valid: 'nonneg', info: 'tw_marginInfo',
          presets: [0, 10, 20, 30].map((x) => ({ label: `${x} %`, value: x })) },
        { key: 'mw', type: 'number', label: 'tw_minW', default: '', optional: true, units: ['mm', 'mil'], pref: 'length', show: (v) => v.mode === 'width' },
      ],
    },
    {
      title: 'sectionIpc2152',
      show: is2152,
      fields: [
        { key: 'bt', type: 'number', label: 'tw_board', default: 1.6, units: ['mm', 'mil'], info: 'tw_boardInfo',
          presets: [0.8, 1.0, 1.6, 2.0, 2.4].map((x) => ({ label: `${x} mm`, value: x, unit: 'mm' })) },
        { key: 'pl', type: 'choice', label: 'tw_plane', default: 'no', info: 'tw_planeInfo',
          options: [{ value: 'no', label: 'tw_planeNo' }, { value: 'yes', label: 'tw_planeYes' }] },
        { key: 'pd', type: 'number', label: 'tw_planeDist', default: 0.2, units: ['mm', 'mil'], pref: 'length', show: (v) => v.pl === 'yes' },
      ],
    },
    {
      title: 'sectionDc',
      collapsible: true,
      optional: true,
      fields: [
        { key: 'L', type: 'number', label: 'traceLength', default: 50, optional: true, units: ['mm', 'cm', 'm', 'mil', 'in'] },
        { key: 'amb', type: 'number', label: 'ambientTemp', default: 25, units: ['C', 'F', 'K'], valid: 'any' },
        { key: 'f', type: 'number', label: 'tw_freq', default: '', optional: true, units: ['kHz', 'MHz', 'GHz'], info: 'tw_freqInfo' },
      ],
    },
  ],

  diagram,

  compute(v, u) {
    const mm = (k) => (Number.isFinite(v[k]) ? toMm(v[k], u[k]) : NaN);
    return calculateTraceWidth({
      standard: v.std,
      mode: v.mode,
      isExternal: v.layer === 'ext',
      currentA: currentToA(v.I, u.I),
      deltaTC: riseToC(v.dT, u.dT),
      widthMil: mm('W') / MM_PER_MIL,
      thicknessMil: thicknessToMil(v.t, u.t),
      marginPct: v.mg,
      minWidthMil: mm('mw') / MM_PER_MIL,
      boardMm: is2152(v) ? mm('bt') : NaN,
      planeMm: is2152(v) && v.pl === 'yes' ? mm('pd') : NaN,
      ambientC: tempToC(v.amb, u.amb),
      lengthM: Number.isFinite(v.L) ? toMm(v.L, u.L) / 1000 : 0,
      platingMil: (v.plt || 0) / 25.4,
      etch: v.etch,
      fHz: Number.isFinite(v.f) ? v.f * ({ kHz: 1e3, MHz: 1e6, GHz: 1e9 }[u.f]) : 0,
    });
  },

  render(r, v, u) {
    if (!r.ok) return invalid(r.errors);
    let main;
    if (r.mode === 'width') main = hero('tw_width', Wh(r.widthMil), Wsub(r.widthMil));
    else if (r.mode === 'current') main = hero('tw_current', `${fmt(r.currentA, 4)} <span class="u">A</span>`, `ΔT = ${fmt(r.deltaTC)} °C`);
    else main = hero('tw_rise', `${fixed(r.deltaTC, 1)} <span class="u">°C</span>`, r.dc ? `${esc(t('conductorTemp'))} ≈ ${fixed(r.dc.conductorC, 1)} °C` : `${fmt(r.currentA, 4)} A · ${W(r.widthMil)}`);

    const details = rows([
      r.mode === 'width' && r.calcWidthMil !== r.widthMil && ['tw_calcWidth', W(r.calcWidthMil)],
      r.mode === 'rise' && ['traceWidth', W(r.widthMil)],
      r.margin > 1 && ['tw_designCurrent', `${fmt(r.currentA * r.margin, 4)} A (×${fmt(r.margin, 3)})`],
      ['tw_area', `${fmt(r.areaMil2, 4)} mil² · ${fmt(r.areaMil2 * 6.4516e-4, 3)} mm²`],
      ['tw_oz', `${fmt(r.copperOz, 3)} oz/ft² · ${fmt(r.totalThicknessMil * 25.4, 3)} µm`],
      r.undercutMil > 0 && ['tw_undercut', W(r.undercutMil)],
      ['tw_density', `${fmt(r.currentDensity, 3)} A/mm²`],
    ]);

    let mods = '';
    if (r.ipc2152) {
      const m = r.ipc2152.mods;
      mods = block('sectionIpc2152', rows([
        ['tw_baseArea', `${fmt(r.ipc2152.baseArea, 4)} mil²`],
        ['tw_modCopper', `×${fixed(m.copper, 3)}`],
        ['tw_modBoard', `×${fixed(m.board, 3)}`],
        ['tw_modPlane', `×${fixed(m.plane, 3)}`],
        ['tw_modTotal', `×${fixed(m.total, 3)}`, true],
      ]));
    }

    const c = r.compare;
    const compare = r.mode !== 'current'
      ? block('tw_compare', rows([
        ['tw_cmp2152', W(c.ipc2152)],
        ['tw_cmp2221e', W(c.ipc2221Ext)],
        ['tw_cmp2221i', W(c.ipc2221Int)],
      ]))
      : '';

    let dc = '';
    if (r.dc) {
      dc = block('sectionDc', rows([
        ['conductorTemp', `${fixed(r.dc.conductorC, 1)} °C`],
        ['tw_resistance', si(r.dc.resistanceOhm, 'Ω')],
        ['voltageDrop', si(r.dc.voltageDropV, 'V')],
        ['powerLoss', si(r.dc.powerLossW, 'W')],
        r.dc.skinUm !== undefined && ['tw_skin', `${fmt(r.dc.skinUm, 3)} µm`],
        r.dc.acResistanceOhm !== undefined && ['tw_rac', `${si(r.dc.acResistanceOhm, 'Ω')} (×${fixed(r.dc.acFactor, 2)})`],
      ]) + `<p class="note">${esc(t('tw_dcHint'))}</p>`);
    }

    const formula = r.standard === 'ipc2152'
      ? formulaBlock([
        'A0 = (117.555·ΔT^−0.913 + 1.15) · I^(0.84·ΔT^−0.108 + 1.159)   [mil²]',
        'A  = A0 · M_copper(oz, I) · M_board(h) · M_plane(d)',
        'M_board = 25.959 · h^−0.7666           (h [mil])',
        'M_plane = min(1, 0.0031·d + 0.4054)    (d [mil])',
        'W = A / t',
      ], 'tw_note2152', ['IPC-2152 (2009)', 'M. Jouppi, “The Value of IPC-2152”', 'J. Olson / L. Rozenblat, smps.us PCB trace calculator'])
      : formulaBlock([
        'I = k · ΔT^0.44 · A^0.725     k = 0.048 (ext) / 0.024 (int)',
        'A = ( I / (k·ΔT^0.44) )^(1/0.725)   [mil²]',
        'W = A / t,   t = oz · 1.378 mil',
      ], 'tw_note2221', ['IPC-2221B §6.2']);

    // Fab check: the (final) width against the fabricator's minimum for this copper weight (foil, without plating).
    const fab = fabCheck({ traceMm: r.widthMil * MM_PER_MIL, oz: thicknessToMil(v.t, u.t) / 1.378, inner: v.std === 'ipc2221' && v.layer === 'int' });
    return main + messages('warn', r.warnings) + details + mods + compare + dc + fab + formula;
  },
};
