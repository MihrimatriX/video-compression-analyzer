import { getFFmpeg } from "./ffmpeg-instance";
import { fetchFile } from "@ffmpeg/util";
import type { VideoMetadata } from "@/lib/types/video";

export async function analyzeVideo(file: File): Promise<VideoMetadata> {
  // FFmpeg.wasm için maksimum dosya boyutu limiti
  const FFMPEG_MAX_SIZE = 50 * 1024 * 1024; // 50MB
  const isLargeFile = file.size > FFMPEG_MAX_SIZE;

  // First, try to extract basic metadata using HTML5 Video API
  let basicMetadata: Omit<VideoMetadata, "thumbnail">;
  try {
    basicMetadata = await extractBasicMetadata(file);
  } catch (error) {
    console.warn(
      "HTML5 Video API ile metadata çıkarılamadı:",
      error instanceof Error ? error.message : String(error)
    );

    // Büyük dosyalarda FFmpeg'i atlayıp direkt minimal metadata kullan
    // FFmpeg.wasm tarayıcı bellek sınırlamaları nedeniyle büyük dosyaları işleyemez
    if (isLargeFile) {
      console.info(
        `Dosya çok büyük (${(file.size / 1024 / 1024).toFixed(2)}MB > 50MB). ` +
          "FFmpeg.wasm sınırlaması nedeniyle minimal metadata kullanılıyor. " +
          "Video yine de düzgün çalışacak, sadece bazı metadata tahmin edilecek."
      );
      basicMetadata = await extractMinimalMetadata(file);
    } else {
      // Küçük dosyalarda FFmpeg ile dene
      try {
        basicMetadata = await extractMetadataWithFFmpeg(file);
      } catch (ffmpegError) {
        const ffmpegErrorMessage =
          ffmpegError instanceof Error
            ? ffmpegError.message
            : String(ffmpegError);

        console.warn(
          "FFmpeg ile de metadata çıkarılamadı:",
          ffmpegErrorMessage
        );

        // Son çare: Minimal metadata ile devam et
        console.info(
          "Her iki yöntem de başarısız oldu, minimal metadata kullanılıyor"
        );
        basicMetadata = await extractMinimalMetadata(file);
      }
    }
  }

  // Then try to extract thumbnail
  // Büyük dosyalarda FFmpeg yerine direkt fallback kullan
  let thumbnail = "";

  if (isLargeFile) {
    // Büyük dosyalarda direkt fallback yöntemi kullan (HTML5 Video + Canvas)
    try {
      thumbnail = await extractThumbnailFallback(file);
      console.log(
        "Thumbnail (fallback) başarılı:",
        thumbnail ? "URL mevcut" : "URL yok"
      );
    } catch (fallbackError) {
      console.warn(
        "Thumbnail fallback başarısız oldu:",
        fallbackError instanceof Error
          ? fallbackError.message
          : String(fallbackError)
      );
      // Empty thumbnail is acceptable
      thumbnail = "";
    }
  } else {
    // Küçük dosyalarda FFmpeg dene
    try {
      thumbnail = await extractThumbnail(file);
      console.log(
        "Thumbnail başarıyla oluşturuldu:",
        thumbnail ? "URL mevcut" : "URL yok"
      );
    } catch (error) {
      console.warn(
        "Thumbnail oluşturulamadı, video element kullanılıyor:",
        error instanceof Error ? error.message : String(error)
      );
      // Fallback: use canvas to capture first frame
      try {
        thumbnail = await extractThumbnailFallback(file);
        console.log(
          "Thumbnail fallback başarılı:",
          thumbnail ? "URL mevcut" : "URL yok"
        );
      } catch (fallbackError) {
        console.warn(
          "Thumbnail fallback de başarısız oldu:",
          fallbackError instanceof Error
            ? fallbackError.message
            : String(fallbackError)
        );
        // Empty thumbnail is acceptable
        thumbnail = "";
      }
    }
  }

  // Thumbnail URL'inin geçerli olduğundan emin ol
  if (
    thumbnail &&
    !thumbnail.startsWith("blob:") &&
    !thumbnail.startsWith("data:")
  ) {
    console.warn("Geçersiz thumbnail URL:", thumbnail);
    thumbnail = "";
  }

  return {
    ...basicMetadata,
    thumbnail,
  };
}

