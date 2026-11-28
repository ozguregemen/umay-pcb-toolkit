import { rcCircuit, rlCircuit, lcCircuit, reactance } from '../engine/circuit.js';
import { heroes, rows, block, steps, messages, invalid } from '../ui/calculator.js';
import { tx } from '../ui/math.js';
import { fmt, si, siHtml, esc } from '../ui/format.js';
import { svg, twoTerm, wire, node, ground, terminal, arrow, dimH, text, axes, wave, path, circle } from '../ui/svg.js';
import { t, getLang } from '../i18n.js';

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
    rc_dgRc: 'RC alçak geçiren filtre ve basamak yanıtı: çıkış τ anında %63’e ulaşır, %10–90 yükselme 2,2τ sürer',
    rc_dgRl: 'RL devresi ve akımın yükselişi: τ anında akım son değerinin %63’üne ulaşır',
    rc_dgLc: 'Seri RLC devresi ve f0’daki rezonans tepesi',
    rc_dgX: 'XL ve XC’nin frekansla değişimi (log–log); girilen frekans ve f0 kesişimi işaretli',
    rc_dgRes: 'Rezonans eğrisi',
    rc_dgIdeal: 'R = 0: ideal devre, Q → ∞',
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
    rc_dgRc: 'RC low-pass filter and step response: the output reaches 63 % at τ, the 10–90 % rise takes 2.2τ',
    rc_dgRl: 'RL circuit and current rise: the current reaches 63 % of its final value at τ',
    rc_dgLc: 'Series RLC circuit and the resonance peak at f0',
    rc_dgX: 'XL and XC versus frequency (log–log) with the entered frequency and the f0 crossing marked',
    rc_dgRes: 'Resonance curve',
    rc_dgIdeal: 'R = 0: ideal circuit, Q → ∞',
  },
};

const REFS = ['Horowitz & Hill, The Art of Electronics, 3rd ed., ch. 1'];
const isMode = (m) => (v) => v.mode === m;
// A value with its unit, as it appears inside the calculation steps.
const q = (x, unit) => tx(si(x, unit));
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

// From v(t) = V · (1 − e^(−t/τ)): the time to reach a fraction x is −τ · ln(1 − x).
const riseStep = (r) => ({
  label: 'rc_rise', sym: 't_r = t_{90\\,\\%} − t_{10\\,\\%} = τ \\cdot \\ln 9', num: `${q(r.tau, 's')} \\cdot ${tx(fmt(Math.log(9), 4))}`, res: q(r.rise, 's'),
});

// ---------------------------------------------------------------------------
// Live diagrams
// ---------------------------------------------------------------------------

const val = (x, unit) => (Number.isFinite(x) && x > 0 ? si(x, unit, 3) : '?');
/** Percent in the page language (%63 / 63 %). */
const pc = (s) => (getLang() === 'tr' ? `%${s}` : `${s} %`);
const FLOW = { cls: 'flow', headCls: 'arrow flow' };

// Right-hand plot area shared by the RC / RL / LC diagrams.
const PX = 252;
const PY = 172;
const PW = 170;
const PH = 112;


/** RC low-pass (Vin → R → C to GND → Vout) or RL (Vin → R → L to GND, current i). */
function firstOrderSchematic(v, r, isRl) {
  const y = 80;
  let b = twoTerm('R', 28, y, 140, y, { name: 'R', value: val(isRl ? v.rlR : v.rcR, 'Ω') });
  if (isRl) {
    b += twoTerm('L', 140, y, 140, 160, { name: 'L', value: val(v.rlL, 'H') }) + ground(140, 160)
      + arrow(124, 100, 124, 140, FLOW) + text(118, 124, 'i', { cls: 'sym', anchor: 'end' });
  } else {
    b += twoTerm('C', 140, y, 140, 160, { name: 'C', value: val(v.rcC, 'F') }) + ground(140, 160)
      + wire([140, y], [200, y]) + node(140, y) + terminal(200, y, 'Vout', 'top');
  }
  return b + terminal(28, y, 'Vin', 'top')
    + text(104, 196, `τ = ${isRl ? 'L / R' : 'R · C'} = ${val(r?.tau, 's')}`, { cls: 'val' })
    + text(104, 212, `fc = ${val(r?.fc, 'Hz')}`, { cls: 'val' });
}

