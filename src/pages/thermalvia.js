import { thermalVia, laminarPlateH, K_FR4_THROUGH, K_SOLDER_SAC305 } from '../engine/thermalvia.js';
import { K_THERMAL } from '../engine/copper.js';
import { toMm, fromMm, thicknessToMil } from '../engine/units.js';
import { heroes, rows, block, steps, messages, invalid } from '../ui/calculator.js';
import { tx } from '../ui/math.js';
import { fmt, fixed, esc, unitLabel } from '../ui/format.js';
import { t, locale } from '../i18n.js';
import { isImperial } from '../prefs.js';
import { svg, rect, path, text, arrow, node, twoTerm } from '../ui/svg.js';

const strings = {
  tr: {
    tv_secPart: 'Parça ve sınırlar',
    tv_secVia: 'Ped ve via dizisi',
    tv_secCu: 'Bakır alanı ve hava',
    tv_P: 'Güç kaybı (P)',
    tv_thetaJC: 'θJC (bağlantı–ped)',
    tv_thetaJCInfo: 'Veri sayfasındaki bağlantı–kılıf ısıl direnci. Açık pedli parçalarda pede doğru olan değeri kullanın (çoğu veri sayfasında θJC(bot) ya da θJC(bottom)); kılıfın üstüne doğru olan değer burada işe yaramaz. θJA da uygun değildir: JEDEC test kartını zaten içerir (JEDEC JESD51).',
    tv_tjMax: 'İzin verilen en yüksek Tj',
    tv_tjMaxInfo: 'Mutlak maksimum değil, güvenilirlik için tasarım sınırı kullanın (ör. 150 °C sınırlı bir parça için 125 °C).',
    tv_padW: 'Açık ped genişliği (W)',
    tv_padL: 'Açık ped uzunluğu (L)',
    tv_padInfo: 'Parçanın lehimlenen açık pedi (termal ped, tab). Karttaki bakır pedin de bu boyutta olduğu ve viaları taşıdığı varsayılır.',
    tv_board: 'Kart kalınlığı (h)',
    tv_boardInfo: 'Vialar pedden karşı yüzdeki bakıra kadar iner; via uzunluğu kart kalınlığına eşittir. Isıyı bir iç katmandaki düzlem alıyorsa o düzlemin derinliğini girin.',
    tv_count: 'Via sayısı (N)',
    tv_drill: 'Bitmiş delik çapı (d)',
    tv_plating: 'Kaplama kalınlığı (tp)',
    tv_platingInfo: 'Delik duvarındaki bakır. IPC-6012 ortalama: Sınıf 1–2 için 20 µm, Sınıf 3 için 25 µm.',
    tv_pitch: 'Via adımı (merkezden merkeze)',
    tv_pitchInfo: 'Yalnızca pede kaç via sığdığını saymak için kullanılır: bu adımla satır ve sütunlar, en dıştaki delikler tümüyle pedin üzerinde kalacak şekilde dizilir (hizalama toleransı için pay bırakılmaz). Isıl sonuç yukarıda girilen via sayısıyla hesaplanır.',
    tv_fill: 'Via dolgusu',
    tv_fillNone: 'Açık (dolgusuz)',
    tv_fillYes: 'Dolu',
    tv_fillInfo: 'Açık via ısıyı yalnızca bakır gövdesiyle iletir. Dolu viada dolgu çekirdeği gövdeye paralel eklenir: lehimle dolan, bakırla kapatılan ya da macunla doldurulan via. Hesap, deliğin tüm boyunca boşluksuz dolduğunu varsayar; yeniden akıtmada (reflow) kendiliğinden dolan lehim kısmidir ve denetlenemez. Peddeki açık vialar lehimi bağlantıdan çeker: karşı yüzden maskeyle kapatın, doldurup kapattırın ya da delikleri küçük tutun.',
    tv_kFill: 'Dolgunun ısıl iletkenliği (kf)',
    tv_kFillInfo: 'Tipik değerler: kurşunsuz SAC305 lehim yaklaşık 58 W/m·K, Sn63Pb37 yaklaşık 50 W/m·K, kaplama bakır 380 W/m·K (gövde için kullanılan değer). Dolgu macunlarında macunun veri sayfasındaki değeri girin; iletken olmayan epoksinin katkısı yok denecek kadar azdır.',
    tv_kBoard: 'Laminatın ısıl iletkenliği, kalınlık yönünde (kFR4)',
    tv_kBoardInfo: 'Ped altındaki laminat da vialara paralel olarak ısı iletir. Standart FR-4 kalınlık yönünde 0,3 W/m·K dolayındadır (reçine ve cam oranına göre kabaca 0,25–0,4); elinizde varsa laminat veri sayfasındaki değeri kullanın.',
    tv_area: 'Bakır alanı (ACu)',
    tv_areaInfo: 'Viaların karşı yüzde beslediği bakırın (ya da ısıyı yayan düzlemin) alanı; pedin altındaki kısım dahildir. Hesapta ped çevresinde aynı alanlı bir disk olarak ele alınır; uzun ve dar bir şekil ya da bakırın kenarına yakın bir ped bundan daha az soğutur.',
    tv_cuT: 'Bakır kalınlığı (tCu)',
    tv_cuTInfo: 'Bu bakırın kalınlığı. Vialar yaklaşık bu büyüklükte birkaç düzlemi birbirine bağlıyorsa kalınlıkların toplamını girin: ısıyı yan yana yayarlar.',
    tv_sides: 'Soğuyan yüz sayısı (n)',
    tv_side1: 'Tek yüz',
    tv_side2: 'İki yüz',
    tv_sidesInfo: 'İki yüz: bu alanın üzerinde kartın hem üstüne hem altına hava ulaşır. Bakır ile diğer yüz arasındaki laminat ihmal edilir: durgun havada 1,6 mm FR-4, o yüzün film direncine yaklaşık %5 ekler. Tek yüz: diğer yüz kapalıysa ya da bir duvara yakınsa, veya temkinli sonuç istiyorsanız.',
    tv_hc: 'Isı transfer katsayısı (hc)',
    tv_hcInfo: 'Taşınım ve ışınım tek katsayıda toplanır. Durgun hava: kart için yaygın ve biraz temkinli değer yaklaşık 10 W/m²·K (doğal taşınım artı ışınım; boyuta, yöne ve sıcaklığa göre kabaca 5–15). Zorlamalı hava, 50 mm uzunluğunda bir yüzey boyunca, laminer düz levha bağıntısıyla ve yalnızca taşınım: 1 m/s’de yaklaşık 17, 3 m/s’de yaklaşık 30 W/m²·K.',
    tv_hcStill: '10 · durgun hava',
    tv_tj: 'Bağlantı sıcaklığı Tj',
    tv_thetaPA: 'θ ped → ortam',
    ok_tv_tjOk: 'Tj, sınırın ({max}) {margin} altında.',
    err_tv_tjHigh: 'Tj, sınırı ({max}) {over} aşıyor: gücü düşürün ya da zincirdeki en büyük ısıl direnci küçültün.',
    warn_tv_noFit: '{n} via bu adımla pede sığmıyor: en fazla {fit} ({nx} × {ny}). Via sayısını ya da adımı azaltın.',
    warn_tv_etaLow: 'Kanat verimi {eta}: bakırın uzak kısmı neredeyse ortam sıcaklığında, alanı büyütmek artık pek yardımcı olmaz. Düzlem bu boyut için fazla ince: bakırı kalınlaştırın, düzlem ekleyin ya da hava akışı sağlayın.',
    warn_tv_domCopper: 'Toplam ısıl direncin {share} kadarı bakır → hava adımında: via eklemek Tj’yi pek değiştirmez. Bakır alanını, kalınlığını ya da hava akışını artırın.',
    warn_tv_domVia: 'Toplam ısıl direncin {share} kadarı ped → karşı yüz adımında: via sayısını artırın, daha büyük ya da dolu via kullanın veya kartı inceltin.',
    warn_tv_domJc: 'Toplam ısıl direncin {share} kadarı θJC: sınırı kılıf belirliyor, kart tasarımının etkisi az.',
    warn_tv_platingThin: 'Kaplama 20 µm’nin altında; IPC-6012 Sınıf 2 için ortalama ≥ 20 µm, Sınıf 3 için ≥ 25 µm beklenir.',
    err_tv_positive: 'Güç, ölçüler ve malzeme değerleri sıfırdan büyük olmalı.',
    err_tv_pitch: 'Via adımı delinen delik çapından (d + 2 × kaplama) büyük olmalı.',
    err_tv_holes: 'Bu kadar vianın delikleri pedin tamamını kaplıyor.',
    err_tv_copperSmall: 'Bakır alanı ped alanından büyük olmalı (pedin altındaki kısım dahildir).',
    err_tv_tjMax: 'İzin verilen Tj ortam sıcaklığından yüksek olmalı.',
    tv_blkChain: 'Isıl direnç zinciri',
    tv_rJc: 'θJC · bağlantı → ped',
    tv_rPb: 'θPB · ped → karşı yüz bakırı',
    tv_rCa: 'θCA · bakır → hava',
    tv_rJa: 'θJA · toplam (bu kartta)',
    tv_ofTotal: 'toplamın {share} kadarı',
    tv_largest: 'en büyük',
    tv_margin: 'Sıcaklık payı',
    tv_pMax: 'İzin verilen en yüksek güç',
    tv_areaReq: 'Tj,max için gereken bakır alanı',
    tv_reqPad: 'ped boyutunda bakır yeterli',
    tv_reqLimit: 'yalnızca alanla ulaşılamaz: sınırsız düzlemde bile θCA = {x}, gereken {need}',
    tv_reqChain: 'ulaşılamaz: θJC + θPB bütçenin tamamını kullanıyor',
    tv_tPad: 'Ped sıcaklığı',
    tv_tCu: 'Karşı yüz bakırı (ped altı)',
    tv_blkVia: 'Via dizisi',
    tv_rVia: 'Tek via',
    tv_rVias: '{n} via paralel',
    tv_rLam: 'Ped altındaki laminat',
    tv_rNoVia: 'Via olmadan θPB',
    tv_rFit: 'Bu adımla pede sığan via',
    tv_rFull: 'Sığan {n} vianın hepsiyle θPB',
    tv_wick: 'Peddeki açık vialar yeniden akıtmada lehimi çeker ve bağlantıda boşluk bırakabilir: karşı yüzden maskeyle kapatın, doldurup kapattırın ya da delikleri küçük tutun; üreticinizin ve montajcınızın önerisine uyun.',
    tv_blkCu: 'Bakır alanı',
    tv_rRadii: 'Eşdeğer yarıçaplar (ped / bakır)',
    tv_rReach: 'Yayılma uzunluğu 1/m',
    tv_rEta: 'Kanat verimi η',
    tv_rEtaS: 'η, Schmidt yaklaşımıyla (karşılaştırma)',
    tv_rIso: 'Düzlem eş sıcaklıklı olsaydı θCA (η = 1)',
    tv_rInf: 'Sınırsız düzlemde θCA (alanla inilebilecek alt sınır)',
    tv_sPad: 'Ped alanı',
    tv_sBarrel: 'Via gövdesinin kesit alanı',
    tv_sFill: 'Dolgunun kesit alanı',
    tv_sVia: 'Tek vianın ısıl direnci',
    tv_sVias: 'Via dizisi (N via paralel)',
    tv_sPb: 'Ped → karşı yüz bakırı (vialar ∥ laminat)',
    tv_sPb0: 'Ped → karşı yüz bakırı (yalnızca laminat)',
    tv_sRb: 'Ped alanına eşdeğer yarıçap',
    tv_sRe: 'Bakır alanına eşdeğer yarıçap',
    tv_sM: 'Kanat parametresi',
    tv_sXb: 'Boyutsuz taban yarıçapı',
    tv_sXe: 'Boyutsuz dış yarıçap',
    tv_sEta: 'Bakır alanının kanat verimi',
    tv_besselNote: 'I₀, I₁, K₀, K₁: birinci ve ikinci tür değiştirilmiş Bessel fonksiyonları; sayılarla yazılan satırdaki değerler bunların x_b ve x_e’deki değerleridir. η = 1, bütün bakırın ped altındaki sıcaklıkta olması demektir.',
    tv_sCa: 'Bakır → hava',
    tv_sJa: 'Bağlantı → ortam',
    tv_sNeed: 'Tj,max için gereken θCA',
    tv_solved: 'η bakır alanına bağlı olduğundan denklem ACu için kapalı biçimde çözülemez; sayısal olarak çözülür. Bulunan alan ve o alandaki η yerine konunca gereken θCA geri elde edilir.',
    tv_kCu: 'Bakırın ısıl iletkenliği (380 W/m·K)',
    tv_note: 'Tek boyutlu ısıl direnç zinciriyle yapılan bir tahmindir: Tj = Ta + P·(θJC + θPB + θCA). Belirsizliğin büyük kısmı hc’den gelir; sonuçta onlarca yüzde sapma beklenmelidir. Varsayımlar: ısının tamamı açık pedden çıkar; ped ve altındaki bakır kendi içinde eş sıcaklıktadır; vialar ısıyı yalnızca gövde (ve varsa dolgu) boyunca iletir ve eşit paylaşır (kCu = 380 W/m·K); ped altındaki laminat vialara paraleldir. Bakır alanı, ped çevresinde aynı alanlı bir disk gibi ele alınır: sabit kalınlıklı, kenarı yalıtılmış halka kanat (Bessel fonksiyonlarıyla tam çözüm), bir ya da iki yüzünden tek bir hc ile soğur; ped altındaki bakır taban sıcaklığındadır ve bir kez sayılır. Hesaba katılmayanlar: kılıfın üstünden ve bacaklardan çıkan ısı, bakır alanının dışındaki kart ve ısıyı yayan iç düzlemler (bunlar yardımcı olur; tahmin bu yönden temkinlidir); komşu ısı kaynakları, lehimdeki boşluklar ve parça ile ped arasındaki temas (bunlar durumu kötüleştirir). Schmidt’in tanh yaklaşımı η ≥ 0,5 iken tam çözümden en çok %3 sapar, daha düşük verimde iyimser kalır; bu yüzden yalnızca karşılaştırma için gösterilir. Kritik tasarımları ölçüm ya da simülasyonla doğrulayın.',
    tv_dgAria: 'Kesit: üstte parça, açık ped, karttan geçen vialar ve karşı yüzdeki bakır; yanında bağlantıdan ortama üç ısıl direncin zinciri ve düğüm sıcaklıkları',
    tv_dgNoScale: 'ölçeksiz',
    tv_dgPad: 'ped',
    tv_dgCu: 'bakır',
  },
  en: {
    tv_secPart: 'Part and limits',
    tv_secVia: 'Pad and via array',
    tv_secCu: 'Copper area and air',
    tv_P: 'Power dissipation (P)',
    tv_thetaJC: 'θJC (junction–pad)',
    tv_thetaJCInfo: 'Junction-to-case thermal resistance from the datasheet. For a part with an exposed pad use the value towards the pad (θJC(bot) or θJC(bottom) in most datasheets); the value towards the top of the package is of no use here. θJA is not suitable either: it already contains the JEDEC test board (JEDEC JESD51).',
    tv_tjMax: 'Maximum allowed Tj',
    tv_tjMaxInfo: 'Use a reliability design limit, not the absolute maximum (e.g. 125 °C for a part rated 150 °C).',
    tv_padW: 'Exposed pad width (W)',
    tv_padL: 'Exposed pad length (L)',
    tv_padInfo: 'The solderable exposed pad of the part (thermal pad, tab). The copper land on the board is assumed to have the same size and to carry the vias.',
    tv_board: 'Board thickness (h)',
    tv_boardInfo: 'The vias run from the pad to the copper on the far side, so the via length equals the board thickness. If an inner plane takes the heat instead, enter the depth of that plane.',
    tv_count: 'Number of vias (N)',
    tv_drill: 'Finished hole diameter (d)',
    tv_plating: 'Plating thickness (tp)',
    tv_platingInfo: 'Copper on the hole wall. IPC-6012 average: 20 µm for Class 1–2, 25 µm for Class 3.',
    tv_pitch: 'Via pitch (centre to centre)',
    tv_pitchInfo: 'Used only to count how many vias fit on the pad: rows and columns at this pitch, with the outermost holes still completely on the pad (no allowance for registration tolerance). The thermal result uses the number of vias entered above.',
    tv_fill: 'Via fill',
    tv_fillNone: 'Open (not filled)',
    tv_fillYes: 'Filled',
    tv_fillInfo: 'An open via conducts through its copper barrel only. A filled via adds its core in parallel with the barrel: a via that fills with solder, is plated shut with copper or is plugged with paste. The calculation assumes a void-free fill over the whole length; solder that wicks in by itself during reflow fills only partly and cannot be controlled. Open vias in a pad draw solder away from the joint: tent them from the far side, have them filled and capped, or keep the holes small.',
    tv_kFill: 'Thermal conductivity of the fill (kf)',
    tv_kFillInfo: 'Typical values: lead-free SAC305 solder about 58 W/m·K, Sn63Pb37 about 50 W/m·K, plated copper 380 W/m·K (the value used for the barrel). For a plugging paste take the value from its datasheet; non-conductive epoxy adds next to nothing.',
    tv_kBoard: 'Thermal conductivity of the laminate, through-plane (kFR4)',
    tv_kBoardInfo: 'The laminate under the pad also conducts heat, in parallel with the vias. Standard FR-4 is around 0.3 W/m·K through its thickness (roughly 0.25–0.4 depending on resin and glass content); use the laminate datasheet when you have it.',
    tv_area: 'Copper area (ACu)',
    tv_areaInfo: 'Area of the copper the vias feed on the far side (or of the plane that spreads the heat), including the part under the pad. The calculation treats it as a disc of the same area around the pad; a long narrow shape, or a pad near the edge of the copper, cools less than this.',
    tv_cuT: 'Copper thickness (tCu)',
    tv_cuTInfo: 'Thickness of that copper. If the vias tie several planes of about this size together, enter the sum of their thicknesses: they spread the heat side by side.',
    tv_sides: 'Cooled faces (n)',
    tv_side1: 'One face',
    tv_side2: 'Both faces',
    tv_sidesInfo: 'Both faces: air reaches the top and the bottom of the board over this area. The laminate between the copper and the other face is neglected: in still air 1.6 mm of FR-4 adds about 5 % to the film resistance of that face. One face: when the other face is covered or close to a wall, or when you want the cautious figure.',
    tv_hc: 'Heat-transfer coefficient (hc)',
    tv_hcInfo: 'Convection and radiation lumped into one coefficient. Still air: about 10 W/m²·K is a common, slightly cautious figure for a board (natural convection plus radiation; roughly 5–15 depending on size, orientation and temperature). Forced air along a 50 mm long surface, laminar flat-plate relation, convection only: about 17 W/m²·K at 1 m/s and about 30 W/m²·K at 3 m/s.',
    tv_hcStill: '10 · still air',
    tv_tj: 'Junction temperature Tj',
    tv_thetaPA: 'θ pad → ambient',
    ok_tv_tjOk: 'Tj is {margin} below the limit ({max}).',
    err_tv_tjHigh: 'Tj exceeds the limit ({max}) by {over}: reduce the power or the largest thermal resistance in the chain.',
    warn_tv_noFit: '{n} vias do not fit on the pad at this pitch: at most {fit} ({nx} × {ny}). Reduce the count or the pitch.',
    warn_tv_etaLow: 'Fin efficiency is {eta}: the far part of the copper is close to the air temperature, so more area hardly helps any more. The plane is too thin for its size: use thicker copper, add planes or provide airflow.',
    warn_tv_domCopper: 'Copper → air is {share} of the total thermal resistance: more vias will hardly change Tj. Work on copper area, copper thickness or airflow.',
    warn_tv_domVia: 'Pad → far side is {share} of the total thermal resistance: add vias, use larger or filled vias, or a thinner board.',
    warn_tv_domJc: 'θJC is {share} of the total thermal resistance: the package sets the limit and the board has little influence.',
    warn_tv_platingThin: 'Plating below 20 µm; IPC-6012 expects an average of ≥ 20 µm for Class 2 and ≥ 25 µm for Class 3.',
    err_tv_positive: 'Power, dimensions and material values must be greater than zero.',
    err_tv_pitch: 'Via pitch must be larger than the drilled hole (d + 2 × plating).',
    err_tv_holes: 'The holes of this many vias take up the whole pad.',
    err_tv_copperSmall: 'The copper area must be larger than the pad (it includes the part under the pad).',
    err_tv_tjMax: 'The allowed Tj must be above the ambient temperature.',
    tv_blkChain: 'Thermal resistance chain',
    tv_rJc: 'θJC · junction → pad',
    tv_rPb: 'θPB · pad → far-side copper',
    tv_rCa: 'θCA · copper → air',
    tv_rJa: 'θJA · total (on this board)',
    tv_ofTotal: '{share} of the total',
    tv_largest: 'largest',
    tv_margin: 'Temperature margin',
    tv_pMax: 'Largest allowed power',
    tv_areaReq: 'Copper area needed for Tj,max',
    tv_reqPad: 'copper the size of the pad is enough',
    tv_reqLimit: 'not reachable with area alone: even an unbounded plane gives θCA = {x}, needed {need}',
    tv_reqChain: 'not reachable: θJC + θPB already use the whole budget',
    tv_tPad: 'Pad temperature',
    tv_tCu: 'Far-side copper (under the pad)',
    tv_blkVia: 'Via array',
    tv_rVia: 'One via',
    tv_rVias: '{n} vias in parallel',
    tv_rLam: 'Laminate under the pad',
    tv_rNoVia: 'θPB without vias',
    tv_rFit: 'Vias that fit on the pad at this pitch',
    tv_rFull: 'θPB with all {n} that fit',
    tv_wick: 'Open vias in the pad draw solder away during reflow and can leave voids in the joint: tent them from the far side, have them filled and capped, or keep the holes small; follow the advice of your fabricator and assembler.',
    tv_blkCu: 'Copper area',
    tv_rRadii: 'Equivalent radii (pad / copper)',
    tv_rReach: 'Spreading length 1/m',
    tv_rEta: 'Fin efficiency η',
    tv_rEtaS: 'η by Schmidt’s approximation (for comparison)',
    tv_rIso: 'θCA if the plane were isothermal (η = 1)',
    tv_rInf: 'θCA of an unbounded plane (the floor area alone can reach)',
    tv_sPad: 'Pad area',
    tv_sBarrel: 'Barrel cross-section of one via',
    tv_sFill: 'Cross-section of the fill',
    tv_sVia: 'Thermal resistance of one via',
    tv_sVias: 'Via array (N vias in parallel)',
    tv_sPb: 'Pad → far-side copper (vias ∥ laminate)',
    tv_sPb0: 'Pad → far-side copper (laminate only)',
    tv_sRb: 'Radius of a circle with the pad area',
    tv_sRe: 'Radius of a circle with the copper area',
    tv_sM: 'Fin parameter',
    tv_sXb: 'Dimensionless base radius',
    tv_sXe: 'Dimensionless outer radius',
    tv_sEta: 'Fin efficiency of the copper area',
    tv_besselNote: 'I₀, I₁, K₀, K₁ are the modified Bessel functions of the first and second kind; the numbers in the line with values are theirs at x_b and x_e. η = 1 would mean the whole copper is as warm as under the pad.',
    tv_sCa: 'Copper → air',
    tv_sJa: 'Junction → ambient',
    tv_sNeed: 'θCA needed for Tj,max',
    tv_solved: 'η depends on the copper area, so the equation cannot be solved for ACu in closed form; it is solved numerically. Putting the area found, and η at that area, back in returns the θCA needed.',
    tv_kCu: 'Thermal conductivity of copper (380 W/m·K)',
    tv_note: 'An estimate with a one-dimensional chain of thermal resistances: Tj = Ta + P·(θJC + θPB + θCA). Most of the uncertainty comes from hc; expect the result to be off by tens of percent. Assumptions: all heat leaves through the exposed pad; the pad and the copper under it are each at one temperature; the vias conduct along the barrel (and the fill, if any) only and share the heat equally (kCu = 380 W/m·K); the laminate under the pad is in parallel with the vias. The copper area is treated as a disc of the same area around the pad: an annular fin of uniform thickness with an insulated edge (exact solution with Bessel functions), cooled on one or both faces with a single hc; the copper under the pad is at the base temperature and counts once. Left out: heat leaving through the top of the package and the leads, the board outside the copper area and inner planes that spread heat (these help, so on that side the estimate is cautious); neighbouring heat sources, solder voids and the contact between part and pad (these make it worse). Schmidt’s tanh approximation stays within 3 % of the exact solution while η ≥ 0.5 and is optimistic below, so it is shown for comparison only. Verify critical designs by measurement or simulation.',
    tv_dgAria: 'Cross-section: the part on top, the exposed pad, the vias through the board and the copper on the far side; beside it the chain of three thermal resistances from junction to ambient with the node temperatures',
    tv_dgNoScale: 'not to scale',
    tv_dgPad: 'pad',
    tv_dgCu: 'copper',
  },
};

