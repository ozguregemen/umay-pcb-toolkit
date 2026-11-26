import { patchAntenna, monopole } from '../engine/antenna.js';
import { heroes, rows, block, steps, messages, invalid } from '../ui/calculator.js';
import { tx } from '../ui/math.js';
import { fmt, fixed, si, esc } from '../ui/format.js';
import { svg, rect, path, text, dimH, dimV } from '../ui/svg.js';
import { t } from '../i18n.js';

const strings = {
  tr: {
    an_type: 'Anten tipi',
    an_patch: 'Mikroşerit yama (patch)',
    an_mono: 'Çeyrek dalga monopol / IFA kolu',
    an_f: 'Çalışma frekansı',
    an_er: 'Dielektrik sabiti (εr)',
    an_h: 'Dielektrik kalınlığı (h)',
    an_hInfo: 'Yama ile alt yüzeydeki toprak düzlemi arasındaki laminat kalınlığı. Kalın ve düşük kayıplı laminat bant genişliğini ve verimi artırır.',
    an_z0: 'Besleme empedansı',
    an_place: 'Yerleşim',
    an_printed: 'Kart kenarına basılı iz',
    an_wire: 'Havada tel',
    an_placeInfo: 'Basılı izde alan kısmen laminat içinde olduğu için etkin dielektrik sabiti ≈ (εr + 1)/2 alınır ve gereken uzunluk kısalır. Altında ve yanında bakır olmamalıdır.',
    an_W: 'Yama genişliği W',
    an_L: 'Yama uzunluğu L',
    an_inset: '50 Ω için gömme besleme derinliği y0',
    an_feedW: 'Besleme hattı genişliği',
    an_ereff: 'Etkin dielektrik sabiti',
    an_dL: 'Kenar alanı uzaması ΔL',
    an_rin: 'Kenarda giriş direnci (yaklaşık)',
    an_bw: 'Tahmini bant genişliği (VSWR < 2)',
    an_ground: 'Önerilen en küçük toprak düzlemi',
    an_lambda: 'Boş uzay dalga boyu λ0',
    an_quarter: 'Çeyrek dalga uzunluğu (bu yerleşimde)',
    an_quarterAir: 'Çeyrek dalga (havada)',
    an_half: 'Yarım dalga dipol (toplam)',
    an_groundMin: 'Toprak düzlemi uzunluğu (en az ≈ λ/4)',
    an_c: 'Işığın boşluktaki hızı',
    an_stepWire: 'Havadaki telin çevresinde dielektrik yoktur.',
    an_stepRad: 'arccos radyan cinsinden alınır.',
    an_dgPatch: 'Yama anten üstten görünüş (ölçekli)',
    an_dgMono: 'Monopol anten yerleşimi (ölçeksiz)',
    an_dgGround: 'toprak düzlemi',
    an_dgGnd: 'toprak (alt katman)',
    an_dgKeep: 'bakırsız bölge',
    an_dgMatch: 'π eşleştirme',
    an_dgRad: 'ışıyan kenarlar',
    an_dgFeed: 'besleme',
    an_matchLink: 'VNA ile ölçtüğünüz besleme empedansı için π (veya L) eşleştirme değerlerini hesaplayın:',
    an_note: 'Bu değerler başlangıç noktasıdır. Toprak düzleminin boyutu, kutu, pil ve yakındaki bileşenler rezonansı kaydırır; son ayar vektör ağ analizörüyle (VNA) yapılır. Monopol/IFA beslemesine π eşleştirme ağı (3 pad) bırakmak, ayarı yeniden kart üretmeden yapmayı sağlar. Yama formülleri Balanis’in iletim hattı modelinden; giriş direnci ve bant genişliği yaklaşık değerlerdir.',
    err_inputs: 'Frekans, εr (> 1) ve kalınlık sıfırdan büyük olmalı.',
    warn_patchThick: 'h/λ0 > 0,05: kalın alt tabanda yüzey dalgaları ve formül hatası artar.',
    warn_fr4Loss: 'FR-4 GHz bölgesinde kayıplıdır (tan δ ≈ 0,02); yama antenin verimi düşük olur. RF laminat (ör. RO4003C) daha iyi sonuç verir.',
  },
  en: {
    an_type: 'Antenna type',
    an_patch: 'Microstrip patch',
    an_mono: 'Quarter-wave monopole / IFA arm',
    an_f: 'Operating frequency',
    an_er: 'Dielectric constant (εr)',
    an_h: 'Dielectric thickness (h)',
    an_hInfo: 'Laminate thickness between the patch and the ground plane on the bottom side. Thicker, low-loss laminate increases bandwidth and efficiency.',
    an_z0: 'Feed impedance',
    an_place: 'Placement',
    an_printed: 'Trace printed on the board edge',
    an_wire: 'Wire in air',
    an_placeInfo: 'On a printed trace the field is partly inside the laminate, so εeff ≈ (εr + 1)/2 is used and the required length shrinks. Keep copper away from under and beside it.',
    an_W: 'Patch width W',
    an_L: 'Patch length L',
    an_inset: 'Inset-feed depth y0 for 50 Ω',
    an_feedW: 'Feed line width',
    an_ereff: 'Effective dielectric constant',
    an_dL: 'Fringing extension ΔL',
    an_rin: 'Edge input resistance (approx.)',
    an_bw: 'Estimated bandwidth (VSWR < 2)',
    an_ground: 'Recommended minimum ground plane',
    an_lambda: 'Free-space wavelength λ0',
    an_quarter: 'Quarter-wave length (this placement)',
    an_quarterAir: 'Quarter wave (in air)',
    an_half: 'Half-wave dipole (total)',
    an_groundMin: 'Ground plane length (at least ≈ λ/4)',
    an_c: 'Speed of light in vacuum',
    an_stepWire: 'A wire in air has no dielectric around it.',
    an_stepRad: 'arccos is taken in radians.',
    an_dgPatch: 'Patch antenna top view (to scale)',
    an_dgMono: 'Monopole antenna layout (not to scale)',
    an_dgGround: 'ground plane',
    an_dgGnd: 'ground (bottom layer)',
    an_dgKeep: 'copper-free zone',
    an_dgMatch: 'π match',
    an_dgRad: 'radiating edges',
    an_dgFeed: 'feed',
    an_matchLink: 'Compute π (or L) matching values for the feed impedance you measured with a VNA:',
    an_note: 'These are starting values. Ground-plane size, enclosure, battery and nearby parts shift the resonance; final tuning is done with a vector network analyser (VNA). Leaving a π matching network (3 pads) at the monopole/IFA feed lets you tune without a new board spin. Patch formulas follow Balanis’ transmission-line model; input resistance and bandwidth are approximate.',
    err_inputs: 'Frequency, εr (> 1) and thickness must be greater than zero.',
    warn_patchThick: 'h/λ0 > 0.05: surface waves and formula error grow on thick substrates.',
    warn_fr4Loss: 'FR-4 is lossy in the GHz range (tan δ ≈ 0.02); a patch on it has low efficiency. RF laminate (e.g. RO4003C) performs better.',
  },
};

