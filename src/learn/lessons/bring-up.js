import { figureFrom } from '../figures.js';
import { text, rect, path, polygon, arrow } from '../../ui/svg.js';

const S = {
  tr: {
    cap: 'Kartı ilk kez çalıştırma akışı. Her adımda beklenen değeri önceden yazın, sonra ölçün. Akım beklenenden yüksekse hemen kapatın; herhangi bir adım başarısız olursa (kesikli çizgiler) hata ayıklama döngüsüne geçin, düzeltip akım sınırlı enerjiden yeniden başlayın.',
    steps: ['1 · Görsel muayene', '2 · Ray–GND direnç ölçümü', '3 · Akım sınırlı ilk enerji',
      '4 · Raylar: gerilim, dalgalanma', '5 · Sıralama, reset ve saat', '6 · Programlama ve debug',
      '7 · Çevre birimleri tek tek', '8 · Termal ve uzun süre testi'],
    q: 'Akım normal mi?',
    yes: 'evet',
    no: 'hayır',
    off: 'Kapat, kısa devreyi bul',
    dbg: 'Hata ayıklama döngüsü',
    lines: ['• Böl ve yönet', '• İyi kartla kıyasla', '• Bir değişiklik, bir test', '• Ölç, not al, tekrarla'],
    retry: 'düzelt, tekrar dene',
    end: 'Kart hazır: notları kaydet',
  },
  en: {
    cap: 'Board bring-up flow. Write down the expected value for each step first, then measure. If the current is higher than expected, power off at once; if any step fails (dashed lines), go to the debugging loop, fix the problem and restart from the current-limited power-on.',
    steps: ['1 · Visual inspection', '2 · Rail-to-GND resistance', '3 · Current-limited power-on',
      '4 · Rails: voltage, ripple', '5 · Sequencing, reset, clocks', '6 · Programming and debug',
      '7 · Peripherals one by one', '8 · Thermal and soak test'],
    q: 'Current as expected?',
    yes: 'yes',
    no: 'no',
    off: 'Power off, find the short',
    dbg: 'Debugging loop',
    lines: ['• Divide and conquer', '• Compare with known-good', '• One change at a time', '• Measure, note, repeat'],
    retry: 'fix, then retry',
    end: 'Board up: save your notes',
  },
};

function flow(lang) {
  const s = S[lang] ?? S.en;
  const box = (y, label) => rect(20, y, 210, 26, 'comp', ' rx="4"') + text(125, y + 17, label, { cls: 'name', size: 11 });
  const down = (y1, y2) => arrow(125, y1, 125, y2);
  const tops = [12, 50, 88, 186, 224, 262, 300, 338];
  let b = tops.map((y, i) => box(y, s.steps[i])).join('');
  b += down(38, 49) + down(76, 87) + down(114, 121)
    + polygon([[125, 122], [220, 146], [125, 170], [30, 146]], 'comp') + text(125, 150, s.q, { cls: 'name', size: 11 })
    + down(170, 185) + text(132, 181, s.yes, { anchor: 'start' })
    + down(212, 223) + down(250, 261) + down(288, 299) + down(326, 337) + down(364, 375)
    + rect(20, 376, 210, 26, 'zone-ok', ' rx="13"') + text(125, 393, s.end, { cls: 'name', size: 11 });
  // "No" branch: power off, then the debugging loop.
  b += arrow(220, 146, 251, 146) + text(224, 140, s.no, { anchor: 'start' })
    + rect(252, 133, 162, 26, 'zone-bad', ' rx="4"') + text(333, 150, s.off, { cls: 'name', size: 11 })
    + arrow(333, 159, 333, 191)
    + rect(252, 192, 162, 124, 'soft', ' rx="4"') + text(333, 212, s.dbg, { cls: 'name', size: 11 })
    + s.lines.map((l, i) => text(260, 236 + i * 20, l, { anchor: 'start' })).join('');
  // Any later step failing also leads to the loop (dashed collector).
  b += path('M230,199H237M230,237H237M230,275H237M230,313H237M230,351H237M237,199V351', 'ext')
    + arrow(237, 254, 251, 254);
  // Back from the loop to the current-limited power-on.
  b += path('M414,254H417V101H262', 'flow') + arrow(262, 101, 231, 101, { cls: 'flow', headCls: 'arrow flow' })
    + text(330, 95, s.retry);
  return figureFrom(420, 410, s.cap, b);
}

