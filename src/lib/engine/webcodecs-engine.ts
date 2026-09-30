/**
 * WebCodecs motoru (Mediabunny).
 *
 * Mediabunny dosyayı parça parça okur (tüm dosyayı belleğe almaz), WebCodecs ile
 * donanım hızlandırmalı decode/encode yapar ve sonucu gerçek bir MP4/WebM/MKV/MOV
 * kapsayıcısına yazar. Ses izi de korunur/yeniden kodlanır.
 */
import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  CanvasSink,
  Conversion,
  ConversionCanceledError,
  Input,
  MkvOutputFormat,
  MovOutputFormat,
  Mp4OutputFormat,
  OggOutputFormat,
  Output,
  Quality,
  WavOutputFormat,
  WebMOutputFormat,
  canEncodeAudio,
  canEncodeVideo,
  type AudioCodec,
  type ConversionAudioOptions,
  type ConversionVideoOptions,
  type OutputFormat,
  type VideoCodec,
} from "mediabunny";
import {
  bitrateForTargetSize,
  codecLabel,
  defaultAudioBitrate,
  effectiveDuration,
  normalizeCodec,
  outputFileName,
  outputMime,
  resolveContainer,
} from "./shared";
import {
  EncodeCanceledError,
  type EncodeOptions,
  type EncodeProgress,
  type EncodeTask,
  type ProbeResult,
  type QualityMetrics,
  type TargetVideoCodec,
} from "./types";

export function isWebCodecsAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    "VideoEncoder" in window &&
    "VideoDecoder" in window &&
    "AudioEncoder" in window
  );
}

const TO_MB_VIDEO: Record<TargetVideoCodec, VideoCodec> = {
  h264: "avc",
  h265: "hevc",
  vp9: "vp9",
  av1: "av1",
};

function openInput(file: Blob): Input {
  return new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
}

/** Dosyayı Mediabunny ile okuyabiliyor muyuz? (MP4/MOV/WebM/MKV/MP3/WAV/Ogg/ADTS/TS...) */
export async function canReadWithWebCodecs(file: Blob): Promise<boolean> {
  const input = openInput(file);
  try {
    return await input.canRead();
  } catch {
    return false;
  } finally {
    input.dispose();
  }
}

export async function probeWithWebCodecs(file: File): Promise<ProbeResult> {
  const input = openInput(file);
  try {
    if (!(await input.canRead())) {
      throw new Error("Format WebCodecs motoru tarafından okunamıyor");
    }
    const format = await input.getFormat();
    const duration = await input.computeDuration();
    const videoTracks = await input.getVideoTracks();
    const audioTracks = await input.getAudioTracks();
    const videoTrack = await input.getPrimaryVideoTrack();
    const audioTrack = await input.getPrimaryAudioTrack();

    const result: ProbeResult = {
      container: format.name,
      duration,
      fileSize: file.size,
      bitrate: duration > 0 ? Math.round((file.size * 8) / duration) : 0,
      videoTrackCount: videoTracks.length,
      audioTrackCount: audioTracks.length,
      source: "webcodecs",
    };

    if (videoTrack) {
      const codec = normalizeCodec(await videoTrack.getCodec());
      const [width, height, rotation, colorSpace, hdr] = await Promise.all([
        videoTrack.getDisplayWidth(),
        videoTrack.getDisplayHeight(),
        videoTrack.getRotation(),
        videoTrack.getColorSpace().catch(() => ({}) as VideoColorSpaceInit),
        videoTrack.hasHighDynamicRange().catch(() => false),
      ]);

      // Gerçek FPS ve bitrate: paketlerin bir kısmını tarayarak hesapla
      let frameRate = 0;
      let variableFrameRate = false;
      try {
        const metrics = await videoTrack.computeFrameRateMetrics();
        frameRate = metrics.bestGuessFrameRate;
        variableFrameRate = metrics.underlyingFrameRate === null;
      } catch {
        // eski sürümler / okunamayan paketler
      }
      let videoBitrate: number | undefined;
      try {
        const stats = await videoTrack.computePacketStats(300);
        videoBitrate = Math.round(stats.averageBitrate);
        if (!frameRate) frameRate = stats.averagePacketRate;
      } catch {
        // yoksay
      }
      const codecString = await videoTrack.getCodecParameterString().catch(() => null);

      result.video = {
        codec,
        codecLabel: codecLabel(codec),
        width,
        height,
        frameRate: frameRate ? Math.round(frameRate * 1000) / 1000 : 30,
        variableFrameRate,
        bitrate: videoBitrate,
        rotation,
        hdr,
        colorPrimaries: colorSpace.primaries ?? undefined,
        colorTransfer: colorSpace.transfer ?? undefined,
        profile: codecString ?? undefined,
        pixelFormat: hdr ? "yuv420p10le" : "yuv420p",
        bitDepth: hdr ? 10 : 8,
      };
    }

    if (audioTrack) {
      const codec = normalizeCodec(await audioTrack.getCodec());
      let audioBitrate: number | undefined;
      try {
        const stats = await audioTrack.computePacketStats(200);
        audioBitrate = Math.round(stats.averageBitrate);
      } catch {
        // yoksay
      }
      result.audio = {
        codec,
        codecLabel: codecLabel(codec),
        channels: await audioTrack.getNumberOfChannels(),
        sampleRate: await audioTrack.getSampleRate(),
        bitrate: audioBitrate,
        language: audioTrack.languageCode,
      };
    }

    return result;
  } finally {
    input.dispose();
  }
}