const isPatch = (v) => v.type === 'patch';
const mm = (x, d = 2) => `${fixed(x, d)} mm`;

// Top view, to scale: ground plane (bottom layer) outline, patch with the
// inset-feed notch, 50 Ω feed line. Radiating edges are the two W-wide edges.
function patchDiagram(r) {
  const gw = r.groundWMm;
  const gl = r.groundLMm;
  const k = Math.min(330 / gw, 210 / gl);
  const cx = 220;
  const ox = cx - (gw * k) / 2;
  const oy = 24;
  const gb = oy + gl * k; // ground bottom edge
  const pw = r.wMm * k;
  const pl = r.lMm * k;
  const px = cx - pw / 2;
  const py = oy + ((gl - r.lMm) / 2) * k;
  const bottom = py + pl;
  const fw = Math.max(2, r.feedWMm * k);
  const inset = r.insetMm * k;
  const gap = Math.max(2.5, fw * 0.6);
  const xl = cx - fw / 2 - gap;
  const xr = cx + fw / 2 + gap;
  const patch = inset > 0.5
    ? `M${px},${py}H${px + pw}V${bottom}H${xr}V${bottom - inset}H${xl}V${bottom}H${px}Z`
    : `M${px},${py}H${px + pw}V${bottom}H${px}Z`;
  const feedTop = inset > 0.5 ? bottom - inset : bottom;
  let body = rect(ox, oy, gw * k, gl * k, 'soft', ' rx="2"')
    + text(ox, gb + 12, t('an_dgGnd'), { cls: 'lbl', anchor: 'start' })
    + path(patch, 'cu')
    + rect(cx - fw / 2, feedTop, fw, gb - feedTop + 14, 'cu')
    // radiating edges (W-wide ends of the resonant length L)
    + path(`M${px + 1},${py + 1.5}H${px + pw - 1}`, 'rad')
    + path(inset > 0.5 ? `M${px + 1},${bottom - 1.5}H${xl}M${xr},${bottom - 1.5}H${px + pw - 1}` : `M${px + 1},${bottom - 1.5}H${px + pw - 1}`, 'rad')
    + dimH(px, px + pw, py - 8, `W = ${mm(r.wMm, 1)}`, { cls: 'val' })
    + dimV(py, bottom, px + pw + 10, `L = ${mm(r.lMm, 1)}`, { cls: 'val', extFrom: px + pw });
  if (inset > 0.5) body += dimV(bottom - inset, bottom, px - 10, `y0 = ${mm(r.insetMm, 1)}`, { cls: 'val', left: true, extFrom: xl });
  body += text(cx + fw / 2 + 6, gb + 12, `${t('an_dgFeed')} ${mm(r.feedWMm, 2)} (${fmt(r.z0, 3)} Ω)`, { cls: 'lbl', anchor: 'start' });
  const ly = gb + 34;
  body += path(`M${ox},${ly - 4}H${ox + 18}`, 'rad') + text(ox + 24, ly, t('an_dgRad'), { cls: 'lbl', anchor: 'start' });
  return svg(440, ly + 8, body, t('an_dgPatch'), { wide: true });
}

