/**
 * EncodeOptions -> FFmpeg argümanları.
 *
 * Hem FFmpeg.wasm (tarayıcı) hem de masaüstündeki yerel FFmpeg aynı oluşturucuyu kullanır.
 * Yerel tarafta donanım kodlayıcıları (NVENC, QSV, AMF, VideoToolbox) da desteklenir.
 */
import {
  bitrateForTargetSize,
  defaultAudioBitrate,
  effectiveDuration,
  even,
  ffBitrate,
  resolveContainer,
} from "./shared";
import type { EncodeOptions, TargetVideoCodec } from "./types";

export type FFTarget = "wasm" | "native";

export interface HardwareEncoders {
  /** codec -> kullanılabilir donanım kodlayıcı adı (ör. h264 -> "h264_nvenc") */
  h264?: string;
  h265?: string;
  av1?: string;
  vp9?: string;
}

export interface BuildContext {
  input: string;
  output: string;
  /** Giriş süresi (sn) — hedef boyut ve kırpma için */
  duration: number;
  target: FFTarget;
  /** Yerel tarafta mevcut yazılım kodlayıcıları (ör. libsvtav1 var mı) */
  softwareEncoders?: string[];
  hardwareEncoders?: HardwareEncoders;
  /** İki geçişli kodlama için log dosyası öneki */
  passLogFile?: string;
  /** Platforma göre null çıkış ("NUL" Windows'ta) */
  nullOutput?: string;
}

export interface BuiltCommand {
  /** Her eleman bir FFmpeg çalıştırmasıdır (iki geçişte iki eleman). */
  passes: string[][];
  encoder: string;
  hardware: boolean;
}

const X26X_PRESETS = [
  "ultrafast",
  "superfast",
  "veryfast",
  "faster",
  "fast",
  "medium",
  "slow",
  "slower",
  "veryslow",
];

function presetIndex(preset?: string): number {
  const i = X26X_PRESETS.indexOf(preset ?? "medium");
  return i === -1 ? 5 : i;
}

function pickEncoder(
  codec: TargetVideoCodec,
  ctx: BuildContext,
  options: EncodeOptions,
): { name: string; hardware: boolean } {
  if (ctx.target === "native" && options.hardware !== "off") {
    const hw = ctx.hardwareEncoders?.[codec];
    if (hw) return { name: hw, hardware: true };
  }
  switch (codec) {
    case "h264":
      return { name: "libx264", hardware: false };
    case "h265":
      return { name: "libx265", hardware: false };
    case "vp9":
      if (ctx.target === "wasm") {
        // FFmpeg.wasm'deki libvpx-vp9 tek iş parçacığında aşırı yavaş ve bazı ayarlarda kilitleniyor
        throw new Error("VP9 kodlama FFmpeg.wasm'de desteklenmiyor. WebCodecs veya masaüstü sürümünü kullanın.");
      }
      return { name: "libvpx-vp9", hardware: false };
    case "av1": {
      if (ctx.target === "wasm") {
        throw new Error("AV1 kodlama FFmpeg.wasm'de desteklenmiyor. WebCodecs veya masaüstü sürümünü kullanın.");
      }
      const sw = ctx.softwareEncoders ?? [];
      if (sw.includes("libsvtav1")) return { name: "libsvtav1", hardware: false };
      if (sw.includes("libaom-av1")) return { name: "libaom-av1", hardware: false };
      if (sw.includes("librav1e")) return { name: "librav1e", hardware: false };
      return { name: "libsvtav1", hardware: false };
    }
  }
}

/** CRF değerini (x264 ölçeği 0-51) donanım kodlayıcıların kalite parametrelerine çevirir. */
function hardwareQualityArgs(encoder: string, crf: number, codec: TargetVideoCodec): string[] {
  // AV1/VP9 CRF ölçeği (0-63) -> x264 ölçeğine yaklaşık dönüşüm
  const q = codec === "av1" || codec === "vp9" ? Math.round((crf * 51) / 63) : crf;
  if (encoder.endsWith("_nvenc")) return ["-rc", "vbr", "-cq", String(q), "-b:v", "0"];
  if (encoder.endsWith("_qsv")) return ["-global_quality", String(q)];
  if (encoder.endsWith("_amf"))
    return ["-rc", "cqp", "-qp_i", String(q), "-qp_p", String(q + 2), "-qp_b", String(q + 4)];
  if (encoder.endsWith("_videotoolbox")) {
    // 0-100 arası, yüksek = daha iyi. CRF 18 ≈ 75, CRF 28 ≈ 50
    const vtq = Math.max(1, Math.min(100, Math.round(120 - q * 2.5)));
    return ["-q:v", String(vtq)];
  }
  return ["-qp", String(q)];
}

