export default {
  body: {
    tr: `
## Neden önemli?

Farklı gerilimdeki iki iletkenin arasında her zaman bir yalıtım vardır: kartın üstünde hava, içinde laminat ve nemin, kirin biriktiği kart yüzeyi. Aralık yetersizse:

- **Atlama (ark):** hava delinir ve kıvılcım atlar. Hava basıncı düştükçe (yüksek irtifa) bu daha düşük gerilimde olur.
- **Yüzey kaçağı ve tracking:** nem ve kirlilik (flux kalıntısı, toz, tuzlar) yüzeyde iletken bir film oluşturur. Yüksek gerilimde yüzey karbonlaşabilir ve kalıcı bir iletken yol (tracking) oluşur.
- **Elektrokimyasal göç:** DC gerilim ve nem altında metal iyonları göç eder, iletkenler arasında dendrit adı verilen ince metal dallar büyür ve kısa devre olur.
- **CAF (iletken anodik filaman):** laminatın içinde, birbirine yakın ve aralarında gerilim bulunan delikler arasında bakır cam elyafları boyunca ilerler. Delikler arası mesafe ve CAF’a dayanıklı malzeme önemlidir.

## IPC-2221 Tablo 6-1

IPC-2221 en küçük iletken aralığını gerilime ve iletkenin konumuna göre yedi kategoride verir. "B" çıplak kart iletkenleri, "A" montajlı karttaki bileşen bacakları içindir.

| Kategori | Nerede? |
|---|---|
| B1 | İç katman iletkenleri |
| B2 | Dış katman, kaplamasız, deniz seviyesi – 3050 m |
| B3 | Dış katman, kaplamasız, 3050 m üzeri |
| B4 | Dış katman, kalıcı polimer kaplamalı |
| A5 | Dış katman, montaj sonrası konformal kaplamalı |
| A6 | Dış bileşen bacağı/terminali, kaplamasız |
| A7 | Dış bileşen bacağı/terminali, konformal kaplamalı |

Tablodan birkaç satır (mm):

| Gerilim (tepe) | B1 | B2 | B4 | A6 |
|---|---|---|---|---|
| 16–30 V | 0,05 | 0,1 | 0,05 | 0,25 |
| 31–50 V | 0,1 | 0,6 | 0,13 | 0,4 |
| 301–500 V | 0,25 | 2,5 | 0,8 | 1,5 |

Tablonun tamamı hesaplayıcıda görünür. Dış katmanda kaplamasız (B2) aralık **30 V’tan 50 V’a geçerken 0,1 mm’den 0,6 mm’ye** sıçrar; aralık açısından 48 V artık "düşük gerilim" değildir.

## RMS değil, tepe gerilimi

Tablodaki gerilimler iki iletken arasındaki **DC veya AC tepe** gerilimidir. 230 V AC şebeke bir RMS değeridir; tepe değeri 230 × √2 ≈ **325 V**’tur. +%10 şebeke toleransıyla ≈ 358 V olur ve yine 301–500 V satırında kalır. Geçici gerilimleri de unutmayın: bir flyback MOSFET’inin drenindeki tepe gerilim giriş geriliminden çok daha yüksek olabilir.

500 V’un üzerinde tablo doğrusal bir kurala geçer:

\`\`\`
d = d(301–500 V) + c · (V − 500)
\`\`\`

c katsayısı B1 için 0,0025, B2 için 0,005, B3 için 0,025, B4–A7 için 0,00305 mm/V’tur. Örneğin B2’de 600 V için 2,5 + 100 × 0,005 = **3,0 mm** gerekir.

[[calc:spacing?V=600&cat=B2|600 V, B2 örneğini aç]]

## Clearance ve creepage

[[fig:creepage]]

- **Clearance (hava aralığı):** hava içinden en kısa mesafe. Atlamayı belirler; tepe gerilime, geçici aşırı gerilimlere ve irtifaya bağlıdır.
- **Creepage (yüzey kaçak mesafesi):** yalıtkan yüzeyi boyunca en kısa yol. Kaçak akımı ve tracking’i belirler; çalışma geriliminin RMS değerine, kirliliğe ve yalıtkan malzemeye bağlıdır.

Çıplak kartta ikisi çoğu zaman aynıdır; oluklar, parça gövdeleri ve konnektörlerin çevresinde farklılaşırlar. IPC-2221’in tek "aralık" değeri, fonksiyonel amaçlar için ikisini birlikte karşılar.

## Fonksiyonel yalıtım ve güvenlik yalıtımı

- **Fonksiyonel yalıtım** yalnızca devrenin çalışması için gereklidir; ör. aynı düşük gerilim tarafındaki iki net arası veya sigortadan sonra faz–nötr arası. Tablo 6-1 bunun içindir.
- **Temel yalıtım** elektrik çarpmasına karşı temel korumayı, **ek yalıtım** temel yalıtım bozulursa korumayı sağlar. **Çift yalıtım** ikisinin toplamıdır; **güçlendirilmiş yalıtım** çift yalıtıma eşdeğer tek bir yalıtım sistemidir.

Devre şebekeye bağlıysa ve bir kişi düşük gerilim tarafına (USB, metal kutu, konnektör) erişebiliyorsa, aradaki yalıtım bir **güvenlik yalıtımıdır**. Değerleri ürün güvenliği standartlarından gelir: bilgi teknolojisi, ses/görüntü ve haberleşme cihazları için **IEC 62368-1**, yalıtım koordinasyonunun temeli için **IEC 60664-1**. Bu değerler çalışma gerilimine, aşırı gerilim kategorisine, kirlilik derecesine, malzeme grubuna (CTI) ve irtifaya bağlıdır ve genellikle IPC-2221 değerlerinden **çok daha büyüktür**.

> [!WARN] Hesaplayıcı 60 V’un üzerindeki her gerilimde bu uyarıyı gösterir. IPC-2221 sonucunu bir güvenlik mesafesi gibi okumayın; güvenlik yalıtımı için ilgili ürün standardını ve sertifikasyon kuruluşunuzu esas alın.

## Aralığı artırmanın yolları

- **Oluk (slot):** frezelenmiş bir oluk yüzey yolunu böler, creepage etrafından dolanmak zorunda kalır. IEC 60664-1 kirlilik derecesine bağlı bir genişlikten dar olukları hesaba katmaz; çok ince oluğa güvenmeyin. Optokuplör ve transformatörlerin altında, birincil ve ikincil bacaklar arasında yaygındır.
- **Konformal kaplama:** B4/A5/A7 kategorileri çok daha küçük aralığa izin verir (325 V’ta B2 2,5 mm yerine A5 0,8 mm), ama yalnızca kaplama aralığı boşluksuz ve kabarcıksız örtüyor ve ömür boyu sağlam kalıyorsa. Güvenlik standartları kaplamayı yalnızca belirli koşullarda hesaba katar.
- **İç katmanlar:** yalıtkan laminat olduğu için B1 değerleri küçüktür (325 V’ta 0,25 mm). Yüzeye çıkan via ve padleri yine dış katman kurallarıyla kontrol edin.
- **Parça seçimi:** bacak aralığı daha geniş kılıflar seçin veya kullanılmayan bacakları çıkarın.

## İrtifa

Seyrek hava daha düşük gerilimde delinir. IPC-2221, 3050 m’nin üzerinde kaplamasız dış iletkenler için B3’ü kullanır: 325 V’ta B2’nin 2,5 mm’si B3’te **12,5 mm** olur. IEC tabloları da yalnızca belirli bir irtifaya kadar geçerlidir ve üzerinde düzeltme katsayıları uygular.

[[calc:spacing?V=325&cat=B3|325 V, B3 örneğini aç]]

## Örnek: 230 V AC girişli bir kart

24 V ile çalışan bir endüstriyel kartın küçük bir 230 V AC bölümü var: sigorta ve varistörden sonra bir AC/DC modülü.

1. **Sigortadan sonra faz–nötr arası (fonksiyonel):** 325 V tepe, B2: **2,5 mm**.

[[calc:spacing?V=325&cat=B2|325 V, B2 örneğini aç]]

2. **Kart konformal kaplanırsa (A5):** **0,8 mm**; ama yalnızca kaplama tanımlı ve muayene edilen bir süreçse.

[[calc:spacing?V=325&cat=A5|325 V, A5 örneğini aç]]

3. **Düşük gerilim tarafı:** 24 V için B2 0,1 mm’dir ve sınırı çoğu zaman üreticinin en küçük aralığı belirler. Aynı kartta 48 V’luk bir hat varsa **0,6 mm** gerekir.

[[calc:spacing?V=48&cat=B2|48 V, B2 örneğini aç]]

4. **Mevcut bir aralığı kontrol etmek:** dış katmanda 0,5 mm’lik aralık B2’de en fazla **30 V**’a izin verir.

[[calc:spacing?mode=voltage&d=0.5&cat=B2|0,5 mm için izin verilen gerilimi aç]]

5. **230 V tarafı ile dokunulabilir 24 V tarafı arası:** bu IPC-2221’in konusu değil, IEC 62368-1 / IEC 60664-1’e göre bir güvenlik yalıtımıdır. Modülün yalıtım sınıfına ve istediği mesafelere uyun, gerekirse altına oluk açın.

## Sık yapılan hatalar

- Tepe yerine RMS gerilimi girmek.
- 30 V → 50 V sıçramasını unutmak: dış katmanda 48 V için 0,6 mm gerekir.
- Şebeke ile kullanıcı tarafı arasındaki bariyer için IPC-2221 değerlerini kullanmak.
- Tanımlanmamış veya muayene edilmeyen bir kaplamaya güvenmek.
- Bileşen bacaklarını unutmak: A6’da 325 V için 1,5 mm gerekir; bazı küçük SMD kılıfların bacak aralığı buna yetmez.
- Montaj delikleri, vidalar, soğutucular ve metal kutuya olan mesafeyi kontrol etmemek.

> [!QUIZ] 230 V AC şebekede, deniz seviyesinde, kaplamasız dış katmanda faz ile nötr arasında ne kadar aralık gerekir?
> 230 V RMS ≈ 325 V tepe (+%10 toleransla ≈ 358 V), yani 301–500 V satırı. B2 kategorisinde 2,5 mm.

> [!QUIZ] Dış katmanda 24 V için kullandığınız 0,5 mm’lik aralık, yeni tasarımda 48 V taşıyacak. Yeterli mi?
> Hayır. 48 V 31–50 V satırındadır ve B2 için 0,6 mm ister; 0,5 mm en fazla 30 V’a izin verir.

> [!QUIZ] Ürününüzün düşük gerilim tarafında kullanıcının dokunabildiği bir USB konnektörü var. Şebeke ile bu taraf arasındaki mesafe için Tablo 6-1’i kullanabilir misiniz?
> Hayır. Bu bir güvenlik yalıtımıdır (genellikle güçlendirilmiş) ve değerleri IEC 62368-1 / IEC 60664-1 gibi ürün güvenliği standartlarından gelir; genellikle IPC-2221 değerlerinden çok daha büyüktür.

## Kontrol listesi

- Her gerilim bölgesi için tepe ve geçici gerilimler belirlendi.
- Her net çifti için doğru kategori (iç/dış, kaplama, bacak, irtifa) seçildi.
- Fonksiyonel ve güvenlik yalıtımları ayrıldı; güvenlik bariyeri ürün standardına göre boyutlandırıldı.
- Kaplamaya güveniliyorsa kaplama çizimde tanımlı ve muayene ediliyor.
- Aralık kuralları CAD aracına net sınıflarıyla girildi.
`,
    en: `
## Why it matters

Between two conductors at different voltages there is always some insulation: air above the board, laminate inside it, and the board surface, where moisture and dirt collect. When the spacing is too small:

- **Arcing (flashover):** the air breaks down and a spark jumps. At lower air pressure (high altitude) this happens at a lower voltage.
- **Surface leakage and tracking:** moisture and contamination (flux residue, dust, salts) form a conductive film on the surface. At higher voltage the surface can carbonise and form a permanent conductive path (tracking).
- **Electrochemical migration:** under DC bias and humidity, metal ions migrate and grow fine metal branches called dendrites between conductors until they short.
- **CAF (conductive anodic filament):** inside the laminate, copper creeps along the glass fibres between closely spaced, biased holes. Hole-to-hole distance and a CAF-resistant material matter.

## IPC-2221 Table 6-1

IPC-2221 gives the minimum conductor spacing by voltage and by where the conductor is, in seven categories. "B" is for bare-board conductors, "A" for component leads on the assembly.

| Category | Where |
|---|---|
| B1 | Internal conductors |
| B2 | External, uncoated, sea level to 3050 m |
| B3 | External, uncoated, above 3050 m |
| B4 | External, permanent polymer coating |
| A5 | External, conformal coating over the assembly |
| A6 | External component lead/termination, uncoated |
| A7 | External component lead/termination, conformal coated |

A few rows of the table (mm):

| Voltage (peak) | B1 | B2 | B4 | A6 |
|---|---|---|---|---|
| 16–30 V | 0.05 | 0.1 | 0.05 | 0.25 |
| 31–50 V | 0.1 | 0.6 | 0.13 | 0.4 |
| 301–500 V | 0.25 | 2.5 | 0.8 | 1.5 |

The calculator shows the whole table. On an uncoated outer layer (B2) the spacing **jumps from 0.1 mm to 0.6 mm between 30 V and 50 V**; for spacing purposes, 48 V is no longer "low voltage".

## Peak, not RMS

The table voltages are the **DC or AC peak** voltage between the two conductors. 230 V AC mains is an RMS value; its peak is 230 × √2 ≈ **325 V**. With the +10 % mains tolerance this becomes ≈ 358 V, still in the 301–500 V row. Don’t forget transients: the peak at a flyback MOSFET’s drain can be much higher than the input voltage.

Above 500 V the table switches to a linear rule:

\`\`\`
d = d(301–500 V) + c · (V − 500)
\`\`\`

The coefficient c is 0.0025 for B1, 0.005 for B2, 0.025 for B3 and 0.00305 mm/V for B4–A7. For example, B2 at 600 V needs 2.5 + 100 × 0.005 = **3.0 mm**.

[[calc:spacing?V=600&cat=B2|Open the 600 V, B2 example]]

## Clearance and creepage

[[fig:creepage]]

- **Clearance:** the shortest distance through air. It governs flashover and depends on the peak voltage, transient overvoltages and altitude.
- **Creepage:** the shortest path along the surface of the insulation. It governs leakage and tracking and depends on the RMS working voltage, contamination and the insulating material.

On a bare board the two are often the same; they differ around slots, component bodies and connectors. The single "spacing" value of IPC-2221 covers both for functional purposes.

## Functional versus safety insulation

- **Functional insulation** is needed only for the circuit to work, e.g. between two nets on the same low-voltage side, or between line and neutral after the fuse. Table 6-1 is meant for this.
- **Basic insulation** provides basic protection against electric shock; **supplementary insulation** protects if the basic insulation fails. **Double insulation** is the two together; **reinforced insulation** is a single insulation system equivalent to double insulation.

If a circuit is mains-connected and a person can reach the low-voltage side (USB, a metal enclosure, a connector), the insulation in between is **safety insulation**. Its values come from product safety standards: **IEC 62368-1** for IT, audio/video and communication equipment, and **IEC 60664-1** as the basis of insulation coordination. They depend on the working voltage, overvoltage category, pollution degree, material group (CTI) and altitude, and are usually **much larger** than the IPC-2221 values.

> [!WARN] The calculator shows this warning for every voltage above 60 V. Don’t read the IPC-2221 result as a safety distance; for safety insulation, follow the relevant product standard and your certification body.

## Ways to gain spacing

- **Slots:** a milled slot breaks the surface path, so creepage has to go around it. IEC 60664-1 ignores slots narrower than a width that depends on the pollution degree, so don’t rely on a very thin slot. Slots are common under optocouplers and transformers, between primary and secondary pins.
- **Conformal coating:** categories B4/A5/A7 allow much smaller spacing (at 325 V, 0.8 mm for A5 instead of 2.5 mm for B2), but only if the coating covers the gap without voids or bubbles and stays intact for life. Safety standards credit coating only under specific conditions.
- **Inner layers:** the insulator is the laminate, so B1 values are small (0.25 mm at 325 V). Still check the vias and pads that come up to the surface against the outer-layer rules.
- **Part choice:** pick packages with wider pin spacing, or remove unused pins.

## Altitude

Thin air breaks down at a lower voltage. IPC-2221 uses B3 for uncoated outer conductors above 3050 m: at 325 V, the 2.5 mm of B2 becomes **12.5 mm** in B3. IEC tables, too, are valid only up to a stated altitude and apply correction factors above it.

[[calc:spacing?V=325&cat=B3|Open the 325 V, B3 example]]

## Example: a board with a 230 V AC input

An industrial board that runs from 24 V has a small 230 V AC section: an AC/DC module behind a fuse and a varistor.

1. **Line to neutral after the fuse (functional):** 325 V peak, B2: **2.5 mm**.

[[calc:spacing?V=325&cat=B2|Open the 325 V, B2 example]]

2. **If the board is conformal coated (A5):** **0.8 mm**, but only if the coating is a defined and inspected process.

[[calc:spacing?V=325&cat=A5|Open the 325 V, A5 example]]

3. **The low-voltage side:** B2 is 0.1 mm for 24 V, and the fabricator’s minimum space is often the real limit. If the same board has a 48 V rail, it needs **0.6 mm**.

[[calc:spacing?V=48&cat=B2|Open the 48 V, B2 example]]

4. **Checking an existing gap:** a 0.5 mm gap on an outer layer allows at most **30 V** in B2.

[[calc:spacing?mode=voltage&d=0.5&cat=B2|Open the allowed voltage for 0.5 mm]]

5. **Between the 230 V side and the touchable 24 V side:** this is not an IPC-2221 question; it is safety insulation per IEC 62368-1 / IEC 60664-1. Follow the module’s isolation rating and the distances it requires, and add a slot under it if needed.

## Common mistakes

- Entering RMS instead of peak voltage.
- Forgetting the 30 V → 50 V step: 48 V on an outer layer needs 0.6 mm.
- Using IPC-2221 values for the barrier between mains and the user side.
- Relying on a coating that is not specified or inspected.
- Forgetting component leads: A6 needs 1.5 mm at 325 V; the pin pitch of some small SMD packages can’t meet that.
- Not checking the distance to mounting holes, screws, heatsinks and a metal enclosure.

> [!QUIZ] How much spacing do you need between line and neutral of 230 V AC mains, at sea level, on an uncoated outer layer?
> 230 V RMS ≈ 325 V peak (≈ 358 V with the +10 % tolerance), so the 301–500 V row. In category B2 that is 2.5 mm.

> [!QUIZ] A 0.5 mm gap you used for 24 V on an outer layer will carry 48 V in the new design. Is it enough?
> No. 48 V is in the 31–50 V row and needs 0.6 mm in B2; 0.5 mm allows at most 30 V.

> [!QUIZ] Your product has a USB connector the user can touch on its low-voltage side. Can you use Table 6-1 for the distance between mains and that side?
> No. That is safety insulation (usually reinforced), and its values come from product safety standards such as IEC 62368-1 / IEC 60664-1; they are usually much larger than the IPC-2221 values.

## Checklist

- Peak and transient voltages are known for every voltage area.
- The right category (internal/external, coating, leads, altitude) is chosen for each pair of nets.
- Functional and safety insulation are separated; the safety barrier is sized to the product standard.
- If you rely on coating, it is defined on the drawing and inspected.
- Spacing rules are entered in the CAD tool with net classes.
`,
  },
};
