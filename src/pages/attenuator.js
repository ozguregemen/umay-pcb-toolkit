import { attenuatorValues, analyseAttenuator } from '../engine/attenuator.js';
import { nearestStandard } from '../engine/eseries.js';
import { heroes, rows, block, steps, messages } from '../ui/calculator.js';
import { tx } from '../ui/math.js';
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
    at_k: 'Gerilim oranı K',
    at_rpPi: 'Çıkış paralel direnci ile yük (R1 ∥ Z₀)',
    at_rpT: 'Paralel direnç ile çıkış tarafı (R2 ∥ (R1 + Z₀))',
    at_stepStd: 'Seçilen serideki en yakın değerler; aşağıdaki çözümleme bu değerlerle yapılır.',
    at_stepIl: 'Logaritmanın içi, yük geriliminin doğrudan bağlantıda oluşacak gerilime oranıdır (art arda iki gerilim bölücü).',
    at_stepNodal: 'Va (giriş düğümü) ve Vb (çıkış düğümü, yük gerilimi), köprülü T’nin üç düğüm denkleminin Z₀ ardındaki VS = 2 V kaynak için çözülmesiyle bulunur; doğrudan bağlantı yükte 1 V verirdi.',
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
    at_k: 'Voltage ratio K',
    at_rpPi: 'Output shunt in parallel with the load (R1 ∥ Z₀)',
    at_rpT: 'Shunt in parallel with the output side (R2 ∥ (R1 + Z₀))',
    at_stepStd: 'Nearest values of the selected series; the analysis below uses them.',
    at_stepIl: 'The argument of the logarithm is the load voltage divided by the voltage a direct connection would give (two voltage dividers in a row).',
    at_stepNodal: 'V_a (input node) and V_b (output node, the load voltage) come from solving the three node equations of the bridged T for a source V_S = 2 V behind Z₀; a direct connection would put 1 V on the load.',
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

/**
 * Calculation steps: K, the exact resistors, the standard values chosen for
 * them, then the analysis of the network with those values as the engine does
 * it (voltage dividers for Pi and T, node equations for the bridged T).
 */