async function extractBasicMetadata(
  file: File
): Promise<Omit<VideoMetadata, "thumbnail">> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    let isResolved = false;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.remove();
    };

    const getErrorMessage = (): string => {
      if (!video.error) {
        return "Video yüklenemedi (hata detayı yok)";
      }

      const error = video.error;
      const errorMessages: Record<number, string> = {
        1: "MEDIA_ERR_ABORTED - Video yükleme kullanıcı tarafından durduruldu",
        2: "MEDIA_ERR_NETWORK - Ağ hatası nedeniyle video yüklenemedi",
        3: "MEDIA_ERR_DECODE - Video decode edilemedi (codec desteklenmiyor olabilir)",
        4: "MEDIA_ERR_SRC_NOT_SUPPORTED - Video formatı desteklenmiyor",
      };

      const errorMessage =
        errorMessages[error.code] ||
        `MEDIA_ERR_UNKNOWN (kod: ${error.code}) - Video yüklenemedi`;

      return `Video metadata çıkarılamadı: ${errorMessage}. Codec: ${
        detectCodecFromFile(file).name
      }`;
    };

    const handleError = () => {
      if (isResolved) return;
      isResolved = true;
      cleanup();
      reject(new Error(getErrorMessage()));
    };

    const handleSuccess = () => {
      if (isResolved) return;
      isResolved = true;

      try {
        // Validate that we have essential metadata
        if (
          !video.videoWidth ||
          !video.videoHeight ||
          !video.duration ||
          isNaN(video.duration)
        ) {
          cleanup();
          reject(
            new Error(
              "Video metadata eksik: Genişlik, yükseklik veya süre bilgisi alınamadı"
            )
          );
          return;
        }

        // Estimate bitrate from file size and duration
        const estimatedBitrate =
          video.duration > 0 ? (file.size * 8) / video.duration : 0;

        // Try to detect codec from file extension or MIME type
        const codecInfo = detectCodecFromFile(file);

        // Estimate framerate (default to 30 if unknown)
        const framerate = estimateFramerate(video);

        const metadata: Omit<VideoMetadata, "thumbnail"> = {
          filename: file.name,
          fileSize: file.size,
          duration: video.duration || 0,
          codec: codecInfo.codec,
          codecName: codecInfo.name,
          bitrate: estimatedBitrate,
          width: video.videoWidth,
          height: video.videoHeight,
          framerate,
          pixelFormat: "yuv420p", // Default assumption
        };

        cleanup();
        resolve(metadata);
      } catch (error) {
        cleanup();
        reject(
          error instanceof Error
            ? error
            : new Error("Video metadata işlenirken hata oluştu")
        );
      }
    };

    // Set timeout (10 seconds)
    const timeoutId = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        cleanup();
        reject(
          new Error(
            "Video metadata çıkarılamadı: Zaman aşımı (10 saniye içinde yüklenemedi)"
          )
        );
      }
    }, 10000);

    video.addEventListener("loadedmetadata", () => {
      clearTimeout(timeoutId);
      handleSuccess();
    });

    video.addEventListener("error", () => {
      clearTimeout(timeoutId);
      handleError();
    });

    // Also listen for canplay event as fallback
    video.addEventListener("canplay", () => {
      if (!isResolved && video.readyState >= 2) {
        clearTimeout(timeoutId);
        handleSuccess();
      }
    });

    video.preload = "metadata";
    video.crossOrigin = "anonymous"; // Help with CORS issues
    video.muted = true; // Mute to help with autoplay restrictions
    video.src = url;
    video.load();
  });
}

