import {
  termination, MODES, LUMPED_DIVISOR, AC_TAU_FACTOR, TPD_MICROSTRIP, TPD_STRIPLINE,
} from '../engine/termination.js';
import { toMm, lengthUnits } from '../engine/units.js';
import { heroes, rows, block, steps, messages, invalid } from '../ui/calculator.js';
import { tx } from '../ui/math.js';
import { fmt, si, esc } from '../ui/format.js';
import { t, locale } from '../i18n.js';
import { isImperial } from '../prefs.js';
import { svg, rect, path, text, arrow, node, wire, poly, ground, terminal, twoTerm } from '../ui/svg.js';

const strings = {
  tr: {
    tn_mode: 'Hesap',
    tn_modeInfo: 'Seri: sürücünün çıkışına seri dirençle kaynakta sonlandırma; noktadan noktaya hatlar içindir, DC güç harcamaz. Paralel: hattın sonunda Z₀ değerinde direnç (toprağa ya da VTT’ye). Thévenin: hattın sonunda VDD’ye ve toprağa iki direnç. AC: hattın sonunda seri direnç ve kondansatör; DC akım çekmez. Zamanlama: senkron bir bağlantının kurulum (setup) ve tutma (hold) payı.',
    tn_mSeries: 'Seri',
    tn_mParallel: 'Paralel',
    tn_mThevenin: 'Thévenin',
    tn_mAc: 'AC',
    tn_mTiming: 'Zamanlama',
    tn_ex: 'Örnek',
    tn_exInfo: 'Bir örnek seçildiğinde ilgili alanlar örnek değerlerle doldurulur; sonra istediğiniz alanı değiştirebilirsiniz.',
    tn_exNone: 'Örnek seçin…',
    tn_exClk: '50 Ω saat hattı, seri sonlandırma',
    tn_exSpi: 'SPI 50 MHz okuma yolu (MISO)',
    tn_exThev: 'Thévenin, 3,3 V veri yolu (60 Ω)',
    tn_exAc: 'AC sonlandırma, 25 MHz saat',
    tn_secDrv: 'Sürücü ve hat',
    tn_z0: 'Hat empedansı (Z₀)',
    tn_rout: 'Sürücü çıkış direnci (Rout)',
    tn_routHint: 'Veri sayfasından kestirin: (VDD − VOH) / IOH ya da VOL / IOL.',
    tn_vdd: 'Besleme / sinyal genliği (VDD)',
    tn_tr: 'Yükselme süresi (tr)',
    tn_trInfo: 'Sürücünün kenar süresi (%10–90); saat frekansı değil. Veri sayfasında yoksa IBIS modelinden ya da ölçümden alın.',
    tn_es: 'Direnç serisi',
    tn_secTrace: 'İz ve sinyal',
    tn_len: 'İz uzunluğu (l)',
    tn_lenData: 'Veri izi uzunluğu (l)',
    tn_tpd: 'Birim uzunluk başına gecikme (tpd)',
    tn_tpdInfo: 'tpd = √εeff / c. FR-4’te tipik değerler: dış katmanda microstrip (εeff ≈ 3,3) 6,06 ps/mm, iç katmanda stripline (εr ≈ 4,3) 6,92 ps/mm. Kendi katman yığınınız için empedans hesaplayıcısının verdiği gecikmeyi kullanın. 1 ps/mm = 1 ns/m.',
    tn_f: 'Sinyal frekansı (f)',
    tn_fClk: 'Saat frekansı (f)',
    tn_fInfo: 'AC sonlandırmada güç, bu frekansta %50 doluluk oranlı kare dalga için hesaplanır. Zamanlama hesabında saat frekansıdır.',
    tn_secTerm: 'Sonlandırma ve sınırlar',
    tn_vtt: 'Sonlandırma gerilimi (VTT)',
    tn_vttInfo: '0 V: direnç toprağa bağlanır. VDD / 2 gibi bir ara gerilim akımı ve gücü azaltır, ama sürücü iki seviyede de akım taşır; bu gerilimi hem akım verebilen hem çekebilen bir kaynak (sonlandırma regülatörü) sağlamalıdır.',
    tn_vb: 'Öngerilim (VTT)',
    tn_vbHint: 'Boş bırakılırsa VDD / 2 alınır.',
    tn_duty: 'Yüksek seviyede kalma oranı (D)',
    tn_imax: 'Sürücü akım sınırı',
    tn_imaxInfo: 'Sürücünün VOH / VOL değerlerini koruyarak verebildiği ya da çekebildiği DC akım (veri sayfasında IOH / IOL).',
    tn_vih: 'Alıcı VIH (en az)',
    tn_vil: 'Alıcı VIL (en çok)',
    tn_c: 'Kondansatör (C)',
    tn_cHint: 'Boş bırakılırsa önerilen değer kullanılır. SI önekleri kullanılabilir: 100p, 1n.',
    tn_secTiming: 'Zamanlama',
    tn_edge: 'Yakalama kenarı',
    tn_edgeSame: 'Aynı kenar (N = 1)',
    tn_edgeOpp: 'Karşı kenar (N = 0,5)',
    tn_edgeInfo: 'Aynı kenar: veri bir saat kenarında çıkar, bir periyot sonraki aynı yönlü kenarda yakalanır (N = 1). Karşı kenar: veri yarım periyot sonraki ters yönlü kenarda yakalanır (N = 0,5); SPI’da tipik durum budur. Saatin doluluk oranı %50 varsayılır.',
    tn_clk: 'Saat dağıtımı',
    tn_clkCommon: 'Ortak saat',
    tn_clkReturn: 'Geri dönen veri',
    tn_clkInfo: 'Ortak saat: sürücü ve alıcı aynı kaynaktan saatlenir; saat kayması Δclk girilir. Geri dönen veri: veriyi yakalayan aygıt saati de üretir, veri karşı aygıttan geri gelir (SPI MISO, her türlü okuma yolu). Saat karşı aygıta saat izinin gecikmesi kadar geç ulaşır: Δclk = −(saat izi uzunluğu · tpd).',
    tn_skew: 'Saat kayması (Δclk)',
    tn_skewInfo: 'Saatin alıcıya varış zamanı eksi sürücüye varış zamanı. Pozitif değer (saat alıcıya daha geç gelir) kurulum payını artırır, tutma payını azaltır.',
    tn_clen: 'Saat izi uzunluğu (lclk)',
    tn_tcomax: 'Sürücü tco (en çok)',
    tn_tcomin: 'Sürücü tco (en az)',
    tn_tcoInfo: 'Saat kenarından çıkışın geçerli olmasına kadar geçen süre (clock-to-output). Kurulum payı en büyük, tutma payı en küçük değerle hesaplanır. Veri sayfası en küçük değeri vermiyorsa 0 almak temkinli seçimdir.',
    tn_tsu: 'Alıcı kurulum süresi (tsu)',
    tn_th: 'Alıcı tutma süresi (th)',
    tn_tunc: 'Saat belirsizliği (tunc)',
    tn_tuncInfo: 'Jitter ile hesaba ayrıca katılmayan skew toleransının toplamı; iki paydan da düşülür.',

    tn_rs: 'Seri direnç Rs',
    tn_rsExact: 'Hesaplanan değer Z₀ − Rout',
    tn_rsNone: 'gerekmez (Rout ≥ Z₀)',
    tn_gammaS: 'Kaynakta yansıma katsayısı Γs',
    tn_gammaL: 'Hat sonunda yansıma katsayısı ΓL',
    tn_v1: 'Hatta ilerleyen ilk basamak V1',
    tn_vEnd: 'Açık uçta ilk basamak 2·V1',
    tn_ofVdd: 'VDD’ye oranı {p}',
    tn_plateau: 'Sürücü ucunda yarım basamağın süresi 2·td',
    tn_pDc: 'DC güç',
    tn_none: 'yok',
    tn_rt: 'Sonlandırma direnci Rt',
    tn_iDrv: 'Sürücü akımı (en büyük)',
    tn_limit: 'sınır {x}',
    tn_iHigh: 'Sürücü akımı, yüksek seviyede (verir)',
    tn_iLow: 'Sürücü akımı, düşük seviyede (çeker)',
    tn_vHigh: 'Alıcıda yüksek seviye VH',
    tn_vLow: 'Alıcıda düşük seviye VL',
    tn_pRtHigh: 'Rt’de güç, yüksek seviyede',
    tn_pRtLow: 'Rt’de güç, düşük seviyede',
    tn_pRt: 'Rt’de ortalama güç',
    tn_r1: 'R1 (VDD’ye)',
    tn_r2: 'R2 (toprağa)',
    tn_exact: 'hesaplanan {x}',
    tn_nearest: 'Z₀ = {x} değerine en yakın',
    tn_rth: 'Eşdeğer direnç Rth = R1 ∥ R2',
    tn_vth: 'Gerçek öngerilim Vth',
    tn_pIdle: 'Boşta güç (sürücü yüksek empedansta)',
    tn_pNetHigh: 'R1 + R2’de güç, yüksek seviyede',
    tn_pNetLow: 'R1 + R2’de güç, düşük seviyede',
    tn_pNet: 'R1 + R2’de ortalama güç',
    tn_cap: 'Kondansatör C',
    tn_cMin: 'Önerilen en küçük C (pratik kural)',
    tn_cGiven: 'girilen değer',
    tn_cNext: 'Cmin = {x} üstündeki ilk {es} değeri',
    tn_tauRatio: 'Rt·C / gidiş-dönüş gecikmesi',
    tn_period: 'Periyot T',
    tn_tau: 'Zaman sabiti τ = (Rt + Rout)·C',
    tn_pAc: 'Ortalama güç (Rt + Rout)',
    tn_pAcRt: 'Rt’de ortalama güç',
    tn_pDcRt: 'Karşılaştırma: paralel sonlandırmada Rt’de güç (D = %50)',
    tn_saving: 'Paralel sonlandırmaya göre kazanç',
    tn_blkLine: 'Hat: sonlandırma gerekli mi?',
    tn_td: 'Tek yön gecikme (uçuş süresi) td',
    tn_rtrip: 'Gidiş-dönüş gecikmesi 2·td',
    tn_lcrit: 'Kritik uzunluk tr / (6·tpd)',
    tn_ratio: 'td / tr',
    ok_tn_lumped: 'td = {td} ≤ tr / 6 = {lim}: iz toplu eleman gibi davranır. Pratik kurala göre sonlandırma çoğunlukla gerekmez (iz {len}, kritik uzunluk {crit}).',
    warn_tn_tline: 'td = {td} > tr / 6 = {lim}: iz iletim hattı gibi davranır. Pratik kurala göre sonlandırma gerekir (iz {len}, kritik uzunluk {crit}).',

    tn_setup: 'Kurulum (setup) payı',
    tn_hold: 'Tutma (hold) payı',
    tn_tdata: 'Veri izinin uçuş süresi tdata',
    tn_tclk: 'Saat izinin uçuş süresi tclk',
    tn_dclk: 'Saat kayması Δclk (alıcı − sürücü)',
    tn_capture: 'Yakalama kenarı, alıcıda (N·T + Δclk)',
    tn_validWin: 'Alıcıda geçerli veri aralığı',
    tn_needWin: 'Gereken kararlı aralık tsu + th + 2·tunc',
    tn_fmax: 'Kurulum payını sıfırlayan saat frekansı',
    tn_fmaxAny: 'kurulum her frekansta sağlanır',
    tn_fHold: 'Tutma payını sıfırlayan saat frekansı',
    tn_extra: 'Kurulum payının iz uzunluğu karşılığı',
    tn_extraBoth: 'Kurulum payının iz uzunluğu karşılığı (saat ve veri izi birlikte)',
    tn_longer: 'iz {x} daha uzayabilir',
    tn_shorter: 'iz {x} kısalmalı',
    tn_noShorter: '{x} kısalma gerekir; iz bundan kısa olduğundan yalnızca kısaltmakla sağlanamaz',
    tn_blkTiming: 'Zamanlama bütçesi',
    ok_tn_pass: 'Zamanlama tutuyor: kurulum payı {su}, tutma payı {h}.',
    err_tn_setupNeg: 'Kurulum payı negatif ({su}): veri, yakalama kenarından önce yeterince erken kararlı hale gelmiyor. Saat frekansını düşürün (en çok {fmax}), izi kısaltın ya da tco değeri daha küçük bir sürücü seçin.',
    err_tn_holdNeg: 'Tutma payı negatif ({h}). N = 1 iken periyot tutma denkleminde yer almaz; saati yavaşlatmak bunu düzeltmez. Veri yoluna gecikme ekleyin ya da saat kaymasını azaltın.',
    err_tn_holdNegHalf: 'Tutma payı negatif ({h}). Karşı kenarda yakalamada pay yarım periyotla birlikte büyür: saat frekansını {fmax} değerinin altına indirin, veri yoluna gecikme ekleyin ya da saat kaymasını azaltın.',

    warn_tn_noRs: 'Sürücünün çıkış direnci hat empedansına eşit ya da ondan büyük (Rout ≥ Z₀): seri direnç gerekmez, eklenirse uyumsuzluk büyür. Rs = 0 Ω alınır; uzak uçtaki gerilim VDD’ye basamaklarla ulaşır.',
    warn_tn_iDrv: 'Sürücü akımı {i}, sınırın ({max}) üzerinde: sürücü bu sonlandırmayı belirtilen seviyelerle süremez. Daha güçlü bir sürücü, daha yüksek empedanslı bir hat ya da seri sonlandırma düşünün.',
    warn_tn_vih: 'Alıcıdaki yüksek seviye {v}, VIH = {lim} değerinin altında.',
    warn_tn_vil: 'Alıcıdaki düşük seviye {v}, VIL = {lim} değerinin üzerinde.',
    warn_tn_cSmall: 'Girilen kondansatör ({c}), önerilen en küçük değerin ({cmin}) altında: Rt·C gidiş-dönüş gecikmesine göre kısa kalır, kondansatör kenar sürerken dolar ve sonlandırma zayıflar.',
    err_tn_positive: 'Empedans, gerilim, süre, frekans ve uzunluk değerleri sıfırdan büyük, diğer alanlar geçerli birer sayı olmalı.',
    err_tn_range: 'Bu değerlerle sonuç sayı aralığının dışına çıkıyor; girdileri kontrol edin.',
    err_tn_vtt: 'Sonlandırma gerilimi VDD’den büyük olamaz.',
    err_tn_bias: 'Öngerilim 0 V ile VDD arasında olmalı (uç değerler hariç).',
    err_tn_tco: 'tco (en az), tco (en çok) değerinden büyük olamaz.',
    err_tn_window: 'tsu + th negatif olamaz: alıcının örnekleme aralığının genişliği sıfırdan küçük olamaz.',

    tn_sRs: 'Seri direnç',
    tn_sStd: 'En yakın standart değer',
    tn_sRt: 'Sonlandırma direnci: Z₀’a en yakın standart değer',
    tn_sR1: 'R1, VDD’ye',
    tn_sR2: 'R2, toprağa',
    tn_sCstd: 'Kondansatör: bir üst standart değer',
    tn_sCuser: 'Kondansatör: girilen değer',
    tn_stepCrit: 'Pratik kural: tek yön gecikme yükselme süresinin altıda birini geçince iz iletim hattı gibi ele alınır.',
    tn_stepNoRs: 'Fark sıfır ya da negatif: direnç eklenmez, Rs = 0 Ω.',
    tn_stepEnd: 'Açık uçta ΓL = +1: gelen basamak ikiye katlanır. Γs = 0 ise gerilim burada kalır; değilse her gidiş-dönüşte Γs oranında küçülen basamaklarla VDD’ye yerleşir.',
    tn_stepCmin: 'Pratik kural: Rt·C zaman sabiti hattın gidiş-dönüş gecikmesinin birkaç katı olmalıdır; burada 3 kat alınır.',
    tn_stepPac: '0 ile VDD arasında, %50 doluluk oranlı kare dalga için kalıcı durumun tam çözümü; hat toplu eleman sayılır. τ ≪ T iken C·VDD²·f değerine, τ ≫ T iken VDD² / (4·(Rt + Rout)) değerine yaklaşır.',
    tn_stepExtra: 'Pozitif değer: veri izi bu kadar daha uzayabilir. Negatif değer: bu kadar kısalması gerekir.',
    tn_stepExtraBoth: 'Saat ve veri izi birlikte uzadığı için pay 2·tpd’ye bölünür. Pozitif değer: izler bu kadar daha uzayabilir. Negatif değer: bu kadar kısalmaları gerekir.',
    tn_stepFmaxHold: 'Bu frekansın altında tutma payı pozitiftir.',
    tn_sDclk: 'Saat kayması (saat karşı aygıta geç ulaşır)',

    tn_noteModel: 'Birinci dereceden model: kayıpsız hat, doğrusal sürücü (Rout arkasında ideal basamak kaynağı), akım çekmeyen alıcı. Gerçek sürücülerin yukarı ve aşağı çekme dirençleri farklıdır ve akıma göre değişir; alıcının giriş kapasitesi ile kılıf parazitikleri kenarı ayrıca bozar. Değerleri başlangıç noktası olarak alın; kritik hatları IBIS modelleriyle benzetimde ya da ölçümle doğrulayın. “td > tr / 6” ölçütü ve AC sonlandırmadaki kondansatör değeri birer pratik kuraldır.',
    tn_noteTiming: 'Tek bir bağlantının statik zamanlama bütçesi; t zamanları, sürücüdeki başlatma kenarından (t = 0) ölçülür. Uçuş süresi yalnızca iz gecikmesidir (l·tpd): yansımaların yerleşmesi, kenarın alıcı eşiğine ulaşması ve yük kapasitesi yüzünden oluşan ek gecikmeyi tunc içine katın ya da tco değerine ekleyin. N = 0,5 için saatin doluluk oranı %50 varsayılır. Veri sayfasındaki tco değerinin hangi yük ve hangi ölçüm noktası için verildiğine dikkat edin.',
    tn_seriesNote: 'Seri sonlandırma yalnızca noktadan noktaya hatlar içindir. Hattın ortasındaki alıcılar, yansıma geri dönene kadar (en çok 2·td) yarım basamağı görür; bu seviye eşik bölgesindedir. Direnci sürücünün hemen çıkışına yerleştirin.',
    tn_parallelNote: 'Direnç hattın en sonuna, son alıcının hemen yanına konur; hat boyunca dizili alıcılar tam basamağı görür. Bedeli sürekli DC akımdır: sürücü bu akımı yüksek seviyede vermek, VTT > 0 ise düşük seviyede de çekmek zorundadır.',
    tn_theveninNote: 'İki direnç hattın en sonuna konur. Ağ, sürücü yüksek empedanstayken hattı Vth geriliminde tutar ve beslemeden sürekli akım çeker; sürücü bir seviyede akım verir, diğerinde çeker. Vth alıcının eşik bölgesine denk geliyorsa boştaki hat alıcıda fazladan akıma ya da salınıma yol açabilir.',
    tn_acNote: 'Kondansatör DC akımı keser; kenar sırasında kısa devre gibi davrandığından hat Rt ile sonlanır. Saat gibi doluluk oranı sabit sinyallere uygundur: rastgele veride kondansatör gerilimi veri desenine göre kayar ve desene bağlı jitter üretir.',

    tn_dgAria: 'Sürücü ve çıkış direnci, iletim hattı, alıcı ve seçilen sonlandırma ağı; hesaplanan değerlerle',
    tn_dgAriaTiming: 'Zamanlama diyagramı: sürücüdeki saat, alıcıda geçerli veri aralığı, alıcıdaki saat ve yakalama kenarı; kurulum ve tutma payları',
    tn_dgDriver: 'sürücü',
    tn_dgReceiver: 'alıcı',
    tn_dgClkDrv: 'CLK (sürücü)',
    tn_dgData: 'VERİ (alıcı)',
    tn_dgNeed: 'kararlı olmalı',
    tn_dgClkRcv: 'CLK (alıcı)',
    tn_dgLaunch: 'başlatma',
    tn_dgCapture: 'yakalama',
    tn_dgValid: 'geçerli',
    tn_dgNoScale: 'ölçeksiz',
    tn_dgMsu: 'Msu · kurulum payı',
    tn_dgMh: 'Mh · tutma payı',
  },
  en: {
    tn_mode: 'Calculation',
    tn_modeInfo: 'Series: source termination with a resistor in series with the driver output; for point-to-point nets, no DC power. Parallel: a resistor equal to Z₀ at the end of the line (to ground or to VTT). Thévenin: two resistors at the end of the line, to VDD and to ground. AC: a resistor in series with a capacitor at the end of the line; draws no DC current. Timing: setup and hold margin of one synchronous link.',
    tn_mSeries: 'Series',
    tn_mParallel: 'Parallel',
    tn_mThevenin: 'Thévenin',
    tn_mAc: 'AC',
    tn_mTiming: 'Timing',
    tn_ex: 'Example',
    tn_exInfo: 'Picking an example fills the fields it concerns with example values; change any of them afterwards.',
    tn_exNone: 'Pick an example…',
    tn_exClk: '50 Ω clock, series termination',
    tn_exSpi: 'SPI 50 MHz read path (MISO)',
    tn_exThev: 'Thévenin, 3.3 V bus (60 Ω)',
    tn_exAc: 'AC termination, 25 MHz clock',
    tn_secDrv: 'Driver and line',
    tn_z0: 'Line impedance (Z₀)',
    tn_rout: 'Driver output resistance (Rout)',
    tn_routHint: 'Estimate from the datasheet: (VDD − VOH) / IOH or VOL / IOL.',
    tn_vdd: 'Supply / signal swing (VDD)',
    tn_tr: 'Rise time (tr)',
    tn_trInfo: 'The edge time of the driver (10–90 %), not the clock frequency. If the datasheet does not give it, take it from the IBIS model or a measurement.',
    tn_es: 'Resistor series',
    tn_secTrace: 'Trace and signal',
    tn_len: 'Trace length (l)',
    tn_lenData: 'Data trace length (l)',
    tn_tpd: 'Delay per length (tpd)',
    tn_tpdInfo: 'tpd = √εeff / c. Typical FR-4 values: outer-layer microstrip (εeff ≈ 3.3) 6.06 ps/mm, inner-layer stripline (εr ≈ 4.3) 6.92 ps/mm. For your own stackup use the delay the impedance calculator reports. 1 ps/mm = 1 ns/m.',
    tn_f: 'Signal frequency (f)',
    tn_fClk: 'Clock frequency (f)',
    tn_fInfo: 'For the AC termination the power is calculated for a square wave of this frequency with 50 % duty. In the timing budget it is the clock frequency.',
    tn_secTerm: 'Termination and limits',
    tn_vtt: 'Termination voltage (VTT)',
    tn_vttInfo: '0 V: the resistor goes to ground. A voltage in between, such as VDD / 2, lowers current and power, but the driver then carries current in both states; that voltage must come from a supply that can both source and sink current (a termination regulator).',
    tn_vb: 'Bias voltage (VTT)',
    tn_vbHint: 'Leave empty for VDD / 2.',
    tn_duty: 'Share of time at the high level (D)',
    tn_imax: 'Driver current limit',
    tn_imaxInfo: 'The DC current the driver can source or sink while still meeting VOH / VOL (IOH / IOL in the datasheet).',
    tn_vih: 'Receiver VIH (min)',
    tn_vil: 'Receiver VIL (max)',
    tn_c: 'Capacitor (C)',
    tn_cHint: 'Leave empty to use the suggested value. SI prefixes allowed: 100p, 1n.',
    tn_secTiming: 'Timing',
    tn_edge: 'Capture edge',
    tn_edgeSame: 'Same edge (N = 1)',
    tn_edgeOpp: 'Opposite edge (N = 0.5)',
    tn_edgeInfo: 'Same edge: the data is launched on one clock edge and captured on the next edge of the same direction, one period later (N = 1). Opposite edge: it is captured on the opposite edge half a period later (N = 0.5), the usual case in SPI. A 50 % clock duty cycle is assumed.',
    tn_clk: 'Clocking',
    tn_clkCommon: 'Common clock',
    tn_clkReturn: 'Returned data',
    tn_clkInfo: 'Common clock: driver and receiver are clocked from one source; enter the clock skew Δclk. Returned data: the device that captures the data also generates the clock, and the data comes back from the far device (SPI MISO, any read path). The clock reaches the far device later by the delay of the clock trace: Δclk = −(clock trace length · tpd).',
    tn_skew: 'Clock skew (Δclk)',
    tn_skewInfo: 'Clock arrival at the receiver minus clock arrival at the driver. A positive value (the clock reaches the receiver later) adds to the setup margin and takes from the hold margin.',
    tn_clen: 'Clock trace length (lclk)',
    tn_tcomax: 'Driver tco (max)',
    tn_tcomin: 'Driver tco (min)',
    tn_tcoInfo: 'Time from the clock edge until the output is valid (clock-to-output). The setup margin uses the maximum, the hold margin the minimum. If the datasheet gives no minimum, 0 is the cautious choice.',
    tn_tsu: 'Receiver setup time (tsu)',
    tn_th: 'Receiver hold time (th)',
    tn_tunc: 'Clock uncertainty (tunc)',
    tn_tuncInfo: 'Jitter plus the skew tolerance that is not accounted for elsewhere; subtracted from both margins.',

    tn_rs: 'Series resistor Rs',
    tn_rsExact: 'Calculated value Z₀ − Rout',
    tn_rsNone: 'not needed (Rout ≥ Z₀)',
    tn_gammaS: 'Reflection coefficient at the source Γs',
    tn_gammaL: 'Reflection coefficient at the end of the line ΓL',
    tn_v1: 'Step launched into the line V1',
    tn_vEnd: 'First step at the open far end 2·V1',
    tn_ofVdd: '{p} of VDD',
    tn_plateau: 'Duration of the half step at the driver end 2·td',
    tn_pDc: 'DC power',
    tn_none: 'none',
    tn_rt: 'Termination resistor Rt',
    tn_iDrv: 'Driver current (largest)',
    tn_limit: 'limit {x}',
    tn_iHigh: 'Driver current at the high level (source)',
    tn_iLow: 'Driver current at the low level (sink)',
    tn_vHigh: 'High level at the receiver VH',
    tn_vLow: 'Low level at the receiver VL',
    tn_pRtHigh: 'Power in Rt at the high level',
    tn_pRtLow: 'Power in Rt at the low level',
    tn_pRt: 'Average power in Rt',
    tn_r1: 'R1 (to VDD)',
    tn_r2: 'R2 (to ground)',
    tn_exact: 'calculated {x}',
    tn_nearest: 'nearest to Z₀ = {x}',
    tn_rth: 'Equivalent resistance Rth = R1 ∥ R2',
    tn_vth: 'Actual bias voltage Vth',
    tn_pIdle: 'Idle power (driver in high impedance)',
    tn_pNetHigh: 'Power in R1 + R2 at the high level',
    tn_pNetLow: 'Power in R1 + R2 at the low level',
    tn_pNet: 'Average power in R1 + R2',
    tn_cap: 'Capacitor C',
    tn_cMin: 'Suggested minimum C (rule of thumb)',
    tn_cGiven: 'entered value',
    tn_cNext: 'first {es} value above Cmin = {x}',
    tn_tauRatio: 'Rt·C / round-trip delay',
    tn_period: 'Period T',
    tn_tau: 'Time constant τ = (Rt + Rout)·C',
    tn_pAc: 'Average power (Rt + Rout)',
    tn_pAcRt: 'Average power in Rt',
    tn_pDcRt: 'For comparison: power in Rt with parallel termination (D = 50 %)',
    tn_saving: 'Saving against parallel termination',
    tn_blkLine: 'Line: is termination needed?',
    tn_td: 'One-way delay (flight time) td',
    tn_rtrip: 'Round-trip delay 2·td',
    tn_lcrit: 'Critical length tr / (6·tpd)',
    tn_ratio: 'td / tr',
    ok_tn_lumped: 'td = {td} ≤ tr / 6 = {lim}: the trace behaves as a lumped element. By the rule of thumb termination is usually not needed (trace {len}, critical length {crit}).',
    warn_tn_tline: 'td = {td} > tr / 6 = {lim}: the trace behaves as a transmission line. By the rule of thumb it needs termination (trace {len}, critical length {crit}).',

    tn_setup: 'Setup margin',
    tn_hold: 'Hold margin',
    tn_tdata: 'Flight time of the data trace tdata',
    tn_tclk: 'Flight time of the clock trace tclk',
    tn_dclk: 'Clock skew Δclk (receiver − driver)',
    tn_capture: 'Capture edge at the receiver (N·T + Δclk)',
    tn_validWin: 'Data-valid interval at the receiver',
    tn_needWin: 'Required stable interval tsu + th + 2·tunc',
    tn_fmax: 'Clock frequency with zero setup margin',
    tn_fmaxAny: 'setup is met at any frequency',
    tn_fHold: 'Clock frequency with zero hold margin',
    tn_extra: 'Setup margin as trace length',
    tn_extraBoth: 'Setup margin as trace length (clock and data trace together)',
    tn_longer: 'the trace may be {x} longer',
    tn_shorter: 'the trace must be {x} shorter',
    tn_noShorter: '{x} less would be needed; the trace is shorter than that, so shortening alone cannot fix it',
    tn_blkTiming: 'Timing budget',
    ok_tn_pass: 'Timing is met: setup margin {su}, hold margin {h}.',
    err_tn_setupNeg: 'The setup margin is negative ({su}): the data is not stable early enough before the capture edge. Lower the clock frequency (at most {fmax}), shorten the trace or choose a driver with a smaller tco.',
    err_tn_holdNeg: 'The hold margin is negative ({h}). With N = 1 the period is not part of the hold equation, so a slower clock does not fix it. Add delay to the data path or reduce the clock skew.',
    err_tn_holdNegHalf: 'The hold margin is negative ({h}). With capture on the opposite edge the margin grows with half the period: lower the clock frequency below {fmax}, add delay to the data path or reduce the clock skew.',

    warn_tn_noRs: 'The driver output resistance is equal to or above the line impedance (Rout ≥ Z₀): no series resistor is needed, and adding one makes the mismatch worse. Rs is taken as 0 Ω; the far end reaches VDD in steps.',
    warn_tn_iDrv: 'The driver current {i} exceeds the limit ({max}): the driver cannot drive this termination at the specified levels. Consider a stronger driver, a line of higher impedance or series termination.',
    warn_tn_vih: 'The high level at the receiver, {v}, is below VIH = {lim}.',
    warn_tn_vil: 'The low level at the receiver, {v}, is above VIL = {lim}.',
    warn_tn_cSmall: 'The capacitor entered ({c}) is below the suggested minimum ({cmin}): Rt·C is short against the round-trip delay, so the capacitor charges during the edge and the termination weakens.',
    err_tn_positive: 'Impedance, voltage, time, frequency and length values must be greater than zero, and every other field a valid number.',
    err_tn_range: 'With these values the result leaves the number range; check the inputs.',
    err_tn_vtt: 'The termination voltage cannot be above VDD.',
    err_tn_bias: 'The bias voltage must lie between 0 V and VDD (both excluded).',
    err_tn_tco: 'tco (min) cannot be larger than tco (max).',
    err_tn_window: 'tsu + th cannot be negative: the sampling window of the receiver cannot have a negative width.',

    tn_sRs: 'Series resistor',
    tn_sStd: 'Nearest standard value',
    tn_sRt: 'Termination resistor: the standard value nearest to Z₀',
    tn_sR1: 'R1, to VDD',
    tn_sR2: 'R2, to ground',
    tn_sCstd: 'Capacitor: next standard value up',
    tn_sCuser: 'Capacitor: the value entered',
    tn_stepCrit: 'Rule of thumb: once the one-way delay exceeds one sixth of the rise time, the trace is treated as a transmission line.',
    tn_stepNoRs: 'The difference is zero or negative: no resistor is added, Rs = 0 Ω.',
    tn_stepEnd: 'At the open end ΓL = +1, so the arriving step doubles. With Γs = 0 the voltage stays there; otherwise it settles to VDD in steps that shrink by Γs with every round trip.',
    tn_stepCmin: 'Rule of thumb: the time constant Rt·C should be several times the round-trip delay of the line; three times is used here.',
    tn_stepPac: 'Exact steady-state result for a square wave between 0 and VDD with 50 % duty; the line is treated as lumped. It tends to C·VDD²·f for τ ≪ T and to VDD² / (4·(Rt + Rout)) for τ ≫ T.',
    tn_stepExtra: 'A positive value: the data trace may be this much longer. A negative value: it must be this much shorter.',
    tn_stepExtraBoth: 'The clock trace and the data trace grow together, so the margin is divided by 2·tpd. A positive value: the traces may be this much longer. A negative value: they must be this much shorter.',
    tn_stepFmaxHold: 'Below this frequency the hold margin is positive.',
    tn_sDclk: 'Clock skew (the clock reaches the far device late)',

    tn_noteModel: 'A first-order model: lossless line, linear driver (an ideal step source behind Rout), a receiver that draws no current. Real drivers have different pull-up and pull-down resistances that change with current, and the input capacitance of the receiver and the package parasitics distort the edge further. Take the values as a starting point and verify critical nets by simulation with IBIS models or by measurement. The criterion “td > tr / 6” and the capacitor value of the AC termination are rules of thumb.',
    tn_noteTiming: 'Static timing budget of a single link; the times t are counted from the launching clock edge at the driver (t = 0). The flight time is the trace delay only (l·tpd): put the extra delay from settling reflections, from the edge reaching the receiver threshold and from the load capacitance into tunc, or add it to tco. For N = 0.5 a 50 % clock duty cycle is assumed. Check for which load and which measurement point the datasheet specifies tco.',
    tn_seriesNote: 'Series termination is for point-to-point nets only. Receivers in the middle of the line see the half step until the reflection returns (up to 2·td), and that level is in the threshold region. Place the resistor right at the driver output.',
    tn_parallelNote: 'The resistor goes at the very end of the line, next to the last receiver; receivers along the line see the full step. The price is a steady DC current, which the driver must source at the high level and, with VTT > 0, also sink at the low level.',
    tn_theveninNote: 'Both resistors go at the very end of the line. The network holds the line at Vth while the driver is in high impedance and draws current from the supply all the time; the driver sources current in one state and sinks it in the other. If Vth falls into the threshold region of the receiver, an idle line can cause extra supply current or oscillation in the receiver.',
    tn_acNote: 'The capacitor blocks DC; during the edge it acts as a short, so the line is terminated in Rt. It suits signals with a constant duty cycle such as clocks: with random data the capacitor voltage drifts with the data pattern and causes pattern-dependent jitter.',

    tn_dgAria: 'Driver with its output resistance, transmission line, receiver and the selected termination network, with the calculated values',
    tn_dgAriaTiming: 'Timing diagram: clock at the driver, data-valid interval at the receiver, clock at the receiver with the capture edge; setup and hold margins',
    tn_dgDriver: 'driver',
    tn_dgReceiver: 'receiver',
    tn_dgClkDrv: 'CLK at driver',
    tn_dgData: 'DATA at receiver',
    tn_dgNeed: 'must be stable',
    tn_dgClkRcv: 'CLK at receiver',
    tn_dgLaunch: 'launch',
    tn_dgCapture: 'capture',
    tn_dgValid: 'valid',
    tn_dgNoScale: 'not to scale',
    tn_dgMsu: 'Msu · setup margin',
    tn_dgMh: 'Mh · hold margin',
  },
};

