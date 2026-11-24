// Interface design rules: pick an interface → a rules card with sourced
// values, a skew ⇄ length converter for the user's board, a link to the
// impedance calculator, and a diagram of what length matching means.

import {
  SOURCES, ROW_KINDS, GENERAL_HS, INTERFACES, PCIE_GENS, DDR_GROUPS, ETH_PARTS,
  ruleSetFor, rowKey, sourcesOf, erEffective, delayPsPerMm, convertSkew, limitIn, withinLimit,
} from '../engine/interfaces.js';
import { heroes, rows, block, formulaBlock, checks } from '../ui/calculator.js';
import { esc } from '../ui/format.js';
import { icon } from '../ui/icons.js';
import { t, getLang } from '../i18n.js';
import { isImperial } from '../prefs.js';
import { svg, rect, path, text, dimH, dimV, callout, axes, wave, twoTerm, circle, node, ground } from '../ui/svg.js';

// ---------------------------------------------------------------------------
// Strings
// ---------------------------------------------------------------------------

const strings = {
  tr: {
    if_secIface: 'Arayüz',
    if_iface: 'Arayüz',
    if_gen: 'PCIe nesli',
    if_grp: 'Sinyal grubu',
    if_grp_data: 'Veri / DQS',
    if_grp_clock: 'Saat (CK)',
    if_grp_addr: 'Adres / komut',
    if_eth: 'Kart bölümü',
    if_ethInfo: 'MDI: PHY ile RJ45 arasındaki diferansiyel çiftler (manyetik dahil). RGMII: MAC (işlemci) ile PHY arasındaki tek uçlu paralel arayüz.',
    if_eth_mdi: 'MDI (RJ45 tarafı)',
    if_eth_rgmii: 'RGMII (MAC–PHY)',
    if_opt_usb2: 'USB 2.0 High-Speed',
    if_opt_usb3: 'USB 3.x SuperSpeed (5/10/20 Gbit/s)',
    if_opt_pcie: 'PCI Express (Gen1–Gen5)',
    if_opt_sata: 'SATA',
    if_opt_hdmi: 'HDMI (TMDS)',
    if_opt_mipi: 'MIPI D-PHY (CSI-2 / DSI)',
    if_opt_lvds: 'LVDS',
    if_opt_eth: 'Ethernet 10/100/1000BASE-T',
    if_opt_ddr3: 'DDR3',
    if_opt_ddr4: 'DDR4',
    if_opt_ddr5: 'DDR5',
    if_opt_can: 'CAN / CAN FD',
    if_opt_rs485: 'RS-485',
    if_opt_i2c: 'I²C (kısa not)',
    if_opt_spi: 'SPI (kısa not)',
    if_secBoard: 'Kartınız',
    if_st: 'İz yapısı',
    if_stInfo: 'Microstrip: dış katmanda, altında düzlem olan iz. Stripline: iki düzlem arasında iç katman izi; εeff = εr. Empedans hesaplayıcısından εeff değerini biliyorsanız “εeff biliniyor” seçeneğini kullanın.',
    if_st_microstrip: 'Microstrip',
    if_st_stripline: 'Stripline',
    if_st_known: 'εeff biliniyor',
    if_er: 'Dielektrik sabiti (εr)',
    if_erEff: 'Etkin dielektrik sabiti (εeff)',
    if_erInfo: 'Üreticinin çalışma frekansındaki tasarım Dk değeri. FR-4 için tipik 4,0–4,5.',
    if_secConv: 'Skew ⇄ uzunluk dönüştürücü',
    if_x: 'Dönüştürülecek değer',
    if_xInfo: 'ps girerseniz eşdeğer uzunluk farkı, mm veya mil girerseniz eşdeğer zaman kayması hesaplanır ve arayüz sınırıyla karşılaştırılır. Boş bırakılırsa arayüzün sınırı dönüştürülür.',
    if_hZdiff: 'Diferansiyel empedans',
    if_hZse: 'Tek uçlu empedans',
    if_hZnone: 'Empedans',
    if_hPair: 'Çift içi en büyük kayma',
    if_hGroup: 'Grup eşleme sınırı',
    if_hRate: 'Veri hızı',
    if_zNoneShort: 'kontrollü empedans gerekmez',
    if_rateSub_can: 'klasik CAN (40 m) / CAN FD veri fazı',
    if_rateSub_rs485: '12 m’de; uzunluk (m) × hız (bit/s) ≤ 10⁷',
    if_rateSub_i2c: 'Sm / Fm / Fm+ / Hs',
    if_vendors: 'kaynaklarda {r}',
    if_kDiff: 'diferansiyel',
    if_kSe: 'tek uçlu',
    if_onBoard: 'bu kartta ≈ {v}',
    if_chkPass: '{name}: {lim}',
    if_yours: 'Girilen {v} → {conv}',
    if_open: 'Empedans hesaplayıcısında aç',
    if_openSub: '{z} · {st}',
    if_rules: 'Yerleşim kuralları',
    if_general: 'Genel yüksek hız kuralları (TI SPRAAR7J)',
    if_sources: 'Kaynaklar',
    if_accessed: 'erişim',
    if_conv: 'Kartınızda gecikme ve uzunluk',
    if_erUsed: 'Kullanılan εeff',
    if_tpd: 'Yayılma gecikmesi',
    if_input: 'Girilen değer',
    if_lim_pair: 'Çift içi sınır',
    if_lim_group: 'Grup sınırı',
    if_ref_dqs: 'DQ/DM → DQS',
    if_ref_ck: 'adres/komut → CK',
    if_ref_dqsCk: 'DQS → CK',
    if_ref_clkLane: 'veri şeridi → saat şeridi',
    if_ref_rgmiiClk: 'TXD/RXD ve CTL kendi aralarında',
    if_row_rate: 'Veri hızı',
    if_row_signal: 'Sinyalleşme',
    if_row_z: 'Empedans',
    if_row_skew: 'Çift içi kayma',
    if_row_group: 'Çiftler arası / grup eşleme',
    if_row_length: 'Uzunluk ve kayıp',
    if_row_vias: 'Via ve saplama',
    if_row_spacing: 'Aralık',
    if_row_plane: 'Referans düzlemi',
    if_row_ac: 'AC kuplaj kondansatörü',
    if_row_term: 'Sonlandırma',
    if_row_esd: 'ESD ve ortak mod bobini',
    if_row_other: 'Notlar',
    if_row_g_tune: 'Uzunluk ayarı',
    if_row_g_plane: 'Referans düzlemi',
    if_row_g_bend: 'Kıvrım ve aralık',
    if_row_g_via: 'Via',
    if_row_g_smd: 'Seri parçalar',
    if_row_g_weave: 'Cam elyaf dokusu',
    if_note: 'Stripline’da alan tamamen dielektrik içindedir, εeff = εr. Microstrip için IPC-2141A yaklaşımı kullanılır; gerçek εeff iz genişliğine ve dielektrik yüksekliğine bağlıdır (empedans hesaplayıcısındaki Hammerstad–Jensen modeli tipik izlerde daha yüksek değer verir). Kesin sonuç için εeff değerini empedans hesaplayıcısından alıp “εeff biliniyor” seçin.',
    if_disclaimer: 'Değerler adı verilen standartlardan ve üretici yerleşim kılavuzlarından alınmıştır (erişim 2026-11-25). Üreticiler farklı değerler verebilir; kendi yongenizin yerleşim kılavuzu ve arayüz spesifikasyonu her zaman önceliklidir.',
    // Diagrams
    if_dgAria: 'Diferansiyel çiftin üstten görünüşü: bir dönüş dış hattı ΔL kadar uzatır; kısa hatta, dönüşe yakın konan serpantin alıcıda görülen Δt kaymasını giderir.',
    if_dgSource: 'kaynak: dönüş · dış hat +ΔL',
    if_dgTune: 'serpantin kaynağa yakın',
    if_dgRx: 'alıcıda (ayarsız)',
    if_dgLimit: 'sınır',
    if_dgOk: 'sınır içinde',
    if_dgBad: 'sınır aşıldı',
    if_dgExample: 'örnek: tam sınırda',
    if_dgGroupAria: 'Grup eşleme: her hat alıcıya referansın (strobe ya da saat) ± pencere süresi içinde ulaşmalıdır; kısa hatlara serpantin eklenir.',
    if_dgShort: 'kısa hatlara serpantin',
    if_dgArrival: 'alıcıya varış',
    if_dgYours: 'sizin',
    if_dgBusAria: 'Hat sonlandırması: kablonun yalnızca iki ucunda 120 Ω; aradaki düğümler kısa saplamalarla bağlanır.',
    if_dgNode: 'Düğüm',
    if_dgEnds: 'yalnızca iki uçta 120 Ω',
    if_dgStub: 'saplama',
    if_dgI2cAria: 'I²C veriyolu: açık-akaçlı hatlar, VDD’ye çekme dirençleri ve toplam veriyolu kapasitansı.',
    if_dgDev: 'Cihaz',
    if_dgSpiAria: 'SPI: seri dirençler her hattın sürücü ucuna konur.',
    if_dgNear: 'Rs sürücüye yakın',
    if_dgPeriph: 'Çevre|birimi',
    if_zSub_spi: 'yalnızca uzun hatlarda (TI CC3135)',
    if_dgMean: 'ortalama',
    if_dgTotal: 'toplam yayılma',
    if_imp_microstrip: 'microstrip',
    if_imp_stripline: 'stripline',
    if_imp_diffMicrostrip: 'diferansiyel microstrip',
    if_imp_diffStripline: 'diferansiyel stripline',
    // Rule prose ------------------------------------------------------------
    if_usb2_signal: 'Tek çift (D+/D−), yarı çift yönlü; High-Speed modda 480 Mbit/s. PHY her hattı 45 Ω ile GND’ye sonlandırır; HS yüksek seviyesi 360–440 mV.',
    if_usb2_z: 'USB 2.0 spesifikasyonu 90 Ω ±%15 verir; SoC kılavuzları (TI, Renesas, NXP) ±%10 ister.',
    if_usb2_skew: 'Renesas RZ/A2M: D+/D− uzunluk farkı ≤ 2 mm.',
    if_usb2_length: 'Kısa tutun: Renesas, 100 ps/cm kabulüyle host tarafında ≤ 3 ns (≈ 300 mm), cihaz tarafında ≤ 1 ns (≈ 100 mm) izin verir.',
    if_usb2_vias: 'TI: iz başına en fazla 4 via; saplama (stub) ve test noktası yok. Renesas: tek katmanda, via ve dallanma olmadan yönlendirin.',
    if_usb2_spacing: 'Saat ve periyodik sinyallere ≥ 50 mil (1,27 mm), diğer tüm sinyallere ≥ 30 mil (0,76 mm).',
    if_usb2_ac: 'Yok: HS sinyalleşmesi DC kuplajlıdır (iki uçta da 45 Ω GND’ye).',
    if_usb2_esd: 'ESD diyodu < 4 pF, konektöre olabildiğince yakın. Sıra: PHY → (isteğe bağlı) ortak mod bobini → ESD → konektör. Delikli (THT) konektörde bağlantıyı alt katmandan yapın; pin saplama gibi davranmasın.',
    if_usb3_signal: 'Şerit başına bir TX ve bir RX çifti, AC kuplajlı: Gen 1 5 Gbit/s, Gen 2 10 Gbit/s; Gen 2x2 iki şerit kullanır (20 Gbit/s). Yanında bir USB 2.0 çifti (D+/D−) de bulunur.',
    if_usb3_z: 'Üreticiler farklı: TI AM57xx 90 Ω ±%7, TI TUSB1002A 90 Ω ±%15, TI AM64x 95 Ω ±%5, NXP 90 Ω ±%10.',
    if_usb3_skew: 'TI TUSB1002A ≤ 2 mil ister. Serpantini uyumsuzluğun oluştuğu uca koyun.',
    if_usb3_group: 'TX ve RX çiftlerinin birbirine eşlenmesi gerekmez.',
    if_usb3_length: 'Yongaya bağlı: ör. TI AM57xx ≤ 3500 mil (89 mm), KeyStone II ve AM64x ≤ 5500 mil (140 mm). Kanal kaybı sınırı USB spesifikasyonundadır.',
    if_usb3_vias: 'İz başına ≤ 2 via, iki hatta aynı sayıda. Via saplaması < 15 mil (0,38 mm); daha uzunsa geri delin (back-drill).',
    if_usb3_ac: 'TX çiftinde: 75–265 nF (tipik 220 nF). 0402 veya daha küçük (en fazla 0603), yan yana ve simetrik; pad’lerin altındaki referans düzlemini en az 2 katman boyunca boşaltın.',
    if_usb3_esd: 'ESD: 5 Gbit/s’de < 0,5 pF, şerit başına 10 Gbit/s’de < 0,3 pF; konektöre ≤ 0,6 in (15 mm). Akışlı (flow-through) ESD kılıfı, pad altlarında %60 boşluk; AC kondansatörleri ortak mod filtresinin korunan tarafında.',
    if_pcie_gen1_signal: 'Şerit başına 2,5 GT/s, 8b/10b kodlama. Her şeritte bir TX ve bir RX çifti, AC kuplajlı; 100 MHz diferansiyel referans saati.',
    if_pcie_gen2_signal: 'Şerit başına 5 GT/s, 8b/10b kodlama. Her şeritte bir TX ve bir RX çifti, AC kuplajlı; 100 MHz diferansiyel referans saati.',
    if_pcie_gen3_signal: 'Şerit başına 8 GT/s, 128b/130b kodlama, TX ve RX eşitleme (link training). Her şeritte bir TX ve bir RX çifti, AC kuplajlı.',
    if_pcie_gen4_signal: 'Şerit başına 16 GT/s, 128b/130b kodlama, TX ve RX eşitleme. Her şeritte bir TX ve bir RX çifti, AC kuplajlı.',
    if_pcie_gen5_signal: 'Şerit başına 32 GT/s, 128b/130b kodlama, NRZ; 20/80 yükselme süresi ≈ 12 ps. Her şeritte bir TX ve bir RX çifti, AC kuplajlı.',
    if_pcie_g12_z: 'TI AM57xx / KeyStone II: 100 Ω ±%10 diferansiyel, 60 Ω ±%15 tek uçlu.',
    if_pcie_g3p_z: 'Spesifikasyon 70–100 Ω’a izin verir; eklenti kartlar her yuvayla çalışsın diye 85 Ω olmalıdır (TI SNLA426). NXP i.MX 8M Plus: 85 Ω ±%10.',
    if_pcie_skew: 'PCIe CEM 2.0: eklenti kartta < 5 mil, sistem kartında < 10 mil. Telafiyi uyumsuzluğun oluştuğu segmentin hemen başında yapın.',
    if_pcie_group: 'Şeritler arası eşleme gerekmez (her şerit kendi saatini taşır); fark tipik olarak 1 in’e kadar, önerilen < 6 in (TI). TX ve RX çiftleri birbirine eşlenmez. Yonga sınırları geçerlidir, ör. TI AM64x: RX şeritleri arası ≤ 6 ns, TX ≤ 1,5 ns.',
    if_pcie_g12_length: 'Yongaya bağlı: ör. TI AM57xx ≤ 4700 mil (119 mm), KeyStone II ≤ 5500 mil (140 mm).',
    if_pcie_gen3_length: 'Toplam kanal bütçesi ≈ 22–23,5 dB (Astera, TI). TI örneği: işlemci kılıfı 3,5 dB, 9 in yüksek kayıplı sistem kartı izi 13 dB, CEM konektörü 0,5 dB, 4 in eklenti kart 6,5 dB.',
    if_pcie_gen4_length: 'Toplam kanal bütçesi ≈ 28 dB. TI örneği: kılıf 5 dB, 9 in sistem kartı izi 14 dB, konektör 0,5 dB, eklenti kart 8,5 dB; karışma payı < 2 dB.',
    if_pcie_gen5_length: 'Toplam kanal bütçesi ≈ 36 dB (Nyquist 16 GHz). TI örneği: kılıf 9 dB, 9 in sistem kartı izi 16 dB, konektör 1,5 dB, eklenti kart 9,5 dB; karışma için 4–5 dB, sıcaklık/nem için 2–3 dB pay.',
    if_pcie_g13_vias: 'P ve N hatlarında eşit sayıda via, yongaya olabildiğince yakın. Via saplaması < 15 mil (0,38 mm); daha uzunsa geri delin.',
    if_pcie_g45_vias: 'Konektör ve sinyal via’larını geri delin (TI SN75LVPE5421). Gen5 kenarları ≈ 29 GHz bant genişliği ister: geri delinmemiş saplama FR-4’te ≈ 51 mil’in (Megtron 6’da ≈ 54 mil) altında kalmalı; TI yine de 15 mil’den uzun saplamaların geri delinmesini önerir. Anti-pad çevresinde çok sayıda GND dikiş via’sı kullanın.',
    if_pcie_g12_ac: '75–200 nF (Microchip PolarFire, Gen1/Gen2; vericiye yakın). Qualcomm Gen2 için 75–265 nF verir.',
    if_pcie_g3_ac: '176–265 nF, tipik 220 nF; her TX çiftinin iki hattına birer tane. Qualcomm: kaynağa ya da alıcıya yakın, P ve N kondansatörleri yan yana, kaydırmadan.',
    if_pcie_g45_ac: 'Tipik 220 nF (TI), en fazla 0402, pad altında GND boşluğu. Yongadan yongaya bağlantıda alıcıya (RX) yakın; CEM yuvası veya kart kenarı konektöründe konektöre yakın (TI SNLA426).',
    if_pcie_term: 'Yonga içinde; alıcı algılama (Rx detect) sonrasında devreye girer. Harici direnç yok.',
    if_pcie_other: 'Referans saati: 100 MHz, hedef 100 Ω diferansiyel (TI SNLA426; NXP i.MX 8M Plus 85 Ω ±%10 kullanır). Gen5’te rastgele jitter ≤ 200 fs RMS olmalı.',
    if_sata_signal: 'Bir TX ve bir RX çifti, AC kuplajlı; 1,5 / 3 / 6 Gbit/s.',
    if_sata_length: 'Yongaya bağlı: TI AM57xx ≤ 3500 mil (89 mm); TI C6748 yongadan konektöre ≤ 7000 mil (178 mm).',
    if_sata_vias: 'TI AM57xx: via yok; TI C6748: en fazla 3, her zaman çift olarak. Saplama yok.',
    if_sata_ac: 'Tipik 10 nF, en fazla 12 nF (SATA spesifikasyonu, TI SN75LVPE801); TI C6748: 0,3 / 10 / 12 nF (min/tip/maks), en fazla 0603.',
    if_hdmi_signal: 'TMDS: üç veri çifti ve bir saat çifti, DC kuplajlı akım modu; alıcı her hattı 50 Ω ile 3,3 V’a sonlandırır. HDMI 1.4: şerit başına 3,4 Gbit/s’ye kadar (340 MHz saat); HDMI 2.0: 6 Gbit/s’ye kadar.',
    if_hdmi_z: 'HDMI spesifikasyonu: 100 Ω ±%15. TI AM57xx ve NXP ±%10 ister.',
    if_hdmi_skew: 'Spesifikasyon: kaynakta ≤ 0,15·Tbit (225 MHz TMDS saatinde 66 ps), alıcıda ≤ 0,4·Tbit.',
    if_hdmi_group: 'Çiftler arası: kaynakta ≤ 0,2·Tkarakter (225 MHz’de 888 ps), alıcıda ≤ 0,2·Tkarakter + 1,78 ns.',
    if_hdmi_length: 'TI AM57xx: ≤ 4000 mil (102 mm), via yok, saplama yok.',
    if_hdmi_ac: 'Yok: TMDS, alıcının 50 Ω çekme dirençlerine DC kuplajlıdır.',
    if_hdmi_esd: 'Çok düşük kapasitanslı ESD koruması (ör. TI TPD12S016), IEC 61000-4-2 seviye 4, konektöre olabildiğince yakın.',
    if_mipi_signal: 'Yüksek hızlı diferansiyel veri şeritleri ve bir saat şeridi; aynı teller tek uçlu düşük güç (LP) sinyalleşmesini de taşır. Şerit başına: v1.1 1,5 Gbit/s, v1.2 2,5 Gbit/s, v2.x 4,5 Gbit/s.',
    if_mipi_z: 'TI: 100 Ω ±%15 diferansiyel, 50 Ω tek uçlu; LP modu nedeniyle çiftler gevşek kuplajlı olmalı. NXP i.MX 8M Plus: 100 Ω ±%10.',
    if_mipi_skew: 'D-PHY mod dönüşüm S-parametrelerini sağlamalı; TI tahmini UI/50 (2,5 Gbit/s’de 8 ps). NXP i.MX 8M Plus: 1 ps içinde.',
    if_mipi_group: 'Veri şeritleri ile saat şeridi arası ≤ 0,1·UI, yani 2,5 Gbit/s’de 40 ps (TI).',
    if_mipi_length: 'Muhafazakâr sınır ≤ 10 in (254 mm) (TI); iz başına ≤ 2 via.',
    if_mipi_other: 'NXP i.MX 8M Plus’ta DSI: uyumluluk testleri için veri izi başına ≤ 10 pF, toplam yük ≤ 60 pF.',
    if_lvds_signal: 'Akım döngüsü: 100 Ω üzerinde 3,5 mA ≈ 350 mV verir; alıcı eşiği ≤ 100 mV; ortak mod aralığı 0–2,4 V. Onlarca Mbit/s’den ≈ 3 Gbit/s’ye kadar kullanılır.',
    if_lvds_z: 'Sonlandırma direnci hattın diferansiyel empedansına eşit seçilmelidir.',
    if_lvds_skew: 'TI: uzunlukları 5 mm içinde eşleyerek diferansiyel kaymayı ±30 ps içinde tutun; iki hattın elektriksel uzunluğunu eşleyin.',
    if_lvds_vias: 'Saplamalar < 10 mm (TI DS90LV028A).',
    if_lvds_term: 'Çiftin uçları arasına tek bir 100 Ω direnç (90–130 Ω, %1–2 SMD), alıcı girişine < 10 mm (en fazla 12 mm).',
    if_eth_mdi_signal: '10/100BASE-TX iki çift, 1000BASE-T dört çiftin hepsini iki yönde kullanır. MDI: PHY ↔ manyetik (trafo) ↔ RJ45.',
    if_eth_mdi_z: 'Kablo veri sayfası bir empedans veriyorsa ona göre ayarlayın.',
    if_eth_mdi_skew: '10/100 Mbit/s için 50 mil yeterlidir.',
    if_eth_mdi_length: 'MDI yolunun tamamı < 2 in (51 mm).',
    if_eth_mdi_vias: 'Olabildiğince az; her çifti tek katmanda yönlendirin.',
    if_eth_mdi_spacing: 'Farklı çiftler arasında ≥ 30 mil (0,76 mm); aynı katmandaki GND dökümü ≥ 3w uzakta (tercihen 5w).',
    if_eth_mdi_plane: 'Manyetiğin altında hiçbir katmanda bakır olmasın (manyetiği içinde RJ45 hariç). Çift üzerindeki parçaların altındaki düzlemleri boşaltın (2 katman; otomotivde tüm katmanlar). Şasi toprağı: çevresinde ≥ 20 mil boşluk olan ayrı bir ada; GND’ye bir kondansatör ve ≥ 1 MΩ ile bağlanır.',
    if_eth_mdi_term: 'Kablo tarafında Bob Smith sonlandırması: her orta uçtan 75 Ω, ortak düğümden 1000 pF (≥ 2 kV) ile şasiye; PoE varsa uygulanmaz. PHY tarafı: her orta uç ayrı ayrı 0,1 µF ile GND’ye (DP83867).',
    if_eth_mdi_esd: 'ESD’yi manyetiğin PHY tarafına koyun; konektör tarafında büyük ortak mod salınımları olur.',
    if_eth_rgmii_signal: 'Her yönde 4 veri + 1 kontrol hattı, çift kenar (DDR) veri; 1 Gbit/s’de TXC/RXC 125 MHz (100 / 10 Mbit/s’de 25 / 2,5 MHz).',
    if_eth_rgmii_group: 'TXD[3:0] ve TX_CTL (RXD ve RX_CTL de) kendi aralarında < 11 ps ≈ FR-4’te 60 mil (DP83867); TI kontrol listesi: 1 Gbit/s’de 20 mil içinde. AMD Versal: gecikmeyi PHY eklediğinde veri/CTL ile saat arası 50 ps içinde.',
    if_eth_rgmii_length: 'Önerilen < 2 in (51 mm), en fazla 6 in (152 mm).',
    if_eth_rgmii_term: 'TX_CLK’de MAC’e yakın, RX_CLK’de PHY’ye yakın ≈ 30 Ω seri direnç; benzetimle doğrulayın (AMD Versal).',
    if_eth_rgmii_other: 'Saat gecikmesi: saat veriden 1,5–2,0 ns sonra gelmeli. RGMII 1.3 bunu uzatılmış PCB iziyle yapar; RGMII-ID (v2.0) MAC veya PHY içinde ≥ 1,2 ns ekler (DP83867: 0,25 ns adımlarla ayarlanır), böylece kartta yalnızca uzunlukları eşlemek yeter.',
    if_ddr3_signal: '800–1600 MT/s (isteğe bağlı 1866/2133), 1,5 V (DDR3L 1,35 V). Bayt şeridi: 8 DQ + DM + DQS çifti, noktadan noktaya.',
    if_ddr3_data_z: 'AMD UG583: ana kartta DQ 39 Ω, DQS 76 Ω diferansiyel (çıkış bölgesinde 50 / 86 Ω). TI KeyStone: 50 Ω / 100 Ω ±%5. Micron: 40 Ω hat.',
    if_ddr3_data_group: 'TI KeyStone: bayttaki tüm hatlar ±10 mil, DQS P/N ±1 mil içinde.',
    if_ddr3_data_length: '≤ 7,0 in (178 mm) (AMD UG583).',
    if_ddr3_data_vias: 'Hat başına ≤ 2 via, bayttaki her hatta aynı sayıda; bir baytın tamamını tek katmanda yönlendirin.',
    if_ddr3_data_spacing: 'AMD UG583, ana kart: bayt içinde 8 mil, baytlar arası ve DQ–DQS arası 20 mil, diğer gruplara 30 mil.',
    if_ddr3_plane: 'Kesintisiz GND referansı (TI); Micron VSSQ veya VDDQ’ya da izin verir. VREF = VDDQ/2, %1’lik bölücüyle; gürültü ±%2 içinde.',
    if_ddr3_data_term: 'Kartta direnç yok: kalıp içi sonlandırma (ODT), RTT_NOM 20/30/40/60/120 Ω, RTT_WR 60/120 Ω.',
    if_ddr_time: 'Uzunluğu değil gecikmeyi (ps) eşleyin: via ve kılıf (kalıptan bilyeye) gecikmelerini de katın (NXP). AMD UG583 dönüşümde 169,5 ps/in kullanır.',
    if_ddr_clock_signal: 'Diferansiyel saat (CK_t/CK_c); adres/komut grubuyla birlikte fly-by (zincir) sırasıyla yönlendirilir.',
    if_ddr3_clock_z: 'TI KeyStone: 100 Ω ±%5. AMD UG583: ana kartta 76 Ω (çıkış bölgesinde 86 Ω).',
    if_ddr3_clock_skew: 'TI KeyStone: CK P/N ±1 mil içinde.',
    if_ddr_wl: 'Her yongada DQS, CK’ye göre −149 … +1796 ps aralığında gelebilir; yazma seviyeleme (write leveling) fly-by gecikmesini telafi eder (AMD UG583).',
    if_ddr45_wl: 'DQS → CK: bileşenlerde −149 … +1796 ps (yazma seviyeleme), DIMM’de ±150 ps (AMD UG583/UG863).',
    if_ddr3_clock_vias: '≤ 7 via (AMD UG583). Her SDRAM’e fly-by saplaması < 40 mil (TI).',
    if_ddr3_clock_term: 'Fly-by sonunda: her bacak 39,2 Ω ile ortak düğüme, oradan bir kondansatörle VDDQ’ya (TI KeyStone).',
    if_ddr_addr_signal: 'Adres, komut ve kontrol; tek uçlu, denetleyiciden her yongadan geçerek sonlandırmaya giden fly-by hattı.',
    if_ddr3_addr_group: 'Her SDRAM’de her adres/komut hattı CK’ye göre ±20 mil içinde (TI KeyStone).',
    if_ddr3_addr_length: '1 yongada 6,15 in’den 9 yongada 12,15 in’e kadar, kılıf gecikmesi dahil (AMD UG583).',
    if_ddr3_addr_vias: 'Fly-by saplamaları < 80 mil ve ±10 mil içinde eşli; eşlenen segmentlerde aynı via sayısı (TI).',
    if_ddr3_addr_plane: 'GND veya kesintisiz bir 1,5 V (DVDD15) düzlemi (TI).',
    if_ddr3_addr_term: 'Fly-by sonunda 39,2 Ω ile VTT = 0,75 V’a; VTT akım çekebilen (sink) bir regülatörden (TI).',
    if_ddr4_signal: '1600–3200 MT/s, VDD = VDDQ = 1,2 V; VDDQ’ya sonlandırılan sözde açık akaçlı (POD) G/Ç. VREFDQ DRAM içinde üretilir.',
    if_ddr4_data_z: 'AMD UG583: 39 Ω / DQS 76 Ω (ana kart); AMD UG863: 50 Ω / 90 Ω; TI AM62x: 40 Ω / 80 Ω; NXP i.MX 8M Plus: DQS 85 Ω. Hepsi ±%10.',
    if_ddr4_data_skew: 'TI AM62x: DQS P/N 0,4 ps.',
    if_ddr4_data_length: '≤ 6,0 in (152 mm) (AMD UG583); TI AM62x: bayt başına ≤ 500 ps.',
    if_ddr4_data_vias: 'Sinyal başına 2 via, bayttaki her hatta aynı sayıda (AMD UG863, TI).',
    if_ddr4_data_spacing: 'TI: bayt içinde merkezden merkeze ≥ 3w, diğerlerine 4w. AMD UG863: bayt içinde 2H, diğer baytlara 5H (H = GND düzlemine yükseklik).',
    if_ddr45_plane: 'DDR bölgesinde düzlem kesintisi olmasın; düzlem kenarından ≥ 30 mil uzak durun; her katman geçişinin 50 mil yakınına GND dikiş via’sı, referans gerilimi değişiyorsa 300 mil içinde 0,1 µF (AMD UG863).',
    if_ddr4_data_term: 'Yalnızca ODT: RTT = RZQ/1 … RZQ/7, RZQ = 240 Ω ile 240 … 34 Ω. Kartta direnç yok.',
    if_ddr4_clock_z: 'TI AM62x: 80 Ω; AMD UG583: 76 Ω (ana kart); AMD UG863: 90 Ω. Hepsi ±%10.',
    if_ddr4_clock_vias: '≤ 7 via (AMD UG583); AMD UG863: 2 × (yonga sayısı) + 2.',
    if_ddr4_clock_plane: 'Kesintisiz bir VSS düzleminin yanında yönlendirin (TI).',
    if_ddr4_clock_term: 'Fly-by sonunda VDDQ’ya AC sonlandırma, Rcp = Z0 ±1 Ω (TI AM62x).',
    if_ddr4_addr_group: 'AMD UG863: CA → CK −34 … −50 ps (CK her zaman en uzun hat); TI AM62x: toplam kayma 4 ps.',
    if_ddr4_addr_length: 'AMD UG583: 1 yongada 7,15 in’den 9 yongada 13,15 in’e; AMD UG863: ≤ 11 000 mil; TI AM62x segmentleri: A1+A2 ≤ 500 ps, A3 ≤ 125 ps, AT ≤ 75 ps.',
    if_ddr4_addr_vias: 'TI AM62x: iz başına ≤ 3 via; AMD UG863: 2 × (yonga sayısı) + 2.',
    if_ddr4_addr_plane: 'VSS veya VDDQ referansı kullanılabilir (TI).',
    if_ddr4_addr_term: 'Uzak uçta 39 Ω ile VTT’ye (AMD UG863); TI: Rtt = Z0 ±5 Ω. VTT’de her 4 direnç için bir 0,1 µF (UG863).',
    if_ddr5_signal: 'Çıkışta 4800–6400 MT/s, öngörülen 8800 MT/s’ye kadar; VDD = VDDQ = 1,1 V, VPP = 1,8 V; 1,1 V POD G/Ç, VREF kalıp içinde üretilir.',
    if_ddr5_data_length: 'Bileşenlere ≤ 5000 mil (127 mm), DIMM’e ≤ 4000 mil (102 mm) (AMD UG863).',
    if_ddr5_data_vias: 'Sinyal başına 2 via; kör (blind) veya geri delinmiş via önerilir.',
    if_ddr5_data_spacing: 'Bayt içinde 2,5H, diğerlerine 5H (H = GND düzlemine yükseklik).',
    if_ddr5_data_term: 'Kalıp içi sonlandırma 40 Ω; kartta direnç yok.',
    if_ddr5_clock_vias: '2 × (yonga sayısı) + 2.',
    if_ddr5_clock_term: 'Kalıp içinde (ODT 40 Ω); harici direnç yok.',
    if_ddr5_addr_length: '≤ 10 000 mil (254 mm).',
    if_ddr5_addr_spacing: 'Diğer CA hatlarına 2H, diğer gruplara 5H.',
    if_ddr5_addr_term: 'Kalıp içi CA sonlandırması 40 Ω. CA_ODT pini fly-by üzerindeki son yonga dışında her yongada GND’ye, sonuncuda VDDQ’ya bağlanır.',
    if_can_signal: 'Diferansiyel CANH/CANL. Klasik CAN: 40 m’de 1 Mbit/s, 100 m’de 500 kbit/s, 500 m’de 100 kbit/s, 1000 m’de 50 kbit/s. CAN FD veri fazı 5 Mbit/s’ye, basit ağlarda 8 Mbit/s’ye kadar (ISO 11898-2:2016).',
    if_can_z: 'Bükümlü çift kablo, nominal 120 Ω.',
    if_can_length: 'Saplamalar 1 Mbit/s’de ≤ 0,3 m (ISO 11898); pratik kural: kritik uzunluğun ≤ 1/3’ü (50 ns kenar için 1,67 m).',
    if_can_term: 'Yalnızca veriyolunun iki ucunda 120 Ω; her düğüme konmaz. Bölünmüş sonlandırma: 2 × 60 Ω (±%1), orta noktadan tipik 4,7 nF ile GND’ye.',
    if_can_esd: 'TVS ve filtre konektöre yakın; isteğe bağlı CAN ortak mod bobini.',
    if_rs485_signal: 'Diferansiyel A/B, yarı veya tam çift yönlü. 12 m’de (40 ft) ≤ 10 Mbit/s, 1200 m’de (4000 ft) 100 kbit/s; pratik kural: uzunluk (m) × hız (bit/s) ≤ 10⁷. En fazla 32 birim yük (1 UL ≈ 12 kΩ).',
    if_rs485_z: 'Kablo Z0 = 120 Ω.',
    if_rs485_length: 'Saplama uzunluğu ≤ t_r · v · c / 10 (elektriksel uzunluk yükselme süresinin 1/10’undan kısa): %78 hızda 100 / 250 / 500 ns yükselme için ≈ 2 / 6 / 12 m (7 / 19 / 38 ft).',
    if_rs485_spacing: 'Kartta A ve B hatlarını birbirine yakın ve eşit aralıkta tutun.',
    if_rs485_term: 'Kablonun iki ucunda 120 Ω. Gürültülü ortamda: 2 × 60 Ω ve orta noktadan kondansatörle GND’ye (%1 dirençler).',
    if_rs485_other: 'Arıza emniyeti (fail-safe): alıcılar ±200 mV’ta anahtarlar; boşta veya açık hatta kutuplama dirençleri gerekir (TI örneği: 523 Ω kutuplama, 120 Ω sonlandırmayla).',
    if_i2c_signal: 'Açık akaçlı SDA/SCL, çekme dirençli. Standart mod 100 kbit/s, hızlı mod 400 kbit/s, hızlı mod artı 1 Mbit/s, yüksek hız 3,4 Mbit/s (ultra hızlı mod 5 Mbit/s).',
    if_i2c_z: 'Kontrollü empedans gerekmez: veriyolu toplu bir kapasitif yüktür; yükselme süresini kapasitans ve çekme direnci belirler.',
    if_i2c_other: 'Veriyolu kapasitansı Cb ≤ 400 pF (Sm/Fm), ≤ 550 pF (Fm+); yükselme süresi ≤ 1000 / 300 / 120 ns (Sm / Fm / Fm+).',
    if_i2c_term: 'Çekme direnci: Rp(maks) = tr / (0,8473 · Cb); Rp(min) = (VDD − VOL) / IOL, IOL = 3 mA (Sm/Fm) veya 20 mA (Fm+). Örnek: VDD = 5,5 V → Rp ≥ (5,5 − 0,4) V / 3 mA = 1,7 kΩ.',
    if_i2c_length: 'Kart veya şerit kabloda 10 cm’den uzun hatlarda sıra SDA, VDD, VSS, SCL (ya da SDA, VSS, SCL) olsun; GND/VDD düzlemi olan kartta bunlara gerek yoktur.',
    if_spi_signal: 'İtme-çekme saat (SCLK) ve veri (MOSI/MISO) hatları ile seçim hatları. SPI için bir yerleşim standardı yoktur; yonganın veri sayfasına uyun. Aşağıdaki değerler TI CC3135 örneğidir.',
    if_spi_z: 'İz, yükselme süresine göre uzunsa 50 Ω hat gibi ele alın (TI CC3135).',
    if_spi_term: 'Her sürücünün yakınına 27–36 Ω seri direnç: SCLK/MOSI denetleyicide, MISO çevre biriminde.',
    if_spi_length: 'Hattı yükselme süresinin 1/10’undan kısa tutun, saplama bırakmayın, izlerin altında kesintisiz GND referansı olsun.',
    if_g_tune: 'Uzunluk ayarını (serpantin) uyumsuzluğun oluştuğu uca olabildiğince yakın koyun (TI SPRAAR7J §2.3, SNLA426 §14).',
    if_g_plane: 'Kesintisiz GND düzlemi üzerinden geçin; yarık veya boşluk üzerinden geçmeyin; boşluklardan ≥ 1,5 × iz genişliği, düzlem kenarından 90 mil uzak durun. Referans katmanı değişiyorsa sinyal via’larının 200 mil (≈ 5 mm) yakınına GND dikiş via’sı koyun.',
    if_g_bend: 'Kıvrımdan kaçının; gerekirse her kıvrım > 135° olsun (90° köşe yok). Diğer çiftlere ≥ 5W, diğer sinyallere ≥ 30 mil, saat ve periyodik sinyallere ≥ 50 mil.',
    if_g_via: 'P ve N’de eşit sayıda ve eşit aralıklı via. Via saplaması < 15 mil, daha uzunsa geri delin; her katmanda anti-pad ≈ 30 mil; işlevsiz pad bırakmayın.',
    if_g_smd: 'Test noktası ve saplama yok. Seri parçalar (AC kondansatörü, ortak mod filtresi) 0402 veya daha küçük (en fazla 0603), simetrik; pad’lerin altında referans düzlemi boşaltılır.',
    if_g_weave: 'Cam elyaf kayması: çizimi elyafa göre 10–35° döndürün ya da çiftleri açılı / zikzak yönlendirin; daha sık ve düzgün dokulu cam stili seçin.',
  },
  en: {
    if_secIface: 'Interface',
    if_iface: 'Interface',
    if_gen: 'PCIe generation',
    if_grp: 'Signal group',
    if_grp_data: 'Data / DQS',
    if_grp_clock: 'Clock (CK)',
    if_grp_addr: 'Address / cmd',
    if_eth: 'Board section',
    if_ethInfo: 'MDI: the differential pairs between the PHY and the RJ45, including the magnetics. RGMII: the single-ended parallel interface between the MAC (processor) and the PHY.',
    if_eth_mdi: 'MDI (RJ45 side)',
    if_eth_rgmii: 'RGMII (MAC–PHY)',
    if_opt_usb2: 'USB 2.0 High-Speed',
    if_opt_usb3: 'USB 3.x SuperSpeed (5/10/20 Gbit/s)',
    if_opt_pcie: 'PCI Express (Gen1–Gen5)',
    if_opt_sata: 'SATA',
    if_opt_hdmi: 'HDMI (TMDS)',
    if_opt_mipi: 'MIPI D-PHY (CSI-2 / DSI)',
    if_opt_lvds: 'LVDS',
    if_opt_eth: 'Ethernet 10/100/1000BASE-T',
    if_opt_ddr3: 'DDR3',
    if_opt_ddr4: 'DDR4',
    if_opt_ddr5: 'DDR5',
    if_opt_can: 'CAN / CAN FD',
    if_opt_rs485: 'RS-485',
    if_opt_i2c: 'I²C (short note)',
    if_opt_spi: 'SPI (short note)',
    if_secBoard: 'Your board',
    if_st: 'Trace structure',
    if_stInfo: 'Microstrip: an outer-layer trace over a plane. Stripline: an inner-layer trace between two planes; εeff = εr. If you know εeff from the impedance calculator, choose “Known εeff”.',
    if_st_microstrip: 'Microstrip',
    if_st_stripline: 'Stripline',
    if_st_known: 'Known εeff',
    if_er: 'Dielectric constant (εr)',
    if_erEff: 'Effective dielectric constant (εeff)',
    if_erInfo: 'The fabricator’s design Dk at the operating frequency. FR-4 is typically 4.0–4.5.',
    if_secConv: 'Skew ⇄ length converter',
    if_x: 'Value to convert',
    if_xInfo: 'Enter ps to get the equivalent length mismatch, or mm / mil to get the equivalent skew; the result is checked against the interface limit. Leave empty to convert the interface limit.',
    if_hZdiff: 'Differential impedance',
    if_hZse: 'Single-ended impedance',
    if_hZnone: 'Impedance',
    if_hPair: 'Max intra-pair skew',
    if_hGroup: 'Group matching limit',
    if_hRate: 'Data rate',
    if_zNoneShort: 'no controlled impedance needed',
    if_rateSub_can: 'classic CAN (40 m) / CAN FD data phase',
    if_rateSub_rs485: 'at 12 m; length (m) × rate (bit/s) ≤ 10⁷',
    if_rateSub_i2c: 'Sm / Fm / Fm+ / Hs',
    if_vendors: 'across sources {r}',
    if_kDiff: 'differential',
    if_kSe: 'single-ended',
    if_onBoard: '≈ {v} on this board',
    if_chkPass: '{name}: {lim}',
    if_yours: 'Your {v} → {conv}',
    if_open: 'Open in the impedance calculator',
    if_openSub: '{z} · {st}',
    if_rules: 'Layout rules',
    if_general: 'General high-speed rules (TI SPRAAR7J)',
    if_sources: 'Sources',
    if_accessed: 'accessed',
    if_conv: 'Delay and length on your board',
    if_erUsed: 'εeff used',
    if_tpd: 'Propagation delay',
    if_input: 'Your value',
    if_lim_pair: 'Intra-pair limit',
    if_lim_group: 'Group limit',
    if_ref_dqs: 'DQ/DM → DQS',
    if_ref_ck: 'address/command → CK',
    if_ref_dqsCk: 'DQS → CK',
    if_ref_clkLane: 'data lane → clock lane',
    if_ref_rgmiiClk: 'TXD/RXD and CTL among themselves',
    if_row_rate: 'Data rate',
    if_row_signal: 'Signalling',
    if_row_z: 'Impedance',
    if_row_skew: 'Intra-pair skew',
    if_row_group: 'Inter-pair / group matching',
    if_row_length: 'Length and loss',
    if_row_vias: 'Vias and stubs',
    if_row_spacing: 'Spacing',
    if_row_plane: 'Reference plane',
    if_row_ac: 'AC coupling capacitor',
    if_row_term: 'Termination',
    if_row_esd: 'ESD and common-mode choke',
    if_row_other: 'Notes',
    if_row_g_tune: 'Length tuning',
    if_row_g_plane: 'Reference plane',
    if_row_g_bend: 'Bends and spacing',
    if_row_g_via: 'Vias',
    if_row_g_smd: 'Series parts',
    if_row_g_weave: 'Glass weave',
    if_note: 'In stripline the field is entirely inside the dielectric, so εeff = εr. For microstrip the IPC-2141A approximation is used; the real εeff depends on trace width and dielectric height (the Hammerstad–Jensen model in the impedance calculator gives a higher value for typical traces). For an exact result take εeff from the impedance calculator and choose “Known εeff”.',
    if_disclaimer: 'Values are taken from the named standards and vendor layout guides (accessed 2026-11-25). Vendors differ; your chip’s layout guide and the interface specification always take precedence.',
    if_dgAria: 'Differential pair top view: a bend makes the outer line longer by ΔL; a serpentine on the shorter line, close to the bend, removes the skew Δt seen at the receiver.',
    if_dgSource: 'source: bend · outer line +ΔL',
    if_dgTune: 'serpentine near the source',
    if_dgRx: 'at the receiver (untuned)',
    if_dgLimit: 'limit',
    if_dgOk: 'within the limit',
    if_dgBad: 'over the limit',
    if_dgExample: 'example: right at the limit',
    if_dgGroupAria: 'Group matching: every line must reach the receiver within ± the window around the reference (strobe or clock); shorter lines get serpentines.',
    if_dgShort: 'serpentines on shorter lines',
    if_dgArrival: 'arrival at the receiver',
    if_dgYours: 'yours',
    if_dgBusAria: 'Bus termination: 120 Ω only at the two cable ends; nodes in between connect through short stubs.',
    if_dgNode: 'Node',
    if_dgEnds: '120 Ω at both ends only',
    if_dgStub: 'stub',
    if_dgI2cAria: 'I²C bus: open-drain lines, pull-up resistors to VDD and the total bus capacitance.',
    if_dgDev: 'Device',
    if_dgSpiAria: 'SPI: series resistors go at the driving end of each line.',
    if_dgNear: 'Rs near the driver',
    if_dgPeriph: 'Target',
    if_zSub_spi: 'only for long lines (TI CC3135)',
    if_dgMean: 'mean',
    if_dgTotal: 'total spread',
    if_imp_microstrip: 'microstrip',
    if_imp_stripline: 'stripline',
    if_imp_diffMicrostrip: 'differential microstrip',
    if_imp_diffStripline: 'differential stripline',
    if_usb2_signal: 'One half-duplex pair (D+/D−), 480 Mbit/s in High-Speed mode. The PHY terminates each line with 45 Ω to GND; the HS high level is 360–440 mV.',
    if_usb2_z: 'The USB 2.0 specification gives 90 Ω ±15 %; SoC guides (TI, Renesas, NXP) ask for ±10 %.',
    if_usb2_skew: 'Renesas RZ/A2M: D+/D− length difference ≤ 2 mm.',
    if_usb2_length: 'Keep it short: Renesas allows ≤ 3 ns (≈ 300 mm) on a host and ≤ 1 ns (≈ 100 mm) on a device, assuming 100 ps/cm.',
    if_usb2_vias: 'TI: at most 4 vias per trace; no stubs, no test points. Renesas: route on one layer with no vias or branches.',
    if_usb2_spacing: '≥ 50 mil (1.27 mm) to clocks and periodic signals, ≥ 30 mil (0.76 mm) to any other signal.',
    if_usb2_ac: 'None: HS signalling is DC-coupled (45 Ω to GND at both ends).',
    if_usb2_esd: 'ESD diode < 4 pF, as close to the connector as possible. Order: PHY → optional common-mode choke → ESD → connector. With a through-hole receptacle, connect on the bottom layer so the pin does not act as a stub.',
    if_usb3_signal: 'Per lane one TX and one RX pair, AC-coupled: Gen 1 5 Gbit/s, Gen 2 10 Gbit/s; Gen 2x2 uses two lanes (20 Gbit/s). A USB 2.0 pair (D+/D−) runs alongside.',
    if_usb3_z: 'Vendors differ: TI AM57xx 90 Ω ±7 %, TI TUSB1002A 90 Ω ±15 %, TI AM64x 95 Ω ±5 %, NXP 90 Ω ±10 %.',
    if_usb3_skew: 'TI TUSB1002A asks for ≤ 2 mil. Put the serpentine at the end where the mismatch is created.',
    if_usb3_group: 'TX and RX pairs do not need to match each other.',
    if_usb3_length: 'Device-specific: e.g. TI AM57xx ≤ 3500 mil (89 mm), KeyStone II and AM64x ≤ 5500 mil (140 mm). The channel loss limit is in the USB specification.',
    if_usb3_vias: '≤ 2 vias per trace, the same count on both lines. Via stubs < 15 mil (0.38 mm); back-drill longer stubs.',
    if_usb3_ac: 'On the TX pair: 75–265 nF (220 nF typical). 0402 or smaller (0603 max), side by side and symmetric; void the reference plane under the pads at least 2 layers deep.',
    if_usb3_esd: 'ESD < 0.5 pF at 5 Gbit/s and < 0.3 pF at 10 Gbit/s per lane, ≤ 0.6 in (15 mm) from the receptacle. Flow-through ESD packages with a 60 % void under their pads; AC caps on the protected side of the common-mode filter.',
    if_pcie_gen1_signal: '2.5 GT/s per lane, 8b/10b encoding. One TX and one RX pair per lane, AC-coupled; 100 MHz differential reference clock.',
    if_pcie_gen2_signal: '5 GT/s per lane, 8b/10b encoding. One TX and one RX pair per lane, AC-coupled; 100 MHz differential reference clock.',
    if_pcie_gen3_signal: '8 GT/s per lane, 128b/130b encoding, TX and RX equalization (link training). One TX and one RX pair per lane, AC-coupled.',
    if_pcie_gen4_signal: '16 GT/s per lane, 128b/130b encoding, TX and RX equalization. One TX and one RX pair per lane, AC-coupled.',
    if_pcie_gen5_signal: '32 GT/s per lane, 128b/130b encoding, NRZ; 20/80 rise time ≈ 12 ps. One TX and one RX pair per lane, AC-coupled.',
    if_pcie_g12_z: 'TI AM57xx / KeyStone II: 100 Ω ±10 % differential, 60 Ω ±15 % single-ended.',
    if_pcie_g3p_z: 'The specification allows 70–100 Ω; add-in cards must be 85 Ω so that they work in any slot (TI SNLA426). NXP i.MX 8M Plus: 85 Ω ±10 %.',
    if_pcie_skew: 'PCIe CEM 2.0: < 5 mil on add-in cards, < 10 mil on system boards. Compensate right at the beginning of the segment where the mismatch occurs.',
    if_pcie_group: 'Lane-to-lane matching is not required (each lane carries its own clock); typically up to 1 in of difference, < 6 in recommended (TI). TX and RX pairs need not match. Device limits apply, e.g. TI AM64x: RX lanes ≤ 6 ns, TX lanes ≤ 1.5 ns.',
    if_pcie_g12_length: 'Device-specific: e.g. TI AM57xx ≤ 4700 mil (119 mm), KeyStone II ≤ 5500 mil (140 mm).',
    if_pcie_gen3_length: 'Total channel budget ≈ 22–23.5 dB (Astera, TI). TI’s example: CPU package 3.5 dB, 9 in of high-loss system-board trace 13 dB, CEM connector 0.5 dB, 4 in add-in card 6.5 dB.',
    if_pcie_gen4_length: 'Total channel budget ≈ 28 dB. TI’s example: package 5 dB, 9 in system-board trace 14 dB, connector 0.5 dB, add-in card 8.5 dB; crosstalk margin < 2 dB.',
    if_pcie_gen5_length: 'Total channel budget ≈ 36 dB (Nyquist 16 GHz). TI’s example: package 9 dB, 9 in system-board trace 16 dB, connector 1.5 dB, add-in card 9.5 dB; keep 4–5 dB for crosstalk and 2–3 dB for temperature/humidity.',
    if_pcie_g13_vias: 'Equal via count on P and N, as close to the device as possible. Via stubs < 15 mil (0.38 mm); back-drill longer stubs.',
    if_pcie_g45_vias: 'Back-drill connector and signal vias (TI SN75LVPE5421). Gen5 edges need ≈ 29 GHz of bandwidth: an un-drilled stub must stay below ≈ 51 mil on FR-4 (≈ 54 mil on Megtron 6); TI still recommends back-drilling stubs longer than 15 mil. Use many GND stitching vias around each anti-pad.',
    if_pcie_g12_ac: '75–200 nF (Microchip PolarFire, Gen1/Gen2; close to the transmitter). Qualcomm lists 75–265 nF for Gen2.',
    if_pcie_g3_ac: '176–265 nF, 220 nF typical, one in each line of every TX pair. Qualcomm: near the source or the receiver, P and N capacitors side by side, not staggered.',
    if_pcie_g45_ac: '220 nF typical (TI), 0402 max, GND void under the pads. Chip to chip: close to the RX; to a CEM slot or edge finger: close to the connector (TI SNLA426).',
    if_pcie_term: 'On-chip; enabled after receiver detection. No external resistors.',
    if_pcie_other: 'Reference clock: 100 MHz, 100 Ω differential target (TI SNLA426; NXP i.MX 8M Plus uses 85 Ω ±10 %). For Gen5 the random jitter must stay ≤ 200 fs RMS.',
    if_sata_signal: 'One TX and one RX pair, AC-coupled; 1.5 / 3 / 6 Gbit/s.',
    if_sata_length: 'Device-specific: TI AM57xx ≤ 3500 mil (89 mm); TI C6748 ≤ 7000 mil (178 mm) from device to connector.',
    if_sata_vias: 'TI AM57xx: no vias; TI C6748: at most 3, always in pairs. No stubs.',
    if_sata_ac: '10 nF typical, 12 nF max (SATA specification, TI SN75LVPE801); TI C6748: 0.3 / 10 / 12 nF min/typ/max, 0603 max.',
    if_hdmi_signal: 'TMDS: three data pairs and one clock pair, DC-coupled current-mode signalling; the sink terminates each line with 50 Ω to 3.3 V. HDMI 1.4: up to 3.4 Gbit/s per lane (340 MHz clock); HDMI 2.0: up to 6 Gbit/s.',
    if_hdmi_z: 'HDMI specification: 100 Ω ±15 %. TI AM57xx and NXP ask for ±10 %.',
    if_hdmi_skew: 'Specification: ≤ 0.15·Tbit at the source (66 ps at a 225 MHz TMDS clock), ≤ 0.4·Tbit at the sink.',
    if_hdmi_group: 'Pair to pair: ≤ 0.2·Tcharacter at the source (888 ps at 225 MHz), ≤ 0.2·Tcharacter + 1.78 ns at the sink.',
    if_hdmi_length: 'TI AM57xx: ≤ 4000 mil (102 mm), no vias, no stubs.',
    if_hdmi_ac: 'None: TMDS is DC-coupled to the sink’s 50 Ω pull-ups.',
    if_hdmi_esd: 'Ultra-low-capacitance ESD clamps (e.g. TI TPD12S016) rated IEC 61000-4-2 level 4, as close to the connector as possible.',
    if_mipi_signal: 'High-speed differential data lanes plus a clock lane; the same wires also carry single-ended low-power (LP) signalling. Per lane: v1.1 1.5 Gbit/s, v1.2 2.5 Gbit/s, v2.x 4.5 Gbit/s.',
    if_mipi_z: 'TI: 100 Ω ±15 % differential, 50 Ω single-ended; keep the pairs loosely coupled because of LP mode. NXP i.MX 8M Plus: 100 Ω ±10 %.',
    if_mipi_skew: 'Must meet the D-PHY mode-conversion S-parameters; TI estimates UI/50 (8 ps at 2.5 Gbit/s). NXP i.MX 8M Plus: within 1 ps.',
    if_mipi_group: 'Data lanes to the clock lane: ≤ 0.1·UI, i.e. 40 ps at 2.5 Gbit/s (TI).',
    if_mipi_length: '≤ 10 in (254 mm) as a conservative limit (TI); ≤ 2 vias per trace.',
    if_mipi_other: 'DSI on NXP i.MX 8M Plus: ≤ 10 pF per data trace for the compliance tests, total load ≤ 60 pF.',
    if_lvds_signal: 'Current loop: 3.5 mA into 100 Ω gives ≈ 350 mV; receiver threshold ≤ 100 mV; common-mode range 0–2.4 V. Used from tens of Mbit/s up to ≈ 3 Gbit/s.',
    if_lvds_z: 'Choose the termination resistor equal to the line’s differential impedance.',
    if_lvds_skew: 'TI: keep the differential skew within ±30 ps by matching the lengths within 5 mm; match the electrical lengths of both lines.',
    if_lvds_vias: 'Stubs < 10 mm (TI DS90LV028A).',
    if_lvds_term: 'One 100 Ω resistor across the pair (90–130 Ω, 1–2 % SMT), < 10 mm (12 mm max) from the receiver input.',
    if_eth_mdi_signal: '10/100BASE-TX uses two pairs, 1000BASE-T all four pairs in both directions. MDI: PHY ↔ magnetics ↔ RJ45.',
    if_eth_mdi_z: 'If the cable datasheet gives an impedance, adjust to it.',
    if_eth_mdi_skew: 'For 10/100 Mbit/s 50 mil is enough.',
    if_eth_mdi_length: 'Keep the whole MDI route < 2 in (51 mm).',
    if_eth_mdi_vias: 'As few as possible; route each pair on one layer.',
    if_eth_mdi_spacing: '≥ 30 mil (0.76 mm) between different pairs; same-layer GND pour ≥ 3w away (5w preferred).',
    if_eth_mdi_plane: 'No copper under the magnetics on any layer (an RJ45 with integrated magnetics is the exception). Void the planes under parts on the pairs (2 layers; all layers in automotive). Chassis ground: an isolated island with ≥ 20 mil keep-out, tied to GND through a capacitor and ≥ 1 MΩ.',
    if_eth_mdi_term: 'Bob Smith termination on the cable side: 75 Ω from each centre tap, joined through 1000 pF (≥ 2 kV) to chassis; not used with PoE. PHY side: each centre tap to GND through its own 0.1 µF (DP83867).',
    if_eth_mdi_esd: 'Place ESD on the PHY side of the magnetics; the connector side sees large common-mode swings.',
    if_eth_rgmii_signal: '4 data lines + 1 control line per direction, double data rate; TXC/RXC 125 MHz at 1 Gbit/s (25 / 2.5 MHz at 100 / 10 Mbit/s).',
    if_eth_rgmii_group: 'TXD[3:0] and TX_CTL (likewise RXD and RX_CTL) among themselves < 11 ps ≈ 60 mil on FR-4 (DP83867); TI checklist: within 20 mil at 1 Gbit/s. AMD Versal: data/CTL to clock within 50 ps when the PHY adds the delay.',
    if_eth_rgmii_length: '< 2 in (51 mm) recommended, 6 in (152 mm) maximum.',
    if_eth_rgmii_term: '≈ 30 Ω series resistor on TX_CLK near the MAC and on RX_CLK near the PHY; confirm by simulation (AMD Versal).',
    if_eth_rgmii_other: 'Clock delay: the clock must arrive 1.5–2.0 ns after the data. RGMII 1.3 does this with a longer PCB trace; RGMII-ID (v2.0) adds ≥ 1.2 ns inside the MAC or PHY (DP83867: adjustable in 0.25 ns steps), so the board only needs matched lengths.',
    if_ddr3_signal: '800–1600 MT/s (1866/2133 optional), 1.5 V (DDR3L 1.35 V). A byte lane is 8 DQ + DM + the DQS pair, routed point to point.',
    if_ddr3_data_z: 'AMD UG583: DQ 39 Ω, DQS 76 Ω differential on the main PCB (50 / 86 Ω in the breakout). TI KeyStone: 50 Ω / 100 Ω ±5 %. Micron: 40 Ω line.',
    if_ddr3_data_group: 'TI KeyStone: all nets of a byte within ±10 mil, DQS P/N within ±1 mil.',
    if_ddr3_data_length: '≤ 7.0 in (178 mm) (AMD UG583).',
    if_ddr3_data_vias: '≤ 2 vias per net and the same count on every net of the byte; route a whole byte on one layer.',
    if_ddr3_data_spacing: 'AMD UG583, main PCB: 8 mil inside a byte, 20 mil byte to byte and DQ to DQS, 30 mil to other groups.',
    if_ddr3_plane: 'Solid GND reference (TI); Micron also allows VSSQ or VDDQ. VREF = VDDQ/2 from a 1 % divider, noise within ±2 %.',
    if_ddr3_data_term: 'No resistors on the PCB: on-die termination (ODT), RTT_NOM 20/30/40/60/120 Ω, RTT_WR 60/120 Ω.',
    if_ddr_time: 'Match delay (ps), not length: include via and package (die-to-ball) delays (NXP). AMD UG583 converts with 169.5 ps/in.',
    if_ddr_clock_signal: 'Differential clock (CK_t/CK_c), routed in fly-by order together with the address/command group.',
    if_ddr3_clock_z: 'TI KeyStone: 100 Ω ±5 %. AMD UG583: 76 Ω on the main PCB (86 Ω in the breakout).',
    if_ddr3_clock_skew: 'TI KeyStone: CK P/N within ±1 mil.',
    if_ddr_wl: 'At each device DQS may arrive −149 … +1796 ps relative to CK; write leveling absorbs the fly-by delay (AMD UG583).',
    if_ddr45_wl: 'DQS to CK: −149 … +1796 ps for components (write leveling), ±150 ps for DIMMs (AMD UG583/UG863).',
    if_ddr3_clock_vias: '≤ 7 vias (AMD UG583). Fly-by stubs to each SDRAM < 40 mil (TI).',
    if_ddr3_clock_term: 'At the end of the fly-by: each leg 39.2 Ω to a common node, then a capacitor to VDDQ (TI KeyStone).',
    if_ddr_addr_signal: 'Address, command and control; single-ended, fly-by from the controller past every device to the termination.',
    if_ddr3_addr_group: 'At every SDRAM each address/command net within ±20 mil of CK (TI KeyStone).',
    if_ddr3_addr_length: '6.15 in (1 device) to 12.15 in (9 devices), package delay included (AMD UG583).',
    if_ddr3_addr_vias: 'Fly-by stubs < 80 mil, matched within ±10 mil; same via count on matched segments (TI).',
    if_ddr3_addr_plane: 'GND or a solid 1.5 V (DVDD15) plane (TI).',
    if_ddr3_addr_term: '39.2 Ω to VTT = 0.75 V at the end of the fly-by; VTT from a regulator that can sink current (TI).',
    if_ddr4_signal: '1600–3200 MT/s, VDD = VDDQ = 1.2 V; pseudo-open-drain (POD) I/O terminated to VDDQ. VREFDQ is generated inside the DRAM.',
    if_ddr4_data_z: 'AMD UG583: 39 Ω / DQS 76 Ω (main PCB); AMD UG863: 50 Ω / 90 Ω; TI AM62x: 40 Ω / 80 Ω; NXP i.MX 8M Plus: DQS 85 Ω. All ±10 %.',
    if_ddr4_data_skew: 'TI AM62x: DQS P/N 0.4 ps.',
    if_ddr4_data_length: '≤ 6.0 in (152 mm) (AMD UG583); TI AM62x: ≤ 500 ps per byte.',
    if_ddr4_data_vias: '2 vias per signal, the same count on every net of the byte (AMD UG863, TI).',
    if_ddr4_data_spacing: 'TI: ≥ 3w centre to centre inside a byte, 4w to others. AMD UG863: 2H inside the byte, 5H to other bytes (H = height above the GND plane).',
    if_ddr45_plane: 'No plane cuts in the DDR area; stay ≥ 30 mil from plane edges; a GND stitching via within 50 mil of each layer change, and 0.1 µF within 300 mil if the reference rail changes (AMD UG863).',
    if_ddr4_data_term: 'ODT only: RTT = RZQ/1 … RZQ/7, i.e. 240 … 34 Ω with RZQ = 240 Ω. No resistors on the PCB.',
    if_ddr4_clock_z: 'TI AM62x: 80 Ω; AMD UG583: 76 Ω (main PCB); AMD UG863: 90 Ω. All ±10 %.',
    if_ddr4_clock_vias: '≤ 7 vias (AMD UG583); AMD UG863: 2 × (number of devices) + 2.',
    if_ddr4_clock_plane: 'Route next to a solid VSS plane (TI).',
    if_ddr4_clock_term: 'AC termination to VDDQ at the end of the fly-by, Rcp = Z0 ±1 Ω (TI AM62x).',
    if_ddr4_addr_group: 'AMD UG863: CA to CK −34 … −50 ps (CK is always the longest); TI AM62x: total skew 4 ps.',
    if_ddr4_addr_length: 'AMD UG583: 7.15 in (1 device) to 13.15 in (9 devices); AMD UG863: ≤ 11 000 mil; TI AM62x segments: A1+A2 ≤ 500 ps, A3 ≤ 125 ps, AT ≤ 75 ps.',
    if_ddr4_addr_vias: 'TI AM62x: ≤ 3 vias per trace; AMD UG863: 2 × (number of devices) + 2.',
    if_ddr4_addr_plane: 'VSS or VDDQ reference allowed (TI).',
    if_ddr4_addr_term: '39 Ω to VTT at the far end (AMD UG863); TI: Rtt = Z0 ±5 Ω. One 0.1 µF on VTT per 4 resistors (UG863).',
    if_ddr5_signal: '4800–6400 MT/s at launch, up to 8800 MT/s projected; VDD = VDDQ = 1.1 V, VPP = 1.8 V; 1.1 V POD I/O, VREF generated on the die.',
    if_ddr5_data_length: '≤ 5000 mil (127 mm) to components, ≤ 4000 mil (102 mm) to DIMMs (AMD UG863).',
    if_ddr5_data_vias: '2 vias per signal; blind or back-drilled vias recommended.',
    if_ddr5_data_spacing: '2.5H inside the byte, 5H to others (H = height above the GND plane).',
    if_ddr5_data_term: 'On-die termination 40 Ω; no resistors on the PCB.',
    if_ddr5_clock_vias: '2 × (number of devices) + 2.',
    if_ddr5_clock_term: 'On-die (ODT 40 Ω); no external resistor.',
    if_ddr5_addr_length: '≤ 10 000 mil (254 mm).',
    if_ddr5_addr_spacing: '2H to other CA nets, 5H to other groups.',
    if_ddr5_addr_term: 'On-die CA termination 40 Ω. The CA_ODT pin goes to GND on every device except the last one on the fly-by, which goes to VDDQ.',
    if_can_signal: 'Differential CANH/CANL. Classic CAN: 1 Mbit/s at 40 m, 500 kbit/s at 100 m, 100 kbit/s at 500 m, 50 kbit/s at 1000 m. CAN FD data phase up to 5 Mbit/s, 8 Mbit/s in simple networks (ISO 11898-2:2016).',
    if_can_z: 'Twisted-pair cable, 120 Ω nominal.',
    if_can_length: 'Stubs ≤ 0.3 m at 1 Mbit/s (ISO 11898); rule of thumb: ≤ 1/3 of the critical length (1.67 m for a 50 ns edge).',
    if_can_term: '120 Ω only at the two ends of the bus, never on every node. Split termination: 2 × 60 Ω (±1 %) with typically 4.7 nF from the midpoint to GND.',
    if_can_esd: 'TVS and filtering close to the connector; an optional CAN common-mode choke.',
    if_rs485_signal: 'Differential A/B, half or full duplex. ≤ 10 Mbit/s at 12 m (40 ft), 100 kbit/s at 1200 m (4000 ft); rule of thumb: length (m) × rate (bit/s) ≤ 10⁷. Up to 32 unit loads (1 UL ≈ 12 kΩ).',
    if_rs485_z: 'Cable Z0 = 120 Ω.',
    if_rs485_length: 'Stub length ≤ t_r · v · c / 10 (electrical length shorter than 1/10 of the rise time): ≈ 2 / 6 / 12 m (7 / 19 / 38 ft) for 100 / 250 / 500 ns rise time at 78 % velocity.',
    if_rs485_spacing: 'On the board keep A and B close together and equidistant.',
    if_rs485_term: '120 Ω at both cable ends. In noisy environments: 2 × 60 Ω with a capacitor from the midpoint to GND (1 % resistors).',
    if_rs485_other: 'Fail-safe: receivers switch at ±200 mV; an idle or open bus needs bias resistors (TI example: 523 Ω bias with 120 Ω terminations).',
    if_i2c_signal: 'Open-drain SDA/SCL with pull-up resistors. Standard mode 100 kbit/s, Fast mode 400 kbit/s, Fast-mode Plus 1 Mbit/s, High-speed mode 3.4 Mbit/s (Ultra Fast-mode 5 Mbit/s).',
    if_i2c_z: 'No controlled impedance: the bus is a lumped capacitive load; its capacitance and the pull-ups set the rise time.',
    if_i2c_other: 'Bus capacitance Cb ≤ 400 pF (Sm/Fm), ≤ 550 pF (Fm+); rise time ≤ 1000 / 300 / 120 ns (Sm / Fm / Fm+).',
    if_i2c_term: 'Pull-up: Rp(max) = tr / (0.8473 · Cb); Rp(min) = (VDD − VOL) / IOL with IOL = 3 mA (Sm/Fm) or 20 mA (Fm+). Example: VDD = 5.5 V → Rp ≥ (5.5 − 0.4) V / 3 mA = 1.7 kΩ.',
    if_i2c_length: 'On a board or ribbon cable longer than 10 cm, order the lines SDA, VDD, VSS, SCL (or SDA, VSS, SCL); a board with GND/VDD planes does not need them.',
    if_spi_signal: 'Push-pull clock (SCLK) and data (MOSI/MISO) plus chip selects. There is no SPI layout standard; follow the device datasheet. The values below are TI’s CC3135 example.',
    if_spi_z: 'Treat the traces as 50 Ω lines when they are long compared with the rise time (TI CC3135).',
    if_spi_term: '27–36 Ω series resistor near each driver: SCLK/MOSI at the controller, MISO at the peripheral.',
    if_spi_length: 'Keep the line shorter than 1/10 of the rise time, avoid stubs, keep a continuous GND reference under the traces.',
    if_g_tune: 'Put the length tuning (serpentine) as close as possible to the end where the mismatch is created (TI SPRAAR7J §2.3, SNLA426 §14).',
    if_g_plane: 'Route over a solid GND plane; never cross a split or void; stay ≥ 1.5 × trace width from voids and 90 mil from the plane edge. When the reference layer changes, put GND stitching vias within 200 mil (≈ 5 mm) of the signal vias.',
    if_g_bend: 'Avoid bends; where needed keep each bend > 135° (no 90° corners). ≥ 5W to other pairs, ≥ 30 mil to other signals, ≥ 50 mil to clocks and periodic signals.',
    if_g_via: 'Equal via count on P and N, equally spaced. Via stubs < 15 mil, back-drill longer ones; anti-pad ≈ 30 mil on every layer; no non-functional pads.',
    if_g_smd: 'No test points or stubs. Series parts (AC caps, common-mode filter) 0402 or smaller (0603 max), placed symmetrically, with the reference plane voided under their pads.',
    if_g_weave: 'Glass-weave skew: rotate the artwork 10–35° against the weave or route the pairs at an angle / zig-zag; choose a tighter, more uniform glass style.',
  },
};

