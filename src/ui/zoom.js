// Enlarge a diagram or lesson figure in a modal. On phones the copy is drawn
// wider than the screen and scrolls, so labels become readable.

import { t } from '../i18n.js';
import { esc } from './format.js';
import { icon } from './icons.js';

let dialog;

function ensureDialog() {
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.className = 'zoom-dialog';
  dialog.innerHTML = `<div class="zoom-head"><h2 class="zoom-title"></h2>
    <button type="button" class="icon-btn zoom-close">${icon('x', 18)}</button></div>
    <div class="zoom-body"></div>`;
  // A click on the backdrop lands on the <dialog> itself.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog || e.target.closest('.zoom-close')) dialog.close();
  });
  document.body.append(dialog);
  return dialog;
}

/** Open a copy of an <svg class="diagram"> in the zoom dialog. */
export function openZoom(svgEl) {
  const d = ensureDialog();
  d.querySelector('.zoom-title').textContent = svgEl.getAttribute('aria-label') || t('zoomIn');
  const close = d.querySelector('.zoom-close');
  close.setAttribute('aria-label', t('close'));
  close.title = t('close');
  const copy = svgEl.cloneNode(true);
  // Phones: 1.4 px per viewBox unit (12-unit labels → ≈ 17 px), scroll if wider.
  if (matchMedia('(max-width: 700px)').matches) {
    const vbW = Number(svgEl.getAttribute('viewBox')?.split(/\s+/)[2]) || 420;
    copy.style.width = `${Math.round(Math.max(innerWidth - 28, vbW * 1.4))}px`;
  }
  d.querySelector('.zoom-body').replaceChildren(copy);
  d.showModal();
  close.focus();
}

/** Wrap every diagram in `container` with an enlarge button (idempotent). */
export function addZoomButtons(container) {
  if (!container) return;
  for (const svgEl of container.querySelectorAll('svg.diagram')) {
    if (svgEl.parentElement.classList.contains('zoomable')) continue;
    const box = document.createElement('div');
    box.className = 'zoomable';
    svgEl.replaceWith(box);
    box.append(svgEl);
    box.insertAdjacentHTML('beforeend',
      `<button type="button" class="zoom-btn" aria-label="${esc(t('zoomIn'))}: ${esc(svgEl.getAttribute('aria-label') || '')}" title="${esc(t('zoomIn'))}">${icon('expand', 16)}</button>`);
  }
}

/** One delegated listener: the button or a click on the drawing opens it. */
export function installZoom(root = document) {
  root.addEventListener('click', (e) => {
    const box = e.target.closest('.zoomable');
    if (!box || box.closest('.zoom-dialog')) return;
    const svgEl = box.querySelector('svg.diagram');
    if (svgEl) openZoom(svgEl);
  });
}
