// Integrity of the catalogue: things that break silently when a tool or
// lesson is added, renamed or removed — a missing translation, a lesson
// button that opens a calculator with a parameter it no longer has, a
// result without a cited source.

import { ok } from '../assert.js';
import { TOOLS, CATEGORIES } from '../../src/registry.js';
import { LESSONS } from '../../src/learn/index.js';
import { dictionaries, registerStrings, setLang, getLang } from '../../src/i18n.js';
import { hasIcon } from '../../src/ui/icons.js';
import { parseNumber } from '../../src/ui/calculator.js';
import { figureNames, figureStrings } from '../../src/learn/figures.js';

const pageById = new Map();
for (const tool of TOOLS) {
  try {
    const page = (await tool.load()).default;
    pageById.set(tool.id, page);
    if (page.strings) registerStrings(page.strings);
  } catch { /* reported by "every module loads" in diagrams.js */ }
}
registerStrings(figureStrings);

const lessonById = new Map();
for (const l of LESSONS) {
  try { lessonById.set(l.id, (await import(`../../src/learn/lessons/${l.id}.js`)).default); } catch { /* reported elsewhere */ }
}

const fieldsOf = (page) => (page.sections ?? []).flatMap((s) => s.fields);
const report = (problems) => ok(problems.length === 0, `\n${[...new Set(problems)].slice(0, 20).join('\n')}`);

/** Problems with the query of a [[calc:tool?k=v]] link, checked against the page's fields. */
function linkProblems(page, query) {
  const out = [];
  const fields = fieldsOf(page);
  for (const [key, value] of new URLSearchParams(query)) {
    const unitOf = key.endsWith('_u') ? fields.find((f) => f.key === key.slice(0, -2)) : null;
    if (unitOf) {
      if (!unitOf.units?.includes(value)) out.push(`unit ${key}=${value}`);
      continue;
    }
    const f = fields.find((x) => x.key === key);
    if (!f) { out.push(`no field "${key}"`); continue; }
    if (f.options && !f.options.some((o) => String(o.value) === value)) out.push(`${key}=${value} is not an option`);
    if (f.type === 'number' && value === '' && f.optional) continue; // clears an optional field
    if (f.type === 'number' && !Number.isFinite(parseNumber(value, f.si))) out.push(`${key}=${value} is not a number`);
  }
  return out;
}

