"use client";

import { useLanguageStore } from "@/lib/store/language-store";
import { translations, type TranslationKey } from "./translations";

export function useTranslation() {
  const language = useLanguageStore((state) => state.language);

  const t = (key: TranslationKey): string => {
    return translations[language][key] || key;
  };

  return { t, language };
}
