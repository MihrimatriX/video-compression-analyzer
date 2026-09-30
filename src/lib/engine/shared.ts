import type {
  AudioOnlyFormat,
  EncodeOptions,
  OutputContainer,
  TargetVideoCodec,
} from "./types";

const CODEC_LABELS: Record<string, string> = {
  h264: "H.264 (AVC)",
  h265: "H.265 (HEVC)",
  vp8: "VP8",
  vp9: "VP9",
  av1: "AV1",
  mpeg4: "MPEG-4 Part 2",
  mpeg2video: "MPEG-2",
  prores: "Apple ProRes",
  wmv3: "WMV9",
  vc1: "VC-1",
  flv1: "Sorenson H.263 (FLV)",
  theora: "Theora",
  aac: "AAC",
  opus: "Opus",
  mp3: "MP3",
  vorbis: "Vorbis",
  flac: "FLAC",
  ac3: "Dolby Digital (AC-3)",
  eac3: "Dolby Digital Plus (E-AC-3)",
  dts: "DTS",
  pcm: "PCM",
};

/** Farklı kaynaklardan gelen codec adlarını tek bir kimliğe indirger. */
export function normalizeCodec(raw: string | null | undefined): string {
  if (!raw) return "unknown";
  const c = raw.toLowerCase();
  if (c === "avc" || c === "h264" || c.startsWith("avc1") || c.startsWith("avc3"))
    return "h264";
  if (c === "hevc" || c === "h265" || c.startsWith("hev1") || c.startsWith("hvc1"))
    return "h265";
  if (c.startsWith("vp09") || c === "vp9") return "vp9";
  if (c === "vp8") return "vp8";
  if (c.startsWith("av01") || c === "av1") return "av1";
  if (c.startsWith("pcm")) return "pcm";
  if (c === "mp4a.40.2" || c === "aac") return "aac";
  return c;
}

export function codecLabel(codec: string): string {
  return CODEC_LABELS[codec] ?? codec.toUpperCase();
}

export function defaultContainerFor(codec: TargetVideoCodec): OutputContainer {
  return codec === "vp9" || codec === "av1" ? "webm" : "mp4";
}

export function resolveContainer(options: EncodeOptions): OutputContainer {
  const requested = options.container ?? defaultContainerFor(options.codec);
  // WebM sadece VP8/VP9/AV1 taşıyabilir
  if (requested === "webm" && (options.codec === "h264" || options.codec === "h265")) {
    return "mp4";
  }
  return requested;
}

export const AUDIO_ONLY_EXT: Record<AudioOnlyFormat, string> = {
  m4a: "m4a",
  opus: "ogg",
  mp3: "mp3",
  wav: "wav",
};

export const AUDIO_ONLY_MIME: Record<AudioOnlyFormat, string> = {
  m4a: "audio/mp4",
  opus: "audio/ogg",
  mp3: "audio/mpeg",
  wav: "audio/wav",
};

export const CONTAINER_MIME: Record<OutputContainer, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mkv: "video/x-matroska",
  mov: "video/quicktime",
};

export function outputExtension(options: EncodeOptions): string {
  if (options.audioOnly) return AUDIO_ONLY_EXT[options.audioOnly];
  return resolveContainer(options);
}

export function outputMime(options: EncodeOptions): string {
  if (options.audioOnly) return AUDIO_ONLY_MIME[options.audioOnly];
  return CONTAINER_MIME[resolveContainer(options)];
}

export function outputFileName(inputName: string, options: EncodeOptions): string {
  const base = inputName.replace(/\.[^/.]+$/, "");
  const suffix = options.audioOnly ? "audio" : `${options.codec}`;
  return `${base}_${suffix}.${outputExtension(options)}`;
}

export function defaultAudioBitrate(options: EncodeOptions): number {
  return options.audio.bitrate ?? (options.audio.codec === "opus" ? 96_000 : 128_000);
}

/** Hedef dosya boyutuna ulaşmak için gereken video bitrate'ini hesaplar. */
export function bitrateForTargetSize(
  targetBytes: number,
  durationSeconds: number,
  audioBitrate: number,
): number {
  if (!durationSeconds || durationSeconds <= 0) return 1_000_000;
  // %3 konteyner yükü payı
  const totalBits = targetBytes * 8 * 0.97;
  const videoBitrate = totalBits / durationSeconds - audioBitrate;
  return Math.max(80_000, Math.floor(videoBitrate));
}

/** Kırpma sonrası efektif süre */
export function effectiveDuration(duration: number, trim?: EncodeOptions["trim"]): number {
  const start = Math.max(0, trim?.start ?? 0);
  const end = Math.min(duration, trim?.end ?? duration);
  return Math.max(0, end - start);
}

/** Bitrate değerini FFmpeg formatına çevirir (ör. 2500000 -> "2500k") */
export function ffBitrate(bps: number): string {
  return `${Math.max(1, Math.round(bps / 1000))}k`;
}

/** Çift sayıya yuvarla (çoğu kodlayıcı tek sayı boyut kabul etmez) */
export function even(n: number): number {
  return Math.max(2, Math.round(n / 2) * 2);
}

/** Sadece genişlik veya yükseklik verildiğinde diğerini en-boy oranından hesaplar. */
export function resolveDimensions(
  srcWidth: number,
  srcHeight: number,
  width?: number,
  height?: number,
): { width: number; height: number } {
  if (width && height) return { width: even(width), height: even(height) };
  if (width && srcWidth) return { width: even(width), height: even((width / srcWidth) * srcHeight) };
  if (height && srcHeight)
    return { width: even((height / srcHeight) * srcWidth), height: even(height) };
  return { width: even(srcWidth), height: even(srcHeight) };
}

export function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" ||
      error.name === "EncodeCanceledError" ||
      error.name === "ConversionCanceledError")
  );
}
