import { figureFrom } from '../figures.js';
import { text, rect, path, polygon, circle, arrow } from '../../ui/svg.js';

const S = {
  tr: {
    blkCap: 'Blok şeması ve güç bütçesi. Üst sıra güç yoludur: USB-C’den gelen 5 V önce PTC ile TVS’den, sonra LDO’dan geçer ve 3,3 V’luk ray yükleri besler. Kutulardaki akımlar tepe değerlerdir (toplam 93 mA); ray, payla birlikte 120 mA için tasarlanır. Alt sıralar arayüzleri gösterir.',
    port: '≤ 0,5 A',
    ldo: '5 → 3,3 V',
    rail: '3V3 · 120 mA',
    sensor: 'Sensör',
    term: 'klemens',
    prot: 'TVS · 120 Ω',
    fpCap: 'Yerleşim planı, üstten görünüş (50 × 35 mm). İki konnektör aynı kenardadır ve korumaları hemen arkalarındadır. Isı kaynağı olan LDO sol üstte, sensör karşı köşede bir yarığın arkasındadır; I²C hattı sensöre yarığın bıraktığı köprüden ulaşır. Kristal işlemcinin dibinde, SWD konnektörü kenardadır.',
    heat: '0,26 W',
    drv: 'sürücü',
    pflow: 'güç',
    sflow: 'sinyal',
    slot: 'yarık',
    hole: 'montaj deliği',
    phCap: 'Projenin haritası. Aşamalar yukarıdan aşağıya ilerler; her aşamanın yanında dayandığı dersler ve bu kartta kullanılan hesaplayıcılar yazılıdır. Bir aşamanın çıktısı sonrakinin girdisidir.',
    hPhase: 'Aşama',
    hLesson: 'Dersler',
    hTool: 'Hesaplayıcılar',
    rows: [
      ['Gereksinimler', ['tasarım akışı, IPC'], []],
      ['Blok şeması, bütçe', ['devre temelleri'], ['güç ağacı']],
      ['Şematik', ['ESD · termal · PDN', 'şematik inceleme'], ['koruma · I²C', 'termal · kristal']],
      ['Yığın ve kurallar', ['yığın · empedans', 'kural kurulumu'], ['yığın', 'empedans · iz']],
      ['Yerleşim', ['yerleşim · EMC'], []],
      ['Yönlendirme', ['hızlı arayüzler', 'sinyal bütünlüğü'], ['arayüz kuralları']],
      ['Kontrol, çıktılar', ['DFM · montaj ve test'], []],
      ['İlk çalıştırma', ['ilk çalıştırma'], []],
    ],
  },
  en: {
    blkCap: 'Block diagram and power budget. The top row is the power path: 5 V from the USB-C receptacle passes the PTC and the TVS, then the LDO, and the 3.3 V rail feeds the loads. The currents in the boxes are peak values (93 mA in total); with margin the rail is designed for 120 mA. The lower rows show the interfaces.',
    port: '≤ 0.5 A',
    ldo: '5 → 3.3 V',
    rail: '3V3 · 120 mA',
    sensor: 'Sensor',
    term: 'terminal',
    prot: 'TVS · 120 Ω',
    fpCap: 'Floorplan, top view (50 × 35 mm). Both connectors sit on the same edge with their protection right behind them. The LDO, the heat source, is at the top left; the sensor is in the opposite corner behind a slot, and the I²C lines reach it across the bridge the slot leaves. The crystal is next to the MCU and the SWD header is on an edge.',
    heat: '0.26 W',
    drv: 'driver',
    pflow: 'power',
    sflow: 'signal',
    slot: 'slot',
    hole: 'mounting hole',
    phCap: 'Map of the project. The phases run from top to bottom; next to each are the lessons it rests on and the calculators used for this board. The output of one phase is the input of the next.',
    hPhase: 'Phase',
    hLesson: 'Lessons',
    hTool: 'Calculators',
    rows: [
      ['Requirements', ['design flow, IPC'], []],
      ['Blocks, budget', ['circuit basics'], ['power tree']],
      ['Schematic', ['ESD · thermal · PDN', 'schematic review'], ['protection · I²C', 'thermal · crystal']],
      ['Stack-up, rules', ['stack-up · impedance', 'design rules'], ['stack-up', 'impedance · trace']],
      ['Placement', ['placement · EMC'], []],
      ['Routing', ['high-speed routing', 'signal integrity'], ['interface rules']],
      ['Checks, outputs', ['DFM · assembly, test'], []],
      ['Bring-up', ['board bring-up'], []],
    ],
  },
};

const FLOW = { cls: 'flow', headCls: 'arrow flow' };
const BOTH = { both: true };

/** Block with a title and an optional second line (plain label, or a value in the accent colour). */
function box(x, y, w, h, title, sub, subCls = 'lbl') {
  return rect(x, y, w, h, 'comp', ' rx="3"')
    + text(x + w / 2, y + h / 2 + (sub ? -2 : 4), title, { cls: 'name' })
    + (sub ? text(x + w / 2, y + h / 2 + 12, sub, { cls: subCls, size: 11 }) : '');
}

