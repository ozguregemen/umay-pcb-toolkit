import { attenuatorValues, analyseAttenuator } from '../engine/attenuator.js';
import { nearestStandard } from '../engine/eseries.js';
import { heroes, rows, block, formulaBlock, messages } from '../ui/calculator.js';
import { fmt, fixed, si, esc } from '../ui/format.js';
import { t } from '../i18n.js';

const strings = {
  tr: {
    at_topology: 'Topoloji',
    at_pi: 'Pi (π)',
    at_t: 'T',
    at_bt: 'Köprülü T',
    at_db: 'Zayıflatma',
    at_z0: 'Sistem empedansı (Z₀)',
    at_series: 'Direnç serisi',
    at_exact: 'Tam değer',
    at_pin: 'Giriş gücü',
    at_pinInfo: 'Dirençlerdeki güç kaybını hesaplamak için. RF güç dönüştürücüsünden dBm ↔ W çevirebilirsiniz.',
    at_r1pi: 'R1 (paralel, giriş ve çıkış)',
    at_r2pi: 'R2 (seri)',
    at_r1t: 'R1 (seri, giriş ve çıkış)',
    at_r2t: 'R2 (paralel)',
    at_r1bt: 'R1 (köprü)',
    at_r2bt: 'R2 (paralel)',
    at_r3bt: 'R3 (seri kollar, ×2)',
    at_values: 'Direnç değerleri',
    at_exactV: 'Tam',
    at_stdV: 'Standart',
    at_il: 'Gerçek zayıflatma',
    at_rl: 'Giriş geri dönüş kaybı',
    at_zin: 'Giriş empedansı',
    at_power: 'Güç kaybı',
    at_pmax: 'En çok ısınan direnç',
    at_note: 'Kaynak ve yük aynı Z₀ empedansındadır. Standart değerler seçildiğinde gerçek zayıflatma ve eşleşme devre analiziyle yeniden hesaplanır. Yüksek frekansta direnç gövdesinin parazitikleri (özellikle 0603 ve üstü) sonucu bozar; GHz bölgesinde ince film ve küçük kılıf kullanın.',
    warn_powerHigh: 'Bir dirençteki güç kaybı 1/10 W’ı aşıyor; direnç gücünü kontrol edin.',
  },
  en: {
    at_topology: 'Topology',
    at_pi: 'Pi (π)',
    at_t: 'T',
    at_bt: 'Bridged T',
    at_db: 'Attenuation',
    at_z0: 'System impedance (Z₀)',
    at_series: 'Resistor series',
    at_exact: 'Exact value',
    at_pin: 'Input power',
    at_pinInfo: 'Used to compute resistor dissipation. Convert dBm ↔ W with the RF power converter.',
    at_r1pi: 'R1 (shunt, input and output)',
    at_r2pi: 'R2 (series)',
    at_r1t: 'R1 (series, input and output)',
    at_r2t: 'R2 (shunt)',
    at_r1bt: 'R1 (bridge)',
    at_r2bt: 'R2 (shunt)',
    at_r3bt: 'R3 (series arms, ×2)',
    at_values: 'Resistor values',
    at_exactV: 'Exact',
    at_stdV: 'Standard',
    at_il: 'Actual attenuation',
    at_rl: 'Input return loss',
    at_zin: 'Input impedance',
    at_power: 'Power dissipation',
    at_pmax: 'Hottest resistor',
    at_note: 'Source and load are both Z₀. When standard values are chosen, the actual attenuation and match are recomputed by circuit analysis. At high frequency the resistor body parasitics (especially 0603 and larger) degrade the result; use thin-film parts in small packages in the GHz range.',
    warn_powerHigh: 'A resistor dissipates more than 1/10 W; check its power rating.',
  },
};

const LABELS = {
  pi: { r1: 'at_r1pi', r2: 'at_r2pi' },
  t: { r1: 'at_r1t', r2: 'at_r2t' },
  bt: { r1: 'at_r1bt', r2: 'at_r2bt', r3: 'at_r3bt' },
};

export default {
  id: 'attenuator',
  strings,
  sections: [
    {
      title: 'sectionInputs',
      fields: [
        { key: 'top', type: 'choice', label: 'at_topology', default: 'pi',
          options: [{ value: 'pi', label: 'at_pi' }, { value: 't', label: 'at_t' }, { value: 'bt', label: 'at_bt' }] },
        { key: 'db', type: 'number', label: 'at_db', default: 10, units: ['dB'],
          presets: [3, 6, 10, 20].map((x) => ({ label: `${x} dB`, value: x })) },
        { key: 'z0', type: 'number', label: 'at_z0', default: 50, units: ['ohm'],
          presets: [50, 75, 100, 600].map((x) => ({ label: `${x} Ω`, value: x })) },
        { key: 'es', type: 'select', label: 'at_series', default: 'E96',
          options: [{ value: 'exact', label: 'at_exact' }, ...['E24', 'E96', 'E192'].map((x) => ({ value: x, label: x, raw: true }))] },
        { key: 'p', type: 'number', label: 'at_pin', default: 0, units: ['dBm'], valid: 'any', info: 'at_pinInfo' },
      ],
    },
  ],

  compute(v) {
    const exact = attenuatorValues(v.top, v.db, v.z0);
    const std = {};
    for (const [k, x] of Object.entries(exact)) {
      std[k] = v.es === 'exact' || k === 'r3' ? x : nearestStandard(x, v.es).nearest;
    }
    const a = analyseAttenuator(v.top === 'bt' ? 'bt' : v.top, std, v.z0);
    const pinW = 10 ** (v.p / 10) / 1000;
    const diss = Object.fromEntries(Object.entries(a.dissipationPerWatt).map(([k, x]) => [k, x * pinW]));
    const pmax = Math.max(...Object.values(diss));
    return { ok: true, exact, std, ...a, diss, pmax, pinW, warnings: pmax > 0.1 ? ['powerHigh'] : [] };
  },

  render(r, v) {
    const L = LABELS[v.top];
    const valueRows = Object.keys(r.exact).map((k) => [
      L[k], `${si(r.exact[k], 'Ω')}${v.es !== 'exact' && k !== 'r3' ? ` → <b>${si(r.std[k], 'Ω')}</b>` : ''}`,
    ]);
    return heroes([
      ['at_il', `${fixed(r.insertionLossDb, 2)} <span class="u">dB</span>`],
      ['at_rl', `${Number.isFinite(r.returnLossDb) ? fixed(r.returnLossDb, 1) : '∞'} <span class="u">dB</span>`],
    ])
      + messages('warn', r.warnings)
      + block('at_values', rows(valueRows))
      + block('results', rows([
        ['at_zin', `${fmt(r.zin, 5)} Ω`],
        ['at_pmax', `${si(r.pmax, 'W')} @ ${si(r.pinW, 'W')}`],
      ]))
      + formulaBlock([
        'K = 10^(A/20)',
        'Pi:  R1 = Z0·(K+1)/(K−1)     R2 = Z0·(K²−1)/(2K)',
        'T:   R1 = Z0·(K−1)/(K+1)     R2 = Z0·2K/(K²−1)',
        'Bridged-T:  R1 = Z0·(K−1)    R2 = Z0/(K−1)    R3 = Z0',
        'Return loss = −20·log10|(Zin − Z0)/(Zin + Z0)|',
      ], 'at_note', ['KiCad PCB Calculator — RF attenuators', 'Matched resistive attenuator design equations']);
  },
};
