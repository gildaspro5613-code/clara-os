"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  LayoutDashboard,
  Bot,
  ClipboardList,
  MessageCircle,
  Users,
  Phone,
  Workflow,
  FileText,
  CalendarDays,
  Brain,
  BookOpen,
  Menu,
  X,
} from "lucide-react";

const sections = [
  {
    label: "operate",
    items: [
      { key: "cockpit", href: "/", icon: LayoutDashboard },
      { key: "missions", href: "/missions", icon: ClipboardList },
      { key: "conversations", href: "/conversations", icon: MessageCircle },
      { key: "contacts", href: "/contacts", icon: Users },
    ],
  },
  {
    label: "connect",
    items: [
      { key: "telephonie", href: "/telephonie", icon: Phone },
      { key: "automatisations", href: "/automatisations", icon: Workflow },
      { key: "agenda", href: "/agenda", icon: CalendarDays },
    ],
  },
  {
    label: "know",
    items: [
      { key: "documents", href: "/documents", icon: FileText },
      { key: "memoire", href: "/journal", icon: BookOpen },
      { key: "brain", href: "/brain", icon: Brain },
    ],
  },
  {
    label: "claraSection",
    items: [
      { key: "clara", href: "/clara", icon: Bot },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const t = useTranslations("navigation");
  const tCommon = useTranslations("common");
  const tc = useTranslations("clara");

  return (
    <>
      <button
        type="button"
        aria-label={open ? tCommon("closeMenu") : tCommon("openMenu")}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="fixed left-3 top-3 z-[60] flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#0b1524] text-slate-300 shadow-lg transition hover:border-cyan-400/30 hover:text-cyan-300 sm:left-5 sm:top-[15px] lg:hidden"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <button
          type="button"
          aria-label={tCommon("closeMenu")}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[min(17rem,calc(100vw-2.5rem))] flex-col border-r border-white/10 bg-[#060b13]/98 shadow-2xl transition-transform duration-300 lg:w-64 lg:translate-x-0 lg:shadow-none xl:w-72 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      {/* Logo */}
      <div className="border-b border-white/10 px-6 py-4 sm:py-5">
        <div className="flex justify-center">
          <div className="flex flex-col items-center">
            <img
              src="/brand/clara-os-symbol.svg"
              alt=""
              aria-hidden="true"
              className="h-14 w-14 object-contain xl:h-16 xl:w-16"
            />

            <h1 className="mt-2 text-lg font-semibold tracking-[0.1em] text-white">
              CLARA OS
            </h1>
          </div>
        </div>

      </div>

      {/* Navigation */}
      <nav className="clara-sidebar-scroll flex-1 overflow-y-auto px-3 py-4 xl:px-4">
        <div className="space-y-4 xl:space-y-5">
          {sections.map((section) => (
            <div key={section.label}>
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                {t(`sections.${section.label}`)}
              </p>

              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                        onClick={() => setOpen(false)}
                      className={`
                        group
                        relative
                        flex
                        items-center
                        gap-3
                        rounded-xl border border-transparent
                        px-3
                        py-2.5
                        transition-all
                        duration-200
                        ${
                          active
                            ? "border-cyan-400/15 bg-cyan-400/[0.08] text-white shadow-[inset_0_0_20px_rgba(34,211,238,0.03)]"
                            : "text-slate-400 hover:border-white/[0.06] hover:bg-white/[0.04] hover:text-slate-100"
                        }
                      `}
                    >
                      {active && (
                        <span className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-cyan-400" />
                      )}

                      <Icon className={active ? "text-cyan-300" : "text-slate-500 transition-colors group-hover:text-slate-300"} size={18} strokeWidth={1.8} />

                      <span className="text-[14px] font-medium">
                        {t(item.key)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 px-5 py-4">
        <div className="mb-4 flex items-center gap-2">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-500" />

          <span className="text-sm text-slate-300">
            {tc("ready")}
          </span>
        </div>

        <div className="text-xs leading-5 text-slate-500">
          <p className="font-medium text-slate-400">
            Melodie Digital
          </p>

          <p>{tCommon("version", {version: "0.2"})}</p>
        </div>
      </div>
      </aside>
    </>
  );
}
