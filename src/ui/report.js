// Design report: every saved calculation of one project on one printable
// page — what was asked, what came out and how it was calculated.
// The model (which calculations, in which order, the header data) and the
// HTML builders are pure; mountReport() fills the sections one after another.

import { t, locale, registerStrings } from '../i18n.js';
import { esc } from './format.js';
import { icon } from './icons.js';
import { toolById, titleKey } from '../registry.js';
import { listSaved, sanitizeSaved, savedHref, projectKey, projectDetails, setProjectDetails, DETAIL_LIMITS } from '../saved.js';
import { renderStatic, placeDiagram } from './calculator.js';

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

/** Address of the report of a project ('' = the calculations saved without one). */
export const reportHref = (project) => `#/report${project ? `?p=${encodeURIComponent(project)}` : ''}`;

/**
 * The project named in the address. URLSearchParams decodes it and never
 * throws on a broken escape; the name is then tidied like a stored one, so it
 * can only ever be compared with the saved calculations and shown as text.
 */
export const reportProject = (params) => projectKey(typeof params?.get === 'function' ? params.get('p') ?? '' : '');

/**
 * Saved calculations grouped by project, as on the saved page: projects by
 * name, the group without a project last, and inside a group the order of
 * the saved list. Entries of tools that no longer exist are left out.
 */
export function reportGroups(saved = listSaved(), loc = locale()) {
  const groups = new Map();
  for (const x of sanitizeSaved(saved)) {
    if (!groups.has(x.project)) groups.set(x.project, []);
    groups.get(x.project).push(x);
  }
  return [...groups.keys()]
    .sort((a, b) => (a === '') - (b === '') || a.localeCompare(b, loc))
    .map((project) => ({ project, items: groups.get(project) }));
}

/**
 * Everything the report of one project shows, as data:
 *   { project, title, details, date, items: [{ n, anchor, id, tool, name, query, at, href }] }
 * `title` is the report title the reader gave, else the project name ('' for
 * the group without a project: the page then uses a generic heading).
 */
export function reportModel(project, { saved = listSaved(), details, now = new Date() } = {}) {
  const name = projectKey(project);
  const d = details ?? projectDetails(name);
  const items = sanitizeSaved(saved).filter((x) => x.project === name).map((x, i) => ({
    n: i + 1,
    anchor: `calc-${x.id}`, // ids are [\w-]{1,40} (sanitizeSaved)
    id: x.id,
    tool: x.tool,
    name: x.name,
    query: x.query,
    at: x.at,
    href: savedHref(x),
  }));
  return { project: name, title: d.title || name, details: d, date: now, items };
}

const headingOf = (model) => model.title || t('report_noProjectTitle');

/** Document title (the browser suggests it as the PDF file name): the report's own heading first. */
export function reportDocTitle(project) {
  const name = projectKey(project);
  return `${projectDetails(name).title || name || t('report_noProjectTitle')} — ${t('report_title')} · ${t('appName')}`;
}

// ---------------------------------------------------------------------------
// HTML (strings; every piece of user text goes through esc)
// ---------------------------------------------------------------------------

function dateText(value, style) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale(), { dateStyle: style }).format(d);
}

/** Header facts: project, board, revision, author, date, number of calculations, notes. */
export function reportFactsHtml(model) {
  const d = model.details;
  const row = (label, value, cls) => (value
    ? `<div${cls ? ` class="${cls}"` : ''}><dt>${esc(t(label))}</dt><dd>${esc(value)}</dd></div>` : '');
  return `<dl class="report-facts">${
    // Without a title of its own the project name is already the page heading.
    row('report_project', d.title ? model.project : '')}${
    row('report_board', d.board)}${
    row('report_rev', d.rev)}${
    row('report_author', d.author)}${
    row('report_date', dateText(model.date, 'long'))}${
    row('report_count', String(model.items.length))}${
    row('report_notes', d.notes, 'wide')}</dl>`;
}

function fieldHtml(key, labelKey, value, placeholder = '') {
  return `<div class="field">
      <div class="label-row"><label for="rp-${key}">${esc(t(labelKey))}</label></div>
      <div class="input-group"><input id="rp-${key}" name="${key}" type="text" maxlength="${DETAIL_LIMITS[key]}" autocomplete="off" value="${esc(value)}"${
        placeholder ? ` placeholder="${esc(placeholder)}"` : ''}></div>
    </div>`;
}

