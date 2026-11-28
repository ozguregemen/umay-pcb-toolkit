// Fabrication notes generator (src/engine/fabnotes.js, src/pages/fabnotes.js).
// The notes are text, so the tests read them: which lines exist, what they say,
// and that nothing a user types can break the block, the page or the download.

import { eq, ok } from '../assert.js';
import {
  fabNotes, cleanText, notesFileName, notesDataUrl,
  DEFAULTS, RANGES, RULES, CHECK_CASES, COPPER_UM, COPPER_OZ, TG_C, FINISHES, MASK_COLOURS, LEGEND_COLOURS,
  VIAS, MATERIALS, SIDES, DELIVERIES, MARKINGS, DATA_FORMATS, LAYERS_MAX, MAX_ROWS, TEXT_MAX,
} from '../../src/engine/fabnotes.js';
import { registerStrings, setLang, getLang } from '../../src/i18n.js';
import { parseNumber } from '../../src/ui/calculator.js';
import page from '../../src/pages/fabnotes.js';

registerStrings(page.strings);

// ---- Engine helpers ----
const base = fabNotes({});
const ids = (r) => r.notes.map((n) => n.id).join();
const note = (r, id) => r.notes.find((n) => n.id === id)?.text;
const byId = (r) => new Map(r.notes.map((n) => [n.id, n.text]));
/** Ids of the notes that differ from the default block (changed, added or removed), sorted. */
function changed(options, from = base) {
  const a = byId(from);
  const b = byId(fabNotes(options));
  return [...new Set([...a.keys(), ...b.keys()])].filter((id) => a.get(id) !== b.get(id)).sort().join();
}
const check = (r, id) => r.checks.find((c) => c.id === id);
const kase = (options, id) => check(fabNotes(options), id)?.vars.case;
const status = (options, id) => check(fabNotes(options), id)?.status;
const err = (r) => (r.ok ? 'ok' : r.errors.join());

/** The block is a title line and then notes numbered 1, 2, 3 … with nothing else in between. */
function wellNumbered(r) {
  const lines = r.text.split('\n');
  if (lines.length !== r.notes.length + 1 || lines[0] !== r.title) return false;
  return r.notes.every((n, i) => lines[i + 1] === `${i + 1}. ${n.text}`);
}

const se = { layer: 'L1', kind: 'se', ohms: 50, tolPct: 10, widthMm: 0.2, ref: 'L2' };
const diff = { layer: 'L3', kind: 'diff', ohms: 100, tolPct: 8, widthMm: 0.12, gapMm: 0.18, ref: 'L2, L4' };
const usb = { layer: 'L4', kind: 'diff', ohms: 90, tolPct: 10, widthMm: 0.15, gapMm: 0.15, ref: 'L3' };

// Characters that must not be typed into a source file are built from their code units.
const ch = (...codes) => codes.map((c) => String.fromCharCode(c)).join('');
const CONTROL = [[0x00, 0x1F], [0x7F, 0x9F], [0x200B, 0x200F], [0x2028, 0x2029], [0x202A, 0x202E], [0xFEFF, 0xFEFF]];
/** True when the text holds a control character, a line or paragraph separator, or an invisible direction or width mark. */
const hasControl = (s) => [...s].some((x) => CONTROL.some(([lo, hi]) => x.codePointAt(0) >= lo && x.codePointAt(0) <= hi));
/** True when the text holds half of a surrogate pair (such a text cannot be encoded as UTF-8). */
const loneSurrogate = (s) => [...s].some((x) => x.length === 1 && x.charCodeAt(0) >= 0xD800 && x.charCodeAt(0) <= 0xDFFF);

