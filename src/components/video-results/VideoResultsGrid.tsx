"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { VideoCard } from "./VideoCard";
import { VideoAnalyzer } from "@/components/video-analyzer/VideoAnalyzer";
import { VideoComparison } from "@/components/video-comparison/VideoComparison";
import { useVideoStore } from "@/lib/store/video-store";
import { useTranslation } from "@/lib/i18n/use-translation";
import { X, Trash2, FileCode, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export function VideoResultsGrid() {
  const { videos, removeVideo, clearVideos } = useVideoStore();
  const { t } = useTranslation();
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [comparisonVideos, setComparisonVideos] = useState<{
    video1: string | null;
    video2: string | null;
  }>({ video1: null, video2: null });

  const completedVideos = useMemo(
    () => videos.filter((v) => v.analysis),
    [videos]
  );

  const allSelected = useMemo(
    () =>
      completedVideos.length > 0 &&
      completedVideos.every((v) => selectedVideos.has(v.id)),
    [completedVideos, selectedVideos]
  );

  const someSelected = useMemo(
    () => completedVideos.some((v) => selectedVideos.has(v.id)) && !allSelected,
    [completedVideos, selectedVideos, allSelected]
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedVideos(new Set(completedVideos.map((v) => v.id)));
    } else {
      setSelectedVideos(new Set());
    }
  };

  const handleSelectVideo = (videoId: string, selected: boolean) => {
    const newSelected = new Set(selectedVideos);
    if (selected) {
      newSelected.add(videoId);
    } else {
      newSelected.delete(videoId);
    }
    setSelectedVideos(newSelected);
  };

  const handleDeleteSelected = () => {
    selectedVideos.forEach((id) => removeVideo(id));
    setSelectedVideos(new Set());
  };

  const handleStartComparison = () => {
    const selectedArray = Array.from(selectedVideos);
    if (selectedArray.length >= 2) {
      setComparisonVideos({
        video1: selectedArray[0],
        video2: selectedArray[1],
      });
    }
  };

  const handleCloseComparison = () => {
    setComparisonVideos({ video1: null, video2: null });
  };

  const comparisonVideo1 = comparisonVideos.video1
    ? videos.find((v) => v.id === comparisonVideos.video1)
    : null;
  const comparisonVideo2 = comparisonVideos.video2
    ? videos.find((v) => v.id === comparisonVideos.video2)
    : null;

  const handleGenerateBatchScript = () => {
    const selectedVideoData = videos
      .filter((v) => selectedVideos.has(v.id) && v.analysis)
      .map((v) => ({
        id: v.id,
        filename: v.file.name,
        recommendation: v.analysis!.bestRecommendation,
      }));

    if (selectedVideoData.length === 0) return;

    // Windows batch script
    const batchScript = `@echo off
REM Toplu Video Dönüştürme Script'i
REM Oluşturulma: ${new Date().toLocaleString("tr-TR")}
REM Toplam Video: ${selectedVideoData.length}

setlocal enabledelayedexpansion

echo ========================================
echo Toplu Video Dönüştürme Başlatılıyor...
echo ========================================
echo.

${selectedVideoData
  .map((video, index) => {
    const inputFile = video.filename;
    const outputFile =
      video.filename.replace(/\.[^/.]+$/, "") +
      (video.recommendation.codec === "h264" ||
      video.recommendation.codec === "h265"
        ? ".mp4"
        : ".webm");

    return `echo [${index + 1}/${
      selectedVideoData.length
    }] İşleniyor: ${inputFile}
${video.recommendation.ffmpegCommand
  .replace(`"${inputFile}"`, `"!INPUT_DIR!\\${inputFile}"`)
  .replace(`"${outputFile}"`, `"!OUTPUT_DIR!\\${outputFile}"`)}
if !errorlevel! neq 0 (
    echo HATA: ${inputFile} dönüştürülemedi!
    pause
    exit /b 1
)
echo Tamamlandı: ${outputFile}
echo.`;
  })
  .join("\n\n")}

echo ========================================
echo Tüm videolar başarıyla dönüştürüldü!
echo ========================================
pause
`;

    // Linux/Mac bash script
    const bashScript = `#!/bin/bash
# Toplu Video Dönüştürme Script'i
# Oluşturulma: ${new Date().toLocaleString("tr-TR")}
# Toplam Video: ${selectedVideoData.length}

set -e

INPUT_DIR="\${INPUT_DIR:-./input}"
OUTPUT_DIR="\${OUTPUT_DIR:-./output}"

mkdir -p "$OUTPUT_DIR"

echo "========================================"
echo "Toplu Video Dönüştürme Başlatılıyor..."
echo "========================================"
echo

${selectedVideoData
  .map((video, index) => {
    const inputFile = video.filename;
    const outputFile =
      video.filename.replace(/\.[^/.]+$/, "") +
      (video.recommendation.codec === "h264" ||
      video.recommendation.codec === "h265"
        ? ".mp4"
        : ".webm");

    return `echo "[${index + 1}/${
      selectedVideoData.length
    }] İşleniyor: ${inputFile}"
