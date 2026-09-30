"use client";

import { useEffect, useState } from "react";
import { Cpu, FolderOpen, Monitor, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Choice, Field, Toggle } from "@/components/converter/fields";
import {
  ENGINE_LABELS,
  getCodecRoutes,
  getNativeCapabilities,
  type CodecRoute,
  type EnginePreference,
  type TargetVideoCodec,
} from "@/lib/engine";
import type { DesktopCapabilities } from "@/lib/engine/desktop-bridge";
import { useSettingsStore } from "@/lib/store/settings-store";
import { useTranslation } from "@/lib/i18n/use-translation";
import { useDesktop } from "@/hooks/use-desktop";

export function EngineSettingsCard() {
  const { t } = useTranslation();
  const settings = useSettingsStore();
  const desktop = useDesktop();
  const [caps, setCaps] = useState<DesktopCapabilities | null>(null);
  const [capsError, setCapsError] = useState<string | null>(null);
  const [routes, setRoutes] = useState<Record<TargetVideoCodec, CodecRoute> | null>(null);

  useEffect(() => {
    getCodecRoutes().then(setRoutes).catch(() => undefined);
    if (desktop) {
      getNativeCapabilities().then(setCaps).catch((e) => setCapsError(String(e?.message ?? e)));
    }
  }, [desktop]);

  const refresh = () => {
    setCaps(null);
    setCapsError(null);
    getNativeCapabilities(true).then(setCaps).catch((e) => setCapsError(String(e?.message ?? e)));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu className="h-5 w-5" /> {t("appSettings.title")}
        </CardTitle>
        <CardDescription>{t("appSettings.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("enc.engine")} hint={t(desktop ? "appSettings.engineHintDesktop" : "appSettings.engineHint")}>
            <Choice
              value={settings.engine}
              onChange={(v) => settings.setEngine(v as EnginePreference)}
              options={
                desktop
                  ? [
                      { value: "auto", label: `${t("enc.auto")} (${ENGINE_LABELS.native})` },
                      { value: "native", label: ENGINE_LABELS.native },
                    ]
                  : [
                      { value: "auto", label: t("enc.auto") },
                      { value: "webcodecs", label: ENGINE_LABELS.webcodecs },
                      { value: "ffmpeg-wasm", label: ENGINE_LABELS["ffmpeg-wasm"] },
                    ]
              }
            />
          </Field>
          <Field label={t("enc.hardware")} hint={t("appSettings.hardwareHint")}>
            <Choice
              value={settings.hardware}
              onChange={(v) => settings.setHardware(v as typeof settings.hardware)}
              options={[
                { value: "auto", label: t("enc.auto") },
                { value: "prefer", label: t("enc.hardware.prefer") },
                { value: "off", label: t("enc.hardware.off") },
              ]}
            />
          </Field>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle
            checked={settings.autoMeasureQuality}
            onChange={settings.setAutoMeasureQuality}
            label={t("appSettings.autoQuality")}
            hint={t("appSettings.autoQualityHint")}
          />
          <Toggle
            checked={settings.skipLargerOutputs}
            onChange={settings.setSkipLargerOutputs}
            label={t("appSettings.skipLarger")}
            hint={t("appSettings.skipLargerHint")}
          />
        </div>

        {routes && (
          <div className="rounded-md bg-muted/40 p-3 text-xs">
            <p className="mb-2 font-medium">{t("appSettings.codecSupport")}</p>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
              {(Object.keys(routes) as TargetVideoCodec[]).map((c) => (
                <span key={c}>
                  <b>{c.toUpperCase()}</b>:{" "}
                  {routes[c] === "unsupported" ? t("enc.route.unsupported") : ENGINE_LABELS[routes[c] as keyof typeof ENGINE_LABELS]}
                </span>
              ))}
            </div>
          </div>
        )}

        {desktop && (
          <div className="space-y-3 rounded-md border p-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Monitor className="h-4 w-4" /> {t("desktop.section")}
            </p>
            <Field label={t("desktop.outputDir")} hint={t("desktop.outputDirHint")}>
              <div className="flex gap-2">
                <div className="flex h-9 flex-1 items-center truncate rounded-md border bg-muted/40 px-2 text-xs">
                  {settings.outputDir || t("desktop.nextToSource")}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={async () => {
                    const dir = await desktop.chooseOutputDir();
                    if (dir) settings.setOutputDir(dir);
                  }}
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
                {settings.outputDir && (
                  <Button variant="ghost" size="sm" className="h-9" onClick={() => settings.setOutputDir("")}>
                    {t("desktop.reset")}
                  </Button>
                )}
              </div>
            </Field>
            <div className="text-xs">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium">FFmpeg</span>
                <Button variant="ghost" size="sm" className="h-6 px-2" onClick={refresh}>
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
              {capsError && <p className="text-destructive">{capsError}</p>}
              {!caps && !capsError && <p className="text-muted-foreground">{t("desktop.detecting")}</p>}
              {caps && (
                <div className="grid gap-1 text-muted-foreground">
                  <span>{caps.ffmpegVersion}</span>
                  <span className="break-all">{caps.ffmpegPath}</span>
                  <span>
                    {t("desktop.gpu")}: <b className="text-foreground">{caps.hardwareLabel ?? t("desktop.noGpu")}</b>
                  </span>
                  {Object.entries(caps.hardwareEncoders).length > 0 && (
                    <span>{Object.values(caps.hardwareEncoders).join(", ")}</span>
                  )}
                  <span>CPU: {caps.cpuCount} {t("desktop.threads")}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
