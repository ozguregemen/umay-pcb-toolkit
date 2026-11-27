# Mühendislik analizi ve yöntem notları

Bu belge, Umay PCB Toolkit'in hesap mantığının nasıl denetlendiğini, eski sürümde bulunan hataları, yeni sürümde kullanılan yöntemleri ve bilinen sınırlamaları kayıt altına alır. Her hesaplayıcının formülü ve kaynakları uygulama içinde **Formül · Yöntem ve kaynaklar** bölümünde de görülebilir.

## 1. Denetim yöntemi

1. Eski C#/Avalonia motoru ve ilk web sürümü satır satır incelendi.
2. Projenin kaynak notları (`kaynak/` klasörü) ve M. Jouppi'nin *The Value of IPC-2152* (IPC APEX) bildirisi okundu; notlardaki her formül ve tablo IPC standartlarının bilinen içeriğiyle karşılaştırıldı.
3. Formüller birincil kaynaklarla (Hammerstad–Jensen 1980, Wheeler 1978, H. Johnson, Onderdonk/Preece, IPC-2221B/2222/6012 ikincil kaynakları) doğrulandı.
4. Her motor fonksiyonu için elle hesaplanmış referans değerli testler yazıldı (`tests/cases/`). Testler her push'ta GitHub Actions'ta çalışır.

## 2. Eski mantıkta bulunan sorunlar

### 2.1 Kaynak notlar

`kaynak/` klasöründeki notların bir kısmı bir LLM çıktısıdır (`IPC_Bolum2_2_4-2_7_Ozet.pdf` ChatGPT ekran görüntülerinden oluşur), hiçbiri IPC madde/tablo numarası vermez. Uygulamaya taşınan değerlerin önemli bir bölümü bu notlardan geliyordu:

| Notlardaki iddia | Gerçek durum |
|---|---|
| "IPC-2152" denklemi `I = k·ΔT^0.44·A^0.725` | Bu IPC-2221'in (eski NBS 1956 verisi) eğri uydurmasıdır. IPC-2152'de kapalı form denklem yoktur; grafikler ve düzeltme katsayıları vardır. |
| `W = I/(k·t·ΔT^0.44)` | Hatalı: 0,725 üssü kaybolmuş. 5 A / 20 °C / 1 oz dış katmanda 1,82 mm yerine 0,51 mm verir. |
| İrtifa çarpanı `1 − h/15000` | Fiziksel değil, IPC'de yok. 15 km'de akım kapasitesini sıfıra indirir; oysa IPC-2152 vakum için bile grafik verir. |
| Hava akışı (×1,25/1,5/1,9), konformal kaplama (×0,8–0,925), görev döngüsü tablosu, düzlem tablosu | IPC-2152'de bu tablolar yok. IPC-2152 durgun hava ve vakum içindir; zorlamalı hava kapsam dışıdır. |
| IPC-6012 sınıf tablosu (kaplama 20/25/30 µm, halka 75/100/125 µm vb.) | Çoğu yanlış. Gerçek: kaplama Sınıf 1–2 ort. 20 µm, Sınıf 3 ort. 25 µm; halka Sınıf 1–2 kırılmaya izin verir, Sınıf 3 dış 50 µm / iç 25 µm. |
| Dielektrik kaybı `α = 4,34·π·f·√εr·tanδ/c` ve `.../8,686` | İki ayrı hata (2 kat ve 75 kat). Doğrusu `α_d = 8,686·π·f·√εr·tanδ / c` dB/m (stripline). |
| 50 Ω stripline genişlik tablosu | Hesaplanmamış; microstrip değerinin ~0,7 katı. Gerçek değerin 1,6–2 katı geniş. |
| Via ısıl direnci `≈ 70/d²` | Gerçekçi değil (0,3 mm / 25 µm / 1,6 mm via ≈ 165 °C/W). |

### 2.2 Hesap motoru

