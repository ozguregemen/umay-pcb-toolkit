import {
  stageGain, ratioFor, bestRatioPair, closedLoop, RESPONSES, sallenKeyLowPass, sallenKeyHighPass,
  sallenKeyMag, stageMag, openLoopMag, dB,
} from '../engine/opamp.js';
import { heroes, rows, block, steps, messages, invalid } from '../ui/calculator.js';
import { tx } from '../ui/math.js';
import { fmt, si, siHtml, esc } from '../ui/format.js';
import { svg, twoTerm, wire, node, ground, terminal, text, path, axes, wave, circle, opamp } from '../ui/svg.js';
import { t, locale } from '../i18n.js';

const strings = {
  tr: {
    oa_circ: 'Devre',
    oa_inv: 'Eviren kuvvetlendirici',
    oa_noninv: 'Evirmeyen kuvvetlendirici',
    oa_diff: 'Fark kuvvetlendiricisi',
    oa_sklp: 'Sallen-Key alçak geçiren',
    oa_skhp: 'Sallen-Key yüksek geçiren',
    oa_calc: 'Hesap yönü',
    oa_ana: 'Dirençlerden kazanç',
    oa_des: 'Kazançtan dirençler',
    oa_resTitle: 'Dirençler',
    oa_rin: 'Giriş direnci Rin',
    oa_rg: 'Toprak direnci Rg',
    oa_r1: 'R1 (= R3)',
    oa_rf: 'Geri besleme direnci Rf',
    oa_r2: 'R2 (= R4)',
    oa_diffInfo: 'Fark kuvvetlendiricisinde R3 = R1 ve R4 = R2 olmalıdır; oranlardaki küçük farklar ortak mod bastırmayı (CMRR) düşürür. Bu yüzden %0,1 dirençler ya da hazır fark kuvvetlendirici entegreleri kullanılır.',
    oa_g: 'Hedef kazanç',
    oa_gInv: 'Hedef kazanç büyüklüğü |G|',
    oa_rbase: 'Yaklaşık giriş / toprak direnci',
    oa_rbaseInfo: 'Arama, bu değerin ±yarım dekad çevresindeki standart değerleri dener. 1–100 kΩ aralığı çoğu op-amp için uygundur: küçük değerler çıkışı yükler, büyük değerler gürültüyü ve bias akımı hatasını artırır.',
    oa_series: 'E-serisi',
    oa_ampTitle: 'Op-amp ve besleme',
    oa_gbw: 'Kazanç–bant genişliği çarpımı GBW',
    oa_gbwInfo: 'Veri sayfasındaki GBW (ya da birim kazanç frekansı). Op-amp tek kutuplu bir model ile hesaplanır: A(f) ≈ GBW / f.',
    oa_vpos: 'Pozitif besleme V+',
    oa_vneg: 'Negatif besleme V−',
    oa_vnegInfo: 'Tek beslemeli devrede 0 V girin.',
    oa_hd: 'Çıkışın raya yaklaşma payı',
    oa_hdInfo: 'Çıkışın beslemeye ne kadar yaklaşabildiği (yük altında). Rail-to-rail çıkışlı op-ampler 10–100 mV, klasik op-ampler (LM358, TL07x) 1,5–2 V. LM358 alt raya yaklaşır ama üst raya yaklaşamaz; en kötü tarafı girin.',
    oa_slew: 'Yükselme hızı SR (slew rate)',
    oa_sigTitle: 'Giriş sinyali',
    oa_vinLo: 'Giriş en küçük',
    oa_vinHi: 'Giriş en büyük',
    oa_vinInfo: 'Giriş sinyalinin aldığı en küçük ve en büyük değer (fark kuvvetlendiricisinde V2 − V1). AC sinyal için ±tepe değerini girin.',
    oa_fsig: 'Sinyal frekansı',
    oa_filtTitle: 'Filtre',
    oa_resp: 'Yanıt türü',
    oa_butter: 'Butterworth (en düz)',
    oa_bessel: 'Bessel (en iyi darbe yanıtı)',
    oa_cheb05: 'Chebyshev 0,5 dB dalgalanma',
    oa_cheb1: 'Chebyshev 1 dB dalgalanma',
    oa_respInfo: 'Butterworth geçirme bandında en düz yanıtı verir. Bessel’in faz yanıtı doğrusaldır, darbede aşma yapmaz ama kesimi yumuşaktır. Chebyshev geçirme bandında dalgalanma pahasına daha dik keser.',
    oa_fc: 'Kesim frekansı fc (−3 dB)',
    oa_cLp: 'C2 (+ girişten toprağa)',
    oa_cHp: 'Kondansatörler C1 = C2',
    oa_cInfo: 'Seçtiğiniz standart kondansatör; dirençler buna göre hesaplanır. C0G/NP0 seramik ya da film kondansatör kullanın, 10 pF’ın altına inmeyin.',
    oa_cser: 'C1 için kondansatör serisi',
    oa_rser: 'Direnç serisi',
    oa_gain: 'Kazanç',
    oa_bw: 'Kapalı çevrim bant genişliği',
    oa_bwSub: 'GBW / gürültü kazancı {ng}',
    oa_out: 'Çıkış aralığı',
    oa_outOk: 'çıkış salınımı içinde',
    oa_outClip: 'kırpılır',
    oa_rfStd: 'Rf',
    oa_rbStd: 'Rin / Rg / R1',
    oa_gainGot: 'Elde edilen kazanç',
    oa_err: 'hata {e}',
    oa_detailsTitle: 'Ayrıntılar',
    oa_resistors: 'Dirençler',
    oa_gainDb: 'Kazanç (dB)',
    oa_ng: 'Gürültü kazancı 1 + Rf/R',
    oa_zin: 'Giriş empedansı',
    oa_zinHigh: 'çok yüksek (op-amp girişi)',
    oa_zinDiff: 'V1: {a} · V2: {b}',
    oa_swing: 'Çıkış salınım sınırları',
    oa_fpbw: 'Tam güç bant genişliği SR / (2π·Vp)',
    oa_gainErr: 'Sinyal frekansında kazanç hatası',
    oa_fcGot: 'Elde edilen kesim frekansı',
    oa_qGot: 'Elde edilen Q',
    oa_target: 'hedef {x}',
    oa_compTitle: 'Bileşenler (standart değerler)',
    oa_exact: 'hesaplanan {x}',
    oa_f0: 'Kutup frekansı f0',
    oa_ratio: 'fc / f0',
    oa_gbwDev: 'fc’de GBW kaynaklı sapma',
    oa_upper: 'Üst köşe (GBW sınırı)',
    oa_gbwRatio: 'GBW / f0',
    oa_stepRatio: 'Gereken direnç oranı',
    oa_stepPair: 'Rin / Rg / R1 için, girilen değerin ±yarım dekad çevresindeki tüm standart değerler denenir; Rf (R2) her birinde en yakın standart değere yuvarlanır ve oran hatası en küçük olan çift seçilir. Burada seçilen çiftin yuvarlanmadan önceki değeri gösterilir.',
    oa_stepF0t: 'Hedef kutup frekansı f0',
    oa_stepC1: 'C1, seçilen kondansatör serisinde bu sınıra eşit ya da ondan büyük ilk standart değerdir.',
    oa_stepSum: 'Toplam R1 + R2',
    oa_stepProd: 'Çarpım R1 · R2',
    oa_stepRound: 'R1 ve R2 ayrı ayrı bir alt ya da bir üst standart değere yuvarlanır; dört kombinasyondan f0 ve Q değeri hedefe en yakın olan seçilir. Sonraki adımlar bu standart değerlerle hesaplanır.',
    oa_stepRoundDouble: 'Burada C1 tam olarak 4Q²·C2 olduğundan a² = 4b olur ve iki direnç de a/2’ye eşittir. R1 ve R2 ayrı ayrı bir alt ya da bir üst standart değere yuvarlanır; dört kombinasyondan f0 ve Q değeri hedefe en yakın olan seçilir. Sonraki adımlar bu standart değerlerle hesaplanır.',
    oa_noteGain: 'Op-amp, A0 = 100 dB ve tek kutuplu bir modelle (GBW) hesaplanır. Bant genişliği gürültü kazancıyla (1 + Rf/R) bölünür; eviren kuvvetlendiricide bu, sinyal kazancından 1 fazladır. Giriş ortak mod aralığı, ofset ve bias akımları dahil değildir; veri sayfasını kontrol edin.',
    oa_noteFilter: 'Birim kazançlı Sallen-Key: C1 her zaman 4Q²·C2’den büyük ilk standart değere yuvarlanır, R1 ve R2 bu kondansatörlerle tam hesaplanıp seçilen seriye yuvarlanır; sonuç fc ve Q yuvarlanmış değerlerle yeniden hesaplanır. fc, −3 dB noktasıdır (Chebyshev için de). Op-amp tek kutuplu GBW modeliyle çizilir.',
    warn_oa_clip: 'Çıkış {lo} … {hi} aralığına çıkmak istiyor ama op-amp yalnızca {slo} … {shi} arasında salınabilir: sinyal kırpılır. Kazancı, beslemeyi ya da giriş seviyesini (ör. referans/ofset ekleyerek) değiştirin.',
    warn_oa_inRange: 'Giriş gerilimi besleme raylarının dışına çıkıyor; op-amp girişleri raylar arasında kalmalıdır (çoğu op-amp için daha da dar bir ortak mod aralığı vardır).',
    warn_oa_bwLow: 'Sinyal frekansında kazanç {e} düşüyor; daha yüksek GBW’li bir op-amp seçin ya da kazancı iki kademeye bölün.',
    warn_oa_slew: 'Sinyal frekansı tam güç bant genişliğinin ({f}) üstünde: büyük genlikte çıkış slew rate sınırına takılır ve bozulur.',
    warn_oa_rRange: 'Bir direnç 1 kΩ–1 MΩ aralığının dışında: küçük değerler op-amp çıkışını yükler, büyük değerler gürültüyü, bias akımı hatasını ve parazitik kapasitans etkisini artırır.',
    warn_oa_gbwFilter: 'Op-amp GBW’si bu filtre için düşük: fc’deki yanıt ideale göre {d} sapıyor. Daha hızlı bir op-amp seçin (GBW ≥ ~100·Q·f0 yaygın bir başlangıç değeridir).',
    warn_oa_cSmall: 'Kondansatör 100 pF’ın altında: devre ve pin kapasitansları (1–5 pF) frekansı belirgin biçimde kaydırır. Daha büyük C ve daha küçük R seçin.',
    warn_oa_hpTop: 'Yüksek geçiren filtrenin yanıtı yaklaşık {f} üstünde op-amp yüzünden yeniden düşer; geçirme bandının bu frekansın çok altında kaldığından emin olun.',
    err_oa_supply: 'V+ değeri V−’den büyük olmalı.',
    err_oa_gainLow: 'Evirmeyen kuvvetlendiricinin kazancı 1’den büyük olmalı. G = 1 için gerilim izleyici (buffer) kullanın: çıkışı doğrudan − girişe bağlayın.',
    err_oa_noPair: 'Bu aralıkta uygun bir direnç çifti bulunamadı.',
    oa_dgAmp: 'Op-amp devresi ve bileşen değerleri',
    oa_dgBode: 'Genlik yanıtı (log frekans): kapalı çevrim kazanç, açık çevrim kazanç A(f) ve bant genişliği',
    oa_dgFilter: 'Filtrenin genlik yanıtı (log frekans): standart değerlerle ideal yanıt ve op-amp GBW’si ile yanıt',
    oa_dgOl: 'açık çevrim',
    oa_dgIdeal: 'ideal op-amp',
    oa_dgReal: 'GBW = {gbw} ile',
  },
  en: {
    oa_circ: 'Circuit',
    oa_inv: 'Inverting amplifier',
    oa_noninv: 'Non-inverting amplifier',
    oa_diff: 'Difference amplifier',
    oa_sklp: 'Sallen-Key low-pass',
    oa_skhp: 'Sallen-Key high-pass',
    oa_calc: 'Direction',
    oa_ana: 'Gain from resistors',
    oa_des: 'Resistors for a gain',
    oa_resTitle: 'Resistors',
    oa_rin: 'Input resistor Rin',
    oa_rg: 'Ground resistor Rg',
    oa_r1: 'R1 (= R3)',
    oa_rf: 'Feedback resistor Rf',
    oa_r2: 'R2 (= R4)',
    oa_diffInfo: 'A difference amplifier needs R3 = R1 and R4 = R2; small ratio mismatches reduce the common-mode rejection (CMRR). That is why 0.1 % resistors or integrated difference amplifiers are used.',
    oa_g: 'Target gain',
    oa_gInv: 'Target gain magnitude |G|',
    oa_rbase: 'Approximate input / ground resistor',
    oa_rbaseInfo: 'The search tries standard values within ±half a decade of this value. 1–100 kΩ suits most op amps: low values load the output, high values add noise and bias-current error.',
    oa_series: 'E-series',
    oa_ampTitle: 'Op amp and supply',
    oa_gbw: 'Gain–bandwidth product GBW',
    oa_gbwInfo: 'GBW (or unity-gain frequency) from the datasheet. The op amp is modelled with a single pole: A(f) ≈ GBW / f.',
    oa_vpos: 'Positive supply V+',
    oa_vneg: 'Negative supply V−',
    oa_vnegInfo: 'Enter 0 V for a single-supply circuit.',
    oa_hd: 'Output swing to the rails',
    oa_hdInfo: 'How close the output gets to the supplies (under load). Rail-to-rail output op amps reach 10–100 mV, classic op amps (LM358, TL07x) 1.5–2 V. The LM358 reaches the lower rail but not the upper one; enter the worse side.',
    oa_slew: 'Slew rate SR',
    oa_sigTitle: 'Input signal',
    oa_vinLo: 'Input minimum',
    oa_vinHi: 'Input maximum',
    oa_vinInfo: 'Smallest and largest value of the input (V2 − V1 for the difference amplifier). For an AC signal enter ± its peak.',
    oa_fsig: 'Signal frequency',
    oa_filtTitle: 'Filter',
    oa_resp: 'Response',
    oa_butter: 'Butterworth (flattest)',
    oa_bessel: 'Bessel (best pulse response)',
    oa_cheb05: 'Chebyshev 0.5 dB ripple',
    oa_cheb1: 'Chebyshev 1 dB ripple',
    oa_respInfo: 'Butterworth gives the flattest passband. Bessel has a linear phase and no overshoot on pulses but a soft cutoff. Chebyshev cuts off more steeply at the cost of passband ripple.',
    oa_fc: 'Cutoff frequency fc (−3 dB)',
    oa_cLp: 'C2 (+ input to ground)',
    oa_cHp: 'Capacitors C1 = C2',
    oa_cInfo: 'The standard capacitor you pick; the resistors are calculated from it. Use C0G/NP0 ceramic or film capacitors and stay above 10 pF.',
    oa_cser: 'Capacitor series for C1',
    oa_rser: 'Resistor series',
    oa_gain: 'Gain',
    oa_bw: 'Closed-loop bandwidth',
    oa_bwSub: 'GBW / noise gain {ng}',
    oa_out: 'Output range',
    oa_outOk: 'within the output swing',
    oa_outClip: 'clips',
    oa_rfStd: 'Rf',
    oa_rbStd: 'Rin / Rg / R1',
    oa_gainGot: 'Resulting gain',
    oa_err: 'error {e}',
    oa_detailsTitle: 'Details',
    oa_resistors: 'Resistors',
    oa_gainDb: 'Gain (dB)',
    oa_ng: 'Noise gain 1 + Rf/R',
    oa_zin: 'Input impedance',
    oa_zinHigh: 'very high (op-amp input)',
    oa_zinDiff: 'V1: {a} · V2: {b}',
    oa_swing: 'Output swing limits',
    oa_fpbw: 'Full-power bandwidth SR / (2π·Vp)',
    oa_gainErr: 'Gain error at the signal frequency',
    oa_fcGot: 'Resulting cutoff frequency',
    oa_qGot: 'Resulting Q',
    oa_target: 'target {x}',
    oa_compTitle: 'Components (standard values)',
    oa_exact: 'calculated {x}',
    oa_f0: 'Pole frequency f0',
    oa_ratio: 'fc / f0',
    oa_gbwDev: 'Deviation at fc due to GBW',
    oa_upper: 'Upper corner (GBW limit)',
    oa_gbwRatio: 'GBW / f0',
    oa_stepRatio: 'Required resistor ratio',
    oa_stepPair: 'For Rin / Rg / R1 every standard value within ±half a decade of the entered value is tried; Rf (R2) is rounded to the nearest standard value each time and the pair with the smallest ratio error is kept. This is the value of the chosen pair before rounding.',
    oa_stepF0t: 'Target pole frequency f0',
    oa_stepC1: 'C1 is the first standard value of the chosen capacitor series at or above this limit.',
    oa_stepSum: 'Sum R1 + R2',
    oa_stepProd: 'Product R1 · R2',
    oa_stepRound: 'R1 and R2 are each rounded to the standard value just below or just above; of the four combinations the one whose f0 and Q are closest to the targets is kept. The following steps use these standard values.',
    oa_stepRoundDouble: 'C1 is exactly 4Q²·C2 here, so a² = 4b and both resistors equal a/2. R1 and R2 are each rounded to the standard value just below or just above; of the four combinations the one whose f0 and Q are closest to the targets is kept. The following steps use these standard values.',
    oa_noteGain: 'The op amp is modelled with A0 = 100 dB and a single pole (GBW). The bandwidth is divided by the noise gain (1 + Rf/R), which for the inverting amplifier is one more than the signal gain. Input common-mode range, offset and bias currents are not included; check the datasheet.',
    oa_noteFilter: 'Unity-gain Sallen-Key: C1 is rounded up to the first standard value above 4Q²·C2, R1 and R2 are solved exactly for those capacitors and rounded to the chosen series, and fc and Q are recalculated with the rounded values. fc is the −3 dB point (also for Chebyshev). The op amp is drawn with a single-pole GBW model.',
    warn_oa_clip: 'The output wants to reach {lo} … {hi} but the op amp can only swing {slo} … {shi}: the signal clips. Change the gain, the supply or the input level (e.g. add a reference/offset).',
    warn_oa_inRange: 'The input goes beyond the supply rails; op-amp inputs must stay between the rails (most op amps have an even narrower common-mode range).',
    warn_oa_bwLow: 'The gain drops by {e} at the signal frequency; choose an op amp with a higher GBW or split the gain over two stages.',
    warn_oa_slew: 'The signal frequency is above the full-power bandwidth ({f}): at full amplitude the output is slew-rate limited and distorts.',
    warn_oa_rRange: 'A resistor is outside 1 kΩ–1 MΩ: low values load the op-amp output, high values add noise, bias-current error and sensitivity to stray capacitance.',
    warn_oa_gbwFilter: 'The op-amp GBW is low for this filter: the response at fc deviates by {d} from the ideal. Choose a faster op amp (GBW ≥ ~100·Q·f0 is a common starting point).',
    warn_oa_cSmall: 'A capacitor is below 100 pF: board and pin capacitances (1–5 pF) shift the frequency noticeably. Use a larger C and smaller R.',
    warn_oa_hpTop: 'Because of the op amp, the high-pass response falls again above about {f}; make sure the passband you need is well below that.',
    err_oa_supply: 'V+ must be greater than V−.',
    err_oa_gainLow: 'A non-inverting amplifier needs a gain above 1. For G = 1 use a voltage follower: connect the output straight to the − input.',
    err_oa_noPair: 'No suitable resistor pair was found in this range.',
    oa_dgAmp: 'Op-amp circuit with component values',
    oa_dgBode: 'Magnitude response (log frequency): closed-loop gain, open-loop gain A(f) and the bandwidth',
    oa_dgFilter: 'Filter magnitude response (log frequency): ideal response with standard values and the response with the op-amp GBW',
    oa_dgOl: 'open loop',
    oa_dgIdeal: 'ideal op amp',
    oa_dgReal: 'with GBW = {gbw}',
  },
};

