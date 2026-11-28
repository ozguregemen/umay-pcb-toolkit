import { ldoPower, junction } from '../engine/power.js';
import { heroes, rows, block, steps, checks, invalid } from '../ui/calculator.js';
import { tx } from '../ui/math.js';
import { fmt, fixed, si, esc } from '../ui/format.js';
import { t } from '../i18n.js';
import { svg, twoTerm, wire, node, ground, text, arrow } from '../ui/svg.js';

const strings = {
  tr: {
    th_psrc: 'Güç kaybı',
    th_direct: 'Doğrudan gir',
    th_ldo: 'Lineer regülatör',
    th_P: 'Güç kaybı (P)',
    th_vin: 'Giriş gerilimi',
    th_vout: 'Çıkış gerilimi',
    th_iout: 'Yük akımı',
    th_iq: 'Sükûnet akımı (Iq)',
    th_path: 'Isıl yol',
    th_ja: 'θJA (kart üzerinde)',
    th_chain: 'θJC + θCS + θSA (soğutucu)',
    th_thetaJA: 'θJA',
    th_thetaJAInfo: 'Veri sayfasındaki θJA, JEDEC test kartına göredir (genellikle 4 katman, belirli bakır alanı). Kendi kartınızda bakır alanı ve hava akışına göre önemli ölçüde farklı olabilir.',
    th_thetaJC: 'θJC (bağlantı–kılıf)',
    th_thetaCS: 'θCS (kılıf–soğutucu, arayüz)',
    th_thetaCSInfo: 'Termal macun/ped: tipik 0,1–1 °C/W, kılıf boyutuna bağlı.',
    th_thetaSA: 'θSA (soğutucu–ortam)',
    th_Ta: 'Ortam sıcaklığı',
    th_TjMax: 'İzin verilen en yüksek Tj',
    th_TjMaxInfo: 'Mutlak maksimum değil, güvenilirlik için tasarım sınırı kullanın (ör. 150 °C sınırlı bir parça için 125 °C).',
    th_tj: 'Bağlantı sıcaklığı Tj',
    th_power: 'Güç kaybı',
    th_margin: 'Sıcaklık payı',
    th_thetaTotal: 'Toplam ısıl direnç',
    th_maxP: 'Bu ortamda en yüksek güç',
    th_maxTa: 'Bu güçte en yüksek ortam',
    th_reqSA: 'Tj,max için gereken θSA',
    th_reqSAnone: 'Soğutucuyla bile sağlanamaz',
    th_eff: 'Regülatör verimi',
    th_checks: 'Kontroller',
    th_ok: 'Tj ≤ Tj,max',
    th_vinErr: 'Giriş gerilimi çıkıştan büyük olmalı.',
    err_ldoDropout: 'Giriş gerilimi çıkış geriliminden büyük olmalı.',
    th_note: 'Tek boyutlu ısıl direnç zinciri: Tj = Ta + P·Σθ. θJA kartın bakır alanına ve hava akışına çok bağlıdır; kritik tasarımlarda termal ölçüm veya simülasyonla doğrulayın.',
    th_dgAria: 'Isıl direnç zinciri: bağlantıdan ortama düğüm sıcaklıkları ve güç akışı',
    th_dgJ: 'bağlantı',
    th_dgC: 'kılıf',
    th_dgS: 'soğutucu',
    th_dgA: 'ortam',
    th_dgFlow: 'ısı akışı',
    th_dgAnalogy: 'Elektrik benzetmesi: °C ↔ V · W ↔ A · °C/W ↔ Ω',
  },
  en: {
    th_psrc: 'Power dissipation',
    th_direct: 'Enter directly',
    th_ldo: 'Linear regulator',
    th_P: 'Power dissipation (P)',
    th_vin: 'Input voltage',
    th_vout: 'Output voltage',
    th_iout: 'Load current',
    th_iq: 'Quiescent current (Iq)',
    th_path: 'Thermal path',
    th_ja: 'θJA (on the board)',
    th_chain: 'θJC + θCS + θSA (heatsink)',
    th_thetaJA: 'θJA',
    th_thetaJAInfo: 'Datasheet θJA refers to the JEDEC test board (usually 4 layers, defined copper area). On your board it can differ a lot with copper area and airflow.',
    th_thetaJC: 'θJC (junction–case)',
    th_thetaCS: 'θCS (case–sink, interface)',
    th_thetaCSInfo: 'Thermal grease/pad: typically 0.1–1 °C/W depending on case size.',
    th_thetaSA: 'θSA (sink–ambient)',
    th_Ta: 'Ambient temperature',
    th_TjMax: 'Maximum allowed Tj',
    th_TjMaxInfo: 'Use a reliability design limit, not the absolute maximum (e.g. 125 °C for a part rated 150 °C).',
    th_tj: 'Junction temperature Tj',
    th_power: 'Power dissipation',
    th_margin: 'Temperature margin',
    th_thetaTotal: 'Total thermal resistance',
    th_maxP: 'Maximum power at this ambient',
    th_maxTa: 'Maximum ambient at this power',
    th_reqSA: 'θSA needed for Tj,max',
    th_reqSAnone: 'Not achievable even with a heatsink',
    th_eff: 'Regulator efficiency',
    th_checks: 'Checks',
    th_ok: 'Tj ≤ Tj,max',
    th_vinErr: 'Input voltage must exceed the output.',
    err_ldoDropout: 'Input voltage must be greater than the output voltage.',
    th_note: 'One-dimensional thermal-resistance chain: Tj = Ta + P·Σθ. θJA depends strongly on board copper area and airflow; verify critical designs by thermal measurement or simulation.',
    th_dgAria: 'Thermal resistance chain: node temperatures from junction to ambient with the power flow',
    th_dgJ: 'junction',
    th_dgC: 'case',
    th_dgS: 'sink',
    th_dgA: 'ambient',
    th_dgFlow: 'heat flow',
    th_dgAnalogy: 'Electrical analogy: °C ↔ V · W ↔ A · °C/W ↔ Ω',
  },
};

