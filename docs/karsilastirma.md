# Benzer araçlarla karşılaştırma

Bu belge, Umay PCB Toolkit'i yaygın PCB ve elektronik hesaplayıcılarıyla karşılaştırır, onların daha iyi yaptığı şeyleri ve bu sürümde eklenenleri listeler. İnceleme Kasım 2026'da yapıldı; bilgiler üreticilerin sayfaları, belgeleri ve kaynak kodlarından derlenmiştir.

## İncelenen araçlar

| Araç | Platform / lisans | Öne çıkan yanı |
|---|---|---|
| **Saturn PCB Toolkit** (v8.48) | Windows, ücretsiz, kapalı kaynak | En kapsamlı masaüstü PCB hesaplayıcısı; 20'ye yakın sekme, malzeme kütüphanesi, protokol hazır ayarları |
| **KiCad PCB Calculator** | Masaüstü, GPL-3 | 15 panel; TransLine (9 hat yapısı, analiz/sentez, kayıp), regülatör, zayıflatıcı, renk kodu, kablo, IEC 60664 (geliştirme sürümü) |
| **Sierra Circuits (protoexpress)** | Web, ücretsiz | 2B alan çözücülü empedans, IPC-2152 iz genişliği, via, PDN analizörü, stack-up tasarımcısı |
| **Altium** | Web hesaplayıcılar ücretsiz; katman yığını yöneticisi ücretli | Alan çözücü, lehim maskesi ve pürüzlülük, kapsamlı makaleler |
| **Polar Si9000e** | Windows, ticari | 100+ yapı, alan çözücü, kayıp ve pürüzlülük modelleri, S-parametre |
| **Rogers MWI** | Web, ücretsiz | RF hatları, dispersiyon, pürüzlülük, Rogers laminat kütüphanesi |
| **JLCPCB / PCBWay / Eurocircuits / NextPCB** | Web, ücretsiz | Üreticinin gerçek katman yığınlarına bağlı empedans, DFM kontrolü |
| **Digi-Key** | Web, ücretsiz | ~31 genel elektronik hesaplayıcı (Ohm, bölücü, LED, 555, filtre, SMD kodu) |
| **mbedded.ninja (NinjaCalc)** | Web, ücretsiz | Her hesaplayıcı bir anlatım makalesinin içinde; buck/boost, Sallen-Key |
| **Omni Calculator** | Web, reklamlı | Her hesaplayıcının etrafında açıklayıcı makale |
| **Broadcom AppCAD, wcalc** | Masaüstü | RF hat ve sistem hesapları |

## Özellik karşılaştırması

✓ var · ◐ kısmen · ✗ yok · **yeni** = bu sürümde eklendi