const GAIN_KINDS = ['inv', 'noninv', 'diff'];
const isGain = (v) => GAIN_KINDS.includes(v.circ);
const isFilter = (v) => !isGain(v);
const isDes = (v) => isGain(v) && v.calc === 'des';
const isAna = (v) => isGain(v) && v.calc !== 'des';
const SCALE = { MHz: 1e6, kHz: 1e3, Hz: 1 };
const RB_LABEL = { inv: 'oa_rin', noninv: 'oa_rg', diff: 'oa_r1' };
const RF_LABEL = { inv: 'oa_rf', noninv: 'oa_rf', diff: 'oa_r2' };
const val = (x, unit) => (Number.isFinite(x) && x > 0 ? si(x, unit, 3) : '?');
const signedPct = (x) => new Intl.NumberFormat(locale(), { style: 'percent', signDisplay: 'exceptZero', maximumSignificantDigits: 3 })
  .format(Math.abs(x) < 1e-9 ? 0 : x / 100);
const dbTxt = (x) => (Math.abs(x) < 0.005 ? '0 dB' : `${x > 0 ? '+' : '−'}${fmt(Math.abs(x), 2)} dB`);
const RESP_OPTS = ['butter', 'bessel', 'cheb05', 'cheb1'].map((k) => ({
  value: k, raw: true, get label() { return `${t(`oa_${k}`)} · Q = ${fmt(RESPONSES[k], 3)}`; },
}));
const SERIES = (list) => list.map((s) => ({ value: s, label: s, raw: true }));

