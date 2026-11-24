// Generic calculator page: builds a form from a declarative field list, keeps
// the inputs in the URL (shareable links) and re-renders results live.

import { t } from '../i18n.js';
import { esc, unitLabel } from './format.js';

/**
 * Field definitions
 *   { key, type: 'number', label, default, units?, unit?, hint?, step?, show?(v) }
 *   { key, type: 'choice', label, options: [{ value, label, raw? }], default, show?(v) }
 *   { key, type: 'select', label, options: [{ value, label, raw? }], default, show?(v) }
 * `label` may be a function of the current values.
 */

export function parseNumber(text) {
  const s = String(text ?? '').trim().replace(/\s+/g, '').replace(',', '.');
  if (s === '') return NaN;
  return Number(s);
}

const labelOf = (f, v) => t(typeof f.label === 'function' ? f.label(v) : f.label);
const optLabel = (o) => (o.raw ? o.label : t(o.label));

function fieldsOf(page) {
  return page.sections.flatMap((s) => s.fields);
}

/** Read state from URL params, falling back to defaults. */
function initialState(page, params) {
  const raw = {};
  const units = {};
  for (const f of fieldsOf(page)) {
    const p = params.get(f.key);
    if (f.type === 'number') {
      raw[f.key] = p ?? String(f.default ?? '');
      const u = params.get(`${f.key}_u`);
      units[f.key] = f.units?.includes(u) ? u : f.unit ?? f.units?.[0];
    } else {
      const valid = f.options.some((o) => String(o.value) === p);
      raw[f.key] = valid ? p : String(f.default);
    }
  }
  return { raw, units };
}

function values(page, state) {
  const v = {};
  for (const f of fieldsOf(page)) {
    v[f.key] = f.type === 'number' ? parseNumber(state.raw[f.key]) : state.raw[f.key];
  }
  return v;
}

function renderField(f, state, v) {
  const id = `f-${f.key}`;
  const hint = f.hint ? `<small class="hint" id="${id}-hint">${esc(t(f.hint))}</small>` : '';
  const describedBy = f.hint ? ` aria-describedby="${id}-hint"` : '';
  if (f.type === 'number') {
    const unitCtl =
      f.units && f.units.length > 1
        ? `<select class="unit" data-unit="${f.key}" aria-label="${esc(labelOf(f, v))} — unit">${f.units
            .map((u) => `<option value="${u}"${u === state.units[f.key] ? ' selected' : ''}>${esc(unitLabel(u))}</option>`)
            .join('')}</select>`
        : f.units?.length === 1
          ? `<span class="unit unit-static">${esc(unitLabel(f.units[0]))}</span>`
          : '';
    return `
      <div class="field" data-field="${f.key}">
        <label for="${id}">${esc(labelOf(f, v))}</label>
        <div class="input-group">
          <input id="${id}" data-key="${f.key}" type="text" inputmode="decimal" autocomplete="off"
                 spellcheck="false" value="${esc(state.raw[f.key])}"${describedBy}>
          ${unitCtl}
        </div>
        ${hint}
      </div>`;
  }
  if (f.type === 'choice') {
    return `
      <div class="field" data-field="${f.key}">
        <span class="label" id="${id}">${esc(labelOf(f, v))}</span>
        <div class="segmented" role="radiogroup" aria-labelledby="${id}">
          ${f.options
            .map((o) => {
              const on = String(o.value) === state.raw[f.key];
              return `<button type="button" role="radio" aria-checked="${on}" data-choice="${f.key}" data-value="${esc(o.value)}">${esc(optLabel(o))}</button>`;
            })
            .join('')}
        </div>
        ${hint}
      </div>`;
  }
  // select
  return `
    <div class="field" data-field="${f.key}">
      <label for="${id}">${esc(labelOf(f, v))}</label>
      <select id="${id}" data-key="${f.key}"${describedBy}>
        ${f.options
          .map((o) => `<option value="${esc(o.value)}"${String(o.value) === state.raw[f.key] ? ' selected' : ''}>${esc(optLabel(o))}</option>`)
          .join('')}
      </select>
      ${hint}
    </div>`;
}

function renderForm(page, state) {
  const v = values(page, state);
  return page.sections
    .map((s) => {
      const hidden = s.show && !s.show(v) ? ' hidden' : '';
      return `
      <fieldset class="section" data-section="${s.title}"${hidden}>
        <legend>${esc(t(s.title))}${s.optional ? ` <span class="muted">(${esc(t('optional'))})</span>` : ''}</legend>
        ${s.fields.map((f) => renderField(f, state, v)).join('')}
      </fieldset>`;
    })
    .join('');
}

/**
 * Mount a calculator page into `root`.
 * @param {HTMLElement} root
 * @param {object} page  { id, title, subtitle, sections, compute(v, units), render(result, v, units) }
 * @param {URLSearchParams} params
 */
