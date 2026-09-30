# Masaüstü Modu (Electron)

Uygulama artık hem tarayıcıda hem de **Windows / macOS / Linux masaüstü uygulaması** olarak çalışır.
Aynı Next.js arayüzü iki ortamda da kullanılır; sadece dönüştürme **motoru** değişir.

## Neden masaüstü?

| | Tarayıcı | Masaüstü |
|---|---|---|
| Motor | WebCodecs (Mediabunny) + FFmpeg.wasm | Sistem / paketli **yerel FFmpeg** |
| Dosya boyutu | WebCodecs: sınırsız (parça parça okur), FFmpeg.wasm: ~2 GB | Sınırsız |
| Hız | WebCodecs GPU ile hızlı; FFmpeg.wasm tek iş parçacığı, yavaş | Tüm CPU çekirdekleri + GPU kodlayıcılar |
| GPU kodlayıcı | Tarayıcının seçtiği | NVIDIA NVENC, Intel QSV, AMD AMF, Apple VideoToolbox |
| Codec'ler | H.264/H.265 (WASM veya WebCodecs), VP9/AV1 yalnızca WebCodecs | H.264, H.265, VP9, AV1 (SVT-AV1 / libaom) |
| Giriş formatları | MP4/MOV/WebM/MKV/TS (WebCodecs) + AVI/FLV/WMV (WASM) | FFmpeg'in okuduğu her şey |
| Çıktı | Tarayıcıdan indirme | Doğrudan diske (kaynağın yanına veya seçilen klasöre) |
| İki geçişli kodlama | Yok | Var |
| Kalite ölçümü | Örneklenmiş kareler (PSNR/SSIM) | Tüm video (FFmpeg `ssim` + `psnr`) |

## Mimari

```
┌──────────────────────── Renderer (Next.js statik çıktı, app://local) ─────────────────────────┐
│  UI (React)  ──►  src/lib/engine/index.ts  (motor cephesi: probe / encode / measure)          │
│                     ├─ webcodecs-engine.ts   Mediabunny + WebCodecs          (tarayıcı)       │
│                     ├─ ffmpeg-wasm-engine.ts FFmpeg.wasm + WORKERFS          (tarayıcı)       │
│                     └─ native-engine.ts      window.vcaDesktop köprüsü        (masaüstü)       │
│                     ffmpeg-args.ts: EncodeOptions -> FFmpeg argümanları (wasm + yerel ortak)   │
└──────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                           │ contextBridge (electron/preload.cjs)
┌──────────────────────── Ana süreç (electron/main.cjs) ───────────────────────────────────────┐
│  app:// protokolü (out/ klasörünü sunar)                                                       │
│  IPC: vca:probe, vca:encode, vca:cancel, vca:thumbnail, vca:measure-quality, ...              │
│  electron/ffmpeg-tools.cjs: FFmpeg bulma, GPU kodlayıcı algılama, -progress ile ilerleme       │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
```

* **Arayüz iki ortamda da aynı.** `useDesktop()` hook'u köprü varsa masaüstü özelliklerini açar
  (çıktı klasörü, "Klasörde göster", GPU bilgisi).
* **Dosya yolları:** Sürükle-bırak veya dosya seçiciyle gelen `File` nesnelerinin diskteki yolu
  `webUtils.getPathForFile()` ile alınır; dosya belleğe kopyalanmaz.
* **Argümanlar renderer'da üretilir** (`buildFFmpegArgs`) ve ana süreçte doğrulanır: son geçişin
  çıktısı mutlaka ana sürecin hazırladığı yol olmalıdır.

### FFmpeg seçimi

`electron/ffmpeg-tools.cjs` şu sırayla karar verir:

1. `VCA_FFMPEG_PATH` (ve isteğe bağlı `VCA_FFPROBE_PATH`) ortam değişkeni
2. Sistemdeki `ffmpeg`, **çalışan bir GPU kodlayıcısı varsa** ve paketli olanda yoksa
3. Uygulamayla gelen `ffmpeg-static` / `ffprobe-static`
4. Sistemdeki `ffmpeg`

