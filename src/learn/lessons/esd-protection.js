import { figureFrom } from '../figures.js';
import { text, rect, path, circle, arrow, wire, node, ground, terminal, twoTerm, mosfet } from '../../ui/svg.js';

const S = {
  tr: {
    tvsCap: 'Üstten görünüş. Solda TVS konnektörün hemen yanında, sinyal TVS padinin üzerinden geçiyor ve GND padi vialarla doğrudan düzleme bağlı; ESD akımı karta girer girmez toprağa gider, seri direnç entegreye kalan akımı sınırlar. Sağda TVS entegrenin yanında, bir stub ile bağlı ve GND yolu uzun: darbe tüm izi dolaşır, entegreye de ulaşır ve yolun endüktansı kıskaç gerilimine eklenir.',
    good: '✓ konnektörde TVS, kısa GND',
    bad: '✗ TVS uzakta, uzun GND yolu',
    longL: 'uzun yol: L·di/dt',
    pmosCap: 'Ters polarite koruması için P-MOSFET: dren girişe, kaynak yüke bağlanır. Doğru kutuplamada önce gövde diyotu iletir; kapı RG ile toprağa çekildiği için VGS ≈ −VIN olur ve FET tamamen açılır. Ters bağlantıda VGS ≥ 0 kalır, FET kapalıdır ve gövde diyotu ters kutuplanır. DZ, VIN yüksekse VGS’yi sınırlar.',
    body: 'gövde diyotu',
    load: 'Yük',
  },
  en: {
    tvsCap: 'Top view. Left: the TVS sits right next to the connector, the signal passes over the TVS pad and the GND pad goes straight to the plane through vias; the ESD current reaches ground as soon as it enters the board, and a series resistor limits what is left for the IC. Right: the TVS sits next to the IC, on a stub, with a long GND path: the pulse travels the whole trace, also reaches the IC, and the path inductance adds to the clamping voltage.',
    good: '✓ TVS at the connector, short GND',
    bad: '✗ TVS far away, long GND path',
    longL: 'long path: L·di/dt',
    pmosCap: 'P-MOSFET reverse-polarity protection: the drain goes to the input, the source to the load. With correct polarity the body diode conducts first; the gate is pulled to ground through RG, so VGS ≈ −VIN and the FET turns fully on. Reversed, VGS stays ≥ 0, the FET is off and the body diode is reverse biased. DZ limits VGS when VIN is high.',
    body: 'body diode',
    load: 'Load',
  },
};

const trace = (d, w) => `<path class="cutr" style="stroke-width:${w}" d="${d}"/>`;
const flowArrow = (x1, y1, x2, y2) => arrow(x1, y1, x2, y2, { cls: 'flow', headCls: 'arrow flow' });

/** One top-view panel (local coordinates, 200 wide). */
function tvsPanel(good, s) {
  let b = rect(5, 14, 190, 150, 'cu plane') + text(176, 156, 'GND', { cls: 'name' });
  // Connector J1 with three pins; the middle one carries the signal.
  b += rect(5, 44, 22, 84, 'comp', ' rx="2"') + text(16, 38, 'J1', { cls: 'name' });
  b += [56, 82, 108].map((y) => rect(22, y, 10, 8, 'cu')).join('');
  b += trace('M32,86H150', 3);
  b += rect(150, 60, 44, 54, 'comp', ' rx="3"') + text(172, 91, 'IC', { cls: 'name' });
  b += text(36, 50, 'ESD', { cls: 'val', anchor: 'start' });
  if (good) {
    // TVS right at the connector, signal over its pad, GND vias at the pad.
    b += rect(48, 80, 14, 36, 'comp') + rect(48, 80, 14, 10, 'cu') + rect(48, 106, 14, 10, 'cu');
    b += text(66, 112, 'TVS', { cls: 'name', anchor: 'start' });
    b += circle(51, 124, 2.4, 'hole') + circle(59, 124, 2.4, 'hole');
    b += rect(104, 80, 24, 12, 'comp') + text(116, 75, 'R', { cls: 'name' }) + text(116, 106, '22–100 Ω');
    b += path('M30,76H42', 'flow') + flowArrow(42, 76, 42, 126);
  } else {
    // TVS next to the IC on a stub, thin GND trace to a single distant via.
    b += trace('M128,86V98', 2);
    b += rect(121, 98, 14, 36, 'comp') + rect(121, 98, 14, 10, 'cu') + rect(121, 124, 14, 10, 'cu');
    b += text(139, 132, 'TVS', { cls: 'name', anchor: 'start' });
    b += trace('M128,134V146H76', 1.5) + circle(73, 146, 2.4, 'hole');
    b += path('M30,77H116V141H86', 'flow') + flowArrow(94, 141, 80, 141);
    b += flowArrow(134, 77, 148, 77);
    b += text(64, 160, s.longL);
  }
  b += text(100, 182, good ? s.good : s.bad, { cls: good ? 'okt' : 'badt' });
  return b;
}

