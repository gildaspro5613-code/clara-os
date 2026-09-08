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
import { locales, LOCALE_COOKIE, resolveLocale } from "@/i18n/config";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("common");

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = resolveLocale(event.target.value);
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; SameSite=Lax`;
    setIsReloading(true);
    window.location.reload();
  }

  return (
    <select
      value={currentLocale}
      lang="zxx"
      translate="no"
      onChange={handleChange}
      disabled={isReloading}
      aria-label={t("language")}
      className="notranslate rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-400 transition hover:bg-white/10 hover:text-white focus:outline-none disabled:opacity-50"
    >
      {locales.map((locale) => (
        <option key={locale} value={locale} lang="zxx" translate="no" className="notranslate bg-[#08111F] text-white">
          {LOCALE_LABELS[locale]}
        </option>
      ))}
    </select>
  );
}
