import { figureFrom } from '../figures.js';
import { text, rect, circle, path, polygon, callout, axes, wave } from '../../ui/svg.js';

const S = {
  tr: {
    hdiCap: '1+4+1 yapısında bir HDI kartın kesiti (ölçeksiz). Dört katmanlı çekirdeğin iki yüzüne birer ek katman preslenmiştir. Mikrovia yalnızca komşu katmana iner, gömülü via çekirdeğin içinde kalır, delik geçişli via bütün katmanlarda yer kaplar. Kaydırılmış çiftte mikrovia, L2’deki kısa bir izle gömülü viaya bağlanır; sinyal aynı yolla L6’ya kadar iner.',
    thru: 'delik geçişli via',
    micro: 'mikrovia',
    stag: 'kaydırılmış çift',
    buried: 'gömülü via',
    build: 'build-up',
    core: 'çekirdek',
    flexCap: 'Esnek bir kuyruğun bükülme bölgesi, üstten görünüş (ölçeksiz); kesikli çizgi bükülme eksenidir. Üstte: izler ekseni dik ve düz geçer, vialar bölgenin dışındadır, yön değişimi yuvarlaktır ve düzlem bölgenin içinde taralıdır. Altta: bükülmenin içinde via, keskin köşe ve dolu bakır düzlem; üçünde de gerilme bir noktada toplanır ve bakır çatlar.',
    ok: '✓ iyi',
    no: '✗ kötü',
    gVia: 'via dışarıda',
    gPerp: 'dik geçiş',
    gCurve: 'yuvarlak dönüş',
    gHatch: 'taralı düzlem',
    zone: 'bükülme bölgesi',
    bVia: 'bükülmede via',
    bCorner: 'keskin köşe',
    bSolid: 'dolu düzlem',
    dcCap: 'Aynı anma değerinde ve aynı anma geriliminde, sınıf 2 dielektrikli iki seramik kondansatörün DC gerilim altındaki etkin kapasitesi (nitel çizim, eksenlerde sayı yoktur; gerçek eğri üreticinin veri sayfasındadır). Aynı çalışma geriliminde küçük kılıf çok daha fazla kapasite kaybeder.',
    cap: 'etkin kapasite',
    nom: 'şemadaki değer',
    large: 'büyük kılıf',
    small: 'küçük kılıf',
    vop: 'çalışma gerilimi',
    vr: 'anma gerilimi',
    vax: 'kondansatör üzerindeki DC gerilim',
    crCap: 'Solda yandan görünüş: hava aralığı havadan geçen, kaçak mesafesi yalıtkanın yüzeyini izleyen en kısa yoldur; düz kartta ikisi eşittir. Sağda üstten görünüş: iki padin arasına frezelenmiş oluk yüzey yolunu keser; kaçak yolu oluğun ucundan dolaşır ve uzar, hava aralığı ise oluğun içinden düz geçer ve değişmez.',
    side: 'yandan görünüş',
    top: 'üstten görünüş, oluklu',
    flat: 'düz kart: iki yol eşit',
    slot: 'oluk',
    clr: 'hava aralığı',
    crp: 'kaçak mesafesi',
  },
  en: {
    hdiCap: 'Cross-section of an HDI board with a 1+4+1 build-up (not to scale). One build-up layer is laminated onto each side of a four-layer core. A microvia goes down to the next layer only, a buried via stays inside the core, a through via takes space on every layer. In the staggered pair the microvia is joined to the buried via by a short trace on L2; the signal goes on down to L6 the same way.',
    thru: 'through via',
    micro: 'microvia',
    stag: 'staggered pair',
    buried: 'buried via',
    build: 'build-up',
    core: 'core',
    flexCap: 'The bend area of a flex tail, top view (not to scale); the dashed line is the bend axis. Top: the traces cross the axis straight and at right angles, the vias are outside the area, the change of direction is curved and the plane is hatched inside the area. Bottom: a via, a sharp corner and a solid copper plane inside the bend; in all three the stress concentrates at one point and the copper cracks.',
    ok: '✓ good',
    no: '✗ bad',
    gVia: 'via outside',
    gPerp: '90° crossing',
    gCurve: 'curved jog',
    gHatch: 'hatched plane',
    zone: 'bend area',
    bVia: 'via in bend',
    bCorner: 'sharp corner',
    bSolid: 'solid plane',
    dcCap: 'Effective capacitance under DC bias of two ceramic capacitors with a class 2 dielectric, the same nominal value and the same rated voltage (qualitative sketch, no numbers on the axes; the real curve is in the manufacturer’s datasheet). At the same operating voltage the small package loses far more capacitance.',
    cap: 'effective capacitance',
    nom: 'value on the schematic',
    large: 'large package',
    small: 'small package',
    vop: 'operating voltage',
    vr: 'rated voltage',
    vax: 'DC voltage across the capacitor',
    crCap: 'Left, side view: clearance is the shortest path through air, creepage the shortest path along the surface of the insulation; on a flat board the two are equal. Right, top view: a slot milled between two pads cuts the surface path; the creepage path has to go round the end of the slot and gets longer, while the clearance runs straight through the slot and does not change.',
    side: 'side view',
    top: 'top view with a slot',
    flat: 'flat board: equal paths',
    slot: 'slot',
    clr: 'clearance',
    crp: 'creepage',
  },
};

