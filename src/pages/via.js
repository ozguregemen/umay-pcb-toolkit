import { calculateVia } from '../engine/via.js';
import { toMm, fromMm, currentToA, riseToC, tempToC } from '../engine/units.js';
import { heroes, rows, block, formulaBlock, messages, invalid } from '../ui/calculator.js';
import { fmt, fixed, si, siHtml } from '../ui/format.js';
import { t, locale } from '../i18n.js';
import { isImperial } from '../prefs.js';
import { svg, rect, path, text, dimH, dimV, arrow, callout } from '../ui/svg.js';

const strings = {
  tr: {
    vi_drill: 'Bitmiş delik çapı (d)',
    vi_len: 'Via uzunluğu / kart kalınlığı (L)',
    vi_plating: 'Kaplama kalınlığı',
    vi_platingInfo: 'Delik duvarındaki bakır. IPC-6012 ortalama: Sınıf 1–2 için 20 µm, Sınıf 3 için 25 µm.',
    vi_count: 'Paralel via sayısı',
    vi_current: 'Toplam akım (DC)',
    vi_temp: 'İletken sıcaklığı',
    vi_tempInfo: 'Direnç bu sıcaklıktaki bakır özdirenciyle hesaplanır.',
    vi_rise: 'İzin verilen sıcaklık artışı',
    sectionHf: 'Yüksek frekans parazitikleri',
    vi_pad: 'Pad çapı (D1)',
    vi_antipad: 'Düzlem boşluğu / antipad çapı (D2)',
    vi_er: 'Dielektrik sabiti (εr)',
    vi_z0: 'Hat empedansı',
    vi_capTotal: 'Akım kapasitesi (toplam)',
    vi_rTotal: 'DC direnç (toplam)',
    vi_capOne: 'Akım kapasitesi (via başına)',
    vi_perVia: 'Via başına akım',
    vi_needed: 'Bu akım için gereken via sayısı',
    vi_rOne: 'DC direnç (via başına)',
    vi_vdrop: 'Gerilim düşümü',
    vi_ploss: 'Güç kaybı',
    vi_ar: 'En-boy oranı (L/d)',
    vi_area: 'Gövde kesit alanı',
    vi_rth: 'Isıl direnç (via başına)',
    vi_rthTotal: 'Isıl direnç (toplam)',
    vi_L: 'Endüktans',
    vi_C: 'Kapasite',
    vi_Z: 'Via empedansı √(L/C)',
    vi_tr: 'Yükselme süresine ek (10–90 %)',
    vi_res: 'LC rezonans frekansı',
    vi_stub: 'Kullanılmayan via saplaması (stub) uzunluğu',
    vi_stubInfo: 'Sinyalin kullandığı son katmandan sonra kalan via gövdesi. Çeyrek dalga boyunda rezonansa girer ve o frekans civarında sinyali zayıflatır. Arka delme (back-drill) veya kör via ile kısaltılır.',
    vi_stubRes: 'Saplama rezonansı (λ/4)',
    vi_note: 'Akım kapasitesi, gövde kesiti IPC-2221 dış katman eğrisine uygulanarak tahmin edilir; kart ısıyı yaydığı için bu yaygın kullanılan muhafazakâr bir yaklaşımdır. Paralel vialarda akımın eşit paylaşıldığı varsayılır; gerçekte kaynağa yakın vialar daha fazla akım taşır. Parazitik formüller H. Johnson’dan; L inç cinsinden h ve d ile, C pad/antipad geometrisiyle.',
    err_drill: 'Delik çapı sıfırdan büyük olmalı.',
    err_length: 'Via uzunluğu sıfırdan büyük olmalı.',
    err_plating: 'Kaplama kalınlığı sıfırdan büyük olmalı.',
    err_antipad: 'Antipad çapı pad çapından büyük olmalı.',
    warn_aspectRatioHigh: 'En-boy oranı 10:1’in üzerinde; çoğu üretici için kaplama güvenilirliği riskli.',
    warn_aspectRatioElevated: 'En-boy oranı 8:1’in üzerinde; üreticinizin kapasitesini doğrulayın.',
    warn_platingThin: 'Kaplama 20 µm’nin altında; IPC-6012 Sınıf 2 için ortalama ≥ 20 µm, Sınıf 3 için ≥ 25 µm beklenir.',
    warn_overCapacity: 'Via başına akım, seçilen sıcaklık artışındaki kapasiteyi aşıyor; via sayısını artırın.',
    vi_dgAria: 'Via kesiti: kart kalınlığı L, delik d, kaplama t, pad D1, düzlemlerdeki antipad D2, kullanılmayan saplama ve viaların içinden geçen akım; altta akımın kapasiteye oranı',
    vi_dgScale: 'ölçekli',
    vi_dgScaleExag: 'ölçekli · kaplama büyütülmüş',
    vi_dgNoScale: 'ölçeksiz',
    vi_dgStub: 'saplama',
    vi_dgCap: 'kapasite',
    vi_dgLoad: 'yük',
  },
  en: {
    vi_drill: 'Finished hole diameter (d)',
    vi_len: 'Via length / board thickness (L)',
    vi_plating: 'Plating thickness',
    vi_platingInfo: 'Copper on the hole wall. IPC-6012 average: 20 µm for Class 1–2, 25 µm for Class 3.',
    vi_count: 'Number of vias in parallel',
    vi_current: 'Total current (DC)',
    vi_temp: 'Conductor temperature',
    vi_tempInfo: 'Resistance uses copper resistivity at this temperature.',
    vi_rise: 'Allowed temperature rise',
    sectionHf: 'High-frequency parasitics',
    vi_pad: 'Pad diameter (D1)',
    vi_antipad: 'Plane clearance / antipad diameter (D2)',
    vi_er: 'Dielectric constant (εr)',
    vi_z0: 'Line impedance',
    vi_capTotal: 'Current capacity (total)',
    vi_rTotal: 'DC resistance (total)',
    vi_capOne: 'Current capacity (per via)',
    vi_perVia: 'Current per via',
    vi_needed: 'Vias needed for this current',
    vi_rOne: 'DC resistance (per via)',
    vi_vdrop: 'Voltage drop',
    vi_ploss: 'Power loss',
    vi_ar: 'Aspect ratio (L/d)',
    vi_area: 'Barrel cross-section',
    vi_rth: 'Thermal resistance (per via)',
    vi_rthTotal: 'Thermal resistance (total)',
    vi_L: 'Inductance',
    vi_C: 'Capacitance',
    vi_Z: 'Via impedance √(L/C)',
    vi_tr: 'Added rise time (10–90 %)',
    vi_res: 'LC resonant frequency',
    vi_stub: 'Unused via stub length',
    vi_stubInfo: 'The via barrel left beyond the last layer the signal uses. It resonates at a quarter wavelength and attenuates the signal around that frequency. Back-drilling or blind vias shorten it.',
    vi_stubRes: 'Stub resonance (λ/4)',
    vi_note: 'Current capacity applies the IPC-2221 external curve to the barrel cross-section; since the board spreads heat, this is a commonly used conservative estimate. Parallel vias are assumed to share current equally; in practice vias nearest the source carry more. Parasitic formulas are from H. Johnson; L uses h and d in inches, C the pad/antipad geometry.',
    err_drill: 'Drill diameter must be greater than zero.',
    err_length: 'Via length must be greater than zero.',
    err_plating: 'Plating thickness must be greater than zero.',
    err_antipad: 'Antipad diameter must be larger than the pad.',
    warn_aspectRatioHigh: 'Aspect ratio above 10:1; plating reliability is at risk for most fabricators.',
    warn_aspectRatioElevated: 'Aspect ratio above 8:1; confirm your fabricator’s capability.',
    warn_platingThin: 'Plating below 20 µm; IPC-6012 expects an average of ≥ 20 µm for Class 2 and ≥ 25 µm for Class 3.',
    warn_overCapacity: 'Current per via exceeds the capacity at the chosen temperature rise; add vias.',
    vi_dgAria: 'Via cross-section: board thickness L, drill d, plating t, pad D1, plane antipad D2, the unused stub and the current flowing through the vias; below, current as a share of capacity',
    vi_dgScale: 'to scale',
    vi_dgScaleExag: 'to scale · plating exaggerated',
    vi_dgNoScale: 'not to scale',
    vi_dgStub: 'stub',
    vi_dgCap: 'capacity',
    vi_dgLoad: 'load',
  },
};

