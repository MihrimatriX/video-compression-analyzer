"use client";

import { cn } from "@/lib/utils";

interface FFmpegCommandHighlighterProps {
  command: string;
  className?: string;
}

/**
 * FFmpeg komut parametrelerini renklendirir
 */
export function FFmpegCommandHighlighter({
  command,
  className,
}: FFmpegCommandHighlighterProps) {
  // Parametreleri parse et ve renklendir
  const parts = command.split(/(\s+)/);
  
  return (
    <code className={cn("text-[11px] break-all", className)}>
      {parts.map((part, index) => {
        // Boşlukları olduğu gibi göster
        if (/^\s+$/.test(part)) {
          return <span key={index}>{part}</span>;
        }
        
        // Video codec parametreleri
        if (part === "-c:v" || part === "-c:a") {
          return (
            <span key={index} className="text-blue-600 dark:text-blue-400 font-semibold">
              {part}
            </span>
          );
        }
        
        // Codec değerleri
        if (
          part.startsWith("libaom-av1") ||
          part.startsWith("libx265") ||
          part.startsWith("libx264") ||
          part.startsWith("libvpx-vp9") ||
          part.startsWith("hevc_nvenc") ||
          part.startsWith("hevc_amf") ||
          part.startsWith("libopus") ||
          part.startsWith("aac") ||
          part.startsWith("ac3")
        ) {
          return (
            <span key={index} className="text-purple-600 dark:text-purple-400 font-medium">
              {part}
            </span>
          );
        }
        
        // CRF, CQ, bitrate parametreleri
        if (part === "-crf" || part === "-cq" || part === "-b:v" || part === "-b:a") {
          return (
            <span key={index} className="text-green-600 dark:text-green-400 font-semibold">
              {part}
            </span>
          );
        }
        
        // Değerler (sayılar)
        if (/^-?\d+(\.\d+)?(k|m|K|M)?$/.test(part)) {
          return (
            <span key={index} className="text-orange-600 dark:text-orange-400">
              {part}
            </span>
          );
        }
        
        // Preset ve pixel format
        if (part === "-preset" || part === "-pix_fmt" || part === "-vf") {
          return (
            <span key={index} className="text-cyan-600 dark:text-cyan-400 font-semibold">
              {part}
            </span>
          );
        }
        
        // Pixel format değerleri
        if (
          part.includes("yuv") ||
          part.includes("p010") ||
          part.includes("nv12")
        ) {
          return (
            <span key={index} className="text-teal-600 dark:text-teal-400">
              {part}
            </span>
          );
        }
        
        // Diğer parametreler
        if (part.startsWith("-")) {
          return (
            <span key={index} className="text-blue-500 dark:text-blue-300">
              {part}
            </span>
          );
        }
        
        // Normal metin
        return <span key={index}>{part}</span>;
      })}
    </code>
  );
}

