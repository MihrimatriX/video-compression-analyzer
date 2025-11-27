const VIDEO_EXTENSIONS = [
  ".mp4",
  ".avi",
  ".mov",
  ".mkv",
  ".webm",
  ".flv",
  ".wmv",
  ".m4v",
  ".3gp",
  ".ogv",
  ".ts",
  ".mts",
  ".m2ts",
  ".vob",
  ".asf",
  ".rm",
  ".rmvb",
  ".divx",
  ".xvid",
];

const VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/x-msvideo",
  "video/quicktime",
  "video/x-matroska",
  "video/webm",
  "video/x-flv",
  "video/x-ms-wmv",
  "video/3gpp",
  "video/ogg",
  "video/mpeg",
];

export function isVideoFile(file: File): boolean {
  const extension = file.name
    .toLowerCase()
    .substring(file.name.lastIndexOf("."));
  const mimeType = file.type.toLowerCase();

  return (
    VIDEO_EXTENSIONS.includes(extension) ||
    VIDEO_MIME_TYPES.some((type) => mimeType.includes(type.split("/")[1]))
  );
}

export function extractVideoFiles(files: File[]): File[] {
  return files.filter(isVideoFile);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function formatBitrate(bitsPerSecond: number): string {
  if (bitsPerSecond < 1000) {
    return `${Math.round(bitsPerSecond)} bps`;
  }
  if (bitsPerSecond < 1000000) {
    return `${(bitsPerSecond / 1000).toFixed(1)} Kbps`;
  }
  return `${(bitsPerSecond / 1000000).toFixed(1)} Mbps`;
}
