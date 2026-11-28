import {
  tvsCheck, fuseCheck, ptcCheck, reversePolarity,
  ESD_PEAK_A_PER_KV, ESD_30NS_A_PER_KV,
} from '../engine/protection.js';
import { heroes, rows, block, steps, messages, invalid, checks } from '../ui/calculator.js';
import { tx } from '../ui/math.js';
import { fmt, fixed, si, siHtml, esc } from '../ui/format.js';
import { t, locale } from '../i18n.js';
import { svg, rect, path, text, arrow, poly, wire, node, ground, terminal, twoTerm, mosfet, dimV } from '../ui/svg.js';

const strings = {
  tr: {
    pr_mode: 'Koruma elemanı',
    pr_mTvs: 'TVS / ESD diyotu',
    pr_mFuse: 'Sigorta',
    pr_mPtc: 'Sıfırlanabilir sigorta (PTC)',
    pr_mRev: 'Ters kutup',
    pr_ex: 'Örnek değerleri yükle',
    pr_exInfo: 'Alanları hazır bir örneğin değerleriyle doldurur ve ilgili koruma elemanına geçer. Bu alanlara kendi girdiğiniz değerler değişir.',
    pr_exLine: '12 V sinyal hattı, 8 kV ESD',
    pr_exUsb: 'USB 2.0 veri hattı, 8 kV ESD',
    pr_exSurge: '24 V giriş, 1 kV darbe (surge)',
    pr_exFuse: '5 V / 2 A sigorta',
    pr_exPtc: '5 V / 0,5 A port, 60 °C’de PTC',
    pr_exRev: '12 V ters kutup',
    pr_exRev24: '24 V ters kutup, gate zeneriyle',

    pr_secLine: 'Hat ve korunan entegre',
    pr_vl: 'Hattın en yüksek normal gerilimi (Vline)',
    pr_vlInfo: 'Hattın normal çalışmada taşıdığı en yüksek gerilim; toleransı ve dayanması istenen durumları (ör. portun dayanması gereken bir besleme kısa devresi) ekleyin. İki yöne salınan hatlarda büyüklüğü girin.',
    pr_vabs: 'Entegre pininin mutlak en yüksek gerilimi (Vabs)',
    pr_vabsInfo: 'Korunan pinin, entegrenin veri sayfasındaki mutlak en yüksek (absolute maximum) gerilimi. Bu bir DC sınırıdır; nanosaniyeler süren bir darbe için temkinli bir ölçüttür. Entegre üreticisi pin için geçici durum (TLP) dayanımı veriyorsa onu girin.',
    pr_secTvs: 'TVS veri sayfası',
    pr_vrwm: 'Çalışma (stand-off) gerilimi (VRWM)',
    pr_vrwmInfo: 'Bu gerilime kadar TVS iletmez, yalnızca küçük bir kaçak akım çeker.',
    pr_vbr: 'Kırılma gerilimi (VBR)',
    pr_vbrInfo: 'Test akımındaki (çoğunlukla 1 mA) kırılma gerilimi. Model, VBR’den aşağıdaki kenetleme noktasına çizilen bir doğrudur. En küçük VBR ile doğru daha dik, en büyük VBR ile daha yukarıdan başlar: pay azsa toleransın iki ucunu da deneyin. Geri tutmalı (snapback) parçalar VBR’nin altında kenetler; bu model onları anlatmaz, kenetleme gerilimini TLP eğrisinden okuyun.',
    pr_vc: 'IPP akımındaki kenetleme gerilimi (VC)',
    pr_vcInfo: 'Veri sayfasından bir nokta: kenetleme gerilimi VC ve bunun verildiği IPP akımı (8/20 µs tablosu ya da ESD parçalarında TLP eğrisinin bir noktası). Olayınızın akımına en yakın noktayı alın: dinamik direnç, VBR’den bu noktaya giden doğrunun eğimidir.',
    pr_ipp: 'Bu noktanın darbe tepe akımı (IPP)',
    pr_ippInfo: 'Darbe (surge) hesabında olayın akımı, dayanım değeri olarak bu akımla karşılaştırılır; bu yüzden 8/20 µs dalga şekli için verilen IPP’yi girin. 10/1000 µs için tanımlanan parçalar (SMAJ, SMBJ, SMCJ…) çok daha kısa olan 8/20 µs darbede daha yüksek akım taşır: o değeri veri sayfasındaki darbe dayanımı eğrisinden alın.',
    pr_secEvent: 'Olay',
    pr_ev: 'Olay türü',
    pr_evEsd: 'ESD (IEC 61000-4-2)',
    pr_evSurge: 'Darbe (surge, IEC 61000-4-5)',
    pr_evCustom: 'Tepe akım',
    pr_kv: 'Temas deşarjı seviyesi',
    pr_kvInfo: 'IEC 61000-4-2 temas deşarjı. Üreteç (150 pF / 330 Ω) akım dalga şekliyle tanımlanır: test seviyesinin her kV’u için ilk tepe 3,75 A, 30 ns’de 2 A, 60 ns’de 1 A; yükselme süresi 0,8 ns. 8 kV’ta: 30 A, 16 A ve 8 A.',
    pr_kvr: 'TVS’nin ESD dayanımı (temas)',
    pr_kvrInfo: 'TVS veri sayfasındaki IEC 61000-4-2 temas deşarjı dayanımı. Girilirse test seviyesiyle karşılaştırılır.',
    pr_lp: 'TVS bağlantısının endüktansı (Lp)',
    pr_lpHint: 'Kabaca iz boyunun her mm’si için 1 nH, artı via.',
    pr_lpInfo: 'Hattan TVS padine giden kol ile TVS’nin toprak padinden düzleme giden yolun toplamı. 0,8 ns’lik yükselme sırasında bu endüktans, kenetleme geriliminin üzerine yaklaşık L·Ipk/tr ekler. Bir tahmindir: akımın tamamı için %10–90 yükselme süresi kullanılır.',
    pr_voc: 'Açık devre darbe gerilimi (VOC)',
    pr_vocInfo: 'IEC 61000-4-5 birleşik dalga üretecinin test seviyesi: 1,2/50 µs açık devre gerilimi, 8/20 µs kısa devre akımı. Standardın seviyeleri 0,5, 1, 2 ve 4 kV’tur; her port için seviyeyi ürün standardı belirler.',
    pr_zs: 'Kaynak empedansı (kuplaj)',
    pr_zs2: '2 Ω · güç hattı, hat–hat',
    pr_zs12: '12 Ω · güç hattı, hat–toprak',
    pr_zs42: '42 Ω · ekransız, simetrik olmayan veri/sinyal hattı',
    pr_ipk: 'TVS’den geçen tepe akım',
    pr_secCap: 'Hattın yüklenmesi',
    pr_ct: 'TVS kapasitesi (C)',
    pr_ctInfo: 'TVS’nin hatta eklediği kapasite (Cj, hat–toprak). İki ucu Z0 ile sonlandırılmış bir hatta Z0/2 ile alçak geçiren süzgeç oluşturur: f−3dB = 1/(π·Z0·C).',
    pr_z0: 'Hat empedansı (Z0)',
    pr_bw: 'Sinyal bant genişliği',
    pr_bwInfo: 'Hattın geçirmesi gereken en yüksek frekans; ör. yükselme süresi tr olan bir kenar için 0,35/tr. Girilirse −3 dB köşe frekansıyla karşılaştırılır.',

    pr_secCkt: 'Devre',
    pr_iop: 'Çalışma akımı (Iop)',
    pr_iopInfo: 'Normal çalışmadaki en yüksek sürekli akım (RMS).',
    pr_vckt: 'Devre gerilimi (V)',
    pr_vcktInfo: 'Açmış sigortanın ya da açmış PTC’nin üzerinde kalan en yüksek gerilim: besleme geriliminin en yüksek değeri.',
    pr_fm: 'Arıza (kısa devre) akımı',
    pr_fmI: 'Doğrudan gir',
    pr_fmR: 'Çevrim direncinden',
    pr_ifl: 'Arıza akımı (Ifault)',
    pr_iflInfo: 'Kaynağın, koruma elemanından sonraki bir kısa devreye verebildiği akım.',
    pr_rl: 'Kaynak + çevrim direnci (Rloop)',
    pr_rlInfo: 'Kaynağın iç direnci ile kablo, konnektör, izler ve kısa devrenin kendisi: Ifault = V/Rloop. Akım sınırlamalı bir kaynak bunun yerine sınır akımını verir; o durumda akımı doğrudan girin.',
    pr_taInfo: 'Sigorta ve PTC için yalnızca bilgi amaçlıdır: araç, parçanızın değer düşürme eğrisini bilemez. Bu sıcaklıktaki katsayıyı veri sayfasından okuyup ilgili alana girin. Ters kutup hesabında jonksiyon sıcaklığı bu değerden başlar.',
    pr_secFuse: 'Aday sigorta',
    pr_in: 'Anma akımı (In)',
    pr_der: 'Sürekli çalışma için değer düşürme',
    pr_derInfo: 'Sigortanın 25 °C’de sürekli taşıması istenen akımın anma akımına oranı. UL’ye göre tanımlanan sigortalar için yaygın öneri %75’tir; IEC’ye göre tanımlanan sigortalar anma akımının tamamını (%100) taşıyacak biçimde tanımlanır. Sigortanın veri sayfasına uyun.',
    pr_kt: 'Sıcaklık düzeltme katsayısı (Kt)',
    pr_ktHint: 'Veri sayfasındaki eğriden, ortam sıcaklığı için okunur; 25 °C’nin üzerinde genellikle 1’den küçüktür.',
    pr_i2t: 'Anma erime I²t değeri',
    pr_i2tInfo: 'Sigorta telini eriten enerji; veri sayfasından alınır (A²s). Gecikmeli (slow-blow) sigortalarda bu değer, aynı anma akımındaki hızlı sigortalara göre çok daha büyüktür.',
    pr_vr: 'Anma gerilimi',
    pr_ibr: 'Kesme kapasitesi',
    pr_ibrInfo: 'Sigortanın anma geriliminde güvenle kesebildiği en yüksek akım. Bunun üzerinde sigorta ark yapabilir, parçalanabilir ya da iletmeye devam edebilir.',
    pr_secPulse: 'Ani akım darbesi',
    pr_shape: 'Darbe biçimi',
    pr_shRect: 'Dikdörtgen · I²t = Ip²·t',
    pr_shTri: 'Üçgen / testere dişi · Ip²·t/3',
    pr_shSine: 'Yarım sinüs · Ip²·t/2',
    pr_shExp: 'Üstel sönüm (kondansatör şarjı) · Ip²·τ/2',
    pr_ip: 'Darbe tepe akımı (Ip)',
    pr_ipInfo: 'Sigortadan geçen ani akımın tepe değeri; ani akım yoksa 0 girin. Yol direnci üzerinden şarj olan bir kondansatörün tepe akımını ve zaman sabitini “Ani akım ve yumuşak başlatma” aracı verir.',
    pr_tp: 'Darbe süresi (t)',
    pr_tau: 'Zaman sabiti (τ)',
    pr_np: 'Ürün ömrü boyunca darbe sayısı',
    pr_npInfo: 'Yinelenen darbeler sigorta telini yorar; bu yüzden anma erime I²t değerinin yalnızca bir bölümü kullanılabilir: 100 000 darbe için %22, 10 000 için %29, 1 000 için %38, 100 için %48. Bunlar üreticilerin verdiği tipik değerlerdir (Littelfuse “Fuseology”); kendi sigortanızın veri sayfasına bakın, darbe için ayrı bir eğri veriyor olabilir.',
    pr_npOwn: 'Kendi katsayım',
    pr_pf: 'Darbe katsayısı (Fp)',
    pr_pfInfo: 'Bir darbenin kullanabileceği anma erime I²t payı; sigortanın veri sayfasındaki darbe eğrisinden alınır.',
    pr_secPtc: 'PTC veri sayfası',
    pr_ih: '25 °C’de tutma akımı (Ihold)',
    pr_itr: '25 °C’de açma akımı (Itrip)',
    pr_kd: 'Ortam sıcaklığındaki ısıl değer düşürme (kT)',
    pr_kdHint: 'Veri sayfasındaki tablodan okunur. Tutma akımı sıcaklıkla belirgin biçimde düşer; 85 °C dolayında çoğu parçada kabaca yarıya iner.',
    pr_vm: 'En yüksek gerilim (Vmax)',
    pr_im: 'En yüksek arıza akımı (Imax)',
    pr_r1: 'Açma sonrası en yüksek direnç (R1max)',
    pr_r1Info: 'Açtıktan ya da lehimlendikten bir saat sonraki direnç. Başlangıç direncinden yüksektir; gerilim düşümü için bu değer kullanılır.',
    pr_pd: 'Açmış durumdaki güç kaybı (Pd)',
    pr_pdInfo: 'Açmış PTC’nin sıcak kalmak için harcadığı tipik güç. Üzerinde devre geriliminin tamamı varken akmaya devam eden akım yaklaşık Pd/V kadardır.',
    pr_secSupply: 'Besleme ve yük',
    pr_vin: 'Besleme gerilimi, en yüksek (Vin)',
    pr_vinInfo: 'Tolerans ve gate’in dayanması gereken geçici durumlar dahil en yüksek giriş gerilimi. Gate sürmesi besleme gerilimiyle birlikte düşer: kontrolü en düşük besleme gerilimi için de yineleyin.',
    pr_il: 'Yük akımı (I)',
    pr_secDiode: 'Seri Schottky diyot',
    pr_vf: 'Bu akımdaki ileri gerilim (VF)',
    pr_vfInfo: 'VF–IF eğrisinden, yük akımı ve beklenen jonksiyon sıcaklığı için okunur. Diyot ısındıkça VF düşer, ters kaçak akımı ise hızla artar.',
    pr_rjd: 'Diyot RθJA',
    pr_rjInfo: 'Kendi kartınızdaki jonksiyon–ortam ısıl direnci. Veri sayfasındaki değer üreticinin test kartı içindir; daha az bakırla daha yüksek olur.',
    pr_secFet: 'P-kanal MOSFET',
    pr_rds: 'Mevcut gate sürmesindeki RDS(on)',
    pr_rdsInfo: 'Veri sayfasında, devrenizin ulaşabildiği VGS için verilen satırdaki değer. RDS(on) sıcaklıkla artar: beklenen jonksiyon sıcaklığındaki değeri kullanın (normalize RDS(on) eğrisi).',
    pr_vgr: 'Bu RDS(on) değerinin verildiği VGS',
    pr_vth: 'Eşik gerilimi, en yüksek (|VGS(th)|)',
    pr_vthInfo: 'Eşik geriliminde MOSFET iletmeye yeni başlar (veri sayfası bunu 250 µA gibi küçük bir akımda ölçer). Gate sürmesi, eşiğin epeyce üzerinde olan ve RDS(on) değerinin verildiği VGS’ye ulaşmalıdır.',
    pr_vgm: 'Gate–source gerilimi, mutlak en yüksek (|VGS|max)',
    pr_rjm: 'MOSFET RθJA',
    pr_zen: 'Gate zener kenetlemesi',
    pr_zenNo: 'Yok',
    pr_zenYes: 'Var',
    pr_zenInfo: 'Gate ile source arasına zener, gate ile toprak arasına direnç. Besleme, VGS sınırını aşabiliyorsa gerekir; gate sürmesi bu durumda zener gerilimiyle sınırlanır.',
    pr_vz: 'Zener gerilimi (VZ)',
    pr_rg: 'Gate direnci (RG)',
    pr_tjm: 'İzin verilen en yüksek Tj',

    pr_hClamp: 'Entegredeki kenetleme gerilimi',
    pr_hClamp30: '30 ns’deki kenetleme gerilimi',
    pr_hIpk: 'TVS’den geçen tepe akım',
    pr_hInMin: 'En küçük sigorta anma akımı',
    pr_hCand: 'Aday sigorta',
    pr_hHoldT: 'Ortam sıcaklığındaki tutma akımı',
    pr_hTripT: 'Ortam sıcaklığındaki açma akımı',
    pr_hPd: 'Schottky diyottaki kayıp',
    pr_hPm: 'P-MOSFET’teki kayıp',
    pr_subPass: 'Vabs {abs} · pay {m}',
    pr_subOver: 'Vabs {abs} · {m} aşılıyor',
    pr_subIpp: 'IPP {ipp} · oran {x}',
    pr_subCandOk: 'uygun: {n} kontrolün hepsi geçti',
    pr_subCandWarn: 'başarısız kontrol yok; {w} uyarı var',
    pr_subCandBad: 'uygun değil: {n} kontrolden {f} tanesi başarısız',
    pr_subHold: 'Iop {iop} · pay {m}',
    pr_subHoldBad: 'Iop {iop} · {m} yetersiz',
    pr_subTrip: 'arıza akımı {i} = {x} × Itrip(T)',
    pr_subLoss: '{dv} düşüm · giriş gücünün {x} kadarı · Tj {tj}',

    ok_pr_tvs: 'Kenetleme gerilimi Vabs = {abs} sınırının altında kalıyor: {i} tepe akımında {m} pay var.',
    ok_pr_tvsEsd: 'Kenetleme gerilimi Vabs = {abs} sınırının altında kalıyor: ilk tepede ({i}) {m}, 30 ns’de ({i30}) {m30} pay var.',
    ok_pr_tvsOff: '{voc} darbe gerilimi VBR = {vbr} değerine ulaşmıyor: TVS iletmez ve hat {voc} görür; bu değer Vabs = {abs} sınırının altında.',
    ok_pr_fuse: '{in} sigorta buradaki bütün kontrollerden geçiyor. {iop} için en küçük anma akımı {min}.',
    ok_pr_ptc: 'PTC bu sıcaklıkta {iht} tutuyor; çalışma akımına göre pay {m}. {i} arıza akımı açma akımının {x} katı.',
    ok_pr_rev: 'P-MOSFET’te kayıp {pm}, diyotta {pd}: {saved} daha az; diyot kaybının {x} kadarı kazanılıyor.',
    err_pr_rwm: 'VRWM = {rwm}, {line} hat geriliminin altında: diyot normal çalışmada iletir ya da kaçak akım çeker, ısınır ve hattı yükler. VRWM değeri hattın en yüksek normal gerilimine eşit ya da ondan büyük bir parça seçin.',
    err_pr_clamp: '{i} tepe akımında kenetleme gerilimi {v}: Vabs = {abs} sınırının {over} üzerinde. Yardımcı olanlar: kenetleme gerilimi daha düşük bir TVS (daha düşük VBR ya da daha küçük dinamik direnç; genellikle daha büyük bir parça), TVS ile entegre arasına seri direnç ya da entegrenin yanında ikinci bir koruma kademesi.',
    err_pr_clampOff: '{voc} darbe gerilimi VBR = {vbr} değerine ulaşmıyor: TVS iletmez ve hat {voc} geriliminin tamamını görür; bu değer Vabs = {abs} sınırının üzerinde. Bu TVS pini korumaz: kırılma ve kenetleme gerilimi Vabs’ın altında olan bir parça seçin.',
    err_pr_clamp30: '30 ns’de ({i30}) bile kenetleme gerilimi {v30}: Vabs = {abs} sınırının {over} üzerinde (ilk tepe: {i} akımda {v}). Yardımcı olanlar: kenetleme gerilimi daha düşük bir TVS, pinin kendi korumasına kalan akımı sınırlamak için TVS ile entegre arasına seri direnç ya da entegrenin yanında ikinci bir kademe. Mutlak en yüksek gerilim bir DC sınırıdır ve onlarca nanosaniyelik bir darbe için temkinli kalır: entegre üreticisi pin için geçici durum (TLP) sınırı veriyorsa onunla karşılaştırın.',
    err_pr_clampPk: 'İlk tepede ({i}) kenetleme gerilimi {v}: Vabs = {abs} sınırının {over} üzerinde. 30 ns’de {v30} değerine, sınırın altına iner. Tepe yaklaşık bir nanosaniye sürer, ama pinin ilk gördüğü kısımdır: dinamik direnci daha küçük bir TVS, TVS ile entegre arasına seri direnç ya da entegrenin yanında ikinci bir kademe bu değeri düşürür.',
    err_pr_ipp: 'Darbe TVS’den {i} geçiriyor: bu, IPP = {ipp} darbe tepe akımının {x} kadarı. Parça aşırı yüklenir; yukarıdaki kenetleme gerilimi de veri sayfası noktasının ötesine uzatılmış bir tahmindir. 8/20 µs dayanımı daha yüksek bir TVS seçin ya da akımı TVS’den önce sınırlayın (seri empedans; varistör ya da gaz deşarj tüpü gibi kaba bir ilk kademe).',
    warn_pr_ipp: '{i} tepe akımı, veri sayfası noktası IPP = {ipp} değerinin üzerinde: kenetleme gerilimi bu noktanın ötesine uzatılarak bulundu. Parçanın dayanıp dayanmayacağı dalga şekline bağlıdır: veri sayfasındaki darbe dayanımı eğrisiyle karşılaştırın.',
    err_pr_esdr: 'TVS’nin temas deşarjı dayanımı {r}; test seviyesi {lvl}. Parçanın kendisi hasar görebilir: dayanımı test seviyesine eşit ya da ondan yüksek bir parça seçin.',
    warn_pr_cap: 'TVS kapasitesi −3 dB köşe frekansını {fc} değerine indiriyor; sinyal bant genişliği {bw}. Hat, sinyalin kendi bandı içinde 3 dB’den fazla kaybeder: kapasitesi daha düşük bir parça seçin.',
    warn_pr_vbrLow: 'VBR = {vbr}, VRWM = {rwm} değerinden büyük değil. Veri sayfalarında kırılma gerilimi her zaman çalışma geriliminden yüksektir: iki alanı kontrol edin.',
    err_pr_rate: 'Sigortanın anma akımı {in}; {iop} için gereken en küçük değer {min}. Sigorta anma akımına fazla yakın çalışır, yaşlanır ve arıza yokken açabilir. En küçük değere eşit ya da ondan büyük ilk anma akımını seçin.',
    err_pr_i2t: 'Erime I²t değeri {m}; bu darbe için gereken {req}. Her ani akım darbesi bu değerin {use} kadarını kullanıyor; bu darbe sayısı için izin verilen pay {pf}. Sigorta yorulur ve arıza yokken açar: gecikmeli (slow-blow) bir tip ya da daha yüksek anma akımı seçin veya ani akımı sınırlayın.',
    err_pr_volt: 'Anma gerilimi {vr}, {v} devre geriliminin altında: sigorta açarken arkı söndüremeyebilir. Anma gerilimi en az devre gerilimi kadar olan (devre DC ise DC için tanımlı) bir sigorta seçin.',
    err_pr_brk: '{i} arıza akımı, {ibr} kesme kapasitesinin üzerinde: sigorta parçalanabilir ya da iletmeye devam edebilir. Kesme kapasitesi daha yüksek bir sigorta seçin ya da arıza akımını sınırlayın.',
    err_pr_opens: '{i} arıza akımı, {in} anma akımından büyük değil: sigorta anma akımını taşır, dolayısıyla bu arızada hiç açmaz. Kaynak yeterli akım veremiyor: daha küçük bir sigorta ya da elektronik akım sınırlama kullanın.',
    warn_pr_opens: 'Arıza akımı anma akımının yalnızca {x} katı ({in} sigortaya karşı {i}). Sigorta, anma akımına yakın akımlarda yavaş açar: saniyeler ya da daha uzun sürer. Pratik kural olarak arıza akımı anma akımının en az {k} katı olmalıdır; gerçek açma süresi zaman–akım eğrisinden okunur.',
    err_pr_holdBand: '{iop} çalışma akımı, bu sıcaklıktaki tutma akımının ({iht}) üzerinde, açma akımının ({itt}) altında: PTC normal çalışmada açabilir de açmayabilir de. Tutma akımı daha yüksek bir parça seçin.',
    err_pr_holdTrip: '{iop} çalışma akımı, bu sıcaklıktaki açma akımının ({itt}) üzerinde: PTC normal çalışmada açar. Tutma akımı daha yüksek bir parça seçin.',
    err_pr_tripBand: '{i} arıza akımı, tutma akımı ({iht}) ile açma akımı ({itt}) arasında: PTC açabilir de açmayabilir de; açarsa da yavaş açar. Açma akımı daha düşük bir parça seçin ya da devrenin bu akıma korumasız dayanıp dayanmadığını kontrol edin.',
    err_pr_tripNo: '{i} arıza akımı, {iht} tutma akımından büyük değil: PTC bu arızada hiç açmaz.',
    err_pr_imax: '{i} arıza akımı Imax = {im} değerinin üzerinde: PTC açarken hasar görebilir. Imax değeri daha yüksek bir parça seçin ya da arıza akımını sınırlayın.',
    err_pr_vmax: '{v} devre gerilimi Vmax = {vm} değerinin üzerinde: PTC açtığında gerilimin tamamı üzerinde kalır ve parça hasar görebilir. Devre gerilimine uygun bir parça seçin.',
    warn_pr_fetWorse: 'Bu RDS(on) ile MOSFET’teki kayıp {pm}; diyottaki {pd} değerinden az değil. MOSFET’in işe yaraması için RDS(on) değeri daha düşük bir parça gerekir.',
    err_pr_drive: '{vgs} gate sürmesi, en çok {vth} olabilen eşik gerilimini aşmıyor: MOSFET hiç açmayabilir. Yük akımı bu durumda gövde diyotundan geçer; düşüm ve kayıp burada hesaplanandan çok daha yüksek olur. Eşik gerilimi daha düşük bir parça seçin.',
    warn_pr_drive: '{vgs} gate sürmesi, bu RDS(on) değerinin verildiği {vgr} değerinin altında (eşik gerilimi en çok {vth}): MOSFET tam açmaz, direnci girilen değerden yüksek olur. Veri sayfasında gate sürmenizin ulaştığı satırdaki RDS(on) değerini kullanın ya da lojik seviyeli bir parça seçin.',
    err_pr_vgs: '{vin} besleme gerilimi, gate sınırı |VGS|max = {vgm} değerinin üzerinde: zener kenetlemesi gerekli. Gate ile source arasına bir zener, gate ile toprak arasına bir direnç koyun.',
    err_pr_vz: '{vz} zener gerilimi, gate sınırı |VGS|max = {vgm} değerinin üzerinde: {vin} beslemede gate’i korumaz. Daha düşük gerilimli bir zener seçin.',
    err_pr_tjd: 'Diyotun jonksiyon sıcaklığı {tj}; izin verilen {max}. Daha fazla bakır, daha büyük bir kılıf ya da MOSFET’li çözüm gerekir.',
    err_pr_tjm: 'MOSFET’in jonksiyon sıcaklığı {tj}; izin verilen {max}. Daha düşük RDS(on), daha fazla bakır ya da daha büyük bir kılıf gerekir.',
    err_pr_positive: 'Değerler sıfırdan büyük olmalı (değer düşürme ve darbe katsayısı en çok %100).',
    err_pr_vcLow: 'Kenetleme gerilimi VC, kırılma gerilimi VBR’den büyük olmalı: yoksa dinamik direnç bulunamaz. Geri tutmalı (snapback) parçalar VBR’nin altında kenetler ve bu modelle anlatılamaz; kenetleme gerilimini TLP eğrisinden okuyun.',
    err_pr_tripLow: 'Açma akımı tutma akımından büyük olmalı.',
    err_pr_dropHigh: 'Gerilim düşümü besleme gerilimi kadar: yüke gerilim kalmıyor. VF, RDS(on) ve yük akımını kontrol edin.',
    err_pr_range: 'Değerler hesaplanabilecek aralığın dışında.',

    pr_checks: 'Kontroller',
    pr_margin: 'pay',
    pr_ckRwm: 'VRWM ≥ Vline: diyot normal çalışmada iletmez',
    pr_ckClamp: 'Tepe akımdaki kenetleme gerilimi ≤ Vabs',
    pr_ckClampPk: 'İlk tepedeki kenetleme gerilimi ≤ Vabs',
    pr_ckClamp30: '30 ns’deki kenetleme gerilimi ≤ Vabs',
    pr_ckIpp: 'Tepe akım ≤ TVS’nin IPP değeri',
    pr_ckEsdr: 'TVS’nin ESD dayanımı ≥ test seviyesi',
    pr_ckCap: '−3 dB köşe frekansı ≥ sinyal bant genişliği',
    pr_noBw: 'bant genişliği girilmedi',
    pr_ckRate: 'In ≥ In,min',
    pr_ckRateD: 'yüklenme {x} (izin verilen {lim})',
    pr_ckI2t: 'Erime I²t değeri ≥ gereken',
    pr_ckI2tD: 'bir darbe {x} kullanıyor (izin verilen {lim})',
    pr_noPulse: 'ani akım darbesi girilmedi',
    pr_ckVolt: 'Anma gerilimi ≥ devre gerilimi',
    pr_ckBrk: 'Kesme kapasitesi ≥ arıza akımı',
    pr_ckOpens: 'Arıza akımı ≥ {k} × In (pratik kural)',
    pr_ckHold: 'Ihold(T) ≥ Iop',
    pr_ckTrip: 'Arıza akımı > Itrip(T)',
    pr_ckImax: 'Arıza akımı ≤ Imax',
    pr_ckVmax: 'Devre gerilimi ≤ Vmax',
    pr_ckDrive: 'Gate sürmesi ≥ RDS(on) değerinin verildiği VGS',
    pr_ckDriveD: 'eşik gerilimi en çok {vth}',
    pr_ckVgs: '|VGS| ≤ |VGS|max',
    pr_ckVgsZ: 'zener ile sınırlı',
    pr_ckVgsNo: 'zener yok',
    pr_ckTjd: 'Diyot Tj ≤ izin verilen Tj',
    pr_ckTjm: 'MOSFET Tj ≤ izin verilen Tj',

    pr_rRdyn: 'Dinamik direnç Rdyn',
    pr_rEsdI: 'ESD akımı: ilk tepe / 30 ns / 60 ns',
    pr_rVcl3: 'Kenetleme gerilimi: ilk tepe / 30 ns / 60 ns',
    pr_rMargin2: 'Vabs’a pay: ilk tepe / 30 ns',
    pr_rDvL: 'Bağlantı endüktansının gerilim aşımı (tahmin)',
    pr_rVfirst: 'İlk tepede aşımla birlikte hat gerilimi (tahmin)',
    pr_rIshort: 'Üretecin kısa devre akımı VOC/Zs',
    pr_rVcl: 'Tepe akımdaki kenetleme gerilimi',
    pr_rMargin: 'Vabs’a pay',
    pr_rPpk: 'TVS’deki darbe tepe gücü',
    pr_rIppUse: 'Tepe akım / IPP',
    pr_rRwm: 'VRWM − Vline',
    pr_rFc: 'TVS kapasitesinin −3 dB köşe frekansı',
    pr_rFcRatio: 'Köşe frekansı / sinyal bant genişliği',
    pr_rLoad: 'Sigortanın yüklenmesi Iop/In',
    pr_rLoadV: '{x} (izin verilen {lim})',
    pr_rIfault: 'Arıza akımı',
    pr_rI2tP: 'Bir darbenin I²t değeri',
    pr_rI2tReq: 'Gereken anma erime I²t değeri',
    pr_rPulseUse: 'Bir darbenin kullandığı erime I²t payı',
    pr_rFaultRatio: 'Arıza akımı / anma akımı',
    pr_rHoldTrip: 'Sıcaklıktaki tutma / açma akımı',
    pr_rHoldUse: 'Çalışma akımı / tutma akımı',
    pr_rTripRatio: 'Arıza akımı / açma akımı',
    pr_rVdrop: 'Normal çalışmada gerilim düşümü (R1max ile)',
    pr_rPloss: 'Normal çalışmada kayıp (R1max ile)',
    pr_rItripped: 'Açmış durumda akmaya devam eden akım ≈ Pd/V',
    pr_blkCompare: 'Karşılaştırma',
    pr_colDiode: 'Schottky diyot',
    pr_colFet: 'P-MOSFET',
    pr_rShare: 'Giriş gücüne oranı',
    pr_rTj: 'Jonksiyon sıcaklığı',
    pr_rVout: 'Yükteki gerilim',
    pr_rSaved: 'MOSFET ile kazanılan kayıp',
    pr_rVgs: 'Gate sürmesi |VGS|',
    pr_rIz: 'Zener akımı',
    pr_rIzIdle: '0 (Vin, VZ’nin altında: zener iletmiyor)',

    pr_sRdyn: 'Veri sayfası noktasından dinamik direnç',
    pr_sIpkEsd: 'ESD akımının ilk tepesi',
    pr_sI30: '30 ns’deki ESD akımı',
    pr_sVcl: 'Tepe akımdaki kenetleme gerilimi',
    pr_sVcl30: '30 ns’deki kenetleme gerilimi',
    pr_sDvL: 'Bağlantı endüktansının gerilim aşımı (tahmin)',
    pr_sVfirst: 'İlk tepede aşımla birlikte hat gerilimi (tahmin)',
    pr_sNoClamp: 'VOC, VBR’ye ulaşmıyor: TVS iletmez ve hat darbe geriliminin tamamını görür.',
    pr_sPpk: 'TVS’deki darbe tepe gücü',
    pr_sIppUse: 'Tepe akımın veri sayfasındaki IPP’ye oranı',
    pr_sFc: 'TVS kapasitesinin hatta oluşturduğu −3 dB köşe frekansı',
    pr_sFcRatio: 'Köşe frekansının sinyal bant genişliğine oranı',
    pr_sLoad: 'Aday sigortanın yüklenmesi',
    pr_sIfault: 'Arıza akımı',
    pr_sI2tP: 'Bir ani akım darbesinin I²t değeri',
    pr_sI2tReq: 'Gereken anma erime I²t değeri',
    pr_sPulseUse: 'Bir darbenin kullandığı erime I²t payı',
    pr_sFaultRatio: 'Arıza akımının anma akımına oranı',
    pr_sHoldUse: 'Çalışma akımının tutma akımına oranı',
    pr_sTripRatio: 'Arıza akımının açma akımına oranı',
    pr_sVdrop: 'Normal çalışmada gerilim düşümü',
    pr_sPloss: 'Normal çalışmada kayıp',
    pr_sItripped: 'Açmış durumda akmaya devam eden akım',
    pr_sPd: 'Diyottaki kayıp',
    pr_sShareD: 'Diyot kaybının giriş gücüne oranı',
    pr_sTjD: 'Diyotun jonksiyon sıcaklığı',
    pr_sVgs: 'Kullanılabilir gate sürmesi',
    pr_sVdM: 'MOSFET üzerindeki gerilim düşümü',
    pr_sPm: 'MOSFET’teki kayıp',
    pr_sShareM: 'MOSFET kaybının giriş gücüne oranı',
    pr_sTjM: 'MOSFET’in jonksiyon sıcaklığı',
    pr_sIz: 'Zener akımı',
    pr_sIzIdle: 'Besleme zener geriliminin altında: zener iletmez, gate besleme geriliminin tamamını görür.',
    pr_sSaved: 'MOSFET ile kazanılan kayıp',
    pr_wKpk: 'Test seviyesinin her kV’u için ilk tepe akımı (IEC 61000-4-2): 3,75 A/kV',
    pr_wK30: 'Her kV için 30 ns’deki akım (IEC 61000-4-2): 2 A/kV',
    pr_wTr: 'Deşarj akımının yükselme süresi (IEC 61000-4-2): 0,8 ns',
    pr_wTa: 'Ortam sıcaklığı',

    pr_lNote: '{l} bağlantı endüktansı, {tr} süren yükselme sırasında kenetleme geriliminin üzerine yaklaşık {dv} ekler (tahmin): hat yaklaşık bir nanosaniye boyunca {vf} dolayında bir gerilim görür. Bu değer sonuca katılmaz; ama TVS’nin neden sinyal yolunun üzerinde, konnektörün hemen yanında durması ve toprak padinin doğrudan düzleme bağlanması gerektiğini gösterir.',
    pr_bandNote: '{a} ile {b} arasındaki akımlarda PTC açabilir de açmayabilir de.',
    pr_fuseLink: 'Bakır, sigortadan uzun dayanmalıdır: arıza akımını ve sigortanın açma süresini en ince izin ya da vianın erime sınırıyla karşılaştırın:',
    pr_noteTvs: 'TVS, VBR’den veri sayfası noktasına (IPP, VC) çizilen bir doğruyla modellenir: Vcl = VBR + Rdyn·I. Gerçek parçalar doğrusal değildir: doğru, veri sayfası noktasının yakınında güvenilirdir, uzağında bir uzatmadır; geri tutmalı (snapback) parçaları kapsamaz. ESD akımları, standardın üreteç için düşük empedanslı kalibrasyon hedefinde tanımladığı değerlerdir; TVS’den geçen gerçek akım bunlardan en çok biraz küçüktür. Endüktif gerilim aşımı %10–90 yükselme süresiyle yapılan bir tahmindir, yaklaşık yükselme süresi kadar sürer ve geçti/kaldı sonucuna katılmaz. Darbe (surge) akımında üreteç akımının tamamının bu TVS’den geçtiği, hattaki başka hiçbir elemanın akımı sınırlamadığı ya da paylaşmadığı varsayılır.',
    pr_noteFuse: 'In,min yaygın seçim kuralıdır: çalışma akımı, sürekli çalışma değer düşürmesine ve sıcaklık düzeltme katsayısına bölünür. Darbe kontrolü, bir ani akım darbesinin I²t değerini, darbe sayısı için izin verilen anma erime I²t payıyla karşılaştırır. Burada bakılmayanlar: açma süresi (zaman–akım eğrisi), sigortanın geçirdiği I²t’nin arkasındaki kablo ve yarı iletkenlerin dayanabildiği değerle karşılaştırılması, DC ve AC anma değerlerinin farkı ve sigortanın gerilim düşümü. Arıza akımı için 2 kat kuralı pratik bir kuraldır.',
    pr_notePtc: 'Tutma ve açma akımı aynı katsayıyla ölçeklenir; polimer PTC’lerin ısıl değer düşürme tabloları da böyle verilir. Ihold(T) ile Itrip(T) arasında parça açabilir de açmayabilir de. Burada bakılmayanlar: açma süresi (arıza akımına ve sıcaklığa bağlıdır; veri sayfasındaki eğriden okuyun), her açmadan sonra direncin artması ve iki akımı da kaydıran komşu parçaların ya da geniş izlerin ısısı.',
    pr_noteRev: 'Yük akımında durağan bir karşılaştırmadır. MOSFET’li çözüm artı hattaki bir P-kanal parçadır: drain girişte, source yükte; gate RG üzerinden toprağa bağlı, zener gate ile source arasında. İletimdeyken ters akımı kesmez (dolu bir çıkış, çöken girişe geri besleyebilir); bunu ideal diyot denetleyicisi yapar. Burada bakılmayanlar: ters gerilim dayanımları (diyotun VRRM, MOSFET’in VDS değeri ters bağlanan en yüksek girişten büyük olmalı), gövde diyotu üzerinden ilk açılış ve diyotun sıcaklıktaki ters kaçak akımı.',
    pr_disclaimer: 'Bu sonuçlar veri sayfası değerleriyle yapılan bir çapraz kontroldür, korumanın yeterliliğinin kanıtı değildir. Gerçek davranışı parçanın eğrileri ve üründe yapılan testler (ESD, darbe, arıza ve ters bağlantı testleri) belirler.',

    pr_dgTvsAria: 'Şema: olay konnektörden girer, TVS akımı hattan toprağa aktarır; ardından isteğe bağlı seri direnç ve korunan entegre gelir. Hattaki kenetleme gerilimi işaretlidir',
    pr_dgFuseAria: 'Şema: kaynak, sigorta ve yük seri bağlı; yükü kısa devre eden arıza yolu kesikli çizgiyle gösterilir',
    pr_dgPtcAria: 'Şema: kaynak, PTC ve yük seri bağlı; yükü kısa devre eden arıza yolu kesikli çizgiyle gösterilir',
    pr_dgRevAria: 'Yan yana iki şema: seri Schottky diyot ve gate direnci ile zeneri olan P-kanal MOSFET; her birinin gerilim düşümü, kaybı ve jonksiyon sıcaklığı yazılıdır',
    pr_dgConn: 'Konnektör',
    pr_dgLoad: 'Yük',
    pr_dgFault: 'arıza',
    pr_dgDiode: 'Seri Schottky',
  },
  en: {
    pr_mode: 'Protection element',
    pr_mTvs: 'TVS / ESD diode',
    pr_mFuse: 'Fuse',
    pr_mPtc: 'Resettable fuse (PTC)',
    pr_mRev: 'Reverse polarity',
    pr_ex: 'Load example values',
    pr_exInfo: 'Fills the fields with the values of a worked example and switches to its protection element. Your own entries in those fields are replaced.',
    pr_exLine: '12 V signal line, 8 kV ESD',
    pr_exUsb: 'USB 2.0 data line, 8 kV ESD',
    pr_exSurge: '24 V input, 1 kV surge',
    pr_exFuse: '5 V / 2 A fuse',
    pr_exPtc: '5 V / 0.5 A port, PTC at 60 °C',
    pr_exRev: '12 V reverse polarity',
    pr_exRev24: '24 V reverse polarity, gate zener',

    pr_secLine: 'Line and protected IC',
    pr_vl: 'Highest normal line voltage (Vline)',
    pr_vlInfo: 'The highest voltage the line carries in normal operation; include the tolerance and the conditions it has to tolerate (e.g. a short to a supply rail the port must survive). For lines that swing both ways enter the magnitude.',
    pr_vabs: 'Absolute maximum voltage of the IC pin (Vabs)',
    pr_vabsInfo: 'Absolute-maximum voltage of the protected pin from the IC datasheet. It is a DC limit, so it is a cautious yardstick for a pulse that lasts nanoseconds. If the IC maker states a transient (TLP) limit for the pin, enter that instead.',
    pr_secTvs: 'TVS datasheet',
    pr_vrwm: 'Stand-off voltage (VRWM)',
    pr_vrwmInfo: 'Up to this voltage the TVS does not conduct; it only draws a small leakage current.',
    pr_vbr: 'Breakdown voltage (VBR)',
    pr_vbrInfo: 'Breakdown voltage at the test current (usually 1 mA). The model is a straight line from VBR to the clamp point below. With the minimum VBR the line is steeper, with the maximum VBR it starts higher: try both ends of the tolerance when the margin is small. Snapback parts clamp below VBR; this model does not describe them, so read their clamp voltage from the TLP curve.',
    pr_vc: 'Clamp voltage at IPP (VC)',
    pr_vcInfo: 'One point from the datasheet: the clamp voltage VC and the current IPP it is given for (the 8/20 µs table, or a point of the TLP curve for ESD parts). Take the point closest to the current of your event: the dynamic resistance is the slope of the line from VBR to this point.',
    pr_ipp: 'Peak pulse current of that point (IPP)',
    pr_ippInfo: 'For a surge the current of the event is compared with this value as the rating, so enter the IPP given for the 8/20 µs waveform. Parts specified for 10/1000 µs (SMAJ, SMBJ, SMCJ…) carry more current in the much shorter 8/20 µs pulse: take that figure from the pulse-rating curve of the datasheet.',
    pr_secEvent: 'Event',
    pr_ev: 'Event type',
    pr_evEsd: 'ESD (IEC 61000-4-2)',
    pr_evSurge: 'Surge (IEC 61000-4-5)',
    pr_evCustom: 'Peak current',
    pr_kv: 'Contact discharge level',
    pr_kvInfo: 'IEC 61000-4-2 contact discharge. The generator (150 pF / 330 Ω) is specified by its current waveform: per kV of test level the first peak is 3.75 A, 2 A flow at 30 ns and 1 A at 60 ns; the rise time is 0.8 ns. At 8 kV: 30 A, 16 A and 8 A.',
    pr_kvr: 'ESD rating of the TVS (contact)',
    pr_kvrInfo: 'IEC 61000-4-2 contact-discharge rating from the TVS datasheet. When given, it is compared with the test level.',
    pr_lp: 'Inductance of the TVS connection (Lp)',
    pr_lpHint: 'Roughly 1 nH per mm of trace, plus the via.',
    pr_lpInfo: 'The stub from the line to the TVS pad plus the path from its ground pad to the plane. During the 0.8 ns rise this inductance adds about L·Ipk/tr on top of the clamp voltage. An estimate: the 10–90 % rise time is used for the whole current step.',
    pr_voc: 'Open-circuit surge voltage (VOC)',
    pr_vocInfo: 'Test level of the IEC 61000-4-5 combination wave generator: 1.2/50 µs open-circuit voltage, 8/20 µs short-circuit current. The levels of the standard are 0.5, 1, 2 and 4 kV; the product standard sets the level for each port.',
    pr_zs: 'Source impedance (coupling)',
    pr_zs2: '2 Ω · power line, line to line',
    pr_zs12: '12 Ω · power line, line to earth',
    pr_zs42: '42 Ω · unshielded unsymmetrical data or signal line',
    pr_ipk: 'Peak current through the TVS',
    pr_secCap: 'Line loading',
    pr_ct: 'TVS capacitance (C)',
    pr_ctInfo: 'Capacitance the TVS adds to the line (Cj, line to ground). On a line matched to Z0 at both ends it forms a low-pass with Z0/2: f−3dB = 1/(π·Z0·C).',
    pr_z0: 'Line impedance (Z0)',
    pr_bw: 'Signal bandwidth',
    pr_bwInfo: 'The highest frequency the line has to pass, e.g. 0.35/tr for an edge with rise time tr. When given, it is compared with the −3 dB corner.',

    pr_secCkt: 'Circuit',
    pr_iop: 'Operating current (Iop)',
    pr_iopInfo: 'Highest continuous current in normal operation (RMS).',
    pr_vckt: 'Circuit voltage (V)',
    pr_vcktInfo: 'The highest voltage left across the open fuse or the tripped PTC: the supply voltage at its maximum.',
    pr_fm: 'Fault (short-circuit) current',
    pr_fmI: 'Enter directly',
    pr_fmR: 'From loop resistance',
    pr_ifl: 'Fault current (Ifault)',
    pr_iflInfo: 'The current the source can drive into a short circuit behind the protection element.',
    pr_rl: 'Source + loop resistance (Rloop)',
    pr_rlInfo: 'Internal resistance of the source plus cable, connector, traces and the short itself: Ifault = V/Rloop. A source with current limiting delivers its limit current instead; enter that current directly then.',
    pr_taInfo: 'For the fuse and the PTC it is informative only: the tool cannot know the derating curve of your part. Read the factor for this temperature from the datasheet and enter it in its field. For reverse polarity the junction temperature starts from this value.',
    pr_secFuse: 'Candidate fuse',
    pr_in: 'Rated current (In)',
    pr_der: 'Steady-state derating',
    pr_derInfo: 'Share of its rated current the fuse should carry continuously at 25 °C. 75 % is the usual guidance for UL-rated fuses; IEC-rated fuses are specified to carry 100 % of their rated current. Follow the datasheet of the fuse.',
    pr_kt: 'Temperature re-rating factor (Kt)',
    pr_ktHint: 'Read from the datasheet curve at the ambient temperature; typically below 1 above 25 °C.',
    pr_i2t: 'Nominal melting I²t',
    pr_i2tInfo: 'The energy that melts the fuse element, from the datasheet (A²s). Time-delay (slow-blow) fuses have a much larger value than fast-acting fuses of the same rating.',
    pr_vr: 'Voltage rating',
    pr_ibr: 'Breaking capacity (interrupting rating)',
    pr_ibrInfo: 'The highest current the fuse can interrupt safely at its rated voltage. Above it the fuse may arc, rupture or keep conducting.',
    pr_secPulse: 'Inrush pulse',
    pr_shape: 'Pulse shape',
    pr_shRect: 'Rectangle · I²t = Ip²·t',
    pr_shTri: 'Triangle / sawtooth · Ip²·t/3',
    pr_shSine: 'Half sine · Ip²·t/2',
    pr_shExp: 'Exponential decay (capacitor charging) · Ip²·τ/2',
    pr_ip: 'Pulse peak current (Ip)',
    pr_ipInfo: 'Peak of the inrush current through the fuse; enter 0 if there is none. The “Inrush and soft-start” tool gives the peak current and the time constant of a capacitor charging through the path resistance.',
    pr_tp: 'Pulse duration (t)',
    pr_tau: 'Time constant (τ)',
    pr_np: 'Pulses over the product life',
    pr_npInfo: 'Repeated pulses fatigue the fuse element, so only a part of the nominal melting I²t may be used: 22 % for 100 000 pulses, 29 % for 10 000, 38 % for 1 000 and 48 % for 100. These are typical manufacturer guidance figures (Littelfuse “Fuseology”); check the datasheet of your own fuse, which may give its own pulse curve.',
    pr_npOwn: 'Own factor',
    pr_pf: 'Pulse factor (Fp)',
    pr_pfInfo: 'Share of the nominal melting I²t one pulse may use, from the pulse curve in the datasheet of the fuse.',
    pr_secPtc: 'PTC datasheet',
    pr_ih: 'Hold current at 25 °C (Ihold)',
    pr_itr: 'Trip current at 25 °C (Itrip)',
    pr_kd: 'Thermal derating at the ambient temperature (kT)',
    pr_kdHint: 'Read from the table in the datasheet. The hold current falls markedly with temperature, in many parts to roughly half around 85 °C.',
    pr_vm: 'Maximum voltage (Vmax)',
    pr_im: 'Maximum fault current (Imax)',
    pr_r1: 'Maximum resistance after trip (R1max)',
    pr_r1Info: 'Resistance one hour after a trip or after reflow soldering. It is higher than the initial resistance and is the value to use for the voltage drop.',
    pr_pd: 'Power dissipation when tripped (Pd)',
    pr_pdInfo: 'Typical power the tripped PTC dissipates to stay hot. With the whole circuit voltage across it, the current that keeps flowing is about Pd/V.',
    pr_secSupply: 'Supply and load',
    pr_vin: 'Supply voltage, maximum (Vin)',
    pr_vinInfo: 'The highest input voltage, with tolerance and the transients the gate has to survive. The gate drive shrinks with the supply: repeat the check at the lowest supply voltage as well.',
    pr_il: 'Load current (I)',
    pr_secDiode: 'Series Schottky diode',
    pr_vf: 'Forward voltage at this current (VF)',
    pr_vfInfo: 'Read from the VF–IF curve at the load current and the expected junction temperature. VF falls as the diode warms up, while its reverse leakage rises steeply.',
    pr_rjd: 'Diode RθJA',
    pr_rjInfo: 'Junction-to-ambient thermal resistance on your own board. The datasheet figure belongs to the maker’s test board; with less copper it is higher.',
    pr_secFet: 'P-channel MOSFET',
    pr_rds: 'RDS(on) at the available gate drive',
    pr_rdsInfo: 'The value in the datasheet row for a VGS your circuit reaches. RDS(on) rises with temperature: use the value at the expected junction temperature (normalised RDS(on) curve).',
    pr_vgr: 'VGS at which this RDS(on) is specified',
    pr_vth: 'Threshold voltage, maximum (|VGS(th)|)',
    pr_vthInfo: 'At the threshold the MOSFET only just starts to conduct (the datasheet tests it at a small current such as 250 µA). The gate drive has to reach the VGS at which RDS(on) is specified, well above the threshold.',
    pr_vgm: 'Gate–source voltage, absolute maximum (|VGS|max)',
    pr_rjm: 'MOSFET RθJA',
    pr_zen: 'Gate zener clamp',
    pr_zenNo: 'Not fitted',
    pr_zenYes: 'Fitted',
    pr_zenInfo: 'A zener from gate to source and a resistor from gate to ground. Needed when the supply can exceed the VGS rating; the gate drive is then limited to the zener voltage.',
    pr_vz: 'Zener voltage (VZ)',
    pr_rg: 'Gate resistor (RG)',
    pr_tjm: 'Maximum allowed Tj',

    pr_hClamp: 'Clamp voltage at the IC',
    pr_hClamp30: 'Clamp voltage at 30 ns',
    pr_hIpk: 'Peak current through the TVS',
    pr_hInMin: 'Minimum fuse rating',
    pr_hCand: 'Candidate fuse',
    pr_hHoldT: 'Hold current at the ambient temperature',
    pr_hTripT: 'Trip current at the ambient temperature',
    pr_hPd: 'Loss in the Schottky diode',
    pr_hPm: 'Loss in the P-MOSFET',
    pr_subPass: 'Vabs {abs} · margin {m}',
    pr_subOver: 'Vabs {abs} · exceeded by {m}',
    pr_subIpp: 'IPP {ipp} · ratio {x}',
    pr_subCandOk: 'suitable: all {n} checks pass',
    pr_subCandWarn: 'no check fails; {w} warning',
    pr_subCandBad: 'not suitable: {f} of {n} checks fail',
    pr_subHold: 'Iop {iop} · margin {m}',
    pr_subHoldBad: 'Iop {iop} · {m} short',
    pr_subTrip: 'fault current {i} = {x} × Itrip(T)',
    pr_subLoss: '{dv} drop · {x} of the input power · Tj {tj}',

    ok_pr_tvs: 'The clamp voltage stays below Vabs = {abs}: {m} of margin at the peak current of {i}.',
    ok_pr_tvsEsd: 'The clamp voltage stays below Vabs = {abs}: {m} of margin at the first peak ({i}) and {m30} at 30 ns ({i30}).',
    ok_pr_tvsOff: 'The surge voltage of {voc} does not reach VBR = {vbr}: the TVS stays off and the line sees the {voc}, which is below Vabs = {abs}.',
    ok_pr_fuse: 'The {in} fuse passes every check made here. The smallest rating for {iop} is {min}.',
    ok_pr_ptc: 'The PTC holds {iht} at this temperature, {m} above the operating current. The fault current of {i} is {x} times its trip current.',
    ok_pr_rev: 'The P-MOSFET loses {pm} where the diode loses {pd}: {saved} less, which is {x} of the diode loss.',
    err_pr_rwm: 'VRWM = {rwm} is below the line voltage of {line}: the diode conducts or leaks in normal operation, heats up and loads the line. Choose a part whose VRWM is at or above the highest normal line voltage.',
    err_pr_clamp: 'At the peak current of {i} the clamp voltage is {v}: {over} above Vabs = {abs}. What helps: a TVS with a lower clamp voltage (a lower VBR or a lower dynamic resistance, usually a larger part), series resistance between the TVS and the IC, or a second protection stage at the IC.',
    err_pr_clampOff: 'The surge voltage of {voc} does not reach VBR = {vbr}: the TVS stays off and the line sees the whole {voc}, which is above Vabs = {abs}. This TVS does not protect the pin: choose a part whose breakdown and clamp voltage are below Vabs.',
    err_pr_clamp30: 'Even at 30 ns ({i30}) the clamp voltage is {v30}: {over} above Vabs = {abs} (first peak: {v} at {i}). What helps: a TVS with a lower clamp voltage, series resistance between the TVS and the IC so that the pin’s own protection carries only a limited current, or a second stage at the IC. An absolute maximum is a DC limit and cautious for a pulse of some tens of nanoseconds: if the IC maker states a transient (TLP) limit for the pin, compare with that.',
    err_pr_clampPk: 'At the first peak ({i}) the clamp voltage is {v}: {over} above Vabs = {abs}. By 30 ns it has fallen to {v30}, below the limit. The peak lasts about a nanosecond, but it is what the pin sees first: a TVS with a lower dynamic resistance, series resistance between the TVS and the IC, or a second stage at the IC brings it down.',
    err_pr_ipp: 'The surge drives {i} through the TVS: {x} of its rated peak pulse current IPP = {ipp}. The part is overloaded, and the clamp voltage above is an extrapolation beyond the datasheet point. Choose a TVS with a higher 8/20 µs rating, or limit the current ahead of it (series impedance, or a coarse first stage such as a varistor or a gas discharge tube).',
    warn_pr_ipp: 'The peak current of {i} is above the datasheet point IPP = {ipp}: the clamp voltage is extrapolated beyond that point. Whether the part survives depends on the waveform: compare with the pulse-rating curve in the datasheet.',
    err_pr_esdr: 'The TVS is rated for {r} contact discharge; the test level is {lvl}. The part itself may be damaged: choose one rated at or above the test level.',
    warn_pr_cap: 'The TVS capacitance puts the −3 dB corner at {fc}; the signal bandwidth is {bw}. The line loses more than 3 dB inside the band of the signal: choose a part with less capacitance.',
    warn_pr_vbrLow: 'VBR = {vbr} is not above VRWM = {rwm}. In a datasheet the breakdown voltage is always higher than the stand-off voltage: check the two fields.',
    err_pr_rate: 'The fuse is rated {in}; the minimum for {iop} is {min}. It runs too close to its rating, ages and may open without a fault. Choose the next rating at or above the minimum.',
    err_pr_i2t: 'The melting I²t is {m}; this pulse needs {req}. Each inrush pulse uses {use} of it, while {pf} is allowed for this number of pulses. The fuse wears out and opens without a fault: choose a time-delay (slow-blow) type or a higher rating, or limit the inrush current.',
    err_pr_volt: 'The voltage rating of {vr} is below the circuit voltage of {v}: the fuse may not quench the arc when it opens. Choose a fuse rated for at least the circuit voltage (and rated for DC if the circuit is DC).',
    err_pr_brk: 'The fault current of {i} is above the breaking capacity of {ibr}: the fuse may rupture or keep conducting. Choose a fuse with a higher breaking capacity, or limit the fault current.',
    err_pr_opens: 'The fault current of {i} is not above the fuse rating of {in}: a fuse carries its rated current, so this fault never opens it. The source cannot deliver enough current: use a smaller fuse or electronic current limiting.',
    warn_pr_opens: 'The fault current is only {x} times the fuse rating ({i} against a {in} fuse). Close to its rating a fuse opens slowly: seconds or longer. As a rule of thumb the fault current should be at least {k} times the rating; the real opening time is read from the time–current curve.',
    err_pr_holdBand: 'The operating current of {iop} is above the hold current at this temperature ({iht}) and below the trip current ({itt}): the PTC may or may not trip in normal operation. Choose a part with a higher hold current.',
    err_pr_holdTrip: 'The operating current of {iop} is above the trip current at this temperature ({itt}): the PTC trips in normal operation. Choose a part with a higher hold current.',
    err_pr_tripBand: 'The fault current of {i} lies between the hold current ({iht}) and the trip current ({itt}): the PTC may or may not trip, and slowly if it does. Choose a part with a lower trip current, or check that the circuit stands this current without protection.',
    err_pr_tripNo: 'The fault current of {i} is not above the hold current of {iht}: the PTC never trips on this fault.',
    err_pr_imax: 'The fault current of {i} is above Imax = {im}: the PTC can be damaged while it trips. Choose a part with a higher Imax, or limit the fault current.',
    err_pr_vmax: 'The circuit voltage of {v} is above Vmax = {vm}: once tripped, the PTC has the whole voltage across it and can be damaged. Choose a part rated for the circuit voltage.',
    warn_pr_fetWorse: 'With this RDS(on) the MOSFET loses {pm}, which is not less than the {pd} of the diode. For the MOSFET to pay off, a part with a lower RDS(on) is needed.',
    err_pr_drive: 'The gate drive of {vgs} does not exceed the threshold voltage, which can be as high as {vth}: the MOSFET may not turn on at all. The load current then flows through its body diode, and drop and loss are far higher than calculated here. Choose a part with a lower threshold voltage.',
    warn_pr_drive: 'The gate drive of {vgs} is below the {vgr} at which this RDS(on) is specified (threshold up to {vth}): the MOSFET is not fully on and its resistance is higher than entered. Use the RDS(on) of a datasheet row your gate drive reaches, or choose a logic-level part.',
    err_pr_vgs: 'The supply of {vin} is above the gate rating |VGS|max = {vgm}: zener clamp required. Fit a zener from gate to source and a resistor from gate to ground.',
    err_pr_vz: 'The zener voltage of {vz} is above the gate rating |VGS|max = {vgm}: it does not protect the gate at a supply of {vin}. Choose a zener with a lower voltage.',
    err_pr_tjd: 'The diode junction reaches {tj}; {max} is allowed. More copper, a larger package or the MOSFET solution is needed.',
    err_pr_tjm: 'The MOSFET junction reaches {tj}; {max} is allowed. A lower RDS(on), more copper or a larger package is needed.',
    err_pr_positive: 'The values must be greater than zero (derating and pulse factor at most 100 %).',
    err_pr_vcLow: 'The clamp voltage VC must be above the breakdown voltage VBR: otherwise no dynamic resistance can be derived. Snapback parts clamp below VBR and are not described by this model; read their clamp voltage from the TLP curve.',
    err_pr_tripLow: 'The trip current must be above the hold current.',
    err_pr_dropHigh: 'The voltage drop is as large as the supply voltage: nothing is left for the load. Check VF, RDS(on) and the load current.',
    err_pr_range: 'The values are outside the range that can be calculated.',

    pr_checks: 'Checks',
    pr_margin: 'margin',
    pr_ckRwm: 'VRWM ≥ Vline: the diode stays off in normal operation',
    pr_ckClamp: 'Clamp voltage at the peak current ≤ Vabs',
    pr_ckClampPk: 'Clamp voltage at the first peak ≤ Vabs',
    pr_ckClamp30: 'Clamp voltage at 30 ns ≤ Vabs',
    pr_ckIpp: 'Peak current ≤ IPP of the TVS',
    pr_ckEsdr: 'ESD rating of the TVS ≥ test level',
    pr_ckCap: '−3 dB corner ≥ signal bandwidth',
    pr_noBw: 'no bandwidth given',
    pr_ckRate: 'In ≥ In,min',
    pr_ckRateD: 'loaded to {x} ({lim} allowed)',
    pr_ckI2t: 'Melting I²t ≥ required',
    pr_ckI2tD: 'one pulse uses {x} ({lim} allowed)',
    pr_noPulse: 'no inrush pulse given',
    pr_ckVolt: 'Voltage rating ≥ circuit voltage',
    pr_ckBrk: 'Breaking capacity ≥ fault current',
    pr_ckOpens: 'Fault current ≥ {k} × In (rule of thumb)',
    pr_ckHold: 'Ihold(T) ≥ Iop',
    pr_ckTrip: 'Fault current > Itrip(T)',
    pr_ckImax: 'Fault current ≤ Imax',
    pr_ckVmax: 'Circuit voltage ≤ Vmax',
    pr_ckDrive: 'Gate drive ≥ VGS at which RDS(on) is specified',
    pr_ckDriveD: 'threshold up to {vth}',
    pr_ckVgs: '|VGS| ≤ |VGS|max',
    pr_ckVgsZ: 'limited by the zener',
    pr_ckVgsNo: 'no zener',
    pr_ckTjd: 'Diode Tj ≤ allowed Tj',
    pr_ckTjm: 'MOSFET Tj ≤ allowed Tj',

    pr_rRdyn: 'Dynamic resistance Rdyn',
    pr_rEsdI: 'ESD current: first peak / 30 ns / 60 ns',
    pr_rVcl3: 'Clamp voltage: first peak / 30 ns / 60 ns',
    pr_rMargin2: 'Margin to Vabs: first peak / 30 ns',
    pr_rDvL: 'Overshoot of the connection inductance (estimate)',
    pr_rVfirst: 'Line voltage at the first peak with the overshoot (estimate)',
    pr_rIshort: 'Short-circuit current of the generator VOC/Zs',
    pr_rVcl: 'Clamp voltage at the peak current',
    pr_rMargin: 'Margin to Vabs',
    pr_rPpk: 'Peak pulse power in the TVS',
    pr_rIppUse: 'Peak current / IPP',
    pr_rRwm: 'VRWM − Vline',
    pr_rFc: '−3 dB corner of the TVS capacitance',
    pr_rFcRatio: 'Corner frequency / signal bandwidth',
    pr_rLoad: 'Load of the fuse Iop/In',
    pr_rLoadV: '{x} ({lim} allowed)',
    pr_rIfault: 'Fault current',
    pr_rI2tP: 'I²t of one pulse',
    pr_rI2tReq: 'Nominal melting I²t required',
    pr_rPulseUse: 'Share of the melting I²t one pulse uses',
    pr_rFaultRatio: 'Fault current / rated current',
    pr_rHoldTrip: 'Hold / trip current at temperature',
    pr_rHoldUse: 'Operating current / hold current',
    pr_rTripRatio: 'Fault current / trip current',
    pr_rVdrop: 'Voltage drop in normal operation (with R1max)',
    pr_rPloss: 'Loss in normal operation (with R1max)',
    pr_rItripped: 'Current that keeps flowing when tripped ≈ Pd/V',
    pr_blkCompare: 'Comparison',
    pr_colDiode: 'Schottky diode',
    pr_colFet: 'P-MOSFET',
    pr_rShare: 'Share of the input power',
    pr_rTj: 'Junction temperature',
    pr_rVout: 'Voltage at the load',
    pr_rSaved: 'Loss saved by the MOSFET',
    pr_rVgs: 'Gate drive |VGS|',
    pr_rIz: 'Zener current',
    pr_rIzIdle: '0 (Vin is below VZ: the zener does not conduct)',

    pr_sRdyn: 'Dynamic resistance from the datasheet point',
    pr_sIpkEsd: 'First peak of the ESD current',
    pr_sI30: 'ESD current at 30 ns',
    pr_sVcl: 'Clamp voltage at the peak current',
    pr_sVcl30: 'Clamp voltage at 30 ns',
    pr_sDvL: 'Overshoot of the connection inductance (estimate)',
    pr_sVfirst: 'Line voltage at the first peak with the overshoot (estimate)',
    pr_sNoClamp: 'VOC does not reach VBR: the TVS does not conduct and the line sees the whole surge voltage.',
    pr_sPpk: 'Peak pulse power in the TVS',
    pr_sIppUse: 'Peak current against the datasheet IPP',
    pr_sFc: '−3 dB corner of the TVS capacitance on the line',
    pr_sFcRatio: 'Corner frequency against the signal bandwidth',
    pr_sLoad: 'Load of the candidate fuse',
    pr_sIfault: 'Fault current',
    pr_sI2tP: 'I²t of one inrush pulse',
    pr_sI2tReq: 'Nominal melting I²t required',
    pr_sPulseUse: 'Share of the melting I²t one pulse uses',
    pr_sFaultRatio: 'Fault current against the rated current',
    pr_sHoldUse: 'Operating current against the hold current',
    pr_sTripRatio: 'Fault current against the trip current',
    pr_sVdrop: 'Voltage drop in normal operation',
    pr_sPloss: 'Loss in normal operation',
    pr_sItripped: 'Current that keeps flowing when tripped',
    pr_sPd: 'Loss in the diode',
    pr_sShareD: 'Diode loss as a share of the input power',
    pr_sTjD: 'Junction temperature of the diode',
    pr_sVgs: 'Gate drive available',
    pr_sVdM: 'Voltage drop across the MOSFET',
    pr_sPm: 'Loss in the MOSFET',
    pr_sShareM: 'MOSFET loss as a share of the input power',
    pr_sTjM: 'Junction temperature of the MOSFET',
    pr_sIz: 'Zener current',
    pr_sIzIdle: 'The supply is below the zener voltage: the zener does not conduct and the gate sees the whole supply voltage.',
    pr_sSaved: 'Loss saved by the MOSFET',
    pr_wKpk: 'First peak per kV of test level (IEC 61000-4-2): 3.75 A/kV',
    pr_wK30: 'Current at 30 ns per kV (IEC 61000-4-2): 2 A/kV',
    pr_wTr: 'Rise time of the discharge current (IEC 61000-4-2): 0.8 ns',
    pr_wTa: 'Ambient temperature',

    pr_lNote: 'The connection inductance of {l} adds about {dv} on top of the clamp voltage during the {tr} rise (estimate): for roughly a nanosecond the line sees about {vf}. It is not part of the verdict, but it shows why the TVS belongs on the signal path right at the connector, with its ground pad tied straight into the plane.',
    pr_bandNote: 'For currents between {a} and {b} the PTC may or may not trip.',
    pr_fuseLink: 'The copper has to survive longer than the fuse: compare the fault current and the opening time of the fuse with the fusing limit of the thinnest trace or via:',
    pr_noteTvs: 'The TVS is modelled as a straight line from VBR through the datasheet point (IPP, VC): Vcl = VBR + Rdyn·I. Real parts are not linear: the line can be trusted near the datasheet point and is an extrapolation far from it; snapback parts are not covered. The ESD currents are the values the standard specifies for the generator into its low-impedance calibration target; the current that really flows in the TVS is at most slightly lower. The inductive overshoot is an estimate with the 10–90 % rise time, lasts about as long as the rise and is not part of the pass/fail verdict. The surge current assumes that the whole generator current flows through this TVS and that nothing else on the line limits or shares it.',
    pr_noteFuse: 'In,min is the usual selection rule: the operating current divided by the steady-state derating and the temperature re-rating factor. The pulse check compares the I²t of one inrush pulse with the share of the nominal melting I²t allowed for the number of pulses. Not checked here: the opening time (time–current curve), the let-through I²t against what the wiring and the semiconductors behind the fuse survive, the difference between DC and AC ratings, and the voltage drop of the fuse. The 2× rule for the fault current is a rule of thumb.',
    pr_notePtc: 'Hold and trip current are scaled with the same factor, as the thermal derating tables of polymer PTCs give them. Between Ihold(T) and Itrip(T) the part may or may not trip. Not checked here: the time to trip (it depends on the fault current and the temperature; read it from the curve in the datasheet), the resistance increase after every trip, and heat from neighbouring parts or wide traces, which shifts both currents.',
    pr_noteRev: 'A static comparison at the load current. The MOSFET solution is a P-channel part in the positive line: drain at the input, source at the load, gate to ground through RG, zener from gate to source. While it is on it does not block reverse current (a charged output can feed back into a collapsing input); an ideal-diode controller does. Not checked here: the reverse voltage ratings (VRRM of the diode and VDS of the MOSFET must exceed the highest reversed input), start-up through the body diode, and the reverse leakage of the diode at temperature.',
    pr_disclaimer: 'These results are a cross-check against datasheet numbers, not a qualification of the protection. The real behaviour comes from the curves of the part and from testing in the product (ESD, surge, fault and reverse-connection tests).',

    pr_dgTvsAria: 'Schematic: the event enters at the connector, the TVS diverts its current from the line to ground, then an optional series resistor and the protected IC follow. The clamp voltage on the line is marked',
    pr_dgFuseAria: 'Schematic: source, fuse and load in series; the fault path that shorts the load is drawn dashed',
    pr_dgPtcAria: 'Schematic: source, PTC and load in series; the fault path that shorts the load is drawn dashed',
    pr_dgRevAria: 'Two schematics side by side: a series Schottky diode, and a P-channel MOSFET with its gate resistor and zener; each with its voltage drop, loss and junction temperature',
    pr_dgConn: 'Connector',
    pr_dgLoad: 'Load',
    pr_dgFault: 'fault',
    pr_dgDiode: 'Series Schottky',
  },
};