function hardwarePresetArgs(encoder: string, preset?: string): string[] {
  const idx = presetIndex(preset);
  if (encoder.endsWith("_nvenc")) {
    // ultrafast..veryslow -> p1..p7
    const p = Math.min(7, Math.max(1, Math.round((idx / 8) * 6) + 1));
    return ["-preset", `p${p}`];
  }
  if (encoder.endsWith("_qsv")) {
    const map = ["veryfast", "veryfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow"];
    return ["-preset", map[idx]];
  }
  if (encoder.endsWith("_amf")) {
    return ["-quality", idx <= 2 ? "speed" : idx >= 6 ? "quality" : "balanced"];
  }
  return [];
}

function softwarePresetArgs(encoder: string, preset: string | undefined): string[] {
  const idx = presetIndex(preset);
  if (encoder === "libx264" || encoder === "libx265") {
    return ["-preset", X26X_PRESETS[idx]];
  }
  if (encoder === "libvpx-vp9") {
    const cpuUsed = Math.max(0, Math.min(8, 8 - idx));
    return ["-deadline", "good", "-cpu-used", String(cpuUsed), "-row-mt", "1"];
  }
  if (encoder === "libsvtav1") {
    // SVT-AV1 preset 0 (yavaş) - 13 (hızlı)
    return ["-preset", String(Math.max(2, 12 - idx))];
  }
  if (encoder === "libaom-av1") {
    return ["-cpu-used", String(Math.max(2, 8 - idx)), "-row-mt", "1"];
  }
  if (encoder === "librav1e") {
    return ["-speed", String(Math.max(2, 10 - idx))];
  }
  return [];
}

function audioArgs(options: EncodeOptions, container: string): string[] {
  if (options.audio.mode === "none" && !options.audioOnly) return ["-an"];
  if (options.audio.mode === "copy" && !options.audioOnly) return ["-c:a", "copy"];

  let codec: string;
  if (options.audioOnly === "wav") return ["-c:a", "pcm_s16le"];
  if (options.audioOnly === "mp3" || options.audio.codec === "mp3") codec = "libmp3lame";
  else if (options.audioOnly === "opus" || options.audio.codec === "opus" || container === "webm")
    codec = "libopus";
  else codec = "aac";

  const args = ["-c:a", codec, "-b:a", ffBitrate(defaultAudioBitrate(options))];
  if (options.audio.channels) args.push("-ac", String(options.audio.channels));
  if (options.audio.sampleRate) args.push("-ar", String(options.audio.sampleRate));
  else if (codec === "libopus") args.push("-ar", "48000");
  return args;
}

