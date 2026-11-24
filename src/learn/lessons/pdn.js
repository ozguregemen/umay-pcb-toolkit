export default {
  body: {
    tr: `
## Neden önemli?

Dijital bir entegre akımı kısa darbeler halinde çeker: her saat kenarında binlerce iç düğüm şarj olur, bir işlemci boştan tam yüke nanosaniyeler içinde geçebilir. Hattı besleyen regülatör buna yetişemez: kontrol çevrimi mikrosaniyeler içinde tepki verir ve onunla entegre arasındaki yolun endüktansı vardır. Akımı başka bir şey sağlamazsa besleme çöker; lojik yavaşlar, zamanlamayı kaçırır veya resetlenir.

**Dekuplaj kondansatörleri** yerel yük depolarıdır. Düzlemler, kılıf ve regülatörle birlikte **güç dağıtım ağını (PDN)** oluştururlar. PDN’in görevi, akım değişirken entegrenin pinlerindeki gerilimi tolerans içinde tutmaktır.

## Hedef empedans

PDN’i entegrenin pinlerinden bakıldığında görülen bir Z(f) empedansı olarak düşünün. ΔI’lık bir akım basamağı ΔV ≈ Z · ΔI kadar gerilim değişimi yaratır. Bu yüzden PDN bir **hedef empedansın** altında kalmalıdır:

\`\`\`
Z_hedef = V · dalgalanma / ΔI
\`\`\`

Örnek: %3 dalgalanmaya izin verilen 1,2 V’luk bir hat, en yüksek akım 3 A, en kötü yük basamağı %50 (1,5 A). ΔV = 36 mV, Z_hedef = 36 mV / 1,5 A = **24 mΩ**.

Dalgalanma payı, entegrenin besleme toleransından regülatörün DC doğruluğunun kullandığı kısım çıkarılarak bulunur. Basamak bilinmiyorsa en yüksek akımın %50’si yaygın bir varsayımdır.

## Hangi frekansta akımı kim sağlar?

Tüm bandı tek bir parça karşılayamaz; her biri bir öncekinin yetmediği yerde devreye girer.

| Frekans (yaklaşık) | Sağlayan | Sınırlayan |
|---|---|---|
| DC – ~100 kHz | Regülatör | Kontrol çevrimi bant genişliği |
| ~100 kHz – ~1 MHz | Bulk kondansatörler (onlarca–yüzlerce µF) | ESR ve ESL |
| ~1 MHz – ~100 MHz | Entegreye yakın MLCC’ler | Montaj endüktansı |
| ~100 MHz üstü | Düzlemler, kılıf ve kalıp içi kapasite | Kılıf tasarımı |

Sınırlar parçalara göre değişir. Kart seviyesindeki dekuplaj genellikle 50–200 MHz civarında etkisini yitirir; üstünü kılıf ve kalıp üstlenir. Üst frekans için entegre üreticisinin önerisine uyun.

## Gerçek kondansatör: ESR, ESL ve SRF

Gerçek bir kondansatör seri bir R-L-C devresidir: C kapasitesi, eşdeğer seri direnç **ESR** ve eşdeğer seri endüktans **ESL** (kılıf + pad ve vialar).

\`\`\`
Z(f) = ESR + j(2πf·ESL − 1/(2πf·C))        f_SRF = 1 / (2π·√(ESL·C))
\`\`\`

- Öz rezonans frekansının (SRF) altında kondansatördür: |Z| frekansla düşer.
- SRF’de |Z| en düşük değerine, yaklaşık ESR’ye iner.
- SRF’nin üstünde bir **endüktanstır**: |Z| yükselir ve kapasite değeri değil, yalnızca ESL önemlidir.

Montajlı ESL’i 0,6 nH olan 100 nF’lık bir kondansatör yaklaşık 20,55 MHz’de rezonansa girer. Bunun çok üstünde, aynı kılıftaki on adet 100 nF, tek bir 1 µF’tan iyidir; çünkü birlikte onda bir endüktansa sahiptirler.

## Farklı değerler ve anti-rezonans

Farklı değerler farklı bantları karşılar. Ama bir grubun endüktif olduğu, sıradakinin ise hâlâ kapasitif olduğu aralıkta ikisi bir **paralel rezonans** oluşturur ve |Z| tepe yapar: **anti-rezonans**. Hedefin üstündeki bir tepe, PDN’in o frekansta başarısız olduğu anlamına gelir.

Anti-rezonansı kontrol altında tutmak için:

- Çok sayıda farklı değer yerine **aynı değerden daha çok parça** kullanın; paralel parçalar ESL’i böler.
- Değerler arasında büyük boşluk bırakmayın (yaklaşık on kat aralık yaygındır).
- Daha iyi montajla ESL’i düşürün.
- Bir miktar ESR tepeleri sönümler; aşırı düşük ESR’li bankalar daha sert tepe yapabilir.

> [!WARN] "Her pine 100 nF" bir alışkanlıktır, tasarım yöntemi değil. Empedans eğrisini hedefle karşılaştırın.

## Yerleşim ve montaj endüktansı

Yüksek frekansta montaj döngüsünün (pad, iz, vialar ve entegreye giden düzlem yolu) endüktansı çoğu zaman kondansatörün kendisininkinden büyüktür.

[[fig:decap]]

- Viaları **padlerin hemen yanına** veya pad içine koyun; padi viasına asla uzun bir izle bağlamayın.
- Büyük kılıflarda pad başına iki via kullanın.
- En küçük kondansatörleri entegrenin güç pinlerine en yakına koyun; bulk kondansatörler daha uzakta olabilir.
- Güç ve toprak düzlemlerini birbirine yakın tutun (ince dielektrik); bu yayılma endüktansını düşürür. BGA altında, pin vialarını paylaşan arka yüz kondansatörleri çok etkilidir.

PDN hesaplayıcısındaki ESL alanı bu **toplam montajlı** değerdir: 0402 için 0,4–0,8 nH, 0603 için 0,6–1 nH tipiktir. Düzlemler de C = ε0·εr·A/d kadar kapasite ekler, ama umduğunuzdan azdır: FR-4’te aralarında 0,1 mm bulunan 100 cm²’lik bir düzlem çifti yaklaşık 3,8 nF eder. Neredeyse endüktanssız olduğu için bandın üst ucunda yardımcı olur, bulk yerine geçmez.

## MLCC’lerde DC öngerilim kaybı

Sınıf II seramikler (X5R, X7R) DC gerilim altında kapasite kaybeder. Küçük kılıflar ve bir kılıftaki yüksek değerler en çok kaybeder; anma gerilimine yakın çalışan bir parça nominal değerinin yarısından fazlasını yitirebilir. Sıcaklık ve eskime biraz daha alır.

- Tam o parçanın DC öngerilim (DC bias) eğrisini, hattınızın geriliminde üreticiden okuyun.
- Hesaplayıcıya etiket değerini değil **etkin** kapasiteyi girin.
- Daha yüksek gerilim sınıfı veya daha büyük kılıf çoğu zaman daha çok kapasite korur.

C0G/NP0 parçalarda bu etki yoktur, ama yalnızca küçük değerlerde bulunurlar.

## Çözümlü örnek: bankayı ayarlamak

1,2 V / 3 A’lik hattı ele alalım (Z_hedef = 24 mΩ); regülatör bant genişliği 100 kHz, PDN üst frekansı 100 MHz. Hesaplayıcının varsayılan bankasıyla başlayın: 2 × 22 µF, 4 × 1 µF ve 8 × 100 nF.

[[calc:pdn?V=1.2&rp=3&I=3&st=50|Adım 0: varsayılan banka]]

İki kontrol de başarısız:

- f_reg – f_max arası en yüksek |Z| **100 kHz’de 32,31 mΩ**: alt uçta bulk yetmiyor.
- Toplam kapasite **48,8 µF**, gereken ise **66,31 µF**.
- Ayrıca 22 µF ve 1 µF grupları arasında **yaklaşık 2,6 MHz’de 26,7 mΩ**’luk bir anti-rezonans tepesi var.

**Adım 1: daha çok bulk.** 22 µF adedini 2’den 4’e çıkarın. Toplam kapasite **92,8 µF** olur ve bu kontrol geçer. Alt uç hedefin altına iner; dört paralel parça grubun ESL’ini yarıya indirdiği için 2,6 MHz’deki tepe de iner. En yüksek |Z| artık **100 MHz’de 29,12 mΩ**’dur: üst uç başarısız.

[[calc:pdn?V=1.2&rp=3&I=3&st=50&n0=4|Adım 1: 4 × 22 µF]]

**Adım 2: üst uçta daha az endüktans.** Yaklaşık 20 MHz’in üstünde bütün kondansatörler endüktiftir; işe yarayan, her biri kendi vialarına sahip daha çok paralel parçadır. 8 yerine 12 adet 100 nF ile en yüksek |Z| **100 MHz’de 22,03 mΩ** olur, 24 mΩ’un altında. İki kontrol de geçer.

[[calc:pdn?V=1.2&rp=3&I=3&st=50&n0=4&n2=12|Adım 2: geçen banka]]

Son banka: 4 × 22 µF, 4 × 1 µF ve 12 × 100 nF. Gerçek bir tasarımda aynı işlemi DC öngerilim kaybı düşülmüş kapasite ve yerleşiminizin gerçekten sağlayabildiği ESL ile tekrarlayın.

> [!TIP] Bir grubun ESL’ini düşürmek de üst uca yardım eder, ama grafiğe bakın: sıradaki grupla olan anti-rezonansı keskinleştirebilir.

## Regülatör bant genişliğinden bulk kapasite

Regülatör kendi bant genişliğinin altında gerilimi tutar, üstünde bu iş kondansatörlere kalır. Bu geçiş frekansında bulk kapasite tek başına hedefi sağlamalıdır:

\`\`\`
C_bulk ≥ 1 / (2π · f_reg · Z_hedef)
\`\`\`

100 kHz ve 24 mΩ için bu **66,31 µF** eder. Çevrimi 20 kHz olan daha yavaş bir regülatör beş kat fazlasını, yaklaşık **331,6 µF** ister. Regülatörün veri sayfasına da bakın: birçok regülatör çevrim kararlılığı için çıkış kapasitesi ve ESR aralığı belirtir.

[[calc:pdn?V=1.2&rp=3&I=3&st=50&fr=20|20 kHz’lik regülatör]]

## Sık yapılan hatalar

- MLCC’lerin nominal kapasitesini DC öngerilim kaybını düşünmeden kullanmak.
- Kondansatör padleri ile vialar arasında uzun izler bırakmak.
- "Tüm frekansları kapsamak" için çok sayıda farklı değer kullanıp anti-rezonans tepeleri yaratmak.
- 100 MHz’de 1 µF’ın 100 nF’tan daha iyi olacağını sanmak.
- Bulk kapasiteyi unutmak veya regülatörün çıkış kondansatörü şartlarını göz ardı etmek.

> [!QUIZ] Gerilim ve dalgalanma aynı kalırken bir hattın en yüksek akımı iki katına çıkıyor. Hedef empedansa ne olur?
> Yarıya iner: Z_hedef = V · dalgalanma / ΔI ve ΔI iki katına çıkmıştır. Bandın her bölümünde kabaca iki kat kondansatör (veya yarı ESL) gerekir.

> [!QUIZ] 50 MHz’in üstünde empedansı düşürmek için 100 nF’ları aynı kılıfta 1 µF’larla değiştirmeli misiniz?
> Hayır. SRF’lerinin üstünde ikisi de endüktans gibi davranır ve aynı kılıf ve montajla ESL’leri neredeyse aynıdır. İşe yarayan, daha çok paralel parça ve daha düşük montaj endüktansıdır.

> [!QUIZ] Bulk kondansatör sayısını artırmak, adım 1’de 2,6 MHz civarındaki tepeyi neden de bastırdı?
> O tepe, 22 µF grubunun ESL’i ile 1 µF grubunun kapasitesi arasındaki anti-rezonanstır. Dört paralel parça grubun toplam ESL’ini yarıya indirir; tepenin yüksekliği bu endüktansla birlikte düşer.

## Kontrol listesi

- Hedef empedans V, dalgalanma ve ΔI’dan hesaplandı.
- Bulk kapasite ≥ 1/(2π·f_reg·Z_hedef); regülatörün çıkış kondansatörü şartları sağlandı.
- Etkin (DC öngerilim sonrası) kapasite kullanıldı.
- |Z|, f_reg’den f_max’a kadar hedefin altında; hedefi aşan anti-rezonans tepesi yok.
- Vialar padlerin yanında veya içinde; en küçük kondansatörler pinlere en yakın.
- Güç ve toprak düzlemleri birbirine yakın.
`,
    en: `
## Why it matters

A digital IC draws current in short bursts: every clock edge charges thousands of internal nodes, and a processor can step from idle to full load within nanoseconds. The regulator feeding the rail cannot keep up: its control loop reacts in microseconds, and the path between it and the IC has inductance. If nothing else supplies the current, the rail dips, and the logic slows down, misses timing or resets.

**Decoupling capacitors** are local charge reservoirs. Together with the planes, the package and the regulator, they form the **power distribution network (PDN)**. Its job is to keep the voltage at the IC’s pins within tolerance while the current changes.

## Target impedance

Think of the PDN as an impedance Z(f) seen from the IC’s pins. A current step ΔI causes a voltage change ΔV ≈ Z · ΔI, so the PDN must stay below a **target impedance**:

\`\`\`
Z_target = V · ripple / ΔI
\`\`\`

Example: a 1.2 V rail with 3 % allowed ripple, 3 A maximum current and a worst-case load step of 50 % (1.5 A). ΔV = 36 mV, so Z_target = 36 mV / 1.5 A = **24 mΩ**.

The ripple allowance is the IC’s supply tolerance minus what the regulator’s DC accuracy already uses. If the step size is unknown, 50 % of the maximum current is a common assumption.

## Who supplies the current, at which frequency?

No single part covers the whole band; each takes over where the previous one runs out.

| Frequency (approx.) | Supplier | Limited by |
|---|---|---|
| DC to ~100 kHz | Regulator | Control-loop bandwidth |
| ~100 kHz to ~1 MHz | Bulk capacitors (tens to hundreds of µF) | ESR and ESL |
| ~1 MHz to ~100 MHz | MLCCs close to the IC | Mounting inductance |
| Above ~100 MHz | Planes, package and on-die capacitance | Package design |

The boundaries depend on the parts. Board-level decoupling usually stops being effective somewhere around 50–200 MHz, where the package and die take over, so follow the IC vendor’s guidance for the upper frequency.

## The real capacitor: ESR, ESL and SRF

A real capacitor is a series R-L-C: capacitance C, equivalent series resistance **ESR** and equivalent series inductance **ESL** (package plus pads and vias).

\`\`\`
Z(f) = ESR + j(2πf·ESL − 1/(2πf·C))        f_SRF = 1 / (2π·√(ESL·C))
\`\`\`

- Below the self-resonant frequency (SRF) it is a capacitor: |Z| falls with frequency.
- At the SRF |Z| reaches its minimum, roughly the ESR.
- Above the SRF it is an **inductor**: |Z| rises, and only the ESL matters, not the capacitance value.

A 100 nF part with 0.6 nH of mounted ESL resonates at about 20.55 MHz. Well above that, ten 100 nF parts beat one 1 µF part in the same case, because together they have a tenth of the inductance.

## Several values and anti-resonance

Different values cover different bands. But where one group has already turned inductive while the next is still capacitive, the two form a **parallel resonance** and |Z| peaks: an **anti-resonance**. A peak above the target is a frequency where the PDN fails.

To keep anti-resonance under control:

- Use **more parts of the same value** rather than many different values; parallel parts divide the ESL.
- Avoid big gaps between values (about a decade apart is common).
- Lower the ESL with better mounting.
- Some ESR damps the peaks; extremely low-ESR banks can peak harder.

> [!WARN] "100 nF on every pin" is a habit, not a design method. Check the impedance curve against the target.

## Placement and mounting inductance

At high frequency the mounting loop (pads, trace, vias and the plane path to the IC) often has more inductance than the capacitor itself.

[[fig:decap]]

- Put the vias **right next to the pads**, or in them; never connect a pad to its via with a long trace.
- Use two vias per pad on larger cases.
- Place the smallest capacitors closest to the IC’s power pins; bulk capacitors can sit further away.
- Keep the power and ground planes close together (thin dielectric) to lower the spreading inductance. Under a BGA, back-side capacitors that share the pin vias work very well.

The ESL field in the PDN calculator means this **total mounted** value: 0.4–0.8 nH is typical for 0402, 0.6–1 nH for 0603. The planes add capacitance too, C = ε0·εr·A/d, but less than you might hope: 100 cm² of plane pair 0.1 mm apart in FR-4 is about 3.8 nF. It is almost free of inductance, so it helps at the top of the band; it is not bulk.

## MLCC DC-bias derating

Class II ceramics (X5R, X7R) lose capacitance under DC voltage. Small cases and high values in a given case lose the most; near its rated voltage a part can lose more than half of its nominal value. Temperature and ageing take a little more.

- Read the manufacturer’s DC-bias curve for the exact part at your rail voltage.
- Enter the **effective** capacitance in the calculator, not the label value.
- A higher voltage rating or a larger case often keeps more capacitance.

C0G/NP0 parts don’t show this effect, but they only come in small values.

## Worked example: tuning the bank

Take the 1.2 V / 3 A rail (Z_target = 24 mΩ), with a 100 kHz regulator bandwidth and a 100 MHz PDN upper frequency. Start from the calculator’s default bank: 2 × 22 µF, 4 × 1 µF and 8 × 100 nF.

[[calc:pdn?V=1.2&rp=3&I=3&st=50|Step 0: default bank]]

Both checks fail:

- The highest |Z| from f_reg to f_max is **32.31 mΩ at 100 kHz**: not enough bulk at the low end.
- Total capacitance is **48.8 µF**, but **66.31 µF** is required.
- There is also an anti-resonance peak of **26.7 mΩ at about 2.6 MHz** between the 22 µF and 1 µF groups.

**Step 1: more bulk.** Raise the 22 µF count from 2 to 4. Total capacitance becomes **92.8 µF** and that check passes. The low end drops below the target and, because four parallel parts halve the group’s ESL, so does the 2.6 MHz peak. The highest |Z| is now **29.12 mΩ at 100 MHz**: the high end fails.

[[calc:pdn?V=1.2&rp=3&I=3&st=50&n0=4|Step 1: 4 × 22 µF]]

**Step 2: less inductance at the top.** Above about 20 MHz every capacitor is inductive, so what helps is more parts in parallel, each with its own vias. With 12 × 100 nF instead of 8, the highest |Z| is **22.03 mΩ at 100 MHz**, below 24 mΩ. Both checks pass.

[[calc:pdn?V=1.2&rp=3&I=3&st=50&n0=4&n2=12|Step 2: passing bank]]

The final bank is 4 × 22 µF, 4 × 1 µF and 12 × 100 nF. On a real design, repeat the process with derated capacitance and the ESL your layout can actually achieve.

> [!TIP] Lowering one group’s ESL also helps the high end, but watch the chart: it can sharpen the anti-resonance with the next group.

## Bulk capacitance from the regulator bandwidth

Below its bandwidth the regulator holds the voltage; above it the capacitors must. At that crossover the bulk capacitance alone has to meet the target:

\`\`\`
C_bulk ≥ 1 / (2π · f_reg · Z_target)
\`\`\`

For 100 kHz and 24 mΩ that is **66.31 µF**. A slower regulator with a 20 kHz loop needs five times as much, about **331.6 µF**. Check the regulator datasheet as well: many regulators specify a range of output capacitance and ESR for loop stability.

[[calc:pdn?V=1.2&rp=3&I=3&st=50&fr=20|20 kHz regulator]]

## Common mistakes

- Using the nominal MLCC capacitance without DC-bias derating.
- Long traces between capacitor pads and their vias.
- Many different values "to cover all frequencies", creating anti-resonance peaks.
- Expecting a 1 µF capacitor to beat a 100 nF one at 100 MHz.
- Forgetting bulk capacitance, or ignoring the regulator’s output-capacitor requirements.

> [!QUIZ] The maximum current of a rail doubles while voltage and ripple stay the same. What happens to the target impedance?
> It halves: Z_target = V · ripple / ΔI, and ΔI has doubled. Every part of the band now needs roughly twice as many capacitors (or half the ESL).

> [!QUIZ] Above 50 MHz, should you replace 100 nF capacitors with 1 µF parts in the same case to lower the impedance?
> No. Above their SRF both behave as inductors, and with the same case and mounting their ESL is nearly the same. What helps is more parts in parallel and lower mounting inductance.

> [!QUIZ] Why did adding bulk capacitors in step 1 also suppress the peak near 2.6 MHz?
> That peak is the anti-resonance between the ESL of the 22 µF group and the capacitance of the 1 µF group. Four parts in parallel halve the group’s total ESL, and the peak drops with that inductance.

## Checklist

- Target impedance calculated from V, ripple and ΔI.
- Bulk capacitance ≥ 1/(2π·f_reg·Z_target); the regulator’s output-capacitor rules respected.
- Effective (DC-bias derated) capacitance used.
- |Z| below the target from f_reg to f_max, with no anti-resonance peak above it.
- Vias next to or in the pads; the smallest capacitors closest to the pins.
- Power and ground planes close together.
`,
  },
};
