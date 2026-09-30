/**
 * Electron preload betiğinin (electron/preload.cjs) `window.vcaDesktop` olarak
 * açtığı API'nin tipleri. Tarayıcıda bu nesne yoktur.
 */
import type { HardwareEncoders } from "./ffmpeg-args";

export interface DesktopCapabilities {
  ffmpegPath: string;
  ffmpegVersion: string;
  softwareEncoders: string[];
  hardwareEncoders: HardwareEncoders;
  /** Kullanıcıya gösterilecek özet, ör. "NVIDIA NVENC" */
  hardwareLabel: string | null;
  cpuCount: number;
}

export interface PreparedOutput {
  outputPath: string;
  passLogFile: string;
  nullOutput: string;
}

export interface DesktopEncodeJob {
  id: string;
  passes: string[][];
  outputPath: string;
  /** İlerleme hesabı için çıktı süresi (sn) */
  duration: number;
}

export interface DesktopProgressEvent {
  id: string;
  /** İşlenen süre (sn), geçişler toplamı üzerinden */
  time: number;
  speed?: number;
  pass: number;
  totalPasses: number;
}

export interface DesktopBridge {
  isDesktop: true;
  platform: "win32" | "darwin" | "linux" | string;
  appVersion: string;
  getPathForFile(file: File): string;
  getCapabilities(refresh?: boolean): Promise<DesktopCapabilities>;
  probe(path: string): Promise<{ json: unknown; size: number }>;
  thumbnail(path: string, at: number): Promise<string>;
  chooseOutputDir(): Promise<string | null>;
  prepareOutput(inputPath: string, fileName: string, outputDir?: string): Promise<PreparedOutput>;
  encode(job: DesktopEncodeJob): Promise<{ outputPath: string; size: number }>;
  cancelEncode(id: string): Promise<void>;
  onEncodeProgress(callback: (event: DesktopProgressEvent) => void): () => void;
  /** Uygulama menüsünden gelen komutlar (ör. "choose-output-dir") */
  onMenuCommand(callback: (command: string) => void): () => void;
  measureQuality(referencePath: string, distortedPath: string, trimStart?: number): Promise<{ psnr: number; ssim: number }>;
  showInFolder(path: string): Promise<void>;
  openPath(path: string): Promise<void>;
}

declare global {
  interface Window {
    vcaDesktop?: DesktopBridge;
  }
}

export function getDesktop(): DesktopBridge | null {
  if (typeof window === "undefined") return null;
  return window.vcaDesktop?.isDesktop ? window.vcaDesktop : null;
}

export function isDesktop(): boolean {
  return getDesktop() !== null;
}
