// FFmpeg.wasm çekirdeğini public/ffmpeg altına kopyalar.
// Böylece uygulama CDN'e bağımlı olmadan (çevrimdışı ve masaüstü modunda) çalışır.
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "@ffmpeg", "core", "dist", "umd");
const dest = join(root, "public", "ffmpeg");

if (!existsSync(src)) {
  console.warn("[copy-ffmpeg-core] @ffmpeg/core bulunamadı, atlanıyor");
  process.exit(0);
}

mkdirSync(dest, { recursive: true });
for (const name of ["ffmpeg-core.js", "ffmpeg-core.wasm"]) {
  const from = join(src, name);
  const to = join(dest, name);
  if (existsSync(to) && statSync(to).size === statSync(from).size) continue;
  copyFileSync(from, to);
  console.log(`[copy-ffmpeg-core] ${name} kopyalandı`);
}
