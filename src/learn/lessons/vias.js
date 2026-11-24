export default {
  body: {
    tr: `
## Neden önemli?

Via, bir sinyali ya da akımı bir katmandan diğerine taşıyan kaplamalı deliktir. Ortalama bir kartta yüzlerce via bulunur; bu yüzden tek bir boyut kararı maliyeti, üretim verimini ve güvenilirliği birlikte etkiler. Kötü seçilmiş bir via ısıl döngülerde çatlayabilir, yüksek akımda ısınabilir, dekuplaja ve hızlı sinyallere endüktans ekler ya da padinin kenarından taşar (breakout).

## Via türleri

[[fig:via-types]]

| Tür | Bağladığı katmanlar | Üretim | Maliyet |
|---|---|---|---|
| Delik geçişli (through) | Üstten alta tüm katmanlar | Pres sonrası mekanik matkap | En düşük |
| Kör (blind) | Bir dış ve bir iç katman | Derinlik kontrollü delme veya ardışık pres | Orta–yüksek |
| Gömülü (buried) | Yalnızca iç katmanlar | İç çekirdek ayrıca delinip kaplanır | Yüksek |
| Mikrovia | Komşu iki katman | Lazerle delinir, katmanlar sırayla eklenir (HDI) | Yüksek |

Delik geçişli via her katmanda yer kaplar ve yönlendirme alanını azaltır. Kör, gömülü ve mikrovialar bu alanı geri kazandırır, ama her ek delme ve pres adımı fiyatı ve teslim süresini artırır. İnce hatveli bir BGA sizi zorlamadıkça delik geçişli vialarla başlayın.

> [!NOTE] IPC-T-50M’ye göre mikrovianın en-boy oranı en fazla 1:1, derinliği en fazla 0,25 mm’dir; 0,8:1’in altı önerilir.

## En-boy oranı

**En-boy oranı = kart kalınlığı / delik çapı.** 1,6 mm kartta 0,3 mm via yaklaşık 5,3:1 eder.

Delik duvarı, delikten akan kimyasal çözeltiyle kaplanır. Delik derinleşip daraldıkça bakır ağızlarda kalın, ortada ince birikir. İnce kalan gövde, laminat Z ekseninde bakırdan çok daha fazla genleştiği için (özellikle Tg’nin üzerinde) ısıl döngülerde çatlar. Bu çatlak çoğu zaman yalnızca sıcakken açılır ve bulunması çok zordur.

- IPC-2221A tercih edilen değer olarak **5:1’in altını** verir.
- Üreticilerin tipik üst sınırı **8:1–10:1** arasıdır.

[[calc:via?d=0.2&d_u=mm&L=2.4|0,2 mm deliği 2,4 mm kartta dene]]

Bu örnekte oran 12:1 olur ve hesaplayıcı uyarır. Çözüm: daha büyük delik, daha ince kart ya da kör via.

> [!TIP] Üreticiler en-boy oranını genellikle bitmiş delikten biraz büyük olan matkap çapıyla verir. Via hesaplayıcısı bitmiş deliği kullandığı için güvenli tarafta kalan, biraz daha yüksek bir oran gösterir.

## Akım için kaç via?

Via ince bir bakır borudur: kesiti delik duvarındaki kaplama halkasıdır. 0,3 mm delik ve 25 µm kaplamada bu yalnızca **0,0255 mm²** eder; 1 oz bakırda yaklaşık 0,73 mm genişliğindeki bir izin kesiti kadar.

Örnek: 1,6 mm kartta 3 A’lik bir besleme hattı katman değiştiriyor; 0,3 mm delik, 25 µm kaplama ve 10 °C ısınma.

[[calc:via?d=0.3&d_u=mm&L=1.6&p=25&n=1&I=3&dT=10|Tek via ile aç]]

Tek via yaklaşık **1,9 A** taşıyabilir; hesaplayıcı uyarır ve **2 via** gerektiğini söyler. Sayıyı dörde çıkarın:

[[calc:via?d=0.3&d_u=mm&L=1.6&p=25&n=4&I=3&dT=10|Dört via ile aç]]

Via başına akım **0,75 A**’e iner, toplam kapasite yaklaşık **7,6 A**, toplam direnç **~0,27 mΩ** olur. Neden ikiyle yetinmiyoruz? Kaynağa en yakın via daha fazla akım taşır, kaplama kalınlığı delikten deliğe değişir ve bir viada kusur olabilir. Fazladan via ucuzdur ve endüktansı da düşürür.

> [!RULE] Pratik kural: hesaplanan via sayısının 1,5–2 katını kullanın ve viaları akımın paylaşılabileceği geniş bir bakır alana bağlayın.

## Termal vialar

Vialar ısıyı da taşır. Tek bir 0,3 mm via gövdesi boyunca yaklaşık **165 °C/W** ısıl dirence sahiptir; paralel bağlanınca etkili olur. Açık padli (exposed pad) bir entegrenin altındaki dokuz via bu değeri yaklaşık **18 °C/W**’a indirir.

[[calc:via?d=0.3&d_u=mm&L=1.6&p=25&n=9|Dokuz termal via]]

Ayrıntılar [[lesson:thermal|termal tasarım dersinde]].

## Via parazitikleri

Yüksek frekansta via küçük bir bobin gibi davranır. 1,6 mm kart ve 0,3 mm delik için endüktans yaklaşık **1,3 nH**’dir; kapasitesi pikofaradın bir kesri kadardır.

[[calc:via?d=0.3&d_u=mm&L=1.6|Parazitikleri gör]]

1,3 nH, 100 MHz’de yaklaşık **0,82 Ω** reaktans demektir:

[[calc:rc?mode=x&xF=100M&xL=1n3&xC=|100 MHz’de reaktansı hesapla]]

Bir işlemci beslemesinin hedef empedansı çoğu zaman birkaç ile birkaç on miliohm arasındadır. Bu yüzden dekuplaj kondansatörünün vialarını pada bitişik koyar, mümkünse her pada iki via veririz. Hızlı sinyallerde her via küçük bir empedans süreksizliğidir; sinyal katman değiştirdiğinde dönüş akımı için hemen yanına bir GND via koyun. Bkz. [[lesson:pdn|güç dağıtımı]] ve [[lesson:signal-integrity|sinyal bütünlüğü]].

## Pad, halka ve a + 2b + c

Halka (annular ring), delik kenarından pad kenarına kalan bakırdır; matkabın merkezden kaymasını ve delik toleransını karşılar. IPC-2221 en küçük pad çapını şöyle verir:

**Pad çapı = a + 2b + c**

- **a**: en büyük delik (dış katmanda bitmiş delik, iç katmanda matkap deliği),
- **b**: en küçük halka (dış 0,050 mm, iç 0,025 mm),
- **c**: üretim payı; üretilebilirlik seviyesine göre A 0,4 / B 0,25 / C 0,2 mm, 1 oz’un üzerindeki her oz için +0,05 mm.

Örnek: 0,3 mm bitmiş delik, ±0,075 mm tolerans, Seviye B ve 0,6 mm pad.

[[calc:padstack?k=via&lv=B&h=0.3&h_u=mm&pad=0.6&pad_u=mm|0,3 / 0,6 mm padi kontrol et]]

En büyük delik 0,375 mm olduğundan dış katman için en küçük pad 0,375 + 2 × 0,05 + 0,25 = **0,725 mm** çıkar. 0,6 mm padde nominal halka 0,15 mm görünür, ama en kötü durumda halka **negatife** düşer: delik padin kenarını kırabilir. Padi 0,8 mm yapın:

[[calc:padstack?k=via&lv=B&h=0.3&h_u=mm&pad=0.8&pad_u=mm|0,8 mm padle tekrar dene]]

En kötü durum halkası dışta **0,088 mm**, içte **0,038 mm** olur ve Sınıf 3 dahil tüm kontroller geçer. Kırılmaya ne kadar izin verildiğini ürün sınıfı belirler (IPC-6012):

| Katman | Sınıf 1 | Sınıf 2 | Sınıf 3 |
|---|---|---|---|
| Dış | 180° kırılmaya izin var | 90° kırılmaya izin var | Halka ≥ 0,050 mm |
| İç | 180° kırılmaya izin var | 90° yalnızca damla/fillet varsa, yoksa ≥ 0,025 mm | Halka ≥ 0,025 mm |

> [!NOTE] Pek çok üretici 0,3 / 0,6 mm viaları rutin olarak üretir; delik konum hassasiyetleri Seviye B payından iyidir. Sınıf 2’de bu genellikle sorun değildir, Sınıf 3’te ise formüle uyun ya da üreticinin kabiliyetini yazılı alın.

## Damla ve pad içi via

**Damla (teardrop)**, izin pada bağlandığı noktayı kademeli olarak genişletir. Delik kaysa bile bağlantı kopmaz ve bağlantı noktasındaki gerilim azalır. IPC-2221, kırılmaya izin verilen tasarımlarda damla ister; çoğu CAD aracı bunları otomatik ekler.

**Pad içi via (via-in-pad)**, viayı doğrudan bileşen padine koymaktır; ince hatveli BGA’larda ve termal padlerde yer kazandırır. Açık delik lehimi emer ve boşluk (void) bırakır. Bu yüzden pad içi vialar epoksiyle doldurulup üzeri bakırla kapatılır (IPC-4761 Tip VII); bunu üretim notlarında açıkça belirtin.

## Kısa devrede eritme

Arıza akımı, koruma açılana kadar akar ve bu sürede en ince iletken eriyebilir. Onderdonk denklemi bu kısa süreli (adyabatik) ısınmayı hesaplar.

- 0,25 mm genişliğinde 1 oz iz, 10 ms’de yaklaşık **25 A**’de erir: [[calc:fusing?k=trace&w=0.25&w_u=mm&t=1&dur=10|İz için aç]]
- 0,3 mm / 25 µm tek via aynı sürede yaklaşık **74 A**’e dayanır: [[calc:fusing?k=via&d=0.3&d_u=mm&p=25&dur=10|Via için aç]]
- 50 A’lik bir arızada aynı iz yaklaşık **2,6 ms**’de erir: [[calc:fusing?k=trace&m=time&w=0.25&w_u=mm&t=1&I=50|Eritme süresini aç]]

Bu örnekte zayıf halka via değil, incelen izdir. Koruma elemanının açma I²t değeri, en zayıf iletkenin erime I²t değerinden belirgin biçimde küçük olmalıdır. Kart, bakır erimeden çok önce hasar gördüğü için bu sayılar bir hedef değil, üst sınırdır.

## Sık yapılan hatalar

- Akım taşıyan bir hatta tek, küçük bir via bırakmak.
- Kalın kartta küçük delik seçip en-boy oranını kontrol etmemek.
- CAD aracının varsayılan padstack’ini sınıf ve üretici kabiliyetine bakmadan kullanmak.
- Dekuplaj kondansatörünü vialara uzun izlerle bağlamak.
- Termal pad altındaki açık vialardan lehimin akacağını unutmak.

> [!QUIZ] Hesaplayıcı 3 A için 2 via yeterli diyor. Neden 4 via koymak daha iyidir?
> Akım vialara eşit dağılmaz, kaplama kalınlığı delikten deliğe değişir ve bir viada kusur olabilir. Ek vialar ucuzdur; toplam direnci ve endüktansı da düşürür.

> [!QUIZ] 2,4 mm kalınlığındaki bir kartta 0,2 mm via kullanmak neden risklidir?
> En-boy oranı 12:1 olur ve tipik 8:1–10:1 üretim sınırını aşar. Delik ortasında kaplama incelir ve ısıl döngülerde çatlayabilir. Deliği büyütün, kartı inceltin ya da kör via kullanın.

## Kontrol listesi

- Via türleri ve en-boy oranı üreticinin kabiliyetiyle uyumlu.
- Akım taşıyan hatlarda via sayısı hesaplandı ve pay bırakıldı.
- Pad çapı a + 2b + c ile ve hedef IPC sınıfına göre kontrol edildi; gereken yerlerde damla var.
- Dekuplaj ve hızlı hatlardaki vialar kısa ve pada yakın.
- Pad içi vialar "doldurulmuş ve kapatılmış" olarak belirtildi.
- Arıza akımında en zayıf iletken, koruma açılmadan erimiyor.
`,
    en: `
## Why it matters

A via is a plated hole that carries a signal or current from one layer to another. A typical board has hundreds of them, so a single sizing decision affects cost, yield and reliability all at once. A poorly chosen via can crack during thermal cycling, run hot at high current, add inductance to decoupling and fast signals, or break out of the edge of its pad.

## Via types

[[fig:via-types]]

| Type | Connects | How it is made | Cost |
|---|---|---|---|
| Through | All layers, top to bottom | Mechanical drill after lamination | Lowest |
| Blind | An outer and an inner layer | Controlled-depth drilling or sequential lamination | Medium–high |
| Buried | Inner layers only | Inner core drilled and plated separately | High |
| Microvia | Two adjacent layers | Laser-drilled, layers built up one at a time (HDI) | High |

A through via occupies every layer and takes routing space. Blind, buried and microvias win that space back, but every extra drilling and lamination step adds cost and lead time. Start with through vias unless a fine-pitch BGA forces you otherwise.

> [!NOTE] Per IPC-T-50M, a microvia has an aspect ratio of at most 1:1 and a depth of at most 0.25 mm; below 0.8:1 is recommended.

## Aspect ratio

**Aspect ratio = board thickness / hole diameter.** A 0.3 mm via in a 1.6 mm board is about 5.3:1.

The hole wall is plated by chemistry flowing through the hole. The deeper and narrower the hole, the thicker the copper at the mouths and the thinner in the middle. A thin barrel cracks during thermal cycling because the laminate expands much more than copper in the Z axis (especially above Tg). Such a crack often opens only when hot and is very hard to find.

- IPC-2221A gives **below 5:1** as the preferred value.
- The typical fabricator limit is **8:1–10:1**.

[[calc:via?d=0.2&d_u=mm&L=2.4|Try a 0.2 mm hole in a 2.4 mm board]]

Here the ratio is 12:1 and the calculator warns. The fix: a larger hole, a thinner board or a blind via.

> [!TIP] Fabricators usually quote aspect ratio against the drill, which is slightly larger than the finished hole. The via calculator uses the finished hole, so it shows a slightly higher, safer-side ratio.

## How many vias for the current?

A via is a thin copper tube: its cross-section is the ring of plating on the hole wall. With a 0.3 mm hole and 25 µm plating that is only **0.0255 mm²**, about the cross-section of a 0.73 mm wide trace in 1 oz copper.

Example: on a 1.6 mm board a 3 A supply line changes layers; 0.3 mm hole, 25 µm plating, 10 °C rise.

[[calc:via?d=0.3&d_u=mm&L=1.6&p=25&n=1&I=3&dT=10|Open with one via]]

One via carries about **1.9 A**; the calculator warns and says **2 vias** are needed. Raise the count to four:

[[calc:via?d=0.3&d_u=mm&L=1.6&p=25&n=4&I=3&dT=10|Open with four vias]]

The current per via drops to **0.75 A**, the total capacity is about **7.6 A** and the total resistance **~0.27 mΩ**. Why not stop at two? The via nearest the source carries more current, plating thickness varies from hole to hole, and one via may be defective. Extra vias are cheap and they lower inductance too.

> [!RULE] Rule of thumb: use 1.5–2× the calculated via count and connect the vias to a wide copper area so they can share the current.

## Thermal vias

Vias carry heat as well. A single 0.3 mm via has about **165 °C/W** along its barrel; in parallel they become effective. Nine vias under an exposed-pad IC bring that down to about **18 °C/W**.

[[calc:via?d=0.3&d_u=mm&L=1.6&p=25&n=9|Nine thermal vias]]

More in the [[lesson:thermal|thermal design lesson]].

## Via parasitics

At high frequency a via behaves like a small inductor. For a 1.6 mm board and a 0.3 mm hole the inductance is about **1.3 nH**; its capacitance is a fraction of a picofarad.

[[calc:via?d=0.3&d_u=mm&L=1.6|See the parasitics]]

At 100 MHz, 1.3 nH is about **0.82 Ω** of reactance:

[[calc:rc?mode=x&xF=100M&xL=1n3&xC=|Calculate the reactance at 100 MHz]]

A processor supply often has a target impedance of a few to a few tens of milliohms. That is why we place a decoupling capacitor’s vias right against its pads and, where possible, give each pad two vias. On fast signals every via is a small impedance discontinuity; when a signal changes layers, put a GND via right next to it for the return current. See [[lesson:pdn|power distribution]] and [[lesson:signal-integrity|signal integrity]].

## Pads, annular ring and a + 2b + c

The annular ring is the copper between the hole edge and the pad edge; it absorbs drill position error and hole tolerance. IPC-2221 gives the minimum pad diameter as:

**Pad diameter = a + 2b + c**

- **a**: the largest hole (finished hole on external layers, drilled hole on internal layers),
- **b**: the minimum annular ring (external 0.050 mm, internal 0.025 mm),
- **c**: the fabrication allowance; by producibility level A 0.4 / B 0.25 / C 0.2 mm, plus 0.05 mm for each oz above 1 oz.

Example: 0.3 mm finished hole, ±0.075 mm tolerance, Level B and a 0.6 mm pad.

[[calc:padstack?k=via&lv=B&h=0.3&h_u=mm&pad=0.6&pad_u=mm|Check the 0.3 / 0.6 mm pad]]

The largest hole is 0.375 mm, so the minimum external pad is 0.375 + 2 × 0.05 + 0.25 = **0.725 mm**. On a 0.6 mm pad the nominal ring looks like 0.15 mm, but in the worst case it goes **negative**: the hole can break out of the pad. Make the pad 0.8 mm:

[[calc:padstack?k=via&lv=B&h=0.3&h_u=mm&pad=0.8&pad_u=mm|Try again with a 0.8 mm pad]]

The worst-case ring is now **0.088 mm** external and **0.038 mm** internal, and every check passes, including Class 3. How much breakout is acceptable depends on the product class (IPC-6012):

| Layer | Class 1 | Class 2 | Class 3 |
|---|---|---|---|
| External | 180° breakout allowed | 90° breakout allowed | Ring ≥ 0.050 mm |
| Internal | 180° breakout allowed | 90° only with teardrops/fillets, otherwise ≥ 0.025 mm | Ring ≥ 0.025 mm |

> [!NOTE] Many fabricators build 0.3 / 0.6 mm vias routinely; their hole registration is better than the Level B allowance. On Class 2 this is usually fine; for Class 3 follow the formula or get the fabricator’s capability in writing.

## Teardrops and via-in-pad

A **teardrop** gradually widens the point where a trace joins a pad. Even if the hole shifts the trace stays connected, and stress at the junction drops. IPC-2221 asks for teardrops where breakout is allowed; most CAD tools add them automatically.

**Via-in-pad** puts the via inside a component pad, saving space under fine-pitch BGAs and thermal pads. An open hole wicks solder and leaves voids, so via-in-pad holes are filled with epoxy and plated over (IPC-4761 Type VII); state this clearly in the fabrication notes.

## Fusing during a short circuit

Fault current flows until the protection opens, and in that time the thinnest conductor may melt. The Onderdonk equation models this short (adiabatic) heating.

- A 0.25 mm wide 1 oz trace melts in 10 ms at about **25 A**: [[calc:fusing?k=trace&w=0.25&w_u=mm&t=1&dur=10|Open for the trace]]
- A single 0.3 mm / 25 µm via survives about **74 A** for the same time: [[calc:fusing?k=via&d=0.3&d_u=mm&p=25&dur=10|Open for the via]]
- In a 50 A fault the same trace melts in about **2.6 ms**: [[calc:fusing?k=trace&m=time&w=0.25&w_u=mm&t=1&I=50|Open the time to fuse]]

Here the weak link is the necked-down trace, not the via. The protection device’s clearing I²t must be well below the melting I²t of the weakest conductor. The board is damaged long before copper melts, so treat these numbers as an upper limit, not a target.

## Common mistakes

- Leaving a single small via in a current-carrying line.
- Choosing a small hole in a thick board without checking the aspect ratio.
- Using the CAD tool’s default padstack without checking the class and fabricator capability.
- Connecting decoupling capacitors to their vias with long traces.
- Forgetting that solder flows into open vias under a thermal pad.

> [!QUIZ] The calculator says 2 vias are enough for 3 A. Why are 4 vias better?
> Current does not split evenly, plating thickness varies from hole to hole and one via may be defective. Extra vias are cheap, and they also lower the total resistance and inductance.

> [!QUIZ] Why is a 0.2 mm via risky in a 2.4 mm thick board?
> The aspect ratio becomes 12:1, beyond the typical 8:1–10:1 fabrication limit. Plating thins in the middle of the hole and can crack during thermal cycling. Enlarge the hole, use a thinner board or use a blind via.

## Checklist

- Via types and aspect ratio match the fabricator’s capability.
- Via counts on current-carrying lines are calculated, with margin.
- Pad diameter checked with a + 2b + c and against the target IPC class; teardrops where needed.
- Vias on decoupling and fast lines are short and close to the pad.
- Via-in-pad is specified as "filled and capped".
- In a fault, the weakest conductor does not melt before the protection opens.
`,
  },
};
