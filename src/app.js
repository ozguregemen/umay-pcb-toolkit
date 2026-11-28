// App shell: hash router with lazy-loaded pages, sidebar, palette, preferences.

import { t, getLang, setLang, onLangChange, registerStrings } from './i18n.js';
import { TOOLS, CATEGORIES, toolById, titleKey, descKey } from './registry.js';
import { mountCalculator } from './ui/calculator.js';
import { openPalette, initPaletteShortcuts } from './ui/palette.js';
import { installZoom } from './ui/zoom.js';
import { initOffline } from './offline.js';
import { icon } from './ui/icons.js';
import { esc } from './ui/format.js';
import { getPref, setPref, pushRecent, onPrefChange } from './prefs.js';
import { mountLearnIndex, mountLesson, lessonsForTool } from './learn/index.js';
import { reveal } from './learn/search.js';
import { favs, listSaved, savedHref } from './saved.js';
import { decorateTool, mountSaved } from './ui/saved.js';
import { mountReport, reportProject, reportDocTitle } from './ui/report.js';

const main = document.getElementById('main');
const sidebar = document.getElementById('sidebar');
const navEl = document.getElementById('nav');
const pageCache = new Map();
let navActive = '';

function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = h.split('?');
  return { id: path, params: new URLSearchParams(query) };
}

// With 40+ tools the sidebar would be two screens long, so categories are
// collapsible: the one holding the current tool is open, the rest follow what
// the reader opened or closed (remembered); favourites and recently used tools
// sit on top.
function renderNav(activeId) {
  navActive = activeId;
  const cur = (id) => (id === activeId ? ' aria-current="page"' : '');
  const openPref = getPref('navOpen') || {};
  const activeCat = toolById(activeId)?.cat;
  const link = (x, mark = true) => `
    <a href="#/${x.id}"${mark && x.id === activeId ? ' aria-current="page"' : ''}>${icon(x.icon, 18)}<span>${esc(t(titleKey(x.id)))}</span></a>`;
  // Alphabetical, so entries do not jump around on every navigation.
  const byTitle = (a, b) => t(titleKey(a.id)).localeCompare(t(titleKey(b.id)), getLang());
  const starred = favs().map(toolById).sort(byTitle);
  const recent = (getPref('recent') || []).filter((id) => !starred.some((x) => x.id === id)).slice(0, 4)
    .map(toolById).filter(Boolean).sort(byTitle);
  const savedCount = listSaved().length;
  navEl.innerHTML = `
    <a class="nav-home" href="#/"${cur('')}>${icon('home', 18)}<span>${esc(t('home'))}</span></a>
    <a class="nav-home" href="#/saved"${cur('saved')}>${icon('bookmark', 18)}<span>${esc(t('saved_title'))}</span>${savedCount ? `<span class="nav-count">${savedCount}</span>` : ''}</a>
    ${starred.length ? `
      <div class="nav-group">
        <h2 class="nav-cat">${esc(t('favs'))}</h2>
        ${starred.map((x) => link(x, false)).join('')}
      </div>` : ''}
    <div class="nav-group">
      <h2 class="nav-cat">${esc(t('catLearn'))}</h2>
      <a href="#/learn"${cur('learn')}>${icon('book', 18)}<span>${esc(t('learn_title'))}</span></a>
      <a href="#/learn/glossary"${cur('learn/glossary')}>${icon('info', 18)}<span>${esc(t('lesson_glossary'))}</span></a>
    </div>
    ${recent.length ? `
      <div class="nav-group">
        <h2 class="nav-cat">${esc(t('homeRecent'))}</h2>
        ${recent.map((x) => link(x, false)).join('')}
      </div>` : ''}
    ${CATEGORIES.map((c) => {
      const tools = TOOLS.filter((x) => x.cat === c.id);
      return `
      <details class="nav-group" data-cat="${c.id}"${c.id === activeCat || openPref[c.id] ? ' open' : ''}>
        <summary class="nav-cat"><span>${esc(t(c.title))}</span><span class="nav-count">${tools.length}</span>${icon('down', 14)}</summary>
        ${tools.map((x) => link(x)).join('')}
      </details>`;
    }).join('')}`;
}

// Remember only what the reader toggles (a click or Enter/Space on the
// summary), not the automatic opening of the current category.
navEl.addEventListener('click', (e) => {
  const group = e.target.closest('summary')?.parentElement;
  if (!group?.dataset.cat) return;
  setTimeout(() => setPref('navOpen', { ...(getPref('navOpen') || {}), [group.dataset.cat]: group.open }), 0);
});

