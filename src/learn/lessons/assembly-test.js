import { figureFrom } from '../figures.js';
import { text, rect, circle, path, polygon, arrow, callout } from '../../ui/svg.js';

const S = {
  tr: {
    lnCap: 'Dizgi hattı, soldan sağa. Her istasyonun altında, o adımın sorunsuz geçmesi için tasarımın sağladığı şeyler yazılıdır. İki yüzünde de parça olan kart ilk üç istasyondan iki kez geçer.',
    lnTop: 'dizgi hattı',
    stations: [['Pasta', 'baskı'], ['Dizgi', 'makinesi'], ['Reflow', 'fırını'], ['Muayene', '(AOI)'], ['Delikli', 'parçalar'], ['Test ve', 'yazılım']],
    needs: [['pasta katmanı,', 'fiducial’lar'], ['dizgi dosyası, BOM,', 'parça aralıkları'], ['eşit pad bakırı,', 'termal rölyef'],
      ['görünür polarite,', 'dolgu paylı padler'], ['delik ölçüsü,', 'dalga yönü'], ['test noktaları,', 'debug konnektörü']],
    lnNote: '↑ tasarımın her istasyona verdiği',
    tsCap: 'Küçük bir çip parçanın iki padi. Üstte: iki pade de eşit iz girer, iki uç aynı anda erir ve parça yatık kalır. Altta: sağdaki pad termal rölyefsiz bir bakır döküme gömülüdür ve geç ısınır; soldaki pad önce erir, lehimin yüzey gerilimi parçayı ayağa diker (tombstoning).',
    tsTop: 'üstten: padlerin bakırı',
    tsSide: 'yandan: reflow sonrası',
    tsEqual: 'iki yanda eşit bakır',
    tsFirst: 'önce ısınır',
    tsLate: 'geç ısınır',
    tsGood: '✓ iki pad aynı anda erir, parça yatık kalır',
    tsBad: '✗ ince izli pad önce erir ve parçayı diker',
    pnCap: 'Altı küçük karttan oluşan bir panel. Üst ve alt raylar konveyöre oturur; takım deliklerini ve asimetrik dizilmiş genel fiducial’ları taşır. Yatay kesikli çizgiler paneli boydan boya geçen V-kesimlerdir; yan yana duran kartları frezelenmiş kanallar ayırır, delikli kopma köprüleri (mouse bite) tutar.',
    pnBoard: 'kart',
    pnTool: 'takım deliği',
    pnRail: 'kenar rayı',
    pnBoardFid: 'kart fiducial’ı',
    pnVscore: 'V-kesim çizgisi',
    pnSlot: 'freze kanalı',
    pnTab: 'kopma köprüsü',
    pnGlobalFid: 'genel fiducial',
    pnConv: 'konveyör yönü',
  },
  en: {
    lnCap: 'The assembly line, from left to right. Under each station: what the design supplies so that this step goes smoothly. A board with parts on both sides passes the first three stations twice.',
    lnTop: 'assembly line',
    stations: [['Paste', 'print'], ['Pick and', 'place'], ['Reflow', 'oven'], ['Inspect', '(AOI)'], ['Through-', 'hole'], ['Test and', 'firmware']],
    needs: [['paste layer,', 'fiducials'], ['placement file, BOM,', 'part spacing'], ['equal pad copper,', 'thermal relief'],
      ['visible polarity,', 'pads with fillets'], ['hole size,', 'wave direction'], ['test points,', 'debug connector']],
    lnNote: '↑ what the design gives each station',
    tsCap: 'The two pads of a small chip part. Top row: equal traces enter both pads, both ends melt together and the part stays flat. Bottom row: the right-hand pad sits in a copper pour without thermal relief and heats late; the left-hand pad melts first and the surface tension of its solder stands the part on end (tombstoning).',
    tsTop: 'top view: pad copper',
    tsSide: 'side view: after reflow',
    tsEqual: 'equal copper on both sides',
    tsFirst: 'heats first',
    tsLate: 'heats late',
    tsGood: '✓ both pads melt together, the part stays flat',
    tsBad: '✗ the trace pad melts first and stands the part up',
    pnCap: 'A panel of six small boards. The top and bottom rails ride on the conveyor; they carry the tooling holes and the global fiducials, which are placed asymmetrically. The dashed horizontal lines are V-scores that run right across the panel; side by side, the boards are separated by routed slots and held by perforated breakaway tabs (mouse bites).',
    pnBoard: 'board',
    pnTool: 'tooling hole',
    pnRail: 'rail',
    pnBoardFid: 'board fiducial',
    pnVscore: 'V-score line',
    pnSlot: 'routed slot',
    pnTab: 'mouse-bite tab',
    pnGlobalFid: 'global fiducial',
    pnConv: 'conveyor direction',
  },
};

const FLOW = { cls: 'flow', headCls: 'arrow flow' };

/** Copper trace of stroke width w (plain numbers only). */
const trace = (d, w) => `<path class="cutr" style="stroke-width:${w}" d="${d}"/>`;

