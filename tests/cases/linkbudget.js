// RF link budget (src/engine/linkbudget.js, src/pages/linkbudget.js).
// Expected values are worked out by hand in the comments. Independent checks:
// the dB budget against the Friis equation in linear form (watts), and the
// ranges by running the budget again at the distance they give.

import { near, eq, ok } from '../assert.js';
import {
  linkBudget, wavelength, fsplDb, pathLossDb, sensitivityDbm, fresnelRadius, rangeFor,
  C0, BOLTZMANN, T0, NOISE_DBM_HZ, REF_DISTANCE_M, FRESNEL_CLEARANCE, MODELS, SENS_MODES,
} from '../../src/engine/linkbudget.js';
import { registerStrings, setLang, getLang } from '../../src/i18n.js';
import { stepsTrace, parseNumber } from '../../src/ui/calculator.js';
import { evaluate, agrees } from './arith.js';
import page from '../../src/pages/linkbudget.js';

registerStrings(page.strings);

// 868 MHz over 1 km of free space, 14 dBm into 2 dBi antennas at both ends, receiver at −120 dBm.
const base = { fHz: 868e6, dM: 1000, ptxDbm: 14, gtxDbi: 2, ltxDb: 0, grxDbi: 2, lrxDb: 0, model: 'free', lExtraDb: 0, sensMode: 'direct', sDbm: -120, mReqDb: 10 };
const run = (o = {}) => linkBudget({ ...base, ...o });
const err = (r) => (r.ok ? 'ok' : r.errors.join());

/** True when no number anywhere in the result is NaN or infinite. */
function finiteAll(x) {
  if (typeof x === 'number') return Number.isFinite(x);
  if (x && typeof x === 'object') return Object.values(x).every(finiteAll);
  return true;
}

// ---- Page helpers: field values as the form would hold them ----
const fields = page.sections.flatMap((s) => s.fields);
function inputs(set = {}) {
  const v = {};
  const u = {};
  for (const f of fields) {
    const val = set[f.key] ?? f.default;
    const raw = val === undefined || val === null ? '' : String(val);
    v[f.key] = f.type === 'number' ? parseNumber(raw, f.si) : raw;
    if (f.type === 'number') u[f.key] = set[`${f.key}_u`] ?? f.unit ?? f.units?.[0];
  }
  return { v, u };
}
/** Render one set of inputs: result, HTML, the recorded steps and the diagram. */
function show(set) {
  const { v, u } = inputs(set);
  const r = page.compute(v, u);
  const seen = [];
  stepsTrace.record = (items) => seen.push(...items);
  let html;
  try { html = page.render(r, v, u); } finally { stepsTrace.record = null; }
  return { r, html, steps: seen, svg: page.diagram(v, u, r.ok === false ? undefined : r) };
}
function inBothLanguages(fn) {
  const before = getLang();
  try {
    for (const l of ['tr', 'en']) { setLang(l); fn(l); }
  } finally {
    setLang(before);
  }
}
/** Problems of a diagram: a missing number, a comma in geometry, anything outside the drawing. */
function svgProblems(full) {
  const bad = [];
  if (/NaN|undefined|Infinity/.test(full)) bad.push('NaN/undefined/Infinity');
  const [, , , W, H] = full.match(/viewBox="(\S+) (\S+) (\S+) (\S+)"/).map(Number);
  for (const [, tag, attrs] of full.matchAll(/<(rect|circle|text)\b([^>]*)>/g)) {
    const a = Object.fromEntries([...attrs.matchAll(/\s(x|y|cx|cy|r|width|height)="([^"]*)"/g)].map(([, k, val]) => [k, val]));
    for (const [k, val] of Object.entries(a)) if (!/^-?\d+(\.\d+)?$/.test(val)) bad.push(`${tag} ${k}="${val}"`);
    if (tag === 'text' && !(Number(a.x) >= 0 && Number(a.x) <= W && Number(a.y) >= 8 && Number(a.y) <= H)) bad.push(`text at ${a.x},${a.y}`);
  }
  for (const [, val] of full.matchAll(/\s(?:d|points)="([^"]*)"/g)) {
    const nums = (val.match(/-?\d+(\.\d+)?(e[-+]?\d+)?/gi) ?? []).map(Number);
    if (nums.some((x) => x < -0.5 || x > Math.max(W, H) + 0.5)) bad.push(`path outside the drawing: ${val.slice(0, 40)}`);
    if (/\d,\d+,\d/.test(val.replace(/[A-Za-z]/g, ' '))) bad.push(`comma in ${val.slice(0, 40)}`);
  }
  return bad;
}
const geometryCount = (svgText) => [...svgText.matchAll(/\s(?:d|points|transform|x|y|width|height)="([^"]*)"/g)]
  .reduce((n, [, val]) => n + (val.match(/-?(\d+\.?\d*|\.\d+)/g) ?? []).length, 0);

