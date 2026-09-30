import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

const CDN_BASE = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";

async function loadCore(ffmpeg: FFmpeg) {
  // Önce uygulamayla birlikte gelen (self-hosted) çekirdeği dene: çevrimdışı çalışır.
  const localBase = new URL("/ffmpeg/", window.location.href).href;
  try {
    await ffmpeg.load({
      coreURL: `${localBase}ffmpeg-core.js`,
      wasmURL: `${localBase}ffmpeg-core.wasm`,
    });
    return;
  } catch (error) {
    console.warn("Yerel FFmpeg çekirdeği yüklenemedi, CDN deneniyor:", error);
  }
  await ffmpeg.load({
    coreURL: await toBlobURL(`${CDN_BASE}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${CDN_BASE}/ffmpeg-core.wasm`, "application/wasm"),
  });
}

export async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance?.loaded) return ffmpegInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const ffmpeg = new FFmpeg();
    try {
      await loadCore(ffmpeg);
    } catch (error) {
      console.error("FFmpeg yüklenirken hata:", error);
      ffmpeg.terminate();
      throw new Error("FFmpeg yüklenemedi. Lütfen internet bağlantınızı kontrol edin.");
    }
    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  try {
    return await loadPromise;
  } finally {
    loadPromise = null;
  }
}

export function resetFFmpeg() {
  if (ffmpegInstance) {
    ffmpegInstance.terminate();
    ffmpegInstance = null;
  }
}

// FFmpeg.wasm tek iş parçacıklıdır ve tek bir sanal dosya sistemi kullanır;
// işleri sıraya koyarak aynı anda iki komut çalışmasını engelliyoruz.
let queue: Promise<unknown> = Promise.resolve();

export function withFFmpeg<T>(job: (ffmpeg: FFmpeg) => Promise<T>): Promise<T> {
  const run = queue.then(async () => job(await getFFmpeg()));
  queue = run.catch(() => undefined);
  return run;
}
