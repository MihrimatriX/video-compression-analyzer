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

export default function SettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold">
          {t("settings.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("settings.subtitle")}
        </p>
      </div>

      <Tabs defaultValue="codecs" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="codecs">{t("settings.tabs.codecs")}</TabsTrigger>
          <TabsTrigger value="bitrate">
            {t("settings.tabs.bitrate")}
          </TabsTrigger>
          <TabsTrigger value="crf">{t("settings.tabs.crf")}</TabsTrigger>
          <TabsTrigger value="presets">
            {t("settings.tabs.presets")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="codecs" className="space-y-4">
          {/* H.264 */}
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.codec.h264.title")}</CardTitle>
              <CardDescription>
                {t("settings.codec.h264.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">
                  {t("settings.advantages")}
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>{t("settings.codec.h264.adv1")}</li>
                  <li>{t("settings.codec.h264.adv2")}</li>
                  <li>{t("settings.codec.h264.adv3")}</li>
                  <li>{t("settings.codec.h264.adv4")}</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">
                  {t("settings.disadvantages")}
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>{t("settings.codec.h264.dis1")}</li>
                  <li>{t("settings.codec.h264.dis2")}</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">
                  {t("settings.recommendations")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("settings.codec.h264.rec")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* H.265 */}
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.codec.h265.title")}</CardTitle>
              <CardDescription>
                {t("settings.codec.h265.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">
                  {t("settings.advantages")}
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>{t("settings.codec.h265.adv1")}</li>
                  <li>{t("settings.codec.h265.adv2")}</li>
                  <li>{t("settings.codec.h265.adv3")}</li>
                  <li>{t("settings.codec.h265.adv4")}</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">
                  {t("settings.disadvantages")}
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>{t("settings.codec.h265.dis1")}</li>
                  <li>{t("settings.codec.h265.dis2")}</li>
                  <li>{t("settings.codec.h265.dis3")}</li>
                  <li>{t("settings.codec.h265.dis4")}</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">
                  {t("settings.recommendations")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("settings.codec.h265.rec")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* VP9 */}
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.codec.vp9.title")}</CardTitle>
              <CardDescription>
                {t("settings.codec.vp9.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">
                  {t("settings.advantages")}
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>{t("settings.codec.vp9.adv1")}</li>
                  <li>{t("settings.codec.vp9.adv2")}</li>
                  <li>{t("settings.codec.vp9.adv3")}</li>
                  <li>{t("settings.codec.vp9.adv4")}</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">
                  {t("settings.disadvantages")}
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>{t("settings.codec.vp9.dis1")}</li>
                  <li>{t("settings.codec.vp9.dis2")}</li>
                  <li>{t("settings.codec.vp9.dis3")}</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">
                  {t("settings.recommendations")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("settings.codec.vp9.rec")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* AV1 */}
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.codec.av1.title")}</CardTitle>
              <CardDescription>
                {t("settings.codec.av1.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">
                  {t("settings.advantages")}
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>{t("settings.codec.av1.adv1")}</li>
                  <li>{t("settings.codec.av1.adv2")}</li>
                  <li>{t("settings.codec.av1.adv3")}</li>
                  <li>{t("settings.codec.av1.adv4")}</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">
                  {t("settings.disadvantages")}
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>{t("settings.codec.av1.dis1")}</li>
                  <li>{t("settings.codec.av1.dis2")}</li>
                  <li>{t("settings.codec.av1.dis3")}</li>
                  <li>{t("settings.codec.av1.dis4")}</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">
                  {t("settings.recommendations")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("settings.codec.av1.rec")}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bitrate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.bitrate.title")}</CardTitle>
              <CardDescription>
                {t("settings.bitrate.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("settings.bitrate.intro")}
              </p>
              <div>
                <h3 className="font-semibold mb-2">
                  {t("settings.bitrate.high")}
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>{t("settings.bitrate.high1")}</li>
                  <li>{t("settings.bitrate.high2")}</li>
                  <li>{t("settings.bitrate.high3")}</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">
                  {t("settings.bitrate.low")}
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>{t("settings.bitrate.low1")}</li>
                  <li>{t("settings.bitrate.low2")}</li>
                  <li>{t("settings.bitrate.low3")}</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">
                  {t("settings.bitrate.recommended")}
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>
                    <strong>480p:</strong> 1-2 Mbps
                  </li>
                  <li>
                    <strong>720p:</strong> 2-5 Mbps
                  </li>
                  <li>
                    <strong>1080p:</strong> 5-10 Mbps
                  </li>
                  <li>
                    <strong>1440p (2K):</strong> 10-20 Mbps
                  </li>
                  <li>
                    <strong>2160p (4K):</strong> 20-50 Mbps
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crf" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.crf.title")}</CardTitle>
              <CardDescription>{t("settings.crf.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("settings.crf.intro")}
              </p>
              <div>
                <h3 className="font-semibold mb-2">
                  {t("settings.crf.range")}
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>
                    <strong>0-18:</strong> {t("settings.crf.range1")}
                  </li>
                  <li>
                    <strong>19-23:</strong> {t("settings.crf.range2")}
                  </li>
                  <li>
                    <strong>24-28:</strong> {t("settings.crf.range3")}
                  </li>
                  <li>
                    <strong>29-32:</strong> {t("settings.crf.range4")}
                  </li>
                  <li>
                    <strong>33+:</strong> {t("settings.crf.range5")}
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">
                  {t("settings.crf.vp9av1")}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {t("settings.crf.vp9av1.intro")}
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>
                    <strong>30-35:</strong> {t("settings.crf.vp9av1.1")}
                  </li>
                  <li>
                    <strong>36-40:</strong> {t("settings.crf.vp9av1.2")}
                  </li>
                  <li>
                    <strong>41-45:</strong> {t("settings.crf.vp9av1.3")}
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">{t("settings.crf.vs")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("settings.crf.vs.text")}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="presets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.presets.title")}</CardTitle>
              <CardDescription>
                {t("settings.presets.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("settings.presets.intro")}
              </p>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">
                    {t("settings.presets.ultrafast")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.presets.ultrafast.desc")}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">
                    {t("settings.presets.fast")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.presets.fast.desc")}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">
                    {t("settings.presets.medium")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.presets.medium.desc")}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">
                    {t("settings.presets.slow")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.presets.slow.desc")}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">
                  {t("settings.presets.suggestions")}
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>
                    {t("settings.presets.sug1")} <strong>fast</strong>
                  </li>
                  <li>
                    {t("settings.presets.sug2")} <strong>medium</strong>
                  </li>
                  <li>
                    {t("settings.presets.sug3")} <strong>slow</strong>
                  </li>
                  <li>
                    {t("settings.presets.sug4")} <strong>slower</strong> veya{" "}
                    <strong>veryslow</strong>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
