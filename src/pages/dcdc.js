import { buck, boost } from '../engine/dcdc.js';
import { heroes, rows, block, formulaBlock, messages, invalid } from '../ui/calculator.js';
import { fmt, fixed, si, siHtml } from '../ui/format.js';

const strings = {
  tr: {
    dc_top: 'Topoloji',
    dc_buck: 'Buck (düşürücü)',
    dc_boost: 'Boost (yükseltici)',
    dc_vin: 'Giriş gerilimi',
    dc_vinInfo: 'Buck’ta bobin için en yüksek giriş gerilimini, boost’ta en düşük giriş gerilimini kullanın (en kötü dalgalanma ve akım bu noktalardadır).',
    dc_vout: 'Çıkış gerilimi',
    dc_iout: 'En yüksek çıkış akımı',
    dc_fsw: 'Anahtarlama frekansı',
    dc_ripple: 'Bobin dalgalanma oranı',
    dc_rippleInfo: 'Bobin akımındaki tepeden tepeye dalgalanmanın yük akımına oranı. %20–40 tipik bir uzlaşmadır: küçük oran büyük bobin, büyük oran büyük çıkış dalgalanması demektir.',
    dc_eff: 'Tahmini verim',
    dc_dv: 'İzin verilen çıkış dalgalanması',
    dc_L: 'Bobin değeri (en az)',
    dc_Cout: 'Çıkış kapasitesi (en az)',
    dc_duty: 'Görev oranı (D)',
    dc_dI: 'Bobin akım dalgalanması ΔI',
    dc_iL: 'Ortalama bobin akımı',
    dc_ipk: 'Tepe anahtar/bobin akımı',
    dc_ipkInfo: 'Bobinin doyma akımı ve anahtarın akım sınırı bundan büyük olmalı (pay bırakın).',
    dc_esr: 'Çıkış kondansatörü en yüksek ESR',
    dc_icin: 'Giriş kondansatörü RMS akımı',
    dc_note: 'Sürekli iletim modu varsayılır; denklemler TI SLVA477 (buck) ve SLVA372 (boost) uygulama notlarındandır. Seramik kondansatörlerde DC öngerilim kapasiteyi önemli ölçüde düşürür; çıkış kondansatörünü bu değerin üzerinde seçin. Nihai değerleri regülatör entegresinin veri sayfası ve kompanzasyon gereksinimleriyle doğrulayın.',
    err_buckRange: 'Buck için giriş gerilimi çıkıştan büyük olmalı.',
    err_boostRange: 'Boost için çıkış gerilimi girişten büyük olmalı.',
    warn_dutyHigh: 'Görev oranı çok yüksek; entegrenin en büyük görev oranını ve en kısa kapalı kalma süresini kontrol edin.',
    warn_dutyLow: 'Görev oranı çok düşük; entegrenin en kısa açık kalma süresini (minimum on-time) kontrol edin.',
  },
  en: {
    dc_top: 'Topology',
    dc_buck: 'Buck (step-down)',
    dc_boost: 'Boost (step-up)',
    dc_vin: 'Input voltage',
    dc_vinInfo: 'For a buck use the maximum input voltage for the inductor; for a boost use the minimum input voltage (worst ripple and current occur there).',
    dc_vout: 'Output voltage',
    dc_iout: 'Maximum output current',
    dc_fsw: 'Switching frequency',
    dc_ripple: 'Inductor ripple ratio',
    dc_rippleInfo: 'Peak-to-peak inductor ripple as a fraction of the load current. 20–40 % is a typical compromise: a small ratio means a big inductor, a large ratio means more output ripple.',
    dc_eff: 'Estimated efficiency',
    dc_dv: 'Allowed output ripple',
    dc_L: 'Inductance (minimum)',
    dc_Cout: 'Output capacitance (minimum)',
    dc_duty: 'Duty cycle (D)',
    dc_dI: 'Inductor ripple current ΔI',
    dc_iL: 'Average inductor current',
    dc_ipk: 'Peak switch/inductor current',
    dc_ipkInfo: 'The inductor saturation current and the switch current limit must exceed this, with margin.',
    dc_esr: 'Maximum output capacitor ESR',
    dc_icin: 'Input capacitor RMS current',
    dc_note: 'Continuous conduction mode is assumed; equations from TI application notes SLVA477 (buck) and SLVA372 (boost). DC bias strongly reduces ceramic capacitance; choose the output capacitor above this value. Confirm final values against the regulator IC datasheet and its compensation requirements.',
    err_buckRange: 'For a buck the input voltage must exceed the output.',
    err_boostRange: 'For a boost the output voltage must exceed the input.',
    warn_dutyHigh: 'Very high duty cycle; check the IC maximum duty and minimum off-time.',
    warn_dutyLow: 'Very low duty cycle; check the IC minimum on-time.',
  },
};

