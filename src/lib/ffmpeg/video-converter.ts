import { getFFmpeg } from "./ffmpeg-instance";
import { fetchFile } from "@ffmpeg/util";
import {
  convertWithWebCodecs,
  isWebCodecsSupported,
  checkHardwareAcceleration,
  type WebCodecsProgress,
} from "./webcodecs-converter";
import type { TranslationFunction } from "@/lib/i18n/use-translation";

export interface ConversionProgress {
  progress: number; // 0-100
  time: number; // elapsed time in seconds
  speed?: string; // encoding speed (e.g., "2.5x")
  message?: string;
  framesEncoded?: number;
  totalFrames?: number;
}

export interface ConversionOptions {
  codec: string;
  bitrate?: string;
  crf?: number;
  quality?: number;
  preset?: string;
  resolution?: { width: number; height: number };
  framerate?: number;
  pixelFormat?: string;
  profile?: string;
  level?: string;
  keyframeInterval?: number;
  twoPass?: boolean;
  tune?: string;
  threads?: number;
  bframes?: number;
  refFrames?: number;
  meMethod?: string;
  subMe?: number;
  audioBitrate?: string;
  audioCodec?: string;
  audioSampleRate?: string;
  audioChannels?: string;
  videoFilter?: string;
  deinterlace?: boolean;
  denoise?: boolean;
  crop?: { width: number; height: number; x: number; y: number };
  colorSpace?: string;
  colorRange?: string;
}

const FFMPEG_MAX_SIZE = 50 * 1024 * 1024; // 50MB

// Bitrate string'ini number'a çevir (örn: "5M" -> 5000000, "128k" -> 128000)
function parseBitrate(bitrate: string): number {
  const match = bitrate.match(/^(\d+(?:\.\d+)?)([KMkm]?)$/);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();

  if (unit === "M") return Math.round(value * 1_000_000);
  if (unit === "K") return Math.round(value * 1_000);
  return Math.round(value);
}

