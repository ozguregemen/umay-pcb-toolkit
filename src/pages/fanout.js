import { fanout } from '../engine/fanout.js';
import { toMm, fromMm } from '../engine/units.js';
import { heroes, rows, block, formulaBlock, messages, invalid, checks } from '../ui/calculator.js';
import { fixed, esc } from '../ui/format.js';
import { t } from '../i18n.js';
import { isImperial } from '../prefs.js';

const strings = {
  tr: {
    fo_pitch: 'Pad adımı (pitch)',
    fo_pad: 'Pad çapı / genişliği',
    fo_padInfo: 'BGA için genellikle bilye çapının %75–80’i kadar pad kullanılır (NSMD). Veri sayfasındaki önerilen pad boyutuna bakın.',
    fo_trace: 'İz genişliği',
    fo_space: 'İz–iz ve iz–pad aralığı',
    fo_via: 'Via pad çapı (dog-bone)',
    fo_traces: 'Padler arasından geçen iz',
    fo_diag: 'Çaprazdan geçen iz',
    fo_gap: 'Padler arası boşluk',
    fo_diagGap: 'Çapraz boşluk (4 bilye arası)',
    fo_maxTrace: 'Tek iz için en geniş genişlik',
    fo_diagMax: 'Çaprazda tek iz için en geniş',
    fo_maxVia: 'Dört bilye arasına sığan en büyük via padi',
    fo_checks: 'Kontroller',
    fo_viaOk: 'Via padi dört bilye arasına sığıyor',
    fo_note: 'n iz, n·w + (n+1)·s ≤ boşluk koşuluyla sığar. Çapraz kanal dört bilyenin ortasından geçer ve adımın √2 katıdır; dog-bone fanout’ta via buraya yerleşir. Daha fazla iz gerekiyorsa daha ince iz/aralık (üretici kabiliyeti), pad içi via veya ek katman gerekir.',
    err_pitch: 'Adım sıfırdan büyük olmalı.',
    err_pad: 'Pad sıfırdan büyük olmalı.',
    err_trace: 'İz genişliği sıfırdan büyük olmalı.',
    err_space: 'Aralık sıfırdan büyük olmalı.',
    err_padPitch: 'Pad, adımdan küçük olmalı.',
    warn_noTrace: 'Bu kurallarla padler arasından iz geçmiyor; çapraz kanalı, pad içi viayı veya daha ince kuralları değerlendirin.',
  },
  en: {
    fo_pitch: 'Pad pitch',
    fo_pad: 'Pad diameter / width',
    fo_padInfo: 'For BGAs the pad is usually 75–80 % of the ball diameter (NSMD). Check the recommended land size in the datasheet.',
    fo_trace: 'Trace width',
    fo_space: 'Trace–trace and trace–pad spacing',
    fo_via: 'Via pad diameter (dog-bone)',
    fo_traces: 'Traces between pads',
    fo_diag: 'Traces on the diagonal',
    fo_gap: 'Gap between pads',
    fo_diagGap: 'Diagonal gap (between 4 balls)',
    fo_maxTrace: 'Widest single trace',
    fo_diagMax: 'Widest single trace on the diagonal',
    fo_maxVia: 'Largest via pad between four balls',
    fo_checks: 'Checks',
    fo_viaOk: 'Via pad fits between four balls',
    fo_note: 'n traces fit when n·w + (n+1)·s ≤ gap. The diagonal channel runs through the centre of four balls and is √2 times the pitch; in dog-bone fanout the via sits there. If you need more traces, use finer trace/space (fabricator capability), via-in-pad or another layer.',
    err_pitch: 'Pitch must be greater than zero.',
    err_pad: 'Pad must be greater than zero.',
    err_trace: 'Trace width must be greater than zero.',
    err_space: 'Spacing must be greater than zero.',
    err_padPitch: 'The pad must be smaller than the pitch.',
    warn_noTrace: 'No trace fits between pads with these rules; consider the diagonal channel, via-in-pad or finer rules.',
  },
};

const LEN = ['mm', 'mil'];
const L = (mm) => (isImperial() ? `${fixed(fromMm(mm, 'mil'), 2)} mil` : `${fixed(mm, 3)} mm`);

export default {
  id: 'fanout',
  strings,
  sections: [
    {
      title: 'sectionInputs',
      fields: [
        { key: 'p', type: 'number', label: 'fo_pitch', default: 0.8, units: LEN, pref: 'length',
          presets: [0.4, 0.5, 0.65, 0.8, 1.0, 1.27].map((x) => ({ label: `${x} mm`, value: x, unit: 'mm' })) },
        { key: 'd', type: 'number', label: 'fo_pad', default: 0.4, units: LEN, pref: 'length', info: 'fo_padInfo' },
        { key: 'w', type: 'number', label: 'fo_trace', default: 0.1, units: LEN, pref: 'length' },
        { key: 's', type: 'number', label: 'fo_space', default: 0.1, units: LEN, pref: 'length' },
        { key: 'v', type: 'number', label: 'fo_via', default: 0.45, units: LEN, pref: 'length', optional: true },
      ],
    },
  ],

  compute(v, u) {
    const mm = (k) => (Number.isFinite(v[k]) ? toMm(v[k], u[k]) : NaN);
    return fanout({ pitchMm: mm('p'), padMm: mm('d'), traceMm: mm('w'), spaceMm: mm('s'), viaPadMm: mm('v') });
  },

  render(r) {
    if (!r.ok) return invalid(r.errors);
    return heroes([
      ['fo_traces', `${r.traces}`],
      ['fo_diag', `${r.diagTraces}`],
    ])
      + messages('warn', r.warnings)
      + block('results', rows([
        ['fo_gap', L(r.gap)],
        ['fo_maxTrace', r.maxTrace > 0 ? L(r.maxTrace) : '—'],
        ['fo_diagGap', L(r.diagGap)],
        ['fo_diagMax', r.diagMaxTrace > 0 ? L(r.diagMaxTrace) : '—'],
        ['fo_maxVia', r.maxViaPad > 0 ? L(r.maxViaPad) : '—'],
      ]))
      + (r.viaFits !== undefined ? block('fo_checks', checks([[r.viaFits, esc(t('fo_viaOk'))]])) : '')
      + formulaBlock([
        'gap = pitch − pad,   diagonal gap = pitch·√2 − pad',
        'n = floor((gap − s) / (w + s))',
        'w_max = gap − 2s,   via pad_max = pitch·√2 − pad − 2s',
      ], 'fo_note', ['IPC-7351 (BGA land patterns)']);
  },
};
