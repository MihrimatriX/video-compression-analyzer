"use client";

import { useEffect } from "react";
import { analyzeVideo } from "@/lib/ffmpeg/video-analyzer";
import { calculateCompressionWithPreset } from "@/lib/utils/preset-compression-calculator";
import { useVideoStore } from "@/lib/store/video-store";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { VideoFile, VideoAnalysis } from "@/lib/types/video";

interface VideoAnalyzerProps {
  video: VideoFile;
}

export function VideoAnalyzer({ video }: VideoAnalyzerProps) {
  const { updateVideo, setVideoAnalysis, selectedPreset } = useVideoStore();
  const { t } = useTranslation();

  useEffect(() => {
    if (video.status !== "pending" || video.analysis) {
      return;
    }

    const processVideo = async () => {
      try {
        updateVideo(video.id, { status: "analyzing", progress: 0 });

        // Extract metadata
        updateVideo(video.id, { progress: 20 });
        const metadata = await analyzeVideo(video.file);

        // Calculate optimal compression (preset varsa kullan)
        updateVideo(video.id, { progress: 60 });
        const recommendations = calculateCompressionWithPreset(
          metadata,
          selectedPreset
        );

        // Create analysis
        const analysis: VideoAnalysis = {
          metadata,
          recommendations,
          bestRecommendation: recommendations[0], // First one is best
        };

        updateVideo(video.id, { progress: 100 });
        setVideoAnalysis(video.id, analysis);
      } catch (error) {
        console.error("Video analiz hatası:", error);
        updateVideo(video.id, {
          status: "error",
          error: error instanceof Error ? error.message : t("error.unknown"),
        });
      }
    };

    processVideo();
  }, [
    video.id,
    video.status,
    video.analysis,
    updateVideo,
    setVideoAnalysis,
    selectedPreset,
  ]);

  return null; // This component handles side effects only
}
