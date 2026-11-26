import { figureFrom } from '../figures.js';
import { text, rect, path, polygon, circle, arrow } from '../../ui/svg.js';

const S = {
  tr: {
    fpCap: 'Örnek yerleşim planı. Güç tek noktadan girer ve dışa doğru dağılır; sinyaller konnektörden işlemciye, oradan radyoya ve sensöre akar. Gürültülü regülatör (kırmızı) ile sakin analog bölge (yeşil) kartın karşı köşelerindedir; anten köşededir ve çevresinde hiçbir katmanda bakır yoktur.',
    pwr: 'Güç girişi',
    reg: 'regülatör',
    noisy: '(gürültülü)',
    ifc: 'Arayüz',
    esd: 'ESD, filtre',
    dig: 'dijital',
    xtal: 'kristal',
    radio: 'Radyo',
    ant: 'anten: bakır yok',
    ana: 'Analog, sensör',
    quiet: '(sakin)',
    pflow: 'güç akışı',
    sflow: 'sinyal akışı',
    hole: 'montaj deliği',
    dcCap: 'Dekuplaj kondansatörünün yerleşimi, üstten görünüş. Solda: akım düzlem viasından önce kondansatör padine, oradan kısa ve geniş bakırla pine ulaşır; kondansatör, VDD ve GND pinlerinin oluşturduğu döngü küçüktür. Sağda: pin önce viaya bağlanmış, kondansatör uzun ve ince bir izin ucunda kalmış; izin endüktansı kondansatöre seri girer ve döngü büyür.',
    thin: 'uzun, ince iz',
    dcGood: '✓ via → C → pin, kısa',
    dcBad: '✗ önce via, C uzakta',
    rdCap: 'Üç yönlendirme kuralı: üstte doğrusu, altta yanlışı. Solda: iz, düzlemdeki yarığın üzerinden değil, kesintisiz bakırın üzerinden gider. Ortada: hızlı bir hat alıcıların padlerinden sırayla geçer; uzun bir T dalı saplama (stub) olur ve yansıma üretir. Sağda: dönüşler 45°’dir; 90°’den dar bir köşe aşındırma sıvısını tutabilir.',
    slot: 'yarık',
    g1: '✓ düzlem üzerinde',
    b1: '✗ yarık üzerinden',
    g2: '✓ papatya zinciri',
    b2: '✗ uzun saplama',
    g3: '✓ 45° dönüşler',
    b3: '✗ dar açılı köşe',
  },
  en: {
    fpCap: 'Example floorplan. Power enters at one point and spreads outwards; signals flow from the connector to the MCU and on to the radio and the sensor. The noisy regulator (red) and the quiet analog area (green) sit in opposite corners of the board; the antenna is in a corner with no copper around it on any layer.',
    pwr: 'Power entry',
    reg: 'regulator',
    noisy: '(noisy)',
    ifc: 'Interface',
    esd: 'ESD, filters',
    dig: 'digital',
    xtal: 'crystal',
    radio: 'Radio',
    ant: 'antenna keep-out',
    ana: 'Analog, sensor',
    quiet: '(quiet)',
    pflow: 'power flow',
    sflow: 'signal flow',
    hole: 'mounting hole',
    dcCap: 'Placing a decoupling capacitor, top view. Left: the current from the plane via reaches the capacitor pad first and then the pin through short, wide copper; the loop formed by the capacitor and the VDD and GND pins is small. Right: the pin is connected to the via first and the capacitor hangs on a long, thin trace; the trace inductance is in series with the capacitor and the loop is large.',
    thin: 'long thin trace',
    dcGood: '✓ via → C → pin, short',
    dcBad: '✗ via first, C far away',
    rdCap: 'Three routing rules: right on top, wrong below. Left: the trace runs over solid copper, not across the split in the plane. Middle: a fast line visits its receivers pad to pad; a long T-branch is a stub and causes reflections. Right: bends are 45°; a corner sharper than 90° can trap etchant.',
    slot: 'split',
    g1: '✓ over solid plane',
    b1: '✗ across the split',
    g2: '✓ daisy chain',
    b2: '✗ long stub',
    g3: '✓ 45° bends',
    b3: '✗ acute corner',
  },
};

const FLOW = { cls: 'flow', headCls: 'arrow flow' };

/** Copper trace of stroke width w (plain numbers only). */
const trace = (d, w) => `<path class="cutr" style="stroke-width:${w}" d="${d}"/>`;
/** Via seen from above: copper pad with its hole. */
const via = (x, y) => circle(x, y, 5.5, 'cu') + circle(x, y, 2.2, 'hole');

