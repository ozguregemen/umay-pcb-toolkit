import { figureFrom } from '../figures.js';
import { text, rect, arrow } from '../../ui/svg.js';

const S = {
  tr: {
    srcCap: 'Kuralların dört kaynağı ve CAD aracında girildikleri yer. Üreticinin sınırları ve montajın istekleri kart varsayılanlarını, via tiplerini, döküm ve maske kurallarını belirler; hesaplar ve arayüz standardı ise net sınıflarını ve açıklık matrisini.',
    srcHead: 'Kaynak',
    catHead: 'CAD’deki kural',
    sources: [
      ['Üretici', 'kabiliyet tablosu'],
      ['Montaj', 'courtyard, kenar payı'],
      ['Kartın fiziği', 'akım, gerilim, Z₀'],
      ['Arayüz standardı', 'uzunluk eşleme, skew'],
    ],
    cats: ['Dökümler ve düzlemler', 'Maske, pasta, serigrafi', 'Kart varsayılanları', 'Via tipleri', 'Açıklık matrisi', 'Net sınıfları'],
    mxCap: 'Örnek kartın açıklık matrisi (mm). Çoğu sınıf çifti varsayılan 0,2 mm’yi kullanır; 24 V sınıfı her şeye 0,6 mm, USB çifti diğer izlere 0,76 mm ister ve iki sınıf karşılaştığında büyük olan değer geçerlidir. Çiftin kendi içindeki 0,2 mm’lik boşluğu empedans belirler.',
    classes: ['Varsayılan', 'Güç', 'USB çifti', '24 V'],
    vals: ['0,2', '0,6', '0,76'],
    inPair: 'çift içi',
    legDef: 'varsayılan açıklık',
    legBig: 'sınıf kuralı: daha büyük',
  },
  en: {
    srcCap: 'The four sources of the rules and where they are entered in the CAD tool. The fabricator’s limits and the needs of assembly set the board defaults, the via types and the zone and mask rules; the calculations and the interface standard set the net classes and the clearance matrix.',
    srcHead: 'Source',
    catHead: 'Rule in the CAD tool',
    sources: [
      ['Fabricator', 'capability table'],
      ['Assembly', 'courtyard, board edge'],
      ['Board physics', 'current, voltage, Z₀'],
      ['Interface standard', 'length matching, skew'],
    ],
    cats: ['Zones and planes', 'Mask, paste, silkscreen', 'Board defaults', 'Via types', 'Clearance matrix', 'Net classes'],
    mxCap: 'Clearance matrix of the example board (mm). Most class pairs use the default 0.2 mm; the 24 V class needs 0.6 mm to everything, the USB pair 0.76 mm to other traces, and where two classes meet the larger value applies. The 0.2 mm gap inside the pair is set by the impedance.',
    classes: ['Default', 'Power', 'USB pair', '24 V'],
    vals: ['0.2', '0.6', '0.76'],
    inPair: 'in the pair',
    legDef: 'default clearance',
    legBig: 'class rule: larger value',
  },
};

const FLOW = { cls: 'flow', headCls: 'arrow flow' };

/** Four sources (left) feeding the six rule categories of the CAD tool (right). */
function ruleSources(lang) {
  const s = S[lang] ?? S.en;
  const SX = 10;
  const SW = 140;
  const SH = 40;
  const CX = 244;
  const CW = 166;
  const CH = 26;
  const sy = (i) => 28 + i * 56;
  const cy = (i) => 29 + i * 36;
  let b = text(SX + SW / 2, 18, s.srcHead, { cls: 'title' }) + text(CX + CW / 2, 18, s.catHead, { cls: 'title' });
  s.sources.forEach(([name, sub], i) => {
    b += rect(SX, sy(i), SW, SH, 'comp', ' rx="4"')
      + text(SX + SW / 2, sy(i) + 17, name, { cls: 'name' })
      + text(SX + SW / 2, sy(i) + 32, sub, { size: 10 });
  });
  s.cats.forEach((name, i) => {
    b += rect(CX, cy(i), CW, CH, 'soft', ' rx="4"')
      + text(CX + CW / 2, cy(i) + 17, name, { cls: 'name', size: 11 });
  });
  // [source, offset on its right edge, category, offset on its left edge]
  const LINKS = [
    [0, -9, 0, 0], [0, -3, 1, 0], [0, 3, 2, -4], [0, 9, 3, -4],
    [1, 0, 2, 4],
    [2, -8, 3, 4], [2, 0, 4, -4], [2, 8, 5, -4],
    [3, -5, 4, 4], [3, 5, 5, 4],
  ];
  for (const [si, so, ci, co] of LINKS) {
    b += arrow(SX + SW, sy(si) + SH / 2 + so, CX - 1, cy(ci) + CH / 2 + co, FLOW);
  }
  return figureFrom(420, 246, s.srcCap, b);
}

