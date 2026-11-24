export default {
  body: {
    tr: `
## Neden önemli?

Güç harcayan her parça ısınır: regülatörler, MOSFET’ler, işlemciler, hatta dirençler ve izler. Yarı iletkenin içindeki en sıcak nokta, **bağlantı (junction) sıcaklığı Tj**, veri sayfasındaki sınırı aşarsa parça koruma moduna girer, parametreleri kayar ya da kalıcı olarak hasar görür. Sınırın altında kalsa bile sıcaklık arttıkça ömür kısalır. Termal tasarımın amacı basittir: Tj’yi tüm çalışma koşullarında güvenli bir sınırın altında tutmak.

## Isıl direnç: Ohm yasasının ısıl karşılığı

Isı, sıcak noktadan soğuk noktaya akar ve yol boyunca bir dirençle karşılaşır. Bu **ısıl direnç (θ)** °C/W birimindedir: 1 W ısı geçtiğinde iki uç arasında kaç derece fark oluştuğunu söyler. Elektrikle benzetme birebirdir:

| Elektrik | Isıl |
|---|---|
| Gerilim farkı V (V) | Sıcaklık farkı ΔT (°C) |
| Akım I (A) | Isı akışı P (W) |
| Direnç R (Ω) | Isıl direnç θ (°C/W) |
| Seri dirençler toplanır | Seri ısıl dirençler toplanır |
| Paralel dirençler | Paralel ısı yolları (ör. termal vialar) |

Buradan temel denklem çıkar:

**Tj = Ta + P · θ**

Ta ortam sıcaklığı, P parçanın harcadığı güç, θ bağlantıdan ortama kadar olan toplam ısıl dirençtir.

## θJA, θJC ve JEDEC test kartı

Veri sayfalarında iki değer öne çıkar:

- **θJA (bağlantı–ortam)**: bağlantıdan çevre havasına kadar olan toplam direnç; kartı da içerir.
- **θJC (bağlantı–kılıf)**: bağlantıdan kılıfın bir yüzeyine kadar olan direnç. Parça bir soğutucuya ya da açık padi (exposed pad) kart bakırına lehimlendiğinde anlamlıdır.

Buradaki tuzak şudur: veri sayfasındaki θJA, JEDEC JESD51 standartlarında tanımlanan **bir test kartında**, durgun havada ölçülür. Çoğu zaman bu, iki iç bakır düzlemi olan 4 katmanlı "high-K" karttır (JESD51-7); bazen tek katmanlı "low-K" kart (JESD51-3) kullanılır. Sizin kartınızın bakır alanı, katman sayısı, yanındaki sıcak parçalar ve kutusu farklıdır. Bu yüzden θJA, paketleri **karşılaştırmak** için iyi bir ölçüdür ama doğrudan tasarım değeri değildir: küçük, iki katmanlı bir kartta gerçek θJA veri sayfasındakinin belirgin biçimde üzerinde olabilir.

> [!NOTE] Bazı veri sayfaları **ψJT** (bağlantı–kılıf üstü) değeri de verir. Bu bir ısıl direnç değil, bir karakterizasyon parametresidir: kılıfın üstünü termokupl ile ölçtüğünüzde Tj’yi tahmin etmeye yarar.

## Örnek: lineer regülatör

Lineer regülatör (LDO), giriş ile çıkış arasındaki farkı ısıya dönüştürür:

**P = (Vin − Vout) · Iout + Vin · Iq**

12 V’tan 3,3 V üreten bir LDO 0,3 A veriyor. Veri sayfasında θJA = 60 °C/W yazdığını, kutu içinde ortamın 40 °C olduğunu varsayalım. Tasarım sınırımız Tj = 125 °C.

[[calc:thermal?ps=ldo&vin=12&vout=3.3&io=0.3&iq=0&path=ja&ja=60&ta=40&tj=125|LDO örneğini aç]]

- Güç kaybı **2,61 W**, verim yalnızca **%27,5**.
- Tj = 40 + 2,61 × 60 ≈ **196,6 °C**: sınırın 71,6 °C üzerinde.
- Bu ortamda paketin taşıyabileceği en yüksek güç yaklaşık **1,42 W**’tır.

Çözüm seçenekleri: girişi düşürmek, anahtarlamalı (buck) regülatöre geçmek, daha iyi bir paket ve daha fazla bakır alanı kullanmak. Aynı LDO’yu 5 V’tan beslerseniz:

[[calc:thermal?ps=ldo&vin=5&vout=3.3&io=0.3&iq=0&path=ja&ja=60&ta=40&tj=125|5 V girişle aç]]

Kayıp **0,51 W**’a, Tj **70,6 °C**’ye iner.

> [!RULE] LDO hesabını en yüksek giriş gerilimi, en yüksek yük akımı ve en yüksek ortam sıcaklığı ile yapın; nominal değerlerle değil.

## Soğutucu seçimi (θSA)

Bir soğutucu kullanıldığında ısıl yol seri bir zincire dönüşür:

**Tj = Ta + P · (θJC + θCS + θSA)**

θCS kılıf ile soğutucu arasındaki arayüzdür (termal macun ya da ped), θSA soğutucunun kendisidir. Soğutucu için gereken değer:

**θSA ≤ (Tj,max − Ta) / P − θJC − θCS**

Örnek: TO-220 kılıflı bir parça 10 W harcıyor; θJC = 3 °C/W, θCS = 0,5 °C/W, Ta = 40 °C, Tj sınırı 125 °C. Gereken θSA 85 / 10 − 3,5 = **5,0 °C/W** çıkar. 4 °C/W’lık bir soğutucu seçelim:

[[calc:thermal?ps=direct&P=10&path=chain&jc=3&cs=0.5&sa=4&ta=40&tj=125|Soğutucu örneğini aç]]

Tj **115 °C** olur ve 10 °C pay kalır. Soğutucunun θSA değeri hava akışına, montaj yönüne ve yüzey işlemine bağlıdır; doğal taşınım için verilen değeri kullanın ve tam sınırda bir soğutucu seçmeyin.

## Bakır alanı ve termal vialar

Yüzey montajlı parçalarda soğutucu kartın kendisidir. Açık padli bir paket ısısını padinden kart bakırına verir; bakır ısıyı yayar ve termal vialar onu iç düzlemlere ve alt yüzeye taşır.

Tek bir 0,3 mm via gövdesi boyunca yaklaşık **165 °C/W** dirence sahiptir. Paralel vialar bu değeri böler: dokuz via yaklaşık **18 °C/W** eder.

[[calc:via?d=0.3&d_u=mm&L=1.6&p=25&n=9|Dokuz termal viayı aç]]

Bu yalnızca üst ile alt bakır arasındaki yoldur; ısının oradan havaya geçebilmesi için alt tarafta da yeterli bakır alanı gerekir.

- Veri sayfasındaki önerilen pad ve via düzenini kullanın; bulunmuyorsa padin altını yaklaşık 1–1,2 mm aralıklı küçük vialarla doldurmak yaygın bir başlangıçtır.
- Açık vialar lehimi padden emer. Viaları küçük tutun, alt yüzeyden kapatın ya da doldurulmuş pad içi via kullanın; bkz. [[lesson:vias|via ve pad tasarımı]].
- Termal padi bakır döküme termal rölyef kollarıyla değil, doğrudan bağlayın.
- Bakır alanını artırmak θJA’yı düşürür, ama getirisi giderek azalır: ilk birkaç santimetrekare en büyük farkı yaratır.
- Isının yayılacağı yolu yarıklar ve kesik düzlemlerle bölmeyin.

## İzlerin ısınması

Akım taşıyan izler de kendi I²·R kayıplarıyla ısınır. Sıcak bir parçanın yanından geçen iz için "ortam", kartın o bölgedeki sıcaklığıdır; bu yüzden güç bileşenlerinin çevresindeki izleri ve viaları daha muhafazakâr boyutlandırın. İz genişliği ve sıcaklık artışı hesabı [[lesson:trace-current|akım taşıyan izler]] dersinde.

## Güvenilirlik için sıcaklık payı

Veri sayfasındaki mutlak en yüksek Tj (çoğu zaman 150 °C) bir tasarım hedefi değildir. Bunun yerine bir tasarım sınırı seçin; örneğin 150 °C’lik bir parça için 125 °C. Sıcaklık ile ömür arasındaki ilişki üsteldir: özellikle elektrolitik kondansatörler için sık kullanılan bir pratik kural, her 10 °C artışın ömrü yaklaşık yarıya indirdiğidir. Yüksek güvenilirlik projelerinin değer düşürme (derating) kılavuzları daha da düşük sınırlar koyar.

## Sık yapılan hatalar

- Veri sayfası θJA’sını küçük, iki katmanlı bir kart için olduğu gibi kullanmak.
- Ortam sıcaklığını kutunun içi yerine oda sıcaklığı almak.
- LDO kaybını nominal giriş gerilimiyle hesaplamak.
- Termal padi termal rölyef kollarıyla bağlamak ya da altına via koymamak.
- Yan yana duran sıcak parçaların birbirini ısıttığını unutmak.

> [!QUIZ] θJA = 60 °C/W, Ta = 40 °C ve Tj sınırı 125 °C ise parça en fazla ne kadar güç harcayabilir?
> P = (125 − 40) / 60 ≈ 1,42 W. Bunun üzerindeki her watt Tj’yi 60 °C artırır.

> [!QUIZ] Veri sayfası θJA = 40 °C/W diyor, ama kendi kartınızda ölçtüğünüz Tj beklenenden çok daha yüksek. Neden?
> θJA, JEDEC test kartında (çoğu zaman iki iç düzlemli 4 katmanlı kart) durgun havada ölçülür. Sizin kartınızın bakır alanı daha küçük, katman sayısı farklı ya da yakınında başka ısı kaynakları olabilir; gerçek θJA kart düzenine çok bağlıdır.

## Kontrol listesi

- Her güç bileşeninin kaybı en kötü koşullarda hesaplandı.
- Ortam sıcaklığı olarak kutu içi sıcaklık kullanıldı.
- θJA’nın test kartı ile kendi kartınız arasındaki farkı hesaba katıldı.
- Açık padlerde termal vialar ve yeterli bakır alanı var.
- Soğutucu, gereken θSA’nın rahatça altında.
- Tj, mutlak en yüksek değerin değil, tasarım sınırının altında.
`,
    en: `
## Why it matters

Every part that dissipates power heats up: regulators, MOSFETs, processors, even resistors and traces. If the hottest spot inside a semiconductor, the **junction temperature Tj**, exceeds its datasheet limit, the part enters thermal protection, its parameters drift, or it is permanently damaged. Even below the limit, life gets shorter as temperature rises. The goal of thermal design is simple: keep Tj below a safe limit under all operating conditions.

## Thermal resistance: Ohm’s law for heat

Heat flows from hot to cold and meets resistance along the way. This **thermal resistance (θ)** is in °C/W: it tells you how many degrees of difference appear across it when 1 W flows through. The electrical analogy is exact:

| Electrical | Thermal |
|---|---|
| Voltage difference V (V) | Temperature difference ΔT (°C) |
| Current I (A) | Heat flow P (W) |
| Resistance R (Ω) | Thermal resistance θ (°C/W) |
| Series resistors add | Series thermal resistances add |
| Parallel resistors | Parallel heat paths (e.g. thermal vias) |

This gives the basic equation:

**Tj = Ta + P · θ**

Ta is the ambient temperature, P the power the part dissipates and θ the total thermal resistance from junction to ambient.

## θJA, θJC and the JEDEC test board

Two values stand out in datasheets:

- **θJA (junction–ambient)**: the total resistance from the junction to the surrounding air; it includes the board.
- **θJC (junction–case)**: the resistance from the junction to one surface of the package. It matters when the part is mounted on a heatsink, or its exposed pad is soldered to board copper.

Here is the trap: datasheet θJA is measured in still air on **a test board** defined by the JEDEC JESD51 standards. Most often this is the 4-layer "high-K" board with two internal copper planes (JESD51-7); sometimes the single-layer "low-K" board (JESD51-3). Your board differs in copper area, layer count, neighbouring hot parts and enclosure. So θJA is a good metric for **comparing** packages but not a design value: on a small 2-layer board the real θJA can be noticeably higher than the datasheet figure.

> [!NOTE] Some datasheets also give **ψJT** (junction to top of case). It is not a thermal resistance but a characterisation parameter: it lets you estimate Tj from a thermocouple reading on top of the package.

## Example: a linear regulator

A linear regulator (LDO) turns the difference between input and output into heat:

**P = (Vin − Vout) · Iout + Vin · Iq**

An LDO makes 3.3 V from 12 V and delivers 0.3 A. Assume the datasheet says θJA = 60 °C/W and the ambient inside the enclosure is 40 °C. Our design limit is Tj = 125 °C.

[[calc:thermal?ps=ldo&vin=12&vout=3.3&io=0.3&iq=0&path=ja&ja=60&ta=40&tj=125|Open the LDO example]]

- The dissipation is **2.61 W** and the efficiency only **27.5 %**.
- Tj = 40 + 2.61 × 60 ≈ **196.6 °C**: 71.6 °C over the limit.
- At this ambient the package can handle at most about **1.42 W**.

Options: lower the input, switch to a buck regulator, or use a better package and more copper area. Feed the same LDO from 5 V:

[[calc:thermal?ps=ldo&vin=5&vout=3.3&io=0.3&iq=0&path=ja&ja=60&ta=40&tj=125|Open with a 5 V input]]

The loss drops to **0.51 W** and Tj to **70.6 °C**.

> [!RULE] Do the LDO calculation with the highest input voltage, the highest load current and the highest ambient, not with nominal values.

## Choosing a heatsink (θSA)

With a heatsink, the heat path becomes a series chain:

**Tj = Ta + P · (θJC + θCS + θSA)**

θCS is the interface between case and heatsink (thermal grease or pad) and θSA is the heatsink itself. The heatsink must satisfy:

**θSA ≤ (Tj,max − Ta) / P − θJC − θCS**

Example: a TO-220 part dissipates 10 W; θJC = 3 °C/W, θCS = 0.5 °C/W, Ta = 40 °C, Tj limit 125 °C. The required θSA is 85 / 10 − 3.5 = **5.0 °C/W**. We pick a 4 °C/W heatsink:

[[calc:thermal?ps=direct&P=10&path=chain&jc=3&cs=0.5&sa=4&ta=40&tj=125|Open the heatsink example]]

Tj is **115 °C**, leaving 10 °C of margin. A heatsink’s θSA depends on airflow, mounting orientation and surface finish; use the natural-convection value and do not pick a heatsink right at the limit.

## Copper area and thermal vias

For surface-mount parts, the board itself is the heatsink. An exposed-pad package passes its heat through the pad into board copper; the copper spreads it and thermal vias carry it to the inner planes and the bottom side.

A single 0.3 mm via has about **165 °C/W** along its barrel. Vias in parallel divide that: nine vias give about **18 °C/W**.

[[calc:via?d=0.3&d_u=mm&L=1.6&p=25&n=9|Open nine thermal vias]]

That is only the path from top to bottom copper; for the heat to leave into the air, the bottom side also needs enough copper area.

- Use the pad and via layout recommended in the datasheet; if there is none, filling the pad with small vias at about 1–1.2 mm pitch is a common starting point.
- Open vias wick solder away from the pad. Keep them small, tent them from the bottom or use filled via-in-pad; see [[lesson:vias|via and pad design]].
- Connect the thermal pad to the pour directly, not through thermal-relief spokes.
- More copper area lowers θJA, but with diminishing returns: the first few square centimetres make the biggest difference.
- Do not cut the heat-spreading path with slots and split planes.

## Trace heating

Current-carrying traces heat up from their own I²·R losses too. For a trace that runs past a hot part, the "ambient" is the board temperature in that area, so size traces and vias around power components more conservatively. Trace width and temperature rise are covered in the [[lesson:trace-current|current-carrying traces]] lesson.

## Temperature margin for reliability

The absolute maximum Tj in the datasheet (often 150 °C) is not a design target. Choose a design limit instead, for example 125 °C for a part rated 150 °C. The relation between temperature and life is exponential: a widely used rule of thumb, especially for electrolytic capacitors, is that every 10 °C rise roughly halves the life. Derating guidelines for high-reliability projects set even lower limits.

## Common mistakes

- Using the datasheet θJA as-is for a small 2-layer board.
- Taking room temperature as ambient instead of the inside of the enclosure.
- Calculating LDO loss with the nominal input voltage.
- Connecting a thermal pad through thermal-relief spokes, or putting no vias under it.
- Forgetting that hot parts placed side by side heat each other.

> [!QUIZ] With θJA = 60 °C/W, Ta = 40 °C and a Tj limit of 125 °C, how much power can the part dissipate?
> P = (125 − 40) / 60 ≈ 1.42 W. Every watt above that raises Tj by 60 °C.

> [!QUIZ] The datasheet says θJA = 40 °C/W, but the Tj you measure on your own board is much higher than expected. Why?
> θJA is measured on the JEDEC test board (usually a 4-layer board with two internal planes) in still air. Your board may have less copper area, a different layer count or other heat sources nearby; the real θJA depends heavily on the board layout.

## Checklist

- Every power component’s loss is calculated for worst-case conditions.
- The temperature inside the enclosure is used as ambient.
- The difference between the θJA test board and your board is accounted for.
- Exposed pads have thermal vias and enough copper area.
- The heatsink is comfortably below the required θSA.
- Tj is below the design limit, not the absolute maximum.
`,
  },
};
