import type { VideoPreset } from "@/lib/presets/video-presets";
import type {
  VideoMetadata,
  CompressionRecommendation,
} from "@/lib/types/video";

/**
 * VideoPreset'ten FFmpeg komutu oluştur
 */
export function generateFFmpegCommandFromPreset(
  inputFile: string,
  preset: VideoPreset,
  metadata: VideoMetadata,
  outputFile?: string
): string {
  const output = outputFile || getOutputFileName(inputFile, preset.codec);
  let command = `ffmpeg -i "${inputFile}"`;

  // Video filters (denoise vb.) - scale ile birleştir
  const videoFilters: string[] = [];
  if (preset.videoFilters) {
    videoFilters.push(preset.videoFilters);
  }

  // Resolution scale kontrolü (preset'te targetResolution yoksa orijinal korunur)
  // Şimdilik orijinal çözünürlüğü koruyoruz, ileride preset'e göre scale eklenebilir

  if (videoFilters.length > 0) {
    command += ` -vf "${videoFilters.join(",")}"`;
  }

  // Video codec
  switch (preset.codec) {
    case "av1":
      command += ` -c:v libaom-av1`;
      if (preset.crf !== undefined) {
        command += ` -crf ${preset.crf} -b:v 0`;
      }
      if (preset.preset !== undefined) {
        command += ` -preset ${preset.preset}`;
      }
      break;

    case "h265":
      command += ` -c:v libx265`;
      if (preset.crf !== undefined) {
        command += ` -crf ${preset.crf}`;
      }
      if (preset.preset !== undefined) {
        command += ` -preset ${preset.preset}`;
      }
      break;

    case "h264":
      command += ` -c:v libx264`;
      if (preset.crf !== undefined) {
        command += ` -crf ${preset.crf}`;
      }
      if (preset.preset !== undefined) {
        command += ` -preset ${preset.preset}`;
      }
      break;

    case "hevc_nvenc":
      command += ` -c:v hevc_nvenc`;
      if (preset.cq !== undefined) {
        command += ` -cq ${preset.cq} -b:v 0`;
      }
      if (preset.preset !== undefined) {
        command += ` -preset ${preset.preset}`;
      }
      break;

    case "hevc_amf":
      command += ` -c:v hevc_amf`;
      if (preset.cq !== undefined) {
        command += ` -quality quality -rc cqp -qp_i ${preset.cq} -qp_p ${preset.cq} -qp_b ${preset.cq}`;
      }
      break;

    case "vp9":
      command += ` -c:v libvpx-vp9`;
      if (preset.crf !== undefined) {
        command += ` -crf ${preset.crf} -b:v 0`;
      }
      break;
  }

  // Pixel format
  command += ` -pix_fmt ${preset.pixFmt}`;

  // Audio codec
  command += ` -c:a ${preset.audioCodec} -b:a ${preset.audioBitrate}k`;

  // Output
  command += ` "${output}"`;

  return command;
}

/**
 * Codec'e göre output dosya adı oluştur
 */
function getOutputFileName(inputFile: string, codec: string): string {
  const baseName = inputFile.replace(/\.[^/.]+$/, "");

  switch (codec) {
    case "av1":
    case "vp9":
      return `${baseName}.webm`;
    case "h265":
    case "h264":
    case "hevc_nvenc":
    case "hevc_amf":
      return `${baseName}.mp4`;
    default:
      return `${baseName}.mp4`;
  }
}

/**
 * Preset'ten CompressionRecommendation oluştur (mevcut sistemle uyumluluk için)
 */
