import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata("converter");

export default function ConverterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
