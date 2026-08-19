"use client";

import { Bell, Search } from "lucide-react";
import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/": "Cockpit",
  "/clara": "Clara",
  "/missions": "Missions",
  "/conversations": "Conversations",
  "/contacts": "Contacts",
  "/telephonie": "Téléphonie",
  "/automatisations": "Automatisations",
  "/documents": "Documents",
  "/agenda": "Agenda",
  "/journal": "Journal",
  "/brain": "Brain",
};

export default function Header() {
  const pathname = usePathname();

  const pageTitle =
    pageTitles[pathname] ??
    pathname
      .split("/")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

  return (
    <header className="flex h-[70px] flex-shrink-0 items-center border-b border-white/10 bg-[#08111F] px-8">
      {/* Page */}
      <div className="w-40 flex-shrink-0">
        <a
          href="/"
          className="text-lg font-semibold tracking-tight text-white transition-opacity hover:opacity-80"
        >
          {pageTitle}
        </a>
      </div>

      {/* Recherche */}
      <div className="mx-8 flex flex-1 justify-center">
        <div className="flex h-10 w-full max-w-2xl items-center rounded-2xl border border-white/5 bg-white/5 px-4 transition-colors duration-200 hover:bg-white/10">
          <Search
            size={18}
            className="text-slate-500"
          />

          <input
            type="text"
            placeholder="Rechercher..."
            className="ml-3 flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
          />

          <span className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-slate-500">
            ⌘K
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex w-72 items-center justify-end gap-6">
        <div className="hidden items-center gap-2 xl:flex">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

          <span className="text-sm text-slate-400">
            Clara prépare votre journée...
          </span>
        </div>

        <button className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white">
          <Bell size={19} />
        </button>

        <button className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500 text-sm font-semibold text-white transition-transform duration-200 hover:scale-105">
          G
        </button>
      </div>
    </header>
  );
}