const FARAD = 'farad'; // 'F' would render as °F
const LEN = ['mm', 'cm', 'in', 'mil'];
const TIME = ['ns', 'ps'];
const T_MUL = { ns: 1e-9, ps: 1e-12 };
const F_MUL = { MHz: 1e6, kHz: 1e3, GHz: 1e9 };
// Delay per length → s/m. 1 ps/mm = 1 ns/m, so the two would be the same number.
const TPD_MUL = { psmm: 1e-9, psin: 1e-12 / 0.0254 };
// Typical FR-4 values from the signal engine, in ps/mm with three digits (6.06 and 6.92).
const psPerMm = (sPerM) => Number((sPerM * 1e9).toPrecision(3));
const TPD_DEFAULT = psPerMm(TPD_MICROSTRIP);

// Display: a real minus sign, and never "−0".
const pos0 = (x) => (x === 0 ? 0 : x);
const minus = (s) => String(s).replace(/-/g, '−');
const sv = (x, unit, sig = 4) => minus(si(pos0(x), unit, sig));
const nv = (x, sig = 4) => minus(fmt(pos0(x), sig));
const nsv = (x, sig = 5) => `${nv(x * 1e9, sig)} ns`; // the times of the timing budget, all in ns
const volt = (x, sig = 4) => `${nv(x, sig)} V`; // levels stay in volts (0.4714 V, not 471.4 mV)
const pctTxt = (x) => minus(new Intl.NumberFormat(locale(), { style: 'percent', maximumFractionDigits: 1 }).format(pos0(x)));
const lenStr = (m) => (isImperial()
  ? `${nv(m / 0.0254, 4)} in · ${nv(m * 1000, 4)} mm`
  : `${nv(m * 1000, 4)} mm · ${nv(m / 0.0254, 3)} in`);