export function buildFFmpegArgs(options: EncodeOptions, ctx: BuildContext): BuiltCommand {
  // FFmpeg.wasm günlük seviyesini çalıştırmalar arasında saklar (ör. ffprobe -v error sonrası);
  // ilerleme satırları için seviyeyi her seferinde açıkça ayarlıyoruz.
  const head: string[] = ["-hide_banner", "-loglevel", "info", "-y"];
  if (ctx.target === "native") head.push("-nostdin");

  // Hızlı ve (yeniden kodlamada) kare hassasiyetinde kırpma
  const trimStart = options.trim?.start && options.trim.start > 0 ? options.trim.start : 0;
  if (trimStart) head.push("-ss", trimStart.toFixed(3));
  head.push("-i", ctx.input);
  const outDuration = effectiveDuration(ctx.duration, options.trim);
  const durationArgs: string[] = [];
  if (options.trim?.end && options.trim.end < ctx.duration) {
    durationArgs.push("-t", outDuration.toFixed(3));
  }

  const metaArgs = options.stripMetadata
    ? ["-map_metadata", "-1", "-map_chapters", "-1"]
    : [];

  // --- Sadece ses ---
  if (options.audioOnly) {
    const pass = [
      ...head,
      ...durationArgs,
      "-map",
      "0:a:0",
      "-vn",
      ...audioArgs(options, options.audioOnly),
      ...metaArgs,
      ctx.output,
    ];
    return { passes: [pass], encoder: pass[pass.indexOf("-c:a") + 1], hardware: false };
  }

  const container = resolveContainer(options);
  const encoder = pickEncoder(options.codec, ctx, options);
  const video: string[] = ["-map", "0:v:0", "-map", "0:a:0?", "-c:v", encoder.name];

  // --- Hız kontrolü ---
  let targetBitrate: number | undefined;
  if (options.rate.mode === "bitrate") targetBitrate = options.rate.bitrate;
  if (options.rate.mode === "target-size") {
    const audioReserve = options.audio.mode === "none" ? 0 : defaultAudioBitrate(options);
    targetBitrate = bitrateForTargetSize(options.rate.bytes, outDuration, audioReserve);
  }

  if (targetBitrate) {
    video.push("-b:v", ffBitrate(targetBitrate));
    if (options.rate.mode === "target-size") {
      // Hedef boyutu aşmamak için tepe değerleri sınırla
      video.push("-maxrate", ffBitrate(targetBitrate * 1.5), "-bufsize", ffBitrate(targetBitrate * 2));
    }
  } else if (options.rate.mode === "crf") {
    const crf = options.rate.crf;
    const maxBitrate = options.rate.maxBitrate;
    if (encoder.hardware) {
      video.push(...hardwareQualityArgs(encoder.name, crf, options.codec));
      if (maxBitrate) video.push("-maxrate", ffBitrate(maxBitrate), "-bufsize", ffBitrate(maxBitrate * 2));
    } else if (encoder.name === "libvpx-vp9" || encoder.name === "libaom-av1") {
      // libvpx/libaom: "-b:v 0" saf sabit kalite; "-b:v X" ise tavanlı sabit kalite (constrained quality).
      // -maxrate burada "-b:v 0" ile birlikte kodlayıcının açılmasını engeller.
      video.push("-crf", String(crf), "-b:v", maxBitrate ? ffBitrate(maxBitrate) : "0");
    } else if (encoder.name === "librav1e") {
      video.push("-qp", String(Math.round((crf / 63) * 255)));
    } else if (encoder.name === "libsvtav1") {
      video.push("-crf", String(crf));
    } else {
      // libx264 / libx265: CRF + VBV tavanı
      video.push("-crf", String(crf));
      if (maxBitrate) video.push("-maxrate", ffBitrate(maxBitrate), "-bufsize", ffBitrate(maxBitrate * 2));
    }
  }

  video.push(
    ...(encoder.hardware
      ? hardwarePresetArgs(encoder.name, options.preset)
      : softwarePresetArgs(encoder.name, options.preset)),
  );

  // --- Filtreler ---
  const filters: string[] = [];
  if (options.deinterlace) filters.push("yadif");
  if (options.crop) {
    const c = options.crop;
    filters.push(`crop=${even(c.width)}:${even(c.height)}:${c.x}:${c.y}`);
  }
  if (options.rotate === 90) filters.push("transpose=1");
  if (options.rotate === 180) filters.push("transpose=1,transpose=1");
  if (options.rotate === 270) filters.push("transpose=2");
  if (options.denoise) filters.push("hqdn3d");
  if (options.width || options.height) {
    const w = options.width ? even(options.width) : -2;
    const h = options.height ? even(options.height) : -2;
    filters.push(`scale=${w}:${h}:flags=bicubic`);
  }
  if (options.videoFilter) filters.push(options.videoFilter);
  if (filters.length) video.push("-vf", filters.join(","));

  if (options.frameRate) video.push("-r", String(options.frameRate));

  let pixFmt = options.pixelFormat || "yuv420p";
  // QSV/AMF 8-bit girişte yuv420p yerine nv12 bekler
  if ((encoder.name.endsWith("_qsv") || encoder.name.endsWith("_amf")) && pixFmt === "yuv420p") pixFmt = "nv12";
  if (!encoder.name.endsWith("_videotoolbox") || pixFmt !== "yuv420p") {
    video.push("-pix_fmt", pixFmt);
  }

  if (options.profile && (options.codec === "h264" || options.codec === "h265")) {
    const profile = options.codec === "h265" && options.profile === "high" ? "main" : options.profile;
    video.push("-profile:v", profile);
  }
  if (options.level && (options.codec === "h264" || options.codec === "h265")) {
    video.push("-level", options.level);
  }
  if (options.tune && !encoder.hardware && (encoder.name === "libx264" || encoder.name === "libx265")) {
    video.push("-tune", options.tune);
  }
  if (options.bframes !== undefined && !encoder.name.startsWith("libvpx")) {
    video.push("-bf", String(options.bframes));
  }
  if (options.refFrames !== undefined && !encoder.hardware && encoder.name === "libx264") {
    video.push("-refs", String(options.refFrames));
  }
  if (options.keyframeInterval) {
    const fps = options.frameRate || 30;
    video.push("-g", String(Math.max(1, Math.round(options.keyframeInterval * fps))));
  }
  if (options.colorSpace) video.push("-colorspace", options.colorSpace);
  if (options.colorRange) video.push("-color_range", options.colorRange);
  if (options.threads !== undefined) video.push("-threads", String(options.threads));

  // H.265'i Apple cihazlarda oynatılabilir yap
  if (options.codec === "h265" && (container === "mp4" || container === "mov")) {
    video.push("-tag:v", "hvc1");
  }

  const muxArgs: string[] = [];
  if ((container === "mp4" || container === "mov") && options.fastStart !== false) {
    muxArgs.push("-movflags", "+faststart");
  }

  const audio = audioArgs(options, container);

  const canTwoPass =
    options.twoPass &&
    ctx.target === "native" &&
    !encoder.hardware &&
    targetBitrate !== undefined &&
    ctx.passLogFile;

  if (canTwoPass) {
    const passLog = ["-passlogfile", ctx.passLogFile!];
    const pass1 = [
      ...head,
      ...durationArgs,
      ...video,
      ...passLog,
      "-pass",
      "1",
      "-an",
      "-f",
      "null",
      ctx.nullOutput ?? "/dev/null",
    ];
    const pass2 = [
      ...head,
      ...durationArgs,
      ...video,
      ...passLog,
      "-pass",
      "2",
      ...audio,
      ...metaArgs,
      ...muxArgs,
      ctx.output,
    ];
    return { passes: [pass1, pass2], encoder: encoder.name, hardware: false };
  }

  return {
    passes: [[...head, ...durationArgs, ...video, ...audio, ...metaArgs, ...muxArgs, ctx.output]],
    encoder: encoder.name,
    hardware: encoder.hardware,
  };
}