const LEN = ['mm', 'mil'];

const lenTxt = (mm) => (isImperial() ? `${fmt(fromMm(mm, 'mil'), 3)} mil` : `${fmt(mm, 3)} mm`);
const platTxt = (mm) => (isImperial() ? `${fmt(fromMm(mm, 'mil'), 2)} mil` : `${fmt(mm * 1000, 3)} µm`);
const pctTxt = (x) => new Intl.NumberFormat(locale(), { style: 'percent', maximumFractionDigits: 0 }).format(x);

/** Spread label baselines at least `gap` apart (order kept) inside [lo, hi]; sets `ty`. */
function spread(items, gap, lo, hi) {
  const s = [...items].sort((a, b) => a.y - b.y);
  s.forEach((it, i) => { it.ty = Math.max(it.y, i ? s[i - 1].ty + gap : lo); });
  for (let i = s.length - 1; i >= 0; i--) {
    const cap = i === s.length - 1 ? hi : s[i + 1].ty - gap;
    if (s[i].ty > cap) s[i].ty = cap;
  }
  return s;
}

/**
 * Live cross-section: board thickness L, drill d, plating t, pads D1, plane
 * antipads D2, the unused stub, the current path through n vias and the
 * capacity meter. Drawn to scale where possible (plating is exaggerated).
 */