/** Step response 1 − e^(−t/τ) over 0…5τ with τ (63 %) and the 10–90 % rise marked. */
function stepPlot(r, curve) {
  const X = (k) => PX + (k / 5) * PW;
  const Y = (p) => PY - p * PH;
  const pts = [];
  for (let i = 0; i <= 60; i++) {
    const k = (i / 60) * 5;
    pts.push([X(k), Y(1 - Math.exp(-k))]);
  }
  const k10 = Math.log(10 / 9);
  const k90 = Math.LN10;
  const yd = 44;
  return text(PX + PW / 2, 16, t('rc_stepTitle'), { cls: 'title' })
    + axes(PX, PY, PW + 8, PH + 6, { xLabel: 't' })
    + path(`M${PX},${Y(1)}H${PX + PW}`, 'ext')
    + path(`M${PX},${Y(0.632)}H${X(1)}V${PY}`, 'ext')
    + path(`M${X(k10)},${Y(0.1)}V${yd}M${X(k90)},${Y(0.9)}V${yd}`, 'ext')
    + wave(pts)
    + circle(X(1), Y(0.632), 2.8, 'node') + circle(X(k10), Y(0.1), 2.2, 'node') + circle(X(k90), Y(0.9), 2.2, 'node')
    + dimH(X(k10), X(k90), yd, `${pc('10–90')}: ${val(r?.rise, 's')}`, { cls: 'val' })
    + text(PX - 5, Y(1) + 4, pc(100), { cls: 'lbl', anchor: 'end' })
    + text(PX - 5, Y(0.632) + 4, pc(63), { cls: 'lbl', anchor: 'end' })
    + text(X(1), PY + 14, 'τ', { cls: 'sym' })
    + text(PX + PW, Y(1) + 22, curve, { cls: 'sym', anchor: 'end' });
}

/** Series R–L–C loop driven by an AC source. */
function lcSchematic(v, r) {
  const xs = 40;
  const xc = 196;
  const yt = 60;
  const yb = 160;
  const hasR = v.lcR > 0;
  let b = twoTerm('AC', xs, yt, xs, yb);
  b += hasR
    ? twoTerm('R', xs, yt, 100, yt, { name: 'R', value: val(v.lcR, 'Ω') }) + twoTerm('L', 100, yt, xc, yt, { name: 'L', value: val(v.lcL, 'H') })
    : twoTerm('L', xs, yt, xc, yt, { name: 'L', value: val(v.lcL, 'H') });
  b += twoTerm('C', xc, yt, xc, yb, { name: 'C', value: val(v.lcC, 'F'), flip: true }) + wire([xc, yb], [xs, yb])
    + arrow(146, 146, 96, 146, FLOW) + text(121, 139, 'I', { cls: 'sym' })
    + text(118, 192, `f0 = 1 / (2π·√(L·C)) = ${val(r?.f0, 'Hz')}`, { cls: 'val' });
  if (Number.isFinite(r?.q)) b += text(118, 209, `Q = ${fmt(r.q, 3)} · BW = ${val(r.bw, 'Hz')}`, { cls: 'val' });
  else if (r) b += text(118, 209, t('rc_dgIdeal'), { cls: 'lbl' });
  return b;
}

