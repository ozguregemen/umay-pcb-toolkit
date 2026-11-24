import { CATEGORIES, BANDS, PER_VOLT, minimumSpacingMm, maxVoltageForSpacing, bandIndex } from '../engine/spacing.js';
import { toMm, fromMm } from '../engine/units.js';
import { hero, block, formulaBlock, messages, rows } from '../ui/calculator.js';
import { fixed, fmt, esc } from '../ui/format.js';
import { t } from '../i18n.js';
import { isImperial } from '../prefs.js';
import { svg, rect, path, text, dimH } from '../ui/svg.js';
import { fabCheck } from '../ui/fabcheck.js';

const strings = {
  tr: {
    sp_modeSpacing: 'Gerilim → min. aralık',
    sp_modeVoltage: 'Aralık → izin verilen gerilim',
    sp_voltage: 'İletkenler arası gerilim',
    sp_voltageHint: 'DC veya AC tepe değeri (230 V AC ≈ 325 V tepe)',
    sp_voltageInfo: 'IPC-2221 tablo değerleri iletkenler arasındaki DC ya da AC tepe gerilimine göre verilir. Şebeke gerilimi için RMS değil tepe değeri girin; geçici aşırı gerilimleri de hesaba katın.',
    sp_spacing: 'Mevcut iletken aralığı',
    sp_category: 'Kategori',
    sp_categoryInfo: 'B: çıplak kart (montaj öncesi) iletkenleri; A: montajlı kart üzerindeki bileşen bacakları/terminalleri. Kaplamalı kategoriler, kaplamanın aralığı tamamen örttüğünü varsayar.',
    cat_B1: 'B1 — İç katman iletkenleri',
    cat_B2: 'B2 — Dış, kaplamasız, deniz seviyesi – 3050 m',
    cat_B3: 'B3 — Dış, kaplamasız, 3050 m üzeri',
    cat_B4: 'B4 — Dış, kalıcı polimer kaplamalı',
    cat_A5: 'A5 — Dış, montaj üstü konformal kaplamalı',
    cat_A6: 'A6 — Dış bileşen bacağı/terminali, kaplamasız',
    cat_A7: 'A7 — Dış bileşen bacağı/terminali, konformal kaplamalı',
    sp_minSpacing: 'Minimum aralık',
    sp_maxVoltage: 'İzin verilen en yüksek gerilim',
    sp_tableTitle: 'IPC-2221 Tablo 6-1 (mm)',
    sp_band: 'Gerilim (V)',
    sp_perVolt: '> 500 V (mm/V)',
    sp_usedRow: 'Kullanılan satır',
    sp_rowOver500: '> 500 V doğrusal kural',
    sp_dgLead: 'bileşen bacağı',
    sp_dgPolymer: 'kalıcı polimer kaplama',
    sp_dgConformal: 'konformal kaplama',
    sp_dgInternal: 'iç katman (laminat içinde)',
    sp_dgAltitude: '3050 m üzeri: seyrek hava',
    sp_dgBetween: 'iletkenler arasında',
    sp_note: '500 V üzerinde aralık = 301–500 V satırındaki değer + kategori katsayısı (mm/V) × (V − 500); ör. B1, 600 V: 0,25 + 100 × 0,0025 = 0,50 mm. Standart, tablo sınırları arasında kalan gerilimler (ör. 15,5 V) için kural vermez; güvenli tarafta kalmak için bir üst satır kullanılır. Değerler IPC-2221B’ye göredir; IPC-2221C (2023) tabloyu değiştirmiştir.',
    warn_spacingCoating: 'A5/A7 kaplamalı kategoriler, kaplamanın iletkenlerin tamamını örttüğünü ve kusursuz uygulandığını varsayar.',
    warn_spacingMains: 'IPC-2221 Tablo 6-1 fonksiyonel yalıtım içindir. Şebeke bağlantılı ve dokunulabilir devrelerde güvenlik için IEC 62368-1 / IEC 60664-1 creepage ve clearance değerleri esas alınmalıdır; bunlar genellikle çok daha büyüktür.',
    warn_spacingBelowTable: 'Bu aralık tablonun ilk satırındaki değerin altında; bu kategori için yetersiz.',
  },
  en: {
    sp_modeSpacing: 'Voltage → min. spacing',
    sp_modeVoltage: 'Spacing → allowed voltage',
    sp_voltage: 'Voltage between conductors',
    sp_voltageHint: 'DC or AC peak (230 V AC ≈ 325 V peak)',
    sp_voltageInfo: 'IPC-2221 values are given for the DC or AC-peak voltage between conductors. For mains enter the peak, not RMS, and consider transient overvoltages.',
    sp_spacing: 'Available conductor spacing',
    sp_category: 'Category',
    sp_categoryInfo: 'B: bare-board conductors; A: component leads/terminations on the assembly. Coated categories assume the coating fully covers the gap.',
    cat_B1: 'B1 — Internal conductors',
    cat_B2: 'B2 — External, uncoated, sea level to 3050 m',
    cat_B3: 'B3 — External, uncoated, over 3050 m',
    cat_B4: 'B4 — External, permanent polymer coating',
    cat_A5: 'A5 — External, conformal coating over assembly',
    cat_A6: 'A6 — External component lead/termination, uncoated',
    cat_A7: 'A7 — External component lead/termination, conformal coated',
    sp_minSpacing: 'Minimum spacing',
    sp_maxVoltage: 'Highest allowed voltage',
    sp_tableTitle: 'IPC-2221 Table 6-1 (mm)',
    sp_band: 'Voltage (V)',
    sp_perVolt: '> 500 V (mm/V)',
    sp_usedRow: 'Row used',
    sp_rowOver500: '> 500 V linear rule',
    sp_dgLead: 'component lead',
    sp_dgPolymer: 'permanent polymer coating',
    sp_dgConformal: 'conformal coating',
    sp_dgInternal: 'internal layer (inside laminate)',
    sp_dgAltitude: 'above 3050 m: thin air',
    sp_dgBetween: 'between conductors',
    sp_note: 'Above 500 V, spacing = the 301–500 V value + category coefficient (mm/V) × (V − 500); e.g. B1 at 600 V: 0.25 + 100 × 0.0025 = 0.50 mm. The standard gives no rule for voltages between the printed band limits (e.g. 15.5 V); the next band up is used to stay conservative. Values follow IPC-2221B; IPC-2221C (2023) revised the table.',
    warn_spacingCoating: 'Coated categories A5/A7 assume the coating covers all conductors and is applied without defects.',
    warn_spacingMains: 'IPC-2221 Table 6-1 covers functional insulation. For mains-connected or user-accessible circuits, safety creepage and clearance per IEC 62368-1 / IEC 60664-1 apply and are usually much larger.',
    warn_spacingBelowTable: 'This spacing is below the first row of the table; insufficient for this category.',
  },
};