function tvsLayout(lang) {
  const s = S[lang] ?? S.en;
  return figureFrom(420, 190, s.tvsCap,
    `<g transform="translate(8,0)">${tvsPanel(true, s)}</g><g transform="translate(214,0)">${tvsPanel(false, s)}</g>`);
}

/** High-side P-MOSFET reverse-polarity protection. */
function reversePmos(lang) {
  const s = S[lang] ?? S.en;
  const y = 70;
  const b = terminal(40, y, 'VIN', 'left') + wire([40, y], [174, y])
    // Vertical MOSFET symbol turned so drain → left, source → right, gate → down.
    + `<g transform="translate(200,82) rotate(-90)">${mosfet(0, 0, { p: true })}</g>`
    + text(182, 63, 'D', { anchor: 'start' }) + text(216, 63, 'S', { anchor: 'start' })
    + text(206, 110, 'G', { anchor: 'start' })
    + text(176, 104, 'Q1', { cls: 'name', anchor: 'end' }) + text(176, 118, 'P-MOSFET', { anchor: 'end' })
    // Body diode (dashed): anode at the drain, cathode at the source.
    + path('M166,70V40M234,40V70', 'wire dash')
    + twoTerm('D', 166, 40, 234, 40, { dashed: true })
    + text(200, 26, s.body)
    + node(166, y) + node(234, y)
    + wire([226, y], [340, y])
    // Gate: pulled to ground through RG, VGS clamped by DZ (cathode at the source).
    + wire([200, 100], [200, 112]) + node(200, 112) + wire([200, 112], [250, 112])
    + twoTerm('R', 200, 112, 200, 160, { name: 'RG', value: '100 kΩ' })
    + twoTerm('Z', 250, 112, 250, y, { name: 'DZ', value: '12 V' })
    + node(250, y) + node(340, y)
    + ground(200, 160)
    + twoTerm('R', 340, y, 340, 140, { name: s.load })
    + ground(340, 140);
  return figureFrom(420, 180, s.pmosCap, b);
}

