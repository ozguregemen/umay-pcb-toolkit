export default {
  body: {
    tr: `
## Neden önemli?

Bir baskılı devre kartı şematikten test edilmiş bir montaja kadar bir dizi adımdan geçer ve her adım bir sonrakine veri devreder. Erken yapılan bir hata (yanlış bir footprint, üreticiyle konuşulmamış bir katman yığını) sonraki her adımda daha pahalıya patlar. Üreticiniz ve montajcınız da IPC standartlarına göre çalışır; hepsini ezberlemeniz gerekmez, ama hangi sorunun cevabının hangi belgede olduğunu bilmelisiniz.

## Tasarım akışı

1. **Gereksinimler:** işlev, arayüzler, güç, ortam (sıcaklık, nem, titreşim), beklenen ömür ve maliyet. Kartın sınıfını bunlar belirler.
2. **Şematik:** devreyi çizin, gerçek parça numaralarını seçin, **ERC** (elektriksel kural kontrolü) çalıştırın.
3. **Kütüphane:** her parçanın veri sayfasıyla birebir uyan bir footprint’i olmalı. Yüzey montaj pad desenlerini **IPC-7351**’e göre oluşturun; pin 1’i ve pin numaralarını veri sayfasıyla karşılaştırın.
4. **Kart çerçevesi ve katman yığını:** dış hat, montaj delikleri, konnektör yerleri ve katman yapısı. Katman yığınını üreticiyle netleştirin ([[lesson:stackup|katman yığını dersi]]).
5. **Yerleşim:** önce konnektörler ve mekanik olarak sabit parçalar, sonra güç katları, saat devreleri, hızlı parçalar ve hassas analog.
6. **İz çizimi (routing):** önce kritik netler, sonra geri kalanlar. Tasarım kurallarını üretici kabiliyetine ve [[lesson:spacing|gerilime bağlı aralığa]] göre başlamadan girin.
7. **Kontroller:** **DRC** (tasarım kuralı kontrolü) ve bir başka mühendisin incelemesi.
8. **Üretim çıktıları:** Gerber (tercihen X2), ODB++ veya IPC-2581; delik dosyaları, IPC-D-356 netlist, üretim çizimi, katman yığını. Montaj için BOM, dizgi (pick-and-place) dosyası ve montaj çizimi.
9. **Üretim, montaj ve test:** üreticinin DFM kontrolü ve çıplak kart elektriksel testi; dizgi, reflow ve muayene (AOI, röntgen); devre içi ve fonksiyon testi. Bulunan sorunlar bir sonraki revizyona geri beslenir.

> [!TIP] Katman yığınını, kart sınıfını ve yüzey kaplamasını **iz çizimine başlamadan** üreticiyle konuşun. Bunları yerleşimden sonra değiştirmek empedansı, aralıkları ve padleri yeniden kontrol etmek demektir.

## IPC belgelerinin haritası

| Belge | Neyi cevaplar? |
|---|---|
| IPC-2221 | Genel tasarım kuralları: gerilime göre aralık (Tablo 6-1), halka, üretim payı, üretilebilirlik seviyeleri |
| IPC-2222 | Rijit organik kartlara özel kurallar, ör. bacak–delik boşluğu |
| IPC-2152 | İletkenlerin akım taşıma kapasitesi, ör. güç izlerinin genişliği |
| IPC-7351 | Yüzey montaj pad desenleri: kılıf ölçüsünden pad ölçüsüne |
| IPC-4101 | Laminat ve prepreg şartnameleri ("slash sheet" numaralarıyla) |
| IPC-6012 | Rijit çıplak kartın yeterlilik ve performans şartları: kabul için ne ölçülür |
| IPC-A-600 | Çıplak kartta kabul edilebilir ve edilemez durumların görsel örnekleri |
| IPC-A-610 | Elektronik montajların kabulü: lehim bağlantıları, parça konumu |
| J-STD-001 | Lehimli montaj gereksinimleri: malzeme, süreç, lehimleme |

> [!NOTE] Belgeler çiftler hâlinde çalışır. IPC-6012 **neyin ölçüleceğini** ve sınırlarını söyler, IPC-A-600 bunun **nasıl göründüğünü** gösterir. Benzer şekilde J-STD-001 süreç gereksinimi, IPC-A-610 görsel kabul belgesidir.

IPC-2152 ile iz genişliği seçimi [[lesson:trace-current|akım taşıyan izler dersinde]] anlatılır.

## Sınıf 1, 2 ve 3

Sınıf, bitmiş ürünün ne kadar güvenilir olması gerektiğini anlatır. IPC-6011/6012’de tanımlanır; montaj standartları (IPC-A-610, J-STD-001) aynı sınıfları kullanır.

| Sınıf | Anlamı | Tipik ürünler |
|---|---|---|
| 1 | Genel elektronik: temel işlev yeterli | Oyuncaklar, basit tüketici ürünleri |
| 2 | Özel hizmet: uzun ömür istenir, kesinti kritik değil | Endüstriyel kontrol, haberleşme |
| 3 | Yüksek güvenilirlik: kesintiye tahammül yok | Havacılık, yaşam desteği, savunma |

Sınıf, ölçülebilir kabul kriterlerini değiştirir. IPC-6012’den örnekler:

- **Delik bakır kaplaması:** ortalama 20 µm (Sınıf 1–2), 25 µm (Sınıf 3).
- **Halka (annular ring):** Sınıf 1 180°, Sınıf 2 90° delik kırılmasına (breakout) izin verir (Sınıf 2 iç katmanda yalnızca damla/fillet varsa); Sınıf 3 dışta en az 0,050 mm, içte 0,025 mm halka ister.
- **İletken genişliğinde azalma** (izole kusurlar): Sınıf 1’de %30’a, Sınıf 2–3’te %20’ye kadar.

[[calc:ipcref?c=2|IPC kurallarında Sınıf 2’yi vurgula]] [[calc:ipcref?c=3|Sınıf 3 ile karşılaştır]]

Sınıf yükseldikçe muayene artar, süreç sıkılaşır; fiyat ve teslim süresi büyür.

## Üretilebilirlik seviyeleri A, B ve C

Sınıftan **bağımsız** ikinci bir eksen vardır. IPC-2221 bir özelliğin üretim zorluğunu üç seviyeyle anlatır: **A** genel (en kolay), **B** orta, **C** yüksek hassasiyet. Seviye, pad üretim payı (A 0,4 / B 0,25 / C 0,2 mm) ve delik konum toleransı gibi değerleri belirler. Sınıf 3 bir kart Seviye A ile, Sınıf 1 bir telefon kartı Seviye C ile tasarlanabilir.

1,6 mm kartta 0,3 mm bitmiş delikli bir via için pad hesaplayıcısı en küçük pad çapını (dış / iç katman) şöyle verir: **Seviye A** 0,875 / 0,925 mm, **Seviye B** 0,725 / 0,775 mm, **Seviye C** 0,675 / 0,725 mm.

[[calc:padstack?lv=A|Seviye A’yı aç]] [[calc:padstack?lv=C|Seviye C’yi aç]]

> [!WARN] Bunları IPC-7351’in yoğunluk seviyeleriyle karıştırmayın. IPC-7351’de de A/B/C vardır ama padin kılıf dışına ne kadar taştığını anlatır (A en çok, B nominal, C en az). Harfler aynı, anlamları farklı.

## Nasıl seçilir?

1. **Kullanım yerinden ve müşteri sözleşmesinden başlayın.** Ticari ve endüstriyel ürünlerin çoğu Sınıf 2’dir; Sınıf 3’ü yalnızca ürün gerçekten gerektiriyorsa seçin.
2. **Çıplak kart (IPC-6012) ve montaj (IPC-A-610 / J-STD-001) için aynı sınıfı** belirtin.
3. **Yer varsa Seviye A veya B kullanın;** Seviye C’yi yalnızca yoğunluğun zorladığı özelliklerde (ör. BGA altı) seçin.
4. **Üreticinin bu sınıf ve seviyeyi yapabildiğini** kabiliyet tablosundan doğrulayın.

## Örnek: endüstriyel bir sensör kartı

24 V ile beslenen, pano içinde çalışacak bir sensör için 4 katmanlı, 1,6 mm bir kart. Beklenen ömür on yıl; arıza can sıkıcı ama tehlikeli değil. Bu **Sınıf 2** tarifidir. Kart yoğun değil, via ve padler için **Seviye B** yeterli.

[[calc:padstack?lv=B|Seviye B via hesabını aç]]

0,3 mm bitmiş delikli via için dışta en az **0,725 mm**, içte **0,775 mm** pad gerekir. Tahmini matkap 0,4 mm, en-boy oranı **4,0 : 1**; IPC-2221’in tercih ettiği 5:1’in rahatça altında. Üretim çizimine "IPC-6012 Sınıf 2’ye göre üretilecek, IPC-A-600 Sınıf 2’ye göre kabul edilecektir", montaj siparişine "IPC-A-610 Sınıf 2" yazılır.

## Üretim çizimine neler yazılır?

- Dış hat, ölçüler ve toleranslar; bitmiş kart kalınlığı ve toleransı.
- Katman yığını: katman sırası, bakır ağırlıkları, dielektrik kalınlıkları, malzeme (IPC-4101 slash sheet numarası veya laminat adı, Tg).
- Performans sınıfı ve kabul: IPC-6012 Sınıf X, IPC-A-600.
- Delik tablosu: bitmiş çaplar, kaplamalı/kaplamasız, toleranslar.
- Yüzey kaplaması (ENIG, kurşunsuz HASL, OSP…), lehim maskesi ve serigrafi renkleri.
- Kontrollü empedans: hedef, tolerans, katman, referans düzlem.
- Via işlemi (açık, örtülü, tıkalı, dolgulu; IPC-4761 tipi), elektriksel test (IPC-D-356’ya göre %100) ve işaretlemeler.

## Sık yapılan hatalar

- Footprint’i veri sayfasıyla karşılaştırmamak; alttan görünüşü üstten sanmak.
- Sınıfı çizime yazmamak. Üretici bu durumda kendi varsayılanına göre üretir; bu sizin beklediğiniz olmayabilir.
- "Garanti olsun" diye Sınıf 3 istemek: maliyet ve teslim süresi artar.
- IPC-7351 yoğunluk seviyeleriyle IPC-2221 üretilebilirlik seviyelerini karıştırmak.
- Yalnızca Gerber göndermek; delik dosyası, çizim ve katman yığını olmadan üretici tahmin yürütür.

> [!QUIZ] Yıllarca çalışması gereken ama kısa bir kesintinin tehlike yaratmadığı bir endüstriyel kontrol kartı hangi sınıftır?
> Sınıf 2. Uzun ömür ve sürekli çalışma beklenir ama kesinti kritik değildir. Sınıf 3, kesintinin kabul edilemediği havacılık ve yaşam desteği gibi uygulamalar içindir.

> [!QUIZ] Sınıf 3 bir kart otomatik olarak Seviye C ile mi tasarlanmalıdır?
> Hayır. Sınıf bitmiş kartın kabul kriterlerini, seviye ise özelliklerin üretim zorluğunu belirler; ikisi bağımsızdır. Yüksek güvenilirlikli bir kartta mümkün olan her yerde Seviye A veya B kullanmak verimi artırır.

> [!QUIZ] Bir lehim bağlantısının kabulüne hangi belgeyle bakılır? Çıplak kartın delik kaplama kalınlığına hangisiyle?
> Lehim bağlantısı için IPC-A-610 (süreç gereksinimleri J-STD-001’de). Delik kaplama kalınlığı çıplak kart kabul kriteridir: IPC-6012.

## Kontrol listesi

- Gereksinimler yazılı, sınıf bunlara göre seçildi.
- Footprint’ler veri sayfalarıyla kontrol edildi.
- Katman yığını, sınıf ve yüzey kaplaması iz çiziminden önce üreticiyle netleştirildi.
- ERC ve DRC temiz, tasarım bir başkası tarafından incelendi.
- Üretim çiziminde sınıf, malzeme, kalınlık, kaplama, delik tablosu ve test şartı var.
`,
    en: `
## Why it matters

A printed circuit board moves through a chain of steps from the schematic to a tested assembly, and each step hands data to the next. A mistake made early (a wrong footprint, a stack-up nobody checked with the fabricator) becomes more expensive at every step after it. Your fabricator and assembler also work to the IPC standards; you don’t need to memorise them, but you should know which document answers which question.

## The design flow

1. **Requirements:** function, interfaces, power, environment (temperature, humidity, vibration), expected life and cost. These decide the board class.
2. **Schematic:** draw the circuit, choose real part numbers, run the **ERC** (electrical rule check).
3. **Library:** every part needs a footprint that matches its datasheet exactly. Build surface-mount land patterns to **IPC-7351**; check pin 1 and the pin numbering against the datasheet.
4. **Board outline and stack-up:** outline, mounting holes, connector positions and the layer structure. Settle the stack-up with your fabricator ([[lesson:stackup|stack-up lesson]]).
5. **Placement:** connectors and mechanically fixed parts first, then power stages, clocks, high-speed parts and sensitive analog.
6. **Routing:** critical nets first, then the rest. Enter the design rules before you start, based on the fabricator’s capabilities and the [[lesson:spacing|voltage spacing]] you need.
7. **Checks:** the **DRC** (design rule check) and a review by another engineer.
8. **Fabrication outputs:** Gerber (preferably X2), ODB++ or IPC-2581; drill files, IPC-D-356 netlist, fab drawing, stack-up. For assembly: BOM, pick-and-place file and assembly drawing.
9. **Fabrication, assembly and test:** the fabricator’s DFM check and bare-board electrical test; placement, reflow and inspection (AOI, X-ray); in-circuit and functional test. What you learn feeds the next revision.

> [!TIP] Agree the stack-up, the board class and the surface finish with your fabricator **before routing**. Changing them after layout means re-checking impedance, spacing and pads.

## A map of the IPC documents

| Document | What it answers |
|---|---|
| IPC-2221 | Generic design rules: spacing by voltage (Table 6-1), annular ring, fabrication allowance, producibility levels |
| IPC-2222 | Extra rules for rigid organic boards, e.g. lead-to-hole clearance |
| IPC-2152 | Current-carrying capacity of conductors, e.g. power trace widths |
| IPC-7351 | Surface-mount land patterns: from package dimensions to pad sizes |
| IPC-4101 | Laminate and prepreg specifications (by "slash sheet" number) |
| IPC-6012 | Qualification and performance of rigid bare boards: what is measured for acceptance |
| IPC-A-600 | Pictures of acceptable and rejectable bare-board conditions |
| IPC-A-610 | Acceptability of electronic assemblies: solder joints, part position |
| J-STD-001 | Requirements for soldered assemblies: materials, process, soldering |

> [!NOTE] The documents work in pairs. IPC-6012 says **what is measured** and the limits; IPC-A-600 shows **what it looks like**. In the same way, J-STD-001 is the process requirement and IPC-A-610 the visual acceptance document.

Choosing trace width with IPC-2152 is covered in the [[lesson:trace-current|current-carrying traces lesson]].

## Classes 1, 2 and 3

The class describes how reliable the finished product must be. It is defined in IPC-6011/6012, and the assembly standards (IPC-A-610, J-STD-001) use the same classes.

| Class | Meaning | Typical products |
|---|---|---|
| 1 | General electronics: basic function is enough | Toys, simple consumer goods |
| 2 | Dedicated service: long life wanted, interruption not critical | Industrial controls, telecom |
| 3 | High reliability: no downtime tolerated | Aerospace, life support, defence |

The class changes measurable acceptance criteria. Examples from IPC-6012:

- **Hole copper plating:** 20 µm average (Class 1–2), 25 µm (Class 3).
- **Annular ring:** Class 1 accepts 180° and Class 2 90° hole breakout (Class 2 internal only with teardrops/fillets); Class 3 requires at least 0.050 mm external and 0.025 mm internal.
- **Conductor width reduction** (isolated defects): up to 30 % in Class 1, 20 % in Class 2–3.

[[calc:ipcref?c=2|Highlight Class 2 in the IPC rules]] [[calc:ipcref?c=3|Compare with Class 3]]

A higher class means more inspection and a tighter process; price and lead time go up.

## Producibility levels A, B and C

There is a second axis, **independent** of class. IPC-2221 describes how hard a feature is to build with three levels: **A** general (easiest), **B** moderate, **C** high precision. The level sets values such as the land fabrication allowance (A 0.4 / B 0.25 / C 0.2 mm) and hole position tolerance. A Class 3 board can be designed at Level A, and a Class 1 phone board at Level C.

For a 0.3 mm finished-hole via in a 1.6 mm board, the padstack calculator gives these minimum pad diameters (external / internal): **Level A** 0.875 / 0.925 mm, **Level B** 0.725 / 0.775 mm, **Level C** 0.675 / 0.725 mm.

[[calc:padstack?lv=A|Open Level A]] [[calc:padstack?lv=C|Open Level C]]

> [!WARN] Don’t confuse these with the IPC-7351 density levels. IPC-7351 also uses A/B/C, but there they describe how far the pads extend beyond the package (A most, B nominal, C least). Same letters, different meanings.

## How to choose

1. **Start from the end use and the customer contract.** Most commercial and industrial products are Class 2; choose Class 3 only when the product really needs it.
2. **Specify the same class** for the bare board (IPC-6012) and the assembly (IPC-A-610 / J-STD-001).
3. **Use Level A or B where there is room;** choose Level C only for features where density forces it (e.g. under a BGA).
4. **Confirm the fabricator can build that class and level** from its capability sheet.

## Example: an industrial sensor board

A 4-layer, 1.6 mm board for a sensor powered from 24 V, mounted in a control cabinet. Expected life is ten years; a failure is annoying but not dangerous. That is the description of **Class 2**. The board is not dense, so **Level B** is enough for vias and pads.

[[calc:padstack?lv=B|Open the Level B via calculation]]

A 0.3 mm finished-hole via needs at least a **0.725 mm** pad outside and **0.775 mm** inside. The estimated drill is 0.4 mm and the aspect ratio **4.0 : 1**, comfortably below the 5:1 that IPC-2221 prefers. The fab drawing says "Fabricate per IPC-6012 Class 2, accept per IPC-A-600 Class 2", and the assembly order says "IPC-A-610 Class 2".

## What goes on the fab drawing

- Outline, dimensions and tolerances; finished board thickness and tolerance.
- Stack-up: layer order, copper weights, dielectric thicknesses, material (IPC-4101 slash sheet number or laminate name, Tg).
- Performance class and acceptance: IPC-6012 Class X, IPC-A-600.
- Drill table: finished sizes, plated/non-plated, tolerances.
- Surface finish (ENIG, lead-free HASL, OSP…), solder mask and silkscreen colours.
- Controlled impedance: target, tolerance, layer, reference plane.
- Via treatment (open, tented, plugged, filled; IPC-4761 type), electrical test (100 % against IPC-D-356) and markings.

## Common mistakes

- Not checking footprints against the datasheet; reading a bottom view as a top view.
- Leaving the class off the drawing. The fabricator then builds to its own default, which may not be what you expected.
- Asking for Class 3 "just to be safe": cost and lead time rise.
- Mixing up the IPC-7351 density levels with the IPC-2221 producibility levels.
- Sending only Gerbers; without drill files, a drawing and the stack-up, the fabricator has to guess.

> [!QUIZ] An industrial control board must run for years, but a short outage is not dangerous. Which class is it?
> Class 2. Long life and continued performance are wanted, but interruption is not critical. Class 3 is for applications where downtime is unacceptable, such as aerospace or life support.

> [!QUIZ] Must a Class 3 board automatically be designed at Level C?
> No. The class sets the acceptance criteria of the finished board; the level sets how hard the features are to build. They are independent. On a high-reliability board, using Level A or B wherever possible improves yield.

> [!QUIZ] Which document tells you whether a solder joint is acceptable? Which one covers the plating thickness in the holes of a bare board?
> For the solder joint, IPC-A-610 (with the process requirements in J-STD-001). Hole plating thickness is a bare-board acceptance criterion: IPC-6012.

## Checklist

- Requirements are written down and the class follows from them.
- Footprints are checked against the datasheets.
- Stack-up, class and surface finish are settled with the fabricator before routing.
- ERC and DRC are clean, and someone else has reviewed the design.
- The fab drawing states class, material, thickness, finish, drill table and test requirement.
`,
  },
};