function detectCodecFromFile(file: File): { codec: string; name: string } {
  const extension = file.name
    .toLowerCase()
    .substring(file.name.lastIndexOf("."));
  const mimeType = file.type.toLowerCase();

  if (
    mimeType.includes("h264") ||
    extension === ".mp4" ||
    extension === ".m4v"
  ) {
    return { codec: "h264", name: "H.264 (AVC)" };
  }
  if (mimeType.includes("hevc") || mimeType.includes("h265")) {
    return { codec: "h265", name: "H.265 (HEVC)" };
  }
  if (mimeType.includes("vp9") || extension === ".webm") {
    return { codec: "vp9", name: "VP9" };
  }
  if (mimeType.includes("vp8")) {
    return { codec: "vp8", name: "VP8" };
  }
  if (mimeType.includes("av1")) {
    return { codec: "av1", name: "AV1" };
  }

  // Default based on extension
  if (extension === ".avi") {
    return { codec: "unknown", name: "AVI (Codec bilinmiyor)" };
  }
  if (extension === ".mov") {
    return { codec: "unknown", name: "QuickTime (Codec bilinmiyor)" };
  }
  if (extension === ".mkv") {
    return { codec: "unknown", name: "Matroska (Codec bilinmiyor)" };
  }

  return { codec: "unknown", name: "Bilinmeyen Codec" };
}

function estimateFramerate(video: HTMLVideoElement): number {
  // Try to get framerate from video properties
  // This is a best-effort estimation
  // Most videos are 24, 25, 30, or 60 fps
  return 30; // Default assumption
}

/**
 * Minimal metadata extraction - sadece dosya bilgilerinden metadata oluşturur
 * HTML5 Video API ve FFmpeg her ikisi de başarısız olduğunda kullanılır
 */
async function extractMinimalMetadata(
  file: File
): Promise<Omit<VideoMetadata, "thumbnail">> {
  const codecInfo = detectCodecFromFile(file);

  // Dosya uzantısından çözünürlük tahmini (çok basit)
  const extension = file.name.toLowerCase();
  let estimatedWidth = 1920;
  let estimatedHeight = 1080;

  if (extension.includes("480p") || extension.includes("480")) {
    estimatedWidth = 854;
    estimatedHeight = 480;
  } else if (extension.includes("720p") || extension.includes("720")) {
    estimatedWidth = 1280;
    estimatedHeight = 720;
  } else if (extension.includes("1080p") || extension.includes("1080")) {
    estimatedWidth = 1920;
    estimatedHeight = 1080;
  } else if (extension.includes("4k") || extension.includes("2160")) {
    estimatedWidth = 3840;
    estimatedHeight = 2160;
  }

  // Dosya boyutundan süre tahmini (çok kaba bir tahmin)
  // Ortalama bitrate varsayımı: 2 Mbps
  const estimatedBitrate = 2 * 1000 * 1000; // 2 Mbps
  const estimatedDuration = (file.size * 8) / estimatedBitrate;

  return {
    filename: file.name,
    fileSize: file.size,
    duration: estimatedDuration || 0,
    codec: codecInfo.codec,
    codecName: codecInfo.name,
    bitrate: estimatedBitrate,
    width: estimatedWidth,
    height: estimatedHeight,
    framerate: 30, // Default
    pixelFormat: "yuv420p",
  };
}

