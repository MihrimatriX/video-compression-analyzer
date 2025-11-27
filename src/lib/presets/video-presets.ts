/**
 * Video türü bazlı sıkıştırma preset'leri
 * Her tür için Balanced (B), Quality Max (Q), Fast (F) seçenekleri
 */

export type VideoCategory =
  | "movie"
  | "anime"
  | "tutorial"
  | "gaming"
  | "webcam"
  | "vhs"
  | "nature";

export type QualityLevel = "balanced" | "quality" | "fast";

export type CodecType =
  | "av1"
  | "h265"
  | "h264"
  | "vp9"
  | "hevc_nvenc"
  | "hevc_amf";

export type PixelFormat = "yuv420p" | "yuv420p10le" | "p010le";

export type AudioCodec = "libopus" | "aac" | "ac3";

export interface VideoPreset {
  id: string;
  category: VideoCategory;
  quality: QualityLevel;
  name: string;
  description: string;
  codec: CodecType;
  crf?: number;
  cq?: number; // For NVENC/AMF
  preset?: number | string; // AV1 uses numbers, others use strings
  pixFmt: PixelFormat;
  audioCodec: AudioCodec;
  audioBitrate: number;
  videoFilters?: string; // For denoise etc.
}

export const VIDEO_PRESETS: VideoPreset[] = [
  // 🎬 1) Filmler / Diziler
  {
    id: "movie-balanced",
    category: "movie",
    quality: "balanced",
    name: "Film - Dengeli",
    description: "Live action, karanlık sahneler, yüksek detay",
    codec: "av1",
    crf: 26,
    preset: 5,
    pixFmt: "yuv420p10le",
    audioCodec: "libopus",
    audioBitrate: 128,
  },
  {
    id: "movie-quality",
    category: "movie",
    quality: "quality",
    name: "Film - Maksimum Kalite",
    description: "Sinema arşiv kalitesine yakın",
    codec: "av1",
    crf: 22,
    preset: 3,
    pixFmt: "yuv420p10le",
    audioCodec: "libopus",
    audioBitrate: 128,
  },
  {
    id: "movie-fast",
    category: "movie",
    quality: "fast",
    name: "Film - Hızlı",
    description: "AV1 çok yavaşsa HEVC tercih edin",
    codec: "h265",
    crf: 24,
    preset: "medium",
    pixFmt: "yuv420p10le",
    audioCodec: "libopus",
    audioBitrate: 128,
  },

  // 🎨 2) Anime / Cartoon
  {
    id: "anime-balanced",
    category: "anime",
    quality: "balanced",
    name: "Anime - Dengeli",
    description: "Flat colors, lineart için AV1 10-bit altın standart",
    codec: "av1",
    crf: 28,
    preset: 5,
    pixFmt: "yuv420p10le",
    audioCodec: "libopus",
    audioBitrate: 128,
  },
  {
    id: "anime-quality",
    category: "anime",
    quality: "quality",
    name: "Anime - Maksimum Kalite",
    description: "En yüksek kalite için AV1",
    codec: "av1",
    crf: 24,
    preset: 3,
    pixFmt: "yuv420p10le",
    audioCodec: "libopus",
    audioBitrate: 128,
  },
  {
    id: "anime-fast",
    category: "anime",
    quality: "fast",
    name: "Anime - Hızlı",
    description: "HEVC 10-bit, H264 kullanmayın (banding yaratır)",
    codec: "h265",
    crf: 26,
    preset: "medium",
    pixFmt: "yuv420p10le",
    audioCodec: "libopus",
    audioBitrate: 128,
  },

  // 🖥️ 3) Tutorial / Ekran Kaydı
  {
    id: "tutorial-balanced",
    category: "tutorial",
    quality: "balanced",
    name: "Tutorial - Dengeli",
    description: "Yüksek keskinlik içerir, AV1 en iyi",
    codec: "av1",
    crf: 30,
    preset: 5,
    pixFmt: "yuv420p",
    audioCodec: "libopus",
    audioBitrate: 96,
  },
  {
    id: "tutorial-quality",
    category: "tutorial",
    quality: "quality",
    name: "Tutorial - Maksimum Kalite",
    description: "Maksimum kalite için AV1",
    codec: "av1",
    crf: 26,
    preset: 3,
    pixFmt: "yuv420p",
    audioCodec: "libopus",
    audioBitrate: 96,
  },
  {
    id: "tutorial-fast",
    category: "tutorial",
    quality: "fast",
    name: "Tutorial - Hızlı",
    description: "HEVC ile hızlı encoding",
    codec: "h265",
    crf: 28,
    preset: "fast",
    pixFmt: "yuv420p",
    audioCodec: "libopus",
    audioBitrate: 96,
  },

  // 🎮 4) Oyun Videoları
  {
    id: "gaming-balanced",
    category: "gaming",
    quality: "balanced",
    name: "Oyun - Dengeli",
    description: "NVENC/AMF ile hızlı encoding",
    codec: "hevc_nvenc",
    cq: 23,
    preset: "p5",
    pixFmt: "p010le",
    audioCodec: "libopus",
    audioBitrate: 128,
  },
  {
    id: "gaming-quality",
    category: "gaming",
    quality: "quality",
    name: "Oyun - Maksimum Kalite",
    description: "AV1 ama çok yavaş olabilir",
    codec: "av1",
    crf: 26,
    preset: 4,
    pixFmt: "yuv420p10le",
    audioCodec: "libopus",
    audioBitrate: 128,
  },
  {
    id: "gaming-fast",
    category: "gaming",
    quality: "fast",
    name: "Oyun - Hızlı",
    description: "HEVC NVENC ile çok hızlı",
    codec: "hevc_nvenc",
    cq: 25,
    preset: "p4",
    pixFmt: "p010le",
    audioCodec: "libopus",
    audioBitrate: 128,
  },

  // 👤 5) Webcam / Talking Head
  {
    id: "webcam-balanced",
    category: "webcam",
    quality: "balanced",
    name: "Webcam - Dengeli",
    description: "Kolay sıkıştırılabilir içerik",
    codec: "av1",
    crf: 28,
    preset: 5,
    pixFmt: "yuv420p",
    audioCodec: "libopus",
    audioBitrate: 96,
  },
  {
    id: "webcam-quality",
    category: "webcam",
    quality: "quality",
    name: "Webcam - Maksimum Kalite",
    description: "Maksimum kalite için AV1 10-bit",
    codec: "av1",
    crf: 24,
    preset: 3,
    pixFmt: "yuv420p10le",
    audioCodec: "libopus",
    audioBitrate: 96,
  },
  {
    id: "webcam-fast",
    category: "webcam",
    quality: "fast",
    name: "Webcam - Hızlı",
    description: "HEVC ile hızlı encoding",
    codec: "h265",
    crf: 26,
    preset: "fast",
    pixFmt: "yuv420p",
    audioCodec: "libopus",
    audioBitrate: 96,
  },

  // 🌫️ 6) Eski Video / VHS
  {
    id: "vhs-balanced",
    category: "vhs",
    quality: "balanced",
    name: "VHS - Dengeli",
    description: "Gürültülü içerik için HEVC",
    codec: "h265",
    crf: 27,
    preset: "medium",
    pixFmt: "yuv420p",
    audioCodec: "aac",
    audioBitrate: 128,
  },
  {
    id: "vhs-quality",
    category: "vhs",
    quality: "quality",
    name: "VHS - Maksimum Kalite",
    description: "Denoise + AV1 ile maksimum kalite",
    codec: "av1",
    crf: 26,
    preset: 4,
    pixFmt: "yuv420p10le",
    audioCodec: "aac",
    audioBitrate: 128,
    videoFilters: "hqdn3d=1.5:1.5:6:6",
  },
  {
    id: "vhs-fast",
    category: "vhs",
    quality: "fast",
    name: "VHS - Hızlı",
    description: "HEVC ile hızlı encoding",
    codec: "h265",
    crf: 30,
    preset: "fast",
    pixFmt: "yuv420p",
    audioCodec: "aac",
    audioBitrate: 128,
  },

  // 🌍 7) Doğa / 4K-8K
  {
    id: "nature-balanced",
    category: "nature",
    quality: "balanced",
    name: "Doğa - Dengeli",
    description: "Çok detaylı 4K/8K görüntüler için",
    codec: "av1",
    crf: 28,
    preset: 5,
    pixFmt: "yuv420p10le",
    audioCodec: "libopus",
    audioBitrate: 128,
  },
  {
    id: "nature-quality",
    category: "nature",
    quality: "quality",
    name: "Doğa - Maksimum Kalite",
    description: "Maksimum kalite için AV1",
    codec: "av1",
    crf: 24,
    preset: 3,
    pixFmt: "yuv420p10le",
    audioCodec: "libopus",
    audioBitrate: 128,
  },
  {
    id: "nature-fast",
    category: "nature",
    quality: "fast",
    name: "Doğa - Hızlı",
    description: "HEVC ile hızlı encoding",
    codec: "h265",
    crf: 26,
    preset: "medium",
    pixFmt: "yuv420p10le",
    audioCodec: "libopus",
    audioBitrate: 128,
  },
];

export const CATEGORY_NAMES: Record<VideoCategory, string> = {
  movie: "🎬 Film / Dizi",
  anime: "🎨 Anime / Çizgi Film",
  tutorial: "🖥️ Tutorial / Ekran Kaydı",
  gaming: "🎮 Oyun Videoları",
  webcam: "👤 Webcam / Talking Head",
  vhs: "🌫️ Eski Video / VHS",
  nature: "🌍 Doğa / 4K-8K",
};

export const QUALITY_NAMES: Record<
  QualityLevel,
  { name: string; badge: string }
> = {
  balanced: { name: "Dengeli", badge: "✔ B" },
  quality: { name: "Maksimum Kalite", badge: "✔ Q" },
  fast: { name: "Hızlı", badge: "✔ F" },
};

/**
 * Kategoriye göre preset'leri filtrele
 */
export function getPresetsByCategory(category: VideoCategory): VideoPreset[] {
  return VIDEO_PRESETS.filter((p) => p.category === category);
}

/**
 * Kategori ve kalite seviyesine göre preset bul
 */
export function getPreset(
  category: VideoCategory,
  quality: QualityLevel
): VideoPreset | undefined {
  return VIDEO_PRESETS.find(
    (p) => p.category === category && p.quality === quality
  );
}
