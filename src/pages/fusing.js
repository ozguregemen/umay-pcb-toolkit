import { calculateFusing } from '../engine/fusing.js';
import { toMm, thicknessToMil, MM_PER_MIL, tempToC, currentToA } from '../engine/units.js';
import { heroes, rows, block, formulaBlock, messages, invalid } from '../ui/calculator.js';
import { fmt, si, siHtml } from '../ui/format.js';

const strings = {
  tr: {
    fu_kind: 'İletken',
    fu_trace: 'İz',
    fu_via: 'Via',
    fu_mode: 'Hesap yönü',
    fu_modeCurrent: 'Süre → eritme akımı',
    fu_modeTime: 'Akım → eritme süresi',
    fu_w: 'İz genişliği',
    fu_t: 'Bakır kalınlığı',
    fu_drill: 'Delik çapı',
    fu_plating: 'Kaplama kalınlığı',
    fu_dur: 'Arıza süresi',
    fu_durInfo: 'Kısa devre akımının sigorta, eFuse veya koruma devresi açılana kadar akacağı süre.',
    fu_I: 'Arıza akımı',
    fu_onderdonk: 'Eritme akımı (Onderdonk)',
    fu_time: 'Eritme süresi (Onderdonk)',
    fu_preece: 'Sürekli eritme akımı (Preece)',
    fu_area: 'Kesit alanı',
    fu_diam: 'Eşdeğer tel çapı',
    fu_i2t: 'Erime I²t',
    fu_i2tInfo: 'Koruma elemanının açma I²t değeri bundan belirgin biçimde küçük olmalıdır.',
    fu_note: 'Onderdonk adyabatiktir (iletken ısıyı karta aktaramayacak kadar kısa sürede ısınır) ve yaklaşık 10 s’ye kadar geçerlidir. Preece, serbest havadaki yuvarlak tel için sürekli durum değeridir; kart üzerindeki iz daha iyi soğur. Bu değerler bakırın erimesine karşılık gelir: kart çok daha düşük sıcaklıkta (Tg, delaminasyon) hasar görür, dolayısıyla koruma seçiminde geniş pay bırakın.',
    err_area: 'Kesit alanı sıfırdan büyük olmalı.',
    warn_onderdonkLong: 'Onderdonk denklemi ~10 s’den uzun sürelerde ısı kaybını ihmal ettiği için gerçekçi değildir.',
  },
  en: {
    fu_kind: 'Conductor',
    fu_trace: 'Trace',
    fu_via: 'Via',
    fu_mode: 'Solve for',
    fu_modeCurrent: 'Duration → fusing current',
    fu_modeTime: 'Current → fusing time',
    fu_w: 'Trace width',
    fu_t: 'Copper thickness',
    fu_drill: 'Drill diameter',
    fu_plating: 'Plating thickness',
    fu_dur: 'Fault duration',
    fu_durInfo: 'How long the short-circuit current flows before the fuse, eFuse or protection circuit opens.',
    fu_I: 'Fault current',
    fu_onderdonk: 'Fusing current (Onderdonk)',
    fu_time: 'Time to fuse (Onderdonk)',
    fu_preece: 'Steady-state fusing current (Preece)',
    fu_area: 'Cross-section area',
    fu_diam: 'Equivalent wire diameter',
    fu_i2t: 'Melting I²t',
    fu_i2tInfo: 'The protection device’s clearing I²t should be well below this.',
    fu_note: 'Onderdonk is adiabatic (the conductor heats too fast to lose heat to the board) and is valid up to about 10 s. Preece is a steady-state value for a round wire in free air; a trace on a board cools better. These values correspond to the copper melting: the board is damaged at far lower temperatures (Tg, delamination), so leave a wide margin when choosing protection.',
    err_area: 'Cross-section area must be greater than zero.',
    warn_onderdonkLong: 'The Onderdonk equation ignores heat loss, so it is unrealistic beyond ~10 s.',
  },
};

const isVia = (v) => v.k === 'via';
const tMul = { ms: 1e-3, s: 1, us: 1e-6 };