function table(activeRow, activeCol) {
  const head = `<tr><th scope="col">${esc(t('sp_band'))}</th>${CATEGORIES.map((c, j) =>
    `<th scope="col"${j === activeCol ? ' class="on-col"' : ''}>${c}</th>`).join('')}</tr>`;
  const cell = (x, i, j) => {
    const cls = i === activeRow && j === activeCol ? 'hit' : j === activeCol ? 'on-col' : '';
    return `<td${cls ? ` class="${cls}"` : ''}>${fmt(x)}</td>`;
  };
  const body = BANDS.map((b, i) => `
    <tr${i === activeRow ? ' class="on-row"' : ''}>
      <th scope="row">${b.from === 0 ? 0 : b.from + 1}–${b.to}</th>
      ${b.valuesMm.map((x, j) => cell(x, i, j)).join('')}
    </tr>`).join('');
  const over = `<tr${activeRow === -2 ? ' class="on-row"' : ''}><th scope="row">${esc(t('sp_perVolt'))}</th>${PER_VOLT.map((x, j) => cell(x, activeRow === -2 ? -2 : -9, j)).join('')}</tr>`;
  return `<div class="table-scroll"><table class="grid"><thead>${head}</thead><tbody>${body}${over}</tbody></table></div>`;
}

const mmMil = (mm) => (isImperial()
  ? `${fixed(fromMm(mm, 'mil'), 1)} <span class="u">mil</span>`
  : `${fixed(mm, 2)} <span class="u">mm</span>`);
