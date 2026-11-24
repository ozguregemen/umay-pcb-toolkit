import { ldoPower, junction } from '../engine/power.js';
import { heroes, rows, block, formulaBlock, checks, invalid } from '../ui/calculator.js';
import { fmt, fixed, si, esc } from '../ui/format.js';
import { t } from '../i18n.js';

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
  },
};

const isLdo = (v) => v.ps === 'ldo';
const isChain = (v) => v.path === 'chain';
const KW = ['KW'];

export default {
  id: 'thermal',
  strings,
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

  render(r) {
    if (!r.ok) return invalid(r.errors);
    const main = heroes([
      ['th_tj', `${fixed(r.tj, 1)} <span class="u">°C</span>`],
      ['th_power', `${fmt(r.powerW, 4)} <span class="u">W</span>`],
    ]);
    return main
      + block('th_checks', checks([[r.margin >= 0, esc(t('th_ok')), `${fixed(r.margin, 1)} °C`]]))
      + block('results', rows([
        ['th_thetaTotal', `${fmt(r.thetaTotal, 4)} °C/W`],
        ['th_margin', `${fixed(r.margin, 1)} °C`],
        ['th_maxP', `${fmt(r.maxPower, 4)} W`],
        ['th_maxTa', `${fixed(r.maxAmbient, 1)} °C`],
        r.chain && ['th_reqSA', r.requiredThetaSA > 0 ? `${fmt(r.requiredThetaSA, 3)} °C/W` : esc(t('th_reqSAnone'))],
        r.eff !== null && ['th_eff', `${fixed(r.eff * 100, 1)} %`],
      ]))
      + formulaBlock([
        'P_LDO = (Vin − Vout)·Iout + Vin·Iq',
        'Tj = Ta + P·θJA          or   Tj = Ta + P·(θJC + θCS + θSA)',
        'P_max = (Tj,max − Ta) / Σθ',
        'θSA,req = (Tj,max − Ta)/P − θJC − θCS',
      ], 'th_note', ['JEDEC JESD51', 'TI SPRA953 “Semiconductor and IC package thermal metrics”']);
  },
};
