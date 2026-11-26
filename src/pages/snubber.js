import { parasitics, snubberDesign, stepResponse } from '../engine/snubber.js';
import { nearestStandard } from '../engine/eseries.js';
import { powerRating } from '../engine/circuit.js';
import { heroes, rows, block, steps, messages, invalid } from '../ui/calculator.js';
import { tx } from '../ui/math.js';
import { fmt, si, siHtml } from '../ui/format.js';
import { svg, text, path, axes, wave, twoTerm, wire, node, ground, mosfet } from '../ui/svg.js';
import { t } from '../i18n.js';

const FARAD = 'farad'; // 'F' would render as °F

const strings = {
  tr: {
    sn_mode: 'Parazitikleri nasıl bulalım?',
    sn_meas: 'Çınlama ölçümünden',
    sn_known: 'L ve C biliniyor',
    sn_secMeas: 'Çınlama ölçümü',
    sn_f1: 'Çınlama frekansı f1 (eklemeden)',
    sn_f1Info: 'Anahtar düğümündeki (ör. kapanmada Vds) sönümsüz çınlamanın frekansı. Osiloskopu kısa toprak yaylı probla ve yeterli bant genişliğiyle kullanın.',
    sn_f2: 'Çınlama frekansı f2 (Cadd ile)',
    sn_cadd: 'Eklenen test kondansatörü Cadd',
    sn_caddInfo: 'Anahtarın uçlarına doğrudan lehimlenen düşük kayıplı (C0G/film) kondansatör. En iyi doğruluk, frekans yaklaşık yarıya indiğinde elde edilir; bu durumda Cadd ≈ 3·Cpar olur.',
    sn_secKnown: 'Parazitik değerler',
    sn_lpar: 'Döngü endüktansı Lpar',
    sn_lparInfo: 'Anahtarlama döngüsündeki toplam kaçak endüktans (iz, kılıf bacakları, trafo kaçak endüktansı).',
    sn_cpar: 'Düğüm kapasitesi Cpar',
    sn_cparInfo: 'Anahtar düğümündeki toplam kapasite: Coss, diyot kapasitesi, sargı ve iz kapasitesi.',
    sn_secDesign: 'Snubber seçimi',
    sn_zeta: 'Direnç seçimi (sönüm)',
    sn_z05: 'R = Z0 (ζ = 0,5)',
    sn_z07: 'R = 0,71·Z0 (ζ = 0,7)',
    sn_z1: 'R = Z0/2 (ζ = 1)',
    sn_zetaInfo: 'ζ = (1/2R)·√(L/C). R = Z0 klasik ve az kayıplı başlangıçtır; daha küçük R daha güçlü sönüm verir ama yine aynı C·V²·f gücünü harcar.',
    sn_k: 'Csnub / Cpar oranı',
    sn_kInfo: 'Snubber kondansatörü, parazitik kapasiteden büyük olmalı (tipik 2–4 kat) ki direnç çınlama frekansında etkili olsun. Büyük değer sönümü artırır ama dirençteki gücü de artırır.',
    sn_v: 'Anahtarlanan gerilim',
    sn_vInfo: 'Snubber kondansatörünün her geçişte dolup boşaldığı gerilim (çoğunlukla anahtarın kapalı gerilimi).',
    sn_fsw: 'Anahtarlama frekansı',
    sn_ioff: 'Kapanmada kesilen akım',
    sn_ioffInfo: 'İsteğe bağlı: sönümsüz devrede gerilim aşımı yaklaşık I·Z0 olur (Lpar’daki enerji Cpar’a aktarılır).',
    sn_r: 'Snubber direnci R',
    sn_cs: 'Snubber kondansatörü Cs',
    sn_par: 'Parazitikler',
    sn_x: 'Frekans oranı x = f1/f2',
    sn_cparR: 'Düğüm kapasitesi Cpar',
    sn_lparR: 'Döngü endüktansı Lpar',
    sn_z0: 'Karakteristik empedans Z0 = √(L/C)',
    sn_f0: 'Çınlama frekansı',
    sn_design: 'Snubber',
    sn_e12: 'En yakın E12 değeri',
    sn_csMin: 'En küçük Cs (köşe frekansı = f_ring, AN11160)',
    sn_tau: 'Zaman sabiti R·Cs',
    sn_p: 'Dirençte harcanan güç C·V²·f',
    sn_energy: 'Periyot başına enerji',
    sn_rating: 'Önerilen direnç gücü (2× pay)',
    sn_ratingBig: '2 W üzeri: güç direnci veya paralel dirençler',
    sn_spike: 'Snubbersız gerilim aşımı ≈ I·Z0',
    sn_needVf: 'Güç için gerilim ve frekansı girin.',
    warn_sn_xSmall: 'Frekans çok az değişmiş: ölçüm hatası büyür. Cadd’yi frekans yaklaşık yarıya inecek kadar büyütün.',
    warn_sn_xLarge: 'Frekans çok düşmüş: Cadd parazitik kapasiteden çok büyük, sonuç ölçüm hatasına duyarlı. Daha küçük bir Cadd ile tekrar ölçün.',
    warn_sn_tauLong: 'R·Cs zaman sabiti periyoda göre uzun: kondansatör her geçişte tam dolup boşalamaz ve snubber anahtarlamayı yavaşlatır. Cs’yi küçültün.',
    warn_sn_kSmall: 'Cs, parazitik kapasiteden küçük: direnç çınlama frekansında yeterince etkili olmaz.',
    err_sn_f2: 'Cadd eklendikten sonraki frekans (f2), ilk frekanstan (f1) küçük olmalı.',
    sn_note: 'Parazitik L ve C, iki ölçülen frekanstan bulunur (Nexperia AN11160). Değerler bir başlangıç noktasıdır: snubber’ı takıp dalga şeklini ölçün, gerekirse R’yi ince ayarlayın. Direnç düşük endüktanslı olmalı (kalın film SMD, tel sargılı değil) ve döngüye anahtarın hemen yanına yerleştirilmelidir. Güç, R’den bağımsızdır ve ½·C·V² dolma + ½·C·V² boşalma enerjisinden gelir.',
    sn_dgAria: 'Anahtar düğümü gerilimi: snubbersız çınlama ve RC snubber ile sönümlü yanıt; anahtar, parazitik L ve C ile RC snubber devresi',
    sn_dgBare: 'snubbersız',
    sn_dgSnub: 'RC snubber ile',
  },
  en: {
    sn_mode: 'How to find the parasitics?',
    sn_meas: 'From ringing measurement',
    sn_known: 'L and C known',
    sn_secMeas: 'Ringing measurement',
    sn_f1: 'Ringing frequency f1 (as built)',
    sn_f1Info: 'Frequency of the undamped ringing at the switch node (e.g. Vds at turn-off). Use a short probe ground spring and enough bandwidth.',
    sn_f2: 'Ringing frequency f2 (with Cadd)',
    sn_cadd: 'Added test capacitor Cadd',
    sn_caddInfo: 'A low-loss (C0G/film) capacitor soldered straight across the switch. Accuracy is best when the frequency roughly halves, i.e. Cadd ≈ 3·Cpar.',
    sn_secKnown: 'Parasitic values',
    sn_lpar: 'Loop inductance Lpar',
    sn_lparInfo: 'Total stray inductance of the switching loop (traces, package leads, transformer leakage).',
    sn_cpar: 'Node capacitance Cpar',
    sn_cparInfo: 'Total capacitance at the switch node: Coss, diode capacitance, winding and trace capacitance.',
    sn_secDesign: 'Snubber choice',
    sn_zeta: 'Resistor choice (damping)',
    sn_z05: 'R = Z0 (ζ = 0.5)',
    sn_z07: 'R = 0.71·Z0 (ζ = 0.7)',
    sn_z1: 'R = Z0/2 (ζ = 1)',
    sn_zetaInfo: 'ζ = (1/2R)·√(L/C). R = Z0 is the classic, low-loss starting point; a smaller R damps harder but still dissipates the same C·V²·f.',
    sn_k: 'Ratio Csnub / Cpar',
    sn_kInfo: 'The snubber capacitor must be larger than the parasitic capacitance (typically 2–4×) so that the resistor acts at the ringing frequency. More capacitance damps better but raises the resistor power.',
    sn_v: 'Switched voltage',
    sn_vInfo: 'The voltage the snubber capacitor charges to and discharges from on every transition (usually the switch off-state voltage).',
    sn_fsw: 'Switching frequency',
    sn_ioff: 'Current interrupted at turn-off',
    sn_ioffInfo: 'Optional: without damping the overshoot is about I·Z0 (the energy in Lpar is moved into Cpar).',
    sn_r: 'Snubber resistor R',
    sn_cs: 'Snubber capacitor Cs',
    sn_par: 'Parasitics',
    sn_x: 'Frequency ratio x = f1/f2',
    sn_cparR: 'Node capacitance Cpar',
    sn_lparR: 'Loop inductance Lpar',
    sn_z0: 'Characteristic impedance Z0 = √(L/C)',
    sn_f0: 'Ringing frequency',
    sn_design: 'Snubber',
    sn_e12: 'Nearest E12 value',
    sn_csMin: 'Minimum Cs (corner = f_ring, AN11160)',
    sn_tau: 'Time constant R·Cs',
    sn_p: 'Resistor power C·V²·f',
    sn_energy: 'Energy per period',
    sn_rating: 'Suggested resistor rating (2× margin)',
    sn_ratingBig: 'above 2 W: power resistor or resistors in parallel',
    sn_spike: 'Overshoot without snubber ≈ I·Z0',
    sn_needVf: 'Enter the voltage and frequency for the power.',
    warn_sn_xSmall: 'The frequency barely moved, so the measurement error is large. Increase Cadd until the frequency roughly halves.',
    warn_sn_xLarge: 'The frequency dropped a lot: Cadd is much larger than the parasitic capacitance and the result is sensitive to measurement error. Measure again with a smaller Cadd.',
    warn_sn_tauLong: 'The R·Cs time constant is long compared with the period: the capacitor cannot fully charge and discharge on each transition, and the snubber slows the switching. Reduce Cs.',
    warn_sn_kSmall: 'Cs is smaller than the parasitic capacitance: the resistor will not act effectively at the ringing frequency.',
    err_sn_f2: 'The frequency with Cadd (f2) must be lower than the original frequency (f1).',
    sn_note: 'The parasitic L and C follow from the two measured frequencies (Nexperia AN11160). Treat the values as a starting point: fit the snubber, measure the waveform and fine-tune R if needed. Use a low-inductance resistor (thick-film SMD, not wirewound) placed right at the switch. The power does not depend on R: it is ½·C·V² on charge plus ½·C·V² on discharge.',
    sn_dgAria: 'Switch-node voltage: ringing without a snubber and the damped response with the RC snubber; the switch with parasitic L and C and the RC snubber',
    sn_dgBare: 'no snubber',
    sn_dgSnub: 'with RC snubber',
  },
};

