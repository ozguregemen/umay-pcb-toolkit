// Command palette (Ctrl/⌘ K or "/"): search tools and lessons in both languages.

import { t, tIn } from '../i18n.js';
import { TOOLS, CATEGORIES, titleKey, descKey } from '../registry.js';
import { LESSONS } from '../learn/index.js';
import { esc } from './format.js';
import { icon } from './icons.js';

const norm = (s) => s.toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');

/** Searchable entries: every calculator, the learning path and each lesson. */
function entries() {
  return [
    ...TOOLS.map((x) => ({
      key: x.id, href: x.id, icon: x.icon, title: titleKey(x.id), desc: descKey(x.id),
      cat: CATEGORIES.find((c) => c.id === x.cat).title, keywords: x.keywords,
    })),
    { key: 'learn', href: 'learn', icon: 'book', title: 'learn_title', desc: 'learn_lead', cat: 'catLearn',
      keywords: 'learn ogren tutorial ders egitim beginner baslangic' },
    ...LESSONS.map((l) => ({
      key: `learn-${l.id}`, href: `learn/${l.id}`, icon: 'book', title: `lesson_${l.id}`, desc: `lesson_${l.id}_desc`,
      cat: 'catLearn', keywords: 'ders lesson tutorial ogren',
    })),
  ];
}

const haystack = (e) => norm([tIn('tr', e.title), tIn('en', e.title), tIn('tr', e.desc), tIn('en', e.desc), e.keywords, e.key].join(' '));

/** Rank entries for a query: title prefix > title contains > anywhere. Empty query → tools + learning path. */
export function searchTools(query) {
  const q = norm(query.trim());
  const all = entries();
  if (!q) return all.filter((e) => !e.key.startsWith('learn-'));
  const terms = q.split(/\s+/);
  return all
    .map((e) => {
      if (!terms.every((w) => haystack(e).includes(w))) return null;
      const title = norm(t(e.title));
      const score = title.startsWith(q) ? 0 : title.includes(q) ? 1 : 2;
      return { e, score };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score)
    .map((x) => x.e);
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
      ? items.map((e, i) => `<li role="option" id="pal-${e.key}" aria-selected="${i === active}" data-href="${e.href}">
            <span class="pal-icon">${icon(e.icon, 18)}</span>
            <span class="pal-text"><b>${esc(t(e.title))}</b><small>${esc(t(e.cat))} · ${esc(t(e.desc))}</small></span>
          </li>`).join('')
      : `<li class="empty">${esc(t('noResults'))}</li>`;
    input.setAttribute('aria-activedescendant', items[active] ? `pal-${items[active].key}` : '');
    list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  };

  const go = (href) => {
    dialog.close();
    location.hash = `#/${href}`;
  };

  input.addEventListener('input', () => { active = 0; render(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { active = Math.min(active + 1, items.length - 1); render(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { active = Math.max(active - 1, 0); render(); e.preventDefault(); }
    else if (e.key === 'Enter' && items[active]) { go(items[active].href); e.preventDefault(); }
  });
  list.addEventListener('click', (e) => {
    const li = e.target.closest('[data-href]');
    if (li) go(li.dataset.href);
  });
  list.addEventListener('mousemove', (e) => {
    const li = e.target.closest('[data-href]');
    if (!li) return;
    const i = items.findIndex((x) => x.href === li.dataset.href);
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
