// Video Compression Analyzer — Electron ana süreci.
//
// Next.js'in statik çıktısını (out/) "app://" protokolünden sunar ve renderer'a
// preload köprüsü (window.vcaDesktop) üzerinden yerel FFmpeg yeteneklerini açar.
"use strict";

const { app, BrowserWindow, dialog, ipcMain, Menu, net, protocol, shell } = require("electron");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const tools = require("./ffmpeg-tools.cjs");

const APP_SCHEME = "app";
const OUT_DIR = path.join(__dirname, "..", "out");
const devUrlArg = process.argv.find((a) => a.startsWith("--dev-url="));
const DEV_URL = devUrlArg ? devUrlArg.slice("--dev-url=".length) : process.env.VCA_DEV_URL;

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true },
  },
]);

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

/** @type {BrowserWindow | null} */
let mainWindow = null;
/** Bu oturumda üretilen çıktı dosyaları: sadece bunlar açılabilir / klasörde gösterilebilir */
const knownOutputs = new Set();
/** Hazırlanan çıktı yolu -> iki geçiş log dosyası öneki */
const preparedOutputs = new Map();
/** İş kimliği -> çalışan FFmpeg süreci */
const runningJobs = new Map();

function resolveStaticFile(urlPath) {
  let rel = decodeURIComponent(urlPath).replace(/^\/+/, "");
  if (!rel || rel.endsWith("/")) rel += "index.html";
  const candidates = [rel, `${rel}.html`, path.join(rel, "index.html")];
  for (const candidate of candidates) {
    const full = path.normalize(path.join(OUT_DIR, candidate));
    if (!full.startsWith(OUT_DIR)) return null; // dizin dışına çıkma girişimi
    if (fs.existsSync(full) && fs.statSync(full).isFile()) return full;
  }
  return null;
}

function registerAppProtocol() {
  protocol.handle(APP_SCHEME, async (request) => {
    const url = new URL(request.url);
    const file = resolveStaticFile(url.pathname);
    if (!file) {
      const notFound = resolveStaticFile("/404.html");
      if (notFound) {
        const res = await net.fetch(pathToFileURL(notFound).toString());
        return new Response(res.body, { status: 404, headers: { "content-type": "text/html" } });
      }
      return new Response("Not found", { status: 404 });
    }
    const res = await net.fetch(pathToFileURL(file).toString());
    const headers = new Headers(res.headers);
    if (file.endsWith(".wasm")) headers.set("content-type", "application/wasm");
    return new Response(res.body, { status: res.status, headers });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: "Video Compression Analyzer",
    backgroundColor: "#0a0a0a",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      additionalArguments: [`--vca-version=${app.getVersion()}`],
    },
  });

  const startUrl = DEV_URL || `${APP_SCHEME}://local/`;
  const isInternal = (url) => url.startsWith(`${APP_SCHEME}://`) || (DEV_URL && url.startsWith(DEV_URL));

  // Dış bağlantıları sistem tarayıcısında aç, uygulama içinde gezinmeye izin verme
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!isInternal(url)) {
      event.preventDefault();
      if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    }
  });

  mainWindow.once("ready-to-show", () => mainWindow && mainWindow.show());
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  void mainWindow.loadURL(startUrl);
}