export async function convertVideo(
  file: File,
  options: ConversionOptions,
  onProgress?: (progress: ConversionProgress) => void,
  t?: TranslationFunction
): Promise<Blob> {
  // WebCodecs API desteği varsa ve dosya çok büyük değilse onu kullan
  // WebCodecs büyük dosyalar için bellek sorunları yaşayabilir
  const WEBCODECS_MAX_SIZE = 200 * 1024 * 1024; // 200MB
  const useWebCodecs =
    isWebCodecsSupported() && file.size <= WEBCODECS_MAX_SIZE;

  if (useWebCodecs) {
    try {
      const hasHardwareAccel = await checkHardwareAcceleration(options.codec);

      onProgress?.({
        progress: 0,
        time: 0,
        message: hasHardwareAccel
          ? t?.("conversion.startingGpu") ||
            "GPU acceleration ile encoding başlatılıyor..."
          : t?.("conversion.startingCpu") || "CPU ile encoding başlatılıyor...",
      });

      const webCodecsOptions = {
        codec: options.codec as "h264" | "h265" | "vp9" | "av1",
        bitrate: options.bitrate ? parseBitrate(options.bitrate) : undefined,
        crf: options.crf,
        quality: options.quality,
        resolution: options.resolution,
        audioBitrate: options.audioBitrate
          ? parseBitrate(options.audioBitrate)
          : undefined,
        hardwareAcceleration: hasHardwareAccel
          ? ("prefer" as const)
          : ("no-preference" as const),
      };

      const blob = await convertWithWebCodecs(
        file,
        webCodecsOptions,
        (progress: WebCodecsProgress) => {
          onProgress?.({
            progress: progress.progress,
            time: progress.time,
            speed: progress.speed,
            message: progress.message,
            framesEncoded: progress.framesEncoded,
            totalFrames: progress.totalFrames,
          });
        }
      );

      return blob;
    } catch (webCodecsError) {
      console.warn(
        "WebCodecs hatası, FFmpeg.wasm'e geçiliyor:",
        webCodecsError
      );

      // Eğer WebCodecs destekleniyorsa ama hata veriyorsa ve dosya FFmpeg.wasm limit'inin üzerindeyse
      // FFmpeg.wasm'e geçmeye çalışma, direkt hata ver
      if (file.size > FFMPEG_MAX_SIZE) {
        const size = (file.size / 1024 / 1024).toFixed(2);
        const errorMsg =
          t?.("conversion.webcodecsLargeFileError", { size }) ||
          `WebCodecs conversion failed for large file (${size}MB). WebCodecs API may have memory limitations. Please try with a smaller file or use command-line FFmpeg.`;
        throw new Error(errorMsg);
      }
      // Küçük dosyalar için FFmpeg.wasm'e fallback yap (50MB altı)
    }
  }

  // FFmpeg.wasm fallback (tüm tarayıcılar için)
  // Büyük dosyalar için uyarı (sadece FFmpeg.wasm için)
  if (file.size > FFMPEG_MAX_SIZE) {
    const size = (file.size / 1024 / 1024).toFixed(2);
    const errorMsg =
      t?.("conversion.fileTooLargeDesc", { size }) ||
      `Dosya çok büyük (${size}MB). FFmpeg.wasm maksimum 50MB dosya boyutunu destekler. Lütfen daha küçük bir dosya seçin, WebCodecs API destekleyen tarayıcı kullanın (Chrome/Edge) veya komut satırından FFmpeg kullanın.`;
    throw new Error(errorMsg);
  }

  const ffmpeg = await getFFmpeg();

  // Dosya adını temizle
  const sanitizedName = file.name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_{2,}/g, "_")
    .substring(0, 50);

  const timestamp = Date.now();
  const inputExtension = file.name.includes(".")
    ? file.name.substring(file.name.lastIndexOf("."))
    : ".mp4";

  const inputFileName = sanitizedName || `input_${timestamp}${inputExtension}`;

  // Çıktı dosya adını belirle
  const outputExtension =
    options.codec === "vp9" || options.codec === "av1" ? ".webm" : ".mp4";
  const outputFileName = `output_${timestamp}${outputExtension}`;

  try {
    // Progress callback'i ayarla
    let lastProgressTime = Date.now();
    let lastProgressFrame = 0;

    const progressHandler = ({ message }: { message: string }) => {
      // FFmpeg log mesajlarından progress bilgisi çıkar
      // Örnek: "frame=  123 fps= 25 q=28.0 size=    1024kB time=00:00:05.00 bitrate=1677.7kbits/s speed=1.25x"
      const frameMatch = message.match(/frame=\s*(\d+)/);
      const timeMatch = message.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
      const speedMatch = message.match(/speed=\s*([\d.]+)x/);

      if (frameMatch || timeMatch) {
        const currentTime = Date.now();
        const elapsed = (currentTime - lastProgressTime) / 1000;

        if (timeMatch) {
          const hours = parseInt(timeMatch[1], 10);
          const minutes = parseInt(timeMatch[2], 10);
          const seconds = parseInt(timeMatch[3], 10);
          const centiseconds = parseInt(timeMatch[4], 10);
          const totalSeconds =
            hours * 3600 + minutes * 60 + seconds + centiseconds / 100;

          // Tahmini progress (basit bir yaklaşım - video süresini bilmediğimiz için)
          // Bu sadece bir tahmin, gerçek progress için video metadata'sına ihtiyacımız var
          const progress = Math.min(95, (totalSeconds / 60) * 10); // Basit tahmin

          if (onProgress) {
            onProgress({
              progress: Math.max(15, progress), // Minimum 15'ten başla
              time: elapsed,
              speed: speedMatch ? `${speedMatch[1]}x` : undefined,
              message: `${
                t?.("conversion.encoding") || "Encoding..."
              } ${Math.round(progress)}%`,
            });
          }
        }

        if (frameMatch) {
          const currentFrame = parseInt(frameMatch[1], 10);
          if (currentFrame > lastProgressFrame) {
            lastProgressFrame = currentFrame;
            lastProgressTime = currentTime;

            // Frame bazlı progress güncellemesi
            if (onProgress) {
              const frameProgress = Math.min(
                95,
                15 + (currentFrame / 1000) * 10
              ); // Basit frame bazlı progress
              onProgress({
                progress: frameProgress,
                time: elapsed,
                speed: speedMatch ? `${speedMatch[1]}x` : undefined,
                message: `${
                  t?.("conversion.encoding") || "Encoding..."
                } Frame: ${currentFrame}`,
              });
            }
          }
        }
      }
    };

    ffmpeg.on("log", progressHandler);

    // Dosyayı yükle
    onProgress?.({
      progress: 5,
      time: 0,
      message: t?.("conversion.preparing") || "Dosya hazırlanıyor...",
    });

    try {
      const fileData = await fetchFile(file);
      await ffmpeg.writeFile(inputFileName, fileData);
    } catch (fsError) {
      // FS error'ı erken yakala
      const size = (file.size / 1024 / 1024).toFixed(2);
      const fsErrorMsg =
        t?.("conversion.fsError", { size }) ||
        `Dosya sistemi hatası (${size}MB dosya). FFmpeg.wasm bellek sınırlamaları nedeniyle bu dosyayı işleyemiyor. Lütfen daha küçük bir dosya deneyin, WebCodecs API destekleyen tarayıcı kullanın (Chrome/Edge) veya komut satırından FFmpeg kullanın.`;
      throw new Error(fsErrorMsg);
    }

    onProgress?.({
      progress: 10,
      time: 0,
      message: "Encoding başlatılıyor...",
    });

    // FFmpeg komutunu oluştur
    const ffmpegArgs: string[] = ["-i", inputFileName];

    // Video codec
    if (options.codec === "h264") {
      ffmpegArgs.push("-c:v", "libx264");
    } else if (options.codec === "h265" || options.codec === "hevc") {
      ffmpegArgs.push("-c:v", "libx265");
    } else if (options.codec === "vp9") {
      ffmpegArgs.push("-c:v", "libvpx-vp9");
    } else if (options.codec === "av1") {
      ffmpegArgs.push("-c:v", "libaom-av1");
    }

    // CRF veya Quality
    if (options.crf !== undefined) {
      ffmpegArgs.push("-crf", options.crf.toString());
      if (options.codec === "vp9" || options.codec === "av1") {
        ffmpegArgs.push("-b:v", "0"); // CRF modu için bitrate 0
      }
    } else if (options.quality !== undefined) {
      if (options.codec === "vp9" || options.codec === "av1") {
        ffmpegArgs.push("-crf", options.quality.toString());
        ffmpegArgs.push("-b:v", "0");
      } else {
        ffmpegArgs.push("-crf", options.quality.toString());
      }
    }

    // Bitrate
    if (options.bitrate && !options.crf && !options.quality) {
      ffmpegArgs.push("-b:v", options.bitrate);
    }

    // Preset (default: veryfast for better speed)
    if (options.preset) {
      ffmpegArgs.push("-preset", options.preset);
    } else {
      // Default olarak hızlı preset kullan
      ffmpegArgs.push("-preset", "veryfast");
    }

    // Video filters
    const videoFilters: string[] = [];

    // Crop
    if (options.crop) {
      videoFilters.push(
        `crop=${options.crop.width}:${options.crop.height}:${options.crop.x}:${options.crop.y}`
      );
    }

    // Deinterlace
    if (options.deinterlace) {
      videoFilters.push("yadif");
    }

    // Denoise
    if (options.denoise) {
      videoFilters.push("hqdn3d");
    }

    // Resolution (scale)
    if (options.resolution) {
      videoFilters.push(
        `scale=${options.resolution.width}:${options.resolution.height}`
      );
    }

    // Custom video filter
    if (options.videoFilter) {
      videoFilters.push(options.videoFilter);
    }

    // Apply video filters
    if (videoFilters.length > 0) {
      ffmpegArgs.push("-vf", videoFilters.join(","));
    }

    // Color space
    if (options.colorSpace) {
      ffmpegArgs.push("-colorspace", options.colorSpace);
    }

    // Color range
    if (options.colorRange) {
      ffmpegArgs.push("-color_range", options.colorRange);
    }

    // Framerate
    if (options.framerate) {
      ffmpegArgs.push("-r", options.framerate.toString());
    }

    // Pixel format
    if (options.pixelFormat) {
      ffmpegArgs.push("-pix_fmt", options.pixelFormat);
    }

    // Profile (H.264/H.265)
    if (
      options.profile &&
      (options.codec === "h264" || options.codec === "h265")
    ) {
      if (options.codec === "h264") {
        // H.264 profiles: baseline, main, high, high10, high422, high444
        ffmpegArgs.push("-profile:v", options.profile);
      } else if (options.codec === "h265") {
        // H.265 profiles: main, main10, main12, main-intra, main10-intra, etc.
        // "high" profile H.265'te yok, "main" kullan
        const h265Profile =
          options.profile === "high" ? "main" : options.profile;
        ffmpegArgs.push("-profile:v", h265Profile);
      }
    }

    // Level (H.264/H.265)
    if (
      options.level &&
      (options.codec === "h264" || options.codec === "h265")
    ) {
      ffmpegArgs.push("-level", options.level);
    }

    // Keyframe interval (GOP size)
    if (options.keyframeInterval) {
      ffmpegArgs.push("-g", options.keyframeInterval.toString());
    }

    // Audio codec
    if (options.audioCodec) {
      ffmpegArgs.push("-c:a", options.audioCodec);
    } else {
      // Default audio codec
      if (options.codec === "vp9" || options.codec === "av1") {
        ffmpegArgs.push("-c:a", "libopus");
      } else {
        ffmpegArgs.push("-c:a", "aac");
      }
    }

    // Audio bitrate
    if (options.audioBitrate) {
      ffmpegArgs.push("-b:a", options.audioBitrate);
    }

    // Audio sample rate
    if (options.audioSampleRate) {
      ffmpegArgs.push("-ar", options.audioSampleRate);
    }

    // Audio channels
    if (options.audioChannels) {
      ffmpegArgs.push("-ac", options.audioChannels);
    }

    // Two-pass encoding
    if (options.twoPass) {
      // First pass
      const firstPassArgs = [
        ...ffmpegArgs,
        "-pass",
        "1",
        "-f",
        "null",
        "/dev/null",
      ];
      // Note: FFmpeg.wasm doesn't support two-pass well, so we'll skip it for now
      // This is a placeholder for future implementation
    }

    // Tune (H.264/H.265)
    if (
      options.tune &&
      (options.codec === "h264" || options.codec === "h265")
    ) {
      ffmpegArgs.push("-tune", options.tune);
    }

    // Threads (default: 0 = auto, tüm CPU çekirdekleri)
    if (options.threads !== undefined) {
      ffmpegArgs.push("-threads", options.threads.toString());
    } else {
      // Default olarak tüm CPU çekirdeklerini kullan (hız için)
      ffmpegArgs.push("-threads", "0");
    }

    // B-frames (H.264/H.265)
    if (
      options.bframes !== undefined &&
      (options.codec === "h264" || options.codec === "h265")
    ) {
      ffmpegArgs.push("-bf", options.bframes.toString());
    }

    // Reference frames (H.264/H.265)
    if (
      options.refFrames !== undefined &&
      (options.codec === "h264" || options.codec === "h265")
    ) {
      ffmpegArgs.push("-refs", options.refFrames.toString());
    }

    // Motion estimation method
    if (
      options.meMethod &&
      (options.codec === "h264" || options.codec === "h265")
    ) {
      ffmpegArgs.push("-me_method", options.meMethod);
    }

    // Subpixel motion estimation
    if (
      options.subMe !== undefined &&
      (options.codec === "h264" || options.codec === "h265")
    ) {
      ffmpegArgs.push("-subq", options.subMe.toString());
    }

    // Çıktı dosyası
    ffmpegArgs.push(outputFileName);

    // Encoding'i başlat
    onProgress?.({
      progress: 15,
      time: 0,
      message: t?.("conversion.encoding") || "Encoding başladı...",
    });

    // FFmpeg exec'i başlat (bu asenkron olarak çalışır ve progress handler'ı tetikler)
    const execPromise = ffmpeg.exec(ffmpegArgs);

    // Progress handler'ın çalışması için kısa bir bekleme
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Encoding tamamlanana kadar bekle
    await execPromise;

    // Sonuç dosyasını oku
    onProgress?.({
      progress: 95,
      time: 0,
      message: t?.("conversion.preparing") || "Dosya hazırlanıyor...",
    });
    const data = await ffmpeg.readFile(outputFileName);

    // Çıktı dosyası kontrolü - eğer 0 byte ise hata ver
    if (
      !data ||
      (data instanceof Uint8Array && data.length === 0) ||
      (typeof data === "string" && data.length === 0)
    ) {
      throw new Error(
        t?.("conversion.emptyOutput") ||
          "Encoding başarısız oldu - çıktı dosyası boş. Lütfen ayarları kontrol edin (özellikle codec ve profile ayarlarını) ve tekrar deneyin."
      );
    }

    // Cleanup
    try {
      await ffmpeg.deleteFile(inputFileName);
      await ffmpeg.deleteFile(outputFileName);
    } catch (e) {
      console.warn("Temizlik hatası:", e);
    }

    // Event handler'ı kaldır
    ffmpeg.off("log", progressHandler);

    onProgress?.({
      progress: 100,
      time: 0,
      message: t?.("conversion.completed") || "Tamamlandı!",
    });

    // Blob oluştur - FileData'ı BlobPart'a dönüştür
    // FileData can be Uint8Array or string, we need to handle both
    let blobData: BlobPart;
    if (data instanceof Uint8Array) {
      // Create a new Uint8Array with ArrayBuffer to ensure compatibility
      blobData = new Uint8Array(data).buffer;
    } else if (typeof data === "string") {
      // If it's a string (base64), convert to Uint8Array first
      blobData = Uint8Array.from(atob(data), (c) => c.charCodeAt(0)).buffer;
    } else {
      // Fallback: try to use as-is
      blobData = data as BlobPart;
    }

    const blob = new Blob([blobData], {
      type:
        options.codec === "vp9" || options.codec === "av1"
          ? "video/webm"
          : "video/mp4",
    });

    return blob;
  } catch (error) {
    // Cleanup on error
    try {
      await ffmpeg.deleteFile(inputFileName);
      await ffmpeg.deleteFile(outputFileName);
    } catch (e) {
      // Ignore cleanup errors
    }

    const errorMessage = error instanceof Error ? error.message : String(error);

    // FS error'ı özel olarak handle et
    if (
      errorMessage.includes("FS error") ||
      errorMessage.includes("ErrnoError")
    ) {
      const size = (file.size / 1024 / 1024).toFixed(2);
      const fsErrorMsg =
        t?.("conversion.fsError", { size }) ||
        `Dosya sistemi hatası (${size}MB dosya). FFmpeg.wasm bellek sınırlamaları nedeniyle bu dosyayı işleyemiyor. Lütfen daha küçük bir dosya deneyin, WebCodecs API destekleyen tarayıcı kullanın (Chrome/Edge) veya komut satırından FFmpeg kullanın.`;
      throw new Error(fsErrorMsg);
    }

    // Diğer hatalar için genel mesaj
    throw new Error(
      `${t?.("conversion.error") || "Video dönüştürme hatası"}: ${errorMessage}`
    );
  }
}
