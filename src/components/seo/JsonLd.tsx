import { buildWebApplicationJsonLd, buildWebSiteJsonLd } from "@/lib/seo";

export function JsonLd() {
  const data = [buildWebSiteJsonLd(), buildWebApplicationJsonLd()];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