const lenShort = (m) => (isImperial() ? `${nv(m / 0.0254, 3)} in` : `${nv(m * 1000, 3)} mm`);
/** "51 Ω" → number and unit for a headline value. */
function unitHtml(s) {
  const i = s.lastIndexOf(' ');
  return i < 0 ? esc(s) : `${esc(s.slice(0, i))} <span class="u">${esc(s.slice(i + 1))}</span>`;
}

// ---------------------------------------------------------------------------
// Diagrams
// ---------------------------------------------------------------------------

const n1 = (x) => Math.round(x * 10) / 10;

/**
 * Driver (with R_out) → [R_s] → line → receiver, with the termination network
 * of the selected mode at the place it belongs and the calculated values.
 */
function schematic(v, r) {
  const mode = MODES.includes(v.mode) ? v.mode : 'series';
  const live = !!r && r.mode === mode;
  const ohm = (x) => sv(x, 'Ω', 3);
  const val = (s) => (live ? s() : undefined);
  const Y = 92; // the signal
  const XT = 332; // the termination network at the end of the line
  let b = path('M14,78V106L40,92Z', 'comp') + text(27, 124, t('tn_dgDriver'))
    + text(14, 66, live ? `VDD = ${volt(r.vdd, 3)}` : 'VDD', { cls: live ? 'val' : 'name', anchor: 'start' })
    + twoTerm('R', 40, Y, 104, Y, { name: 'Rout', value: val(() => ohm(r.rout)) });
  b += mode === 'series'
    ? twoTerm('R', 104, Y, 168, Y, { name: 'Rs', value: val(() => ohm(r.rs)), hi: true, dashed: live && !r.fits })
    : wire([104, Y], [168, Y]);
  // The line, and the receiver at its end.
  b += rect(168, Y - 10, 140, 20, 'soft')
    + text(238, Y - 16, live ? `l = ${lenShort(r.line.lengthM)}` : 'l', { cls: live ? 'val' : 'sym' })
    + text(238, Y + 4, live ? `Z₀ = ${ohm(r.z0)}` : 'Z₀', { cls: live ? 'val' : 'sym' })
    + text(238, Y + 26, live ? `td = ${sv(r.line.tdS, 's', 3)}` : 'td', { cls: live ? 'val' : 'sym' })
    + wire([308, Y], [398, Y]) + path('M398,78V106L424,92Z', 'comp') + text(411, 124, t('tn_dgReceiver'));

  const notes = [];
  if (mode === 'series') {
    if (live) notes.push(`V1 = ${volt(r.v1, 3)} → 2·V1 = ${volt(r.vEnd, 3)}`, `Γs = ${nv(r.gammaS, 3)}`);
  } else if (mode === 'parallel') {
    const toVtt = live ? r.vtt > 0 : v.vtt > 0;
    b += node(XT, Y) + twoTerm('R', XT, Y, XT, 152, { name: 'Rt', value: val(() => ohm(r.rt)), hi: true })
      + (toVtt
        ? terminal(XT, 155.2, live ? `VTT = ${volt(r.vtt, 3)}` : 'VTT', 'right', live ? 'val' : 'name')
        : ground(XT, 152));
  } else if (mode === 'thevenin') {
    b += node(XT, Y) + terminal(XT, 28.8, 'VDD', 'right')
      + twoTerm('R', XT, 32, XT, Y, { name: 'R1', value: val(() => ohm(r.r1)), hi: true })
      + twoTerm('R', XT, Y, XT, 152, { name: 'R2', value: val(() => ohm(r.r2)), hi: true }) + ground(XT, 152);
  } else {
    b += node(XT, Y) + twoTerm('R', XT, Y, XT, 138, { name: 'Rt', value: val(() => ohm(r.rt)), hi: true })
      + twoTerm('C', XT, 138, XT, 172, { name: 'C', value: val(() => sv(r.cF, 'F', 3)), hi: true }) + ground(XT, 172);
    if (live) notes.push(`P = ${sv(r.pTotal, 'W', 3)} · f = ${sv(r.fHz, 'Hz', 3)}`, `Rt·C = ${nv(r.tauRatio, 3)} × 2·td`);
  }
  if (live && (mode === 'parallel' || mode === 'thevenin')) {
    notes.push(`VH = ${volt(r.vHigh, 3)} · VL = ${volt(r.vLow, 3)}`, `IH = ${sv(r.iHigh, 'A', 3)} · IL = ${sv(r.iLow, 'A', 3)}`);
  }
  notes.forEach((s, i) => { b += text(14, 158 + 18 * i, s, { cls: 'val', anchor: 'start' }); });
  return svg(440, 196, b, t('tn_dgAria'), { wide: true });
}

