// Renderer'a açılan güvenli köprü: window.vcaDesktop
// (contextIsolation + sandbox açık; Node API'leri renderer'a sızmaz)
"use strict";

const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("vcaDesktop", {
  isDesktop: true,
  platform: process.platform,
  appVersion: (process.argv.find((a) => a.startsWith("--vca-version=")) || "").slice("--vca-version=".length),
  getPathForFile: (file) => webUtils.getPathForFile(file),
  getCapabilities: (refresh) => ipcRenderer.invoke("vca:capabilities", Boolean(refresh)),
  probe: (filePath) => ipcRenderer.invoke("vca:probe", filePath),
  thumbnail: (filePath, at) => ipcRenderer.invoke("vca:thumbnail", filePath, at),
  chooseOutputDir: () => ipcRenderer.invoke("vca:choose-output-dir"),
  prepareOutput: (inputPath, fileName, outputDir) =>
    ipcRenderer.invoke("vca:prepare-output", inputPath, fileName, outputDir),
  encode: (job) => ipcRenderer.invoke("vca:encode", job),
  cancelEncode: (id) => ipcRenderer.invoke("vca:cancel", id),
  onEncodeProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on("vca:encode-progress", listener);
    return () => ipcRenderer.removeListener("vca:encode-progress", listener);
  },
  onMenuCommand: (callback) => {
    const listener = (_event, command) => callback(command);
    ipcRenderer.on("vca:menu", listener);
    return () => ipcRenderer.removeListener("vca:menu", listener);
  },
  measureQuality: (referencePath, distortedPath, trimStart) =>
    ipcRenderer.invoke("vca:measure-quality", referencePath, distortedPath, trimStart),
  showInFolder: (filePath) => ipcRenderer.invoke("vca:show-in-folder", filePath),
  openPath: (filePath) => ipcRenderer.invoke("vca:open-path", filePath),
});
