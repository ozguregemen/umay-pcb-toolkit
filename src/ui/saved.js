// Favourite star and "Save" on tool pages, and the saved-calculations page.

import { t, locale } from '../i18n.js';
import { esc } from './format.js';
import { icon } from './icons.js';
import { toolById, titleKey } from '../registry.js';
import {
  isFav, toggleFav, listSaved, addSaved, updateSaved, removeSaved, restoreSaved,
  savedHref, projects, exportData, importData,
} from '../saved.js';

let dialog;

/**
 * Name/project dialog. `entry` is either a new calculation
 * ({ tool, query, value, name }) or a stored one being edited (has `id`).
 */
export function openSaveDialog(entry, onDone) {
  dialog?.remove();
  dialog = document.createElement('dialog');
  dialog.className = 'save-dialog';
  const editing = !!entry.id;
  dialog.setAttribute('aria-label', t(editing ? 'saved_edit' : 'saved_saveTitle'));
  dialog.innerHTML = `
    <form method="dialog" class="save-form">
      <h2>${esc(t(editing ? 'saved_edit' : 'saved_saveTitle'))}</h2>
      <p class="note">${esc(t(`tool_${entry.tool}`))}${entry.value ? ` · ${esc(entry.value)}` : ''}</p>
      <div class="field">
        <div class="label-row"><label for="save-name">${esc(t('saved_name'))}</label></div>
        <div class="input-group"><input id="save-name" type="text" maxlength="80" autocomplete="off" required value="${esc(entry.name ?? '')}"></div>
      </div>
      <div class="field">
        <div class="label-row"><label for="save-project">${esc(t('saved_project'))} <span class="opt">${esc(t('optional'))}</span></label></div>
        <div class="input-group"><input id="save-project" type="text" maxlength="60" autocomplete="off" list="save-projects" value="${esc(entry.project ?? '')}"></div>
        <datalist id="save-projects">${projects().map((p) => `<option value="${esc(p)}"></option>`).join('')}</datalist>
        <small class="hint">${esc(t('saved_projectHint'))}</small>
      </div>
      <div class="save-actions">
        <button type="button" class="btn ghost" data-cancel>${esc(t('cancel'))}</button>
        <button type="submit" class="btn">${icon('bookmark', 16)}<span>${esc(t('save'))}</span></button>
      </div>
    </form>`;
  document.body.append(dialog);
  const name = dialog.querySelector('#save-name');
  dialog.querySelector('[data-cancel]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!name.value.trim()) { name.focus(); return; }
    const fields = { name: name.value, project: dialog.querySelector('#save-project').value };
    const item = editing ? (updateSaved(entry.id, fields), entry) : addSaved({ ...entry, ...fields });
    dialog.close();
    onDone?.(item);
  });
  dialog.addEventListener('close', () => dialog.remove());
  dialog.showModal();
  name.focus();
  name.select();
}

/**
 * Add the favourite star, the Save button and the list of saved calculations
 * of this tool to a mounted tool page (any page with the standard header).
 */
export function decorateTool(root, id) {
  const title = root.querySelector('.page-title');
  const h1 = title?.querySelector('h1');
  if (!h1) return;

  const row = document.createElement('div');
  row.className = 'title-row';
  h1.replaceWith(row);
  const star = document.createElement('button');
  star.type = 'button';
  star.className = 'fav-btn';
  star.innerHTML = icon('star', 20);
  const paintStar = () => {
    const on = isFav(id);
    star.setAttribute('aria-pressed', String(on));
    star.title = t(on ? 'favRemove' : 'favAdd');
    star.setAttribute('aria-label', star.title);
  };
  star.addEventListener('click', () => { toggleFav(id); paintStar(); });
  paintStar();
  row.append(h1, star);

  const list = document.createElement('p');
  list.className = 'related saved-row';
  const paintList = () => {
    const mine = listSaved().filter((x) => x.tool === id).slice(0, 6);
    list.hidden = !mine.length;
    list.innerHTML = mine.length
      ? `${icon('bookmark', 15)}<span>${esc(t('saved_forTool'))}</span> ${mine
        .map((x) => `<a class="chip" href="${esc(savedHref(x))}" title="${esc([x.project, x.value].filter(Boolean).join(' · '))}">${esc(x.name)}</a>`).join('')}
        <a href="#/saved">${esc(t('saved_all'))}</a>`
      : '';
  };
  paintList();
  title.append(list);

  const bar = root.querySelector('.page-actions');
  if (!bar) return;
  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'btn ghost';
  save.title = t('saveTitle');
  save.innerHTML = `${icon('bookmark', 16)}<span class="btn-label">${esc(t('save'))}</span>`;
  save.addEventListener('click', () => {
    const hero = root.querySelector('.result .hero, .hero');
    const label = hero?.querySelector('.hero-label')?.textContent.trim();
    const value = hero?.querySelector('.hero-value')?.textContent.replace(/\s+/g, ' ').trim();
    openSaveDialog({
      tool: id,
      query: location.hash.split('?')[1] ?? '',
      value: label && value ? `${label}: ${value}` : '',
      name: t(titleKey(id)),
    }, () => {
      paintList();
      const text = save.querySelector('.btn-label');
      text.textContent = t('saved_done');
      save.classList.add('ok');
      setTimeout(() => { text.textContent = t('save'); save.classList.remove('ok'); }, 1600);
    });
  });
  bar.prepend(save);
}