const LEN = ['mm', 'mil'];
// Unit ids are ASCII (they travel in the URL); format.js holds their labels.
const AREA_MM2 = { cm2: 100, mm2: 1, in2: 645.16 };

const lenTxt = (mm) => (isImperial() ? `${fmt(fromMm(mm, 'mil'), 3)} mil` : `${fmt(mm, 3)} mm`);
const thickTxt = (um) => (isImperial() ? `${fmt(um / 25.4, 3)} mil` : `${fmt(um, 3)} µm`);
const areaTxt = (mm2, unit) => `${fmt(mm2 / (AREA_MM2[unit] ?? 100), 3)} ${unitLabel(AREA_MM2[unit] ? unit : 'cm2')}`;
const kwTxt = (x, sig = 3) => `${fmt(x, sig)} °C/W`;
const degTxt = (x) => `${fixed(x, 1)} °C`;
const pctTxt = (x) => new Intl.NumberFormat(locale(), { style: 'percent', maximumFractionDigits: 0 }).format(x);

/**
 * Cross-section (not to scale): the part on its exposed pad, the vias through
 * the board and the copper on the far side, with the heat path. Beside it the
 * three thermal resistances as a chain; its nodes sit at the height of the
 * junction link, the pad and the far-side copper. The number of vias drawn
 * follows the input, up to seven.
 */