function buildMenu() {
  const isMac = process.platform === "darwin";
  /** @type {Electron.MenuItemConstructorOptions[]} */
  const template = [
    ...(isMac ? [{ role: "appMenu" }] : []),
    {
      label: "Dosya",
      submenu: [
        {
          label: "Çıktı klasörünü seç…",
          click: () => mainWindow && mainWindow.webContents.send("vca:menu", "choose-output-dir"),
        },
        { type: "separator" },
        isMac ? { role: "close", label: "Kapat" } : { role: "quit", label: "Çıkış" },
      ],
    },
    { role: "editMenu", label: "Düzen" },
    {
      label: "Görünüm",
      submenu: [
        { role: "reload", label: "Yenile" },
        { role: "toggleDevTools", label: "Geliştirici araçları" },
        { type: "separator" },
        { role: "resetZoom", label: "Gerçek boyut" },
        { role: "zoomIn", label: "Yakınlaştır" },
        { role: "zoomOut", label: "Uzaklaştır" },
        { type: "separator" },
        { role: "togglefullscreen", label: "Tam ekran" },
      ],
    },
    { role: "windowMenu", label: "Pencere" },
    {
      role: "help",
      label: "Yardım",
      submenu: [
        {
          label: "FFmpeg belgeleri",
          click: () => shell.openExternal("https://ffmpeg.org/documentation.html"),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function uniquePath(dir, fileName) {
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  let candidate = path.join(dir, fileName);
  let n = 1;
  while (fs.existsSync(candidate) || preparedOutputs.has(candidate)) {
    candidate = path.join(dir, `${base} (${n++})${ext}`);
  }
  return candidate;
}

function assertString(value, name) {
  if (typeof value !== "string" || !value) throw new Error(`Geçersiz ${name}`);
  return value;
}

function registerIpc() {
  ipcMain.handle("vca:capabilities", (_e, refresh) => tools.getCapabilities(Boolean(refresh)));

  ipcMain.handle("vca:probe", (_e, filePath) => tools.probe(assertString(filePath, "dosya yolu")));

  ipcMain.handle("vca:thumbnail", (_e, filePath, at) => tools.thumbnail(assertString(filePath, "dosya yolu"), at));

  ipcMain.handle("vca:choose-output-dir", async () => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: "Çıktı klasörünü seçin",
      defaultPath: app.getPath("videos"),
      properties: ["openDirectory", "createDirectory"],
    });
    return res.canceled ? null : res.filePaths[0];
  });

  ipcMain.handle("vca:prepare-output", (_e, inputPath, fileName, outputDir) => {
    assertString(inputPath, "giriş yolu");
    const safeName = path.basename(assertString(fileName, "dosya adı"));
    const dir = outputDir && fs.existsSync(outputDir) ? outputDir : path.dirname(inputPath);
    const outputPath = uniquePath(dir, safeName);
    if (path.resolve(outputPath) === path.resolve(inputPath)) throw new Error("Çıktı, girişin üzerine yazamaz");
    const passLogFile = path.join(os.tmpdir(), `vca-pass-${crypto.randomUUID()}`);
    preparedOutputs.set(outputPath, passLogFile);
    return { outputPath, passLogFile, nullOutput: process.platform === "win32" ? "NUL" : "/dev/null" };
  });

  ipcMain.handle("vca:encode", async (event, job) => {
    assertString(job && job.id, "iş kimliği");
    const outputPath = assertString(job.outputPath, "çıktı yolu");
    const passLogFile = preparedOutputs.get(outputPath);
    if (passLogFile === undefined) throw new Error("Çıktı yolu hazırlanmamış");
    if (
      !Array.isArray(job.passes) ||
      job.passes.length === 0 ||
      job.passes.length > 2 ||
      !job.passes.every((p) => Array.isArray(p) && p.every((a) => typeof a === "string"))
    ) {
      throw new Error("Geçersiz FFmpeg argümanları");
    }
    // Son geçiş, sadece hazırlanan çıktı dosyasına yazabilir
    const last = job.passes[job.passes.length - 1];
    if (last[last.length - 1] !== outputPath) throw new Error("Çıktı yolu uyuşmuyor");

    const sender = event.sender;
    try {
      const result = await tools.encode(
        job,
        (progress) => {
          if (!sender.isDestroyed()) sender.send("vca:encode-progress", progress);
        },
        (child) => runningJobs.set(job.id, child),
      );
      knownOutputs.add(outputPath);
      return result;
    } catch (error) {
      fs.rmSync(outputPath, { force: true });
      if (error && error.message === "CANCELED") throw new Error("Dönüştürme iptal edildi");
      throw error;
    } finally {
      runningJobs.delete(job.id);
      preparedOutputs.delete(outputPath);
      for (const suffix of ["-0.log", "-0.log.mbtree", "-0.log.temp", "-0.log.mbtree.temp"]) {
        fs.rmSync(`${passLogFile}${suffix}`, { force: true });
      }
    }
  });

  ipcMain.handle("vca:cancel", (_e, id) => {
    const child = runningJobs.get(id);
    if (child && child.exitCode === null) {
      child.killedByUser = true;
      child.kill("SIGKILL");
    }
  });

  ipcMain.handle("vca:measure-quality", (_e, referencePath, distortedPath, trimStart) => {
    if (!knownOutputs.has(distortedPath)) throw new Error("Bilinmeyen çıktı dosyası");
    return tools.measureQuality(assertString(referencePath, "referans yolu"), distortedPath, Number(trimStart) || 0);
  });

  ipcMain.handle("vca:show-in-folder", (_e, filePath) => {
    if (knownOutputs.has(filePath)) shell.showItemInFolder(filePath);
  });

  ipcMain.handle("vca:open-path", async (_e, filePath) => {
    if (knownOutputs.has(filePath)) await shell.openPath(filePath);
  });
}

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  registerAppProtocol();
  registerIpc();
  buildMenu();
  createWindow();
  // FFmpeg ve GPU algılamayı arka planda başlat (ilk dönüştürme hızlı başlasın)
  tools.getCapabilities().catch((e) => console.warn("[vca] FFmpeg algılanamadı:", e.message));

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  for (const child of runningJobs.values()) child.kill("SIGKILL");
  if (process.platform !== "darwin") app.quit();
});