// ---------------------------------------------------------------------------
// Diagrams
// ---------------------------------------------------------------------------

const OX = 230; // op-amp left edge
const OY = 100; // op-amp centre line
const OUT = 316; // output node column

/** Resistor values to draw: from the result when designed, else the inputs. */
function parts(v, r) {
  if (isFilter(v)) return { r1: r?.d?.r1, r2: r?.d?.r2, c1: r?.d?.c1, c2: r?.d?.c2 };
  if (isDes(v)) return { rf: r?.rf, rb: r?.rb };
  return { rf: v.rf, rb: v.rb };
}

function schematic(v, r) {
  const p = parts(v, r);
  const plusTop = v.circ === 'noninv';
  let b = opamp(OX, OY, { size: 56, plusTop })
    + wire([OX + 56, OY], [372, OY]) + node(OUT, OY) + terminal(375, OY, 'Vout', 'right');
  // Live result under the output: gain or cutoff.
  if (isGain(v)) b += text(398, OY + 22, r?.gain !== undefined ? `G = ${fmt(r.gain, 3)}` : 'G = ?', { cls: 'val' });
  else b += text(398, OY + 22, `fc = ${val(r?.d?.fc, 'Hz')}`, { cls: 'val' });
  const yTop = OY - 14; // upper input
  const yBot = OY + 14; // lower input
  const fbTop = (y, kind, name, value) => wire([190, yTop], [190, y], [200, y]) + node(190, yTop)
    + twoTerm(kind, 200, y, 306, y, { name, value }) + wire([306, y], [OUT, y], [OUT, OY]);
  switch (v.circ) {
    case 'inv':
      b += terminal(30, yTop, 'Vin', 'top') + twoTerm('R', 33, yTop, 150, yTop, { name: 'Rin', value: val(p.rb, 'Ω') })
        + wire([150, yTop], [OX, yTop]) + fbTop(44, 'R', 'Rf', val(p.rf, 'Ω'))
        + wire([OX, yBot], [206, yBot], [206, 128]) + ground(206, 128);
      break;
    case 'noninv':
      // + on top: Vin straight in; feedback below to the − input.
      b += terminal(30, yTop, 'Vin', 'top') + wire([33, yTop], [OX, yTop])
        + wire([OX, yBot], [190, yBot], [190, 160], [200, 160]) + node(190, yBot)
        + twoTerm('R', 200, 160, 306, 160, { name: 'Rf', value: val(p.rf, 'Ω'), flip: true })
        + wire([306, 160], [OUT, 160], [OUT, OY])
        + twoTerm('R', 190, yBot, 96, yBot, { name: 'Rg', value: val(p.rb, 'Ω') })
        + wire([96, yBot], [96, 128]) + ground(96, 128);
      break;
    case 'diff':
      b += terminal(30, yTop, 'V1', 'top') + twoTerm('R', 33, yTop, 150, yTop, { name: 'R1', value: val(p.rb, 'Ω') })
        + wire([150, yTop], [OX, yTop]) + fbTop(44, 'R', 'R2', val(p.rf, 'Ω'))
        + terminal(30, 140, 'V2', 'top') + twoTerm('R', 33, 140, 150, 140, { name: 'R3', value: val(p.rb, 'Ω'), flip: true })
        + wire([150, 140], [206, 140], [206, yBot], [OX, yBot]) + node(206, 140)
        + twoTerm('R', 206, 140, 206, 180, { name: 'R4', value: val(p.rf, 'Ω') }) + ground(206, 180);
      break;
    default: {
      // Sallen-Key: Vin → Z1 → A → Z2 → B (+ input); A → Z3 → output; B → Z4 → ground; − tied to output.
      const lp = v.circ === 'sklp';
      const [k12, k34] = lp ? ['R', 'C'] : ['C', 'R'];
      const u12 = lp ? 'Ω' : 'F';
      const u34 = lp ? 'F' : 'Ω';
      const [n1, n2, n3, n4] = lp ? ['R1', 'R2', 'C1', 'C2'] : ['C1', 'C2', 'R1', 'R2'];
      const [v1, v2, v3, v4] = lp ? [p.r1, p.r2, p.c1, p.c2] : [p.c1, p.c2, p.r1, p.r2];
      b += terminal(24, yBot, 'Vin', 'top')
        + twoTerm(k12, 27, yBot, 104, yBot, { name: n1, value: val(v1, u12), flip: true })
        + node(110, yBot) + wire([104, yBot], [116, yBot])
        + twoTerm(k12, 116, yBot, 184, yBot, { name: n2, value: val(v2, u12), flip: true })
        + wire([184, yBot], [OX, yBot]) + node(196, yBot)
        + twoTerm(k34, 110, yBot, 110, 40, { name: n3, value: val(v3, u34) })
        + wire([110, 40], [OUT, 40], [OUT, OY])
        + wire([OX, yTop], [214, yTop], [214, 62], [OUT, 62]) + node(OUT, 62)
        + twoTerm(k34, 196, yBot, 196, 168, { name: n4, value: val(v4, u34) }) + ground(196, 168);
    }
  }
  return svg(440, 196, b, t('oa_dgAmp'), { wide: true });
}

