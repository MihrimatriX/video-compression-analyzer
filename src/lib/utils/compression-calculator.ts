import type {
  VideoMetadata,
  CompressionRecommendation,
} from "@/lib/types/video";

interface CodecInfo {
  name: string;
  codec: "h264" | "h265" | "vp9" | "av1";
  compressionRatio: number;
  encodingSpeed: "fast" | "medium" | "slow";
  qualityFactor: number;
}

const CODECS: CodecInfo[] = [
  {
    name: "H.264 (AVC)",
    codec: "h264",
    compressionRatio: 1.0,
    encodingSpeed: "fast",
    qualityFactor: 1.0,
  },
  {
    name: "H.265 (HEVC)",
    codec: "h265",
    compressionRatio: 1.5,
    encodingSpeed: "medium",
    qualityFactor: 0.85,
  },
  {
    name: "VP9",
    codec: "vp9",
    compressionRatio: 1.3,
    encodingSpeed: "slow",
    qualityFactor: 0.9,
  },
  {
    name: "AV1",
    codec: "av1",
    compressionRatio: 1.8,
    encodingSpeed: "slow",
    qualityFactor: 0.8,
  },
];

function calculateOptimalBitrate(
  width: number,
  height: number,
  framerate: number,
  codecInfo: CodecInfo,
  originalBitrate?: number
): number {
  const pixels = width * height;
  const pixelRate = pixels * framerate;

  // Eğer orijinal bitrate varsa, codec'in sıkıştırma oranına göre azalt
  if (originalBitrate && originalBitrate > 0) {
    // Daha iyi codec'ler aynı kalitede daha düşük bitrate kullanabilir
    // compressionRatio ne kadar yüksekse, o kadar fazla sıkıştırma yapabilir
    // Yani bitrate'i compressionRatio'ya bölmeliyiz
    // Her codec için farklı sıkıştırma faktörü uygula
    let compressionFactor = codecInfo.compressionRatio;

    // Codec'e göre ekstra sıkıştırma faktörü
    if (codecInfo.codec === "av1") {
      compressionFactor *= 1.3; // AV1 için %30 ekstra
    } else if (codecInfo.codec === "h265") {
      compressionFactor *= 1.2; // HEVC için %20 ekstra
    } else if (codecInfo.codec === "vp9") {
      compressionFactor *= 1.15; // VP9 için %15 ekstra
    } else {
      compressionFactor *= 1.1; // H264 için %10 ekstra
    }

    const optimizedBitrate = originalBitrate / compressionFactor;

    // Minimum bitrate kontrolü (çok düşük bitrate kaliteyi bozar)
    // Çözünürlüğe göre minimum bitrate
    let minBpp = 0.02; // Minimum bits per pixel
    if (pixels >= 3840 * 2160) {
      minBpp = 0.03; // 4K için biraz daha yüksek
    } else if (pixels >= 1920 * 1080) {
      minBpp = 0.025; // 1080p
    } else if (pixels >= 1280 * 720) {
      minBpp = 0.02; // 720p
    } else {
      minBpp = 0.015; // Düşük çözünürlük
    }

    const minBitrate = pixelRate * minBpp;
    return Math.max(Math.round(optimizedBitrate), Math.round(minBitrate));
  }

  // Base bitrate calculation (bits per pixel per second)
  // Daha iyi codec'ler için daha düşük bpp kullan
  let bpp = 0.08; // Base for H.264 (daha agresif)

  // Adjust based on resolution
  if (pixels >= 3840 * 2160) {
    bpp = 0.12; // 4K
  } else if (pixels >= 1920 * 1080) {
    bpp = 0.08; // 1080p
  } else if (pixels >= 1280 * 720) {
    bpp = 0.06; // 720p
  } else {
    bpp = 0.05; // Lower resolutions
  }

  // Adjust based on framerate
  if (framerate > 50) {
    bpp *= 1.15; // Daha az artış
  } else if (framerate > 30) {
    bpp *= 1.1;
  }

  // Daha iyi codec'ler için bitrate'i azalt (compressionRatio'ya böl)
  // compressionRatio ne kadar yüksekse, o kadar iyi sıkıştırma
  bpp = bpp / codecInfo.compressionRatio;

  const bitrate = pixelRate * bpp;
  return Math.round(bitrate);
}

function calculateOptimalCRF(codec: "h264" | "h265" | "vp9" | "av1"): number {
  switch (codec) {
    case "h264":
      return 26; // Daha agresif sıkıştırma için yüksek CRF
    case "h265":
      return 30; // HEVC daha verimli, daha yüksek CRF kullanabilir
    case "vp9":
      return 36; // VP9 için daha agresif sıkıştırma
    case "av1":
      return 40; // AV1 en verimli, en yüksek CRF
    default:
      return 26;
  }
}

