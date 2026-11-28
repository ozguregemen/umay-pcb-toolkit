// KiCad custom design rules (.kicad_dru) written from a fabricator's minimums
// and the designer's net classes, plus the values that cannot go into that file
// and a list of points where the numbers contradict each other.
//
// Pure functions: no DOM and no app i18n. The file itself (rule names and
// comments) is English only, because rule names appear in KiCad's DRC report.
//
// Syntax: KiCad PCB Editor manual, chapter "Custom design rules", versions 8.0,
// 9.0 and 10.0 (docs.kicad.org, read 2026-11-28). Only what those pages show is
// written:
//   (version 1)                      the header of all three versions
//   # …                              a comment is a line that begins with #
//   (rule "name" [(layer outer | inner | "layer name")] [(condition "…")]
//       (constraint <type> (min …) (opt …) (max …)))
//   constraint types  track_width (min/opt/max), hole_size (min),
//                     via_diameter (min), annular_width (min), hole_to_hole (min),
//                     edge_clearance (min), text_height (min), text_thickness (min),
//                     diff_pair_gap (min/opt), diff_pair_uncoupled (max), skew (max)
//   conditions        A.Type == 'Via', A.Type == 'Pad', A.isPlated(), joined by &&;
//                     the net class as A.NetClass == 'x' (8.0) or
//                     A.hasNetclass('x') (9.0 and 10.0, where a net can have
//                     several classes and the manual's examples use the function)
//   numbers           with the unit attached: 0.15mm
// Rules are tried from the last one to the first and the first match is used,
// so the net class rules are written after the fabricator rules.
// For the same reason the file holds NO `clearance` constraint at all. A
// condition is tested with the two objects in both orders, so a clearance rule —
// unconditional, or conditioned on one net class — takes the place of the net
// class clearance of every pair it matches, also of a larger one that exists
// only in Board Setup (a mains or high-voltage class next to a USB net).
// Clearances go into the by-hand list instead: the fabricator minimum as the
// minimum clearance of Board Setup, which is a floor and leaves larger
// clearances alone, and each class clearance into the net class table.
// A quoted string has no escape for a quote of its own kind and only one level
// of nesting ("… '…' …"), so a net class name with a quote cannot be written.
// The skew option within_diff_pairs (9.0, 10.0) is named in the manual without
// its syntax and is therefore not used.

import { FABS, fabById, traceSpaceRule, ringRule } from './fabs.js';
import { cleanText, notesDataUrl } from './fabnotes.js';

export const VERSIONS = ['8', '9', '10'];
/** KiCad major version → the version of the manual its syntax was read from. */
export const MANUAL = { 8: '8.0', 9: '9.0', 10: '10.0' };
export const FAB_IDS = [...FABS.map((f) => f.id), 'custom'];
export const KINDS = ['signal', 'power', 'diff'];
export const LAYERS = ['any', 'outer', 'inner'];
export const MAX_CLASSES = 4;
/** Longest net class name that is taken over, in characters. */
export const NAME_MAX = 40;
/**
 * Characters a net class name must not hold: the quotes and the backslash
 * cannot be escaped inside a condition, * and ? are wildcards in the manual's
 * string comparisons, and the comma separates the classes of a net (9.0+).
 */
