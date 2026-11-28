import {
  kicadRules, rulesDataUrl, fabPreset, RANGES, DEFAULTS, TYPICAL, CLASS_DEFAULTS, VERSIONS, KINDS, LAYERS, MAX_CLASSES,
} from '../engine/kicadrules.js';
import { FABS } from '../engine/fabs.js';
import { hero, block, rows, checks, messages, invalid } from '../ui/calculator.js';
import { fmt, esc } from '../ui/format.js';
import { t } from '../i18n.js';
import { icon } from '../ui/icons.js';

// The file itself (rule names, comments) is written by the engine in English:
// rule names appear in KiCad's DRC report. Everything else the page shows is here.
// Menu names of KiCad (Board Setup → …) are left as KiCad shows them.
const strings = {
  tr: {
    kr_secFab: 'Üretici sınırları',
    kr_fab: 'Hazır değerler',
    kr_fabCustom: 'Özel (elle girilen değerler)',
    kr_fabHint: 'Bir üretici seçildiğinde aşağıdaki sınırlar o üreticinin verisiyle dolar; her alanı sonradan değiştirebilirsiniz.',
    kr_fabNote: 'Hazır değerler 1 oz bakır içindir. Üretici 1–2 katmanlı kartlar için ayrı değer veriyorsa dış katmanlar ve pad halkası için o (daha sıkı) değer alınır. Daha kalın bakırda sınırlar büyür.',
    kr_tw: 'En küçük iz genişliği, dış katmanlar',
    kr_twi: 'En küçük iz genişliği, iç katmanlar',
    kr_cl: 'En küçük aralık, dış katmanlar',
    kr_cli: 'En küçük aralık, iç katmanlar',
    kr_clHint: 'Dosyaya kural olarak yazılmaz: dış ve iç değerin büyüğü Board Setup’a elle girilir.',
    kr_vh: 'En küçük via deliği',
    kr_vd: 'En küçük via çapı',
    kr_ring: 'En küçük halka genişliği, vialar',
    kr_ph: 'En küçük kaplamalı delik, padler',
    kr_pring: 'En küçük halka genişliği, kaplamalı padler',
    kr_pringHint: 'Boş bırakılırsa padler için ayrı bir halka kuralı yazılmaz.',
    kr_hh: 'Delikler arası en küçük mesafe',
    kr_hhHint: 'Tipik değer; üretici verisinden alınmamıştır. Delik kenarından delik kenarına ölçülür.',
    kr_edge: 'Bakır ile kart kenarı arasındaki en küçük aralık',
    kr_edgeHint: 'Tipik değer; üretici verisinden alınmamıştır. V-kesimli panellerde üreticiler genellikle daha fazlasını ister.',
    kr_sth: 'Serigrafide en küçük yazı yüksekliği',
    kr_stw: 'Serigrafide en küçük çizgi kalınlığı',
    kr_sthHint: 'Boş bırakılırsa bu kural yazılmaz. Tipik değer 1 mm’dir; üretici verisinden alınmamıştır.',
    kr_stwHint: 'Boş bırakılırsa bu kural yazılmaz. Tipik değer 0,15 mm’dir; üretici verisinden alınmamıştır.',

    kr_secClasses: 'Net sınıfları',
    kr_nc: 'Net sınıfı sayısı',
    kr_nc0: 'Yok',
    kr_nc1: '1 sınıf',
    kr_nc2: '2 sınıf',
    kr_nc3: '3 sınıf',
    kr_nc4: '4 sınıf',
    kr_classNote: 'Her sınıf için dosyaya bir iz genişliği kuralı, diferansiyel çiftlerde ayrıca bir çift aralığı kuralı yazılır. Sınıfın aralığı dosyaya kural olarak girmez; net sınıfı tablosuna elle girilir. Net sınıfının kendisi KiCad projesinde tanımlanır.',
    kr_secC1: 'Net sınıfı 1',
    kr_secC2: 'Net sınıfı 2',
    kr_secC3: 'Net sınıfı 3',
    kr_secC4: 'Net sınıfı 4',
    kr_cn: 'Sınıf adı',
    kr_cnHint: 'KiCad projesindeki net sınıfı adıyla aynı olmalıdır; kural netleri bu adla bulur. " \' \\ * ? , karakterleri kullanılamaz.',
    kr_ck: 'Tür',
    kr_ckSignal: 'Sinyal',
    kr_ckPower: 'Güç',
    kr_ckDiff: 'Diferansiyel çift',
    kr_cly: 'Kuralların geçerli olduğu katmanlar',
    kr_clyAny: 'Bütün katmanlar',
    kr_clyOuter: 'Dış katmanlar',
    kr_clyInner: 'İç katmanlar',
    kr_clyInfo: 'Kontrollü empedanslı bir izin genişliği katmana göre değişir. Dış ya da iç katmanlar seçildiğinde sınıfın kuralları yalnızca o katmanlarda geçerlidir; diğer katmanlarda bu sınıfın netleri üretici kurallarıyla denetlenir.',
    kr_cw: 'İz genişliği',
    kr_cm: 'En küçük iz genişliği',
    kr_cmHint: 'Boş bırakılırsa en küçük genişlik iz genişliğine eşit alınır: daha dar her iz DRC hatası verir.',
    kr_cc: 'Aralık',
    kr_ccHint: 'Dosyaya kural olarak yazılmaz: KiCad’de net sınıfı tablosuna elle girilir.',
    kr_cg: 'Çiftin iki izi arasındaki aralık',
    kr_cu: 'Çiftin bağlaşımsız gidebileceği en büyük uzunluk',
    kr_cs: 'Çift içi uzunluk farkı (skew) sınırı',
    kr_csHint: 'KiCad uzunluk farkını kuralın eşleştiği bütün netler arasında ölçer: her çifte ayrı bir net sınıfı verin.',

    kr_secOpt: 'Dosya seçenekleri',
    kr_ver: 'KiCad sürümü',
    kr_verHint: 'Net sınıfı koşulu KiCad 8 için A.NetClass == \'…\', KiCad 9 ve 10 için A.hasNetclass(\'…\') biçiminde yazılır.',
    kr_hdr: 'Başlık açıklaması (tarih ve kaynak değerler)',
    kr_yes: 'Evet',
    kr_no: 'Hayır',
    kr_optNote: 'Dosyadaki bütün değerler mm cinsindendir. Kural adları ve açıklamalar İngilizcedir, çünkü kural adları KiCad’in DRC raporunda görünür.',

    kr_hero: 'Kural dosyası',
    kr_unitRules: 'kural',
    kr_classes0: 'net sınıfı yok',
    kr_classes1: '1 net sınıfı',
    kr_classesN: '{n} net sınıfı',
    kr_srcCustom: 'elle girilen sınırlar',
    warn_kr_open: 'Aşağıdaki {total} denetimden {n} tanesi dosya kullanılmadan önce gözden geçirilmeli.',
    ok_kr_clear: 'Aşağıdaki {total} denetimin hiçbirinde sorun görünmüyor. Denetimler yalnızca bu sayfadaki değerleri birbiriyle karşılaştırır.',
    kr_blkFile: 'Kural dosyası',
    kr_copy: 'Kuralları kopyala',
    kr_download: '.kicad_dru dosyası olarak indir',
    kr_fileHint: 'Metni KiCad’de Board Setup → Design Rules → Custom Rules sayfasına yapıştırın. Orada kurallarınız varsa (version 1) satırını yinelemeyin ve bu kuralları kendi daha özel kurallarınızdan önceye koyun. KiCad kılavuzu, projenin .kicad_dru dosyasının KiCad dışında düzenlenmemesini ister; indirilen dosya aynı metnin kopyasıdır.',
    kr_orderNote: 'KiCad özel kuralları sondan başa doğru dener ve eşleşen ilk kuralı uygular. Dosyanın sonundaki net sınıfı kuralları bu yüzden o sınıfın netleri için üretici kurallarının yerini alır. Aralıklar (kartın en küçük aralığı ve her net sınıfının aralığı) bu dosyada kural olarak yer almaz, Board Setup’a girilir; çünkü özel bir aralık kuralı, eşleştiği her çiftte net sınıfı aralıklarının yerini alırdı.',
    kr_blkManual: 'KiCad’e elle girilecek değerler',
    kr_manConstraints: 'Board Setup → Design Rules → Constraints: buradaki değerler mutlak alt sınırlardır, özel bir kural bunların altına inemez. Dosyada katmana ya da delik türüne göre ayrı kuralı olan değerlerde en küçüğü yazılmıştır.',
    kr_manClearance: 'En küçük aralık buraya girilir, dosyada kural olarak yer almaz: Board Setup’taki değer yalnızca bir alt sınırdır ve daha büyük net sınıfı aralıklarına dokunmaz; özel bir kural ise onların yerini alırdı. Dış ve iç katman değerlerinden büyük olanı yazılmıştır.',
    kr_manClasses: 'Board Setup → Design Rules → Net Classes: KiCad net sınıflarını kural dosyasında değil projede tutar. Her sınıfı tam bu adla oluşturun, netlerini atayın ve değerleri girin; yönlendirici bu genişlik ve aralıklarla çalışır. Sınıfın aralığı yalnızca burada tanımlanır; dosyada aralık kuralı yoktur.',
    kr_manNoClasses: 'Net sınıfı girilmedi: net sınıfı tablosuna yazılacak değer yok.',
    kr_mClearance: 'En küçük aralık',
    kr_mTrack: 'En küçük iz genişliği',
    kr_mRing: 'En küçük halka genişliği',
    kr_mViaDia: 'En küçük via çapı',
    kr_mHole: 'En küçük delik çapı',
    kr_mHoleToHole: 'Delikler arası en küçük mesafe',
    kr_mEdge: 'Bakır ile kart kenarı arasındaki aralık',
    kr_mSilkHeight: 'Serigrafi: en küçük yazı yüksekliği',
    kr_mSilkLine: 'Serigrafi: en küçük yazı kalınlığı',
    kr_mcClearance: 'aralık {v} mm',
    kr_mcWidth: 'iz genişliği {v} mm',
    kr_mcDpWidth: 'çift iz genişliği {v} mm',
    kr_mcDpGap: 'çift aralığı {v} mm',

    kr_blkChecks: 'Denetimler',
    kr_kNames: 'Net sınıfı adları',
    kr_kNamesOk: 'Girilen net sınıfı adları ({n}) dolu, birbirinden farklı ve kural sözdizimine uygun. KiCad projesindeki adlarla aynı olduklarını siz kontrol edin.',
    kr_kNamesEmpty: '{row}. sınıfın adı boş.',
    kr_kNamesDuplicate: '{row}. sınıfın adı daha önce kullanılmış (adlar büyük-küçük harf ayrımı yapılmadan karşılaştırılır): {name}.',
    kr_kNamesChars: '{row}. sınıfın adında kural sözdiziminin taşıyamadığı bir karakter var: {name}.',
    kr_kNamesFail: 'KiCad kural dilinde tırnak içindeki bir tırnak işaretini yazmanın yolu yoktur; * ve ? joker karakter, virgül ise sınıf ayırıcısıdır. Adlar düzeltilene kadar dosya yazılmaz.',
    kr_kWidth: 'Net sınıflarının iz genişliği',
    kr_kWidthOk: 'Hiçbir net sınıfının en küçük iz genişliği, katmanları için girilen üretici sınırının altında değil.',
    kr_kWidthFail: 'Sınıfın kuralı o netler için üretici kuralının yerini alır; DRC böylece üretilemeyecek bir genişliği kabul eder. İzi genişletin ya da üretici sınırını düzeltin.',
    kr_kClearance: 'Net sınıflarının aralığı',
    kr_kClearanceOk: 'Hiçbir net sınıfının aralığı, Board Setup’a girilecek en küçük aralığın ({lim} mm; dış ve iç üretici sınırının büyüğü) altında değil.',
    kr_kClearanceRow: '{v} mm, Board Setup’a girilecek en küçük aralık {lim} mm: {name}.',
    kr_kClearanceFail: 'Board Setup’taki en küçük aralık bir alt sınırdır: net sınıfı tablosundaki daha küçük bir aralığın etkisi olmaz; üretici sınırının altındaki bir aralık zaten üretilemez. Sınıfın aralığını büyütün ya da üretici sınırını düzeltin.',
    kr_kRow: '{v} mm, üretici sınırı {lim} mm ({layer}): {name}.',
    kr_kGap: 'Diferansiyel çift aralığı',
    kr_kGapOk: 'Her çiftin aralığı hem Board Setup’a girilecek en küçük aralığı hem de sınıfın kendi aralığını karşılıyor.',
    kr_kGapRowFab: 'Çift aralığı {v} mm, Board Setup’a girilecek en küçük aralık {lim} mm: {name}.',
    kr_kGapRowClass: 'Çift aralığı {v} mm, sınıfın kendi aralığı {lim} mm: {name}.',
    kr_kGapFail: 'Çiftin iki izi farklı netlerdir: çift aralığı bu iki net arasında geçerli olan aralıktan küçük olursa DRC çiftin kendisini hata olarak bildirir. Çift aralığını büyütün ya da sınıfın aralığını küçültün.',
    kr_kViaRing: 'Via çapı ve halka genişliği',
    kr_kViaRingOk: 'En küçük delik ({h} mm) ile en küçük çap ({d} mm) arasında {r} mm halka kalıyor; {lim} mm sınırının altında değil.',
    kr_kViaRingWarn: 'En küçük delik ({h} mm) ile en küçük çap ({d} mm) arasında yalnızca {r} mm halka kalıyor; sınır {lim} mm. Üç kuralı birden ancak çapı en az {need} mm olan bir via sağlar: via çapı sınırını {need} mm yapın ya da değerleri üreticinin sayfasından kontrol edin.',
    kr_layerAny: 'bütün katmanlar: dış ve iç sınırın büyüğü',
    kr_layerOuter: 'dış katmanlar',
    kr_layerInner: 'iç katmanlar',

    kr_note: 'Bu dosya, tasarım kuralı denetiminin (DRC) ve yönlendiricinin uyguladığı sınırları belirler; çizilmiş izleri değiştirmez. Kuralları yükledikten sonra DRC’yi çalıştırın. Belirleyici olan, üreticinin güncel yetenek sayfasıdır; hazır değerler o sayfanın belirtilen tarihte okunmuş hâlidir.',
    kr_refs: 'Kaynaklar',
    kr_refSyntax: 'kural sözdizimi: KiCad PCB Editor kılavuzu {v}, “Custom design rules” bölümü (docs.kicad.org)',
    kr_refFab: 'üretici sınırları: {date} tarihinde okunan veri, {name}',
    kr_refTypical: 'delikler arası mesafe ve kart kenarı için önerilen değerler ile serigrafi ipuçlarındaki değerler tipik değerlerdir, üretici verisi değildir',

    err_kr_number: 'Bir değer eksik ya da bu sayfanın kabul ettiği aralığın dışında; bütün sayılar geçerli olana kadar dosya yazılmaz.',
    err_kr_option: 'Bir seçenek bu sayfanın tanımadığı bir değer taşıyor.',
    err_kr_names: 'Bir net sınıfı adı boş, yinelenmiş ya da kural sözdizimine uymuyor; düzeltilene kadar dosya yazılmaz.',
    err_kr_minWidth: 'Bir net sınıfının en küçük iz genişliği, iz genişliğinden büyük.',
    err_kr_viaDia: 'En küçük via çapı, en küçük via deliğinden büyük olmalıdır.',
  },
  en: {
    kr_secFab: 'Fabricator minimums',
    kr_fab: 'Preset',
    kr_fabCustom: 'Custom (values entered by hand)',
    kr_fabHint: 'Choosing a fabricator fills the minimums below from its data; every field can be changed afterwards.',
    kr_fabNote: 'The presets are for 1 oz copper. Where a fabricator lists 1–2 layer boards separately, the outer layers and the pad ring take that (stricter) value. Heavier copper needs larger minimums.',
    kr_tw: 'Minimum track width, outer layers',
    kr_twi: 'Minimum track width, inner layers',
    kr_cl: 'Minimum clearance, outer layers',
    kr_cli: 'Minimum clearance, inner layers',
    kr_clHint: 'Not written as a rule: the larger of the outer and inner value is entered in Board Setup by hand.',
    kr_vh: 'Minimum via hole',
    kr_vd: 'Minimum via diameter',
    kr_ring: 'Minimum annular ring, vias',
    kr_ph: 'Minimum plated hole, pads',
    kr_pring: 'Minimum annular ring, plated pads',
    kr_pringHint: 'Leave empty to write no separate ring rule for pads.',
    kr_hh: 'Minimum hole-to-hole distance',
    kr_hhHint: 'Typical value, not from the fabricator data. Measured from hole edge to hole edge.',
    kr_edge: 'Minimum copper to board edge clearance',
    kr_edgeHint: 'Typical value, not from the fabricator data. For V-scored panels fabricators usually ask for more.',
    kr_sth: 'Minimum silkscreen text height',
    kr_stw: 'Minimum silkscreen line thickness',
    kr_sthHint: 'Leave empty to write no rule for it. A typical value is 1 mm (not from the fabricator data).',
    kr_stwHint: 'Leave empty to write no rule for it. A typical value is 0.15 mm (not from the fabricator data).',

    kr_secClasses: 'Net classes',
    kr_nc: 'Number of net classes',
    kr_nc0: 'None',
    kr_nc1: '1 class',
    kr_nc2: '2 classes',
    kr_nc3: '3 classes',
    kr_nc4: '4 classes',
    kr_classNote: 'Each class gets a track width rule in the file, a differential pair a gap rule as well. The clearance of a class is not written as a rule: it is entered in the net class table by hand. The net class itself is defined in the KiCad project.',
    kr_secC1: 'Net class 1',
    kr_secC2: 'Net class 2',
    kr_secC3: 'Net class 3',
    kr_secC4: 'Net class 4',
    kr_cn: 'Class name',
    kr_cnHint: 'Must be the net class name of the KiCad project: the rule finds the nets by it. The characters " \' \\ * ? , cannot be used.',
    kr_ck: 'Kind',
    kr_ckSignal: 'Signal',
    kr_ckPower: 'Power',
    kr_ckDiff: 'Differential pair',
    kr_cly: 'Layers the rules apply to',
    kr_clyAny: 'All layers',
    kr_clyOuter: 'Outer layers',
    kr_clyInner: 'Inner layers',
    kr_clyInfo: 'The width of a controlled-impedance track depends on the layer. With outer or inner layers selected, the rules of the class apply on those layers only; on the others its nets are checked against the fabricator rules.',
    kr_cw: 'Track width',
    kr_cm: 'Minimum track width',
    kr_cmHint: 'When left empty the minimum equals the track width: any narrower track is a DRC violation.',
    kr_cc: 'Clearance',
    kr_ccHint: 'Not written as a rule: entered by hand in the net class table in KiCad.',
    kr_cg: 'Gap between the two tracks of the pair',
    kr_cu: 'Longest length the pair may run uncoupled',
    kr_cs: 'Intra-pair skew limit',
    kr_csHint: 'KiCad measures skew across all nets the rule matches: give each pair a net class of its own.',

    kr_secOpt: 'File options',
    kr_ver: 'KiCad version',
    kr_verHint: 'The net class condition is written as A.NetClass == \'…\' for KiCad 8 and as A.hasNetclass(\'…\') for KiCad 9 and 10.',
    kr_hdr: 'Header comment (date and source values)',
    kr_yes: 'Yes',
    kr_no: 'No',
    kr_optNote: 'All values in the file are in mm. Rule names and comments are in English, because rule names appear in KiCad’s DRC report.',

    kr_hero: 'Rules file',
    kr_unitRules: 'rules',
    kr_classes0: 'no net classes',
    kr_classes1: '1 net class',
    kr_classesN: '{n} net classes',
    kr_srcCustom: 'minimums entered by hand',
    warn_kr_open: '{n} of the {total} checks below should be looked at before the file is used.',
    ok_kr_clear: 'None of the {total} checks below found a problem. They only compare the values on this page with one another.',
    kr_blkFile: 'Rules file',
    kr_copy: 'Copy the rules',
    kr_download: 'Download as a .kicad_dru file',
    kr_fileHint: 'Paste the text into Board Setup → Design Rules → Custom Rules in KiCad. If you already have rules there, do not repeat the (version 1) line and put these rules before your own more specific ones. The KiCad manual asks that the project’s .kicad_dru file is not edited outside KiCad; the download is a copy of the same text.',
    kr_orderNote: 'KiCad tries custom rules from the last one to the first and uses the first that matches. The net class rules at the end of the file therefore take the place of the fabricator rules for the nets of their class. Clearances (the board minimum and that of each net class) are not rules in this file but are entered in Board Setup, because a custom clearance rule would take the place of the net class clearances of every pair it matches.',
    kr_blkManual: 'To enter by hand in KiCad',
    kr_manConstraints: 'Board Setup → Design Rules → Constraints: the values there are absolute minimums that no custom rule can go below. Where the file has a rule per layer or per kind of hole, the smallest of its values is given.',
    kr_manClearance: 'The minimum clearance is entered here and is not a rule in the file: the Board Setup value is only a floor and leaves larger net class clearances alone, whereas a custom rule would take their place. The larger of the outer and inner layer values is given.',
    kr_manClasses: 'Board Setup → Design Rules → Net Classes: KiCad keeps net classes in the project, not in the rules file. Create each class with exactly this name, assign its nets and enter the values; the router works with these widths and gaps. The clearance of a class is set only here: the file has no clearance rule.',
    kr_manNoClasses: 'No net class was entered, so there is nothing to put into the net class table.',
    kr_mClearance: 'Minimum clearance',
    kr_mTrack: 'Minimum track width',
    kr_mRing: 'Minimum annular ring',
    kr_mViaDia: 'Minimum via diameter',
    kr_mHole: 'Minimum hole diameter',
    kr_mHoleToHole: 'Minimum hole-to-hole distance',
    kr_mEdge: 'Copper to board edge clearance',
    kr_mSilkHeight: 'Silkscreen: minimum text height',
    kr_mSilkLine: 'Silkscreen: minimum text thickness',
    kr_mcClearance: 'clearance {v} mm',
    kr_mcWidth: 'track width {v} mm',
    kr_mcDpWidth: 'pair width {v} mm',
    kr_mcDpGap: 'pair gap {v} mm',

    kr_blkChecks: 'Checks',
    kr_kNames: 'Net class names',
    kr_kNamesOk: 'The net class names entered ({n}) are filled in, differ from one another and fit the rule syntax. That they match the names in the KiCad project is for you to check.',
    kr_kNamesEmpty: 'Class {row} has no name.',
    kr_kNamesDuplicate: 'Class {row} repeats a name used above (names are compared without regard to case): {name}.',
    kr_kNamesChars: 'The name of class {row} holds a character the rule syntax cannot carry: {name}.',
    kr_kNamesFail: 'The KiCad rule language has no way to write a quote inside a quoted string; * and ? are wildcards and the comma separates classes. No file is written until the names are corrected.',
    kr_kWidth: 'Track width of the net classes',
    kr_kWidthOk: 'No net class has a minimum track width below the fabricator minimum entered for its layers.',
    kr_kWidthFail: 'The class rule takes the place of the fabricator rule for those nets, so DRC would accept a width that cannot be built. Widen the track or correct the fabricator minimum.',
    kr_kClearance: 'Clearance of the net classes',
    kr_kClearanceOk: 'No net class has a clearance below the minimum clearance that goes into Board Setup ({lim} mm, the larger of the outer and inner fabricator value).',
    kr_kClearanceRow: '{v} mm against a Board Setup minimum clearance of {lim} mm: {name}.',
    kr_kClearanceFail: 'The minimum clearance of Board Setup is a floor: a smaller clearance in the net class table has no effect, and a clearance below the fabricator minimum could not be built anyway. Increase the clearance of the class or correct the fabricator minimum.',
    kr_kRow: '{v} mm against a fabricator minimum of {lim} mm ({layer}): {name}.',
    kr_kGap: 'Gap of the differential pairs',
    kr_kGapOk: 'The gap of every pair satisfies both the minimum clearance that goes into Board Setup and the clearance of its own class.',
    kr_kGapRowFab: 'Pair gap {v} mm against a Board Setup minimum clearance of {lim} mm: {name}.',
    kr_kGapRowClass: 'Pair gap {v} mm against the class’s own clearance of {lim} mm: {name}.',
    kr_kGapFail: 'The two tracks of a pair are different nets: with a gap below the clearance that applies between them, DRC reports the pair itself as a violation. Widen the gap or reduce the clearance of the class.',
    kr_kViaRing: 'Via diameter and annular ring',
    kr_kViaRingOk: 'The minimum hole ({h} mm) and the minimum diameter ({d} mm) leave a ring of {r} mm, not below the minimum of {lim} mm.',
    kr_kViaRingWarn: 'The minimum hole ({h} mm) and the minimum diameter ({d} mm) leave a ring of only {r} mm; the minimum is {lim} mm. All three rules are met only by a via of at least {need} mm diameter: set the minimum via diameter to {need} mm or check the values against the fabricator’s page.',
    kr_layerAny: 'all layers: the larger of the outer and inner minimum',
    kr_layerOuter: 'outer layers',
    kr_layerInner: 'inner layers',

    kr_note: 'The file sets the limits that the design rule check (DRC) and the router apply; it does not change tracks that are already routed. Run DRC after loading the rules. The fabricator’s current capability sheet decides: the presets are that sheet as it was read on the date given.',
    kr_refs: 'Sources',
    kr_refSyntax: 'rule syntax: KiCad PCB Editor manual {v}, section “Custom design rules” (docs.kicad.org)',
    kr_refFab: 'fabricator minimums: data read {date}, {name}',
    kr_refTypical: 'the values offered for hole-to-hole distance and board edge, and those named in the silkscreen hints, are typical figures, not fabricator data',

    err_kr_number: 'A value is missing or outside the range this page accepts; the file is not written until every number is valid.',
    err_kr_option: 'An option has a value this page does not know.',
    err_kr_names: 'A net class name is empty, repeated or does not fit the rule syntax; the file is not written until it is corrected.',
    err_kr_minWidth: 'The minimum track width of a net class is larger than its track width.',
    err_kr_viaDia: 'The minimum via diameter must be larger than the minimum via hole.',
  },
};

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const nn = (x) => fmt(x, 4);
const note = (key) => `<p class="note">${esc(t(key))}</p>`;

