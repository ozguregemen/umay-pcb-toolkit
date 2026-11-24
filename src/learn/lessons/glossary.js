export default {
  body: {
    tr: `
Bu sözlük, uygulamadaki hesaplayıcılarda ve derslerde sık karşılaşacağınız terimleri konularına göre gruplar. Her grubun içinde terimler alfabetik sıradadır. Pek çok terim Türkçe teknik dilde de İngilizce haliyle kullanıldığı için parantez içinde İngilizce karşılıklarını da veriyoruz.

## Kart yapısı ve malzeme

- **Bakır ağırlığı (oz)**: Bakır kalınlığının "fit kare başına ons" olarak ifadesi. 1 oz yaklaşık 35 µm’dir (IPC-4562 nominal 34,3 µm); ½ oz ≈ 17 µm, 2 oz ≈ 69 µm. Dış katmanlarda kaplama bu kalınlığa eklenir. Bkz. [[lesson:trace-current|Akım taşıyan izler]].
- **CAF (iletken anodik filaman)**: Nem ve gerilim altında bakırın cam elyafları boyunca ilerleyip iki iletken, çoğunlukla iki delik arasında iletken bir yol oluşturması. Zamanla kaçak akıma ve kısa devreye yol açar; CAF dirençli laminat ve yeterli delik aralığı riski azaltır.
- **Çekirdek (core)**: İki yüzü bakır folyolu, tamamen kürlenmiş cam elyaf–reçine levha. Kalınlığı preste değişmediği için empedans hesabında güvenilir bir boyuttur.
- **Dönüş yolu (return path)**: Sinyal akımının kaynağa geri döndüğü yol. Yüksek frekansta dönüş akımı izin hemen altındaki referans düzlemden akar; düzlemdeki bir yarık bu yolu uzatır, endüktansı ve yayılımı artırır. Bkz. [[lesson:stackup|Katman yığını]].
- **Katman yığını (stack-up)**: Bakır ve dielektrik katmanların sırası, kalınlıkları ve malzemeleri. Empedansı, sinyal katmanlarının hangi düzleme referans aldığını ve kartın toplam kalınlığını belirler. [[calc:impedance|Empedans hesaplayıcısı]]
- **Prepreg**: Kısmen kürlenmiş reçineyle emprenye edilmiş cam elyaf kumaş. Preste erir ve çekirdekleri, folyoları birbirine yapıştırır; pres sonrası kalınlığı reçine akışına ve çevresindeki bakır yoğunluğuna bağlıdır.
- **Referans düzlem (reference plane)**: Bir sinyal katmanının hemen yanındaki kesintisiz bakır düzlem (GND ya da besleme). Dönüş akımını taşır ve izin empedansını belirler.
- **Tg (cam geçiş sıcaklığı)**: Reçinenin sert, camsı halden yumuşak hale geçtiği sıcaklık. Tg’nin üzerinde Z ekseni genleşmesi hızla artar ve via gövdeleri zorlanır. Standart FR-4 için tipik olarak 130–140 °C, "yüksek Tg" malzemelerde 170 °C ve üzeridir.

## Delik, pad ve via

- **Damla (teardrop)**: İzin pada bağlandığı noktayı kademeli olarak genişleten bakır. Delik kaysa bile bağlantının kopmasını önler; IPC-2221, kırılmaya (breakout) izin verilen tasarımlarda damla ister. Bkz. [[lesson:vias|Via ve pad tasarımı]].
- **En-boy oranı (aspect ratio)**: Kart kalınlığının delik çapına oranı. Kaplamalı deliklerde tercih edilen değer 5:1’in altı, tipik üretim sınırı 8:1–10:1’dir; mikroviada en fazla 1:1. [[calc:via|Via hesaplayıcısı]]
- **Halka (annular ring)**: Delik kenarı ile pad kenarı arasında kalan bakır. IPC-2221 tasarımda en az dış 0,050 mm, iç 0,025 mm ister; üretilmiş kartın kabulü IPC-6012 sınıfına göre değişir. [[calc:padstack|Pad hesaplayıcısı]]
- **Pad içi via (via-in-pad)**: Bileşen padinin içine yerleştirilen via. Lehimin delikten akmaması için doldurulup üzeri bakırla kapatılmalıdır (IPC-4761 Tip VII).

## Standartlar ve üretim

- **DFM (üretilebilirlik için tasarım)**: Kartı üreticinin ve dizgi hattının kabiliyetleri içinde, yüksek verimle üretilebilecek şekilde tasarlamak: en küçük iz ve aralık, delik ve halka, lehim maskesi, panel ve test noktaları gibi. Bkz. [[lesson:dfm|Üretime hazırlık]].
- **E-serisi**: IEC 60063’te tanımlı standart direnç ve kondansatör değerleri. E12 ±%10, E24 ±%5, E96 ±%1 toleransa karşılık gelir; 4,7 kΩ bu yüzden vardır, 5 kΩ yoktur. [[calc:eseries|E-serisi aracı]]
- **Gerber**: Bakır, lehim maskesi ve serigrafi gibi her katmanı iki boyutlu bir görüntü olarak tarif eden standart üretim dosyası (RS-274X; Gerber X2 bu formata katman işlevi gibi öznitelikler ekler). Delikler çoğunlukla ayrı bir Excellon dosyasıyla verilir.
- **IPC sınıfı (IPC class)**: IPC-6011/6012’deki ürün sınıfı; üretilmiş kartın kabul kriterlerini belirler. Sınıf 1 genel ürünler, Sınıf 2 özel hizmet ürünleri (endüstriyel, haberleşme), Sınıf 3 yüksek güvenilirlik (havacılık, tıbbi yaşam desteği). [[calc:ipcref|IPC kuralları]]
- **Üretilebilirlik seviyesi (producibility level)**: IPC-2221/2222’deki A (genel), B (orta) ve C (yüksek hassasiyet) seviyeleri. Üretim paylarını belirler ve IPC sınıfından bağımsızdır; seviye yükseldikçe pay küçülür, maliyet artar.

## Akım, ısı ve güvenlik

- **Clearance (hava aralığı)**: İki iletken arasında hava içinden ölçülen en kısa mesafe; ark ve delinmeye karşı korur. Bkz. [[lesson:spacing|Gerilim, aralık ve güvenlik]]. [[calc:spacing|Aralık hesaplayıcısı]]
- **Creepage (yüzey aralığı)**: İki iletken arasında yalıtkan yüzey boyunca ölçülen en kısa yol; kir ve nemle oluşan yüzey kaçağına karşı korur. Yüzeye açılan bir yarık creepage’i uzatır. Şebeke bağlantılı devrelerde IEC 62368-1 / IEC 60664-1 değerleri esas alınır.
- **Eritme akımı (fusing current)**: Bir iletkeni belirli bir sürede eriten akım. Kısa süreler için Onderdonk (adyabatik), sürekli durum için Preece denklemi kullanılır. [[calc:fusing|Eritme akımı hesaplayıcısı]]
- **I²t**: Akımın karesinin zamana göre integrali (A²s); kısa bir darbede iletkene verilen ısı enerjisinin ölçüsüdür. Sigortanın açma I²t değeri, korunan iletkenin erime I²t değerinden belirgin biçimde küçük olmalıdır.
- **Tj (bağlantı sıcaklığı)**: Yarı iletken yongadaki en sıcak noktanın sıcaklığı; Tj = Ta + P · θ ile hesaplanır. Tasarımda mutlak en yüksek değerin altında bir sınır kullanılır. Bkz. [[lesson:thermal|Termal tasarım]].
- **ΔT (sıcaklık artışı)**: Bir iletkenin ortam sıcaklığının üzerine ne kadar çıktığı. İz genişliği hesabında izin verilen ΔT seçilir; 10–20 °C yaygındır. [[calc:trace|İz genişliği hesaplayıcısı]]
- **θJA (bağlantı–ortam ısıl direnci)**: Bağlantıdan çevre havasına kadar olan ısıl direnç (°C/W). Veri sayfası değeri JEDEC test kartında ölçülür; gerçek değer kart düzenine çok bağlıdır. [[calc:thermal|Termal hesaplayıcı]]

## Empedans ve iletim hatları

- **Df / tan δ (kayıp faktörü)**: Dielektrikte ısıya dönüşen enerjinin ölçüsü; yüksek frekanstaki dielektrik kaybını belirler. Standart FR-4 için yaklaşık 0,02’dir, düşük kayıplı laminatlarda çok daha küçüktür.
- **Microstrip**: Dış katmanda, altında bir referans düzlem bulunan iz. Elektrik alanın bir kısmı havada olduğu için sinyal stripline’dan hızlı ilerler, ama dışarıya daha fazla yayar ve karışmaya daha açıktır.
- **Stripline**: İki referans düzlem arasında kalan iç katman izi. Alan tamamen dielektrik içindedir; iyi ekranlanır, daha az yayar ve daha az karışma yapar, ama sinyal daha yavaş ilerler.
- **Z₀ (karakteristik empedans)**: İletim hattında ilerleyen dalganın gerilim/akım oranı. İz genişliği, dielektrik kalınlığı ve εr belirler; tek uçlu hatlar için 50 Ω yaygındır. [[calc:impedance|Empedans hesaplayıcısı]]
- **Zdiff (diferansiyel empedans)**: Bir diferansiyel çiftin iki hattı arasında görülen empedans. Yaygın değerler 90 Ω (USB) ve 100 Ω’dur (Ethernet, LVDS). Bkz. [[lesson:impedance|Kontrollü empedans]].
- **εeff (etkin dielektrik sabiti)**: Dalganın "gördüğü" ortalama dielektrik sabiti. Stripline’da εr’ye eşittir; microstrip’te alanın bir kısmı havada olduğundan 1 ile εr arasındadır (FR-4 microstrip için yaklaşık 3,0–3,4). Yayılma hızı c / √εeff’tir.
- **εr / Dk (dielektrik sabiti)**: Yalıtkanın bağıl geçirgenliği; empedansı ve sinyal hızını belirler. FR-4 için reçine oranına ve frekansa göre yaklaşık 4–4,7 arasındadır.

## Sinyal bütünlüğü

- **Diz frekansı (knee frequency)**: Dijital bir kenarın enerjisinin büyük kısmının altında kaldığı frekans: yaklaşık 0,5 / tr (H. Johnson). Saat frekansı değil, kenar süresi belirler. [[calc:signal|Sinyal hesaplayıcısı]]
- **Karışma (crosstalk), NEXT**: Bir hattaki sinyalin (saldırgan) komşu hatta (kurban) elektrik ve manyetik kuplajla gürültü oluşturması. NEXT sürücü tarafında, FEXT uzak uçta görülen karışmadır. Hatlar arası aralık, referans düzleme olan yüksekliğe göre büyüdükçe karışma hızla azalır. [[calc:crosstalk|Karışma hesaplayıcısı]]
- **Kritik uzunluk (critical length)**: Bir izin artık iletim hattı gibi ele alınması gereken uzunluk. Kenarın iz üzerinde kapladığı uzunluk lr = tr · v’dir; bu uygulamada lr / 6’dan kısa izler toplu eleman sayılır, lr / 2’den uzun izlerde yansımalar önem kazanır. [[calc:signal|Sinyal hesaplayıcısı]]
- **Skew**: Birlikte varması gereken sinyallerin (diferansiyel çift, paralel veri yolu) varış süreleri arasındaki fark. Çoğunlukla uzunluk farkından doğar: skew = ΔL · tpd (birim uzunluk başına gecikme).
- **Sonlandırma (termination)**: Yansımaları önlemek için hattın kaynağını ya da ucunu Z₀’a uyduran direnç(ler). Kaynağa seri direnç (seri sonlandırma) ve hat ucunda paralel direnç en yaygın yöntemlerdir. Bkz. [[lesson:signal-integrity|Sinyal bütünlüğü]].
- **Yükselme süresi (rise time, tr)**: Bir kenarın genellikle %10’dan %90’a (bazen %20’den %80’e) çıkma süresi. Sinyalin frekans içeriğini belirler; bant genişliği yaklaşık 0,35 / tr’dir.

## Güç dağıtımı

- **Dekuplaj (decoupling)**: Entegrenin anlık akım ihtiyacını yakından karşılayan ve besleme gürültüsünü bastıran kondansatörler. Etkinlikleri değerlerinden çok montaj döngüsünün endüktansına bağlıdır. Bkz. [[lesson:pdn|Güç dağıtımı ve dekuplaj]].
- **ESL (eşdeğer seri endüktans)**: Kondansatörün kılıfından, padlerinden ve vialarından gelen endüktans. SRF’nin üzerinde empedansı belirler; küçük kılıf ve kısa via bağlantısı ESL’yi düşürür.
- **ESR (eşdeğer seri direnç)**: Kondansatörün iç kayıplarını temsil eden seri direnç. SRF’deki en düşük empedansı belirler ve rezonansları sönümler.
- **Hedef empedans (target impedance)**: Besleme dağıtım ağının ilgili frekans aralığında altında kalması gereken empedans: Z = V · dalgalanma / ΔI. Örneğin 1,0 V, %3 dalgalanma ve 2,5 A’lik akım değişimi 12 mΩ verir. [[calc:pdn?V=1&rp=3&I=5&st=50|PDN hesaplayıcısı]]
- **SRF (öz rezonans frekansı)**: Kondansatörün kapasitansı ile ESL’sinin rezonansa girdiği frekans: f = 1 / (2π · √(ESL · C)). Bu frekansın üzerinde kondansatör bir bobin gibi davranır.
`,
    en: `
This glossary groups the terms you will meet most often in the app’s calculators and lessons by topic. Within each group the terms are in alphabetical order, and each entry links to the calculator or lesson where it matters.

## Board construction and materials

- **CAF (conductive anodic filament)**: Copper migrating along the glass fibres under humidity and voltage until it forms a conductive path between two conductors, usually two holes. Over time it causes leakage and shorts; CAF-resistant laminate and enough hole-to-hole spacing reduce the risk.
- **Copper weight (oz)**: Copper thickness expressed as ounces per square foot. 1 oz is about 35 µm (IPC-4562 nominal 34.3 µm); ½ oz ≈ 17 µm, 2 oz ≈ 69 µm. On outer layers, plating adds to this. See [[lesson:trace-current|Current-carrying traces]].
- **Core**: A fully cured glass–resin sheet with copper foil on both sides. Its thickness does not change in lamination, so it is a reliable dimension for impedance calculations.
- **Prepreg**: Glass fabric impregnated with partially cured resin. It melts in the press and bonds cores and foils together; its pressed thickness depends on resin flow and the surrounding copper density.
- **Reference plane**: A solid copper plane (GND or power) right next to a signal layer. It carries the return current and sets the trace impedance.
- **Return path**: The path the signal current takes back to its source. At high frequency the return current flows in the reference plane directly under the trace; a slot in the plane lengthens that path and increases inductance and radiation. See [[lesson:stackup|Stack-up]].
- **Stack-up**: The order, thickness and material of the copper and dielectric layers. It sets the impedance, which plane each signal layer references, and the overall board thickness. [[calc:impedance|Impedance calculator]]
- **Tg (glass transition temperature)**: The temperature at which the resin changes from rigid and glassy to soft. Above Tg the Z-axis expansion rises sharply and via barrels are stressed. Typically 130–140 °C for standard FR-4 and 170 °C or more for "high-Tg" materials.

## Holes, pads and vias

- **Annular ring**: The copper left between the hole edge and the pad edge. IPC-2221 asks for at least 0.050 mm external and 0.025 mm internal in design; acceptance of the built board depends on the IPC-6012 class. [[calc:padstack|Pad calculator]]
- **Aspect ratio**: Board thickness divided by hole diameter. For plated holes below 5:1 is preferred and 8:1–10:1 is a typical fabrication limit; microvias are at most 1:1. [[calc:via|Via calculator]]
- **Teardrop**: Copper that gradually widens the point where a trace joins a pad. It keeps the connection intact even if the hole shifts; IPC-2221 asks for teardrops where breakout is allowed. See [[lesson:vias|Via and pad design]].
- **Via-in-pad**: A via placed inside a component pad. It must be filled and plated over (IPC-4761 Type VII) so that solder does not flow into the hole.

## Standards and manufacturing

- **DFM (design for manufacturability)**: Designing the board to stay within the fabricator’s and assembler’s capabilities so it can be built with high yield: minimum trace and space, holes and rings, solder mask, panelisation and test points. See [[lesson:dfm|Getting ready for manufacturing]].
- **E-series**: The standard resistor and capacitor values defined in IEC 60063. E12 goes with ±10 %, E24 with ±5 % and E96 with ±1 % tolerance; that is why 4.7 kΩ exists and 5 kΩ does not. [[calc:eseries|E-series tool]]
- **Gerber**: The standard fabrication file that describes each layer (copper, solder mask, silkscreen) as a 2D image (RS-274X; Gerber X2 adds attributes such as the layer function). Drill data usually comes in a separate Excellon file.
- **IPC class**: The product class of IPC-6011/6012; it sets the acceptance criteria of the built board. Class 1 general products, Class 2 dedicated service products (industrial, telecom), Class 3 high reliability (aerospace, medical life support). [[calc:ipcref|IPC rules]]
- **Producibility level**: Levels A (general), B (moderate) and C (high precision) of IPC-2221/2222. They set the fabrication allowances and are independent of the IPC class; higher levels mean smaller allowances and higher cost.

## Current, heat and safety

- **Clearance**: The shortest distance between two conductors through air; it protects against arcing and breakdown. See [[lesson:spacing|Voltage, spacing and safety]]. [[calc:spacing|Spacing calculator]]
- **Creepage**: The shortest path between two conductors along an insulating surface; it protects against surface leakage from dirt and moisture. A slot in the surface lengthens creepage. For mains-connected circuits the IEC 62368-1 / IEC 60664-1 values apply.
- **Fusing current**: The current that melts a conductor in a given time. The Onderdonk equation is used for short durations (adiabatic) and Preece for steady state. [[calc:fusing|Fusing current calculator]]
- **I²t**: The integral of current squared over time (A²s), a measure of the heat energy delivered to a conductor in a short pulse. A fuse’s clearing I²t must be well below the melting I²t of the conductor it protects.
- **Tj (junction temperature)**: The temperature of the hottest spot on a semiconductor die, calculated as Tj = Ta + P · θ. Designs use a limit below the absolute maximum. See [[lesson:thermal|Thermal design]].
- **ΔT (temperature rise)**: How far a conductor heats above ambient. Trace width calculations start from an allowed ΔT; 10–20 °C is common. [[calc:trace|Trace width calculator]]
- **θJA (junction-to-ambient thermal resistance)**: The thermal resistance from the junction to the surrounding air (°C/W). The datasheet value is measured on a JEDEC test board; the real value depends heavily on the board layout. [[calc:thermal|Thermal calculator]]

## Impedance and transmission lines

- **Df / tan δ (dissipation factor)**: A measure of the energy lost as heat in the dielectric; it sets the dielectric loss at high frequency. About 0.02 for standard FR-4 and much lower for low-loss laminates.
- **Microstrip**: A trace on an outer layer with a reference plane beneath it. Part of the field is in air, so signals travel faster than in stripline, but it radiates more and is more exposed to crosstalk.
- **Stripline**: An inner-layer trace between two reference planes. The field is entirely in the dielectric; it is well shielded, radiates and couples less, but signals travel more slowly.
- **Z₀ (characteristic impedance)**: The voltage-to-current ratio of a wave travelling on a transmission line. It is set by trace width, dielectric thickness and εr; 50 Ω is common for single-ended lines. [[calc:impedance|Impedance calculator]]
- **Zdiff (differential impedance)**: The impedance seen between the two lines of a differential pair. Common values are 90 Ω (USB) and 100 Ω (Ethernet, LVDS). See [[lesson:impedance|Controlled impedance]].
- **εeff (effective dielectric constant)**: The average dielectric constant the wave "sees". In stripline it equals εr; in microstrip part of the field is in air, so it lies between 1 and εr (about 3.0–3.4 for FR-4 microstrip). The propagation velocity is c / √εeff.
- **εr / Dk (dielectric constant)**: The relative permittivity of the insulator; it sets impedance and signal speed. For FR-4 it is roughly 4–4.7, depending on resin content and frequency.

## Signal integrity

- **Critical length**: The length beyond which a trace must be treated as a transmission line. The edge occupies a length lr = tr · v on the trace; in this app traces shorter than lr / 6 are treated as lumped, and above lr / 2 reflections matter. [[calc:signal|Signal calculator]]
- **Crosstalk, NEXT**: Noise coupled from a signal on one line (the aggressor) into a neighbouring line (the victim) through electric and magnetic coupling. NEXT is the crosstalk seen at the driver end, FEXT at the far end. It falls quickly as the spacing grows relative to the height above the reference plane. [[calc:crosstalk|Crosstalk calculator]]
- **Knee frequency**: The frequency below which most of a digital edge’s energy lies: about 0.5 / tr (H. Johnson). It is set by the edge time, not the clock frequency. [[calc:signal|Signal calculator]]
- **Rise time (tr)**: The time an edge takes to go from usually 10 % to 90 % (sometimes 20 % to 80 %). It sets the signal’s frequency content; the bandwidth is about 0.35 / tr.
- **Skew**: The difference in arrival time between signals that should arrive together (a differential pair, a parallel bus). It mostly comes from length mismatch: skew = ΔL · tpd (delay per unit length).
- **Termination**: Resistor(s) that match the source or the end of a line to Z₀ to prevent reflections. A series resistor at the source (series termination) and a parallel resistor at the line end are the most common methods. See [[lesson:signal-integrity|Signal integrity]].

## Power distribution

- **Decoupling**: Capacitors that supply an IC’s instantaneous current from close by and suppress supply noise. How well they work depends more on the inductance of their mounting loop than on their value. See [[lesson:pdn|Power distribution and decoupling]].
- **ESL (equivalent series inductance)**: The inductance from a capacitor’s package, pads and vias. It sets the impedance above the SRF; a small package and short via connections lower the ESL.
- **ESR (equivalent series resistance)**: The series resistance that represents a capacitor’s internal losses. It sets the minimum impedance at the SRF and damps resonances.
- **SRF (self-resonant frequency)**: The frequency at which a capacitor’s capacitance resonates with its ESL: f = 1 / (2π · √(ESL · C)). Above it the capacitor behaves like an inductor.
- **Target impedance**: The impedance the power distribution network must stay below over the relevant frequency range: Z = V · ripple / ΔI. For example 1.0 V, 3 % ripple and a 2.5 A current step give 12 mΩ. [[calc:pdn?V=1&rp=3&I=5&st=50|PDN calculator]]
`,
  },
};