GPU kodlayıcıları sadece listelenmesine bakılarak değil, 3 karelik deneme kodlamasıyla doğrulanır
(sürücüsü olmayan bir NVENC "var" görünür ama çalışmaz).

> Not: Linux için `ffmpeg-static` statik derlemesinde GPU kodlayıcı yoktur. Linux'ta NVENC/QSV
> kullanmak için sisteme FFmpeg kurun (`apt install ffmpeg`), uygulama onu otomatik tercih eder.
> Windows ve macOS derlemeleri genellikle NVENC/QSV/AMF ve VideoToolbox içerir; içermiyorsa veya
> sürücü eksikse uygulama CPU kodlayıcılarına düşer. Ayarlar sayfası hangi FFmpeg'in ve hangi GPU
> kodlayıcıların kullanıldığını gösterir.

### Güvenlik

* `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`
* Renderer sadece `window.vcaDesktop` üzerindeki sınırlı fonksiyonlara erişir.
* Uygulama dışındaki adresler pencere içinde açılmaz, sistem tarayıcısına yönlendirilir.
* "Aç / Klasörde göster / Kalite ölç" yalnızca bu oturumda üretilen çıktı dosyalarında çalışır.
* `app://` protokolü `out/` dışına çıkan yolları reddeder.

## Geliştirme

```bash
npm install            # Electron + ffmpeg-static + ffprobe-static indirilir
npm run desktop:dev    # Next dev sunucusu (3210) + Electron, sıcak yenileme ile
npm run desktop:start  # Üretim derlemesi + Electron (out/ klasöründen)
```

## Kurulum dosyası üretme

```bash
npm run desktop:dist:win     # Windows: NSIS kurulum + taşınabilir .exe
npm run desktop:dist:mac     # macOS: .dmg
npm run desktop:dist:linux   # Linux: AppImage + .deb
npm run desktop:pack         # Sadece klasör (hızlı deneme): release/<platform>-unpacked
```

`ffmpeg-static` kurulum sırasında **üzerinde çalıştığı işletim sisteminin** FFmpeg'ini indirir.
Bu yüzden her platformun paketini o platformda üretin. `.github/workflows/desktop.yml` bunu
otomatik yapar: `v1.0.0` gibi bir etiket gönderdiğinizde üç işletim sistemi için paket üretir ve
artifact olarak yükler.

### İmzalama

* **macOS:** İmzasız `.dmg` açılırken Gatekeeper uyarır. Apple Developer sertifikasını
  `MAC_CERT_P12_BASE64` / `MAC_CERT_PASSWORD` gizli değişkenleri olarak ekleyin; notarization için
  `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` gerekir.
* **Windows:** İmzasız `.exe` SmartScreen uyarısı verir. Bir kod imzalama sertifikası
  (`WIN_CSC_LINK`, `WIN_CSC_KEY_PASSWORD`) ekleyebilirsiniz.

### Boyut

Paket boyutunun büyük kısmı Electron (~200 MB açılmış) ve FFmpeg + ffprobe ikili dosyalarıdır
(~140 MB). Uygulamanın kendisi ~3 MB'tır. Kurulum dosyaları sıkıştırıldığı için ~120–160 MB olur.
Daha küçük bir paket için bkz. "Sonraki adımlar → Tauri".

## Sınırlamalar ve bilinen konular

* Masaüstünde çıktı önizlemesi / "Orijinalle karşılaştır" henüz yok (çıktı diskte; "Aç" ile
  sistem oynatıcısında açılır). Çözüm: `vca-media://` gibi, aralık (Range) isteklerini destekleyen
  ve sadece bilinen çıktılara izin veren bir protokol eklemek.
* Otomatik güncelleme (electron-updater) yapılandırılmadı.
* VAAPI (Linux, Intel/AMD) donanım kodlama `hwupload` filtresi gerektirdiği için henüz yok.