function makeOutputFormat(options: EncodeOptions): OutputFormat {
  if (options.audioOnly) {
    switch (options.audioOnly) {
      case "opus":
        return new OggOutputFormat();
      case "wav":
        return new WavOutputFormat();
      case "m4a":
        return new Mp4OutputFormat({ fastStart: "in-memory" });
      default:
        throw new Error(`${options.audioOnly} çıktısı WebCodecs ile desteklenmiyor`);
    }
  }
  switch (resolveContainer(options)) {
    case "webm":
      return new WebMOutputFormat();
    case "mkv":
      return new MkvOutputFormat();
    case "mov":
      return new MovOutputFormat({ fastStart: "in-memory" });
    default:
      return new Mp4OutputFormat({ fastStart: "in-memory" });
  }
}

function audioCodecFor(options: EncodeOptions): AudioCodec | undefined {
  if (options.audioOnly === "wav") return "pcm-s16";
  if (options.audioOnly === "opus") return "opus";
  if (options.audioOnly === "m4a") return "aac";
  if (options.audio.codec) return options.audio.codec;
  const container = resolveContainer(options);
  return container === "webm" ? "opus" : "aac";
}

/** Bu seçenekler WebCodecs motoru ile yapılabilir mi? Değilse sebebini döndürür. */
export async function webCodecsSupportReason(
  options: EncodeOptions,
  size?: { width: number; height: number },
): Promise<string | null> {
  if (!isWebCodecsAvailable()) return "WebCodecs bu tarayıcıda yok";
  if (options.audioOnly === "mp3") return "MP3 kodlama WebCodecs'te yok";
  const ffmpegOnly: (keyof EncodeOptions)[] = [
    "deinterlace",
    "denoise",
    "videoFilter",
    "tune",
    "bframes",
    "refFrames",
    "level",
    "colorSpace",
    "colorRange",
    "twoPass",
  ];
  for (const key of ffmpegOnly) {
    if (options[key]) return `"${key}" seçeneği sadece FFmpeg ile uygulanabilir`;
  }
  if (options.pixelFormat && options.pixelFormat !== "yuv420p") {
    return "Özel piksel formatı sadece FFmpeg ile uygulanabilir";
  }
  if (!options.audioOnly) {
    const ok = await canEncodeVideo(TO_MB_VIDEO[options.codec], {
      width: size?.width ?? 1280,
      height: size?.height ?? 720,
    }).catch(() => false);
    if (!ok) return `${codecLabel(options.codec)} bu tarayıcıda kodlanamıyor`;
  }
  const audioCodec = audioCodecFor(options);
  if (options.audio.mode !== "none" && audioCodec && !audioCodec.startsWith("pcm")) {
    const ok = await canEncodeAudio(audioCodec).catch(() => false);
    if (!ok) return `${audioCodec} ses kodlaması bu tarayıcıda yok`;
  }
  return null;
}