// ---------------------------------------------------------------------------
// Formatting helpers (labels only — never geometry)
// ---------------------------------------------------------------------------

const tr = () => getLang() === 'tr';
/** Number without grouping (MT/s, ps), decimal comma in Turkish. */
function num(n, sig = 3) {
  if (!Number.isFinite(n)) return '—';
  const a = Math.abs(n);
  const s = a >= 10 ** sig ? String(Math.round(n)) : String(Number(n.toPrecision(sig)));
  return tr() ? s.replace('.', ',') : s;
}
const pct = (n) => (tr() ? `%${num(n)}` : `${num(n)} %`);
const signed = (n, sig) => (n > 0 ? `+${num(n, sig)}` : num(n, sig));

function zText(z) {
  if (!z) return '';
  if (z.nom !== undefined) return `${num(z.nom)} Ω${z.tol ? ` ±${pct(z.tol)}` : ''}`;
  return `${num(z.range[0])}–${num(z.range[1])} Ω`;
}
const zRange = (z) => (z?.nom !== undefined && z.range ? t('if_vendors', { r: `${num(z.range[0])}–${num(z.range[1])} Ω` }) : '');

/** "1.27 mm · 50 mil" (metric first unless the user prefers imperial). */
function lenText(conv, sig = 3) {
  const mm = `${num(conv.mm, sig)} mm`;
  const mil = `${num(conv.mil, sig)} mil`;
  return isImperial() ? `${mil} · ${mm}` : `${mm} · ${mil}`;
}
const psText = (conv, sig = 3) => `${num(conv.ps, sig)} ps`;

