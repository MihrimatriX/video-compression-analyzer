/**
 * WebCodecs API tabanlı performanslı video converter
 * GPU acceleration desteği ile çok daha hızlı encoding
 */

export interface WebCodecsProgress {
  progress: number; // 0-100
  time: number; // elapsed time in seconds
  speed?: string; // encoding speed (e.g., "5.2x")
  framesEncoded: number;
  totalFrames?: number;
  message?: string;
}

export interface WebCodecsOptions {
  codec: "h264" | "h265" | "vp9" | "av1";
  bitrate?: number; // bits per second
  crf?: number;
  quality?: number;
  resolution?: { width: number; height: number };
  framerate?: number;
  audioBitrate?: number;
  hardwareAcceleration?: "prefer" | "require" | "no-preference";
}

// WebCodecs API desteğini kontrol et
export function isWebCodecsSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "VideoEncoder" in window &&
    "VideoDecoder" in window &&
    "AudioEncoder" in window &&
    "AudioDecoder" in window
  );
}

// Hardware acceleration desteğini kontrol et
export async function checkHardwareAcceleration(
  codec: string
): Promise<boolean> {
  if (!isWebCodecsSupported()) return false;

  try {
    const config: VideoEncoderConfig = {
      codec: getCodecString(codec),
      width: 1920,
      height: 1080,
      bitrate: 5000000,
      framerate: 30,
    };

    const encoder = new VideoEncoder({
      output: () => {},
      error: () => {},
    });

    const support = await VideoEncoder.isConfigSupported(config);
    encoder.close();

    return support.supported ?? false;
  } catch {
    return false;
  }
}

function getCodecString(codec: string): string {
  switch (codec) {
    case "h264":
      return "avc1.42E01E"; // H.264 Baseline
    case "h265":
      return "hev1.1.6.L93.B0"; // H.265 Main
    case "vp9":
      return "vp09.00.10.08"; // VP9 Profile 0
    case "av1":
      return "av01.0.08M.08"; // AV1 Main Profile
    default:
      return "avc1.42E01E";
  }
}