// ---------------------------------------------------------------------------
// Formatting. Only text: nothing here may end up in SVG geometry.
// ---------------------------------------------------------------------------

const minus = (s) => String(s).replace(/^-/, '−');
const val = (x, unit, sig = 3) => minus(si(x, unit, sig));
const num = (x, sig = 3) => minus(fmt(x, sig));
const deg = (x) => `${minus(fixed(x, 1))} °C`;
const i2tTxt = (x, sig = 3) => `${num(x, sig)} A²s`;
const pct = (x, sig = 3) => (Number.isFinite(x)
  ? minus(new Intl.NumberFormat(locale(), { style: 'percent', maximumSignificantDigits: sig, useGrouping: false }).format(x)) : '—');
const V = (x) => val(x, 'V');
const A = (x) => val(x, 'A');

// Values inside the calculation steps: computed ones with four digits, inputs as typed.
const Q = (x, unit, sig = 4) => tx(val(x, unit, sig));
const QI = (x, unit) => tx(val(x, unit, 6));
const N = (x, sig = 4) => tx(num(x, sig));
const P = (x, sig = 4) => tx(pct(x, sig));
const I2T = (x, sig = 4) => tx(i2tTxt(x, sig));
const DEG = (x) => tx(`${num(x, 4)} °C`);
const THETA = (x) => tx(`${num(x, 6)} °C/W`);
// A difference of two rounded values needs more digits when they are close.
const sigFor = (a, b) => {
  const d = Math.abs(a - b);
  const m = Math.max(Math.abs(a), Math.abs(b));
  return d > 0 && m > 0 ? Math.min(10, 4 + Math.max(0, Math.ceil(Math.log10(m / d)))) : 4;
};

