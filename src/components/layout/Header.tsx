"use client";

import { BookOpen, Search, UserRound } from "lucide-react";
import Link from "next/link";
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
  "/brain": "brain",
  "/connexions": "connexions",
};

export default function Header() {
  const ui = useTranslations("ui");

  const pathname = usePathname();
  const locale = useLocale() as Locale;

  const tn = useTranslations("navigation");
  const tc = useTranslations("common");


  const pageTitleKey = pageTitleKeys[pathname];
  const pageTitle = pageTitleKey
    ? tn(pageTitleKey)
    : pathname
        .split("/")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");

  return (
    <header className="flex h-[64px] flex-shrink-0 items-center border-b border-white/10 bg-[#08111F]/95 px-4 pl-16 backdrop-blur-xl sm:h-[70px] sm:px-6 sm:pl-20 lg:px-8">
      <div className="min-w-0 flex-1 sm:w-36 sm:flex-none xl:w-40">
        <Link href="/" className="block truncate text-lg font-semibold tracking-tight text-white transition-opacity hover:opacity-80">
          {pageTitle}
        </Link>
      </div>

      <a href="#main-workspace" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-[70] focus:rounded-xl focus:bg-slate-900 focus:p-3 focus:text-cyan-100">{ui("uiSkipContent")}</a>
      <div className="mx-5 hidden min-w-0 flex-1 justify-center md:flex xl:mx-8">
        <Link href="/documents#document-search" className="flex min-h-10 w-full max-w-2xl min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-400/30 hover:bg-white/10">
          <Search size={18} className="shrink-0 text-cyan-300" />
          <span>{ui("uiDocumentSearch")}</span>
        </Link>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3 xl:w-80 xl:gap-4">
        <div className="hidden min-w-0 items-center gap-2 xl:flex">
          <span className="h-2 w-2 shrink-0 rounded-full bg-cyan-400" />
          <span className="max-w-[150px] text-sm leading-5 text-slate-400">Mélodie Digital</span>
        </div>

        <LocaleSwitcher currentLocale={locale} />

        <Link href="/journal" title={ui("uiOpenJournal")} aria-label={ui("uiOpenJournal")} className="rounded-lg p-2 text-slate-300 transition hover:bg-white/5 hover:text-cyan-200">
          <BookOpen size={19} />
        </Link>

        <div
          aria-label={tc("profile")}
          title={ui("claraOSProfile")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-sm font-semibold text-white"
        >
          <UserRound size={19} aria-hidden="true" />
        </div>
      </div>
    </header>
  );
}
