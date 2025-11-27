"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { Upload, Folder, FileVideo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n/use-translation";
import { extractVideoFiles, formatFileSize } from "@/lib/utils/video-detector";
import type { VideoFile } from "@/lib/types/video";

interface FileUploaderProps {
  onFilesSelected: (files: VideoFile[]) => void;
  disabled?: boolean;
}

export function FileUploader({ onFilesSelected, disabled }: FileUploaderProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const videoFiles = extractVideoFiles(acceptedFiles);

      const videoFileObjects: VideoFile[] = videoFiles.map((file) => ({
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        status: "pending",
      }));

      onFilesSelected(videoFileObjects);
      setIsDragging(false);
    },
    [onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      "video/*": [
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
      ],
    },
    multiple: true,
    disabled,
    noClick: true,
    noKeyboard: true,
  });

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
        console.error(t("error.folderSelect"), error);
        // Fallback to file input if directory picker is not supported
        open();
      }
    }
  }, [onFilesSelected, open]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        {...getRootProps()}
        className={`
          relative border-2 border-dashed transition-all duration-200
          ${
            isDragActive || isDragging
              ? "border-primary bg-primary/5 scale-[1.02] shadow-lg"
              : "border-muted-foreground/25"
          }
          ${
            disabled
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer hover:border-primary/50 hover:bg-muted/30"
          }
        `}
        onMouseEnter={() => setIsDragging(true)}
        onMouseLeave={() => setIsDragging(false)}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center justify-center p-8 text-center">
          <motion.div
            animate={{
              scale: isDragActive ? 1.1 : 1,
              rotate: isDragActive ? 5 : 0,
            }}
            transition={{ duration: 0.2 }}
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted"
          >
            {isDragActive ? (
              <Upload className="h-6 w-6 text-primary" />
            ) : (
              <FileVideo className="h-6 w-6 text-muted-foreground" />
            )}
          </motion.div>

          <h3 className="mb-1.5 text-base font-semibold">
            {isDragActive ? t("upload.dropFiles") : t("upload.title")}
          </h3>

          <p className="mb-4 text-xs text-muted-foreground">
            {t("upload.dragDrop")}
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              onClick={open}
              disabled={disabled}
              variant="default"
              size="sm"
              className="gap-1.5"
            >
              <Upload className="h-3.5 w-3.5" />
              {t("upload.selectFile")}
            </Button>

            <Button
              type="button"
              onClick={handleFolderSelect}
              disabled={disabled}
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              <Folder className="h-3.5 w-3.5" />
              {t("upload.selectFolder")}
            </Button>
          </div>

          <p className="mt-3 text-[10px] text-muted-foreground">
            {t("upload.supportedFormats")}
          </p>
        </div>
      </Card>
    </motion.div>
  );
}
