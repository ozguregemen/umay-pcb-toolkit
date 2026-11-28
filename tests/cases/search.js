// Search over lesson text and the glossary, and the saved-calculation store.

import { ok, eq } from '../assert.js';
import { LESSONS } from '../../src/learn/index.js';
import { render } from '../../src/learn/markdown.js';
import { parseLesson, buildIndex, searchContent, hitHref, norm } from '../../src/learn/search.js';
import { sanitizeSaved, addSaved, listSaved, removeSaved, restoreSaved, exportData, importData, toggleFav, isFav } from '../../src/saved.js';

const lessons = [];
for (const l of LESSONS) {
  try { lessons.push({ id: l.id, ...(await import(`../../src/learn/lessons/${l.id}.js`)).default }); } catch { /* reported by the integrity tests */ }
}
const index = buildIndex(lessons);

export const cases = [
  ['search: a lesson is split into headings, text and glossary terms', () => {
    const md = [
      'Intro **bold** text with a [[calc:trace?I=3|trace button]].',
      '## Çekirdek ve prepreg',
      '- **Prepreg (B-stage)**: Kısmen kürlenmiş reçine. Bkz. [[lesson:stackup|Katman yığını]].',
      '| A | B |', '|---|---|', '| x | y |',
      '```', 'Z0 = 87 / sqrt(er)', '```',
      '> [!QUIZ] Soru metni?', '> Gizli cevap.',
      '> [!TIP] İpucu metni.',
    ].join('\n');
    const b = parseLesson(md, true);
    eq(b[0].text, 'Intro bold text with a trace button.', 'markup removed');
    eq(b[0].slug, '', 'text before the first heading has no section');
    eq(b[1].heading, 'Çekirdek ve prepreg', 'heading');
    eq(b[1].slug, 'cekirdek-ve-prepreg', 'slug matches the page anchor');
    eq(b[2].term, 'Prepreg (B-stage)', 'glossary term');
    eq(b[2].text, 'Kısmen kürlenmiş reçine. Bkz. Katman yığını.', 'definition');
    const texts = b.map((x) => x.text);
    ok(texts.includes('A · B') && texts.includes('x · y'), 'table rows are indexed, the separator is not');
    ok(!texts.some((x) => x.includes('Z0 =')), 'code blocks are skipped');
    ok(texts.includes('Soru metni?') && !texts.some((x) => x.includes('Gizli')), 'quiz question indexed, answer skipped');
    ok(texts.includes('İpucu metni.'), 'callout text indexed');
    ok(!parseLesson(md).some((x) => x.term), 'terms only in the glossary');
  }],

  ['search: glossary terms and lesson text are found in both languages', () => {
    for (const lang of ['tr', 'en']) {
      const hits = searchContent('prepreg', lang, index);
      ok(hits.length > 1, `${lang}: prepreg has hits`);
      eq(hits[0].kind, 'term', `${lang}: the glossary term ranks first`);
      eq(hits[0].lesson, 'glossary', `${lang}: from the glossary`);
      ok(norm(hits[0].title).startsWith('prepreg'), `${lang}: term title is ${hits[0].title}`);
      ok(hitHref(hits[0]).startsWith('learn/glossary?s='), `${lang}: link carries the section`);
      ok(hits.some((h) => h.kind === 'text' && h.lesson !== 'glossary'), `${lang}: also found in lesson text`);
    }
    // Accent-insensitive, every word must match, with the match marked in the snippet.
    const tr = searchContent('donus yolu', 'tr', index);
    ok(tr.length > 0, 'dönüş yolu is found without Turkish letters');
    const withMark = tr.find((h) => h.snippet?.mark);
    ok(withMark, 'a snippet marks the match');
    const [a, b] = withMark.snippet.mark;
    ok(['donus', 'yolu'].includes(norm(withMark.snippet.text.slice(a, b))), 'marked text is a search word');
    eq(searchContent('x', 'tr', index).length, 0, 'one letter is not searched');
    eq(searchContent('zzqqxx', 'en', index).length, 0, 'nonsense has no hits');
    ok(searchContent('via', 'en', index).length <= 12, 'results are capped');
  }],

  ['search: every indexed section exists as an anchor on the lesson page', () => {
    const problems = [];
    for (const lesson of lessons) {
      for (const lang of ['tr', 'en']) {
        const figs = Object.fromEntries(Object.keys(lesson.figures ?? {}).map((k) => [k, () => '']));
        const { html } = render(lesson.body?.[lang] ?? '', 'Quiz', figs);
        const slugs = new Set(index[lang].filter((x) => x.lesson === lesson.id && x.slug).map((x) => x.slug));
        for (const s of slugs) if (!html.includes(`id="${s}"`)) problems.push(`${lesson.id} (${lang}): no anchor "${s}"`);
      }
    }
    ok(index.tr.length > 500 && index.en.length > 500, `index is populated (${index.tr.length}/${index.en.length})`);
    ok(problems.length === 0, `\n${problems.slice(0, 20).join('\n')}`);
  }],

  ['saved: stored and imported entries are validated', () => {
    const got = sanitizeSaved([
      { id: 'a1', tool: 'trace', query: 'I=3&dT=10', name: '  5 V   rail ', project: 'Board A', value: 'Width: 1.2 mm', at: 5 },
      { id: 'a1', tool: 'via', query: '', name: 'duplicate id' },
      { tool: 'no-such-tool', query: '', name: 'x' },
      { tool: 'via', query: 'a=<script>&b=1 2', name: 'n'.repeat(200) },
      null, 'text', 7,
    ]);
    eq(got.length, 2, 'unknown tools, duplicates and junk are dropped');
    eq(got[0].name, '5 V rail', 'whitespace collapsed');
    eq(got[0].at, 5, 'date kept');
    eq(got[1].query, 'a=%3Cscript%3E&b=1+2', 'query re-encoded');
    eq(got[1].name.length, 80, 'name trimmed');
    ok(/^[\w-]+$/.test(got[1].id), 'id generated');
    eq(sanitizeSaved('nope').length, 0, 'not a list');
    // A number no Date can hold would make every page that shows the date throw.
    for (const at of [1e300, -1e300, 8.64e15 + 1, Infinity, NaN, '5']) {
      const [x] = sanitizeSaved([{ tool: 'via', at }]);
      ok(Math.abs(x.at - Date.now()) < 60_000 && !Number.isNaN(new Date(x.at).getTime()), `at ${at} is replaced by now`);
    }
    eq(sanitizeSaved([{ tool: 'via', at: 8.64e15 }])[0].at, 8.64e15, 'the last valid time is kept');
  }],

  ['saved: add, delete, undo, export and import', () => {
    const before = listSaved().length;
    const a = addSaved({ tool: 'trace', query: 'I=3', name: 'Rail', project: 'P1', value: '' });
    const b = addSaved({ tool: 'ntc', query: '', name: 'Sensor', project: '' });
    eq(listSaved().length, before + 2, 'two added');
    eq(listSaved()[0].id, b.id, 'newest first');
    eq(addSaved({ tool: 'nope', name: 'x' }), null, 'unknown tool refused');
    const had = isFav('trace');
    if (!had) toggleFav('trace');
    const file = exportData();
    // The file format: one object; project details were added later (tests/cases/report.js).
    eq(Object.keys(JSON.parse(file)).join(), 'app,version,favs,saved,projects', 'keys of the export file');
    removeSaved(a.id);
    eq(listSaved().length, before + 1, 'deleted');
    restoreSaved(a, 1);
    eq(listSaved()[1].id, a.id, 'undo puts it back in place');
    removeSaved(a.id);
    removeSaved(b.id);
    toggleFav('trace');
    ok(!isFav('trace'), 'favourite removed');
    eq(importData(file), 2, 'import adds both');
    eq(importData(file), 0, 'importing again adds nothing new');
    eq(listSaved().length, before + 2, 'no duplicates');
    ok(isFav('trace'), 'favourites come with the file');
    eq(importData('not json'), -1, 'garbage is refused');
    eq(importData('{"foo":1}'), -1, 'other JSON is refused');
    removeSaved(a.id);
    removeSaved(b.id);
    if (!had) toggleFav('trace');
  }],
];