export const cases = [
  ['catalogue: every tool has a category, icon, page and names in TR and EN', () => {
    const problems = [];
    const cats = new Set(CATEGORIES.map((c) => c.id));
    const seen = new Set();
    for (const c of CATEGORIES) {
      if (!hasIcon(c.icon)) problems.push(`category ${c.id}: icon "${c.icon}"`);
      for (const l of ['tr', 'en']) if (!dictionaries[l][c.title]) problems.push(`category ${c.id}: ${l} title`);
      if (!TOOLS.some((x) => x.cat === c.id)) problems.push(`category ${c.id} is empty`);
    }
    for (const tool of TOOLS) {
      if (seen.has(tool.id)) problems.push(`${tool.id}: duplicate id`);
      seen.add(tool.id);
      if (!cats.has(tool.cat)) problems.push(`${tool.id}: category "${tool.cat}"`);
      if (!hasIcon(tool.icon)) problems.push(`${tool.id}: icon "${tool.icon}"`);
      const page = pageById.get(tool.id);
      if (!page) problems.push(`${tool.id}: page did not load`);
      else if (page.id !== tool.id) problems.push(`${tool.id}: page id is "${page.id}"`);
      for (const l of ['tr', 'en']) {
        for (const k of [`tool_${tool.id}`, `tool_${tool.id}_desc`]) if (!dictionaries[l][k]) problems.push(`${l}: ${k}`);
      }
    }
    report(problems);
  }],

  ['i18n: Turkish and English define the same keys', () => {
    const tr = Object.keys(dictionaries.tr);
    const en = new Set(Object.keys(dictionaries.en));
    const trSet = new Set(tr);
    report([
      ...tr.filter((k) => !en.has(k)).map((k) => `only in tr: ${k}`),
      ...[...en].filter((k) => !trSet.has(k)).map((k) => `only in en: ${k}`),
      ...tr.filter((k) => dictionaries.tr[k] === '' || dictionaries.en[k] === '').map((k) => `empty: ${k}`),
    ]);
  }],

  ['calculators: every field label, option and info text has a translation', () => {
    const problems = [];
    const has = (k) => typeof k !== 'string' || (k in dictionaries.tr && k in dictionaries.en);
    for (const [id, page] of pageById) {
      for (const s of page.sections ?? []) {
        if (s.title && !has(s.title)) problems.push(`${id}: section "${s.title}"`);
        for (const f of s.fields) {
          if (!has(f.label)) problems.push(`${id}.${f.key}: label "${f.label}"`);
          if (f.info && !has(f.info)) problems.push(`${id}.${f.key}: info "${f.info}"`);
          for (const o of f.options ?? []) if (!o.raw && !has(o.label)) problems.push(`${id}.${f.key}: option "${o.label}"`);
        }
      }
    }
    report(problems);
  }],

  ['calculators: the default result cites a source', () => {
    const problems = [];
    const before = getLang();
    setLang('en');
    try {
      for (const [id, page] of pageById) {
        if (page.mount || !page.render) continue; // reference-style pages build their own layout
        const raw = {};
        const units = {};
        for (const f of fieldsOf(page)) {
          raw[f.key] = f.type === 'number' ? parseNumber(f.default === undefined || f.default === null ? '' : String(f.default), f.si) : String(f.default ?? '');
          if (f.type === 'number') units[f.key] = f.unit ?? f.units?.[0];
        }
        let html;
        try {
          html = page.render(page.compute(raw, units), raw, units);
        } catch (e) {
          problems.push(`${id}: render threw ${e.message}`);
          continue;
        }
        if (!html.includes('class="refs"')) problems.push(`${id}: no source list (formulaBlock refs)`);
        if (/NaN|undefined/.test(html.replace(/<[^>]*>/g, ' '))) problems.push(`${id}: NaN/undefined in the default result`);
      }
    } finally {
      setLang(before);
    }
    report(problems);
  }],

  ['lessons: titles, both languages and tool lists are valid', () => {
    const problems = [];
    const ids = new Set(TOOLS.map((x) => x.id));
    for (const l of LESSONS) {
      for (const lang of ['tr', 'en']) {
        for (const k of [`lesson_${l.id}`, `lesson_${l.id}_desc`]) if (!dictionaries[lang][k]) problems.push(`${lang}: ${k}`);
        if (!(lessonById.get(l.id)?.body?.[lang]?.trim().length > 200)) problems.push(`${l.id}: ${lang} body missing or too short`);
      }
      for (const x of l.tools) if (!ids.has(x)) problems.push(`${l.id}: unknown tool "${x}"`);
    }
    report(problems);
  }],

  ['lessons: every calculator, lesson and figure link resolves', () => {
    const problems = [];
    const lessonIds = new Set(LESSONS.map((l) => l.id));
    const shared = new Set(figureNames());
    let links = 0;
    for (const [id, lesson] of lessonById) {
      for (const lang of ['tr', 'en']) {
        const md = lesson.body?.[lang] ?? '';
        const where = `${id} (${lang})`;
        for (const [, path] of md.matchAll(/\[\[calc:([^|\]]+)\|[^\]]+\]\]/g)) {
          links++;
          const [tool, query = ''] = path.split('?');
          const page = pageById.get(tool);
          if (!page) { problems.push(`${where}: calc:${tool} does not exist`); continue; }
          if (!/^[\w.%=&-]*$/.test(query)) problems.push(`${where}: calc:${path} has characters the link renderer rejects`);
          if (query && page.mount) continue; // custom pages parse their own parameters
          for (const p of linkProblems(page, query)) problems.push(`${where}: calc:${path} → ${p}`);
        }
        for (const [, target] of md.matchAll(/\[\[lesson:([\w-]+)\|[^\]]+\]\]/g)) {
          if (!lessonIds.has(target)) problems.push(`${where}: lesson:${target} does not exist`);
        }
        for (const [, name] of md.matchAll(/^\[\[fig:([\w-]+)\]\]\s*$/gm)) {
          if (!shared.has(name) && !lesson.figures?.[name]) problems.push(`${where}: fig:${name} does not exist`);
        }
        if (/\[\[(?!calc:|lesson:|fig:)/.test(md)) problems.push(`${where}: unknown [[…]] marker`);
      }
    }
    ok(links > 50, `expected lesson calculator links, found ${links}`);
    report(problems);
  }],
];