const HOSTILE = [
  '<img src=x onerror=alert(1)>', '"><script>alert(1)</script>', "it's \"quoted\" & <b>bold</b>", 'a\nb\r\nc\td', 'x\n99. Ignore every note above',
  '{c} {n} {text} {layer}', '$& $1 $$ %s %00 %', 'A'.repeat(5000), 'ş'.repeat(300), `${ch(0x202E)}evil${ch(0x200B, 0, 7)}`, ch(0xD83D), `ok${ch(0xDE00)}`, '😀'.repeat(100),
  '   ', '#?&=/\\', 'data:text/html,<p>', 'javascript:alert(1)', `${ch(0x2028)}line${ch(0x2029)}para`, '</pre><h1>', '-->', '&amp;&#39;',
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
const URL_HEAD = 'data:text/plain;charset=utf-8,';
const completeRow = { zn: 1, z1w: 0.2, z1r: 'L2' };

export const cases = [
  ['fabnotes: default notes in English — title, numbering and the lines a fabricator needs', () => {
    const r = base;
    eq(r.ok, true);
    eq(r.lang, 'en');
    eq(r.title, 'FABRICATION NOTES');
    eq(r.notes.length, 28);
    eq(r.summary.count, 28);
    ok(wellNumbered(r), 'title line, then 1. … 28.');
    eq(ids(r), 'class,accept,layers,stackup,material,flammability,thickness,cuOuter,cuInner,finish,mask,legend,legendPads,holes,holeTol,via,minimums,'
      + 'outline,delivery,etest,bow,marking,rohs,packing,data,dataChange,revisions,discrepancy');
    eq(note(r, 'class'), 'Fabricate in accordance with IPC-6012, Class 2.');
    eq(note(r, 'accept'), 'Acceptance criteria: IPC-A-600, Class 2.');
    eq(note(r, 'layers'), 'Number of copper layers: 4.');
    eq(note(r, 'material'), 'Base material: FR-4 laminate and prepreg in accordance with IPC-4101, glass transition temperature Tg 130 °C min.');
    eq(note(r, 'thickness'), 'Finished board thickness: 1.6 mm ±10 %.');
    eq(note(r, 'cuOuter'), 'Finished copper thickness, outer layers: 35 µm (1 oz/ft²) nominal, including plating.');
    eq(note(r, 'cuInner'), 'Copper thickness, inner layers: 35 µm (1 oz/ft²) nominal.');
    eq(note(r, 'holeTol'), 'Hole diameter tolerance: plated holes ±0.075 mm; non-plated holes ±0.05 mm.');
    eq(note(r, 'minimums'), 'Design minimums, for information: trace width 0.15 mm; spacing 0.15 mm; finished hole diameter 0.3 mm.');
    eq(note(r, 'bow'), 'Bow and twist: 0.75 % max.');
    ok(note(r, 'finish').includes('(ENIG) in accordance with IPC-4552'), 'finish');
    ok(note(r, 'legendPads').startsWith('No legend ink on pads'), 'legend on pads');
    ok(note(r, 'dataChange').startsWith('Do not change the supplied data without written approval, except'), 'data integrity');
    // One requirement per note: one line each, a full stop at the end, no placeholder left.
    for (const n of r.notes) ok(!/[\n\r{}]|undefined|NaN/.test(n.text) && n.text.endsWith('.') && n.text === n.text.trim(), n.id);
    // No options, undefined and null all mean "the defaults".
    eq(fabNotes().text, r.text);
    eq(fabNotes(null).text, r.text);
    eq(fabNotes({ layers: undefined, finish: null }).text, r.text);
    eq(fabNotes({ ...DEFAULTS }).text, r.text);
    eq(JSON.stringify(r.summary), JSON.stringify({
      count: 28, layers: 4, thicknessMm: 1.6, finish: 'enig', warnings: 1, impedanceAsked: 0, impedanceRows: 0,
      standards: ['IPC-6012', 'IPC-A-600', 'IPC-4101', 'UL 94', 'IPC-4552', 'IPC-SM-840', 'IPC-4761', 'IPC-9252', '2011/65/EU', 'IPC-1601'],
      fileName: 'fab-notes.txt',
    }));
  }],

  ['fabnotes: default notes in Turkish — the same notes, Turkish wording and decimal comma', () => {
    const r = fabNotes({ lang: 'tr' });
    eq(r.ok, true);
    eq(r.lang, 'tr');
    eq(r.title, 'ÜRETİM NOTLARI');
    eq(ids(r), ids(base), 'the same notes in the same order');
    ok(wellNumbered(r), 'numbering');
    eq(note(r, 'class'), 'Kart, IPC-6012 Sınıf 2 gereklerine uygun olarak üretilecektir.');
    eq(note(r, 'layers'), 'Bakır katman sayısı: 4.');
    eq(note(r, 'material'), "Taban malzemesi: IPC-4101'e uygun FR-4 laminat ve prepreg; camsı geçiş sıcaklığı Tg en az 130 °C.");
    eq(note(r, 'thickness'), 'Bitmiş kart kalınlığı: 1,6 mm ±%10.');
    eq(note(r, 'cuOuter'), 'Dış katmanlarda bitmiş bakır kalınlığı: nominal 35 µm (1 oz/ft²), kaplama dahil.');
    eq(note(r, 'holeTol'), 'Delik çapı toleransı: kaplamalı deliklerde ±0,075 mm; kaplamasız deliklerde ±0,05 mm.');
    eq(note(r, 'minimums'), 'Tasarımdaki en küçük değerler (bilgi için): iz genişliği 0,15 mm; iz aralığı 0,15 mm; bitmiş delik çapı 0,3 mm.');
    eq(note(r, 'bow'), 'Eğilme ve burulma: en çok %0,75.');
    for (const word of ['Yüzey kaplaması:', 'Lehim maskesi:', 'Serigrafi:', 'Delik çapı toleransı:', 'Elektriksel test:', 'Katman dizilimi:', 'Paketleme:']) {
      ok(r.text.includes(word), word);
    }
    // No English sentence is left in the Turkish block, and no decimal point in a number with a unit.
    ok(!/\b(in accordance|shall|the |and |with |not |Vias:|Legend|Board)\b/.test(r.text), 'English left in the Turkish notes');
    ok(!/\d\.\d+ (mm|%|µm)/.test(r.text) && !/%\d+\.\d/.test(r.text), 'decimal point in a Turkish number');
    // Every Turkish note differs from the English one; the same standards are named.
    r.notes.forEach((n, i) => ok(n.text !== base.notes[i].text, n.id));
    eq(r.summary.standards.join(), base.summary.standards.join());
    eq(r.summary.fileName, 'uretim-notlari.txt');
    // Half an ounce is written with a comma as well.
    ok(note(fabNotes({ lang: 'tr', innerCuUm: 18 }), 'cuInner').includes('18 µm (0,5 oz/ft²)'), '0,5 oz');
    ok(note(fabNotes({ innerCuUm: 18 }), 'cuInner').includes('18 µm (0.5 oz/ft²)'), '0.5 oz');
  }],

  ['fabnotes: each option changes exactly the notes it should', () => {
    const table = [
      [{ ipcClass: 3 }, 'accept,class'],
      [{ ipcClass: 1 }, 'accept,class'],
      [{ layers: 6 }, 'layers'],
      [{ layers: 2 }, 'cuInner,layers,material,stackup'],
      [{ layers: 1 }, 'cuInner,cuOuter,holeTol,layers,material,stackup,via'],
      [{ thicknessMm: 1 }, 'thickness'],
      [{ thicknessTolPct: 8 }, 'thickness'],
      [{ stackup: 'drawing' }, 'stackup'],
      [{ material: 'mid' }, 'material'],
      [{ halogenFree: true }, 'material'],
      [{ material: 'other', materialText: 'Rogers RO4350B' }, 'material'],
      [{ materialText: 'ignored for FR-4' }, ''],
      [{ ul94v0: false }, 'flammability'],
      [{ outerCuUm: 70 }, 'cuOuter'],
      [{ innerCuUm: 18 }, 'cuInner'],
      [{ finish: 'hasl' }, 'finish'],
      [{ hardGold: true }, 'finish,gold'],
      [{ maskSides: 'top' }, 'mask,via'],
      [{ maskSides: 'none' }, 'mask,via'],
      [{ maskColour: 'blue' }, 'mask'],
      [{ legendSides: 'bottom' }, 'legend'],
      [{ legendSides: 'none' }, 'legend,legendPads'],
      [{ legendColour: 'yellow' }, 'legend'],
      [{ minHoleMm: 0.25 }, 'minimums'],
      [{ pthTolMm: 0.05 }, 'holeTol'],
      [{ npthTolMm: 0.1 }, 'holeTol'],
      [{ via: 'open' }, 'via'],
      [{ via: 'plug' }, 'via'],
      [{ via: 'fill' }, 'via'],
      [{ viaInPad: true }, ''],
      [{ minTraceMm: 0.1 }, 'minimums'],
      [{ minSpaceMm: 0.2 }, 'minimums'],
      [{ impedance: [se] }, 'imp1,impAdjust,impApprove,impCoupon'],
      [{ impedanceAdjustPct: 5 }, ''],
      [{ outlineTolMm: 0.2 }, 'outline'],
      [{ delivery: 'fab' }, 'delivery,separation,xouts'],
      [{ delivery: 'drawn' }, 'delivery,separation,xouts'],
      [{ separation: 'vscore' }, ''],
      [{ xouts: true }, ''],
      [{ etest: false }, 'etest'],
      [{ bowTwistPct: 1.5 }, 'bow'],
      [{ marking: 'copper' }, 'marking'],
      [{ rohs: false }, 'rohs'],
      [{ vacuumPack: false }, 'packing'],
      [{ dataFormat: 'odb' }, 'data'],
      [{ name: 'ABC-123', rev: 'B' }, ''],
    ];
    for (const [options, want] of table) eq(changed(options), want, JSON.stringify(options));
    // Every option of DEFAULTS is exercised above (the language is the other test).
    const used = new Set(table.flatMap(([o]) => Object.keys(o)));
    eq(Object.keys(DEFAULTS).filter((k) => k !== 'lang' && !used.has(k)).join(), '', 'options without a row in the table');
    // The dependent options change their own note once the thing they belong to is there.
    const panel = fabNotes({ delivery: 'fab' });
    eq(changed({ delivery: 'fab', separation: 'vscore' }, panel), 'separation');
    eq(changed({ delivery: 'fab', xouts: true }, panel), 'xouts');
    eq(changed({ impedance: [se], impedanceAdjustPct: 5 }, fabNotes({ impedance: [se] })), 'impAdjust');
    eq(changed({ via: 'fill', viaInPad: true }, fabNotes({ via: 'fill' })), 'via');
    eq(changed({ hardGold: true, ipcClass: 3 }, fabNotes({ hardGold: true })), 'accept,class,gold');
    // The name and revision go into the title line only.
    eq(fabNotes({ name: 'ABC-123', rev: 'B' }).title, 'FABRICATION NOTES - ABC-123, REV B');
    eq(fabNotes({ name: 'ABC-123' }).title, 'FABRICATION NOTES - ABC-123');
    eq(fabNotes({ rev: 'B' }).title, 'FABRICATION NOTES - REV B');
    eq(fabNotes({ rev: 3 }).title, 'FABRICATION NOTES - REV 3');
    eq(fabNotes({ lang: 'tr', name: 'ABC-123', rev: 'B' }).title, 'ÜRETİM NOTLARI - ABC-123, REV B');
    ok(wellNumbered(fabNotes({ name: 'ABC-123', rev: 'B' })), 'the title is the first line');
  }],

  ['fabnotes: one- and two-layer boards have no inner copper, no stack-up and (single-sided) no plated holes or vias', () => {
    const one = fabNotes({ layers: 1 });
    const two = fabNotes({ layers: 2 });
    eq(ids(one), 'class,accept,layers,material,flammability,thickness,cuOuter,finish,mask,legend,legendPads,holes,holeTol,minimums,'
      + 'outline,delivery,etest,bow,marking,rohs,packing,data,dataChange,revisions,discrepancy');
    eq(ids(two), 'class,accept,layers,material,flammability,thickness,cuOuter,finish,mask,legend,legendPads,holes,holeTol,via,minimums,'
      + 'outline,delivery,etest,bow,marking,rohs,packing,data,dataChange,revisions,discrepancy');
    eq(note(one, 'layers'), 'Number of copper layers: 1 (single-sided board).');
    eq(note(two, 'layers'), 'Number of copper layers: 2 (double-sided board).');
    eq(note(one, 'cuOuter'), 'Copper thickness: 35 µm (1 oz/ft²) nominal.');
    eq(note(two, 'cuOuter'), note(base, 'cuOuter'));
    eq(note(one, 'holeTol'), 'Hole diameter tolerance: ±0.05 mm (all holes are non-plated).');
    ok(!/inner|prepreg|[Ss]tack-up|plated holes ±|Vias/.test(one.text), 'single-sided text');
    ok(!/inner|prepreg|[Ss]tack-up/.test(two.text) && two.text.includes('Vias:'), 'double-sided text');
    ok(base.text.includes('prepreg') && fabNotes({ layers: 3 }).text.includes('inner layers'), 'three layers and more');
    for (const lang of ['tr']) {
      const t1 = fabNotes({ layers: 1, lang });
      eq(note(t1, 'layers'), 'Bakır katman sayısı: 1 (tek yüzlü kart).');
      eq(note(fabNotes({ layers: 2, lang }), 'layers'), 'Bakır katman sayısı: 2 (çift yüzlü kart).');
      ok(!/İç katman|prepreg|Katman dizilimi|Vialar|kaplamalı deliklerde/.test(t1.text), 'Turkish single-sided text');
    }
    // What does not exist is not looked at: garbage in those options changes nothing.
    eq(fabNotes({ layers: 1, pthTolMm: NaN, innerCuUm: 35, via: 'fill', viaInPad: true, stackup: 'drawing' }).text, one.text);
    eq(fabNotes({ layers: 2, innerCuUm: 105, stackup: 'drawing' }).text, two.text);
    // …and gives no check: no stack-up, aspect-ratio or via point on a single-sided board.
    eq(one.checks.map((c) => c.id).join(), 'class,thin,thicknessTol,copper,marking,etest');
    eq(check(fabNotes({ layers: 2, innerCuUm: 105, minTraceMm: 0.1 }), 'copper').vars.copperUm, 35, 'inner copper of a two-layer board is ignored');
    eq(check(fabNotes({ layers: 4, innerCuUm: 105 }), 'copper').vars.copperUm, 105);
  }],

  ['fabnotes: material — FR-4 by Tg, halogen-free, another material in words, UL 94 V-0', () => {
    eq(`${TG_C.std}/${TG_C.mid}/${TG_C.high}`, '130/150/170');
    for (const m of ['std', 'mid', 'high']) {
      const text = note(fabNotes({ material: m }), 'material');
      ok(text.includes(`Tg ${TG_C[m]} °C min.`) && text.includes('IPC-4101') && !text.includes('halogen'), m);
      ok(note(fabNotes({ material: m, lang: 'tr' }), 'material').includes(`Tg en az ${TG_C[m]} °C`), `${m} tr`);
    }
    eq(note(fabNotes({ halogenFree: true, material: 'high' }), 'material'),
      'Base material: halogen-free FR-4 laminate and prepreg in accordance with IPC-4101, glass transition temperature Tg 170 °C min.');
    ok(note(fabNotes({ halogenFree: true, lang: 'tr' }), 'material').includes('uygun halojensiz FR-4 laminat ve prepreg'), 'halojensiz');
    // No slash sheet is quoted.
    ok(!/IPC-4101\s*\/|\/\d{2,3}\b/.test(base.text.replace('2011/65/EU', '')), 'slash sheet');
    // Another material: the text as typed, and no IPC-4101 claim for it.
    const other = fabNotes({ material: 'other', materialText: '  Rogers RO4350B,  0.508 mm. ', halogenFree: true });
    eq(note(other, 'material'), 'Base material: Rogers RO4350B, 0.508 mm. No substitute without written approval.');
    ok(!other.summary.standards.includes('IPC-4101'), 'no IPC-4101 for another material');
    eq(note(fabNotes({ material: 'other', materialText: 'Isola 370HR', lang: 'tr' }), 'material'), 'Taban malzemesi: Isola 370HR. Yazılı onay olmadan başka malzeme kullanılmayacaktır.');
    // "Other" without a text is an error, not a note with a hole in it.
    for (const text of ['', '   ', '...', '\n\t', undefined, null, 42n, {}, []]) {
      const r = fabNotes({ material: 'other', materialText: text });
      eq(err(r), 'fn_material', String(text));
      eq(r.invalid.join(), 'materialText');
      eq(r.text, '');
    }
    // UL 94 V-0 is its own note and follows any material.
    eq(note(base, 'flammability'), 'Flammability rating of the base material: UL 94 V-0.');
    eq(note(fabNotes({ ul94v0: false }), 'flammability'), undefined);
    ok(!fabNotes({ ul94v0: false }).summary.standards.includes('UL 94') && other.summary.standards.includes('UL 94'), 'UL 94 in the list of standards');
  }],

  ['fabnotes: copper and surface finish — oz equivalents, every finish, hard gold on fingers', () => {
    eq(COPPER_UM.join(), '18,35,70,105');
    eq(COPPER_UM.map((um) => COPPER_OZ[um]).join(), '0.5,1,2,3');
    for (const um of COPPER_UM) {
      ok(note(fabNotes({ outerCuUm: um }), 'cuOuter').includes(`${um} µm (${COPPER_OZ[um]} oz/ft²) nominal, including plating`), `outer ${um}`);
      ok(note(fabNotes({ innerCuUm: um }), 'cuInner').includes(`${um} µm (${COPPER_OZ[um]} oz/ft²) nominal`), `inner ${um}`);
    }
    // A finish names its specification only where one is listed for it.
    const std = { hasl: null, enig: 'IPC-4552', imag: 'IPC-4553', imsn: 'IPC-4554', osp: null, enepig: 'IPC-4556' };
    const words = { hasl: 'HASL', enig: 'ENIG', imag: 'immersion silver', imsn: 'immersion tin', osp: 'OSP', enepig: 'ENEPIG' };
    const wordsTr = { hasl: 'kurşunsuz HASL', enig: 'ENIG', imag: 'daldırma gümüş', imsn: 'daldırma kalay', osp: 'OSP', enepig: 'ENEPIG' };
    eq(FINISHES.join(), Object.keys(std).join());
    for (const f of FINISHES) {
      const r = fabNotes({ finish: f });
      const text = note(r, 'finish');
      ok(text.startsWith('Surface finish: ') && text.endsWith(' on all exposed copper.') && text.includes(words[f]), `${f}: ${text}`);
      const named = text.match(/IPC-\d{4}/g) ?? [];
      eq(named.join(), std[f] ?? '', `${f} names`);
      eq(['IPC-4552', 'IPC-4553', 'IPC-4554', 'IPC-4556'].filter((s) => r.summary.standards.includes(s)).join(), std[f] ?? '', `${f} standards`);
      const tr = note(fabNotes({ finish: f, lang: 'tr' }), 'finish');
      ok(tr.startsWith('Yüzey kaplaması: açıkta kalan bütün bakır yüzeylerde ') && tr.includes(wordsTr[f]) && (!std[f] || tr.includes(std[f])), `${f} tr: ${tr}`);
      eq(r.summary.finish, f);
    }
    ok(note(fabNotes({ finish: 'hasl' }), 'finish').includes('lead-free'), 'HASL is lead-free');
    // Hard gold: the general finish excludes the fingers, and a note of its own follows it.
    const g = fabNotes({ hardGold: true, ipcClass: 3 });
    ok(note(g, 'finish').endsWith('on all exposed copper except the edge-connector fingers.'), 'finish excludes the fingers');
    eq(note(g, 'gold'), 'Edge-connector fingers: electrolytic hard gold over nickel; plating thicknesses in accordance with IPC-6012, Class 3.');
    eq(g.notes.findIndex((n) => n.id === 'gold'), g.notes.findIndex((n) => n.id === 'finish') + 1);
    ok(note(fabNotes({ hardGold: true, lang: 'tr' }), 'gold').includes('nikel üzerine elektrolitik sert altın'), 'sert altın');
    ok(!/\d\s*(µ|u|micro)/i.test(note(g, 'gold')), 'no gold thickness is quoted');
    eq(note(base, 'gold'), undefined);
  }],

  ['fabnotes: solder mask and legend — sides, colours, none; "no legend ink on pads" whenever there is a legend', () => {
    eq(SIDES.join(), 'both,top,bottom,none');
    const side = { both: 'both sides', top: 'top side only', bottom: 'bottom side only' };
    const sideTr = { both: 'iki yüzde', top: 'yalnızca üst yüzde', bottom: 'yalnızca alt yüzde' };
    for (const s of ['both', 'top', 'bottom']) {
      eq(note(fabNotes({ maskSides: s }), 'mask'), `Solder mask: liquid photoimageable (LPI) in accordance with IPC-SM-840; colour green; ${side[s]}.`);
      eq(note(fabNotes({ legendSides: s }), 'legend'), `Legend (silkscreen): non-conductive ink; colour white; ${side[s]}.`);
      ok(note(fabNotes({ maskSides: s, lang: 'tr' }), 'mask').endsWith(`renk yeşil; ${sideTr[s]}.`), `mask tr ${s}`);
      ok(note(fabNotes({ legendSides: s, lang: 'tr' }), 'legend').endsWith(`renk beyaz; ${sideTr[s]}.`), `legend tr ${s}`);
      ok(fabNotes({ legendSides: s }).text.includes('No legend ink on pads'), `legend on pads ${s}`);
    }
    const names = { green: 'green', mgreen: 'matte green', black: 'black', mblack: 'matte black', blue: 'blue', red: 'red', white: 'white', yellow: 'yellow' };
    const namesTr = { green: 'yeşil', mgreen: 'mat yeşil', black: 'siyah', mblack: 'mat siyah', blue: 'mavi', red: 'kırmızı', white: 'beyaz', yellow: 'sarı' };
    for (const c of MASK_COLOURS) {
      ok(note(fabNotes({ maskColour: c }), 'mask').includes(`; colour ${names[c]}; `), `mask ${c}`);
      ok(note(fabNotes({ maskColour: c, lang: 'tr' }), 'mask').includes(`; renk ${namesTr[c]}; `), `mask tr ${c}`);
    }
    for (const c of LEGEND_COLOURS) {
      ok(note(fabNotes({ legendColour: c }), 'legend').includes(`; colour ${names[c]}; `), `legend ${c}`);
      ok(note(fabNotes({ legendColour: c, lang: 'tr' }), 'legend').includes(`; renk ${namesTr[c]}; `), `legend tr ${c}`);
    }
    // None: stated in words; the colour is not looked at and IPC-SM-840 is not named.
    const bare = fabNotes({ maskSides: 'none', maskColour: 'red', legendSides: 'none', legendColour: 'yellow' });
    eq(note(bare, 'mask'), 'Solder mask: none.');
    eq(note(bare, 'legend'), 'Legend (silkscreen): none.');
    eq(note(bare, 'legendPads'), undefined);
    ok(!bare.summary.standards.includes('IPC-SM-840') && !/\bred\b|\byellow\b|IPC-SM-840/.test(bare.text), 'nothing about a mask that is not there');
    eq(note(fabNotes({ maskSides: 'none', lang: 'tr' }), 'mask'), 'Lehim maskesi: uygulanmayacaktır.');
    eq(note(fabNotes({ legendSides: 'none', lang: 'tr' }), 'legend'), 'Serigrafi: uygulanmayacaktır.');
  }],

  ['fabnotes: via protection — open, tented, plugged, filled and capped; covering follows the solder mask', () => {
    eq(VIAS.join(), 'open,tent,plug,fill');
    eq(note(fabNotes({ via: 'open' }), 'via'), 'Vias: left open, without tenting or plugging; solder mask openings as in the data.');
    eq(note(base, 'via'), 'Vias: tented with solder mask on both sides, as defined in the solder mask data. Reference: IPC-4761.');
    eq(note(fabNotes({ via: 'plug' }), 'via'), 'Vias: plugged and covered with solder mask on both sides. Reference: IPC-4761.');
    eq(note(fabNotes({ via: 'fill' }), 'via'), 'Vias: filled with non-conductive material, planarised and capped with plated copper. Reference: IPC-4761.');
    ok(note(fabNotes({ via: 'fill', viaInPad: true }), 'via').includes('as required for the vias in pads'), 'via-in-pad named');
    // IPC-4761 is named for protected vias only, and no type number is quoted.
    for (const v of VIAS) {
      const r = fabNotes({ via: v });
      eq(r.summary.standards.includes('IPC-4761'), v !== 'open', v);
      ok(!/Type\s+[IVX\d]/i.test(r.text) && !/Tip\s+[IVX\d]/i.test(fabNotes({ via: v, lang: 'tr' }).text), `${v}: no type number`);
      ok(note(fabNotes({ via: v, lang: 'tr' }), 'via').startsWith('Vialar: '), `${v} tr`);
    }
    // Mask on one side only: the vias are covered on that side.
    ok(note(fabNotes({ maskSides: 'top' }), 'via').includes('tented with solder mask on the top side,'), 'top');
    ok(note(fabNotes({ via: 'plug', maskSides: 'bottom' }), 'via').includes('covered with solder mask on the bottom side.'), 'bottom');
    ok(note(fabNotes({ maskSides: 'bottom', lang: 'tr' }), 'via').includes('gibi alt yüzde lehim maskesi ile kapatılacaktır'), 'bottom tr');
    // No mask: tenting and covering are impossible, the note says "left open" and the check warns.
    for (const v of ['tent', 'plug']) {
      const r = fabNotes({ via: v, maskSides: 'none' });
      eq(note(r, 'via'), 'Vias: left open, without plugging or filling.', v);
      eq(check(r, 'viaMask').status, 'warn', v);
      ok(!r.summary.standards.includes('IPC-4761'), v);
      eq(status({ via: v }, 'viaMask'), 'ok', v);
      eq(status({ via: v, maskSides: 'top' }, 'viaMask'), 'ok', v);
    }
    eq(note(fabNotes({ via: 'open', maskSides: 'none' }), 'via'), 'Vias: left open, without plugging or filling.');
    ok(note(fabNotes({ via: 'fill', maskSides: 'none' }), 'via').startsWith('Vias: filled'), 'filling needs no mask');
    eq(check(fabNotes({ via: 'open', maskSides: 'none' }), 'viaMask'), undefined);
    eq(check(fabNotes({ via: 'fill', maskSides: 'none' }), 'viaMask'), undefined);
    // Via-in-pad both ways.
    eq(kase({ via: 'fill', viaInPad: true }, 'viaInPad'), 'match');
    eq(status({ via: 'fill', viaInPad: true }, 'viaInPad'), 'ok');
    eq(kase({ via: 'fill' }, 'viaInPad'), 'noNeed');
    eq(status({ via: 'fill' }, 'viaInPad'), 'warn');
    for (const v of ['open', 'tent', 'plug']) {
      eq(kase({ via: v, viaInPad: true }, 'viaInPad'), 'open', v);
      eq(status({ via: v, viaInPad: true }, 'viaInPad'), 'warn', v);
      eq(check(fabNotes({ via: v }), 'viaInPad'), undefined, v);
    }
  }],

  ['fabnotes: complete impedance rows — one to three rows, then adjustment, stack-up approval and test report', () => {
    const one = fabNotes({ impedance: [se] });
    eq(note(one, 'imp1'), 'Controlled impedance, layer L1: single-ended 50 Ω ±10 %; trace width 0.2 mm as drawn; reference layer(s) L2.');
    eq(note(one, 'impAdjust'), 'The fabricator may adjust the width and gap of the controlled impedance traces by up to ±10 % to meet the targets; larger changes require written approval.');
    ok(note(one, 'impApprove').startsWith('Submit the stack-up') && note(one, 'impApprove').endsWith('for approval before production.'), 'approval');
    ok(/TDR measurement on test coupons; supply the test report with each delivery/.test(note(one, 'impCoupon')), 'coupon and report');
    eq(one.notes.length, 32);
    ok(wellNumbered(one), 'numbering');
    // The impedance notes sit together, after the design minimums and before the outline.
    eq(ids(one).split(',').slice(16, 22).join(), 'minimums,imp1,impAdjust,impApprove,impCoupon,outline');
    eq(one.summary.impedanceRows, 1);
    eq(check(one, 'imp').status, 'ok');
    eq(check(one, 'imp').vars.rows.length, 0);

    const three = fabNotes({ impedance: [se, diff, usb], impedanceAdjustPct: 7.5 });
    eq(note(three, 'imp2'), 'Controlled impedance, layer L3: differential 100 Ω ±8 %; trace width 0.12 mm and gap 0.18 mm as drawn; reference layer(s) L2, L4.');
    eq(note(three, 'imp3'), 'Controlled impedance, layer L4: differential 90 Ω ±10 %; trace width 0.15 mm and gap 0.15 mm as drawn; reference layer(s) L3.');
    ok(note(three, 'impAdjust').includes('by up to ±7.5 %'), 'the stated limit');
    eq(three.notes.length, 34);
    eq(ids(three).split(',').slice(17, 23).join(), 'imp1,imp2,imp3,impAdjust,impApprove,impCoupon');
    eq(three.summary.impedanceRows, 3);
    eq(kase({ impedance: [se, diff, usb] }, 'imp'), 'ok');
    // The gap of a single-ended row is not looked at.
    eq(note(fabNotes({ impedance: [{ ...se, gapMm: NaN }] }), 'imp1'), note(one, 'imp1'));
    eq(note(fabNotes({ impedance: [{ ...se, gapMm: 0.3 }] }), 'imp1'), note(one, 'imp1'));
    // No more than three rows are taken.
    eq(MAX_ROWS, 3);
    eq(fabNotes({ impedance: [se, diff, usb, se, diff] }).text, fabNotes({ impedance: [se, diff, usb] }).text);
    // Turkish.
    const tr = fabNotes({ lang: 'tr', impedance: [se, diff], impedanceAdjustPct: 7.5 });
    eq(note(tr, 'imp1'), 'Kontrollü empedans, L1 katmanı: tek uçlu 50 Ω ±%10; çizimdeki iz genişliği 0,2 mm; referans katman(lar) L2.');
    eq(note(tr, 'imp2'), 'Kontrollü empedans, L3 katmanı: diferansiyel 100 Ω ±%8; çizimdeki iz genişliği 0,12 mm, iz aralığı 0,18 mm; referans katman(lar) L2, L4.');
    ok(note(tr, 'impAdjust').includes('en çok ±%7,5 değiştirebilir'), 'ayar sınırı');
    ok(note(tr, 'impApprove').includes('üretimden önce onaya sunulacaktır') && note(tr, 'impCoupon').includes('test raporu her sevkiyatla birlikte'), 'onay ve rapor');
    // Without rows there is no impedance note and no impedance check at all.
    ok(!/impedance|TDR/i.test(base.text) && check(base, 'imp') === undefined, 'no rows');
    // A two-layer board can carry impedance rows: the approval note asks for the build.
    ok(fabNotes({ layers: 2, impedance: [se] }).text.includes('Submit the stack-up'), 'two layers');
  }],

  ['fabnotes: an incomplete impedance row is left out of the notes and named in the check list', () => {
    const cases = [
      [{ layer: '' }, 'layer'], [{ layer: '  \n ' }, 'layer'], [{ layer: undefined }, 'layer'],
      [{ kind: 'coplanar' }, 'kind'], [{ kind: undefined }, 'kind'],
      [{ ohms: NaN }, 'ohms'], [{ ohms: 0 }, 'ohms'], [{ ohms: -50 }, 'ohms'], [{ ohms: 1e6 }, 'ohms'], [{ ohms: '50' }, 'ohms'],
      [{ tolPct: undefined }, 'tol'], [{ tolPct: 0 }, 'tol'], [{ tolPct: 99 }, 'tol'],
      [{ widthMm: NaN }, 'width'], [{ widthMm: 0 }, 'width'], [{ widthMm: Infinity }, 'width'],
      [{ ref: '' }, 'ref'], [{ ref: null }, 'ref'],
      [{ widthMm: NaN, ref: '' }, 'width,ref'],
      [{ layer: '', ohms: NaN, tolPct: NaN, widthMm: NaN, ref: '' }, 'layer,ohms,tol,width,ref'],
    ];
    for (const [patch, missing] of cases) {
      const r = fabNotes({ impedance: [{ ...se, ...patch }] });
      eq(r.ok, true, JSON.stringify(patch));
      const c = check(r, 'imp');
      eq(c.status, 'warn', JSON.stringify(patch));
      eq(c.vars.rows.map((x) => `${x.row}:${x.missing.join()}`).join(' '), `1:${missing}`, JSON.stringify(patch));
      eq(`${c.vars.asked}/${c.vars.complete}`, '1/0');
      // No complete row: the block is the default block — no half requirement and no impedance notes.
      eq(r.text, base.text, JSON.stringify(patch));
      eq(r.summary.impedanceRows, 0);
    }
    // A differential row needs its gap.
    for (const gapMm of [undefined, NaN, 0, -1, 1e9]) {
      eq(check(fabNotes({ impedance: [{ ...diff, gapMm }] }), 'imp').vars.rows[0].missing.join(), 'gap', String(gapMm));
    }
    // Rows that are not objects are empty rows.
    for (const row of [null, undefined, 5, 'L1', [], () => 1]) {
      const r = fabNotes({ impedance: [row] });
      eq(check(r, 'imp').vars.rows[0].missing.join(), 'layer,kind,ohms,tol,width,ref', String(row));
      eq(r.text, base.text);
    }
    // Mixed: the complete rows stay, numbered in their own order, and the stack-up check sees them.
    const mixed = fabNotes({ impedance: [{ ...se, widthMm: NaN }, diff, { ...usb, ref: ' ' }] });
    eq(mixed.summary.impedanceRows, 1);
    eq(mixed.summary.impedanceAsked, 3);
    ok(note(mixed, 'imp1').includes('layer L3: differential 100 Ω') && note(mixed, 'imp2') === undefined, 'only the complete row');
    eq(check(mixed, 'imp').vars.rows.map((x) => `${x.row}:${x.missing.join()}`).join(' '), '1:width 3:ref');
    eq(check(mixed, 'imp').status, 'warn');
    ok(wellNumbered(mixed), 'numbering');
    eq(kase({ impedance: [{ ...se, widthMm: NaN }, diff] }, 'stackup'), 'approval');
    eq(kase({ impedance: [{ ...se, widthMm: NaN }] }, 'stackup'), 'none');
    // The adjustment limit is needed as soon as rows are asked for, and not before.
    eq(err(fabNotes({ impedance: [se], impedanceAdjustPct: NaN })), 'fn_number');
    eq(fabNotes({ impedance: [se], impedanceAdjustPct: 0 }).invalid.join(), 'impedanceAdjustPct');
    eq(fabNotes({ impedance: [], impedanceAdjustPct: NaN }).text, base.text);
    eq(err(fabNotes({ impedance: 'L1 50 ohm' })), 'fn_option');
    eq(err(fabNotes({ impedance: { 0: se, length: 1 } })), 'fn_option');
  }],

  ['fabnotes: outline, panel and delivery', () => {
    eq(DELIVERIES.join(), 'single,fab,drawn');
    eq(note(base, 'outline'), 'Board outline and cut-out tolerance: ±0.1 mm.');
    eq(note(fabNotes({ outlineTolMm: 0.15, lang: 'tr' }), 'outline'), 'Kart dış hattının ve iç kesimlerin toleransı: ±0,15 mm.');
    eq(note(base, 'delivery'), 'Delivery form: single boards.');
    eq(note(base, 'separation'), undefined);
    eq(note(base, 'xouts'), undefined);
    const fab = fabNotes({ delivery: 'fab' });
    eq(note(fab, 'delivery'), 'Delivery form: panels; panelisation by the fabricator. Submit the panel drawing for approval before production.');
    eq(note(fab, 'separation'), 'Board separation within the panel: routed, with break-off tabs.');
    eq(note(fab, 'xouts'), 'X-outs are not permitted: every panel shall contain good boards only.');
    const drawn = fabNotes({ delivery: 'drawn', separation: 'vscore', xouts: true });
    eq(note(drawn, 'delivery'), 'Delivery form: panels as defined in the supplied data. No change to the panel layout without written approval.');
    eq(note(drawn, 'separation'), 'Board separation within the panel: V-score.');
    eq(note(drawn, 'xouts'), 'X-outs (defective boards in a panel) are permitted if clearly and permanently marked.');
    eq(ids(drawn).split(',').slice(18, 21).join(), 'delivery,separation,xouts');
    const tr = fabNotes({ lang: 'tr', delivery: 'fab', separation: 'vscore', xouts: true });
    ok(note(tr, 'delivery').includes('panelleme üretici tarafından yapılacak'), 'panel tr');
    eq(note(tr, 'separation'), 'Paneldeki kartların ayrılması: V-kesim.');
    ok(note(tr, 'xouts').startsWith('Paneldeki hatalı kartlar (X-out)'), 'x-out tr');
    eq(note(fabNotes({ lang: 'tr' }), 'delivery'), 'Teslim şekli: tekil kart (panelsiz).');
    // The panel options are not looked at for single boards.
    eq(fabNotes({ separation: 'vscore', xouts: true }).text, base.text);
  }],

  ['fabnotes: quality, marking, packing and data', () => {
    eq(note(base, 'etest'), 'Electrical test: 100 % of the boards, for opens and shorts, against the netlist of the supplied data, in accordance with IPC-9252.');
    const off = fabNotes({ etest: false, rohs: false, vacuumPack: false });
    eq(note(off, 'etest'), 'Electrical test: not required.');
    eq(note(off, 'rohs'), undefined);
    eq(note(off, 'packing'), undefined);
    eq(['IPC-9252', '2011/65/EU', 'IPC-1601'].filter((s) => off.summary.standards.includes(s)).join(), '', 'no standard for what is not asked');
    eq(note(fabNotes({ etest: false, lang: 'tr' }), 'etest'), 'Elektriksel test: istenmemektedir.');
    ok(note(fabNotes({ lang: 'tr' }), 'etest').includes("kartların %100'ü") && note(fabNotes({ lang: 'tr' }), 'etest').includes("IPC-9252'ye uygun"), 'test tr');
    eq(note(base, 'rohs'), 'The finished boards shall comply with the RoHS Directive 2011/65/EU as amended.');
    ok(note(fabNotes({ lang: 'tr' }), 'rohs').includes('2011/65/AB sayılı RoHS Direktifi'), 'rohs tr');
    eq(note(base, 'packing'), 'Packing: vacuum-sealed with desiccant; handling, packaging and storage in accordance with IPC-1601.');
    ok(note(fabNotes({ bowTwistPct: 1.5, lang: 'tr' }), 'bow') === 'Eğilme ve burulma: en çok %1,5.', 'bow tr');
    eq(MARKINGS.join(), 'legend,copper,none');
    ok(note(base, 'marking').includes('permitted in legend ink'), 'legend ink');
    ok(note(fabNotes({ marking: 'copper' }), 'marking').includes('permitted in copper on an outer layer'), 'copper');
    eq(note(fabNotes({ marking: 'none' }), 'marking'), "Fabricator's mark and date code: not permitted on the board.");
    eq(note(fabNotes({ marking: 'none', lang: 'tr' }), 'marking'), 'Kartın üzerine üretici işareti veya tarih kodu konmayacaktır.');
    // Marking in legend ink on a board without legend is a point to settle.
    eq(status({}, 'marking'), 'ok');
    eq(status({ legendSides: 'none' }, 'marking'), 'warn');
    eq(status({ legendSides: 'top' }, 'marking'), 'ok');
    eq(check(fabNotes({ legendSides: 'none', marking: 'copper' }), 'marking'), undefined);
    eq(check(fabNotes({ legendSides: 'none', marking: 'none' }), 'marking'), undefined);
    // Data formats, and the standing sentence about changing the data.
    eq(DATA_FORMATS.join(), 'gerber,odb,ipc2581');
    eq(note(base, 'data'), 'Fabrication data supplied: Gerber X2 with Excellon drill files.');
    eq(note(fabNotes({ dataFormat: 'odb' }), 'data'), 'Fabrication data supplied: ODB++.');
    eq(note(fabNotes({ dataFormat: 'ipc2581' }), 'data'), 'Fabrication data supplied: IPC-2581.');
    eq(note(fabNotes({ lang: 'tr' }), 'data'), 'Verilen üretim verisi: Excellon delik dosyalarıyla birlikte Gerber X2.');
    eq(fabNotes({ dataFormat: 'ipc2581' }).summary.standards.includes('IPC-2581'), true);
    for (const f of DATA_FORMATS) {
      for (const lang of ['en', 'tr']) {
        const r = fabNotes({ dataFormat: f, lang });
        eq(ids(r).split(',').slice(-4).join(), 'data,dataChange,revisions,discrepancy', `${f} ${lang}`);
        ok(/without written approval|yazılı onay olmadan/.test(note(r, 'dataChange')), `${f} ${lang}: data integrity`);
      }
    }
  }],

  ['fabnotes: check list — every point both ways, with its threshold', () => {
    // Stack-up: more than two layers and nothing that defines the build → attach a drawing.
    eq(kase({}, 'stackup'), 'none');
    eq(status({}, 'stackup'), 'warn');
    eq(kase({ stackup: 'drawing' }, 'stackup'), 'drawing');
    eq(status({ stackup: 'drawing' }, 'stackup'), 'ok');
    eq(kase({ impedance: [se] }, 'stackup'), 'approval');
    eq(status({ impedance: [se] }, 'stackup'), 'ok');
    eq(kase({ stackup: 'drawing', impedance: [se] }, 'stackup'), 'drawing');
    eq(kase({ layers: 3 }, 'stackup'), 'none');
    eq(check(fabNotes({ layers: 2 }), 'stackup'), undefined);
    // Class 3.
    eq(status({ ipcClass: 3 }, 'class'), 'warn');
    eq(status({ ipcClass: 2 }, 'class'), 'ok');
    eq(status({ ipcClass: 1 }, 'class'), 'ok');
    // Thickness tolerance tighter than the usual 10 %.
    eq(RULES.thicknessTolPct, 10);
    eq(status({ thicknessTolPct: 9.9 }, 'thicknessTol'), 'warn');
    eq(status({ thicknessTolPct: 10 }, 'thicknessTol'), 'ok');
    eq(status({ thicknessTolPct: 20 }, 'thicknessTol'), 'ok');
    // Thickness against the layer count: 0.1 mm per layer, never below 0.2 mm (rule of thumb).
    eq(`${RULES.thicknessPerLayerMm}/${RULES.thicknessMinMm}`, '0.1/0.2');
    const thin = (layers, thicknessMm) => check(fabNotes({ layers, thicknessMm }), 'thin');
    eq(thin(4, 0.4).status, 'ok');
    eq(thin(4, 0.39).status, 'warn');
    eq(thin(4, 0.39).vars.limitMm, 0.4);
    eq(thin(3, 0.3).status, 'ok', '3 layers: the limit is 0.3 mm, not 0.30000000000000004');
    eq(thin(3, 0.3).vars.limitMm, 0.3);
    eq(thin(1, 0.2).status, 'ok');
    eq(thin(1, 0.19).status, 'warn');
    eq(thin(2, 0.15).vars.limitMm, 0.2);
    eq(thin(16, 1.6).status, 'ok');
    eq(thin(16, 1.5).status, 'warn');
    eq(thin(32, 3.2).status, 'ok');
    eq(thin(32, 3.1).vars.limitMm, 3.2);
    // Aspect ratio: board thickness / smallest finished hole above 8:1 (rule of thumb).
    eq(RULES.aspectMax, 8);
    const aspect = (thicknessMm, minHoleMm) => check(fabNotes({ thicknessMm, minHoleMm }), 'aspect');
    eq(aspect(1.6, 0.2).status, 'ok', '8:1 exactly, despite 1.6 / 0.2 = 8.000000000000002');
    eq(aspect(1.6, 0.19).status, 'warn');
    eq(aspect(1.6, 0.3).status, 'ok');
    eq(aspect(2.4, 0.25).status, 'warn');
    ok(Math.abs(aspect(2.4, 0.25).vars.ratio - 9.6) < 1e-9, 'ratio 9.6');
    eq(aspect(0.8, 0.1).status, 'ok');
    eq(check(fabNotes({ layers: 1, thicknessMm: 3, minHoleMm: 0.1 }), 'aspect'), undefined, 'no plated holes on a single-sided board');
    // Heavy copper against the smallest trace width or spacing (typical capability).
    eq(JSON.stringify(RULES.featureMmByCopperUm), '{"18":0.075,"35":0.1,"70":0.2,"105":0.25}');
    const copper = (o) => check(fabNotes(o), 'copper');
    eq(copper({}).status, 'ok');
    eq(copper({ minSpaceMm: 0.1 }).status, 'ok');
    eq(copper({ minSpaceMm: 0.099 }).status, 'warn');
    eq(copper({ minTraceMm: 0.09, minSpaceMm: 0.3 }).status, 'warn', 'the trace width counts as well');
    eq(copper({ outerCuUm: 70 }).status, 'warn');
    eq(copper({ outerCuUm: 70 }).vars.limitMm, 0.2);
    eq(copper({ outerCuUm: 70, minTraceMm: 0.2, minSpaceMm: 0.2 }).status, 'ok');
    eq(copper({ innerCuUm: 105, minTraceMm: 0.2, minSpaceMm: 0.2 }).status, 'warn', 'the thicker of outer and inner copper decides');
    eq(copper({ innerCuUm: 105, minTraceMm: 0.25, minSpaceMm: 0.3 }).status, 'ok');
    eq(copper({ outerCuUm: 18, innerCuUm: 18, minTraceMm: 0.075, minSpaceMm: 0.075 }).status, 'ok');
    eq(copper({ outerCuUm: 18, innerCuUm: 18, minTraceMm: 0.075, minSpaceMm: 0.07 }).status, 'warn');
    eq(copper({ minTraceMm: 0.3, minSpaceMm: 0.12 }).vars.featureMm, 0.12);
    // HASL with fine features (typical guidance); no such point for a flat finish.
    eq(RULES.haslFeatureMm, 0.15);
    eq(status({ finish: 'hasl' }, 'hasl'), 'ok');
    eq(status({ finish: 'hasl', minTraceMm: 0.149 }, 'hasl'), 'warn');
    eq(status({ finish: 'hasl', minSpaceMm: 0.1 }, 'hasl'), 'warn');
    eq(status({ finish: 'hasl', minTraceMm: 0.2, minSpaceMm: 0.2 }, 'hasl'), 'ok');
    for (const f of FINISHES.filter((x) => x !== 'hasl')) eq(check(fabNotes({ finish: f, minTraceMm: 0.08 }), 'hasl'), undefined, f);
    // Electrical test.
    eq(status({}, 'etest'), 'ok');
    eq(status({ etest: false }, 'etest'), 'warn');
    // Summary counts the warnings; the order of the list is fixed.
    eq(base.summary.warnings, 1);
    const worst = fabNotes({
      ipcClass: 3, thicknessMm: 0.3, thicknessTolPct: 5, minHoleMm: 0.05, outerCuUm: 105, finish: 'hasl', minTraceMm: 0.1, via: 'tent',
      viaInPad: true, maskSides: 'none', legendSides: 'none', etest: false, impedance: [{ ...se, ref: '' }],
    });
    eq(worst.checks.map((c) => `${c.id}:${c.status}`).join(' '),
      'imp:warn stackup:warn class:warn thin:warn thicknessTol:warn aspect:ok copper:warn hasl:warn viaInPad:warn viaMask:warn marking:warn etest:warn');
    eq(worst.summary.warnings, 11);
    const best = fabNotes({ stackup: 'drawing', finish: 'hasl', via: 'fill', viaInPad: true, impedance: [se] });
    eq(best.checks.map((c) => `${c.id}:${c.status}`).join(' '),
      'imp:ok stackup:ok class:ok thin:ok thicknessTol:ok aspect:ok copper:ok hasl:ok viaInPad:ok marking:ok etest:ok');
    eq(best.summary.warnings, 0);
    // Every case the engine declares was produced somewhere in this file's option sets.
    const seen = new Map();
    const sets = [{}, { stackup: 'drawing' }, { impedance: [se] }, { impedance: [{}] }, { ipcClass: 3 }, { thicknessMm: 0.3 }, { thicknessTolPct: 5 }, { minHoleMm: 0.1 },
      { outerCuUm: 105 }, { finish: 'hasl' }, { finish: 'hasl', minTraceMm: 0.1 }, { via: 'fill' }, { via: 'fill', viaInPad: true }, { viaInPad: true },
      { maskSides: 'none' }, { legendSides: 'none' }, { etest: false }];
    for (const o of sets) for (const c of fabNotes(o).checks) seen.set(`${c.id}:${c.vars.case}`, c.status);
    for (const [id, list] of Object.entries(CHECK_CASES)) for (const k of list) ok(seen.has(`${id}:${k}`), `${id}:${k} never produced`);
    eq([...seen.keys()].filter((k) => !CHECK_CASES[k.split(':')[0]]?.includes(k.split(':')[1])).join(), '', 'a case the engine does not declare');
    for (const [k, st] of seen) eq(st, ['ok', 'drawing', 'approval', 'match'].includes(k.split(':')[1]) ? 'ok' : 'warn', k);
  }],

  ['fabnotes: only standards from the agreed list are named, and each one only where it belongs', () => {
    const allowed = ['IPC-6012', 'IPC-A-600', 'IPC-4101', 'IPC-SM-840', 'IPC-4552', 'IPC-4553', 'IPC-4554', 'IPC-4556', 'IPC-4761', 'IPC-9252', 'IPC-1601', 'IPC-2581', 'UL 94'];
    const sets = [{}, { layers: 1 }, { layers: 2 }, { material: 'other', materialText: 'X' }, { hardGold: true }, { maskSides: 'none', legendSides: 'none' },
      { impedance: [se, diff, usb] }, { delivery: 'fab', separation: 'vscore', xouts: true }, { etest: false, rohs: false, vacuumPack: false, ul94v0: false },
      ...FINISHES.map((finish) => ({ finish })), ...VIAS.map((via) => ({ via })), ...DATA_FORMATS.map((dataFormat) => ({ dataFormat })), { ipcClass: 3, marking: 'copper' }];
    for (const o of sets) {
      for (const lang of ['en', 'tr']) {
        const r = fabNotes({ ...o, lang });
        const where = `${lang} ${JSON.stringify(o)}`;
        // Every designation in the text is on the list …
        const named = new Set(r.text.match(/\b(?:IPC|UL|J-STD|IEC|MIL|EN|ISO|JEDEC|ASTM)[- ][A-Z0-9-]*\d[A-Z0-9-]*/g) ?? []);
        for (const d of named) ok(allowed.includes(d), `${where}: ${d} is not on the list`);
        // … and the summary lists exactly those (plus the RoHS directive, which is not a standard).
        eq([...named].sort().join(), r.summary.standards.filter((d) => d !== '2011/65/EU').sort().join(), where);
        eq(r.summary.standards.includes('2011/65/EU'), /2011\/65\/(EU|AB)/.test(r.text), where);
        // No clause, table, slash-sheet, type or revision letter is quoted from any of them.
        ok(!/(IPC-[A-Z0-9-]+|UL 94)\s*(\/\d|[A-H]\b|rev|Rev|Table|Tablo|clause|madde|§)/.test(r.text.replace(/UL 94 V-0/g, '')), `${where}: something is quoted from a standard`);
      }
    }
    // IPC-6012 and IPC-A-600 carry the class; nothing else does.
    for (const c of [1, 2, 3]) {
      const r = fabNotes({ ipcClass: c });
      eq((r.text.match(new RegExp(`Class ${c}\\b`, 'g')) ?? []).length, 2, `class ${c}`);
      eq((fabNotes({ ipcClass: c, lang: 'tr' }).text.match(new RegExp(`Sınıf ${c}\\b`, 'g')) ?? []).length, 2, `sınıf ${c}`);
    }
  }],

  ['fabnotes: numbers in the notes — plain decimals, the accepted ranges, nothing outside them', () => {
    eq(note(fabNotes({ thicknessMm: 0.8, thicknessTolPct: 12.5 }), 'thickness'), 'Finished board thickness: 0.8 mm ±12.5 %.');
    eq(note(fabNotes({ thicknessMm: 2.4000000001 }), 'thickness'), 'Finished board thickness: 2.4 mm ±10 %.');
    eq(note(fabNotes({ thicknessMm: 1.57, lang: 'tr' }), 'thickness'), 'Bitmiş kart kalınlığı: 1,57 mm ±%10.');
    eq(note(fabNotes({ pthTolMm: 0.0254, npthTolMm: 0.005 }), 'holeTol'), 'Hole diameter tolerance: plated holes ±0.0254 mm; non-plated holes ±0.005 mm.');
    eq(note(fabNotes({ minTraceMm: 0.0889, minSpaceMm: 0.1 + 0.2, minHoleMm: 10 }), 'minimums'),
      'Design minimums, for information: trace width 0.0889 mm; spacing 0.3 mm; finished hole diameter 10 mm.');
    // The lowest and highest accepted value of every number give a clean note; just outside is an error that names the option.
    const top = ['thicknessMm', 'thicknessTolPct', 'minHoleMm', 'pthTolMm', 'npthTolMm', 'minTraceMm', 'minSpaceMm', 'impedanceAdjustPct', 'outlineTolMm', 'bowTwistPct'];
    eq(Object.keys(RANGES).filter((k) => !top.includes(k)).join(), 'ohms,tolPct,widthMm,gapMm', 'the other ranges belong to an impedance row');
    for (const key of top) {
      const [lo, hi] = RANGES[key];
      ok(lo > 0 && hi > lo && DEFAULTS[key] >= lo && DEFAULTS[key] <= hi, `${key}: range`);
      for (const x of [lo, hi]) {
        const r = fabNotes({ impedance: [se], [key]: x });
        eq(r.ok, true, `${key} = ${x}`);
        ok(!/e[+-]?\d|NaN|Infinity|undefined|±0 |[: ]0 (mm|%)/.test(r.text), `${key} = ${x}: ${r.text.match(/.*e[+-]?\d.*/)?.[0] ?? 'bad number'}`);
      }
      for (const x of [lo * 0.999, hi * 1.001, 0, -1, NaN, Infinity, -Infinity, '1', true, [], {}]) {
        const r = fabNotes({ impedance: [se], [key]: x });
        eq(err(r), 'fn_number', `${key} = ${String(x)}`);
        eq(r.invalid.join(), key, `${key} = ${String(x)}`);
        eq(`${r.text}|${r.title}|${r.notes.length}|${r.checks.length}|${r.summary}`, '||0|0|null');
      }
    }
    // Rows: the same at the edges of their ranges.
    for (const [key, field] of [['ohms', 'ohms'], ['tolPct', 'tolPct'], ['widthMm', 'widthMm'], ['gapMm', 'gapMm']]) {
      const [lo, hi] = RANGES[key];
      for (const x of [lo, hi]) eq(check(fabNotes({ impedance: [{ ...diff, [field]: x }] }), 'imp').status, 'ok', `${key} = ${x}`);
      for (const x of [lo * 0.999, hi * 1.001]) eq(check(fabNotes({ impedance: [{ ...diff, [field]: x }] }), 'imp').status, 'warn', `${key} = ${x}`);
    }
    // Several wrong numbers: one message, every option named.
    const many = fabNotes({ thicknessMm: 0, minHoleMm: NaN, bowTwistPct: 99 });
    eq(err(many), 'fn_number');
    eq(many.invalid.join(), 'thicknessMm,minHoleMm,bowTwistPct');
  }],

  ['fabnotes: invalid options are reported, never written into a note', () => {
    eq(LAYERS_MAX, 32);
    for (const layers of [0, -1, 33, 2.5, NaN, Infinity, '4', true, [4], {}, 1e9]) {
      const r = fabNotes({ layers });
      eq(err(r), 'fn_layers', String(layers));
      eq(r.invalid.join(), 'layers');
      eq(r.text, '');
    }
    for (const layers of [1, 2, 3, 16, 32]) eq(fabNotes({ layers }).ok, true, String(layers));
    eq(note(fabNotes({ layers: 32 }), 'layers'), 'Number of copper layers: 32.');
    // Options with a fixed set of values: anything else is an error, including names every object has.
    const enums = ['lang', 'ipcClass', 'stackup', 'material', 'outerCuUm', 'innerCuUm', 'finish', 'maskSides', 'maskColour', 'legendSides', 'legendColour',
      'via', 'delivery', 'separation', 'marking', 'dataFormat'];
    for (const key of enums) {
      for (const x of ['', 'x', 'toString', '__proto__', 'constructor', 'ENIG', 0, 4, 35.5, '35', NaN, true, {}, []]) {
        const r = fabNotes({ [key]: x });
        eq(err(r), 'fn_option', `${key} = ${String(x)}`);
        eq(r.invalid.join(), key, `${key} = ${String(x)}`);
      }
    }
    eq(err(fabNotes({ ipcClass: 0 })), 'fn_option');
    eq(err(fabNotes({ ipcClass: '2' })), 'fn_option');
    for (const key of ['halogenFree', 'ul94v0', 'hardGold', 'viaInPad', 'xouts', 'etest', 'rohs', 'vacuumPack']) {
      for (const x of ['yes', 'no', 0, 1, 'true', {}, NaN]) eq(err(fabNotes({ [key]: x })), 'fn_option', `${key} = ${String(x)}`);
      eq(fabNotes({ [key]: true }).ok && fabNotes({ [key]: false }).ok, true, key);
    }
    // An unknown language still answers in a known one.
    eq(fabNotes({ lang: 'de' }).lang, 'en');
    // Several kinds of mistake at once: each message once.
    const r = fabNotes({ layers: 0, thicknessMm: -1, finish: 'gold', material: 'other', bowTwistPct: NaN });
    eq(r.errors.slice().sort().join(), 'fn_layers,fn_material,fn_number,fn_option');
    eq(r.ok, false);
    // Things that are not an options object at all are "no options".
    for (const x of [undefined, null, 5, 'x', true, () => ({}), Symbol.iterator]) eq(fabNotes(x).text, base.text, String(x));
    eq(fabNotes([]).text, base.text);
    // Unknown keys are ignored, also when they carry the names every object has.
    eq(fabNotes({ foo: 1, hasOwnProperty: 2, toString: 3 }).text, base.text);
  }],

  ['fabnotes: absurd values in any option never throw and never reach a note', () => {
    const odd = [0, -1, 1e-300, 5e-324, 1e-9, 0.5, 1, 7, 1e9, 1e300, NaN, Infinity, -Infinity, '', ' ', 'x', '4', 'yes', true, false, [], {}, () => 1, 10n, Symbol('s'),
      new Date(0), /x/, '<b>', { toString() { throw new Error('toString'); } }, Object.create(null)];
    const start = { impedance: [se, diff], delivery: 'fab', material: 'other', materialText: 'X', hardGold: true };
    let good = 0;
    let bad = 0;
    for (const key of Object.keys(DEFAULTS)) {
      for (const x of odd) {
        const where = `${key} = ${typeof x === 'symbol' ? 'symbol' : typeof x === 'object' ? Object.prototype.toString.call(x) : String(x)}`;
        let r;
        try { r = fabNotes({ ...start, [key]: x }); } catch (e) { ok(false, `${where} threw ${e.message}`); }
        if (r.ok) {
          good++;
          ok(wellNumbered(r), `${where}: numbering`);
          // A number given where text is expected is taken as its digits (1e+300 included); anything else that is not text is dropped.
          const body = ['name', 'rev', 'materialText'].includes(key) ? '' : r.text;
          ok(!/NaN|undefined|Infinity|\[object|function|=>|e[+-]\d\d/.test(body), `${where}: ${body.match(/.*(NaN|undefined|Infinity|\[object|function|=>|e[+-]\d\d).*/)?.[0]}`);
          ok(typeof x === 'string' || !/NaN|undefined|Infinity|\[object|function|=>/.test(r.text), `${where}: a value that is not text reached the notes`);
          ok(r.checks.every((c) => (c.status === 'ok' || c.status === 'warn') && typeof c.vars.case === 'string'), `${where}: checks`);
          ok(r.summary.count === r.notes.length && r.summary.warnings === r.checks.filter((c) => c.status === 'warn').length, `${where}: summary`);
        } else {
          bad++;
          ok(r.errors.length > 0 && r.errors.every((e) => /^fn_[a-z]+$/.test(e)) && r.invalid.length > 0, `${where}: no error key`);
          eq(`${r.text}|${r.notes.length}|${r.checks.length}`, '|0|0', where);
        }
      }
    }
    ok(good > 100 && bad > 1000, `both outcomes occur (${good} ok, ${bad} rejected)`);
    // Rows with odd values: the block stays well formed.
    for (const x of odd) {
      for (const key of ['layer', 'kind', 'ohms', 'tolPct', 'widthMm', 'gapMm', 'ref']) {
        let r;
        try { r = fabNotes({ impedance: [{ ...diff, [key]: x }, se] }); } catch (e) { ok(false, `row ${key} threw ${e.message}`); }
        ok(r.ok && wellNumbered(r) && !/NaN|undefined|Infinity|\[object/.test(r.text), `row ${key} = ${typeof x}`);
      }
    }
    // An options object whose getters throw is read as far as it can be.
    const trap = { get layers() { throw new Error('getter'); }, finish: 'osp' };
    eq(fabNotes(trap).ok, true);
    eq(fabNotes(trap).summary.finish, 'osp');
    // The same for a row, and a list with a hole in it has an empty row there.
    const row = { ...se, get widthMm() { throw new Error('getter'); } };
    eq(check(fabNotes({ impedance: [row] }), 'imp').vars.rows[0].missing.join(), 'width');
    const holed = [se, se];
    delete holed[0];
    eq(check(fabNotes({ impedance: holed }), 'imp').vars.rows.map((x) => `${x.row}:${x.missing.length}`).join(), '1:6');
    eq(fabNotes({ impedance: holed }).summary.impedanceRows, 1);
  }],

  ['fabnotes: hostile text cannot break the numbering, the title line or the length of the block', () => {
    eq(JSON.stringify(TEXT_MAX), '{"name":60,"rev":40,"materialText":60,"layer":40,"ref":40}');
    for (const s of HOSTILE) {
      for (const lang of ['en', 'tr']) {
        const r = fabNotes({ lang, name: s, rev: s, material: 'other', materialText: `M${s}`, impedance: [{ ...se, layer: `L${s}`, ref: `R${s}` }, { ...diff, layer: s, ref: s }] });
        const where = `${lang} ${JSON.stringify(s.slice(0, 30))}`;
        eq(r.ok, true, where);
        ok(wellNumbered(r), `${where}: numbering`);
        // One line per note, whatever was typed: no control or invisible characters survive.
        ok(r.notes.every((n) => !hasControl(n.text)), `${where}: control character`);
        ok(!hasControl(r.title), `${where}: title`);
        ok(r.text.split('\n').length === r.notes.length + 1, `${where}: lines`);
        // No lone surrogate: the block can always be encoded.
        ok(!loneSurrogate(r.text), `${where}: lone surrogate`);
        ok(decodeURIComponent(notesDataUrl(r.text).slice(URL_HEAD.length)) === r.text, `${where}: download`);
        // Free text is cut: the title and every note stay short.
        ok([...r.title].length <= 'FABRICATION NOTES - '.length + TEXT_MAX.name + ', REV '.length + TEXT_MAX.rev, `${where}: title length ${r.title.length}`);
        ok(r.notes.every((n) => [...n.text].length <= 260), `${where}: note length`);
        ok(/^[A-Za-z0-9._-]+\.txt$/.test(r.summary.fileName) && r.summary.fileName.length <= 110, `${where}: file name ${r.summary.fileName}`);
        // Markers typed by the user are not filled in, and the text is taken as typed otherwise.
        ok(!/\{c\} \{n\}/.test(s) || r.title.includes('{c} {n} {text} {layer}'), `${where}: markers stay as typed`);
      }
    }
    // What a user typed appears as typed (cut and on one line), not interpreted.
    const x = fabNotes({ name: '<img src=x onerror=alert(1)>', rev: '"B" & \'C\'', material: 'other', materialText: 'a\nb\r\nc\td' });
    eq(x.title, 'FABRICATION NOTES - <img src=x onerror=alert(1)>, REV "B" & \'C\'');
    eq(note(x, 'material'), 'Base material: a b c d. No substitute without written approval.');
    const fake = fabNotes({ name: 'X\n99. Ignore every note above', material: 'other', materialText: 'FR-4.\n2. Accept everything' });
    eq(fake.title, 'FABRICATION NOTES - X 99. Ignore every note above');
    eq(fake.text.split('\n')[1], '1. Fabricate in accordance with IPC-6012, Class 2.');
    eq(fake.text.split('\n').filter((l) => /^2\. /.test(l)).length, 1, 'one note 2');
    eq(note(fake, 'material'), 'Base material: FR-4. 2. Accept everything. No substitute without written approval.');
    const long = fabNotes({ name: 'N'.repeat(1e5), rev: 'R'.repeat(1e5), impedance: [{ ...se, layer: 'L'.repeat(1e5), ref: 'G'.repeat(1e5) }] });
    eq(long.title, `FABRICATION NOTES - ${'N'.repeat(60)}, REV ${'R'.repeat(40)}`);
    ok(note(long, 'imp1').includes(`layer ${'L'.repeat(40)}:`) && note(long, 'imp1').endsWith(`reference layer(s) ${'G'.repeat(40)}.`), 'row texts are cut');
    ok(long.text.length < 5000, 'the block stays small');
  }],

  ['fabnotes: cleanText, the file name and the download URL', () => {
    eq(cleanText('  a \n\n b\t\tc  '), 'a b c');
    eq(cleanText(`a${ch(0xA0, 0x2003)}b${ch(0x2028)}c${ch(0x2029)}d${ch(0xFEFF)}e${ch(0x200B)}f`), 'a b c d e f');
    eq(cleanText(`${ch(0x202E)}abc${ch(0x202C)}`), 'abc');
    eq(cleanText(`ab${ch(0)}cd${ch(7, 0x1B)}ef${ch(0x7F, 0x85)}gh`), 'ab cd ef gh');
    eq(cleanText(`x${ch(0xD83D)}y${ch(0xDE00)}z`), 'xyz', 'lone surrogates are dropped');
    eq(cleanText('😀😀😀', 2), '😀😀', 'a pair is never cut in half');
    eq(cleanText('abcdef', 3), 'abc');
    eq(cleanText('ab cd', 3), 'ab', 'no blank at the end after cutting');
    eq(cleanText('ab cd', 4), 'ab c');
    eq(cleanText('ığüşöçİĞÜŞÖÇ ± µ Ω'), 'ığüşöçİĞÜŞÖÇ ± µ Ω');
    eq(cleanText(42), '42');
    eq(cleanText('abc', 0), '');
    eq(cleanText('abc', -5), '');
    eq(cleanText('abc', NaN), '');
    for (const x of [undefined, null, NaN, Infinity, true, {}, [], () => 'x', 5n, Symbol('x')]) eq(cleanText(x), '', typeof x);
    eq(cleanText('x'.repeat(1e6)).length, 60);
    // File name: ASCII only, Turkish letters transliterated, never empty.
    eq(notesFileName('en'), 'fab-notes.txt');
    eq(notesFileName('tr'), 'uretim-notlari.txt');
    eq(notesFileName('en', 'ABC-123', 'B'), 'ABC-123_rev-B_fab-notes.txt');
    eq(notesFileName('tr', 'Güç Kartı (şasi)', '2.1'), 'Guc-Karti-sasi_rev-2-1_uretim-notlari.txt');
    eq(notesFileName('en', '../../etc/passwd', '<x>'), 'etc-passwd_rev-x_fab-notes.txt');
    eq(notesFileName('en', '***', '   '), 'fab-notes.txt');
    eq(notesFileName('en', 'CON', ''), 'CON_fab-notes.txt');
    eq(notesFileName('xx', 5, null), '5_fab-notes.txt');
    for (const s of HOSTILE) ok(/^[A-Za-z0-9_-]+\.txt$/.test(notesFileName('en', s, s)) && notesFileName('en', s, s).length <= 110, JSON.stringify(s.slice(0, 20)));
    // Download URL: only unreserved characters and percent escapes after the header, and it decodes back.
    for (const lang of ['en', 'tr']) {
      const r = fabNotes({ lang, name: "O'Neil & Söhne <1>", rev: '#2', impedance: [se, diff] });
      const url = notesDataUrl(r.text);
      ok(url.startsWith(URL_HEAD), 'header');
      ok(/^[A-Za-z0-9._~%-]*$/.test(url.slice(URL_HEAD.length)), 'only safe characters');
      eq(decodeURIComponent(url.slice(URL_HEAD.length)), r.text);
      ok(url.includes('%0A') && !/[\s"'<>&#]/.test(url), 'line breaks are encoded, nothing can end an attribute or start a fragment');
    }
    eq(notesDataUrl(''), URL_HEAD);
    eq(notesDataUrl("!'()*"), `${URL_HEAD}%21%27%28%29%2A`);
    eq(notesDataUrl(ch(0xD83D)), URL_HEAD, 'a text that cannot be encoded gives an empty file, not an exception');
    for (const x of [undefined, null, 5, {}, []]) eq(notesDataUrl(x), URL_HEAD, String(x));
  }],

  ['fabnotes page: default result — headline, the block as text, copy button, download link and sources', () => {
    inBothLanguages((ui) => {
      for (const lang of ['en', 'tr']) {
        const { r, html } = show({ nl: lang });
        const where = `ui ${ui}, notes ${lang}`;
        eq(r.ok, true, where);
        eq(r.lang, lang, `${where}: the notes follow their own language, not the page`);
        eq(r.text, fabNotes({ lang }).text, `${where}: the page defaults are the engine defaults`);
        ok(/class="hero-value">28 <span class="u">(notes|not)<\/span>/.test(html), `${where}: number of notes`);
        ok(html.includes(ui === 'tr' ? '4 katman · 1,6 mm · ENIG' : '4 layers · 1.6 mm · ENIG'), `${where}: summary line`);
        // The block is shown once as preformatted text, exactly as the engine wrote it.
        const pre = html.match(/<pre class="formula notes">([\s\S]*?)<\/pre>/g);
        eq(pre.length, 1, where);
        eq(unesc(pre[0].replace(/<\/?pre[^>]*>/g, '')), r.text, where);
        // Copy button: the result card's own data-copy handler; download: a data URL that decodes to the block.
        eq(copied(html), r.text, `${where}: copy`);
        const [, url, file] = href(html);
        eq(decodeURIComponent(url.slice(URL_HEAD.length)), r.text, `${where}: download`);
        ok(url.startsWith(URL_HEAD) && /^[A-Za-z0-9._~%-]*$/.test(url.slice(URL_HEAD.length)), `${where}: URL characters`);
        eq(file, lang === 'tr' ? 'uretim-notlari.txt' : 'fab-notes.txt', where);
        ok(!/<script|onclick=|onerror=|addEventListener/i.test(html), `${where}: no script in the result`);
        // One point to settle (the stack-up), shown as a warning line and as a failing row of the list.
        ok(html.includes('class="msg warn"') && !html.includes('class="msg ok"'), `${where}: verdict`);
        eq((html.match(/<li class="warn">/g) ?? []).length, 1, where);
        eq((html.match(/<li class="pass">/g) ?? []).length, 8, where);
        // Sources and the page note.
        const refs = html.match(/<p class="refs">([^<]*)<\/p>/)[1];
        for (const d of ['IPC-6012', 'IPC-A-600', 'IPC-4101', 'UL 94', 'IPC-4552', 'IPC-SM-840', 'IPC-4761', 'IPC-9252', 'IPC-1601', '2011/65/']) ok(refs.includes(d), `${where}: ${d}`);
        ok(!refs.includes('IPC-4553') && !refs.includes('IPC-2581'), `${where}: only what the notes name`);
        ok(html.includes(ui === 'tr' ? 'Bu notlar bir başlangıçtır' : 'These notes are a starting point'), `${where}: page note`);
        ok(!/NaN|undefined|Infinity|\[object/.test(visible(html)), `${where}: NaN/undefined`);
      }
    });
    // Nothing to settle: the green line.
    const before = getLang();
    setLang('en');
    try {
      const clean = show({ stk: 'drawing' });
      ok(clean.html.includes('class="msg ok"') && !clean.html.includes('class="msg warn"') && !clean.html.includes('<li class="warn">') && !clean.html.includes('<li class="fail">'), 'no open point');
      ok(show({ et: 'no' }).html.includes('2 of the 9 points below'), 'two open points');
      ok(show({ name: 'ABC-123', rev: 'B' }).html.includes('download="ABC-123_rev-B_fab-notes.txt"'), 'file name from the board name');
    } finally {
      setLang(before);
    }
  }],

  ['fabnotes page: form values reach the engine, and hidden fields are not looked at', () => {
    const before = getLang();
    setLang('en');
    try {
      // Every field once, away from its default.
      const full = show({
        nl: 'tr', name: 'UMAY-01', rev: 'C', lay: 8, thk: 2, ttol: 8, cls: 3, stk: 'drawing', mat: 'high', hf: 'yes', ul: 'no', cuo: 70, cui: 18, fin: 'imsn', gold: 'yes',
        sm: 'top', smc: 'mblack', leg: 'bottom', legc: 'yellow', hole: 0.25, ptol: 0.05, ntol: 0.1, via: 'fill', vip: 'yes', trk: 0.2, spc: 0.25,
        zn: 3, zadj: 5, z1l: 'Top', z1k: 'se', z1z: 75, z1t: 5, z1w: 0.3, z1r: 'L2', z2l: 'L3', z2k: 'diff', z2z: 100, z2t: 10, z2w: 0.1, z2g: 0.2, z2r: 'L2, L4',
        z3l: 'L8', z3k: 'diff', z3z: 90, z3t: 15, z3w: 0.12, z3g: 0.13, z3r: 'L7',
        dlv: 'drawn', sep: 'vscore', xout: 'yes', otol: 0.2, et: 'no', bow: 1.5, mark: 'copper', rohs: 'no', pack: 'no', data: 'ipc2581',
      });
      eq(full.r.ok, true);
      eq(full.r.text, fabNotes({
        lang: 'tr', name: 'UMAY-01', rev: 'C', layers: 8, thicknessMm: 2, thicknessTolPct: 8, ipcClass: 3, stackup: 'drawing', material: 'high', halogenFree: true, ul94v0: false,
        outerCuUm: 70, innerCuUm: 18, finish: 'imsn', hardGold: true, maskSides: 'top', maskColour: 'mblack', legendSides: 'bottom', legendColour: 'yellow',
        minHoleMm: 0.25, pthTolMm: 0.05, npthTolMm: 0.1, via: 'fill', viaInPad: true, minTraceMm: 0.2, minSpaceMm: 0.25, impedanceAdjustPct: 5,
        impedance: [{ layer: 'Top', kind: 'se', ohms: 75, tolPct: 5, widthMm: 0.3, ref: 'L2' }, { layer: 'L3', kind: 'diff', ohms: 100, tolPct: 10, widthMm: 0.1, gapMm: 0.2, ref: 'L2, L4' },
          { layer: 'L8', kind: 'diff', ohms: 90, tolPct: 15, widthMm: 0.12, gapMm: 0.13, ref: 'L7' }],
        delivery: 'drawn', separation: 'vscore', xouts: true, outlineTolMm: 0.2, etest: false, bowTwistPct: 1.5, marking: 'copper', rohs: false, vacuumPack: false, dataFormat: 'ipc2581',
      }).text);
      eq(full.r.notes.length, 34);
      // Rows: none by default; a row switched on is incomplete until width and reference are entered.
      eq(show().r.summary.impedanceAsked, 0);
      const open = show({ zn: 1 });
      eq(check(open.r, 'imp').vars.rows[0].missing.join(), 'width,ref');
      ok(open.html.includes('Row 1 lacks: trace width, reference layer.') && open.html.includes('No row is complete'), 'the list names what is missing');
      eq(open.r.text, base.text);
      const done = show(completeRow);
      eq(note(done.r, 'imp1'), 'Controlled impedance, layer L1: single-ended 50 Ω ±10 %; trace width 0.2 mm as drawn; reference layer(s) L2.');
      ok(done.html.includes('All rows asked for (1) are complete'), 'complete');
      const three = show({ zn: 3, z1w: 0.2, z1r: 'L2', z2w: 0.1, z2g: 0.2, z2r: 'L2', z3w: 0.1, z3g: 0.15, z3r: 'L2, L4' });
      eq(three.r.summary.impedanceRows, 3);
      ok(note(three.r, 'imp2').includes('differential 100 Ω') && note(three.r, 'imp3').includes('layer L3: differential 90 Ω'), 'defaults of rows 2 and 3');
      // Rows that are filled in but switched off are not sent.
      eq(show({ zn: 1, z1w: 0.2, z1r: 'L2', z2w: 0.1, z2g: 0.2, z2r: 'L2' }).r.summary.impedanceAsked, 1);
      eq(show({ zn: 0, z1w: 0.2, z1r: 'L2' }).r.text, base.text);
      // Hidden fields hold whatever was typed before; the engine does not look at them.
      eq(show({ lay: 1, ptol: 'abc', cui: 105, via: 'fill', vip: 'yes', stk: 'drawing' }).r.text, fabNotes({ layers: 1 }).text);
      eq(show({ zadj: 'abc' }).r.text, base.text);
      eq(show({ mat: 'std', matx: 'left over' }).r.text, base.text);
      eq(show({ sm: 'none', smc: 'red', leg: 'none', legc: 'black' }).r.text, fabNotes({ maskSides: 'none', legendSides: 'none' }).text);
      eq(show({ sep: 'vscore', xout: 'yes' }).r.text, base.text);
      // Visibility of the dependent fields.
      const shown = (set, key) => {
        const { v } = inputs(set);
        const s = page.sections.find((x) => x.fields.some((f) => f.key === key));
        const f = s.fields.find((x) => x.key === key);
        return !(s.show && !s.show(v)) && !(f.show && !f.show(v));
      };
      eq(['cui', 'stk'].map((k) => shown({ lay: 2 }, k)).join(), 'false,false');
      eq(['cui', 'stk'].map((k) => shown({ lay: 3 }, k)).join(), 'true,true');
      eq(['ptol', 'via', 'vip'].map((k) => shown({ lay: 1 }, k)).join(), 'false,false,false');
      eq(['ptol', 'via', 'vip'].map((k) => shown({ lay: 2 }, k)).join(), 'true,true,true');
      eq(['cui', 'stk', 'ptol', 'via'].map((k) => shown({ lay: '' }, k)).join(), 'true,true,true,true', 'nothing jumps while the layer count is being typed');
      eq(`${shown({}, 'matx')}${shown({ mat: 'other' }, 'matx')}${shown({}, 'hf')}${shown({ mat: 'other' }, 'hf')}`, 'falsetruetruefalse');
      eq(`${shown({}, 'smc')}${shown({ sm: 'none' }, 'smc')}${shown({}, 'legc')}${shown({ leg: 'none' }, 'legc')}`, 'truefalsetruefalse');
      eq(`${shown({}, 'sep')}${shown({ dlv: 'fab' }, 'sep')}${shown({}, 'xout')}${shown({ dlv: 'drawn' }, 'xout')}`, 'falsetruefalsetrue');
      eq(`${shown({}, 'zadj')}${shown({ zn: 1 }, 'zadj')}`, 'falsetrue');
      eq([0, 1, 2, 3].map((n) => [1, 2, 3].map((i) => (shown({ zn: n }, `z${i}w`) ? 1 : 0)).join('')).join(), '000,100,110,111');
      eq(`${shown({ zn: 1 }, 'z1g')}${shown({ zn: 1, z1k: 'diff' }, 'z1g')}${shown({ zn: 2 }, 'z2g')}`, 'falsetruetrue');
      // The copper label follows the board: one layer has no "outer layers".
      const cuo = fields.find((f) => f.key === 'cuo');
      eq(`${cuo.label({ lay: 1 })} ${cuo.label({ lay: 4 })} ${cuo.label({ lay: NaN })}`, 'fn_cu1 fn_cuo fn_cuo');
      // Engine errors reach the page as a message, with no block, button or link.
      const wrong = show({ mat: 'other' });
      eq(err(wrong.r), 'fn_material');
      ok(wrong.html.includes('class="msg error"') && wrong.html.includes('Enter the material designation'), 'message');
      ok(!wrong.html.includes('<pre') && !wrong.html.includes('data-copy') && !wrong.html.includes('download='), 'no block');
      for (const set of [{ lay: 0 }, { lay: '' }, { thk: 'abc' }, { hole: -1 }, { bow: 1e9 }, { nl: 'de' }, { fin: 'gold' }]) {
        const bad = show(set);
        eq(bad.r.ok, false, JSON.stringify(set));
        ok(bad.html.includes('class="msg error"') && !bad.html.includes('<pre'), JSON.stringify(set));
      }
    } finally {
      setLang(before);
    }
  }],

  ['fabnotes page: hostile text is escaped in the block, the copy button and the download link', () => {
    inBothLanguages((ui) => {
      for (const s of HOSTILE) {
        for (const lang of ['en', 'tr']) {
          // The form cuts a text field at 40 characters; a cut can split a surrogate pair.
          const cut = s.slice(0, 40);
          const { r, html } = show({ nl: lang, name: cut, rev: cut, mat: 'other', matx: `M${cut}`.slice(0, 40), zn: 2, z1l: cut, z1w: 0.2, z1r: `R${cut}`.slice(0, 40), z2l: `L${cut}`.slice(0, 40), z2w: 0.1, z2g: 0.1, z2r: cut });
          const where = `${ui}/${lang} ${JSON.stringify(s.slice(0, 30))}`;
          eq(r.ok, true, where);
          // No tag that the page did not write itself, and no attribute ended early.
          const tags = new Set((html.match(/<\/?[a-zA-Z][a-zA-Z0-9]*/g) ?? []).map((x) => x.replace(/[</]/g, '').toLowerCase()));
          for (const tag of tags) ok(['div', 'span', 'button', 'svg', 'path', 'rect', 'circle', 'line', 'polyline', 'a', 'pre', 'p', 'ul', 'li', 'b', 'small', 'h2'].includes(tag), `${where}: <${tag}>`);
          ok(!/<(img|script|h1|iframe)\b/i.test(html) && !/\son[a-z]+\s*=/i.test(html.replace(/data-copy="[^"]*"/g, '').replace(/<pre[\s\S]*?<\/pre>/g, '')), `${where}: injected markup`);
          eq((html.match(/<pre/g) ?? []).length, 1, where);
          eq((html.match(/<\/pre>/g) ?? []).length, 1, where);
          eq((html.match(/<a /g) ?? []).length, 1, where);
          // The three copies of the block are the block.
          eq(unesc(html.match(/<pre class="formula notes">([\s\S]*?)<\/pre>/)[1]), r.text, `${where}: block`);
          eq(copied(html), r.text, `${where}: copy`);
          const [, url, file] = href(html);
          ok(/^[A-Za-z0-9._~%-]*$/.test(url.slice(URL_HEAD.length)) && url.startsWith(URL_HEAD), `${where}: URL`);
          eq(decodeURIComponent(url.slice(URL_HEAD.length)), r.text, `${where}: download`);
          ok(/^[A-Za-z0-9._-]+\.txt$/.test(file), `${where}: file name ${file}`);
          ok(wellNumbered(r), `${where}: numbering`);
        }
      }
    });
    // The text is shown as typed, escaped.
    const before = getLang();
    setLang('en');
    try {
      const { r, html } = show({ name: '<img src=x onerror=alert(1)>', rev: '"B"&\'C\'' });
      eq(r.title, 'FABRICATION NOTES - <img src=x onerror=alert(1)>, REV "B"&\'C\'');
      ok(html.includes('FABRICATION NOTES - &lt;img src=x onerror=alert(1)&gt;, REV &quot;B&quot;&amp;&#39;C&#39;'), 'escaped in the block');
      ok(html.includes('download="img-src-x-onerror-alert-1_rev-B-C_fab-notes.txt"'), 'file name');
    } finally {
      setLang(before);
    }
  }],

  ['fabnotes page: every option renders in both languages with no untranslated key, and each check text is specific', () => {
    // Defaults, every option of every choice and select, and sets that reach every check text and error.
    const sets = [{}];
    for (const f of fields) for (const o of f.options ?? []) if (String(o.value) !== String(f.default)) sets.push({ [f.key]: o.value });
    sets.push(
      completeRow, { ...completeRow, stk: 'drawing' }, { zn: 3 }, { zn: 2, z1w: 0.2, z1r: 'L2', z2k: 'se' }, { zn: 1, z1l: '', z1k: 'diff' },
      { cls: 3 }, { lay: 1 }, { lay: 2 }, { lay: 32, thk: 2 }, { thk: 0.3 }, { ttol: 5 }, { hole: 0.1 }, { cuo: 105 }, { fin: 'hasl', trk: 0.1 },
      { via: 'fill', vip: 'yes' }, { vip: 'yes' }, { sm: 'none' }, { leg: 'none' }, { et: 'no' }, { et: 'no', data: 'odb' }, { data: 'odb' },
      { mat: 'other' }, { mat: 'other', matx: 'Rogers RO4350B' }, { lay: 0 }, { thk: 0 }, { nl: 'xx' }, { dlv: 'fab', sep: 'vscore', xout: 'yes' },
    );
    const texts = { tr: new Set(), en: new Set() };
    inBothLanguages((ui) => {
      for (const set of sets) {
        const where = `${ui} ${JSON.stringify(set)}`;
        let out;
        try { out = show(set); } catch (e) { ok(false, `${where} threw ${e.message}`); }
        const text = visible(out.html);
        ok(!/(?<![A-Za-z0-9_])(ok_|warn_|err_)?fn_[A-Za-z0-9]+/.test(text), `${where}: untranslated key ${text.match(/(ok_|warn_|err_)?fn_[A-Za-z0-9]+/)?.[0]}`);
        ok(!/NaN|undefined|Infinity|\[object|\{[a-z]+\}/.test(text), `${where}: ${text.match(/.{0,30}(NaN|undefined|Infinity|\[object|\{[a-z]+\}).{0,30}/)?.[0]}`);
        if (!out.r.ok) { ok(out.html.includes('class="msg error"'), `${where}: error message`); continue; }
        ok(out.html.includes('class="refs"') && out.html.includes('class="checks"') && out.html.includes('class="hero"'), `${where}: parts of the result`);
        // One row per check, each with a title and a sentence.
        const rows = [...out.html.matchAll(/<li class="(pass|warn)">[\s\S]*?<b>([^<]+)<\/b><small>([^<]+)<\/small>/g)];
        eq(rows.length, out.r.checks.length, where);
        rows.forEach(([, cls, title, detail], i) => {
          eq(cls, out.r.checks[i].status === 'ok' ? 'pass' : 'warn', `${where}: ${out.r.checks[i].id}`);
          ok(title.trim().length > 5 && detail.trim().length > 40 && /[.!]$/.test(detail.trim()), `${where}: ${out.r.checks[i].id} text`);
          texts[ui].add(`${out.r.checks[i].id}:${out.r.checks[i].vars.case}|${unesc(detail)}`);
        });
      }
    });
    // Every case of every check was rendered, in both languages, and the two languages differ.
    for (const ui of ['tr', 'en']) {
      const seen = new Set([...texts[ui]].map((x) => x.split('|')[0]));
      for (const [id, list] of Object.entries(CHECK_CASES)) for (const k of list) ok(seen.has(`${id}:${k}`), `${ui}: ${id}:${k} never rendered`);
    }
    ok([...texts.tr].every((x) => !texts.en.has(x)), 'a check text is the same in Turkish and English');
    // Thresholds that are rules of thumb say so, in both languages.
    for (const ui of ['tr', 'en']) {
      const say = ui === 'tr' ? /pratik kural|tipik/ : /rule of thumb|typical/;
      for (const x of texts[ui]) {
        const id = x.split(':')[0];
        if (['thin', 'thicknessTol', 'aspect', 'copper', 'hasl'].includes(id)) ok(say.test(x), `${ui} ${id}: the threshold is not labelled as a rule of thumb — ${x}`);
        ok(!/IPC-(6012|A-600|2221|2222|7351)[^.]*\d+([.,]\d+)?\s*(mm|µm|%)/.test(x), `${ui} ${id}: a number presented as coming from a standard`);
      }
    }
    // Numbers in the check texts follow the page language.
    const before = getLang();
    try {
      setLang('tr');
      ok(show({ hole: 0.25, thk: 2.4 }).html.includes('= 9,6:1') && show({ thk: 0.3 }).html.includes('0,3 mm'), 'Turkish decimals');
      setLang('en');
      ok(show({ hole: 0.25, thk: 2.4 }).html.includes('= 9.6:1') && show({ cuo: 70 }).html.includes('below the 0.2 mm that fabricators typically accept for 70 µm copper'), 'English decimals');
      ok(show().html.includes('IPC-D-356') && !show({ data: 'odb' }).html.includes('IPC-D-356'), 'the netlist hint is for Gerber data only');
    } finally {
      setLang(before);
    }
  }],

  ['fabnotes page: Turkish and English strings match, and every key the page and the engine use exists', () => {
    const tr = Object.keys(page.strings.tr);
    const en = new Set(Object.keys(page.strings.en));
    eq(tr.filter((k) => !en.has(k)).join(), '', 'only in tr');
    eq([...en].filter((k) => !tr.includes(k)).join(), '', 'only in en');
    ok(tr.every((k) => page.strings.tr[k] && page.strings.en[k]), 'no empty string');
    ok(tr.every((k) => /^(fn_|ok_fn_|warn_fn_|err_fn_)[A-Za-z0-9]+$/.test(k)), 'all keys carry the fn_ prefix, so no other page is overwritten');
    // Placeholders are the same in both languages.
    for (const k of tr) {
      const marks = (s) => (s.match(/\{[a-z]+\}/g) ?? []).sort().join();
      eq(marks(page.strings.tr[k]), marks(page.strings.en[k]), `placeholders of ${k}`);
    }
    // Engine: errors, check titles and every check case.
    for (const k of ['fn_layers', 'fn_number', 'fn_material', 'fn_option']) ok(en.has(`err_${k}`), `err_${k}`);
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    for (const [id, list] of Object.entries(CHECK_CASES)) {
      ok(en.has(`fn_k${cap(id)}`), `title of ${id}`);
      for (const k of list) ok(en.has(`fn_k${cap(id)}${cap(k)}`), `text of ${id}:${k}`);
    }
    for (const k of ['Layer', 'Kind', 'Ohms', 'Tol', 'Width', 'Gap', 'Ref']) ok(en.has(`fn_m${k}`), `missing-field name ${k}`);
    for (const f of FINISHES) ok(en.has(`fn_fs${cap(f)}`) && en.has(`fn_fin${cap(f)}`), `finish ${f}`);
    // Labels, hints, notes and options of the form.
    for (const s of page.sections) {
      ok(en.has(s.title), `section ${s.title}`);
      ok(!s.note || en.has(s.note), `note ${s.note}`);
      for (const f of s.fields) {
        const labels = typeof f.label === 'function' ? [f.label({ lay: 1 }), f.label({ lay: 4 })] : [f.label];
        for (const k of [...labels, f.hint, f.info, ...(f.options ?? []).map((o) => o.label)]) ok(k === undefined || en.has(k), `${f.key}: ${k}`);
      }
    }
    // Field keys are unique and short (they become URL parameters); option values are lowercase ASCII.
    eq(new Set(fields.map((f) => f.key)).size, fields.length, 'unique keys');
    ok(fields.every((f) => /^[a-z][a-z0-9]{1,5}$/.test(f.key)), 'short keys');
    ok(fields.every((f) => (f.options ?? []).every((o) => /^[a-z0-9]+$/.test(o.value))), 'option values');
    eq(fields.length, 60);
    // The options offered are the ones the engine knows, and the defaults are the engine's.
    const values = (key) => fields.find((f) => f.key === key).options.map((o) => o.value).join();
    eq(values('mat'), MATERIALS.join());
    eq(values('fin'), FINISHES.join());
    eq(values('cuo'), COPPER_UM.join());
    eq(values('cui'), COPPER_UM.join());
    eq(values('sm'), SIDES.join());
    eq(values('leg'), SIDES.join());
    eq(values('smc'), MASK_COLOURS.join());
    eq(values('legc'), LEGEND_COLOURS.join());
    eq(values('via'), VIAS.join());
    eq(values('dlv'), DELIVERIES.join());
    eq(values('mark'), MARKINGS.join());
    eq(values('data'), DATA_FORMATS.join());
    eq(values('zn'), '0,1,2,3');
    eq(show().r.text, base.text);
    // Number fields accept exactly the ranges of the engine, so a value the form lets through never fails there.
    const range = { thk: 'thicknessMm', ttol: 'thicknessTolPct', hole: 'minHoleMm', ptol: 'pthTolMm', ntol: 'npthTolMm', trk: 'minTraceMm', spc: 'minSpaceMm',
      zadj: 'impedanceAdjustPct', otol: 'outlineTolMm', bow: 'bowTwistPct' };
    for (const i of [1, 2, 3]) Object.assign(range, { [`z${i}z`]: 'ohms', [`z${i}t`]: 'tolPct', [`z${i}w`]: 'widthMm', [`z${i}g`]: 'gapMm' });
    const numbers = fields.filter((f) => f.type === 'number');
    eq(numbers.map((f) => f.key).filter((k) => k !== 'lay' && !range[k]).join(), '', 'number fields without a range');
    for (const f of numbers) {
      if (f.key === 'lay') { eq(`${f.min}/${f.max}/${f.integer}`, `1/${LAYERS_MAX}/true`); continue; }
      eq(`${f.min}/${f.max}`, RANGES[range[f.key]].join('/'), f.key);
      eq(f.units.length, 1, `${f.key}: one unit, the one the notes use`);
    }
    // Free text is cut by the form at 40 characters, within what the engine takes.
    ok(Math.min(...Object.values(TEXT_MAX)) >= 40, 'the engine takes at least what the form lets through (40 characters)');
  }],
];
