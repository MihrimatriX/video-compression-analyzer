import { createThumbnail, probeFile, type ProbeResult } from "@/lib/engine";
import type { VideoMetadata } from "@/lib/types/video";

/** Motor katmanının ProbeResult'ını uygulamanın VideoMetadata tipine çevirir. */
export function probeToMetadata(file: File, probe: ProbeResult, thumbnail = ""): VideoMetadata {
  const v = probe.video;
  const a = probe.audio;
  return {
    filename: file.name,
    fileSize: file.size,
    duration: probe.duration,
    codec: v?.codec ?? "unknown",
    codecName: v?.codecLabel ?? "—",
    bitrate: probe.bitrate,
    videoBitrate: v?.bitrate,
    width: v?.width ?? 0,
    height: v?.height ?? 0,
    framerate: v?.frameRate ?? 0,
    pixelFormat: v?.pixelFormat ?? "yuv420p",
    audioCodec: a?.codecLabel,
    audioBitrate: a?.bitrate,
    audioChannels: a?.channels,
    audioSampleRate: a?.sampleRate,
    thumbnail,
    container: probe.container,
    variableFrameRate: v?.variableFrameRate,
    hdr: v?.hdr,
    bitDepth: v?.bitDepth,
    rotation: v?.rotation,
    audioTrackCount: probe.audioTrackCount,
    subtitleTrackCount: probe.subtitleTrackCount,
    analysisSource: probe.source,
  };
}

// Aynı anda çok sayıda dosya eklendiğinde tarayıcıyı boğmamak için eşzamanlılık sınırı
const MAX_CONCURRENT = 3;
let active = 0;
const waiting: (() => void)[] = [];

async function acquire() {
  if (active < MAX_CONCURRENT) {
    active++;
    return;
  }
  await new Promise<void>((resolve) => waiting.push(resolve));
  active++;
}

function release() {
  active--;
  waiting.shift()?.();
}

/**
 * Videoyu analiz eder: gerçek codec, çözünürlük, FPS, bitrate ve ses bilgisi.
 * Masaüstünde yerel ffprobe, tarayıcıda Mediabunny veya FFmpeg.wasm kullanılır.
 */
export async function analyzeVideo(
  file: File,
): Promise<{ metadata: VideoMetadata; probe: ProbeResult }> {
  await acquire();
  try {
    const probe = await probeFile(file);
    if (!probe.video) {
      throw new Error("Dosyada video akışı bulunamadı");
    }
    const thumbnail = await createThumbnail(file, probe.duration).catch(() => "");
    return { metadata: probeToMetadata(file, probe, thumbnail), probe };
  } finally {
    release();
  }
}
