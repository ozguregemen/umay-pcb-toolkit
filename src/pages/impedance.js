import { calculateImpedance } from '../engine/impedance.js';
import { toMm, thicknessToMil, MM_PER_MIL } from '../engine/units.js';
import { hero, rows, block, formulaBlock, messages, invalid } from '../ui/calculator.js';
import { fmt, fixed } from '../ui/format.js';

const isDiff = (v) => v.st === 'diffMicrostrip' || v.st === 'diffStripline';
const isStrip = (v) => v.st === 'stripline' || v.st === 'diffStripline';

const FORMULAS = {
  microstrip: ['Z0 = 87 / √(εr + 1.41) · ln( 5.98·h / (0.8·w + t) )'],
  stripline: ['Z0 = 60 / √εr · ln( 4·b / (0.67·π·(0.8·w + t)) )'],
  diffMicrostrip: [
    'Z0    = 87 / √(εr + 1.41) · ln( 5.98·h / (0.8·w + t) )',
    'Zdiff = 2·Z0 · (1 − 0.48·e^(−0.96·s/h))',
  ],
  diffStripline: [
    'Z0    = 60 / √εr · ln( 4·b / (0.67·π·(0.8·w + t)) )',
    'Zdiff = 2·Z0 · (1 − 0.347·e^(−2.9·s/b))',
  ],
};

/** Cross-section sketch (not to scale). */
function diagram(st) {
  const diff = st.startsWith('diff');
  const strip = st.toLowerCase().includes('stripline');
  const traces = diff
    ? `<rect class="cu" x="95" y="${strip ? 52 : 34}" width="60" height="8"/><rect class="cu" x="185" y="${strip ? 52 : 34}" width="60" height="8"/>
       <path class="dim" d="M155 ${strip ? 46 : 28}h30"/><text x="170" y="${strip ? 42 : 24}">s</text>`
    : `<rect class="cu" x="140" y="${strip ? 52 : 34}" width="60" height="8"/>`;
  const wx = diff ? 95 : 140;
  const ty = strip ? 52 : 34;
  return `
  <svg class="diagram" viewBox="0 0 340 120" role="img" aria-label="${st}">
    <rect class="diel" x="20" y="${strip ? 22 : 42}" width="300" height="${strip ? 68 : 48}"/>
    ${strip ? '<rect class="cu" x="20" y="16" width="300" height="6"/>' : ''}
    <rect class="cu" x="20" y="90" width="300" height="6"/>
    ${traces}
    <path class="dim" d="M${wx} ${ty - 6}h60"/><text x="${wx + 30}" y="${ty - 10}">w</text>
    <path class="dim" d="M${wx - 6} ${ty}v8"/><text x="${wx - 14}" y="${ty + 8}">t</text>
    <path class="dim" d="M40 ${strip ? 22 : 42}V90"/><text x="50" y="${strip ? 60 : 70}">${strip ? 'b' : 'h'}</text>
    <text class="er" x="300" y="${strip ? 84 : 84}" text-anchor="end">εr</text>
  </svg>`;
}

export const impedancePage = {
  id: 'impedance',
  title: 'impedanceTitle',
  subtitle: 'impedanceSubtitle',
  sections: [
    {
      title: 'sectionSetup',
      fields: [
        { key: 'st', type: 'choice', label: 'structure', default: 'microstrip',
          options: ['microstrip', 'stripline', 'diffMicrostrip', 'diffStripline'].map((k) => ({ value: k, label: `structure_${k}` })) },
      ],
    },
    {
      title: 'sectionInputs',
      fields: [
        { key: 'w', type: 'number', label: 'traceWidth', default: 0.3, units: ['mm', 'mil', 'um'] },
        { key: 't', type: 'number', label: 'traceThickness', default: 35, units: ['um', 'oz', 'mm', 'mil'] },
        { key: 'h', type: 'number', label: (v) => (isStrip(v) ? 'planeSeparation' : 'dielectricHeight'),
          default: 0.18, units: ['mm', 'mil', 'um'] },
        { key: 's', type: 'number', label: 'pairSpacing', default: 0.2, units: ['mm', 'mil', 'um'], show: isDiff },
        { key: 'er', type: 'number', label: 'dielectricConstant', default: 4.6, hint: 'erHint' },
      ],
    },
  ],

  compute(v, u) {
    const mm = (key) => (Number.isFinite(v[key]) ? toMm(v[key], u[key]) : NaN);
    const tMm = Number.isFinite(v.t) ? thicknessToMil(v.t, u.t) * MM_PER_MIL : NaN;
    return calculateImpedance({
      structure: v.st, w: mm('w'), t: tMm, h: mm('h'), s: mm('s'), er: v.er,
    });
  },

  render(r, v) {
    const pic = `<div class="diagram-wrap">${diagram(v.st)}</div>`;
    if (!r.ok) return pic + invalid(r.errors);
    const diff = r.zdiff !== null;
    const main = diff
      ? hero('zdiff', `${fixed(r.zdiff, 1)} <span class="u">Ω</span>`, `Z₀ = ${fixed(r.z0, 1)} Ω`)
      : hero('z0', `${fixed(r.z0, 1)} <span class="u">Ω</span>`);
    const details = rows([
      diff && ['z0', `${fixed(r.z0, 2)} Ω`],
      ['erEff', fmt(r.erEff, 3)],
      ['delay', `${fmt(r.delayPsPerMm, 3)} ps/mm · ${fmt(r.delayPsPerIn, 4)} ps/in`],
    ]);
    return pic + main + messages('warn', r.warnings) + block('results', details)
      + formulaBlock(FORMULAS[r.structure], 'formulaImpedance');
  },
};
