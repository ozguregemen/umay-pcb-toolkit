import { fMax, stitching, slot, lcFilter, lcGain } from '../engine/emc.js';
import { toMm } from '../engine/units.js';
import { heroes, rows, block, formulaBlock, messages, invalid } from '../ui/calculator.js';
import { fmt, fixed, si, siHtml } from '../ui/format.js';
import { svg, text, path, rect, circle, ring, axes, wave, dimH, twoTerm, wire, node, ground, terminal } from '../ui/svg.js';
import { t } from '../i18n.js';
import { isImperial } from '../prefs.js';

const FARAD = 'farad'; // 'F' would render as °F

const strings = {
  tr: {
    em_mode: 'Hesap',
    em_via: 'Dikiş via aralığı',
    em_slot: 'Yarık / açıklık',
    em_lc: 'LC / ferrit filtre',
    em_secVia: 'Dikiş viaları',
    em_fsrc: 'En yüksek frekans',
    em_fromTr: 'Yükselme süresinden',
    em_fromClk: 'Saat harmoniğinden',
    em_direct: 'Doğrudan',
    em_tr: 'Yükselme süresi tr (10–90 %)',
    em_trInfo: 'Kart üzerindeki en hızlı kenar. Saat frekansı düşük olsa bile hızlı kenarlar yüksek frekans içeriği üretir: f ≈ 0,35/tr.',
    em_fclk: 'Saat frekansı',
    em_harm: 'Harmonik sayısı',
    em_harmInfo: 'Dikkate alınacak en yüksek harmonik (ör. 5. harmonik). Kare dalgada tek harmonikler baskındır.',
    em_f: 'Frekans',
    em_er: 'Dielektrik sabiti εr',
    em_erInfo: 'Düzlemler arasındaki malzemenin εr değeri; dalga boyu dielektrik içinde √εr kat kısalır.',
    em_rule: 'Kural',
    em_l20: 'λ/20 (önerilen)',
    em_l10: 'λ/10 (en geniş)',
    em_edge: 'Kenar uzunluğu',
    em_edgeInfo: 'İsteğe bağlı: bu kenar boyunca gereken via sayısı hesaplanır.',
    em_secSlot: 'Yarık',
    em_len: 'Yarık uzunluğu (en uzun boyut)',
    em_lenInfo: 'Açıklığın en uzun boyutu: havalandırma yarığı, panel birleşim yeri veya dönüş yolunu kesen düzlem yarığı. Alan değil, uzunluk belirleyicidir.',
    em_eeff: 'Etkin dielektrik sabiti εeff',
    em_eeffInfo: 'Kutu duvarındaki açıklık için 1 (hava). Kart düzlemindeki yarık için yaklaşık (εr + 1)/2.',
    em_fs: 'İlgilenilen frekans',
    em_target: 'Hedef ekranlama',
    em_targetInfo: 'İsteğe bağlı: bu ekranlama için izin verilen en uzun yarık hesaplanır.',
    em_secLc: 'LC alçak geçiren filtre',
    em_l: 'Endüktans L (bobin / ferrit boncuk)',
    em_lInfo: 'Ferrit boncukta düşük frekans endüktansı: empedans eğrisinin endüktif bölümünden L = Z/(2πf). DC akım bu değeri belirgin şekilde düşürür.',
    em_c: 'Kapasite C',
    em_cInfo: 'Filtre çıkışındaki toplam kapasite; seramikte DC öngerilim etkisini hesaba katın.',
    em_rs: 'Seri direnç (kaynak + DCR)',
    em_rsInfo: 'Kaynak direnci, bobin/boncuk DC direnci ve kondansatör ESR’sinin toplamı. Sönüm sağlayan tek direnç çoğu zaman budur.',
    em_rl: 'Yük direnci',
    em_rlInfo: 'İsteğe bağlı: yükün eşdeğer direnci V/I. Boş bırakılırsa yük yok (en kötü durum, en yüksek Q).',
    em_fx: 'Zayıflatma istenen frekans',
    em_fxInfo: 'Ör. bastırmak istediğiniz DC-DC anahtarlama frekansı veya saat frekansı.',
    em_damp: 'Sönüm',
    em_none: 'Yok',
    em_rc: 'Rd–Cd ekle',
    em_rd: 'Sönüm direnci Rd',
    em_cd: 'Sönüm kondansatörü Cd',
    em_cdInfo: 'Rd ile seri, C’ye paralel; DC akım taşımaz. Cd ≥ 4·C tipik başlangıçtır.',
    em_pitch: 'En büyük via aralığı',
    em_fmax: 'En yüksek frekans',
    em_lambda: 'Dielektrik içinde dalga boyu λ',
    em_count: 'Kenar boyunca via sayısı',
    em_fres: 'Yarık rezonansı (L = λ/2)',
    em_se: 'Tahmini ekranlama',
    em_seNone: 'yok (≤ 0 dB)',
    em_lambdaF: 'Bu frekansta dalga boyu λ',
    em_ratio: 'L / λ',
    em_lmax: 'Hedef için en uzun yarık',
    em_f0: 'Rezonans (kesim) frekansı f0',
    em_att: 'Zayıflatma',
    em_z0: 'Karakteristik empedans √(L/C)',
    em_q: 'Kalite faktörü Q',
    em_peak: 'Rezonans tepesi',
    em_peakAt: '{f} frekansında',
    em_attBare: 'Sönümsüz zayıflatma',
    em_suggest: 'Önerilen sönüm (n = Cd/C = 4)',
    em_suggestV: 'Cd = {cd}, Rd = {rd}',
    em_resp: 'Filtre',
    warn_em_peaking: 'Rezonans tepesi: f0 civarındaki gürültü bastırılmaz, büyütülür. Rd–Cd sönümü, kayıplı bir ferrit boncuk veya daha fazla seri direnç kullanın (ADI AN-1368).',
    warn_em_fxLow: 'İlgilenilen frekans f0’ın altında veya yakınında: filtre burada zayıflatmaz.',
    warn_em_slotRes: 'Yarık bu frekansta rezonansta veya üzerinde: neredeyse hiç ekranlama yok, verimli bir anten gibi ışıyabilir.',
    warn_em_tr: 'Not: 0,35/tr tek kutuplu bant genişliğidir; spektrum bu frekansın üzerinde de azalarak sürer. Kritik ürünlerde payı artırın.',
    em_noteVia: 'Kart kenarı ve düzlem çiftleri boyunca dikiş viaları, düzlemler arası rezonansları ve kenardan ışımayı sınırlar. λ/20 yaygın bir tasarım kuralıdır (λ/10 en geniş sınır); fiziksel bir eşik değil, ölçüm ve deneyime dayalı bir başlangıçtır.',
    em_noteSlot: 'Tek açıklık için kaba tahmin: SE ≈ 20·log10(λ/(2L)) (Ott). Gerçek ekranlama malzemeye, birleşim kalitesine, kablolara ve çoklu açıklıklara bağlıdır; ölçümle doğrulayın ve ~20 dB pay bırakın.',
    em_noteLc: 'İkinci dereceden alçak geçiren: kaynak direnci ve yük direnciyle Q hesaplanır, zayıflatma DC kazancına göre verilir. Ferrit boncuğun endüktansı frekansa ve DC akıma bağlıdır; yüksek frekansta boncuk dirençli davranır ve bu hesaptan daha iyi zayıflatabilir. Sonuç ideal elemanlar içindir (kondansatör ESL’si yüksek frekansta zayıflatmayı sınırlar).',
    em_dgViaAria: 'Kart kenarı boyunca dikiş viaları; dielektrik içindeki bir dalga boyuna kaç via aralığı sığdığı',
    em_dgSlotAria: 'Metal yüzeyde yarık ve yarım dalga boyu karşılaştırması',
    em_dgLcAria: 'LC filtre şeması ve frekans yanıtı (dB, logaritmik frekans)',
    em_dgEdge: 'kart kenarı',
    em_dgPlane: 'toprak düzlemi',
    em_dgSlot: 'yarık',
    em_dgHalf: 'λ/2',
    em_dgBare: 'sönümsüz',
    em_dgDamped: 'sönümlü',
  },
  en: {
    em_mode: 'Calculation',
    em_via: 'Stitching-via spacing',
    em_slot: 'Slot / aperture',
    em_lc: 'LC / ferrite filter',
    em_secVia: 'Stitching vias',
    em_fsrc: 'Highest frequency',
    em_fromTr: 'From rise time',
    em_fromClk: 'From clock harmonic',
    em_direct: 'Direct',
    em_tr: 'Rise time tr (10–90 %)',
    em_trInfo: 'The fastest edge on the board. Fast edges create high-frequency content even with a slow clock: f ≈ 0.35/tr.',
    em_fclk: 'Clock frequency',
    em_harm: 'Harmonic number',
    em_harmInfo: 'The highest harmonic to consider (e.g. the 5th). Odd harmonics dominate in a square wave.',
    em_f: 'Frequency',
    em_er: 'Dielectric constant εr',
    em_erInfo: 'εr of the material between the planes; the wavelength in the dielectric is √εr times shorter.',
    em_rule: 'Rule',
    em_l20: 'λ/20 (recommended)',
    em_l10: 'λ/10 (widest)',
    em_edge: 'Edge length',
    em_edgeInfo: 'Optional: the number of vias needed along this edge is calculated.',
    em_secSlot: 'Slot',
    em_len: 'Slot length (longest dimension)',
    em_lenInfo: 'The longest dimension of the opening: a vent slot, a panel seam, or a plane slot cutting a return path. The length matters, not the area.',
    em_eeff: 'Effective dielectric constant εeff',
    em_eeffInfo: '1 (air) for an enclosure opening. About (εr + 1)/2 for a slot in a board plane.',
    em_fs: 'Frequency of interest',
    em_target: 'Target shielding',
    em_targetInfo: 'Optional: the longest slot allowed for this shielding is calculated.',
    em_secLc: 'LC low-pass filter',
    em_l: 'Inductance L (inductor / ferrite bead)',
    em_lInfo: 'For a ferrite bead use the low-frequency inductance: L = Z/(2πf) on the inductive part of its impedance curve. DC current reduces it considerably.',
    em_c: 'Capacitance C',
    em_cInfo: 'Total capacitance at the filter output; allow for the DC-bias loss of ceramics.',
    em_rs: 'Series resistance (source + DCR)',
    em_rsInfo: 'Source resistance, inductor/bead DC resistance and capacitor ESR together. Often the only damping in the circuit.',
    em_rl: 'Load resistance',
    em_rlInfo: 'Optional: the load’s equivalent resistance V/I. Leave empty for no load (worst case, highest Q).',
    em_fx: 'Frequency to attenuate',
    em_fxInfo: 'E.g. the DC-DC switching frequency or clock you want to suppress.',
    em_damp: 'Damping',
    em_none: 'None',
    em_rc: 'Add Rd–Cd',
    em_rd: 'Damping resistor Rd',
    em_cd: 'Damping capacitor Cd',
    em_cdInfo: 'In series with Rd, across C; it carries no DC current. Cd ≥ 4·C is a typical start.',
    em_pitch: 'Maximum via pitch',
    em_fmax: 'Highest frequency',
    em_lambda: 'Wavelength in the dielectric λ',
    em_count: 'Vias along the edge',
    em_fres: 'Slot resonance (L = λ/2)',
    em_se: 'Estimated shielding',
    em_seNone: 'none (≤ 0 dB)',
    em_lambdaF: 'Wavelength at this frequency λ',
    em_ratio: 'L / λ',
    em_lmax: 'Longest slot for the target',
    em_f0: 'Resonance (cut-off) frequency f0',
    em_att: 'Attenuation',
    em_z0: 'Characteristic impedance √(L/C)',
    em_q: 'Quality factor Q',
    em_peak: 'Resonance peak',
    em_peakAt: 'at {f}',
    em_attBare: 'Attenuation without damping',
    em_suggest: 'Suggested damping (n = Cd/C = 4)',
    em_suggestV: 'Cd = {cd}, Rd = {rd}',
    em_resp: 'Filter',
    warn_em_peaking: 'Resonant peak: noise around f0 is amplified, not attenuated. Use Rd–Cd damping, a lossy ferrite bead or more series resistance (ADI AN-1368).',
    warn_em_fxLow: 'The frequency of interest is below or near f0: the filter does not attenuate there.',
    warn_em_slotRes: 'The slot is at or above resonance at this frequency: almost no shielding, and it can radiate like an efficient antenna.',
    warn_em_tr: 'Note: 0.35/tr is the single-pole bandwidth; the spectrum continues, falling, above it. Add margin for critical products.',
    em_noteVia: 'Stitching vias along the board edge and between plane pairs limit plane resonances and edge radiation. λ/20 is a common design rule (λ/10 the widest limit); it is a starting point from measurements and experience, not a physical threshold.',
    em_noteSlot: 'Rough single-aperture estimate: SE ≈ 20·log10(λ/(2L)) (Ott). Real shielding depends on the material, seam quality, cables and multiple apertures; verify by measurement and keep about 20 dB of margin.',
    em_noteLc: 'Second-order low-pass: Q follows from the source and load resistance, and the attenuation is relative to the DC gain. A ferrite bead’s inductance depends on frequency and DC current; at high frequency the bead turns resistive and may attenuate better than this. Ideal parts are assumed (capacitor ESL limits the attenuation at high frequency).',
    em_dgViaAria: 'Stitching vias along a board edge; how many via pitches fit in one wavelength in the dielectric',
    em_dgSlotAria: 'A slot in a metal surface compared with half a wavelength',
    em_dgLcAria: 'LC filter schematic and frequency response (dB versus log frequency)',
    em_dgEdge: 'board edge',
    em_dgPlane: 'ground plane',
    em_dgSlot: 'slot',
    em_dgHalf: 'λ/2',
    em_dgBare: 'undamped',
    em_dgDamped: 'damped',
  },
};

