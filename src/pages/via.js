import { calculateVia } from '../engine/via.js';
import { toMm, currentToA, riseToC, tempToC } from '../engine/units.js';
import { heroes, rows, block, formulaBlock, messages, invalid } from '../ui/calculator.js';
import { fmt, fixed, si, siHtml } from '../ui/format.js';

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
    vi_note: 'Akım kapasitesi, gövde kesiti IPC-2221 dış katman eğrisine uygulanarak tahmin edilir; kart ısıyı yaydığı için bu yaygın kullanılan muhafazakâr bir yaklaşımdır. Paralel vialarda akımın eşit paylaşıldığı varsayılır; gerçekte kaynağa yakın vialar daha fazla akım taşır. Parazitik formüller H. Johnson’dan; L inç cinsinden h ve d ile, C pad/antipad geometrisiyle.',
    err_drill: 'Delik çapı sıfırdan büyük olmalı.',
    err_length: 'Via uzunluğu sıfırdan büyük olmalı.',
    err_plating: 'Kaplama kalınlığı sıfırdan büyük olmalı.',
    err_antipad: 'Antipad çapı pad çapından büyük olmalı.',
    warn_aspectRatioHigh: 'En-boy oranı 10:1’in üzerinde; çoğu üretici için kaplama güvenilirliği riskli.',
    warn_aspectRatioElevated: 'En-boy oranı 8:1’in üzerinde; üreticinizin kapasitesini doğrulayın.',
    warn_platingThin: 'Kaplama 20 µm’nin altında; IPC-6012 Sınıf 2 için ortalama ≥ 20 µm, Sınıf 3 için ≥ 25 µm beklenir.',
    warn_overCapacity: 'Via başına akım, seçilen sıcaklık artışındaki kapasiteyi aşıyor; via sayısını artırın.',
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
    vi_note: 'Current capacity applies the IPC-2221 external curve to the barrel cross-section; since the board spreads heat, this is a commonly used conservative estimate. Parallel vias are assumed to share current equally; in practice vias nearest the source carry more. Parasitic formulas are from H. Johnson; L uses h and d in inches, C the pad/antipad geometry.',
    err_drill: 'Drill diameter must be greater than zero.',
    err_length: 'Via length must be greater than zero.',
    err_plating: 'Plating thickness must be greater than zero.',
    err_antipad: 'Antipad diameter must be larger than the pad.',
    warn_aspectRatioHigh: 'Aspect ratio above 10:1; plating reliability is at risk for most fabricators.',
    warn_aspectRatioElevated: 'Aspect ratio above 8:1; confirm your fabricator’s capability.',
    warn_platingThin: 'Plating below 20 µm; IPC-6012 expects an average of ≥ 20 µm for Class 2 and ≥ 25 µm for Class 3.',
    warn_overCapacity: 'Current per via exceeds the capacity at the chosen temperature rise; add vias.',
  },
};

const LEN = ['mm', 'mil'];

function diagram() {
  return `
  <svg class="diagram" viewBox="0 0 380 120" role="img" aria-label="via">
    <rect class="diel" x="30" y="22" width="320" height="76"/>
    <rect class="cu" x="30" y="56" width="110" height="5"/><rect class="cu" x="240" y="56" width="110" height="5"/>
    <rect class="cu" x="140" y="14" width="100" height="8"/><rect class="cu" x="140" y="98" width="100" height="8"/>
    <rect class="hole" x="172" y="14" width="36" height="92"/>
    <rect class="cu" x="168" y="14" width="4" height="92"/><rect class="cu" x="208" y="14" width="4" height="92"/>
    <path class="dim" d="M172 112h36"/><text x="190" y="118" style="font-size:11px">d</text>
    <path class="dim" d="M140 9h100"/><text x="190" y="8" style="font-size:11px">D1</text>
    <path class="dim" d="M140 66h-0M140 52h100" /><text x="250" y="50" class="lbl" text-anchor="start">D2</text>
    <path class="dim" d="M360 22v76"/><text x="368" y="64">L</text>
    <path class="dim" d="M212 30h14"/><text x="232" y="34" style="font-size:11px">t</text>
  </svg>`;
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
    ]));
    return main + messages('warn', r.warnings) + block('results', dc) + hf
      + formulaBlock([
        'A = π·(r_out² − r_in²),  r_in = d/2,  r_out = r_in + t',
        'R = ρ(T)·L / A  ,  R_total = R / n',
        'R_th = L / (k_Cu·A),  k_Cu ≈ 380 W/m·K',
        'I_max = 0.048 · ΔT^0.44 · A_mil²^0.725   (IPC-2221, per via)',
        'L = 5.08·h·[ln(4h/d) + 1]  nH     (h, d in inches)',
        'C = 1.41·εr·T·D1 / (D2 − D1)  pF  (inches)',
        'T10–90 = 2.2 · C · Z0/2',
      ], 'vi_note', ['IPC-2221B', 'IPC-6012', 'H. Johnson & M. Graham, High-Speed Digital Design §7']);
  },
};
