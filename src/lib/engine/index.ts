/**
 * Motor cephesi: analiz, küçük resim, dönüştürme ve kalite ölçümü için tek giriş noktası.
 * Ortama göre en uygun motoru seçer:
 *   masaüstü -> yerel FFmpeg
 *   tarayıcı -> WebCodecs (Mediabunny), olmazsa FFmpeg.wasm
 */
import { getDesktop } from "./desktop-bridge";
import {
  FFMPEG_WASM_MAX_INPUT,
  convertWithFFmpegWasm,
  measureQualityWithFFmpegWasm,
  probeWithFFmpegWasm,
  thumbnailWithFFmpegWasm,
} from "./ffmpeg-wasm-engine";
import { convertNative, measureQualityNative, probeNative, thumbnailNative } from "./native-engine";
import { codecLabel, normalizeCodec, resolveDimensions } from "./shared";
import {
  EncodeCanceledError,
  type EncodeOptions,
  type EncodeProgress,
  type EncodeResult,
  type EncodeTask,
  type EngineId,
  type EnginePreference,
  type ProbeResult,
  type QualityMetrics,
  type TargetVideoCodec,
} from "./types";
import {
  canReadWithWebCodecs,
  convertWithWebCodecs,
  measureQualitySampled,
  probeWithWebCodecs,
  webCodecsSupportReason,
} from "./webcodecs-engine";

export * from "./types";
export { getDesktop, isDesktop } from "./desktop-bridge";
export { getNativeCapabilities } from "./native-engine";
export { isWebCodecsAvailable } from "./webcodecs-engine";
export { buildFFmpegArgs, formatCommand } from "./ffmpeg-args";
export { bitrateForTargetSize, outputFileName, resolveContainer } from "./shared";

// ---------------------------------------------------------------------------
// Analiz
// ---------------------------------------------------------------------------

export async function probeFile(file: File): Promise<ProbeResult> {
  if (getDesktop()) {
    try {
      return await probeNative(file);
    } catch (error) {
      console.warn("Yerel ffprobe başarısız, tarayıcı yöntemlerine düşülüyor:", error);
    }
  }

  const errors: string[] = [];
  // Mediabunny'nin demuxer'ı saf JS'dir; WebCodecs olmasa da metadata okuyabilir
  try {
    if (await canReadWithWebCodecs(file)) {
      const result = await probeWithWebCodecs(file);
      if (result.video || result.audio) return result;
    }
  } catch (error) {
    errors.push(`Mediabunny: ${error instanceof Error ? error.message : error}`);
  }

  if (file.size <= FFMPEG_WASM_MAX_INPUT) {
    try {
      return await probeWithFFmpegWasm(file);
    } catch (error) {
      errors.push(`FFmpeg.wasm: ${error instanceof Error ? error.message : error}`);
    }
  }

  try {
    return await probeWithHtml5(file);
  } catch (error) {
    errors.push(`HTML5: ${error instanceof Error ? error.message : error}`);
  }
  throw new Error(`Video analiz edilemedi. ${errors.join(" | ")}`);
}

function probeWithHtml5(file: File): Promise<ProbeResult> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    const done = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    };
    const timer = setTimeout(() => {
      done();
      reject(new Error("Zaman aşımı"));
    }, 15_000);
    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const width = video.videoWidth;
      const height = video.videoHeight;
      done();
      if (!width || !height) {
        reject(new Error("Video boyutu okunamadı"));
        return;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const guess = ext === "webm" ? "vp9" : "h264";
      resolve({
        container: ext.toUpperCase() || "unknown",
        duration,
        fileSize: file.size,
        bitrate: duration ? Math.round((file.size * 8) / duration) : 0,
        video: {
          codec: normalizeCodec(guess),
          codecLabel: `${codecLabel(guess)} (tahmini)`,
          width,
          height,
          frameRate: 30,
          pixelFormat: "yuv420p",
        },
        videoTrackCount: 1,
        audioTrackCount: 1,
        source: "html5",
      });
    };
    video.onerror = () => {
      done();
      reject(new Error("Tarayıcı bu videoyu açamadı"));
    };
    video.src = url;
  });
}

// ---------------------------------------------------------------------------
// Küçük resim
// ---------------------------------------------------------------------------

export async function createThumbnail(file: File, duration: number): Promise<string> {
  const at = duration > 0 ? Math.min(1, duration / 4) : 0;
  if (getDesktop()) {
    try {
      return await thumbnailNative(file, at);
    } catch {
      // tarayıcı yöntemlerine düş
    }
  }
  try {
    return await thumbnailWithVideoElement(file, at);
  } catch {
    // video elemanı çözemedi (ör. AVI), FFmpeg.wasm dene
  }
  if (file.size <= FFMPEG_WASM_MAX_INPUT) {
    try {
      return await thumbnailWithFFmpegWasm(file, at);
    } catch {
      // yoksay
    }
  }
  return "";
}