/** Log-frequency magnitude plot. series: [{ fn(f) → dB, cls }], marks drawn by the caller. */
function plotFrame(fLo, fHi, yLo, yHi, x0 = 62, y0 = 170, w = 350, h = 140) {
  const lx = (f) => (Math.log10(f) - Math.log10(fLo)) / (Math.log10(fHi) - Math.log10(fLo));
  const X = (f) => x0 + lx(f) * w;
  const Y = (d) => y0 - ((Math.max(yLo, Math.min(yHi, d)) - yLo) / (yHi - yLo)) * h;
  let b = '';
  for (let e = Math.ceil(Math.log10(fLo) - 1e-9); e <= Math.floor(Math.log10(fHi) + 1e-9); e++) {
    const x = Math.round(X(10 ** e) * 10) / 10;
    b += path(`M${x},${y0}V${y0 - h}`, 'grid-l') + text(x, y0 + 14, si(10 ** e, 'Hz', 1), { cls: 'lbl' });
  }
  const step = (yHi - yLo) > 80 ? 40 : 20;
  for (let d = Math.ceil(yLo / step) * step; d <= yHi; d += step) {
    const y = Math.round(Y(d) * 10) / 10;
    b += path(`M${x0},${y}H${x0 + w}`, 'grid-l') + text(x0 - 5, y + 4, `${d < 0 ? `−${-d}` : d} dB`, { cls: 'lbl', anchor: 'end' });
  }
  b += axes(x0, y0, w + 6, h + 6) + text(x0 + w + 8, y0 - 4, 'f', { cls: 'sym', anchor: 'start' });
  const curve = (fn, cls) => {
    const pts = [];
    for (let i = 0; i <= 160; i++) {
      const f = fLo * (fHi / fLo) ** (i / 160);
      const d = fn(f);
      if (Number.isFinite(d) && d >= yLo - 0.5) pts.push([X(f), Y(d)]);
    }
    return pts.length > 1 ? wave(pts, cls) : '';
  };
  return { X, Y, b, curve, x0, y0, w, h };
}