export const FORBIDDEN = /["'\\*?,]/;
/** Every constraint type the file can contain. */
export const CONSTRAINTS = ['track_width', 'hole_size', 'via_diameter', 'annular_width', 'hole_to_hole',
  'edge_clearance', 'text_height', 'text_thickness', 'diff_pair_gap', 'diff_pair_uncoupled', 'skew'];

/** Accepted range of every number, in mm: [lowest, highest]. */
export const RANGES = {
  trackOuterMm: [0.01, 10],
  trackInnerMm: [0.01, 10],
  clearOuterMm: [0.01, 10],
  clearInnerMm: [0.01, 10],
  viaHoleMm: [0.05, 10],
  viaDiaMm: [0.1, 20],
  viaRingMm: [0.01, 5],
  padHoleMm: [0.05, 10],
  padRingMm: [0.01, 5],
  holeToHoleMm: [0.05, 10],
  edgeMm: [0.05, 10],
  silkHeightMm: [0.2, 10],
  silkLineMm: [0.02, 2],
  // one net class
  widthMm: [0.01, 20],
  minWidthMm: [0.01, 20],
  clearanceMm: [0.01, 20],
  gapMm: [0.01, 20],
  uncoupledMm: [0.1, 1000],
  skewMm: [0.001, 100],
};

/**
 * Values the fabricator data (engine/fabs.js) does not hold: typical figures,
 * labelled so on the page. The first two are the defaults of their fields; the
 * silkscreen values are only named in the hints (those fields start empty).
 */
export const TYPICAL = Object.freeze({ holeToHoleMm: 0.25, edgeMm: 0.3, silkHeightMm: 1, silkLineMm: 0.15 });

const r4 = (x) => Number(x.toFixed(4));

/**
 * The fields a fabricator preset fills, from engine/fabs.js: limits for 1 oz
 * copper; where a fabricator lists 1–2 layer boards separately, the outer layer
 * and the pad ring take that (stricter) value. Unknown id → null.
 */
export function fabPreset(id) {
  const fab = fabById(id);
  if (!fab) return null;
  const outer = traceSpaceRule(fab, { oz: 1, inner: false });
  const inner = traceSpaceRule(fab, { oz: 1, inner: true });
  const ring = ringRule(fab, 'via');
  return {
    trackOuterMm: r4(outer.trace),
    trackInnerMm: r4(inner.trace),
    clearOuterMm: r4(outer.space),
    clearInnerMm: r4(inner.space),
    viaHoleMm: r4(fab.minHoleMm),
    viaDiaMm: r4(fab.minHoleMm + 2 * ring),
    viaRingMm: r4(ring),
    padHoleMm: r4(fab.minHoleMm),
    padRingMm: r4(ringRule(fab, 'pth')),
  };
}

/** Example net classes; the page offers them as the defaults of its four rows. */
export const CLASS_DEFAULTS = Object.freeze([
  Object.freeze({ name: 'Power', kind: 'power', layer: 'any', widthMm: 0.5, clearanceMm: 0.2 }),
  Object.freeze({ name: 'USB', kind: 'diff', layer: 'any', widthMm: 0.3, clearanceMm: 0.2, gapMm: 0.2 }),
  Object.freeze({ name: 'RF50', kind: 'signal', layer: 'outer', widthMm: 0.35, clearanceMm: 0.3 }),
  Object.freeze({ name: 'ETH', kind: 'diff', layer: 'any', widthMm: 0.2, clearanceMm: 0.2, gapMm: 0.2 }),
]);

export const DEFAULTS = Object.freeze({
  version: '10',
  header: true,
  date: '',
  fab: 'generic',
  ...fabPreset('generic'),
  holeToHoleMm: TYPICAL.holeToHoleMm,
  edgeMm: TYPICAL.edgeMm,
  // No silkscreen rule unless a value is given.
  silkHeightMm: null,
  silkLineMm: null,
  classes: Object.freeze(CLASS_DEFAULTS.slice(0, 2)),
});

/** Every status each check can report. */
export const CHECK_CASES = {
  names: ['ok', 'fail'],
  width: ['ok', 'fail'],
  clearance: ['ok', 'fail'],
  gap: ['ok', 'fail'],
  viaRing: ['ok', 'warn'],
};

const EPS = 1e-9;
const KIND_WORD = { signal: 'signal', power: 'power', diff: 'differential pair' };
const LAYER_WORD = { any: 'all layers', outer: 'outer layers', inner: 'inner layers' };

/** A length as the file writes it: dot decimal, no trailing zeros, no exponent, at most six decimals (1 nm). */
export function num(x) {
  return x.toFixed(6).replace(/\.?0+$/, '');
}
/** …with the unit attached, as the rule syntax wants it: 0.15mm. */
export const mm = (x) => `${num(x)}mm`;

/** The rules as a `data:` URL for the download link (the encoding of the fabrication notes). */
export const rulesDataUrl = notesDataUrl;

const inRange = (x, key) => typeof x === 'number' && x >= RANGES[key][0] && x <= RANGES[key][1];
/** An optional value that was left empty: nothing, an empty field (NaN or '') or false. */
const absent = (x) => x === undefined || x === null || x === '' || x === false || (typeof x === 'number' && Number.isNaN(x));

/** One net class as entered → plain values; anything that is not an object is an empty row. */
function readClass(row) {
  const src = row !== null && typeof row === 'object' ? row : {};
  const r = {};
  for (const k of ['name', 'kind', 'layer', 'widthMm', 'minWidthMm', 'clearanceMm', 'gapMm', 'uncoupledMm', 'skewMm']) {
    try { r[k] = src[k]; } catch { r[k] = undefined; }
  }
  r.name = cleanText(r.name, NAME_MAX);
  r.layer = r.layer ?? 'any';
  return r;
}

const failed = (errors, invalid, checks) => ({
  ok: false, errors: [...errors], invalid, text: '', rules: [], manual: [], checks, fileName: '', summary: null,
});

/**
 * The rules file from the options (see DEFAULTS; an option left out, or null,
 * takes its default). The optional minimums — padRingMm, silkHeightMm,
 * silkLineMm — are switched off with NaN, '' or false, which is what an empty
 * field of the page gives; the two silkscreen values are off by default.
 *
 * No clearance is written as a rule (see the top of this file): clearOuterMm,
 * clearInnerMm and the clearance of each class go into `manual` and are what
 * the clearance and gap checks use.
 *
 * classes: up to four of { name, kind: 'signal' | 'power' | 'diff', layer:
 * 'any' | 'outer' | 'inner', widthMm, minWidthMm?, clearanceMm, gapMm,
 * uncoupledMm?, skewMm? }; the last three are read for a differential pair only.
 *
 * Returns { ok, text, rules: [{ id, group, name, lines, note }], manual: [what
 * has to be entered in Board Setup by hand], checks: [{ id, status: 'ok' |
 * 'warn' | 'fail', vars }], fileName, summary }. Invalid input gives
 * { ok: false, errors: [message key, …], invalid: [option name, …] } with an
 * empty file; nothing throws. A net class name that is empty, repeated or that
 * the rule syntax cannot carry is such an error, and `checks` then names it.
 */
export function kicadRules(options) {
  const src = options !== null && typeof options === 'object' ? options : {};
  const o = {};
  for (const k of Object.keys(DEFAULTS)) {
    let val;
    try { val = src[k]; } catch { val = undefined; }
    o[k] = val ?? DEFAULTS[k];
  }

  const errors = new Set();
  const invalid = [];
  const bad = (key, error) => { errors.add(error); invalid.push(key); };

  const versionText = typeof o.version === 'string' || typeof o.version === 'number' ? String(o.version) : '';
  const version = VERSIONS.includes(versionText) ? versionText : null;
  if (!version) bad('version', 'kr_option');
  if (typeof o.header !== 'boolean') bad('header', 'kr_option');
  const fabId = FAB_IDS.includes(o.fab) ? o.fab : null;
  if (!fabId) bad('fab', 'kr_option');
  const date = typeof o.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.date) ? o.date : '';

  const need = (key) => { if (!inRange(o[key], key)) bad(key, 'kr_number'); return o[key]; };
  const maybe = (key) => {
    if (absent(o[key])) return null;
    if (!inRange(o[key], key)) { bad(key, 'kr_number'); return null; }
    return o[key];
  };
  const f = {
    trackOuterMm: need('trackOuterMm'),
    trackInnerMm: need('trackInnerMm'),
    clearOuterMm: need('clearOuterMm'),
    clearInnerMm: need('clearInnerMm'),
    viaHoleMm: need('viaHoleMm'),
    viaDiaMm: need('viaDiaMm'),
    viaRingMm: need('viaRingMm'),
    padHoleMm: need('padHoleMm'),
    padRingMm: maybe('padRingMm'),
    holeToHoleMm: need('holeToHoleMm'),
    edgeMm: need('edgeMm'),
    silkHeightMm: maybe('silkHeightMm'),
    silkLineMm: maybe('silkLineMm'),
  };
  // A via cannot be narrower than its own hole.
  if (inRange(f.viaHoleMm, 'viaHoleMm') && inRange(f.viaDiaMm, 'viaDiaMm') && f.viaDiaMm <= f.viaHoleMm + EPS) bad('viaDiaMm', 'kr_viaDia');

  let asked = [];
  if (Array.isArray(o.classes)) asked = Array.from(o.classes.slice(0, MAX_CLASSES), readClass);
  else bad('classes', 'kr_option');

  const nameRows = [];
  const seen = new Set();
  const classes = asked.map((c, i) => {
    const at = `classes[${i}]`;
    if (!KINDS.includes(c.kind)) bad(`${at}.kind`, 'kr_option');
    if (!LAYERS.includes(c.layer)) bad(`${at}.layer`, 'kr_option');
    const value = (key, required) => {
      if (absent(c[key])) { if (required) bad(`${at}.${key}`, 'kr_number'); return null; }
      if (!inRange(c[key], key)) { bad(`${at}.${key}`, 'kr_number'); return null; }
      return c[key];
    };
    const diff = c.kind === 'diff';
    const widthMm = value('widthMm', true);
    const minWidthMm = value('minWidthMm', false);
    const clearanceMm = value('clearanceMm', true);
    const gapMm = diff ? value('gapMm', true) : null;
    const uncoupledMm = diff ? value('uncoupledMm', false) : null;
    const skewMm = diff ? value('skewMm', false) : null;
    if (widthMm !== null && minWidthMm !== null && minWidthMm > widthMm + EPS) bad(`${at}.minWidthMm`, 'kr_minWidth');

    // Names are compared without regard to case: two classes that differ only
    // in case would be one class to a condition that does not distinguish them.
    const key = c.name.toLowerCase();
    let problem = null;
    if (!c.name) problem = 'empty';
    else if (FORBIDDEN.test(c.name)) problem = 'chars';
    else if (seen.has(key)) problem = 'duplicate';
    else seen.add(key);
    if (problem) nameRows.push({ row: i + 1, name: c.name, problem });

    return { name: c.name, kind: c.kind, layer: c.layer, widthMm, minWidthMm, clearanceMm, gapMm, uncoupledMm, skewMm };
  });

  const namesCheck = asked.length
    ? { id: 'names', status: nameRows.length ? 'fail' : 'ok', vars: { count: asked.length, rows: nameRows } }
    : null;
  for (const r of nameRows) bad(`classes[${r.row - 1}].name`, 'kr_names');

  if (errors.size) return failed(errors, invalid, namesCheck ? [namesCheck] : []);

  // ---- Where the fabricator minimums come from ----
  const fab = fabId === 'custom' ? null : fabById(fabId);
  const preset = fab ? fabPreset(fabId) : null;
  // The preset is named as the source only while every value it fills is still its own.
  const untouched = !!preset && Object.keys(preset).every((k) => typeof f[k] === 'number' && Math.abs(f[k] - preset[k]) < EPS);
  const source = untouched ? fabId : 'custom';

  // ---- Rules ----
  const rules = [];
  const add = (id, group, name, { layer = null, condition = null, constraints, note = [] }) => {
    const body = [
      layer && `(layer ${layer})`,
      condition && `(condition "${condition}")`,
      ...constraints.map((c) => `(constraint ${c})`),
    ].filter(Boolean);
    const lines = [`(rule "${name}"`, ...body.map((b) => `    ${b}`)];
    lines[lines.length - 1] += ')';
    rules.push({ id, group, name, lines, note });
  };
  const min = (type, x) => `${type} (min ${mm(x)})`;

  add('trackOuter', 'fab', 'Fab: minimum track width, outer layers', { layer: 'outer', constraints: [min('track_width', f.trackOuterMm)] });
  add('trackInner', 'fab', 'Fab: minimum track width, inner layers', { layer: 'inner', constraints: [min('track_width', f.trackInnerMm)] });
  // No clearance rule here: see the top of this file and `manual` below.
  add('viaHole', 'fab', 'Fab: minimum via hole', { condition: "A.Type == 'Via'", constraints: [min('hole_size', f.viaHoleMm)] });
  add('viaDia', 'fab', 'Fab: minimum via diameter', { constraints: [min('via_diameter', f.viaDiaMm)] });
  add('viaRing', 'fab', 'Fab: minimum annular ring, vias', { condition: "A.Type == 'Via'", constraints: [min('annular_width', f.viaRingMm)] });
  add('padHole', 'fab', 'Fab: minimum plated hole, pads', { condition: "A.Type == 'Pad' && A.isPlated()", constraints: [min('hole_size', f.padHoleMm)] });
  if (f.padRingMm !== null) {
    add('padRing', 'fab', 'Fab: minimum annular ring, plated pads', { condition: "A.Type == 'Pad' && A.isPlated()", constraints: [min('annular_width', f.padRingMm)] });
  }
  add('holeToHole', 'fab', 'Fab: minimum hole to hole distance', { constraints: [min('hole_to_hole', f.holeToHoleMm)] });
  add('edge', 'fab', 'Fab: minimum copper to board edge clearance', { constraints: [min('edge_clearance', f.edgeMm)] });
  const silk = [
    f.silkHeightMm !== null && min('text_height', f.silkHeightMm),
    f.silkLineMm !== null && min('text_thickness', f.silkLineMm),
  ].filter(Boolean);
  if (silk.length) {
    add('silkFront', 'fab', 'Fab: minimum silkscreen text, front', { layer: '"F.Silkscreen"', constraints: silk });
    add('silkBack', 'fab', 'Fab: minimum silkscreen text, back', { layer: '"B.Silkscreen"', constraints: silk });
  }

  const inClass = (name) => (version === '8' ? `A.NetClass == '${name}'` : `A.hasNetclass('${name}')`);
  classes.forEach((c, i) => {
    const group = `class${i + 1}`;
    const condition = inClass(c.name);
    const layer = c.layer === 'any' ? null : c.layer;
    const least = c.minWidthMm ?? c.widthMm;
    add(`${group}Width`, group, `Class ${c.name}: track width`, { layer, condition, constraints: [`track_width (min ${mm(least)}) (opt ${mm(c.widthMm)})`] });
    // No clearance rule: the clearance of the class is entered in the net class table (see `manual`).
    if (c.kind !== 'diff') return;
    add(`${group}Gap`, group, `Class ${c.name}: differential pair gap`, { layer, condition, constraints: [`diff_pair_gap (min ${mm(c.gapMm)}) (opt ${mm(c.gapMm)})`] });
    if (c.uncoupledMm !== null) {
      add(`${group}Uncoupled`, group, `Class ${c.name}: differential pair uncoupled length`, { condition, constraints: [`diff_pair_uncoupled (max ${mm(c.uncoupledMm)})`] });
    }
    if (c.skewMm !== null) {
      // 8.0 defines skew against the average length of the matched nets, 9.0
      // and 10.0 against the longest one: for two nets the first is half the second.
      const limit = version === '8' ? c.skewMm / 2 : c.skewMm;
      const note = ['Skew is measured across all nets this rule matches: keep one pair per net class.'];
      if (version === '8') {
        note.push(`KiCad 8 measures skew from the average length of the matched nets: ${num(c.skewMm)} mm`,
          `between the two tracks of the pair is ${num(limit)} mm from their average.`);
      }
      add(`${group}Skew`, group, `Class ${c.name}: differential pair skew`, { condition, constraints: [`skew (max ${mm(limit)})`], note });
    }
  });

  // ---- Checks ----
  const below = (x, limit) => x < limit - EPS;
  const fabLimit = (outer, inner, layer) => (layer === 'outer' ? outer : layer === 'inner' ? inner : Math.max(outer, inner));
  // The minimum clearance that goes into Board Setup: one value for all layers, so the larger of the two.
  const floorMm = Math.max(f.clearOuterMm, f.clearInnerMm);
  const checks = [];
  const check = (id, status, vars = {}) => checks.push({ id, status, vars });
  if (namesCheck) checks.push(namesCheck);
  if (classes.length) {
    const narrow = classes.map((c) => ({ name: c.name, layer: c.layer, valueMm: c.minWidthMm ?? c.widthMm, limitMm: fabLimit(f.trackOuterMm, f.trackInnerMm, c.layer) }))
      .filter((r) => below(r.valueMm, r.limitMm));
    check('width', narrow.length ? 'fail' : 'ok', { count: classes.length, rows: narrow });
    // What KiCad will enforce: the minimum clearance of Board Setup is one value for
    // all layers and a floor under every net class, whatever its layer setting here.
    const close = classes.map((c) => ({ name: c.name, valueMm: c.clearanceMm, limitMm: floorMm })).filter((r) => below(r.valueMm, r.limitMm));
    check('clearance', close.length ? 'fail' : 'ok', { count: classes.length, floorMm, rows: close });
    const pairs = classes.filter((c) => c.kind === 'diff');
    if (pairs.length) {
      // The two tracks of a pair are different nets: their gap has to satisfy
      // the Board Setup floor and the clearance of the pair's own class.
      const tight = pairs.map((c) => ({ name: c.name, valueMm: c.gapMm, limitMm: Math.max(floorMm, c.clearanceMm), by: c.clearanceMm > floorMm ? 'class' : 'fab' }))
        .filter((r) => below(r.valueMm, r.limitMm));
      check('gap', tight.length ? 'fail' : 'ok', { count: pairs.length, floorMm, rows: tight });
    }
  }
  const ringMm = (f.viaDiaMm - f.viaHoleMm) / 2;
  check('viaRing', below(ringMm, f.viaRingMm) ? 'warn' : 'ok', {
    ringMm, limitMm: f.viaRingMm, holeMm: f.viaHoleMm, diaMm: f.viaDiaMm, needMm: f.viaHoleMm + 2 * f.viaRingMm,
  });

  // ---- What Board Setup needs by hand ----
  // The constraints of Board Setup are absolute minimums, so each takes the
  // smallest value the rules above allow anywhere. The clearance is the
  // exception: the file has no rule for it, Board Setup holds one value for all
  // layers, so it takes the larger of the two (`floorMm`).
  const manual = [
    { place: 'constraints', id: 'clearance', valueMm: floorMm },
    { place: 'constraints', id: 'track', valueMm: Math.min(f.trackOuterMm, f.trackInnerMm) },
    { place: 'constraints', id: 'ring', valueMm: Math.min(f.viaRingMm, f.padRingMm ?? f.viaRingMm) },
    { place: 'constraints', id: 'viaDia', valueMm: f.viaDiaMm },
    { place: 'constraints', id: 'hole', valueMm: Math.min(f.viaHoleMm, f.padHoleMm) },
    { place: 'constraints', id: 'holeToHole', valueMm: f.holeToHoleMm },
    { place: 'constraints', id: 'edge', valueMm: f.edgeMm },
    f.silkHeightMm !== null && { place: 'constraints', id: 'silkHeight', valueMm: f.silkHeightMm },
    f.silkLineMm !== null && { place: 'constraints', id: 'silkLine', valueMm: f.silkLineMm },
    ...classes.map((c) => ({ place: 'netclass', name: c.name, kind: c.kind, layer: c.layer, clearanceMm: c.clearanceMm, widthMm: c.widthMm, gapMm: c.gapMm })),
  ].filter(Boolean);

  // ---- The file ----
  const out = ['(version 1)'];
  if (o.header) {
    out.push(
      `# Custom design rules for KiCad ${version}${date ? `, written on ${date}` : ''} by Umay PCB Toolkit.`,
      `# Syntax: KiCad PCB Editor manual ${MANUAL[version]}, "Custom design rules". All values in mm.`,
      untouched
        ? `# Fabricator minimums: ${fab.name} (capability data read ${fab.accessed});`
        : `# Fabricator minimums: entered by hand${fab ? `, starting from the ${fab.name} preset` : ''}.`,
    );
    if (untouched) out.push(`# hole to hole${silk.length ? ', board edge and silkscreen' : ' and board edge'} values are not from that data.`);
    out.push(
      `#   track width ${num(f.trackOuterMm)} mm outer / ${num(f.trackInnerMm)} mm inner`,
      `#   via hole ${num(f.viaHoleMm)} mm; via diameter ${num(f.viaDiaMm)} mm; via annular ring ${num(f.viaRingMm)} mm`,
      `#   plated pad hole ${num(f.padHoleMm)} mm${f.padRingMm !== null ? `; pad annular ring ${num(f.padRingMm)} mm` : ''}`,
      `#   hole to hole ${num(f.holeToHoleMm)} mm; copper to board edge ${num(f.edgeMm)} mm`,
    );
    if (silk.length) {
      out.push(`#   silkscreen text: ${[f.silkHeightMm !== null && `height ${num(f.silkHeightMm)} mm`, f.silkLineMm !== null && `line thickness ${num(f.silkLineMm)} mm`].filter(Boolean).join('; ')}`);
    }
    out.push(`#   clearance ${num(f.clearOuterMm)} mm outer / ${num(f.clearInnerMm)} mm inner: entered in Board Setup, not a rule in this file`);
    for (const c of classes) {
      out.push(`# Net class ${c.name} (${KIND_WORD[c.kind]}; ${LAYER_WORD[c.layer]}): ${[
        `track width ${num(c.widthMm)} mm`,
        c.minWidthMm !== null && `minimum ${num(c.minWidthMm)} mm`,
        c.gapMm !== null && `gap ${num(c.gapMm)} mm`,
        c.uncoupledMm !== null && `uncoupled ${num(c.uncoupledMm)} mm`,
        c.skewMm !== null && `skew ${num(c.skewMm)} mm`,
        `clearance ${num(c.clearanceMm)} mm (net class table)`,
      ].filter(Boolean).join('; ')}`);
    }
    out.push(
      '# KiCad tries the rules from the last one to the first and uses the first that matches:',
      '# a net class rule takes the place of the fabricator rule for the nets of its class.',
      '# Clearances are entered in Board Setup: a custom clearance rule would replace the net class clearances.',
      '# Net classes and the board-wide constraints are entered in Board Setup, not in this file.',
    );
  }
  let group = null;
  for (const r of rules) {
    out.push('');
    if (r.group !== group) {
      group = r.group;
      const c = group === 'fab' ? null : classes[Number(group.slice(5)) - 1];
      out.push(c ? `# Net class ${c.name}: ${KIND_WORD[c.kind]}; ${LAYER_WORD[c.layer]}` : '# Fabricator minimums');
    }
    out.push(...r.note.map((line) => `# ${line}`), ...r.lines);
  }
  const text = `${out.join('\n')}\n`;
  const fileName = `kicad-rules-${source}.kicad_dru`;

  return {
    ok: true,
    text,
    rules,
    manual,
    checks,
    fileName,
    summary: {
      count: rules.length,
      version,
      manual: MANUAL[version],
      classes: classes.length,
      pairs: classes.filter((c) => c.kind === 'diff').length,
      source,
      fab: fab ? { id: fab.id, name: fab.name, service: fab.service, accessed: fab.accessed } : null,
      date,
      warnings: checks.filter((c) => c.status !== 'ok').length,
      fileName,
    },
  };
}
