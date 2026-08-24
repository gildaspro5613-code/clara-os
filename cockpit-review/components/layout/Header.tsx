"use client";

import { Bell, Search } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-white/10 bg-[#08111F]/95 px-8 backdrop-blur">

      {/* Page */}
      <div className="w-40 flex-shrink-0">
        <h2 className="text-lg font-semibold tracking-tight text-white">
          Cockpit
        </h2>
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

        <div className="hidden xl:flex items-center gap-2">

          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />

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