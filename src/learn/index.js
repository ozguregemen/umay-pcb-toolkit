// Learning path: lesson catalogue, index page, lesson page, progress.

import { t, getLang, registerStrings } from '../i18n.js';
import { esc } from '../ui/format.js';
import { icon } from '../ui/icons.js';
import { getPref, setPref } from '../prefs.js';
import { toolById } from '../registry.js';
import { render } from './markdown.js';
import { figureStrings } from './figures.js';
import { addZoomButtons } from '../ui/zoom.js';

/**
 * Lessons in recommended order. Body text lives in lessons/<id>.js
 * (default export { body: { tr, en } }); titles/summaries are core strings
 * so navigation and search work without loading the lesson.
 */
export const LESSONS = [
  { id: 'pcb-basics', part: 'basics', minutes: 12, tools: ['ipcref'] },
  { id: 'stackup', part: 'basics', minutes: 10, tools: ['impedance'] },
  { id: 'trace-current', part: 'basics', minutes: 12, tools: ['trace', 'fusing'] },
  { id: 'spacing', part: 'basics', minutes: 8, tools: ['spacing'] },
  { id: 'vias', part: 'basics', minutes: 10, tools: ['via', 'padstack', 'fanout'] },
  { id: 'circuit-basics', part: 'basics', minutes: 12, tools: ['ohm', 'divider', 'led', 'rc', 'eseries', 'colorcode', 'combine', 'timer555'] },
  { id: 'impedance', part: 'advanced', minutes: 12, tools: ['signal', 'impedance', 'reflection'] },
  { id: 'signal-integrity', part: 'advanced', minutes: 12, tools: ['signal', 'crosstalk', 'reflection'] },
  { id: 'rf-antennas', part: 'advanced', minutes: 12, tools: ['antenna', 'inductor', 'impedance', 'reflection'] },
  { id: 'pdn', part: 'advanced', minutes: 12, tools: ['pdn', 'dcdc'] },
  { id: 'thermal', part: 'advanced', minutes: 10, tools: ['thermal', 'via', 'trace'] },
  { id: 'power-layout', part: 'advanced', minutes: 12, tools: ['dcdc', 'mosfet', 'snubber', 'pdn', 'thermal'] },
  { id: 'grounding-emc', part: 'advanced', minutes: 12, tools: ['emc', 'signal', 'crosstalk', 'stackup'] },
  { id: 'esd-protection', part: 'advanced', minutes: 10, tools: ['spacing', 'trace', 'fusing', 'inrush'] },
  { id: 'schematic-review', part: 'advanced', minutes: 12, tools: ['divider', 'i2c', 'switch', 'led', 'crystal'] },
  { id: 'bring-up', part: 'advanced', minutes: 12, tools: ['shunt', 'battery', 'inrush', 'ohm'] },
  { id: 'dfm', part: 'advanced', minutes: 10, tools: ['ipcref', 'padstack', 'spacing'] },
  { id: 'glossary', part: 'reference', minutes: 5, tools: [] },
];

const load = (id) => import(`./lessons/${id}.js`);

export const lessonById = (id) => LESSONS.find((l) => l.id === id);
export const lessonsForTool = (toolId) => LESSONS.filter((l) => l.tools.includes(toolId));
export const lessonTitleKey = (id) => `lesson_${id}`;
export const lessonDescKey = (id) => `lesson_${id}_desc`;

const PARTS = [
  { id: 'basics', title: 'learn_partBasics', desc: 'learn_partBasicsDesc' },
  { id: 'advanced', title: 'learn_partAdvanced', desc: 'learn_partAdvancedDesc' },
  { id: 'reference', title: 'learn_partReference', desc: 'learn_partReferenceDesc' },
];

registerStrings(figureStrings);

const done = () => new Set(getPref('learned') || []);
function setDone(id, on) {
  const s = done();
  if (on) s.add(id); else s.delete(id);
  setPref('learned', [...s]);
}

function toolChips(ids) {
  return ids.map(toolById).filter(Boolean)
    .map((x) => `<a class="chip tool-chip" href="#/${x.id}">${icon(x.icon, 14)}${esc(t(`tool_${x.id}`))}</a>`).join('');
}