1. **"IPC-2152" modu aslında IPC-2221'di.** IPC-2221 formülüne yukarıdaki dayanaksız çarpanlar uygulanıyordu.
2. **İç katmanlar için k = 0,024 kullanılıyordu.** IPC-2152'nin ana bulgusu, iç katman izlerinin IPC-2221'in varsaydığı gibi yarı kapasitede olmadığıdır; eski IPC-2221 iç katman eğrisi aslında serbest hava verisidir. Bu yüzden iç katman genişlikleri ~2,6 kat büyük çıkıyordu.
3. **Sınıf payları (×1,2/1,3/1,5) ve sınıf minimum genişlikleri (5/4/4 mil) IPC kuralı değildi.** Yerlerine açık bir "tasarım payı" ve üreticinin minimum genişliği girdisi kondu.
4. **İletken aralığında tablo aralığı hatası** (ilk web sürümünde düzeltildi): 15,5 V gibi değerler son satıra düşüyordu (B2 için 0,1 mm yerine 2,5 mm).
5. **500 V üstü kural yanlış uygulanıyordu** (C# sürümü ve ilk web sürümü): katsayı toplam gerilimle çarpılıyordu. IPC-2221 §6.3'e göre doğrusu `d = d(301–500 V) + c·(V − 500)`. B2 ve B3'te iki yorum tesadüfen aynı sonucu verir; B1'de 600 V için 1,50 mm yerine 0,50 mm, A6'da 1000 V için 3,05 mm yerine 3,025 mm doğrudur.
6. **Diferansiyel stripline sabiti 0,347 kullanılıyordu** (ilk web sürümü). National AN-905'in özgün değeri 0,374'tür; 0,347 yaygın dolaşan bir kopyalama hatasıdır. Geçerlilik aralığı da eklendi (microstrip 0,2 ≤ s/h ≤ 3, stripline 0,2 ≤ s/b ≤ 1,5).
7. **Empedans:** yalnızca IPC-2141 yaklaşımları vardı (tipik ±%5–10, geçerlilik aralığı dışında daha kötü). Hammerstad–Jensen ve Wheeler denklemleri eklendi; IPC-2141 karşılaştırma olarak gösterilir.
8. **Eksik hesaplayıcılar:** pad/halka, eritme akımı, IPC-6012 kabul kriterleri, sinyal bütünlüğü temelleri, karışma, PDN, termal ve temel devre araçları yoktu.

## 3. Yeni sürümdeki yöntemler

| Hesaplayıcı | Yöntem | Doğrulama |
|---|---|---|
| İz genişliği (IPC-2152) | Temel grafiğin kapalı form uydurması `A = (117,555·ΔT^−0,913 + 1,15)·I^(0,84·ΔT^−0,108 + 1,159)` (J. Olson, smps.us) × bakır kalınlığı, kart kalınlığı ve düzlem mesafesi düzeltmeleri; genişlik, akım ve ΔT yönünde çözüm | 10 A / 20 °C → 513 mil² (grafik ≈ 500); 1 oz düzeltmesi 0,84; gidiş-dönüş testleri |
| İz genişliği (IPC-2221) | `I = k·ΔT^0.44·A^0.725`, k = 0,048 / 0,024 | 1 A, 10 °C, 1 oz → 11,83 mil |
| İletken aralığı | IPC-2221B Tablo 6-1, > 500 V doğrusal kural, ters çözüm | Tablo değerleri, gidiş-dönüş testi |
| Via | DC direnç, IPC-2221 kapasite, ısıl direnç, Johnson L/C | Johnson kitabındaki 1,2 nH ve 0,5 pF örnekleri |
| Pad ve halka | IPC-2221B `a + 2b + c`, IPC-2222 bacak boşluğu, IPC-6012 sınıf kontrolleri | Elle hesap |
| Eritme akımı | Onderdonk (adyabatik), Preece (sürekli) | Elle hesap |
| Empedans | Hammerstad–Jensen, Wheeler 1978, CPWG konformal dönüşüm, asimetrik stripline, gömülü microstrip, diferansiyel yaklaşımlar, kayıp | Hava microstrip 126,4 Ω; Wheeler ↔ Cohn tam çözüm (< %0,5); CPWG → CPW limiti; sentez gidiş-dönüşü |
| Sinyal temelleri | BW = 0,35/tr, diz frekansı, l_r/6 ve l_r/2 kuralları, dalga boyu, deri kalınlığı, skew | Elle hesap |
| Karışma | Johnson `K/(1 + (D/H)²)` | Elle hesap ve ters çözüm |
| PDN | Hedef empedans, bulk kapasite, seri RLC kondansatör bankası, düzlem kapasitesi | SRF'de |Z| = ESR, n adet → Z/n |
| Termal | θ zinciri, LDO kaybı, gerekli θSA | Elle hesap |
| DC-DC | Buck/boost güç katı (TI SLVA477, SLVA372) | 12→3,3 V ve 5→12 V örnekleri |
| Yansıma / VSWR | Γ = (ZL − Z0)/(ZL + Z0), RL, VSWR, uyumsuzluk kaybı | 75 Ω / 50 Ω → Γ = 0,2 |
| RF zayıflatıcı | Pi, T, köprülü T; standart değerlerle düğüm analizi | 10 dB / 50 Ω: Zin = 50 Ω, kayıp 10 dB |
| Spiral bobin | Mohan 1999 (değiştirilmiş Wheeler ve akım tabakası) | İki yöntem %0,4 içinde |
| Renk ve SMD kodu | IEC 60062:2016, 3/4 haneli ve EIA-96 | Kod/değer gidiş-dönüşü |
| Tolerans analizi | En kötü durum ve RSS (duyarlılık katsayıları) | Elle hesap |
| Gömülü microstrip | IPC-2141 üstel davranışı, c = 0'da Hammerstad–Jensen'e bağlanmış | c = 0 → microstrip, c → ∞ → εr |
| Kayıp | Pozar dielektrik kaybı, R′/(2Z0) iletken kaybı, Hammerstad pürüzlülük çarpanı | Stripline 1 GHz örneği |

## 4. Bilinen sınırlamalar

- Tüm sonuçlar mühendislik tahminidir; IPC standartları ücretlidir ve tablo değerleri güvenilir ikincil kaynaklardan doğrulanmıştır. Kritik tasarımlarda standardın kendisini ve üreticinin kabiliyet tablosunu esas alın.
- IPC-2152'nin kapalı form uydurması grafiklerin okunmasına dayanır; grafik doğruluğu ±%10 mertebesindedir. Isıl iletkenlik düzeltmesi, kaynaklar arasında yön konusunda çelişki olduğu için eklenmedi. Zorlamalı hava, irtifa ve konformal kaplama IPC-2152'de sayısallaştırılmadığı için hesaplanmaz.
- IPC-6012'de Sınıf 2 için iletken aralığı azalma sınırı kaynaklar arasında çelişkilidir (%20 / %30); IPC kuralları sayfasında böyle belirtilir. IPC-6012F (2024 sonrası tasarımlar) en küçük dielektrik kalınlığını 90 µm'den 65 µm'ye indirmiştir.
- IPC-2221C (2023) Tablo 6-1'i değiştirmiştir (yeni B5 sütunu, farklı > 500 V adımı); uygulama IPC-2221B değerlerini kullanır.
- Diferansiyel empedans ve karışma formülleri hızlı tahmin içindir; sıkı kuplajda ve hassas toleranslarda alan çözücü kullanın.
- İletken kaybı yüzey pürüzlülüğünü içermez.
- IPC-2221 Tablo 6-1 fonksiyonel yalıtım içindir; şebeke bağlantılı devrelerde IEC 62368-1 / IEC 60664-1 güvenlik mesafeleri geçerlidir.
- PCB anten hesapları başlangıç ölçüsüdür. Yama anten için Balanis'in iletim hattı modeli kullanılır; kenar giriş direnci (90·εr²/(εr−1)·(L/W)²) ve bant genişliği (Jackson–Alexopoulos) yaklaşık değerlerdir; Balanis Örnek 14.1 (10 GHz, εr 2,2, h 1,588 mm → W 11,86 mm, L 9,06 mm) ile doğrulanmıştır. Basılı monopolde εeff ≈ (εr+1)/2 kabulü yapılır; toprak boyutu, kutu ve yakın bileşenler rezonansı kaydırdığı için son ayar VNA ile yapılmalıdır.
- Spiral bobin rezonans hesabında AC direnç, deri etkisini içeren Yue–Wong yaklaşımıyla (R_dc·(t/δ)/(1−e^(−t/δ))) bulunur; sarımlar arası yakınlık etkisi dahil değildir, gerçek değer 1,5–3 kat yüksek olabilir. Bobinin öz kapasitesi hesaplanmaz; kullanıcı parazitik kapasite olarak girer.
- Empedans eşleştirme kayıpsız elemanlarla ve tek frekansta tasarlanır; her tasarım ağ analiziyle geri doğrulanır (Zin = Zs*). Bobin direnci, öz rezonans ve pad parazitikleri modellenmez; bant genişliği uç reaktansları f0'daki eşdeğerleriyle sabit tutan bir taramadan gelir.
- Stack-up empedansları kapalı form denklemlerdir (±%5–10); lehim maskesi modellenmez. Üretici stack-up ve kabiliyet değerleri üreticilerin yayımladığı sayfalardan alınmıştır (erişim tarihi `src/engine/fabs.js` ve `src/engine/stackup.js` içinde); üretici değerleri değiştirebilir, sipariş öncesi güncel sayfayı kontrol edin.
- MOSFET kayıpları doğrusal yaklaşımdır (yalnız Rds(on) sıcaklıkla değişir, tek etkin Coss). Snubber ve ani akım hesapları doğrusal elemanlar varsayar; NTC şarj boyunca soğuk direncinde kabul edilir. EMC yardımcıları (λ/20 dikiş viası, yarık ekranlama) kaba tasarım kurallarıdır, ölçümün yerini tutmaz.
- Op-amp hesapları tek kutuplu modeldir (giriş ortak mod aralığı, ofset ve bias akımı yok). Şönt değer kalıplama eğrisi ve standart şönt değerleri tipik varsayımlardır; parçanın veri sayfasını esas alın.
- Çevrimdışı kullanım bir service worker ile sağlanır (önce ağ, ağ yoksa önbellek). Önbellek ilk ziyaretten sonra arka planda dolar ve günde en fazla bir kez yenilenir; çevrimdışıyken en son indirilen sürüm çalışır.
- Empedans tolerans analizi kapalı form modelle yapılır: her parametre tek başına sınırlarına götürülür, en kötü durum tüm sınır birleşimlerinin uç değeridir, RSS ise katkıları bağımsız hatalar gibi birleştirir. Genişlik ile aralık birbirine bağlı alınır (aşındırma izi daraltırken aralığı açar); öteki parametreler bağımsız kabul edilir. Varsayılan toleranslar (genişlik ±%10, dielektrik ±%10, εr ±%5, bakır ±%10) tipik değerlerdir, üreticinin verdiği değerler esas alınmalıdır. Lehim maskesi ve reçine akışının iz çevresindeki etkisi modellenmez.
- Güç yolu gerilim düşümü, bütün bakır için tek bir sıcaklık ve sabit yük akımı varsayar; via ve pad geçişlerindeki akım yoğunlaşması, paralel vialar arasındaki eşitsiz paylaşım ve temas direncinin aşınmayla değişmesi modellenmez. İz sıcaklık artışı IPC-2152 temel grafiğiyle (1,78 mm kart, yakın düzlem yok) hesaplanır.
- Termal via ve bakır alanı bir tahmindir: ped eş sıcaklıklı, ısı vialar arasında eşit paylaşılmış ve bakır alanı ped merkezli bir disk kabul edilir. Bakırın ortama ısı atması, taşınım ve ışınımı tek katsayıda toplayan halka kanat çözümüyle (Bessel fonksiyonları) hesaplanır; bu çözüm bağımsız bir sonlu fark çözümüyle doğrulanmıştır. Parçanın üst yüzünden ve bacaklarından çıkan ısı, iç düzlemler ve komşu ısı kaynakları hesaba katılmaz; malzeme değerleri (FR-4 0,3 W/m·K, lehim 58 W/m·K) tipik değerlerdir.
- Güç ağacı kararlı durum modelidir: anahtarlamalı regülatörün verimi yükten bağımsız tek bir sayı alınır (hafif yükte gerçek verim çok daha düşüktür) ve sükûnet akımı verimin üstüne eklenir; veri sayfasındaki verim bunu zaten içeriyorsa kayıp biraz fazla hesaplanır. En kötü durum tek bir çalışma noktası değildir: LDO için en yüksek giriş gerilimi, anahtarlamalı regülatör ve seri direnç için en düşük giriş gerilimi, hepsinde en yüksek yük akımları alınır. Kalkış ve ani akım, kablo ve iz düşümleri, dropout bölgesindeki LDO davranışı modellenmez.
- Hesap adımları, motorun kullandığı formülü ve ara değerleri gösterir; her adımdaki sayılar testlerde motordan bağımsız olarak yeniden hesaplanıp gösterilen sonuçla karşılaştırılır (karmaşık sayı, tablo araması ve sayısal çözüm içeren adımlar bu denetimin dışındadır); ekranda yuvarlanmış sayılar görünür, bu yüzden elle yeniden hesapta son basamak farklı çıkabilir. IPC-2152'de akım ve sıcaklık artışı kapalı biçimde çözülemez: denklem sayısal çözülür ve bulunan değer yerine konarak gösterilir. Formül yazımı tarayıcının MathML desteğine dayanır (2023 ve sonrası tarayıcılar).
- Sık kullanılanlar ve kayıtlı hesaplar yalnızca tarayıcının yerel deposunda (localStorage) durur; tarayıcı verisi silinirse kaybolur ve cihazlar arasında kendiliğinden eşitlenmez. Taşımak ya da yedeklemek için dışa aktarma dosyası kullanılır. İçe aktarılan dosya doğrulanır: bilinmeyen araçlar atılır, metinler kısaltılır, sorgu yeniden kodlanır.
- Ders içi arama kelime başından eşleşir ve aksan duyarsızdır ("donus" → "dönüş"); kelime ortasındaki eşleşmeleri ve yazım hatalarını bulmaz, sınav cevaplarını ve formül bloklarını taramaz.
