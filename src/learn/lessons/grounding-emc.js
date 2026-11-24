import { figureFrom } from '../figures.js';
import { text, rect, path, polygon, arrow, callout, wire, twoTerm, circle } from '../../ui/svg.js';

const S = {
  tr: {
    splitCap: 'Üstten görünüş. Yüksek frekansta dönüş akımı düzlemde izin tam altından, izin yolunu izleyerek geri döner (solda). İz bir yarığın üzerinden geçerse dönüş akımı yarığın ucuna kadar dolanır; aradaki alan bir döngü anteni olur ve endüktansı artırır (sağda).',
    under: 'dönüş akımı izin altında',
    slot: 'yarık',
    detour: 'dönüş dolanır',
    good: '✓ kesintisiz düzlem: küçük döngü',
    bad: '✗ yarık üzerinden: büyük döngü',
    cmCap: 'Diferansiyel mod akım aynı kablo içinde gider ve döner; alanları birbirini götürür. Ortak mod akım tüm tellerde aynı yönde akar ve parazitik kapasiteler (Cp) üzerinden çevredeki topraktan döner; döngü büyüktür ve kablo anten gibi ışır. Ortak mod bobini yalnızca ortak mod akıma empedans gösterir.',
    dm: 'Diferansiyel mod (DM)',
    cm: 'Ortak mod (CM)',
    dev: 'Cihaz',
    dmNote: 'alanlar birbirini götürür',
    choke: 'CM bobini',
    ref: 'çevredeki toprak (masa, bina, kutu)',
  },
  en: {
    splitCap: 'Top view. At high frequency the return current flows in the plane right under the trace, following its path (left). If the trace crosses a split, the return current detours to the end of the split; the area in between becomes a loop antenna and adds inductance (right).',
    under: 'return current under the trace',
    slot: 'split',
    detour: 'return detours',
    good: '✓ solid plane: small loop',
    bad: '✗ across a split: big loop',
    cmCap: 'Differential-mode current goes out and back within the same cable, so the fields cancel. Common-mode current flows the same way in every wire and returns through stray capacitances (Cp) via the surrounding ground; the loop is large and the cable radiates like an antenna. A common-mode choke presents impedance only to the common-mode current.',
    dm: 'Differential mode (DM)',
    cm: 'Common mode (CM)',
    dev: 'Device',
    dmNote: 'fields cancel',
    choke: 'CM choke',
    ref: 'surrounding ground (table, building, case)',
  },
};

const trace = (d, w) => `<path class="cutr" style="stroke-width:${w}" d="${d}"/>`;
const flowArrow = (x1, y1, x2, y2) => arrow(x1, y1, x2, y2, { cls: 'flow', headCls: 'arrow flow' });

/** One top-view panel (local coordinates, 200 wide). */
function splitPanel(good, s) {
  let b = good
    ? rect(5, 14, 190, 140, 'cu plane')
    : polygon([[5, 14], [93, 14], [93, 128], [107, 128], [107, 14], [195, 14], [195, 154], [5, 154]], 'cu plane');
  const d = good ? 'M40,73H70V40H130V73H160' : 'M40,73H160';
  if (good) {
    // The return current hugs the trace: a band under it, flowing back to TX.
    b += `<path class="flow" style="stroke-width:9;opacity:.35" d="${d}"/>`;
  } else {
    b += rect(89, 73, 22, 63, 'zone-bad');
    b += path('M160,80H111V136H89V80H40', 'wave2');
  }
  b += trace(d, 3);
  b += rect(12, 60, 28, 26, 'comp', ' rx="3"') + text(26, 77, 'TX', { cls: 'name' });
  b += rect(160, 60, 28, 26, 'comp', ' rx="3"') + text(174, 77, 'RX', { cls: 'name' });
  if (good) {
    b += flowArrow(112, 31, 92, 31) + flowArrow(61, 46, 61, 64) + flowArrow(139, 66, 139, 48);
    b += text(100, 112, s.under);
  } else {
    b += flowArrow(111, 94, 111, 114) + flowArrow(89, 114, 89, 94);
    b += callout(100, 30, 122, 36, s.slot);
    b += text(118, 112, s.detour, { anchor: 'start' });
  }
  b += text(100, 176, good ? s.good : s.bad, { cls: good ? 'okt' : 'badt' });
  return b;
}

function returnSplit(lang) {
  const s = S[lang] ?? S.en;
  return figureFrom(420, 186, s.splitCap,
    `<g transform="translate(8,0)">${splitPanel(true, s)}</g><g transform="translate(214,0)">${splitPanel(false, s)}</g>`);
}

