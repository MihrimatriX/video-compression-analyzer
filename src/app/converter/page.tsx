"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Copy,
  Cpu,
  Film,
  Loader2,
  Music,
  Play,
  Scissors,
  Target,
  Upload,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Choice, Field, Segmented, Toggle } from "@/components/converter/fields";
import { ConversionStatus } from "@/components/conversion/ConversionStatus";
import { useEncode } from "@/hooks/use-encode";
import { useDesktop } from "@/hooks/use-desktop";
import { useTranslation } from "@/lib/i18n/use-translation";
import { useVideoStore } from "@/lib/store/video-store";
import { useSettingsStore } from "@/lib/store/settings-store";
import {
  ENGINE_LABELS,
  bitrateForTargetSize,
  buildFFmpegArgs,
  formatCommand,
  getCodecRoutes,
  outputFileName,
  probeFile,
  type AudioOnlyFormat,
  type CodecRoute,
  type EncodeOptions,
  type EnginePreference,
  type OutputContainer,
  type ProbeResult,
  type TargetVideoCodec,
} from "@/lib/engine";
import { formatBitrate, formatDuration, formatFileSize } from "@/lib/utils/video-detector";
import { shortSideScale } from "@/lib/utils/recommendation-options";

type RateMode = "target-size" | "crf" | "bitrate";

const SIZE_PRESETS: { label: string; mb: number }[] = [
  { label: "Discord 10 MB", mb: 10 },
  { label: "WhatsApp 16 MB", mb: 16 },
  { label: "E-posta 25 MB", mb: 25 },
  { label: "Discord Nitro 50 MB", mb: 50 },
  { label: "100 MB", mb: 100 },
];

const HEIGHTS = ["original", "2160", "1440", "1080", "720", "480", "360"];
const PRESETS = ["ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow"] as const;
const DEFAULT_CRF: Record<TargetVideoCodec, number> = { h264: 23, h265: 28, vp9: 33, av1: 34 };
const CRF_MAX: Record<TargetVideoCodec, number> = { h264: 51, h265: 51, vp9: 63, av1: 63 };

function toNumber(value: string): number | undefined {
  const n = Number(value);
  return value.trim() !== "" && Number.isFinite(n) ? n : undefined;
}

function parseTime(value: string): number | undefined {
  const v = value.trim();
  if (!v) return undefined;
  if (v.includes(":")) {
    const parts = v.split(":").map(Number);
    if (parts.some((p) => !Number.isFinite(p))) return undefined;
    return parts.reduce((acc, p) => acc * 60 + p, 0);
  }
  return toNumber(v);
}

