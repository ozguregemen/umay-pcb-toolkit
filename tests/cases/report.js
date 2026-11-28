// Design report (src/ui/report.js): the model behind the page, the project
// details kept with the saved calculations, the static rendering of a
// calculation (ui/calculator.js renderStatic) and the escaping of everything
// a reader — or a file someone else made — can put into a report.
// The mounting itself needs a document and is not covered here.

import { ok, eq } from '../assert.js';
import { TOOLS } from '../../src/registry.js';
import { dictionaries, registerStrings, setLang, getLang } from '../../src/i18n.js';
import { getPref, setPref } from '../../src/prefs.js';
import { renderStatic, staticHtml, steps } from '../../src/ui/calculator.js';
import { esc } from '../../src/ui/format.js';
import {
  sanitizeSaved, addSaved, removeSaved, exportData, importData,
  sanitizeProjects, listProjectDetails, projectDetails, setProjectDetails, projectKey, DETAIL_LIMITS,
} from '../../src/saved.js';
import {
  reportHref, reportProject, reportGroups, reportModel, reportDocTitle,
  reportPageHtml, reportFactsHtml, reportItemParts, demoteHeadings,
} from '../../src/ui/report.js';

const mods = new Map();
for (const tool of TOOLS) {
  try {
    const mod = await tool.load();
    mods.set(tool.id, mod);
    if (mod.default.strings) registerStrings(mod.default.strings);
  } catch { /* reported by "every module loads" in diagrams.js */ }
}
const page = (id) => mods.get(id).default;

/** Run with the reader's preferences and language put back afterwards (the browser runner uses the real ones). */
function sandbox(fn) {
  const keys = ['saved', 'projects', 'favs', 'units', 'stepsOpen', 'fab'];
  const before = Object.fromEntries(keys.map((k) => [k, getPref(k)]));
  const lang = getLang();
  try {
    fn();
  } finally {
    for (const k of keys) if (getPref(k) !== before[k]) setPref(k, before[k]);
    setLang(lang);
  }
}
/** Runs fn(lang, T, D) in Turkish and English: T gives a string as it appears in HTML (escaped), D as it is. */
const inBothLanguages = (fn) => sandbox(() => {
  for (const l of ['tr', 'en']) {
    setLang(l);
    fn(l, new Proxy({}, { get: (_, key) => esc(dictionaries[l][key] ?? `?${String(key)}?`) }), dictionaries[l]);
  }
});

const NO_DETAILS = { project: '', title: '', board: '', rev: '', author: '', notes: '' };
const count = (html, re) => (html.match(re) ?? []).length;
const textOf = (html) => html.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

/** What must never be inside a report section. */
function staticProblems(html) {
  const rules = [
    ['a button', /<button\b/], ['an input', /<input\b/], ['a select', /<select\b/], ['a textarea', /<textarea\b/], ['a form', /<form\b/],
    ['a button-style link', /<a\b[^>]*\sclass="btn\b/], ['an action', /data-action=|data-copy=/],
    ['the plot block', /data-plot|class="[^"]*\bplot\b/], ['next-step cards', /next-steps|next-card/],
    ['a closed block', /<details\b(?![^>]*\sopen\b)/], ['a script', /<script\b/i],
  ];
  return rules.filter(([, re]) => re.test(html)).map(([what]) => what);
}

// Hostile text: a tag, an attribute break-out and a script, with quotes.
const X = '<img src=x onerror=alert(1)>';
const Q = '"><script>alert(1)</script>\'';
const Z = '" onmouseover="alert(1)" x="';
function injected(html) {
  const bad = [];
  if (html.includes('<img')) bad.push('<img');
  if (/<script/i.test(html)) bad.push('<script');
  if (html.includes('onmouseover="')) bad.push('attribute break-out');
  return bad;
}

const SAVED = [
  { id: 'a', tool: 'trace', query: 'I=3', name: 'Rail', project: 'Kart B', at: 5 },
  { id: 'b', tool: 'ntc', query: '', name: 'Sensor', project: '', at: 4 },
  { id: 'c', tool: 'no-such-tool', query: '', name: 'Ghost', project: 'Kart B', at: 3 },
  { id: 'd', tool: 'divider', query: 'vin=3.3', name: 'Feedback', project: 'Kart B', at: 2 },
  { id: 'e', tool: 'via', query: '', name: 'Via', project: 'Ada', at: 1 },
];