const FMUL = { Hz: 1, kHz: 1e3, MHz: 1e6, GHz: 1e9 };
const isMode = (m) => (v) => v.mode === m;
const isSrc = (s) => (v) => v.mode === 'via' && v.fsrc === s;
const lenM = (x, unit) => toMm(x, unit) / 1000;
const lenStr = (m) => {
  const mm = m * 1000;
  return isImperial() ? `${fmt(mm / 25.4, 3)} in · ${fmt(mm, 4)} mm` : `${fmt(mm, 4)} mm · ${fmt(mm / 0.0254, 4)} mil`;
};
const lenShort = (m) => (isImperial() ? `${fmt((m * 1000) / 0.0254, 3)} mil` : `${fmt(m * 1000, 3)} mm`);
const val = (x, unit) => (Number.isFinite(x) && x > 0 ? si(x, unit, 3) : '?');
/** Decibels with a true minus sign. */
const dbText = (d, dec) => (d < 0 ? `−${fixed(-d, dec)}` : fixed(d, dec));

function fOf(v, u) {
  return fMax({
    mode: v.fsrc,
    tr: v.tr * (u.tr === 'ps' ? 1e-12 : 1e-9),
    fClk: v.fclk * FMUL[u.fclk],
    harmonic: v.harm,
    f: v.f * FMUL[u.f],
  });
}