/**
 * Monotonic time → x map through the given times: every interval between two
 * neighbouring times gets a minimum width plus its proportional share, so the
 * order of the events is the order of the numbers and short intervals stay
 * visible. Not to scale.
 */
function timeScale(times, x0, x1, gap = 12) {
  const sorted = times.filter(Number.isFinite).sort((a, b) => a - b);
  const span = sorted.length ? sorted[sorted.length - 1] - sorted[0] : 0;
  if (!(span > 0)) return () => (x0 + x1) / 2;
  const knots = [];
  for (const tt of sorted) if (!knots.length || tt - knots[knots.length - 1] > span * 1e-9) knots.push(tt);
  const n = knots.length - 1;
  const g = Math.min(gap, (x1 - x0) / (2 * n));
  const free = x1 - x0 - g * n;
  const xs = [x0];
  for (let i = 1; i <= n; i++) xs.push(xs[i - 1] + g + (free * (knots[i] - knots[i - 1])) / span);
  return (tt) => {
    if (!(tt > knots[0])) return x0;
    if (tt >= knots[n]) return x1;
    let i = 1;
    while (knots[i] < tt) i++;
    return xs[i - 1] + ((xs[i] - xs[i - 1]) * (tt - knots[i - 1])) / (knots[i] - knots[i - 1]);
  };
}

/** Square wave with rising edges at offset + k·period, as polyline points; null when there are too many edges to draw. */
function clockPoints(X, offset, period, tA, tB, yHi, yLo) {
  const half = period / 2;
  if (!((tB - tA) / half < 120)) return null;
  // Edge k is at offset + k·half: even k rises, odd k falls.
  const before = (k) => (((k % 2) + 2) % 2 === 0 ? yLo : yHi);
  let k = Math.ceil((tA - offset) / half);
  const pts = [[X(tA), before(k)]];
  for (let guard = 0; offset + k * half <= tB && guard < 130; k++, guard++) {
    const x = X(offset + k * half);
    pts.push([x, before(k)], [x, before(k + 1)]);
  }
  pts.push([X(tB), before(k)]);
  return pts;
}

/**
 * Timing diagram (not to scale): clock at the driver, the data at the receiver
 * with its valid interval, the interval the receiver needs around the capture
 * edge, and the clock at the receiver. The setup margin is the distance from
 * "valid" to the start of the required interval, the hold margin the distance
 * from its end to the end of the valid interval.
 */
