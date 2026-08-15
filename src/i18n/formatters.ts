/**
 * ============================================
 * CLARA OS — I18N FOUNDATION
 * --------------------------------------------
 * File : formatters.ts
 * Responsibility : Helpers for internationalised formatting.
 * Wraps the native Intl API so later LOTs can use consistent
 * date, number, currency and relative-time formatting.
 * ============================================
 */

import type { Locale } from "./types";

// ---------------------------------------------------------------------------
// Date & time
// ---------------------------------------------------------------------------

/**
 * Formats a date value according to the active locale.
 *
 * @example formatDate(new Date(), "fr") // "15 août 2026"
 */
export function formatDate(
  value: Date | number,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  }
): string {
  return new Intl.DateTimeFormat(locale, options).format(value);
}

/**
 * Formats a time value according to the active locale.
 *
 * @example formatTime(new Date(), "fr") // "14:30"
 */
export function formatTime(
  value: Date | number,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
  }
): string {
  return new Intl.DateTimeFormat(locale, options).format(value);
}

/**
 * Formats a relative time string (e.g., "il y a 3 jours").
 *
 * @example formatRelativeTime(-3, "day", "fr") // "il y a 3 jours"
 */
export function formatRelativeTime(
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  locale: Locale
): string {
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
    value,
    unit
  );
}

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

/**
 * Formats a number according to the active locale.
 *
 * @example formatNumber(1234567.89, "fr") // "1 234 567,89"
 */
export function formatNumber(
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Formats a monetary value according to the active locale.
 *
 * @example formatCurrency(1500, "fr", "EUR") // "1 500,00 €"
 */
export function formatCurrency(
  value: number,
  locale: Locale,
  currency = "EUR"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(value);
}

// ---------------------------------------------------------------------------
// Pluralisation
// ---------------------------------------------------------------------------

/**
 * Returns the plural category for a given count and locale.
 * Useful to select the correct translation variant.
 *
 * @example getPluralRule(3, "fr") // "other"
 */
export function getPluralRule(
  count: number,
  locale: Locale
): Intl.LDMLPluralRule {
  return new Intl.PluralRules(locale).select(count);
}
