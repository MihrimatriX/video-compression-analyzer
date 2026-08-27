export interface VideoMetadata {
  filename: string;
  fileSize: number;
  duration: number;
  codec: string;
  codecName: string;
  bitrate: number;
  width: number;
  height: number;
  framerate: number;
  pixelFormat: string;
  audioCodec?: string;
  audioBitrate?: number;
  audioChannels?: number;
  audioSampleRate?: number;
  thumbnail?: string;
}

export interface CompressionRecommendation {
  codec: "h264" | "h265" | "vp9" | "av1";
  codecName: string;
  bitrate: number;
  crf?: number;
  quality?: number;
  preset:
    | "ultrafast"
    | "superfast"
    | "veryfast"
    | "faster"
    | "fast"
    | "medium"
    | "slow"
    | "slower"
    | "veryslow";
  resolution: {
    width: number;
    height: number;
    scale: "original" | "downscale" | "upscale";
  };
  estimatedSize: number;
  estimatedSavings: number;
  estimatedSavingsPercent: number;
  estimatedTime: number;
  ffmpegCommand: string;
  explanation: string;
  audioCodec?: string;
  audioBitrate?: number;
  pixelFormat?: string;
}

export interface VideoAnalysis {
  metadata: VideoMetadata;
  recommendations: CompressionRecommendation[];
  bestRecommendation: CompressionRecommendation;
}

export interface VideoFile {
  file: File;
  id: string;
  analysis?: VideoAnalysis;
  status: "pending" | "analyzing" | "completed" | "error";
  error?: string;
  progress?: number;
}