/**
 * t() with values that may be user text: `$` is kept literal (t() uses
 * replaceAll, where `$&` and the like are patterns). User text goes last in
 * `vars`, so a marker typed into a class name is never filled in.
 */
function tv(key, vars) {
  return t(key, Object.fromEntries(Object.entries(vars).map(([k, val]) => [k, String(val).replace(/\$/g, '$$$$')])));
}

/** One sentence (or a few) saying why the check passes or what has to be changed. */
function checkText(c) {
  const x = c.vars;
  const layer = (l) => t(`kr_layer${cap(l)}`);
  switch (c.id) {
    case 'names':
      if (c.status === 'ok') return tv('kr_kNamesOk', { n: x.count });
      return [...x.rows.map((r) => tv(`kr_kNames${cap(r.problem)}`, { row: r.row, name: r.name })), t('kr_kNamesFail')].join(' ');
    case 'width':
      if (c.status === 'ok') return t('kr_kWidthOk');
      return [...x.rows.map((r) => tv('kr_kRow', { v: nn(r.valueMm), lim: nn(r.limitMm), layer: layer(r.layer), name: r.name })), t('kr_kWidthFail')].join(' ');
    case 'clearance':
      // Against the one minimum clearance of Board Setup, whatever layers the class is set to.
      if (c.status === 'ok') return tv('kr_kClearanceOk', { lim: nn(x.floorMm) });
      return [...x.rows.map((r) => tv('kr_kClearanceRow', { v: nn(r.valueMm), lim: nn(r.limitMm), name: r.name })), t('kr_kClearanceFail')].join(' ');
    case 'gap':
      if (c.status === 'ok') return t('kr_kGapOk');
      return [...x.rows.map((r) => tv(r.by === 'class' ? 'kr_kGapRowClass' : 'kr_kGapRowFab', { v: nn(r.valueMm), lim: nn(r.limitMm), name: r.name })), t('kr_kGapFail')].join(' ');
    case 'viaRing':
      return tv(`kr_kViaRing${cap(c.status)}`, { h: nn(x.holeMm), d: nn(x.diaMm), r: nn(x.ringMm), lim: nn(x.limitMm), need: nn(x.needMm) });
    default:
      return '';
  }
}

