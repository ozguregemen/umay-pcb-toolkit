import { hotPlug, softStart, gateRamp, ntcLimiter, rlcStep } from '../engine/inrush.js';
import { heroes, rows, block, formulaBlock, messages, invalid } from '../ui/calculator.js';
import { fmt, si, siHtml } from '../ui/format.js';
import { svg, text, path, axes, wave } from '../ui/svg.js';
import { t } from '../i18n.js';

const FARAD = 'farad'; // 'F' would render as °F

const strings = {
  tr: {
    iz_mode: 'Durum',
    iz_plug: 'Sıcak takma',
    iz_ramp: 'Yumuşak başlatma',
    iz_gate: 'Gate kondansatörü',
    iz_ntc: 'NTC sınırlayıcı',
    iz_secCircuit: 'Kaynak ve yük',
    iz_supply: 'Besleme',
    iz_dc: 'DC',
    iz_ac: 'AC (doğrultulmuş)',
    iz_v: 'Besleme gerilimi',
    iz_vrms: 'Şebeke gerilimi (RMS)',
    iz_c: 'Yük kapasitesi C',
    iz_cInfo: 'Girişteki tüm kondansatörlerin toplamı (bulk + seramikler). Seramiklerde DC öngerilim etkisini unutmayın.',
    iz_rsrc: 'Kaynak + kablo direnci',
    iz_rsrcInfo: 'Güç kaynağının iç direnci ve kablonun gidiş-dönüş direnci. Laboratuvar kaynağında bile çıkış kondansatörü anlık akımı besler; bu durumda küçük bir değer girin.',
    iz_esr: 'Kondansatör ESR’si',
    iz_esrInfo: 'Paralel kondansatörlerin eşdeğer ESR’si. Seramikte birkaç mΩ, alüminyum elektrolitikte onlarca–yüzlerce mΩ.',
    iz_rtr: 'İz ve konnektör direnci',
    iz_iload: 'Tam gerilimde yük akımı',
    iz_iloadInfo: 'Rampa sırasında yük de akım çekiyorsa (dirençli yük varsayılır: akım gerilimle orantılı). Yük, rampa bitene kadar kapalı tutuluyorsa boş bırakın.',
    iz_secPlug: 'Kablo',
    iz_l: 'Kablo endüktansı',
    iz_lInfo: 'Kablo için kabaca 0,5–1 µH/m (gidiş-dönüş). Endüktans tepe akımı düşürür ama seramik kondansatörlerde gerilimin 2·V’ye kadar aşmasına yol açabilir.',
    iz_secRamp: 'Rampa',
    iz_tss: 'Rampa süresi (0 → V)',
    iz_tssInfo: 'Yük anahtarı, eFuse veya regülatörün soft-start süresi; çıkışın doğrusal yükseldiği varsayılır.',
    iz_secGate: 'Gate rampası',
    iz_igate: 'Gate şarj akımı',
    iz_igateInfo: 'Hot-swap denetleyicisinin veya şarj pompasının gate kaynak akımı (veri sayfasında I_GATE).',
    iz_cg: 'Gate–toprak kondansatörü CG',
    iz_cgInfo: 'Gate’ten toprağa (veya kaynağa) eklenen kondansatör. Seri ~1 kΩ direnç önerilir (TI TPS2490).',
    iz_cgd: 'MOSFET Cgd (Crss)',
    iz_cgdInfo: 'MOSFET gerilimi takip ederken Miller kapasitesi de gate akımını paylaşır. Gate yük eğrisinden Qgd/Vplato ile ortalama değer bulunabilir.',
    iz_itarget: 'Hedef ani akım',
    iz_itargetInfo: 'İsteğe bağlı: bu akım için gereken CG hesaplanır.',
    iz_secNtc: 'NTC',
    iz_ipk: 'İzin verilen tepe akım',
    iz_ipkInfo: 'Sigorta, köprü diyot, röle kontağı veya kaynağın dayanabileceği tepe akım.',
    iz_r25: 'Seçilen NTC R25',
    iz_r25Info: 'İsteğe bağlı: seçtiğiniz parçanın 25 °C’deki direnci. Boşsa en küçük gereken değer kullanılır.',
    iz_iss: 'Sürekli çalışma akımı (RMS)',
    iz_rhot: 'Bu akımda NTC direnci',
    iz_rhotInfo: 'Veri sayfasındaki direnç–akım eğrisinden (ısınmış hali).',
    iz_ipeak: 'Tepe ani akım',
    iz_energy: 'Kondansatörde depolanan enerji ½·C·V²',
    iz_rTot: 'Toplam seri direnç',
    iz_tau: 'Zaman sabiti R·C',
    iz_settle: 'Şarj süresi (%99, ≈ 5τ)',
    iz_iR: 'Yalnız dirençle sınır V/R',
    iz_zeta: 'Sönüm oranı ζ',
    iz_tpk: 'Tepe akıma kadar süre',
    iz_vmax: 'Kondansatördeki en yüksek gerilim',
    iz_type_rc: 'RC (endüktans yok)',
    iz_type_under: 'Az sönümlü: salınım ve gerilim aşımı var',
    iz_type_critical: 'Kritik sönümlü',
    iz_type_over: 'Aşırı sönümlü',
    iz_response: 'Yanıt',
    iz_icap: 'Kondansatör şarj akımı C·dV/dt',
    iz_slew: 'Çıkış eğimi dV/dt',
    iz_tRamp: 'Rampa süresi',
    iz_efet: 'Geçiş elemanında harcanan enerji',
    iz_pavg: 'Rampa boyunca ortalama güç',
    iz_ppk: 'Başlangıçtaki tepe güç V·I',
    iz_bare: 'Sınırlamasız sıcak takma tepe akımı',
    iz_cgFor: 'Hedef akım için gereken CG',
    iz_cgNeg: 'Cgd tek başına yetiyor (CG gerekmez)',
    iz_r25min: 'En küçük NTC R25',
    iz_vpk: 'Tepe gerilim',
    iz_withNtc: 'NTC ile tepe akım',
    iz_ntcE: 'NTC’nin soğuracağı enerji ≈ ½·C·V²',
    iz_pss: 'Sürekli çalışmada NTC kaybı I²·R',
    warn_iz_overshoot: 'Kondansatör gerilimi beslemeyi belirgin şekilde aşıyor (az sönümlü LC). Gerilim sınırlarını kontrol edin; seri direnç, ESR’si yüksek bir bulk kondansatör veya TVS ekleyin (LT AN88).',
    warn_iz_ntcNotNeeded: 'Kaynak ve ESR direnci tek başına akımı hedefin altında tutuyor; NTC gerekmez.',
    warn_iz_ntcSmall: 'Seçilen R25, hedef tepe akım için gereken en küçük değerden küçük.',
    warn_iz_soa: 'Rampa sırasında MOSFET önemli enerji harcar: tepe gücü ve süreyi veri sayfasındaki SOA eğrisiyle karşılaştırın.',
    warn_iz_hot: 'NTC sıcakken direnci düşüktür: kısa süreli kesinti ve yeniden açılmada ani akımı sınırlamaz. Sık açılıp kapanan cihazlarda röle ile köprülemeyi veya aktif sınırlamayı düşünün.',
    err_iz_rZero: 'Toplam direnç veya kablo endüktansından en az biri sıfırdan büyük olmalı.',
    iz_note: 'Basitleştirilmiş modeller: elemanlar doğrusal, kaynak ideal gerilim kaynağı ve iç direnci kabul edilir. NTC direncinin şarj sırasında değişmediği (soğuk R25) varsayılır; düşük ortam sıcaklığında R daha büyük, sıcak yeniden başlatmada çok daha küçüktür. Geçiş elemanının enerjisi ve gücü, MOSFET’in güvenli çalışma alanı (SOA) ile karşılaştırılmalıdır.',
    iz_dgAria: 'Açılışta kondansatör gerilimi ve akımı: sınırlamalı ve sınırlamasız durum',
    iz_dgLim: 'sınırlamalı',
    iz_dgBare: 'sınırlamasız',
    iz_dgWithL: 'kablo L ile',
    iz_dgNoL: 'yalnız R',
  },
  en: {
    iz_mode: 'Situation',
    iz_plug: 'Hot plug',
    iz_ramp: 'Soft-start',
    iz_gate: 'Gate capacitor',
    iz_ntc: 'NTC limiter',
    iz_secCircuit: 'Source and load',
    iz_supply: 'Supply',
    iz_dc: 'DC',
    iz_ac: 'AC (rectified)',
    iz_v: 'Supply voltage',
    iz_vrms: 'Mains voltage (RMS)',
    iz_c: 'Load capacitance C',
    iz_cInfo: 'All input capacitors together (bulk + ceramics). Remember the DC-bias loss of ceramics.',
    iz_rsrc: 'Source + cable resistance',
    iz_rsrcInfo: 'The supply’s internal resistance plus the round-trip cable resistance. Even a lab supply’s output capacitor feeds the surge, so use a small value then.',
    iz_esr: 'Capacitor ESR',
    iz_esrInfo: 'Equivalent ESR of the parallel capacitors: a few mΩ for ceramics, tens to hundreds of mΩ for aluminium electrolytics.',
    iz_rtr: 'Trace and connector resistance',
    iz_iload: 'Load current at full voltage',
    iz_iloadInfo: 'If the load already draws current during the ramp (resistive load assumed: current proportional to voltage). Leave empty if the load is held off until the ramp ends.',
    iz_secPlug: 'Cable',
    iz_l: 'Cable inductance',
    iz_lInfo: 'Roughly 0.5–1 µH per metre of cable (round trip). Inductance lowers the peak current but with ceramic capacitors the voltage can overshoot towards 2·V.',
    iz_secRamp: 'Ramp',
    iz_tss: 'Ramp time (0 → V)',
    iz_tssInfo: 'Soft-start time of the load switch, eFuse or regulator; the output is assumed to rise linearly.',
    iz_secGate: 'Gate ramp',
    iz_igate: 'Gate charge current',
    iz_igateInfo: 'Gate source current of the hot-swap controller or charge pump (I_GATE in its datasheet).',
    iz_cg: 'Gate-to-ground capacitor CG',
    iz_cgInfo: 'Capacitor added from gate to ground (or source). A ~1 kΩ series resistor is recommended (TI TPS2490).',
    iz_cgd: 'MOSFET Cgd (Crss)',
    iz_cgdInfo: 'While the MOSFET follows the gate, its Miller capacitance shares the gate current. An average value is Qgd/Vplateau from the gate-charge curve.',
    iz_itarget: 'Target inrush current',
    iz_itargetInfo: 'Optional: the CG needed for this current is calculated.',
    iz_secNtc: 'NTC',
    iz_ipk: 'Allowed peak current',
    iz_ipkInfo: 'The peak current the fuse, bridge rectifier, relay contact or source can stand.',
    iz_r25: 'Chosen NTC R25',
    iz_r25Info: 'Optional: resistance of your part at 25 °C. When empty, the minimum required value is used.',
    iz_iss: 'Steady-state current (RMS)',
    iz_rhot: 'NTC resistance at this current',
    iz_rhotInfo: 'From the resistance–current curve in the datasheet (warmed up).',
    iz_ipeak: 'Peak inrush current',
    iz_energy: 'Energy stored in the capacitor ½·C·V²',
    iz_rTot: 'Total series resistance',
    iz_tau: 'Time constant R·C',
    iz_settle: 'Charge time (99 %, ≈ 5τ)',
    iz_iR: 'Resistive limit V/R',
    iz_zeta: 'Damping ratio ζ',
    iz_tpk: 'Time to peak current',
    iz_vmax: 'Highest capacitor voltage',
    iz_type_rc: 'RC (no inductance)',
    iz_type_under: 'Underdamped: ringing and voltage overshoot',
    iz_type_critical: 'Critically damped',
    iz_type_over: 'Overdamped',
    iz_response: 'Response',
    iz_icap: 'Capacitor charging current C·dV/dt',
    iz_slew: 'Output slew rate dV/dt',
    iz_tRamp: 'Ramp time',
    iz_efet: 'Energy dissipated in the pass element',
    iz_pavg: 'Average power during the ramp',
    iz_ppk: 'Peak power at the start V·I',
    iz_bare: 'Unlimited hot-plug peak current',
    iz_cgFor: 'CG needed for the target current',
    iz_cgNeg: 'Cgd alone is enough (no CG needed)',
    iz_r25min: 'Minimum NTC R25',
    iz_vpk: 'Peak voltage',
    iz_withNtc: 'Peak current with NTC',
    iz_ntcE: 'Energy the NTC must absorb ≈ ½·C·V²',
    iz_pss: 'NTC loss in steady state I²·R',
    warn_iz_overshoot: 'The capacitor voltage clearly overshoots the supply (underdamped LC). Check voltage ratings; add series resistance, a bulk capacitor with higher ESR or a TVS (LT AN88).',
    warn_iz_ntcNotNeeded: 'The source and ESR resistance alone keep the current below the target; no NTC is needed.',
    warn_iz_ntcSmall: 'The chosen R25 is below the minimum needed for the target peak current.',
    warn_iz_soa: 'The MOSFET dissipates significant energy during the ramp: compare the peak power and duration with the SOA curve in its datasheet.',
    warn_iz_hot: 'A hot NTC has a low resistance: it does not limit the inrush after a short dropout and restart. For frequently cycled equipment consider a bypass relay or active limiting.',
    err_iz_rZero: 'The total resistance or the cable inductance must be above zero.',
    iz_note: 'Simplified models: linear components, an ideal voltage source with its internal resistance. The NTC resistance is assumed constant (cold R25) while the capacitor charges; at low ambient it is higher, after a hot restart much lower. Compare the pass element’s energy and power with the MOSFET safe operating area (SOA).',
    iz_dgAria: 'Capacitor voltage and current at start-up, with and without limiting',
    iz_dgLim: 'limited',
    iz_dgBare: 'unlimited',
    iz_dgWithL: 'with cable L',
    iz_dgNoL: 'R only',
  },
};