/** Cross-section of a 1+4+1 build-up: through via, microvia, staggered microvia + buried via. */
function hdi(lang) {
  const s = S[lang] ?? S.en;
  const tops = [44, 62, 84, 110, 132, 150]; // top edge of each copper layer (4 thick)
  const pad = (x, y, w = 26) => rect(x - w / 2, y, w, 4, 'cu');
  // Copper-filled microvia: from L1 down to L2, or (up) from L6 up to L5.
  const micro = (x, up) => (up
    ? polygon([[x - 9, 154], [x + 9, 154], [x + 5, 136], [x - 5, 136]], 'cu') + pad(x, 150) + pad(x, 132, 22)
    : polygon([[x - 9, 44], [x + 9, 44], [x + 5, 62], [x - 5, 62]], 'cu') + pad(x, 44) + pad(x, 62, 22));
  // Laminate, with the two build-up dielectrics tinted.
  let b = rect(40, 46, 260, 106, 'diel') + rect(40, 48, 260, 14, 'zone') + rect(40, 136, 260, 14, 'zone');
  tops.forEach((y, i) => {
    b += rect(40, y, 260, 4, 'cu plane') + text(34, y + 6, `L${i + 1}`, { anchor: 'end' });
  });
  // Through via: an open plated hole from L1 to L6.
  b += pad(58, 44) + pad(58, 150) + rect(50, 44, 16, 110, 'cu') + rect(53, 44, 10, 110, 'hole');
  // A single microvia.
  b += micro(92, false);
  // Staggered pair: microvia, short trace on L2, buried via (filled and capped), trace on L5, microvia.
  b += micro(160, false) + rect(149, 62, 64, 4, 'cu')
    + rect(192, 62, 16, 74, 'cu') + rect(195, 66, 10, 66, 'soft')
    + rect(187, 132, 64, 4, 'cu') + micro(240, true);
  // Names of the vias.
  b += callout(92, 43, 100, 28, s.micro, { anchor: 'end' })
    + path('M147,41v-4h66v4', 'dimline') + text(180, 30, s.stag)
    + callout(58, 156, 40, 180, s.thru, { anchor: 'start' })
    + callout(200, 112, 208, 180, s.buried, { anchor: 'start' });
  // 1 + 4 + 1.
  b += path('M303,44h4v18h-4M303,63h4v72h-4M303,136h4v18h-4', 'dimline')
    + text(318, 58, '1', { cls: 'name' }) + text(328, 58, s.build, { anchor: 'start' })
    + text(318, 104, '4', { cls: 'name' }) + text(328, 104, s.core, { anchor: 'start' })
    + text(318, 150, '1', { cls: 'name' }) + text(328, 150, s.build, { anchor: 'start' });
  return figureFrom(420, 194, s.hdiCap, b);
}

/** Copper of one flex tail (top view) whose outline starts at y0: three traces, two vias, a plane lane. */
function tail(y0, bad) {
  const trace = (d) => `<path class="cutr" style="stroke-width:3" d="${d}"/>`;
  const via = (x, y) => circle(x, y, 5.5, 'cu') + circle(x, y, 2.2, 'hole');
  const top = y0 + 46;
  const bot = y0 + 66;
  let b = trace(`M36,${y0 + 10}H384`) + trace(`M36,${y0 + 20}H384`);
  if (bad) {
    // Sharp jog and two vias inside the bend area, solid plane.
    b += trace(`M36,${y0 + 30}H232V${y0 + 40}H384`)
      + via(236, y0 + 10) + via(200, y0 + 20)
      + rect(36, top, 348, 20, 'cu')
      + circle(236, y0 + 10, 9, 'wire bad') + circle(200, y0 + 20, 9, 'wire bad')
      + rect(223, y0 + 24, 18, 19, 'wire bad', ' rx="3"')
      + rect(183, y0 + 44, 74, 24, 'wire bad', ' rx="3"');
  } else {
    // Curved jog and vias outside the bend area, plane hatched inside it.
    let hatch = `M180,${top}H260M180,${bot}H260`;
    for (let x = 180; x <= 240; x += 10) hatch += `M${x},${top}L${x + 20},${bot}M${x + 20},${top}L${x},${bot}`;
    b += trace(`M36,${y0 + 30}H288C300,${y0 + 30} 300,${y0 + 40} 312,${y0 + 40}H384`)
      + via(110, y0 + 10) + via(140, y0 + 20)
      + rect(36, top, 144, 20, 'cu') + rect(260, top, 124, 20, 'cu')
      + `<path class="cutr" style="stroke-width:1.6" d="${hatch}"/>`;
  }
  return b;
}

/** Flex tail with a bend area, top view: good practice above, the three classic mistakes below. */
function flex(lang) {
  const s = S[lang] ?? S.en;
  const lead = (x1, y1, x2, y2) => path(`M${x1},${y1}L${x2},${y2}`, 'leader');
  let b = rect(20, 28, 380, 72, 'soft', ' rx="8"') + rect(20, 144, 380, 72, 'soft', ' rx="8"')
    + rect(180, 28, 80, 188, 'zone')
    + path('M220,28V100M220,144V216', 'dim')
    + tail(28, false) + tail(144, true);
  // Good tail.
  b += text(22, 20, s.ok, { cls: 'okt', anchor: 'start' })
    + lead(110, 32, 117, 24) + text(120, 20, s.gVia, { cls: 'okt' })
    + text(220, 20, s.gPerp, { cls: 'okt' })
    + lead(302, 58, 313, 24) + text(315, 20, s.gCurve, { cls: 'okt' })
    + callout(188, 95, 153, 114, s.gHatch, { cls: 'okt', anchor: 'end' });
  // Bend area and bad tail.
  b += text(220, 126, s.zone, { cls: 'title' })
    + text(22, 136, s.no, { cls: 'badt', anchor: 'start' })
    + callout(192, 158, 160, 136, s.bVia, { cls: 'badt', anchor: 'end' })
    + callout(241, 169, 278, 136, s.bCorner, { cls: 'badt', anchor: 'start' })
    + callout(188, 213, 153, 230, s.bSolid, { cls: 'badt', anchor: 'end' });
  return figureFrom(420, 244, s.flexCap, b);
}