const REFS = {
  tvs: ['IEC 61000-4-2 (ESD immunity: contact-discharge current waveform)', 'IEC 61000-4-5 (surge immunity: combination wave, source impedances)'],
  fuse: ['Littelfuse, “Fuseology” (fuse selection guide: derating, pulse I²t, pulse factors)'],
  ptc: ['Datasheets of polymer PTC resettable fuses (definitions of Ihold, Itrip, Vmax, Imax, Pd, R1max; thermal derating table)'],
  rev: ['Datasheets of the Schottky diode and the P-channel MOSFET (VF–IF curve, RDS(on) against VGS, VGS(th), VGS rating, RθJA)'],
};

const BW_HZ = { MHz: 1e6, GHz: 1e9, kHz: 1e3 };
const T_S = { ms: 1e-3, us: 1e-6, s: 1 };
const ohms = (x, unit) => x * ({ mohm: 1e-3, kohm: 1e3 }[unit] ?? 1);
const modeIs = (...list) => (v) => list.includes(v.mode);
const evIs = (ev) => (v) => v.mode === 'tvs' && v.ev === ev;
const fromR = (v) => v.fm === 'r';

// ---------------------------------------------------------------------------
// Diagrams: one schematic per protection element. Geometry is fixed; only the
// labels carry values.
// ---------------------------------------------------------------------------