export function convertWithWebCodecs(
  file: File,
  options: EncodeOptions,
  duration: number,
  onProgress?: (p: EncodeProgress) => void,
): EncodeTask {
  let conversion: Conversion | null = null;
  let canceled = false;

  const promise = (async () => {
    const start = performance.now();
    const input = openInput(file);
    try {
      const output = new Output({ format: makeOutputFormat(options), target: new BufferTarget() });
      const outDuration = effectiveDuration(duration, options.trim);
      const audioBitrate = defaultAudioBitrate(options);

      let videoQuality: Quality | undefined;
      if (options.rate.mode === "bitrate") {
        videoQuality = new Quality({ bitrate: options.rate.bitrate, bitrateMode: "variable" });
      } else if (options.rate.mode === "target-size") {
        const reservedAudio = options.audio.mode === "none" ? 0 : audioBitrate;
        videoQuality = new Quality({
          bitrate: bitrateForTargetSize(options.rate.bytes, outDuration, reservedAudio),
          bitrateMode: "variable",
        });
      } else {
        // CRF benzeri sabit kalite; desteklenmezse bitrate'e düşer
        videoQuality = new Quality({
          quantizer: options.rate.crf,
          bitrate: options.rate.fallbackBitrate ?? crfFallbackBitrate(options.rate.crf),
        });
      }

      const video: ConversionVideoOptions = options.audioOnly
        ? { discard: true }
        : {
            codec: TO_MB_VIDEO[options.codec],
            quality: videoQuality,
            width: options.width,
            height: options.height,
            fit: options.width && options.height ? "contain" : undefined,
            frameRate: options.frameRate,
            keyFrameInterval: options.keyframeInterval,
            rotate: options.rotate,
            crop: options.crop
              ? {
                  left: options.crop.x,
                  top: options.crop.y,
                  width: options.crop.width,
                  height: options.crop.height,
                }
              : undefined,
            hardwareAcceleration:
              options.hardware === "off"
                ? "prefer-software"
                : options.hardware === "prefer"
                  ? "prefer-hardware"
                  : "no-preference",
            forceTranscode: true,
          };

      let audio: ConversionAudioOptions;
      if (options.audio.mode === "none" && !options.audioOnly) {
        audio = { discard: true };
      } else {
        const codec = audioCodecFor(options);
        audio = {
          codec,
          quality: codec?.startsWith("pcm") ? undefined : new Quality({ bitrate: audioBitrate }),
          numberOfChannels: options.audio.channels,
          sampleRate: options.audio.sampleRate,
          forceTranscode: options.audio.mode === "encode",
        };
      }

      conversion = await Conversion.init({
        input,
        output,
        video,
        audio,
        tracks: "primary",
        trim: options.trim,
        tags: options.stripMetadata ? {} : undefined,
        showWarnings: false,
      });

      if (!conversion.isValid) {
        const reasons = conversion.discardedTracks
          .map((d) => `${d.track.type}: ${d.reason}`)
          .join(", ");
        throw new Error(`WebCodecs dönüştürmesi mümkün değil (${reasons})`);
      }

      conversion.onProgress = (progress, processedTime) => {
        const elapsed = (performance.now() - start) / 1000;
        const speed = elapsed > 0 ? processedTime / elapsed : undefined;
        onProgress?.({
          progress,
          processedTime,
          elapsed,
          speed,
          eta: progress > 0.02 ? (elapsed / progress) * (1 - progress) : undefined,
          stage: "encoding",
        });
      };

      if (canceled) throw new EncodeCanceledError();
      onProgress?.({ progress: 0, elapsed: 0, stage: "encoding" });
      await conversion.execute();

      const buffer = (output.target as BufferTarget).buffer;
      if (!buffer || buffer.byteLength === 0) throw new Error("Çıktı dosyası boş");
      const blob = new Blob([buffer], { type: outputMime(options) });
      const elapsed = (performance.now() - start) / 1000;
      onProgress?.({ progress: 1, elapsed, stage: "done" });

      return {
        engine: "webcodecs" as const,
        blob,
        size: blob.size,
        mimeType: blob.type,
        fileName: outputFileName(file.name, options),
        elapsed,
        encoderLabel: options.audioOnly
          ? `WebCodecs ${audioCodecFor(options)}`
          : `WebCodecs ${TO_MB_VIDEO[options.codec]}`,
      };
    } catch (error) {
      if (canceled || error instanceof ConversionCanceledError) throw new EncodeCanceledError();
      throw error;
    } finally {
      input.dispose();
    }
  })();

  return {
    promise,
    cancel: () => {
      canceled = true;
      void conversion?.cancel();
    },
  };
}

/** CRF kullanılamadığında yaklaşık bitrate (1080p referanslı kaba tahmin) */
function crfFallbackBitrate(crf: number): number {
  // CRF 23 ≈ 5 Mbps, her 6 CRF adımı bitrate'i yarıya indirir
  return Math.round(5_000_000 * Math.pow(2, (23 - crf) / 6));
}