/** Kullanıcıya gösterilecek, kopyalanabilir tek satırlık komut */
export function formatCommand(args: string[], binary = "ffmpeg"): string {
  const quote = (a: string) => (/[\s"'$`\\;&|<>()]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);
  return [binary, ...args.map(quote)].join(" ");
}

/** FFmpeg log satırındaki "time=00:01:02.34" değerini saniyeye çevirir */
export function parseFFmpegTime(line: string): number | null {
  const m = line.match(/time=\s*(-?\d+):(\d{2}):(\d{2}(?:\.\d+)?)/);
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

export function parseFFmpegSpeed(line: string): number | undefined {
  const m = line.match(/speed=\s*([\d.]+)x/);
  return m ? Number(m[1]) : undefined;
}

/**
 * PSNR + SSIM ölçümü için FFmpeg argümanları. Bozulmuş (çıktı) video referans boyutuna
 * ölçeklenir. `maxDuration` ile uzun videolarda ölçüm süresi sınırlanır.
 */
export function buildQualityArgs(
  distorted: string,
  reference: string,
  trimStart = 0,
  maxDuration?: number,
): string[] {
  const limit = maxDuration ? ["-t", String(maxDuration)] : [];
  return [
    "-hide_banner",
    "-loglevel",
    "info",
    "-nostats",
    ...limit,
    "-i",
    distorted,
    ...(trimStart > 0 ? ["-ss", trimStart.toFixed(3)] : []),
    ...limit,
    "-i",
    reference,
    "-lavfi",
    // Kare bazında metadata basılır; FFmpeg.wasm çıkışta özet satırlarını yazamadığı için
    // ortalamayı kendimiz hesaplıyoruz.
    "[0:v][1:v]scale2ref=flags=bicubic[d][r];[r]split[r1][r2];[d][r1]ssim=shortest=1[s];[s][r2]psnr=shortest=1," +
      "metadata=print:key=lavfi.ssim.All,metadata=print:key=lavfi.psnr.psnr_avg",
    "-an",
    "-f",
    "null",
    "-",
  ];
}

/** Kare bazındaki "lavfi.ssim.All=" ve "lavfi.psnr.psnr_avg=" satırlarının ortalaması */
export function parseQualityLog(log: string): { psnr: number; ssim: number; frames: number } | null {
  const ssims = [...log.matchAll(/lavfi\.ssim\.All=([\d.]+)/g)].map((m) => Number(m[1]));
  const psnrs = [...log.matchAll(/lavfi\.psnr\.psnr_avg=([\d.]+|inf)/g)].map((m) =>
    m[1] === "inf" ? 100 : Math.min(100, Number(m[1])),
  );
  if (!ssims.length || !psnrs.length) return null;
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  return { ssim: avg(ssims), psnr: avg(psnrs), frames: ssims.length };
}
