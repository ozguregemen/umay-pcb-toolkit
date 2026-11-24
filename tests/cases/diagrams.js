// Smoke tests for every calculator diagram and lesson figure, in Turkish and
// English: the SVG must render without throwing, contain no NaN/undefined,
// and keep machine-readable numbers in geometry. Display formatters (fmt,
// fixed, si) write a decimal comma in Turkish, so they must never end up in
// coordinates — that once made the spiral drawing vanish in the TR UI.

import { ok } from '../assert.js';
import { TOOLS } from '../../src/registry.js';
import { registerStrings, setLang, getLang } from '../../src/i18n.js';
import { parseNumber } from '../../src/ui/calculator.js';
import { figure, figureNames, figureStrings } from '../../src/learn/figures.js';
import { LESSONS } from '../../src/learn/index.js';

// A page or lesson that fails to load is reported by a test instead of
// breaking the whole runner.
const loaded = await Promise.allSettled(TOOLS.map((tool) => tool.load()));
const pages = loaded.filter((r) => r.status === 'fulfilled').map((r) => r.value.default);
const loadErrors = loaded.flatMap((r, i) => (r.status === 'rejected' ? [`${TOOLS[i].id}: ${r.reason?.message ?? r.reason}`] : []));
const lessonMods = await Promise.allSettled(LESSONS.map((l) => import(`../../src/learn/lessons/${l.id}.js`)));
const lessonFigures = lessonMods.flatMap((r, i) => (r.status === 'fulfilled'
  ? Object.entries(r.value.default.figures ?? {}).map(([name, fn]) => [`${LESSONS[i].id}/${name}`, fn])
  : []));
for (const r of lessonMods) if (r.status === 'rejected') loadErrors.push(`lesson: ${r.reason?.message ?? r.reason}`);
for (const p of pages) if (p.strings) registerStrings(p.strings);
registerStrings(figureStrings);

const fieldsOf = (page) => page.sections.flatMap((s) => s.fields);

function rawDefaults(page) {
  const raw = {};
  const units = {};
  for (const f of fieldsOf(page)) {
    raw[f.key] = f.default === undefined || f.default === null ? '' : String(f.default);
    if (f.type === 'number') units[f.key] = f.unit ?? f.units?.[0];
  }
  return { raw, units };
}

/** Defaults, plus one variant per option of every choice/select (with its `set` values). */
function variants(page) {
  const base = rawDefaults(page);
  const list = [base];
  for (const f of fieldsOf(page)) {
    if (!f.options) continue;
    for (const o of f.options) {
      const raw = { ...base.raw, [f.key]: String(o.value) };
      const units = { ...base.units };
      for (const [k, val] of Object.entries(o.set ?? {})) {
        raw[k] = String(val);
        const ff = fieldsOf(page).find((x) => x.key === k);
        if (ff?.type === 'number' && ff.units) units[k] = ff.unit ?? ff.units[0];
      }
      list.push({ raw, units, label: `${f.key}=${o.value}` });
    }
  }
  return list;
}

function valuesOf(page, raw) {
  const v = {};
  for (const f of fieldsOf(page)) v[f.key] = f.type === 'number' ? parseNumber(raw[f.key], f.si) : raw[f.key];
  return v;
}

const NUM = /^-?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?%?$/i;
const PAIRS = { m: 2, l: 2, t: 2, s: 4, q: 4, c: 6, a: 7, h: 1, v: 1, z: 0 };

/** Returns a list of problems found in an SVG string. */
function svgProblems(svgText) {
  const bad = [];
  if (/NaN|undefined|Infinity/.test(svgText)) bad.push('NaN/undefined/Infinity');
  for (const [, name, val] of svgText.matchAll(/\s(x|y|x1|x2|y1|y2|cx|cy|r|rx|ry|width|height)="([^"]*)"/g)) {
    if (!NUM.test(val.trim())) bad.push(`${name}="${val}"`);
  }
  for (const [, val] of svgText.matchAll(/\spoints="([^"]*)"/g)) {
    if (val.trim().split(/\s+/).some((p) => !/^-?[\d.]+(e-?\d+)?,-?[\d.]+(e-?\d+)?$/.test(p))) bad.push(`points="${val.slice(0, 40)}…"`);
  }
  for (const [, val] of svgText.matchAll(/\sviewBox="([^"]*)"/g)) {
    const parts = val.trim().split(/\s+/);
    if (parts.length !== 4 || !parts.every((x) => NUM.test(x))) bad.push(`viewBox="${val}"`);
  }
  for (const [, val] of svgText.matchAll(/\sstyle="([^"]*)"/g)) {
    if (/\d,\d/.test(val)) bad.push(`style="${val}"`);
  }
  for (const [, val] of svgText.matchAll(/\sd="([^"]*)"/g)) {
    // Each command must carry a whole number of argument groups; a decimal
    // comma adds a stray number and breaks the count.
    for (const [, cmd, args] of val.matchAll(/([MLHVCSQTAZmlhvcsqtaz])([^MLHVCSQTAZmlhvcsqtaz]*)/g)) {
      const n = (args.match(/-?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?/gi) ?? []).length;
      const k = PAIRS[cmd.toLowerCase()];
      if (k === 0 ? n !== 0 : n === 0 || n % k !== 0) { bad.push(`d: ${cmd}${args.slice(0, 30)}`); break; }
    }
  }
  for (const [, val] of svgText.matchAll(/\stransform="([^"]*)"/g)) {
    for (const [, fn, args] of val.matchAll(/(\w+)\(([^)]*)\)/g)) {
      const n = args.split(/[\s,]+/).filter(Boolean);
      const want = { translate: [1, 2], rotate: [1, 3], scale: [1, 2] }[fn];
      if (!want || !want.includes(n.length) || !n.every((x) => NUM.test(x))) bad.push(`transform="${val}"`);
    }
  }
  return bad;
}