function diagram(v, u, r) {
  const n = Number.isInteger(v.n) && v.n >= 0 ? v.n : 9;
  const nDraw = Math.min(n, 7);
  const filled = v.fill === 'filled';
  const both = v.sides !== '1';
  const BL = 14; const BR = 234; const cx = 124;
  const yPad = 96; const yTop = 100; const yBot = 156; const yCu = 160;
  const flow = { cls: 'flow', headCls: 'arrow flow' };

  // Board, far-side copper, the pad and the perimeter lands of the part.
  let b = rect(BL, yTop, BR - BL, yBot - yTop, 'diel')
    + rect(BL, yBot, BR - BL, yCu - yBot, 'cu')
    + rect(cx - 48, yPad, 96, yTop - yPad, 'cu')
    + rect(cx - 62, yPad, 8, yTop - yPad, 'cu') + rect(cx + 54, yPad, 8, yTop - yPad, 'cu');

  // Vias (hole, barrel walls) with the heat going down each of them; without
  // vias the heat crosses the laminate.
  const pitch = nDraw > 1 ? Math.min(24, 84 / (nDraw - 1)) : 0;
  for (let i = 0; i < nDraw; i++) {
    const c = cx + (i - (nDraw - 1) / 2) * pitch;
    b += rect(c - 3, yPad, 6, yCu - yPad, filled ? 'cu plane' : 'air')
      + rect(c - 5, yPad, 2, yCu - yPad, 'cu') + rect(c + 3, yPad, 2, yCu - yPad, 'cu')
      + arrow(c, yTop + 4, c, yBot - 5, flow);
  }
  if (!nDraw) b += arrow(cx, yTop + 4, cx, yBot - 5, { cls: 'flow dash', headCls: 'arrow flow' });

  // The part with its die.
  b += rect(cx - 62, 58, 124, yPad - 58, 'comp', ' rx="3"')
    + rect(cx - 16, 76, 32, 9, 'soft') + node(cx, 80.5);

  // Heat spreads sideways in the copper and leaves to the air from one or both faces.
  b += arrow(cx - 52, yBot - 6, BL + 6, yBot - 6, flow) + arrow(cx + 52, yBot - 6, BR - 6, yBot - 6, flow);
  for (const x of [36, 80, 124, 168, 212]) b += arrow(x, yCu + 4, x, yCu + 20, flow);
  if (both) for (const x of [26, 44, 204, 222]) b += arrow(x, yTop - 6, x, yTop - 20, flow);

  // Chain: junction, pad, far-side copper, ambient.
  const X = 290;
  const ys = [44, 98, 158, 218];
  const keys = ['jc', 'pb', 'ca'];
  const theta = r ? [r.thetaJcKW, r.thetaPbKW, r.thetaCaKW] : [];
  ['θJC', 'θPB', 'θCA'].forEach((name, i) => {
    b += twoTerm('R', X, ys[i], X, ys[i + 1], {
      name,
      value: r ? `${kwTxt(theta[i])} · ${pctTxt(r.share[keys[i]])}` : undefined,
      hi: !!r && r.dominant === keys[i],
    });
  });
  const temps = r ? [r.tjC, r.tPadC, r.tCopperC, r.ambientC] : [];
  const names = ['Tj', t('tv_dgPad'), t('tv_dgCu'), 'Ta'];
  ys.forEach((y, i) => {
    const over = i === 0 && r && r.marginC < 0;
    b += node(X, y) + text(X + 10, y + 4, r ? `${names[i]} ${degTxt(temps[i])}` : names[i], { cls: over ? 'badt' : r ? 'val' : 'name', anchor: 'start' });
  });
  // Links from the drawing to the nodes of the chain.
  b += path(`M${cx},76V${ys[0]}H${X - 6}`, 'ext')
    + path(`M${cx + 66},${ys[1]}H${X - 6}`, 'ext')
    + path(`M${BR + 4},${ys[2]}H${X - 6}`, 'ext');

  // Inputs and the fin efficiency.
  b += text(BL, 50, r ? `P = ${fmt(r.powerW, 3)} W` : 'P', { cls: r ? 'val' : 'sym', anchor: 'start' });
  const lines = r ? [
    `N = ${r.count} · d = ${lenTxt(r.drillMm)} · h = ${lenTxt(r.boardMm)}`,
    `A = ${areaTxt(r.copperAreaMm2, u.A)} · t = ${thickTxt(r.copperUm)}`,
    `hc = ${fmt(r.hWm2K, 3)} W/m²·K · η = ${fixed(r.fin.eta, 2)}`,
  ] : ['N · d · h', 'A · t', 'hc · η'];
  lines.forEach((s, i) => { b += text(BL, 198 + 14 * i, s, { cls: r ? 'val' : 'sym', anchor: 'start' }); });
  b += text(436, 14, t('tv_dgNoScale'), { cls: 'title', anchor: 'end' });
  return svg(440, 236, b, t('tv_dgAria'), { wide: true });
}

