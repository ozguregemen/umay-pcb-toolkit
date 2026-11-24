import { attenuatorValues, analyseAttenuator } from '../engine/attenuator.js';
import { nearestStandard } from '../engine/eseries.js';
import { heroes, rows, block, formulaBlock, messages } from '../ui/calculator.js';
import { fmt, fixed, si, esc } from '../ui/format.js';
import { t } from '../i18n.js';
import { svg, twoTerm, wire, node, ground, terminal, text, path, arrow } from '../ui/svg.js';

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
    at_dgAria: '{top} zayıflatıcı, Z₀ kaynak ile Z₀ yük arasında',
    at_dgSource: 'kaynak',
    at_dgLoad: 'yük',
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
    at_dgAria: '{top} attenuator between a Z₀ source and a Z₀ load',
    at_dgSource: 'source',
    at_dgLoad: 'load',
  },
};

/**
 * Live schematic: the chosen network between a Z₀ source and a Z₀ load, each
 * resistor with the value in use (standard or exact), plus Zin and the
 * actual attenuation.
 */
function diagram(v, u, r) {
  const res = (k) => {
    const x = r ? r.std[k] : NaN;
    return Number.isFinite(x) && x > 0 ? si(x, 'Ω', 3) : '?';
  };
  const z0 = Number.isFinite(v.z0) && v.z0 > 0 ? si(v.z0, 'Ω', 3) : '?';
  const bt = v.top === 'bt';
  const yR = bt ? 72 : 52; // signal rail
  const yG = 150; // ground rail
  const pIn = 125;
  const pOut = 335;
  const xL = 385;
  let b = twoTerm('AC', 34, yR, 34, yG)
    + twoTerm('R', 34, yR, pIn, yR, { name: 'Z₀', value: z0 })
    + wire([pOut, yR], [xL, yR])
    + twoTerm('R', xL, yR, xL, yG, { name: 'Z₀', value: z0 })
    + wire([34, yG], [xL, yG]) + ground(80, yG) + node(80, yG)
    + text(34, 175, t('at_dgSource')) + text(xL, 175, t('at_dgLoad'));
  if (v.top === 'pi') {
    b += wire([pIn, yR], [150, yR]) + wire([310, yR], [pOut, yR])
      + twoTerm('R', 150, yR, 150, yG, { name: 'R1', value: res('r1') })
      + twoTerm('R', 150, yR, 310, yR, { name: 'R2', value: res('r2') })
      + twoTerm('R', 310, yR, 310, yG, { name: 'R1', value: res('r1'), flip: true })
      + node(150, yR) + node(310, yR) + node(150, yG) + node(310, yG);
  } else if (v.top === 't') {
    b += twoTerm('R', pIn, yR, 230, yR, { name: 'R1', value: res('r1') })
      + twoTerm('R', 230, yR, pOut, yR, { name: 'R1', value: res('r1') })
      + twoTerm('R', 230, yR, 230, yG, { name: 'R2', value: res('r2') })
      + node(230, yR) + node(230, yG);
  } else {
    b += wire([pIn, yR], [pIn, 34]) + wire([pOut, 34], [pOut, yR])
      + twoTerm('R', pIn, 34, pOut, 34, { name: 'R1', value: res('r1') })
      + twoTerm('R', pIn, yR, 230, yR, { name: 'R3', value: res('r3') })
      + twoTerm('R', 230, yR, pOut, yR, { name: 'R3', value: res('r3') })
      + twoTerm('R', 230, yR, 230, yG, { name: 'R2', value: res('r2') })
      + node(230, yR) + node(230, yG);
  }
  // Ports (drawn last so the open circles sit on top of the wires).
  b += terminal(pIn, yR, '') + terminal(pOut, yR, '');
  // Zin looking into the input port.
  b += text(pIn, 16, `Zin = ${r ? `${fmt(r.zin, 4)} Ω` : '?'}`, { cls: 'val' })
    + arrow(pIn, 25, pIn + 30, 25, { cls: 'flow', headCls: 'arrow flow' })
    + path(`M${pIn},27V${(bt ? 34 : yR) - 4}`, 'ext');
  // Attenuation from input port to output port.
  b += path(`M${pIn},${yG + 8}V186M${pOut},${yG + 8}V186`, 'ext')
    + arrow(pIn, 181, pOut, 181, { cls: 'flow', headCls: 'arrow flow' })
    + text(230, 176, `${t('at_db')} = ${r ? `${fixed(r.insertionLossDb, 2)} dB` : '?'}`, { cls: 'val' });
  const top = { pi: 'at_pi', t: 'at_t', bt: 'at_bt' }[v.top] ?? 'at_pi';
  return svg(440, 196, b, t('at_dgAria', { top: t(top) }), { wide: true });
}

const LABELS = {
  pi: { r1: 'at_r1pi', r2: 'at_r2pi' },
  t: { r1: 'at_r1t', r2: 'at_r2t' },
  bt: { r1: 'at_r1bt', r2: 'at_r2bt', r3: 'at_r3bt' },
};

export default {
  diagram,
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