function diagram(v, u, r) {
  const num = (k) => (Number.isFinite(v[k]) && v[k] > 0 ? toMm(v[k], u[k]) : NaN);
  const live = Number.isFinite;
  const dIn = num('d'); const LIn = num('L'); const tIn = num('p');
  const D1In = num('pad'); const D2In = num('ap'); const stubIn = num('stub');
  const d = live(dIn) ? dIn : 0.3;
  const L = live(LIn) ? LIn : 1.6;
  const tp = live(tIn) ? tIn : 0.025;
  const D1 = live(D1In) ? D1In : 0.6;
  const apOk = live(D2In) && D2In > D1;
  const D2 = apOk ? D2In : D1 * 1.6;
  const n = r ? r.count : 1;
  const nDraw = Math.min(n, 6);

  // Geometry (viewBox units). One scale for heights and widths; several vias
  // are squeezed horizontally only when they would not fit (then not to scale).
  const BL = 86; const BR = 306; const TOP0 = 44; const HMAX = 116;
  const GL = BL + 4; const GR = BR - 44; // via group area (room for the exit arrow)
  const maxW = Math.max(D1, D2, d + 2 * tp);
  const sy = Math.min(HMAX / L, 150 / maxW);
  let scaled = true;
  let sx = sy;
  if (nDraw * maxW * sy + 10 * (nDraw - 1) > GR - GL) {
    sx = (GR - GL - 10 * (nDraw - 1)) / (nDraw * maxW);
    scaled = false;
  }
  const keep = (px, min) => { if (px < min - 0.5) { scaled = false; return min; } return Math.max(px, min); };
  const H = keep(L * sy, 48);
  const hole = keep(d * sx, 6);
  const tpx = Math.max(tp * sx, 2.5);
  const exag = tp * sx < 2.5;
  const padW = keep(D1 * sx, hole + 2 * tpx);
  const apW = keep(D2 * sx, padW + 6);
  const pitch = apW + 10;
  const cx = Array.from({ length: nDraw }, (_, i) => (GL + GR) / 2 + (i - (nDraw - 1) / 2) * pitch);
  const first = cx[0];
  const last = cx[nDraw - 1];
  const top = TOP0 + (HMAX - H) / 2;
  const bot = top + H;

  // Unused stub: the signal leaves on an inner layer, the barrel below is the stub.
  let exitY = null;
  if (live(stubIn)) {
    const f = 1 - stubIn / L;
    const fc = Math.min(0.85, Math.max(0.15, f));
    if (Math.abs(fc - f) > 1e-9) scaled = false;
    exitY = top + fc * H;
  }
  const planes = [1 / 3, 2 / 3].map((f) => top + f * H).filter((y) => exitY === null || Math.abs(y - exitY) > 10);

  let b = rect(BL, top, BR - BL, H, 'diel');
  // Planes with an antipad clearance D2 around every via.
  for (const y of planes) {
    let x = BL;
    for (const c of cx) {
      const x2 = c - apW / 2;
      if (x2 > x) b += rect(x, y - 1.5, x2 - x, 3, 'cu');
      x = c + apW / 2;
    }
    if (BR > x) b += rect(x, y - 1.5, BR - x, 3, 'cu');
  }
  if (exitY !== null) cx.forEach((c) => { b += rect(c - padW / 2 - 3, exitY, padW + 6, bot + 5 - exitY, 'zone-bad'); });
  // Surface copper: top trace into the pads, bottom pads, exit trace.
  b += rect(BL, top - 3, last - BL, 3, 'cu');
  cx.forEach((c) => { b += rect(c - padW / 2, top - 4, padW, 4, 'cu') + rect(c - padW / 2, bot, padW, 4, 'cu'); });
  if (exitY === null) b += rect(first, bot, BR - first, 3, 'cu');
  else {
    b += rect(first, exitY - 1.5, BR - first, 3, 'cu');
    cx.forEach((c) => { b += rect(c - padW / 2, exitY - 1.5, padW, 3, 'cu'); });
  }
  // Drilled hole and plated barrel.
  cx.forEach((c) => {
    b += rect(c - hole / 2, top - 4, hole, H + 8, 'air')
      + rect(c - hole / 2 - tpx, top - 4, tpx, H + 8, 'cu') + rect(c + hole / 2, top - 4, tpx, H + 8, 'cu');
  });

  // Current path: in on the top trace, down every barrel, out on the exit layer.
  const flow = { cls: 'flow', headCls: 'arrow flow' };
  const yEnd = (exitY ?? bot) - 4;
  if (yEnd - top > 18) cx.forEach((c) => { b += arrow(c, top + 2, c, yEnd, flow); });
  b += arrow(14, top - 1.5, BL - 3, top - 1.5, flow);
  b += exitY === null ? arrow(BR - 42, bot + 10, BR - 6, bot + 10, flow) : arrow(BR - 42, exitY - 7, BR - 6, exitY - 7, flow);
  const I = r ? r.perViaA * r.count : 0;
  b += I > 0
    ? text(14, top + 13, `I = ${si(I, 'A', 3)}`, { cls: 'val', anchor: 'start' })
      + (n > 1 ? text(14, top + 27, `${n} × ${si(r.perViaA, 'A', 3)}`, { cls: 'lbl', anchor: 'start' }) : '')
    : text(14, top + 13, 'I', { cls: 'sym', anchor: 'start' });

  // Dimensions on the first via; callouts on the right.
  const lab = (sym, ok, val) => (ok ? `${sym} = ${val}` : sym);
  const dcls = (ok) => (ok ? 'val' : 'sym');
  b += dimH(first - padW / 2, first + padW / 2, top - 11, lab('D1', live(D1In), lenTxt(D1)), { cls: dcls(live(D1In)), extFrom: top - 4 });
  b += dimH(first - hole / 2, first + hole / 2, bot + 15, lab('d', live(dIn), lenTxt(d)), { below: true, cls: dcls(live(dIn)), extFrom: bot + 4 });
  if (n > nDraw) b += text(last, top - 16, `×${n}`, { cls: 'val' });
  b += dimV(top, bot, BR + 10, '', { extFrom: BR });
  const items = [
    { y: (top + bot) / 2 + 4, px: BR + 10, py: (top + bot) / 2, s: lab('L', live(LIn), lenTxt(L)), cls: dcls(live(LIn)) },
    { y: top + H * 0.12 + 4, px: last + hole / 2 + tpx / 2, py: top + H * 0.12, s: lab('t', live(tIn), platTxt(tp)), cls: dcls(live(tIn)) },
  ];
  if (planes.length) items.push({ y: planes[0] + 4, px: last + apW / 2, py: planes[0], s: lab('D2', apOk, lenTxt(D2)), cls: dcls(apOk) });
  if (exitY !== null) {
    const my = (exitY + bot) / 2;
    b += dimV(exitY, bot, BR + 22, '', { extFrom: BR });
    items.push({ y: my + 4, px: BR + 22, py: my, s: `${t('vi_dgStub')} ${lenTxt(stubIn)}`, cls: 'badt' });
    if (r?.stub) items.push({ y: my + 17, s: `λ/4 ≈ ${si(r.stub.quarterWaveHz, 'Hz', 3)}`, cls: 'val' });
  }
  for (const it of spread(items, 14, top - 4, bot + 26)) {
    b += it.px === undefined
      ? text(BR + 32, it.ty, it.s, { cls: it.cls, anchor: 'start' })
      : callout(it.px, it.py, BR + 32, it.ty, it.s, { cls: it.cls, anchor: 'start' });
  }

  // Capacity meter: total current against n × the per-via capacity.
  if (r) {
    const cap = r.totalCapacityA;
    const full = Math.max(cap, I) || 1;
    const W = BR - BL;
    const over = I > cap;
    b += rect(BL, 196, W, 8, 'soft', ' rx="2"');
    if (I > 0) b += rect(BL, 196, Math.max(3, (W * I) / full), 8, over ? 'zone-bad' : 'zone-ok', ' rx="2"');
    b += path(`M${BL + (W * cap) / full},192V208`, 'wire');
    b += text(BR + 8, 204, `${t('vi_dgCap')} ${si(cap, 'A', 3)}`, { cls: 'val', anchor: 'start' });
    b += text(14, 204, t('vi_dgLoad'), { cls: 'lbl', anchor: 'start' });
    if (I > 0) b += text(BL - 6, 204, pctTxt(I / cap), { cls: over ? 'badt' : 'okt', anchor: 'end' });
  }
  const caption = !scaled ? 'vi_dgNoScale' : exag ? 'vi_dgScaleExag' : 'vi_dgScale';
  b += text(436, 14, t(caption), { cls: 'title', anchor: 'end' });
  return svg(440, 214, b, t('vi_dgAria'), { wide: true });
}

