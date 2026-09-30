/**
 * FFmpeg.wasm motoru.
 *
 * Neredeyse her formatı (AVI, FLV, WMV, MPEG-TS...) okuyabilir. Giriş dosyası WORKERFS
 * ile bağlandığı için belleğe kopyalanmaz; bu sayede eski 50MB sınırı kalkar.
 * Çıktı ise wasm belleğinde tutulur (pratikte ~1.5GB sınırı).
 */
// Sadece tip: paket, sunucu (Node) derlemesinde boş modül döndürür
import type { FFFSType, FFmpeg } from "@ffmpeg/ffmpeg";
import { resetFFmpeg, withFFmpeg } from "@/lib/ffmpeg/ffmpeg-instance";
import {
  buildFFmpegArgs,
  buildQualityArgs,
  parseFFmpegSpeed,
  parseFFmpegTime,
  parseQualityLog,
} from "./ffmpeg-args";
import { codecLabel, effectiveDuration, normalizeCodec, outputExtension, outputFileName, outputMime } from "./shared";
import {
  EncodeCanceledError,
  type EncodeOptions,
  type EncodeProgress,
  type EncodeTask,
  type ProbeResult,
  type QualityMetrics,
} from "./types";

/** Çıktı wasm belleğinde tutulduğu için makul bir üst sınır */
export const FFMPEG_WASM_MAX_INPUT = 2 * 1024 * 1024 * 1024;

let mountCounter = 0;

async function withMountedFile<T>(
  ffmpeg: FFmpeg,
  file: File,
  job: (path: string) => Promise<T>,
): Promise<T> {
  const dir = `/input${++mountCounter}`;
  await ffmpeg.createDir(dir);
  await ffmpeg.mount("WORKERFS" as FFFSType, { files: [file] }, dir);
  try {
    return await job(`${dir}/${file.name}`);
  } finally {
    try {
      await ffmpeg.unmount(dir);
      await ffmpeg.deleteDir(dir);
    } catch {
      // temizlik hatası kritik değil
    }
  }
}

interface FFProbeStream {
  codec_type?: string;
  codec_name?: string;
  profile?: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
  r_frame_rate?: string;
  bit_rate?: string;
  pix_fmt?: string;
  channels?: number;
  sample_rate?: string;
  color_primaries?: string;
  color_transfer?: string;
  bits_per_raw_sample?: string;
  tags?: Record<string, string>;
  side_data_list?: { rotation?: number }[];
}

interface FFProbeJson {
  streams?: FFProbeStream[];
  format?: { format_long_name?: string; format_name?: string; duration?: string; bit_rate?: string };
}

function parseRate(rate?: string): number {
  if (!rate) return 0;
  const [n, d] = rate.split("/").map(Number);
  if (!d) return n || 0;
  return n / d;
}