// ---------------------------------------------------------------------------
// Diagrams
// ---------------------------------------------------------------------------

/** One wavelength in the dielectric drawn as a sine above a board edge with N = 20 (or 10) via pitches under it. */
function viaDiagram(v, r) {
  const n = v.rule === '10' ? 10 : 20;
  const x0 = 40;
  const W = 360;
  const step = W / n;
  const pts = [];
  for (let k = 0; k <= 120; k++) pts.push([x0 + (W * k) / 120, 56 - 18 * Math.sin((2 * Math.PI * k) / 120)]);
  let b = path(`M${x0},56H${x0 + W}`, 'ext') + wave(pts)
    + path(`M${x0},30V84M${x0 + W},30V84`, 'ext')
    + dimH(x0, x0 + W, 24, `λ = ${r ? lenShort(r.lambda) : '?'}  (εr = ${Number.isFinite(v.er) ? fmt(v.er, 3) : '?'})`, { cls: 'val' });
  // Board: plane with an edge at the top, vias along it.
  b += rect(20, 104, 400, 52, 'cu plane') + path('M20,104H420', 'wire')
    + text(420, 98, t('em_dgEdge'), { anchor: 'end' }) + text(420, 172, t('em_dgPlane'), { anchor: 'end' });
  for (let k = 0; k <= n; k++) b += ring(x0 + k * step, 122, 4.5, 2.2, 'cu') + circle(x0 + k * step, 122, 2.2, 'hole');
  b += path(`M${x0},84V114M${x0 + step},84V114M${x0},128V172M${x0 + step},128V172`, 'ext')
    + dimH(x0, x0 + step, 168, '') + text(x0 + step + 18, 172, `λ/${n} = ${r ? lenShort(r.pitch) : '?'}`, { cls: 'val', anchor: 'start' });
  return svg(440, 186, b, t('em_dgViaAria'), { wide: true });
}

