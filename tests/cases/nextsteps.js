// "Next step" links (src/nextsteps.js, src/ui/nextsteps.js): every link must
// open its target with keys, units and values the target page understands,
// for every option of the page it starts from.

import { ok, eq } from '../assert.js';
import { TOOLS, toolById } from '../../src/registry.js';
import { dictionaries, registerStrings, setLang, getLang } from '../../src/i18n.js';
import { parseNumber } from '../../src/ui/calculator.js';
import { NEXT } from '../../src/nextsteps.js';
import { nextQuery, nextSteps, nextStepsHtml } from '../../src/ui/nextsteps.js';

const pageById = new Map();
for (const tool of TOOLS) {
  try {
    const page = (await tool.load()).default;
    pageById.set(tool.id, page);
    if (page.strings) registerStrings(page.strings);
  } catch { /* reported by "every module loads" in diagrams.js */ }
}

const fieldsOf = (page) => (page.sections ?? []).flatMap((s) => s.fields);
const isStandard = (page) => page && !page.mount && typeof page.compute === 'function';

/** Raw default values and units of a page. */
function defaults(page) {
  const raw = {};
  const units = {};
  for (const f of fieldsOf(page)) {
    raw[f.key] = f.default === undefined || f.default === null ? '' : String(f.default);
    if (f.type === 'number') units[f.key] = f.unit ?? f.units?.[0];
  }
  return { raw, units };
}

/** Defaults, plus one variant per option of every choice/select (with the values it sets). */
function variants(page) {
  const base = defaults(page);
  const list = [{ ...base, label: 'defaults' }];
  for (const f of fieldsOf(page)) {
    for (const o of f.options ?? []) {
      if (String(o.value) === base.raw[f.key]) continue;
      const raw = { ...base.raw, [f.key]: String(o.value) };
      const units = { ...base.units };
      for (const [k, val] of Object.entries(o.set ?? {})) {
        const ff = fieldsOf(page).find((x) => x.key === k);
        if (!ff) continue;
        raw[k] = String(val);
        if (ff.type === 'number' && ff.units) units[k] = ff.units.includes(o.set[`${k}_u`]) ? o.set[`${k}_u`] : ff.unit ?? ff.units[0];
      }
      list.push({ raw, units, label: `${f.key}=${o.value}` });
    }
  }
  return list;
}

const parsed = (page, raw) => Object.fromEntries(fieldsOf(page).map((f) => [f.key, f.type === 'number' ? parseNumber(raw[f.key], f.si) : raw[f.key]]));

/** Problems of a query against the fields of the page it opens. */
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
    if (f.type === 'number' && !Number.isFinite(parseNumber(value, f.si))) out.push(`${key}=${value} is not a number`);
  }
  return out;
}

/** The target page computed with its defaults overridden by the query. */
function openTarget(page, query) {
  const { raw, units } = defaults(page);
  for (const [key, value] of new URLSearchParams(query)) {
    if (key.endsWith('_u') && key.slice(0, -2) in units) units[key.slice(0, -2)] = value;
    else raw[key] = value;
  }
  return page.compute(parsed(page, raw), units);
}

