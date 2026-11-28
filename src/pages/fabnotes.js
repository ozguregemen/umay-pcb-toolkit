import {
  fabNotes, notesDataUrl, RANGES, LAYERS_MAX, MAX_ROWS, DEFAULTS, COPPER_UM, MASK_COLOURS, LEGEND_COLOURS, FINISHES,
} from '../engine/fabnotes.js';
import { hero, block, checks, messages, invalid } from '../ui/calculator.js';
import { fmt, esc } from '../ui/format.js';
import { t } from '../i18n.js';
import { icon } from '../ui/icons.js';

// The notes themselves (both languages) live in the engine: their language is
// the fabricator's and does not follow the language of the page.
const strings = {
  tr: {
    fn_secNotes: 'Not bloğu',
    fn_lang: 'Notların dili',
    fn_langEn: 'İngilizce',
    fn_langTr: 'Türkçe',
    fn_langHint: 'Notlar üreticiye gider; dilleri bu sayfanın dilinden bağımsızdır.',
    fn_name: 'Kart adı veya parça numarası',
    fn_rev: 'Revizyon',
    fn_nameHint: 'İsteğe bağlı. Notların başlık satırında yer alır.',

    fn_secBoard: 'Kart',
    fn_lay: 'Bakır katman sayısı',
    fn_thk: 'Bitmiş kart kalınlığı',
    fn_ttol: 'Kalınlık toleransı (±)',
    fn_cls: 'IPC-6012 performans sınıfı',
    fn_cls1: 'Sınıf 1',
    fn_cls2: 'Sınıf 2',
    fn_cls3: 'Sınıf 3',
    fn_clsInfo: 'Sınıf 1: genel elektronik ürünler. Sınıf 2: kesintisiz çalışması beklenen, özel hizmet amaçlı ürünler; endüstriyel ve ticari cihazlarda olağan seçim. Sınıf 3: arızanın kabul edilemediği, yüksek performanslı veya zorlu ortamda çalışan ürünler. Sınıf, üreticinin üretimde ve muayenede uyguladığı kabul sınırlarını belirler.',
    fn_stk: 'Katman dizilimi',
    fn_stkFab: 'Üreticinin standardı',
    fn_stkDrawing: 'Katman dizilimi çizimime göre',
    fn_stkHint: 'Bu sayfa dielektrik kalınlıklarını sormaz: ya üreticinin standart dizilimini kabul edin ya da kendi katman dizilimi çiziminizi veriyle birlikte gönderin.',

    fn_secMat: 'Taban malzemesi',
    fn_mat: 'Malzeme',
    fn_matStd: 'FR-4, standart Tg (≥ 130 °C)',
    fn_matMid: 'FR-4, orta Tg (≥ 150 °C)',
    fn_matHigh: 'FR-4, yüksek Tg (≥ 170 °C)',
    fn_matOther: 'Diğer (aşağıya yazılır)',
    fn_matx: 'Malzeme tanımı',
    fn_matxHint: 'Örneğin bir RF laminatın üreticisi ve tipi. Metin notlara olduğu gibi yazılır; en çok 40 karakter.',
    fn_hf: 'Halojensiz malzeme',
    fn_ul: 'Yanmazlık sınıfı UL 94 V-0',
    fn_yes: 'Evet',
    fn_no: 'Hayır',

    fn_secCu: 'Bakır ve yüzey kaplaması',
    fn_cuo: 'Dış katmanlarda bitmiş bakır',
    fn_cu1: 'Bakır kalınlığı',
    fn_cui: 'İç katmanlarda bakır',
    fn_cu18: '18 µm (0,5 oz)',
    fn_cu35: '35 µm (1 oz)',
    fn_cu70: '70 µm (2 oz)',
    fn_cu105: '105 µm (3 oz)',
    fn_fin: 'Yüzey kaplaması',
    fn_finHasl: 'Kurşunsuz HASL',
    fn_finEnig: 'ENIG (nikel / daldırma altın)',
    fn_finImag: 'Daldırma gümüş',
    fn_finImsn: 'Daldırma kalay',
    fn_finOsp: 'OSP (organik koruyucu)',
    fn_finEnepig: 'ENEPIG (nikel / paladyum / altın)',
    fn_gold: 'Kenar konnektörü parmaklarında sert altın',

    fn_secMask: 'Lehim maskesi ve serigrafi',
    fn_sm: 'Lehim maskesi',
    fn_sideBoth: 'İki yüz',
    fn_sideTop: 'Yalnızca üst yüz',
    fn_sideBottom: 'Yalnızca alt yüz',
    fn_sideNone: 'Yok',
    fn_smc: 'Lehim maskesi rengi',
    fn_colGreen: 'Yeşil',
    fn_colMgreen: 'Mat yeşil',
    fn_colBlack: 'Siyah',
    fn_colMblack: 'Mat siyah',
    fn_colBlue: 'Mavi',
    fn_colRed: 'Kırmızı',
    fn_colWhite: 'Beyaz',
    fn_colYellow: 'Sarı',
    fn_leg: 'Serigrafi',
    fn_legc: 'Serigrafi rengi',
    fn_maskNote: 'Kartta serigrafi varsa notlar, padlerin üzerinde serigrafi mürekkebi bulunmayacağını her zaman belirtir.',

    fn_secHole: 'Delikler ve vialar',
    fn_hole: 'En küçük bitmiş delik',
    fn_ptol: 'Kaplamalı delik toleransı (±)',
    fn_ntol: 'Kaplamasız delik toleransı (±)',
    fn_via: 'Via koruması',
    fn_viaOpen: 'Açık bırakılır',
    fn_viaTent: 'Lehim maskesi ile kapatılır (tenting)',
    fn_viaPlug: 'Tıkanır ve maske ile örtülür',
    fn_viaFill: 'Doldurulur ve bakırla kapatılır (pad içi via için)',
    fn_vip: 'Komponent padlerinin içinde via var (via-in-pad)',

    fn_secMin: 'En küçük ölçüler',
    fn_trk: 'En küçük iz genişliği',
    fn_spc: 'En küçük aralık',
    fn_minNote: 'Üreticinin bilgisi içindir: üretici, yeteneğini bu değerlere ve en küçük deliğe göre denetler, prosesi buna göre seçer.',

    fn_secImp: 'Kontrollü empedans',
    fn_zn: 'Empedans gerekleri',
    fn_zn0: 'Yok',
    fn_zn1: '1 satır',
    fn_zn2: '2 satır',
    fn_zn3: '3 satır',
    fn_zadj: 'Üreticinin iz genişliği ve aralığında yapabileceği ayar (±)',
    fn_zNote: 'Bir satır ancak eksiksizse notlara girer: katman, hedef, tolerans, iz genişliği, (çift için) aralık ve referans katman.',
    fn_secZ1: 'Empedans satırı 1',
    fn_secZ2: 'Empedans satırı 2',
    fn_secZ3: 'Empedans satırı 3',
    fn_zl: 'Katman',
    fn_zlHint: 'Katmanın verideki adıyla, örneğin L1 veya Top.',
    fn_zk: 'Tür',
    fn_zkSe: 'Tek uçlu',
    fn_zkDiff: 'Diferansiyel',
    fn_zz: 'Hedef empedans',
    fn_zt: 'Tolerans (±)',
    fn_zw: 'Çizimdeki iz genişliği',
    fn_zg: 'İki iz arasındaki aralık',
    fn_zr: 'Referans katman(lar)',
    fn_zrHint: 'İzin üzerinden geçtiği düzlem veya düzlemler, örneğin L2 veya L2, L4.',

    fn_secOut: 'Dış hat ve teslim',
    fn_dlv: 'Kartların teslim şekli',
    fn_dlvSingle: 'Tekil kart',
    fn_dlvFab: 'Üreticinin hazırladığı panelde',
    fn_dlvDrawn: 'Veride çizilen panelde',
    fn_sep: 'Paneldeki ayırma',
    fn_sepTabs: 'Freze ve köprü',
    fn_sepVscore: 'V-kesim',
    fn_otol: 'Dış hat toleransı (±)',
    fn_xout: 'Panelde hatalı kart (X-out) kabul edilir',

    fn_secQ: 'Kalite ve işaretleme',
    fn_et: 'Netliste göre %100 elektriksel test',
    fn_bow: 'Eğilme ve burulma sınırı',
    fn_bowHint: 'Yaygın sınırlar: yüzey montaj komponentli kartlarda %0,75, diğer kartlarda %1,5.',
    fn_mark: 'Tarih kodu ve üretici işareti',
    fn_markLegend: 'Serigrafi ile konabilir',
    fn_markCopper: 'Bakır olarak konabilir',
    fn_markNone: 'Konamaz',
    fn_rohs: 'RoHS uygunluğu istenir',
    fn_pack: 'Nem alıcılı vakumlu paket',

    fn_secData: 'Üretim verisi',
    fn_data: 'Verilen veri biçimi',
    fn_dataGerber: 'Gerber X2 ve Excellon delik dosyaları',
    fn_dataOdb: 'ODB++',
    fn_dataIpc2581: 'IPC-2581',
    fn_dataNote: 'Notlar, verinin yazılı onay olmadan değiştirilemeyeceğini her zaman belirtir; notların izin verdiği ayarlamalar bunun dışındadır.',

    fn_hero: 'Üretim notları',
    fn_unitNotes: 'not',
    fn_layers1: '1 katman',
    fn_layersN: '{n} katman',
    fn_fsHasl: 'kurşunsuz HASL',
    fn_fsEnig: 'ENIG',
    fn_fsImag: 'daldırma gümüş',
    fn_fsImsn: 'daldırma kalay',
    fn_fsOsp: 'OSP',
    fn_fsEnepig: 'ENEPIG',
    warn_fn_open: 'Aşağıdaki {total} maddeden {n} tanesi, notlar gönderilmeden önce netleştirilmeli.',
    ok_fn_clear: 'Aşağıdaki {total} maddenin hiçbirinde sorun görünmüyor. Liste yalnızca bu sayfanın sorduklarını kapsar.',
    fn_blkNotes: 'Not bloğu',
    fn_copy: 'Notları kopyala',
    fn_download: 'Metin dosyası olarak indir',
    fn_notesHint: 'Her satırda bir not; başlık satırı dahildir. Notlarda ± µ ° Ω ² işaretleri geçer: çiziminizin yazı tipinde bulunduklarını kontrol edin.',
    fn_blkChecks: 'Göndermeden önce netleştirilecekler',
    fn_note: 'Bu notlar bir başlangıçtır; her karta uyan bir şartname değildir. Göndermeden önce her satırı okuyun, kartınıza uymayanı silin, kartınızın gerektirdiğini ekleyin. Belirleyici olan, üreticinin üretebildiği ve onunla üzerinde anlaştığınız çizimdir; bunlar bu notlardan ayrılıyorsa konuyu üretimden önce yazılı olarak netleştirin.',
    fn_refs: 'Notlarda adı geçen standartlar',
    fn_dRohs: '2011/65/AB sayılı Direktif',
    fn_sIpc6012: 'rijit baskı devre kartlarının performansı',
    fn_sIpcA600: 'baskı devre kartlarının kabul edilebilirliği',
    fn_sIpc4101: 'taban malzemeleri',
    fn_sIpcSm840: 'lehim maskesi',
    fn_sIpc4552: 'ENIG',
    fn_sIpc4553: 'daldırma gümüş',
    fn_sIpc4554: 'daldırma kalay',
    fn_sIpc4556: 'ENEPIG',
    fn_sIpc4761: 'via koruması',
    fn_sIpc9252: 'elektriksel test',
    fn_sIpc1601: 'taşıma, paketleme ve depolama',
    fn_sIpc2581: 'veri biçimi',
    fn_sUl94: 'plastik malzemelerin yanıcılığı',
    fn_sRohs: 'RoHS',

    fn_kImp: 'Empedans satırları',
    fn_kImpOk: 'İstenen satırların hepsi ({n}) eksiksiz: notlar hedefleri verir, belirtilen ayara izin verir, katman diziliminin onaya sunulmasını ve test raporunu ister.',
    fn_kImpRow: '{row}. satırda eksik: {fields}.',
    fn_kImpWarn: 'Eksik satırlar notlara alınmaz, çünkü bir değeri eksik olan gerek üretilemez.',
    fn_kImpNone: 'Eksiksiz satır olmadığı için notlarda hiç empedans gereği yok.',
    fn_mLayer: 'katman',
    fn_mKind: 'tür',
    fn_mOhms: 'hedef empedans',
    fn_mTol: 'tolerans',
    fn_mWidth: 'iz genişliği',
    fn_mGap: 'aralık',
    fn_mRef: 'referans katman',
    fn_kStackup: 'Katman dizilimi',
    fn_kStackupNone: '{n} katmanlı kartta üreticinin standart dizilimi seçili: dielektrik kalınlıkları o üreticinin kullandığı değerler olur ve üreticiden üreticiye değişir. Empedans, çapraz karışma veya yalıtım için önemliyse bir katman dizilimi çizimi ekleyin ve yukarıda onu seçin.',
    fn_kStackupDrawing: 'Notlar katman dizilimi çiziminize atıf yapıyor: çizimi veriyle birlikte gönderin; katman sırası, bakır ve dielektrik kalınlıkları ile malzemeler çizimde olsun, yoksa not boşa atıf yapar.',
    fn_kStackupApproval: 'Üretici, standart dizilimini empedans hedeflerine göre kurar ve üretimden önce onaya sunar; böylece dielektrik kalınlıkları yazılı olarak kararlaştırılır.',
    fn_kClass: 'Performans sınıfı',
    fn_kClassOk: 'Sınıf {c}, çoğu üreticinin standart hizmetidir; ek muayene veya maliyet getirmez.',
    fn_kClassWarn: 'Sınıf 3 yüksek güvenilirlik isteyen ürünler içindir: kabul sınırları daralır (örneğin halka genişliği ve delik kaplaması için), muayene ve dokümantasyon artar, fiyat ve teslim süresi genellikle yükselir; her üretici bu sınıfta üretmez. Ürün veya sözleşme gerektirmiyorsa seçmeyin.',
    fn_kThin: 'Katman sayısına göre kalınlık',
    fn_kThinOk: '{n} bakır katman için {t} mm makul (pratik kural, standart değil: en az yaklaşık {lim} mm).',
    fn_kThinWarn: '{n} bakır katman için {t} mm çok ince: her katman bakır ve dielektrik ister; pratik kurala göre (standart değil) üreticiler en az yaklaşık {lim} mm ister. Kalınlığı ve üreticinin alt sınırını kontrol edin.',
    fn_kThicknessTol: 'Kalınlık toleransı',
    fn_kThicknessTolOk: '±%{tol}, olağan ±%{usual} değerinden sıkı değil (tipik değer, standarttan değil); üreticiler bu toleransı genellikle özel anlaşma olmadan tutar.',
    fn_kThicknessTolWarn: '±%{tol}, olağan ±%{usual} değerinden sıkı (tipik değer, standarttan değil): laminat ve prepreg kalınlıkları değişir; üreticiye bu toleransı tutup tutamayacağını ve maliyetini sorun.',
    fn_kAspect: 'Delik en-boy oranı',
    fn_kAspectOk: 'Kart kalınlığı / en küçük bitmiş delik = {r}:1; deliklerin güvenilir biçimde kaplandığı tipik {lim}:1 sınırını (pratik kural) aşmıyor.',
    fn_kAspectWarn: 'Kart kalınlığı / en küçük bitmiş delik = {r}:1; tipik {lim}:1 sınırının üzerinde (pratik kural; üreticiye göre değişir): kaplama banyosu derin ve dar bir deliğin ortasına zor ulaşır. Deliği büyütün ya da oranı üreticiyle teyit edin.',
    fn_kCopper: 'Bakır kalınlığı ve en küçük ölçü',
    fn_kCopperOk: 'En küçük iz genişliği veya aralığı {f} mm; üreticilerin {cu} µm bakır için genellikle kabul ettiği {lim} mm değerinin altında değil (pratik kural; üreticiye göre değişir).',
    fn_kCopperWarn: 'En küçük iz genişliği veya aralığı {f} mm; üreticilerin {cu} µm bakır için genellikle kabul ettiği {lim} mm değerinin altında (pratik kural; üreticiye göre değişir): kalın bakır yana doğru da aşınır, dar aralıklar temiz açılmaz. Üreticiyle teyit edin, ölçüleri büyütün ya da daha ince bakır kullanın.',
    fn_kHasl: 'HASL ve ince ölçüler',
    fn_kHaslOk: 'HASL düzgün olmayan bir lehim yüzeyi bırakır; geniş adımlı komponentler bunu tolere eder. En küçük ölçü {f} mm; genellikle ince adımlı komponentlerle birlikte görülen {lim} mm sınırının altında değil (tipik kılavuz, standart değil).',
    fn_kHaslWarn: 'HASL düzgün olmayan bir lehim yüzeyi bırakır. {lim} mm altındaki {f} mm gibi bir en küçük ölçü, genellikle ince adımlı komponentlerin veya BGA’ların işaretidir (tipik kılavuz, standart değil); bunlar düz pad ister: ENIG, daldırma kalay veya daldırma gümüş düşünün.',
    fn_kViaInPad: 'Pad içi vialar',
    fn_kViaInPadMatch: 'Pad içi vialar doldurulup bakırla kapatılıyor: padler düz kalır, lehim vianın içine akamaz.',
    fn_kViaInPadNoNeed: 'Doldurulup kapatılan via seçili, ama kartta pad içi via yok: doldurma ek proses adımı ve maliyet getirir; pad içi via yoksa maske ile kapatma veya tıkama genellikle yeter. Başka bir nedeniniz yoksa değiştirin.',
    fn_kViaInPadOpen: 'Kartta pad içi via var, ama vialar doldurulup kapatılmıyor: reflow sırasında lehim vianın içine akar ve bağlantıda lehim eksik kalır. Doldurulup kapatılan viayı seçin ya da viaları padlerin dışına alın.',
    fn_kViaMask: 'Via kapatma ve lehim maskesi',
    fn_kViaMaskOk: 'Viaların kapatılması, kartta bulunan lehim maskesiyle yapılır.',
    fn_kViaMaskWarn: 'Viaları kapatmak veya örtmek lehim maskesi ister, ama kartta maske yok: notlar viaları açık olarak belirtir. Lehim maskesi ya da başka bir via koruması seçin.',
    fn_kMarking: 'Üretici işareti',
    fn_kMarkingOk: 'İşaret ve tarih kodu serigrafi mürekkebiyle konur; kartta serigrafi var.',
    fn_kMarkingWarn: 'İşarete serigrafi mürekkebiyle izin veriliyor, ama kartta serigrafi yok: üreticinin yalnızca işaret için serigrafi basması gerekir. Bakır olarak izin verin, yasaklayın ya da serigrafi ekleyin.',
    fn_kEtest: 'Elektriksel test',
    fn_kEtestOk: 'Her kart açık devre ve kısa devre için test edilir; hatalı kart, üzerine komponent lehimlenmeden önce bulunur.',
    fn_kEtestNet: 'CAD programınız verebiliyorsa Gerber verisiyle birlikte bir IPC-D-356 netlisti de gönderin: kart böylece yalnızca Gerber görüntüleriyle değil, tasarımla karşılaştırılır.',
    fn_kEtestWarn: 'Elektriksel test istenmiyor: açık devre veya kısa devre ancak dizgiden sonra, komponentler kartın üzerindeyken bulunur. Testin maliyeti, hurdaya çıkan tek bir dizili kartın yanında küçüktür.',

    err_fn_layers: 'Bakır katman sayısı 1 ile 32 arasında bir tam sayı olmalı.',
    err_fn_number: 'Bir değer eksik ya da bu sayfanın kabul ettiği aralığın dışında; bütün sayılar makul olana kadar notlar yazılmaz.',
    err_fn_material: '“Diğer” seçildiğinde malzeme tanımını yazın: notlarda malzemenin adı geçmelidir.',
    err_fn_option: 'Bir seçenek bu sayfanın tanımadığı bir değer taşıyor.',
  },
  en: {
    fn_secNotes: 'Notes block',
    fn_lang: 'Language of the notes',
    fn_langEn: 'English',
    fn_langTr: 'Turkish',
    fn_langHint: 'The notes go to the fabricator; their language does not follow the language of this page.',
    fn_name: 'Board name or part number',
    fn_rev: 'Revision',
    fn_nameHint: 'Optional. Appears in the title line of the notes.',

    fn_secBoard: 'Board',
    fn_lay: 'Number of copper layers',
    fn_thk: 'Finished board thickness',
    fn_ttol: 'Thickness tolerance (±)',
    fn_cls: 'IPC-6012 performance class',
    fn_cls1: 'Class 1',
    fn_cls2: 'Class 2',
    fn_cls3: 'Class 3',
    fn_clsInfo: 'Class 1: general electronic products. Class 2: dedicated-service products that are expected to keep working, the usual choice for industrial and commercial equipment. Class 3: high-performance or harsh-environment products where a failure is not acceptable. The class decides the acceptance limits the fabricator builds and inspects to.',
    fn_stk: 'Stack-up',
    fn_stkFab: 'Fabricator’s standard',
    fn_stkDrawing: 'As in my stack-up drawing',
    fn_stkHint: 'This page does not ask for dielectric thicknesses: either accept the fabricator’s standard build or send your own stack-up drawing with the data.',

    fn_secMat: 'Base material',
    fn_mat: 'Material',
    fn_matStd: 'FR-4, standard Tg (≥ 130 °C)',
    fn_matMid: 'FR-4, mid Tg (≥ 150 °C)',
    fn_matHigh: 'FR-4, high Tg (≥ 170 °C)',
    fn_matOther: 'Other (entered below)',
    fn_matx: 'Material designation',
    fn_matxHint: 'For example the maker and type of an RF laminate. The text goes into the notes as it is; at most 40 characters.',
    fn_hf: 'Halogen-free material',
    fn_ul: 'Flammability rating UL 94 V-0',
    fn_yes: 'Yes',
    fn_no: 'No',

    fn_secCu: 'Copper and surface finish',
    fn_cuo: 'Finished copper, outer layers',
    fn_cu1: 'Copper thickness',
    fn_cui: 'Copper, inner layers',
    fn_cu18: '18 µm (0.5 oz)',
    fn_cu35: '35 µm (1 oz)',
    fn_cu70: '70 µm (2 oz)',
    fn_cu105: '105 µm (3 oz)',
    fn_fin: 'Surface finish',
    fn_finHasl: 'Lead-free HASL',
    fn_finEnig: 'ENIG (nickel / immersion gold)',
    fn_finImag: 'Immersion silver',
    fn_finImsn: 'Immersion tin',
    fn_finOsp: 'OSP (organic preservative)',
    fn_finEnepig: 'ENEPIG (nickel / palladium / gold)',
    fn_gold: 'Hard gold on edge-connector fingers',

    fn_secMask: 'Solder mask and legend',
    fn_sm: 'Solder mask',
    fn_sideBoth: 'Both sides',
    fn_sideTop: 'Top side only',
    fn_sideBottom: 'Bottom side only',
    fn_sideNone: 'None',
    fn_smc: 'Solder mask colour',
    fn_colGreen: 'Green',
    fn_colMgreen: 'Matte green',
    fn_colBlack: 'Black',
    fn_colMblack: 'Matte black',
    fn_colBlue: 'Blue',
    fn_colRed: 'Red',
    fn_colWhite: 'White',
    fn_colYellow: 'Yellow',
    fn_leg: 'Legend (silkscreen)',
    fn_legc: 'Legend colour',
    fn_maskNote: 'When the board has a legend, the notes always state that no legend ink may lie on pads.',

    fn_secHole: 'Holes and vias',
    fn_hole: 'Smallest finished hole',
    fn_ptol: 'Tolerance of plated holes (±)',
    fn_ntol: 'Tolerance of non-plated holes (±)',
    fn_via: 'Via protection',
    fn_viaOpen: 'Left open',
    fn_viaTent: 'Tented with solder mask',
    fn_viaPlug: 'Plugged and covered',
    fn_viaFill: 'Filled and capped (for via-in-pad)',
    fn_vip: 'The board has vias in component pads (via-in-pad)',

    fn_secMin: 'Smallest features',
    fn_trk: 'Smallest trace width',
    fn_spc: 'Smallest spacing',
    fn_minNote: 'For the fabricator’s information: they check their capability and choose the process from these values and the smallest hole.',

    fn_secImp: 'Controlled impedance',
    fn_zn: 'Impedance requirements',
    fn_zn0: 'None',
    fn_zn1: '1 row',
    fn_zn2: '2 rows',
    fn_zn3: '3 rows',
    fn_zadj: 'Adjustment of width and gap allowed to the fabricator (±)',
    fn_zNote: 'A row goes into the notes only when it is complete: layer, target, tolerance, trace width, gap (for a pair) and reference layer.',
    fn_secZ1: 'Impedance row 1',
    fn_secZ2: 'Impedance row 2',
    fn_secZ3: 'Impedance row 3',
    fn_zl: 'Layer',
    fn_zlHint: 'As the layer is named in the data, for example L1 or Top.',
    fn_zk: 'Kind',
    fn_zkSe: 'Single-ended',
    fn_zkDiff: 'Differential',
    fn_zz: 'Target impedance',
    fn_zt: 'Tolerance (±)',
    fn_zw: 'Trace width as drawn',
    fn_zg: 'Gap between the two traces',
    fn_zr: 'Reference layer(s)',
    fn_zrHint: 'The plane or planes the trace runs over, for example L2 or L2, L4.',

    fn_secOut: 'Outline and delivery',
    fn_dlv: 'Boards are delivered',
    fn_dlvSingle: 'As single boards',
    fn_dlvFab: 'In a panel made by the fabricator',
    fn_dlvDrawn: 'In the panel drawn in the data',
    fn_sep: 'Separation in the panel',
    fn_sepTabs: 'Routed with tabs',
    fn_sepVscore: 'V-score',
    fn_otol: 'Outline tolerance (±)',
    fn_xout: 'X-outs allowed in a panel',

    fn_secQ: 'Quality and marking',
    fn_et: '100 % electrical test against the netlist',
    fn_bow: 'Bow and twist limit',
    fn_bowHint: 'Common limits are 0.75 % for boards with surface-mount parts and 1.5 % for other boards.',
    fn_mark: 'Date code and fabricator’s mark',
    fn_markLegend: 'Allowed, in legend ink',
    fn_markCopper: 'Allowed, in copper',
    fn_markNone: 'Not allowed',
    fn_rohs: 'RoHS compliance required',
    fn_pack: 'Vacuum-sealed packing with desiccant',

    fn_secData: 'Data',
    fn_data: 'Data format supplied',
    fn_dataGerber: 'Gerber X2 with Excellon drill files',
    fn_dataOdb: 'ODB++',
    fn_dataIpc2581: 'IPC-2581',
    fn_dataNote: 'The notes always state that the data must not be changed without written approval, except for the adjustments the notes allow.',

    fn_hero: 'Fabrication notes',
    fn_unitNotes: 'notes',
    fn_layers1: '1 layer',
    fn_layersN: '{n} layers',
    fn_fsHasl: 'lead-free HASL',
    fn_fsEnig: 'ENIG',
    fn_fsImag: 'immersion silver',
    fn_fsImsn: 'immersion tin',
    fn_fsOsp: 'OSP',
    fn_fsEnepig: 'ENEPIG',
    warn_fn_open: '{n} of the {total} points below should be settled before the notes go out.',
    ok_fn_clear: 'None of the {total} points below needs attention. The list covers only what this page asks.',
    fn_blkNotes: 'Notes block',
    fn_copy: 'Copy the notes',
    fn_download: 'Download as a text file',
    fn_notesHint: 'One note per line; the title line is included. The notes use the characters ± µ ° Ω ²: check that the font of your drawing has them.',
    fn_blkChecks: 'To settle before sending',
    fn_note: 'These notes are a starting point, not a specification that fits every board. Read every line before you send it, delete what does not apply and add what your board needs. What the fabricator can build and the drawing you agree on with them decide; where they differ from these notes, settle it in writing before production.',
    fn_refs: 'Standards named in the notes',
    fn_dRohs: 'Directive 2011/65/EU',
    fn_sIpc6012: 'performance of rigid printed boards',
    fn_sIpcA600: 'acceptability of printed boards',
    fn_sIpc4101: 'base materials',
    fn_sIpcSm840: 'solder mask',
    fn_sIpc4552: 'ENIG',
    fn_sIpc4553: 'immersion silver',
    fn_sIpc4554: 'immersion tin',
    fn_sIpc4556: 'ENEPIG',
    fn_sIpc4761: 'via protection',
    fn_sIpc9252: 'electrical test',
    fn_sIpc1601: 'handling, packing and storage',
    fn_sIpc2581: 'data format',
    fn_sUl94: 'flammability of plastic materials',
    fn_sRohs: 'RoHS',

    fn_kImp: 'Impedance rows',
    fn_kImpOk: 'All rows asked for ({n}) are complete: the notes give the targets, allow the stated adjustment and ask for the stack-up for approval and for a test report.',
    fn_kImpRow: 'Row {row} lacks: {fields}.',
    fn_kImpWarn: 'Incomplete rows are left out of the notes, because a requirement with a value missing cannot be built to.',
    fn_kImpNone: 'No row is complete, so the notes ask for no impedance control at all.',
    fn_mLayer: 'layer',
    fn_mKind: 'kind',
    fn_mOhms: 'target impedance',
    fn_mTol: 'tolerance',
    fn_mWidth: 'trace width',
    fn_mGap: 'gap',
    fn_mRef: 'reference layer',
    fn_kStackup: 'Stack-up',
    fn_kStackupNone: 'With {n} layers and the fabricator’s standard build, the dielectric thicknesses are whatever that fabricator uses, and they differ from one fabricator to the next. If they matter for impedance, crosstalk or insulation, attach a stack-up drawing and select it above.',
    fn_kStackupDrawing: 'The notes refer to your stack-up drawing: send it with the data, showing layer order, copper and dielectric thicknesses and materials, because without it the note points to nothing.',
    fn_kStackupApproval: 'The fabricator fits its standard stack-up to the impedance targets and submits it for approval before production, so the dielectric thicknesses are agreed in writing.',
    fn_kClass: 'Performance class',
    fn_kClassOk: 'Class {c} is part of the standard offer of most fabricators and adds no special inspection or cost.',
    fn_kClassWarn: 'Class 3 is meant for high-reliability products: acceptance limits are tighter (for example for annular ring and hole plating), inspection and documentation grow, and price and lead time usually go up; not every fabricator offers it. Keep it only if the product or the contract requires it.',
    fn_kThin: 'Thickness for the layer count',
    fn_kThinOk: '{t} mm is plausible for a layer count of {n} (rule of thumb, not a standard: at least about {lim} mm).',
    fn_kThinWarn: '{t} mm is very thin for a layer count of {n}: every layer needs its copper and dielectric, and as a rule of thumb (not a standard) fabricators need at least about {lim} mm. Check the thickness and the fabricator’s minimum.',
    fn_kThicknessTol: 'Thickness tolerance',
    fn_kThicknessTolOk: '±{tol} % is not tighter than the usual ±{usual} % (a typical value, not from a standard), which fabricators normally hold without special agreement.',
    fn_kThicknessTolWarn: '±{tol} % is tighter than the usual ±{usual} % (a typical value, not from a standard): laminate and prepreg thicknesses vary, so ask the fabricator whether it can be held and at what cost.',
    fn_kAspect: 'Hole aspect ratio',
    fn_kAspectOk: 'Board thickness / smallest finished hole = {r}:1, not above the typical {lim}:1 (rule of thumb) up to which through holes plate reliably.',
    fn_kAspectWarn: 'Board thickness / smallest finished hole = {r}:1, above the typical {lim}:1 (rule of thumb; fabricators differ): the plating bath reaches the middle of a deep, narrow hole poorly. Enlarge the hole or confirm the ratio with the fabricator.',
    fn_kCopper: 'Copper thickness and smallest feature',
    fn_kCopperOk: 'The smallest trace width or spacing, {f} mm, is not below the {lim} mm that fabricators typically accept for {cu} µm copper (rule of thumb; fabricators differ).',
    fn_kCopperWarn: 'The smallest trace width or spacing, {f} mm, is below the {lim} mm that fabricators typically accept for {cu} µm copper (rule of thumb; fabricators differ): thick copper also etches sideways, so narrow gaps do not open cleanly. Confirm with the fabricator, widen the features or use thinner copper.',
    fn_kHasl: 'HASL and fine features',
    fn_kHaslOk: 'HASL leaves an uneven solder surface, which coarse-pitch parts tolerate. The smallest feature, {f} mm, is not below the {lim} mm that usually goes with fine-pitch parts (typical guidance, not a standard).',
    fn_kHaslWarn: 'HASL leaves an uneven solder surface. A smallest feature of {f} mm, below {lim} mm, usually goes with fine-pitch parts or BGAs (typical guidance, not a standard), and those need flat pads: consider ENIG, immersion tin or immersion silver.',
    fn_kViaInPad: 'Vias in pads',
    fn_kViaInPadMatch: 'The vias in pads are filled and capped: the pads stay flat and solder cannot run into the via.',
    fn_kViaInPadNoNeed: 'Filled and capped vias are selected, but the board has no vias in pads: filling adds process steps and cost, and without vias in pads tenting or plugging normally does the job. Keep it only if you have another reason.',
    fn_kViaInPadOpen: 'The board has vias in pads, but the vias are not filled and capped: during reflow solder runs into the via and the joint is left short of solder. Select filled and capped vias or move the vias out of the pads.',
    fn_kViaMask: 'Via covering and solder mask',
    fn_kViaMaskOk: 'Covering the vias uses the solder mask that the board has.',
    fn_kViaMaskWarn: 'Tenting or covering vias needs solder mask, but the board has none: the notes state the vias as left open. Select a solder mask or another via protection.',
    fn_kMarking: 'Fabricator’s mark',
    fn_kMarkingOk: 'The mark and date code go into the legend ink, which the board has.',
    fn_kMarkingWarn: 'The mark is allowed in legend ink, but the board has no legend: the fabricator would have to print a legend just for the mark. Allow it in copper, forbid it, or add a legend.',
    fn_kEtest: 'Electrical test',
    fn_kEtestOk: 'Every board is tested for opens and shorts, so a defective board is found before components are soldered onto it.',
    fn_kEtestNet: 'If your CAD can export an IPC-D-356 netlist, send it with the Gerber data: the board is then compared with the design, not only with the Gerber images.',
    fn_kEtestWarn: 'No electrical test is requested: an open or a short would be found only after assembly, when the components are already on the board. The test costs little compared with one scrapped assembly.',

    err_fn_layers: 'The number of copper layers must be a whole number from 1 to 32.',
    err_fn_number: 'A value is missing or outside the range this page accepts; the notes are not written until every number is plausible.',
    err_fn_material: 'Enter the material designation: with “Other” the notes have to name the material.',
    err_fn_option: 'An option has a value this page does not know.',
  },
};

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const nn = (x, sig = 4) => fmt(x, sig);

