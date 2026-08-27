"use client";

import { useEffect } from "react";
import { useLanguageStore } from "@/lib/store/language-store";

/** Syncs <html lang> with the user's language preference. */
export function HtmlLang() {
  const language = useLanguageStore((s) => s.language);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return null;
}
