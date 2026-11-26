// Arithmetic check of the calculation steps: for every calculator, mode and
// step, the expression with the reader's numbers (`num`) is evaluated here,
// independently of the engine, and compared with the result shown (`res`).
// A step whose numbers do not give its result means the formula written in
// the page is not the one the engine uses, or a wrong value was put in.
//
// The evaluator understands the notation of ui/math.js: numbers, values with
// units (SI prefixes are applied: 150 mA + 60 µA), + − · × /, fractions,
// roots, powers, parentheses, π, e, ln, log, exp and the hyperbolic functions.
// Empirical formulas take their inputs in fixed units (mil², inches) and give
// the result in another one, so a result that differs from the evaluation by
// a power of ten only is accepted. Steps it cannot evaluate (symbols left in
// the expression, several values in one line) are skipped and counted.

import { ok } from '../assert.js';
import { parse } from '../../src/ui/math.js';
import { stepsTrace, parseNumber } from '../../src/ui/calculator.js';
import { TOOLS } from '../../src/registry.js';
import { registerStrings, setLang, getLang } from '../../src/i18n.js';

class Skip extends Error {}

const PREFIX = { f: 1e-15, p: 1e-12, n: 1e-9, 'µ': 1e-6, 'μ': 1e-6, u: 1e-6, m: 1e-3, c: 1e-2, k: 1e3, M: 1e6, G: 1e9 };
const BASE = new Set(['V', 'A', 'W', 'Ω', 'F', 'H', 'Hz', 's', 'm', 'S', 'J', 'C', 'Wh', 'Ah', 'VA', 'N', 'g', 'rad', 'bit', 'K']);
const SPECIAL = { '%': 0.01, ppm: 1e-6 };

/** Factor of one unit word: kΩ → 1e3, mm² → 1e-6, mil → 1 (not an SI-prefixed unit). */
function unitFactor(word) {
  if (!word) return 1;
  if (word in SPECIAL) return SPECIAL[word];
  const m = word.match(/^(.*?)([²³])?$/);
  const power = m[2] === '²' ? 2 : m[2] === '³' ? 3 : 1;
  const u = m[1];
  if (BASE.has(u)) return 1;
  if (u.length > 1 && u[0] in PREFIX && BASE.has(u.slice(1))) return PREFIX[u[0]] ** power;
  return 1;
}

/** "1.2 kΩ" → 1200, "299.8 mm/ns" → 2.998e8, "10 °C" → 10. */
function quantity(text) {
  const m = String(text).trim().match(/^([+−-]?\d+(?:[.,]\d+)?(?:e[+−-]?\d+)?)\s*(.*)$/i);
  if (!m) throw new Skip(`not a value: ${text}`);
  const n = Number(m[1].replace(',', '.').replace(/−/g, '-'));
  const [top, ...bottom] = m[2].trim().split('/');
  const side = (s) => s.split(/[·\s]+/).filter(Boolean).reduce((a, w) => a * unitFactor(w), 1);
  return n * side(top) / bottom.reduce((a, s) => a * side(s), 1);
}

const FUNCS = {
  ln: Math.log, log: Math.log10, exp: Math.exp, sin: Math.sin, cos: Math.cos, tan: Math.tan, atan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
};
const INVERSE = { cosh: Math.acosh, sinh: Math.asinh, tanh: Math.atanh, tan: Math.atan };

