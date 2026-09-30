# Yol Haritası ve Geliştirme Fikirleri

Öncelik: ⭐⭐⭐ yüksek etki / düşük efor → ⭐ uzun vadeli.

## 1. Kısa vadede (1–2 hafta)

* ⭐⭐⭐ **Akıllı öneri motoru (gerçek deneme kodlaması).** Şu an öneriler formüllerle tahmin
  ediliyor. Videonun 3–4 farklı yerinden 2'şer saniyelik parçalar alıp birkaç CRF değeriyle
  kodlayın, SSIM ölçün ve "hedef kaliteye (ör. SSIM ≥ 0.97) ulaşan en küçük CRF"yi seçin.
  Netflix'in "per-title encoding" yaklaşımının hafif bir versiyonu. Altyapı hazır:
  `encodeVideo({ trim })` + `measureQuality()`.
* ⭐⭐⭐ **Masaüstünde çıktı önizleme / karşılaştırma.** Range destekli, sadece bilinen çıktılara
  izin veren bir `vca-media://` protokolü ile karşılaştırma sayfasını masaüstünde de açın.
* ⭐⭐⭐ **Toplu işte ZIP indirme** (web). `fflate` ile akış halinde ZIP; tek tek indirme izni sorununu çözer.
* ⭐⭐ **Paylaşım hedefleri için hazır profiller:** Discord (10/50 MB), WhatsApp, Telegram, e-posta,
  Instagram Reels (9:16, 1080×1920, H.264, ≤ 60 sn), YouTube yükleme önerileri.
* ⭐⭐ **Kalite skoru grafiği:** zaman ekseninde kare bazlı SSIM/PSNR; kalitenin düştüğü sahneleri gösterin.
* ⭐⭐ **İşlem geçmişi:** IndexedDB'de hangi dosya hangi ayarla ne kadar küçüldü; "aynı ayarlarla tekrar".

## 2. Orta vadede

* ⭐⭐⭐ **VMAF** (Netflix'in algısal kalite metriği) — masaüstünde `libvmaf` içeren FFmpeg ile.
  PSNR/SSIM'den çok daha güvenilir bir "insan gözü" skoru verir.
* ⭐⭐ **Klasör izleme (masaüstü):** "Bu klasöre düşen her videoyu H.265'e çevir" — `chokidar` + kuyruk.
* ⭐⭐ **Paralel toplu işleme (masaüstü):** GPU kodlayıcılar aynı anda 2–3 işi kaldırır;
  CPU sayısına göre eşzamanlılık ayarı.
* ⭐⭐ **Altyazı ve çoklu ses izi:** izleri listele, seç, göm (MKV) veya yak (`subtitles=` filtresi).
* ⭐⭐ **Görsel kırpma/kesme editörü:** zaman çizelgesinde küçük resim şeridi (Mediabunny `CanvasSink`)
  ve sürüklenebilir başlangıç/bitiş tutamaçları; kırpma dikdörtgenini video üzerinde çizme.
* ⭐⭐ **GIF / WebP / APNG çıktısı** (palettegen ile kaliteli GIF).
* ⭐ **HDR → SDR ton eşleme** (`zscale` + `tonemap`) ve HDR korumalı HEVC/AV1 10-bit çıktı.
* ⭐ **Otomatik güncelleme** (`electron-updater` + GitHub Releases).

## 3. Uzun vadede / mimari

* **Tauri'ye geçiş (isteğe bağlı):** Electron yerine sistem WebView'i kullanır, paket ~10–20 MB olur.
  FFmpeg yine "sidecar" olarak gelir. Dezavantaj: Rust araç zinciri ve WebView farklılıkları
  (özellikle Linux'ta WebCodecs desteği). Mevcut mimari (motor cephesi + köprü) sayesinde geçiş
  sadece `electron/` klasörünü ve `desktop-bridge.ts` uygulamasını değiştirmeyi gerektirir.
* **FFmpeg.wasm çok iş parçacıklı sürüm (`@ffmpeg/core-mt`):** 2–4 kat hız; `SharedArrayBuffer`
  için COOP/COEP başlıkları gerekir (Docker/Nginx yapılandırmasına eklenebilir).
* **Ağ üzerinden "uzak işçi":** Güçlü bir makinedeki masaüstü uygulamasını LAN'da iş kuyruğu
  sunucusu yapmak (ör. telefon/tablet tarayıcısından iş gönderme).
* **CLI:** Aynı `buildFFmpegArgs` ile `npx video-compression-analyzer ./klasor --target 25MB`.
* **Testler:** `ffmpeg-args.ts` için birim testleri (Vitest), Playwright ile uçtan uca testler
  (bu geliştirmede elle yapılan tarayıcı + Electron testlerinin otomatikleştirilmesi).

## Teknik borç (mevcut kodda)

* `compression-calculator.ts` tahminleri kaba; gerçek deneme kodlaması (madde 1) ile değiştirilmeli.
* Analiz sayfasındaki bazı başlıklar ("Video Analiz & Sıkıştırma", istatistik kartları) çevrilmemiş sabit Türkçe metin.
* `components/ui/select.tsx` özel Select'i seçili etiketi değil değeri gösteriyor ve dışarı
  tıklamada kapanmıyor; Radix Select ile değiştirilmeli (dönüştürücü artık yerel `<select>` kullanıyor).
* Karşılaştırma sayfası (`compare/page.tsx`, 1300+ satır) iki video için kopyalanmış mantık içeriyor;
  `useVideoPane()` gibi bir hook'a bölünmeli.
