import { figureFrom } from '../figures.js';
import { text, rect, circle, path, polygon, callout, dimH } from '../../ui/svg.js';

const S = {
  tr: {
    anCap: 'Bir SOIC-8 footprint’inin katmanları, üstten görünüş. Maske açıklığı padden büyük, pasta açıklığı padden küçüktür (paylar abartılı çizilmiştir). Serigrafi padlere değmez; pin 1 işareti gövdenin dışındadır ve parça dizildikten sonra da görünür. Kesikli çizgi courtyard’dır.',
    pin1: 'pin 1 işareti',
    silk: 'serigrafi',
    court: 'courtyard',
    pad: 'bakır pad',
    paste: 'pasta açıklığı',
    origin: 'orijin (gövde merkezi)',
    mask: 'maske açıklığı',
    fab: 'gövde (montaj katmanı)',
    fiCap: 'Martı kanadı (gull-wing) bir bacağın lehim bağlantısı. Pad, bacağın karta bastığı yüzeyden burun (toe), topuk (heel) ve yan (side) yönlerinde taşar; lehim dolgusu bu paylarda oluşur. Solda yandan, sağda bacağın ucundan görünüş.',
    sideView: 'yandan görünüş',
    endView: 'uçtan görünüş',
    body: 'gövde',
    lead: 'bacak',
    solder: 'lehim',
    land: 'pad',
    toe: 'burun',
    heel: 'topuk',
    side: 'yan',
    miCap: 'SOT-23 bir NPN transistör, üstten görünüş. Gövdedeki harfler parçanın gerçek bacaklarıdır (B, E, C); padlerin yanındaki yazılar şemanın o pade bağladığı ucu gösterir. Solda numaralar saat yönünün tersine artar ve her bacak kendi netine oturur. Sağda footprint alttan görünüşten kopyalanmıştır: pad 1 ile pad 2 yer değiştirir, baz ile emiter çaprazlanır; parçayı döndürmek bunu düzeltmez.',
    good: '✓ üstten görünüşten çizildi',
    bad: '✗ alttan görünüş kopyalandı',
  },
  en: {
    anCap: 'The layers of an SOIC-8 footprint, top view. The mask opening is larger than the pad and the paste aperture smaller (margins exaggerated). The silkscreen stays off the pads; the pin 1 mark is outside the body, so it is still visible after the part is placed. The dashed line is the courtyard.',
    pin1: 'pin 1 mark',
    silk: 'silkscreen',
    court: 'courtyard',
    pad: 'copper pad',
    paste: 'paste aperture',
    origin: 'origin (body centre)',
    mask: 'mask opening',
    fab: 'body (fabrication layer)',
    fiCap: 'Solder joint of a gull-wing lead. The pad extends beyond the area where the lead rests on the board at the toe, at the heel and at the sides; the solder fillet forms on these extensions. Left: seen from the side; right: seen from the end of the lead.',
    sideView: 'side view',
    endView: 'end view',
    body: 'body',
    lead: 'lead',
    solder: 'solder',
    land: 'pad',
    toe: 'toe',
    heel: 'heel',
    side: 'side',
    miCap: 'An NPN transistor in SOT-23, top view. The letters on the body are the real leads of the part (B, E, C); the text next to each pad is the terminal the schematic connects to that pad. Left: the numbers run counter-clockwise and every lead sits on its own net. Right: the footprint was copied from a bottom view: pad 1 and pad 2 change places, base and emitter are crossed; rotating the part does not fix it.',
    good: '✓ drawn from the top view',
    bad: '✗ copied from a bottom view',
  },
};

/** Top view of an SOIC-8 footprint with every layer named (margins exaggerated). */
function anatomy(lang) {
  const s = S[lang] ?? S.en;
  const cx = 106;
  const cy = 106;
  const rows = [-48, -16, 16, 48];
  const tx = 236;
  // Courtyard around body and pads.
  let b = rect(cx - 92, cy - 73, 184, 146, 'dim');
  // Pads: mask opening (larger), copper, paste aperture (smaller).
  for (const x0 of [cx - 84, cx + 50]) {
    for (const dy of rows) {
      const y = cy + dy;
      b += rect(x0 - 3.5, y - 12, 41, 24, 'mask')
        + rect(x0, y - 8.5, 34, 17, 'cu')
        + rect(x0 + 4, y - 5, 26, 10, 'soft');
    }
  }
  // Fabrication layer: the real body with a chamfer at pin 1, and the pin numbers.
  b += polygon([[cx - 32, cy - 62], [cx + 44, cy - 62], [cx + 44, cy + 62], [cx - 44, cy + 62], [cx - 44, cy - 50]], 'dimline');
  rows.forEach((dy, i) => {
    b += text(cx - 35, cy + dy + 4, String(i + 1), { size: 10 })
      + text(cx + 35, cy + dy + 4, String(8 - i), { size: 10 });
  });
  // Silkscreen: two lines clear of the pads and a pin 1 dot outside the body.
  b += path(`M${cx - 44},${cy - 67}H${cx + 44}M${cx - 44},${cy + 67}H${cx + 44}`, 'wire')
    + circle(cx - 67, cy - 66.5, 3, 'node');
  // Origin at the body centre.
  b += path(`M${cx - 7},${cy}H${cx + 7}M${cx},${cy - 7}V${cy + 7}`, 'wire') + circle(cx, cy, 3.5, 'dimline');
  // Names.
  b += callout(cx - 67, cy - 66.5, 48, 22, s.pin1, { anchor: 'start' })
    + callout(cx + 40, cy - 67, tx, 30, s.silk)
    + callout(cx + 92, cy - 62, tx, 50, s.court)
    + callout(cx + 82, cy - 48, tx, 70, s.pad)
    + callout(cx + 76, cy - 16, tx, 94, s.paste)
    + callout(cx, cy, tx, 110, s.origin)
    + callout(cx + 86, cy + 16, tx, 130, s.mask)
    + callout(cx + 30, cy + 62, tx, 186, s.fab);
  return figureFrom(420, 198, s.anCap, b);
}