const FLOW = { cls: 'flow', headCls: 'arrow flow' };
const judged = (status) => (status === 'ok' ? 'okt' : 'badt');

/** Connector → line → TVS to ground → optional series resistor → IC. */
function tvsDiagram(v, r) {
  const ev = r?.event ?? (['surge', 'custom'].includes(v.ev) ? v.ev : 'esd');
  const withL = ev === 'esd' && (!r || r.lNh > 0);
  const Y = 66; const G = 166; const X = 130;
  let b = rect(12, 44, 46, 44, 'comp', ' rx="3"') + text(35, 36, t('pr_dgConn'), { cls: 'name' });
  // What arrives at the connector.
  if (ev === 'esd') b += text(35, 104, r ? `ESD ${val(r.esdKv * 1000, 'V')}` : 'ESD', { cls: r ? 'val' : 'lbl' });
  else if (ev === 'surge') {
    b += text(35, 104, r ? `VOC ${val(r.vOc, 'V')}` : 'VOC', { cls: r ? 'val' : 'sym' })
      + text(35, 118, r ? `Zs ${val(r.zS, 'Ω')}` : 'Zs', { cls: r ? 'val' : 'sym' });
  }
  b += wire([58, Y], [196, Y]) + node(X, Y) + arrow(66, Y - 9, 106, Y - 9, FLOW);
  // The TVS branch, with the inductance of its connection for an ESD event.
  if (withL) {
    b += twoTerm('L', X, Y, X, Y + 44, { name: 'Lp', value: r ? val(r.lNh * 1e-9, 'H') : undefined, dashed: true })
      + twoTerm('TVS', X, Y + 44, X, G, { name: 'TVS', value: r ? `VBR ${V(r.vBr)}` : undefined });
    if (r) b += text(X + 60, Y + 34, `≈ +${V(r.dvL)}`, { cls: 'lbl', anchor: 'start' });
  } else {
    b += twoTerm('TVS', X, Y, X, G, { name: 'TVS', value: r ? `VBR ${V(r.vBr)}` : undefined });
  }
  b += ground(X, G);
  // The current of the event goes down through the TVS.
  b += arrow(X - 16, Y + 16, X - 16, G - 8, FLOW)
    + text(X - 22, 112, 'Ipk', { cls: r ? 'lbl' : 'sym', anchor: 'end' })
    + (r ? text(X - 22, 126, A(r.iPk), { cls: 'val', anchor: 'end' }) : '');
  // Optional series resistor and the protected pin.
  b += twoTerm('R', 196, Y, 276, Y, { name: `Rs · ${t('optional')}`, dashed: true })
    + wire([276, Y], [336, Y])
    + rect(336, 42, 92, 48, 'comp', ' rx="3"') + text(382, 62, 'IC', { cls: 'name' })
    + text(382, 78, r ? `Vabs ${V(r.vAbs)}` : 'Vabs', { cls: r ? 'lbl' : 'sym' });
  // Clamp voltage between the line and ground.
  b += path(`M${X + 12},${G}H318`, 'ext')
    + dimV(Y, G, 306, r ? `Vcl ${V(r.vClamp)}` : 'Vcl', { cls: r ? judged(r.checks.clamp) : 'sym' });
  if (r?.event === 'esd') b += text(312, 136, `30 ns: ${V(r.vClamp30)}`, { cls: judged(r.checks.clamp30), anchor: 'start' });
  return svg(440, 190, b, t('pr_dgTvsAria'), { wide: true });
}

