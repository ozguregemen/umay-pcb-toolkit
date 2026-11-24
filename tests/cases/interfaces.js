// Interface design rules: data completeness, sources, skew ⇄ length conversion.

import { near, eq, ok } from '../assert.js';
import {
  SOURCES, RULE_SETS, RULES, ROW_KINDS, GENERAL_HS, INTERFACES, PCIE_GENS, DDR_GROUPS, ETH_PARTS,
  ruleSetFor, rowKey, sourcesOf, erEffective, delayPsPerMm, toPs, convertSkew, limitIn, withinLimit, PS_PER_MM_VACUUM,
} from '../../src/engine/interfaces.js';
import page from '../../src/pages/interfaces.js';
import { registerStrings, setLang, getLang } from '../../src/i18n.js';

registerStrings(page.strings);
const { tr, en } = page.strings;

const LIMIT_UNITS = ['ps', 'mil', 'mm'];

/** Page values for a rule set (inverse of ruleSetFor). */
function valuesFor(set, extra = {}) {
  const v = { iface: set.id, gen: 'gen3', grp: 'data', eth: 'mdi', st: 'microstrip', er: 4.3, x: NaN, ...extra };
  let m = set.id.match(/^pcie_(gen\d)$/);
  if (m) Object.assign(v, { iface: 'pcie', gen: m[1] });
  m = set.id.match(/^(ddr\d)_(\w+)$/);
  if (m) Object.assign(v, { iface: m[1], grp: m[2] });
  m = set.id.match(/^eth_(\w+)$/);
  if (m) Object.assign(v, { iface: 'eth', eth: m[1] });
  return v;
}

function inBoth(fn) {
  const before = getLang();
  try {
    for (const l of ['tr', 'en']) { setLang(l); fn(l); }
  } finally {
    setLang(before);
  }
}