/** Class × class grid: default clearance, larger class rules and the gap inside the pair. */
function clearanceMatrix(lang) {
  const s = S[lang] ?? S.en;
  const X0 = 112;
  const PITCH = 72;
  const Y0 = 46;
  const ROW = 36;
  // Cell kind: 0 = default, 1 = larger class rule, 2 = inside the differential pair.
  const KIND = [[0, 0, 1, 1], [0, 0, 1, 1], [1, 1, 2, 1], [1, 1, 1, 1]];
  // Index into s.vals.
  const VAL = [[0, 0, 2, 1], [0, 0, 2, 1], [2, 2, 0, 2], [1, 1, 2, 1]];
  let b = text(100, 34, 'mm', { anchor: 'end' });
  s.classes.forEach((name, k) => {
    b += text(X0 + k * PITCH + 35, 34, name, { cls: 'name', size: 11 })
      + text(100, Y0 + k * ROW + 22, name, { cls: 'name', size: 11, anchor: 'end' });
  });
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const x = X0 + c * PITCH;
      const y = Y0 + r * ROW;
      const kind = KIND[r][c];
      const v = s.vals[VAL[r][c]];
      b += rect(x, y, 70, 34, kind === 2 ? 'zone-ok' : 'soft', ' rx="3"');
      if (kind === 1) b += rect(x, y, 70, 34, 'zone', ' rx="3"');
      b += kind === 2
        ? text(x + 35, y + 15, v, { cls: 'okt' }) + text(x + 35, y + 28, s.inPair, { size: 9 })
        : text(x + 35, y + 22, v, { cls: kind ? 'val' : 'lbl' });
    }
  }
  b += rect(30, 198, 12, 12, 'soft') + text(48, 208, s.legDef, { anchor: 'start' })
    + rect(200, 198, 12, 12, 'soft') + rect(200, 198, 12, 12, 'zone') + text(218, 208, s.legBig, { anchor: 'start' });
  return figureFrom(420, 220, s.mxCap, b);
}