/** Limit as stated by the source: "5 mil", "±10 ps", "−149 … +1796 ps". */
function limitText(l) {
  if (l.min !== undefined) return `${signed(l.min, 4)} … ${signed(l.max, 4)} ${l.unit}`;
  return `${l.pm ? '±' : ''}${num(l.value)} ${l.unit}`;
}
/** Same, with "≤" where the value is a maximum (for table rows). */
const limitRule = (l) => (l.min === undefined && !l.pm ? `≤ ${limitText(l)}` : limitText(l));
/** The limit in the other domain on this board. */
function limitOnBoard(l, tpd) {
  const c = limitIn(l, tpd);
  const pm = l.pm ? '±' : '';
  if (c.window) {
    return l.unit === 'ps'
      ? `${signed(c.min.mm)} … ${signed(c.max.mm, 4)} mm`
      : `${signed(c.min.ps)} … ${signed(c.max.ps, 4)} ps`;
  }
  return l.unit === 'ps' ? `${pm}${lenText(c.max)}` : `${pm}${psText(c.max)}`;
}
const limitName = (l) => (l.ref ? t(`if_ref_${l.ref}`) : t('if_lim_pair'));

/**
 * Heading HTML of a rule set. Product names are marked lang="en" so the
 * uppercase heading style does not turn "High" into "HİGH" in Turkish.
 */