export default {
  id: 'fusing',
  strings,
  sections: [
    {
      title: 'sectionSetup',
      fields: [
        { key: 'k', type: 'choice', label: 'fu_kind', default: 'trace',
          options: [{ value: 'trace', label: 'fu_trace' }, { value: 'via', label: 'fu_via' }] },
        { key: 'm', type: 'choice', label: 'fu_mode', default: 'current',
          options: [{ value: 'current', label: 'fu_modeCurrent' }, { value: 'time', label: 'fu_modeTime' }] },
      ],
    },
    {
      title: 'sectionInputs',
      fields: [
        { key: 'w', type: 'number', label: 'fu_w', default: 0.25, units: ['mm', 'mil'], pref: 'length', show: (v) => !isVia(v) },
        { key: 't', type: 'number', label: 'fu_t', default: 1, units: ['oz', 'um', 'mil'], show: (v) => !isVia(v),
          presets: [{ label: '½ oz', value: 0.5, unit: 'oz' }, { label: '1 oz', value: 1, unit: 'oz' }, { label: '2 oz', value: 2, unit: 'oz' }] },
        { key: 'd', type: 'number', label: 'fu_drill', default: 0.3, units: ['mm', 'mil'], pref: 'length', show: isVia },
        { key: 'p', type: 'number', label: 'fu_plating', default: 25, units: ['um', 'mil'], show: isVia },
        { key: 'dur', type: 'number', label: 'fu_dur', default: 10, units: ['ms', 's', 'us'], info: 'fu_durInfo', show: (v) => v.m === 'current',
          presets: [{ label: '1 ms', value: 1, unit: 'ms' }, { label: '10 ms', value: 10, unit: 'ms' }, { label: '100 ms', value: 100, unit: 'ms' }, { label: '1 s', value: 1, unit: 's' }] },
        { key: 'I', type: 'number', label: 'fu_I', default: 50, units: ['A', 'mA'], show: (v) => v.m === 'time' },
        { key: 'ta', type: 'number', label: 'ambientTemp', default: 25, units: ['C', 'F', 'K'], valid: 'any' },
      ],
    },
  ],

  compute(v, u) {
    let areaMm2;
    if (isVia(v)) {
      const rIn = toMm(v.d, u.d) / 2;
      const rOut = rIn + toMm(v.p, u.p);
      areaMm2 = Math.PI * (rOut * rOut - rIn * rIn);
    } else {
      areaMm2 = toMm(v.w, u.w) * thicknessToMil(v.t, u.t) * MM_PER_MIL;
    }
    return calculateFusing({
      areaMm2,
      seconds: v.m === 'current' ? v.dur * tMul[u.dur] : 0,
      currentA: v.m === 'time' ? currentToA(v.I, u.I) : 0,
      ambientC: tempToC(v.ta, u.ta),
    });
  },

  render(r, v) {
    if (!r.ok) return invalid(r.errors);
    const first = v.m === 'time'
      ? ['fu_time', siHtml(r.timeS, 's')]
      : ['fu_onderdonk', `${fmt(r.onderdonkA, 4)} <span class="u">A</span>`];
    return heroes([first, ['fu_preece', `${fmt(r.preeceA, 4)} <span class="u">A</span>`]])
      + messages('warn', r.warnings)
      + block('results', rows([
        ['fu_area', `${fmt(r.areaMm2, 4)} mm² · ${fmt(r.areaCmil, 4)} cmil`],
        ['fu_diam', `${fmt(r.equivDiameterMm, 4)} mm`],
        ['fu_i2t', `${si(r.i2t, 'A²s')}`],
      ]))
      + formulaBlock([
        'Onderdonk:  I = A · √( log10(1 + (Tm − Ta)/(234 + Ta)) / (33·t) )',
        '            A [cmil], t [s], Tm = 1083 °C',
        'Preece:     I = 10244 · d^1.5            d [in], equal-area round wire',
        'I²t = log10(1 + (Tm − Ta)/(234 + Ta)) · A² / 33',
      ], 'fu_note', ['I. M. Onderdonk (1928)', 'W. H. Preece (1884)', 'D. Brooks, “Fusing currents in traces”']);
  },
};