/**
 * İki video arasında kalite ölçümü (PSNR + SSIM), eşit aralıklı karelerden örnekleyerek.
 * Karşılaştırma luma (Y) kanalında, 480p'ye küçültülmüş karelerde yapılır.
 */
export async function measureQualitySampled(
  reference: Blob,
  distorted: Blob,
  samples = 12,
  trimStart = 0,
): Promise<QualityMetrics> {
  const refInput = openInput(reference);
  const disInput = openInput(distorted);
  try {
    const refTrack = await refInput.getPrimaryVideoTrack();
    const disTrack = await disInput.getPrimaryVideoTrack();
    if (!refTrack || !disTrack) throw new Error("Video izi bulunamadı");
    if (!(await refTrack.canDecode()) || !(await disTrack.canDecode())) {
      throw new Error("Videolardan biri bu tarayıcıda çözülemiyor");
    }
    const disDuration = await disInput.computeDuration();
    const width = 640;
    const refAspect = (await refTrack.getDisplayHeight()) / (await refTrack.getDisplayWidth());
    const height = Math.max(2, Math.round((width * refAspect) / 2) * 2);

    const refSink = new CanvasSink(refTrack, { width, height, fit: "fill", poolSize: 1 });
    const disSink = new CanvasSink(disTrack, { width, height, fit: "fill", poolSize: 1 });

    const times: number[] = [];
    for (let i = 0; i < samples; i++) {
      times.push(((i + 0.5) / samples) * disDuration);
    }

    let psnrSum = 0;
    let ssimSum = 0;
    let count = 0;
    for (const t of times) {
      const [a, b] = await Promise.all([
        refSink.getCanvas(t + trimStart),
        disSink.getCanvas(t),
      ]);
      if (!a || !b) continue;
      const lumaA = toLuma(a.canvas, width, height);
      const lumaB = toLuma(b.canvas, width, height);
      psnrSum += Math.min(100, psnr(lumaA, lumaB));
      ssimSum += ssim(lumaA, lumaB, width, height);
      count++;
    }
    if (count === 0) throw new Error("Karşılaştırılacak kare alınamadı");
    return {
      psnr: psnrSum / count,
      ssim: ssimSum / count,
      samples: count,
      method: "sampled-frames",
    };
  } finally {
    refInput.dispose();
    disInput.dispose();
  }
}

function toLuma(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  width: number,
  height: number,
): Float32Array {
  const ctx = canvas.getContext("2d", { willReadFrequently: true }) as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!ctx) throw new Error("Canvas bağlamı alınamadı");
  const { data } = ctx.getImageData(0, 0, width, height);
  const out = new Float32Array(width * height);
  for (let i = 0, j = 0; j < out.length; i += 4, j++) {
    out[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return out;
}

function psnr(a: Float32Array, b: Float32Array): number {
  let mse = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    mse += d * d;
  }
  mse /= a.length;
  if (mse === 0) return 100;
  return 10 * Math.log10((255 * 255) / mse);
}

/** 8x8 bloklarla SSIM (Wang et al. 2004 sabitleri) */
function ssim(a: Float32Array, b: Float32Array, width: number, height: number): number {
  const C1 = (0.01 * 255) ** 2;
  const C2 = (0.03 * 255) ** 2;
  const block = 8;
  let total = 0;
  let blocks = 0;
  for (let y = 0; y + block <= height; y += block) {
    for (let x = 0; x + block <= width; x += block) {
      let ma = 0;
      let mb = 0;
      for (let j = 0; j < block; j++) {
        const row = (y + j) * width + x;
        for (let i = 0; i < block; i++) {
          ma += a[row + i];
          mb += b[row + i];
        }
      }
      const n = block * block;
      ma /= n;
      mb /= n;
      let va = 0;
      let vb = 0;
      let cov = 0;
      for (let j = 0; j < block; j++) {
        const row = (y + j) * width + x;
        for (let i = 0; i < block; i++) {
          const da = a[row + i] - ma;
          const db = b[row + i] - mb;
          va += da * da;
          vb += db * db;
          cov += da * db;
        }
      }
      va /= n - 1;
      vb /= n - 1;
      cov /= n - 1;
      total +=
        ((2 * ma * mb + C1) * (2 * cov + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2));
      blocks++;
    }
  }
  return blocks ? total / blocks : 1;
}
