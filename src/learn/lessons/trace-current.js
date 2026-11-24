export default {
  body: {
    tr: `
## Neden önemli?

Her iz küçük bir dirençtir. İçinden akım geçtiğinde **I²·R** kadar güç ısıya dönüşür ve iz ortamdan daha sıcak olur. Fazla ısınan iz kartın reçinesini yaşlandırır, lehim bağlantılarını zorlar ve en kötü durumda kartı yakar. Isınma sorun olmasa bile iz üzerindeki **gerilim düşümü** besleme hattını yük tarafında beklenenden düşük bırakabilir.

Bu yüzden akım taşıyan her iz için iki soruyu cevaplarız:

1. İz bu akımda kaç derece ısınır (**ΔT**)?
2. İz boyunca ne kadar gerilim kaybolur?

## Isınmayı ne belirler?

- **Kesit alanı** (genişlik × bakır kalınlığı): alan büyüdükçe direnç ve ısınma azalır.
- **Isının nereye gidebildiği**: yakındaki bakır düzlemler, kart kalınlığı ve hava akışı ısıyı uzaklaştırır.
- **Akımın kendisi**: ısınma akımın karesiyle artar; akımı iki katına çıkarmak gereken alanı ikiden fazla artırır.

> [!NOTE] "1 oz bakır", bir fit kareye (≈ 0,093 m²) yayılan 1 ons (28,35 g) bakırdır; kalınlığı yaklaşık **35 µm** (1,378 mil) eder. En yaygın kalınlıklar ½ oz (≈ 17 µm), 1 oz ve 2 oz’dur.

## Hangi standardı kullanmalı?

| | IPC-2221 | IPC-2152 |
|---|---|---|
| Veri | 1956 tarihli NBS ölçümleri | 2009, yeni ve kontrollü ölçümler |
| İç katman | Dış katmanın yarısı kadar akım (çok muhafazakâr) | İç ve dış katman için aynı temel grafik |
| Düzlem etkisi | Yok | Düzeltme katsayısıyla hesaba katılır |
| Ne zaman? | Hızlı kaba tahmin, eski tasarımlarla uyum | Yeni tasarımlar için önerilen |

> [!TIP] Yeni bir tasarımda **IPC-2152** ile başlayın. Hesaplayıcı aynı akım için IPC-2221 sonuçlarını da yan yana gösterir; farkı görmek iyi bir öğrenme aracıdır.

## Adım adım iz genişliği seçimi

1. **Akımı belirleyin.** Sürekli akım için ortalama değil RMS değeri kullanın. Kısa darbeler için tepe akımla değil, ısıl olarak eşdeğer RMS ile hesaplayın.
2. **Bir pay ekleyin.** Yük tahminleri genellikle iyimserdir; hesaplayıcıdaki "akım tasarım payı" alanına %10–30 girin.
3. **İzin verilen sıcaklık artışını seçin.** Genel tasarımlarda **10–20 °C** yaygındır. Kural: ortam sıcaklığı + ΔT, kart malzemesinin sürekli çalışma sıcaklığının (çoğu FR-4 için 105–130 °C) rahatça altında kalmalı.
4. **Bakır kalınlığını girin.** Dış katmanda kaplama bakırı artırır; muhafazakâr kalmak için folyo kalınlığını kullanın.
5. **Hesaplayın** ve sonucu üreticinizin minimum iz genişliğiyle karşılaştırın.
6. **Gerilim düşümünü kontrol edin.** İz uzunluğunu girip mV cinsinden düşümü besleme toleransınızla karşılaştırın.

## Örnek: 3 A’lik besleme hattı

1,6 mm FR-4 kartın dış katmanında, 1 oz bakırla, 100 mm uzunluğunda bir hattan 3 A geçecek. 20 °C ısınmaya izin veriyoruz.

[[calc:trace?I=3&dT=20&L=100|Örneği hesaplayıcıda aç]]

- IPC-2152, düzlem yokken yaklaşık **1,07 mm** genişlik verir.
- Aynı izin 0,2 mm altında kesintisiz bir GND düzlemi varsa gereken genişlik yaklaşık **0,46 mm**’ye iner. Düzlem ısıyı yayar.

[[calc:trace?I=3&dT=20&pl=yes&pd=0.2&L=100|Düzlemli durumu aç]]

Şimdi gerilim düşümüne bakın: 1,07 mm genişlikte 100 mm’lik iz yaklaşık **50 mΩ** dirençtir ve 3 A’de **~150 mV** düşüm yaratır. 3,3 V’luk bir hat için bu yaklaşık %4,6 eder, çoğu regülatör toleransının üzerindedir. **Bu tasarımda sınırlayan ısınma değil gerilim düşümüdür**: izi genişletmek, bakır döküm (pour) kullanmak veya regülatörü yüke yaklaştırmak gerekir.

> [!RULE] Isınma için yeterli olan iz, gerilim düşümü için yetersiz olabilir. Her güç hattında ikisini de kontrol edin.

## Dar boğazlara dikkat

Hesaplanan genişlik yalnızca izin geniş kısmı için geçerlidir. Akım şu noktalarda daralır:

- **Konnektör ve bileşen padleri**: geniş iz, küçük bir pada inceltilerek bağlanırsa en sıcak nokta orası olur.
- **Termal rölyef (spoke) bağlantıları**: bakır dökümü pada ince kollarla bağlar; yüksek akımlı padlerde kolları genişletin veya doğrudan bağlantı kullanın.
- **Katman değişimleri**: tek bir via, geniş bir izin akımını taşıyamayabilir. Via sayısını [[calc:via?I=3|via hesaplayıcısıyla]] belirleyin.

## Sık yapılan hatalar

- IPC-2221 iç katman eğrisini kullanıp gereksiz geniş izler çizmek.
- Paralel giden yüksek akımlı izlerin birbirini ısıttığını unutmak. IPC-2152’ye göre 25 mm’den yakın izler birlikte değerlendirilmelidir.
- Arıza durumunu düşünmemek. Kısa devrede iz, sigorta açılmadan önce eriyebilir; [[lesson:vias|via dersi]] ve [[calc:fusing?w=1.07|eritme akımı hesaplayıcısı]] bu konuya bakar.

> [!QUIZ] Aynı akım ve ΔT için IPC-2221 iç katman sonucu neden IPC-2152 sonucundan çok daha geniştir?
> IPC-2221’in iç katman eğrisi aslında serbest havadaki iletken ölçümlerinden türetilmiş ve dış katmanın yarısı kadar akım varsayar. Gerçekte iç katman izinin çevresindeki laminat ve düzlemler ısıyı iletir; IPC-2152 ölçümleri iç katman izlerinin en az dış katman kadar iyi soğuduğunu gösterir.

> [!QUIZ] 2 A taşıyan bir izin akımı 4 A’e çıkarsa gereken kesit alanı yaklaşık ne kadar artar?
> İki kattan fazla. IPC-2221’de alan akımın yaklaşık 1,38’inci kuvvetiyle (2^1,38 ≈ 2,6 kat), IPC-2152 temel grafiğinde yaklaşık 1,7–1,8’inci kuvvetiyle büyür.

## Kontrol listesi

- RMS akım ve tasarım payı belirlendi.
- ΔT, malzemenin çalışma sıcaklığına göre seçildi.
- Genişlik üreticinin minimumunun üzerinde.
- Gerilim düşümü besleme toleransının içinde.
- Padler, termal rölyefler ve vialar dar boğaz oluşturmuyor.
`,
    en: `
## Why it matters

Every trace is a small resistor. Current through it turns **I²·R** of power into heat, and the trace runs hotter than its surroundings. An overheated trace ages the board resin, stresses solder joints and, at worst, burns the board. Even when heating is fine, the **voltage drop** along the trace can leave the load with less supply voltage than expected.

So for every current-carrying trace we answer two questions:

1. How much does the trace heat up at this current (**ΔT**)?
2. How much voltage is lost along it?

## What sets the temperature rise?

- **Cross-section** (width × copper thickness): more area means less resistance and less heating.
- **Where the heat can go**: nearby copper planes, board thickness and airflow carry heat away.
- **The current itself**: heating rises with the square of current; doubling the current more than doubles the area you need.

> [!NOTE] "1 oz copper" is one ounce (28.35 g) of copper spread over one square foot (≈ 0.093 m²), about **35 µm** (1.378 mil) thick. The most common weights are ½ oz (≈ 17 µm), 1 oz and 2 oz.

## Which standard should you use?

| | IPC-2221 | IPC-2152 |
|---|---|---|
| Data | 1956 NBS measurements | 2009, newer controlled measurements |
| Internal layers | Half the current of external (very conservative) | Same baseline chart for internal and external |
| Effect of planes | None | Included through a modifier |
| When? | Quick rough estimate, consistency with old designs | Recommended for new designs |

> [!TIP] Start new designs with **IPC-2152**. The calculator also shows the IPC-2221 results for the same current side by side; seeing the difference is a good way to learn.

## Choosing a trace width step by step

1. **Determine the current.** For continuous current use the RMS value, not the average. For short pulses, size for the thermally equivalent RMS, not the peak.
2. **Add margin.** Load estimates are usually optimistic; enter 10–30 % in the calculator's "current design margin".
3. **Pick the allowed temperature rise.** **10–20 °C** is common for general designs. Rule: ambient + ΔT must stay well below the laminate's continuous operating temperature (105–130 °C for most FR-4).
4. **Enter the copper thickness.** Plating adds copper on outer layers; use the foil thickness to stay conservative.
5. **Calculate** and compare the result with your fabricator's minimum trace width.
6. **Check the voltage drop.** Enter the trace length and compare the drop in mV with your supply tolerance.

## Example: a 3 A supply line

A 100 mm line on the outer layer of a 1.6 mm FR-4 board, 1 oz copper, carries 3 A. We allow 20 °C of heating.

[[calc:trace?I=3&dT=20&L=100|Open the example in the calculator]]

- With no plane, IPC-2152 gives about **1.07 mm**.
- With a solid GND plane 0.2 mm below the same trace, the required width drops to about **0.46 mm**. The plane spreads the heat.

[[calc:trace?I=3&dT=20&pl=yes&pd=0.2&L=100|Open the case with a plane]]

Now look at the voltage drop: 100 mm of 1.07 mm trace is about **50 mΩ**, which drops **~150 mV** at 3 A. On a 3.3 V rail that is about 4.6 %, beyond most regulator tolerances. **Here the limit is the voltage drop, not the heating**: widen the trace, use a copper pour, or move the regulator closer to the load.

> [!RULE] A trace that is wide enough for heating can still be too narrow for voltage drop. Check both on every power line.

## Watch the bottlenecks

The calculated width only applies to the wide part of the trace. Current squeezes through:

- **Connector and component pads**: if a wide trace necks down into a small pad, that is the hottest spot.
- **Thermal-relief (spoke) connections**: pours connect to pads through thin spokes; widen them or use a direct connection on high-current pads.
- **Layer changes**: a single via may not carry a wide trace's current. Size the via count with the [[calc:via?I=3|via calculator]].

## Common mistakes

- Using the IPC-2221 internal curve and drawing needlessly wide traces.
- Forgetting that parallel high-current traces heat each other. Per IPC-2152, traces closer than 25 mm should be evaluated together.
- Ignoring the fault case. During a short circuit a trace can melt before the fuse opens; see the [[lesson:vias|via lesson]] and the [[calc:fusing?w=1.07|fusing current calculator]].

> [!QUIZ] Why is the IPC-2221 internal-layer result so much wider than IPC-2152 for the same current and ΔT?
> The IPC-2221 internal curve was actually derived from conductors in free air and assumes half the current of an external trace. In reality the laminate and planes around an internal trace conduct heat away; IPC-2152 measurements show internal traces cool at least as well as external ones.

> [!QUIZ] If the current in a 2 A trace rises to 4 A, roughly how much more cross-section is needed?
> More than double. With IPC-2221 the area grows with about the 1.38th power of current (2^1.38 ≈ 2.6×); on the IPC-2152 baseline chart with about the 1.7–1.8th power.

## Checklist

- RMS current and design margin defined.
- ΔT chosen against the material's operating temperature.
- Width is above the fabricator's minimum.
- Voltage drop is within the supply tolerance.
- Pads, thermal reliefs and vias do not form bottlenecks.
`,
  },
};