function calculateOptimalPreset(
  codec: "h264" | "h265" | "vp9" | "av1",
  fileSize: number
): CompressionRecommendation["preset"] {
  // For larger files, suggest slower presets for better compression
  if (fileSize > 500 * 1024 * 1024) {
    // > 500MB
    return "slow";
  } else if (fileSize > 100 * 1024 * 1024) {
    // > 100MB
    return "medium";
  }
  return "fast";
}

function estimateFileSize(
  bitrate: number,
  duration: number,
  audioBitrate: number = 128000
): number {
  const videoBits = bitrate * duration;
  const audioBits = audioBitrate * duration;
  return (videoBits + audioBits) / 8; // Convert to bytes
}

function calculateOptimalResolution(
  width: number,
  height: number,
  codec: "h264" | "h265" | "vp9" | "av1"
): {
  width: number;
  height: number;
  scale: "original" | "downscale" | "upscale";
} {
  // For modern codecs, we can often maintain original resolution
  // For older codecs or very high resolutions, suggest downscaling

  if (codec === "av1" || codec === "h265") {
    // Modern codecs handle high resolutions well
    if (width > 3840 || height > 2160) {
      // Downscale 4K+ to 1080p for better compatibility
      return {
        width: 1920,
        height: 1080,
        scale: "downscale",
      };
    }
    return { width, height, scale: "original" };
  }

  // For H.264 and VP9, be more conservative
  if (width > 1920 || height > 1080) {
    return {
      width: 1920,
      height: 1080,
      scale: "downscale",
    };
  }

  return { width, height, scale: "original" };
}

function generateFFmpegCommand(
  inputFile: string,
  recommendation: CompressionRecommendation,
  outputFile: string
): string {
  const {
    codec,
    bitrate,
    crf,
    quality,
    preset,
    resolution,
    audioCodec,
    audioBitrate,
  } = recommendation;

  let command = `ffmpeg -i "${inputFile}"`;

  // Video codec
  switch (codec) {
    case "h264":
      command += ` -c:v libx264`;
      if (crf !== undefined) {
        command += ` -crf ${crf}`;
      } else {
        command += ` -b:v ${bitrate}`;
      }
      command += ` -preset ${preset}`;
      break;
    case "h265":
      command += ` -c:v libx265`;
      if (crf !== undefined) {
        command += ` -crf ${crf}`;
      } else {
        command += ` -b:v ${bitrate}`;
      }
      command += ` -preset ${preset}`;
      break;
    case "vp9":
      command += ` -c:v libvpx-vp9`;
      if (quality !== undefined) {
        command += ` -crf ${quality} -b:v 0`;
      } else {
        command += ` -b:v ${bitrate}`;
      }
      break;
    case "av1":
      command += ` -c:v libaom-av1`;
      if (quality !== undefined) {
        command += ` -crf ${quality} -b:v 0`;
      } else {
        command += ` -b:v ${bitrate}`;
      }
      break;
  }

  // Resolution
  if (resolution.scale !== "original") {
    command += ` -vf scale=${resolution.width}:${resolution.height}`;
  }

  // Audio codec - recommendation'dan al veya varsayılan olarak codec'e göre seç
  const finalAudioCodec =
    audioCodec || (codec === "av1" || codec === "vp9" ? "libopus" : "aac");
  const finalAudioBitrate = audioBitrate || 128;

  command += ` -c:a ${finalAudioCodec} -b:a ${finalAudioBitrate}k`;

  // Output
  command += ` "${outputFile}"`;

  return command;
}

