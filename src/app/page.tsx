"use client";

import { motion } from "framer-motion";
import { FileUploader } from "@/components/video-uploader/FileUploader";
import { VideoAnalysisPage } from "@/components/video-analysis/VideoAnalysisPage";
import { useVideoStore } from "@/lib/store/video-store";
import { useTranslation } from "@/lib/i18n/use-translation";
import {
  Zap,
  FileVideo,
  Settings2,
  GitCompare,
  Shield,
  Cpu,
} from "lucide-react";
import type { VideoFile } from "@/lib/types/video";

export default function Home() {
  const { addVideos, videos } = useVideoStore();
  const { t } = useTranslation();

  const handleFilesSelected = (files: VideoFile[]) => {
    addVideos(files);
  };

  // Video yüklendiyse analiz sayfasını göster
  if (videos.length > 0) {
    return <VideoAnalysisPage />;
  }

  const features = [
    {
      icon: <Zap className="h-5 w-5" />,
      title: t("features.smartAnalysis.title"),
      description: t("features.smartAnalysis.description"),
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
    },
    {
      icon: <FileVideo className="h-5 w-5" />,
      title: t("features.multiCodec.title"),
      description: t("features.multiCodec.description"),
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      icon: <Settings2 className="h-5 w-5" />,
      title: t("features.customPresets.title"),
      description: t("features.customPresets.description"),
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      icon: <GitCompare className="h-5 w-5" />,
      title: t("features.compare.title"),
      description: t("features.compare.description"),
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: t("features.privacy.title"),
      description: t("features.privacy.description"),
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
    {
      icon: <Cpu className="h-5 w-5" />,
      title: t("features.ffmpegCommands.title"),
      description: t("features.ffmpegCommands.description"),
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
  ];

  // Video yoksa upload sayfasını göster
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="space-y-10"
      >
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3 text-center"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
            {t("app.title")}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            {t("app.subtitle")}
          </p>
        </motion.div>

        {/* File Uploader */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-2xl mx-auto"
        >
          <FileUploader onFilesSelected={handleFilesSelected} />
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <h2 className="text-lg font-semibold text-center text-muted-foreground">
            {t("features.title")}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                className="group p-4 rounded-xl border bg-card/50 hover:bg-card hover:shadow-md transition-all"
              >
                <div
                  className={`w-10 h-10 rounded-lg ${feature.bg} flex items-center justify-center mb-3`}
                >
                  <div className={feature.color}>{feature.icon}</div>
                </div>
                <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-4 pt-4 border-t"
        >
          <h2 className="text-lg font-semibold text-center text-muted-foreground">
            {t("howItWorks.title")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3 font-bold">
                1
              </div>
              <h3 className="font-medium text-sm mb-1">
                {t("howItWorks.step1.title")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("howItWorks.step1.description")}
              </p>
            </div>
            <div className="text-center p-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3 font-bold">
                2
              </div>
              <h3 className="font-medium text-sm mb-1">
                {t("howItWorks.step2.title")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("howItWorks.step2.description")}
              </p>
            </div>
            <div className="text-center p-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3 font-bold">
                3
              </div>
              <h3 className="font-medium text-sm mb-1">
                {t("howItWorks.step3.title")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("howItWorks.step3.description")}
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
