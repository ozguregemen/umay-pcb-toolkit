import { matchNetwork, lSolutionCount, stepsOf, cx, cinv } from '../engine/matching.js';
import { heroes, rows, block, steps, messages, invalid } from '../ui/calculator.js';
import { tx } from '../ui/math.js';
import { fmt, fixed, si, siHtml } from '../ui/format.js';
import { svg, twoTerm, wire, node, ground, terminal, text, path, poly, circle, arrow } from '../ui/svg.js';
import { t } from '../i18n.js';

const strings = {
  tr: {
    mt_secTerm: 'Kaynak ve yük',
    mt_secNet: 'Eşleştirme ağı',
    mt_f: 'Frekans',
    mt_rs: 'Kaynak direnci (Rs)',
    mt_xs: 'Kaynak reaktansı (Xs)',
    mt_xsInfo: 'Kaynak empedansı Zs = Rs + jXs. RF çıkışlarının ve kabloların çoğu için Zs = 50 Ω (Xs = 0). Bir yükselteç ya da RF IC için veri sayfasında verilen optimum empedans karmaşık olabilir. Ağ, girişinde Zs’nin eşleniğini (Zs* = Rs − jXs) gösterecek biçimde tasarlanır: en yüksek güç aktarımı koşulu budur.',
    mt_rl: 'Yük direnci (RL)',
    mt_xl: 'Yük reaktansı (XL)',
    mt_xlInfo: 'Yük empedansı ZL = RL + jXL: endüktif yükte XL > 0, kapasitif yükte XL < 0. Rezonansından kısa bir PCB anteni (monopol/IFA) tipik olarak düşük dirençli ve kapasitiftir (ör. 12 − j20 Ω). Gerçek değeri VNA ile, eşleştirme pad’lerinin bulunduğu noktada ölçün.',
    mt_top: 'Topoloji',
    mt_L: 'L (2 eleman)',
    mt_pi: 'π (3 eleman)',
    mt_T: 'T (3 eleman)',
    mt_topInfo: 'L ağı en az elemanla eşleştirir, ancak Q’su (dolayısıyla bant genişliği) direnç oranıyla kendiliğinden belirlenir. π ve T ağlarında Q’yu siz seçersiniz: yüksek Q daha dar bant ve daha güçlü harmonik bastırma demektir. Anten beslemelerinde π ağı yaygındır: kartta üç pad bırakılır, ölçümden sonra gereken parçalar takılır.',
    mt_sol: 'L çözümü',
    mt_solInfo: 'L ağının genellikle iki çözümü vardır: biri alçak geçiren (seri L, paralel C), diğeri yüksek geçiren (seri C, paralel L) karakterlidir. Karmaşık yüklerde dört çözüm olabilir. Tüm çözümler sonuçlarda listelenir; alçak geçiren çözüm harmonikleri de bastırır.',
    mt_s1: 'Çözüm 1',
    mt_s2: 'Çözüm 2',
    mt_s3: 'Çözüm 3',
    mt_s4: 'Çözüm 4',
    mt_pt: 'Karakter',
    mt_lp: 'Alçak geçiren (seri L)',
    mt_hp: 'Yüksek geçiren (seri C)',
    mt_ptInfo: 'Alçak geçiren π/T ağı (seri L, paralel C) harmonikleri bastırır ve en yaygın olanıdır. Yüksek geçiren sürüm (seri C, paralel L) DC’yi keser. Karmaşık yüklerde uçtaki bir eleman, yükün reaktansını yutmak için tür değiştirebilir.',
    mt_q: 'Yüklü Q',
    mt_qInfo: 'π ve T ağında Q bant genişliğini belirler: sanal direnç Rv, Q’dan bulunur (π: Rv = R_H/(Q² + 1), T: Rv = R_küçük·(Q² + 1)). Q, aynı uçlar için L ağının Q’sundan (en küçük Q) büyük olmalıdır. Tipik değerler 2–10 arasıdır.',
    mt_es: 'Standart değere yuvarla',
    mt_exact: 'Yuvarlama yok',
    mt_esInfo: 'Her parça seçilen E serisinin en yakın değerine yuvarlanır ve eşleşme bu değerlerle yeniden hesaplanır. RF bobinleri ve küçük kapasitörler çoğunlukla E12/E24 adımlarında bulunur; daha ince ayar için iki parça seri ya da paralel birleştirilebilir.',
    mt_role_series: 'seri',
    mt_role_shuntSrc: 'paralel, kaynak tarafı',
    mt_role_shuntLoad: 'paralel, yük tarafı',
    mt_role_seriesSrc: 'seri, kaynak tarafı',
    mt_role_seriesLoad: 'seri, yük tarafı',
    mt_role_shuntMid: 'paralel, ortada',
    mt_series: 'seri',
    mt_shunt: 'paralel',
    mt_exactV: 'tam',
    mt_match: 'Eşleşme',
    mt_before: 'Ağ yokken (yük doğrudan kaynakta)',
    mt_after: 'Ağ ile (tam değerler)',
    mt_afterStd: 'Ağ ile ({es} değerleri)',
    mt_zin: 'Ağın giriş empedansı Zin',
    mt_zinStd: 'Zin ({es} değerleri)',
    mt_target: 'Hedef Zs* (kaynağın eşleniği)',
    mt_comp: 'Bileşenler',
    mt_props: 'Ağ özellikleri',
    mt_qNode: 'Ağın Q’su (düğüm Q)',
    mt_qDesign: 'Tasarım Q’su',
    mt_qMin: 'En küçük Q (L ağı)',
    mt_rv: 'Sanal direnç Rv',
    mt_bw3: '−3 dB bant genişliği (tarama)',
    mt_bwV: 'VSWR ≤ 2 bandı (tarama)',
    mt_allSol: 'Tüm L çözümleri',
    mt_selected: 'seçili',
    mt_type_lp: 'alçak geçiren',
    mt_type_hp: 'yüksek geçiren',
    mt_type_mixed: 'karışık',
    mt_type_single: 'tek eleman',
    mt_type_none: 'eleman yok',
    mt_noNet: 'Eşleştirme ağı',
    mt_none: 'gerekmiyor',
    mt_stYt: 'Kaynaktaki hedef admitans 1/Zs* = Gt + jBt',
    mt_stYl: 'Yük admitansı 1/ZL = GL + jBL',
    mt_stXtot: 'Yük tarafındaki toplam seri reaktans (XL + X)',
    mt_stBtot: 'Yük düğümündeki toplam süseptans (BL + B)',
    mt_stRps: 'Kaynağın paralel eşdeğer direnci',
    mt_stRpl: 'Yükün paralel eşdeğer direnci',
    mt_stX2: 'Yük yarısı: Rv’ye kadar seri reaktans',
    mt_stX1: 'Kaynak yarısı: Rv’den sonraki seri reaktans',
    mt_stB2: 'Yük yarısı: 1/Rv’ye kadar paralel süseptans',
    mt_stB1: 'Kaynak yarısı: 1/Rv’den sonraki paralel süseptans',
    mt_stSign: 'Karekökün iki işareti de geçerli bir ağ verir; burada seçili çözümün işareti kullanılır (+ alçak geçiren benzeri, − yüksek geçiren benzeri biçim).',
    mt_note: 'Eşleştirme ağı kayıpsız kabul edilir. Her tasarım devre analiziyle doğrulanır: Zin, ZL’den başlanarak ağ boyunca geriye hesaplanır ve Zs* ile karşılaştırılır (Γ ≈ 0). Smith abağı, kaynak salt dirençse Z₀ = Rs’ye normalize edilir; böylece tam eşleşme merkezde biter. Kaynak karmaşıksa abak 50 Ω’a (VNA referansı) normalize edilir ve yol merkez yerine Zs* noktasında biter. Seri eleman noktayı sabit r çemberi, paralel eleman sabit g çemberi üzerinde taşır: seri L ve paralel C saat yönünde, seri C ve paralel L ters yönde. Bant genişliği frekans taramasıyla bulunur; kaynak ve yükün reaktansı f0’daki eşdeğer sabit L veya C olarak modellenir. Gerçek bir antenin empedansı frekansla farklı değişir, bu yüzden bu değer yaklaşıktır. Kaba kural BW ≈ f0/Q_L’dir; L ağında yüklü Q_L yaklaşık Q/2’dir, çünkü düğümü kaynak ve yük birlikte yükler. Bobin ESR’si, öz rezonans (SRF) ve pad parazitikleri dahil değildir; parçaların SRF’si çalışma frekansının en az 2–3 katı olmalıdır.',
    err_mtInputs: 'Frekans, Rs ve RL sıfırdan büyük olmalı.',
    err_mtQMin: 'Q = {q}, bu uçlar için en küçük Q’nun ({qmin}) altında: sanal direnç uç dirençlerinin yanlış tarafına düşer. Q’yu artırın ya da L ağını kullanın.',
    warn_mtSol: 'Bu uçlar için yalnızca {n} L çözümü var; çözüm 1 gösteriliyor.',
    warn_mtTinyL: 'Bir bobin 1 nH’nin altında: pad ve iz endüktansı aynı mertebede olduğundan değer tutmaz. Diğer çözümü deneyin ya da bu elemanı kısa bir iz olarak düşünün.',
    warn_mtTinyC: 'Bir kapasitör 0,5 pF’nin altında: pad ve gövde parazitik kapasitesi aynı mertebededir. Diğer çözümü deneyin.',
    warn_mtHighQ: 'Q > 10: bant dar olur, eşleşme bileşen toleranslarına çok duyarlıdır ve bobin kaybı artar.',
    warn_mtStd: '{es} değerleriyle geri dönüş kaybı {rl} dB’ye düşüyor. E24’ü, diğer çözümü ya da iki parçanın birleşimini deneyin.',
    warn_mtHighF: '3 GHz’in üstünde 0402/0201 parçaların parazitikleri ve pad uzunlukları belirgindir; sonucu üretici S-parametre modelleriyle ya da VNA ile doğrulayın. Daha yüksek frekansta dağıtılmış (stub) eşleştirme tercih edilir.',
    ok_mtMatched: 'Yük zaten kaynağın eşleniği: eşleştirme ağı gerekmiyor.',
    mt_dgSch: '{top} eşleştirme ağı: kaynak, ağ ve yük, canlı değerlerle',
    mt_dgSource: 'kaynak',
    mt_dgLoad: 'yük',
    mt_dgSmith: 'Smith abağı · Z₀ = {z0}',
    mt_dgSmithAria: 'Smith abağında eşleştirme yolu: ZL yük noktasından Zs* hedefine',
    mt_dgAlongR: 'sabit r',
    mt_dgAlongG: 'sabit g',
    mt_dgTarget: 'hedef Zs*',
    mt_dgStd: '{es} değerleriyle',
    mt_dgInd: '+jX endüktif',
    mt_dgCap: '−jX kapasitif',
  },
  en: {
    mt_secTerm: 'Source and load',
    mt_secNet: 'Matching network',
    mt_f: 'Frequency',
    mt_rs: 'Source resistance (Rs)',
    mt_xs: 'Source reactance (Xs)',
    mt_xsInfo: 'Source impedance Zs = Rs + jXs. For most RF outputs and cables Zs = 50 Ω (Xs = 0). The optimum impedance given in an amplifier or RF IC datasheet can be complex. The network is designed to present the conjugate of Zs (Zs* = Rs − jXs) at its input: that is the condition for maximum power transfer.',
    mt_rl: 'Load resistance (RL)',
    mt_xl: 'Load reactance (XL)',
    mt_xlInfo: 'Load impedance ZL = RL + jXL: XL > 0 for an inductive load, XL < 0 for a capacitive one. A PCB antenna (monopole/IFA) that is shorter than resonance is typically low-resistance and capacitive (e.g. 12 − j20 Ω). Measure the real value with a VNA at the point where the matching pads sit.',
    mt_top: 'Topology',
    mt_L: 'L (2 parts)',
    mt_pi: 'π (3 parts)',
    mt_T: 'T (3 parts)',
    mt_topInfo: 'An L network matches with the fewest parts, but its Q (and so its bandwidth) is fixed by the resistance ratio. In π and T networks you choose Q: a higher Q means a narrower band and stronger harmonic rejection. π networks are common at antenna feeds: three pads are left on the board and the parts needed are fitted after measurement.',
    mt_sol: 'L solution',
    mt_solInfo: 'An L network usually has two solutions: one low-pass (series L, shunt C) and one high-pass (series C, shunt L). Complex loads can have four. All solutions are listed in the results; the low-pass one also attenuates harmonics.',
    mt_s1: 'Solution 1',
    mt_s2: 'Solution 2',
    mt_s3: 'Solution 3',
    mt_s4: 'Solution 4',
    mt_pt: 'Response',
    mt_lp: 'Low-pass (series L)',
    mt_hp: 'High-pass (series C)',
    mt_ptInfo: 'The low-pass π/T network (series L, shunt C) attenuates harmonics and is the most common one. The high-pass version (series C, shunt L) blocks DC. With complex loads an end part may change type to absorb the load reactance.',
    mt_q: 'Loaded Q',
    mt_qInfo: 'In a π or T network Q sets the bandwidth: the virtual resistance Rv follows from Q (π: Rv = R_H/(Q² + 1), T: Rv = R_small·(Q² + 1)). Q must be greater than the L-network Q of the same terminations (the minimum Q). Typical values are 2–10.',
    mt_es: 'Round to standard values',
    mt_exact: 'No rounding',
    mt_esInfo: 'Each part is rounded to the nearest value of the chosen E series and the match is recomputed with those values. RF inductors and small capacitors mostly come in E12/E24 steps; for finer tuning two parts can be combined in series or parallel.',
    mt_role_series: 'series',
    mt_role_shuntSrc: 'shunt, source side',
    mt_role_shuntLoad: 'shunt, load side',
    mt_role_seriesSrc: 'series, source side',
    mt_role_seriesLoad: 'series, load side',
    mt_role_shuntMid: 'shunt, middle',
    mt_series: 'series',
    mt_shunt: 'shunt',
    mt_exactV: 'exact',
    mt_match: 'Match',
    mt_before: 'Without the network (load straight on the source)',
    mt_after: 'With the network (exact values)',
    mt_afterStd: 'With the network ({es} values)',
    mt_zin: 'Network input impedance Zin',
    mt_zinStd: 'Zin ({es} values)',
    mt_target: 'Target Zs* (conjugate of the source)',
    mt_comp: 'Components',
    mt_props: 'Network properties',
    mt_qNode: 'Network Q (node Q)',
    mt_qDesign: 'Design Q',
    mt_qMin: 'Minimum Q (L network)',
    mt_rv: 'Virtual resistance Rv',
    mt_bw3: '−3 dB bandwidth (sweep)',
    mt_bwV: 'VSWR ≤ 2 band (sweep)',
    mt_allSol: 'All L solutions',
    mt_selected: 'selected',
    mt_type_lp: 'low-pass',
    mt_type_hp: 'high-pass',
    mt_type_mixed: 'mixed',
    mt_type_single: 'single part',
    mt_type_none: 'no parts',
    mt_noNet: 'Matching network',
    mt_none: 'not needed',
    mt_stYt: 'Target admittance at the source 1/Zs* = Gt + jBt',
    mt_stYl: 'Load admittance 1/ZL = GL + jBL',
    mt_stXtot: 'Total series reactance on the load side (XL + X)',
    mt_stBtot: 'Total susceptance at the load node (BL + B)',
    mt_stRps: 'Parallel-equivalent resistance of the source',
    mt_stRpl: 'Parallel-equivalent resistance of the load',
    mt_stX2: 'Load half: series reactance up to Rv',
    mt_stX1: 'Source half: series reactance from Rv',
    mt_stB2: 'Load half: shunt susceptance down to 1/Rv',
    mt_stB1: 'Source half: shunt susceptance from 1/Rv',
    mt_stSign: 'Both signs of the square root give a valid network; the sign of the selected solution is used here (+ the low-pass-like form, − the high-pass-like one).',
    mt_note: 'The matching network is assumed lossless. Every design is verified by circuit analysis: Zin is computed from ZL back through the network and compared with Zs* (Γ ≈ 0). The Smith chart is normalised to Z₀ = Rs when the source is purely resistive, so a perfect match ends at the centre. For a complex source it is normalised to 50 Ω (the VNA reference) and the path ends at the point Zs* instead of the centre. A series part moves the point along a constant-r circle, a shunt part along a constant-g circle: series L and shunt C clockwise, series C and shunt L the other way. Bandwidth comes from a frequency sweep in which the source and load reactance at f0 are modelled as an equivalent fixed L or C. A real antenna’s impedance changes differently with frequency, so this value is approximate. The rule of thumb is BW ≈ f0/Q_L; in an L network the loaded Q_L is about Q/2 because the source and the load both load the node. Inductor ESR, self-resonance (SRF) and pad parasitics are not included; the parts’ SRF should be at least 2–3 times the operating frequency.',
    err_mtInputs: 'Frequency, Rs and RL must be greater than zero.',
    err_mtQMin: 'Q = {q} is below the minimum Q ({qmin}) for these terminations: the virtual resistance would fall on the wrong side of the end resistances. Increase Q or use the L network.',
    warn_mtSol: 'These terminations have only {n} L solution(s); showing solution 1.',
    warn_mtTinyL: 'An inductor is below 1 nH: pad and trace inductance are of the same order, so the value will not hold. Try the other solution or consider this part as a short trace.',
    warn_mtTinyC: 'A capacitor is below 0.5 pF: pad and body parasitic capacitance are of the same order. Try the other solution.',
    warn_mtHighQ: 'Q > 10: the band is narrow, the match is very sensitive to part tolerances and inductor loss grows.',
    warn_mtStd: 'With {es} values the return loss drops to {rl} dB. Try E24, the other solution or a combination of two parts.',
    warn_mtHighF: 'Above 3 GHz the parasitics of 0402/0201 parts and pad lengths are significant; verify with the manufacturers’ S-parameter models or a VNA. At higher frequencies distributed (stub) matching is preferred.',
    ok_mtMatched: 'The load is already the conjugate of the source: no matching network is needed.',
    mt_dgSch: '{top} matching network: source, network and load with live values',
    mt_dgSource: 'source',
    mt_dgLoad: 'load',
    mt_dgSmith: 'Smith chart · Z₀ = {z0}',
    mt_dgSmithAria: 'Matching path on the Smith chart: from the load point ZL to the target Zs*',
    mt_dgAlongR: 'constant r',
    mt_dgAlongG: 'constant g',
    mt_dgTarget: 'target Zs*',
    mt_dgStd: 'with {es} values',
    mt_dgInd: '+jX inductive',
    mt_dgCap: '−jX capacitive',
  },
};

