import { create } from "zustand";
import type { VideoFile, VideoAnalysis } from "@/lib/types/video";
import type { VideoPreset } from "@/lib/presets/video-presets";

interface VideoStore {
  videos: VideoFile[];
  selectedPreset: VideoPreset | null;
  addVideos: (videos: VideoFile[]) => void;
  updateVideo: (id: string, updates: Partial<VideoFile>) => void;
  removeVideo: (id: string) => void;
  clearVideos: () => void;
  setVideoAnalysis: (id: string, analysis: VideoAnalysis) => void;
  setSelectedPreset: (preset: VideoPreset | null) => void;
}

export const useVideoStore = create<VideoStore>((set) => ({
  videos: [],
  selectedPreset: null,

  addVideos: (newVideos) =>
    set((state) => ({
      videos: [...state.videos, ...newVideos],
    })),

  updateVideo: (id, updates) =>
    set((state) => ({
      videos: state.videos.map((video) =>
        video.id === id ? { ...video, ...updates } : video
      ),
    })),

  removeVideo: (id) =>
    set((state) => ({
      videos: state.videos.filter((video) => video.id !== id),
    })),

  clearVideos: () => set({ videos: [], selectedPreset: null }),

  setVideoAnalysis: (id, analysis) =>
    set((state) => ({
      videos: state.videos.map((video) =>
        video.id === id
          ? { ...video, analysis, status: "completed" as const }
          : video
      ),
    })),

  setSelectedPreset: (preset) => set({ selectedPreset: preset }),
}));
