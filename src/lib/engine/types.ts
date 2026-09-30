/**
 * Ortak motor tipleri.
 *
 * Uygulama üç farklı motorla çalışabilir:
 * - "webcodecs": Mediabunny + WebCodecs (tarayıcı, GPU hızlandırmalı, büyük dosyalar)
 * - "ffmpeg-wasm": FFmpeg.wasm (tarayıcı, her formatı okur ama yavaş)
 * - "native": Masaüstü uygulamasındaki yerel FFmpeg (en hızlı, sınırsız)
 */

export type EngineId = "webcodecs" | "ffmpeg-wasm" | "native";
export type EnginePreference = "auto" | EngineId;

export type TargetVideoCodec = "h264" | "h265" | "vp9" | "av1";
export type OutputContainer = "mp4" | "webm" | "mkv" | "mov";
export type AudioOnlyFormat = "m4a" | "opus" | "mp3" | "wav";
export type TargetAudioCodec = "aac" | "opus" | "mp3";

export interface ProbeVideoStream {
  /** Normalize edilmiş codec kimliği: h264, h265, vp9, av1, vp8, mpeg4, prores ... */
  codec: string;
  codecLabel: string;
  /** Görüntüleme genişliği (rotasyon uygulanmış) */
  width: number;
  height: number;
  frameRate: number;
  /** Değişken kare hızı tespit edildi mi */
  variableFrameRate?: boolean;
  bitrate?: number;
  pixelFormat?: string;
  profile?: string;
  rotation?: number;
  hdr?: boolean;
  colorPrimaries?: string;
  colorTransfer?: string;
  bitDepth?: number;
}

export interface ProbeAudioStream {
  codec: string;
  codecLabel: string;
  channels: number;
  sampleRate: number;
  bitrate?: number;
  language?: string;
}

export interface ProbeResult {
  container: string;
  duration: number;
  fileSize: number;
  /** Toplam bitrate (bps) */
  bitrate: number;
  video?: ProbeVideoStream;
  audio?: ProbeAudioStream;
  videoTrackCount: number;
  audioTrackCount: number;
  subtitleTrackCount?: number;
  /** Hangi yöntemle okundu */
  source: EngineId | "html5";
}

export type RateControl =
  | {
      mode: "crf";
      crf: number;
      /** Tepe bitrate sınırı (FFmpeg -maxrate) */
      maxBitrate?: number;
      /** Kodlayıcı sabit kaliteyi desteklemezse kullanılacak bitrate (WebCodecs) */
      fallbackBitrate?: number;
    }
  | { mode: "bitrate"; bitrate: number }
  | { mode: "target-size"; bytes: number };

export interface AudioOptions {
  mode: "auto" | "copy" | "encode" | "none";
  codec?: TargetAudioCodec;
  bitrate?: number;
  channels?: number;
  sampleRate?: number;
}

export interface EncodeOptions {
  codec: TargetVideoCodec;
  container?: OutputContainer;
  rate: RateControl;
  /** x264/x265 hız ön ayarı (ultrafast..veryslow) */
  preset?: string;
  /** Hedef çözünürlük. Sadece biri verilirse en-boy oranı korunur. */
  width?: number;
  height?: number;
  frameRate?: number;
  trim?: { start?: number; end?: number };
  audio: AudioOptions;
  /** Sadece ses çıkar */
  audioOnly?: AudioOnlyFormat;
  /** Donanım hızlandırma tercihi */
  hardware?: "auto" | "prefer" | "off";
  /** Kare aralığı (saniye) */
  keyframeInterval?: number;

  // --- Sadece FFmpeg (wasm/native) tarafından desteklenen gelişmiş seçenekler ---
  pixelFormat?: string;
  profile?: string;
  level?: string;
  tune?: string;
  bframes?: number;
  refFrames?: number;
  threads?: number;
  deinterlace?: boolean;
  denoise?: boolean;
  crop?: { width: number; height: number; x: number; y: number };
  rotate?: 0 | 90 | 180 | 270;
  videoFilter?: string;
  colorSpace?: string;
  colorRange?: string;
  twoPass?: boolean;
  /** MP4 çıktısını web'de hızlı başlatmak için moov atomunu başa al */
  fastStart?: boolean;
  /** Metadata'yı (GPS, cihaz bilgisi vb.) temizle */
  stripMetadata?: boolean;
}

export interface EncodeProgress {
  /** 0..1 */
  progress: number;
  /** İşlenen giriş süresi (sn) */
  processedTime?: number;
  /** Geçen süre (sn) */
  elapsed: number;
  /** Tahmini kalan süre (sn) */
  eta?: number;
  /** Gerçek zamana göre hız, ör. 2.4 = 2.4x */
  speed?: number;
  stage: "preparing" | "encoding" | "finalizing" | "done";
  message?: string;
}

export interface EncodeResult {
  engine: EngineId;
  /** Tarayıcı motorlarında sonuç blob'u */
  blob?: Blob;
  /** Masaüstünde diske yazılan dosyanın yolu */
  outputPath?: string;
  size: number;
  mimeType: string;
  fileName: string;
  elapsed: number;
  /** Kullanılan kodlayıcının açıklaması (ör. "h264_nvenc", "WebCodecs avc (GPU)") */
  encoderLabel?: string;
}

export interface EncodeTask {
  promise: Promise<EncodeResult>;
  cancel: () => void;
}

export class EncodeCanceledError extends Error {
  constructor() {
    super("Dönüştürme iptal edildi");
    this.name = "EncodeCanceledError";
  }
}

export interface QualityMetrics {
  /** dB, yüksek = daha iyi (40+ neredeyse kayıpsız) */
  psnr: number;
  /** 0..1, yüksek = daha iyi (0.98+ neredeyse farksız) */
  ssim: number;
  /** Ölçülen kare sayısı */
  samples: number;
  method: "sampled-frames" | "ffmpeg-full";
}