export default {
  figures: { 'rule-sources': ruleSources, 'clearance-matrix': clearanceMatrix },
  body: {
    tr: `
## Neden önemli?

Her CAD aracı yeni kartı kendi varsayılan kurallarıyla açar; bu kurallar ne üreticinizi ne de devrenizi tanır. Onlarla çizerseniz sondaki tasarım kuralı denetimi (DRC) ya gerçek sorunları görmez ya da ancak yeniden çizimle düzelen yüzlerce ihlal bildirir. Kurallar **ilk izden önce** girilirse durum tersine döner: yönlendirici her neti doğru genişlikte çizer, komşularına gereğinden fazla yaklaşmaz ve DRC bir emniyet ağı olur.

Bu ders, hesaplayıcı sonuçlarını bir **kural tablosuna** çevirir: her değerin kaynağının yanında yazdığı kısa bir tablo. Örnek, dört katmanlı küçük bir denetleyici kartıdır: 5 V / 2 A besleme, 3,3 V lojik, bir USB 2.0 çifti ve bir selenoid valfi anahtarlayan 24 V / 0,5 A’lik bir çıkış.

## Sayılar nereden gelir?

[[fig:rule-sources]]

- **Üretici:** yapabildiği en dar iz ve aralık, en küçük delik, halka (annular ring), lehim maskesi köprüsü ve serigrafi yazısı.
- **Kartın fiziği:** genişliği akım ([[lesson:trace-current|akım taşıyan izler]]), aralığı gerilim ([[lesson:spacing|aralıklar]]), genişlik ile boşluğu empedans belirler ([[lesson:impedance|kontrollü empedans]]).
- **Arayüz standardı:** çift empedansı, zamanlama kayması (skew) ve uzunluk eşleme sınırları.
- **Montaj:** courtyard’lar; parçaların ve bakırın kart kenarına uzaklığı.

> [!RULE] Kaynağı yanında yazmayan hiçbir sayı kurallara girmez. "Varsayılan değer buydu" bir kaynak değildir.

## Üreticiden başlayın, pay bırakın

**Sipariş vereceğiniz hizmetin** kabiliyet tablosunu açın ve en küçük değerleri not edin ([[lesson:dfm|üretime hazırlık]]). Örneğin JLCPCB’nin standart hizmeti, 25 Kasım 2026’da okunan değerlerle, 1 oz bakırda çok katmanlı kartta 0,09 mm iz ve aralık, en küçük via için 0,15 mm delik ve 0,25 mm pad, iç katmanlarda via deliğinden başka bakıra 0,2 mm (bacaklı parça deliğinden 0,3 mm) veriyordu. Bu tablolar değişir ve hizmetten hizmete farklıdır: üreticinin kendi sayfasını okuyun.

[[calc:stackup|Katman yığını ve üretici sınırları]]

En küçük değer hedef değildir. Sınırda verim düşer, en küçük ölçüler çoğu zaman ek ücret ister; bu yüzden **kart varsayılanlarını** sınırın epey üstüne koyun:

- **İz, açıklık (clearance) ve via:** en küçük değerin yaklaşık iki katı; örnekte 0,2 mm / 0,2 mm ve 0,6 mm padde 0,3 mm delik.
- **Bakır ağırlığı:** kurallar tek bir bakır ağırlığına aittir; aynı hizmet 2 oz için 0,15–0,16 mm ister.

> [!QUIZ] Yer kazanmak için viayı 0,45 mm padde 0,3 mm deliğe küçülttünüz; üreticinin en küçük via halkası 0,05 mm. Geçer mi; iyi bir varsayılan mı?
> Halka = (0,45 − 0,3) / 2 = 0,075 mm. Geçer, ama matkabın kaçması için yalnızca 0,025 mm kalır. 0,6 mm’lik pad 0,15 mm verir, sınırın üç katını: daha iyi varsayılan budur. Küçük viayı gerçekten gereken birkaç yere saklayın.

## Net sınıfları: netleri ihtiyaçlarına göre gruplayın

Net sınıfı (net class), genişlik, açıklık ve via kurallarını paylaşan netlerin adlandırılmış grubudur. Netleri adlarına ya da şema sayfalarına göre değil, **ihtiyaçlarına** göre gruplayın. Çoğu karta dört beş sınıf yeter: **varsayılan** sinyaller, **güç** hatları (genişlik iz hesaplayıcısından), **yüksek gerilimli** netler (açıklık aralık hesaplayıcısından) ve **empedans kontrollü** tek uçlu ya da diferansiyel netler (genişlik ve boşluk **her katman için ayrı**, empedans hesaplayıcısından ve [[lesson:stackup|katman yığınından]]).

Örnek kartın sınıfları (1,6 mm, dört katman, dışta 1 oz bakır; L1 ile GND arasında 0,21 mm prepreg, εr 4,4):

| Sınıf | Netler | Genişlik | Açıklık | Via (delik / pad) | Kaynak |
|---|---|---|---|---|---|
| Varsayılan | sinyaller, GND | 0,2 mm | 0,2 mm | 0,3 / 0,6 mm | üretici sınırı 0,09 mm × 2 |
| Güç | 5 V, 3,3 V | 1,0 mm | 0,2 mm | 2 × 0,4 / 0,8 mm | iz hesaplayıcısı, 2 A |
| 24 V | 24 V, valf çıkışı | 0,3 mm | 0,6 mm | 0,3 / 0,6 mm | aralık hesaplayıcısı, 31–50 V; genişlik 1 A için (yükün iki katı) |
| USB çifti | D+, D− | 0,30 mm, boşluk 0,20 mm | 0,76 mm | 0,3 / 0,6 mm | empedans hesaplayıcısı; arayüz kılavuzu |

**Güç.** 1 oz bakırda 2 A ve 10 °C artış için hesaplayıcı **0,97 mm** ister; sınıfa 1,0 mm yazıyoruz.

[[calc:trace?I=2&dT=10&L=50|2 A’lik hat: gereken genişlik]]

**24 V.** 24 V’un kendisi IPC-2221 tablosunun 16–30 V satırına düşer: dış katmanda 0,1 mm, yani varsayılandan az. Ama bu satır 30 V’ta biter; besleme toleransı ve endüktif yükün kapanma darbesi neti bunun üstüne çıkarır. Bu yüzden sınıfı bir sonraki satır, 31–50 V belirler: **0,6 mm**. Anma gerilimini değil, iletkenler arasında görülebilecek en yüksek gerilimi kullanın.

[[calc:spacing?V=50&cat=B2|31–50 V satırı]]

**USB.** L1’de, düzlemin üstünde 90 Ω için 0,20 mm boşlukla **0,30 mm**’lik izler gerekir. Başka bir katmanda sayılar değişir: empedans sınıfı, katman başına bir değer kümesidir. Hedefi üreticiye de bildirin; genişliği kendi çözücüsüyle ince ayarlar.

[[calc:impedance?mode=synth&st=diffMicrostrip&Z=90&s=0.2&s_u=mm&t=35&h=0.21&h_u=mm&er=4.4|L1’de 90 Ω çift]]

## Açıklık bir matristir

Tek bir açıklık değeri yetmez: varsayılan değer net çiftlerinin çoğunu kapsar, istisnalar ise sınıfa karşı sınıf bir tablo oluşturur.

[[fig:clearance-matrix]]

- **Sınıftan sınıfa:** yüksek gerilimli net, GND ve dökümler dahil **her şeyden** uzak durur; gerilim o net ile kartın geri kalanı arasındadır. İki sınıf karşılaştığında büyük değer geçerli olmalıdır.
- **Diferansiyel çift:** çiftin **içindeki** boşluğu empedans, **diğer** izlere uzaklığı karışma (crosstalk) belirler. USB 2.0 için TI’ın yerleşim kılavuzu diğer sinyallere 0,76 mm (30 mil) ister. Bu kuralı yalnızca izlere uygulayın; yoksa aynı netlerin ince adımlı padleri onu ihlal eder.
- **Bakır–kart kenarı:** tipik 0,25–0,5 mm; yoksa freze toleransı bakırı açığa çıkarır ya da keser.
- **Delik–delik, bakır–delik:** iki delik arasındaki laminat delmeye dayanmalıdır (IPC-2221: 0,5 mm); bakır, padi olmayan deliklerden üreticinin delik–bakır mesafesi kadar uzak durur; montaj deliğinde vida başına da yer gerekir.

> [!QUIZ] 24 V sınıfından bir iz (açıklık 0,6 mm) önce Varsayılan sınıftan 3,3 V’luk bir sinyalin (0,2 mm), sonra GND dökümünün yanından geçiyor. Hangi açıklık geçerlidir?
> İkisinde de 0,6 mm: gerilim, 24 V neti ile yanındaki bakır arasındadır; bu yüzden büyük olan sınıf değeri uygulanır ve GND bir istisna değildir. Aracınız bunu kendiliğinden yapmıyorsa "24 V sınıfı ile tüm netler" için açık bir kural ekleyin ve netin yanına bir iz çizerek deneyin.

## Via tipleri

**Bir ya da iki** via tipi tanımlayın ve başkasını kullanmayın; her yeni delik çapı, kontrol edilecek bir matkap ucu daha demektir.

- **Sinyal viası:** 0,3 mm delik, 0,6 mm pad. Halka = (0,6 − 0,3) / 2 = 0,15 mm, üreticinin en küçük değerinin üç katı; IPC’nin en kötü durum hesabı daha fazlasını ister ([[lesson:vias|via ve pad tasarımı]]).
- **Güç viası:** 0,3 mm’lik tek via 10 °C artışla yaklaşık **1,9 A** taşır; 2 A’lik hatta iki via gerekir. 0,4 mm’lik delik 2,3 A taşır; sınıf 0,4 / 0,8 mm’lik viaları çift kullanır.

[[calc:via?d=0.3&d_u=mm&L=1.6&p=25&I=2&dT=10|2 A’de 0,3 mm via]]

- **Mikrovia ve pad içi via** varsayılan değildir: ek süreç adımı isterler (lazer delme, doldurma ve kapaklama). Onlara yalnızca işaretli bir bölgede izin verin.

## Diferansiyel çiftler ve uzunluk kuralları

- **Genişlik ve boşluk** empedans sınıfından gelir. Padlerin yakınında iki izin ayrı gittiği bölüm için bir de **en büyük kuplajsız uzunluk** (uncoupled length) girin. Sınır bir tasarım tercihidir (örnekte 5 mm); böylece DRC çiftin nerede ayrıldığını gösterir.
- **Çift içi skew:** arayüz belgeleri sınırı uzunluk ya da süre olarak verir; arayüz aracı onu kaynağıyla listeler. USB 2.0 için TI kılavuzunda 1,27 mm’dir (50 mil).
- **Grup eşleme:** saatli veri yolları (DDR, RGMII, MIPI), saate ya da strobe’a göre bir pencere ekler.

[[calc:interfaces|Arayüz kuralları ve skew ⇄ uzunluk]]

Süre sınırı uzunluğa yayılma gecikmesiyle çevrilir: FR-4’te dış katmanda yaklaşık 5,5 ps/mm, iç katmanda 6,9 ps/mm. Sonucu uzunluk ya da skew kuralı olarak girin; yönlendirici ayar sırasında kalan bütçeyi gösterir.

> [!QUIZ] Bir arayüz çift içinde 10 ps skew’e izin veriyor. Dış ve iç katmanda hangi uzunluk farkını girersiniz?
> Dış katman: 10 ps / 5,5 ps/mm ≈ 1,8 mm. İç katman: 10 ps / 6,9 ps/mm ≈ 1,4 mm. Biraz azını girin (1,5 mm ve 1,2 mm): laminatın cam dokuması, hiçbir uzunluk kuralının göremediği bir skew ekler.

## Dökümler ve düzlemler

Bakır dökümün (zone) kendi kuralları vardır:

- **Açıklık:** döküm, katmanındaki her netle komşudur; ona izden biraz fazlasını verin (örnekte 0,3 mm). Empedans kontrollü bir ize yaklaşan döküm empedansı da düşürür: uzak tutun ya da hattı eş düzlemli (coplanar) yapı olarak hesaplayın.
- **En küçük genişlik:** dar boğazlar ve ince bakır şeritleri aşındırmada kalkıp başka yere yapışabilir; en az varsayılan iz genişliğini verin.
- **Termal rölyef:** lehimlenen padler döküme kollarla (spoke) bağlanır ki ısınabilsinler. Kollar birlikte pinin akımını taşımalıdır: 0,3 mm’lik dört kol 1,2 mm bakır eder, 2 A’lik hatta yeter. Vialar doğrudan bağlanır; lehimlenmezler.
- **Adalar:** hiçbir yere bağlı kalmayan bakırı araca sildirin ([[lesson:grounding-emc|topraklama ve EMC]]).
- **Öncelik:** iki döküm üst üste gelirse önceliği yüksek olan önce dolar: küçük 5 V dökümü, çevresindeki GND dökümünden önce.

## Maske, pasta ve serigrafi

Bu katmanların da kuralları vardır ve üreticiden gelir:

- **Lehim maskesi genişlemesi ve köprüsü:** maske açıklığı padden biraz büyüktür (tipik olarak her yöne 0,05 mm) ve iki maske açıklığı arasındaki şeridin en küçük bir genişliği vardır (yeşilde yaklaşık 0,1 mm). Aralarında 0,2 mm olan padlerde 0,05 mm’lik genişleme tam 0,1 mm bırakır; 0,075 mm olursa şerit silinir ve lehim padleri köprüleyebilir.
- **Pasta:** pasta açıklığı normalde pade eşittir; istisnalar footprint’e aittir ([[lesson:footprints|footprint ve kütüphane]]).
- **Serigrafi:** pad üzerindeki mürekkep lehimi engeller; bu yüzden serigrafi ile pad arasına bir açıklık ve en küçük bir yazı boyu girin (tipik olarak 1 mm kadar yükseklik, 0,15 mm çizgi).

## DRC’yi çalıştırmak

- **Erken ve sık:** yerleşimden, kritik netlerden ve her yönlendirme oturumundan sonra; önce dökümleri yeniden doldurun.
- **Düzeltin ya da gerekçelendirin:** her ihlal ya düzeltilir ya da **yazılı gerekçesiyle** istisna olarak kaydedilir ("pad aralığını U3’ün kılıfı belirliyor"). İhlal kaybolsun diye kuralı gevşetmeyin.
- **Çizilmemiş netler:** sayı sıfır olmalıdır; eksik bağlantı bir açıklık hatası değildir.
- **Kural kapsamı:** hiçbir netle eşleşmeyen kural hiçbir şeyi korumaz. Şema değişikliğinden sonra her sınıfın üyelerinin yerinde olduğuna bakın; adı değişen bir net sessizce Varsayılan sınıfa düşer.
- **ERC:** şemanın kendi denetimi vardır; yerleşime başlamadan çalıştırın ([[lesson:schematic-review|şematik inceleme]]).

> [!WARN] Temiz bir DRC yalnızca kartın sizin girdiğiniz kurallara uyduğunu kanıtlar. Aracın varsayılan kurallarıyla hiçbir şey kanıtlamaz.

## Araçlarda nerede?

Adlar sürümden sürüme değişir, kavramlar değişmez.

| Kavram | KiCad | Altium Designer |
|---|---|---|
| Kart geneli en küçük değerler | Board Setup → Design Rules → Constraints | PCB Rules and Constraints Editor: Clearance, Width, Manufacturing |
| Net sınıfları | Board Setup → Design Rules → Net Classes | net sınıfları; kuralların kapsamı olarak |
| Sınıftan sınıfa, yerel istisnalar | Custom Rules | kural kapsamı (sorgu), kural önceliği, room’lar |
| Çiftler, uzunluk, skew | net sınıfında çift genişliği ve boşluğu; sınırlar Custom Rules’ta | Differential Pairs Routing, Length, Matched Lengths |
| Dökümler | zone özellikleri | polygon pour özellikleri; Plane kuralları |
| DRC | Design Rules Checker; Violation Severity; exclusion’lar | Design Rule Check; ihlaller istisna sayılabilir |

> [!TIP] Bitmiş kuralları her üretici hizmeti için şablon olarak saklayın; sonraki kart bunlarla başlar.

## Örnek: denetleyici kartının kural tablosu

Yukarıdaki sınıf tablosu ile aşağıdaki kart geneli kurallar kural tablosunun tamamıdır; CAD dosyasını değil, bu tabloyu gözden geçirin:

| Kural | Değer | Kaynak |
|---|---|---|
| Bakır–delik | 0,3 mm | üretici: bacaklı parça deliğinden 0,3 mm |
| Bakır–kenar | 0,3 mm | tipik 0,25–0,5 mm; üreticiyle doğrulanacak |
| USB çifti | kuplajsız ≤ 5 mm, fark ≤ 1,27 mm | kendi tercihimiz; arayüz aracı |
| Dökümler | açıklık 0,3 mm, en küçük genişlik 0,2 mm, 4 × 0,3 mm kol | varsayılan + pay; 2 A |
| Maske, serigrafi | genişleme 0,05 mm, köprü 0,1 mm, yazı 1 mm | tipik; üreticiyle doğrulanacak |

Güç genişliği düzlemsiz, yani güvenli taraftaki ayarla hesaplandı; 0,21 mm alttaki GND düzlemiyle aynı hat yalnızca 0,42 mm ister.

[[calc:trace?I=2&dT=10&pl=yes&pd=0.21&pd_u=mm&L=50|Aynı hat, düzlemin üstünde]]

İlk gerçek izden önce her kuralı bir kez bilerek çiğneyin (bir sinyalin yanına 24 V’luk bir iz, 5 V netinde ince bir iz) ve DRC’nin bunu bildirdiğini görün.

## Sık yapılan hatalar

- Aracın varsayılan kurallarıyla çizip "DRC’yi sonra düzeltirim" demek.
- Bir net 24 V taşıdığı hâlde bütün karta tek açıklık vermek.
- Empedans genişliklerini başka bir yığından ya da katmandan kopyalamak.
- Temiz rapor almak için kuralı gevşetmek ya da denetimi kapatmak.

## Kontrol listesi

- Üretici ve hizmet seçildi; en küçük değerler tarihiyle not edildi; varsayılanlar bunların üstünde.
- Özel ihtiyacı olan her net bir sınıfta; her değerin kaynağı yazılı.
- Açıklıklar, via tipleri ve çift, uzunluk, döküm, maske ve serigrafi kuralları girildi ve denendi.
- DRC ve ERC temiz; istisnaların gerekçesi yazılı; çizilmemiş net sıfır.

## Sırada ne var?

Kütüphanenizi aynı sınırlarla [[lesson:footprints|footprint ve kütüphane]] dersinde kontrol edin, sonra kurallar hazırken [[lesson:placement-routing|yerleşim ve yönlendirme]] dersine geçin. Yayından önce [[lesson:dfm|üretime hazırlık]] kontrollerinden geçin.
`,
    en: `
## Why it matters

Every CAD tool opens a new board with its own default rules, which know neither your fabricator nor your circuit. Route with them, and the design rule check (DRC) at the end either misses real problems or reports hundreds of violations whose fixes mean rerouting. Rules entered **before the first trace** work the other way round: the router draws every net at the right width and keeps its distance, and the DRC becomes a safety net.

This lesson turns calculator results into a **rule sheet**: a short table in which every value has its source next to it. The example is a small four-layer controller board: a 5 V / 2 A supply, 3.3 V logic, one USB 2.0 pair and a 24 V / 0.5 A output that switches a solenoid valve.

## Where the numbers come from

[[fig:rule-sources]]

- **The fabricator:** the narrowest trace and space, the smallest hole, annular ring, solder-mask web and silkscreen text it can make.
- **The physics of your board:** current sets the width ([[lesson:trace-current|current-carrying traces]]), voltage sets the spacing ([[lesson:spacing|spacing]]), impedance sets width and gap ([[lesson:impedance|controlled impedance]]).
- **The interface standard:** pair impedance, skew and length-matching limits.
- **Assembly:** courtyards, and how far parts and copper stay from the board edge.

> [!RULE] No number goes into the rules without its source written next to it. "It was the default" is not a source.

## Start from the fabricator, then add margin

Open the capability table of the **service you will actually order** and note its minimums ([[lesson:dfm|getting ready for manufacturing]]). For example, the JLCPCB standard service, as read on 25 November 2026, listed for 1 oz copper 0.09 mm trace and space on multilayer boards, a smallest via of 0.15 mm hole in a 0.25 mm pad, and on inner layers 0.2 mm from a via hole to other copper (0.3 mm from a component hole). Such tables change and differ from service to service: read the fabricator’s own page.

[[calc:stackup|Stack-up and fabricator limits]]

A minimum is not a target. At the limit the yield drops and the smallest features often cost extra, so set the **board defaults** well above it:

- **Trace, clearance and via:** about twice the minimum; in the example 0.2 mm / 0.2 mm and a 0.3 mm hole in a 0.6 mm pad.
- **Copper weight:** rules belong to one copper weight; for 2 oz the same service needs 0.15–0.16 mm.

> [!QUIZ] To save room you shrink the via to a 0.3 mm hole in a 0.45 mm pad; the fabricator’s minimum via ring is 0.05 mm. Does it pass, and is it a good default?
> Ring = (0.45 − 0.3) / 2 = 0.075 mm. It passes, but only 0.025 mm is left for drill wander. A 0.6 mm pad gives 0.15 mm, three times the minimum: the better default. Keep the small via for the few places that need it.

## Net classes: group nets by what they need

A net class is a named group of nets that share width, clearance and via rules. Group nets by **what they need**, not by name or schematic sheet. Four or five classes cover most boards: **default** signals, **power** rails (width from the trace calculator), **high-voltage** nets (clearance from the spacing calculator) and **impedance-controlled** single-ended or differential nets (width and gap **per layer**, from the impedance calculator and the [[lesson:stackup|stack-up]]).

The classes of the example board (1.6 mm, four layers, 1 oz outer copper; 0.21 mm prepreg, εr 4.4, between L1 and GND):

| Class | Nets | Width | Clearance | Via (hole / pad) | Source |
|---|---|---|---|---|---|
| Default | signals, GND | 0.2 mm | 0.2 mm | 0.3 / 0.6 mm | fabricator minimum 0.09 mm × 2 |
| Power | 5 V, 3.3 V | 1.0 mm | 0.2 mm | 2 × 0.4 / 0.8 mm | trace calculator, 2 A |
| 24 V | 24 V, valve output | 0.3 mm | 0.6 mm | 0.3 / 0.6 mm | spacing calculator, 31–50 V; width for 1 A, twice the load |
| USB pair | D+, D− | 0.30 mm, gap 0.20 mm | 0.76 mm | 0.3 / 0.6 mm | impedance calculator; interface guideline |

**Power.** For 2 A and a 10 °C rise in 1 oz copper the calculator asks for **0.97 mm**; the class gets 1.0 mm.

[[calc:trace?I=2&dT=10&L=50|2 A rail: required width]]

**24 V.** 24 V itself falls into the 16–30 V row of the IPC-2221 table: 0.1 mm on an outer layer, less than the default. But that row ends at 30 V, and supply tolerance and the turn-off spike of the inductive load take this net above it. The class is therefore set by the next row, 31–50 V: **0.6 mm**. Use the highest voltage that can appear between the conductors, not the nominal one.

[[calc:spacing?V=50&cat=B2|The 31–50 V row]]

**USB.** On L1, above the plane, 90 Ω needs **0.30 mm** traces with a 0.20 mm gap. On another layer the numbers differ: an impedance class is a set of values per layer. Give the fabricator the target as well; it fine-tunes the width with its own solver.

[[calc:impedance?mode=synth&st=diffMicrostrip&Z=90&s=0.2&s_u=mm&t=35&h=0.21&h_u=mm&er=4.4|90 Ω pair on L1]]

## Clearance is a matrix

One clearance value is not enough: the default covers most net pairs, and the exceptions form a table of class against class.

[[fig:clearance-matrix]]

- **Class to class:** a high-voltage net keeps its distance from **everything**, GND and pours included; the voltage is between that net and the rest of the board. Where two classes meet, the larger value must apply.
- **Differential pair:** the gap **inside** the pair is set by the impedance, the distance to **other** traces by crosstalk. For USB 2.0, TI’s layout guideline asks for 0.76 mm (30 mil) to other signals. Apply this rule to traces only, or the fine-pitch pads of the same nets will violate it.
- **Copper to board edge:** typically 0.25–0.5 mm; otherwise the routing tolerance exposes or cuts the copper.
- **Hole to hole, copper to hole:** the laminate between two holes must survive drilling (IPC-2221: 0.5 mm); copper keeps the fabricator’s hole-to-copper distance from holes without a pad, and a mounting hole needs room for the screw head.

> [!QUIZ] A 24 V-class trace (clearance 0.6 mm) passes a 3.3 V signal of the Default class (0.2 mm), then the GND pour. Which clearance applies?
> 0.6 mm in both cases: the voltage is between the 24 V net and the copper next to it, so the larger class value applies and GND is no exception. If your tool does not do this by itself, add an explicit rule "24 V class to all nets" and test it with a trace next to the 24 V net.

## Via types

Define **one or two** via types and use nothing else; every extra hole size is one more drill and one more thing to check.

- **Signal via:** 0.3 mm hole, 0.6 mm pad. Ring = (0.6 − 0.3) / 2 = 0.15 mm, three times the fabricator’s minimum; the IPC worst-case calculation asks for more ([[lesson:vias|via and pad design]]).
- **Power via:** a single 0.3 mm via carries about **1.9 A** at a 10 °C rise, so the 2 A rail needs two; a 0.4 mm hole carries 2.3 A. The class uses 0.4 / 0.8 mm vias in pairs.

[[calc:via?d=0.3&d_u=mm&L=1.6&p=25&I=2&dT=10|0.3 mm via at 2 A]]

- **Microvias and via-in-pad** are not defaults: they need extra process steps (laser drilling, filling and capping). Allow them only in a marked area.

## Differential pairs and length rules

- **Width and gap** come from the impedance class. Also enter a **maximum uncoupled length** for the stretch near the pads where the two traces run apart. The limit is a design choice (5 mm in the example); it makes the DRC show where a pair has separated.
- **Intra-pair skew:** interface documents give the limit as a length or a time; the interfaces tool lists it with its source. For USB 2.0 it is 1.27 mm (50 mil) in TI’s guideline.
- **Group matching:** clocked buses (DDR, RGMII, MIPI) add a window relative to the clock or strobe.

[[calc:interfaces|Interface rules and skew ⇄ length]]

A time limit becomes a length through the propagation delay: on FR-4 about 5.5 ps/mm on an outer layer and 6.9 ps/mm on an inner layer. Enter it as a length or skew rule; the router then shows the remaining budget while you tune.

> [!QUIZ] An interface allows 10 ps of skew inside a pair. Which length mismatch do you enter on an outer and on an inner layer?
> Outer layer: 10 ps / 5.5 ps/mm ≈ 1.8 mm. Inner layer: 10 ps / 6.9 ps/mm ≈ 1.4 mm. Enter a little less (1.5 mm and 1.2 mm): the glass weave of the laminate adds skew that no length rule can see.

## Zones and planes

A copper pour (zone) has rules of its own:

- **Clearance:** a pour is the neighbour of every net on its layer; give it a little more than a trace (0.3 mm in the example). Close to an impedance-controlled trace it also lowers the impedance: keep it away or calculate a coplanar line.
- **Minimum width:** narrow necks and thin copper slivers can lift during etching and stick elsewhere; use at least the default trace width.
- **Thermal relief:** soldered pads connect to the pour through spokes so that they can heat up. Together the spokes must carry the pin’s current: four 0.3 mm spokes are 1.2 mm of copper, enough for the 2 A rail. Vias connect directly; they are not soldered.
- **Islands:** let the tool remove copper that ends up connected to nothing ([[lesson:grounding-emc|grounding and EMC]]).
- **Priority:** where two pours overlap, the higher priority fills first: the small 5 V pour before the GND pour around it.

## Mask, paste and silkscreen

These layers have rules too, and they come from the fabricator:

- **Solder-mask expansion and web:** the mask opening is slightly larger than the pad (typically 0.05 mm per side), and the strip between two openings has a minimum width (about 0.1 mm for green). Between pads 0.2 mm apart a 0.05 mm expansion leaves exactly 0.1 mm; with 0.075 mm the strip is removed and solder can bridge the pads.
- **Paste:** the opening normally equals the pad; exceptions belong to the footprint ([[lesson:footprints|footprints and libraries]]).
- **Silkscreen:** ink on a pad prevents soldering, so enter a silkscreen-to-pad clearance, and a minimum text size (typically about 1 mm high with 0.15 mm strokes).

## Running the DRC

- **Early and often:** after placement, after the critical nets, after every routing session; refill the pours first.
- **Fix or justify:** every violation is fixed or recorded as a waiver **with a written reason** ("pad gap set by the package of U3"). Do not loosen a rule to make a violation go away.
- **Unrouted nets:** the count must be zero; a missing connection is not a clearance error.
- **Rule coverage:** a rule that matches no net protects nothing. After a schematic change, check that every class still has its members; a renamed net silently drops into Default.
- **ERC:** the schematic has a check of its own; run it before the layout starts ([[lesson:schematic-review|schematic review]]).

> [!WARN] A clean DRC only proves that the board obeys the rules you entered. With the tool’s default rules it proves nothing.

## Where it lives in the tools

Names change from version to version; the concepts do not.

| Concept | KiCad | Altium Designer |
|---|---|---|
| Board-wide minimums | Board Setup → Design Rules → Constraints | PCB Rules and Constraints Editor: Clearance, Width, Manufacturing |
| Net classes | Board Setup → Design Rules → Net Classes | net classes, used as the scope of rules |
| Class-to-class, local exceptions | Custom Rules | rule scope (query), rule priority, rooms |
| Pairs, length, skew | pair width and gap in the net class; limits in Custom Rules | Differential Pairs Routing, Length, Matched Lengths |
| Pours | zone properties | polygon pour properties; Plane rules |
| DRC | Design Rules Checker; Violation Severity; exclusions | Design Rule Check; violations can be waived |

> [!TIP] Save the finished rules as a template for each fabricator service; the next board starts from them.

## Example: the rule sheet of the controller board

The class table above plus the board-wide rules below make the whole sheet; review this sheet, not the CAD file:

| Rule | Value | Source |
|---|---|---|
| Copper to hole | 0.3 mm | fabricator: 0.3 mm from a component hole |
| Copper to edge | 0.3 mm | typical 0.25–0.5 mm; confirm with the fabricator |
| USB pair | uncoupled ≤ 5 mm, mismatch ≤ 1.27 mm | own choice; interfaces tool |
| Pours | clearance 0.3 mm, minimum width 0.2 mm, 4 × 0.3 mm spokes | default plus margin; 2 A |
| Mask, silkscreen | expansion 0.05 mm, web 0.1 mm, text 1 mm | typical; confirm with the fabricator |

The power width was calculated without a plane, the safe-side setting; with the GND plane 0.21 mm below, the same rail needs only 0.42 mm.

[[calc:trace?I=2&dT=10&pl=yes&pd=0.21&pd_u=mm&L=50|The same rail above the plane]]

Before the first real trace, break every rule once on purpose (a 24 V trace next to a signal, a thin trace on the 5 V net) and check that the DRC reports it.

## Common mistakes

- Routing with the tool’s default rules and "fixing the DRC later".
- One clearance for the whole board although one net carries 24 V.
- Copying impedance widths from another stack-up or another layer.
- Loosening a rule or switching a check off to get a clean report.

## Checklist

- Fabricator and service chosen; minimums noted with the date; defaults set above them.
- Every net with a special need is in a class; every value has a written source.
- Clearances, via types and the pair, length, pour, mask and silkscreen rules entered and tested.
- DRC and ERC clean; waivers have written reasons; zero unrouted nets.

## What next?

Check your library against the same limits in [[lesson:footprints|footprints and libraries]], then start [[lesson:placement-routing|placement and routing]] with the rules in place. Before release, go through the [[lesson:dfm|getting ready for manufacturing]] checks.
`,
  },
};
