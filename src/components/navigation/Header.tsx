"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileVideo, Settings, BookOpen, GitCompare } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { useTranslation } from "@/lib/i18n/use-translation";

export function Header() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const navItems = [
    { href: "/", label: t("nav.home"), icon: FileVideo },
    { href: "/compare", label: t("nav.compare"), icon: GitCompare },
    { href: "/settings", label: t("nav.settings"), icon: Settings },
    { href: "/ffmpeg-guide", label: t("nav.ffmpegGuide"), icon: BookOpen },
  ];

  return (
    <>
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-lg"
      >
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link
              href="/"
              className="flex items-center space-x-2 group transition-all"
            >
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                <FileVideo className="h-6 w-6 text-primary" />
              </motion.div>
              <span className="font-bold text-base bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent bg-[length:200%_auto] animate-[shimmer_3s_linear_infinite]">
                {t("app.title").split(" ").slice(0, 2).join(" ")}
              </span>
            </Link>
          </motion.div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all group",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute inset-0 bg-primary/10 rounded-lg -z-10"
                        initial={false}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    {!isActive && (
                      <motion.div
                        className="absolute inset-0 bg-muted/50 rounded-lg -z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                        initial={false}
                      />
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-1 border-l pl-2 ml-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </motion.header>
    </>
  );
}