function gainBode(v, r) {
  const ok = !!r && r.gain !== undefined;
  const gbw = ok ? r.gbw : 1e6;
  const st = ok ? { gain: r.gain, noiseGain: r.noiseGain } : { gain: 10, noiseGain: 10 };
  const bw = gbw / st.noiseGain;
  const gDb = dB(Math.abs(st.gain));
  const fHi = 10 ** Math.ceil(Math.log10(gbw) - 1e-9) * 10;
  const fLo = Math.max(fHi / 1e7, Math.min(10 ** Math.floor(Math.log10(bw)) / 100, fHi / 1e4));
  const yHi = Math.min(100, Math.max(40, Math.ceil((gDb + 25) / 20) * 20));
  const yLo = Math.min(-20, Math.floor((gDb - 20) / 20) * 20);
  const P = plotFrame(fLo, fHi, yLo, yHi);
  let b = P.b
    + P.curve((f) => { const d = dB(openLoopMag(f, gbw)); return d <= yHi ? d : NaN; }, 'wave2')
    + P.curve((f) => { const d = dB(stageMag(f, st, gbw)); return d >= yLo ? d : NaN; }, 'wave');
  // Open-loop label where the line enters the plot (A = top of the plot).
  const fTop = gbw / 10 ** (yHi / 20);
  b += text(Math.min(Math.max(P.X(fTop) + 10, P.x0 + 6), P.x0 + P.w - 110), P.Y(yHi) + 10, `${t('oa_dgOl')} A(f)`, { cls: 'lbl', anchor: 'start' });
  const xb = P.X(bw);
  b += circle(xb, P.Y(gDb - 3.01), 3, 'node')
    + path(`M${Math.round(xb * 10) / 10},${Math.round(P.Y(gDb - 3.01) * 10) / 10}V${P.y0}`, 'ext')
    + text(xb + 6, P.y0 - 6, `BW = ${ok ? si(bw, 'Hz', 3) : '?'}`, { cls: 'val', anchor: 'start' })
    + text(P.x0 + 6, P.Y(gDb) + 15, `G = ${ok ? `${fmt(gDb, 3)} dB` : '?'}`, { cls: 'val', anchor: 'start' })
    + circle(P.X(gbw), P.Y(0), 2.6, 'node')
    + text(P.X(gbw) + 6, P.Y(0) - 6, 'GBW', { cls: 'lbl', anchor: 'start' });
  return svg(440, 196, b, t('oa_dgBode'), { wide: true });
}

function filterBode(v, r) {
  const d = r?.d;
  const fc = d ? d.fc : 1e3;
  const gbw = d ? r.gbw : Infinity;
  const fLo = 10 ** (Math.round(Math.log10(fc)) - 2);
  const fHi = fLo * 1e4;
  const yLo = -60;
  const yHi = 10;
  const P = plotFrame(fLo, fHi, yLo, yHi);
  let b = P.b;
  if (d) {
    b += P.curve((f) => dB(sallenKeyMag(f, d, Infinity)), 'wave')
      + P.curve((f) => dB(sallenKeyMag(f, d, gbw)), 'wave2');
  } else {
    // Placeholder: Butterworth shape at 1 kHz.
    const q = Math.SQRT1_2;
    const lp = v.circ !== 'skhp';
    b += P.curve((f) => { const x = f / fc; const m = lp ? 1 : x * x; return dB(m / Math.sqrt((1 - x * x) ** 2 + (x / q) ** 2)); }, 'wave');
  }
  const xc = P.X(fc);
  const y3 = P.Y(-3.01);
  b += path(`M${P.x0},${Math.round(y3 * 10) / 10}H${Math.round(xc * 10) / 10}V${P.y0}`, 'ext') + circle(xc, y3, 3, 'node')
    + text(xc + (v.circ === 'skhp' ? -6 : 6), y3 - 8, `fc = ${d ? si(fc, 'Hz', 3) : '?'}`, { cls: 'val', anchor: v.circ === 'skhp' ? 'end' : 'start' });
  // Legend in the empty stop-band corner (bottom left for LP, bottom right for HP).
  const lx = v.circ === 'skhp' ? 262 : 76;
  const ly = P.Y(-44);
  b += wave([[lx, ly], [lx + 20, ly]], 'wave') + text(lx + 25, ly + 4, t('oa_dgIdeal'), { cls: 'lbl', anchor: 'start' })
    + (d ? wave([[lx, ly + 16], [lx + 20, ly + 16]], 'wave2') + text(lx + 25, ly + 20, t('oa_dgReal', { gbw: si(gbw, 'Hz', 3) }), { cls: 'lbl', anchor: 'start' }) : '');
  return svg(440, 196, b, t('oa_dgFilter'), { wide: true });
}

const diagram = (v, u, r) => schematic(v, r) + (isGain(v) ? gainBode(v, r) : filterBode(v, r));

// ---------------------------------------------------------------------------

function computeGain(v, gbw) {
  if (!(v.vpos > v.vneg)) return { ok: false, errors: ['oa_supply'] };
  let rf = v.rf;
  let rb = v.rb;
  let pair = null;
  let kTarget = null;
  if (v.calc === 'des') {
    if (v.circ === 'noninv' && !(v.g > 1)) return { ok: false, errors: ['oa_gainLow'] };
    kTarget = ratioFor(v.circ, v.g);
    pair = bestRatioPair(kTarget, v.rbase, v.ser);
    if (!pair) return { ok: false, errors: ['oa_noPair'] };
    rf = pair.rf;
    rb = pair.rb;
  }
  const st = stageGain(v.circ, rf, rb);
  const slew = v.slew * 1e6; // V/µs → V/s
  const cl = closedLoop({ ...st, gbw, vinLo: Math.min(v.vinLo, v.vinHi), vinHi: Math.max(v.vinLo, v.vinHi), vPos: v.vpos, vNeg: v.vneg, headroom: v.hd, slew, fSig: v.fsig });
  const warnings = [];
  const vars = {
    oa_clip: { lo: si(cl.outLo, 'V', 3), hi: si(cl.outHi, 'V', 3), slo: si(cl.swingLo, 'V', 3), shi: si(cl.swingHi, 'V', 3) },
    oa_bwLow: { e: signedPct(cl.gainErrPct) },
    oa_slew: { f: si(cl.fpbw, 'Hz', 3) },
  };
  if (cl.clipLo || cl.clipHi) warnings.push('oa_clip');
  if (v.circ === 'noninv' && (Math.min(v.vinLo, v.vinHi) < v.vneg || Math.max(v.vinLo, v.vinHi) > v.vpos)) warnings.push('oa_inRange');
  if (cl.gainErrPct < -1) warnings.push('oa_bwLow');
  if (v.fsig > cl.fpbw) warnings.push('oa_slew');
  if ([rf, rb].some((x) => x < 1e3 || x > 1e6)) warnings.push('oa_rRange');
  return { ok: true, kind: 'gain', gbw, rf, rb, pair, kTarget, ...st, ...cl, warnings, vars };
}

