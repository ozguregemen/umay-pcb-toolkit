// KiCad rule export (src/engine/kicadrules.js, src/pages/kicadrules.js).
// The output is a file another program parses, so the tests read it the way a
// parser would: one checker for the syntax, then what each option writes, what
// each check reports, and that nothing a user types can break the file or the page.

import { eq, ok } from '../assert.js';
import {
  kicadRules, fabPreset, rulesDataUrl, num, mm,
  DEFAULTS, RANGES, TYPICAL, CLASS_DEFAULTS, VERSIONS, MANUAL, FAB_IDS, KINDS, LAYERS, MAX_CLASSES, NAME_MAX, FORBIDDEN, CONSTRAINTS, CHECK_CASES,
} from '../../src/engine/kicadrules.js';
import { FABS, fabById, traceSpaceRule, ringRule } from '../../src/engine/fabs.js';
import { registerStrings, setLang, getLang } from '../../src/i18n.js';
import { parseNumber } from '../../src/ui/calculator.js';
import page from '../../src/pages/kicadrules.js';

registerStrings(page.strings);

const DAY = '2026-11-28';

// ---- The syntax checker ----
// Only the constructs the engine is allowed to write (see its header) pass.
const LENGTH = '\\d+(?:\\.\\d+)?mm';
const CLAUSES = [
  /^\(layer (?:outer|inner|"[FB]\.Silkscreen")\)$/,
  /^\(condition "([^"\\]+)"\)$/,
  new RegExp(`^\\(constraint (?:${CONSTRAINTS.join('|')})(?: \\((?:min|opt|max) ${LENGTH}\\))+\\)$`),
];
const TERMS = [/^A\.Type == '(?:Via|Pad)'$/, /^A\.isPlated\(\)$/, /^A\.NetClass == '[^'"\\]+'$/, /^A\.hasNetclass\('[^'"\\]+'\)$/];