function thumbnailWithVideoElement(file: File, at: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    const cleanup = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Küçük resim zaman aşımı"));
    }, 10_000);
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.onloadeddata = () => {
      video.currentTime = at;
    };
    video.onseeked = () => {
      try {
        const w = Math.min(320, video.videoWidth);
        const h = Math.round((w / video.videoWidth) * video.videoHeight);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(video, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            cleanup();
            if (blob) resolve(URL.createObjectURL(blob));
            else reject(new Error("Küçük resim oluşturulamadı"));
          },
          "image/jpeg",
          0.8,
        );
      } catch (error) {
        cleanup();
        reject(error);
      }
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("Video açılamadı"));
    };
    video.src = url;
  });
}

// ---------------------------------------------------------------------------
// Motor seçimi ve dönüştürme
// ---------------------------------------------------------------------------

export class CodecUnavailableError extends Error {
  name = "CodecUnavailableError";
}

/** Hedef codec kullanılamadığında denenecek alternatifler (öncelik sırasıyla) */
const CODEC_FALLBACKS: Record<TargetVideoCodec, TargetVideoCodec[]> = {
  av1: ["vp9", "h264"],
  vp9: ["h264"],
  h265: ["h264"],
  h264: [],
};

export interface EngineChoice {
  engine: EngineId;
  /** Tercih edilen motor kullanılamadıysa açıklama */
  note?: string;
}

export async function chooseEngine(
  file: File,
  options: EncodeOptions,
  probe: ProbeResult | undefined,
  preference: EnginePreference = "auto",
): Promise<EngineChoice> {
  if (getDesktop() && (preference === "auto" || preference === "native")) {
    return { engine: "native" };
  }

  const size = probe?.video
    ? resolveDimensions(probe.video.width, probe.video.height, options.width, options.height)
    : undefined;

  const wantsWebCodecs = preference === "auto" || preference === "webcodecs";
  let note: string | undefined;
  if (wantsWebCodecs) {
    const reason =
      (await webCodecsSupportReason(options, size)) ??
      ((await canReadWithWebCodecs(file)) ? null : "Giriş formatı WebCodecs ile okunamıyor");
    if (!reason) return { engine: "webcodecs" };
    note = reason;
    if (preference === "webcodecs") note = `WebCodecs kullanılamıyor: ${reason}`;
  }

  // FFmpeg.wasm yalnızca H.264 / H.265 kodlayabilir (VP9 pratikte kullanılamayacak kadar yavaş, AV1 yok)
  if ((options.codec === "av1" || options.codec === "vp9") && !options.audioOnly) {
    throw new CodecUnavailableError(
      `${options.codec.toUpperCase()} bu tarayıcıda bu dosya için kodlanamıyor${note ? ` (${note})` : ""}. Chrome/Edge güncel sürümü veya masaüstü uygulamasını kullanın.`,
    );
  }
  if (file.size > FFMPEG_WASM_MAX_INPUT) {
    throw new Error(
      `Dosya FFmpeg.wasm için çok büyük (${(file.size / 1024 ** 3).toFixed(1)} GB)${note ? `; ${note}` : ""}. Masaüstü uygulamasını kullanın.`,
    );
  }
  return { engine: "ffmpeg-wasm", note };
}

export interface EncodeRequest {
  file: File;
  options: EncodeOptions;
  probe?: ProbeResult;
  engine?: EnginePreference;
  outputDir?: string;
  onProgress?: (p: EncodeProgress) => void;
  onEngineSelected?: (choice: EngineChoice) => void;
  /**
   * Hedef codec bu ortamda kodlanamıyorsa (ör. tarayıcıda AV1) uygun bir codec'e düş.
   * Öneri tabanlı akışlarda (kart / toplu dönüştürme) açıktır.
   */
  allowCodecFallback?: boolean;
}