function setTitleHtml(set) {
  const m = set.id.match(/^ddr(\d)_(\w+)$/);
  return m
    ? `<span lang="en">DDR${m[1]}</span> · ${esc(t(`if_grp_${m[2]}`))}`
    : `<span lang="en">${esc(set.name)}</span>`;
}

/** Keep numbers with their units on one line ("45 Ω", "2.5 GT/s"). */
const nb = (s) => s.replace(/(\d) (?=[A-Za-zΩµ°%])/g, '$1 ');

function rateText(rate) {
  if (!rate) return '';
  const v = rate.range ? `${num(rate.v[0], 4)}–${num(rate.v[1], 4)}` : rate.v.map((x) => num(x, 4)).join(' / ');
  return `${v} ${rate.unit}`;
}

// Example geometry of the impedance calculator (its EXAMPLES, mm) so the
// linked page opens with sensible values even for imperial users.
const IMP_GEOM = {
  microstrip: { h: 0.2 },
  stripline: { h: 0.5 },
  diffMicrostrip: { h: 0.2, s: 0.2 },
  diffStripline: { h: 0.5, s: 0.2 },
};

function impedanceLink(set, v) {
  if (!set.imp) return null;
  const strip = v.st === 'stripline';
  const st = set.imp.mode === 'diff' ? (strip ? 'diffStripline' : 'diffMicrostrip') : (strip ? 'stripline' : 'microstrip');
  const q = new URLSearchParams({ mode: 'synth', st, Z: String(set.imp.Z) });
  if (set.imp.tol) q.set('tol', String(set.imp.tol));
  for (const [k, val] of Object.entries(IMP_GEOM[st])) {
    q.set(k, String(val));
    q.set(`${k}_u`, 'mm');
  }
  if (v.st !== 'known' && Number.isFinite(v.er) && v.er >= 1) q.set('er', String(v.er));
  return { href: `#/impedance?${q}`, st, Z: set.imp.Z, tol: set.imp.tol };
}