const isMode = (...m) => (v) => m.includes(v.mode);
const isAc = (v) => v.mode === 'ntc' && v.sup === 'ac';
const n0 = (x) => (Number.isFinite(x) && x > 0 ? x : 0);
const T_MUL = { us: 1e-6, ms: 1e-3, s: 1 };
const rSeries = (v) => n0(v.rsrc) + n0(v.esr) + n0(v.rtr);
const vPeak = (v) => (isAc(v) ? Math.SQRT2 * v.v : v.v);

/**
 * Two curves per plot: the limited start-up (solid) and the unlimited hot plug
 * (dashed, R = source + ESR + trace). Current is scaled to the limited peak;
 * a much larger unlimited spike is clipped at the top and labelled.
 */
function diagram(v, u, r) {
  const x0 = 54;
  const W = 340;
  const yV = 98;
  const yI = 206;
  const H = 70;
  const V = vPeak(v);
  const ok = !!r && Number.isFinite(V) && V > 0 && v.c > 0;
  const curves = [];
  let tEnd = 1;
  let labels = ['iz_dgLim', 'iz_dgBare'];
  if (ok) {
    const ref = rSeries(v) > 0 ? rlcStep({ v: V, r: rSeries(v), c: v.c }) : null;
    if (v.mode === 'plug') {
      labels = r.type === 'rc' ? ['iz_dgNoL'] : ['iz_dgWithL', 'iz_dgNoL'];
      if (r.type === 'rc') tEnd = 5 * r.tau;
      else tEnd = Math.min(Math.max(5 * r.tau, 3 * r.tPeak), r.type === 'under' ? 6 * Math.PI / r.wd : 12 * r.tPeak);
      curves.push({ v: r.vc, i: r.i, peak: r.iPeak }, r.type === 'rc' || !ref ? null : { v: ref.vc, i: ref.i });
    } else if (v.mode === 'ntc') {
      const lim = rlcStep({ v: V, r: Math.max(r.rUse + r.rSeries, 1e-6), c: v.c });
      tEnd = 5 * lim.tau;
      curves.push({ v: lim.vc, i: lim.i, peak: lim.iPeak }, ref && { v: ref.vc, i: ref.i });
    } else {
      const T = r.tRamp;
      const il = n0(v.iload);
      tEnd = 1.25 * T;
      curves.push({
        v: (tt) => V * Math.min(1, tt / T),
        i: (tt) => (tt <= T ? r.iCap + (il * tt) / T : il),
        peak: r.iPeak,
      }, ref && { v: ref.vc, i: ref.i });
    }
  }
  const lim = curves[0];
  const ref = curves[1];
  const N = 240;
  const sample = (fn) => {
    const out = [];
    for (let k = 0; k <= N; k++) {
      const tt = (tEnd * k) / N;
      out.push([tt, fn(tt)]);
    }
    return out;
  };
  let b = '';
  // Scales
  const vTop = ok ? Math.max(V, r.vMax || V) * 1.08 : 1;
  const iLim = ok ? lim.peak : 1;
  const iRef = ok && ref ? ref.i(0) || Math.max(...sample(ref.i).map(([, x]) => x)) : 0;
  const iTop = ok ? (iRef > 1.6 * iLim ? 1.6 * iLim : Math.max(iLim, iRef) * 1.08) : 1;
  const X = (tt) => x0 + (W * tt) / tEnd;
  const clip = (y, y0) => Math.min(y0 + 6, Math.max(y0 - H - 6, y));
  const plot = (fn, y0, scale, cls) => wave(sample(fn).map(([tt, x]) => [X(tt), clip(y0 - (H * (Number.isFinite(x) ? x : 0)) / scale, y0)]), cls);
  b += axes(x0, yV, W + 8, H + 10, { xLabel: 't' }) + axes(x0, yI, W + 8, H + 10, { xLabel: 't' })
    + text(x0 - 6, yV - H - 2, 'V', { cls: 'sym', anchor: 'end' })
    + text(x0 - 6, yI - H - 2, 'I', { cls: 'sym', anchor: 'end' });
  if (ok) {
    b += path(`M${x0},${yV - (H * V) / vTop}H${x0 + W}`, 'ext')
      + text(x0 - 6, yV - (H * V) / vTop + 4, si(V, 'V', 3), { cls: 'val', anchor: 'end' });
    if (ref) b += plot(ref.v, yV, vTop, 'wave2') + plot(ref.i, yI, iTop, 'wave2');
    b += plot(lim.v, yV, vTop, 'wave') + plot(lim.i, yI, iTop, 'wave');
    b += text(x0 - 6, yI - (H * iLim) / iTop + 4, si(iLim, 'A', 3), { cls: 'val', anchor: 'end' });
    if (ref && iRef > 1.6 * iLim) {
      b += text(x0 + 6, yI - H - 9, `${si(iRef, 'A', 3)} ↑`, { cls: 'lbl', anchor: 'start' });
    } else if (ref) {
      b += text(x0 + 8, yI - (H * iRef) / iTop - 4, si(iRef, 'A', 3), { cls: 'lbl', anchor: 'start' });
    }
    b += text(x0 + W - 12, yI + 20, `t = 0 … ${si(tEnd, 's', 3)}`, { anchor: 'end' });
  }
  // Legend
  b += wave([[x0, yI + 16], [x0 + 22, yI + 16]]) + text(x0 + 27, yI + 20, t(labels[0]), { anchor: 'start' });
  if (!ok || ref) b += wave([[x0 + 116, yI + 16], [x0 + 138, yI + 16]], 'wave2') + text(x0 + 143, yI + 20, t(labels[1]), { anchor: 'start' });
  return svg(440, 234, b, t('iz_dgAria'), { wide: true });
}