function timingDiagram(v, r) {
  const live = !!r && r.mode === 'timing';
  const back = live ? r.clocking === 'return' : v.clk === 'return';
  const n = live ? r.n : v.edge === 'opp' ? 0.5 : 1;
  // Without a result: a nominal case that passes, in units of the period.
  const T = live ? r.periodS : 1;
  const dclk = live ? r.dclkS : back ? -0.08 : 0;
  const e = live ? r.events : {
    earliestS: 0.1, validS: 0.24, validEndS: 1.1, nextValidS: 1.24, captureS: n + dclk, needFromS: n + dclk - 0.12, needUntilS: n + dclk + 0.1,
  };
  const suOk = live ? r.setupS >= 0 : true;
  const hOk = live ? r.holdS >= 0 : true;

  const X0 = 96;
  const X1 = 426;
  const keys = [0, dclk, e.earliestS, e.validS, e.needFromS, e.captureS, e.needUntilS, e.validEndS, e.nextValidS];
  const lo = Math.min(...keys);
  const hi = Math.max(...keys);
  const pad = 0.07 * (hi - lo);
  const tA = lo - pad;
  const tB = hi + pad;
  const X = timeScale([tA, ...keys, tB], X0, X1);
  const xl = X(0);
  const xc = X(e.captureS);
  const box = (ta, tb, y, h, cls, extra) => {
    const a = X(ta);
    const w = X(tb) - a;
    return w > 0.5 ? rect(a, y, w, h, cls, extra) : '';
  };
  const label = (x, y, s, cls = 'lbl') => text(x, y, s, { cls, anchor: x > (X0 + X1) / 2 ? 'end' : 'start' });

  let b = text(4, 39, t('tn_dgClkDrv'), { anchor: 'start' }) + text(4, 71, t('tn_dgData'), { anchor: 'start' })
    + text(4, 93, t('tn_dgNeed'), { anchor: 'start' }) + text(4, 147, t('tn_dgClkRcv'), { anchor: 'start' });

  // Clock at the driver; the launching edge is at t = 0.
  const drv = clockPoints(X, 0, T, tA, tB, 26, 44);
  b += drv ? poly(drv, 'wire') : poly([[X0, 35], [X1, 35]], 'wire dash');
  b += path(`M${n1(xl)},26V76`, 'ext') + path(`M${n1(xl)},44V26`, 'wave')
    + label(xl + (xl > (X0 + X1) / 2 ? -4 : 4), 18, `${t('tn_dgLaunch')} · t = 0`);
  // From the launch to valid data at the receiver: t_co,max + t_data.
  if (X(e.validS) - xl >= 12) b += arrow(xl, 51, X(e.validS), 51, { cls: 'flow', headCls: 'arrow flow' });

  // Data at the receiver: old data, changing, valid, changing, next data.
  b += box(tA, e.earliestS, 58, 18, 'comp') + box(e.earliestS, e.nextValidS, 58, 18, 'soft') + box(e.nextValidS, tB, 58, 18, 'comp')
    + box(e.validS, e.validEndS, 58, 18, 'zone-ok');
  if (X(e.validEndS) - X(e.validS) >= 48) b += text((X(e.validS) + X(e.validEndS)) / 2, 71, t('tn_dgValid'), { cls: 'okt' });

  // The interval in which the receiver needs stable data; red where the data is not valid.
  const xa = X(e.needFromS);
  const wNeed = Math.max(2, X(e.needUntilS) - xa);
  b += rect(xa, 84, wNeed, 10, 'zone') + rect(xa, 84, wNeed, 10, 'wire hi', ' style="stroke-width:1"');
  if (!suOk) b += box(e.needFromS, Math.min(e.validS, e.needUntilS), 84, 10, 'zone-bad');
  if (!hOk) b += box(Math.max(e.validEndS, e.needFromS), e.needUntilS, 84, 10, 'zone-bad');

  // Margins: setup from "valid" to the start of the required interval, hold from its end to the end of "valid".
  const dim = (ta, tb, y, name, ok, left) => {
    const a = Math.min(X(ta), X(tb));
    const z = Math.max(X(ta), X(tb));
    return path(`M${n1(a)},96V${y + 4}M${n1(z)},96V${y + 4}`, 'ext')
      + (z - a >= 16 ? arrow(a, y, z, y, { both: true }) : path(`M${n1(a)},${y}H${n1(z)}`, 'dimline'))
      + (left ? text(a - 5, y + 4, name, { cls: ok ? 'okt' : 'badt', anchor: 'end' }) : text(z + 5, y + 4, name, { cls: ok ? 'okt' : 'badt', anchor: 'start' }));
  };
  b += dim(e.validS, e.needFromS, 106, 'Msu', suOk, true) + dim(e.needUntilS, e.validEndS, 118, 'Mh', hOk, false);

  // Clock at the receiver, shifted by Δclk; the capture edge.
  const rcv = clockPoints(X, dclk, T, tA, tB, 134, 152);
  b += rcv ? poly(rcv, 'wire') : poly([[X0, 143], [X1, 143]], 'wire dash');
  b += path(`M${n1(xc)},58V152`, 'ext') + path(`M${n1(xc)},152V134`, 'wave')
    + label(xc + (xc > (X0 + X1) / 2 ? -4 : 4), 166, live ? `${t('tn_dgCapture')} · t = ${nsv(e.captureS, 4)}` : t('tn_dgCapture'));

  b += text(X0, 184, live ? `${t('tn_dgMsu')} = ${nsv(r.setupS, 4)}` : t('tn_dgMsu'), { cls: suOk ? 'okt' : 'badt', anchor: 'start' })
    + text(X0, 198, live ? `${t('tn_dgMh')} = ${nsv(r.holdS, 4)}` : t('tn_dgMh'), { cls: hOk ? 'okt' : 'badt', anchor: 'start' })
    + text(436, 198, t('tn_dgNoScale'), { cls: 'title', anchor: 'end' });
  return svg(440, 206, b, t('tn_dgAriaTiming'), { wide: true });
}

const diagram = (v, u, r) => (v.mode === 'timing' ? timingDiagram(v, r) : schematic(v, r));

// ---------------------------------------------------------------------------
// Calculation steps
// ---------------------------------------------------------------------------

const REFS = [
  'H. Johnson & M. Graham, High-Speed Digital Design: A Handbook of Black Magic (1993)',
  'E. Bogatin, Signal and Power Integrity — Simplified',
  'S. H. Hall, G. W. Hall & J. A. McCall, High-Speed Digital System Design (2000)',
];

// Values inside formulas; a negative one is put in parentheses.
const q = (x, unit, sig) => tx(sv(x, unit, sig));
const nq = (x, sig) => tx(nv(x, sig));
const vq = (x) => tx(volt(x));
const tq = (x) => (x < 0 ? `(${tx(nsv(x))})` : tx(nsv(x)));
const mmq = (m) => tx(`${nv(m * 1000, 4)} mm`);
const tpdq = (sPerM) => tx(`${nv(sPerM * 1e9, 4)} ps/mm`);
const pq = (x) => tx(`${nv(x * 100, 4)} %`);
const sq = (s) => `{(${s})}^{2}`;
const ohmq = (x) => q(x, 'Ω', 5);
const HALF = '\\frac{1}{2}';

/** One-way delay and the critical length: the first two steps of every termination mode. */
function lineSteps(L) {
  const tpd = tpdq(L.tpdSPerM);
  return [
    { label: 'tn_td', sym: 't_d = l \\cdot t_{pd}', num: `${mmq(L.lengthM)} \\cdot ${tpd}`, res: q(L.tdS, 's') },
    { label: 'tn_lcrit', sym: `l_{crit} = \\frac{t_r}{${LUMPED_DIVISOR} \\cdot t_{pd}}`, num: `\\frac{${q(L.trS, 's')}}{${LUMPED_DIVISOR} \\cdot ${tpd}}`, res: mmq(L.critLenM), note: 'tn_stepCrit' },
  ];
}
const LINE_WHERE = [['l', 'tn_len', 'len'], ['t_{pd}', 'tn_tpd', 'tpd'], ['t_r', 'tn_tr', 'tr']];
const DRV_WHERE = [['Z_0', 'tn_z0', 'z0'], ['R_{out}', 'tn_rout', 'rout'], ['V_{DD}', 'tn_vdd', 'vdd']];
// A reflection coefficient subtracts two nearly equal resistances: enough digits
// of them are shown for the numbers in the step to give the result.
const closeSig = (a, b) => (a === b ? 5 : Math.min(12, Math.max(5, 4 + Math.ceil(-Math.log10(Math.abs(a / b - 1))))));
function gammaStep(r, R, value) {
  const sig = closeSig(value, r.z0);
  const Rq = q(value, 'Ω', sig);
  const Z0 = q(r.z0, 'Ω', sig);
  return { label: 'tn_gammaL', sym: `Γ_L = \\frac{${R} − Z_0}{${R} + Z_0}`, num: `\\frac{${Rq} − ${Z0}}{${Rq} + ${Z0}}`, res: nq(r.gammaL) };
}
/** "R_t ≈ Z0 = 50 Ω → 51 Ω": the termination resistor from the chosen series. */
const rtStep = (r) => ({ labelRaw: `${t('tn_sRt')} (${r.series})`, sym: `R_t \\approx Z_0 = ${ohmq(r.z0)} \\to ${ohmq(r.rt)}` });

function seriesSteps(r) {
  const Z0 = ohmq(r.z0);
  const Rout = ohmq(r.rout);
  const Rs = ohmq(r.rs);
  const sumSym = r.fits ? 'R_{out} + R_s' : 'R_{out}';
  const sumNum = r.fits ? `${Rout} + ${Rs}` : Rout;
  // Γ_s: the same resistances with as many digits as their difference needs.
  const sig = closeSig(r.rSource, r.z0);
  const gSum = r.fits ? `${q(r.rout, 'Ω', sig)} + ${q(r.rs, 'Ω', sig)}` : q(r.rout, 'Ω', sig);
  const gZ0 = q(r.z0, 'Ω', sig);
  return steps([
    ...lineSteps(r.line),
    r.fits
      ? { label: 'tn_sRs', sym: 'R_s \\approx Z_0 − R_{out}', num: `${Z0} − ${Rout}`, res: ohmq(r.rsExact) }
      : { label: 'tn_sRs', sym: 'R_s = \\max(0, Z_0 − R_{out})', num: `\\max(0, ${Z0} − ${Rout})`, res: Rs, note: 'tn_stepNoRs' },
    r.fits && { labelRaw: `${t('tn_sStd')} (${r.series})`, sym: `R_s = ${Rs}` },
    { label: 'tn_gammaS', sym: `Γ_s = \\frac{${sumSym} − Z_0}{${sumSym} + Z_0}`, num: `\\frac{${gSum} − ${gZ0}}{${gSum} + ${gZ0}}`, res: nq(r.gammaS) },
    { label: 'tn_v1', sym: `V_1 = V_{DD} \\cdot \\frac{Z_0}{${sumSym} + Z_0}`, num: `${vq(r.vdd)} \\cdot \\frac{${Z0}}{${sumNum} + ${Z0}}`, res: vq(r.v1) },
    { label: 'tn_vEnd', sym: 'V_{end} = (1 + Γ_L) \\cdot V_1 = 2 \\cdot V_1', num: `2 \\cdot ${vq(r.v1)}`, res: vq(r.vEnd), note: 'tn_stepEnd' },
    { label: 'tn_plateau', sym: 't_{rt} = 2 \\cdot t_d', num: `2 \\cdot ${q(r.line.tdS, 's')}`, res: q(r.line.roundTripS, 's') },
  ], { note: 'tn_noteModel', where: [...LINE_WHERE, ...DRV_WHERE], refs: REFS });
}

