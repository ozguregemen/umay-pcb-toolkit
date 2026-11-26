import { figureFrom } from '../figures.js';
import { text, rect, path, arrow, wire, node, ground, terminal, twoTerm, opamp, block, bar } from '../../ui/svg.js';

const S = {
  tr: {
    chainCap: 'Ölçüm zinciri ve her bloğun başlıca hata kaynakları. ADC yalnızca pinine ulaşan gerilimi, referansına oranlayarak görür. Kesikli çizgi: oransal ölçümde sensör de ADC ile aynı Vref’ten beslenir.',
    errHead: 'Başlıca hata kaynakları',
    blocks: [
      ['Sensör', 'NTC, şönt', 'tolerans, öz ısınma', 'kablo ve temas direnci'],
      ['Koşullama', 'bölücü / yükselteç', 'ofset ve kazanç hatası', 'direnç toleransı, sıcaklık kayması'],
      ['RC filtre', 'örtüşme önleyici', 'oturma süresi', 'kaçak akım × R'],
      ['ADC', 'örnekleme kond., Vref', 'nicemleme, INL, gürültü', 'referans hatası ve kayması'],
      ['Yazılım', 'ortalama, kalibrasyon', 'model hatası (ör. Beta)', 'yuvarlama, tamsayı aritmetiği'],
    ],
    ntcCap: 'NTC bölücü, RC filtre ve ADC girişi. Rs ile ADC’nin referans pini aynı Vref’e bağlıdır: ölçüm oransaldır ve Vref’teki değişim sonucu etkilemez. Rf ile Cf örtüşme önleyici filtreyi oluşturur; Cf aynı zamanda örnekleme kondansatörünün çektiği yükü karşılar.',
    vref: 'Vref = 3,3 V',
    ratio: 'oransal: bölücü ve ADC aynı Vref’te',
    cfNote: 'Cf: ADC pininin dibinde',
    kelvinCap: 'Şönt direncinde Kelvin (dört uçlu) bağlantı, üstten görünüş. Yük akımı geniş bakırdan akar; ince ölçüm izleri pedlerin iç kenarından ayrı bir çift olarak çıkar ve yan yana yükseltece gider. Ölçüm izini akım taşıyan bakırdan alırsanız (kırmızı kesikli çizgi) aradaki bakırın ve lehimin direnci şönte eklenir.',
    iLoad: 'yük akımı',
    wide: 'geniş bakır',
    k1: 'Kelvin ölçüm izleri',
    k2: 'yük akımı taşımaz',
    bad: '✗ buradan değil',
    amp: 'akım ölçüm yükselteci',
  },
  en: {
    chainCap: 'The measurement chain and the main error sources of each block. The ADC only sees the voltage that reaches its pin, as a fraction of its reference. Dashed line: in a ratiometric measurement the sensor is fed from the same Vref as the ADC.',
    errHead: 'Main error sources',
    blocks: [
      ['Sensor', 'NTC, shunt', 'tolerance, self-heating', 'lead and contact resistance'],
      ['Conditioning', 'divider / amplifier', 'offset and gain error', 'resistor tolerance, drift'],
      ['RC filter', 'anti-alias', 'settling time', 'leakage current × R'],
      ['ADC', 'sample capacitor, Vref', 'quantisation, INL, noise', 'reference error and drift'],
      ['Firmware', 'averaging, calibration', 'model error (e.g. Beta)', 'rounding, integer maths'],
    ],
    ntcCap: 'NTC divider, RC filter and ADC input. Rs and the ADC reference pin connect to the same Vref: the measurement is ratiometric, so a change in Vref does not affect the result. Rf and Cf form the anti-alias filter; Cf also supplies the charge drawn by the sampling capacitor.',
    vref: 'Vref = 3.3 V',
    ratio: 'ratiometric: divider and ADC share Vref',
    cfNote: 'Cf: right at the ADC pin',
    kelvinCap: 'Kelvin (four-terminal) connection of a shunt resistor, top view. The load current flows in the wide copper; the thin sense traces leave the inner edges of the pads as a separate pair and run side by side to the amplifier. If you tap the sense trace from the current-carrying copper (red dashed line), the resistance of the copper and solder in between adds to the shunt.',
    iLoad: 'load current',
    wide: 'wide copper',
    k1: 'Kelvin sense traces',
    k2: 'carry no load current',
    bad: '✗ not from here',
    amp: 'current-sense amplifier',
  },
};

const FLOW = { cls: 'flow', headCls: 'arrow flow' };

/** Vertical block chain: sensor → conditioning → filter → ADC → firmware, error sources on the right. */
function chainBlocks(lang) {
  const s = S[lang] ?? S.en;
  const x = 44;
  const w = 140;
  const h = 34;
  const pitch = 48;
  const y0 = 24;
  const mid = x + w / 2;
  let b = text(200, 14, s.errHead, { cls: 'title', anchor: 'start' });
  s.blocks.forEach(([name, sub, e1, e2], i) => {
    const y = y0 + i * pitch;
    b += rect(x, y, w, h, 'comp', ' rx="4"')
      + text(mid, y + 15, name, { cls: 'name' })
      + text(mid, y + 28, sub, { size: 10 })
      + text(200, y + 14, e1, { anchor: 'start' })
      + text(200, y + 28, e2, { anchor: 'start' });
    if (i < s.blocks.length - 1) b += arrow(mid, y + h, mid, y + pitch - 1);
  });
  // Reference into the ADC (row 3); dashed branch to the sensor (row 0) for ratiometric sensing.
  const yAdc = y0 + 3 * pitch + h / 2;
  const ySen = y0 + h / 2;
  b += arrow(8, yAdc, x - 1, yAdc) + text(25, yAdc - 6, 'Vref', { cls: 'name', size: 11 })
    + path(`M8,${yAdc}V${ySen}`, 'dimline dash') + arrow(8, ySen, x - 1, ySen, { cls: 'dimline dash' });
  return figureFrom(420, 258, s.chainCap, b);
}

/** NTC divider (Rs to Vref, NTC to ground), RC filter and the ADC with its reference on the same Vref. */
function ntcDivider(lang) {
  const s = S[lang] ?? S.en;
  const yRail = 34;
  const yMid = 100;
  const yGnd = 162;
  const b = terminal(46, yRail, s.vref, 'top')
    + wire([49, yRail], [352, yRail], [352, 70])
    + text(228, yRail - 8, s.ratio)
    + node(110, yRail)
    + twoTerm('R', 110, yRail, 110, yMid, { name: 'Rs', value: '10 kΩ' })
    + node(110, yMid)
    // NTC labels are placed by hand, clear of the thermistor's bent line.
    + twoTerm('NTC', 110, yMid, 110, yGnd)
    + text(128, 129, 'NTC', { cls: 'name', anchor: 'start' })
    + text(128, 143, '10 kΩ (25 °C)', { cls: 'val', anchor: 'start' })
    + ground(110, yGnd)
    + wire([110, yMid], [150, yMid])
    + twoTerm('R', 150, yMid, 230, yMid, { name: 'Rf', value: '1 kΩ' })
    + wire([230, yMid], [316, yMid]) + node(270, yMid)
    + twoTerm('C', 270, yMid, 270, yGnd, { name: 'Cf', value: '100 nF' })
    + ground(270, yGnd)
    + block(316, 70, 72, 60, 'ADC', '12 bit')
    + text(352, 83, 'VREF+', { size: 10 })
    + text(321, 104, 'IN', { anchor: 'start', size: 10 })
    + text(270, 191, s.cfNote);
  return figureFrom(420, 198, s.ntcCap, b);
}