function computeFilter(v, gbw) {
  const q = RESPONSES[v.resp] ?? RESPONSES.butter;
  const d = v.circ === 'skhp'
    ? sallenKeyHighPass({ fc: v.fc, q, c: v.cap, resSeries: v.rser })
    : sallenKeyLowPass({ fc: v.fc, q, c2: v.cap, capSeries: v.cser, resSeries: v.rser });
  const devDb = dB(sallenKeyMag(d.fc, d, gbw)) - dB(sallenKeyMag(d.fc, d, Infinity));
  // High-pass: the follower's bandwidth turns it into a band-pass; find the upper −3 dB point.
  let fUpper = NaN;
  if (d.kind === 'hp' && Number.isFinite(gbw)) {
    for (let i = 0; i <= 400; i++) {
      const f = d.fc * 2 * (gbw * 100 / (d.fc * 2)) ** (i / 400);
      if (sallenKeyMag(f, d, gbw) < Math.SQRT1_2) { fUpper = f; break; }
    }
  }
  const warnings = [];
  const vars = { oa_gbwFilter: { d: dbTxt(devDb) }, oa_hpTop: { f: si(fUpper, 'Hz', 3) } };
  if (Math.abs(devDb) > 0.5) warnings.push('oa_gbwFilter');
  if (Number.isFinite(fUpper) && fUpper < 100 * d.fc) warnings.push('oa_hpTop');
  if ([d.r1, d.r2].some((x) => x < 1e3 || x > 1e6)) warnings.push('oa_rRange');
  if (Math.min(d.c1, d.c2) < 100e-12) warnings.push('oa_cSmall');
  return { ok: true, kind: 'filter', gbw, d, q, devDb, fUpper, errPct: ((d.fc - v.fc) / v.fc) * 100, warnings, vars };
}

// Values as they appear inside the calculation steps.
const qV = (x) => tx(si(x, 'V'));
const qR = (x) => tx(si(x, 'Ω'));
const qHz = (x) => tx(si(x, 'Hz'));
const qC = (x) => tx(si(x, 'F'));
const SYM = { inv: ['R_{f}', 'R_{in}'], noninv: ['R_{f}', 'R_{g}'], diff: ['R_{2}', 'R_{1}'] };

/** Steps of a gain stage: (design: ratio and pair,) gain, bandwidth, output range and the optional limits. */
function workedGain(r, v) {
  const des = v.calc === 'des';
  const [RF, RB] = SYM[v.circ];
  const ratio = `\\frac{${RF}}{${RB}}`;
  const ratioNum = `\\frac{${qR(r.rf)}}{${qR(r.rb)}}`;
  const gainSym = { inv: `G = −${ratio}`, noninv: `G = 1 + ${ratio}`, diff: `G = ${ratio}` }[v.circ];
  const gainNum = { inv: `−${ratioNum}`, noninv: `1 + ${ratioNum}`, diff: ratioNum }[v.circ];
  const G = tx(fmt(r.gain, 4));
  const k = des ? tx(fmt(r.kTarget, 5)) : '';
  const lo = Math.min(v.vinLo, v.vinHi);
  const hi = Math.max(v.vinLo, v.vinHi);
  // The engine sorts the two products; with a negative gain the smallest input gives the largest output.
  const outOf = (vin, vout, sub) => ({ label: 'oa_out', sym: `V_{out} = G \\cdot V_{in,${sub}}`, num: `${G} \\cdot ${vin < 0 ? `(${qV(vin)})` : qV(vin)}`, res: qV(vout) });
  const hasSr = Number.isFinite(r.fpbw);
  const hasF = Number.isFinite(r.gainErrPct);
  return steps([
    des && (v.circ === 'noninv'
      ? { label: 'oa_stepRatio', sym: `k = ${ratio} = G_{t} − 1`, num: `${tx(fmt(v.g, 5))} − 1`, res: k }
      : { label: 'oa_stepRatio', sym: `k = ${ratio} = |G_{t}|`, res: k }),
    des && { label: RF_LABEL[v.circ], sym: `${RF} = k \\cdot ${RB}`, num: `${k} \\cdot ${qR(r.rb)}`, res: qR(r.pair.rfExact), note: 'oa_stepPair' },
    { label: des ? 'oa_gainGot' : 'oa_gain', sym: gainSym, num: gainNum, res: tx(`${fmt(r.gain, 4)} V/V`) },
    { label: 'oa_bw', sym: `NG = 1 + ${ratio}, \\quad BW = \\frac{GBW}{NG}`, num: `\\frac{${qHz(r.gbw)}}{${tx(fmt(r.noiseGain, 4))}}`, res: qHz(r.bw) },
    outOf(lo, r.gain < 0 ? r.outHi : r.outLo, 'min'),
    outOf(hi, r.gain < 0 ? r.outLo : r.outHi, 'max'),
    hasSr && { label: 'oa_fpbw', sym: 'V_{p} = \\frac{V_{out,max} − V_{out,min}}{2}, \\quad f_{FP} = \\frac{SR}{2π \\cdot V_{p}}',
      num: `\\frac{${tx(`${fmt(v.slew)} V/µs`)}}{2π \\cdot ${qV(r.amp)}}`, res: qHz(r.fpbw) },
    hasF && { label: 'oa_gainErr', sym: 'ε = \\frac{1}{\\sqrt{1 + (f / BW)^{2}}} − 1',
      num: `\\frac{1}{\\sqrt{1 + {(\\frac{${qHz(v.fsig)}}{${qHz(r.bw)}})}^{2}}} − 1`, res: tx(signedPct(r.gainErrPct)) },
  ], {
    note: 'oa_noteGain',
    where: [!des && [RF, RF_LABEL[v.circ], 'rf'], !des && [RB, RB_LABEL[v.circ], 'rb'], des && ['G_{t}', v.circ === 'inv' ? 'oa_gInv' : 'oa_g', 'g'],
      ['GBW', 'oa_gbw', 'gbw'], ['V_{in,min}', 'oa_vinLo', 'vinLo'], ['V_{in,max}', 'oa_vinHi', 'vinHi'],
      hasSr && ['SR', 'oa_slew', 'slew'], hasF && ['f', 'oa_fsig', 'fsig']],
    refs: ['ADI MT-033, Voltage Feedback Op Amp Gain and Bandwidth', 'TI SLOD006, Op Amps for Everyone (Mancini, ed.), ch. 3–4', 'Horowitz & Hill, The Art of Electronics, 3rd ed., ch. 4'],
  });
}

/**
 * Steps of a Sallen-Key section, in the order of the design functions: pole
 * frequency for the wanted −3 dB point, component values, then f0, Q and fc
 * again with the standard values (marked with a prime).
 */
