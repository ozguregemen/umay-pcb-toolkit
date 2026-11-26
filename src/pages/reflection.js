import { gammaFromLoad, fromGammaMag, gammaFromVswr, gammaFromReturnLoss } from '../engine/rf.js';
import { heroes, rows, block, steps } from '../ui/calculator.js';
import { tx } from '../ui/math.js';
import { fmt, fixed } from '../ui/format.js';
import { svg, wire, rect, circle, path, text, axes, wave, dimH, dimV, blockArrow } from '../ui/svg.js';
import { t } from '../i18n.js';

const strings = {
  tr: {
    rf_mode: 'Girdi',
    rf_load: 'Yük empedansı',
    rf_vswr: 'VSWR',
    rf_rl: 'Geri dönüş kaybı',
    rf_gamma: '|Γ|',
    rf_z0: 'Hat empedansı (Z₀)',
    rf_r: 'Yük direnci (R)',
    rf_x: 'Yük reaktansı (X)',
    rf_xInfo: 'Endüktif yük için pozitif, kapasitif yük için negatif.',
    rf_vswrIn: 'VSWR',
    rf_rlIn: 'Geri dönüş kaybı',
    rf_gIn: 'Yansıma katsayısı genliği |Γ|',
    rf_gammaC: 'Yansıma katsayısı Γ',
    rf_angle: 'Γ açısı',
    rf_ml: 'Uyumsuzluk kaybı',
    rf_refl: 'Yansıyan güç',
    rf_trans: 'Yüke giden güç',
    rf_note: 'Γ, hattın sonundaki uyumsuzluğun ne kadarının geri yansıdığını gösterir. Dijital sinyallerde Γ aşma/çınlama olarak görünür (ör. 50 Ω hattın sonunda açık devre Γ = +1, gerilim ikiye katlanır). RF’de genellikle geri dönüş kaybı > 10 dB (VSWR < 2) iyi, > 20 dB (VSWR < 1,22) çok iyi kabul edilir.',
    rf_dgAria: 'Kaynak, Z₀ iletim hattı ve ZL yükü; gelen ve yansıyan dalga, hat boyunca duran dalga zarfı',
    rf_dgSource: 'kaynak',
    rf_dgInc: 'gelen dalga V⁺',
    rf_dgRefl: 'yansıyan dalga Γ·V⁺',
    rf_dgNone: 'yansıma yok (uyumlu)',
    rf_dgEnv: '|V| hat boyunca (duran dalga)',
  },
  en: {
    rf_mode: 'Input',
    rf_load: 'Load impedance',
    rf_vswr: 'VSWR',
    rf_rl: 'Return loss',
    rf_gamma: '|Γ|',
    rf_z0: 'Line impedance (Z₀)',
    rf_r: 'Load resistance (R)',
    rf_x: 'Load reactance (X)',
    rf_xInfo: 'Positive for an inductive load, negative for a capacitive one.',
    rf_vswrIn: 'VSWR',
    rf_rlIn: 'Return loss',
    rf_gIn: 'Reflection coefficient magnitude |Γ|',
    rf_gammaC: 'Reflection coefficient Γ',
    rf_angle: 'Angle of Γ',
    rf_ml: 'Mismatch loss',
    rf_refl: 'Reflected power',
    rf_trans: 'Power delivered to the load',
    rf_note: 'Γ tells how much of a mismatch at the end of the line is reflected back. On digital signals Γ appears as overshoot/ringing (e.g. an open end on a 50 Ω line gives Γ = +1, doubling the voltage). In RF, return loss > 10 dB (VSWR < 2) is usually considered good and > 20 dB (VSWR < 1.22) very good.',
    rf_dgAria: 'Source, Z₀ transmission line and load ZL; incident and reflected waves and the standing-wave envelope along the line',
    rf_dgSource: 'source',
    rf_dgInc: 'incident wave V⁺',
    rf_dgRefl: 'reflected wave Γ·V⁺',
    rf_dgNone: 'no reflection (matched)',
    rf_dgEnv: '|V| along the line (standing wave)',
  },
};