export const cases = [
  ['next steps: query strings drop empty values and tidy numbers', () => {
    eq(nextQuery({ a: 0.1 + 0.2, b: '', c: undefined, d: null, e: NaN, f: 'mm', g: 0, h: Infinity }), 'a=0.3&f=mm&g=0');
    eq(nextQuery({ w: 0.9707123456, w_u: 'mm' }), 'w=0.970712&w_u=mm');
    eq(nextQuery({ c: 0.0015 }), 'c=0.0015');
    eq(nextQuery({ x: 1e-9 }), 'x=1e-9');
    eq(nextQuery(undefined), '');
  }],

  ['next steps: every link names a real tool and has its reason in TR and EN', () => {
    const problems = [];
    let count = 0;
    for (const [id, steps] of Object.entries(NEXT)) {
      if (!toolById(id)) problems.push(`${id}: no such tool`);
      if (!isStandard(pageById.get(id))) problems.push(`${id}: the block is only shown on standard calculator pages`);
      const seen = new Set();
      for (const s of steps) {
        count++;
        if (!toolById(s.to)) problems.push(`${id} → ${s.to}: no such tool`);
        if (s.to === id) problems.push(`${id}: links to itself`);
        if (seen.has(s.to)) problems.push(`${id} → ${s.to}: listed twice`);
        seen.add(s.to);
        for (const l of ['tr', 'en']) if (!dictionaries[l][s.why]) problems.push(`${id} → ${s.to}: ${l} text "${s.why}"`);
        if (s.q !== undefined && typeof s.q !== 'function') problems.push(`${id} → ${s.to}: q is not a function`);
      }
      if (steps.length > 3) problems.push(`${id}: more than three follow-ups`);
    }
    ok(problems.length === 0, `\n${problems.join('\n')}`);
    ok(count >= 15, `expected at least 15 links, found ${count}`);
  }],

  ['next steps: every link opens its target with valid keys, units and values, for every option', () => {
    const problems = [];
    const shown = new Set();
    for (const [id, steps] of Object.entries(NEXT)) {
      const page = pageById.get(id);
      if (!isStandard(page)) continue;
      for (const { raw, units, label } of variants(page)) {
        const v = parsed(page, raw);
        let r;
        try { r = page.compute(v, units); } catch (e) { problems.push(`${id} [${label}]: compute throws ${e.message}`); continue; }
        if (!r || r.ok === false) continue; // no block is shown for an invalid result
        for (const s of steps) {
          const where = `${id} [${label}] → ${s.to}`;
          let params;
          try { params = s.q ? s.q(r, v, units) : {}; } catch (e) { problems.push(`${where}: q throws ${e.message}`); continue; }
          if (params === null) continue;
          const query = nextQuery(params);
          shown.add(`${id}→${s.to}`);
          const target = pageById.get(s.to);
          if (!isStandard(target)) {
            if (query) problems.push(`${where}: ${s.to} builds its own page, so the link must not carry values`);
            continue;
          }
          for (const p of linkProblems(target, query)) problems.push(`${where}: ${p} (${query})`);
          // Every unit key needs its value and the other way round is not required.
          for (const key of new URLSearchParams(query).keys()) {
            if (key.endsWith('_u') && !new URLSearchParams(query).has(key.slice(0, -2))) problems.push(`${where}: ${key} without a value`);
          }
          try {
            const tr = openTarget(target, query);
            if (!tr || tr.ok === false) problems.push(`${where}: the target cannot calculate with ${query} (${(tr?.errors ?? []).join(', ')})`);
          } catch (e) {
            problems.push(`${where}: the target throws ${e.message}`);
          }
        }
      }
    }
    ok(problems.length === 0, `\n${[...new Set(problems)].slice(0, 20).join('\n')}`);
    // A link that never appears for any option is dead weight.
    const dead = Object.entries(NEXT).flatMap(([id, steps]) => steps.map((s) => `${id}→${s.to}`)).filter((k) => !shown.has(k));
    ok(dead.length === 0, `never shown: ${dead.join(', ')}`);
  }],

  ['next steps: the values that travel are the ones of the result', () => {
    const run = (id, over = {}) => {
      const page = pageById.get(id);
      const { raw, units } = defaults(page);
      for (const [k, val] of Object.entries(over)) {
        if (k.endsWith('_u')) units[k.slice(0, -2)] = val; else raw[k] = String(val);
      }
      const v = parsed(page, raw);
      return Object.fromEntries(nextSteps(id, page.compute(v, units), v, units).map((s) => [s.to, s.href]));
    };
    // Trace: the calculated width (0.9707 mm for 2 A, 10 °C, 1 oz) goes to the fusing page in mm.
    ok(/^#\/fusing\?k=trace&w=0\.970\d*&w_u=mm&t=1&t_u=oz$/.test(run('trace').fusing), run('trace').fusing);
    // … also when the page works in mil, and copper given in mm becomes µm.
    ok(/w=0\.970\d*&w_u=mm/.test(run('trace', { W_u: 'mil' }).fusing), 'width stays in mm');
    ok(run('trace', { t: 0.07, t_u: 'mm' }).fusing.endsWith('t=70&t_u=um'), 'copper in mm → µm');
    eq(run('trace').via, '#/via?I=2&I_u=A');
    eq(run('trace', { I: 500, I_u: 'mA' }).via, '#/via?I=0.5&I_u=A');
    eq(run('trace').dcdrop, '#/dcdrop');
    // Impedance: a single-ended line passes Z0 and delay; a differential pair has no termination link.
    ok(/^#\/termination\?z0=55\.07\d*&tpd=5\.84\d*&tpd_u=psmm$/.test(run('impedance').termination), run('impedance').termination);
    eq(run('impedance', { st: 'diffMicrostrip' }).termination, undefined);
    eq(run('impedance', { st: 'stripline' }).crosstalk, '#/crosstalk?st=strip&w=0.3&w_u=mm&h=0.2&h_u=mm');
    // Buck: the switch sees V_in and I_L for D = 30.6 %; boost: V_out.
    ok(/^#\/mosfet\?v=12&i=2&im=duty&d=30\.5\d*&f=500&f_u=kHz$/.test(run('dcdc').mosfet), run('dcdc').mosfet);
    ok(run('dcdc', { top: 'boost', vin: 5, vout: 12, iout: 1 }).mosfet.startsWith('#/mosfet?v=12&'), 'boost blocks V_out');
    // Inrush: V/R = 150 A with τ = 8 µs becomes the fuse pulse; other modes have no such pulse.
    eq(run('inrush').protection, '#/protection?mode=fuse&shape=exp&ip=150&tp=8&tp_u=us&vckt=12');
    eq(run('inrush', { mode: 'ramp' }).protection, undefined);
    // Protection: only the fuse and PTC modes know a fault current.
    eq(run('protection').fusing, undefined);
    eq(run('protection', { mode: 'fuse' }).fusing, '#/fusing?k=trace&m=time&I=20&I_u=A');
    // Hold-up: the chosen standard capacitor (1500 µF) in farads.
    eq(run('holdup').inrush, '#/inrush?mode=plug&sup=dc&v=12&c=0.0015');
    eq(run('holdup', { solve: 'time' }).inrush, '#/inrush?mode=plug&sup=dc&v=12&c=0.001');
    // Crystal ↔ oscillator margin keep the load capacitance and the frequency with its unit.
    eq(run('crystal').xtalgm, '#/xtalgm?cl=12.5&cs=3&f=32.768&f_u=kHz');
    eq(run('xtalgm').crystal, '#/crystal?mode=caps&cl=10&cs=5&f=8&f_u=MHz');
  }],

  ['next steps: the block is escaped, labelled and empty for tools without follow-ups', () => {
    const before = getLang();
    try {
      for (const lang of ['tr', 'en']) {
        setLang(lang);
        const page = pageById.get('trace');
        const { raw, units } = defaults(page);
        const v = parsed(page, raw);
        const html = nextStepsHtml('trace', page.compute(v, units), v, units);
        ok(html.startsWith('<nav class="block next-steps"') && html.includes(`<h2>${dictionaries[lang].nextSteps}</h2>`), `${lang}: heading`);
        eq((html.match(/class="next-card"/g) ?? []).length, 3, `${lang}: three cards`);
        ok(html.includes(dictionaries[lang].tool_fusing) && html.includes(dictionaries[lang].next_trace_fusing), `${lang}: name and reason`);
        ok(html.includes('href="#/fusing?k=trace&amp;w='), `${lang}: the query is escaped in the attribute`);
        ok(!/next_[a-z]+_[a-z]+/.test(html.replace(/<[^>]*>/g, ' ')), `${lang}: no raw key in the text`);
      }
      eq(nextStepsHtml('units', {}, {}, {}), '');
      eq(nextStepsHtml('no-such-tool', {}, {}, {}), '');
      // A link whose values cannot be built is left out instead of breaking the page.
      eq(nextSteps('thermal', { ok: true }, {}, {}).length, 0);
      eq(nextSteps('dcdc', {}, {}, {}).filter((s) => s.to === 'mosfet').length, 0);
    } finally {
      setLang(before);
    }
  }],
];