/** Power path on top, the 3.3 V rail with its loads below, the interfaces at the bottom. */
function blocks(lang) {
  const s = S[lang] ?? S.en;
  // Power path and the rail with a drop to every load.
  let b = box(12, 14, 68, 36, 'USB-C', s.port)
    + arrow(80, 32, 108, 32, FLOW) + text(94, 26, '5 V', { size: 10 })
    + box(108, 14, 76, 36, 'PTC · TVS')
    + arrow(184, 32, 212, 32, FLOW)
    + box(212, 14, 72, 36, 'LDO', s.ldo)
    + path('M284,32H306V74M98,74H330', 'flow')
    + text(314, 64, s.rail, { cls: 'val', anchor: 'start' })
    + [98, 214, 330].map((x) => arrow(x, 74, x, 100, FLOW)).join('');
  // Loads with their peak current and the buses between them.
  b += box(62, 100, 72, 44, s.sensor, '1 mA', 'val')
    + box(174, 100, 80, 44, 'MCU', '30 mA', 'val')
    + box(294, 100, 72, 44, 'RS-485', '60 mA', 'val')
    + arrow(134, 122, 174, 122, BOTH) + text(154, 116, 'I²C', { size: 10 })
    + arrow(254, 122, 294, 122, BOTH) + text(274, 116, 'UART', { size: 10 });
  // USB data through the ESD diodes, the LED and the bus terminal.
  b += arrow(30, 64, 30, 50) + path('M30,64V188H56', 'dimline') + arrow(56, 188, 70, 188)
    + box(70, 172, 56, 32, 'ESD')
    + arrow(140, 188, 126, 188) + path('M140,188H196V158', 'dimline') + arrow(196, 158, 196, 144)
    + text(161, 182, 'D+ / D−', { size: 10 })
    + arrow(244, 144, 244, 172) + box(222, 172, 44, 32, 'LED', '2 mA', 'val')
    + arrow(330, 144, 330, 172, BOTH) + text(338, 162, s.prot, { anchor: 'start', size: 10 })
    + box(294, 172, 72, 32, s.term, 'A · B');
  return figureFrom(420, 216, s.blkCap, b);
}

/** Top view of the 50 × 35 mm board at 7 units per mm, board origin at (40, 14). */
function floorplan(lang) {
  const s = S[lang] ?? S.en;
  const zone = (x, y, w, h, cls = 'zone') => rect(x, y, w, h, cls, ' rx="4"');
  const part = (x, y, w, h) => rect(x, y, w, h, 'comp', ' rx="2"');
  const small = { cls: 'name', size: 11 };
  let b = rect(40, 14, 350, 245, 'soft', ' rx="6"')
    + circle(64.5, 120.5, 11, 'hole') + circle(365.5, 38.5, 11, 'hole');
  // Both connectors on the left edge, each with its protection right behind it.
  b += part(33, 42, 59.5, 63) + text(62.5, 78, 'USB-C', small)
    + part(33, 136.5, 63, 101.5) + text(64.5, 184, s.term, small) + text(64.5, 199, 'RS-485', { size: 10 })
    + zone(110, 35, 56, 77) + text(138, 62, 'PTC', small) + text(138, 78, 'TVS', small) + text(138, 94, 'ESD', small)
    + zone(110, 143.5, 56, 87.5) + text(138, 182, 'TVS', small) + text(138, 198, '120 Ω', small);
  // The heat source (LDO) at the top left, the bus driver below it.
  b += zone(187, 35, 63, 56, 'zone-bad') + text(218.5, 60, 'LDO', { cls: 'name' }) + text(218.5, 76, s.heat)
    + zone(187, 161, 56, 63) + text(215, 190, 'RS-485', small) + text(215, 205, s.drv, { size: 10 });
  // MCU with its crystal, the debug header, LED and reset button.
  b += part(257, 105, 63, 63) + text(288.5, 141, 'MCU', { cls: 'name' })
    + part(264, 178.5, 31.5, 17.5) + text(279.5, 209, '8 MHz', { size: 10 })
    + part(257, 24.5, 70, 21) + text(292, 39, 'SWD', { cls: 'name', size: 10 })
    + part(257, 224, 24.5, 21) + text(269, 238, 'LED', { size: 9 })
    + part(288.5, 224, 24.5, 21) + text(300.5, 238, 'RST', { size: 9 });
  // Sensor in the far corner behind an L-shaped slot.
  b += polygon([[317, 179], [362, 179], [362, 185], [323, 185], [323, 259], [317, 259]], 'hole')
    + zone(334, 192.5, 45.5, 49, 'zone-ok') + text(356.5, 214, s.sensor, small) + text(356.5, 229, 'T / RH', { size: 10 });
  // Power: connector → protection → LDO → 3V3.
  b += arrow(92.5, 60, 110, 60, FLOW) + arrow(166, 60, 187, 60, FLOW) + text(176.5, 54, '5 V', { size: 10 })
    + path('M250,63H281V93', 'flow') + arrow(281, 93, 281, 105, FLOW) + text(265.5, 77, '3V3', { size: 10 });
  // Signals: USB pair, bus, debug and I²C across the bridge next to the slot.
  b += arrow(180, 100, 166, 100) + path('M180,100H240V120H245', 'dimline') + arrow(245, 120, 257, 120)
    + text(210, 113, 'D+ / D−', { size: 10 })
    + arrow(96, 187, 110, 187, BOTH) + arrow(166, 187, 187, 187, BOTH)
    + arrow(215, 146, 215, 161) + path('M215,146H245', 'dimline') + arrow(245, 146, 257, 146)
    + text(232, 141, 'UART', { size: 10 })
    + arrow(305, 45.5, 305, 105, BOTH)
    + arrow(332, 130, 320, 130) + path('M332,130H371V180', 'dimline') + arrow(371, 180, 371, 192.5)
    + text(350, 124, 'I²C', { size: 10 });
  // Legend.
  b += arrow(48, 278, 72, 278, FLOW) + text(78, 282, s.pflow, { anchor: 'start' })
    + arrow(122, 278, 146, 278, BOTH) + text(152, 282, s.sflow, { anchor: 'start' })
    + rect(204, 275, 24, 6, 'hole') + text(234, 282, s.slot, { anchor: 'start' })
    + circle(286, 278, 5, 'hole') + text(296, 282, s.hole, { anchor: 'start' });
  return figureFrom(420, 296, s.fpCap, b);
}

