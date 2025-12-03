"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  Download,
  Loader2,
  Settings2,
  Play,
  X,
  Info,
  Film,
  Monitor,
  Zap,
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/lib/i18n/use-translation";
import {
  convertVideo,
  type ConversionProgress,
} from "@/lib/ffmpeg/video-converter";
import {
  isWebCodecsSupported,
  checkHardwareAcceleration,
} from "@/lib/ffmpeg/webcodecs-converter";
import {
  formatFileSize,
  formatDuration,
  formatBitrate,
} from "@/lib/utils/video-detector";

// WebKit-specific video properties
interface HTMLVideoElementWithWebKit extends HTMLVideoElement {
  webkitDecodedFrameCount?: number;
}

interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  bitrate: number;
  codec: string;
  framerate: number;
  thumbnail?: string;
}

export default function ConverterPage() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState<ConversionProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [useWebCodecs, setUseWebCodecs] = useState(false);
  const [hasGpu, setHasGpu] = useState(false);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Conversion settings
  const [codec, setCodec] = useState<"h264" | "h265" | "vp9" | "av1">("h264");
  const [bitrate, setBitrate] = useState<string>("");
  const [crf, setCrf] = useState<string>("23");
  const [quality, setQuality] = useState<string>("");
  const [preset, setPreset] = useState<string>("veryfast"); // Daha hızlı encoding için
  const [width, setWidth] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [framerate, setFramerate] = useState<string>("");
  const [pixelFormat, setPixelFormat] = useState<string>("yuv420p");
  const [profile, setProfile] = useState<string>("high"); // H.264 için high, H.265 için main olacak

  // Codec değiştiğinde profile'ı düzelt
  useEffect(() => {
    if (codec === "h265" && profile === "high") {
      setProfile("main");
    } else if (
      codec === "h264" &&
      (profile === "main" || profile === "main10" || profile === "main12")
    ) {
      setProfile("high");
    }
  }, [codec]);
  const [level, setLevel] = useState<string>("");
  const [keyframeInterval, setKeyframeInterval] = useState<string>("");
  const [twoPass, setTwoPass] = useState<boolean>(false);
  const [tune, setTune] = useState<string>("");
  const [threads, setThreads] = useState<string>("");
  const [bframes, setBframes] = useState<string>("");
  const [refFrames, setRefFrames] = useState<string>("");
  const [meMethod, setMeMethod] = useState<string>("");
  const [subMe, setSubMe] = useState<string>("");
  const [audioBitrate, setAudioBitrate] = useState<string>("128k");
  const [audioCodec, setAudioCodec] = useState<string>("aac");
  const [audioSampleRate, setAudioSampleRate] = useState<string>("");
  const [audioChannels, setAudioChannels] = useState<string>("");
  const [videoFilter, setVideoFilter] = useState<string>("");
  const [deinterlace, setDeinterlace] = useState<boolean>(false);
  const [denoise, setDenoise] = useState<boolean>(false);
  const [cropWidth, setCropWidth] = useState<string>("");
  const [cropHeight, setCropHeight] = useState<string>("");
  const [cropX, setCropX] = useState<string>("");
  const [cropY, setCropY] = useState<string>("");
  const [colorSpace, setColorSpace] = useState<string>("");
  const [colorRange, setColorRange] = useState<string>("");

  // Check WebCodecs support on mount
  useEffect(() => {
    const supported = isWebCodecsSupported();
    setUseWebCodecs(supported);
    if (supported) {
      checkHardwareAcceleration("h264").then(setHasGpu);
    }
  }, []);

  // Extract video metadata when file is selected
  useEffect(() => {
    if (!file) {
      setMetadata(null);
      setVideoPreview(null);
      return;
    }

    const videoUrl = URL.createObjectURL(file);

    // Video preview URL'ini set et
    setVideoPreview(videoUrl);

    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = videoUrl;
    video.muted = true; // Autoplay için muted gerekli

    // Thumbnail oluştur (video preview için)
    const createThumbnail = async () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Video'nun metadata yüklenmesini bekle
        await new Promise<void>((resolve, reject) => {
          const onLoadedMetadata = () => {
            video.removeEventListener("loadedmetadata", onLoadedMetadata);
            video.removeEventListener("error", onError);
            resolve();
          };
          const onError = () => {
            video.removeEventListener("loadedmetadata", onLoadedMetadata);
            video.removeEventListener("error", onError);
            reject(new Error("Video metadata yüklenemedi"));
          };
          video.addEventListener("loadedmetadata", onLoadedMetadata);
          video.addEventListener("error", onError);
          video.load();
        });

        // Video'nun bir frame'ini çek
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          video.currentTime = Math.min(1, video.duration / 4);
          await new Promise<void>((resolve) => {
            const onSeeked = () => {
              video.removeEventListener("seeked", onSeeked);
              resolve();
            };
            video.addEventListener("seeked", onSeeked);
          });

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const thumbnailUrl = URL.createObjectURL(blob);
                // Thumbnail'ı video preview olarak kullan (opsiyonel)
                // setVideoPreview(thumbnailUrl);
              }
            },
            "image/jpeg",
            0.9
          );
        }
      } catch (error) {
        console.warn("Thumbnail oluşturulamadı:", error);
      }
    };

    const handleMetadata = () => {
      const duration = video.duration || 0;
      const width = video.videoWidth || 0;
      const height = video.videoHeight || 0;

      // Estimate bitrate (file size / duration)
      const estimatedBitrate =
        file.size > 0 && duration > 0
          ? Math.round((file.size * 8) / duration)
          : 0;

      // Try to detect framerate
      let detectedFramerate = 30;
      try {
        const webkitVideo = video as HTMLVideoElementWithWebKit;
        if (webkitVideo.webkitDecodedFrameCount && video.duration) {
          detectedFramerate = Math.round(
            webkitVideo.webkitDecodedFrameCount / video.duration
          );
        }
      } catch (e) {
        // Fallback to default
      }

      setMetadata({
        duration,
        width,
        height,
        bitrate: estimatedBitrate,
        codec: "unknown",
        framerate: detectedFramerate,
      });

      // Auto-fill resolution and framerate if empty
      if (width && height) {
        setWidth((prev) => prev || width.toString());
        setHeight((prev) => prev || height.toString());
      }
      setFramerate((prev) => prev || detectedFramerate.toString());

      // Thumbnail oluştur
      createThumbnail();
    };

    video.addEventListener("loadedmetadata", handleMetadata);
    video.addEventListener("error", (e) => {
      console.error("Video metadata extraction failed:", e);
      console.error("Video error:", video.error);
    });

    // Video yüklemesini başlat (sadece bir kez)
    if (video.readyState === 0) {
      video.load();
    }

    return () => {
      video.removeEventListener("loadedmetadata", handleMetadata);
      video.removeEventListener("error", () => {});
      URL.revokeObjectURL(videoUrl);
    };
  }, [file]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        setFile(selectedFile);
        setError(null);
        setOutputBlob(null);
        setProgress(null);
      }
    },
    []
  );

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith("video/")) {
      setFile(droppedFile);
      setError(null);
      setOutputBlob(null);
      setProgress(null);
    }
  }, []);

  const handleConvert = async () => {
    if (!file) return;

    setIsConverting(true);
    setError(null);
    setProgress({ progress: 0, time: 0 });
    setOutputBlob(null);

    try {
      const options = {
        codec,
        bitrate: bitrate || undefined,
        crf: crf ? parseInt(crf) : undefined,
        quality: quality ? parseInt(quality) : undefined,
        preset: preset as any,
        resolution:
          width && height
            ? { width: parseInt(width), height: parseInt(height) }
            : undefined,
        framerate: framerate ? parseFloat(framerate) : undefined,
        pixelFormat: pixelFormat || "yuv420p",
        profile: profile || undefined,
        level: level || undefined,
        keyframeInterval: keyframeInterval
          ? parseInt(keyframeInterval)
          : undefined,
        twoPass: twoPass || undefined,
        tune: tune || undefined,
        threads: threads ? parseInt(threads) : undefined,
        bframes: bframes ? parseInt(bframes) : undefined,
        refFrames: refFrames ? parseInt(refFrames) : undefined,
        meMethod: meMethod || undefined,
        subMe: subMe ? parseInt(subMe) : undefined,
        audioBitrate: audioBitrate || "128k",
        audioCodec: audioCodec || "aac",
        audioSampleRate: audioSampleRate || undefined,
        audioChannels: audioChannels || undefined,
        videoFilter: videoFilter || undefined,
        deinterlace: deinterlace || undefined,
        denoise: denoise || undefined,
        crop:
          cropWidth && cropHeight
            ? {
                width: parseInt(cropWidth),
                height: parseInt(cropHeight),
                x: cropX ? parseInt(cropX) : 0,
                y: cropY ? parseInt(cropY) : 0,
              }
            : undefined,
        colorSpace: colorSpace || undefined,
        colorRange: colorRange || undefined,
      };

      const blob = await convertVideo(
        file,
        options,
        (prog) => {
          setProgress(prog);
        },
        t
      );

      setOutputBlob(blob);
      setProgress({
        progress: 100,
        time: 0,
        message: t("conversion.completed"),
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      console.error("Conversion error:", err);
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = () => {
    if (!outputBlob || !file) return;

    const url = URL.createObjectURL(outputBlob);
    const a = document.createElement("a");
    a.href = url;
    const extension = codec === "vp9" || codec === "av1" ? ".webm" : ".mp4";
    a.download = `${file.name.replace(/\.[^/.]+$/, "")}_converted${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setFile(null);
    setError(null);
    setOutputBlob(null);
    setProgress(null);
    setMetadata(null);
    setVideoPreview(null);
    setBitrate("");
    setCrf("23");
    setQuality("");
    setWidth("");
    setHeight("");
    setFramerate("");
    setPixelFormat("yuv420p");
    setProfile("high");
    setLevel("");
    setKeyframeInterval("");
    setTwoPass(false);
    setTune("");
    setThreads("");
    setBframes("");
    setRefFrames("");
    setMeMethod("");
    setSubMe("");
    setAudioSampleRate("");
    setAudioChannels("");
    setVideoFilter("");
    setDeinterlace(false);
    setDenoise(false);
    setCropWidth("");
    setCropHeight("");
    setCropX("");
    setCropY("");
    setColorSpace("");
    setColorRange("");
  };

  // Codec info
  const codecInfo = {
    h264: {
      name: t("settings.codec.h264.title"),
      description: t("settings.codec.h264.description"),
      advantages: [
        t("settings.codec.h264.adv1"),
        t("settings.codec.h264.adv2"),
        t("settings.codec.h264.adv3"),
      ],
      icon: <Monitor className="h-5 w-5" />,
      color: "text-blue-500",
    },
    h265: {
      name: t("settings.codec.h265.title"),
      description: t("settings.codec.h265.description"),
      advantages: [
        t("settings.codec.h265.adv1"),
        t("settings.codec.h265.adv2"),
        t("settings.codec.h265.adv3"),
      ],
      icon: <Zap className="h-5 w-5" />,
      color: "text-purple-500",
    },
    vp9: {
      name: t("settings.codec.vp9.title"),
      description: t("settings.codec.vp9.description"),
      advantages: [
        t("settings.codec.vp9.adv1"),
        t("settings.codec.vp9.adv2"),
        t("settings.codec.vp9.adv3"),
      ],
      icon: <Film className="h-5 w-5" />,
      color: "text-green-500",
    },
    av1: {
      name: t("settings.codec.av1.title"),
      description: t("settings.codec.av1.description"),
      advantages: [
        t("settings.codec.av1.adv1"),
        t("settings.codec.av1.adv2"),
        t("settings.codec.av1.adv3"),
      ],
      icon: <Zap className="h-5 w-5" />,
      color: "text-orange-500",
    },
  };

  const currentCodecInfo = codecInfo[codec];

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-bold">{t("converter.title")}</h1>
        <p className="text-muted-foreground">{t("converter.subtitle")}</p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - File Upload & Preview */}
        <div className="lg:col-span-1 space-y-6">
          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle>{t("converter.uploadTitle")}</CardTitle>
              <CardDescription>
                {t("converter.uploadDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!file ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
                >
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm font-medium mb-2">
                      {t("converter.dropOrClick")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("converter.supportedFormats")}
                    </p>
                  </label>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Video Preview */}
                  {file && videoPreview && (
                    <div className="relative aspect-video bg-black rounded-lg overflow-hidden group">
                      <video
                        ref={videoRef}
                        src={videoPreview}
                        className="w-full h-full object-contain"
                        controls
                        preload="auto"
                        playsInline
                        muted
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "block",
                          backgroundColor: "#000",
                          minHeight: "200px",
                          objectFit: "contain",
                        }}
                        onError={(e) => {
                          console.error("Video preview error:", e);
                          const target = e.target as HTMLVideoElement;
                          console.error("Video error details:", {
                            error: target.error,
                            networkState: target.networkState,
                            readyState: target.readyState,
                            src: target.src,
                            videoWidth: target.videoWidth,
                            videoHeight: target.videoHeight,
                          });
                        }}
                        onLoadedMetadata={(e) => {
                          const target = e.target as HTMLVideoElement;
                          console.log("Video metadata loaded:", {
                            width: target.videoWidth,
                            height: target.videoHeight,
                            duration: target.duration,
                            readyState: target.readyState,
                          });
                        }}
                        onLoadedData={(e) => {
                          const target = e.target as HTMLVideoElement;
                          console.log("Video data loaded:", {
                            readyState: target.readyState,
                            videoWidth: target.videoWidth,
                            videoHeight: target.videoHeight,
                          });
                          // Video data yüklendiğinde ilk frame'i göster
                          if (
                            target.videoWidth > 0 &&
                            target.videoHeight > 0 &&
                            target.readyState >= 2
                          ) {
                            target.currentTime = 0.1;
                          }
                        }}
                        onCanPlay={(e) => {
                          const target = e.target as HTMLVideoElement;
                          console.log("Video can play:", {
                            videoWidth: target.videoWidth,
                            videoHeight: target.videoHeight,
                          });
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                    </div>
                  )}

                  {/* File Info */}
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleClear}
                      className="shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Video Metadata */}
                  {metadata && (
                    <Card className="bg-muted/50">
                      <CardContent className="pt-4 space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">
                              {t("video.resolution")}:
                            </span>
                            <p className="font-medium">
                              {metadata.width} × {metadata.height}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              {t("video.duration")}:
                            </span>
                            <p className="font-medium">
                              {formatDuration(metadata.duration)}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              {t("video.bitrate")}:
                            </span>
                            <p className="font-medium">
                              {formatBitrate(metadata.bitrate)}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              {t("video.fps")}:
                            </span>
                            <p className="font-medium">
                              {metadata.framerate} fps
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {useWebCodecs && (
                    <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-md">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <p className="text-xs">
                        {hasGpu
                          ? t("converter.gpuAcceleration")
                          : t("conversion.startingCpu")}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Codec Info */}
          {file && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className={currentCodecInfo.color}>
                    {currentCodecInfo.icon}
                  </div>
                  {currentCodecInfo.name}
                </CardTitle>
                <CardDescription>
                  {currentCodecInfo.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("settings.advantages")}
                  </p>
                  <ul className="space-y-1">
                    {currentCodecInfo.advantages.map((adv, idx) => (
                      <li key={idx} className="text-xs flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{adv}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Middle Column - Settings */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                {t("converter.settingsTitle")}
              </CardTitle>
              <CardDescription>
                {t("converter.settingsDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="basic">
                    {t("converter.basic")}
                  </TabsTrigger>
                  <TabsTrigger value="advanced">
                    {t("converter.advanced")}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>{t("video.codec")}</Label>
                    <Select
                      value={codec}
                      onValueChange={(v) => setCodec(v as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="h264">
                          {t("settings.codec.h264.title")}
                        </SelectItem>
                        <SelectItem value="h265">
                          {t("settings.codec.h265.title")}
                        </SelectItem>
                        <SelectItem value="vp9">
                          {t("settings.codec.vp9.title")}
                        </SelectItem>
                        <SelectItem value="av1">
                          {t("settings.codec.av1.title")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {file && (
                      <div className="space-y-2 p-3 bg-muted/50 rounded-md">
                        <div className="flex items-start gap-2">
                          <Info className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
                          <p className="text-xs text-muted-foreground">
                            {currentCodecInfo.description}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">
                            {t("settings.advantages")}
                          </p>
                          <ul className="space-y-0.5 pl-4">
                            {currentCodecInfo.advantages
                              .slice(0, 2)
                              .map((adv, idx) => (
                                <li
                                  key={idx}
                                  className="text-xs text-muted-foreground"
                                >
                                  • {adv}
                                </li>
                              ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>{t("video.preset")}</Label>
                    <Select value={preset} onValueChange={setPreset}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ultrafast">
                          ultrafast - {t("converter.preset.ultrafast")}
                        </SelectItem>
                        <SelectItem value="superfast">
                          superfast - {t("converter.preset.superfast")}
                        </SelectItem>
                        <SelectItem value="veryfast">
                          veryfast - {t("converter.preset.veryfast")}
                        </SelectItem>
                        <SelectItem value="faster">
                          faster - {t("converter.preset.faster")}
                        </SelectItem>
                        <SelectItem value="fast">
                          fast - {t("converter.preset.fast")}
                        </SelectItem>
                        <SelectItem value="medium">
                          medium - {t("converter.preset.medium")}
                        </SelectItem>
                        <SelectItem value="slow">
                          slow - {t("converter.preset.slow")}
                        </SelectItem>
                        <SelectItem value="slower">
                          slower - {t("converter.preset.slower")}
                        </SelectItem>
                        <SelectItem value="veryslow">
                          veryslow - {t("converter.preset.veryslow")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="p-2 bg-muted/50 rounded-md">
                      <p className="text-xs text-muted-foreground">
                        {preset === "ultrafast" ||
                        preset === "superfast" ||
                        preset === "veryfast"
                          ? t("converter.preset.ultrafast.desc")
                          : preset === "faster" || preset === "fast"
                          ? t("converter.preset.fast.desc")
                          : preset === "medium"
                          ? t("converter.preset.medium.desc")
                          : t("converter.preset.slow.desc")}
                      </p>
                    </div>
                  </div>

                  {(codec === "h264" || codec === "h265") && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>{t("video.crf")}</Label>
                        <span className="text-xs text-muted-foreground">
                          {crf && !isNaN(parseInt(crf))
                            ? parseInt(crf) <= 18
                              ? t("converter.crf.lossless")
                              : parseInt(crf) <= 23
                              ? t("converter.crf.high")
                              : parseInt(crf) <= 28
                              ? t("converter.crf.good")
                              : t("converter.crf.low")
                            : ""}
                        </span>
                      </div>
                      <Input
                        type="number"
                        value={crf}
                        onChange={(e) => setCrf(e.target.value)}
                        placeholder="23"
                        min="0"
                        max="51"
                      />
                      <div className="p-2 bg-muted/50 rounded-md space-y-1">
                        <p className="text-xs text-muted-foreground">
                          {t("converter.crfHint")}
                        </p>
                        <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
                          <div>0-18: {t("converter.crf.lossless")}</div>
                          <div>19-23: {t("converter.crf.high")}</div>
                          <div>24-28: {t("converter.crf.good")}</div>
                          <div>29+: {t("converter.crf.low")}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {(codec === "vp9" || codec === "av1") && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>{t("video.quality")}</Label>
                        <span className="text-xs text-muted-foreground">
                          {quality && !isNaN(parseInt(quality))
                            ? parseInt(quality) <= 35
                              ? t("converter.quality.high")
                              : parseInt(quality) <= 40
                              ? t("converter.quality.good")
                              : t("converter.quality.medium")
                            : ""}
                        </span>
                      </div>
                      <Input
                        type="number"
                        value={quality}
                        onChange={(e) => setQuality(e.target.value)}
                        placeholder="30"
                        min="0"
                        max="63"
                      />
                      <div className="p-2 bg-muted/50 rounded-md space-y-1">
                        <p className="text-xs text-muted-foreground">
                          {t("converter.qualityHint")}
                        </p>
                        <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
                          <div>30-35: {t("converter.quality.high")}</div>
                          <div>36-40: {t("converter.quality.good")}</div>
                          <div>41-45: {t("converter.quality.medium")}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>{t("video.bitrate")}</Label>
                    <Input
                      type="text"
                      value={bitrate}
                      onChange={(e) => setBitrate(e.target.value)}
                      placeholder="5M"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("converter.bitrateHint")}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("converter.width")}</Label>
                      <Input
                        type="number"
                        value={width}
                        onChange={(e) => setWidth(e.target.value)}
                        placeholder={metadata?.width.toString() || "1920"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("converter.height")}</Label>
                      <Input
                        type="number"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        placeholder={metadata?.height.toString() || "1080"}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("video.audioCodec")}</Label>
                    <Select value={audioCodec} onValueChange={setAudioCodec}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aac">
                          {t("converter.audioCodec.aac")}
                        </SelectItem>
                        <SelectItem value="libopus">
                          {t("converter.audioCodec.opus")}
                        </SelectItem>
                        <SelectItem value="mp3">
                          {t("converter.audioCodec.mp3")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("video.audioBitrate")}</Label>
                    <Input
                      type="text"
                      value={audioBitrate}
                      onChange={(e) => setAudioBitrate(e.target.value)}
                      placeholder="128k"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t("converter.framerate")}</Label>
                    <Input
                      type="number"
                      value={framerate}
                      onChange={(e) => setFramerate(e.target.value)}
                      placeholder={metadata?.framerate.toString() || "30"}
                      step="0.1"
                      min="1"
                      max="120"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("converter.framerateHint")}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("converter.pixelFormat")}</Label>
                    <Select value={pixelFormat} onValueChange={setPixelFormat}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yuv420p">
                          yuv420p - {t("converter.pixelFormat.yuv420p")}
                        </SelectItem>
                        <SelectItem value="yuv422p">
                          yuv422p - {t("converter.pixelFormat.yuv422p")}
                        </SelectItem>
                        <SelectItem value="yuv444p">
                          yuv444p - {t("converter.pixelFormat.yuv444p")}
                        </SelectItem>
                        <SelectItem value="nv12">
                          nv12 - {t("converter.pixelFormat.nv12")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {t("converter.pixelFormatHint")}
                    </p>
                  </div>

                  {(codec === "h264" || codec === "h265") && (
                    <>
                      <div className="space-y-2">
                        <Label>{t("converter.profile")}</Label>
                        <Select value={profile} onValueChange={setProfile}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {codec === "h264" ? (
                              <>
                                <SelectItem value="baseline">
                                  baseline - {t("converter.profile.baseline")}
                                </SelectItem>
                                <SelectItem value="main">
                                  main - {t("converter.profile.main")}
                                </SelectItem>
                                <SelectItem value="high">
                                  high - {t("converter.profile.high")}
                                </SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="main">
                                  main - {t("converter.profile.main")}
                                </SelectItem>
                                <SelectItem value="main10">
                                  main10 - {t("converter.profile.main10")}
                                </SelectItem>
                                <SelectItem value="main12">
                                  main12 - {t("converter.profile.main12")}
                                </SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {t("converter.profileHint")}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>{t("converter.level")}</Label>
                        <Input
                          type="text"
                          value={level}
                          onChange={(e) => setLevel(e.target.value)}
                          placeholder="4.0"
                        />
                        <p className="text-xs text-muted-foreground">
                          {t("converter.levelHint")}
                        </p>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label>{t("converter.keyframeInterval")}</Label>
                    <Input
                      type="number"
                      value={keyframeInterval}
                      onChange={(e) => setKeyframeInterval(e.target.value)}
                      placeholder="250"
                      min="1"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("converter.keyframeIntervalHint")}
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              <Button
                onClick={handleConvert}
                disabled={!file || isConverting}
                className="w-full"
                size="lg"
              >
                {isConverting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {progress?.progress
                      ? `${Math.round(progress.progress)}%`
                      : t("conversion.starting")}
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    {t("converter.convert")}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Progress & Output */}
        <div className="lg:col-span-1 space-y-6">
          {/* Progress */}
          {isConverting && progress && (
            <Card>
              <CardHeader>
                <CardTitle>{t("converter.progress")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{progress.message || t("conversion.encoding")}</span>
                    <span>{Math.round(progress.progress)}%</span>
                  </div>
                  <Progress value={progress.progress} />
                  {progress.speed && (
                    <p className="text-xs text-muted-foreground">
                      {t("converter.speed")}: {progress.speed}
                    </p>
                  )}
                  {progress.framesEncoded && progress.totalFrames && (
                    <p className="text-xs text-muted-foreground">
                      {progress.framesEncoded} / {progress.totalFrames}{" "}
                      {t("converter.frames")}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error */}
          {error && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">
                  {t("conversion.error")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Output */}
          {outputBlob && (
            <Card>
              <CardHeader>
                <CardTitle>{t("converter.output")}</CardTitle>
                <CardDescription>
                  {formatFileSize(outputBlob.size)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleDownload} className="w-full" size="lg">
                  <Download className="mr-2 h-4 w-4" />
                  {t("converter.download")}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