/** Gull-wing lead on its pad: side view (toe, heel) and end view (side fillets). */
function fillets(lang) {
  const s = S[lang] ?? S.en;
  const dim = { below: true, extFrom: 124, cls: 'lbl' };
  // Side view: board, pad, solder, body and lead.
  let b = text(140, 20, s.sideView, { cls: 'title' })
    + rect(14, 129, 252, 18, 'diel')
    + rect(132, 122, 94, 7, 'cu')
    + polygon([[224, 122], [204, 112], [204, 118], [150, 118], [141.8, 106.1], [134, 122]], 'soft')
    + rect(14, 50, 82, 62, 'comp', ' rx="3"')
    + polygon([[96, 76], [130, 76], [154, 111], [204, 111], [204, 118], [150, 118], [126, 83], [96, 83]], 'comp')
    + text(55, 85, s.body, { cls: 'name' })
    + text(118, 68, s.lead)
    + callout(211, 119, 230, 100, s.solder)
    + callout(220, 126, 240, 118, s.land)
    + dimH(132, 150, 162, s.heel, dim)
    + dimH(204, 226, 162, s.toe, dim);
  // End view: the same lead seen from its toe, the body behind it.
  b += text(348, 20, s.endView, { cls: 'title' })
    + rect(290, 129, 116, 18, 'diel')
    + rect(312, 122, 72, 7, 'cu')
    + polygon([[316, 122], [330, 112], [330, 118], [366, 118], [366, 112], [380, 122]], 'soft')
    + rect(298, 50, 100, 62, 'comp', ' rx="3"')
    + rect(330, 76, 36, 42, 'comp')
    + dimH(312, 330, 162, s.side, dim)
    + dimH(366, 384, 162, s.side, dim);
  return figureFrom(420, 184, s.fiCap, b);
}

/** One SOT-23 panel (local coordinates, 200 wide): footprint pads, the real part and the pad numbers. */
function sot23Panel(wrong, s) {
  const cx = 100;
  const cy = 84;
  const cls = wrong ? 'badt' : 'lbl';
  // Footprint pads.
  let b = rect(cx - 11, cy - 46, 22, 28, 'cu')
    + rect(cx - 45, cy + 18, 22, 28, 'cu') + rect(cx + 23, cy + 18, 22, 28, 'cu');
  // The real part: its leads never change places.
  b += rect(cx - 6, cy - 40, 12, 22, 'comp')
    + rect(cx - 40, cy + 18, 12, 22, 'comp') + rect(cx + 28, cy + 18, 12, 22, 'comp')
    + rect(cx - 52, cy - 20, 104, 40, 'comp', ' rx="3"')
    + text(cx, cy - 6, 'C', { cls: 'name' })
    + text(cx - 34, cy + 14, 'B', { cls: 'name' })
    + text(cx + 34, cy + 14, 'E', { cls: 'name' })
    + text(cx, cy + 13, 'SOT-23', { size: 10 });
  // Pad numbers of the footprint and the terminal the schematic expects there.
  b += text(cx, cy - 54, 'pad 3 = C')
    + text(cx - 34, cy + 66, wrong ? 'pad 2 = E' : 'pad 1 = B', { cls })
    + text(cx + 34, cy + 66, wrong ? 'pad 1 = B' : 'pad 2 = E', { cls });
  // The two crossed pads, framed below the body so the frame stays clear of the letters.
  if (wrong) b += rect(cx - 49, cy + 23, 30, 28, 'wire bad', ' rx="4"') + rect(cx + 19, cy + 23, 30, 28, 'wire bad', ' rx="4"');
  return b + text(cx, 172, wrong ? s.bad : s.good, { cls: wrong ? 'badt' : 'okt' });
}

function mirror(lang) {
  const s = S[lang] ?? S.en;
  return figureFrom(420, 182, s.miCap,
    `<g transform="translate(8,0)">${sot23Panel(false, s)}</g><g transform="translate(212,0)">${sot23Panel(true, s)}</g>`);
}