// ---------------------------------------------------------------------------
// Formatting (labels only — never in SVG geometry)
// ---------------------------------------------------------------------------

/** Complex impedance as "12 − j20 Ω"; compact drops "+ j0". */
function zText(z, sig = 4, compact = false) {
  if (!z || !Number.isFinite(z.re) || !Number.isFinite(z.im)) return '?';
  const tiny = 1e-6 * Math.max(1, Math.abs(z.re), Math.abs(z.im));
  const re = Math.abs(z.re) < tiny ? 0 : z.re;
  const im = Math.abs(z.im) < tiny ? 0 : z.im;
  if (compact && im === 0) return `${fmt(re, sig)} Ω`;
  return `${fmt(re, sig)} ${im < 0 ? '−' : '+'} j${fmt(Math.abs(im), sig)} Ω`;
}
const unitOf = (p) => (p.kind === 'L' ? 'H' : 'F');
const rlText = (m) => (m.gamma < 1e-3 ? '> 60 dB' : `${fixed(m.returnLossDb, 1)} dB`);
const vswrText = (m) => (m.vswr < 100 ? fixed(m.vswr, 2) : '> 100');
const matchText = (m) => `<b>${rlText(m)}</b> · VSWR ${vswrText(m)} · |Γ| = ${fixed(m.gamma, 3)}`;
/** Reactance of a part at f0 (shunt parts: X = −1/B), with a true minus sign. */
function xText(p) {
  const x = p.pos === 'series' ? p.react : -1 / p.react;
  return `X = ${x < 0 ? '−' : ''}${fmt(Math.abs(x), 4)} Ω`;
}

