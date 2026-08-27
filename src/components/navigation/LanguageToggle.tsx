"use client";

import { Button } from "@/components/ui/button";
import { useLanguageStore } from "@/lib/store/language-store";
import type { Language } from "@/lib/i18n/translations";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguageStore();

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: "tr", label: "Türkçe", flag: "🇹🇷" },
    { code: "en", label: "English", flag: "🇬🇧" },
  ];

  const currentLang =
    languages.find((l) => l.code === language) || languages[0];
  const nextLang = languages.find((l) => l.code !== language) || languages[1];

  const handleToggle = () => {
    const nextLangCode = language === "tr" ? "en" : "tr";
    setLanguage(nextLangCode);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      className="h-9 px-2 gap-1.5 hover:bg-muted transition-colors"
      title={`${language === "tr" ? "Switch to English" : "Türkçe'ye geç"}: ${
        nextLang.label
      }`}
    >
      <span className="text-base">{currentLang.flag}</span>
      <span className="text-xs font-medium">
        {currentLang.code.toUpperCase()}
      </span>
    </Button>
  );
}
