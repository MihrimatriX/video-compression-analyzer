"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  Check,
  Info,
  Loader2,
  Clock,
  Download,
  Play,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  formatFileSize,
  formatDuration,
  formatBitrate,
} from "@/lib/utils/video-detector";
import { extractFFmpegOptions } from "@/lib/utils/ffmpeg-options-extractor";
import { FFmpegCommandHighlighter } from "@/components/ui/ffmpeg-command-highlighter";
import type { VideoFile } from "@/lib/types/video";
import { useVideoStore } from "@/lib/store/video-store";
import { useTranslation } from "@/lib/i18n/use-translation";
import {
  convertVideo,
  type ConversionProgress,
} from "@/lib/ffmpeg/video-converter";
import { isWebCodecsSupported } from "@/lib/ffmpeg/webcodecs-converter";

interface VideoCardProps {
  video: VideoFile;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
}

export function VideoCard({
  video,
  selected = false,
  onSelect,
}: VideoCardProps) {
  const { selectedPreset } = useVideoStore();
  const { t } = useTranslation();
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [copiedSettings, setCopiedSettings] = useState(false);
  const [selectedCodecIndex, setSelectedCodecIndex] = useState(0);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] =
    useState<ConversionProgress | null>(null);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [useWebCodecs, setUseWebCodecs] = useState(isWebCodecsSupported());

  // Tüm hook'lar conditional return'den önce çağrılmalı
  const recommendations = video.analysis?.recommendations || [];
  const bestRecommendation = video.analysis?.bestRecommendation;

  // Eğer seçili bir preset varsa, ona uygun öneriyi bul
  // Preset'ten oluşturulan öneri genellikle ilk sırada olur
  const presetMatchedIndex =
    selectedPreset && recommendations.length > 0
      ? recommendations.findIndex((rec) => {
          // Codec eşleşmesi
          const codecMatch =
            (selectedPreset.codec === "av1" && rec.codec === "av1") ||
            (selectedPreset.codec === "h265" && rec.codec === "h265") ||
            (selectedPreset.codec === "hevc_nvenc" && rec.codec === "h265") ||
            (selectedPreset.codec === "hevc_amf" && rec.codec === "h265") ||
            (selectedPreset.codec === "h264" && rec.codec === "h264") ||
            (selectedPreset.codec === "vp9" && rec.codec === "vp9");

          if (!codecMatch) return false;

          // CRF/CQ eşleşmesi (yaklaşık eşleşme - ±2 tolerans)
          if (selectedPreset.crf !== undefined && rec.crf !== undefined) {
            return Math.abs(rec.crf - selectedPreset.crf) <= 2;
          }
          if (selectedPreset.cq !== undefined && rec.crf !== undefined) {
            return Math.abs(rec.crf - selectedPreset.cq) <= 2;
          }

          // Eğer CRF yoksa, codec eşleşmesi yeterli
          return codecMatch;
        })
      : -1;

  // Preset değiştiğinde index'i güncelle (sadece preset değiştiğinde, kullanıcı seçimi yapmadığında)
  const [userSelectedCodec, setUserSelectedCodec] = useState(false);

  useEffect(() => {
    // Eğer kullanıcı manuel seçim yaptıysa, preset değişse bile müdahale etme
    if (userSelectedCodec) return;

    if (presetMatchedIndex >= 0) {
      setSelectedCodecIndex(presetMatchedIndex);
    } else if (
      recommendations.length > 0 &&
      selectedCodecIndex >= recommendations.length
    ) {
      // Index geçersizse sıfırla
      setSelectedCodecIndex(0);
    }
  }, [presetMatchedIndex, recommendations.length]);

  // Preset değiştiğinde kullanıcı seçimini sıfırla
  useEffect(() => {
    setUserSelectedCodec(false);
  }, [selectedPreset]);

  if (!video.analysis) {
    return (
      <Card
        className={`overflow-hidden transition-all flex flex-row ${
          selected ? "ring-2 ring-primary" : ""
        }`}
      >
        {/* Thumbnail - Sol taraf */}
        <div className="relative w-48 h-48 shrink-0 bg-muted">
          <div className="flex h-full items-center justify-center">
            {video.status === "analyzing" ? (
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            ) : (
              <Info className="h-12 w-12 text-muted-foreground" />
            )}
          </div>
          {onSelect && (
            <div className="absolute left-2 top-2">
              <Checkbox
                checked={selected}
                onCheckedChange={(checked) => onSelect(checked === true)}
                className="bg-background/90 backdrop-blur-sm"
              />
            </div>
          )}
        </div>

        {/* İçerik - Sağ taraf */}
        <div className="flex-1 flex flex-col min-w-0">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="flex items-center gap-2 text-base">
              {video.status === "analyzing" && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {video.file.name}
            </CardTitle>
            <CardDescription>
              {video.status === "analyzing"
                ? t("common.analyzing")
                : t("common.waiting")}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {video.status === "analyzing" && video.progress !== undefined && (
              <div className="space-y-2">
                <Progress value={video.progress} />
                <p className="text-sm text-muted-foreground">
                  %{video.progress}
                </p>
              </div>
            )}
            {video.status === "error" && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {video.error || "Bilinmeyen hata"}
              </div>
            )}
          </CardContent>
        </div>
      </Card>
    );
  }

  const { metadata } = video.analysis;
  const currentRecommendation =
    recommendations[selectedCodecIndex] ||
    bestRecommendation ||
    recommendations[0];

  const handleCopyCommand = async () => {
    try {
      // Sadece options'ı kopyala (input ve output dosyaları olmadan)
      const optionsOnly = extractFFmpegOptions(
        currentRecommendation.ffmpegCommand
      );
      await navigator.clipboard.writeText(optionsOnly);
      setCopiedCommand(true);
      setTimeout(() => setCopiedCommand(false), 2000);
    } catch (error) {
      console.error("Kopyalama hatası:", error);
    }
  };

  const handleCopySettings = async () => {
    try {
      const settings = JSON.stringify(currentRecommendation, null, 2);
      await navigator.clipboard.writeText(settings);
      setCopiedSettings(true);
      setTimeout(() => setCopiedSettings(false), 2000);
    } catch (error) {
      console.error("Kopyalama hatası:", error);
    }
  };

  const handleConvert = async () => {
    if (!video.file || !currentRecommendation) return;

    setIsConverting(true);
    setConversionError(null);
    setConversionProgress({ progress: 0, time: 0 });

    try {
      // Conversion options'ı oluştur
      // Bitrate bps (bits per second) olarak geliyor, FFmpeg için k/M formatına çevir
      const formatBitrate = (bps: number): string => {
        if (bps >= 1000000) {
          return `${Math.round(bps / 1000000)}M`;
        }
        return `${Math.round(bps / 1000)}k`;
      };

      const options = {
        codec: currentRecommendation.codec,
        // CRF veya quality varsa bitrate kullanma (CRF modu)
        bitrate:
          !currentRecommendation.crf &&
          !currentRecommendation.quality &&
          currentRecommendation.bitrate
            ? formatBitrate(currentRecommendation.bitrate)
            : undefined,
        crf: currentRecommendation.crf,
        quality: currentRecommendation.quality,
        preset: currentRecommendation.preset,
        resolution: currentRecommendation.resolution,
        audioBitrate: currentRecommendation.audioBitrate
          ? formatBitrate(currentRecommendation.audioBitrate)
          : "128k",
        audioCodec: currentRecommendation.audioCodec,
        pixelFormat: metadata.pixelFormat || "yuv420p",
      };

      const blob = await convertVideo(
        video.file,
        options,
        (progress) => {
          setConversionProgress(progress);
        },
        t
      );

      // Dosyayı indir
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const outputExtension =
        options.codec === "vp9" || options.codec === "av1" ? ".webm" : ".mp4";
      a.download = `${video.file.name.replace(
        /\.[^/.]+$/,
        ""
      )}_converted${outputExtension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setConversionProgress({
        progress: 100,
        time: 0,
        message: t("conversion.completed"),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setConversionError(errorMessage);
      console.error("Conversion hatası:", error);
    } finally {
      setIsConverting(false);
      setTimeout(() => {
        setConversionProgress(null);
        setConversionError(null);
      }, 3000);
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}sn`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (minutes < 60) {
      return secs > 0 ? `${minutes}dk ${secs}sn` : `${minutes}dk`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}sa ${mins}dk` : `${hours}sa`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={`overflow-hidden transition-all flex flex-row ${
          selected ? "ring-2 ring-primary" : ""
        }`}
      >
        {/* Thumbnail - Sol taraf (daha kompakt) */}
        <div className="relative w-24 h-24 shrink-0 bg-muted overflow-hidden group">
          {metadata.thumbnail && metadata.thumbnail.trim() !== "" ? (
            <>
              <img
                src={metadata.thumbnail}
                alt={metadata.filename}
                className="w-full h-full object-cover transition-opacity"
                loading="lazy"
                onError={(e) => {
                  // Thumbnail yüklenemezse fallback göster
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector(".thumbnail-fallback")) {
                    const fallback = document.createElement("div");
                    fallback.className =
                      "thumbnail-fallback flex h-full w-full items-center justify-center bg-muted";
                    fallback.innerHTML =
                      '<svg class="h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>';
                    parent.appendChild(fallback);
                  }
                }}
              />
              {/* Video oynatma butonu overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="bg-black/50 rounded-full p-3">
                  <svg
                    className="h-8 w-8 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <svg
                className="h-12 w-12 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
          {currentRecommendation.estimatedSavingsPercent > 0 && (
            <div className="absolute right-2 top-2 rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
              %{currentRecommendation.estimatedSavingsPercent.toFixed(1)}{" "}
              {t("video.savings")}
            </div>
          )}
          {onSelect && (
            <div className="absolute left-2 top-2">
              <Checkbox
                checked={selected}
                onCheckedChange={(checked) => onSelect(checked === true)}
                className="bg-background/90 backdrop-blur-sm"
              />
            </div>
          )}
        </div>

        {/* İçerik - Sağ taraf (daha kompakt) */}
        <div className="flex-1 flex flex-col min-w-0">
          <CardHeader className="pb-1.5 pt-2 px-3">
            <CardTitle className="line-clamp-1 text-sm">
              {metadata.filename}
            </CardTitle>
            <CardDescription className="text-[11px]">
              {formatFileSize(metadata.fileSize)} •{" "}
              {formatDuration(metadata.duration)}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 px-3 pb-3 space-y-2 overflow-y-auto max-h-[600px]">
            <Tabs defaultValue="current" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-7">
                <TabsTrigger value="current" className="text-[11px]">
                  {t("video.current")}
                </TabsTrigger>
                <TabsTrigger value="recommended" className="text-[11px]">
                  {t("video.recommended")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="current" className="space-y-1.5 mt-1.5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("video.codec")}
                    </span>
                    <span className="font-medium">{metadata.codecName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("video.resolution")}
                    </span>
                    <span className="font-medium">
                      {metadata.width} × {metadata.height}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("video.bitrate")}
                    </span>
                    <span className="font-medium">
                      {formatBitrate(metadata.bitrate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("video.fps")}
                    </span>
                    <span className="font-medium">
                      {metadata.framerate.toFixed(1)}
                    </span>
                  </div>
                  {metadata.audioBitrate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("video.audioBitrate")}
                      </span>
                      <span className="font-medium">
                        {formatBitrate(metadata.audioBitrate)}
                      </span>
                    </div>
                  )}
                  {metadata.audioCodec && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("video.audioCodec")}
                      </span>
                      <span className="font-medium">{metadata.audioCodec}</span>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="recommended" className="space-y-1.5 mt-1.5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("video.codec")}
                    </span>
                    <span className="font-medium">
                      {currentRecommendation.codecName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("video.resolution")}
                    </span>
                    <span className="font-medium">
                      {currentRecommendation.resolution.width} ×{" "}
                      {currentRecommendation.resolution.height}
                      {currentRecommendation.resolution.scale !==
                        "original" && (
                        <span className="ml-1 text-[10px] text-muted-foreground">
                          (
                          {currentRecommendation.resolution.scale ===
                          "downscale"
                            ? "↓"
                            : "↑"}
                          )
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("video.bitrate")}
                    </span>
                    <span className="font-medium">
                      {formatBitrate(currentRecommendation.bitrate)}
                    </span>
                  </div>
                  {currentRecommendation.crf !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("video.crf")}
                      </span>
                      <span className="font-medium">
                        {currentRecommendation.crf}
                      </span>
                    </div>
                  )}
                  {currentRecommendation.quality !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("video.quality")}
                      </span>
                      <span className="font-medium">
                        {currentRecommendation.quality}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("video.preset")}
                    </span>
                    <span className="font-medium">
                      {currentRecommendation.preset}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("video.pixelFormat")}
                    </span>
                    <span className="font-medium">
                      {metadata.pixelFormat || "yuv420p"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("video.audioCodec")}
                    </span>
                    <span className="font-medium">
                      {currentRecommendation.audioCodec ||
                        metadata.audioCodec ||
                        "libopus"}
                    </span>
                  </div>
                  {(currentRecommendation.audioBitrate ||
                    metadata.audioBitrate) && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("video.audioBitrate")}
                      </span>
                      <span className="font-medium">
                        {formatBitrate(
                          (currentRecommendation.audioBitrate ||
                            metadata.audioBitrate ||
                            128) * 1000
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("video.estimatedSize")}
                    </span>
                    <span className="font-medium">
                      {formatFileSize(currentRecommendation.estimatedSize)}
                    </span>
                  </div>
                  {currentRecommendation.estimatedSavings > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("video.savings")}
                      </span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {formatFileSize(currentRecommendation.estimatedSavings)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between col-span-2 sm:col-span-3 pt-1.5 border-t mt-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{t("video.estimatedTime")}</span>
                    </div>
                    <span className="font-medium">
                      {formatTime(currentRecommendation.estimatedTime)}
                    </span>
                  </div>
                </div>

                <div className="rounded-md bg-muted/50 p-1.5">
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {currentRecommendation.explanation}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground font-medium">
                    {t("video.ffmpegCommand")}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1 rounded-md border bg-background p-1.5 flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <FFmpegCommandHighlighter
                          command={extractFFmpegOptions(
                            currentRecommendation.ffmpegCommand
                          )}
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCopyCommand}
                        className="h-6 w-6 p-0 shrink-0"
                        title={t("video.copyFullCommand")}
                      >
                        {copiedCommand ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopySettings}
                      className="h-6 px-2 text-[10px] shrink-0"
                    >
                      {copiedSettings ? (
                        <>
                          <Check className="mr-1 h-3 w-3" />
                          {t("video.copied")}
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1 h-3 w-3" />
                          JSON
                        </>
                      )}
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleConvert}
                      disabled={
                        isConverting ||
                        (!useWebCodecs && video.file.size > 50 * 1024 * 1024)
                      }
                      className="h-6 px-2 text-[10px] shrink-0"
                      title={
                        !useWebCodecs && video.file.size > 50 * 1024 * 1024
                          ? t("conversion.fileTooLargeTooltip")
                          : useWebCodecs
                          ? t("conversion.gpuAcceleration")
                          : t("conversion.convertAndDownload")
                      }
                    >
                      {isConverting ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          {conversionProgress?.progress
                            ? `${Math.round(conversionProgress.progress)}%`
                            : "..."}
                        </>
                      ) : (
                        <>
                          <Play className="mr-1 h-3 w-3" />
                          {t("video.convert")}
                        </>
                      )}
                    </Button>
                  </div>
                  {(isConverting || conversionProgress || conversionError) && (
                    <div className="mt-2 space-y-1">
                      {conversionProgress && (
                        <div className="space-y-1">
                          <Progress value={conversionProgress.progress} />
                          {conversionProgress.message && (
                            <p className="text-[10px] text-muted-foreground">
                              {conversionProgress.message}
                              {conversionProgress.speed &&
                                ` • ${conversionProgress.speed}`}
                            </p>
                          )}
                        </div>
                      )}
                      {conversionError && (
                        <div className="rounded-md bg-destructive/10 p-2 text-[10px] text-destructive">
                          {conversionError}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {recommendations.length > 1 && (
              <div className="border-t pt-2">
                <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">
                  {t("video.otherCodecs")}
                </p>
                <div className="flex flex-wrap gap-1">
                  {recommendations.map((rec, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedCodecIndex(index);
                        setUserSelectedCodec(true);
                      }}
                      className={`rounded-md border px-1.5 py-0.5 text-[10px] transition-all cursor-pointer ${
                        selectedCodecIndex === index
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/50 hover:bg-muted border-border"
                      }`}
                    >
                      <span className="font-medium">{rec.codecName}</span>
                      <span
                        className={`ml-0.5 ${
                          selectedCodecIndex === index
                            ? "opacity-90"
                            : "text-muted-foreground"
                        }`}
                      >
                        ({rec.estimatedSavingsPercent > 0 ? "-" : "+"}
                        {Math.abs(rec.estimatedSavingsPercent).toFixed(1)}%)
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </div>
      </Card>
    </motion.div>
  );
}
