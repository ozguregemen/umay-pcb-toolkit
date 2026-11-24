import { calculateVia } from '../engine/via.js';
import { toMm, currentToA, riseToC, tempToC } from '../engine/units.js';
import { hero, rows, block, formulaBlock, messages, invalid } from '../ui/calculator.js';
import { fmt, fixed, si } from '../ui/format.js';

export const viaPage = {
  id: 'via',
  title: 'viaTitle',
  subtitle: 'viaSubtitle',
  sections: [
    {
      title: 'sectionInputs',
      fields: [
        { key: 'd', type: 'number', label: 'drillDiameter', default: 0.3, units: ['mm', 'mil'] },
        { key: 'L', type: 'number', label: 'viaLength', default: 1.6, units: ['mm', 'mil'] },
        { key: 'p', type: 'number', label: 'platingThickness', default: 25, units: ['um', 'mil'] },
        { key: 'I', type: 'number', label: 'viaCurrent', default: 1, units: ['A', 'mA'] },
      ],
    },
    {
      title: 'sectionDc',
      fields: [
        { key: 'T', type: 'number', label: 'viaTemp', default: 20, units: ['C', 'F', 'K'], hint: 'viaTempHint' },
        { key: 'dT', type: 'number', label: 'viaRise', default: 10, units: ['C', 'K', 'F'], hint: 'viaRiseHint' },
      ],
    },
  ],

  compute(v, u) {
    const mm = (k) => (Number.isFinite(v[k]) ? toMm(v[k], u[k]) : NaN);
    return calculateVia({
      drillMm: mm('d'),
      lengthMm: mm('L'),
      platingUm: Number.isFinite(v.p) ? toMm(v.p, u.p) * 1000 : NaN,
      currentA: Number.isFinite(v.I) ? currentToA(v.I, u.I) : 0,
      tempC: Number.isFinite(v.T) ? tempToC(v.T, u.T) : 20,
      deltaTC: Number.isFinite(v.dT) ? riseToC(v.dT, u.dT) : 10,
    });
  },

  render(r) {
    if (!r.ok) return invalid(r.errors);
    const main = hero('viaCapacity', `${fmt(r.capacityA, 3)} <span class="u">A</span>`, `ΔT = ${fmt(r.deltaTC)} °C`);
    const details = rows([
      ['resistance', si(r.resistanceOhm, 'Ω')],
      ['voltageDrop', si(r.voltageDropV, 'V')],
      ['powerLoss', si(r.powerLossW, 'W')],
      ['aspectRatio', `${fixed(r.aspectRatio, 1)} : 1`],
      ['barrelArea', `${fmt(r.areaMm2, 3)} mm² · ${fmt(r.areaMil2)} mil²`],
      ['thermalResistance', `${fmt(r.thermalResistanceKW, 3)} °C/W`],
    ]);
    return main + messages('warn', r.warnings) + block('results', details)
      + formulaBlock([
        'A      = π · (r_out² − r_in²),  r_in = d/2,  r_out = r_in + t',
        'R      = ρ(T) · L / A',
        'V_drop = I · R,   P = I² · R',
        'R_th   = L / (k_Cu · A)',
        'I_max  = 0.048 · ΔT^0.44 · A_mil²^0.725',
      ], 'formulaVia');
  },
};