/** Qualitative capacitance against DC bias for a large and a small package (no axis values). */
function dcbias(lang) {
  const s = S[lang] ?? S.en;
  const r1 = (n) => Math.round(n * 10) / 10;
  // u = bias / rated voltage; k sets how early the curve falls. y = 44 is the nominal value, y = 150 is zero.
  const yAt = (u, k) => r1(150 - 106 / (1 + (u / k) ** 2));
  const curve = (k) => Array.from({ length: 31 }, (_, i) => [50 + 10 * i, yAt(i / 30, k)]);
  const yL = yAt(0.5, 1.3);
  const yS = yAt(0.5, 0.45);
  const b = axes(50, 150, 330, 120)
    + path('M50,44H380', 'ext') + path('M350,146V154', 'axis')
    + path(`M50,${yL}H200M50,${yS}H200`, 'ext') + path('M200,44V150', 'dim')
    + wave(curve(1.3), 'wave2') + wave(curve(0.45))
    + circle(200, yL, 3, 'node') + circle(200, yS, 3, 'node')
    + text(50, 22, s.cap, { anchor: 'start' })
    + text(376, 39, s.nom, { anchor: 'end' })
    + text(378, 62, s.large, { anchor: 'end' })
    + text(262, 106, s.small, { anchor: 'start' })
    + text(200, 163, s.vop) + text(350, 163, s.vr)
    + text(215, 180, s.vax, { cls: 'title' });
  return figureFrom(420, 194, s.dcCap, b);
}

/** Clearance and creepage: side view of a flat board, and top view with a slot between the pads. */
function creepage(lang) {
  const s = S[lang] ?? S.en;
  // Side view: both paths have the same length.
  let b = text(107, 22, s.side, { cls: 'title' })
    + rect(24, 92, 166, 28, 'diel') + rect(36, 78, 42, 14, 'cu') + rect(136, 78, 42, 14, 'cu')
    + path('M78,83H136', 'flow') + path('M78,92.5H136', 'wire bad dash')
    + text(107, 140, s.flat);
  // Top view: the slot cuts the surface path, not the path through air.
  b += text(314, 22, s.top, { cls: 'title' })
    + rect(222, 34, 184, 112, 'diel') + rect(236, 70, 38, 40, 'cu') + rect(354, 70, 38, 40, 'cu')
    + rect(308, 42, 12, 78, 'hole', ' rx="6"')
    + path('M274,90H354', 'flow')
    + path('M274,110L305,122Q314,134 323,122L354,110', 'wire bad dash')
    + callout(320, 52, 334, 54, s.slot);
  // Legend.
  b += path('M70,168H94', 'flow') + text(100, 172, s.clr, { anchor: 'start' })
    + path('M236,168H260', 'wire bad dash') + text(266, 172, s.crp, { anchor: 'start' });
  return figureFrom(420, 186, s.crCap, b);
}

