import { astable, astableDesign, monostable } from '../engine/timer555.js';
import { nearestStandard } from '../engine/eseries.js';
import { heroes, rows, block, steps, invalid } from '../ui/calculator.js';
import { tx } from '../ui/math.js';
import { fmt, fixed, si, siHtml } from '../ui/format.js';
import { svg, twoTerm, wire, node, ground, terminal, text, rect, path, dimH, axes, wave } from '../ui/svg.js';
import { t } from '../i18n.js';

const strings = {
  tr: {
    tm_mode: 'Çalışma',
    tm_astable: 'Astable (osilatör)',
    tm_design: 'Astable tasarım',
    tm_mono: 'Monostable (tek atım)',
    tm_r1: 'R1',
    tm_r2: 'R2',
    tm_r: 'R',
    tm_c: 'C',
    tm_f: 'Hedef frekans',
    tm_duty: 'Hedef görev oranı',
    tm_dutyInfo: 'Klasik 555 astable devresinde görev oranı %50’nin üzerindedir. %50 ve altı için R2’ye paralel diyot veya farklı bir devre gerekir.',
    tm_freq: 'Frekans',
    tm_dutyOut: 'Görev oranı',
    tm_th: 'Yüksek süre',
    tm_tl: 'Düşük süre',
    tm_period: 'Periyot',
    tm_pulse: 'Darbe süresi',
    tm_r1std: 'R1 (en yakın E24)',
    tm_r2std: 'R2 (en yakın E24)',
    tm_note: 'NE555 (bipolar) veri sayfası denklemleri. CMOS sürümler (TLC555, LMC555) benzer davranır ama daha yüksek dirençlerle çalışabilir. Zamanlama kondansatörü için düşük kaçaklı film veya C0G seramik kullanın; elektrolitik kondansatör toleransı süreyi bozar. R1 ve R2’yi 1 kΩ–1 MΩ aralığında tutun.',
    err_values: 'Tüm değerler sıfırdan büyük olmalı.',
    err_duty: 'Bu devre ile görev oranı %50–100 arasında olmalı.',
    tm_dgAstable: '555 astable devresi: R1, R2 ve C ile kondansatör gerilimi (⅓–⅔ VCC arası) ve çıkış dalga biçimi',
    tm_dgMono: '555 monostable devresi: tetik darbesi, kondansatör gerilimi ve t süreli çıkış darbesi',
    tm_dgTrig: 'Tetik',
  },
  en: {
    tm_mode: 'Mode',
    tm_astable: 'Astable (oscillator)',
    tm_design: 'Astable design',
    tm_mono: 'Monostable (one-shot)',
    tm_r1: 'R1',
    tm_r2: 'R2',
    tm_r: 'R',
    tm_c: 'C',
    tm_f: 'Target frequency',
    tm_duty: 'Target duty cycle',
    tm_dutyInfo: 'In the classic 555 astable circuit the duty cycle is above 50 %. For 50 % or less you need a diode across R2 or a different circuit.',
    tm_freq: 'Frequency',
    tm_dutyOut: 'Duty cycle',
    tm_th: 'High time',
    tm_tl: 'Low time',
    tm_period: 'Period',
    tm_pulse: 'Pulse width',
    tm_r1std: 'R1 (nearest E24)',
    tm_r2std: 'R2 (nearest E24)',
    tm_note: 'NE555 (bipolar) datasheet equations. CMOS versions (TLC555, LMC555) behave similarly but tolerate higher resistances. Use a low-leakage film or C0G ceramic timing capacitor; electrolytic tolerance spoils the timing. Keep R1 and R2 within 1 kΩ–1 MΩ.',
    err_values: 'All values must be greater than zero.',
    err_duty: 'With this circuit the duty cycle must be 50–100 %.',
    tm_dgAstable: '555 astable circuit: R1, R2 and C with the capacitor voltage (between ⅓ and ⅔ VCC) and the output waveform',
    tm_dgMono: '555 monostable circuit: trigger pulse, capacitor voltage and the output pulse of width t',
    tm_dgTrig: 'Trigger',
  },
};