async function extractMetadataWithFFmpeg(
  file: File
): Promise<Omit<VideoMetadata, "thumbnail">> {
  // FFmpeg instance'ının düzgün yüklendiğinden emin ol
  let ffmpeg;
  try {
    ffmpeg = await getFFmpeg();
  } catch (loadError) {
    throw new Error(
      `FFmpeg yüklenemedi: ${
        loadError instanceof Error ? loadError.message : String(loadError)
      }`
    );
  }

  // FFmpeg instance'ının geçerli olduğunu kontrol et
  if (!ffmpeg) {
    throw new Error("FFmpeg instance null veya undefined");
  }

  // FFmpeg'in hazır olduğunu kontrol et (loaded özelliği varsa)
  if ((ffmpeg as any).loaded === false) {
    throw new Error("FFmpeg instance henüz yüklenmedi");
  }

  // Daha güvenli dosya adı oluştur - uzunluk sınırı ve geçersiz karakterleri temizle
  // Windows ve Unix uyumlu dosya adı oluştur
  const sanitizedName = file.name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_") // Geçersiz karakterleri temizle
    .replace(/\s+/g, "_") // Boşlukları alt çizgi ile değiştir
    .replace(/_{2,}/g, "_") // Çoklu alt çizgileri tek yap
    .substring(0, 50); // Max 50 karakter (daha kısa, daha güvenli)

  const timestamp = Date.now();
  const extension = file.name.includes(".")
    ? file.name.substring(file.name.lastIndexOf("."))
    : ".mp4";
  const fileName = sanitizedName || `video_${timestamp}${extension}`;
  const logMessages: string[] = [];

  // Capture FFmpeg logs - add our handler alongside existing ones
  const logHandler = ({ message }: { message: string }) => {
    logMessages.push(message);
    // Also log to console for debugging
    console.log("[FFmpeg Metadata]", message);
  };

  try {
    // Add log handler
    ffmpeg.on("log", logHandler);

    // Dosya boyutu kontrolü (50MB limit - FFmpeg.wasm için daha güvenli limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      throw new Error(
        `Dosya çok büyük (${(file.size / 1024 / 1024).toFixed(
          2
        )}MB). FFmpeg.wasm için maksimum dosya boyutu 50MB'dır.`
      );
    }

    // Dosyayı güvenli bir şekilde yükle
    let fileData: Uint8Array;
    try {
      fileData = await fetchFile(file);

      // Dosya verisinin geçerli olduğunu kontrol et
      if (!fileData || fileData.length === 0) {
        throw new Error("Dosya verisi boş veya geçersiz");
      }

      if (fileData.length !== file.size) {
        console.warn(
          `Dosya boyutu uyuşmuyor: beklenen ${file.size}, alınan ${fileData.length}`
        );
      }
    } catch (fetchError) {
      throw new Error(
        `Dosya okunamadı: ${
          fetchError instanceof Error ? fetchError.message : String(fetchError)
        }`
      );
    }

    // Dosyayı FFmpeg FS'ine yaz - retry mekanizması ile
    let writeAttempts = 0;
    const maxWriteAttempts = 3;
    let writeSuccess = false;

    while (writeAttempts < maxWriteAttempts && !writeSuccess) {
      try {
        // Önce dosya varsa sil (temiz başlangıç)
        try {
          await ffmpeg.deleteFile(fileName);
        } catch {
          // Dosya yoksa hata vermez, devam et
        }

        // Dosyayı yaz
        await ffmpeg.writeFile(fileName, fileData);
        writeSuccess = true;
      } catch (writeError) {
        writeAttempts++;
        const errorMessage =
          writeError instanceof Error ? writeError.message : String(writeError);

        // FS error veya ErrnoError durumunda
        if (
          errorMessage.includes("FS") ||
          errorMessage.includes("ErrnoError") ||
          errorMessage.includes("ENOENT")
        ) {
          if (writeAttempts >= maxWriteAttempts) {
            // Son denemede de başarısız olduysa, daha detaylı hata mesajı ver
            throw new Error(
              `FFmpeg dosya sistemi hatası (${writeAttempts} deneme). ` +
                `Dosya çok büyük olabilir (${(file.size / 1024 / 1024).toFixed(
                  2
                )}MB), ` +
                `format desteklenmiyor olabilir, veya FFmpeg instance'ı hazır değil. ` +
                `Hata: ${errorMessage}`
            );
          }
          // Retry öncesi kısa bekleme
          await new Promise((resolve) =>
            setTimeout(resolve, 100 * writeAttempts)
          );
          continue;
        }
        // Diğer hatalar için direkt fırlat
        throw writeError;
      }
    }

    if (!writeSuccess) {
      throw new Error(
        "Dosya yazma işlemi başarısız oldu (maksimum deneme sayısına ulaşıldı)"
      );
    }

    // FFmpeg'i sadece metadata okumak için çalıştır (ffprobe gibi)
    // -i ile başladığında metadata log'larda gelir
    // -frames:v 0 ile hiç frame decode etmeyiz, sadece metadata okuruz
    // Bu çok hızlıdır - tüm video'yu taramaz
    const execPromise = ffmpeg
      .exec([
        "-i",
        fileName,
        "-frames:v",
        "0", // Hiç video frame decode etme - sadece metadata
        "-f",
        "null",
        "-",
      ])
      .catch((error) => {
        // FFmpeg exec hatası beklenebilir - biz sadece log mesajlarını istiyoruz
        // Metadata zaten log'larda var
        console.log(
          "[FFmpeg] Exec hatası (beklenebilir, metadata log'larda):",
          error
        );
        return null; // Hata olsa bile devam et - metadata log'larda
      });

    // Add timeout to prevent hanging (2 seconds should be enough for metadata with -t 0.001)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error("FFmpeg metadata extraction timeout"));
      }, 2000);
    });

    try {
      await Promise.race([execPromise, timeoutPromise]);
    } catch (execError) {
      // FFmpeg exec may fail or timeout, but we still get metadata in logs from -i parameter
      // This is expected behavior - we parse logs for metadata
      console.log(
        "[FFmpeg] Exec tamamlandı (hata beklenebilir):",
        execError instanceof Error ? execError.message : String(execError)
      );
    }

    // Wait a bit for all log messages to be captured (daha kısa süre yeterli)
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check if we have enough log messages to parse metadata
    if (logMessages.length === 0) {
      throw new Error(
        "FFmpeg log mesajları alınamadı. Video formatı desteklenmiyor olabilir veya dosya bozuk olabilir."
      );
    }

    // Parse metadata from log messages
    const metadata = parseFFmpegMetadata(logMessages, file);

    // Cleanup
    await ffmpeg.deleteFile(fileName);

    // Remove log handler - try both methods for compatibility
    try {
      if (typeof (ffmpeg as any).off === "function") {
        (ffmpeg as any).off("log", logHandler);
      } else if (typeof (ffmpeg as any).removeEventListener === "function") {
        (ffmpeg as any).removeEventListener("log", logHandler);
      }
    } catch (removeError) {
      // If we can't remove the handler, it's not critical
      console.warn("Log handler kaldırılamadı (kritik değil):", removeError);
    }

    return metadata;
  } catch (error) {
    // Try to remove log handler
    try {
      if (typeof (ffmpeg as any).off === "function") {
        (ffmpeg as any).off("log", logHandler);
      } else if (typeof (ffmpeg as any).removeEventListener === "function") {
        (ffmpeg as any).removeEventListener("log", logHandler);
      }
    } catch {
      // Handler kaldırılamazsa kritik değil
    }

    // Cleanup: dosyayı silmeyi dene
    try {
      await ffmpeg.deleteFile(fileName);
    } catch {
      // Dosya silinemezse kritik değil
    }

    // Hata mesajını daha anlaşılır hale getir
    const errorMessage = error instanceof Error ? error.message : String(error);

    // FS hatası durumunda daha açıklayıcı mesaj
    if (errorMessage.includes("FS") || errorMessage.includes("ErrnoError")) {
      throw new Error(
        `FFmpeg dosya sistemi hatası: ${errorMessage}. ` +
          `Bu genellikle dosya çok büyük olduğunda (${(
            file.size /
            1024 /
            1024
          ).toFixed(2)}MB) ` +
          `veya FFmpeg.wasm'in bellek sınırlamaları nedeniyle oluşur. ` +
          `HTML5 Video API fallback'i kullanılacak.`
      );
    }

    throw new Error(`FFmpeg ile metadata çıkarılamadı: ${errorMessage}`);
  }
}

