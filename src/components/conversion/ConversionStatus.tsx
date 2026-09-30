"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  FolderOpen,
  Gauge,
  GitCompare,
  Loader2,
  Square,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ENGINE_LABELS, downloadResult } from "@/lib/engine";
import { useDesktop } from "@/hooks/use-desktop";
import type { UseEncode } from "@/hooks/use-encode";
import { useTranslation } from "@/lib/i18n/use-translation";
import { useSettingsStore } from "@/lib/store/settings-store";
import { useVideoStore } from "@/lib/store/video-store";
import { formatFileSize } from "@/lib/utils/video-detector";
import { cn } from "@/lib/utils";

export function formatSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  if (seconds < 60) return `${Math.round(seconds)} sn`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m < 60) return `${m} dk ${s} sn`;
  return `${Math.floor(m / 60)} sa ${m % 60} dk`;
}

/** PSNR/SSIM değerini kullanıcı dostu bir etikete çevirir */
export function qualityGrade(ssim: number): { key: "excellent" | "good" | "fair" | "poor"; className: string } {
  if (ssim >= 0.98) return { key: "excellent", className: "text-green-600 dark:text-green-400" };
  if (ssim >= 0.95) return { key: "good", className: "text-emerald-600 dark:text-emerald-400" };
  if (ssim >= 0.9) return { key: "fair", className: "text-yellow-600 dark:text-yellow-400" };
  return { key: "poor", className: "text-red-600 dark:text-red-400" };
}

interface ConversionStatusProps {
  encode: UseEncode;
  originalFile: File;
  trimStart?: number;
  compact?: boolean;
}

export function ConversionStatus({ encode, originalFile, trimStart = 0, compact = false }: ConversionStatusProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const desktop = useDesktop();
  const autoMeasure = useSettingsStore((s) => s.autoMeasureQuality);
  const setComparePair = useVideoStore((s) => s.setComparePair);
  const { status, progress, result, error, engine, quality, qualityStatus, qualityError } = encode;
  const measuredFor = useRef<unknown>(null);

  useEffect(() => {
    if (autoMeasure && result && measuredFor.current !== result && result.size > 0) {
      measuredFor.current = result;
      void encode.measure(originalFile, trimStart);
    }
  }, [autoMeasure, result, encode, originalFile, trimStart]);

  if (status === "idle") return null;

  const textSize = compact ? "text-[10px]" : "text-xs";
  const percent = Math.round((progress?.progress ?? 0) * 100);

  if (status === "running") {
    return (
      <div className={cn("space-y-1.5 rounded-md border bg-muted/30 p-2", textSize)}>
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 font-medium">
            <Loader2 className="h-3 w-3 animate-spin" />
            {progress?.stage === "preparing" ? t("enc.preparing") : `${t("enc.encoding")} %${percent}`}
          </span>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={encode.cancel}>
            <Square className="mr-1 h-3 w-3" />
            {t("enc.cancel")}
          </Button>
        </div>
        <Progress value={percent} />
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
          {engine && <span>{t("enc.engine")}: {ENGINE_LABELS[engine.engine]}</span>}
          {progress?.speed !== undefined && <span>{t("enc.speed")}: {progress.speed.toFixed(2)}x</span>}
          {progress?.eta !== undefined && <span>{t("enc.eta")}: {formatSeconds(progress.eta)}</span>}
          {progress?.message && <span>{progress.message}</span>}
        </div>
        {engine?.note && <p className="text-muted-foreground italic">{engine.note}</p>}
      </div>
    );
  }

  if (status === "canceled") {
    return (
      <div className={cn("flex items-center gap-1.5 rounded-md border p-2 text-muted-foreground", textSize)}>
        <XCircle className="h-3.5 w-3.5" />
        {t("enc.canceled")}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={cn("rounded-md bg-destructive/10 p-2 text-destructive break-words", textSize)}>
        <span className="font-medium">{t("conversion.error")}:</span> {error}
      </div>
    );
  }

  if (!result) return null;
  const diff = originalFile.size - result.size;
  const diffPercent = (diff / originalFile.size) * 100;
  const grade = quality ? qualityGrade(quality.ssim) : null;
  const isVideoOutput = result.mimeType.startsWith("video/");

  return (
    <div className={cn("space-y-2 rounded-md border border-green-500/30 bg-green-500/5 p-2", textSize)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex items-center gap-1 font-medium text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {t("enc.done")}
        </span>
        <span>
          {formatFileSize(originalFile.size)} → <b>{formatFileSize(result.size)}</b>{" "}
          <span className={diff >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
            ({diff >= 0 ? "-" : "+"}
            {Math.abs(diffPercent).toFixed(1)}%)
          </span>
        </span>
        <span className="text-muted-foreground">
          {formatSeconds(result.elapsed)} • {result.encoderLabel ?? ENGINE_LABELS[result.engine]}
        </span>
      </div>
      {diff < 0 && <p className="text-amber-600 dark:text-amber-400">{t("enc.largerWarning")}</p>}
      {result.outputPath && <p className="text-muted-foreground break-all">{result.outputPath}</p>}

      <div className="flex flex-wrap gap-1.5">
        {result.blob && (
          <Button size="sm" className="h-7 text-[11px]" onClick={() => downloadResult(result)}>
            <Download className="mr-1 h-3 w-3" />
            {t("enc.download")}
          </Button>
        )}
        {desktop && result.outputPath && (
          <>
            <Button size="sm" className="h-7 text-[11px]" onClick={() => desktop.showInFolder(result.outputPath!)}>
              <FolderOpen className="mr-1 h-3 w-3" />
              {t("enc.showInFolder")}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => desktop.openPath(result.outputPath!)}>
              <ExternalLink className="mr-1 h-3 w-3" />
              {t("enc.open")}
            </Button>
          </>
        )}
        {isVideoOutput && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px]"
            disabled={qualityStatus === "running"}
            onClick={() => encode.measure(originalFile, trimStart)}
          >
            {qualityStatus === "running" ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Gauge className="mr-1 h-3 w-3" />
            )}
            {t("enc.measureQuality")}
          </Button>
        )}
        {isVideoOutput && result.blob && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px]"
            onClick={() => {
              setComparePair({
                a: originalFile,
                b: new File([result.blob!], result.fileName, { type: result.mimeType }),
              });
              router.push("/compare");
            }}
          >
            <GitCompare className="mr-1 h-3 w-3" />
            {t("enc.compareWithOriginal")}
          </Button>
        )}
      </div>

      {quality && grade && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded bg-background/60 p-1.5">
          <span className={cn("font-semibold", grade.className)}>{t(`enc.grade.${grade.key}`)}</span>
          <span>SSIM: <b>{quality.ssim.toFixed(4)}</b></span>
          <span>PSNR: <b>{quality.psnr.toFixed(2)} dB</b></span>
          <span className="text-muted-foreground">
            {quality.method === "sampled-frames"
              ? t("enc.sampledFrames", { n: quality.samples })
              : t("enc.fullCompare")}
          </span>
        </div>
      )}
      {qualityStatus === "error" && <p className="text-destructive">{qualityError}</p>}
    </div>
  );
}
