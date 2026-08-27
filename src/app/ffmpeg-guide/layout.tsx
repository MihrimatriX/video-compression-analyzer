import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata("ffmpegGuide");

export default function FfmpegGuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
