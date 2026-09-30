/**
 * Masaüstü (Electron) motoru: işi ana sürece gönderir, ana süreç sistemdeki
 * (veya uygulamayla gelen) FFmpeg'i çalıştırır. Dosya boyutu sınırı yoktur, çıktı
 * doğrudan diske yazılır ve donanım kodlayıcıları kullanılabilir.
 */
import { getDesktop, type DesktopCapabilities } from "./desktop-bridge";
import { buildFFmpegArgs } from "./ffmpeg-args";
import { probeJsonToResult } from "./ffmpeg-wasm-engine";
import { effectiveDuration, outputFileName, outputMime } from "./shared";
import {
  EncodeCanceledError,
  type EncodeOptions,
  type EncodeProgress,
  type EncodeTask,
  type ProbeResult,
  type QualityMetrics,
} from "./types";

let capabilitiesPromise: Promise<DesktopCapabilities> | null = null;

export function getNativeCapabilities(refresh = false): Promise<DesktopCapabilities> {
  const desktop = getDesktop();
  if (!desktop) return Promise.reject(new Error("Masaüstü modu değil"));
  if (!capabilitiesPromise || refresh) {
    capabilitiesPromise = desktop.getCapabilities(refresh);
    capabilitiesPromise.catch(() => (capabilitiesPromise = null));
  }
  return capabilitiesPromise;
}

function requirePath(file: File): string {
  const desktop = getDesktop()!;
  const path = desktop.getPathForFile(file);
  if (!path) throw new Error("Dosyanın diskteki yolu alınamadı");
  return path;
}

export async function probeNative(file: File): Promise<ProbeResult> {
  const desktop = getDesktop()!;
  const { json, size } = await desktop.probe(requirePath(file));
  return probeJsonToResult(json as Parameters<typeof probeJsonToResult>[0], size, "native");
}

export async function thumbnailNative(file: File, at: number): Promise<string> {
  return getDesktop()!.thumbnail(requirePath(file), at);
}

let jobCounter = 0;

export function convertNative(
  file: File,
  options: EncodeOptions,
  duration: number,
  onProgress?: (p: EncodeProgress) => void,
  outputDir?: string,
): EncodeTask {
  const desktop = getDesktop()!;
  const id = `job-${Date.now()}-${++jobCounter}`;
  let canceled = false;

  const promise = (async () => {
    const start = performance.now();
    const inputPath = requirePath(file);
    const caps = await getNativeCapabilities();
    const prepared = await desktop.prepareOutput(inputPath, outputFileName(file.name, options), outputDir);
    const cmd = buildFFmpegArgs(options, {
      input: inputPath,
      output: prepared.outputPath,
      duration,
      target: "native",
      softwareEncoders: caps.softwareEncoders,
      hardwareEncoders: caps.hardwareEncoders,
      passLogFile: prepared.passLogFile,
      nullOutput: prepared.nullOutput,
    });
    const total = effectiveDuration(duration, options.trim) || duration;

    const unsubscribe = desktop.onEncodeProgress((event) => {
      if (event.id !== id) return;
      const elapsed = (performance.now() - start) / 1000;
      const passFraction = total > 0 ? Math.min(1, event.time / total) : 0;
      const progress = Math.min(0.99, (event.pass - 1 + passFraction) / event.totalPasses);
      onProgress?.({
        progress,
        processedTime: event.time,
        elapsed,
        speed: event.speed,
        eta: progress > 0.02 ? (elapsed / progress) * (1 - progress) : undefined,
        stage: "encoding",
        message: event.totalPasses > 1 ? `Geçiş ${event.pass}/${event.totalPasses}` : undefined,
      });
    });

    try {
      if (canceled) throw new EncodeCanceledError();
      onProgress?.({ progress: 0, elapsed: 0, stage: "encoding" });
      const result = await desktop.encode({
        id,
        passes: cmd.passes,
        outputPath: prepared.outputPath,
        duration: total,
      });
      const elapsed = (performance.now() - start) / 1000;
      onProgress?.({ progress: 1, elapsed, stage: "done" });
      return {
        engine: "native" as const,
        outputPath: result.outputPath,
        size: result.size,
        mimeType: outputMime(options),
        fileName: result.outputPath.split(/[\\/]/).pop() ?? outputFileName(file.name, options),
        elapsed,
        encoderLabel: cmd.hardware ? `${cmd.encoder} (GPU)` : cmd.encoder,
      };
    } catch (error) {
      if (canceled) throw new EncodeCanceledError();
      throw error;
    } finally {
      unsubscribe();
    }
  })();

  return {
    promise,
    cancel: () => {
      canceled = true;
      void desktop.cancelEncode(id);
    },
  };
}

export async function measureQualityNative(
  referenceFile: File,
  distortedPath: string,
  trimStart = 0,
): Promise<QualityMetrics> {
  const desktop = getDesktop()!;
  const { psnr, ssim } = await desktop.measureQuality(requirePath(referenceFile), distortedPath, trimStart);
  return { psnr, ssim, samples: 0, method: "ffmpeg-full" };
}