function worked(r, v) {
  const L = LABELS[v.top];
  const d = r.detail;
  const n = (x, sig = 5) => tx(fmt(x, sig));
  const ohm = (x, sig = 5) => tx(si(x, 'Ω', sig));
  const dB = (x) => tx(`${fmt(x, 4)} dB`);
  // Enough digits that K − 1 and Zin − Z0 keep their precision when worked by hand.
  const digits = (x, min) => Math.min(12, Math.max(min, Math.floor(-Math.log10(Math.max(Math.abs(x), 1e-12))) + min));
  const K = n(r.K, digits(r.K - 1, 7));
  // With exact resistors Zin = Z0 (they are shown rounded, so five digits are all a reader can reproduce).
  const zs = v.es !== 'exact' && Number.isFinite(r.returnLossDb) ? digits((r.zin - v.z0) / v.z0, 5) : 5;
  const z0 = ohm(v.z0, zs);
  const zin = ohm(r.zin, zs);
  const rp = v.top === 'bt' ? '' : ohm(d.rp, zs);
  const r1 = ohm(r.std.r1);
  const r2 = ohm(r.std.r2);
  const design = {
    pi: [
      { label: L.r1, sym: 'R_1 = Z_0 \\cdot \\frac{K + 1}{K − 1}', num: `${z0} \\cdot \\frac{${K} + 1}{${K} − 1}`, res: ohm(r.exact.r1) },
      { label: L.r2, sym: 'R_2 = Z_0 \\cdot \\frac{K^{2} − 1}{2 K}', num: `${z0} \\cdot \\frac{{${K}}^{2} − 1}{2 \\cdot ${K}}`, res: ohm(r.exact.r2) },
    ],
    t: [
      { label: L.r1, sym: 'R_1 = Z_0 \\cdot \\frac{K − 1}{K + 1}', num: `${z0} \\cdot \\frac{${K} − 1}{${K} + 1}`, res: ohm(r.exact.r1) },
      { label: L.r2, sym: 'R_2 = Z_0 \\cdot \\frac{2 K}{K^{2} − 1}', num: `${z0} \\cdot \\frac{2 \\cdot ${K}}{{${K}}^{2} − 1}`, res: ohm(r.exact.r2) },
    ],
    bt: [
      { label: L.r1, sym: 'R_1 = Z_0 \\cdot (K − 1)', num: `${z0} \\cdot (${K} − 1)`, res: ohm(r.exact.r1) },
      { label: L.r2, sym: 'R_2 = \\frac{Z_0}{K − 1}', num: `\\frac{${z0}}{${K} − 1}`, res: ohm(r.exact.r2) },
      { label: L.r3, sym: 'R_3 = Z_0', res: z0 },
    ],
  }[v.top];
  const volt = (x) => tx(`${fmt(x, zs + 1)} V`);
  const analysis = {
    pi: [
      { label: 'at_rpPi', sym: 'R_p = \\frac{R_1 \\cdot Z_0}{R_1 + Z_0}', num: `\\frac{${r1} \\cdot ${z0}}{${r1} + ${z0}}`, res: rp },
      { label: 'at_zin', sym: 'Z_{in} = \\frac{R_1 \\cdot (R_2 + R_p)}{R_1 + R_2 + R_p}', num: `\\frac{${r1} \\cdot (${r2} + ${rp})}{${r1} + ${r2} + ${rp}}`, res: zin },
      { label: 'at_il', sym: 'A = −20 \\cdot \\log_{10}(\\frac{2 Z_{in}}{Z_{in} + Z_0} \\cdot \\frac{R_p}{R_2 + R_p})',
        num: `−20 \\cdot \\log_{10}(\\frac{2 \\cdot ${zin}}{${zin} + ${z0}} \\cdot \\frac{${rp}}{${r2} + ${rp}})`, res: dB(r.insertionLossDb), note: 'at_stepIl' },
    ],
    t: [
      { label: 'at_rpT', sym: 'R_p = \\frac{R_2 \\cdot (R_1 + Z_0)}{R_2 + R_1 + Z_0}', num: `\\frac{${r2} \\cdot (${r1} + ${z0})}{${r2} + ${r1} + ${z0}}`, res: rp },
      { label: 'at_zin', sym: 'Z_{in} = R_1 + R_p', num: `${r1} + ${rp}`, res: zin },
      { label: 'at_il', sym: 'A = −20 \\cdot \\log_{10}(\\frac{2 R_p}{Z_{in} + Z_0} \\cdot \\frac{Z_0}{R_1 + Z_0})',
        num: `−20 \\cdot \\log_{10}(\\frac{2 \\cdot ${rp}}{${zin} + ${z0}} \\cdot \\frac{${z0}}{${r1} + ${z0}})`, res: dB(r.insertionLossDb), note: 'at_stepIl' },
    ],
    bt: [
      { label: 'at_zin', sym: 'Z_{in} = \\frac{V_a}{(V_S − V_a) / Z_0}', num: `\\frac{${volt(d.va)}}{(${volt(d.vs)} − ${volt(d.va)}) / ${z0}}`, res: zin, note: 'at_stepNodal' },
      { label: 'at_il', sym: 'A = −20 \\cdot \\log_{10}(\\frac{V_b}{V_S / 2})', num: `−20 \\cdot \\log_{10}(\\frac{${volt(d.vb)}}{${volt(d.vs)} / 2})`, res: dB(r.insertionLossDb) },
    ],
  }[v.top];
  // |Zin − Z0|: the larger value first, so the fraction is positive.
  const [hi, lo] = r.zin >= v.z0 ? [zin, z0] : [z0, zin];
  return steps([
    { label: 'at_k', sym: 'K = 10^{A / 20}', num: `10^{\\frac{${tx(`${fmt(v.db, 6)} dB`)}}{20}}`, res: K },
    ...design,
    v.es !== 'exact' && { labelRaw: `${t('at_stdV')} (${v.es})`, sym: `R_1 \\to ${r1}, \\quad R_2 \\to ${r2}`, note: 'at_stepStd' },
    ...analysis,
    Number.isFinite(r.returnLossDb)
      ? { label: 'at_rl', sym: 'RL = −20 \\cdot \\log_{10}|\\frac{Z_{in} − Z_0}{Z_{in} + Z_0}|', num: `−20 \\cdot \\log_{10}(\\frac{${hi} − ${lo}}{${zin} + ${z0}})`, res: dB(r.returnLossDb) }
      : { label: 'at_rl', sym: 'Z_{in} = Z_0 \\to RL \\to ∞' },
  ], { note: 'at_note', where: [['A', 'at_db', 'db'], ['Z_0', 'at_z0', 'z0']], refs: ['KiCad PCB Calculator — RF attenuators', 'Matched resistive attenuator design equations'] });
}

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
    const { K, ...exact } = attenuatorValues(v.top, v.db, v.z0);
    const std = {};
    for (const [k, x] of Object.entries(exact)) {
      std[k] = v.es === 'exact' || k === 'r3' ? x : nearestStandard(x, v.es).nearest;
    }
    const a = analyseAttenuator(v.top === 'bt' ? 'bt' : v.top, std, v.z0);
    const pinW = 10 ** (v.p / 10) / 1000;
    const diss = Object.fromEntries(Object.entries(a.dissipationPerWatt).map(([k, x]) => [k, x * pinW]));
    const pmax = Math.max(...Object.values(diss));
    return { ok: true, K, exact, std, ...a, diss, pmax, pinW, warnings: pmax > 0.1 ? ['powerHigh'] : [] };
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
      + worked(r, v)
      + block('at_values', rows(valueRows))
      + block('results', rows([
        ['at_zin', `${fmt(r.zin, 5)} Ω`],
        ['at_pmax', `${si(r.pmax, 'W')} @ ${si(r.pinW, 'W')}`],
      ]));
  },
};
