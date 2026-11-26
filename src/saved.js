// Favourite tools and saved calculations. Both live in the per-browser
// preferences (localStorage); a JSON file moves them to another device.
// A saved calculation is the tool id plus the query string the calculator
// already keeps in the URL, so opening one is just following a link.

import { getPref, setPref } from './prefs.js';
import { toolById } from './registry.js';

const MAX_SAVED = 500;
// Longest query kept: a full power tree with long names needs several thousand characters.
const MAX_QUERY = 8000;
const clean = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// ---- Favourites ----
export const favs = () => (getPref('favs') || []).filter((id) => toolById(id));
export const isFav = (id) => favs().includes(id);

export function toggleFav(id) {
  const list = favs();
  const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  setPref('favs', next);
  return next.includes(id);
}

// ---- Saved calculations ----

/**
 * Keep only well-formed entries (stored data and imported files alike): the
 * tool must exist, the query is re-encoded, texts are trimmed to a length.
 */
export function sanitizeSaved(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  const seen = new Set();
  for (const x of list) {
    if (!x || typeof x !== 'object' || typeof x.tool !== 'string' || !toolById(x.tool)) continue;
    const id = /^[\w-]{1,40}$/.test(String(x.id ?? '')) ? String(x.id) : newId();
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      tool: x.tool,
      query: new URLSearchParams(String(x.query ?? '').slice(0, MAX_QUERY)).toString(),
      name: clean(x.name, 80) || x.tool,
      project: clean(x.project, 60),
      value: clean(x.value, 120),
      at: Number.isFinite(x.at) ? x.at : Date.now(),
    });
    if (out.length >= MAX_SAVED) break;
  }
  return out;
}

export const listSaved = () => sanitizeSaved(getPref('saved'));
export const savedHref = (x) => `#/${x.tool}${x.query ? `?${x.query}` : ''}`;
export const projects = () => [...new Set(listSaved().map((x) => x.project).filter(Boolean))].sort((a, b) => a.localeCompare(b));

/** Newest first. Returns the stored entry. */
export function addSaved(entry) {
  const [item] = sanitizeSaved([{ ...entry, id: newId(), at: Date.now() }]);
  if (!item) return null;
  setPref('saved', [item, ...listSaved()].slice(0, MAX_SAVED));
  return item;
}

export function updateSaved(id, patch) {
  setPref('saved', sanitizeSaved(listSaved().map((x) => (x.id === id ? { ...x, ...patch, id } : x))));
}

export function removeSaved(id) {
  setPref('saved', listSaved().filter((x) => x.id !== id));
}

/** Put a removed entry back where it was (undo). */
export function restoreSaved(item, position = 0) {
  const list = listSaved().filter((x) => x.id !== item.id);
  list.splice(Math.min(position, list.length), 0, item);
  setPref('saved', sanitizeSaved(list));
}

export const exportData = () => JSON.stringify({ app: 'umay-pcb-toolkit', version: 1, favs: favs(), saved: listSaved() }, null, 2);

/**
 * Merge an exported file. Entries already present (same id) are replaced.
 * Returns the number of new saved calculations, or -1 if the text is not ours.
 */
export function importData(text) {
  let data;
  try { data = JSON.parse(text); } catch { return -1; }
  const incoming = Array.isArray(data) ? data : data?.saved;
  if (!Array.isArray(incoming)) return -1;
  const add = sanitizeSaved(incoming);
  if (incoming.length && !add.length) return -1;
  const current = listSaved();
  const ids = new Set(add.map((x) => x.id));
  const fresh = add.filter((x) => !current.some((c) => c.id === x.id)).length;
  setPref('saved', [...add, ...current.filter((x) => !ids.has(x.id))].sort((a, b) => b.at - a.at).slice(0, MAX_SAVED));
  if (Array.isArray(data?.favs)) {
    setPref('favs', [...new Set([...favs(), ...data.favs.filter((id) => typeof id === 'string' && toolById(id))])]);
  }
  return fresh;
}