const is = (m) => (v) => v.mode === m;

// ---------------------------------------------------------------------------
// Live diagrams
// ---------------------------------------------------------------------------

const val = (x, unit) => (Number.isFinite(x) && x > 0 ? si(x, unit, 3) : '?');
const BX = 118; // 555 block
const BY = 52;
const BW = 100;
const BH = 130;
const PIN = { dis: 80, thr: 114, trig: 148, out: 100, vcc: 140, rst: 196, gnd: 168 };
const RAIL = 22; // VCC rail
const GND = 200;

/** 555 block with pin numbers outside and pin names inside, plus VCC/RST/GND/OUT wiring. */
function chip() {
  const l = (x, y, s, anchor = 'middle') => text(x, y, s, { cls: 'lbl', anchor });
  return rect(BX, BY, BW, BH, 'comp', ' rx="3"') + text(BX + BW / 2 + 8, 140, '555', { cls: 'name' })
    + l(PIN.vcc, BY + 14, 'VCC') + l(PIN.rst, BY + 14, 'RST')
    + l(BX + 6, PIN.dis + 4, 'DIS', 'start') + l(BX + 6, PIN.thr + 4, 'THR', 'start') + l(BX + 6, PIN.trig + 4, 'TRIG', 'start')
    + l(BX + BW - 6, PIN.out + 4, 'OUT', 'end') + l(PIN.gnd, BY + BH - 6, 'GND')
    // pin numbers
    + l(PIN.vcc - 5, BY - 6, '8', 'end') + l(PIN.rst - 5, BY - 6, '4', 'end')
    + l(BX - 5, PIN.dis - 4, '7', 'end') + l(BX - 5, PIN.thr - 4, '6', 'end') + l(BX - 5, PIN.trig - 4, '2', 'end')
    + l(BX + BW + 5, PIN.out - 4, '3', 'start') + l(PIN.gnd + 5, BY + BH + 12, '1', 'start')
    // supply, reset, ground and output wiring
    + terminal(30, RAIL, 'VCC', 'top')
    + wire([33, RAIL], [PIN.rst, RAIL], [PIN.rst, BY]) + wire([PIN.vcc, RAIL], [PIN.vcc, BY]) + node(PIN.vcc, RAIL)
    + wire([PIN.gnd, BY + BH], [PIN.gnd, GND]) + ground(PIN.gnd, GND)
    + wire([BX + BW, PIN.out], [243, PIN.out]) + terminal(246, PIN.out);
}

/** Resistor/capacitor in the timing chain at x = 62, labels on the left. */
const part = (kind, y1, y2, name, value, extra) => twoTerm(kind, 62, y1, 62, y2, { name, value, flip: true })
  + (extra ? text(49, (y1 + y2) / 2 + 26, extra, { cls: 'lbl', anchor: 'end' }) : '');

