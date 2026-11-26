// Prints the calculation steps of a calculator as plain text, for checking
// the arithmetic by hand while writing or reviewing a page.
//
//   node tools/dump-steps.mjs <page-id> [key=value …] [--lang=tr|en] [--all]
//
//   node tools/dump-steps.mjs divider                 defaults
//   node tools/dump-steps.mjs trace std=ipc2221 mode=current
//   node tools/dump-steps.mjs rc --all                defaults and every option of every choice field
//
// key=value sets a field (numbers as typed in the form: 4k7, 100n …);
// key_u=unit sets its unit. Run from the repository root.

import { pathToFileURL } from 'node:url';

const root = pathToFileURL(`${process.cwd()}/`).href;
const args = process.argv.slice(2);
const id = args.find((a) => !a.includes('=') && !a.startsWith('--'));
if (!id) {
  console.error('usage: node tools/dump-steps.mjs <page-id> [key=value …] [--lang=tr|en] [--all]');
  process.exit(1);
}
const lang = args.find((a) => a.startsWith('--lang='))?.slice(7) ?? 'en';
const all = args.includes('--all');
const over = Object.fromEntries(args.filter((a) => a.includes('=') && !a.startsWith('--')).map((a) => [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)]));

const { parseNumber } = await import(`${root}src/ui/calculator.js`);
const { registerStrings, setLang } = await import(`${root}src/i18n.js`);
const page = (await import(`${root}src/pages/${id}.js`)).default;
registerStrings(page.strings);
setLang(lang);

const fields = page.sections.flatMap((s) => s.fields);
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

function run(set, label) {
  const v = {};
  const u = {};
  for (const f of fields) {
    const val = set[f.key] ?? f.default;
    const raw = val === undefined || val === null ? '' : String(val);
    v[f.key] = f.type === 'number' ? parseNumber(raw, f.si) : raw;
    if (f.type === 'number') u[f.key] = set[`${f.key}_u`] ?? f.unit ?? f.units?.[0];
  }
  let html;
  try {
    html = page.render(page.compute(v, u), v, u);
  } catch (e) {
    console.log(`\n## ${id} ${label}\n   THROWS ${e.message}`);
    return;
  }
  const heroes = [...html.matchAll(/hero-label">([^<]*)<[\s\S]*?hero-value">([\s\S]*?)<\/div>/g)].map((m) => `${m[1]}: ${text(m[2])}`);
  const steps = [...html.matchAll(/data-plain="([^"]*)"/g)].map((m) => text(m[1]));
  console.log(`\n## ${id} ${label}`);
  console.log(`   RESULT  ${heroes.join(' | ') || '(no headline values)'}`);
  if (!steps.length) console.log('   (no calculation steps)');
  for (const s of steps) console.log(`   ${s}`);
}

run(over, JSON.stringify(over));
if (all) {
  for (const f of fields) {
    for (const o of f.options ?? []) {
      if (String(o.value) === String(over[f.key] ?? f.default)) continue;
      run({ ...over, [f.key]: String(o.value), ...(o.set ?? {}) }, `${f.key}=${o.value}`);
    }
  }
}
