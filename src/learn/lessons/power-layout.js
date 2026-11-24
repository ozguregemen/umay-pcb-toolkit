import { figureFrom } from '../figures.js';
import { text, rect, path, polygon, circle, arrow, wire, node, ground, terminal, twoTerm, mosfet } from '../../ui/svg.js';

const S = {
  tr: {
    hotCap: 'Buck güç katı: Q1 iletimdeyken akım CIN’den Q1 üzerinden bobine, Q1 kesimdeyken Q2 (veya diyot) üzerinden akar. Bobin ve COUT akımı sürekli kalır; CIN, Q1 ve Q2’nin oluşturduğu döngüde ise akım her anahtarlamada nanosaniyeler içinde atlar: sıcak döngü.',
    hot: 'sıcak döngü: yüksek di/dt',
    cont: 'L ve COUT: sürekli akım',
    load: 'Yük',
    hs: 'üst FET',
    ls: 'alt FET / diyot',
    layCap: 'Üstten görünüş. Solda CIN, IC’nin VIN ve PGND pinlerinin hemen yanında: sıcak döngü küçük, SW bakırı küçük, FB izi COUT’tan gelir ve SW’den uzak durur. Sağda CIN uzağa konmuş: döngü IC’nin çevresini sarar; SW bakırı gereksiz geniş ve FB izi bobinin altından geçer.',
    good: '✓ küçük döngü, küçük SW',
    bad: '✗ büyük döngü, geniş SW',
  },
  en: {
    hotCap: 'Buck power stage: while Q1 conducts, current flows from CIN through Q1 into the inductor; while Q1 is off, it flows through Q2 (or a diode). The inductor and COUT currents stay continuous, but in the loop formed by CIN, Q1 and Q2 the current jumps within nanoseconds at every switching edge: the hot loop.',
    hot: 'hot loop: high di/dt',
    cont: 'L and COUT: continuous current',
    load: 'Load',
    hs: 'high-side FET',
    ls: 'low-side FET / diode',
    layCap: 'Top view. Left: CIN sits right next to the IC’s VIN and PGND pins, so the hot loop is small, the SW copper is small, and the FB trace comes from COUT and stays away from SW. Right: CIN placed far away, so the loop wraps around the IC; the SW copper is needlessly large and the FB trace runs under the inductor.',
    good: '✓ small loop, small SW',
    bad: '✗ big loop, large SW area',
  },
};

/** Buck schematic with the hot loop (CIN – Q1 – Q2) shaded. */
function hotLoop(lang) {
  const s = S[lang] ?? S.en;
  const yT = 44;
  const yS = 100;
  const yG = 156;
  const b = rect(66, 32, 100, 136, 'zone', ' rx="8"')
    + terminal(36, yT, 'VIN', 'top') + wire([36, yT], [152, yT])
    + twoTerm('C', 80, yT, 80, yG, { name: 'CIN', flip: true })
    + mosfet(140, 70) + mosfet(140, 130)
    + wire([152, 96], [152, 104]) + node(152, yS)
    + text(170, 60, 'Q1', { cls: 'name', anchor: 'start' }) + text(170, 74, s.hs, { anchor: 'start' })
    + text(170, 126, 'Q2', { cls: 'name', anchor: 'start' }) + text(170, 140, s.ls, { anchor: 'start' })
    + twoTerm('L', 152, yS, 250, yS, { name: 'L' })
    + wire([250, yS], [384, yS])
    + twoTerm('C', 290, yS, 290, yG, { name: 'COUT' })
    + twoTerm('R', 350, yS, 350, yG, { name: s.load })
    + node(290, yS) + node(350, yS)
    + terminal(384, yS, 'VOUT', 'top')
    + wire([80, yG], [350, yG])
    + node(80, yT) + node(80, yG) + node(152, yG) + node(290, yG) + node(214, yG)
    + ground(214, yG)
    // Circulating arrow: the loop current runs clockwise (CIN → Q1 → Q2 → GND → CIN).
    + path('M108,88A12,12 0 1,1 96,100', 'flow')
    + arrow(96, 104, 96, 98, { cls: 'flow', headCls: 'arrow flow' })
    + text(116, 184, s.hot, { cls: 'val' })
    + text(306, 184, s.cont);
  return figureFrom(420, 194, s.hotCap, b);
}

/** Copper trace of stroke width w (plain numbers only). */
const trace = (d, w) => `<path class="cutr" style="stroke-width:${w}" d="${d}"/>`;