/** Slot of length L in a metal surface with its half-wave resonant field, against λ/2 at the frequency of interest. */
function slotDiagram(v, u, r) {
  const L = r ? lenM(v.len, u.len) : 0.03;
  const half = r ? r.lambda / 2 : 0.09;
  const x0 = 40;
  const maxW = 340;
  const clipHalf = half > 12 * L;
  const span = clipHalf ? 12 * L : Math.max(L, half);
  const sc = maxW / span;
  const wS = Math.max(10, L * sc);
  const wH = Math.min(maxW, half * sc);
  let b = rect(20, 92, 400, 50, 'cu plane') + text(420, 158, t('em_dgPlane'), { anchor: 'end' })
    + rect(x0, 112, wS, 10, 'air') + rect(x0, 112, wS, 10, 'wire');
  // Field across the slot: half a sine, peak at the centre (the slot's resonant mode).
  const pts = [];
  for (let k = 0; k <= 40; k++) pts.push([x0 + (wS * k) / 40, 106 - 22 * Math.sin((Math.PI * k) / 40)]);
  b += wave(pts, 'wave2') + text(x0 + wS / 2, 80, 'E', { cls: 'sym' })
    + dimH(x0, x0 + wS, 172, `L = ${r ? lenShort(L) : '?'}`, { cls: 'val', below: false, extFrom: 124 });
  // λ/2 at the frequency of interest, same scale
  b += path(`M${x0},40H${x0 + wH}`, 'rad') + path(`M${x0},34V46M${x0 + wH},34V46`, 'wire')
    + text(x0, 26, `${t('em_dgHalf')} @ ${val(r?.fHz, 'Hz')} = ${r ? lenShort(half) : '?'}`, { cls: 'val', anchor: 'start' });
  if (clipHalf) b += path(`M${x0 + wH - 18},48L${x0 + wH - 12},32M${x0 + wH - 11},48L${x0 + wH - 5},32`, 'wire');
  if (r) {
    const se = r.se > 0 ? `SE ≈ ${fixed(r.se, 1)} dB` : `SE ${t('em_seNone')}`;
    b += text(420, 62, `f_res = ${si(r.fRes, 'Hz', 3)}`, { cls: 'val', anchor: 'end' })
      + text(420, 78, se, { cls: r.se > 0 ? 'val' : 'badt', anchor: 'end' });
  }
  return svg(440, 186, b, t('em_dgSlotAria'), { wide: true });
}

