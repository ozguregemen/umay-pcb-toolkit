// Layer stack-up planner. A custom page (not mountCalculator) because the
// layers are edited in a compact table whose length depends on the layer
// count. It keeps the calculator conventions: inputs in the URL (canonical
// mm / µm, so the mm/mil toggle only changes the display), copy link / copy
// summary / print / reset, live results and a live cross-section.

import {
  LAYER_COUNTS, ROLES, DEFAULT_ROLES, rolesFromCode, rolesToCode, presetById, presetsFor,
  defaultPreset, presetStack, analyzeStackup, isPlane, DIFF_TARGETS, SE_TARGET,
} from '../engine/stackup.js';
import { fabById, traceSpaceRule, umToOz } from '../engine/fabs.js';
import { heroes, rows, block, formulaBlock, messages, invalid, checks, parseNumber } from '../ui/calculator.js';
import { fmt, fixed, esc } from '../ui/format.js';
import { t } from '../i18n.js';
import { isImperial, getPref } from '../prefs.js';
import { icon } from '../ui/icons.js';
import { addZoomButtons } from '../ui/zoom.js';
import { svg, rect, text, arrow } from '../ui/svg.js';
import { fabSelect, fabRows, fabSource, fabLen } from '../ui/fabcheck.js';

const strings = {
  tr: {
    su_intro: 'Katman sayısını ve hazır bir yığını seçin, katmanların görevini ve kalınlıklarını düzenleyin: toplam kalınlık, simetri, referans düzlemler ve her sinyal katmanının empedansı anında hesaplanır.',
    su_n: 'Katman sayısı',
    su_preset: 'Hazır katman yığını',
    su_gen: 'Genel FR-4 · {n} katman · örnek',
    su_pcbway4: 'PCBWay 4 katman 1,6 mm (Regular)',
    su_hGen: 'Üreticiden bağımsız örnek: standart çekirdek ve prepreg kalınlıkları, bütün dielektriklerde εr 4,3. Sipariş öncesi üreticinizin yığınıyla değiştirin.',
    su_hJlc: 'JLCPCB standart empedans yığını: dış bakır 35 µm (1 oz bitmiş), iç bakır 15,2 µm (½ oz); εr: 7628 4,4 · 3313 4,1 · 2116 4,16 · 1080 3,91 · çekirdek 4,6.',
    su_hPcbway: 'PCBWay standart 4 katman: PP 7628 (reçine %46, Dk 4,74) presten sonra 0,1855 mm, çekirdek 1,03 mm (Dk 4,6), iç bakır 1 oz, dış bakır ½ oz folyo + kaplamayla 1 oz. PCBWay presten sonra 1,51 mm, bitmiş kart kalınlığı 1,61 mm ±%10 verir.',
    su_modified: 'Değerler değiştirildi; hazır değerlere dönmek için yığını yeniden seçin.',
    su_src: 'Kaynak',
    su_accessed: 'erişim',
    su_fab: 'Üretici (kontroller için)',
    su_fabHint: 'Seçim, bütün sayfalardaki üretici kontrolünde kullanılır.',
    su_target: 'Hedef kart kalınlığı',
    su_tol: 'Kalınlık toleransı (±)',
    su_layers: 'Katmanlar (üstten alta)',
    su_cuUnit: 'Bakır kalınlığı birimi',
    su_role_signal: 'Sinyal',
    su_role_gnd: 'GND',
    su_role_power: 'Güç',
    su_role_mixed: 'Karma',
    su_top: 'üst',
    su_bottom: 'alt',
    su_prepreg: 'Prepreg',
    su_core: 'Çekirdek',
    su_layersNote: 'Görevler: Sinyal (izler), GND veya Güç (kesintisiz düzlem), Karma (iz + bakır dolgu; referans sayılmaz). Dielektrik türü folyo yapısına göre belirlenir: dışta prepreg, sonra sırayla çekirdek ve prepreg.',
    su_trace: 'İz geometrisi',
    su_w: 'İz genişliği (w)',
    su_s: 'Diferansiyel çift aralığı (s)',
    su_wsNote: 'Z₀ ve Zdiff her sinyal katmanı için bu w ve s ile hesaplanır. Ayrıca 50 Ω tek uçlu ve bu s aralığıyla 90 / 100 Ω diferansiyel için gereken genişlik bulunur.',
    su_aRole: 'L{n} görevi',
    su_aCu: 'L{n} bakır kalınlığı',
    su_aH: 'L{a}–L{b} dielektrik kalınlığı',
    su_aEr: 'L{a}–L{b} dielektrik sabiti',
    su_total: 'Toplam kalınlık',
    su_totalSub: 'hedef {t} ± %{tol} → {lo} … {hi}',
    su_ctrl: 'Empedansı hesaplanan sinyal katmanı',
    su_cThick: 'Toplam kalınlık hedef aralığında',
    su_cSym: 'Merkeze göre simetrik (bakır, dielektrik, εr)',
    su_cRef: 'Her sinyal katmanının komşusu bir referans düzlem',
    su_cBroad: 'Aralarında düzlem olmayan komşu sinyal katmanı yok',
    su_dCu: 'bakır {p}',
    su_dDiel: 'dielektrik {p}',
    su_dEr: 'εr {p}',
    su_dNoRef: 'referans yok: {l}',
    su_dNoAdj: 'uzak referans: {l}',
    su_sigTitle: 'Sinyal katmanları ve empedans',
    su_colLayer: 'Katman',
    su_colStruct: 'Yapı',
    su_colRef: 'Referans',
    su_colW: 'w · {z}',
    su_st_microstrip: 'Microstrip',
    su_st_stripline: 'Stripline',
    su_st_asymStripline: 'Asimetrik stripline',
    su_st_embedded: 'Gömülü microstrip',
    su_st_none: 'Kontrolsüz',
    su_tableNote: 'Z₀ ve Zdiff: w = {w}, s = {s}. w sütunları hedef empedansı veren iz genişliğidir (diferansiyelde aralık s sabit). Kırmızı değerler seçili üreticinin en küçük iz genişliğinin altındadır.',
    su_thickTitle: 'Kalınlık dökümü',
    su_cuTotal: 'Bakır toplamı',
    su_dielTotal: 'Dielektrik toplamı',
    su_totalRow: 'Toplam (lehim maskesi ve yüzey kaplaması hariç)',
    su_window: 'Hedef aralığı',
    su_fabFinished: 'Üreticinin verdiği bitmiş kalınlık',
    su_finishedV: '{v} ± %10',
    su_fabLayer: 'L{n} iz / aralık ≥ {lim}',
    su_fabWidths: 'Hedef empedans genişlikleri ≥ en küçük iz',
    su_fabAllOk: 'hepsi üretilebilir',
    su_dgAria: 'Katman yığını kesiti: bakır katmanları ve görevleri, dielektrik kalınlıkları ve εr, sinyal katmanlarından referans düzlemlere oklar ve hesaplanan empedanslar',
    su_dgScale: 'dielektrikler ölçekli · bakır büyütülmüş',
    su_dgNoScale: 'ölçeksiz · kalınlıklar etiketlerde',
    su_dgNoRef: 'referans yok',
    su_dgTotal: 'Toplam {v} · hedef {t} ± %{tol}',
    su_note: 'Kapalı formüller yaklaşıktır (±%5–10); sipariş öncesi üreticinin alan çözücüsüyle doğrulayın. Lehim maskesi microstrip empedansını birkaç ohm düşürür ve hesaba katılmamıştır. Aradaki sinyal katmanının bakırı, büyük ölçüde aşındırıldığı için dielektrik sayılır. Prepreg kalınlığı komşu katmanların bakır oranına bağlıdır; üreticinin presleme sonrası değerini kullanın. Simetri ölçütü: aynalanan katmanlarda bakır farkı ≤ %10, dielektrik kalınlık farkı ≤ %5, εr farkı ≤ 0,1.',
    err_su_layers: 'Katman sayısı 2, 4, 6, 8 veya 10 olmalı.',
    err_su_cu: 'Her bakır kalınlığı sıfırdan büyük olmalı.',
    err_su_diel: 'Her dielektrik kalınlığı sıfırdan büyük olmalı.',
    err_su_er: 'Dielektrik sabiti en az 1 olmalı.',
    err_su_ws: 'İz genişliği ve çift aralığı sıfırdan büyük olmalı.',
    err_su_target: 'Hedef kalınlık sıfırdan büyük, tolerans negatif olmamalı.',
    warn_su_asym: 'Yığın merkeze göre simetrik değil ({p}). Preste ve lehimleme ısısında farklı genleşme kartı eğip burabilir (bow & twist); aynalanan katmanlarda aynı bakırı, kalınlığı ve malzemeyi kullanın.',
    warn_su_balance: 'Bakır dengesi: düzlemin karşısında seyrek bir sinyal katmanı var ({p}). Bakır yoğunluğu farkı kartı eğebilir; sinyal katmanındaki boş alanları bakır dolguyla doldurun (görevi Karma yapın).',
    warn_su_noRef: '{l} için hiç referans düzlem yok; empedans kontrol edilemez. Komşu bir katmanı GND yapın.',
    warn_su_noAdj: '{l} bir düzlemin komşusu değil: dönüş akımı uzaktaki düzlemden döner, döngü alanı ve karışma büyür. Empedans, aradaki katman dielektrik sayılarak hesaplandı.',
    warn_su_broadside: 'Komşu sinyal katmanları: {p}. Bu katmanlardaki izleri birbirine dik çizin ve aradaki dielektriği kalın tutun (karşılıklı / broadside karışma).',
    warn_su_thin: '{p} dielektriği 65 µm’den ince; çizimde belirtilmemişse IPC-6012F bunu en küçük değer kabul eder. Üreticinizle doğrulayın.',
    warn_su_diffApprox: '{l}: s/h diferansiyel yaklaşımın aralığı dışında (microstrip 0,2–3, stripline s/b 0,2–1,5); sıkı kuplajda alan çözücü kullanın.',
    warn_su_pwrRef: '{l} yalnızca güç düzlemine komşu. Dönüş akımı dekuplaj kondansatörleri üzerinden GND’ye geçer; sinyalin katman değiştirdiği her yerin yakınına bir kondansatör koyun.',
    warn_su_embedded: '{l} tek tarafında düzlem olan bir iç katman: gömülü microstrip olarak hesaplandı; diğer taraftaki katmanın bakırı empedansı değiştirir.',
  },
  en: {
    su_intro: 'Pick a layer count and a preset, then edit the role and thickness of each layer: total thickness, symmetry, reference planes and the impedance of every signal layer update live.',
    su_n: 'Layer count',
    su_preset: 'Stack-up preset',
    su_gen: 'Generic FR-4 · {n} layers · example',
    su_pcbway4: 'PCBWay 4-layer 1.6 mm (Regular)',
    su_hGen: 'Fabricator-independent example: standard core and prepreg thicknesses, εr 4.3 for every dielectric. Replace it with your fabricator’s stack-up before ordering.',
    su_hJlc: 'JLCPCB standard impedance stack-up: outer copper 35 µm (1 oz finished), inner copper 15.2 µm (½ oz); εr: 7628 4.4 · 3313 4.1 · 2116 4.16 · 1080 3.91 · core 4.6.',
    su_hPcbway: 'PCBWay standard 4-layer: PP 7628 (46 % resin, Dk 4.74) 0.1855 mm after pressing, core 1.03 mm (Dk 4.6), inner copper 1 oz, outer ½ oz foil plated to 1 oz. PCBWay lists 1.51 mm after lamination and 1.61 mm ±10 % finished board thickness.',
    su_modified: 'Values edited; pick the preset again to restore it.',
    su_src: 'Source',
    su_accessed: 'accessed',
    su_fab: 'Fabricator (for checks)',
    su_fabHint: 'The choice is used by the fab check on every page.',
    su_target: 'Target board thickness',
    su_tol: 'Thickness tolerance (±)',
    su_layers: 'Layers (top to bottom)',
    su_cuUnit: 'Copper thickness unit',
    su_role_signal: 'Signal',
    su_role_gnd: 'GND',
    su_role_power: 'Power',
    su_role_mixed: 'Mixed',
    su_top: 'top',
    su_bottom: 'bottom',
    su_prepreg: 'Prepreg',
    su_core: 'Core',
    su_layersNote: 'Roles: Signal (traces), GND or Power (solid plane), Mixed (traces + copper pour; not counted as a reference). The dielectric type follows foil construction: prepreg outside, then core and prepreg alternating.',
    su_trace: 'Trace geometry',
    su_w: 'Trace width (w)',
    su_s: 'Differential pair gap (s)',
    su_wsNote: 'Z₀ and Zdiff are computed for every signal layer with this w and s. The width for 50 Ω single-ended and for 90 / 100 Ω differential at this gap s is also solved.',
    su_aRole: 'L{n} role',
    su_aCu: 'L{n} copper thickness',
    su_aH: 'L{a}–L{b} dielectric thickness',
    su_aEr: 'L{a}–L{b} dielectric constant',
    su_total: 'Total thickness',
    su_totalSub: 'target {t} ± {tol} % → {lo} … {hi}',
    su_ctrl: 'Signal layers with impedance',
    su_cThick: 'Total thickness within the target range',
    su_cSym: 'Symmetric about the centre (copper, dielectric, εr)',
    su_cRef: 'Every signal layer is next to a reference plane',
    su_cBroad: 'No adjacent signal layers without a plane between',
    su_dCu: 'copper {p}',
    su_dDiel: 'dielectric {p}',
    su_dEr: 'εr {p}',
    su_dNoRef: 'no reference: {l}',
    su_dNoAdj: 'distant reference: {l}',
    su_sigTitle: 'Signal layers and impedance',
    su_colLayer: 'Layer',
    su_colStruct: 'Structure',
    su_colRef: 'Reference',
    su_colW: 'w · {z}',
    su_st_microstrip: 'Microstrip',
    su_st_stripline: 'Stripline',
    su_st_asymStripline: 'Asymmetric stripline',
    su_st_embedded: 'Embedded microstrip',
    su_st_none: 'Uncontrolled',
    su_tableNote: 'Z₀ and Zdiff: w = {w}, s = {s}. The w columns give the trace width for the target impedance (differential: gap s fixed). Red values are below the selected fabricator’s minimum trace width.',
    su_thickTitle: 'Thickness breakdown',
    su_cuTotal: 'Copper total',
    su_dielTotal: 'Dielectric total',
    su_totalRow: 'Total (without solder mask and surface finish)',
    su_window: 'Target range',
    su_fabFinished: 'Finished thickness stated by the fabricator',
    su_finishedV: '{v} ± 10 %',
    su_fabLayer: 'L{n} trace / gap ≥ {lim}',
    su_fabWidths: 'Target-impedance widths ≥ minimum trace',
    su_fabAllOk: 'all manufacturable',
    su_dgAria: 'Stack-up cross-section: copper layers and their roles, dielectric thicknesses and εr, arrows from signal layers to their reference planes and the computed impedances',
    su_dgScale: 'dielectrics to scale · copper exaggerated',
    su_dgNoScale: 'not to scale · thicknesses in the labels',
    su_dgNoRef: 'no reference',
    su_dgTotal: 'Total {v} · target {t} ± {tol} %',
    su_note: 'The closed-form models are approximate (±5–10 %); confirm with the fabricator’s field solver before ordering. Solder mask lowers microstrip impedance by a few ohms and is not included. Copper of an intermediate signal layer counts as dielectric, since it is mostly etched away. Prepreg thickness depends on the copper density of the neighbouring layers; use the fabricator’s pressed value. Symmetry criterion: on mirrored layers copper differs ≤ 10 %, dielectric thickness ≤ 5 %, εr ≤ 0.1.',
    err_su_layers: 'The layer count must be 2, 4, 6, 8 or 10.',
    err_su_cu: 'Every copper thickness must be greater than zero.',
    err_su_diel: 'Every dielectric thickness must be greater than zero.',
    err_su_er: 'The dielectric constant must be at least 1.',
    err_su_ws: 'Trace width and pair gap must be greater than zero.',
    err_su_target: 'The target thickness must be greater than zero and the tolerance not negative.',
    warn_su_asym: 'The stack is not symmetric about its centre ({p}). Unequal expansion during lamination and soldering can bow and twist the board; use the same copper, thickness and material on mirrored layers.',
    warn_su_balance: 'Copper balance: a sparse signal layer faces a plane ({p}). Unequal copper density can bow the board; fill empty areas of the signal layer with copper pour (set its role to Mixed).',
    warn_su_noRef: '{l} has no reference plane at all; its impedance cannot be controlled. Make a neighbouring layer GND.',
    warn_su_noAdj: '{l} is not next to a plane: the return current flows in a distant plane, which enlarges the loop and the crosstalk. The impedance treats the layer in between as dielectric.',
    warn_su_broadside: 'Adjacent signal layers: {p}. Route them at right angles to each other and keep the dielectric between them thick (broadside crosstalk).',
    warn_su_thin: 'The {p} dielectric is thinner than 65 µm, the IPC-6012F minimum when the drawing specifies none. Confirm with your fabricator.',
    warn_su_diffApprox: '{l}: s/h is outside the range of the differential approximation (microstrip 0.2–3, stripline s/b 0.2–1.5); use a field solver for tight coupling.',
    warn_su_pwrRef: '{l} is next to a power plane only. Its return current crosses to GND through the decoupling capacitors; place one near every layer change of the signal.',
    warn_su_embedded: '{l} is an inner layer with a plane on one side only: computed as embedded microstrip; copper on the other side changes the impedance.',
  },
};