/** One top-view panel in local coordinates (0…200 wide). */
function layoutPanel(good, s) {
  let b = '';
  // Copper pours (translucent) and traces.
  b += rect(5, 14, 52, 46, 'cu plane') + text(16, 28, 'VIN', { cls: 'name', anchor: 'start' });
  b += good
    ? polygon([[5, 72], [57, 72], [57, 130], [196, 130], [196, 166], [5, 166]], 'cu plane')
    : polygon([[5, 130], [196, 130], [196, 166], [5, 166]], 'cu plane')
      + trace('M57,88H54V130', 3);
  b += text(100, 156, 'GND', { cls: 'name' });
  b += good
    ? rect(111, 44, 21, 18, 'cu plane')
    : rect(111, 26, 21, 52, 'cu plane');
  b += text(121, good ? 40 : 22, 'SW', { cls: 'name' });
  b += rect(166, 40, 26, 74, 'cu plane') + text(179, 32, 'VOUT', { cls: 'name' });
  // Loop area (behind the parts).
  b += good
    ? rect(44, 46, 22, 42, 'zone-ok', ' rx="3"')
    : rect(14, 46, 48, 90, 'zone-bad', ' rx="3"');
  if (!good) b += trace('M14,60V98', 3);
  // IC and pins.
  b += rect(62, 30, 44, 70, 'comp', ' rx="3"') + text(84, 69, 'IC', { cls: 'name' });
  b += rect(57, 38, 5, 8, 'cu') + rect(57, 84, 5, 8, 'cu') + rect(106, 48, 5, 10, 'cu') + rect(106, 84, 5, 7, 'cu');
  // Inductor, output capacitor.
  b += rect(132, 36, 34, 32, 'comp', ' rx="3"') + text(149, 56, 'L', { cls: 'name' });
  b += rect(172, 100, 14, 44, 'comp') + rect(172, 100, 14, 9, 'cu') + rect(172, 135, 14, 9, 'cu');
  b += text(166, 126, 'COUT', { anchor: 'end' });
  // Feedback trace (drawn over the parts): from COUT, away from SW (good) /
  // between the inductor pads, next to SW (bad).
  b += trace(good ? 'M111,88H158V104H166' : 'M111,88H149V52H166', 2);
  b += text(good ? 134 : 128, 102, 'FB');
  // Input capacitor.
  b += good
    ? rect(34, 46, 14, 40, 'comp') + rect(34, 46, 14, 8, 'cu') + rect(34, 78, 14, 8, 'cu') + text(29, 70, 'CIN', { cls: 'name', anchor: 'end' })
    : rect(7, 98, 14, 42, 'comp') + rect(7, 98, 14, 8, 'cu') + rect(7, 132, 14, 8, 'cu') + text(25, 118, 'CIN', { cls: 'name', anchor: 'start' });
  // GND vias.
  b += (good ? [[41, 98], [41, 108], [179, 152], [179, 160]] : [[30, 152], [179, 152], [179, 160]])
    .map(([x, y]) => circle(x, y, 2.4, 'hole')).join('');
  // The hot loop itself.
  b += good
    ? path('M44,47H66V88H44Z', 'flow') + arrow(66, 58, 66, 74, { cls: 'flow', headCls: 'arrow flow' })
    : path('M14,100V46H62V88H54V136H14Z', 'flow') + arrow(62, 56, 62, 72, { cls: 'flow', headCls: 'arrow flow' });
  b += text(100, 186, good ? s.good : s.bad, { cls: good ? 'okt' : 'badt' });
  return b;
}

function buckLayout(lang) {
  const s = S[lang] ?? S.en;
  return figureFrom(420, 194, s.layCap,
    `<g transform="translate(8,0)">${layoutPanel(true, s)}</g><g transform="translate(214,0)">${layoutPanel(false, s)}</g>`);
}