/** Normalised series-RLC current |I| around f0 (log f, ±0.6 decade), BW at −3 dB. */
function resonancePlot(r) {
  const span = 0.6;
  const hasQ = Number.isFinite(r?.q);
  const q = hasQ ? Math.min(30, Math.max(0.3, r.q)) : 30;
  const X = (x) => PX + ((Math.log10(x) + span) / (2 * span)) * PW;
  const Y = (p) => PY - p * PH;
  const g = (x) => 1 / Math.sqrt(1 + q * q * (x - 1 / x) ** 2);
  const pts = [];
  for (let i = 0; i <= 400; i++) {
    const x = 10 ** (-span + (2 * span * i) / 400);
    pts.push([X(x), Y(g(x))]);
  }
  let b = text(PX + PW / 2, 16, t('rc_dgRes'), { cls: 'title' })
    + axes(PX, PY, PW + 8, PH + 6, { xLabel: 'f' })
    + text(PX - 5, Y(1) + 4, '|I|', { cls: 'sym', anchor: 'end' })
    + path(`M${X(1)},${Y(1)}V${PY}`, 'ext') + wave(pts)
    + text(X(1), PY + 14, 'f0', { cls: 'name' })
    + text(X(1), Y(1) - 8, `f0 = ${val(r?.f0, 'Hz')}`, { cls: 'val' });
  if (hasQ && r.q <= 30) {
    const a = Math.sqrt(1 + 1 / (4 * q * q));
    const xa = X(Math.max(a - 1 / (2 * q), 10 ** -span));
    const xb = X(Math.min(a + 1 / (2 * q), 10 ** span));
    const yb = Y(Math.SQRT1_2);
    // −3 dB level and the bandwidth between the two −3 dB points.
    b += path(`M${PX},${yb}H${xa}`, 'ext') + text(PX - 5, yb + 4, '−3 dB', { cls: 'lbl', anchor: 'end' })
      + dimH(xa, xb, yb, '')
      + (xb - xa >= 40
        ? text(X(1) + 6, yb - 5, 'BW', { cls: 'sym', anchor: 'start' })
        : text(xb + 18, yb + 4, 'BW', { cls: 'sym', anchor: 'start' }));
  }
  return b;
}

/** Log–log XL and XC versus f with the entered f and the f0 crossing marked. */
function reactancePlot(v, r) {
  const x0 = 64;
  const y0 = 176;
  const w = 336;
  const h = 140;
  const ok = !!r;
  // Placeholder while inputs are invalid: L, C chosen for f = f0 = 1 kHz, Z0 = 1 Ω.
  const L = ok ? v.xL : 1 / (2 * Math.PI * 1e3);
  const C = ok ? v.xC : 1 / (2 * Math.PI * 1e3);
  const f = ok ? v.xF : 1e3;
  const hasL = L > 0;
  const hasC = C > 0;
  const xl = (fr) => 2 * Math.PI * fr * L;
  const xc = (fr) => 1 / (2 * Math.PI * fr * C);
  const f0 = hasL && hasC ? 1 / (2 * Math.PI * Math.sqrt(L * C)) : NaN;
  const hasF0 = Number.isFinite(f0);
  const center = hasF0 ? Math.sqrt(f * f0) : f;
  const hs = Math.max(1.5, (hasF0 ? Math.abs(Math.log10(f / f0)) / 2 : 0) + 1); // half span, decades
  const lo = center / 10 ** hs;
  const hi = center * 10 ** hs;
  const ys = [...(hasL ? [xl(lo), xl(hi)] : []), ...(hasC ? [xc(lo), xc(hi)] : [])];
  const yLo = Math.log10(Math.min(...ys));
  const yHi = Math.log10(Math.max(...ys));
  const fx = (fr) => (Math.log10(fr) - Math.log10(lo)) / (2 * hs); // 0…1 across the plot
  const X = (fr) => x0 + fx(fr) * w;
  const Y = (x) => y0 - ((Math.log10(x) - yLo) / (yHi - yLo)) * h;
  const clampX = (x) => Math.min(Math.max(x, x0 + 42), x0 + w - 42);

  // Decade grid
  let b = '';
  for (let e = Math.ceil(Math.log10(lo)); e <= Math.floor(Math.log10(hi)); e++) b += path(`M${X(10 ** e)},${y0}V${y0 - h}`, 'grid-l');
  for (let e = Math.ceil(yLo); e <= Math.floor(yHi); e++) b += path(`M${x0},${Y(10 ** e)}H${x0 + w}`, 'grid-l');
  b += axes(x0, y0, w, h)
    + text(x0, y0 - h - 8, '|X|', { cls: 'sym' }) + text(x0 + w + 8, y0 + 14, 'f', { cls: 'sym', anchor: 'start' })
    + text(x0 + w, y0 - h - 8, 'log–log', { cls: 'lbl', anchor: 'end' });
  if (hasL) b += wave([[X(lo), Y(xl(lo))], [X(hi), Y(xl(hi))]], 'wave');
  if (hasC) b += wave([[X(lo), Y(xc(lo))], [X(hi), Y(xc(hi))]], 'wave2');

  // Legend above the plot: line style + the reactance at the entered f.
  const items = [
    hasL && { cls: 'wave', s: ok ? `XL = ${val(r.xl, 'Ω')}` : 'XL' },
    hasC && { cls: 'wave2', s: ok ? `XC = ${val(r.xc, 'Ω')}` : 'XC' },
  ].filter(Boolean);
  const lx0 = items.length === 2 ? 106 : 176;
  items.forEach((it, i) => {
    const lx = lx0 + i * 118;
    b += wave([[lx, y0 - h - 12], [lx + 22, y0 - h - 12]], it.cls) + text(lx + 28, y0 - h - 8, it.s, { cls: ok ? 'val' : 'name', anchor: 'start' });
  });

  // f0 crossing
  if (hasF0) {
    b += path(`M${X(f0)},${Y(xl(f0))}V${y0}`, 'ext') + circle(X(f0), Y(xl(f0)), 3, 'node')
      + text(clampX(X(f0)), y0 + 28, ok ? `f0 = ${val(r.f0, 'Hz')}` : 'f0', { cls: ok ? 'val' : 'name' });
  }
  // Entered frequency: marker line with a dot on each reactance line.
  const xF = X(f);
  b += path(`M${xF},${y0}V${y0 - h}`, 'dimline');
  if (hasL) b += circle(xF, Y(xl(f)), 3.4, 'node');
  if (hasC) b += circle(xF, Y(xc(f)), 3.4, 'node');
  b += text(clampX(xF), y0 + 14, ok ? `f = ${val(v.xF, 'Hz')}` : 'f', { cls: ok ? 'val' : 'name' });
  return b;
}

