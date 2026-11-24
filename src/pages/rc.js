import { rcCircuit, rlCircuit, lcCircuit, reactance } from '../engine/circuit.js';
import { heroes, rows, block, formulaBlock, messages, invalid } from '../ui/calculator.js';
import { fmt, si, siHtml, esc } from '../ui/format.js';
import { t } from '../i18n.js';

const FARAD = 'farad'; // 'F' would render as °F

const strings = {
  tr: {
    rc_modeX: 'Reaktans',
    rc_r: 'Direnç R',
    rc_c: 'Kapasitans C',
    rc_l: 'Endüktans L',
    rc_rs: 'Seri direnç R',
    rc_rsInfo: 'Devredeki toplam seri direnç: bobin DCR’si, kondansatör ESR’si ve kaynak direnci. Q, bant genişliği ve sönüm için gerekir.',
    rc_f: 'Frekans f',
    rc_tau: 'Zaman sabiti τ',
    rc_fc: 'Kesim frekansı fc (−3 dB)',
    rc_omega: 'Açısal frekans ω',
    rc_rise: 'Yükselme süresi %10 → %90 (≈ 2,2τ)',
    rc_t50: '%50’ye ulaşma (0,693τ)',
    rc_t63: '%63’e ulaşma (τ)',
    rc_t90: '%90’a ulaşma (2,303τ)',
    rc_t99: '%99’a ulaşma (4,605τ)',
    rc_stepTitle: 'Basamak yanıtı',
    rc_f0: 'Rezonans frekansı f0',
    rc_z0: 'Karakteristik empedans √(L/C)',
    rc_period: 'Periyot 1/f0',
    rc_q: 'Kalite faktörü Q',
    rc_bw: 'Bant genişliği f0/Q',
    rc_zeta: 'Sönüm oranı ζ',
    rc_lossTitle: 'Kayıplı devre (seri R)',
    rc_xl: 'Endüktif reaktans XL',
    rc_xc: 'Kapasitif reaktans XC',
    rc_xs: 'Net seri reaktans XL − XC',
    rc_inductive: 'endüktif',
    rc_capacitive: 'kapasitif',
    rc_f0lc: 'Bu L ve C ile rezonans',
    rc_details: 'Ayrıntılar',
    rc_noteRc: 'Birinci dereceden devrede basamak girişe yanıt v(t) = V·(1 − e^(−t/τ)) biçimindedir. fc, RC/RL alçak veya yüksek geçiren filtrenin −3 dB noktasıdır.',
    rc_noteLc: 'Q ve bant genişliği seri RLC içindir (R: bobin DCR + kondansatör ESR + kaynak direnci). Paralel RLC’de Q = R·√(C/L) olur.',
    rc_noteX: 'Reaktanslar ideal L ve C içindir; gerçek parçalarda ESR, ESL ve öz rezonans frekansı sonucu değiştirir.',
    warn_rc_overdamped: 'Q < 0,5: devre aşırı sönümlüdür ve salınım yapmaz; f0 bir rezonans tepesi değil, karakteristik frekanstır.',
    warn_rc_highQ: 'Q > 100: gerçek bileşenlerde bu kadar yüksek Q’ya ulaşmak zordur; bobin DCR’si ve kondansatör ESR’sini seri R’ye ekleyin.',
    err_rc_needLC: 'L ya da C’den en az birini girin.',
  },
  en: {
    rc_modeX: 'Reactance',
    rc_r: 'Resistance R',
    rc_c: 'Capacitance C',
    rc_l: 'Inductance L',
    rc_rs: 'Series resistance R',
    rc_rsInfo: 'Total series resistance in the loop: inductor DCR, capacitor ESR and source resistance. Needed for Q, bandwidth and damping.',
    rc_f: 'Frequency f',
    rc_tau: 'Time constant τ',
    rc_fc: 'Cutoff frequency fc (−3 dB)',
    rc_omega: 'Angular frequency ω',
    rc_rise: 'Rise time 10 → 90 % (≈ 2.2τ)',
    rc_t50: 'Time to 50 % (0.693τ)',
    rc_t63: 'Time to 63 % (τ)',
    rc_t90: 'Time to 90 % (2.303τ)',
    rc_t99: 'Time to 99 % (4.605τ)',
    rc_stepTitle: 'Step response',
    rc_f0: 'Resonant frequency f0',
    rc_z0: 'Characteristic impedance √(L/C)',
    rc_period: 'Period 1/f0',
    rc_q: 'Quality factor Q',
    rc_bw: 'Bandwidth f0/Q',
    rc_zeta: 'Damping ratio ζ',
    rc_lossTitle: 'Lossy circuit (series R)',
    rc_xl: 'Inductive reactance XL',
    rc_xc: 'Capacitive reactance XC',
    rc_xs: 'Net series reactance XL − XC',
    rc_inductive: 'inductive',
    rc_capacitive: 'capacitive',
    rc_f0lc: 'Resonance of this L and C',
    rc_details: 'Details',
    rc_noteRc: 'A first-order circuit responds to a step as v(t) = V·(1 − e^(−t/τ)). fc is the −3 dB point of the RC/RL low- or high-pass filter.',
    rc_noteLc: 'Q and bandwidth are for a series RLC (R: inductor DCR + capacitor ESR + source resistance). For a parallel RLC, Q = R·√(C/L).',
    rc_noteX: 'Reactances are for ideal L and C; in real parts ESR, ESL and the self-resonant frequency change the result.',
    warn_rc_overdamped: 'Q < 0.5: the circuit is overdamped and does not ring; f0 is a characteristic frequency rather than a resonant peak.',
    warn_rc_highQ: 'Q > 100 is hard to reach with real components; include inductor DCR and capacitor ESR in the series R.',
    err_rc_needLC: 'Enter at least one of L or C.',
  },
};