export default {
  figures: { 'hot-loop': hotLoop, 'buck-layout': buckLayout },
  body: {
    tr: `
## Neden önemli?

Anahtarlamalı bir regülatörün şeması veri sayfasından birebir kopyalanabilir, ama aynı şema iki farklı yerleşimle iki farklı devre olur. Kötü bir yerleşimde çıkış gürültülüdür, anahtarlama düğümü çınlar, regülasyon kararsızlaşır, MOSFET’ler aşma gerilimiyle zorlanır ve kart EMC testinden kalır. Bunların hiçbiri şemada görünmez; hepsi bakırın nereden geçtiğiyle ilgilidir.

İyi haber şu: güç katı yerleşiminin kuralları azdır ve her zaman aynıdır. Önce akımın **nerede aniden değiştiğini** bulursunuz, sonra o döngüyü olabildiğince küçük yaparsınız. Regülatörün veri sayfasındaki önerilen yerleşim (layout example) her zaman başlangıç noktanızdır.

## Akım nerede sıçrar? Sıcak döngü

[[fig:hot-loop]]

Buck dönüştürücüde bobin akımı süreklidir: üçgen bir dalgalanmayla ortalama yük akımı etrafında gidip gelir. Çıkış kondansatörü yalnızca bu küçük dalgalanmayı görür. Giriş tarafı ise farklıdır:

- Q1 iletimdeyken bobin akımı CIN’den ve Q1’den gelir.
- Q1 kesime girince aynı akım bu kez GND’den Q2 (veya diyot) üzerinden gelir.

Yani CIN – Q1 – Q2 – GND döngüsündeki akım her anahtarlamada sıfır ile yük akımı arasında birkaç nanosaniyede atlar. Bu döngüye **sıcak döngü (hot loop)** denir. İçindeki her nanohenri, V = L · di/dt kadar gerilim sıçraması demektir:

\`\`\`
di/dt = 2 A / 5 ns = 0,4 A/ns
L = 3 nH   →  V = 3 nH · 0,4 A/ns = 1,2 V
L = 10 nH  →  V = 4 V
\`\`\`

Bu sıçrama anahtarlama düğümünde VIN’in üzerine biner ve döngü endüktansı MOSFET kapasiteleriyle rezonansa girerek çınlar: 2 nH ile 500 pF yaklaşık **159 MHz**’de çınlar, tam da yayılan emisyon testinin ölçtüğü bölgede. Döngü aynı zamanda küçük bir manyetik antendir; ışıma, döngü alanı ve di/dt ile orantılıdır.

> [!RULE] Sıcak döngüyü bulun ve en küçük alanla, tek katmanda, altında kesintisiz bir GND düzlemiyle kapatın. Yerleşimin geri kalanı bundan sonra gelir.

Kaba bir kural olarak, altında düzlem olmayan ince bir iz milimetre başına yaklaşık 1 nH ekler; hemen altındaki kesintisiz bir GND düzlemi bu değeri belirgin biçimde düşürür. 1,6 mm’lik bir kartta 0,3 mm’lik tek bir via yaklaşık 1,3 nH’dir; döngüye giren her via bir sıçrama kaynağıdır.

[[calc:via?d=0.3&d_u=mm&L=1.6|Via endüktansı]] [[calc:snubber|RC snubber hesaplayıcısı]]

## Giriş kondansatörü

[[fig:buck-layout]]

- Küçük kılıflı bir MLCC’yi (100 nF–1 µF, 0402/0603) IC’nin VIN ve PGND pinlerinin **hemen yanına**, aynı katmana, araya via koymadan yerleştirin. Bulk MLCC’ler (ör. 10 µF) onun hemen arkasına, elektrolitik kondansatör daha uzağa gelebilir.
- Kondansatör ile pinler arasında ince iz değil, geniş bakır kullanın.
- **Dalgalanma akımı:** CIN’in RMS akımı I_out·√(D·(1 − D))’dir ve D = 0,5’te en büyük değerine, I_out / 2’ye ulaşır. Bu akım kondansatörü ısıtır; birkaç kondansatöre paylaştırın.
- **Gerilim ve DC öngerilim:** seramik kondansatör VIN’de kapasitesinin önemli bir kısmını kaybedebilir; üreticinin eğrisine bakın ([[lesson:pdn|güç dağıtımı dersi]]).
- **Sıcak takma:** girişinde yalnızca seramik kondansatör olan bir kart uzun bir kabloyla takıldığında kablo endüktansı ile kondansatör rezonansa girer ve giriş gerilimi kısa süreliğine iki katına yaklaşabilir (Linear Technology AN88). Bir miktar ESR’si olan bulk elektrolitik veya bir TVS bunu sönümler.

## Anahtarlama düğümü (SW) küçük olsun

SW düğümü kartın en hızlı değişen gerilimidir: 12 V’u 5 ns’de geçen bir kenar **2,4 V/ns** eder. Bu düğüm iki şekilde sorun çıkarır:

- **Kapasitif kuplaj:** I = C · dV/dt. Yalnızca 1 pF’lık bir kuplaj bile yüksek empedanslı bir düğüme 1 pF · 2,4 V/ns = **2,4 mA**’lik darbeler basar.
- **Elektrik alan anteni:** SW bakırı ne kadar genişse o kadar iyi ışır.

Bu yüzden SW bakırını yalnızca akımı taşıyacak kadar geniş, olabildiğince kısa tutun; bobini SW pininin yanına koyun. SW’nin yanından, altındaki komşu katmandan ve bobinin altından FB, analog veya saat izi geçirmeyin. Bootstrap kondansatörünü (BST–SW) IC’ye yakın tutun.

> [!WARN] SW bakırını soğutma için büyütmeyin. Isıyı sessiz netlerden, yani GND, VIN ve VOUT bakırından yayın; bunlar DC’dir ve ışımaz.

## Bobin

- Bobini SW pinine en kısa yoldan bağlayın. Ekranlı (shielded) bobinler çok daha az manyetik alan yayar; küçük kartlarda tercih edin.
- Bazı üreticiler sargı başlangıcını bir noktayla işaretler; gürültülü ucun (SW) iç sargıya gelmesini önerirler. Veri sayfasına bakın.
- Doyma akımı (Isat) tepe akımın üzerinde, ısınma akımı (Irms) yük akımının üzerinde olmalıdır. Tepe akımı [[calc:dcdc|DC-DC hesaplayıcısı]] verir.

## Geri besleme (FB)

FB pini yüksek empedanslıdır ve çıkış geriliminin referansıdır; üzerine kuple olan her gürültü çıkışa yansır.

- Bölücü dirençlerini FB pininin **yanına** koyun; uzun olan hat, çıkıştan bölücüye giden düşük empedanslı algılama izi olsun.
- Algılama izini çıkış kondansatöründen (veya gerilimin önemli olduğu yük noktasından) alın, SW ve bobinden uzaktan, tercihen bir GND düzleminin üzerinden götürün.
- Bölücünün alt ucunu ve kompanzasyon parçalarını IC’nin sessiz toprağına (AGND) bağlayın.

[[calc:divider?mode=fb&vref=0.8&vout=3.3|FB bölücüsü: 0,8 V referanstan 3,3 V]]

## Toprak dönüşü ve vialar

- CIN’in GND ucu, alt FET’in kaynağı (PGND pini) ve COUT’un GND ucu üst katmanda aynı bakırla birleşsin. Darbeli akım bu bakırda kalır.
- Bu bakırı CIN ve COUT GND padlerinin yanında birkaç via ile hemen alttaki kesintisiz GND düzlemine bağlayın. Sıcak döngünün altındaki düzlem, ince bir dielektrikle (ör. 4 katmanlı kartta L2), döngü endüktansını belirgin biçimde düşürür.
- Çoğu kontrol entegresinde ayrı AGND ve PGND pinleri vardır; veri sayfasının dediği tek noktada (çoğu zaman açık pad altında) birleştirin ve darbeli akımın AGND yolundan akmasına izin vermeyin.
- Sıcak döngüye via koymak zorundaysanız birkaç viayı paralel kullanın.

## Termal bakır ve vialar

Regülatörün açık padini (exposed pad) ve MOSFET’lerin dren veya kaynak padlerini iç ve alt katmanlara termal vialarla bağlayın; 1,0–1,2 mm aralıklı 0,3 mm’lik vialar yaygın bir başlangıçtır (doldurma veya kapatma için montajcıya danışın). Kayıpları [[calc:mosfet|MOSFET kayıpları]] ile tahmin edip sıcaklığı [[calc:thermal|termal hesaplayıcıyla]] kontrol edin. Ayrıntılar [[lesson:thermal|termal tasarım dersinde]].

## Boost ve diğer topolojiler

Kural aynıdır: akımın aniden değiştiği döngüyü bulun.

| Topoloji | Darbeli (sıcak) döngü | Kritik kondansatör |
|---|---|---|
| Buck | CIN – üst FET – alt FET/diyot | CIN |
| Boost | alt FET – diyot/senk. FET – COUT | COUT |
| Ters çeviren buck-boost | CIN – FET – diyot – COUT | ikisi de |
| 4 anahtarlı buck-boost | giriş tarafında buck, çıkış tarafında boost döngüsü | ikisi de |
| Flyback | birincil: CIN – sargı – FET; ikincil: sargı – diyot – COUT | ikisi de, artı kıskaç devresi |

Boost’ta bobin girişte olduğu için giriş akımı süreklidir; darbeli akım çıkış tarafındadır. Bu yüzden boost’ta **COUT**, anahtar ve diyotla birlikte sıkı bir döngü kurmalıdır.

## LDO notları

LDO anahtarlama yapmaz, dolayısıyla sıcak döngüsü yoktur; ama iki konuya dikkat edin:

- Giriş ve çıkış kondansatörlerini pinlerin yanına koyun ve kararlılık için veri sayfasının istediği kapasite ve ESR aralığına uyun.
- Gücün tamamı ısıya döner: P = (Vin − Vout) · I. 12 V’tan 3,3 V’a 0,3 A’de bu **2,61 W** eder; θJA = 60 K/W’lık bir kılıfta 40 °C ortamda bağlantı sıcaklığı **196,6 °C** olur, yani imkânsızdır. Önce bir buck ile düşürün veya doğrudan buck kullanın.

[[calc:thermal?ps=ldo&vin=12&vout=3.3&io=0.3&ja=60&ta=40|12 V → 3,3 V LDO, 0,3 A]]

Buck çıkışına gürültü süzmek için LDO koyacaksanız PSRR’nin anahtarlama frekansındaki değerine bakın; çoğu LDO’da PSRR frekansla düşer. Gerekirse araya bir ferrit veya LC filtre ekleyin.

## Çözümlü örnek: 12 V → 3,3 V / 2 A buck

**1. Güç katı değerleri.** 500 kHz, %30 dalgalanma ve %90 verimle hesaplayıcı şunları verir: D ≈ %30,6; L ≥ yaklaşık 7,98 µH; tepe akım 2,3 A; COUT ≥ 7,5 µF ve ESR ≤ yaklaşık 33 mΩ; CIN RMS akımı yaklaşık **0,92 A**.

[[calc:dcdc?top=buck&vin=12&vout=3.3&iout=2&f=500&r=30|12 V → 3,3 V / 2 A buck]]

**2. Parça seçimi.** Standart değer olarak 10 µH (daha küçük dalgalanma) seçilebilir; doyma akımı 2,3 A’in rahatça üzerinde, örneğin 3 A’den büyük olsun. CIN: 0,92 A RMS’yi paylaşmak için iki adet 10 µF / 25 V MLCC ve pinlerin dibinde bir 100 nF.

**3. Yerleşim.** 100 nF ve 10 µF’lar VIN–PGND pinlerinin yanında, üst katmanda; L2 kesintisiz GND. SW bakırı IC pininden bobine kısa bir ada. FB bölücüsü FB pininin yanında, algılama izi COUT’tan. GND vialarını CIN ve COUT GND padlerinin yanına koyun.

**4. Termal.** Çıkış gücü 6,6 W; %90 verimle girişten 7,33 W çekilir ve yaklaşık **0,73 W** IC ile bobinde ısıya döner. Açık padin altına termal via dizisi koyun ve GND bakırını iç katmanlara yayın.

**5. İlk kartta yedek.** SW–GND arasına RC snubber için boş (DNP) pad, girişe isteğe bağlı bir bulk kondansatör yeri ve SW, VIN, VOUT için kısa toprak yaylı prob ölçümüne uygun test noktaları bırakın.

## Yerleşim inceleme adımları

1. Veri sayfasının önerilen yerleşimini yanınıza açın; parça sırası ve yönleri aynı mı?
2. Sıcak döngüyü işaretleyin: CIN pinlerin dibinde mi, döngüde via var mı, alanı ne kadar?
3. SW bakırı küçük mü; yanında veya altında hassas bir iz var mı?
4. Bobin SW pininin yanında mı?
5. FB izi COUT’tan mı geliyor, bölücü FB pininin yanında mı, SW’den uzak mı?
6. PGND üst katmanda birleşiyor mu; CIN ve COUT yanında vialar var mı; AGND veri sayfasına uygun mu?
7. Termal: açık pad vialı mı; ısı sessiz bakıra yayılıyor mu?
8. Akım taşıyan iz genişlikleri ve via sayıları hesaplandı mı ([[calc:trace|iz genişliği]], [[calc:via|via]])?
9. Test noktaları ve isteğe bağlı parça yerleri (snubber, bulk) var mı?

## Sık yapılan hatalar

- CIN’i "girişin yakınına" koyup IC’den uzaklaştırmak.
- Sıcak döngüye via veya katman değişimi sokmak.
- SW’yi soğutma için geniş bir bakır alanına dönüştürmek.
- FB izini bobinin altından veya SW’nin yanından geçirmek.
- AGND ve PGND’yi rastgele yerlerden birleştirmek.
- LDO’nun ısıl gücünü hesaplamadan büyük gerilim farkıyla çalıştırmak.
- Boost’ta da giriş kondansatörünü en kritik parça sanmak.

> [!QUIZ] Buck dönüştürücüde hangi kondansatör IC’ye en yakın olmalı ve neden?
> Giriş kondansatörü (CIN). Darbeli akım CIN – üst FET – alt FET döngüsünde akar; bobin ve COUT akımı süreklidir. CIN uzaklaşırsa sıcak döngünün endüktansı ve alanı büyür: çınlama, aşma ve EMI artar.

> [!QUIZ] Boost dönüştürücüde sıcak döngü hangisidir?
> Alt anahtar – diyot (veya senkron FET) – COUT – GND döngüsü. Boost’ta bobin girişte olduğundan giriş akımı süreklidir; darbeli akım çıkış tarafındadır, bu yüzden COUT anahtara ve diyota sıkı yerleştirilir.

> [!QUIZ] Sıcak döngünüzün endüktansı 3 nH ve akım 5 ns’de 2,5 A değişiyor. SW düğümünde ne kadar ek sıçrama beklersiniz?
> di/dt = 2,5 A / 5 ns = 0,5 A/ns; V = 3 nH · 0,5 A/ns = 1,5 V. Bu gerilim VIN’in üzerine biner ve MOSFET kapasiteleriyle çınlama yapar.

> [!QUIZ] Regülatör ısınıyor; SW bakırını büyütmek iyi bir fikir mi?
> Hayır. SW yüksek dV/dt taşır; geniş SW bakırı kapasitif kuplajı ve ışımayı artırır. Isıyı GND, VIN veya VOUT gibi sessiz netlerin bakırından ve termal vialarla iç katmanlara yayın.

## Kontrol listesi

- Topolojinin sıcak döngüsü belirlendi; ilgili kondansatör pinlerin dibinde, döngüde via yok.
- Sıcak döngünün altında kesintisiz GND düzlemi var.
- SW bakırı küçük; yanında ve altında hassas iz yok; bobin SW pininin yanında.
- FB algılaması COUT’tan; bölücü FB pininin yanında; kompanzasyon parçaları IC’ye yakın.
- PGND üst katmanda birleşiyor; GND vialar CIN ve COUT yanında; AGND bağlantısı veri sayfasına uygun.
- CIN dalgalanma akımı, DC öngerilim kaybı ve gerilim sınıfı kontrol edildi; bobinin Isat değeri tepe akımın üzerinde.
- Termal vialar ve sessiz netlerde ısı yayma bakırı var; LDO kayıpları hesaplandı.
- Snubber ve bulk kondansatör için yedek padler, ölçüm için test noktaları bırakıldı.
`,
    en: `
## Why it matters

You can copy a switching regulator’s schematic straight from the datasheet, but the same schematic with two different layouts gives two different circuits. With a bad layout the output is noisy, the switch node rings, regulation becomes unstable, the MOSFETs are stressed by overshoot, and the board fails its EMC test. None of this is visible in the schematic; it is all about where the copper goes.

The good news: the rules of power-stage layout are few and always the same. First find where the current **changes abruptly**, then make that loop as small as you can. The recommended layout in the regulator datasheet (layout example) is always your starting point.

## Where does the current jump? The hot loop

[[fig:hot-loop]]

In a buck converter the inductor current is continuous: it swings in a triangle around the average load current. The output capacitor only sees this small ripple. The input side is different:

- While Q1 conducts, the inductor current comes from CIN through Q1.
- When Q1 turns off, the same current now comes from GND through Q2 (or a diode).

So the current in the CIN – Q1 – Q2 – GND loop jumps between zero and the load current in a few nanoseconds at every switching edge. This loop is the **hot loop**. Every nanohenry inside it means a voltage spike of V = L · di/dt:

\`\`\`
di/dt = 2 A / 5 ns = 0.4 A/ns
L = 3 nH   →  V = 3 nH · 0.4 A/ns = 1.2 V
L = 10 nH  →  V = 4 V
\`\`\`

The spike adds to VIN at the switch node, and the loop inductance resonates with the MOSFET capacitances: 2 nH with 500 pF rings at about **159 MHz**, right in the range a radiated-emissions test measures. The loop is also a small magnetic antenna; its radiation scales with loop area and di/dt.

> [!RULE] Find the hot loop and close it with the smallest area, on one layer, over a solid GND plane. The rest of the layout comes after that.

As a rough rule, a thin trace with no plane under it adds about 1 nH per millimetre; a solid GND plane right underneath lowers that markedly. A single 0.3 mm via in a 1.6 mm board is about 1.3 nH; every via you put in the loop is a source of spikes.

[[calc:via?d=0.3&d_u=mm&L=1.6|Via inductance]] [[calc:snubber|RC snubber calculator]]

## The input capacitor

[[fig:buck-layout]]

- Place a small-case MLCC (100 nF–1 µF, 0402/0603) **right next to** the IC’s VIN and PGND pins, on the same layer, with no via in between. Bulk MLCCs (e.g. 10 µF) go right behind it; an electrolytic can sit further away.
- Connect the capacitor to the pins with wide copper, not thin traces.
- **Ripple current:** the RMS current of CIN is I_out·√(D·(1 − D)), largest at D = 0.5, where it reaches I_out / 2. It heats the capacitor; share it between several parts.
- **Voltage and DC bias:** a ceramic capacitor can lose a large part of its capacitance at VIN; check the manufacturer’s curve (see the [[lesson:pdn|power distribution lesson]]).
- **Hot plugging:** when a board with only ceramic input capacitors is plugged in through a long cable, the cable inductance and the capacitor resonate and the input voltage can briefly approach twice its value (Linear Technology AN88). A bulk electrolytic with some ESR, or a TVS, damps this.

## Keep the switch node (SW) small

The SW node is the fastest-changing voltage on the board: an edge through 12 V in 5 ns is **2.4 V/ns**. It causes trouble in two ways:

- **Capacitive coupling:** I = C · dV/dt. Just 1 pF of coupling pushes pulses of 1 pF · 2.4 V/ns = **2.4 mA** into a high-impedance node.
- **Electric-field antenna:** the larger the SW copper, the better it radiates.

So make the SW copper only as wide as the current needs and as short as possible; place the inductor next to the SW pin. Do not route FB, analog or clock traces beside SW, on the adjacent layer under it, or under the inductor. Keep the bootstrap capacitor (BST–SW) close to the IC.

> [!WARN] Do not enlarge the SW copper for cooling. Spread heat through the quiet nets instead, the GND, VIN and VOUT copper; they are DC and do not radiate.

## The inductor

- Connect the inductor to the SW pin by the shortest path. Shielded inductors radiate far less magnetic field; prefer them on small boards.
- Some manufacturers mark the start of the winding with a dot and recommend putting the noisy end (SW) on the inner winding. Check the datasheet.
- The saturation current (Isat) must exceed the peak current, and the heating current (Irms) the load current. The [[calc:dcdc|DC-DC calculator]] gives the peak current.

## Feedback (FB)

The FB pin is high impedance and is the reference for the output voltage; any noise coupled into it appears at the output.

- Put the divider resistors **next to** the FB pin; the long run should be the low-impedance sense trace from the output to the divider.
- Take the sense trace from the output capacitor (or from the load point where the voltage matters), route it away from SW and the inductor, preferably over a GND plane.
- Connect the bottom of the divider and the compensation parts to the IC’s quiet ground (AGND).

[[calc:divider?mode=fb&vref=0.8&vout=3.3|FB divider: 3.3 V from a 0.8 V reference]]

## Ground return and vias

- Join the GND end of CIN, the source of the low-side FET (PGND pin) and the GND end of COUT with the same top-layer copper. The pulsed current stays in that copper.
- Connect it to the solid GND plane right below with several vias next to the CIN and COUT GND pads. A plane under the hot loop, across a thin dielectric (e.g. L2 of a 4-layer board), markedly lowers the loop inductance.
- Many controllers have separate AGND and PGND pins; join them at the single point the datasheet specifies (often under the exposed pad) and do not let pulsed current flow through the AGND path.
- If you must put vias in the hot loop, use several in parallel.

## Thermal copper and vias

Connect the regulator’s exposed pad and the MOSFET drain or source pads to inner and bottom layers with thermal vias; 0.3 mm vias at a 1.0–1.2 mm pitch are a common start (ask your assembler about filling or tenting). Estimate the losses with [[calc:mosfet|MOSFET losses]] and check the temperature with the [[calc:thermal|thermal calculator]]. Details are in the [[lesson:thermal|thermal design lesson]].

## Boost and other topologies

The rule is the same: find the loop where the current changes abruptly.

| Topology | Pulsed (hot) loop | Critical capacitor |
|---|---|---|
| Buck | CIN – high-side FET – low-side FET/diode | CIN |
| Boost | low-side FET – diode/sync FET – COUT | COUT |
| Inverting buck-boost | CIN – FET – diode – COUT | both |
| 4-switch buck-boost | a buck loop on the input side, a boost loop on the output side | both |
| Flyback | primary: CIN – winding – FET; secondary: winding – diode – COUT | both, plus the clamp |

In a boost the inductor sits at the input, so the input current is continuous and the pulsed current is on the output side. That is why in a boost **COUT** must form a tight loop with the switch and the diode.

## Notes on LDOs

An LDO does not switch, so it has no hot loop, but watch two things:

- Place the input and output capacitors next to the pins and meet the capacitance and ESR range the datasheet requires for stability.
- All of the dropped power becomes heat: P = (Vin − Vout) · I. From 12 V to 3.3 V at 0.3 A that is **2.61 W**; in a package with θJA = 60 K/W at 40 °C ambient the junction reaches **196.6 °C**, which is impossible. Step down with a buck first, or use a buck directly.

[[calc:thermal?ps=ldo&vin=12&vout=3.3&io=0.3&ja=60&ta=40|12 V → 3.3 V LDO at 0.3 A]]

If you add an LDO after a buck to clean up noise, check its PSRR at the switching frequency; in most LDOs PSRR falls with frequency. Add a ferrite or LC filter in between if needed.

## Worked example: a 12 V → 3.3 V / 2 A buck

**1. Power-stage values.** At 500 kHz, 30 % ripple and 90 % efficiency the calculator gives: D ≈ 30.6 %; L ≥ about 7.98 µH; 2.3 A peak current; COUT ≥ 7.5 µF with ESR ≤ about 33 mΩ; CIN RMS current about **0.92 A**.

[[calc:dcdc?top=buck&vin=12&vout=3.3&iout=2&f=500&r=30|12 V → 3.3 V / 2 A buck]]

**2. Part choice.** A standard 10 µH (less ripple) works; its saturation current should be comfortably above 2.3 A, for example over 3 A. CIN: two 10 µF / 25 V MLCCs to share the 0.92 A RMS, plus a 100 nF right at the pins.

**3. Layout.** The 100 nF and the 10 µF parts next to the VIN–PGND pins on the top layer; L2 solid GND. The SW copper is a short island from the IC pin to the inductor. The FB divider sits at the FB pin, the sense trace comes from COUT. GND vias go next to the CIN and COUT GND pads.

**4. Thermal.** The output power is 6.6 W; at 90 % efficiency the input draws 7.33 W, so about **0.73 W** turns into heat in the IC and the inductor. Put a thermal via array under the exposed pad and spread the GND copper on inner layers.

**5. Spares on the first board.** Leave an unpopulated (DNP) pad pair for an RC snubber across SW–GND, a spot for an optional input bulk capacitor, and test points at SW, VIN and VOUT suited to probing with a short ground spring.

## Layout review steps

1. Open the datasheet’s recommended layout next to yours; are part order and orientation the same?
2. Mark the hot loop: is CIN at the pins, is there a via in the loop, how large is its area?
3. Is the SW copper small; is there a sensitive trace beside or under it?
4. Is the inductor next to the SW pin?
5. Does the FB trace come from COUT, is the divider at the FB pin, is it away from SW?
6. Does PGND join on the top layer; are there vias next to CIN and COUT; is AGND per the datasheet?
7. Thermal: does the exposed pad have vias; does the heat spread into quiet copper?
8. Are the widths of current-carrying traces and the via counts calculated ([[calc:trace|trace width]], [[calc:via|via]])?
9. Are there test points and spots for optional parts (snubber, bulk)?

## Common mistakes

- Placing CIN "near the input" and therefore far from the IC.
- Putting vias or a layer change into the hot loop.
- Turning SW into a large copper area for cooling.
- Routing the FB trace under the inductor or beside SW.
- Joining AGND and PGND at random points.
- Running an LDO across a large voltage difference without calculating its dissipation.
- Treating the input capacitor as the most critical part in a boost too.

> [!QUIZ] In a buck converter, which capacitor must be closest to the IC, and why?
> The input capacitor (CIN). The pulsed current flows in the CIN – high-side FET – low-side FET loop, while the inductor and COUT currents are continuous. If CIN moves away, the hot loop’s inductance and area grow: more ringing, overshoot and EMI.

> [!QUIZ] What is the hot loop in a boost converter?
> The low-side switch – diode (or synchronous FET) – COUT – GND loop. In a boost the inductor is at the input, so the input current is continuous and the pulsed current is on the output side; COUT is therefore placed tight to the switch and the diode.

> [!QUIZ] Your hot loop has 3 nH of inductance and the current changes by 2.5 A in 5 ns. How much extra spike do you expect at the SW node?
> di/dt = 2.5 A / 5 ns = 0.5 A/ns; V = 3 nH · 0.5 A/ns = 1.5 V. It adds to VIN and rings with the MOSFET capacitances.

> [!QUIZ] The regulator runs hot. Is enlarging the SW copper a good idea?
> No. SW carries a high dV/dt; large SW copper increases capacitive coupling and radiation. Spread the heat through the copper of quiet nets such as GND, VIN or VOUT, and into inner layers with thermal vias.

## Checklist

- The topology’s hot loop is identified; its capacitor sits at the pins with no via in the loop.
- A solid GND plane lies under the hot loop.
- The SW copper is small, with no sensitive trace beside or under it; the inductor sits next to the SW pin.
- FB sensing comes from COUT; the divider is at the FB pin; compensation parts are close to the IC.
- PGND joins on the top layer; GND vias next to CIN and COUT; the AGND connection follows the datasheet.
- CIN ripple current, DC-bias derating and voltage rating are checked; the inductor’s Isat is above the peak current.
- Thermal vias and heat-spreading copper on quiet nets are in place; LDO losses are calculated.
- Spare pads for a snubber and bulk capacitor, and test points for measurement, are left on the board.
`,
  },
};
