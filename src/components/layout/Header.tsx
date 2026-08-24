"use client";

import { Bell, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

import LocaleSwitcher from "@/components/ui/LocaleSwitcher";
import type { Locale } from "@/i18n/types";

const pageTitleKeys: Record<string, string> = {
  "/": "cockpit",
  "/clara": "clara",
  "/missions": "missions",
  "/conversations": "conversations",
  "/contacts": "contacts",
  "/telephonie": "telephonie",
  "/automatisations": "automatisations",
  "/documents": "documents",
  "/agenda": "agenda",
  "/journal": "memoire",
  "/brain": "memoire",
};

export default function Header() {
  const pathname = usePathname();
  const locale = useLocale() as Locale;

  const tn = useTranslations("navigation");
  const tc = useTranslations("common");
  const tclara = useTranslations("clara");

  const pageTitleKey = pageTitleKeys[pathname];
  const pageTitle = pageTitleKey
    ? tn(pageTitleKey)
    : pathname
        .split("/")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");

  return (
    <header className="flex h-[70px] flex-shrink-0 items-center border-b border-white/10 bg-[#08111F] px-8">
      {/* Page */}
      <div className="w-40 min-w-0 flex-shrink-0">
        <a
          href="/"
          className="block truncate text-lg font-semibold tracking-tight text-white transition-opacity hover:opacity-80"
        >
          {pageTitle}
        </a>
      </div>

      {/* Recherche */}
      <div className="mx-8 flex min-w-0 flex-1 justify-center">
        <div className="flex h-10 w-full max-w-2xl min-w-0 items-center rounded-2xl border border-white/5 bg-white/5 px-4 transition-colors duration-200 hover:bg-white/10">
          <Search
            size={18}
            className="shrink-0 text-slate-500"
          />

          <input
            type="text"
            placeholder={tc("search") + "..."}
            aria-label={tc("search")}
            className="ml-3 min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
          />

          <span className="hidden shrink-0 rounded-md border border-white/10 px-2 py-1 text-[11px] text-slate-500 sm:block">
            ⌘K
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex w-72 flex-shrink-0 items-center justify-end gap-4 xl:gap-6">
        <div className="hidden min-w-0 items-center gap-2 xl:flex">
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-400" />

          <span className="max-w-[190px] text-sm leading-5 text-slate-400">
            {tclara("status")}
          </span>
        </div>

        <LocaleSwitcher currentLocale={locale} />

        <button
          type="button"
          aria-label="Notifications"
          className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          <Bell size={19} />
        </button>

        <button
          type="button"
          aria-label="Profil"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-sm font-semibold text-white transition-transform duration-200 hover:scale-105"
        >
          G
        </button>
      </div>
    </header>
  );
}