export function mountCalculator(root, page, params) {
  let state = initialState(page, params);

  root.innerHTML = `
    <header class="page-head">
      <div>
        <h1>${esc(t(page.title))}</h1>
        <p class="lead">${esc(t(page.subtitle))}</p>
      </div>
      <div class="page-actions">
        <button type="button" class="btn ghost" data-action="reset">${esc(t('reset'))}</button>
        <button type="button" class="btn" data-action="copy">${esc(t('copyLink'))}</button>
      </div>
    </header>
    <div class="calc">
      <form class="card form" novalidate autocomplete="off"></form>
      <section class="card result" aria-live="polite" aria-label="${esc(t('results'))}"></section>
    </div>`;

  const form = root.querySelector('form');
  const result = root.querySelector('.result');

  const drawForm = () => { form.innerHTML = renderForm(page, state); };

  const syncUrl = () => {
    const q = new URLSearchParams();
    for (const f of fieldsOf(page)) {
      const val = state.raw[f.key];
      const isDefault = f.type === 'number'
        ? val === String(f.default ?? '') && state.units[f.key] === (f.unit ?? f.units?.[0])
        : val === String(f.default);
      if (isDefault) continue;
      q.set(f.key, val);
      if (f.type === 'number' && f.units?.length > 1) q.set(`${f.key}_u`, state.units[f.key]);
    }
    const qs = q.toString();
    const hash = `#/${page.id}${qs ? `?${qs}` : ''}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
  };

  const update = () => {
    const v = values(page, state);
    // Conditional visibility.
    for (const s of page.sections) {
      const el = form.querySelector(`[data-section="${s.title}"]`);
      if (el) el.hidden = !!(s.show && !s.show(v));
      for (const f of s.fields) {
        const fe = form.querySelector(`[data-field="${f.key}"]`);
        if (fe) fe.hidden = !!(f.show && !f.show(v));
        if (typeof f.label === 'function' && fe) {
          const lab = fe.querySelector('label, .label');
          if (lab) lab.textContent = labelOf(f, v);
        }
      }
    }
    // Invalid-number highlighting.
    form.querySelectorAll('input[data-key]').forEach((inp) => {
      const n = parseNumber(inp.value);
      inp.toggleAttribute('aria-invalid', inp.value.trim() !== '' && !Number.isFinite(n));
    });
    const res = page.compute(v, state.units);
    result.innerHTML = page.render(res, v, state.units);
    syncUrl();
  };

  form.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.key) state.raw[el.dataset.key] = el.value;
    if (el.dataset.unit) state.units[el.dataset.unit] = el.value;
    update();
  });
  form.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-choice]');
    if (!btn) return;
    state.raw[btn.dataset.choice] = btn.dataset.value;
    btn.parentElement.querySelectorAll('[data-choice]').forEach((b) =>
      b.setAttribute('aria-checked', String(b === btn)));
    update();
  });
  // Arrow-key navigation inside segmented controls.
  form.addEventListener('keydown', (e) => {
    const btn = e.target.closest('[data-choice]');
    if (!btn || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const sib = e.key === 'ArrowRight' ? btn.nextElementSibling : btn.previousElementSibling;
    if (sib) { sib.focus(); sib.click(); e.preventDefault(); }
  });
  form.addEventListener('submit', (e) => e.preventDefault());

  root.querySelector('[data-action="reset"]').addEventListener('click', () => {
    state = initialState(page, new URLSearchParams());
    drawForm();
    update();
  });
  root.querySelector('[data-action="copy"]').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    try {
      await navigator.clipboard.writeText(location.href);
      btn.textContent = t('copied');
      setTimeout(() => { btn.textContent = t('copyLink'); }, 1500);
    } catch {
      prompt(t('copyLink'), location.href);
    }
  });

  drawForm();
  update();
}

// ---------------------------------------------------------------------------
// Result building helpers (return HTML strings).
// ---------------------------------------------------------------------------

export function messages(kind, keys) {
  if (!keys?.length) return '';
  const cls = kind === 'error' ? 'msg error' : 'msg warn';
  return `<ul class="${cls}">${keys.map((k) => `<li>${esc(t(`${kind === 'error' ? 'err' : 'warn'}_${k}`))}</li>`).join('')}</ul>`;
}

export function hero(label, value, secondary = '') {
  return `
    <div class="hero">
      <div class="hero-label">${esc(t(label))}</div>
      <div class="hero-value">${value}</div>
      ${secondary ? `<div class="hero-sub">${secondary}</div>` : ''}
    </div>`;
}

export function rows(items) {
  const body = items
    .filter(Boolean)
    .map(([label, value, strong]) => `<tr${strong ? ' class="strong"' : ''}><th scope="row">${esc(t(label))}</th><td>${value}</td></tr>`)
    .join('');
  return `<table class="kv"><tbody>${body}</tbody></table>`;
}

export function block(title, inner) {
  return `<div class="block"><h2>${esc(t(title))}</h2>${inner}</div>`;
}

export function formulaBlock(lines, noteKey) {
  return block('formula', `<pre class="formula">${lines.map(esc).join('\n')}</pre>${noteKey ? `<p class="note">${esc(t(noteKey))}</p>` : ''}`);
}

export function invalid(errors) {
  return `<p class="muted">${esc(t('inputsInvalid'))}</p>${messages('error', errors)}`;
}