function bandText(b, bw) {
  if (!b || (b.lo === null && b.hi === null)) return '—';
  const lo = b.lo === null ? `< ${si(bw.fMin, 'Hz', 3)}` : si(b.lo, 'Hz', 4);
  const hi = b.hi === null ? `> ${si(bw.fMax, 'Hz', 3)}` : si(b.hi, 'Hz', 4);
  const width = b.lo !== null && b.hi !== null ? `<b>${si(b.hi - b.lo, 'Hz', 3)}</b> · ` : '';
  return `${width}${lo} … ${hi}`;
}

const TOP_LABEL = { L: 'mt_L', pi: 'mt_pi', T: 'mt_T' };
const topOf = (v) => (v.top === 'pi' || v.top === 'T' ? v.top : 'L');
const termsValid = (v) => v.rs > 0 && v.rl > 0 && Number.isFinite(v.xs) && Number.isFinite(v.xl);
const lCount = (v) => (termsValid(v) ? lSolutionCount(cx(v.rs, v.xs), cx(v.rl, v.xl)) : 0);
const FREQ = { GHz: 1e9, MHz: 1e6, kHz: 1e3 };

// SVG coordinates: plain numbers rounded to 0.1 (TR uses a decimal comma in labels).
const n1 = (x) => Math.round(x * 10) / 10;

