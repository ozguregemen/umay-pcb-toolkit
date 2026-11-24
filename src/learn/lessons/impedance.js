export default {
  body: {
    tr: `
## Neden önemli?

Yavaş bir kartta iz sadece bir teldir: herhangi bir anda boyunca her noktası aynı gerilimdedir. Kenarlar hızlandığında bu artık doğru değildir. Sinyal bir dalga olarak ilerler; FR-4’te hızı ışık hızının yaklaşık yarısıdır (kabaca 6 ps/mm). İz artık bir **iletim hattıdır**. Dalganın gördüğü empedans nerede değişirse (genişlik değişimi, düzlemdeki bir yarık, konnektör, alıcı girişi) dalganın bir kısmı geri yansır; sonuç çınlama, aşma (overshoot) ve sahte kenarlardır.

**Kontrollü empedans**, izin karakteristik empedansını tüm yol boyunca bilinen ve sabit bir değerde tutmak ve bunu sürücü, alıcı ve sonlandırmalarla uyumlu hale getirmektir.

## İz ne zaman iletim hattı olur?

Belirleyici olan sürücünün **yükselme süresidir**, saat frekansı değil: 1 ns kenarlı 1 MHz’lik bir sinyal, 1 ns kenarlı 100 MHz’lik bir sinyalle aynı kenar sorunlarını yaşar. İz uzunluğunu, kenar uzunluğuyla (yükselen kenarın iz üzerinde kapladığı mesafe) karşılaştırın:

\`\`\`
v = c / √εeff          l_r = tr · v
l < l_r/6 → toplu eleman          l > l_r/2 → yansımalar önemli
\`\`\`

- **l_r/6**’dan kısa: toplu eleman gibi davranır; sonlandırma genellikle gerekmez.
- **l_r/2**’den uzun: gidiş-dönüş süresi kenardan uzundur, yansıma kenarı bozar. İzi iletim hattı olarak ele alın.
- Arada: çınlama görülebilir.

Örnek: 1 ns yükselme süreli bir sürücü, εeff = 3,3 olan 100 mm’lik bir microstrip izi sürüyor. Hesaplayıcı kenar uzunluğunu yaklaşık **165 mm**, toplu eleman sınırını **27,5 mm**, yansıma kritik uzunluğunu **82,5 mm** verir: iz bir iletim hattıdır. Kenar 5 ns olursa toplu eleman sınırı yaklaşık **137,5 mm**’ye çıkar ve aynı iz toplu eleman sayılır.

[[calc:signal?tr=1&tr_u=ns&er=3.3&L=100&L_u=mm|1 ns kenar]] [[calc:signal?tr=5&tr_u=ns&er=3.3&L=100&L_u=mm|5 ns kenar]]

> [!TIP] Yükselme süresini veri sayfasından veya IBIS modelinden alın. Bulamazsanız hızlı olduğunu varsayın: modern lojik, saat yavaş olsa bile çoğu zaman 1 ns’nin altında anahtarlanır.

## Karakteristik empedans nedir?

İletim hattının birim uzunluk başına bir **L** endüktansı ve bir **C** kapasitesi vardır: her milimetre, iz ile düzlem arasındaki akım döngüsünde manyetik, aradaki alanda elektrik enerjisi depolar. Kayıpsız bir hat için:

\`\`\`
Z0 = √(L / C)          t_pd = √(L · C) = √εeff / c
\`\`\`

Z0, ilerleyen dalganın gerilim/akım oranıdır. Multimetreyle ölçülen bir direnç değildir ve uzunluğa bağlı değildir; yalnızca geometriye ve malzemeye bağlıdır:

| Değişiklik | Z0 üzerindeki etkisi | Neden |
|---|---|---|
| Daha geniş iz | Düşer | Düzleme olan kapasite artar |
| Daha kalın dielektrik (büyük h) | Artar | Kapasite azalır, döngü endüktansı artar |
| Daha yüksek εr | Düşer | Kapasite artar; sinyal de yavaşlar |
| Daha kalın bakır | Biraz düşer | İzin yan yüzeyleri kapasite ekler |
| Uzunluk | Etkisiz | Z0 birim uzunluk başına tanımlıdır |

## Microstrip, stripline ve CPWG

| Yapı | Nerede | Özellikler |
|---|---|---|
| Microstrip | Dış katman, altında bir düzlem | Alanın bir kısmı havadadır: εeff < εr, sinyal daha hızlıdır. Probla ölçmek kolaydır; lehim maskesi ve kaplama empedansı kaydırır. Işıma ve karışma daha fazladır. |
| Stripline | İki düzlem arasındaki iç katman | Alanın tamamı dielektriktedir (εeff = εr), sinyal daha yavaştır. İyi ekranlanır, karışma ve EMI düşüktür. Aynı Z0 için daha dar iz gerekir. |
| CPWG | Aynı katmanda iki yanda toprak, altta düzlem | RF’de yaygındır. Yan topraklar sık vialarla düzleme bağlanır. Kalın dielektrik üzerinde bile makul genişlikte 50 Ω sağlar. |

Katman düzenleri için [[lesson:stackup|katman yığını dersine]] bakın.

## Yaygın empedans hedefleri

| Hedef | Yaygın kullanım |
|---|---|
| 50 Ω tek uçlu | RF hatları, birçok tek uçlu hızlı sinyal |
| 75 Ω tek uçlu | Video ve koaksiyel tabanlı arayüzler |
| 90 Ω diferansiyel | USB |
| 100 Ω diferansiyel | Ethernet, LVDS, birçok SerDes bağlantısı |
| 85 Ω diferansiyel | Bazı PCIe ve SerDes platform kılavuzları |

> [!WARN] Bunlar yaygın uygulamalardır, evrensel kurallar değildir. Hedefi ve toleransını arayüz spesifikasyonu ile çip üreticisinin tasarım kılavuzu belirler.

## Genişliği bulmak: sentez modu

1. **Katman yığınını üreticinizden alın**: dielektrik kalınlıkları, bakır kalınlıkları ve çalışma frekansınızdaki tasarım Dk’sı (εr).
2. Empedans hesaplayıcısında yapıyı ve **"Hedef empedans → genişlik"** modunu seçin; hedefi, t, h ve εr değerlerini girin.
3. **Genişliği** üreticinin minimum iz genişliğiyle ve BGA çıkışlarınızla karşılaştırın. Çiftlerde önce boşluğu (s) sabitleyin; genişliği hesaplayıcı çözer.
4. **Hedefi üretim notlarına yazın**, ör. "L1: 50 Ω ±%10 tek uçlu".

Örnek: L1 ile L2 arasında 0,2 mm prepreg bulunan 4 katmanlı kart, 1 oz (35 µm) bakır, εr = 4,3. 50 Ω microstrip için hesaplayıcı yaklaşık **0,359 mm** verir (εeff = 3,125). Karşılaştırma için gösterilen basit IPC-2141 formülü aynı genişlikte 47,75 Ω bulur; yöntemler arasında birkaç yüzdelik fark olağandır.

[[calc:impedance?mode=synth&st=microstrip&Z=50&t=35&h=0.2&h_u=mm&er=4.3|50 Ω microstrip örneğini aç]]

- 1,6 mm’lik 2 katmanlı bir kartta (h = 1,5 mm) 50 Ω yaklaşık **2,88 mm** genişlik ister; ince adımlı bileşenler için fazla geniştir. Yan toprağa 0,2 mm boşluklu bir CPWG’de yaklaşık **1,29 mm** yeter.
- Aralarında 0,4 mm bulunan iki düzlem arasında, ½ oz (17,5 µm) bakırla stripline için yaklaşık **0,154 mm** yeterlidir.

[[calc:impedance?mode=synth&st=microstrip&Z=50&t=35&h=1.5&h_u=mm&er=4.3|2 katman, microstrip]] [[calc:impedance?mode=synth&st=cpwg&Z=50&s=0.2&s_u=mm&t=35&h=1.5&h_u=mm&er=4.3|2 katman, CPWG]] [[calc:impedance?mode=synth&st=stripline&Z=50&t=17.5&h=0.4&h_u=mm&er=4.3|Stripline]]

## Tolerans ve üreticinin katman yığını

Genişlik, dielektrik kalınlığı ve εr üretimde değişir. Genişliği 0,36 mm’ye yuvarladığımızda hesaplayıcı şunları gösterir:

| Değişim | Z0 |
|---|---|
| Nominal (w 0,36 mm, h 0,2 mm, εr 4,3) | 49,9 Ω |
| h %10 ince (0,18 mm) | 46,9 Ω |
| h %10 kalın (0,22 mm) | 52,8 Ω |
| w 0,025 mm dar (aşındırma) | 51,9 Ω |
| εr 4,3 yerine 4,0 | 51,5 Ω |

[[calc:impedance?mode=analyze&st=microstrip&w=0.36&w_u=mm&t=35&h=0.2&h_u=mm&er=4.3|Değişimleri kendiniz deneyin]]

Bu yüzden üretimde olağan tolerans **±%10**’dur ve son genişliği, gerçek malzemelerini bilen üretici bir alan çözücüyle belirler. Üreticiye hedefi, katmanı ve referans düzlemlerini verin; önemliyse empedans kuponu isteyin.

> [!NOTE] Lehim maskesi microstrip’in üstüne dielektrik ekler ve empedansı biraz düşürür, tipik olarak birkaç ohm. Dış katmandaki kaplama da bakırı kalınlaştırır. Yalın microstrip modeli ikisini de içermez; üreticilerin çözücüleri içerir.

## Referans düzlemler ve dönüş yolu

Yüksek frekansta dönüş akımı, en düşük endüktanslı yol olan referans düzlemde **izin hemen altından** akar. İz ve düzlem birlikte iletim hattını oluşturur.

[[fig:return-path]]

- **Kontrollü bir izi referans düzlemindeki yarık veya boşluğun üzerinden geçirmeyin**: dönüş akımı dolanır, döngü büyür, empedans sıçrar ve kart ışıma yapar.
- **Sinyal katman değiştirdiğinde dönüş akımı da düzlem değiştirir.** Sinyal viasının yanına bir toprak dikiş (stitching) viası koyun; düzlemler farklı netlerdeyse (GND ve güç) yakına bir dikiş kondansatörü koyun.
- Kontrollü izleri kart ve düzlem kenarlarından h’nin birkaç katı uzakta tutun.

## Diferansiyel çiftler

Diferansiyel çift eşit ve zıt iki sinyal taşır; alıcı farka baktığı için ortak gürültü birbirini götürür. Çiftin empedansı **diferansiyel empedanstır**: Zdiff = 2·Zodd.

İzler birbirinden uzaksa Zdiff ≈ 2·Z0 olur. Yaklaştıkça kuplaj artar: her izin alanının bir kısmı eşinde sonlanır, bu da Zodd’u Z0’ın, Zdiff’i 2·Z0’ın altına çeker. Aynı 0,2 mm prepreg üzerinde s = 0,2 mm boşluklu 100 Ω microstrip çift için hesaplayıcı yaklaşık **0,24 mm** genişlik ve iz başına **Z0 ≈ 61,3 Ω** verir: 2·Z0 = 122,5 Ω olurdu, kuplaj Zdiff’i 100 Ω’a indirir. 90 Ω için genişlik yaklaşık 0,30 mm’ye çıkar.

[[calc:impedance?mode=synth&st=diffMicrostrip&Z=100&s=0.2&s_u=mm&t=35&h=0.2&h_u=mm&er=4.3|100 Ω çift]] [[calc:impedance?mode=synth&st=diffMicrostrip&Z=90&s=0.2&s_u=mm&t=35&h=0.2&h_u=mm&er=4.3|90 Ω çift]]

- Boşluğu sabit tutun; s değişirse Zdiff de değişir.
- İki izi birlikte, simetrik olarak, aynı kesintisiz düzlemin üzerinden ve aralarına başka sinyal sokmadan götürün.
- Çift içi uzunlukları eşleyin ([[lesson:signal-integrity|sinyal bütünlüğü dersi]]).

Hesaplayıcının diferansiyel formülleri deneyseldir (±%10); çok sıkı kuplajda alan çözücü kullanın.

## Sık yapılan hatalar

- "Yavaş sinyal" kararını yükselme süresine değil saat frekansına bakarak vermek.
- Genişliği üreticinin katman yığını yerine genel bir tablodan almak.
- Düzlem yarığının üzerinden geçmek veya dikiş viası olmadan katman değiştirmek.
- Çifti "iki tane 50 Ω iz" sanmak: kuplaj varken Zdiff, 2·Z0’dan küçüktür.
- Kontrollü izi uzun bir mesafe boyunca inceltmek (padlerdeki, toplu eleman sınırından çok kısa daralmalar genellikle sorun olmaz).

> [!QUIZ] 1 kHz’lik bir kontrol sinyali, 0,5 ns kenarlı bir tamponla 150 mm’lik bir izden sürülüyor. İletim hattı olarak ele alınmalı mı?
> Evet. Önemli olan 1 kHz değil, yükselme süresidir. εeff ≈ 3,3 için 0,5 ns’lik kenar yaklaşık 82,5 mm’dir; toplu eleman sınırı yaklaşık 14 mm, yansıma kritik uzunluğu yaklaşık 41 mm olur. 150 mm ikisini de fazlasıyla aşar.

> [!QUIZ] Üretici, varsaydığınızdan daha ince bir prepreg bildirdi. Microstrip empedansı artar mı, azalır mı ve neyi değiştirirsiniz?
> Azalır: iz düzleme yaklaştığı için birim uzunluk başına kapasite artar ve Z0 düşer. Hedefe dönmek için izi daraltın; gerçek katman yığınıyla yeniden hesaplayın veya genişlik ayarını üreticiye bırakın.

## Kontrol listesi

- Yükselme süreleri biliniyor; uzun netler l_r/6 ve l_r/2 ile karşılaştırıldı.
- Katman yığını ve Dk değeri üreticiden alındı.
- Her kontrollü katman için genişlik (ve çift boşluğu) hesaplandı.
- Hedef empedans ve tolerans üretim notlarına yazıldı.
- Her kontrollü izin altında kesintisiz bir referans düzlem var; katman değişimlerinde dikiş viaları konuldu.
- Diferansiyel çiftler simetrik ve sabit boşlukla yönlendirildi.
`,
    en: `
## Why it matters

On a slow board a trace is just a wire: at any instant it is at one voltage along its whole length. With fast edges that stops being true. The signal travels as a wave, at about half the speed of light in FR-4 (roughly 6 ps/mm), and the trace becomes a **transmission line**. Wherever the impedance the wave sees changes (a width change, a gap in the plane, a connector, a receiver input) part of the wave reflects, causing ringing, overshoot and false edges.

**Controlled impedance** means keeping a trace’s characteristic impedance at a known, constant value along the whole path, matched to its drivers, receivers and terminations.

## When does a trace become a transmission line?

The driver’s **rise time** decides, not the clock frequency: a 1 MHz signal with 1 ns edges has the same edge problems as a 100 MHz signal with 1 ns edges. Compare the trace length with the edge length, the distance the rising edge occupies on the trace:

\`\`\`
v = c / √εeff          l_r = tr · v
l < l_r/6 → lumped          l > l_r/2 → reflections matter
\`\`\`

- Shorter than **l_r/6**: lumped; termination is usually unnecessary.
- Longer than **l_r/2**: the round trip takes longer than the edge, so reflections distort it. Treat it as a transmission line.
- In between: ringing is possible.

Example: a driver with a 1 ns rise time on a 100 mm microstrip trace (εeff = 3.3). The calculator gives an edge length of about **165 mm**, a lumped limit of **27.5 mm** and a reflection critical length of **82.5 mm**: the trace is a transmission line. With 5 ns edges the lumped limit grows to about **137.5 mm** and the same trace counts as lumped.

[[calc:signal?tr=1&tr_u=ns&er=3.3&L=100&L_u=mm|1 ns edge]] [[calc:signal?tr=5&tr_u=ns&er=3.3&L=100&L_u=mm|5 ns edge]]

> [!TIP] Take the rise time from the datasheet or IBIS model. If you can’t find it, assume it is fast: modern logic often switches in under 1 ns even on a slow clock.

## What is characteristic impedance?

A transmission line has an inductance **L** and a capacitance **C** per unit length: every millimetre stores magnetic energy in the current loop and electric energy in the field between trace and plane. For a lossless line:

\`\`\`
Z0 = √(L / C)          t_pd = √(L · C) = √εeff / c
\`\`\`

Z0 is the voltage-to-current ratio of the travelling wave. It is not something a multimeter measures, and it does not depend on length, only on geometry and material:

| Change | Effect on Z0 | Why |
|---|---|---|
| Wider trace | Lower | More capacitance to the plane |
| Thicker dielectric (larger h) | Higher | Less capacitance, more loop inductance |
| Higher εr | Lower | More capacitance; the signal is also slower |
| Thicker copper | Slightly lower | The trace’s side walls add capacitance |
| Length | None | Z0 is defined per unit length |

## Microstrip, stripline and CPWG

| Structure | Where | Characteristics |
|---|---|---|
| Microstrip | Outer layer over one plane | Part of the field is in air: εeff < εr, faster signals. Easy to probe; solder mask and plating shift the impedance. More radiation and crosstalk. |
| Stripline | Inner layer between two planes | The whole field is in the dielectric (εeff = εr), slower signals. Well shielded, low crosstalk and EMI. Needs a narrower trace for the same Z0. |
| CPWG | Ground on both sides on the same layer, plus a plane below | Common in RF. The side grounds are stitched to the plane with frequent vias. Reaches 50 Ω at sensible widths even over thick dielectric. |

See the [[lesson:stackup|stack-up lesson]] for layer arrangements.

## Common impedance targets

| Target | Commonly used for |
|---|---|
| 50 Ω single-ended | RF lines, many single-ended high-speed signals |
| 75 Ω single-ended | Video and coax-based interfaces |
| 90 Ω differential | USB |
| 100 Ω differential | Ethernet, LVDS, many SerDes links |
| 85 Ω differential | Some PCIe and SerDes platform guides |

> [!WARN] These are common practice, not universal rules. The interface specification and the chip vendor’s design guide set the target and its tolerance.

## Finding the width: synthesis mode

1. **Get the stack-up from your fabricator**: dielectric heights, copper thicknesses and the design Dk (εr) at your operating frequency.
2. In the impedance calculator choose the structure and **"Target impedance → width"**, then enter the target, t, h and εr.
3. **Check the width** against the fabricator’s minimum trace width and your BGA breakout. For a pair, fix the gap s first; the calculator solves the width.
4. **Write the target in the fabrication notes**, e.g. "L1: 50 Ω ±10 % single-ended".

Example: a 4-layer board with 0.2 mm prepreg between L1 and L2, 1 oz (35 µm) copper, εr = 4.3. For 50 Ω microstrip the calculator gives about **0.359 mm** (εeff = 3.125). The simpler IPC-2141 formula shown for comparison gives 47.75 Ω at that width; a few percent between methods is normal.

[[calc:impedance?mode=synth&st=microstrip&Z=50&t=35&h=0.2&h_u=mm&er=4.3|Open the 50 Ω microstrip example]]

- On a 1.6 mm 2-layer board (h = 1.5 mm), 50 Ω needs about **2.88 mm**, too wide for fine-pitch parts. A CPWG with 0.2 mm gaps to the side ground needs about **1.29 mm**.
- As stripline between two planes 0.4 mm apart, with ½ oz (17.5 µm) copper, about **0.154 mm** is enough.

[[calc:impedance?mode=synth&st=microstrip&Z=50&t=35&h=1.5&h_u=mm&er=4.3|2-layer, microstrip]] [[calc:impedance?mode=synth&st=cpwg&Z=50&s=0.2&s_u=mm&t=35&h=1.5&h_u=mm&er=4.3|2-layer, CPWG]] [[calc:impedance?mode=synth&st=stripline&Z=50&t=17.5&h=0.4&h_u=mm&er=4.3|Stripline]]

## Tolerance and the fabricator’s stack-up

Width, dielectric height and εr all vary in production. With the width rounded to 0.36 mm, the calculator shows:

| Variation | Z0 |
|---|---|
| Nominal (w 0.36 mm, h 0.2 mm, εr 4.3) | 49.9 Ω |
| h 10 % thinner (0.18 mm) | 46.9 Ω |
| h 10 % thicker (0.22 mm) | 52.8 Ω |
| w 0.025 mm narrower (etching) | 51.9 Ω |
| εr 4.0 instead of 4.3 | 51.5 Ω |

[[calc:impedance?mode=analyze&st=microstrip&w=0.36&w_u=mm&t=35&h=0.2&h_u=mm&er=4.3|Try the variations yourself]]

That is why **±10 %** is the usual production tolerance, and why the fabricator, who knows their real materials, sets the final width with a field solver. Give them the target, the layer and its reference planes, and ask for impedance coupons when it matters.

> [!NOTE] Solder mask adds dielectric above a microstrip and lowers its impedance slightly, typically by a few ohms; outer-layer plating also thickens the copper. The plain microstrip model includes neither; fabricators’ solvers include both.

## Reference planes and return paths

At high frequency the return current flows in the reference plane **directly under the trace**, because that is the lowest-inductance path. Trace and plane together form the transmission line.

[[fig:return-path]]

- **Never route a controlled trace across a split or slot in its reference plane**: the return current detours, the loop grows, the impedance jumps and the board radiates.
- **When a signal changes layers, its return current changes planes too.** Put a ground stitching via next to the signal via; if the planes are different nets (GND and power), place a stitching capacitor nearby.
- Keep controlled traces several times h away from board and plane edges.

## Differential pairs

A differential pair carries two equal and opposite signals; the receiver looks at the difference, so common noise cancels. The pair’s impedance is the **differential impedance**: Zdiff = 2·Zodd.

Far apart, Zdiff ≈ 2·Z0. Closer together, the traces couple: part of each trace’s field ends on its partner, which pulls Zodd below Z0 and Zdiff below 2·Z0. For a 100 Ω microstrip pair with s = 0.2 mm on the same 0.2 mm prepreg, the calculator gives a width of about **0.24 mm** and **Z0 ≈ 61.3 Ω** per trace: 2·Z0 would be 122.5 Ω, and coupling brings Zdiff down to 100 Ω. For 90 Ω the width grows to about 0.30 mm.

[[calc:impedance?mode=synth&st=diffMicrostrip&Z=100&s=0.2&s_u=mm&t=35&h=0.2&h_u=mm&er=4.3|100 Ω pair]] [[calc:impedance?mode=synth&st=diffMicrostrip&Z=90&s=0.2&s_u=mm&t=35&h=0.2&h_u=mm&er=4.3|90 Ω pair]]

- Keep the gap constant; if s changes, Zdiff changes.
- Route both traces together, symmetrically, over the same solid plane, with nothing routed between them.
- Match the lengths within the pair (see [[lesson:signal-integrity|signal integrity]]).

The calculator’s differential formulas are empirical (±10 %); use a field solver for very tight coupling.

## Common mistakes

- Judging a signal "slow" by its clock frequency instead of its rise time.
- Taking widths from a generic table instead of the fabricator’s stack-up.
- Crossing a plane split, or changing layers without a stitching via.
- Treating a pair as "two 50 Ω traces": with coupling, Zdiff is less than 2·Z0.
- Necking a controlled trace down over a long distance (short neck-downs at pads, well under the lumped limit, are usually fine).

> [!QUIZ] A 1 kHz control signal is driven by a buffer with 0.5 ns edges over a 150 mm trace. Should it be treated as a transmission line?
> Yes. What matters is the rise time, not the 1 kHz rate. With εeff ≈ 3.3 the 0.5 ns edge is about 82.5 mm long, so the lumped limit is about 14 mm and the reflection critical length about 41 mm. 150 mm is far beyond both.

> [!QUIZ] Your fabricator reports a thinner prepreg than you assumed. Does your microstrip impedance go up or down, and what do you change?
> Down: the trace is closer to the plane, so the capacitance per unit length rises and Z0 falls. To get back to the target, make the trace narrower; recalculate with the real stack-up, or let the fabricator adjust the width.

## Checklist

- Rise times known; long nets compared with l_r/6 and l_r/2.
- Stack-up and Dk obtained from the fabricator.
- Width (and pair gap) calculated for every controlled layer.
- Target impedance and tolerance written in the fabrication notes.
- Every controlled trace has a solid reference plane underneath; stitching vias at layer changes.
- Differential pairs routed symmetrically with a constant gap.
`,
  },
};