function parallelSteps(r) {
  const Rt = ohmq(r.rt);
  const Rout = ohmq(r.rout);
  const V = vq(r.vdd);
  const Vtt = vq(r.vtt);
  const sum = `${Rt} + ${Rout}`;
  const D = pq(r.duty);
  const gnd = r.vtt === 0; // to ground: the V_TT terms drop out
  return steps([
    ...lineSteps(r.line),
    rtStep(r),
    gammaStep(r, 'R_t', r.rt),
    gnd
      ? { label: 'tn_vHigh', sym: 'V_H = V_{DD} \\cdot \\frac{R_t}{R_t + R_{out}}', num: `${V} \\cdot \\frac{${Rt}}{${sum}}`, res: vq(r.vHigh) }
      : { label: 'tn_vHigh', sym: 'V_H = \\frac{V_{DD} \\cdot R_t + V_{TT} \\cdot R_{out}}{R_t + R_{out}}', num: `\\frac{${V} \\cdot ${Rt} + ${Vtt} \\cdot ${Rout}}{${sum}}`, res: vq(r.vHigh) },
    gnd
      ? { label: 'tn_vLow', sym: `V_L = ${vq(r.vLow)}` }
      : { label: 'tn_vLow', sym: 'V_L = \\frac{V_{TT} \\cdot R_{out}}{R_t + R_{out}}', num: `\\frac{${Vtt} \\cdot ${Rout}}{${sum}}`, res: vq(r.vLow) },
    gnd
      ? { label: 'tn_iHigh', sym: 'I_H = \\frac{V_{DD}}{R_t + R_{out}}', num: `\\frac{${V}}{${sum}}`, res: q(r.iHigh, 'A') }
      : { label: 'tn_iHigh', sym: 'I_H = \\frac{V_{DD} − V_{TT}}{R_t + R_{out}}', num: `\\frac{${V} − ${Vtt}}{${sum}}`, res: q(r.iHigh, 'A') },
    !gnd && { label: 'tn_iLow', sym: 'I_L = \\frac{V_{TT}}{R_t + R_{out}}', num: `\\frac{${Vtt}}{${sum}}`, res: q(r.iLow, 'A') },
    gnd
      ? { label: 'tn_pRt', sym: 'P_{Rt} = D \\cdot \\frac{V_H^{2}}{R_t}', num: `${D} \\cdot \\frac{${sq(vq(r.vHigh))}}{${Rt}}`, res: q(r.pRt, 'W') }
      : { label: 'tn_pRt', sym: 'P_{Rt} = D \\cdot \\frac{(V_H − V_{TT})^{2}}{R_t} + (1 − D) \\cdot \\frac{(V_{TT} − V_L)^{2}}{R_t}',
        num: `${D} \\cdot \\frac{${sq(`${vq(r.vHigh)} − ${Vtt}`)}}{${Rt}} + (1 − ${D}) \\cdot \\frac{${sq(`${Vtt} − ${vq(r.vLow)}`)}}{${Rt}}`, res: q(r.pRt, 'W') },
  ], {
    note: 'tn_noteModel',
    where: [...LINE_WHERE, ...DRV_WHERE, !gnd && ['V_{TT}', 'tn_vtt', 'vtt'], ['D', 'tn_duty', 'duty']],
    refs: REFS,
  });
}

function theveninSteps(r) {
  const Z0 = ohmq(r.z0);
  const Rout = ohmq(r.rout);
  const V = vq(r.vdd);
  const Vb = vq(r.vBias);
  const R1 = ohmq(r.r1);
  const R2 = ohmq(r.r2);
  const Rth = ohmq(r.rth);
  const Vth = vq(r.vth);
  const VH = vq(r.vHigh);
  const VL = vq(r.vLow);
  const D = pq(r.duty);
  return steps([
    ...lineSteps(r.line),
    { label: 'tn_sR1', sym: 'R_1 \\approx Z_0 \\cdot \\frac{V_{DD}}{V_{TT}}', num: `${Z0} \\cdot \\frac{${V}}{${Vb}}`, res: ohmq(r.r1Exact) },
    { label: 'tn_sR2', sym: 'R_2 \\approx Z_0 \\cdot \\frac{V_{DD}}{V_{DD} − V_{TT}}', num: `${Z0} \\cdot \\frac{${V}}{${V} − ${Vb}}`, res: ohmq(r.r2Exact) },
    { labelRaw: `${t('tn_sStd')} (${r.series})`, sym: `R_1 = ${R1}, \\quad R_2 = ${R2}` },
    { label: 'tn_rth', sym: 'R_{th} = \\frac{R_1 \\cdot R_2}{R_1 + R_2}', num: `\\frac{${R1} \\cdot ${R2}}{${R1} + ${R2}}`, res: Rth },
    { label: 'tn_vth', sym: 'V_{th} = V_{DD} \\cdot \\frac{R_2}{R_1 + R_2}', num: `${V} \\cdot \\frac{${R2}}{${R1} + ${R2}}`, res: Vth },
    gammaStep(r, 'R_{th}', r.rth),
    { label: 'tn_pIdle', sym: 'P_{idle} = \\frac{V_{DD}^{2}}{R_1 + R_2}', num: `\\frac{${sq(V)}}{${R1} + ${R2}}`, res: q(r.pIdle, 'W') },
    { label: 'tn_vHigh', sym: 'V_H = \\frac{V_{DD} \\cdot R_{th} + V_{th} \\cdot R_{out}}{R_{th} + R_{out}}', num: `\\frac{${V} \\cdot ${Rth} + ${Vth} \\cdot ${Rout}}{${Rth} + ${Rout}}`, res: VH },
    { label: 'tn_vLow', sym: 'V_L = \\frac{V_{th} \\cdot R_{out}}{R_{th} + R_{out}}', num: `\\frac{${Vth} \\cdot ${Rout}}{${Rth} + ${Rout}}`, res: VL },
    { label: 'tn_iHigh', sym: 'I_H = \\frac{V_{DD} − V_{th}}{R_{th} + R_{out}}', num: `\\frac{${V} − ${Vth}}{${Rth} + ${Rout}}`, res: q(r.iHigh, 'A') },
    { label: 'tn_iLow', sym: 'I_L = \\frac{V_{th}}{R_{th} + R_{out}}', num: `\\frac{${Vth}}{${Rth} + ${Rout}}`, res: q(r.iLow, 'A') },
    { label: 'tn_pNetHigh', sym: 'P_H = \\frac{(V_{DD} − V_H)^{2}}{R_1} + \\frac{V_H^{2}}{R_2}', num: `\\frac{${sq(`${V} − ${VH}`)}}{${R1}} + \\frac{${sq(VH)}}{${R2}}`, res: q(r.pHigh, 'W') },
    { label: 'tn_pNetLow', sym: 'P_L = \\frac{(V_{DD} − V_L)^{2}}{R_1} + \\frac{V_L^{2}}{R_2}', num: `\\frac{${sq(`${V} − ${VL}`)}}{${R1}} + \\frac{${sq(VL)}}{${R2}}`, res: q(r.pLow, 'W') },
    { label: 'tn_pNet', sym: 'P = D \\cdot P_H + (1 − D) \\cdot P_L', num: `${D} \\cdot ${q(r.pHigh, 'W')} + (1 − ${D}) \\cdot ${q(r.pLow, 'W')}`, res: q(r.pAvg, 'W') },
  ], {
    note: 'tn_noteModel',
    where: [...LINE_WHERE, ...DRV_WHERE, ['V_{TT}', 'tn_vb', 'vb'], ['D', 'tn_duty', 'duty']],
    refs: REFS,
  });
}

function acSteps(r) {
  const Rt = ohmq(r.rt);
  const Rout = ohmq(r.rout);
  const V = vq(r.vdd);
  const C = q(r.cF, 'F');
  const f = q(r.fHz, 'Hz');
  const T = q(r.periodS, 's');
  const tau = q(r.tauS, 's');
  const td = q(r.line.tdS, 's');
  return steps([
    ...lineSteps(r.line),
    rtStep(r),
    gammaStep(r, 'R_t', r.rt),
    { label: 'tn_cMin', sym: `C_{min} = \\frac{${AC_TAU_FACTOR} \\cdot 2 \\cdot t_d}{Z_0}`, num: `\\frac{${AC_TAU_FACTOR} \\cdot 2 \\cdot ${td}}{${ohmq(r.z0)}}`, res: q(r.cMinF, 'F'), note: 'tn_stepCmin' },
    r.cUser
      ? { label: 'tn_sCuser', sym: `C = ${C}` }
      : { labelRaw: `${t('tn_sCstd')} (${r.capSeries})`, sym: `C \\ge C_{min} \\to C = ${C}` },
    { label: 'tn_tauRatio', sym: '\\frac{R_t \\cdot C}{2 \\cdot t_d}', num: `\\frac{${Rt} \\cdot ${C}}{2 \\cdot ${td}}`, res: nq(r.tauRatio) },
    { label: 'tn_period', sym: 'T = \\frac{1}{f}', num: `\\frac{1}{${f}}`, res: T },
    { label: 'tn_tau', sym: 'τ = (R_t + R_{out}) \\cdot C', num: `(${Rt} + ${Rout}) \\cdot ${C}`, res: tau },
    { label: 'tn_pAc', sym: 'P = C \\cdot V_{DD}^{2} \\cdot f \\cdot \\tanh\\frac{T}{4 \\cdot τ}', num: `${C} \\cdot ${sq(V)} \\cdot ${f} \\cdot \\tanh\\frac{${T}}{4 \\cdot ${tau}}`, res: q(r.pTotal, 'W'), note: 'tn_stepPac' },
    { label: 'tn_pAcRt', sym: 'P_{Rt} = P \\cdot \\frac{R_t}{R_t + R_{out}}', num: `${q(r.pTotal, 'W')} \\cdot \\frac{${Rt}}{${Rt} + ${Rout}}`, res: q(r.pRt, 'W') },
    { label: 'tn_pDcRt', sym: `P_{Rt,DC} = ${HALF} \\cdot \\frac{V_{DD}^{2} \\cdot R_t}{(R_t + R_{out})^{2}}`, num: `${HALF} \\cdot \\frac{${sq(V)} \\cdot ${Rt}}{${sq(`${Rt} + ${Rout}`)}}`, res: q(r.pRtDc, 'W') },
  ], {
    note: 'tn_noteModel',
    where: [...LINE_WHERE, ...DRV_WHERE, ['f', 'tn_f', 'f'], r.cUser && ['C', 'tn_c', 'c']],
    refs: REFS,
  });
}

