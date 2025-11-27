"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n/use-translation";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { VideoPreset, VideoCategory } from "@/lib/presets/video-presets";
import {
  CATEGORY_NAMES,
  QUALITY_NAMES,
  getPresetsByCategory,
} from "@/lib/presets/video-presets";

export interface CompressionPreset {
  id: string;
  name: string;
  description: string;
  codec: "h264" | "h265" | "vp9" | "av1";
  preset: string;
  crf?: number;
  quality?: number;
  targetResolution?: "original" | "1080p" | "720p" | "480p";
}

interface CompressionPresetsProps {
  selectedPreset: VideoPreset | null;
  onPresetChange: (preset: VideoPreset | null) => void;
}

export function CompressionPresets({
  selectedPreset,
  onPresetChange,
}: CompressionPresetsProps) {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<VideoCategory>(
    selectedPreset?.category || "movie"
  );

  const categories: { key: VideoCategory; icon: string; label: string }[] = [
    { key: "movie", icon: "🎬", label: "Film" },
    { key: "anime", icon: "🎨", label: "Anime" },
    { key: "tutorial", icon: "📺", label: "Eğitim" },
    { key: "gaming", icon: "🎮", label: "Oyun" },
    { key: "webcam", icon: "👤", label: "Webcam" },
    { key: "vhs", icon: "📼", label: "Eski" },
    { key: "nature", icon: "🌿", label: "Doğa" },
  ];

  useEffect(() => {
    if (selectedPreset) {
      setSelectedCategory(selectedPreset.category);
    }
  }, [selectedPreset]);

  const handlePresetSelect = (preset: VideoPreset) => {
    onPresetChange(selectedPreset?.id === preset.id ? null : preset);
    setSelectedCategory(preset.category);
  };

  const presets = getPresetsByCategory(selectedCategory);

  return (
    <Card className="p-4 space-y-4">
      {/* Kategori Seçimi - Kompakt Grid */}
      <div className="space-y-2">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Video Türü
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          {categories.map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg text-center transition-all border",
                selectedCategory === key
                  ? "bg-primary text-primary-foreground shadow-md border-primary"
                  : "bg-muted/30 hover:bg-muted/60 text-muted-foreground hover:text-foreground border-transparent hover:border-border"
              )}
              title={CATEGORY_NAMES[key]}
            >
              <span className="text-base">{icon}</span>
              <span className="text-[9px] font-medium leading-tight">
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Kalite Seçimi - Dikey Liste */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Kalite Seviyesi
        </p>
        <div className="space-y-1.5">
          {presets.map((preset, index) => {
            const qualityInfo = QUALITY_NAMES[preset.quality];
            const isSelected = selectedPreset?.id === preset.id;

            return (
              <motion.button
                key={preset.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handlePresetSelect(preset)}
                className={cn(
                  "w-full rounded-lg border p-2 text-left transition-all relative",
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border/50 hover:border-primary/30 hover:bg-muted/30"
                )}
              >
                {/* Seçili İşareti */}
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-primary-foreground" />
                    </div>
                  </div>
                )}

                {/* Başlık */}
                <div className="flex items-center gap-1.5 mb-1">
                  <Badge
                    variant={isSelected ? "default" : "outline"}
                    className="h-4 px-1.5 text-[9px] font-bold"
                  >
                    {qualityInfo.badge}
                  </Badge>
                  <span className="text-xs font-semibold">
                    {qualityInfo.name}
                  </span>
                </div>

                {/* Açıklama */}
                <p className="text-[10px] text-muted-foreground leading-relaxed mb-1.5 pr-6">
                  {preset.description}
                </p>

                {/* Teknik Detaylar */}
                <div className="flex flex-wrap gap-1">
                  <span className="px-1.5 py-0.5 rounded bg-muted text-[8px] font-medium">
                    {preset.codec.toUpperCase()}
                  </span>
                  {preset.crf !== undefined && (
                    <span className="px-1.5 py-0.5 rounded bg-muted text-[8px]">
                      CRF {preset.crf}
                    </span>
                  )}
                  {preset.cq !== undefined && (
                    <span className="px-1.5 py-0.5 rounded bg-muted text-[8px]">
                      CQ {preset.cq}
                    </span>
                  )}
                  <span className="px-1.5 py-0.5 rounded bg-muted text-[8px]">
                    {preset.preset}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Seçili Preset Özeti */}
      {selectedPreset && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-md bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 p-2"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-semibold text-primary">
              Aktif Profil
            </span>
          </div>
          <div className="flex flex-wrap gap-1 text-[9px]">
            <span className="px-1.5 py-0.5 rounded bg-background/60 font-medium">
              {selectedPreset.codec.toUpperCase()}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-background/60">
              {selectedPreset.pixFmt}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-background/60">
              {selectedPreset.audioCodec} {selectedPreset.audioBitrate}k
            </span>
          </div>
        </motion.div>
      )}
    </Card>
  );
}