export const cases = [
  ['linkbudget: wavelength and free-space path loss', () => {
    eq(C0, 299792458);
    eq(REF_DISTANCE_M, 1);
    eq(FRESNEL_CLEARANCE, 0.6);
    eq(MODELS.join(), 'free,logd');
    eq(SENS_MODES.join(), 'direct,est');
    // 2440 MHz: λ = 299.792458 / 2440 m = 0.122866 m
    near(wavelength(2.44e9), 0.122866, 1e-5);
    // 868 MHz: λ = 299.792458 / 868 = 0.345383 m
    near(wavelength(868e6), 0.345383, 1e-5);
    // 2440 MHz, 10 m: 4π·10/0.122866 = 125.6637/0.122866 = 1022.77 → log10 = 3.009779 → ·20 = 60.196 dB
    near(fsplDb(2.44e9, 10), 60.196, 1e-4);
    // 868 MHz, 1 km: 4π·1000/0.345383 = 36384.0 → log10 = 4.560910 → ·20 = 91.218 dB
    near(fsplDb(868e6, 1000), 91.218, 1e-4);
    // The same from the handbook form 32.45 + 20·log10(f/MHz) + 20·log10(d/km):
    // the constant is 20·log10(4π·10⁹/c) = 32.448; 20·log10(868) = 58.770 → 91.218 dB
    near(fsplDb(868e6, 1000), 32.4478 + 20 * Math.log10(868) + 20 * Math.log10(1), 1e-6);
    near(fsplDb(2.44e9, 10), 32.4478 + 20 * Math.log10(2440) + 20 * Math.log10(0.01), 1e-6);
    // Twice the distance: +6.0206 dB. Ten times the frequency: +20 dB.
    near(fsplDb(868e6, 2000) - fsplDb(868e6, 1000), 6.0206, 1e-5);
    near(fsplDb(8.68e9, 1000) - fsplDb(868e6, 1000), 20, 1e-9);
    // At d = λ/(4π) the loss is 0 dB; closer than that the formula turns negative (near field).
    near(fsplDb(868e6, wavelength(868e6) / (4 * Math.PI)), 0, 1e-9);
  }],

  ['linkbudget: the budget of the reference link', () => {
    // EIRP = 14 + 2 − 0 = 16 dBm; P_rx = 16 − 91.218 − 0 + 2 − 0 = −73.218 dBm; M = −73.218 − (−120) = 46.782 dB
    const r = run();
    eq(r.ok, true);
    eq(r.model, 'free');
    eq(r.n, 2);
    near(r.lambdaM, 0.345383, 1e-5);
    near(r.fsplDb, 91.218, 1e-4);
    eq(r.plDb, r.fsplDb);
    eq(r.eirpDbm, 16);
    near(r.pAntDbm, -75.218, 1e-4);
    near(r.prxDbm, -73.218, 1e-4);
    eq(r.sDbm, -120);
    eq(r.needDbm, -110);
    near(r.marginDb, 46.782, 1e-4);
    near(r.spareDb, 36.782, 1e-4);
    eq(r.verdict, 'pass');
    eq(r.pass, true);
    eq(r.warnings.length, 0);
    // In watts: 16 dBm = 10^1.6 mW = 39.81 mW; −73.218 dBm = 10^−7.3218 mW = 4.766·10⁻¹¹ W
    near(r.eirpW, 0.039811, 1e-4);
    near(r.prxW, 4.766e-11, 1e-3);
    // Without a sensitivity estimate the noise numbers are "not applicable".
    eq(r.floorDbm, null);
    eq(r.ktbDbm, null);
  }],

  ['linkbudget: gains and losses enter with the right sign', () => {
    // −2 dBi chip antenna and 1.5 dB of matching loss at the transmitter, 0.5 dB at the receiver, 10 dB wall:
    // EIRP = 14 − 2 − 1.5 = 10.5 dBm; P_rx = 10.5 − 91.218 − 10 + 2 − 0.5 = −89.218 dBm; M = 30.782 dB
    const r = run({ gtxDbi: -2, ltxDb: 1.5, lrxDb: 0.5, lExtraDb: 10 });
    near(r.eirpDbm, 10.5, 1e-12);
    near(r.pathTotalDb, 101.218, 1e-4);
    near(r.prxDbm, -89.218, 1e-4);
    near(r.marginDb, 30.782, 1e-4);
    // Each dB of loss costs one dB of margin, each dB of gain or power adds one.
    const m0 = run().marginDb;
    near(run({ ltxDb: 3 }).marginDb, m0 - 3, 1e-9);
    near(run({ lrxDb: 3 }).marginDb, m0 - 3, 1e-9);
    near(run({ lExtraDb: 3 }).marginDb, m0 - 3, 1e-9);
    near(run({ gtxDbi: 5 }).marginDb, m0 + 3, 1e-9);
    near(run({ grxDbi: 5 }).marginDb, m0 + 3, 1e-9);
    near(run({ ptxDbm: 17 }).marginDb, m0 + 3, 1e-9);
    near(run({ sDbm: -123 }).marginDb, m0 + 3, 1e-9);
    // The receive-side loss is not part of the EIRP, the transmit-side loss is.
    eq(run({ lrxDb: 3 }).eirpDbm, 16);
    eq(run({ ltxDb: 3 }).eirpDbm, 13);
    // Gains default to 0 dBi and losses to 0 dB when they are left out.
    near(linkBudget({ fHz: 868e6, dM: 1000, ptxDbm: 14, sDbm: -120 }).prxDbm, 14 - 91.218, 1e-4);
  }],

  ['linkbudget: the dB budget agrees with the Friis equation in watts', () => {
    // P_rx = P_tx·G_tx·G_rx·(λ / (4π·d))²
    for (const [fHz, dM, ptx, gt, gr] of [[868e6, 1000, 14, 2, 2], [2.44e9, 10, 0, 0, 0], [433e6, 250, 10, -3, 2.15], [5.8e9, 3000, 20, 23, 23]]) {
      const r = run({ fHz, dM, ptxDbm: ptx, gtxDbi: gt, grxDbi: gr });
      const lin = 1e-3 * 10 ** (ptx / 10) * 10 ** (gt / 10) * 10 ** (gr / 10) * (C0 / fHz / (4 * Math.PI * dM)) ** 2;
      near(r.prxW, lin, 1e-9, `${fHz} Hz, ${dM} m`);
      near(r.prxDbm, 10 * Math.log10(lin / 1e-3), 1e-9, `${fHz} Hz, ${dM} m in dBm`);
    }
  }],

  ['linkbudget: range at the required margin and at zero margin, free space', () => {
    // 36.782 dB to spare: d_max = 1 km·10^(36.782/20) = 1 km·10^1.83909 = 69.04 km
    // 46.782 dB of margin: d(M = 0) = 1 km·10^(46.782/20) = 1 km·10^2.33909 = 218.3 km
    const r = run();
    near(r.dMaxM, 69038, 1e-4);
    near(r.dZeroM, 218319, 1e-4);
    // At those distances the margin is the required one, and zero.
    near(run({ dM: r.dMaxM }).marginDb, 10, 1e-9);
    ok(Math.abs(run({ dM: r.dZeroM }).marginDb) < 1e-9, 'zero margin at the zero-margin range');
    // 6.02 dB to spare doubles the range; 20 dB makes it ten times.
    near(rangeFor(100, 20 * Math.log10(2), 2), 200, 1e-12);
    near(rangeFor(100, 20, 2), 1000, 1e-12);
    // A link that is short of margin has its range below the distance.
    const short = run({ sDbm: -80 }); // M = 6.782 dB, 3.218 dB short: 1 km·10^(−3.218/20) = 690.4 m
    near(short.dMaxM, 690.4, 1e-3);
    near(short.dZeroM, 2183.2, 1e-3);
    // With a required margin of 0 dB both ranges are the same.
    eq(run({ mReqDb: 0 }).dMaxM, run({ mReqDb: 0 }).dZeroM);
  }],

  ['linkbudget: log-distance model with exponent n', () => {
    // 2440 MHz: FSPL(1 m) = 60.196 − 20 = 40.196 dB; n = 3, 10 m: PL = 40.196 + 30·log10(10) = 70.196 dB
    // P_tx 0 dBm, 0 dBi, S = −95 dBm: P_rx = −70.196 dBm, M = 24.804 dB
    const r = linkBudget({ fHz: 2.44e9, dM: 10, ptxDbm: 0, model: 'logd', n: 3, sDbm: -95, mReqDb: 10 });
    eq(r.model, 'logd');
    eq(r.n, 3);
    near(r.fsplRefDb, 40.196, 1e-4);
    near(r.fsplDb, 60.196, 1e-4);
    near(r.plDb, 70.196, 1e-4);
    near(r.prxDbm, -70.196, 1e-4);
    near(r.marginDb, 24.804, 1e-4);
    // Range: 10 m·10^(14.804/30) = 10 m·10^0.49348 = 31.15 m; zero margin 10 m·10^(24.804/30) = 10 m·6.711 = 67.11 m
    near(r.dMaxM, 31.15, 1e-3);
    near(r.dZeroM, 67.11, 1e-3);
    near(linkBudget({ fHz: 2.44e9, dM: r.dMaxM, ptxDbm: 0, model: 'logd', n: 3, sDbm: -95, mReqDb: 10 }).marginDb, 10, 1e-9);
    // n = 2 is free space; at the reference distance the exponent does not matter.
    near(pathLossDb({ fHz: 2.44e9, dM: 37, model: 'logd', n: 2 }), fsplDb(2.44e9, 37), 1e-12);
    near(pathLossDb({ fHz: 2.44e9, dM: 1, model: 'logd', n: 4 }), fsplDb(2.44e9, 1), 1e-12);
    // n = 4 over 100 m: 40.196 + 40·2 = 120.196 dB, 40 dB more than free space (80.196 dB).
    near(pathLossDb({ fHz: 2.44e9, dM: 100, model: 'logd', n: 4 }), 120.196, 1e-4);
    near(pathLossDb({ fHz: 2.44e9, dM: 100 }), 80.196, 1e-4);
    // The exponent is ignored in the free-space model, even an invalid one.
    eq(run({ n: NaN }).ok, true);
    eq(run({ n: 7 }).plDb, run().plDb);
  }],

  ['linkbudget: sensitivity estimated from bandwidth, noise figure and SNR', () => {
    // B = 125 kHz: 10·log10(125000) = 50.969 dB → kTB = −174 + 50.969 = −123.031 dBm
    // NF = 6 dB → noise floor −117.031 dBm; SNR = −7.5 dB → S = −124.531 dBm
    const s = sensitivityDbm({ bHz: 125e3, nfDb: 6, snrDb: -7.5 });
    near(s.ktbDbm, -123.031, 1e-5);
    near(s.floorDbm, -117.031, 1e-5);
    near(s.sDbm, -124.531, 1e-5);
    // 1 Hz, ideal receiver, 0 dB SNR: the noise density itself.
    eq(sensitivityDbm({ bHz: 1, nfDb: 0, snrDb: 0 }).sDbm, -174);
    eq(NOISE_DBM_HZ, -174);
    // k·T at 290 K: 1.380649·10⁻²³·290 = 4.00388·10⁻²¹ W/Hz = −173.98 dBm/Hz, quoted as −174.
    near(10 * Math.log10(BOLTZMANN * T0 * 1000), -173.975, 1e-5);
    ok(Math.abs(10 * Math.log10(BOLTZMANN * T0 * 1000) - NOISE_DBM_HZ) < 0.03, 'the customary −174 is within 0.03 dB');
    // 20 MHz, NF 7 dB, SNR 25 dB: −174 + 73.010 + 7 + 25 = −68.990 dBm
    near(sensitivityDbm({ bHz: 20e6, nfDb: 7, snrDb: 25 }).sDbm, -68.990, 1e-5);
    // In the budget: 868 MHz, 2 km, n = 3: PL = 31.218 + 30·log10(2000) = 31.218 + 99.031 = 130.249 dB
    // P_rx = 16 − 130.249 + 2 = −112.249 dBm; M = −112.249 + 124.531 = 12.282 dB
    const r = run({ dM: 2000, model: 'logd', n: 3, sensMode: 'est', bHz: 125e3, nfDb: 6, snrDb: -7.5 });
    near(r.plDb, 130.249, 1e-5);
    near(r.sDbm, -124.531, 1e-5);
    near(r.floorDbm, -117.031, 1e-5);
    near(r.marginDb, 12.282, 1e-4);
    eq(r.verdict, 'pass');
    // 2.282 dB to spare: 2 km·10^(2.282/30) = 2 km·1.1914 = 2383 m
    near(r.dMaxM, 2382.8, 1e-4);
    // The entered sensitivity is not used when it is estimated, and the other way round.
    eq(run({ sensMode: 'est', bHz: 125e3, nfDb: 6, snrDb: -7.5, sDbm: NaN }).ok, true);
    eq(run({ bHz: NaN, nfDb: NaN, snrDb: NaN }).ok, true);
    // Four times the bandwidth costs 6.02 dB of sensitivity.
    near(sensitivityDbm({ bHz: 500e3, nfDb: 6, snrDb: -7.5 }).sDbm - s.sDbm, 6.0206, 1e-5);
  }],

  ['linkbudget: verdict against the required fade margin', () => {
    // P_rx = −73.218 dBm.
    eq(run({ sDbm: -120 }).verdict, 'pass'); // 46.8 dB
    const low = run({ sDbm: -80 }); // 6.782 dB < 10 dB
    eq(low.verdict, 'low');
    eq(low.pass, false);
    near(low.spareDb, -3.218, 1e-3);
    const fail = run({ sDbm: -70 }); // −3.218 dB
    eq(fail.verdict, 'fail');
    near(fail.marginDb, -3.218, 1e-3);
    // With no margin asked for, a link that just closes passes.
    eq(run({ sDbm: -80, mReqDb: 0 }).verdict, 'pass');
    // At d = 10⁴·λ/(4π) the path loss is exactly 80 dB: 0 dBm − 80 dB = −80 dBm, 20 dB above −100 dBm.
    const edge = run({ gtxDbi: 0, grxDbi: 0, ptxDbm: 0, sDbm: -100, mReqDb: 20, dM: (wavelength(868e6) * 1e4) / (4 * Math.PI) });
    near(edge.plDb, 80, 1e-12);
    near(edge.marginDb, 20, 1e-12);
    ok(Math.abs(edge.spareDb) < 1e-9, 'nothing to spare');
    near(edge.dMaxM, edge.dM, 1e-9);
    // A larger required margin shortens the range it leaves: 20 dB instead of 10 dB is a factor √10 in free space.
    near(run({ mReqDb: 10 }).dMaxM / run({ mReqDb: 20 }).dMaxM, Math.sqrt(10), 1e-9);
  }],

  ['linkbudget: first Fresnel zone', () => {
    // 868 MHz, 1 km: r = ½·√(0.345383·1000) = ½·18.5845 = 9.292 m; 60 % of it 5.575 m
    const r = run();
    near(r.fresnelM, 9.2922, 1e-4);
    near(r.fresnelClearM, 5.5753, 1e-4);
    // 2440 MHz, 10 m: ½·√1.22866 = 0.5542 m
    near(fresnelRadius(wavelength(2.44e9), 10), 0.55422, 1e-4);
    // The general form √(λ·d1·d2/(d1 + d2)) with d1 = d2 = d/2 gives the same.
    near(r.fresnelM, Math.sqrt((r.lambdaM * 500 * 500) / 1000), 1e-12);
    // Four times the distance doubles the radius.
    near(run({ dM: 4000 }).fresnelM, 2 * r.fresnelM, 1e-12);
  }],

  ['linkbudget: near field and distances below the reference distance are flagged', () => {
    // 868 MHz: λ = 0.345 m. 0.2 m is inside one wavelength.
    const close = run({ dM: 0.2 });
    eq(close.ok, true);
    eq(close.nearField, true);
    ok(close.warnings.includes('lb_nearField'), close.warnings.join());
    eq(run({ dM: 0.35 }).nearField, false);
    eq(run({ dM: wavelength(868e6) }).nearField, false, 'exactly one wavelength is not flagged');
    // Very close the formula even gives a "gain": the result stays finite and flagged.
    const tiny = run({ dM: 0.001 });
    ok(tiny.plDb < 0 && tiny.nearField && finiteAll(tiny), 'negative path loss in the near field');
    // Log-distance below 1 m.
    const below = run({ dM: 0.5, model: 'logd', n: 3 });
    ok(below.warnings.includes('lb_belowRef'), below.warnings.join());
    ok(!run({ dM: 0.5 }).warnings.includes('lb_belowRef'), 'free space has no reference distance');
    ok(!run({ dM: 1, model: 'logd', n: 3 }).warnings.includes('lb_belowRef'), '1 m is the reference distance');
  }],

  ['linkbudget: invalid input is reported, not calculated', () => {
    eq(err(linkBudget(undefined)), 'lb_positive');
    eq(err(linkBudget({})), 'lb_positive');
    for (const o of [{ fHz: 0 }, { fHz: -1 }, { fHz: NaN }, { dM: 0 }, { dM: -5 }, { dM: Infinity }, { ptxDbm: NaN }, { gtxDbi: NaN }, { grxDbi: Infinity },
      { sDbm: NaN }, { sDbm: undefined }, { mReqDb: NaN }, { ltxDb: NaN }]) {
      eq(err(run(o)), 'lb_positive', JSON.stringify(o));
    }
    for (const o of [{ n: 0 }, { n: -2 }, { n: NaN }, { n: undefined }]) eq(err(run({ model: 'logd', ...o })), 'lb_positive', `logd ${JSON.stringify(o)}`);
    const est = { sensMode: 'est', bHz: 125e3, nfDb: 6, snrDb: 10 };
    for (const o of [{ bHz: 0 }, { bHz: -1 }, { bHz: NaN }, { nfDb: NaN }, { snrDb: NaN }]) eq(err(run({ ...est, ...o })), 'lb_positive', `est ${JSON.stringify(o)}`);
    // Losses, the noise figure and the required margin cannot be negative.
    for (const o of [{ ltxDb: -1 }, { lrxDb: -0.1 }, { lExtraDb: -3 }, { mReqDb: -1 }]) eq(err(run(o)), 'lb_nonneg', JSON.stringify(o));
    eq(err(run({ ...est, nfDb: -1 })), 'lb_nonneg');
    // Negative power, gain, sensitivity and SNR are ordinary values.
    eq(run({ ptxDbm: -20, gtxDbi: -6, grxDbi: -6 }).ok, true);
    eq(run({ ...est, snrDb: -20 }).ok, true);
    // An unknown model or sensitivity mode falls back to the default.
    eq(run({ model: 'x' }).model, 'free');
    eq(run({ sensMode: 'x' }).sensMode, 'direct');
    // Numbers that overflow are an error as well.
    eq(err(run({ ptxDbm: 1e6 })), 'lb_range');
    eq(err(run({ sDbm: -1e6 })), 'lb_range');
  }],

  ['linkbudget: absurd numbers never give NaN or Infinity', () => {
    const odd = [0, -1, 1e-300, 5e-324, 1e-30, 1e30, 1e300, NaN, Infinity, -Infinity, undefined];
    const keys = ['fHz', 'dM', 'ptxDbm', 'gtxDbi', 'ltxDb', 'grxDbi', 'lrxDb', 'n', 'lExtraDb', 'sDbm', 'bHz', 'nfDb', 'snrDb', 'mReqDb'];
    let good = 0;
    for (const model of MODELS) {
      for (const sensMode of SENS_MODES) {
        const start = { ...base, model, sensMode, n: 3, bHz: 125e3, nfDb: 6, snrDb: 10 };
        for (const k of keys) {
          for (const x of odd) {
            const r = linkBudget({ ...start, [k]: x });
            const where = `${model}/${sensMode} ${k} = ${x}`;
            if (r.ok) {
              good++;
              ok(finiteAll(r), `${where}: a number is not finite`);
            } else {
              ok(Array.isArray(r.errors) && r.errors.length > 0 && r.errors.every((e) => typeof e === 'string'), `${where}: no error key`);
            }
          }
        }
      }
    }
    ok(good > 100, `some of the odd values are still valid inputs (${good})`);
  }],

  ['linkbudget page: every model, sensitivity mode and example renders steps whose numbers give the result', () => {
    const ex = Object.fromEntries(fields.find((f) => f.key === 'ex').options.map((o) => [o.value, o.set]));
    const sets = [
      {}, { model: 'logd' }, { sens: 'est' }, { model: 'logd', sens: 'est', snr: -7.5 }, ex.ble, ex.lora, ex.wifi,
      { f: 2.44, f_u: 'GHz', d: 0.05, d_u: 'km' }, { f: 433, d: 250, ptx: 10, gtx: -3, grx: 2.15, ltx: 1.5, lrx: 0.5, lx: 6 },
      { s: -80 }, { s: -70 }, { s: -73.2 }, { ptx: -20, s: -60 }, { mreq: 0 }, { mreq: 46.78 }, { model: 'logd', n: 2.7, d: 35 }, { model: 'logd', n: 1.6, d: 400 },
      { d: 0.2 }, { model: 'logd', d: 0.5 }, { sens: 'est', b: 1, b_u: 'Hz', nf: 0, snr: 0 }, { sens: 'est', b: 20, b_u: 'MHz', nf: 7, snr: 25, d: 20, f: 5800 },
      { ptx: 0, gtx: 0, ltx: 0 }, { f: 5800, d: 12, d_u: 'km', gtx: 23, grx: 23, ptx: 20, s: -85, mreq: 15 },
    ];
    const problems = [];
    let checked = 0;
    inBothLanguages((lang) => {
      for (const set of sets) {
        const where = `${lang} ${JSON.stringify(set)}`;
        const { r, html, steps } = show(set);
        if (!r.ok) { problems.push(`${where}: ${r.errors.join()}`); continue; }
        if (/NaN|undefined|Infinity/.test(html.replace(/<[^>]*>/g, ' '))) problems.push(`${where}: NaN/undefined in the result`);
        if (!html.includes('class="block steps"') || !html.includes('class="refs"')) problems.push(`${where}: no steps or sources`);
        if (/<m(i|n|text)>[^<]*(NaN|undefined|Infinity|—)[^<]*</.test(html)) problems.push(`${where}: a missing value in a step`);
        if (steps.length < 9) problems.push(`${where}: only ${steps.length} steps`);
        for (const s of steps) {
          if (!s.num || !s.res) { problems.push(`${where}: step without numbers (${s.label})`); continue; }
          let calc;
          let shown;
          try { calc = evaluate(s.num); shown = evaluate(s.res); } catch (e) { problems.push(`${where}: ${s.label} cannot be evaluated (${e.message})`); continue; }
          checked++;
          // Tighter than the general check: 0.5 %, and no power of ten apart.
          if (!agrees(calc, shown, 0.005) || (shown !== 0 && Math.abs(calc / shown - 1) > 0.005)) problems.push(`${where}: ${s.label}: ${s.num} → ${calc}, shown ${s.res}`);
        }
      }
    });
    ok(problems.length === 0, `\n${[...new Set(problems)].slice(0, 12).join('\n')}`);
    ok(checked > 400, `expected the steps to be evaluated, got ${checked}`);
  }],

  ['linkbudget page: headline values, verdicts, units and the examples', () => {
    const before = getLang();
    setLang('en');
    try {
      // Defaults are the reference link: margin 46.8 dB, received power −73.2 dBm.
      const d = show({});
      near(d.r.marginDb, 46.782, 1e-4);
      ok(d.html.includes('46.8 <span class="u">dB</span>') && d.html.includes('−73.2 <span class="u">dBm</span>'), 'margin and received power as heroes');
      ok(d.html.includes('class="msg ok"') && !d.html.includes('class="msg error"') && !d.html.includes('class="msg warn"'), 'pass');
      ok(d.html.includes('69.04 km') && d.html.includes('218.3 km') && d.html.includes('9.292 m'), 'ranges and Fresnel radius in the table');
      // Below the required margin: a warning with the range; below the sensitivity: an error.
      const low = show({ s: -80 });
      ok(low.html.includes('class="msg warn"') && low.html.includes('690 m'), 'low margin names the range');
      const fail = show({ s: -70 });
      ok(fail.html.includes('class="msg error"') && fail.html.includes('−3.2 <span class="u">dB</span>'), 'negative margin');
      // Units: 2.44 GHz and 0.01 km are 2440 MHz and 10 m; bandwidth in Hz, kHz and MHz.
      near(show({ f: 2.44, f_u: 'GHz', d: 0.01, d_u: 'km' }).r.fsplDb, 60.196, 1e-4);
      near(show({ sens: 'est', b: 125000, b_u: 'Hz', nf: 6, snr: -7.5 }).r.sDbm, -124.531, 1e-5);
      near(show({ sens: 'est', b: 0.125, b_u: 'MHz', nf: 6, snr: -7.5 }).r.sDbm, -124.531, 1e-5);
      // The fields of the other mode are ignored, even when they are empty.
      eq(show({ n: '', b: '', nf: '', snr: '' }).r.ok, true);
      eq(show({ sens: 'est', s: '' }).r.ok, true);
      // Engine errors reach the page as messages, with the generic drawing.
      const wrong = show({ model: 'logd', n: 0 });
      eq(wrong.r.ok, false);
      ok(wrong.html.includes('class="msg error"') && wrong.svg.includes('<svg'), 'error message and drawing');
      // Near field: flagged in the result.
      ok(show({ d: 0.2 }).html.includes('near field'), 'near-field warning');
      // The examples.
      const ex = Object.fromEntries(fields.find((f) => f.key === 'ex').options.map((o) => [o.value, o.set]));
      near(show(ex.ble).r.marginDb, 24.804, 1e-4); // 0 − 70.196 + 95
      near(show(ex.lora).r.marginDb, 12.282, 1e-4);
      // Wi-Fi: FSPL(20 m) = 60.196 + 6.021 = 66.216 dB; P_rx = 15 + 2 − 66.216 − 10 + 2 = −57.216 dBm; S = −68.990 dBm → 11.774 dB
      near(show(ex.wifi).r.marginDb, 11.774, 1e-4);
      for (const k of ['ble', 'lora', 'wifi']) {
        eq(show(ex[k]).r.verdict, 'pass', k);
        eq(Object.keys(ex[k]).sort().join(), fields.map((f) => f.key).filter((x) => x !== 'ex').sort().join(), `${k} sets every field`);
      }
    } finally {
      setLang(before);
    }
  }],

  ['linkbudget page: the diagram stays clean for every option and for failing or extreme inputs', () => {
    const sets = [
      {}, { model: 'logd' }, { sens: 'est' }, { ex: 'ble' }, { s: -80 }, { s: -70 }, { s: 0 }, { s: 50 }, { s: -73.218 }, { mreq: 0 }, { mreq: 500 },
      { d: 0.001 }, { d: 1e-9 }, { d: 1e9, d_u: 'km' }, { f: 1e-3 }, { f: 1e6, f_u: 'GHz' }, { ptx: -300 }, { ptx: 300 }, { gtx: 80, grx: 80 }, { lx: 400 },
      { ptx: 0, gtx: 0, grx: 0, s: 0, mreq: 0, d: 0.0275, lx: 0 }, { model: 'logd', n: 40 }, { model: 'logd', n: 0.01, d: 5 }, { sens: 'est', b: 1e-6, b_u: 'Hz' },
      { sens: 'est', b: 1e9, b_u: 'MHz', nf: 90, snr: 90 },
      // Invalid input: the drawing falls back to symbols.
      { f: 0 }, { d: -1 }, { model: 'logd', n: 0 }, { ptx: 1e7 }, { sens: 'est', b: 0 }, { ltx: -3 },
    ];
    const problems = [];
    const counts = new Map();
    inBothLanguages((lang) => {
      for (const set of sets) {
        const id = JSON.stringify(set);
        let out;
        try { out = show(set); } catch (e) { problems.push(`${lang} ${id} threw ${e.message}`); continue; }
        if (!out.svg?.includes('<svg')) { problems.push(`${lang} ${id} drew nothing`); continue; }
        for (const p of svgProblems(out.svg)) problems.push(`${lang} ${id}: ${p}`);
        const n = geometryCount(out.svg);
        if (counts.has(id) && counts.get(id) !== n) problems.push(`${id}: geometry differs between TR and EN`);
        counts.set(id, n);
        // The margin is drawn green exactly when the link passes.
        if (out.r.ok && out.svg.includes('class="badt"') === out.r.pass) problems.push(`${lang} ${id}: margin colour does not match the verdict`);
      }
    });
    ok(problems.length === 0, `\n${[...new Set(problems)].slice(0, 12).join('\n')}`);
    // Live values are in the drawing.
    const before = getLang();
    setLang('en');
    try {
      const { svg } = show({});
      for (const s of ['d = 1 km', 'FSPL = 91.2 dB', 'S = −120 dBm', '14 dBm', '16 dBm', '−73.2 dBm', 'M = Prx − S = 46.8 dB']) ok(svg.includes(s), `diagram shows "${s}"`);
    } finally {
      setLang(before);
    }
  }],

  ['linkbudget page: Turkish and English strings match, and every key the page uses exists', () => {
    const tr = Object.keys(page.strings.tr);
    const en = new Set(Object.keys(page.strings.en));
    eq(tr.filter((k) => !en.has(k)).join(), '', 'only in tr');
    eq([...en].filter((k) => !tr.includes(k)).join(), '', 'only in en');
    ok(tr.every((k) => page.strings.tr[k] && page.strings.en[k]), 'no empty string');
    ok(tr.every((k) => /^(lb_|ok_lb_|warn_lb_|err_lb_)/.test(k)), 'all keys carry the lb_ prefix, so no other page is overwritten');
    // Every message key the engine can return has a text.
    for (const k of ['lb_positive', 'lb_nonneg', 'lb_range']) ok(en.has(`err_${k}`), `err_${k}`);
    for (const k of ['lb_nearField', 'lb_belowRef']) ok(en.has(`warn_${k}`), `warn_${k}`);
    // Field keys are unique and short (they become URL parameters); option values are lowercase ASCII.
    eq(new Set(fields.map((f) => f.key)).size, fields.length, 'unique keys');
    ok(fields.every((f) => /^[a-z0-9]{1,6}$/.test(f.key)), 'short keys');
    ok(fields.every((f) => (f.options ?? []).every((o) => /^[a-z0-9]+$/.test(String(o.value)))), 'option values');
    eq(page.id, 'linkbudget');
    // No untranslated key shows up in a rendered result, a warning or the drawing.
    inBothLanguages((lang) => {
      for (const set of [{}, { model: 'logd', d: 0.5 }, { sens: 'est' }, { s: -80 }, { s: -70 }, { d: 0.2 }, { model: 'logd', n: 0 }, { lx: -1 }, { ptx: 1e7 }]) {
        const { html, svg } = show(set);
        ok(!/\b(ok_|warn_|err_)?lb_[A-Za-z0-9]+/.test(`${html} ${svg}`.replace(/data-hl="[^"]*"/g, '')), `${lang} ${JSON.stringify(set)}: an untranslated key is shown`);
      }
    });
  }],
];
