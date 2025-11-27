"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatFileSize, formatBitrate } from "@/lib/utils/video-detector";
import type {
  CompressionRecommendation,
  VideoMetadata,
} from "@/lib/types/video";

interface CompressionSettingsProps {
  metadata: VideoMetadata;
  recommendation: CompressionRecommendation;
}

export function CompressionSettings({
  metadata,
  recommendation,
}: CompressionSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Önerilen Sıkıştırma Ayarları</CardTitle>
        <CardDescription>
          {recommendation.codecName} codec kullanarak optimal sıkıştırma
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Codec:</span>
            <p className="font-medium">{recommendation.codecName}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Preset:</span>
            <p className="font-medium">{recommendation.preset}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Bitrate:</span>
            <p className="font-medium">
              {formatBitrate(recommendation.bitrate)}
            </p>
          </div>
          {recommendation.crf !== undefined && (
            <div>
              <span className="text-muted-foreground">CRF:</span>
              <p className="font-medium">{recommendation.crf}</p>
            </div>
          )}
          {recommendation.quality !== undefined && (
            <div>
              <span className="text-muted-foreground">Quality:</span>
              <p className="font-medium">{recommendation.quality}</p>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Çözünürlük:</span>
            <p className="font-medium">
              {recommendation.resolution.width} ×{" "}
              {recommendation.resolution.height}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Tahmini Boyut:</span>
            <p className="font-medium">
              {formatFileSize(recommendation.estimatedSize)}
            </p>
          </div>
        </div>

        {recommendation.estimatedSavings > 0 && (
          <div className="rounded-md bg-green-50 dark:bg-green-950 p-3">
            <p className="text-sm font-medium text-green-900 dark:text-green-100">
              Tasarruf: {formatFileSize(recommendation.estimatedSavings)}(
              {recommendation.estimatedSavingsPercent.toFixed(1)}%)
            </p>
          </div>
        )}

        <div className="rounded-md bg-muted p-3">
          <p className="text-xs text-muted-foreground">
            {recommendation.explanation}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
