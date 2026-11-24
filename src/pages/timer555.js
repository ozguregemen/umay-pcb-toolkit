import { astable, astableDesign, monostable } from '../engine/timer555.js';
import { nearestStandard } from '../engine/eseries.js';
import { heroes, rows, block, formulaBlock, invalid } from '../ui/calculator.js';
import { fixed, si, siHtml } from '../ui/format.js';

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
  },
};

const is = (m) => (v) => v.mode === m;
const siF = (key, label, def, unit, show) => ({ key, type: 'number', label, default: def, si: true, units: [unit], show });

export default {
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

  render(r) {
    if (!r.ok) return invalid(r.errors);
    if (r.mode === 'mono') {
      return heroes([['tm_pulse', siHtml(r.t, 's')]]) + formulaBlock(['t = 1.1 · R · C'], 'tm_note', ['TI NE555 datasheet']);
    }
    const a = r.mode === 'design' ? r.check : r;
    const main = r.mode === 'design'
      ? heroes([['tm_r1', siHtml(r.r1, 'Ω')], ['tm_r2', siHtml(r.r2, 'Ω')]])
      : heroes([['tm_freq', siHtml(a.f, 'Hz')], ['tm_dutyOut', `${fixed(a.duty * 100, 1)} <span class="u">%</span>`]]);
    return main
      + block('results', rows([
        r.mode === 'design' && ['tm_r1std', si(r.r1s, 'Ω')],
        r.mode === 'design' && ['tm_r2std', si(r.r2s, 'Ω')],
        r.mode === 'design' && ['tm_freq', si(a.f, 'Hz')],
        r.mode === 'design' && ['tm_dutyOut', `${fixed(a.duty * 100, 1)} %`],
        ['tm_th', si(a.tHigh, 's')],
        ['tm_tl', si(a.tLow, 's')],
        ['tm_period', si(a.period, 's')],
      ]))
      + formulaBlock([
        't_high = 0.693·(R1 + R2)·C     t_low = 0.693·R2·C',
        'f = 1.44 / ((R1 + 2·R2)·C)     D = (R1 + R2) / (R1 + 2·R2)',
      ], 'tm_note', ['TI NE555 datasheet']);
  },
};
