export type Language = "tr" | "en";

export const translations = {
  tr: {
    // Navigation
    "nav.home": "Ana Sayfa",
    "nav.settings": "Ayarlar",
    "nav.ffmpegGuide": "FFmpeg Rehberi",
    "nav.compare": "Karşılaştır",
    "app.title": "Video Sıkıştırma Analiz Aracı",
    "app.subtitle":
      "Video dosyalarınız için optimal sıkıştırma ayarlarını analiz edin",

    // Video Analysis Page
    "analysis.title": "Video Analiz ve Sıkıştırma",
    "analysis.videosLoaded": "video yüklendi",
    "analysis.analysisCompleted": "analiz tamamlandı",
    "analysis.addVideo": "Video Ekle",
    "analysis.newAnalysis": "Yeni Analiz",

    // Compression Presets
    "presets.title": "Sıkıştırma Ön Ayarları",
    "presets.subtitle": "Video türü ve kalite seviyesi seçin",
    "presets.videoType": "Video Türü:",
    "presets.qualityLevel": "Kalite Seviyesi:",
    "presets.selectedInfo":
      "Seçili ön ayar videolar yüklendikten sonra uygulanacak",
    "presets.willBeApplied":
      "Bu ön ayar videolar yüklendikten sonra otomatik olarak uygulanacak",

    // Video Card
    "video.current": "Mevcut",
    "video.recommended": "Önerilen",
    "video.codec": "Codec:",
    "video.resolution": "Çözünürlük:",
    "video.bitrate": "Bitrate:",
    "video.fps": "FPS:",
    "video.audioBitrate": "Ses Bitrate:",
    "video.audioCodec": "Ses Codec:",
    "video.crf": "CRF:",
    "video.quality": "Quality:",
    "video.preset": "Preset:",
    "video.pixelFormat": "Pixel Format:",
    "video.estimatedSize": "Tahmini Boyut:",
    "video.savings": "Tasarruf:",
    "video.estimatedTime": "Tahmini Süre:",
    "video.ffmpegCommand": "FFmpeg Komutu:",
    "video.copyFullCommand": "Tam komutu kopyala",
    "video.copySettings": "JSON",
    "video.copied": "Kopyalandı",
    "video.otherCodecs": "Diğer codec seçenekleri:",
    "video.fileSize": "dosya boyutu",
    "video.duration": "süre",

    // Parameter Impact
    "impact.title": "Parametre Etki Analizi",
    "impact.subtitle":
      "Seçili ayarların video kalitesi ve boyutu üzerindeki etkisi",
    "impact.sizeSavings": "Boyut Tasarrufu",
    "impact.averageTime": "Ortalama Süre",
    "impact.parameterEffects": "Parametre Etkileri",
    "impact.generalAssessment": "Genel Değerlendirme",
    "impact.fileSize": "Dosya Boyutu",
    "impact.quality": "Kalite",
    "impact.time": "Süre",
    "impact.recommended": "Önerilen",
    "impact.medium": "Orta",
    "impact.warning": "Dikkat",

    // File Uploader
    "upload.title": "Video dosyalarını yükleyin",
    "upload.dragDrop":
      "Video dosyalarınızı sürükleyip bırakın veya seçmek için tıklayın",
    "upload.dropFiles": "Dosyaları buraya bırakın",
    "upload.selectFile": "Dosya Seç",
    "upload.selectFolder": "Klasör Seç",
    "upload.supportedFormats":
      "Desteklenen formatlar: MP4, AVI, MOV, MKV, WebM, FLV, WMV ve daha fazlası",

    // Common
    "common.loading": "Yükleniyor...",
    "common.analyzing": "Analiz ediliyor...",
    "common.waiting": "Bekleniyor...",
    "common.error": "Hata",
    "common.close": "Kapat",
    "common.selectAll": "Tümünü seç",
    "common.clearAll": "Tümünü Temizle",
    "common.delete": "Sil",
    "common.videoFile": "video dosyası",
    "common.videoFiles": "video dosyası",
    "common.loaded": "yüklendi",
    "common.completed": "tamamlandı",

    // Video Results
    "results.title": "Video Analiz Sonuçları",
    "results.batchScript": "Batch Script (.bat)",
    "results.bashScript": "Bash Script (.sh)",
    "results.deleteSelected": "Sil",

    // Errors
    "error.videoAdd": "Video eklenirken hata oluştu",
    "error.clear": "Temizleme sırasında hata oluştu",
    "error.folderSelect": "Klasör seçilirken hata",
    "error.unknown": "Bilinmeyen hata",

    // Status
    "status.analyzing": "Analiz ediliyor...",
    "status.waiting": "Bekleniyor...",

    // Features
    "features.title": "Özellikler",
    "features.smartAnalysis.title": "Akıllı Analiz",
    "features.smartAnalysis.description":
      "Video içeriğinize göre optimal codec ve ayarları otomatik belirler",
    "features.multiCodec.title": "Çoklu Codec",
    "features.multiCodec.description":
      "H.264, H.265, VP9 ve AV1 codec'leri için öneriler",
    "features.customPresets.title": "Özel Profiller",
    "features.customPresets.description":
      "Film, anime, oyun gibi içerik türlerine özel ayarlar",
    "features.compare.title": "Yan Yana Karşılaştırma",
    "features.compare.description":
      "İki videoyu senkronize şekilde karşılaştırın",
    "features.privacy.title": "Gizlilik Odaklı",
    "features.privacy.description":
      "Tüm işlemler tarayıcınızda yapılır, dosyalar yüklenmez",
    "features.ffmpegCommands.title": "FFmpeg Komutları",
    "features.ffmpegCommands.description":
      "Kopyala-yapıştır hazır FFmpeg komutları oluşturur",

    // How It Works
    "howItWorks.title": "Nasıl Çalışır?",
    "howItWorks.step1.title": "Video Yükle",
    "howItWorks.step1.description":
      "Video dosyanızı sürükleyip bırakın veya seçin",
    "howItWorks.step2.title": "Analiz Et",
    "howItWorks.step2.description":
      "Video otomatik analiz edilir ve öneriler oluşturulur",
    "howItWorks.step3.title": "Komutu Kopyala",
    "howItWorks.step3.description":
      "FFmpeg komutunu kopyalayıp terminalinizde çalıştırın",

    // Settings Page
    "settings.title": "Video Sıkıştırma Ayarları",
    "settings.subtitle":
      "Video sıkıştırma parametrelerinin detaylı açıklamaları",
    "settings.tabs.codecs": "Codec'ler",
    "settings.tabs.bitrate": "Bitrate",
    "settings.tabs.crf": "CRF/Quality",
    "settings.tabs.presets": "Preset'ler",
    "settings.advantages": "Avantajlar:",
    "settings.disadvantages": "Dezavantajlar:",
    "settings.recommendations": "Kullanım Önerileri:",

    // Codecs
    "settings.codec.h264.title": "H.264 (AVC)",
    "settings.codec.h264.description": "En yaygın kullanılan video codec'i",
    "settings.codec.h264.adv1": "Geniş cihaz ve platform desteği",
    "settings.codec.h264.adv2": "Hızlı encoding süresi",
    "settings.codec.h264.adv3": "Düşük CPU kullanımı",
    "settings.codec.h264.adv4": "Yaygın uyumluluk",
    "settings.codec.h264.dis1":
      "Daha büyük dosya boyutları (diğer modern codec'lere göre)",
    "settings.codec.h264.dis2": "Daha düşük sıkıştırma oranı",
    "settings.codec.h264.rec":
      "Geniş uyumluluk gerektiren durumlarda, web yayıncılığında ve eski cihazlarda oynatma için idealdir.",

    "settings.codec.h265.title": "H.265 (HEVC)",
    "settings.codec.h265.description": "H.264'ün gelişmiş versiyonu",
    "settings.codec.h265.adv1": "H.264'e göre %50 daha iyi sıkıştırma",
    "settings.codec.h265.adv2": "4K ve yüksek çözünürlük için optimize",
    "settings.codec.h265.adv3": "Daha küçük dosya boyutları",
    "settings.codec.h265.adv4": "Modern cihazlarda iyi destek",
    "settings.codec.h265.dis1": "Daha yavaş encoding",
    "settings.codec.h265.dis2": "Yüksek CPU kullanımı",
    "settings.codec.h265.dis3": "Eski cihazlarda uyumluluk sorunları",
    "settings.codec.h265.dis4": "Lisans maliyetleri (ticari kullanım için)",
    "settings.codec.h265.rec":
      "Yüksek kaliteli içerik, 4K videolar ve modern platformlar için idealdir. Dosya boyutu önemliyse tercih edilmelidir.",

    "settings.codec.vp9.title": "VP9",
    "settings.codec.vp9.description": "Google'ın açık kaynak codec'i",
    "settings.codec.vp9.adv1": "Tamamen ücretsiz ve açık kaynak",
    "settings.codec.vp9.adv2": "H.264'e göre daha iyi sıkıştırma",
    "settings.codec.vp9.adv3": "Web için optimize edilmiş",
    "settings.codec.vp9.adv4":
      "YouTube ve diğer Google servislerinde yaygın kullanım",
    "settings.codec.vp9.dis1": "Çok yavaş encoding",
    "settings.codec.vp9.dis2": "Sınırlı cihaz desteği",
    "settings.codec.vp9.dis3": "Yüksek CPU kullanımı",
    "settings.codec.vp9.rec":
      "Web yayıncılığı, YouTube yüklemeleri ve açık kaynak projeler için idealdir.",

    "settings.codec.av1.title": "AV1",
    "settings.codec.av1.description": "En yeni ve en verimli codec",
    "settings.codec.av1.adv1":
      "En iyi sıkıştırma oranı (H.265'ten %30 daha iyi)",
    "settings.codec.av1.adv2": "Tamamen ücretsiz ve açık kaynak",
    "settings.codec.av1.adv3": "Gelecek için hazır",
    "settings.codec.av1.adv4": "Netflix, YouTube gibi platformlarda kullanım",
    "settings.codec.av1.dis1": "Çok yavaş encoding (10-20x daha yavaş)",
    "settings.codec.av1.dis2": "Çok yüksek CPU kullanımı",
    "settings.codec.av1.dis3": "Sınırlı cihaz desteği (henüz)",
    "settings.codec.av1.dis4": "Yeni teknoloji, henüz tam olgunlaşmadı",
    "settings.codec.av1.rec":
      "Gelecek odaklı projeler, büyük ölçekli yayıncılık ve maksimum sıkıştırma gerektiren durumlar için idealdir. Encoding süresi önemli değilse tercih edilebilir.",

    // Bitrate
    "settings.bitrate.title": "Bitrate Nedir?",
    "settings.bitrate.description":
      "Video kalitesini belirleyen temel parametre",
    "settings.bitrate.intro":
      "Bitrate, saniyede işlenen veri miktarını belirtir. Genellikle Mbps (megabit per second) veya Kbps (kilobit per second) olarak ölçülür.",
    "settings.bitrate.high": "Yüksek Bitrate:",
    "settings.bitrate.high1": "Daha yüksek görüntü kalitesi",
    "settings.bitrate.high2": "Daha büyük dosya boyutu",
    "settings.bitrate.high3": "Daha fazla bant genişliği gereksinimi",
    "settings.bitrate.low": "Düşük Bitrate:",
    "settings.bitrate.low1": "Daha küçük dosya boyutu",
    "settings.bitrate.low2": "Daha düşük görüntü kalitesi",
    "settings.bitrate.low3": "Daha az bant genişliği gereksinimi",
    "settings.bitrate.recommended": "Önerilen Bitrate Değerleri:",

    // CRF
    "settings.crf.title": "CRF (Constant Rate Factor)",
    "settings.crf.description": "Kalite tabanlı encoding parametresi",
    "settings.crf.intro":
      "CRF, sabit kalite modunda encoding yapmanızı sağlar. Bitrate yerine kaliteyi hedef alır, böylece dosya boyutu otomatik olarak ayarlanır.",
    "settings.crf.range": "CRF Değer Aralığı (H.264/H.265):",
    "settings.crf.range1": "Görsel olarak kayıpsız (çok büyük dosyalar)",
    "settings.crf.range2": "Yüksek kalite (önerilen: 23)",
    "settings.crf.range3": "İyi kalite (önerilen: 28)",
    "settings.crf.range4": "Orta kalite",
    "settings.crf.range5": "Düşük kalite (önerilmez)",
    "settings.crf.vp9av1": "VP9/AV1 Quality Değerleri:",
    "settings.crf.vp9av1.intro":
      "VP9 ve AV1 farklı bir ölçek kullanır (0-63 arası). Daha yüksek değerler daha iyi kalite anlamına gelir.",
    "settings.crf.vp9av1.1": "Yüksek kalite (önerilen)",
    "settings.crf.vp9av1.2": "İyi kalite",
    "settings.crf.vp9av1.3": "Orta kalite",
    "settings.crf.vs": "CRF vs Bitrate:",
    "settings.crf.vs.text":
      "CRF kullanıldığında, video içeriğine göre bitrate otomatik ayarlanır. Karmaşık sahneler daha fazla, basit sahneler daha az bitrate alır. Bu, genellikle daha iyi kalite/sıkıştırma dengesi sağlar.",

    // Presets
    "settings.presets.title": "Encoding Preset'leri",
    "settings.presets.description": "Encoding hızı ve sıkıştırma dengesi",
    "settings.presets.intro":
      "Preset'ler encoding hızını ve sıkıştırma verimliliğini kontrol eder. Daha yavaş preset'ler daha iyi sıkıştırma sağlar ancak daha uzun sürer.",
    "settings.presets.ultrafast": "ultrafast / superfast / veryfast",
    "settings.presets.ultrafast.desc":
      "Çok hızlı encoding, düşük sıkıştırma. Canlı yayın ve hızlı testler için uygundur.",
    "settings.presets.fast": "faster / fast",
    "settings.presets.fast.desc":
      "Hızlı encoding, orta sıkıştırma. Genel kullanım için iyi bir denge.",
    "settings.presets.medium": "medium",
    "settings.presets.medium.desc":
      "Varsayılan preset. Hız ve sıkıştırma arasında iyi denge.",
    "settings.presets.slow": "slow / slower / veryslow",
    "settings.presets.slow.desc":
      "Yavaş encoding, en iyi sıkıştırma. Dosya boyutu önemliyse ve zaman varsa önerilir.",
    "settings.presets.suggestions": "Öneriler:",
    "settings.presets.sug1": "Hızlı testler için:",
    "settings.presets.sug2": "Genel kullanım için:",
    "settings.presets.sug3": "Maksimum sıkıştırma için:",
    "settings.presets.sug4": "Çok büyük dosyalar için:",

    // FFmpeg Guide Page
    "guide.title": "FFmpeg Kullanım Rehberi",
    "guide.subtitle":
      "FFmpeg komut satırı kullanımı, örnekler ve en iyi pratikler",
    "guide.tabs.basics": "Temel Kullanım",
    "guide.tabs.codecs": "Codec Örnekleri",
    "guide.tabs.tips": "İpuçları",
    "guide.tabs.common": "Yaygın Hatalar",

    // Guide - Basics
    "guide.basics.structure.title": "FFmpeg Temel Komut Yapısı",
    "guide.basics.structure.description": "FFmpeg komutlarının genel formatı",
    "guide.basics.parameters": "Temel Parametreler:",
    "guide.basics.param.i": "Giriş dosyası",
    "guide.basics.param.cv": "Video codec seçimi",
    "guide.basics.param.ca": "Audio codec seçimi",
    "guide.basics.param.bv": "Video bitrate",
    "guide.basics.param.ba": "Audio bitrate",
    "guide.basics.param.crf": "Kalite faktörü (CRF modu)",
    "guide.basics.param.preset": "Encoding hızı",
    "guide.basics.param.vf": "Video filtreleri (scale, crop, vb.)",
    "guide.basics.install.title": "FFmpeg Kurulumu",
    "guide.basics.install.windows": "Windows:",
    "guide.basics.install.windows.choco": "# Chocolatey ile",
    "guide.basics.install.windows.manual":
      "# Veya manuel olarak https://ffmpeg.org/download.html",
    "guide.basics.install.macos": "macOS:",
    "guide.basics.install.macos.brew": "# Homebrew ile",
    "guide.basics.install.linux": "Linux:",

    // Guide - Codecs
    "guide.codecs.h264.title": "H.264 Encoding",
    "guide.codecs.h264.crf": "CRF Modu (Önerilen):",
    "guide.codecs.h264.bitrate": "Bitrate Modu:",
    "guide.codecs.h265.title": "H.265 (HEVC) Encoding",
    "guide.codecs.h265.crf": "CRF Modu:",
    "guide.codecs.h265.bitrate": "Bitrate Modu:",
    "guide.codecs.vp9.title": "VP9 Encoding",
    "guide.codecs.vp9.quality": "Quality Modu:",
    "guide.codecs.vp9.bitrate": "Bitrate Modu:",
    "guide.codecs.av1.title": "AV1 Encoding",
    "guide.codecs.av1.quality": "Quality Modu:",
    "guide.codecs.av1.note": "Not:",
    "guide.codecs.av1.note.text":
      "AV1 encoding çok yavaştır. CPU-thread parametresi ekleyerek hızlandırabilirsiniz:",

    // Guide - Tips
    "guide.tips.performance.title": "Performans İpuçları",
    "guide.tips.hwaccel.title": "1. Hardware Acceleration Kullanın",
    "guide.tips.hwaccel.desc":
      "GPU kullanarak encoding hızını önemli ölçüde artırabilirsiniz:",
    "guide.tips.threads.title": "2. Çoklu Thread Kullanın",
    "guide.tips.twopass.title": "3. İki Pass Encoding",
    "guide.tips.twopass.desc": "Daha iyi kalite için iki aşamalı encoding:",
    "guide.tips.twopass.first": "# İlk pass",
    "guide.tips.twopass.second": "# İkinci pass",
    "guide.tips.scale.title": "Çözünürlük ve Ölçeklendirme",
    "guide.tips.scale.scaling": "Ölçeklendirme:",
    "guide.tips.scale.specific": "# Belirli çözünürlük",
    "guide.tips.scale.width": "# Genişliği koruyarak ölçekle",
    "guide.tips.scale.height": "# Yüksekliği koruyarak ölçekle",
    "guide.tips.scale.aspect": "Aspect Ratio Koruma:",
    "guide.tips.batch.title": "Batch Processing",
    "guide.tips.batch.process": "Tüm MP4 Dosyalarını İşle:",

    // Guide - Common Errors
    "guide.errors.title": "Yaygın Hatalar ve Çözümleri",
    "guide.errors.codec.title": '1. "Codec not found" Hatası',
    "guide.errors.codec.reason": "Sebep:",
    "guide.errors.codec.reason.text": "FFmpeg codec desteği ile derlenmemiş",
    "guide.errors.codec.solution": "Çözüm:",
    "guide.errors.codec.solution.text":
      "FFmpeg'i codec desteği ile yeniden derleyin veya farklı bir codec kullanın",
    "guide.errors.permission.title": '2. "Permission denied" Hatası',
    "guide.errors.permission.reason.text": "Dosya yazma izni yok",
    "guide.errors.permission.solution.text": "Çıktı dizinine yazma izni verin",
    "guide.errors.slow.title": "3. Çok Yavaş Encoding",
    "guide.errors.slow.reason.text": "Yavaş preset veya codec seçimi",
    "guide.errors.slow.solution.text":
      "Daha hızlı preset kullanın (fast, medium) veya hardware acceleration aktif edin",
    "guide.errors.large.title": "4. Dosya Boyutu Çok Büyük",
    "guide.errors.large.reason.text": "Yüksek bitrate veya düşük CRF değeri",
    "guide.errors.large.solution.text":
      "CRF değerini artırın (23 → 28) veya bitrate'i düşürün",
    "guide.errors.quality.title": "5. Kalite Düşük",
    "guide.errors.quality.reason.text": "Düşük bitrate veya yüksek CRF değeri",
    "guide.errors.quality.solution.text":
      "CRF değerini düşürün (28 → 23) veya bitrate'i artırın",

    // Compare Page
    "compare.title": "Video Karşılaştırma",
    "compare.selectVideos": "Videoları Seçin",
    "compare.selectDescription":
      "Karşılaştırmak için iki video dosyası seçin veya sürükleyip bırakın",
    "compare.video1": "Video 1",
    "compare.video2": "Video 2",
    "compare.back": "Geri",
    "compare.clear": "Temizle",
    "compare.syncOn": "Sync: Açık",
    "compare.syncOff": "Sync: Kapalı",
    "compare.reset": "Sıfırla",
    "compare.play": "Oynat",
    "compare.pause": "Duraklat",
    "compare.muted": "Sessiz",
    "compare.unmuted": "Sesli",
    "compare.zoom": "Zoom:",
    "compare.selectOrDrag": "Dosya seçin veya sürükleyin",
    "compare.videoFormats": "Video dosyaları (MP4, AVI, MOV, vb.)",
    "compare.orSelectAnalyzed": "Veya analiz edilmiş videolardan seçin:",
  },
  en: {
    // Navigation
    "nav.home": "Home",
    "nav.settings": "Settings",
    "nav.ffmpegGuide": "FFmpeg Guide",
    "nav.compare": "Compare",
    "app.title": "Video Compression Analysis Tool",
    "app.subtitle": "Analyze optimal compression settings for your video files",

    // Video Analysis Page
    "analysis.title": "Video Analysis and Compression",
    "analysis.videosLoaded": "videos loaded",
    "analysis.analysisCompleted": "analysis completed",
    "analysis.addVideo": "Add Video",
    "analysis.newAnalysis": "New Analysis",

    // Compression Presets
    "presets.title": "Compression Presets",
    "presets.subtitle": "Select video type and quality level",
    "presets.videoType": "Video Type:",
    "presets.qualityLevel": "Quality Level:",
    "presets.selectedInfo":
      "Selected preset will be applied after videos are uploaded",
    "presets.willBeApplied":
      "This preset will be automatically applied after videos are uploaded",

    // Video Card
    "video.current": "Current",
    "video.recommended": "Recommended",
    "video.codec": "Codec:",
    "video.resolution": "Resolution:",
    "video.bitrate": "Bitrate:",
    "video.fps": "FPS:",
    "video.audioBitrate": "Audio Bitrate:",
    "video.audioCodec": "Audio Codec:",
    "video.crf": "CRF:",
    "video.quality": "Quality:",
    "video.preset": "Preset:",
    "video.pixelFormat": "Pixel Format:",
    "video.estimatedSize": "Estimated Size:",
    "video.savings": "Savings:",
    "video.estimatedTime": "Estimated Time:",
    "video.ffmpegCommand": "FFmpeg Command:",
    "video.copyFullCommand": "Copy full command",
    "video.copySettings": "JSON",
    "video.copied": "Copied",
    "video.otherCodecs": "Other codec options:",
    "video.fileSize": "file size",
    "video.duration": "duration",

    // Parameter Impact
    "impact.title": "Parameter Impact Analysis",
    "impact.subtitle": "Effect of selected settings on video quality and size",
    "impact.sizeSavings": "Size Savings",
    "impact.averageTime": "Average Time",
    "impact.parameterEffects": "Parameter Effects",
    "impact.generalAssessment": "General Assessment",
    "impact.fileSize": "File Size",
    "impact.quality": "Quality",
    "impact.time": "Time",
    "impact.recommended": "Recommended",
    "impact.medium": "Medium",
    "impact.warning": "Warning",

    // File Uploader
    "upload.title": "Upload video files",
    "upload.dragDrop": "Drag and drop your video files or click to select",
    "upload.dropFiles": "Drop files here",
    "upload.selectFile": "Select File",
    "upload.selectFolder": "Select Folder",
    "upload.supportedFormats":
      "Supported formats: MP4, AVI, MOV, MKV, WebM, FLV, WMV and more",

    // Common
    "common.loading": "Loading...",
    "common.analyzing": "Analyzing...",
    "common.waiting": "Waiting...",
    "common.error": "Error",
    "common.close": "Close",
    "common.selectAll": "Select All",
    "common.clearAll": "Clear All",
    "common.delete": "Delete",
    "common.videoFile": "video file",
    "common.videoFiles": "video files",
    "common.loaded": "loaded",
    "common.completed": "completed",

    // Video Results
    "results.title": "Video Analysis Results",
    "results.batchScript": "Batch Script (.bat)",
    "results.bashScript": "Bash Script (.sh)",
    "results.deleteSelected": "Delete",

    // Errors
    "error.videoAdd": "Error occurred while adding video",
    "error.clear": "Error occurred while clearing",
    "error.folderSelect": "Error selecting folder",
    "error.unknown": "Unknown error",

    // Status
    "status.analyzing": "Analyzing...",
    "status.waiting": "Waiting...",

    // Features
    "features.title": "Features",
    "features.smartAnalysis.title": "Smart Analysis",
    "features.smartAnalysis.description":
      "Automatically determines optimal codec and settings for your video content",
    "features.multiCodec.title": "Multi Codec",
    "features.multiCodec.description":
      "Recommendations for H.264, H.265, VP9 and AV1 codecs",
    "features.customPresets.title": "Custom Presets",
    "features.customPresets.description":
      "Content-specific settings for movies, anime, gaming and more",
    "features.compare.title": "Side-by-Side Compare",
    "features.compare.description":
      "Compare two videos in synchronized playback",
    "features.privacy.title": "Privacy Focused",
    "features.privacy.description":
      "All processing happens in your browser, files are never uploaded",
    "features.ffmpegCommands.title": "FFmpeg Commands",
    "features.ffmpegCommands.description":
      "Generates ready-to-use FFmpeg commands",

    // How It Works
    "howItWorks.title": "How It Works",
    "howItWorks.step1.title": "Upload Video",
    "howItWorks.step1.description": "Drag and drop or select your video file",
    "howItWorks.step2.title": "Analyze",
    "howItWorks.step2.description":
      "Video is automatically analyzed and recommendations are generated",
    "howItWorks.step3.title": "Copy Command",
    "howItWorks.step3.description":
      "Copy the FFmpeg command and run it in your terminal",

    // Settings Page
    "settings.title": "Video Compression Settings",
    "settings.subtitle":
      "Detailed explanations of video compression parameters",
    "settings.tabs.codecs": "Codecs",
    "settings.tabs.bitrate": "Bitrate",
    "settings.tabs.crf": "CRF/Quality",
    "settings.tabs.presets": "Presets",
    "settings.advantages": "Advantages:",
    "settings.disadvantages": "Disadvantages:",
    "settings.recommendations": "Usage Recommendations:",

    // Codecs
    "settings.codec.h264.title": "H.264 (AVC)",
    "settings.codec.h264.description": "The most commonly used video codec",
    "settings.codec.h264.adv1": "Wide device and platform support",
    "settings.codec.h264.adv2": "Fast encoding time",
    "settings.codec.h264.adv3": "Low CPU usage",
    "settings.codec.h264.adv4": "Widespread compatibility",
    "settings.codec.h264.dis1":
      "Larger file sizes (compared to other modern codecs)",
    "settings.codec.h264.dis2": "Lower compression ratio",
    "settings.codec.h264.rec":
      "Ideal for situations requiring wide compatibility, web broadcasting, and playback on older devices.",

    "settings.codec.h265.title": "H.265 (HEVC)",
    "settings.codec.h265.description": "Advanced version of H.264",
    "settings.codec.h265.adv1": "50% better compression than H.264",
    "settings.codec.h265.adv2": "Optimized for 4K and high resolution",
    "settings.codec.h265.adv3": "Smaller file sizes",
    "settings.codec.h265.adv4": "Good support on modern devices",
    "settings.codec.h265.dis1": "Slower encoding",
    "settings.codec.h265.dis2": "High CPU usage",
    "settings.codec.h265.dis3": "Compatibility issues on older devices",
    "settings.codec.h265.dis4": "License costs (for commercial use)",
    "settings.codec.h265.rec":
      "Ideal for high-quality content, 4K videos, and modern platforms. Should be preferred when file size is important.",

    "settings.codec.vp9.title": "VP9",
    "settings.codec.vp9.description": "Google's open source codec",
    "settings.codec.vp9.adv1": "Completely free and open source",
    "settings.codec.vp9.adv2": "Better compression than H.264",
    "settings.codec.vp9.adv3": "Optimized for web",
    "settings.codec.vp9.adv4":
      "Widespread use on YouTube and other Google services",
    "settings.codec.vp9.dis1": "Very slow encoding",
    "settings.codec.vp9.dis2": "Limited device support",
    "settings.codec.vp9.dis3": "High CPU usage",
    "settings.codec.vp9.rec":
      "Ideal for web broadcasting, YouTube uploads, and open source projects.",

    "settings.codec.av1.title": "AV1",
    "settings.codec.av1.description": "The newest and most efficient codec",
    "settings.codec.av1.adv1": "Best compression ratio (30% better than H.265)",
    "settings.codec.av1.adv2": "Completely free and open source",
    "settings.codec.av1.adv3": "Future-ready",
    "settings.codec.av1.adv4": "Used on platforms like Netflix, YouTube",
    "settings.codec.av1.dis1": "Very slow encoding (10-20x slower)",
    "settings.codec.av1.dis2": "Very high CPU usage",
    "settings.codec.av1.dis3": "Limited device support (yet)",
    "settings.codec.av1.dis4": "New technology, not yet fully mature",
    "settings.codec.av1.rec":
      "Ideal for future-focused projects, large-scale broadcasting, and situations requiring maximum compression. Can be preferred if encoding time is not important.",

    // Bitrate
    "settings.bitrate.title": "What is Bitrate?",
    "settings.bitrate.description":
      "The fundamental parameter that determines video quality",
    "settings.bitrate.intro":
      "Bitrate specifies the amount of data processed per second. Usually measured in Mbps (megabit per second) or Kbps (kilobit per second).",
    "settings.bitrate.high": "High Bitrate:",
    "settings.bitrate.high1": "Higher image quality",
    "settings.bitrate.high2": "Larger file size",
    "settings.bitrate.high3": "More bandwidth requirement",
    "settings.bitrate.low": "Low Bitrate:",
    "settings.bitrate.low1": "Smaller file size",
    "settings.bitrate.low2": "Lower image quality",
    "settings.bitrate.low3": "Less bandwidth requirement",
    "settings.bitrate.recommended": "Recommended Bitrate Values:",

    // CRF
    "settings.crf.title": "CRF (Constant Rate Factor)",
    "settings.crf.description": "Quality-based encoding parameter",
    "settings.crf.intro":
      "CRF allows you to encode in constant quality mode. It targets quality instead of bitrate, so file size is automatically adjusted.",
    "settings.crf.range": "CRF Value Range (H.264/H.265):",
    "settings.crf.range1": "Visually lossless (very large files)",
    "settings.crf.range2": "High quality (recommended: 23)",
    "settings.crf.range3": "Good quality (recommended: 28)",
    "settings.crf.range4": "Medium quality",
    "settings.crf.range5": "Low quality (not recommended)",
    "settings.crf.vp9av1": "VP9/AV1 Quality Values:",
    "settings.crf.vp9av1.intro":
      "VP9 and AV1 use a different scale (0-63). Higher values mean better quality.",
    "settings.crf.vp9av1.1": "High quality (recommended)",
    "settings.crf.vp9av1.2": "Good quality",
    "settings.crf.vp9av1.3": "Medium quality",
    "settings.crf.vs": "CRF vs Bitrate:",
    "settings.crf.vs.text":
      "When CRF is used, bitrate is automatically adjusted according to video content. Complex scenes get more, simple scenes get less bitrate. This usually provides a better quality/compression balance.",

    // Presets
    "settings.presets.title": "Encoding Presets",
    "settings.presets.description": "Encoding speed and compression balance",
    "settings.presets.intro":
      "Presets control encoding speed and compression efficiency. Slower presets provide better compression but take longer.",
    "settings.presets.ultrafast": "ultrafast / superfast / veryfast",
    "settings.presets.ultrafast.desc":
      "Very fast encoding, low compression. Suitable for live streaming and quick tests.",
    "settings.presets.fast": "faster / fast",
    "settings.presets.fast.desc":
      "Fast encoding, medium compression. Good balance for general use.",
    "settings.presets.medium": "medium",
    "settings.presets.medium.desc":
      "Default preset. Good balance between speed and compression.",
    "settings.presets.slow": "slow / slower / veryslow",
    "settings.presets.slow.desc":
      "Slow encoding, best compression. Recommended when file size is important and time is available.",
    "settings.presets.suggestions": "Suggestions:",
    "settings.presets.sug1": "For quick tests:",
    "settings.presets.sug2": "For general use:",
    "settings.presets.sug3": "For maximum compression:",
    "settings.presets.sug4": "For very large files:",

    // FFmpeg Guide Page
    "guide.title": "FFmpeg Usage Guide",
    "guide.subtitle": "FFmpeg command line usage, examples and best practices",
    "guide.tabs.basics": "Basic Usage",
    "guide.tabs.codecs": "Codec Examples",
    "guide.tabs.tips": "Tips",
    "guide.tabs.common": "Common Errors",

    // Guide - Basics
    "guide.basics.structure.title": "FFmpeg Basic Command Structure",
    "guide.basics.structure.description": "General format of FFmpeg commands",
    "guide.basics.parameters": "Basic Parameters:",
    "guide.basics.param.i": "Input file",
    "guide.basics.param.cv": "Video codec selection",
    "guide.basics.param.ca": "Audio codec selection",
    "guide.basics.param.bv": "Video bitrate",
    "guide.basics.param.ba": "Audio bitrate",
    "guide.basics.param.crf": "Quality factor (CRF mode)",
    "guide.basics.param.preset": "Encoding speed",
    "guide.basics.param.vf": "Video filters (scale, crop, etc.)",
    "guide.basics.install.title": "FFmpeg Installation",
    "guide.basics.install.windows": "Windows:",
    "guide.basics.install.windows.choco": "# With Chocolatey",
    "guide.basics.install.windows.manual":
      "# Or manually from https://ffmpeg.org/download.html",
    "guide.basics.install.macos": "macOS:",
    "guide.basics.install.macos.brew": "# With Homebrew",
    "guide.basics.install.linux": "Linux:",

    // Guide - Codecs
    "guide.codecs.h264.title": "H.264 Encoding",
    "guide.codecs.h264.crf": "CRF Mode (Recommended):",
    "guide.codecs.h264.bitrate": "Bitrate Mode:",
    "guide.codecs.h265.title": "H.265 (HEVC) Encoding",
    "guide.codecs.h265.crf": "CRF Mode:",
    "guide.codecs.h265.bitrate": "Bitrate Mode:",
    "guide.codecs.vp9.title": "VP9 Encoding",
    "guide.codecs.vp9.quality": "Quality Mode:",
    "guide.codecs.vp9.bitrate": "Bitrate Mode:",
    "guide.codecs.av1.title": "AV1 Encoding",
    "guide.codecs.av1.quality": "Quality Mode:",
    "guide.codecs.av1.note": "Note:",
    "guide.codecs.av1.note.text":
      "AV1 encoding is very slow. You can speed it up by adding CPU-thread parameter:",

    // Guide - Tips
    "guide.tips.performance.title": "Performance Tips",
    "guide.tips.hwaccel.title": "1. Use Hardware Acceleration",
    "guide.tips.hwaccel.desc":
      "You can significantly increase encoding speed by using GPU:",
    "guide.tips.threads.title": "2. Use Multiple Threads",
    "guide.tips.twopass.title": "3. Two Pass Encoding",
    "guide.tips.twopass.desc": "Two-stage encoding for better quality:",
    "guide.tips.twopass.first": "# First pass",
    "guide.tips.twopass.second": "# Second pass",
    "guide.tips.scale.title": "Resolution and Scaling",
    "guide.tips.scale.scaling": "Scaling:",
    "guide.tips.scale.specific": "# Specific resolution",
    "guide.tips.scale.width": "# Scale preserving width",
    "guide.tips.scale.height": "# Scale preserving height",
    "guide.tips.scale.aspect": "Aspect Ratio Preservation:",
    "guide.tips.batch.title": "Batch Processing",
    "guide.tips.batch.process": "Process All MP4 Files:",

    // Guide - Common Errors
    "guide.errors.title": "Common Errors and Solutions",
    "guide.errors.codec.title": '1. "Codec not found" Error',
    "guide.errors.codec.reason": "Reason:",
    "guide.errors.codec.reason.text": "FFmpeg not compiled with codec support",
    "guide.errors.codec.solution": "Solution:",
    "guide.errors.codec.solution.text":
      "Recompile FFmpeg with codec support or use a different codec",
    "guide.errors.permission.title": '2. "Permission denied" Error',
    "guide.errors.permission.reason.text": "No file write permission",
    "guide.errors.permission.solution.text":
      "Give write permission to output directory",
    "guide.errors.slow.title": "3. Very Slow Encoding",
    "guide.errors.slow.reason.text": "Slow preset or codec selection",
    "guide.errors.slow.solution.text":
      "Use faster preset (fast, medium) or enable hardware acceleration",
    "guide.errors.large.title": "4. File Size Too Large",
    "guide.errors.large.reason.text": "High bitrate or low CRF value",
    "guide.errors.large.solution.text":
      "Increase CRF value (23 → 28) or decrease bitrate",
    "guide.errors.quality.title": "5. Low Quality",
    "guide.errors.quality.reason.text": "Low bitrate or high CRF value",
    "guide.errors.quality.solution.text":
      "Decrease CRF value (28 → 23) or increase bitrate",

    // Compare Page
    "compare.title": "Video Comparison",
    "compare.selectVideos": "Select Videos",
    "compare.selectDescription":
      "Select or drag and drop two video files to compare",
    "compare.video1": "Video 1",
    "compare.video2": "Video 2",
    "compare.back": "Back",
    "compare.clear": "Clear",
    "compare.syncOn": "Sync: On",
    "compare.syncOff": "Sync: Off",
    "compare.reset": "Reset",
    "compare.play": "Play",
    "compare.pause": "Pause",
    "compare.muted": "Muted",
    "compare.unmuted": "Unmuted",
    "compare.zoom": "Zoom:",
    "compare.selectOrDrag": "Select or drag file",
    "compare.videoFormats": "Video files (MP4, AVI, MOV, etc.)",
    "compare.orSelectAnalyzed": "Or select from analyzed videos:",
  },
} as const;

export type TranslationKey = keyof typeof translations.tr;
