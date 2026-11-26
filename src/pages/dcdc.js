import { buck, boost } from '../engine/dcdc.js';
import { heroes, rows, block, steps, messages, invalid } from '../ui/calculator.js';
import { tx } from '../ui/math.js';
import { fmt, fixed, si, siHtml } from '../ui/format.js';
import { svg, twoTerm, wire, node, ground, terminal, text, rect, path, arrow, dimH, dimV, axes, wave } from '../ui/svg.js';
import { t } from '../i18n.js';

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
    dc_dgBuck: 'Buck güç katı ve bobin akımı dalga şekli',
    dc_dgBoost: 'Boost güç katı ve bobin akımı dalga şekli',
    dc_dgLoad: 'Yük',
    dc_dgSync: 'veya senk. FET',
    dc_dgOn: 'Q1 iletimde',
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
    dc_dgBuck: 'Buck power stage and inductor current waveform',
    dc_dgBoost: 'Boost power stage and inductor current waveform',
    dc_dgLoad: 'Load',
    dc_dgSync: 'or sync FET',
    dc_dgOn: 'Q1 on',
  },
};

/**
 * Live power stage (top) and inductor current (bottom). The current rises
 * while Q1 conducts (D·T, shaded) and falls while D carries it ((1−D)·T);
 * its average is the dashed line and its peak-to-peak swing is ΔI.
 * Duty cycles below 10 % / above 90 % are drawn at the limit so labels fit.
 */
function diagram(v, u, r) {
  const boost = v.top === 'boost';
  const val = (x, unit) => (Number.isFinite(x) && x > 0 ? si(x, unit, 3) : '?');
  const yT = 30;
  const yB = 92;
  let b = twoTerm('V', 52, yT, 52, yB, { name: 'Vin', value: val(v.vin, 'V'), flip: true });
  // Inductor with its value on one line above it ("L  10 µH") and the current iL below.
  const inductor = (x1, x2) => {
    const cx = (x1 + x2) / 2;
    return twoTerm('L', x1, yT, x2, yT, { hi: !!r })
      + text(cx - 3, 18, 'L', { cls: 'name', anchor: 'end' }) + text(cx + 3, 18, val(r?.L, 'H'), { cls: 'val', anchor: 'start' })
      + arrow(cx - 21, 43, cx + 15, 43, { cls: 'flow', headCls: 'arrow flow' }) + text(cx + 21, 47, 'iL', { cls: 'sym', anchor: 'start' });
  };
  if (boost) {
    b += wire([52, yT], [70, yT]) + inductor(70, 150) + wire([150, yT], [160, yT])
      + twoTerm('SW', 160, yT, 160, yB) + text(174, 70, 'Q1', { cls: 'name', anchor: 'start' })
      + twoTerm('D', 160, yT, 226, yT) + text(180, 17, 'D', { cls: 'name', anchor: 'start' })
      + text(192, 17, t('dc_dgSync'), { anchor: 'start' })
      + node(160, yT) + node(160, yB) + ground(110, yB) + node(110, yB);
  } else {
    b += wire([52, yT], [80, yT]) + twoTerm('SW', 80, yT, 140, yT, { name: 'Q1' })
      + twoTerm('D', 140, yB, 140, yT) + text(153, 63, 'D', { cls: 'name', anchor: 'start' })
      + text(153, 77, t('dc_dgSync'), { anchor: 'start' })
      + inductor(140, 226)
      + node(140, yT) + node(140, yB) + ground(196, yB) + node(196, yB);
  }
  b += wire([226, yT], [400, yT]) + wire([52, yB], [322, yB])
    + twoTerm('C', 250, yT, 250, yB, { name: 'Cout', value: val(r?.cOutMin, 'F'), hi: !!r })
    + twoTerm('R', 322, yT, 322, yB, { name: t('dc_dgLoad'), value: val(v.iout, 'A') })
    + node(250, yT) + node(250, yB) + node(322, yT)
    + terminal(400, yT, `Vout = ${val(v.vout, 'V')}`, 'top', 'val');

  // Inductor current over two switching periods.
  const x0 = 56;
  const y0 = 222;
  const xs = 62;
  const T = 140;
  const d = r ? r.duty : 0.4;
  const dd = Math.min(0.9, Math.max(0.1, d));
  const iAvg = r ? r.iL : 1;
  const dI = r ? r.dI : 0.3;
  const sc = (y0 - 140) / (iAvg + dI / 2);
  const Y = (i) => y0 - i * sc;
  const yPk = Y(iAvg + dI / 2);
  const yLo = Y(iAvg - dI / 2);
  for (let k = 0; k < 2; k++) b += rect(xs + k * T, 132, dd * T, y0 - 132, 'zone');
  b += axes(x0, y0, 290, 92, { xLabel: 't', yLabel: 'iL' })
    + text(x0 - 4, y0 + 4, '0', { anchor: 'end' })
    + wave([[x0, Y(iAvg)], [xs + 2 * T, Y(iAvg)]], 'wave2')
    + text(x0 - 4, Y(iAvg) + 4, val(r?.iL, 'A'), { cls: 'val', anchor: 'end' })
    + wave([[xs, yLo], [xs + dd * T, yPk], [xs + T, yLo], [xs + T + dd * T, yPk], [xs + 2 * T, yLo]])
    + dimH(xs, xs + dd * T, 124, 'D·T', { extFrom: 132 })
    + dimH(xs + dd * T, xs + T, 124, '(1−D)·T', { extFrom: 132 });
  const fsw = v.f * (u.f === 'MHz' ? 1e6 : 1e3);
  b += text(xs + T + 30, 128, `D = ${r ? `${fixed(d * 100, 1)} %` : '?'}  ·  T = ${val(1 / fsw, 's')}`, { cls: 'val', anchor: 'start' });
  // ΔI between the last peak and the end valley.
  b += path(`M${xs + T + dd * T},${yPk}H356M${xs + 2 * T},${yLo}H356`, 'ext')
    + dimV(yPk, yLo, 352, '')
    + text(360, (yPk + yLo) / 2 - 1, 'ΔI', { cls: 'sym', anchor: 'start' })
    + text(360, (yPk + yLo) / 2 + 12, val(r?.dI, 'A'), { cls: 'val', anchor: 'start' });
  // Legend for the shaded on-time.
  b += rect(356, 204, 10, 10, 'zone') + rect(356, 204, 10, 10, 'ext') + text(371, 213, t('dc_dgOn'), { anchor: 'start' });
  return svg(440, 240, b, t(boost ? 'dc_dgBoost' : 'dc_dgBuck'), { wide: true });
}

