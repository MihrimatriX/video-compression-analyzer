"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useVideoStore } from "@/lib/store/video-store";
import { useTranslation } from "@/lib/i18n/use-translation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft,
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  GitCompare,
  Upload,
  X,
  Volume2,
  VolumeX,
} from "lucide-react";
import Link from "next/link";
import { useDropzone } from "react-dropzone";
import type { VideoFile } from "@/lib/types/video";

export default function ComparePage() {
  const { videos } = useVideoStore();
  const { t } = useTranslation();
  const [selectedVideo1, setSelectedVideo1] = useState<File | null>(null);
  const [selectedVideo2, setSelectedVideo2] = useState<File | null>(null);
  const [selectedVideo1Name, setSelectedVideo1Name] = useState<string>("");
  const [selectedVideo2Name, setSelectedVideo2Name] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom1, setZoom1] = useState(1);
  const [zoom2, setZoom2] = useState(1);
  const [pan1, setPan1] = useState({ x: 0, y: 0 });
  const [pan2, setPan2] = useState({ x: 0, y: 0 });
  const [isDragging1, setIsDragging1] = useState(false);
  const [isDragging2, setIsDragging2] = useState(false);
  const [dragStart1, setDragStart1] = useState({ x: 0, y: 0 });
  const [dragStart2, setDragStart2] = useState({ x: 0, y: 0 });
  const [splitPosition, setSplitPosition] = useState(50); // Percentage
  const [isResizing, setIsResizing] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSynced, setIsSynced] = useState(true);
  const [syncZoomPan, setSyncZoomPan] = useState(true); // Sync zoom and pan
  const [isMuted, setIsMuted] = useState(false);

  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);
  const container1Ref = useRef<HTMLDivElement>(null);
  const container2Ref = useRef<HTMLDivElement>(null);

  const completedVideos = videos.filter((v) => v.analysis);

  // Video URL state
  const [video1Url, setVideo1Url] = useState<string | null>(null);
  const [video2Url, setVideo2Url] = useState<string | null>(null);

  // Create and cleanup video URLs
  // Blob URL'ler tarayıcı tarafından oluşturulan geçici URL'lerdir (blob:http://localhost:3000/...)
  // Bu normal bir durumdur ve güvenlik için gereklidir
  useEffect(() => {
    if (!selectedVideo1) {
      if (video1Url) {
        URL.revokeObjectURL(video1Url);
        setVideo1Url(null);
      }
      return;
    }

    const newUrl = URL.createObjectURL(selectedVideo1);

    // Eski URL'yi temizle
    if (video1Url) {
      URL.revokeObjectURL(video1Url);
    }

    setVideo1Url(newUrl);

    return () => {
      URL.revokeObjectURL(newUrl);
    };
  }, [selectedVideo1]);

  useEffect(() => {
    if (!selectedVideo2) {
      if (video2Url) {
        URL.revokeObjectURL(video2Url);
        setVideo2Url(null);
      }
      return;
    }

    const newUrl = URL.createObjectURL(selectedVideo2);

    // Eski URL'yi temizle
    if (video2Url) {
      URL.revokeObjectURL(video2Url);
    }

    setVideo2Url(newUrl);

    return () => {
      URL.revokeObjectURL(newUrl);
    };
  }, [selectedVideo2]);

  // File drop handlers with format validation
  const onDrop1 = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.type.startsWith("video/")) {
        // Video format kontrolü
        const supportedTypes = [
          "video/mp4",
          "video/webm",
          "video/ogg",
          "video/quicktime",
          "video/x-msvideo",
        ];

        if (
          !supportedTypes.includes(file.type) &&
          !file.name.match(/\.(mp4|webm|ogg|mov|avi)$/i)
        ) {
          console.warn(
            "Video formatı desteklenmeyebilir:",
            file.type,
            file.name
          );
        }

        console.log("Video 1 seçildi:", {
          name: file.name,
          type: file.type,
          size: file.size,
        });

        setSelectedVideo1(file);
        setSelectedVideo1Name(file.name);
      } else {
        console.error("Video dosyası değil:", file.type);
      }
    }
  }, []);

  const onDrop2 = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.type.startsWith("video/")) {
        // Video format kontrolü
        const supportedTypes = [
          "video/mp4",
          "video/webm",
          "video/ogg",
          "video/quicktime",
          "video/x-msvideo",
        ];

        if (
          !supportedTypes.includes(file.type) &&
          !file.name.match(/\.(mp4|webm|ogg|mov|avi)$/i)
        ) {
          console.warn(
            "Video formatı desteklenmeyebilir:",
            file.type,
            file.name
          );
        }

        console.log("Video 2 seçildi:", {
          name: file.name,
          type: file.type,
          size: file.size,
        });

        setSelectedVideo2(file);
        setSelectedVideo2Name(file.name);
      } else {
        console.error("Video dosyası değil:", file.type);
      }
    }
  }, []);

  const {
    getRootProps: getRootProps1,
    getInputProps: getInputProps1,
    isDragActive: isDragActive1,
  } = useDropzone({
    onDrop: onDrop1,
    accept: { "video/*": [] },
    multiple: false,
    noClick: false,
  });

  const {
    getRootProps: getRootProps2,
    getInputProps: getInputProps2,
    isDragActive: isDragActive2,
  } = useDropzone({
    onDrop: onDrop2,
    accept: { "video/*": [] },
    multiple: false,
    noClick: false,
  });

  // Reset zoom and pan when videos change
  useEffect(() => {
    if (selectedVideo1 || selectedVideo2) {
      setZoom1(1);
      setZoom2(1);
      setPan1({ x: 0, y: 0 });
      setPan2({ x: 0, y: 0 });
      setCurrentTime(0);
      setIsPlaying(false);
      setSplitPosition(50);
    }
  }, [selectedVideo1, selectedVideo2]);

  // Initialize videos once - ensure src is set correctly and test codec support
  useEffect(() => {
    const video1El = video1Ref.current;
    const video2El = video2Ref.current;

    if (video1El && video1Url) {
      console.log("Video 1 URL ayarlanıyor:", video1Url);

      // Ensure src is set correctly
      if (video1El.src !== video1Url) {
        video1El.src = video1Url;
        console.log("Video 1 src güncellendi:", video1El.src);
      }

      // Test codec support
      const codecTests = {
        mp4_h264: video1El.canPlayType('video/mp4; codecs="avc1.42E01E"'),
        mp4_h265: video1El.canPlayType('video/mp4; codecs="hev1.1.6.L93.B0"'),
        webm_vp8: video1El.canPlayType('video/webm; codecs="vp8"'),
        webm_vp9: video1El.canPlayType('video/webm; codecs="vp9"'),
        webm_av1: video1El.canPlayType('video/webm; codecs="av01.0.05M.08"'),
      };
      console.log("Video 1 codec desteği:", codecTests);

      // Force load
      video1El.load();

      // Video yüklendikten sonra boyutları kontrol et
      const checkDimensions = () => {
        if (video1El.videoWidth > 0 && video1El.videoHeight > 0) {
          const container = container1Ref.current;
          if (container) {
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            const videoAspect = video1El.videoWidth / video1El.videoHeight;
            const containerAspect = containerWidth / containerHeight;

            let displayWidth: number;
            let displayHeight: number;

            if (videoAspect > containerAspect) {
              displayWidth = containerWidth;
              displayHeight = containerWidth / videoAspect;
            } else {
              displayHeight = containerHeight;
              displayWidth = containerHeight * videoAspect;
            }

            video1El.style.width = `${displayWidth}px`;
            video1El.style.height = `${displayHeight}px`;
            console.log("Video 1 boyutları useEffect'te ayarlandı:", {
              videoWidth: video1El.videoWidth,
              videoHeight: video1El.videoHeight,
              displayWidth,
              displayHeight,
            });
          }
        } else {
          console.warn(
            "Video 1 boyutları hala 0, readyState:",
            video1El.readyState
          );
        }
      };

      // Birden fazla event'te kontrol et
      video1El.addEventListener("loadedmetadata", checkDimensions);
      video1El.addEventListener("loadeddata", checkDimensions);
      video1El.addEventListener("canplay", checkDimensions);

      // İlk kontrol
      if (video1El.readyState >= 1) {
        checkDimensions();
      }

      return () => {
        video1El.removeEventListener("loadedmetadata", checkDimensions);
        video1El.removeEventListener("loadeddata", checkDimensions);
        video1El.removeEventListener("canplay", checkDimensions);
      };
    }

    if (video2El && video2Url) {
      console.log("Video 2 URL ayarlanıyor:", video2Url);

      // Ensure src is set correctly
      if (video2El.src !== video2Url) {
        video2El.src = video2Url;
        console.log("Video 2 src güncellendi:", video2El.src);
      }

      // Test codec support
      const codecTests = {
        mp4_h264: video2El.canPlayType('video/mp4; codecs="avc1.42E01E"'),
        mp4_h265: video2El.canPlayType('video/mp4; codecs="hev1.1.6.L93.B0"'),
        webm_vp8: video2El.canPlayType('video/webm; codecs="vp8"'),
        webm_vp9: video2El.canPlayType('video/webm; codecs="vp9"'),
        webm_av1: video2El.canPlayType('video/webm; codecs="av01.0.05M.08"'),
      };
      console.log("Video 2 codec desteği:", codecTests);

      // Force load
      video2El.load();

      // Video yüklendikten sonra boyutları kontrol et
      const checkDimensions = () => {
        if (video2El.videoWidth > 0 && video2El.videoHeight > 0) {
          const container = container2Ref.current;
          if (container) {
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            const videoAspect = video2El.videoWidth / video2El.videoHeight;
            const containerAspect = containerWidth / containerHeight;

            let displayWidth: number;
            let displayHeight: number;

            if (videoAspect > containerAspect) {
              displayWidth = containerWidth;
              displayHeight = containerWidth / videoAspect;
            } else {
              displayHeight = containerHeight;
              displayWidth = containerHeight * videoAspect;
            }

            video2El.style.width = `${displayWidth}px`;
            video2El.style.height = `${displayHeight}px`;
            console.log("Video 2 boyutları useEffect'te ayarlandı:", {
              videoWidth: video2El.videoWidth,
              videoHeight: video2El.videoHeight,
              displayWidth,
              displayHeight,
            });
          }
        } else {
          console.warn(
            "Video 2 boyutları hala 0, readyState:",
            video2El.readyState
          );
        }
      };

      // Birden fazla event'te kontrol et
      video2El.addEventListener("loadedmetadata", checkDimensions);
      video2El.addEventListener("loadeddata", checkDimensions);
      video2El.addEventListener("canplay", checkDimensions);

      // İlk kontrol
      if (video2El.readyState >= 1) {
        checkDimensions();
      }

      return () => {
        video2El.removeEventListener("loadedmetadata", checkDimensions);
        video2El.removeEventListener("loadeddata", checkDimensions);
        video2El.removeEventListener("canplay", checkDimensions);
      };
    }
  }, [video1Url, video2Url]);

  // Sync mute state with video elements
  useEffect(() => {
    if (video1Ref.current) video1Ref.current.muted = isMuted;
    if (video2Ref.current) video2Ref.current.muted = isMuted;
  }, [isMuted]);

  // Add non-passive wheel event listeners
  useEffect(() => {
    const container1 = container1Ref.current;
    const container2 = container2Ref.current;

    if (!container1 || !container2) return;

    const wheelHandler1 = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.5, Math.min(5, zoom1 * delta));
      setZoom1(newZoom);
      if (syncZoomPan) {
        setZoom2(newZoom);
      }
    };

    const wheelHandler2 = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.5, Math.min(5, zoom2 * delta));
      setZoom2(newZoom);
      if (syncZoomPan) {
        setZoom1(newZoom);
      }
    };

    // Add non-passive listeners
    container1.addEventListener("wheel", wheelHandler1, { passive: false });
    container2.addEventListener("wheel", wheelHandler2, { passive: false });

    return () => {
      container1.removeEventListener("wheel", wheelHandler1);
      container2.removeEventListener("wheel", wheelHandler2);
    };
  }, [zoom1, zoom2, syncZoomPan]);

  // Sync control and time update
  useEffect(() => {
    const video1El = video1Ref.current;
    const video2El = video2Ref.current;

    if (!video1El && !video2El) return;

    const handleTimeUpdate1 = () => {
      if (video1El) {
        const time = video1El.currentTime;
        setCurrentTime(time);
        if (
          isSynced &&
          video2El &&
          Math.abs(video2El.currentTime - time) > 0.1
        ) {
          video2El.currentTime = time;
        }
      }
    };

    const handleTimeUpdate2 = () => {
      if (video2El && !isSynced) {
        setCurrentTime(video2El.currentTime);
      }
    };

    if (video1El) {
      video1El.addEventListener("timeupdate", handleTimeUpdate1);
    }
    if (video2El && !isSynced) {
      video2El.addEventListener("timeupdate", handleTimeUpdate2);
    }

    return () => {
      if (video1El)
        video1El.removeEventListener("timeupdate", handleTimeUpdate1);
      if (video2El)
        video2El.removeEventListener("timeupdate", handleTimeUpdate2);
    };
  }, [isSynced, video1Url, video2Url]);

  // Play/Pause sync
  useEffect(() => {
    const video1El = video1Ref.current;
    const video2El = video2Ref.current;

    if (!video1El || !video2El || !isSynced) return;

    const handlePlay1 = () => {
      if (video2El.paused) {
        video2El.play().catch(console.error);
      }
    };
    const handlePause1 = () => {
      if (!video2El.paused) {
        video2El.pause();
      }
    };

    const handlePlay2 = () => {
      if (video1El.paused) {
        video1El.play().catch(console.error);
      }
    };
    const handlePause2 = () => {
      if (!video1El.paused) {
        video1El.pause();
      }
    };

    video1El.addEventListener("play", handlePlay1);
    video1El.addEventListener("pause", handlePause1);
    video2El.addEventListener("play", handlePlay2);
    video2El.addEventListener("pause", handlePause2);

    return () => {
      video1El.removeEventListener("play", handlePlay1);
      video1El.removeEventListener("pause", handlePause1);
      video2El.removeEventListener("play", handlePlay2);
      video2El.removeEventListener("pause", handlePause2);
    };
  }, [isSynced, video1Url, video2Url]);

  // Split resizer handlers
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing) return;
    const container = document.querySelector(".video-comparison-container");
    if (container) {
      const rect = container.getBoundingClientRect();
      const newPosition = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPosition(Math.max(10, Math.min(90, newPosition)));
    }
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleResizeMove);
      document.addEventListener("mouseup", handleResizeEnd);
      return () => {
        document.removeEventListener("mousemove", handleResizeMove);
        document.removeEventListener("mouseup", handleResizeEnd);
      };
    }
  }, [isResizing]);

  // Mouse drag for pan - Video 1
  const handleMouseDown1 = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging1(true);
    setDragStart1({ x: e.clientX - pan1.x, y: e.clientY - pan1.y });
  };

  const handleMouseMove1 = (e: React.MouseEvent) => {
    if (isDragging1) {
      const newPan = {
        x: e.clientX - dragStart1.x,
        y: e.clientY - dragStart1.y,
      };
      setPan1(newPan);
      if (syncZoomPan) {
        setPan2(newPan);
      }
    }
  };

  const handleMouseUp1 = () => {
    setIsDragging1(false);
  };

  // Mouse drag for pan - Video 2
  const handleMouseDown2 = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging2(true);
    setDragStart2({ x: e.clientX - pan2.x, y: e.clientY - pan2.y });
  };

  const handleMouseMove2 = (e: React.MouseEvent) => {
    if (isDragging2) {
      const newPan = {
        x: e.clientX - dragStart2.x,
        y: e.clientY - dragStart2.y,
      };
      setPan2(newPan);
      if (syncZoomPan) {
        setPan1(newPan);
      }
    }
  };

  const handleMouseUp2 = () => {
    setIsDragging2(false);
  };

  // Touch events - Video 1
  const handleTouchStart1 = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (e.touches.length === 1) {
      setIsDragging1(true);
      setDragStart1({
        x: e.touches[0].clientX - pan1.x,
        y: e.touches[0].clientY - pan1.y,
      });
    }
  };

  const handleTouchMove1 = (e: React.TouchEvent) => {
    if (isDragging1 && e.touches.length === 1) {
      const newPan = {
        x: e.touches[0].clientX - dragStart1.x,
        y: e.touches[0].clientY - dragStart1.y,
      };
      setPan1(newPan);
      if (syncZoomPan) {
        setPan2(newPan);
      }
    }
  };

  const handleTouchEnd1 = () => {
    setIsDragging1(false);
  };

  // Touch events - Video 2
  const handleTouchStart2 = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (e.touches.length === 1) {
      setIsDragging2(true);
      setDragStart2({
        x: e.touches[0].clientX - pan2.x,
        y: e.touches[0].clientY - pan2.y,
      });
    }
  };

  const handleTouchMove2 = (e: React.TouchEvent) => {
    if (isDragging2 && e.touches.length === 1) {
      const newPan = {
        x: e.touches[0].clientX - dragStart2.x,
        y: e.touches[0].clientY - dragStart2.y,
      };
      setPan2(newPan);
      if (syncZoomPan) {
        setPan1(newPan);
      }
    }
  };

  const handleTouchEnd2 = () => {
    setIsDragging2(false);
  };

  const handlePlayPause = async () => {
    const video1El = video1Ref.current;
    const video2El = video2Ref.current;

    if (!video1El || !video2El) {
      console.warn("Video elementleri bulunamadı");
      return;
    }

    try {
      if (isPlaying) {
        video1El.pause();
        video2El.pause();
        setIsPlaying(false);
      } else {
        await Promise.all([video1El.play(), video2El.play()]);
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Video oynatma hatası:", error);
    }
  };

  const handleSeek = (time: number) => {
    if (video1Ref.current) video1Ref.current.currentTime = time;
    if (video2Ref.current) video2Ref.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleReset = () => {
    setZoom1(1);
    setZoom2(1);
    setPan1({ x: 0, y: 0 });
    setPan2({ x: 0, y: 0 });
    setSplitPosition(50);
    if (video1Ref.current) video1Ref.current.currentTime = 0;
    if (video2Ref.current) video2Ref.current.currentTime = 0;
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const handleToggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (video1Ref.current) video1Ref.current.muted = newMuted;
    if (video2Ref.current) video2Ref.current.muted = newMuted;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col w-full">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-md">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                {t("compare.back")}
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <GitCompare className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">{t("compare.title")}</h1>
            </div>
          </div>

          {selectedVideo1 && selectedVideo2 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedVideo1(null);
                  setSelectedVideo2(null);
                  setSelectedVideo1Name("");
                  setSelectedVideo2Name("");
                  // URLs will be cleaned up by useEffect
                }}
              >
                <X className="h-4 w-4 mr-2" />
                {t("compare.clear")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSynced(!isSynced)}
                className={isSynced ? "bg-primary/10" : ""}
              >
                {isSynced ? t("compare.syncOn") : t("compare.syncOff")}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className={!selectedVideo1 || !selectedVideo2 ? "container mx-auto max-w-5xl px-4 py-6" : "w-full"}>
        {!selectedVideo1 || !selectedVideo2 ? (
          // Video Selection
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold">{t("compare.selectVideos")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("compare.selectDescription")}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Video 1 Selection */}
              <Card
                {...getRootProps1()}
                className={`p-6 cursor-pointer border-2 border-dashed transition-all ${
                  isDragActive1
                    ? "border-primary bg-primary/5"
                    : selectedVideo1
                    ? "border-primary/50 bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50"
                }`}
              >
                <input {...getInputProps1()} />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{t("compare.video1")}</h3>
                    {selectedVideo1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVideo1(null);
                          setSelectedVideo1Name("");
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {selectedVideo1 ? (
                    <div className="space-y-2">
                      <div className="p-4 bg-muted rounded-lg">
                        <div className="font-medium text-sm">
                          {selectedVideo1Name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {(selectedVideo1.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        Başka bir dosya seçmek için tıklayın veya sürükleyip
                        bırakın
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 space-y-4">
                      <div className="p-4 rounded-full bg-muted">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div className="text-center space-y-2">
                        <p className="text-sm font-medium">
                          {t("compare.selectOrDrag")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("compare.videoFormats")}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Analiz edilmiş videolar listesi */}
                  {completedVideos.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <p className="text-xs font-medium text-muted-foreground">
                        {t("compare.orSelectAnalyzed")}
                      </p>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {completedVideos.map((video) => (
                          <Button
                            key={video.id}
                            variant="outline"
                            size="sm"
                            className="w-full justify-start text-xs h-auto py-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVideo1(video.file);
                              setSelectedVideo1Name(video.file.name);
                            }}
                          >
                            <div className="text-left w-full">
                              <div className="font-medium">
                                {video.file.name}
                              </div>
                              {video.analysis && (
                                <div className="text-xs text-muted-foreground">
                                  {video.analysis.metadata.width}x
                                  {video.analysis.metadata.height}
                                </div>
                              )}
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Video 2 Selection */}
              <Card
                {...getRootProps2()}
                className={`p-6 cursor-pointer border-2 border-dashed transition-all ${
                  isDragActive2
                    ? "border-primary bg-primary/5"
                    : selectedVideo2
                    ? "border-primary/50 bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50"
                }`}
              >
                <input {...getInputProps2()} />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{t("compare.video2")}</h3>
                    {selectedVideo2 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVideo2(null);
                          setSelectedVideo2Name("");
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {selectedVideo2 ? (
                    <div className="space-y-2">
                      <div className="p-4 bg-muted rounded-lg">
                        <div className="font-medium text-sm">
                          {selectedVideo2Name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {(selectedVideo2.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        Başka bir dosya seçmek için tıklayın veya sürükleyip
                        bırakın
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 space-y-4">
                      <div className="p-4 rounded-full bg-muted">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div className="text-center space-y-2">
                        <p className="text-sm font-medium">
                          {t("compare.selectOrDrag")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("compare.videoFormats")}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Analiz edilmiş videolar listesi */}
                  {completedVideos.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <p className="text-xs font-medium text-muted-foreground">
                        {t("compare.orSelectAnalyzed")}
                      </p>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {completedVideos.map((video) => (
                          <Button
                            key={video.id}
                            variant="outline"
                            size="sm"
                            className="w-full justify-start text-xs h-auto py-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVideo2(video.file);
                              setSelectedVideo2Name(video.file.name);
                            }}
                          >
                            <div className="text-left w-full">
                              <div className="font-medium">
                                {video.file.name}
                              </div>
                              {video.analysis && (
                                <div className="text-xs text-muted-foreground">
                                  {video.analysis.metadata.width}x
                                  {video.analysis.metadata.height}
                                </div>
                              )}
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        ) : (
          // Comparison View
          <div
            className="flex flex-col w-full"
            style={{ height: "calc(100vh - 8rem)", minHeight: "600px" }}
          >
            {/* Top Controls Bar */}
            <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur-sm sticky top-16 z-40">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {t("compare.reset")}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handlePlayPause}
                  className="gap-2"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {isPlaying ? t("compare.pause") : t("compare.play")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleMute}
                  className={isMuted ? "bg-primary/10" : ""}
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4 mr-2" />
                  ) : (
                    <Volume2 className="h-4 w-4 mr-2" />
                  )}
                  {isMuted ? t("compare.muted") : t("compare.unmuted")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSyncZoomPan(!syncZoomPan)}
                  className={syncZoomPan ? "bg-primary/10" : ""}
                >
                  <GitCompare className="h-4 w-4 mr-2" />
                  {syncZoomPan ? t("compare.syncOn") : t("compare.syncOff")}
                </Button>
              </div>

              <div className="flex items-center gap-6">
                {syncZoomPan ? (
                  // Sync mode - single zoom control
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium">
                      {t("compare.zoom")}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newZoom = Math.max(0.5, zoom1 - 0.1);
                        setZoom1(newZoom);
                        setZoom2(newZoom);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium w-14 text-center">
                      {Math.round(zoom1 * 100)}%
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newZoom = Math.min(5, zoom1 + 0.1);
                        setZoom1(newZoom);
                        setZoom2(newZoom);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  // Separate mode - two zoom controls
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-medium">
                        Video 1:
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setZoom1(Math.max(0.5, zoom1 - 0.1))}
                        className="h-8 w-8 p-0"
                      >
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium w-14 text-center">
                        {Math.round(zoom1 * 100)}%
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setZoom1(Math.min(5, zoom1 + 0.1))}
                        className="h-8 w-8 p-0"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-medium">
                        Video 2:
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setZoom2(Math.max(0.5, zoom2 - 0.1))}
                        className="h-8 w-8 p-0"
                      >
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium w-14 text-center">
                        {Math.round(zoom2 * 100)}%
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setZoom2(Math.min(5, zoom2 + 0.1))}
                        className="h-8 w-8 p-0"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Video Comparison Area - Split View */}
            <div
              className="flex-1 relative overflow-hidden bg-black"
              style={{ minHeight: "400px" }}
            >
              {/* Video 1 - Left Side */}
              <div
                className="absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: `${splitPosition}%` }}
              >
                <div
                  ref={container1Ref}
                  className="w-full h-full cursor-grab active:cursor-grabbing"
                  onMouseDown={handleMouseDown1}
                  onMouseMove={handleMouseMove1}
                  onMouseUp={handleMouseUp1}
                  onMouseLeave={handleMouseUp1}
                  onTouchStart={handleTouchStart1}
                  onTouchMove={handleTouchMove1}
                  onTouchEnd={handleTouchEnd1}
                >
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{
                      transform: `scale(${zoom1}) translate(${pan1.x / zoom1}px, ${pan1.y / zoom1}px)`,
                      transformOrigin: "center center",
                    }}
                  >
                    {video1Url ? (
                      <video
                        ref={video1Ref}
                        key={video1Url}
                        src={video1Url}
                        playsInline
                        preload="auto"
                        controls={false}
                        muted={isMuted}
                        className="w-full h-full object-contain"
                        onLoadedMetadata={(e) => {
                          const video = e.currentTarget;
                          if (video.duration) setDuration(video.duration);
                        }}
                        onError={(e) => {
                          console.error("Video 1 hatası:", e.currentTarget.error);
                        }}
                      />
                    ) : (
                      <div className="text-white/50 text-sm">Video yükleniyor...</div>
                    )}
                      </div>
                  {/* Video İsmi */}
                  <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1.5 rounded-md text-sm font-medium backdrop-blur-sm">
                    {selectedVideo1Name || "Video 1"}
                  </div>
                </div>
              </div>

              {/* Resizer Divider - Daha belirgin split çubuğu */}
              <div
                className="absolute inset-y-0 cursor-col-resize z-50 group"
                style={{
                  left: `${splitPosition}%`,
                  width: "20px",
                  marginLeft: "-10px",
                }}
                onMouseDown={handleResizeStart}
              >
                {/* Görünür çubuk */}
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 bg-white/30 group-hover:bg-primary group-hover:w-1.5 transition-all duration-200" />
                
                {/* Ortadaki sürükleme tutamağı */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                  <div className="bg-white/90 dark:bg-gray-800 rounded-full p-1.5 shadow-lg border border-white/20 group-hover:scale-110 transition-transform duration-200">
                    <svg 
                      className="w-4 h-4 text-gray-600 dark:text-gray-300" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M8 9l4-4 4 4m0 6l-4 4-4-4" 
                      />
                    </svg>
                </div>
                </div>
                
                {/* Üst ve alt çizgiler */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-white/50 rounded-full" />
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-white/50 rounded-full" />
              </div>

              {/* Video 2 - Right Side */}
              <div
                className="absolute inset-y-0 right-0 overflow-hidden"
                style={{ width: `${100 - splitPosition}%` }}
              >
                <div
                  ref={container2Ref}
                  className="w-full h-full cursor-grab active:cursor-grabbing"
                  onMouseDown={handleMouseDown2}
                  onMouseMove={handleMouseMove2}
                  onMouseUp={handleMouseUp2}
                  onMouseLeave={handleMouseUp2}
                  onTouchStart={handleTouchStart2}
                  onTouchMove={handleTouchMove2}
                  onTouchEnd={handleTouchEnd2}
                >
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{
                      transform: `scale(${zoom2}) translate(${pan2.x / zoom2}px, ${pan2.y / zoom2}px)`,
                      transformOrigin: "center center",
                    }}
                  >
                    {video2Url ? (
                      <video
                        ref={video2Ref}
                        key={video2Url}
                        src={video2Url}
                        playsInline
                        preload="auto"
                        controls={false}
                        muted={isMuted}
                        className="w-full h-full object-contain"
                        onLoadedMetadata={(e) => {
                          const video = e.currentTarget;
                          if (video.duration && !duration) setDuration(video.duration);
                        }}
                        onError={(e) => {
                          console.error("Video 2 hatası:", e.currentTarget.error);
                        }}
                      />
                    ) : (
                      <div className="text-white/50 text-sm">Video yükleniyor...</div>
                    )}
                      </div>
                  {/* Video İsmi */}
                  <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1.5 rounded-md text-sm font-medium backdrop-blur-sm">
                    {selectedVideo2Name || "Video 2"}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Progress Bar */}
            <div className="border-t bg-background/95 backdrop-blur-sm p-4">
              <div className="flex items-center gap-4 max-w-4xl mx-auto">
                <span className="text-sm font-mono text-muted-foreground w-16 text-right">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={(e) => handleSeek(Number(e.target.value))}
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary/80 transition-colors"
                  style={{
                    background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${
                      (currentTime / (duration || 1)) * 100
                    }%, hsl(var(--muted)) ${
                      (currentTime / (duration || 1)) * 100
                    }%, hsl(var(--muted)) 100%)`,
                  }}
                />
                <span className="text-sm font-mono text-muted-foreground w-16">
                  {formatTime(duration)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