function parseFFmpegMetadata(
  logMessages: string[],
  file: File
): Omit<VideoMetadata, "thumbnail"> {
  const codecInfo = detectCodecFromFile(file);
  let duration = 0;
  let width = 0;
  let height = 0;
  let framerate = 30; // Default
  let bitrate = 0;

  // Parse log messages for metadata
  const logText = logMessages.join("\n");

  // Extract duration (e.g., "Duration: 00:01:23.45")
  const durationMatch = logText.match(
    /Duration:\s*(\d{2}):(\d{2}):(\d{2})\.(\d{2})/
  );
  if (durationMatch) {
    const hours = parseInt(durationMatch[1], 10);
    const minutes = parseInt(durationMatch[2], 10);
    const seconds = parseInt(durationMatch[3], 10);
    const centiseconds = parseInt(durationMatch[4], 10);
    duration = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
  }

  // Extract resolution (e.g., "1920x1080" or "Stream #0:0: Video: h264, 1920x1080")
  const resolutionMatch = logText.match(/(\d{3,5})x(\d{3,5})/);
  if (resolutionMatch) {
    width = parseInt(resolutionMatch[1], 10);
    height = parseInt(resolutionMatch[2], 10);
  }

  // Extract framerate (e.g., "30 fps" or "29.97 fps")
  const framerateMatch = logText.match(/(\d+(?:\.\d+)?)\s*fps/i);
  if (framerateMatch) {
    framerate = parseFloat(framerateMatch[1]);
  }

  // Extract bitrate (e.g., "bitrate: 5000 kb/s")
  const bitrateMatch = logText.match(/bitrate:\s*(\d+(?:\.\d+)?)\s*kb\/s/i);
  if (bitrateMatch) {
    bitrate = parseFloat(bitrateMatch[1]) * 1000; // Convert to bps
  } else if (duration > 0) {
    // Estimate from file size
    bitrate = (file.size * 8) / duration;
  }

  // Validate essential metadata
  if (!width || !height) {
    throw new Error("FFmpeg log çıktısından video çözünürlüğü çıkarılamadı");
  }

  if (!duration || duration <= 0) {
    throw new Error("FFmpeg log çıktısından video süresi çıkarılamadı");
  }

  return {
    filename: file.name,
    fileSize: file.size,
    duration,
    codec: codecInfo.codec,
    codecName: codecInfo.name,
    bitrate,
    width,
    height,
    framerate,
    pixelFormat: "yuv420p", // Default assumption
  };
}