/** The line as a row of six stations; under each one, what the design supplies for it. */
function line(lang) {
  const s = S[lang] ?? S.en;
  const w = 56;
  let b = text(210, 14, s.lnTop, { cls: 'title' });
  for (let i = 0; i < 6; i++) {
    const x = 17 + i * 66;
    const cx = x + w / 2;
    // Every second list sits lower, so neighbouring lists never collide.
    const low = i % 2 === 1;
    const ty = low ? 122 : 86;
    const anchor = i === 0 ? 'start' : i === 5 ? 'end' : 'middle';
    const tx = i === 0 ? x : i === 5 ? x + w : cx;
    b += rect(x, 22, w, 38, 'comp', ' rx="4"')
      + text(cx, 39, s.stations[i][0], { cls: 'name', size: 10 })
      + text(cx, 52, s.stations[i][1], { cls: 'name', size: 10 })
      + path(`M${cx},60V${low ? 110 : 74}`, 'ext')
      + text(tx, ty, s.needs[i][0], { anchor, size: 10 })
      + text(tx, ty + 12, s.needs[i][1], { anchor, size: 10 });
    if (i < 5) b += arrow(x + w, 41, x + 65.5, 41, FLOW);
  }
  b += text(210, 156, s.lnNote, { cls: 'title' });
  return figureFrom(420, 166, s.lnCap, b);
}

/** Top view of the two pads (origin on the pad centre line): copper, traces and the part outline. */
function padsTop(sunk, s) {
  let b = sunk ? rect(108, -30, 84, 60, 'cu plane') : trace('M150,0H186', 5);
  b += trace('M50,0H14', 5)
    + rect(50, -14, 24, 28, 'cu') + rect(126, -14, 24, 28, 'cu')
    + rect(64, -10, 72, 20, 'dim');
  return b + (sunk
    ? text(40, -36, s.tsFirst, { size: 10 }) + text(150, -36, s.tsLate, { size: 10 })
    : text(100, -24, s.tsEqual, { size: 10 }));
}

/** Side view after reflow (origin on the board surface): the part flat on both pads, or standing on one. */
function chipSide(sunk) {
  const b = rect(10, 4, 180, 10, 'diel') + rect(14, 0, 60, 4, 'cu')
    + (sunk ? rect(108, 0, 82, 4, 'cu') : rect(126, 0, 60, 4, 'cu'));
  if (!sunk) {
    return b + polygon([[52, 0], [64, 0], [64, -11]], 'soft') + polygon([[148, 0], [136, 0], [136, -11]], 'soft')
      + rect(64, -14, 72, 14, 'comp') + rect(64, -14, 10, 14, 'comp') + rect(126, -14, 10, 14, 'comp');
  }
  // The part tilted by 72°: the wetted end stays on its pad, the other end is in the air.
  return b + polygon([[50, 0], [58.7, -4.3], [72, 0]], 'soft') + polygon([[128, 0], [132, -5], [144, -5], [148, 0]], 'soft')
    + polygon([[58.7, -4.3], [72, 0], [94.2, -68.5], [80.9, -72.8]], 'comp')
    + polygon([[58.7, -4.3], [72, 0], [75.1, -9.5], [61.8, -13.8]], 'comp')
    + polygon([[80.9, -72.8], [94.2, -68.5], [91.1, -59], [77.8, -63.3]], 'comp');
}

/** Balanced pads (top row) against one pad sunk into a pour (bottom row). */
function tombstone(lang) {
  const s = S[lang] ?? S.en;
  const at = (x, y, body) => `<g transform="translate(${x},${y})">${body}</g>`;
  const b = text(108, 12, s.tsTop, { cls: 'title' }) + text(312, 12, s.tsSide, { cls: 'title' })
    + at(8, 50, padsTop(false, s)) + at(212, 60, chipSide(false))
    + text(210, 92, s.tsGood, { cls: 'okt' })
    + path('M20,103H400', 'ext')
    + at(8, 152, padsTop(true, s)) + at(212, 186, chipSide(true))
    + text(210, 218, s.tsBad, { cls: 'badt' });
  return figureFrom(420, 228, s.tsCap, b);
}

/** Panel of 3 × 2 boards: rails, tooling holes, fiducials, V-score lines, routed slots with tabs. */
function panel(lang) {
  const s = S[lang] ?? S.en;
  // Fiducial: copper dot in a clear area 2.5 times its diameter.
  const fid = (x, y, r) => circle(x, y, r * 2.5, 'hole') + circle(x, y, r, 'cu');
  let b = rect(12, 14, 260, 180, 'soft');
  for (const x of [12, 102, 192]) {
    for (const y of [34, 104]) b += rect(x, y, 80, 70, 'mask') + fid(x + 72, y + 8, 1.5) + fid(x + 8, y + 62, 1.5);
  }
  // Routed slots between the columns; a tab with two rows of mouse-bite holes holds each board.
  for (const x of [92, 182]) {
    b += rect(x, 34, 10, 140, 'hole');
    for (const y of [61, 131]) {
      b += rect(x, y, 10, 16, 'soft');
      for (const dy of [3.5, 8, 12.5]) b += circle(x + 2.2, y + dy, 1.4, 'hole') + circle(x + 7.8, y + dy, 1.4, 'hole');
    }
  }
  // V-score lines run right across the panel: between rails and boards and between the two rows.
  b += path('M6,34H278M6,104H278M6,174H278', 'dim');
  // Rails: tooling holes and global fiducials in three corners each, so the pattern is asymmetric.
  b += [[24, 24], [260, 24], [24, 184]].map(([x, y]) => circle(x, y, 4, 'hole')).join('')
    + fid(42, 24, 2.2) + fid(42, 184, 2.2) + fid(260, 184, 2.2);
  const tx = 290;
  b += text(52, 73, s.pnBoard, { cls: 'name' })
    + callout(263, 22, tx, 22, s.pnTool)
    + callout(268, 31, tx, 40, s.pnRail)
    + callout(267, 44, tx, 58, s.pnBoardFid)
    + callout(276, 104, tx, 108, s.pnVscore)
    + callout(187, 118, tx, 126, s.pnSlot)
    + callout(187, 139, tx, 144, s.pnTab)
    + callout(265, 184, tx, 188, s.pnGlobalFid)
    + arrow(40, 208, 100, 208, FLOW) + text(108, 212, s.pnConv, { anchor: 'start' });
  return figureFrom(420, 220, s.pnCap, b);
}