/** Source → fuse or PTC → load, with the fault that shorts the load. */
function seriesDiagram(v, r) {
  const isPtc = (r?.mode ?? v.mode) === 'ptc';
  const T = 50; const B = 150;
  let b = twoTerm('V', 40, T, 40, B, { name: 'V', value: r ? V(r.vCircuit) : undefined })
    + wire([40, T], [96, T])
    + wire([176, T], [360, T]) + wire([40, B], [360, B])
    + node(250, T) + node(250, B);
  if (r?.faultFromR) b += text(59, 136, `Rloop ${val(r.rLoop, 'Ω')}`, { cls: 'lbl', anchor: 'start' });
  if (isPtc) {
    b += twoTerm('NTC', 96, T, 176, T, { name: 'PTC', value: r ? `Ihold(T) ${A(r.iHoldT)}` : 'Ihold(T)', valueCls: r ? judged(r.checks.hold) : 'sym' });
    if (r) {
      b += text(136, 86, `Itrip(T) ${A(r.iTripT)}`, { cls: 'lbl' })
        + text(136, 100, `ΔV ${V(r.vDrop)}`, { cls: 'lbl' });
    }
  } else {
    b += twoTerm('F', 96, T, 176, T, { name: 'F1', value: r ? `In ${A(r.iN)}` : 'In' });
    if (r) b += text(136, 86, `In,min ${A(r.iNMin)}`, { cls: judged(r.checks.rate) });
  }
  // Normal current through the load; the fault closes a short across it.
  b += arrow(292, T - 9, 336, T - 9, FLOW)
    + twoTerm('R', 360, T, 360, B, { name: t('pr_dgLoad'), value: r ? `Iop ${A(r.iOp)}` : 'Iop', valueCls: r ? 'val' : 'sym' })
    + twoTerm('SW', 250, T, 250, B, { name: t('pr_dgFault'), value: r ? A(r.iFault) : 'Ifault', valueCls: r ? 'val' : 'sym', dashed: true, flip: true })
    + arrow(274, T + 24, 274, B - 24, FLOW);
  return svg(440, 172, b, t(isPtc ? 'pr_dgPtcAria' : 'pr_dgFuseAria'), { wide: true });
}

/** Series Schottky and P-channel MOSFET side by side, with their drops. */
function revDiagram(v, r) {
  const Y = 66;
  const sum = (x, part, status) => (r
    ? text(x, 190, `ΔV ${V(part.vDrop)} · P ${val(part.p, 'W')}`, { cls: 'val' })
      + text(x, 206, `${pct(part.share)} · Tj ${deg(part.tj)}`, { cls: judged(status) })
    : text(x, 190, 'ΔV · P', { cls: 'sym' }) + text(x, 206, 'Tj', { cls: 'sym' }));
  // Left: the diode.
  let b = text(104, 16, t('pr_dgDiode'), { cls: 'title' })
    + terminal(22, Y, 'Vin', 'top') + wire([25, Y], [52, Y])
    + twoTerm('D', 52, Y, 122, Y, { name: 'D1', value: r ? `VF ${V(r.vF)}` : 'VF', valueCls: r ? 'val' : 'sym' })
    + wire([122, Y], [176, Y]) + twoTerm('R', 176, Y, 176, 136) + ground(176, 136)
    + text(176, 166, t('pr_dgLoad'), { cls: 'name' })
    + sum(104, r?.diode, r?.checks.tjd)
    + path('M214,8V214', 'ext');
  // Right: the MOSFET, its symbol turned so that the drain is at the input,
  // the source at the load and the gate points down.
  const zener = !!r?.zener;
  b += text(326, 16, 'P-MOSFET', { cls: 'title' })
    + terminal(238, Y, 'Vin', 'top') + wire([241, Y], [274, Y])
    + `<g transform="translate(300,78) rotate(-90)">${mosfet(0, 0, { p: true })}</g>`
    + text(276, Y - 6, 'D') + text(324, Y - 6, 'S')
    + text(300, 48, r ? `Q1 · ${val(r.rDsOn, 'Ω')}` : 'Q1 · RDS(on)', { cls: r ? 'val' : 'name' })
    + wire([326, Y], [412, Y]) + twoTerm('R', 412, Y, 412, 136) + ground(412, 136)
    + text(412, 166, t('pr_dgLoad'), { cls: 'name' })
    // Gate to ground through RG; zener from gate to source (dashed while not fitted).
    + wire([300, 96], [300, 108]) + node(300, 108)
    + twoTerm('R', 300, 108, 300, 156, { name: 'RG', value: zener ? val(r.rGate, 'Ω') : undefined, flip: true })
    + ground(300, 156)
    + poly([[300, 108], [356, 108]], `wire${zener ? '' : ' dash'}`)
    + twoTerm('Z', 356, 108, 356, Y, { name: 'DZ', value: zener ? V(r.vZ) : undefined, dashed: !zener })
    + node(356, Y)
    + text(294, 104, r ? `|VGS| ${V(r.vGs)}` : '|VGS|', { cls: r ? judged(r.checks.vgs === 'ok' && r.checks.drive === 'ok' ? 'ok' : 'bad') : 'sym', anchor: 'end' })
    + sum(326, r?.fet, r?.checks.tjm);
  return svg(440, 218, b, t('pr_dgRevAria'), { wide: true });
}