export async function convertWithWebCodecs(
  file: File,
  options: WebCodecsOptions,
  onProgress?: (progress: WebCodecsProgress) => void
): Promise<Blob> {
  if (!isWebCodecsSupported()) {
    throw new Error(
      "WebCodecs API desteklenmiyor. Lütfen Chrome/Edge tarayıcısı kullanın."
    );
  }

  const startTime = Date.now();
  let framesEncoded = 0;
  let totalFrames = 0;

  try {
    // Video element oluştur
    const video = document.createElement("video");
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => {
        video.currentTime = 0.1; // Metadata yüklemek için
        resolve();
      };
      video.onerror = reject;
      setTimeout(() => reject(new Error("Video yükleme timeout")), 10000);
    });

    const width = options.resolution?.width || video.videoWidth;
    const height = options.resolution?.height || video.videoHeight;
    const framerate = options.framerate || 30;
    const duration = video.duration;

    // Canvas oluştur
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", {
      willReadFrequently: false,
      alpha: false,
    });

    if (!ctx) {
      throw new Error("Canvas context oluşturulamadı");
    }

    // Video encoder oluştur
    const videoChunks: Uint8Array[] = [];
    const videoEncoder = new VideoEncoder({
      output: (chunk, metadata) => {
        videoChunks.push(new Uint8Array(chunk.byteLength));
        chunk.copyTo(videoChunks[videoChunks.length - 1]);
        framesEncoded++;

        if (onProgress && duration) {
          const elapsed = (Date.now() - startTime) / 1000;
          const estimatedTotalFrames = Math.ceil(duration * framerate);
          const progress = Math.min(
            95,
            (framesEncoded / estimatedTotalFrames) * 100
          );

          onProgress({
            progress,
            time: elapsed,
            framesEncoded,
            totalFrames: estimatedTotalFrames,
            speed:
              elapsed > 0
                ? `${(framesEncoded / elapsed / framerate).toFixed(1)}x`
                : undefined,
            message: `Encoding... ${Math.round(progress)}%`,
          });
        }
      },
      error: (error) => {
        throw new Error(`Video encoding hatası: ${error.message}`);
      },
    });

    // Encoder config
    const encoderConfig: VideoEncoderConfig = {
      codec: getCodecString(options.codec),
      width,
      height,
      bitrate: options.bitrate || 5000000,
      framerate,
      hardwareAcceleration: (options.hardwareAcceleration ||
        "prefer") as HardwareAcceleration,
    };

    if (options.crf !== undefined) {
      // CRF için bitrate'i hesapla (yaklaşık)
      const crfFactor = Math.pow(0.92, (options.crf - 23) / 1);
      encoderConfig.bitrate = Math.round(
        (encoderConfig.bitrate || 5000000) * crfFactor
      );
    }

    const support = await VideoEncoder.isConfigSupported(encoderConfig);
    if (!support.supported) {
      throw new Error(
        `Codec desteklenmiyor: ${options.codec}. ${support.config || ""}`
      );
    }

    videoEncoder.configure(encoderConfig);

    // Audio encoder (basit AAC)
    const audioChunks: Uint8Array[] = [];
    let audioEncoder: AudioEncoder | null = null;

    if (options.audioBitrate) {
      audioEncoder = new AudioEncoder({
        output: (chunk) => {
          audioChunks.push(new Uint8Array(chunk.byteLength));
          chunk.copyTo(audioChunks[audioChunks.length - 1]);
        },
        error: (error) => {
          console.warn("Audio encoding hatası:", error);
        },
      });

      // Audio config (basit)
      const audioConfig: AudioEncoderConfig = {
        codec: "mp4a.40.2", // AAC
        sampleRate: 48000,
        numberOfChannels: 2,
        bitrate: options.audioBitrate,
      };

      const audioSupport = await AudioEncoder.isConfigSupported(audioConfig);
      if (audioSupport.supported) {
        audioEncoder.configure(audioConfig);
      } else {
        audioEncoder = null;
      }
    }

    // Frame encoding
    let currentTime = 0;
    const frameDuration = 1 / framerate;

    onProgress?.({
      progress: 5,
      time: 0,
      framesEncoded: 0,
      message: "Encoding başlatılıyor...",
    });

    while (currentTime < duration) {
      video.currentTime = currentTime;
      await new Promise<void>((resolve) => {
        video.onseeked = () => {
          // Canvas'a çiz
          ctx.drawImage(video, 0, 0, width, height);

          // VideoFrame oluştur
          const videoFrame = new VideoFrame(canvas, {
            timestamp: currentTime * 1_000_000, // microseconds
            duration: frameDuration * 1_000_000,
          });

          if (videoEncoder.state === "configured") {
            videoEncoder.encode(videoFrame);
          }

          videoFrame.close();
          resolve();
        };
      });

      currentTime += frameDuration;
    }

    // Encoding'i bitir
    await videoEncoder.flush();
    videoEncoder.close();

    if (audioEncoder) {
      await audioEncoder.flush();
      audioEncoder.close();
    }

    // Chunk'ları birleştir (basit MP4 container)
    // Not: Gerçek uygulamada MP4 muxer kullanılmalı (mp4box.js gibi)
    onProgress?.({
      progress: 98,
      time: (Date.now() - startTime) / 1000,
      framesEncoded,
      message: "Dosya hazırlanıyor...",
    });

    // Basit blob oluştur (gerçek uygulamada MP4 muxer gerekli)
    const allChunks = [...videoChunks, ...audioChunks];
    const totalLength = allChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of allChunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    const blob = new Blob([result], {
      type:
        options.codec === "vp9" || options.codec === "av1"
          ? "video/webm"
          : "video/mp4",
    });

    onProgress?.({
      progress: 100,
      time: (Date.now() - startTime) / 1000,
      framesEncoded,
      message: "Tamamlandı!",
    });

    // Cleanup
    URL.revokeObjectURL(video.src);
    canvas.width = 0;
    canvas.height = 0;

    return blob;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`WebCodecs conversion hatası: ${errorMessage}`);
  }
}
