"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useVideoStore } from "@/lib/store/video-store";
import { useTranslation } from "@/lib/i18n/use-translation";
import {
  TrendingUp,
  TrendingDown,
  FileVideo,
  Clock,
  HardDrive,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ParameterImpact {
  name: string;
  description: string;
  impact: {
    fileSize: number; // Yüzde değişim
    quality: number; // Yüzde değişim (negatif = kayıp)
    encodingTime: number; // Yüzde değişim
  };
  recommendation: "good" | "neutral" | "bad";
}

export function ParameterImpactAnalysis() {
  const { videos, selectedPreset } = useVideoStore();
  const { t } = useTranslation();

  const completedVideos = useMemo(
    () => videos.filter((v) => v.analysis),
    [videos]
  );

  const analysis = useMemo(() => {
    try {
      if (completedVideos.length === 0 || !selectedPreset) {
        return null;
      }

      // Tüm videoların ortalama analizini hesapla
      let totalOriginalSize = 0;
      let totalEstimatedSize = 0;
      let totalSavings = 0;
      let totalEncodingTime = 0;
      let totalQualityImpact = 0;

      completedVideos.forEach((video) => {
        if (!video.analysis) return;

        const { metadata, bestRecommendation } = video.analysis;
        totalOriginalSize += metadata.fileSize;
        totalEstimatedSize += bestRecommendation.estimatedSize;
        totalSavings += bestRecommendation.estimatedSavings;
        totalEncodingTime += bestRecommendation.estimatedTime;

        // Kalite etkisi tahmini (CRF/CQ değerine göre)
        const qualityImpact = calculateQualityImpact(selectedPreset, metadata);
        totalQualityImpact += qualityImpact;
      });

      const avgSavingsPercent = (totalSavings / totalOriginalSize) * 100;
      const avgQualityImpact = totalQualityImpact / completedVideos.length;
      const avgEncodingTime = totalEncodingTime / completedVideos.length;

      // Parametre etkilerini hesapla
      const parameters: ParameterImpact[] = [
        {
          name: "Codec Seçimi",
          description: getCodecDescription(selectedPreset.codec),
          impact: {
            fileSize: getCodecSizeImpact(selectedPreset.codec),
            quality: getCodecQualityImpact(selectedPreset.codec),
            encodingTime: getCodecTimeImpact(selectedPreset.codec),
          },
          recommendation:
            selectedPreset.codec === "av1"
              ? "good"
              : selectedPreset.codec === "h265"
              ? "neutral"
              : "bad",
        },
        {
          name: "CRF/CQ Değeri",
          description: getCRFDescription(selectedPreset),
          impact: {
            fileSize: getCRFSizeImpact(selectedPreset),
            quality: avgQualityImpact,
            encodingTime: 0,
          },
          recommendation:
            avgQualityImpact > -5
              ? "good"
              : avgQualityImpact > -10
              ? "neutral"
              : "bad",
        },
        {
          name: "Preset Hızı",
          description: getPresetDescription(selectedPreset.preset ?? "medium"),
          impact: {
            fileSize: 0,
            quality: 0,
            encodingTime: getPresetTimeImpact(
              selectedPreset.preset ?? "medium"
            ),
          },
          recommendation:
            typeof selectedPreset.preset === "string" &&
            selectedPreset.preset.includes("fast")
              ? "good"
              : "neutral",
        },
        {
          name: "Pixel Format",
          description: getPixelFormatDescription(selectedPreset.pixFmt),
          impact: {
            fileSize: getPixelFormatSizeImpact(selectedPreset.pixFmt),
            quality: getPixelFormatQualityImpact(selectedPreset.pixFmt),
            encodingTime: getPixelFormatTimeImpact(selectedPreset.pixFmt),
          },
          recommendation: selectedPreset.pixFmt.includes("10")
            ? "good"
            : "neutral",
        },
      ];

      return {
        totalVideos: completedVideos.length,
        avgSavingsPercent,
        avgQualityImpact,
        avgEncodingTime,
        parameters,
      };
    } catch (error) {
      console.error("ParameterImpactAnalysis error:", error);
      return null;
    }
  }, [completedVideos, selectedPreset]);

  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Parametre Analizi</CardTitle>
          <CardDescription className="text-xs">
            Video yükleyip preset seçtiğinizde detaylı analiz görünecek
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="sticky top-20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            {t("impact.title")}
          </CardTitle>
          <CardDescription className="text-xs">
            {t("impact.subtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Özet istatistikler */}
          <div className="grid grid-cols-2 gap-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.2 }}
              className="rounded-lg border p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">
                  {t("impact.sizeSavings")}
                </span>
              </div>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                %{analysis.avgSavingsPercent.toFixed(1)}
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.2 }}
              className="rounded-lg border p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">
                  {t("impact.averageTime")}
                </span>
              </div>
              <p className="text-lg font-bold">
                {formatTime(analysis.avgEncodingTime)}
              </p>
            </motion.div>
          </div>

          {/* Parametre detayları */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground mb-2">
              {t("impact.parameterEffects")}
            </p>
            <AnimatePresence>
              {analysis.parameters.map((param, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: index * 0.1, duration: 0.2 }}
                  className="rounded-lg border p-3 space-y-2.5 bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm font-semibold">
                          {param.name}
                        </span>
                        <Badge
                          variant={
                            param.recommendation === "good"
                              ? "default"
                              : param.recommendation === "neutral"
                              ? "outline"
                              : "destructive"
                          }
                          className="h-5 px-2 text-[10px] font-medium"
                        >
                          {param.recommendation === "good"
                            ? t("impact.recommended")
                            : param.recommendation === "neutral"
                            ? t("impact.medium")
                            : t("impact.warning")}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {param.description}
                      </p>
                    </div>
                  </div>

                  {/* Etki metrikleri */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                    {param.impact.fileSize !== 0 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 + 0.2 }}
                        className="text-center p-2 rounded-md bg-muted/30"
                      >
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
                          {param.impact.fileSize < 0 ? (
                            <TrendingDown className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                          ) : (
                            <TrendingUp className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        <p
                          className={cn(
                            "text-xs font-bold",
                            param.impact.fileSize < 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          )}
                        >
                          {param.impact.fileSize > 0 ? "+" : ""}
                          {param.impact.fileSize.toFixed(0)}%
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {t("impact.fileSize")}
                        </p>
                      </motion.div>
                    )}
                    {param.impact.quality !== 0 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 + 0.25 }}
                        className="text-center p-2 rounded-md bg-muted/30"
                      >
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <FileVideo className="h-3.5 w-3.5 text-muted-foreground" />
                          {param.impact.quality < 0 ? (
                            <TrendingDown className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                          ) : (
                            <TrendingUp className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                          )}
                        </div>
                        <p
                          className={cn(
                            "text-xs font-bold",
                            param.impact.quality < 0
                              ? "text-orange-600 dark:text-orange-400"
                              : "text-green-600 dark:text-green-400"
                          )}
                        >
                          {param.impact.quality > 0 ? "+" : ""}
                          {param.impact.quality.toFixed(1)}%
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {t("impact.quality")}
                        </p>
                      </motion.div>
                    )}
                    {param.impact.encodingTime !== 0 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 + 0.3 }}
                        className="text-center p-2 rounded-md bg-muted/30"
                      >
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {param.impact.encodingTime < 0 ? (
                            <TrendingDown className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                          ) : (
                            <TrendingUp className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        <p
                          className={cn(
                            "text-xs font-bold",
                            param.impact.encodingTime < 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          )}
                        >
                          {param.impact.encodingTime > 0 ? "+" : ""}
                          {param.impact.encodingTime.toFixed(0)}%
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {t("impact.time")}
                        </p>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Genel öneri */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            className="rounded-md bg-primary/5 border border-primary/20 p-3"
          >
            <p className="text-sm font-semibold text-foreground mb-1.5">
              {t("impact.generalAssessment")}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {getOverallRecommendation(analysis)}
            </p>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Yardımcı fonksiyonlar
function calculateQualityImpact(
  preset: { crf?: number; cq?: number },
  metadata: { bitrate: number; width: number; height: number }
): number {
  // CRF/CQ değerine göre kalite etkisi tahmini
  const crf = preset.crf || preset.cq || 23;
  const baseCRF = 23; // Referans noktası

  // CRF artarsa kalite düşer (negatif değer)
  const impact = (baseCRF - crf) * 2; // Her CRF birimi yaklaşık %2 kalite etkisi
  return impact;
}

function getCodecDescription(codec: string): string {
  const descriptions: Record<string, string> = {
    av1: "En yüksek sıkıştırma, en yavaş kodlama",
    h265: "İyi sıkıştırma, orta hız",
    h264: "Düşük sıkıştırma, hızlı kodlama",
    hevc_nvenc: "GPU hızlandırmalı, hızlı kodlama",
  };
  return descriptions[codec] || "Codec açıklaması";
}

function getCodecSizeImpact(codec: string): number {
  const impacts: Record<string, number> = {
    av1: -40, // %40 daha küçük
    h265: -30, // %30 daha küçük
    h264: -10, // %10 daha küçük
    hevc_nvenc: -25, // %25 daha küçük
  };
  return impacts[codec] || 0;
}

function getCodecQualityImpact(codec: string): number {
  const impacts: Record<string, number> = {
    av1: 0, // Aynı kalite
    h265: -2, // %2 kalite kaybı
    h264: -5, // %5 kalite kaybı
    hevc_nvenc: -3, // %3 kalite kaybı
  };
  return impacts[codec] || 0;
}

function getCodecTimeImpact(codec: string): number {
  const impacts: Record<string, number> = {
    av1: 300, // 3x daha yavaş
    h265: 100, // 2x daha yavaş
    h264: 0, // Referans
    hevc_nvenc: -50, // %50 daha hızlı (GPU)
  };
  return impacts[codec] || 0;
}

function getCRFDescription(preset: { crf?: number; cq?: number }): string {
  const crf = preset.crf || preset.cq || 23;
  if (crf <= 22) return "Maksimum kalite, büyük dosya";
  if (crf <= 26) return "Yüksek kalite, dengeli boyut";
  if (crf <= 30) return "Orta kalite, küçük dosya";
  return "Düşük kalite, çok küçük dosya";
}

function getCRFSizeImpact(preset: { crf?: number; cq?: number }): number {
  const crf = preset.crf || preset.cq || 23;
  const baseCRF = 23;
  // CRF artarsa dosya küçülür
  return (crf - baseCRF) * -3; // Her CRF birimi yaklaşık %3 boyut etkisi
}

function getPresetDescription(preset: string | number | undefined): string {
  if (preset === undefined) {
    return "Preset belirtilmemiş";
  }
  if (typeof preset === "number") {
    return `Preset ${preset} (AV1 için)`;
  }
  const descriptions: Record<string, string> = {
    ultrafast: "Çok hızlı, düşük kalite",
    superfast: "Hızlı, orta kalite",
    fast: "Hızlı, iyi kalite",
    medium: "Dengeli hız ve kalite",
    slow: "Yavaş, yüksek kalite",
    slower: "Çok yavaş, çok yüksek kalite",
    veryslow: "En yavaş, maksimum kalite",
  };
  return descriptions[preset] || "Preset açıklaması";
}

function getPresetTimeImpact(preset: string | number | undefined): number {
  if (preset === undefined) {
    return 0;
  }
  if (typeof preset === "number") {
    // AV1 preset: 0-8 arası, 0 en hızlı
    return (preset - 5) * 20; // Preset 5 referans
  }
  const impacts: Record<string, number> = {
    ultrafast: -80,
    superfast: -60,
    fast: -40,
    medium: 0,
    slow: 100,
    slower: 200,
    veryslow: 400,
  };
  return impacts[preset] || 0;
}

function getPixelFormatDescription(pixFmt: string): string {
  if (pixFmt.includes("10")) {
    return "10-bit renk derinliği, daha iyi kalite";
  }
  return "8-bit renk derinliği, standart kalite";
}

function getPixelFormatSizeImpact(pixFmt: string): number {
  return pixFmt.includes("10") ? 10 : 0; // 10-bit %10 daha büyük
}

function getPixelFormatQualityImpact(pixFmt: string): number {
  return pixFmt.includes("10") ? 5 : 0; // 10-bit %5 daha iyi kalite
}

function getPixelFormatTimeImpact(pixFmt: string): number {
  return pixFmt.includes("10") ? 20 : 0; // 10-bit %20 daha yavaş
}

function getOverallRecommendation(analysis: {
  avgSavingsPercent: number;
  avgQualityImpact: number;
}): string {
  const { avgSavingsPercent, avgQualityImpact } = analysis;

  if (avgSavingsPercent > 30 && avgQualityImpact > -5) {
    return "Mükemmel denge! Yüksek tasarruf ve minimal kalite kaybı.";
  }
  if (avgSavingsPercent > 20 && avgQualityImpact > -10) {
    return "İyi ayarlar. Tasarruf ve kalite dengesi uygun.";
  }
  if (avgQualityImpact < -15) {
    return "Kalite kaybı yüksek. CRF değerini düşürmeyi düşünün.";
  }
  return "Ayarlar uygun görünüyor.";
}

function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}sn`;
  }
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (minutes < 60) {
    return secs > 0 ? `${minutes}dk ${secs}sn` : `${minutes}dk`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}sa ${mins}dk` : `${hours}sa`;
}
