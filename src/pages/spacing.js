import { CATEGORIES, BANDS, PER_VOLT, minimumSpacingMm, bandIndex } from '../engine/spacing.js';
import { hero, block, formulaBlock, messages, invalid } from '../ui/calculator.js';
import { fixed, fmt, esc } from '../ui/format.js';
import { t } from '../i18n.js';

function table(activeRow, activeCol) {
  const head = `<tr><th scope="col">${esc(t('voltageBand'))}</th>${CATEGORIES.map((c, j) =>
    `<th scope="col"${j === activeCol ? ' class="on-col"' : ''}>${c}</th>`).join('')}</tr>`;
  const body = BANDS.map((b, i) => `
    <tr${i === activeRow ? ' class="on-row"' : ''}>
      <th scope="row">${b.from === 0 ? 0 : b.from + 1}–${b.to}</th>
      ${b.valuesMm.map((x, j) => `<td${i === activeRow && j === activeCol ? ' class="hit"' : j === activeCol ? ' class="on-col"' : ''}>${fmt(x)}</td>`).join('')}
    </tr>`).join('');
  const over = `<tr${activeRow === -2 ? ' class="on-row"' : ''}><th scope="row">${esc(t('perVolt'))}</th>${PER_VOLT.map((x, j) =>
    `<td${activeRow === -2 && j === activeCol ? ' class="hit"' : j === activeCol ? ' class="on-col"' : ''}>${fmt(x)}</td>`).join('')}</tr>`;
  return `<div class="table-scroll"><table class="grid"><thead>${head}</thead><tbody>${body}${over}</tbody></table></div>`;
}

export const spacingPage = {
  id: 'spacing',
  title: 'spacingTitle',
  subtitle: 'spacingSubtitle',
  sections: [
    {
      title: 'sectionInputs',
      fields: [
        { key: 'V', type: 'number', label: 'voltage', default: 230, units: ['V'], hint: 'voltageHint' },
        { key: 'cat', type: 'select', label: 'category', default: 'B2',
          options: CATEGORIES.map((c) => ({ value: c, label: `cat_${c}` })) },
      ],
    },
  ],

  compute(v) {
    if (!(Math.abs(v.V) > 0)) return { ok: false, errors: ['voltage'] };
    const mm = minimumSpacingMm(v.V, v.cat);
    const warnings = v.cat === 'A5' || v.cat === 'A7' ? ['spacingCoating'] : [];
    return { ok: true, mm, band: bandIndex(v.V), warnings };
  },

  render(r, v) {
    const col = CATEGORIES.indexOf(v.cat);
    if (!r.ok) return invalid(r.errors) + block('tableTitle', table(-1, col));
    const main = hero('minSpacing', `${fixed(r.mm, 2)} <span class="u">mm</span>`,
      `${fixed(r.mm / 0.0254, 1)} mil · ${esc(t(`cat_${v.cat}`))}`);
    return main + messages('warn', r.warnings)
      + block('tableTitle', table(r.band === -1 ? -2 : r.band, col))
      + formulaBlock([`V > 500 V:  d = c · V   (${v.cat}: c = ${fmt(PER_VOLT[col])} mm/V)`], 'formulaSpacing');
  },
};