/**
 * Live picture: source → Z₀ line → ZL. The incident wave is a fixed arrow;
 * the reflected one shrinks with |Γ|. Below, |V| along the line: it swings
 * between Vmax = 1 + |Γ| and Vmin = 1 − |Γ| (VSWR = Vmax/Vmin) and repeats
 * every λ/2. Without a load (VSWR/RL/|Γ| input) the phase of Γ is taken as 0.
 */
function diagram(v, u, r) {
  const g = r ? r.gamma : 0.3;
  const load = v.mode === 'load';
  const num = (x) => (Number.isFinite(x) ? fmt(x, 4) : '?');
  const x1 = 90;
  const x2 = 350;
  // Source, line (ribbon between two conductors) and load.
  let b = wire([40, 40], [40, 46]) + circle(40, 58, 12, 'comp') + path('M33,58c2.3,-6 4.7,-6 7,0s4.7,6 7,0', 'wire') + wire([40, 70], [40, 76])
    + text(40, 31, t('rf_dgSource'))
    + rect(x1, 40, x2 - x1, 36, 'soft')
    + wire([40, 40], [380, 40], [380, 44]) + wire([40, 76], [380, 76], [380, 72])
    + rect(373, 44, 14, 28, 'comp') + text(392, 62, 'ZL', { cls: 'name', anchor: 'start' })
    + text((x1 + x2) / 2, 62, load ? `Z₀ = ${num(v.z0)} Ω` : 'Z₀', { cls: 'val' });
  if (load) {
    const x = Number.isFinite(v.x) ? v.x : NaN;
    b += text(432, 15, `ZL = ${num(v.r)} ${x < 0 ? '−' : '+'} j${num(Math.abs(x))} Ω`, { cls: 'val', anchor: 'end' });
  }
  // Incident and reflected waves.
  b += text(x1 + 6, 16, t('rf_dgInc'), { anchor: 'start' }) + blockArrow(x1 + 6, x2 - 6, 28, 7, 'arrow flow');
  if (g >= 0.005) {
    const len = Math.max(16, (x2 - x1 - 12) * g);
    const tail = x2 - 6 - len;
    const arr = blockArrow(x2 - 6, tail, 90, 2 + 5 * g, 'zone') + blockArrow(x2 - 6, tail, 90, 2 + 5 * g, 'wire hi');
    b += arr + text(x2 - 6, 113, t('rf_dgRefl'), { anchor: 'end' })
      + text(tail - 8, 94, `|Γ| = ${r ? fmt(g, 3) : '?'}`, { cls: 'val', anchor: 'end' });
  } else {
    b += text(x2 - 6, 94, '|Γ| = 0', { cls: 'val', anchor: 'end' }) + text(x2 - 6, 113, t('rf_dgNone'), { anchor: 'end' });
  }
  // Standing-wave envelope |V(d)| / |V⁺| = |1 + Γ·e^(−j2βd)|, d from the load.
  const y0 = 212;
  const k = 34; // px per unit of |V⁺|
  const pxPerLambda = 208;
  const phi = load && r?.angle !== null && r?.angle !== undefined ? (r.angle * Math.PI) / 180 : 0;
  const pts = [];
  for (let i = 0; i <= 130; i++) {
    const x = x1 + ((x2 - x1) * i) / 130;
    const d = (x2 - x) / pxPerLambda;
    const a = phi - 4 * Math.PI * d;
    pts.push([x, y0 - k * Math.sqrt(Math.max(0, 1 + g * g + 2 * g * Math.cos(a)))]);
  }
  const yMax = y0 - k * (1 + g);
  const yMin = y0 - k * (1 - g);
  b += text(x1 + 6, 130, t('rf_dgEnv'), { anchor: 'start' })
    + axes(x1, y0, x2 - x1, 74)
    + path(`M${x1},${yMax}H${x2 + 8}M${x1},${yMin}H${x2 + 8}`, 'ext')
    + text(x1 - 5, yMax - 2, 'Vmax', { anchor: 'end' }) + text(x1 - 5, yMin + 11, 'Vmin', { anchor: 'end' })
    + wave(pts);
  if (g >= 0.01) b += dimV(yMax, yMin, 362, '');
  const mid = (yMax + yMin) / 2;
  const swr = !r ? '?' : r.vswr < 1000 ? `${fixed(r.vswr, 2)} : 1` : r.vswr < 1e6 ? `${fmt(r.vswr, 3)} : 1` : '∞';
  b += text(370, mid - 1, 'VSWR', { anchor: 'start' }) + text(370, mid + 12, swr, { cls: 'val', anchor: 'start' });
  // The pattern repeats every λ/2: mark two neighbouring minima.
  if (g >= 0.02) {
    const half = pxPerLambda / 2;
    let dm = ((pxPerLambda * (phi - Math.PI)) / (4 * Math.PI)) % half;
    if (dm < 0) dm += half;
    const xa = x2 - dm;
    b += dimH(xa - half, xa, 224, 'λ/2', { below: true, extFrom: yMin });
  }
  return svg(440, 240, b, t('rf_dgAria'), { wide: true });
}

