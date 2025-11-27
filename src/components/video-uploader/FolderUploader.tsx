"use client";

import { useCallback } from "react";
import { Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { extractVideoFiles } from "@/lib/utils/video-detector";
import type { VideoFile } from "@/lib/types/video";

interface FolderUploaderProps {
  onFilesSelected: (files: VideoFile[]) => void;
  disabled?: boolean;
}

export function FolderUploader({
  onFilesSelected,
  disabled,
}: FolderUploaderProps) {
  const handleFolderSelect = useCallback(async () => {
    try {
      // @ts-ignore - File System Access API
      const directoryHandle = await window.showDirectoryPicker();
      const files: File[] = [];

      async function collectFiles(handle: any): Promise<void> {
        for await (const entry of handle.values()) {
          if (entry.kind === "file") {
            const file = await entry.getFile();
            files.push(file);
          } else if (entry.kind === "directory") {
            await collectFiles(entry);
          }
        }
      }

      await collectFiles(directoryHandle);
      const videoFiles = extractVideoFiles(files);

      const videoFileObjects: VideoFile[] = videoFiles.map((file) => ({
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        status: "pending",
      }));

      onFilesSelected(videoFileObjects);
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Klasör seçilirken hata:", error);
        // Fallback: show file input dialog
        alert("Klasör seçimi desteklenmiyor. Lütfen dosyaları tek tek seçin.");
      }
    }
  }, [onFilesSelected]);

  return (
    <Button
      type="button"
      onClick={handleFolderSelect}
      disabled={disabled}
      variant="outline"
      className="w-full sm:w-auto"
    >
      <Folder className="mr-2 h-4 w-4" />
      Klasör Seç
    </Button>
  );
}
