// Formulas as real mathematics without a library: a small TeX-like notation
// is turned into MathML, which every current browser draws natively.
//
//   \frac{a}{b}   \sqrt{a}   x^{2}   R_{th}   x_{i}^{2}   {group}
//   \cdot \times \approx \le \ge \pm \to \parallel \neq \ll \gg \propto
//   \ln \log \exp \min \max \sin \cos \tan \atan      (upright function names)
//   \text{3,3 V}  upright text (numbers with units)    \,  \quad  spaces
//   Letters (also Greek, typed directly) are identifiers, digits are numbers,
//   = + − · / ( ) and similar characters are operators.
//
// tex()      → MathML string        texPlain() → one-line text (for copying)
// No DOM access: both run in Node for the tests.

import { esc } from './format.js';

const SYMBOLS = {
  cdot: '·', times: '×', approx: '≈', le: '≤', ge: '≥', pm: '±', to: '→', parallel: '∥',
  neq: '≠', ll: '≪', gg: '≫', propto: '∝', infty: '∞',
};
const FUNCTIONS = new Set(['ln', 'log', 'exp', 'min', 'max', 'sin', 'cos', 'tan', 'atan', 'sinh', 'cosh', 'tanh']);
const OPERATORS = '=+−-·×/()[]<>≤≥≈±∥→,;:|!≠≪≫∝';

/** Wrap display text (a formatted number with its unit) for use inside a formula. */
export const tx = (s) => `\\text{${String(s).replace(/[{}\\]/g, '')}}`;

/** TeX-like source → syntax tree (list of nodes); used by tex(), texPlain() and the tests. */
export function parse(src) {
  const s = String(src ?? '');
  const n = s.length;
  let i = 0;

  const skip = () => { while (i < n && /\s/.test(s[i])) i++; };

  function group() {
    i++; // {
    const items = row();
    if (s[i] === '}') i++;
    return { k: 'row', c: items };
  }

  function arg() {
    skip();
    if (i >= n) return { k: 'row', c: [] };
    return s[i] === '{' ? group() : atom();
  }

  function atom() {
    const c = s[i];
    if (c === '{') return group();
    if (c === '\\') {
      const m = /^\\([a-zA-Z]+|.)/.exec(s.slice(i));
      const name = m ? m[1] : '';
      i += m ? m[0].length : 1;
      if (name === 'frac') { const a = arg(); const b = arg(); return { k: 'frac', a, b }; }
      if (name === 'sqrt') return { k: 'sqrt', c: arg() };
      if (name === 'text') {
        skip();
        if (s[i] !== '{') return { k: 'text', v: '' };
        const end = s.indexOf('}', i);
        const v = s.slice(i + 1, end < 0 ? n : end);
        i = end < 0 ? n : end + 1;
        return { k: 'text', v };
      }
      if (name === ',') return { k: 'space', w: 0.25 };
      if (name === 'quad') return { k: 'space', w: 1 };
      if (SYMBOLS[name]) return { k: 'mo', v: SYMBOLS[name] };
      if (FUNCTIONS.has(name)) return { k: 'mi', v: name };
      return { k: 'mi', v: name };
    }
    const num = /^\d+(?:[.,]\d+)?/.exec(s.slice(i));
    if (num) { i += num[0].length; return { k: 'mn', v: num[0] }; }
    if (c === 'Δ') { i++; return { k: 'mi', v: c, up: true }; }
    const id = /^[\p{L}]+/u.exec(s.slice(i));
    if (id) {
      // Δ starts a new identifier even inside a run of letters (R·ΔT).
      const v = id[0].includes('Δ') ? id[0].slice(0, id[0].indexOf('Δ')) : id[0];
      i += v.length;
      return { k: 'mi', v };
    }
    i++;
    if (OPERATORS.includes(c)) return { k: 'mo', v: c === '-' ? '−' : c };
    return { k: 'mi', v: c };
  }

  function row() {
    const out = [];
    while (i < n && s[i] !== '}') {
      if (/\s/.test(s[i])) { i++; continue; }
      if (s[i] === '^' || s[i] === '_') {
        const slot = s[i] === '^' ? 'sup' : 'sub';
        i++;
        const a = arg();
        const base = out.pop() ?? { k: 'row', c: [] };
        if (base.k === 'script' && !base[slot]) { base[slot] = a; out.push(base); } else out.push({ k: 'script', base, [slot]: a });
        continue;
      }
      out.push(atom());
    }
    return out;
  }

  const top = [];
  while (i < n) {
    top.push(...row());
    if (s[i] === '}') i++; // stray closing brace
  }
  return top;
}

