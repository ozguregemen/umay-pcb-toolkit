// Generic calculator page: declarative fields → form, per-field validation,
// inputs kept in the URL (shareable), live results, summary/print actions.

import { t } from '../i18n.js';
import { esc, unitLabel, fmt } from './format.js';
import { isImperial } from '../prefs.js';
import { icon } from './icons.js';
import { addZoomButtons } from './zoom.js';

/*
 Field definitions
   number: { key, type:'number', label, default, units?, unit?, pref?:'length',
             valid?: 'positive'|'nonneg'|'any' (default 'positive'), min?, max?, integer?,
             optional?, si?: true (accept 4k7 / 100n …), presets?: [{ label, value, unit? }],
             hint?, info?, show?(v) }
   choice: { key, type:'choice', label, options:[{ value, label, raw? }], default, info?, show?(v) }
   select: { key, type:'select', label, options:[...], default, info?, show?(v) }
   text:   { key, type:'text', label, default, hint?, info?, show?(v) }  (raw string, max 40 chars)
 `label` may be a function of the current values (returns an i18n key).
 Sections: { title, fields, show?(v), optional?, collapsible?, note? }
*/

const SI = { p: 1e-12, n: 1e-9, u: 1e-6, 'µ': 1e-6, 'μ': 1e-6, m: 1e-3, k: 1e3, K: 1e3, M: 1e6, G: 1e9 };

/** Parse a user number. Accepts comma decimals; with `si`, also 4k7 / 100n / 2.2u. */
export function parseNumber(text, si = false) {
  let s = String(text ?? '').trim().replace(/\s+/g, '');
  if (s === '') return NaN;
  if (si) {
    // EE notation: 4k7 → 4.7k, 2R2 → 2.2
    const ee = s.match(/^([+-]?\d+)([pnuµμmkKMGR])(\d+)$/);
    if (ee) s = `${ee[1]}.${ee[3]}${ee[2] === 'R' ? '' : ee[2]}`;
    const m = s.match(/^([+-]?[\d.,]+(?:[eE][+-]?\d+)?)([pnuµμmkKMG]?)$/);
    if (!m) return NaN;
    const n = Number(m[1].replace(',', '.'));
    return m[2] ? n * SI[m[2]] : n;
  }
  return Number(s.replace(',', '.'));
}

const labelOf = (f, v) => t(typeof f.label === 'function' ? f.label(v) : f.label);
const optLabel = (o) => (o.raw ? o.label : t(o.label));
const fieldsOf = (page) => page.sections.flatMap((s) => s.fields);

function defaultUnit(f) {
  if (f.pref === 'length' && f.units) {
    const want = isImperial() ? 'mil' : 'mm';
    if (f.units.includes(want)) return want;
  }
  return f.unit ?? f.units?.[0];
}

function initialState(page, params) {
  const raw = {};
  const units = {};
  for (const f of fieldsOf(page)) {
    const p = params.get(f.key);
    if (f.type === 'number') {
      raw[f.key] = p ?? (f.default === undefined || f.default === null ? '' : String(f.default));
      const u = params.get(`${f.key}_u`);
      units[f.key] = f.units?.includes(u) ? u : defaultUnit(f);
    } else if (f.type === 'text') {
      raw[f.key] = (p ?? String(f.default ?? '')).slice(0, 40);
    } else {
      const valid = f.options.some((o) => String(o.value) === p);
      raw[f.key] = valid ? p : String(f.default);
    }
  }
  return { raw, units, open: {} };
}

function values(page, state) {
  const v = {};
  for (const f of fieldsOf(page)) {
    v[f.key] = f.type === 'number' ? parseNumber(state.raw[f.key], f.si) : state.raw[f.key];
  }
  return v;
}

/** Validation message key (+vars) for one number field, or null. */
function fieldError(f, text, n) {
  if (String(text).trim() === '') return f.optional ? null : ['fe_required'];
  if (!Number.isFinite(n)) return ['fe_number'];
  const rule = f.valid ?? 'positive';
  if (rule === 'positive' && !(n > 0)) return ['fe_positive'];
  if (rule === 'nonneg' && n < 0) return ['fe_nonneg'];
  if (f.min !== undefined && n < f.min) return ['fe_min', { min: fmt(f.min) }];
  if (f.max !== undefined && n > f.max) return ['fe_max', { max: fmt(f.max) }];
  if (f.integer && !Number.isInteger(n)) return ['fe_integer'];
  return null;
}

