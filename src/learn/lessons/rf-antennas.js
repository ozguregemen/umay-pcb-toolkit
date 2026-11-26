export default {
  body: {
    tr: `
## Neden önemli?

Kablosuz bir ürünün menzili çoğu zaman radyo çipinden değil, antenden ve antenin kart üzerindeki yerleşiminden belirlenir. Açık alanda 6 dB’lik kayıp menzili yaklaşık yarıya indirir; kötü yerleştirilmiş bir anten bu kadarını kolayca kaybettirir. Anten, ilk kart tasarımında düşünülmesi gereken bir parçadır; sonradan "sığdırılmaya" çalışılan antenler genellikle ikinci bir kart turuna neden olur.

## Dalga boyu her şeyi belirler

Bir antenin boyutu, çalıştığı frekansın dalga boyuyla orantılıdır: **λ0 = c / f**. Basit antenlerin çoğu çeyrek dalga (λ/4) veya yarım dalga (λ/2) uzunluğundadır.

| Bant | Tipik kullanım | λ0 | λ/4 (havada) |
|---|---|---|---|
| 433 MHz | ISM, uzaktan kumanda | 692 mm | 173 mm |
| 868 MHz | LoRa, Sigfox (Avrupa) | 345 mm | 86 mm |
| 915 MHz | LoRa (ABD) | 328 mm | 82 mm |
| 2,45 GHz | Wi-Fi, Bluetooth LE, Zigbee | 122 mm | 31 mm |
| 5,8 GHz | Wi-Fi | 52 mm | 13 mm |

Kart üzerine basılı bir izde alanın bir kısmı laminatın içindedir; etkin dielektrik sabiti FR-4’te yaklaşık (εr + 1)/2 ≈ 2,65 olur ve gereken uzunluk √2,65 ≈ 1,6 kat kısalır. 2,45 GHz için çeyrek dalga basılı monopol ≈ 19 mm’dir. Bu bir başlangıç değeridir; kesin uzunluk ölçümle bulunur.

[[calc:antenna?type=mono&f=868&f_u=MHz|868 MHz monopol uzunluğu]] [[calc:antenna?type=mono&f=2.45&f_u=GHz|2,45 GHz basılı monopol]]

## Toprak düzlemi antenin yarısıdır

Çeyrek dalga monopol tek başına çalışmaz: akımın diğer yarısı toprak düzleminde akar ve toprak düzlemi, monopolün "ayna görüntüsünü" oluşturarak onu yarım dalga dipol gibi davrandırır. Bu yüzden:

- Toprak düzleminin anten yönündeki boyu ideal olarak **en az λ/4** olmalıdır (2,45 GHz’te ≈ 31 mm, 868 MHz’te ≈ 86 mm).
- Küçük toprak düzlemi rezonansı kaydırır, empedansı değiştirir ve verimi düşürür. Çip antenlerin veri sayfalarında önerilen toprak boyutu bu yüzden verilir.
- Toprak dökümünü katmanlar arasında sık vialarla bağlayın; anten kenarı boyunca bir via çiti koyun.

> [!NOTE] Küçük bir kartta 868 MHz için λ/4 toprak sağlamak çoğu zaman mümkün değildir. Bu durumda kablo, pil veya kutu da antenin parçası olur; performans ölçülmeden tahmin edilemez.

## Anten türleri

| Tür | Boyut | Artısı | Eksisi |
|---|---|---|---|
| Çip anten | birkaç mm | küçük, hazır parça | toprağa ve yerleşime çok duyarlı, ayar şart |
| Basılı monopol / IFA / menderes | λ/4 civarında iz | bakır bedava, iyi verim | kart alanı ister, ayar gerekir |
| Yama (patch) | laminatta ≈ λ/2 × λ/2 | yönlü, düz yüzeyde ışır (GPS, 5,8 GHz) | büyük, dar bantlı, FR-4’te kayıplı |
| Harici anten (u.FL / SMA) | — | en iyi performans, hazır sertifika | maliyet, mekanik montaj |
| NFC / RFID bobini | birkaç cm | yakın alanda güvenilir | ışıma yapmaz, menzil birkaç cm |

IFA (inverted-F, ters F) anten, kısa devre ayağı sayesinde çeyrek dalga monopolün kart kenarına paralel katlanmış hâlidir; Bluetooth ve Wi-Fi modüllerinde en çok görülen basılı antendir. Menderes (zikzak) anten aynı uzunluğu daha küçük alana sığdırır ama bant genişliği ve verimi düşer.

[[calc:antenna|PCB anten hesaplayıcısı]] [[calc:antenna?type=patch&f=5.8&f_u=GHz&er=3.55&h=0.813|5,8 GHz yama, RO4003C]]

## Yerleşim kuralları

[[fig:antenna-layout]]

- Anteni kartın **kenarına**, tercihen köşesine koyun; ışıyan uç kartın dışına baksın.
- Antenin altında ve çevresinde **tüm katmanlarda** bakır olmamalıdır. İç katmandaki bir düzlem bile anteni bozar.
- Üreticinin referans tasarımını, toprak boyutları ve bakırsız bölge dahil birebir kopyalayın. Küçük bir değişiklik bile frekansı kaydırır.
- Metal kutu, pil, ekran, kablo ve vidaları antenden uzak tutun; bunlar rezonansı kaydırır.
- 50 Ω besleme hattını kontrollü empedansla çizin ve kısa tutun.

[[calc:impedance|50 Ω besleme hattı genişliği]]

## Eşleştirme ve ayar

Antenin empedansı kart üzerinde nadiren tam 50 Ω çıkar. Beslemeye bir **π eşleştirme ağı** için üç pad bırakın: ilk kartta seri eleman 0 Ω, paralel elemanlar boş (DNP). Kart gelince vektör ağ analizörüyle (VNA) S11 ölçülür ve Smith abağında L/C değerleri seçilir. Hedef, çalışma bandında **S11 < −10 dB** (VSWR < 2), yani gücün en fazla %10’unun geri yansımasıdır.

[[calc:matching|π eşleştirme değerlerini hesapla]] [[calc:reflection|Yansıma ve VSWR hesaplayıcısı]]

> [!TIP] Ayarı her zaman ürünün son hâlinde yapın: kutu kapalı, pil takılı, kablolar yerinde. Elde tutulan cihazlarda kullanıcının eli de anteni kaydırır.

## NFC ve RFID bobinleri: anten değil, transformatör

[[fig:nfc-coupling]]

13,56 MHz’te dalga boyu ≈ 22 m’dir; birkaç santimlik bir bobin ışıma yapmaz. Okuyucu ve etiket bobinleri **manyetik olarak kuple** olur, yani gevşek kuplajlı bir transformatör gibi çalışır. Tasarım adımları:

1. IC üreticisinin önerdiği endüktans aralığına göre spiral bobini boyutlandırın.
2. Paralel bir kapasitörle hedef frekansta rezonansa getirin: C = 1 / ((2πf)²·L) − C_parazitik.
3. Q çok yüksekse veri bant genişliği daralır; seri sönümleme direnciyle Q’yu sınırlayın (okuyucularda tipik olarak 20–35).
4. Bobinin altında bakır düzlem bırakmayın. Metal bir yüzeye yerleşecekse araya ferrit levha koyun ve yeniden ayarlayın.

[[calc:inductor?ft=13.56&ft_u=MHz|Spiral bobin ve rezonans hesabı]]

125 kHz LF RFID için gereken endüktans yüzlerce µH’dir; bu değer PCB spiraliyle zor elde edilir ve genellikle tel sarımlı bobin kullanılır.

## Kısa sınav

> [!QUIZ] 868 MHz LoRa için havada çeyrek dalga tel anten yaklaşık ne kadar uzun olmalı?
> λ0 = 299,8 / 868 MHz ≈ 345 mm, λ/4 ≈ 86 mm. Kart üzerine basılı bir izde bu uzunluk ≈ 53 mm’ye kısalır (FR-4).

> [!QUIZ] Bir BLE modülünün anten bölgesinin altına, iç katmandaki GND düzlemi uzatıldı. Ne beklersiniz?
> Anten düzlemle kuple olur: rezonans kayar, empedans bozulur, verim ve menzil belirgin biçimde düşer. Bakırsız bölge tüm katmanlar için geçerlidir.

> [!QUIZ] Çip antenin veri sayfası 40 × 20 mm toprak öneriyor, kartınız 20 × 15 mm. Ne yapmalısınız?
> Rezonans ve empedans değişir, verim düşer. Üreticinin küçük kart için verdiği referans tasarımı kullanın veya π eşleştirme ağıyla kart üzerinde yeniden ayarlayın; menzili ölçerek doğrulayın.

> [!QUIZ] NFC etiket bobinini metal bir kapağın üzerine koydunuz ve okuma mesafesi neredeyse sıfıra indi. Neden?
> Metaldeki girdap akımları bobinin manyetik alanına karşı koyar; L ve Q düşer, rezonans kayar. Bobin ile metal arasına ferrit levha konur ve devre yeniden ayarlanır.

## Kontrol listesi

- Anten tipi, referans tasarım ve önerilen toprak boyutları belirlendi.
- Anten kart kenarında; altında ve çevresinde tüm katmanlarda bakır yok.
- 50 Ω besleme hattı kontrollü empedansla çizildi; π eşleştirme padleri bırakıldı.
- Kutu, pil, ekran ve kablolar antenden uzakta; ayar ürünün son hâlinde yapılacak.
- NFC bobini için rezonans kapasitesi ve sönümleme direnci hesaplandı; metal yüzey varsa ferrit planlandı.
- Sertifikasyon (CE RED, FCC) için ön test ve iletken ölçüm (u.FL test konnektörü) planlandı.
`,
    en: `
## Why it matters

The range of a wireless product is usually set by the antenna and its placement on the board, not by the radio chip. In open space a 6 dB loss roughly halves the range, and a badly placed antenna easily loses that much. The antenna is part of the first board layout; antennas "squeezed in" afterwards usually cause another board spin.

## Wavelength sets everything

The size of an antenna scales with the wavelength of its operating frequency: **λ0 = c / f**. Most simple antennas are a quarter wave (λ/4) or half wave (λ/2) long.

| Band | Typical use | λ0 | λ/4 (in air) |
|---|---|---|---|
| 433 MHz | ISM, remote controls | 692 mm | 173 mm |
| 868 MHz | LoRa, Sigfox (Europe) | 345 mm | 86 mm |
| 915 MHz | LoRa (US) | 328 mm | 82 mm |
| 2.45 GHz | Wi-Fi, Bluetooth LE, Zigbee | 122 mm | 31 mm |
| 5.8 GHz | Wi-Fi | 52 mm | 13 mm |

On a trace printed on the board part of the field is inside the laminate; on FR-4 the effective dielectric constant is about (εr + 1)/2 ≈ 2.65, so the required length shrinks by √2.65 ≈ 1.6. A printed quarter-wave monopole for 2.45 GHz is about 19 mm. This is a starting value; the exact length is found by measurement.

[[calc:antenna?type=mono&f=868&f_u=MHz|868 MHz monopole length]] [[calc:antenna?type=mono&f=2.45&f_u=GHz|2.45 GHz printed monopole]]

## The ground plane is half of the antenna

A quarter-wave monopole does not work alone: the other half of the current flows in the ground plane, which forms the monopole’s "mirror image" so it behaves like a half-wave dipole. Therefore:

- The ground plane should ideally be **at least λ/4** long in the antenna direction (≈ 31 mm at 2.45 GHz, ≈ 86 mm at 868 MHz).
- A small ground plane shifts the resonance, changes the impedance and lowers efficiency. That is why chip-antenna datasheets specify a ground size.
- Stitch the ground pour between layers with plenty of vias, and run a via fence along the antenna edge.

> [!NOTE] On a small board a λ/4 ground for 868 MHz is often impossible. Then cables, the battery or the enclosure become part of the antenna, and performance cannot be predicted without measurement.

## Antenna types

| Type | Size | Pros | Cons |
|---|---|---|---|
| Chip antenna | a few mm | small, off-the-shelf part | very sensitive to ground and placement, needs tuning |
| Printed monopole / IFA / meander | trace of about λ/4 | free copper, good efficiency | needs board area and tuning |
| Patch | ≈ λ/2 × λ/2 in the laminate | directional, radiates from a flat surface (GPS, 5.8 GHz) | large, narrow band, lossy on FR-4 |
| External antenna (u.FL / SMA) | — | best performance, existing certification | cost, mechanical mounting |
| NFC / RFID coil | a few cm | reliable in the near field | does not radiate, range a few cm |

An IFA (inverted-F antenna) is a quarter-wave monopole folded parallel to the board edge with a shorting leg; it is the most common printed antenna on Bluetooth and Wi-Fi modules. A meander (zig-zag) antenna fits the same length into a smaller area at the cost of bandwidth and efficiency.

[[calc:antenna|PCB antenna calculator]] [[calc:antenna?type=patch&f=5.8&f_u=GHz&er=3.55&h=0.813|5.8 GHz patch on RO4003C]]

## Placement rules

[[fig:antenna-layout]]

- Put the antenna on the **board edge**, preferably a corner, with the radiating end pointing off the board.
- Keep **all layers** free of copper under and around the antenna. Even a plane on an inner layer ruins it.
- Copy the vendor reference design exactly, including the ground size and the copper-free zone. Even a small change shifts the frequency.
- Keep metal enclosures, batteries, displays, cables and screws away from the antenna; they shift the resonance.
- Route the 50 Ω feed line with controlled impedance and keep it short.

[[calc:impedance|50 Ω feed line width]]

## Matching and tuning

The antenna impedance on a real board is rarely exactly 50 Ω. Leave three pads for a **π matching network** at the feed: on the first board the series part is 0 Ω and the shunt parts are not fitted (DNP). When boards arrive, S11 is measured with a vector network analyser (VNA) and L/C values are chosen on the Smith chart. The target is **S11 < −10 dB** (VSWR < 2) across the band, i.e. at most 10 % of the power reflected.

[[calc:matching|Calculate the π-match values]] [[calc:reflection|Reflection and VSWR calculator]]

> [!TIP] Always tune the final product: enclosure closed, battery fitted, cables in place. For handheld devices the user’s hand detunes the antenna too.

## NFC and RFID coils: a transformer, not an antenna

[[fig:nfc-coupling]]

At 13.56 MHz the wavelength is ≈ 22 m; a coil a few centimetres across does not radiate. Reader and tag coils **couple magnetically**, working like a loosely coupled transformer. Design steps:

1. Size the spiral coil for the inductance range the IC vendor recommends.
2. Resonate it at the target frequency with a parallel capacitor: C = 1 / ((2πf)²·L) − C_parasitic.
3. If Q is too high the data bandwidth gets too narrow; limit Q with a series damping resistor (typically 20–35 for readers).
4. Do not leave a copper plane under the coil. If it will sit on a metal surface, put a ferrite sheet in between and retune.

[[calc:inductor?ft=13.56&ft_u=MHz|Spiral coil and resonance calculator]]

125 kHz LF RFID needs hundreds of µH, which is hard to reach with a PCB spiral; wire-wound coils are usually used.

## Quick quiz

> [!QUIZ] About how long should a quarter-wave wire antenna in air be for 868 MHz LoRa?
> λ0 = 299.8 / 868 MHz ≈ 345 mm, so λ/4 ≈ 86 mm. Printed on the board this shrinks to ≈ 53 mm (FR-4).

> [!QUIZ] The inner-layer GND plane was extended under the antenna area of a BLE module. What do you expect?
> The antenna couples to the plane: the resonance shifts, the impedance is off, and efficiency and range drop markedly. The copper-free zone applies to all layers.

> [!QUIZ] The chip-antenna datasheet recommends a 40 × 20 mm ground; your board is 20 × 15 mm. What should you do?
> Resonance and impedance change and efficiency drops. Use the vendor’s reference design for small boards, or retune on the board with the π matching network; verify by measuring range.

> [!QUIZ] You placed an NFC tag coil on a metal cover and the read distance dropped to almost zero. Why?
> Eddy currents in the metal oppose the coil’s magnetic field; L and Q drop and the resonance shifts. A ferrite sheet is placed between coil and metal and the circuit is retuned.

## Checklist

- Antenna type, reference design and recommended ground size chosen.
- Antenna on the board edge; no copper on any layer under or around it.
- 50 Ω feed routed with controlled impedance; π matching pads left in place.
- Enclosure, battery, display and cables kept away; tuning planned in the final product.
- Resonance capacitor and damping resistor calculated for the NFC coil; ferrite planned if metal is nearby.
- Pre-compliance testing (CE RED, FCC) and a conducted test point (u.FL test connector) planned.
`,
  },
};