const inRow = (node) => (node.k === 'row' ? ml(node) : `<mrow>${ml(node)}</mrow>`);

function ml(node) {
  switch (node.k) {
    case 'mn': return `<mn>${esc(node.v)}</mn>`;
    case 'mi': return `<mi${node.up ? ' mathvariant="normal"' : ''}>${esc(node.v)}</mi>`;
    case 'mo': return `<mo>${esc(node.v)}</mo>`;
    case 'text': return `<mtext>${esc(node.v)}</mtext>`;
    case 'space': return `<mspace width="${node.w}em"/>`;
    case 'row': return `<mrow>${node.c.map(ml).join('')}</mrow>`;
    case 'frac': return `<mfrac>${inRow(node.a)}${inRow(node.b)}</mfrac>`;
    case 'sqrt': return `<msqrt>${inRow(node.c)}</msqrt>`;
    case 'script':
      if (node.sub && node.sup) return `<msubsup>${inRow(node.base)}${inRow(node.sub)}${inRow(node.sup)}</msubsup>`;
      return node.sub ? `<msub>${inRow(node.base)}${inRow(node.sub)}</msub>` : `<msup>${inRow(node.base)}${inRow(node.sup)}</msup>`;
    default: return '';
  }
}

/** TeX-like source → MathML markup. */
export function tex(src) {
  return `<math>${parse(src).map(ml).join('')}</math>`;
}

const SPACED = new Set(['=', '+', '−', '·', '×', '≈', '≤', '≥', '±', '∥', '→', '<', '>', '≠', '≪', '≫', '∝']);
const single = (node) => ['mn', 'mi', 'text'].includes(node.k) || (node.k === 'row' && node.c.length === 1 && single(node.c[0]));
const oneScript = (node) => node.k === 'script' || (node.k === 'row' && node.c.length === 1 && oneScript(node.c[0]));

// A sign at the start of a group or after another operator is unary: no spaces around it.
const SIGNS = new Set(['−', '+', '±']);
function plSeq(nodes) {
  return nodes.map((node, i) => {
    const prev = nodes[i - 1];
    // ln, exp …: set off from what precedes, and keep a fraction argument together.
    if (node.k === 'mi' && FUNCTIONS.has(node.v)) return (prev && prev.k !== 'mo' ? ' ' : '') + node.v;
    if (node.k === 'frac' && prev?.k === 'mi' && FUNCTIONS.has(prev.v)) return `(${pl(node)})`;
    if (node.k !== 'mo' || !SIGNS.has(node.v)) return pl(node);
    return !prev || (prev.k === 'mo' && prev.v !== ')' && prev.v !== ']') ? node.v : ` ${node.v} `;
  }).join('');
}

function pl(node) {
  switch (node.k) {
    case 'mn': case 'mi': case 'text': return node.v;
    case 'mo': return SPACED.has(node.v) ? ` ${node.v} ` : node.v === ',' ? ', ' : node.v;
    case 'space': return ' ';
    case 'row': return plSeq(node.c);
    case 'frac': {
      const wrap = (x) => (single(x) || oneScript(x) ? pl(x) : `(${pl(x)})`);
      return `${wrap(node.a)}/${wrap(node.b)}`;
    }
    case 'sqrt': return `√(${pl(node.c)})`;
    case 'script': {
      const part = (mark, x) => (x ? mark + (single(x) ? pl(x) : `(${pl(x)})`) : '');
      return pl(node.base) + part('_', node.sub) + part('^', node.sup);
    }
    default: return '';
  }
}

/** TeX-like source → readable one-line text: V_out = V_in · R_2/(R_1 + R_2). */
export function texPlain(src) {
  return plSeq(parse(src)).replace(/\s+/g, ' ').trim();
}