// Symbols of the laminate: the subscript is upright text, so it also reads well in the copied summary.
const TH_LAM = 'θ_{\\text{FR4}}';
const K_LAM = 'k_{\\text{FR4}}';

/** Calculation steps: one quantity per step, in the order the engine computes them. */
function worked(r, u) {
  const q = (x, unit, sig = 4) => tx(`${fmt(x, sig)} ${unit}`);
  const val = (x, sig = 4) => tx(fmt(x, sig));
  const K = (x) => q(x, '°C/W');
  const C = (x) => tx(degTxt(x));
  const W = (x) => q(x, 'W');
  const mm2 = (x) => q(x, 'mm²');
  const f = r.fin;
  const via = r.via;
  const N = r.count;
  const h = q(r.boardMm, 'mm');
  const kCu = q(K_THERMAL, 'W/m·K');
  const kB = q(r.kBoardWmK, 'W/m·K');
  const aPad = mm2(r.padAreaMm2);
  const aCu = mm2(r.copperAreaMm2);
  const hc = q(r.hWm2K, 'W/m²·K');
  const ro = q(via.roMm, 'mm');
  const ri = q(via.riMm, 'mm');
  // The efficiency formula subtracts nearly equal numbers when the copper is
  // barely larger than the pad; more digits are shown then, so that the
  // numbers in the step still give the result.
  const sig = Math.min(12, 5 + Math.max(0, Math.ceil(-Math.log10(f.xe / f.xb - 1))));
  const xb = val(f.xb, sig);
  const xe = val(f.xe, sig);
  const B = f.bessel;
  const bes = (x) => val(x, sig);
  const caSym = (lhs) => `${lhs} = \\frac{1}{h_c \\cdot (A_{pad} + n \\cdot η \\cdot (A_{Cu} − A_{pad}))}`;
  const caNum = (area, eta) => `\\frac{1}{${hc} \\cdot (${aPad} + ${r.sides} \\cdot ${val(eta)} \\cdot (${mm2(area)} − ${aPad}))}`;
  // The efficiency step needs the unscaled Bessel values; they leave the
  // number range only for a plane hundreds of spreading lengths wide.
  const besselOk = Object.values(B).every((x) => Number.isFinite(x) && x > 0);

  return steps([
    { label: 'tv_sPad', sym: 'A_{pad} = W \\cdot L', num: `${q(r.padWMm, 'mm')} \\cdot ${q(r.padLMm, 'mm')}`, res: aPad },
    N > 0 && { label: 'tv_sBarrel', sym: 'A_b = π \\cdot (r_o^{2} − r_i^{2})', num: `π \\cdot ({(${ro})}^{2} − {(${ri})}^{2})`, res: mm2(via.barrelAreaMm2) },
    N > 0 && r.filled && { label: 'tv_sFill', sym: 'A_f = π \\cdot r_i^{2}', num: `π \\cdot {(${ri})}^{2}`, res: mm2(via.fillAreaMm2) },
    N > 0 && (r.filled
      ? { label: 'tv_sVia', sym: 'θ_{via} = \\frac{h}{k_{Cu} \\cdot A_b + k_f \\cdot A_f}',
        num: `\\frac{${h}}{${kCu} \\cdot ${mm2(via.barrelAreaMm2)} + ${q(r.kFillWmK, 'W/m·K')} \\cdot ${mm2(via.fillAreaMm2)}}`, res: K(via.thetaKW) }
      : { label: 'tv_sVia', sym: 'θ_{via} = \\frac{h}{k_{Cu} \\cdot A_b}', num: `\\frac{${h}}{${kCu} \\cdot ${mm2(via.barrelAreaMm2)}}`, res: K(via.thetaKW) }),
    N > 0 && { label: 'tv_sVias', sym: 'θ_{vias} = \\frac{θ_{via}}{N}', num: `\\frac{${K(via.thetaKW)}}{${N}}`, res: K(r.thetaViasKW) },
    N > 0
      ? { label: 'tv_rLam', sym: `${TH_LAM} = \\frac{h}{${K_LAM} \\cdot (A_{pad} − N \\cdot π \\cdot r_o^{2})}`,
        num: `\\frac{${h}}{${kB} \\cdot (${aPad} − ${N} \\cdot π \\cdot {(${ro})}^{2})}`, res: K(r.thetaLaminateKW) }
      : { label: 'tv_sPb0', sym: `θ_{PB} = \\frac{h}{${K_LAM} \\cdot A_{pad}}`, num: `\\frac{${h}}{${kB} \\cdot ${aPad}}`, res: K(r.thetaPbKW) },
    N > 0 && { label: 'tv_sPb', sym: `θ_{PB} = \\frac{θ_{vias} \\cdot ${TH_LAM}}{θ_{vias} + ${TH_LAM}}`,
      num: `\\frac{${K(r.thetaViasKW)} \\cdot ${K(r.thetaLaminateKW)}}{${K(r.thetaViasKW)} + ${K(r.thetaLaminateKW)}}`, res: K(r.thetaPbKW) },
    { label: 'tv_sRb', sym: 'r_b = \\sqrt{\\frac{A_{pad}}{π}}', num: `\\sqrt{\\frac{${aPad}}{π}}`, res: q(f.rbMm, 'mm') },
    { label: 'tv_sRe', sym: 'r_e = \\sqrt{\\frac{A_{Cu}}{π}}', num: `\\sqrt{\\frac{${aCu}}{π}}`, res: q(f.reMm, 'mm') },
    { label: 'tv_sM', sym: 'm = \\sqrt{\\frac{n \\cdot h_c}{k_{Cu} \\cdot t_{Cu}}}',
      num: `\\sqrt{\\frac{${r.sides} \\cdot ${hc}}{${kCu} \\cdot ${q(r.copperUm, 'µm')}}}`, res: q(f.mPerM, '1/m') },
    { label: 'tv_sXb', sym: 'x_b = m \\cdot r_b', num: `${q(f.mPerM, '1/m')} \\cdot ${q(f.rbMm, 'mm')}`, res: xb },
    { label: 'tv_sXe', sym: 'x_e = m \\cdot r_e', num: `${q(f.mPerM, '1/m')} \\cdot ${q(f.reMm, 'mm')}`, res: xe },
    { label: 'tv_sEta', note: 'tv_besselNote',
      sym: 'η = \\frac{2 \\cdot x_b}{x_e^{2} − x_b^{2}} \\cdot \\frac{K_1(x_b) \\cdot I_1(x_e) − I_1(x_b) \\cdot K_1(x_e)}{I_0(x_b) \\cdot K_1(x_e) + K_0(x_b) \\cdot I_1(x_e)}',
      num: besselOk ? `\\frac{2 \\cdot ${xb}}{${xe}^{2} − ${xb}^{2}} \\cdot \\frac{${bes(B.k1b)} \\cdot ${bes(B.i1e)} − ${bes(B.i1b)} \\cdot ${bes(B.k1e)}}{${bes(B.i0b)} \\cdot ${bes(B.k1e)} + ${bes(B.k0b)} \\cdot ${bes(B.i1e)}}` : undefined,
      res: val(f.eta) },
    { label: 'tv_sCa', sym: caSym('θ_{CA}'), num: caNum(r.copperAreaMm2, f.eta), res: K(r.thetaCaKW) },
    { label: 'tv_sJa', sym: 'θ_{JA} = θ_{JC} + θ_{PB} + θ_{CA}', num: `${K(r.thetaJcKW)} + ${K(r.thetaPbKW)} + ${K(r.thetaCaKW)}`, res: K(r.thetaJaKW) },
    { label: 'tv_tj', sym: 'T_j = T_a + P \\cdot θ_{JA}', num: `${C(r.ambientC)} + ${W(r.powerW)} \\cdot ${K(r.thetaJaKW)}`, res: C(r.tjC) },
    { label: 'tv_pMax', sym: 'P_{max} = \\frac{T_{j,max} − T_a}{θ_{JA}}', num: `\\frac{${C(r.tjMaxC)} − ${C(r.ambientC)}}{${K(r.thetaJaKW)}}`, res: W(r.maxPowerW) },
    { label: 'tv_sNeed', sym: 'θ_{CA,req} = \\frac{T_{j,max} − T_a}{P} − θ_{JC} − θ_{PB}',
      num: `\\frac{${C(r.tjMaxC)} − ${C(r.ambientC)}}{${W(r.powerW)}} − ${K(r.thetaJcKW)} − ${K(r.thetaPbKW)}`, res: K(r.need.thetaCaKW) },
    r.need.status === 'ok' && { labelRaw: `${t('tv_areaReq')}: ${areaTxt(r.need.areaMm2, u.A)}`, note: 'tv_solved',
      sym: caSym('θ_{CA,req}'), num: caNum(r.need.areaMm2, r.need.eta), res: K(r.need.thetaCaKW) },
  ], {
    note: 'tv_note',
    where: [
      ['W', 'tv_padW', 'pw'], ['L', 'tv_padL', 'pl'], ['h', 'tv_board', 'h'],
      N > 0 && ['N', 'tv_count', 'n'], N > 0 && ['r_i = \\frac{d}{2}', 'tv_drill', 'd'], N > 0 && ['r_o = r_i + t_p', 'tv_plating', 'tp'],
      ['k_{Cu}', 'tv_kCu'], N > 0 && r.filled && ['k_f', 'tv_kFill', 'kf'], [K_LAM, 'tv_kBoard', 'kb'],
      ['A_{Cu}', 'tv_area', 'A'], ['t_{Cu}', 'tv_cuT', 't'], ['n', 'tv_sides', 'sides'], ['h_c', 'tv_hc', 'hc'],
      ['θ_{JC}', 'tv_thetaJC', 'jc'], ['P', 'tv_P', 'P'], ['T_a', 'ambientTemp', 'ta'], ['T_{j,max}', 'tv_tjMax', 'tj'],
    ],
    refs: [
      'T. L. Bergman, A. S. Lavine, F. P. Incropera, D. P. DeWitt, Fundamentals of Heat and Mass Transfer (one-dimensional conduction; extended surfaces: annular fin; flat plate in parallel flow)',
      'ASHRAE Handbook — Fundamentals, heat transfer chapter (Schmidt’s fin-efficiency approximation)',
      'M. Abramowitz, I. A. Stegun, Handbook of Mathematical Functions, ch. 9 (modified Bessel functions)',
      'JEDEC JESD51 (θJC)',
      'IPC-6012 (barrel plating thickness)',
    ],
  });
}