// Edge-printed quarter-wave monopole: ground plane = counterpoise, the arm
// runs into a copper-free zone; a π match sits at the ground edge.
function monoDiagram(r) {
  const ge = 250; // ground-plane edge
  let body = rect(14, 20, 432, 116, 'soft', ' rx="3"')
    + rect(14, 20, ge - 14, 116, 'cu plane')
    + path(`M${ge},20V136`, 'ext')
    + text((14 + ge) / 2, 128, t('an_dgGround'), { cls: 'lbl' })
    + text((ge + 446) / 2, 128, t('an_dgKeep'), { cls: 'lbl' })
    + rect(36, 58, 56, 44, 'comp', ' rx="3"') + text(64, 84, 'RF IC', { cls: 'name' })
    + rect(92, 77, ge - 92 + 4, 6, 'cu')
    // π match: series part on the line, shunt parts to ground
    + rect(198, 74, 14, 12, 'comp') + rect(186, 88, 10, 16, 'comp') + rect(214, 88, 10, 16, 'comp')
    + text(205, 66, t('an_dgMatch'), { cls: 'lbl' })
    + rect(ge, 77, 180, 6, 'cu')
    + path(`M${ge + 2},80H${ge + 178}`, 'rad')
    + dimH(ge, ge + 180, 54, `λ/4 ≈ ${mm(r.quarterMm, 1)}`, { cls: 'val', extFrom: 77 })
    + dimH(14, ge, 150, `≥ λ/4 ≈ ${mm(r.groundMinMm, 0)}`, { cls: 'lbl', below: true, extFrom: 136 });
  return svg(460, 174, body, t('an_dgMono'), { wide: true });
}