const badges = (ids) => ids.filter((id) => SOURCES[id]).map((id) => `<span class="badge">${esc(SOURCES[id].short)}</span>`).join(' ');

// Styles for the rules card live in assets/app.css ("Interface rules").

// ---------------------------------------------------------------------------
// Rules card
// ---------------------------------------------------------------------------

function ruleRows(set, tpd) {
  const has = (k) => set.rows.find((r) => r.k === k);
  const out = [];
  const prose = (r) => (r ? `<span>${esc(nb(t(`if_${rowKey(set, r)}`)))}</span>` : '');
  for (const k of ['rate', ...ROW_KINDS]) {
    const r = has(k);
    let head = '';
    let src = r ? [...r.src] : [];
    if (k === 'rate') {
      if (!set.rate) continue;
      head = rateText(set.rate);
      src = set.rate.src;
    } else if (k === 'z') {
      if (set.z.none) {
        head = t('if_zNoneShort');
      } else {
        head = [set.z.diff && `${zText(set.z.diff)} ${t('if_kDiff')}`, set.z.se && `${zText(set.z.se)} ${t('if_kSe')}`].filter(Boolean).join(' · ');
        const vend = [set.z.diff, set.z.se].map(zRange).filter(Boolean);
        if (vend.length) head += ` (${vend.join('; ')})`;
        src = [...new Set([...(set.z.diff?.src ?? []), ...(set.z.se?.src ?? []), ...src])];
      }
    } else if (k === 'skew' || k === 'group') {
      const ls = set.limits.filter((l) => l.id === (k === 'skew' ? 'pair' : 'group'));
      if (!ls.length && !r) continue;
      head = ls.map((l) => `${l.ref ? `${limitName(l)}: ` : ''}${limitRule(l)} (≈ ${limitOnBoard(l, tpd)})`).join(' · ');
      src = [...new Set([...ls.flatMap((l) => l.src), ...src])];
    } else if (!r) {
      continue;
    }
    const body = [head && `<span class="if-v">${esc(nb(head))}</span>`, prose(k === 'rate' ? null : r)].filter(Boolean).join('<br>');
    out.push(`<tr><th scope="row">${esc(t(`if_row_${k}`))}</th><td>${body}<br>${badges(src)}</td></tr>`);
  }
  return table(out);
}

