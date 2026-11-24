// Stack-up planner and fabricator capability checks.
// Thicknesses are summed by hand in the comments; impedances are cross-checked
// against src/engine/impedance.js (the planner must call the same models with
// the right heights) and sanity-checked against IPC-2141.

import { near, eq, ok } from '../assert.js';
import {
  analyzeStackup, layerModel, symmetry, presetById, presetStack, PRESETS, DEFAULT_ROLES, rolesFromCode, rolesToCode,
  dielKind, LAYER_COUNTS,
} from '../../src/engine/stackup.js';
import {
  microstrip, stripline, asymStripline, embeddedMicrostrip, diffMicrostripZ, diffStriplineZ, solveWidth,
  calculateImpedance, ipc2141Microstrip,
} from '../../src/engine/impedance.js';
import { FABS, fabById, fabChecks, traceSpaceRule, ringRule, holeCopperRule, thicknessMatch } from '../../src/engine/fabs.js';
import { setLang, getLang } from '../../src/i18n.js';
import page, { defaultState, stateFromPreset, fromParams, toQuery } from '../../src/pages/stackup.js';
import { fabRows } from '../../src/ui/fabcheck.js';

/** Build an analysis input from a preset id and a role code. */
function stackOf(id, code, extra = {}) {
  const p = presetById(id);
  const s = presetStack(p);
  return { roles: rolesFromCode(code ?? DEFAULT_ROLES[p.n]), cuUm: s.cuUm, diel: s.diel, wMm: 0.2, sMm: 0.2, targetMm: 1.6, tolPct: 10, ...extra };
}
const sig = (r, i) => r.signals.find((s) => s.i === i);

