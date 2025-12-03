"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Pause, Volume2, VolumeX, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { VideoFile } from "@/lib/types/video";

interface VideoComparisonProps {
  video1: VideoFile | null;
  video2: VideoFile | null;
  onClose: () => void;
}

export function VideoComparison({
  video1,
  video2,
  onClose,
}: VideoComparisonProps) {
  const { t } = useTranslation();
  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted1, setIsMuted1] = useState(true);
  const [isMuted2, setIsMuted2] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSynced, setIsSynced] = useState(true);

  // Video URL'leri oluştur
  const video1Url = video1 ? URL.createObjectURL(video1.file) : null;
  const video2Url = video2 ? URL.createObjectURL(video2.file) : null;

  // Cleanup URL'leri
  useEffect(() => {
    return () => {
      if (video1Url) URL.revokeObjectURL(video1Url);
      if (video2Url) URL.revokeObjectURL(video2Url);
    };
  }, [video1Url, video2Url]);

  // Video metadata yüklendiğinde
  useEffect(() => {
    const video1El = video1Ref.current;
    const video2El = video2Ref.current;

    if (video1El) {
      const handleLoadedMetadata = () => {
        if (video1El.duration) {
          setDuration(video1El.duration);
        }
      };
      video1El.addEventListener("loadedmetadata", handleLoadedMetadata);
      return () =>
        video1El.removeEventListener("loadedmetadata", handleLoadedMetadata);
    }
  }, [video1Url]);

  // Sync kontrolü
  useEffect(() => {
    if (!isSynced || !video1Ref.current || !video2Ref.current) return;

    const video1El = video1Ref.current;
    const video2El = video2Ref.current;

    const handleTimeUpdate = () => {
      const time = video1El.currentTime;
      setCurrentTime(time);
      if (Math.abs(video2El.currentTime - time) > 0.1) {
        video2El.currentTime = time;
      }
    };

    video1El.addEventListener("timeupdate", handleTimeUpdate);
    return () => video1El.removeEventListener("timeupdate", handleTimeUpdate);
  }, [isSynced]);

  // Play/Pause sync
  useEffect(() => {
    if (!isSynced || !video1Ref.current || !video2Ref.current) return;

    const video1El = video1Ref.current;
    const video2El = video2Ref.current;

    if (isPlaying) {
      Promise.all([video1El.play(), video2El.play()]).catch(console.error);
    } else {
      video1El.pause();
      video2El.pause();
    }
  }, [isPlaying, isSynced]);

  const handlePlayPause = () => {
    const video1El = video1Ref.current;
    const video2El = video2Ref.current;

    if (!video1El || !video2El) return;

    if (isPlaying) {
      video1El.pause();
      video2El.pause();
    } else {
      Promise.all([video1El.play(), video2El.play()]).catch(console.error);
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time: number) => {
    const video1El = video1Ref.current;
    const video2El = video2Ref.current;

    if (video1El) video1El.currentTime = time;
    if (video2El) video2El.currentTime = time;
    setCurrentTime(time);
  };

  const handleMute1 = () => {
    if (video1Ref.current) {
      video1Ref.current.muted = !isMuted1;
      setIsMuted1(!isMuted1);
    }
  };

  const handleMute2 = () => {
    if (video2Ref.current) {
      video2Ref.current.muted = !isMuted2;
      setIsMuted2(!isMuted2);
    }
  };

  const handleReset = () => {
    const video1El = video1Ref.current;
    const video2El = video2Ref.current;

    if (video1El) video1El.currentTime = 0;
    if (video2El) video2El.currentTime = 0;
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!video1 || !video2) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-7xl bg-background border rounded-lg shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-muted/30">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold">Video Karşılaştırma</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSynced(!isSynced)}
                className={isSynced ? "bg-primary/10" : ""}
              >
                {isSynced ? "Sync: Açık" : "Sync: Kapalı"}
              </Button>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Video Container */}
          <div className="grid grid-cols-2 gap-4 p-4">
            {/* Video 1 */}
            <Card className="overflow-hidden">
              <div className="relative aspect-video bg-black">
                <video
                  ref={video1Ref}
                  src={video1Url || undefined}
                  className="w-full h-full object-contain"
                  muted={isMuted1}
                  onLoadedMetadata={() => {
                    if (video1Ref.current?.duration) {
                      setDuration(video1Ref.current.duration);
                    }
                  }}
                  onTimeUpdate={() => {
                    if (video1Ref.current && !isSynced) {
                      setCurrentTime(video1Ref.current.currentTime);
                    }
                  }}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
                <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
                  {video1.file.name}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white"
                  onClick={handleMute1}
                >
                  {isMuted1 ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="p-2 text-xs text-muted-foreground">
                {video1.analysis?.metadata.width}x
                {video1.analysis?.metadata.height} •{" "}
                {video1.analysis?.metadata.codecName}
              </div>
            </Card>

            {/* Video 2 */}
            <Card className="overflow-hidden">
              <div className="relative aspect-video bg-black">
                <video
                  ref={video2Ref}
                  src={video2Url || undefined}
                  className="w-full h-full object-contain"
                  muted={isMuted2}
                  onTimeUpdate={() => {
                    if (video2Ref.current && !isSynced) {
                      setCurrentTime(video2Ref.current.currentTime);
                    }
                  }}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
                <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
                  {video2.file.name}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white"
                  onClick={handleMute2}
                >
                  {isMuted2 ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="p-2 text-xs text-muted-foreground">
                {video2.analysis?.metadata.width}x
                {video2.analysis?.metadata.height} •{" "}
                {video2.analysis?.metadata.codecName}
              </div>
            </Card>
          </div>

          {/* Controls */}
          <div className="p-4 border-t bg-muted/30 space-y-3">
            {/* Progress Bar */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-16">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={(e) => handleSeek(Number(e.target.value))}
                className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="text-xs text-muted-foreground w-16">
                {formatTime(duration)}
              </span>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Sıfırla
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
                {isPlaying ? "Duraklat" : "Oynat"}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
