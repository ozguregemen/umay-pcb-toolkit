import { gammaFromLoad, fromGammaMag, gammaFromVswr, gammaFromReturnLoss } from '../engine/rf.js';
import { heroes, rows, block, formulaBlock } from '../ui/calculator.js';
import { fmt, fixed } from '../ui/format.js';

const strings = {
  tr: {
    rf_mode: 'Girdi',
    rf_load: 'Yük empedansı',
    rf_vswr: 'VSWR',
    rf_rl: 'Geri dönüş kaybı',
    rf_gamma: '|Γ|',
    rf_z0: 'Hat empedansı (Z₀)',
    rf_r: 'Yük direnci (R)',
    rf_x: 'Yük reaktansı (X)',
    rf_xInfo: 'Endüktif yük için pozitif, kapasitif yük için negatif.',
    rf_vswrIn: 'VSWR',
    rf_rlIn: 'Geri dönüş kaybı',
    rf_gIn: 'Yansıma katsayısı genliği |Γ|',
    rf_angle: 'Γ açısı',
    rf_ml: 'Uyumsuzluk kaybı',
    rf_refl: 'Yansıyan güç',
    rf_trans: 'Yüke giden güç',
    rf_note: 'Γ, hattın sonundaki uyumsuzluğun ne kadarının geri yansıdığını gösterir. Dijital sinyallerde Γ aşma/çınlama olarak görünür (ör. 50 Ω hattın sonunda açık devre Γ = +1, gerilim ikiye katlanır). RF’de genellikle geri dönüş kaybı > 10 dB (VSWR < 2) iyi, > 20 dB (VSWR < 1,22) çok iyi kabul edilir.',
  },
  en: {
    rf_mode: 'Input',
    rf_load: 'Load impedance',
    rf_vswr: 'VSWR',
    rf_rl: 'Return loss',
    rf_gamma: '|Γ|',
    rf_z0: 'Line impedance (Z₀)',
    rf_r: 'Load resistance (R)',
    rf_x: 'Load reactance (X)',
    rf_xInfo: 'Positive for an inductive load, negative for a capacitive one.',
    rf_vswrIn: 'VSWR',
    rf_rlIn: 'Return loss',
    rf_gIn: 'Reflection coefficient magnitude |Γ|',
    rf_angle: 'Angle of Γ',
    rf_ml: 'Mismatch loss',
    rf_refl: 'Reflected power',
    rf_trans: 'Power delivered to the load',
    rf_note: 'Γ tells how much of a mismatch at the end of the line is reflected back. On digital signals Γ appears as overshoot/ringing (e.g. an open end on a 50 Ω line gives Γ = +1, doubling the voltage). In RF, return loss > 10 dB (VSWR < 2) is usually considered good and > 20 dB (VSWR < 1.22) very good.',
  },
};

const is = (m) => (v) => v.mode === m;

export default {
  id: 'reflection',
  strings,
  sections: [
    {
      title: 'sectionInputs',
      fields: [
        { key: 'mode', type: 'choice', label: 'rf_mode', default: 'load',
          options: [{ value: 'load', label: 'rf_load' }, { value: 'vswr', label: 'rf_vswr' }, { value: 'rl', label: 'rf_rl' }, { value: 'g', label: 'rf_gamma' }] },
        { key: 'z0', type: 'number', label: 'rf_z0', default: 50, units: ['ohm'], show: is('load'),
          presets: [50, 75, 100].map((x) => ({ label: `${x} Ω`, value: x })) },
        { key: 'r', type: 'number', label: 'rf_r', default: 75, units: ['ohm'], valid: 'nonneg', show: is('load') },
        { key: 'x', type: 'number', label: 'rf_x', default: 0, units: ['ohm'], valid: 'any', info: 'rf_xInfo', show: is('load') },
        { key: 'vswr', type: 'number', label: 'rf_vswrIn', default: 1.5, min: 1, show: is('vswr') },
        { key: 'rl', type: 'number', label: 'rf_rlIn', default: 15, units: ['dB'], valid: 'nonneg', show: is('rl') },
        { key: 'g', type: 'number', label: 'rf_gIn', default: 0.2, valid: 'nonneg', max: 1, show: is('g') },
      ],
    },
  ],

  compute(v) {
    let g;
    let angle = null;
    if (v.mode === 'load') {
      const c = gammaFromLoad(v.z0, v.r, v.x);
      g = c.mag;
      angle = c.angleDeg;
    } else if (v.mode === 'vswr') g = gammaFromVswr(v.vswr);
    else if (v.mode === 'rl') g = gammaFromReturnLoss(v.rl);
    else g = v.g;
    return { ok: true, ...fromGammaMag(g), angle };
  },

  render(r) {
    const db = (x) => (Number.isFinite(x) ? `${fixed(x, 2)} dB` : '∞');
    return heroes([
      ['rf_rl', Number.isFinite(r.returnLossDb) ? `${fixed(r.returnLossDb, 2)} <span class="u">dB</span>` : '∞'],
      ['rf_vswr', Number.isFinite(r.vswr) ? `${fixed(r.vswr, 3)} <span class="u">: 1</span>` : '∞'],
    ])
      + block('results', rows([
        ['rf_gIn', fmt(r.gamma, 4)],
        r.angle !== null && ['rf_angle', `${fixed(r.angle, 1)}°`],
        ['rf_ml', db(r.mismatchLossDb)],
        ['rf_refl', `${fmt(r.reflectedPct, 4)} %`],
        ['rf_trans', `${fmt(r.transmittedPct, 4)} %`],
      ]))
      + formulaBlock([
        'Γ = (ZL − Z0) / (ZL + Z0)',
        'VSWR = (1 + |Γ|) / (1 − |Γ|)',
        'RL = −20·log10|Γ|        ML = −10·log10(1 − |Γ|²)',
      ], 'rf_note');
  },
};