/**
 * Live thermal circuit drawn as its electrical analogue: the dissipated power
 * P is a current source pushing heat through the θ resistors to the ambient,
 * which acts like a fixed voltage. Each node shows its temperature.
 */
function diagram(v, u, r) {
  const chain = isChain(v);
  const P = r ? r.powerW : (isLdo(v) ? NaN : v.P);
  const yT = 56;
  const yG = 150;
  const xs = chain ? [80, 170, 260, 350] : [80, 350];
  const th = chain ? [['θJC', v.jc], ['θCS', v.cs], ['θSA', v.sa]] : [['θJA', v.ja]];
  const keys = chain ? ['Tj', 'Tc', 'Ts', 'Ta'] : ['Tj', 'Ta'];
  const desc = chain ? ['th_dgJ', 'th_dgC', 'th_dgS', 'th_dgA'] : ['th_dgJ', 'th_dgA'];
  // Node temperatures from the junction down: each θ drops P·θ.
  const temps = [];
  if (r) {
    let T = r.tj;
    temps.push(T);
    for (const [, x] of th) { T -= P * (x || 0); temps.push(T); }
  }
  const deg = (x) => (Number.isFinite(x) ? `${fixed(x, 1)} °C` : '?');
  let b = twoTerm('I', 36, yG, 36, yT) + text(55, 101, 'P', { cls: 'name', anchor: 'start' })
    + wire([36, yT], [xs[0], yT]) + wire([xs[xs.length - 1], yT], [404, yT])
    + twoTerm('V', 404, yT, 404, yG, { name: 'Ta', flip: true })
    + wire([36, yG], [404, yG]) + ground(220, yG) + node(220, yG);
  th.forEach(([name, x], i) => {
    const xa = xs[i];
    const xb = xs[i + 1];
    b += twoTerm('R', xa, yT, xb, yT)
      + text((xa + xb) / 2, 79, name, { cls: 'name' })
      + text((xa + xb) / 2, 93, Number.isFinite(x) ? `${fmt(x, 3)} °C/W` : '?', { cls: 'val' });
  });
  xs.forEach((x, i) => {
    const over = i === 0 && r && r.margin < 0;
    b += node(x, yT) + text(x, 26, `${keys[i]} · ${t(desc[i])}`)
      + text(x, 42, deg(i === xs.length - 1 ? v.ta : temps[i]), { cls: over ? 'badt' : 'val' });
  });
  // Heat flows like a current from the junction to the ambient.
  b += arrow(96, 110, 334, 110, { cls: 'flow', headCls: 'arrow flow' })
    + text(209, 126, t('th_dgFlow'), { anchor: 'end' })
    + text(215, 126, `P = ${Number.isFinite(P) ? `${fmt(P, 3)} W` : '?'}`, { cls: 'val', anchor: 'start' })
    + text(220, 188, t('th_dgAnalogy'), { cls: 'title' });
  return svg(440, 198, b, t('th_dgAria'), { wide: true });
}