const MISSING = { layer: 'fn_mLayer', kind: 'fn_mKind', ohms: 'fn_mOhms', tol: 'fn_mTol', width: 'fn_mWidth', gap: 'fn_mGap', ref: 'fn_mRef' };

// Designation → [label key or null (the designation itself), subject key].
const STANDARDS = {
  'IPC-6012': [null, 'fn_sIpc6012'],
  'IPC-A-600': [null, 'fn_sIpcA600'],
  'IPC-4101': [null, 'fn_sIpc4101'],
  'UL 94': [null, 'fn_sUl94'],
  'IPC-4552': [null, 'fn_sIpc4552'],
  'IPC-4553': [null, 'fn_sIpc4553'],
  'IPC-4554': [null, 'fn_sIpc4554'],
  'IPC-4556': [null, 'fn_sIpc4556'],
  'IPC-SM-840': [null, 'fn_sIpcSm840'],
  'IPC-4761': [null, 'fn_sIpc4761'],
  'IPC-9252': [null, 'fn_sIpc9252'],
  '2011/65/EU': ['fn_dRohs', 'fn_sRohs'],
  'IPC-1601': [null, 'fn_sIpc1601'],
  'IPC-2581': [null, 'fn_sIpc2581'],
};

/** Values of one check as the text needs them (numbers formatted for the reader's language). */
function checkVars(c) {
  const x = c.vars;
  switch (c.id) {
    case 'imp': return { n: String(x.asked) };
    case 'stackup': return { n: String(x.layers) };
    case 'class': return { c: String(x.c) };
    case 'thin': return { t: nn(x.thicknessMm), lim: nn(x.limitMm), n: String(x.layers) };
    case 'thicknessTol': return { tol: nn(x.tolPct), usual: nn(x.usualPct) };
    case 'aspect': return { r: nn(x.ratio, 3), lim: nn(x.limit) };
    case 'copper': return { f: nn(x.featureMm), lim: nn(x.limitMm), cu: String(x.copperUm) };
    case 'hasl': return { f: nn(x.featureMm), lim: nn(x.limitMm) };
    default: return {};
  }
}