export default {
  id: 'antenna',
  strings,
  sections: [
    {
      title: 'sectionSetup',
      fields: [
        { key: 'type', type: 'choice', label: 'an_type', default: 'patch',
          options: [{ value: 'patch', label: 'an_patch' }, { value: 'mono', label: 'an_mono' }] },
      ],
    },
    {
      title: 'sectionInputs',
      fields: [
        { key: 'f', type: 'number', label: 'an_f', default: 2.45, units: ['GHz', 'MHz'],
          presets: [{ label: '433 MHz', value: 433, unit: 'MHz' }, { label: '868 MHz', value: 868, unit: 'MHz' }, { label: '915 MHz', value: 915, unit: 'MHz' },
            { label: '2.45 GHz', value: 2.45, unit: 'GHz' }, { label: '5.8 GHz', value: 5.8, unit: 'GHz' }] },
        { key: 'er', type: 'number', label: 'an_er', default: 4.3, min: 1.01,
          presets: [{ label: 'FR-4 4.3', value: 4.3 }, { label: 'RO4350B 3.66', value: 3.66 }, { label: 'RO4003C 3.55', value: 3.55 }, { label: 'PTFE 2.2', value: 2.2 }] },
        { key: 'h', type: 'number', label: 'an_h', default: 1.6, units: ['mm'], info: 'an_hInfo', show: isPatch,
          presets: [0.8, 1.0, 1.6].map((x) => ({ label: `${x} mm`, value: x })) },
        { key: 'z0', type: 'number', label: 'an_z0', default: 50, units: ['ohm'], show: isPatch },
        { key: 'pl', type: 'choice', label: 'an_place', default: 'printed', info: 'an_placeInfo', show: (v) => !isPatch(v),
          options: [{ value: 'printed', label: 'an_printed' }, { value: 'wire', label: 'an_wire' }] },
      ],
    },
  ],

  diagram(v, u, r) {
    if (!r) return '';
    return r.type === 'patch' ? patchDiagram(r) : monoDiagram(r);
  },

  compute(v, u) {
    const fHz = v.f * (u.f === 'GHz' ? 1e9 : 1e6);
    if (isPatch(v)) return { type: 'patch', z0: v.z0, fHz, ...patchAntenna({ fHz, er: v.er, hMm: v.h, z0: v.z0 }) };
    return { type: 'mono', fHz, ...monopole({ fHz, er: v.er, mode: v.pl }) };
  },

  render(r, v) {
    if (!r.ok) return invalid(r.errors);
    // Calculation steps: c in mm/ns and f in GHz (1/ns), so that c/f comes out in mm.
    const C = tx(`${fmt(299.792458, 4)} mm/ns`);
    const f = tx(`${fmt(r.fHz / 1e9, 4)} GHz`);
    const L = (x) => tx(`${fmt(x, 4)} mm`);
    const er = fmt(v.er, 4);
    if (r.type === 'mono') {
      const wire = v.pl === 'wire';
      return heroes([['an_quarter', `${fixed(r.quarterMm, 1)} <span class="u">mm</span>`], ['an_lambda', `${fixed(r.lambda0Mm, 1)} <span class="u">mm</span>`]])
        + steps([
          { label: 'an_lambda', sym: 'λ_0 = \\frac{c}{f}', num: `\\frac{${C}}{${f}}`, res: L(r.lambda0Mm) },
          wire
            ? { label: 'an_ereff', sym: 'ε_{eff} = 1', note: 'an_stepWire' }
            : { label: 'an_ereff', sym: 'ε_{eff} ≈ \\frac{ε_r + 1}{2}', num: `\\frac{${er} + 1}{2}`, res: fmt(r.eeff, 4) },
          { label: 'an_quarter', sym: 'L = \\frac{λ_0}{4 \\cdot \\sqrt{ε_{eff}}}', num: `\\frac{${L(r.lambda0Mm)}}{4 \\cdot \\sqrt{${fmt(r.eeff, 4)}}}`, res: L(r.quarterMm) },
        ], { note: 'an_note', refs: ['C. A. Balanis, Antenna Theory, 4th ed.', 'TI AN058 / DN035 (PCB antennas)'],
          where: [['c', 'an_c'], ['f', 'an_f', 'f'], !wire && ['ε_r', 'an_er', 'er']] })
        + block('results', rows([
          ['an_ereff', fmt(r.eeff, 3)],
          ['an_quarterAir', mm(r.quarterAirMm, 1)],
          ['an_half', mm(r.halfDipoleMm, 1)],
          ['an_groundMin', mm(r.groundMinMm, 0)],
        ]))
        + `<p class="note">${esc(t('an_matchLink'))} <a href="#/matching">${esc(t('tool_matching'))}</a></p>`;
    }
    const h = L(v.h);
    const W = L(r.wMm);
    const ee = fmt(r.ereff, 4);
    const rin = tx(`${fmt(r.rin, 3)} Ω`); // approximate values: as many digits as in the table below
    return heroes([['an_W', `${fixed(r.wMm, 2)} <span class="u">mm</span>`], ['an_L', `${fixed(r.lMm, 2)} <span class="u">mm</span>`]])
      + messages('warn', r.warnings)
      + steps([
        { label: 'an_lambda', sym: 'λ_0 = \\frac{c}{f_0}', num: `\\frac{${C}}{${f}}`, res: L(r.lambda0Mm) },
        { label: 'an_W', sym: 'W = \\frac{c}{2 \\cdot f_0} \\cdot \\sqrt{\\frac{2}{ε_r + 1}}', num: `\\frac{${C}}{2 \\cdot ${f}} \\cdot \\sqrt{\\frac{2}{${er} + 1}}`, res: W },
        { label: 'an_ereff', sym: 'ε_{reff} = \\frac{ε_r + 1}{2} + \\frac{ε_r − 1}{2} \\cdot \\frac{1}{\\sqrt{1 + 12 \\cdot \\frac{h}{W}}}',
          num: `\\frac{${er} + 1}{2} + \\frac{${er} − 1}{2} \\cdot \\frac{1}{\\sqrt{1 + 12 \\cdot \\frac{${h}}{${W}}}}`, res: ee },
        { label: 'an_dL', sym: `ΔL = ${fmt(0.412)} \\cdot h \\cdot \\frac{(ε_{reff} + ${fmt(0.3)}) \\cdot (\\frac{W}{h} + ${fmt(0.264)})}{(ε_{reff} − ${fmt(0.258)}) \\cdot (\\frac{W}{h} + ${fmt(0.8)})}`,
          num: `${fmt(0.412)} \\cdot ${h} \\cdot \\frac{(${ee} + ${fmt(0.3)}) \\cdot (\\frac{${W}}{${h}} + ${fmt(0.264)})}{(${ee} − ${fmt(0.258)}) \\cdot (\\frac{${W}}{${h}} + ${fmt(0.8)})}`, res: L(r.dLMm) },
        { label: 'an_L', sym: 'L = \\frac{c}{2 \\cdot f_0 \\cdot \\sqrt{ε_{reff}}} − 2 \\cdot ΔL',
          num: `\\frac{${C}}{2 \\cdot ${f} \\cdot \\sqrt{${ee}}} − 2 \\cdot ${L(r.dLMm)}`, res: L(r.lMm) },
        { label: 'an_rin', sym: 'R_{in} ≈ 90 \\cdot \\frac{ε_r^{2}}{ε_r − 1} \\cdot (\\frac{L}{W})^{2}',
          num: `90 \\cdot \\frac{{${er}}^{2}}{${er} − 1} \\cdot (\\frac{${L(r.lMm)}}{${W}})^{2}`, res: rin },
        r.insetMm > 0 && { label: 'an_inset', sym: 'y_0 = \\frac{L}{π} \\cdot \\arccos\\sqrt{\\frac{Z_0}{R_{in}}}',
          num: `\\frac{${L(r.lMm)}}{π} \\cdot \\arccos\\sqrt{\\frac{${tx(`${fmt(r.z0, 4)} Ω`)}}{${rin}}}`, res: L(r.insetMm), note: 'an_stepRad' },
        { label: 'an_bw', sym: `BW ≈ ${fmt(3.77)} \\cdot \\frac{ε_r − 1}{ε_r^{2}} \\cdot \\frac{W}{L} \\cdot \\frac{h}{λ_0}`,
          num: `${fmt(3.77)} \\cdot \\frac{${er} − 1}{{${er}}^{2}} \\cdot \\frac{${W}}{${L(r.lMm)}} \\cdot \\frac{${h}}{${L(r.lambda0Mm)}}`, res: tx(`${fixed(r.bwFrac * 100, 2)} %`) },
      ], { note: 'an_note', refs: ['C. A. Balanis, Antenna Theory, 4th ed., ch. 14', 'D. R. Jackson & N. G. Alexopoulos, IEEE T-AP 1991'],
        where: [['c', 'an_c'], ['f_0', 'an_f', 'f'], ['ε_r', 'an_er', 'er'], ['h', 'an_h', 'h'], ['Z_0', 'an_z0', 'z0']] })
      + block('results', rows([
        ['an_inset', mm(r.insetMm, 2)],
        ['an_feedW', mm(r.feedWMm, 3)],
        ['an_ereff', fmt(r.ereff, 4)],
        ['an_dL', mm(r.dLMm, 3)],
        ['an_rin', `${fmt(r.rin, 3)} Ω`],
        ['an_bw', `${fixed(r.bwFrac * 100, 2)} % · ${si(r.bwHz, 'Hz')}`],
        ['an_ground', `${fixed(r.groundWMm, 1)} × ${fixed(r.groundLMm, 1)} mm`],
        ['an_lambda', mm(r.lambda0Mm, 1)],
      ]));
  },
};
