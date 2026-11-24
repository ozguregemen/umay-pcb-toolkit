// App shell: hash router, navigation, language and theme switching.

import { t, getLang, setLang, onLangChange } from './i18n.js';
import { mountCalculator } from './ui/calculator.js';
import { mountHome } from './pages/home.js';
import { tracePage } from './pages/trace.js';
import { impedancePage } from './pages/impedance.js';
import { spacingPage } from './pages/spacing.js';
import { viaPage } from './pages/via.js';

const PAGES = { trace: tracePage, impedance: impedancePage, spacing: spacingPage, via: viaPage };
const NAV = [
  ['', 'navHome'],
  ['trace', 'navTrace'],
  ['impedance', 'navImpedance'],
  ['spacing', 'navSpacing'],
  ['via', 'navVia'],
];

const main = document.getElementById('main');
const nav = document.getElementById('nav');

function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = h.split('?');
  return { id: path, params: new URLSearchParams(query) };
}

function renderChrome(activeId) {
  nav.innerHTML = NAV.map(([id, key]) =>
    `<a href="#/${id}"${id === activeId ? ' aria-current="page"' : ''}>${t(key)}</a>`).join('');
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  const langBtn = document.getElementById('lang-toggle');
  langBtn.textContent = t('langToggle');
  langBtn.title = t('langToggleTitle');
  document.getElementById('theme-toggle').title = t('themeToggleTitle');
}

// Calculators keep their inputs in the hash via history.replaceState, which
// does not fire `hashchange`; so every hashchange is real navigation.
function route(keepScroll = false) {
  const { id, params } = parseHash();
  const page = PAGES[id];
  const activeId = page ? id : '';

  renderChrome(activeId);
  document.title = page ? `${t(page.title)} · ${t('appName')}` : `${t('appName')} — ${t('tagline')}`;
  if (page) mountCalculator(main, page, params);
  else mountHome(main);
  if (!keepScroll) window.scrollTo(0, 0);
  if (!keepScroll && page) main.focus({ preventScroll: true });
}

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

// ---- Language ----
document.getElementById('lang-toggle').addEventListener('click', () => {
  setLang(getLang() === 'tr' ? 'en' : 'tr');
});
onLangChange(() => route(true));
document.documentElement.lang = getLang();

// ---- Repository link (derived from the GitHub Pages host when available) ----
(function repoLink() {
  const a = document.getElementById('repo-link');
  const m = location.hostname.match(/^([^.]+)\.github\.io$/i);
  if (m) {
    const repo = location.pathname.split('/').filter(Boolean)[0];
    a.href = repo ? `https://github.com/${m[1]}/${repo}` : `https://github.com/${m[1]}`;
  } else if (!a.getAttribute('href')) {
    a.hidden = true;
  }
})();

window.addEventListener('hashchange', () => route());
route();
