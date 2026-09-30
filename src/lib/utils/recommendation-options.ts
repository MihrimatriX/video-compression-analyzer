import type { EncodeOptions } from "@/lib/engine/types";
import type { CompressionRecommendation, VideoMetadata } from "@/lib/types/video";

/** Kısa kenarı `shortSide` piksele indirecek genişlik/yükseklik seçeneği (büyütme yapmaz) */
export function shortSideScale(
  metadata: Pick<VideoMetadata, "width" | "height">,
  shortSide: number,
): { width?: number; height?: number } {
  const portrait = metadata.height > metadata.width;
  const current = portrait ? metadata.width : metadata.height;
  if (!current || shortSide >= current) return {};
  return portrait ? { width: shortSide } : { height: shortSide };
}

/** Analiz önerisini motorun anladığı EncodeOptions'a çevirir. */
export function recommendationToOptions(
  rec: CompressionRecommendation,
  metadata: VideoMetadata,
): EncodeOptions {
  const crf = rec.crf ?? rec.quality;
  const scaled =
    rec.resolution.scale !== "original" &&
    (rec.resolution.width !== metadata.width || rec.resolution.height !== metadata.height);

  // Öneri kbps cinsinden ses bitrate'i taşır
  const audioBitrate = rec.audioBitrate ? rec.audioBitrate * 1000 : 128_000;
  const audioCodec = rec.audioCodec?.includes("opus")
    ? "opus"
    : rec.audioCodec?.includes("mp3")
      ? "mp3"
      : rec.codec === "vp9" || rec.codec === "av1"
        ? "opus"
        : "aac";

  return {
    codec: rec.codec,
    rate:
      crf !== undefined
        ? // Tepe bitrate'i önerinin 2 katıyla sınırla: CRF'nin dosyayı şişirmesini engeller
          {
            mode: "crf",
            crf,
            maxBitrate: rec.bitrate ? rec.bitrate * 2 : undefined,
            fallbackBitrate: rec.bitrate || undefined,
          }
        : { mode: "bitrate", bitrate: rec.bitrate },
    preset: rec.preset,
    // "1080p" gibi hedefleri kısa kenara uygula: dikey (9:16) videolar da doğru ölçeklenir,
    // diğer kenar en-boy oranından hesaplanır
    ...(scaled ? shortSideScale(metadata, Math.min(rec.resolution.width, rec.resolution.height)) : {}),
    audio: metadata.audioCodec
      ? { mode: "encode", codec: audioCodec, bitrate: audioBitrate }
      : { mode: "none" },
    fastStart: true,
  };
}
