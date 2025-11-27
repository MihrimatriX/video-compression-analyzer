"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VideoResultsGrid } from "@/components/video-results/VideoResultsGrid";
import { CompressionPresets } from "@/components/video-uploader/CompressionPresets";
import { ParameterImpactAnalysis } from "./ParameterImpactAnalysis";
import { useVideoStore } from "@/lib/store/video-store";
import { useTranslation } from "@/lib/i18n/use-translation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft,
  Upload,
  HardDrive,
  Clock,
  TrendingDown,
  FileVideo,
  Zap,
  ChevronDown,
  ChevronUp,
  Settings2,
} from "lucide-react";
import { FileUploader } from "@/components/video-uploader/FileUploader";
import type { VideoFile } from "@/lib/types/video";
import { formatFileSize } from "@/lib/utils/video-detector";

export function VideoAnalysisPage() {
  const { videos, selectedPreset, setSelectedPreset, clearVideos, addVideos } =
    useVideoStore();
  const { t } = useTranslation();
  const [showUploader, setShowUploader] = useState(false);
  const [showPresets, setShowPresets] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelected = (files: VideoFile[]) => {
    try {
      addVideos(files);
      setShowUploader(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error.videoAdd"));
    }
  };

  const handleBackToUpload = () => {
    try {
      clearVideos();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error.clear"));
    }
  };

  // İstatistikleri hesapla
  const stats = useMemo(() => {
    const completedVideos = videos.filter((v) => v.analysis);
    const totalSize = videos.reduce((acc, v) => acc + v.file.size, 0);
    const totalDuration = completedVideos.reduce(
      (acc, v) => acc + (v.analysis?.metadata.duration || 0),
      0
    );
    const totalEstimatedSavings = completedVideos.reduce(
      (acc, v) => acc + (v.analysis?.bestRecommendation?.estimatedSavings || 0),
      0
    );
    const avgSavingsPercent =
      completedVideos.length > 0
        ? completedVideos.reduce(
            (acc, v) =>
              acc + (v.analysis?.bestRecommendation?.estimatedSavingsPercent || 0),
            0
          ) / completedVideos.length
        : 0;

    return {
      total: videos.length,
      completed: completedVideos.length,
      totalSize,
      totalDuration,
      totalEstimatedSavings,
      avgSavingsPercent,
    };
  }, [videos]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) return `${hours}sa ${mins}dk`;
    if (mins > 0) return `${mins}dk ${secs}sn`;
    return `${secs}sn`;
  };

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive font-medium">
            {t("common.error")}: {error}
          </p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-xs text-destructive underline hover:text-destructive/80 transition-colors"
          >
            {t("common.close")}
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 container mx-auto px-4 py-4 max-w-7xl"
    >
      {/* Kompakt Header + Stats */}
      <div className="space-y-3 pb-3 border-b border-border/50">
        {/* Üst Satır - Başlık ve Butonlar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">
              Video Analiz & Sıkıştırma
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stats.total} video • {stats.completed} analiz tamamlandı
            </p>
          </div>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUploader(!showUploader)}
              className="h-8 px-2 sm:px-3 text-xs gap-1"
            >
              <Upload className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Video</span> Ekle
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToUpload}
              className="h-8 px-2 sm:px-3 text-xs gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Yeni</span> Analiz
            </Button>
          </div>
        </div>

        {/* Alt Satır - İstatistik Kartları */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatCard
            icon={<FileVideo className="h-3.5 w-3.5" />}
            label="Toplam Boyut"
            value={formatFileSize(stats.totalSize)}
            color="blue"
          />
          <StatCard
            icon={<Clock className="h-3.5 w-3.5" />}
            label="Toplam Süre"
            value={formatDuration(stats.totalDuration)}
            color="purple"
          />
          <StatCard
            icon={<TrendingDown className="h-3.5 w-3.5" />}
            label="Tahmini Tasarruf"
            value={formatFileSize(stats.totalEstimatedSavings)}
            highlight={stats.totalEstimatedSavings > 0}
            color="green"
          />
          <StatCard
            icon={<Zap className="h-3.5 w-3.5" />}
            label="Ort. Tasarruf"
            value={`%${stats.avgSavingsPercent.toFixed(1)}`}
            highlight={stats.avgSavingsPercent > 20}
            color="orange"
          />
        </div>
      </div>

      {/* Uploader */}
      <AnimatePresence>
        {showUploader && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <Card className="p-4 bg-muted/30 border-dashed">
              <FileUploader onFilesSelected={handleFilesSelected} />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ana İçerik - Responsive Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
        {/* Sol Kolon - Compression Presets (Daraltılabilir) */}
        <div className="md:col-span-2 xl:col-span-3 order-1 xl:order-1">
          <div className="xl:sticky xl:top-20">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="flex items-center justify-between w-full mb-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
            >
              <span className="flex items-center gap-1.5">
                <Settings2 className="h-3.5 w-3.5" />
                Sıkıştırma Ayarları
                {selectedPreset && (
                  <span className="ml-1 px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px]">
                    {selectedPreset.codec.toUpperCase()}
                  </span>
                )}
              </span>
              {showPresets ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
            <AnimatePresence>
              {showPresets && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <CompressionPresets
                    selectedPreset={selectedPreset}
                    onPresetChange={setSelectedPreset}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Orta Kolon - Video Listesi */}
        <div className="md:col-span-2 xl:col-span-6 order-3 xl:order-2">
          <VideoResultsGrid />
        </div>

        {/* Sağ Kolon - Parametre Analizi */}
        <div className="md:col-span-2 xl:col-span-3 order-2 xl:order-3">
          <div className="xl:sticky xl:top-20">
            <ParameterImpactAnalysis />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// İstatistik Kartı Komponenti
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
  color?: "blue" | "purple" | "green" | "orange";
}

function StatCard({
  icon,
  label,
  value,
  highlight = false,
  color = "blue",
}: StatCardProps) {
  const colorClasses = {
    blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    purple: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    green: "bg-green-500/10 text-green-500 border-green-500/20",
    orange: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  };

  return (
    <div
      className={`flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg border transition-all ${
        highlight
          ? colorClasses[color]
          : "bg-muted/50 border-border/50 text-muted-foreground"
      }`}
    >
      <div className={`shrink-0 ${highlight ? "" : "opacity-60"}`}>{icon}</div>
      <div className="flex flex-col min-w-0">
        <span className="text-[9px] sm:text-[10px] opacity-70 truncate">{label}</span>
        <span
          className={`text-[11px] sm:text-xs font-semibold truncate ${highlight ? "" : "text-foreground"}`}
        >
          {value}
        </span>
      </div>
    </div>
  );
}
