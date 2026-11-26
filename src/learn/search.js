// Full-text index of the lessons and the glossary for the search palette.
// Built once, on first use, from the lesson bodies (Markdown). No DOM access
// here, so the tests can run it in Node; reveal() is the only browser part.

import { LESSONS } from './index.js';
import { slug } from './markdown.js';

/** Case- and accent-insensitive form used for matching (ç→c, İ/ı→i …). */
export const norm = (s) => s.toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');

const LINK = /\[\[(?:calc|lesson):[^|\]]+\|([^\]]+)\]\]/g;

/** Markdown inline markup → plain text. */
const plain = (s) => s
  .replace(LINK, '$1')
  .replace(/\[\[fig:[\w-]+\]\]/g, '')
  .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1')
  .replace(/\*\*([^*]+)\*\*/g, '$1')
  .replace(/`([^`]+)`/g, '$1')
  .replace(/(^|[\s(])_([^_]+)_(?=[\s).,;:!?]|$)/g, '$1$2')
  .replace(/\s+/g, ' ')
  .trim();

/**
 * Split a lesson body into searchable blocks: one per heading (text ''),
 * paragraph, list item, table row and callout line. Code blocks and quiz
 * answers (collapsed on the page) are left out. In the glossary a list item
 * "**Term**: definition" becomes { term, text }.
 */
export function parseLesson(md, glossary = false) {
  const out = [];
  let cur = { slug: '', heading: '' };
  let para = [];
  let inCode = false;
  let inQuiz = false;
  const push = (text) => {
    const m = glossary && text.match(/^\*\*([^*]+)\*\*\s*:?\s*(.*)$/);
    const body = plain(m ? m[2] : text);
    if (body) out.push({ ...cur, text: body, ...(m ? { term: plain(m[1]) } : {}) });
  };
  const flush = () => {
    if (para.length) push(para.join(' '));
    para = [];
  };
  for (const raw of md.replace(/\r/g, '').split('\n')) {
    const line = raw.trim();
    if (line.startsWith('```')) { flush(); inCode = !inCode; continue; }
    if (inCode) continue;
    if (!line.startsWith('>')) inQuiz = false;
    const h = line.match(/^(#{2,3})\s+(.*)$/);
    if (h) {
      flush();
      cur = { slug: slug(h[2]), heading: plain(h[2]) };
      out.push({ ...cur, text: '' });
      continue;
    }
    if (!line || /^\[\[fig:[\w-]+\]\]$/.test(line)) { flush(); continue; }
    if (line.startsWith('>')) {
      flush();
      const q = line.replace(/^>\s?/, '');
      const m = q.match(/^\[!(\w+)\]\s*(.*)$/);
      if (m) { inQuiz = m[1] === 'QUIZ'; push(m[2]); } else if (!inQuiz) push(q);
      continue;
    }
    if (line.startsWith('|')) {
      flush();
      if (!/^\|[\s:|-]+$/.test(line)) push(line.replace(LINK, '$1').replace(/^\||\|$/g, '').replace(/\|/g, ' · '));
      continue;
    }
    const li = line.match(/^(?:[-*]|\d+\.)\s+(.*)$/);
    if (li) { flush(); para = [li[1]]; continue; }
    para.push(line);
  }
  flush();
  return out;
}

/** lessons: [{ id, body: { tr, en } }] → { tr: [block…], en: [block…] } */
export function buildIndex(lessons) {
  const idx = {};
  for (const lang of ['tr', 'en']) {
    idx[lang] = [];
    for (const { id, body } of lessons) {
      for (const b of parseLesson(body?.[lang] ?? '', id === 'glossary')) {
        idx[lang].push({ lesson: id, ...b, n: norm(b.text), hn: norm(b.heading), tn: b.term ? norm(b.term) : '' });
      }
    }
  }
  return idx;
}

let index = null;
let loading = null;

/** Load every lesson once and build the index (resolves to it). */
export function loadIndex() {
  loading ??= Promise.all(LESSONS.map(async (l) => {
    try {
      return { id: l.id, body: (await import(`./lessons/${l.id}.js`)).default.body };
    } catch {
      return { id: l.id, body: {} };
    }
  })).then((lessons) => {
    index = buildIndex(lessons);
    return index;
  });
  return loading;
}

const SNIPPET = 120;

// A search word matches at the start of a word ("via" finds "vialar", not
// "trivial"); the text is already folded to a-z by norm().
const escapeRe = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const matcher = (w) => new RegExp(`(?:^|[^a-z0-9])${escapeRe(w)}`);
const wordsOf = (q) => q.split(/\s+/).filter(Boolean).map((w) => ({ w, re: matcher(w) }));