const checkList = (list) => checks(list.map((c) => [
  c.status === 'ok' ? true : c.status === 'warn' ? 'warn' : false, esc(t(`kr_k${cap(c.id)}`)), esc(checkText(c)),
]));

function render(r) {
  // A name problem stops the file; the check list then says which class it is.
  if (!r.ok) return invalid(r.errors) + (r.checks.length ? block('kr_blkChecks', checkList(r.checks)) : '');
  const s = r.summary;
  const unit = t('kr_unitRules');
  const classes = s.classes === 0 ? t('kr_classes0') : s.classes === 1 ? t('kr_classes1') : t('kr_classesN', { n: String(s.classes) });
  const line = [`KiCad ${s.version}`, s.source === 'custom' ? t('kr_srcCustom') : s.fab.name, classes].join(' · ');
  const total = String(r.checks.length);
  const verdict = s.warnings
    ? messages('warn', ['kr_open'], { kr_open: { n: String(s.warnings), total } })
    : messages('ok', ['kr_clear'], { kr_clear: { total } });

  // The copy button uses the result card's own handler (data-copy); the
  // download is a data: URL, so it needs no script either.
  const actions = `<div class="page-actions">
      <button type="button" class="btn ghost" data-copy="${esc(r.text)}">${icon('copy', 16)}<span class="btn-label">${esc(t('kr_copy'))}</span></button>
      <a class="btn ghost" href="${esc(rulesDataUrl(r.text))}" download="${esc(r.fileName)}">${icon('download', 16)}<span class="btn-label">${esc(t('kr_download'))}</span></a>
    </div>`;

  const board = r.manual.filter((m) => m.place === 'constraints');
  const nets = r.manual.filter((m) => m.place === 'netclass');
  const manual = note('kr_manConstraints')
    + note('kr_manClearance')
    + rows(board.map((m) => [`kr_m${cap(m.id)}`, `${esc(nn(m.valueMm))} mm`]))
    + (nets.length
      ? note('kr_manClasses') + rows(nets.map((c) => [c.name, esc([
        t('kr_mcClearance', { v: nn(c.clearanceMm) }),
        t('kr_mcWidth', { v: nn(c.widthMm) }),
        c.kind === 'diff' && t('kr_mcDpWidth', { v: nn(c.widthMm) }),
        c.kind === 'diff' && t('kr_mcDpGap', { v: nn(c.gapMm) }),
      ].filter(Boolean).join(' · ')), false, true]))
      : note('kr_manNoClasses'));

  const refs = [
    t('kr_refSyntax', { v: s.manual }),
    s.source === 'custom' ? null : tv('kr_refFab', { date: s.fab.accessed, name: `${s.fab.name} (${s.fab.service})` }),
    t('kr_refTypical'),
  ].filter(Boolean);

  return hero('kr_hero', `${s.count} <span class="u">${esc(unit)}</span>`, esc(line), `${s.count} ${unit} · ${line}`)
    + verdict
    // No existing class gives a button row a bottom margin, so the file itself
    // sits in a second .block (as on the fabrication notes page).
    + block('kr_blkFile', `${actions}${note('kr_fileHint')}`)
    + `<div class="block"><pre class="formula notes">${esc(r.text)}</pre>${note('kr_orderNote')}</div>`
    + block('kr_blkManual', manual)
    + block('kr_blkChecks', checkList(r.checks))
    + note('kr_note')
    + `<p class="refs">${esc(t('kr_refs'))}: ${refs.map(esc).join(' · ')}</p>`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const opts = (prefix, values) => values.map((value) => ({ value: String(value), label: `${prefix}${cap(String(value))}` }));
const number = (key, label, def, range, extra = {}) => ({
  key, type: 'number', label, default: def, units: ['mm'], min: RANGES[range][0], max: RANGES[range][1], ...extra,
});

/** Engine option → field key, for the values a fabricator preset fills. */
const FIELD_OF = {
  trackOuterMm: 'tw', trackInnerMm: 'twi', clearOuterMm: 'cl', clearInnerMm: 'cli', viaHoleMm: 'vh', viaDiaMm: 'vd', viaRingMm: 'ring', padHoleMm: 'ph', padRingMm: 'pring',
};
const presetSet = (id) => Object.fromEntries(Object.entries(fabPreset(id)).map(([k, val]) => [FIELD_OF[k], val]));

const classCount = (v) => Math.min(Math.max(Math.floor(Number(v.nc)) || 0, 0), MAX_CLASSES);

// The numbers of a class are required while its section is shown; the pair
// fields only for a differential pair. The engine does not look at the others.
const classSection = (i) => {
  const d = CLASS_DEFAULTS[i - 1];
  const pair = (v) => v[`c${i}k`] === 'diff';
  return {
    title: `kr_secC${i}`,
    show: (v) => classCount(v) >= i,
    fields: [
      { key: `c${i}n`, type: 'text', label: 'kr_cn', default: d.name, hint: 'kr_cnHint' },
      { key: `c${i}k`, type: 'choice', label: 'kr_ck', default: d.kind, options: opts('kr_ck', KINDS) },
      { key: `c${i}l`, type: 'choice', label: 'kr_cly', default: d.layer, info: 'kr_clyInfo', options: opts('kr_cly', LAYERS) },
      number(`c${i}w`, 'kr_cw', d.widthMm, 'widthMm'),
      number(`c${i}m`, 'kr_cm', '', 'minWidthMm', { optional: true, hint: 'kr_cmHint' }),
      number(`c${i}c`, 'kr_cc', d.clearanceMm, 'clearanceMm', { hint: 'kr_ccHint' }),
      number(`c${i}g`, 'kr_cg', d.gapMm ?? 0.2, 'gapMm', { show: pair }),
      number(`c${i}u`, 'kr_cu', '', 'uncoupledMm', { optional: true, show: pair }),
      number(`c${i}s`, 'kr_cs', '', 'skewMm', { optional: true, show: pair, hint: 'kr_csHint' }),
    ],
  };
};

/** Today's date as the header comment writes it (local time). */
function today() {
  const d = new Date();
  const two = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
}

export default {
  id: 'kicadrules',
  strings,
  render,
  sections: [
    {
      title: 'kr_secFab',
      note: 'kr_fabNote',
      fields: [
        { key: 'fab', type: 'select', label: 'kr_fab', default: DEFAULTS.fab, hint: 'kr_fabHint',
          options: [...FABS.map((f) => ({ value: f.id, label: f.name, raw: true, set: presetSet(f.id) })), { value: 'custom', label: 'kr_fabCustom' }] },
        number('tw', 'kr_tw', DEFAULTS.trackOuterMm, 'trackOuterMm'),
        number('twi', 'kr_twi', DEFAULTS.trackInnerMm, 'trackInnerMm'),
        // Not written as rules: they go into the by-hand list (the larger of the two) and feed the checks.
        number('cl', 'kr_cl', DEFAULTS.clearOuterMm, 'clearOuterMm', { hint: 'kr_clHint' }),
        number('cli', 'kr_cli', DEFAULTS.clearInnerMm, 'clearInnerMm', { hint: 'kr_clHint' }),
        number('vh', 'kr_vh', DEFAULTS.viaHoleMm, 'viaHoleMm'),
        number('vd', 'kr_vd', DEFAULTS.viaDiaMm, 'viaDiaMm'),
        number('ring', 'kr_ring', DEFAULTS.viaRingMm, 'viaRingMm'),
        number('ph', 'kr_ph', DEFAULTS.padHoleMm, 'padHoleMm'),
        number('pring', 'kr_pring', DEFAULTS.padRingMm, 'padRingMm', { optional: true, hint: 'kr_pringHint' }),
        number('hh', 'kr_hh', TYPICAL.holeToHoleMm, 'holeToHoleMm', { hint: 'kr_hhHint' }),
        number('edge', 'kr_edge', TYPICAL.edgeMm, 'edgeMm', { hint: 'kr_edgeHint' }),
        // Empty by default: no silkscreen rule unless the reader asks for one (typical values are in the hints).
        number('sth', 'kr_sth', '', 'silkHeightMm', { optional: true, hint: 'kr_sthHint' }),
        number('stw', 'kr_stw', '', 'silkLineMm', { optional: true, hint: 'kr_stwHint' }),
      ],
    },
    {
      title: 'kr_secClasses',
      note: 'kr_classNote',
      fields: [
        { key: 'nc', type: 'select', label: 'kr_nc', default: String(DEFAULTS.classes.length), options: opts('kr_nc', [0, 1, 2, 3, 4]) },
      ],
    },
    classSection(1),
    classSection(2),
    classSection(3),
    classSection(4),
    {
      title: 'kr_secOpt',
      note: 'kr_optNote',
      fields: [
        { key: 'ver', type: 'choice', label: 'kr_ver', default: DEFAULTS.version, hint: 'kr_verHint',
          options: VERSIONS.map((ver) => ({ value: ver, label: `KiCad ${ver}`, raw: true })) },
        { key: 'hdr', type: 'choice', label: 'kr_hdr', default: DEFAULTS.header ? 'yes' : 'no',
          options: [{ value: 'yes', label: 'kr_yes' }, { value: 'no', label: 'kr_no' }] },
      ],
    },
  ],

  compute(v) {
    const classes = [];
    for (let i = 1; i <= classCount(v); i++) {
      classes.push({
        name: v[`c${i}n`], kind: v[`c${i}k`], layer: v[`c${i}l`], widthMm: v[`c${i}w`], minWidthMm: v[`c${i}m`], clearanceMm: v[`c${i}c`],
        gapMm: v[`c${i}g`], uncoupledMm: v[`c${i}u`], skewMm: v[`c${i}s`],
      });
    }
    return kicadRules({
      version: v.ver,
      header: v.hdr === 'yes',
      date: today(),
      fab: v.fab,
      trackOuterMm: v.tw,
      trackInnerMm: v.twi,
      clearOuterMm: v.cl,
      clearInnerMm: v.cli,
      viaHoleMm: v.vh,
      viaDiaMm: v.vd,
      viaRingMm: v.ring,
      padHoleMm: v.ph,
      padRingMm: v.pring,
      holeToHoleMm: v.hh,
      edgeMm: v.edge,
      silkHeightMm: v.sth,
      silkLineMm: v.stw,
      classes,
    });
  },
};