/** ffprobe JSON çıktısını ortak ProbeResult tipine çevirir (masaüstü de kullanır). */
export function probeJsonToResult(json: FFProbeJson, fileSize: number, source: ProbeResult["source"]): ProbeResult {
  const streams = json.streams ?? [];
  const v = streams.find((s) => s.codec_type === "video" && s.width);
  const a = streams.find((s) => s.codec_type === "audio");
  const duration = Number(json.format?.duration) || 0;
  const result: ProbeResult = {
    container: json.format?.format_long_name ?? json.format?.format_name ?? "unknown",
    duration,
    fileSize,
    bitrate: Number(json.format?.bit_rate) || (duration ? Math.round((fileSize * 8) / duration) : 0),
    videoTrackCount: streams.filter((s) => s.codec_type === "video").length,
    audioTrackCount: streams.filter((s) => s.codec_type === "audio").length,
    subtitleTrackCount: streams.filter((s) => s.codec_type === "subtitle").length,
    source,
  };
  if (v) {
    const codec = normalizeCodec(v.codec_name);
    const rotation = Math.abs(v.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? Number(v.tags?.rotate ?? 0)) % 360;
    const swap = rotation === 90 || rotation === 270;
    const avg = parseRate(v.avg_frame_rate);
    const r = parseRate(v.r_frame_rate);
    const transfer = v.color_transfer;
    result.video = {
      codec,
      codecLabel: codecLabel(codec),
      width: swap ? v.height! : v.width!,
      height: swap ? v.width! : v.height!,
      frameRate: Math.round((avg || r || 30) * 1000) / 1000,
      variableFrameRate: avg > 0 && r > 0 && Math.abs(avg - r) > 0.5,
      bitrate: Number(v.bit_rate) || undefined,
      pixelFormat: v.pix_fmt,
      profile: v.profile,
      rotation,
      hdr: transfer === "smpte2084" || transfer === "arib-std-b67",
      colorPrimaries: v.color_primaries,
      colorTransfer: transfer,
      bitDepth: v.pix_fmt?.includes("10") ? 10 : v.pix_fmt?.includes("12") ? 12 : 8,
    };
  }
  if (a) {
    const codec = normalizeCodec(a.codec_name);
    result.audio = {
      codec,
      codecLabel: codecLabel(codec),
      channels: a.channels ?? 2,
      sampleRate: Number(a.sample_rate) || 48000,
      bitrate: Number(a.bit_rate) || undefined,
      language: a.tags?.language,
    };
  }
  return result;
}

export function probeWithFFmpegWasm(file: File): Promise<ProbeResult> {
  return withFFmpeg((ffmpeg) =>
    withMountedFile(ffmpeg, file, async (path) => {
      const out = `/probe_${Date.now()}.json`;
      await ffmpeg.ffprobe(
        ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", path, "-o", out],
        30_000,
      );
      const text = (await ffmpeg.readFile(out, "utf8")) as string;
      await ffmpeg.deleteFile(out).catch(() => undefined);
      const json = JSON.parse(text) as FFProbeJson;
      if (!json.streams?.length) throw new Error("ffprobe akış bulamadı");
      return probeJsonToResult(json, file.size, "ffmpeg-wasm");
    }),
  );
}

/** FFmpeg.wasm ile ilk kareden küçük resim (JPEG blob URL) */
export function thumbnailWithFFmpegWasm(file: File, at = 1): Promise<string> {
  return withFFmpeg((ffmpeg) =>
    withMountedFile(ffmpeg, file, async (path) => {
      const out = `/thumb_${Date.now()}.jpg`;
      await ffmpeg.exec(["-loglevel", "error", "-ss", String(at), "-i", path, "-frames:v", "1", "-vf", "scale=320:-2", "-q:v", "3", out], 30_000);
      const data = (await ffmpeg.readFile(out)) as Uint8Array;
      await ffmpeg.deleteFile(out).catch(() => undefined);
      if (!data.length) throw new Error("Küçük resim boş");
      return URL.createObjectURL(new Blob([new Uint8Array(data)], { type: "image/jpeg" }));
    }),
  );
}

/** Tarayıcının çözemediği formatlar için FFmpeg.wasm ile PSNR/SSIM (ilk 20 sn) */
export function measureQualityWithFFmpegWasm(
  reference: File,
  distorted: Blob,
  trimStart = 0,
): Promise<QualityMetrics> {
  const distortedFile =
    distorted instanceof File ? distorted : new File([distorted], `distorted_${Date.now()}`, { type: distorted.type });
  return withFFmpeg((ffmpeg) =>
    withMountedFile(ffmpeg, reference, (refPath) =>
      withMountedFile(ffmpeg, distortedFile, async (disPath) => {
        const lines: string[] = [];
        const onLog = ({ message }: { message: string }) => lines.push(message);
        ffmpeg.on("log", onLog);
        try {
          await ffmpeg.exec(buildQualityArgs(disPath, refPath, trimStart, 20), 300_000);
        } finally {
          ffmpeg.off("log", onLog);
        }
        const parsed = parseQualityLog(lines.join("\n"));
        if (!parsed) throw new Error("Kalite ölçümü başarısız");
        return { psnr: parsed.psnr, ssim: parsed.ssim, samples: parsed.frames, method: "ffmpeg-full" as const };
      }),
    ),
  );
}

