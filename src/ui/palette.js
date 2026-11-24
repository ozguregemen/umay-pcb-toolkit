// Command palette (Ctrl/⌘ K or "/"): fuzzy-ish search over tools in both languages.

import { t, tIn } from '../i18n.js';
import { TOOLS, CATEGORIES, titleKey, descKey } from '../registry.js';
import { esc } from './format.js';
import { icon } from './icons.js';

const norm = (s) => s.toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');

function haystack(tool) {
  return norm([
    tIn('tr', titleKey(tool.id)), tIn('en', titleKey(tool.id)),
    tIn('tr', descKey(tool.id)), tIn('en', descKey(tool.id)),
    tool.keywords, tool.id,
  ].join(' '));
}

/** Rank tools for a query: title-prefix > title word > anywhere. */
export function searchTools(query) {
  const q = norm(query.trim());
  if (!q) return TOOLS.slice();
  const terms = q.split(/\s+/);
  return TOOLS
    .map((tool) => {
      const hay = haystack(tool);
      if (!terms.every((w) => hay.includes(w))) return null;
      const title = norm(t(titleKey(tool.id)));
      const score = title.startsWith(q) ? 0 : title.includes(q) ? 1 : 2;
      return { tool, score };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score)
    .map((x) => x.tool);
}

let dialog;

function build() {
  dialog = document.createElement('dialog');
  dialog.className = 'palette';
  dialog.setAttribute('aria-label', t('search'));
  dialog.innerHTML = `
    <div class="palette-box">
      <div class="palette-input">${icon('search', 18)}
        <input type="search" role="combobox" aria-expanded="true" aria-controls="palette-list" aria-autocomplete="list" autocomplete="off" spellcheck="false">
        <kbd>Esc</kbd>
      </div>
      <ul id="palette-list" role="listbox"></ul>
    </div>`;
  document.body.append(dialog);

  const input = dialog.querySelector('input');
  const list = dialog.querySelector('ul');
  let active = 0;
  let items = [];

  const render = () => {
    items = searchTools(input.value);
    active = Math.min(active, Math.max(0, items.length - 1));
    list.innerHTML = items.length
      ? items.map((tool, i) => {
          const cat = CATEGORIES.find((c) => c.id === tool.cat);
          return `<li role="option" id="pal-${tool.id}" aria-selected="${i === active}" data-id="${tool.id}">
            <span class="pal-icon">${icon(tool.icon, 18)}</span>
            <span class="pal-text"><b>${esc(t(titleKey(tool.id)))}</b><small>${esc(t(cat.title))} · ${esc(t(descKey(tool.id)))}</small></span>
          </li>`;
        }).join('')
      : `<li class="empty">${esc(t('noResults'))}</li>`;
    input.setAttribute('aria-activedescendant', items[active] ? `pal-${items[active].id}` : '');
    list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  };

  const go = (id) => {
    dialog.close();
    location.hash = `#/${id}`;
  };

  input.addEventListener('input', () => { active = 0; render(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { active = Math.min(active + 1, items.length - 1); render(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { active = Math.max(active - 1, 0); render(); e.preventDefault(); }
    else if (e.key === 'Enter' && items[active]) { go(items[active].id); e.preventDefault(); }
  });
  list.addEventListener('click', (e) => {
    const li = e.target.closest('[data-id]');
    if (li) go(li.dataset.id);
  });
  list.addEventListener('mousemove', (e) => {
    const li = e.target.closest('[data-id]');
    if (!li) return;
    const i = items.findIndex((x) => x.id === li.dataset.id);
    if (i !== active) { active = i; render(); }
  });
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog._render = render;
}

export function openPalette() {
  if (!dialog) build();
  const input = dialog.querySelector('input');
  input.placeholder = t('searchPlaceholder');
  input.value = '';
  dialog._render();
  dialog.showModal();
  input.focus();
}

export function initPaletteShortcuts() {
  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
    if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); openPalette(); }
    else if (e.key === '/' && !typing && !dialog?.open) { e.preventDefault(); openPalette(); }
  });
}