const mmMilSub = (mm) => (isImperial() ? `${fixed(mm, 3)} mm` : `${fixed(fromMm(mm, 'mil'), 1)} mil`);

/**
 * Live cross-section: what the category means physically, and the spacing
 * between two conductors at the voltage. The gap grows on a log scale so a
 * larger voltage visibly needs more room (not to scale).
 */
function diagram(v, u, r) {
  const cat = v.cat;
  const mm = r ? (r.mode === 'voltage' ? r.dMm : r.mm) : NaN;
  const volts = r ? (r.mode === 'voltage' ? r.vmax : Math.abs(v.V)) : NaN;
  const gap = Number.isFinite(mm) && mm > 0 ? Math.max(36, Math.min(220, 70 + 55 * Math.log10(mm / 0.1))) : 90;
  const cx = 220;
  const x1 = cx - gap / 2;
  const x2 = cx + gap / 2;
  const internal = cat === 'B1';
  const lead = cat === 'A6' || cat === 'A7';
  const coated = cat === 'B4' || cat === 'A5' || cat === 'A7';
  const surf = internal ? 110 : 112; // conductor bottom y
  const cH = 12;
  let body = '';
  // 1) Board
  body += internal
    ? rect(30, 70, 380, 90, 'diel') + rect(30, 66, 380, 4, 'cu') + rect(30, 160, 380, 4, 'cu')
    : rect(30, 112, 380, 56, 'diel') + text(40, 160, 'FR-4', { cls: 'lbl', anchor: 'start' });
  // 2) Component bodies and leads (A6/A7)
  if (lead) {
    body += rect(x1 - 92, surf - 58, 56, 26, 'soft', ' rx="3"') + rect(x2 + 36, surf - 58, 56, 26, 'soft', ' rx="3"')
      + path(`M${x1 - 36},${surf - 45}H${x1 - 22}V${surf - cH}H${x1 - 4}`, 'wire') + path(`M${x2 + 36},${surf - 45}H${x2 + 22}V${surf - cH}H${x2 + 4}`, 'wire')
      + text(x1 - 64, surf - 41, 'IC', { cls: 'lbl' }) + text(x2 + 64, surf - 41, 'IC', { cls: 'lbl' });
  }
  // 3) Coating over the conductors
  if (coated) {
    const top = lead ? surf - 66 : surf - cH - 9;
    body += path(`M30,${surf}V${top + 8}Q30,${top} 38,${top}H402Q410,${top} 410,${top + 8}V${surf}Z`, 'zone');
  }
  // 4) Conductors (traces or pads)
  body += rect(x1 - 70, surf - cH, 70, cH, 'cu') + rect(x2, surf - cH, 70, cH, 'cu');
  // 5) Labels
  if (coated) body += text(404, (lead ? surf - 72 : surf - cH - 14), t(cat === 'B4' ? 'sp_dgPolymer' : 'sp_dgConformal'), { cls: 'lbl', anchor: 'end' });
  if (lead) body += text(36, surf - 72, t('sp_dgLead'), { cls: 'lbl', anchor: 'start' });
  if (internal) body += text(404, 84, t('sp_dgInternal'), { cls: 'lbl', anchor: 'end' });
  if (cat === 'B3') body += text(404, 28, t('sp_dgAltitude'), { cls: 'lbl', anchor: 'end' });
  const signY = internal ? surf + 16 : surf + 18;
  body += text(x1 - 35, signY, '+', { cls: 'val', size: 15 }) + text(x2 + 35, signY, '−', { cls: 'val', size: 15 });
  // 6) The spacing
  const dimY = lead ? surf - 26 : surf - cH - (coated ? 22 : 16);
  body += dimH(x1, x2, dimY, Number.isFinite(mm) ? `d ≥ ${isImperial() ? `${fixed(fromMm(mm, 'mil'), 1)} mil` : `${fixed(mm, 2)} mm`}` : 'd', { cls: 'val', extFrom: surf - cH });
  if (Number.isFinite(volts)) body += text(cx, 196, `${fmt(volts, 4)} V ${t('sp_dgBetween')}`, { cls: 'title' });
  return svg(440, 205, body, t(`cat_${cat}`), { wide: true });
}