const table = (trs) => `<div class="ref"><div class="table-scroll"><table class="grid left if-rules"><tbody>${trs.join('')}</tbody></table></div></div>`;

function generalRows() {
  return table(GENERAL_HS.map((r) => `<tr><th scope="row">${esc(t(`if_row_${r.k}`))}</th><td><span>${esc(nb(t(`if_${r.k}`)))}</span><br>${badges(r.src)}</td></tr>`));
}

function sourceList(ids) {
  return `<ol class="if-src">${ids.map((id) => {
    const s = SOURCES[id];
    return `<li><b>${esc(s.short)}</b> — ${esc(s.org)}, “${esc(s.title)}”, ${esc(s.doc)}, ${esc(s.rev)}. <a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.url.replace(/^https?:\/\//, ''))}</a> (${esc(t('if_accessed'))} ${esc(s.accessed)})</li>`;
  }).join('')}</ol>`;
}

// ---------------------------------------------------------------------------
// Diagrams (geometry in plain numbers; formatted values only in labels)
// ---------------------------------------------------------------------------

const r1 = (n) => Math.round(n * 10) / 10;
const pts = (list) => list.map(([x, y]) => `${r1(x)},${r1(y)}`).join(' ');
const trace = (list, w = 4.5, cls = 'cutr') => `<polyline class="${cls}" style="stroke-width:${w};stroke-linejoin:round" points="${pts(list)}"/>`;

/** Offset a polyline by d to its left (screen coordinates, y down), mitred corners. */
function offsetLine(line, d) {
  const n = line.slice(1).map(([x, y], i) => {
    const [x0, y0] = line[i];
    const L = Math.hypot(x - x0, y - y0) || 1;
    return [(y - y0) / L, -(x - x0) / L];
  });
  return line.map(([x, y], i) => {
    if (i === 0) return [x + n[0][0] * d, y + n[0][1] * d];
    if (i === line.length - 1) return [x + n[i - 1][0] * d, y + n[i - 1][1] * d];
    const mx = n[i - 1][0] + n[i][0];
    const my = n[i - 1][1] + n[i][1];
    const m = Math.hypot(mx, my) || 1;
    const k = d / ((mx / m) * n[i][0] + (my / m) * n[i][1]);
    return [x + (mx / m) * k, y + (my / m) * k];
  });
}

/** Board delay for the diagram, also while inputs are invalid. */
function boardTpd(v, r) {
  if (r?.tpd) return r.tpd;
  const er = Number.isFinite(v.er) && v.er >= 1 ? v.er : 4.3;
  return delayPsPerMm(erEffective(v.st, er));
}

function pairDiagram(set, v, u, r) {
  const tpd = boardTpd(v, r);
  const lim = set.limits.find((l) => l.id === 'pair') ?? set.limits[0];
  const limC = limitIn(lim, tpd);
  const limPs = limC.max.ps;
  const user = r?.input;
  const dl = user ? convertSkew(Math.abs(user.value), user.unit, tpd) : limC.max;
  const ratio = limPs > 0 ? dl.ps / limPs : 1;
  const over = !!user && ratio > 1 + 1e-9;
  const ddr = /^ddr/.test(set.id);
  let b = '';
  // Driver and receiver
  b += rect(10, 26, 38, 42, 'comp', ' rx="3"') + text(29, 51, ddr ? 'MC' : 'TX', { cls: 'name' });
  b += rect(186, 152, 40, 26, 'comp', ' rx="3"') + text(206, 169, ddr ? 'DRAM' : 'RX', { cls: 'name', size: ddr ? 10 : undefined });
  // Pair centre line: right, a 90° turn made of two 45° corners, then down.
  const centre = [[48, 47], [184, 47], [206, 69], [206, 152]];
  const P = offsetLine(centre, 7); // outer line of the turn (longer)
  const N = offsetLine(centre, -7); // inner line: gets the serpentine
  const nBumps = Math.max(1, Math.min(4, Math.round(1 + 2 * Math.min(ratio, 1.5))));
  const xN = N[2][0];
  const y0 = 84;
  const bumps = [];
  for (let i = 0; i < nBumps; i++) {
    const y = y0 + i * 12;
    bumps.push([xN, y], [xN - 12, y], [xN - 12, y + 6], [xN, y + 6]);
  }
  const Nt = [...N.slice(0, 3), ...bumps, N[3]];
  b += rect(xN - 17, y0 - 4, 21, nBumps * 12 + 2, 'zone');
  b += trace(P) + trace(Nt);
  b += text(56, 34, 'P', { cls: 'lbl', anchor: 'start' }) + text(56, 67, 'N', { cls: 'lbl', anchor: 'start' });
  // Mismatch source and the tuning that cancels it
  b += callout(P[1][0] + 12, P[1][1] + 8, 236, 22, t('if_dgSource'));
  b += callout(xN - 13, y0 + 3, 170, 106, t('if_dgTune'), { anchor: 'end' });
  b += text(170, 122, `ΔL = ${lenText(dl)}`, { cls: 'val', anchor: 'end' });
  b += text(170, 137, `Δt = ${psText(dl)}`, { cls: 'val', anchor: 'end' });
  // Receiver view without tuning: P and N edges offset by Δt
  const dx = Math.max(4, Math.min(60, 26 * ratio));
  b += text(352, 62, t('if_dgRx'), { cls: 'title' });
  b += axes(282, 150, 142, 66);
  b += wave([[286, 140], [318, 140], [334, 96], [418, 96]]);
  b += wave([[286, 96], [318 + dx, 96], [334 + dx, 140], [418, 140]], 'wave2');
  b += text(424, 99, 'P', { cls: 'lbl', anchor: 'start' }) + text(424, 143, 'N', { cls: 'lbl', anchor: 'start' });
  b += dimH(326, 326 + dx, 82, `Δt ${psText(dl, 2)}`, { extFrom: 118, cls: over ? 'badt' : 'val' });
  b += text(352, 166, `${t('if_dgLimit')}: ${limitText(lim)} ≈ ${lim.unit === 'ps' ? lenText(limC.max, 2) : psText(limC.max, 2)}`, { cls: 'lbl' });
  b += user
    ? text(352, 182, t(over ? 'if_dgBad' : 'if_dgOk'), { cls: over ? 'badt' : 'okt' })
    : text(352, 182, t('if_dgExample'), { cls: 'lbl' });
  return svg(440, 192, b, t('if_dgAria'), { wide: true });
}

const GROUP_LABELS = {
  dqs: { a: 'MC', b: 'DRAM', ref: 'DQS', pair: true, lines: ['DQ0', 'DQ1', 'DQ2', 'DM'] },
  ck: { a: 'MC', b: 'DRAM', ref: 'CK', pair: true, lines: ['A0', 'A1', 'BA0', 'CS'] },
  rgmiiClk: { a: 'MAC', b: 'PHY', ref: 'TX_CTL', pair: false, lines: ['TXD0', 'TXD1', 'TXD2', 'TXD3'] },
};

function groupDiagram(set, v, u, r) {
  const tpd = boardTpd(v, r);
  const lim = set.limits.find((l) => l.id === 'group');
  const G = GROUP_LABELS[lim.ref] ?? GROUP_LABELS.dqs;
  const limC = limitIn(lim, tpd).max;
  let b = '';
  // Physical: controller, device, reference and four members.
  b += rect(44, 16, 34, 96, 'comp', ' rx="3"') + text(61, 68, G.a, { cls: 'name', size: 10.5 });
  b += rect(384, 16, 40, 96, 'comp', ' rx="3"') + text(404, 68, G.b, { cls: 'name', size: 10.5 });
  const refY = G.pair ? [26, 36] : [31];
  for (const y of refY) b += trace([[78, y], [384, y]], 3);
  b += text(40, 35, G.ref, { cls: 'name', anchor: 'end', size: 10.5 });
  const ys = [54, 68, 82, 96];
  ys.forEach((y, i) => {
    const tuned = i === 0 || i === 2;
    const line = [[78, y]];
    if (tuned) {
      for (let k = 0; k < 4; k++) {
        const x = 104 + k * 11;
        line.push([x, y], [x, y - 5], [x + 6, y - 5], [x + 6, y]);
      }
    }
    line.push([384, y]);
    b += trace(line, 3);
    b += text(40, y + 4, G.lines[i], { cls: 'lbl', anchor: 'end' });
  });
  b += rect(99, 44, 50, 60, 'zone');
  b += text(156, 122, t('if_dgShort'), { cls: 'lbl', anchor: 'start' });
  // Timing ruler: arrival at the receiver. ± limits are a window around the
  // reference; a spread limit is the total width the members must fit in.
  const xc = 240;
  const w = 58;
  const y = 160;
  const half = lim.spread ? lim.value / 2 : lim.value;
  b += rect(70, y - 8, xc - w - 70, 16, 'zone-bad') + rect(xc + w, y - 8, 410 - xc - w, 16, 'zone-bad') + rect(xc - w, y - 8, 2 * w, 16, 'zone-ok');
  b += path(`M70,${y}H410`, 'axis') + path(`M${xc},${y - 12}V${y + 12}`, 'wire hi');
  b += text(70, y - 14, t('if_dgArrival'), { cls: 'lbl', anchor: 'start' }) + text(xc, y - 14, lim.spread ? t('if_dgMean') : G.ref, { cls: 'name', size: 10.5 });
  [-0.6, 0.25, 0.7, -0.2].forEach((f) => { b += circle(xc + f * w, y, 2.6, 'node'); });
  b += text(xc - w, y + 22, `−${num(half)} ${lim.unit}`, { cls: 'val' }) + text(xc + w, y + 22, `+${num(half)} ${lim.unit}`, { cls: 'val' });
  b += text(xc, y + 36, lim.spread
    ? `${t('if_dgTotal')} ≤ ${num(lim.value)} ${lim.unit} ≈ ${lim.unit === 'ps' ? lenText(limC, 2) : psText(limC, 2)}`
    : `± ${lim.unit === 'ps' ? lenText(limC, 2) : psText(limC, 2)}`, { cls: 'lbl' });
  const user = r?.input;
  if (user) {
    const limPs = limC.ps;
    const over = Math.abs(user.ps) > limPs + 1e-9;
    const cls = over ? 'badt' : 'okt';
    if (lim.spread) {
      // The mismatch between two members, laid from the window's left edge.
      const len = Math.min(240, (Math.abs(user.ps) / limPs) * 2 * w);
      b += path(`M${xc - w},${y - 4}H${r1(xc - w + len)}`, over ? 'wire bad' : 'wire good') + path(`M${r1(xc - w + len)},${y - 10}V${y + 2}`, over ? 'wire bad' : 'wire good');
      b += text(xc - w + len, y - 26, `${t('if_dgYours')} ${num(Math.abs(user.ps), 3)} ps`, { cls, anchor: xc - w + len > 330 ? 'end' : 'middle' });
    } else {
      const xu = xc + Math.max(-165, Math.min(165, (user.ps / limPs) * w));
      b += path(`M${r1(xu)},${y - 10}V${y + 10}`, over ? 'wire bad' : 'wire good');
      b += text(xu, y - 26, `${t('if_dgYours')} ${signed(user.ps, 3)} ps`, { cls, anchor: xu > 330 ? 'end' : xu < 150 ? 'start' : 'middle' });
    }
  }
  return svg(440, 204, b, t('if_dgGroupAria'), { wide: true });
}

function busDiagram(set) {
  let b = '';
  if (set.bus === 'ends') {
    const [hi, lo] = set.id === 'can' ? ['CANH', 'CANL'] : ['A', 'B'];
    const yA = 46;
    const yB = 88;
    b += rect(4, 38, 58, 58, 'comp', ' rx="3"') + text(33, 71, `${t('if_dgNode')} 1`, { cls: 'name', size: 10 });
    b += rect(378, 38, 58, 58, 'comp', ' rx="3"') + text(407, 71, `${t('if_dgNode')} 3`, { cls: 'name', size: 10 });
    b += path(`M62,${yA}H378M62,${yB}H378`, 'wire');
    b += node(84, yA) + node(84, yB) + node(356, yA) + node(356, yB);
    b += twoTerm('R', 84, yA, 84, yB, { value: '120 Ω' });
    b += twoTerm('R', 356, yA, 356, yB, { value: '120 Ω', flip: true });
    b += text(150, yA - 6, hi, { cls: 'lbl' }) + text(150, yB + 14, lo, { cls: 'lbl' });
    b += text(220, 22, t('if_dgEnds'), { cls: 'val' });
    // Middle node on a stub
    b += node(212, yA) + node(228, yB);
    b += path(`M212,${yA}V136M228,${yB}V136`, 'wire');
    b += rect(194, 136, 52, 26, 'comp', ' rx="3"') + text(220, 153, `${t('if_dgNode')} 2`, { cls: 'name', size: 10 });
    b += dimV(yB, 136, 260, `${t('if_dgStub')} ${set.id === 'can' ? `≤ ${num(0.3)} m` : '≤ tr·v·c/10'}`, { cls: 'val' });
    return svg(440, 172, b, t('if_dgBusAria'), { wide: true });
  }
  if (set.bus === 'pullup') {
    const yS = 70;
    const yC = 94;
    b += path('M66,24H140', 'wire') + text(64, 28, 'VDD', { cls: 'lbl', anchor: 'end' });
    b += twoTerm('R', 90, 24, 90, yS, { name: 'Rp', flip: true }) + twoTerm('R', 124, 24, 124, yC, { name: 'Rp' });
    b += node(90, yS) + node(124, yC) + node(90, 24) + node(124, 24);
    b += rect(10, 56, 44, 52, 'comp', ' rx="3"') + text(32, 86, 'MCU', { cls: 'name', size: 10.5 });
    b += path(`M54,${yS}H400M54,${yC}H400`, 'wire');
    b += text(170, yS - 5, 'SDA', { cls: 'lbl', anchor: 'start' }) + text(170, yC - 5, 'SCL', { cls: 'lbl', anchor: 'start' });
    for (const x of [206, 300]) {
      b += node(x, yS) + node(x + 14, yC) + path(`M${x},${yS}V132M${x + 14},${yC}V132`, 'wire');
      b += rect(x - 14, 132, 42, 24, 'comp', ' rx="3"') + text(x + 7, 148, t('if_dgDev'), { cls: 'name', size: 9.5 });
    }
    b += twoTerm('C', 380, yC, 380, 136, { name: 'Cb', dashed: true, flip: true }) + node(380, yC) + ground(380, 136);
    b += text(436, 172, 'Cb ≤ 400 pF (Fm+ 550 pF)', { cls: 'val', anchor: 'end' });
    b += text(8, 172, 'tr ≤ 1000 / 300 / 120 ns (Sm / Fm / Fm+)', { cls: 'lbl', anchor: 'start' });
    return svg(440, 180, b, t('if_dgI2cAria'), { wide: true });
  }
  // SPI: series resistors at each driver.
  const lines = [['SCLK', 44, 'a'], ['MOSI', 72, 'a'], ['MISO', 100, 'b']];
  b += rect(10, 26, 46, 92, 'comp', ' rx="3"') + text(33, 76, 'MCU', { cls: 'name', size: 10.5 });
  const [p1, p2 = ''] = t('if_dgPeriph').split('|');
  b += rect(384, 26, 46, 92, 'comp', ' rx="3"') + text(407, p2 ? 70 : 76, p1, { cls: 'name', size: 10 }) + (p2 ? text(407, 83, p2, { cls: 'name', size: 10 }) : '');
  for (const [name, y, drv] of lines) {
    if (drv === 'a') {
      b += path(`M56,${y}H70`, 'wire') + twoTerm('R', 70, y, 116, y, { hi: true }) + path(`M116,${y}H384`, 'wire');
      b += path(`M250,${y - 4}L258,${y}L250,${y + 4}Z`, 'arrow');
    } else {
      b += path(`M56,${y}H324`, 'wire') + twoTerm('R', 324, y, 370, y, { hi: true }) + path(`M370,${y}H384`, 'wire');
      b += path(`M198,${y - 4}L190,${y}L198,${y + 4}Z`, 'arrow');
    }
    b += text(220, y - 6, name, { cls: 'lbl' });
  }
  b += text(220, 136, `${t('if_dgNear')} · 27–36 Ω`, { cls: 'val' });
  return svg(440, 146, b, t('if_dgSpiAria'), { wide: true });
}

function diagram(v, u, r) {
  const set = r?.set ?? ruleSetFor(v.iface, v);
  if (set.diagram === 'group') return groupDiagram(set, v, u, r);
  if (set.diagram === 'bus') return busDiagram(set);
  return pairDiagram(set, v, u, r);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default {
  id: 'interfaces',
  strings,
  sections: [
    {
      title: 'if_secIface',
      fields: [
        { key: 'iface', type: 'select', label: 'if_iface', default: 'usb2', options: INTERFACES.map((id) => ({ value: id, label: `if_opt_${id}` })) },
        { key: 'gen', type: 'choice', label: 'if_gen', default: 'gen3', show: (v) => v.iface === 'pcie',
          options: PCIE_GENS.map((g) => ({ value: g, label: g.replace('gen', 'Gen'), raw: true })) },
        { key: 'grp', type: 'choice', label: 'if_grp', default: 'data', show: (v) => /^ddr/.test(v.iface),
          options: DDR_GROUPS.map((g) => ({ value: g, label: `if_grp_${g}` })) },
        { key: 'eth', type: 'choice', label: 'if_eth', default: 'mdi', info: 'if_ethInfo', show: (v) => v.iface === 'eth',
          options: ETH_PARTS.map((g) => ({ value: g, label: `if_eth_${g}` })) },
      ],
    },
    {
      title: 'if_secBoard',
      fields: [
        { key: 'st', type: 'choice', label: 'if_st', default: 'microstrip', info: 'if_stInfo',
          options: ['microstrip', 'stripline', 'known'].map((s) => ({ value: s, label: `if_st_${s}` })) },
        { key: 'er', type: 'number', label: (v) => (v.st === 'known' ? 'if_erEff' : 'if_er'), default: 4.3, min: 1, max: 20, info: 'if_erInfo',
          presets: [{ label: 'FR-4 4.3', value: 4.3 }, { label: 'RO4350B 3.66', value: 3.66 }, { label: 'Megtron 6 3.4', value: 3.4 }] },
      ],
    },
    {
      title: 'if_secConv',
      fields: [
        { key: 'x', type: 'number', label: 'if_x', default: '', optional: true, valid: 'any', units: ['mm', 'mil', 'ps'], pref: 'length', info: 'if_xInfo' },
      ],
    },
  ],

  diagram,

  compute(v, u) {
    const set = ruleSetFor(v.iface, v);
    const erEff = erEffective(v.st, v.er);
    const tpd = delayPsPerMm(erEff);
    let input = null;
    if (Number.isFinite(v.x)) {
      const c = convertSkew(v.x, u.x, tpd);
      input = { value: v.x, unit: u.x, ...c, pass: set.limits.map((l) => withinLimit(l, c.ps, tpd)) };
    }
    return { ok: true, set, erEff, tpd, input, link: impedanceLink(set, v) };
  },

  render(r, v) {
    const s = r.set;
    const tpd = r.tpd;
    // Headline: impedance and the main matching limit.
    const mainZ = s.imp?.mode === 'se' ? s.z.se : (s.z.diff ?? s.z.se);
    const zLabel = s.z.none ? 'if_hZnone' : mainZ === s.z.diff ? 'if_hZdiff' : 'if_hZse';
    const other = mainZ === s.z.diff ? s.z.se : s.z.diff;
    const zSub = [
      s.z.none ? t('if_zNoneShort') : s.kind === 'note' ? t(`if_zSub_${s.id}`) : zRange(mainZ),
      other && `${t(other === s.z.diff ? 'if_kDiff' : 'if_kSe')}${other === s.z.diff && /_data$/.test(s.id) ? ' (DQS)' : ''} ${zText(other)}`,
    ].filter(Boolean).join(' · ');
    const zVal = s.z.none
      ? '—'
      : mainZ.nom !== undefined
        ? `${esc(num(mainZ.nom))} <span class="u">Ω${mainZ.tol ? ` ±${esc(pct(mainZ.tol))}` : ''}</span>`
        : `${esc(`${num(mainZ.range[0])}–${num(mainZ.range[1])}`)} <span class="u">Ω</span>`;
    const lim = s.limits[0];
    const second = lim
      ? [lim.id === 'pair' ? 'if_hPair' : 'if_hGroup',
        `${esc(limitText(lim).replace(` ${lim.unit}`, ''))} <span class="u">${esc(lim.unit)}</span>`,
        esc([lim.ref && limitName(lim), t('if_onBoard', { v: limitOnBoard(lim, tpd) })].filter(Boolean).join(' · '))]
      : s.rate && ['if_hRate', `${esc(rateText(s.rate).replace(/ [^ ]+$/, ''))} <span class="u">${esc(s.rate.unit)}</span>`, s.rate.note ? esc(t(`if_rateSub_${s.id}`)) : ''];
    let html = heroes([[zLabel, zVal, esc(zSub)], second]);

    // Converter check
    if (r.input) {
      const u = r.input.unit;
      const conv = [u !== 'ps' && psText(r.input), u !== 'mm' && `${num(r.input.mm)} mm`, u !== 'mil' && `${num(r.input.mil)} mil`].filter(Boolean).join(' · ');
      const yours = t('if_yours', { v: `${num(r.input.value, 4)} ${r.input.unit}`, conv });
      html += s.limits.length
        ? checks(s.limits.map((l, i) => [r.input.pass[i], esc(t('if_chkPass', { name: limitName(l), lim: `${limitRule(l)} (≈ ${limitOnBoard(l, tpd)})` })), esc(yours)]))
        : checks([[null, esc(yours), '']]);
    }

    // Link to the impedance calculator
    if (r.link) {
      const st = t(`if_imp_${r.link.st}`);
      html += `<p class="if-open"><a class="btn ghost" href="${esc(r.link.href)}">${icon('impedance', 16)}<span>${esc(t('if_open'))}<small>${esc(t('if_openSub', { z: `${num(r.link.Z)} Ω${r.link.tol ? ` ±${pct(r.link.tol)}` : ''}`, st }))}</small></span></a></p>`;
    }

    html += `<div class="block"><h2>${esc(t('if_rules'))} — ${setTitleHtml(s)}</h2>${ruleRows(s, tpd)}</div>`;
    if (s.hs) html += block('if_general', generalRows());

    html += block('if_conv', rows([
      ['if_erUsed', esc(`${num(r.erEff, 4)}${v.st === 'microstrip' ? ` (${num(0.475)}·εr + ${num(0.67)})` : ''}`)],
      ['if_tpd', `${esc(num(tpd, 4))} ps/mm · ${esc(num(tpd * 25.4, 4))} ps/in`],
      r.input && ['if_input', esc(`${num(r.input.value, 4)} ${r.input.unit} = ${psText(r.input)} = ${lenText(r.input)}`), true],
      ...s.limits.map((l) => [`${t(l.id === 'pair' ? 'if_lim_pair' : 'if_lim_group')}${l.ref ? ` (${limitName(l)})` : ''}`, esc(`${limitText(l)} ≈ ${limitOnBoard(l, tpd)}`), false, true]),
    ]));

    html += block('if_sources', sourceList(sourcesOf(s, s.hs ? GENERAL_HS : [])) + `<p class="note">${esc(t('if_disclaimer'))}</p>`);

    html += formulaBlock([
      'εeff = εr                        (stripline)',
      'εeff ≈ 0.475·εr + 0.67           (microstrip, IPC-2141A)',
      't_pd = √εeff / c  →  3.3356·√εeff ps/mm  (84.72·√εeff ps/in)',
      'skew = ΔL · t_pd,     ΔL = skew / t_pd',
      '1 mil = 0.0254 mm',
    ], 'if_note', [`${SOURCES.mt094.short} (IPC-2141A)`, SOURCES.an958.short, 'IPC-2141A']);
    return html;
  },
};