export default {
  figures: { line, tombstone, panel },
  body: {
    tr: `
## Neden önemli?

Bir kart DRC’den geçer, yine de dizgi hattında takılabilir: makine kartı tutamaz, bazı parçalar ancak cımbızla lehimlenir, yazılım yüklenemez, tek bir ray bile ölçülemez. O zaman her kart makinenin saniyeleri yerine bir mühendisin dakikalarına mal olur ve hataları müşteri bulur.

[[lesson:dfm|Üretime hazırlık]] dersi çıplak kartı anlatır; bu ders kartın dizilmesini, lehimlenmesini ve test edilmesini. Dizilmiş kartlar tezgâha gelince sıra [[lesson:bring-up|kartın ilk çalıştırılması]] dersindedir.

## Dizgi hattında neler olur?

[[fig:line]]

1. **Pasta baskı:** bir sıyırıcı (squeegee), lehim pastasını stencilin (ince çelik bir levha) açıklıklarından padlerin üzerine basar. Lehim hatalarının çoğu burada başlar.
2. **Dizgi (pick-and-place):** makine kartın yerini fiducial’lardan bulur, her parçayı makarasından vakumlu bir uçla alır ve pastanın üzerine bırakır.
3. **Reflow:** fırında pasta erir (kurşunsuz lehimde tepe sıcaklığı tipik 235–250 °C), padi ve bacağı ıslatır, soğuyunca lehim bağlantısı olur.
4. **Muayene:** otomatik optik muayene (AOI) eksik, kaymış ve ters parçaları, lehim köprülerini arar; gövdenin altında kalan bağlantılar (BGA, QFN) röntgen ister.
5. **Delikli parçalar:** sonradan takılır; dalga lehimle, seçici lehimle (küçük bir nozul) ya da elle lehimlenir.
6. **Temizlik, ayırma, test:** gerekiyorsa flux kalıntısı yıkanır, panel kartlara ayrılır, kartlar programlanır ve test edilir.

> [!TIP] Yerleşimden önce montajcınızın tasarım kılavuzunu isteyin. Bu dersteki sayılar tipik değerlerdir; kılavuz ne diyorsa o geçerlidir.

## Montajcıya giden dosyalar

Üretim dosyalarına ek olarak:

- **Malzeme listesi (BOM):** her satırda referanslar, adet, değer, paket ve **üretici parça numarası**. "100 nF 0402" bir sipariş değildir: gerilim, dielektrik ve tolerans şansa kalır. Takılmayacak parçaları **DNP** (do not populate) diye işaretleyin.
- **Dizgi (centroid) dosyası:** her parçanın referansı, X–Y konumu, açısı ve yüzü; Gerber dosyalarının birimi ve orijiniyle.
- **Montaj çizimi:** iki yüz için dış hatlar, referanslar, pin 1 ve polarite işaretleri, DNP parçalar ve notlar: elle lehimlenecek parçalar, yıkanmaması gereken parçalar, kabul sınıfı (IPC-A-610 Sınıf 1–3).

**Açılar neden karışır?** Dosyadaki açı sizin footprint’inizin sıfır yönüne göredir; makinenin sıfırı ise parçanın şeritteki duruşudur. Kütüphaneler ve CAD araçları farklı davranır (sıfır yönü, alt yüzdeki açı); kendi içinde tutarlı bir dosya yine de bütün diyotları ters dizdirebilir. Montajcı açıları çizime ve serigrafiye bakarak düzeltir; bunlar kuşkuya yer bırakmamalıdır.

> [!WARN] Seri dizgiden önce ilk dizilen kartı (first article) çizimle karşılaştırın: her diyot, LED, kutuplu kondansatör, entegre ve konnektör.

## Pasta ve stencil

Stencil, Gerber verinizdeki pasta katmanından kesilir ve her bağlantının alacağı lehimi belirler: pasta hacmi = açıklık alanı × stencil kalınlığı (tipik 0,10–0,15 mm). Kalınlık bütün kartta aynıdır; onu en küçük açıklık belirler.

Stencil kalkarken pastayı hem alttaki pad hem açıklığın duvarları tutar; pasta ancak pad alanı duvar alanına göre yeterince büyükse padin üzerinde kalır:

**Alan oranı** = açıklık alanı / duvar alanı = dikdörtgen açıklıkta (L × W) / (2 × (L + W) × T), yuvarlak açıklıkta D / (4 × T); T stencil kalınlığıdır.

IPC-7525’in yaygın kuralı: alan oranı en az 0,66, en-boy oranı (açıklık genişliği / T) en az 1,5. Altında pastanın bir kısmı açıklıkta kalır.

> [!QUIZ] Bir BGA’nın pasta açıklıkları 0,30 mm çapında yuvarlak. 0,12 mm’lik stencil pastayı bırakır mı? 0,10 mm’lik stencilin bedeli nedir?
> D / (4 × T) = 0,30 / 0,48 = 0,625: 0,66’nın altında, baskı güvenilmez. 0,10 mm ile 0,30 / 0,40 = 0,75 olur, yeterli. Ama artık bütün açıklıklar %17 daha az pasta basar; büyük bir konnektöre ya da bobine bu az gelebilir.

[[calc:stencil?shape=circle&d=0.3&d_u=mm&t=0.12&t_u=mm|0,30 mm açıklık, 0,12 mm stencil]]

- **İnce adımın yanında büyük parça:** stencil üreticisi açıklıkları küçültür ya da büyütür, ya da bir bölgesi daha ince veya kalın **kademeli stencil** (step stencil) yapar. Kademe, en yakın açıklıkla arasında mesafe ister: çok lehim isteyen parçaları ince adımlı entegrelerden uzak tutun.
- **Termal padler:** açıklığı pencerelere bölün ([[lesson:footprints|footprint dersi]]).

## Yerleşim fırında neyi değiştirir?

- **Dikilme (tombstoning):** küçük bir çip parçanın (en çok 0402 ve daha küçükler etkilenir) iki ucu aynı anda erimelidir. Padlerden biri bakır dökümün içinde, öteki ince bir izin ucundaysa izli pad daha çabuk ısınır; lehimi önce erir ve yüzey gerilimi parçayı ayağa diker. Dökümdeki padlerde termal rölyef kullanın, iki pade benzer izlerle girin.

[[fig:tombstone]]

- **Eşit olmayan ısınma:** fırın profili en ağır bağlantıya göre ayarlanır; hafif parçalar bu yüzden daha çok ısınır, yüksek parçalar (bobin, konnektör, ekranlama kutusu) komşularını sıcak havadan gölgeler. Küçük parçaları bunların dibine sıkıştırmayın.
- **İkinci reflow:** çift yüzlü kartta ilk lehimlenen yüz, ikinci geçişte baş aşağı durur. Lehimi yeniden erir ve parçaları yalnızca yüzey gerilimi tutar: hafif parçalar kalır, ağır parçalar düşebilir. Ağır parçaların hepsini son lehimlenen yüze koyun.
- **Nem:** plastik paket nem çeker; nem fırında buharlaşır ve paketi çatlatabilir. Veri sayfası nem hassasiyet seviyesini (MSL) verir: MSL 3 bir parça, kuru ambalajı açıldıktan sonra 168 saat içinde lehimlenmeli ya da önce fırınlanmalıdır.

> [!QUIZ] Birkaç 0402 dekuplaj kondansatörü dikilmiş. GND padleri termal rölyefsiz toprak dökümünün içinde, besleme padlerine 0,2 mm’lik iz giriyor. Neden oldu, neyi değiştirirsiniz?
> Döküm GND padinin ısısını çeker; besleme padi önce erir ve yüzey gerilimi parçayı diker. GND padine kolları kısa ve geniş bir termal rölyef verin (eklenen endüktans küçük kalır) ya da iki padi de vialarına benzer, kısa ve geniş bakırla bağlayın.

## Dizgi için yerleşim kuralları

Elektriksel yanı da, kutuplu parçaları aynı yöne çevirme kuralı da [[lesson:placement-routing|yerleşim ve yönlendirme]] dersindedir; dizgi şunları ekler:

- **Tek yüz:** ikinci yüz ikinci bir baskı, dizgi ve reflow demektir. Gerekiyorsa oraya yalnızca küçük, hafif parçaları koyun.
- **Kart kenarları:** konveyör kartı karşılıklı iki kenarından taşır. Bu kenarlar boyunca tipik 3–5 mm’lik şeridi parçasız ve fiducial’sız bırakın; yoksa karta ray gerekir.
- **Uç, havya ve kamera için yer:** yüksek bir parçanın dibindeki küçük parça dizilemez, muayene edilemez, tamir edilemez. BGA ve QFN’lerin çevresinde sıcak hava ucu için birkaç milimetre, konnektörlerde fişe ve parmaklara yer bırakın.
- **Kırılma çizgileri:** V-kesimin ve kopma köprülerinin yanına parça, özellikle seramik kondansatör koymayın: kart ayrılırken esner ve onları çatlatabilir.

## Fiducial’lar, takım delikleri ve panel

Temeli [[lesson:dfm|üretime hazırlık]] dersindedir; ayrıntılar:

- **Fiducial’lar:** parça dizilen her yüzde, birbirinden uzak ve asimetrik üç genel fiducial. Makine ikisinden kaymayı ve dönmeyi, üçüncüsüyle kartın esnemesini de bulur; asimetri ters yüklenen kartı ele verir. Tipik ölçü: 1 mm’lik yuvarlak bakır ve çevresinde maske, bakır ve serigrafi bulunmayan 2–3 mm’lik alan. Hem panel raylarına hem her karta koyun; ince adımlı (tipik 0,5 mm ve altı) entegrelerin ve BGA’ların çapraz iki köşesine birer yerel fiducial ekleyin.

[[fig:panel]]

- **Raylar:** karşılıklı iki kenardaki şeritler (tipik 5–10 mm) konveyöre tutunacak yer verir ve takım deliklerini taşır; parçalar böylece kart kenarına kadar gelebilir.
- **V-kesim:** iki yüzden, paneli boydan boya düz geçen V oluklar arada ince bir köprü bırakır. Ucuzdur, malzeme harcamaz; ama yalnızca düz kenar verir, çok ince kartlara uymaz ve bıçak çizgiden geniş kestiği için bakır ile parçalar çizgiden uzak durmalıdır.
- **Frezeleme ve kopma köprüleri:** dış hat frezelenir; kart, üzerinde bir sıra delik bulunan küçük köprülerle (mouse bite) asılı kalır. Her şekle uyar, ama kırılan köprü pürüz bırakır: köprüleri konnektörün önüne, kutuya sürülen kenara ve izlerin yakınına koymayın.
- **Raysız kart:** konveyöre sığacak büyüklükteki kart, iki paralel kenarı boşsa ve kendi fiducial’ları varsa tek başına dizilir. Küçük ya da düzgün kenarı olmayan karta panel ya da taşıyıcı gerekir; prototipte bunu çoğu montajcı hazırlar.

## Delikli parçalar

- **Delik:** en büyük bacak ölçüsü + boşluk ([[lesson:footprints|footprint dersi]]). Örnek: yuvarlak pinleri en çok 1,0 mm olan bir klemens. Hesaplayıcı, üretilebilirlik seviyesi B ve ±0,075 mm delik toleransıyla nominal **1,275 mm** bitmiş delik ve dış katmanda en az **1,70 mm** pad verir; 2,0 mm’lik pad en kötü durumda 0,20 mm halka bırakır.

[[calc:padstack?k=round&lv=B&ld=1&ld_u=mm&pad=2&pad_u=mm|1,0 mm’lik pin için delik ve pad]]

- **Bacak boyu:** bacak lehim yüzünden, lehim dolgusunun içinde görülecek kadar çıkmalıdır (tipik 1–1,5 mm; sınırları IPC-A-610 verir). 2,4 mm’lik kart, kısa bacaklı konnektörü yutar.
- **Dalga lehim:** kart erimiş lehim dalgasının üzerinden geçer. Pin sıraları hareket yönüne paralelken en iyi lehimlenir; lehim son pinlerde köprü yapmaya yatkındır, sıranın arkasına konan boş **lehim hırsızı** (solder thief) padleri fazlalığı üzerine çeker. Yönü montajcıya sorun ve konnektörleri aynı yöne çevirin.
- **Lehim yüzündeki SMD parçalar:** yapıştırıcı, üzerlerini örten bir palet ya da pinlerin seçici lehimlenmesi gerekir; delikli pinlerden birkaç milimetre (tipik) uzak tutun.

## Test için tasarım

> [!RULE] Kartın nasıl test edileceğine yerleşim bitmeden karar verin; sonra test noktasına yer kalmaz.

**Nereye?** Her güç rayına, toprağa (karta yayılmış birkaç tane), reset’e, programlama ve UART hatlarına; ayrıca ilk çalıştırmada bakacağınız ve üretim testinin süreceği ya da ölçeceği her nete ([[lesson:schematic-review|şematik inceleme]]).

- **Test noktası (test point) ayrı bir paddir,** maskesi açık, pastasız. İnce adımlı bir parçanın bacağına basan iğne, açık bir bağlantıyı bastırıp kapatabilir: kart testten geçer, sahada arızalanır.
- **Ölçü ve aralık (tipik):** iğne yataklı fikstür (bed-of-nails) en az 1 mm’lik pad ve merkezden merkeze 2,54 mm ister; 1,27 mm mümkündür ama iğneler ince, kırılgan ve pahalıdır. Uçan prob (flying probe) 0,5 mm’lik bir pade ya da maskesi açık bir viaya basabilir.
- **Tek yüz:** bütün test noktaları aynı yüzde, çoğunlukla altta olsun; çift yüzlü fikstür çok daha pahalıdır. Noktaları yüksek parçalardan uzak tutun ve karta yayın: yüzlerce yaylı iğne tek noktaya basarsa kart eğilir.

| Yöntem | Ne bulur? | Bedeli ve sınırı |
|---|---|---|
| Görsel muayene, AOI | Eksik, kaymış, ters parça; görünen köprüler | Hızlı, her kartta; gizli bağlantıyı, işaretsiz değeri ve işlevi görmez |
| Uçan prob | Açık devre, kısa devre, pasif değerleri, diyot yönü | Fikstür yok; kart başına dakikalar. Prototip, küçük seri |
| Devre içi test (ICT) | Aynılarını fikstürde, saniyeler içinde; kartı besleyip programlayabilir | Her kart revizyonuna pahalı bir fikstür; her nete test noktası |
| Sınır tarama (boundary scan, JTAG) | Tarama zinciri olan entegreler arasındaki bağlantılar, pinlere dokunmadan (BGA) | Yalnızca bir konnektör ve yazılım; analog devreyi görmez |
| Fonksiyon testi | Kart işini yapıyor mu: raylar, akım, arayüzler | Fikstürü ve yazılımı size kalır; hatanın yerini değil, varlığını gösterir |

> [!QUIZ] Aynı kart bir üründe yılda 200, başka bir üründe 20 000 adet üretilecek. Uçan prob mu, fikstür mü?
> 200 adette uçan prob: fikstür parası yoktur, kart başına dakikalar da sorun olmaz. 20 000 adette fikstür: bedeli çok karta bölünür ve test saniyeler sürer. İkisinde de ayrıca fonksiyon testi gerekir: elektriksel test parçaların doğru takıldığını gösterir, kartın çalıştığını değil.

## Programlama ve debug erişimi

- **Debug konnektörü:** SWD (SWDIO, SWCLK, reset, hedef gerilimi, GND) ya da JTAG, bir konnektörde (10 pinli, 1,27 mm adımlı Cortex debug konnektörü yaygındır) ya da yaylı iğne (pogo pin) footprint’inde: padler ve hizalama delikleri, parça maliyeti yok. Konsol çıktısı ve test komutları için bir UART (TX, RX, GND) ekleyin.
- **Erişim:** test noktalarıyla aynı yüzde olsun ki kart fikstürde programlansın; sahadan dönen cihazlar için mümkünse kutunun içindeyken de ulaşılsın.
- **Reset ve boot:** reset’teki test noktası, fikstürün ölçerken işlemciyi reset’te tutmasını ve debugger’ın reset altında bağlanmasını sağlar ([[lesson:bring-up|ilk çalıştırma]]). Üretimde bootloader kullanılacaksa boot pinini de dışarı alın.
- **Akım ölçümü:** her regülatör çıkışına seri bir 0 Ω direnç ya da jumper: sökünce akım ölçülür, kısa devre aranırken bölüm ayrılır.
- **Durum LED’i ve kimlik:** bir GPIO’daki LED en ucuz ölçü aletidir. Kart adını ve revizyonunu bakıra ya da serigrafiye yazın, seri numarası etiketine yer bırakın; böylece her test kaydı bir karta ait olur.

## Sık yapılan hatalar

- Test noktası koymamak ya da parçaların altına, iki yüze dağıtmak.
- Programlama konnektörü koymamak ya da kutunun, ekranın altında bırakmak.
- BOM’u üretici parça numarasız göndermek; DNP parçaları dizgi dosyasında bırakmak.
- Fiducial koymamak; parçaları konveyör kenarına dizmek; 0402 padini döküme gömmek; ağır parçaları iki yüze dağıtmak.

## Kontrol listesi

- Montajcının tasarım kılavuzu okundu; panel, raylar ve fiducial’lar onunla netleşti.
- BOM’da üretici parça numaraları ve DNP işaretleri var; dizgi dosyası ve montaj çizimi aynı revizyondan.
- Pasta katmanı görüntüleyicide kontrol edildi; küçük parçaların iki padi benzer bakırda; ağır parçalar tek yüzde; kırılma çizgilerinin yanı boş.
- Her rayda, toprakta ve gereken netlerde, hepsi tek yüzde test noktası var; test yöntemi seçildi.
- Debug ve UART erişimi, reset test noktası, akım ölçüm köprüleri, durum LED’i ve etiket alanı yerinde.

## Sırada ne var?

Dizilmiş kartlar geldiğinde [[lesson:bring-up|kartın ilk çalıştırılması]] dersine geçin; terimlerin açıklaması [[lesson:glossary|sözlükte]].
`,
    en: `
## Why it matters

A board can pass DRC and still get stuck on the assembly line: the machine cannot hold it, some parts can only be soldered with tweezers, the firmware cannot be loaded and no rail can be measured. Then every board costs an engineer’s minutes instead of a machine’s seconds, and the customer finds the faults.

[[lesson:dfm|Getting ready for manufacturing]] covers the bare board; this lesson covers populating, soldering and testing it. [[lesson:bring-up|Board bring-up]] starts once assembled boards are on your bench.

## What happens on the assembly line

[[fig:line]]

1. **Paste printing:** a squeegee presses solder paste through the apertures of the stencil, a thin steel sheet, onto the pads. Most soldering defects start here.
2. **Pick-and-place:** the machine locates the board by its fiducials, picks each part from its reel with a vacuum nozzle and sets it into the paste.
3. **Reflow:** in the oven the paste melts (peak typically 235–250 °C for lead-free solder), wets pad and lead and solidifies into a joint.
4. **Inspection:** automated optical inspection (AOI) looks for missing, shifted and reversed parts and for bridges; joints hidden under the body (BGA, QFN) need X-ray.
5. **Through-hole parts:** inserted afterwards and soldered by wave, by selective soldering (a small nozzle) or by hand.
6. **Cleaning, depanelling, test:** flux residue is washed off if required, the panel is separated, the boards are programmed and tested.

> [!TIP] Ask your assembler for their design guide before the layout. The numbers in this lesson are typical; the guide decides.

## The files the assembler needs

Besides the fabrication data:

- **Bill of materials (BOM):** designators, quantity, value, package and the **manufacturer part number** on every line. "100 nF 0402" is not an order: voltage, dielectric and tolerance are left to chance. Mark parts that are not fitted as **DNP** (do not populate).
- **Placement (centroid) file:** designator, X–Y position, rotation and side of every part, with the units and origin of the Gerber files.
- **Assembly drawing:** outlines, designators, pin 1 and polarity marks for both sides, DNP parts, and notes: hand-soldered parts, parts that must not be washed, the acceptance class (IPC-A-610 Class 1–3).

**Why rotations go wrong:** the angle in the file is relative to the zero orientation of your footprint; the machine’s zero is the way the part lies in its tape. Libraries and CAD tools differ (zero orientation, bottom-side angles), so a consistent file can still put every diode in backwards. The assembler corrects the angles from the drawing and the silkscreen, which must leave no doubt.

> [!WARN] Before the batch runs, check the first assembled board (the first article) against the drawing: every diode, LED, polarised capacitor, IC and connector.

## Paste and stencil

The stencil is cut from the paste layer of your Gerber data and decides how much solder each joint gets: paste volume = aperture area × stencil thickness (typically 0.10–0.15 mm). The thickness is the same for the whole board, so the smallest aperture sets it.

When the stencil lifts off, the pad below and the aperture walls both hold the paste; it stays on the pad only if the pad area is large enough compared with the wall area:

**Area ratio** = aperture area / wall area = (L × W) / (2 × (L + W) × T) for a rectangular aperture, D / (4 × T) for a round one; T is the stencil thickness.

The common rule from IPC-7525: area ratio at least 0.66, and aspect ratio (aperture width / T) at least 1.5. Below that, part of the paste stays in the aperture.

> [!QUIZ] The paste apertures of a BGA are round, 0.30 mm in diameter. Does a 0.12 mm stencil release the paste? What does a 0.10 mm stencil cost?
> D / (4 × T) = 0.30 / 0.48 = 0.625: below 0.66, the print is unreliable. With 0.10 mm it is 0.30 / 0.40 = 0.75, enough. But every aperture now prints 17 % less paste, which may be too little for a large connector or inductor.

[[calc:stencil?shape=circle&d=0.3&d_u=mm&t=0.12&t_u=mm|0.30 mm aperture, 0.12 mm stencil]]

- **Fine pitch next to large parts:** the stencil maker shrinks or enlarges apertures or makes a **stepped stencil**, thinner or thicker in one area. A step needs distance to the nearest aperture: keep parts that need much solder away from fine-pitch ICs.
- **Thermal pads:** split the aperture into windows ([[lesson:footprints|footprint lesson]]).

## What the layout changes in the oven

- **Tombstoning:** both ends of a small chip part (0402 and smaller suffer most) must melt at the same moment. If one pad lies in a copper pour and the other on a thin trace, the trace pad heats faster; its solder melts first and surface tension stands the part on end. Use thermal relief on pads in a pour and similar traces into both pads.

[[fig:tombstone]]

- **Uneven heating:** the oven profile is set for the heaviest joint, so light parts get hotter, and tall parts (inductors, connectors, shield cans) shade their neighbours from the hot air. Do not crowd small parts against them.
- **Second reflow:** on a double-sided board the side soldered first hangs upside down during the second pass. Its solder melts again and only surface tension holds the parts: light parts stay, heavy ones can drop. Put all heavy parts on the side soldered last.
- **Moisture:** a plastic package takes up moisture, which turns to steam in the oven and can crack it. The datasheet gives the moisture sensitivity level (MSL): an MSL 3 part must be soldered within 168 hours of opening its dry pack, or be baked first.

> [!QUIZ] A few 0402 decoupling capacitors stand on end. Their GND pads lie in the ground pour without thermal relief; a 0.2 mm trace enters the supply pads. Why, and what do you change?
> The pour draws heat away from the GND pad, so the supply pad melts first and surface tension stands the part up. Give the GND pad thermal relief with short, wide spokes (little added inductance), or connect both pads to their vias with similar short, wide copper.

## Placement rules for assembly

The electrical side is in [[lesson:placement-routing|placement and routing]], as is the rule to turn polarised parts the same way; assembly adds:

- **One side:** a second side means a second print, placement and reflow. If you need it, put only small, light parts there.
- **Board edges:** the conveyor carries the board by two opposite edges. Keep a strip of typically 3–5 mm along them free of parts and fiducials, or the board needs rails.
- **Room for nozzle, iron and camera:** a small part right next to a tall one cannot be placed, inspected or reworked. Leave a few millimetres around BGAs and QFNs for the hot-air nozzle, and room at connectors for the plug and for fingers.
- **Break lines:** no parts, above all no ceramic capacitors, next to V-score lines and breakaway tabs: the board flexes when it is separated, which can crack them.

## Fiducials, tooling holes and panels

The basics are in [[lesson:dfm|getting ready for manufacturing]]; the details:

- **Fiducials:** three global ones on every side that carries parts, far apart and asymmetric. Two give the machine offset and rotation, the third also the stretch of the board; the asymmetry gives away a board loaded the wrong way round. Typical size: a round 1 mm copper dot in a 2–3 mm area free of mask, copper and silkscreen. Put them on the panel rails and on every board; a fine-pitch IC (typically 0.5 mm and below) or a BGA gets two local ones at opposite corners.

[[fig:panel]]

- **Rails:** strips along two opposite edges (typically 5–10 mm) give the conveyor something to hold and carry the tooling holes; parts can then go right up to the board edge.
- **V-score:** V-grooves cut from both sides, straight across the whole panel, leave a thin web. Cheap and without waste; but straight edges only, not for very thin boards, and copper and parts must stay back from the line, because the blade cuts wider than it.
- **Routing with breakaway tabs:** the outline is milled and the board hangs on small tabs with a row of holes (mouse bites). Any shape is possible, but a broken tab leaves a rough spot: no tabs at a connector, on an edge that slides into the enclosure, or close to traces.
- **Without rails:** a board large enough for the conveyor runs on its own if two parallel edges are clear and it has its own fiducials. A small or irregular board needs a panel or a carrier; most assemblers build it for prototypes.

## Through-hole parts

- **Hole:** largest lead dimension + clearance ([[lesson:footprints|footprint lesson]]). Example: a terminal block with round pins of at most 1.0 mm. At producibility level B and ±0.075 mm hole tolerance the calculator gives a nominal finished hole of **1.275 mm** and a minimum pad of **1.70 mm** on outer layers; a 2.0 mm pad leaves a worst-case ring of 0.20 mm.

[[calc:padstack?k=round&lv=B&ld=1&ld_u=mm&pad=2&pad_u=mm|Hole and pad for a 1.0 mm pin]]

- **Lead length:** the lead must come out of the solder side far enough to be seen in the fillet (typically 1–1.5 mm; IPC-A-610 sets the limits). A 2.4 mm board swallows a connector with short tails.
- **Wave soldering:** the board passes over a wave of molten solder. Rows of pins solder best parallel to the direction of travel; solder tends to bridge the last pins, and unconnected **solder thief** pads behind the row draw the excess off. Ask the assembler for the direction and turn all connectors the same way.
- **SMD parts on the solder side:** they need glue, a pallet that covers them, or selective soldering of the pins; keep them a few millimetres (typical) away from the through-hole pins.

## Design for test

> [!RULE] Decide how the board will be tested before the layout is finished; afterwards there is no room for test points.

**Where?** On every power rail, on ground (several, spread out), on reset, on the programming and UART lines, and on every net you will look at during bring-up or that the production test must drive or measure ([[lesson:schematic-review|schematic review]]).

- **A test point is a pad of its own,** mask opened, no paste. A probe pressing on the lead of a fine-pitch part can push an open joint closed: the board passes the test and fails in the field.
- **Size and pitch (typical):** a bed-of-nails fixture wants pads of at least 1 mm, 2.54 mm centre to centre; 1.27 mm is possible, but the probes are thin, fragile and expensive. A flying probe can land on a 0.5 mm pad or an untented via.
- **One side:** all test points on the same side, usually the bottom; a double-sided fixture costs much more. Keep them clear of tall parts and spread them out: hundreds of spring probes on one spot bend the board.

| Method | What it finds | Cost and limits |
|---|---|---|
| Visual inspection, AOI | Missing, shifted, reversed parts; visible bridges | Fast, every board; no hidden joints, no unmarked values, no function |
| Flying probe | Opens, shorts, passive values, diode orientation | No fixture; minutes per board. Prototypes, small series |
| In-circuit test (ICT) | The same in seconds, on a fixture; can power and program the board | A costly fixture per board revision; a test point on every net |
| Boundary scan (JTAG) | Connections between ICs with a scan chain, without touching pins (BGA) | Only a connector and software; no analog circuits |
| Functional test | Whether the board does its job: rails, current, interfaces | Your own fixture and firmware; shows that there is a fault, not where |

> [!QUIZ] The same board is built 200 times a year in one product and 20 000 times in another. Flying probe or fixture?
> Flying probe for 200: no fixture to pay for, and minutes per board do not matter. Fixture for 20 000: its price is shared by many boards and the test takes seconds. Both need a functional test as well: the electrical test shows that the parts are fitted correctly, not that the board works.

## Programming and debug access

- **Debug connector:** SWD (SWDIO, SWCLK, reset, target voltage, GND) or JTAG on a header (the 10-pin 1.27 mm Cortex debug connector is common) or on a pogo-pin footprint: pads and alignment holes, no part cost. Add a UART (TX, RX, GND) for a log console and test commands.
- **Access:** on the test-point side, so the board is programmed in the fixture, and if possible reachable in the enclosure too, for units returned from the field.
- **Reset and boot:** a test point on reset lets the fixture hold the processor in reset while it measures and lets the debugger connect under reset ([[lesson:bring-up|bring-up]]). Bring out the boot pin too if production uses a bootloader.
- **Current measurement:** a 0 Ω resistor or jumper in series at every regulator output: remove it to measure the current or to isolate a section when looking for a short.
- **Status LED and identity:** an LED on a GPIO is the cheapest instrument. Put board name and revision in copper or silkscreen and leave room for a serial-number label, so every test record belongs to a board.

## Common mistakes

- No test points, or test points under parts and on both sides.
- No programming connector, or one hidden by the enclosure or the display.
- A BOM without manufacturer part numbers; DNP parts left in the placement file.
- No fiducials; parts in the conveyor edge strip; an 0402 pad sunk into a pour; heavy parts on both sides.

## Checklist

- The assembler’s design guide is read; panel, rails and fiducials are agreed.
- BOM with manufacturer part numbers and DNP marks; placement file and assembly drawing from the same revision.
- Paste layer checked in a viewer; similar copper on both pads of small parts; heavy parts on one side; break lines clear.
- Test points on every rail, on ground and on the nets that need them, all on one side; test method chosen.
- Debug and UART access, reset test point, current links, status LED and label area in place.

## What next?

When the assembled boards arrive, go on to [[lesson:bring-up|board bring-up]]; the terms are in the [[lesson:glossary|glossary]].
`,
  },
};