export const cases = [
  ['report: calculations are grouped by project, in the order of the saved list', () => {
    const groups = reportGroups(SAVED, 'en');
    eq(groups.map((g) => g.project).join('|'), 'Ada|Kart B|', 'projects by name, the group without a project last');
    eq(groups[1].items.map((x) => x.id).join(), 'a,d', 'saved-list order, the unknown tool dropped');
    eq(groups[2].items.map((x) => x.id).join(), 'b', 'calculations without a project');
    eq(reportGroups('nope').length, 0, 'not a list');

    const now = new Date(2026, 10, 28);
    const m = reportModel('Kart B', { saved: SAVED, details: NO_DETAILS, now });
    eq(m.project, 'Kart B');
    eq(m.title, 'Kart B', 'without a title of its own the project name is the title');
    eq(m.date, now, 'the date the report is opened');
    eq(m.items.map((x) => `${x.n}:${x.id}:${x.tool}`).join(), '1:a:trace,2:d:divider');
    eq(m.items[0].anchor, 'calc-a');
    eq(m.items[0].href, '#/trace?I=3', 'the link back opens the calculator with the saved values');
    eq(m.items[1].at, 2, 'every entry keeps its own saved date');
    eq(reportModel('  Kart   B ', { saved: SAVED, details: NO_DETAILS }).items.length, 2, 'the name is tidied like a stored one');
    eq(reportModel('kart b', { saved: SAVED, details: NO_DETAILS }).items.length, 0, 'but it is not another project');

    const none = reportModel('', { saved: SAVED, details: NO_DETAILS });
    eq(none.items.map((x) => x.id).join(), 'b', 'no project name → the calculations without one');
    eq(none.title, '');
    eq(reportModel('Gone', { saved: SAVED, details: NO_DETAILS }).items.length, 0, 'a stale project is empty');
    eq(reportModel('Kart B', { saved: SAVED, details: { ...NO_DETAILS, title: 'Power board' } }).title, 'Power board');
  }],

  ['report: the project name travels in the address and comes back intact', () => {
    const names = ['Kart A&B #2 %50', 'Güç kartı – Ölçüm ÖÇŞİĞÜ', '電源ボード №1', 'a?b=c+d e/f', `x'"<y>`, '%E0%A4%A', '100%'];
    for (const name of names) {
      const href = reportHref(name);
      ok(/^#\/report\?p=[\w.~!*'()%-]+$/.test(href), `only safe characters in ${href}`);
      // What the router makes of it (parseHash in app.js).
      const [path, query = ''] = href.replace(/^#\/?/, '').split('?');
      eq(path, 'report', name);
      eq(reportProject(new URLSearchParams(query)), projectKey(name), name);
    }
    eq(reportHref(''), '#/report', 'calculations without a project');
    eq(reportProject(new URLSearchParams('')), '');
    eq(reportProject(null), '', 'no parameters');
    eq(reportProject(new URLSearchParams('p=50%&p=second')), '50%', 'a bare % is text; the first p counts');
    eq(reportProject(new URLSearchParams('p=%zz%')), '%zz%', 'a broken escape is kept as text');
    ok(reportProject(new URLSearchParams('p=%E0%A4%A')).length <= 60, 'broken UTF-8 never throws');
    eq(reportProject(new URLSearchParams(`p=${'x'.repeat(500)}`)).length, 60, 'no longer than a stored name');
    eq(reportProject(new URLSearchParams('p=%20%20Kart%09%20A%20')), 'Kart A', 'whitespace tidied');
  }],

  ['report: project details are validated and length-limited', () => {
    const got = sanitizeProjects([
      { project: '  Kart   A ', title: ' Güç  kartı ', board: 'PCB-0042', rev: 'B', author: 'Ö. E.', notes: ' line 1 \r\n\r\n\r\n\r\n line\t2 \u0007 ' },
      { project: 'Kart A', title: 'same project again' },
      { project: 'Nothing entered', title: '   ', notes: '\n\n' },
      { project: 'p'.repeat(200), title: 't'.repeat(500), board: 'b'.repeat(500), rev: 'r'.repeat(500), author: 'a'.repeat(500), notes: 'n'.repeat(5000) },
      { project: 'Types', title: { toString: () => X }, board: [X], rev: 3, author: null },
      { title: 'calculations without a project' },
      null, 'text', 7, ['list'],
    ]);
    eq(got.map((x) => x.project).join('|'), `Kart A|${'p'.repeat(60)}|Types|`, 'duplicates, empty records and junk are dropped');
    eq(got[0].title, 'Güç kartı', 'whitespace collapsed');
    eq(got[0].notes, 'line 1\n\nline 2', 'notes keep their lines, tidied');
    for (const [k, n] of Object.entries(DETAIL_LIMITS)) eq(got[1][k].length, n, `${k} trimmed`);
    eq(Object.keys(got[0]).join(), 'project,title,board,rev,author,notes', 'shape of a record');
    eq(JSON.stringify(got[2]), JSON.stringify({ project: 'Types', title: '', board: '', rev: '3', author: '', notes: '' }), 'only text and numbers are taken');
    eq(got[3].title, 'calculations without a project');
    eq(sanitizeProjects({ project: 'x', title: 'y' }).length, 0, 'not a list');
    eq(sanitizeProjects(undefined).length, 0);
    eq(sanitizeProjects(Array.from({ length: 500 }, (_, i) => ({ project: `P${i}`, title: 'x' }))).length, 200, 'capped');
    // Extra keys of a foreign file do not travel.
    eq('evil' in sanitizeProjects([{ project: 'x', title: 'y', evil: 1, __proto__: { z: 1 } }])[0], false);
  }],

  ['report: project details are stored per project and travel with export and import', () => sandbox(() => {
    const p = `Rapor testi & ${X} #1`.slice(0, 60);
    const a = addSaved({ tool: 'trace', query: 'I=3', name: 'Rail', project: p });
    const b = addSaved({ tool: 'ntc', query: '', name: 'Free', project: '' });
    setProjectDetails(p, NO_DETAILS);
    eq(JSON.stringify(projectDetails(p)), JSON.stringify({ ...NO_DETAILS, project: p }), 'nothing stored: empty texts');

    const stored = setProjectDetails(p, { title: ' Güç  kartı ', board: 'PCB-0042', rev: 'B', author: 'Ö. E.', notes: 'İlk satır\nİkinci satır' });
    eq(stored.title, 'Güç kartı', 'sanitised on the way in');
    eq(projectDetails(p).notes, 'İlk satır\nİkinci satır');
    setProjectDetails(p, { rev: 'C' });
    eq(projectDetails(p).rev, 'C');
    eq(projectDetails(p).board, 'PCB-0042', 'a patch keeps the other fields');
    eq(listProjectDetails().filter((x) => x.project === p).length, 1, 'one record per project');
    setProjectDetails('', { author: 'Lab', notes: '' });
    setProjectDetails('Orphan project', { title: 'No calculations' });
    eq(reportDocTitle(p), `Güç kartı — ${dictionaries[getLang()].report_title} · ${dictionaries[getLang()].appName}`, 'document title: the report title first');
    eq(reportDocTitle('Orphan  project '), `No calculations — ${dictionaries[getLang()].report_title} · ${dictionaries[getLang()].appName}`);
    ok(reportDocTitle('Untitled one').startsWith('Untitled one — '), 'else the project name');

    const file = JSON.parse(exportData());
    eq(file.app, 'umay-pcb-toolkit');
    eq(file.version, 1, 'same file format, one more key');
    ok(Array.isArray(file.saved) && Array.isArray(file.favs), 'saved calculations and favourites as before');
    eq(JSON.stringify(file.projects.find((x) => x.project === p)),
      JSON.stringify({ project: p, title: 'Güç kartı', board: 'PCB-0042', rev: 'C', author: 'Ö. E.', notes: 'İlk satır\nİkinci satır' }), 'details in the file');
    eq(file.projects.find((x) => x.project === '')?.author, 'Lab', 'also for the calculations without a project');
    ok(!file.projects.some((x) => x.project === 'Orphan project'), 'details of a project without calculations stay out of the file');

    // Another device: nothing there yet.
    removeSaved(a.id);
    removeSaved(b.id);
    setProjectDetails(p, NO_DETAILS);
    ok(!listProjectDetails().some((x) => x.project === p), 'emptied details are forgotten');
    setProjectDetails('', { author: 'Local', notes: 'kept' });
    eq(importData(JSON.stringify(file)), 2, 'both calculations come back');
    eq(projectDetails(p).title, 'Güç kartı');
    eq(projectDetails(p).rev, 'C');
    eq(projectDetails('').author, 'Lab', 'a field in the file replaces the stored one');
    eq(projectDetails('').notes, 'kept', 'a field the file leaves empty keeps what is stored');

    // A file from before project details existed, and a bare list.
    const old = JSON.stringify({ app: 'umay-pcb-toolkit', version: 1, favs: [], saved: [{ id: 'report-old-1', tool: 'via', query: '', name: 'Old', project: p, at: 1 }] });
    eq(importData(old), 1, 'an old file imports');
    eq(projectDetails(p).title, 'Güç kartı', 'and leaves the details alone');
    eq(importData(JSON.stringify([{ id: 'report-old-2', tool: 'via', name: 'Bare list' }])), 1, 'a bare list imports');

    // A file someone else made.
    eq(importData(JSON.stringify({ saved: [], projects: 'nope' })), 0, 'junk details are ignored');
    eq(importData(JSON.stringify({ saved: [], projects: [{ project: '__proto__', title: X }, { project: 'constructor', notes: Q }, null, 5] })), 0);
    eq(projectDetails('__proto__').title, X, 'any name is just a name');
    eq(projectDetails('constructor').notes, Q);
    eq({}.title, undefined, 'nothing leaks into other objects');
    // (sandbox puts the saved calculations and the details back as they were.)
  })],

  ['report: every calculator renders statically — no controls, no plot, no next steps, every block open', () => inBothLanguages((lang) => {
    setPref('stepsOpen', false); // the reader keeps the steps closed: the report opens them anyway
    const problems = [];
    let n = 0;
    let withSteps = 0;
    for (const [id, mod] of mods) {
      if (mod.default.mount) continue;
      n++;
      const out = renderStatic(mod.default, new URLSearchParams());
      const where = `${lang}:${id}`;
      if (!out.ok) problems.push(`${where}: the defaults do not calculate`);
      if (!out.inputs.length || !out.inputsHtml.startsWith('<dl class="inputs-list">')) problems.push(`${where}: no inputs list`);
      if (!/class="(hero|heroes|block|kv|msg)\b/.test(out.resultHtml)) problems.push(`${where}: no result`);
      for (const what of staticProblems(out.inputsHtml + out.resultHtml + out.diagramHtml)) problems.push(`${where}: ${what}`);
      if (/class="block steps"/.test(out.resultHtml)) {
        withSteps++;
        if (!/<details open class="block steps">/.test(out.resultHtml)) problems.push(`${where}: steps not open`);
      }
      if (out.diagramHtml && !(out.diagramHtml.startsWith('<div class="diagram-wrap">') && out.diagramHtml.includes('<svg'))) problems.push(`${where}: diagram`);
      if (out.resultHtml.includes('diagram-wrap')) problems.push(`${where}: the diagram is already in the result`);
      if (/NaN|undefined/.test(textOf(out.inputsHtml + out.resultHtml))) problems.push(`${where}: NaN/undefined`);
      for (const x of out.inputs) if (!x.label || x.error) problems.push(`${where}: input ${x.key}`);
    }
    ok(n >= 40 && withSteps >= 40, `expected the standard calculators, got ${n} (${withSteps} with steps)`);
    ok(problems.length === 0, `\n${[...new Set(problems)].slice(0, 20).join('\n')}`);
  })],

  ['report: static rendering — defaults and a saved query with units', () => inBothLanguages((lang, T, D) => {
    setPref('units', 'metric');
    setPref('stepsOpen', false);
    const trace = page('trace');
    const get = (out, key) => out.inputs.find((x) => x.key === key);

    const d = renderStatic(trace, new URLSearchParams());
    eq(d.ok, true, lang);
    eq(get(d, 'I').label, D.tw_I);
    eq(`${get(d, 'I').value} ${get(d, 'I').unit}`, '2 A');
    eq(`${get(d, 'dT').value} ${get(d, 'dT').unit}`, '10 °C');
    eq(get(d, 'mode').value, D.tw_modeWidth, 'a choice shows the label of its option');
    eq(get(d, 'W'), undefined, 'the width is the answer here: its field is hidden on the page, so not listed');
    eq(get(d, 'layer'), undefined, 'hidden with IPC-2152');
    eq(get(d, 'mw'), undefined, 'an optional field left empty is not listed');
    ok(d.inputsHtml.includes(`<div><dt>${T.tw_I}</dt><dd>2 <span class="u">A</span></dd></div>`), 'label → value with unit');
    ok(d.resultHtml.includes('class="hero-value"') && d.resultHtml.includes(T.steps), 'headline value and steps');
    ok(d.resultHtml.includes('<details open class="block steps">'), 'steps open although the preference says closed');
    ok(steps([{ sym: 'a = b' }]).startsWith('<details class="block steps">'), 'the calculator page itself still follows the preference');
    ok(d.diagramHtml.startsWith('<div class="diagram-wrap">') && d.diagramHtml.includes('<svg') && !d.resultHtml.includes('diagram-wrap'), 'the drawing comes apart, for placeDiagram');

    // A saved query: another mode, other units, an option and a field the page does not have.
    const s = renderStatic(trace, 'mode=current&W=20&W_u=mil&dT=18&dT_u=F&t=2&gone=1&gone_u=mm&etch=nonsense');
    eq(s.ok, true, lang);
    eq(`${get(s, 'W').value} ${get(s, 'W').unit}`, '20 mil');
    eq(`${get(s, 'dT').value} ${get(s, 'dT').unit}`, '18 °F');
    eq(`${get(s, 't').value} ${get(s, 't').unit}`, '2 oz', 'no unit in the query: the default one');
    eq(get(s, 'mode').value, D.tw_modeCurrent);
    eq(get(s, 'I'), undefined, 'the current is the answer now');
    eq(get(s, 'gone'), undefined, 'a field the tool no longer has is ignored');
    eq(get(s, 'etch').value, D.tw_etchNone, 'an option it no longer has falls back to the default');
    ok(textOf(s.resultHtml).includes('ΔT = 10 °C'), '18 °F of rise are 10 °C in the result');
    ok(s.resultHtml !== d.resultHtml);
    // The same call with URLSearchParams.
    eq(renderStatic(trace, new URLSearchParams('mode=current&W=20&W_u=mil&dT=18&dT_u=F&t=2')).resultHtml, s.resultHtml);

    // SI notation and a number the reader can check: 3.3 V over 10 kΩ + 10 kΩ.
    const v = renderStatic(page('divider'), 'vin=3.3&r1=10k&r2=10k');
    eq(`${get(v, 'r1').value} ${get(v, 'r1').unit}`, '10k Ω', 'shown as it was typed');
    ok(textOf(v.resultHtml).includes(lang === 'tr' ? '1,65 V' : '1.65 V'), 'numbers follow the language');

    // Length defaults follow the unit preference, as on the page.
    setPref('units', 'imperial');
    const imp = renderStatic(trace, 'mode=current');
    eq(get(imp, 'W').unit, 'mil');
    setPref('units', 'metric');
    eq(get(renderStatic(trace, 'mode=current'), 'W').unit, 'mm');
  })],

  ['report: controls are taken out of a result and collapsible blocks opened', () => {
    eq(staticHtml('<div class="hero-row"><div class="hero-value">1</div><button type="button" class="copy-btn" data-copy="1 &gt; 0"><svg class="icon"><path d="M1 2"/></svg></button></div>'),
      '<div class="hero-row"><div class="hero-value">1</div></div>', 'copy button');
    eq(staticHtml('<p><a class="btn ghost" href="#/x"><span>Open</span></a> <a href="#/y">plain</a></p>'), '<p> <a href="#/y">plain</a></p>', 'button links go, text links stay');
    eq(staticHtml('<select data-fab-pref><option value="a">a</option></select><input type="text" value="x"><textarea rows="2">t</textarea>!'), '!', 'form controls');
    eq(staticHtml('<details class="block steps"><summary>s</summary></details><details class="x" open></details>'),
      '<details open class="block steps"><summary>s</summary></details><details class="x" open></details>', 'closed blocks are opened, open ones left alone');
    eq(staticHtml(undefined), '');
    eq(demoteHeadings('<div class="block"><h2>Details</h2><h3 class="x">Sub</h3></div>'), '<div class="block"><h4>Details</h4><h5 class="x">Sub</h5></div>');
    // The pages that put their own controls into the result.
    sandbox(() => {
      setPref('fab', 'none');
      const notes = renderStatic(page('fabnotes'), '');
      ok(notes.ok && !staticProblems(notes.resultHtml).length, `fabnotes: ${staticProblems(notes.resultHtml)}`);
      ok(notes.resultHtml.includes('class="formula notes"'), 'the notes block itself stays');
      for (const id of ['impedance', 'interfaces', 'via', 'padstack']) {
        const out = renderStatic(page(id), '');
        ok(out.ok && !staticProblems(out.resultHtml).length, `${id}: ${staticProblems(out.resultHtml)}`);
      }
    });
  }],

  ['report: stored values a tool cannot calculate with show its own message, never a broken page', () => inBothLanguages((lang, T, D) => {
    const get = (out, key) => out.inputs.find((x) => x.key === key);
    // Field errors: the calculator's line, and the fields marked in the list.
    const bad = renderStatic(page('trace'), `I=abc&dT=-5&bt=&t=${'9'.repeat(400)}x`);
    eq(bad.ok, false, lang);
    ok(bad.resultHtml.includes(T.inputsInvalid), 'the calculator’s own line');
    ok(!bad.resultHtml.includes('hero-value'), 'no result');
    eq(get(bad, 'I').error, D.fe_number);
    eq(get(bad, 'dT').error, D.fe_positive);
    eq(get(bad, 'bt').error, D.fe_required, 'a required field left empty is listed with its error');
    ok(bad.inputsHtml.includes(`<div class="bad"><dt>${T.tw_I}</dt><dd>abc <span class="u">A</span> <small class="field-error">${T.fe_number}</small></dd></div>`), 'marked in the list');
    ok(bad.inputsHtml.includes(`${'9'.repeat(60)}…`) && !bad.inputsHtml.includes('9'.repeat(61)), 'a very long value is cut for display');
    eq(staticProblems(bad.inputsHtml + bad.resultHtml + bad.diagramHtml).length, 0);

    // Valid fields, but the tool reports an error: its message.
    const led = renderStatic(page('led'), 'vs=1&vf=2');
    eq(led.ok, false, lang);
    ok(led.resultHtml.includes('class="msg error"') && !led.resultHtml.includes('hero-value'), 'the page’s error message');
    eq(led.inputs.some((x) => x.error), false);

    // A page that throws, a page that is not a calculator, no page.
    const quiet = console.error;
    console.error = () => {};
    try {
      const boom = renderStatic({ id: 'x', sections: [], compute: () => { throw new Error('boom'); }, render: () => '' }, '');
      eq(boom.ok, false);
      ok(boom.resultHtml.includes(T.inputsInvalid), 'a throwing page gives the same line');
      const boom2 = renderStatic({ id: 'x', sections: [{ fields: [{ key: 'a', type: 'number', label: 'current', default: 1, show: () => { throw new Error('boom'); } }] }], compute: () => ({}), render: () => '' }, '');
      eq(boom2.ok, false);
      ok(boom2.resultHtml.includes(T.inputsInvalid));
    } finally {
      console.error = quiet;
    }
    for (const notPage of [null, undefined, {}, { id: 'ipcref', mount() {} }, { compute() {}, render() {} }]) {
      const none = renderStatic(notPage, '');
      eq(none.ok, false);
      eq(none.resultHtml + none.inputsHtml + none.diagramHtml, '');
    }
  })],

  ['report: tools with their own page — power tree, voltage drop and stack-up render from their own state', () => inBothLanguages((lang, T) => {
    const item = (tool, query = '') => ({ n: 1, anchor: 'calc-x', id: 'x', tool, name: 'N', query, at: 1, href: `#/${tool}${query ? `?${query}` : ''}` });
    for (const id of ['powertree', 'dcdrop', 'stackup']) {
      const parts = reportItemParts(mods.get(id), item(id));
      const where = `${lang}:${id}`;
      ok(parts.html.includes(`<h3>${T.report_result}</h3>`) && parts.html.includes('class="hero-value"'), `${where}: result`);
      ok(/<details (open )?class="block steps"( open)?>/.test(parts.html), `${where}: steps open`);
      ok(parts.diagramHtml.startsWith('<div class="diagram-wrap">') && parts.diagramHtml.includes('<svg'), `${where}: diagram`);
      eq(staticProblems(parts.html + parts.diagramHtml).join(), '', where);
      ok(!/<h[12]\b/.test(parts.html), `${where}: block titles below the section heading`);
      ok(!parts.html.includes(T.report_ownPage), where);
    }
    // The saved query decides what is shown, and the inputs come in the page's own words.
    const pt = mods.get('powertree');
    const usb = reportItemParts(pt, item('powertree', pt.toQuery(pt.exampleState('usb'))));
    ok(usb.html !== reportItemParts(pt, item('powertree')).html, 'another example, another result');
    ok(usb.html.includes(`<h3>${T.report_inputs}</h3><ul class="report-lines"><li>`), 'power tree: inputs as lines');
    const vd = mods.get('dcdrop');
    const st = vd.exampleState('motor');
    st.els[0].name = X;
    const motor = reportItemParts(vd, item('dcdrop', vd.toQuery(st)));
    ok(motor.html.includes('class="report-lines"') && motor.html.includes('class="hero-value"'), 'voltage drop: inputs and result');
    eq(injected(motor.html + motor.diagramHtml).join(), '', 'a hostile element name');
    // A hostile or broken query never breaks the section.
    for (const id of ['powertree', 'dcdrop', 'stackup']) {
      const junk = reportItemParts(mods.get(id), item(id, `s=${encodeURIComponent(X)}&r=${encodeURIComponent(Q)}&e=${encodeURIComponent(Z)}&l=1_2_3&n=99&x`));
      ok(junk.html.includes(`<h3>${T.report_result}</h3>`), `${lang}:${id}: still a section`);
      eq(injected(junk.html + junk.diagramHtml).join(), '', `${lang}:${id}`);
    }
    // The reference page only draws when mounted: it is mounted out of the document (browser).
    eq(reportItemParts(mods.get('ipcref'), item('ipcref', 'c=2')).mount, true);
    // Any other self-mounting page, a module that did not load: a line with the link.
    const own = reportItemParts({ default: { id: 'future', mount() {} } }, item('future', 'a=1'));
    ok(own.html.includes(T.report_ownPage) && own.html.includes('<a href="#/future?a=1">'), 'own page: line and link');
    ok(reportItemParts({ default: { id: 'powertree', mount() {}, sections: [], compute() {}, render() {} } }, item('powertree')).html.includes(T.report_ownPage), 'no parser exported → the line');
    ok(reportItemParts({ default: { id: 'constructor', mount() {} } }, item('constructor')).html.includes(T.report_ownPage));
    ok(reportItemParts(null, item('trace')).html.includes(T.report_toolError), 'module not loaded');
  })],

  ['report: hostile names, titles, notes and queries are escaped everywhere', () => inBothLanguages((lang) => {
    const project = `${X} & " onmouseover="x #%`;
    const saved = sanitizeSaved([
      { id: 'h1', tool: 'trace', query: `I=${X}&dT=${Q}&W_u=${X}&${X}=1&mode=${Q}&t=${Z}`, name: `${X}${Q}${Z}`, project, value: X, at: 1e300 },
      { id: Q, tool: 'fabnotes', query: `name=${encodeURIComponent(X)}&rev=${encodeURIComponent(Q)}&z1l=${encodeURIComponent(Z)}`, name: 'n'.repeat(300), project, at: -1e300 },
      { id: 'h3', tool: 'colorcode', query: `mode=smd&code=${encodeURIComponent(Z)}`, name: Z, project, at: 5 },
      { id: 'h4', tool: X, query: '', name: 'no such tool', project },
    ]);
    const [details] = sanitizeProjects([{ project, title: `${X} ${Q} ${Z}`, board: X, rev: Q, author: Z, notes: `${X}\n${Q}\n${Z}\n${'z'.repeat(5000)}` }]);
    eq(projectKey(project), project, 'the project name itself is kept as typed');
    const model = reportModel(project, { saved, details, now: new Date(2026, 10, 28) });
    eq(model.items.length, 3, 'the entry of an unknown tool cannot open anything');
    ok(model.items.every((x) => /^calc-[\w-]{1,40}$/.test(x.anchor)), 'a hostile id is replaced');
    ok(model.items.every((x) => /^#\/(trace|fabnotes|colorcode)(\?[\w.~*%+=&()!'-]*)?$/.test(x.href)), 'links only open existing tools, queries re-encoded');
    eq(model.items[1].name.length, 80, 'names are cut');
    eq(details.notes.length, DETAIL_LIMITS.notes);

    const html = reportPageHtml(model);
    eq(injected(html).join(), '', `${lang}: page`);
    ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'), 'shown as text');
    ok(html.includes(`href="${reportHref(project).replace(/'/g, '&#39;')}"`), 'the contents link to the report itself, escaped');
    eq(injected(reportFactsHtml(model)).join(), '', `${lang}: header`);
    // A stale link with a hostile name: the empty state shows it as text too.
    eq(injected(reportPageHtml(reportModel(`${Q}${X}`, { saved: [], details: NO_DETAILS }))).join(), '', `${lang}: empty state`);

    for (const x of model.items) {
      const parts = reportItemParts(mods.get(x.tool), x);
      eq(injected(parts.html + parts.diagramHtml).join(), '', `${lang}: section ${x.tool}`);
      eq(staticProblems(parts.html + parts.diagramHtml).join(), '', `${lang}: section ${x.tool}`);
    }
    // The text fields of a tool carry the saved text into the result itself.
    const notes = renderStatic(page('fabnotes'), model.items[1].query);
    ok(notes.inputs.some((i) => i.value === X) && notes.inputsHtml.includes('&lt;img src=x'), 'the value is there, as text');
    ok(notes.resultHtml.includes('&lt;img src=x onerror=alert(1)&gt;'), 'also where the tool writes it into its result');
    // Raw, unencoded text in a number field.
    const raw = renderStatic(page('trace'), new URLSearchParams([['I', X], ['dT', Q], ['t', Z]]));
    eq(raw.ok, false);
    eq(injected(raw.inputsHtml + raw.resultHtml + raw.diagramHtml).join(), '', `${lang}: raw number text`);
    ok(raw.inputsHtml.includes('&lt;img src=x onerror=alert(1)&gt;'));
  })],

  ['report: the free-text fields of every calculator are escaped in its result', () => inBothLanguages((lang) => {
    // A text field is the one input a page writes into its result as typed.
    // Every option of the page is tried, so fields shown only in one mode are reached.
    const leaky = new Set();
    let pages = 0;
    for (const [id, mod] of mods) {
      if (mod.default.mount) continue;
      const fields = mod.default.sections.flatMap((s) => s.fields);
      const texts = fields.filter((f) => f.type === 'text');
      if (!texts.length) continue;
      pages++;
      const variants = [[], ...fields.flatMap((f) => (f.options ?? []).map((o) => [[f.key, String(o.value)]]))];
      for (const variant of variants) {
        for (const hostile of [X, Q, '" onmouseover="x']) {
          const out = renderStatic(mod.default, new URLSearchParams([...variant, ...texts.map((f) => [f.key, hostile])]));
          if (injected(out.inputsHtml).length) leaky.add(`${id} (inputs list)`);
          if (injected(out.resultHtml + out.diagramHtml).length) leaky.add(id);
        }
      }
    }
    ok(pages >= 3, `expected pages with text fields, found ${pages}`);
    // This test found src/pages/adc.js writing its free-text unit into three
    // table cells without esc(); it is fixed, and no page may do it again.
    eq([...leaky].sort().join(), '', `${lang}: pages that put raw text into their result`);
  })],

  ['report: page structure — headings in order, labelled fields, contents as in-page anchors, empty state', () => inBothLanguages((lang, T, D) => {
    const project = 'Kart A&B #2 %50 Ölçüm';
    const tools = ['trace', 'via', 'divider', 'impedance', 'ntc', 'powertree'];
    const saved = Array.from({ length: 30 }, (_, i) => ({ id: `s${i}`, tool: tools[i % tools.length], query: '', name: i % 2 ? `Calc ${i}` : D[`tool_${tools[i % tools.length]}`], project, at: 1e12 + i }));
    const model = reportModel(project, { saved, details: { ...NO_DETAILS, project, title: 'Power board', board: 'PCB-0042', rev: 'B', author: 'Ö. E.', notes: 'First\nSecond' }, now: new Date(2026, 10, 28) });
    const html = reportPageHtml(model);

    // Headings: one h1, then the contents and one h2 per calculation.
    eq(count(html, /<h1\b/g), 1, lang);
    ok(html.includes('<h1>Power board</h1>') && html.includes(`<p class="report-kicker">${T.report_title}</p>`), 'report title');
    eq(count(html, /<section class="card report-calc" id="calc-s\d+" aria-labelledby="h-calc-s\d+">/g), 30, '30 calculations');
    eq(count(html, /<h2 id="h-calc-s\d+" tabindex="-1">/g), 30);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(([, id]) => id);
    eq(new Set(ids).size, ids.length, 'ids are unique');
    eq(count(html, /<h2\b/g), 31, 'the contents heading and the calculations');
    ok(html.indexOf('<h1') < html.indexOf('<h2') && !/<h[3-6]\b/.test(html), 'in order');
    ok(html.includes(`<span class="report-num">2.</span> Calc 1 <small>${T.tool_via}</small></h2>`), 'saved name and tool name');
    ok(html.includes(`<span class="report-num">1.</span> ${T.tool_trace}</h2>`), 'a calculation named after its tool says it once');
    eq(count(html, new RegExp(`<a class="report-open" href="#/[a-z0-9]+">${T.report_open}</a>`, 'g')), 30, 'a link back to every calculator');
    ok(html.includes(T.report_savedAt.replace('{date}', '')), 'saved date');

    // Contents: a nav whose links stay on the report's own address and carry the section.
    ok(html.includes(`<nav class="card report-toc" aria-labelledby="report-toc-h">`) && html.includes(`<h2 id="report-toc-h">${T.report_toc}</h2>`), 'contents');
    const anchors = [...html.matchAll(/<li><a href="([^"]*)" data-anchor="([^"]*)">/g)];
    eq(anchors.length, 30);
    ok(anchors.every(([, href, a]) => href === '#/report?p=Kart%20A%26B%20%232%20%2550%20%C3%96l%C3%A7%C3%BCm' && html.includes(`<section class="card report-calc" id="${a}"`)), 'every entry has its section');
    ok(!/href="#(?!\/)/.test(html), 'no bare in-page hash: the router would take it for a route');
    eq(anchors.map(([, , a]) => a).join(), model.items.map((x) => x.anchor).join(), 'in the order of the saved list');

    // Header facts and the form that edits them.
    const facts = reportFactsHtml(model);
    for (const [k, val] of [['report_project', project.replace('&', '&amp;')], ['report_board', 'PCB-0042'], ['report_rev', 'B'], ['report_author', 'Ö. E.'], ['report_count', '30'], ['report_notes', 'First\nSecond']]) {
      ok(facts.includes(`<dt>${T[k]}</dt><dd>${val}</dd>`), `${lang}: ${k}`);
    }
    ok(facts.includes(lang === 'tr' ? '28 Kasım 2026' : 'November 28, 2026'), `the date in the reader's language: ${textOf(facts)}`);
    ok(!reportFactsHtml(reportModel(project, { saved, details: NO_DETAILS })).includes(`<dt>${T.report_project}</dt>`), 'the project is not repeated under a heading that already names it');
    const fields = [...html.matchAll(/<(?:input|textarea) id="([^"]+)" name="(\w+)"[^>]*maxlength="(\d+)"/g)];
    eq(fields.map(([, , name]) => name).join(), 'title,board,rev,author,notes', 'editable details');
    ok(fields.every(([, id, name, max]) => html.includes(`<label for="${id}">`) && Number(max) === DETAIL_LIMITS[name]), 'every field has its label and limit');
    ok(html.includes('value="Power board"') && html.includes('>First\nSecond</textarea>'), 'filled with the stored details');
    ok(html.includes('data-print') && html.includes(`href="#/saved"`) && html.includes(T.report_back), 'print and back');
    eq(staticProblems(html.slice(html.indexOf('<section class="card report-calc"'))).join(), '', 'no controls in the sections themselves');

    // Inside a section: Inputs and Result one level down, block titles below them.
    const parts = reportItemParts(mods.get('trace'), model.items[0]);
    ok(parts.html.includes(`<div class="report-inputs"><h3>${T.report_inputs}</h3><dl class="inputs-list">`), 'inputs');
    ok(parts.html.includes(`<div class="report-result"><h3>${T.report_result}</h3><div class="report-out">`), 'result');
    ok(!/<h[12]\b/.test(parts.html) && /<div class="block"><h4>/.test(parts.html), 'block titles are h4');

    // Empty states: a stale link, and no calculations without a project.
    const stale = reportPageHtml(reportModel('Gone & <b>', { saved, details: NO_DETAILS }));
    ok(stale.includes('<h1>Gone &amp; &lt;b&gt;</h1>') && stale.includes(T.report_empty) && stale.includes('href="#/saved"'), 'friendly empty state with the way back');
    ok(!stale.includes('data-print') && !stale.includes('report-toc') && !stale.includes('<form'), 'nothing to print or edit');
    const none = reportPageHtml(reportModel('', { saved, details: NO_DETAILS }));
    ok(none.includes(`<h1>${T.report_noProjectTitle}</h1>`) && none.includes(T.report_emptyNone), 'no calculations without a project');
    const free = reportPageHtml(reportModel('', { saved: saved.map((x) => ({ ...x, project: '' })), details: NO_DETAILS }));
    ok(free.includes(`<h1>${T.report_noProjectTitle}</h1>`) && count(free, /class="card report-calc"/g) === 30, 'the group without a project has its report');
  })],
];