const isLdo = (v) => v.ps === 'ldo';
const isChain = (v) => v.path === 'chain';
const KW = ['KW'];

export default {
  diagram,
  id: 'thermal',
  strings,
  // Parameter plot (ui/sweep.js): results that can be drawn against one input.
  plot: {
    y: [
      { key: 'tj', label: 'th_tj', unit: '°C', get: (r) => r.tj },
      { key: 'margin', label: 'th_margin', unit: '°C', get: (r) => r.margin },
      { key: 'pmax', label: 'th_maxP', unit: 'W', get: (r) => r.maxPower },
      { key: 'p', label: 'th_power', unit: 'W', get: (r) => r.powerW },
    ],
  },
  sections: [
    {
      title: 'th_psrc',
      fields: [
        { key: 'ps', type: 'choice', label: 'th_psrc', default: 'direct',
          options: [{ value: 'direct', label: 'th_direct' }, { value: 'ldo', label: 'th_ldo' }] },
        { key: 'P', type: 'number', label: 'th_P', default: 1.5, units: ['W'], show: (v) => !isLdo(v) },
        { key: 'vin', type: 'number', label: 'th_vin', default: 5, units: ['V'], show: isLdo },
        { key: 'vout', type: 'number', label: 'th_vout', default: 3.3, units: ['V'], show: isLdo },
        { key: 'io', type: 'number', label: 'th_iout', default: 0.5, units: ['A'], show: isLdo },
        { key: 'iq', type: 'number', label: 'th_iq', default: 0, units: ['mA'], valid: 'nonneg', show: isLdo },
      ],
    },
    {
      title: 'th_path',
      fields: [
        { key: 'path', type: 'choice', label: 'th_path', default: 'ja',
          options: [{ value: 'ja', label: 'th_ja' }, { value: 'chain', label: 'th_chain' }] },
        { key: 'ja', type: 'number', label: 'th_thetaJA', default: 50, units: KW, info: 'th_thetaJAInfo', show: (v) => !isChain(v) },
        { key: 'jc', type: 'number', label: 'th_thetaJC', default: 3, units: KW, show: isChain },
        { key: 'cs', type: 'number', label: 'th_thetaCS', default: 0.5, units: KW, valid: 'nonneg', info: 'th_thetaCSInfo', show: isChain },
        { key: 'sa', type: 'number', label: 'th_thetaSA', default: 10, units: KW, show: isChain },
        { key: 'ta', type: 'number', label: 'th_Ta', default: 40, units: ['C'], valid: 'any',
          presets: [25, 40, 55, 70, 85].map((x) => ({ label: `${x} °C`, value: x })) },
        { key: 'tj', type: 'number', label: 'th_TjMax', default: 125, units: ['C'], valid: 'any', info: 'th_TjMaxInfo',
          presets: [105, 125, 150].map((x) => ({ label: `${x} °C`, value: x })) },
      ],
    },
  ],

  compute(v) {
    let powerW = v.P;
    let eff = null;
    if (isLdo(v)) {
      if (!(v.vin > v.vout)) return { ok: false, errors: ['ldoDropout'] };
      powerW = ldoPower({ vin: v.vin, vout: v.vout, iout: v.io, iq: (v.iq || 0) / 1000 });
      eff = (v.vout * v.io) / (v.vin * (v.io + (v.iq || 0) / 1000));
    }
    const r = junction({
      powerW, ambientC: v.ta, tjMaxC: v.tj,
      thetaJA: isChain(v) ? NaN : v.ja,
      thetaJC: isChain(v) ? v.jc : NaN, thetaCS: v.cs, thetaSA: isChain(v) ? v.sa : NaN,
    });
    return { ok: true, ...r, powerW, eff, chain: isChain(v) };
  },

  render(r, v) {
    if (!r.ok) return invalid(r.errors);
    const main = heroes([
      ['th_tj', `${fixed(r.tj, 1)} <span class="u">°C</span>`],
      ['th_power', `${fmt(r.powerW, 4)} <span class="u">W</span>`],
    ]);
    const C = (x) => tx(`${fixed(x, 1)} °C`);
    const W = (x) => tx(`${fmt(x, 4)} W`);
    const K = (x) => tx(`${fmt(x, 4)} °C/W`);
    const cs = Number.isFinite(v.cs) ? v.cs : 0;
    const iq = (v.iq || 0) / 1000;
    return main
      + block('th_checks', checks([[r.margin >= 0, esc(t('th_ok')), `${fixed(r.margin, 1)} °C`]]))
      + steps([
        r.eff !== null && { label: 'th_power', sym: 'P = (V_{in} − V_{out}) \\cdot I_{out} + V_{in} \\cdot I_q',
          num: `(${tx(si(v.vin, 'V'))} − ${tx(si(v.vout, 'V'))}) \\cdot ${tx(si(v.io, 'A'))} + ${tx(si(v.vin, 'V'))} \\cdot ${tx(si(iq, 'A'))}`, res: W(r.powerW) },
        r.chain && { label: 'th_thetaTotal', sym: 'θ_{JA} = θ_{JC} + θ_{CS} + θ_{SA}', num: `${K(v.jc)} + ${K(cs)} + ${K(v.sa)}`, res: K(r.thetaTotal) },
        { label: 'th_tj', sym: 'T_j = T_a + P \\cdot θ_{JA}', num: `${C(v.ta)} + ${W(r.powerW)} \\cdot ${K(r.thetaTotal)}`, res: C(r.tj) },
        Number.isFinite(r.maxPower) && { label: 'th_maxP', sym: 'P_{max} = \\frac{T_{j,max} − T_a}{θ_{JA}}', num: `\\frac{${C(v.tj)} − ${C(v.ta)}}{${K(r.thetaTotal)}}`, res: W(r.maxPower) },
        r.chain && r.requiredThetaSA > 0 && { label: 'th_reqSA', sym: 'θ_{SA,req} = \\frac{T_{j,max} − T_a}{P} − θ_{JC} − θ_{CS}',
          num: `\\frac{${C(v.tj)} − ${C(v.ta)}}{${W(r.powerW)}} − ${K(v.jc)} − ${K(cs)}`, res: K(r.requiredThetaSA) },
      ], { note: 'th_note', where: [['T_a', 'th_Ta', 'ta'], ['T_{j,max}', 'th_TjMax', 'tj'], r.eff === null && ['P', 'th_P', 'P'],
        !r.chain && ['θ_{JA}', 'th_thetaJA', 'ja'], r.chain && ['θ_{JC}', 'th_thetaJC', 'jc'], r.chain && ['θ_{CS}', 'th_thetaCS', 'cs'], r.chain && ['θ_{SA}', 'th_thetaSA', 'sa']], refs: ['JEDEC JESD51', 'TI SPRA953 “Semiconductor and IC package thermal metrics”'] })
      + block('results', rows([
        ['th_thetaTotal', `${fmt(r.thetaTotal, 4)} °C/W`],
        ['th_margin', `${fixed(r.margin, 1)} °C`],
        ['th_maxP', `${fmt(r.maxPower, 4)} W`],
        ['th_maxTa', `${fixed(r.maxAmbient, 1)} °C`],
        r.chain && ['th_reqSA', r.requiredThetaSA > 0 ? `${fmt(r.requiredThetaSA, 3)} °C/W` : esc(t('th_reqSAnone'))],
        r.eff !== null && ['th_eff', `${fixed(r.eff * 100, 1)} %`],
      ]));
  },
};