export default {
  figures: { 'tvs-layout': tvsLayout, 'reverse-pmos': reversePmos },
  body: {
    tr: `
## Neden önemli?

Bir kart laboratuvarda sorunsuz çalışabilir ama sahada bambaşka bir dünyayla karşılaşır: halıda yürüyen bir kullanıcının parmağından atlayan birkaç kV’luk kıvılcım, yakındaki bir kontaktörün açılıp kapanmasıyla kablolara binen hızlı darbeler, yıldırımın veya şebeke anahtarlamasının yarattığı yüksek enerjili dalgalanmalar, ters bağlanan bir besleme kablosu ya da kısa devre olan bir çıkış.

Sonuç her zaman yanık bir entegre değildir. Daha sık görülen "yumuşak" arızalardır: reset, donma, bozulan bir haberleşme paketi. Bazen de hasar gizlidir: parça çalışmaya devam eder ama zayıflamıştır ve haftalar sonra bozulur. Bu ders bu olayları, standartların onları nasıl test ettiğini ve kart üzerinde nasıl korunacağınızı anlatır.

> [!NOTE] Entegre veri sayfalarındaki "±2 kV HBM" gibi ESD değerleri, parçanın üretim ve montaj sırasında elle tutulmasına karşı dayanıklılığıdır. 100 pF / 1,5 kΩ’luk İnsan Vücudu Modeli’nde (HBM) 2 kV yaklaşık 1,3 A tepe akım demektir; sistem seviyesindeki IEC testinde 8 kV temas deşarjı yaklaşık 30 A’dir. Entegrenin kendi koruması sistem seviyesi için yeterli değildir.

## Üç farklı darbe: ESD, EFT ve surge

| Standart | Olay | Dalga şekli | Enerji | Tipik test seviyeleri |
|---|---|---|---|---|
| IEC 61000-4-2 (ESD) | İnsandan veya bir nesneden elektrostatik deşarj | ≈ 0,8 ns yükselme, onlarca ns süren darbe | düşük, ama çok hızlı ve yüksek akımlı | temas 2/4/6/8 kV, hava 2/4/8/15 kV |
| IEC 61000-4-4 (EFT/burst) | Röle, kontaktör gibi endüktif yüklerin anahtarlanması | 5/50 ns darbeler, 5 kHz veya 100 kHz’lik paketler halinde | darbe başına düşük, ama tekrarlı | güç portu 0,5–4 kV, sinyal portu 0,25–2 kV |
| IEC 61000-4-5 (surge) | Yıldırımın endüklediği gerilimler, şebeke anahtarlaması | 1,2/50 µs gerilim, 8/20 µs akım | yüksek (joule mertebesinde) | 0,5/1/2/4 kV |

Hangi testin, hangi portta, hangi seviyede yapılacağını ürününüzün standardı belirler. Örneğin genel bağışıklık standartları (konut ortamı için IEC 61000-6-1, endüstriyel ortam için IEC 61000-6-2) ESD için ±4 kV temas ve ±8 kV hava deşarjı ister.

### IEC 61000-4-2 seviyeleri

| Seviye | Temas deşarjı | Hava deşarjı | İlk tepe akımı (temas) |
|---|---|---|---|
| 1 | 2 kV | 2 kV | 7,5 A |
| 2 | 4 kV | 4 kV | 15 A |
| 3 | 6 kV | 8 kV | 22,5 A |
| 4 | 8 kV | 15 kV | 30 A |

Test tabancası 150 pF’lık bir kondansatörü 330 Ω üzerinden boşaltır. Akım yaklaşık 0,8 ns’de tepeye çıkar; 8 kV’ta 30 ns’de 16 A, 60 ns’de 8 A olmalıdır. Temas deşarjı iletken yüzeylere (metal kutu, konnektör kılıfı) uygulanır; hava deşarjı yalıtkan yüzeylere, tabanca yaklaştırılıp kıvılcım atlatılarak yapılır.

Sonuç üç başarım ölçütüyle değerlendirilir: **A** test sırasında normal çalışma; **B** geçici bozulma, ama kendiliğinden toparlanma; **C** kullanıcı müdahalesi (reset, yeniden başlatma) gerektiren geçici işlev kaybı. ESD ve EFT için genellikle B istenir.

## TVS diyot nasıl çalışır?

TVS (geçici gerilim bastırıcı) diyot normal çalışmada neredeyse hiç akım çekmez. Hat gerilimi kırılma gerilimini aşınca iletime geçer ve fazla akımı toprağa akıtır; korunan hattaki gerilim kıskaç gerilimi civarında tutulur.

| Parametre | Anlamı |
|---|---|
| VRWM | Ters çalışma gerilimi: bu gerilime kadar TVS iletmez, yalnızca küçük bir kaçak akım (IR) çeker |
| VBR | Kırılma gerilimi; belirli bir test akımında (ör. 1 mA) ölçülür, VRWM’den biraz yüksektir |
| VC | Belirtilen tepe darbe akımında (IPP) hattın göreceği kıskaç gerilimi |
| IPP, PPP | Dayanılan tepe darbe akımı ve gücü (8/20 µs veya 10/1000 µs dalga için) |
| CJ | Jonksiyon kapasitesi; hızlı hatlarda sinyali bozar |
| Rdyn | Dinamik direnç: VC ≈ VBR + IPP · Rdyn |

## TVS seçimi

1. **VRWM ≥ hattın en yüksek normal gerilimi.** Toleransı, normal çalışmadaki aşmaları ve olası farklı modları (ör. USB PD ile VBUS’un 5 V’un üzerine çıkması) hesaba katın.
2. **VC, korunan parçanın mutlak en yüksek değerinin altında olsun.** Bu her zaman tam sağlanamaz; düşük VC ve düşük Rdyn’li parça seçin (ESD için veri sayfasındaki TLP ölçümüne bakın) ve TVS ile entegre arasına seri direnç koyarak entegreye kalan akımı sınırlayın.
3. **Kapasite:** yavaş hatlarda (buton, düşük hızlı GPIO, 1 Mbit/s CAN) onlarca pF sorun değildir, hatta filtre gibi yardım eder. USB 2.0 High-Speed gibi yüzlerce Mbit/s’lik hatlarda birkaç pF’ın altı, USB 3.x ve HDMI gibi çok gigabitlik hatlarda yaklaşık 0,5 pF ve altı gerekir; arayüz için önerilen parçalara bakın.
4. **Tek yönlü veya çift yönlü:** hiç negatife inmeyen hatlarda tek yönlü TVS (negatif darbeyi diyot gibi kırpar), iki yöne salınan hatlarda (ses, RS-485, CAN) çift yönlü TVS kullanın. RS-485 gibi asimetrik ortak mod aralığı olan hatlar için asimetrik parçalar vardır.
5. **Güç:** surge için darbe gücü önemlidir. SMAJ, SMBJ ve SMCJ serileri 10/1000 µs’de sırasıyla yaklaşık 400 W, 600 W ve 1500 W’lık parçalardır.
6. **Kaçak akım:** pil ömrü kritik ürünlerde ve yüksek empedanslı analog girişlerde IR önemlidir.

### Örnek: 24 V endüstriyel DC giriş

24 V’luk hat sahada 30 V’a çıkabiliyor. VRWM = 30 V olan bir TVS seçilir (ör. SMBJ30A); bu sınıf bir parçanın tepe akımındaki kıskaç gerilimi yaklaşık **48 V**’tur (veri sayfasına bakın). Kaba bir kural olarak standart TVS’lerde VC, VRWM’nin yaklaşık 1,6 katı veya biraz fazlasıdır. Bu yüzden TVS’den sonra gelen regülatör ve kondansatörler en az 50 V’a, tercihen 60 V’a dayanmalıdır. Aralıkları da unutmayın: dış katmanda 31–50 V bölgesi için IPC-2221 en az 0,6 mm ister.

[[calc:spacing?V=48&cat=B2|48 V için dış katman aralığı]]

### Örnek: USB 2.0 portu

D+ ve D− için kapasitesi 1 pF civarında veya altında, VRWM’si 5 V olan çok kanallı bir ESD dizisi kullanılır; çoğu parça VBUS için de bir kanal içerir. Dizi konnektörün hemen arkasına, iki hat da padlerin üzerinden geçecek ve çiftin simetrisi bozulmayacak şekilde yerleştirilir.

## Yerleşim: konnektörde, kısa GND yolu

[[fig:tvs-layout]]

8 kV’luk bir ESD akımı yaklaşık 0,8 ns’de 30 A’e çıkar. Bu hızda TVS’nin yolundaki her nanohenri gerilim ekler:

\`\`\`
V = L · di/dt = 1 nH · 30 A / 0,8 ns ≈ 37,5 V
\`\`\`

Bu gerilim TVS’nin kıskaç geriliminin **üzerine** biner; 2 nH’lik bir stub ve via korunan hatta 75 V daha demektir. Bu yüzden:

- TVS’yi **konnektörün hemen yanına** koyun; darbe karta girer girmez yakalansın.
- Sinyali **TVS padinin üzerinden geçirin** (flow-through); TVS’ye T şeklinde bir stub’la gitmeyin.
- TVS’nin GND padini en kısa yoldan GND düzlemine bağlayın: padin yanına veya içine bir ya da birkaç via; ince ve uzun bir iz değil.
- Konnektör ile TVS arasındaki korunmasız izi kısa tutun ve başka izlerle paralel götürmeyin; yoksa darbe, TVS’ye ulaşmadan komşu hatlara kuple olur.
- TVS’den sonra entegreye giden yola bir **seri direnç** (yavaş hatlarda 22–100 Ω) veya ferrit boncuk koyun. Kalan akımı sınırlar ve entegrenin giriş kapasitesiyle küçük bir filtre oluşturur.

[[calc:via?d=0.3&d_u=mm&L=1.6|Tek bir vianın endüktansı]]

## Şasi toprağı ve sinyal toprağı

ESD akımının ideal yolu, devrenin içinden geçmeden şasiye ve oradan toprağa gitmektir.

- Metal kutuyu ve konnektör kılıflarını (shield) **şasiye** bağlayın.
- Şasi ile devre toprağını I/O bölgesinde, konnektörlerin yanında birleştirin: kısa, doğrudan bir bağlantıyla veya bir kondansatör üzerinden. USB kılıfı için yaygın bir çözüm, kılıfı devre toprağına bir kondansatör ve ona paralel yüksek değerli bir boşaltma direnciyle (ör. 1 MΩ) bağlamaktır.
- Plastik kutulu ürünlerde kıvılcım boşluklardan ve birleşim yerlerinden girer: hassas devreleri bu açıklıklardan uzak tutun, butonlarda yalıtkan kapak kullanın, dokunulabilen metal parçaları ya toprağa bağlayın ya da tamamen yalıtın.
- Pilli ve toprağa bağlı olmayan cihazlar da ESD görür; deşarj akımı cihazın kendi kapasitesine akar. TVS yine gereklidir.

Yerleşimin geri kalanı için [[lesson:grounding-emc|topraklama ve EMC dersine]] bakın.

## EFT ve surge için ne değişir?

- **EFT:** darbe başına enerji düşüktür ama darbeler hızlı ve paketler halinde gelir. Kablo girişlerinde filtreleme (ferrit + kondansatör), TVS ve iyi bir şasi bağlantısı gerekir. Yazılım da önemlidir: watchdog, girişleri birkaç kez örnekleme, haberleşmede yeniden deneme.
- **Surge:** enerji yüksektir; küçük ESD diyotları yetmez. Güç girişlerinde SMBJ/SMCJ gibi büyük TVS’ler, şebeke girişlerinde varistör (MOV), uzun hatlarda gaz deşarj tüpü (GDT) kullanılır. Kaba ve ince korumayı aralarına bir seri empedans koyarak kademeleyin: büyük enerjiyi önce GDT veya MOV alır, kalanı TVS kıskaçlar.

## Ters polarite koruması

Besleme kablosu ters bağlanırsa elektrolitik kondansatörler, regülatörler ve entegrelerin koruma diyotları zarar görür. Yaygın çözümler:

| Yöntem | 2 A’de kayıp | Artısı | Eksisi |
|---|---|---|---|
| Seri Schottky diyot | ≈ 0,45 V · 2 A ≈ 0,9 W | basit, ucuz, ters akımı da keser | gerilim düşümü ve ısı |
| Yüksek tarafta P-MOSFET | I²·R: 20 mΩ ile ≈ 80 mW | düşük kayıp | iletimdeyken ters akımı kesmez; VGS sınırı |
| Alçak tarafta N-MOSFET | düşük | ucuz, düşük RDS(on) | kartın toprağı girişin toprağından ayrılır |
| İdeal diyot denetleyicisi + N-MOSFET | çok düşük | ters akımı da hızla keser | maliyet, ek entegre |
| Sigorta + paralel diyot | normalde yok | çok ucuz | ters bağlantıda sigorta atar, değişmesi gerekir |

[[fig:reverse-pmos]]

P-MOSFET’te yön sık karıştırılır: **dren girişe, kaynak yüke** bağlanır. Doğru kutuplamada önce gövde diyotu iletir; kapı toprağa çekildiği için VGS ≈ −VIN olur ve FET tamamen açılır. Ters bağlantıda VGS ≥ 0 olduğundan FET kapalıdır ve gövde diyotu ters kutuplanır. VIN, MOSFET’in VGS sınırını (çoğu parçada ±20 V) aşabiliyorsa kapı ile kaynak arasına bir zener, kapıya da seri bir direnç koyun. Kayıpları [[calc:mosfet|MOSFET kayıpları]] ile kontrol edin.

## Aşırı akım koruması

- **Sigorta:** tek kullanımlıktır ve en kesin korumadır. Anma akımını üreticinin değer düşürme eğrisine, gerilim sınıfını devre gerilimine, kesme kapasitesini olası kısa devre akımına göre seçin. Açılışta kondansatörleri dolduran ani akım (inrush) sigortayı yormamalıdır: sigortanın erime I²t değeri, ani akım darbesinin I²t değerinden rahatça büyük olmalıdır.
- **PTC (kendini sıfırlayan sigorta):** aşırı akımda ısınıp direnci yükselir, akım kesilince soğuyup geri döner. Tutma akımı (Ihold) ve açma akımı (Itrip, tipik olarak Ihold’un yaklaşık iki katı) vardır; açması saniyeler sürebilir ve ortam sıcaklığıyla değişir.
- **eFuse veya akım sınırlı yük anahtarı:** mikrosaniyeler içinde ve ayarlanabilir bir sınırla keser; çoğu aşırı gerilim, ters akım ve yumuşak başlatma (dV/dt) koruması da sağlar.

Koruma devreye girene kadar arıza akımını taşıyan iz, via ve konnektörler dayanmalıdır: sigortanın açma süresince izin erimeyeceğini kontrol edin.

[[calc:inrush|Ani akım ve yumuşak başlatma]] [[calc:fusing|İz ve via eritme akımı]] [[calc:trace|İz genişliği]]

## Sık yapılan hatalar

- TVS’yi entegrenin yanına, konnektörden uzağa koymak.
- TVS’ye stub ile gitmek ve GND bağlantısını ince, uzun bir izle yapmak.
- VRWM’yi hattın normal geriliminin altında veya tam sınırında seçmek: TVS normal çalışmada iletir ve ısınır.
- Kıskaç gerilimini unutup TVS’den sonraki parçaları düşük gerilim sınıfıyla seçmek.
- Hızlı bir veri hattına yüksek kapasiteli bir TVS koymak.
- P-MOSFET’i ters yönde bağlamak: gövde diyotu ters polaritede iletir ve koruma işe yaramaz.
- Sigortayı ani akımı hesaba katmadan seçmek.

> [!QUIZ] 3,3 V’luk bir GPIO hattı kullanıcının dokunabildiği bir butona gidiyor. Nasıl korursunuz?
> Konnektörün veya butonun hemen yanına VRWM’si 3,3 V veya biraz üzeri olan bir ESD diyotu ve GND padinin yanına bir via. TVS ile mikrodenetleyici arasına 100 Ω civarında bir seri direnç, gerekirse küçük bir kondansatörle RC filtre; yazılımda debounce.

> [!QUIZ] TVS’nin GND bağlantısı 2 nH’lik bir yol üzerinden yapılmış. 8 kV temas deşarjında korunan hat kabaca ne kadar ek gerilim görür?
> 8 kV’ta ilk tepe akımı yaklaşık 30 A, yükselme süresi yaklaşık 0,8 ns. V = L · di/dt = 2 nH · 30 A / 0,8 ns ≈ 75 V; bu gerilim TVS’nin kıskaç geriliminin üzerine biner.

> [!QUIZ] 12 V’luk bir hat için VRWM’si 12 V olan bir TVS yeterli mi?
> Sınırda. Hattın toleransı veya normal aşmaları 12 V’u geçerse TVS iletmeye başlar, kaçak artar ve ısınır. Hattın en yüksek normal gerilimini bulun, VRWM’yi onun üzerinde seçin; sonra kıskaç geriliminin sonraki parçalar için uygun olduğunu kontrol edin.

> [!QUIZ] Ters polarite için seri Schottky yerine P-MOSFET kullandınız ve 2 A’de kayıp 0,9 W’tan 80 mW’a düştü. Neye dikkat etmelisiniz?
> Doğru yöne (dren girişe, kaynak yüke), VGS sınırına (gerekirse zener ve seri direnç) ve FET iletimdeyken ters akımı kesmediğine. Giriş düştüğünde çıkış kondansatörlerinden girişe akım akabilir; bu önemliyse ideal diyot denetleyicisi kullanın.

## Kontrol listesi

- Ürün standardına göre ESD, EFT ve surge seviyeleri ve başarım ölçütleri belirlendi.
- Kullanıcıya veya kabloya açılan her hatta koruma var; TVS’ler konnektörün yanında.
- Her TVS için VRWM, VC, kapasite ve yön kontrol edildi; sonraki parçalar VC’ye dayanıyor.
- Sinyal TVS padinin üzerinden geçiyor; GND padi via ile hemen düzleme bağlı.
- TVS ile entegre arasında seri direnç veya ferrit var.
- Kılıflar şasiye bağlı; şasi–devre toprağı bağlantısı I/O bölgesinde.
- Ters polarite ve aşırı akım koruması seçildi; sigorta ani akım ve iz dayanımıyla uyumlu.
`,
    en: `
## Why it matters

A board can work flawlessly in the lab and meet a different world in the field: a spark of a few kV from the finger of a user who walked across a carpet, fast pulses coupled into cables when a nearby contactor switches, high-energy surges from lightning or mains switching, a supply cable connected the wrong way round, or a shorted output.

The result is not always a burnt chip. More often you see "soft" failures: a reset, a hang, a corrupted message. Sometimes the damage is latent: the part keeps working but is weakened and fails weeks later. This lesson covers these events, how the standards test them, and how to protect against them on the board.

> [!NOTE] ESD ratings such as "±2 kV HBM" in IC datasheets describe robustness against handling during manufacture and assembly. In the 100 pF / 1.5 kΩ Human Body Model (HBM), 2 kV means about 1.3 A peak; in the system-level IEC test an 8 kV contact discharge is about 30 A. The chip’s own protection is not enough at system level.

## Three different pulses: ESD, EFT and surge

| Standard | Event | Waveform | Energy | Typical test levels |
|---|---|---|---|---|
| IEC 61000-4-2 (ESD) | Electrostatic discharge from a person or an object | ≈ 0.8 ns rise, a pulse lasting tens of ns | low, but very fast with high current | contact 2/4/6/8 kV, air 2/4/8/15 kV |
| IEC 61000-4-4 (EFT/burst) | Switching of inductive loads such as relays and contactors | 5/50 ns pulses in bursts at 5 kHz or 100 kHz | low per pulse, but repetitive | power ports 0.5–4 kV, signal ports 0.25–2 kV |
| IEC 61000-4-5 (surge) | Voltages induced by lightning, mains switching | 1.2/50 µs voltage, 8/20 µs current | high (in the joule range) | 0.5/1/2/4 kV |

Your product standard sets which test applies to which port, at which level. For example, the generic immunity standards (IEC 61000-6-1 for residential, IEC 61000-6-2 for industrial environments) require ±4 kV contact and ±8 kV air discharge for ESD.

### IEC 61000-4-2 levels

| Level | Contact discharge | Air discharge | First peak current (contact) |
|---|---|---|---|
| 1 | 2 kV | 2 kV | 7.5 A |
| 2 | 4 kV | 4 kV | 15 A |
| 3 | 6 kV | 8 kV | 22.5 A |
| 4 | 8 kV | 15 kV | 30 A |

The test gun discharges a 150 pF capacitor through 330 Ω. The current peaks in about 0.8 ns; at 8 kV it must be 16 A at 30 ns and 8 A at 60 ns. Contact discharge is applied to conductive surfaces (metal enclosure, connector shell); air discharge is used on insulating surfaces, by approaching the gun until a spark jumps.

The result is judged by three performance criteria: **A** normal operation during the test; **B** temporary degradation that recovers by itself; **C** temporary loss of function that needs operator action (reset, restart). ESD and EFT usually require B.

## How a TVS diode works

A TVS (transient voltage suppressor) diode draws almost no current in normal operation. When the line voltage exceeds its breakdown voltage it conducts and dumps the excess current to ground, holding the protected line near its clamping voltage.

| Parameter | Meaning |
|---|---|
| VRWM | Reverse working voltage: up to this voltage the TVS does not conduct and only draws a small leakage current (IR) |
| VBR | Breakdown voltage, measured at a test current (e.g. 1 mA); a little above VRWM |
| VC | The clamping voltage the line sees at the specified peak pulse current (IPP) |
| IPP, PPP | Peak pulse current and power it survives (for an 8/20 µs or 10/1000 µs waveform) |
| CJ | Junction capacitance; distorts fast signals |
| Rdyn | Dynamic resistance: VC ≈ VBR + IPP · Rdyn |

## Choosing a TVS

1. **VRWM ≥ the highest normal line voltage.** Include tolerance, overshoot in normal operation and other possible modes (e.g. VBUS rising above 5 V with USB PD).
2. **VC below the absolute maximum rating of the protected part.** This cannot always be fully met; pick a part with low VC and low Rdyn (for ESD, look at the TLP data in the datasheet) and put a series resistor between the TVS and the IC to limit the current left for the IC.
3. **Capacitance:** on slow lines (buttons, low-speed GPIO, 1 Mbit/s CAN) tens of pF are no problem and even help as a filter. Lines running hundreds of Mbit/s such as USB 2.0 High-Speed need less than a few pF; multi-gigabit lines such as USB 3.x and HDMI need about 0.5 pF or less. Check the parts recommended for the interface.
4. **Unidirectional or bidirectional:** use a unidirectional TVS on lines that never go negative (it clips negative pulses like a diode), and a bidirectional one on lines that swing both ways (audio, RS-485, CAN). For lines with an asymmetric common-mode range such as RS-485, asymmetric parts exist.
5. **Power:** for surge, the pulse power matters. The SMAJ, SMBJ and SMCJ series are parts of about 400 W, 600 W and 1500 W at 10/1000 µs.
6. **Leakage:** IR matters in battery-life-critical products and on high-impedance analog inputs.

### Example: a 24 V industrial DC input

The 24 V line can reach 30 V in the field. A TVS with VRWM = 30 V is chosen (e.g. SMBJ30A); the clamping voltage of a part of this class at its peak current is about **48 V** (check the datasheet). As a rough rule, standard TVS parts clamp at about 1.6 times VRWM or a little more. So the regulator and capacitors after the TVS must withstand at least 50 V, preferably 60 V. Don’t forget spacing either: on an outer layer IPC-2221 asks for at least 0.6 mm in the 31–50 V range.

[[calc:spacing?V=48&cat=B2|Outer-layer spacing for 48 V]]

### Example: a USB 2.0 port

For D+ and D−, use a multi-channel ESD array with about 1 pF or less and a 5 V VRWM; most parts include a channel for VBUS too. Place the array right behind the connector so that both lines run over its pads and the pair stays symmetric.

## Layout: at the connector, with a short GND path

[[fig:tvs-layout]]

An 8 kV ESD current rises to 30 A in about 0.8 ns. At that speed every nanohenry in the TVS path adds voltage:

\`\`\`
V = L · di/dt = 1 nH · 30 A / 0.8 ns ≈ 37.5 V
\`\`\`

This voltage adds **on top of** the TVS clamping voltage; 2 nH of stub and via mean 75 V more on the protected line. Therefore:

- Place the TVS **right next to the connector**, so the pulse is caught as soon as it enters the board.
- Route the signal **over the TVS pad** (flow-through); do not reach the TVS with a T-shaped stub.
- Connect the TVS GND pad to the GND plane by the shortest path: one or more vias next to or in the pad, not a long thin trace.
- Keep the unprotected trace between the connector and the TVS short and do not run it parallel to other traces; otherwise the pulse couples into neighbouring lines before it reaches the TVS.
- Put a **series resistor** (22–100 Ω on slow lines) or a ferrite bead in the path from the TVS to the IC. It limits the remaining current and forms a small filter with the IC’s input capacitance.

[[calc:via?d=0.3&d_u=mm&L=1.6|Inductance of one via]]

## Chassis ground and signal ground

The ideal path for ESD current is to chassis and on to earth, without passing through the circuit.

- Bond the metal enclosure and connector shells (shields) to **chassis**.
- Join chassis and circuit ground in the I/O area, next to the connectors: with a short direct connection or through a capacitor. A common solution for a USB shell is a capacitor to circuit ground with a high-value bleed resistor (e.g. 1 MΩ) in parallel.
- In plastic enclosures the spark enters through gaps and seams: keep sensitive circuits away from these openings, use insulating caps on buttons, and either ground touchable metal parts or insulate them completely.
- Battery-powered, ungrounded devices see ESD too; the discharge current flows into the device’s own capacitance. A TVS is still needed.

For the rest of the layout see the [[lesson:grounding-emc|grounding and EMC lesson]].

## What changes for EFT and surge?

- **EFT:** low energy per pulse, but the pulses are fast and come in bursts. Cable inputs need filtering (ferrite + capacitor), a TVS and a good chassis connection. Firmware matters too: a watchdog, sampling inputs several times, retries in communication.
- **Surge:** the energy is high; small ESD diodes are not enough. Power inputs use large TVS parts such as SMBJ/SMCJ, mains inputs use varistors (MOV), long lines use gas discharge tubes (GDT). Stage coarse and fine protection with a series impedance between them: the GDT or MOV takes the bulk of the energy first, and the TVS clamps what is left.

## Reverse-polarity protection

A reversed supply cable damages electrolytic capacitors, regulators and the protection diodes of ICs. Common solutions:

| Method | Loss at 2 A | Pros | Cons |
|---|---|---|---|
| Series Schottky diode | ≈ 0.45 V · 2 A ≈ 0.9 W | simple, cheap, also blocks reverse current | voltage drop and heat |
| High-side P-MOSFET | I²·R: ≈ 80 mW with 20 mΩ | low loss | does not block reverse current while on; VGS limit |
| Low-side N-MOSFET | low | cheap, low RDS(on) | the board ground is separated from the input ground |
| Ideal-diode controller + N-MOSFET | very low | also blocks reverse current quickly | cost, an extra IC |
| Fuse + shunt diode | none in normal use | very cheap | a reversed connection blows the fuse, which must be replaced |

[[fig:reverse-pmos]]

The orientation of the P-MOSFET is often mixed up: **drain to the input, source to the load**. With correct polarity the body diode conducts first; the gate is pulled to ground, so VGS ≈ −VIN and the FET turns fully on. Reversed, VGS ≥ 0, so the FET is off and the body diode is reverse biased. If VIN can exceed the MOSFET’s VGS limit (±20 V for most parts), add a zener between gate and source and a series resistor to the gate. Check the losses with [[calc:mosfet|MOSFET losses]].

## Overcurrent protection

- **Fuse:** single-use and the most definite protection. Choose its rated current from the manufacturer’s derating curve, its voltage rating from the circuit voltage, and its breaking capacity from the possible short-circuit current. The inrush current that charges the capacitors at power-up must not stress it: the fuse’s melting I²t must be comfortably larger than the I²t of the inrush pulse.
- **PTC (resettable fuse):** heats up and raises its resistance on overcurrent, then cools down and recovers when the current is removed. It has a hold current (Ihold) and a trip current (Itrip, typically about twice Ihold); tripping can take seconds and depends on ambient temperature.
- **eFuse or current-limited load switch:** cuts off within microseconds at an adjustable limit; most also provide overvoltage, reverse-current and soft-start (dV/dt) protection.

The traces, vias and connectors carrying the fault current must survive until the protection acts: check that the trace does not fuse during the fuse’s clearing time.

[[calc:inrush|Inrush and soft-start]] [[calc:fusing|Trace and via fusing current]] [[calc:trace|Trace width]]

## Common mistakes

- Placing the TVS next to the IC, far from the connector.
- Reaching the TVS with a stub and connecting its GND with a long thin trace.
- Choosing VRWM below or right at the line’s normal voltage: the TVS conducts in normal operation and heats up.
- Forgetting the clamping voltage and rating the parts after the TVS for too low a voltage.
- Putting a high-capacitance TVS on a fast data line.
- Connecting the P-MOSFET backwards: the body diode conducts with reversed polarity and the protection does nothing.
- Choosing a fuse without considering inrush current.

> [!QUIZ] A 3.3 V GPIO line goes to a button the user can touch. How do you protect it?
> An ESD diode with a VRWM of 3.3 V or a little above, right next to the connector or button, with a via next to its GND pad. A series resistor of about 100 Ω between the TVS and the microcontroller, plus a small capacitor for an RC filter if needed; debounce in firmware.

> [!QUIZ] The TVS ground connection runs through a 2 nH path. Roughly how much extra voltage does the protected line see in an 8 kV contact discharge?
> At 8 kV the first peak current is about 30 A with a rise time of about 0.8 ns. V = L · di/dt = 2 nH · 30 A / 0.8 ns ≈ 75 V, on top of the TVS clamping voltage.

> [!QUIZ] Is a TVS with a 12 V VRWM enough for a 12 V line?
> It is marginal. If the line’s tolerance or normal overshoot exceeds 12 V, the TVS starts to conduct, its leakage rises and it heats up. Find the line’s highest normal voltage, choose VRWM above it, then check that the clamping voltage suits the parts that follow.

> [!QUIZ] You replaced a series Schottky with a P-MOSFET for reverse polarity, and the loss at 2 A dropped from 0.9 W to 80 mW. What must you watch?
> The orientation (drain to input, source to load), the VGS limit (zener and series resistor if needed), and the fact that the FET does not block reverse current while on. When the input drops, current can flow from the output capacitors back to the input; if that matters, use an ideal-diode controller.

## Checklist

- ESD, EFT and surge levels and performance criteria are set from the product standard.
- Every line exposed to the user or a cable is protected; TVS parts sit next to the connector.
- VRWM, VC, capacitance and direction checked for each TVS; the parts that follow withstand VC.
- The signal runs over the TVS pad; the GND pad goes straight to the plane through a via.
- A series resistor or ferrite sits between the TVS and the IC.
- Shields are bonded to chassis; the chassis–circuit ground connection is in the I/O area.
- Reverse-polarity and overcurrent protection chosen; the fuse matches the inrush current and the trace capability.
`,
  },
};