function workedFilter(r, v) {
  const d = r.d;
  const lp = d.kind === 'lp';
  const n4 = (x) => fmt(x, 4);
  const xDef = 'p = 2 − \\frac{1}{Q^{2}}, \\quad x = \\sqrt{\\frac{p + \\sqrt{p^{2} + 4}}{2}}, \\quad ';
  const w0 = `2π \\cdot ${qHz(d.f0Target)}`;
  const rc = `\\sqrt{${qR(d.r1)} \\cdot ${qR(d.r2)} \\cdot ${qC(d.c1)} \\cdot ${qC(d.c2)}}`;
  let design;
  if (lp) {
    // R1 + R2 and R1 · R2 in one prefix, with enough digits for the difference under the root.
    const [scale, unit] = d.sumR >= 999950 ? [1e6, 'MΩ'] : d.sumR >= 999.95 ? [1e3, 'kΩ'] : [1, 'Ω'];
    const a = tx(`${fmt(d.sumR / scale, 6)} ${unit}`);
    const b = tx(`${fmt(d.prodR / scale ** 2, 6)} ${unit}²`);
    // C1 = 4Q²·C2 exactly gives a double root: a² − 4b is zero (the engine clamps the rounding noise to zero).
    const doubleRoot = d.r1Exact - d.r2Exact <= 1e-5 * d.sumR;
    design = [
      { label: 'oa_stepF0t', sym: `${xDef}f_{0} = \\frac{f_{c}}{x}`, num: `\\frac{${qHz(v.fc)}}{${n4(d.ratio)}}`, res: qHz(d.f0Target) },
      { labelRaw: 'C1', sym: 'C_{1} \\ge 4 Q^{2} \\cdot C_{2}', num: `4 \\cdot ${n4(r.q)}^{2} \\cdot ${qC(d.c2)}`, res: qC(d.c1Min), note: 'oa_stepC1' },
      { label: 'oa_stepSum', sym: 'a = R_{1} + R_{2} = \\frac{1}{2π f_{0} \\cdot Q \\cdot C_{2}}', num: `\\frac{1}{${w0} \\cdot ${n4(r.q)} \\cdot ${qC(d.c2)}}`, res: a },
      { label: 'oa_stepProd', sym: 'b = R_{1} \\cdot R_{2} = \\frac{1}{(2π f_{0})^{2} \\cdot C_{1} \\cdot C_{2}}', num: `\\frac{1}{{(${w0})}^{2} \\cdot ${qC(d.c1)} \\cdot ${qC(d.c2)}}`, res: b },
      { labelRaw: 'R1, R2', sym: 'R_{1,2} = \\frac{a \\pm \\sqrt{a^{2} − 4 b}}{2}',
        num: doubleRoot ? `\\frac{${a} \\pm \\sqrt{0}}{2}` : `\\frac{${a} \\pm \\sqrt{{(${a})}^{2} − 4 \\cdot ${b}}}{2}`,
        res: `${qR(d.r1Exact)}, \\quad ${qR(d.r2Exact)}`, note: doubleRoot ? 'oa_stepRoundDouble' : 'oa_stepRound' },
    ];
  } else {
    design = [
      { label: 'oa_stepF0t', sym: `${xDef}f_{0} = f_{c} \\cdot x`, num: `${qHz(v.fc)} \\cdot ${n4(d.ratio)}`, res: qHz(d.f0Target) },
      { labelRaw: 'R1', sym: 'R_{1} = \\frac{1}{2 Q \\cdot 2π f_{0} \\cdot C}', num: `\\frac{1}{2 \\cdot ${n4(r.q)} \\cdot ${w0} \\cdot ${qC(d.c1)}}`, res: qR(d.r1Exact) },
      { labelRaw: 'R2', sym: 'R_{2} = \\frac{2 Q}{2π f_{0} \\cdot C}', num: `\\frac{2 \\cdot ${n4(r.q)}}{${w0} \\cdot ${qC(d.c1)}}`, res: qR(d.r2Exact), note: 'oa_stepRound' },
    ];
  }
  return steps([
    ...design,
    { label: 'oa_f0', sym: 'f_{0}′ = \\frac{1}{2π \\sqrt{R_{1} R_{2} C_{1} C_{2}}}', num: `\\frac{1}{2π \\cdot ${rc}}`, res: qHz(d.f0) },
    { label: 'oa_qGot', sym: lp ? 'Q′ = \\frac{\\sqrt{R_{1} R_{2} C_{1} C_{2}}}{C_{2} \\cdot (R_{1} + R_{2})}' : 'Q′ = \\frac{\\sqrt{R_{1} R_{2} C_{1} C_{2}}}{R_{1} \\cdot (C_{1} + C_{2})}',
      num: lp ? `\\frac{${rc}}{${qC(d.c2)} \\cdot (${qR(d.r1)} + ${qR(d.r2)})}` : `\\frac{${rc}}{${qR(d.r1)} \\cdot (${qC(d.c1)} + ${qC(d.c2)})}`, res: tx(n4(d.q)) },
    { label: 'oa_fcGot', sym: lp ? 'f_{c}′ = f_{0}′ \\cdot x(Q′)' : 'f_{c}′ = \\frac{f_{0}′}{x(Q′)}',
      num: lp ? `${qHz(d.f0)} \\cdot ${n4(d.ratioGot)}` : `\\frac{${qHz(d.f0)}}{${n4(d.ratioGot)}}`, res: qHz(d.fc) },
  ], {
    note: 'oa_noteFilter',
    where: [['f_{c}', 'oa_fc', 'fc'], ['Q', 'oa_resp', 'resp'], lp ? ['C_{2}', 'oa_cLp', 'cap'] : ['C', 'oa_cHp', 'cap']],
    refs: [
      'TI SLOA024B, Analysis of the Sallen-Key Architecture (Karki)',
      'TI SLOD006, Op Amps for Everyone, ch. 16 Active Filter Design Techniques (Kugelstadt)',
      'TI SLOA049D, Active Low-Pass Filter Design (component selection)',
      'IEC 60063:2015 (E-series)',
    ],
  });
}

function renderGain(r, v) {
  const des = v.calc === 'des';
  const gTxt = `${fmt(r.gain, 4)} <span class="u">V/V</span>`;
  const clip = r.clipLo || r.clipHi;
  const out = `${esc(si(r.outLo, 'V', 3))} … ${esc(si(r.outHi, 'V', 3))}`;
  const outHero = ['oa_out', out, esc(t(clip ? 'oa_outClip' : 'oa_outOk'))];
  const target = v.circ === 'inv' ? -v.g : v.g;
  const top = des
    ? heroes([
      [RF_LABEL[v.circ], siHtml(r.rf, 'Ω'), esc(v.ser)],
      [RB_LABEL[v.circ], siHtml(r.rb, 'Ω'), esc(v.ser)],
      ['oa_gainGot', gTxt, esc(t('oa_err', { e: signedPct(((r.gain - target) / target) * 100) }))],
    ])
    : heroes([
      ['oa_gain', gTxt, `${esc(fmt(dB(Math.abs(r.gain)), 3))} dB`],
      ['oa_bw', siHtml(r.bw, 'Hz'), esc(t('oa_bwSub', { ng: fmt(r.noiseGain, 3) }))],
      outHero,
    ]);
  const zin = v.circ === 'inv' ? si(r.rb, 'Ω')
    : v.circ === 'diff' ? esc(t('oa_zinDiff', { a: si(r.rb, 'Ω', 3), b: si(r.rb + r.rf, 'Ω', 3) }))
      : esc(t('oa_zinHigh'));
  return top
    + messages('warn', r.warnings, r.vars)
    + workedGain(r, v)
    + block('oa_detailsTitle', rows([
      [RF_LABEL[v.circ], si(r.rf, 'Ω')],
      [RB_LABEL[v.circ], si(r.rb, 'Ω')],
      ['oa_gain', `${fmt(r.gain, 4)} V/V`, true],
      ['oa_gainDb', `${fmt(dB(Math.abs(r.gain)), 3)} dB`],
      ['oa_ng', fmt(r.noiseGain, 4)],
      ['oa_bw', si(r.bw, 'Hz'), des],
      ['oa_zin', zin],
      ['oa_out', out, des],
      ['oa_swing', `${esc(si(r.swingLo, 'V', 3))} … ${esc(si(r.swingHi, 'V', 3))}`],
      Number.isFinite(r.fpbw) && ['oa_fpbw', si(r.fpbw, 'Hz')],
      Number.isFinite(r.gainErrPct) && ['oa_gainErr', signedPct(r.gainErrPct)],
    ]) + (v.circ === 'diff' ? `<p class="note">${esc(t('oa_diffInfo'))}</p>` : ''));
}

