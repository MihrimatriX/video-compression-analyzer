// Yerel FFmpeg / ffprobe bulma, donanım kodlayıcı algılama ve çalıştırma yardımcıları.
"use strict";

const { spawn, execFile } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

/** asar içindeki yolları, paketlenmemiş (asar.unpacked) karşılığına çevirir. */
function unpacked(p) {
  return p ? p.replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`) : p;
}

function bundledFfmpeg() {
  try {
    return unpacked(require("ffmpeg-static"));
  } catch {
    return null;
  }
}

function bundledFfprobe() {
  try {
    return unpacked(require("ffprobe-static").path);
  } catch {
    return null;
  }
}

function run(bin, args, { timeout = 15000 } = {}) {
  return new Promise((resolve) => {
    execFile(bin, args, { timeout, windowsHide: true, maxBuffer: 32 * 1024 * 1024 }, (error, stdout, stderr) => {
      resolve({ ok: !error, code: error ? error.code : 0, stdout: String(stdout), stderr: String(stderr) });
    });
  });
}

async function version(bin) {
  if (!bin) return null;
  if (path.isAbsolute(bin) && !fs.existsSync(bin)) return null;
  const res = await run(bin, ["-hide_banner", "-version"], { timeout: 8000 });
  if (!res.ok) return null;
  // "ffmpeg version 7.0.2-static https://... Copyright ..." -> "ffmpeg 7.0.2-static"
  const first = res.stdout.split("\n")[0].trim();
  const m = first.match(/^(\S+) version (\S+)/);
  return m ? `${m[1]} ${m[2]}` : first;
}

const HW_CANDIDATES = {
  win32: {
    h264: ["h264_nvenc", "h264_qsv", "h264_amf"],
    h265: ["hevc_nvenc", "hevc_qsv", "hevc_amf"],
    av1: ["av1_nvenc", "av1_qsv", "av1_amf"],
  },
  darwin: {
    h264: ["h264_videotoolbox"],
    h265: ["hevc_videotoolbox"],
    av1: [],
  },
  linux: {
    h264: ["h264_nvenc", "h264_qsv", "h264_amf"],
    h265: ["hevc_nvenc", "hevc_qsv", "hevc_amf"],
    av1: ["av1_nvenc", "av1_qsv"],
  },
};

const HW_LABELS = [
  ["_nvenc", "NVIDIA NVENC"],
  ["_qsv", "Intel Quick Sync"],
  ["_amf", "AMD AMF"],
  ["_videotoolbox", "Apple VideoToolbox"],
];

/** Kodlayıcı listede olsa bile gerçekten çalışıyor mu? 3 karelik deneme kodlaması yapar. */
async function encoderWorks(ffmpeg, encoder) {
  const pixFmt = encoder.endsWith("_qsv") || encoder.endsWith("_amf") ? "nv12" : "yuv420p";
  const res = await run(
    ffmpeg,
    [
      "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "color=black:s=640x360:r=30:d=0.2",
      "-frames:v", "3", "-pix_fmt", pixFmt, "-c:v", encoder, "-f", "null", "-",
    ],
    { timeout: 12000 },
  );
  return res.ok;
}

async function inspect(ffmpeg) {
  const ver = await version(ffmpeg);
  if (!ver) return null;
  const list = await run(ffmpeg, ["-hide_banner", "-encoders"], { timeout: 8000 });
  const available = new Set(
    list.stdout
      .split("\n")
      .map((l) => l.trim().split(/\s+/)[1])
      .filter(Boolean),
  );
  const softwareEncoders = [...available].filter((e) => /^lib/.test(e));
  const candidates = HW_CANDIDATES[process.platform] || HW_CANDIDATES.linux;
  const hardwareEncoders = {};
  for (const [codec, names] of Object.entries(candidates)) {
    for (const name of names) {
      if (!available.has(name)) continue;
      if (await encoderWorks(ffmpeg, name)) {
        hardwareEncoders[codec] = name;
        break;
      }
    }
  }
  const first = Object.values(hardwareEncoders)[0];
  const hardwareLabel = first ? (HW_LABELS.find(([suffix]) => first.endsWith(suffix)) || [null, first])[1] : null;
  return { ffmpegPath: ffmpeg, ffmpegVersion: ver, softwareEncoders, hardwareEncoders, hardwareLabel };
}

let cached = null;

/**
 * Kullanılacak FFmpeg'i seçer:
 *  1. VCA_FFMPEG_PATH ortam değişkeni
 *  2. Donanım kodlayıcısı olan sistem FFmpeg'i (PATH)
 *  3. Uygulamayla gelen ffmpeg-static
 *  4. Sistem FFmpeg'i (donanımsız)
 */
async function getCapabilities(refresh = false) {
  if (cached && !refresh) return cached;
  cached = (async () => {
    const envPath = process.env.VCA_FFMPEG_PATH;
    if (envPath) {
      const info = await inspect(envPath);
      if (info) return finalize(info, process.env.VCA_FFPROBE_PATH);
    }
    const [system, bundled] = await Promise.all([inspect("ffmpeg"), inspect(bundledFfmpeg())]);
    const hasHw = (info) => info && Object.keys(info.hardwareEncoders).length > 0;
    let chosen = null;
    if (hasHw(system) && !hasHw(bundled)) chosen = system;
    else chosen = bundled || system;
    if (!chosen) {
      throw new Error("FFmpeg bulunamadı. Uygulamayı yeniden kurun veya sisteminize FFmpeg yükleyin.");
    }
    return finalize(chosen, chosen === system ? "ffprobe" : null);
  })();
  cached.catch(() => (cached = null));
  return cached;
}

async function finalize(info, ffprobeHint) {
  let ffprobePath = ffprobeHint;
  if (!ffprobePath || !(await version(ffprobePath))) {
    ffprobePath = (await version(bundledFfprobe())) ? bundledFfprobe() : "ffprobe";
  }
  return { ...info, ffprobePath, cpuCount: os.cpus().length };
}

async function probe(filePath) {
  const caps = await getCapabilities();
  const res = await run(
    caps.ffprobePath,
    ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", filePath],
    { timeout: 60000 },
  );
  if (!res.ok) throw new Error(`ffprobe başarısız: ${res.stderr.trim().split("\n").pop() || res.code}`);
  const size = fs.statSync(filePath).size;
  return { json: JSON.parse(res.stdout), size };
}

function thumbnail(filePath, at) {
  return getCapabilities().then(
    (caps) =>
      new Promise((resolve, reject) => {
        const child = spawn(
          caps.ffmpegPath,
          [
            "-hide_banner", "-loglevel", "error", "-ss", String(Math.max(0, Number(at) || 0)), "-i", filePath,
            "-frames:v", "1", "-vf", "scale=320:-2", "-f", "image2pipe", "-vcodec", "mjpeg", "-q:v", "4", "-",
          ],
          { windowsHide: true },
        );
        const chunks = [];
        child.stdout.on("data", (c) => chunks.push(c));
        child.on("error", reject);
        child.on("close", (code) => {
          const buf = Buffer.concat(chunks);
          if (code === 0 && buf.length) resolve(`data:image/jpeg;base64,${buf.toString("base64")}`);
          else reject(new Error("Küçük resim oluşturulamadı"));
        });
      }),
  );
}

/** Tüm geçişleri sırayla çalıştırır, -progress çıktısından ilerleme bildirir. */
function encode(job, onProgress, registerChild) {
  return getCapabilities().then(async (caps) => {
    const totalPasses = job.passes.length;
    for (let i = 0; i < totalPasses; i++) {
      const args = ["-progress", "pipe:1", "-nostats", ...job.passes[i]];
      await new Promise((resolve, reject) => {
        const child = spawn(caps.ffmpegPath, args, { windowsHide: true });
        registerChild(child);
        let stderrTail = "";
        let buffer = "";
        let speed;
        child.stdout.on("data", (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop();
          for (const line of lines) {
            const [key, value] = line.split("=");
            if (key === "speed") speed = parseFloat(value) || undefined;
            if (key === "out_time_us" || key === "out_time_ms") {
              // FFmpeg her iki anahtarı da mikrosaniye olarak yazar
              const time = Number(value) / 1e6;
              if (Number.isFinite(time) && time >= 0) {
                onProgress({ id: job.id, time, speed, pass: i + 1, totalPasses });
              }
            }
          }
        });
        child.stderr.on("data", (chunk) => {
          stderrTail = (stderrTail + chunk.toString()).slice(-4000);
        });
        child.on("error", reject);
        child.on("close", (code, signal) => {
          if (code === 0) return resolve();
          if (signal || child.killedByUser) return reject(new Error("CANCELED"));
          const lines = stderrTail.trim().split("\n").filter((l) => /error|invalid|unknown|not|fail/i.test(l));
          reject(new Error(`FFmpeg ${code} koduyla çıktı: ${(lines.slice(-2).join(" / ") || stderrTail.slice(-300)).trim()}`));
        });
      });
    }
    const size = fs.statSync(job.outputPath).size;
    return { outputPath: job.outputPath, size };
  });
}

async function measureQuality(referencePath, distortedPath, trimStart = 0) {
  const caps = await getCapabilities();
  const args = [
    "-hide_banner", "-nostats",
    "-i", distortedPath,
    ...(trimStart > 0 ? ["-ss", String(trimStart)] : []),
    "-i", referencePath,
    "-lavfi",
    "[0:v][1:v]scale2ref=flags=bicubic[d][r];[r]split[r1][r2];[d][r1]ssim=shortest=1[s];[s][r2]psnr=shortest=1",
    "-an", "-f", "null", "-",
  ];
  const res = await run(caps.ffmpegPath, args, { timeout: 30 * 60 * 1000 });
  const ssim = res.stderr.match(/SSIM[^\n]*All:\s*([\d.]+)/);
  const psnr = res.stderr.match(/PSNR[^\n]*average:\s*([\d.]+|inf)/);
  if (!ssim || !psnr) {
    const tail = res.stderr.trim().split("\n").slice(-2).join(" / ");
    throw new Error(`Kalite ölçümü başarısız: ${tail}`);
  }
  return { ssim: Number(ssim[1]), psnr: psnr[1] === "inf" ? 100 : Number(psnr[1]) };
}

module.exports = { getCapabilities, probe, thumbnail, encode, measureQuality };
