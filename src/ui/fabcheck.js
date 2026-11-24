// "Fab check / Üretici kontrolü" block: compares a page's geometry with the
// minimums of the fabricator chosen in prefs `fab` (src/engine/fabs.js).
// Any page can append fabCheck({...}) to its result HTML. Choosing another
// fabricator in the block stores the pref and re-renders the page (the
// calculator form listens to "input" events), so every page picks it up.

import { t, registerStrings } from '../i18n.js';
import { esc, fixed, fmt } from './format.js';
import { getPref, setPref, isImperial } from '../prefs.js';
import { checks } from './calculator.js';
import { FABS, fabById, fabChecks } from '../engine/fabs.js';

const strings = {
  tr: {
    fab_title: 'Üretici kontrolü',
    fab_label: 'Üretici',
    fab_none: 'Üretici seçilmedi',
    fab_hint: 'Bir üretici seçin; bu sayfadaki ölçüler onun en küçük değerleriyle karşılaştırılır.',
    fab_generic: 'Genel: IPC-2221 Seviye B / tipik',
    fab_c_trace: 'İz genişliği ≥ {lim}',
    fab_c_space: 'İz aralığı ≥ {lim}',
    fab_c_hole: 'Delik çapı ≥ {lim}',
    fab_c_ring: 'Halka ({kind}) ≥ {lim}',
    fab_c_viaPad: 'Via pad çapı ≥ {lim}',
    fab_c_holeCu: 'Delik–bakır aralığı (iç katman) ≥ {lim}',
    fab_c_thickness: 'Kart kalınlığı: {lim}',
    fab_c_layers: 'Katman sayısı (bu hizmette en çok {lim})',
    fab_d_cu: '{oz} oz bakır, {pos}',
    fab_d_outer: 'dış katman',
    fab_d_inner: 'iç katman',
    fab_d_ring: '(pad − delik) / 2 = {val}',
    fab_d_viaPad: 'en küçük delik + 2 × via halkası',
    fab_d_holeCu: '(antipad − delik) / 2 = {val}',
    fab_d_thickNo: 'listede bu kalınlığa yakın bir seçenek yok',
    fab_d_none: 'Üretici bu bakır ağırlığı için değer yayımlamıyor; sorun.',
    fab_via: 'via',
    fab_pth: 'bacaklı delik',
    fab_src: 'Kaynak',
    fab_accessed: 'erişim',
    fab_genericSrc: 'IPC-2221B §9.1 Tablo 9-1 (Seviye B halka) ve üç üreticinin ortak, en büyük sınırları',
    fab_nLayers: 'Katman sayısı bilinmediği için 1–2 katmanlı kartın (daha sıkı) değeri kullanıldı.',
    fab_n1oz: '1 oz bakır varsayıldı.',
    fab_nSpacing: 'Gerilimin gerektirdiği aralık üreticinin en küçük aralığından küçükse üreticinin değerini kullanın.',
  },
  en: {
    fab_title: 'Fab check',
    fab_label: 'Fabricator',
    fab_none: 'No fabricator selected',
    fab_hint: 'Choose a fabricator to compare the dimensions on this page with its minimums.',
    fab_generic: 'Generic: IPC-2221 Level B / typical',
    fab_c_trace: 'Trace width ≥ {lim}',
    fab_c_space: 'Trace spacing ≥ {lim}',
    fab_c_hole: 'Hole diameter ≥ {lim}',
    fab_c_ring: 'Annular ring ({kind}) ≥ {lim}',
    fab_c_viaPad: 'Via pad diameter ≥ {lim}',
    fab_c_holeCu: 'Hole-to-copper (inner layer) ≥ {lim}',
    fab_c_thickness: 'Board thickness: {lim}',
    fab_c_layers: 'Layer count (this service: at most {lim})',
    fab_d_cu: '{oz} oz copper, {pos}',
    fab_d_outer: 'outer layer',
    fab_d_inner: 'inner layer',
    fab_d_ring: '(pad − hole) / 2 = {val}',
    fab_d_viaPad: 'smallest hole + 2 × via ring',
    fab_d_holeCu: '(antipad − hole) / 2 = {val}',
    fab_d_thickNo: 'no listed thickness close to this one',
    fab_d_none: 'The fabricator publishes no value for this copper weight; ask them.',
    fab_via: 'via',
    fab_pth: 'leaded hole',
    fab_src: 'Source',
    fab_accessed: 'accessed',
    fab_genericSrc: 'IPC-2221B §9.1 Table 9-1 (Level B ring) and the largest of the three fabricators’ limits',
    fab_nLayers: 'With the layer count unknown, the (stricter) 1–2 layer value is used.',
    fab_n1oz: 'Assumes 1 oz copper.',
    fab_nSpacing: 'If the voltage needs less spacing than the fabricator’s minimum, use the fabricator’s value.',
  },
};
registerStrings(strings);
export { strings as fabStrings };

/** Length for display in the current unit (mm or mil). */
export const fabLen = (mm) => (isImperial() ? `${fixed(mm / 0.0254, 1)} mil` : `${fixed(mm, 3)} mm`);