/** Board divided into regions, with power flow (accent) and signal flow (grey) arrows. */
function floorplan(lang) {
  const s = S[lang] ?? S.en;
  const zone = (x, y, w, h, cls) => rect(x, y, w, h, cls, ' rx="4"');
  let b = rect(14, 10, 392, 196, 'soft', ' rx="6"')
    + [[28, 22], [28, 194], [392, 194]].map(([x, y]) => circle(x, y, 4.5, 'hole')).join('');
  // Connectors on the left edge.
  b += rect(6, 36, 34, 32, 'comp', ' rx="2"') + text(23, 56, '5 V', { cls: 'name', size: 11 })
    + rect(6, 126, 34, 50, 'comp', ' rx="2"') + text(23, 155, 'I/O', { cls: 'name', size: 11 });
  // Power entry and regulator (noisy), interface with protection.
  b += zone(58, 20, 106, 62, 'zone-bad')
    + text(111, 40, s.pwr, { cls: 'name' }) + text(111, 55, s.reg) + text(111, 69, s.noisy)
    + zone(58, 120, 106, 64, 'zone')
    + text(111, 148, s.ifc, { cls: 'name' }) + text(111, 163, s.esd);
  // Digital core: MCU with its crystal right next to it.
  b += zone(186, 60, 90, 100, 'zone') + text(231, 76, s.dig)
    + rect(207, 86, 48, 48, 'comp', ' rx="3"') + text(231, 114, 'MCU', { cls: 'name' })
    + rect(213, 140, 16, 9, 'comp', ' rx="2"') + text(236, 149, s.xtal, { anchor: 'start', size: 10 });
  // Radio with the antenna in the corner and its copper-free zone.
  b += zone(296, 60, 100, 46, 'zone') + text(346, 88, s.radio, { cls: 'name' })
    + rect(296, 16, 104, 36, 'dim') + trace('M316,60V42H392', 3) + text(348, 31, s.ant, { size: 10 });
  // Quiet analog corner, far from the regulator.
  b += zone(296, 122, 100, 62, 'zone-ok')
    + text(346, 148, s.ana, { cls: 'name', size: 11 }) + text(346, 164, s.quiet);
  // Power: in at one point, then outwards to every block.
  b += arrow(40, 52, 57, 52, FLOW)
    + path('M164,44H285V72', 'flow') + arrow(285, 72, 295, 72, FLOW)
    + arrow(231, 44, 231, 59, FLOW)
    + path('M164,72H175V172H280', 'flow') + arrow(280, 172, 295, 172, FLOW);
  // Signals: connector ↔ interface ↔ MCU ↔ radio / analog.
  b += arrow(40, 151, 57, 151, { both: true })
    + arrow(164, 140, 185, 140, { both: true })
    + arrow(276, 92, 295, 92, { both: true })
    + arrow(276, 140, 295, 140, { both: true });
  // Legend.
  b += arrow(24, 221, 52, 221, FLOW) + text(58, 225, s.pflow, { anchor: 'start' })
    + arrow(150, 221, 178, 221, { both: true }) + text(184, 225, s.sflow, { anchor: 'start' })
    + circle(292, 221, 4.5, 'hole') + text(302, 225, s.hole, { anchor: 'start' });
  return figureFrom(420, 234, s.fpCap, b);
}

/** One top-view panel (local coordinates, 200 wide): IC with VDD and GND pins, capacitor and vias. */
function decapPanel(good, s) {
  // The loop the fast current flows in (behind the copper).
  let b = good
    ? rect(82, 57, 24, 44, 'zone-ok')
    : polygon([[82, 57], [170, 57], [170, 156], [100, 101], [82, 101]], 'zone-bad');
  b += rect(8, 26, 62, 108, 'comp', ' rx="3"') + text(28, 84, 'IC', { cls: 'name' })
    + text(66, 61, 'VDD', { anchor: 'end', size: 10 }) + text(66, 105, 'GND', { anchor: 'end', size: 10 })
    + rect(70, 52, 12, 10, 'cu') + rect(70, 96, 12, 10, 'cu');
  if (good) {
    // Via → capacitor pad → pin, short and wide.
    b += trace('M82,57H136', 8) + trace('M82,101H136', 8)
      + rect(96, 48, 20, 62, 'comp') + rect(96, 48, 20, 14, 'cu') + rect(96, 96, 20, 14, 'cu')
      + text(106, 83, 'C', { cls: 'name' })
      + via(136, 57) + via(136, 101)
      + text(136, 44, 'via', { size: 10 })
      + text(146, 61, '3V3', { cls: 'name', anchor: 'start', size: 11 })
      + text(146, 105, 'GND', { cls: 'name', anchor: 'start', size: 11 });
  } else {
    // Pin → via first; the capacitor sits at the end of a long thin trace with its own far GND via.
    b += trace('M82,57H170V78', 2) + trace('M82,101H100', 2) + trace('M170,140V156', 2)
      + rect(160, 78, 20, 62, 'comp') + rect(160, 78, 20, 14, 'cu') + rect(160, 126, 20, 14, 'cu')
      + text(170, 113, 'C', { cls: 'name' })
      + via(100, 57) + via(100, 101) + via(170, 156)
      + text(100, 77, '3V3', { cls: 'name', size: 11 })
      + text(100, 121, 'GND', { cls: 'name', size: 11 })
      + text(160, 160, 'GND', { cls: 'name', anchor: 'end', size: 11 })
      + text(146, 49, s.thin, { size: 10 });
  }
  b += text(100, 178, good ? s.dcGood : s.dcBad, { cls: good ? 'okt' : 'badt' });
  return b;
}

function decapPlacement(lang) {
  const s = S[lang] ?? S.en;
  return figureFrom(420, 188, s.dcCap,
    `<g transform="translate(8,0)">${decapPanel(true, s)}</g><g transform="translate(214,0)">${decapPanel(false, s)}</g>`);
}