export function presetToRecommendation(
  preset: VideoPreset,
  metadata: VideoMetadata
): CompressionRecommendation {
  // Codec mapping
  const codecMap: Record<string, "h264" | "h265" | "vp9" | "av1"> = {
    av1: "av1",
    h265: "h265",
    h264: "h264",
    vp9: "vp9",
    hevc_nvenc: "h265",
    hevc_amf: "h265",
  };

  const codec = codecMap[preset.codec] || "h265";
  const codecName = getCodecName(preset.codec);

  // Preset string'e çevir (CompressionRecommendation tipine uygun)
  let presetString: CompressionRecommendation["preset"] = "medium";

  if (typeof preset.preset === "number") {
    // AV1 preset: 0-8, daha yüksek = daha hızlı
    // Sayısal preset'leri string'e çevir
    if (preset.preset <= 2) {
      presetString = "veryslow";
    } else if (preset.preset <= 3) {
      presetString = "slower";
    } else if (preset.preset <= 4) {
      presetString = "slow";
    } else if (preset.preset <= 5) {
      presetString = "medium";
    } else if (preset.preset <= 6) {
      presetString = "fast";
    } else {
      presetString = "veryfast";
    }
  } else if (typeof preset.preset === "string") {
    // String preset'leri kontrol et
    const validPresets: CompressionRecommendation["preset"][] = [
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
    if (
      validPresets.includes(
        preset.preset as CompressionRecommendation["preset"]
      )
    ) {
      presetString = preset.preset as CompressionRecommendation["preset"];
    }
  }

  // Bitrate tahmini (CRF kullanıyorsak yaklaşık)
  const estimatedBitrate = estimateBitrateFromCRF(
    metadata.width,
    metadata.height,
    metadata.framerate,
    preset.crf || preset.cq || 26,
    codec
  );

  // Dosya boyutu tahmini
  const estimatedSize = estimateFileSize(
    estimatedBitrate,
    metadata.duration,
    preset.audioBitrate * 1000
  );

  const estimatedSavings = metadata.fileSize - estimatedSize;
  const estimatedSavingsPercent = (estimatedSavings / metadata.fileSize) * 100;

  // Encoding süresi tahmini
  const estimatedTime = estimateEncodingTime(
    metadata.duration,
    preset.codec,
    preset.preset
  );

  // FFmpeg komutu
  const ffmpegCommand = generateFFmpegCommandFromPreset(
    metadata.filename,
    preset,
    metadata
  );

  // Resolution (orijinal çözünürlüğü koru)
  const resolution = {
    width: metadata.width,
    height: metadata.height,
    scale: "original" as const,
  };

  // Explanation
  const qualityInfo =
    preset.quality === "balanced"
      ? "Dengeli"
      : preset.quality === "quality"
      ? "Maksimum Kalite"
      : "Hızlı";
  const explanation = `${preset.name} preset'i kullanarak ${qualityInfo} ayarlarla dosya boyutunu optimize edebilirsiniz. Encoding süresi video süresine göre değişecektir.`;

  return {
    codec,
    codecName,
    crf: preset.crf || preset.cq,
    quality: preset.crf || preset.cq,
    preset: presetString as CompressionRecommendation["preset"],
    resolution,
    bitrate: estimatedBitrate,
    estimatedSize,
    estimatedSavings,
    estimatedSavingsPercent,
    estimatedTime,
    ffmpegCommand,
    explanation,
    audioCodec: preset.audioCodec,
    audioBitrate: preset.audioBitrate,
  };
}

function getCodecName(codec: string): string {
  const names: Record<string, string> = {
    av1: "AV1",
    h265: "H.265 (HEVC)",
    h264: "H.264 (AVC)",
    vp9: "VP9",
    hevc_nvenc: "HEVC NVENC",
    hevc_amf: "HEVC AMF",
  };
  return names[codec] || "H.265 (HEVC)";
}

function estimateBitrateFromCRF(
  width: number,
  height: number,
  framerate: number,
  crf: number,
  codec: string
): number {
  const pixels = width * height;
  const pixelRate = pixels * framerate;

  // CRF'den bitrate tahmini (yaklaşık)
  // Daha yüksek CRF = daha düşük bitrate
  const crfFactor = 1 - (crf - 18) / 30; // 18-48 arası CRF için
  let baseBpp = 0.1;

  if (codec === "av1") {
    baseBpp = 0.06;
  } else if (codec === "h265") {
    baseBpp = 0.08;
  } else if (codec === "h264") {
    baseBpp = 0.1;
  }

  const bpp = baseBpp * crfFactor;
  return Math.round(pixelRate * bpp);
}

function estimateFileSize(
  bitrate: number,
  duration: number,
  audioBitrate: number
): number {
  const videoBits = bitrate * duration;
  const audioBits = audioBitrate * duration;
  return (videoBits + audioBits) / 8;
}

function estimateEncodingTime(
  duration: number,
  codec: string,
  preset: number | string | undefined
): number {
  let baseTime = duration * 0.5;
  let multiplier = 1.0;

  // Codec hızı
  if (codec === "av1") {
    multiplier *= 3.0; // AV1 çok yavaş
  } else if (codec === "hevc_nvenc" || codec === "hevc_amf") {
    multiplier *= 0.3; // Hardware encoding çok hızlı
  } else if (codec === "h265") {
    multiplier *= 1.5;
  }

  // Preset hızı
  if (typeof preset === "number") {
    // AV1: 0-8, daha yüksek = daha hızlı
    if (preset <= 3) {
      multiplier *= 2.5; // Çok yavaş
    } else if (preset <= 5) {
      multiplier *= 1.5; // Orta
    }
  } else if (typeof preset === "string") {
    if (preset.includes("slow") || preset.includes("veryslow")) {
      multiplier *= 2.0;
    } else if (preset === "medium") {
      multiplier *= 1.5;
    }
  }

  return baseTime * multiplier;
}