/** Text around the first match, with the match position inside the snippet. */
function snippet(text, n, terms) {
  let pos = -1;
  let len = 0;
  // Positions in the normalised string are valid in the original only while
  // both have the same length (true for Turkish and English text).
  if (n.length === text.length) {
    for (const { w, re } of terms) {
      const m = re.exec(n);
      const p = m ? m.index + m[0].length - w.length : -1;
      if (p >= 0 && (pos < 0 || p < pos)) { pos = p; len = w.length; }
    }
  }
  if (pos < 0) return { text: text.slice(0, SNIPPET) + (text.length > SNIPPET ? '…' : ''), mark: null };
  let start = Math.max(0, pos - 40);
  if (start > 0) {
    const sp = text.indexOf(' ', start);
    if (sp >= 0 && sp < pos) start = sp + 1;
  }
  const end = Math.min(text.length, start + SNIPPET);
  const lead = start > 0 ? '…' : '';
  return {
    text: lead + text.slice(start, end) + (end < text.length ? '…' : ''),
    mark: [lead.length + pos - start, lead.length + pos - start + len],
  };
}

/**
 * Search lesson text. Returns [{ kind: 'term'|'section'|'text', score, lesson,
 * slug, heading, title, snippet: { text, mark }, q }] best first. Scores share
 * the scale of the tool search (0 title prefix, 1 title, 2 description).
 */
export function searchContent(query, lang, idx = index, limit = 12) {
  const q = norm(query.trim());
  if (!idx?.[lang] || q.length < 2) return [];
  const terms = wordsOf(q);
  const all = (hay) => terms.every(({ re }) => re.test(hay));
  const hits = [];
  const sectionHit = new Set();
  const textPerSection = new Set();
  const textPerLesson = new Map();
  for (const b of idx[lang]) {
    const where = `${b.lesson}#${b.slug}`;
    if (b.term) {
      const inTerm = all(b.tn);
      if (!inTerm && !all(`${b.tn} ${b.n}`)) continue;
      hits.push({
        kind: 'term', score: inTerm ? (b.tn.startsWith(q) ? 0.5 : 1.5) : 3, b,
        title: b.term, snippet: inTerm ? snippet(b.text, '', terms) : snippet(b.text, b.n, terms), q: b.term,
      });
    } else if (!b.text) {
      if (!b.heading || !all(b.hn)) continue;
      sectionHit.add(where);
      hits.push({ kind: 'section', score: b.hn.startsWith(q) ? 1.2 : 1.6, b, title: b.heading, snippet: null, q: '' });
    } else {
      if (!all(b.n) || sectionHit.has(where) || textPerSection.has(where)) continue;
      const count = textPerLesson.get(b.lesson) ?? 0;
      if (count >= 3) continue;
      textPerSection.add(where);
      textPerLesson.set(b.lesson, count + 1);
      hits.push({ kind: 'text', score: 3.2, b, title: b.heading, snippet: snippet(b.text, b.n, terms), q: query.trim() });
    }
  }
  return hits
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map(({ b, ...h }) => ({ ...h, lesson: b.lesson, slug: b.slug, heading: b.heading }));
}

/** Link to a search hit: the lesson, its section and the text to highlight. */
export function hitHref(hit) {
  const p = new URLSearchParams();
  if (hit.slug) p.set('s', hit.slug);
  if (hit.q) p.set('q', hit.q.slice(0, 60));
  const qs = p.toString();
  return `learn/${hit.lesson}${qs ? `?${qs}` : ''}`;
}

/**
 * On a rendered lesson: scroll to section `s` and highlight the first block in
 * it that contains `q` (a glossary term or the search words).
 */
export function reveal(article, s, q) {
  if (!article || (!s && !q)) return;
  const heading = s ? article.querySelector(`[id="${CSS.escape(s)}"]`) : null;
  let target = null;
  if (q) {
    const nq = norm(q.trim());
    const terms = wordsOf(nq);
    const blocks = [];
    for (let el = heading ? heading.nextElementSibling : article.firstElementChild; el && !/^H[23]$/.test(el.tagName); el = el.nextElementSibling) {
      if (el.matches('ul, ol')) blocks.push(...el.children);
      else if (el.matches('.table-scroll')) blocks.push(...el.querySelectorAll('tbody tr'));
      else if (el.matches('.callout')) blocks.push(...el.querySelectorAll('p, li'), el);
      else if (el.matches('.quiz')) blocks.push(el.querySelector('summary'));
      else if (el.matches('p')) blocks.push(el);
    }
    target = blocks.find((el) => norm(el.querySelector(':scope > strong:first-child')?.textContent ?? '') === nq)
      ?? blocks.find((el) => { const n = norm(el.textContent); return terms.every(({ re }) => re.test(n)); });
  }
  const el = target ?? heading;
  if (!el) return;
  el.scrollIntoView({ block: target ? 'center' : 'start' });
  if (target) {
    target.classList.add('found');
    setTimeout(() => target.classList.remove('found'), 4000);
  }
}