const is = (m) => (v) => v.mode === m;

/**
 * Calculation steps: |Γ| from the chosen input (for a load, the complex Γ
 * first), then every figure that follows from |Γ|. A figure that is the input
 * itself, or infinite (matched or fully reflecting), has no step.
 */
function worked(r, v) {
  const n = (x, sig = 5) => tx(fmt(x || 0, sig).replace('-', '−'));
  const dB = (x) => tx(`${fmt(x || 0, 4).replace('-', '−')} dB`);
  const ohm = (x) => tx(`${fmt(x, 5)} Ω`);
  // Near total reflection 1 − |Γ| is tiny: show enough digits of |Γ| for it.
  const gs = Math.min(12, Math.max(5, Math.ceil(-Math.log10(Math.max(1 - r.gamma, 1e-12))) + 4));
  const G = n(r.gamma, gs);
  const list = [];
  if (v.mode === 'load') {
    const { re, im } = r.load;
    const reactive = v.x !== 0;
    const sign = (x) => (x < 0 ? '−' : '+');
    const zl = reactive ? `${ohm(v.r)} ${sign(v.x)} j ${ohm(Math.abs(v.x))}` : ohm(v.r);
    list.push(
      { label: 'rf_gammaC', sym: 'Γ = \\frac{Z_L − Z_0}{Z_L + Z_0}', num: `\\frac{${zl} − ${ohm(v.z0)}}{${zl} + ${ohm(v.z0)}}`,
        res: reactive ? `${n(re, gs)} ${sign(im)} j ${n(Math.abs(im), gs)}` : n(re, gs) },
      { label: 'rf_gIn', sym: '|Γ| = \\sqrt{(Re\\,Γ)^{2} + (Im\\,Γ)^{2}}', num: `\\sqrt{{(${n(re, gs)})}^{2} + {(${n(im, gs)})}^{2}}`, res: G },
    );
  } else if (v.mode === 'vswr') {
    list.push({ label: 'rf_gIn', sym: '|Γ| = \\frac{VSWR − 1}{VSWR + 1}', num: `\\frac{${n(v.vswr, 6)} − 1}{${n(v.vswr, 6)} + 1}`, res: G });
  } else if (v.mode === 'rl') {
    list.push({ label: 'rf_gIn', sym: '|Γ| = 10^{−RL / 20}', num: `10^{−\\frac{${tx(`${fmt(v.rl, 6)} dB`)}}{20}}`, res: G });
  }
  list.push(
    v.mode !== 'vswr' && Number.isFinite(r.vswr) && { label: 'rf_vswr', sym: 'VSWR = \\frac{1 + |Γ|}{1 − |Γ|}', num: `\\frac{1 + ${G}}{1 − ${G}}`, res: n(r.vswr, 4) },
    v.mode !== 'rl' && Number.isFinite(r.returnLossDb) && { label: 'rf_rl', sym: 'RL = −20 \\cdot \\log_{10}|Γ|', num: `−20 \\cdot \\log_{10}(${G})`, res: dB(r.returnLossDb) },
    Number.isFinite(r.mismatchLossDb) && { label: 'rf_ml', sym: 'ML = −10 \\cdot \\log_{10}(1 − |Γ|^{2})', num: `−10 \\cdot \\log_{10}(1 − {${G}}^{2})`, res: dB(r.mismatchLossDb) },
    { label: 'rf_refl', sym: 'P_{refl} = |Γ|^{2}', num: `{${G}}^{2}`, res: tx(`${fmt(r.reflectedPct, 4)} %`) },
  );
  const where = {
    load: [['Z_L = R + jX', 'rf_load'], ['Z_0', 'rf_z0', 'z0'], ['R', 'rf_r', 'r'], ['X', 'rf_x', 'x']],
    vswr: [['VSWR', 'rf_vswrIn', 'vswr']],
    rl: [['RL', 'rf_rlIn', 'rl']],
    g: [['|Γ|', 'rf_gIn', 'g']],
  }[v.mode];
  return steps(list, { note: 'rf_note', where, refs: ['D. M. Pozar, Microwave Engineering, 4th ed., §2.3', 'R. Ludwig & G. Bogdanov, RF Circuit Design, 2nd ed., ch. 2'] });
}