/** Value of a list of sibling nodes (a row): sums of products, with implicit multiplication. */
function evalSeq(nodes) {
  let i = 0;
  const peek = () => nodes[i];
  const isOp = (v) => peek()?.k === 'mo' && peek().v === v;

  // One operand; a function name takes the operand that follows it.
  function operand() {
    const node = nodes[i++];
    if (!node) throw new Skip('unexpected end');
    if (node.k === 'mo' && (node.v === '(' || node.v === '[')) {
      const close = node.v === '(' ? ')' : ']';
      // The closing parenthesis may carry an exponent: ( … )^{2} parses as ")" with a superscript.
      const closes = (n) => (n.k === 'mo' && n.v === close) || (n.k === 'script' && n.base.k === 'mo' && n.base.v === close);
      let depth = 1;
      const start = i;
      for (; i < nodes.length; i++) {
        if (nodes[i].k === 'mo' && nodes[i].v === node.v) depth++;
        else if (closes(nodes[i]) && --depth === 0) break;
      }
      if (depth) throw new Skip('unbalanced parenthesis');
      const inner = evalSeq(nodes.slice(start, i));
      const end = nodes[i++];
      return end.k === 'script' && end.sup ? inner ** evalNode(end.sup) : inner;
    }
    if (node.k === 'mi' && FUNCS[node.v]) return FUNCS[node.v](operand());
    return evalNode(node, () => operand());
  }

  function product() {
    let v = operand();
    for (;;) {
      while (peek()?.k === 'space') i++;
      if (isOp('·') || isOp('×')) { i++; v *= operand(); } else if (isOp('/')) { i++; v /= operand(); } else if (peek() && !(peek().k === 'mo' && [')', ']', '+', '−', '±', '=', ',', '≈', '≤', '≥', '<', '>'].includes(peek().v)) && peek().k !== 'space') {
        v *= operand(); // implicit multiplication: 2π, 4 m, ( … )( … )
      } else break;
    }
    return v;
  }

  while (peek()?.k === 'space') i++;
  let sign = 1;
  if (isOp('−')) { sign = -1; i++; } else if (isOp('+')) i++;
  let total = sign * product();
  for (;;) {
    while (peek()?.k === 'space') i++;
    if (isOp('+')) { i++; total += product(); } else if (isOp('−')) { i++; total -= product(); } else break;
  }
  if (i < nodes.length) throw new Skip(`cannot evaluate past "${nodes[i].v ?? nodes[i].k}"`);
  return total;
}

/** Value of one node; `next` reads the following operand (for functions with scripts: log₁₀ x, cosh⁻¹ x). */
function evalNode(node, next) {
  switch (node.k) {
    case 'mn': return Number(node.v.replace(',', '.'));
    case 'text': return quantity(node.v);
    case 'row': return evalSeq(node.c);
    case 'frac': return evalNode(node.a) / evalNode(node.b);
    case 'sqrt': return Math.sqrt(evalNode(node.c));
    case 'mi':
      if (node.v === 'π') return Math.PI;
      if (node.v === 'e') return Math.E;
      throw new Skip(`symbol ${node.v}`);
    case 'script': {
      const base = node.base;
      if (base.k === 'mi' && FUNCS[base.v] && next) {
        const sup = node.sup ? evalNode(node.sup) : 1;
        if (base.v === 'log' && node.sub) {
          const b = evalNode(node.sub);
          return (Math.log(next()) / Math.log(b)) ** sup;
        }
        if (sup === -1 && INVERSE[base.v]) return INVERSE[base.v](next());
        return FUNCS[base.v](next()) ** sup;
      }
      const b = evalNode(base);
      return node.sup ? b ** evalNode(node.sup) : b;
    }
    default: throw new Skip(`node ${node.k}${node.v ? ` ${node.v}` : ''}`);
  }
}

/** Value of a formula string; with several "=" parts the first one counts. */
export function evaluate(src) {
  const nodes = parse(src);
  const cut = nodes.findIndex((n) => n.k === 'mo' && n.v === '=');
  return evalSeq(cut < 0 ? nodes : nodes.slice(0, cut));
}

/** True when a and b agree within `tol`, or differ by a power of ten only (unit of an empirical formula). */
export function agrees(calc, shown, tol = 0.02) {
  if (!Number.isFinite(calc) || !Number.isFinite(shown)) return false;
  if (shown === 0 || calc === 0) return Math.abs(calc - shown) < 1e-9;
  if (Math.sign(calc) !== Math.sign(shown)) return false;
  const ratio = Math.abs(calc / shown);
  const mantissa = ratio / 10 ** Math.round(Math.log10(ratio));
  return Math.abs(mantissa - 1) <= tol;
}

// ---- All calculators, all modes ----
const pages = [];
for (const tool of TOOLS) {
  try {
    const page = (await tool.load()).default;
    if (page.strings) registerStrings(page.strings);
    pages.push(page);
  } catch { /* reported by "every module loads" */ }
}
const fieldsOf = (page) => page.sections.flatMap((s) => s.fields);