export default {
  diagram,
  id: 'spacing',
  strings,
  sections: [
    {
      title: 'sectionSetup',
      fields: [
        { key: 'mode', type: 'choice', label: 'mode', default: 'spacing',
          options: [{ value: 'spacing', label: 'sp_modeSpacing' }, { value: 'voltage', label: 'sp_modeVoltage' }] },
        { key: 'cat', type: 'select', label: 'sp_category', default: 'B2', info: 'sp_categoryInfo',
          options: CATEGORIES.map((c) => ({ value: c, label: `cat_${c}` })) },
      ],
    },
    {
      title: 'sectionInputs',
      fields: [
        { key: 'V', type: 'number', label: 'sp_voltage', default: 48, units: ['V'], hint: 'sp_voltageHint', info: 'sp_voltageInfo',
          show: (v) => v.mode === 'spacing',
          presets: [3.3, 12, 24, 48, 325, 400].map((x) => ({ label: `${x} V`, value: x })) },
        { key: 'd', type: 'number', label: 'sp_spacing', default: 0.5, units: ['mm', 'mil'], pref: 'length',
          show: (v) => v.mode === 'voltage' },
      ],
    },
  ],

  compute(v, u) {
    const col = CATEGORIES.indexOf(v.cat);
    const warnings = [];
    if (v.cat === 'A5' || v.cat === 'A7') warnings.push('spacingCoating');
    if (v.mode === 'voltage') {
      const dMm = toMm(v.d, u.d);
      const vmax = maxVoltageForSpacing(dMm, v.cat);
      if (vmax === 0) warnings.push('spacingBelowTable');
      if (vmax > 60) warnings.push('spacingMains');
      return { ok: true, mode: 'voltage', col, dMm, vmax, band: vmax > 500 ? -2 : bandIndex(vmax), warnings };
    }
    const mm = minimumSpacingMm(v.V, v.cat);
    if (Math.abs(v.V) > 60) warnings.push('spacingMains');
    const b = bandIndex(v.V);
    return { ok: true, mode: 'spacing', col, mm, band: b === -1 ? -2 : b, warnings };
  },

  render(r, v) {
    const rowLabel = r.band === -2 ? t('sp_rowOver500') : `${BANDS[r.band].from === 0 ? 0 : BANDS[r.band].from + 1}–${BANDS[r.band].to} V`;
    const main = r.mode === 'voltage'
      ? hero('sp_maxVoltage', `${fmt(r.vmax, 4)} <span class="u">V</span>`, esc(t(`cat_${v.cat}`)))
      : hero('sp_minSpacing', mmMil(r.mm), `${mmMilSub(r.mm)} · ${esc(t(`cat_${v.cat}`))}`);
    return main
      + messages('warn', r.warnings)
      + rows([['sp_usedRow', esc(r.mode === 'voltage' && r.vmax === 0 ? '—' : rowLabel)]])
      + block('sp_tableTitle', table(r.band, r.col))
      // Fab check: the spacing against the fabricator's minimum gap (B1 = internal layers).
      + fabCheck({ spaceMm: r.mode === 'voltage' ? r.dMm : r.mm, oz: 1, inner: v.cat === 'B1' }, { note: `${t('fab_n1oz')} ${t('fab_nSpacing')}` })
      + formulaBlock([
        'V ≤ 500 V :  d = Table 6-1 [band(V), category]',
        `V > 500 V :  d = d(301–500 V) + c · (V − 500)   (${v.cat}: c = ${fmt(PER_VOLT[r.col])} mm/V)`,
      ], 'sp_note', ['IPC-2221B §6.3, Table 6-1']);
  },
};