/** One sentence (or a few) saying why the check passes or what has to be settled. */
function checkText(c) {
  const x = c.vars;
  if (c.id === 'imp' && c.status !== 'ok') {
    return [
      ...x.rows.map((r) => t('fn_kImpRow', { row: String(r.row), fields: r.missing.map((m) => t(MISSING[m])).join(', ') })),
      t('fn_kImpWarn'),
      x.complete === 0 && t('fn_kImpNone'),
    ].filter(Boolean).join(' ');
  }
  const text = t(`fn_k${cap(c.id)}${cap(x.case)}`, checkVars(c));
  return c.id === 'etest' && c.status === 'ok' && x.dataFormat === 'gerber' ? `${text} ${t('fn_kEtestNet')}` : text;
}

const note = (key) => `<p class="note">${esc(t(key))}</p>`;

function render(r) {
  if (!r.ok) return invalid(r.errors);
  const s = r.summary;
  const line = [
    s.layers === 1 ? t('fn_layers1') : t('fn_layersN', { n: String(s.layers) }),
    `${nn(s.thicknessMm)} mm`,
    t(`fn_fs${cap(s.finish)}`),
  ].join(' · ');
  const unit = t('fn_unitNotes');
  const total = String(r.checks.length);
  const verdict = s.warnings
    ? messages('warn', ['fn_open'], { fn_open: { n: String(s.warnings), total } })
    : messages('ok', ['fn_clear'], { fn_clear: { total } });

  // The copy button uses the result card's own handler (data-copy); the
  // download is a data: URL, so it needs no script either.
  const actions = `<div class="page-actions">
      <button type="button" class="btn ghost" data-copy="${esc(r.text)}">${icon('copy', 16)}<span class="btn-label">${esc(t('fn_copy'))}</span></button>
      <a class="btn ghost" href="${esc(notesDataUrl(r.text))}" download="${esc(s.fileName)}">${icon('download', 16)}<span class="btn-label">${esc(t('fn_download'))}</span></a>
    </div>`;
  const list = checks(r.checks.map((c) => [c.status === 'ok' ? true : 'warn', esc(t(`fn_k${cap(c.id)}`)), esc(checkText(c))]));
  const refs = s.standards.map((d) => {
    const [label, subject] = STANDARDS[d] ?? [null, null];
    return esc(`${label ? t(label) : d}${subject ? ` (${t(subject)})` : ''}`);
  });

  return hero('fn_hero', `${s.count} <span class="u">${esc(unit)}</span>`, esc(line), `${s.count} ${unit} · ${line}`)
    + verdict
    // No existing class gives a button row a bottom margin, so the block itself
    // sits in a second .block (18 px below the buttons and the hint).
    + block('fn_blkNotes', `${actions}${note('fn_notesHint')}`)
    + `<div class="block"><pre class="formula notes">${esc(r.text)}</pre></div>`
    + block('fn_blkChecks', list)
    + note('fn_note')
    + `<p class="refs">${esc(t('fn_refs'))}: ${refs.join(' · ')}</p>`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const opts = (prefix, values) => values.map((value) => ({ value: String(value), label: `${prefix}${cap(String(value))}` }));
const yesNo = (key, label, def, extra = {}) => ({
  key, type: 'choice', label, default: def ? 'yes' : 'no', options: [{ value: 'yes', label: 'fn_yes' }, { value: 'no', label: 'fn_no' }], ...extra,
});
const number = (key, label, def, unit, range, extra = {}) => ({
  key, type: 'number', label, default: def, units: [unit], min: RANGES[range][0], max: RANGES[range][1], ...extra,
});

// Layer-count dependent fields stay visible while the layer count is being typed (NaN).
const plated = (v) => !(v.lay < 2);
const multi = (v) => !(v.lay <= 2);
const panel = (v) => v.dlv !== 'single';
const rowsAsked = (v) => Math.min(Number(v.zn) || 0, MAX_ROWS);
const copper = opts('fn_cu', COPPER_UM);
const sides = opts('fn_side', ['both', 'top', 'bottom', 'none']);

// The numbers of a row are required while the row is shown; its two texts are
// checked by the engine, which leaves an incomplete row out of the notes.
const ROW_DEFAULTS = [
  { layer: 'L1', kind: 'se', ohms: 50 },
  { layer: 'L1', kind: 'diff', ohms: 100 },
  { layer: 'L3', kind: 'diff', ohms: 90 },
];
const rowSection = (i) => {
  const d = ROW_DEFAULTS[i - 1];
  return {
    title: `fn_secZ${i}`,
    show: (v) => rowsAsked(v) >= i,
    fields: [
      { key: `z${i}l`, type: 'text', label: 'fn_zl', default: d.layer, hint: 'fn_zlHint' },
      { key: `z${i}k`, type: 'choice', label: 'fn_zk', default: d.kind, options: [{ value: 'se', label: 'fn_zkSe' }, { value: 'diff', label: 'fn_zkDiff' }] },
      number(`z${i}z`, 'fn_zz', d.ohms, 'ohm', 'ohms'),
      number(`z${i}t`, 'fn_zt', 10, 'pct', 'tolPct'),
      number(`z${i}w`, 'fn_zw', '', 'mm', 'widthMm'),
      number(`z${i}g`, 'fn_zg', '', 'mm', 'gapMm', { show: (v) => v[`z${i}k`] === 'diff' }),
      { key: `z${i}r`, type: 'text', label: 'fn_zr', default: '', hint: 'fn_zrHint' },
    ],
  };
};

export default {
  id: 'fabnotes',
  strings,
  render,
  sections: [
    {
      title: 'fn_secNotes',
      fields: [
        { key: 'nl', type: 'choice', label: 'fn_lang', default: DEFAULTS.lang, hint: 'fn_langHint',
          options: [{ value: 'en', label: 'fn_langEn' }, { value: 'tr', label: 'fn_langTr' }] },
        { key: 'name', type: 'text', label: 'fn_name', default: '', hint: 'fn_nameHint' },
        { key: 'rev', type: 'text', label: 'fn_rev', default: '' },
      ],
    },
    {
      title: 'fn_secBoard',
      fields: [
        { key: 'lay', type: 'number', label: 'fn_lay', default: DEFAULTS.layers, integer: true, min: 1, max: LAYERS_MAX, step: 1 },
        number('thk', 'fn_thk', DEFAULTS.thicknessMm, 'mm', 'thicknessMm'),
        number('ttol', 'fn_ttol', DEFAULTS.thicknessTolPct, 'pct', 'thicknessTolPct'),
        { key: 'cls', type: 'choice', label: 'fn_cls', default: String(DEFAULTS.ipcClass), info: 'fn_clsInfo', options: opts('fn_cls', [1, 2, 3]) },
        { key: 'stk', type: 'choice', label: 'fn_stk', default: DEFAULTS.stackup, hint: 'fn_stkHint', show: multi, options: opts('fn_stk', ['fab', 'drawing']) },
      ],
    },
    {
      title: 'fn_secMat',
      fields: [
        { key: 'mat', type: 'select', label: 'fn_mat', default: DEFAULTS.material, options: opts('fn_mat', ['std', 'mid', 'high', 'other']) },
        { key: 'matx', type: 'text', label: 'fn_matx', default: '', hint: 'fn_matxHint', show: (v) => v.mat === 'other' },
        yesNo('hf', 'fn_hf', DEFAULTS.halogenFree, { show: (v) => v.mat !== 'other' }),
        yesNo('ul', 'fn_ul', DEFAULTS.ul94v0),
      ],
    },
    {
      title: 'fn_secCu',
      fields: [
        { key: 'cuo', type: 'select', label: (v) => (v.lay === 1 ? 'fn_cu1' : 'fn_cuo'), default: String(DEFAULTS.outerCuUm), options: copper },
        { key: 'cui', type: 'select', label: 'fn_cui', default: String(DEFAULTS.innerCuUm), options: copper, show: multi },
        { key: 'fin', type: 'select', label: 'fn_fin', default: DEFAULTS.finish, options: opts('fn_fin', FINISHES) },
        yesNo('gold', 'fn_gold', DEFAULTS.hardGold),
      ],
    },
    {
      title: 'fn_secMask',
      note: 'fn_maskNote',
      fields: [
        { key: 'sm', type: 'select', label: 'fn_sm', default: DEFAULTS.maskSides, options: sides },
        { key: 'smc', type: 'select', label: 'fn_smc', default: DEFAULTS.maskColour, options: opts('fn_col', MASK_COLOURS), show: (v) => v.sm !== 'none' },
        { key: 'leg', type: 'select', label: 'fn_leg', default: DEFAULTS.legendSides, options: sides },
        { key: 'legc', type: 'select', label: 'fn_legc', default: DEFAULTS.legendColour, options: opts('fn_col', LEGEND_COLOURS), show: (v) => v.leg !== 'none' },
      ],
    },
    {
      title: 'fn_secHole',
      fields: [
        number('hole', 'fn_hole', DEFAULTS.minHoleMm, 'mm', 'minHoleMm'),
        number('ptol', 'fn_ptol', DEFAULTS.pthTolMm, 'mm', 'pthTolMm', { show: plated }),
        number('ntol', 'fn_ntol', DEFAULTS.npthTolMm, 'mm', 'npthTolMm'),
        { key: 'via', type: 'select', label: 'fn_via', default: DEFAULTS.via, options: opts('fn_via', ['open', 'tent', 'plug', 'fill']), show: plated },
        yesNo('vip', 'fn_vip', DEFAULTS.viaInPad, { show: plated }),
      ],
    },
    {
      title: 'fn_secMin',
      note: 'fn_minNote',
      fields: [
        number('trk', 'fn_trk', DEFAULTS.minTraceMm, 'mm', 'minTraceMm'),
        number('spc', 'fn_spc', DEFAULTS.minSpaceMm, 'mm', 'minSpaceMm'),
      ],
    },
    {
      title: 'fn_secImp',
      note: 'fn_zNote',
      fields: [
        { key: 'zn', type: 'select', label: 'fn_zn', default: '0', options: opts('fn_zn', [0, 1, 2, 3]) },
        number('zadj', 'fn_zadj', DEFAULTS.impedanceAdjustPct, 'pct', 'impedanceAdjustPct', { show: (v) => rowsAsked(v) > 0 }),
      ],
    },
    rowSection(1),
    rowSection(2),
    rowSection(3),
    {
      title: 'fn_secOut',
      fields: [
        { key: 'dlv', type: 'select', label: 'fn_dlv', default: DEFAULTS.delivery, options: opts('fn_dlv', ['single', 'fab', 'drawn']) },
        { key: 'sep', type: 'choice', label: 'fn_sep', default: DEFAULTS.separation, options: opts('fn_sep', ['tabs', 'vscore']), show: panel },
        yesNo('xout', 'fn_xout', DEFAULTS.xouts, { show: panel }),
        number('otol', 'fn_otol', DEFAULTS.outlineTolMm, 'mm', 'outlineTolMm'),
      ],
    },
    {
      title: 'fn_secQ',
      fields: [
        yesNo('et', 'fn_et', DEFAULTS.etest),
        number('bow', 'fn_bow', DEFAULTS.bowTwistPct, 'pct', 'bowTwistPct', { hint: 'fn_bowHint' }),
        { key: 'mark', type: 'select', label: 'fn_mark', default: DEFAULTS.marking, options: opts('fn_mark', ['legend', 'copper', 'none']) },
        yesNo('rohs', 'fn_rohs', DEFAULTS.rohs),
        yesNo('pack', 'fn_pack', DEFAULTS.vacuumPack),
      ],
    },
    {
      title: 'fn_secData',
      note: 'fn_dataNote',
      fields: [
        { key: 'data', type: 'select', label: 'fn_data', default: DEFAULTS.dataFormat, options: opts('fn_data', ['gerber', 'odb', 'ipc2581']) },
      ],
    },
  ],

  compute(v) {
    const yes = (k) => v[k] === 'yes';
    const impedance = [];
    for (let i = 1; i <= rowsAsked(v); i++) {
      impedance.push({
        layer: v[`z${i}l`], kind: v[`z${i}k`], ohms: v[`z${i}z`], tolPct: v[`z${i}t`], widthMm: v[`z${i}w`], gapMm: v[`z${i}g`], ref: v[`z${i}r`],
      });
    }
    return fabNotes({
      lang: v.nl,
      name: v.name,
      rev: v.rev,
      layers: v.lay,
      thicknessMm: v.thk,
      thicknessTolPct: v.ttol,
      ipcClass: Number(v.cls),
      stackup: v.stk,
      material: v.mat,
      materialText: v.matx,
      halogenFree: yes('hf'),
      ul94v0: yes('ul'),
      outerCuUm: Number(v.cuo),
      innerCuUm: Number(v.cui),
      finish: v.fin,
      hardGold: yes('gold'),
      maskSides: v.sm,
      maskColour: v.smc,
      legendSides: v.leg,
      legendColour: v.legc,
      minHoleMm: v.hole,
      pthTolMm: v.ptol,
      npthTolMm: v.ntol,
      via: v.via,
      viaInPad: yes('vip'),
      minTraceMm: v.trk,
      minSpaceMm: v.spc,
      impedance,
      impedanceAdjustPct: v.zadj,
      delivery: v.dlv,
      separation: v.sep,
      outlineTolMm: v.otol,
      xouts: yes('xout'),
      etest: yes('et'),
      bowTwistPct: v.bow,
      marking: v.mark,
      rohs: yes('rohs'),
      vacuumPack: yes('pack'),
      dataFormat: v.data,
    });
  },
};
