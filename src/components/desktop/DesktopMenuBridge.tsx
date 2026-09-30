"use client";

import { useEffect } from "react";
import { getDesktop } from "@/lib/engine/desktop-bridge";
import { useSettingsStore } from "@/lib/store/settings-store";

/** Masaüstü uygulama menüsünden gelen komutları uygular. Tarayıcıda hiçbir şey yapmaz. */
export function DesktopMenuBridge() {
  const setOutputDir = useSettingsStore((s) => s.setOutputDir);
  useEffect(() => {
    const desktop = getDesktop();
    if (!desktop) return;
    return desktop.onMenuCommand(async (command) => {
      if (command === "choose-output-dir") {
        const dir = await desktop.chooseOutputDir();
        if (dir) setOutputDir(dir);
      }
    });
  }, [setOutputDir]);
  return null;
}