const ZETA = { '0.5': 0.5, '0.707': Math.SQRT1_2, 1: 1 };
const FMUL = { Hz: 1, kHz: 1e3, MHz: 1e6 };
const isMeas = (v) => v.mode !== 'known';
const val = (x, unit) => (Number.isFinite(x) && x > 0 ? si(x, unit, 3) : '?');

/**
 * Live picture. Top: the normalised switch-node step response without a
 * snubber (dashed, rings at f_ring) and with the RC snubber (solid), computed
 * from the actual R/Z0 and Cs/Cpar ratios. Bottom: the switch with its loop
 * inductance and node capacitance (dashed: parasitic) and the RC snubber.
 */
function diagram(v, u, r) {
  const x0 = 44;
  const y0 = 112;
  const W = 356;
  const unit = 42; // px per V (normalised)
  const periods = 5;
  const rn = r ? r.r / r.z0 : 1;
  const kc = r ? r.cs / r.cPar : 3;
  const tEnd = periods * 2 * Math.PI; // L = C = 1 → ω0 = 1
  const bare = stepResponse({ l: 1, cp: 1, tEnd, n: 300 });
  const snub = stepResponse({ l: 1, cp: 1, r: rn, cs: kc, tEnd, n: 300 });
  const pts = (arr) => arr.map(([tt, vv]) => [x0 + (W * tt) / tEnd, y0 - unit * Math.max(-0.2, Math.min(2.1, Number.isFinite(vv) ? vv : 0))]);
  let b = axes(x0, y0, W + 8, 2.1 * unit + 8, { xLabel: 't' })
    + path(`M${x0},${y0 - unit}H${x0 + W}`, 'ext')
    + text(x0 - 5, y0 - unit + 4, 'V', { cls: 'sym', anchor: 'end' })
    + text(x0 - 5, y0 + 4, '0', { anchor: 'end' })
    + wave(pts(bare), 'wave2') + wave(pts(snub));
  // One ringing period marked on the time axis.
  const xT = x0 + W / periods;
  b += path(`M${x0},${y0 + 4}V${y0 + 10}M${xT},${y0 + 4}V${y0 + 10}M${x0},${y0 + 7}H${xT}`, 'dimline')
    + text(xT + 4, y0 + 12, `1/f = ${val(r ? 1 / r.f0 : NaN, 's')}`, { cls: 'val', anchor: 'start' });
  // Legend
  b += wave([[250, 14], [272, 14]], 'wave2') + text(277, 18, t('sn_dgBare'), { anchor: 'start' })
    + wave([[250, 30], [272, 30]]) + text(277, 34, t('sn_dgSnub'), { anchor: 'start' });

  // Schematic
  const yT = 150;
  const yG = 214;
  b += twoTerm('V', 52, yT, 52, yG, { name: 'V', value: v.v > 0 ? si(v.v, 'V', 3) : undefined, flip: true })
    + twoTerm('L', 52, yT, 130, yT, { name: 'Lpar', value: val(r?.lPar, 'H'), dashed: true })
    + wire([130, yT], [330, yT]) + node(130, yT) + node(170, yT) + node(244, yT)
    + wire([170, yT], [170, 156]) + mosfet(158, 182) + wire([170, 208], [170, yG])
    + twoTerm('C', 244, yT, 244, yG, { name: 'Cpar', value: val(r?.cPar, 'F'), dashed: true })
    + twoTerm('R', 330, yT, 330, 182, { name: 'R', value: val(r?.r, 'Ω'), hi: !!r })
    + twoTerm('C', 330, 182, 330, yG, { name: 'Cs', value: val(r?.cs, 'F'), hi: !!r })
    + wire([52, yG], [330, yG]) + node(170, yG) + node(244, yG) + ground(200, yG);
  return svg(440, 236, b, t('sn_dgAria'), { wide: true });
}

