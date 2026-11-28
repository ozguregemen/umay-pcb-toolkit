// Formula notation (ui/math.js) and the calculation-steps block.

import { ok, eq } from '../assert.js';
import { tex, texPlain, tx } from '../../src/ui/math.js';
import { steps, parseNumber } from '../../src/ui/calculator.js';
import { TOOLS } from '../../src/registry.js';
import { registerStrings, setLang, getLang } from '../../src/i18n.js';

const inner = (s) => tex(s).replace(/^<math>|<\/math>$/g, '');

// Pages are loaded once for the "every calculator" case below.
const pages = [];
for (const tool of TOOLS) {
  try {
    const page = (await tool.load()).default;
    if (page.strings) registerStrings(page.strings);
    pages.push(page);
  } catch { /* reported by "every module loads" */ }
}

const fieldsOf = (page) => page.sections.flatMap((s) => s.fields);

/** Default inputs, plus one variant per option of every choice/select (with its `set` values). */
/** Matches anything that looks like one of the page's own string keys (tn_…, warn_tn_…). */
const keyPatterns = new Map();
function rawKeyPattern(page) {
  if (!keyPatterns.has(page.id)) {
    const prefixes = new Set();
    for (const key of Object.keys(page.strings?.en ?? {})) {
      const m = /^(?:ok_|warn_|err_)?([a-z0-9]{2,})_/.exec(key);
      if (m) prefixes.add(m[1]);
    }
    keyPatterns.set(page.id, prefixes.size
      ? new RegExp(`(?<![A-Za-z0-9_])(?:ok_|warn_|err_)?(?:${[...prefixes].join('|')})_[A-Za-z0-9]+(?![A-Za-z0-9_])`, 'g')
      : /(?!)/g);
  }
  return keyPatterns.get(page.id);
}

