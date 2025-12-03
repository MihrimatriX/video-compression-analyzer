import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

let ffmpegInstance: FFmpeg | null = null;
let isLoaded = false;

export async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance && isLoaded) {
    return ffmpegInstance;
  }

  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpeg();

    ffmpegInstance.on("log", ({ message }) => {
      console.log("[FFmpeg]", message);
    });
  }

  if (!isLoaded) {
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

    try {
      await ffmpegInstance.load({
        coreURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.js`,
          "text/javascript"
        ),
        wasmURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.wasm`,
          "application/wasm"
        ),
      });

      isLoaded = true;
    } catch (error) {
      console.error("FFmpeg yüklenirken hata:", error);
      throw new Error(
        "FFmpeg yüklenemedi. Lütfen internet bağlantınızı kontrol edin."
      );
    }
  }

  return ffmpegInstance;
}

export function resetFFmpeg() {
  if (ffmpegInstance) {
    ffmpegInstance.terminate();
    ffmpegInstance = null;
    isLoaded = false;
  }
}