export function mountLearnIndex(root) {
  const d = done();
  const countable = LESSONS.filter((l) => l.part !== 'reference');
  const n = countable.filter((l) => d.has(l.id)).length;
  const next = countable.find((l) => !d.has(l.id));
  let num = 0;
  root.innerHTML = `
    <header class="page-head">
      <div class="page-title">
        <h1>${esc(t('learn_title'))}</h1>
        <p class="lead">${esc(t('learn_lead'))}</p>
      </div>
    </header>
    <section class="card learn-progress">
      <div class="lp-row">
        <div>
          <div class="hero-label">${esc(t('learn_progress'))}</div>
          <div class="lp-count"><b>${n}</b> / ${countable.length}</div>
        </div>
        ${next ? `<a class="btn" href="#/learn/${next.id}">${esc(t(n ? 'learn_continue' : 'learn_start'))}: ${esc(t(lessonTitleKey(next.id)))}</a>` : `<span class="badge">${esc(t('learn_allDone'))}</span>`}
      </div>
      <div class="lp-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${countable.length}" aria-valuenow="${n}"><span style="width:${(n / countable.length) * 100}%"></span></div>
    </section>
    ${PARTS.map((p) => `
      <section class="home-section">
        <h2>${esc(t(p.title))}</h2>
        <p class="note">${esc(t(p.desc))}</p>
        <ol class="lessons">
          ${LESSONS.filter((l) => l.part === p.id).map((l) => {
            if (p.id !== 'reference') num++;
            const isDone = d.has(l.id);
            return `<li>
              <a class="card lesson-card${isDone ? ' done' : ''}" href="#/learn/${l.id}">
                <span class="lesson-num">${isDone ? icon('check', 18) : p.id === 'reference' ? icon('book', 18) : num}</span>
                <span class="tool-body">
                  <span class="tool-title">${esc(t(lessonTitleKey(l.id)))}</span>
                  <span class="tool-desc">${esc(t(lessonDescKey(l.id)))}</span>
                  <span class="lesson-meta">${esc(t('learn_minutes', { n: l.minutes }))}${l.tools.length ? ` · ${l.tools.map((x) => esc(t(`tool_${x}`))).join(', ')}` : ''}</span>
                </span>
                <span class="tool-go">${icon('right', 18)}</span>
              </a>
            </li>`;
          }).join('')}
        </ol>
      </section>`).join('')}`;
}

export async function mountLesson(root, id) {
  const meta = lessonById(id);
  if (!meta) {
    root.innerHTML = `<p class="msg-empty">${esc(t('notFound'))}</p>`;
    return;
  }
  let mod;
  try {
    mod = await load(id);
  } catch (err) {
    console.error(err);
    root.innerHTML = `<p class="msg-empty">${esc(t('loadError'))}</p>`;
    return;
  }
  const lesson = mod.default;
  const md = lesson.body[getLang()] ?? lesson.body.en;
  // Lesson figures receive the language: { name: (lang) => '<figure>…' }.
  const figs = lesson.figures
    ? Object.fromEntries(Object.entries(lesson.figures).map(([k, fn]) => [k, () => fn(getLang())]))
    : null;
  const { html, toc } = render(md, t('learn_quiz'), figs);
  const idx = LESSONS.indexOf(meta);
  const prev = LESSONS[idx - 1];
  const nextL = LESSONS[idx + 1];
  const isDone = done().has(id);

  root.innerHTML = `
    <nav class="crumbs" aria-label="breadcrumb"><a href="#/learn">${esc(t('learn_title'))}</a> ${icon('right', 14)} <span>${esc(t(PARTS.find((p) => p.id === meta.part).title))}</span></nav>
    <header class="page-head lesson-head">
      <div class="page-title">
        <h1>${esc(t(lessonTitleKey(id)))}</h1>
        <p class="lead">${esc(t(lessonDescKey(id)))}</p>
        <p class="lesson-meta">${icon('book', 14)} ${esc(t('learn_minutes', { n: meta.minutes }))}</p>
      </div>
    </header>
    <div class="lesson-layout">
      <article class="card lesson">${html}
        ${meta.tools.length ? `<div class="lesson-tools"><h2>${esc(t('learn_tryTools'))}</h2><div class="presets">${toolChips(meta.tools)}</div></div>` : ''}
        <div class="lesson-done">
          <button type="button" class="btn${isDone ? ' ok' : ''}" data-done aria-pressed="${isDone}">${icon('check', 16)}<span>${esc(t(isDone ? 'learn_marked' : 'learn_mark'))}</span></button>
        </div>
      </article>
      ${toc.length > 1 ? `<aside class="toc"><h2>${esc(t('learn_toc'))}</h2><ol>${toc.map((x) => `<li><a href="#/learn/${id}" data-anchor="${x.id}">${esc(x.text)}</a></li>`).join('')}</ol></aside>` : ''}
    </div>
    <nav class="lesson-nav">
      ${prev ? `<a class="card" href="#/learn/${prev.id}"><small>${esc(t('learn_prev'))}</small><b>${esc(t(lessonTitleKey(prev.id)))}</b></a>` : '<span></span>'}
      ${nextL ? `<a class="card next" href="#/learn/${nextL.id}"><small>${esc(t('learn_next'))}</small><b>${esc(t(lessonTitleKey(nextL.id)))}</b></a>` : ''}
    </nav>`;

  addZoomButtons(root.querySelector('.lesson'));
  root.querySelector('[data-done]').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    const on = btn.getAttribute('aria-pressed') !== 'true';
    setDone(id, on);
    btn.setAttribute('aria-pressed', String(on));
    btn.classList.toggle('ok', on);
    btn.querySelector('span').textContent = t(on ? 'learn_marked' : 'learn_mark');
  });
  // In-page anchors without touching the hash router.
  root.querySelectorAll('[data-anchor]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById(a.dataset.anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
}