const isVisible = (x, v) => !(x.show && !x.show(v));

function infoButton(id, f) {
  if (!f.info) return '';
  return `<button type="button" class="info-btn" aria-expanded="false" aria-controls="${id}-info" title="${esc(t('moreInfo'))}">${icon('info', 15)}<span class="sr">${esc(t('moreInfo'))}</span></button>`;
}
function infoPanel(id, f) {
  return f.info ? `<p class="info-text" id="${id}-info" hidden>${esc(t(f.info))}</p>` : '';
}

function renderField(f, state, v) {
  const id = `f-${f.key}`;
  const hintKey = f.hint ?? (f.si ? 'siHint' : null);
  const hint = hintKey ? `<small class="hint" id="${id}-hint">${esc(t(hintKey))}</small>` : '';
  const err = `<small class="field-error" id="${id}-err" hidden></small>`;
  const described = [hintKey && `${id}-hint`, `${id}-err`].filter(Boolean).join(' ');
  const hidden = isVisible(f, v) ? '' : ' hidden';

  if (f.type === 'number') {
    let unitCtl = '';
    if (f.units?.length > 1) {
      unitCtl = `<select class="unit" data-unit="${f.key}" aria-label="${esc(labelOf(f, v))}">${f.units
        .map((u) => `<option value="${u}"${u === state.units[f.key] ? ' selected' : ''}>${esc(unitLabel(u))}</option>`)
        .join('')}</select>`;
    } else if (f.units?.length === 1) {
      unitCtl = `<span class="unit unit-static">${esc(unitLabel(f.units[0]))}</span>`;
    }
    const presets = f.presets?.length
      ? `<div class="presets" role="group" aria-label="${esc(labelOf(f, v))}">${f.presets
          .map((p) => `<button type="button" class="chip" data-preset="${f.key}" data-value="${esc(p.value)}"${p.unit ? ` data-unit-value="${p.unit}"` : ''}>${esc(p.raw === false ? t(p.label) : p.label)}</button>`)
          .join('')}</div>`
      : '';
    return `
      <div class="field" data-field="${f.key}"${hidden}>
        <div class="label-row"><label for="${id}">${esc(labelOf(f, v))}${f.optional ? ` <span class="opt">${esc(t('optional'))}</span>` : ''}</label>${infoButton(id, f)}</div>
        ${infoPanel(id, f)}
        <div class="input-group">
          <input id="${id}" data-key="${f.key}" type="text" inputmode="${f.si ? 'text' : 'decimal'}" autocomplete="off"
                 spellcheck="false" value="${esc(state.raw[f.key])}" aria-describedby="${described}">
          ${unitCtl}
        </div>
        ${presets}${hint}${err}
      </div>`;
  }
  if (f.type === 'text') {
    return `
      <div class="field" data-field="${f.key}"${hidden}>
        <div class="label-row"><label for="${id}">${esc(labelOf(f, v))}</label>${infoButton(id, f)}</div>
        ${infoPanel(id, f)}
        <div class="input-group">
          <input id="${id}" data-key="${f.key}" type="text" autocomplete="off" spellcheck="false" maxlength="40"
                 value="${esc(state.raw[f.key])}"${hintKey ? ` aria-describedby="${id}-hint"` : ''}>
        </div>
        ${hint}
      </div>`;
  }
  if (f.type === 'choice') {
    return `
      <div class="field" data-field="${f.key}"${hidden}>
        <div class="label-row"><span class="label" id="${id}">${esc(labelOf(f, v))}</span>${infoButton(id, f)}</div>
        ${infoPanel(id, f)}
        <div class="segmented" role="radiogroup" aria-labelledby="${id}">
          ${f.options
            .map((o) => {
              const on = String(o.value) === state.raw[f.key];
              return `<button type="button" role="radio" aria-checked="${on}" tabindex="${on ? 0 : -1}" data-choice="${f.key}" data-value="${esc(o.value)}">${esc(optLabel(o))}</button>`;
            })
            .join('')}
        </div>
        ${hint}
      </div>`;
  }
  return `
    <div class="field" data-field="${f.key}"${hidden}>
      <div class="label-row"><label for="${id}">${esc(labelOf(f, v))}</label>${infoButton(id, f)}</div>
      ${infoPanel(id, f)}
      <select id="${id}" data-key="${f.key}"${hintKey ? ` aria-describedby="${id}-hint"` : ''}>
        ${f.options
          .map((o) => `<option value="${esc(o.value)}"${String(o.value) === state.raw[f.key] ? ' selected' : ''}>${esc(optLabel(o))}</option>`)
          .join('')}
      </select>
      ${hint}
    </div>`;
}