/** Three good/bad pairs: plane split, stub, corner. Good on the top row, bad below. */
function routingDos(lang) {
  const s = S[lang] ?? S.en;
  const cell = (col, row, body, label) => `<g transform="translate(${8 + col * 138},${6 + row * 100})">${
    rect(0, 0, 128, 76, 'soft', ' rx="3"')}${body}${text(64, 90, label, { cls: row ? 'badt' : 'okt' })}</g>`;
  const ring = (x, y, r) => circle(x, y, r, 'wire bad');

  // 1 · Ground plane with a split: route around its end, not across it.
  const plane = polygon([[6, 6], [58, 6], [58, 48], [70, 48], [70, 6], [122, 6], [122, 70], [6, 70]], 'cu plane')
    + text(74, 17, s.slot, { anchor: 'start', size: 10 });
  const ends = rect(8, 26, 8, 8, 'cu') + rect(112, 26, 8, 8, 'cu');
  const split = [
    plane + trace('M12,30H38L48,40V52L56,60H72L80,52V40L90,30H116', 3) + ends,
    plane + trace('M12,30H116', 3) + ends + ring(64, 30, 9),
  ];

  // 2 · Fast net with two receivers: pad to pad, or a long T-branch.
  const chip = (x, y, name) => rect(x, y, 26, 20, 'comp', ' rx="2"') + text(x + 13, y + 14, name, { cls: 'name', size: 10 });
  const stub = [
    trace('M32,40H96', 3) + rect(61, 30, 8, 12, 'cu') + chip(6, 30, 'TX') + chip(52, 10, 'RX') + chip(96, 30, 'RX'),
    trace('M32,40H96', 3) + trace('M44,40V60H62', 3) + chip(6, 30, 'TX') + chip(62, 50, 'RX') + chip(96, 30, 'RX') + ring(44, 40, 7),
  ];

  // 3 · Corners: two 45° bends, or one acute corner.
  const corner = [
    trace('M12,58H64L90,32V12', 4),
    trace('M12,58H96L60,22', 4) + ring(88, 53, 11),
  ];

  let b = '';
  for (const row of [0, 1]) {
    b += cell(0, row, split[row], row ? s.b1 : s.g1)
      + cell(1, row, stub[row], row ? s.b2 : s.g2)
      + cell(2, row, corner[row], row ? s.b3 : s.g3);
  }
  return figureFrom(420, 204, s.rdCap, b);
}