| Özellik | Umay | Saturn | KiCad | Sierra (web) |
|---|---|---|---|---|
| İz genişliği IPC-2221 | ✓ | ✓ | ✓ | ✓ |
| IPC-2152 düzeltme katsayılarıyla | ✓ (yöntem açık) | ✓ (yöntem belgesiz) | ✗ | ✓ |
| Genişlik / akım / ΔT yönünde çözüm | ✓ üç yön | ◐ iki yön | ◐ | ◐ |
| Aşındırma faktörü ve kaplama | ✓ **yeni** | ✓ | ✗ | ✓ |
| Deri kalınlığı ve AC direnç | ✓ **yeni** | ◐ yalnız deri kalınlığı | ◐ | ✗ |
| Empedans yapı sayısı | 9 | 6 + diferansiyeller | 9 | çok sayıda (alan çözücü) |
| Hedef empedanstan genişlik (sentez) | ✓ | ✗ | ✓ | ✓ |
| Tolerans penceresi, geçti/kaldı | ✓ **yeni** | ✓ | ✗ | ◐ |
| Kayıp: dielektrik, iletken, pürüzlülük | ✓ (pürüzlülük **yeni**) | ✗ | ✓ | ✓ |
| Koaksiyel ve iki telli hat | ✓ **yeni** | ✗ | ✓ | ✗ |
| Lehim maskesi etkisi | ✗ | ✗ | ◐ | ✓ |
| Kenardan kuplajlı dışındaki diferansiyeller (broadside) | ✗ | ✓ | ✗ | ✓ |
| Via: DC, termal, L/C, adım yanıtı | ✓ | ✓ | ✓ | ✓ |
| Via saplama (stub) rezonansı | ✓ **yeni** | ◐ (diferansiyel via) | ✗ | ✓ |
| Pad ve halka (IPC-2221/2222/6012) | ✓ | ✓ | ◐ | ◐ |
| Pad arası iz geçişi (BGA) | ✓ **yeni** | ✓ | ✗ | ✗ |
| İletken aralığı (IPC-2221) + ters çözüm | ✓ | ✓ | ✓ | ✓ |
| Eritme akımı | ✓ | ✓ | ✓ | ✗ |
| Karışma | ✓ | ◐ (desteklenmiyor) | ✗ | ✓ |
| PDN hedef empedansı + empedans grafiği | ✓ | ◐ | ✗ | ✓ |
| Termal (Tj, soğutucu) | ✓ | ✓ | ✗ | ◐ |
| DC-DC buck/boost güç katı | ✓ **yeni** | ✗ | ✗ | ✗ |
| Ohm, bölücü, LED, RC, E-serisi | ✓ | ✓ | ◐ | ✗ |
| Bileşen toleransı analizi | ✓ **yeni** | ✗ | ✗ | ✗ |
| Renk kodu ve SMD kodu | ✓ **yeni** | ✗ | ◐ (renk) | ✗ |
| RF zayıflatıcı | ✓ **yeni** | ✓ | ✓ | ✗ |
| Düzlemsel spiral bobin | ✓ **yeni** | ✓ | ✗ | ✗ |
| Kristal yük kapasitesi, PPM | ✓ **yeni** | ✓ | ✗ | ✗ |
| Seri/paralel eşdeğer | ✓ **yeni** | ✓ | ✗ | ✗ |
| 555 zamanlayıcı | ✓ **yeni** | ✗ | ✗ | ✗ |
| Yansıma, VSWR, geri dönüş kaybı | ✓ **yeni** | ✗ | ✗ | ✓ |
| IPC kabul kriterleri özeti | ✓ | ✗ | ◐ | ◐ (blog) |
| **Öğrenme yolu, rehberli dersler** | ✓ **yeni** | ✗ (yardım PDF'i) | ✗ | ◐ (makaleler) |
| Her sonuçla formül ve kaynak | ✓ | ◐ | ◐ | ◐ |
| Paylaşılabilir bağlantı, metin özeti, yazdırma | ✓ | ◐ (yazdırma) | ✗ | ◐ (hesapla kayıt) |
| Platform | Her tarayıcı, mobil, açık kaynak (MIT) | Yalnız Windows, kapalı | Masaüstü, GPL | Web |
| Stack-up tasarımcısı | ✗ | ✗ | ✗ | ✓ |
| Alan çözücü | ✗ | ✗ | ✗ | ✓ |

## Onların daha iyi yaptığı ve bu sürümde eklenenler

- **Saturn:** diferansiyel çift hazır ayarları ve toleranslı geçti/kaldı ışığı → empedansta arayüz hedefleri (RF 50, USB 90, PCIe 85, Ethernet/LVDS/HDMI 100 Ω) ve tolerans kontrolü; sentezde toleransı sağlayan genişlik aralığı.
- **Saturn:** aşındırma faktörü, kaplama, akım yoğunluğu, deri kalınlığı → iz genişliğine eklendi; ayrıca AC direnç tahmini.
- **Saturn:** birim uzunluk L ve C, via rezonans frekansı → eklendi.
- **Saturn:** kristal yük kondansatörleri ve PPM, seri/paralel R-L-C, spiral bobin, Pi/T zayıflatıcı, pad arası iz geçişi → ayrı hesaplayıcılar olarak eklendi.
- **KiCad:** koaksiyel ve iki telli hat, köprülü T zayıflatıcı, renk kodu → eklendi.
- **Sierra / Polar / Rogers:** bakır pürüzlülüğünün iletken kaybına etkisi (Hammerstad modeli), via saplama rezonansı, yansıma hesaplayıcısı → eklendi.
- **Digi-Key / mbedded.ninja:** 555 zamanlayıcı, SMD direnç kodları, buck/boost güç katı → eklendi.
- **Omni / mbedded.ninja / Sierra:** hesaplayıcıları anlatımla birlikte sunmak → öğrenme yolu ve her hesaplayıcıdan ilgili derse bağlantı.

## Umay'ın öne çıktığı yerler

- **Öğrenme yolu:** incelenen araçların hiçbirinde sıralı ders, rehberli örnek ve "kendini sına" soruları yok. Umay'da 12 ders var; her ders örnek değerlerle hesaplayıcıyı açar ve dersteki sayılar hesaplayıcıyla doğrulanmıştır.
- **Şeffaflık:** IPC-2152 yöntemi ve tüm formüller açık; Saturn'ün IPC-2152 yöntemi belgelenmemiştir ve kullanıcılar sonuçları sorgulamaktadır.
- **Doğrulama:** 76 motor testi her değişiklikte otomatik çalışır; değerler elle veya tam çözümlerle hesaplanmıştır.
- **Tolerans analizi:** bileşen toleranslarının çıktıya etkisi (en kötü durum ve RSS) incelenen araçlarda yoktur.
- **Erişim:** kurulum gerektirmez, her işletim sisteminde ve telefonda çalışır, açık kaynaktır, sonuçlar bağlantıyla paylaşılır.

## Henüz eklenmeyenler (gelecek iş)

| Özellik | Neden şimdi değil |
|---|---|
| Stack-up tasarımcısı (katman yığını, kalınlık, malzeme, empedans profili) | Büyük bir özellik; ayrı bir çalışma olarak planlanmalı |
| Alan çözücü, lehim maskesi etkisi, broadside ve dual stripline | Kapalı form denklemler güvenilir değil; 2B sayısal çözüm gerekir |
| IEC 60664-1 / IEC 62368-1 creepage ve clearance | Ücretli standart tabloları; doğrulanmış kaynak gerekir |
| Kablo akım taşıma kapasitesi (AWG ampacity) | Değerler kurulum koşuluna göre değişir, ortak bir standart yok |
| Diferansiyel via empedansı, S-parametre / Touchstone çıktısı | Sayısal modelleme gerektirir |
| NTC, Sallen-Key filtre, pil ömrü, galvanik korozyon tablosu | Faydalı ama daha düşük öncelikli |
| Malzeme kütüphanesi (Dk/Df frekansa göre) | Üretici verileri lisans ve doğrulama ister; şimdilik hazır değer çipleri var |