const dateFmt = () => new Intl.DateTimeFormat(locale(), { dateStyle: 'medium' });

export function mountSaved(root) {
  // Own container: its listeners go away with it on the next navigation.
  root.innerHTML = '';
  const box = document.createElement('div');
  root.append(box);
  let notice = '';
  const draw = () => {
    const items = listSaved();
    const groups = new Map();
    for (const x of items) {
      if (!groups.has(x.project)) groups.set(x.project, []);
      groups.get(x.project).push(x);
    }
    const names = [...groups.keys()].sort((a, b) => (a === '') - (b === '') || a.localeCompare(b, locale()));
    const fmtDate = dateFmt();
    box.innerHTML = `
      <header class="page-head">
        <div class="page-title">
          <h1>${esc(t('saved_title'))}</h1>
          <p class="lead">${esc(t('saved_lead'))}</p>
        </div>
        <div class="page-actions" role="toolbar" aria-label="${esc(t('saved_title'))}">
          <button type="button" class="btn ghost" data-export title="${esc(t('saved_exportTitle'))}"${items.length ? '' : ' disabled'}>${icon('download', 16)}<span>${esc(t('saved_export'))}</span></button>
          <button type="button" class="btn ghost" data-import title="${esc(t('saved_importTitle'))}">${icon('upload', 16)}<span>${esc(t('saved_import'))}</span></button>
          <input type="file" accept="application/json,.json" hidden>
        </div>
      </header>
      <div class="saved-notice" role="status" aria-live="polite">${notice}</div>
      ${items.length ? names.map((p) => `
        <section class="home-section">
          <h2>${esc(p || t('saved_noProject'))} <span class="badge">${groups.get(p).length}</span></h2>
          <ul class="saved-list">
            ${groups.get(p).map((x) => {
              const tool = toolById(x.tool);
              return `<li class="card saved-item">
                <a class="saved-main" href="${esc(savedHref(x))}">
                  <span class="tool-icon">${icon(tool.icon, 22)}</span>
                  <span class="tool-body">
                    <span class="tool-title">${esc(x.name)}</span>
                    <span class="tool-desc">${esc(t(titleKey(x.tool)))}${x.value ? ` · ${esc(x.value)}` : ''}</span>
                    <span class="lesson-meta">${esc(fmtDate.format(new Date(x.at)))}</span>
                  </span>
                </a>
                <button type="button" class="icon-btn" data-edit="${esc(x.id)}" title="${esc(t('saved_edit'))}" aria-label="${esc(t('saved_edit'))}: ${esc(x.name)}">${icon('pencil', 17)}</button>
                <button type="button" class="icon-btn" data-delete="${esc(x.id)}" title="${esc(t('saved_delete'))}" aria-label="${esc(t('saved_delete'))}: ${esc(x.name)}">${icon('trash', 17)}</button>
              </li>`;
            }).join('')}
          </ul>
        </section>`).join('') : `<p class="msg-empty">${icon('bookmark', 18)} ${esc(t('saved_empty'))}</p>`}`;
  };

  const say = (html) => { notice = html; draw(); };

  box.addEventListener('click', (e) => {
    const edit = e.target.closest('[data-edit]');
    if (edit) {
      const item = listSaved().find((x) => x.id === edit.dataset.edit);
      if (item) openSaveDialog(item, () => say(''));
      return;
    }
    const del = e.target.closest('[data-delete]');
    if (del) {
      const all = listSaved();
      const position = all.findIndex((x) => x.id === del.dataset.delete);
      if (position < 0) return;
      const item = all[position];
      removeSaved(item.id);
      say(`<p class="msg-line">${esc(t('saved_deleted', { name: item.name }))} <button type="button" class="btn ghost" data-undo>${esc(t('undo'))}</button></p>`);
      box.querySelector('[data-undo]').addEventListener('click', () => { restoreSaved(item, position); say(''); });
      return;
    }
    if (e.target.closest('[data-export]')) {
      const url = URL.createObjectURL(new Blob([exportData()], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `umay-pcb-toolkit-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }
    if (e.target.closest('[data-import]')) box.querySelector('input[type="file"]').click();
  });
  box.addEventListener('change', async (e) => {
    const file = e.target.matches?.('input[type="file"]') ? e.target.files[0] : null;
    if (!file) return;
    let n = -1;
    try { n = importData((await file.text()).slice(0, 2_000_000)); } catch { /* unreadable file */ }
    say(`<p class="msg-line${n < 0 ? ' bad' : ''}">${esc(n < 0 ? t('saved_importError') : t('saved_imported', { n: String(n) }))}</p>`);
  });

  draw();
}