export default {
  diagram,
  id: 'inrush',
  strings,
  sections: [
    {
      title: 'sectionSetup',
      fields: [
        { key: 'mode', type: 'choice', label: 'iz_mode', default: 'plug',
          options: [
            { value: 'plug', label: 'iz_plug', set: { sup: 'dc', v: 12, c: '100u' } },
            { value: 'ramp', label: 'iz_ramp', set: { sup: 'dc', v: 12, c: '100u' } },
            { value: 'gate', label: 'iz_gate', set: { sup: 'dc', v: 48, c: '470u' } },
            { value: 'ntc', label: 'iz_ntc', set: { sup: 'ac', v: 230, c: '220u' } },
          ] },
      ],
    },
    {
      title: 'iz_secCircuit',
      fields: [
        { key: 'sup', type: 'choice', label: 'iz_supply', default: 'dc', show: isMode('ntc'),
          options: [{ value: 'dc', label: 'iz_dc' }, { value: 'ac', label: 'iz_ac' }] },
        { key: 'v', type: 'number', label: (v) => (isAc(v) ? 'iz_vrms' : 'iz_v'), default: 12, units: ['V'] },
        { key: 'c', type: 'number', label: 'iz_c', default: '100u', units: [FARAD], si: true, info: 'iz_cInfo' },
        { key: 'rsrc', type: 'number', label: 'iz_rsrc', default: 0.05, units: ['ohm'], valid: 'nonneg', info: 'iz_rsrcInfo' },
        { key: 'esr', type: 'number', label: 'iz_esr', default: 0.02, units: ['ohm'], valid: 'nonneg', info: 'iz_esrInfo' },
        { key: 'rtr', type: 'number', label: 'iz_rtr', default: 0.01, units: ['ohm'], valid: 'nonneg' },
        { key: 'iload', type: 'number', label: 'iz_iload', default: '', units: ['A'], valid: 'nonneg', optional: true, info: 'iz_iloadInfo', show: isMode('ramp', 'gate') },
      ],
    },
    {
      title: 'iz_secPlug',
      show: isMode('plug'),
      fields: [
        { key: 'l', type: 'number', label: 'iz_l', default: '1u', units: ['H'], si: true, valid: 'nonneg', optional: true, info: 'iz_lInfo' },
      ],
    },
    {
      title: 'iz_secRamp',
      show: isMode('ramp'),
      fields: [
        { key: 'tss', type: 'number', label: 'iz_tss', default: 5, units: ['ms', 'us', 's'], info: 'iz_tssInfo',
          presets: [{ label: '1 ms', value: 1, unit: 'ms' }, { label: '5 ms', value: 5, unit: 'ms' }, { label: '20 ms', value: 20, unit: 'ms' }] },
      ],
    },
    {
      title: 'iz_secGate',
      show: isMode('gate'),
      fields: [
        { key: 'ig', type: 'number', label: 'iz_igate', default: 20, units: ['uA', 'mA'], info: 'iz_igateInfo' },
        { key: 'cg', type: 'number', label: 'iz_cg', default: '47n', units: [FARAD], si: true, info: 'iz_cgInfo' },
        { key: 'cgd', type: 'number', label: 'iz_cgd', default: '500p', units: [FARAD], si: true, valid: 'nonneg', optional: true, info: 'iz_cgdInfo' },
        { key: 'it', type: 'number', label: 'iz_itarget', default: '', units: ['A'], optional: true, info: 'iz_itargetInfo' },
      ],
    },
    {
      title: 'iz_secNtc',
      show: isMode('ntc'),
      fields: [
        { key: 'ipk', type: 'number', label: 'iz_ipk', default: 20, units: ['A'], info: 'iz_ipkInfo' },
        { key: 'r25', type: 'number', label: 'iz_r25', default: '', units: ['ohm'], optional: true, info: 'iz_r25Info' },
        { key: 'iss', type: 'number', label: 'iz_iss', default: '', units: ['A'], optional: true },
        { key: 'rhot', type: 'number', label: 'iz_rhot', default: '', units: ['ohm'], optional: true, info: 'iz_rhotInfo' },
      ],
    },
  ],

  compute(v, u) {
    const base = { v: v.v, c: v.c };
    let r;
    switch (v.mode) {
      case 'ramp':
        r = softStart({ ...base, tRamp: v.tss * T_MUL[u.tss], iLoad: n0(v.iload) });
        break;
      case 'gate':
        r = gateRamp({ ...base, iGate: v.ig * (u.ig === 'mA' ? 1e-3 : 1e-6), cGate: v.cg, cgd: n0(v.cgd), iLoad: n0(v.iload), iTarget: v.it });
        break;
      case 'ntc':
        r = ntcLimiter({ vPk: vPeak(v), c: v.c, iTarget: v.ipk, rSrc: n0(v.rsrc) + n0(v.rtr), esr: n0(v.esr), r25: v.r25, iSs: v.iss, rHot: v.rhot });
        r.vPk = vPeak(v);
        r.warnings.push('iz_hot');
        return r;
      default:
        r = hotPlug({ ...base, rSrc: n0(v.rsrc), esr: n0(v.esr), rTrace: n0(v.rtr), l: n0(v.l) });
        if (r.ok) r.warnings = r.vMax > 1.2 * v.v ? ['iz_overshoot'] : [];
        return r;
    }
    const rs = rSeries(v);
    r.iBare = rs > 0 ? v.v / rs : Infinity;
    r.warnings = r.energyFet > 0.05 || r.pPeak > 20 ? ['iz_soa'] : [];
    return r;
  },

  render(r, v) {
    if (!r.ok) return invalid(r.errors);
    const A = (x) => (Number.isFinite(x) ? si(x, 'A', 3) : '∞');
    const refs = ['TI SLVA670 “Managing Inrush Current”', 'TI TPS2490 datasheet (SLVS503), gate capacitor dV/dt control',
      'TDK/EPCOS AN “NTC thermistors for inrush current limiting”', 'Linear Technology AN88'];
    if (v.mode === 'plug') {
      return heroes([['iz_ipeak', siHtml(r.iPeak, 'A', 3)], ['iz_energy', siHtml(r.energy, 'J', 3)]])
        + messages('warn', r.warnings)
        + block('results', rows([
          ['iz_rTot', si(r.r, 'Ω', 3)],
          ['iz_iR', A(r.iPeakR)],
          ['iz_response', t(`iz_type_${r.type}`)],
          r.type !== 'rc' && ['iz_zeta', fmt(r.zeta, 3)],
          r.type !== 'rc' && ['iz_tpk', si(r.tPeak, 's', 3)],
          ['iz_vmax', si(r.vMax, 'V', 4)],
          r.r > 0 && ['iz_tau', si(r.tau, 's', 3)],
          r.type === 'rc' && ['iz_settle', si(5 * r.tau, 's', 3)],
        ]))
        + formulaBlock([
          'R = R_source + ESR + R_trace       I_pk = V/R   (no inductance)',
          'with L: α = R/(2L), ω0 = 1/√(L·C), ζ = α/ω0',
          'ζ < 1: i(t) = V/(ω_d·L)·e^(−αt)·sin(ω_d·t),  t_pk = atan(ω_d/α)/ω_d',
          '       V_C,max = V·(1 + e^(−απ/ω_d))',
          'E = ½·C·V²  (stored; the same energy is lost in R)',
        ], 'iz_note', refs);
    }
    if (v.mode === 'ntc') {
      return heroes([
        ['iz_r25min', r.r25Min > 0 ? siHtml(r.r25Min, 'Ω', 3) : '—'],
        ['iz_withNtc', siHtml(r.iPeak, 'A', 3)],
      ])
        + messages('warn', r.warnings)
        + block('results', rows([
          ['iz_vpk', si(r.vPk, 'V', 4)],
          ['iz_rTot', si(r.rUse + r.rSeries, 'Ω', 3)],
          ['iz_bare', A(r.iPeakBare)],
          ['iz_ntcE', si(r.energy, 'J', 3), true],
          ['iz_tau', si(r.tau, 's', 3)],
          ['iz_settle', si(5 * r.tau, 's', 3)],
          r.pSs !== undefined && ['iz_pss', si(r.pSs, 'W', 3)],
        ]))
        + formulaBlock([
          'V_pk = √2·V_rms  (rectified AC)',
          'R25,min = V_pk / I_pk − (R_source + ESR)',
          'I_pk = V_pk / (R25 + R_source + ESR)',
          'E_NTC ≈ ½·C·V_pk²      τ = R·C',
          'P_ss = I_ss²·R_hot',
        ], 'iz_note', refs);
    }
    const gate = v.mode === 'gate';
    return heroes([
      ['iz_ipeak', siHtml(r.iPeak, 'A', 3)],
      gate ? ['iz_tRamp', siHtml(r.tRamp, 's', 3)] : ['iz_slew', `${fmt(r.slew / 1000, 3)} <span class="u">V/ms</span>`],
    ])
      + messages('warn', r.warnings)
      + block('results', rows([
        ['iz_icap', si(r.iCap, 'A', 3)],
        gate && ['iz_slew', `${fmt(r.slew / 1000, 3)} V/ms`],
        r.cGateFor !== undefined && ['iz_cgFor', r.cGateFor > 0 ? si(r.cGateFor, 'F', 3) : t('iz_cgNeg'), true],
        ['iz_efet', si(r.energyFet, 'J', 3)],
        ['iz_pavg', si(r.pAvg, 'W', 3)],
        ['iz_ppk', si(r.pPeak, 'W', 3)],
        ['iz_energy', si(r.energy, 'J', 3)],
        ['iz_bare', A(r.iBare)],
      ]))
      + formulaBlock(gate
        ? ['dV/dt = I_GATE / (C_G + C_GD)      t_ramp = V / (dV/dt)',
          'I_inrush = C·dV/dt (+ I_load)      C_G = I_GATE·C/I_target − C_GD',
          'E_FET = ½·C·V² + V·I_load·t_ramp/6      P_avg = E_FET / t_ramp']
        : ['dV/dt = V / t_ramp      I_C = C·dV/dt',
          'I_pk = I_C + I_load   (resistive load: I_load ∝ V)',
          'E_FET = ½·C·V² + V·I_load·t_ramp/6      P_avg = E_FET / t_ramp',
          'P_pk = V·I_C   (start of the ramp)'],
      'iz_note', refs);
  },
};