function isDefaultField(f, state) {
  const val = state.raw[f.key];
  if (f.type !== 'number') return val === String(f.default);
  const def = f.default === undefined || f.default === null ? '' : String(f.default);
  return val === def && state.units[f.key] === defaultUnit(f);
}

function renderForm(page, state) {
  const v = values(page, state);
  return page.sections
    .map((s, i) => {
      const hidden = isVisible(s, v) ? '' : ' hidden';
      const legend = `${esc(t(s.title))}${s.optional ? ` <span class="opt">${esc(t('optional'))}</span>` : ''}`;
      const body = s.fields.map((f) => renderField(f, state, v)).join('')
        + (s.note ? `<p class="note">${esc(t(s.note))}</p>` : '');
      if (s.collapsible) {
        const open = state.open[i] ?? s.fields.some((f) => !isDefaultField(f, state));
        return `<details class="section collapsible" data-section="${i}"${open ? ' open' : ''}${hidden}>
          <summary>${legend}</summary><div class="section-body">${body}</div></details>`;
      }
      return `<fieldset class="section" data-section="${i}"${hidden}><legend>${legend}</legend>${body}</fieldset>`;
    })
    .join('');
}

/** Arrow-key step: one unit of the second significant digit (25 → 1, 0.3 → 0.01). */
function smartStep(n) {
  if (!Number.isFinite(n) || n === 0) return 1;
  return 10 ** Math.floor(Math.log10(Math.abs(n))) / 10;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* ignore */ }
    ta.remove();
    return ok;
  }
}

function flash(btn, labelKey) {
  const label = btn.querySelector('.btn-label');
  if (!label) return;
  label.textContent = t('copied');
  btn.classList.add('ok');
  setTimeout(() => { label.textContent = t(labelKey); btn.classList.remove('ok'); }, 1400);
}

/** Text summary of visible inputs and results (for pasting into design notes). */
function summaryText(page, root) {
  const lines = [`${t('appName')} — ${t(`tool_${page.id}`)}`, location.href, '', `${t('summaryInputs')}:`];
  root.querySelectorAll('.form .field:not([hidden])').forEach((fe) => {
    if (fe.closest('[hidden]')) return;
    const label = fe.querySelector('label, .label')?.textContent.replace(t('optional'), '').trim();
    const input = fe.querySelector('input[data-key]');
    let value;
    if (input) {
      if (!input.value.trim()) return;
      const unit = fe.querySelector('select.unit')?.selectedOptions[0]?.textContent ?? fe.querySelector('.unit-static')?.textContent ?? '';
      value = `${input.value.trim()} ${unit}`.trim();
    } else if (fe.querySelector('[aria-checked="true"]')) {
      value = fe.querySelector('[aria-checked="true"]').textContent.trim();
    } else {
      value = fe.querySelector('select')?.selectedOptions[0]?.textContent.trim();
    }
    lines.push(`  ${label}: ${value}`);
  });
  lines.push('', `${t('summaryResults')}:`);
  const result = root.querySelector('.result');
  result.querySelectorAll('.hero').forEach((h) => {
    const label = h.querySelector('.hero-label')?.textContent.trim();
    const value = h.querySelector('.hero-value')?.textContent.replace(/\s+/g, ' ').trim();
    const sub = h.querySelector('.hero-sub')?.textContent.trim();
    lines.push(`  ${label}: ${value}${sub ? ` (${sub})` : ''}`);
  });
  result.querySelectorAll('.kv tr').forEach((tr) => {
    lines.push(`  ${tr.querySelector('th').textContent.trim()}: ${tr.querySelector('td').textContent.replace(/\s+/g, ' ').trim()}`);
  });
  const warns = [...result.querySelectorAll('.msg li')].map((li) => `  ! ${li.textContent.trim()}`);
  if (warns.length) lines.push('', `${t('warnings')}:`, ...warns);
  return lines.join('\n');
}

function actionButton(action, iconName, labelKey, titleKey) {
  return `<button type="button" class="btn ghost" data-action="${action}" title="${esc(t(titleKey))}">${icon(iconName, 16)}<span class="btn-label">${esc(t(labelKey))}</span></button>`;
}