export default {
  figures: { anatomy, fillets, mirror },
  body: {
    tr: `
## Neden önemli?

Footprint (pad deseni, land pattern), bir parçanın kartta ihtiyaç duyduğu her şeydir: lehimleneceği bakır padler, maske ve pasta açıklıkları, işaretler. Şemadaki bir hata çoğu zaman bir tel köprüyle kurtarılır; yanlış footprint’te ise parça ya hiç lehimlenemez ya da partideki her kartta yanlış bağlanır. İlk kartların çalışmamasının en sık nedeni budur: aynalanmış pin dizilimi, yanlış adım (pitch), lehim dolgusuna yer bırakmayan kısa padler, unutulmuş pasta açıklığı.

Bedeli yeni bir kart turudur: haftalar ve ikinci kez ödenen üretim. Kontrolü ise parça başına birkaç dakika sürer.

## Bir footprint’in anatomisi

[[fig:anatomy]]

| Katman | Ne işe yarar? |
|---|---|
| Bakır padler | Bacağın lehimlendiği yüzey; pad numarası sembolün pin numarasına bağlanır |
| Lehim maskesi açıklığı | Padin üzerindeki maskeyi kaldırır; padden biraz büyüktür |
| Pasta açıklığı | Stencilde (elek) lehim pastasının basıldığı delik; yalnızca yüzey montaj padlerinde |
| Serigrafi | Kartta kalan dış hat, pin 1 ve polarite işareti |
| Courtyard | Parçanın padleriyle kapladığı alan ve çevresindeki pay |
| Montaj (fabrication) katmanı | Gerçek gövde dış hattı ve referans; karta basılmaz, montaj çizimine gider |
| Orijin ve sıfır yönü | Dizgi (pick-and-place) dosyasındaki konum ve açının referansı; yüzey montajda gövde merkezi |
| 3B model | Yükseklik ve kutu kontrolü; padlere oturmayan model hatayı ele verir |

## Veri sayfasını okumak

Veri sayfasında çoğu zaman iki ayrı çizim vardır. **Paket çizimi (package outline)** parçanın kendi ölçülerini verir: gövde, bacak genişliği, bacak uçları arası açıklık; en küçük, nominal ve en büyük değerleriyle. **Önerilen pad deseni (recommended land pattern)** karttaki padlerin ölçüleridir; varsa buradan başlayın. Padler bacaktan büyük olmalıdır: paket çizimindeki bacak ölçüsüyle pad çizerseniz lehim dolgusuna yer kalmaz.

- **Adım (pitch):** komşu bacakların merkezden merkeze uzaklığı. 0,635 mm (25 mil) ile 0,65 mm ya da 2,50 mm ile 2,54 mm gözle ayırt edilmez, ama hata pin sayısıyla birikir.
- **Paket sürümü ve birim:** aynı entegre dar ve geniş gövdeli SOIC olarak satılabilir; parça numarasının son ekine ve ölçülerin mm mi inç mi olduğuna bakın.
- **Görünüş:** footprint her zaman **üstten**, parçanın içinden karta bakıyormuş gibi çizilir. BGA, QFN, modül ve konnektör çizimleri ise çoğu zaman alttan görünüştür ("BOTTOM VIEW").
- **Numaralama:** üstten bakışta numaralar pin 1 işaretinden (nokta, çentik, pah) başlar ve **saat yönünün tersine** artar.

> [!WARN] Alttan görünüş çizimini olduğu gibi kopyalarsanız footprint aynalanır. Numaralar saat yönünde artıyorsa alttan bakıyorsunuz.

> [!QUIZ] Tek sıralı, 20 pinli bir konnektörün adımı 2,50 mm, footprint’iniz ise 2,54 mm. Son pin ne kadar kayar; parça takılır mı?
> Hata her aralıkta birikir: 19 × 0,04 mm = 0,76 mm. Konnektörü ortalasanız bile iki uçtaki pinler 0,38 mm kaçık kalır; delik ile pin arasındaki boşluk ise çapta yalnızca birkaç onda bir milimetredir. Parça takılmaz.

## Pad boyutu nereden gelir?

Önerilen desen yoksa pad, paket ölçülerinden türetilir. IPC-7351’in fikri şudur: pad, bacağın karta bastığı yüzeyden üç yönde taşar ve lehim bu taşan kısımlarda bir dolgu (fillet) oluşturur.

[[fig:fillets]]

- **Burun (toe):** bacağın dış ucunun ötesi. Dolgu buradan görülür, havya pade buradan değer.
- **Topuk (heel):** bacağın büküldüğü iç taraf. Martı kanadı (gull-wing) bacaklarda mekanik yükün çoğunu topuk dolgusu taşır.
- **Yan (side):** bacağın iki kenarı. Komşu padle arasındaki boşluğu daralttığı için en küçük paydır.

Hesap parçanın en küçük ve en büyük ölçülerinden başlar, her yöne bir dolgu payı ekler ve üç toleransı hesaba katar: parçanın, kart üretiminin ve dizgi makinesinin toleransı. Üçünün aynı anda en kötü değerinde olması pek olası değildir; bu yüzden düz toplanmaz, karelerinin toplamının kareköküyle birleştirilir.

Standart üç yoğunluk seviyesi tanımlar: **A (en çok malzeme)** en büyük padleri verir, elle lehim ve tamir kolaydır; **B (nominal)** çoğu kart için varsayılandır; **C (en az malzeme)** çok sıkışık kartlar içindir, lehim ve tamir payı azalır. Sayıları tablolardan elle çıkarmanız gerekmez: CAD araçlarının footprint sihirbazları ve IPC-7351 hesaplayıcıları paket ölçülerinden padleri üretir. Sizin işiniz doğru ölçüleri girmek ve sonucu kontrol etmektir.

> [!TIP] İnç kodlu 0603 (1,6 × 0,8 mm) ile metrik 0603 (0,6 × 0,3 mm) farklı parçalardır; kütüphanede hangisinin kastedildiğine bakın.

## Delikli parçalar

- **Delik = en büyük bacak ölçüsü + boşluk.** Kare ya da dikdörtgen pinde ölçü kenar değil **köşegendir**. Delik dar kalırsa parça girmez; fazla bolsa lehim deliği iyi dolduramaz ve parça eğri durur.
- **Pad = delik + 2 × halka + üretim payı.** Halka (annular ring) matkabın kaçıklığını karşılar; ayrıntısı [[lesson:vias|via ve pad tasarımı]] dersinde.
- **Pin 1 kare pad:** yuvarlak padlerin arasındaki kare pad, yönü kartın iki yüzünden de okunur kılar.

Örnek: 2,54 mm adımlı bir pin header’ın 0,64 mm’lik kare pini. Köşegeni 0,905 mm’dir; hesaplayıcı, üretilebilirlik seviyesi B ve ±0,075 mm delik toleransıyla nominal **1,18 mm** bitmiş delik ve dış katmanda en az **1,605 mm** pad verir. 1,7 mm’lik pad en kötü durumda 0,097 mm halka bırakır ve bütün kontrollerden geçer. Hazır kütüphanelerde bu pin için çoğu zaman 1,0 mm’lik daha sıkı bir delik görürsünüz: parça daha az oynar, ama boşluk küçüldüğü için pin toleransını veri sayfasından doğrulamak gerekir.

[[calc:padstack?k=rect&lv=B&lw=0.64&lw_u=mm&lt=0.64&lt_u=mm&pad=1.7&pad_u=mm|0,64 mm kare pin için delik ve pad]]

## Lehim maskesi ve pasta

**Maske genişlemesi:** maske açıklığı padden her yönde biraz büyük çizilir (tipik 0,05 mm; üreticinin kuralı geçerlidir) ki maske kaysa bile padi örtmesin.

**Maske köprüsü:** komşu iki pad arasında kalan maske şeridi lehim köprüsünü zorlaştırır. Üreticinin basabildiği en ince şerit sınırlıdır (tipik 0,1 mm civarı); ince adımda şerit bunun altına düşerse üretici onu siler ve bütün sıra tek açıklık olur.

> [!QUIZ] 0,5 mm adımlı bir QFP’de padler 0,30 mm genişliğinde, maske genişlemesi her yanda 0,05 mm ve üreticinin en ince maske köprüsü 0,1 mm. Köprü kalır mı? Genişleme 0,075 mm olsaydı?
> Padler arası boşluk 0,5 − 0,30 = 0,20 mm’dir. İki yandan 0,05 mm çıkınca 0,10 mm kalır: tam sınırda, köprü basılır. 0,075 mm genişlemeyle 0,05 mm kalır; üretici köprüyü siler ve lehim köprüsü riski artar. Çare: genişlemeyi küçültmek ya da padi daraltmak (ör. 0,25 mm).

**BGA padleri:** **bakır tanımlı (NSMD)** padde maske açıklığı bakırdan büyüktür ve lehimlenen alanı bakırın kenarı belirler; bakır maskeden daha hassas üretildiği için çoğu BGA’da önerilen budur. **Maske tanımlı (SMD)** padde bakır daha büyüktür, kenarı maskenin altında kalır ve alanı maske açıklığı belirler. Türü ve çapı veri sayfası söyler. Pad çapı kaçış yollarını da belirler: 0,8 mm adımda, 0,125 mm iz ve aralıkla, 0,4 mm’lik padlerin arasından bir iz geçer; padi "garanti olsun" diye 0,5 mm yaparsanız hiç geçmez.

[[calc:fanout?p=0.8&p_u=mm&d=0.4&d_u=mm&w=0.125&w_u=mm&s=0.125&s_u=mm|0,8 mm BGA: pad çapını değiştirip deneyin]]

**Pasta:** stencil açıklığı genellikle padle aynı ya da biraz küçüktür. Delikli padlere, test noktalarına ve fiducial’lara pasta basılmaz.

- **Büyük termal padler:** QFN gibi açık padli (exposed pad) bir entegrenin orta padine tek parça açıklık çok fazla pasta basar. Eriyen lehim parçayı yüzdürür: parça eğilir, kenar pinleri pade değmez ya da lehim dışarı taşıp kısa devre yapar. Açıklık bu yüzden küçük pencerelere bölünür (window pane); tipik hedef pad alanının %50–80’idir. Veri sayfası bir stencil deseni veriyorsa onu kullanın.
- **Termal pad altındaki vialar:** açık via lehimi emer. Küçük delikli viaları pencerelerin arasına koyun ya da doldurtun ([[lesson:thermal|termal tasarım]]).

> [!WARN] Çokgenle çizilmiş özel pad şekillerinde maske ve pasta açıklığı kendiliğinden oluşmayabilir. Gerber’de bu iki katmana tek tek bakın: açıklığı olmayan pad lehimlenmez.

## Courtyard, serigrafi ve montaj işaretleri

- **Courtyard:** gövdeyi ve padleri çevreleyen dış hat ile çevresindeki pay (yaygın değer 0,25 mm). Başka parçalar bu alana giremez: DRC üst üste binen courtyard’ları işaretler; dizgi makinesinin ucuna, tamire ve muayeneye yer böyle kalır.
- **Serigrafi:** açık padin üzerine gelmez; mürekkep lehimin padi ıslatmasını engeller, üretici de padlere taşan kısmı keser.
- **Pin 1 ve polarite:** işaret, parça dizildikten sonra da **görünür** kalmalıdır; gövdenin altında kalan nokta muayenede işe yaramaz. Diyotta katot çizgisini, entegrede pin 1’i gövdenin dışına koyun.
- **Polarite tuzağı:** tantal kondansatörde gövdedeki çizgi **artı** ucu, alüminyum elektrolitikte **eksi** ucu gösterir; LED’lerde işaret üreticiye göre değişir.

## Sembol–footprint eşlemesi

Netlist, sembolün pin **numarasını** padin **numarasına** bağlar; pin adlarına bakmaz. Ölçüleri kusursuz bir footprint, eşleme yanlışsa yine çalışmayan bir kart demektir.

[[fig:mirror]]

- **Aynı paket, farklı dizilim:** SOT-23 transistörlerde ve regülatörlerde pin sırası parçadan parçaya değişebilir. Klasik örnek: 78xx serisi giriş–toprak–çıkış, LM1117 toprak–çıkış–giriş sırasındadır. Kütüphanedeki genel "SOT-23" yalnızca paketin footprint’idir; parçanızın pin sırasını bilmez.
- **Diyot ve LED:** bazı kütüphaneler katodu 1 numara yapar, bazıları pinlere A ve K adını verir. Sembol bir kütüphaneden, footprint ötekinden gelirse bütün diyotlar ters dönebilir.
- **Konnektörler:** çizimler çoğu zaman takma yüzünden (mating face) bakar; erkek ile dişinin numaraları da birbirinin aynasıdır. Kart yerleşimini üstten gösteren çizimi arayın.
- **Termal pad:** entegrenin alt padi de bir paddir; sembolde pini olmalı ve bir nete bağlanmalıdır.

> [!QUIZ] Bir QFN’in veri sayfasında yalnızca alttan görünüş var. Çizimi olduğu gibi kopyaladınız ve kartlar geldi. Parçayı döndürerek durumu kurtarabilir misiniz?
> Hayır. Aynalanmış footprint’te numaralar saat yönünde artar; parçayı hangi açıyla koyarsanız koyun bacaklar yanlış padlere gelir. SOIC gibi bacaklı bir parça ters çevrilip bacakları bükülerek lehimlenebilir ("dead bug"); QFN ve BGA’da bu da mümkün değildir, kart yeniden üretilir.

## Footprint’ler nereden gelir?

- **CAD aracının kendi kütüphanesi:** hazırdır ve çoğu kez gözden geçirilmiştir, ama geneldir; parçanızın pin sırasını bilmez.
- **Parça üreticisinden ya da footprint servislerinden indirilenler:** parçaya özeldir, ama çoğu otomatik üretilir; pasta, courtyard ya da pin 1 eksik, numaralama alışkanlığı farklı çıkabilir.
- **Kendi çiziminiz:** her ölçüyü bilirsiniz; okuma ve yazma hatası da sizindir.

Hiçbiri kontrol edilmeden güvenilir değildir. Kalıcı çözüm, **doğrulanmış tek bir proje ya da şirket kütüphanesidir:**

- **Kabul kuralı:** bir footprint kütüphaneye ancak veri sayfasıyla karşılaştırıldıktan sonra girer; durumunu (doğrulandı, kartta denendi) ve veri sayfasının bağlantısını yazın.
- **Adlandırma:** ad paketi, adımı, gövde ölçüsünü ve pin sayısını taşısın (ör. IPC-7351 tarzı SOIC127P600X175-8N).
- **Sürüm kontrolü:** kütüphaneyi git gibi bir sistemde tutun; her değişiklik izlenir ve eski bir kart kendi footprint’leriyle yeniden üretilebilir.

> [!RULE] Kaynağı ne olursa olsun bir footprint, veri sayfasıyla ölçü ölçü karşılaştırılana kadar doğrulanmamıştır.

## Sipariş öncesi doğrulama

1. **Ölçüler:** adımı, sıra aralığını, pad ve delik ölçülerini CAD’in ölçüm aracıyla veri sayfasındaki değerlerle tek tek karşılaştırın.
2. **Pin 1 ve eşleme:** pin 1’in yerine ve numaraların yönüne bakın; sembolün pinlerini padlerle tek tek karşılaştırın ([[lesson:schematic-review|şematik inceleme]]).
3. **Katmanlar:** maske açıklığı var, pasta yalnızca yüzey montaj padlerinde, serigrafi padlerin dışında, courtyard çizilmiş.
4. **1:1 çıktı:** kartı gerçek ölçekte yazdırın ve gerçek parçaları kâğıdın üzerine koyun. Önce bilinen bir ölçüyü cetvelle doğrulayın; yazıcılar sayfaya sığdırmak için ölçeği değiştirir.
5. **3B model:** bacaklar padlere oturuyor mu, pin 1 aynı köşede mi?
6. **DRC:** üreticinin maske ve serigrafi kurallarıyla çalıştırın; courtyard çakışmalarını çözün ([[lesson:dfm|üretime hazırlık]]).
7. **İkinci göz:** yeni ya da pahalı bir parçada (BGA, ince adımlı konnektör, modül) footprint’i başka biri veri sayfasından bağımsız olarak kontrol etsin.

## Sık yapılan hatalar

- Alttan görünüşü üstten sanmak.
- Paket çizimindeki bacak ölçüsüyle pad çizmek.
- Aynı adlı paketin yanlış sürümünü seçmek: dar ve geniş gövde, 0,5 ve 0,65 mm adım.
- Kare pinin köşegenine değil kenarına göre delik açmak.
- Termal pade tek parça pasta açıklığı bırakmak ya da onu sembolde unutmak.

## Kontrol listesi

- Her footprint veri sayfasıyla ölçü ölçü karşılaştırıldı.
- Görünüş üstten, numaralar saat yönünün tersine; pin 1 işareti parça dizilince de görünüyor.
- Sembol–pad eşlemesi tek tek kontrol edildi; termal pad bağlı.
- Maske, pasta, serigrafi ve courtyard yerinde; termal padde pencere deseni var.
- 1:1 çıktı gerçek parçalarla denendi; footprint doğrulanmış kütüphanede.

## Sırada ne var?

Kuralları [[lesson:design-rules|CAD’de kural kurulumu]] dersinde girin, sonra [[lesson:placement-routing|yerleşim ve yönlendirme]] dersine geçin.
`,
    en: `
## Why it matters

A footprint (land pattern) is everything a part needs on the board: the copper pads it is soldered to, the mask and paste openings, the markings. A schematic mistake can often be patched with a wire; with a wrong footprint the part either cannot be soldered at all or is connected wrongly on every board of the batch. It is the most common reason a first board does not work: a mirrored pinout, the wrong pitch, pads too short for a solder fillet, a forgotten paste aperture.

The price is another board spin: weeks, and fabrication paid for twice. The check takes a few minutes per part.

## Anatomy of a footprint

[[fig:anatomy]]

| Layer | What it does |
|---|---|
| Copper pads | Where the lead is soldered; the pad number ties it to the pin number of the symbol |
| Solder-mask opening | Removes the mask over the pad; slightly larger than the pad |
| Paste aperture | The stencil hole through which solder paste is printed; surface-mount pads only |
| Silkscreen | Outline, pin 1 and polarity marks that stay on the board |
| Courtyard | The area the part and its pads occupy, plus a margin |
| Fabrication (assembly) layer | The real body outline and designator; not printed, goes to the assembly drawing |
| Origin and zero orientation | Reference for position and angle in the pick-and-place file; the body centre for surface-mount parts |
| 3D model | Height and enclosure checks; a model that misses the pads gives the error away |

## Reading the datasheet

A datasheet usually has two different drawings. The **package outline** gives the dimensions of the part itself (body, lead width, lead span) with minimum, nominal and maximum values. The **recommended land pattern** gives the pads on the board; if there is one, start from it. Pads must be larger than the leads: pads drawn with the lead dimensions leave no room for a solder fillet.

- **Pitch:** the centre-to-centre distance of neighbouring leads. You cannot tell 0.635 mm (25 mil) from 0.65 mm, or 2.50 mm from 2.54 mm, by eye, but the error adds up with the number of pins.
- **Package variant and unit:** the same IC may be sold as a narrow and as a wide SOIC; check the suffix of the part number and whether the dimensions are in mm or inches.
- **View:** a footprint is always drawn **from the top**, as if you looked through the part onto the board. Drawings of BGAs, QFNs, modules and connectors are often bottom views ("BOTTOM VIEW").
- **Numbering:** seen from the top, the numbers start at the pin 1 mark (dot, notch, chamfer) and increase **counter-clockwise**.

> [!WARN] If you copy a bottom-view drawing as it stands, the footprint is mirrored. If the numbers increase clockwise, you are looking from below.

> [!QUIZ] A single-row connector with 20 pins has a pitch of 2.50 mm, but your footprint uses 2.54 mm. How far off is the last pin, and will the part fit?
> The error adds up over every gap: 19 × 0.04 mm = 0.76 mm. Even if you centre the connector, the pins at both ends are 0.38 mm off, while the clearance between hole and pin is only a few tenths of a millimetre on the diameter. The part will not go in.

## Where pad sizes come from

Without a recommended pattern, the pad is derived from the package dimensions. The idea of IPC-7351: the pad extends beyond the area where the lead rests on the board in three directions, and the solder forms a fillet on these extensions.

[[fig:fillets]]

- **Toe:** beyond the outer end of the lead. The fillet is inspected here, and a soldering iron reaches the pad here.
- **Heel:** the inner side, where the lead bends. On gull-wing leads the heel fillet carries most of the mechanical load.
- **Side:** the two edges of the lead. It is the smallest extension because it narrows the gap to the neighbouring pad.

The calculation starts from the smallest and the largest dimensions of the part, adds a fillet goal in each direction and accounts for three tolerances: those of the part, of board fabrication and of the pick-and-place machine. All three are unlikely to be at their worst together, so they are combined as the root of the sum of their squares instead of simply added.

The standard defines three density levels: **A (most material)** gives the largest pads, easy to hand-solder and rework; **B (nominal)** is the default for most boards; **C (least material)** is for very dense boards and leaves less margin for soldering and rework. You need not work the numbers out from tables by hand: footprint wizards in CAD tools and IPC-7351 calculators generate the pads from the package dimensions. Your job is to enter the right dimensions and check the result.

> [!TIP] An imperial 0603 (1.6 × 0.8 mm) and a metric 0603 (0.6 × 0.3 mm) are different parts; check which one your library means.

## Through-hole parts

- **Hole = largest lead dimension + clearance.** For a square or rectangular pin that dimension is the **diagonal**, not the side. Too tight and the part does not go in; too loose and the solder fills the hole poorly and the part sits crooked.
- **Pad = hole + 2 × ring + fabrication allowance.** The annular ring absorbs drill wander; the details are in the [[lesson:vias|via and pad design]] lesson.
- **Square pad for pin 1:** a square pad among round ones makes the orientation readable from both sides of the board.

Example: the 0.64 mm square pin of a 2.54 mm pitch pin header. Its diagonal is 0.905 mm; at producibility level B with a hole tolerance of ±0.075 mm the calculator gives a nominal finished hole of **1.18 mm** and a minimum pad of **1.605 mm** on outer layers. A 1.7 mm pad leaves a worst-case ring of 0.097 mm and passes every check. Ready-made libraries often use a tighter 1.0 mm hole for this pin: the part wobbles less, but with less clearance you must confirm the pin tolerance in the datasheet.

[[calc:padstack?k=rect&lv=B&lw=0.64&lw_u=mm&lt=0.64&lt_u=mm&pad=1.7&pad_u=mm|Hole and pad for a 0.64 mm square pin]]

## Solder mask and paste

**Mask expansion:** the mask opening is drawn slightly larger than the pad on every side (typically 0.05 mm; the fabricator’s rule applies), so that a misregistered mask still does not cover the pad.

**Mask web:** the strip of mask left between two neighbouring pads makes solder bridges less likely. The thinnest strip a fabricator can print is limited (typically about 0.1 mm); if the strip falls below that at fine pitch, the fabricator removes it and the whole row becomes one opening.

> [!QUIZ] A QFP with 0.5 mm pitch has pads 0.30 mm wide, the mask expansion is 0.05 mm per side and the fabricator’s minimum mask web is 0.1 mm. Is there a web? What if the expansion were 0.075 mm?
> The gap between pads is 0.5 − 0.30 = 0.20 mm. Taking 0.05 mm off each side leaves 0.10 mm: exactly at the limit, so the web is printed. With 0.075 mm expansion only 0.05 mm is left; the fabricator removes the web and the risk of solder bridges goes up. The cure: a smaller expansion or a narrower pad (e.g. 0.25 mm).

**BGA pads:** on a **copper-defined (NSMD)** pad the mask opening is larger than the copper and the edge of the copper defines the soldered area; copper is made more accurately than mask, so this is what most BGAs recommend. On a **mask-defined (SMD)** pad the copper is larger, its edge lies under the mask and the mask opening defines the area. The datasheet tells you the type and the diameter. The pad diameter also decides the escape routes: at 0.8 mm pitch, with 0.125 mm trace and space, one trace passes between 0.4 mm pads; make the pad 0.5 mm "to be safe" and none does.

[[calc:fanout?p=0.8&p_u=mm&d=0.4&d_u=mm&w=0.125&w_u=mm&s=0.125&s_u=mm|0.8 mm BGA: change the pad diameter and see]]

**Paste:** the stencil aperture is usually the same size as the pad or slightly smaller. Through-hole pads, test points and fiducials get no paste.

- **Large thermal pads:** on the centre pad of an exposed-pad IC such as a QFN, one full-size aperture prints far too much paste. The molten solder floats the part: it tilts, the pins at the edge do not touch their pads, or solder squeezes out and shorts them. So the aperture is split into small windows (a window-pane pattern); a typical target is 50–80 % of the pad area. If the datasheet gives a stencil pattern, use it.
- **Vias under the thermal pad:** an open via wicks the solder away. Put vias with a small hole between the windows, or have them filled ([[lesson:thermal|thermal design]]).

> [!WARN] Custom pad shapes drawn as polygons may not get their mask and paste openings automatically. Look at these two layers in the Gerber files one by one: a pad without an opening is not soldered.

## Courtyard, silkscreen and assembly marks

- **Courtyard:** the outline around body and pads plus a margin (0.25 mm is common). No other part may enter it: the DRC flags overlapping courtyards, which keeps room for the placement nozzle, rework and inspection.
- **Silkscreen:** never on a bare pad; ink keeps solder from wetting the pad, and the fabricator clips whatever runs over pads.
- **Pin 1 and polarity:** the mark must stay **visible** after the part is placed; a dot under the body is useless for inspection. Put the cathode bar of a diode and the pin 1 mark of an IC outside the body.
- **Polarity trap:** on a tantalum capacitor the bar on the body marks the **positive** end, on an aluminium electrolytic the **negative** end; on LEDs the mark depends on the manufacturer.

## Pin mapping between symbol and footprint

The netlist connects the pin **number** of the symbol to the pad **number**; it does not look at pin names. A footprint with perfect dimensions still gives a dead board if the mapping is wrong.

[[fig:mirror]]

- **Same package, different pinout:** the pin order of SOT-23 transistors and regulators can differ from part to part. The classic example: the 78xx series is input–ground–output, the LM1117 ground–output–input. A generic "SOT-23" in the library is only the package; it knows nothing about the pin order of your part.
- **Diodes and LEDs:** some libraries make the cathode pad 1, others name the pins A and K. If the symbol comes from one library and the footprint from another, every diode may end up reversed.
- **Connectors:** drawings often look at the mating face, and the numbers of plug and socket mirror each other. Look for the drawing that shows the board layout from the top.
- **Thermal pad:** the bottom pad of an IC is a pad too; it needs a pin in the symbol and a net.

> [!QUIZ] The datasheet of a QFN shows only a bottom view. You copied the drawing as it stood and the boards have arrived. Can you save them by rotating the part?
> No. On a mirrored footprint the numbers increase clockwise; whichever way you turn the part, its leads land on the wrong pads. A leaded part such as an SOIC can be soldered upside down with its leads bent over ("dead bug"); with a QFN or BGA even that is impossible, and the board is made again.

## Where footprints come from

- **The CAD tool’s own library:** ready to use and usually reviewed, but generic; it does not know the pin order of your part.
- **Downloads from the part manufacturer or a footprint service:** specific to the part, but mostly machine-generated; paste, courtyard or pin 1 may be missing, and the numbering convention may differ.
- **Your own drawing:** you know every dimension; the reading and typing errors are yours as well.

None of them can be trusted unchecked. The lasting answer is **one verified project or company library:**

- **Entry rule:** a footprint enters the library only after it has been checked against the datasheet; record its status (verified, proven on a board) and the datasheet link.
- **Naming:** the name should carry the package, pitch, body size and pin count (e.g. the IPC-7351 style SOIC127P600X175-8N).
- **Version control:** keep the library in a system such as git; every change is tracked, and an old board can be rebuilt with the footprints it was made with.

> [!RULE] Whatever its source, a footprint is unverified until it has been compared with the datasheet, dimension by dimension.

## Verification before ordering

1. **Dimensions:** compare pitch, row spacing, pad and hole sizes one by one with the datasheet, using the measuring tool of the CAD program.
2. **Pin 1 and mapping:** check the position of pin 1 and the direction of the numbering; compare the symbol pins with the pads one by one ([[lesson:schematic-review|schematic review]]).
3. **Layers:** a mask opening is present, paste only on surface-mount pads, silkscreen off the pads, courtyard drawn.
4. **1:1 print:** print the board at real size and put the real parts on the paper. First verify a known dimension with a ruler; printers change the scale to fit the page.
5. **3D model:** do the leads sit on the pads, is pin 1 in the same corner?
6. **DRC:** run it with the fabricator’s mask and silkscreen rules; resolve courtyard overlaps ([[lesson:dfm|getting ready for manufacturing]]).
7. **A second pair of eyes:** for a new or expensive part (BGA, fine-pitch connector, module), have someone else check the footprint against the datasheet independently.

## Common mistakes

- Reading a bottom view as a top view.
- Drawing pads with the lead dimensions of the package drawing.
- Picking the wrong variant of a package with the same name: narrow and wide body, 0.5 and 0.65 mm pitch.
- Sizing the hole for the side of a square pin instead of its diagonal.
- Leaving one full-size paste aperture on a thermal pad, or forgetting the pad in the symbol.

## Checklist

- Every footprint compared with the datasheet, dimension by dimension.
- Top view, numbers counter-clockwise; the pin 1 mark is still visible with the part in place.
- Symbol-to-pad mapping checked pin by pin; thermal pad connected.
- Mask, paste, silkscreen and courtyard in place; window-pane pattern on thermal pads.
- 1:1 print tried with the real parts; the footprint is in the verified library.

## What next?

Enter the rules in the [[lesson:design-rules|setting up design rules]] lesson, then go on to [[lesson:placement-routing|placement and routing]].
`,
  },
};