/** LC section schematic and |H| in dB over f0/100 … 100·f0 (bare dashed, damped solid). */
function lcDiagram(v, r) {
  const damped = v.damp === 'rc';
  const yT = 34;
  const yG = 96;
  let b = twoTerm('AC', 50, yT, 50, yG, { name: 'Vin', flip: true })
    + twoTerm('R', 50, yT, 112, yT, { name: 'Rs', value: Number.isFinite(v.rs) ? si(v.rs, 'Ω', 3) : '?' })
    + twoTerm('L', 112, yT, 190, yT, { name: 'L', value: val(v.l, 'H') })
    + wire([190, yT], [400, yT]) + node(210, yT)
    + twoTerm('C', 210, yT, 210, yG, { name: 'C', value: val(v.c, 'F') });
  if (damped) {
    b += node(280, yT) + twoTerm('R', 280, yT, 280, 65, { name: 'Rd', value: val(v.rd, 'Ω'), hi: true })
      + twoTerm('C', 280, 65, 280, yG, { name: 'Cd', value: val(v.cd, 'F'), hi: true });
  }
  const hasLoad = v.rl > 0;
  if (hasLoad) b += node(350, yT) + twoTerm('R', 350, yT, 350, yG, { name: 'RL', value: si(v.rl, 'Ω', 3) });
  b += wire([50, yG], [hasLoad ? 350 : damped ? 280 : 210, yG]) + ground(120, yG) + node(210, yG)
    + terminal(400, yT, 'Vout', 'top');

  // Response
  const x0 = 64;
  const y0 = 282;
  const W = 330;
  const H = 150;
  const f0 = r ? r.f0 : 1;
  const lo = f0 / 100;
  const hi = f0 * 100;
  const peakDb = r && Number.isFinite(r.peakDb) ? r.peakDb : 40;
  const dbTop = Math.min(60, Math.max(20, Math.ceil((peakDb + 6) / 20) * 20));
  const dbBot = dbTop - 120;
  const X = (f) => x0 + ((Math.log10(f) - Math.log10(lo)) / 4) * W;
  const Y = (db) => y0 - ((Math.min(dbTop, Math.max(dbBot, db)) - dbBot) / (dbTop - dbBot)) * H;
  // Near the right edge the label goes below-left of the point, where a
  // low-pass curve leaves room; otherwise above-right.
  const fxLabel = (x, y, s) => (x > x0 + W - 110
    ? text(x - 6, Math.min(y + 16, y0 - 4), s, { cls: 'val', anchor: 'end' })
    : text(x + 6, Math.max(y - 8, y0 - H + 12), s, { cls: 'val', anchor: 'start' }));
  const curve = (p) => {
    const pts = [];
    for (let k = 0; k <= 200; k++) {
      const f = lo * 10 ** ((4 * k) / 200);
      const g = lcGain(f, p);
      pts.push([X(f), Y(Number.isFinite(g) && g > 0 ? 20 * Math.log10(g) : dbTop)]);
    }
    return pts;
  };
  for (let d = dbBot; d <= dbTop; d += 20) {
    b += path(`M${x0},${Y(d)}H${x0 + W}`, 'grid-l') + text(x0 - 5, Y(d) + 4, `${dbText(d, 0)} dB`, { anchor: 'end' });
  }
  for (let e = 0; e <= 4; e++) {
    const f = lo * 10 ** e;
    b += path(`M${X(f)},${y0}V${y0 - H}`, 'grid-l')
      + text(X(f), y0 + 14, e === 2 ? 'f0' : `f0${e < 2 ? '/' : '·'}${10 ** Math.abs(e - 2)}`, { cls: e === 2 ? 'name' : 'lbl' });
  }
  b += axes(x0, y0, W + 6, H + 6) + text(x0 - 5, y0 - H - 8, '|H|', { cls: 'sym', anchor: 'end' });
  if (r) {
    if (damped) b += wave(curve(r.base), 'wave2') + wave(curve(r.net));
    else b += wave(curve(r.base));
    if (r.fx >= lo && r.fx <= hi) {
      const gx = 20 * Math.log10(r.gainX);
      b += path(`M${X(r.fx)},${y0}V${y0 - H}`, 'dimline') + circle(X(r.fx), Y(gx), 3.2, 'node')
        + fxLabel(X(r.fx), Y(gx), `${dbText(gx, 1)} dB @ ${si(r.fx, 'Hz', 3)}`);
    }
    b += text(x0 + W, y0 + 28, `f0 = ${si(r.f0, 'Hz', 3)}`, { cls: 'val', anchor: 'end' });
    if (damped) {
      b += wave([[x0 + 4, y0 + 24], [x0 + 26, y0 + 24]], 'wave2') + text(x0 + 30, y0 + 28, t('em_dgBare'), { anchor: 'start' })
        + wave([[x0 + 110, y0 + 24], [x0 + 132, y0 + 24]]) + text(x0 + 136, y0 + 28, t('em_dgDamped'), { anchor: 'start' });
    }
  }
  return svg(440, 318, b, t('em_dgLcAria'), { wide: true });
}

