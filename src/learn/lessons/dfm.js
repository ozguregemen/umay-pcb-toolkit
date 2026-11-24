export default {
  body: {
    tr: `
## Neden önemli?

CAD aracınızın DRC’sinden geçen bir tasarım yine de zor üretilebilir, hatta hiç üretilemeyebilir. Üretilebilirlik için tasarım (DFM), üreticinin ve montajcının güvenle yapabildiklerinin içinde, payla tasarlamaktır. Kabiliyetin sınırındaki kart daha pahalıdır, verimi düşüktür ve geç gelir; sınırın dışındaki kart üreticiden sorularla (mühendislik sorgusu, EQ) geri döner ya da yanlış üretilir.

## Üretici kabiliyet tablosunu okumak

Her üretici genellikle "standart" ve "ileri" (advanced) sütunlu bir kabiliyet tablosu yayımlar. Aşağıdaki değerler **tipik üretici kabiliyetleridir, IPC şartı değildir**; esas olan kendi üreticinizin tablosudur.

| Parametre | Ne demek? | Tipik standart kabiliyet |
|---|---|---|
| En küçük iz / aralık | Güvenle aşındırılabilen en dar iz ve boşluk | ½–1 oz’da 0,10–0,15 mm (4–6 mil); kalın bakırda daha geniş |
| En küçük mekanik delik | En küçük matkap ucu | 0,2–0,3 mm; lazer mikrovia ~0,1 mm |
| En-boy oranı | Kart kalınlığı / matkap çapı | 8:1–10:1 (IPC-2221 < 5:1’i tercih eder) |
| Halka (annular ring) | Matkap deliğinin çevresinde kalan pad bakırı | Dış katmanda ~0,1–0,15 mm |
| Lehim maskesi genişlemesi | Maske açıklığının paddan her yöne büyüklüğü | 0,05–0,1 mm; bazı üreticiler 0 bırakmanızı ister |
| Lehim maskesi köprüsü (dam) | İki açıklık arasında kalan en ince maske şeridi | Yeşilde ~0,1 mm, diğer renklerde çoğu zaman daha fazla |
| Bakır–kenar mesafesi | Frezelenen kenardan bakırın geri çekilmesi | 0,25–0,5 mm; V-kesimde daha fazla |

- Gerekmedikçe **standart** sütuna göre tasarlayın; ileri kabiliyetler para ve verim demektir.
- Bu değerleri bir payla birlikte iz çizimine **başlamadan** CAD kurallarına girin.
- Birimlere ve tanımlara dikkat edin: mil mi mm mi, bitmiş delik mi matkap mı?

> [!NOTE] Üretici halkayı genellikle nominal matkap deliğine göre verir. IPC-2221’in pad formülü ise en büyük deliği ve en kötü durum toleranslarını kapsayan üretim payını ekler. Bu yüzden IPC hesabı daha büyük pad çıkarır; ikisi farklı soruları cevaplar.

## Yayından önce DFM kontrolleri

CAD DRC sizin girdiğiniz kuralları kontrol eder; DFM kontrolü daha ileri gider:

- **Bakır:** asit tuzakları (izler arasındaki dar açılar), ince bakır veya maske şeritleri, kolları eksik termal rölyefler, bağlantısız bakır adaları.
- **Padler ve maske:** ince aralıklı padler arasında maske köprüsü kalıyor mu? Pad içi via’lar dolgulu ve kapaklı değilse (IPC-4761) lehim deliğe kaçar.
- **Delikler ve kenarlar:** delikler arasında en az 0,5 mm laminat (IPC-2221); bileşenler kart kenarından tercihen en az 1,5 mm içeride (IPC-2221), V-kesimli panellerde daha fazla.
- **Bakır dengesi:** katmanlarda ve katmanlar arasında dengeli dağılım ([[lesson:stackup|katman yığını dersi]]).
- **Serigrafi ve test:** yazılar padlerin üzerinde değil, polarite işaretleri okunuyor; test noktaları erişilebilir.

Çoğu üretici dosyaları yüklediğinizde ücretsiz bir DFM kontrolü yapar. Bunu kullanın ama tek güvenceniz yapmayın.

## IPC-6012 sınıfını çizime yazın

Üretim çiziminde kabul kriterini açıkça belirtin: "IPC-6012 Sınıf 2’ye göre üretilecek, IPC-A-600 Sınıf 2’ye göre kabul edilecektir." Sınıf, kabul edilebilir kusurları da tanımlar: Sınıf 2–3’te izole kusurlar iletken genişliğini **%20**’ye kadar azaltabilir; akım için tam sınırda hesaplanmış bir izin payı kalmaz. Katmanlar arası dielektrik belirtilmezse IPC-6012’nin en küçük değeri geçerlidir (rev B–E’de 90 µm, rev F’de 65 µm); empedans veya yalıtım için belirli bir kalınlığa güveniyorsanız çizime yazın.

[[calc:ipcref?c=2|Sınıf 2 IPC kurallarını aç]]

## Panelleme, fiducial’lar ve takım delikleri

- **Panelleme:** küçük kartlar dizgide panel (array) hâlinde işlenir; delikli kopma köprüleri (mouse bite) veya V-kesim çizgileriyle birleştirilir, kenarlarda konveyör için raylar bulunur. Panel ölçüsünü ve ray genişliğini montajcınıza sorun; paneli üretici hazırlasa bile onaylayan siz olun.
- **V-kesim** paneli boydan boya geçen düz çizgiler ister ve bakırın kenardan daha uzak tutulmasını gerektirir.
- **Fiducial’lar:** dizgi kamerasının hizalama için kullandığı, çevresi maskesiz bakır noktalar. Asimetrik yerleştirilmiş genel fiducial’lar ve ince aralıklı parçaların yanında yerel fiducial’lar kullanılır; ölçüyü montajcınızın tercihine göre seçin.
- **Takım delikleri (tooling hole):** montajcının ve test fikstürünün hizalama için kullandığı kaplamasız delikler; çapını ve konumunu onlara sorun.

## Üretim çıktıları

| Dosya | İçerik |
|---|---|
| Gerber (RS-274X / X2) | Her bakır katmanı, lehim maskesi, serigrafi, pasta ve dış hat için ayrı dosya |
| Delik dosyası (Excellon veya Gerber) | Konumlar ve çaplar; kaplamalı ve kaplamasız ayrı |
| IPC-D-356 netlist | Üreticinin elektriksel testini tasarımla karşılaştırmak için |
| Üretim çizimi ve katman yığını | Sınıf, malzeme, kalınlık, kaplama, delik tablosu, empedans, test şartı |
| ODB++ / IPC-2581 | Katmanları, delikleri, netlisti ve yığını tek dosyada taşıyan akıllı biçimler |
| Montaj paketi | BOM, dizgi (pick-and-place) dosyası, montaj çizimi |

Göndermeden önce dosyaları bağımsız bir Gerber görüntüleyicide açın: katman sırası, polarite ve kapalı dış hat. Dosyalarla çizim çelişmesin.

## Örnek: bir via’yı mercek altına almak

1,6 mm kartta bitmiş delik 0,3 mm ±0,075 mm, via için matkap payı 0,05 mm, Seviye B.

- Matkap yaklaşık **0,35 mm**, en-boy oranı **4,6 : 1**; hem IPC-2221’in tercih ettiği 5:1’in hem tipik 8–10:1 sınırının içinde.
- IPC-2221 en kötü durum hesabı dış ve iç katmanda en az **0,725 mm** pad ister.
- **0,6 mm pad:** nominal halka 0,150 mm, ama en kötü durumda dışta **−0,013 mm**, içte **−0,038 mm**; delik paddan taşabilir ve bütün kontroller başarısız.

[[calc:padstack?lv=B&da=0.05&pad=0.6|0,6 mm padi kontrol et]]

- **0,75 mm pad:** en kötü durumda dışta **0,063 mm**, içte **0,038 mm**; Sınıf 3 dahil bütün kontroller geçer.

[[calc:padstack?lv=B&da=0.05&pad=0.75|0,75 mm padi kontrol et]]

Yine de 0,3/0,6 mm via’lar birçok üreticide her gün üretilir, çünkü gerçek konum hassasiyetleri Seviye B payından iyidir. IPC-2221 sonucunun altına inecekseniz bunun üreticinin kabiliyet tablosunda olduğundan emin olun; Sınıf 3’ün kırılmaya hiç izin vermediğini unutmayın. Kırılmaya izin verilen tasarımlarda damla (teardrop) kullanın.

Aralığa da bakın: kartta 48 V’luk bir hat varsa IPC-2221 dış katmanda **0,6 mm** ister; üreticinin 0,1–0,15 mm’lik en küçük aralığı burada belirleyici değildir. Elektriksel şart, üretim kabiliyetinden önce gelir.

[[calc:spacing?V=48&cat=B2|48 V aralığını aç]]

## Sık yapılan hatalar

- Her yerde ileri kabiliyetle tasarlamak.
- Bitmiş delik ile matkap çapını karıştırmak; kaplamalı ve kaplamasız delikleri ayırmamak.
- Çizime sınıfı, malzemeyi ve kalınlığı yazmamak.
- Dolgusuz pad içi via kullanmak.
- V-kesimli panelde bakırı kenara fazla yakın bırakmak.
- Dosyaları bir görüntüleyicide kontrol etmeden göndermek.

> [!QUIZ] Üreticinin tablosunda en küçük matkap 0,2 mm, en büyük en-boy oranı 8:1 yazıyor. 2,0 mm kalınlığında bir kartta 0,2 mm via kullanabilir misiniz?
> Hayır. 2,0 / 0,2 = 10:1, sınırın üzerinde. En az 0,25 mm matkap (2,0 / 0,25 = 8:1) kullanın, kartı inceltin veya kör via’ya geçin.

> [!QUIZ] IPC-2221 hesabı neden üreticinin tablosundan daha büyük pad çıkarır?
> Üretici halkayı genellikle nominal matkap deliğine göre verir. IPC-2221 en büyük bitmiş deliği ve konum ile aşındırma toleranslarını kapsayan üretim payını ekleyerek en kötü durumda bile halkanın kalmasını hedefler.

> [!QUIZ] Akım için tam sınırda hesaplanmış bir iz, Sınıf 2 kartta neden riskli olabilir?
> IPC-6012 Sınıf 2–3’te izole kusurların iletken genişliğini %20’ye kadar azaltmasına izin verir. O noktada kesit küçülür ve iz hesaplanandan sıcak çalışır; genişliğe pay bırakın.

## Yayın öncesi kontrol listesi

- DRC üreticiye dayalı kurallarla temiz, ERC temiz; istisnalar belgelendi.
- Footprint’ler veri sayfalarıyla kontrol edildi (pin 1, polarite, 3B model).
- Katman yığını üreticiyle onaylandı; empedans tablosu çizimde.
- Üretim çizimi eksiksiz: sınıf, malzeme, kalınlık, yüzey kaplaması, renkler, delik tablosu, empedans, via işlemi, test.
- Gerber, delik ve netlist dosyaları bir görüntüleyicide incelendi.
- Panel, fiducial’lar ve takım delikleri montajcıyla netleştirildi.
- BOM ve dizgi dosyası kart revizyonuyla uyumlu; takılmayacak parçalar işaretli.
`,
    en: `
## Why it matters

A design that passes your CAD tool’s DRC can still be hard, or even impossible, to build. Design for manufacturability (DFM) means designing within what the fabricator and assembler can do reliably, with margin. A board at the edge of capability costs more, yields less and arrives later; one beyond it comes back with questions (engineering queries, EQs) or gets built wrong.

## Reading a fabricator capability sheet

Every fabricator publishes a capability sheet, usually with a "standard" and an "advanced" column. The values below are **typical fabricator capabilities, not IPC requirements**; your own fabricator’s sheet is what counts.

| Parameter | What it means | Typical standard capability |
|---|---|---|
| Min trace / space | Narrowest track and gap that can be etched reliably | 0.10–0.15 mm (4–6 mil) on ½–1 oz; wider on heavy copper |
| Min mechanical drill | Smallest drill bit | 0.2–0.3 mm; laser microvias ~0.1 mm |
| Aspect ratio | Board thickness / drill diameter | 8:1–10:1 (IPC-2221 prefers < 5:1) |
| Annular ring | Pad copper left around the drilled hole | ~0.1–0.15 mm on outer layers |
| Solder-mask expansion | How much larger the mask opening is than the pad, per side | 0.05–0.1 mm; some fabricators ask you to leave it at 0 |
| Solder-mask dam | Thinnest strip of mask between two openings | ~0.1 mm for green, often more for other colours |
| Copper to edge | How far copper is pulled back from a routed edge | 0.25–0.5 mm; more for V-scoring |

- Design to the **standard** column unless you need more; advanced capabilities cost money and yield.
- Enter these values, with margin, into your CAD rules **before** you start routing.
- Watch units and definitions: mil or mm, finished hole or drill?

> [!NOTE] Fabricators usually quote the annular ring against the nominal drilled hole. The IPC-2221 land formula adds the largest hole and a fabrication allowance covering worst-case tolerances. That is why the IPC result is a larger pad; the two answer different questions.

## DFM checks before release

The CAD DRC checks the rules you entered; a DFM check goes further:

- **Copper:** acid traps (sharp angles between traces), thin copper or mask slivers, thermal reliefs with missing spokes, copper islands connected to nothing.
- **Pads and mask:** is there a mask dam between fine-pitch pads? Via-in-pad that is not filled and capped (IPC-4761) wicks solder into the hole.
- **Holes and edges:** at least 0.5 mm of laminate between holes (IPC-2221); components preferably at least 1.5 mm in from the board edge (IPC-2221), more on V-scored panels.
- **Copper balance:** balanced coverage on and between layers ([[lesson:stackup|stack-up lesson]]).
- **Silkscreen and test:** no text on pads, readable polarity marks; test points accessible.

Most fabricators run a free DFM check when you upload your files. Use it, but don’t make it your only safeguard.

## Put the IPC-6012 class on the drawing

State the acceptance criterion clearly on the fab drawing: "Fabricate per IPC-6012 Class 2; accept per IPC-A-600 Class 2." The class also defines which defects are acceptable: in Class 2–3, isolated defects may reduce conductor width by up to **20 %**, so a trace calculated exactly at its current limit has no margin left. If you don’t specify the dielectric between layers, the IPC-6012 minimum applies (90 µm in rev B–E, 65 µm in rev F); if you rely on a particular thickness for impedance or isolation, put it on the drawing.

[[calc:ipcref?c=2|Open the Class 2 IPC rules]]

## Panels, fiducials and tooling holes

- **Panelisation:** small boards go through assembly as a panel (array), joined by perforated breakaway tabs (mouse bites) or V-score lines, with rails along the edges for the conveyor. Ask your assembler for panel size and rail width; even if the fabricator builds the panel, you should approve it.
- **V-scoring** needs straight lines running right across the panel and requires copper to be kept further from the edge.
- **Fiducials:** bare copper dots with a mask-free area around them, used by the pick-and-place camera for alignment. Use asymmetrically placed global fiducials and local fiducials next to fine-pitch parts; choose the size to your assembler’s preference.
- **Tooling holes:** non-plated holes the assembler and test fixtures use for registration; ask them for diameter and position.

## Fabrication outputs

| File | Content |
|---|---|
| Gerber (RS-274X / X2) | A separate file for each copper layer, solder mask, silkscreen, paste and the outline |
| Drill file (Excellon or Gerber) | Positions and sizes; plated and non-plated separately |
| IPC-D-356 netlist | Lets the fabricator’s electrical test compare against your design |
| Fab drawing and stack-up | Class, material, thickness, finish, drill table, impedance, test requirement |
| ODB++ / IPC-2581 | Intelligent formats carrying layers, drills, netlist and stack-up in one file |
| Assembly package | BOM, pick-and-place file, assembly drawing |

Before sending, open the files in an independent Gerber viewer: layer order, polarity, a closed outline. Make sure the files don’t contradict the drawing.

## Example: a via under the microscope

A 1.6 mm board, finished hole 0.3 mm ±0.075 mm, via drill allowance 0.05 mm, Level B.

- The drill is about **0.35 mm** and the aspect ratio **4.6 : 1**, inside both the 5:1 that IPC-2221 prefers and the typical 8–10:1 limit.
- The IPC-2221 worst-case calculation asks for at least a **0.725 mm** pad on external and internal layers.
- **0.6 mm pad:** the nominal ring is 0.150 mm, but in the worst case it is **−0.013 mm** outside and **−0.038 mm** inside; the hole can break out of the pad and every check fails.

[[calc:padstack?lv=B&da=0.05&pad=0.6|Check the 0.6 mm pad]]

- **0.75 mm pad:** the worst case is **0.063 mm** outside and **0.038 mm** inside; every check passes, including Class 3.

[[calc:padstack?lv=B&da=0.05&pad=0.75|Check the 0.75 mm pad]]

Still, 0.3/0.6 mm vias are built every day by many fabricators, because their real registration is better than the Level B allowance. If you go below the IPC-2221 result, make sure the fabricator’s capability sheet covers it, and remember that Class 3 allows no breakout at all. Where breakout is allowed, use teardrops.

Check spacing too: if the board has a 48 V rail, IPC-2221 needs **0.6 mm** on an outer layer; the fabricator’s 0.1–0.15 mm minimum space is not what limits you here. The electrical requirement comes before the manufacturing capability.

[[calc:spacing?V=48&cat=B2|Open the 48 V spacing]]

## Common mistakes

- Designing to advanced capability everywhere.
- Mixing up finished hole and drill size; not separating plated and non-plated holes.
- Leaving the class, material and thickness off the drawing.
- Using unfilled via-in-pad.
- Leaving copper too close to the edge on a V-scored panel.
- Sending files without checking them in a viewer.

> [!QUIZ] The fabricator’s sheet says minimum drill 0.2 mm and maximum aspect ratio 8:1. Can you use 0.2 mm vias in a 2.0 mm thick board?
> No. 2.0 / 0.2 = 10:1, above the limit. Use at least a 0.25 mm drill (2.0 / 0.25 = 8:1), a thinner board, or blind vias.

> [!QUIZ] Why does the IPC-2221 calculation give a larger pad than the fabricator’s sheet?
> The fabricator usually quotes the ring against the nominal drilled hole. IPC-2221 adds the largest finished hole and a fabrication allowance covering position and etch tolerances, so that a ring remains even in the worst case.

> [!QUIZ] Why can a trace calculated exactly at its current limit be risky on a Class 2 board?
> IPC-6012 Class 2–3 allows isolated defects to reduce conductor width by up to 20 %. At that spot the cross-section shrinks and the trace runs hotter than calculated; leave margin on width.

## Pre-release checklist

- DRC is clean with fabricator-based rules and ERC is clean; any waivers are documented.
- Footprints are checked against the datasheets (pin 1, polarity, 3D model).
- The stack-up is approved by the fabricator; the impedance table is on the drawing.
- The fab drawing is complete: class, material, thickness, finish, colours, drill table, impedance, via treatment, test.
- Gerber, drill and netlist files have been reviewed in a viewer.
- Panel, fiducials and tooling holes are agreed with the assembler.
- BOM and pick-and-place file match the board revision; do-not-fit parts are marked.
`,
  },
};