/** Differential-mode vs common-mode current on a cable, with a CM choke. */
function cmDm(lang) {
  const s = S[lang] ?? S.en;
  const ends = (y) => rect(20, y, 64, 52, 'comp', ' rx="3"') + text(52, y + 30, 'PCB', { cls: 'name' })
    + rect(336, y, 64, 52, 'comp', ' rx="3"') + text(368, y + 30, s.dev, { cls: 'name' });
  let b = text(210, 16, s.dm, { cls: 'title' }) + ends(26)
    + wire([84, 40], [336, 40]) + wire([84, 64], [336, 64])
    + flowArrow(186, 32, 234, 32) + flowArrow(234, 72, 186, 72)
    + text(210, 94, s.dmNote);
  b += text(210, 114, s.cm, { cls: 'title' }) + ends(126)
    + wire([84, 140], [130, 140]) + wire([176, 140], [336, 140])
    + wire([84, 164], [130, 164]) + wire([176, 164], [336, 164])
    + twoTerm('L', 130, 140, 176, 140) + twoTerm('L', 130, 164, 176, 164)
    + path('M135,150H171M135,154H171', 'wire')
    + circle(133, 133, 1.8, 'node') + circle(133, 157, 1.8, 'node')
    + text(153, 184, s.choke)
    + flowArrow(240, 132, 290, 132) + flowArrow(240, 156, 290, 156)
    + rect(30, 214, 360, 8, 'soft')
    + twoTerm('C', 368, 178, 368, 214, { name: 'Cp', dashed: true })
    + twoTerm('C', 52, 178, 52, 214, { name: 'Cp', dashed: true, flip: true })
    + flowArrow(250, 206, 170, 206)
    + text(210, 236, s.ref);
  return figureFrom(420, 242, s.cmCap, b);
}

