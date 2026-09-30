import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EnginePreference } from "@/lib/engine/types";

interface SettingsStore {
  /** Dönüştürme motoru tercihi */
  engine: EnginePreference;
  /** Donanım hızlandırma */
  hardware: "auto" | "prefer" | "off";
  /** Masaüstü: çıktı klasörü (boşsa kaynak dosyanın yanına yazılır) */
  outputDir: string;
  /** Dönüştürme sonrası kalite skorunu otomatik ölç */
  autoMeasureQuality: boolean;
  /** Toplu dönüştürmede orijinalden büyük çıkan sonuçları atla (web: indirme) */
  skipLargerOutputs: boolean;
  setEngine: (engine: EnginePreference) => void;
  setHardware: (hardware: SettingsStore["hardware"]) => void;
  setOutputDir: (dir: string) => void;
  setAutoMeasureQuality: (value: boolean) => void;
  setSkipLargerOutputs: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      engine: "auto",
      hardware: "auto",
      outputDir: "",
      autoMeasureQuality: false,
      skipLargerOutputs: true,
      setEngine: (engine) => set({ engine }),
      setHardware: (hardware) => set({ hardware }),
      setOutputDir: (outputDir) => set({ outputDir }),
      setAutoMeasureQuality: (autoMeasureQuality) => set({ autoMeasureQuality }),
      setSkipLargerOutputs: (skipLargerOutputs) => set({ skipLargerOutputs }),
    }),
    { name: "vca-settings" },
  ),
);
