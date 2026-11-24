export default {
  body: {
    tr: `
## Neden önemli?

Katman yığını (stack-up), bakır ve dielektrik katmanların sırası ve kalınlıklarıdır. Neredeyse her şey ona bağlıdır: izlerin empedansı, dönüş akımlarının yolu, karışma (crosstalk), EMI, güç dağıtımı, hatta kartın düz kalıp kalmayacağı. Sonradan değiştirmek kontrollü empedanslı her izi yeniden hesaplamak demektir; bu yüzden katman yığınını iz çiziminden önce ve üreticinizle birlikte seçin.

## Yapı taşları

- **Bakır folyo:** ağırlıkla belirtilir; ½ oz ≈ 17 µm, 1 oz ≈ 35 µm, 2 oz ≈ 70 µm. Dış katmanlar genellikle ince folyoyla başlar ve delik kaplamasıyla kalınlaşır: IPC-6012’ye göre ½ oz’dan başlayan dış katmanda bitmiş bakır Sınıf 1–2 için en az 33,4 µm olmalıdır. İç katmanlar kaplanmaz, işlemde biraz incelir (1 oz için en az 24,9 µm).
- **Çekirdek (core):** tamamen kürlenmiş, iki yüzü bakır kaplı cam elyaf/reçine laminat. Kalınlığı hassastır.
- **Prepreg:** kısmen kürlenmiş reçineye emdirilmiş cam kumaş. Preste erir, bakır desenlerin arasını doldurur ve kürlenerek katmanları yapıştırır. Son kalınlığı reçine oranına ve komşu katmanlardaki bakır miktarına bağlıdır, bu yüzden çekirdek kadar hassas değildir. 1080, 2116, 7628 gibi cam tipleriyle (inceden kalına) anılır.

> [!NOTE] Dielektrik sabiti (Dk, εr) çekirdekte ve prepregde, hatta cam tipine göre farklıdır: reçinesi bol ince prepregin Dk’si daha düşüktür. Empedans hesabında "FR-4 = 4,5" gibi genel bir sayı yerine üreticinizin o malzeme ve kalınlık için verdiği değeri kullanın.

## Tipik katman yığınları

### 2 katman

[[fig:stackup-2]]

İki katman da sinyal ve güç taşır; üstteki bir iz için referans düzlem 1,5 mm uzaktadır. Dönüş akımı geniş alana yayılır, döngüler büyür ve kontrollü empedanslı izler çok genişler. Alt katmanı olabildiğince kesintisiz GND bırakın, izleri çoğunlukla üstte çizin.

### 4 katman

[[fig:stackup-4]]

SIG / GND / PWR / SIG. Her dış sinyal katmanı ince bir prepregle (~0,2 mm) bir düzlemin hemen yanındadır. 2 katmandan sonraki olağan adım budur ve EMI ile empedans sorunlarının çoğunu çözer. L4’ün referansı güç düzlemidir; dekuplaj kondansatörleri PWR’yi GND’ye bağladığı için yüksek frekansta bu da çalışır, ama sinyallerin katman değiştirdiği yerin yakınında bir kondansatör bulunmalıdır.

### 6 katman

[[fig:stackup-6]]

SIG / GND / SIG / PWR / GND / SIG. İç L3 katmanı iki düzlem arasında bir stripline olur; hızlı veya gürültülü sinyaller için iyi korunmuş bir katmandır. L4/L5 arasındaki dielektrik inceyse bu çift yüksek frekansta işe yarayan bir düzlem kapasitesi ekler ([[lesson:pdn|güç dağıtımı dersi]]).

İyi bir katman yığınının kuralları:

1. Her sinyal katmanı bir referans düzlemin komşusudur ve ona yakındır.
2. Aralarında düzlem olmayan iki sinyal katmanından kaçının; kaçınılmazsa izleri birbirine dik çizin.
3. Mümkünse PWR ve GND düzlemleri birbirine yakındır.
4. Yığın merkeze göre simetriktir.

## Dönüş akımı nereden akar?

[[fig:return-path]]

Her sinyal akımı kaynağına geri döner. DC’de ve düşük frekansta dönüş akımı en düşük dirençli yolu izler ve düzleme geniş biçimde yayılır. Frekans yükseldikçe endüktans baskın olur ve akım **en düşük endüktanslı yolu**, yani izin hemen altındaki düzlemi seçer. Her hızlı dijital kenarın içerdiği MHz bölgesinde dönüş akımının neredeyse tamamı izin altında, iki yanında birkaç dielektrik kalınlığı (h) genişliğinde bir bantta akar. Döngü alanını iz ile referans düzlemi arasındaki mesafe belirler.

## Düzlem yarıkları üzerinden iz geçirmeyin

Bir iz referans düzlemindeki bir boşluğun (iki güç bölgesi arasındaki yarık, oluk, birleşmiş via boşlukları) üzerinden geçerse dönüş akımı onu izleyemez ve boşluğun etrafından dolanır. Döngü büyür, empedans boşlukta sıçrar, döngü ışıma yapar ve gürültü toplar.

- İzi kesintisiz düzlem üzerinden götürün; gerekirse yarığı veya izi taşıyın.
- Geçiş kaçınılmazsa boşluğun iki yakasını geçiş noktasının hemen yanında küçük bir seramik kondansatörle (stitching capacitor) birleştirin.
- Katman değişiminde referans bir GND düzleminden diğerine geçiyorsa sinyal via’sının yanına bir GND via’sı, GND’den PWR’ye geçiyorsa yakına bir dekuplaj kondansatörü koyun.
- Toprak düzlemini varsayılan olarak "analog" ve "dijital" diye bölmeyin; tek, kesintisiz bir toprak ve dikkatli yerleşim çoğu zaman daha iyidir.

## Simetrik tutun

Laminasyonda ve lehimlemede bakır ve laminat farklı oranlarda genleşir. Yığın merkezine göre ayna simetrik değilse kart eğilir veya burulur. IPC-6012, yüzey montajlı parça içeren kartlarda eğilme ve burulmayı **%0,75** ile, diğerlerinde %1,5 ile sınırlar. Bakır ağırlıklarını ve dielektrik kalınlıklarını aynalayın (L1 = L6, L2 = L5…), tam dolu bir düzlemin karşısındaki boş katmana bakır dolgu (thieving) ekleyin.

## Dielektrik kalınlığı empedansı belirler

Bir microstrip’in empedansı esas olarak iz genişliğinin dielektrik kalınlığına oranına (w/h) ve εr’ye bağlıdır. 1 oz (35 µm) bakır ve εr = 4,3 FR-4 üzerinde 50 Ω microstrip için:

- **4 katman**, L1 ile L2 arasında 0,2 mm prepreg: gereken genişlik yaklaşık **0,359 mm**.

[[calc:impedance?mode=synth&st=microstrip&Z=50&h=0.2&t=35&er=4.3|4 katmanlı örneği aç]]

- **2 katman**, L1 ile alt GND arasında 1,5 mm çekirdek: yaklaşık **2,875 mm**. Bu çoğu paddan geniştir, pratikte kullanılamaz.

[[calc:impedance?mode=synth&st=microstrip&Z=50&h=1.5&t=35&er=4.3|2 katmanlı örneği aç]]

- Dielektriği 0,1 mm’ye indirirseniz genişlik de kabaca yarıya, **0,169 mm**’ye iner.

Prepreg kalınlığı preslemeden sonra değişebilir. 0,2 mm için tasarlanmış 0,36 mm’lik bir iz, dielektrik 0,18 mm çıkarsa yaklaşık **46,9 Ω**, 0,22 mm çıkarsa **52,8 Ω** olur. h’deki ±%10’luk sapma yaklaşık ±3 Ω (≈ ±%6) fark yaratır.

[[calc:impedance?w=0.36&h=0.18&t=35&er=4.3|0,18 mm dielektrik durumunu aç]]

> [!RULE] Kontrollü empedanslı kartlarda çizime hedef değeri ve toleransı (yaygın olarak ±%10) yazın; iz genişliğini üreticinin kendi alan çözücüsüyle ayarlamasına izin verin. Lehim maskesi microstrip empedansını bir miktar düşürür; basit microstrip formülü bunu içermez.

İç katmanlarda izler stripline olur ve aynı empedans için daha dar çıkar; ayrıntılar [[lesson:impedance|kontrollü empedans dersinde]].

## Sık yapılan hatalar

- Katman yığınına iz çizimi bittikten sonra karar vermek.
- Aralarında düzlem olmayan iki komşu sinyal katmanı (geniş yüzlü karışma).
- Hızlı sinyallerin altındaki toprak düzlemini bölmek.
- Üreticiye sormadan nominal prepreg kalınlığını ve genel bir Dk değerini kullanmak.
- Katman değişiminin referans düzlemini de değiştirdiğini unutmak.

> [!QUIZ] Aynı yerleşimle bile 4 katmanlı bir kart neden genellikle 2 katmanlıdan çok daha iyi EMI sonucu verir?
> Her dış sinyal katmanının ~0,2 mm altında kesintisiz bir düzlem vardır. Dönüş akımı izin hemen altından akar ve döngü alanı küçülür; 2 katmanlı kartta referans 1,5 mm uzaktadır ve çoğu zaman kesintilidir.

> [!QUIZ] Bir saat izi, referans aldığı güç düzleminde 3,3 V ve 1,8 V bölgeleri arasındaki yarığın üzerinden geçiyor. Ne olur, nasıl düzeltilir?
> Dönüş akımı yarığın etrafından dolanır; döngü büyür, empedans süreksizliği ve ışıma oluşur. İzi kesintisiz bir bölgenin üzerinden götürün, GND’yi referans alan bir katmana taşıyın veya geçişin yanına yarığı köprüleyen bir kondansatör koyun.

> [!QUIZ] Prepreg planlanandan %10 ince çıkarsa microstrip empedansı artar mı, azalır mı?
> Azalır. İz düzleme yaklaşınca birim uzunluk kapasitesi artar. Örnekte 0,36 mm’lik iz 0,2 mm’de 49,9 Ω iken 0,18 mm’de yaklaşık 46,9 Ω olur.

## Kontrol listesi

- Katman yığını iz çiziminden önce üreticiyle netleştirildi; kalınlıklar ve Dk değerleri onların verisi.
- Her sinyal katmanının komşusu kesintisiz bir referans düzlem.
- Kritik izler hiçbir düzlem yarığının üzerinden geçmiyor.
- Katman değişimlerinde GND via’sı veya dekuplaj kondansatörü var.
- Yığın simetrik, bakır dağılımı dengeli.
- Kontrollü empedans için hedef ve tolerans çizimde.
`,
    en: `
## Why it matters

The stack-up is the order and thickness of the copper and dielectric layers. Almost everything depends on it: trace impedance, the path of return currents, crosstalk, EMI, power distribution, and even whether the board stays flat. Changing it later means recalculating every controlled-impedance trace, so choose the stack-up before routing, together with your fabricator.

## Building blocks

- **Copper foil:** specified by weight; ½ oz ≈ 17 µm, 1 oz ≈ 35 µm, 2 oz ≈ 70 µm. Outer layers usually start with thin foil and are built up by hole plating: per IPC-6012, an outer layer that starts from ½ oz must end up with at least 33.4 µm for Class 1–2. Inner layers are not plated and lose a little copper in processing (at least 24.9 µm for 1 oz).
- **Core:** a fully cured glass-fibre/resin laminate with copper on both sides. Its thickness is accurate.
- **Prepreg:** glass cloth impregnated with partly cured resin. In the press it melts, fills the gaps between copper features and cures, bonding the layers together. Its final thickness depends on the resin content and on how much copper the neighbouring layers carry, so it is less accurate than a core. Prepregs are named by glass style, such as 1080, 2116 and 7628 (thin to thick).

> [!NOTE] The dielectric constant (Dk, εr) differs between core and prepreg, and even by glass style: a resin-rich thin prepreg has a lower Dk. For impedance calculations, use the value your fabricator gives for that material and thickness rather than a generic "FR-4 = 4.5".

## Typical stack-ups

### 2 layers

[[fig:stackup-2]]

Both layers carry signals and power; for a trace on top, the reference plane is 1.5 mm away. The return current spreads wide, loops get large and controlled-impedance traces become very wide. Keep the bottom layer as unbroken GND as you can and route mostly on top.

### 4 layers

[[fig:stackup-4]]

SIG / GND / PWR / SIG. Each outer signal layer sits on thin prepreg (~0.2 mm) right next to a plane. This is the usual step up from 2 layers and it solves most EMI and impedance problems. L4 references the power plane; that works at high frequency because decoupling capacitors tie PWR to GND, but keep a capacitor close to where signals change layers.

### 6 layers

[[fig:stackup-6]]

SIG / GND / SIG / PWR / GND / SIG. The inner L3 layer becomes a stripline between two planes, a well-shielded layer for fast or noisy signals. If the dielectric between L4 and L5 is thin, the pair adds plane capacitance that helps at high frequency (see the [[lesson:pdn|power distribution lesson]]).

Rules for a good stack-up:

1. Every signal layer is adjacent to, and close to, a reference plane.
2. Avoid two signal layers next to each other with no plane between them; if you can’t, route them at right angles.
3. Where possible, PWR and GND planes are close together.
4. The stack is symmetric about its centre.

## Where the return current flows

[[fig:return-path]]

Every signal current returns to its source. At DC and low frequency the return current takes the path of least resistance and spreads widely across the plane. As frequency rises, inductance takes over and the current chooses the **path of least inductance**: the plane directly under the trace. In the MHz range, which every fast digital edge contains, almost all of it flows in a band under the trace, a few dielectric heights (h) wide on each side. The loop area is set by the distance between the trace and its reference plane.

## Don’t route over plane splits

If a trace crosses a gap in its reference plane (a split between two power areas, a slot, merged via clearances), the return current can’t follow it and detours around the gap. The loop grows, the impedance jumps at the gap, and the loop radiates and picks up noise.

- Route the trace over a solid plane; move the split or the trace if needed.
- If a crossing is unavoidable, bridge the two sides of the gap with a small ceramic capacitor (a stitching capacitor) right next to the crossing.
- At a layer change, if the reference moves from one GND plane to another, place a GND via next to the signal via; if it moves from GND to PWR, place a decoupling capacitor nearby.
- Don’t split the ground plane into "analog" and "digital" by default; one solid ground with careful placement usually works better.

## Keep it symmetric

During lamination and soldering, copper and laminate expand at different rates. If the stack is not mirror-symmetric about its centre, the board bows or twists. IPC-6012 limits bow and twist to **0.75 %** for boards with surface-mount parts and 1.5 % for others. Mirror copper weights and dielectric thicknesses (L1 = L6, L2 = L5…), and add copper fill (thieving) to a sparse layer that faces a full plane.

## Dielectric thickness drives impedance

Microstrip impedance depends mainly on the ratio of trace width to dielectric height (w/h) and on εr. For a 50 Ω microstrip with 1 oz (35 µm) copper on FR-4 with εr = 4.3:

- **4 layers**, 0.2 mm prepreg between L1 and L2: the required width is about **0.359 mm**.

[[calc:impedance?mode=synth&st=microstrip&Z=50&h=0.2&t=35&er=4.3|Open the 4-layer example]]

- **2 layers**, 1.5 mm core between L1 and the bottom GND: about **2.875 mm**. That is wider than most pads and not practical.

[[calc:impedance?mode=synth&st=microstrip&Z=50&h=1.5&t=35&er=4.3|Open the 2-layer example]]

- Reduce the dielectric to 0.1 mm and the width roughly halves too, to **0.169 mm**.

Prepreg thickness can vary after pressing. A 0.36 mm trace designed for 0.2 mm comes out at about **46.9 Ω** if the dielectric is 0.18 mm, and **52.8 Ω** at 0.22 mm. A ±10 % change in h gives roughly ±3 Ω (≈ ±6 %).

[[calc:impedance?w=0.36&h=0.18&t=35&er=4.3|Open the 0.18 mm dielectric case]]

> [!RULE] For controlled-impedance boards, put the target value and tolerance (commonly ±10 %) on the drawing and let the fabricator adjust the trace width with its own field solver. Solder mask lowers microstrip impedance somewhat; the plain microstrip formula does not include it.

On inner layers traces become striplines and come out narrower for the same impedance; see the [[lesson:impedance|controlled impedance lesson]].

## Common mistakes

- Deciding the stack-up after routing is finished.
- Two adjacent signal layers with no plane between them (broadside crosstalk).
- Splitting the ground plane under fast signals.
- Using the nominal prepreg thickness and a generic Dk without asking the fabricator.
- Forgetting that a layer change also changes the reference plane.

> [!QUIZ] Why does a 4-layer board usually give much better EMI results than a 2-layer board, even with the same placement?
> Every outer signal layer has a solid plane about 0.2 mm below it. The return current flows right under the trace and the loop area shrinks; on a 2-layer board the reference is 1.5 mm away and often broken.

> [!QUIZ] A clock trace crosses a split between the 3.3 V and 1.8 V areas of the power plane it references. What happens, and how do you fix it?
> The return current detours around the split; the loop grows, and you get an impedance discontinuity and radiation. Route the trace over a solid area, move it to a layer that references GND, or bridge the split with a capacitor next to the crossing.

> [!QUIZ] If the prepreg comes out 10 % thinner than planned, does the microstrip impedance go up or down?
> Down. With the trace closer to the plane, the capacitance per unit length rises. In the example, the 0.36 mm trace is 49.9 Ω at 0.2 mm and about 46.9 Ω at 0.18 mm.

## Checklist

- The stack-up was settled with the fabricator before routing; thicknesses and Dk values are theirs.
- Every signal layer is next to a solid reference plane.
- No critical trace crosses a plane split.
- Layer changes have a GND via or a decoupling capacitor nearby.
- The stack is symmetric and copper coverage is balanced.
- Target and tolerance for controlled impedance are on the drawing.
`,
  },
};