/** Astable: R1 (VCC→DIS), R2 (DIS→THR/TRIG), C to GND; vC and OUT waveforms. */
function astableDiagram(v, r) {
  const design = v.mode === 'design';
  const a = design ? r?.check : r;
  const r1 = design ? r?.r1s : v.r1;
  const r2 = design ? r?.r2s : v.r2;
  const e24 = design ? 'E24' : '';
  let b = chip()
    + part('R', RAIL, PIN.dis, 'R1', val(r1, 'Ω'), e24) + node(62, RAIL)
    + node(62, PIN.dis) + wire([62, PIN.dis], [BX, PIN.dis])
    + part('R', PIN.dis, 140, 'R2', val(r2, 'Ω'), e24)
    + node(62, 140) + wire([62, 140], [96, 140]) + node(96, 140)
    + wire([BX, PIN.thr], [96, PIN.thr], [96, PIN.trig], [BX, PIN.trig])
    + part('C', 140, GND, 'C', val(v.c, 'F')) + ground(62, GND);

  // Waveforms: two periods, time scaled so one period = 62 units.
  const duty = a?.duty > 0.5 && a.duty < 1 ? a.duty : 0.6;
  const x0 = 290;
  const xs = 296;
  const P = 62;
  const tH = P * duty;
  const vY = (p) => 84 - p * 56; // vC plot: 0…VCC
  const vc = [];
  const out = [[xs, 150]];
  for (let k = 0; k < 2; k++) {
    const s0 = xs + k * P;
    for (let i = 0; i <= 12; i++) vc.push([s0 + (i / 12) * tH, vY(1 - (2 / 3) * 2 ** (-i / 12))]);
    for (let i = 1; i <= 12; i++) vc.push([s0 + tH + (i / 12) * (P - tH), vY((2 / 3) * 2 ** (-i / 12))]);
    out.push([s0, 118], [s0 + tH, 118], [s0 + tH, 150], [s0 + P, 150]);
  }
  b += axes(x0, 84, 140, 56) + path(`M${x0},${vY(2 / 3)}H430M${x0},${vY(1 / 3)}H430`, 'ext')
    + text(x0 - 4, 34, 'vC', { cls: 'name', anchor: 'end' })
    + text(x0 - 4, vY(2 / 3) + 4, '⅔ VCC', { cls: 'lbl', anchor: 'end' })
    + text(x0 - 4, vY(1 / 3) + 4, '⅓ VCC', { cls: 'lbl', anchor: 'end' })
    + wave(vc, 'wave2')
    + axes(x0, 150, 140, 40) + text(x0 - 4, 122, 'OUT', { cls: 'name', anchor: 'end' })
    + wave(out)
    + dimH(xs, xs + tH, 106, `tH = ${val(a?.tHigh, 's')}`, { cls: 'val', extFrom: 118 })
    + dimH(xs + tH, xs + P, 164, `tL = ${val(a?.tLow, 's')}`, { below: true, cls: 'val', extFrom: 150 })
    + text(362, 200, a ? `f = ${val(a.f, 'Hz')} · D = ${fixed(a.duty * 100, 1)} %` : '', { cls: 'val' });
  return svg(440, 218, b, t('tm_dgAstable'), { wide: true });
}

/** Monostable: R (VCC→DIS/THR), C to GND, trigger input; TRIG, vC and OUT waveforms. */
function monoDiagram(v, r) {
  let b = chip()
    + part('R', RAIL, 96, 'R', val(v.r, 'Ω')) + node(62, RAIL)
    + node(62, 96) + wire([62, 96], [96, 96]) + node(96, 96)
    + wire([BX, PIN.dis], [96, PIN.dis], [96, PIN.thr], [BX, PIN.thr])
    + part('C', 96, 150, 'C', val(v.c, 'F')) + wire([62, 150], [62, GND]) + ground(62, GND)
    + wire([BX, PIN.trig], [93, PIN.trig]) + terminal(90, PIN.trig, t('tm_dgTrig'), 'bottom', 'lbl');

  const x0 = 290;
  const xt = 300; // trigger edge
  const xe = 396; // end of the output pulse (not to scale)
  const vY = (p) => 116 - p * 46;
  const vc = [[292, vY(0)], [xt, vY(0)]];
  for (let i = 1; i <= 16; i++) vc.push([xt + (i / 16) * (xe - xt), vY(1 - 3 ** (-i / 16))]);
  vc.push([xe, vY(0)], [430, vY(0)]);
  b += axes(x0, 58, 140, 30) + text(x0 - 4, 40, 'TRIG', { cls: 'name', anchor: 'end' })
    + wave([[292, 34], [xt, 34], [xt, 58], [xt + 8, 58], [xt + 8, 34], [430, 34]])
    + path(`M${xt},58V166`, 'ext')
    + axes(x0, 116, 140, 46) + text(x0 - 4, 100, 'vC', { cls: 'name', anchor: 'end' })
    + path(`M${x0},${vY(2 / 3)}H430`, 'ext') + text(430, vY(2 / 3) - 4, '⅔ VCC', { cls: 'lbl', anchor: 'end' })
    + wave(vc, 'wave2')
    + axes(x0, 166, 140, 32) + text(x0 - 4, 150, 'OUT', { cls: 'name', anchor: 'end' })
    + wave([[292, 166], [xt, 166], [xt, 140], [xe, 140], [xe, 166], [430, 166]])
    + dimH(xt, xe, 180, `t = ${val(r?.t, 's')}`, { below: true, cls: 'val', extFrom: 166 });
  return svg(440, 218, b, t('tm_dgMono'), { wide: true });
}