function timingSteps(r) {
  const back = r.clocking === 'return';
  const N = nq(r.n, 3);
  const T = tq(r.periodS);
  const tpd = tpdq(r.tpdSPerM);
  const d = tq(r.dclkS);
  const td = tq(r.tdataS);
  const su = tq(r.setupS);
  const two = r.lenFactor === 2;
  return steps([
    { label: 'tn_period', sym: 'T = \\frac{1}{f}', num: `\\frac{1}{${q(r.fHz, 'Hz', 5)}}`, res: T },
    { label: 'tn_tdata', sym: 't_{data} = l \\cdot t_{pd}', num: `${mmq(r.dataLengthM)} \\cdot ${tpd}`, res: td },
    back && { label: 'tn_tclk', sym: 't_{clk} = l_{clk} \\cdot t_{pd}', num: `${mmq(r.clockLengthM)} \\cdot ${tpd}`, res: tq(r.tclkS) },
    back && { label: 'tn_sDclk', sym: 'Δ_{clk} = −t_{clk}', res: tx(nsv(r.dclkS)) },
    { label: 'tn_setup', sym: 'M_{su} = N \\cdot T + Δ_{clk} − t_{co,max} − t_{data} − t_{su} − t_{unc}',
      num: `${N} \\cdot ${T} + ${d} − ${tq(r.tcoMaxS)} − ${td} − ${tq(r.tsuS)} − ${tq(r.tuncS)}`, res: tx(nsv(r.setupS)) },
    { label: 'tn_hold', sym: 'M_h = (1 − N) \\cdot T + t_{co,min} + t_{data} − Δ_{clk} − t_h − t_{unc}',
      num: `(1 − ${N}) \\cdot ${T} + ${tq(r.tcoMinS)} + ${td} − ${d} − ${tq(r.thS)} − ${tq(r.tuncS)}`, res: tx(nsv(r.holdS)) },
    r.fMaxHz !== null && { label: 'tn_fmax', sym: 'f_{max} = \\frac{N}{t_{co,max} + t_{data} + t_{su} + t_{unc} − Δ_{clk}}',
      num: `\\frac{${N}}{${tq(r.tcoMaxS)} + ${td} + ${tq(r.tsuS)} + ${tq(r.tuncS)} − ${d}}`, res: q(r.fMaxHz, 'Hz') },
    r.fHoldMaxHz !== null && { label: 'tn_fHold', sym: 'f_{max,h} = \\frac{1 − N}{t_h + t_{unc} + Δ_{clk} − t_{co,min} − t_{data}}',
      num: `\\frac{1 − ${N}}{${tq(r.thS)} + ${tq(r.tuncS)} + ${d} − ${tq(r.tcoMinS)} − ${td}}`, res: q(r.fHoldMaxHz, 'Hz'), note: 'tn_stepFmaxHold' },
    two
      ? { label: 'tn_extraBoth', sym: 'Δl = \\frac{M_{su}}{2 \\cdot t_{pd}}', num: `\\frac{${su}}{2 \\cdot ${tpd}}`, res: mmq(r.extraLenM), note: 'tn_stepExtraBoth' }
      : { label: 'tn_extra', sym: 'Δl = \\frac{M_{su}}{t_{pd}}', num: `\\frac{${su}}{${tpd}}`, res: mmq(r.extraLenM), note: 'tn_stepExtra' },
  ], {
    note: 'tn_noteTiming',
    where: [
      ['f', 'tn_fClk', 'f'], ['N', 'tn_edge', 'edge'], ['l', 'tn_lenData', 'len'], ['t_{pd}', 'tn_tpd', 'tpd'],
      back ? ['l_{clk}', 'tn_clen', 'clen'] : ['Δ_{clk}', 'tn_skew', 'skew'],
      ['t_{co,max}', 'tn_tcomax', 'tcomax'], ['t_{co,min}', 'tn_tcomin', 'tcomin'],
      ['t_{su}', 'tn_tsu', 'tsu'], ['t_h', 'tn_th', 'th'], ['t_{unc}', 'tn_tunc', 'tunc'],
    ],
    refs: REFS,
  });
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

const note = (key) => `<p class="note">${esc(t(key))}</p>`;

/** "Is termination needed?": the rule-of-thumb verdict and the numbers behind it. */
function lineVerdict(L) {
  const vars = { td: sv(L.tdS, 's', 3), lim: sv(L.limitS, 's', 3), len: lenShort(L.lengthM), crit: lenShort(L.critLenM) };
  return L.needed ? messages('warn', ['tn_tline'], { tn_tline: vars }) : messages('ok', ['tn_lumped'], { tn_lumped: vars });
}
const lineBlock = (L) => block('tn_blkLine', rows([
  ['tn_td', sv(L.tdS, 's')],
  ['tn_rtrip', sv(L.roundTripS, 's')],
  ['tn_lcrit', lenStr(L.critLenM)],
  ['tn_ratio', nv(L.ratio, 3)],
]));

/** Warnings about the driver current and the levels at the receiver (parallel and Thévenin). */
const levelWarnings = (r) => messages('warn', r.warnings, {
  tn_iDrv: { i: sv(r.iDrive, 'A', 3), max: sv(r.iMaxA ?? NaN, 'A', 3) },
  tn_vih: { v: volt(r.vHigh, 3), lim: volt(r.vih ?? NaN, 3) },
  tn_vil: { v: volt(r.vLow, 3), lim: volt(r.vil ?? NaN, 3) },
});
const ohmTxt = (x) => sv(x, 'Ω');
const exact = (x) => esc(`${t('tn_exact', { x: ohmTxt(x) })}`);

function renderSeries(r) {
  return heroes([
    ['tn_rs', unitHtml(ohmTxt(r.rs)), r.fits ? `${exact(r.rsExact)} · ${esc(r.series)}` : esc(t('tn_rsNone'))],
    ['tn_vEnd', unitHtml(volt(r.vEnd)), esc(t('tn_ofVdd', { p: pctTxt(r.vEndRatio) }))],
  ])
    + lineVerdict(r.line) + messages('warn', r.warnings)
    + seriesSteps(r)
    + block('results', rows([
      ['tn_rs', `${ohmTxt(r.rs)}${r.fits ? ` (${esc(r.series)})` : ''}`, true],
      ['tn_rsExact', r.fits ? ohmTxt(r.rsExact) : esc(t('tn_rsNone'))],
      ['tn_gammaS', nv(r.gammaS, 3)],
      ['tn_v1', volt(r.v1)],
      ['tn_vEnd', `${volt(r.vEnd)} · ${esc(t('tn_ofVdd', { p: pctTxt(r.vEndRatio) }))}`],
      ['tn_plateau', sv(r.line.roundTripS, 's')],
      ['tn_pDc', esc(t('tn_none'))],
    ]) + note('tn_seriesNote'))
    + lineBlock(r.line);
}

function renderParallel(r) {
  const limit = r.iMaxA === null ? '' : esc(t('tn_limit', { x: sv(r.iMaxA, 'A', 3) }));
  return heroes([
    ['tn_rt', unitHtml(ohmTxt(r.rt)), `${esc(t('tn_nearest', { x: ohmTxt(r.z0) }))} · ${esc(r.series)}`],
    ['tn_iDrv', unitHtml(sv(r.iDrive, 'A')), limit],
  ])
    + lineVerdict(r.line) + levelWarnings(r)
    + parallelSteps(r)
    + block('results', rows([
      ['tn_rt', `${ohmTxt(r.rt)} (${esc(r.series)})`, true],
      ['tn_gammaL', nv(r.gammaL, 3)],
      ['tn_vHigh', volt(r.vHigh)],
      ['tn_vLow', volt(r.vLow)],
      ['tn_iHigh', sv(r.iHigh, 'A')],
      ['tn_iLow', sv(r.iLow, 'A')],
      ['tn_pRtHigh', sv(r.pHigh, 'W')],
      ['tn_pRtLow', sv(r.pLow, 'W')],
      ['tn_pRt', `${sv(r.pRt, 'W')} · D = ${pctTxt(r.duty)}`, true],
    ]) + note('tn_parallelNote'))
    + lineBlock(r.line);
}

function renderThevenin(r) {
  return heroes([
    ['tn_r1', unitHtml(ohmTxt(r.r1)), `${exact(r.r1Exact)} · ${esc(r.series)}`],
    ['tn_r2', unitHtml(ohmTxt(r.r2)), `${exact(r.r2Exact)} · ${esc(r.series)}`],
  ])
    + lineVerdict(r.line) + levelWarnings(r)
    + theveninSteps(r)
    + block('results', rows([
      ['tn_rth', ohmTxt(r.rth)],
      ['tn_vth', volt(r.vth)],
      ['tn_gammaL', nv(r.gammaL, 3)],
      ['tn_vHigh', volt(r.vHigh)],
      ['tn_vLow', volt(r.vLow)],
      ['tn_iHigh', sv(r.iHigh, 'A')],
      ['tn_iLow', sv(r.iLow, 'A')],
      ['tn_pIdle', sv(r.pIdle, 'W'), true],
      ['tn_pNetHigh', sv(r.pHigh, 'W')],
      ['tn_pNetLow', sv(r.pLow, 'W')],
      ['tn_pNet', `${sv(r.pAvg, 'W')} · D = ${pctTxt(r.duty)}`, true],
    ]) + note('tn_theveninNote'))
    + lineBlock(r.line);
}

function renderAc(r) {
  const cSub = r.cUser ? esc(t('tn_cGiven')) : esc(t('tn_cNext', { x: sv(r.cMinF, 'F', 3), es: r.capSeries }));
  return heroes([
    ['tn_rt', unitHtml(ohmTxt(r.rt)), `${esc(t('tn_nearest', { x: ohmTxt(r.z0) }))} · ${esc(r.series)}`],
    ['tn_cap', unitHtml(sv(r.cF, 'F')), cSub],
  ])
    + lineVerdict(r.line)
    + messages('warn', r.warnings, { tn_cSmall: { c: sv(r.cF, 'F', 3), cmin: sv(r.cMinF, 'F', 3) } })
    + acSteps(r)
    + block('results', rows([
      ['tn_rt', `${ohmTxt(r.rt)} (${esc(r.series)})`, true],
      ['tn_gammaL', nv(r.gammaL, 3)],
      ['tn_cMin', sv(r.cMinF, 'F')],
      ['tn_cap', `${sv(r.cF, 'F')} (${r.cUser ? esc(t('tn_cGiven')) : esc(r.capSeries)})`, true],
      ['tn_tauRatio', nv(r.tauRatio, 3)],
      ['tn_tau', sv(r.tauS, 's')],
      ['tn_pAc', sv(r.pTotal, 'W')],
      ['tn_pAcRt', sv(r.pRt, 'W'), true],
      ['tn_pDcRt', sv(r.pRtDc, 'W')],
      ['tn_saving', pctTxt(r.saving)],
      ['tn_pDc', esc(t('tn_none'))],
    ]) + note('tn_acNote'))
    + lineBlock(r.line);
}

function renderTiming(r) {
  const ev = r.events;
  const su = nsv(r.setupS, 4);
  const h = nsv(r.holdS, 4);
  const fails = r.warnings.filter((w) => ['tn_setupNeg', 'tn_holdNeg', 'tn_holdNegHalf'].includes(w));
  const verdict = fails.length
    ? messages('error', fails, {
      tn_setupNeg: { su, fmax: sv(r.fMaxHz ?? NaN, 'Hz', 3) },
      tn_holdNeg: { h },
      tn_holdNegHalf: { h, fmax: sv(r.fHoldMaxHz ?? NaN, 'Hz', 3) },
    })
    : messages('ok', ['tn_pass'], { tn_pass: { su, h } });
  const extra = esc(t(r.extraLenM >= 0 ? 'tn_longer' : r.lengthFixable ? 'tn_shorter' : 'tn_noShorter', { x: lenStr(Math.abs(r.extraLenM)) }));
  return heroes([
    ['tn_setup', unitHtml(su), `T = ${nsv(r.periodS, 4)} · N = ${nv(r.n, 3)}`],
    ['tn_hold', unitHtml(h), `Δclk = ${nsv(r.dclkS, 4)}`],
  ])
    + verdict
    + timingSteps(r)
    + block('tn_blkTiming', rows([
      ['tn_setup', su, true],
      ['tn_hold', h, true],
      ['tn_period', nsv(r.periodS, 4)],
      ['tn_tdata', nsv(r.tdataS, 4)],
      r.clocking === 'return' && ['tn_tclk', nsv(r.tclkS, 4)],
      ['tn_dclk', nsv(r.dclkS, 4)],
      ['tn_capture', `t = ${nsv(ev.captureS, 4)}`],
      // A t_co spread longer than the period leaves no interval in which the data is valid.
      ['tn_validWin', r.validWindowS > 0 ? `${nsv(r.validWindowS, 4)} · t = ${nsv(ev.validS, 4)} … ${nsv(ev.validEndS, 4)}` : esc(t('tn_none'))],
      ['tn_needWin', `${nsv(r.needWindowS, 4)} · t = ${nsv(ev.needFromS, 4)} … ${nsv(ev.needUntilS, 4)}`],
      ['tn_fmax', r.fMaxHz === null ? esc(t('tn_fmaxAny')) : sv(r.fMaxHz, 'Hz')],
      r.fHoldMaxHz !== null && ['tn_fHold', sv(r.fHoldMaxHz, 'Hz')],
      [r.lenFactor === 2 ? 'tn_extraBoth' : 'tn_extra', extra],
    ]));
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const isMode = (...m) => (v) => m.includes(v.mode);
const notTiming = (v) => v.mode !== 'timing';
const isTiming = isMode('timing');
const timeField = (key, label, def, extra = {}) => ({ key, type: 'number', label, default: def, units: TIME, ...extra });

// Examples: every field the mode uses is set, so an example does not depend on what was entered before.
const DRIVE = { z0: 50, rout: 20, vdd: 3.3, tr: 1, tpd: TPD_DEFAULT, es: 'E24' };
const EXAMPLES = {
  clk: { mode: 'series', ...DRIVE, rout: 17, tr: 0.5, len: 80 },
  spi: { mode: 'timing', f: 50, len: 120, tpd: TPD_DEFAULT, edge: 'opp', clk: 'return', clen: 120, tcomax: 6, tcomin: 0, tsu: 2, th: 1, tunc: 0.2 },
  thev: { mode: 'thevenin', ...DRIVE, z0: 60, len: 150, vb: 1.5, duty: 50, imax: 24, vih: 2, vil: 0.8 },
  ac: { mode: 'ac', ...DRIVE, len: 150, f: 25, c: '' },
};

export default {
  id: 'termination',
  strings,
  diagram,
  sections: [
    {
      title: 'sectionSetup',
      fields: [
        { key: 'mode', type: 'choice', label: 'tn_mode', default: 'series', info: 'tn_modeInfo',
          options: [
            { value: 'series', label: 'tn_mSeries' }, { value: 'parallel', label: 'tn_mParallel' },
            { value: 'thevenin', label: 'tn_mThevenin' }, { value: 'ac', label: 'tn_mAc' }, { value: 'timing', label: 'tn_mTiming' },
          ] },
        { key: 'ex', type: 'select', label: 'tn_ex', default: 'none', info: 'tn_exInfo',
          options: [
            { value: 'none', label: 'tn_exNone' },
            { value: 'clk', label: 'tn_exClk', set: EXAMPLES.clk },
            { value: 'spi', label: 'tn_exSpi', set: EXAMPLES.spi },
            { value: 'thev', label: 'tn_exThev', set: EXAMPLES.thev },
            { value: 'ac', label: 'tn_exAc', set: EXAMPLES.ac },
          ] },
      ],
    },
    {
      title: 'tn_secDrv',
      show: notTiming,
      fields: [
        { key: 'z0', type: 'number', label: 'tn_z0', default: 50, units: ['ohm'],
          presets: [40, 50, 60, 75].map((x) => ({ label: `${x} Ω`, value: x })) },
        { key: 'rout', type: 'number', label: 'tn_rout', default: 20, units: ['ohm'], valid: 'nonneg', hint: 'tn_routHint' },
        { key: 'vdd', type: 'number', label: 'tn_vdd', default: 3.3, units: ['V'],
          presets: [1.8, 2.5, 3.3, 5].map((x) => ({ label: `${x} V`, value: x })) },
        { key: 'tr', type: 'number', label: 'tn_tr', default: 1, units: TIME, info: 'tn_trInfo',
          presets: [{ label: '100 ps', value: 100, unit: 'ps' }, { label: '500 ps', value: 500, unit: 'ps' }, { label: '1 ns', value: 1, unit: 'ns' }, { label: '5 ns', value: 5, unit: 'ns' }] },
        { key: 'es', type: 'choice', label: 'tn_es', default: 'E24',
          options: [{ value: 'E24', label: 'E24', raw: true }, { value: 'E96', label: 'E96', raw: true }] },
      ],
    },
    {
      title: 'tn_secTrace',
      fields: [
        { key: 'len', type: 'number', label: (v) => (isTiming(v) ? 'tn_lenData' : 'tn_len'), default: 100, units: LEN },
        { key: 'tpd', type: 'number', label: 'tn_tpd', default: TPD_DEFAULT, units: ['psmm', 'psin'], info: 'tn_tpdInfo',
          presets: [
            { label: `microstrip · ${TPD_DEFAULT}`, value: TPD_DEFAULT, unit: 'psmm' },
            { label: `stripline · ${psPerMm(TPD_STRIPLINE)}`, value: psPerMm(TPD_STRIPLINE), unit: 'psmm' },
          ] },
        { key: 'f', type: 'number', label: (v) => (isTiming(v) ? 'tn_fClk' : 'tn_f'), default: 50, units: ['MHz', 'kHz', 'GHz'], info: 'tn_fInfo',
          show: isMode('ac', 'timing') },
      ],
    },
    {
      title: 'tn_secTerm',
      show: isMode('parallel', 'thevenin', 'ac'),
      fields: [
        { key: 'vtt', type: 'number', label: 'tn_vtt', default: 0, units: ['V'], valid: 'nonneg', info: 'tn_vttInfo', show: isMode('parallel') },
        { key: 'vb', type: 'number', label: 'tn_vb', default: '', optional: true, units: ['V'], hint: 'tn_vbHint', show: isMode('thevenin') },
        { key: 'duty', type: 'number', label: 'tn_duty', default: 50, units: ['pct'], valid: 'nonneg', max: 100, show: isMode('parallel', 'thevenin') },
        { key: 'imax', type: 'number', label: 'tn_imax', default: 24, units: ['mA'], info: 'tn_imaxInfo', show: isMode('parallel', 'thevenin'),
          presets: [4, 8, 12, 24].map((x) => ({ label: `${x} mA`, value: x })) },
        { key: 'vih', type: 'number', label: 'tn_vih', default: 2, units: ['V'], show: isMode('parallel', 'thevenin') },
        { key: 'vil', type: 'number', label: 'tn_vil', default: 0.8, units: ['V'], valid: 'nonneg', show: isMode('parallel', 'thevenin') },
        { key: 'c', type: 'number', label: 'tn_c', default: '', optional: true, units: [FARAD], si: true, hint: 'tn_cHint', show: isMode('ac') },
      ],
    },
    {
      title: 'tn_secTiming',
      show: isTiming,
      fields: [
        { key: 'edge', type: 'choice', label: 'tn_edge', default: 'same', info: 'tn_edgeInfo',
          options: [{ value: 'same', label: 'tn_edgeSame' }, { value: 'opp', label: 'tn_edgeOpp' }] },
        { key: 'clk', type: 'choice', label: 'tn_clk', default: 'common', info: 'tn_clkInfo',
          options: [{ value: 'common', label: 'tn_clkCommon' }, { value: 'return', label: 'tn_clkReturn' }] },
        timeField('skew', 'tn_skew', 0, { valid: 'any', info: 'tn_skewInfo', show: (v) => v.clk !== 'return' }),
        { key: 'clen', type: 'number', label: 'tn_clen', default: 100, units: LEN, show: (v) => v.clk === 'return' },
        timeField('tcomax', 'tn_tcomax', 8, { valid: 'nonneg', info: 'tn_tcoInfo' }),
        timeField('tcomin', 'tn_tcomin', 1, { valid: 'nonneg' }),
        timeField('tsu', 'tn_tsu', 3, { valid: 'any' }),
        timeField('th', 'tn_th', 0.5, { valid: 'any' }),
        timeField('tunc', 'tn_tunc', 0.2, { valid: 'nonneg', info: 'tn_tuncInfo' }),
      ],
    },
  ],

  compute(v, u) {
    const len = (k) => (lengthUnits.includes(u[k]) ? toMm(v[k], u[k]) / 1000 : NaN);
    const time = (k) => v[k] * (T_MUL[u[k]] ?? NaN);
    const given = (x) => (Number.isFinite(x) ? x : undefined); // optional field left empty
    return termination({
      mode: v.mode,
      lengthM: len('len'),
      tpdSPerM: v.tpd * (TPD_MUL[u.tpd] ?? NaN),
      z0: v.z0,
      rout: v.rout,
      vdd: v.vdd,
      trS: time('tr'),
      series: v.es,
      vtt: v.vtt,
      vBias: given(v.vb),
      duty: v.duty / 100,
      iMaxA: v.imax / 1000,
      vih: v.vih,
      vil: v.vil,
      fHz: v.f * (F_MUL[u.f] ?? NaN),
      cUserF: given(v.c),
      tcoMaxS: time('tcomax'),
      tcoMinS: time('tcomin'),
      tsuS: time('tsu'),
      thS: time('th'),
      tuncS: time('tunc'),
      n: v.edge === 'opp' ? 0.5 : 1,
      clocking: v.clk === 'return' ? 'return' : 'common',
      skewS: time('skew'),
      clockLengthM: len('clen'),
    });
  },

  render(r) {
    if (!r.ok) return invalid(r.errors);
    switch (r.mode) {
      case 'parallel': return renderParallel(r);
      case 'thevenin': return renderThevenin(r);
      case 'ac': return renderAc(r);
      case 'timing': return renderTiming(r);
      default: return renderSeries(r);
    }
  },
};