export default {
  id: 'via',
  strings,
  sections: [
    {
      title: 'sectionInputs',
      fields: [
        { key: 'd', type: 'number', label: 'vi_drill', default: 0.3, units: LEN, pref: 'length',
          presets: [0.2, 0.25, 0.3, 0.4, 0.5].map((x) => ({ label: `${x} mm`, value: x, unit: 'mm' })) },
        { key: 'L', type: 'number', label: 'vi_len', default: 1.6, units: LEN,
          presets: [0.8, 1.0, 1.6, 2.0, 2.4].map((x) => ({ label: `${x} mm`, value: x, unit: 'mm' })) },
        { key: 'p', type: 'number', label: 'vi_plating', default: 25, units: ['um', 'mil'], info: 'vi_platingInfo',
          presets: [{ label: '20 µm', value: 20, unit: 'um' }, { label: '25 µm', value: 25, unit: 'um' }] },
        { key: 'n', type: 'number', label: 'vi_count', default: 1, integer: true, min: 1 },
        { key: 'I', type: 'number', label: 'vi_current', default: 1, units: ['A', 'mA'], valid: 'nonneg', optional: true },
      ],
    },
    {
      title: 'sectionDc',
      fields: [
        { key: 'T', type: 'number', label: 'vi_temp', default: 20, units: ['C', 'F', 'K'], valid: 'any', info: 'vi_tempInfo' },
        { key: 'dT', type: 'number', label: 'vi_rise', default: 10, units: ['C', 'K', 'F'],
          presets: [10, 20, 30, 45].map((x) => ({ label: `${x} °C`, value: x, unit: 'C' })) },
      ],
    },
    {
      title: 'sectionHf',
      collapsible: true,
      optional: true,
      fields: [
        { key: 'pad', type: 'number', label: 'vi_pad', default: 0.6, units: LEN, pref: 'length' },
        { key: 'ap', type: 'number', label: 'vi_antipad', default: 1.0, units: LEN, pref: 'length' },
        { key: 'er', type: 'number', label: 'vi_er', default: 4.3, min: 1 },
        { key: 'z0', type: 'number', label: 'vi_z0', default: 50, units: ['ohm'] },
        { key: 'stub', type: 'number', label: 'vi_stub', default: '', optional: true, units: LEN, info: 'vi_stubInfo' },
      ],
    },
  ],

  diagram,

  compute(v, u) {
    const mm = (k) => (Number.isFinite(v[k]) ? toMm(v[k], u[k]) : NaN);
    return calculateVia({
      drillMm: mm('d'),
      lengthMm: mm('L'),
      platingUm: toMm(v.p, u.p) * 1000,
      count: v.n,
      currentA: Number.isFinite(v.I) ? currentToA(v.I, u.I) : 0,
      tempC: tempToC(v.T, u.T),
      deltaTC: riseToC(v.dT, u.dT),
      padMm: mm('pad'),
      antipadMm: mm('ap'),
      er: v.er,
      z0: v.z0,
      stubMm: mm('stub'),
    });
  },

  render(r) {
    if (!r.ok) return invalid(r.errors);
    const main = heroes([
      ['vi_capTotal', `${fmt(r.totalCapacityA, 3)} <span class="u">A</span>`, `ΔT = ${fmt(r.deltaTC)} °C · ${r.count} ×`],
      ['vi_rTotal', siHtml(r.totalResistanceOhm, 'Ω')],
    ]);
    const multi = r.count > 1;
    const dc = rows([
      multi && ['vi_capOne', `${fmt(r.capacityA, 3)} A`],
      r.perViaA > 0 && multi && ['vi_perVia', `${fmt(r.perViaA, 3)} A`],
      r.viasForCurrent && ['vi_needed', `${r.viasForCurrent}`],
      multi && ['vi_rOne', si(r.resistanceOhm, 'Ω')],
      r.voltageDropV > 0 && ['vi_vdrop', si(r.voltageDropV, 'V')],
      r.powerLossW > 0 && ['vi_ploss', si(r.powerLossW, 'W')],
      ['vi_ar', `${fixed(r.aspectRatio, 1)} : 1`],
      ['vi_area', `${fmt(r.areaMm2, 3)} mm² · ${fmt(r.areaMil2)} mil²`],
      ['vi_rth', `${fmt(r.thermalResistanceKW, 3)} °C/W`],
      multi && ['vi_rthTotal', `${fmt(r.totalThermalKW, 3)} °C/W`],
    ]);
    const hf = block('sectionHf', rows([
      ['vi_L', `${fmt(r.inductanceNh, 3)} nH`],
      r.parasitics && ['vi_C', `${fmt(r.parasitics.capacitancePf, 3)} pF`],
      r.parasitics && ['vi_Z', `${fmt(r.parasitics.impedanceOhm, 3)} Ω`],
      r.parasitics && ['vi_tr', `${fmt(r.parasitics.riseDegradationPs, 3)} ps`],
      r.parasitics && ['vi_res', si(r.parasitics.resonanceHz, 'Hz')],
      r.stub && ['vi_stubRes', si(r.stub.quarterWaveHz, 'Hz')],
    ]));
    return main + messages('warn', r.warnings) + block('results', dc) + hf
      + formulaBlock([
        'A = π·(r_out² − r_in²),  r_in = d/2,  r_out = r_in + t',
        'R = ρ(T)·L / A  ,  R_total = R / n',
        'R_th = L / (k_Cu·A),  k_Cu ≈ 380 W/m·K',
        'I_max = 0.048 · ΔT^0.44 · A_mil²^0.725   (IPC-2221, per via)',
        'L = 5.08·h·[ln(4h/d) + 1]  nH     (h, d in inches)',
        'C = 1.41·εr·T·D1 / (D2 − D1)  pF  (inches)',
        'T10–90 = 2.2 · C · Z0/2,   f_LC = 1 / (2π√(L·C))',
        'f_stub = c / (4 · L_stub · √εr)',
      ], 'vi_note', ['IPC-2221B', 'IPC-6012', 'H. Johnson & M. Graham, High-Speed Digital Design §7']);
  },
};
