"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  EncodeCanceledError,
  encodeVideo,
  measureQuality,
  type EncodeOptions,
  type EncodeProgress,
  type EncodeResult,
  type EncodeTask,
  type EngineChoice,
  type EnginePreference,
  type ProbeResult,
  type QualityMetrics,
} from "@/lib/engine";
import { useSettingsStore } from "@/lib/store/settings-store";

export type EncodeStatus = "idle" | "running" | "done" | "error" | "canceled";

export interface UseEncode {
  status: EncodeStatus;
  progress: EncodeProgress | null;
  result: EncodeResult | null;
  error: string | null;
  engine: EngineChoice | null;
  quality: QualityMetrics | null;
  qualityStatus: "idle" | "running" | "done" | "error";
  qualityError: string | null;
  start: (
    file: File,
    options: EncodeOptions,
    probe?: ProbeResult,
    engine?: EnginePreference,
    allowCodecFallback?: boolean,
  ) => Promise<EncodeResult | null>;
  cancel: () => void;
  reset: () => void;
  measure: (original: File, trimStart?: number) => Promise<void>;
}

/** Tek bir dönüştürme işinin durumunu yöneten hook. */
export function useEncode(): UseEncode {
  const [status, setStatus] = useState<EncodeStatus>("idle");
  const [progress, setProgress] = useState<EncodeProgress | null>(null);
  const [result, setResult] = useState<EncodeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [engine, setEngine] = useState<EngineChoice | null>(null);
  const [quality, setQuality] = useState<QualityMetrics | null>(null);
  const [qualityStatus, setQualityStatus] = useState<UseEncode["qualityStatus"]>("idle");
  const [qualityError, setQualityError] = useState<string | null>(null);
  const taskRef = useRef<EncodeTask | null>(null);
  const resultRef = useRef<EncodeResult | null>(null);
  const settings = useSettingsStore();

  // Bileşen kaldırılırsa devam eden işi iptal et
  useEffect(() => () => taskRef.current?.cancel(), []);

  const start = useCallback<UseEncode["start"]>(
    async (file, options, probe, enginePref, allowCodecFallback) => {
      taskRef.current?.cancel();
      setStatus("running");
      setProgress({ progress: 0, elapsed: 0, stage: "preparing" });
      setResult(null);
      setError(null);
      setEngine(null);
      setQuality(null);
      setQualityStatus("idle");
      setQualityError(null);

      const task = encodeVideo({
        file,
        options: { ...options, hardware: options.hardware ?? settings.hardware },
        probe,
        engine: enginePref ?? settings.engine,
        outputDir: settings.outputDir || undefined,
        onProgress: setProgress,
        onEngineSelected: setEngine,
        allowCodecFallback,
      });
      taskRef.current = task;
      try {
        const res = await task.promise;
        if (taskRef.current !== task) return null;
        resultRef.current = res;
        setResult(res);
        setStatus("done");
        return res;
      } catch (err) {
        if (taskRef.current !== task) return null;
        if (err instanceof EncodeCanceledError) {
          setStatus("canceled");
        } else {
          setError(err instanceof Error ? err.message : String(err));
          setStatus("error");
        }
        return null;
      } finally {
        if (taskRef.current === task) taskRef.current = null;
      }
    },
    [settings.engine, settings.hardware, settings.outputDir],
  );

  const cancel = useCallback(() => {
    taskRef.current?.cancel();
  }, []);

  const reset = useCallback(() => {
    taskRef.current?.cancel();
    taskRef.current = null;
    resultRef.current = null;
    setStatus("idle");
    setProgress(null);
    setResult(null);
    setError(null);
    setEngine(null);
    setQuality(null);
    setQualityStatus("idle");
    setQualityError(null);
  }, []);

  const measure = useCallback(async (original: File, trimStart = 0) => {
    const res = resultRef.current;
    if (!res) return;
    setQualityStatus("running");
    setQualityError(null);
    try {
      setQuality(await measureQuality(original, res, trimStart));
      setQualityStatus("done");
    } catch (err) {
      setQualityError(err instanceof Error ? err.message : String(err));
      setQualityStatus("error");
    }
  }, []);

  return {
    status,
    progress,
    result,
    error,
    engine,
    quality,
    qualityStatus,
    qualityError,
    start,
    cancel,
    reset,
    measure,
  };
}
