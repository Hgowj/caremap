"use client";

import { useMemo } from "react";
import en from "../messages/en.json";
import zh from "../messages/zh.json";
import th from "../messages/th.json";
import tl from "../messages/tl.json";
import ta from "../messages/ta.json";

const ALL: Record<string, Record<string, Record<string, string>>> = {
  en: en as any,
  zh: zh as any,
  th: th as any,
  tl: tl as any,
  ta: ta as any,
};

export function useLocale(): string {
  if (typeof document === "undefined") return "en";
  try {
    const match = document.cookie.match(/cm_locale=([^;]+)/);
    const raw   = match?.[1] ?? "en";
    return ["en", "zh", "th", "tl", "ta"].includes(raw) ? raw : "en";
  } catch {
    return "en";
  }
}

export function useTranslations(namespace: string) {
  const locale = useLocale();

  const messages = useMemo(() => {
    return ALL[locale]?.[namespace] ?? ALL["en"]?.[namespace] ?? {};
  }, [locale, namespace]);

  return function t(key: string, fallback?: string): string {
    const val = (messages as Record<string, string>)[key];
    if (typeof val === "string") return val;
    const enVal = (ALL["en"]?.[namespace] as Record<string, string>)?.[key];
    if (typeof enVal === "string") return enVal;
    return fallback ?? key;
  };
}