/** The editable project details (kept with the saved calculations, see saved.js). */
export function reportFormHtml(model) {
  const d = model.details;
  const filled = Object.keys(DETAIL_LIMITS).some((k) => d[k]);
  return `<details class="card report-edit"${filled ? '' : ' open'}>
    <summary>${icon('pencil', 15)}<span>${esc(t('report_details'))}</span></summary>
    <form class="report-form" autocomplete="off" novalidate>
      <p class="note">${esc(t('report_detailsHint'))}</p>
      <div class="report-fields">
        ${fieldHtml('title', 'report_fTitle', d.title, model.project || t('report_noProjectTitle'))}
        ${fieldHtml('board', 'report_board', d.board)}
        ${fieldHtml('rev', 'report_rev', d.rev)}
        ${fieldHtml('author', 'report_author', d.author)}
        <div class="field wide">
          <div class="label-row"><label for="rp-notes">${esc(t('report_notes'))}</label></div>
          <textarea id="rp-notes" name="notes" rows="4" maxlength="${DETAIL_LIMITS.notes}">${esc(d.notes)}</textarea>
        </div>
      </div>
    </form>
  </details>`;
}

const toolName = (id) => t(titleKey(id));
// The default name of a saved calculation is the tool's own: said once then.
const toolSuffix = (item) => (item.name === toolName(item.tool) ? '' : ` <small>${esc(toolName(item.tool))}</small>`);

/**
 * Table of contents. The links stay on the report's own address (so they are
 * real links) and carry the section in data-anchor: the page scrolls there
 * itself, the hash router never sees them.
 */
export function reportTocHtml(model) {
  const href = esc(reportHref(model.project));
  return `<nav class="card report-toc" aria-labelledby="report-toc-h">
    <h2 id="report-toc-h">${esc(t('report_toc'))}</h2>
    <ol>${model.items.map((x) => `<li><a href="${href}" data-anchor="${esc(x.anchor)}">${esc(x.name)}${toolSuffix(x)}</a></li>`).join('')}</ol>
  </nav>`;
}

/** One calculation: its heading and link; the body is filled in when its page module has loaded. */
export function reportSectionHtml(item) {
  const a = esc(item.anchor);
  const saved = dateText(item.at, 'medium');
  // (Section ids start with "calc-", heading ids with "h-": no saved id can make two of them equal.)
  return `<section class="card report-calc" id="${a}" aria-labelledby="h-${a}">
    <header class="report-calc-head">
      <h2 id="h-${a}" tabindex="-1"><span class="report-num">${item.n}.</span> ${esc(item.name)}${toolSuffix(item)}</h2>
      <p class="report-calc-meta">${icon(toolById(item.tool)?.icon, 15)}${
        saved ? `<span>${esc(t('report_savedAt', { date: saved }))}</span>` : ''}
        <a class="report-open" href="${esc(item.href)}">${esc(t('report_open'))}</a></p>
    </header>
    <div class="report-body" aria-busy="true"><p class="msg-empty">${esc(t('report_loading'))}</p></div>
  </section>`;
}

/** The whole page before the calculations are filled in. */
export function reportPageHtml(model) {
  const head = (actions) => `<header class="page-head">
      <div class="page-title">
        <p class="report-kicker">${esc(t('report_title'))}</p>
        <h1>${esc(headingOf(model))}</h1>
      </div>
      <div class="page-actions" role="toolbar" aria-label="${esc(t('report_title'))}">${actions}</div>
    </header>`;
  const back = `<a class="btn ghost" href="#/saved">${icon('bookmark', 16)}<span>${esc(t('report_back'))}</span></a>`;
  if (!model.items.length) {
    // A stale link, or the last calculation of the project was deleted.
    return `${head('')}
      <p class="msg-empty">${icon('bookmark', 18)} ${esc(t(model.project ? 'report_empty' : 'report_emptyNone'))}</p>
      <p>${back}</p>`;
  }
  return `${head(`${back}
      <button type="button" class="btn" data-print disabled title="${esc(t('report_printTitle'))}">${icon('print', 16)}<span>${esc(t('print'))}</span></button>`)}
    <section class="card report-meta" aria-label="${esc(t('report_details'))}">${reportFactsHtml(model)}</section>
    ${reportFormHtml(model)}
    ${reportTocHtml(model)}
    ${model.items.map(reportSectionHtml).join('')}`;
}

/**
 * Inside a report section the headings are: h2 the calculation, h3 "Inputs"
 * and "Result"; the block titles of a result (h2 on the calculator page) go
 * one level below that.
 */
export const demoteHeadings = (html) => String(html ?? '').replace(/<(\/?)h3\b/g, '<$1h5').replace(/<(\/?)h2\b/g, '<$1h4');

