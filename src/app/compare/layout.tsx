import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata("compare");

export default function CompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