function diagram(v, u, r) {
  if (v.mode === 'x') return svg(440, 212, reactancePlot(v, r), t('rc_dgX'), { wide: true });
  if (v.mode === 'lc') return svg(440, 218, lcSchematic(v, r) + resonancePlot(r), t('rc_dgLc'), { wide: true });
  const isRl = v.mode === 'rl';
  return svg(440, 218, firstOrderSchematic(v, r, isRl) + stepPlot(r, isRl ? 'i(t)' : 'Vout(t)'), t(isRl ? 'rc_dgRl' : 'rc_dgRc'), { wide: true });
}

export default {
  diagram,
  id: 'rc',
  strings,
  // Parameter plot (ui/sweep.js): results that can be drawn against one input.
  plot: {
    y: [
      { key: 'tau', label: 'rc_tau', unit: 's', get: (r) => r.tau },
      { key: 'fc', label: 'rc_fc', unit: 'Hz', get: (r) => r.fc },
      { key: 'xl', label: 'rc_xl', unit: 'Ω', get: (r) => r.xl },
      { key: 'xc', label: 'rc_xc', unit: 'Ω', get: (r) => r.xc },
      { key: 'f0', label: 'rc_f0', unit: 'Hz', get: (r) => r.f0 },
      { key: 'z0', label: 'rc_z0', unit: 'Ω', get: (r) => r.z0 },
      { key: 'q', label: 'rc_q', unit: '', get: (r) => r.q },
    ],
  },
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

  render(r, v) {
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
        + steps([
          { label: 'rc_f0', sym: 'f_0 = \\frac{1}{2π \\sqrt{L \\cdot C}}', num: `\\frac{1}{2π \\sqrt{${q(v.lcL, 'H')} \\cdot ${q(v.lcC, 'F')}}}`, res: q(r.f0, 'Hz') },
          { label: 'rc_z0', sym: 'Z_0 = \\sqrt{\\frac{L}{C}}', num: `\\sqrt{\\frac{${q(v.lcL, 'H')}}{${q(v.lcC, 'F')}}}`, res: q(r.z0, 'Ω') },
          Number.isFinite(r.q) && { label: 'rc_q', sym: 'Q = \\frac{1}{R} \\sqrt{\\frac{L}{C}} = \\frac{Z_0}{R}', num: `\\frac{${q(r.z0, 'Ω')}}{${q(v.lcR, 'Ω')}}`, res: tx(fmt(r.q, 4)) },
          Number.isFinite(r.q) && { label: 'rc_bw', sym: 'BW = \\frac{f_0}{Q}', num: `\\frac{${q(r.f0, 'Hz')}}{${tx(fmt(r.q, 4))}}`, res: q(r.bw, 'Hz') },
        ], { note: 'rc_noteLc', refs: REFS })
        + block('rc_details', rows([
          ['rc_omega', si(r.omega, 'rad/s')],
          ['rc_period', si(r.period, 's')],
        ]))
        + loss;
    }

    if (r.mode === 'x') {
      const kind = r.xSeries >= 0 ? 'rc_inductive' : 'rc_capacitive';
      return heroes([
        Number.isFinite(r.xl) && ['rc_xl', siHtml(r.xl, 'Ω')],
        Number.isFinite(r.xc) && ['rc_xc', siHtml(r.xc, 'Ω')],
      ])
        + steps([
          Number.isFinite(r.xl) && { label: 'rc_xl', sym: 'X_L = 2π \\cdot f \\cdot L', num: `2π \\cdot ${q(v.xF, 'Hz')} \\cdot ${q(v.xL, 'H')}`, res: q(r.xl, 'Ω') },
          Number.isFinite(r.xc) && { label: 'rc_xc', sym: 'X_C = \\frac{1}{2π \\cdot f \\cdot C}', num: `\\frac{1}{2π \\cdot ${q(v.xF, 'Hz')} \\cdot ${q(v.xC, 'F')}}`, res: q(r.xc, 'Ω') },
          Number.isFinite(r.xSeries) && { label: 'rc_xs', sym: 'X = X_L − X_C', num: `${q(r.xl, 'Ω')} − ${q(r.xc, 'Ω')}`, res: q(r.xSeries, 'Ω') },
        ], { note: 'rc_noteX', refs: REFS })
        + block('rc_details', rows([
          ['rc_omega', si(r.omega, 'rad/s')],
          Number.isFinite(r.xSeries) && ['rc_xs', `${si(r.xSeries, 'Ω')} · ${esc(t(kind))}`],
          Number.isFinite(r.f0) && ['rc_f0lc', si(r.f0, 'Hz')],
        ]));
    }

    const rl = r.mode === 'rl';
    return heroes([
      ['rc_tau', siHtml(r.tau, 's')],
      ['rc_fc', siHtml(r.fc, 'Hz')],
    ])
      + steps(rl ? [
        { label: 'rc_tau', sym: 'τ = \\frac{L}{R}', num: `\\frac{${q(v.rlL, 'H')}}{${q(v.rlR, 'Ω')}}`, res: q(r.tau, 's') },
        { label: 'rc_fc', sym: 'f_c = \\frac{R}{2π \\cdot L}', num: `\\frac{${q(v.rlR, 'Ω')}}{2π \\cdot ${q(v.rlL, 'H')}}`, res: q(r.fc, 'Hz') },
        riseStep(r),
      ] : [
        { label: 'rc_tau', sym: 'τ = R \\cdot C', num: `${q(v.rcR, 'Ω')} \\cdot ${q(v.rcC, 'F')}`, res: q(r.tau, 's') },
        { label: 'rc_fc', sym: 'f_c = \\frac{1}{2π \\cdot R \\cdot C}', num: `\\frac{1}{2π \\cdot ${q(v.rcR, 'Ω')} \\cdot ${q(v.rcC, 'F')}}`, res: q(r.fc, 'Hz') },
        riseStep(r),
      ], { note: 'rc_noteRc', refs: REFS })
      + stepRows(r);
  },
};
