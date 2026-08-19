/**
 * ============================================
 * CLARA OS — I18N FOUNDATION
 * --------------------------------------------
 * File : config.ts
 * Responsibility : Central i18n configuration.
 * Locales, default locale, fallback strategy.
 * ============================================
 */

import type { Locale } from "./types";

/** All supported locales in Clara OS V1. */
export const locales: Locale[] = ["fr", "en", "es", "de", "it"];

/** Default locale for Clara OS V1. */
export const defaultLocale: Locale = "fr";

/**
 * Fallback locale used when a translation key is missing.
 * Always falls back to French to avoid empty UI.
 */
export const fallbackLocale: Locale = "fr";

/** Cookie name used to persist the active locale client-side. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/**
 * Resolves a raw string to a valid Locale.
 * Returns the default locale if the value is not recognised.
 *
 * @param value - Any string (from cookie, header, URL param…)
 * @returns A valid Locale.
 */
export function resolveLocale(value: string | null | undefined): Locale {
  if (value && (locales as string[]).includes(value)) {
    return value as Locale;
  }
  return defaultLocale;
}