function diagram(v, u, r) {
  if (v.mode === 'slot') return slotDiagram(v, u, r);
  if (v.mode === 'lc') return lcDiagram(v, r);
  return viaDiagram(v, r);
}

export default {
  diagram,
  id: 'emc',
  strings,
  sections: [
    {
      title: 'sectionSetup',
      fields: [
        { key: 'mode', type: 'choice', label: 'em_mode', default: 'via',
          options: [{ value: 'via', label: 'em_via' }, { value: 'slot', label: 'em_slot' }, { value: 'lc', label: 'em_lc' }] },
      ],
    },
    {
      title: 'em_secVia',
      show: isMode('via'),
      fields: [
        { key: 'fsrc', type: 'choice', label: 'em_fsrc', default: 'tr',
          options: [{ value: 'tr', label: 'em_fromTr' }, { value: 'clk', label: 'em_fromClk' }, { value: 'f', label: 'em_direct' }] },
        { key: 'tr', type: 'number', label: 'em_tr', default: 1, units: ['ns', 'ps'], info: 'em_trInfo', show: isSrc('tr'),
          presets: [{ label: '200 ps', value: 200, unit: 'ps' }, { label: '1 ns', value: 1, unit: 'ns' }, { label: '5 ns', value: 5, unit: 'ns' }] },
        { key: 'fclk', type: 'number', label: 'em_fclk', default: 100, units: ['MHz', 'kHz', 'GHz'], show: isSrc('clk') },
        { key: 'harm', type: 'number', label: 'em_harm', default: 5, integer: true, info: 'em_harmInfo', show: isSrc('clk'),
          presets: [3, 5, 7, 11].map((x) => ({ label: `${x}.`, value: x })) },
        { key: 'f', type: 'number', label: 'em_f', default: 1, units: ['GHz', 'MHz'], show: isSrc('f') },
        { key: 'er', type: 'number', label: 'em_er', default: 4.3, min: 1, info: 'em_erInfo',
          presets: [{ label: 'FR-4 4.3', value: 4.3 }, { label: 'RO4350B 3.66', value: 3.66 }, { label: 'air 1', value: 1 }] },
        { key: 'rule', type: 'choice', label: 'em_rule', default: '20',
          options: [{ value: '20', label: 'em_l20' }, { value: '10', label: 'em_l10' }] },
        { key: 'edge', type: 'number', label: 'em_edge', default: 100, units: ['mm', 'mil', 'in'], pref: 'length', optional: true, info: 'em_edgeInfo' },
      ],
    },
    {
      title: 'em_secSlot',
      show: isMode('slot'),
      fields: [
        { key: 'len', type: 'number', label: 'em_len', default: 30, units: ['mm', 'mil', 'in'], pref: 'length', info: 'em_lenInfo' },
        { key: 'eeff', type: 'number', label: 'em_eeff', default: 1, min: 1, info: 'em_eeffInfo',
          presets: [{ label: 'air 1', value: 1 }, { label: 'FR-4 plane 2.65', value: 2.65 }] },
        { key: 'fs', type: 'number', label: 'em_fs', default: 1, units: ['GHz', 'MHz'] },
        { key: 'tgt', type: 'number', label: 'em_target', default: 20, units: ['dB'], optional: true, info: 'em_targetInfo' },
      ],
    },
    {
      title: 'em_secLc',
      show: isMode('lc'),
      fields: [
        { key: 'l', type: 'number', label: 'em_l', default: '1u', units: ['H'], si: true, info: 'em_lInfo' },
        { key: 'c', type: 'number', label: 'em_c', default: '10u', units: [FARAD], si: true, info: 'em_cInfo' },
        { key: 'rs', type: 'number', label: 'em_rs', default: 0.05, units: ['ohm'], valid: 'nonneg', info: 'em_rsInfo' },
        { key: 'rl', type: 'number', label: 'em_rl', default: '', units: ['ohm'], optional: true, info: 'em_rlInfo' },
        { key: 'fx', type: 'number', label: 'em_fx', default: 1, units: ['MHz', 'kHz', 'GHz'], info: 'em_fxInfo' },
        { key: 'damp', type: 'choice', label: 'em_damp', default: 'none',
          options: [{ value: 'none', label: 'em_none' }, { value: 'rc', label: 'em_rc' }] },
        { key: 'rd', type: 'number', label: 'em_rd', default: 0.2, units: ['ohm'], show: (v) => v.damp === 'rc' },
        { key: 'cd', type: 'number', label: 'em_cd', default: '47u', units: [FARAD], si: true, info: 'em_cdInfo', show: (v) => v.damp === 'rc' },
      ],
    },
  ],

  compute(v, u) {
    if (v.mode === 'slot') {
      const fHz = v.fs * FMUL[u.fs];
      const r = { ok: true, mode: 'slot', fHz, ...slot({ lengthM: lenM(v.len, u.len), erEff: v.eeff, fHz, targetDb: v.tgt }) };
      r.warnings = r.se <= 0 ? ['em_slotRes'] : [];
      return r;
    }
    if (v.mode === 'lc') {
      const r = { mode: 'lc', ...lcFilter({ l: v.l, c: v.c, rs: v.rs, rl: v.rl, fx: v.fx * FMUL[u.fx], ...(v.damp === 'rc' ? { rd: v.rd, cd: v.cd } : {}) }) };
      if (r.fx < 1.5 * r.fRes) r.warnings.push('em_fxLow');
      return r;
    }
    const fHz = fOf(v, u);
    const r = { ok: true, mode: 'via', fHz, ...stitching({ fHz, er: v.er, divisor: v.rule === '10' ? 10 : 20, edgeM: v.edge > 0 ? lenM(v.edge, u.edge) : 0 }) };
    r.warnings = v.fsrc === 'tr' ? ['em_tr'] : [];
    return r;
  },

  render(r) {
    if (!r.ok) return invalid(r.errors);
    if (r.mode === 'slot') {
      return heroes([
        ['em_fres', siHtml(r.fRes, 'Hz', 3)],
        ['em_se', r.se > 0 ? `${fixed(r.se, 1)} <span class="u">dB</span>` : t('em_seNone')],
      ])
        + messages('warn', r.warnings)
        + block('results', rows([
          ['em_lambdaF', lenStr(r.lambda)],
          ['em_ratio', fmt(r.ratio, 3)],
          r.lMax !== undefined && ['em_lmax', lenStr(r.lMax), true],
        ]))
        + formulaBlock([
          'f_res = c / (2·L·√εeff)',
          'λ = c / (f·√εeff)',
          'SE ≈ 20·log10(λ / (2·L))   (single aperture, rough)',
          'L_max = λ / (2·10^(SE/20))',
        ], 'em_noteSlot', ['H. W. Ott, Electromagnetic Compatibility Engineering, Wiley 2009, ch. 6']);
    }
    if (r.mode === 'lc') {
      const peak = Number.isFinite(r.peakDb)
        ? `${fixed(r.peakDb, 1)} dB${Number.isFinite(r.peakF) && r.peakDb > 0.05 ? ` · ${t('em_peakAt', { f: si(r.peakF, 'Hz', 3) })}` : ''}`
        : '∞';
      return heroes([
        ['em_f0', siHtml(r.f0, 'Hz', 3)],
        r.attDb !== undefined && ['em_att', `${fixed(r.attDb, 1)} <span class="u">dB</span>`, `@ ${si(r.fx, 'Hz', 3)}`],
      ])
        + messages('warn', r.warnings)
        + block('em_resp', rows([
          ['em_z0', si(r.z0, 'Ω', 3)],
          ['em_q', Number.isFinite(r.q) ? fmt(r.q, 3) : '∞'],
          ['em_peak', peak],
          r.damped && r.attBareDb !== undefined && ['em_attBare', `${fixed(r.attBareDb, 1)} dB`],
          ['em_suggest', t('em_suggestV', { cd: si(r.suggest.cd, 'F', 3), rd: si(r.suggest.rd, 'Ω', 3) })],
        ]))
        + formulaBlock([
          'f0 = 1 / (2π·√(L·C))      Z0 = √(L/C)',
          'H(s) = 1 / (L·C·s² + (L/RL + Rs·C)·s + 1 + Rs/RL)',
          'Q = √(L·C·(1 + Rs/RL)) / (L/RL + Rs·C)      (no load: Q = Z0/Rs)',
          'peak = Q / √(1 − 1/(4Q²))  for Q > 0.707',
          'Rd–Cd damping, n = Cd/C:  Rd,opt = Z0·√((2 + n)(4 + 3n) / (2n²(4 + n)))',
        ], 'em_noteLc', [
          'Analog Devices AN-1368 “Ferrite Bead Demystified”',
          'R. W. Erickson, D. Maksimović, Fundamentals of Power Electronics, §10.4',
          'H. W. Ott, Electromagnetic Compatibility Engineering (2009)',
        ]);
    }
    return heroes([
      ['em_pitch', `${fmt(r.pitch * 1000, 3)} <span class="u">mm</span>`, isImperial() ? `${fmt((r.pitch * 1000) / 0.0254, 3)} mil` : ''],
      ['em_fmax', siHtml(r.fHz, 'Hz', 3)],
    ])
      + messages('warn', r.warnings)
      + block('results', rows([
        ['em_lambda', lenStr(r.lambda)],
        ['λ / 10', lenStr(r.l10), false, true],
        ['λ / 20', lenStr(r.l20), false, true],
        r.count !== undefined && ['em_count', `${r.count}`, true],
      ]))
      + formulaBlock([
        'f_max = 0.35 / tr   or   N·f_clk',
        'λ = c / (f_max·√εr)',
        'pitch ≤ λ/20   (λ/10 at most)',
        'N_vias = ⌈edge / pitch⌉ + 1',
      ], 'em_noteVia', [
        'M. K. Armstrong, “PCB design techniques for lowest-cost EMC compliance”, IEE ECEJ 11(4), 1999',
        'H. W. Ott, Electromagnetic Compatibility Engineering, Wiley 2009',
        'H. Johnson, M. Graham, High-Speed Digital Design (1993)',
      ]);
  },
};