export function convertWithFFmpegWasm(
  file: File,
  options: EncodeOptions,
  duration: number,
  onProgress?: (p: EncodeProgress) => void,
): EncodeTask {
  const abort = new AbortController();
  let running = false;

  const promise = withFFmpeg((ffmpeg) =>
    withMountedFile(ffmpeg, file, async (inputPath) => {
      if (abort.signal.aborted) throw new EncodeCanceledError();
      running = true;
      const start = performance.now();
      const outPath = `/output_${Date.now()}.${outputExtension(options)}`;
      const cmd = buildFFmpegArgs(options, {
        input: inputPath,
        output: outPath,
        duration,
        target: "wasm",
      });
      const total = effectiveDuration(duration, options.trim) || duration;

      const recent: string[] = [];
      const logHandler = ({ message }: { message: string }) => {
        recent.push(message);
        if (recent.length > 40) recent.shift();
        const t = parseFFmpegTime(message);
        if (t === null || t < 0) return;
        const elapsed = (performance.now() - start) / 1000;
        const progress = total > 0 ? Math.min(0.99, t / total) : 0;
        onProgress?.({
          progress,
          processedTime: t,
          elapsed,
          speed: parseFFmpegSpeed(message),
          eta: progress > 0.02 ? (elapsed / progress) * (1 - progress) : undefined,
          stage: "encoding",
        });
      };

      ffmpeg.on("log", logHandler);
      onProgress?.({ progress: 0, elapsed: 0, stage: "encoding" });
      try {
        for (const args of cmd.passes) {
          const code = await ffmpeg.exec(args, -1, { signal: abort.signal }).catch((e) => {
            if (abort.signal.aborted) throw new EncodeCanceledError();
            throw e;
          });
          if (code !== 0) {
            const reason = recent.filter((l) => /error|invalid|unknown|not found|unsupported/i.test(l)).slice(-2).join(" / ");
            throw new Error(`FFmpeg ${code} koduyla çıktı${reason ? `: ${reason}` : ""}`);
          }
        }
        onProgress?.({ progress: 0.99, elapsed: (performance.now() - start) / 1000, stage: "finalizing" });
        const data = (await ffmpeg.readFile(outPath)) as Uint8Array;
        if (!data.length) throw new Error("Çıktı dosyası boş");
        const blob = new Blob([new Uint8Array(data)], { type: outputMime(options) });
        const elapsed = (performance.now() - start) / 1000;
        onProgress?.({ progress: 1, elapsed, stage: "done" });
        return {
          engine: "ffmpeg-wasm" as const,
          blob,
          size: blob.size,
          mimeType: blob.type,
          fileName: outputFileName(file.name, options),
          elapsed,
          encoderLabel: `FFmpeg.wasm ${cmd.encoder}`,
        };
      } finally {
        running = false;
        ffmpeg.off("log", logHandler);
        await ffmpeg.deleteFile(outPath).catch(() => undefined);
      }
    }),
  );

  return {
    promise: promise.catch((error) => {
      if (abort.signal.aborted) throw new EncodeCanceledError();
      throw error;
    }),
    cancel: () => {
      if (abort.signal.aborted) return;
      abort.abort();
      if (!running) return; // sırada bekliyordu, başlamadan düşer
      // exec() iptal sinyalini sadece mesaj katmanında dinler; worker'ı gerçekten durdurmak
      // için örneği sonlandırıyoruz. Bir sonraki iş yeni bir örnek yükler.
      resetFFmpeg();
    },
  };
}