/** Copper trace of stroke width w (plain numbers only). */
const trace = (d, w) => `<path class="cutr" style="stroke-width:${w}" d="${d}"/>`;

/** Top view of a two-pad shunt: wide current copper, Kelvin pair from the inner pad edges to the amplifier. */
function shuntKelvin(lang) {
  const s = S[lang] ?? S.en;
  const y = 50;
  const b = bar(16, y, 128, y, 30, 'cu') + bar(272, y, 404, y, 30, 'cu')
    + rect(128, 28, 40, 44, 'cu') + rect(232, 28, 40, 44, 'cu')
    + rect(150, 36, 100, 28, 'comp', ' rx="2"') + text(200, 54, 'Rsh = 10 mΩ', { cls: 'name' })
    + arrow(28, 22, 96, 22, FLOW) + text(62, 14, s.iLoad)
    + arrow(304, 22, 372, 22, FLOW) + text(338, 14, s.wide)
    // Kelvin pair: left tap (current enters) to the + input, right tap to the − input.
    + trace('M163,72V88L190,102V150H270', 3) + trace('M237,72V88L210,102V130H270', 3)
    + opamp(270, 140, { size: 40 }) + text(290, 112, 'G = 50', { cls: 'val' })
    + wire([310, 140], [344, 140]) + block(344, 122, 60, 36, 'ADC')
    + text(290, 180, s.amp)
    + text(182, 128, s.k1, { anchor: 'end' }) + text(182, 142, s.k2, { anchor: 'end' })
    // Wrong tap: from the current-carrying pour.
    + path('M70,65V92', 'wire bad dash') + text(70, 106, s.bad, { cls: 'badt' });
  return figureFrom(420, 190, s.kelvinCap, b);
}