// ---------------------------------------------------------------------------
// Diagram 1: schematic with live values
// ---------------------------------------------------------------------------

const PLACEHOLDER = {
  L: [{ pos: 'shunt', kind: '?' }, { pos: 'series', kind: '?' }],
  pi: [{ pos: 'shunt', kind: '?' }, { pos: 'series', kind: '?' }, { pos: 'shunt', kind: '?' }],
  T: [{ pos: 'series', kind: '?' }, { pos: 'shunt', kind: '?' }, { pos: 'series', kind: '?' }],
};

function schematic(v, r) {
  const yR = 58;
  const yG = 138;
  const xS = 30;
  const pIn = 100;
  const pOut = 340;
  const xL = 392;
  const top = topOf(v);
  const parts = r ? (r.stdParts ?? r.parts) : PLACEHOLDER[top];
  const pattern = parts.map((p) => (p.pos === 'series' ? 's' : 'p')).join('');
  const LAYOUT = {
    ps: [{ x: 150 }, { x1: 150, x2: pOut }],
    sp: [{ x1: pIn, x2: 290 }, { x: 290 }],
    psp: [{ x: 140 }, { x1: 140, x2: 300 }, { x: 300 }],
    sps: [{ x1: pIn, x2: 220 }, { x: 220 }, { x1: 220, x2: pOut }],
  };
  const lay = LAYOUT[pattern] ?? LAYOUT.ps;
  const label = (p) => (p.kind === '?' ? { name: '', value: '?' } : { name: p.name, value: si(p.value, unitOf(p), 3) });

  let b = twoTerm('AC', xS, yR, xS, yG)
    + twoTerm('R', xS, yR, pIn, yR, { name: 'Zs' })
    + wire([pOut, yR], [xL, yR])
    + twoTerm('R', xL, yR, xL, yG, { name: 'ZL' })
    + wire([xS, yG], [xL, yG]) + ground(65, yG) + node(65, yG);
  let cursor = pIn;
  parts.forEach((p, i) => {
    const L = lay[i];
    const kind = p.kind === '?' ? '?' : p.kind;
    if (p.pos === 'shunt') {
      if (cursor < L.x) b += wire([cursor, yR], [L.x, yR]);
      cursor = Math.max(cursor, L.x);
      if (kind) b += twoTerm(kind, L.x, yR, L.x, yG, { ...label(p), hi: true }) + node(L.x, yR) + node(L.x, yG);
    } else {
      if (cursor < L.x1) b += wire([cursor, yR], [L.x1, yR]);
      b += kind ? twoTerm(kind, L.x1, yR, L.x2, yR, { ...label(p), hi: true }) : wire([L.x1, yR], [L.x2, yR]);
      cursor = L.x2;
    }
  });
  if (cursor < pOut) b += wire([cursor, yR], [pOut, yR]);
  b += terminal(pIn, yR, '') + terminal(pOut, yR, '');

  // Zin looking into the network (with the values in use).
  const zin = r ? (r.zinStd ?? r.zin) : null;
  b += text(pIn, 16, `Zin = ${zin ? zText(zin, 4) : '?'}`, { cls: 'val', anchor: 'start' })
    + arrow(pIn, 25, pIn + 30, 25, { cls: 'flow', headCls: 'arrow flow' })
    + path(`M${pIn},27V${yR - 4}`, 'ext');
  // Terminations under the ground rail.
  const zs = termsValid(v) ? cx(v.rs, v.xs) : null;
  const zl = termsValid(v) ? cx(v.rl, v.xl) : null;
  b += text(8, 170, t('mt_dgSource'), { anchor: 'start' })
    + text(8, 185, `Zs = ${zText(zs, 4, true)}`, { cls: 'val', anchor: 'start' })
    + text(432, 170, t('mt_dgLoad'), { anchor: 'end' })
    + text(432, 185, `ZL = ${zText(zl, 4, true)}`, { cls: 'val', anchor: 'end' });
  return svg(440, 194, b, t('mt_dgSch', { top: t(TOP_LABEL[top]) }), { wide: true });
}

// ---------------------------------------------------------------------------
// Diagram 2: Smith chart with the matching path
// ---------------------------------------------------------------------------

const CX0 = 128;
const CY0 = 138;
const RAD = 112;

/** Pixel position of a normalised reflection coefficient. */
const px = (g) => [CX0 + RAD * g.re, CY0 - RAD * g.im];
/** Γ of impedance z on a real reference z0. */
function gam(z, z0) {
  const a = cx(z.re - z0, z.im);
  const bb = cx(z.re + z0, z.im);
  const d = bb.re * bb.re + bb.im * bb.im;
  return cx((a.re * bb.re + a.im * bb.im) / d, (a.im * bb.re - a.re * bb.im) / d);
}

