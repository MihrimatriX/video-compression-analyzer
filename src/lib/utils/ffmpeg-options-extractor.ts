/**
 * FFmpeg komutundan sadece options kısmını çıkarır (input ve output dosyaları hariç)
 * Örnek: "ffmpeg -i input.mp4 -c:v libaom-av1 -crf 26 output.mp4"
 * Sonuç: "-c:v libaom-av1 -crf 26"
 */
export function extractFFmpegOptions(fullCommand: string): string {
  // Komutu parçala (tırnak içindeki dosya adlarını koru)
  const parts: string[] = [];
  let currentPart = "";
  let inQuotes = false;

  for (let i = 0; i < fullCommand.length; i++) {
    const char = fullCommand[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      currentPart += char;
    } else if (char === " " && !inQuotes) {
      if (currentPart.trim()) {
        parts.push(currentPart.trim());
        currentPart = "";
      }
    } else {
      currentPart += char;
    }
  }
  if (currentPart.trim()) {
    parts.push(currentPart.trim());
  }

  // "ffmpeg" ve "-i" parametrelerini bul
  const ffmpegIndex = parts.findIndex((part) => part === "ffmpeg");
  const inputIndex = parts.findIndex((part) => part === "-i");

  if (inputIndex === -1) {
    // Eğer -i yoksa, tüm komutu döndür (fallback)
    return fullCommand;
  }

  // -i'den sonraki kısmı al (input dosyası + options + output)
  const afterInput = parts.slice(inputIndex + 2); // -i ve input dosyasını atla

  if (afterInput.length === 0) {
    return "";
  }

  // Son parametreyi output dosyası olarak kabul et
  // Options kısmını al (son parametreyi çıkar)
  const options: string[] = [];

  for (let i = 0; i < afterInput.length - 1; i++) {
    const part = afterInput[i];
    // Tırnak içindeki dosya adlarını atla
    if (!part.startsWith('"') || !part.endsWith('"')) {
      options.push(part);
    }
  }

  // Son parametreyi kontrol et - eğer dosya adı gibi görünüyorsa atla
  const lastPart = afterInput[afterInput.length - 1];
  const isOutputFile =
    lastPart.includes(".") ||
    lastPart.startsWith('"') ||
    lastPart.endsWith('"') ||
    /\.(mp4|webm|mkv|avi|mov|flv|wmv)$/i.test(lastPart);

  // Eğer son parametre output dosyası değilse, onu da ekle
  if (!isOutputFile) {
    options.push(lastPart);
  }

  // Options'ı birleştir ve döndür
  return options.join(" ");
}

/**
 * FFmpeg komutunu daha okunaklı formata çevirir
 * Örnek: "ffmpeg -i input.mp4 [options] output.mp4"
 */
export function formatFFmpegCommand(
  fullCommand: string,
  inputFile?: string,
  outputFile?: string
): string {
  const options = extractFFmpegOptions(fullCommand);

  // Eğer input ve output dosyaları verilmişse, onları kullan
  if (inputFile && outputFile) {
    return `ffmpeg -i "${inputFile}" ${options} "${outputFile}"`;
  }

  // Aksi halde, sadece options'ı göster
  return options || fullCommand;
}