function renderFilter(r, v) {
  const d = r.d;
  const lp = d.kind === 'lp';
  const exact = (x, unit) => esc(t('oa_exact', { x: si(x, unit, 4) }));
  return heroes([
    ['oa_fcGot', siHtml(d.fc, 'Hz'), `${esc(t('oa_target', { x: si(v.fc, 'Hz', 3) }))} · ${signedPct(r.errPct)}`],
    ['oa_qGot', `${fmt(d.q, 3)}`, esc(t('oa_target', { x: fmt(r.q, 4) }))],
  ])
    + messages('warn', r.warnings, r.vars)
    + workedFilter(r, v)
    + block('oa_compTitle', rows([
      ['R1', `${si(d.r1, 'Ω')} · ${exact(d.r1Exact, 'Ω')}`, true, true],
      ['R2', `${si(d.r2, 'Ω')} · ${exact(d.r2Exact, 'Ω')}`, true, true],
      ['C1', lp ? `${si(d.c1, 'F')} · ≥ 4Q²·C2 = ${si(4 * r.q * r.q * d.c2, 'F', 3)}` : si(d.c1, 'F'), true, true],
      ['C2', si(d.c2, 'F'), true, true],
    ]))
    + block('oa_detailsTitle', rows([
      ['oa_f0', si(d.f0, 'Hz')],
      ['oa_ratio', fmt(d.fc / d.f0, 4)],
      ['oa_gbwRatio', fmt(r.gbw / d.f0, 3)],
      ['oa_gbwDev', dbTxt(r.devDb)],
      Number.isFinite(r.fUpper) && ['oa_upper', si(r.fUpper, 'Hz', 3)],
    ]));
}

export default {
  diagram,
  id: 'opamp',
  strings,
  sections: [
    {
      title: 'sectionSetup',
      fields: [
        { key: 'circ', type: 'select', label: 'oa_circ', default: 'noninv',
          options: [
            { value: 'inv', label: 'oa_inv', set: { vpos: 5, vneg: -5, vinLo: -0.2, vinHi: 0.2 } },
            { value: 'noninv', label: 'oa_noninv', set: { vpos: 5, vneg: 0, vinLo: 0.05, vinHi: 0.3 } },
            { value: 'diff', label: 'oa_diff', set: { vpos: 5, vneg: 0, vinLo: 0, vinHi: 0.2 } },
            { value: 'sklp', label: 'oa_sklp' },
            { value: 'skhp', label: 'oa_skhp' },
          ] },
        { key: 'calc', type: 'choice', label: 'oa_calc', default: 'ana', show: isGain,
          options: [{ value: 'ana', label: 'oa_ana' }, { value: 'des', label: 'oa_des' }] },
      ],
    },
    {
      title: 'oa_resTitle',
      show: isGain,
      fields: [
        { key: 'rf', type: 'number', label: (v) => RF_LABEL[v.circ] ?? 'oa_rf', default: '100k', units: ['ohm'], si: true, show: isAna },
        { key: 'rb', type: 'number', label: (v) => RB_LABEL[v.circ] ?? 'oa_rg', default: '10k', units: ['ohm'], si: true, show: isAna },
        { key: 'g', type: 'number', label: (v) => (v.circ === 'inv' ? 'oa_gInv' : 'oa_g'), default: 10, units: ['V/V'], show: isDes, max: 1e6,
          presets: [2, 5, 10, 20, 100].map((x) => ({ label: String(x), value: x })) },
        { key: 'rbase', type: 'number', label: 'oa_rbase', default: '10k', units: ['ohm'], si: true, info: 'oa_rbaseInfo', show: isDes },
        { key: 'ser', type: 'select', label: 'oa_series', default: 'E24', options: SERIES(['E12', 'E24', 'E96']), show: isDes },
      ],
    },
    {
      title: 'oa_filtTitle',
      show: isFilter,
      fields: [
        { key: 'resp', type: 'select', label: 'oa_resp', default: 'butter', options: RESP_OPTS, info: 'oa_respInfo' },
        { key: 'fc', type: 'number', label: 'oa_fc', default: '1k', units: ['Hz'], si: true,
          presets: [['100 Hz', '100'], ['1 kHz', '1k'], ['10 kHz', '10k'], ['100 kHz', '100k']].map(([label, value]) => ({ label, value })) },
        { key: 'cap', type: 'number', label: (v) => (v.circ === 'skhp' ? 'oa_cHp' : 'oa_cLp'), default: '10n', units: ['farad'], si: true, info: 'oa_cInfo' },
        { key: 'cser', type: 'select', label: 'oa_cser', default: 'E12', options: SERIES(['E6', 'E12', 'E24']), show: (v) => v.circ === 'sklp' },
        { key: 'rser', type: 'select', label: 'oa_rser', default: 'E24', options: SERIES(['E24', 'E96']) },
      ],
    },
    {
      title: 'oa_ampTitle',
      fields: [
        { key: 'gbw', type: 'number', label: 'oa_gbw', default: 1, units: ['MHz', 'kHz'], info: 'oa_gbwInfo',
          presets: [['1 MHz', 1], ['10 MHz', 10], ['100 MHz', 100]].map(([label, value]) => ({ label, value, unit: 'MHz' })) },
        { key: 'vpos', type: 'number', label: 'oa_vpos', default: 5, units: ['V'], valid: 'any', show: isGain },
        { key: 'vneg', type: 'number', label: 'oa_vneg', default: 0, units: ['V'], valid: 'any', info: 'oa_vnegInfo', show: isGain },
        { key: 'hd', type: 'number', label: 'oa_hd', default: 0.1, units: ['V'], valid: 'nonneg', info: 'oa_hdInfo', show: isGain,
          presets: [0.05, 0.1, 1.5].map((x) => ({ label: `${x} V`, value: x })) },
        { key: 'slew', type: 'number', label: 'oa_slew', default: '', units: ['V/µs'], optional: true, show: isGain },
      ],
    },
    {
      title: 'oa_sigTitle',
      show: isGain,
      fields: [
        { key: 'vinLo', type: 'number', label: 'oa_vinLo', default: 0.05, units: ['V'], valid: 'any', info: 'oa_vinInfo' },
        { key: 'vinHi', type: 'number', label: 'oa_vinHi', default: 0.3, units: ['V'], valid: 'any' },
        { key: 'fsig', type: 'number', label: 'oa_fsig', default: '', units: ['Hz'], si: true, optional: true },
      ],
    },
  ],

  compute(v, u) {
    const gbw = v.gbw * (SCALE[u.gbw] ?? 1e6);
    return isGain(v) ? computeGain(v, gbw) : computeFilter(v, gbw);
  },

  render(r, v) {
    if (!r.ok) return invalid(r.errors);
    return r.kind === 'gain' ? renderGain(r, v) : renderFilter(r, v);
  },
};
