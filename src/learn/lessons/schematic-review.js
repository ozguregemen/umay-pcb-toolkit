import { figureFrom } from '../figures.js';
import { text, rect, circle, wire, node, ground, twoTerm } from '../../ui/svg.js';

const S = {
  tr: {
    cap: 'Mini inceleme şeması: (1) 3,3 V’luk MCU’nun I²C hatları 5 V’a çekilmiş, (2) CL = 8 pF kristale 22 pF yük kondansatörü, (3) boşta bırakılmış BOOT0 pini, (4) akım sınırlama direnci olmayan LED.',
    sensor: 'Sensör',
    mcuV: '3,3 V',
  },
  en: {
    cap: 'Mini-review schematic: (1) the I²C lines of a 3.3 V MCU pulled up to 5 V, (2) 22 pF load capacitors on a CL = 8 pF crystal, (3) a floating BOOT0 pin, (4) an LED with no current-limiting resistor.',
    sensor: 'Sensor',
    mcuV: '3.3 V',
  },
};

/** Numbered finding marker. */
const mark = (x, y, n) => circle(x, y, 8, 'zone-bad') + text(x, y + 4, String(n), { cls: 'badt' });

function miniReview(lang) {
  const s = S[lang] ?? S.en;
  const b = rect(150, 30, 100, 160, 'comp', ' rx="3"') + text(200, 92, 'MCU', { cls: 'name' }) + text(200, 106, s.mcuV)
    // I²C sensor on 5 V with pull-ups to 5 V (R2 crosses SCL without a junction).
    + rect(14, 46, 50, 50, 'comp', ' rx="3"') + text(39, 68, s.sensor, { cls: 'name' }) + text(39, 84, '5 V')
    + wire([64, 60], [150, 60]) + wire([64, 80], [150, 80])
    + text(156, 64, 'SCL', { anchor: 'start' }) + text(156, 84, 'SDA', { anchor: 'start' })
    + wire([80, 14], [122, 14]) + text(76, 18, '5 V', { cls: 'name', anchor: 'end' })
    + twoTerm('R', 88, 14, 88, 60, { name: 'R1', flip: true })
    + twoTerm('R', 114, 14, 114, 52, { name: 'R2' }) + wire([114, 52], [114, 80])
    + node(88, 60) + node(114, 80)
    + mark(138, 44, 1)
    // Floating BOOT0.
    + wire([128, 150], [150, 150]) + circle(128, 150, 3.2, 'term') + text(156, 154, 'BOOT0', { anchor: 'start' })
    + mark(112, 150, 3)
    // Crystal with load capacitors.
    + text(244, 54, 'OSC_IN', { anchor: 'end' }) + text(244, 124, 'OSC_OUT', { anchor: 'end' })
    + wire([250, 50], [360, 50]) + wire([250, 120], [360, 120])
    + twoTerm('X', 280, 50, 280, 120, { name: 'X1', value: '8 MHz' }) + text(293, 111, 'CL = 8 pF', { anchor: 'start' })
    + node(280, 50) + node(280, 120)
    + twoTerm('C', 360, 50, 360, 76, { name: 'C1', value: '22 pF' }) + ground(360, 76)
    + twoTerm('C', 360, 120, 360, 146, { name: 'C2', value: '22 pF' }) + ground(360, 146)
    + mark(320, 34, 2)
    // LED straight from a GPIO.
    + text(244, 169, 'PA5', { anchor: 'end' })
    + wire([250, 165], [280, 165]) + twoTerm('LED', 280, 165, 330, 165, { name: 'D1', flip: true })
    + wire([330, 165], [350, 165]) + ground(350, 165)
    + mark(382, 165, 4);
  return figureFrom(420, 204, s.cap, b);
}