export default {
  figures: { 'return-split': returnSplit, 'cm-dm': cmDm },
  body: {
    tr: `
## Neden önemli?

Elektromanyetik uyumluluk (EMC) iki şey ister: ürününüz çevresini bozmamalı (**emisyon**) ve çevresinden bozulmamalıdır (**bağışıklık**). AB’de CE işareti için EMC Direktifi (2014/30/EU), ABD’de FCC Part 15 bunu zorunlu kılar. EMC testinden kalmak genellikle projenin en sonunda, kart, kutu ve kablolar hazırken ortaya çıkar; o noktada çözüm pahalıdır: ek filtreler, ekranlama, yeni bir kart turu.

EMC sorunlarının çoğu yerleşimde tasarlanır ve çoğu aynı kökten gelir: **akımın geri döndüğü yol**. Bu ders o yolu nasıl kısa ve öngörülebilir tutacağınızı, kabloları neden anten gibi düşünmeniz gerektiğini ve teste nasıl hazırlanacağınızı anlatır.

## Her akım bir döngüdür

Sinyal veya besleme akımı kaynağına geri dönmek zorundadır. Düşük frekansta dönüş akımı en düşük **dirençli** yolu seçer ve düzleme geniş biçimde yayılır. Frekans yükseldikçe en düşük **endüktanslı** yol baskın olur: dönüş akımı düzlemde, izin tam altından ve onun yolunu izleyerek akar. Hızlı bir dijital kenarın içerdiği MHz bölgesinde bu neredeyse tamamen geçerlidir. Kesit görünüşü için [[lesson:stackup|katman yığını dersine]] bakın.

[[fig:return-split]]

Döngü alanı üç şeyi birlikte belirler: endüktansı, ışımayı ve dışarıdan gelen alanları toplamayı. Küçük döngü hem daha az emisyon hem daha iyi bağışıklık demektir.

## Yarıklar ve katman değişimleri

- **Yarık üzerinden iz geçirmeyin.** Dönüş akımı yarığın ucuna kadar dolanır; döngü büyür, empedans o noktada sıçrar, yarık bir anten gibi ışır ve aynı yarığı geçen diğer sinyallerle karışma oluşur.
- **Gizli yarıklara dikkat edin:** konnektör ve BGA altındaki sık via dizilerinin anti-padleri birleşince düzlemde uzun bir boşluk oluşur. Düzlem katmanını Gerber görüntüsünde kontrol edin.
- **Katman değişimi:** sinyal katman değiştirince dönüş akımı da referans düzlemini değiştirmelidir. İki referans da GND ise sinyal viasının yanına bir **GND dikiş viası** koyun; biri GND, diğeri besleme düzlemiyse yakında bir dekuplaj kondansatörü bulunsun.
- Bir yarığı geçmek kaçınılmazsa geçiş noktasının hemen yanına iki düzlemi birleştiren küçük bir seramik kondansatör (dikiş kondansatörü) koyun.

## AGND ve DGND: bölmeli mi, bölmemeli mi?

Yeni başlayanların en sık yaptığı hata, toprak düzlemini "analog" ve "dijital" diye ikiye bölüp sonra sinyalleri yarığın üzerinden geçirmektir. Çoğu karışık sinyalli kart için daha iyi yol şudur:

1. **Tek, kesintisiz bir GND düzlemi** kullanın.
2. Kartı **yerleşimle bölün:** analog, dijital ve güç bölümlerini ayrı bölgelere koyun.
3. Parçaları ve izleri, dijital ve güç dönüş akımları analog bölgenin içinden geçmeyecek şekilde yerleştirin; analog izler analog bölgede kalsın.

AGND ve DGND pinleri olan bir ADC veya DAC’ta bu iki pin genellikle entegrenin altında aynı (analog) toprağa bağlanır; ayrıntı için veri sayfasına ve Analog Devices’ın MT-031 eğitim notuna bakın.

Bölmenin gerçekten gerektiği durumlar azdır: veri sayfası açıkça istiyorsa, motor veya röle gibi büyük düşük frekanslı akımların hassas bir ölçüm toprağından uzak tutulması gerekiyorsa ya da bir yalıtım bariyeri varsa (o zaman bu bir bölme değil, yalıtımdır). Bölerseniz iki toprağı **tek bir noktada** birleştirin ve yarığı yalnızca o köprünün üzerinden geçin.

> [!WARN] "Yıldız topraklama" düşük frekanslı akımlar için iyi bir fikirdir; yüksek frekansta ise uzun toprak bağlantıları birer endüktanstır. Hızlı sinyallerin altında her zaman kesintisiz bir düzlem olsun.

## Dikiş viaları ve kart kenarları

- Üst ve alt katmandaki GND dökümlerini iç düzleme sık aralıklı vialarla bağlayın. Hiç bağlanmamış veya tek viayla bağlanmış bakır adaları rezonansa girebilir: ya dikin ya silin.
- Kart kenarı boyunca ve düzlem kenarlarında bir **via çiti** kullanın. Yaygın kural, aralığı ilgilendiğiniz en yüksek frekansta dalga boyunun **λ/20**’sinden küçük tutmaktır. FR-4’ün içinde (εr ≈ 4,3) 1 GHz’te λ ≈ 145 mm, λ/20 ≈ **7,2 mm**’dir.
- Hızlı izleri kart kenarından ve düzlem kenarından uzak tutun; kenarda alan çizgileri dışarı taşar.

[[calc:emc|EMC yardımcıları]] [[calc:stackup|Katman yığını]]

## Kablolar anten gibidir

30–300 MHz aralığındaki yayılan emisyonlar çoğu zaman kartın kendisinden değil, karta bağlı **kablolardan** gelir. 1 m’lik bir kablo 150 MHz’te yarım dalga boyudur; çok iyi bir antendir.

[[fig:cm-dm]]

- **Diferansiyel mod (DM)** akım bir telden gider, diğerinden döner; alanları büyük ölçüde birbirini götürür.
- **Ortak mod (CM)** akım kablonun tüm tellerinde aynı yönde akar ve parazitik kapasiteler üzerinden döner. Döngü büyüktür ve kablo anten gibi ışır. Birkaç mikroamperlik ortak mod akımı bile emisyon sınırlarını aşmaya yeter.

Ortak mod akımın kaynağı genellikle kartın içindedir: konnektörün toprağı ile kartın geri kalanı arasındaki gürültü gerilimi, konnektör altındaki bir düzlem yarığı ya da gürültülü bir izin konnektöre yakın bir hatta kuple olması. Önlemler:

- Tüm konnektörleri mümkünse **kartın tek bir kenarına** toplayın; iki kenardaki kablolar arasında kartın toprak gürültüsü doğrudan bir anteni sürer.
- Konnektör çevresinde sessiz bir I/O toprağı bırakın; saat, SW düğümü ve hızlı veri yollarını bu bölgeden uzak tutun.
- Ekranlı kablonun ekranını konnektörde **360°** ile şasiye bağlayın; uzun bir tel (pigtail) yüksek frekansta ekranı işe yaramaz hale getirir.

## Konnektörde filtreleme

Karttan çıkan her hat, karttan çıktığı yerde filtrelenmelidir: konnektörün hemen yanında, varsa ESD korumasından sonra ve filtrenin toprağı sessiz I/O toprağına bağlı. Filtrenin girişi ile çıkışı birbirine paralel ve yakın giderse gürültü filtrenin üzerinden atlar.

- **Ferrit boncuk:** veri sayfasında 100 MHz’teki empedansıyla verilir (ör. 600 Ω @ 100 MHz). DC akım bu empedansı düşürür; akım altındaki eğriye bakın. Kondansatörle birlikte bir LC alçak geçiren oluşturur ve rezonans frekansında tepe yapabilir; gerekirse sönümleyin.
- **RC filtre:** yavaş sinyallerde (buton, LED, düşük hızlı UART) basit ve etkilidir. 100 Ω ile 100 pF’ın kesim frekansı yaklaşık **15,9 MHz**’tir.
- **Ortak mod bobini:** diferansiyel sinyali neredeyse görmeden geçirir, ortak mod akıma yüksek empedans gösterir. CAN, RS-485, USB gibi çiftlerde ve güç girişlerinde kullanılır; hızlı arayüzlerde o arayüz için belirtilmiş bir parça seçin, yoksa sinyal bütünlüğü bozulur.

[[calc:rc?mode=rc&rcR=100&rcC=100p|RC filtre: 100 Ω, 100 pF]]

## Saat harmonikleri ve kenar hızı

Kare dalga bir saat, frekansının tek katlarında harmonikler üretir. Harmoniklerin zarfı önce 20 dB/dekad, **1/(π·tr)** köşesinden sonra 40 dB/dekad düşer. Yani yüksek frekanstaki enerjiyi saat frekansı değil, **yükselme süresi** belirler.

Örnek: 25 MHz’lik bir saat. Kenar 1 ns ise köşe yaklaşık **318 MHz**, 3 ns ise yaklaşık **106 MHz** olur. 318 MHz’in üzerindeki her frekansta yavaş kenarın zarfı 20·log(3) ≈ **9,5 dB** daha düşüktür.

Sinyal hesaplayıcısı aynı kenar için bant genişliğini 0,35/tr, diz frekansını 0,5/tr olarak verir (1 ns için 350 MHz ve 500 MHz). Bunlar aynı fikrin farklı tanımlarıdır: kenar ne kadar hızlıysa enerji o kadar yüksek frekanslara uzanır.

[[calc:signal?tr=1&tr_u=ns|1 ns kenar]] [[calc:signal?tr=3&tr_u=ns|3 ns kenar]]

- Kenarı yalnızca gerektiği kadar hızlı yapın: mikrodenetleyicinin çıkış hızı (slew rate) ayarını düşürün, sürücüye 22–33 Ω seri direnç koyun.
- Saat izlerini kısa tutun, iki düzlem arasındaki iç katmana (stripline) alın, kart kenarından ve konnektörlerden uzak tutun.
- Saat sinyalini gereksiz yere konnektöre veya kabloya taşımayın.
- Saat ve veri hatlarını konnektöre giden hatlara paralel çizmeyin; karışma kontrolü için [[calc:crosstalk|karışma hesaplayıcısı]].

## Yayılı spektrum (spread spectrum)

Yayılı spektrum saati (SSC), saat frekansını küçük bir aralıkta (ör. %0,5 aşağı) ve düşük bir hızda (tipik olarak 30 kHz civarı) yavaşça değiştirir. Toplam enerji aynı kalır, ama her harmonik tek bir çizgi yerine bir banda yayılır. EMC alıcısı 30 MHz–1 GHz arasında 120 kHz’lik bir bant genişliğiyle ölçtüğü için okunan tepe değeri düşer; kazanç harmonik numarasıyla artar ve yüksek harmoniklerde birkaç dB’den 10 dB’in üzerine çıkabilir.

- Yalnızca buna toleransı olan arayüzlerde kullanın; PCIe, SATA ve DisplayPort gibi bazı standartlar SSC’yi tanımlar. Ses, hassas ADC örneklemesi veya sıkı zamanlamalı protokollerde sorun çıkarabilir.
- Birçok DC-DC dönüştürücü de anahtarlama frekansını yayarak (frekans titretme) iletilen emisyonu düşürür.

## İletilen ve yayılan emisyon

| | İletilen (conducted) | Yayılan (radiated) |
|---|---|---|
| Frekans | 150 kHz – 30 MHz (CISPR 32) | 30 MHz – 1 GHz; cihazın iç frekanslarına göre 6 GHz’e kadar |
| Nasıl ölçülür | Güç kablosunda LISN (AMN) ile | Antenle, 3 m veya 10 m mesafeden |
| Tipik kaynak | DC-DC anahtarlama frekansı ve harmonikleri | saat harmonikleri, SW çınlaması, kablolardaki ortak mod akım |
| Tipik çözüm | giriş filtresi (LC, CM bobini), CIN yerleşimi, frekans yayma | dönüş yolları, konnektörde filtre, kenar hızı, ekranlama |

Otomotiv ürünleri CISPR 25’e göre test edilir; bu standart AM yayın bandı (yaklaşık 530–1800 kHz) gibi bantları da kapsar. Bu yüzden otomotiv DC-DC dönüştürücüleri çoğu zaman 2 MHz civarında, AM bandının üzerinde çalışır.

Bir giriş filtresinin rezonans frekansı anahtarlama frekansının çok altında olmalıdır. 1 µH ve 10 µF yaklaşık **50,3 kHz**’te rezonansa girer; 500 kHz’te, yani bir dekad yukarıda, ideal LC filtre kabaca **40 dB** bastırır. Güç katının kendisi için [[lesson:power-layout|güç kaynağı yerleşimi dersine]] bakın.

[[calc:rc?mode=lc&lcL=1u&lcC=10u|LC giriş filtresi: 1 µH, 10 µF]]

## Ön uygunluk testi (pre-compliance)

Akredite laboratuvara gitmeden önce tezgâhta çok şey öğrenebilirsiniz:

- **Yakın alan probları** ve bir spektrum analizörüyle kaynakları bulun: H-alan (halka) probu akım döngülerini (SW, saat, dekuplaj), E-alan probu yüksek dV/dt’li düğümleri bulur. Mutlak değere değil, **değişiklik öncesi ve sonrası** farkına bakın.
- Kablolara bir **RF akım probu** (akım kıskacı) takarak ortak mod akımı ölçün; yayılan emisyonla doğrudan ilişkilidir.
- İletilen emisyon için tezgâhta bir **LISN** kullanın.
- Ürünü en kötü durumda çalıştırın: tam yük, tüm arayüzler aktif, kablolar gerçek kullanımdaki gibi bağlı.
- Tasarımda seçenek bırakın: filtre ve ortak mod bobini için yer (0 Ω veya DNP), ekran klipsi padleri, yazılımla açılıp kapatılabilen yayılı spektrum.

> [!TIP] Bağışıklık testleri (ESD, EFT, surge) de aynı yerleşim kurallarından yararlanır; koruma devreleri için [[lesson:esd-protection|ESD ve koruma dersine]] bakın.

## Senaryo: emisyon testinde kalan bir kart

24 V girişli bir buck, 25 MHz’lik bir mikrodenetleyici saati ve bir RS-485 portu olan bir kart, yayılan emisyonda 125 MHz ve 175 MHz’te sınırı aşıyor. Bunlar 25 MHz’in 5. ve 7. harmonikleri. İzlenecek yol:

1. RS-485 kablosuna akım probu takılır: aynı frekanslarda belirgin ortak mod akım var. Sorun kablo üzerinden ışıyor.
2. Yakın alan probuyla kart taranır: saat izi kart kenarına paralel gidiyor ve konnektörün yakınında bir düzlem yarığını geçiyor.
3. Düzeltmeler tek tek denenir ve her biri ölçülür: saat iç katmana, kesintisiz düzlemin üzerine alınır; sürücüye 33 Ω seri direnç eklenir; RS-485 hatlarına ortak mod bobini, kart kenarına dikiş viaları eklenir.

Hangi değişikliğin ne kadar kazandırdığını not ederek ilerleyin; bir sonraki kartta aynı kuralları en baştan uygularsınız.

## Sık yapılan hatalar

- Toprak düzlemini alışkanlıkla AGND/DGND diye bölüp sinyalleri yarıktan geçirmek.
- Katman değiştiren hızlı sinyalin yanına dikiş viası koymamak.
- Filtreyi konnektörden uzağa, kartın ortasına koymak.
- Ekranlı kablonun ekranını uzun bir telle bağlamak.
- Saat ve SW düğümünü konnektörlerin yanından geçirmek.
- Kenar hızını düşünmeden en hızlı çıkış ayarını kullanmak.
- Ön uygunluk testini ürün bittikten sonraya bırakmak.

> [!QUIZ] Hızlı bir sinyal izi GND düzlemindeki 2 mm’lik bir yarığın üzerinden geçiyor. Ne olur, nasıl düzeltirsiniz?
> Dönüş akımı yarığın ucuna kadar dolanır; döngü alanı ve endüktans büyür, yarık ışır, aynı yarığı geçen diğer sinyallerle karışma oluşur. İzi kesintisiz düzlemin üzerinden götürün veya yarığı kaldırın; kaçınılmazsa geçiş noktasının yanına iki düzlemi birleştiren bir dikiş kondansatörü koyun.

> [!QUIZ] Bir I/O hattının ferrit ve kondansatör filtresi nereye konmalı?
> Konnektörün hemen yanına, hattın karttan çıktığı yere; varsa ESD korumasından sonra. Filtrenin toprağı sessiz I/O toprağına bağlanmalı, filtrenin girişi ile çıkışı birbirine paralel gitmemelidir.

> [!QUIZ] 25 MHz’lik saatin kenarını 1 ns’den 3 ns’ye yavaşlattınız. Spektrumda ne değişir?
> Zarfın 40 dB/dekad düşmeye başladığı köşe 1/(π·tr) ≈ 318 MHz’ten ≈ 106 MHz’e iner. 318 MHz’in üzerinde harmonikler yaklaşık 9,5 dB daha düşük olur; saat frekansı ve düşük harmonikler değişmez.

> [!QUIZ] Yayılı spektrum saat toplam yayılan enerjiyi azaltır mı?
> Hayır. Enerjiyi tek bir frekans yerine bir banda yayar; ölçüm alıcısı dar bir bant genişliğiyle ölçtüğü için okunan tepe değeri düşer. Asıl kaynaklar (döngüler, kablolar) aynı kalır.

> [!QUIZ] Kartın sağ kenarında USB, sol kenarında güç kablosu var ve emisyon yüksek. Yerleşimde neyi sorgularsınız?
> İki kablo arasındaki kart toprağında oluşan gürültü gerilimi iki kabloyu bir dipol anten gibi sürer. Konnektörleri mümkünse aynı kenara toplayın; değilse her iki konnektörde filtreleme ve sağlam bir şasi bağlantısı ile ortak mod akımını bastırın.

## Kontrol listesi

- Her hızlı sinyalin altında kesintisiz bir referans düzlem var; hiçbir iz yarık geçmiyor.
- Katman değişimlerinde GND dikiş viaları veya dekuplaj kondansatörleri var.
- Toprak düzlemi bölünmedi, bölümler yerleşimle ayrıldı; bölme varsa tek noktada birleşiyor.
- Kart kenarı ve GND dökümleri λ/20’den sık vialarla dikildi; bağlantısız bakır adası yok.
- Konnektörler mümkünse tek kenarda; her hat konnektörde filtreleniyor; ekranlar 360° bağlanıyor.
- Saatler kısa, iç katmanda, kenarlardan uzak; kenar hızları gerektiği kadar.
- Filtre ve ortak mod bobini için yer bırakıldı; ön uygunluk testi planlandı.
`,
    en: `
## Why it matters

Electromagnetic compatibility (EMC) asks two things: your product must not disturb its surroundings (**emissions**) and must not be disturbed by them (**immunity**). The EMC Directive (2014/30/EU) for the CE mark in the EU and FCC Part 15 in the US make this mandatory. A failed EMC test usually shows up at the very end of a project, when the board, enclosure and cables are done; fixing it then is expensive: extra filters, shielding, another board spin.

Most EMC problems are designed into the layout, and most share one root: **the path the current takes back**. This lesson shows how to keep that path short and predictable, why you should think of cables as antennas, and how to prepare for the test.

## Every current is a loop

Signal and supply currents must return to their source. At low frequency the return current takes the path of lowest **resistance** and spreads widely through the plane. As frequency rises the path of lowest **inductance** dominates: the return current flows in the plane right under the trace, following its route. In the MHz range contained in any fast digital edge this holds almost completely. For a cross-section view see the [[lesson:stackup|stack-up lesson]].

[[fig:return-split]]

The loop area sets three things at once: inductance, radiation and pickup of external fields. A small loop means fewer emissions and better immunity.

## Splits and layer changes

- **Do not route traces over a split.** The return current detours to the end of the split; the loop grows, the impedance jumps at that point, the split radiates like an antenna, and signals crossing the same split couple to each other.
- **Watch for hidden splits:** the antipads of dense via rows under connectors and BGAs can merge into a long gap in the plane. Check the plane layer in the Gerber view.
- **Layer changes:** when a signal changes layers, its return current must change reference planes too. If both references are GND, place a **GND stitching via** next to the signal via; if one is GND and the other a power plane, have a decoupling capacitor nearby.
- If crossing a split is unavoidable, place a small ceramic capacitor joining the two planes (a stitching capacitor) right next to the crossing.

## AGND and DGND: split or not?

The most common beginner mistake is splitting the ground plane into "analog" and "digital" halves and then routing signals across the gap. For most mixed-signal boards a better approach is:

1. Use **one solid GND plane**.
2. **Partition by placement:** put the analog, digital and power sections in separate areas.
3. Place parts and traces so that digital and power return currents do not flow through the analog area; keep analog traces in the analog area.

On an ADC or DAC with AGND and DGND pins, both pins are usually tied to the same (analog) ground right under the chip; see the datasheet and the Analog Devices tutorial MT-031.

Real reasons to split are few: the datasheet explicitly asks for it, large low-frequency currents such as motors or relays must be kept out of a sensitive measurement ground, or there is an isolation barrier (then it is isolation, not a split). If you split, join the grounds at **a single point** and cross the gap only over that bridge.

> [!WARN] "Star grounding" is a good idea for low-frequency currents; at high frequency, long ground connections are inductors. Fast signals always need a solid plane underneath.

## Stitching vias and board edges

- Tie top and bottom GND pours to the inner plane with closely spaced vias. Copper islands that are unconnected or connected by a single via can resonate: stitch them or delete them.
- Run a **via fence** along the board edge and plane edges. A common rule is to keep the spacing below **λ/20** at the highest frequency of concern. Inside FR-4 (εr ≈ 4.3), λ ≈ 145 mm at 1 GHz, so λ/20 ≈ **7.2 mm**.
- Keep fast traces away from the board edge and plane edges; at the edge the field lines spill out.

[[calc:emc|EMC helpers]] [[calc:stackup|Stack-up]]

## Cables are antennas

Radiated emissions in the 30–300 MHz range often come not from the board itself but from the **cables** attached to it. A 1 m cable is half a wavelength at 150 MHz: a very good antenna.

[[fig:cm-dm]]

- **Differential-mode (DM)** current goes out on one wire and back on the other; their fields largely cancel.
- **Common-mode (CM)** current flows the same way on all wires of the cable and returns through stray capacitances. The loop is large and the cable radiates like an antenna. Even a few microamps of common-mode current can be enough to exceed emission limits.

The source of common-mode current is usually on the board: noise voltage between the connector ground and the rest of the board, a plane split under the connector, or a noisy trace coupling into a line near the connector. Countermeasures:

- Put all connectors on **one board edge** if you can; with cables on two edges, the board’s ground noise drives them directly as an antenna.
- Leave a quiet I/O ground around the connectors; keep clocks, the SW node and fast buses away from that area.
- Bond the shield of a shielded cable to chassis **360°** at the connector; a long wire (pigtail) makes the shield useless at high frequency.

## Filtering at the connector

Every line leaving the board should be filtered where it leaves: right next to the connector, after the ESD protection if present, with the filter ground tied to the quiet I/O ground. If the filter’s input and output run parallel and close, the noise jumps over the filter.

- **Ferrite beads:** specified by their impedance at 100 MHz (e.g. 600 Ω @ 100 MHz). DC current lowers this impedance; check the curve under bias. With a capacitor it forms an LC low-pass that can peak at resonance; damp it if needed.
- **RC filters:** simple and effective on slow signals (buttons, LEDs, low-speed UART). 100 Ω with 100 pF has a cut-off of about **15.9 MHz**.
- **Common-mode chokes:** pass the differential signal almost untouched and present a high impedance to common-mode current. Used on pairs such as CAN, RS-485 and USB and on power inputs; on fast interfaces choose a part specified for that interface, or signal integrity suffers.

[[calc:rc?mode=rc&rcR=100&rcC=100p|RC filter: 100 Ω, 100 pF]]

## Clock harmonics and edge rate

A square-wave clock produces harmonics at odd multiples of its frequency. Their envelope falls at 20 dB/decade first and at 40 dB/decade above the **1/(π·tr)** corner. So the energy at high frequency is set by the **rise time**, not by the clock frequency.

Example: a 25 MHz clock. With 1 ns edges the corner is about **318 MHz**; with 3 ns edges about **106 MHz**. At every frequency above 318 MHz the slow edge’s envelope is 20·log(3) ≈ **9.5 dB** lower.

For the same edge the signal calculator gives the bandwidth as 0.35/tr and the knee frequency as 0.5/tr (350 MHz and 500 MHz for 1 ns). These are different definitions of the same idea: the faster the edge, the higher the frequencies its energy reaches.

[[calc:signal?tr=1&tr_u=ns|1 ns edge]] [[calc:signal?tr=3&tr_u=ns|3 ns edge]]

- Make edges only as fast as needed: lower the microcontroller’s output speed (slew-rate) setting, add a 22–33 Ω series resistor at the driver.
- Keep clock traces short, on an inner layer between two planes (stripline), away from board edges and connectors.
- Do not carry clocks to connectors or cables without need.
- Do not run clocks and data lines parallel to lines going to a connector; check with the [[calc:crosstalk|crosstalk calculator]].

## Spread spectrum

A spread-spectrum clock (SSC) slowly varies the clock frequency over a small range (e.g. 0.5 % down) at a low rate (typically around 30 kHz). The total energy stays the same, but each harmonic is spread over a band instead of one line. Because the EMC receiver measures with a 120 kHz bandwidth between 30 MHz and 1 GHz, the peak reading drops; the gain grows with the harmonic number and can go from a few dB to more than 10 dB at high harmonics.

- Use it only on interfaces that tolerate it; some standards, such as PCIe, SATA and DisplayPort, define SSC. It can cause trouble with audio, precise ADC sampling or tightly timed protocols.
- Many DC-DC converters also spread their switching frequency (frequency dithering) to lower conducted emissions.

## Conducted and radiated emissions

| | Conducted | Radiated |
|---|---|---|
| Frequency | 150 kHz – 30 MHz (CISPR 32) | 30 MHz – 1 GHz; up to 6 GHz depending on the device’s internal frequencies |
| Measured with | a LISN (AMN) on the power cable | an antenna at 3 m or 10 m |
| Typical source | DC-DC switching frequency and its harmonics | clock harmonics, SW ringing, common-mode current on cables |
| Typical fix | input filter (LC, CM choke), CIN placement, frequency spreading | return paths, filtering at connectors, edge rate, shielding |

Automotive products are tested to CISPR 25, which also covers bands such as AM broadcast (about 530–1800 kHz). That is why automotive DC-DC converters often run around 2 MHz, above the AM band.

The resonance of an input filter must be far below the switching frequency. 1 µH and 10 µF resonate at about **50.3 kHz**; at 500 kHz, a decade higher, an ideal LC filter attenuates roughly **40 dB**. For the power stage itself see the [[lesson:power-layout|power supply layout lesson]].

[[calc:rc?mode=lc&lcL=1u&lcC=10u|LC input filter: 1 µH, 10 µF]]

## Pre-compliance testing

You can learn a lot on the bench before going to an accredited lab:

- Find sources with **near-field probes** and a spectrum analyser: an H-field (loop) probe finds current loops (SW, clocks, decoupling), an E-field probe finds nodes with high dV/dt. Look at the **before and after** difference, not at absolute values.
- Clamp an **RF current probe** around cables to measure common-mode current; it correlates directly with radiated emissions.
- Use a **LISN** on the bench for conducted emissions.
- Run the product in its worst case: full load, all interfaces active, cables connected as in real use.
- Leave options in the design: spots for filters and CM chokes (0 Ω or DNP), shield-clip pads, spread spectrum that firmware can switch on and off.

> [!TIP] Immunity tests (ESD, EFT, surge) benefit from the same layout rules; for protection circuits see the [[lesson:esd-protection|ESD and protection lesson]].

## Scenario: a board that fails the emissions test

A board with a 24 V input buck, a 25 MHz microcontroller clock and an RS-485 port exceeds the radiated limit at 125 MHz and 175 MHz: the 5th and 7th harmonics of 25 MHz. The way forward:

1. A current probe on the RS-485 cable shows clear common-mode current at the same frequencies. The problem radiates from the cable.
2. A near-field scan of the board shows the clock trace running parallel to the board edge and crossing a plane split near the connector.
3. Fixes are tried one at a time, each one measured: the clock moves to an inner layer over a solid plane; a 33 Ω series resistor is added at the driver; a common-mode choke goes on the RS-485 lines and stitching vias along the board edge.

Note how much each change gains; on the next board you apply the same rules from the start.

## Common mistakes

- Splitting the ground plane into AGND/DGND out of habit and routing signals across the gap.
- No stitching via next to a fast signal that changes layers.
- Placing the filter in the middle of the board, far from the connector.
- Connecting a cable shield with a long wire.
- Routing clocks and the SW node next to connectors.
- Using the fastest output setting without thinking about edge rate.
- Leaving pre-compliance testing until the product is finished.

> [!QUIZ] A fast signal trace crosses a 2 mm split in the GND plane. What happens, and how do you fix it?
> The return current detours to the end of the split; loop area and inductance grow, the split radiates, and other signals crossing the same split couple in. Route the trace over solid plane or remove the split; if crossing is unavoidable, place a stitching capacitor joining the two planes next to the crossing.

> [!QUIZ] Where should the ferrite and capacitor filter of an I/O line go?
> Right next to the connector, where the line leaves the board, after the ESD protection if present. The filter ground must connect to the quiet I/O ground, and the filter’s input and output must not run parallel.

> [!QUIZ] You slowed the edges of a 25 MHz clock from 1 ns to 3 ns. What changes in the spectrum?
> The corner where the envelope starts falling at 40 dB/decade moves from 1/(π·tr) ≈ 318 MHz down to ≈ 106 MHz. Above 318 MHz the harmonics are about 9.5 dB lower; the clock frequency and the low harmonics stay the same.

> [!QUIZ] Does a spread-spectrum clock reduce the total radiated energy?
> No. It spreads the energy over a band instead of one frequency; since the receiver measures with a narrow bandwidth, the peak reading drops. The real sources (loops, cables) stay the same.

> [!QUIZ] The board has USB on its right edge and the power cable on its left, and emissions are high. What do you question in the layout?
> Noise voltage across the board ground between the two cables drives them like a dipole antenna. Put the connectors on the same edge if you can; otherwise suppress the common-mode current with filtering and a solid chassis connection at both connectors.

## Checklist

- Every fast signal has a solid reference plane underneath; no trace crosses a split.
- GND stitching vias or decoupling capacitors at every layer change.
- The ground plane is not split; sections are separated by placement. If there is a split, it joins at one point.
- Board edges and GND pours are stitched with vias closer than λ/20; no unconnected copper islands.
- Connectors on one edge where possible; every line filtered at the connector; shields bonded 360°.
- Clocks short, on inner layers, away from edges; edge rates only as fast as needed.
- Spots left for filters and common-mode chokes; pre-compliance testing planned.
`,
  },
};
