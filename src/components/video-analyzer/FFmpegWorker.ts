/**
 * FFmpeg Worker Utility
 *
 * Bu dosya FFmpeg.wasm'in worker thread'de çalışması için yardımcı fonksiyonlar içerir.
 * FFmpeg instance'ı lib/ffmpeg/ffmpeg-instance.ts'de yönetiliyor.
 */

import { getFFmpeg } from "@/lib/ffmpeg/ffmpeg-instance";

/**
 * FFmpeg worker'ı başlatır ve hazır hale getirir
 */
export async function initializeFFmpegWorker(): Promise<void> {
  try {
    const ffmpeg = await getFFmpeg();
    // FFmpeg instance hazır
    console.log("FFmpeg worker initialized");
  } catch (error) {
    console.error("FFmpeg worker initialization failed:", error);
    throw error;
  }
}

/**
 * FFmpeg worker'ın yüklenip yüklenmediğini kontrol eder
 */
export async function isFFmpegWorkerReady(): Promise<boolean> {
  try {
    await getFFmpeg();
    return true;
  } catch {
    return false;
  }
}
