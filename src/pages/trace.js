import { calculateTraceWidth } from '../engine/trace-width.js';
import { thicknessToMil, currentToA, riseToC, tempToC, toMm } from '../engine/units.js';
import { hero, rows, block, formulaBlock, messages, invalid } from '../ui/calculator.js';
import { fmt, fixed, si, esc } from '../ui/format.js';
import { t } from '../i18n.js';

const is2152 = (v) => v.std === 'ipc2152';

export const tracePage = {
  id: 'trace',
  title: 'traceTitle',
  subtitle: 'traceSubtitle',
  sections: [
    {
      title: 'sectionSetup',
      fields: [
        { key: 'std', type: 'choice', label: 'standard', default: 'ipc2152',
          options: [{ value: 'ipc2221', label: 'IPC-2221', raw: true }, { value: 'ipc2152', label: 'IPC-2152', raw: true }] },
        { key: 'cls', type: 'choice', label: 'pcbClass', default: '2',
          options: [1, 2, 3].map((n) => ({ value: String(n), label: String(n), raw: true })) },
        { key: 'layer', type: 'choice', label: 'layer', default: 'ext',
          options: [{ value: 'ext', label: 'external' }, { value: 'int', label: 'internal' }] },
      ],
    },
    {
      title: 'sectionInputs',
      fields: [
        { key: 'I', type: 'number', label: 'current', default: 1, units: ['A', 'mA'] },
        { key: 'dT', type: 'number', label: 'tempRise', default: 10, units: ['C', 'K', 'F'] },
        { key: 't', type: 'number', label: 'copperThickness', default: 1, units: ['oz', 'um', 'mil', 'mm'] },
      ],
    },
    {
      title: 'sectionEnv',
      show: is2152,
      fields: [
        { key: 'air', type: 'select', label: 'airflow', default: 'still',
          options: ['still', 'low', 'medium', 'high'].map((k) => ({ value: k, label: `airflow_${k}` })) },
        { key: 'alt', type: 'number', label: 'altitude', default: 0, units: ['m'] },
        { key: 'plane', type: 'number', label: 'planeArea', default: 0, units: ['mm2'], hint: 'planeAreaHint' },
        { key: 'coat', type: 'select', label: 'coating', default: 'none',
          options: ['none', 'thin', 'standard', 'thick'].map((k) => ({ value: k, label: `coating_${k}` })) },
        { key: 'duty', type: 'number', label: 'dutyCycle', default: 100, units: ['pct'], hint: 'dutyCycleHint' },
        { key: 'freq', type: 'number', label: 'frequency', default: 1, units: ['Hz'], show: (v) => v.duty < 100 },
      ],
    },
    {
      title: 'sectionDc',
      optional: true,
      fields: [
        { key: 'L', type: 'number', label: 'traceLength', default: 50, units: ['mm', 'cm', 'm', 'mil', 'in'] },
        { key: 'amb', type: 'number', label: 'ambientTemp', default: 25, units: ['C', 'F', 'K'] },
      ],
    },
  ],

  compute(v, u) {
    const lengthMm = Number.isFinite(v.L) ? toMm(v.L, u.L) : 0;
    return calculateTraceWidth({
      standard: v.std,
      pcbClass: Number(v.cls),
      isExternal: v.layer === 'ext',
      currentA: currentToA(v.I, u.I),
      deltaTC: riseToC(v.dT, u.dT),
      thicknessMil: thicknessToMil(v.t, u.t),
      ambientC: Number.isFinite(v.amb) ? tempToC(v.amb, u.amb) : 25,
      lengthM: lengthMm / 1000,
      env: {
        airflow: v.air,
        altitudeM: Number.isFinite(v.alt) ? v.alt : 0,
        planeAreaMm2: Number.isFinite(v.plane) ? v.plane : 0,
        coating: v.coat,
        dutyCycle: Number.isFinite(v.duty) && v.duty > 0 ? Math.min(v.duty, 100) / 100 : 1,
        frequencyHz: Number.isFinite(v.freq) ? v.freq : 1,
      },
    });
  },

  render(r, v) {
    if (!r.ok) return invalid(r.errors);
    const ipc2152 = r.standard === 'ipc2152';

    const main = hero(
      'recommendedWidth',
      `${fixed(r.widthMm, 3)} <span class="u">mm</span>`,
      `${fixed(r.widthMil, 2)} mil`,
    );

    const details = rows([
      ['calcWidth', `${fixed(r.calcWidthMil * 0.0254, 3)} mm · ${fixed(r.calcWidthMil, 2)} mil`],
      ipc2152 && ['marginFactor', `×${fmt(r.margin, 3)} → ${fixed(r.marginWidthMil * 0.0254, 3)} mm`],
      ['classMinimum', `${fixed(r.classMinMil * 0.0254, 3)} mm · ${fmt(r.classMinMil)} mil`],
      ['crossSection', `${fmt(r.areaMil2)} mil² · ${fmt(r.areaMil2 * 0.00064516, 3)} mm²`],
      ['copperOzEq', `${fmt(r.copperOz, 3)} oz/ft²`],
    ]);

    let factors = '';
    if (ipc2152 && r.factors) {
      const f = r.factors;
      factors = block('factorsTitle', rows([
        ['factor_airflow', `×${fixed(f.airflow, 3)}`],
        ['factor_altitude', `×${fixed(f.altitude, 3)}`],
        ['factor_coating', `×${fixed(f.coating, 3)}`],
        ['factor_duty', `×${fixed(f.duty, 3)}`],
        ['factor_thickness', `×${fixed(f.thickness, 3)}`],
        ['factor_plane', `×${fixed(f.plane, 3)}`],
        ['factor_total', `×${fixed(f.total, 3)}`, true],
      ]) + `<p class="note">${esc(t('factorsNote'))}</p>`);
    }

    let dc = '';
    if (r.dc) {
      dc = block('sectionDc', rows([
        ['conductorTemp', `${fmt(r.dc.conductorC)} °C`],
        ['resistance', si(r.dc.resistanceOhm, 'Ω')],
        ['voltageDrop', si(r.dc.voltageDropV, 'V')],
        ['powerLoss', si(r.dc.powerLossW, 'W')],
      ]) + `<p class="note">${esc(t('dcHint'))}</p>`);
    }

    const formula = ipc2152
      ? formulaBlock([
          'I_eff = I / (F_air · F_alt · F_coat · F_duty · F_t · F_plane)',
          'A     = ( I_eff / (k · ΔT^0.44) )^(1/0.725)   [mil²]',
          'W     = A / t   ×  class margin',
        ], 'formula2152')
      : formulaBlock([
          'A = ( I / (k · ΔT^b) )^(1/c)   [mil²]',
          'W = A / (t_oz · 1.378)         [mil]',
        ], 'formula2221');

    return main + messages('warn', r.warnings) + details + factors + dc + formula;
  },
};