const REFS = ['Horowitz & Hill, The Art of Electronics, 3rd ed., ch. 1'];
const isMode = (m) => (v) => v.mode === m;
const siField = (key, label, def, unit, show, extra = {}) => ({ key, type: 'number', label, default: def, units: [unit], si: true, show, ...extra });

function stepRows(r) {
  return block('rc_stepTitle', rows([
    ['rc_rise', si(r.rise, 's')],
    ['rc_t50', si(r.t50, 's')],
    ['rc_t63', si(r.t63, 's')],
    ['rc_t90', si(r.t90, 's')],
    ['rc_t99', si(r.t99, 's')],
    ['rc_omega', si(r.omega, 'rad/s')],
  ]));
}

const STEP_LINES = [
  'v(t) = V · (1 − e^(−t/τ))',
  't_x  = −τ · ln(1 − x):  50 % → 0.693τ,  63.2 % → τ,  90 % → 2.303τ,  99 % → 4.605τ',
  't_r(10–90 %) = τ · ln 9 ≈ 2.197τ',
];

export default {
  id: 'rc',
  strings,
  sections: [
    {
      title: 'sectionSetup',
      fields: [
        { key: 'mode', type: 'choice', label: 'mode', default: 'rc',
          options: [
            { value: 'rc', label: 'RC', raw: true },
            { value: 'rl', label: 'RL', raw: true },
            { value: 'lc', label: 'LC', raw: true },
            { value: 'x', label: 'rc_modeX' },
          ] },
      ],
    },
    {
      title: 'sectionInputs',
      fields: [
        siField('rcR', 'rc_r', '10k', 'ohm', isMode('rc')),
        siField('rcC', 'rc_c', '100n', FARAD, isMode('rc')),
        siField('rlR', 'rc_r', 10, 'ohm', isMode('rl')),
        siField('rlL', 'rc_l', '100u', 'H', isMode('rl')),
        siField('lcL', 'rc_l', '10u', 'H', isMode('lc')),
        siField('lcC', 'rc_c', '100n', FARAD, isMode('lc')),
        siField('lcR', 'rc_rs', '1', 'ohm', isMode('lc'), { optional: true, info: 'rc_rsInfo' }),
        siField('xF', 'rc_f', '1M', 'Hz', isMode('x'), {
          presets: [['50 Hz', '50'], ['1 kHz', '1k'], ['100 kHz', '100k'], ['1 MHz', '1M'], ['100 MHz', '100M']]
            .map(([label, value]) => ({ label, value })) }),
        siField('xL', 'rc_l', '10u', 'H', isMode('x'), { optional: true }),
        siField('xC', 'rc_c', '100n', FARAD, isMode('x'), { optional: true }),
      ],
    },
  ],

  compute(v) {
    switch (v.mode) {
      case 'rl': return { ok: true, mode: 'rl', ...rlCircuit(v.rlR, v.rlL) };
      case 'lc': {
        const r = { ok: true, mode: 'lc', ...lcCircuit(v.lcL, v.lcC, v.lcR), warnings: [] };
        if (r.q < 0.5) r.warnings.push('rc_overdamped');
        if (r.q > 100) r.warnings.push('rc_highQ');
        return r;
      }
      case 'x':
        if (!(v.xL > 0) && !(v.xC > 0)) return { ok: false, errors: ['rc_needLC'] };
        return { ok: true, mode: 'x', ...reactance(v.xF, v.xL, v.xC) };
      default: return { ok: true, mode: 'rc', ...rcCircuit(v.rcR, v.rcC) };
    }
  },

  render(r) {
    if (!r.ok) return invalid(r.errors);

    if (r.mode === 'lc') {
      const loss = Number.isFinite(r.q)
        ? block('rc_lossTitle', rows([
          ['rc_q', fmt(r.q, 4)],
          ['rc_bw', si(r.bw, 'Hz')],
          ['rc_zeta', fmt(r.zeta, 4)],
        ]))
        : '';
      return heroes([
        ['rc_f0', siHtml(r.f0, 'Hz')],
        ['rc_z0', siHtml(r.z0, 'Ω')],
      ])
        + messages('warn', r.warnings)
        + block('rc_details', rows([
          ['rc_omega', si(r.omega, 'rad/s')],
          ['rc_period', si(r.period, 's')],
        ]))
        + loss
        + formulaBlock([
          'f0 = 1 / (2π · √(L · C)),   ω0 = 2π · f0',
          'Z0 = √(L / C)',
          'Q  = (1 / R) · √(L / C),   BW = f0 / Q,   ζ = 1 / (2Q)',
        ], 'rc_noteLc', REFS);
    }

    if (r.mode === 'x') {
      const kind = r.xSeries >= 0 ? 'rc_inductive' : 'rc_capacitive';
      return heroes([
        Number.isFinite(r.xl) && ['rc_xl', siHtml(r.xl, 'Ω')],
        Number.isFinite(r.xc) && ['rc_xc', siHtml(r.xc, 'Ω')],
      ])
        + block('rc_details', rows([
          ['rc_omega', si(r.omega, 'rad/s')],
          Number.isFinite(r.xSeries) && ['rc_xs', `${si(r.xSeries, 'Ω')} · ${esc(t(kind))}`],
          Number.isFinite(r.f0) && ['rc_f0lc', si(r.f0, 'Hz')],
        ]))
        + formulaBlock([
          'XL = 2π · f · L',
          'XC = 1 / (2π · f · C)',
          'X  = XL − XC   (series L–C;  X > 0 inductive, X < 0 capacitive)',
        ], 'rc_noteX', REFS);
    }

    const rl = r.mode === 'rl';
    return heroes([
      ['rc_tau', siHtml(r.tau, 's')],
      ['rc_fc', siHtml(r.fc, 'Hz')],
    ])
      + stepRows(r)
      + formulaBlock([
        rl ? 'τ  = L / R' : 'τ  = R · C',
        rl ? 'fc = R / (2π · L)' : 'fc = 1 / (2π · R · C)',
        ...STEP_LINES,
      ], 'rc_noteRc', REFS);
  },
};
