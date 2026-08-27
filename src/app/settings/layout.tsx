import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata("settings");

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