export default {
  figures: { 'bringup-flow': flow },
  body: {
    tr: `
## Neden önemli?

Yeni bir kartın ilk kez enerji aldığı an hem heyecanlı hem risklidir: elinizdeki prototip sayısı azdır, bazı parçalar pahalı veya zor bulunur ve bir montaj hatası birkaç saniyede kartı yakabilir. Sistematik bir ilk çalıştırma (bring-up) iki şey sağlar: kartı korur ve bir sorun çıktığında onun **tasarım hatası mı, montaj hatası mı, yoksa parça arızası mı** olduğunu hızla ayırmanızı sağlar.

Kural basittir: **her adımda neyi beklediğinizi önceden yazın, sonra ölçün.** Beklenen değeri bilmeden yapılan bir ölçüm size pek bir şey söylemez.

[[fig:bringup-flow]]

## Hazırlık: tezgâh ve belgeler

- **Aletler:** akım sınırlı ayarlı güç kaynağı, multimetre, kısa toprak yaylı probları olan bir osiloskop, büyüteç veya mikroskop, ESD matı ve bileklik, havya, sıcak hava, flux, ince tel (ör. 30 AWG), Kapton bant. Varsa bir termal kamera çok zaman kazandırır.
- **Belgeler:** şema, test noktalarını gösteren yerleşim çıktısı, BOM ve her ray için beklenen akımları içeren bir güç bütçesi.
- **Plan:** adımların listesi ve her adım için beklenen değerler. Kartın seri numarasıyla bir kayıt tutun: tarih, adım, beklenen, ölçülen, not.
- Kartı mümkünse **bölüm bölüm** çalıştırılabilecek şekilde tasarlayın: rayları ayıran 0 Ω köprüler veya jumperlar ([[lesson:schematic-review|şematik inceleme]]).

## Enerji vermeden önce

1. **Görsel muayene:** kutuplu parçaların yönü (diyot, elektrolitik ve tantal kondansatör, entegrelerde 1 numaralı pin), ince adımlı entegrelerde ve konnektörlerde lehim köprüleri, eksik veya dikilmiş (tombstone) parçalar, yanlış değerli parçalar, kart hasarı.
2. **Ray–GND direnç ölçümü:** multimetreyle her rayın GND’ye direncini ölçün. Kondansatörler dolarken değer yükselir; oturmasını bekleyin ve iki yönde ölçün. **Rayları birbirine** de ölçün (ör. 3V3–5V). Birkaç ohm şüphelidir, ama büyük işlemcilerin ve FPGA’ların çekirdek raylarında düşük değerler normal olabilir: aynı partideki diğer kartlarla veya bilinen sağlam bir kartla karşılaştırın.
3. Ölçtüğünüz değerleri kayda geçirin; ileride bir şey değiştiğinde karşılaştırma noktanız olur.

Örnek: 3,3 V’luk ray GND’ye 3 Ω gösteriyor. Bu bir direnç olsaydı 3,3 V’ta **1,1 A** çekip **3,63 W** harcardı. Akım sınırı olmadan enerji verirseniz bir şey yanar; akım sınırıyla ise sorunu güvenle arayabilirsiniz.

[[calc:ohm?pair=VR&V=3.3&R=3|3,3 V ve 3 Ω]]

## Akım sınırlı ilk enerji

- Kaynağın gerilimini nominal giriş gerilimine, **akım sınırını beklenen boşta akımın biraz üzerine** ayarlayın (ör. beklenen 80 mA ise 150 mA). Bağlamadan önce kablo uçlarının kutbunu bir kez daha kontrol edin.
- Enerjiyi verin ve **akımı izleyin.** Kaynak akım sınırına girdiyse (CC modu, gerilim düşer) hemen kapatın: bir kısa devre var.
- Anahtarlamalı regülatörler düşük giriş geriliminde daha çok akım çeker, çünkü yaklaşık sabit güçlü bir yük gibi davranırlar. Gerilimi yavaşça yükseltirken UVLO civarında akım sıçrayabilir; bu normaldir.
- Büyük giriş kapasitesi açılışta bir ani akım çeker ve kaynağın sınırını tetikleyebilir. [[calc:inrush|Ani akım hesaplayıcısı]]
- Akımı kaynağın göstergesinden veya bir şönt üzerinden ölçün. [[calc:shunt|Şönt hesaplayıcısı]]

### Kısa devreyi bulmak

- Önce görsel muayeneyi tekrarlayın; çoğu kısa devre bir lehim köprüsü veya ters takılmış bir parçadır.
- **Akım enjeksiyonu:** kısa devreli raya, raydaki parçaların sınırının altında düşük bir gerilimle (ör. 0,5–1 V) ve sınırlı bir akımla (ör. 1 A) enerji verin. Kısa devre noktası ısınır; termal kamerayla, izopropil alkolün nerede hızlı buharlaştığına bakarak veya dikkatle parmakla bulun.
- **Milivolt yöntemi:** aynı enjeksiyon akımı altında düzlem üzerindeki küçük gerilim farklarını hassas bir multimetreyle ölçün; kısa devreye yaklaştıkça gerilim azalır.
- Rayı 0 Ω köprülerle bölerek sorunlu bölümü daraltın.

## Raylar tek tek

- Her rayın gerilimini **yükün yanında** ölçün, yalnızca regülatörün çıkışında değil; toleransla karşılaştırın.
- **Dalgalanmayı** osiloskopla ölçün: 20 MHz bant sınırı açık, AC kuplaj, prob ucu ve kısa toprak yayı doğrudan çıkış kondansatörünün uçlarında. Uzun toprak kablosu anahtarlama gürültüsünü olduğundan çok büyük gösterir.
- Anahtarlamalı regülatörlerde SW düğümüne bakın: çınlamanın genliği ve frekansı ([[lesson:power-layout|güç kaynağı yerleşimi]]).
- **Açılış ve sıralama:** rayların yükselişini birden çok kanalla aynı anda yakalayın, ilk raya tetikleyin. Yükseliş monoton mu, sıra ve süreler veri sayfasına uygun mu, PG sinyalleri doğru mu?
- Mümkünse elektronik yük veya güç dirençleriyle tam yükte regülasyonu ve sıcaklığı kontrol edin.

## Reset ve saatler

- Reset hattı raylar oturduktan sonra yükseliyor mu? Gözetleyici (supervisor) eşikleri doğru mu, reset salınım yapıyor mu?
- **Kristal:** 10× pasif probun ucu yaklaşık 10 pF kapasite ekler; kristal pinine dokununca frekans kayabilir, osilatör durabilir bile. Mümkünse saati mikrodenetleyicinin bir saat çıkış pininden (ör. MCO) ölçün.
- 32,768 kHz RTC kristali gibi düşük güçlü osilatörler problamaya daha da hassastır; saati yazılımla bir çıkışa yönlendirip ölçün.

## Programlama ve debug arayüzü

- Debugger’ı (SWD/JTAG) bağlayın: hedef gerilimini (VTref) doğru görüyor mu, entegrenin kimliğini (IDCODE) okuyabiliyor mu?
- Bağlanmıyorsa: reset hattı, boot pinleri, SWDIO/SWCLK bağlantıları, debug bölümünün beslemesi, saat. "Reset altında bağlan" (connect under reset) seçeneğini deneyin.
- İlk yazılım basit olsun: bir LED’i yakıp söndürün, sonra UART’tan bir mesaj gönderin. Ardından çevre birimlerini **tek tek** deneyen ve açık bir "geçti/kaldı" çıktısı veren bir test yazılımı kullanın.
- Prototiplerde okuma koruması veya kalıcı seçenek baytları (option bytes) gibi geri dönüşü zor ayarları kullanmayın.

## Termal kontrol

- Raylar yük altında çalışırken sıcak parçaları kontrol edin: termal kamera, termokupl veya dikkatli bir parmak testi (60 °C civarı parmağa çok sıcak gelir; yüksek gerilimli bölümlere asla dokunmayın).
- Ölçtüğünüz sıcaklığı hesapla karşılaştırın ve en yüksek ortam sıcaklığında ne olacağını tahmin edin. [[calc:thermal|Termal hesaplayıcı]]
- Kartı saatlerce çalıştırın (soak test): kayma, ara sıra reset veya ısınma var mı?

## Pilli cihazlarda uyku akımı

Pil ömrünü çoğu zaman uyku akımı belirler. Mikroamper ölçerken multimetrenin yük gerilimi (burden voltage) ve kademe değiştirme anındaki kesinti cihazı resetleyebilir; özel bir akım ölçüm aleti veya şönt ve yükselteç kullanın. Ölçtüğünüz uyku ve aktif akımlarla ömrü yeniden hesaplayın.

[[calc:battery|Pil ömrü hesaplayıcısı]]

## Sistematik hata ayıklama

1. **Sorunu tam tanımlayın:** ne görüyorsunuz, ne bekliyordunuz, ne zaman ve ne sıklıkla oluyor, hangi kartlarda?
2. **Böl ve yönet:** sinyal zincirini ortasından ölçün; sorun o noktadan önce mi, sonra mı? Rayları köprülerle ayırın, yükleri çıkarın.
3. **Bilinen sağlamla karşılaştırın:** başka bir kart, önceki revizyon, değerlendirme kartı veya referans tasarım. Dirençleri ve dalga şekillerini nokta nokta karşılaştırın.
4. **Her seferde tek değişiklik:** iki şeyi birden değiştirirseniz hangisinin işe yaradığını bilemezsiniz. İşe yaramayan değişikliği geri alın.
5. **Not alın:** saat, adım, ölçülen değer, osiloskop ekranlarının fotoğrafları. Kart üzerindeki her değişikliği yazın (ör. "R12: 10 kΩ → 4,7 kΩ").
6. **Varsayımlarınızı sorgulayın:** prob toprağı iyi mi, karttaki gerilim gerçekten ayarladığınız değer mi (kablo düşümü), çalışan yazılım gerçekten düşündüğünüz sürüm mü?

## Sık arızalar

| Belirti | Olası neden | İlk kontrol |
|---|---|---|
| Kaynak hemen akım sınırına giriyor | lehim köprüsü, ters takılmış diyot veya kondansatör, footprint hatası | ray dirençleri, görsel muayene, akım enjeksiyonu |
| Ray 0 V veya düşük | EN pini düşük veya boşta, UVLO, aşırı yükte hiccup, yanlış FB direnci | EN ve VIN pinleri, FB bölücü değerleri |
| Ray yüksek | FB dirençleri yer değiştirmiş, FB hattı açık | FB bölücüsü |
| Regülatör ötüyor veya kararsız | hafif yükte darbe modu, kompanzasyon, MLCC’lerin piezo etkisi | SW dalga şekli, yükle değişimi |
| MCU başlamıyor | reset tutuluyor, boot pini yanlış, kristal salınmıyor, VCAP eksik | reset seviyesi, boot pinleri, saat |
| Debugger bağlanmıyor | SWD hatları ters, NRST, hedef beslemesi, yazılımın pinleri başka işe ayarlaması | reset altında bağlanma |
| I²C cevap yok (NACK) | pull-up yok, yanlış adres (7 ve 8 bit karışıklığı), SDA/SCL ters, cihaz beslenmiyor | osiloskopla hatlar, [[calc:i2c|I²C pull-up]] |
| Rastgele resetler | yük basamağında ray çökmesi, brown-out, ESD, watchdog | reset hattına tetikleyip aynı anda rayları ölçmek |
| Parça aşırı ısınıyor | kısa devre, yanlış parça, salınım, köprüde çapraz iletim | termal kamera, akım |

## Rework ipuçları

- İnce adımlı köprüler için bol flux ve lehim fitili, QFN’ler için flux ve sıcak hava kullanın. Büyük bakır alanlı kartları önceden ısıtın.
- Komşu parçaları Kapton bantla koruyun. Padleri kaldırmamak için aşırı ısıdan ve kuvvetten kaçının.
- Ek teller için ince tel (30 AWG, emaye veya wire-wrap) kullanın ve teli yapıştırarak sabitleyin.
- İz keserken neşter kullanın ve kesimi süreklilik testiyle doğrulayın.
- Her müdahaleden sonra, enerji vermeden önce ray dirençlerini yeniden ölçün.
- Her değişikliği bir değişiklik listesine yazın ve bir sonraki kart revizyonuna aktarın.

## Sık yapılan hatalar

- İlk enerjiyi akım sınırı olmadan veya sınırı çok yüksek bir kaynakla vermek.
- Beklenen değerleri önceden yazmadan ölçmek.
- Bütün kartı aynı anda çalıştırmaya çalışmak.
- Dalgalanmayı uzun prob toprağıyla ölçüp olmayan bir sorunun peşine düşmek.
- İki değişikliği birden yapmak ve not almamak.
- Yapılan rework’ü belgelememek; bir sonraki kart aynı hatayla gelir.

> [!QUIZ] Yeni bir kartta 3,3 V’luk ray GND’ye 2 Ω gösteriyor. Ne yaparsınız?
> Enerji vermeden önce aynı partideki diğer kartlarla ve rayın beklenen yüküyle karşılaştırırsınız. Diğer kartlar kΩ mertebesindeyse bir kısa devre vardır: önce görsel muayene, sonra düşük gerilim ve sınırlı akımla akım enjeksiyonu yapıp ısınan noktayı bulursunuz.

> [!QUIZ] Akım sınırını 100 mA’e ayarladınız; kaynak hemen CC moduna geçti ve gerilim 0,4 V’ta kaldı. Bu ne anlama gelir?
> Kart neredeyse kısa devre gibi davranıyor: 0,4 V’ta 100 mA, yaklaşık 4 Ω’luk bir yük demektir. Hemen kapatın ve kısa devreyi arayın; akım sınırını yükseltmek çözüm değildir.

> [!QUIZ] Buck çıkışında osiloskop 400 mV’luk dalgalanma gösteriyor, ama hesap 20 mV diyor. İlk neyi kontrol edersiniz?
> Ölçüm yöntemini: 20 MHz bant sınırı, AC kuplaj ve prob toprağı. Uzun toprak kablosu SW düğümünün alanını toplar; prob ucunu ve kısa toprak yayını doğrudan çıkış kondansatörüne dayayıp yeniden ölçün.

> [!QUIZ] Kristal pinine probu dokundurunca mikrodenetleyici duruyor. Neden?
> Prob ucu yaklaşık 10 pF kapasite ve bir yük ekler; kristalin gördüğü yük kapasitesi değişir, osilatörün kazanç payı düşer ve salınım durabilir. Saati bir saat çıkış pininden ölçün.

> [!QUIZ] Bir sorunu çözmek için iki direnci birden değiştirdiniz ve sorun kayboldu. Bu neden iyi bir haber değil?
> Hangi değişikliğin işe yaradığını bilmiyorsunuz; diğeri gereksiz, hatta zararlı olabilir. Birini geri alıp tekrar deneyin ve sonucu gerekçesiyle not edin.

## Kontrol listesi

- Plan ve beklenen değerler yazıldı; kayıt tutuluyor.
- Görsel muayene, ray–GND ve ray–ray direnç ölçümleri yapıldı.
- İlk enerji akım sınırlı verildi; akım beklendiği gibi.
- Her ray gerilim, dalgalanma ve sıralama açısından ölçüldü.
- Reset ve saatler doğru; debugger bağlanıyor; temel yazılım çalışıyor.
- Çevre birimleri tek tek denendi; termal kontrol ve uzun süre testi yapıldı.
- Tüm rework’ler ve bulgular bir sonraki revizyon için listelendi.
`,
    en: `
## Why it matters

The moment a new board first gets power is both exciting and risky: you have only a few prototypes, some parts are expensive or hard to get, and an assembly fault can destroy the board in seconds. A systematic bring-up does two things: it protects the board, and when something goes wrong it lets you quickly tell whether it is a **design error, an assembly error or a faulty part**.

The rule is simple: **write down what you expect at each step first, then measure.** A measurement taken without an expected value tells you very little.

[[fig:bringup-flow]]

## Preparation: bench and documents

- **Tools:** a current-limited adjustable bench supply, a multimeter, an oscilloscope with short ground springs on its probes, a magnifier or microscope, an ESD mat and wrist strap, a soldering iron, hot air, flux, fine wire (e.g. 30 AWG) and Kapton tape. A thermal camera saves a lot of time if you have one.
- **Documents:** the schematic, a layout print showing the test points, the BOM, and a power budget with the expected current of every rail.
- **Plan:** the list of steps and the expected values for each. Keep a log with the board’s serial number: date, step, expected, measured, notes.
- If you can, design the board so that it can be brought up **section by section**: 0 Ω links or jumpers that separate the rails (see [[lesson:schematic-review|schematic review]]).

## Before applying power

1. **Visual inspection:** orientation of polarised parts (diodes, electrolytic and tantalum capacitors, pin 1 of ICs), solder bridges on fine-pitch ICs and connectors, missing or tombstoned parts, wrong values, board damage.
2. **Rail-to-GND resistance:** measure each rail to GND with the multimeter. The reading rises while the capacitors charge; let it settle and measure in both directions. Measure **rails to each other** too (e.g. 3V3 to 5V). A few ohms is suspicious, but low values can be normal on the core rails of large processors and FPGAs: compare with other boards from the same batch or with a known-good board.
3. Log what you measure; it becomes your reference when something changes later.

Example: the 3.3 V rail reads 3 Ω to GND. If that were a resistor, at 3.3 V it would draw **1.1 A** and dissipate **3.63 W**. Power it without a current limit and something burns; with a current limit you can look for the problem safely.

[[calc:ohm?pair=VR&V=3.3&R=3|3.3 V and 3 Ω]]

## Current-limited first power-on

- Set the supply to the nominal input voltage and the **current limit a little above the expected idle current** (e.g. 150 mA if you expect 80 mA). Check the polarity of the leads once more before connecting.
- Apply power and **watch the current.** If the supply goes into current limit (CC mode, the voltage drops), switch off at once: there is a short.
- Switching regulators draw more current at low input voltage, because they behave roughly like a constant-power load. If you raise the voltage slowly, the current may jump around the UVLO threshold; that is normal.
- A large input capacitance draws an inrush current at power-up and can trip the supply’s limit. [[calc:inrush|Inrush calculator]]
- Measure the current on the supply’s display or across a shunt. [[calc:shunt|Shunt calculator]]

### Finding a short

- Repeat the visual inspection first; most shorts are a solder bridge or a part fitted the wrong way round.
- **Current injection:** feed the shorted rail with a low voltage (e.g. 0.5–1 V, below the limits of the parts on the rail) and a limited current (e.g. 1 A). The short heats up; find it with a thermal camera, by watching where isopropyl alcohol evaporates fastest, or carefully with a finger.
- **Millivolt method:** with the same injected current, measure the small voltage differences across the plane with a sensitive multimeter; the voltage falls as you approach the short.
- Split the rail with 0 Ω links to narrow down the faulty section.

## Rails one by one

- Measure each rail **at the load**, not only at the regulator output, and compare with its tolerance.
- Measure **ripple** with the oscilloscope: 20 MHz bandwidth limit on, AC coupling, probe tip and short ground spring right across the output capacitor. A long ground lead makes switching noise look much bigger than it is.
- On switching regulators look at the SW node: ringing amplitude and frequency (see [[lesson:power-layout|power supply layout]]).
- **Start-up and sequencing:** capture the rails rising on several channels at once, triggering on the first. Are the ramps monotonic, are the order and timing per the datasheet, are the PG signals right?
- If you can, check regulation and temperature at full load with an electronic load or power resistors.

## Reset and clocks

- Does the reset line rise after the rails settle? Are the supervisor thresholds right; does reset oscillate?
- **Crystal:** the tip of a 10× passive probe adds about 10 pF; touching a crystal pin can pull the frequency or even stop the oscillator. Measure the clock on a clock output pin of the microcontroller (e.g. MCO) if you can.
- Low-power oscillators such as a 32.768 kHz RTC crystal are even more sensitive to probing; route the clock to an output in firmware and measure there.

## Programming and debug interface

- Connect the debugger (SWD/JTAG): does it see the target voltage (VTref), can it read the chip’s ID (IDCODE)?
- If it does not connect: reset line, boot pins, SWDIO/SWCLK wiring, supply of the debug section, clock. Try "connect under reset".
- Keep the first firmware simple: blink an LED, then send a message over the UART. Then use a test firmware that exercises the peripherals **one by one** with a clear "pass/fail" output.
- On prototypes avoid settings that are hard to undo, such as read-out protection or permanent option bytes.

## Thermal check

- With the rails running under load, check for hot parts: thermal camera, thermocouple or a careful finger test (around 60 °C feels very hot; never touch high-voltage sections).
- Compare the measured temperature with your calculation and estimate what happens at the highest ambient temperature. [[calc:thermal|Thermal calculator]]
- Run the board for hours (soak test): any drift, occasional resets or creeping temperature?

## Sleep current in battery-powered devices

Battery life is often set by the sleep current. When measuring microamps, the multimeter’s burden voltage and the dropout while it switches ranges can reset the device; use a dedicated current-measurement tool or a shunt and amplifier. Recalculate the battery life with the sleep and active currents you measured.

[[calc:battery|Battery life calculator]]

## Systematic debugging

1. **Define the problem precisely:** what do you see, what did you expect, when and how often does it happen, on which boards?
2. **Divide and conquer:** measure in the middle of the signal chain; is the problem before or after that point? Separate rails with links, remove loads.
3. **Compare with a known-good:** another board, the previous revision, an evaluation board or the reference design. Compare resistances and waveforms point by point.
4. **One change at a time:** if you change two things at once, you won’t know which one helped. Undo changes that did not help.
5. **Take notes:** time, step, measured value, photos of scope screens. Write down every change on the board (e.g. "R12: 10 kΩ → 4.7 kΩ").
6. **Question your assumptions:** is the probe ground good, is the voltage at the board really what you set (cable drop), is the firmware running really the version you think?

## Common faults

| Symptom | Possible cause | First check |
|---|---|---|
| Supply goes into current limit at once | solder bridge, reversed diode or capacitor, footprint error | rail resistances, visual inspection, current injection |
| Rail at 0 V or low | EN pin low or floating, UVLO, hiccup on overload, wrong FB resistor | EN and VIN pins, FB divider values |
| Rail too high | FB resistors swapped, FB line open | FB divider |
| Regulator whines or is unstable | pulse-skipping at light load, compensation, piezo effect of MLCCs | SW waveform, change with load |
| MCU does not start | reset held, wrong boot pin, crystal not oscillating, missing VCAP | reset level, boot pins, clock |
| Debugger cannot connect | SWD lines swapped, NRST, target supply, firmware reassigning the pins | connect under reset |
| No I²C response (NACK) | missing pull-ups, wrong address (7-bit vs 8-bit), SDA/SCL swapped, device unpowered | scope on the lines, [[calc:i2c|I²C pull-up]] |
| Random resets | rail droop on load steps, brown-out, ESD, watchdog | trigger on the reset line while measuring the rails |
| A part runs very hot | short, wrong part, oscillation, shoot-through in a bridge | thermal camera, current |

## Rework tips

- Use plenty of flux and solder wick for fine-pitch bridges, and flux and hot air for QFNs. Preheat boards with large copper areas.
- Protect neighbouring parts with Kapton tape. Avoid excessive heat and force so you don’t lift pads.
- Use fine wire (30 AWG, enamelled or wire-wrap) for bodge wires and glue the wire down.
- Cut traces with a scalpel and confirm the cut with a continuity test.
- After every intervention, measure the rail resistances again before applying power.
- Record every change in a change list and carry it into the next board revision.

## Common mistakes

- First power-on without a current limit, or with the limit set far too high.
- Measuring without writing down expected values first.
- Trying to bring up the whole board at once.
- Measuring ripple with a long probe ground and chasing a problem that is not there.
- Making two changes at once and not taking notes.
- Not documenting rework; the next board arrives with the same error.

> [!QUIZ] On a new board the 3.3 V rail reads 2 Ω to GND. What do you do?
> Before applying power, compare with other boards from the same batch and with the rail’s expected load. If the others read in the kΩ range, there is a short: visual inspection first, then current injection at low voltage and limited current to find the spot that heats up.

> [!QUIZ] You set the current limit to 100 mA; the supply goes into CC mode at once and the voltage stays at 0.4 V. What does that mean?
> The board behaves almost like a short: 100 mA at 0.4 V is a load of about 4 Ω. Switch off at once and look for the short; raising the current limit is not the answer.

> [!QUIZ] The scope shows 400 mV of ripple at a buck output, but the calculation says 20 mV. What do you check first?
> The measurement method: 20 MHz bandwidth limit, AC coupling and the probe ground. A long ground lead picks up the field of the SW node; press the probe tip and a short ground spring right across the output capacitor and measure again.

> [!QUIZ] The microcontroller stops when you touch the crystal pin with the probe. Why?
> The probe tip adds about 10 pF and a load; the load capacitance the crystal sees changes, the oscillator’s gain margin drops and oscillation can stop. Measure the clock on a clock output pin.

> [!QUIZ] To fix a problem you changed two resistors at once, and the problem went away. Why is that not good news?
> You don’t know which change helped; the other may be unnecessary or even harmful. Undo one, try again, and note the result and the reason.

## Checklist

- Plan and expected values written down; a log is kept.
- Visual inspection, rail-to-GND and rail-to-rail resistance measurements done.
- First power-on current-limited; the current is as expected.
- Every rail measured for voltage, ripple and sequencing.
- Reset and clocks correct; the debugger connects; basic firmware runs.
- Peripherals tried one by one; thermal check and soak test done.
- All rework and findings listed for the next revision.
`,
  },
};
