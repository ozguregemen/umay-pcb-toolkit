// Per-viewer preferences kept in localStorage (all access guarded).

const KEY = 'umay.prefs';
const DEFAULTS = { units: 'metric', recent: [], fab: 'none', navOpen: {}, favs: [], saved: [] };
const listeners = new Set();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { ...DEFAULTS, ...raw };
  } catch {
    return { ...DEFAULTS };
  }
}

let prefs = load();

export const getPref = (k) => prefs[k];

export function setPref(k, v) {
  prefs = { ...prefs, [k]: v };
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
  listeners.forEach((fn) => fn(k, v));
}

export const onPrefChange = (fn) => listeners.add(fn);

export function pushRecent(id) {
  const list = [id, ...prefs.recent.filter((x) => x !== id)].slice(0, 6);
  setPref('recent', list);
}

export const isImperial = () => prefs.units === 'imperial';
