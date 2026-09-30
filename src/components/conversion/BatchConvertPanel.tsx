"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  FolderOpen,
  Layers,
  Loader2,
  MinusCircle,
  Play,
  Square,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Choice, Field } from "@/components/converter/fields";
import { downloadResult, ENGINE_LABELS } from "@/lib/engine";
import { useDesktop } from "@/hooks/use-desktop";
import { useBatchStore, type BatchConfig, type BatchItemStatus } from "@/lib/store/batch-store";
import { useVideoStore } from "@/lib/store/video-store";
import { useTranslation } from "@/lib/i18n/use-translation";
import { formatFileSize } from "@/lib/utils/video-detector";
import { formatSeconds } from "./ConversionStatus";

const STATUS_ICON: Record<BatchItemStatus, React.ReactNode> = {
  queued: <MinusCircle className="h-3.5 w-3.5 text-muted-foreground" />,
  running: <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />,
  done: <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />,
  skipped: <MinusCircle className="h-3.5 w-3.5 text-amber-500" />,
  error: <XCircle className="h-3.5 w-3.5 text-destructive" />,
  canceled: <XCircle className="h-3.5 w-3.5 text-muted-foreground" />,
};

export function BatchConvertPanel() {
  const { t } = useTranslation();
  const desktop = useDesktop();
  const videos = useVideoStore((s) => s.videos);
  const { items, running, startedAt, finishedAt, start, cancel, clear } = useBatchStore();
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<BatchConfig>({
    mode: "recommended",
    codec: "auto",
    targetMb: 25,
    crf: 26,
  });

  const analyzed = videos.filter((v) => v.analysis);
  const summary = useMemo(() => {
    const done = items.filter((i) => i.result);
    const before = done.reduce((a, i) => a + i.originalSize, 0);
    const after = done.reduce((a, i) => a + (i.result?.size ?? 0), 0);
    const finished = items.filter((i) => !["queued", "running"].includes(i.status)).length;
    const current = items.find((i) => i.status === "running");
    const overall = items.length ? (finished + (current?.progress ?? 0)) / items.length : 0;
    return { before, after, finished, overall };
  }, [items]);

  if (analyzed.length === 0 && items.length === 0) return null;

  const downloadAll = async () => {
    for (const item of items) {
      if (item.status === "done" && item.result?.blob) {
        downloadResult(item.result);
        // Tarayıcıların ardışık indirmeleri engellememesi için kısa bekleme
        await new Promise((r) => setTimeout(r, 400));
      }
    }
  };

  const firstOutput = items.find((i) => i.result?.outputPath)?.result?.outputPath;

  return (
    <Card className="space-y-3 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button className="flex items-center gap-2 text-sm font-semibold" onClick={() => setOpen(!open)}>
          <Layers className="h-4 w-4 text-primary" />
          {t("batch.title")}
          <span className="text-xs font-normal text-muted-foreground">
            ({analyzed.length} {t("batch.ready")})
          </span>
        </button>
        <div className="flex gap-1.5">
          {running ? (
            <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={cancel}>
              <Square className="mr-1 h-3.5 w-3.5" /> {t("batch.cancelAll")}
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-8 text-xs"
              disabled={analyzed.length === 0}
              onClick={() => {
                setOpen(true);
                void start(analyzed, config);
              }}
              data-testid="batch-start"
            >
              <Play className="mr-1 h-3.5 w-3.5" /> {t("batch.convertAll")}
            </Button>
          )}
        </div>
      </div>

      {open && !running && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t("batch.mode")}>
            <Choice
              value={config.mode}
              onChange={(v) => setConfig({ ...config, mode: v as BatchConfig["mode"] })}
              options={[
                { value: "recommended", label: t("batch.mode.recommended") },
                { value: "target-size", label: t("batch.mode.targetSize") },
                { value: "crf", label: t("batch.mode.crf") },
              ]}
            />
          </Field>
          {config.mode === "target-size" && (
            <Field label={t("enc.targetSize") + " (MB)"}>
              <Input
                type="number"
                min={1}
                value={config.targetMb}
                onChange={(e) => setConfig({ ...config, targetMb: Number(e.target.value) || 25 })}
                className="h-9"
              />
            </Field>
          )}
          {config.mode === "crf" && (
            <Field label="CRF">
              <Input
                type="number"
                min={0}
                max={63}
                value={config.crf}
                onChange={(e) => setConfig({ ...config, crf: Number(e.target.value) || 26 })}
                className="h-9"
              />
            </Field>
          )}
          <Field label={t("video.codec")}>
            <Choice
              value={config.codec}
              onChange={(v) => setConfig({ ...config, codec: v as BatchConfig["codec"] })}
              options={[
                { value: "auto", label: t("batch.codec.recommended") },
                { value: "h264", label: "H.264" },
                { value: "h265", label: "H.265" },
                { value: "vp9", label: "VP9" },
                { value: "av1", label: "AV1" },
              ]}
            />
          </Field>
          <Field label={t("batch.maxHeight")}>
            <Choice
              value={String(config.maxHeight ?? "")}
              onChange={(v) => setConfig({ ...config, maxHeight: v ? Number(v) : undefined })}
              options={[
                { value: "", label: t("batch.maxHeight.none") },
                { value: "2160", label: "2160p" },
                { value: "1440", label: "1440p" },
                { value: "1080", label: "1080p" },
                { value: "720", label: "720p" },
                { value: "480", label: "480p" },
              ]}
            />
          </Field>
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-2">
          <div className="space-y-1">
            <Progress value={summary.overall * 100} />
            <div className="flex flex-wrap justify-between gap-2 text-[11px] text-muted-foreground">
              <span>
                {summary.finished}/{items.length} {t("batch.completed")}
                {startedAt && finishedAt && ` • ${formatSeconds((finishedAt - startedAt) / 1000)}`}
              </span>
              {summary.before > 0 && (
                <span>
                  {formatFileSize(summary.before)} → <b className="text-foreground">{formatFileSize(summary.after)}</b>{" "}
                  (-{(((summary.before - summary.after) / summary.before) * 100).toFixed(1)}%)
                </span>
              )}
            </div>
          </div>

          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {items.map((item) => (
              <li key={item.videoId} className="flex items-center gap-2 rounded-md bg-muted/30 px-2 py-1.5 text-[11px]">
                {STATUS_ICON[item.status]}
                <span className="min-w-0 flex-1 truncate" title={item.error ?? item.name}>
                  {item.name}
                  {item.error && <span className="ml-1 text-destructive">— {item.error}</span>}
                  {item.status === "skipped" && <span className="ml-1 text-amber-600">— {t("batch.skippedLarger")}</span>}
                </span>
                {item.status === "running" && (
                  <span className="shrink-0 tabular-nums">{Math.round(item.progress * 100)}%</span>
                )}
                {item.engine && item.status === "running" && (
                  <span className="shrink-0 text-muted-foreground">{ENGINE_LABELS[item.engine]}</span>
                )}
                {item.result && (
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatFileSize(item.result.size)}
                  </span>
                )}
                {item.result?.blob && (
                  <button
                    className="shrink-0 text-primary hover:underline"
                    onClick={() => downloadResult(item.result!)}
                    title={t("enc.download")}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                )}
                {desktop && item.result?.outputPath && (
                  <button
                    className="shrink-0 text-primary hover:underline"
                    onClick={() => desktop.showInFolder(item.result!.outputPath!)}
                    title={t("enc.showInFolder")}
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>

          {!running && (
            <div className="flex flex-wrap gap-1.5">
              {items.some((i) => i.status === "done" && i.result?.blob) && (
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={downloadAll}>
                  <Download className="mr-1 h-3 w-3" /> {t("batch.downloadAll")}
                </Button>
              )}
              {desktop && firstOutput && (
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => desktop.showInFolder(firstOutput)}>
                  <FolderOpen className="mr-1 h-3 w-3" /> {t("batch.openFolder")}
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={clear}>
                {t("batch.clear")}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