export function calculateOptimalCompression(
  metadata: VideoMetadata
): CompressionRecommendation[] {
  const recommendations: CompressionRecommendation[] = [];

  for (const codecInfo of CODECS) {
    const optimalBitrate = calculateOptimalBitrate(
      metadata.width,
      metadata.height,
      metadata.framerate,
      codecInfo,
      metadata.bitrate // Orijinal bitrate'i geç
    );

    const crf = calculateOptimalCRF(codecInfo.codec);
    const preset = calculateOptimalPreset(codecInfo.codec, metadata.fileSize);
    const resolution = calculateOptimalResolution(
      metadata.width,
      metadata.height,
      codecInfo.codec
    );

    // CRF'yi hesaba katarak dosya boyutunu daha doğru hesapla
    // Daha yüksek CRF = daha küçük dosya (aynı kalitede)
    // CRF faktörü: her CRF birimi yaklaşık %8-10 dosya boyutu etkisi
    const baseCRF = 23; // Referans CRF
    const crfFactor = Math.pow(0.92, crf - baseCRF); // Her CRF birimi %8 azalma

    // Codec'in compression ratio'sunu da hesaba kat
    // compressionRatio ne kadar yüksekse, o kadar küçük dosya
    // Örnek: AV1 (1.8) > HEVC (1.5) > VP9 (1.3) > H264 (1.0)
    const codecCompressionFactor = codecInfo.compressionRatio;

    // Bitrate'i CRF ve codec compression'a göre ayarla
    // compressionRatio zaten calculateOptimalBitrate'de kullanıldı,
    // burada sadece CRF faktörünü uygulayalım
    const adjustedBitrate = optimalBitrate * crfFactor;

    const estimatedSize = estimateFileSize(
      adjustedBitrate,
      metadata.duration,
      metadata.audioBitrate || 128000
    );

    const estimatedSavings = metadata.fileSize - estimatedSize;
    const estimatedSavingsPercent =
      (estimatedSavings / metadata.fileSize) * 100;

    // Estimate encoding time (rough calculation)
    const baseTime = metadata.duration * 0.5; // Base: 0.5x realtime
    let timeMultiplier = 1.0;

    if (preset === "slow" || preset === "slower" || preset === "veryslow") {
      timeMultiplier = 2.0;
    } else if (preset === "medium") {
      timeMultiplier = 1.5;
    }

    if (codecInfo.encodingSpeed === "slow") {
      timeMultiplier *= 1.5;
    }

    const estimatedTime = baseTime * timeMultiplier;

    const outputFile =
      metadata.filename.replace(/\.[^/.]+$/, "") +
      (codecInfo.codec === "h264"
        ? ".mp4"
        : codecInfo.codec === "h265"
        ? ".mp4"
        : codecInfo.codec === "vp9"
        ? ".webm"
        : ".webm");

    // Audio codec belirleme - AV1 ve VP9 için libopus, diğerleri için metadata'dan veya aac
    const audioCodecForCodec =
      codecInfo.codec === "av1" || codecInfo.codec === "vp9"
        ? "libopus"
        : metadata.audioCodec || "aac";
    const audioBitrateForCodec = metadata.audioBitrate
      ? Math.round(metadata.audioBitrate / 1000)
      : 128;

    const ffmpegCommand = generateFFmpegCommand(
      metadata.filename,
      {
        codec: codecInfo.codec,
        codecName: codecInfo.name,
        bitrate: optimalBitrate,
        crf:
          codecInfo.codec === "h264" || codecInfo.codec === "h265"
            ? crf
            : undefined,
        quality:
          codecInfo.codec === "vp9" || codecInfo.codec === "av1"
            ? crf
            : undefined,
        preset,
        resolution,
        estimatedSize,
        estimatedSavings,
        estimatedSavingsPercent,
        estimatedTime,
        ffmpegCommand: "",
        explanation: "",
        audioCodec: audioCodecForCodec,
        audioBitrate: audioBitrateForCodec,
      },
      outputFile
    );

    const explanation = generateExplanation(codecInfo, metadata, {
      estimatedSize,
      estimatedSavingsPercent,
      resolution,
    });

    recommendations.push({
      codec: codecInfo.codec,
      codecName: codecInfo.name,
      bitrate: optimalBitrate,
      crf:
        codecInfo.codec === "h264" || codecInfo.codec === "h265"
          ? crf
          : undefined,
      quality:
        codecInfo.codec === "vp9" || codecInfo.codec === "av1"
          ? crf
          : undefined,
      preset,
      resolution,
      estimatedSize,
      estimatedSavings,
      estimatedSavingsPercent,
      estimatedTime,
      ffmpegCommand,
      explanation,
      audioCodec: audioCodecForCodec,
      audioBitrate: audioBitrateForCodec,
    });
  }

  // Sort by estimated savings (best first)
  recommendations.sort(
    (a, b) => b.estimatedSavingsPercent - a.estimatedSavingsPercent
  );

  return recommendations;
}

function generateExplanation(
  codecInfo: CodecInfo,
  metadata: VideoMetadata,
  stats: {
    estimatedSize: number;
    estimatedSavingsPercent: number;
    resolution: { width: number; height: number; scale: string };
  }
): string {
  let explanation = `${codecInfo.name} codec kullanarak `;

  if (stats.estimatedSavingsPercent > 0) {
    explanation += `yaklaşık %${stats.estimatedSavingsPercent.toFixed(
      1
    )} dosya boyutu tasarrufu sağlayabilirsiniz. `;
  } else {
    explanation += `dosya boyutunu optimize edebilirsiniz. `;
  }

  if (codecInfo.codec === "h265" || codecInfo.codec === "av1") {
    explanation += `Modern codec olduğu için daha iyi sıkıştırma oranı sunar. `;
  }

  if (stats.resolution.scale === "downscale") {
    explanation += `Çözünürlük ${stats.resolution.width}x${stats.resolution.height} olarak önerilir. `;
  }

  explanation += `Encoding süresi video süresine göre değişecektir.`;

  return explanation;
}