${video.recommendation.ffmpegCommand
  .replace(`"${inputFile}"`, `"$INPUT_DIR/${inputFile}"`)
  .replace(`"${outputFile}"`, `"$OUTPUT_DIR/${outputFile}"`)}
echo "Tamamlandı: ${outputFile}"
echo`;
  })
  .join("\n\n")}

echo "========================================"
echo "Tüm videolar başarıyla dönüştürüldü!"
echo "========================================"
`;

    // Script'i indir
    const blob = new Blob([batchScript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `video-convert-batch-${Date.now()}.bat`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGenerateBashScript = () => {
    const selectedVideoData = videos
      .filter((v) => selectedVideos.has(v.id) && v.analysis)
      .map((v) => ({
        id: v.id,
        filename: v.file.name,
        recommendation: v.analysis!.bestRecommendation,
      }));

    if (selectedVideoData.length === 0) return;

    const bashScript = `#!/bin/bash
# Toplu Video Dönüştürme Script'i
# Oluşturulma: ${new Date().toLocaleString("tr-TR")}
# Toplam Video: ${selectedVideoData.length}

set -e

INPUT_DIR="\${INPUT_DIR:-./input}"
OUTPUT_DIR="\${OUTPUT_DIR:-./output}"

mkdir -p "$OUTPUT_DIR"

echo "========================================"
echo "Toplu Video Dönüştürme Başlatılıyor..."
echo "========================================"
echo

${selectedVideoData
  .map((video, index) => {
    const inputFile = video.filename;
    const outputFile =
      video.filename.replace(/\.[^/.]+$/, "") +
      (video.recommendation.codec === "h264" ||
      video.recommendation.codec === "h265"
        ? ".mp4"
        : ".webm");

    return `echo "[${index + 1}/${
      selectedVideoData.length
    }] İşleniyor: ${inputFile}"
${video.recommendation.ffmpegCommand
  .replace(`"${inputFile}"`, `"$INPUT_DIR/${inputFile}"`)
  .replace(`"${outputFile}"`, `"$OUTPUT_DIR/${outputFile}"`)}
echo "Tamamlandı: ${outputFile}"
echo`;
  })
  .join("\n\n")}

echo "========================================"
echo "Tüm videolar başarıyla dönüştürüldü!"
echo "========================================"
`;

    const blob = new Blob([bashScript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `video-convert-batch-${Date.now()}.sh`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (videos.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {t("results.title")}
            </h2>
            <p className="text-muted-foreground mt-1">
              {videos.length} {t("common.videoFiles")} {t("common.loaded")}
              {completedVideos.length > 0 && (
                <span className="ml-2">
                  • {completedVideos.length} {t("analysis.analysisCompleted")}
                </span>
              )}
            </p>
          </div>
          {completedVideos.length > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={
                  allSelected || (someSelected ? "indeterminate" : false)
                }
                onCheckedChange={handleSelectAll}
                className="h-4 w-4"
              />
              <span className="text-sm text-muted-foreground">
                {t("common.selectAll")}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedVideos.size > 0 && (
            <>
              {selectedVideos.size >= 2 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleStartComparison}
                  className="gap-2"
                >
                  <GitCompare className="h-4 w-4" />
                  Karşılaştır
                </Button>
              )}
              <Button
                variant="default"
                size="sm"
                onClick={handleGenerateBatchScript}
                className="gap-2"
              >
                <FileCode className="h-4 w-4" />
                {t("results.batchScript")}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleGenerateBashScript}
                className="gap-2"
              >
                <FileCode className="h-4 w-4" />
                {t("results.bashScript")}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {t("common.delete")} ({selectedVideos.size})
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={clearVideos}>
            {t("common.clearAll")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {videos.map((video, index) => (
          <motion.div
            key={video.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="relative"
          >
            <VideoAnalyzer video={video} />
            <VideoCard
              video={video}
              selected={selectedVideos.has(video.id)}
              onSelect={
                video.analysis
                  ? (selected) => handleSelectVideo(video.id, selected)
                  : undefined
              }
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 z-10 h-7 w-7 rounded-full bg-background/90 backdrop-blur-sm hover:bg-destructive/10 hover:text-destructive transition-all"
              onClick={() => removeVideo(video.id)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </motion.div>
        ))}
      </div>

      {/* Video Comparison Modal */}
      {comparisonVideo1 && comparisonVideo2 && (
        <VideoComparison
          video1={comparisonVideo1}
          video2={comparisonVideo2}
          onClose={handleCloseComparison}
        />
      )}
    </motion.div>
  );
}
