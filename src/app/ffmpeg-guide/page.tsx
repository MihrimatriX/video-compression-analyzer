"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function FFmpegGuidePage() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold">{t("guide.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("guide.subtitle")}</p>
      </div>

      <Tabs defaultValue="basics" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basics">{t("guide.tabs.basics")}</TabsTrigger>
          <TabsTrigger value="codecs">{t("guide.tabs.codecs")}</TabsTrigger>
          <TabsTrigger value="tips">{t("guide.tabs.tips")}</TabsTrigger>
          <TabsTrigger value="common">{t("guide.tabs.common")}</TabsTrigger>
        </TabsList>

        <TabsContent value="basics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("guide.basics.structure.title")}</CardTitle>
              <CardDescription>
                {t("guide.basics.structure.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md bg-muted p-4">
                <code className="text-sm">
                  ffmpeg -i input.mp4 [options] output.mp4
                </code>
              </div>
              <div>
                <h3 className="font-semibold mb-2">
                  {t("guide.basics.parameters")}
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>
                    <strong>-i:</strong> {t("guide.basics.param.i")}
                  </li>
                  <li>
                    <strong>-c:v:</strong> {t("guide.basics.param.cv")}
                  </li>
                  <li>
                    <strong>-c:a:</strong> {t("guide.basics.param.ca")}
                  </li>
                  <li>
                    <strong>-b:v:</strong> {t("guide.basics.param.bv")}
                  </li>
                  <li>
                    <strong>-b:a:</strong> {t("guide.basics.param.ba")}
                  </li>
                  <li>
                    <strong>-crf:</strong> {t("guide.basics.param.crf")}
                  </li>
                  <li>
                    <strong>-preset:</strong> {t("guide.basics.param.preset")}
                  </li>
                  <li>
                    <strong>-vf:</strong> {t("guide.basics.param.vf")}
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("guide.basics.install.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">
                  {t("guide.basics.install.windows")}
                </h3>
                <div className="rounded-md bg-muted p-4">
                  <code className="text-sm">
                    {t("guide.basics.install.windows.choco")}
                    <br />
                    choco install ffmpeg
                    <br />
                    <br />
                    {t("guide.basics.install.windows.manual")}
                  </code>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">
                  {t("guide.basics.install.macos")}
                </h3>
                <div className="rounded-md bg-muted p-4">
                  <code className="text-sm">
                    {t("guide.basics.install.macos.brew")}
                    <br />
                    brew install ffmpeg
                  </code>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">
                  {t("guide.basics.install.linux")}
                </h3>
                <div className="rounded-md bg-muted p-4">
                  <code className="text-sm">
                    # Ubuntu/Debian
                    <br />
                    sudo apt update
                    <br />
                    sudo apt install ffmpeg
                    <br />
                    <br />
                    # Fedora/RHEL
                    <br />
                    sudo dnf install ffmpeg
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="codecs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("guide.codecs.h264.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">
                  {t("guide.codecs.h264.crf")}
                </h3>
                <div className="rounded-md bg-muted p-4">
                  <code className="text-sm">
                    ffmpeg -i input.mp4 -c:v libx264 -crf 23 -preset medium -c:a
                    aac -b:a 128k output.mp4
                  </code>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">
                  {t("guide.codecs.h264.bitrate")}
                </h3>
                <div className="rounded-md bg-muted p-4">
                  <code className="text-sm">
                    ffmpeg -i input.mp4 -c:v libx264 -b:v 5M -preset medium -c:a
                    aac -b:a 128k output.mp4
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("guide.codecs.h265.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">
                  {t("guide.codecs.h265.crf")}
                </h3>
                <div className="rounded-md bg-muted p-4">
                  <code className="text-sm">
                    ffmpeg -i input.mp4 -c:v libx265 -crf 28 -preset medium -c:a
                    aac -b:a 128k output.mp4
                  </code>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">
                  {t("guide.codecs.h265.bitrate")}
                </h3>
                <div className="rounded-md bg-muted p-4">
                  <code className="text-sm">
                    ffmpeg -i input.mp4 -c:v libx265 -b:v 3M -preset slow -c:a
                    aac -b:a 128k output.mp4
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("guide.codecs.vp9.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">
                  {t("guide.codecs.vp9.quality")}
                </h3>
                <div className="rounded-md bg-muted p-4">
                  <code className="text-sm">
                    ffmpeg -i input.mp4 -c:v libvpx-vp9 -crf 32 -b:v 0 -c:a
                    libopus -b:a 128k output.webm
                  </code>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">
                  {t("guide.codecs.vp9.bitrate")}
                </h3>
                <div className="rounded-md bg-muted p-4">
                  <code className="text-sm">
                    ffmpeg -i input.mp4 -c:v libvpx-vp9 -b:v 2M -c:a libopus
                    -b:a 128k output.webm
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("guide.codecs.av1.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">
                  {t("guide.codecs.av1.quality")}
                </h3>
                <div className="rounded-md bg-muted p-4">
                  <code className="text-sm">
                    ffmpeg -i input.mp4 -c:v libaom-av1 -crf 35 -b:v 0 -c:a
                    libopus -b:a 128k output.webm
                  </code>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                <strong>{t("guide.codecs.av1.note")}</strong>{" "}
                {t("guide.codecs.av1.note.text")}
              </p>
              <div className="rounded-md bg-muted p-4">
                <code className="text-sm">
                  ffmpeg -i input.mp4 -c:v libaom-av1 -crf 35 -b:v 0 -cpu-used 4
                  -c:a libopus -b:a 128k output.webm
                </code>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tips" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("guide.tips.performance.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">
                  {t("guide.tips.hwaccel.title")}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {t("guide.tips.hwaccel.desc")}
                </p>
                <div className="rounded-md bg-muted p-4">
                  <code className="text-sm">
                    # NVIDIA GPU
                    <br />
                    ffmpeg -hwaccel cuda -i input.mp4 -c:v h264_nvenc output.mp4
                    <br />
                    <br />
                    # Intel Quick Sync
                    <br />
                    ffmpeg -hwaccel qsv -i input.mp4 -c:v h264_qsv output.mp4
                  </code>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">
                  {t("guide.tips.threads.title")}
                </h3>
                <div className="rounded-md bg-muted p-4">
                  <code className="text-sm">
                    ffmpeg -threads 8 -i input.mp4 -c:v libx264 output.mp4
                  </code>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">
                  {t("guide.tips.twopass.title")}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {t("guide.tips.twopass.desc")}
                </p>
                <div className="rounded-md bg-muted p-4">
                  <code className="text-sm">
                    {t("guide.tips.twopass.first")}
                    <br />
                    ffmpeg -i input.mp4 -c:v libx264 -b:v 5M -pass 1 -f null
                    /dev/null
                    <br />
                    <br />
                    {t("guide.tips.twopass.second")}
                    <br />
                    ffmpeg -i input.mp4 -c:v libx264 -b:v 5M -pass 2 output.mp4
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("guide.tips.scale.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">
                  {t("guide.tips.scale.scaling")}
                </h3>
                <div className="rounded-md bg-muted p-4">
                  <code className="text-sm">
                    {t("guide.tips.scale.specific")}
                    <br />
                    ffmpeg -i input.mp4 -vf scale=1920:1080 output.mp4
                    <br />
                    <br />
                    {t("guide.tips.scale.width")}
                    <br />
                    ffmpeg -i input.mp4 -vf scale=1920:-1 output.mp4
                    <br />
                    <br />
                    {t("guide.tips.scale.height")}
                    <br />
                    ffmpeg -i input.mp4 -vf scale=-1:1080 output.mp4
                  </code>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">
                  {t("guide.tips.scale.aspect")}
                </h3>
                <div className="rounded-md bg-muted p-4">
                  <code className="text-sm">
                    ffmpeg -i input.mp4 -vf
                    scale=1920:1080:force_original_aspect_ratio=decrease
                    output.mp4
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("guide.tips.batch.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">
                  {t("guide.tips.batch.process")}
                </h3>
                <div className="rounded-md bg-muted p-4">
                  <code className="text-sm whitespace-pre">
                    {`# Linux/macOS
for file in *.mp4; do
  ffmpeg -i "$file" -c:v libx264 -crf 23 "${"${file%.mp4}"}_compressed.mp4"
done

# Windows (PowerShell)
Get-ChildItem *.mp4 | ForEach-Object {
  ffmpeg -i $_.Name -c:v libx264 -crf 23 "$($_.BaseName)_compressed.mp4"
}`}
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="common" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("guide.errors.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">
                  {t("guide.errors.codec.title")}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>{t("guide.errors.codec.reason")}</strong>{" "}
                  {t("guide.errors.codec.reason.text")}
                  <br />
                  <strong>{t("guide.errors.codec.solution")}</strong>{" "}
                  {t("guide.errors.codec.solution.text")}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">
                  {t("guide.errors.permission.title")}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>{t("guide.errors.codec.reason")}</strong>{" "}
                  {t("guide.errors.permission.reason.text")}
                  <br />
                  <strong>{t("guide.errors.codec.solution")}</strong>{" "}
                  {t("guide.errors.permission.solution.text")}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">
                  {t("guide.errors.slow.title")}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>{t("guide.errors.codec.reason")}</strong>{" "}
                  {t("guide.errors.slow.reason.text")}
                  <br />
                  <strong>{t("guide.errors.codec.solution")}</strong>{" "}
                  {t("guide.errors.slow.solution.text")}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">
                  {t("guide.errors.large.title")}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>{t("guide.errors.codec.reason")}</strong>{" "}
                  {t("guide.errors.large.reason.text")}
                  <br />
                  <strong>{t("guide.errors.codec.solution")}</strong>{" "}
                  {t("guide.errors.large.solution.text")}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">
                  {t("guide.errors.quality.title")}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>{t("guide.errors.codec.reason")}</strong>{" "}
                  {t("guide.errors.quality.reason.text")}
                  <br />
                  <strong>{t("guide.errors.codec.solution")}</strong>{" "}
                  {t("guide.errors.quality.solution.text")}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