const fswOf = (v, u) => v.f * (u.f === 'MHz' ? 1e6 : 1e3);

/**
 * Calculation steps in the order of the TI application notes. The duty cycle
 * is carried as a fraction (and shown once as a percentage); the ripple ratio
 * and the efficiency appear as the percentages the reader typed.
 */
function worked(r, v, u) {
  const q = (x, unit) => tx(si(x, unit));
  const pct = (x) => tx(`${fmt(x, 4)} %`);
  const Vin = q(v.vin, 'V');
  const Vout = q(v.vout, 'V');
  const Iout = q(v.iout, 'A');
  const F = q(fswOf(v, u), 'Hz');
  const dV = q(v.dv / 1000, 'V');
  const dI = q(r.dI, 'A');
  // 1 − D magnifies a rounded D at high step-up ratios, so D keeps five digits here.
  const D = tx(fmt(r.duty, 5));
  const duty = `${D} = ${tx(`${fixed(r.duty * 100, 1)} %`)}`;
  const list = r.topology === 'buck' ? [
    { label: 'dc_duty', sym: 'D = \\frac{V_{out}}{V_{in} \\cdot η}', num: `\\frac{${Vout}}{${Vin} \\cdot ${pct(v.eff)}}`, res: duty },
    { label: 'dc_dI', sym: 'ΔI = r \\cdot I_{out}', num: `${pct(v.r)} \\cdot ${Iout}`, res: dI },
    { label: 'dc_L', sym: 'L = \\frac{V_{out} \\cdot (V_{in} − V_{out})}{ΔI \\cdot f_{sw} \\cdot V_{in}}',
      num: `\\frac{${Vout} \\cdot (${Vin} − ${Vout})}{${dI} \\cdot ${F} \\cdot ${Vin}}`, res: q(r.L, 'H') },
    { label: 'dc_ipk', sym: 'I_{pk} = I_{out} + \\frac{ΔI}{2}', num: `${Iout} + \\frac{${dI}}{2}`, res: q(r.iPeak, 'A') },
    { label: 'dc_Cout', sym: 'C_{out} = \\frac{ΔI}{8 \\cdot f_{sw} \\cdot ΔV_{out}}', num: `\\frac{${dI}}{8 \\cdot ${F} \\cdot ${dV}}`, res: q(r.cOutMin, 'F') },
    { label: 'dc_esr', sym: 'ESR_{max} = \\frac{ΔV_{out}}{ΔI}', num: `\\frac{${dV}}{${dI}}`, res: q(r.esrMax, 'Ω') },
    { label: 'dc_icin', sym: 'I_{Cin,rms} = I_{out} \\cdot \\sqrt{D \\cdot (1 − D)}', num: `${Iout} \\cdot \\sqrt{${D} \\cdot (1 − ${D})}`, res: q(r.iCinRms, 'A') },
  ] : [
    { label: 'dc_duty', sym: 'D = 1 − \\frac{V_{in} \\cdot η}{V_{out}}', num: `1 − \\frac{${Vin} \\cdot ${pct(v.eff)}}{${Vout}}`, res: duty },
    { label: 'dc_iL', sym: 'I_L = \\frac{I_{out}}{1 − D}', num: `\\frac{${Iout}}{1 − ${D}}`, res: q(r.iL, 'A') },
    { label: 'dc_dI', sym: 'ΔI = r \\cdot I_{out} \\cdot \\frac{V_{out}}{V_{in}}', num: `${pct(v.r)} \\cdot ${Iout} \\cdot \\frac{${Vout}}{${Vin}}`, res: dI },
    { label: 'dc_L', sym: 'L = \\frac{V_{in} \\cdot (V_{out} − V_{in})}{ΔI \\cdot f_{sw} \\cdot V_{out}}',
      num: `\\frac{${Vin} \\cdot (${Vout} − ${Vin})}{${dI} \\cdot ${F} \\cdot ${Vout}}`, res: q(r.L, 'H') },
    { label: 'dc_ipk', sym: 'I_{pk} = I_L + \\frac{ΔI}{2}', num: `${q(r.iL, 'A')} + \\frac{${dI}}{2}`, res: q(r.iPeak, 'A') },
    { label: 'dc_Cout', sym: 'C_{out} = \\frac{I_{out} \\cdot D}{f_{sw} \\cdot ΔV_{out}}', num: `\\frac{${Iout} \\cdot ${D}}{${F} \\cdot ${dV}}`, res: q(r.cOutMin, 'F') },
    { label: 'dc_esr', sym: 'ESR_{max} = \\frac{ΔV_{out}}{I_{pk}}', num: `\\frac{${dV}}{${q(r.iPeak, 'A')}}`, res: q(r.esrMax, 'Ω') },
  ];
  return steps(list, {
    note: 'dc_note',
    where: [['V_{in}', 'dc_vin', 'vin'], ['V_{out}', 'dc_vout', 'vout'], ['I_{out}', 'dc_iout', 'iout'], ['f_{sw}', 'dc_fsw', 'f'],
      ['r', 'dc_ripple', 'r'], ['η', 'dc_eff', 'eff'], ['ΔV_{out}', 'dc_dv', 'dv']],
    refs: ['TI SLVA477', 'TI SLVA372'],
  });
}

export default {
  diagram,
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
      vin: v.vin, vout: v.vout, iout: v.iout, fsw: fswOf(v, u),
      ripple: v.r / 100, eff: v.eff / 100, dvout: v.dv / 1000,
    };
    return v.top === 'boost' ? boost(p) : buck(p);
  },

  render(r, v, u) {
    if (!r.ok) return invalid(r.errors);
    return heroes([['dc_L', siHtml(r.L, 'H')], ['dc_Cout', siHtml(r.cOutMin, 'F')]])
      + messages('warn', r.warnings)
      + worked(r, v, u)
      + block('results', rows([
        ['dc_duty', `${fixed(r.duty * 100, 1)} %`],
        ['dc_dI', si(r.dI, 'A')],
        ['dc_iL', si(r.iL, 'A')],
        ['dc_ipk', si(r.iPeak, 'A')],
        ['dc_esr', si(r.esrMax, 'Ω')],
        r.iCinRms !== undefined && ['dc_icin', si(r.iCinRms, 'A')],
      ]));
  },
};
