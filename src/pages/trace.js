import { calculateTraceWidth } from '../engine/trace-width.js';
import { thicknessToMil, currentToA, riseToC, tempToC, toMm, MM_PER_MIL } from '../engine/units.js';
import { hero, rows, block, formulaBlock, messages, invalid } from '../ui/calculator.js';
import { fmt, fixed, si, esc } from '../ui/format.js';
import { t } from '../i18n.js';
import { isImperial } from '../prefs.js';

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
  },
};

const is2152 = (v) => v.std === 'ipc2152';
const W = (mil, d = 3) => (isImperial() ? `${fixed(mil, 2)} mil` : `${fixed(mil * MM_PER_MIL, d)} mm`);
const Wh = (mil) => (isImperial()
  ? `${fixed(mil, 2)} <span class="u">mil</span>`
  : `${fixed(mil * MM_PER_MIL, 3)} <span class="u">mm</span>`);
const Wsub = (mil) => (isImperial() ? `${fixed(mil * MM_PER_MIL, 3)} mm` : `${fixed(mil, 2)} mil`);

function diagram(v) {
  const plane = is2152(v) && v.pl === 'yes';
  return `
  <svg class="diagram" viewBox="0 0 380 100" role="img" aria-label="trace">
    <rect class="diel" x="30" y="40" width="320" height="${plane ? 40 : 52}"/>
    ${plane ? '<rect class="cu" x="30" y="80" width="320" height="6"/><path class="dim" d="M60 48V80"/><text x="72" y="68">d</text>' : ''}
    <rect class="cu" x="150" y="28" width="80" height="12"/>
    <path class="dim" d="M150 20h80"/><text x="190" y="16">W</text>
    <path class="dim" d="M240 28v12"/><text x="250" y="38">t</text>
    <text class="lbl" x="344" y="${plane ? 74 : 86}" text-anchor="end">FR-4</text>
  </svg>`;
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
    });
  },

  render(r) {
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
      ['tw_oz', `${fmt(r.copperOz, 3)} oz/ft²`],
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

    return main + messages('warn', r.warnings) + details + mods + compare + dc + formula;
  },
};
