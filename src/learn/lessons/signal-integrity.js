export default {
  body: {
    tr: `
## Neden önemli?

Sinyal bütünlüğü (SI), alıcıya ulaşan dalga şeklinin doğru okunup okunamayacağıyla ilgilenir: temiz seviyeler, tek yönde ilerleyen (monoton) kenarlar ve zamanında varış. Bozulduğunda çınlama, aşma, çift saat sayma, ara sıra görülen veri hataları ve EMI testinde kalma görürsünüz; çoğu zaman yalnızca bazı kartlarda veya bazı sıcaklıklarda. Kart seviyesindeki SI sorunlarının çoğu dört kaynaktan gelir: **yansımalar**, **karışma**, **zamanlama kayması (skew)** ve **güç ile topraktaki gürültü**.

Bu ders [[lesson:impedance|kontrollü empedans dersinin]] üzerine kuruludur.

## Yansımalar

Z0 empedanslı bir hatta ilerleyen dalga farklı bir ZL empedansıyla karşılaşınca bir kısmı geri yansır:

\`\`\`
Γ = (ZL − Z0) / (ZL + Z0)
\`\`\`

| 50 Ω’luk hattın sonundaki yük | Γ | Sonuç |
|---|---|---|
| 50 Ω (uyumlu) | 0 | Yansıma yok |
| Açık uç (birkaç pF’lık CMOS girişi) | ≈ +1 | Tam yansıma; uçta gerilim iki katına çıkar |
| Kısa devre | −1 | Ters işaretli tam yansıma |
| 75 Ω | +0,2 | %20’si aynı işaretle yansır |
| 25 Ω | −0,33 | Üçte biri ters işaretle yansır |

Aynı formül kaynak tarafında da geçerlidir; orada ZL yerine sürücünün çıkış empedansı konur.

### Örnek: sonlandırılmamış 3,3 V’luk hat

Çıkış empedansı yaklaşık 15 Ω olan 3,3 V’luk bir sürücü, uzun bir 50 Ω hat üzerinden bir CMOS girişini sürüyor. Basit kayıpsız modelde:

1. Sürücü ve hat bir bölücü oluşturur: hatta giren basamak 3,3 × 50 / (15 + 50) ≈ **2,54 V** olur.
2. Açık uçta Γ ≈ +1’dir; alıcı yaklaşık **5,08 V** görür, yani 1,78 V aşma.
3. Sürücü tarafında Γ = (15 − 50)/(15 + 50) ≈ −0,54’tür; dalga ters dönerek geri gelir. Alıcıdaki gerilim önce yaklaşık **2,34 V**’a düşer, sonra yaklaşık **3,82 V**’a çıkar: yavaşça 3,3 V’a oturan bir çınlama.

Gerçek kenarlar, kayıplar ve giriş koruma diyotları bu tepeleri yumuşatır; ama desen gerçektir ve diyotlardan akan akım başlı başına bir sorundur.

## Sonlandırma

Sonlandırma, hattın bir ucunu Z0 gibi gösterir ve yansımayı yutar.

| Tür | Nasıl | Artı ve eksiler | Tipik kullanım |
|---|---|---|---|
| Seri (kaynak) | Sürücüde R, R + R_sürücü ≈ Z0 | Tek parça, DC güç yok. Yansıma dönene kadar hat boyunca yarım genlikli basamak ilerler | Noktadan noktaya, uçta tek yük |
| Paralel (yük) | Alıcıda GND’ye veya V_TT’ye R = Z0 | Hattın her yerinde temiz kenar; sürekli DC akım | Sonlandırma beslemesi olan veri yolları |
| Thevenin | R1 VCC’ye, R2 GND’ye, R1∥R2 = Z0 | Orta seviye öngerilim sağlar; sürekli DC akım | Eski veri yolu standartları, öngerilimleme |
| AC | R ≈ Z0 ile seri C, GND’ye | DC akım yok; C gecikme ekler, boyutlandırılmalıdır | Saat hatları, düşük güçlü hatlar |
| Diferansiyel | Alıcıda çiftin arasına R ≈ Zdiff | Basit, çoğu zaman alıcının içindedir | LVDS ve benzeri çiftler |

Örneğimizde Rs = 50 − 15 = 35 Ω’dur; sürücü bacağının hemen yanına konan **33 Ω**’luk bir direnç iyi bir seçimdir. Hatta giren basamak 3,3 × 50 / (15 + 33 + 50) ≈ 1,68 V olur, açık uçta yaklaşık 3,37 V’a çıkar; kaynakta kalan yansıma (Γ ≈ −0,02) ihmal edilebilir.

AC sonlandırmada C’yi, R·C zaman sabiti hattın gidiş-dönüş gecikmesinin rahatça üzerinde kalacak şekilde seçin; sonra simülasyonla veya ölçümle doğrulayın.

> [!TIP] Çıkış empedansı veri sayfasında nadiren yazar; IBIS modelinden alın. Emin değilseniz sürücünün yanına bir seri direnç yeri koyun, değeri tezgâhta ayarlarsınız.

> [!WARN] Çok yüklü (multi-drop) bir hatta seri sonlandırma kullanmayın: ortadaki yükler, yansıma geçene kadar yarım genlikli basamağı görür ve iki kez anahtarlanabilir.

## Çınlama ve aşma

Çınlama, düzeltilmemiş yansımalardan ve kılıf bacakları, uzun stub’lar ve konnektörlerin L-C rezonansından doğar. Önemlidir, çünkü:

- Mutlak maksimum değerin üzerindeki aşma girişleri zorlar ve koruma diyotlarından akım akıtır.
- Geri çınlama (ring-back) giriş eşiğini yeniden geçebilir; tek bir saat kenarı iki kez sayılır.
- Hızlı çınlama ışıma yapar: EMI.

> [!NOTE] Probla kısa bir toprak yayı kullanarak ölçün. Uzun toprak kablosu, temiz bir sinyali çınlıyormuş gibi gösterecek kadar endüktans ekler.

## Karışma (crosstalk)

Komşu izler karşılıklı kapasite ve endüktansla birbirine bağlanır: anahtarlanan **saldırgan** hat, **kurban** hatta gürültü oluşturur. **Yakın uç karışma (NEXT)** saldırganın sürücüsüne doğru geri, **uzak uç karışma (FEXT)** sinyalle birlikte ileri gider. Stripline’da FEXT neredeyse sıfırlanır, microstrip’te sıfırlanmaz.

Karışma hesaplayıcısı NEXT’i H. Johnson’ın kuralıyla tahmin eder:

\`\`\`
X ≈ K / (1 + (D/H)²)
\`\`\`

D merkezden merkeze mesafe, H referans düzleme yükseklik, K ≤ 1 ise kuplajlı uzunluğun etkisidir. **D/H’yi iki katına çıkarmak karışmayı kabaca dörtte birine indirir.**

Örnek: 0,2 mm boşluklu, 0,2 mm genişliğinde iki microstrip iz, düzlemden 0,1 mm yukarıda, 3,3 V genlik, en kötü durum (K = 1). D/H = 4 ile karışma yaklaşık **%5,88**’dir, kurban hatta kabaca **194 mV**. 3W kuralı sağlanmaz; %5 hedefi için yaklaşık **0,236 mm** boşluk gerekir.

[[calc:crosstalk?st=micro&s=0.2&s_u=mm&w=0.2&w_u=mm&h=0.1&h_u=mm&V=3.3&tg=5|Karışma örneğini aç]]

- Boşluk 0,4 mm olursa (D = 3w) yaklaşık **%2,70**; 3W kuralı sağlanır.
- Aynı izler düzlemden 0,2 mm yukarıdaysa D/H = 2 ve yaklaşık **%20**. Yükseklik, aralık kadar önemlidir.
- 1 ns kenarla yalnızca 20 mm paralel giden izlerde K ≈ 0,24 ve yaklaşık **%1,43**. NEXT ancak kuplajlı uzunluğun gidiş-dönüş süresi yükselme süresine ulaşınca doyar.

[[calc:crosstalk?st=micro&s=0.2&s_u=mm&w=0.2&w_u=mm&h=0.1&h_u=mm&V=3.3&tg=5&km=len&L=20&L_u=mm&tr=1&tr_u=ns&er=3.3|20 mm paralel bölüm]]

> [!RULE] 3W kuralı (merkezden merkeze ≥ 3 × genişlik) hızlı bir kontroldür ama yüksekliği görmez: kalın dielektrik üzerinde 3W yetmez. D/H’ye bakın.

## Uzunluk eşleme ve skew

Birlikte varması gereken sinyallerin (diferansiyel çiftin iki yarısı, paralel bir veri yolu ve saati) arayüzün belirlediği bir **skew bütçesi** vardır. Uzunluk farkı zamana dönüşür:

\`\`\`
skew = ΔL · t_pd
\`\`\`

εeff = 3,3 olan microstrip’te t_pd ≈ 6,06 ps/mm’dir: 5 mm fark yaklaşık **30,3 ps** eder ve 10 ps’lik bütçe yalnızca yaklaşık **1,65 mm**’ye izin verir. Stripline’da (εeff = 4,3) sinyal daha yavaştır; aynı bütçe yaklaşık **1,45 mm**’ye izin verir.

[[calc:signal?er=3.3&dL=5&dL_u=mm&sk=10&sk_u=ps|Microstrip skew]] [[calc:signal?er=4.3&dL=5&dL_u=mm&sk=10&sk_u=ps|Stripline skew]]

- Sinyaller farklı katmanlardan gidiyorsa uzunluğu değil **gecikmeyi** eşleyin.
- Diferansiyel çiftte farkı oluştuğu yerin yakınında (dönüşler, pin çıkışı) düzeltin; uzak uçta tek bir serpantinle değil.
- Serpantin kıvrımlarını h’nin birkaç katı aralıklı tutun ki kendi kendine kuplaj yapmasın.
- Bütçeye göre eşleyin, "araç ne kadar izin veriyorsa o kadar sıkı" değil.

## Stub’lar ve vialar

Stub (saplama), sinyalin girip geri döndüğü her daldır: ikinci bir yüke giden T bağlantısı, test noktası bacağı, delik geçişli bir vianın kullanılmayan kısmı. Kısa bir stub küçük bir kapasite gibi davranır; uzun bir stub yansıtır ve yaklaşık şu frekansta rezonansa girer:

\`\`\`
f ≈ c / (4 · L_stub · √εeff)
\`\`\`

FR-4’te (εr ≈ 4,3) 1,5 mm’lik bir via stub’ı yaklaşık 24 GHz’de rezonansa girer; padler kapasite eklediği için pratikte daha aşağıda. Bu, çok gigabitlik bağlantılarda önemlidir: vianın çoğunu kullanan katman geçişleri seçin, geri delme (back-drill) yapın veya kör via kullanın. Her via aynı zamanda küçük bir süreksizliktir: hızlı netlerde katman değişimini azaltın, çift vialarını simetrik tutun ve her sinyal viasının yanına bir toprak viası koyun.

## Toprak sıçraması (ground bounce)

Endüktanstan geçen akım değişirse gerilim oluşur: **V = L · di/dt**. Birçok çıkış birlikte anahtarlandığında akımları kılıfın aynı toprak pinlerini ve vialarını paylaşır. 8 çıkış birlikte 1 ns içinde 1 nH’lik bir toprak yolundan 200 mA çekerse entegrenin iç toprağı 1 nH × 0,2 A / 1 ns = **0,2 V** sıçrar; sessiz çıkışlar ve giriş eşikleri de onunla birlikte oynar.

Azaltmak için: daha çok toprak pini ve viası, düşük endüktanslı dekuplaj ([[lesson:pdn|güç dağıtımı dersi]]), daha yavaş kenarlar (slew-rate ayarı, seri direnç) ve geniş veri yollarını aynı anda anahtarlamamak.

## Yeni başlayanların sık yaptığı hatalar

- Yavaş saatin SI sorunu olmadığı anlamına geldiğini sanmak: belirleyici olan yükselme süresidir.
- Saat hattını "prototipte çalıştı" diye sonlandırmasız bırakmak.
- Çok yüklü bir hatta seri sonlandırma kullanmak.
- Düzlem yarıklarının üzerinden geçmek; dönüş yolu viası olmadan katman değiştirmek.
- Karışmayı yalnızca aralığa bakarak değerlendirip düzleme yüksekliği unutmak.
- Skew şartı olmayan sinyallere serpantin eklemek.
- Uzun prob toprak kablosundan gelen çınlamanın peşine düşmek.

> [!QUIZ] 50 Ω’luk bir hat 75 Ω’luk bir yükle bitiyor. Dalganın ne kadarı, hangi işaretle yansır?
> Γ = (75 − 50)/(75 + 50) = 0,2: %20’si aynı işaretle yansır; alıcı küçük bir aşma basamağı görür.

> [!QUIZ] Hat boyunca üç yükü süren bir saat için seri sonlandırma neden kötü bir seçimdir?
> Seri sonlandırmada hatta yalnızca yarım basamak ilerler; tam seviye her noktada ancak açık uçtan dönen yansıma oradan geçince oluşur. Ortadaki yükler basamaklı bir kenar görür ve eşiği iki kez geçebilir. Uçta paralel veya AC sonlandırma kullanın ya da her yüke ayrı noktadan noktaya saat hattı çekin.

> [!QUIZ] Hangisi NEXT’i daha çok azaltır: dielektrik yüksekliğini yarıya indirmek mi, merkezden merkeze mesafeyi iki katına çıkarmak mı?
> Bu modelde ikisi aynıdır: ikisi de D/H’yi iki katına çıkarır ve D/H büyükken karışmayı kabaca dörtte birine indirir. Ancak yüksekliği azaltmak empedansı da düşürür; hedefi korumak için izi daraltmanız gerekir.

## Kontrol listesi

- Yükselme süreleri ve net uzunlukları biliniyor; l_r/6’dan uzun netler gözden geçirildi.
- Her iletim hattı neti için bir sonlandırma stratejisi var.
- Hiçbir kontrollü iz düzlem yarığından geçmiyor; katman değişimlerinde dikiş viaları var.
- Karışma yalnızca aralıkla değil D/H ile kontrol edildi.
- Skew bütçeleri arayüz spesifikasyonundan alındı; yalnızca gereken yerde eşleme yapıldı.
- Stub’lar en aza indirildi; hızlı bağlantılarda via geçişleri incelendi.
- Anahtarlanan çıkışların yakınında yeterli toprak pini, viası ve dekuplaj var.
`,
    en: `
## Why it matters

Signal integrity (SI) asks whether the waveform reaching the receiver can be read correctly: clean levels, monotonic edges and arrival on time. When it fails you see ringing, overshoot, double clocking, intermittent data errors and failed EMI tests, often only on some boards or at some temperatures. Most board-level SI problems come from four sources: **reflections**, **crosstalk**, **timing skew** and **noise on power and ground**.

This lesson builds on [[lesson:impedance|controlled impedance and transmission lines]].

## Reflections

When a wave travelling on a line of impedance Z0 meets a different impedance ZL, part of it reflects:

\`\`\`
Γ = (ZL − Z0) / (ZL + Z0)
\`\`\`

| Load at the end of a 50 Ω line | Γ | Result |
|---|---|---|
| 50 Ω (matched) | 0 | No reflection |
| Open (CMOS input, a few pF) | ≈ +1 | Full reflection; the voltage doubles at the end |
| Short | −1 | Full reflection, inverted |
| 75 Ω | +0.2 | 20 % reflects with the same polarity |
| 25 Ω | −0.33 | A third reflects, inverted |

The same formula applies at the source, with the driver’s output impedance in place of ZL.

### Example: an unterminated 3.3 V line

A 3.3 V driver with about 15 Ω output impedance drives a long 50 Ω line into a CMOS input. In the simple lossless model:

1. Driver and line form a divider: the launched step is 3.3 × 50 / (15 + 50) ≈ **2.54 V**.
2. At the open end Γ ≈ +1, so the receiver sees about **5.08 V**: 1.78 V of overshoot.
3. At the driver Γ = (15 − 50)/(15 + 50) ≈ −0.54, so the wave comes back inverted. The receiver falls to about **2.34 V**, then rises to about **3.82 V**: ringing that slowly settles at 3.3 V.

Real edges, losses and input clamp diodes soften these peaks, but the pattern is real, and the clamp-diode current is a problem of its own.

## Termination

Termination makes one end of the line look like Z0, so the reflection is absorbed.

| Type | How | Pros and cons | Typical use |
|---|---|---|---|
| Series (source) | R at the driver, R + R_drv ≈ Z0 | One part, no DC power. A half-amplitude step travels along the line until the reflection returns | Point-to-point, single load at the end |
| Parallel (load) | R = Z0 to GND or V_TT at the receiver | Clean edge along the whole line; continuous DC current | Buses with a termination supply |
| Thevenin | R1 to VCC, R2 to GND, R1∥R2 = Z0 | Sets a mid-level bias; constant DC current | Older bus standards, biasing |
| AC | R ≈ Z0 in series with C to GND | No DC current; C adds delay and must be sized | Clocks, low-power lines |
| Differential | R ≈ Zdiff across the pair at the receiver | Simple, often built into the receiver | LVDS and similar pairs |

In the example Rs = 50 − 15 = 35 Ω, so a **33 Ω** resistor right at the driver pin is a good choice. The launched step becomes 3.3 × 50 / (15 + 33 + 50) ≈ 1.68 V and doubles at the open end to about 3.37 V; the residual reflection at the source (Γ ≈ −0.02) is negligible.

For AC termination, choose C so that the R·C time constant is well above the line’s round-trip delay, then confirm by simulation or measurement.

> [!TIP] Output impedance is rarely in the datasheet; take it from the IBIS model. When unsure, place a series resistor footprint near the driver so you can tune the value on the bench.

> [!WARN] Don’t use series termination on a multi-drop line: loads in the middle see the half-amplitude step until the reflection passes, and may switch twice.

## Ringing and overshoot

Ringing comes from uncorrected reflections and from the L-C resonance of package leads, long stubs and connectors. It matters because:

- Overshoot beyond the absolute maximum rating stresses inputs and drives current through clamp diodes.
- Ring-back can cross the input threshold again, so one clock edge counts twice.
- Fast ringing radiates: EMI.

> [!NOTE] Measure with a short ground spring on the probe. A long ground lead adds enough inductance to make a clean signal look like it rings.

## Crosstalk

Neighbouring traces couple through mutual capacitance and inductance, so a switching **aggressor** induces noise on a **victim**. **Near-end crosstalk (NEXT)** travels back towards the aggressor’s driver; **far-end crosstalk (FEXT)** travels with the signal. In stripline FEXT nearly cancels; in microstrip it does not.

The crosstalk calculator estimates NEXT with H. Johnson’s rule:

\`\`\`
X ≈ K / (1 + (D/H)²)
\`\`\`

D is the centre-to-centre distance, H the height above the reference plane, and K ≤ 1 accounts for the coupled length. **Doubling D/H cuts crosstalk to roughly a quarter.**

Example: two 0.2 mm wide microstrip traces with a 0.2 mm gap, 0.1 mm above the plane, 3.3 V swing, worst case K = 1. D/H = 4 gives about **5.88 %**, roughly **194 mV** on the victim. The 3W rule fails, and a 5 % target needs a gap of about **0.236 mm**.

[[calc:crosstalk?st=micro&s=0.2&s_u=mm&w=0.2&w_u=mm&h=0.1&h_u=mm&V=3.3&tg=5|Open the crosstalk example]]

- With a 0.4 mm gap (D = 3w): about **2.70 %**, and the 3W rule passes.
- The same traces 0.2 mm above the plane: D/H = 2, about **20 %**. Height matters as much as spacing.
- Only 20 mm of parallel run with 1 ns edges: K ≈ 0.24, about **1.43 %**. NEXT saturates only once the coupled length’s round trip reaches the rise time.

[[calc:crosstalk?st=micro&s=0.2&s_u=mm&w=0.2&w_u=mm&h=0.1&h_u=mm&V=3.3&tg=5&km=len&L=20&L_u=mm&tr=1&tr_u=ns&er=3.3|20 mm parallel run]]

> [!RULE] The 3W rule (centre-to-centre ≥ 3 × width) is a quick check, but it ignores height: over a thick dielectric 3W is not enough. Look at D/H.

## Length matching and skew

Signals that must arrive together (both halves of a differential pair, a parallel bus and its clock) have a **skew budget** set by the interface. A length mismatch turns into time:

\`\`\`
skew = ΔL · t_pd
\`\`\`

On microstrip with εeff = 3.3, t_pd ≈ 6.06 ps/mm: a 5 mm mismatch is about **30.3 ps**, and a 10 ps budget allows only about **1.65 mm**. On stripline (εeff = 4.3) the signal is slower, and the same budget allows about **1.45 mm**.

[[calc:signal?er=3.3&dL=5&dL_u=mm&sk=10&sk_u=ps|Microstrip skew]] [[calc:signal?er=4.3&dL=5&dL_u=mm&sk=10&sk_u=ps|Stripline skew]]

- Match **delay**, not length, when signals run on different layers.
- In a differential pair, correct the mismatch close to where it is created (bends, pin escape), not with one serpentine at the far end.
- Keep serpentine loops several times h apart so they don’t couple to themselves.
- Match to the budget, not "as tight as the tool allows".

## Stubs and vias

A stub is any branch the signal goes down and back: a T to a second load, a test-point lead, the unused part of a through via. A short stub acts as a small capacitance; a long one reflects and resonates near:

\`\`\`
f ≈ c / (4 · L_stub · √εeff)
\`\`\`

A 1.5 mm via stub in FR-4 (εr ≈ 4.3) resonates around 24 GHz, lower in practice because the pads add capacitance. That matters on multi-gigabit links: choose transitions that use most of the via, back-drill, or use blind vias. Every via is also a small discontinuity: minimise layer changes on fast nets, keep pair vias symmetric, and place a ground via next to each signal via.

## Ground bounce

Current changing through an inductance makes a voltage: **V = L · di/dt**. When many outputs switch together, their currents share the package’s ground pins and vias. If 8 outputs together pull 200 mA through a 1 nH ground path in 1 ns, the chip’s internal ground jumps by 1 nH × 0.2 A / 1 ns = **0.2 V**, and quiet outputs and input thresholds move with it.

Reduce it with more ground pins and vias, low-inductance decoupling (see [[lesson:pdn|power distribution]]), slower edges (slew-rate settings, series resistors) and by not switching wide buses all at once.

## Common beginner mistakes

- Assuming a slow clock means no SI problems: the rise time decides.
- Leaving a clock unterminated because "it worked on the prototype".
- Series termination on a multi-drop line.
- Routing over plane splits; changing layers without a return-path via.
- Judging crosstalk by spacing alone and forgetting the height above the plane.
- Adding serpentines to signals that have no skew requirement.
- Chasing ringing that comes from a long probe ground lead.

> [!QUIZ] A 50 Ω line ends in a 75 Ω load. What fraction of the wave reflects, and with what polarity?
> Γ = (75 − 50)/(75 + 50) = 0.2: 20 % reflects with the same polarity, so the receiver sees a small overshoot step.

> [!QUIZ] Why is series termination a poor choice for a clock that drives three loads along the line?
> With series termination only a half step travels down the line; the full level appears at each point only when the reflection from the open end passes by. Loads in the middle see a staircase edge that can cross the threshold twice. Use parallel or AC termination at the end, or a separate point-to-point clock line to each load.

> [!QUIZ] Which lowers NEXT more: halving the dielectric height or doubling the centre-to-centre distance?
> In this model they are the same: both double D/H, which cuts crosstalk to roughly a quarter when D/H is large. But a thinner dielectric also lowers the impedance, so you would need narrower traces to stay on target.

## Checklist

- Rise times and net lengths known; nets longer than l_r/6 reviewed.
- Every transmission-line net has a termination strategy.
- No controlled trace crosses a plane split; stitching vias at layer changes.
- Crosstalk checked with D/H, not only spacing.
- Skew budgets taken from the interface specification; matching applied only where needed.
- Stubs minimised; via transitions reviewed on fast links.
- Enough ground pins, vias and decoupling near switching outputs.
`,
  },
};
