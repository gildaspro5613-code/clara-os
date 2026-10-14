import { defaultLocale, locales } from "./config";
import type { Locale } from "./types";

export const CLARA_RESPONSE_LANGUAGE: Record<Locale, string> = {
  fr: "français",
  en: "anglais",
  es: "espagnol",
  de: "allemand",
  it: "italien",
};

export function responseLanguageInstruction(locale: Locale): string {
  return `Réponds en ${CLARA_RESPONSE_LANGUAGE[locale]}, langue sélectionnée dans Clara OS. Préserve les citations et données métier originales, sans les réécrire ni les traduire en base.`;
}

export function isSupportedLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.includes(value as Locale);
}

export function safeResponseLocale(value: unknown): Locale {
  return isSupportedLocale(value) ? value : defaultLocale;
}