const MIL = 0.0254;
const UM_PER_OZ = 35;
const DEF = { targetMm: 1.6, tolPct: 10, wMm: 0.2, sMm: 0.2 };

// ---------------------------------------------------------------------------
// State ↔ URL. Lengths are stored in mm and copper in µm, whatever the
// display unit, so a shared link reads the same in mm and mil.
// ---------------------------------------------------------------------------

/** Default state for a layer count (generic preset, default roles). */
export function defaultState(n = 4, keep = {}) {
  const p = presetById(defaultPreset(n));
  const st = presetStack(p);
  return { ...DEF, cuUnit: 'um', ...keep, n, preset: p.id, roles: rolesFromCode(DEFAULT_ROLES[n]), cuUm: st.cuUm, diel: st.diel };
}

/** State loaded with a preset's materials (roles: defaults for its layer count). */
export function stateFromPreset(id) {
  const p = presetById(id);
  const s = defaultState(p.n);
  return { ...s, preset: id, ...presetStack(p) };
}

const num = (x) => (Number.isFinite(x) ? String(Number(x.toPrecision(6))) : '');
const sameList = (a, b) => a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) < 1e-9);
const listOf = (s, len) => {
  if (s === null) return null;
  const a = s.split('_').map((x) => parseNumber(x));
  return a.length === len ? a : null;
};

