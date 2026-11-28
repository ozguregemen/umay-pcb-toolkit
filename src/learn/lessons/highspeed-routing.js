import { figureFrom } from '../figures.js';
import { text, rect, circle, callout, dimH } from '../../ui/svg.js';

const S = {
  tr: {
    pvCap: 'Diferansiyel çiftin L1’den (düz çizgi) L4’e (kesikli) geçişi, üstten görünüş. Solda: iki sinyal viası yan yanadır ve her birinin yanındaki toprak viası dönüş akımına iki referans düzlemi arasında yol verir. Sağda: kaydırılmış vialar çifti bir süre ayırır; yakında toprak viası olmadığı için dönüş akımı yolunu kendi bulmak zorundadır.',
    pvGood: '✓ simetrik + 2 GND viası',
    pvBad: '✗ kaydırılmış, GND viası yok',
    spCap: 'Uzunluk ayarı, üstten görünüş. Solda: komşu kolları arasında iz–düzlem yüksekliğinin (h) birkaç katı aralık olan, 45° köşeli serpantin. Ortada: sıkışık kollar birbirine kuplaj yapar; sinyal kestirmeden gider ve gecikme, eklenen uzunluğun vereceğinden az olur. Sağda: çiftte dönüşün iç tarafındaki iz kısadır; dönüşten hemen sonra bu ize eklenen küçük bir tümsek farkı kapatır.',
    spWide: 'S: birkaç h',
    spGood: '✓ aralıklı kıvrım',
    spBad: '✗ sıkışık kıvrım',
    spBump: '✓ dönüşte telafi',
    inner: 'iç iz',
    outer: 'dış iz',
    ccCap: 'Konnektör bölgesi, sinyalin gördüğü sırayla, üstten görünüş: 1 konnektör, 2 toprak viası dibinde olan ESD koruması, 3 ortak mod bobini (isteğe bağlı, kesikli), 4 arayüz istiyorsa AC kuplaj kondansatörleri, 5 entegre. Çift padlerin üzerinden düz geçer; hiçbir yerde dallanmaz.',
    c1: '1 konnektör',
    c2: '2 ESD: kısa GND yolu',
    c3: '3 ortak mod bobini',
    c4: '4 AC kuplaj kondansatörleri',
    c5: '5 entegre',
  },
  en: {
    pvCap: 'A differential pair changing from L1 (solid) to L4 (dashed), top view. Left: the two signal vias sit side by side, and a ground via next to each gives the return current a path between the two reference planes. Right: staggered vias split the pair for a stretch, and with no ground via nearby the return current has to find its own way.',
    pvGood: '✓ symmetric + 2 GND vias',
    pvBad: '✗ staggered, no GND via',
    spCap: 'Length tuning, top view. Left: a serpentine with 45° corners whose neighbouring segments are several trace-to-plane heights (h) apart. Middle: tightly folded segments couple to each other; the signal takes a short cut and the delay is less than the added length suggests. Right: in a pair the trace on the inside of a bend is shorter; a small bump on it, right after the bend, closes the gap.',
    spWide: 'S: several h',
    spGood: '✓ well spaced',
    spBad: '✗ tightly folded',
    spBump: '✓ bump at the bend',
    inner: 'inner',
    outer: 'outer',
    ccCap: 'The connector region in the order the signal sees it, top view: 1 connector, 2 ESD protection with its ground via right at the part, 3 common-mode choke (optional, dashed), 4 AC-coupling capacitors where the interface requires them, 5 the IC. The pair runs straight across the pads and never branches.',
    c1: '1 connector',
    c2: '2 ESD: short ground path',
    c3: '3 common-mode choke',
    c4: '4 AC-coupling capacitors',
    c5: '5 IC',
  },
};

/** Copper trace of stroke width w (plain numbers only); dashed = on the other signal layer. */
const trace = (d, w, dashed = false) => `<path class="cutr${dashed ? ' dash' : ''}" style="stroke-width:${w}" d="${d}"/>`;
/** Via seen from above: copper pad with its hole. */
const via = (x, y) => circle(x, y, 5.5, 'cu') + circle(x, y, 2.2, 'hole');

/** One top-view panel (local coordinates, 200 wide): a pair going from L1 to L4 over the GND plane. */
function pairViaPanel(good, s) {
  // Board, the GND plane (light copper) and the antipads around the signal vias.
  let b = rect(0, 8, 200, 124, 'soft', ' rx="3"') + rect(6, 14, 188, 112, 'cu plane');
  if (good) {
    // Vias side by side at the same point of the pair, a GND via next to each.
    b += circle(96, 52, 11, 'hole') + circle(96, 88, 11, 'hole')
      + trace('M6,63H76L87,52H96', 5) + trace('M6,77H76L87,88H96', 5)
      + trace('M96,52H105L116,63H194', 5, true) + trace('M96,88H105L116,77H194', 5, true)
      + via(96, 52) + via(96, 88) + via(96, 26) + via(96, 114)
      + text(107, 30, 'GND', { cls: 'name', anchor: 'start', size: 11 })
      + text(107, 118, 'GND', { cls: 'name', anchor: 'start', size: 11 })
      + callout(88, 96, 62, 114, 'antipad', { anchor: 'end' });
  } else {
    // Staggered vias: between them the two halves run on different layers; no GND via.
    b += circle(78, 63, 11, 'hole') + circle(132, 77, 11, 'hole')
      + trace('M6,63H78', 5) + trace('M6,77H132', 5)
      + trace('M78,63H194', 5, true) + trace('M132,77H194', 5, true)
      + via(78, 63) + via(132, 77)
      + circle(105, 70, 36, 'wire bad');
  }
  b += text(30, 53, 'L1', { size: 10 }) + text(168, 53, 'L4', { size: 10 })
    + text(100, 148, good ? s.pvGood : s.pvBad, { cls: good ? 'okt' : 'badt' });
  return b;
}

