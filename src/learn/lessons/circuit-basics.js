export default {
  body: {
    tr: `
## Neden önemli?

Kart tasarımı yalnızca iz ve via değildir; her kartta dirençler, gerilim bölücüler, LED’ler ve filtreler vardır. Bu basit parçalardaki hatalar şaşırtıcı derecede sık görülür: aşırı ısınan bir direnç, yük bağlanınca çöken bir ölçüm gerilimi, yanlış gerilim veren bir regülatör ya da hiçbir distribütörde bulunmayan bir direnç değeri. Bu derste dört temel hesabı ve standart değer seçimini birlikte ele alıyoruz.

## Ohm yasası ve güç

Bir dirençte gerilim, akım ve direnç arasındaki ilişki **V = I · R**’dir. Direnç üzerinde harcanan güç ise:

**P = V · I = I² · R = V² / R**

Bu gücün tamamı ısıya dönüşür. Örnek: 100 Ω’luk bir direnç 5 V’a bağlanıyor.

[[calc:ohm?pair=VR&V=5&R=100|Örneği hesaplayıcıda aç]]

Akım **50 mA**, güç **250 mW** çıkar ve hesaplayıcı 2 kat payla **1/2 W**’lık bir direnç önerir. Kartta sık kullanılan 0603 kılıf tipik olarak yalnızca 0,1 W’tır; bu direnç orada aşırı ısınır.

## Güç sınıfı ve değer düşürme

Direncin güç sınıfı kılıf boyutuna bağlıdır. Tipik çip direnç değerleri:

| Kılıf | Tipik güç |
|---|---|
| 0402 | 1/16 W |
| 0603 | 1/10 W |
| 0805 | 1/8 W |
| 1206 | 1/4 W |

Bu değerler üreticiye ve seriye göre değişir; her zaman veri sayfasına bakın. Ayrıca bu güç yalnızca belirli bir ortam sıcaklığına kadar geçerlidir. Çoğu çip direnç anma gücünü 70 °C’ye kadar verir; bunun üzerinde izin verilen güç doğrusal olarak azalır ve serinin en yüksek çalışma sıcaklığında sıfıra iner (sık görülen değerler 125–155 °C). Buna **değer düşürme (derating)** denir.

> [!RULE] Bir direnci hesaplanan gücün en az iki katına göre seçin. Sıcak bir ortamda ya da sıcak bir parçanın yanında payı daha da artırın.

> [!NOTE] Küçük kılıfların en yüksek çalışma gerilimi de sınırlıdır. Şebeke ya da yüksek gerilim bölücülerinde gerilimi birkaç seri dirence paylaştırın.

## Gerilim bölücü

İki direnç seri bağlandığında aradaki nokta girişin bir kesrini verir:

**Vout = Vin · R2 / (R1 + R2)**

Örnek: 12 V’luk bir hattı ölçmek için R1 = 10 kΩ, R2 = 4,7 kΩ.

[[calc:divider?mode=analyse&vin=12&r1=10k&r2=4k7&rl=|Bölücüyü aç]]

Yüksüz çıkış **3,837 V**, bölücü akımı yaklaşık **816 µA**’dir. Hesaplayıcı bir değer daha gösterir: **çıkış direnci** (Thévenin direnci) R1 ∥ R2 = **3,197 kΩ**. Bölücü, çıkışa bağlanan devreye bu iç dirençli bir kaynak gibi görünür.

Şimdi çıkışa 100 kΩ giriş dirençli bir devre bağlayın:

[[calc:divider?mode=analyse&vin=12&r1=10k&r2=4k7&rl=100k|100 kΩ yükle aç]]

Çıkış **3,718 V**’a, yani yaklaşık **%3,1** düşer. Yük 10 kΩ olursa çıkış **2,907 V**’a iner (**−%24**): bölücü artık işe yaramaz.

[[calc:divider?mode=analyse&vin=12&r1=10k&r2=4k7&rl=10k|10 kΩ yükle aç]]

Yükleme hatası yaklaşık **Rth / (Rth + RL)** kadardır. %1’in altında hata için yük direnci çıkış direncinin en az 100 katı olmalıdır. Daha küçük dirençler yükleme hatasını azaltır ama daha fazla akım çeker; pil ile çalışan cihazlarda bu bir dengedir. İkisi birden gerekiyorsa çıkışı bir op-amp ile tamponlayın.

> [!TIP] ADC girişleri örnekleme anında kısa bir akım darbesi çeker. Yüksek dirençli bir bölücünün çıkışına küçük bir kondansatör koymak bu darbeyi karşılar; değerini ADC veri sayfasındaki öneriye göre seçin.

## Regülatör geri besleme bölücüsü

Ayarlı regülatörler çıkışı bir bölücü üzerinden FB pinine geri besler ve bu pini sabit bir referans gerilimde (Vref) tutar. R1 çıkıştan FB’ye, R2 FB’den toprağa bağlanır:

**Vout = Vref · (1 + R1 / R2)**

Örnek: Vref = 0,8 V olan bir anahtarlamalı regülatörden 5 V istiyoruz ve R2 = 10 kΩ seçiyoruz.

[[calc:divider?mode=fb&vref=0.8&vout=5&r2fb=10k&fser=E96|Geri besleme bölücüsünü aç]]

Tam değer R1 = 10 kΩ · (5 / 0,8 − 1) = **52,5 kΩ** çıkar. E96 serisindeki en yakın değer **52,3 kΩ**’dur ve çıkışı **4,984 V** (−%0,32) yapar. Hesaplayıcı R2’nin de değişebildiği durumda **105 kΩ / 20 kΩ** çiftini önerir; bu çift tam 5,000 V verir. Geri besleme akımı Vref / R2 = 80 µA’dir.

Gerçek çıkış doğruluğunu çoğu zaman bu küçük yuvarlama değil, Vref toleransı ve direnç toleransları belirler. Geri besleme bölücüsünde %1 veya daha iyi dirençler kullanın ve veri sayfasının önerdiği R2 aralığına uyun.

## LED seri direnci

LED, ileri gerilimi (Vf) üzerinde sabit kalan bir diyottur; akımı seri direnç belirler:

**R = (Vs − N · Vf) / If**

Örnek: 12 V besleme, kırmızı LED (Vf ≈ 2,0 V), 20 mA.

[[calc:led?vs=12&vf=2&if=20&n=1&ser=E24|Tek LED ile aç]]

Hesaplanan direnç 500 Ω’dur. Hesaplayıcı, akımın hedefi aşmaması için bir üstteki standart değeri, **510 Ω**’u önerir; akım **19,6 mA** olur. Direnç yaklaşık **196 mW** harcar, bu yüzden **1/2 W** sınıfı gerekir. Verim yalnızca **%16,7**’dir: gücün çoğu dirençte ısıya dönüşür.

Aynı beslemeye üç LED’i seri bağlayın:

[[calc:led?vs=12&vf=2&if=20&n=3&ser=E24|Üç seri LED ile aç]]

Direnç 300 Ω’a, kaybı 120 mW’a iner; 1/4 W yeterli olur ve verim %50’ye çıkar.

> [!NOTE] Vf üreticiye, akıma ve sıcaklığa göre değişir. Direnç üzerinde kalan gerilim küçükse akım Vf değişimine çok duyarlı olur. Modern gösterge LED’leri çoğu zaman birkaç miliamperde bile yeterince parlaktır; 20 mA bir varsayım değil, bir üst sınırdır.

## RC alçak geçiren filtre

Seri bir direnç ve toprağa bağlı bir kondansatör, yüksek frekansları bastıran en basit filtredir. İki temel büyüklük:

- **Zaman sabiti τ = R · C**: basamak girişte çıkış τ sürede son değerin %63’üne ulaşır.
- **Kesim frekansı fc = 1 / (2π · R · C)**: bu frekansta çıkış −3 dB düşer.

Örnek: R = 10 kΩ, C = 100 nF.

[[calc:rc?mode=rc&rcR=10k&rcC=100n|RC filtreyi aç]]

τ = **1 ms**, fc ≈ **159 Hz** çıkar. %10’dan %90’a yükselme yaklaşık 2,2 ms, %99’a ulaşma yaklaşık 4,6 ms sürer. Bu yüzden "yaklaşık 5τ sonra oturmuş" deriz. Bu tür filtreler buton sıçramasını bastırmak, PWM’i düzeltmek ve ADC girişinden gürültüyü uzak tutmak için kullanılır.

Filtreyi süren kaynağın iç direnci (örneğin bir bölücünün çıkış direnci) R’ye eklenir. Seramik kondansatörlerin toleransı geniştir ve X7R gibi sınıf II malzemelerde kapasite DC gerilim altında belirgin biçimde azalır; kritik filtrelerde bunu hesaba katın.

## Standart değerler: E-serisi

Direnç ve kondansatörler her değerde üretilmez; IEC 60063’teki **E-serisi** değerlerinde üretilir. E12 serisi bir dekadda 12 değer içerir: 1,0 · 1,2 · 1,5 · 1,8 · 2,2 · 2,7 · 3,3 · 3,9 · 4,7 · 5,6 · 6,8 · 8,2. Değerler yaklaşık %21’lik geometrik adımlarla ilerler.

**Neden 5 kΩ değil de 4,7 kΩ?** E12, ±%10 toleransa göre tasarlanmıştır. 4,7 kΩ ±%10 parça 4,23–5,17 kΩ, 5,6 kΩ ±%10 parça 5,04–6,16 kΩ aralığını kapsar. Komşu değerlerin tolerans bantları birbirine değer, dolayısıyla 5 kΩ’luk ayrı bir parçaya gerek kalmaz. Daha sık seriler daha dar toleransa karşılık gelir: E24 ±%5, E96 ±%1.

[[calc:eseries?x=5k&ser=E12|5 kΩ’u E12’de ara]]

E12’de en yakın değer **4,7 kΩ** (−%6), bir üstteki 5,6 kΩ’dur (+%12). İki direnç kullanılabiliyorsa 4,7 kΩ + 330 Ω = 5,03 kΩ (+%0,6) ya da 10 kΩ ∥ 10 kΩ = tam 5 kΩ olur. E24’te en yakın değer **5,1 kΩ**’dur (+%2):

[[calc:eseries?x=5k&ser=E24|5 kΩ’u E24’te ara]]

## Değer seçerken adımlar

1. **Tam değeri hesaplayın.**
2. **Gereken doğruluğa göre seri seçin.** Pull-up ve LED için E12/E24 yeter; geri besleme ve ölçüm bölücüleri için E96 ve %1 dirençler kullanın.
3. **Güvenli yöne yuvarlayın.** LED direncini yukarı yuvarlamak akımı sınırda tutar.
4. **Gücü ve gerilimi kontrol edin.**
5. **Toleransın en kötü durumunu düşünün.** İki %1 direnç ve %1 Vref, çıkışta birkaç yüzdelik sapma yaratabilir.

## Sık yapılan hatalar

- Yalnızca direnç değerini hesaplayıp gücü unutmak.
- Yükü bölücünün bir parçası olarak görmemek.
- Akımdan tasarruf için megaohm bölücüleri ADC’ye doğrudan bağlamak.
- Geri besleme bölücüsünde %5 dirençler kullanmak.
- Ürün ağacına hiçbir seride bulunmayan değerler (5 kΩ, 3,5 kΩ) yazmak.

> [!QUIZ] 10 kΩ / 4,7 kΩ bölücünün çıkışı, 10 kΩ’luk bir yük bağlanınca neden 3,84 V’tan 2,91 V’a düşer?
> Yük R2’ye paralel bağlanır ve alt kolu küçültür. Bölücünün çıkış direnci 3,2 kΩ’dur; bu, 10 kΩ’luk yükün yanında küçük değildir. Yük, çıkış direncinin en az 100 katı olmalı ya da çıkış tamponlanmalıdır.

> [!QUIZ] Vref = 0,8 V ve R2 = 10 kΩ ise 3,3 V çıkış için R1 kaç olmalıdır?
> R1 = R2 · (Vout / Vref − 1) = 10 kΩ · (4,125 − 1) = 31,25 kΩ. E96’da 30,9 kΩ ya da 31,6 kΩ seçilir; ikisi de yaklaşık %0,85 hata verir.

## Kontrol listesi

- Her direncin gücü, en az 2 kat payla ve sıcaklığa göre kontrol edildi.
- Bölücülerin çıkış direnci ve yükleme hatası hesaplandı.
- Geri besleme dirençleri %1 veya daha iyi, R2 veri sayfası aralığında.
- LED akımı Vf toleransıyla birlikte kabul edilebilir.
- RC filtrede kaynak direnci ve kondansatör toleransı hesaba katıldı.
- Tüm değerler standart bir E-serisinden seçildi.
`,
    en: `
## Why it matters

Board design is not only traces and vias; every board has resistors, voltage dividers, LEDs and filters. Mistakes in these simple parts are surprisingly common: a resistor that overheats, a measurement voltage that collapses when a load is connected, a regulator at the wrong voltage, or a resistor value no distributor stocks. This lesson covers four basic calculations and how to pick standard values.

## Ohm’s law and power

In a resistor, voltage, current and resistance are related by **V = I · R**. The power dissipated in it is:

**P = V · I = I² · R = V² / R**

All of that power becomes heat. Example: a 100 Ω resistor across 5 V.

[[calc:ohm?pair=VR&V=5&R=100|Open the example in the calculator]]

The current is **50 mA**, the power **250 mW**, and with a 2× margin the calculator suggests a **1/2 W** resistor. A 0603 part, very common on boards, is typically rated only 0.1 W; it would overheat here.

## Power rating and derating

A resistor’s power rating depends on its package size. Typical chip resistor values:

| Package | Typical rating |
|---|---|
| 0402 | 1/16 W |
| 0603 | 1/10 W |
| 0805 | 1/8 W |
| 1206 | 1/4 W |

These vary by manufacturer and series; always check the datasheet. The rating also applies only up to a certain ambient temperature. Most chip resistors deliver their rated power up to 70 °C; above that the allowed power falls linearly to zero at the series’ maximum operating temperature (125–155 °C is common). This is called **derating**.

> [!RULE] Choose a resistor for at least twice the calculated power. Add more margin in a hot enclosure or next to a hot part.

> [!NOTE] Small packages also have a limited maximum working voltage. In mains or high-voltage dividers, share the voltage across several resistors in series.

## Voltage divider

Two resistors in series give a fraction of the input at their midpoint:

**Vout = Vin · R2 / (R1 + R2)**

Example: measuring a 12 V rail with R1 = 10 kΩ and R2 = 4.7 kΩ.

[[calc:divider?mode=analyse&vin=12&r1=10k&r2=4k7&rl=|Open the divider]]

The unloaded output is **3.837 V** and the divider current about **816 µA**. The calculator shows one more value: the **output resistance** (Thévenin resistance) R1 ∥ R2 = **3.197 kΩ**. To whatever you connect, the divider looks like a source with this internal resistance.

Now connect a circuit with a 100 kΩ input resistance:

[[calc:divider?mode=analyse&vin=12&r1=10k&r2=4k7&rl=100k|Open with a 100 kΩ load]]

The output drops to **3.718 V**, about **3.1 %** low. With a 10 kΩ load it falls to **2.907 V** (**−24 %**): the divider is no longer useful.

[[calc:divider?mode=analyse&vin=12&r1=10k&r2=4k7&rl=10k|Open with a 10 kΩ load]]

The loading error is about **Rth / (Rth + RL)**. For less than 1 % error the load must be at least 100 times the output resistance. Smaller resistors reduce the loading error but draw more current; on battery-powered devices that is a trade-off. If you need both, buffer the output with an op-amp.

> [!TIP] ADC inputs draw a short current pulse when they sample. A small capacitor at the output of a high-impedance divider supplies that pulse; pick its value from the ADC datasheet’s recommendation.

## Regulator feedback divider

Adjustable regulators feed the output back to the FB pin through a divider and hold that pin at a fixed reference voltage (Vref). R1 goes from the output to FB, R2 from FB to ground:

**Vout = Vref · (1 + R1 / R2)**

Example: we want 5 V from a switching regulator with Vref = 0.8 V, and choose R2 = 10 kΩ.

[[calc:divider?mode=fb&vref=0.8&vout=5&r2fb=10k&fser=E96|Open the feedback divider]]

The exact value is R1 = 10 kΩ · (5 / 0.8 − 1) = **52.5 kΩ**. The nearest E96 value is **52.3 kΩ**, giving **4.984 V** (−0.32 %). If R2 may change too, the calculator suggests the pair **105 kΩ / 20 kΩ**, which gives exactly 5.000 V. The feedback current is Vref / R2 = 80 µA.

The real output accuracy is usually set not by this small rounding but by the Vref tolerance and the resistor tolerances. Use 1 % or better resistors in feedback dividers and stay within the R2 range the datasheet recommends.

## LED series resistor

An LED is a diode whose voltage stays near its forward voltage (Vf); a series resistor sets the current:

**R = (Vs − N · Vf) / If**

Example: 12 V supply, red LED (Vf ≈ 2.0 V), 20 mA.

[[calc:led?vs=12&vf=2&if=20&n=1&ser=E24|Open with one LED]]

The calculated resistance is 500 Ω. So that the current does not exceed the target, the calculator recommends the next standard value up, **510 Ω**; the current becomes **19.6 mA**. The resistor dissipates about **196 mW**, so a **1/2 W** rating is needed. The efficiency is only **16.7 %**: most of the power turns into heat in the resistor.

Put three LEDs in series on the same supply:

[[calc:led?vs=12&vf=2&if=20&n=3&ser=E24|Open with three LEDs in series]]

The resistor drops to 300 Ω and its loss to 120 mW; 1/4 W is enough and the efficiency rises to 50 %.

> [!NOTE] Vf varies with manufacturer, current and temperature. If little voltage is left across the resistor, the current becomes very sensitive to Vf. Modern indicator LEDs are often bright enough at a few milliamps; 20 mA is an upper limit, not a default.

## RC low-pass filter

A series resistor and a capacitor to ground form the simplest filter that suppresses high frequencies. Two key quantities:

- **Time constant τ = R · C**: after a step, the output reaches 63 % of its final value in τ.
- **Cutoff frequency fc = 1 / (2π · R · C)**: at this frequency the output is 3 dB down.

Example: R = 10 kΩ, C = 100 nF.

[[calc:rc?mode=rc&rcR=10k&rcC=100n|Open the RC filter]]

τ = **1 ms** and fc ≈ **159 Hz**. The 10 % to 90 % rise takes about 2.2 ms, reaching 99 % about 4.6 ms; hence the saying "settled after about 5τ". Such filters debounce buttons, smooth PWM and keep noise out of ADC inputs.

The internal resistance of whatever drives the filter (for example a divider’s output resistance) adds to R. Ceramic capacitors have wide tolerances, and in class II dielectrics such as X7R the capacitance drops noticeably under DC bias; account for this in critical filters.

## Standard values: the E-series

Resistors and capacitors are not made in every value; they come in the **E-series** values of IEC 60063. The E12 series has 12 values per decade: 1.0 · 1.2 · 1.5 · 1.8 · 2.2 · 2.7 · 3.3 · 3.9 · 4.7 · 5.6 · 6.8 · 8.2. The values step geometrically by about 21 %.

**Why 4.7 kΩ and not 5 kΩ?** E12 was designed for ±10 % tolerance. A 4.7 kΩ ±10 % part covers 4.23–5.17 kΩ, a 5.6 kΩ ±10 % part 5.04–6.16 kΩ. The tolerance bands of neighbouring values touch, so a separate 5 kΩ part is unnecessary. Denser series go with tighter tolerances: E24 ±5 %, E96 ±1 %.

[[calc:eseries?x=5k&ser=E12|Look up 5 kΩ in E12]]

In E12 the closest value is **4.7 kΩ** (−6 %), the next one up 5.6 kΩ (+12 %). With two resistors you can make 4.7 kΩ + 330 Ω = 5.03 kΩ (+0.6 %) or 10 kΩ ∥ 10 kΩ = exactly 5 kΩ. In E24 the closest value is **5.1 kΩ** (+2 %):

[[calc:eseries?x=5k&ser=E24|Look up 5 kΩ in E24]]

## Steps for picking a value

1. **Calculate the exact value.**
2. **Pick a series for the accuracy you need.** E12/E24 are fine for pull-ups and LEDs; use E96 and 1 % resistors for feedback and measurement dividers.
3. **Round in the safe direction.** Rounding an LED resistor up keeps the current within its limit.
4. **Check power and voltage.**
5. **Consider the worst-case tolerance.** Two 1 % resistors and a 1 % Vref can shift the output by a few percent.

## Common mistakes

- Calculating the resistance and forgetting the power.
- Not treating the load as part of the divider.
- Connecting megaohm dividers straight to an ADC to save current.
- Using 5 % resistors in a feedback divider.
- Putting values on the bill of materials that exist in no series (5 kΩ, 3.5 kΩ).

> [!QUIZ] Why does the output of a 10 kΩ / 4.7 kΩ divider fall from 3.84 V to 2.91 V when a 10 kΩ load is connected?
> The load is in parallel with R2 and makes the bottom leg smaller. The divider’s output resistance is 3.2 kΩ, which is not small next to a 10 kΩ load. The load should be at least 100 times the output resistance, or the output must be buffered.

> [!QUIZ] With Vref = 0.8 V and R2 = 10 kΩ, what R1 gives a 3.3 V output?
> R1 = R2 · (Vout / Vref − 1) = 10 kΩ · (4.125 − 1) = 31.25 kΩ. In E96 you pick 30.9 kΩ or 31.6 kΩ; both give about 0.85 % error.

## Checklist

- Every resistor’s power checked with at least 2× margin and against temperature.
- Output resistance and loading error of dividers calculated.
- Feedback resistors are 1 % or better, R2 within the datasheet range.
- LED current is acceptable including the Vf tolerance.
- Source resistance and capacitor tolerance included in RC filters.
- All values come from a standard E-series.
`,
  },
};