function renderChrome(activeId) {
  renderNav(activeId);
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
    el.setAttribute('aria-label', t(el.dataset.i18nTitle));
  });
  document.getElementById('lang-toggle').textContent = t('langToggle');
  const imperial = getPref('units') === 'imperial';
  document.querySelectorAll('#units-toggle [data-u]').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.u === 'imperial') === imperial)));
}

function toolCard(x) {
  return `
    <a class="card tool" href="#/${x.id}">
      <span class="tool-icon">${icon(x.icon, 22)}</span>
      <span class="tool-body">
        <span class="tool-title">${esc(t(titleKey(x.id)))}</span>
        <span class="tool-desc">${esc(t(descKey(x.id)))}</span>
      </span>
      <span class="tool-go">${icon('right', 18)}</span>
    </a>`;
}

function savedCard(x) {
  return `
    <a class="card tool" href="${esc(savedHref(x))}">
      <span class="tool-icon">${icon(toolById(x.tool).icon, 22)}</span>
      <span class="tool-body">
        <span class="tool-title">${esc(x.name)}</span>
        <span class="tool-desc">${esc([x.project, t(titleKey(x.tool)), x.value].filter(Boolean).join(' · '))}</span>
      </span>
      <span class="tool-go">${icon('right', 18)}</span>
    </a>`;
}

function mountHome(root) {
  const starred = favs().map(toolById);
  const recent = (getPref('recent') || []).filter((id) => !starred.some((x) => x.id === id)).map(toolById).filter(Boolean);
  const saved = listSaved();
  root.innerHTML = `
    <section class="home-hero">
      <h1>${esc(t('homeTitle'))}</h1>
      <p class="lead">${esc(t('homeLead'))}</p>
      <button type="button" class="search-big" data-open-palette>
        ${icon('search', 20)}<span>${esc(t('searchPlaceholder'))}</span><kbd>Ctrl K</kbd>
      </button>
    </section>
    <a class="card learn-banner" href="#/learn">
      <span class="tool-icon">${icon('book', 22)}</span>
      <span class="tool-body">
        <span class="tool-title">${esc(t('learn_homeTitle'))}</span>
        <span class="tool-desc">${esc(t('learn_homeText'))}</span>
      </span>
      <span class="btn">${esc(t('learn_homeCta'))}</span>
    </a>
    ${starred.length ? `<section class="home-section"><h2>${icon('star', 18)} ${esc(t('favs'))}</h2><div class="tools">${starred.map(toolCard).join('')}</div></section>` : ''}
    ${saved.length ? `<section class="home-section"><h2>${icon('bookmark', 18)} ${esc(t('saved_title'))} <a class="more" href="#/saved">${esc(t('saved_all'))}</a></h2><div class="tools">${saved.slice(0, 3).map(savedCard).join('')}</div></section>` : ''}
    ${recent.length ? `<section class="home-section"><h2>${esc(t('homeRecent'))}</h2><div class="tools">${recent.map(toolCard).join('')}</div></section>` : ''}
    ${CATEGORIES.map((c) => `
      <section class="home-section">
        <h2>${icon(c.icon, 18)} ${esc(t(c.title))}</h2>
        <div class="tools">${TOOLS.filter((x) => x.cat === c.id).map(toolCard).join('')}</div>
      </section>`).join('')}`;
}

let routeToken = 0;