function formatClock(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const ss = s.toFixed(2).padStart(5, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

export default function ConverterPage() {
  const { t } = useTranslation();
  const desktop = useDesktop();
  const encode = useEncode();
  const { converterFile, setConverterFile } = useVideoStore();
  const settingsEngine = useSettingsStore((s) => s.engine);

  const [file, setFile] = useState<File | null>(null);
  const [probe, setProbe] = useState<ProbeResult | null>(null);
  const [probeError, setProbeError] = useState<string | null>(null);
  const [probing, setProbing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [routes, setRoutes] = useState<Record<TargetVideoCodec, CodecRoute> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [copied, setCopied] = useState(false);

  // --- Ayarlar ---
  const [outputKind, setOutputKind] = useState<"video" | "audio">("video");
  const [codec, setCodec] = useState<TargetVideoCodec>("h264");
  const [container, setContainer] = useState<"auto" | OutputContainer>("auto");
  const [rateMode, setRateMode] = useState<RateMode>("crf");
  const [targetMb, setTargetMb] = useState("25");
  const [crf, setCrf] = useState(DEFAULT_CRF.h264);
  const [bitrateKbps, setBitrateKbps] = useState("4000");
  const [height, setHeight] = useState("original");
  const [fps, setFps] = useState("original");
  const [preset, setPreset] = useState<string>("medium");
  const [audioMode, setAudioMode] = useState<"encode" | "copy" | "none">("encode");
  const [audioBitrate, setAudioBitrate] = useState("128");
  const [audioOnly, setAudioOnly] = useState<AudioOnlyFormat>("m4a");
  const [trimStart, setTrimStart] = useState("");
  const [trimEnd, setTrimEnd] = useState("");
  const [engine, setEngine] = useState<EnginePreference>(settingsEngine);
  const [hardware, setHardware] = useState<"auto" | "prefer" | "off">("auto");

  // Gelişmiş
  const [pixelFormat, setPixelFormat] = useState("yuv420p");
  const [profile, setProfile] = useState("auto");
  const [level, setLevel] = useState("");
  const [tune, setTune] = useState("none");
  const [keyframe, setKeyframe] = useState("");
  const [bframes, setBframes] = useState("");
  const [refFrames, setRefFrames] = useState("");
  const [threads, setThreads] = useState("");
  const [deinterlace, setDeinterlace] = useState(false);
  const [denoise, setDenoise] = useState(false);
  const [rotate, setRotate] = useState("0");
  const [crop, setCrop] = useState({ w: "", h: "", x: "", y: "" });
  const [videoFilter, setVideoFilter] = useState("");
  const [twoPass, setTwoPass] = useState(false);
  const [stripMetadata, setStripMetadata] = useState(false);

  useEffect(() => {
    getCodecRoutes().then(setRoutes).catch(() => setRoutes(null));
  }, []);

  // Analiz sayfasından gelen dosya
  useEffect(() => {
    if (converterFile) {
      setFile(converterFile);
      setConverterFile(null);
    }
  }, [converterFile, setConverterFile]);

  // Dosya değişince önizleme + gerçek analiz
  useEffect(() => {
    if (!file) {
      setProbe(null);
      setPreviewUrl(null);
      return;
    }
    encode.reset();
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setProbe(null);
    setProbeError(null);
    setProbing(true);
    let alive = true;
    probeFile(file)
      .then((p) => alive && setProbe(p))
      .catch((e) => alive && setProbeError(e instanceof Error ? e.message : String(e)))
      .finally(() => alive && setProbing(false));
    return () => {
      alive = false;
      URL.revokeObjectURL(url);
    };
    // encode.reset stabil
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const handleFiles = useCallback((files: FileList | null) => {
    const f = files?.[0];
    if (f) setFile(f);
  }, []);

  const duration = probe?.duration ?? 0;
  const shortSide = probe?.video ? Math.min(probe.video.width, probe.video.height) : 0;
  const start = parseTime(trimStart);
  const end = parseTime(trimEnd);
  const outDuration = Math.max(0, Math.min(duration, end ?? duration) - (start ?? 0));

  const options = useMemo<EncodeOptions>(() => {
    const opts: EncodeOptions = {
      codec,
      container: container === "auto" ? undefined : container,
      rate:
        rateMode === "target-size"
          ? { mode: "target-size", bytes: (toNumber(targetMb) ?? 25) * 1024 * 1024 }
          : rateMode === "bitrate"
            ? { mode: "bitrate", bitrate: (toNumber(bitrateKbps) ?? 4000) * 1000 }
            : { mode: "crf", crf },
      preset,
      // "720p" = kısa kenar 720 (dikey videolarda genişlik)
      ...(height !== "original" && probe?.video ? shortSideScale(probe.video, Number(height)) : {}),
      frameRate: fps === "original" ? undefined : Number(fps),
      trim: start !== undefined || end !== undefined ? { start, end } : undefined,
      audio:
        audioMode === "none"
          ? { mode: "none" }
          : audioMode === "copy"
            ? { mode: "copy" }
            : { mode: "encode", bitrate: (toNumber(audioBitrate) ?? 128) * 1000 },
      audioOnly: outputKind === "audio" ? audioOnly : undefined,
      hardware,
      fastStart: true,
      stripMetadata: stripMetadata || undefined,
      pixelFormat: pixelFormat !== "yuv420p" ? pixelFormat : undefined,
      profile: profile !== "auto" ? profile : undefined,
      level: level || undefined,
      tune: tune !== "none" ? tune : undefined,
      keyframeInterval: toNumber(keyframe),
      bframes: toNumber(bframes),
      refFrames: toNumber(refFrames),
      threads: toNumber(threads),
      deinterlace: deinterlace || undefined,
      denoise: denoise || undefined,
      rotate: rotate !== "0" ? (Number(rotate) as 90 | 180 | 270) : undefined,
      videoFilter: videoFilter.trim() || undefined,
      twoPass: twoPass || undefined,
    };
    const cw = toNumber(crop.w);
    const ch = toNumber(crop.h);
    if (cw && ch) opts.crop = { width: cw, height: ch, x: toNumber(crop.x) ?? 0, y: toNumber(crop.y) ?? 0 };
    return opts;
  }, [
    codec, container, rateMode, targetMb, bitrateKbps, crf, preset, height, probe, fps, start, end,
    audioMode, audioBitrate, outputKind, audioOnly, hardware, stripMetadata, pixelFormat, profile,
    level, tune, keyframe, bframes, refFrames, threads, deinterlace, denoise, rotate, crop,
    videoFilter, twoPass,
  ]);

  const command = useMemo(() => {
    if (!file) return "";
    try {
      const built = buildFFmpegArgs(options, {
        input: file.name,
        output: outputFileName(file.name, options),
        duration: duration || 60,
        target: "native",
        softwareEncoders: ["libsvtav1"],
        passLogFile: "ffmpeg2pass",
      });
      // Görüntüleme için sadece uygulama içi bayrakları çıkar
      const hidden = new Set(["-nostdin"]);
      return built.passes
        .map((p) =>
          formatCommand(p.filter((a, i) => !hidden.has(a) && !(a === "-loglevel" || p[i - 1] === "-loglevel"))),
        )
        .join(" && \\\n  ");
    } catch (e) {
      return `# ${e instanceof Error ? e.message : e}`;
    }
  }, [file, options, duration]);

  const targetInfo = useMemo(() => {
    if (rateMode !== "target-size" || !outDuration) return null;
    const bytes = (toNumber(targetMb) ?? 25) * 1024 * 1024;
    const audio = audioMode === "none" ? 0 : (toNumber(audioBitrate) ?? 128) * 1000;
    const vb = bitrateForTargetSize(bytes, outDuration, audio);
    // Çıktı piksel sayısı: kısa kenar hedefi ve en-boy oranından
    const srcW = probe?.video?.width ?? 1920;
    const srcH = probe?.video?.height ?? 1080;
    const scale = height === "original" ? 1 : Math.min(1, Number(height) / Math.min(srcW, srcH));
    const w = srcW * scale;
    const h = srcH * scale;
    const bpp = vb / (w * h * (probe?.video?.frameRate || 30));
    return { vb, bpp, tooLow: bpp < 0.03, larger: file ? bytes >= file.size : false };
  }, [rateMode, outDuration, targetMb, audioMode, audioBitrate, height, probe, file]);

  const setCodecAndDefaults = (c: TargetVideoCodec) => {
    setCodec(c);
    setCrf(DEFAULT_CRF[c]);
    if (c === "h265" && profile === "high") setProfile("auto");
  };

  const routeBadge = (c: TargetVideoCodec) => {
    const r = routes?.[c];
    if (!r) return null;
    const label = r === "unsupported" ? t("enc.route.unsupported") : r === "webcodecs" ? "GPU" : r === "native" ? t("enc.route.native") : "WASM";
    return (
      <span className={`ml-1 rounded px-1 text-[9px] ${r === "unsupported" ? "bg-destructive/15 text-destructive" : r === "ffmpeg-wasm" ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400" : "bg-green-500/15 text-green-700 dark:text-green-400"}`}>
        {label}
      </span>
    );
  };

  const takeCurrentTime = (which: "start" | "end") => {
    const tNow = videoRef.current?.currentTime;
    if (tNow === undefined) return;
    (which === "start" ? setTrimStart : setTrimEnd)(tNow.toFixed(2));
  };

  const handleConvert = () => {
    if (!file) return;
    void encode.start(file, options, probe ?? undefined, engine);
  };

  const running = encode.status === "running";

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-4 py-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h1 className="text-3xl font-bold">{t("converter.title")}</h1>
        <p className="text-muted-foreground">{t("enc.converterSubtitle")}</p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Sol: dosya, önizleme, analiz, kırpma */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("converter.uploadTitle")}</CardTitle>
              <CardDescription>{t("enc.uploadHint")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!file ? (
                <label
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFiles(e.dataTransfer.files);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  className="block cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors hover:border-primary"
                >
                  <input
                    type="file"
                    accept="video/*,audio/*,.mkv,.avi,.flv,.wmv,.ts,.mts,.m2ts,.3gp"
                    className="hidden"
                    data-testid="converter-file"
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                  <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="text-sm font-medium">{t("converter.dropOrClick")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t("converter.supportedFormats")}</p>
                </label>
              ) : (
                <div className="space-y-3">
                  {previewUrl && (
                    <video
                      ref={videoRef}
                      src={previewUrl}
                      controls
                      playsInline
                      className="aspect-video w-full rounded-md bg-black"
                    />
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium" title={file.name}>{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setFile(null)} disabled={running}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {probing && (
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> {t("common.analyzing")}
                    </p>
                  )}
                  {probeError && <p className="text-xs text-destructive">{probeError}</p>}
                  {probe && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-md bg-muted/40 p-3 text-xs">
                      <span className="text-muted-foreground">{t("enc.container")}</span>
                      <span className="font-medium">{probe.container}</span>
                      <span className="text-muted-foreground">{t("enc.duration")}</span>
                      <span className="font-medium">{formatDuration(probe.duration)}</span>
                      {probe.video && (
                        <>
                          <span className="text-muted-foreground">{t("video.codec")}</span>
                          <span className="font-medium">
                            {probe.video.codecLabel}
                            {probe.video.hdr && <Badge className="ml-1 h-4 px-1 text-[9px]">HDR</Badge>}
                          </span>
                          <span className="text-muted-foreground">{t("video.resolution")}</span>
                          <span className="font-medium">{probe.video.width} × {probe.video.height}</span>
                          <span className="text-muted-foreground">{t("video.fps")}</span>
                          <span className="font-medium">
                            {probe.video.frameRate.toFixed(2)}
                            {probe.video.variableFrameRate && " (VFR)"}
                          </span>
                          <span className="text-muted-foreground">{t("enc.videoBitrate")}</span>
                          <span className="font-medium">{formatBitrate(probe.video.bitrate ?? probe.bitrate)}</span>
                        </>
                      )}
                      {probe.audio && (
                        <>
                          <span className="text-muted-foreground">{t("video.audioCodec")}</span>
                          <span className="font-medium">
                            {probe.audio.codecLabel} • {probe.audio.channels}ch • {(probe.audio.sampleRate / 1000).toFixed(1)} kHz
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {file && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Scissors className="h-4 w-4" /> {t("enc.trim")}
                </CardTitle>
                <CardDescription>{t("enc.trimHint")}</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Field label={t("enc.trimStart")}>
                  <div className="flex gap-1">
                    <Input value={trimStart} onChange={(e) => setTrimStart(e.target.value)} placeholder="0:00" className="h-9" />
                    <Button variant="outline" size="sm" className="h-9 px-2 text-[11px]" onClick={() => takeCurrentTime("start")}>
                      {t("enc.now")}
                    </Button>
                  </div>
                </Field>
                <Field label={t("enc.trimEnd")}>
                  <div className="flex gap-1">
                    <Input value={trimEnd} onChange={(e) => setTrimEnd(e.target.value)} placeholder={duration ? formatClock(duration) : "—"} className="h-9" />
                    <Button variant="outline" size="sm" className="h-9 px-2 text-[11px]" onClick={() => takeCurrentTime("end")}>
                      {t("enc.now")}
                    </Button>
                  </div>
                </Field>
                {(start !== undefined || end !== undefined) && duration > 0 && (
                  <p className="col-span-2 text-xs text-muted-foreground">
                    {t("enc.outputDuration")}: <b>{formatDuration(outDuration)}</b>
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sağ: ayarlar */}
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("converter.settingsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <Segmented
                value={outputKind}
                onChange={setOutputKind}
                options={[
                  { value: "video", label: <span className="flex items-center justify-center gap-1"><Film className="h-3.5 w-3.5" />{t("enc.outputVideo")}</span> },
                  { value: "audio", label: <span className="flex items-center justify-center gap-1"><Music className="h-3.5 w-3.5" />{t("enc.outputAudio")}</span> },
                ]}
              />

              {outputKind === "audio" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t("enc.audioFormat")}>
                    <Choice
                      value={audioOnly}
                      onChange={(v) => setAudioOnly(v as AudioOnlyFormat)}
                      options={[
                        { value: "m4a", label: "M4A (AAC)" },
                        { value: "opus", label: "Ogg (Opus)" },
                        { value: "mp3", label: "MP3" },
                        { value: "wav", label: "WAV (PCM)" },
                      ]}
                    />
                  </Field>
                  {audioOnly !== "wav" && (
                    <Field label={t("video.audioBitrate")}>
                      <Choice
                        value={audioBitrate}
                        onChange={setAudioBitrate}
                        options={["64", "96", "128", "192", "256", "320"].map((v) => ({ value: v, label: `${v} kbps` }))}
                      />
                    </Field>
                  )}
                </div>
              ) : (
                <Tabs defaultValue="basic">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="basic">{t("converter.basic")}</TabsTrigger>
                    <TabsTrigger value="advanced">{t("converter.advanced")}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="mt-4 space-y-5">
                    <Field label={t("video.codec")}>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {(["h264", "h265", "vp9", "av1"] as TargetVideoCodec[]).map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setCodecAndDefaults(c)}
                            disabled={routes?.[c] === "unsupported"}
                            className={`rounded-md border px-2 py-2 text-left text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${codec === c ? "border-primary bg-primary/10" : "hover:bg-muted"}`}
                          >
                            <span className="font-semibold">{c === "h264" ? "H.264" : c === "h265" ? "H.265" : c.toUpperCase()}</span>
                            {routeBadge(c)}
                            <span className="mt-0.5 block text-[10px] text-muted-foreground">{t(`enc.codecHint.${c}`)}</span>
                          </button>
                        ))}
                      </div>
                    </Field>

                    <Field label={t("enc.rateControl")}>
                      <Segmented
                        value={rateMode}
                        onChange={setRateMode}
                        options={[
                          { value: "crf", label: t("enc.rate.crf") },
                          { value: "target-size", label: <span className="flex items-center justify-center gap-1"><Target className="h-3 w-3" />{t("enc.rate.size")}</span> },
                          { value: "bitrate", label: t("enc.rate.bitrate") },
                        ]}
                      />
                    </Field>

                    {rateMode === "crf" && (
                      <Field
                        label={`${t("video.crf")} ${crf}`}
                        hint={t("enc.crfHint", { def: DEFAULT_CRF[codec] })}
                      >
                        <input
                          type="range"
                          min={0}
                          max={CRF_MAX[codec]}
                          value={crf}
                          onChange={(e) => setCrf(Number(e.target.value))}
                          className="w-full accent-[var(--primary)]"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>{t("converter.crf.lossless")}</span>
                          <span>{t("converter.crf.low")}</span>
                        </div>
                      </Field>
                    )}

                    {rateMode === "target-size" && (
                      <Field label={t("enc.targetSize")} hint={t("enc.targetSizeHint")}>
                        <div className="flex flex-wrap gap-1.5">
                          {SIZE_PRESETS.map((p) => (
                            <button
                              key={p.mb}
                              type="button"
                              onClick={() => setTargetMb(String(p.mb))}
                              className={`rounded-full border px-2.5 py-1 text-[11px] ${Number(targetMb) === p.mb ? "border-primary bg-primary/10" : "hover:bg-muted"}`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <Input type="number" min={1} value={targetMb} onChange={(e) => setTargetMb(e.target.value)} className="h-9 w-28" />
                          <span className="text-xs text-muted-foreground">MB</span>
                        </div>
                        {targetInfo && (
                          <p className={`text-[11px] ${targetInfo.tooLow ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                            {t("enc.targetBitrate")}: <b>{formatBitrate(targetInfo.vb)}</b>
                            {targetInfo.tooLow && ` — ${t("enc.targetTooLow")}`}
                            {targetInfo.larger && ` — ${t("enc.targetLarger")}`}
                          </p>
                        )}
                      </Field>
                    )}

                    {rateMode === "bitrate" && (
                      <Field label={`${t("enc.videoBitrate")} (kbps)`} hint={t("converter.bitrateHint")}>
                        <Input type="number" min={100} value={bitrateKbps} onChange={(e) => setBitrateKbps(e.target.value)} className="h-9" />
                      </Field>
                    )}

                    <div className="grid gap-4 sm:grid-cols-3">
                      <Field label={t("video.resolution")}>
                        <Choice
                          value={height}
                          onChange={setHeight}
                          options={HEIGHTS.map((h) => ({
                            value: h,
                            label: h === "original" ? `${t("enc.original")}${shortSide ? ` (${shortSide}p)` : ""}` : `${h}p`,
                            disabled: h !== "original" && !!shortSide && Number(h) > shortSide,
                          }))}
                        />
                      </Field>
                      <Field label={t("video.fps")}>
                        <Choice
                          value={fps}
                          onChange={setFps}
                          options={["original", "60", "30", "25", "24", "15"].map((v) => ({
                            value: v,
                            label: v === "original" ? t("enc.original") : `${v} fps`,
                          }))}
                        />
                      </Field>
                      <Field label={t("video.preset")}>
                        <Choice
                          value={preset}
                          onChange={setPreset}
                          options={PRESETS.map((p) => ({ value: p, label: t(`converter.preset.${p}`) }))}
                        />
                      </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={t("enc.audio")}>
                        <Choice
                          value={audioMode}
                          onChange={(v) => setAudioMode(v as typeof audioMode)}
                          options={[
                            { value: "encode", label: t("enc.audio.encode") },
                            { value: "copy", label: t("enc.audio.copy") },
                            { value: "none", label: t("enc.audio.none") },
                          ]}
                        />
                      </Field>
                      {audioMode === "encode" && (
                        <Field label={t("video.audioBitrate")}>
                          <Choice
                            value={audioBitrate}
                            onChange={setAudioBitrate}
                            options={["64", "96", "128", "160", "192", "256"].map((v) => ({ value: v, label: `${v} kbps` }))}
                          />
                        </Field>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="advanced" className="mt-4 space-y-4">
                    <p className="rounded-md bg-muted/50 p-2 text-[11px] text-muted-foreground">{t("enc.advancedNote")}</p>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <Field label={t("enc.container")}>
                        <Choice
                          value={container}
                          onChange={(v) => setContainer(v as typeof container)}
                          options={[
                            { value: "auto", label: t("enc.auto") },
                            { value: "mp4", label: "MP4" },
                            { value: "mkv", label: "MKV" },
                            { value: "mov", label: "MOV" },
                            { value: "webm", label: "WebM", disabled: codec === "h264" || codec === "h265" },
                          ]}
                        />
                      </Field>
                      <Field label={t("converter.pixelFormat")}>
                        <Choice
                          value={pixelFormat}
                          onChange={setPixelFormat}
                          options={["yuv420p", "yuv420p10le", "yuv422p", "yuv444p"].map((v) => ({ value: v, label: v }))}
                        />
                      </Field>
                      <Field label={t("converter.profile")}>
                        <Choice
                          value={profile}
                          onChange={setProfile}
                          options={[
                            { value: "auto", label: t("enc.auto") },
                            ...(codec === "h264"
                              ? ["baseline", "main", "high"]
                              : codec === "h265"
                                ? ["main", "main10"]
                                : []
                            ).map((v) => ({ value: v, label: v })),
                          ]}
                        />
                      </Field>
                      <Field label={t("converter.tune")}>
                        <Choice
                          value={tune}
                          onChange={setTune}
                          options={["none", "film", "animation", "grain", "stillimage", "fastdecode", "zerolatency"].map((v) => ({
                            value: v,
                            label: t(`converter.tune.${v}` as "converter.tune.none"),
                          }))}
                        />
                      </Field>
                      <Field label={t("converter.level")}>
                        <Input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="4.1" className="h-9" />
                      </Field>
                      <Field label={t("enc.keyframeSeconds")}>
                        <Input type="number" value={keyframe} onChange={(e) => setKeyframe(e.target.value)} placeholder="2" className="h-9" />
                      </Field>
                      <Field label={t("converter.bframes")}>
                        <Input type="number" value={bframes} onChange={(e) => setBframes(e.target.value)} placeholder="3" className="h-9" />
                      </Field>
                      <Field label={t("converter.refFrames")}>
                        <Input type="number" value={refFrames} onChange={(e) => setRefFrames(e.target.value)} placeholder="3" className="h-9" />
                      </Field>
                      <Field label={t("converter.threads")}>
                        <Input type="number" value={threads} onChange={(e) => setThreads(e.target.value)} placeholder="0" className="h-9" />
                      </Field>
                      <Field label={t("enc.rotate")}>
                        <Choice value={rotate} onChange={setRotate} options={["0", "90", "180", "270"].map((v) => ({ value: v, label: `${v}°` }))} />
                      </Field>
                    </div>

                    <Field label={t("converter.crop")} hint={t("converter.cropHint")}>
                      <div className="grid grid-cols-4 gap-2">
                        {(["w", "h", "x", "y"] as const).map((k) => (
                          <Input
                            key={k}
                            type="number"
                            placeholder={k === "w" ? t("converter.cropWidth") : k === "h" ? t("converter.cropHeight") : k.toUpperCase()}
                            value={crop[k]}
                            onChange={(e) => setCrop((c) => ({ ...c, [k]: e.target.value }))}
                            className="h-9"
                          />
                        ))}
                      </div>
                    </Field>

                    <Field label={t("converter.videoFilter")} hint={t("converter.videoFilterHint")}>
                      <Input value={videoFilter} onChange={(e) => setVideoFilter(e.target.value)} placeholder="eq=contrast=1.1" className="h-9 font-mono text-xs" />
                    </Field>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <Toggle checked={deinterlace} onChange={setDeinterlace} label={t("converter.deinterlace")} hint={t("converter.deinterlaceHint")} />
                      <Toggle checked={denoise} onChange={setDenoise} label={t("converter.denoise")} hint={t("converter.denoiseHint")} />
                      <Toggle checked={twoPass} onChange={setTwoPass} label={t("enc.twoPass")} hint={t("enc.twoPassHint")} />
                      <Toggle checked={stripMetadata} onChange={setStripMetadata} label={t("enc.stripMetadata")} hint={t("enc.stripMetadataHint")} />
                    </div>
                  </TabsContent>
                </Tabs>
              )}

              <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
                <Field label={<span className="flex items-center gap-1"><Cpu className="h-3 w-3" />{t("enc.engine")}</span>}>
                  <Choice
                    value={engine}
                    onChange={(v) => setEngine(v as EnginePreference)}
                    options={
                      desktop
                        ? [{ value: "auto", label: `${t("enc.auto")} (${ENGINE_LABELS.native})` }, { value: "native", label: ENGINE_LABELS.native }]
                        : [
                            { value: "auto", label: t("enc.auto") },
                            { value: "webcodecs", label: ENGINE_LABELS.webcodecs },
                            { value: "ffmpeg-wasm", label: ENGINE_LABELS["ffmpeg-wasm"] },
                          ]
                    }
                  />
                </Field>
                <Field label={t("enc.hardware")}>
                  <Choice
                    value={hardware}
                    onChange={(v) => setHardware(v as typeof hardware)}
                    options={[
                      { value: "auto", label: t("enc.auto") },
                      { value: "prefer", label: t("enc.hardware.prefer") },
                      { value: "off", label: t("enc.hardware.off") },
                    ]}
                  />
                </Field>
              </div>

              <Button className="w-full" size="lg" onClick={handleConvert} disabled={!file || running || probing} data-testid="convert-button">
                {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                {running ? t("enc.encoding") : t("converter.convert")}
              </Button>

              {file && <ConversionStatus encode={encode} originalFile={file} trimStart={start ?? 0} />}
            </CardContent>
          </Card>

          {file && command && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  {t("enc.equivalentCommand")}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      await navigator.clipboard.writeText(command);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </CardTitle>
                <CardDescription>{t("enc.equivalentCommandHint")}</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 font-mono text-[11px]">{command}</pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