/**
 * Mount a calculator page into `root`.
 * page: { id, sections, compute(v, units), render(result, v, units),
 *         diagram?(v, units, result) — result is undefined while inputs are invalid, intro? }
 */
export function mountCalculator(root, page, params) {
  let state = initialState(page, params);

  root.innerHTML = `
    <header class="page-head">
      <div class="page-title">
        <h1>${esc(t(`tool_${page.id}`))}</h1>
        <p class="lead">${esc(t(page.intro ?? `tool_${page.id}_desc`))}</p>
        ${page.related?.length ? `<p class="related">${icon('book', 15)}<span>${esc(t('learn_related'))}</span> ${page.related
          .map((l) => `<a href="#/learn/${l.id}">${esc(l.title)}</a>`).join(' · ')}</p>` : ''}
      </div>
      <div class="page-actions" role="toolbar" aria-label="${esc(t('results'))}">
        ${actionButton('copy-link', 'link', 'copyLink', 'copyLinkTitle')}
        ${actionButton('copy-summary', 'copy', 'copySummary', 'copySummaryTitle')}
        ${actionButton('print', 'print', 'print', 'printTitle')}
        ${actionButton('reset', 'reset', 'reset', 'resetTitle')}
      </div>
    </header>
    <div class="print-meta"></div>
    <div class="calc">
      <form class="card form" novalidate autocomplete="off" aria-label="${esc(t('inputs'))}"></form>
      <section class="card result" id="result" aria-live="polite" aria-label="${esc(t('results'))}"></section>
    </div>
    <a class="peek" href="#result" hidden><span class="peek-label"></span><span class="peek-value"></span>${icon('down', 16)}</a>`;

  const form = root.querySelector('form');
  const result = root.querySelector('.result');
  const peek = root.querySelector('.peek');

  const drawForm = () => { form.innerHTML = renderForm(page, state); };

  const syncUrl = () => {
    const q = new URLSearchParams();
    for (const f of fieldsOf(page)) {
      if (isDefaultField(f, state)) continue;
      q.set(f.key, state.raw[f.key]);
      if (f.type === 'number' && f.units?.length > 1) q.set(`${f.key}_u`, state.units[f.key]);
    }
    const qs = q.toString();
    const hash = `#/${page.id}${qs ? `?${qs}` : ''}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
  };

  const update = () => {
    const v = values(page, state);
    let invalid = 0;
    page.sections.forEach((s, i) => {
      const sVisible = isVisible(s, v);
      const sEl = form.querySelector(`[data-section="${i}"]`);
      if (sEl) sEl.hidden = !sVisible;
      for (const f of s.fields) {
        const fe = form.querySelector(`[data-field="${f.key}"]`);
        if (!fe) continue;
        const visible = sVisible && isVisible(f, v);
        fe.hidden = !visible;
        if (typeof f.label === 'function') {
          const lab = fe.querySelector('label, .label');
          if (lab) lab.firstChild.textContent = labelOf(f, v);
        }
        if (f.type !== 'number') continue;
        const input = fe.querySelector('input');
        const errEl = fe.querySelector('.field-error');
        const e = visible ? fieldError(f, state.raw[f.key], v[f.key]) : null;
        input.toggleAttribute('aria-invalid', !!e);
        errEl.hidden = !e;
        errEl.textContent = e ? t(e[0], e[1]) : '';
        if (e) invalid++;
        // Optional & empty → NaN so compute can skip it.
      }
    });

    // Diagrams receive the result too (undefined while inputs are invalid) so
    // they can draw live values; a failing diagram never breaks the page.
    const res = invalid ? undefined : page.compute(v, state.units);
    let diagram = '';
    if (page.diagram) {
      try {
        const svg = page.diagram(v, state.units, res?.ok === false ? undefined : res);
        if (svg) diagram = `<div class="diagram-wrap">${svg}</div>`;
      } catch (err) {
        console.error(err);
      }
    }
    // The answer comes first: the diagram goes after the headline values and
    // their warnings, before the detail tables.
    result.innerHTML = invalid
      ? `<p class="msg-empty">${icon('alert', 18)} ${esc(t('inputsInvalid'))}</p>`
      : page.render(res, v, state.units);
    if (diagram) {
      let anchor = null;
      for (const el of result.children) {
        if (el.matches('.heroes, .hero, .msg, .msg-empty')) anchor = el; else break;
      }
      if (anchor) anchor.insertAdjacentHTML('afterend', diagram);
      else result.insertAdjacentHTML('afterbegin', diagram);
      addZoomButtons(result.querySelector('.diagram-wrap'));
    }
    const hero = result.querySelector('.hero');
    peek.querySelector('.peek-label').textContent = hero?.querySelector('.hero-label')?.textContent ?? '';
    peek.querySelector('.peek-value').textContent = hero?.querySelector('.hero-value')?.textContent.replace(/\s+/g, ' ').trim() ?? '—';
    syncUrl();
  };

  // An option may carry `set: { key: value }` — example values that make sense
  // for it (e.g. switching buck → boost). Values are in the field's first unit.
  const applySet = (key, value) => {
    const f = fieldsOf(page).find((x) => x.key === key);
    const o = f?.options?.find((x) => String(x.value) === value);
    if (!o?.set) return false;
    for (const [k, val] of Object.entries(o.set)) {
      const ff = fieldsOf(page).find((x) => x.key === k);
      if (!ff) continue;
      state.raw[k] = String(val);
      if (ff.type === 'number' && ff.units) state.units[k] = ff.unit ?? ff.units[0];
    }
    return true;
  };

  form.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.key) state.raw[el.dataset.key] = el.value;
    if (el.dataset.unit) state.units[el.dataset.unit] = el.value;
    if (el.tagName === 'SELECT' && el.dataset.key && applySet(el.dataset.key, el.value)) {
      drawForm();
      form.querySelector(`[data-key="${el.dataset.key}"]`)?.focus();
    }
    update();
  });

  form.addEventListener('click', (e) => {
    const choice = e.target.closest('[data-choice]');
    if (choice) {
      state.raw[choice.dataset.choice] = choice.dataset.value;
      if (applySet(choice.dataset.choice, choice.dataset.value)) {
        drawForm();
        form.querySelector(`[data-choice="${choice.dataset.choice}"][data-value="${choice.dataset.value}"]`)?.focus();
      } else {
        choice.parentElement.querySelectorAll('[data-choice]').forEach((b) => {
          const on = b === choice;
          b.setAttribute('aria-checked', String(on));
          b.tabIndex = on ? 0 : -1;
        });
      }
      update();
      return;
    }
    const preset = e.target.closest('[data-preset]');
    if (preset) {
      const key = preset.dataset.preset;
      state.raw[key] = preset.dataset.value;
      if (preset.dataset.unitValue) state.units[key] = preset.dataset.unitValue;
      const fe = form.querySelector(`[data-field="${key}"]`);
      fe.querySelector('input').value = state.raw[key];
      const sel = fe.querySelector('select.unit');
      if (sel) sel.value = state.units[key];
      update();
      return;
    }
    const info = e.target.closest('.info-btn');
    if (info) {
      const panel = document.getElementById(info.getAttribute('aria-controls'));
      const open = info.getAttribute('aria-expanded') !== 'true';
      info.setAttribute('aria-expanded', String(open));
      panel.hidden = !open;
    }
  });

  form.addEventListener('toggle', (e) => {
    const d = e.target.closest?.('details[data-section]');
    if (d) state.open[d.dataset.section] = d.open;
  }, true);

  form.addEventListener('keydown', (e) => {
    const choice = e.target.closest('[data-choice]');
    if (choice && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      const next = ['ArrowRight', 'ArrowDown'].includes(e.key) ? choice.nextElementSibling : choice.previousElementSibling;
      if (next) { next.focus(); next.click(); }
      e.preventDefault();
      return;
    }
    const input = e.target.closest('input[data-key]');
    if (input && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      const f = fieldsOf(page).find((x) => x.key === input.dataset.key);
      const n = parseNumber(input.value, f.si);
      if (!Number.isFinite(n)) return;
      const step = (f.step ?? smartStep(n)) * (e.shiftKey ? 10 : 1);
      let next = n + (e.key === 'ArrowUp' ? step : -step);
      next = Number(next.toPrecision(10));
      if ((f.valid ?? 'positive') === 'positive' && next <= 0) return;
      if (f.valid === 'nonneg' && next < 0) next = 0;
      // Keep the decimal separator the user typed.
      input.value = input.value.includes(',') ? String(next).replace('.', ',') : String(next);
      state.raw[f.key] = input.value;
      update();
      e.preventDefault();
    }
  });
  form.addEventListener('submit', (e) => e.preventDefault());

  result.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    if (await copyText(btn.dataset.copy)) {
      btn.classList.add('ok');
      setTimeout(() => btn.classList.remove('ok'), 1200);
    }
  });

  root.querySelector('.page-actions').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    switch (btn.dataset.action) {
      case 'reset':
        state = initialState(page, new URLSearchParams());
        drawForm();
        update();
        break;
      case 'copy-link':
        if (await copyText(location.href)) flash(btn, 'copyLink');
        break;
      case 'copy-summary':
        if (await copyText(summaryText(page, root))) flash(btn, 'copySummary');
        break;
      case 'print': {
        const meta = root.querySelector('.print-meta');
        meta.textContent = `${t('printedAt')}: ${new Date().toLocaleString()} · ${location.href}`;
        window.print();
        break;
      }
      default:
    }
  });

  // Mobile: show a result bar while the result card is off-screen.
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(([entry]) => {
      peek.hidden = entry.isIntersecting || window.innerWidth > 900;
    }, { threshold: 0.05 });
    io.observe(result);
  }

  drawForm();
  update();
}

// ---------------------------------------------------------------------------
// Result building helpers (return HTML strings).
// ---------------------------------------------------------------------------

export function messages(kind, keys, vars) {
  if (!keys?.length) return '';
  const cls = kind === 'error' ? 'msg error' : kind === 'ok' ? 'msg ok' : 'msg warn';
  const prefix = kind === 'error' ? 'err' : kind === 'ok' ? 'ok' : 'warn';
  return `<ul class="${cls}">${keys
    .map((k) => `<li>${icon(kind === 'ok' ? 'check' : 'alert', 16)}<span>${esc(t(`${prefix}_${k}`, vars?.[k]))}</span></li>`)
    .join('')}</ul>`;
}

/**
 * Big headline value. `value` is HTML (number + <span class="u">unit</span>),
 * `copy` is the plain text copied by the copy button.
 */
export function hero(label, value, secondary = '', copy = '') {
  const plain = copy || value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return `
    <div class="hero">
      <div class="hero-label">${esc(t(label))}</div>
      <div class="hero-row">
        <div class="hero-value">${value}</div>
        <button type="button" class="copy-btn" data-copy="${esc(plain)}" title="${esc(t('copyValue'))}" aria-label="${esc(t('copyValue'))}">${icon('copy', 16)}</button>
      </div>
      ${secondary ? `<div class="hero-sub">${secondary}</div>` : ''}
    </div>`;
}

/** Several headline values side by side: items = [[label, valueHtml, sub?], …] */
export function heroes(items) {
  return `<div class="heroes">${items.filter(Boolean).map(([l, v, s]) => hero(l, v, s)).join('')}</div>`;
}

/** Key/value table. items = [[labelKey, valueHtml, strong?, rawLabel?], …] */
export function rows(items) {
  const body = items
    .filter(Boolean)
    .map(([label, value, strong, raw]) => `<tr${strong ? ' class="strong"' : ''}><th scope="row">${raw ? esc(label) : esc(t(label))}</th><td>${value}</td></tr>`)
    .join('');
  return `<table class="kv"><tbody>${body}</tbody></table>`;
}

export function block(title, inner, raw = false) {
  return `<div class="block"><h2>${raw ? esc(title) : esc(t(title))}</h2>${inner}</div>`;
}

/** Formula block; `noteKey` adds an explanatory paragraph, `refs` a source list. */
export function formulaBlock(lines, noteKey, refs) {
  const note = noteKey ? `<p class="note">${esc(t(noteKey))}</p>` : '';
  const src = refs?.length ? `<p class="refs">${refs.map(esc).join(' · ')}</p>` : '';
  return `<details class="block formula-block"><summary>${esc(t('formula'))} · ${esc(t('methodology'))}</summary>
    <pre class="formula">${lines.map(esc).join('\n')}</pre>${note}${src}</details>`;
}

export function invalid(errors) {
  return `<p class="msg-empty">${icon('alert', 18)} ${esc(t('inputsInvalid'))}</p>${messages('error', errors)}`;
}

/** Pass/fail badge row used by rule checks. */
export function checks(items) {
  return `<ul class="checks">${items.filter(Boolean).map(([ok, labelHtml, detail]) => `
    <li class="${ok === null ? 'na' : ok ? 'pass' : 'fail'}">${icon(ok === null ? 'dash' : ok ? 'check' : 'x', 16)}
      <span><b>${labelHtml}</b>${detail ? `<small>${detail}</small>` : ''}</span></li>`).join('')}</ul>`;
}
