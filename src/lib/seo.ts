import type { Metadata } from "next";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://vid-report.ahmetfuzunkaya.com"
).replace(/\/$/, "");

export const siteConfig = {
  name: "Video Sıkıştırma Analiz Aracı",
  nameEn: "Video Compression Analysis Tool",
  shortName: "VidReport",
  description:
    "Videolarınızı tarayıcıda analiz edin, H.264/H.265/VP9/AV1 için optimal sıkıştırma ayarları ve hazır FFmpeg komutları alın. Dosyalar cihazınızdan çıkmaz.",
  descriptionEn:
    "Analyze videos in your browser, get optimal H.264/H.265/VP9/AV1 compression settings and ready-to-use FFmpeg commands. Files never leave your device.",
  url: SITE_URL,
  locale: "tr_TR",
  alternateLocale: "en_US",
  creator: "MihrimatriX",
  keywords: [
    "video sıkıştırma",
    "video compression",
    "ffmpeg",
    "video analyzer",
    "H.264",
    "H.265",
    "HEVC",
    "VP9",
    "AV1",
    "CRF",
    "bitrate",
    "client-side",
    "privacy",
    "video codec",
    "sıkıştırma analizi",
  ],
} as const;

type PageSeo = {
  path: string;
  title: string;
  description: string;
};

export const pages = {
  home: {
    path: "/",
    title: siteConfig.name,
    description: siteConfig.description,
  },
  converter: {
    path: "/converter",
    title: "Video Dönüştürücü",
    description:
      "Videolarınızı tarayıcıda dönüştürün. Codec, çözünürlük, bitrate ve kalite ayarlarıyla client-side video encoding.",
  },
  compare: {
    path: "/compare",
    title: "Video Karşılaştırma",
    description:
      "İki videoyu yan yana, senkron oynatma ve zoom ile karşılaştırın. Sıkıştırma kalitesini görsel olarak değerlendirin.",
  },
  settings: {
    path: "/settings",
    title: "Video Sıkıştırma Ayarları",
    description:
      "H.264, H.265, VP9, AV1 codec'leri, bitrate, CRF ve encoding preset'leri hakkında detaylı açıklamalar.",
  },
  ffmpegGuide: {
    path: "/ffmpeg-guide",
    title: "FFmpeg Kullanım Rehberi",
    description:
      "FFmpeg komut satırı kullanımı, codec örnekleri, performans ipuçları ve yaygın hataların çözümleri.",
  },
} as const satisfies Record<string, PageSeo>;

export type PageKey = keyof typeof pages;

export function createPageMetadata(pageKey: PageKey): Metadata {
  const page = pages[pageKey];
  const url = `${SITE_URL}${page.path === "/" ? "" : page.path}`;
  const isHome = pageKey === "home";

  return {
    title: isHome
      ? {
          absolute: siteConfig.name,
        }
      : page.title,
    description: page.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: page.title,
      description: page.description,
      url,
      locale: siteConfig.locale,
      alternateLocale: [siteConfig.alternateLocale],
      type: "website",
      siteName: siteConfig.name,
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
    },
  };
}

export function buildWebApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: siteConfig.name,
    alternateName: siteConfig.nameEn,
    description: siteConfig.description,
    url: SITE_URL,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    inLanguage: ["tr", "en"],
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Video metadata analysis",
      "H.264, H.265, VP9, AV1 recommendations",
      "FFmpeg command generation",
      "Side-by-side video comparison",
      "Client-side processing — no uploads",
    ],
    creator: {
      "@type": "Person",
      name: siteConfig.creator,
      url: "https://github.com/MihrimatriX",
    },
  };
}

export function buildWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    alternateName: [siteConfig.nameEn, siteConfig.shortName],
    url: SITE_URL,
    description: siteConfig.description,
    inLanguage: ["tr", "en"],
    publisher: {
      "@type": "Person",
      name: siteConfig.creator,
    },
  };
}