/**
 * How many numbers the geometry (path data, points, transforms) holds. Only
 * labels differ between languages, so TR and EN must give the same count; a
 * decimal comma in TR splits one number into two.
 */
const geometryNumbers = (svgText) => [...svgText.matchAll(/\s(?:d|points|transform)="([^"]*)"/g)]
  .reduce((n, [, val]) => n + (val.match(/-?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?/gi) ?? []).length, 0);

function inBothLanguages(fn) {
  const before = getLang();
  try {
    for (const l of ['tr', 'en']) { setLang(l); fn(l); }
  } finally {
    setLang(before);
  }
}

const withDiagram = pages.filter((p) => p.diagram);

export const cases = [
  ['pages and lessons: every module loads', () => {
    ok(loadErrors.length === 0, `\n${loadErrors.join('\n')}`);
  }],

  ['diagrams: every calculator diagram renders clean SVG in TR and EN', () => {
    ok(withDiagram.length >= 20, `expected ≥ 20 pages with diagrams, got ${withDiagram.length}`);
    const problems = [];
    const counts = new Map();
    inBothLanguages((lang) => {
      for (const page of withDiagram) {
        for (const { raw, units, label = 'defaults' } of variants(page)) {
          const id = `${page.id}[${label}]`;
          const where = `${lang}:${id}`;
          let out;
          try {
            const v = valuesOf(page, raw);
            const res = page.compute(v, units);
            out = page.diagram(v, units, res?.ok === false ? undefined : res);
          } catch (e) {
            problems.push(`${where} threw ${e.message}`);
            continue;
          }
          if (label === 'defaults' && !out) problems.push(`${where} drew nothing`);
          if (!out) continue;
          for (const b of svgProblems(out)) problems.push(`${where}: ${b}`);
          const n = geometryNumbers(out);
          if (counts.has(id) && counts.get(id) !== n) problems.push(`${id}: geometry differs between TR and EN (${counts.get(id)} vs ${n} numbers)`);
          counts.set(id, n);
        }
      }
    });
    ok(problems.length === 0, `\n${[...new Set(problems)].slice(0, 15).join('\n')}`);
  }],

  ['diagrams: every lesson figure renders clean SVG in TR and EN', () => {
    const names = figureNames();
    ok(names.length >= 8, 'figures registered');
    const problems = [];
    const counts = new Map();
    // Shared figures (figures.js) and figures a lesson defines itself.
    const all = [...names.map((n) => [n, () => figure(n)]), ...lessonFigures.map(([n, fn]) => [n, (lang) => fn(lang)])];
    inBothLanguages((lang) => {
      for (const [name, draw] of all) {
        let out;
        try { out = draw(lang); } catch (e) { problems.push(`${lang}:${name} threw ${e.message}`); continue; }
        if (!out?.includes('<svg')) { problems.push(`${lang}:${name} drew nothing`); continue; }
        for (const b of svgProblems(out)) problems.push(`${lang}:${name}: ${b}`);
        const n = geometryNumbers(out);
        if (counts.has(name) && counts.get(name) !== n) problems.push(`${name}: geometry differs between TR and EN`);
        counts.set(name, n);
      }
    });
    ok(problems.length === 0, `\n${[...new Set(problems)].slice(0, 15).join('\n')}`);
  }],

  ['diagrams: the checker catches a Turkish decimal comma', () => {
    ok(svgProblems('<svg viewBox="0 0 10 10"><path d="M12,5,30L3,4"/></svg>').length > 0, 'path');
    // Two commas keep the pair count even; the TR/EN comparison catches that case.
    ok(geometryNumbers('<path d="M12,5,30,4L3,4"/>') !== geometryNumbers('<path d="M12.5,30.4L3,4"/>'), 'TR/EN count');
    ok(svgProblems('<svg viewBox="0 0 10 10"><rect x="1,5" y="2" width="3" height="4"/></svg>').length > 0, 'rect');
    ok(svgProblems('<svg viewBox="0 0 10 10"><polyline points="1,5,2 3,4"/></svg>').length > 0, 'points');
    ok(svgProblems('<svg viewBox="0 0 10 10"><path style="stroke-width:2,5" d="M1,2L3,4"/></svg>').length > 0, 'style');
    ok(svgProblems('<svg viewBox="0 0 10 10"><path d="M1,2L3,4H5V6Z"/><circle cx="1" cy="2" r="3"/></svg>').length === 0, 'clean svg passes');
  }],
];