async function extractThumbnail(file: File): Promise<string> {
  let ffmpeg;
  try {
    ffmpeg = await getFFmpeg();
  } catch (loadError) {
    throw new Error(
      `FFmpeg yüklenemedi: ${
        loadError instanceof Error ? loadError.message : String(loadError)
      }`
    );
  }

  if (!ffmpeg) {
    throw new Error("FFmpeg instance null veya undefined");
  }

  // Güvenli dosya adı oluştur
  const timestamp = Date.now();
  const sanitizedName = file.name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_{2,}/g, "_")
    .substring(0, 50);
  const extension = file.name.includes(".")
    ? file.name.substring(file.name.lastIndexOf("."))
    : ".mp4";
  const fileName = sanitizedName || `video_${timestamp}${extension}`;
  const outputName = `thumbnail_${timestamp}.jpg`;

  // Dosya boyutu kontrolü
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    throw new Error(
      `Dosya çok büyük (${(file.size / 1024 / 1024).toFixed(
        2
      )}MB). Thumbnail oluşturulamıyor.`
    );
  }

  try {
    // Dosya verisini yükle
    let fileData: Uint8Array;
    try {
      fileData = await fetchFile(file);
      if (!fileData || fileData.length === 0) {
        throw new Error("Dosya verisi boş veya geçersiz");
      }
    } catch (fetchError) {
      throw new Error(
        `Dosya okunamadı: ${
          fetchError instanceof Error ? fetchError.message : String(fetchError)
        }`
      );
    }

    // Dosyayı FFmpeg FS'ine yaz - retry mekanizması ile
    let writeAttempts = 0;
    const maxWriteAttempts = 3;
    let writeSuccess = false;

    while (writeAttempts < maxWriteAttempts && !writeSuccess) {
      try {
        // Önce dosya varsa sil
        try {
          await ffmpeg.deleteFile(fileName);
        } catch {
          // Dosya yoksa hata vermez
        }

        await ffmpeg.writeFile(fileName, fileData);
        writeSuccess = true;
      } catch (writeError) {
        writeAttempts++;
        const errorMessage =
          writeError instanceof Error ? writeError.message : String(writeError);

        if (
          errorMessage.includes("FS") ||
          errorMessage.includes("ErrnoError") ||
          errorMessage.includes("ENOENT")
        ) {
          if (writeAttempts >= maxWriteAttempts) {
            throw new Error(
              `FFmpeg dosya sistemi hatası (${writeAttempts} deneme). ` +
                `Thumbnail oluşturulamıyor. Hata: ${errorMessage}`
            );
          }
          await new Promise((resolve) =>
            setTimeout(resolve, 100 * writeAttempts)
          );
          continue;
        }
        throw writeError;
      }
    }

    if (!writeSuccess) {
      throw new Error("Dosya yazma işlemi başarısız oldu");
    }

    // Thumbnail oluştur
    await ffmpeg.exec([
      "-i",
      fileName,
      "-ss",
      "00:00:01",
      "-vframes",
      "1",
      "-vf",
      "scale=320:-1",
      "-q:v",
      "2",
      outputName,
    ]);

    const data = await ffmpeg.readFile(outputName);
    if (!data || (data as Uint8Array).length === 0) {
      throw new Error("Thumbnail verisi boş");
    }
    const blob = new Blob([data as BlobPart], { type: "image/jpeg" });
    const url = URL.createObjectURL(blob);

    // URL'in geçerli olduğundan emin ol
    if (!url || url.trim() === "") {
      throw new Error("Thumbnail URL oluşturulamadı");
    }

    // Cleanup
    try {
      await ffmpeg.deleteFile(fileName);
      await ffmpeg.deleteFile(outputName);
    } catch {
      // Cleanup hataları kritik değil
    }

    return url;
  } catch (error) {
    // Cleanup on error
    try {
      await ffmpeg.deleteFile(fileName);
      await ffmpeg.deleteFile(outputName);
    } catch {
      // Cleanup hataları kritik değil
    }

    // FS hatası durumunda daha açıklayıcı mesaj
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("FS") || errorMessage.includes("ErrnoError")) {
      throw new Error(
        `FFmpeg dosya sistemi hatası: ${errorMessage}. ` +
          `Thumbnail oluşturulamıyor. Fallback yöntemi kullanılacak.`
      );
    }

    throw error;
  }
}