export default {
  figures: { hdi, flex, dcbias, creepage },
  body: {
    tr: `
## Neden bu ders?

Öğrenme yolu sıradan bir kartla bitti: dört katman, delik geçişli vialar, düşük gerilim. Bir proje er geç daha fazlasını ister: delik geçişli viayla kaçırılamayan ince adımlı bir BGA, bükülmesi gereken bir kart, gerilim altında değerinin yarısını yitirmiş bir kondansatör ya da şebekeye bağlanan bir ürün.

Bu ders bir tasarım kılavuzu değil, bir haritadır: dört alanın her biri için ne olduğunu, ne zaman gerektiğini, ilk hatayı önleyen birkaç kuralı ve bedelini anlatır. Sayılar tipik değerlerdir; bağlayıcı olan üreticinin kabiliyet tablosu, parçanın veri sayfası ve ürün standardıdır.

| Durum | Alan | İlk soru |
|---|---|---|
| BGA padlerinin arasından iz de via da geçmiyor | HDI | Üretici hangi mikrovia yapısını, hangi fiyata yapıyor? |
| Kart bükülecek ya da iki kart kablosuz birleşecek | Esnek / rigid-flex | Bir kez mi bükülecek, sürekli mi; hangi yarıçapla? |
| Devre kâğıtta doğru, kartta sınırda çalışıyor | Parça seçimi ve değer düşürme | Parça bu gerilimde ve sıcaklıkta gerçekte ne veriyor? |
| Kartta şebeke ya da başka bir tehlikeli gerilim var | Güvenlik mesafeleri | Hangi ürün standardı, hangi yalıtım türü? |

## HDI: delik geçişli via yetmediğinde

Delik geçişli via bütün katmanlarda yer kaplar ve mekanik matkapla delindiği için belli bir boyutun altına inemez ([[lesson:vias|via ve pad tasarımı]]). **HDI (high density interconnect, yüksek yoğunluklu bağlantı)** bu sınırı üç araçla aşar:

- **Mikrovia (microvia):** lazerle delinen, yalnızca bir katman inen küçük via; tipik olarak 0,1 mm civarında bir delik, 0,1 mm’den ince bir dielektriği geçer.
- **Ek katmanlar (build-up):** önce çekirdek kart preslenir, delinir ve kaplanır; sonra iki yüze birer ince katman eklenir ve mikroviaları delinir. **1+N+1**, N katmanlı çekirdeğin iki yüzünde birer ek katman demektir; 2+N+2’de ikişer tane vardır. Çekirdeğin içinde kalan vialar gömülü (buried) via olur.
- **Pad içi via (via-in-pad):** via doğrudan BGA padinin içine konur; pad düz kalsın diye doldurulur ve üzeri bakırla kapatılır.

[[fig:hdi]]

**Ne zaman gerekir?** En sık neden BGA adımıdır. 0,5 mm adımlı, 0,25 mm padli bir BGA’da padler arasında 0,25 mm boşluk kalır; 0,1 mm iz ve aralıkla tek bir iz 0,3 mm ister, yani iz geçmez. Dört bilyenin ortasına sığan en büyük via padi 0,257 mm’dir; 0,45 mm padli küçük bir delik geçişli via sığmaz.

[[calc:fanout?p=0.5&p_u=mm&d=0.25&d_u=mm&w=0.1&w_u=mm&s=0.1&s_u=mm&v=0.45&v_u=mm|0,5 mm BGA: iz ve via sığıyor mu?]]

Viayı küçültmek de çözmez: 0,257 mm’lik pade, çevresinde halka kalacaksa, en çok 0,1 mm civarında bir delik sığar. 1,6 mm kartta bu 16:1 en-boy oranıdır; tipik 8:1–10:1 sınırının çok üstündedir.

[[calc:via?d=0.1&d_u=mm&L=1.6&L_u=mm&I=0.5&I_u=A|1,6 mm kartta 0,1 mm delik]]

Mikrovia bu düğümü çözer: padin içine oturur, bir katman iner ve iz iç katmanda devam eder.

**İlk kurallar**

- **En-boy oranı:** mikroviada derinliğin çapa oranı tipik olarak 1:1’in, tercihen 0,8:1’in altında tutulur; daha derin kör delikte kaplama banyosu dibe ulaşamaz.
- **Kaydırılmış (staggered), üst üste (stacked) olandan iyidir:** üst üste binen mikroviaların alttakinin bakırla doldurulması gerekir ve aradaki birleşim lehimleme ısısında çatlamaya en yatkın yerdir. Kaydırılmış dizilim biraz yer harcar, ama daha ucuz ve daha güvenilirdir.
- **Her ek katman bir pres çevrimidir:** yeniden pres, delme ve kaplama demektir; fiyat ve teslim süresi her adımda artar.

> [!TIP] Yerleşimden önce üreticiyle konuşun: katman yapısını, mikrovia ve pad çaplarını, iz ve aralık sınırını üretici verir ve bunlar üreticiden üreticiye değişir ([[lesson:stackup|katman yığını]]). Genel çerçeve IPC-2226’dadır.

> [!QUIZ] 0,4 mm adımlı bir BGA’nın padleri 0,2 mm; üretici 0,075 mm iz ve aralık yapabiliyor. Padler arasından iz geçer mi? Dört bilyenin ortasına bir mikrovia padi sığar mı?
> Boşluk 0,4 − 0,2 = 0,2 mm’dir; tek iz 0,075 + 2 × 0,075 = 0,225 mm ister, geçmez. Dört bilyenin ortasına sığan en büyük pad √2 × 0,4 − 0,2 − 2 × 0,075 = 0,216 mm’dir; tipik bir mikrovia padi (0,25–0,3 mm) buraya da sığmaz. Geriye pad içi mikrovia kalır: her bilye doğrudan alttaki katmana iner.

## Esnek ve rigid-flex kartlar

**Esnek kart (flex)**, FR-4 yerine ince bir poliimid film üzerine kurulur; **rigid-flex** aynı esnek katmanları sert kart bölümlerinin içinden geçirir ve aradaki konnektörleri kaldırır. Tekrarlı bükülmede, yorulmaya daha dayanıklı olan haddelenmiş ve tavlanmış (rolled-annealed, RA) bakır kullanılır. Lehim maskesinin yerini yapıştırıcılı bir poliimid film olan **coverlay** alır; açıklıkları maske kadar ince işlenemez. Konnektörlerin ve parçaların altına bir **sertleştirici (stiffener)** yapıştırılır: lehim bağlantılarını bükülmeden korur ve ZIF konnektöre giren ucu konnektörün istediği kalınlığa getirir.

[[fig:flex]]

**İlk kurallar ve nedenleri**

- **Bükülme yarıçapı kalınlığın katıdır:** bükülen bakırın dış yüzü uzar; yarıçap küçüldükçe ve kart kalınlaştıkça uzama artar. Tipik değerler: bir kez bükülüp yerinde kalan (statik), bir ya da iki bakır katmanlı kartta kalınlığın yaklaşık 6–10 katı, çok katmanlıda 20 katı ve üzeri; sürekli hareket eden (dinamik) kartta 100 katı ve üzeri, tek bakır katmanla. Kesin değeri IPC-2223 ve üretici verir.
- **İzler bükülme eksenini dik ve düz geçer:** eğik giden ya da bölgenin içinde yön ve genişlik değiştiren izde gerilme bir noktada toplanır.
- **Bükülme bölgesinde via, pad ve parça olmaz:** kaplanmış delik ve lehim bağlantısı bükülmez, çatlar.
- **Köşeler yuvarlak, padler damlalı ve tutturmalı:** keskin köşe çatlağın başladığı yerdir. Poliimide zayıf tutunan pad lehimlemede kalkabilir; damla (teardrop) ve coverlay’in altında kalan tutturma uzantıları (anchor) onu yerinde tutar.
- **Dolu yerine taralı düzlem:** dolu bakır kartı sertleştirir ve bükülünce çatlamaya yatkındır; taralı (hatched) düzlem esnekliği korur, ama iz empedansını değiştirir.
- **İki yüzdeki izler üst üste gelmez:** tam üst üste binen izler bir I profili gibi kesiti sertleştirir ve dıştaki bakırı daha çok zorlar; izleri kaydırın.
- **İç köşelerde yırtılma önlemi:** poliimid bir çentikten kolayca yırtılır; dış hattın iç köşelerini yuvarlatın.

> [!QUIZ] İki bakır katmanlı esnek bir kuyruğun kalınlığı 0,2 mm. Kutuda 1 mm iç yarıçapla bir kez bükülüp yerinde kalacak. Uygun mu? Aynı kuyruk bir menteşede sürekli açılıp kapansaydı?
> Statik bükülme için tipik kural kalınlığın yaklaşık 10 katıdır: 10 × 0,2 = 2 mm. 1 mm fazla dardır; yarıçapı büyütün ya da kuyruğu inceltin. Dinamik bükülmede tipik kural 100 kat ve üzeridir: 100 × 0,2 = 20 mm. Bu çoğu menteşeye sığmaz; bükülen bölgeyi tek bakır katmana indirip inceltmek gerekir (0,1 mm kalınlıkta 10 mm).

## Parça seçimi ve değer düşürme

Şemadaki değer, devredeki değer değildir: veri sayfasının ilk sayfasındaki sayı tek bir koşulda ölçülmüştür.

**Seramik kondansatörler.** X5R ve X7R gibi sınıf 2 dielektrikler, üzerlerindeki DC gerilim (DC bias) arttıkça kapasite kaybeder. Aynı değerde ve anma geriliminde kılıf küçüldükçe kayıp büyür; anma geriliminin yarısında kapasitenin yarısından fazlası gitmiş olabilir. "X7R" kodu yalnızca sıcaklık davranışını söyler; gerilim etkisi için üreticinin DC bias eğrisine bakılır. Buna tolerans, sıcaklık ve yaşlanma eklenir. C0G/NP0 gibi sınıf 1 dielektrikler bu etkileri neredeyse hiç göstermez, ama büyük değerlerde bulunmaz.

[[fig:dcbias]]

**Öteki parçalar**

- **Tantal ve elektrolitik:** klasik (MnO₂) tantal kondansatör aşırı gerilimde ve ani akımda kısa devre olarak arızalanır; geniş gerilim payı ister. Alüminyum elektrolitiğin ömrünü sıcaklık ve dalgalanma (ripple) akımı belirler; kaba kural, sıcaklık her 10 °C düştüğünde ömrün iki katına çıkmasıdır.
- **Dirençler:** anma gücü çoğu zaman 70 °C ortama kadar geçerlidir, üstünde veri sayfasındaki eğriyle düşer. Kısa ama yüksek darbeler, ortalama güç küçükken bile direnci yakabilir.
- **Yarı iletkenler:** sınır jonksiyon sıcaklığıdır ([[lesson:thermal|termal tasarım]]); doğrusal bölgede çalışan bir MOSFET’te güvenli çalışma alanı (SOA) eğrisi de aşılmamalıdır.
- **Konnektörler:** pin başına akım çoğu zaman tek pin için verilir; yan yana birçok pin akım taşıyorsa pin başına izin verilen akım düşer.

**Değer düşürme (derating)**, parçayı anma sınırlarının altında çalıştırmaktır: ömür uzar, toleranslar ve beklenmedik koşullar için pay kalır. Aşağıdakiler tipik şirket uygulamalarıdır, standart değildir:

| Parça | Tipik kural |
|---|---|
| Seramik ve alüminyum elektrolitik kondansatör | Çalışma gerilimi anma değerinin en çok %80’i |
| MnO₂ tantal kondansatör | Çalışma gerilimi anma değerinin en çok %50’si |
| Direnç | Ortam sıcaklığındaki izinli gücün en çok %50–60’ı |
| Yarı iletken | Gerilimde en çok %80; jonksiyon, izin verilen en yüksek sıcaklığın 20–25 °C altında |

**Tedarik de bir seçim ölçütüdür.** Kartı çizmeden önce parçanın yaşam döngüsü durumuna (aktif, yeni tasarımlar için önerilmiyor (NRND), üretimi bitiyor (EOL)) ve stokuna bakın. Mümkünse aynı footprint’e oturan ikinci bir kaynak bulun ve yaygın kılıfları seçin.

> [!RULE] Bir kondansatörü şemadaki değeriyle değil, çalışma gerilimindeki ve sıcaklığındaki etkin değeriyle hesaba katın.

> [!QUIZ] Bir regülatör çıkışında en az 4,7 µF etkin kapasite istiyor. 5 V çıkışa 10 µF, 6,3 V, X5R, ±%20 toleranslı küçük kılıflı bir kondansatör koydunuz; üreticinin eğrisi 5 V’ta %60 kayıp gösteriyor. Yeterli mi?
> Hayır. Gerilim altında 10 µF × 0,4 = 4 µF kalır; toleransın alt ucunda 4 × 0,8 = 3,2 µF. Çare: aynı değeri daha büyük kılıfta ya da daha yüksek anma geriliminde seçmek ya da iki kondansatörü paralel bağlamak.

## Güvenlik mesafeleri

[[lesson:spacing|İletken aralıkları]] dersindeki IPC-2221 aralığı devrenin çalışması içindir. İnsanı elektrik çarpmasından koruyan yalıtım ayrı bir konudur; mesafelerini IEC 62368-1 ve IEC 60664-1 gibi ürün güvenliği standartları belirler. Konu yalnızca şebeke değildir: kabaca 60 V DC ya da 30 V AC (RMS) üzerindeki gerilimler tehlikeli sayılır (IEC 62368-1’deki ES1 sınırları).

İki mesafe ayrı ayrı sağlanır:

- **Hava aralığı (clearance):** iki iletken arasında havadan geçen en kısa yol. Atlamaya karşıdır; bu yüzden onu çalışma gerilimi değil, dayanılması gereken darbe gerilimi belirler. Darbe gerilimi şebeke gerilimine ve aşırı gerilim kategorisine bağlıdır. Yüksek irtifada hava inceldiği için aralık büyütülür.
- **Yüzey kaçak mesafesi (creepage):** yalıtkanın yüzeyi boyunca en kısa yol. Kirli ve nemli yüzeyde zamanla oluşan iletken izlere (tracking) karşıdır; onu çalışma geriliminin RMS değeri, kirlilik derecesi ve laminatın malzeme grubu (CTI değeri) belirler.

[[fig:creepage]]

Gereken mesafe yalıtımın türüne de bağlıdır:

| Yalıtım türü | Ne işe yarar? |
|---|---|
| Fonksiyonel | Yalnızca devrenin çalışması içindir; çarpılmaya karşı koruma sayılmaz |
| Temel (basic) | Çarpılmaya karşı tek kat koruma; örneğin şebeke ile topraklanmış metal arasında |
| Ek (supplementary) | Temel yalıtım bozulursa koruyan bağımsız ikinci kat |
| Çift (double) | Temel ve ek yalıtım birlikte |
| Güçlendirilmiş (reinforced) | Çift yalıtıma eşdeğer tek yalıtım; şebeke ile dokunulabilir devre arasında çift ya da güçlendirilmiş yalıtım beklenir |

**Yerleşime etkisi**

- **Bariyer bütün katmanlarda boş bir şerittir:** birincil ve ikincil taraf arasında hiçbir katmanda bakır, iz ya da via bulunmaz. İç katmandaki bakır mesafeyi görünmeden kısaltır; laminatın içinden geçen yalıtımın da kendi kuralları vardır.
- **Oluk yalnızca kaçak mesafesini uzatır:** frezelenmiş oluk yüzey yolunu keser, yol oluğun ucundan dolaşır; hava aralığı değişmez. Çok dar oluk sayılmaz; en küçük genişlik kirlilik derecesine bağlıdır.
- **Bariyeri aşan parçalar bu iş için sertifikalı olmalıdır:** optokuplör, dijital izolatör, transformatör ve Y kondansatörü. Bacakları arasındaki mesafe de hesaba girer; gövdelerinin altından bakır geçirmeyin.

> [!WARN] Aralık hesaplayıcısı 325 V tepe (230 V AC) için kaplamasız dış katmanda 2,5 mm verir. Bu fonksiyonel aralıktır, güvenlik mesafesi değildir. Güvenlik mesafesini ürün standardı ve test laboratuvarı belirler.

[[calc:spacing?V=325&cat=B2|325 V için IPC-2221 fonksiyonel aralığı]]

## Dört alanın ortak noktası

- **Bedel:** HDI ve esnek kart standart karta göre daha pahalıdır, daha uzun sürede üretilir ve her üretici yapmaz; sertifikasyon testleri de zaman ve para ister. Daha büyük adımlı bir kılıf, bir kablo ya da hazır, sertifikalı bir güç modülü çoğu zaman en ucuz çözümdür.
- **Üreticiyi erken dahil edin:** katman yapısını ve tasarım kurallarını yerleşimden önce yazılı isteyin ([[lesson:dfm|üretime hazırlık]]). Güvenlikte aynı rol test laboratuvarınındır.
- **Standardı okuyun, özetini değil:** bu ders dahil hiçbir özet, standardın tablolarının yerini tutmaz.

## Karar öncesi kontrol listesi

- **HDI:** BGA kaçışı hesaplandı; üreticinin katman yapısı ve mikrovia kuralları elde; teklif alındı.
- **Esnek kart:** bükülmenin statik mi dinamik mi olduğu belli; yarıçap üreticiyle doğrulandı; bükülme bölgesinde via, pad, parça ve dolu bakır yok.
- **Parçalar:** kondansatörler etkin değerleriyle hesaplandı; gerilim, güç ve sıcaklık payları kontrol edildi; kritik parçaların ikinci kaynağı belli.
- **Yalıtım:** ürün standardı, yalıtım türü, aşırı gerilim kategorisi, kirlilik derecesi ve irtifa yazıldı; bariyer bütün katmanlarda boş; bariyeri aşan parçalar sertifikalı.

## Sırada ne var?

Şebeke girişinin korunması için [[lesson:esd-protection|ESD ve koruma]] dersine, terimler için [[lesson:glossary|sözlüğe]] bakın. Bundan sonrası standartların kendisi, üreticinizin tasarım kılavuzu ve parça üreticilerinin uygulama notlarıdır.
`,
    en: `
## Why this lesson?

The learning path ended with an ordinary board: four layers, through vias, low voltage. Sooner or later a project asks for more: a fine-pitch BGA that cannot be escaped with through vias, a board that has to bend, a capacitor that has lost half its value under bias, or a product that plugs into the mains.

This lesson is a map, not a design guide: for each of four areas, what it is, when you need it, the few rules that prevent the first mistake, and what it costs. The numbers are typical; the fabricator’s capability sheet, the part’s datasheet and the product standard decide.

| Situation | Area | First question |
|---|---|---|
| No trace or via fits between the BGA pads | HDI | Which microvia structure does the fabricator build, and at what price? |
| The board must bend, or join another without a cable | Flex / rigid-flex | Does it bend once or continuously, and at what radius? |
| Right on paper, marginal on the board | Selection and derating | What does the part really deliver at this voltage and temperature? |
| The board carries mains or another hazardous voltage | Safety distances | Which product standard, which kind of insulation? |

## HDI: when through vias are not enough

A through via takes space on every layer and, being drilled mechanically, cannot shrink below a certain size ([[lesson:vias|via and pad design]]). **HDI (high density interconnect)** gets past this limit with three tools:

- **Microvia:** a small laser-drilled via that goes down one layer only; typically a hole of about 0.1 mm through a dielectric thinner than 0.1 mm.
- **Build-up layers:** the core is laminated, drilled and plated first; then a thin layer is added to each side and its microvias are drilled. **1+N+1** means one build-up layer on each side of an N-layer core; 2+N+2 has two. Vias that stay inside the core become buried vias.
- **Via-in-pad:** the via sits right inside the BGA pad; it is filled and plated over so that the pad stays flat.

[[fig:hdi]]

**When do you need it?** Most often because of BGA pitch. A 0.5 mm pitch BGA with 0.25 mm pads leaves a 0.25 mm gap between pads; with 0.1 mm trace and space one trace needs 0.3 mm, so none fits. The largest via pad between four balls is 0.257 mm; a small through via with a 0.45 mm pad does not fit.

[[calc:fanout?p=0.5&p_u=mm&d=0.25&d_u=mm&w=0.1&w_u=mm&s=0.1&s_u=mm&v=0.45&v_u=mm|0.5 mm BGA: do a trace and a via fit?]]

Shrinking the via does not help either: a 0.257 mm pad, with an annular ring left around the hole, takes a hole of about 0.1 mm at most. In a 1.6 mm board that is an aspect ratio of 16:1, far beyond the typical 8:1–10:1 limit.

[[calc:via?d=0.1&d_u=mm&L=1.6&L_u=mm&I=0.5&I_u=A|A 0.1 mm hole in a 1.6 mm board]]

A microvia unties the knot: it sits in the pad, goes down one layer, and the trace continues on an inner layer.

**First rules**

- **Aspect ratio:** for a microvia the ratio of depth to diameter is typically kept below 1:1, preferably below 0.8:1; in a deeper blind hole the plating solution does not reach the bottom.
- **Staggered beats stacked:** stacked microvias need the lower one filled with copper, and the joint between them is the likeliest place to crack in the heat of soldering. Staggering costs a little space but is cheaper and more reliable.
- **Every build-up layer is a lamination cycle:** another round of pressing, drilling and plating, so price and lead time go up with each one.

> [!TIP] Talk to the fabricator before placement: the layer structure, via and pad diameters and trace and space limits come from the fabricator and differ from one to the next ([[lesson:stackup|layer stack-up]]). The general framework is in IPC-2226.

> [!QUIZ] A 0.4 mm pitch BGA has 0.2 mm pads; the fabricator can do 0.075 mm trace and space. Does a trace fit between the pads? Does a microvia pad fit between four balls?
> The gap is 0.4 − 0.2 = 0.2 mm; one trace needs 0.075 + 2 × 0.075 = 0.225 mm, so it does not fit. The largest pad between four balls is √2 × 0.4 − 0.2 − 2 × 0.075 = 0.216 mm; a typical microvia pad (0.25–0.3 mm) does not fit there either. What remains is the microvia in the pad: every ball drops straight to the layer below.

## Flex and rigid-flex boards

A **flex board** is built on a thin polyimide film instead of FR-4; **rigid-flex** runs the same flexible layers through rigid sections and does away with the connectors in between. Repeated bending calls for rolled-annealed (RA) copper, which resists fatigue better. A **coverlay**, a polyimide film with adhesive, replaces the solder mask; its openings cannot be made as fine. A **stiffener** glued under connectors and parts keeps solder joints from flexing and brings the end that enters a ZIF connector up to the thickness it asks for.

[[fig:flex]]

**First rules and their reasons**

- **The bend radius is a multiple of the thickness:** the outer face of bent copper is stretched, the more so the smaller the radius and the thicker the board. Typical values: bent once and left in place (static), about 6–10 times the thickness with one or two copper layers and 20 times or more for multilayer flex; moving all the time (dynamic), 100 times or more, with a single copper layer. IPC-2223 and the fabricator give the exact value.
- **Traces cross the bend axis straight and at right angles:** where a trace runs at an angle, or changes direction or width inside the area, the stress concentrates.
- **No vias, pads or parts in the bend area:** a plated hole and a solder joint do not bend, they crack.
- **Rounded corners, pads with teardrops and anchors:** a sharp corner is where a crack starts. A pad adheres weakly to polyimide and can lift during soldering; a teardrop and anchoring spurs under the coverlay hold it down.
- **Hatched instead of solid planes:** solid copper stiffens the board and tends to crack when bent; a hatched plane keeps it flexible, but changes the trace impedance.
- **Traces on the two sides are offset:** traces stacked exactly above one another stiffen the section like an I-beam and strain the outer copper more.
- **Tear relief at inside corners:** polyimide tears easily from a notch; round the inside corners of the outline.

> [!QUIZ] A flex tail with two copper layers is 0.2 mm thick and is bent once, to an inside radius of 1 mm. Is that acceptable? What if it opened and closed all the time in a hinge?
> For static bending the typical rule is about 10 times the thickness: 10 × 0.2 = 2 mm, so 1 mm is too tight; enlarge the radius or make the tail thinner. For dynamic bending it is 100 times or more: 100 × 0.2 = 20 mm. That does not fit in most hinges; the bending section needs a single copper layer and less thickness (10 mm at 0.1 mm).

## Component selection and derating

The value on the schematic is not the value in the circuit: the number on the first page of the datasheet was measured under one condition.

**Ceramic capacitors.** Class 2 dielectrics such as X5R and X7R lose capacitance as the DC voltage across them (the DC bias) rises. For the same value and rated voltage, the smaller the package the larger the loss; at half the rated voltage more than half of the capacitance may be gone. The code "X7R" only describes the behaviour over temperature; the effect of voltage is in the manufacturer’s DC bias curve. Tolerance, temperature and ageing come on top. Class 1 dielectrics (C0G/NP0) hardly show these effects, but exist only in small values.

[[fig:dcbias]]

**Other parts**

- **Tantalum and electrolytic:** a classic (MnO₂) tantalum capacitor fails short under overvoltage and surge current, so it needs a wide voltage margin. The life of an aluminium electrolytic is set by temperature and ripple current; as a rule of thumb it doubles for every 10 °C less.
- **Resistors:** the rated power usually holds up to 70 °C ambient and falls above it along the datasheet curve. Short, high pulses can destroy a resistor even at a small average power.
- **Semiconductors:** the limit is the junction temperature ([[lesson:thermal|thermal design]]); a MOSFET working in its linear region must also stay inside its safe operating area (SOA) curve.
- **Connectors:** the rating is usually for a single pin; when many neighbouring pins carry current, less is allowed per pin.

**Derating** means running a part below its ratings: it lasts longer and keeps margin for tolerances and unexpected conditions. The rules below are typical company practice, not a standard:

| Part | Typical rule |
|---|---|
| Ceramic and aluminium electrolytic capacitor | Working voltage at most 80 % of the rating |
| MnO₂ tantalum capacitor | Working voltage at most 50 % of the rating |
| Resistor | At most 50–60 % of the power allowed at the ambient temperature |
| Semiconductor | At most 80 % in voltage; junction 20–25 °C below the maximum allowed |

**Supply is a criterion too.** Before layout, check the lifecycle status of the part (active, not recommended for new designs (NRND), end of life (EOL)) and its stock. If you can, find a second source that fits the same footprint, and choose common packages.

> [!RULE] Count a capacitor with its effective value at the operating voltage and temperature, not with the value on the schematic.

> [!QUIZ] A regulator asks for at least 4.7 µF of effective capacitance at its 5 V output. You placed a 10 µF, 6.3 V, X5R capacitor with ±20 % tolerance in a small package; the manufacturer’s curve shows a loss of 60 % at 5 V. Is that enough?
> No. Under bias 10 µF × 0.4 = 4 µF is left; at the low end of the tolerance 4 × 0.8 = 3.2 µF. The cure: the same value in a larger package or with a higher rated voltage, or two capacitors in parallel.

## Safety distances

The IPC-2221 spacing of the [[lesson:spacing|conductor spacing]] lesson is there for the circuit to work. Insulation that protects people from electric shock is a separate subject; its distances come from product safety standards such as IEC 62368-1 and IEC 60664-1. Mains is not the only case: voltages above about 60 V DC or 30 V AC (RMS) count as hazardous (the ES1 limits of IEC 62368-1).

Two distances have to be met separately:

- **Clearance:** the shortest path through air between two conductors. It guards against flashover, so it is set not by the working voltage but by the impulse voltage to be withstood, which depends on the mains voltage and the overvoltage category. At high altitude the air is thinner and the clearance is increased.
- **Creepage:** the shortest path along the surface of the insulation. It guards against the conductive tracks that form over time on a dirty, damp surface (tracking); it is set by the RMS working voltage, the pollution degree and the material group of the laminate (its CTI value).

[[fig:creepage]]

The distance required also depends on the kind of insulation:

| Kind of insulation | What it does |
|---|---|
| Functional | Only lets the circuit work; does not count as protection against shock |
| Basic | A single level of protection against shock; for example between mains and earthed metal |
| Supplementary | An independent second level that protects if the basic insulation fails |
| Double | Basic and supplementary insulation together |
| Reinforced | A single insulation equivalent to double; one of the two is expected between mains and a touchable circuit |

**Consequences for the layout**

- **The barrier is an empty band on every layer:** between the primary and the secondary side there is no copper on any layer. Copper on an inner layer shortens the distance without being seen, and insulation through the laminate has rules of its own.
- **A slot lengthens the creepage only:** a milled slot cuts the surface path, which has to go round its end; the clearance does not change. A very narrow slot does not count; the minimum width depends on the pollution degree.
- **Parts that bridge the barrier must be certified for it:** optocoupler, digital isolator, transformer and Y capacitor. The distance between their pins counts as well; do not run copper under their bodies.

> [!WARN] For 325 V peak (230 V AC) the spacing calculator gives 2.5 mm on an uncoated outer layer. That is functional spacing, not a safety distance. The safety distance is set by the product standard and the test house.

[[calc:spacing?V=325&cat=B2|IPC-2221 functional spacing for 325 V]]

## What the four areas have in common

- **Cost:** HDI and flex boards cost more than a standard board, take longer to build, and not every fabricator makes them; certification takes time and money too. A package with a larger pitch, a cable or a certified power module is often the cheapest answer.
- **Involve the fabricator early:** ask for the layer structure and design rules in writing before placement ([[lesson:dfm|getting ready for manufacturing]]). For safety, the test house plays the same role.
- **Read the standard, not a summary:** no summary, this lesson included, replaces its tables.

## Checklist before you commit

- **HDI:** BGA escape calculated; the fabricator’s layer structure and microvia rules at hand; quotation received.
- **Flex:** static or dynamic bend decided; radius confirmed with the fabricator; no vias, pads, parts or solid copper in the bend area.
- **Parts:** capacitors counted with their effective values; voltage, power and temperature margins checked; second source known for the critical parts.
- **Insulation:** product standard, kind of insulation, overvoltage category, pollution degree and altitude written down; barrier empty on every layer; bridging parts certified.

## What next?

For protecting the mains input see the [[lesson:esd-protection|ESD and protection]] lesson, for the terms the [[lesson:glossary|glossary]]. Beyond that: the standards themselves, your fabricator’s design guide and the part manufacturers’ application notes.
`,
  },
};
