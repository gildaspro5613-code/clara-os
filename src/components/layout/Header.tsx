"use client";

import { ArrowLeft, BookOpen } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

import HeaderSearch from "./HeaderSearch";
import UserAccountMenu from "./UserAccountMenu";
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
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:w-auto xl:max-w-sm">
        {pathname !== "/" && (
          <Link
            href="/"
            aria-label={tn("cockpit")}
            title={tn("cockpit")}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.07] px-2.5 py-2 text-xs font-medium text-cyan-200 transition hover:border-cyan-400/40 hover:bg-cyan-400/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span className="hidden sm:inline">{tn("cockpit")}</span>
          </Link>
        )}
        <span className="block min-w-0 truncate text-base font-semibold tracking-tight text-white sm:text-lg">
          {pageTitle}
        </span>
      </div>

      <a href="#main-workspace" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-[70] focus:rounded-xl focus:bg-slate-900 focus:p-3 focus:text-cyan-100">{ui("uiSkipContent")}</a>
      <HeaderSearch />

      <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3 xl:w-80 xl:gap-4">
        <div className="hidden min-w-0 items-center gap-2 xl:flex">
          <span className="h-2 w-2 shrink-0 rounded-full bg-cyan-400" />
          <span className="max-w-[150px] text-sm leading-5 text-slate-400">Mélodie Digital</span>
        </div>

        <LocaleSwitcher currentLocale={locale} />

        <Link href="/journal" title={ui("uiOpenJournal")} aria-label={ui("uiOpenJournal")} className="rounded-lg p-2 text-slate-300 transition hover:bg-white/5 hover:text-cyan-200">
          <BookOpen size={19} />
        </Link>

        <UserAccountMenu />
      </div>
    </header>
  );
}