function pairVia(lang) {
  const s = S[lang] ?? S.en;
  return figureFrom(420, 158, s.pvCap,
    `<g transform="translate(6,0)">${pairViaPanel(true, s)}</g><g transform="translate(214,0)">${pairViaPanel(false, s)}</g>`);
}

/** Three cells: a well-spaced serpentine, a tightly folded one, and a bump inside a pair after a bend. */
function serpentine(lang) {
  const s = S[lang] ?? S.en;
  const cell = (col, body, label, ok) => `<g transform="translate(${8 + col * 138},6)">${
    rect(0, 0, 128, 96, 'soft', ' rx="3"')}${body}${text(64, 112, label, { cls: ok ? 'okt' : 'badt' })}</g>`;
  // 1 · Neighbouring segments several h apart, 45° corners.
  const wide = trace('M4,70H28L36,62V46L44,38H50L58,46V62L66,70H72L80,62V46L88,38H94L102,46V62L110,70H124', 3)
    + dimH(36, 58, 26, s.spWide, { cls: 'lbl', extFrom: 44 });
  // 2 · Segments one trace width apart, folded tight.
  const tight = rect(24, 30, 66, 46, 'zone-bad', ' rx="3"')
    + trace('M4,70H30V36H36V70H42V36H48V70H54V36H60V70H66V36H72V70H78V36H84V70H124', 3)
    + dimH(30, 36, 24, 'S ≈ w', { cls: 'lbl', extFrom: 34 });
  // 3 · Pair turning by 90°: the inner trace is shorter and gets a bump right after the bend.
  const bump = trace('M4,76H76L96,56V4', 3) + trace('M4,64H71L84,51V44L77,37V27L84,20V4', 3)
    + text(60, 36, '+ΔL', { cls: 'val', size: 11 })
    + text(30, 56, s.inner, { size: 10 }) + text(30, 90, s.outer, { size: 10 });
  return figureFrom(420, 126, s.spCap,
    cell(0, wide, s.spGood, true) + cell(1, tight, s.spBad, false) + cell(2, bump, s.spBump, true));
}

/** Connector → ESD → common-mode choke → AC capacitors → IC, with the pair running straight through. */
function connectorChain(lang) {
  const s = S[lang] ?? S.en;
  const num = (x, y, n) => text(x, y, String(n), { cls: 'val' });
  let b = rect(14, 10, 392, 92, 'soft', ' rx="5"');
  // 2 · ESD array with its ground via right at the part; the pair crosses its pads.
  b += rect(88, 36, 24, 38, 'comp', ' rx="2"') + trace('M100,72V85', 5) + via(100, 85)
    + text(110, 89, 'GND', { cls: 'name', anchor: 'start', size: 10 });
  // The pair, from the connector pads to the IC pins.
  b += trace('M44,48H332', 4) + trace('M44,60H332', 4);
  // 1 · Connector on the board edge.
  b += rect(6, 30, 40, 48, 'comp', ' rx="2"') + rect(40, 45, 10, 6, 'cu') + rect(40, 57, 10, 6, 'cu') + num(24, 58, 1);
  // 3 · Common-mode choke, in series; dashed because it is optional.
  b += rect(162, 38, 32, 32, 'comp dash', ' rx="2"') + num(178, 58, 3);
  // 4 · AC-coupling capacitors: one per line, side by side.
  for (const y of [48, 60]) b += rect(256, y - 5, 20, 10, 'comp') + rect(256, y - 5, 6, 10, 'cu') + rect(270, y - 5, 6, 10, 'cu');
  // 5 · IC with its two pins.
  b += rect(328, 45, 8, 6, 'cu') + rect(328, 57, 8, 6, 'cu') + rect(336, 24, 56, 60, 'comp', ' rx="3"') + num(364, 58, 5);
  b += num(100, 30, 2) + num(266, 34, 4);
  // Labels in two rows so that neighbours cannot collide.
  b += text(10, 118, s.c1, { anchor: 'start', size: 10 }) + text(178, 118, s.c3, { size: 10 }) + text(364, 118, s.c5, { size: 10 })
    + text(100, 132, s.c2, { size: 10 }) + text(266, 132, s.c4, { size: 10 });
  return figureFrom(420, 142, s.ccCap, b);
}