export function fromParams(params) {
  let n = Number(params.get('n'));
  if (!LAYER_COUNTS.includes(n)) n = 4;
  const keep = { cuUnit: params.get('cu') === 'oz' ? 'oz' : 'um' };
  for (const [k, key] of [['tt', 'targetMm'], ['tol', 'tolPct'], ['w', 'wMm'], ['s', 'sMm']]) {
    if (params.has(k)) keep[key] = parseNumber(params.get(k));
  }
  const st = defaultState(n, keep);
  const p = presetById(params.get('p'));
  if (p && p.n === n) Object.assign(st, { preset: p.id }, presetStack(p));
  const code = params.get('r');
  if (code && code.length === n && /^[SGPM]+$/.test(code)) st.roles = rolesFromCode(code);
  const cu = listOf(params.get('c'), n);
  if (cu) st.cuUm = cu;
  const h = listOf(params.get('h'), n - 1);
  const e = listOf(params.get('e'), n - 1);
  st.diel = st.diel.map((d, j) => ({ ...d, h: h ? h[j] : d.h, er: e ? e[j] : d.er }));
  return st;
}

export function toQuery(st) {
  const q = new URLSearchParams();
  if (st.n !== 4) q.set('n', st.n);
  if (st.preset !== defaultPreset(st.n)) q.set('p', st.preset);
  const code = rolesToCode(st.roles);
  if (code !== DEFAULT_ROLES[st.n]) q.set('r', code);
  const base = presetStack(presetById(st.preset));
  if (!sameList(st.cuUm, base.cuUm)) q.set('c', st.cuUm.map(num).join('_'));
  const hs = st.diel.map((d) => d.h);
  const es = st.diel.map((d) => d.er);
  if (!sameList(hs, base.diel.map((d) => d.h))) q.set('h', hs.map(num).join('_'));
  if (!sameList(es, base.diel.map((d) => d.er))) q.set('e', es.map(num).join('_'));
  for (const [k, key] of [['tt', 'targetMm'], ['tol', 'tolPct'], ['w', 'wMm'], ['s', 'sMm']]) {
    if (st[key] !== DEF[key]) q.set(k, num(st[key]));
  }
  if (st.cuUnit === 'oz') q.set('cu', 'oz');
  return q.toString();
}