// Forced-air presets: laminar flat plate, 50 mm long, convection only (see the engine).
const hcForced = (v) => Math.round(laminarPlateH(v, 0.05));

export default {
  id: 'thermalvia',
  strings,
  // Parameter plot (ui/sweep.js): results that can be drawn against one input.
  plot: {
    x: ['n', 'A', 'P', 'd', 'tp', 'h', 'pw', 'pl', 't', 'hc', 'kb', 'kf', 'jc', 'ta'],
    y: [
      { key: 'tj', label: 'tv_tj', unit: '°C', get: (r) => r.tjC },
      { key: 'rja', label: 'tv_rJa', unit: '°C/W', get: (r) => r.thetaJaKW },
      { key: 'rpb', label: 'tv_rPb', unit: '°C/W', get: (r) => r.thetaPbKW },
      { key: 'pmax', label: 'tv_pMax', unit: 'W', get: (r) => r.maxPowerW },
    ],
  },
  sections: [
    {
      title: 'tv_secPart',
      fields: [
        { key: 'P', type: 'number', label: 'tv_P', default: 1, units: ['W'] },
        { key: 'jc', type: 'number', label: 'tv_thetaJC', default: 3, units: ['KW'], valid: 'nonneg', info: 'tv_thetaJCInfo' },
        { key: 'ta', type: 'number', label: 'ambientTemp', default: 40, units: ['C'], valid: 'any',
          presets: [25, 40, 55, 70, 85].map((x) => ({ label: `${x} °C`, value: x })) },
        { key: 'tj', type: 'number', label: 'tv_tjMax', default: 125, units: ['C'], valid: 'any', info: 'tv_tjMaxInfo',
          presets: [105, 125, 150].map((x) => ({ label: `${x} °C`, value: x })) },
      ],
    },
    {
      title: 'tv_secVia',
      fields: [
        { key: 'pw', type: 'number', label: 'tv_padW', default: 5, units: LEN, pref: 'length', info: 'tv_padInfo' },
        { key: 'pl', type: 'number', label: 'tv_padL', default: 5, units: LEN, pref: 'length' },
        { key: 'h', type: 'number', label: 'tv_board', default: 1.6, units: LEN, info: 'tv_boardInfo',
          presets: [0.8, 1.0, 1.6, 2.0, 2.4].map((x) => ({ label: `${x} mm`, value: x, unit: 'mm' })) },
        { key: 'n', type: 'number', label: 'tv_count', default: 9, valid: 'nonneg', integer: true },
        { key: 'd', type: 'number', label: 'tv_drill', default: 0.3, units: LEN, pref: 'length',
          presets: [0.2, 0.25, 0.3, 0.4, 0.5].map((x) => ({ label: `${x} mm`, value: x, unit: 'mm' })) },
        { key: 'tp', type: 'number', label: 'tv_plating', default: 25, units: ['um', 'mil'], info: 'tv_platingInfo',
          presets: [{ label: '20 µm', value: 20, unit: 'um' }, { label: '25 µm', value: 25, unit: 'um' }] },
        { key: 'pitch', type: 'number', label: 'tv_pitch', default: 1.2, units: LEN, pref: 'length', info: 'tv_pitchInfo',
          presets: [0.8, 1.0, 1.2, 1.5].map((x) => ({ label: `${x} mm`, value: x, unit: 'mm' })) },
        { key: 'fill', type: 'choice', label: 'tv_fill', default: 'none', info: 'tv_fillInfo',
          options: [{ value: 'none', label: 'tv_fillNone' }, { value: 'filled', label: 'tv_fillYes' }] },
        { key: 'kf', type: 'number', label: 'tv_kFill', default: K_SOLDER_SAC305, units: ['WmK'], info: 'tv_kFillInfo', show: (v) => v.fill === 'filled',
          presets: [{ label: 'SAC305 · 58', value: 58 }, { label: 'Sn63Pb37 · 50', value: 50 }, { label: 'Cu · 380', value: K_THERMAL }] },
        { key: 'kb', type: 'number', label: 'tv_kBoard', default: K_FR4_THROUGH, units: ['WmK'], info: 'tv_kBoardInfo' },
      ],
    },
    {
      title: 'tv_secCu',
      fields: [
        { key: 'A', type: 'number', label: 'tv_area', default: 20, units: Object.keys(AREA_MM2), info: 'tv_areaInfo' },
        { key: 't', type: 'number', label: 'tv_cuT', default: 35, units: ['um', 'oz', 'mil'], info: 'tv_cuTInfo',
          presets: [{ label: '½ oz', value: 0.5, unit: 'oz' }, { label: '1 oz', value: 1, unit: 'oz' }, { label: '2 oz', value: 2, unit: 'oz' }] },
        { key: 'sides', type: 'choice', label: 'tv_sides', default: '2', info: 'tv_sidesInfo',
          options: [{ value: '1', label: 'tv_side1' }, { value: '2', label: 'tv_side2' }] },
        { key: 'hc', type: 'number', label: 'tv_hc', default: 10, units: ['Wm2K'], info: 'tv_hcInfo',
          presets: [{ label: 'tv_hcStill', value: 10, raw: false },
            { label: `${hcForced(1)} · 1 m/s`, value: hcForced(1) }, { label: `${hcForced(3)} · 3 m/s`, value: hcForced(3) }] },
      ],
    },
  ],

  diagram,

  compute(v, u) {
    const mm = (k) => toMm(v[k], u[k]);
    return thermalVia({
      powerW: v.P,
      thetaJcKW: v.jc,
      ambientC: v.ta,
      tjMaxC: v.tj,
      padWMm: mm('pw'),
      padLMm: mm('pl'),
      boardMm: mm('h'),
      count: v.n,
      drillMm: mm('d'),
      platingUm: toMm(v.tp, u.tp) * 1000,
      pitchMm: mm('pitch'),
      kFillWmK: v.fill === 'filled' ? v.kf : 0,
      kBoardWmK: v.kb,
      copperAreaMm2: v.A * (AREA_MM2[u.A] ?? 100),
      copperUm: thicknessToMil(v.t, u.t) * 25.4,
      sides: Number(v.sides),
      hWm2K: v.hc,
    });
  },

  render(r, v, u) {
    if (!r.ok) return invalid(r.errors);
    const over = r.marginC < 0;
    const main = heroes([
      ['tv_tj', `${fixed(r.tjC, 1)} <span class="u">°C</span>`, `Tj,max ${degTxt(r.tjMaxC)} · P = ${fmt(r.powerW, 3)} W`],
      ['tv_thetaPA', `${fmt(r.thetaPadAmbientKW, 3)} <span class="u">°C/W</span>`, `θJA = ${kwTxt(r.thetaJaKW)}`],
    ]);
    // Pass/fail against Tj,max first, then the other warnings.
    const check = over
      ? messages('error', ['tv_tjHigh'], { tv_tjHigh: { over: degTxt(-r.marginC), max: degTxt(r.tjMaxC) } })
      : messages('ok', ['tv_tjOk'], { tv_tjOk: { margin: degTxt(r.marginC), max: degTxt(r.tjMaxC) } });
    const share = { share: pctTxt(r.share[r.dominant]) };
    const warn = messages('warn', r.warnings.filter((w) => w !== 'tv_tjHigh'), {
      tv_noFit: { n: r.count, fit: r.fit.count, nx: r.fit.nx, ny: r.fit.ny },
      tv_etaLow: { eta: fixed(r.fin.eta, 2) },
      tv_domCopper: share,
      tv_domVia: share,
      tv_domJc: share,
    });

    const part = (key, theta) => `${kwTxt(theta)} · ${esc(t('tv_ofTotal', { share: pctTxt(r.share[key]) }))}${r.dominant === key ? ` (${esc(t('tv_largest'))})` : ''}`;
    const need = r.need.status === 'ok' ? `${areaTxt(r.need.areaMm2, u.A)} (η = ${fixed(r.need.eta, 2)})`
      : r.need.status === 'padOnly' ? esc(t('tv_reqPad'))
        : r.need.status === 'limit' ? esc(t('tv_reqLimit', { x: kwTxt(r.need.thetaUnboundedKW), need: kwTxt(r.need.thetaCaKW) }))
          : esc(t('tv_reqChain'));
    const chain = block('tv_blkChain', rows([
      ['tv_rJc', part('jc', r.thetaJcKW)],
      ['tv_rPb', part('pb', r.thetaPbKW)],
      ['tv_rCa', part('ca', r.thetaCaKW)],
      ['tv_rJa', kwTxt(r.thetaJaKW), true],
      ['tv_tPad', degTxt(r.tPadC)],
      ['tv_tCu', degTxt(r.tCopperC)],
      ['tv_margin', degTxt(r.marginC)],
      ['tv_pMax', `${fmt(r.maxPowerW, 3)} W`],
      ['tv_areaReq', need],
    ]));

    const withTj = (theta, tj) => `${kwTxt(theta)} → Tj ${degTxt(tj)}`;
    const vias = block('tv_blkVia', rows([
      r.count > 0 && ['tv_rVia', `${kwTxt(r.via.thetaKW)} · ${fmt(r.via.barrelAreaMm2, 3)} mm²`],
      r.count > 0 && [t('tv_rVias', { n: r.count }), kwTxt(r.thetaViasKW), false, true],
      r.count > 0 && ['tv_rLam', kwTxt(r.thetaLaminateKW)],
      r.count > 0 && ['tv_rNoVia', withTj(r.thetaNoViaKW, r.tjNoViaC)],
      ['tv_rFit', `${r.fit.nx} × ${r.fit.ny} = ${r.fit.count}`],
      r.thetaPbFitKW !== null && [t('tv_rFull', { n: r.fit.count }), withTj(r.thetaPbFitKW, r.tjFitC), false, true],
    ]) + (r.count > 0 && !r.filled ? `<p class="note">${esc(t('tv_wick'))}</p>` : ''));

    const f = r.fin;
    const copper = block('tv_blkCu', rows([
      ['tv_rRadii', `${lenTxt(f.rbMm)} / ${lenTxt(f.reMm)}`],
      ['tv_rReach', lenTxt(1000 / f.mPerM)],
      ['tv_rEta', fixed(f.eta, 3)],
      ['tv_rEtaS', fixed(f.etaSchmidt, 3)],
      ['tv_rIso', kwTxt(f.thetaIsothermalKW)],
      ['tv_rInf', kwTxt(f.thetaUnboundedKW)],
    ]));

    return main + check + warn + worked(r, u) + chain + vias + copper;
  },
};