export function encodeVideo(request: EncodeRequest): EncodeTask {
  let inner: EncodeTask | null = null;
  let canceled = false;

  const promise = (async (): Promise<EncodeResult> => {
    const { file, probe } = request;
    let options = request.options;
    request.onProgress?.({ progress: 0, elapsed: 0, stage: "preparing" });
    const probeResult = probe ?? (await probeFile(file));
    const duration = probeResult.duration;
    let choice: EngineChoice;
    try {
      choice = await chooseEngine(file, options, probeResult, request.engine);
    } catch (error) {
      if (!request.allowCodecFallback || !(error instanceof CodecUnavailableError)) throw error;
      const original = options.codec;
      let fallback: EngineChoice | null = null;
      for (const codec of CODEC_FALLBACKS[original]) {
        const candidate: EncodeOptions = { ...options, codec, container: undefined };
        // CRF ölçekleri farklı: VP9/AV1 0-63, H.264/H.265 0-51
        if (candidate.rate.mode === "crf" && (codec === "h264" || codec === "h265")) {
          candidate.rate = { ...candidate.rate, crf: codec === "h264" ? 23 : 28 };
        }
        if (candidate.audio.codec === "opus" && (codec === "h264" || codec === "h265")) {
          candidate.audio = { ...candidate.audio, codec: "aac" };
        }
        try {
          fallback = await chooseEngine(file, candidate, probeResult, request.engine);
          options = candidate;
          break;
        } catch (e) {
          if (!(e instanceof CodecUnavailableError)) throw e;
        }
      }
      if (!fallback) throw error;
      choice = {
        ...fallback,
        note: `${original.toUpperCase()} bu ortamda kodlanamıyor, ${options.codec.toUpperCase()} kullanılıyor`,
      };
    }
    request.onEngineSelected?.(choice);
    if (canceled) throw new EncodeCanceledError();

    switch (choice.engine) {
      case "native":
        inner = convertNative(file, options, duration, request.onProgress, request.outputDir);
        break;
      case "webcodecs":
        inner = convertWithWebCodecs(file, options, duration, request.onProgress);
        break;
      default:
        inner = convertWithFFmpegWasm(file, options, duration, request.onProgress);
    }

    try {
      return await inner.promise;
    } catch (error) {
      // "auto" modda WebCodecs beklenmedik şekilde başarısız olursa FFmpeg.wasm ile tekrar dene
      if (
        choice.engine === "webcodecs" &&
        (request.engine ?? "auto") === "auto" &&
        !(error instanceof EncodeCanceledError) &&
        !canceled &&
        (options.codec === "h264" || options.codec === "h265" || options.audioOnly) &&
        file.size <= FFMPEG_WASM_MAX_INPUT
      ) {
        console.warn("WebCodecs başarısız oldu, FFmpeg.wasm ile deneniyor:", error);
        request.onEngineSelected?.({
          engine: "ffmpeg-wasm",
          note: `WebCodecs hatası: ${error instanceof Error ? error.message : error}`,
        });
        inner = convertWithFFmpegWasm(file, options, duration, request.onProgress);
        return await inner.promise;
      }
      throw error;
    }
  })();

  return {
    promise,
    cancel: () => {
      canceled = true;
      inner?.cancel();
    },
  };
}

// ---------------------------------------------------------------------------
// Kalite ölçümü
// ---------------------------------------------------------------------------

export async function measureQuality(
  original: File,
  result: EncodeResult,
  trimStart = 0,
): Promise<QualityMetrics> {
  if (result.outputPath && getDesktop()) {
    return measureQualityNative(original, result.outputPath, trimStart);
  }
  if (!result.blob) throw new Error("Ölçüm için çıktı verisi yok");
  try {
    return await measureQualitySampled(original, result.blob, 12, trimStart);
  } catch (error) {
    // Tarayıcı dosyalardan birini çözemiyor (ör. AVI veya H.264'süz Chromium)
    if (original.size > FFMPEG_WASM_MAX_INPUT) throw error;
    return measureQualityWithFFmpegWasm(original, result.blob, trimStart);
  }
}

// ---------------------------------------------------------------------------
// Sonuç işlemleri
// ---------------------------------------------------------------------------

export function downloadResult(result: EncodeResult) {
  if (!result.blob) return;
  const url = URL.createObjectURL(result.blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = result.fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function revealResult(result: EncodeResult) {
  const desktop = getDesktop();
  if (desktop && result.outputPath) await desktop.showInFolder(result.outputPath);
  else downloadResult(result);
}

export const ENGINE_LABELS: Record<EngineId, string> = {
  webcodecs: "WebCodecs (GPU)",
  "ffmpeg-wasm": "FFmpeg.wasm",
  native: "Yerel FFmpeg",
};

export type CodecRoute = EngineId | "unsupported";

/** Her hedef codec için bu ortamda hangi motorun kullanılacağını söyler (arayüz rozetleri için). */
export async function getCodecRoutes(
  width = 1920,
  height = 1080,
): Promise<Record<TargetVideoCodec, CodecRoute>> {
  const codecs: TargetVideoCodec[] = ["h264", "h265", "vp9", "av1"];
  const routes = {} as Record<TargetVideoCodec, CodecRoute>;
  if (getDesktop()) {
    for (const c of codecs) routes[c] = "native";
    return routes;
  }
  await Promise.all(
    codecs.map(async (codec) => {
      const reason = await webCodecsSupportReason(
        { codec, rate: { mode: "crf", crf: 28 }, audio: { mode: "none" } },
        { width, height },
      ).catch(() => "error");
      routes[codec] = !reason
        ? "webcodecs"
        : codec === "av1" || codec === "vp9"
          ? "unsupported"
          : "ffmpeg-wasm";
    }),
  );
  return routes;
}
