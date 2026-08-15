"use client";

/**
 * ============================================
 * CLARA OS — I18N FOUNDATION
 * --------------------------------------------
 * File : LocaleSwitcher.tsx
 * Responsibility : Client component allowing the user to switch
 * the active locale. Persists the choice in the NEXT_LOCALE cookie
 * and reloads the page so the server resolves the new messages.
 * ============================================
 */

import { useState } from "react";
import { locales, LOCALE_COOKIE } from "@/i18n/config";
import type { Locale } from "@/i18n/types";

const LOCALE_LABELS: Record<Locale, string> = {
  fr: "FR",
  en: "EN",
  es: "ES",
  de: "DE",
  it: "IT",
};

interface LocaleSwitcherProps {
  currentLocale: Locale;
}

/**
 * Renders a compact locale selector that updates the NEXT_LOCALE cookie
 * and reloads the current page to apply the new locale.
 */
export default function LocaleSwitcher({ currentLocale }: LocaleSwitcherProps) {
  const [isReloading, setIsReloading] = useState(false);

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value as Locale;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; SameSite=Lax`;
    setIsReloading(true);
    window.location.reload();
  }

  return (
    <select
      value={currentLocale}
      onChange={handleChange}
      disabled={isReloading}
      aria-label="Language"
      className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-400 transition hover:bg-white/10 hover:text-white focus:outline-none disabled:opacity-50"
    >
      {locales.map((locale) => (
        <option key={locale} value={locale} className="bg-[#08111F] text-white">
          {LOCALE_LABELS[locale]}
        </option>
      ))}
    </select>
  );
}
