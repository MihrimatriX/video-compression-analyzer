"use client";

import { useLanguageStore } from "@/lib/store/language-store";
import { translations, type TranslationKey } from "./translations";
import { useMemo } from "react";

export type TranslationFunction = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string;

export function useTranslation() {
  const language = useLanguageStore((state) => state.language);

  const t = useMemo(
    () =>
      (
        key: TranslationKey,
        params?: Record<string, string | number>
      ): string => {
        let text: string = translations[language][key] || key;

        // Replace placeholders like {size} with actual values
        if (params) {
          Object.entries(params).forEach(([paramKey, paramValue]) => {
            text = text.replace(
              new RegExp(`\\{${paramKey}\\}`, "g"),
              String(paramValue)
            );
          });
        }

        return text;
      },
    [language]
  );

  return { t, language };
}
