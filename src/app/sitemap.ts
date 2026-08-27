import type { MetadataRoute } from "next";
import { pages, SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return Object.values(pages).map((page) => ({
    url: `${SITE_URL}${page.path === "/" ? "" : page.path}`,
    lastModified,
    changeFrequency: page.path === "/" ? "weekly" : "monthly",
    priority: page.path === "/" ? 1 : 0.7,
  }));
}