function diagram(v, u, r) {
  const mode = r?.mode ?? v.mode;
  if (mode === 'rev') return revDiagram(v, r);
  if (mode === 'fuse' || mode === 'ptc') return seriesDiagram(v, r);
  return tvsDiagram(v, r);
}

// ---------------------------------------------------------------------------
// Results. Every number comes from the engine result.
// ---------------------------------------------------------------------------

const note = (html) => `<p class="note">${html}</p>`;
const cmp = (a, ok, opOk, opBad, b) => `${a} ${ok ? opOk : opBad} ${b}`;
/** One line of the check list: status 'ok' | 'warn' | 'bad', or null for "not judged". */
const line = (status, label, detail) => [status === null ? null : status === 'ok' ? true : status === 'warn' ? 'warn' : false, esc(label), esc(detail)];

/** Messages under the headline: what fails, what to watch, what passes. */
function verdicts(errors, warns, oks, vars) {
  return messages('error', errors, vars) + messages('warn', warns, vars) + messages('ok', oks, vars);
}

function tvsSteps(r) {
  const esd = r.event === 'esd';
  const vbr = QI(r.vBr, 'V');
  const rd = Q(r.rDyn, 'Ω');
  const ipk = Q(r.iPk, 'A');
  const vcl = Q(r.vClamp, 'V');
  const clamp = { label: 'pr_sVcl', sym: 'V_{cl} = V_{BR} + R_{dyn} \\cdot I_{pk}', num: `${vbr} + ${rd} \\cdot ${esd || r.event === 'surge' ? ipk : QI(r.iPk, 'A')}`, res: vcl };
  const list = [
    { label: 'pr_sRdyn', sym: 'R_{dyn} = \\frac{V_C − V_{BR}}{I_{PP}}', num: `\\frac{${QI(r.vC, 'V')} − ${vbr}}{${QI(r.iPp, 'A')}}`, res: rd },
  ];
  if (esd) {
    const level = QI(r.esdKv * 1000, 'V');
    const perKv = (k) => tx(`${num(k, 4)} A/kV`);
    list.push(
      { label: 'pr_sIpkEsd', sym: 'I_{pk} = k_{pk} \\cdot V_{ESD}', num: `${perKv(ESD_PEAK_A_PER_KV)} \\cdot ${level}`, res: ipk },
      { label: 'pr_sI30', sym: 'I_{30} = k_{30} \\cdot V_{ESD}', num: `${perKv(ESD_30NS_A_PER_KV)} \\cdot ${level}`, res: Q(r.i30, 'A') },
      clamp,
      { label: 'pr_sVcl30', sym: 'V_{cl,30} = V_{BR} + R_{dyn} \\cdot I_{30}', num: `${vbr} + ${rd} \\cdot ${Q(r.i30, 'A')}`, res: Q(r.vClamp30, 'V') },
      r.lNh > 0 && { label: 'pr_sDvL', sym: 'ΔV_L ≈ L_p \\cdot \\frac{I_{pk}}{t_r}', num: `${QI(r.lNh * 1e-9, 'H')} \\cdot \\frac{${ipk}}{${Q(r.riseS, 's')}}`, res: Q(r.dvL, 'V') },
      r.lNh > 0 && { label: 'pr_sVfirst', sym: 'V_{pk} ≈ V_{cl} + ΔV_L', num: `${vcl} + ${Q(r.dvL, 'V')}`, res: Q(r.vFirst, 'V') },
    );
  } else if (r.event === 'surge' && !r.conducts) {
    list.push({ label: 'pr_sVcl', sym: 'V_{OC} ≤ V_{BR} \\to I_{pk} = 0, \\quad V_{cl} = V_{OC}', res: vcl, note: 'pr_sNoClamp' });
  } else {
    if (r.event === 'surge') {
      list.push({ label: 'pr_hIpk', sym: 'I_{pk} = \\frac{V_{OC} − V_{BR}}{Z_s + R_{dyn}}', num: `\\frac{${QI(r.vOc, 'V')} − ${vbr}}{${QI(r.zS, 'Ω')} + ${rd}}`, res: ipk });
    }
    list.push(
      clamp,
      { label: 'pr_sPpk', sym: 'P_{pk} = V_{cl} \\cdot I_{pk}', num: `${vcl} \\cdot ${ipk}`, res: Q(r.pPk, 'W') },
      { label: 'pr_sIppUse', sym: '\\frac{I_{pk}}{I_{PP}}', num: `\\frac{${ipk}}{${QI(r.iPp, 'A')}}`, res: P(r.ippUse) },
    );
  }
  if (r.cap) {
    list.push(
      { label: 'pr_sFc', sym: 'f_c = \\frac{1}{π \\cdot Z_0 \\cdot C}', num: `\\frac{1}{π \\cdot ${QI(r.cap.z0, 'Ω')} \\cdot ${QI(r.cap.cPf * 1e-12, 'F')}}`, res: Q(r.cap.fcHz, 'Hz') },
      r.cap.ratio !== null && { label: 'pr_sFcRatio', sym: '\\frac{f_c}{B}', num: `\\frac{${Q(r.cap.fcHz, 'Hz')}}{${QI(r.cap.bwHz, 'Hz')}}`, res: N(r.cap.ratio) },
    );
  }
  return steps(list, {
    note: 'pr_noteTvs',
    refs: REFS.tvs,
    where: [
      ['V_{BR}', 'pr_vbr', 'vbr'], ['V_C', 'pr_vc', 'vc'], ['I_{PP}', 'pr_ipp', 'ipp'],
      esd && ['V_{ESD}', 'pr_kv', 'kv'], esd && ['k_{pk}', 'pr_wKpk'], esd && ['k_{30}', 'pr_wK30'],
      esd && r.lNh > 0 && ['L_p', 'pr_lp', 'lp'], esd && r.lNh > 0 && ['t_r', 'pr_wTr'],
      r.event === 'surge' && ['V_{OC}', 'pr_voc', 'voc'], r.event === 'surge' && r.conducts && ['Z_s', 'pr_zs', 'zs'],
      r.event === 'custom' && ['I_{pk}', 'pr_ipk', 'ipk'],
      r.cap && ['Z_0', 'pr_z0', 'z0'], r.cap && ['C', 'pr_ct', 'ct'], r.cap && r.cap.ratio !== null && ['B', 'pr_bw', 'bw'],
    ],
  });
}

function tvsView(r) {
  const c = r.checks;
  const esd = r.event === 'esd';
  const surge = r.event === 'surge';
  const off = surge && !r.conducts;
  const sub = (status, m) => esc(t(status === 'ok' ? 'pr_subPass' : 'pr_subOver', { abs: V(r.vAbs), m: V(Math.abs(m)) }));
  const main = heroes([
    ['pr_hClamp', siHtml(r.vClamp, 'V', 3), `${esc(A(r.iPk))} · ${sub(c.clamp, r.margin)}`],
    esd
      ? ['pr_hClamp30', siHtml(r.vClamp30, 'V', 3), `${esc(A(r.i30))} · ${sub(c.clamp30, r.margin30)}`]
      : ['pr_hIpk', siHtml(r.iPk, 'A', 3), esc(t('pr_subIpp', { ipp: A(r.iPp), x: pct(r.ippUse) }))],
  ]);

  const errors = [];
  const warns = [];
  const oks = [];
  const peak = { i: A(r.iPk), v: V(r.vClamp), abs: V(r.vAbs), over: V(-r.margin), m: V(r.margin) };
  const vars = {
    pr_rwm: { rwm: V(r.vRwm), line: V(r.vLine) },
    pr_clamp: peak,
    pr_tvs: peak,
    pr_ipp: { i: A(r.iPk), ipp: A(r.iPp), x: pct(r.ippUse) },
    pr_vbrLow: { vbr: V(r.vBr), rwm: V(r.vRwm) },
  };
  if (c.rwm === 'bad') errors.push('pr_rwm');
  if (esd) {
    const e = { ...peak, i30: A(r.i30), v30: V(r.vClamp30), m30: V(r.margin30) };
    vars.pr_clamp30 = { ...e, over: V(-r.margin30) };
    vars.pr_clampPk = e;
    vars.pr_tvsEsd = e;
    if (c.clamp30 === 'bad') errors.push('pr_clamp30');
    else if (c.clamp === 'bad') errors.push('pr_clampPk');
    else oks.push('pr_tvsEsd');
    if (c.esdr === 'bad') {
      errors.push('pr_esdr');
      vars.pr_esdr = { r: val(r.esdRatingKv * 1000, 'V'), lvl: val(r.esdKv * 1000, 'V') };
    }
  } else if (off) {
    const o = { voc: V(r.vOc), vbr: V(r.vBr), abs: V(r.vAbs) };
    vars.pr_clampOff = o;
    vars.pr_tvsOff = o;
    if (c.clamp === 'bad') errors.push('pr_clampOff'); else oks.push('pr_tvsOff');
  } else if (c.clamp === 'bad') errors.push('pr_clamp');
  else oks.push('pr_tvs');
  if (c.ipp === 'bad') errors.push('pr_ipp');
  if (c.ipp === 'warn') warns.push('pr_ipp');
  if (c.cap === 'warn') {
    warns.push('pr_cap');
    vars.pr_cap = { fc: val(r.cap.fcHz, 'Hz'), bw: val(r.cap.bwHz, 'Hz') };
  }
  warns.push(...r.warnings);

  const margin = t('pr_margin');
  const clampLine = (status, key, v, i, m) => line(status, t(key), `${cmp(`${V(v)} @ ${A(i)}`, status === 'ok', '≤', '>', V(r.vAbs))} · ${margin} ${V(m)}`);
  const list = block('pr_checks', checks([
    line(c.rwm, t('pr_ckRwm'), `${cmp(V(r.vRwm), c.rwm === 'ok', '≥', '<', V(r.vLine))} · ${margin} ${V(r.rwmMargin)}`),
    off
      ? line(c.clamp, t('pr_ckClamp'), `${cmp(V(r.vClamp), c.clamp === 'ok', '≤', '>', V(r.vAbs))} · ${margin} ${V(r.margin)}`)
      : clampLine(c.clamp, esd ? 'pr_ckClampPk' : 'pr_ckClamp', r.vClamp, r.iPk, r.margin),
    esd && clampLine(c.clamp30, 'pr_ckClamp30', r.vClamp30, r.i30, r.margin30),
    c.ipp && line(c.ipp, t('pr_ckIpp'), `${cmp(A(r.iPk), c.ipp === 'ok', '≤', '>', A(r.iPp))} · ${pct(r.ippUse)}`),
    c.esdr && line(c.esdr, t('pr_ckEsdr'), cmp(val(r.esdRatingKv * 1000, 'V'), c.esdr === 'ok', '≥', '<', val(r.esdKv * 1000, 'V'))),
    r.cap && (c.cap
      ? line(c.cap, t('pr_ckCap'), `${cmp(val(r.cap.fcHz, 'Hz'), c.cap === 'ok', '≥', '<', val(r.cap.bwHz, 'Hz'))} · × ${num(r.cap.ratio)}`)
      : line(null, t('pr_ckCap'), `${val(r.cap.fcHz, 'Hz')} · ${t('pr_noBw')}`)),
  ]));

  const details = block('results', rows([
    ['pr_rRdyn', val(r.rDyn, 'Ω')],
    esd && ['pr_rEsdI', `${A(r.iPk)} / ${A(r.i30)} / ${A(r.i60)}`],
    esd && ['pr_rVcl3', `${V(r.vClamp)} / ${V(r.vClamp30)} / ${V(r.vClamp60)}`],
    esd && ['pr_rMargin2', `${V(r.margin)} / ${V(r.margin30)}`],
    esd && r.lNh > 0 && ['pr_rDvL', `≈ ${V(r.dvL)}`],
    esd && r.lNh > 0 && ['pr_rVfirst', `≈ ${V(r.vFirst)}`],
    surge && ['pr_rIshort', A(r.iShort)],
    !esd && ['pr_hIpk', A(r.iPk)],
    !esd && ['pr_rVcl', V(r.vClamp), true],
    !esd && ['pr_rMargin', V(r.margin)],
    !esd && ['pr_rPpk', val(r.pPk, 'W')],
    !esd && ['pr_rIppUse', pct(r.ippUse)],
    ['pr_rRwm', V(r.rwmMargin)],
    r.cap && ['pr_rFc', val(r.cap.fcHz, 'Hz')],
    r.cap && r.cap.ratio !== null && ['pr_rFcRatio', `× ${num(r.cap.ratio)}`],
  ]) + (esd && r.lNh > 0
    ? note(esc(t('pr_lNote', { l: val(r.lNh * 1e-9, 'H'), tr: val(r.riseS, 's'), dv: V(r.dvL), vf: V(r.vFirst) }))) : ''));

  return main + verdicts(errors, warns, oks, vars) + list + tvsSteps(r) + details;
}

/** Fault current from the loop resistance, shared by the fuse and the PTC. */
const faultStep = (r) => r.faultFromR && { label: 'pr_sIfault', sym: 'I_{fault} = \\frac{V}{R_{loop}}', num: `\\frac{${QI(r.vCircuit, 'V')}}{${QI(r.rLoop, 'Ω')}}`, res: Q(r.iFault, 'A') };
const faultWhere = (r) => (r.faultFromR
  ? [['V', 'pr_vckt', 'vckt'], ['R_{loop}', 'pr_rl', 'rl']]
  : [['I_{fault}', 'pr_ifl', 'ifl']]);

const PULSE_TEX = {
  rect: ['I_p^{2} \\cdot t_p', (i, d) => `{(${i})}^{2} \\cdot ${d}`],
  tri: ['\\frac{1}{3} \\cdot I_p^{2} \\cdot t_p', (i, d) => `\\frac{1}{3} \\cdot {(${i})}^{2} \\cdot ${d}`],
  sine: ['\\frac{1}{2} \\cdot I_p^{2} \\cdot t_p', (i, d) => `\\frac{1}{2} \\cdot {(${i})}^{2} \\cdot ${d}`],
  exp: ['\\frac{1}{2} \\cdot I_p^{2} \\cdot τ', (i, d) => `\\frac{1}{2} \\cdot {(${i})}^{2} \\cdot ${d}`],
};

function fuseSteps(r) {
  const iop = QI(r.iOp, 'A');
  const rated = QI(r.iN, 'A');
  const pulse = r.hasPulse ? PULSE_TEX[r.shape] : null;
  const p = r.hasPulse ? I2T(r.i2tPulse) : '';
  return steps([
    { label: 'pr_hInMin', sym: 'I_{n,min} = \\frac{I_{op}}{k_d \\cdot K_t}', num: `\\frac{${iop}}{${P(r.derate)} \\cdot ${N(r.kT)}}`, res: Q(r.iNMin, 'A') },
    { label: 'pr_sLoad', sym: '\\frac{I_{op}}{I_n}', num: `\\frac{${iop}}{${rated}}`, res: P(r.load) },
    pulse && { label: 'pr_sI2tP', sym: `I^{2}t_{p} = ${pulse[0]}`, num: pulse[1](QI(r.iPulse, 'A'), QI(r.tPulse, 's')), res: p },
    pulse && { label: 'pr_sI2tReq', sym: 'I^{2}t_{req} = \\frac{I^{2}t_{p}}{F_p}', num: `\\frac{${p}}{${P(r.pulseFactor)}}`, res: I2T(r.i2tReq) },
    pulse && { label: 'pr_sPulseUse', sym: '\\frac{I^{2}t_{p}}{I^{2}t_{melt}}', num: `\\frac{${p}}{${I2T(r.i2tMelt, 6)}}`, res: P(r.pulseUse) },
    faultStep(r),
    { label: 'pr_sFaultRatio', sym: '\\frac{I_{fault}}{I_n}', num: `\\frac{${r.faultFromR ? Q(r.iFault, 'A') : QI(r.iFault, 'A')}}{${rated}}`, res: N(r.faultRatio) },
  ], {
    note: 'pr_noteFuse',
    refs: REFS.fuse,
    where: [
      ['I_{op}', 'pr_iop', 'iop'], ['k_d', 'pr_der', 'der'], ['K_t', 'pr_kt', 'kt'], ['I_n', 'pr_in', 'in'],
      pulse && ['I_p', 'pr_ip', 'ip'], pulse && (r.shape === 'exp' ? ['τ', 'pr_tau', 'tp'] : ['t_p', 'pr_tp', 'tp']),
      pulse && (r.pulses ? ['F_p', 'pr_np', 'np'] : ['F_p', 'pr_pf', 'pf']), pulse && ['I^{2}t_{melt}', 'pr_i2t', 'i2t'],
      ...faultWhere(r),
    ],
  });
}