async function route(keepScroll = false) {
  const { id, params } = parseHash();
  const tool = toolById(id);
  const isLearn = id === 'learn' || id.startsWith('learn/');
  let activeId = '';
  if (tool) activeId = id;
  else if (isLearn) activeId = id === 'learn/glossary' ? id : 'learn';
  else if (id === 'saved' || id === 'report') activeId = 'saved'; // a report belongs to the saved calculations
  const token = ++routeToken;
  closeDrawer();
  renderChrome(activeId);

  if (id === 'saved') {
    document.title = `${t('saved_title')} · ${t('appName')}`;
    mountSaved(main);
  } else if (id === 'report') {
    // #/report?p=<project>: the design report of one project. It fills its
    // sections on its own and stops by itself when another page replaces it.
    document.title = reportDocTitle(reportProject(params));
    mountReport(main, params);
  } else if (isLearn) {
    const lessonId = id.slice('learn/'.length);
    document.title = `${t(lessonId ? `lesson_${lessonId}` : 'learn_title')} · ${t('appName')}`;
    if (lessonId) await mountLesson(main, lessonId);
    else mountLearnIndex(main);
    if (token !== routeToken) return;
  } else if (!tool) {
    document.title = `${t('appName')} — ${t('tagline')}`;
    if (id) main.innerHTML = `<p class="msg-empty">${esc(t('notFound'))}</p>`;
    else mountHome(main);
  } else {
    document.title = `${t(titleKey(id))} · ${t('appName')}`;
    let page = pageCache.get(id);
    if (!page) {
      main.setAttribute('aria-busy', 'true');
      try {
        const mod = await tool.load();
        page = mod.default;
        if (page.strings) registerStrings(page.strings);
        pageCache.set(id, page);
      } catch (err) {
        console.error(err);
        main.innerHTML = `<p class="msg-empty">${esc(t('loadError'))}</p>`;
        main.removeAttribute('aria-busy');
        return;
      }
      if (token !== routeToken) return; // navigated away meanwhile
      main.removeAttribute('aria-busy');
    }
    page.related = lessonsForTool(id).map((l) => ({ id: l.id, title: t(`lesson_${l.id}`) }));
    if (page.mount) page.mount(main, params);
    else mountCalculator(main, page, params);
    decorateTool(main, id);
    pushRecent(id);
  }
  if (!keepScroll) {
    window.scrollTo(0, 0);
    if (tool || isLearn) main.focus({ preventScroll: true });
    // Arriving from a search hit: go to the section and highlight the text.
    if (isLearn) reveal(main.querySelector('.lesson'), params.get('s'), params.get('q'));
  }
}

// ---- Drawer (mobile sidebar) ----
const menuBtn = document.getElementById('menu-toggle');
function closeDrawer() {
  document.body.classList.remove('drawer-open');
  menuBtn.setAttribute('aria-expanded', 'false');
}
menuBtn.addEventListener('click', () => {
  const open = !document.body.classList.contains('drawer-open');
  document.body.classList.toggle('drawer-open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  if (open) sidebar.querySelector('a')?.focus();
});
document.getElementById('scrim').addEventListener('click', closeDrawer);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

// ---- Theme ----
const THEME_KEY = 'umay.theme';
function applyTheme(theme) {
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
}
try { applyTheme(localStorage.getItem(THEME_KEY)); } catch { /* ignore */ }
document.getElementById('theme-toggle').addEventListener('click', () => {
  const current = document.documentElement.dataset.theme
    ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  try { localStorage.setItem(THEME_KEY, next); } catch { /* ignore */ }
});

// ---- Language & units ----
document.getElementById('lang-toggle').addEventListener('click', () => setLang(getLang() === 'tr' ? 'en' : 'tr'));
onLangChange(() => route(true));
document.documentElement.lang = getLang();

document.getElementById('units-toggle').addEventListener('click', (e) => {
  const b = e.target.closest('[data-u]');
  if (b) setPref('units', b.dataset.u);
});
onPrefChange((k) => {
  if (k === 'units') route(true);
  else if (k === 'favs' || k === 'saved') renderNav(navActive);
});

// Remember whether the reader keeps the calculation steps open: the result is
// redrawn on every keystroke, so the state cannot live in the element.
// (Not in a design report: there the steps are always drawn open.)
document.addEventListener('toggle', (e) => {
  if (e.target.matches?.('details.steps') && !e.target.closest('.report')
    && (getPref('stepsOpen') !== false) !== e.target.open) setPref('stepsOpen', e.target.open);
}, true);

// ---- Search ----
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-open-palette]')) openPalette();
});
initPaletteShortcuts();
installZoom();
initOffline();

// ---- Repository link (derived from the GitHub Pages host) ----
(function repoLink() {
  const a = document.getElementById('repo-link');
  const m = location.hostname.match(/^([^.]+)\.github\.io$/i);
  if (m) {
    const repo = location.pathname.split('/').filter(Boolean)[0];
    a.href = repo ? `https://github.com/${m[1]}/${repo}` : `https://github.com/${m[1]}`;
  }
})();

// Every hashchange is real navigation: calculators update the query with
// history.replaceState, which does not fire hashchange.
window.addEventListener('hashchange', () => route());
route();