/** Everything that is wrong with a rules file; an empty list means KiCad's documented syntax is kept. */
function syntaxProblems(text) {
  const p = [];
  if (typeof text !== 'string' || !text.endsWith('\n')) return ['no text, or no line end at the end'];
  const lines = text.slice(0, -1).split('\n');
  if (lines[0] !== '(version 1)') p.push('the first line is not (version 1)');
  if (/[\r\t]/.test(text)) p.push('carriage return or tab');
  if (/\d,\d/.test(text)) p.push('decimal comma');
  if (/\d[eE][+-]?\d/.test(text.replace(/"[^"\n]*"/g, '').replace(/^#.*$/gm, ''))) p.push('exponent');
  if (lines.some((l) => l !== l.trimEnd())) p.push('trailing blanks');
  const code = lines.filter((l) => l.trim() !== '' && !l.trimStart().startsWith('#'));

  // Parentheses balance outside strings, and a string ends on its own line.
  let depth = 0;
  let form = [];
  const forms = [];
  for (const line of code) {
    let inside = false;
    for (const ch of line) {
      if (ch === '"') inside = !inside;
      else if (!inside && ch === '(') depth++;
      else if (!inside && ch === ')') { depth--; if (depth < 0) p.push(`too many ")": ${line}`); }
    }
    if (inside) p.push(`string not closed: ${line}`);
    form.push(line);
    if (depth === 0) { forms.push(form); form = []; }
  }
  if (depth !== 0 || form.length) p.push('parentheses do not balance');
  if (forms[0]?.join('\n') !== '(version 1)') p.push('the first form is not (version 1)');

  // Every other form is a rule: a quoted name, then layer / condition / constraint clauses in that order.
  const names = [];
  for (const f of forms.slice(1)) {
    const head = /^\(rule "([^"\\]+)"$/.exec(f[0]);
    if (!head) { p.push(`not a rule with a quoted name: ${f[0]}`); continue; }
    names.push(head[1]);
    let constraints = 0;
    let last = -1;
    f.slice(1).forEach((raw, i, all) => {
      if (!raw.startsWith('    (')) p.push(`indent: ${raw}`);
      let clause = raw.trim();
      if (i === all.length - 1) {
        if (!clause.endsWith('))')) p.push(`rule not closed: ${raw}`);
        clause = clause.slice(0, -1);
      }
      const kind = CLAUSES.findIndex((re) => re.test(clause));
      if (kind < 0) { p.push(`unknown clause: ${clause}`); return; }
      if (kind < last || (kind === last && kind !== 2)) p.push(`clause order: ${clause}`);
      last = kind;
      if (kind === 2) constraints++;
      if (kind === 1) {
        for (const term of CLAUSES[1].exec(clause)[1].split(' && ')) if (!TERMS.some((re) => re.test(term))) p.push(`condition: ${term}`);
      }
    });
    if (!constraints) p.push(`${head[1]}: no constraint`);
  }
  if (new Set(names).size !== names.length) p.push('a rule name is used twice');

  // Outside strings every number carries its unit.
  const bare = code.slice(1).join('\n').replace(/"[^"\n]*"/g, '""');
  const loose = bare.match(/(?<![\d.])\d+(?:\.\d+)?(?![\d.]|mm)/g);
  if (loose) p.push(`number without mm: ${loose.slice(0, 3).join(' ')}`);
  if (/,/.test(bare)) p.push('comma outside a string');
  return p;
}
const valid = (r, label = '') => { const p = syntaxProblems(r.text); ok(p.length === 0, `${label} ${p.slice(0, 3).join(' | ')}`); };

// ---- Engine helpers ----
const base = kicadRules({ date: DAY });
const ids = (r) => r.rules.map((x) => x.id).join();
const rule = (r, id) => r.rules.find((x) => x.id === id)?.lines.join('\n');
const check = (r, id) => r.checks.find((c) => c.id === id);
const err = (r) => (r.ok ? 'ok' : r.errors.join());
const sig = (name, more = {}) => ({ name, kind: 'signal', layer: 'any', widthMm: 0.2, clearanceMm: 0.2, ...more });
const pair = (name, more = {}) => ({ name, kind: 'diff', layer: 'any', widthMm: 0.2, clearanceMm: 0.2, gapMm: 0.2, ...more });
const FAB_RULES = 'trackOuter,trackInner,viaHole,viaDia,viaRing,padHole,padRing,holeToHole,edge';

// Characters that must not be typed into a source file are built from their code units.
const ch = (...codes) => codes.map((c) => String.fromCharCode(c)).join('');
const HOSTILE = [
  '<img src=x onerror=alert(1)>', '"><script>alert(1)</script>', "it's \"quoted\" & <b>bold</b>", 'a\nb\r\nc\td', "USB')\n(rule \"x\" (constraint clearance (min 0mm)))",
  "x' || A.Type == 'Via", 'back\\slash', 'USB*', 'D?R', 'HV,Default', '{n} {name} {row} {lim}', '$& $1 $$ %s %00 %', 'A'.repeat(5000), 'ş'.repeat(300),
  `${ch(0x202E)}evil${ch(0x200B, 0, 7)}`, ch(0xD83D), `ok${ch(0xDE00)}`, '😀'.repeat(100), '   ', '#?&=/', '# comment', '(version 2)', ') (rule', 'Güç 3V3 (ana)',
  '</pre><h1>', '-->', '&amp;&#39;', 'kr_hero', '0,15', '1e9',
];

// ---- Page helpers: field values as the form would hold them ----
const fields = page.sections.flatMap((s) => s.fields);
function inputs(set = {}) {
  const v = {};
  const u = {};
  for (const f of fields) {
    const val = set[f.key] ?? f.default;
    const raw = val === undefined || val === null ? '' : String(val);
    v[f.key] = f.type === 'number' ? parseNumber(raw, f.si) : raw;
    if (f.type === 'number') u[f.key] = f.unit ?? f.units?.[0];
  }
  return { v, u };
}
function show(set) {
  const { v, u } = inputs(set);
  const r = page.compute(v, u);
  return { r, v, html: page.render(r, v, u) };
}
function inBothLanguages(fn) {
  const before = getLang();
  try {
    for (const l of ['tr', 'en']) { setLang(l); fn(l); }
  } finally {
    setLang(before);
  }
}
const unesc = (s) => s.replace(/&(amp|lt|gt|quot|#39);/g, (m, k) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" })[k]);
const visible = (html) => html.replace(/<[^>]*>/g, ' ');
const copied = (html) => unesc(html.match(/class="btn ghost" data-copy="([^"]*)"/)[1]);
const href = (html) => html.match(/<a class="btn ghost" href="([^"]*)" download="([^"]*)"/);
const shownFile = (html) => unesc(html.match(/<pre class="formula notes">([\s\S]*?)<\/pre>/)[1]);
const checkRows = (html) => [...html.matchAll(/<li class="(pass|warn|fail)">[\s\S]*?<b>([^<]+)<\/b><small>([^<]+)<\/small>/g)];
const URL_HEAD = 'data:text/plain;charset=utf-8,';
const presetOf = (id) => fields.find((f) => f.key === 'fab').options.find((o) => o.value === id).set;

export const cases = [
  ['kicadrules: the default file — header, fabricator rules, then the net class rules, line for line', () => {
    const r = base;
    eq(r.ok, true);
    eq(r.text, `${[
      '(version 1)',
      '# Custom design rules for KiCad 10, written on 2026-11-28 by Umay PCB Toolkit.',
      '# Syntax: KiCad PCB Editor manual 10.0, "Custom design rules". All values in mm.',
      '# Fabricator minimums: IPC-2221 Level B / typical (capability data read 2026-11-25);',
      '# hole to hole and board edge values are not from that data.',
      '#   track width 0.15 mm outer / 0.15 mm inner',
      '#   via hole 0.25 mm; via diameter 0.6 mm; via annular ring 0.175 mm',
      '#   plated pad hole 0.25 mm; pad annular ring 0.18 mm',
      '#   hole to hole 0.25 mm; copper to board edge 0.3 mm',
      '#   clearance 0.15 mm outer / 0.15 mm inner: entered in Board Setup, not a rule in this file',
      '# Net class Power (power; all layers): track width 0.5 mm; clearance 0.2 mm (net class table)',
      '# Net class USB (differential pair; all layers): track width 0.3 mm; gap 0.2 mm; clearance 0.2 mm (net class table)',
      '# KiCad tries the rules from the last one to the first and uses the first that matches:',
      '# a net class rule takes the place of the fabricator rule for the nets of its class.',
      '# Clearances are entered in Board Setup: a custom clearance rule would replace the net class clearances.',
      '# Net classes and the board-wide constraints are entered in Board Setup, not in this file.',
      '',
      '# Fabricator minimums',
      '(rule "Fab: minimum track width, outer layers"',
      '    (layer outer)',
      '    (constraint track_width (min 0.15mm)))',
      '',
      '(rule "Fab: minimum track width, inner layers"',
      '    (layer inner)',
      '    (constraint track_width (min 0.15mm)))',
      '',
      '(rule "Fab: minimum via hole"',
      '    (condition "A.Type == \'Via\'")',
      '    (constraint hole_size (min 0.25mm)))',
      '',
      '(rule "Fab: minimum via diameter"',
      '    (constraint via_diameter (min 0.6mm)))',
      '',
      '(rule "Fab: minimum annular ring, vias"',
      '    (condition "A.Type == \'Via\'")',
      '    (constraint annular_width (min 0.175mm)))',
      '',
      '(rule "Fab: minimum plated hole, pads"',
      '    (condition "A.Type == \'Pad\' && A.isPlated()")',
      '    (constraint hole_size (min 0.25mm)))',
      '',
      '(rule "Fab: minimum annular ring, plated pads"',
      '    (condition "A.Type == \'Pad\' && A.isPlated()")',
      '    (constraint annular_width (min 0.18mm)))',
      '',
      '(rule "Fab: minimum hole to hole distance"',
      '    (constraint hole_to_hole (min 0.25mm)))',
      '',
      '(rule "Fab: minimum copper to board edge clearance"',
      '    (constraint edge_clearance (min 0.3mm)))',
      '',
      '# Net class Power: power; all layers',
      '(rule "Class Power: track width"',
      '    (condition "A.hasNetclass(\'Power\')")',
      '    (constraint track_width (min 0.5mm) (opt 0.5mm)))',
      '',
      '# Net class USB: differential pair; all layers',
      '(rule "Class USB: track width"',
      '    (condition "A.hasNetclass(\'USB\')")',
      '    (constraint track_width (min 0.3mm) (opt 0.3mm)))',
      '',
      '(rule "Class USB: differential pair gap"',
      '    (condition "A.hasNetclass(\'USB\')")',
      '    (constraint diff_pair_gap (min 0.2mm) (opt 0.2mm)))',
    ].join('\n')}\n`);
    valid(r, 'default');
    eq(ids(r), `${FAB_RULES},class1Width,class2Width,class2Gap`);
    eq(r.fileName, 'kicad-rules-generic.kicad_dru');
    eq(JSON.stringify(r.summary), JSON.stringify({
      count: 12, version: '10', manual: '10.0', classes: 2, pairs: 1, source: 'generic',
      fab: { id: 'generic', name: 'IPC-2221 Level B / typical', service: fabById('generic').service, accessed: fabById('generic').accessed },
      date: DAY, warnings: 0, fileName: 'kicad-rules-generic.kicad_dru',
    }));
    eq(r.checks.map((c) => `${c.id}:${c.status}`).join(), 'names:ok,width:ok,clearance:ok,gap:ok,viaRing:ok');
    // No options, undefined and null all mean "the defaults".
    const plain = kicadRules();
    eq(plain.ok, true);
    eq(kicadRules(null).text, plain.text);
    eq(kicadRules({ fab: undefined, classes: null, version: null }).text, plain.text);
    eq(kicadRules({ ...DEFAULTS }).text, plain.text);
    eq(kicadRules({ ...DEFAULTS, date: DAY }).text, r.text);
  }],

  ['kicadrules: the file is the rules — every rule in the list is in the text, in order, and nothing else is', () => {
    for (const r of [base, kicadRules({ classes: [] }), kicadRules({ header: false, version: '8', classes: [pair('A', { uncoupledMm: 3, skewMm: 0.1 }), sig('B')] })]) {
      const code = r.text.split('\n').filter((l) => l !== '' && !l.startsWith('#'));
      eq(code.join('\n'), ['(version 1)', ...r.rules.flatMap((x) => x.lines)].join('\n'));
      eq(r.summary.count, r.rules.length);
      // One rule per requirement, each with a name of its own that says what it is.
      eq(new Set(r.rules.map((x) => x.name)).size, r.rules.length);
      for (const x of r.rules) {
        ok(/^(Fab|Class [^:]+): [a-z][a-z ,]+$/.test(x.name), x.name);
        eq(x.lines[0], `(rule "${x.name}"`);
        ok(x.lines.length >= 2 && x.lines[x.lines.length - 1].endsWith('))'), x.name);
      }
      // The fabricator rules come first: KiCad uses the last rule that matches, so the class rules win.
      const groups = r.rules.map((x) => x.group);
      eq(groups.join(), [...groups].sort((a, b) => (a === 'fab' ? -1 : b === 'fab' ? 1 : a.localeCompare(b))).join());
      eq(groups[0], 'fab');
      // Comment lines begin with # in the first column; blank lines separate the rules.
      ok(r.text.split('\n').every((l) => l === '' || l.startsWith('#') || l.startsWith('(') || l.startsWith('    (')), 'line kinds');
      ok(!/\n\n\n/.test(r.text) && r.text.endsWith(')\n'), 'spacing');
    }
  }],

  ['kicadrules: every combination of the options keeps the documented syntax; the checker itself catches a broken file', () => {
    const classSets = [
      [], [sig('S')], [sig('P', { kind: 'power' })], [pair('D')], [pair('D', { uncoupledMm: 5 })], [pair('D', { skewMm: 0.1 })], [pair('D', { uncoupledMm: 5, skewMm: 0.1, minWidthMm: 0.15 })],
      [sig('S', { layer: 'outer' }), pair('D', { layer: 'inner' }), sig('P', { kind: 'power', minWidthMm: 0.2, widthMm: 1 }), pair('E', { layer: 'outer', skewMm: 0.001 })],
      [sig('Güç 3V3 (ana)'), pair('DDR4 DQS #2')],
    ];
    let n = 0;
    for (const version of VERSIONS) {
      for (const fab of FAB_IDS) {
        for (const header of [true, false]) {
          for (const classes of classSets) {
            for (const optional of [{}, { padRingMm: NaN }, { silkHeightMm: 0.8, silkLineMm: 0.12 }]) {
              const r = kicadRules({ version, fab, header, classes, date: DAY, ...(fab === 'custom' ? {} : fabPreset(fab)), ...optional });
              eq(r.ok, true, `${version} ${fab}`);
              valid(r, `${version} ${fab} ${header} ${JSON.stringify(classes)} ${JSON.stringify(optional)}`);
              n++;
            }
          }
        }
      }
    }
    eq(n, VERSIONS.length * FAB_IDS.length * 2 * classSets.length * 3);
    // The checker is not blind: each of these breaks a file that passed.
    const good = base.text;
    eq(syntaxProblems(good).length, 0);
    const broken = [
      good.replace('(version 1)\n', ''), good.replace('(version 1)', '(version 2)'), good.replace('(min 0.6mm)))', '(min 0.6mm))'), good.replace('(min 0.6mm)))', '(min 0.6mm))))'),
      good.replace('0.6mm', '0.6'), good.replace('0.6mm', '0,6mm'), good.replace('0.6mm', '6e-1mm'), good.replace('0.6mm', '0.6 mm'), good.replace('via_diameter', 'via_size'),
      good.replace('"Fab: minimum via diameter"', 'Fab: minimum via diameter'), good.replace('"Fab: minimum via diameter"', '"Fab: minimum via hole"'),
      good.replace("A.hasNetclass('USB')", "A.hasNetclass('US'B')"), good.replace("A.hasNetclass('USB')", 'A.hasNetclass("USB")'), good.replace("A.Type == 'Via'", "A.Type == 'via' || B.x"),
      good.replace('    (constraint via_diameter (min 0.6mm)))', ')'), good.replace('(layer outer)', '(layer F.Cu)'), good.replace(/\n/g, '\r\n'), good.trimEnd(),
    ];
    broken.forEach((text, i) => ok(text !== good && syntaxProblems(text).length > 0, `broken file ${i} passed the checker`));
  }],

  ['kicadrules: fabricator presets come from the app\'s own fabricator data, and the file names its source', () => {
    eq(FAB_IDS.join(), 'jlc,pcbway,eurocircuits,generic,custom');
    eq(fabPreset('custom'), null);
    eq(fabPreset('nobody'), null);
    eq(JSON.stringify(fabPreset('jlc')), JSON.stringify({
      trackOuterMm: 0.1, trackInnerMm: 0.09, clearOuterMm: 0.1, clearInnerMm: 0.09, viaHoleMm: 0.15, viaDiaMm: 0.25, viaRingMm: 0.05, padHoleMm: 0.15, padRingMm: 0.18,
    }));
    for (const fab of FABS) {
      const p = fabPreset(fab.id);
      // 1 oz copper; an unknown layer count takes the stricter 1–2 layer values of fabs.js.
      const outer = traceSpaceRule(fab, { oz: 1, inner: false });
      const inner = traceSpaceRule(fab, { oz: 1, inner: true });
      eq(`${p.trackOuterMm}/${p.clearOuterMm}/${p.trackInnerMm}/${p.clearInnerMm}`, `${outer.trace}/${outer.space}/${inner.trace}/${inner.space}`, fab.id);
      eq(`${p.viaHoleMm}/${p.padHoleMm}/${p.viaRingMm}/${p.padRingMm}`, `${fab.minHoleMm}/${fab.minHoleMm}/${ringRule(fab, 'via')}/${ringRule(fab, 'pth')}`, fab.id);
      ok(Math.abs(p.viaDiaMm - (fab.minHoleMm + 2 * fab.ring.via)) < 1e-9, `${fab.id}: via diameter = hole + two rings`);
      const r = kicadRules({ fab: fab.id, ...p, date: DAY });
      valid(r, fab.id);
      eq(rule(r, 'trackOuter'), `(rule "Fab: minimum track width, outer layers"\n    (layer outer)\n    (constraint track_width (min ${p.trackOuterMm}mm)))`, fab.id);
      eq(rule(r, 'trackInner'), `(rule "Fab: minimum track width, inner layers"\n    (layer inner)\n    (constraint track_width (min ${p.trackInnerMm}mm)))`, fab.id);
      // The clearance of the preset is not a rule: it is in the header as a value for Board Setup, and in the by-hand list.
      eq(rule(r, 'clearOuter'), undefined, fab.id);
      eq(rule(r, 'clearInner'), undefined, fab.id);
      ok(r.text.includes(`#   clearance ${p.clearOuterMm} mm outer / ${p.clearInnerMm} mm inner: entered in Board Setup, not a rule in this file\n`), `${fab.id}: clearance line`);
      eq(r.manual.find((m) => m.id === 'clearance').valueMm, Math.max(p.clearOuterMm, p.clearInnerMm), fab.id);
      ok(rule(r, 'viaHole').endsWith(`(constraint hole_size (min ${p.viaHoleMm}mm)))`) && rule(r, 'viaDia').endsWith(`(constraint via_diameter (min ${p.viaDiaMm}mm)))`), `${fab.id}: via`);
      ok(rule(r, 'viaRing').endsWith(`(constraint annular_width (min ${p.viaRingMm}mm)))`) && rule(r, 'padRing').endsWith(`(constraint annular_width (min ${p.padRingMm}mm)))`), `${fab.id}: rings`);
      // The values this preset does not hold stay the typical ones.
      ok(rule(r, 'holeToHole').endsWith(`(min ${TYPICAL.holeToHoleMm}mm)))`) && rule(r, 'edge').endsWith(`(min ${TYPICAL.edgeMm}mm)))`), `${fab.id}: typical values`);
      // Its own minimum via satisfies its own ring rule.
      eq(check(r, 'viaRing').status, 'ok', fab.id);
      // The source is named while the values are the preset's, and no longer once one is changed.
      eq(r.summary.source, fab.id);
      eq(r.fileName, `kicad-rules-${fab.id}.kicad_dru`);
      ok(r.text.includes(`# Fabricator minimums: ${fab.name} (capability data read ${fab.accessed});\n# hole to hole and board edge values are not from that data.`), `${fab.id}: source line`);
      ok(kicadRules({ fab: fab.id, ...p, silkHeightMm: 1 }).text.includes('# hole to hole, board edge and silkscreen values are not from that data.'), `${fab.id}: source line with silkscreen`);
      const edited = kicadRules({ fab: fab.id, ...p, trackOuterMm: p.trackOuterMm + 0.01, date: DAY });
      eq(edited.summary.source, 'custom', fab.id);
      eq(edited.fileName, 'kicad-rules-custom.kicad_dru');
      ok(edited.text.includes(`# Fabricator minimums: entered by hand, starting from the ${fab.name} preset.`) && !edited.text.includes('capability data read'), `${fab.id}: edited`);
      eq(kicadRules({ fab: fab.id, ...p, padRingMm: NaN }).summary.source, 'custom', `${fab.id}: a value switched off is a change`);
      // Typical values are not part of the preset: changing them leaves the source alone.
      eq(kicadRules({ fab: fab.id, ...p, edgeMm: 0.5, holeToHoleMm: 0.5, silkHeightMm: 0.8, silkLineMm: 0.1 }).summary.source, fab.id);
    }
    const own = kicadRules({ fab: 'custom', date: DAY });
    eq(own.summary.source, 'custom');
    eq(own.summary.fab, null);
    ok(own.text.includes('# Fabricator minimums: entered by hand.\n#   track width'), 'custom source line');
    // JLCPCB shows why outer and inner layers have rules of their own.
    const jlc = kicadRules({ fab: 'jlc', ...fabPreset('jlc') });
    ok(rule(jlc, 'trackOuter').includes('(min 0.1mm)') && rule(jlc, 'trackInner').includes('(min 0.09mm)') && rule(jlc, 'viaDia').includes('(min 0.25mm)'), 'JLCPCB numbers');
  }],

  ['kicadrules: the file holds no clearance constraint at all — for any version, preset or set of net classes', () => {
    // A custom clearance rule takes the place of the net class clearance of every pair it matches, and a
    // condition is tried with the two objects in both orders: an unconditional rule would lower a mains class
    // that exists only in Board Setup, a rule for class USB the clearance between a USB net and that class.
    // So clearances are entered in Board Setup and the file has none. (edge_clearance is another constraint and stays.)
    const classSets = [
      [], [sig('S')], [sig('P', { kind: 'power' })], [pair('D', { uncoupledMm: 5, skewMm: 0.1 })],
      [pair('D', { layer: 'outer' }), sig('P', { kind: 'power', layer: 'inner' }), sig('S', { layer: 'outer', minWidthMm: 0.15 }), pair('E', { layer: 'inner' })],
      [...CLASS_DEFAULTS], [sig('clearance'), pair('Clearance 2')],
    ];
    let files = 0;
    for (const version of VERSIONS) {
      for (const fab of FAB_IDS) {
        for (const classes of classSets) {
          for (const header of [true, false]) {
            for (const optional of [{}, { padRingMm: NaN }, { silkHeightMm: 1, silkLineMm: 0.15 }]) {
              const r = kicadRules({ version, fab, ...(fab === 'custom' ? {} : fabPreset(fab)), classes, header, date: DAY, ...optional });
              const where = `${version} ${fab} ${classes.map((c) => c.name).join('+')}`;
              eq(r.ok, true, where);
              // In the code lines of the file — comments and quoted strings (rule names, conditions) set aside.
              const code = r.text.split('\n').filter((l) => !l.startsWith('#')).join('\n').replace(/"[^"\n]*"/g, '""');
              ok(!/\(constraint\s+clearance\b/.test(code), `${where}: a clearance constraint`);
              ok(!/(?<![a-z_])clearance(?![a-z_])/.test(code), `${where}: the word clearance outside edge_clearance`);
              eq((code.match(/\(constraint edge_clearance \(min [\d.]+mm\)\)/g) ?? []).length, 1, `${where}: edge_clearance stays`);
              // …and in the list of rules, by constraint and by id.
              ok(r.rules.every((x) => x.lines.every((l) => !/\(constraint clearance /.test(l))), where);
              ok(r.rules.every((x) => !/clear/i.test(x.id) && !/: clearance$/.test(x.name)), where);
              files++;
            }
          }
        }
      }
    }
    eq(files, VERSIONS.length * FAB_IDS.length * classSets.length * 2 * 3);
    ok(!CONSTRAINTS.includes('clearance') && CONSTRAINTS.includes('edge_clearance'), 'the engine cannot name the constraint');
    // The syntax checker of these tests refuses a file that has one.
    ok(syntaxProblems(base.text.replace('(constraint via_diameter (min 0.6mm))', '(constraint clearance (min 0.6mm))')).length > 0, 'a clearance constraint does not pass');
    // The clearances are still required and still used: they feed the by-hand list and the checks.
    eq(err(kicadRules({ clearOuterMm: NaN })), 'kr_number');
    eq(err(kicadRules({ clearInnerMm: 0 })), 'kr_number');
    eq(err(kicadRules({ classes: [sig('A', { clearanceMm: NaN })] })), 'kr_number');
    const a = kicadRules({ clearOuterMm: 0.3, clearInnerMm: 0.25, date: DAY });
    eq(a.rules.map((x) => x.lines.join('\n')).join('\n'), base.rules.map((x) => x.lines.join('\n')).join('\n'), 'the rules do not depend on the fabricator clearance');
    eq(`${a.manual[0].id}/${a.manual[0].valueMm}`, 'clearance/0.3');
    eq(check(a, 'clearance').status, 'fail');
    eq(check(a, 'gap').status, 'fail');
    eq(a.summary.source, 'custom');
    const b = kicadRules({ classes: [sig('Power', { kind: 'power', widthMm: 0.5, clearanceMm: 1.5 }), pair('USB', { widthMm: 0.3, gapMm: 0.2, clearanceMm: 0.2 })], date: DAY });
    eq(b.rules.map((x) => x.lines.join('\n')).join('\n'), base.rules.map((x) => x.lines.join('\n')).join('\n'), 'nor on the clearance of a class');
    eq(b.manual.find((m) => m.name === 'Power').clearanceMm, 1.5, 'which goes into the net class table');
    ok(b.text.includes('# Net class Power (power; all layers): track width 0.5 mm; clearance 1.5 mm (net class table)\n'), 'and is named in the header as such');
  }],

  ['kicadrules: KiCad 8, 9 and 10 — the net class condition and the skew definition follow the manual of that version', () => {
    eq(VERSIONS.join(), '8,9,10');
    eq(VERSIONS.map((v) => MANUAL[v]).join(), '8.0,9.0,10.0');
    const classes = [sig('HV'), pair('USB', { skewMm: 0.15 })];
    const by = Object.fromEntries(VERSIONS.map((version) => [version, kicadRules({ version, classes, date: DAY })]));
    for (const version of VERSIONS) {
      const r = by[version];
      valid(r, version);
      eq(r.summary.version, version);
      ok(r.text.startsWith(`(version 1)\n# Custom design rules for KiCad ${version}, written on ${DAY} by Umay PCB Toolkit.\n# Syntax: KiCad PCB Editor manual ${MANUAL[version]}, "Custom design rules".`), `${version}: header`);
      // The header of the format is (version 1) in all three manuals.
      eq(r.text.split('\n')[0], '(version 1)');
    }
    // 8.0 has no hasNetclass(); 9.0 and 10.0 use it, because a net can carry several classes there.
    eq(rule(by[8], 'class1Width'), '(rule "Class HV: track width"\n    (condition "A.NetClass == \'HV\'")\n    (constraint track_width (min 0.2mm) (opt 0.2mm)))');
    ok(!by[8].text.includes('hasNetclass') && (by[8].text.match(/A\.NetClass == '/g) ?? []).length === 4, 'KiCad 8 conditions');
    for (const version of ['9', '10']) {
      eq(rule(by[version], 'class1Width'), '(rule "Class HV: track width"\n    (condition "A.hasNetclass(\'HV\')")\n    (constraint track_width (min 0.2mm) (opt 0.2mm)))', version);
      ok(!by[version].text.includes('A.NetClass') && (by[version].text.match(/A\.hasNetclass\('/g) ?? []).length === 4, `KiCad ${version} conditions`);
    }
    // Skew: against the longest net in 9 and 10, against the average in 8 — for two nets half the difference.
    eq(rule(by[9], 'class2Skew'), '(rule "Class USB: differential pair skew"\n    (condition "A.hasNetclass(\'USB\')")\n    (constraint skew (max 0.15mm)))');
    eq(rule(by[10], 'class2Skew'), rule(by[9], 'class2Skew'));
    eq(rule(by[8], 'class2Skew'), '(rule "Class USB: differential pair skew"\n    (condition "A.NetClass == \'USB\'")\n    (constraint skew (max 0.075mm)))');
    ok(by[8].text.includes('# KiCad 8 measures skew from the average length of the matched nets: 0.15 mm\n# between the two tracks of the pair is 0.075 mm from their average.\n(rule "Class USB: differential pair skew"'), 'the halving is explained');
    ok(!by[9].text.includes('average') && by[9].text.includes('# Skew is measured across all nets this rule matches: keep one pair per net class.\n(rule "Class USB: differential pair skew"'), 'one pair per class');
    // Nothing else differs between 9 and 10 but the two header lines; the option the manual gives no syntax for is not used.
    eq(by[9].text.split('\n').slice(3).join('\n'), by[10].text.split('\n').slice(3).join('\n'));
    for (const version of VERSIONS) ok(!by[version].text.includes('within_diff_pairs'), version);
    // A number is accepted for the version; anything else is not a version.
    eq(kicadRules({ version: 9 }).summary.version, '9');
    for (const version of ['7', '11', '', 'latest', 9.5, {}, [], true]) eq(err(kicadRules({ version })), 'kr_option', String(version));
  }],

  ['kicadrules: net class kinds — signal and power write width and clearance, a differential pair its gap as well', () => {
    eq(KINDS.join(), 'signal,power,diff');
    eq(LAYERS.join(), 'any,outer,inner');
    const r = kicadRules({ classes: [sig('S50', { widthMm: 0.35, clearanceMm: 0.3 }), sig('VBUS', { kind: 'power', widthMm: 1, clearanceMm: 0.25 }), pair('USB', { widthMm: 0.3, gapMm: 0.18, clearanceMm: 0.18 })] });
    valid(r);
    eq(ids(r), `${FAB_RULES},class1Width,class2Width,class3Width,class3Gap`);
    eq(rule(r, 'class1Width'), '(rule "Class S50: track width"\n    (condition "A.hasNetclass(\'S50\')")\n    (constraint track_width (min 0.35mm) (opt 0.35mm)))');
    // The clearance of a class is not a rule: it is in the header as a value for the net class table, and in the by-hand list.
    for (const id of ['class1Clearance', 'class2Clearance', 'class3Clearance']) eq(rule(r, id), undefined, id);
    eq(r.manual.filter((m) => m.place === 'netclass').map((m) => `${m.name}:${m.clearanceMm}`).join(), 'S50:0.3,VBUS:0.25,USB:0.18');
    eq(rule(r, 'class2Width'), '(rule "Class VBUS: track width"\n    (condition "A.hasNetclass(\'VBUS\')")\n    (constraint track_width (min 1mm) (opt 1mm)))');
    eq(kicadRules({ classes: [sig('VBUS', { clearanceMm: 0.25 })] }).text.split('\n').filter((l) => l.includes('0.25 mm (net class table)')).length, 1);
    eq(rule(r, 'class3Gap'), '(rule "Class USB: differential pair gap"\n    (condition "A.hasNetclass(\'USB\')")\n    (constraint diff_pair_gap (min 0.18mm) (opt 0.18mm)))');
    ok(r.text.includes('# Net class S50: signal; all layers\n') && r.text.includes('# Net class VBUS: power; all layers\n') && r.text.includes('# Net class USB: differential pair; all layers\n'), 'section comments');
    eq(`${r.summary.classes}/${r.summary.pairs}`, '3/1');
    // The minimum equals the width unless a separate minimum is given.
    const neck = kicadRules({ classes: [sig('VBUS', { kind: 'power', widthMm: 1, minWidthMm: 0.4 })] });
    eq(rule(neck, 'class1Width'), '(rule "Class VBUS: track width"\n    (condition "A.hasNetclass(\'VBUS\')")\n    (constraint track_width (min 0.4mm) (opt 1mm)))');
    ok(neck.text.includes('# Net class VBUS (power; all layers): track width 1 mm; minimum 0.4 mm; clearance 0.2 mm (net class table)\n'), 'header line of the class');
    for (const empty of [undefined, null, NaN, '', false]) eq(rule(kicadRules({ classes: [sig('VBUS', { minWidthMm: empty })] }), 'class1Width').split('\n')[2], '    (constraint track_width (min 0.2mm) (opt 0.2mm)))', String(empty));
    eq(err(kicadRules({ classes: [sig('A', { widthMm: 0.2, minWidthMm: 0.3 })] })), 'kr_minWidth');
    eq(kicadRules({ classes: [sig('A', { widthMm: 0.2, minWidthMm: 0.3 })] }).invalid.join(), 'classes[0].minWidthMm');
    eq(kicadRules({ classes: [sig('A', { widthMm: 0.2, minWidthMm: 0.2 })] }).ok, true);
    // Layers: a class can be held to the outer or the inner layers; length rules of a pair are never tied to a layer.
    for (const layer of ['outer', 'inner']) {
      const x = kicadRules({ classes: [pair('D', { layer, uncoupledMm: 4, skewMm: 0.2 })] });
      valid(x, layer);
      for (const id of ['class1Width', 'class1Gap']) eq(rule(x, id).split('\n')[1], `    (layer ${layer})`, `${layer} ${id}`);
      for (const id of ['class1Uncoupled', 'class1Skew']) ok(!rule(x, id).includes('(layer'), `${layer} ${id}`);
      ok(x.text.includes(`# Net class D: differential pair; ${layer} layers\n`), layer);
    }
    ok(!kicadRules({ classes: [pair('D')] }).rules.filter((x) => x.group === 'class1').some((x) => x.lines.join().includes('(layer')), 'all layers: no layer clause');
    // The pair fields of a class that is not a pair are not looked at.
    eq(kicadRules({ classes: [sig('S', { gapMm: NaN, uncoupledMm: -1, skewMm: 'x' })] }).text, kicadRules({ classes: [sig('S')] }).text);
    // No more than four classes are taken.
    eq(MAX_CLASSES, 4);
    const many = ['A', 'B', 'C', 'D', 'E', 'F'].map((n) => sig(n));
    eq(kicadRules({ classes: many }).text, kicadRules({ classes: many.slice(0, 4) }).text);
    eq(kicadRules({ classes: many }).summary.classes, 4);
    // The example classes are valid ones.
    eq(CLASS_DEFAULTS.length, 4);
    valid(kicadRules({ classes: [...CLASS_DEFAULTS] }));
    eq(kicadRules({ classes: [...CLASS_DEFAULTS] }).summary.warnings, 0);
    eq(CLASS_DEFAULTS.slice(0, 2).map((c) => `${c.name}:${c.kind}:${c.widthMm}:${c.gapMm ?? ''}`).join(), 'Power:power:0.5:,USB:diff:0.3:0.2');
  }],

  ['kicadrules: optional pair fields — uncoupled length and skew are written only when given', () => {
    const none = kicadRules({ classes: [pair('USB')] });
    eq(ids(none), `${FAB_RULES},class1Width,class1Gap`);
    ok(!/uncoupled|skew/i.test(none.text), 'nothing about what was not asked');
    const unc = kicadRules({ classes: [pair('USB', { uncoupledMm: 5 })] });
    eq(ids(unc), `${FAB_RULES},class1Width,class1Gap,class1Uncoupled`);
    eq(rule(unc, 'class1Uncoupled'), '(rule "Class USB: differential pair uncoupled length"\n    (condition "A.hasNetclass(\'USB\')")\n    (constraint diff_pair_uncoupled (max 5mm)))');
    const skew = kicadRules({ classes: [pair('USB', { skewMm: 0.1 })] });
    eq(ids(skew), `${FAB_RULES},class1Width,class1Gap,class1Skew`);
    eq(rule(skew, 'class1Skew'), '(rule "Class USB: differential pair skew"\n    (condition "A.hasNetclass(\'USB\')")\n    (constraint skew (max 0.1mm)))');
    const both = kicadRules({ classes: [pair('USB', { uncoupledMm: 2.5, skewMm: 0.05 })], date: DAY });
    eq(ids(both), `${FAB_RULES},class1Width,class1Gap,class1Uncoupled,class1Skew`);
    ok(both.text.includes('# Net class USB (differential pair; all layers): track width 0.2 mm; gap 0.2 mm; uncoupled 2.5 mm; skew 0.05 mm; clearance 0.2 mm (net class table)\n'), 'header line');
    valid(both);
    for (const empty of [undefined, null, NaN, '', false]) eq(kicadRules({ classes: [pair('USB', { uncoupledMm: empty, skewMm: empty })] }).text, none.text, String(empty));
    // The gap itself is required for a pair; an optional value that is given has to be a valid one.
    for (const gapMm of [undefined, null, NaN, '', 0, -1, 1e9, '0.2']) eq(err(kicadRules({ classes: [pair('USB', { gapMm })] })), 'kr_number', String(gapMm));
    for (const x of [0, -1, 1e9, '5', Infinity, {}]) {
      eq(err(kicadRules({ classes: [pair('USB', { uncoupledMm: x })] })), 'kr_number', `uncoupled ${String(x)}`);
      eq(err(kicadRules({ classes: [pair('USB', { skewMm: x })] })), 'kr_number', `skew ${String(x)}`);
    }
    eq(kicadRules({ classes: [pair('USB', { skewMm: -1 })] }).invalid.join(), 'classes[0].skewMm');
  }],

  ['kicadrules: optional fabricator fields — pad ring and silkscreen text are left out when empty', () => {
    // The silkscreen values are off unless given: the default file has no silkscreen rule.
    ok(!/silkscreen|Silkscreen|text_/.test(base.text) && DEFAULTS.silkHeightMm === null && DEFAULTS.silkLineMm === null, 'no silkscreen rule by default');
    eq(kicadRules({ silkHeightMm: undefined, silkLineMm: null }).text, kicadRules().text);
    for (const empty of [NaN, '', false]) {
      const r = kicadRules({ padRingMm: empty, silkHeightMm: empty, silkLineMm: empty, date: DAY });
      eq(r.ok, true, String(empty));
      eq(ids(r).split(',').slice(0, 8).join(), 'trackOuter,trackInner,viaHole,viaDia,viaRing,padHole,holeToHole,edge', String(empty));
      ok(!/silkscreen|Silkscreen|text_|pad annular ring|plated pads/.test(r.text), `${String(empty)}: nothing about them in the file`);
      eq(r.manual.filter((m) => m.place === 'constraints').map((m) => m.id).join(), 'clearance,track,ring,viaDia,hole,holeToHole,edge', String(empty));
      valid(r);
    }
    // One of the two silkscreen values is enough for the two rules (front and back).
    const height = kicadRules({ silkLineMm: NaN, silkHeightMm: 0.8, date: DAY });
    eq(rule(height, 'silkFront'), '(rule "Fab: minimum silkscreen text, front"\n    (layer "F.Silkscreen")\n    (constraint text_height (min 0.8mm)))');
    eq(rule(height, 'silkBack'), '(rule "Fab: minimum silkscreen text, back"\n    (layer "B.Silkscreen")\n    (constraint text_height (min 0.8mm)))');
    ok(height.text.includes('#   silkscreen text: height 0.8 mm\n'), 'header');
    const line = kicadRules({ silkHeightMm: '', silkLineMm: 0.12 });
    eq(rule(line, 'silkFront'), '(rule "Fab: minimum silkscreen text, front"\n    (layer "F.Silkscreen")\n    (constraint text_thickness (min 0.12mm)))');
    valid(height);
    valid(line);
    // Both values together: two constraints in each of the two rules, after the other fabricator rules.
    const both = kicadRules({ silkHeightMm: TYPICAL.silkHeightMm, silkLineMm: TYPICAL.silkLineMm, date: DAY });
    eq(ids(both).split(',').slice(0, 11).join(), `${FAB_RULES},silkFront,silkBack`);
    eq(rule(both, 'silkBack'), '(rule "Fab: minimum silkscreen text, back"\n    (layer "B.Silkscreen")\n    (constraint text_height (min 1mm))\n    (constraint text_thickness (min 0.15mm)))');
    ok(both.text.includes('#   silkscreen text: height 1 mm; line thickness 0.15 mm\n'), 'header of both');
    eq(both.manual.filter((m) => m.place === 'constraints').map((m) => m.id).join(), 'clearance,track,ring,viaDia,hole,holeToHole,edge,silkHeight,silkLine');
    valid(both);
    // Left out (undefined or null) means the default, as for every option.
    eq(kicadRules({ padRingMm: undefined, silkHeightMm: null }).text, kicadRules().text);
    eq(rule(kicadRules({ padRingMm: 0.2 }), 'padRing'), '(rule "Fab: minimum annular ring, plated pads"\n    (condition "A.Type == \'Pad\' && A.isPlated()")\n    (constraint annular_width (min 0.2mm)))');
    // An optional value that is given has to be valid.
    for (const key of ['padRingMm', 'silkHeightMm', 'silkLineMm']) {
      for (const x of [0, -1, 1e6, '1', Infinity]) {
        const r = kicadRules({ [key]: x });
        eq(err(r), 'kr_number', `${key} ${String(x)}`);
        eq(r.invalid.join(), key);
      }
    }
    // The typical values are the ones the page labels as typical.
    eq(JSON.stringify(TYPICAL), '{"holeToHoleMm":0.25,"edgeMm":0.3,"silkHeightMm":1,"silkLineMm":0.15}');
    eq(`${DEFAULTS.holeToHoleMm}/${DEFAULTS.edgeMm}`, `${TYPICAL.holeToHoleMm}/${TYPICAL.edgeMm}`, 'the two typical values that are defaults');
  }],

  ['kicadrules: header comment — on or off, with the date when it is a date', () => {
    const off = kicadRules({ header: false, date: DAY });
    eq(off.text.split('\n').slice(0, 4).join('|'), '(version 1)||# Fabricator minimums|(rule "Fab: minimum track width, outer layers"');
    ok(!off.text.includes('Umay') && !off.text.includes(DAY) && !off.text.includes('KiCad tries'), 'no header');
    valid(off);
    // The rules are the same with and without the header.
    eq(off.rules.map((x) => x.lines.join('\n')).join('\n'), base.rules.map((x) => x.lines.join('\n')).join('\n'));
    // The comment block sits between (version 1) and the first rule and is comment lines only.
    const head = base.text.split('\n\n')[0].split('\n');
    eq(head[0], '(version 1)');
    ok(head.length > 8 && head.slice(1).every((l) => l.startsWith('# ') && l.length <= 120), 'comment lines');
    ok(head.some((l) => l.includes('from the last one to the first')), 'the evaluation order is explained');
    ok(head.includes('# Clearances are entered in Board Setup: a custom clearance rule would replace the net class clearances.'), 'why no clearance is a rule');
    ok(head.includes('#   clearance 0.15 mm outer / 0.15 mm inner: entered in Board Setup, not a rule in this file'), 'the fabricator clearance as a value');
    eq(head.filter((l) => l.endsWith('(net class table)')).length, 2, 'the clearance of each class, marked');
    ok(!/has no rule here|checked against the fabricator rules/.test(base.text), 'nothing left of the old warning');
    // Without a date, or with something that is not one, the date is left out — never written as typed.
    for (const date of [undefined, null, '', '28.11.2026', '2026-11-28T10:00', '2026-11-28\n(rule "x")', 20261128, new Date(0), {}]) {
      const r = kicadRules({ date });
      eq(r.ok, true, String(date));
      eq(r.text.split('\n')[1], '# Custom design rules for KiCad 10 by Umay PCB Toolkit.', String(date));
      eq(r.summary.date, '');
      valid(r);
    }
    for (const header of ['yes', 1, 0, 'true', {}]) eq(err(kicadRules({ header })), 'kr_option', String(header));
  }],

  ['kicadrules: numbers in the file — dot decimal, the unit attached, no trailing zeros, no exponent', () => {
    const table = [[0.15, '0.15'], [0.1 + 0.2, '0.3'], [7 * 0.0254, '0.1778'], [1, '1'], [10, '10'], [100.5, '100.5'], [1000, '1000'], [0.001, '0.001'], [0.0005, '0.0005'],
      [0.000001, '0.000001'], [0.30000000000000004, '0.3'], [0.1234567, '0.123457'], [2.5, '2.5'], [0.09, '0.09'], [20, '20']];
    for (const [x, want] of table) {
      eq(num(x), want, String(x));
      eq(mm(x), `${want}mm`, String(x));
      ok(/^\d+(\.\d*[1-9])?$/.test(num(x)), `${num(x)}: plain decimal`);
    }
    // Values that are awkward as floats arrive in the file as typed.
    const r = kicadRules({ trackOuterMm: 0.1 + 0.2, trackInnerMm: 7 * 0.0254, clearOuterMm: 0.127, clearInnerMm: 0.0889, edgeMm: 10, classes: [pair('D', { widthMm: 0.1016, gapMm: 0.2032, skewMm: 0.001 })], version: '8' });
    eq(r.ok, true);
    ok(rule(r, 'trackOuter').includes('(min 0.3mm)') && rule(r, 'trackInner').includes('(min 0.1778mm)') && r.text.includes('#   clearance 0.127 mm outer / 0.0889 mm inner:'), 'floats');
    ok(rule(r, 'edge').includes('(min 10mm)') && rule(r, 'class1Gap').includes('(min 0.2032mm) (opt 0.2032mm)'), 'more floats');
    ok(rule(r, 'class1Skew').includes('(max 0.0005mm)'), 'half of the smallest skew');
    valid(r);
    // The whole range of every number, at both ends, stays plain.
    const low = Object.fromEntries(Object.keys(DEFAULTS).filter((k) => RANGES[k]).map((k) => [k, RANGES[k][0]]));
    const high = Object.fromEntries(Object.keys(DEFAULTS).filter((k) => RANGES[k]).map((k) => [k, RANGES[k][1]]));
    const cls = (i) => [pair('D', { widthMm: RANGES.widthMm[i], minWidthMm: RANGES.minWidthMm[0], clearanceMm: RANGES.clearanceMm[i], gapMm: RANGES.gapMm[i], uncoupledMm: RANGES.uncoupledMm[i], skewMm: RANGES.skewMm[i] })];
    for (const version of VERSIONS) {
      valid(kicadRules({ ...low, viaDiaMm: 0.1, classes: cls(0), version }), `lowest ${version}`);
      valid(kicadRules({ ...high, classes: cls(1), version }), `highest ${version}`);
    }
    eq(kicadRules({ ...low, viaDiaMm: 0.1, classes: cls(0) }).ok, true);
    eq(kicadRules({ ...high, classes: cls(1) }).ok, true);
  }],

  ['kicadrules: check — a net class narrower than the fabricator minimum for its layers', () => {
    const fab = { trackOuterMm: 0.1, trackInnerMm: 0.2 };
    const width = (c) => check(kicadRules({ ...fab, classes: [c] }), 'width');
    eq(width(sig('A', { layer: 'outer', widthMm: 0.1 })).status, 'ok');
    eq(width(sig('A', { layer: 'outer', widthMm: 0.099 })).status, 'fail');
    eq(JSON.stringify(width(sig('A', { layer: 'outer', widthMm: 0.099 })).vars), '{"count":1,"rows":[{"name":"A","layer":"outer","valueMm":0.099,"limitMm":0.1}]}');
    eq(width(sig('A', { layer: 'inner', widthMm: 0.2 })).status, 'ok');
    eq(width(sig('A', { layer: 'inner', widthMm: 0.19 })).status, 'fail');
    eq(width(sig('A', { layer: 'inner', widthMm: 0.19 })).vars.rows[0].limitMm, 0.2);
    // On all layers the track has to be buildable on both: the larger minimum counts.
    eq(width(sig('A', { layer: 'any', widthMm: 0.2 })).status, 'ok');
    eq(width(sig('A', { layer: 'any', widthMm: 0.15 })).status, 'fail');
    eq(width(sig('A', { layer: 'any', widthMm: 0.15 })).vars.rows[0].limitMm, 0.2);
    // The separate minimum is what DRC lets through, so it is what is compared.
    eq(width(sig('A', { layer: 'outer', widthMm: 0.5, minWidthMm: 0.09 })).status, 'fail');
    eq(width(sig('A', { layer: 'outer', widthMm: 0.5, minWidthMm: 0.09 })).vars.rows[0].valueMm, 0.09);
    eq(width(sig('A', { layer: 'outer', widthMm: 0.5, minWidthMm: 0.1 })).status, 'ok');
    // Equal within float noise is equal.
    eq(check(kicadRules({ trackOuterMm: 0.1 + 0.2, trackInnerMm: 0.1, classes: [sig('A', { layer: 'outer', widthMm: 0.3 })] }), 'width').status, 'ok');
    // Only the offenders are listed; the file is written all the same.
    const mixed = kicadRules({ ...fab, classes: [sig('A', { widthMm: 0.5 }), sig('B', { widthMm: 0.1 }), pair('C', { widthMm: 0.12, layer: 'outer' }), pair('D', { widthMm: 0.05, layer: 'inner' })] });
    eq(mixed.ok, true);
    eq(check(mixed, 'width').vars.rows.map((x) => `${x.name}:${x.valueMm}<${x.limitMm}`).join(), 'B:0.1<0.2,D:0.05<0.2');
    eq(check(mixed, 'width').vars.count, 4);
    ok(mixed.summary.warnings >= 1 && rule(mixed, 'class2Width').includes('(min 0.1mm)'), 'reported, not corrected');
    valid(mixed);
    // No classes: nothing to compare, so no such check.
    eq(check(kicadRules({ classes: [] }), 'width'), undefined);
  }],

  ['kicadrules: check — a net class clearance below the minimum clearance of Board Setup (the larger fabricator value)', () => {
    // Board Setup holds one minimum clearance for all layers, and it is a floor under every net class:
    // the check uses that value for every class, whatever layers the class is set to, as KiCad will.
    for (const fab of [{ clearOuterMm: 0.2, clearInnerMm: 0.1 }, { clearOuterMm: 0.1, clearInnerMm: 0.2 }, { clearOuterMm: 0.2, clearInnerMm: 0.2 }]) {
      const clearance = (c) => check(kicadRules({ ...fab, classes: [c] }), 'clearance');
      for (const layer of LAYERS) {
        const where = `${JSON.stringify(fab)} ${layer}`;
        eq(clearance(sig('A', { layer, clearanceMm: 0.2 })).status, 'ok', where);
        eq(clearance(sig('A', { layer, clearanceMm: 0.25 })).status, 'ok', where);
        eq(clearance(sig('A', { layer, clearanceMm: 0.19 })).status, 'fail', where);
        eq(clearance(sig('A', { layer, clearanceMm: 0.1 })).status, 'fail', `${where}: the smaller fabricator value is not the limit`);
        eq(JSON.stringify(clearance(sig('A', { layer, clearanceMm: 0.19 })).vars), '{"count":1,"floorMm":0.2,"rows":[{"name":"A","valueMm":0.19,"limitMm":0.2}]}', where);
        // The floor of the check is the value the by-hand list gives for Board Setup.
        const r = kicadRules({ ...fab, classes: [sig('A', { layer })] });
        eq(check(r, 'clearance').vars.floorMm, r.manual.find((m) => m.id === 'clearance').valueMm, where);
      }
    }
    // Equal within float noise is equal.
    eq(check(kicadRules({ clearOuterMm: 0.1 + 0.2, clearInnerMm: 0.1, classes: [sig('A', { clearanceMm: 0.3 })] }), 'clearance').status, 'ok');
    // Only the offenders are listed; pairs are classes too.
    const mixed = kicadRules({ clearOuterMm: 0.15, clearInnerMm: 0.2, classes: [sig('A', { clearanceMm: 0.3 }), sig('B', { clearanceMm: 0.15, layer: 'outer' }), pair('C', { clearanceMm: 0.1, gapMm: 0.3 })] });
    eq(check(mixed, 'clearance').vars.rows.map((x) => `${x.name}:${x.valueMm}<${x.limitMm}`).join(), 'B:0.15<0.2,C:0.1<0.2');
    eq(check(mixed, 'clearance').vars.count, 3);
    eq(mixed.ok, true);
    eq(check(kicadRules({ classes: [] }), 'clearance'), undefined);
    // Width and clearance are separate checks.
    const r = kicadRules({ clearOuterMm: 0.2, clearInnerMm: 0.1, classes: [sig('A', { layer: 'outer', clearanceMm: 0.1 })] });
    eq(r.checks.map((c) => `${c.id}:${c.status}`).join(), 'names:ok,width:ok,clearance:fail,viaRing:ok');
    eq(r.summary.warnings, 1);
  }],

  ['kicadrules: check — a pair gap below the minimum clearance of Board Setup or below the clearance of its own class', () => {
    const fab = { clearOuterMm: 0.1, clearInnerMm: 0.15 }; // the floor is 0.15 on every layer
    const gap = (c) => check(kicadRules({ ...fab, classes: [c] }), 'gap');
    for (const layer of LAYERS) {
      eq(gap(pair('D', { layer, clearanceMm: 0.15, gapMm: 0.15 })).status, 'ok', layer);
      eq(gap(pair('D', { layer, clearanceMm: 0.15, gapMm: 0.14 })).status, 'fail', layer);
      eq(JSON.stringify(gap(pair('D', { layer, clearanceMm: 0.15, gapMm: 0.14 })).vars), '{"count":1,"floorMm":0.15,"rows":[{"name":"D","valueMm":0.14,"limitMm":0.15,"by":"fab"}]}', layer);
      // A class clearance below the floor does not lower the limit of the gap (the clearance check reports the class).
      eq(gap(pair('D', { layer, clearanceMm: 0.1, gapMm: 0.12 })).vars.rows[0].limitMm, 0.15, layer);
      eq(gap(pair('D', { layer, clearanceMm: 0.1, gapMm: 0.12 })).vars.rows[0].by, 'fab', layer);
      // The two tracks of the pair are different nets: the class's own clearance applies between them.
      eq(gap(pair('D', { layer, clearanceMm: 0.2, gapMm: 0.2 })).status, 'ok', layer);
      eq(gap(pair('D', { layer, clearanceMm: 0.2, gapMm: 0.19 })).status, 'fail', layer);
      eq(JSON.stringify(gap(pair('D', { layer, clearanceMm: 0.2, gapMm: 0.19 })).vars.rows), '[{"name":"D","valueMm":0.19,"limitMm":0.2,"by":"class"}]', layer);
      eq(gap(pair('D', { layer, clearanceMm: 0.2, gapMm: 0.3 })).status, 'ok', layer);
    }
    // Classes that are not pairs have no gap; without a pair there is no such check.
    eq(check(kicadRules({ classes: [sig('A'), sig('B', { kind: 'power' })] }), 'gap'), undefined);
    const mixed = kicadRules({ ...fab, classes: [sig('A'), pair('D', { gapMm: 0.1 }), pair('E', { gapMm: 0.25 })] });
    eq(check(mixed, 'gap').vars.count, 2);
    eq(check(mixed, 'gap').vars.rows.map((x) => x.name).join(), 'D');
    eq(check(base, 'gap').status, 'ok');
  }],

  ['kicadrules: check — a via diameter that leaves less than the minimum ring around the minimum hole', () => {
    const ring = (o) => check(kicadRules({ viaHoleMm: 0.3, viaRingMm: 0.15, ...o }), 'viaRing');
    eq(ring({ viaDiaMm: 0.6 }).status, 'ok');
    eq(ring({ viaDiaMm: 0.7 }).status, 'ok');
    eq(ring({ viaDiaMm: 0.59 }).status, 'warn');
    const v = ring({ viaDiaMm: 0.5 }).vars;
    ok(Math.abs(v.ringMm - 0.1) < 1e-12 && v.limitMm === 0.15 && v.holeMm === 0.3 && v.diaMm === 0.5 && Math.abs(v.needMm - 0.6) < 1e-12, JSON.stringify(v));
    // It is there with and without net classes, and the file is written all the same.
    const r = kicadRules({ viaHoleMm: 0.3, viaRingMm: 0.15, viaDiaMm: 0.5, classes: [] });
    eq(r.checks.map((c) => `${c.id}:${c.status}`).join(), 'viaRing:warn');
    eq(r.summary.warnings, 1);
    valid(r);
    // A via no wider than its hole is not a via: an error, not a file.
    for (const viaDiaMm of [0.3, 0.25, 0.1]) {
      const bad = kicadRules({ viaHoleMm: 0.3, viaDiaMm });
      eq(err(bad), 'kr_viaDia', String(viaDiaMm));
      eq(bad.invalid.join(), 'viaDiaMm');
      eq(bad.text, '');
    }
    eq(JSON.stringify(CHECK_CASES), '{"names":["ok","fail"],"width":["ok","fail"],"clearance":["ok","fail"],"gap":["ok","fail"],"viaRing":["ok","warn"]}');
  }],

  ['kicadrules: net class names — empty, repeated or impossible to quote: no file, and the check says which class', () => {
    const names = (...list) => kicadRules({ classes: list.map((n) => sig(n)) });
    const problems = (r) => check(r, 'names').vars.rows.map((x) => `${x.row}:${x.problem}`).join();
    eq(check(names('A', 'B'), 'names').status, 'ok');
    eq(JSON.stringify(check(names('A', 'B'), 'names').vars), '{"count":2,"rows":[]}');
    // Empty.
    for (const empty of ['', '   ', '\n\t', undefined, null, {}, [], 42n, () => 'x', ch(0x200B)]) {
      const r = names(empty);
      eq(err(r), 'kr_names', String(empty));
      eq(problems(r), '1:empty');
      eq(r.invalid.join(), 'classes[0].name');
      eq(`${r.text}|${r.rules.length}|${r.manual.length}|${r.fileName}`, '|0|0|', 'nothing is written');
      eq(r.checks.length, 1);
    }
    eq(names(7).ok, true, 'a number is a name');
    // Repeated, also when only the case differs.
    eq(problems(names('USB', 'USB')), '2:duplicate');
    eq(problems(names('USB', 'usb')), '2:duplicate');
    eq(problems(names('USB', ' USB ')), '2:duplicate');
    eq(problems(names('A', 'B', 'a', 'b')), '3:duplicate,4:duplicate');
    eq(names('USB', 'USB2').ok, true);
    // Characters the rule language cannot carry are refused, not escaped: it has no escape.
    for (const bad of ['a"b', "a'b", 'a\\b', 'USB*', 'D?R', 'HV,Default', '"', "'", "x') || A.Type == 'Via", 'USB"\n(rule "x" (constraint clearance (min 0mm)))']) {
      ok(FORBIDDEN.test(bad), bad);
      const r = names('OK', bad);
      eq(err(r), 'kr_names', bad);
      eq(problems(r), '2:chars', bad);
      eq(r.text, '', bad);
      eq(check(r, 'names').status, 'fail');
    }
    eq(problems(names('', 'a"b', 'A', 'a')), '1:empty,2:chars,4:duplicate');
    // Everything else is a name: blanks, brackets, digits, other alphabets — written as typed inside the quotes.
    for (const fine of ['Power 3V3', 'DDR4 (DQ)', 'Güç', '高速', 'A/B', 'A+B-C_D', '# hash', '(version 2)', ') (rule', 'A.Type == B', '100%', '<b>&amp;</b>', '{n}', '$&']) {
      ok(!FORBIDDEN.test(fine), fine);
      const r = names(fine);
      eq(r.ok, true, fine);
      valid(r, fine);
      ok(r.text.includes(`(rule "Class ${fine}: track width"\n    (condition "A.hasNetclass('${fine}')")`), fine);
      eq(r.manual.find((m) => m.place === 'netclass').name, fine);
    }
    // Line breaks and invisible characters never reach the file; a long name is cut.
    const lines = names('a\nb\r\nc\td');
    eq(lines.ok, true);
    ok(lines.text.includes("A.hasNetclass('a b c d')"), 'one line');
    valid(lines);
    eq(NAME_MAX, 40);
    const long = names('N'.repeat(500));
    ok(long.text.includes(`A.hasNetclass('${'N'.repeat(40)}')`) && !long.text.includes('N'.repeat(41)), 'cut at 40 characters');
    valid(long);
  }],

  ['kicadrules: hostile and absurd input never throws and never gives a broken file', () => {
    // Options that are not options.
    for (const options of [undefined, null, 0, 5, 'x', true, [], () => 1, new Date(), Symbol.iterator]) {
      const r = kicadRules(options);
      eq(r.ok, true, String(options));
      valid(r);
    }
    const thrower = {};
    for (const k of Object.keys(DEFAULTS)) Object.defineProperty(thrower, k, { get() { throw new Error('no'); }, enumerable: true });
    eq(kicadRules(thrower).text, kicadRules().text);
    const row = {};
    for (const k of ['name', 'kind', 'widthMm']) Object.defineProperty(row, k, { get() { throw new Error('no'); }, enumerable: true });
    eq(kicadRules({ classes: [row] }).ok, false);
    // Every required number, with every kind of nonsense: a message and no file.
    const required = ['trackOuterMm', 'trackInnerMm', 'clearOuterMm', 'clearInnerMm', 'viaHoleMm', 'viaDiaMm', 'viaRingMm', 'padHoleMm', 'holeToHoleMm', 'edgeMm'];
    for (const key of required) {
      for (const x of [NaN, 0, -1, 1e9, Infinity, -Infinity, '0.2', '', false, true, {}, [], 5n]) {
        let r;
        try { r = kicadRules({ [key]: x }); } catch (e) { ok(false, `${key}=${String(x)} threw ${e.message}`); }
        eq(r.ok, false, `${key}=${String(x)}`);
        ok(r.errors.includes('kr_number') && r.invalid.includes(key), `${key}=${String(x)}: ${r.errors.join()}`);
        eq(`${r.text}|${r.rules.length}|${r.manual.length}|${r.fileName}|${r.summary}`, '|0|0||null');
      }
      eq(`${RANGES[key][0] > 0}/${RANGES[key][1] <= 20}`, 'true/true', key);
    }
    // Net classes that are not net classes.
    eq(err(kicadRules({ classes: 'Power' })), 'kr_option');
    eq(err(kicadRules({ classes: { 0: sig('A'), length: 1 } })), 'kr_option');
    for (const c of [null, undefined, 5, 'USB', [], () => 1]) {
      const r = kicadRules({ classes: [c] });
      eq(r.ok, false, String(c));
      ok(r.errors.includes('kr_option') && r.errors.includes('kr_number') && r.errors.includes('kr_names'), `${String(c)}: ${r.errors.join()}`);
    }
    eq(err(kicadRules({ classes: [sig('A', { kind: 'bus' })] })), 'kr_option');
    eq(err(kicadRules({ classes: [sig('A', { layer: 'F.Cu' })] })), 'kr_option');
    for (const key of ['widthMm', 'clearanceMm']) {
      for (const x of [NaN, undefined, 0, -1, 1e9, '0.2']) eq(err(kicadRules({ classes: [sig('A', { [key]: x })] })), 'kr_number', `${key}=${String(x)}`);
    }
    eq(err(kicadRules({ fab: 'acme' })), 'kr_option');
    eq(kicadRules({ fab: 'acme', version: 'x', header: 1, trackOuterMm: NaN, classes: [sig('')] }).errors.sort().join(), 'kr_names,kr_number,kr_option');
    // Hostile names: either refused or written as one quoted string; the file always parses.
    for (const s of HOSTILE) {
      for (const version of VERSIONS) {
        let r;
        try { r = kicadRules({ version, classes: [pair(s, { uncoupledMm: 5, skewMm: 0.1 }), sig('Other')], date: DAY }); } catch (e) { ok(false, `${JSON.stringify(s.slice(0, 20))} threw ${e.message}`); }
        if (r.ok) valid(r, JSON.stringify(s.slice(0, 20)));
        else {
          eq(err(r), 'kr_names', JSON.stringify(s.slice(0, 20)));
          eq(r.text, '');
        }
        eq(r.ok, !(FORBIDDEN.test(s.slice(0, 200)) || r.checks[0].vars.rows.length > 0), JSON.stringify(s.slice(0, 20)));
      }
    }
    eq(HOSTILE.filter((s) => kicadRules({ classes: [sig(s)] }).ok).length > 10, true, 'the list has names that are accepted');
    eq(HOSTILE.filter((s) => !kicadRules({ classes: [sig(s)] }).ok).length > 10, true, 'and names that are refused');
  }],

  ['kicadrules: what Board Setup needs by hand — absolute minimums and the net class table', () => {
    const board = (r) => Object.fromEntries(r.manual.filter((m) => m.place === 'constraints').map((m) => [m.id, m.valueMm]));
    eq(JSON.stringify(board(base)), '{"clearance":0.15,"track":0.15,"ring":0.175,"viaDia":0.6,"hole":0.25,"holeToHole":0.25,"edge":0.3}');
    // Board Setup holds one value where the file has two: the smaller one, or the custom rule could never apply.
    // The clearance is the exception: the file has no rule for it, so the one value of Board Setup has to cover both layers — the larger.
    const jlc = kicadRules({ fab: 'jlc', ...fabPreset('jlc') });
    eq(JSON.stringify(board(jlc)), '{"clearance":0.1,"track":0.09,"ring":0.05,"viaDia":0.25,"hole":0.15,"holeToHole":0.25,"edge":0.3}');
    const b = board(kicadRules({ trackOuterMm: 0.2, trackInnerMm: 0.3, clearOuterMm: 0.4, clearInnerMm: 0.25, viaHoleMm: 0.4, padHoleMm: 0.3, viaDiaMm: 1, viaRingMm: 0.3, padRingMm: 0.2 }));
    eq(`${b.track}/${b.clearance}/${b.hole}/${b.ring}`, '0.2/0.4/0.3/0.2');
    eq(board(kicadRules({ clearOuterMm: 0.1, clearInnerMm: 0.3 })).clearance, 0.3);
    eq(base.manual[0].id, 'clearance', 'the clearance comes first in the list');
    eq(JSON.stringify(board(kicadRules({ silkHeightMm: 1, silkLineMm: 0.15 }))), '{"clearance":0.15,"track":0.15,"ring":0.175,"viaDia":0.6,"hole":0.25,"holeToHole":0.25,"edge":0.3,"silkHeight":1,"silkLine":0.15}');
    eq(board(kicadRules({ viaRingMm: 0.1, padRingMm: NaN })).ring, 0.1);
    // Net classes: one entry each, with what the net class table takes.
    const nets = base.manual.filter((m) => m.place === 'netclass');
    eq(JSON.stringify(nets), JSON.stringify([
      { place: 'netclass', name: 'Power', kind: 'power', layer: 'any', clearanceMm: 0.2, widthMm: 0.5, gapMm: null },
      { place: 'netclass', name: 'USB', kind: 'diff', layer: 'any', clearanceMm: 0.2, widthMm: 0.3, gapMm: 0.2 },
    ]));
    eq(kicadRules({ classes: [] }).manual.filter((m) => m.place === 'netclass').length, 0);
    eq(kicadRules({ classes: [] }).manual.length, 7);
    // The header says the same thing in the file.
    ok(base.text.includes('# Net classes and the board-wide constraints are entered in Board Setup, not in this file.'), 'said in the file');
  }],

  ['kicadrules page: the defaults are the engine\'s, a preset fills the fabricator fields, hidden fields are not sent', () => {
    const before = getLang();
    setLang('en');
    try {
      const d = show();
      eq(d.r.ok, true);
      eq(d.r.text, kicadRules({ date: d.r.summary.date }).text);
      ok(/^\d{4}-\d{2}-\d{2}$/.test(d.r.summary.date), 'the page dates the header');
      valid(d.r);
      // Presets: the values a fabricator option sets are fabPreset() by field key, and applying them names the source.
      const keyOf = { trackOuterMm: 'tw', trackInnerMm: 'twi', clearOuterMm: 'cl', clearInnerMm: 'cli', viaHoleMm: 'vh', viaDiaMm: 'vd', viaRingMm: 'ring', padHoleMm: 'ph', padRingMm: 'pring' };
      eq(fields.find((f) => f.key === 'fab').options.map((o) => o.value).join(), FAB_IDS.join());
      for (const fab of FABS) {
        const set = presetOf(fab.id);
        eq(JSON.stringify(set), JSON.stringify(Object.fromEntries(Object.entries(fabPreset(fab.id)).map(([k, x]) => [keyOf[k], x]))), fab.id);
        for (const k of Object.keys(set)) ok(fields.some((f) => f.key === k && f.type === 'number'), `${fab.id}: ${k} is a number field`);
        const out = show({ fab: fab.id, ...set });
        eq(out.r.summary.source, fab.id);
        eq(out.r.text, kicadRules({ fab: fab.id, ...fabPreset(fab.id), date: out.r.summary.date }).text, fab.id);
        ok(out.html.includes(`download="kicad-rules-${fab.id}.kicad_dru"`) && visible(out.html).includes(`KiCad 10 · ${fab.name} · 2 net classes`), `${fab.id}: named on the page`);
        ok(visible(out.html).includes(`data read ${fab.accessed}`), `${fab.id}: source`);
      }
      eq(presetOf('custom'), undefined, '"custom" changes no field');
      // The select alone does not make the values that fabricator's: the page then says "entered by hand".
      const mismatch = show({ fab: 'jlc' });
      eq(mismatch.r.summary.source, 'custom');
      ok(visible(mismatch.html).includes('KiCad 10 · minimums entered by hand · 2 net classes') && mismatch.r.text.includes('starting from the JLCPCB preset'), 'edited preset');
      // Every field reaches the engine.
      const full = show({
        fab: 'custom', tw: 0.2, twi: 0.25, cl: 0.21, cli: 0.26, vh: 0.3, vd: 0.7, ring: 0.2, ph: 0.4, pring: 0.25, hh: 0.5, edge: 0.4, sth: 0.8, stw: 0.12, nc: 4, ver: 8, hdr: 'no',
        c1n: 'A', c1k: 'signal', c1l: 'outer', c1w: 0.3, c1m: 0.22, c1c: 0.3,
        c2n: 'B', c2k: 'diff', c2l: 'inner', c2w: 0.26, c2c: 0.27, c2g: 0.28, c2u: 6, c2s: 0.2,
        c3n: 'C', c3k: 'power', c3l: 'any', c3w: 1, c3c: 0.3,
        c4n: 'D', c4k: 'diff', c4l: 'any', c4w: 0.3, c4c: 0.3, c4g: 0.3,
      });
      eq(full.r.text, kicadRules({
        fab: 'custom', trackOuterMm: 0.2, trackInnerMm: 0.25, clearOuterMm: 0.21, clearInnerMm: 0.26, viaHoleMm: 0.3, viaDiaMm: 0.7, viaRingMm: 0.2, padHoleMm: 0.4, padRingMm: 0.25,
        holeToHoleMm: 0.5, edgeMm: 0.4, silkHeightMm: 0.8, silkLineMm: 0.12, version: '8', header: false,
        classes: [
          { name: 'A', kind: 'signal', layer: 'outer', widthMm: 0.3, minWidthMm: 0.22, clearanceMm: 0.3 },
          { name: 'B', kind: 'diff', layer: 'inner', widthMm: 0.26, clearanceMm: 0.27, gapMm: 0.28, uncoupledMm: 6, skewMm: 0.2 },
          { name: 'C', kind: 'power', layer: 'any', widthMm: 1, clearanceMm: 0.3 },
          { name: 'D', kind: 'diff', layer: 'any', widthMm: 0.3, clearanceMm: 0.3, gapMm: 0.3 },
        ],
      }).text);
      eq(full.r.summary.warnings, 0);
      valid(full.r);
      // The number of classes shows the rows; rows that are switched off are not sent, whatever they hold.
      eq([0, 1, 2, 3, 4].map((n) => show({ nc: n }).r.summary.classes).join(), '0,1,2,3,4');
      eq(show({ nc: 1, c2n: 'a"b', c2w: 'abc', c3n: '' }).r.text, show({ nc: 1 }).r.text);
      eq(show({ nc: 0, c1n: '' }).r.ok, true);
      // The pair fields of a class that is not a pair are hidden and not sent.
      eq(show({ c1g: 'abc', c1u: 5, c1s: 1 }).r.text, d.r.text);
      const shown = (set, key) => {
        const { v } = inputs(set);
        const s = page.sections.find((x) => x.fields.some((f) => f.key === key));
        const f = s.fields.find((x) => x.key === key);
        return !(s.show && !s.show(v)) && !(f.show && !f.show(v));
      };
      eq([0, 1, 2, 3, 4].map((n) => [1, 2, 3, 4].map((i) => (shown({ nc: n }, `c${i}w`) ? 1 : 0)).join('')).join(), '0000,1000,1100,1110,1111');
      eq(['c1g', 'c1u', 'c1s', 'c2g', 'c2u', 'c2s'].map((k) => (shown({}, k) ? 1 : 0)).join(''), '000111');
      eq(['c1g', 'c1u', 'c1s'].map((k) => (shown({ c1k: 'diff' }, k) ? 1 : 0)).join(''), '111');
      eq(shown({ nc: 1, c2k: 'diff' }, 'c2g'), false);
      // Empty optional fields switch their rule off; the silkscreen fields are empty to begin with.
      const bare = show({ pring: '' });
      eq(bare.r.text, kicadRules({ padRingMm: NaN, date: bare.r.summary.date }).text);
      eq(`${fields.find((f) => f.key === 'sth').default}|${fields.find((f) => f.key === 'stw').default}`, '|');
      ok(!d.r.text.includes('Silkscreen') && !d.html.includes('Silkscreen: minimum text'), 'no silkscreen rule and no silkscreen row by default');
      const silk = show({ sth: 1, stw: 0.15 });
      eq(silk.r.text, kicadRules({ silkHeightMm: 1, silkLineMm: 0.15, date: silk.r.summary.date }).text);
      ok(silk.r.text.includes('(layer "F.Silkscreen")') && silk.html.includes('<th scope="row">Silkscreen: minimum text height</th><td>1 mm</td>'), 'silkscreen rules when the fields are filled');
      eq(ids(show({ sth: 0.8 }).r).split(',').slice(9, 11).join(), 'silkFront,silkBack');
      // The fabricator clearance fields are still read: they feed the checks and the by-hand list, not a rule.
      const cl = show({ cl: 0.3, cli: 0.25 });
      eq(cl.r.rules.map((x) => x.lines.join('\n')).join('\n'), d.r.rules.map((x) => x.lines.join('\n')).join('\n'));
      ok(cl.html.includes('<th scope="row">Minimum clearance</th><td>0.3 mm</td>') && check(cl.r, 'clearance').status === 'fail', 'clearance fields');
      // Engine errors reach the page as a message, with no file, button or link.
      for (const set of [{ tw: '' }, { tw: 'abc' }, { vd: 0.2 }, { cl: -1 }, { edge: 1e9 }, { ver: 7 }, { fab: 'acme' }, { c1w: 0 }, { c2g: '' }, { c1m: 0.9 }, { c1n: '' }, { c2n: 'power' }, { c1n: 'a"b' }]) {
        const bad = show(set);
        eq(bad.r.ok, false, JSON.stringify(set));
        ok(bad.html.includes('class="msg error"') && !bad.html.includes('<pre') && !bad.html.includes('data-copy') && !bad.html.includes('download='), JSON.stringify(set));
      }
      ok(show({ vd: 0.2 }).html.includes('The minimum via diameter must be larger than the minimum via hole.'), 'via message');
      ok(show({ c1m: 0.9 }).html.includes('The minimum track width of a net class is larger than its track width.'), 'minimum width message');
      const dup = show({ c2n: 'power' });
      ok(dup.html.includes('class="checks"') && dup.html.includes('<li class="fail">') && dup.html.includes('Class 2 repeats a name used above'), 'the list names the class');
    } finally {
      setLang(before);
    }
  }],

  ['kicadrules page: the block, the copy button and the download link all carry the file; the link decodes back to it', () => {
    const sets = [{}, { nc: 0 }, { nc: 4 }, { ver: 8, c2s: 0.1, c2u: 3 }, { hdr: 'no' }, { fab: 'jlc', ...presetOf('jlc') }, { c1n: 'Güç 3V3 (ana) & <b>' }, { c1n: '$& {name} 100%' }];
    inBothLanguages((ui) => {
      for (const set of sets) {
        const where = `${ui} ${JSON.stringify(set)}`;
        const { r, html } = show(set);
        eq(r.ok, true, where);
        eq((html.match(/<pre/g) ?? []).length, 1, where);
        eq((html.match(/<a /g) ?? []).length, 1, where);
        eq(shownFile(html), r.text, `${where}: block`);
        eq(copied(html), r.text, `${where}: copy`);
        const [, url, file] = href(html);
        ok(url.startsWith(URL_HEAD) && /^[A-Za-z0-9._~%-]*$/.test(url.slice(URL_HEAD.length)), `${where}: URL`);
        eq(decodeURIComponent(url.slice(URL_HEAD.length)), r.text, `${where}: download`);
        eq(url, rulesDataUrl(r.text), where);
        ok(/^kicad-rules-[a-z]+\.kicad_dru$/.test(file) && file === r.fileName, `${where}: file name ${file}`);
        valid({ text: decodeURIComponent(url.slice(URL_HEAD.length)) }, where);
      }
    });
    eq(rulesDataUrl(''), URL_HEAD);
    eq(rulesDataUrl(undefined), URL_HEAD);
    eq(rulesDataUrl(ch(0xD83D)), URL_HEAD, 'a lone surrogate gives an empty file, not an exception');
  }],

  ['kicadrules page: the file is the same in Turkish and in English, and never takes the decimal comma of the page', () => {
    const sets = [{}, { nc: 4 }, { fab: 'jlc', ...presetOf('jlc') }, { ver: 8, c2s: 0.15, c2u: 2.5 }, { tw: '0,127', cl: '0,127', c1w: '0,55', c2g: '0,25', c2c: '0,2', hdr: 'no' }, { vd: 0.5 }, { c1w: 0.1 }];
    const text = { tr: [], en: [] };
    const html = { tr: [], en: [] };
    inBothLanguages((ui) => {
      for (const set of sets) {
        const out = show(set);
        eq(out.r.ok, true, `${ui} ${JSON.stringify(set)}`);
        valid(out.r, `${ui} ${JSON.stringify(set)}`);
        ok(!/\d,\d/.test(out.r.text), `${ui}: a decimal comma in the file`);
        text[ui].push(out.r.text);
        html[ui].push(out.html);
      }
    });
    text.tr.forEach((x, i) => eq(x, text.en[i], JSON.stringify(sets[i])));
    // A number typed with a comma is read as that number and written with a dot.
    ok(text.tr[4].includes('(constraint track_width (min 0.127mm))') && text.tr[4].includes('(constraint track_width (min 0.55mm) (opt 0.55mm))') && text.tr[4].includes('(min 0.25mm) (opt 0.25mm)'), 'comma input');
    // The page around the file follows its language: Turkish shows 0,09 mm where the file says 0.09mm.
    ok(visible(html.tr[2]).includes('0,09 mm') && !visible(html.en[2]).includes('0,09 mm') && visible(html.en[2]).includes('0.09 mm'), 'by-hand table');
    ok(shownFile(html.tr[2]).includes('(min 0.09mm)') && !/\d,\d/.test(shownFile(html.tr[2])), 'the block inside the Turkish page');
    ok(visible(html.tr[5]).includes('0,125 mm') && visible(html.en[5]).includes('0.125 mm'), 'check text');
    // The file is English only: nothing Turkish gets into it from the page language.
    ok(text.tr.every((x) => !/[çğıöşüÇĞİÖŞÜ]/.test(x)), 'no Turkish text in the file');
    ok(html.tr.every((x, i) => visible(x.replace(/<pre[\s\S]*?<\/pre>/, '')) !== visible(html.en[i].replace(/<pre[\s\S]*?<\/pre>/, ''))), 'the page itself is translated');
  }],

  ['kicadrules page: hostile names are refused or escaped — in the block, the copy button, the link, the tables and the check list', () => {
    const allowed = ['div', 'span', 'button', 'svg', 'path', 'rect', 'circle', 'line', 'polyline', 'a', 'pre', 'p', 'ul', 'li', 'b', 'small', 'h2', 'table', 'tbody', 'tr', 'th', 'td'];
    let accepted = 0;
    let refused = 0;
    inBothLanguages((ui) => {
      for (const s of HOSTILE) {
        // The form cuts a text field at 40 characters; a cut can split a surrogate pair.
        const cut = s.slice(0, 40);
        for (const set of [{ c1n: cut }, { c2n: cut, c2s: 0.1, ver: 8 }, { nc: 4, c1n: cut, c2n: `B${cut}`.slice(0, 40), c3n: cut, c4n: `D${cut}`.slice(0, 40) }]) {
          const where = `${ui} ${JSON.stringify(set).slice(0, 80)}`;
          let out;
          try { out = show(set); } catch (e) { ok(false, `${where} threw ${e.message}`); }
          const { r, html } = out;
          // No tag that the page did not write itself, and no attribute ended early.
          const tags = new Set((html.match(/<\/?[a-zA-Z][a-zA-Z0-9]*/g) ?? []).map((x) => x.replace(/[</]/g, '').toLowerCase()));
          for (const tag of tags) ok(allowed.includes(tag), `${where}: <${tag}>`);
          // (The name is also shown as text in the tables and the check list, so event handlers are looked for inside tags only.)
          ok(!/<(img|script|h1|iframe)\b/i.test(html) && !/<[^>]*\son[a-z]+\s*=/i.test(html.replace(/data-copy="[^"]*"/g, '')), `${where}: injected markup`);
          eq((html.match(/"/g) ?? []).length % 2, 0, `${where}: an attribute was ended early`);
          if (!r.ok) {
            refused++;
            eq(err(r), 'kr_names', where);
            ok(html.includes('class="msg error"') && !html.includes('<pre') && !html.includes('data-copy') && !html.includes('download='), `${where}: no file`);
            eq(checkRows(html).length, 1, where);
            eq(checkRows(html)[0][1], 'fail', where);
            continue;
          }
          accepted++;
          valid(r, where);
          eq(shownFile(html), r.text, `${where}: block`);
          eq(copied(html), r.text, `${where}: copy`);
          const [, url, file] = href(html);
          eq(decodeURIComponent(url.slice(URL_HEAD.length)), r.text, `${where}: download`);
          ok(/^[A-Za-z0-9._-]+\.kicad_dru$/.test(file), `${where}: file name`);
          eq((html.match(/<pre/g) ?? []).length, 1, where);
          eq((html.match(/<\/pre>/g) ?? []).length, 1, where);
          eq((html.match(/<a /g) ?? []).length, 1, where);
          eq((html.match(/<table/g) ?? []).length, 2, where);
        }
      }
    });
    ok(accepted > 20 && refused > 20, `both paths were taken (${accepted} accepted, ${refused} refused)`);
    // The name is shown as typed, escaped, wherever it appears.
    const before = getLang();
    setLang('en');
    try {
      const { r, html } = show({ c1n: '<img src=x onerror=1>', c1w: 0.1, c1c: 0.1 });
      eq(r.ok, true);
      ok(html.includes('(rule &quot;Class &lt;img src=x onerror=1&gt;: track width&quot;'), 'escaped in the block');
      ok(html.includes('<th scope="row">&lt;img src=x onerror=1&gt;</th>'), 'escaped in the net class table');
      ok(html.includes('0.1 mm against a fabricator minimum of 0.15 mm (all layers: the larger of the outer and inner minimum): &lt;img src=x onerror=1&gt;.'), 'escaped in the check list');
      const refusedName = show({ c1n: '"><script>alert(1)</script>' });
      ok(refusedName.html.includes('The name of class 1 holds a character the rule syntax cannot carry: &quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;.'), 'a refused name is shown escaped');
      // Markers and replacement patterns in a name are text, not instructions to the page.
      const marks = show({ c1n: '$& {lim} {v}', c1w: 0.1 });
      ok(visible(marks.html).includes('): $&amp; {lim} {v}.'), 'markers stay as typed');
    } finally {
      setLang(before);
    }
  }],

  ['kicadrules page: every option renders in both languages with no untranslated key, and every check case has its text', () => {
    // Defaults, every option of every choice and select (with the values it sets), and sets that reach every check text and error.
    const sets = [{}];
    for (const f of fields) for (const o of f.options ?? []) if (String(o.value) !== String(f.default)) sets.push({ [f.key]: o.value, ...(o.set ?? {}) });
    sets.push(
      { nc: 4 }, { nc: 0 }, { nc: 4, c1k: 'diff', c3k: 'diff', c1l: 'inner', c2l: 'outer', c1u: 5, c1s: 0.1, c2u: 5, c2s: 0.1, ver: 8 },
      { c1w: 0.1 }, { c1c: 0.1 }, { c2g: 0.1 }, { c2g: 0.1, c2c: 0.15 }, { c1w: 0.1, c1l: 'outer' }, { c1c: 0.1, c1l: 'inner' }, { vd: 0.5 },
      { c1w: 0.1, c1c: 0.1, c2w: 0.1, c2c: 0.1, c2g: 0.05, vd: 0.5 }, { pring: '' }, { sth: 0.8 }, { stw: 0.12 }, { sth: 1, stw: 0.15 },
      { c1n: '' }, { c2n: 'POWER' }, { c1n: "a'b" }, { nc: 3, c1n: '', c2n: 'x*', c3n: 'X*' }, { tw: '' }, { vd: 0.1 }, { c1m: 5 }, { ver: 'x' }, { fab: 'x' },
    );
    const texts = { tr: new Set(), en: new Set() };
    inBothLanguages((ui) => {
      for (const set of sets) {
        const where = `${ui} ${JSON.stringify(set)}`;
        let out;
        try { out = show(set); } catch (e) { ok(false, `${where} threw ${e.message}`); }
        const text = visible(out.html);
        ok(!/(?<![A-Za-z0-9_])(ok_|warn_|err_)?kr_[A-Za-z0-9]+/.test(text), `${where}: untranslated key ${text.match(/(ok_|warn_|err_)?kr_[A-Za-z0-9]+/)?.[0]}`);
        ok(!/NaN|undefined|Infinity|\[object|\{[a-z]+\}/.test(text), `${where}: ${text.match(/.{0,30}(NaN|undefined|Infinity|\[object|\{[a-z]+\}).{0,30}/)?.[0]}`);
        // One row per check, each with a title and a sentence, in the colour of its status.
        const rows = checkRows(out.html);
        eq(rows.length, out.r.checks.length, where);
        rows.forEach(([, cls, title, detail], i) => {
          const c = out.r.checks[i];
          eq(cls, { ok: 'pass', warn: 'warn', fail: 'fail' }[c.status], `${where}: ${c.id}`);
          ok(title.trim().length > 5 && detail.trim().length > 40 && /[.!]$/.test(detail.trim()), `${where}: ${c.id} text`);
          texts[ui].add(`${c.id}:${c.status}|${unesc(detail)}`);
        });
        if (!out.r.ok) { ok(out.html.includes('class="msg error"') && !out.html.includes('<pre'), `${where}: error message`); continue; }
        for (const part of ['class="hero"', 'class="refs"', 'class="checks"', 'class="kv"', '<pre class="formula notes">', 'docs.kicad.org']) ok(out.html.includes(part), `${where}: ${part}`);
        // The verdict line counts what the list shows.
        eq(out.html.includes('class="msg ok"'), out.r.summary.warnings === 0, where);
        eq(out.html.includes('class="msg warn"'), out.r.summary.warnings > 0, where);
        // The source list names the manual of the version the file is written for.
        ok(text.includes(`KiCad PCB Editor ${ui === 'tr' ? 'kılavuzu' : 'manual'} ${MANUAL[out.r.summary.version]}`), `${where}: manual version`);
      }
    });
    // Every case of every check was rendered, in both languages, and the two languages differ.
    for (const ui of ['tr', 'en']) {
      const seen = new Set([...texts[ui]].map((x) => x.split('|')[0]));
      for (const [id, list] of Object.entries(CHECK_CASES)) for (const k of list) ok(seen.has(`${id}:${k}`), `${ui}: ${id}:${k} never rendered`);
    }
    ok([...texts.tr].every((x) => !texts.en.has(x)), 'a check text is the same in Turkish and English');
    const before = getLang();
    setLang('en');
    try {
      // Specific texts: the numbers of the check, the class it is about, where the limit comes from.
      ok(show({ c2g: 0.1 }).html.includes('Pair gap 0.1 mm against the class&#39;s own clearance of 0.2 mm: USB.') || show({ c2g: 0.1 }).html.includes('Pair gap 0.1 mm against the class’s own clearance of 0.2 mm: USB.'), 'gap by class');
      ok(show({ c2g: 0.1, c2c: 0.15 }).html.includes('Pair gap 0.1 mm against a Board Setup minimum clearance of 0.15 mm: USB.'), 'gap by the floor');
      // The clearance check uses the Board Setup floor (the larger fabricator value) whatever layers the class is set to.
      for (const layer of LAYERS) {
        ok(show({ c1c: 0.1, c1l: layer }).html.includes('0.1 mm against a Board Setup minimum clearance of 0.15 mm: Power.'), `clearance, ${layer}`);
        ok(show({ cl: 0.1, cli: 0.25, c1l: layer }).html.includes('0.2 mm against a Board Setup minimum clearance of 0.25 mm: Power. 0.2 mm against a Board Setup minimum clearance of 0.25 mm: USB.'), `floor, ${layer}`);
      }
      ok(visible(show().html).includes('below the minimum clearance that goes into Board Setup (0.15 mm, the larger of the outer and inner fabricator value)'), 'the passing text names the floor');
      ok(show({ vd: 0.5 }).html.includes('leave a ring of only 0.125 mm; the minimum is 0.175 mm. All three rules are met only by a via of at least 0.6 mm diameter'), 'via ring');
      // The by-hand list: the board-wide constraints and one row per net class.
      const d = show();
      ok(d.html.includes('<th scope="row">Minimum clearance</th><td>0.15 mm</td>') && d.html.includes('<th scope="row">Minimum via diameter</th><td>0.6 mm</td>'), 'constraints table');
      ok(d.html.includes('<th scope="row">USB</th><td>clearance 0.2 mm · track width 0.3 mm · pair width 0.3 mm · pair gap 0.2 mm</td>'), 'net class row of a pair');
      ok(d.html.includes('<th scope="row">Power</th><td>clearance 0.2 mm · track width 0.5 mm</td>'), 'net class row');
      ok(visible(d.html).includes('Board Setup → Design Rules → Constraints') && visible(d.html).includes('Board Setup → Design Rules → Net Classes') && visible(d.html).includes('Board Setup → Design Rules → Custom Rules'), 'where each goes');
      // Why the clearance is in this list and not in the file; the old warning about unlisted classes is gone.
      ok(visible(d.html).includes('The minimum clearance is entered here and is not a rule in the file: the Board Setup value is only a floor and leaves larger net class clearances alone'), 'clearance sentence');
      ok(visible(d.html).includes('The larger of the outer and inner layer values is given.'), 'larger value');
      // The note under the file: the rule order, then the one reason line for all clearances — and nothing about class clearance rules, which no longer exist.
      ok(visible(d.html).includes('Clearances (the board minimum and that of each net class) are not rules in this file but are entered in Board Setup, because a custom clearance rule would take the place of the net class clearances of every pair it matches.'), 'the reason line');
      ok(!/not listed here|add every class|The clearance rule of a class|later in the file decides/.test(visible(d.html)), 'no hazard warning left');
      ok(visible(d.html).includes('The clearance of a class is set only here: the file has no clearance rule.'), 'net class table sentence');
      ok(visible(show({ nc: 0 }).html).includes('No net class was entered'), 'no classes');
      // The standing note: DRC only, routed tracks stay, the fabricator's sheet decides.
      ok(visible(d.html).includes('it does not change tracks that are already routed') && visible(d.html).includes('capability sheet decides'), 'page note');
      setLang('tr');
      const t = visible(show().html);
      ok(t.includes('çizilmiş izleri değiştirmez') && t.includes('üreticinin güncel yetenek sayfasıdır') && t.includes('KiCad’e elle girilecek değerler'), 'Turkish page note');
      ok(t.includes('En küçük aralık buraya girilir, dosyada kural olarak yer almaz') && t.includes('büyük olanı yazılmıştır') && !/listelenmeyen|sonra gelen kural/.test(t), 'Turkish clearance sentence');
      ok(t.includes('Aralıklar (kartın en küçük aralığı ve her net sınıfının aralığı) bu dosyada kural olarak yer almaz, Board Setup’a girilir') && t.includes('dosyada aralık kuralı yoktur'), 'Turkish reason line');
    } finally {
      setLang(before);
    }
  }],

  ['kicadrules page: Turkish and English strings match, and every key the page and the engine use exists', () => {
    const tr = Object.keys(page.strings.tr);
    const en = new Set(Object.keys(page.strings.en));
    eq(tr.filter((k) => !en.has(k)).join(), '', 'only in tr');
    eq([...en].filter((k) => !tr.includes(k)).join(), '', 'only in en');
    ok(tr.every((k) => page.strings.tr[k] && page.strings.en[k]), 'no empty string');
    ok(tr.every((k) => /^(kr_|ok_kr_|warn_kr_|err_kr_)[A-Za-z0-9]+$/.test(k)), 'all keys carry the kr_ prefix, so no other page is overwritten');
    // Placeholders are the same in both languages.
    for (const k of tr) {
      const marks = (s) => (s.match(/\{[a-z]+\}/g) ?? []).sort().join();
      eq(marks(page.strings.tr[k]), marks(page.strings.en[k]), `placeholders of ${k}`);
    }
    // Engine: errors, check titles, every check case, every by-hand constraint.
    for (const k of ['kr_number', 'kr_option', 'kr_names', 'kr_minWidth', 'kr_viaDia']) ok(en.has(`err_${k}`), `err_${k}`);
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    for (const id of Object.keys(CHECK_CASES)) ok(en.has(`kr_k${cap(id)}`) && en.has(`kr_k${cap(id)}Ok`), `texts of ${id}`);
    for (const k of ['kr_kNamesEmpty', 'kr_kNamesDuplicate', 'kr_kNamesChars', 'kr_kNamesFail', 'kr_kWidthFail', 'kr_kClearanceFail', 'kr_kClearanceRow', 'kr_kRow', 'kr_kGapRowFab', 'kr_kGapRowClass', 'kr_kGapFail', 'kr_kViaRingWarn']) ok(en.has(k), k);
    for (const m of base.manual.filter((x) => x.place === 'constraints')) ok(en.has(`kr_m${cap(m.id)}`), `by-hand label ${m.id}`);
    for (const l of LAYERS) ok(en.has(`kr_layer${cap(l)}`) && en.has(`kr_cly${cap(l)}`), `layer ${l}`);
    for (const k of KINDS) ok(en.has(`kr_ck${cap(k)}`), `kind ${k}`);
    // Labels, hints, notes and options of the form.
    for (const s of page.sections) {
      ok(en.has(s.title), `section ${s.title}`);
      ok(!s.note || en.has(s.note), `note ${s.note}`);
      for (const f of s.fields) {
        for (const k of [f.label, f.hint, f.info, ...(f.options ?? []).filter((o) => !o.raw).map((o) => o.label)]) ok(k === undefined || en.has(k), `${f.key}: ${k}`);
      }
    }
    // Field keys are unique and short (they become URL parameters); option values are lowercase ASCII.
    eq(new Set(fields.map((f) => f.key)).size, fields.length, 'unique keys');
    ok(fields.every((f) => /^[a-z][a-z0-9]{1,5}$/.test(f.key)), 'short keys');
    ok(fields.every((f) => (f.options ?? []).every((o) => /^[a-z0-9]+$/.test(o.value))), 'option values');
    eq(fields.length, 53);
    eq(page.id, 'kicadrules');
    // The options offered are the ones the engine knows; only versions whose manual was read are offered.
    const values = (key) => fields.find((f) => f.key === key).options.map((o) => o.value).join();
    eq(values('ver'), VERSIONS.join());
    eq(values('fab'), FAB_IDS.join());
    eq(values('nc'), '0,1,2,3,4');
    for (const i of [1, 2, 3, 4]) {
      eq(values(`c${i}k`), KINDS.join());
      eq(values(`c${i}l`), LAYERS.join());
      const d = CLASS_DEFAULTS[i - 1];
      const def = (key) => fields.find((f) => f.key === `c${i}${key}`).default;
      eq(`${def('n')}/${def('k')}/${def('l')}/${def('w')}/${def('c')}`, `${d.name}/${d.kind}/${d.layer}/${d.widthMm}/${d.clearanceMm}`, `defaults of row ${i}`);
    }
    // Number fields accept exactly the ranges of the engine, so a value the form lets through never fails there; all are in mm.
    const range = { tw: 'trackOuterMm', twi: 'trackInnerMm', cl: 'clearOuterMm', cli: 'clearInnerMm', vh: 'viaHoleMm', vd: 'viaDiaMm', ring: 'viaRingMm', ph: 'padHoleMm', pring: 'padRingMm',
      hh: 'holeToHoleMm', edge: 'edgeMm', sth: 'silkHeightMm', stw: 'silkLineMm' };
    for (const i of [1, 2, 3, 4]) Object.assign(range, { [`c${i}w`]: 'widthMm', [`c${i}m`]: 'minWidthMm', [`c${i}c`]: 'clearanceMm', [`c${i}g`]: 'gapMm', [`c${i}u`]: 'uncoupledMm', [`c${i}s`]: 'skewMm' });
    const numbers = fields.filter((f) => f.type === 'number');
    eq(numbers.map((f) => f.key).filter((k) => !range[k]).join(), '', 'number fields without a range');
    for (const f of numbers) {
      eq(`${f.min}/${f.max}`, RANGES[range[f.key]].join('/'), f.key);
      eq(f.units.join(), 'mm', `${f.key}: mm only`);
      eq(!!f.optional, ['pring', 'sth', 'stw'].includes(f.key) || /^c\d[mus]$/.test(f.key), `${f.key}: optional`);
    }
    // The values that are not from the fabricator data say so in their hint, in both languages.
    for (const key of ['hh', 'edge']) {
      const hint = fields.find((f) => f.key === key).hint;
      ok(/^Tipik değer/.test(page.strings.tr[hint]) && /^Typical value/.test(page.strings.en[hint]), `${key}: labelled typical`);
    }
    eq(`${fields.find((f) => f.key === 'hh').default}/${fields.find((f) => f.key === 'edge').default}`, `${TYPICAL.holeToHoleMm}/${TYPICAL.edgeMm}`);
    // The silkscreen fields start empty; their typical values are in the hints, with the decimal sign of the language.
    for (const [key, value] of [['sth', TYPICAL.silkHeightMm], ['stw', TYPICAL.silkLineMm]]) {
      const f = fields.find((x) => x.key === key);
      eq(f.default, '', key);
      ok(page.strings.en[f.hint].includes(`A typical value is ${value} mm (not from the fabricator data)`), `${key}: English hint`);
      ok(page.strings.tr[f.hint].includes(`Tipik değer ${String(value).replace('.', ',')} mm’dir; üretici verisinden alınmamıştır`), `${key}: Turkish hint`);
    }
    // Free text is cut by the form at 40 characters, which is what the engine takes.
    ok(NAME_MAX >= 40, 'the engine takes what the form lets through');
  }],
];