export default {
  figures: { floorplan, 'decap-placement': decapPlacement, 'routing-dos': routingDos },
  body: {
    tr: `
## Neden önemli?

Yönlendirmenin (routing) kalitesini büyük ölçüde yerleşim belirler. Dekuplaj kondansatörü pinden uzaktaysa, kristal kartın öbür ucundaysa ya da gürültülü regülatör analog girişin yanındaysa bunu hiçbir yönlendirme ustalığı kurtaramaz. İyi bir yerleşimde izler kısa ve düz çıkar, katman değişimi azalır, toprak düzlemi bütün kalır.

Bu ders tekrarlanabilir bir sıra verir: **kısıtlar → yerleşim planı → yerleşim sırası → katman planı → yönlendirme sırası → inceleme.**

## Yerleştirmeden önce: neler belli olmalı?

- **Mekanik kısıtlar:** kart dış hattı, konnektörlerin ve montaj deliklerinin yeri, yükseklik sınırları, yasak bölgeler (keep-out). CAD’de kilitleyin; sonradan kayan bir konnektör bütün yerleşimi bozar.
- **Katman yığını:** katman sayısı ve her katmanın görevi ([[lesson:stackup|katman yığını]]).
- **Tasarım kuralları ve net sınıfları (net class):** üreticinin en küçük iz, aralık ve via değerleri ([[lesson:dfm|DFM]]); güç netlerine genişlik, yüksek gerilime aralık ([[lesson:spacing|aralıklar]]). İlk izden önce girin; sonradan girilen kural yüzlerce hata üretir.
- **Kritik net listesi:** anahtarlamalı güç döngüleri, saatler ve kristaller, hızlı diferansiyel çiftler, hassas analog girişler, yüksek akım ya da yüksek gerilim taşıyan netler. Bunlar önce yerleştirilir ve önce çizilir.

## Yerleşim planı: blok şemasından kart bölgelerine

Parçaları tek tek koymadan önce blok şemasını kart üzerinde bölgelere çevirin (floorplan).

[[fig:floorplan]]

- **Sinyal akışı:** blokları, sinyal kartı bir uçtan öbür uca kat edecek sırayla dizin; çok konuşan bloklar komşu olsun.
- **Konnektörler kenarda,** mümkünse aynı ya da komşu kenarlarda: kablolar anten gibi davranır ve karşılıklı kenarlardaki iki kabloyu kart toprağındaki gürültü gerilimi sürer ([[lesson:grounding-emc|topraklama ve EMC]]).
- **Gürültülü ile sakin ayrı:** anahtarlamalı regülatör ve motor sürücü bir uçta, analog ve RF öbür uçta; gürültülü bloğun dönüş akımı sakin bölgenin altından geçmesin.
- **Güç tek yerden girer ve dışa doğru akar:** regülatör girişin yanında, en çok akım çeken yük ona en yakın.
- **Isı kaynaklarını dağıtın;** sıcaklık sensöründen, kristalden ve elektrolitik kondansatörlerden uzak tutun ([[lesson:thermal|termal tasarım]]).
- **Anten kenarda ya da köşede,** veri sayfasındaki bakırsız bölgesiyle ([[lesson:rf-antennas|RF ve antenler]]).

> [!TIP] Önce her bloğu kartın dışında kendi içinde gruplayın, sonra grupları karta taşıyın.

## Yerleşim sırası

1. **Mekanik olarak sabit parçalar:** konnektörler, montaj delikleri, düğmeler, göstergeler. Yerleştirip kilitleyin.
2. **Ana entegreler:** işlemci, regülatörler, radyo. Bağlantı çizgileri (ratsnest) çaprazlaşmayacak ve kritik bağlantılar en kısa olacak şekilde döndürün. Çizgiler hâlâ çaprazsa via eklemeden önce pin değişimini (pin swap) düşünün.
3. **Kritik çevre parçaları:** dekuplaj kondansatörleri pinlerin dibine ([[lesson:pdn|güç dağıtımı]]); kristal ve yük kondansatörleri osilatör pinlerinin yanına; seri sonlandırma direnci sürücünün çıkışına; ESD/TVS diyotu konnektörün dibine, darbe kartın içine girmeden toprağa aksın ([[lesson:esd-protection|ESD ve koruma]]).
4. **Güç katları:** önce sıcak döngü, sonra bobin ve çıkış ([[lesson:power-layout|güç kaynağı yerleşimi]]).
5. **Geri kalan her şey:** pull-up dirençleri, LED’ler, test noktaları.

[[fig:decap-placement]]

Kondansatörün işi, pinin istediği hızlı akımı küçük bir döngüden vermektir; aradaki ince izin her milimetresi kabaca 0,5–1 nH ekler. Besleme düzlemi olmayan kartlarda sıra **besleme → kondansatör → pin** olmalıdır; düzlemli kartlarda vialar kondansatör padlerinin hemen yanında durur.

> [!QUIZ] 100 nF’lık bir dekuplaj kondansatörü pinden 10 mm uzakta ve 0,2 mm’lik bir izle bağlı. Bu iz 100 MHz’te ne kadar empedans ekler?
> Yaklaşık 1 nH/mm ile 10 nH eder: X = 2π · f · L = 2π · 100 MHz · 10 nH ≈ 6,3 Ω. Montajlı bir 0603 kondansatörün kendi endüktansı 1 nH mertebesindedir (0,6 Ω); iz, kondansatörü on kat kötüleştirir.

## Pratik yerleşim kuralları

Sayılar yaygın alışkanlıklardır; **montajcınızın kuralları her zaman önce gelir.**

- **Izgara (grid):** parçaları bir ızgaraya oturtun (ör. 0,5 mm; küçük pasiflerde 0,25 mm) ve sıra hâlinde hizalayın; aralarında düzgün iz kanalları kalır.
- **Yön:** kutuplu parçaları ve 1 numaralı pinleri bir ya da iki yönde tutun; ters dizilen parça hemen göze çarpar.
- **Boşluk:** courtyard’lar (parça çevresindeki yerleşim sınırı) üst üste binmesin; konnektörlerin ve QFN/BGA’ların çevresinde havya ve sıcak hava için yer bırakın.
- **Seramik kondansatörler** kart esneyince çatlar: V-kesim çizgilerinden, kopma köprülerinden ve vida deliklerinden uzak tutun ya da uzun kenarını kırılma çizgisine paralel koyun.
- **Tek yüz:** parçalar bir yüze sığıyorsa öyle bırakın; tek yüzlü dizgi daha ucuzdur.
- **Fiducial ve test noktaları:** yerlerini şimdi ayırın, sonra yer kalmaz.

## Çizmeden önce katman planı

- **2 katman:** üst yüzde parçalar, sinyaller ve güç izleri; alt yüz olabildiğince kesintisiz toprak.
- **4 katman:** L1 parçalar ve sinyaller, L2 kesintisiz GND, L3 güç, L4 sinyaller. Hızlı ve hassas netleri GND’nin hemen üstündeki L1’de tutun.

[[calc:stackup|Katman yığını aracı]]

- **Yön:** bir sinyal katmanında ağırlıklı yatay, öbüründe dikey çizin; kanallar tıkanmaz.
- **Via stratejisi:** üreticinin standart değerlerinden bir sinyal viası (ör. 0,3 mm delik, 0,6 mm pad) seçin ([[lesson:vias|via ve pad tasarımı]]). Viaları bitişik uzun bir sıra hâlinde dizmeyin: düzlemdeki boşlukları birleşip yarık oluşturur.
- **Fan-out:** ince adımlı entegrelerde ve BGA’larda padlerden vialara kaçışı önce planlayın. 0,8 mm adımlı, 0,4 mm padli bir BGA’da 0,1 mm iz ve aralıkla iki pad arasından bir iz geçer; 0,15 mm’lik kurallarla hiç geçmez.

[[calc:fanout?p=0.8&p_u=mm&d=0.4&d_u=mm&w=0.1&w_u=mm&s=0.1&s_u=mm|0,8 mm BGA fan-out]]

## Yönlendirme sırası

Önce yeri en dar ve hatası en pahalı olan netler çizilir; sıradan sinyaller kalan yere uyar.

| Adım | Netler | Nelere dikkat? |
|---|---|---|
| 1 | Fan-out ve dekuplaj bağlantıları | Pad ile via arasında kısa ve geniş bakır |
| 2 | Kritik netler: kristal, saatler, diferansiyel ve empedans kontrollü hatlar, hassas analog, anahtarlama döngüleri | En kısa yol, altında kesintisiz düzlem, az via |
| 3 | Güç dağıtımı | Düzlem, döküm ya da akıma göre geniş izler; yeterli via |
| 4 | Sıradan sinyaller | Veri yolları birlikte; toprağı uzun izlerle bölmeyin |
| 5 | Toprak dökümü, dikiş viaları, temizlik | Bağlantısız bakır adası ve gereksiz via kalmaz |

## Yönlendirme zanaatı

[[fig:routing-dos]]

- **Referans düzlemi:** her sinyali kesintisiz bir düzlemin üzerinden götürün, yarığın üzerinden asla geçirmeyin. Dönüş akımı izin altından akar; yarıkta dolanır ve döngü büyür.
- **Katman değişimi:** sinyal referans düzlemini değiştiriyorsa dönüş akımına da yol verin: sinyal viasının yanına bir GND dikiş viası ya da, referans güç düzlemine geçiyorsa, bir dekuplaj kondansatörü.
- **Genişlik:** akım taşıyan izlerde akım ([[lesson:trace-current|akım taşıyan izler]]), hızlı hatlarda empedans belirler ([[lesson:impedance|kontrollü empedans]]). Sıradan sinyallerde üreticinin en küçük değerini değil, rahat bir genişliği (ör. 0,2 mm) kullanın; üretim verimi artar.
- **Aralık:** saatleri ve hassas netleri komşularından ayırın; pratik kural 3W’dir (merkezden merkeze en az üç iz genişliği). Düzlemden 0,2 mm yukarıdaki 0,2 mm’lik iki izde boşluğu 0,2 mm’den 0,4 mm’ye çıkarmak, karışmanın üst sınır tahminini %20’den %10’a indirir.

[[calc:crosstalk?st=micro&s=0.4&s_u=mm&w=0.2&w_u=mm&h=0.2&h_u=mm|3W örneği]]

- **Diferansiyel çiftler:** iki izi yan yana, simetrik ve sabit aralıkla çizin; aralarından başka iz ya da via geçmesin.
- **Uzunluk eşleme:** yalnızca arayüz istiyorsa yapın; kıvrımı (serpentine) farkın oluştuğu uca yakın koyun ki çift yolun geri kalanında aynı fazda kalsın.
- **Saplama (stub) bırakmayın:** hızlı bir hattı T ile dallandırmayın, saplama yansıma üretir; hattı alıcıların padlerinden sırayla geçirin (papatya zinciri, daisy chain).
- **Altından iz geçirmeyin:** kristalin, anahtarlamalı regülatör bobininin ve antenin altından sinyal geçmesin; kristal düğümü gürültü toplar, bobinin alanı izlere kuplaj yapar.
- **Padler:** düzleme bağlanan delikli padlerde termal rölyef (thermal relief) kullanın, yoksa pad ısınmaz ve lehim tutmaz. Pad içine via koymayın; dolgulu ve kapaklı değilse lehim deliğe kaçar.
- **Köşeler 45°:** 90°’lik köşe olağan hızlarda sinyal bütünlüğü sorunu değildir; etkisi ancak birkaç GHz’in üzerinde fark edilir. 45° bir gelenektir: yol kısalır ve aşındırma sıvısını tutabilen dar açılar (asit tuzağı) oluşmaz; DFM kontrolleri bunları hâlâ işaretler.

> [!RULE] Bir izi çizmeden önce sorun: akımı nereden geri dönecek, ve bu iz kimin yolunu kapatacak?

> [!QUIZ] Önce hangisini çizersiniz: bir konnektöre giden 20 GPIO’yu mu, işlemcinin 25 MHz’lik kristalini mi?
> Kristali. Kısa, viasız ve altı kesintisiz toprak olan bir yola ihtiyacı vardır; GPIO’lar yavaştır, via ve dolambacı kaldırır. Sıra tersine dönerse 20 iz kristalin yolunu kapatır.

## İki katmanlı kartlar

Çoğu ilk kart iki katmanlıdır: izler üstte, alt yüz toprak. Toprağı bütün tutmak burada daha zordur.

- **Kısa atlamalar:** çaprazlaşan bir izi alttan birkaç milimetrelik bir atlamayla geçirin. Atlamaları yan yana dizmeyin: birleşip toprağı bölen bir yarık olurlar.
- **Toprak adalarını dikin:** üst yüzdeki toprak dökümünün her parçasını vialarla alt toprağa bağlayın, bağlanamayan adaları silin.
- **Güç izlerini genişletin:** güç düzlemi yoktur; beslemeyi regülatörden dallanan geniş izlerle (ör. 0,5–1 mm) dağıtın.

## Etkileşimli yönlendirme ve otomatik yönlendirici

İzleri etkileşimli yönlendiriciyle, iterek yönlendirme (push-and-shove) kipinde çizin: yolu siz seçersiniz, araç kurallara uyarak komşu izleri iter. Kör bir otomatik yönlendirici (autorouter) dönüş yolunu ve hangi netin kritik olduğunu bilmez; bağlantıyı çoğu zaman fazladan vialarla ve toprağı bölen uzun izlerle tamamlar. Kullanacaksanız ancak kritik netleri elle çizip kilitledikten sonra kullanın.

> [!WARN] DRC’den temiz çıkan kart, çalışan kart demek değildir. DRC genişliğe ve aralığa bakar; dönüş yolunu, döngü alanını ve karışmayı siz kontrol edersiniz.

## Yayından önce inceleme turu

- **DRC temiz, çizilmemiş net sıfır:** dökümleri yeniden doldurduktan sonra.
- **Düzlemler ve dönüş yolları:** her düzlem katmanına tek başına bakın: yarık, dar boğaz, ada var mı?
- **Serigrafi:** referanslar okunuyor ve padlerin üzerinde değil; polarite ve 1 numaralı pin işaretli.
- **3B ve mekanik:** kartı kutusuyla birlikte kontrol edin: konnektör yerleri, yükseklikler, vida başları.
- **1:1 çıktı:** kartı gerçek ölçekte yazdırıp parçaları kâğıdın üzerine koyun; yanlış footprint’i en ucuz böyle yakalarsınız.

Ardından [[lesson:dfm|DFM]] ve [[lesson:schematic-review|şematik inceleme]] listelerinden geçin.

## Örnek: USB’den beslenen sensör düğümü

50 × 30 mm, iki katmanlı, 1 oz bakırlı bir kart: USB konnektörü (yalnızca 5 V), 3,3 V LDO, kristalli bir mikrodenetleyici, I²C sıcaklık sensörü ve dört pinli bir konnektör.

1. **Kısıtlar:** dış hat ve delikler kilitli, USB kısa kenarda. Kurallar: sinyal 0,2 mm, güç 0,5 mm, via 0,3/0,6 mm. Kritik netler: kristal, 5 V ve 3,3 V.
2. **Yerleşim planı:** USB ve LDO solda, işlemci ortada, sensör LDO’dan en uzak köşede: LDO 100 mA’de (5 − 3,3) V · 0,1 A = 0,17 W ısı üretir.
3. **Yerleşim:** TVS diyotu konnektörün dibine; işlemci, kristal pinleri boş alana ve I²C pinleri sensöre bakacak şekilde; her VDD pinine bir kondansatör; en son pull-up’lar, LED ve test noktaları.
4. **Katman planı:** her şey üstte, alt yüz toprak.
5. **Yönlendirme:** önce dekuplaj ve kristal, sonra 5 V ve 3,3 V, sonra I²C ve konnektör hatları; en son dökümler ve dikiş viaları.

Bir USB 2.0 portundan en çok 0,5 A çekilir. 10 °C sıcaklık artışı için gereken genişlik yalnızca **0,08 mm**’dir; ama 50 mm uzunluğunda böyle bir iz 0,32 Ω eder ve 158 mV düşürür.

[[calc:trace?I=0.5&dT=10&L=50|0,5 A için gereken genişlik]]

0,5 mm’lik iz aynı artışla **1,4 A** taşır, 50 mm’de 52 mΩ’dur ve 0,5 A’de yalnızca 26 mV düşürür: genişliği burada ısı değil, gerilim düşümü belirler.

[[calc:trace?mode=current&W=0.5&W_u=mm&dT=10&L=50|0,5 mm’lik izin kapasitesi]]

0,3 mm’lik tek bir via 10 °C artışla yaklaşık **1,9 A** taşır; 0,5 A için bir via yeter. Besleme geçişlerinde yine de iki via koyun: direnç ve endüktans düşer, biri kusurlu kaplansa bile bağlantı kalır.

[[calc:via?d=0.3&d_u=mm&L=1.6&p=25&I=0.5&dT=10|0,3 mm via, 0,5 A]]

> [!QUIZ] Aynı karta, 5 V’luk bir adaptörden beslenen ve 2 A çeken bir çıkış eklendi. 1 oz bakırda ve 10 °C artışta hangi genişlik ve kaç via gerekir?
> İz hesaplayıcısı 2 A için yaklaşık 0,97 mm verir; 1 mm ya da daha geniş çizin. Tek via 1,9 A taşıdığından en az iki via gerekir; pay için üç kullanın.

## Sık yapılan hatalar

- Kurallar ve mekanik kısıtlar girilmeden yerleşime, yerleşim oturmadan yönlendirmeye başlamak.
- Dekuplaj kondansatörlerini ve kristali en sona bırakmak.
- İzleri yarığın üzerinden geçirmek; iki katmanlı kartta alt yüzü uzun izlerle doğramak.
- Mekanik kontrolü atlamak: kart gelir, konnektör kutuya uymaz.

## Kontrol listesi

- Dış hat, konnektörler ve delikler kilitli; katman yığını ve kurallar girildi.
- Yerleşim planı sinyal akışını, gürültüyü, ısıyı ve anteni gözetiyor.
- Dekuplaj kondansatörleri pinlerde, kristal osilatör pinlerinde, koruma konnektörde.
- Kritik netler önce çizildi: kesintisiz düzlem üzerinde, saplamasız, yeterli aralıkla.
- Güç izleri ve vialar akıma göre boyutlandı; DRC temiz, düzlemler ve 1:1 çıktı kontrol edildi.

## Sırada ne var?

Derinleşmek için [[lesson:signal-integrity|sinyal bütünlüğü]] dersine bakın; kart geldiğinde [[lesson:bring-up|kartın ilk çalıştırılması]] dersine geçin.
`,
    en: `
## Why it matters

Placement decides most of the routing quality. If the decoupling capacitor is far from its pin, the crystal sits at the other end of the board or the noisy regulator is next to the analog input, no routing skill can rescue it. With a good placement the traces come out short and straight, layer changes are few and the ground plane stays whole.

This lesson gives a repeatable sequence: **constraints → floorplan → placement order → layer plan → routing order → review.**

## Before you place: what must be fixed first

- **Mechanical constraints:** board outline, positions of connectors and mounting holes, height limits, keep-outs. Lock them in the CAD tool; a connector that moves later upsets the whole placement.
- **Stack-up:** the number of layers and the job of each layer ([[lesson:stackup|stack-up]]).
- **Design rules and net classes:** the fabricator’s minimum trace, space and via ([[lesson:dfm|DFM]]); width for power nets, clearance for high voltage ([[lesson:spacing|spacing]]). Enter them before the first trace; rules entered later produce hundreds of errors.
- **List of critical nets:** switching power loops, clocks and crystals, fast differential pairs, sensitive analog inputs, nets that carry high current or high voltage. These are placed first and routed first.

## Floorplan: from block diagram to board regions

First turn the block diagram into regions on the board (a floorplan).

[[fig:floorplan]]

- **Signal flow:** arrange the blocks in the order the signal crosses the board; blocks that talk a lot are neighbours.
- **Connectors on the edges,** on the same or on adjacent edges if you can: cables act as antennas, and two cables on opposite edges are driven by the noise voltage across the board ground ([[lesson:grounding-emc|grounding and EMC]]).
- **Noisy apart from quiet:** switching regulators and motor drivers at one end, analog and RF at the other; the return current of a noisy block must not flow under the quiet region.
- **Power enters at one place and flows outwards:** the regulator next to the input, the heaviest load closest to it.
- **Spread out the heat sources** and keep them away from temperature sensors, crystals and electrolytic capacitors ([[lesson:thermal|thermal design]]).
- **Antenna on an edge or in a corner,** with the copper-free zone from its datasheet ([[lesson:rf-antennas|RF and antennas]]).

> [!TIP] Group each block on its own outside the board first, then move the groups in.

## Placement order

1. **Mechanically fixed parts:** connectors, mounting holes, buttons, indicators. Place and lock them.
2. **The main ICs:** processor, regulators, radio. Rotate them until the ratsnest lines uncross and the critical connections are shortest. If lines still cross, consider a pin swap before adding vias.
3. **Their critical companions:** decoupling capacitors at the pins ([[lesson:pdn|power distribution]]); the crystal and its load capacitors next to the oscillator pins; the series termination resistor at the driver output; the ESD/TVS diode at the connector, so the pulse goes to ground before it enters the board ([[lesson:esd-protection|ESD and protection]]).
4. **Power stages:** the hot loop first, then the inductor and the output ([[lesson:power-layout|power supply layout]]).
5. **Everything else:** pull-up resistors, LEDs, test points.

[[fig:decap-placement]]

The capacitor’s job is to supply the fast current the pin asks for from a small loop; every millimetre of thin trace in between adds roughly 0.5–1 nH. On boards without a power plane the order must be **supply → capacitor → pin**; on boards with planes the vias sit right next to the capacitor pads.

> [!QUIZ] A 100 nF decoupling capacitor sits 10 mm from its pin, connected by a 0.2 mm trace. How much impedance does this trace add at 100 MHz?
> At about 1 nH/mm that is 10 nH: X = 2π · f · L = 2π · 100 MHz · 10 nH ≈ 6.3 Ω. A mounted 0603 capacitor itself has about 1 nH (0.6 Ω), so the trace makes it ten times worse.

## Practical placement rules

The numbers are common habits; **your assembler’s rules always win.**

- **Grid:** snap the parts to a grid (e.g. 0.5 mm; 0.25 mm for small passives) and align them in rows; regular routing channels remain between them.
- **Orientation:** keep polarised parts and pin 1 marks in one or two orientations; a reversed part stands out at once.
- **Room:** courtyards (the placement boundary around a part) must not overlap; leave room for a soldering iron and hot air around connectors and QFN/BGA parts.
- **Ceramic capacitors** crack when the board flexes: keep them away from V-score lines, break-off tabs and screw holes, or put their long side parallel to the break line.
- **One side:** if the parts fit on one side, leave them there; single-sided assembly is cheaper.
- **Fiducials and test points:** reserve their places now; later there is no room.

## Layer plan before routing

- **2 layers:** parts, signals and power traces on top; the bottom is ground, as unbroken as possible.
- **4 layers:** L1 parts and signals, L2 solid GND, L3 power, L4 signals. Keep fast and sensitive nets on L1, right above GND.

[[calc:stackup|Stack-up tool]]

- **Direction:** route mostly horizontally on one signal layer and vertically on the other; the channels stay open.
- **Via strategy:** pick one signal via from the fabricator’s standard values (e.g. 0.3 mm hole, 0.6 mm pad) ([[lesson:vias|via and pad design]]). Do not line vias up in a long, tight row: their clearance holes in the plane merge into a slot.
- **Fan-out:** for fine-pitch ICs and BGAs, plan the escape from pad to via first. On a 0.8 mm pitch BGA with 0.4 mm pads, one trace fits between two pads with 0.1 mm trace and space; with 0.15 mm rules none does.

[[calc:fanout?p=0.8&p_u=mm&d=0.4&d_u=mm&w=0.1&w_u=mm&s=0.1&s_u=mm|0.8 mm BGA fan-out]]

## Routing order

Route the nets with the least room and the costliest mistakes first; ordinary signals fit into what is left.

| Step | Nets | What to watch |
|---|---|---|
| 1 | Fan-out and decoupling connections | Short, wide copper from pad to via |
| 2 | Critical nets: crystal, clocks, differential and impedance-controlled lines, sensitive analog, switching loops | Shortest path, solid plane underneath, few vias |
| 3 | Power distribution | Planes, pours or traces sized for the current; enough vias |
| 4 | Ordinary signals | Buses together; do not cut up the ground with long traces |
| 5 | Ground pour, stitching vias, clean-up | No unconnected copper islands, no needless vias |

## Routing craft

[[fig:routing-dos]]

- **Reference plane:** run every signal over a solid plane and never across a split. The return current flows under the trace; at a split it detours and the loop grows.
- **Layer changes:** if the signal changes its reference plane, give the return current a path too: a GND stitching via next to the signal via or, if the new reference is a power plane, a decoupling capacitor.
- **Width:** set by the current on current-carrying traces ([[lesson:trace-current|current-carrying traces]]) and by the impedance on fast lines ([[lesson:impedance|controlled impedance]]). For ordinary signals use a comfortable width (e.g. 0.2 mm), not the fabricator’s minimum; the yield is better.
- **Spacing:** keep clocks and sensitive nets away from their neighbours; the rule of thumb is 3W (at least three trace widths centre to centre). For two 0.2 mm traces 0.2 mm above the plane, widening the gap from 0.2 mm to 0.4 mm lowers the upper-bound crosstalk estimate from 20 % to 10 %.

[[calc:crosstalk?st=micro&s=0.4&s_u=mm&w=0.2&w_u=mm&h=0.2&h_u=mm|3W example]]

- **Differential pairs:** route the two traces side by side, symmetric and with a constant gap; no other trace or via between them.
- **Length matching:** only if the interface asks for it; put the serpentine near the end where the mismatch arises, so the pair stays in phase for the rest of the route.
- **No stubs:** do not branch a fast line with a T, the stub causes reflections; visit the receivers pad to pad (daisy chain).
- **Nothing underneath:** no signal under a crystal, a switching regulator’s inductor or the antenna; the crystal node picks up noise and the inductor’s field couples into traces.
- **Pads:** use thermal relief on through-hole pads that connect to a plane, otherwise the pad never gets hot enough to solder. No via in a pad; unless it is filled and capped, the solder runs into the hole.
- **45° corners:** a 90° corner is not a signal-integrity problem at ordinary speeds; its effect only shows above a few GHz. 45° is the convention: the path is shorter and no acute angles appear that can trap etchant (acid traps); DFM checks still flag those.

> [!RULE] Before you draw a trace, ask: where will its current return, and whose way will this trace block?

> [!QUIZ] Which do you route first: 20 GPIOs going to a pin header, or the processor’s 25 MHz crystal?
> The crystal. It needs a short path without vias and with unbroken ground under it; the GPIOs are slow and tolerate vias and detours. If the GPIOs go in first, their 20 traces block the crystal’s way.

## Two-layer boards

Most first boards have two layers: traces on top, ground on the bottom. Keeping that ground whole is harder here.

- **Short jumpers:** where traces must cross, take one through the bottom with a jumper of a few millimetres. Do not line jumpers up side by side: they merge into a slot that splits the ground.
- **Stitch ground islands:** tie every piece of top-side ground pour to the bottom ground with vias and delete islands you cannot connect.
- **Widen the power traces:** there is no power plane; distribute the supply with wide traces (e.g. 0.5–1 mm) that branch out from the regulator.

## Interactive routing vs the autorouter

Route with the interactive router in push-and-shove mode: you choose the path, and the tool pushes neighbouring traces aside while obeying the rules. A blind autorouter knows nothing about return paths or which net is critical; it often completes connections with extra vias and long traces that cut up the ground. If you use one, do so only after routing and locking the critical nets by hand.

> [!WARN] A board that passes DRC is not a board that works. DRC checks widths and clearances; return paths, loop areas and crosstalk are yours to check.

## Review pass before release

- **DRC clean and zero unrouted nets:** after re-pouring the zones.
- **Planes and return paths:** look at each plane layer on its own: any slots, necks or islands?
- **Silkscreen:** designators readable and not on pads; polarity and pin 1 marked.
- **3D and mechanical:** check the board together with its enclosure: connector positions, heights, screw heads.
- **1:1 print:** print the board at real size and put the parts on the paper; the cheapest way to catch a wrong footprint.

Then go through the [[lesson:dfm|DFM]] and [[lesson:schematic-review|schematic review]] lists.

## Example: a USB-powered sensor node

A 50 × 30 mm two-layer board with 1 oz copper: a USB connector (5 V only), a 3.3 V LDO, a microcontroller with a crystal, an I²C temperature sensor and a four-pin header.

1. **Constraints:** outline and holes locked, USB on a short edge. Rules: signals 0.2 mm, power 0.5 mm, via 0.3/0.6 mm. Critical nets: the crystal, 5 V and 3.3 V.
2. **Floorplan:** USB and LDO on the left, the processor in the middle, the sensor in the corner farthest from the LDO: at 100 mA the LDO dissipates (5 − 3.3) V · 0.1 A = 0.17 W.
3. **Placement:** the TVS diode at the connector; the processor turned so that the crystal pins face free space and the I²C pins face the sensor; a capacitor at every VDD pin; pull-ups, LED and test points last.
4. **Layer plan:** everything on top, the bottom is ground.
5. **Routing:** decoupling and crystal first, then 5 V and 3.3 V, then I²C and the header; pours and stitching vias last.

A USB 2.0 port supplies at most 0.5 A. For a 10 °C temperature rise the required width is only **0.08 mm**; but a 50 mm trace of that width is 0.32 Ω and drops 158 mV.

[[calc:trace?I=0.5&dT=10&L=50|Width needed for 0.5 A]]

A 0.5 mm trace carries **1.4 A** at the same rise, is 52 mΩ over 50 mm and drops only 26 mV at 0.5 A: here the width is set by voltage drop, not by heat.

[[calc:trace?mode=current&W=0.5&W_u=mm&dT=10&L=50|Capacity of a 0.5 mm trace]]

A single 0.3 mm via carries about **1.9 A** at a 10 °C rise; one via is enough for 0.5 A. Use two at supply transitions anyway: resistance and inductance drop, and the connection survives if one is plated badly.

[[calc:via?d=0.3&d_u=mm&L=1.6&p=25&I=0.5&dT=10|0.3 mm via, 0.5 A]]

> [!QUIZ] An output that draws 2 A from a 5 V adapter is added to the same board. Which width and how many vias does it need with 1 oz copper and a 10 °C rise?
> The trace calculator gives about 0.97 mm for 2 A; draw 1 mm or wider. One via carries 1.9 A, so you need at least two; use three for margin.

## Common mistakes

- Starting placement before the rules are entered, and routing before the placement has settled.
- Leaving the decoupling capacitors and the crystal until last.
- Routing across a split; chopping up the bottom side of a two-layer board with long traces.
- Skipping the mechanical check: the board arrives and the connector does not fit the enclosure.

## Checklist

- Outline, connectors and holes locked; stack-up and rules entered.
- The floorplan respects signal flow, noise, heat and the antenna.
- Decoupling capacitors at the pins, the crystal at the oscillator pins, protection at the connector.
- Critical nets routed first: over a solid plane, without stubs, with enough spacing.
- Power traces and vias sized for the current; DRC clean, planes and 1:1 print checked.

## What next?

To go deeper, see [[lesson:signal-integrity|signal integrity]]; when the board arrives, go on to [[lesson:bring-up|board bring-up]].
`,
  },
};