function variants(page) {
  const raw0 = {};
  const units0 = {};
  for (const f of fieldsOf(page)) {
    raw0[f.key] = f.default === undefined || f.default === null ? '' : String(f.default);
    if (f.type === 'number') units0[f.key] = f.unit ?? f.units?.[0];
  }
  const list = [{ raw: raw0, units: units0 }];
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
  ['math: fractions, roots, sub- and superscripts become MathML', () => {
    eq(inner('\\frac{a}{b}'), '<mfrac><mrow><mi>a</mi></mrow><mrow><mi>b</mi></mrow></mfrac>', 'fraction');
    eq(inner('\\sqrt{x + 1}'), '<msqrt><mrow><mi>x</mi><mo>+</mo><mn>1</mn></mrow></msqrt>', 'root');
    eq(inner('x^2'), '<msup><mrow><mi>x</mi></mrow><mrow><mn>2</mn></mrow></msup>', 'power without braces');
    eq(inner('R_{th}'), '<msub><mrow><mi>R</mi></mrow><mrow><mi>th</mi></mrow></msub>', 'subscript');
    eq(inner('x_i^2'), '<msubsup><mrow><mi>x</mi></mrow><mrow><mi>i</mi></mrow><mrow><mn>2</mn></mrow></msubsup>', 'both');
    eq(inner('a \\cdot b - 3,5'), '<mi>a</mi><mo>·</mo><mi>b</mi><mo>−</mo><mn>3,5</mn>', 'operators, minus sign, decimal comma');
    eq(inner('ΔT'), '<mi mathvariant="normal">Δ</mi><mi>T</mi>', 'Δ is its own upright symbol');
    eq(inner('\\ln(x)'), '<mi>ln</mi><mo>(</mo><mi>x</mi><mo>)</mo>', 'function name');
    eq(inner(tx('3,3 V')), '<mtext>3,3 V</mtext>', 'value with unit');
    eq(inner('\\text{<b>}'), '<mtext>&lt;b&gt;</mtext>', 'text is escaped');
    eq(tx('a}b\\c{'), '\\text{abc}', 'tx removes braces and backslashes');
  }],

  ['math: broken input never throws or hangs', () => {
    for (const s of ['', '}', '{', '\\frac', '\\frac{a}', '^', '_', 'a^', '\\text{abc', '\\', '{{{', 'x_{', '\\sqrt', '}}a{{']) {
      const out = tex(s);
      ok(out.startsWith('<math>') && out.endsWith('</math>'), `tex(${JSON.stringify(s)})`);
      ok(typeof texPlain(s) === 'string', `texPlain(${JSON.stringify(s)})`);
    }
    eq(tex(undefined), '<math></math>', 'undefined');
  }],

  ['math: plain-text form for copied summaries', () => {
    eq(texPlain('V_{out} = V_{in} \\cdot \\frac{R_2}{R_1 + R_2}'), 'V_out = V_in · R_2/(R_1 + R_2)', 'divider');
    eq(texPlain('\\frac{1}{2 π \\sqrt{L C}}'), '1/(2π√(LC))', 'resonance');
    eq(texPlain(`${tx('3,3 V')} \\cdot \\frac{${tx('10 kΩ')}}{${tx('20 kΩ')}}`), '3,3 V · 10 kΩ/20 kΩ', 'numbers');
    eq(texPlain('I^{2} \\cdot R'), 'I^2 · R', 'power');
    eq(texPlain('k \\cdot ΔT^{0.44} \\cdot A^{0.725}'), 'k · ΔT^0.44 · A^0.725', 'IPC-2221');
  }],

  ['steps: block carries labels, the three parts, sources and a plain-text copy', () => {
    registerStrings({ tr: { t_lab: 'Çıkış', t_note: 'Not' }, en: { t_lab: 'Output', t_note: 'Note' } });
    const html = steps([
      { label: 't_lab', sym: 'V = I \\cdot R', num: `${tx('2 A')} \\cdot ${tx('5 Ω')}`, res: tx('10 V') },
      false,
      { labelRaw: 'A <b>', sym: 'P = V \\cdot I' },
    ], { note: 't_note', refs: ['Source <1>'], where: [['I', 't_lab', 'cur']] });
    ok(html.includes('class="block steps"'), 'block');
    eq(html.match(/<li /g).length, 2, 'falsy steps are skipped');
    ok(html.includes('<span class="step-res"><math><mo>=</mo><mtext>10 V</mtext></math></span>'), 'result part');
    ok(/data-plain="(Çıkış|Output): V = I · R = 2 A · 5 Ω = 10 V"/.test(html), 'plain text of step 1');
    ok(html.includes('A &lt;b&gt;') && !html.includes('A <b>'), 'raw label is escaped');
    ok(html.includes('class="refs"') && html.includes('Source &lt;1&gt;'), 'sources');
    ok(html.includes('data-hl="cur"'), 'symbol list links to the input');
  }],

  ['steps: calculators that show steps render complete formulas in both languages', () => {
    const before = getLang();
    const problems = [];
    let withSteps = 0;
    try {
      for (const page of pages) {
        if (page.mount || !page.render) continue;
        let any = false;
        // Defaults, then every option of every choice/select field (with the values it sets).
        for (const { raw, units, label = 'defaults' } of variants(page)) {
          const v = {};
          for (const f of fieldsOf(page)) v[f.key] = f.type === 'number' ? parseNumber(raw[f.key], f.si) : raw[f.key];
          for (const lang of ['tr', 'en']) {
            setLang(lang);
            const where = `${page.id} [${label}] (${lang})`;
            let html;
            try { html = page.render(page.compute(v, units), v, units); } catch (e) { problems.push(`${where}: ${e.message}`); continue; }
            // A key without a string is shown as it is: it must not appear in the visible text.
            const rawKeys = html.replace(/<[^>]*>/g, ' ').match(rawKeyPattern(page));
            if (rawKeys) problems.push(`${where}: untranslated key ${[...new Set(rawKeys)].slice(0, 3).join(', ')}`);
            if (!html.includes('class="block steps"')) continue;
            any = true;
            const block = html.split('class="block steps"')[1].split('</details>')[0];
            if ((block.match(/<math>/g) ?? []).length !== (block.match(/<\/math>/g) ?? []).length) problems.push(`${where}: unbalanced <math>`);
            if (/<m(i|n|text)>[^<]*(NaN|undefined|Infinity|—)[^<]*</.test(block)) problems.push(`${where}: NaN, undefined or a missing value in a step`);
            if (/<mi>(frac|sqrt|text|cdot|times)<\/mi>/.test(block)) problems.push(`${where}: unparsed command`);
            if (!block.includes('class="refs"')) problems.push(`${where}: steps without sources`);
            if (!block.includes('<li ')) problems.push(`${where}: empty steps block`);
          }
        }
        if (any) withSteps++;
      }
    } finally {
      setLang(before);
    }
    ok(problems.length === 0, `\n${problems.slice(0, 20).join('\n')}`);
    ok(withSteps >= 10, `expected at least 10 calculators with steps, found ${withSteps}`);
  }],
];