/** Constant-x arc inside the unit circle: centre (1, 1/x), radius 1/|x|. */
function xArc(x) {
  const c = { re: 1, im: 1 / x };
  const a0 = Math.atan2((2 * x) / (x * x + 1) - c.im, (x * x - 1) / (x * x + 1) - c.re);
  const a1 = Math.atan2(-c.im, 0);
  let d = a1 - a0;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  const pts = [];
  for (let i = 0; i <= 28; i++) {
    const a = a0 + (d * i) / 28;
    pts.push(px({ re: c.re + Math.cos(a) / Math.abs(x), im: c.im + Math.sin(a) / Math.abs(x) }));
  }
  return poly(pts, 'grid-l');
}

function smithGrid(centreTarget) {
  let b = '';
  for (const r of [0.2, 0.5, 1, 2, 5]) b += circle(CX0 + (RAD * r) / (1 + r), CY0, RAD / (1 + r), 'grid-l');
  for (const x of [0.2, 0.5, 1, 2, 5]) b += xArc(x) + xArc(-x);
  b += path(`M${CX0 - RAD},${CY0}H${CX0 + RAD}`, 'grid-l') + circle(CX0, CY0, RAD, 'axis');
  // Grid labels: r on the real axis (r = 1 is the centre, labelled by the
  // target marker when the source is resistive), x on the rim.
  for (const r of centreTarget ? [0.2, 0.5, 2, 5] : [0.2, 0.5, 1, 2, 5]) {
    b += text(CX0 + (RAD * (r - 1)) / (r + 1) + 2, CY0 - 3, fmt(r, 2), { cls: 'lbl', anchor: 'start', size: 8.5 });
  }
  for (const x of [0.5, 1, 2, -0.5, -1, -2]) {
    const g = { re: (x * x - 1) / (x * x + 1), im: (2 * x) / (x * x + 1) };
    const k = (RAD + 9) / RAD;
    const [tx, ty] = px({ re: g.re * k, im: g.im * k });
    const anchor = g.re < -0.2 ? 'end' : g.re > 0.2 ? 'start' : 'middle';
    b += text(tx, ty + 3, `${x < 0 ? '−' : ''}j${fmt(Math.abs(x), 2)}`, { cls: 'lbl', anchor, size: 8.5 });
  }
  b += text(CX0 - RAD - 3, CY0 + 4, '0', { cls: 'lbl', anchor: 'end', size: 8.5 })
    + text(CX0 + RAD + 3, CY0 + 4, '∞', { cls: 'lbl', anchor: 'start', size: 9 })
    + text(6, 14, t('mt_dgInd'), { cls: 'lbl', anchor: 'start' })
    + text(6, 268, t('mt_dgCap'), { cls: 'lbl', anchor: 'start' });
  return b;
}

/** Points along one step: series parts follow constant r, shunt parts constant g. */
function stepPoints(s, z0) {
  const pts = [];
  const y0 = cinv(s.from);
  for (let i = 0; i <= 40; i++) {
    const k = (s.react * i) / 40;
    const z = s.part.pos === 'series' ? cx(s.from.re, s.from.im + k) : cinv(cx(y0.re, y0.im + k));
    pts.push(px(gam(z, z0)));
  }
  return pts;
}

/** Open chevron at the middle of a path, pointing along the direction of travel. */
function chevron(pts) {
  const m = Math.floor(pts.length / 2);
  const [x1, y1] = pts[m - 1];
  const [x2, y2] = pts[m + 1];
  const a = Math.atan2(y2 - y1, x2 - x1);
  const [x, y] = pts[m];
  const s = 6;
  return `<path class="wave" d="M${n1(x - s * Math.cos(a - 0.5))},${n1(y - s * Math.sin(a - 0.5))}L${n1(x)},${n1(y)}L${n1(x - s * Math.cos(a + 0.5))},${n1(y - s * Math.sin(a + 0.5))}"/>`;
}

/** Label beside a chart point, pushed away from the centre. */
function pointLabel([x, y], s, cls = 'name') {
  const dx = x - CX0;
  const dy = y - CY0;
  const d = Math.hypot(dx, dy);
  const [ux, uy] = d < 18 ? [0.7, -0.7] : [dx / d, dy / d];
  const anchor = ux > 0.35 ? 'start' : ux < -0.35 ? 'end' : 'middle';
  return text(x + ux * 10, y + uy * 10 + 4, s, { cls, anchor });
}