export const cases = [
  ['stackup: every preset has n copper / n−1 dielectrics, is symmetric and ≈ 1.6 mm', () => {
    for (const p of PRESETS) {
      eq(p.cu.length, p.n, `${p.id} copper`);
      eq(p.d.length, p.n - 1, `${p.id} dielectrics`);
      const r = analyzeStackup(stackOf(p.id));
      ok(r.ok, `${p.id} ok`);
      ok(r.symmetry.ok, `${p.id} symmetric`);
      ok(r.thickness.pass, `${p.id} within 1.6 mm ±10 % (${r.thickness.totalMm})`);
    }
  }],

  ['stackup: total thickness of JLC04161H-7628, JLC06161H-3313, PCBWay 4L, generic 2L', () => {
    // 2·0.035 + 2·0.0152 + 2·0.2104 + 1.065 = 0.07 + 0.0304 + 0.4208 + 1.065 = 1.5862 mm
    near(analyzeStackup(stackOf('JLC04161H-7628')).thickness.totalMm, 1.5862, 1e-9);
    // 2·0.035 + 4·0.0152 + 2·0.0994 + 2·0.55 + 0.1088 = 0.07 + 0.0608 + 0.1988 + 1.1 + 0.1088 = 1.5384 mm
    near(analyzeStackup(stackOf('JLC06161H-3313')).thickness.totalMm, 1.5384, 1e-9);
    // 4·0.035 + 2·0.1855 + 1.03 = 0.14 + 0.371 + 1.03 = 1.541 mm (PCBWay: 1.51 mm after lamination with 0.5 oz base outer foil)
    const pw = analyzeStackup(stackOf('pcbway4')).thickness;
    near(pw.totalMm, 1.541, 1e-9);
    near(pw.cuTotal, 0.14, 1e-9);
    near(pw.dielTotal, 1.401, 1e-9);
    // 2·0.035 + 1.5 = 1.57 mm
    near(analyzeStackup(stackOf('gen2')).thickness.totalMm, 1.57, 1e-9);
  }],

  ['stackup: thickness window pass / fail', () => {
    // generic 4L = 4·0.035 + 0.2 + 1.0 + 0.2 = 1.54 mm; 1.6 ±10 % = 1.44…1.76 → pass
    const a = analyzeStackup(stackOf('gen4')).thickness;
    near(a.totalMm, 1.54, 1e-9);
    near(a.lo, 1.44, 1e-9);
    near(a.hi, 1.76, 1e-9);
    ok(a.pass, 'pass at ±10 %');
    // ±2 % → 1.568…1.632 → 1.54 fails
    ok(!analyzeStackup(stackOf('gen4', null, { tolPct: 2 })).thickness.pass, 'fail at ±2 %');
  }],

  ['stackup: JLC04161H-7628 outer layer = microstrip on 0.2104 mm 7628 (εr 4.4)', () => {
    const r = analyzeStackup(stackOf('JLC04161H-7628', 'SGPS'));
    const L1 = sig(r, 0);
    eq(L1.structure, 'microstrip');
    eq(L1.dn, 1, 'reference below = L2');
    near(L1.h, 0.2104, 1e-12);
    near(L1.er, 4.4, 1e-12);
    // Same numbers as the impedance engine with w = 0.2, t = 0.035, h = 0.2104, εr = 4.4
    const z0 = microstrip(0.2, 0.035, 0.2104, 4.4).z0;
    near(L1.z0, z0, 1e-12);
    near(L1.zdiff, diffMicrostripZ(z0, 0.2, 0.2104), 1e-12);
    // IPC-2141: 87/√5.81 · ln(5.98·0.2104 / (0.8·0.2 + 0.035)) = 36.09 · ln(6.452) = 67.3 Ω; H-J within 10 %
    near(ipc2141Microstrip(0.2, 0.035, 0.2104, 4.4), 67.3, 2e-3);
    near(L1.z0, 67.3, 0.1);
    // 50 Ω width equals the impedance page's synthesis
    near(L1.w50, solveWidth({ structure: 'microstrip', t: 0.035, h: 0.2104, er: 4.4 }, 50), 1e-6);
    near(calculateImpedance({ structure: 'microstrip', w: L1.w50, t: 0.035, h: 0.2104, er: 4.4 }).z0, 50, 1e-6);
    // 90 / 100 Ω differential at s = 0.2 mm
    near(L1.wd[0], solveWidth({ structure: 'diffMicrostrip', t: 0.035, h: 0.2104, s: 0.2, er: 4.4 }, 90), 1e-6);
    near(L1.wd[1], solveWidth({ structure: 'diffMicrostrip', t: 0.035, h: 0.2104, s: 0.2, er: 4.4 }, 100), 1e-6);
    ok(L1.wd[1] < L1.wd[0] && L1.wd[0] < L1.w50, 'higher target → narrower trace');
    // L4 mirrors L1 (reference L3 = power plane)
    near(sig(r, 3).z0, L1.z0, 1e-12);
    eq(sig(r, 3).up, 2);
    eq(r.pwrRef.join(), '3', 'L4 only next to a power plane');
  }],

  ['stackup: symmetric stripline (G/S/G, 0.2 + 0.2 mm) matches Wheeler with b = h1 + h2 + t', () => {
    const s = stackOf('gen4', 'GSGS', { diel: [{ h: 0.2, er: 4.3 }, { h: 0.2, er: 4.3 }, { h: 0.2, er: 4.3 }] });
    const L2 = sig(analyzeStackup(s), 1);
    eq(L2.structure, 'stripline');
    near(L2.b, 0.2 + 0.2 + 0.035, 1e-12); // 0.435 mm
    near(L2.z0, stripline(0.2, 0.035, 0.435, 4.3).z0, 1e-9);
    near(L2.zdiff, diffStriplineZ(L2.z0, 0.2, 0.435), 1e-9);
    near(L2.w50, solveWidth({ structure: 'stripline', t: 0.035, h: 0.435, er: 4.3 }, 50), 1e-6);
    near(L2.wd[1], solveWidth({ structure: 'diffStripline', t: 0.035, h: 0.435, s: 0.2, er: 4.3 }, 100), 1e-6);
  }],

  ['stackup: generic 6L L3 = asymmetric stripline, core 0.4 above / PP 0.2 below, weighted εr', () => {
    // Roles S/G/S/P/G/S. L3 (i = 2): plane L2 above across the 0.4 mm core, plane L4 below across the 0.2 mm PP.
    const base = stackOf('gen6');
    const L3 = sig(analyzeStackup(base), 2);
    eq(L3.structure, 'asymStripline');
    eq(L3.up, 1);
    eq(L3.dn, 3);
    near(L3.h2, 0.4, 1e-12);
    near(L3.h1, 0.2, 1e-12);
    near(L3.z0, asymStripline(0.2, 0.018, 0.2, 0.4, 4.3).z0, 1e-12);
    // εr 4.6 on the core and 4.0 on the PP: (0.4·4.6 + 0.2·4.0) / 0.6 = (1.84 + 0.8) / 0.6 = 4.4
    const d = base.diel.map((x, j) => (j === 1 ? { ...x, er: 4.6 } : j === 2 ? { ...x, er: 4.0 } : x));
    near(sig(analyzeStackup({ ...base, diel: d }), 2).er, 4.4, 1e-12);
  }],

  ['stackup: distant reference, broadside pair and embedded microstrip (S/S/G/S)', () => {
    const r = analyzeStackup(stackOf('gen4', 'SSGS'));
    // L1 → plane L3 through L2: h = 0.2 + 0.035 + 1.0 = 1.235 mm
    const L1 = sig(r, 0);
    eq(L1.structure, 'microstrip');
    near(L1.h, 1.235, 1e-12);
    ok(!L1.adjacent, 'L1 has no adjacent plane');
    // L2: plane below only, inner layer → embedded microstrip, h = 1.0, cover c = 0.2 (L1–L2 PP)
    const L2 = sig(r, 1);
    eq(L2.structure, 'embedded');
    near(L2.h, 1.0, 1e-12);
    near(L2.c, 0.2, 1e-12);
    near(L2.z0, embeddedMicrostrip(0.2, 0.035, 1.0, 0.2, 4.3).z0, 1e-12);
    eq(r.noAdj.join(), '0');
    eq(r.broadside.map((p) => p.join('-')).join(), '0-1');
    eq(r.symmetry.balance.map((p) => p.join('-')).join(), '1-2', 'L2 signal faces L3 GND');
  }],

  ['stackup: no plane at all → uncontrolled, reported as noRef', () => {
    const r = analyzeStackup(stackOf('gen2', 'SS'));
    eq(r.noRef.join(), '0,1');
    eq(sig(r, 0).structure, 'none');
    ok(sig(r, 0).z0 === undefined, 'no impedance');
    // 2-layer with a bottom GND: microstrip over the whole 1.5 mm core
    const g = sig(analyzeStackup(stackOf('gen2', 'SG')), 0);
    near(g.h, 1.5, 1e-12);
    ok(g.w50 > 2.5 && g.w50 < 3.2, `50 Ω on 1.5 mm FR-4 is ≈ 2.9 mm wide (${g.w50})`);
  }],

  ['stackup: symmetry detection (copper, dielectric, εr)', () => {
    const s = presetStack(presetById('JLC04161H-7628'));
    const roles = rolesFromCode('SGPS');
    ok(symmetry(roles, s.cuUm, s.diel).ok, 'preset symmetric');
    const cu = [70, 15.2, 15.2, 35];
    eq(symmetry(roles, cu, s.diel).cu.map((p) => p.join('-')).join(), '0-3', 'copper L1/L4');
    // 15.2 vs 15.8 µm: Δ 0.6 µm ≤ 1 µm → still symmetric
    ok(symmetry(roles, [35, 15.2, 15.8, 35], s.diel).ok, 'sub-micron difference ignored');
    const d1 = s.diel.map((x, j) => (j === 0 ? { ...x, h: 0.25 } : x));
    eq(symmetry(roles, s.cuUm, d1).diel.map((p) => p.join('-')).join(), '0-2', 'PP 0.25 vs 0.2104 (16 %)');
    const d2 = s.diel.map((x, j) => (j === 2 ? { ...x, er: 4.6 } : x));
    const sy = symmetry(roles, s.cuUm, d2);
    eq(sy.er.length, 1, 'εr 4.4 vs 4.6');
    ok(!sy.ok, 'asymmetric');
    // Middle core of a 4-layer board has no mirror partner
    eq(symmetry(roles, s.cuUm, s.diel.map((x, j) => (j === 1 ? { ...x, h: 0.5 } : x))).diel.length, 0);
  }],

  ['stackup: helpers (roles code, dielectric kind, defaults, errors)', () => {
    eq(rolesToCode(rolesFromCode('SGPM')), 'SGPM');
    eq([0, 1, 2].map((j) => dielKind(4, j)).join(), 'prepreg,core,prepreg');
    eq(dielKind(2, 0), 'core');
    for (const n of LAYER_COUNTS) {
      const r = analyzeStackup(stackOf(`gen${n}`));
      eq(r.broadside.length, n === 10 ? 2 : 0, `default roles ${n}L`);
      ok(r.noRef.length === 0 && r.noAdj.length === 0, `every default signal layer next to a plane (${n}L)`);
    }
    const bad = analyzeStackup({ ...stackOf('gen4'), diel: [{ h: 0.2, er: 0.5 }, { h: 0, er: 4 }, { h: 0.2, er: 4 }] });
    ok(!bad.ok && bad.errors.includes('su_diel') && bad.errors.includes('su_er'), 'invalid dielectric');
  }],

  ['stackup page: URL round trip keeps edits in canonical mm / µm', () => {
    const st = stateFromPreset('JLC06161H-3313');
    st.roles = rolesFromCode('SGSSPS');
    st.cuUm[0] = 70;
    st.diel[2] = { ...st.diel[2], h: 0.15 };
    st.wMm = 0.127;
    const q = toQuery(st);
    ok(q.includes('n=6') && q.includes('p=JLC06161H-3313') && q.includes('r=SGSSPS') && q.includes('w=0.127'), q);
    ok(!q.includes('e='), 'unchanged εr not written');
    const back = fromParams(new URLSearchParams(q));
    eq(back.preset, 'JLC06161H-3313');
    eq(rolesToCode(back.roles), 'SGSSPS');
    eq(back.cuUm.join(), '70,15.2,15.2,15.2,15.2,35');
    near(back.diel[2].h, 0.15, 1e-12);
    near(back.diel[1].er, 4.6, 1e-12);
    near(back.wMm, 0.127, 1e-12);
    eq(toQuery(defaultState(4)), '', 'defaults → empty query');
    eq(fromParams(new URLSearchParams('n=7&r=XX')).n, 4, 'invalid n falls back');
  }],

  ['stackup page: cross-section of every preset is clean SVG in TR and EN', () => {
    const before = getLang();
    const counts = new Map();
    const problems = [];
    const geo = (s) => [...s.matchAll(/\s(?:d|points|transform)="([^"]*)"/g)]
      .reduce((n, [, v]) => n + (v.match(/-?(\d+\.?\d*|\.\d+)/g) ?? []).length, 0);
    try {
      for (const l of ['tr', 'en']) {
        setLang(l);
        for (const p of PRESETS) {
          for (const code of [DEFAULT_ROLES[p.n], 'S'.repeat(p.n), 'M'.repeat(p.n - 1) + 'G']) {
            const st = { ...stateFromPreset(p.id), roles: rolesFromCode(code) };
            const out = page.diagram(st, {}, page.compute(st));
            const id = `${p.id}/${code}`;
            if (/NaN|undefined|Infinity/.test(out)) problems.push(`${l}:${id} NaN`);
            for (const [, a, v] of out.matchAll(/\s(x|y|width|height|x1|y1|x2|y2|cx|cy|r)="([^"]*)"/g)) {
              if (!/^-?[\d.]+$/.test(v)) problems.push(`${l}:${id} ${a}="${v}"`);
            }
            const n = geo(out);
            if (counts.has(id) && counts.get(id) !== n) problems.push(`${id}: TR/EN geometry differs`);
            counts.set(id, n);
          }
        }
      }
    } finally {
      setLang(before);
    }
    ok(problems.length === 0, problems.slice(0, 8).join('\n'));
  }],

  ['fabs: trace/space rules by copper weight, layer position and layer count', () => {
    const jlc = fabById('jlc');
    // 1 oz: 0.10 mm on 1–2 layer boards (also when the layer count is unknown), 0.09 mm multilayer
    eq(traceSpaceRule(jlc, { oz: 1 }).trace, 0.10);
    eq(traceSpaceRule(jlc, { oz: 1, layers: 4 }).trace, 0.09);
    eq(traceSpaceRule(jlc, { oz: 0.43, inner: true, layers: 4 }).space, 0.09); // 15.2 µm inner
    eq(traceSpaceRule(jlc, { oz: 2, layers: 2 }).trace, 0.16);
    eq(traceSpaceRule(jlc, { oz: 2, layers: 6 }).trace, 0.15);
    ok(traceSpaceRule(jlc, { oz: 3 }) === null, 'JLCPCB publishes no 3 oz rule');
    // PCBWay 2 oz outer: 7/8 mil = 0.1778 / 0.2032 mm
    const pw = traceSpaceRule(fabById('pcbway'), { oz: 2 });
    near(pw.trace, 0.1778, 1e-9);
    near(pw.space, 0.2032, 1e-9);
    // 1 oz plated outer copper (≈ 1.03 oz) still uses the 1 oz row
    eq(traceSpaceRule(fabById('eurocircuits'), { oz: 1.03 }).trace, 0.15);
  }],

  ['fabs: pass / fail logic of fabChecks', () => {
    const jlc = fabById('jlc');
    const byId = (list) => Object.fromEntries(list.map((c) => [c.id, c]));
    let c = byId(fabChecks(jlc, { traceMm: 0.095, spaceMm: 0.1, layers: 4 }));
    ok(c.trace.ok && c.space.ok, '0.095 ≥ 0.09 on a 4-layer board');
    c = byId(fabChecks(jlc, { traceMm: 0.095, layers: 2 }));
    ok(!c.trace.ok, '0.095 < 0.10 on a 2-layer board');
    // Via 0.3 / 0.4 mm → ring 0.05 mm = JLC minimum (boundary passes); 0.39 mm pad fails
    ok(byId(fabChecks(jlc, { holeMm: 0.3, padMm: 0.4 })).ring.ok, 'ring at the limit');
    ok(!byId(fabChecks(jlc, { holeMm: 0.3, padMm: 0.39 })).ring.ok, 'ring below the limit');
    ok(!byId(fabChecks(jlc, { holeMm: 0.1 })).hole.ok, '0.1 mm drill below 0.15 mm');
    // JLC min via pad = 0.15 + 2·0.05 = 0.25 mm
    near(byId(fabChecks(jlc, { viaPadMm: 0.3 })).viaPad.limit, 0.25, 1e-12);
    // PTH ring: 0.18 mm (2-layer / unknown), 0.15 mm (multilayer)
    eq(ringRule(jlc, 'pth'), 0.18);
    eq(ringRule(jlc, 'pth', 4), 0.15);
    // Eurocircuits proto: 1.55 mm ± 10 % → 1.395…1.705; 1.5862 passes, 1.2 fails; 6 layers not offered
    const ec = fabById('eurocircuits');
    ok(thicknessMatch(ec, 1.5862).ok, '1.586 mm ok');
    ok(!thicknessMatch(ec, 1.2).ok, '1.2 mm not ok');
    eq(byId(fabChecks(ec, { layers: 6 })).layers.ok, false);
    // Euro hole-to-copper 0.25 mm from the finished hole: antipad 0.8 on a 0.3 hole → 0.25 → pass
    ok(byId(fabChecks(ec, { holeCopperMm: (0.8 - 0.3) / 2 })).holeCu.ok, 'antipad 0.8 / hole 0.3');
    // JLC thickness below 1 mm: ±0.1 mm → 0.88 mm matches 0.8 mm (|0.08| ≤ 0.1)
    const m = thicknessMatch(jlc, 0.88);
    eq(m.nominal, 0.8);
    ok(m.ok, '0.88 within 0.8 ± 0.1');
    // PCBWay inner isolation by layer count: 4L 7 mil, 6L 8 mil, 12L 10 mil
    const pcbw = fabById('pcbway');
    near(holeCopperRule(pcbw, 'via', 4), 0.1778, 1e-9);
    near(holeCopperRule(pcbw, 'via', 6), 0.2032, 1e-9);
    near(holeCopperRule(pcbw, 'via', 12), 0.254, 1e-9);
    // No published rule → null (not a fail)
    eq(byId(fabChecks(jlc, { traceMm: 0.3, oz: 3 })).trace.ok, null);
  }],

  ['fabs: the generic entry is at least as strict as every fabricator', () => {
    const g = fabById('generic');
    const others = FABS.filter((f) => f.id !== 'generic');
    for (const f of others) {
      for (const oz of [0.5, 1, 2, 3]) {
        for (const inner of [false, true]) {
          for (const layers of [undefined, 2, 4]) {
            const a = traceSpaceRule(f, { oz, inner, layers });
            const b = traceSpaceRule(g, { oz, inner, layers });
            if (!a) continue;
            ok(b && b.trace >= a.trace - 1e-9 && b.space >= a.space - 1e-9, `${f.id} ${oz} oz ${inner ? 'inner' : 'outer'} ${layers}`);
          }
        }
      }
      ok(g.minHoleMm >= f.minHoleMm, `${f.id} hole`);
      for (const kind of ['via', 'pth']) {
        ok(ringRule(g, kind) >= ringRule(f, kind) - 1e-9, `${f.id} ring ${kind}`);
        for (const n of [4, 6, 8, 10]) ok(holeCopperRule(g, kind, n) >= holeCopperRule(f, kind, n) - 1e-9, `${f.id} hole-Cu ${kind} ${n}L`);
      }
    }
    // IPC-2221B Level B land: D = hole + 2·0.05 + 0.25 → ring = 0.175 mm
    near(g.ring.via, 0.05 + 0.25 / 2, 1e-12);
  }],

  ['fab check block: rows render for every fabricator in TR and EN', () => {
    const before = getLang();
    try {
      for (const l of ['tr', 'en']) {
        setLang(l);
        for (const f of FABS) {
          const rows = fabRows(f, { traceMm: 0.15, spaceMm: 0.15, oz: 1, holeMm: 0.3, padMm: 0.6, holeKind: 'via', viaPadMm: 0.6, holeCopperMm: 0.3, boardMm: 1.6, layers: 4 });
          ok(rows.length >= 7, `${f.id} rows`);
          ok(rows.every(([, label]) => !/undefined|NaN|fab_/.test(label)), `${f.id} labels`);
        }
      }
    } finally {
      setLang(before);
    }
  }],
];