export default {
  figures: { 'pair-via': pairVia, serpentine, 'connector-chain': connectorChain },
  body: {
    tr: `
## Neden önemli?

[[lesson:impedance|Kontrollü empedans]] dersi, hızlı bir sinyalin neden kontrollü bir hatta ve kesintisiz bir dönüş yoluna ihtiyaç duyduğunu anlatır. Bu ders işin uygulamasıdır: çift konnektörden entegreye nasıl çekilir, katman değişimi ne ister, uzunluk nasıl ayarlanır, konnektörün dibinde ne nereye konur. Örnekler dört katmanlı bir kartta (L1 sinyal, L2 GND, L3 güç, L4 sinyal) USB, Ethernet ve bir bellek veri yoludur; sayılar, kaynaklarını da gösteren arayüz aracından alınmıştır.

Bir arayüzü "hızlı" yapan saat frekansı değil, kenar hızıdır: iz, kenarın iz üzerindeki uzunluğunun kabaca altıda birini geçince iletim hattı gibi davranır ([[lesson:signal-integrity|sinyal bütünlüğü]]).

## Her arayüzde aynı olan yöntem

1. **Katman başına empedans sınıfı.** Hedefi arayüzden alın (USB için 90 Ω, Ethernet için 100 Ω); genişliği ve boşluğu, kullanacağınız her katman için üreticinin [[lesson:stackup|katman yığınından]] hesaplayın. 0,2 mm prepreg (εr 4,3) üzerinde 0,2 mm boşlukla 90 Ω yaklaşık 0,30 mm’lik, 100 Ω yaklaşık 0,24 mm’lik izler ister. Değerleri net sınıfı olarak girin ([[lesson:design-rules|kural kurulumu]]).
2. **Yol boyunca tek ve kesintisiz bir referans düzlemi.** Dört katmanlı kartta bu, GND düzleminin üzerindeki L1’dir. Çiftin altında yarık, boşluk ya da via sırası olmasın: dönüş akımı izlerin tam altından akar.
3. **Çift, çift olarak kalır.** İki iz yan yana, simetrik ve sabit boşlukla gider; yalnızca padlerin dibinde, olabildiğince kısa bir bölümde ayrılır.
4. **Önce en kısa yol, sonra ayar.** Önce doğrudan bağlantıyı çizin; sonra yalnızca arayüzün istediği kadar uzunluk ekleyin.
5. **Olabildiğince az katman değişimi.** Her via bir süreksizliktir ve kendi dönüş yolunu ister.
6. **Koridorda başka hiçbir şey yok.** Aracın genel kaynağı olan TI kılavuzu (SPRAAR7J) diğer çiftlere 5 iz genişliği, diğer sinyallere 30 mil (0,76 mm), saatlere 50 mil (1,27 mm) mesafe ister.

[[calc:impedance?mode=synth&st=diffMicrostrip&Z=90&s=0.2&s_u=mm&t=35&h=0.2&h_u=mm&er=4.3|L1’de 90 Ω çift]]

> [!RULE] İşin yarısı yerleşimdir: konnektör, koruma ve entegre aynı hizada ve birbirine yakın dursun. Kısa ve düz bir çift, aşağıdaki önlemlerin çok azına ihtiyaç duyar.

## Katman değişimi

Via sinyali başka bir katmana taşır; dönüş akımı da aynı yerde düzlem değiştirmek zorundadır.

[[fig:pair-via]]

- **İki via birlikte ve simetrik:** yan yana ve iki izde de aynı noktada. Kaydırılmış vialar çifti ayırır ve uzunluk farkı ekler.
- **Her sinyal viasının yanına bir dönüş viası.** İki katmanın referansı da topraksa (L2’nin üzerindeki L1; L3’teki bir toprak dökümüne bakan L4) sinyal viasının yanındaki GND viası iki düzlemi birleştirir. TI bu viayı 200 mil (≈ 5 mm) içinde ister; ne kadar yakınsa o kadar iyidir.
- **Topraktan güç düzlemine:** dört katmanlı kartta L4, L3’teki güç düzlemine bakar. GND viası GND ile 3,3 V’u birleştiremez; dönüş akımı için viaların yanına, iki düzlem arasına bir dikiş kondansatörü gerekir (araçtaki AMD DDR kılavuzu: 300 mil içinde 0,1 µF). Daha iyisi L1’de kalmaktır.
- **Antipad:** vianın düzlemlerdeki boşluğu dar kalırsa via kapasitif bir çukur olur; TI hızlı çiftlerde yaklaşık 30 mil verir.
- **Stub (saplama):** L1’den L4’e giden via gövdesinin tamamını kullanır; stub kalmaz. Stub, sinyal daha kalın bir yığında iç katmandan ayrıldığında oluşur. Altı katmanlı, 1,6 mm’lik bir kartta L3’ten ayrılan sinyal yaklaşık 1,2 mm stub bırakır; bu parça FR-4’te 30 GHz civarında çeyrek dalga rezonansına girer. USB 2.0 ve Ethernet için bu çok uzaktadır; 5–10 Gbit/s’lik çiftlerde TI stub’ı 15 mil’in (0,38 mm) altında tutar, uzunsa geri deldirir (back-drill).

[[calc:via?d=0.3&d_u=mm&L=1.6&stub=1.2&stub_u=mm&er=4.3|1,2 mm’lik via stub’ı]]

> [!QUIZ] Dört katmanlı kartta (L2 GND, L3 3,3 V düzlemi) bir USB 3 çifti L1’den L4’e geçmek zorunda. Her sinyal viasının yanına bir GND viası koydunuz. Dönüş yolu tamam mı?
> Hayır. L1’de dönüş akımı L2’den (GND), L4’te ise L4’e komşu düzlemden, yani L3’ten (3,3 V) akar; GND viaları o düzleme bağlı değildir. Viaların dibine GND ile 3,3 V arasına bir dikiş kondansatörü koyun ya da, daha iyisi, L4’teki bölümün karşısında L3’ü toprak dökümü yapın ki GND viaları iki referansı gerçekten birleştirsin.

## Uzunluk ayarı

- **Önce çiftin içinde, farkın oluştuğu yerde.** Dönüşler ile konnektörün ve entegrenin pin dizilişi izlerden birini kısaltır. Farkı hemen orada, kısa ize eklenen birkaç küçük tümsekle (bump) kapatın ki iki sinyal yolun geri kalanında karşıt fazda kalsın; yalnızca uzak uçta düzeltilen fark, bütün yol boyunca ortak mod gürültüsü olarak taşınır.
- **Serpantin (serpentine) geometrisi:** komşu kollar arasında iz–düzlem yüksekliğinin (h) birkaç katı aralık bırakın (pratik kural). Kollar yakınsa birbirine kuplaj yapar; sinyal kestirmeden gider ve gecikme, eklenen uzunluğun vereceğinden az olur. Köşeler 45° olsun: TI her kıvrımın 135°’den geniş olmasını ister.
- **Çiftler arasında ya da grup içinde eşleme, yalnızca arayüz istiyorsa.** USB 3 ve PCIe’de TX ile RX çiftlerinin birbirine eşlenmesi gerekmez; HDMI, MIPI ve DDR’de grup sınırları vardır. Her serpantin yer kaplar, kayıp ve karışma ekler.

Süre sınırı, uzunluğa kartın gecikmesiyle çevrilir; arayüz aracı bunu εr’den hesaplar: FR-4’te (εr 4,3) dış katmanda 5,49 ps/mm, iç katmanda 6,92 ps/mm. Grup iki katmanı da kullanıyorsa uzunluğu değil gecikmeyi eşleyin. MIPI D-PHY 2,5 Gbit/s’de çift içinde 8 ps’ye, veri şeridi ile saat şeridi arasında 40 ps’ye izin verir (TI SPRAAR7J): dış katmanda 1,46 mm ve 7,28 mm.

[[calc:interfaces?iface=mipi&st=microstrip&er=4.3|MIPI D-PHY: ps ⇄ mm]]

[[fig:serpentine]]

> [!QUIZ] Yönlendirmeden sonra L1’deki bir USB 3 çiftinde P izi N’den 0,5 mm uzun çıktı. Araçtaki sınır 5 mil (TI). Geçer mi; ne yaparsınız?
> Geçmez: 5 mil 0,127 mm’dir. 5,49 ps/mm ile 0,5 mm’lik fark 2,75 ps skew eder; sınır 0,70 ps’dir. Farkın nerede oluştuğunu bulun (çoğunlukla bir dönüş ya da pin çıkışı) ve N’ye tam orada küçük bir tümsek ekleyin. Aynı 0,5 mm, sınırı 50 mil (1,27 mm) olan bir USB 2.0 çiftinde ayarsız geçer.

[[calc:interfaces?iface=usb3&st=microstrip&er=4.3&x=0.5&x_u=mm|USB 3: 0,5 mm fark]]

## Konnektör bölgesi

Kablo, karta ESD darbesi ve ortak mod gürültüsü getirir; parçaların sırası bu yüzden önemlidir.

[[fig:connector-chain]]

1. **Konnektör.** Delikli (THT) konnektörde bağlantıyı karşı yüzden yapın; pin yolun parçası olur, stub olmaz.
2. **ESD koruması en başta:** konnektöre olabildiğince yakın, toprak viası parçanın dibinde; darbe başka bir şeye ulaşmadan toprağa akmalıdır ([[lesson:esd-protection|ESD ve koruma]]). Çift, parçanın padlerinin üzerinden düz geçer; dallanmaz. Kapasitesi hıza uymalıdır: USB 2.0’da 4 pF’ın, 5 Gbit/s’de 0,5 pF’ın altı (TI).
3. **Ortak mod bobini,** EMC gerektiriyorsa: ESD’den sonra.
4. **AC kuplaj kondansatörleri,** yalnızca arayüz istiyorsa: USB 3, PCIe ve SATA ister; USB 2.0 ve HDMI DC kuplajlıdır. Bobinin entegre tarafında, her hatta bir tane, yan yana.
5. **Entegre.**

- **Küçük padler:** izden geniş bir seri pad, kısa bir düşük empedans parçasıdır. 0402 ya da daha küçüğünü seçin; TI çok gigabitlik çiftlerde bu padlerin altındaki referans düzlemini de boşaltır.
- **Stub yok:** çiftin üzerinde test noktası, dallanma ya da takılmayan seçenek parçaların boşta kalan padleri olmasın.

> [!TIP] Konnektörün pin sırası entegreninkine ters düşüyorsa çifti viayla çaprazlamak yerine parçayı döndürün ya da öbür yüze alın.

## USB 2.0 ve USB 3.x

- **USB 2.0:** tek çift (D+/D−), 90 Ω ±%10, DC kuplajlı. Çift içi fark en çok 50 mil (1,27 mm) (TI); iz başına en çok 4 via, stub ve test noktası yok.
- **USB 3.x:** şerit başına bir TX ve bir RX çifti ekler; 90 Ω ±%10. Çift içi fark en çok 5 mil (0,127 mm); TX ile RX’in birbirine eşlenmesi gerekmez. İz başına en çok 2 via, iki hatta aynı sayıda.
- **AC kondansatörleri:** yalnızca TX çiftinde, 75–265 nF (tipik 220 nF), 0402. RX çiftininkiler kablonun öbür ucunda, vericinin kartındadır.
- **Polarite:** SuperSpeed alıcısı, bağlantı eğitimi sırasında P ile N’nin yer değiştirdiğini algılar ve düzeltir; bir çaprazlamadan kurtulmak için bir SuperSpeed çiftinin P ve N’si değiştirilebilir (denetleyicinin kılavuzuna bakın). D+ ile D− asla değiştirilmez.
- **Ayrı tutun:** USB 2.0 çifti ile SuperSpeed çiftleri arasında 5 iz genişliği bırakın (TI); D+/D−’yi onların arasından geçirmeyin.

## Ethernet

**MDI tarafı** (PHY ↔ manyetik ↔ RJ45): 10/100’de iki, 1000BASE-T’de dört çift.

- 100 Ω ±%10; çift içi fark en çok 20 mil (0,51 mm), 10/100 için 50 mil yeter (TI SNLA387).
- MDI yolunun tamamı 2 in’den (51 mm) kısa, her çift tek katmanda; farklı çiftler arasında en az 30 mil (0,76 mm).
- **Manyetiğin altında hiçbir katmanda bakır yok** (manyetiği içinde olan RJ45 hariç): trafo yalıtım bariyeridir; altındaki bakır gürültüyü bariyerin öbür yanına kuplar.
- **Yalıtım boşluğu:** kablo tarafı (RJ45 ekranı, Bob Smith sonlandırması) kendi şasi adasındadır ve devre toprağından bir boşlukla ayrılır. TI en az 20 mil verir; ürününüze bir güvenlik standardı uygulanıyorsa mesafeyi o belirler ([[lesson:spacing|aralıklar]]).
- ESD koruması manyetiğin PHY tarafına konur (TI): kablo tarafında büyük ortak mod salınımları olur.

**MAC tarafı (RGMII):** her yönde 4 veri, 1 kontrol ve 1 saat hattı; tek uçlu, 50 Ω ±%10, veri saatin iki kenarında (1 Gbit/s’de 125 MHz).

- TXD[3:0] ile TX_CTL’yi kendi aralarında, RXD ile RX_CTL’yi de kendi aralarında eşleyin: 11 ps’nin altında (TI DP83867), dış katmanda yaklaşık 2 mm.
- **Saat–veri gecikmesi:** saat alıcıya veriden 1,5–2,0 ns sonra varmalıdır. İlk RGMII bunu uzatılmış bir saat iziyle yapar; RGMII-ID gecikmeyi MAC’in ya da PHY’nin içinde ekler ve kartta yalnızca uzunlukları eşlemek kalır. Her yön için gecikmeyi hangi tarafın ekleyeceğine şemada karar verin: bir kez eklenir; iki kez ya da hiç değil.

> [!QUIZ] MAC’iniz de PHY’niz de RGMII saat gecikmesini ekleyemiyor. Saat izi veri izlerinden ne kadar uzun olmalı?
> En az 1,5 ns kadar. FR-4’te iç katmanda (εeff = 4,3; 6,92 ps/mm) bu, 1500 ps / 6,92 ps/mm ≈ 217 mm ek iz demektir; dış katmanda (5,49 ps/mm) yaklaşık 273 mm. Bu boyda bir serpantin, gecikmeyi içinde ekleyebilen bir parça seçmek için yeterli sebeptir.

[[calc:signal?er=4.3&sk=1.5&sk_u=ns|1,5 ns kaç mm eder?]] [[calc:interfaces?iface=eth&eth=rgmii|RGMII kuralları]]

## Bellek veri yolu: DDR3 ve DDR4

- **İki tür grup.** Veri: her bayt şeridi (byte lane) 8 DQ, DM ve kendi DQS strobe çiftinden oluşur; denetleyici ile bellek arasında noktadan noktaya gider. Adres, komut ve kontrol hatları saat çifti CK ile birlikte yol alır.
- **Fly-by.** Birden çok bellek varsa CK ve adres/komut hatları belleklere sırayla uğrar ve sonda sonlandırılır (DDR3: VTT’ye 39,2 Ω; TI). Veri hatlarında kartta direnç yoktur: sonlandırma yongaların içindedir (ODT). Saat her belleğe farklı anda varır; denetleyici bunu ölçüp telafi eder (write leveling). Bu yüzden bayt şeritleri birbirine eşlenmez; yalnızca kılavuzun verdiği DQS–CK penceresinde kalırlar.
- **Eşleme grubun içindedir.** DQ ve DM kendi DQS’ine ±10 ps, DQS çifti kendi içinde 2 ps, adres/komut CK’ye ±8 ps içinde (AMD UG583; başka üreticilerde farklıdır). Uzunluğu değil gecikmeyi eşleyin: via ve kılıf gecikmeleri de sayılır.
- **Yerleşim alışkanlıkları:** bir bayt şeridinin tamamı tek katmanda, her hattında aynı sayıda viayla (en çok 2), kesintisiz bir düzlemin üzerinde; tek uçlu 40 Ω civarı.
- **Neden denetleyici üreticisinin kılavuzu?** Sayılar denetleyiciye bağlıdır: kılıf gecikmeleri, eğitimin neyi düzeltebildiği, sürücü ayarları. Kaynaklar birbirini tutmaz (DQS için 76–100 Ω); kılavuz çoğu zaman kopyalanabilecek, denenmiş bir yerleşimle gelir ve dört katmanın yetip yetmediğini söyler.

[[calc:interfaces?iface=ddr4&grp=data|DDR4 veri grubu]]

## Özet tablo

Değerler arayüz aracından alınmıştır; kaynakları parantez içindedir.

| Arayüz | Empedans | Eşleme | Özel olan |
|---|---|---|---|
| USB 2.0 | 90 Ω ±%10 dif. | çift içi ≤ 50 mil (TI) | DC kuplajlı; stub ve test noktası yok |
| USB 3.x | 90 Ω ±%10 dif. | çift içi ≤ 5 mil (TI); TX–RX eşlenmez | TX’te 75–265 nF; ≤ 2 via; stub < 15 mil |
| Ethernet MDI | 100 Ω ±%10 dif. | çift içi ≤ 20 mil (TI) | < 51 mm; manyetiğin altında bakır yok |
| RGMII | 50 Ω ±%10 | veri ve CTL kendi aralarında < 11 ps (TI) | saat veriden 1,5–2,0 ns sonra |
| DDR3/DDR4 veri | 40 Ω ±%10 | DQ–DQS ±10 ps; DQS çifti 2 ps (AMD) | bayt tek katmanda; ODT; gecikme eşlenir |
| MIPI D-PHY | 100 Ω ±%15 dif. | çift içi 8 ps; şerit–saat 40 ps (TI; 2,5 Gbit/s) | gevşek kuplajlı çift (LP modu) |

[[calc:interfaces|PCIe, SATA, HDMI ve diğer arayüzler]]

> [!WARN] Üreticiler farklı değerler verir: kendi yonganızın yerleşim kılavuzu ile arayüz spesifikasyonu bu değerlerden her zaman önce gelir.

## Sık yapılan hatalar

- Hızlı bir çifti düzlem yarığının ya da bir konnektörün via sırasının üzerinden geçirmek.
- Dönüş viası olmadan, ya da topraktan güç düzlemine kondansatörsüz katman değiştirmek.
- Farkı oluştuğu yerde kapatmak yerine uzak uca tek, sıkışık bir serpantin koymak.
- Eşleme istemeyeni eşlemek (USB 3’te TX ile RX), isteyeni atlamak (DQ ile DQS).
- ESD parçasını bir dala bağlamak; Ethernet manyetiğinin altında bakır bırakmak; RGMII gecikmesini iki kez açmak ya da hiç açmamak.

## Kontrol listesi

- Katman başına empedans sınıfı gerçek katman yığınından hesaplandı; hedef üreticiye bildirildi.
- Her hızlı yolun altında kesintisiz düzlem var; çiftler simetrik ve sabit boşluklu; koridor boş.
- Katman değişimleri: vialar çift hâlinde, dönüş viası ya da dikiş kondansatörü var, stub kontrol edildi.
- Çift içi fark oluştuğu yerde kapatıldı; grup eşlemesi yalnızca gereken yerde, ps cinsinden.
- Konnektör bölgesi sırasında, stub yok; değerler araçla ve yonganın yerleşim kılavuzuyla karşılaştırıldı.

## Sırada ne var?

Kablo tarafındaki gürültü ve şasi bağlantısı için [[lesson:grounding-emc|topraklama ve EMC]] dersine bakın; sıradaki ders [[lesson:rf-antennas|RF ve antenler]].
`,
    en: `
## Why it matters

The [[lesson:impedance|controlled impedance]] lesson explains why a fast signal needs a controlled line and an unbroken return path. This lesson is the practice: how a pair is laid from the connector to the IC, what a layer change needs, how length is tuned and what goes where at the connector. The examples are USB, Ethernet and a memory bus on a four-layer board (L1 signals, L2 GND, L3 power, L4 signals); the numbers come from the interfaces tool, which names their sources.

What makes an interface "high-speed" is its edge rate, not its clock frequency: a trace longer than roughly a sixth of the length the edge occupies on it behaves as a transmission line ([[lesson:signal-integrity|signal integrity]]).

## The same procedure for every interface

1. **An impedance class per layer.** Take the target from the interface (90 Ω for USB, 100 Ω for Ethernet) and calculate width and gap from the fabricator’s [[lesson:stackup|stack-up]] for every layer you will use. Over 0.2 mm of prepreg (εr 4.3) with a 0.2 mm gap, 90 Ω needs traces of about 0.30 mm and 100 Ω of about 0.24 mm. Enter them as net classes ([[lesson:design-rules|design rules]]).
2. **One unbroken reference plane along the whole route.** On the four-layer board that is L1 above the GND plane. No split, void or row of vias under the pair: the return current flows directly below the traces.
3. **The pair stays a pair.** Both traces run side by side, symmetric and with a constant gap; they separate only at the pads, as briefly as possible.
4. **Shortest path first, tuning afterwards.** Route the direct connection, then add only the length the interface asks for.
5. **As few layer changes as possible.** Every via is a discontinuity and needs a return path of its own.
6. **Nothing else in the corridor.** TI’s guideline (SPRAAR7J), the tool’s general source, asks for 5 trace widths to other pairs, 30 mil (0.76 mm) to other signals and 50 mil (1.27 mm) to clocks.

[[calc:impedance?mode=synth&st=diffMicrostrip&Z=90&s=0.2&s_u=mm&t=35&h=0.2&h_u=mm&er=4.3|90 Ω pair on L1]]

> [!RULE] Half of the job is placement: connector, protection and IC in one line and close together. A short, straight pair needs few of the measures below.

## Layer changes

A via takes the signal to another layer; its return current has to change planes at the same place.

[[fig:pair-via]]

- **Both vias together and symmetric:** side by side, at the same point of both traces. Staggered vias split the pair and add a length mismatch.
- **A return via next to each signal via.** If both layers refer to ground (L1 above L2; L4 facing a ground pour on L3), a GND via beside the signal via joins the two planes. TI wants it within 200 mil (≈ 5 mm); the closer the better.
- **From ground to a power plane:** on the four-layer board L4 faces the power plane on L3. A GND via cannot join GND and 3.3 V; the return current needs a stitching capacitor between the two planes next to the vias (AMD’s DDR guideline in the tool: 0.1 µF within 300 mil). Better still, stay on L1.
- **Antipad:** a tight clearance in the planes makes the via a capacitive dip; TI gives about 30 mil for fast pairs.
- **Stubs:** a via used from L1 to L4 uses its whole barrel, so no stub remains. A stub appears when the signal leaves on an inner layer of a thicker stack. On a six-layer, 1.6 mm board a signal that leaves on L3 keeps about 1.2 mm of stub, a quarter-wave resonator near 30 GHz in FR-4. That is far away for USB 2.0 and Ethernet; on 5–10 Gbit/s pairs TI keeps stubs below 15 mil (0.38 mm) and back-drills longer ones.

[[calc:via?d=0.3&d_u=mm&L=1.6&stub=1.2&stub_u=mm&er=4.3|A 1.2 mm via stub]]

> [!QUIZ] On the four-layer board (L2 GND, L3 a 3.3 V plane) a USB 3 pair has to change from L1 to L4. You put a GND via next to each signal via. Is the return path complete?
> No. On L1 the return current flows in L2 (GND); on L4 it flows in the plane next to L4, which is L3 (3.3 V), and the GND vias are not connected to that plane. Place a stitching capacitor between GND and 3.3 V right at the vias or, better, make L3 a ground pour opposite the L4 section, so that the GND vias really join the two references.

## Length tuning

- **Inside the pair first, where the mismatch arises.** Bends and the pin order of connector and IC make one trace shorter. Close the gap right there with a few small bumps on the shorter trace, so that the two signals stay in opposite phase for the rest of the route; a mismatch corrected only at the far end travels the whole way as common-mode noise.
- **Serpentine geometry:** keep neighbouring segments several trace-to-plane heights (h) apart (a rule of thumb). Closer segments couple; the signal takes a short cut and the delay is less than the added length suggests. Use 45° corners: TI wants every bend wider than 135°.
- **Between pairs or within a group only when the interface asks for it.** USB 3 and PCIe do not need TX and RX pairs matched to each other; HDMI, MIPI and DDR do have group limits. Every serpentine takes room and adds loss and crosstalk.

A time limit becomes a length through the board’s delay, which the interfaces tool calculates from εr: on FR-4 (εr 4.3) 5.49 ps/mm on an outer layer and 6.92 ps/mm on an inner layer. If a group uses both, match delay, not length. MIPI D-PHY at 2.5 Gbit/s allows 8 ps inside a pair and 40 ps between a data lane and the clock lane (TI SPRAAR7J): 1.46 mm and 7.28 mm on an outer layer.

[[calc:interfaces?iface=mipi&st=microstrip&er=4.3|MIPI D-PHY: ps ⇄ mm]]

[[fig:serpentine]]

> [!QUIZ] After routing, the P trace of a USB 3 pair on L1 is 0.5 mm longer than N. The limit in the tool is 5 mil (TI). Does it pass, and what do you do?
> It fails: 5 mil is 0.127 mm. At 5.49 ps/mm a 0.5 mm mismatch is 2.75 ps of skew; the limit is 0.70 ps. Find where the difference arises (usually a bend or the pin escape) and add a small bump to N right there. The same 0.5 mm passes untuned on a USB 2.0 pair, whose limit is 50 mil (1.27 mm).

[[calc:interfaces?iface=usb3&st=microstrip&er=4.3&x=0.5&x_u=mm|USB 3: 0.5 mm mismatch]]

## The connector region

A cable brings ESD pulses and common-mode noise onto the board, so the order of the parts matters.

[[fig:connector-chain]]

1. **Connector.** With a through-hole receptacle, connect on the far side; the pin is then part of the path, not a stub.
2. **ESD protection first:** as close to the connector as possible, with its ground via right at the part; the pulse must reach ground before anything else ([[lesson:esd-protection|ESD and protection]]). The pair runs straight across its pads, never on a branch. Its capacitance must suit the speed: under 4 pF for USB 2.0, under 0.5 pF at 5 Gbit/s (TI).
3. **Common-mode choke,** if EMC needs one: after the ESD part.
4. **AC-coupling capacitors,** only where the interface requires them: USB 3, PCIe and SATA do; USB 2.0 and HDMI are DC-coupled. On the IC side of the choke, one in each line, side by side.
5. **IC.**

- **Small pads:** a series pad wider than the trace is a short piece of lower impedance. Choose 0402 or smaller; on multi-gigabit pairs TI also voids the reference plane under these pads.
- **No stubs:** no test point, no branch and no idle pads of unfitted option parts on the pair.

> [!TIP] If the connector’s pin order is the reverse of the IC’s, rotate the part or move it to the other side instead of crossing the pair with vias.

## USB 2.0 and USB 3.x

- **USB 2.0:** one pair (D+/D−), 90 Ω ±10 %, DC-coupled. Intra-pair mismatch at most 50 mil (1.27 mm) (TI); at most 4 vias per trace, no stubs or test points.
- **USB 3.x:** adds one TX and one RX pair per lane; 90 Ω ±10 %. Intra-pair mismatch at most 5 mil (0.127 mm); TX and RX need not match each other. At most 2 vias per trace, the same number on both lines.
- **AC capacitors:** on the TX pair only, 75–265 nF (220 nF typical), 0402. Those of the RX pair are on the transmitter’s board at the other end of the cable.
- **Polarity:** a SuperSpeed receiver detects and corrects swapped P and N during link training, so P and N of one SuperSpeed pair may be swapped to avoid a crossing (check the controller’s guide). D+ and D− must never be swapped.
- **Keep them apart:** leave 5 trace widths (TI) between the USB 2.0 pair and the SuperSpeed pairs, and do not route D+/D− between them.

## Ethernet

**The MDI side** (PHY ↔ magnetics ↔ RJ45): two pairs for 10/100, four for 1000BASE-T.

- 100 Ω ±10 %; intra-pair mismatch at most 20 mil (0.51 mm); 50 mil is enough for 10/100 (TI SNLA387).
- The whole MDI route shorter than 2 in (51 mm), each pair on one layer; at least 30 mil (0.76 mm) between different pairs.
- **No copper under the magnetics on any layer** (an RJ45 with integrated magnetics excepted): the transformer is the isolation barrier, and copper under it couples noise across it.
- **Isolation gap:** the cable side (RJ45 shield, Bob Smith termination) sits on its own chassis island, separated from circuit ground by a gap. TI gives at least 20 mil; a safety standard that applies to your product sets the distance ([[lesson:spacing|spacing]]).
- ESD protection goes on the PHY side of the magnetics (TI): the cable side sees large common-mode swings.

**The MAC side (RGMII):** 4 data, 1 control and 1 clock line per direction; single-ended, 50 Ω ±10 %, data on both clock edges (125 MHz at 1 Gbit/s).

- Match TXD[3:0] and TX_CTL among themselves, likewise RXD and RX_CTL: below 11 ps (TI DP83867), about 2 mm on an outer layer.
- **Clock-to-data delay:** the clock must reach the receiver 1.5–2.0 ns after the data. The original RGMII does this with a longer clock trace; RGMII-ID adds the delay inside the MAC or the PHY, and the board only has to match lengths. Decide in the schematic which side adds it for each direction: once, not twice and not never.

> [!QUIZ] Neither your MAC nor your PHY can add the RGMII clock delay. How much longer than the data traces must the clock trace be?
> By at least 1.5 ns. On an inner layer of FR-4 (εeff = 4.3; 6.92 ps/mm) that is 1500 ps / 6.92 ps/mm ≈ 217 mm of extra trace; on an outer layer (5.49 ps/mm) about 273 mm. That much serpentine is reason enough to choose a part with the internal delay.

[[calc:signal?er=4.3&sk=1.5&sk_u=ns|How long is 1.5 ns?]] [[calc:interfaces?iface=eth&eth=rgmii|RGMII rules]]

## A memory bus: DDR3 and DDR4

- **Two kinds of group.** Data: each byte lane is 8 DQ, DM and its own DQS strobe pair, point to point between controller and memory. Address, command and control lines travel with the clock pair CK.
- **Fly-by.** With several memories, CK and the address/command lines visit them one after another and are terminated at the end (DDR3: 39.2 Ω to VTT; TI). Data lines have no resistors on the board: the termination is inside the chips (ODT). The clock reaches each memory at a different time; the controller measures and compensates this (write leveling). So byte lanes are not matched to each other; they only stay inside the DQS-to-CK window the guide gives.
- **Matching is inside the group.** DQ and DM to their own DQS within ±10 ps, the DQS pair within 2 ps, address/command to CK within ±8 ps (AMD UG583; other vendors differ). Match delay, not length: via and package delays count too.
- **Layout habits:** a whole byte lane on one layer with the same number of vias on each net (at most 2), over an unbroken plane; around 40 Ω single-ended.
- **Why the controller vendor’s guide?** The numbers depend on the controller: its package delays, what its training can correct, its drive settings. The sources disagree (76–100 Ω for DQS); the guide usually comes with a proven layout to copy and says whether four layers are enough.

[[calc:interfaces?iface=ddr4&grp=data|DDR4 data group]]

## Summary table

The values come from the interfaces tool; their sources are in brackets.

| Interface | Impedance | Matching | What is special |
|---|---|---|---|
| USB 2.0 | 90 Ω ±10 % diff. | in the pair ≤ 50 mil (TI) | DC-coupled; no stubs or test points |
| USB 3.x | 90 Ω ±10 % diff. | in the pair ≤ 5 mil (TI); TX to RX: none | 75–265 nF on TX; ≤ 2 vias; stub < 15 mil |
| Ethernet MDI | 100 Ω ±10 % diff. | in the pair ≤ 20 mil (TI) | < 51 mm; no copper under the magnetics |
| RGMII | 50 Ω ±10 % | data and CTL among themselves < 11 ps (TI) | clock 1.5–2.0 ns after the data |
| DDR3/DDR4 data | 40 Ω ±10 % | DQ to DQS ±10 ps; DQS pair 2 ps (AMD) | byte on one layer; ODT; delay is matched |
| MIPI D-PHY | 100 Ω ±15 % diff. | in the pair 8 ps; lane to clock 40 ps (TI; 2.5 Gbit/s) | loosely coupled pair (LP mode) |

[[calc:interfaces|PCIe, SATA, HDMI and the other interfaces]]

> [!WARN] Vendors differ: the layout guide of your own chip and the interface specification always take precedence over these values.

## Common mistakes

- Routing a fast pair across a plane split or over the via row of a connector.
- Changing layers without a return via, or from ground to a power plane without a capacitor.
- One tightly folded serpentine at the far end instead of closing the gap where it arises.
- Matching what needs none (TX to RX on USB 3) and missing what does (DQ to DQS).
- An ESD part on a branch; copper under the Ethernet magnetics; the RGMII delay enabled twice or not at all.

## Checklist

- Impedance class per layer from the real stack-up; target given to the fabricator.
- Unbroken plane under every fast route; pairs symmetric with a constant gap; corridor clear.
- Layer changes: paired vias, a return via or stitching capacitor, stubs checked.
- Intra-pair mismatch closed where it arises; group matching only where required, in ps.
- Connector region in order, no stubs; values checked against the tool and the chip’s layout guide.

## What next?

For noise on the cable side and the chassis connection see [[lesson:grounding-emc|grounding and EMC]]; the next lesson is [[lesson:rf-antennas|RF and antennas]].
`,
  },
};