export const fabName = (fab) => (fab.id === 'generic' ? t('fab_generic') : `${fab.name} · ${fab.service}`);

/** The fabricator chosen in prefs, or null. */
export const currentFab = () => fabById(getPref('fab'));

/** <select> bound to prefs `fab` (handled by the delegated listener below). */
export function fabSelect(id = '') {
  const cur = getPref('fab') ?? 'none';
  const opts = [['none', t('fab_none')], ...FABS.map((f) => [f.id, fabName(f)])]
    .map(([v, l]) => `<option value="${v}"${v === cur ? ' selected' : ''}>${esc(l)}</option>`).join('');
  return `<select data-fab-pref${id ? ` id="${id}"` : ''} aria-label="${esc(t('fab_label'))}">${opts}</select>`;
}

/** Source line with link and access date. */
export function fabSource(fab) {
  const date = `${t('fab_accessed')} ${fab.accessed}`;
  if (!fab.url) return `<p class="refs">${esc(t('fab_src'))}: ${esc(t('fab_genericSrc'))} · ${esc(date)}</p>`;
  const links = [fab.url, fab.url2].filter(Boolean)
    .map((u) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https:\/\/(www\.)?/, ''))}</a>`).join(' · ');
  return `<p class="refs">${esc(t('fab_src'))}: ${esc(fab.name)} · ${links} · ${esc(date)}</p>`;
}

/** Rows for checks(): [ok, labelHtml, detailHtml]. */
export function fabRows(fab, g) {
  return fabChecks(fab, g).map((c) => {
    const lim = c.limit !== undefined && c.limit !== null ? fabLen(c.limit) : '—';
    const cu = t('fab_d_cu', { oz: fmt(c.oz ?? 1, 2), pos: t(c.inner ? 'fab_d_inner' : 'fab_d_outer') });
    switch (c.id) {
      case 'trace':
      case 'space':
        return [c.ok, esc(t(`fab_c_${c.id}`, { lim })), esc(c.ok === null ? `${fabLen(c.value)} · ${t('fab_d_none')}` : `${fabLen(c.value)} · ${cu}`)];
      case 'hole':
        return [c.ok, esc(t('fab_c_hole', { lim })), esc(fabLen(c.value))];
      case 'ring':
        return [c.ok, esc(t('fab_c_ring', { lim, kind: t(c.kind === 'pth' ? 'fab_pth' : 'fab_via') })), esc(t('fab_d_ring', { val: fabLen(c.value) }))];
      case 'viaPad':
        return [c.ok, esc(t('fab_c_viaPad', { lim })), esc(`${fabLen(c.value)} · ${t('fab_d_viaPad')}`)];
      case 'holeCu':
        return [c.ok, esc(t('fab_c_holeCu', { lim })), esc(t('fab_d_holeCu', { val: fabLen(c.value) }))];
      case 'thickness':
        return [c.ok, esc(t('fab_c_thickness', { lim: `${fabLen(c.limit)} ± ${fabLen(c.tol)}` })),
          esc(c.ok ? fabLen(c.value) : `${fabLen(c.value)} · ${t('fab_d_thickNo')}`)];
      case 'layers':
        return [c.ok, esc(t('fab_c_layers', { lim: c.limit })), esc(String(c.value))];
      default:
        return null;
    }
  }).filter(Boolean);
}

/**
 * Compact block: fab selector + checks for geometry g (see fabChecks), or a
 * one-line hint when no fabricator is chosen. opts.select = false hides the
 * selector (when the page has its own); opts.note adds a line (assumptions).
 */
export function fabCheck(g, { select = true, note = '' } = {}) {
  const fab = currentFab();
  const sel = select ? `<div class="field" style="margin:0 0 10px">${fabSelect()}</div>` : '';
  if (!fab) return `<div class="block fab-check"><h2>${esc(t('fab_title'))}</h2>${sel}<p class="note">${esc(t('fab_hint'))}</p></div>`;
  // JLCPCB lists 1–2 layer and multilayer trace rules separately.
  const twoLayer = (g.traceMm !== undefined || g.spaceMm !== undefined) && !g.inner && g.layers === undefined
    && fab.traceSpace.some((r) => r.two);
  const notes = [note, twoLayer && t('fab_nLayers')].filter(Boolean).join(' ');
  return `<div class="block fab-check"><h2>${esc(t('fab_title'))}</h2>${sel}${checks(fabRows(fab, g))}`
    + `${notes ? `<p class="note">${esc(notes)}</p>` : ''}${fabSource(fab)}</div>`;
}

// One delegated listener for every fab selector: store the pref, then ask the
// page around it to recompute (calculator forms re-render on "input").
if (typeof document !== 'undefined') {
  document.addEventListener('change', (e) => {
    const sel = e.target.closest?.('select[data-fab-pref]');
    if (!sel) return;
    setPref('fab', sel.value);
    const calc = sel.closest('.calc');
    calc?.querySelector('form')?.dispatchEvent(new Event('input', { bubbles: true }));
    const again = calc?.querySelector('select[data-fab-pref]');
    if (again && again !== sel && !sel.isConnected) again.focus();
  });
}