function fuseView(r) {
  const c = r.checks;
  const k = num(r.openRatio);
  const verdict = r.failed > 0 ? t('pr_subCandBad', { f: r.failed, n: r.total })
    : r.warned > 0 ? t('pr_subCandWarn', { w: r.warned }) : t('pr_subCandOk', { n: r.total });
  const main = heroes([
    ['pr_hInMin', siHtml(r.iNMin, 'A', 3), esc(`${A(r.iOp)} / (${pct(r.derate)} · ${num(r.kT)})`)],
    ['pr_hCand', siHtml(r.iN, 'A', 3), esc(verdict)],
  ]);
  const fault = { i: A(r.iFault), in: A(r.iN), ibr: A(r.iBreak), x: num(r.faultRatio), k };
  const vars = {
    pr_fuse: { in: A(r.iN), iop: A(r.iOp), min: A(r.iNMin) },
    pr_rate: { in: A(r.iN), iop: A(r.iOp), min: A(r.iNMin) },
    pr_volt: { vr: V(r.vRated), v: V(r.vCircuit) },
    pr_brk: fault,
    pr_opens: fault,
  };
  if (r.hasPulse) vars.pr_i2t = { m: i2tTxt(r.i2tMelt), req: i2tTxt(r.i2tReq), use: pct(r.pulseUse), pf: pct(r.pulseFactor) };
  const errors = ['rate', 'i2t', 'volt', 'brk', 'opens'].filter((id) => c[id] === 'bad').map((id) => `pr_${id}`);
  const warns = c.opens === 'warn' ? ['pr_opens'] : [];
  const oks = r.pass && !r.warned ? ['pr_fuse'] : [];

  const list = block('pr_checks', checks([
    line(c.rate, t('pr_ckRate'), `${cmp(A(r.iN), c.rate === 'ok', '≥', '<', A(r.iNMin))} · ${t('pr_ckRateD', { x: pct(r.load), lim: pct(r.loadLimit) })}`),
    r.hasPulse
      ? line(c.i2t, t('pr_ckI2t'), `${cmp(i2tTxt(r.i2tMelt), c.i2t === 'ok', '≥', '<', i2tTxt(r.i2tReq))} · ${t('pr_ckI2tD', { x: pct(r.pulseUse), lim: pct(r.pulseFactor) })}`)
      : line(null, t('pr_ckI2t'), t('pr_noPulse')),
    line(c.volt, t('pr_ckVolt'), cmp(V(r.vRated), c.volt === 'ok', '≥', '<', V(r.vCircuit))),
    line(c.brk, t('pr_ckBrk'), cmp(A(r.iBreak), c.brk === 'ok', '≥', '<', A(r.iFault))),
    line(c.opens, t('pr_ckOpens', { k }), `${A(r.iFault)} = ${num(r.faultRatio)} × In`),
  ]));

  const details = block('results', rows([
    ['pr_hInMin', A(r.iNMin), true],
    ['pr_rLoad', esc(t('pr_rLoadV', { x: pct(r.load), lim: pct(r.loadLimit) }))],
    r.hasPulse && ['pr_rI2tP', i2tTxt(r.i2tPulse)],
    r.hasPulse && ['pr_rI2tReq', i2tTxt(r.i2tReq), true],
    r.hasPulse && ['pr_rPulseUse', esc(t('pr_rLoadV', { x: pct(r.pulseUse), lim: pct(r.pulseFactor) }))],
    ['pr_rIfault', r.faultFromR ? `${A(r.iFault)} (${V(r.vCircuit)} / ${val(r.rLoop, 'Ω')})` : A(r.iFault)],
    ['pr_rFaultRatio', `× ${num(r.faultRatio)}`],
  ]) + note(`${esc(t('pr_fuseLink'))} <a href="#/fusing">${esc(t('tool_fusing'))}</a> · <a href="#/inrush">${esc(t('tool_inrush'))}</a>`));

  return main + verdicts(errors, warns, oks, vars) + list + fuseSteps(r) + details;
}

function ptcSteps(r) {
  const iop = QI(r.iOp, 'A');
  const k = P(r.kTemp);
  const hold = Q(r.iHoldT, 'A');
  const trip = Q(r.iTripT, 'A');
  const r1 = QI(r.r1Max, 'Ω');
  return steps([
    { label: 'pr_hHoldT', sym: 'I_{hold}(T) = I_{hold} \\cdot k_T', num: `${QI(r.iHold, 'A')} \\cdot ${k}`, res: hold },
    { label: 'pr_hTripT', sym: 'I_{trip}(T) = I_{trip} \\cdot k_T', num: `${QI(r.iTrip, 'A')} \\cdot ${k}`, res: trip },
    { label: 'pr_sHoldUse', sym: '\\frac{I_{op}}{I_{hold}(T)}', num: `\\frac{${iop}}{${hold}}`, res: P(r.holdUse) },
    faultStep(r),
    { label: 'pr_sTripRatio', sym: '\\frac{I_{fault}}{I_{trip}(T)}', num: `\\frac{${r.faultFromR ? Q(r.iFault, 'A') : QI(r.iFault, 'A')}}{${trip}}`, res: N(r.tripRatio) },
    { label: 'pr_sVdrop', sym: 'V_{drop} = I_{op} \\cdot R_{1max}', num: `${iop} \\cdot ${r1}`, res: Q(r.vDrop, 'V') },
    { label: 'pr_sPloss', sym: 'P = I_{op}^{2} \\cdot R_{1max}', num: `{(${iop})}^{2} \\cdot ${r1}`, res: Q(r.pLoss, 'W') },
    { label: 'pr_sItripped', sym: 'I_{off} ≈ \\frac{P_d}{V}', num: `\\frac{${QI(r.pD, 'W')}}{${QI(r.vCircuit, 'V')}}`, res: Q(r.iTripped, 'A') },
  ], {
    note: 'pr_notePtc',
    refs: REFS.ptc,
    where: [
      ['I_{hold}', 'pr_ih', 'ih'], ['I_{trip}', 'pr_itr', 'itr'], ['k_T', 'pr_kd', 'kd'], ['T', 'pr_wTa', 'ta'], ['I_{op}', 'pr_iop', 'iop'],
      ...(r.faultFromR ? [['R_{loop}', 'pr_rl', 'rl']] : faultWhere(r)),
      ['R_{1max}', 'pr_r1', 'r1'], ['P_d', 'pr_pd', 'pd'], ['V', 'pr_vckt', 'vckt'],
    ],
  });
}

function ptcView(r) {
  const c = r.checks;
  const holdOk = c.hold === 'ok';
  const main = heroes([
    ['pr_hHoldT', siHtml(r.iHoldT, 'A', 3), esc(t(holdOk ? 'pr_subHold' : 'pr_subHoldBad', { iop: A(r.iOp), m: pct(Math.abs(r.holdMargin)) }))],
    ['pr_hTripT', siHtml(r.iTripT, 'A', 3), esc(t('pr_subTrip', { i: A(r.iFault), x: num(r.tripRatio) }))],
  ]);
  const all = {
    iop: A(r.iOp), iht: A(r.iHoldT), itt: A(r.iTripT), i: A(r.iFault), x: num(r.tripRatio), m: pct(r.holdMargin),
    im: A(r.iMax), v: V(r.vCircuit), vm: V(r.vMax),
  };
  const errors = [];
  if (!holdOk) errors.push(r.opZone === 'trip' ? 'pr_holdTrip' : 'pr_holdBand');
  if (c.trip === 'bad') errors.push(r.faultZone === 'hold' ? 'pr_tripNo' : 'pr_tripBand');
  if (c.imax === 'bad') errors.push('pr_imax');
  if (c.vmax === 'bad') errors.push('pr_vmax');
  const keys = ['pr_ptc', 'pr_holdTrip', 'pr_holdBand', 'pr_tripNo', 'pr_tripBand', 'pr_imax', 'pr_vmax'];
  const vars = Object.fromEntries(keys.map((key) => [key, all]));

  const list = block('pr_checks', checks([
    line(c.hold, t('pr_ckHold'), `${cmp(A(r.iHoldT), holdOk, '≥', '<', A(r.iOp))} · ${t('pr_margin')} ${pct(r.holdMargin)}`),
    line(c.trip, t('pr_ckTrip'), `${cmp(A(r.iFault), c.trip === 'ok', '>', '≤', A(r.iTripT))} · × ${num(r.tripRatio)}`),
    line(c.imax, t('pr_ckImax'), cmp(A(r.iFault), c.imax === 'ok', '≤', '>', A(r.iMax))),
    line(c.vmax, t('pr_ckVmax'), cmp(V(r.vCircuit), c.vmax === 'ok', '≤', '>', V(r.vMax))),
  ]));

  const details = block('results', rows([
    ['pr_rHoldTrip', `${A(r.iHoldT)} / ${A(r.iTripT)}`, true],
    ['pr_rHoldUse', pct(r.holdUse)],
    ['pr_rIfault', r.faultFromR ? `${A(r.iFault)} (${V(r.vCircuit)} / ${val(r.rLoop, 'Ω')})` : A(r.iFault)],
    ['pr_rTripRatio', `× ${num(r.tripRatio)}`],
    ['pr_rVdrop', `${V(r.vDrop)} · ${pct(r.vDropShare)}`],
    ['pr_rPloss', val(r.pLoss, 'W')],
    ['pr_rItripped', A(r.iTripped)],
  ]) + note(esc(t('pr_bandNote', { a: A(r.iHoldT), b: A(r.iTripT) }))));

  return main + verdicts(errors, [], r.pass ? ['pr_ptc'] : [], vars) + list + ptcSteps(r) + details;
}

function revSteps(r) {
  const vin = QI(r.vIn, 'V');
  const i = QI(r.iLoad, 'A');
  const ta = DEG(r.ambientC);
  const rds = QI(r.rDsOn, 'Ω');
  const pd = Q(r.diode.p, 'W');
  const pm = Q(r.fet.p, 'W');
  const sig = sigFor(r.diode.p, r.fet.p);
  return steps([
    { label: 'pr_sPd', sym: 'P_D = V_F \\cdot I', num: `${QI(r.vF, 'V')} \\cdot ${i}`, res: pd },
    { label: 'pr_sShareD', sym: '\\frac{P_D}{V_{in} \\cdot I}', num: `\\frac{${pd}}{${vin} \\cdot ${i}}`, res: P(r.diode.share) },
    { label: 'pr_sTjD', sym: 'T_{j,D} = T_a + P_D \\cdot R_{θJA,D}', num: `${ta} + ${pd} \\cdot ${THETA(r.thetaDiode)}`, res: DEG(r.diode.tj) },
    r.zener
      ? { label: 'pr_sVgs', sym: '|V_{GS}| = \\min(V_{in}, V_Z)', num: `\\min(${vin}, ${QI(r.vZ, 'V')})`, res: QI(r.vGs, 'V') }
      : { label: 'pr_sVgs', sym: '|V_{GS}| = V_{in}', res: QI(r.vGs, 'V') },
    { label: 'pr_sVdM', sym: 'V_{DS} = I \\cdot R_{DS(on)}', num: `${i} \\cdot ${rds}`, res: Q(r.fet.vDrop, 'V') },
    { label: 'pr_sPm', sym: 'P_M = I^{2} \\cdot R_{DS(on)}', num: `{(${i})}^{2} \\cdot ${rds}`, res: pm },
    { label: 'pr_sShareM', sym: '\\frac{P_M}{V_{in} \\cdot I}', num: `\\frac{${pm}}{${vin} \\cdot ${i}}`, res: P(r.fet.share) },
    { label: 'pr_sTjM', sym: 'T_{j,M} = T_a + P_M \\cdot R_{θJA,M}', num: `${ta} + ${pm} \\cdot ${THETA(r.thetaFet)}`, res: DEG(r.fet.tj) },
    r.zener && (r.zenerActive
      ? { label: 'pr_sIz', sym: 'I_Z = \\frac{V_{in} − V_Z}{R_G}', num: `\\frac{${vin} − ${QI(r.vZ, 'V')}}{${QI(r.rGate, 'Ω')}}`, res: Q(r.iZ, 'A') }
      : { label: 'pr_sIz', sym: 'V_{in} ≤ V_Z \\to I_Z = 0', note: 'pr_sIzIdle' }),
    { label: 'pr_sSaved', sym: 'ΔP = P_D − P_M', num: `${Q(r.diode.p, 'W', sig)} − ${Q(r.fet.p, 'W', sig)}`, res: Q(r.saved, 'W') },
  ], {
    note: 'pr_noteRev',
    refs: REFS.rev,
    where: [
      ['V_{in}', 'pr_vin', 'vin'], ['I', 'pr_il', 'il'], ['V_F', 'pr_vf', 'vf'], ['R_{DS(on)}', 'pr_rds', 'rds'],
      ['T_a', 'pr_wTa', 'ta'], ['R_{θJA,D}', 'pr_rjd', 'rjd'], ['R_{θJA,M}', 'pr_rjm', 'rjm'],
      r.zener && ['V_Z', 'pr_vz', 'vz'], r.zenerActive && ['R_G', 'pr_rg', 'rg'],
    ],
  });
}