/** The phases as a chain, each with its lessons and the calculators used for this board. */
function phases(lang) {
  const s = S[lang] ?? S.en;
  let b = text(78, 16, s.hPhase, { cls: 'title' })
    + text(156, 16, s.hLesson, { cls: 'title', anchor: 'start' })
    + text(288, 16, s.hTool, { cls: 'title', anchor: 'start' });
  s.rows.forEach(([name, lessons, tools], i) => {
    const y = 26 + i * 30;
    const lines = (list, x, cls) => list
      .map((line, k) => text(x, y + (list.length > 1 ? 9 + k * 12 : 15), line, { cls, anchor: 'start', size: 10 })).join('');
    b += rect(12, y, 132, 22, 'comp', ' rx="3"') + text(78, y + 15, name, { cls: 'name', size: 11 })
      + lines(lessons, 156, 'lbl') + lines(tools, 288, 'val');
    if (i < s.rows.length - 1) b += arrow(78, y + 22, 78, y + 30, FLOW);
  });
  return figureFrom(420, 270, s.phCap, b);
}

export default {
  figures: { blocks, floorplan, phases },
  body: {
    tr: `
## Ne yapıyoruz?

Önceki derslerin her biri tek bir konuyu anlattı. Bu derste yeni kuram yok; **küçük bir kartı gereksinimden tezgâha kadar** götürüyoruz. Amaç işin sırasını göstermek: hangi karar ne zaman verilir, hangi soruyu hangi hesaplayıcı yanıtlar ve sonraki adıma ne devredilir. Ayrıntı için her adımda bağlantısı verilen derse gidin.

Kart, USB’den beslenen ve ölçümlerini RS-485 üzerinden gönderen bir ortam sensörü düğümüdür:

| Konu | Gereksinim |
|---|---|
| Besleme | USB-C, 5 V (tasarım aralığı 4,4–5,5 V), en çok 500 mA |
| Arayüzler | USB 2.0 full-speed (cihaz), yarı çift yönlü RS-485, I²C sıcaklık ve nem sensörü, SWD |
| Kart | 50 × 35 mm, 4 katman, 1,6 mm, IPC Sınıf 2 ([[lesson:pcb-basics|sınıflar]]) |
| Ortam | Kapalı kutuda −20 … +60 °C |

> [!RULE] Gereksinimleri sayıyla yazın. “Küçük ve az ısınan bir kart” hesaplanamaz; “60 °C ortam, 500 mA sınır” hesaplanır.

## Blok şeması ve güç bütçesi

Şematikten önce blokları ve aralarındaki rayları çizin, sonra her yükün akımını veri sayfasından alıp toplayın. Buradaki değerler tipiktir; kendi parçalarınızınkini kullanın.

[[fig:blocks]]

| Yük (3,3 V) | Tipik | Tepe |
|---|---|---|
| Mikrodenetleyici (8 MHz) | 15 mA | 30 mA |
| Sensör | 1 mA | 1 mA |
| RS-485 alıcı-verici (transceiver) | 2 mA | 60 mA, sonlandırılmış hattı sürerken |
| LED | 2 mA | 2 mA |
| Toplam | 20 mA | 93 mA |

[[calc:powertree?s=5_4.4_5.5_60_VBUS&r=0_ldo_3.3_50_0.3_300_100_U1&l=1_15_30_MCU&l=1_1_1_T-RH&l=1_2_60_RS-485&l=1_2_2_LED|Bu kartın güç ağacı]]

Araç, tepe akımla regülatörde 0,20 W kayıp gösterir. Unutulanlar için yaklaşık %30 pay ekliyor ve bundan sonraki hesapları **120 mA** ile yapıyoruz. Lineer regülatörün giriş akımı çıkış akımına eşittir: port, 500 mA’lik sınırının dörtte birini görür. Kayıp en çok (5,5 − 3,3) V · 0,12 A = 0,26 W olduğundan LDO yeter; akım birkaç kat fazla olsaydı anahtarlamalı regülatöre geçerdik ([[lesson:power-layout|güç kaynağı yerleşimi]]).

> [!NOTE] Bir USB 2.0 cihazı, bilgisayar onu yapılandırmadan (enumeration) önce en çok 100 mA çekebilir; fazlasını tanımlayıcısında ister. Güç bütçesi bu yüzden yazılımın da girdisidir.

## Şematik kararları

Her karar aynı kalıpla verilir: **soru → hesaplayıcı → sonuç → şemaya giren.**

**1. VBUS’taki sigorta hangi akımda tutmalı?** CC pinlerindeki 5,1 kΩ dirençler sayesinde kart, 3 A verebilen bir USB-C adaptörden de beslenebilir; karttaki bir kısa devrenin akımını sıfırlanabilir sigorta (PTC) sınırlar. Aday: 25 °C’de 0,35 A tutma ve 0,75 A açma akımı (1206 kılıf için tipik değerler). 60 °C’de tutma akımı 0,26 A’e iner; 0,12 A’lik yük bunun %46’sıdır. 3 A’lik arıza akımı bu sıcaklıktaki açma akımının 5,3 katıdır; normal çalışmada düşüm 0,14 V’tur.

[[calc:protection?mode=ptc&iop=0.12&vckt=5.5&ifl=3&ih=0.35&itr=0.75&kd=75&vm=6&im=40&r1=1.2&r1_u=ohm&pd=0.6&ta=60|VBUS’taki PTC]]

Şemaya giren: konnektör → PTC → TVS → giriş kondansatörü; PTC öndedir ki TVS’nin çektiği akım da sigortadan geçsin. TVS’nin çalışma (stand-off) gerilimi en az 5,5 V olmalı ki normal VBUS’ta iletmesin; kenetleme gerilimi de LDO girişinin mutlak sınırının altında kalmalı. D+ ve D− hatlarına düşük kapasiteli ESD diyotu, CC1 ve CC2’ye **ayrı ayrı** 5,1 kΩ ([[lesson:esd-protection|ESD ve koruma]]).

**2. LDO ne kadar ısınır?** En kötü durum en yüksek giriştir: 5,5 V ve 120 mA’de 0,264 W. SOT-223 kılıfta (θJA ≈ 100 °C/W, temkinli bir değer) 60 °C ortamda bağlantı sıcaklığı **86 °C** olur; 125 °C’lik sınıra 39 °C pay kalır ([[lesson:thermal|termal tasarım]]).

[[calc:thermal?ps=ldo&vin=5.5&vout=3.3&io=0.12&ja=100&ta=60|LDO’nun sıcaklığı]]

Şemaya giren: SOT-223 kılıflı, düşüm gerilimi (dropout) en çok 0,3 V olan bir LDO. En kötü durumda girişinde 4,4 − 0,14 = 4,26 V vardır; gereken 3,6 V’tur. Giriş ve çıkış kondansatörleri veri sayfasındaki gibi seçilir.

> [!QUIZ] Aynı LDO’nun SOT-23-5 kılıflısı (θJA ≈ 220 °C/W) seçilseydi ne olurdu?
> Tj = 60 °C + 0,264 W · 220 °C/W ≈ 118 °C. Sınırın altında, ama pay yalnızca 7 °C; küçük bir kartta gerçek θJA veri sayfasındakinden yüksek de olabilir. Büyük kılıf doğru karardır. Kılıf ne olursa olsun 0,26 W kartı ısıtır: sıcaklık sensörünü yerleşimde bu ısıdan uzak tutacağız.

**3. I²C pull-up dirençleri kaç ohm?** 400 kHz, iki cihaz (pin başına 10 pF), 4 cm iz ve test noktaları için 5 pF: hat kapasitansı yaklaşık 29 pF. İzin verilen aralık 967 Ω … 12,2 kΩ’dur; hesaplayıcı 9,1 kΩ önerir. 4,7 kΩ seçiyoruz: aralığın içinde, yükselme süresi 115 ns (sınır 300 ns), hat düşükken akım 0,62 mA; ileride eklenecek bir cihaza pay kalır.

[[calc:i2c?mode=fm&vdd=3.3&n=2&pinc=10&len=4&len_u=cm&cpl=1&cx=5&rpu=4700|I²C pull-up aralığı]]

**4. Kristalin yük kondansatörleri?** 8 MHz’lik kristalin yük kapasitansı CL = 10 pF, kaçak kapasitans yaklaşık 3 pF ise C1 = C2 = 2 · (10 − 3) = 14 pF; en yakın standart değer 15 pF’tır (etkin yük 10,5 pF).

[[calc:crystal?cl=10&cs=3|Yük kondansatörleri]]

**5. Hesabı kısa, unutulması kolay kararlar:**

- **LED:** kırmızı LED için (3,3 − 2,0) V / 2 mA = 650 Ω → 680 Ω ([[lesson:circuit-basics|devre temelleri]]).
- **RS-485:** 120 Ω’luk sonlandırma yalnızca hattın iki ucunda bulunur; bu yüzden jumper’la takılır. Dirençteki gerilim sürücünün beslemesini aşamaz: 3,3 V’ta 91 mW, hatta 5 V’luk bir düğüm varsa en çok 0,21 W. 0603 (0,1 W) yetmez; 1206 (0,25 W) kullanın. Konnektöre, RS-485’in −7 … +12 V’luk ortak mod aralığına uygun çift yönlü bir TVS; boştaki hattın seviyesi için arıza emniyetli (fail-safe) bir alıcı-verici ya da kutuplama dirençleri.
- **Dekuplaj:** tipik olarak her VDD pinine 100 nF, raya bir 4,7 µF ([[lesson:pdn|güç dağıtımı]]).
- **Reset, SWD, test noktaları:** reset düğmesi, dirençle belirlenmiş boot pini, SWD konnektörü (SWDIO, SWCLK, NRST, 3V3, GND) ve 5 V, 3V3, GND, SDA, SCL test noktaları şimdi şemaya girer; sonradan yer kalmaz ([[lesson:assembly-test|montaj ve test için tasarım]]).

Şematik bitince [[lesson:schematic-review|şematik inceleme]] listesinden geçin.

## Katman yığını ve kurallar

Yerleşimden önce yığın ve kurallar belli olmalı; iz genişlikleri bunlardan çıkar.

**Yığın.** L1 parçalar ve sinyaller · 0,2 mm prepreg · L2 kesintisiz GND · 1,0 mm çekirdek · L3 3V3 düzlemi · 0,2 mm prepreg · L4 yavaş sinyaller. Toplam 1,54 mm eder (1,6 mm ±%10 içinde) ve yığın simetriktir. L4’ün komşusu güç düzlemidir; USB ve kristal bu yüzden GND’nin hemen üstündeki L1’de kalır ([[lesson:stackup|katman yığını]]).

[[calc:stackup?w=0.3&s=0.2|Bu kartın yığını]]

**USB çifti.** 90 Ω diferansiyel, L1’de: h = 0,2 mm, εr = 4,3, 35 µm bakır ve 0,2 mm aralık için genişlik **0,30 mm** çıkar; genişlik 0,25–0,36 mm arasında kaldıkça empedans ±%10 içindedir ([[lesson:impedance|kontrollü empedans]]).

[[calc:impedance?mode=synth&st=diffMicrostrip&Z=90&s=0.2&s_u=mm&t=35&t_u=um&h=0.2&h_u=mm&er=4.3|90 Ω’luk çiftin genişliği]]

> [!NOTE] Full-speed (12 Mbit/s) bir bağlantıda 25 mm’lik çift elektriksel olarak kısadır; 90 Ω burada zorunluluk değil, iyi alışkanlıktır. High-speed’de (480 Mbit/s) zorunludur.

**Besleme izleri.** Portun verebildiği 0,5 A için 10 °C’lik artışla yalnızca 0,08 mm yeter; ama 30 mm’lik böyle bir iz 0,19 Ω eder ve 95 mV düşürür. 0,5 mm çiziyoruz: 1,4 A taşır, 31 mΩ’dur ve 0,5 A’de 16 mV düşürür ([[lesson:trace-current|akım taşıyan izler]]).

[[calc:trace?I=0.5&dT=10&L=30|0,5 A için gereken genişlik]]

**Aralık ve via.** Karttaki gerilimler 15 V’un altındadır; aralığı gerilim değil, üreticinin en küçük değeri belirler ([[lesson:spacing|aralıklar]]). Tek tip via kullanıyoruz: 0,3 mm delik, 0,6 mm pad; biri 10 °C’lik artışla yaklaşık 1,9 A taşır ([[lesson:vias|via ve pad tasarımı]]).

Hepsi tek bir kural tablosunda toplanır ve ilk izden önce CAD’e girilir ([[lesson:design-rules|kural kurulumu]]):

| Net sınıfı | Genişlik | Aralık | Via |
|---|---|---|---|
| Sinyal (varsayılan) | 0,2 mm | 0,2 mm | 0,3 / 0,6 mm |
| USB D+/D− | 0,30 mm | çift içinde 0,2 mm, öbür netlere ≥ 0,76 mm | yok |
| 5 V ve 3V3 | 0,5 mm | 0,2 mm | her geçişte 2 adet |
| RS-485 A/B | 0,3 mm, yan yana | 0,2 mm | 0,3 / 0,6 mm |
| Kristal | 0,2 mm, en kısa yol | çevresi toprak | yok |

> [!QUIZ] Üretici, standart yığınında L1 ile L2 arasında 0,2 mm değil 0,12 mm prepreg kullandığını bildiriyor. 0,30 mm’lik çift ne olur?
> Aynı genişlik ve aralıkla empedans 73 Ω’a düşer: hedefin %19 altında, ±%10’un dışında. 0,12 mm için gereken genişlik 0,21 mm’dir. Yığını ilk izden önce üreticiden alın; sonradan öğrenirseniz çifti yeniden çizersiniz.

## Yerleşim

Blok şeması kart üzerinde bölgelere dönüşür ([[lesson:placement-routing|yerleşim ve yönlendirme]]).

[[fig:floorplan]]

- **Konnektörler aynı kenarda:** iki kablonun arasına kart toprağındaki gürültü gerilimi girmez ([[lesson:grounding-emc|topraklama ve EMC]]).
- **Koruma konnektörün dibinde:** PTC, TVS ve ESD diyotları; darbe kartın içine girmeden toprağa akar.
- **Isı sensörden uzakta:** LDO sol üstte, sensör yaklaşık 30 mm ötede, karşı köşede. Isı sensöre en çok bakır üzerinden ulaşır; araya bir yarık (slot) açılır ve sensörün altına bakır dökülmez.
- **Kristal ve dekuplaj pinlerin dibinde;** işlemci, USB pinleri konnektöre bakacak şekilde döndürülür.
- **SWD ve test noktaları** erişilebilir bir kenarda; footprint’ler veri sayfasıyla karşılaştırılmış ([[lesson:footprints|footprint tasarımı]]).

> [!TIP] Konnektörleri ve montaj deliklerini kutunun çizimine göre yerleştirip kilitleyin; gerisi onlara göre dizilir.

## Yönlendirme sırası

Önce yeri dar ve hatası pahalı olan netler çizilir:

1. **Dekuplaj ve fan-out:** pad ile via arasında kısa, geniş bakır.
2. **USB çifti:** L1’de, kesintisiz L2’nin üzerinde, viasız ve simetrik; ESD diyotu yolun üzerinde, saplama (stub) bırakmadan; D+ ile D− arasındaki uzunluk farkı en çok 2 mm ([[lesson:highspeed-routing|hızlı arayüzler]]).
3. **Kristal:** en kısa yol; altından başka iz geçmez.
4. **Besleme:** VBUS → PTC → TVS → LDO yolu 0,5 mm; 3V3, L3 düzlemine iki viayla iner.
5. **RS-485 ve I²C,** sonra geri kalan sinyaller; yavaş olanlar L4’e inebilir.
6. **Toprak dökümü ve dikiş viaları.** L2’ye tek başına bakın: yarık ya da dar boğaz var mı? Her sinyalin dönüş akımı izin altından akabilmeli ([[lesson:signal-integrity|sinyal bütünlüğü]]).

[[calc:interfaces?iface=usb2|USB 2.0 yönlendirme kuralları]]

## Kontroller ve üretim çıktıları

- **DRC:** kural tablosuyla, dökümler yenilendikten sonra: sıfır hata, sıfır çizilmemiş net.
- **Üretim notları:** 4 katman, 1,6 mm, yığın ve bakır kalınlıkları, yüzey kaplaması, IPC Sınıf 2; 90 Ω’luk çiftin katmanı, genişliği ve aralığı ([[lesson:dfm|DFM]]).
- **Montaj dosyaları:** BOM, yerleşim (pick-and-place) dosyası, montaj çizimi; kartta fiducial’lar.
- **Test erişimi:** her rayda ve GND’de test noktası; SWD konnektörüne kart kutudayken de ulaşılır.
- **Mekanik:** 1:1 çıktı ve kutuyla birlikte 3B kontrol.

## İlk çalıştırma planı

Plan, kartlar gelmeden yazılır; beklenen değerler bu derste hesaplandı ([[lesson:bring-up|kartın ilk çalıştırılması]]).

| Sıra | Ölçüm | Beklenen |
|---|---|---|
| 1 | Enerjisiz: 5 V–GND ve 3V3–GND direnci | Kısa devre yok |
| 2 | Akım sınırlı kaynak (5 V, 150 mA): raylar | PTC’den sonra ≈ 5 V; 3V3, regülatörün toleransı içinde (ör. ±%2) |
| 3 | Giriş akımı | Boşta ≈ 20 mA, hat sürülürken ≈ 90 mA |
| 4 | SWD ve saat | İşlemci tanınır; saat çıkış pininde 8 MHz |
| 5 | I²C | Sensör adresine yanıt verir; yükselme süresi ≈ 115 ns |
| 6 | RS-485 | İki ucu sonlandırılmış hatta fark gerilimi ≥ 1,5 V |
| 7 | USB | Bilgisayar cihazı tanır; boşta D+ ≈ 3 V |
| 8 | Isı | 15 dakika tam yükte LDO ılık; sensör, referans termometreyle uyumlu |

> [!WARN] Kristal pinine prob değdirmeyin: probun yaklaşık 10 pF’lık kapasitansı 15 pF’lık yük kondansatörüne eklenir; frekans kayar, osilatör durabilir. Saati işlemcinin bir çıkış pininden ölçün.

## Projenin haritası

[[fig:phases]]

Bir gereksinim değişirse haritada o girdiyi kullanan ilk aşamaya dönülür ve sonraki aşamalar yeniden gözden geçirilir.

> [!QUIZ] Kart çalışıyor; müşteri 1 m’lik kabloyla ikinci bir sensör istiyor. 4,7 kΩ ve 400 kHz hâlâ uygun mu?
> Şematik aşamasına dönün. Hat kapasitansı 3 · 10 pF + 104 cm · 1 pF/cm + 5 pF = 139 pF olur; 400 kHz için üst sınır 2,55 kΩ’a iner ve 4,7 kΩ ile yükselme süresi 554 ns’ye çıkar (sınır 300 ns). İki çıkış var: direnci 2 kΩ yapmak (236 ns, 1,45 mA) ya da 100 kHz’e inmek (sınır 1000 ns; 4,7 kΩ yeter). Kablo kutunun dışına çıktığı için konnektörüne ESD koruması da gerekir: yerleşim ve kural tablosu da değişir.

## İlk projede sık yapılan hatalar

- Güç bütçesi yapmadan regülatör seçmek; ısıyı en sona bırakmak.
- CC dirençlerini unutmak ya da iki CC pinine tek direnç koymak: bazı kablolarla kart hiç beslenmez.
- Yığını üreticiye sormadan empedanslı çifti çizmek.
- Sıcaklık sensörünü regülatörün yanına koymak.
- Test noktası ve SWD erişimi bırakmamak; ilk çalıştırma planını kart geldikten sonra düşünmek.
- Hesabı bir kez yapıp gereksinim değişince yinelememek.

## Kontrol listesi

- Gereksinimler sayıyla yazıldı; blok şeması ve güç bütçesi hazır.
- Her şematik kararının hesabı ve gerekçesi kayıtlı; şematik inceleme yapıldı.
- Yığın üreticiyle doğrulandı; kural tablosu CAD’e girildi.
- Yerleşim konnektörleri, korumayı, ısıyı ve kristali gözetiyor.
- Kritik netler önce çizildi; DRC temiz, üretim ve montaj dosyaları tamam.
- İlk çalıştırma planı beklenen değerlerle yazıldı.

## Sırada ne var?

Bu kart bilerek sıradandı. Daha yoğun kartlar, esnek devreler ve parça seçimi için [[lesson:advanced-topics|ileri konulara giriş]] dersine geçin; terimler için [[lesson:glossary|sözlük]] elinizin altında.
`,
    en: `
## What we are building

The earlier lessons each covered one subject. This one adds no theory; it takes **one small board from the requirement to the bench**. The point is the order of work: when each decision is made, which calculator answers which question, and what is handed to the next step. Details are in the lesson linked at each step.

The board is a USB-powered environmental sensor node that reports over RS-485:

| Item | Requirement |
|---|---|
| Supply | USB-C, 5 V (design range 4.4–5.5 V), at most 500 mA |
| Interfaces | USB 2.0 full-speed (device), half-duplex RS-485, I²C temperature and humidity sensor, SWD |
| Board | 50 × 35 mm, 4 layers, 1.6 mm, IPC Class 2 ([[lesson:pcb-basics|classes]]) |
| Environment | −20 … +60 °C inside a closed enclosure |

> [!RULE] Write requirements as numbers. “A small board that stays cool” cannot be calculated; “60 °C ambient, 500 mA limit” can.

## Block diagram and power budget

Before the schematic, draw the blocks and their rails, then add up the load currents from the datasheets. The values here are typical; use those of your own parts.

[[fig:blocks]]

| Load (3.3 V) | Typical | Peak |
|---|---|---|
| Microcontroller (8 MHz) | 15 mA | 30 mA |
| Sensor | 1 mA | 1 mA |
| RS-485 transceiver | 2 mA | 60 mA while driving a terminated bus |
| LED | 2 mA | 2 mA |
| Total | 20 mA | 93 mA |

[[calc:powertree?s=5_4.4_5.5_60_VBUS&r=0_ldo_3.3_50_0.3_300_100_U1&l=1_15_30_MCU&l=1_1_1_T-RH&l=1_2_60_RS-485&l=1_2_2_LED|Power tree of this board]]

With the peak current the tool shows a loss of 0.20 W in the regulator. We add about 30 % for what we forgot and do all further calculations with **120 mA**. The input current of a linear regulator equals its output current, so the port sees a quarter of its 500 mA limit. The loss is at most (5.5 − 3.3) V · 0.12 A = 0.26 W, so an LDO is enough; at several times the current we would use a buck converter ([[lesson:power-layout|power supply layout]]).

> [!NOTE] A USB 2.0 device may draw at most 100 mA before the host has configured it (enumeration); it asks for more in its descriptor. So the power budget is an input for the firmware too.

## Schematic decisions

Every decision follows the same pattern: **question → calculator → result → what goes into the schematic.**

**1. At which current must the fuse on VBUS hold?** With the 5.1 kΩ resistors on the CC pins, the board also works on a USB-C adapter that delivers 3 A; a resettable fuse (PTC) limits the current of a short on the board. Candidate: 0.35 A hold and 0.75 A trip current at 25 °C (typical values for a 1206 part). At 60 °C the hold current drops to 0.26 A; the 0.12 A load is 46 % of that. A 3 A fault is 5.3 times the trip current at that temperature, and the drop in normal operation is 0.14 V.

[[calc:protection?mode=ptc&iop=0.12&vckt=5.5&ifl=3&ih=0.35&itr=0.75&kd=75&vm=6&im=40&r1=1.2&r1_u=ohm&pd=0.6&ta=60|The PTC on VBUS]]

Into the schematic: connector → PTC → TVS → input capacitor; the PTC comes first, so the current the TVS draws also flows through the fuse. The TVS needs a stand-off voltage of at least 5.5 V so that it does not conduct at normal VBUS, and a clamp voltage below the absolute maximum of the LDO input. Low-capacitance ESD diodes on D+ and D−, and a **separate** 5.1 kΩ on each of CC1 and CC2 ([[lesson:esd-protection|ESD and protection]]).

**2. How hot does the LDO get?** The worst case is the highest input: 0.264 W at 5.5 V and 120 mA. In a SOT-223 package (θJA ≈ 100 °C/W, a cautious value) the junction reaches **86 °C** at 60 °C ambient, 39 °C below the 125 °C limit ([[lesson:thermal|thermal design]]).

[[calc:thermal?ps=ldo&vin=5.5&vout=3.3&io=0.12&ja=100&ta=60|Temperature of the LDO]]

Into the schematic: an LDO in SOT-223 with a dropout of at most 0.3 V. In the worst case its input sees 4.4 − 0.14 = 4.26 V; it needs 3.6 V. Input and output capacitors as its datasheet says.

> [!QUIZ] What if the same LDO were chosen in a SOT-23-5 package (θJA ≈ 220 °C/W)?
> Tj = 60 °C + 0.264 W · 220 °C/W ≈ 118 °C. Below the limit, but with only 7 °C of margin, and on a small board the real θJA can exceed the datasheet value. The larger package is the right choice. Whatever the package, 0.26 W heats the board: the placement must keep the sensor away from it.

**3. Which value for the I²C pull-ups?** 400 kHz, two devices (10 pF per pin), 4 cm of trace and 5 pF for test points: the bus capacitance is about 29 pF. The allowed range is 967 Ω … 12.2 kΩ and the calculator recommends 9.1 kΩ. We choose 4.7 kΩ: inside the range, 115 ns rise time (limit 300 ns), 0.62 mA while the line is low, and room for a device added later.

[[calc:i2c?mode=fm&vdd=3.3&n=2&pinc=10&len=4&len_u=cm&cpl=1&cx=5&rpu=4700|I²C pull-up range]]

**4. Which load capacitors for the crystal?** With CL = 10 pF for the 8 MHz crystal and about 3 pF of stray capacitance, C1 = C2 = 2 · (10 − 3) = 14 pF; the nearest standard value is 15 pF (effective load 10.5 pF).

[[calc:crystal?cl=10&cs=3|Load capacitors]]

**5. Short calculations that are easy to forget:**

- **LED:** for a red LED, (3.3 − 2.0) V / 2 mA = 650 Ω → 680 Ω ([[lesson:circuit-basics|circuit basics]]).
- **RS-485:** the 120 Ω termination belongs only at the two bus ends, so a jumper fits it. The voltage across it cannot exceed the driver supply: 91 mW at 3.3 V, and at most 0.21 W if a 5 V node is on the bus. A 0603 (0.1 W) is not enough; use a 1206 (0.25 W). At the connector, a bidirectional TVS for the −7 … +12 V common-mode range of RS-485; for the idle bus, a fail-safe transceiver or bias resistors.
- **Decoupling:** typically 100 nF at every VDD pin and one 4.7 µF on the rail ([[lesson:pdn|power distribution]]).
- **Reset, SWD, test points:** the reset button, a boot pin defined by a resistor, the SWD header (SWDIO, SWCLK, NRST, 3V3, GND) and test points for 5 V, 3V3, GND, SDA and SCL go into the schematic now; later there is no room ([[lesson:assembly-test|design for assembly and test]]).

Then go through the [[lesson:schematic-review|schematic review]] list.

## Stack-up and rules

The stack-up and the rules must be fixed before placement; the trace widths follow from them.

**Stack-up.** L1 parts and signals · 0.2 mm prepreg · L2 solid GND · 1.0 mm core · L3 3V3 plane · 0.2 mm prepreg · L4 slow signals. It adds up to 1.54 mm (within 1.6 mm ±10 %) and is symmetric. L4 has a power plane as its neighbour, so USB and the crystal stay on L1, right above GND ([[lesson:stackup|stack-up]]).

[[calc:stackup?w=0.3&s=0.2|Stack-up of this board]]

**USB pair.** 90 Ω differential on L1: with h = 0.2 mm, εr = 4.3, 35 µm copper and a 0.2 mm gap the width comes out as **0.30 mm**; between 0.25 and 0.36 mm the impedance stays within ±10 % ([[lesson:impedance|controlled impedance]]).

[[calc:impedance?mode=synth&st=diffMicrostrip&Z=90&s=0.2&s_u=mm&t=35&t_u=um&h=0.2&h_u=mm&er=4.3|Width of the 90 Ω pair]]

> [!NOTE] On a full-speed link (12 Mbit/s) a 25 mm pair is electrically short; 90 Ω is good practice here, not a necessity. At high speed (480 Mbit/s) it is required.

**Supply traces.** For the 0.5 A the port can deliver, 0.08 mm is enough for a 10 °C rise; but 30 mm of such a trace is 0.19 Ω and drops 95 mV. We draw 0.5 mm: it carries 1.4 A, is 31 mΩ and drops 16 mV at 0.5 A ([[lesson:trace-current|current-carrying traces]]).

[[calc:trace?I=0.5&dT=10&L=30|Width needed for 0.5 A]]

**Clearance and vias.** All voltages on the board are below 15 V; the clearance is set by the fabricator’s minimum, not by the voltage ([[lesson:spacing|spacing]]). We use one via type: 0.3 mm hole, 0.6 mm pad; one carries about 1.9 A at a 10 °C rise ([[lesson:vias|via and pad design]]).

Everything goes into one rule sheet, entered into the CAD tool before the first trace ([[lesson:design-rules|setting up design rules]]):

| Net class | Width | Clearance | Via |
|---|---|---|---|
| Signal (default) | 0.2 mm | 0.2 mm | 0.3 / 0.6 mm |
| USB D+/D− | 0.30 mm | 0.2 mm inside the pair, ≥ 0.76 mm to other nets | none |
| 5 V and 3V3 | 0.5 mm | 0.2 mm | 2 at every transition |
| RS-485 A/B | 0.3 mm, side by side | 0.2 mm | 0.3 / 0.6 mm |
| Crystal | 0.2 mm, shortest path | ground around it | none |

> [!QUIZ] The fabricator says its standard stack-up has 0.12 mm of prepreg between L1 and L2, not 0.2 mm. What happens to the 0.30 mm pair?
> With the same width and gap the impedance drops to 73 Ω: 19 % below the target and outside ±10 %. For 0.12 mm the width has to be 0.21 mm. Get the stack-up from the fabricator before the first trace; learn it later and you route the pair again.

## Placement

The block diagram becomes regions on the board ([[lesson:placement-routing|placement and routing]]).

[[fig:floorplan]]

- **Connectors on the same edge:** the noise voltage of the board ground does not appear between the two cables ([[lesson:grounding-emc|grounding and EMC]]).
- **Protection at the connector:** the PTC, the TVS and the ESD diodes; a pulse goes to ground before it enters the board.
- **Heat away from the sensor:** the LDO at the top left, the sensor about 30 mm away in the opposite corner. Heat reaches the sensor mostly through copper; a slot is cut in between and no copper is poured under it.
- **Crystal and decoupling at the pins;** the MCU is rotated so that its USB pins face the connector.
- **SWD and test points** on an accessible edge; the footprints checked against the datasheets ([[lesson:footprints|footprint design]]).

> [!TIP] Place the connectors and mounting holes from the enclosure drawing and lock them; the rest is arranged around them.

## Routing order

The nets with the least room and the costliest mistakes come first:

1. **Decoupling and fan-out:** short, wide copper from pad to via.
2. **USB pair:** on L1 over the unbroken L2, without vias and symmetric; the ESD diode sits on the path, without a stub; D+ and D− differ in length by at most 2 mm ([[lesson:highspeed-routing|high-speed interfaces]]).
3. **Crystal:** the shortest path; no other trace underneath.
4. **Supply:** VBUS → PTC → TVS → LDO in 0.5 mm; 3V3 reaches the L3 plane through two vias.
5. **RS-485 and I²C,** then the remaining signals; slow ones may go to L4.
6. **Ground pour and stitching vias.** Look at L2 on its own: any slots or necks? Every return current must be able to flow under its trace ([[lesson:signal-integrity|signal integrity]]).

[[calc:interfaces?iface=usb2|USB 2.0 routing rules]]

## Checks and production outputs

- **DRC:** with the rule sheet, after re-pouring the zones: zero errors, zero unrouted nets.
- **Fabrication notes:** 4 layers, 1.6 mm, stack-up and copper thicknesses, surface finish, IPC Class 2; layer, width and gap of the 90 Ω pair ([[lesson:dfm|DFM]]).
- **Assembly files:** BOM, pick-and-place file, assembly drawing; fiducials on the board.
- **Test access:** a test point on every rail and on GND; the SWD header stays reachable inside the enclosure.
- **Mechanical:** a 1:1 print and a 3D check with the enclosure.

## Bring-up plan

The plan is written before the boards arrive; the expected values were calculated in this lesson ([[lesson:bring-up|board bring-up]]).

| Step | Measurement | Expected |
|---|---|---|
| 1 | Unpowered: resistance 5 V–GND and 3V3–GND | No short |
| 2 | Current-limited supply (5 V, 150 mA): rails | ≈ 5 V after the PTC; 3V3 within the regulator tolerance (e.g. ±2 %) |
| 3 | Input current | ≈ 20 mA idle, ≈ 90 mA while driving the bus |
| 4 | SWD and clock | The MCU is detected; 8 MHz on the clock output pin |
| 5 | I²C | The sensor answers at its address; rise time ≈ 115 ns |
| 6 | RS-485 | Differential voltage ≥ 1.5 V on a bus terminated at both ends |
| 7 | USB | The computer detects the device; D+ ≈ 3 V when idle |
| 8 | Heat | 15 minutes at full load: LDO warm; sensor agrees with a reference thermometer |

> [!WARN] Do not probe a crystal pin: the probe’s roughly 10 pF adds to the 15 pF load capacitor, the frequency shifts and the oscillator may stop. Measure the clock on an MCU output pin.

## Map of the project

[[fig:phases]]

When a requirement changes, go back to the first phase that uses it as an input and review every phase after it.

> [!QUIZ] The board works; the customer wants a second sensor on a 1 m cable. Are 4.7 kΩ and 400 kHz still right?
> Go back to the schematic phase. The bus capacitance becomes 3 · 10 pF + 104 cm · 1 pF/cm + 5 pF = 139 pF; for 400 kHz the upper limit drops to 2.55 kΩ, and with 4.7 kΩ the rise time grows to 554 ns (limit 300 ns). Two ways out: 2 kΩ resistors (236 ns, 1.45 mA) or 100 kHz (limit 1000 ns; 4.7 kΩ is enough). The cable leaves the enclosure, so its connector also needs ESD protection: the placement and the rule sheet change too.

## Common mistakes in a first project

- Choosing the regulator without a power budget; leaving heat until last.
- Forgetting the CC resistors or sharing one resistor between both CC pins: with some cables the board gets no power.
- Routing a controlled-impedance pair without asking the fabricator for the stack-up.
- Putting the temperature sensor next to the regulator.
- No test points or SWD access; a bring-up plan written only after the boards arrive.
- Calculating once and not again when a requirement changes.

## Checklist

- Requirements written as numbers; block diagram and power budget ready.
- Every schematic decision has its calculation and reason on record; schematic review done.
- Stack-up confirmed by the fabricator; rule sheet entered into the CAD tool.
- The placement respects connectors, protection, heat and the crystal.
- Critical nets routed first; DRC clean, fabrication and assembly files complete.
- Bring-up plan written with expected values.

## What next?

This board was ordinary on purpose. For denser boards, flex circuits and component selection, go on to [[lesson:advanced-topics|a first look at advanced topics]]; the [[lesson:glossary|glossary]] explains the terms.
`,
  },
};
