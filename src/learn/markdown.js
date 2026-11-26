// Minimal, safe Markdown renderer for lesson content (no raw HTML passthrough).
//
// Blocks:  ## / ### headings, paragraphs, - / 1. lists, | tables |, ``` code,
//          > quotes with callout markers: > [!TIP] [!WARN] [!RULE] [!NOTE] [!QUIZ] question
// Inline:  **bold**, _italic_, `code`, [text](url),
//          [[calc:trace?I=3&dT=20|Label]]  → button that opens a calculator
//          [[lesson:id|Label]]             → link to another lesson
//          [[fig:name]] on its own line    → figure from the lesson (`figures`) or figures.js

import { esc } from '../ui/format.js';
import { figure } from './figures.js';
import { icon } from '../ui/icons.js';

const CALLOUTS = {
  TIP: { cls: 'tip', icon: 'info' },
  NOTE: { cls: 'note-box', icon: 'book' },
  WARN: { cls: 'warn', icon: 'alert' },
  RULE: { cls: 'rule', icon: 'check' },
};

export const slug = (s) => s.toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/ı/g, 'i').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function safeUrl(u) {
  if (/^https?:\/\//i.test(u) || u.startsWith('#/') || /^[\w./-]+$/.test(u)) return u;
  return '#';
}

export function inline(text) {
  let s = esc(text);
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  s = s.replace(/\[\[calc:([^|\]]+)\|([^\]]+)\]\]/g, (_, path, label) => {
    const p = path.replace(/&amp;/g, '&');
    // tool id + optional query of simple key=value pairs
    const href = /^[\w-]+(\?[\w.%=&-]*)?$/.test(p) ? `#/${p}` : '#/';
    return `<a class="btn calc-link" href="${esc(href)}">${icon('right', 14)}<span>${label}</span></a>`;
  });
  s = s.replace(/\[\[lesson:([\w-]+)\|([^\]]+)\]\]/g, (_, id, label) => `<a href="#/learn/${id}">${label}</a>`);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
    const u = safeUrl(url.replace(/&amp;/g, '&'));
    const ext = /^https?:/i.test(u);
    return `<a href="${u}"${ext ? ' rel="noopener" target="_blank"' : ''}>${label}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[\s(])_([^_]+)_(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[Number(i)]}</code>`);
  return s;
}

function table(lines) {
  // Split on | but not inside [[ … | … ]] links.
  const cells = (l) => {
    const s = l.trim().replace(/^\||\|$/g, '');
    const out = [];
    let cur = '';
    let depth = 0;
    for (let i = 0; i < s.length; i++) {
      if (s.startsWith('[[', i)) { depth++; cur += '[['; i++; continue; }
      if (s.startsWith(']]', i) && depth) { depth--; cur += ']]'; i++; continue; }
      if (s[i] === '|' && !depth) { out.push(cur.trim()); cur = ''; continue; }
      cur += s[i];
    }
    out.push(cur.trim());
    return out;
  };
  const head = cells(lines[0]);
  const body = lines.slice(2).map(cells);
  return `<div class="table-scroll"><table class="grid left"><thead><tr>${head.map((h) => `<th scope="col">${inline(h)}</th>`).join('')}</tr></thead>
    <tbody>${body.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${inline(c)}</th>` : `<td>${inline(c)}</td>`)).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function quote(lines, quizLabel) {
  const raw = lines.map((l) => l.replace(/^>\s?/, ''));
  const m = raw[0].match(/^\[!(\w+)\]\s*(.*)$/);
  if (m && m[1] === 'QUIZ') {
    const answer = raw.slice(1).join('\n').trim();
    return `<details class="quiz"><summary>${icon('info', 16)}<span><b>${esc(quizLabel)}</b> ${inline(m[2])}</span></summary>
      <div class="quiz-answer">${blocks(answer, quizLabel)}</div></details>`;
  }
  if (m && CALLOUTS[m[1]]) {
    const c = CALLOUTS[m[1]];
    const body = [m[2], ...raw.slice(1)].join('\n').trim();
    return `<aside class="callout ${c.cls}">${icon(c.icon, 18)}<div>${blocks(body, quizLabel)}</div></aside>`;
  }
  return `<blockquote>${blocks(raw.join('\n'), quizLabel)}</blockquote>`;
}

/** Render Markdown to HTML. Returns { html, toc: [{ id, text }] } when withToc. */
export function blocks(md, quizLabel = 'Quiz', toc = null) {
  const lines = md.replace(/\r/g, '').split('\n');
  const out = [];
  let para = [];
  const flush = () => {
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`);
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      flush();
      const code = [];
      for (i++; i < lines.length && !lines[i].trim().startsWith('```'); i++) code.push(lines[i]);
      out.push(`<pre class="formula">${esc(code.join('\n'))}</pre>`);
      continue;
    }
    const h = trimmed.match(/^(#{2,3})\s+(.*)$/);
    if (h) {
      flush();
      const level = h[1].length;
      const id = slug(h[2]);
      if (toc && level === 2) toc.push({ id, text: h[2] });
      out.push(`<h${level} id="${id}">${inline(h[2])}</h${level}>`);
      continue;
    }
    const fig = trimmed.match(/^\[\[fig:([\w-]+)\]\]$/);
    if (fig) { flush(); out.push(localFigures?.[fig[1]] ? localFigures[fig[1]]() : figure(fig[1])); continue; }
    if (trimmed.startsWith('>')) {
      flush();
      const group = [];
      for (; i < lines.length && lines[i].trim().startsWith('>'); i++) group.push(lines[i].trim());
      i--;
      out.push(quote(group, quizLabel));
      continue;
    }
    if (trimmed.startsWith('|')) {
      flush();
      const group = [];
      for (; i < lines.length && lines[i].trim().startsWith('|'); i++) group.push(lines[i]);
      i--;
      out.push(table(group));
      continue;
    }
    const li = trimmed.match(/^([-*]|\d+\.)\s+(.*)$/);
    if (li) {
      flush();
      const ordered = /\d/.test(li[1]);
      const items = [];
      for (; i < lines.length; i++) {
        const m = lines[i].trim().match(/^([-*]|\d+\.)\s+(.*)$/);
        if (m) items.push(m[2]);
        else if (lines[i].trim() && /^\s{2,}/.test(lines[i]) && items.length) items[items.length - 1] += ` ${lines[i].trim()}`;
        else break;
      }
      i--;
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>${items.map((x) => `<li>${inline(x)}</li>`).join('')}</${tag}>`);
      continue;
    }
    if (!trimmed) { flush(); continue; }
    para.push(trimmed);
  }
  flush();
  return out.join('\n');
}

// Figures defined by the lesson itself ({ name: () => '<figure>…' }), looked up
// before the shared ones in figures.js.
let localFigures = null;

export function render(md, quizLabel, figures = null) {
  const toc = [];
  localFigures = figures;
  try {
    const html = blocks(md, quizLabel, toc);
    return { html, toc };
  } finally {
    localFigures = null;
  }
}