export default {
  diagram,
  id: 'snubber',
  strings,
  sections: [
    {
      title: 'sectionSetup',
      fields: [
        { key: 'mode', type: 'choice', label: 'sn_mode', default: 'meas',
          options: [{ value: 'meas', label: 'sn_meas' }, { value: 'known', label: 'sn_known' }] },
      ],
    },
    {
      title: 'sn_secMeas',
      show: isMeas,
      fields: [
        { key: 'f1', type: 'number', label: 'sn_f1', default: 50, units: ['MHz', 'kHz'], info: 'sn_f1Info' },
        { key: 'f2', type: 'number', label: 'sn_f2', default: 25, units: ['MHz', 'kHz'] },
        { key: 'cadd', type: 'number', label: 'sn_cadd', default: '1n', units: [FARAD], si: true, info: 'sn_caddInfo' },
      ],
    },
    {
      title: 'sn_secKnown',
      show: (v) => !isMeas(v),
      fields: [
        { key: 'lpar', type: 'number', label: 'sn_lpar', default: '30n', units: ['H'], si: true, info: 'sn_lparInfo' },
        { key: 'cpar', type: 'number', label: 'sn_cpar', default: '330p', units: [FARAD], si: true, info: 'sn_cparInfo' },
      ],
    },
    {
      title: 'sn_secDesign',
      fields: [
        { key: 'zeta', type: 'choice', label: 'sn_zeta', default: '0.5', info: 'sn_zetaInfo',
          options: [{ value: '0.5', label: 'sn_z05' }, { value: '0.707', label: 'sn_z07' }, { value: '1', label: 'sn_z1' }] },
        { key: 'k', type: 'number', label: 'sn_k', default: 3, info: 'sn_kInfo',
          presets: [2, 3, 4].map((x) => ({ label: `×${x}`, value: x })) },
        { key: 'v', type: 'number', label: 'sn_v', default: 48, units: ['V'], optional: true, info: 'sn_vInfo' },
        { key: 'f', type: 'number', label: 'sn_fsw', default: 100, units: ['kHz', 'MHz', 'Hz'], optional: true },
        { key: 'ioff', type: 'number', label: 'sn_ioff', default: '', units: ['A'], optional: true, info: 'sn_ioffInfo' },
      ],
    },
  ],

  compute(v, u) {
    let lPar;
    let cPar;
    let x;
    if (isMeas(v)) {
      const p = parasitics({ f1: v.f1 * FMUL[u.f1], f2: v.f2 * FMUL[u.f2], cAdd: v.cadd });
      if (p.error) return { ok: false, errors: [p.error] };
      ({ lPar, cPar, x } = p);
    } else {
      lPar = v.lpar;
      cPar = v.cpar;
    }
    const r = snubberDesign({
      lPar, cPar, zeta: ZETA[v.zeta] ?? 0.5, kC: v.k,
      v: v.v, fsw: v.f * (FMUL[u.f] ?? 1e3), iOff: v.ioff,
    });
    if (x !== undefined) {
      r.x = x;
      if (x < 1.2) r.warnings.unshift('sn_xSmall');
      if (x > 3) r.warnings.unshift('sn_xLarge');
    }
    return r;
  },

  render(r, v, u) {
    if (!r.ok) return invalid(r.errors);
    const rE = nearestStandard(r.r, 'E12').nearest;
    const cE = nearestStandard(r.cs, 'E12').nearest;
    const rating = r.p !== undefined ? powerRating(r.p) : undefined;
    // Calculation steps: the parasitics (from the two ringing frequencies, or as entered), then R, Cs and the resistor power.
    const q = (x, unit) => tx(si(x, unit));
    const n = (x) => tx(fmt(x, 4));
    const meas = r.x !== undefined;
    // x² − 1 magnifies a rounded x (most for x near 1), so x keeps six digits here.
    const x = meas && tx(fmt(r.x, 6));
    const f1 = meas && q(v.f1 * FMUL[u.f1], 'Hz');
    const lPar = q(r.lPar, 'H');
    const cPar = q(r.cPar, 'F');
    const worked = steps([
      meas && { label: 'sn_x', sym: 'x = \\frac{f_1}{f_2}', num: `\\frac{${f1}}{${q(v.f2 * FMUL[u.f2], 'Hz')}}`, res: x },
      meas && { label: 'sn_cparR', sym: 'C_{par} = \\frac{C_{add}}{x^{2} − 1}', num: `\\frac{${q(v.cadd, 'F')}}{{${x}}^{2} − 1}`, res: cPar },
      meas && { label: 'sn_lparR', sym: 'L_{par} = \\frac{1}{{(2π \\cdot f_1)}^{2} \\cdot C_{par}}', num: `\\frac{1}{{(2π \\cdot ${f1})}^{2} \\cdot ${cPar}}`, res: lPar },
      { label: 'sn_z0', sym: 'Z_0 = \\sqrt{\\frac{L_{par}}{C_{par}}}', num: `\\sqrt{\\frac{${lPar}}{${cPar}}}`, res: q(r.z0, 'Ω') },
      !meas && { label: 'sn_f0', sym: 'f_{ring} = \\frac{1}{2π \\cdot \\sqrt{L_{par} \\cdot C_{par}}}', num: `\\frac{1}{2π \\cdot \\sqrt{${lPar} \\cdot ${cPar}}}`, res: q(r.f0, 'Hz') },
      { label: 'sn_r', sym: 'R = \\frac{Z_0}{2 \\cdot ζ}', num: `\\frac{${q(r.z0, 'Ω')}}{2 \\cdot ${n(ZETA[v.zeta] ?? 0.5)}}`, res: q(r.r, 'Ω') },
      { label: 'sn_cs', sym: 'C_s = k \\cdot C_{par}', num: `${n(v.k)} \\cdot ${cPar}`, res: q(r.cs, 'F') },
      r.p !== undefined && { label: 'sn_p', sym: 'P_R = C_s \\cdot V^{2} \\cdot f_{sw}',
        num: `${q(r.cs, 'F')} \\cdot {(${q(v.v, 'V')})}^{2} \\cdot ${q(v.f * (FMUL[u.f] ?? 1e3), 'Hz')}`, res: q(r.p, 'W') },
      r.vSpike !== undefined && { label: 'sn_spike', sym: 'ΔV = I \\cdot Z_0', num: `${q(v.ioff, 'A')} \\cdot ${q(r.z0, 'Ω')}`, res: q(r.vSpike, 'V') },
    ], {
      note: 'sn_note',
      where: [
        meas && ['f_1', 'sn_f1', 'f1'], meas && ['f_2', 'sn_f2', 'f2'], meas && ['C_{add}', 'sn_cadd', 'cadd'],
        !meas && ['L_{par}', 'sn_lpar', 'lpar'], !meas && ['C_{par}', 'sn_cpar', 'cpar'],
        ['ζ', 'sn_zeta', 'zeta'], ['k', 'sn_k', 'k'],
        r.p !== undefined && ['V', 'sn_v', 'v'], r.p !== undefined && ['f_{sw}', 'sn_fsw', 'f'], r.vSpike !== undefined && ['I', 'sn_ioff', 'ioff'],
      ],
      refs: [
        'Nexperia AN11160 “Designing RC snubbers”',
        'P. C. Todd, “Snubber Circuits: Theory, Design and Application”, Unitrode SEM-900 (1993)',
        'TI SLVUBB4B (Power Stage Designer, RC snubber)',
      ],
    });
    return heroes([
      ['sn_r', siHtml(r.r, 'Ω', 3), `${t('sn_e12')}: ${si(rE, 'Ω', 3)}`],
      ['sn_cs', siHtml(r.cs, 'F', 3), `${t('sn_e12')}: ${si(cE, 'F', 3)}`],
    ])
      + messages('warn', r.warnings)
      + worked
      + block('sn_par', rows([
        r.x !== undefined && ['sn_x', fmt(r.x, 4)],
        ['sn_cparR', si(r.cPar, 'F')],
        ['sn_lparR', si(r.lPar, 'H')],
        ['sn_z0', si(r.z0, 'Ω')],
        ['sn_f0', si(r.f0, 'Hz')],
        r.vSpike !== undefined && ['sn_spike', si(r.vSpike, 'V', 3)],
      ]))
      + block('sn_design', rows([
        ['sn_csMin', si(r.csMin, 'F', 3)],
        ['sn_tau', si(r.tau, 's', 3)],
        r.p !== undefined ? ['sn_p', si(r.p, 'W', 3), true] : ['sn_p', t('sn_needVf')],
        r.energy !== undefined && ['sn_energy', si(r.energy, 'J', 3)],
        r.p !== undefined && ['sn_rating', rating ? `${fmt(rating, 3)} W` : t('sn_ratingBig')],
      ]));
  },
};