function variants(page) {
  const raw0 = {};
  const units0 = {};
  for (const f of fieldsOf(page)) {
    raw0[f.key] = f.default === undefined || f.default === null ? '' : String(f.default);
    if (f.type === 'number') units0[f.key] = f.unit ?? f.units?.[0];
  }
  const list = [{ raw: raw0, units: units0, label: 'defaults' }];
  for (const f of fieldsOf(page)) {
    for (const o of f.options ?? []) {
      if (String(o.value) === raw0[f.key]) continue;
      const raw = { ...raw0, [f.key]: String(o.value) };
      const units = { ...units0 };
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

export const cases = [
  ['arithmetic: the evaluator reads values, units and the formula notation', () => {
    const near = (a, b, label) => ok(Math.abs(a - b) <= Math.abs(b) * 1e-9, `${label}: ${a} vs ${b}`);
    near(quantity('1.2 kΩ'), 1200, 'kΩ');
    near(quantity('60 µA'), 6e-5, 'µA');
    near(quantity('0.02553 mm²'), 0.02553e-6, 'mm²');
    near(quantity('299.8 mm/ns'), 2.998e8, 'mm/ns');
    near(quantity('38.22 mil'), 38.22, 'mil is not milli-something');
    near(quantity('10 min'), 10, 'min is not milli-something');
    near(quantity('25 °C'), 25, '°C');
    near(quantity('69.7 %'), 0.697, 'percent');
    near(quantity('−3 dB'), -3, 'minus sign');
    near(evaluate('\\frac{\\text{12 V}}{\\text{1.2 kΩ}}'), 0.01, 'fraction');
    near(evaluate('\\text{120 mA} + \\text{50 µA}'), 0.12005, 'prefixes in a sum');
    near(evaluate('\\frac{1}{2π \\sqrt{\\text{10 µH} \\cdot \\text{100 nF}}}'), 159154.94309189535, 'resonance');
    near(evaluate('0.048 \\cdot {(\\text{10 °C})}^{0.44} \\cdot {(\\text{27.13 mil²})}^{0.725}'), 0.048 * 10 ** 0.44 * 27.13 ** 0.725, 'powers');
    near(evaluate('5.08 \\cdot \\text{0.063 in} \\cdot (\\ln\\frac{4 \\cdot \\text{0.063 in}}{\\text{0.012 in}} + 1)'), 5.08 * 0.063 * (Math.log(21) + 1), 'function of a fraction');
    near(evaluate('\\log_{10}(1 + \\frac{1058}{259})'), Math.log10(1 + 1058 / 259), 'log with a base');
    near(evaluate('\\cosh^{−1}\\frac{3}{2}'), Math.acosh(1.5), 'inverse hyperbolic');
    near(evaluate('2 \\cdot \\text{50 Ω} \\cdot (1 − 0.48 \\cdot e^{−0.96 \\cdot \\frac{2}{1}})'), 100 * (1 - 0.48 * Math.exp(-1.92)), 'exponential');
    near(evaluate('\\text{38.22 mil} = \\text{0.971 mm}'), 38.22, 'first of two results');
    ok(agrees(1.3, 1.3e-9), 'a power of ten apart is the unit of an empirical formula');
    ok(agrees(101, 100) && !agrees(105, 100) && !agrees(-100, 100) && !agrees(2, 1), 'tolerance');
    let skipped = false;
    try { evaluate('V_{in} \\cdot 2'); } catch (e) { skipped = e instanceof Skip; }
    ok(skipped, 'symbols are skipped, not guessed');
  }],

  ['arithmetic: in every step the numbers give the result shown', () => {
    const before = getLang();
    const wrong = [];
    let checked = 0;
    let skippedSteps = 0;
    setLang('en');
    try {
      for (const page of pages) {
        if (page.mount || !page.render) continue;
        for (const { raw, units, label } of variants(page)) {
          const v = {};
          for (const f of fieldsOf(page)) v[f.key] = f.type === 'number' ? parseNumber(raw[f.key], f.si) : raw[f.key];
          const seen = [];
          stepsTrace.record = (items) => seen.push(...items);
          try { page.render(page.compute(v, units), v, units); } catch { /* reported by the steps test */ } finally { stepsTrace.record = null; }
          for (const s of seen) {
            if (!s.num || !s.res) continue;
            let calc;
            let shown;
            try {
              calc = evaluate(s.num);
              shown = evaluate(s.res);
            } catch (e) {
              if (e instanceof Skip) { skippedSteps++; continue; }
              throw e;
            }
            checked++;
            if (!agrees(calc, shown)) wrong.push(`${page.id} [${label}]: ${s.num}  →  ${calc.toPrecision(5)}, shown ${s.res}`);
          }
        }
      }
    } finally {
      setLang(before);
    }
    ok(wrong.length === 0, `\nThe numbers in these steps do not reproduce the result shown (formula or values differ from the engine;\nif the step is right, the checker may not understand its units):\n${[...new Set(wrong)].slice(0, 25).join('\n')}`);
    ok(checked >= 60, `expected at least 60 evaluated steps, got ${checked} (${skippedSteps} skipped)`);
  }],
];
