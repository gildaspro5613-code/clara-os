"use client";

import { Bell, LogIn, Search } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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
};

type AuthStatus = { authenticated: boolean };

export default function Header() {
  const pathname = usePathname();
  const locale = useLocale() as Locale;
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  const tn = useTranslations("navigation");
  const tc = useTranslations("common");
  const tclara = useTranslations("clara");

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session/status", { cache: "no-store", credentials: "same-origin" })
      .then((response) => response.ok ? response.json() as Promise<AuthStatus> : null)
      .then((status) => {
        if (active) setAuthenticated(status?.authenticated === true);
      })
      .catch(() => {
        if (active) setAuthenticated(false);
      });
    return () => { active = false; };
  }, []);

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

      <div className="mx-5 hidden min-w-0 flex-1 justify-center md:flex xl:mx-8">
        <div className="flex h-10 w-full max-w-2xl min-w-0 items-center rounded-2xl border border-white/5 bg-white/5 px-4 transition-colors duration-200 hover:bg-white/10">
          <Search size={18} className="shrink-0 text-slate-500" />
          <input type="text" placeholder={tc("search") + "..."} aria-label={tc("search")} className="ml-3 min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none" />
          <span className="hidden shrink-0 rounded-md border border-white/10 px-2 py-1 text-[11px] text-slate-500 sm:block">⌘K</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3 xl:w-80 xl:gap-4">
        <div className="hidden min-w-0 items-center gap-2 xl:flex">
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-400" />
          <span className="max-w-[150px] text-sm leading-5 text-slate-400">{tclara("status")}</span>
        </div>

        <LocaleSwitcher currentLocale={locale} />

        {authenticated === false && (
          <Link
            href="/api/auth/google/start"
            className="flex h-9 items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 text-xs font-medium text-cyan-100 transition hover:bg-cyan-400/20"
            title="Se connecter à Clara"
          >
            <LogIn size={15} />
            <span className="hidden sm:inline">Se connecter</span>
          </Link>
        )}

        <button type="button" aria-label={tc("notifications")} className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white">
          <Bell size={19} />
        </button>

        <div
          aria-label={authenticated ? "Session Clara authentifiée" : tc("profile")}
          title={authenticated ? "Session Clara authentifiée" : "Profil local — connexion Clara requise"}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${authenticated ? "bg-emerald-500" : "bg-cyan-500"}`}
        >
          G
        </div>
      </div>
    </header>
  );
}