function revView(r) {
  const c = r.checks;
  const loss = (part) => esc(t('pr_subLoss', { dv: V(part.vDrop), x: pct(part.share), tj: deg(part.tj) }));
  const main = heroes([
    ['pr_hPd', siHtml(r.diode.p, 'W', 3), loss(r.diode)],
    ['pr_hPm', siHtml(r.fet.p, 'W', 3), loss(r.fet)],
  ]);
  const gate = { vgs: V(r.vGs), vth: V(r.vGsTh), vgr: V(r.vGsRds), vin: V(r.vIn), vgm: V(r.vGsMax), vz: r.zener ? V(r.vZ) : '' };
  const losses = { pm: val(r.fet.p, 'W'), pd: val(r.diode.p, 'W'), saved: val(r.saved, 'W'), x: pct(r.savedShare) };
  const vars = {
    pr_drive: gate, pr_vgs: gate, pr_vz: gate,
    pr_tjd: { tj: deg(r.diode.tj), max: deg(r.tjMaxC) },
    pr_tjm: { tj: deg(r.fet.tj), max: deg(r.tjMaxC) },
    pr_rev: losses, pr_fetWorse: losses,
  };
  const errors = [];
  const warns = [];
  if (c.drive === 'bad') errors.push('pr_drive');
  if (c.drive === 'warn') warns.push('pr_drive');
  if (c.vgs === 'bad') errors.push(r.zener ? 'pr_vz' : 'pr_vgs');
  if (c.tjd === 'bad') errors.push('pr_tjd');
  if (c.tjm === 'bad') errors.push('pr_tjm');
  const better = r.saved > 0;
  if (!better) warns.push('pr_fetWorse');
  const oks = better && r.fetOk && c.drive === 'ok' ? ['pr_rev'] : [];

  const list = block('pr_checks', checks([
    line(c.drive, t('pr_ckDrive'), `${cmp(V(r.vGs), c.drive === 'ok', '≥', '<', V(r.vGsRds))} · ${t('pr_ckDriveD', { vth: V(r.vGsTh) })}`),
    line(c.vgs, t('pr_ckVgs'), `${cmp(V(r.vGs), c.vgs === 'ok', '≤', '>', V(r.vGsMax))} · ${t(r.zenerActive ? 'pr_ckVgsZ' : 'pr_ckVgsNo')}`),
    line(c.tjd, t('pr_ckTjd'), cmp(deg(r.diode.tj), c.tjd === 'ok', '≤', '>', deg(r.tjMaxC))),
    line(c.tjm, t('pr_ckTjm'), cmp(deg(r.fet.tj), c.tjm === 'ok', '≤', '>', deg(r.tjMaxC))),
  ]));

  const row = (key, fn) => `<tr><th scope="row">${esc(t(key))}</th><td>${esc(fn(r.diode))}</td><td>${esc(fn(r.fet))}</td></tr>`;
  const table = `<div class="table-scroll"><table class="grid"><thead><tr><th scope="col"></th>
    <th scope="col">${esc(t('pr_colDiode'))}</th><th scope="col">${esc(t('pr_colFet'))}</th></tr></thead><tbody>${
    row('voltageDrop', (x) => V(x.vDrop)) + row('powerLoss', (x) => val(x.p, 'W')) + row('pr_rShare', (x) => pct(x.share))
    + row('pr_rTj', (x) => deg(x.tj)) + row('pr_rVout', (x) => val(x.vOut, 'V', 4))}</tbody></table></div>`;
  const details = block('pr_blkCompare', table + rows([
    ['pr_rSaved', `${val(r.saved, 'W')} · ${pct(r.savedShare)}`, true],
    ['pr_rVgs', V(r.vGs)],
    r.zener && ['pr_rIz', r.zenerActive ? A(r.iZ) : esc(t('pr_rIzIdle'))],
  ]));

  return main + verdicts(errors, warns, oks, vars) + list + revSteps(r) + details;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

// Worked examples: every value in the first unit of its field.
const LINE_OFF = { ct: '', z0: 50, bw: '' };
const EXAMPLES = {
  line: { mode: 'tvs', ev: 'esd', vl: 12, vabs: 40, vrwm: 15, vbr: 16.7, vc: 24.4, ipp: 16.4, kv: 8, kvr: '', lp: 2, ...LINE_OFF },
  usb: { mode: 'tvs', ev: 'esd', vl: 3.6, vabs: 6, vrwm: 5, vbr: 6, vc: 10, ipp: 16, kv: 8, kvr: '', lp: 2, ct: 0.5, z0: 45, bw: 720 },
  surge: { mode: 'tvs', ev: 'surge', vl: 24, vabs: 60, vrwm: 26, vbr: 28.9, vc: 55, ipp: 500, voc: 1, zs: '2', ...LINE_OFF },
  fuse: { mode: 'fuse', iop: 2, vckt: 5, fm: 'i', ifl: 20, ta: 25, in: 3, der: 75, kt: 1, i2t: 1.5, vr: 32, ibr: 50, shape: 'exp', ip: 20, tp: 0.5, np: '100000' },
  ptc: { mode: 'ptc', iop: 0.5, vckt: 5, fm: 'i', ifl: 10, ta: 60, ih: 0.75, itr: 1.5, kd: 75, vm: 6, im: 40, r1: 290, pd: 0.6 },
  rev: { mode: 'rev', vin: 12, il: 2, vf: 0.45, rjd: 60, rds: 20, vgr: 10, vth: 3, vgm: 20, rjm: 50, zen: 'no', ta: 25, tjm: 125 },
  rev24: { mode: 'rev', vin: 24, il: 2, vf: 0.45, rjd: 60, rds: 20, vgr: 10, vth: 3, vgm: 20, rjm: 50, zen: 'yes', vz: 12, rg: 100, ta: 25, tjm: 125 },
};
const EXAMPLE_LABEL = { line: 'pr_exLine', usb: 'pr_exUsb', surge: 'pr_exSurge', fuse: 'pr_exFuse', ptc: 'pr_exPtc', rev: 'pr_exRev', rev24: 'pr_exRev24' };

const chips = (list, unit) => list.map((x) => ({ label: `${x} ${unit}`, value: x }));

export default {
  id: 'protection',
  strings,
  diagram,
  sections: [
    {
      title: 'sectionSetup',
      fields: [
        { key: 'mode', type: 'choice', label: 'pr_mode', default: 'tvs',
          options: [
            { value: 'tvs', label: 'pr_mTvs' }, { value: 'fuse', label: 'pr_mFuse' },
            { value: 'ptc', label: 'pr_mPtc' }, { value: 'rev', label: 'pr_mRev' },
          ] },
        { key: 'ex', type: 'select', label: 'pr_ex', default: 'none', info: 'pr_exInfo',
          options: [{ value: 'none', label: '—', raw: true },
            ...Object.entries(EXAMPLES).map(([value, set]) => ({ value, label: EXAMPLE_LABEL[value], set }))] },
      ],
    },
    {
      title: 'pr_secLine',
      show: modeIs('tvs'),
      fields: [
        { key: 'vl', type: 'number', label: 'pr_vl', default: 12, units: ['V'], info: 'pr_vlInfo' },
        { key: 'vabs', type: 'number', label: 'pr_vabs', default: 40, units: ['V'], info: 'pr_vabsInfo' },
      ],
    },
    {
      title: 'pr_secTvs',
      show: modeIs('tvs'),
      fields: [
        { key: 'vrwm', type: 'number', label: 'pr_vrwm', default: 15, units: ['V'], info: 'pr_vrwmInfo' },
        { key: 'vbr', type: 'number', label: 'pr_vbr', default: 16.7, units: ['V'], info: 'pr_vbrInfo' },
        { key: 'vc', type: 'number', label: 'pr_vc', default: 24.4, units: ['V'], info: 'pr_vcInfo' },
        { key: 'ipp', type: 'number', label: 'pr_ipp', default: 16.4, units: ['A'], info: 'pr_ippInfo' },
      ],
    },
    {
      title: 'pr_secEvent',
      show: modeIs('tvs'),
      fields: [
        { key: 'ev', type: 'choice', label: 'pr_ev', default: 'esd',
          options: [{ value: 'esd', label: 'pr_evEsd' }, { value: 'surge', label: 'pr_evSurge' }, { value: 'custom', label: 'pr_evCustom' }] },
        { key: 'kv', type: 'number', label: 'pr_kv', default: 8, units: ['kV'], info: 'pr_kvInfo', show: evIs('esd'), presets: chips([2, 4, 6, 8], 'kV') },
        { key: 'kvr', type: 'number', label: 'pr_kvr', default: '', optional: true, units: ['kV'], info: 'pr_kvrInfo', show: evIs('esd') },
        { key: 'lp', type: 'number', label: 'pr_lp', default: 2, optional: true, valid: 'nonneg', units: ['nH'], hint: 'pr_lpHint', info: 'pr_lpInfo', show: evIs('esd') },
        { key: 'voc', type: 'number', label: 'pr_voc', default: 1, units: ['kV'], info: 'pr_vocInfo', show: evIs('surge'), presets: chips([0.5, 1, 2, 4], 'kV') },
        { key: 'zs', type: 'select', label: 'pr_zs', default: '2', show: evIs('surge'),
          options: [{ value: '2', label: 'pr_zs2' }, { value: '12', label: 'pr_zs12' }, { value: '42', label: 'pr_zs42' }] },
        { key: 'ipk', type: 'number', label: 'pr_ipk', default: 10, units: ['A'], show: evIs('custom') },
      ],
    },
    {
      title: 'pr_secCap',
      optional: true,
      show: modeIs('tvs'),
      fields: [
        { key: 'ct', type: 'number', label: 'pr_ct', default: '', optional: true, units: ['pF'], info: 'pr_ctInfo' },
        { key: 'z0', type: 'number', label: 'pr_z0', default: 50, units: ['ohm'] },
        { key: 'bw', type: 'number', label: 'pr_bw', default: '', optional: true, units: ['MHz', 'GHz', 'kHz'], info: 'pr_bwInfo' },
      ],
    },
    {
      title: 'pr_secCkt',
      show: modeIs('fuse', 'ptc'),
      fields: [
        { key: 'iop', type: 'number', label: 'pr_iop', default: 2, units: ['A'], info: 'pr_iopInfo' },
        { key: 'vckt', type: 'number', label: 'pr_vckt', default: 5, units: ['V'], info: 'pr_vcktInfo' },
        { key: 'fm', type: 'choice', label: 'pr_fm', default: 'i', options: [{ value: 'i', label: 'pr_fmI' }, { value: 'r', label: 'pr_fmR' }] },
        { key: 'ifl', type: 'number', label: 'pr_ifl', default: 20, units: ['A'], info: 'pr_iflInfo', show: (v) => !fromR(v) },
        { key: 'rl', type: 'number', label: 'pr_rl', default: 150, units: ['mohm', 'ohm'], info: 'pr_rlInfo', show: fromR },
      ],
    },
    {
      title: 'pr_secFuse',
      show: modeIs('fuse'),
      fields: [
        { key: 'in', type: 'number', label: 'pr_in', default: 3, units: ['A'] },
        { key: 'der', type: 'number', label: 'pr_der', default: 75, units: ['pct'], max: 100, info: 'pr_derInfo',
          presets: [{ label: 'UL · 75 %', value: 75 }, { label: 'IEC · 100 %', value: 100 }] },
        { key: 'kt', type: 'number', label: 'pr_kt', default: 1, hint: 'pr_ktHint' },
        { key: 'i2t', type: 'number', label: 'pr_i2t', default: 1.5, units: ['A²s'], info: 'pr_i2tInfo' },
        { key: 'vr', type: 'number', label: 'pr_vr', default: 32, units: ['V'] },
        { key: 'ibr', type: 'number', label: 'pr_ibr', default: 50, units: ['A'], info: 'pr_ibrInfo' },
      ],
    },
    {
      title: 'pr_secPulse',
      show: modeIs('fuse'),
      fields: [
        { key: 'shape', type: 'select', label: 'pr_shape', default: 'exp',
          options: [{ value: 'rect', label: 'pr_shRect' }, { value: 'tri', label: 'pr_shTri' }, { value: 'sine', label: 'pr_shSine' }, { value: 'exp', label: 'pr_shExp' }] },
        { key: 'ip', type: 'number', label: 'pr_ip', default: 20, units: ['A'], valid: 'nonneg', info: 'pr_ipInfo' },
        { key: 'tp', type: 'number', label: (v) => (v.shape === 'exp' ? 'pr_tau' : 'pr_tp'), default: 0.5, units: ['ms', 'us', 's'] },
        { key: 'np', type: 'select', label: 'pr_np', default: '100000', info: 'pr_npInfo',
          options: [
            { value: '100000', label: '100 000 · 22 %', raw: true }, { value: '10000', label: '10 000 · 29 %', raw: true },
            { value: '1000', label: '1 000 · 38 %', raw: true }, { value: '100', label: '100 · 48 %', raw: true },
            { value: 'own', label: 'pr_npOwn' },
          ] },
        { key: 'pf', type: 'number', label: 'pr_pf', default: 22, units: ['pct'], max: 100, info: 'pr_pfInfo', show: (v) => v.np === 'own' },
      ],
    },
    {
      title: 'pr_secPtc',
      show: modeIs('ptc'),
      fields: [
        { key: 'ih', type: 'number', label: 'pr_ih', default: 2.6, units: ['A'] },
        { key: 'itr', type: 'number', label: 'pr_itr', default: 5, units: ['A'] },
        { key: 'kd', type: 'number', label: 'pr_kd', default: 100, units: ['pct'], hint: 'pr_kdHint' },
        { key: 'vm', type: 'number', label: 'pr_vm', default: 6, units: ['V'] },
        { key: 'im', type: 'number', label: 'pr_im', default: 100, units: ['A'] },
        { key: 'r1', type: 'number', label: 'pr_r1', default: 47, units: ['mohm', 'ohm'], info: 'pr_r1Info' },
        { key: 'pd', type: 'number', label: 'pr_pd', default: 0.8, units: ['W'], info: 'pr_pdInfo' },
      ],
    },
    {
      title: 'pr_secSupply',
      show: modeIs('rev'),
      fields: [
        { key: 'vin', type: 'number', label: 'pr_vin', default: 12, units: ['V'], info: 'pr_vinInfo' },
        { key: 'il', type: 'number', label: 'pr_il', default: 2, units: ['A'] },
      ],
    },
    {
      title: 'pr_secDiode',
      show: modeIs('rev'),
      fields: [
        { key: 'vf', type: 'number', label: 'pr_vf', default: 0.45, units: ['V'], info: 'pr_vfInfo' },
        { key: 'rjd', type: 'number', label: 'pr_rjd', default: 60, units: ['KW'], info: 'pr_rjInfo' },
      ],
    },
    {
      title: 'pr_secFet',
      show: modeIs('rev'),
      fields: [
        { key: 'rds', type: 'number', label: 'pr_rds', default: 20, units: ['mohm', 'ohm'], info: 'pr_rdsInfo' },
        { key: 'vgr', type: 'number', label: 'pr_vgr', default: 10, units: ['V'], presets: chips([2.5, 4.5, 10], 'V') },
        { key: 'vth', type: 'number', label: 'pr_vth', default: 3, units: ['V'], info: 'pr_vthInfo' },
        { key: 'vgm', type: 'number', label: 'pr_vgm', default: 20, units: ['V'] },
        { key: 'rjm', type: 'number', label: 'pr_rjm', default: 50, units: ['KW'], info: 'pr_rjInfo' },
        { key: 'zen', type: 'choice', label: 'pr_zen', default: 'no', info: 'pr_zenInfo',
          options: [{ value: 'no', label: 'pr_zenNo' }, { value: 'yes', label: 'pr_zenYes' }] },
        { key: 'vz', type: 'number', label: 'pr_vz', default: 12, units: ['V'], show: (v) => v.zen === 'yes' },
        { key: 'rg', type: 'number', label: 'pr_rg', default: 100, units: ['kohm', 'ohm'], show: (v) => v.zen === 'yes' },
      ],
    },
    {
      title: 'sectionEnv',
      show: modeIs('fuse', 'ptc', 'rev'),
      fields: [
        { key: 'ta', type: 'number', label: 'ambientTemp', default: 25, units: ['C'], valid: 'any', info: 'pr_taInfo',
          presets: [25, 40, 60, 85].map((x) => ({ label: `${x} °C`, value: x })) },
        { key: 'tjm', type: 'number', label: 'pr_tjm', default: 125, units: ['C'], valid: 'any', show: modeIs('rev'),
          presets: [125, 150, 175].map((x) => ({ label: `${x} °C`, value: x })) },
      ],
    },
  ],

  compute(v, u) {
    const fault = { vCircuit: v.vckt, faultFromR: fromR(v), iFault: v.ifl, rLoop: ohms(v.rl, u.rl) };
    switch (v.mode) {
      case 'fuse':
        return fuseCheck({
          ...fault,
          iOp: v.iop, derate: v.der / 100, kT: v.kt, iN: v.in, i2tMelt: v.i2t, vRated: v.vr, iBreak: v.ibr,
          shape: v.shape, iPulse: v.ip, tPulse: v.tp * (T_S[u.tp] ?? 1e-3),
          ...(v.np === 'own' ? { pulseFactor: v.pf / 100 } : { pulses: Number(v.np) }),
        });
      case 'ptc':
        return ptcCheck({
          ...fault,
          iOp: v.iop, kTemp: v.kd / 100, iHold: v.ih, iTrip: v.itr, vMax: v.vm, iMax: v.im,
          r1Max: ohms(v.r1, u.r1), pD: v.pd,
        });
      case 'rev':
        return reversePolarity({
          vIn: v.vin, iLoad: v.il, vF: v.vf, thetaDiode: v.rjd,
          rDsOn: ohms(v.rds, u.rds), vGsRds: v.vgr, vGsTh: v.vth, vGsMax: v.vgm, thetaFet: v.rjm,
          ambientC: v.ta, tjMaxC: v.tjm,
          zener: v.zen === 'yes', vZ: v.vz, rGate: ohms(v.rg, u.rg),
        });
      default:
        return tvsCheck({
          vLine: v.vl, vAbs: v.vabs, vRwm: v.vrwm, vBr: v.vbr, vC: v.vc, iPp: v.ipp,
          event: v.ev, esdKv: v.kv, esdRatingKv: v.kvr, lNh: v.lp,
          vOc: v.voc * 1000, zS: Number(v.zs), iPk: v.ipk,
          cPf: v.ct, z0: v.z0, bwHz: v.bw * (BW_HZ[u.bw] ?? 1e6),
        });
    }
  },

  render(r) {
    if (!r.ok) return invalid(r.errors);
    const body = r.mode === 'fuse' ? fuseView(r) : r.mode === 'ptc' ? ptcView(r) : r.mode === 'rev' ? revView(r) : tvsView(r);
    return body + note(esc(t('pr_disclaimer')));
  },
};