export default {
  id: 'dcdc',
  strings,
  sections: [
    {
      title: 'sectionSetup',
      fields: [
        { key: 'top', type: 'choice', label: 'dc_top', default: 'buck',
          options: [
            { value: 'buck', label: 'dc_buck', set: { vin: 12, vout: 3.3, iout: 2 } },
            { value: 'boost', label: 'dc_boost', set: { vin: 5, vout: 12, iout: 1 } },
          ] },
      ],
    },
    {
      title: 'sectionInputs',
      fields: [
        { key: 'vin', type: 'number', label: 'dc_vin', default: 12, units: ['V'], info: 'dc_vinInfo' },
        { key: 'vout', type: 'number', label: 'dc_vout', default: 3.3, units: ['V'] },
        { key: 'iout', type: 'number', label: 'dc_iout', default: 2, units: ['A'] },
        { key: 'f', type: 'number', label: 'dc_fsw', default: 500, units: ['kHz', 'MHz'] },
        { key: 'r', type: 'number', label: 'dc_ripple', default: 30, units: ['pct'], max: 100, info: 'dc_rippleInfo',
          presets: [20, 30, 40].map((x) => ({ label: `${x} %`, value: x })) },
        { key: 'eff', type: 'number', label: 'dc_eff', default: 90, units: ['pct'], max: 100 },
        { key: 'dv', type: 'number', label: 'dc_dv', default: 20, units: ['mV'] },
      ],
    },
  ],

  compute(v, u) {
    const p = {
      vin: v.vin, vout: v.vout, iout: v.iout, fsw: v.f * (u.f === 'MHz' ? 1e6 : 1e3),
      ripple: v.r / 100, eff: v.eff / 100, dvout: v.dv / 1000,
    };
    return v.top === 'boost' ? boost(p) : buck(p);
  },

  render(r) {
    if (!r.ok) return invalid(r.errors);
    return heroes([['dc_L', siHtml(r.L, 'H')], ['dc_Cout', siHtml(r.cOutMin, 'F')]])
      + messages('warn', r.warnings)
      + block('results', rows([
        ['dc_duty', `${fixed(r.duty * 100, 1)} %`],
        ['dc_dI', si(r.dI, 'A')],
        ['dc_iL', si(r.iL, 'A')],
        ['dc_ipk', si(r.iPeak, 'A')],
        ['dc_esr', si(r.esrMax, 'Ω')],
        r.iCinRms !== undefined && ['dc_icin', si(r.iCinRms, 'A')],
      ]))
      + formulaBlock(r.topology === 'buck'
        ? ['D = Vout / (Vin·η)', 'ΔI = r·Iout', 'L = Vout·(Vin − Vout) / (ΔI·fsw·Vin)', 'Cout ≥ ΔI / (8·fsw·ΔVout),  ESR ≤ ΔVout / ΔI', 'I_Cin,rms = Iout·√(D·(1 − D))']
        : ['D = 1 − Vin·η / Vout', 'ΔI = r·Iout·Vout/Vin', 'L = Vin·(Vout − Vin) / (ΔI·fsw·Vout)', 'Cout ≥ Iout·D / (fsw·ΔVout)', 'I_pk = Iout/(1 − D) + ΔI/2'],
      'dc_note', ['TI SLVA477', 'TI SLVA372']);
  },
};