/** Body of a section from a static rendering; `lines` are inputs given as plain text lines. */
export function reportBodyHtml(out, lines = []) {
  const inputs = out.inputsHtml
    || (lines.length ? `<ul class="report-lines">${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : '');
  return `${inputs ? `<div class="report-inputs"><h3>${esc(t('report_inputs'))}</h3>${inputs}</div>` : ''}
    <div class="report-result"><h3>${esc(t('report_result'))}</h3><div class="report-out">${demoteHeadings(out.resultHtml)}</div></div>`;
}

const noteHtml = (key, item) => `<p class="msg-empty">${icon('info', 18)}<span>${esc(t(key))} <a href="${esc(item.href)}">${esc(t('report_open'))}</a></span></p>`;

// ---------------------------------------------------------------------------
// Pages that build their own layout (page.mount)
// ---------------------------------------------------------------------------

// 'state': the module exports the parser of its own query format (fromParams)
//   and its compute / render / diagram take that state, so the result is
//   rendered like any other, without mounting (mounting would write the
//   address of the tool over the report's).
// 'mount': mounting only draws — the address is written on a click, not on
//   mount — so the page is mounted into a detached box and its result part is
//   moved into the report.
// Any other self-mounting page gets a line with the link to the tool.
const OWN_PAGES = { powertree: 'state', dcdrop: 'state', stackup: 'state', ipcref: 'mount' };

/**
 * The inputs of a page with its own form, in its own words: the "Inputs" part
 * of the text summary it exports for "copy summary" (powertree, dcdrop).
 */
function summaryLines(mod, state) {
  if (typeof mod.summary !== 'function') return [];
  let text;
  try { text = String(mod.summary(state, null, '')); } catch { return []; }
  const lines = text.split('\n');
  const from = lines.indexOf(`${t('summaryInputs')}:`);
  if (from < 0) return [];
  const out = [];
  for (const line of lines.slice(from + 1)) {
    if (!line.trim()) break;
    out.push(line.trim());
  }
  return out;
}

/**
 * What a section shows, for a loaded page module:
 *   { html, diagramHtml } – ready to insert (placeDiagram adds the drawing)
 *   { mount: true }       – to be mounted into a detached box (browser only)
 */
export function reportItemParts(mod, item) {
  const page = mod?.default;
  if (!page) return { html: noteHtml('report_toolError', item), diagramHtml: '' };
  const params = new URLSearchParams(item.query);
  if (!page.mount) {
    const out = renderStatic(page, params);
    return { html: reportBodyHtml(out), diagramHtml: out.diagramHtml };
  }
  const how = Object.hasOwn(OWN_PAGES, page.id) ? OWN_PAGES[page.id] : '';
  if (how === 'state' && typeof mod.fromParams === 'function') {
    try {
      const state = mod.fromParams(params);
      const out = renderStatic(page, params, { values: state });
      return { html: reportBodyHtml(out, summaryLines(mod, state)), diagramHtml: out.diagramHtml };
    } catch (err) {
      console.error(err);
    }
  } else if (how === 'mount') {
    return { mount: true };
  }
  return { html: noteHtml('report_ownPage', item), diagramHtml: '' };
}

// What a result in a report has no use for, and what could run or load
// something. (SVG element names are case-sensitive in a selector.)
const DENY = 'script, iframe, frame, frameset, object, embed, applet, link, meta, base, style, template, form, input, select, option, '
  + 'textarea, button:not(.zoom-btn), img, image, picture, video, audio, source, track, use, animate, set, animateMotion, '
  + 'animateTransform, foreignObject';
const URL_ATTRS = new Set(['href', 'xlink:href', 'src', 'srcset', 'srcdoc', 'action', 'formaction', 'data', 'poster', 'background', 'ping']);
const SAFE_URL = /^(#\/|https?:\/\/|mailto:)/i;

/**
 * Second line of defence. Every page escapes the text it writes into its
 * result, and the report relies on that; still, a result is HTML that some
 * fifty page modules build from values which may come from a file someone
 * else made. So a section is parsed inside a <template> — inert: nothing
 * loads and nothing runs there — and before it goes into the document
 * whatever could run or load something is taken out: active elements, event
 * handler attributes, and links that are neither in-app nor http(s).
 */
function defuse(root) {
  root.querySelectorAll(DENY).forEach((el) => el.remove());
  for (const el of root.querySelectorAll('*')) {
    for (const { name, value } of [...el.attributes]) {
      const n = name.toLowerCase();
      if (n.startsWith('on') || (URL_ATTRS.has(n) && !SAFE_URL.test(value.trim()))) el.removeAttribute(name);
    }
  }
}

/** Mount a draw-only page out of the document and take its result part (see OWN_PAGES). */
function mountDetached(page, params) {
  const before = location.hash;
  const box = document.createElement('div');
  try { page.mount(box, params); } catch (err) { console.error(err); return null; }
  // Not expected for the pages listed as 'mount': the page wrote its own
  // address after all. Put the report's back and show the link line instead.
  if (location.hash !== before) { history.replaceState(null, '', before); return null; }
  const part = box.querySelector('.ref, .result');
  if (!part) return null;
  defuse(part);
  part.querySelectorAll('a.btn').forEach((el) => el.remove());
  part.removeAttribute('id');
  part.classList.remove('card', 'result');
  part.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
  part.querySelectorAll('details').forEach((el) => { el.open = true; });
  part.querySelectorAll('h2, h3').forEach((h) => {
    const lower = document.createElement(h.tagName === 'H2' ? 'h4' : 'h5');
    lower.append(...h.childNodes);
    h.replaceWith(lower);
  });
  return part;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

let run = 0;
const pause = () => new Promise((resolve) => { setTimeout(resolve, 0); });

/** Page module of a tool with its strings registered (the import itself is cached by the browser). */
async function loadTool(id) {
  const mod = await toolById(id).load();
  if (mod.default?.strings) registerStrings(mod.default.strings);
  return mod;
}

function fillSection(el, mod, item) {
  try {
    const parts = reportItemParts(mod, item);
    if (parts.mount) {
      const part = mountDetached(mod.default, new URLSearchParams(item.query));
      if (part) {
        el.innerHTML = reportBodyHtml({ inputsHtml: '', resultHtml: '' });
        el.querySelector('.report-out').append(part);
      } else {
        el.innerHTML = noteHtml('report_ownPage', item);
      }
    } else {
      // Built out of the document (see defuse), then moved in as nodes.
      const tpl = document.createElement('template');
      tpl.innerHTML = parts.html;
      const out = tpl.content.querySelector('.report-out');
      if (out) placeDiagram(out, parts.diagramHtml);
      defuse(tpl.content);
      el.replaceChildren(tpl.content);
    }
  } catch (err) {
    console.error(err);
    el.innerHTML = noteHtml('report_ownPage', item);
  }
  el.removeAttribute('aria-busy');
}

/** `#/report?p=<project>`; without `p` the calculations saved without a project. */
export function mountReport(root, params) {
  const mine = ++run;
  const project = reportProject(params);
  const model = reportModel(project);

  // Own container: its listeners go away with it on the next navigation.
  const box = document.createElement('div');
  box.className = 'report';
  box.dataset.project = project;
  // The same report drawn again (language or unit switch): it keeps its
  // height while the sections are filled in, so the reader stays in place.
  const old = root.firstElementChild;
  if (old?.classList.contains('report') && old.dataset.project === project) box.style.minHeight = `${old.offsetHeight}px`;
  box.innerHTML = reportPageHtml(model);
  root.replaceChildren(box);

  box.addEventListener('click', (e) => {
    if (e.target.closest('[data-print]')) {
      window.print();
      return;
    }
    // In-page anchors without touching the hash router.
    const a = e.target.closest('[data-anchor]');
    if (!a) return;
    e.preventDefault();
    const target = document.getElementById(a.dataset.anchor);
    if (!target || !box.contains(target)) return;
    const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
    target.querySelector('h2')?.focus({ preventScroll: true });
  });

  const form = box.querySelector('.report-form');
  if (form) {
    form.addEventListener('submit', (e) => e.preventDefault());
    // Saved as the reader types; the header (which is what prints) follows.
    form.addEventListener('input', () => {
      model.details = setProjectDetails(project, Object.fromEntries(new FormData(form)));
      model.title = model.details.title || model.project;
      box.querySelector('.report-meta').innerHTML = reportFactsHtml(model);
      box.querySelector('h1').textContent = headingOf(model);
      document.title = reportDocTitle(project);
    });
  }

  // One calculation after the other. Whenever some 30 ms of work have piled
  // up the browser gets a turn, so a long report appears progressively and
  // the page stays responsive; it stops when another page (or the same report
  // in another language) has taken its place.
  const alive = () => mine === run && box.isConnected;
  const bodies = [...box.querySelectorAll('.report-body')];
  (async () => {
    let since = performance.now();
    for (const [i, item] of model.items.entries()) {
      let mod = null;
      try { mod = await loadTool(item.tool); } catch (err) { console.error(err); }
      if (!alive()) return;
      fillSection(bodies[i], mod, item);
      if (performance.now() - since > 30) {
        await pause();
        if (!alive()) return;
        since = performance.now();
      }
    }
    box.style.minHeight = '';
    box.querySelector('[data-print]')?.removeAttribute('disabled');
  })();
}