async function extractThumbnailFallback(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    let timeoutId: NodeJS.Timeout;

    if (!ctx) {
      URL.revokeObjectURL(url);
      reject(new Error("Canvas context oluşturulamadı"));
      return;
    }

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.remove();
      canvas.remove();
      if (timeoutId) clearTimeout(timeoutId);
    };

    // Timeout (10 saniye)
    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("Thumbnail oluşturma zaman aşımı"));
    }, 10000);

    video.addEventListener("loadeddata", () => {
      try {
        const seekTime = Math.min(
          1,
          video.duration > 0 ? video.duration / 4 : 0
        );
        video.currentTime = seekTime;
      } catch (error) {
        // Ignore seek errors, try to capture at 0
        video.currentTime = 0;
      }
    });

    video.addEventListener("seeked", () => {
      try {
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          cleanup();
          reject(new Error("Video boyutları geçersiz"));
          return;
        }

        canvas.width = Math.min(320, video.videoWidth);
        canvas.height = (canvas.width / video.videoWidth) * video.videoHeight;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            cleanup();
            if (timeoutId) clearTimeout(timeoutId);

            if (blob) {
              const thumbnailUrl = URL.createObjectURL(blob);
              resolve(thumbnailUrl);
            } else {
              reject(new Error("Thumbnail oluşturulamadı"));
            }
          },
          "image/jpeg",
          0.8
        );
      } catch (error) {
        cleanup();
        if (timeoutId) clearTimeout(timeoutId);
        reject(error);
      }
    });

    video.addEventListener("error", (e) => {
      cleanup();
      if (timeoutId) clearTimeout(timeoutId);
      reject(
        new Error(`Video yükleme hatası: ${e.message || "Bilinmeyen hata"}`)
      );
    });

    video.addEventListener("error", (e) => {
      URL.revokeObjectURL(url);
      video.remove();
      canvas.remove();
      reject(new Error("Video yüklenemedi"));
    });

    video.preload = "metadata";
    video.src = url;
    video.load();

    // Timeout fallback
    setTimeout(() => {
      if (video.readyState >= 2) {
        try {
          canvas.width = Math.min(320, video.videoWidth);
          canvas.height = (canvas.width / video.videoWidth) * video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(url);
              video.remove();
              canvas.remove();
              if (blob) {
                resolve(URL.createObjectURL(blob));
              } else {
                reject(new Error("Thumbnail oluşturulamadı"));
              }
            },
            "image/jpeg",
            0.8
          );
        } catch (error) {
          URL.revokeObjectURL(url);
          video.remove();
          canvas.remove();
          reject(error);
        }
      }
    }, 3000);
  });
}