export const cases = [
  ['interfaces: every rule set has an impedance, a source and known source ids', () => {
    ok(RULE_SETS.length >= 25, `rule sets: ${RULE_SETS.length}`);
    for (const s of RULE_SETS) {
      const zs = [s.z?.diff, s.z?.se].filter(Boolean);
      if (s.kind === 'note' && s.z?.none) {
        ok(s.z.src?.length > 0, `${s.id}: "no impedance" must cite a source`);
      } else {
        ok(zs.length > 0, `${s.id}: impedance missing`);
        for (const z of zs) {
          ok(z.nom > 0 || (z.range?.[0] > 0 && z.range[1] > z.range[0]), `${s.id}: impedance value`);
          ok(z.src?.length > 0, `${s.id}: impedance source`);
          if (z.tol !== undefined) ok(z.tol > 0 && z.tol < 50, `${s.id}: tolerance`);
          if (z.nom && z.range) ok(z.range[0] <= z.nom && z.nom <= z.range[1], `${s.id}: nominal inside the vendor range`);
        }
      }
      const ids = sourcesOf(s);
      ok(ids.length > 0, `${s.id}: no source`);
      for (const id of ids) ok(SOURCES[id], `${s.id}: unknown source "${id}"`);
      for (const r of s.rows) ok(r.src.length > 0 && ROW_KINDS.includes(r.k), `${s.id}/${r.k}: row kind and source`);
      if (s.imp) ok(s.imp.Z > 0 && ['diff', 'se'].includes(s.imp.mode), `${s.id}: impedance link`);
    }
  }],

  ['interfaces: sources carry title, document number, https URL and access date', () => {
    for (const [id, s] of Object.entries(SOURCES)) {
      ok(s.short && s.org && s.title && s.doc && s.rev, `${id}: fields`);
      ok(/^https:\/\/[^\s]+$/.test(s.url), `${id}: url ${s.url}`);
      ok(/^\d{4}-\d{2}-\d{2}$/.test(s.accessed), `${id}: access date`);
    }
  }],

  ['interfaces: every rule row and menu entry has Turkish and English text', () => {
    const missing = [];
    const need = (k) => { for (const [l, d] of [['tr', tr], ['en', en]]) if (!d[k]) missing.push(`${l}:${k}`); };
    for (const s of RULE_SETS) for (const r of s.rows) need(`if_${rowKey(s, r)}`);
    for (const r of GENERAL_HS) { need(`if_${r.k}`); need(`if_row_${r.k}`); }
    for (const k of ['rate', ...ROW_KINDS]) need(`if_row_${k}`);
    for (const id of INTERFACES) need(`if_opt_${id}`);
    for (const g of DDR_GROUPS) need(`if_grp_${g}`);
    for (const p of ETH_PARTS) need(`if_eth_${p}`);
    for (const s of RULE_SETS) {
      for (const l of s.limits) if (l.ref) need(`if_ref_${l.ref}`);
      if (s.rate?.note) need(`if_rateSub_${s.id}`);
      if (s.kind === 'note' && !s.z.none) need(`if_zSub_${s.id}`);
    }
    ok(missing.length === 0, missing.join(', '));
    eq(Object.keys(tr).filter((k) => !(k in en)).join(), '', 'keys only in TR');
    eq(Object.keys(en).filter((k) => !(k in tr)).join(), '', 'keys only in EN');
  }],

  ['interfaces: menu choices map to distinct rule sets', () => {
    const seen = new Set();
    for (const id of INTERFACES) {
      const subs = id === 'pcie' ? PCIE_GENS.map((gen) => ({ gen }))
        : id === 'eth' ? ETH_PARTS.map((eth) => ({ eth }))
          : /^ddr/.test(id) ? DDR_GROUPS.map((grp) => ({ grp })) : [{}];
      for (const sub of subs) {
        const s = ruleSetFor(id, sub);
        ok(s, `${id} ${JSON.stringify(sub)}`);
        seen.add(s.id);
      }
    }
    eq(seen.size, RULE_SETS.length, 'every rule set reachable');
    eq(ruleSetFor('pcie', { gen: 'gen9' }).id, 'pcie_gen3', 'invalid generation falls back');
    eq(ruleSetFor('nope').id, 'usb2', 'unknown interface falls back');
  }],

  ['interfaces: limits are well formed; high-speed pairs have an intra-pair limit', () => {
    for (const s of RULE_SETS) {
      for (const l of s.limits) {
        ok(LIMIT_UNITS.includes(l.unit) && l.src.length > 0, `${s.id}: limit unit/source`);
        if (l.min !== undefined) ok(l.min < l.max && l.unit === 'ps', `${s.id}: window`);
        else ok(l.value > 0, `${s.id}: limit value`);
      }
      if (s.hs) ok(s.limits.some((l) => l.id === 'pair'), `${s.id}: intra-pair limit`);
    }
    // Spot checks against the sources.
    eq(RULES.usb2.limits[0].value, 50); eq(RULES.usb2.limits[0].unit, 'mil'); // TI SPRAAR7J Table A-1
    eq(RULES.usb2.z.diff.nom, 90); eq(RULES.usb2.z.diff.tol, 10);
    eq(RULES.pcie_gen4.z.diff.nom, 85); eq(RULES.pcie_gen1.z.diff.nom, 100);
    eq(RULES.ddr4_data.limits[0].value, 10); // AMD UG583: DQ to DQS ±10 ps
    eq(RULES.mipi.limits[1].value, 40); // TI: CSI lane skew 40 ps = 0.1 UI at 2.5 Gbit/s
  }],

  ['interfaces: propagation delay against a hand calculation', () => {
    near(PS_PER_MM_VACUUM, 3.33564095, 1e-8, '1 mm in vacuum');
    // Stripline FR-4, εr = 4.3: √4.3 · 3.33564 = 6.91693 ps/mm = 175.690 ps/in.
    const ts = delayPsPerMm(erEffective('stripline', 4.3));
    near(ts, 6.9169323, 1e-6, 'stripline ps/mm');
    near(ts * 25.4, 175.69008, 1e-6, 'stripline ps/in');
    // Microstrip εr = 4.0: εeff = 0.475·4 + 0.67 = 2.57 → 135.82 ps/in (ADI MT-094: ≈ 136 ps/in).
    near(erEffective('microstrip', 4), 2.57, 1e-12, 'IPC-2141A εeff');
    const tm = delayPsPerMm(2.57);
    near(tm, 5.3474392, 1e-6, 'microstrip ps/mm');
    near(tm * 25.4, 136, 0.005, 'MT-094 example');
    eq(erEffective('known', 3.1), 3.1, 'known εeff is used as is');
  }],

  ['interfaces: skew ⇄ length conversion and units', () => {
    const tpd = 6.9169323; // stripline, εr 4.3
    // 5 mil = 0.127 mm → 0.127 · 6.91693 = 0.87845 ps
    const a = convertSkew(5, 'mil', tpd);
    near(a.mm, 0.127, 1e-12); near(a.ps, 0.8784504, 1e-6); near(a.mil, 5, 1e-12);
    // 10 ps on FR-4 microstrip (εr 4) → 1.87005 mm = 73.624 mil
    const b = convertSkew(10, 'ps', 5.3474392);
    near(b.mm, 1.8700540, 1e-6); near(b.mil, 73.624172, 1e-6);
    // Units: ns, in, mm round trip; unknown unit throws
    eq(toPs(0.2, 'ns', tpd), 200);
    near(toPs(1, 'in', tpd), 175.69008, 1e-6);
    near(convertSkew(convertSkew(3, 'mm', tpd).ps, 'ps', tpd).mm, 3, 1e-12, 'round trip');
    let threw = false;
    try { toPs(1, 'furlong', tpd); } catch { threw = true; }
    ok(threw, 'unknown unit throws');
    // Limits in either domain, ± and windows
    const usb = RULES.usb2.limits[0];
    near(limitIn(usb, tpd).max.ps, 50 * 0.0254 * tpd, 1e-12);
    ok(withinLimit(usb, -limitIn(usb, tpd).max.ps, tpd), 'sign ignored, edge included');
    ok(!withinLimit(usb, 9, tpd), '9 ps > 50 mil (8.79 ps)');
    const wl = RULES.ddr4_clock.limits[1];
    ok(withinLimit(wl, -100, tpd) && withinLimit(wl, 1796, tpd) && !withinLimit(wl, -150, tpd), 'write-leveling window');
  }],

  ['interfaces: page computes the conversion, check and impedance link', () => {
    const units = { x: 'mil', er: undefined };
    const r = page.compute(valuesFor(RULES.usb3, { st: 'stripline', er: 4.3, x: 6 }), units);
    near(r.tpd, 6.9169323, 1e-6);
    near(r.input.ps, 6 * 0.0254 * 6.9169323, 1e-9);
    eq(r.input.pass[0], false, '6 mil > 5 mil');
    const q = new URLSearchParams(r.link.href.split('?')[1]);
    eq(q.get('st'), 'diffStripline'); eq(q.get('Z'), '90'); eq(q.get('mode'), 'synth');
    eq(q.get('h'), '0.5'); eq(q.get('h_u'), 'mm'); eq(q.get('s_u'), 'mm'); eq(q.get('er'), '4.3');
    const d = page.compute(valuesFor(RULES.ddr4_addr, { st: 'known', er: 3.2 }), { x: 'mm' });
    const qd = new URLSearchParams(d.link.href.split('?')[1]);
    eq(qd.get('st'), 'microstrip'); eq(qd.get('Z'), '40'); eq(qd.get('er'), null, 'εeff is not passed as εr');
    eq(page.compute(valuesFor(RULES.i2c), { x: 'mm' }).link, null, 'no impedance link for I²C');
  }],

  ['interfaces: every rule set renders in TR and EN without missing strings', () => {
    const problems = [];
    inBoth((l) => {
      for (const s of RULE_SETS) {
        for (const x of [NaN, 0.1]) {
          const v = valuesFor(s, { x });
          const html = page.render(page.compute(v, { x: 'mm' }), v, { x: 'mm' });
          if (/undefined|NaN/.test(html)) problems.push(`${l}:${s.id}: undefined/NaN`);
          const leak = html.match(/\b(if|st|warn|err)_[A-Za-z0-9]+/);
          if (leak) problems.push(`${l}:${s.id}: raw key ${leak[0]}`);
        }
      }
    });
    ok(problems.length === 0, `\n${problems.slice(0, 12).join('\n')}`);
  }],

  ['interfaces: every diagram has the same geometry in TR and EN', () => {
    const problems = [];
    // Labels may differ (and wrap differently) between languages; shapes may not.
    const geometry = (svgText) => svgText.replace(/<text[^>]*>[^<]*<\/text>/g, '').replace(/aria-label="[^"]*"/g, '');
    for (const s of RULE_SETS) {
      for (const [x, unit] of [[NaN, 'mm'], [0.3, 'mm'], [-12, 'ps'], [3, 'mil']]) {
        const out = {};
        inBoth((l) => {
          const v = valuesFor(s, { x });
          const res = page.compute(v, { x: unit });
          out[l] = page.diagram(v, { x: unit }, res);
          if (!out[l]?.startsWith('<svg') || /NaN|undefined|Infinity/.test(out[l])) problems.push(`${l}:${s.id}: bad svg`);
        });
        if (geometry(out.tr) !== geometry(out.en)) problems.push(`${s.id} x=${x}${unit}: geometry differs between TR and EN`);
      }
      // Diagram while inputs are invalid (result undefined)
      if (!page.diagram(valuesFor(s, { er: NaN }), { x: 'mm' }, undefined)?.startsWith('<svg')) problems.push(`${s.id}: no diagram without result`);
    }
    ok(problems.length === 0, `\n${problems.slice(0, 12).join('\n')}`);
  }],
];
