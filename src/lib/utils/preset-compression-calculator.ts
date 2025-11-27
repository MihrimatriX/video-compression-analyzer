import type {
  VideoMetadata,
  CompressionRecommendation,
} from "@/lib/types/video";
import type { VideoPreset } from "@/lib/presets/video-presets";
import { presetToRecommendation } from "./ffmpeg-command-generator";
import { calculateOptimalCompression } from "./compression-calculator";

/**
 * Preset kullanarak compression önerileri oluştur
 * Eğer preset varsa, onu kullan, yoksa normal hesaplama yap
 */
export function calculateCompressionWithPreset(
  metadata: VideoMetadata,
  preset: VideoPreset | null
): CompressionRecommendation[] {
  if (preset) {
    // Preset'ten öneri oluştur
    const presetRecommendation = presetToRecommendation(preset, metadata);

    // Aynı kategorideki diğer kalite seviyelerini de ekle
    const allRecommendations: CompressionRecommendation[] = [
      presetRecommendation,
    ];

    // Normal hesaplamadan da öneriler al (karşılaştırma için)
    const normalRecommendations = calculateOptimalCompression(metadata);

    // Preset önerisini en başa koy, diğerlerini ekle
    return [presetRecommendation, ...normalRecommendations];
  }

  // Preset yoksa normal hesaplama
  return calculateOptimalCompression(metadata);
}