export default {
  figures: { 'mini-review': miniReview },
  body: {
    tr: `
## Neden önemli?

Şemadaki bir hatayı inceleme sırasında bulmak birkaç dakikanızı alır. Aynı hatayı kart geldikten sonra bulmak tel lehimlemek, iz kesmek, kaybolan günler ve çoğu zaman yeni bir kart turu demektir. Bu yüzden profesyonel ekiplerde şema, kart üretime gitmeden önce bir kontrol listesiyle ve tercihen ikinci bir kişi tarafından incelenir.

İyi bir inceleme şemaya rastgele bakmak değildir. **Her konu için ayrı bir tur** atarsınız ve her pini, her parçayı işaretleyerek ilerlersiniz. Bu ders bu turları ve en sık yakalanan hataları anlatır.

## Hazırlık

- Güncel veri sayfalarını ve **errata** belgelerini, referans tasarımları ve uygulama notlarını toplayın.
- Bir **güç ağacı** çıkarın: her ray, gerilimi, toleransı, onu kimin beslediği ve kimin ne kadar akım çektiği.
- Bir arayüz listesi yapın: her konnektör, her haberleşme hattı ve gerilim seviyeleri.
- Şemanın PDF’ini alın ve kontrol ettiğiniz her pini, her parçayı işaretleyin (ekranda vurgulayıcıyla veya kâğıtta). İşaretlenmemiş bir pin, kontrol edilmemiş bir pindir.

## 1. tur: güç

- **Gerilim değerleri:** raydaki her parçanın (kondansatör, TVS, MOSFET, entegre) gerilim sınıfı en yüksek ray geriliminin ve geçici gerilimlerin üzerinde mi? MLCC’lerde DC öngerilim kaybı yüzünden pay bırakın.
- **Akım bütçesi:** her regülatörün akımı, yüklerinin toplamından %20–30 kadar fazla mı? LDO’ların ısıl kaybı hesaplandı mı ([[lesson:thermal|termal tasarım]])?
- **Geri besleme bölücüsü:** çıkış gerilimi doğru mu ve direnç toleranslarıyla nereye kadar kayıyor?
- **Sıralama (sequencing):** işlemciler, FPGA’lar ve bazı ADC’ler rayların belirli bir sırayla ve belirli bir hızla gelmesini ister. EN ve PG (power good) zinciri buna uygun mu?
- **Geri besleme yoluyla beslenme (back-powering):** beslemesi kapalı bir entegrenin giriş pinini başka bir entegre sürerse akım koruma diyotlarından onun besleme rayına akar; entegre yarı çalışır veya kilitlenir. Farklı zamanlarda açılan bölümler arasındaki her sinyali kontrol edin.
- **Dekuplaj:** her besleme pininde veri sayfasının istediği kondansatör var mı? VDDA gibi analog beslemelerde ferrit ve ek kondansatör, VCAP gibi iç regülatör pinlerinde veri sayfasının istediği değer ve ESR ([[lesson:pdn|güç dağıtımı]]).
- **EN pinleri** boşta değil; düşük gerilim kilitleme (UVLO) bölücüleri hesaplandı.

[[calc:divider?mode=fb&vref=0.8&vout=5&rtol=1|FB bölücüsü: 0,8 V referanstan 5 V, %1 dirençler]]

## 2. tur: pin pin veri sayfası

Her entegre için veri sayfasının pin tablosunu açın ve pinleri sırayla kontrol edin:

- Pin numaraları **kullandığınız kılıfa** mı ait? Aynı entegrenin QFN ve TSSOP kılıflarında numaralar farklıdır.
- Açık pad (exposed pad) nereye bağlanmalı? Çoğu zaman GND’dir, ama bazı entegrelerde başka bir nete bağlanır veya boşta kalmalıdır.
- Kullanılmayan pinler veri sayfasının dediği gibi mi bağlı: GND’ye, beslemeye ya da boşta? "NC" (bağlantısız) ile "DNC" (bağlamayın) aynı şey değildir.
- Mikrodenetleyicilerde pin işlevlerini üreticinin pin yapılandırma aracıyla doğrulayın: çakışan alternatif işlevler, 5 V toleranslı (FT) pinler, ADC kanalı olan pinler, açılış (boot) pinleri.
- Mutlak en yüksek değerleri önerilen çalışma koşullarıyla karıştırmayın; tasarım önerilen koşullar içinde kalmalıdır.

## 3. tur: varsayılan durumlar, reset ve boot pinleri

Açılışta ve reset sırasında, yazılım pinleri ayarlayana kadar mikrodenetleyici pinlerinin çoğu giriştir (yüksek empedans). O sırada sürdükleri her şey **tanımsız** kalır.

- Bir MOSFET kapısını, bir motor sürücüsünün enable pinini veya bir röleyi süren her pinin harici bir pull-up veya pull-down ile **güvenli bir varsayılan durumu** olsun. Alçak taraftaki bir MOSFET için kapıda 10–100 kΩ’luk bir pull-down tipiktir. [[calc:switch|Transistör anahtar hesaplayıcısı]]
- **Reset:** reset pininde dahili pull-up var mı? Kondansatör değeri veri sayfasının sınırları içinde mi? Reset butonu ve debug konnektörü aynı hatta doğru bağlanmış mı?
- **Boot ve strap pinleri** resette okunur ve kartın nasıl açılacağını seçer: STM32’de BOOT0, ESP32’de GPIO0 ve diğerleri, Ethernet PHY’lerinde adres ve mod pinleri. Bu pinler çoğu zaman LED veya veri pini olarak da kullanılır; üzerlerindeki yük (ör. GND’ye bağlı bir LED) okunan değeri değiştirebilir. Örneğin ilk ESP32’de GPIO12 açılışta yüksek okunursa flaş beslemesi 1,8 V seçilir ve 3,3 V flaşlı bir modül açılmaz.
- **Açık drenaj hatları** (I²C, kesme, reset) pull-up olmadan çalışmaz. I²C pull-up değeri hat kapasitesine ve hıza göre seçilir. [[calc:i2c|I²C pull-up hesaplayıcısı]]

## 4. tur: lojik seviyeler

Bir çıkışın garanti ettiği seviyeler (VOH, VOL) ile girişin istediği seviyeler (VIH, VIL), besleme toleranslarıyla birlikte örtüşmelidir.

| Aile | VIH (en az) | VIL (en çok) |
|---|---|---|
| 74HC (CMOS), VCC = 4,5 V | 3,15 V | 1,35 V |
| 74HCT (TTL eşikli), VCC = 4,5–5,5 V | 2,0 V | 0,8 V |
| 3,3 V LVCMOS / LVTTL | 2,0 V | 0,8 V |

- 3,3 V’luk bir çıkış 5 V’la beslenen bir 74HC girişini **güvenilir biçimde sürmez**: VCC = 4,5 V’ta bile 3,15 V gerekir, 5 V’ta bu değer yaklaşık 3,5 V’tur (0,7 · VCC). 74HCT gibi TTL eşikli bir giriş veya bir seviye çevirici kullanın.
- 5 V’luk bir çıkışı 3,3 V’luk bir girişe yalnızca pin 5 V toleranslıysa bağlayın; değilse seviye çevirici veya bölücü kullanın. Giriş koruma diyotlarına asla güvenmeyin.
- Çift yönlü açık drenaj hatlarında (I²C) MOSFET’li seviye çeviriciler yaygındır.
- Analog girişler: sinyal aralığı ADC’nin giriş aralığında mı, referans doğru mu? [[calc:adc|ADC hesaplayıcısı]]

## 5. tur: saatler

Kristalin iki yük kondansatörü eşitse değerleri C1 = C2 = 2 · (CL − Cs) olur. Cs, pinlerin ve izlerin parazitik kapasitesidir; tipik olarak 2–5 pF. CL = 12,5 pF ve Cs = 3 pF için 19 pF bulunur, en yakın standart değer **18 pF**’tır.

[[calc:crystal?mode=caps&cl=12.5&cs=3|CL = 12,5 pF kristal]]

- Osilatörün kazanç payını ve kristalin ESR’sini kontrol edin; ST’nin AN2867 uygulama notu iyi bir başlangıçtır.
- 32,768 kHz kristallerin CL değerleri küçüktür (6–12,5 pF) ve sürme seviyeleri hassastır; veri sayfasındaki önerilere uyun.
- Kristal yerine osilatör kullanılıyorsa besleme dekuplajını, enable pinini ve çıkış sonlandırmasını kontrol edin.

## 6. tur: konnektörler ve pin sırası

- Pin sırasını karşı taraftaki kablonun, modülün veya kartın belgesiyle tek tek karşılaştırın. 1 numaralı pinin yerine ve **ayna** tuzağına dikkat edin: konnektör çizimleri çoğu zaman eşleşme yüzünden (mating side) bakıştır; kartınızın üstünden bakınca sağ ve sol yer değiştirir. Birbirine bakan iki kart arasındaki konnektörlerde pin sırası aynalanır.
- UART’ta TX ve RX çaprazlanır; net isimlerini hangi cihazın bakış açısına göre verdiğinizi açıkça yazın (ör. MCU_TX → konnektörde RX).
- USB-C’de akım çeken (sink) bir cihazda **her CC pinine ayrı** bir 5,1 kΩ pull-down gerekir; tek bir direnci iki CC pinine ortak bağlamak bazı kablo ve şarj cihazlarıyla algılamayı bozar.
- Pin başına akım sınırı, kilit ve yön anahtarı (polarizasyon) kontrol edildi mi?

## 7. tur: koruma ve test noktaları

- Dış dünyaya açılan her hatta ESD koruması, güç girişinde ters polarite ve aşırı akım koruması var mı ([[lesson:esd-protection|ESD ve koruma]])?
- Röle bobini gibi endüktif yüklerde serbest geçiş (flyback) diyotu var mı?
- Her rayda ve önemli sinyallerde (reset, saat, SW düğümü) test noktası, osiloskop toprağı için birden fazla GND noktası, bir debug konnektörü (SWD/JTAG) ve bir UART konsolu var mı?
- Rayları ayırmak ve akım ölçmek için 0 Ω köprüler veya şönt yerleri bırakıldı mı ([[lesson:bring-up|kartın ilk çalıştırılması]])?

## 8. tur: sembol, footprint ve BOM

- **Sembol–footprint eşlemesi:** SOT-23 transistörler, SOT-223 regülatörler ve diyotlarda pin sırası üreticiye göre değişir. Kütüphanedeki genel parçaya değil, kullandığınız üretici parça numarasının veri sayfasına bakın. Diyot, LED ve elektrolitik kondansatörlerde kutup işaretlerini kontrol edin.
- **Gerilim sınıfı ve DC öngerilim:** 6,3 V’luk küçük bir MLCC 5 V’ta nominal kapasitesinin çok altına düşebilir; üreticinin eğrisine bakın.
- **Dielektrik:** zamanlama ve filtre devrelerinde C0G/NP0, dekuplajda X7R/X5R; Y5V’den kaçının.
- **Tolerans:** geri besleme bölücüleri ve ölçüm devrelerinde %1 veya daha iyisi.
- **Direnç gücü:** kalın film dirençlerde tipik olarak 0402 için 1/16 W, 0603 için 1/10 W, 0805 için 1/8 W; harcanan gücü hesaplayın.
- **Sıcaklık aralığı ve tedarik:** endüstriyel ürünler için −40…85 °C; parça hâlâ üretiliyor mu (NRND, EOL)? İkinci bir kaynak var mı?

## 9. tur: net isimleri ve ERC

- Önemli netlere anlamlı isimler verin: VBAT, 3V3, I2C1_SDA, MCU_UART_TX. Aynı ray için iki farklı yazım (3V3 ve +3.3V) kazara iki ayrı net oluşturur.
- Bilerek boş bırakılan pinlere "bağlantı yok" işareti koyun; böylece ERC’nin uyarıları anlamlı kalır.
- ERC’yi çalıştırın ve her uyarıyı ya düzeltin ya da gerekçesiyle not edin. ERC bağlantı kurallarını denetler, tasarımın doğruluğunu değil: yanlış gerilime çekilmiş bir pull-up ERC’den sorunsuz geçer.

## Mini inceleme örneği

[[fig:mini-review]]

Küçük bir sensör kartının şemasında şunlar bulundu. MCU 3,3 V ile, sensör 5 V ile çalışıyor.

| # | Bulgu | Neden sorun? | Düzeltme |
|---|---|---|---|
| 1 | I²C pull-up’ları 5 V’a bağlı | MCU pinleri 5 V toleranslı değil; ayrıca 5 V’luk sensörün VIH değeri (0,7 · 5 V = 3,5 V) 3,3 V’luk yüksek seviyeyle sağlanmaz | MOSFET’li çift yönlü seviye çevirici veya 3,3 V ile çalışabilen bir sensör; pull-up değerini hat kapasitesine göre hesaplayın |
| 2 | CL = 8 pF kristale 22 pF yük kondansatörü | Etkin yük ≈ 22/2 + 3 = 14 pF: frekans aşağı kayar, osilatörün kazanç payı azalır | 2 · (8 − 3) = 10 pF |
| 3 | BOOT0 boşta | Açılış modu rastgele seçilebilir; kart bazen yazılımı çalıştırmaz | 10 kΩ pull-down ve bir test padi |
| 4 | LED doğrudan GPIO’da, direnç yok | Akımı yalnızca pin sürücüsü sınırlar; pin ve LED zorlanır | 3,3 V, Vf = 2 V, 5 mA: (3,3 − 2) / 5 mA = 260 Ω → 270 Ω |
| 5 | Tüm VDD pinleri için tek bir 100 nF | Veri sayfası her besleme pinine bir kondansatör ve ayrıca bulk kapasite ister | Her VDD pinine 100 nF, artı veri sayfasının istediği bulk |
| 6 | 3,3 V regülatörünün EN pini boşta | Bazı regülatörlerde EN’nin dahili çekmesi yoktur; ray rastgele açılabilir | EN’yi VIN’e veya bir UVLO bölücüsüne bağlayın |

[[calc:i2c|1: I²C pull-up]] [[calc:crystal?mode=check&cl=8&cs=3&c1=22&c2=22|2: 22 pF ile etkin yük]] [[calc:crystal?mode=caps&cl=8&cs=3|2: doğru değer]] [[calc:led?vs=3.3&vf=2&if=5|4: LED direnci]]

> [!TIP] Bulguları bir tabloya yazın, her birine bir sorumlu ve durum ekleyin. Bir sonraki projede bu tablo kendi kontrol listenize dönüşür.

## Sık yapılan hatalar

- Pin numaralarını farklı bir kılıfın veri sayfasından almak.
- Mikrodenetleyici pinlerinin resetteki yüksek empedans durumunu unutmak.
- Boot ve strap pinlerine LED veya başka bir yük bağlayıp okunan değeri bozmak.
- Kristal yük kondansatörlerini alışkanlıkla 22 pF seçmek.
- 3,3 V ile 5 V lojiği arasında seviye kontrolü yapmamak.
- Kütüphanedeki genel bir SOT-23 sembolünü veri sayfasına bakmadan kullanmak.
- ERC’nin temiz çıkmasını şemanın doğru olduğu sanmak.

> [!QUIZ] 3,3 V’luk bir mikrodenetleyici çıkışı, 5 V ile beslenen bir 74HC girişini sürüyor. Sorun var mı?
> Evet. 74HC’nin VIH değeri VCC = 4,5 V’ta 3,15 V, 5 V’ta yaklaşık 3,5 V’tur; 3,3 V’luk yüksek seviye bunu garanti etmez. 74HCT gibi TTL eşikli bir giriş (VIH = 2,0 V) veya bir seviye çevirici kullanın.

> [!QUIZ] CL = 12,5 pF olan bir kristal için Cs = 3 pF kabul ederseniz hangi yük kondansatörlerini seçersiniz?
> C1 = C2 = 2 · (12,5 − 3) = 19 pF; en yakın standart değer 18 pF’tır ve etkin yük 18/2 + 3 = 12 pF olur.

> [!QUIZ] Mikrodenetleyici alçak taraftaki bir MOSFET’in kapısını doğrudan sürüyor. Açılışta motor kısa bir an dönüyor. Neden?
> Reset sırasında ve yazılım pini ayarlayana kadar pin yüksek empedanstadır; kapı boşta kalır ve gürültüyle veya kapı–dren kapasitesiyle yükselebilir. Kapıya 10–100 kΩ’luk bir pull-down koyun.

> [!QUIZ] Bir USB-C sink tasarımında iki CC pini tek bir 5,1 kΩ dirençle toprağa bağlanmış. Doğru mu?
> Hayır. Her CC pininin kendi 5,1 kΩ pull-down direnci olmalıdır. Ortak direnç, kablonun yönünü ve bağlantıyı algılamayı bazı kablo ve kaynaklarla bozar.

> [!QUIZ] ERC hiç hata vermedi. Şema doğru mu?
> Bu yalnızca bağlantı kurallarının sağlandığını gösterir. Yanlış gerilime çekilmiş bir pull-up, yanlış yük kondansatörü veya ters pin sırası ERC’den geçer; turlarla yapılan inceleme yine gereklidir.

## Kontrol listesi

- Güç ağacı, gerilim değerleri, akım bütçesi, sıralama ve dekuplaj kontrol edildi.
- Her entegre pin pin veri sayfasıyla karşılaştırıldı; açık pad ve kullanılmayan pinler doğru bağlı.
- Resette ve açılışta her pinin durumu tanımlı; boot ve strap pinleri doğru seviyede.
- Lojik seviyeler toleranslarla uyumlu; gerekirse seviye çevirici var.
- Kristal yük kondansatörleri hesaplandı; osilatör kazanç payı kontrol edildi.
- Konnektör pin sıraları karşı tarafla karşılaştırıldı; ayna ve TX/RX tuzakları kontrol edildi.
- Koruma, test noktaları, debug konnektörü ve ölçüm köprüleri var.
- Sembol–footprint eşlemesi, BOM değerleri ve tedarik durumu kontrol edildi.
- Net isimleri tutarlı; ERC temiz veya her uyarı gerekçeli.
`,
    en: `
## Why it matters

Finding a schematic error during review takes a few minutes. Finding the same error after the boards arrive means bodge wires, cut traces, lost days and often another board spin. That is why professional teams review the schematic with a checklist, preferably by a second person, before the board goes to fabrication.

A good review is not a random look at the schematic. You make **one pass per topic** and work through every pin and every part, marking each one off. This lesson walks through those passes and the errors they catch most often.

## Preparation

- Collect the current datasheets and **errata**, reference designs and application notes.
- Draw a **power tree**: every rail, its voltage and tolerance, what feeds it, and who draws how much current.
- Make an interface list: every connector, every communication line, and their voltage levels.
- Print the schematic to PDF and mark every pin and part you check (with a highlighter on screen or on paper). An unmarked pin is an unchecked pin.

## Pass 1: power

- **Voltage ratings:** is the rating of every part on the rail (capacitor, TVS, MOSFET, IC) above the highest rail voltage and its transients? Leave margin on MLCCs for DC-bias derating.
- **Current budget:** does each regulator supply 20–30 % more than the sum of its loads? Is the dissipation of LDOs calculated (see [[lesson:thermal|thermal design]])?
- **Feedback divider:** is the output voltage right, and how far does it drift with resistor tolerance?
- **Sequencing:** processors, FPGAs and some ADCs need their rails in a given order and at a given ramp rate. Does the EN and PG (power good) chain do that?
- **Back-powering:** if one IC drives an input of another IC whose supply is off, current flows through the clamp diodes into that IC’s rail; it half-works or latches up. Check every signal between sections that power up at different times.
- **Decoupling:** does every supply pin have the capacitor the datasheet asks for? Analog supplies such as VDDA need a ferrite and an extra capacitor; internal-regulator pins such as VCAP need the value and ESR the datasheet specifies (see [[lesson:pdn|power distribution]]).
- **EN pins** are not floating; undervoltage-lockout (UVLO) dividers are calculated.

[[calc:divider?mode=fb&vref=0.8&vout=5&rtol=1|FB divider: 5 V from a 0.8 V reference, 1 % resistors]]

## Pass 2: pin by pin against the datasheet

Open the pin table of each IC’s datasheet and check the pins one by one:

- Do the pin numbers belong to **the package you use**? The QFN and TSSOP versions of the same IC are numbered differently.
- Where must the exposed pad go? Usually GND, but on some ICs it connects to another net or must be left floating.
- Are unused pins connected as the datasheet says: to GND, to the supply, or left open? "NC" (no connection) and "DNC" (do not connect) are not the same thing.
- On microcontrollers, verify pin functions with the vendor’s pin configuration tool: conflicting alternate functions, 5 V-tolerant (FT) pins, pins with ADC channels, boot pins.
- Do not confuse absolute maximum ratings with recommended operating conditions; the design must stay within the recommended conditions.

## Pass 3: default states, reset and boot pins

At power-up and during reset, until the firmware configures them, most microcontroller pins are inputs (high impedance). Anything they drive at that moment is **undefined**.

- Every pin that drives a MOSFET gate, a motor driver enable or a relay needs a **safe default state** set by an external pull-up or pull-down. For a low-side MOSFET a 10–100 kΩ gate pull-down is typical. [[calc:switch|Transistor switch calculator]]
- **Reset:** does the reset pin have an internal pull-up? Is the capacitor within the datasheet limits? Are the reset button and the debug connector wired correctly on the same line?
- **Boot and strap pins** are sampled at reset and select how the board starts: BOOT0 on STM32, GPIO0 and others on the ESP32, address and mode pins on Ethernet PHYs. These pins often double as LED or data pins; the load on them (e.g. an LED to GND) can change the sampled value. For example, on the original ESP32, if GPIO12 reads high at power-up the flash supply is set to 1.8 V and a module with 3.3 V flash does not boot.
- **Open-drain lines** (I²C, interrupts, reset) do not work without pull-ups. The I²C pull-up value is chosen from the bus capacitance and speed. [[calc:i2c|I²C pull-up calculator]]

## Pass 4: logic levels

The levels an output guarantees (VOH, VOL) and the levels an input needs (VIH, VIL) must overlap, including supply tolerances.

| Family | VIH (min) | VIL (max) |
|---|---|---|
| 74HC (CMOS), VCC = 4.5 V | 3.15 V | 1.35 V |
| 74HCT (TTL thresholds), VCC = 4.5–5.5 V | 2.0 V | 0.8 V |
| 3.3 V LVCMOS / LVTTL | 2.0 V | 0.8 V |

- A 3.3 V output does **not reliably drive** a 74HC input powered from 5 V: even at VCC = 4.5 V it needs 3.15 V, and at 5 V about 3.5 V (0.7 · VCC). Use an input with TTL thresholds such as 74HCT, or a level shifter.
- Connect a 5 V output to a 3.3 V input only if the pin is 5 V tolerant; otherwise use a level shifter or a divider. Never rely on the input clamp diodes.
- MOSFET-based level shifters are common on bidirectional open-drain lines (I²C).
- Analog inputs: is the signal range within the ADC input range, and is the reference right? [[calc:adc|ADC calculator]]

## Pass 5: clocks

With two equal load capacitors, a crystal needs C1 = C2 = 2 · (CL − Cs). Cs is the stray capacitance of pins and traces, typically 2–5 pF. For CL = 12.5 pF and Cs = 3 pF this gives 19 pF; the nearest standard value is **18 pF**.

[[calc:crystal?mode=caps&cl=12.5&cs=3|CL = 12.5 pF crystal]]

- Check the oscillator’s gain margin and the crystal ESR; ST application note AN2867 is a good start.
- 32.768 kHz crystals have small CL values (6–12.5 pF) and sensitive drive levels; follow the datasheet recommendations.
- If an oscillator replaces the crystal, check its supply decoupling, enable pin and output termination.

## Pass 6: connectors and pinout

- Compare the pinout pin by pin with the documentation of the cable, module or board on the other side. Watch where pin 1 is and the **mirror** trap: connector drawings are often viewed from the mating side, so left and right swap when you look from the top of your board. Between two boards facing each other, the pin order is mirrored.
- UART TX and RX cross over; state clearly from which device’s point of view the nets are named (e.g. MCU_TX → RX at the connector).
- A USB-C sink needs **a separate** 5.1 kΩ pull-down **on each CC pin**; sharing one resistor between both CC pins breaks detection with some cables and chargers.
- Are the current per pin, latching and keying (polarisation) checked?

## Pass 7: protection and test points

- Does every line exposed to the outside world have ESD protection, and the power input reverse-polarity and overcurrent protection (see [[lesson:esd-protection|ESD and protection]])?
- Do inductive loads such as relay coils have a flyback diode?
- Are there test points on every rail and key signal (reset, clocks, SW node), several GND points for scope grounds, a debug connector (SWD/JTAG) and a UART console?
- Are 0 Ω links or shunt footprints left to separate rails and measure current (see [[lesson:bring-up|board bring-up]])?

## Pass 8: symbols, footprints and the BOM

- **Symbol-to-footprint mapping:** pin order of SOT-23 transistors, SOT-223 regulators and diodes varies between manufacturers. Check the datasheet of the exact manufacturer part number, not a generic library part. Check the polarity marks of diodes, LEDs and electrolytic capacitors.
- **Voltage rating and DC bias:** a small 6.3 V MLCC can drop far below its nominal capacitance at 5 V; check the manufacturer’s curve.
- **Dielectric:** C0G/NP0 for timing and filters, X7R/X5R for decoupling; avoid Y5V.
- **Tolerance:** 1 % or better in feedback dividers and measurement circuits.
- **Resistor power:** thick-film parts are typically 1/16 W in 0402, 1/10 W in 0603 and 1/8 W in 0805; calculate the dissipation.
- **Temperature range and supply:** −40…85 °C for industrial products; is the part still in production (NRND, EOL)? Is there a second source?

## Pass 9: net names and ERC

- Give important nets meaningful names: VBAT, 3V3, I2C1_SDA, MCU_UART_TX. Two spellings of the same rail (3V3 and +3.3V) accidentally create two separate nets.
- Put a "no connect" mark on pins you leave open on purpose, so the ERC warnings stay meaningful.
- Run ERC and either fix every warning or note why it is acceptable. ERC checks connection rules, not whether the design is right: a pull-up to the wrong voltage passes ERC without a complaint.

## Mini-review example

[[fig:mini-review]]

These are the findings in the schematic of a small sensor board. The MCU runs at 3.3 V, the sensor at 5 V.

| # | Finding | Why is it a problem? | Fix |
|---|---|---|---|
| 1 | I²C pull-ups go to 5 V | The MCU pins are not 5 V tolerant; also the 5 V sensor’s VIH (0.7 · 5 V = 3.5 V) is not met by a 3.3 V high level | A bidirectional MOSFET level shifter, or a sensor that runs at 3.3 V; size the pull-ups for the bus capacitance |
| 2 | 22 pF load capacitors on a CL = 8 pF crystal | Effective load ≈ 22/2 + 3 = 14 pF: the frequency shifts down and the oscillator’s gain margin shrinks | 2 · (8 − 3) = 10 pF |
| 3 | BOOT0 floating | The boot mode can be picked at random; sometimes the board does not run its firmware | 10 kΩ pull-down and a test pad |
| 4 | LED directly on a GPIO, no resistor | Only the pin driver limits the current; pin and LED are overstressed | 3.3 V, Vf = 2 V, 5 mA: (3.3 − 2) / 5 mA = 260 Ω → 270 Ω |
| 5 | One 100 nF for all VDD pins | The datasheet asks for a capacitor on every supply pin plus bulk capacitance | 100 nF on each VDD pin, plus the bulk the datasheet asks for |
| 6 | EN pin of the 3.3 V regulator floating | Some regulators have no internal pull on EN; the rail may turn on at random | Tie EN to VIN or to a UVLO divider |

[[calc:i2c|1: I²C pull-up]] [[calc:crystal?mode=check&cl=8&cs=3&c1=22&c2=22|2: effective load with 22 pF]] [[calc:crystal?mode=caps&cl=8&cs=3|2: the right value]] [[calc:led?vs=3.3&vf=2&if=5|4: LED resistor]]

> [!TIP] Write the findings into a table and give each one an owner and a status. On the next project that table becomes your own checklist.

## Common mistakes

- Taking pin numbers from the datasheet of a different package.
- Forgetting that microcontroller pins are high impedance during reset.
- Loading boot and strap pins with LEDs or other parts and corrupting the sampled value.
- Choosing 22 pF crystal load capacitors out of habit.
- Not checking levels between 3.3 V and 5 V logic.
- Using a generic SOT-23 library symbol without checking the datasheet.
- Assuming a clean ERC means a correct schematic.

> [!QUIZ] A 3.3 V microcontroller output drives a 74HC input powered from 5 V. Is there a problem?
> Yes. The 74HC VIH is 3.15 V at VCC = 4.5 V and about 3.5 V at 5 V; a 3.3 V high level does not guarantee it. Use an input with TTL thresholds such as 74HCT (VIH = 2.0 V) or a level shifter.

> [!QUIZ] For a crystal with CL = 12.5 pF, assuming Cs = 3 pF, which load capacitors do you choose?
> C1 = C2 = 2 · (12.5 − 3) = 19 pF; the nearest standard value is 18 pF, giving an effective load of 18/2 + 3 = 12 pF.

> [!QUIZ] A microcontroller drives the gate of a low-side MOSFET directly. At power-up the motor turns briefly. Why?
> During reset and until the firmware configures it, the pin is high impedance; the gate floats and can rise through noise or the gate–drain capacitance. Add a 10–100 kΩ pull-down on the gate.

> [!QUIZ] In a USB-C sink design both CC pins go to ground through one shared 5.1 kΩ resistor. Is that right?
> No. Each CC pin needs its own 5.1 kΩ pull-down. A shared resistor breaks orientation and attach detection with some cables and sources.

> [!QUIZ] ERC reported no errors. Is the schematic correct?
> It only shows that the connection rules are met. A pull-up to the wrong voltage, a wrong load capacitor or a reversed pinout all pass ERC; the pass-by-pass review is still needed.

## Checklist

- Power tree, voltage ratings, current budget, sequencing and decoupling checked.
- Every IC compared pin by pin with its datasheet; exposed pad and unused pins connected correctly.
- The state of every pin is defined at reset and power-up; boot and strap pins at the right levels.
- Logic levels compatible including tolerances; level shifters where needed.
- Crystal load capacitors calculated; oscillator gain margin checked.
- Connector pinouts compared with the other side; mirror and TX/RX traps checked.
- Protection, test points, a debug connector and measurement links in place.
- Symbol-to-footprint mapping, BOM values and part availability checked.
- Net names consistent; ERC clean or every warning justified.
`,
  },
};