const diagram = (v, u, r) => (v.mode === 'mono' ? monoDiagram(v, r) : astableDiagram(v, r));
const siF = (key, label, def, unit, show) => ({ key, type: 'number', label, default: def, si: true, units: [unit], show });

export default {
  diagram,
  id: 'timer555',
  strings,
  sections: [
    {
      title: 'sectionSetup',
      fields: [
        { key: 'mode', type: 'choice', label: 'tm_mode', default: 'astable',
          options: [{ value: 'astable', label: 'tm_astable' }, { value: 'design', label: 'tm_design' }, { value: 'mono', label: 'tm_mono' }] },
      ],
    },
    {
      title: 'sectionInputs',
      fields: [
        siF('r1', 'tm_r1', '10k', 'ohm', is('astable')),
        siF('r2', 'tm_r2', '47k', 'ohm', is('astable')),
        siF('r', 'tm_r', '100k', 'ohm', is('mono')),
        { key: 'f', type: 'number', label: 'tm_f', default: 1, units: ['kHz', 'Hz'], show: is('design') },
        { key: 'd', type: 'number', label: 'tm_duty', default: 60, units: ['pct'], info: 'tm_dutyInfo', show: is('design') },
        siF('c', 'tm_c', '10n', 'farad'),
      ],
    },
  ],

  compute(v, u) {
    if (v.mode === 'mono') return { mode: 'mono', ...monostable(v.r, v.c) };
    if (v.mode === 'design') {
      const f = v.f * (u.f === 'kHz' ? 1e3 : 1);
      const d = astableDesign(f, v.d / 100, v.c);
      if (!d.ok) return d;
      const r1s = nearestStandard(d.r1, 'E24').nearest;
      const r2s = nearestStandard(d.r2, 'E24').nearest;
      return { mode: 'design', ...d, r1s, r2s, check: astable(r1s, r2s, v.c) };
    }
    return { mode: 'astable', ...astable(v.r1, v.r2, v.c) };
  },

  render(r, v, u) {
    if (!r.ok) return invalid(r.errors);
    // Calculation steps. The engine uses ln 2 (0.693) exactly; it is shown rounded.
    // Design mode keeps six digits in the intermediate values because R1 is a difference.
    const q = (x, unit, sig = 4) => tx(si(x, unit, sig));
    const ln2 = fmt(Math.LN2, 6);
    const C = q(v.c, 'F', 6);
    const pc = (x) => tx(`${fmt(x * 100, 4)} %`);
    const opts = { note: 'tm_note', refs: ['TI NE555 datasheet'] };
    if (r.mode === 'mono') {
      return heroes([['tm_pulse', siHtml(r.t, 's')]])
        + steps([
          { label: 'tm_pulse', sym: `t = ${fmt(1.1)} \\cdot R \\cdot C`, num: `${fmt(1.1)} \\cdot ${q(v.r, 'Ω', 6)} \\cdot ${C}`, res: q(r.t, 's') },
        ], { ...opts, where: [['R', 'tm_r', 'r'], ['C', 'tm_c', 'c']] });
    }
    const a = r.mode === 'design' ? r.check : r;
    const main = r.mode === 'design'
      ? heroes([['tm_r1', siHtml(r.r1, 'Ω')], ['tm_r2', siHtml(r.r2, 'Ω')]])
      : heroes([['tm_freq', siHtml(a.f, 'Hz')], ['tm_dutyOut', `${fixed(a.duty * 100, 1)} <span class="u">%</span>`]]);
    const T = r.target;
    const worked = r.mode === 'design'
      ? steps([
        { label: 'tm_period', sym: 'T = \\frac{1}{f}', num: `\\frac{1}{${q(v.f * (u.f === 'kHz' ? 1e3 : 1), 'Hz', 6)}}`, res: q(T.period, 's', 6) },
        { label: 'tm_tl', sym: 't_L = T \\cdot (1 − D)', num: `${q(T.period, 's', 6)} \\cdot (1 − ${fmt(v.d / 100, 6)})`, res: q(T.tLow, 's', 6) },
        { label: 'tm_th', sym: 't_H = T \\cdot D', num: `${q(T.period, 's', 6)} \\cdot ${fmt(v.d / 100, 6)}`, res: q(T.tHigh, 's', 6) },
        { label: 'tm_r2', sym: 'R_2 = \\frac{t_L}{\\ln\\,2 \\cdot C}', num: `\\frac{${q(T.tLow, 's', 6)}}{${ln2} \\cdot ${C}}`, res: q(r.r2, 'Ω', 6) },
        { label: 'tm_r1', sym: 'R_1 = \\frac{t_H}{\\ln\\,2 \\cdot C} − R_2', num: `\\frac{${q(T.tHigh, 's', 6)}}{${ln2} \\cdot ${C}} − ${q(r.r2, 'Ω', 6)}`, res: q(r.r1, 'Ω') },
        { label: 'tm_freq', sym: 'f = \\frac{1}{\\ln\\,2 \\cdot (R_{1,E24} + 2 \\cdot R_{2,E24}) \\cdot C}',
          num: `\\frac{1}{${ln2} \\cdot (${q(r.r1s, 'Ω')} + 2 \\cdot ${q(r.r2s, 'Ω')}) \\cdot ${C}}`, res: q(a.f, 'Hz') },
        { label: 'tm_dutyOut', sym: 'D = \\frac{R_{1,E24} + R_{2,E24}}{R_{1,E24} + 2 \\cdot R_{2,E24}}',
          num: `\\frac{${q(r.r1s, 'Ω')} + ${q(r.r2s, 'Ω')}}{${q(r.r1s, 'Ω')} + 2 \\cdot ${q(r.r2s, 'Ω')}}`, res: pc(a.duty) },
      ], { ...opts, where: [['f', 'tm_f', 'f'], ['D', 'tm_duty', 'd'], ['C', 'tm_c', 'c'], ['R_{1,E24}', 'tm_r1std'], ['R_{2,E24}', 'tm_r2std']] })
      : steps([
        { label: 'tm_th', sym: 't_H = \\ln\\,2 \\cdot (R_1 + R_2) \\cdot C', num: `${ln2} \\cdot (${q(v.r1, 'Ω', 6)} + ${q(v.r2, 'Ω', 6)}) \\cdot ${C}`, res: q(a.tHigh, 's') },
        { label: 'tm_tl', sym: 't_L = \\ln\\,2 \\cdot R_2 \\cdot C', num: `${ln2} \\cdot ${q(v.r2, 'Ω', 6)} \\cdot ${C}`, res: q(a.tLow, 's') },
        { label: 'tm_period', sym: 'T = t_H + t_L', num: `${q(a.tHigh, 's')} + ${q(a.tLow, 's')}`, res: q(a.period, 's') },
        { label: 'tm_freq', sym: 'f = \\frac{1}{T}', num: `\\frac{1}{${q(a.period, 's')}}`, res: q(a.f, 'Hz') },
        { label: 'tm_dutyOut', sym: 'D = \\frac{t_H}{T}', num: `\\frac{${q(a.tHigh, 's')}}{${q(a.period, 's')}}`, res: pc(a.duty) },
      ], { ...opts, where: [['R_1', 'tm_r1', 'r1'], ['R_2', 'tm_r2', 'r2'], ['C', 'tm_c', 'c']] });
    return main
      + worked
      + block('results', rows([
        r.mode === 'design' && ['tm_r1std', si(r.r1s, 'Ω')],
        r.mode === 'design' && ['tm_r2std', si(r.r2s, 'Ω')],
        r.mode === 'design' && ['tm_freq', si(a.f, 'Hz')],
        r.mode === 'design' && ['tm_dutyOut', `${fixed(a.duty * 100, 1)} %`],
        ['tm_th', si(a.tHigh, 's')],
        ['tm_tl', si(a.tLow, 's')],
        ['tm_period', si(a.period, 's')],
      ]));
  },
};