export default {
  figures: { 'chain-blocks': chainBlocks, 'ntc-divider': ntcDivider, 'shunt-kelvin': shuntKelvin },
  body: {
    tr: `
## Neden önemli?

Bir mikrodenetleyicinin ADC’si (analog–sayısal dönüştürücü) sıcaklığı ya da akımı ölçmez; yalnızca örnekleme anında **pinindeki gerilimi referansına oranlayarak** bir sayıya çevirir. Sensörden o pine kadar her blok (sensör, bölücü ya da yükselteç, filtre, referans, yerleşim) bu sayıya kendi hatasını ekler. Ekranda 23,47 °C yazması, ölçümün 0,01 °C doğru olduğu anlamına gelmez.

Bu derste iki örnek üzerinden bir ölçüm kanalı tasarlayıp hatasını tahmin edeceğiz: 12 bitlik, 3,3 V referanslı bir ADC’ye bağlı **NTC ile sıcaklık** (0–50 °C) ve **şönt ile akım** (0–5 A) ölçümü.

[[fig:chain-blocks]]

## Önce ADC: LSB, çözünürlük ve gürültü

N bitlik bir ADC giriş aralığını (0 … Vref) 2^N basamağa böler. Bir basamak 1 **LSB**’dir (en düşük anlamlı bit):

**LSB = Vref / 2^N**

12 bit ve 3,3 V için LSB = 3,3 V / 4096 = **805,7 µV** eder.

[[calc:adc?bits=12&vref=3.3|12 bit, 3,3 V ADC]]

Asıl önemli olan, 1 LSB’nin **ölçülen büyüklükteki** karşılığıdır: LSB’yi zincirin duyarlılığına bölün. Şönt örneğinde (10 mΩ, kazanç 50) ADC pininde 0,5 V/A vardır: **1,61 mA/LSB**. NTC örneğinde 25 °C’de eğim 36,7 mV/°C’dir: **0,022 °C/LSB**.

**Çözünürlük doğruluk değildir.** Çözünürlük ayırt edebildiğiniz en küçük adım, doğruluk ise gerçek değere yakınlıktır. 12 bit tam ölçeğin %0,024’ünü ayırt eder; ama referans %1 hatalıysa her okuma da %1 hatalıdır.

- **Nicemleme (quantisation) gürültüsü:** ideal bir ADC bile girişi en yakın basamağa yuvarlar; ±½ LSB’lik bu hata, etkin değeri LSB/√12 olan bir gürültü gibi davranır. Tam ölçekli bir sinüs için ideal **SNR = 6,02 · N + 1,76 dB** olur: 12 bitte 74 dB.
- **Etkin bit sayısı (ENOB):** gerçek ADC’de buna gürültü ve bozulma eklenir. ENOB = (SINAD − 1,76) / 6,02; SINAD’ı 68 dB olan "12 bitlik" bir ADC aslında 11,0 bitliktir.
- **Aşırı örnekleme (oversampling) ve ortalama:** M örneğin ortalaması, örnekler arasında ilişkisiz olan gürültüyü √M kat azaltır; her 4 kat örnek yaklaşık 1 bit kazandırır. Bunun için girişte en az 1 LSB mertebesinde gürültü olmalı ve sinyal ortalama süresince değişmemelidir. Ofset, kazanç hatası, doğrusal olmama (INL) ve referans hatası ortalamayla azalmaz.

[[calc:adc?bits=12&vref=3.3&sinad=68&avg=16|SINAD 68 dB ve 16 örnek ortalama]]

> [!QUIZ] 12 bitlik, Vref = 2,5 V olan bir ADC’de 1 LSB kaç volttur? 14 bit çözünürlük için kaç örneğin ortalaması gerekir?
> LSB = 2,5 V / 4096 = 0,61 mV. İki ek bit için 4² = 16 örnek gerekir; girişte yaklaşık 1 LSB’lik ilişkisiz gürültü olmalıdır. Kazanılan çözünürlüktür, doğruluk değil: referans, ofset ve INL hataları aynen kalır.

## Referans: oransal ve mutlak ölçüm

ADC’nin çıktısı bir orandır: kod ≈ 2^N · Vin / Vref. Vref’teki hata, her okumada aynı oranda bir kazanç hatasıdır.

- **Mutlak ölçüm:** ölçülen gerilim Vref’ten bağımsızdır (yükselteç çıkışı, pil gerilimi). Referansın toleransı ve sıcaklıkla kayması sonuca **doğrudan** eklenir. Beslemeyi referans almak en zayıf seçenektir: tipik bir regülatörün toleransı ±%1–3’tür ve üzerinde dijital devrelerin gürültüsü vardır. Harici bir referans entegresi tipik olarak %0,1 civarında doğruluk ve onlarca ppm/K kayma sunar.
- **Oransal (ratiometric) ölçüm:** dirençli sensör (NTC bölücü, potansiyometre, köprü) ADC referansıyla **aynı gerilimden** beslenir. Çıkış Vref’in bir kesridir (Vin = k · Vref), kod = 2^N · k olur ve Vref sadeleşir: referansın toleransı ve yavaş değişimi sonucu etkilemez. Bunun için bölücünün üst ucu gerçekten ADC’nin referans pinine (VREF+ ya da VDDA) giden düğüme bağlanmalıdır; "başka bir 3,3 V" aynı şey değildir.

> [!RULE] Dirençli sensörleri ADC referansından besleyin ve oransal ölçün. Gerilim çıkışlı sensör ve yükselteçlerde referans, ölçümden beklediğiniz doğruluktan daha iyi olmalıdır.

## Örnek A: NTC ile sıcaklık

NTC termistörün direnci sıcaklık arttıkça azalır. Beta modeline göre (T kelvin cinsinden):

**R(T) = R25 · exp(B · (1/T − 1/T25))**

R25 = 10 kΩ ve B = 3950 K olan bir NTC 0 °C’de 33,62 kΩ, 50 °C’de 3,588 kΩ’dur. Direnci gerilime çevirmek için sabit bir Rs direnciyle bölücü kurulur ([[lesson:circuit-basics|bölücünün temelleri]]). Rs Vref’e, NTC toprağa bağlıysa:

**Vout = Vref · RNTC / (Rs + RNTC)**

[[fig:ntc-divider]]

Ölçüm oransal olduğu için yazılım, gerilimi hesaplamadan doğrudan dirence gider: RNTC = Rs · kod / (2^N − kod).

**Rs seçimi:** çıkış, RNTC = Rs iken sıcaklığa en duyarlıdır. Bu yüzden Rs, **ölçüm aralığının ortasındaki NTC direncine yakın** seçilir. Aralıkta en büyük çıkış salınımını Rs = √(R(Tmin) · R(Tmax)) verir: 0–50 °C için 10,98 kΩ. Salınım bu değerin çevresinde Rs’ye pek duyarlı değildir; örnekte %0,1 toleranslı 10 kΩ kullanıyoruz.

[[calc:ntc?model=beta&r25=10k&b=3950&tlo=0&thi=50&tx=25&place=bottom&vref=3.3&rs=10k&bits=12&delta=1|NTC bölücü: 10 kΩ, B = 3950 K, 0–50 °C]]

| Sıcaklık | RNTC | Vout | Kod | Çözünürlük |
|---|---|---|---|---|
| 0 °C | 33,62 kΩ | 2,543 V | 3157 | 0,026 °C/LSB |
| 25 °C | 10 kΩ | 1,650 V | 2048 | 0,022 °C/LSB |
| 50 °C | 3,588 kΩ | 0,871 V | 1082 | 0,033 °C/LSB |

Eğri doğrusal değildir ve çözünürlük uçlara doğru kötüleşir: aynı bölücüyle 100 °C’de 0,14 °C/LSB’ye düşer. Doğrusallaştırmayı donanımda değil, yazılımda formülle ya da tabloyla yapın.

[[calc:ntc?model=beta&r25=10k&b=3950&tlo=0&thi=100&tx=100&place=bottom&vref=3.3&rs=10k&bits=12&delta=1|Aynı bölücü 100 °C’de]]

- **Öz ısınma (self-heating):** bölücü akımı NTC’yi ısıtır ve ölçüm yüksek okunur. NTC’deki güç P = Vref² · RNTC / (Rs + RNTC)² kadardır; en büyük değeri RNTC = Rs iken Vref² / (4 · Rs) = **0,27 mW** olur. Sıcaklık artışı ΔT = P / δ’dır; ısıl dağılma sabiti δ ≈ 1 mW/K için **0,27 °C** eder, yani 12 LSB’den fazla. Çare: daha yüksek dirençler (kaynak empedansı da artar) ya da bölücüyü yalnızca ölçüm sırasında beslemek.
- **Model:** Beta modeli, B’nin verildiği sıcaklık çiftinin çevresinde iyidir; geniş aralıkta hatası birkaç °C’ye çıkabilir. Steinhart–Hart denklemi üç katsayıyla yaklaşık ±0,1 °C’ye iner; hesaplayıcı katsayıları üreticinin R–T tablosundaki üç noktadan bulur.
- **Doğruluk:** sınırı çözünürlük değil, parçaların toleransı koyar. 25 °C’de dirençteki %1’lik hata 0,23 °C’dir (duyarlılık %4,4/°C); %1’lik B toleransı aralığın uçlarında yaklaşık ±0,25 °C daha ekler.

[[calc:divider?mode=analyse&vin=3.3&r1=10k&r2=10k&rtol=1|25 °C’deki bölücü: %1 dirençlerle sapma]]

%1’lik bir NTC ve %1’lik bir Rs ile hesaplayıcı en kötü durumda ±%1 (±16,5 mV) sapma gösterir; 36,7 mV/°C eğimle bu ±0,45 °C’dir. Aynı sayfadaki çıkış direnci (5 kΩ), ADC’nin gördüğü kaynak empedansıdır.

> [!QUIZ] NTC bölücüsü ADC referansıyla aynı 3,3 V’tan besleniyor ve besleme 3,2 V’a düşüyor. Okunan sıcaklık değişir mi? Bölücü 3,3 V’luk hattan beslenir, ADC ise ayrı ve sabit bir referans kullanırsa ne olur?
> Oransal bağlantıda değişmez: kod = 2^N · RNTC / (Rs + RNTC) olur ve içinde Vref yoktur. İkinci durumda 25 °C’de bölücü çıkışı 1,65 V’tan 1,60 V’a iner. Yazılım hâlâ 3,3 V varsaydığı için bu 50 mV’luk fark, 36,7 mV/°C eğimle yaklaşık 1,4 °C’lik bir hata olarak görünür.

## Örnek B: şönt ile akım

Şönt, akım yoluna konan küçük bir dirençtir: V = I · R. Büyük direnç daha büyük sinyal verir, ama güç kaybı (P = I² · R) ve yükün gördüğü gerilim düşümü artar; tipik hedef en büyük akımda 50–100 mV’tur. 5 A ve 50 mV için R = **10 mΩ**, P = 5² · 0,01 = **0,25 W** çıkar. Direnci anma gücünün en fazla yarısında çalıştırın: burada en az 0,5 W’lık bir parça gerekir.

[[calc:shunt?sizing=vs&place=low&imax=5&imax_u=A&vsfs=50&gain=50&vfs=3.3&bits=12&vbus=12&tol=1&tcr=50&dT=40&vos=100&ge=0.5|Şönt örneği: 5 A, 50 mV, kazanç 50]]

- **Düşük taraf (low-side):** şönt, yük ile toprak arasındadır. Yükseltecin girişleri 0 V civarındadır ve devre basittir. Bedeli: yükün toprağı şönt gerilimi kadar yükselir ve yükün toprağa kısa devresi görülmez.
- **Yüksek taraf (high-side):** şönt, besleme ile yük arasındadır; yük gerçek toprakta kalır. Bedeli: yükseltecin iki girişi de besleme gerilimindedir (burada 12 V). Bu **ortak mod gerilimini** bastırmak için akım ölçüm yükselteci (current-sense amplifier) entegreleri kullanılır.
- **Kelvin (dört uçlu) bağlantı:** 10 mΩ’un yanında bakır ve lehim ihmal edilemez. 35 µm bakırın direnci kare başına yaklaşık 0,5 mΩ’dur; iki karesi %10 hata demektir. Ölçüm izlerini pedlerin iç kenarından, akım yolundan ayrı bir çift olarak çıkarın: bu izlerden yük akımı akmadığı için üzerlerinde gerilim düşmez.

[[fig:shunt-kelvin]]

**Kazanç:** en büyük akım ADC aralığının çoğunu, ama tamamını değil, kullanmalıdır. G = 50 ile 5 A’de çıkış 2,5 V olur (aralığın %76’sı); ADC tam ölçeği 6,6 A’e karşılık gelir ve çözünürlük 1,61 mA/LSB’dir. Kazancı ayrık bir fark kuvvetlendiricisiyle kurarsanız (R2 / R1 = 100 kΩ / 2 kΩ) hesaplayıcı tek beslemede çıkışın 0 V’a inemediğini gösterir: çıkış toprağa 50 mV’tan fazla yaklaşamıyorsa 0,1 A’in altındaki akımlar okunamaz.

[[calc:opamp?circ=diff&calc=ana&rf=100k&rb=2k&gbw=1&gbw_u=MHz&vpos=3.3&vneg=0&hd=0.05&vinLo=0&vinHi=0.05&fsig=1k|Fark kuvvetlendiricisi: kazanç 50, 3,3 V tek besleme]]

**Hata:** şönt toleransı, sıcaklık katsayısı (TCR) ve kazanç hatası okunan değerin yüzdesidir; akım küçülse de aynı kalır. Yükseltecin giriş ofseti ise sabit bir gerilimdir: 100 µV, 5 A’de (50 mV) %0,2, 0,5 A’de (5 mV) %2 hata yapar. **Küçük akımlarda ofset baskındır.**

> [!QUIZ] Bu zincirde (10 mΩ, G = 50, Vos = 100 µV) 0,2 A ölçülürken ofset hatası yüzde kaçtır? %1’in altına inmek için ne gerekir?
> 0,2 A’de şönt gerilimi 2 mV’tur; 100 µV’luk ofset %5 hata demektir. %1 için ofset 20 µV’un altında olmalıdır (sıfır kaymalı, zero-drift bir yükselteç) ya da şönt beş kat büyütülmelidir; ikincisi 5 A’de 1,25 W kayıp anlamına gelir. Ayrıca 1 LSB = 1,61 mA, 0,2 A’in %0,8’idir: çözünürlük de sınıra yaklaşmıştır.

## Op-amp ile koşullama

- **Evirmeyen kuvvetlendirici:** G = 1 + Rf / Rg. Giriş empedansı çok yüksektir, sensörü yüklemez.
- **Fark kuvvetlendiricisi:** Vout = (R2 / R1) · (V2 − V1), ama yalnızca direnç oranları tam eşitse. Eşit değilse iki girişte ortak olan gerilim de çıkışa sızar; ortak mod bastırma oranı en kötü durumda kabaca CMRR ≈ (1 + G) / (4 · tolerans) olur. G = 1 ve %1 dirençlerle bu yalnızca 50’dir (34 dB).
- **Ofset ve giriş akımı:** giriş ofset gerilimi (Vos) gürültü kazancıyla çarpılarak çıkışa geçer; genel amaçlı op-amplerde birkaç milivolt, sıfır kaymalı tiplerde 10 µV civarıdır. Giriş kutuplama (bias) akımı kaynak direncinde hata üretir: 100 nA × 5 kΩ = 0,5 mV. İkisi de sıcaklıkla kayar.
- **Bant genişliği:** kapalı çevrim bant genişliği yaklaşık GBW / gürültü kazancı kadardır. G = 50’lik fark kuvvetlendiricisinde (gürültü kazancı 51) 1 MHz’lik bir op-amp yalnızca 19,6 kHz verir.
- **Raylara olan pay (headroom):** giriş de çıkış da besleme raylarına ancak belirli bir payla yaklaşır. Klasik LM358 üst raya yaklaşık 1,5 V’tan fazla yaklaşamaz; raydan raya (rail-to-rail) çıkışlı tipler hafif yükte 10–100 mV yaklaşır, ama tam 0 V’a inmez. Sinyali, en büyük değeri ADC aralığının %75–90’ını kullanacak şekilde ölçekleyin.

[[calc:opamp?circ=noninv&calc=des&g=10&rbase=10k&ser=E24&gbw=1&gbw_u=MHz&vpos=3.3&vneg=0&hd=0.05&vinLo=0.02&vinHi=0.3|Evirmeyen kuvvetlendirici: G = 10, 3,3 V tek besleme]]

Hesaplayıcı G = 10 için E24 serisinden 180 kΩ / 20 kΩ çiftini bulur ve 1 MHz’lik op-amp ile 100 kHz bant genişliği gösterir.

> [!WARN] Yüksek taraf akım ölçümünü ayrık dirençli bir fark kuvvetlendiricisiyle yapmayın. Şönt örneğinde G = 50 ve %1 dirençlerle 12 V’luk ortak mod gerilimi girişe 9 mV’a kadar hata olarak yansır; tam ölçek ise 50 mV’tur. Dirençleri entegrenin içinde eşleştirilmiş bir akım ölçüm yükselteci kullanın.

**ADC’nin örnekleme kondansatörünü sürmek:** SAR tipi bir ADC’nin girişi bir anahtar ve küçük bir örnekleme kondansatörüdür (Cs; birkaç pF ile birkaç on pF). Cs’nin kaynak direnci üzerinden ½ LSB’ye oturması için örnekleme süresi en az (N + 1) · ln 2 zaman sabiti olmalıdır: 12 bitte yaklaşık 9 τ. Kaynak direnci yüksekse örnekleme süresini uzatın ya da pine Cs’den çok büyük bir kondansatör koyun ("yük kovası", charge bucket): örnekleme yükünü o verir ve gerilim en fazla Cs / (Cs + Cext) oranında çöker (8 pF ve 100 nF için 1/12 500). Kaynak bu kondansatörü R · Cext mertebesinde bir sürede yeniden doldurur; sıcaklık gibi yavaş sinyallerde sorun olmaz. Hızlı sinyallerde ADC’yi bir op-amp sürer ve pine küçük bir RC konur.

## Örtüşme önleyici filtre

Saniyede fs örnek alan bir ADC yalnızca fs/2’nin (Nyquist frekansı) altını doğru temsil eder. Üstündeki her bileşen bu banda katlanır (**örtüşme, aliasing**) ve örneklemeden sonra hiçbir sayısal filtreyle ayrılamaz. Bu yüzden filtre ADC’den önce ve analog olmalıdır. En basit örtüşme önleyici (anti-alias) filtre bir RC alçak geçirendir:

**fc = 1 / (2π · R · C)**

fc sinyal bandının üstünde, fs/2’nin ise olabildiğince altında olmalıdır; birinci dereceden filtre fc’nin üstünde dekad başına yalnızca 20 dB bastırır. NTC örneğinde R, bölücünün çıkış direnci (25 °C’de 5 kΩ) ile Rf’nin (1 kΩ) toplamıdır; C = 100 nF ile fc = **265 Hz**, τ = 0,6 ms çıkar.

[[calc:rc?mode=rc&rcR=6k&rcC=100n|RC filtre: 6 kΩ ve 100 nF]]

fs = 10 kHz ile örnekliyorsanız 5 kHz’deki bir parazit yalnızca 19 kat (25,5 dB), 500 kHz’de anahtarlanan bir regülatörün dalgalanması ise yaklaşık 1900 kat zayıflar.

- **R küçük kalmalı:** filtre direnci ADC’nin gördüğü kaynak empedansına eklenir. Örnekleme kondansatörünün oturması zorlaşır ve girişin kaçak akımı R üzerinde ofset üretir (100 nA × 6 kΩ = 0,6 mV ≈ 0,7 LSB). fc’yi düşürmek için R’yi değil C’yi büyütün ve veri sayfasındaki en büyük kaynak empedansına uyun.
- **Önce aşırı örneklemeyi deneyin:** gerekenden hızlı örneklerseniz fs/2 sinyal bandından uzaklaşır, basit bir RC yeter ve keskin filtreyi ortalama (sayısal filtre) yapar.
- **İkinci dereceden Sallen-Key:** sinyal bandı fs/2’ye yakınsa ve daha hızlı örnekleyemiyorsanız kullanmaya değer. Dekad başına 40 dB bastırır: kesim frekansının on katında birinci derece 20 dB, ikinci derece 40 dB zayıflatır.

[[calc:opamp?circ=sklp&resp=butter&fc=1k&cap=10n&cser=E12&rser=E24&gbw=1&gbw_u=MHz|Sallen-Key alçak geçiren: Butterworth, 1 kHz]]

Hesaplayıcı C2 = 10 nF için C1 = 22 nF, R1 = 15 kΩ ve R2 = 7,5 kΩ verir.

> [!QUIZ] ADC 1 kHz ile örnekliyor ve girişte 950 Hz’lik bir parazit var. Örneklerde ne görürsünüz? Bunu yazılımda süzebilir misiniz?
> 950 Hz, fs/2 = 500 Hz’in üstündedir ve 1000 − 950 = 50 Hz’e katlanır: örneklerde, gerçek bir 50 Hz’lik sinyalden ayırt edilemeyen bir bileşen görürsünüz. Örneklemeden sonra süzemezsiniz. Ya ADC’den önce analog bir filtreyle bastırır ya da çok daha hızlı örnekleyip ortalama alırsınız.

## Hata bütçesi

Zincirdeki her hata kaynağını aynı birimle (okunan değerin yüzdesi ya da °C) alt alta yazın; hangisinin baskın olduğunu görürsünüz.

- **Kalibrasyonla giderilenler:** sabit ofset ve kazanç hataları, yani parça toleransları, yükseltecin kazanç hatası ve referansın başlangıç hatası. Sıfırda ve bilinen tek bir değerde yapılan iki noktalı kalibrasyon yeter.
- **Kalibrasyonla giderilemeyenler:** sıcaklıkla ve zamanla kayma (TCR, ofset ve referans kayması), gürültü, doğrusal olmama ve nicemleme.
- **Toplama:** en kötü durumda mutlak değerler toplanır; garantili ama kötümser bir sınırdır. Birbirinden bağımsız hatalarda karelerin toplamının karekökü (RSS) tipik doğruluğu daha gerçekçi verir.

Şönt örneğinin bütçesi (%1 şönt, 50 ppm/K × 40 K, %0,5 kazanç hatası, 100 µV ofset, 12 bit):

| Hata kaynağı | 5 A’de | 0,5 A’de | Kalibrasyonla gider mi? |
|---|---|---|---|
| Şönt toleransı | ±%1 | ±%1 | evet (kazanç) |
| TCR × ΔT | ±%0,2 | ±%0,2 | hayır (kayma) |
| Yükselteç kazanç hatası | ±%0,5 | ±%0,5 | evet (kazanç) |
| Yükselteç ofseti | ±%0,2 | ±%2 | kısmen (kayması kalır) |
| Nicemleme ±½ LSB | ±%0,016 | ±%0,16 | hayır |
| **En kötü durum** | **±%1,9** | **±%3,9** | – |
| **RSS** | **±%1,2** | **±%2,3** | – |

Tablo, şönt hesaplayıcısındaki hata bütçesiyle aynıdır. Hesaplayıcı ADC referansını içermez: bu mutlak bir ölçümdür ve referans ±%1’lik bir beslemeyse 5 A’de en kötü durum ±%2,9’a, RSS ±%1,5’e çıkar.

> [!TIP] Bütçedeki en büyük iki kalemi bulun ve önce onları iyileştirin. Bütçeyi %1’lik bir referans belirliyorken %0,1’lik bir direnç hiçbir şey kazandırmaz.

## Yerleşim notları

- **Gürültüden uzak durun:** sensör izini kısa tutun; anahtarlamalı regülatörün SW düğümünden, bobinden, saat ve PWM hatlarından uzak geçirin ([[lesson:power-layout|güç kaynağı yerleşimi]]).
- **Dönüş yolu:** analog izi kesintisiz bir toprak düzleminin üzerinden götürün. Sensörün toprağı büyük akımlarla yol paylaşmasın: 5 mΩ’luk ortak bir bakırdan geçen 1 A, ölçüme 5 mV (6 LSB) ekler.
- **Kondansatörler pinde:** filtre kondansatörünü ADC pininin dibine koyun; VREF+ ve VDDA’yı da pinde dekuple edin ([[lesson:pdn|güç dağıtımı]]).
- **Toprağı bölmeyin, yerleşimle ayırın:** tek ve kesintisiz bir düzlem kullanın, analog bölümü kartın sakin bir köşesine koyun ([[lesson:grounding-emc|topraklama ve EMC]]). Megaohm mertebesindeki düğümlerde kaçak akıma karşı koruma halkası (guard ring) düşünün.
- **Kelvin izleri:** şönt pedlerinin iç kenarından çıkan iki izi yan yana, bir çift olarak yükseltece götürün; akım taşıyan bakırı akıma göre boyutlandırın ([[lesson:trace-current|akım taşıyan izler]]).
- **Isı:** NTC’yi ölçmek istediğiniz noktaya koyun; regülatör ve şönt gibi ısınan parçalardan uzak tutun ([[lesson:thermal|termal tasarım]]).

## Kontrol listesi

- LSB ve ölçülen büyüklükteki çözünürlük hesaplandı; ölçümün oransal mı mutlak mı olduğu ve referansın hatası belli.
- NTC: Rs aralığın ortasına göre seçildi; uçlardaki çözünürlük, öz ısınma ve model hatası kontrol edildi.
- Şönt: değer, güç (anma gücünün en fazla yarısı), düşük ya da yüksek taraf ve Kelvin bağlantısı belirlendi.
- Yükselteç: kazanç, ofset, bant genişliği ve raylara olan pay kontrol edildi.
- Filtre: fc sinyal bandının üstünde ve fs/2’nin çok altında; kaynak empedansı ADC veri sayfasına uygun.
- Hata bütçesi yazıldı: en kötü durum ve RSS hesaplandı, kalibrasyonla gidenler ayrıldı.
- Yerleşim: kondansatörler pinde, analog izler gürültülü düğümlerden uzak, toprak düzlemi kesintisiz.

## Sırada ne var?

Şemayı üretimden önce [[lesson:schematic-review|şematik inceleme]] turlarından geçirin. Kart geldiğinde kanalı bilinen bir sıcaklık ve bilinen bir akımla ölçüp sonucu bütçenizle karşılaştırın ([[lesson:bring-up|kartın ilk çalıştırılması]]). Kart dışına çıkan sensör girişleri için [[lesson:esd-protection|ESD ve koruma]] dersine bakın.
`,
    en: `
## Why it matters

A microcontroller’s ADC (analog-to-digital converter) does not measure temperature or current; at the sampling instant it only turns **the voltage at its pin, as a fraction of its reference**, into a number. Every block between the sensor and that pin (sensor, divider or amplifier, filter, reference, layout) adds its own error to that number. A display that reads 23.47 °C does not mean the measurement is good to 0.01 °C.

In this lesson we design a measurement channel and estimate its error using two examples that feed a 12-bit ADC with a 3.3 V reference: **temperature with an NTC** (0–50 °C) and **current with a shunt** (0–5 A).

[[fig:chain-blocks]]

## The ADC first: LSB, resolution and noise

An N-bit ADC divides its input range (0 … Vref) into 2^N steps. One step is 1 **LSB** (least significant bit):

**LSB = Vref / 2^N**

For 12 bits and 3.3 V, LSB = 3.3 V / 4096 = **805.7 µV**.

[[calc:adc?bits=12&vref=3.3|12-bit, 3.3 V ADC]]

What really matters is what 1 LSB means **in the measured quantity**: divide the LSB by the sensitivity of the chain. In the shunt example (10 mΩ, gain 50) there is 0.5 V/A at the ADC pin: **1.61 mA/LSB**. In the NTC example the slope at 25 °C is 36.7 mV/°C: **0.022 °C/LSB**.

**Resolution is not accuracy.** Resolution is the smallest step you can tell apart; accuracy is how close you are to the true value. Twelve bits resolve 0.024 % of full scale, but if the reference is 1 % off, every reading is 1 % off as well.

- **Quantisation noise:** even an ideal ADC rounds the input to the nearest step; this error of ±½ LSB behaves like noise with an rms value of LSB/√12. For a full-scale sine wave the ideal **SNR = 6.02 · N + 1.76 dB**: 74 dB at 12 bits.
- **Effective number of bits (ENOB):** a real ADC adds noise and distortion to that. ENOB = (SINAD − 1.76) / 6.02; a "12-bit" ADC with a SINAD of 68 dB is really an 11.0-bit converter.
- **Oversampling and averaging:** averaging M samples reduces noise that is uncorrelated between samples by √M; every 4× samples buys about 1 bit. This needs noise of the order of 1 LSB or more at the input, and a signal that does not change while you average. Offset, gain error, non-linearity (INL) and reference error are not reduced by averaging.

[[calc:adc?bits=12&vref=3.3&sinad=68&avg=16|SINAD 68 dB and 16-sample averaging]]

> [!QUIZ] What is 1 LSB of a 12-bit ADC with Vref = 2.5 V? How many samples must you average for 14-bit resolution?
> LSB = 2.5 V / 4096 = 0.61 mV. Two extra bits need 4² = 16 samples, with about 1 LSB of uncorrelated noise at the input. What you gain is resolution, not accuracy: reference, offset and INL errors remain.

## The reference: ratiometric and absolute measurements

The ADC result is a ratio: code ≈ 2^N · Vin / Vref. An error in Vref is the same gain error in every reading.

- **Absolute measurement:** the measured voltage does not depend on Vref (an amplifier output, a battery voltage). The tolerance and temperature drift of the reference add **directly** to the result. Using the supply as the reference is the weakest option: a typical regulator has a tolerance of ±1–3 % and carries the noise of the digital circuits. An external reference IC typically offers an accuracy around 0.1 % and a drift of tens of ppm/K.
- **Ratiometric measurement:** a resistive sensor (NTC divider, potentiometer, bridge) is powered from **the same voltage** as the ADC reference. Its output is a fraction of Vref (Vin = k · Vref), the code becomes 2^N · k and Vref cancels: the tolerance and slow variation of the reference no longer affect the result. For this the top of the divider must really connect to the node that feeds the ADC reference pin (VREF+ or VDDA); "some other 3.3 V" is not the same thing.

> [!RULE] Power resistive sensors from the ADC reference and measure them ratiometrically. For sensors and amplifiers with a voltage output, the reference must be better than the accuracy you expect from the measurement.

## Example A: temperature with an NTC

The resistance of an NTC thermistor falls as temperature rises. In the Beta model (T in kelvin):

**R(T) = R25 · exp(B · (1/T − 1/T25))**

An NTC with R25 = 10 kΩ and B = 3950 K is 33.62 kΩ at 0 °C and 3.588 kΩ at 50 °C. To turn resistance into voltage it forms a divider with a fixed resistor Rs (see [[lesson:circuit-basics|divider basics]]). With Rs to Vref and the NTC to ground:

**Vout = Vref · RNTC / (Rs + RNTC)**

[[fig:ntc-divider]]

Because the measurement is ratiometric, the firmware goes straight to the resistance without calculating a voltage: RNTC = Rs · code / (2^N − code).

**Choosing Rs:** the output is most sensitive to temperature when RNTC = Rs. That is why Rs is chosen **close to the NTC resistance in the middle of the measurement range**. The largest output swing over the range comes from Rs = √(R(Tmin) · R(Tmax)): 10.98 kΩ for 0–50 °C. The swing is not very sensitive to Rs around this value; the example uses 10 kΩ with 0.1 % tolerance.

[[calc:ntc?model=beta&r25=10k&b=3950&tlo=0&thi=50&tx=25&place=bottom&vref=3.3&rs=10k&bits=12&delta=1|NTC divider: 10 kΩ, B = 3950 K, 0–50 °C]]

| Temperature | RNTC | Vout | Code | Resolution |
|---|---|---|---|---|
| 0 °C | 33.62 kΩ | 2.543 V | 3157 | 0.026 °C/LSB |
| 25 °C | 10 kΩ | 1.650 V | 2048 | 0.022 °C/LSB |
| 50 °C | 3.588 kΩ | 0.871 V | 1082 | 0.033 °C/LSB |

The curve is not linear and the resolution gets worse towards the ends: with the same divider it falls to 0.14 °C/LSB at 100 °C. Do not linearise in hardware; do it in firmware with the formula or a table.

[[calc:ntc?model=beta&r25=10k&b=3950&tlo=0&thi=100&tx=100&place=bottom&vref=3.3&rs=10k&bits=12&delta=1|The same divider at 100 °C]]

- **Self-heating:** the divider current heats the NTC, so the reading is high. The power in the NTC is P = Vref² · RNTC / (Rs + RNTC)²; it peaks at Vref² / (4 · Rs) = **0.27 mW** when RNTC = Rs. The temperature rise is ΔT = P / δ; with a dissipation constant δ ≈ 1 mW/K that is **0.27 °C**, more than 12 LSB. The cure: higher resistances (the source impedance rises too) or powering the divider only while measuring.
- **Model:** the Beta model is good around the temperature pair for which B is specified; over a wide range its error can reach a few °C. The Steinhart–Hart equation gets to about ±0.1 °C with three coefficients; the calculator finds them from three points of the manufacturer’s R–T table.
- **Accuracy:** the limit is set by part tolerances, not by resolution. At 25 °C a 1 % error in resistance is 0.23 °C (the sensitivity is 4.4 %/°C); a 1 % B tolerance adds about ±0.25 °C more at the ends of the range.

[[calc:divider?mode=analyse&vin=3.3&r1=10k&r2=10k&rtol=1|The divider at 25 °C: spread with 1 % resistors]]

With a 1 % NTC and a 1 % Rs the calculator shows a worst-case spread of ±1 % (±16.5 mV); at 36.7 mV/°C that is ±0.45 °C. The output resistance on the same page (5 kΩ) is the source impedance the ADC sees.

> [!QUIZ] The NTC divider is fed from the same 3.3 V as the ADC reference, and the supply drops to 3.2 V. Does the temperature reading change? What if the divider is fed from the 3.3 V rail while the ADC uses a separate, fixed reference?
> With the ratiometric connection it does not change: code = 2^N · RNTC / (Rs + RNTC), and Vref is not in it. In the second case the divider output at 25 °C drops from 1.65 V to 1.60 V. The firmware still assumes 3.3 V, so this 50 mV difference shows up as an error of about 1.4 °C at 36.7 mV/°C.

## Example B: current with a shunt

A shunt is a small resistor placed in the current path: V = I · R. A larger resistor gives a larger signal, but the power loss (P = I² · R) and the voltage drop seen by the load go up; a typical target is 50–100 mV at the maximum current. For 5 A and 50 mV, R = **10 mΩ** and P = 5² · 0.01 = **0.25 W**. Run the resistor at no more than half of its rated power: here you need a part rated at least 0.5 W.

[[calc:shunt?sizing=vs&place=low&imax=5&imax_u=A&vsfs=50&gain=50&vfs=3.3&bits=12&vbus=12&tol=1&tcr=50&dT=40&vos=100&ge=0.5|Shunt example: 5 A, 50 mV, gain 50]]

- **Low side:** the shunt sits between the load and ground. The amplifier inputs are near 0 V and the circuit is simple. The price: the load ground is lifted by the shunt voltage, and a short from the load to ground goes unnoticed.
- **High side:** the shunt sits between the supply and the load; the load stays on true ground. The price: both amplifier inputs sit at the supply voltage (12 V here). Current-sense amplifier ICs are made to reject this **common-mode voltage**.
- **Kelvin (four-terminal) connection:** next to 10 mΩ, copper and solder cannot be ignored. 35 µm copper has about 0.5 mΩ per square; two squares mean a 10 % error. Take the sense traces from the inner edges of the pads as a pair that is separate from the current path: no load current flows in them, so no voltage drops along them.

[[fig:shunt-kelvin]]

**Gain:** the maximum current should use most, but not all, of the ADC range. With G = 50 the output is 2.5 V at 5 A (76 % of the range); ADC full scale corresponds to 6.6 A and the resolution is 1.61 mA/LSB. If you build the gain with a discrete difference amplifier (R2 / R1 = 100 kΩ / 2 kΩ), the calculator shows that on a single supply the output cannot reach 0 V: if it gets no closer than 50 mV to ground, currents below 0.1 A cannot be read.

[[calc:opamp?circ=diff&calc=ana&rf=100k&rb=2k&gbw=1&gbw_u=MHz&vpos=3.3&vneg=0&hd=0.05&vinLo=0&vinHi=0.05&fsig=1k|Difference amplifier: gain 50, single 3.3 V supply]]

**Error:** shunt tolerance, temperature coefficient (TCR) and gain error are a percentage of the reading; they stay the same as the current falls. The amplifier’s input offset is a fixed voltage: 100 µV is a 0.2 % error at 5 A (50 mV) and a 2 % error at 0.5 A (5 mV). **At low currents the offset dominates.**

> [!QUIZ] In this chain (10 mΩ, G = 50, Vos = 100 µV), what is the offset error when measuring 0.2 A? What does it take to get below 1 %?
> At 0.2 A the shunt voltage is 2 mV; a 100 µV offset is a 5 % error. For 1 % the offset must be below 20 µV (a zero-drift amplifier), or the shunt must be five times larger, which means a loss of 1.25 W at 5 A. Note also that 1 LSB = 1.61 mA is 0.8 % of 0.2 A: the resolution is close to its limit too.

## Op-amp conditioning

- **Non-inverting amplifier:** G = 1 + Rf / Rg. Its input impedance is very high, so it does not load the sensor.
- **Difference amplifier:** Vout = (R2 / R1) · (V2 − V1), but only if the resistor ratios are exactly equal. If they are not, the voltage common to both inputs leaks into the output as well; in the worst case the common-mode rejection ratio is roughly CMRR ≈ (1 + G) / (4 · tolerance). With G = 1 and 1 % resistors that is only 50 (34 dB).
- **Offset and input current:** the input offset voltage (Vos) reaches the output multiplied by the noise gain; it is a few millivolts for general-purpose op amps and around 10 µV for zero-drift types. The input bias current produces an error across the source resistance: 100 nA × 5 kΩ = 0.5 mV. Both drift with temperature.
- **Bandwidth:** the closed-loop bandwidth is about GBW / noise gain. In the G = 50 difference amplifier (noise gain 51) a 1 MHz op amp gives only 19.6 kHz.
- **Headroom to the rails:** both the input and the output can only approach the supply rails to within some headroom. The classic LM358 cannot get closer than about 1.5 V to the upper rail; rail-to-rail output types get within 10–100 mV at light load, but never down to exactly 0 V. Scale the signal so that its maximum uses 75–90 % of the ADC range.

[[calc:opamp?circ=noninv&calc=des&g=10&rbase=10k&ser=E24&gbw=1&gbw_u=MHz&vpos=3.3&vneg=0&hd=0.05&vinLo=0.02&vinHi=0.3|Non-inverting amplifier: G = 10, single 3.3 V supply]]

For G = 10 the calculator finds the E24 pair 180 kΩ / 20 kΩ and shows a bandwidth of 100 kHz with a 1 MHz op amp.

> [!WARN] Do not build a high-side current measurement with a difference amplifier made from discrete resistors. In the shunt example, with G = 50 and 1 % resistors, the 12 V common-mode voltage appears as an error of up to 9 mV at the input, while full scale is 50 mV. Use a current-sense amplifier with resistors matched inside the IC.

**Driving the ADC sampling capacitor:** the input of a SAR ADC is a switch and a small sampling capacitor (Cs; a few pF to a few tens of pF). For Cs to settle to within ½ LSB through the source resistance, the sampling time must be at least (N + 1) · ln 2 time constants: about 9 τ at 12 bits. If the source resistance is high, lengthen the sampling time or put a capacitor much larger than Cs at the pin (a "charge bucket"): it supplies the sampling charge, and the voltage droops by at most Cs / (Cs + Cext) (1/12 500 for 8 pF and 100 nF). The source recharges this capacitor in a time of the order of R · Cext; for slow signals such as temperature that is no problem. For fast signals an op amp drives the ADC and a small RC goes at the pin.

## The anti-alias filter

An ADC that takes fs samples per second only represents frequencies below fs/2 (the Nyquist frequency) correctly. Every component above that folds into this band (**aliasing**) and no digital filter can separate it after sampling. That is why the filter must be analog and sit before the ADC. The simplest anti-alias filter is an RC low-pass:

**fc = 1 / (2π · R · C)**

fc must be above the signal band and as far below fs/2 as you can afford; above fc a first-order filter only attenuates by 20 dB per decade. In the NTC example R is the output resistance of the divider (5 kΩ at 25 °C) plus Rf (1 kΩ); with C = 100 nF this gives fc = **265 Hz** and τ = 0.6 ms.

[[calc:rc?mode=rc&rcR=6k&rcC=100n|RC filter: 6 kΩ and 100 nF]]

If you sample at fs = 10 kHz, interference at 5 kHz is attenuated only 19 times (25.5 dB), while the ripple of a regulator switching at 500 kHz is attenuated about 1900 times.

- **R must stay small:** the filter resistor adds to the source impedance the ADC sees. The sampling capacitor settles more slowly and the leakage current of the input produces an offset across R (100 nA × 6 kΩ = 0.6 mV ≈ 0.7 LSB). To lower fc, increase C rather than R, and stay within the maximum source impedance in the datasheet.
- **Try oversampling first:** if you sample faster than needed, fs/2 moves away from the signal band, a simple RC is enough and the averaging (a digital filter) does the sharp filtering.
- **Second-order Sallen-Key:** worth it when the signal band is close to fs/2 and you cannot sample faster. It attenuates by 40 dB per decade: at ten times the cutoff frequency a first-order filter gives 20 dB, a second-order filter 40 dB.

[[calc:opamp?circ=sklp&resp=butter&fc=1k&cap=10n&cser=E12&rser=E24&gbw=1&gbw_u=MHz|Sallen-Key low-pass: Butterworth, 1 kHz]]

For C2 = 10 nF the calculator gives C1 = 22 nF, R1 = 15 kΩ and R2 = 7.5 kΩ.

> [!QUIZ] The ADC samples at 1 kHz and there is 950 Hz interference at the input. What do you see in the samples? Can you filter it out in firmware?
> 950 Hz is above fs/2 = 500 Hz and folds to 1000 − 950 = 50 Hz: the samples contain a component that cannot be told apart from a real 50 Hz signal. You cannot filter it out after sampling. Either attenuate it with an analog filter before the ADC, or sample much faster and average.

## Error budget

List every error source in the chain in the same unit (percent of reading, or °C); you will see which one dominates.

- **Removed by calibration:** fixed offset and gain errors, that is part tolerances, the amplifier gain error and the initial error of the reference. A two-point calibration at zero and at one known value is enough.
- **Not removed by calibration:** drift with temperature and time (TCR, offset and reference drift), noise, non-linearity and quantisation.
- **Combining:** the worst case is the sum of the absolute values; it is a guaranteed but pessimistic bound. For errors that are independent of each other, the root-sum-square (RSS) gives a more realistic figure for typical accuracy.

The budget of the shunt example (1 % shunt, 50 ppm/K × 40 K, 0.5 % gain error, 100 µV offset, 12 bits):

| Error source | At 5 A | At 0.5 A | Removed by calibration? |
|---|---|---|---|
| Shunt tolerance | ±1 % | ±1 % | yes (gain) |
| TCR × ΔT | ±0.2 % | ±0.2 % | no (drift) |
| Amplifier gain error | ±0.5 % | ±0.5 % | yes (gain) |
| Amplifier offset | ±0.2 % | ±2 % | partly (its drift remains) |
| Quantisation ±½ LSB | ±0.016 % | ±0.16 % | no |
| **Worst case** | **±1.9 %** | **±3.9 %** | – |
| **RSS** | **±1.2 %** | **±2.3 %** | – |

The table matches the error budget in the shunt calculator. The calculator does not include the ADC reference: this is an absolute measurement, and if the reference is a ±1 % supply, the worst case at 5 A rises to ±2.9 % and the RSS to ±1.5 %.

> [!TIP] Find the two largest items in the budget and improve those first. A 0.1 % resistor buys nothing while a 1 % reference sets the budget.

## Layout notes

- **Stay away from noise:** keep the sensor trace short and route it away from the SW node and inductor of a switching regulator and from clock and PWM lines (see [[lesson:power-layout|power supply layout]]).
- **Return path:** route the analog trace over an unbroken ground plane. Do not let the sensor ground share a path with large currents: 1 A through 5 mΩ of shared copper adds 5 mV (6 LSB) to the measurement.
- **Capacitors at the pins:** put the filter capacitor right at the ADC pin, and decouple VREF+ and VDDA at their pins too (see [[lesson:pdn|power distribution]]).
- **Do not split the ground; partition by placement:** use one unbroken plane and put the analog section in a quiet corner of the board (see [[lesson:grounding-emc|grounding and EMC]]). For nodes in the megaohm range, consider a guard ring against leakage.
- **Kelvin traces:** route the two traces from the inner edges of the shunt pads side by side, as a pair, to the amplifier; size the current-carrying copper for the current (see [[lesson:trace-current|current-carrying traces]]).
- **Heat:** place the NTC at the point you want to measure and keep it away from parts that get hot, such as the regulator and the shunt (see [[lesson:thermal|thermal design]]).

## Checklist

- LSB and the resolution in the measured quantity are calculated; it is clear whether the measurement is ratiometric or absolute, and what the reference error is.
- NTC: Rs chosen for the middle of the range; resolution at the ends, self-heating and model error checked.
- Shunt: value, power (at most half of the rating), low side or high side, and the Kelvin connection decided.
- Amplifier: gain, offset, bandwidth and headroom to the rails checked.
- Filter: fc above the signal band and far below fs/2; source impedance within the ADC datasheet limit.
- The error budget is written down: worst case and RSS calculated, errors removed by calibration identified.
- Layout: capacitors at the pins, analog traces away from noisy nodes, ground plane unbroken.

## What next?

Take the schematic through the [[lesson:schematic-review|schematic review]] passes before fabrication. When the board arrives, measure the channel with a known temperature and a known current and compare the result with your budget ([[lesson:bring-up|board bring-up]]). For sensor inputs that leave the board, see [[lesson:esd-protection|ESD and protection]].
`,
  },
};