export default {
  diagram,
  id: 'reflection',
  strings,
  sections: [
    {
      title: 'sectionInputs',
      fields: [
        { key: 'mode', type: 'choice', label: 'rf_mode', default: 'load',
          options: [{ value: 'load', label: 'rf_load' }, { value: 'vswr', label: 'rf_vswr' }, { value: 'rl', label: 'rf_rl' }, { value: 'g', label: 'rf_gamma' }] },
        { key: 'z0', type: 'number', label: 'rf_z0', default: 50, units: ['ohm'], show: is('load'),
          presets: [50, 75, 100].map((x) => ({ label: `${x} Ω`, value: x })) },
        { key: 'r', type: 'number', label: 'rf_r', default: 75, units: ['ohm'], valid: 'nonneg', show: is('load') },
        { key: 'x', type: 'number', label: 'rf_x', default: 0, units: ['ohm'], valid: 'any', info: 'rf_xInfo', show: is('load') },
        { key: 'vswr', type: 'number', label: 'rf_vswrIn', default: 1.5, min: 1, show: is('vswr') },
        { key: 'rl', type: 'number', label: 'rf_rlIn', default: 15, units: ['dB'], valid: 'nonneg', show: is('rl') },
        { key: 'g', type: 'number', label: 'rf_gIn', default: 0.2, valid: 'nonneg', max: 1, show: is('g') },
      ],
    },
  ],

  compute(v) {
    let g;
    let angle = null;
    let load = null; // complex Γ of a load, for the calculation steps
    if (v.mode === 'load') {
      const c = gammaFromLoad(v.z0, v.r, v.x);
      g = c.mag;
      angle = c.angleDeg;
      load = { re: c.re, im: c.im };
    } else if (v.mode === 'vswr') g = gammaFromVswr(v.vswr);
    else if (v.mode === 'rl') g = gammaFromReturnLoss(v.rl);
    else g = v.g;
    return { ok: true, ...fromGammaMag(g), angle, load };
  },

  render(r, v) {
    const db = (x) => (Number.isFinite(x) ? `${fixed(x, 2)} dB` : '∞');
    return heroes([
      ['rf_rl', Number.isFinite(r.returnLossDb) ? `${fixed(r.returnLossDb, 2)} <span class="u">dB</span>` : '∞'],
      ['rf_vswr', Number.isFinite(r.vswr) ? `${fixed(r.vswr, 3)} <span class="u">: 1</span>` : '∞'],
    ])
      + worked(r, v)
      + block('results', rows([
        ['rf_gIn', fmt(r.gamma, 4)],
        r.angle !== null && ['rf_angle', `${fixed(r.angle, 1)}°`],
        ['rf_ml', db(r.mismatchLossDb)],
        ['rf_refl', `${fmt(r.reflectedPct, 4)} %`],
        ['rf_trans', `${fmt(r.transmittedPct, 4)} %`],
      ]));
  },
};
