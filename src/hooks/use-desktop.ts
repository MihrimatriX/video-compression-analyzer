"use client";

import { useSyncExternalStore } from "react";
import { getDesktop, type DesktopBridge } from "@/lib/engine/desktop-bridge";

const subscribe = () => () => {};

/**
 * Masaüstü köprüsü (Electron) varsa döndürür. Statik HTML her zaman tarayıcı sürümüyle
 * üretildiği için hidrasyon sırasında null döner, ardından gerçek değere geçer
 * (doğrudan render içinde getDesktop() çağırmak hidrasyon uyuşmazlığı yaratır).
 */
export function useDesktop(): DesktopBridge | null {
  return useSyncExternalStore(subscribe, getDesktop, () => null);
}
