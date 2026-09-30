import { create } from "zustand";
import {
  EncodeCanceledError,
  encodeVideo,
  type EncodeOptions,
  type EncodeResult,
  type EncodeTask,
  type EngineId,
  type TargetVideoCodec,
} from "@/lib/engine";
import { useSettingsStore } from "./settings-store";
import { recommendationToOptions, shortSideScale } from "@/lib/utils/recommendation-options";
import type { VideoFile } from "@/lib/types/video";

export type BatchItemStatus = "queued" | "running" | "done" | "error" | "canceled" | "skipped";

export interface BatchItem {
  videoId: string;
  name: string;
  originalSize: number;
  status: BatchItemStatus;
  progress: number;
  engine?: EngineId;
  result?: EncodeResult;
  error?: string;
}

export interface BatchConfig {
  mode: "recommended" | "target-size" | "crf";
  /** "auto" = önerideki codec */
  codec: "auto" | TargetVideoCodec;
  targetMb: number;
  crf: number;
  maxHeight?: number;
}

interface BatchStore {
  items: BatchItem[];
  running: boolean;
  startedAt: number | null;
  finishedAt: number | null;
  start: (videos: VideoFile[], config: BatchConfig) => Promise<void>;
  cancel: () => void;
  clear: () => void;
}

let currentTask: EncodeTask | null = null;
let cancelRequested = false;

function buildOptions(video: VideoFile, config: BatchConfig): EncodeOptions {
  const analysis = video.analysis!;
  const base = recommendationToOptions(analysis.bestRecommendation, analysis.metadata);
  const codec = config.codec === "auto" ? base.codec : config.codec;
  const options: EncodeOptions = { ...base, codec };
  if (config.codec !== "auto" && config.codec !== base.codec && base.rate.mode === "crf") {
    // Codec değiştiyse o codec'e uygun varsayılan CRF kullan
    options.rate = { mode: "crf", crf: { h264: 23, h265: 28, vp9: 33, av1: 34 }[codec] };
  }
  if (config.mode === "target-size") {
    options.rate = { mode: "target-size", bytes: config.targetMb * 1024 * 1024 };
  } else if (config.mode === "crf") {
    options.rate = { mode: "crf", crf: config.crf };
  }
  if (config.maxHeight) {
    const scale = shortSideScale(analysis.metadata, config.maxHeight);
    if (scale.width || scale.height) {
      options.width = scale.width;
      options.height = scale.height;
    }
  }
  if (options.audio.mode === "encode" && (codec === "vp9" || codec === "av1")) {
    options.audio = { ...options.audio, codec: "opus" };
  }
  return options;
}

export const useBatchStore = create<BatchStore>((set, get) => {
  const update = (videoId: string, patch: Partial<BatchItem>) =>
    set((state) => ({
      items: state.items.map((item) => (item.videoId === videoId ? { ...item, ...patch } : item)),
    }));

  return {
    items: [],
    running: false,
    startedAt: null,
    finishedAt: null,

    start: async (videos, config) => {
      if (get().running) return;
      const eligible = videos.filter((v) => v.analysis);
      cancelRequested = false;
      set({
        running: true,
        startedAt: Date.now(),
        finishedAt: null,
        items: eligible.map((v) => ({
          videoId: v.id,
          name: v.file.name,
          originalSize: v.file.size,
          status: "queued",
          progress: 0,
        })),
      });

      const settings = useSettingsStore.getState();
      // Sıralı işleme: her kodlayıcı zaten tüm çekirdekleri / GPU'yu kullanır
      for (const video of eligible) {
        if (cancelRequested) {
          update(video.id, { status: "canceled" });
          continue;
        }
        update(video.id, { status: "running", progress: 0 });
        try {
          currentTask = encodeVideo({
            file: video.file,
            options: { ...buildOptions(video, config), hardware: settings.hardware },
            probe: video.probe,
            engine: settings.engine,
            outputDir: settings.outputDir || undefined,
            onProgress: (p) => update(video.id, { progress: p.progress }),
            onEngineSelected: (c) => update(video.id, { engine: c.engine }),
            allowCodecFallback: config.codec === "auto",
          });
          const result = await currentTask.promise;
          const larger = result.size >= video.file.size;
          update(video.id, {
            status: larger && settings.skipLargerOutputs ? "skipped" : "done",
            progress: 1,
            result,
          });
        } catch (error) {
          if (error instanceof EncodeCanceledError || cancelRequested) {
            update(video.id, { status: "canceled" });
          } else {
            update(video.id, {
              status: "error",
              error: error instanceof Error ? error.message : String(error),
            });
          }
        } finally {
          currentTask = null;
        }
      }
      set({ running: false, finishedAt: Date.now() });
    },

    cancel: () => {
      cancelRequested = true;
      currentTask?.cancel();
    },

    clear: () => {
      if (get().running) return;
      set({ items: [], startedAt: null, finishedAt: null });
    },
  };
});