/** Did the user change the preset's materials? */
function edited(st) {
  const base = presetStack(presetById(st.preset));
  return !sameList(st.cuUm, base.cuUm) || !sameList(st.diel.map((d) => d.h), base.diel.map((d) => d.h))
    || !sameList(st.diel.map((d) => d.er), base.diel.map((d) => d.er));
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const lenUnit = () => (isImperial() ? 'mil' : 'mm');
const trimNum = (x, d) => String(Number(x.toFixed(d)));
const dispLen = (mm) => (Number.isFinite(mm) ? (isImperial() ? trimNum(mm / MIL, 2) : trimNum(mm, 4)) : '');
const dispCu = (um, unit) => (Number.isFinite(um) ? (unit === 'oz' ? trimNum(um / UM_PER_OZ, 3) : trimNum(um, 1)) : '');
const L = (mm, d = 3) => (isImperial() ? `${fixed(mm / MIL, 2)} mil` : `${fixed(mm, d)} mm`);
const Lh = (mm) => (isImperial() ? `${fixed(mm / MIL, 1)} <span class="u">mil</span>` : `${fixed(mm, 3)} <span class="u">mm</span>`);
const Lsub = (mm) => (isImperial() ? `${fixed(mm, 3)} mm` : `${fixed(mm / MIL, 1)} mil`);
const Hd = (mm) => (isImperial() ? `${fmt(mm / MIL, 3)} mil` : `${fmt(mm, 4)} mm`); // dielectric labels
const Cu = (um, unit) => (unit === 'oz' ? `${fmt(um / UM_PER_OZ, 3)} oz` : `${fmt(um, 3)} µm`);
const Ln = (i) => `L${i + 1}`;
const lst = (idx) => idx.map(Ln).join(', ');
const pairs = (ps, sep = '↔') => ps.map(([a, b]) => `${Ln(a)}${sep}${Ln(b)}`).join(', ');
const dpairs = (ps) => ps.map(([k, m]) => `${Ln(k)}–${Ln(k + 1)}↔${Ln(m)}–${Ln(m + 1)}`).join(', ');
const presetLabel = (p) => (p.fab === null ? t('su_gen', { n: p.n }) : p.id === 'pcbway4' ? t('su_pcbway4') : `${p.id} · JLCPCB`);
const presetHint = (p) => (p.fab === 'jlc' ? 'su_hJlc' : p.fab === 'pcbway' ? 'su_hPcbway' : 'su_hGen');

// ---------------------------------------------------------------------------
// Compute
// ---------------------------------------------------------------------------

function analyze(st) {
  return analyzeStackup({
    roles: st.roles, cuUm: st.cuUm, diel: st.diel, wMm: st.wMm, sMm: st.sMm, targetMm: st.targetMm, tolPct: st.tolPct,
  });
}

/** Fab checks for the stack-up: thickness, layer count, w/s per signal layer, target widths. */
function stackFabRows(fab, r, st) {
  const out = fabRows(fab, { boardMm: r.thickness.totalMm, layers: r.n });
  const n = r.n;
  const bad = [];
  for (const s of r.signals) {
    const inner = s.i > 0 && s.i < n - 1;
    const oz = umToOz(st.cuUm[s.i]);
    const rule = traceSpaceRule(fab, { oz, inner, layers: n });
    if (!rule) {
      out.push([null, esc(t('su_fabLayer', { n: s.i + 1, lim: '—' })), esc(t('fab_d_none'))]);
      continue;
    }
    const ok = st.wMm >= rule.trace - 1e-6 && st.sMm >= rule.space - 1e-6;
    out.push([ok, esc(t('su_fabLayer', { n: s.i + 1, lim: `${fabLen(rule.trace)} / ${fabLen(rule.space)}` })),
      esc(`${fabLen(st.wMm)} / ${fabLen(st.sMm)} · ${t('fab_d_cu', { oz: fmt(oz, 2), pos: t(inner ? 'fab_d_inner' : 'fab_d_outer') })}`)]);
    [s.w50, ...(s.wd ?? [])].forEach((w, k) => {
      if (w > 0 && w < rule.trace - 1e-6) bad.push(`${Ln(s.i)} ${k === 0 ? `${SE_TARGET} Ω` : `${DIFF_TARGETS[k - 1]} Ω d`}: ${fabLen(w)}`);
    });
  }
  if (r.signals.some((s) => s.z0 !== undefined)) out.push([bad.length === 0, esc(t('su_fabWidths')), esc(bad.length ? bad.join(' · ') : t('su_fabAllOk'))]);
  return out;
}

// ---------------------------------------------------------------------------
// Diagram: cross-section, top → bottom
// ---------------------------------------------------------------------------

const r1 = (x) => Math.round(x * 10) / 10;

function drawStack(st, r) {
  const n = st.roles.length;
  const X0 = 176;
  const X1 = 300;
  const top = 26;
  const CU = 5;
  const MASK = 3;
  const MIN = 24;
  const hs = st.diel.map((d) => (d.h > 0 ? d.h : 0.1));
  const scale = 250 / hs.reduce((a, x) => a + x, 0);
  let clamped = false;
  const dpx = hs.map((h) => {
    if (h * scale >= MIN) return h * scale;
    clamped = true;
    return MIN;
  });
  const cuY = [];
  const dY = [];
  let y = top + MASK;
  for (let i = 0; i < n; i++) {
    cuY.push(y + CU / 2);
    y += CU;
    if (i < n - 1) { dY.push([y, y + dpx[i]]); y += dpx[i]; }
  }
  const bottom = y;
  const base = presetStack(presetById(st.preset) ?? presetById(defaultPreset(n)));
  const sym = r?.symmetry;
  const badDiel = new Set(sym ? [...sym.diel, ...sym.er].flat() : []);
  const badCu = new Set(sym ? sym.cu.flat() : []);
  const sigBy = new Map((r?.signals ?? []).map((s) => [s.i, s]));

  let b = rect(X0, top, X1 - X0, MASK, 'mask') + rect(X0, bottom, X1 - X0, MASK, 'mask');
  // Dielectrics (resin also fills the etched gaps of the copper bands).
  b += rect(X0, top + MASK, X1 - X0, bottom - top - MASK, 'diel');
  st.diel.forEach((d, j) => {
    const [y0, y1] = dY[j];
    const glass = d.glass && Math.abs(d.h - base.diel[j]?.h) < 1e-9 && Math.abs(d.er - base.diel[j]?.er) < 1e-9 ? ` ${d.glass}` : '';
    const kind = d.kind === 'core' ? t('su_core') : `PP${glass}`;
    const er = Number.isFinite(d.er) ? fmt(d.er, 3) : '—';
    b += text(X1 + 8, (y0 + y1) / 2 + 4, `${kind} · ${Hd(d.h)} · εr ${er}`, { cls: badDiel.has(j) ? 'badt' : 'lbl', anchor: 'start' });
  });
  // Symmetry axis.
  const yc = r1((top + MASK + bottom) / 2);
  b += `<path class="ext" d="M${X0 - 10},${yc}H${X1 + 4}"/>`;
  // Copper layers. Signal layers draw a single trace and a pair, alternately
  // on the left and right, so the reference arrows of neighbours do not overlap.
  let ord = 0;
  for (let i = 0; i < n; i++) {
    const yy = cuY[i] - CU / 2;
    const role = st.roles[i];
    let ax = X0 + 17;
    if (isPlane(role)) b += rect(X0, yy, X1 - X0, CU, 'cu');
    else {
      const right = ord++ % 2 === 1;
      const xs = right ? [X1 - 26, X1 - 74, X1 - 54] : [X0 + 8, X0 + 40, X0 + 60];
      b += rect(xs[0], yy, 18, CU, 'cu') + rect(xs[1], yy, 14, CU, 'cu') + rect(xs[2], yy, 14, CU, 'cu');
      if (role === 'mixed') b += rect(right ? X0 : X0 + 88, yy, X1 - X0 - 88, CU, 'cu');
      ax = xs[0] + 9;
    }
    const name = `${Ln(i)} ${t(`su_role_${role}`)} · ${Cu(st.cuUm[i], st.cuUnit)}`;
    const s = sigBy.get(i);
    const nameCls = badCu.has(i) ? 'badt' : 'name';
    if (!s) {
      b += text(X0 - 8, cuY[i] + 4, name, { cls: nameCls, anchor: 'end' });
      continue;
    }
    b += text(X0 - 8, cuY[i] - 2, name, { cls: nameCls, anchor: 'end' });
    const z = s.z0 !== undefined
      ? `Z₀ ${fixed(s.z0, 1)} Ω · Zd ${fixed(s.zdiff, 1)} Ω`
      : t('su_dgNoRef');
    b += text(X0 - 8, cuY[i] + 11, z, { cls: s.z0 !== undefined ? 'val' : 'badt', anchor: 'end' });
    // Arrows to the reference planes.
    const refArrow = (k) => {
      if (k === null || k === undefined) return '';
      const down = k > i;
      const y1 = down ? cuY[i] + CU / 2 + 1 : cuY[i] - CU / 2 - 1;
      const y2 = down ? cuY[k] - CU / 2 - 1 : cuY[k] + CU / 2 + 1;
      return arrow(ax, y1, ax, y2, { cls: Math.abs(k - i) > 1 ? 'flow dash' : 'flow', headCls: 'arrow flow' });
    };
    b += refArrow(s.up) + refArrow(s.dn);
  }
  b += text(X1 + 8, cuY[0] + 4, t('su_top'), { cls: 'lbl', anchor: 'start' })
    + text(X1 + 8, cuY[n - 1] + 4, t('su_bottom'), { cls: 'lbl', anchor: 'start' });
  // Captions.
  b += text(4, 14, t(clamped ? 'su_dgNoScale' : 'su_dgScale'), { cls: 'title', anchor: 'start' });
  if (r?.thickness) {
    const th = r.thickness;
    b += text(X0 + (X1 - X0) / 2, bottom + MASK + 20, t('su_dgTotal', { v: L(th.totalMm), t: L(st.targetMm, 2), tol: fmt(st.tolPct) }),
      { cls: th.pass ? 'okt' : 'badt' });
  }
  return svg(480, r1(bottom + MASK + 30), b, t('su_dgAria'), { wide: true });
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

function render(r, st) {
  if (!r.ok) return invalid(r.errors);
  const th = r.thickness;
  const sigs = r.signals;
  const ctrl = sigs.filter((s) => s.z0 !== undefined);
  const kinds = [...new Set(ctrl.map((s) => s.structure))].map((k) => t(`su_st_${k}`)).join(' · ');
  const main = heroes([
    ['su_total', Lh(th.totalMm), esc(t('su_totalSub', { t: L(st.targetMm, 2), tol: fmt(st.tolPct), lo: L(th.lo), hi: L(th.hi) }))],
    ['su_ctrl', `${ctrl.length} <span class="u">/ ${sigs.length}</span>`, esc(kinds)],
  ]);
  const sy = r.symmetry;
  const symDetail = [sy.cu.length && t('su_dCu', { p: pairs(sy.cu) }), sy.diel.length && t('su_dDiel', { p: dpairs(sy.diel) }),
    sy.er.length && t('su_dEr', { p: dpairs(sy.er) })].filter(Boolean).join(' · ');
  const refDetail = [r.noRef.length && t('su_dNoRef', { l: lst(r.noRef) }), r.noAdj.length && t('su_dNoAdj', { l: lst(r.noAdj) })]
    .filter(Boolean).join(' · ');
  const chk = checks([
    [th.pass, esc(t('su_cThick')), esc(`${L(th.totalMm)} · ${L(th.lo)} … ${L(th.hi)}`)],
    [sy.ok, esc(t('su_cSym')), esc(symDetail)],
    sigs.length ? [r.noRef.length === 0 && r.noAdj.length === 0, esc(t('su_cRef')), esc(refDetail)] : null,
    [r.broadside.length === 0, esc(t('su_cBroad')), esc(pairs(r.broadside, '–'))],
  ]);

  const warn = [];
  const vars = {};
  const add = (k, v) => { warn.push(k); vars[k] = v; };
  if (r.noRef.length) add('su_noRef', { l: lst(r.noRef) });
  if (r.noAdj.length) add('su_noAdj', { l: lst(r.noAdj) });
  if (r.broadside.length) add('su_broadside', { p: pairs(r.broadside, '–') });
  if (!sy.ok) add('su_asym', { p: symDetail });
  if (sy.balance.length) add('su_balance', { p: pairs(sy.balance) });
  if (r.pwrRef.length) add('su_pwrRef', { l: lst(r.pwrRef) });
  const emb = ctrl.filter((s) => s.structure === 'embedded').map((s) => s.i);
  if (emb.length) add('su_embedded', { l: lst(emb) });
  if (r.thin.length) add('su_thin', { p: r.thin.map((j) => `${Ln(j)}–${Ln(j + 1)}`).join(', ') });
  if (r.diffRange.length) add('su_diffApprox', { l: lst(r.diffRange) });

  // Signal layer table.
  const fab = fabById(getPref('fab'));
  const n = r.n;
  const minTrace = (s) => {
    if (!fab) return 0;
    const rule = traceSpaceRule(fab, { oz: umToOz(st.cuUm[s.i]), inner: s.i > 0 && s.i < n - 1, layers: n });
    return rule ? rule.trace : 0;
  };
  const wCell = (w, lim) => (w > 0
    ? (w < lim - 1e-6 ? `<span style="color:var(--err-fg)">${esc(L(w))}</span>` : esc(L(w)))
    : '—');
  const refName = (k) => `${Ln(k)} ${t(`su_role_${st.roles[k]}`)}`;
  const head = `<tr><th scope="col">${esc(t('su_colLayer'))}</th><th scope="col">${esc(t('su_colStruct'))}</th><th scope="col">${esc(t('su_colRef'))}</th>`
    + '<th scope="col">Z₀</th><th scope="col">Zdiff</th>'
    + [`${SE_TARGET} Ω`, ...DIFF_TARGETS.map((z) => `${z} Ω d`)].map((z) => `<th scope="col">${esc(t('su_colW', { z }))}</th>`).join('')
    + '</tr>';
  const body = sigs.map((s) => {
    const lim = minTrace(s);
    const geo = s.structure === 'none' ? ''
      : s.structure === 'microstrip' || s.structure === 'embedded'
        ? `h ${Hd(s.h)}${s.c !== undefined ? ` · c ${Hd(s.c)}` : ''} · εr ${fmt(s.er, 3)}`
        : `h₁ ${Hd(s.h1)} · h₂ ${Hd(s.h2)} · εr ${fmt(s.er, 3)}`;
    const refs = [s.up, s.dn].filter((k) => k !== null && k !== undefined).map(refName).join(' · ') || '—';
    const z = s.z0 !== undefined;
    return `<tr><th scope="row">${esc(Ln(s.i))} <small style="display:block">${esc(t(`su_role_${s.role}`))}</small></th>`
      + `<td style="text-align:left;white-space:normal;min-width:130px">${esc(t(`su_st_${s.structure}`))}${geo ? `<small style="display:block;color:var(--muted)">${esc(geo)}</small>` : ''}</td>`
      + `<td style="text-align:left;white-space:normal;min-width:70px">${esc(refs)}</td>`
      + `<td>${z ? `${fixed(s.z0, 1)} Ω` : '—'}</td><td>${z ? `${fixed(s.zdiff, 1)} Ω` : '—'}</td>`
      + `<td>${z ? wCell(s.w50, lim) : '—'}</td>${(s.wd ?? [NaN, NaN]).map((w) => `<td>${z ? wCell(w, lim) : '—'}</td>`).join('')}</tr>`;
  }).join('');
  const table = sigs.length
    ? block('su_sigTitle', `<div class="table-scroll"><table class="grid">${`<thead>${head}</thead>`}<tbody>${body}</tbody></table></div>`
      + `<p class="note">${esc(t('su_tableNote', { w: L(st.wMm), s: L(st.sMm) }))}</p>`)
    : '';

  const p = presetById(st.preset);
  const thick = block('su_thickTitle', rows([
    ['su_cuTotal', esc(L(th.cuTotal))],
    ['su_dielTotal', esc(L(th.dielTotal))],
    ['su_totalRow', esc(`${L(th.totalMm)} · ${Lsub(th.totalMm)}`), true],
    ['su_window', esc(`${L(th.lo)} … ${L(th.hi)}`)],
    p?.finishedMm && !edited(st) ? ['su_fabFinished', esc(t('su_finishedV', { v: L(p.finishedMm, 2) }))] : null,
  ]));

  const fabBlock = fab
    ? block('fab_title', checks(stackFabRows(fab, r, st)) + fabSource(fab))
    : block('fab_title', `<p class="note">${esc(t('fab_hint'))}</p>`);

  const refs = ['Hammerstad & Jensen, IEEE MTT-S 1980', 'Wheeler, IEEE T-MTT 1978', 'J. Mears, National AN-905 (1996)', 'IPC-2141A', 'IPC-6012F',
    'JLCPCB, jlcpcb.com/impedance (2026-11-25)', 'PCBWay, pcbway.com/multi-layer-laminated-structure.html (2026-11-25)'];
  const formula = formulaBlock([
    't_total = Σ t_Cu + Σ h_diel',
    'h (trace → plane) = Σ h_diel + Σ t_Cu (layers in between)',
    'εr = Σ (h·εr) / Σ h   (dielectrics spanned)',
    'microstrip:  Hammerstad–Jensen (w, t, h, εr)',
    'stripline:   Wheeler 1978,  b = h1 + h2 + t',
    'asym.:       Z0 = 2·Zs(2h1+t)·Zs(2h2+t) / (Zs(2h1+t) + Zs(2h2+t))',
    'embedded:    εeff(c) = εr − (εr − εeff,ms)·e^(−1.55·c/h)',
    'Zdiff ≈ 2·Z0·(1 − 0.48·e^(−0.96·s/h))     (microstrip)',
    'Zdiff ≈ 2·Z0·(1 − 0.374·e^(−2.9·s/b))     (stripline)',
    `w(Z) : Z(w) = ${SE_TARGET} Ω  /  Zdiff(w, s) = ${DIFF_TARGETS.join(' / ')} Ω   (bisection)`,
  ], 'su_note', refs);

  return { top: main + chk, rest: messages('warn', warn, vars) + table + thick + fabBlock + formula };
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

const cellPad = 'padding:2px 3px';

function segmented(key, options, current, labelId) {
  return `<div class="segmented" role="radiogroup" aria-labelledby="${labelId}">${options.map(([v, l]) => {
    const on = String(v) === String(current);
    return `<button type="button" role="radio" aria-checked="${on}" tabindex="${on ? 0 : -1}" data-choice="${key}" data-value="${esc(v)}">${esc(l)}</button>`;
  }).join('')}</div>`;
}

function numField(key, label, value, unit, extra = '') {
  return `<div class="field"><div class="label-row"><label for="su-${key}">${esc(t(label))}</label></div>
    <div class="input-group"><input id="su-${key}" data-k="${key}" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" value="${esc(value)}">
    <span class="unit unit-static">${esc(unit)}</span></div>${extra}</div>`;
}

function layerTable(st) {
  const n = st.roles.length;
  const cuU = st.cuUnit === 'oz' ? 'oz' : 'µm';
  const lu = lenUnit();
  const unitStyle = ' style="min-width:0;padding:0 6px"';
  const inp = (key, value, aria, size) => `<div class="input-group"><input data-k="${key}" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" size="${size}" style="padding:0 8px" value="${esc(value)}" aria-label="${esc(aria)}"`;
  let html = '';
  for (let i = 0; i < n; i++) {
    const pos = i === 0 ? t('su_top') : i === n - 1 ? t('su_bottom') : '';
    html += `<tr><th scope="row" style="${cellPad};text-align:left;border-left:4px solid var(--cu);padding-left:8px;white-space:nowrap">${Ln(i)}${pos ? `<small style="display:block;color:var(--muted);font-weight:500">${esc(pos)}</small>` : ''}</th>
      <td style="${cellPad}"><div class="field" style="margin:0"><select data-k="role-${i}" aria-label="${esc(t('su_aRole', { n: i + 1 }))}">${ROLES.map((ro) => `<option value="${ro}"${ro === st.roles[i] ? ' selected' : ''}>${esc(t(`su_role_${ro}`))}</option>`).join('')}</select></div></td>
      <td style="${cellPad}">${inp(`cu-${i}`, dispCu(st.cuUm[i], st.cuUnit), t('su_aCu', { n: i + 1 }), 4)}><span class="unit unit-static"${unitStyle}>${cuU}</span></div></td></tr>`;
    if (i < n - 1) {
      const d = st.diel[i];
      const ab = { a: i + 1, b: i + 2 };
      html += `<tr><th scope="row" style="${cellPad};text-align:left;border-left:4px solid var(--diel);padding-left:6px;font-weight:500;font-size:13px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t(d.kind === 'core' ? 'su_core' : 'su_prepreg'))}</th>
        <td style="${cellPad}">${inp(`h-${i}`, dispLen(d.h), t('su_aH', ab), 5)}><span class="unit unit-static"${unitStyle}>${lu}</span></div></td>
        <td style="${cellPad}">${inp(`er-${i}`, Number.isFinite(d.er) ? String(d.er) : '', t('su_aEr', ab), 4)}><span class="unit unit-static"${unitStyle}>εr</span></div></td></tr>`;
    }
  }
  // Fixed layout: the inputs shrink with the card, so the table fits a 375 px phone.
  return `<div style="overflow-x:auto"><table style="width:100%;table-layout:fixed;border-collapse:separate;border-spacing:0 3px">`
    + `<colgroup><col style="width:24%"><col style="width:39%"><col style="width:37%"></colgroup>${html}</table></div>`;
}

function presetHintHtml(st) {
  const p = presetById(st.preset);
  const src = p.src ? ` ${t('su_src')}: <a href="${esc(p.src.url)}" target="_blank" rel="noopener">${esc(p.src.url.replace(/^https:\/\/(www\.)?/, ''))}</a> (${esc(t('su_accessed'))} ${esc(p.src.accessed)}).` : '';
  return `${esc(t(presetHint(p)))}${src}${edited(st) ? ` <b>${esc(t('su_modified'))}</b>` : ''}`;
}

function renderForm(st) {
  const lu = lenUnit();
  return `
    <fieldset class="section"><legend>${esc(t('sectionSetup'))}</legend>
      <div class="field"><div class="label-row"><span class="label" id="su-n-l">${esc(t('su_n'))}</span></div>
        ${segmented('n', LAYER_COUNTS.map((x) => [x, String(x)]), st.n, 'su-n-l')}</div>
      <div class="field"><div class="label-row"><label for="su-preset">${esc(t('su_preset'))}</label></div>
        <select id="su-preset" data-k="preset" aria-describedby="su-preset-hint">${presetsFor(st.n).map((p) => `<option value="${esc(p.id)}"${p.id === st.preset ? ' selected' : ''}>${esc(presetLabel(p))}</option>`).join('')}</select>
        <small class="hint" id="su-preset-hint">${presetHintHtml(st)}</small></div>
      <div class="field"><div class="label-row"><label for="su-fab">${esc(t('su_fab'))}</label></div>
        ${fabSelect('su-fab')}<small class="hint">${esc(t('su_fabHint'))}</small></div>
      ${numField('tt', 'su_target', dispLen(st.targetMm), lu, `<div class="presets">${[0.8, 1.0, 1.2, 1.6, 2.0].map((x) => `<button type="button" class="chip" data-tt="${x}">${esc(`${fmt(x)} mm`)}</button>`).join('')}</div>`)}
      ${numField('tol', 'su_tol', Number.isFinite(st.tolPct) ? String(st.tolPct) : '', '%')}
    </fieldset>
    <fieldset class="section"><legend>${esc(t('su_layers'))}</legend>
      <div class="field"><div class="label-row"><span class="label" id="su-cuu-l">${esc(t('su_cuUnit'))}</span></div>
        ${segmented('cuu', [['um', 'µm'], ['oz', 'oz']], st.cuUnit, 'su-cuu-l')}</div>
      ${layerTable(st)}
      <p class="note">${esc(t('su_layersNote'))}</p>
    </fieldset>
    <fieldset class="section"><legend>${esc(t('su_trace'))}</legend>
      ${numField('w', 'su_w', dispLen(st.wMm), lu)}
      ${numField('s', 'su_s', dispLen(st.sMm), lu)}
      <p class="note">${esc(t('su_wsNote'))}</p>
    </fieldset>`;
}

// ---------------------------------------------------------------------------
// Mount
// ---------------------------------------------------------------------------

async function copyText(s) {
  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = s;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* ignore */ }
    ta.remove();
    return ok;
  }
}

function summary(st, r) {
  const out = [`${t('appName')} — ${t('tool_stackup')}`, location.href, '', `${t('summaryInputs')}:`];
  out.push(`  ${t('su_preset')}: ${presetLabel(presetById(st.preset))}${edited(st) ? ' *' : ''}`);
  st.roles.forEach((role, i) => {
    out.push(`  ${Ln(i)} ${t(`su_role_${role}`)} · ${Cu(st.cuUm[i], st.cuUnit)}`);
    const d = st.diel[i];
    if (d) out.push(`      ${t(d.kind === 'core' ? 'su_core' : 'su_prepreg')} ${Hd(d.h)} · εr ${fmt(d.er, 3)}`);
  });
  out.push(`  w = ${L(st.wMm)}, s = ${L(st.sMm)}`, '', `${t('summaryResults')}:`);
  if (!r.ok) return out.join('\n');
  out.push(`  ${t('su_total')}: ${L(r.thickness.totalMm)} (${L(r.thickness.lo)} … ${L(r.thickness.hi)})`);
  for (const s of r.signals) {
    out.push(s.z0 === undefined
      ? `  ${Ln(s.i)}: ${t('su_st_none')}`
      : `  ${Ln(s.i)} ${t(`su_st_${s.structure}`)}: Z0 ${fixed(s.z0, 1)} Ω, Zdiff ${fixed(s.zdiff, 1)} Ω; w(50 Ω) ${L(s.w50)}, w(90 Ω d) ${L(s.wd[0])}, w(100 Ω d) ${L(s.wd[1])}`);
  }
  return out.join('\n');
}

function actionButton(action, iconName, labelKey, titleKey) {
  return `<button type="button" class="btn ghost" data-action="${action}" title="${esc(t(titleKey))}">${icon(iconName, 16)}<span class="btn-label">${esc(t(labelKey))}</span></button>`;
}

function mount(root, params, page) {
  let st = fromParams(params);
  root.innerHTML = `
    <header class="page-head">
      <div class="page-title">
        <h1>${esc(t('tool_stackup'))}</h1>
        <p class="lead">${esc(t('su_intro'))}</p>
        ${page.related?.length ? `<p class="related">${icon('book', 15)}<span>${esc(t('learn_related'))}</span> ${page.related
          .map((l) => `<a href="#/learn/${l.id}">${esc(l.title)}</a>`).join(' · ')}</p>` : ''}
      </div>
      <div class="page-actions" role="toolbar" aria-label="${esc(t('results'))}">
        ${actionButton('copy-link', 'link', 'copyLink', 'copyLinkTitle')}
        ${actionButton('copy-summary', 'copy', 'copySummary', 'copySummaryTitle')}
        ${actionButton('print', 'print', 'print', 'printTitle')}
        ${actionButton('reset', 'reset', 'reset', 'resetTitle')}
      </div>
    </header>
    <div class="print-meta"></div>
    <div class="calc">
      <form class="card form" novalidate autocomplete="off" aria-label="${esc(t('inputs'))}"></form>
      <section class="card result" id="result" aria-live="polite" aria-label="${esc(t('results'))}"></section>
    </div>
    <a class="peek" href="#result" hidden><span class="peek-label"></span><span class="peek-value"></span>${icon('down', 16)}</a>`;
  const form = root.querySelector('form');
  const result = root.querySelector('.result');
  const peek = root.querySelector('.peek');
  let last = null;

  const drawForm = () => { form.innerHTML = renderForm(st); };
  const update = () => {
    last = analyze(st);
    if (!last.ok) {
      result.innerHTML = invalid(last.errors);
    } else {
      const parts = render(last, st);
      let dg = '';
      try { dg = `<div class="diagram-wrap">${drawStack(st, last)}</div>`; } catch (err) { console.error(err); }
      result.innerHTML = parts.top + dg + parts.rest;
      const wrap = result.querySelector('.diagram-wrap');
      if (wrap) addZoomButtons(wrap);
    }
    const hero = result.querySelector('.hero');
    peek.querySelector('.peek-label').textContent = hero?.querySelector('.hero-label')?.textContent ?? '';
    peek.querySelector('.peek-value').textContent = hero?.querySelector('.hero-value')?.textContent.replace(/\s+/g, ' ').trim() ?? '—';
    const hint = form.querySelector('#su-preset-hint');
    if (hint) hint.innerHTML = presetHintHtml(st);
    const qs = toQuery(st);
    const hash = `#/stackup${qs ? `?${qs}` : ''}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
  };

  const readInput = (el) => {
    const k = el.dataset.k;
    const x = parseNumber(el.value);
    const len = (v) => (isImperial() ? v * MIL : v);
    let bad = !Number.isFinite(x);
    const [kind, idx] = k.split('-');
    const i = Number(idx);
    switch (kind) {
      case 'cu': st.cuUm[i] = st.cuUnit === 'oz' ? x * UM_PER_OZ : x; bad ||= !(x > 0); break;
      case 'h': st.diel[i] = { ...st.diel[i], h: len(x) }; bad ||= !(x > 0); break;
      case 'er': st.diel[i] = { ...st.diel[i], er: x }; bad ||= !(x >= 1); break;
      case 'tt': st.targetMm = len(x); bad ||= !(x > 0); break;
      case 'tol': st.tolPct = x; bad ||= !(x >= 0); break;
      case 'w': st.wMm = len(x); bad ||= !(x > 0); break;
      case 's': st.sMm = len(x); bad ||= !(x > 0); break;
      default: return;
    }
    el.toggleAttribute('aria-invalid', bad);
  };

  form.addEventListener('input', (e) => {
    const el = e.target;
    const k = el.dataset?.k;
    if (k === 'preset') {
      const p = presetById(el.value);
      if (p) st = { ...st, preset: p.id, ...presetStack(p) };
      drawForm();
      form.querySelector('#su-preset')?.focus();
    } else if (k?.startsWith('role-')) {
      st.roles[Number(k.slice(5))] = el.value;
    } else if (k) {
      readInput(el);
    }
    update();
  });

  const choose = (btn) => {
    const key = btn.dataset.choice;
    const val = btn.dataset.value;
    if (key === 'n') {
      const n = Number(val);
      if (n !== st.n) st = defaultState(n, { targetMm: st.targetMm, tolPct: st.tolPct, wMm: st.wMm, sMm: st.sMm, cuUnit: st.cuUnit });
    } else if (key === 'cuu') {
      st.cuUnit = val === 'oz' ? 'oz' : 'um';
    }
    drawForm();
    form.querySelector(`[data-choice="${key}"][data-value="${val}"]`)?.focus();
    update();
  };

  form.addEventListener('click', (e) => {
    const choice = e.target.closest('[data-choice]');
    if (choice) { choose(choice); return; }
    const chip = e.target.closest('[data-tt]');
    if (chip) {
      st.targetMm = Number(chip.dataset.tt);
      const inp = form.querySelector('[data-k="tt"]');
      inp.value = dispLen(st.targetMm);
      inp.removeAttribute('aria-invalid');
      update();
    }
  });

  form.addEventListener('keydown', (e) => {
    const choice = e.target.closest('[data-choice]');
    if (!choice || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    const next = ['ArrowRight', 'ArrowDown'].includes(e.key) ? choice.nextElementSibling : choice.previousElementSibling;
    if (next) choose(next);
    e.preventDefault();
  });
  form.addEventListener('submit', (e) => e.preventDefault());

  result.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy]');
    if (btn && await copyText(btn.dataset.copy)) {
      btn.classList.add('ok');
      setTimeout(() => btn.classList.remove('ok'), 1200);
    }
  });

  root.querySelector('.page-actions').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const flash = (key) => {
      const label = btn.querySelector('.btn-label');
      label.textContent = t('copied');
      btn.classList.add('ok');
      setTimeout(() => { label.textContent = t(key); btn.classList.remove('ok'); }, 1400);
    };
    switch (btn.dataset.action) {
      case 'reset':
        st = defaultState(4);
        drawForm();
        update();
        break;
      case 'copy-link':
        if (await copyText(location.href)) flash('copyLink');
        break;
      case 'copy-summary':
        {
          // Failed checks and warnings as shown on the page.
          const fails = [...result.querySelectorAll('.checks li.fail b'), ...result.querySelectorAll('.msg li')]
            .map((el) => `  ! ${el.textContent.trim()}`);
          const text = summary(st, last) + (fails.length ? `\n\n${t('warnings')}:\n${fails.join('\n')}` : '');
          if (await copyText(text)) flash('copySummary');
        }
        break;
      case 'print':
        root.querySelector('.print-meta').textContent = `${t('printedAt')}: ${new Date().toLocaleString()} · ${location.href}`;
        window.print();
        break;
      default:
    }
  });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(([entry]) => {
      peek.hidden = entry.isIntersecting || window.innerWidth > 900;
    }, { threshold: 0.05 });
    io.observe(result);
  }

  drawForm();
  update();
}

// The diagram smoke test calls compute/diagram with the field values of
// `sections` (none here), so both fall back to the default state.
const stateOf = (v) => (v?.roles ? v : defaultState());

const page = {
  id: 'stackup',
  strings,
  sections: [],
  compute: (v) => analyze(stateOf(v)),
  diagram: (v, u, r) => drawStack(stateOf(v), r ?? analyze(stateOf(v))),
  render: (r, v) => { const p = render(r, stateOf(v)); return typeof p === 'string' ? p : p.top + p.rest; },
  mount(root, params) { mount(root, params, page); },
};

export default page;
