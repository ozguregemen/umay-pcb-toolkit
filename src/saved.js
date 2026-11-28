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
      // A time a Date can hold: formatting any other number throws.
      at: Number.isFinite(x.at) && Math.abs(x.at) <= 8.64e15 ? x.at : Date.now(),
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

// ---- Project details (header of the design report) ----
// One record per project name, '' for the calculations saved without a
// project: { project, title, board, rev, author, notes }. A list, not an
// object keyed by the name, so a project may be called anything.

const MAX_PROJECTS = 200;
/** Longest text kept per field (the report form uses the same limits). */
export const DETAIL_LIMITS = { title: 120, board: 60, rev: 30, author: 80, notes: 2000 };
const DETAIL_KEYS = Object.keys(DETAIL_LIMITS);
const text = (s) => (typeof s === 'string' || typeof s === 'number' ? String(s) : '');
// Free text keeps its line breaks (at most one empty line in a row).
const cleanNotes = (s, n) => text(s)
  .replace(/\r\n?/g, '\n')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  .replace(/[^\S\n]+/g, ' ')
  .replace(/ ?\n ?/g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim()
  .slice(0, n)
  .trim();

/** A project name as it is stored with a saved calculation (also for a name read from the address). */
export const projectKey = (s) => clean(text(s), 60);

/**
 * Keep only well-formed project details (stored data and imported files
 * alike): one record per project, texts trimmed to a length, records with
 * nothing in them dropped.
 */
export function sanitizeProjects(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  const seen = new Set();
  for (const x of list) {
    if (!x || typeof x !== 'object' || Array.isArray(x)) continue;
    const project = projectKey(x.project);
    if (seen.has(project)) continue;
    const item = { project };
    for (const k of DETAIL_KEYS) item[k] = k === 'notes' ? cleanNotes(x[k], DETAIL_LIMITS[k]) : clean(text(x[k]), DETAIL_LIMITS[k]);
    if (!DETAIL_KEYS.some((k) => item[k])) continue;
    seen.add(project);
    out.push(item);
    if (out.length >= MAX_PROJECTS) break;
  }
  return out;
}

export const listProjectDetails = () => sanitizeProjects(getPref('projects'));

/** Details of one project ('' = calculations without a project); empty texts when nothing is stored. */
export function projectDetails(name) {
  const project = projectKey(name);
  return listProjectDetails().find((x) => x.project === project)
    ?? { project, ...Object.fromEntries(DETAIL_KEYS.map((k) => [k, ''])) };
}

/** Store the details of a project (forget them when every field is empty). Returns what is now stored. */
export function setProjectDetails(name, patch) {
  const project = projectKey(name);
  const rest = listProjectDetails().filter((x) => x.project !== project);
  const [item] = sanitizeProjects([{ ...projectDetails(project), ...(patch && typeof patch === 'object' ? patch : {}), project }]);
  setPref('projects', item ? [item, ...rest].slice(0, MAX_PROJECTS) : rest);
  return projectDetails(project);
}

/**
 * The file holds favourites, saved calculations and the details of the
 * projects those calculations belong to (`projects`, absent in older files).
 */
export function exportData() {
  const saved = listSaved();
  const used = new Set(saved.map((x) => x.project));
  const details = listProjectDetails().filter((x) => used.has(x.project));
  return JSON.stringify({ app: 'umay-pcb-toolkit', version: 1, favs: favs(), saved, projects: details }, null, 2);
}

/**
 * Merge an exported file. Entries already present (same id) are replaced;
 * project details are merged field by field (a field the file leaves empty
 * keeps what is stored here).
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
  const details = Array.isArray(data?.projects) ? sanitizeProjects(data.projects) : [];
  if (details.length) {
    const stored = listProjectDetails();
    const names = new Set(details.map((x) => x.project));
    const merged = details.map((x) => {
      const old = stored.find((c) => c.project === x.project) ?? {};
      return { ...old, ...Object.fromEntries(DETAIL_KEYS.filter((k) => x[k]).map((k) => [k, x[k]])), project: x.project };
    });
    setPref('projects', sanitizeProjects([...merged, ...stored.filter((c) => !names.has(c.project))]));
  }
  return fresh;
}
