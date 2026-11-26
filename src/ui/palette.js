// Command palette (Ctrl/⌘ K or "/"): search tools, lessons, lesson text,
// glossary terms and saved calculations.

import { t, tIn, getLang } from '../i18n.js';
import { TOOLS, CATEGORIES, titleKey, descKey } from '../registry.js';
import { LESSONS } from '../learn/index.js';
import { norm, loadIndex, searchContent, hitHref } from '../learn/search.js';
import { listSaved, savedHref } from '../saved.js';
import { esc } from './format.js';
import { icon } from './icons.js';

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

function scored(query) {
  const q = norm(query.trim());
  const all = entries();
  if (!q) return all.filter((e) => !e.key.startsWith('learn-')).map((e) => ({ e, score: 0 }));
  const terms = q.split(/\s+/);
  return all
    .map((e) => {
      if (!terms.every((w) => haystack(e).includes(w))) return null;
      const title = norm(t(e.title));
      const score = title.startsWith(q) ? 0 : title.includes(q) ? 1 : 2;
      return { e, score };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score);
}

/** Rank entries for a query: title prefix > title contains > anywhere. Empty query → tools + learning path. */
export const searchTools = (query) => scored(query).map((x) => x.e);

/** Saved calculations whose name or project contains every search word. */
function savedHits(query) {
  const terms = norm(query.trim()).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return listSaved()
    .filter((x) => { const n = norm(`${x.name} ${x.project}`); return terms.every((w) => n.includes(w)); })
    .slice(0, 5);
}

const marked = (s) => (s?.mark
  ? `${esc(s.text.slice(0, s.mark[0]))}<mark>${esc(s.text.slice(s.mark[0], s.mark[1]))}</mark>${esc(s.text.slice(s.mark[1]))}`
  : esc(s?.text ?? ''));

/**
 * Everything the palette lists for a query, best first:
 * [{ href, icon, title, sub (HTML) }]. Lesson text and glossary terms appear
 * once the index has loaded (see openPalette).
 */
export function searchAll(query) {
  const rows = scored(query).map(({ e, score }) => ({
    score, href: e.href, icon: e.icon, title: t(e.title), sub: `${esc(t(e.cat))} · ${esc(t(e.desc))}`,
  }));
  for (const x of savedHits(query)) {
    rows.push({
      score: 0.8, href: savedHref(x).slice(2), icon: 'bookmark', title: x.name,
      sub: esc([t('saved_title'), t(titleKey(x.tool)), x.project, x.value].filter(Boolean).join(' · ')),
    });
  }
  for (const h of searchContent(query, getLang())) {
    const lesson = t(`lesson_${h.lesson}`);
    rows.push({
      score: h.score,
      href: hitHref(h),
      icon: h.kind === 'term' ? 'info' : 'book',
      title: h.title || lesson,
      sub: [esc(lesson), marked(h.snippet)].filter(Boolean).join(' · '),
    });
  }
  return rows.sort((a, b) => a.score - b.score);
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
    items = searchAll(input.value);
    active = Math.min(active, Math.max(0, items.length - 1));
    list.innerHTML = items.length
      ? items.map((e, i) => `<li role="option" id="pal-${i}" aria-selected="${i === active}" data-i="${i}">
            <span class="pal-icon">${icon(e.icon, 18)}</span>
            <span class="pal-text"><b>${esc(e.title)}</b><small>${e.sub}</small></span>
          </li>`).join('')
      : `<li class="empty">${esc(t('noResults'))}</li>`;
    input.setAttribute('aria-activedescendant', items[active] ? `pal-${active}` : '');
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
    const li = e.target.closest('[data-i]');
    if (li) go(items[Number(li.dataset.i)].href);
  });
  list.addEventListener('mousemove', (e) => {
    const li = e.target.closest('[data-i]');
    if (!li) return;
    const i = Number(li.dataset.i);
    if (i !== active) {
      active = i;
      list.querySelectorAll('[data-i]').forEach((el) => el.setAttribute('aria-selected', String(el === li)));
      input.setAttribute('aria-activedescendant', `pal-${i}`);
    }
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
  // Lesson text and glossary: loaded on first use, then listed as you type.
  loadIndex().then(() => { if (dialog.open && input.value.trim()) dialog._render(); });
}

export function initPaletteShortcuts() {
  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
    if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); openPalette(); }
    else if (e.key === '/' && !typing && !dialog?.open) { e.preventDefault(); openPalette(); }
  });
}