function smith(v, r) {
  const ok = termsValid(v);
  const z0 = ok && v.xs === 0 ? v.rs : 50;
  let b = smithGrid(ok && v.xs === 0);
  const lx = 268;
  let ly = 22;
  b += text(lx, ly, t('mt_dgSmith', { z0: si(z0, 'Ω', 4) }), { cls: 'title', anchor: 'start' });
  if (!ok) return svg(440, 276, b, t('mt_dgSmithAria'), { wide: true });

  const zl = cx(v.rl, v.xl);
  const target = cx(v.rs, -v.xs);
  const pL = px(gam(zl, z0));
  const pT = px(gam(target, z0));
  const legendPoints = [];
  if (r) {
    const steps = stepsOf(r.parts, zl, r.w);
    // Constant-r / constant-g circles that the steps follow (faint).
    for (const s of steps) {
      if (s.part.pos === 'series') {
        const rn = s.from.re / z0;
        b += circle(CX0 + (RAD * rn) / (1 + rn), CY0, RAD / (1 + rn), 'ext');
      } else {
        const gn = cinv(s.from).re * z0;
        b += circle(CX0 - (RAD * gn) / (1 + gn), CY0, RAD / (1 + gn), 'ext');
      }
    }
    if (r.stdParts) {
      for (const s of stepsOf(r.stdParts, zl, r.w)) b += poly(stepPoints(s, z0), 'wave2');
      const pStd = px(gam(r.zinStd, z0));
      b += circle(pStd[0], pStd[1], 3, 'term');
    }
    steps.forEach((s, i) => {
      const pts = stepPoints(s, z0);
      b += poly(pts, 'wave') + chevron(pts);
      const from = i === 0 ? 'ZL' : String(i);
      const to = i === steps.length - 1 ? 'Zs*' : String(i + 1);
      legendPoints.push({ from, to, s });
      if (i < steps.length - 1) {
        const end = pts[pts.length - 1];
        b += circle(end[0], end[1], 3, 'term') + pointLabel(end, String(i + 1));
      }
    });
  }
  b += circle(pT[0], pT[1], 6, 'wire hi') + circle(pL[0], pL[1], 3.6, 'node')
    + pointLabel(pL, 'ZL') + pointLabel(pT, 'Zs*');

  // Legend
  ly += 24;
  b += circle(lx + 4, ly - 4, 3.6, 'node') + text(lx + 14, ly, `ZL = ${zText(zl, 3, true)}`, { cls: 'val', anchor: 'start' });
  for (const { from, to, s } of legendPoints) {
    ly += 20;
    const along = s.part.pos === 'series' ? 'mt_dgAlongR' : 'mt_dgAlongG';
    b += text(lx, ly, `${from} → ${to}`, { cls: 'name', anchor: 'start' })
      + text(lx + 58, ly, `${s.part.name} ${t(s.part.pos === 'series' ? 'mt_series' : 'mt_shunt')} · ${t(along)}`, { anchor: 'start', cls: 'lbl' });
  }
  ly += 22;
  b += circle(lx + 4, ly - 4, 5, 'wire hi') + text(lx + 14, ly, `${t('mt_dgTarget')} = ${zText(target, 3, true)}`, { cls: 'lbl', anchor: 'start' });
  if (r) {
    ly += 22;
    b += text(lx, ly, `|Γ|: ${fixed(r.before.gamma, 3)} → ${fixed(r.after.gamma, 3)}`, { cls: 'val', anchor: 'start' });
    if (r.stdParts) {
      ly += 20;
      b += path(`M${lx},${ly - 4}h18`, 'wave2')
        + text(lx + 24, ly, `${t('mt_dgStd', { es: r.series })}: |Γ| = ${fixed(r.afterStd.gamma, 3)}`, { cls: 'lbl', anchor: 'start' });
    }
  }
  return svg(440, 276, b, t('mt_dgSmithAria'), { wide: true });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const isL = (v) => topOf(v) === 'L';

function partsText(parts) {
  const on = parts.filter((p) => p.kind);
  if (!on.length) return t('mt_none');
  return on.map((p) => `${t(p.pos === 'series' ? 'mt_series' : 'mt_shunt')} ${p.kind} ${si(p.value, unitOf(p), 4)}`).join(' · ');
}

// ---------------------------------------------------------------------------
// Calculation steps
// ---------------------------------------------------------------------------

/**
 * Signed value with its unit and a true minus sign; `par` puts a negative
 * value in brackets. Five digits: the steps add and subtract reactances that
 * can lie close together.
 */
function sq(x, unit, par = false) {
  const s = tx(x < 0 ? `−${si(-x, unit, 5)}` : si(x, unit, 5));
  return x < 0 && par ? `(${s})` : s;
}
/** Square of a value with its unit: (−20 Ω)². */
const sqr = (x, unit) => `{(${sq(x, unit)})}^{2}`;
/** Sign of the chosen square root, written only when it is negative. */
const neg = (x) => (x < 0 ? '−' : '');

/**
 * Value of one part from its series reactance X or shunt susceptance B, given
 * as the expression `sym` / `num`. The engine's rule: series X > 0 → L = X/ω,
 * X < 0 → C = −1/(ωX); shunt B > 0 → C = B/ω, B < 0 → L = −1/(ωB).
 */
function partStep(p, r, sym, num) {
  if (!p?.kind) return false;
  const f = tx(si(r.fHz, 'Hz'));
  const name = `${p.kind}_${p.name.slice(1)}`;
  const direct = (p.pos === 'series') === (p.kind === 'L');
  return {
    labelRaw: `${p.name} · ${t(`mt_role_${p.role}`)}${r.stdParts ? ` · ${t('mt_exactV')}` : ''}`,
    sym: direct ? `${name} = \\frac{${sym}}{2π \\cdot f}` : `${name} = \\frac{−1}{2π \\cdot f \\cdot (${sym})}`,
    num: direct ? `\\frac{${num}}{2π \\cdot ${f}}` : `\\frac{−1}{2π \\cdot ${f} \\cdot (${num})}`,
    res: tx(si(p.value, unitOf(p))),
  };
}

/**
 * The design as the engine computes it: the intermediate reactances and
 * susceptances (returned in `detail`), then one step per part.
 */
function worked(r) {
  const d = r.detail;
  const { re: rs, im: xs } = r.zs;
  const { re: rl, im: xl } = r.zl;
  const O = (x, par) => sq(x, 'Ω', par);
  const S = (x, par) => sq(x, 'S', par);
  const q = fmt(r.q, 4);
  const [p1, p2, p3] = r.parts;
  let list;
  if (!d) {
    list = [{ label: 'mt_target', sym: 'Z_{in} = Z_s^{*}' }];
  } else if (r.topology === 'pi') {
    list = [
      { label: 'mt_stRps', sym: 'R_{pS} = \\frac{R_s^{2} + X_s^{2}}{R_s}', num: `\\frac{${sqr(rs, 'Ω')} + ${sqr(xs, 'Ω')}}{${O(rs)}}`, res: O(d.rps) },
      { label: 'mt_stRpl', sym: 'R_{pL} = \\frac{R_L^{2} + X_L^{2}}{R_L}', num: `\\frac{${sqr(rl, 'Ω')} + ${sqr(xl, 'Ω')}}{${O(rl)}}`, res: O(d.rpl) },
      { label: 'mt_rv', sym: 'R_H = \\max(R_{pS}, R_{pL}), \\quad R_v = \\frac{R_H}{Q^{2} + 1}', num: `\\frac{${O(d.rh)}}{{${q}}^{2} + 1}`, res: O(r.rv) },
      { label: 'mt_stBtot', sym: `B_2 = ${neg(d.btot2)}\\sqrt{\\frac{1}{R_{pL} \\cdot R_v} − \\frac{1}{R_{pL}^{2}}}`,
        num: `${neg(d.btot2)}\\sqrt{\\frac{1}{${O(d.rpl)} \\cdot ${O(r.rv)}} − \\frac{1}{${sqr(d.rpl, 'Ω')}}}`, res: S(d.btot2), note: 'mt_stSign' },
      { label: 'mt_stX2', sym: 'X_2 = B_2 \\cdot R_v \\cdot R_{pL}', num: `${S(d.btot2, true)} \\cdot ${O(r.rv)} \\cdot ${O(d.rpl)}`, res: O(d.x2) },
      { label: 'mt_stX1', sym: `X_1 = ${neg(d.x1)}\\sqrt{R_v \\cdot R_{pS} − R_v^{2}}`,
        num: `${neg(d.x1)}\\sqrt{${O(r.rv)} \\cdot ${O(d.rps)} − ${sqr(r.rv, 'Ω')}}`, res: O(d.x1) },
      partStep(p1, r, '\\frac{X_s}{R_s^{2} + X_s^{2}} + \\frac{X_1}{R_v^{2} + X_1^{2}}',
        `\\frac{${O(xs, true)}}{${sqr(rs, 'Ω')} + ${sqr(xs, 'Ω')}} + \\frac{${O(d.x1, true)}}{${sqr(r.rv, 'Ω')} + ${sqr(d.x1, 'Ω')}}`),
      partStep(p2, r, 'X_1 + X_2', `${O(d.x1)} + ${O(d.x2, true)}`),
      partStep(p3, r, 'B_2 + \\frac{X_L}{R_L^{2} + X_L^{2}}', `${S(d.btot2)} + \\frac{${O(xl, true)}}{${sqr(rl, 'Ω')} + ${sqr(xl, 'Ω')}}`),
    ];
  } else if (r.topology === 'T') {
    list = [
      { label: 'mt_rv', sym: 'R_{small} = \\min(R_s, R_L), \\quad R_v = R_{small} \\cdot (Q^{2} + 1)', num: `${O(d.rsmall)} \\cdot ({${q}}^{2} + 1)`, res: O(r.rv) },
      { label: 'mt_stXtot', sym: `X_2 = ${neg(d.xtot2)}\\sqrt{R_L \\cdot R_v − R_L^{2}}`,
        num: `${neg(d.xtot2)}\\sqrt{${O(rl)} \\cdot ${O(r.rv)} − ${sqr(rl, 'Ω')}}`, res: O(d.xtot2), note: 'mt_stSign' },
      { label: 'mt_stB2', sym: 'B_2 = \\frac{X_2}{R_L \\cdot R_v}', num: `\\frac{${O(d.xtot2)}}{${O(rl)} \\cdot ${O(r.rv)}}`, res: S(d.b2) },
      { label: 'mt_stB1', sym: `B_1 = ${neg(d.b1)}\\sqrt{\\frac{1}{R_v \\cdot R_s} − \\frac{1}{R_v^{2}}}`,
        num: `${neg(d.b1)}\\sqrt{\\frac{1}{${O(r.rv)} \\cdot ${O(rs)}} − \\frac{1}{${sqr(r.rv, 'Ω')}}}`, res: S(d.b1) },
      partStep(p1, r, '−X_s + B_1 \\cdot R_s \\cdot R_v', `−${O(xs, true)} + ${S(d.b1, true)} \\cdot ${O(rs)} \\cdot ${O(r.rv)}`),
      partStep(p2, r, 'B_1 + B_2', `${S(d.b1)} + ${S(d.b2, true)}`),
      partStep(p3, r, 'X_2 − X_L', `${O(d.xtot2)} − ${O(xl, true)}`),
    ];
  } else if (r.orient === 'shuntLoad') {
    list = [
      { label: 'mt_stYl', sym: 'G_L = \\frac{R_L}{R_L^{2} + X_L^{2}}', num: `\\frac{${O(rl)}}{${sqr(rl, 'Ω')} + ${sqr(xl, 'Ω')}}`, res: S(d.gl) },
      { label: 'mt_stYl', sym: 'B_L = \\frac{−X_L}{R_L^{2} + X_L^{2}}', num: `\\frac{−${O(xl, true)}}{${sqr(rl, 'Ω')} + ${sqr(xl, 'Ω')}}`, res: S(d.bl) },
      { label: 'mt_stBtot', sym: `B_{tot} = ${neg(d.btot)}\\sqrt{\\frac{G_L}{R_s} − G_L^{2}}`,
        num: `${neg(d.btot)}\\sqrt{\\frac{${S(d.gl)}}{${O(rs)}} − ${sqr(d.gl, 'S')}}`, res: S(d.btot), note: 'mt_stSign' },
      partStep(p1, r, '−X_s + \\frac{B_{tot}}{G_L^{2} + B_{tot}^{2}}', `−${O(xs, true)} + \\frac{${S(d.btot, true)}}{${sqr(d.gl, 'S')} + ${sqr(d.btot, 'S')}}`),
      partStep(p2, r, 'B_{tot} − B_L', `${S(d.btot)} − ${S(d.bl, true)}`),
    ];
  } else {
    list = [
      { label: 'mt_stYt', sym: 'G_t = \\frac{R_s}{R_s^{2} + X_s^{2}}', num: `\\frac{${O(rs)}}{${sqr(rs, 'Ω')} + ${sqr(xs, 'Ω')}}`, res: S(d.gt) },
      { label: 'mt_stYt', sym: 'B_t = \\frac{X_s}{R_s^{2} + X_s^{2}}', num: `\\frac{${O(xs)}}{${sqr(rs, 'Ω')} + ${sqr(xs, 'Ω')}}`, res: S(d.bt) },
      { label: 'mt_stXtot', sym: `X_{tot} = ${neg(d.xtot)}\\sqrt{\\frac{R_L}{G_t} − R_L^{2}}`,
        num: `${neg(d.xtot)}\\sqrt{\\frac{${O(rl)}}{${S(d.gt)}} − ${sqr(rl, 'Ω')}}`, res: O(d.xtot), note: 'mt_stSign' },
      partStep(p1, r, 'B_t + \\frac{X_{tot}}{R_L^{2} + X_{tot}^{2}}', `${S(d.bt)} + \\frac{${O(d.xtot, true)}}{${sqr(rl, 'Ω')} + ${sqr(d.xtot, 'Ω')}}`),
      partStep(p2, r, 'X_{tot} − X_L', `${O(d.xtot)} − ${O(xl, true)}`),
    ];
  }
  return steps(list, { note: 'mt_note', refs: REFS,
    where: [['f', 'mt_f', 'f'], ['R_s', 'mt_rs', 'rs'], ['X_s', 'mt_xs', 'xs'], ['R_L', 'mt_rl', 'rl'], ['X_L', 'mt_xl', 'xl'],
      r.topology !== 'L' && ['Q', 'mt_q', 'q']] });
}

const REFS = [
  'C. Bowick, RF Circuit Design, 2nd ed., ch. 4 (Impedance matching)',
  'D. M. Pozar, Microwave Engineering, 4th ed., §5.1 (L networks)',
  'K. Kurokawa, IEEE T-MTT 13(2), 1965 (power waves)',
  'R. Ludwig & G. Bogdanov, RF Circuit Design, 2nd ed., ch. 8 (Smith chart matching)',
];

export default {
  id: 'matching',
  strings,
  sections: [
    {
      title: 'mt_secTerm',
      fields: [
        { key: 'f', type: 'number', label: 'mt_f', default: 2.45, units: ['GHz', 'MHz', 'kHz'],
          presets: [{ label: '13.56 MHz', value: 13.56, unit: 'MHz' }, { label: '100 MHz', value: 100, unit: 'MHz' },
            { label: '433 MHz', value: 433, unit: 'MHz' }, { label: '868 MHz', value: 868, unit: 'MHz' },
            { label: '2.45 GHz', value: 2.45, unit: 'GHz' }] },
        { key: 'rs', type: 'number', label: 'mt_rs', default: 50, units: ['ohm'],
          presets: [50, 75, 100].map((x) => ({ label: `${x} Ω`, value: x })) },
        { key: 'xs', type: 'number', label: 'mt_xs', default: 0, units: ['ohm'], valid: 'any', info: 'mt_xsInfo' },
        { key: 'rl', type: 'number', label: 'mt_rl', default: 12, units: ['ohm'] },
        { key: 'xl', type: 'number', label: 'mt_xl', default: -20, units: ['ohm'], valid: 'any', info: 'mt_xlInfo' },
      ],
    },
    {
      title: 'mt_secNet',
      fields: [
        { key: 'top', type: 'choice', label: 'mt_top', default: 'L', info: 'mt_topInfo',
          options: [{ value: 'L', label: 'mt_L' }, { value: 'pi', label: 'mt_pi' }, { value: 'T', label: 'mt_T' }] },
        // Two L-solution selectors: two choices normally, four when the
        // terminations allow four solutions (only one is visible at a time).
        { key: 'sol', type: 'choice', label: 'mt_sol', default: '1', info: 'mt_solInfo',
          show: (v) => isL(v) && lCount(v) <= 2,
          options: [1, 2].map((n) => ({ value: String(n), label: `mt_s${n}` })) },
        { key: 'sol4', type: 'choice', label: 'mt_sol', default: '1', info: 'mt_solInfo',
          show: (v) => isL(v) && lCount(v) > 2,
          // Bare numbers keep four buttons on one row on a phone.
          options: [1, 2, 3, 4].map((n) => ({ value: String(n), label: String(n), raw: true })) },
        { key: 'pt', type: 'choice', label: 'mt_pt', default: 'lp', info: 'mt_ptInfo', show: (v) => !isL(v),
          options: [{ value: 'lp', label: 'mt_lp' }, { value: 'hp', label: 'mt_hp' }] },
        { key: 'q', type: 'number', label: 'mt_q', default: 3, info: 'mt_qInfo', show: (v) => !isL(v),
          presets: [2, 3, 5, 10].map((x) => ({ label: String(x), value: x })) },
        { key: 'es', type: 'select', label: 'mt_es', default: 'exact', info: 'mt_esInfo',
          options: [{ value: 'exact', label: 'mt_exact' }, { value: 'E12', label: 'E12', raw: true }, { value: 'E24', label: 'E24', raw: true }] },
      ],
    },
  ],

  compute(v, u) {
    const sol = Number(lCount(v) > 2 ? v.sol4 : v.sol);
    return matchNetwork({
      fHz: v.f * (FREQ[u.f] ?? 1e9),
      zs: cx(v.rs, v.xs),
      zl: cx(v.rl, v.xl),
      topology: topOf(v),
      q: v.q,
      variant: v.pt === 'hp' ? 'hp' : 'lp',
      sol,
      series: v.es,
    });
  },

  diagram(v, u, r) {
    return schematic(v, r) + smith(v, r);
  },

  render(r, v) {
    if (!r.ok) {
      const vars = { mtQMin: { q: fixed(v.q, 2), qmin: fixed(r.qMin, 2) } };
      // Only the Q field is at fault here, so name it instead of the generic
      // "fix the marked fields" banner.
      if (!r.errors.includes('mtQMin')) return invalid(r.errors);
      return messages('error', r.errors, vars)
        + (r.qMin !== undefined && r.before ? block('mt_props', rows([
          ['mt_qMin', fixed(r.qMin, 2)],
          ['mt_before', matchText(r.before)],
        ])) : '');
    }
    const std = r.stdParts;
    const on = r.parts.map((p, i) => [p, std?.[i]]).filter(([p]) => p.kind);
    let html = on.length
      ? heroes(on.map(([p, s]) => [
        `${p.name} · ${t(`mt_role_${p.role}`)}`,
        siHtml((s ?? p).value, unitOf(p)),
        s ? `${t('mt_exactV')}: ${si(p.value, unitOf(p))} · ${xText(p)}` : xText(p),
      ]))
      : heroes([['mt_noNet', t('mt_none')]]);
    if (r.matched) html += messages('ok', ['mtMatched']);
    html += messages('warn', r.warnings, {
      mtSol: { n: String(r.solutions?.length ?? 0) },
      mtStd: { es: r.series, rl: r.afterStd ? fixed(r.afterStd.returnLossDb, 1) : '' },
    });
    html += worked(r);

    html += block('mt_match', rows([
      ['mt_before', matchText(r.before)],
      ['mt_after', matchText(r.after), !std],
      std && [t('mt_afterStd', { es: r.series }), matchText(r.afterStd), true, true],
      ['mt_zin', zText(r.zin)],
      std && [t('mt_zinStd', { es: r.series }), zText(r.zinStd), false, true],
      ['mt_target', zText(r.target)],
    ]));

    if (on.length) {
      html += block('mt_comp', rows(on.map(([p, s]) => [
        `${p.name} · ${t(`mt_role_${p.role}`)}`,
        `${xText(p)} · ${si(p.value, unitOf(p))}${s ? ` → ${r.series}: <b>${si(s.value, unitOf(p))}</b> (${s.errorPct >= 0 ? '+' : '−'}${fixed(Math.abs(s.errorPct), 1)} %)` : ''}`,
        false, true,
      ])));
    }

    html += block('mt_props', rows([
      r.topology === 'L' ? ['mt_qNode', fixed(r.q, 2)] : ['mt_qDesign', fixed(r.q, 2)],
      r.topology !== 'L' && ['mt_qMin', fixed(r.qMin, 2)],
      r.topology !== 'L' && ['mt_rv', `${fmt(r.rv, 4)} Ω`],
      on.length && ['mt_bw3', bandText(r.bw.bw3, r.bw)],
      on.length && ['mt_bwV', bandText(r.bw.bw2, r.bw)],
    ]));

    if (r.solutions && r.solutions.length > 1) {
      html += block('mt_allSol', rows(r.solutions.map((d, i) => [
        `${t(`mt_s${i + 1}`)}${i + 1 === r.pick ? ` · ${t('mt_selected')}` : ''}`,
        `${partsText(d.parts)} — ${t(`mt_type_${d.type}`)} · Q = ${fixed(d.q, 2)}`,
        i + 1 === r.pick, true,
      ])));
    }

    return html;
  },
};
